/* The Switzerland page once had an Offline feature with this service worker (removed 2026-11-28). This version only
   cleans up in browsers that still have it: it deletes the saved maps and removes itself. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.indexOf('ch-area-') === 0 || k === 'ch-shell-v1').map((k) => caches.delete(k)));
    await self.registration.unregister();
})()));
