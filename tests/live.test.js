import test from 'node:test';
import assert from 'node:assert/strict';

import { createLive, docTopic, groupTopic, joinMessage, liveUrl, readMessage } from '../src/live.js';

/** A socket that records what it is sent, and lets the test speak for the server. */
function fakeSockets() {
  const made = [];
  class FakeSocket {
    constructor(url) {
      this.url = url;
      this.sent = [];
      this.closed = false;
      made.push(this);
    }
    send(text) {
      this.sent.push(JSON.parse(text));
    }
    close() {
      this.closed = true;
    }
    // The server's side.
    accept() {
      this.onopen?.();
    }
    say(message) {
      this.onmessage?.({ data: JSON.stringify(message) });
    }
    drop() {
      this.onclose?.();
    }
    joins() {
      return this.sent.filter((message) => message.event === 'phx_join');
    }
    replyToJoins() {
      for (const join of this.joins()) {
        this.say({ topic: join.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: join.ref });
      }
    }
  }
  return { FakeSocket, made };
}

/** Timers the test runs by hand. */
function fakeTimers() {
  const timers = [];
  return {
    timers,
    setTimer: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimer: (id) => {
      if (timers[id - 1]) timers[id - 1].fn = null;
    },
    ticks: [],
    every(fn) {
      this.ticks.push(fn);
      return this.ticks.length;
    },
    stopEvery(id) {
      this.ticks[id - 1] = null;
    },
    /** The heartbeat, run by hand. */
    beat() {
      for (const fn of this.ticks) fn?.();
    },
    fire() {
      const pending = timers.splice(0);
      for (const timer of pending) timer.fn?.();
    },
  };
}

function setUp({ now = () => 0 } = {}) {
  const { FakeSocket, made } = fakeSockets();
  const clock = fakeTimers();
  const heard = [];
  const live = createLive({
    url: 'wss://example.supabase.co/realtime/v1/websocket?apikey=k&vsn=1.0.0',
    key: 'k',
    onChange: (topic) => heard.push(topic),
    WebSocketImpl: FakeSocket,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    every: (fn) => clock.every(fn),
    stopEvery: (id) => clock.stopEvery(id),
    now,
  });
  return { live, made, heard, clock };
}

test('the socket address comes from the REST address, either spelling', () => {
  assert.equal(
    liveUrl({ url: 'https://abc.supabase.co/rest/v1/', key: 'a b' }),
    'wss://abc.supabase.co/realtime/v1/websocket?apikey=a%20b&vsn=1.0.0',
  );
  assert.equal(liveUrl({ url: 'https://abc.supabase.co/', key: 'k' }), 'wss://abc.supabase.co/realtime/v1/websocket?apikey=k&vsn=1.0.0');
  assert.equal(liveUrl({ url: 'http://localhost:8123/rest/v1/', key: 'k' }), 'ws://localhost:8123/realtime/v1/websocket?apikey=k&vsn=1.0.0');
  assert.equal(liveUrl(null), '');
  assert.equal(liveUrl({ url: 'nonsense', key: 'k' }), '');
});

test('channel names match the database', () => {
  assert.equal(docTopic('abc'), 'doc-abc');
  assert.equal(groupTopic('0f3a'), 'group-0f3a');
});

test('a join asks for a public channel, broadcast only', () => {
  const message = joinMessage('doc-x', '3', 'k');
  assert.equal(message.topic, 'realtime:doc-x');
  assert.equal(message.event, 'phx_join');
  assert.equal(message.payload.config.private, false);
  assert.deepEqual(message.payload.config.postgres_changes, []);
  assert.equal(message.ref, '3');
  assert.equal(message.join_ref, '3');
});

test('messages are read for what they mean, and nonsense is ignored', () => {
  assert.deepEqual(readMessage(JSON.stringify({ topic: 'realtime:doc-x', event: 'phx_reply', payload: { status: 'ok' }, ref: '1' })),
    { kind: 'joined', topic: 'doc-x', ref: '1' });
  assert.equal(readMessage(JSON.stringify({ topic: 'realtime:doc-x', event: 'phx_reply', payload: { status: 'error' }, ref: '1' })).kind, 'refused');
  assert.deepEqual(readMessage(JSON.stringify({ topic: 'realtime:doc-x', event: 'broadcast', payload: { event: 'changed', payload: {} } })),
    { kind: 'changed', topic: 'doc-x' });
  assert.equal(readMessage(JSON.stringify({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok' } })), null);
  assert.equal(readMessage('{not json'), null);
  assert.equal(readMessage(null), null);
});

test('without a socket to open, there is no client and the app keeps asking', () => {
  assert.equal(createLive({ url: '', key: 'k', onChange() {}, WebSocketImpl: class {} }), null);
  assert.equal(createLive({ url: 'wss://x', key: 'k', onChange() {}, WebSocketImpl: null }), null);
});

test('nothing is opened while nothing is wanted', () => {
  const { live, made } = setUp();
  live.watch([]);
  assert.equal(made.length, 0);
});

test('channels are joined once the socket opens, and heard once joined', () => {
  const { live, made, heard } = setUp();
  live.watch(['doc-a', 'group-g']);
  assert.equal(made.length, 1);
  const socket = made[0];
  assert.equal(live.covers('doc-a'), false, 'not before the socket opens');
  socket.accept();
  assert.deepEqual(socket.joins().map((join) => join.topic).sort(), ['realtime:doc-a', 'realtime:group-g']);
  // An announcement before the join is acknowledged is not trusted to arrive.
  socket.say({ topic: 'realtime:doc-a', event: 'broadcast', payload: {} });
  assert.deepEqual(heard, []);
  socket.replyToJoins();
  assert.equal(live.covers('doc-a'), true);
  socket.say({ topic: 'realtime:doc-a', event: 'broadcast', payload: { event: 'changed', payload: {} } });
  socket.say({ topic: 'realtime:doc-other', event: 'broadcast', payload: {} });
  assert.deepEqual(heard, ['doc-a'], 'only what was asked for');
});

test('watching another set leaves what is no longer wanted and joins the rest', () => {
  const { live, made } = setUp();
  live.watch(['doc-a', 'group-g']);
  const socket = made[0];
  socket.accept();
  socket.replyToJoins();
  live.watch(['group-g', 'doc-b']);
  assert.ok(socket.sent.some((message) => message.event === 'phx_leave' && message.topic === 'realtime:doc-a'));
  assert.ok(socket.joins().some((join) => join.topic === 'realtime:doc-b'));
  assert.equal(live.covers('doc-a'), false);
  assert.equal(live.covers('group-g'), true);
  assert.equal(made.length, 1, 'the same socket');
});

test('a refused channel is not covered, so the app keeps asking for it', () => {
  const { live, made } = setUp();
  live.watch(['doc-a']);
  made[0].accept();
  const join = made[0].joins()[0];
  made[0].say({ topic: join.topic, event: 'phx_reply', payload: { status: 'error', response: { reason: 'private only' } }, ref: join.ref });
  assert.equal(live.covers('doc-a'), false);
  assert.equal(live.quiet('doc-a'), false);
});

test('a dropped socket comes back after a wait, and counts as one announcement', () => {
  const { live, made, heard, clock } = setUp();
  live.watch(['group-g']);
  made[0].accept();
  made[0].replyToJoins();
  assert.deepEqual(heard, [], 'the first join is no news');
  made[0].drop();
  assert.equal(live.covers('group-g'), false);
  assert.equal(clock.timers.length, 1);
  assert.equal(clock.timers[0].ms, 1000);
  clock.fire();
  assert.equal(made.length, 2);
  made[1].accept();
  made[1].replyToJoins();
  assert.deepEqual(heard, ['group-g'], 'what was said while away is fetched');
});

test('waits grow, and coming back to the front tries at once', () => {
  const { live, made, clock } = setUp();
  live.watch(['doc-a']);
  made[0].drop();
  clock.fire();
  made[1].drop();
  assert.equal(clock.timers.at(-1).ms, 2000);
  live.wake();
  assert.equal(made.length, 3, 'opened again without waiting');
});

test('while heard, the app asks the database itself only once a minute', () => {
  let time = 0;
  const { live, made } = setUp({ now: () => time });
  live.watch(['doc-a']);
  assert.equal(live.quiet('doc-a'), false, 'not heard yet: ask');
  made[0].accept();
  made[0].replyToJoins();
  assert.equal(live.quiet('doc-a'), false, 'the first time once heard still asks');
  // The server answers every heartbeat: the socket is alive throughout.
  const alive = () => made[0].say({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok' }, ref: 'h' });
  time = 5000;
  alive();
  assert.equal(live.quiet('doc-a'), true);
  time = 59000;
  alive();
  assert.equal(live.quiet('doc-a'), true);
  time = 61000;
  alive();
  assert.equal(live.quiet('doc-a'), false, 'a minute on: ask, in case something was lost');
  time = 62000;
  alive();
  assert.equal(live.quiet('doc-a'), true);
});

test('stopping closes the socket and covers nothing', () => {
  const { live, made } = setUp();
  live.watch(['doc-a']);
  made[0].accept();
  made[0].replyToJoins();
  live.stop();
  assert.equal(made[0].closed, true);
  assert.equal(live.covers('doc-a'), false);
});

test('a socket the server stopped answering is not trusted, and is replaced', () => {
  let time = 0;
  const { live, made, clock } = setUp({ now: () => time });
  live.watch(['doc-a']);
  made[0].accept();
  made[0].replyToJoins();
  assert.equal(live.covers('doc-a'), true);
  // The phone slept: nothing came for a minute, yet the socket still says open.
  time = 61000;
  assert.equal(live.covers('doc-a'), false, 'so the app goes back to asking');
  clock.beat();
  assert.equal(made[0].closed, true, 'the heartbeat gives it up');
  clock.fire();
  assert.equal(made.length, 2, 'and opens another');
});

test('coming back to the front replaces a socket that kept quiet at once', () => {
  let time = 0;
  const { live, made } = setUp({ now: () => time });
  live.watch(['group-g']);
  made[0].accept();
  made[0].replyToJoins();
  time = 40000;
  live.wake();
  assert.equal(made[0].closed, true);
  assert.equal(made.length, 2, 'without waiting for the next heartbeat');
});

test('a channel the server refused is asked again a little later', () => {
  let time = 0;
  const { live, made, clock } = setUp({ now: () => time });
  live.watch(['doc-a']);
  made[0].accept();
  made[0].say({ topic: 'realtime:doc-a', event: 'phx_error', payload: {} });
  assert.equal(live.covers('doc-a'), false);
  const joins = () => made[0].joins().filter((join) => join.topic === 'realtime:doc-a').length;
  time = 10000;
  made[0].say({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok' }, ref: 'h' });
  clock.beat();
  assert.equal(joins(), 1, 'not at once');
  time = 31000;
  made[0].say({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok' }, ref: 'h' });
  clock.beat();
  assert.equal(joins(), 2, 'but after a while');
  made[0].replyToJoins();
  assert.equal(live.covers('doc-a'), true);
});
