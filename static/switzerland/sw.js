/* The Switzerland page's offline helper (a service worker for /switzerland/ only). It is installed only when a
   visitor saves an area for offline use (assets/js/switzerland/65-offline.js), and it does three things:
   - the page and this site's files: from the network, and a copy is kept, so the page opens without signal;
   - the lettering's fonts (vectortiles.geo.admin.ch/fonts): from the copy when there is one, else fetched and kept;
   - swisstopo's map tiles and terrain (wmts.geo.admin.ch, 3d.geo.admin.ch): from a saved area when the tile is in
     one, else from the network as usual. Tiles are stored only by "Save this area", never on the way.
   Nothing else is touched (search, profiles, weather and the other services go to the network as before). */
const SHELL = 'ch-shell-v1';
const TILE_HOSTS = ['wmts.geo.admin.ch', '3d.geo.admin.ch'];
const FONT_PREFIX = 'https://vectortiles.geo.admin.ch/fonts/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function withTimeout(p, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        p.then((v) => { clearTimeout(t); resolve(v); }, (err) => { clearTimeout(t); reject(err); });
    });
}

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch (err) { return; }

    if (url.origin === self.location.origin) {
        // this site: the network first (a slow network gives way to the copy after 6 seconds), the copy if offline
        e.respondWith((async () => {
            const cache = await caches.open(SHELL);
            try {
                const res = await withTimeout(fetch(req), 6000);
                if (res.ok && res.type === 'basic') cache.put(req, res.clone());
                return res;
            } catch (err) {
                const hit = (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) ||
                            (req.mode === 'navigate' ? await cache.match(self.registration.scope) : undefined);
                if (hit) return hit;
                throw err;
            }
        })());
        return;
    }
    if (req.url.indexOf(FONT_PREFIX) === 0) {
        e.respondWith((async () => {
            const cache = await caches.open(SHELL);
            const hit = await cache.match(req.url);
            if (hit) return hit;
            const res = await fetch(req);
            if (res.ok) cache.put(req.url, res.clone());
            return res;
        })());
        return;
    }
    if (TILE_HOSTS.indexOf(url.hostname) >= 0) {
        e.respondWith((async () => {
            // the saved areas (caches named ch-area-…); a tile is looked up by its address alone
            const names = (await caches.keys()).filter((n) => n.indexOf('ch-area-') === 0);
            for (const n of names) {
                const hit = await (await caches.open(n)).match(req.url, { ignoreVary: true });
                if (hit) return hit;
            }
            return fetch(req);
        })());
    }
});
