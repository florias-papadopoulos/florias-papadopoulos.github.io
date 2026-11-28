/* Part 65: offline. "Save this area" keeps what the map shows now on this device, for hikes without signal: for 2D the
   national map and the hiking trails, for 3D the aerial photo and the terrain, from the zoom of the view down to
   about 2.5 m a pixel, and a wider ring around it at lower detail (the horizon of 3D, zooming out). The tiles go into
   the browser's Cache Storage, one cache per area (ch-area-<time>); the service worker static/switzerland/sw.js,
   installed with the first saved area, serves them and keeps a copy of the page itself. Nothing is stored before the
   button is pressed. */
const OFF_LIMIT = 6000;   // tiles in one area, about 150 MB at most
const OFF_KB = { map: 30, trails: 4, aerial: 50, terrain: 20 };
const OFF_LAYER_JSON = 'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/layer.json';
const OFF_META = 'offline-area.json';   // a small entry in each area's cache with its name, bounds and date
const offOK = 'serviceWorker' in navigator && 'caches' in window && window.isSecureContext;
let offJob = null;

function mercY(lat) { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2; }
function latOfY(y) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI; }
/* the view as seen from straight above (a tilted view's bounds would reach the horizon) */
function offArea(scale) {
    const c = mapA.getCenter(), z = mapA.getZoom(), cv = mapA.getCanvas();
    const world = 512 * 2 ** z, w = cv.clientWidth * scale / 2 / world, h = cv.clientHeight * scale / 2 / world;
    const x = (c.lng + 180) / 360, y = mercY(c.lat);
    return [clamp((x - w) * 360 - 180, AREA[0], AREA[2]), clamp(latOfY(y + h), AREA[1], AREA[3]),
            clamp((x + w) * 360 - 180, AREA[0], AREA[2]), clamp(latOfY(y - h), AREA[1], AREA[3])];
}
function xyz(b, z) {
    const n = 2 ** z, out = [];
    const x0 = Math.floor((b[0] + 180) / 360 * n), x1 = Math.floor((b[2] + 180) / 360 * n);
    const y0 = Math.floor(mercY(b[3]) * n), y1 = Math.floor(mercY(b[1]) * n);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([z, x, y]);
    return out;
}
/* swisstopo's terrain tiles: geographic grid, two tiles wide at zoom 0, y counted from the south */
function qm(b, z) {
    const out = [], nx = 2 * 2 ** z, ny = 2 ** z;
    const x0 = Math.floor((b[0] + 180) / 360 * nx), x1 = Math.floor((b[2] + 180) / 360 * nx);
    const y0 = Math.floor((b[1] + 90) / 180 * ny), y1 = Math.floor((b[3] + 90) / 180 * ny);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([z, x, y]);
    return out;
}
/* the plan: which tiles, for the chosen kinds; the finest zoom comes down until the area fits the limit */
function offPlan(want) {
    const area = offArea(1), ring = offArea(3), z0 = Math.max(8, Math.floor(mapA.getZoom()) + 1);
    const wmts = (layer, ext, z) => WMTS + layer + '/default/current/3857/' + z.join('/') + '.' + ext;
    let top = 16, plan;
    for (; top >= z0; top--) {
        plan = { tiles: [], kb: 0, top, area };
        const add = (kind, urls) => { plan.tiles.push(...urls); plan.kb += urls.length * OFF_KB[kind]; };
        for (let z = 8; z <= top; z++) {
            const b = z < z0 ? ring : area;
            const t = xyz(b, z);
            if (want.map) add('map', t.map((k) => wmts(BASES.map.layer, 'jpeg', k)));
            if (want.map && z >= 11) add('trails', t.map((k) => wmts(RASTERS.trails, 'png', k)));
            if (want.aerial) add('aerial', t.map((k) => wmts(BASES.aerial.layer, 'jpeg', k)));
        }
        if (want.aerial) for (let z = 6; z <= 12; z++) add('terrain', qm(z < 10 ? ring : area, z).map((k) => 'qm:' + k.join('/')));
        if (plan.tiles.length <= OFF_LIMIT) break;
    }
    return plan;
}
function offEstimate() {
    const want = { map: $('ch-off-2d').checked, aerial: $('ch-off-3d').checked };
    const est = $('ch-off-est'), save = $('ch-off-save');
    if (!want.map && !want.aerial) { est.textContent = 'Tick at least one of the two.'; save.disabled = true; return; }
    const p = offPlan(want);
    save.disabled = !!offJob || p.tiles.length > OFF_LIMIT;
    if (p.tiles.length > OFF_LIMIT) { est.textContent = 'This view is too large to save. Zoom in a little.'; return; }
    const m = (s) => (Math.round(s / 1024) || '<1') + ' MB';
    est.textContent = 'About ' + fmt(p.tiles.length) + ' tiles, about ' + m(p.kb) + '.' +
        (p.top < 16 ? ' Detail down to ' + (p.top >= 15 ? 'about 5' : p.top >= 14 ? 'about 10' : 'about 20') + ' m a pixel; zoom in for more.' : '');
}

/* the page itself and this site's files it uses, so it opens offline */
async function offShell() {
    const cache = await caches.open('ch-shell-v1');
    const here = location.origin + location.pathname;
    const urls = new Set([here]);
    performance.getEntriesByType('resource').forEach((r) => {
        if (r.name.indexOf(location.origin + '/') === 0 || r.name.indexOf('https://vectortiles.geo.admin.ch/fonts/') === 0) urls.add(r.name.split('#')[0]);
    });
    const eng = new URL(app.dataset.maplibre, location.href).href;
    ['maplibre-gl.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css'].forEach((f) => urls.add(eng + f));
    ['terrainWorker', 'decoder', 'peaks', 'towns', 'cantons', 'border'].forEach((k) => app.dataset[k] && urls.add(new URL(app.dataset[k], location.href).href));
    await Promise.all([...urls].map((u) => fetch(u, { credentials: 'omit' }).then((r) => r.ok && cache.put(u, r)).catch(() => {})));
}

async function offSave() {
    if (offJob || !offOK) return;
    const want = { map: $('ch-off-2d').checked, aerial: $('ch-off-3d').checked };
    const plan = offPlan(want);
    if (plan.tiles.length > OFF_LIMIT || !plan.tiles.length) return;
    const job = offJob = { stop: false };
    const prog = $('ch-off-prog'), est = $('ch-off-est');
    $('ch-off-save').disabled = true; $('ch-off-stop').hidden = false; prog.hidden = false; prog.value = 0;
    est.textContent = 'Getting ready…';
    const name = 'ch-area-' + Date.now();
    try {
        await navigator.serviceWorker.register(app.dataset.sw, { scope: app.dataset.swScope });
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        await offShell();
        const cache = await caches.open(name);
        let urls = plan.tiles;
        if (want.aerial) {
            // the terrain's addresses come from its description file, which is kept as well
            const res = await fetch(OFF_LAYER_JSON, { credentials: 'omit', referrerPolicy: 'no-referrer' });
            const layer = await res.clone().json();
            await cache.put(OFF_LAYER_JSON, res);
            const tmpl = OFF_LAYER_JSON.replace(/[^/]*$/, '') + String(layer.tiles[0]).replace(/^\.?\//, '');
            urls = urls.map((u) => {
                if (u.indexOf('qm:') !== 0) return u;
                const [z, x, y] = u.slice(3).split('/');
                return tmpl.replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{version}', String(layer.version || '1.0.0'));
            });
        }
        let done = 0, failed = 0, i = 0, bytes = 0;
        const worker = async () => {
            while (!job.stop && i < urls.length) {
                const u = urls[i++];
                for (let tries = 0; tries < 2; tries++) {
                    try {
                        const r = await fetch(u, { credentials: 'omit', referrerPolicy: 'no-referrer' });
                        // a terrain tile the service does not have (403) is simply not there
                        if (r.status === 403 || r.status === 404) break;
                        if (!r.ok) throw new Error(r.status);
                        const blob = await r.blob();
                        bytes += blob.size;
                        await cache.put(u, new Response(blob, { headers: { 'Content-Type': r.headers.get('Content-Type') || '' } }));
                        break;
                    } catch (e) { if (tries) failed++; }
                }
                done++;
                if (done % 20 === 0 || done === urls.length) {
                    prog.value = done / urls.length;
                    est.textContent = 'Saving… ' + fmt(done) + ' of ' + fmt(urls.length) + ' tiles (' + Math.round(bytes / 1048576) + ' MB)';
                }
            }
        };
        await Promise.all([0, 1, 2, 3, 4, 5].map(worker));
        if (job.stop) {
            await caches.delete(name);
            est.textContent = 'Stopped. Nothing of this area was kept.';
        } else {
            const meta = { name: offName(), bounds: plan.area, kinds: want, date: new Date().toISOString(), tiles: urls.length, bytes };
            await cache.put(location.origin + '/switzerland/' + OFF_META, new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
            est.textContent = 'Saved: ' + meta.name + ', ' + Math.round(bytes / 1048576) + ' MB' + (failed ? ' (' + failed + ' tiles could not be loaded)' : '') + '.';
        }
    } catch (e) {
        await caches.delete(name).catch(() => {});
        est.textContent = 'The area could not be saved (' + (e && e.name === 'QuotaExceededError' ? 'not enough space on this device' : 'no connection, or the browser does not allow it') + ').';
    }
    offJob = null;
    prog.hidden = true; $('ch-off-stop').hidden = true; $('ch-off-save').disabled = false;
    offList();
}
/* a name for the area: the nearest town or summit to its centre, from this site's label files */
let offPlaces = [];
function offName() {
    const c = mapA.getCenter();
    let best = null, bd = Infinity;
    offPlaces.forEach((p) => { const d = (p[0] - c.lng) ** 2 + ((p[1] - c.lat) * 1.45) ** 2; if (d < bd) { bd = d; best = p; } });
    return best ? 'Around ' + best[2] : 'Area at ' + c.lat.toFixed(3) + ', ' + c.lng.toFixed(3);
}
async function offList() {
    const ul = $('ch-off-list');
    if (!offOK) return;
    const names = (await caches.keys()).filter((n) => n.indexOf('ch-area-') === 0).sort().reverse();
    const items = [];
    for (const n of names) {
        const r = await (await caches.open(n)).match(location.origin + '/switzerland/' + OFF_META);
        let m = null;
        try { m = r ? await r.json() : null; } catch (e) { m = null; }
        if (m && Array.isArray(m.bounds) && m.bounds.length === 4 && m.bounds.every(isFinite)) items.push([n, m]);
    }
    ul.textContent = '';
    $('ch-off-saved').hidden = !items.length;
    items.forEach(([n, m]) => {
        const li = el('li', 'ch-off-item');
        const txt = el('div', 'ch-off-txt');
        const kinds = [m.kinds && m.kinds.map ? '2D' : '', m.kinds && m.kinds.aerial ? '3D' : ''].filter(Boolean).join(' and ');
        txt.append(el('strong', null, String(m.name || 'Area')), el('span', null, kinds + ' · ' + Math.round((+m.bytes || 0) / 1048576) + ' MB · ' + when(m.date)));
        const show = el('button', 'ch-chip', 'Show');
        show.type = 'button';
        show.addEventListener('click', () => {
            const b = m.bounds.map(Number);
            mapA.fitBounds([[b[0], b[1]], [b[2], b[3]]], { duration: reduced ? 0 : 1200, pitch: threeD ? 60 : 0 });
        });
        const del = el('button', 'ch-chip', 'Delete');
        del.type = 'button';
        del.addEventListener('click', async () => { await caches.delete(n); offList(); });
        li.append(txt, show, del);
        ul.appendChild(li);
    });
    if (navigator.storage && navigator.storage.estimate) {
        const s = await navigator.storage.estimate().catch(() => null);
        $('ch-off-use').textContent = s && s.usage ? 'This site uses ' + Math.round(s.usage / 1048576) + ' MB on this device.' : '';
    }
}
function wireOffline() {
    const btn = $('ch-offline-btn'), panel = $('ch-offline');
    btn.addEventListener('click', () => { sheet('ch-offline', panel.hidden); if (!panel.hidden) { offEstimate(); offList(); } });
    $('ch-offline-close').addEventListener('click', () => { sheet('ch-offline', false); btn.focus(); });
    if (!offOK) {
        $('ch-off-est').textContent = 'This browser cannot keep maps for offline use (or it is a private window).';
        $('ch-off-save').disabled = true;
        return;
    }
    $('ch-off-2d').addEventListener('change', offEstimate);
    $('ch-off-3d').addEventListener('change', offEstimate);
    $('ch-off-save').addEventListener('click', offSave);
    $('ch-off-stop').addEventListener('click', () => { if (offJob) offJob.stop = true; });
    mapA.on('moveend', () => { if (!panel.hidden && !offJob) offEstimate(); });
}
