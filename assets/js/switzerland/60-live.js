/* Part 60: live values. The weather layer: MeteoSwiss's automatic stations (SwissMetNet, about 160, CC BY 4.0), each
   with its temperature of the last 10 minutes (one file, loaded when the layer is first turned on); a tap on a
   station loads that station's own small file of today's 10-minute values (about 7 KB) for its card. And the nearest
   public transport stop to a summit or a cave, from the federal register of stops (BAV, through swisstopo's
   api3 service). Text from these services is set with textContent only. */
const WX_HOST = 'https://data.geo.admin.ch/';
let wx = null, wxLoading = false;
async function loadWeather() {
    if (wx || wxLoading) return;
    wxLoading = true;
    const state = $('ch-weather-state');
    state.textContent = 'Loading the stations…';
    try {
        const res = await fetch(WX_HOST + 'ch.meteoschweiz.messwerte-lufttemperatur-10min/ch.meteoschweiz.messwerte-lufttemperatur-10min_en.json',
                                { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        let ref = '';
        wx = (Array.isArray(data.features) ? data.features : []).map((f) => {
            const c = f && f.geometry && f.geometry.coordinates, p = (f && f.properties) || {};
            const t = Number(p.value), id = String(f.id || '');
            if (!Array.isArray(c) || !isFinite(c[0]) || !isFinite(c[1]) || !isFinite(t) || t < -60 || t > 50 || !/^[A-Z0-9]{3}$/.test(id)) return null;   // 99.999: a station without a value
            ref = ref || p.reference_ts;
            return { type: 'Feature', geometry: { type: 'Point', coordinates: fromLV95(+c[0], +c[1]) },
                     properties: { id, t: Math.round(t * 10) / 10, name: String(p.station_name || id), alt: Math.round(Number(p.altitude) || 0) } };
        }).filter(Boolean);
        if (!mapA.getSource('wx')) mapA.addSource('wx', { type: 'geojson', data: EMPTY, attribution: '© <a href="https://www.meteoswiss.admin.ch/" target="_blank" rel="noopener noreferrer">MeteoSwiss</a>' });
        mapA.getSource('wx').setData({ type: 'FeatureCollection', features: wx });
        if (!mapA.getLayer('wx-dots')) {
            const vis = { visibility: layerOn.weather ? 'visible' : 'none' };
            mapA.addLayer({ id: 'wx-dots', type: 'circle', source: 'wx', layout: vis,
                            paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 7],
                                     'circle-color': ['interpolate', ['linear'], ['get', 't'], -15, '#1e3a8a', -5, '#3b82f6', 0, '#e0f2fe', 10, '#fde68a', 20, '#f97316', 30, '#b91c1c'],
                                     'circle-stroke-color': '#0f172a', 'circle-stroke-width': 1 } }, 'peaks');
            mapA.addLayer({ id: 'wx-text', type: 'symbol', source: 'wx', layout: { ...vis,
                            'text-field': ['concat', ['to-string', ['round', ['get', 't']]], '°'],
                            'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 12, 'text-offset': [0, 1], 'text-anchor': 'top', 'text-padding': 4 },
                            paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } }, 'peaks');
        }
        state.textContent = wx.length ? 'Measured ' + when(ref) + '. Tap a station for wind, rain and more.' : 'No measurements right now.';
    } catch (e) {
        wx = null;
        state.textContent = 'The stations could not be loaded. Try again later.';
    }
    wxLoading = false;
}

/* one station's values: the last row of its file, with rain and sunshine summed over the last hour */
const WX_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
let wxCardReq = 0;
function weatherCard(p) {
    const req = ++wxCardReq;
    let dl, note;
    card((b) => {
        b.append(el('p', 'ch-card-kind', 'Weather station'), el('h2', null, p.name));
        dl = el('dl', 'ch-card-facts');
        row(dl, 'Temperature', fmtTemp(+p.t));
        if (+p.alt) row(dl, 'Altitude', fmt(+p.alt) + ' m');
        note = el('p', 'ch-card-note', 'Loading the other values…');
        b.append(dl, note, el('p', 'ch-card-src', 'MeteoSwiss automatic station, values of the last 10 minutes (CC BY 4.0).'));
    });
    const id = String(p.id).toLowerCase();
    if (!/^[a-z0-9]{3}$/.test(id)) { note.textContent = ''; return; }
    fetch(WX_HOST + 'ch.meteoschweiz.ogd-smn/' + id + '/ogd-smn_' + id + '_t_now.csv', { credentials: 'omit', referrerPolicy: 'no-referrer' })
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then((text) => {
            if (req !== wxCardReq || $('ch-card').hidden) return;
            const lines = text.trim().split(/\r?\n/).slice(0, 400);
            const head = (lines.shift() || '').split(';');
            const rows = lines.map((l) => l.split(';')).filter((r) => r.length === head.length);
            if (!rows.length) throw new Error('empty');
            const col = (k) => head.indexOf(k);
            const num = (r, k) => { const i = col(k); const v = i < 0 ? NaN : parseFloat(r[i]); return isFinite(v) && Math.abs(v) < 9999 ? v : null; };
            // the newest row that has a temperature, and the hour up to it
            let last = rows.length - 1;
            while (last > 0 && num(rows[last], 'tre200s0') === null) last--;
            const r = rows[last], hour = rows.slice(Math.max(0, last - 5), last + 1);
            const sum = (k) => { let s = 0, n = 0; hour.forEach((h) => { const v = num(h, k); if (v !== null) { s += v; n++; } }); return n ? s : null; };
            dl.textContent = '';
            let t = num(r, 'tre200s0');
            if (t !== null && (t < -60 || t > 50)) t = null;
            row(dl, 'Temperature', t !== null ? fmtTemp(t) : fmtTemp(+p.t));
            const chill = num(r, 'xchills0');
            if (chill !== null && t !== null && chill < t - 1) row(dl, 'Feels like', fmtTemp(chill));
            const w = num(r, 'fu3010z0'), d = num(r, 'dkl010z0'), g = num(r, 'fu3010z1');
            if (w !== null) row(dl, 'Wind', Math.round(w) + ' km/h' + (d !== null && w >= 1 ? ' from ' + WX_DIRS[Math.round(d / 45) % 8] : ''));
            if (g !== null) row(dl, 'Gusts', Math.round(g) + ' km/h');
            const rain = sum('rre150z0');
            if (rain !== null) row(dl, 'Rain, last hour', (Math.round(rain * 10) / 10) + ' mm');
            const sun = sum('sre000z0');
            if (sun !== null) row(dl, 'Sun, last hour', Math.round(sun) + ' min');
            const hum = num(r, 'ure200s0');
            if (hum !== null) row(dl, 'Humidity', Math.round(hum) + ' %');
            const sn = num(r, 'htoauts0');
            if (sn !== null) row(dl, 'Snow depth', Math.round(sn) + ' cm');
            if (+p.alt) row(dl, 'Altitude', fmt(+p.alt) + ' m');
            // the file's times are UTC ("28.11.2026 08:30")
            const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(r[col('reference_timestamp')] || '');
            note.textContent = m ? 'Measured ' + when(m[3] + '-' + m[2] + '-' + m[1] + 'T' + m[4] + ':' + m[5] + ':00Z') + '.' : '';
        })
        .catch(() => { if (req === wxCardReq) note.textContent = 'The other values could not be loaded right now.'; });
}
function fmtTemp(v) { return (v < 0 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toFixed(1) + ' °C'; }

/* ---------- the nearest stop ---------- */
const MODES = { Zug: 'train', Bus: 'bus', Tram: 'tram', Schiff: 'boat', Zahnradbahn: 'rack railway', Standseilbahn: 'funicular',
                Kabinenbahn: 'cable car', Luftseilbahn: 'cable car', Gondelbahn: 'gondola', Sesselbahn: 'chairlift', Metro: 'metro' };
let stopReq = 0;
/* adds a "Nearest stop" line to a card's facts once known; looks 3 km around, then 10 km */
async function nearestStop(lon, lat, dl) {
    const req = ++stopReq;
    const [x, y] = toLV95(lon, lat);
    const look = async (r) => {
        const url = API + 'api/MapServer/identify?geometryType=esriGeometryPoint&geometry=' + Math.round(x) + ',' + Math.round(y) +
            '&sr=2056&layers=all:ch.bav.haltestellen-oev&tolerance=50&mapExtent=' + [x - r, y - r, x + r, y + r].map(Math.round).join(',') +
            '&imageDisplay=100,100,96&returnGeometry=true&geometryFormat=geojson&limit=50&lang=en';
        const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error(res.status);
        const d = await res.json();
        let best = null;
        (Array.isArray(d.results) ? d.results : []).forEach((f) => {
            const p = (f && f.properties) || {}, g = f && f.geometry && f.geometry.coordinates;
            const pt = Array.isArray(g) && Array.isArray(g[0]) ? g[0] : g;
            if (p.betriebspunkttyp_de !== 'Haltestelle' || !p.verkehrsmittel_de || !Array.isArray(pt) || !isFinite(pt[0]) || !isFinite(pt[1])) return;
            const dist = Math.hypot(pt[0] - x, pt[1] - y);
            if (dist <= r * 1.42 && (!best || dist < best.dist)) best = { dist, name: String(p.name || p.label || ''), modes: String(p.verkehrsmittel_de) };
        });
        return best;
    };
    try {
        const best = (await look(3000)) || (await look(10000));
        if (req !== stopReq || !dl.isConnected) return;
        if (!best) { row(dl, 'Nearest stop', 'none within 10 km'); return; }
        const kinds = [...new Set(best.modes.split(/\s*\/\s*/).map((m) => own(MODES, m) ? MODES[m] : null).filter(Boolean))];
        const km = best.dist < 1000 ? Math.round(best.dist / 10) * 10 + ' m' : (best.dist / 1000).toFixed(1) + ' km';
        row(dl, 'Nearest stop', best.name + (kinds.length ? ' (' + kinds.join(', ') + ')' : '') + ', ' + km + ' as the crow flies');
    } catch (e) { /* no line then */ }
}

/* ---------- snow cover from space (NASA GIBS, NOAA-20 VIIRS NDSI snow cover, yesterday's picture) ----------
   Open data of NASA (no restrictions; acknowledgement: imagery from NASA's Global Imagery Browse Services, GIBS, part
   of NASA's Earth Science Data and Information System, ESDIS). Daily, about 400 m a pixel, up to zoom 8 (enlarged
   beyond). It shows where snow lies, not how deep; where it was cloudy there is a gap. NASA's colours (pale yellow to
   red) are turned into one blue, paler where less of the ground is covered: the tile goes through chsnow://, which
   reads each pixel's class from NASA's colour table (MODIS_NDSI_Snow_Cover colormap: 1 to 100). */
const SNOW_LAYER = 'VIIRS_NOAA20_NDSI_Snow_Cover';
const SNOW_GROUPS = { 240: 1, 210: 21, 180: 41, 150: 61, 128: 81 };
let snowCoverDay = '';
function snowCoverOn() {
    if (mapA.getSource('snowcover')) return;
    // yesterday in UTC: today's picture is still being put together
    snowCoverDay = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    ml.addProtocol('chsnow', async ({ url }, abort) => {
        const m = /^chsnow:\/\/(\d{1,2})\/(\d{1,4})\/(\d{1,4})$/.exec(url);
        if (!m) throw new Error('url');
        const res = await fetch('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/' + SNOW_LAYER + '/default/' + snowCoverDay +
                                '/GoogleMapsCompatible_Level8/' + m[1] + '/' + m[3] + '/' + m[2] + '.png',
                                { credentials: 'omit', referrerPolicy: 'no-referrer', signal: abort && abort.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
        const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(bmp, 0, 0);
        bmp.close();
        const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            if (!d[i + 3]) continue;
            // NASA's classes, read with a little tolerance (decoding can move a colour by a step or two)
            let v = 0;
            const r = d[i], gg = d[i + 1], b = d[i + 2];
            if (r > 245 && gg < 20 && b < 20) v = 100;
            else if (Math.abs(r - 240) <= 3) {
                const grp = [240, 210, 180, 150, 128].find((k) => Math.abs(gg - k) <= 3);
                if (grp) v = clamp(SNOW_GROUPS[grp] + b - 128, 1, 100);
            }
            if (!v) { d[i + 3] = 0; continue; }
            // light blue for a little snow, deep blue for full cover
            const t = v / 100;
            d[i] = Math.round(186 - 150 * t); d[i + 1] = Math.round(230 - 120 * t); d[i + 2] = Math.round(253 - 20 * t);
            d[i + 3] = Math.round(255 * (0.45 + 0.45 * t));
        }
        g.putImageData(img, 0, 0);
        return { data: await createImageBitmap(c) };
    });
    mapA.addSource('snowcover', { type: 'raster', tiles: ['chsnow://{z}/{x}/{y}'], tileSize: 256, maxzoom: 8, bounds: AREA,
        attribution: '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener noreferrer">NASA GIBS</a>' });
    mapA.addLayer({ id: 'snowcover', type: 'raster', source: 'snowcover', layout: { visibility: layerOn.snowcover ? 'visible' : 'none' },
                    paint: { 'raster-opacity': 0.8, 'raster-resampling': 'linear' } }, 'avalanche');
    const s = $('ch-snowcover-state');
    if (s) s.textContent = 'Picture of ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(snowCoverDay + 'T12:00:00Z')) + '.';
}
