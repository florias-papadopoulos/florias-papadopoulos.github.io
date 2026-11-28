/* The Switzerland page (layouts/switzerland/list.html): a full-screen live map of Switzerland, drawn by MapLibre GL
   (static/engines/maplibre-gl-*, loaded from this site only after the visitor agreed: the flag's question, kept in
   localStorage or sessionStorage 'ch-maps-ok' by assets/js/site/flag.js, or the same question on this page).

   This file is part 00 of a few numbered parts in assets/js/switzerland/, joined in order into one module by
   layouts/switzerland/list.html (they share one scope; see README.md there). Here: the constants, the shared state,
   small helpers and the first map's style. Data, all official and free to use with the source named:
   - swisstopo (wmts.geo.admin.ch): five base maps, hiking trails, slopes over 30°, ski touring and snowshoe routes,
     glacier extents 1850 to 2016, the old maps of "Journey through time";
   - swisstopo's vector data, read once into small files of this site: summit names and heights, towns, the border
     (static/switzerland/peaks.json, towns.json, border.json); the fonts of the labels (vectortiles.geo.admin.ch);
   - swisstopo (3d.geo.admin.ch): the terrain model for 3D;
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
/* the big caves (data/switzerland.yaml, caves): a cave mouth, the name from closer in; added with the airports */
const CAVE_LAYERS = [
    { id: 'caves', type: 'symbol', source: 'caves', layout: { 'icon-image': 'cave', 'icon-allow-overlap': true, 'icon-ignore-placement': true } },
    { id: 'caves-label', type: 'symbol', source: 'caves', minzoom: 9,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 12, 'text-max-width': 10,
                'text-variable-anchor': ['left', 'right'], 'text-radial-offset': 1.2, 'text-justify': 'auto' },
      paint: { 'text-color': '#3b2f2a', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.5 } }
];
/* the airports (added once their plane is drawn, see start) */
const AIRPORT_LAYER = { id: 'airports', type: 'symbol', source: 'airports',
              layout: { 'icon-image': 'plane', 'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true } };
const PEAK_LAYERS = ['peaks'];
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
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);   /* never a key of Object.prototype */
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
    // no bounds: swisstopo's maps reach beyond the border, so the zoomed-out view has no blank corners
    return { type: 'raster', tileSize: 256, maxzoom: b.max, attribution: ATTR,
             tiles: [WMTS + b.layer + '/default/' + (time || 'current') + '/3857/{z}/{x}/{y}.' + b.ext] };
}
function oldSource(y) {
    // the old maps cover Switzerland only: asking beyond it gets errors (400)
    return { type: 'raster', tileSize: 256, maxzoom: 16, bounds: [5.6, 45.6, 10.8, 48.0], attribution: ATTR,
             tiles: [WMTS + 'ch.swisstopo.zeitreihen/default/' + y + '1231/3857/{z}/{x}/{y}.png'] };
}
function overlaySource(layer) {
    return { type: 'raster', tileSize: 256, maxzoom: 17, bounds: BOUNDS, attribution: ATTR,
             tiles: [WMTS + layer + '/default/current/3857/{z}/{x}/{y}.png'] };
}
const EMPTY = { type: 'FeatureCollection', features: [] };
/* towns the overview maps leave out but visitors look for: labelled like the map's own big towns when zoomed out
   (positions are swisstopo's own label points, vector tiles layer place) */
const FEATURED_NAMES = ['St. Gallen', 'Luzern', 'Lugano', 'Chur', 'Sion', 'Interlaken', 'Zermatt', 'St. Moritz'];
const FEATURED = { type: 'FeatureCollection', features: [
    ['St. Gallen', 9.3734, 47.4239], ['Luzern', 8.3068, 47.0523], ['Lugano', 8.9512, 46.0052], ['Chur', 9.5314, 46.8523],
    ['Sion', 7.3606, 46.2331], ['Interlaken', 7.8543, 46.6849], ['Zermatt', 7.7473, 46.0221], ['St. Moritz', 9.8388, 46.4976]
].map(([name, lon, lat]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, abroad: false, big: false } }))
  /* and the big cities around Switzerland, in grey: positions from Natural Earth's populated places (public domain),
     names as written there locally; big = over a million people (larger lettering) */
  .concat([
    ['Milano', 9.2031, 45.4719, 1], ['Torino', 7.668, 45.0723, 1], ['München', 11.573, 48.1319, 1], ['Lyon', 4.8281, 45.772, 1],
    ['Stuttgart', 9.2, 48.78, 1], ['Genova', 8.93, 44.41, 0], ['Verona', 10.99, 45.4404, 0], ['Bergamo', 9.67, 45.7004, 0],
    ['Como', 9.08, 45.81, 0], ['Aosta', 7.315, 45.737, 0], ['Trento', 11.12, 46.0804, 0], ['Bolzano', 11.36, 46.5004, 0],
    ['Innsbruck', 11.41, 47.2804, 0], ['Bregenz', 9.7667, 47.5167, 0], ['Vaduz', 9.5167, 47.1337, 0], ['Freiburg', 7.8699, 48.0004, 0],
    ['Strasbourg', 7.75, 48.58, 0], ['Mulhouse', 7.35, 47.7504, 0], ['Besançon', 6.03, 47.23, 0], ['Annecy', 6.1167, 45.9, 0],
    ['Grenoble', 5.72, 45.1804, 0], ['Dijon', 5.03, 47.3304, 0], ['Ulm', 10.0, 48.4004, 0], ['Augsburg', 10.9, 48.35, 0]
  ].map(([name, lon, lat, big]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, abroad: true, big: !!big } }))) };
/* the airports with scheduled flights: positions from swisstopo's aerodrome data (vector tiles, layer aerodrome_label,
   class international; its overview levels have no airports, so they are listed here); Basel's EuroAirport lies in
   France and is placed from its published position. A plane only, no lettering, so the towns' names stay readable;
   a tap names the airport. */
const AIRPORTS = { type: 'FeatureCollection', features: [
    ['ZRH', 'Zürich Airport', 8.5517, 47.4586], ['GVA', 'Geneva Airport', 6.1081, 46.2375], ['BSL', 'EuroAirport Basel Mulhouse Freiburg', 7.529, 47.5896]
].map(([code, name, lon, lat]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { code, name } })) };

/* the first map. Layers, bottom to top: base map; slopes, glaciers, avalanche danger; trails and winter routes;
   cantons (an invisible fill for tapping and the chosen one outlined in red; the maps draw the borders themselves); the profile line; summits; pins */
function styleA() {
    const sources = {
        base: rasterSource(base),
        cantons: { type: 'geojson', data: app.dataset.cantons },
        // summits, towns and the border from small files of this site (tools/swiss-map/make_labels.py and make_map.py),
        // not swisstopo's vector tiles, which carry every road and field and cost megabytes a view
        peaks: { type: 'geojson', data: EMPTY },
        towns: { type: 'geojson', data: EMPTY },
        border: { type: 'geojson', data: app.dataset.border },
        avalanche: { type: 'geojson', data: EMPTY, attribution: ATTR_SLF },
        profile: { type: 'geojson', data: EMPTY },
        pin: { type: 'geojson', data: EMPTY },
        pin2: { type: 'geojson', data: EMPTY },
        featured: { type: 'geojson', data: FEATURED },
        airports: { type: 'geojson', data: AIRPORTS },
        caves: { type: 'geojson', data: { type: 'FeatureCollection', features: (facts.caves || []).map((c, i) => ({
            type: 'Feature', geometry: { type: 'Point', coordinates: [+c.lon, +c.lat] }, properties: { i, name: String(c.name) } })) } }
    };
    Object.keys(RASTERS).forEach((k) => { sources[k] = overlaySource(RASTERS[k]); });
    const hidden = { visibility: 'none' };
    return {
        version: 8,
        glyphs: 'https://vectortiles.geo.admin.ch/fonts/{fontstack}/{range}.pbf',
        sources,
        layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#f1f2ef' } },
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
            { id: 'canton-hi', type: 'line', source: 'cantons', filter: ['==', ['get', 'code'], ''],
              paint: { 'line-color': '#d52b1e', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2.5, 12, 4] } },
            { id: 'profile-line', type: 'line', source: 'profile', filter: ['==', ['geometry-type'], 'LineString'],
              layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#d52b1e', 'line-width': 4 } },
            { id: 'profile-pts', type: 'circle', source: 'profile', filter: ['==', ['geometry-type'], 'Point'],
              paint: { 'circle-radius': ['case', ['==', ['get', 'kind'], 'cursor'], 7, 5], 'circle-color': ['case', ['==', ['get', 'kind'], 'cursor'], '#1f2937', '#ffffff'],
                       'circle-stroke-color': '#d52b1e', 'circle-stroke-width': 3 } },
            // on the aerial photo and the relief, which have no lettering of their own: the borders and the towns,
            // from swisstopo's vector data (the national map draws these itself)
            { id: 'bnd-canton', type: 'line', source: 'cantons', layout: { visibility: base === 'map' ? 'none' : 'visible', 'line-join': 'round' },
              paint: { 'line-color': 'rgba(255,255,255,0.85)', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 12, 1.8], 'line-dasharray': [3, 2] } },
            { id: 'bnd-country', type: 'line', source: 'border', layout: { visibility: base === 'map' ? 'none' : 'visible', 'line-join': 'round' },
              paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1.6, 12, 3.2] } },
            { id: 'towns', type: 'symbol', source: 'towns', layout: { visibility: base === 'map' ? 'none' : 'visible',
              'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-letter-spacing': 0.02,
              'text-size': ['interpolate', ['linear'], ['zoom'], 7, ['match', ['get', 'class'], 'city', 13, 11], 12, ['match', ['get', 'class'], 'city', 17, 'town', 15, 13]],
              'text-padding': 6, 'symbol-sort-key': ['match', ['get', 'class'], 'city', 0, 'town', 1, 2] },
              filter: ['all', ['!', ['in', ['get', 'name'], ['literal', FEATURED_NAMES]]],
                       ['step', ['zoom'], ['==', ['get', 'class'], 'city'], 9, ['match', ['get', 'class'], ['city', 'town'], true, false], 11.5, ['match', ['get', 'class'], ['city', 'town', 'village'], true, false]]],
              paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(17,24,39,0.75)', 'text-halo-width': 1.4 } },
            // the national map: dark bold like its own towns, only at the overview scales where it leaves these out
            { id: 'featured-map', type: 'symbol', source: 'featured', maxzoom: 8.6, layout: { visibility: base === 'map' ? 'visible' : 'none',
              'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['get', 'big'], 13, ['get', 'abroad'], 11, 13], 8.6, ['case', ['get', 'big'], 17, ['get', 'abroad'], 14, 17]],
              'text-letter-spacing': 0.02, 'text-variable-anchor': ['center', 'left', 'right'], 'text-radial-offset': 0.4 },
              paint: { 'text-color': ['case', ['get', 'abroad'], '#5b6470', '#16181d'], 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.6 } },
            // the aerial photo and the relief: white like the other names there, at every zoom
            { id: 'featured-photo', type: 'symbol', source: 'featured', layout: { visibility: base === 'map' ? 'none' : 'visible',
              'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['get', 'abroad'], 11, 13], 12, ['case', ['get', 'abroad'], 14, 17]],
              'text-letter-spacing': 0.02, 'text-variable-anchor': ['center', 'left', 'right'], 'text-radial-offset': 0.4 },
              paint: { 'text-color': ['case', ['get', 'abroad'], '#e5e7eb', '#ffffff'], 'text-halo-color': 'rgba(17,24,39,0.8)', 'text-halo-width': 1.5 } },
            { id: 'profile-cursor', type: 'circle', source: 'pin2',
              paint: { 'circle-radius': 7, 'circle-color': '#1f2937', 'circle-stroke-color': '#d52b1e', 'circle-stroke-width': 3 } },
            // on the national map, which names the summits itself: invisible dots, so a tap still opens a summit's card
            { id: 'peaks-hit', type: 'circle', source: 'peaks', minzoom: 9, filter: ['<=', ['get', 'rank'], ['step', ['zoom'], 2, 11, 3, 12.5, 99]],
              layout: { visibility: base === 'map' ? 'visible' : 'none' }, paint: { 'circle-radius': 12, 'circle-opacity': 0 } },
            peakLayer('peaks', 7.5),
            { id: 'pin', type: 'circle', source: 'pin',
              paint: { 'circle-radius': 8, 'circle-color': '#d52b1e', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } }
        ]
    };
}
/* one layer for all summits: the highest ranks from far out, more as the map comes closer, placed in rank order */
function peakLayer(id, minzoom) {
    return {
        id, type: 'symbol', source: 'peaks', minzoom,
        filter: ['<=', ['get', 'rank'], ['step', ['zoom'], 1, 10, 2, 11, 3, 12.5, 99]],
        layout: { visibility: base === 'map' ? 'none' : 'visible', 'symbol-sort-key': ['get', 'rank'],
            'text-field': ['format', '▲ ', { 'font-scale': 0.7 }, ['get', 'name'], {}, '\n', {}, ['to-string', ['get', 'ele']], { 'font-scale': 0.8 }, ' m', { 'font-scale': 0.8 }],
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
    // a shared link starts with its own map (3D is the aerial photo), not the national map first
    if (view) base = view.threeD ? 'aerial' : view.base;
    try {
        mapA = new ml.Map({
            container: 'ch-map-a', style: styleA(),
            ...(view ? { center: view.center, zoom: view.zoom, bearing: view.bearing, pitch: view.pitch }
                     : { bounds: [[5.96, 45.82], [10.49, 47.81]], fitBoundsOptions: { padding: 24 } }),
            // low enough that the whole country fits a phone held upright
            minZoom: 5.6, maxZoom: 19, maxPitch: 80,
            maxBounds: [[AREA[0], AREA[1]], [AREA[2], AREA[3]]],
            // the sources are named under the title instead (#ch-credits, part 30), so the corner stays free
            attributionControl: false,
            // sharp enough on every screen, without drawing three times as many pixels on the sharpest phones
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            canvasContextAttributes: { antialias: true }
        });
    } catch (e) {
        status('Your browser cannot draw this map (WebGL is off or not supported).');
        return;
    }
    // bottom right, bottom to top: the sources, the scale, the controls (MapLibre stacks a corner's controls itself)
    mapA.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-right');
    mapA.addControl({ onAdd: () => $('ch-credits'), onRemove: () => {} }, 'bottom-right');
    mapA.addControl({ onAdd: () => $('ch-pad'), onRemove: () => {} }, 'bottom-right');
    mapA.on('error', () => { /* a missing tile is not worth a message */ });
    mapA.on('click', onClick);
    mapA.on('mousemove', onHover);
    mapA.on('move', syncB);
    // the summits and towns, loaded alongside the map's first tiles
    const labelData = Promise.all(['peaks', 'towns'].map((k) => fetch(app.dataset[k]).then((r) => r.ok ? r.json() : []).catch(() => [])));
    mapA.once('load', () => {
        // the airports' plane: drawn once on a small canvas (a white disc with a navy plane), then their layer
        const r = 2, c = document.createElement('canvas'), sz = 22 * r;
        c.width = c.height = sz;
        const g = c.getContext('2d');
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sz / 2, sz / 2, sz / 2 - r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(30,58,138,0.35)'; g.lineWidth = r; g.stroke();
        g.fillStyle = '#1e3a8a'; g.translate(sz / 2, sz / 2); g.scale(r * 0.62, r * 0.62);
        g.fill(new Path2D('M0 -11 C1.4 -11 2 -9.6 2 -8.3 V-3 L10 2 V4.3 L2 1.8 V7 L4.5 9 V10.8 L0 9.6 L-4.5 10.8 V9 L-2 7 V1.8 L-10 4.3 V2 L-2 -3 V-8.3 C-2 -9.6 -1.4 -11 0 -11 Z'));
        mapA.addImage('plane', g.getImageData(0, 0, sz, sz), { pixelRatio: r });
        mapA.addLayer(AIRPORT_LAYER, 'peaks-hit');
        // the caves' symbol: a white disc with a dark brown cave mouth
        const c2 = document.createElement('canvas');
        c2.width = c2.height = sz;
        const h = c2.getContext('2d');
        h.fillStyle = '#ffffff'; h.beginPath(); h.arc(sz / 2, sz / 2, sz / 2 - r, 0, Math.PI * 2); h.fill();
        h.strokeStyle = 'rgba(59,47,42,0.4)'; h.lineWidth = r; h.stroke();
        h.fillStyle = '#5b4636'; h.translate(sz / 2, sz / 2); h.scale(r * 0.62, r * 0.62);
        h.fill(new Path2D('M-11 7 L-6 -4 L-2 -8 L3 -7 L7 -2 L11 7 Z'));
        h.fillStyle = '#1b130e'; h.fill(new Path2D('M-5 7 C-5 1 -2.5 -2 0 -2 C2.5 -2 5 1 5 7 Z'));
        mapA.addImage('cave', h.getImageData(0, 0, sz, sz), { pixelRatio: r });
        CAVE_LAYERS.forEach((l) => mapA.addLayer({ ...l, layout: { ...l.layout, visibility: layerOn.caves === false ? 'none' : 'visible' } }, 'peaks-hit'));
        labelData.then(([peaks, towns]) => {
            const pt = (rows, props) => ({ type: 'FeatureCollection', features: rows.map((r) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r[0], r[1]] }, properties: props(r) })) });
            mapA.getSource('peaks').setData(pt(peaks, (r) => ({ name: r[2], ele: r[3], rank: r[4] })));
            mapA.getSource('towns').setData(pt(towns, (r) => ({ name: r[2], class: r[3] })));
        });
        status('');
        onLoad.forEach((f) => f(view));
    });
    wire();
}

/* summits: written on the aerial photo and the relief; on the national map (which writes them itself) only tappable */
function peakVisibility() {
    const on = layerOn.peaks !== false;
    PEAK_LAYERS.forEach((id) => mapA.setLayoutProperty(id, 'visibility', on && base !== 'map' ? 'visible' : 'none'));
    mapA.setLayoutProperty('peaks-hit', 'visibility', on && base === 'map' ? 'visible' : 'none');
}
/* the base map: a new raster source under everything else */
function setBase(key) {
    if (!own(BASES, key) || key === base) return;
    if (threeD && key !== 'aerial') return;   // 3D shows the aerial photo only (the other pictures are greyed out)
    base = key;
    document.querySelectorAll('.ch-base').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.base === key)));
    mapA.removeLayer('base');
    mapA.removeSource('base');
    mapA.addSource('base', rasterSource(key));
    mapA.addLayer({ id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 150 } }, mapA.getLayer('sun-shade') ? 'sun-shade' : 'slopes');
    ['bnd-canton', 'bnd-country', 'towns', 'featured-photo'].forEach((id) => mapA.setLayoutProperty(id, 'visibility', key === 'map' ? 'none' : 'visible'));
    mapA.setLayoutProperty('featured-map', 'visibility', key === 'map' ? 'visible' : 'none');
    peakVisibility();
    if (sunOn) applySun();
    if (compare) labels();
    writeHash();
}

/* The modes: 3D (with the sun inside it), Then and now and Profile. Only one at a time: turning one on turns the others
   off, so 3D is never mixed with an old flat map or a profile. Each mode registers how to tell it is on and how to
   turn it off. */
const modes = {};
const CLASH = { '3d': ['time'], time: ['3d', 'profile'], profile: ['time'] };
function only(id) {
    (CLASH[id] || []).forEach((k) => { if (modes[k] && modes[k].on()) modes[k].off(); });
}
/* Which tools go together. A tool that would make a poor pair with the mode that is on is greyed out (its tooltip
   says why), instead of switching that mode off behind the visitor's back:
   3D (and the sun inside it): no Then and now, and the aerial photo only;
   Then and now: no 3D, no sun, no profile, no layers (part 30, lockLayers);
   Profile: no Then and now. The profile and the layers go with 3D. */
function dis(id, off, why) {
    const b = $(id);
    if (!b) return;
    if (!b.dataset.title) b.dataset.title = b.title;
    b.disabled = off;
    b.title = off ? why : b.dataset.title;
}
function tools() {
    const t = compare === 'time', p = mode === 'profile', d = threeD || pending3D;
    const whyT = 'Not with Then and now: close it first', whyP = 'Not while drawing a profile: close it first', why3 = 'Not in 3D: turn 3D off first';
    dis('ch-3d', t || (pending3D && !threeD), t ? whyT : 'Loading the mountains…');
    dis('ch-sun', t, whyT);
    dis('ch-time', d || p, d ? why3 : whyP);
    dis('ch-profile', t, whyT);
    document.querySelectorAll('.ch-base').forEach((b) => {
        const off = d && b.dataset.base !== 'aerial';
        b.disabled = off;
        b.title = off ? '3D shows the aerial photo only' : '';
    });
}
/* the left column holds one sheet at a time: the facts or the layers */
function sheet(id, open) {
    ['ch-facts', 'ch-layers'].forEach((s) => {
        const on = s === id ? open : false;
        $(s).hidden = !on;
        const b = $(s === 'ch-facts' ? 'ch-facts-btn' : 'ch-layers-btn');
        b.setAttribute('aria-expanded', String(on));
    });
}
function compass() {
    if (mapA) $('ch-pad-north').hidden = !(threeD || Math.abs(mapA.getBearing()) > 0.5);
}
/* zoom and north */
function wireControls() {
    $('ch-zoom-in').addEventListener('click', () => mapA.zoomIn());
    $('ch-zoom-out').addEventListener('click', () => mapA.zoomOut());
    $('ch-pad-north').addEventListener('click', () => mapA.easeTo({ bearing: 0, pitch: threeD ? mapA.getPitch() : 0, duration: reduced ? 0 : 600 }));
    // the compass shows only when it means something: in 3D, or when the map has been turned
    const needle = document.querySelector('.ch-needle');
    mapA.on('rotate', () => { needle.style.transform = 'rotate(' + (-mapA.getBearing()) + 'deg)'; compass(); });
    compass();
}
