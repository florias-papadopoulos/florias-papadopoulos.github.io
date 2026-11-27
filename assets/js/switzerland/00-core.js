/* The Switzerland page (layouts/switzerland/list.html): a full-screen live map of Switzerland, drawn by MapLibre GL
   (static/engines/maplibre-gl-*, loaded from this site only after the visitor agreed: the flag's question, kept in
   localStorage or sessionStorage 'ch-maps-ok' by assets/js/site/flag.js, or the same question on this page).

   This file is part 00 of a few numbered parts in assets/js/switzerland/, joined in order into one module by
   layouts/switzerland/list.html (they share one scope; see README.md there). Here: the constants, the shared state,
   small helpers and the first map's style. Data, all official and free to use with the source named:
   - swisstopo (wmts.geo.admin.ch): five base maps, hiking trails, slopes over 30°, ski touring and snowshoe routes,
     glacier extents 1850 to 2016, the old maps of "Journey through time";
   - swisstopo (vectortiles.geo.admin.ch): summit names and heights; (3d.geo.admin.ch): the terrain model for 3D;
   - swisstopo (api3.geo.admin.ch): place search and elevation profiles;
   - SLF (aws.slf.ch): today's avalanche bulletin, only when the visitor turns that layer on;
   - this site: canton outlines (static/switzerland/cantons.json) and the facts of data/switzerland.yaml. */
const app = document.getElementById('ch-app');
const $ = (id) => document.getElementById(id);
const WMTS = 'https://wmts.geo.admin.ch/1.0.0/';
const API = 'https://api3.geo.admin.ch/rest/services/';
const ATTR = '© <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener noreferrer">swisstopo</a>';
const ATTR_SLF = '© <a href="https://www.slf.ch/" target="_blank" rel="noopener noreferrer">SLF</a>';
/* Switzerland's rectangle (5.956 to 10.492 E, 45.818 to 47.808 N) and 200 km around it on every side: 200 km is
   1.80° of latitude and, at 46.8° N, 2.62° of longitude. The map pans within AREA and asks for tiles only there. */
const AREA = [3.33, 44.02, 13.12, 49.61];
const BOUNDS = AREA;
const BASES = {
    map: { name: 'National map', layer: 'ch.swisstopo.pixelkarte-farbe', ext: 'jpeg', max: 18 },
    aerial: { name: 'Aerial photo', layer: 'ch.swisstopo.swissimage', ext: 'jpeg', max: 19 },
    relief: { name: 'Relief', layer: 'ch.swisstopo.swissalti3d-reliefschattierung', ext: 'png', max: 17 }
};
/* the swisstopo overlays (raster, all up to zoom 17), drawn in this order above the base map */
const RASTERS = {
    slopes: 'ch.swisstopo.hangneigung-ueber_30',
    glaciers: 'ch.swisstopo.geologie-gletscherausdehnung',
    trails: 'ch.swisstopo.swisstlm3d-wanderwege',
    ski: 'ch.swisstopo-karto.skitouren',
    snowshoe: 'ch.swisstopo-karto.schneeschuhrouten'
};
const FIRST_YEAR = 1844, LAST_YEAR = 2021;
const PEAK_LAYERS = ['peaks-1', 'peaks-2', 'peaks-3'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const facts = (() => { try { return JSON.parse($('ch-facts-data').textContent); } catch (e) { return { cantons: {}, glaciers: {} }; } })();

let ml = null, mapA = null, mapB = null;
let base = 'map', compare = null /* null | 'time' */, year = 1900;
let threeD = false, terrainSpec = null, split = 0.5;
let mode = null; /* null | 'profile': a tool that takes the map's clicks */
const onLoad = []; /* parts that need the loaded map add a function here */

function status(text) {
    const s = $('ch-status');
    s.textContent = text || '';
    s.hidden = !text;
}
let toastTimer = null;
function toast(text, ms) {
    const t = $('ch-toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2600);
}
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}
function row(dl, k, v) {
    const d = el('div');
    d.append(el('dt', null, k), el('dd', null, v));
    dl.appendChild(d);
}
const fmt = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* WGS84 and the Swiss LV95 grid, swisstopo's approximate formulas (about 1 m off, enough for profiles and pins) */
function toLV95(lon, lat) {
    const p = (lat * 3600 - 169028.66) / 10000, l = (lon * 3600 - 26782.5) / 10000;
    return [2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l * l * l,
            1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p * p * p];
}
function fromLV95(e, n) {
    const y = (e - 2600000) / 1e6, x = (n - 1200000) / 1e6;
    const l = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
    const p = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.014 * x * x * x;
    return [l * 100 / 36, p * 100 / 36];
}

function rasterSource(key, time) {
    const b = BASES[key];
    return { type: 'raster', tileSize: 256, maxzoom: b.max, bounds: BOUNDS, attribution: ATTR,
             tiles: [WMTS + b.layer + '/default/' + (time || 'current') + '/3857/{z}/{x}/{y}.' + b.ext] };
}
function oldSource(y) {
    return { type: 'raster', tileSize: 256, maxzoom: 16, bounds: BOUNDS, attribution: ATTR,
             tiles: [WMTS + 'ch.swisstopo.zeitreihen/default/' + y + '1231/3857/{z}/{x}/{y}.png'] };
}
function overlaySource(layer) {
    return { type: 'raster', tileSize: 256, maxzoom: 17, bounds: BOUNDS, attribution: ATTR,
             tiles: [WMTS + layer + '/default/current/3857/{z}/{x}/{y}.png'] };
}
const EMPTY = { type: 'FeatureCollection', features: [] };

/* the first map. Layers, bottom to top: base map; slopes, glaciers, avalanche danger; trails and winter routes;
   cantons (an invisible fill for tapping, a thin outline, the chosen one in red); the profile line; summits; pins */
function styleA() {
    const sources = {
        base: rasterSource(base),
        cantons: { type: 'geojson', data: app.dataset.cantons },
        swiss: { type: 'vector', url: 'https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/tiles.json' },
        avalanche: { type: 'geojson', data: EMPTY, attribution: ATTR_SLF },
        profile: { type: 'geojson', data: EMPTY },
        pin: { type: 'geojson', data: EMPTY }
    };
    Object.keys(RASTERS).forEach((k) => { sources[k] = overlaySource(RASTERS[k]); });
    const hidden = { visibility: 'none' };
    return {
        version: 8,
        glyphs: 'https://vectortiles.geo.admin.ch/fonts/{fontstack}/{range}.pbf',
        sources,
        layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#e9edf1' } },
            { id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 150 } },
            { id: 'slopes', type: 'raster', source: 'slopes', layout: hidden, paint: { 'raster-opacity': 0.6 } },
            { id: 'glaciers', type: 'raster', source: 'glaciers', layout: hidden, paint: { 'raster-opacity': 0.75 } },
            { id: 'avalanche', type: 'fill', source: 'avalanche', layout: hidden,
              paint: { 'fill-color': ['match', ['get', 'level'], 1, '#ccff66', 2, '#ffff00', 3, '#ff9900', 4, '#ff0000', 5, '#7a0000', '#d1d5db'],
                       'fill-opacity': 0.5, 'fill-outline-color': 'rgba(60,60,60,0.5)' } },
            { id: 'trails', type: 'raster', source: 'trails', minzoom: 10, layout: hidden, paint: { 'raster-opacity': 0.9 } },
            { id: 'ski', type: 'raster', source: 'ski', layout: hidden },
            { id: 'snowshoe', type: 'raster', source: 'snowshoe', layout: hidden },
            { id: 'canton-fill', type: 'fill', source: 'cantons', paint: { 'fill-color': '#d52b1e', 'fill-opacity': 0 } },
            { id: 'canton-line', type: 'line', source: 'cantons', maxzoom: 11,
              paint: { 'line-color': '#ffffff', 'line-opacity': 0.75, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 10, 2] } },
            { id: 'canton-hi', type: 'line', source: 'cantons', filter: ['==', ['get', 'code'], ''],
              paint: { 'line-color': '#d52b1e', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2.5, 12, 4] } },
            { id: 'profile-line', type: 'line', source: 'profile', filter: ['==', ['geometry-type'], 'LineString'],
              layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#d52b1e', 'line-width': 4 } },
            { id: 'profile-pts', type: 'circle', source: 'profile', filter: ['==', ['geometry-type'], 'Point'],
              paint: { 'circle-radius': ['case', ['==', ['get', 'kind'], 'cursor'], 7, 5], 'circle-color': ['case', ['==', ['get', 'kind'], 'cursor'], '#1f2937', '#ffffff'],
                       'circle-stroke-color': '#d52b1e', 'circle-stroke-width': 3 } },
            peakLayer('peaks-1', 1, 7.5),
            peakLayer('peaks-2', 2, 10),
            peakLayer('peaks-3', 99, 12),
            { id: 'pin', type: 'circle', source: 'pin',
              paint: { 'circle-radius': 8, 'circle-color': '#d52b1e', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } }
        ]
    };
}
function peakLayer(id, maxRank, minzoom) {
    return {
        id, type: 'symbol', source: 'swiss', 'source-layer': 'mountain_peak', minzoom,
        filter: ['all', ['has', 'ele'], ['<=', ['coalesce', ['get', 'rank'], 99], maxRank]],
        layout: {
            'text-field': ['format', '▲ ', { 'font-scale': 0.7 }, ['coalesce', ['get', 'name:latin'], ['get', 'name']], {}, '\n', {}, ['to-string', ['get', 'ele']], { 'font-scale': 0.8 }, ' m', { 'font-scale': 0.8 }],
            'text-font': ['Frutiger Neue Italic'], 'text-size': 13, 'text-anchor': 'top', 'text-offset': [0, -0.4],
            'text-max-width': 9, 'text-padding': 4
        },
        paint: { 'text-color': '#3b2f2a', 'text-halo-color': 'rgba(255,255,255,0.92)', 'text-halo-width': 1.6 }
    };
}

function loadCss(url) {
    return new Promise((ok, fail) => {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = url; l.onload = ok; l.onerror = fail;
        document.head.appendChild(l);
    });
}

async function start() {
    status('Loading the map…');
    try {
        const engine = app.dataset.maplibre;
        const [mod] = await Promise.all([import(engine + 'maplibre-gl.mjs'), loadCss(engine + 'maplibre-gl.css')]);
        ml = mod.default && mod.default.Map ? mod.default : mod;
    } catch (e) {
        status('The map could not be loaded. Check your connection and reload the page.');
        return;
    }
    const view = readHash();
    try {
        mapA = new ml.Map({
            container: 'ch-map-a', style: styleA(),
            ...(view ? { center: view.center, zoom: view.zoom, bearing: view.bearing, pitch: view.pitch }
                     : { bounds: [[5.96, 45.82], [10.49, 47.81]], fitBoundsOptions: { padding: 24 } }),
            minZoom: 6.5, maxZoom: 19, maxPitch: 80,
            maxBounds: [[AREA[0], AREA[1]], [AREA[2], AREA[3]]], attributionControl: { compact: true },
            // sharp enough on every screen, without drawing three times as many pixels on the sharpest phones
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            canvasContextAttributes: { antialias: true }
        });
    } catch (e) {
        status('Your browser cannot draw this map (WebGL is off or not supported).');
        return;
    }
    mapA.addControl(new ml.NavigationControl({ visualizePitch: true }), 'bottom-right');
    mapA.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-right');
    mapA.addControl(new ml.GeolocateControl({ trackUserLocation: false }), 'bottom-right');
    mapA.on('error', () => { /* a missing tile is not worth a message */ });
    mapA.on('click', onClick);
    mapA.on('mousemove', onHover);
    mapA.on('move', syncB);
    mapA.once('load', () => {
        status('');
        onLoad.forEach((f) => f(view));
    });
    wire();
}

/* the base map: a new raster source under everything else */
function setBase(key) {
    if (!BASES[key] || key === base) return;
    base = key;
    document.querySelectorAll('.ch-base').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.base === key)));
    mapA.removeLayer('base');
    mapA.removeSource('base');
    mapA.addSource('base', rasterSource(key));
    mapA.addLayer({ id: 'base', type: 'raster', source: 'base' }, 'slopes');
    if (sunOn) applySun();
    if (compare) labels();
    writeHash();
}

/* the dock at the bottom centre holds one panel at a time: the year (Then and now), the sun or the profile */
const docks = {};
function dock(id) {
    Object.keys(docks).forEach((k) => { if (k !== id && docks[k].open()) docks[k].close(); });
}
