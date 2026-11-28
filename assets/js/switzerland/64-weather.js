/* Part 64: the Weather sheet's maps that cover the whole country (the stations and the snow cover are in part 60).
   - Rain: MeteoSwiss's radar (open data, CC BY 4.0, data.geo.admin.ch): a picture every 5 minutes, 1 km cells,
     rain rate in mm/h, in HDF5 files on the Swiss grid (LV95). jsfive (static/engines, public domain) reads them; each
     cell is placed on the web map through the Swiss grid formulas (part 00) and drawn into a picture laid on the
     map. The last hour can be played.
   - Temperature and cloud cover now: MeteoSwiss's forecast model ICON-CH1 for the current quarter hour, through
     Open-Meteo (free for non-commercial use, CC BY 4.0). The page asks for a grid of points about 20 km apart (about
     200 points, which Open-Meteo counts as 200 calls; kept for 15 minutes in this tab) and smooths between them, so
     valleys and summits in between are averaged. A model estimate, not a measurement; the sheet says so. */
const RADAR = 'https://data.geo.admin.ch/ch.meteoschweiz.ogd-radar-precip/';
const RADAR_STAC = 'https://data.geo.admin.ch/api/stac/v1/collections/ch.meteoschweiz.ogd-radar-precip/items/';
const RAIN_STEPS = [[0.1, [92, 170, 255]], [0.5, [40, 120, 245]], [1, [0, 80, 220]], [2, [0, 165, 70]], [5, [255, 205, 0]],
                    [10, [255, 125, 0]], [20, [225, 25, 25]], [50, [155, 0, 185]]];
let h5 = null, rainFrames = [], rainIdx = -1, rainGrid = null, rainTimer = null, rainBusy = false, rainWant = -1, rainListed = 0;
const rainCache = new Map();   // frame name -> object URL of its picture

/* the output picture: a Web Mercator rectangle around the radar's grid, and for each of its pixels the radar cell */
function rainGeometry(where) {
    const lons = [where.UL_lon, where.LL_lon, where.UR_lon, where.LR_lon].map(Number), lats = [where.UL_lat, where.LL_lat, where.UR_lat, where.LR_lat].map(Number);
    const w = Math.min(...lons), e = Math.max(...lons), s = Math.min(...lats), n = Math.max(...lats);
    // a file that does not describe the Swiss radar grid is not drawn
    if (!(w > 1 && e < 18 && s > 42 && n < 51 && e > w && n > s) || !(+where.xsize > 0 && +where.xsize <= 2000 && +where.ysize > 0 && +where.ysize <= 2000)) throw new Error('grid');
    const W = 900, yN = mercY(n), yS = mercY(s), H = Math.min(2000, Math.round(W * (yS - yN) / ((e - w) / 360)));
    // the grid's top left corner on the Swiss grid (whole kilometres)
    const ul = toLV95(Number(where.UL_lon), Number(where.UL_lat));
    const E0 = Math.round(ul[0] / 1000) * 1000, N0 = Math.round(ul[1] / 1000) * 1000;
    const cols = Number(where.xsize), rows = Number(where.ysize);
    const map = new Int32Array(W * H).fill(-1);
    for (let j = 0; j < H; j++) {
        const lat = latOfY(yN + (j + 0.5) / H * (yS - yN));
        for (let i = 0; i < W; i++) {
            const lon = w + (i + 0.5) / W * (e - w);
            const [E, N] = toLV95(lon, lat);
            const c = Math.floor((E - E0) / 1000), r = Math.floor((N0 - N) / 1000);
            if (c >= 0 && c < cols && r >= 0 && r < rows) map[j * W + i] = r * cols + c;
        }
    }
    return { W, H, map, coords: [[w, n], [e, n], [e, s], [w, s]] };
}
async function rainPicture(name) {
    if (rainCache.has(name)) return rainCache.get(name);
    const res = await fetch(RADAR + rainFolder(name) + '/' + name, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(res.status);
    const f = new h5.File(await res.arrayBuffer(), name);
    if (!rainGrid) rainGrid = rainGeometry(f.get('where').attrs);
    const v = f.get('dataset1/data1/data').value, g = rainGrid;
    if (!v || v.length !== Number(f.get('where').attrs.xsize) * Number(f.get('where').attrs.ysize)) throw new Error('size');
    const c = document.createElement('canvas');
    c.width = g.W; c.height = g.H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(g.W, g.H), d = img.data;
    for (let k = 0; k < g.map.length; k++) {
        const idx = g.map[k];
        if (idx < 0) continue;
        const mm = v[idx];
        if (!(mm >= 0.1)) continue;
        let col = RAIN_STEPS[0][1];
        for (const [t, rgb] of RAIN_STEPS) { if (mm >= t) col = rgb; }
        d[k * 4] = col[0]; d[k * 4 + 1] = col[1]; d[k * 4 + 2] = col[2]; d[k * 4 + 3] = 235;
    }
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
    const url = URL.createObjectURL(blob);
    rainCache.set(name, url);
    return url;
}
/* rzc + YY + DDD (day of the year) + HHMM, in UTC */
function rainTime(name) {
    const m = /^rzc(\d{2})(\d{3})(\d{2})(\d{2})/.exec(name);
    if (!m) return null;
    const d = new Date(Date.UTC(2000 + +m[1], 0, 1, +m[3], +m[4]));
    d.setUTCDate(+m[2]);
    return d;
}
function rainFolder(name) {
    const t = rainTime(name);
    return t.toISOString().slice(0, 10).replace(/-/g, '') + '-ch';
}
async function rainList() {
    const day = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const now = new Date(), names = [];
    // today's list first; yesterday's (about 300 KB) only when today has fewer than 13 pictures, just after midnight UTC
    for (const d of [now, new Date(now - 86400000)]) {
        if (d !== now && names.length >= 13) break;
        try {
            const r = await fetch(RADAR_STAC + day(d) + '-ch', { credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!r.ok) continue;
            const j = await r.json();
            Object.keys(j.assets || {}).forEach((k) => { if (/^rzc\d{9}vl\.001\.h5$/.test(k)) names.push(k); });
        } catch (e) { /* that day is missing */ }
    }
    return names.sort((a, b) => rainTime(a) - rainTime(b)).slice(-13);
}
async function rainShow(i) {
    if (!rainFrames.length) return;
    if (rainBusy) { rainWant = i; return; }   // shown once the picture being made is ready
    rainBusy = true;
    try {
        const name = rainFrames[i], url = await rainPicture(name);
        if (!mapA.getSource('rain')) {
            mapA.addSource('rain', { type: 'image', url, coordinates: rainGrid.coords });
            mapA.addLayer({ id: 'rain', type: 'raster', source: 'rain', layout: { visibility: layerOn.rain ? 'visible' : 'none' },
                            paint: { 'raster-opacity': 1, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } }, 'avalanche');
        } else mapA.getSource('rain').updateImage({ url, coordinates: rainGrid.coords });
        rainIdx = i;
        $('ch-rain-time').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' }).format(rainTime(name));
        $('ch-rain-slider').value = String(i);
    } catch (e) {
        $('ch-rain-state').textContent = 'The radar picture could not be loaded right now.';
    }
    rainBusy = false;
    if (rainWant >= 0) { const w = rainWant; rainWant = -1; if (w !== rainIdx) rainShow(w); }
}
async function rainOn() {
    const state = $('ch-rain-state');
    // the pictures already made are kept; the list is asked again when it is more than 10 minutes old
    if (rainFrames.length && Date.now() - rainListed < 600000) return;
    state.textContent = 'Loading the radar…';
    try {
        if (!h5) h5 = await import(app.dataset.jsfive);
        rainFrames = await rainList();
        if (!rainFrames.length) throw new Error('none');
        rainListed = Date.now();
        // pictures that fell out of the last hour are let go
        [...rainCache.keys()].forEach((k) => { if (!rainFrames.includes(k)) { URL.revokeObjectURL(rainCache.get(k)); rainCache.delete(k); } });
        const s = $('ch-rain-slider');
        s.max = String(rainFrames.length - 1);
        await rainShow(rainFrames.length - 1);
        $('ch-rain-play-row').hidden = false;
        state.textContent = 'MeteoSwiss radar (CC BY 4.0), a picture every 5 minutes. Drag or play the last hour.';
    } catch (e) {
        state.textContent = 'The radar could not be loaded right now.';
    }
}
function rainPlay() {
    const b = $('ch-rain-play');
    if (rainTimer) { clearInterval(rainTimer); rainTimer = null; b.textContent = 'Play'; return; }
    b.textContent = 'Pause';
    let i = rainIdx >= rainFrames.length - 1 ? 0 : rainIdx + 1;
    rainShow(i);
    rainTimer = setInterval(() => {
        if (rainBusy || document.hidden) return;
        i = i >= rainFrames.length - 1 ? 0 : i + 1;
        rainShow(i);
    }, 700);
}

/* ---------- temperature and cloud cover now (model) ---------- */
const FIELD_BOX = [5.85, 45.75, 10.65, 47.85], FIELD_STEP = 0.25;
let field = null, fieldLoading = null, fieldAt = 0;
function fieldGrid() {
    const lats = [], lons = [];
    const nx = Math.round((FIELD_BOX[2] - FIELD_BOX[0]) / FIELD_STEP) + 1, ny = Math.round((FIELD_BOX[3] - FIELD_BOX[1]) / FIELD_STEP) + 1;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { lats.push((FIELD_BOX[1] + j * FIELD_STEP).toFixed(3)); lons.push((FIELD_BOX[0] + i * FIELD_STEP).toFixed(3)); }
    return { nx, ny, lats, lons };
}
const FIELD_KEY = 'ch-field-v1';
async function loadField() {
    if (field && Date.now() - fieldAt < 900000) return field;
    if (field) { field = null; fieldLoading = null; }
    if (!fieldLoading) fieldLoading = (async () => {
        const g = fieldGrid();
        // kept 15 minutes in this tab, so turning the map on again does not ask Open-Meteo again
        try {
            const c = JSON.parse(sessionStorage.getItem(FIELD_KEY) || 'null');
            if (c && Date.now() - c.at < 900000 && c.t.length === g.nx * g.ny) {
                field = { ...g, t: Float32Array.from(c.t), c: Float32Array.from(c.c), time: c.time }; fieldAt = c.at;
                return field;
            }
        } catch (e) { /* no storage */ }
        const body = new URLSearchParams({ latitude: g.lats.join(','), longitude: g.lons.join(','), current: 'temperature_2m,cloud_cover', models: 'meteoswiss_icon_ch1' });
        const res = await fetch('https://api.open-meteo.com/v1/forecast', { method: 'POST', body, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (res.status === 429) throw new Error('busy');
        if (!res.ok) throw new Error(res.status);
        const d = await res.json();
        if (!Array.isArray(d) || d.length !== g.nx * g.ny) throw new Error('shape');
        const t = new Float32Array(d.length), c = new Float32Array(d.length);
        d.forEach((p, k) => { const cur = (p && p.current) || {}; t[k] = Number(cur.temperature_2m); c[k] = Number(cur.cloud_cover); });
        field = { ...g, t, c, time: d[0] && d[0].current && d[0].current.time };
        fieldAt = Date.now();
        try { sessionStorage.setItem(FIELD_KEY, JSON.stringify({ at: fieldAt, t: Array.from(t), c: Array.from(c), time: field.time })); } catch (e) { /* no storage */ }
        return field;
    })().catch((e) => { fieldLoading = null; throw e; });
    return fieldLoading;
}
const TEMP_RAMP = [[-20, [49, 54, 149]], [-10, [69, 117, 180]], [-5, [116, 173, 209]], [0, [224, 243, 248]], [5, [254, 224, 144]],
                   [10, [253, 174, 97]], [20, [244, 109, 67]], [30, [215, 48, 39]], [35, [165, 0, 38]]];
function ramp(stops, v) {
    if (v <= stops[0][0]) return stops[0][1];
    for (let k = 1; k < stops.length; k++) {
        if (v <= stops[k][0]) {
            const [a, ca] = stops[k - 1], [b, cb] = stops[k], f = (v - a) / (b - a);
            return [0, 1, 2].map((q) => Math.round(ca[q] + (cb[q] - ca[q]) * f));
        }
    }
    return stops[stops.length - 1][1];
}
/* a smooth picture of one variable: bilinear between the grid points, in Web Mercator */
function fieldPicture(kind) {
    const f = field, W = 480, [w, s, e, n] = FIELD_BOX, yN = mercY(n), yS = mercY(s);
    const H = Math.round(W * (yS - yN) / ((e - w) / 360));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data, vals = kind === 'temp' ? f.t : f.c;
    for (let j = 0; j < H; j++) {
        const lat = latOfY(yN + (j + 0.5) / H * (yS - yN)), gy = (lat - s) / FIELD_STEP;
        const y0 = clamp(Math.floor(gy), 0, f.ny - 2), fy = clamp(gy - y0, 0, 1);
        for (let i = 0; i < W; i++) {
            const gx = (i + 0.5) / W * (f.nx - 1), x0 = clamp(Math.floor(gx), 0, f.nx - 2), fx = clamp(gx - x0, 0, 1);
            const a = vals[y0 * f.nx + x0], b = vals[y0 * f.nx + x0 + 1], cc = vals[(y0 + 1) * f.nx + x0], dd = vals[(y0 + 1) * f.nx + x0 + 1];
            const v = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + dd * fx) * fy;
            if (!isFinite(v)) continue;
            const k = (j * W + i) * 4;
            if (kind === 'temp') { const rgb = ramp(TEMP_RAMP, v); d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 150; }
            else { d[k] = 90; d[k + 1] = 100; d[k + 2] = 115; d[k + 3] = Math.round(clamp(v, 0, 100) * 2); }
        }
    }
    ctx.putImageData(img, 0, 0);
    return new Promise((ok) => c.toBlob((bl) => ok(URL.createObjectURL(bl)), 'image/png'));
}
async function fieldOn(kind) {
    const state = $('ch-' + kind + '-state');
    state.textContent = 'Loading…';
    try {
        const f = await loadField();
        const id = 'field-' + kind;
        if (fieldDrawn[kind] !== f) {
            const url = await fieldPicture(kind), [w, s, e, n] = FIELD_BOX;
            fieldDrawn[kind] = f;
            // checked again after the wait: a quick off and on must not add the map twice
            if (mapA.getSource(id)) { mapA.getSource(id).updateImage({ url, coordinates: [[w, n], [e, n], [e, s], [w, s]] }); return fieldNote(state); }
            mapA.addSource(id, { type: 'image', url, coordinates: [[w, n], [e, n], [e, s], [w, s]] });
            mapA.addLayer({ id, type: 'raster', source: id, layout: { visibility: layerOn[kind] ? 'visible' : 'none' },
                            paint: { 'raster-opacity': kind === 'temp' ? 0.75 : 0.9, 'raster-fade-duration': 0 } }, 'avalanche');
        }
        fieldNote(state);
    } catch (e) {
        state.textContent = e && e.message === 'busy' ? 'Open-Meteo is busy for this connection: try again in a minute.' : 'Could not be loaded right now.';
    }
}
const fieldDrawn = {};
function fieldNote(state) {
    const at = field && field.time ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' }).format(new Date(field.time + 'Z')) : '';
    state.textContent = 'MeteoSwiss model ICON-CH1 via Open-Meteo, for ' + at + ', points about 20 km apart. An estimate from the model, not a measurement.';
}
function wireWeather() {
    const btn = $('ch-weather-btn'), panel = $('ch-weather');
    btn.addEventListener('click', () => sheet('ch-weather', panel.hidden));
    $('ch-weather-close').addEventListener('click', () => { sheet('ch-weather', false); btn.focus(); });
    $('ch-rain-play').addEventListener('click', rainPlay);
    const s = $('ch-rain-slider');
    s.addEventListener('input', () => { if (rainTimer) rainPlay(); rainShow(+s.value); });
}
