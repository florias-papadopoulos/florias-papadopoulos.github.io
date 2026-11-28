/* Part 20: 3D and the sun. 3D: swisstopo's terrain model (quantized mesh, 3d.geo.admin.ch) turned into MapLibre
   terrain by this site's terrain worker (terrain-worker.js, with HERE's decoder from static/engines). The sun: for a chosen day and
   time, the sun's position over the map's centre (the usual astronomical formulas, as in the SunCalc library) lights
   the slopes from that direction and height (a hillshade layer). It shows which slopes face the sun; it does not cast
   the shadows of one mountain onto another. swisstopo's terrain covers Switzerland and a narrow strip around it (tiles
   elsewhere answer 403), so it is asked for only there; beyond, the map lies flat at 300 m. */
let terrainLoading = null, pending3D = false;
function terrainSource() {
    if (terrainSpec) return Promise.resolve(terrainSpec);
    if (!terrainLoading) terrainLoading = loadTerrain().catch((e) => { terrainLoading = null; throw e; });
    return terrainLoading;
}
/* phones: smaller height images (256 pixels a side instead of 512), a quarter of the work and memory */
const COARSE = matchMedia('(pointer: coarse)').matches;
/* the height images are made by two workers (assets/js/switzerland/terrain-worker.js), not on the main thread:
   making them there froze the buttons and the map for a moment with every new tile */
async function loadTerrain() {
    const workers = [0, 1].map(() => new Worker(app.dataset.terrainWorker, { type: 'module', name: 'terrain' }));
    const waiting = new Map();
    let next = 1;
    const ready = workers.map((w) => new Promise((resolve, reject) => {
        w.onmessage = (e) => {
            const m = e.data || {};
            if (m.type === 'ready') { m.error ? reject(new Error(m.error)) : resolve(m); return; }
            const job = waiting.get(m.id);
            if (!job) { if (m.bitmap) m.bitmap.close(); return; }
            waiting.delete(m.id);
            if (m.error) job.reject(new Error(m.error));
            else if (m.bitmap) job.resolve({ data: m.bitmap });
            else createImageBitmap(new ImageData(m.rgba, Math.sqrt(m.rgba.length / 4))).then((b) => job.resolve({ data: b }), job.reject);
        };
        w.onerror = () => reject(new Error('worker'));
        w.postMessage({ type: 'init', decoder: new URL(app.dataset.decoder, location.href).href,
                        layer: 'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/layer.json',
                        bounds: { west: 5.6, south: 45.5, east: 11.0, north: 48.2 }, maxZoom: 12,
                        size: COARSE ? 256 : 512, fallback: 300 });
    }));
    let info;
    try { info = (await Promise.all(ready))[0]; } catch (e) { workers.forEach((w) => w.terminate()); throw e; }
    ml.addProtocol('chterrain', ({ url }, abort) => new Promise((resolve, reject) => {
        const m = /^chterrain:\/\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})$/.exec(url);
        if (!m) { reject(new Error('url')); return; }
        const id = next++, w = workers[id % workers.length];
        waiting.set(id, { resolve, reject });
        w.postMessage({ type: 'tile', id, z: +m[1], x: +m[2], y: +m[3] });
        if (abort && abort.signal) abort.signal.addEventListener('abort', () => {
            if (waiting.delete(id)) { w.postMessage({ type: 'abort', id }); reject(new DOMException('aborted', 'AbortError')); }
        }, { once: true });
    }));
    terrainSpec = { type: 'raster-dem', encoding: 'terrarium', tiles: ['chterrain://{z}/{x}/{y}'], tileSize: 512,
                    minzoom: info.minZoom, maxzoom: info.maxZoom, bounds: [5.6, 45.5, 11.0, 48.2], attribution: ATTR };
    return terrainSpec;
}
/* once the map is idle the first time, 3D gets ready in the background (two small scripts and a 314-byte file),
   so the 3D and Sun buttons answer at once */
function warmTerrain() {
    const c = navigator.connection;
    if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;
    const go = () => terrainSource().catch(() => { /* tried again on the click */ });
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
}
const DAY_SKY = { 'sky-color': '#a9cdea', 'horizon-color': '#e8f1f8', 'fog-color': '#ffffff', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4 };
function terrainOn(m) {
    if (!terrainSpec) return;
    if (!m.getSource('terrain')) m.addSource('terrain', terrainSpec);
    m.setTerrain({ source: 'terrain', exaggeration: 1.25 });
    if (m.setSky) m.setSky(DAY_SKY);
}
/* opts.fly: false keeps the camera (a shared link) */
async function set3D(on, opts) {
    opts = opts || {};
    if (on === threeD || (on && pending3D)) return true;
    const btn = $('ch-3d');
    if (on) {
        status('Loading the mountains…');
        pending3D = true;
        tools();
        try { await terrainSource(); } catch (e) {
            pending3D = false;
            tools();
            status('');
            toast('The 3D terrain could not be loaded right now.', 4000);
            return false;
        }
        pending3D = false;
        status('');
        threeD = true;
        btn.setAttribute('aria-pressed', 'true');
        only('3d');
        // 3D is the aerial photo only: the maps' lettering would lie on the slopes
        if (base !== 'aerial') setBase('aerial');
        terrainOn(mapA);
        if (PIXELS_3D !== PIXELS) mapA.setPixelRatio(PIXELS_3D);
        if (opts.fly !== false) {
            // tilt where the visitor is: from far out, a little closer so the relief shows; very close in, a step back
            // so the camera does not sit inside the slope. The direction stays as it is.
            mapA.easeTo({ pitch: 60, zoom: clamp(mapA.getZoom(), 9, 13.2), duration: reduced ? 0 : 1400 });
        }
        document.querySelector('.ch-pad-3d').hidden = false;
        compass();
        let seen = false;
        try { seen = localStorage.getItem('ch-3d-hint') === '1'; localStorage.setItem('ch-3d-hint', '1'); } catch (e) { /* no storage */ }
        if (!seen) toast(matchMedia('(pointer: coarse)').matches
            ? 'Drag to move. Two fingers: pinch to zoom, turn to rotate, slide up or down to tilt.'
            : 'Drag to move. Right-drag or Ctrl+drag to turn and tilt. Or use the buttons on the right.', 6000);
    } else {
        if (sunOn) setSun(false);
        threeD = false;
        btn.setAttribute('aria-pressed', 'false');
        document.querySelector('.ch-pad-3d').hidden = true;
        compass();
        mapA.setTerrain(null);
        if (PIXELS_3D !== PIXELS) mapA.setPixelRatio(PIXELS);
        mapA.easeTo({ pitch: 0, bearing: 0, duration: reduced ? 0 : 900 });
    }
    tools();
    writeHash();
    return true;
}

/* ---------- the sun ---------- */
let sunOn = false, sunDate = null, sunMinutes = 12 * 60;
function sunPosition(date, lat, lon) {
    const rad = Math.PI / 180, e = rad * 23.4397;
    const d = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
    const M = rad * (357.5291 + 0.98560028 * d);
    const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(L) * Math.sin(e));
    const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
    const H = rad * (280.16 + 360.9856235 * d) + rad * lon - ra, phi = rad * lat;
    const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
    return { altitude: alt / rad, azimuth: (az / rad + 180 + 360) % 360 };
}
/* the chosen day and time are Swiss time (Europe/Zurich, summer time included), whatever the visitor's clock */
function zurichDate(dayStr, minutes) {
    const [y, m, d] = dayStr.split('-').map(Number);
    const guess = new Date(Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60));
    let offset = 60;
    try {
        const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', timeZoneName: 'shortOffset' })
            .formatToParts(guess).find((p) => p.type === 'timeZoneName');
        const mm = /GMT([+-]\d+)(?::(\d+))?/.exec(part ? part.value : '');
        if (mm) offset = +mm[1] * 60 + (mm[2] ? Math.sign(+mm[1]) * +mm[2] : 0);
    } catch (e) { /* old browser: Central European Time */ }
    return new Date(guess.valueOf() - offset * 60000);
}
function today() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
}
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
function applySun() {
    if (!sunOn || !mapA) return;
    const c = mapA.getCenter();
    const s = sunPosition(zurichDate(sunDate, sunMinutes), c.lat, c.lng);
    const up = s.altitude > 0;
    // the shading reads the terrain that 3D already built: building it a second time doubled the work
    if (!mapA.getLayer('sun-shade')) {
        mapA.addLayer({ id: 'sun-shade', type: 'hillshade', source: 'terrain',
                        paint: { 'hillshade-illumination-anchor': 'map', 'hillshade-exaggeration': 0.5,
                                 'hillshade-shadow-color': '#0b1a33', 'hillshade-highlight-color': 'rgba(255,236,190,0.35)',
                                 'hillshade-accent-color': '#14233f' } }, 'slopes');
    }
    mapA.setPaintProperty('sun-shade', 'hillshade-illumination-direction', Math.round(s.azimuth) % 360);
    try { mapA.setPaintProperty('sun-shade', 'hillshade-illumination-altitude', clamp(s.altitude, 1, 90)); } catch (e) { /* older engines light from a fixed height */ }
    // night and twilight: the whole picture dims
    const light = clamp((s.altitude + 6) / 16, 0, 1);
    mapA.setPaintProperty('base', 'raster-brightness-max', 0.28 + 0.72 * light);
    if (mapA.setSky) mapA.setSky({ 'sky-color': up ? '#a9cdea' : '#1d2a44', 'horizon-color': up ? (s.altitude < 8 ? '#f6c89a' : '#e8f1f8') : '#33415c',
                                   'fog-color': up ? '#ffffff' : '#2a3550', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4 });
    const hh = String(Math.floor(sunMinutes / 60)).padStart(2, '0'), mm = String(sunMinutes % 60).padStart(2, '0');
    $('ch-sun-out').textContent = hh + ':' + mm;
    $('ch-sun-info').textContent = up
        ? 'Sun ' + Math.round(s.altitude) + '° high, from the ' + COMPASS[Math.round(s.azimuth / 45) % 8]
        : 'The sun is below the horizon';
}
async function setSun(on) {
    if (on === sunOn) return;
    if (on) {
        if (!threeD && !(await set3D(true))) return;
        sunOn = true;
        if (!sunDate) { sunDate = today(); $('ch-sun-day').value = sunDate; }
        applySun();
    } else {
        sunOn = false;
        if (mapA.getLayer('sun-shade')) mapA.removeLayer('sun-shade');
        mapA.setPaintProperty('base', 'raster-brightness-max', 1);
        if (mapA.setSky) mapA.setSky(DAY_SKY);
    }
    $('ch-sun').setAttribute('aria-pressed', String(sunOn));
    $('ch-sun-panel').hidden = !sunOn;
}
modes['3d'] = { on: () => threeD, off: () => set3D(false) };

/* the 3D pad: turn, tilt and face north with buttons, for those without a right mouse button or two fingers free */
function pad(turn, tilt) {
    mapA.easeTo({ bearing: mapA.getBearing() + turn, pitch: clamp(mapA.getPitch() + tilt, 0, 80), duration: reduced ? 0 : 450 });
}
function wireTerrain() {
    $('ch-3d').addEventListener('click', () => set3D(!threeD));
    $('ch-pad-left').addEventListener('click', () => pad(-30, 0));
    $('ch-pad-right').addEventListener('click', () => pad(30, 0));
    $('ch-pad-up').addEventListener('click', () => pad(0, 12));
    $('ch-pad-down').addEventListener('click', () => pad(0, -12));
    $('ch-sun').addEventListener('click', () => setSun(!sunOn));
    $('ch-sun-close').addEventListener('click', () => setSun(false));
    const range = $('ch-sun-time'), day = $('ch-sun-day');
    range.value = sunMinutes;
    // at most one redraw per screen frame while the slider moves
    let frame = 0;
    range.addEventListener('input', () => {
        sunMinutes = +range.value;
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; applySun(); });
    });
    day.addEventListener('change', () => { if (/^\d{4}-\d{2}-\d{2}$/.test(day.value)) { sunDate = day.value; applySun(); } });
    let t = null;
    mapA.on('moveend', () => { if (sunOn) { clearTimeout(t); t = setTimeout(applySun, 150); } });
}
