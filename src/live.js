/**
 * Hearing changes as they happen, instead of asking every few seconds.
 *
 * The database announces each write on Supabase Realtime: « something changed »
 * on the channel of the document, and on the secret channel of its group. The
 * announcement carries nothing — no id, no content — so hearing it gives away
 * nothing either: the app then asks the database the usual way, with its key,
 * and a key that was cut off gets nothing more than before.
 *
 * This is a small client of the Phoenix protocol Realtime speaks (JSON, version
 * 1.0.0), with no library. Nothing here is needed for the app to work: when the
 * socket is closed, refused or silent, `covers` says no and the app goes on
 * asking every few seconds, as it always did.
 */

/** Realtime closes a socket that has said nothing for a minute. */
const HEARTBEAT_EVERY = 25000;
/**
 * A socket the server has not answered for this long is taken for dead. A
 * phone waking up can hold one that still says « open »: trusting it would
 * make the app wait for announcements that never come.
 */
const SILENT_AFTER = 60000;
/** A channel refused or closed by the server is asked again after this. */
const REJOIN_AFTER = 30000;
/** Waits before trying again, longer each time, up to a minute. */
const RETRY_AFTER = [1000, 2000, 5000, 10000, 30000, 60000];

/** The socket's address, from the REST address the app already has. */
export function liveUrl(config) {
  if (!config || !config.url || !config.key) return '';
  const origin = String(config.url).replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(origin)) return '';
  return `${origin.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(config.key)}&vsn=1.0.0`;
}

/** The channel of one document, as the database names it. */
export function docTopic(id) {
  return `doc-${id}`;
}

/** The channel of a group: its secret name, handed over only with a key. */
export function groupTopic(channel) {
  return `group-${channel}`;
}

/** The message that joins a public channel, broadcast only. */
export function joinMessage(topic, ref, key) {
  return {
    topic: `realtime:${topic}`,
    event: 'phx_join',
    payload: {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: '', enabled: false },
        postgres_changes: [],
        private: false,
      },
      access_token: key,
    },
    ref,
    join_ref: ref,
  };
}

/**
 * What a message from the socket means for us: a channel joined or refused,
 * a change announced, or nothing.
 */
export function readMessage(raw) {
  let message = null;
  try {
    message = typeof raw === 'string' ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  if (!message || typeof message.topic !== 'string' || !message.topic.startsWith('realtime:')) return null;
  const topic = message.topic.slice('realtime:'.length);
  if (message.event === 'phx_reply') {
    const ok = message.payload?.status === 'ok';
    return { kind: ok ? 'joined' : 'refused', topic, ref: message.ref ?? null };
  }
  if (message.event === 'phx_error' || message.event === 'phx_close') return { kind: 'refused', topic, ref: null };
  if (message.event === 'broadcast') return { kind: 'changed', topic };
  return null;
}

/**
 * The client. `onChange(topic)` is called for each announcement heard, on a
 * channel asked for with `watch`. `WebSocketImpl` and the timers are there for
 * the tests.
 */
export function createLive({
  url, key, onChange, WebSocketImpl = globalThis.WebSocket,
  setTimer = setTimeout, clearTimer = clearTimeout, every = setInterval, stopEvery = clearInterval,
  now = () => Date.now(),
}) {
  if (!url || typeof WebSocketImpl !== 'function') return null;

  let socket = null;
  let open = false;
  let heartbeat = null;
  let retry = null;
  let failures = 0;
  let counter = 0;
  let wanted = new Set();
  /** topic -> { ref, joined, refusedAt } for the channels asked on this socket. */
  let channels = new Map();
  /** When the server last said anything at all — a reply to the heartbeat counts. */
  let lastHeard = 0;
  /** Channels joined at least once, on this socket or an earlier one. */
  const heardBefore = new Set();
  /** topic -> when the app last asked the database itself, while covered. */
  const asked = new Map();

  const send = (message) => {
    if (!open) return;
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // A socket closing under our feet: the close handler takes it from here.
    }
  };
  const nextRef = () => String(++counter);

  const join = (topic) => {
    const ref = nextRef();
    channels.set(topic, { ref, joined: false, refusedAt: null });
    send(joinMessage(topic, ref, key));
  };
  const silent = () => now() - lastHeard >= SILENT_AFTER;
  /** Close a socket taken for dead, and schedule the next one (its own close handler no longer will). */
  const abandon = () => {
    const dead = socket;
    socket = null;
    drop();
    try {
      dead?.close();
    } catch {
      // Already gone.
    }
    schedule();
  };
  /** Every heartbeat: give up on a silent socket, ask again for refused channels. */
  const tick = () => {
    if (silent()) {
      abandon();
      return;
    }
    send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: nextRef() });
    for (const [topic, channel] of channels) {
      if (!channel.joined && channel.refusedAt !== null && now() - channel.refusedAt >= REJOIN_AFTER && wanted.has(topic)) join(topic);
    }
  };
  const leave = (topic) => {
    const channel = channels.get(topic);
    channels.delete(topic);
    if (channel) send({ topic: `realtime:${topic}`, event: 'phx_leave', payload: {}, ref: nextRef(), join_ref: channel.ref });
  };

  const drop = () => {
    open = false;
    channels = new Map();
    if (heartbeat) stopEvery(heartbeat);
    heartbeat = null;
  };

  const schedule = () => {
    if (retry || !wanted.size) return;
    const wait = RETRY_AFTER[Math.min(failures, RETRY_AFTER.length - 1)];
    failures += 1;
    retry = setTimer(() => {
      retry = null;
      connect();
    }, wait);
  };

  function connect() {
    if (socket || !wanted.size) return;
    let created = null;
    try {
      created = new WebSocketImpl(url);
    } catch {
      schedule();
      return;
    }
    socket = created;
    created.onopen = () => {
      if (socket !== created) return;
      open = true;
      failures = 0;
      lastHeard = now();
      for (const topic of wanted) join(topic);
      heartbeat = every(tick, HEARTBEAT_EVERY);
    };
    created.onmessage = (event) => {
      if (socket !== created) return;
      lastHeard = now();
      const heard = readMessage(event?.data);
      if (!heard) return;
      const channel = channels.get(heard.topic);
      if (!channel) return;
      if (heard.kind === 'joined' && heard.ref === channel.ref) {
        channel.joined = true;
        // Joined again after the socket dropped: what was said meanwhile was
        // not heard, so it counts as one announcement.
        if (heardBefore.has(heard.topic)) onChange(heard.topic);
        heardBefore.add(heard.topic);
      }
      else if (heard.kind === 'refused') {
        channel.joined = false;
        channel.refusedAt = now();
      }
      else if (heard.kind === 'changed' && channel.joined) onChange(heard.topic);
    };
    created.onclose = () => {
      if (socket !== created) return;
      socket = null;
      drop();
      schedule();
    };
    created.onerror = () => {
      // The close event follows; nothing to do twice.
    };
  }

  return {
    /** Listen to exactly these channels from now on. */
    watch(topics) {
      const next = new Set(topics.filter(Boolean));
      for (const topic of [...channels.keys()]) if (!next.has(topic)) leave(topic);
      if (open) for (const topic of next) if (!channels.has(topic)) join(topic);
      wanted = next;
      if (!wanted.size) {
        this.stop();
        return;
      }
      connect();
    },

    /** Whether an announcement on this channel would be heard right now. */
    covers(topic) {
      return open && !silent() && Boolean(channels.get(topic)?.joined);
    },

    /**
     * Whether the app may skip asking the database itself this time. While a
     * channel is heard, asking once a minute is enough — in case an
     * announcement was lost; otherwise, the app asks as it always did.
     */
    quiet(topic, every_ = 60000) {
      if (!this.covers(topic)) return false;
      const last = asked.get(topic);
      if (last !== undefined && now() - last < every_) return true;
      asked.set(topic, now());
      return false;
    },

    /**
     * Back in front: a socket the phone closed meanwhile is opened again now,
     * and one that kept quiet while the phone slept is not trusted any more.
     */
    wake() {
      if (open && now() - lastHeard >= HEARTBEAT_EVERY + 10000) abandon();
      if (retry) {
        clearTimer(retry);
        retry = null;
      }
      failures = 0;
      connect();
    },

    stop() {
      wanted = new Set();
      if (retry) clearTimer(retry);
      retry = null;
      const closing = socket;
      socket = null;
      drop();
      try {
        closing?.close();
      } catch {
        // Already closed.
      }
    },
  };
}
