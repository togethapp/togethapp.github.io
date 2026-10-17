/**
 * Together a déménagé (see ../404.html). This takes the place of the old
 * service worker of the old address, which a phone asks for each time the
 * app comes back to the front: it lets go of the pages it held, so that they
 * ask the network again and find the page that sends them to the new
 * address, empties the old address's caches — nothing will read them again —
 * and leaves.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('marque-points-')).map((name) => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    await Promise.all(pages.map((page) => page.navigate(page.url).catch(() => null)));
  })());
});
