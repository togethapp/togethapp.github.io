/**
 * The cache that lets the app open at once, with or without a network.
 *
 * Everything the app is made of is fetched when this worker is installed and
 * kept in a cache named after the build. Afterwards the app opens from that
 * cache straight away — no round trip to ask whether something changed, which
 * on a slow network was most of the wait — while anything it talks to (the
 * shared database) still goes to the network.
 *
 * An update is never missed for that: every change to the app changes this
 * file (tools/bundle.js stamps BUILD from the sources), the app asks for this
 * file each time it comes back to the front (`updateViaCache: 'none'`), and a
 * new worker fetches the new files — past the browser's own copies — into a
 * cache of its own, takes over at once, deletes the old cache, and the app
 * reloads itself once. A cache holds one build only, never a mix of two.
 * Bump VERSION when something worth announcing changes — tools/bundle.js
 * checks that it matches the version the page shows.
 */

const VERSION = 'v17';
/** Written by tools/bundle.js from the sources: it moves whenever they do. */
const BUILD = '94d45592';
const CACHE = `marque-points-${VERSION}-${BUILD}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // The app as tools/bundle.js builds it: the modules of src/ are all in
  // dist/app.js. Both languages and the parts fetched later are kept too, so
  // that choosing English or opening a game works without a network.
  './dist/app.js',
  './dist/lang-fr.js',
  './dist/lang-en.js',
  './dist/holo.js',
  './dist/arcade.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // One missing file must not sink the whole install, so each is added on
      // its own and a failure is survivable. `reload`: from the site, never the
      // browser's own copy — GitHub Pages lets one be held for ten minutes,
      // and an old file kept under the new build would stay until the next.
      .then((cache) => Promise.all(SHELL.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only ever serve this app's own files from the cache: the shared database
  // and anything else must keep talking to the network.
  if (url.origin !== self.location.origin) return;

  // Opening the app: its page from the cache, whatever comes after the
  // address (?…, #…). Other pages of the site (the old links' relays) go to
  // the network, as before.
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  const isApp = request.mode === 'navigate' && (path === '' || path === 'index.html');

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(isApp ? './index.html' : request, { ignoreSearch: isApp }).then((kept) => {
        if (kept) return kept;
        // Not kept (yet): the network, remembered for next time; and with no
        // network, the app's page rather than the browser's error.
        return fetch(new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' }))
          .then((response) => {
            if (response && response.ok && !isApp) cache.put(request, response.clone()).catch(() => {});
            return response;
          })
          .catch(() => cache.match('./index.html').then((page) => page || Response.error()));
      }),
    ),
  );
});

// A notification from the notifier (supabase/functions/notifier): shown at
// once — a push the user does not see is one the phone stops delivering.
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = {};
  }
  event.waitUntil(
    self.registration.showNotification(message.title || 'Together', {
      body: message.body || '',
      tag: message.tag || undefined,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: { url: message.url || './' },
    }),
  );
});

// Tapped: the app's page for it, in the window already open if there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (open) {
        return open.focus().then((client) => (client || open).navigate(url)).catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
