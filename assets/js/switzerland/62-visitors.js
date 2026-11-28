/* Part 62: Visitors, the page's main view, for people visiting St. Gallen: St. Gallen is the base of every trip.
   A sheet (open at the start, or the sun-and-mountain icon) with four tabs:
   - Places (data/switzerland.yaml, guests): grouped by the time it takes from St. Gallen station; chips that turn the
     six kinds and the four time groups off and on, one for a rainy day; switches for the pins, "open this month" and
     the Ostwind area (static/switzerland/ostwind.json, tools/swiss-map/make_ostwind.py). A place opens a panel at the
     bottom (#ch-place) with the next train from St. Gallen (transport.opendata.ch),
     the forecast there (Open-Meteo), and for hikes the line of the walk (static/switzerland/visitor-routes.json,
     tools/swiss-map/make_visitor_routes.py). A star puts a place on "My plan".
   - My plan: the starred places (kept in this browser, localStorage 'ch-plan'), sent as a link (#plan=id,id) that
     shows only those places; a single place has a link too (#visitors/id).
   - Travel: the trains from Zurich Airport (drawn stop by stop) and the day tickets.
   - Now: the next departures from St. Gallen and the weather in St. Gallen (MeteoSwiss).
   The pins are on from the start and stay when the sheet closes (Layers, Visitor places). The map is not moved
   when the sheet opens. */
const guests = facts.guests || { places: [], tickets: [] };
const KINDS = guests.kinds || [];
const PLACES = guests.places || [];
const kindOf = (p) => (Array.isArray(p.kinds) && p.kinds[0]) || '';
const kindColour = (id) => { const k = KINDS.find((x) => x.id === id); return k ? String(k.colour) : '#d52b1e'; };
const placeIndex = (id) => PLACES.findIndex((p) => String(p.id) === id);
/* the pictograms of the kinds, a rainy day and the train: Maki by Mapbox (CC0, public domain), 15 x 15 */
const PICTOS = {walk: 'M14,5.75c0.0113-0.6863-0.3798-1.3159-1-1.61C12.9475,3.4906,12.4014,2.9926,11.75,3 c-0.0988,0.0079-0.1962,0.0281-0.29,0.06c-0.0607-0.66-0.6449-1.1458-1.3048-1.0851C9.8965,1.9987,9.6526,2.1058,9.46,2.28l0,0 c0-0.6904-0.5596-1.25-1.25-1.25S6.96,1.5896,6.96,2.28C6.96,2.28,7,2.3,7,2.33C6.4886,1.8913,5.7184,1.9503,5.2797,2.4618 C5.1316,2.6345,5.0347,2.8451,5,3.07C4.8417,3.0195,4.6761,2.9959,4.51,3C3.6816,2.9931,3.0044,3.659,2.9975,4.4874 C2.9958,4.6872,3.0341,4.8852,3.11,5.07C2.3175,5.2915,1.8546,6.1136,2.0761,6.9061C2.2163,7.4078,2.6083,7.7998,3.11,7.94 c0.2533,0.7829,1.0934,1.2123,1.8763,0.959C5.5216,8.7258,5.9137,8.2659,6,7.71C6.183,7.8691,6.4093,7.9701,6.65,8v5L5,14h5l-1.6-1 v-2c0.7381-0.8915,1.6915-1.5799,2.77-2c0.8012,0.1879,1.603-0.3092,1.7909-1.1103C12.9893,7.7686,13.0025,7.6444,13,7.52 c0.0029-0.0533,0.0029-0.1067,0-0.16C13.6202,7.0659,14.0113,6.4363,14,5.75z M8.4,10.26V6.82C8.6703,7.3007,9.1785,7.5987,9.73,7.6 h0.28c0.0156,0.4391,0.2242,0.849,0.57,1.12C9.7643,9.094,9.0251,9.6162,8.4,10.26z', hike: 'm7.5 1c-.3 0-.4.2-.6.4l-5.8 9.5c-.1.1-.1.3-.1.4 0 .5.4.7.7.7h11.6c.4 0 .7-.2.7-.7 0-.2 0-.2-.1-.4l-5.7-9.5c-.2-.2-.4-.4-.7-.4zm0 1.5 3.3 5.5h-.8l-1.5-1.5-1 1.5-1-1.5-1.5 1.5h-.9z', winter: 'M15,4.5C15,5.3284,14.3284,6,13.5,6S12,5.3284,12,4.5S12.6716,3,13.5,3S15,3.6716,15,4.5z M13.72,11.89 c-0.0623-0.1197-0.2083-0.1684-0.33-0.11c-0.6846,0.4194-1.5208,0.5111-2.28,0.25L4.78,8.86L7.5,7.5v-3L9,5.25v3L10.5,9L12,8.25 L10.5,7.5V3l-3-1.5L6,2.25v4.5L3.28,8.11L0.61,6.78C0.4857,6.7192,0.3358,6.7707,0.275,6.895C0.2142,7.0193,0.2657,7.1692,0.39,7.23 l10.5,5.25c0.3156,0.135,0.6568,0.1998,1,0.19c0.5998-0.0103,1.1889-0.161,1.72-0.44c0.1236-0.0615,0.174-0.2116,0.1125-0.3352 C13.7217,11.8932,13.7208,11.8916,13.72,11.89z', family: 'M8.3879,3.8928C8.3879,3.8928,7.6818,5,7,5H4.5C3.8182,5,3.2016,5.4086,2.7273,5.8636L0.5,8C0.231,8.258,0.0072,8.7681,0,9 c-0.0156,0.5,0,1,0,1s1,0,1-1V8.5l1-1h0.5l0.158,0.2892c0,0-0.9535,1.8244-0.9535,3.5289C1.7046,12,2.3864,12,2.3864,12h0.6818 c0,0,0.3409,0,0-0.3409l-0.3409-0.3409C2.7273,10.6364,3.5002,9.6667,4,9c0,0,0.0168,1.1579,0,2c-0.008,0.4096,0.2721,1,0.6818,1 h0.6818c0,0,0.3409,0,0-0.3409l-0.3409-0.3409C4.7105,10.7495,5.5,8.5,5.5,8.5C6.7716,8.5,7,9,8.5,9l0.3636,2.3182 C8.975,12.0282,9.5,12,9.5,12H11c0.3409,0,0.9611-0.3115,0.3409-0.7736L11,11V9c1.2142-0.1722,2-1,2-2h1c0.3214,0,1,0,1-0.5v-1 l-1.7045-1.6818C12.5444,3.0772,12,2.5,11,2.5C9.5469,2.5,8.8636,3.0688,8.3879,3.8928z', culture: 'M7.5,0L1,3.5V4h13V3.5L7.5,0z M2,5v5l-1,1.6V13h13v-1.4L13,10V5H2z M4,6h1v5.5H4V6z M7,6h1v5.5H7V6z M10,6h1 v5.5h-1V6z', water: 'M7.5 14C9.57688 14 12 12.7117 12 9.43241C12 7.20724 8.53844 2.2883 7.5 1C6.57691 2.2883 3 7.09007 3 9.43241C3 12.7117 5.42312 14 7.5 14Z', rain: 'M13 2L1 6V8L2 7.66667V13H12V11H4V7L13 4V2Z', rail: 'M 3 1 C 2.4477 1 2 1.4477 2 2 L 2 10 C 2 10.5523 2.4477 11 3 11 L 12 11 C 12.5523 11 13 10.5523 13 10 L 13 2 C 13 1.4477 12.5523 1 12 1 L 3 1 z M 5.75 1.5 L 5.7597656 1.5 L 9.2597656 1.5 C 9.3978656 1.5 9.5097656 1.6119 9.5097656 1.75 C 9.5097656 1.8881 9.3978656 2 9.2597656 2 L 5.75 2 C 5.6119 2 5.5 1.8881 5.5 1.75 C 5.5 1.6119 5.6119 1.5 5.75 1.5 z M 3.5 3 L 7 3 L 7 7 L 3.5 7 C 3.2239 7 3 6.7761 3 6.5 L 3 3.5 C 3 3.2239 3.2239 3 3.5 3 z M 8 3 L 11.5 3 C 11.7761 3 12 3.2239 12 3.5 L 12 6.5 C 12 6.7761 11.7761 7 11.5 7 L 8 7 L 8 3 z M 5 8 C 5.5523 8 6 8.4477 6 9 C 6 9.5523 5.5523 10 5 10 C 4.4477 10 4 9.5523 4 9 C 4 8.4477 4.4477 8 5 8 z M 10 8 C 10.5523 8 11 8.4477 11 9 C 11 9.5523 10.5523 10 10 10 C 9.4477 10 9 9.5523 9 9 C 9 8.4477 9.4477 8 10 8 z M 10.445312 11.994141 C 10.380597 11.999652 10.314981 12.018581 10.253906 12.050781 C 10.030606 12.168381 9.9302313 12.433922 10.019531 12.669922 L 10.189453 13 L 4.8105469 13 L 4.9394531 12.730469 C 5.0371531 12.472169 4.9067375 12.183637 4.6484375 12.085938 C 4.4124375 11.996738 4.1468969 12.097113 4.0292969 12.320312 L 3.0292969 14.320312 C 3.0080969 14.377912 2.9986 14.4387 3 14.5 C 3 14.7761 3.2239 15 3.5 15 C 3.6802 14.999 3.8450875 14.899434 3.9296875 14.740234 L 3.9296875 14.689453 L 4 14.689453 L 4.3105469 14 L 10.689453 14 L 11 14.689453 L 11 14.740234 C 11.0846 14.899434 11.249488 14.999 11.429688 15 C 11.705787 15 11.929688 14.7761 11.929688 14.5 C 11.949587 14.4212 11.949587 14.338566 11.929688 14.259766 L 10.929688 12.259766 C 10.833163 12.076541 10.639459 11.977608 10.445312 11.994141 z', aerialway: 'M13,5H8V2.6c0.1854-0.1047,0.3325-0.2659,0.42-0.46L13.5,1.5C13.7761,1.5,14,1.2761,14,1s-0.2239-0.5-0.5-0.5L8.28,1.15 C8.0954,0.9037,7.8077,0.7562,7.5,0.75C7.0963,0.752,6.7334,0.9966,6.58,1.37L1.5,2C1.2239,2,1,2.2239,1,2.5S1.2239,3,1.5,3 l5.22-0.65C6.7967,2.4503,6.8917,2.5351,7,2.6V5H2C1.4477,5,1,5.4477,1,6v7c0,0.5523,0.4477,1,1,1h11c0.5523,0,1-0.4477,1-1V6 C14,5.4477,13.5523,5,13,5z M7,11H3V7h4V11z M12,11H8V7h4V11z'};
function picto(id, colour, cls) {
    const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path');
    s.setAttribute('viewBox', '0 0 15 15'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'ch-picto' + (cls ? ' ' + cls : ''));
    p.setAttribute('d', PICTOS[id] || PICTOS.walk);
    if (colour) p.setAttribute('fill', colour);
    s.appendChild(p);
    return s;
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const thisMonth = () => new Date().getMonth() + 1;
const isOpen = (p, m) => !Array.isArray(p.months) || p.months.includes(m);
/* minutes as on a timetable: 52 min, 1 h 05, 2 h */
function fmtMins(m) {
    m = Math.round(Number(m) || 0);
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '');
}
/* the list's groups: how long the trip from St. Gallen station takes */
const V_GROUPS = [{ max: 20, name: 'In town' }, { max: 60, name: 'Under 1 hour' }, { max: 119, name: '1 to 2 hours' }, { max: Infinity, name: '2+ hours' }];
const groupOf = (p) => V_GROUPS.findIndex((g) => (Number(p.mins) || 0) <= g.max);
const V_ORDER = PLACES.map((p, i) => i).sort((a, b) => (Number(PLACES[a].mins) || 0) - (Number(PLACES[b].mins) || 0) || a - b);
const kindOff = new Set(), groupOff = new Set();   // the kinds and the time groups turned off (some, or all)
let vRain = false;  // only places good in bad weather
let vOpen = false;  // only what is open this month
let planOnly = null;   // the ids of a plan when only its places are shown (a plan sent as a link opens like this)
const shown = (p) => planOnly ? planOnly.includes(String(p.id)) : (p.kinds || []).some((k) => !kindOff.has(k)) && !groupOff.has(groupOf(p)) && (!vRain || !!p.rain) && (!vOpen || isOpen(p, thisMonth()));
const LINES = new Set(PLACES.filter((p) => p.line).map((p) => String(p.id)));   // the places with a drawn path
function guestFeatures() {
    return PLACES.map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+p.lon, +p.lat] },
        properties: { i, name: String(p.name), colour: kindColour(kindOf(p)), plan: plan.includes(String(p.id)) } })).filter((f) => shown(PLACES[f.properties.i]));
}
let visitorsOn = false, depTimer = null, styleReady = false, ostwindOn = false;   // the Ostwind area only when asked for
onLoad.push(() => { styleReady = true; });

function visitorsLayers() {
    if (mapA.getSource('guests')) return;
    mapA.addSource('ostwind', { type: 'geojson', data: app.dataset.ostwind });
    mapA.addLayer({ id: 'ostwind-fill', type: 'fill', source: 'ostwind', filter: ['==', ['get', 'kind'], 'area'], layout: { visibility: 'none' },
                    paint: { 'fill-color': '#0d9488', 'fill-opacity': 0.16 } }, 'canton-fill');
    mapA.addLayer({ id: 'ostwind-edge', type: 'line', source: 'ostwind', filter: ['==', ['get', 'kind'], 'edge'],
                    layout: { 'line-join': 'round', visibility: 'none' }, paint: { 'line-color': '#0f766e', 'line-width': 2.5, 'line-opacity': 0.9, 'line-dasharray': [3, 2] } }, 'canton-fill');
    showOstwind();
    // every pin at its own place, in its kind's colour; names from closer in
    mapA.addSource('guests', { type: 'geojson', data: { type: 'FeatureCollection', features: guestFeatures() } });
    mapA.addLayer({ id: 'guests-dot', type: 'circle', source: 'guests', layout: { visibility: layerOn.guests ? 'visible' : 'none' },
                    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4.5, 10, 7, 13, 9], 'circle-color': ['get', 'colour'],
                             'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2] } });
    mapA.addLayer({ id: 'guests-ring', type: 'circle', source: 'guests', filter: ['==', ['get', 'plan'], true], layout: { visibility: layerOn.guests ? 'visible' : 'none' },
                    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 8, 10, 11, 13, 13], 'circle-color': 'rgba(0,0,0,0)',
                             'circle-stroke-color': '#d4a017', 'circle-stroke-width': 3 } });
    mapA.addLayer({ id: 'guests-name', type: 'symbol', source: 'guests', minzoom: 10.5,
                    layout: { visibility: layerOn.guests ? 'visible' : 'none', 'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 13, 'text-offset': [0, 1], 'text-anchor': 'top', 'text-padding': 2 },
                    paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 } });
}
function showVisitors(on) {
    // the map's style must be there before layers are added (the link can open the sheet while the map loads)
    if (on && !styleReady) { onLoad.push(() => { if (!$('ch-visitors').hidden) showVisitors(true); }); return; }
    visitorsOn = on;
    // the sheet turns the place pins on; they stay when it closes (Layers, Visitor places, turns them off)
    // (not in Then and now, which keeps the extra layers off until it ends)
    if (on && !layerOn.guests && !layersSaved) setLayer(LAYERS.find((d) => d.id === 'guests'), true);
    if (on) vTab(vCurrent);
    else { clearInterval(depTimer); depTimer = null; }
    writeHash();
}
/* the Ostwind area, shaded only while its switch is on */
function showOstwind() {
    ['ostwind-fill', 'ostwind-edge'].forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', ostwindOn && !layersSaved ? 'visible' : 'none'));
}

/* ---- a hike's line, drawn while its card is open, in the trail sign colours (as the Route tool) ---- */
let vRoutes = null, vRouteId = '';
async function showVRoute(id, move) {
    vRouteId = id;
    if (!LINES.has(id)) { clearVRoute(); return; }
    if (!vRoutes) {
        try { const r = await fetch(app.dataset.vroutes, { credentials: 'omit' }); vRoutes = r.ok ? await r.json() : { features: [] }; }
        catch (e) { vRoutes = { features: [] }; }
    }
    if (vRouteId !== id || !mapA || !styleReady) return;
    const f = (Array.isArray(vRoutes.features) ? vRoutes.features : []).filter((x) => x && x.properties && x.properties.id === id);
    if (!mapA.getLayer('vroute-case')) {
        if (!mapA.getSource('vroute')) mapA.addSource('vroute', { type: 'geojson', data: EMPTY });
        const under = mapA.getLayer('guests-dot') ? 'guests-dot' : undefined;
        mapA.addLayer({ id: 'vroute-case', type: 'line', source: 'vroute', layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': ['case', ['==', ['get', 'diff'], 1], '#6b5a00', '#ffffff'], 'line-width': ['case', ['==', ['get', 'diff'], 1], 7, 8] } }, under);
        mapA.addLayer({ id: 'vroute-fill', type: 'line', source: 'vroute', layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': ['match', ['get', 'diff'], 1, DIFF_COLOUR[1], 2, DIFF_COLOUR[2], DIFF_COLOUR[3]], 'line-width': ['case', ['==', ['get', 'diff'], 1], 5, 3] } }, under);
    }
    mapA.getSource('vroute').setData({ type: 'FeatureCollection', features: f });
    credits();
    if (move && f.length) {
        let w = 180, s = 90, e = -180, n = -90;
        f.forEach((x) => (Array.isArray(x.geometry && x.geometry.coordinates) ? x.geometry.coordinates : []).forEach((c) => { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); }));
        mapA.fitBounds([[w, s], [e, n]], { padding: cardPad(), maxZoom: 14, bearing: mapA.getBearing(), duration: reduced ? 0 : 1200 });
    }
}
function clearVRoute() {
    vRouteId = '';
    if (mapA && mapA.getSource('vroute')) mapA.getSource('vroute').setData(EMPTY);
    if (mapA) credits();
}
/* room around what is shown: the Visitors sheet on the left, the place panel at the bottom, the tools on the right */
function cardPad() {
    const dock = $('ch-place'), dh = dock && !dock.hidden ? dock.getBoundingClientRect().height : 0;
    const p = matchMedia('(max-width: 900px)').matches
        ? { top: 70, bottom: Math.round(dh || innerHeight * 0.4) + 20, left: 30, right: 70 }
        : { top: 70, bottom: Math.round(dh) + 30, left: !$('ch-visitors').hidden ? 380 : 60, right: $('ch-card').hidden ? 90 : 340 };
    // always leave the map at least 120 px each way (panels on a small window would otherwise cover it all)
    const c = mapA.getCanvas(), W = c.clientWidth, H = c.clientHeight;
    if (p.top + p.bottom > H - 120) p.bottom = Math.max(10, H - 120 - p.top);
    if (p.left + p.right > W - 120) { const k = Math.max(0, W - 120) / (p.left + p.right); p.left = Math.round(p.left * k); p.right = Math.round(p.right * k); }
    return p;
}

/* ---- the forecast at a place: today and tomorrow (Open-Meteo, which receives the place's position) ---- */
const wxCache = {};
function wxWord(c) {
    c = Number(c);
    if (c === 0) return 'clear';
    if (c <= 2) return 'partly cloudy';
    if (c === 3) return 'cloudy';
    if (c === 45 || c === 48) return 'fog';
    if (c >= 51 && c <= 57) return 'drizzle';
    if (c >= 61 && c <= 67) return 'rain';
    if (c >= 71 && c <= 77) return 'snow';
    if (c >= 80 && c <= 82) return 'showers';
    if (c === 85 || c === 86) return 'snow showers';
    if (c >= 95) return 'thunderstorms';
    return '';
}
async function placeWeather(p, dd) {
    try {
        const key = p.id + '@' + new Date().toDateString();
        let d = wxCache[key];
        if (!d) {
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + (+p.lat).toFixed(3) + '&longitude=' + (+p.lon).toFixed(3) +
                '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FZurich&forecast_days=2';
            const r = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!r.ok) throw new Error(r.status);
            d = wxCache[key] = await r.json();
        }
        const D = (d && d.daily) || {}, pick = (k, j) => Number((Array.isArray(D[k]) ? D[k] : [])[j]);
        const parts = [0, 1].map((j) => {
            const hi = pick('temperature_2m_max', j), lo = pick('temperature_2m_min', j), pr = pick('precipitation_sum', j);
            if (!isFinite(hi) || !isFinite(lo)) return '';
            const w = wxWord(pick('weather_code', j));
            return (j ? 'Tomorrow: ' : 'Today: ') + (w ? w + ', ' : '') + Math.round(lo) + ' to ' + Math.round(hi) + ' °C' + (pr >= 1 ? ', ' + Math.round(pr) + ' mm' : '');
        }).filter(Boolean);
        dd.textContent = parts.join('. ') || 'not available';
    } catch (e) { dd.textContent = 'not available right now'; }
}

/* ---- My plan: starred places, kept in this browser; a plan or a place can be sent as a link ---- */
const PLACE_IDS = new Set(PLACES.map((p) => String(p.id)));
function planClean(a) {
    const out = new Set();
    for (const v of (Array.isArray(a) ? a : [])) {
        const id = String(v);
        if (/^[a-z0-9]{1,24}$/.test(id) && PLACE_IDS.has(id)) out.add(id);
        if (out.size >= 60) break;
    }
    return [...out];
}
let plan = [];
try { plan = planClean(JSON.parse(localStorage.getItem('ch-plan') || '[]')); } catch (e) { plan = []; }
let sharedPlan = null;   // a plan opened from a link, until it is saved or dismissed
function savePlan() { try { localStorage.setItem('ch-plan', JSON.stringify(plan)); } catch (e) { /* kept for this visit only */ } }
function togglePlan(id) {
    plan = plan.includes(id) ? plan.filter((x) => x !== id) : plan.concat(id);
    savePlan();
    if (planOnly && !sharedPlan) {
        planOnly = plan.length ? plan.slice() : null;
        if (placeNow >= 0 && planOnly && !planOnly.includes(String(PLACES[placeNow].id))) closePlace();
    }
    renderPlan();
    vPlaces();
}
async function shareLink(url, title) {
    try {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title, url }); return; }
        await navigator.clipboard.writeText(url);
        toast('Link copied', 2000);
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        window.prompt('Copy this link:', url);
    }
}
const pageUrl = () => location.origin + location.pathname;
function planRows(ul, ids) {
    ids.forEach((id) => {
        const i = placeIndex(id);
        if (i >= 0) ul.appendChild(placeRow(i));
    });
}
function fitPlaces(ids) {
    let w = 180, s = 90, e = -180, n = -90;
    ids.forEach((id) => { const p = PLACES[placeIndex(id)]; if (!p) return; w = Math.min(w, +p.lon); e = Math.max(e, +p.lon); s = Math.min(s, +p.lat); n = Math.max(n, +p.lat); });
    if (w > e) return;
    closePlace();
    mapA.fitBounds([[w, s], [e, n]], { padding: cardPad(), maxZoom: 12, bearing: mapA.getBearing(), duration: reduced ? 0 : 1200 });
}
function showOnly(ids) {
    planOnly = ids && ids.length ? ids.slice() : null;
    vPlaces();
    renderPlan();
}
function renderPlan() {
    const box = $('ch-v-plan'), n = $('ch-v-plan-n');
    box.textContent = '';
    n.hidden = !plan.length;
    n.textContent = String(plan.length);
    if (sharedPlan && sharedPlan.length) {
        const sec = el('div', 'ch-v-planbox ch-v-shared');
        sec.appendChild(el('p', 'ch-v-group', 'A plan sent to you (' + sharedPlan.length + ')'));
        const ul = el('ol', 'ch-v-list');
        planRows(ul, sharedPlan);
        const acts = el('div', 'ch-v-acts');
        const save = el('button', 'ch-chip', 'Save to my plan'), no = el('button', 'ch-chip', 'Dismiss');
        save.type = no.type = 'button';
        save.addEventListener('click', () => { plan = planClean(plan.concat(sharedPlan)); savePlan(); sharedPlan = null; history.replaceState(null, '', location.pathname + '#visitors'); showOnly(plan); toast('Saved in this browser', 2000); });
        no.addEventListener('click', () => { sharedPlan = null; history.replaceState(null, '', location.pathname + '#visitors'); showOnly(null); });
        acts.append(save, no);
        sec.append(ul, acts);
        box.appendChild(sec);
    }
    if (!plan.length) {
        if (!sharedPlan) box.appendChild(el('p', 'ch-ly-note', 'Your plan is empty. Open a place and tap \u2606 Add to my plan: it collects here, with a gold ring on the map. The plan stays in this browser, and you can send it to someone as a link.'));
        return;
    }
    const ul = el('ol', 'ch-v-list');
    planRows(ul, plan);
    const acts = el('div', 'ch-v-acts');
    const only = !!planOnly;
    const show = el('button', 'ch-chip', only ? 'Show all places to add more' : 'Only these on the map'), send = el('button', 'ch-chip', 'Send as a link'), clear = el('button', 'ch-chip', 'Clear');
    show.type = send.type = clear.type = 'button';
    show.addEventListener('click', () => { if (only) showOnly(null); else { showOnly(plan); fitPlaces(plan); } });
    send.addEventListener('click', () => shareLink(pageUrl() + '#plan=' + plan.join(','), 'My plan in Switzerland'));
    clear.addEventListener('click', () => { if (window.confirm('Remove all places from your plan?')) { plan = []; savePlan(); showOnly(null); } });
    acts.append(show, send, clear);
    box.append(ul, acts, el('p', 'ch-ly-note', 'Kept in this browser. "Send as a link" opens the same plan for someone else, who can save it too.'));
}

/* ---- a place's panel: at the bottom, under its path; all it needs on one screen ---- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* open months as ranges: "Jul to Oct", "Dec to Mar, May to Oct", or "All year" */
function monthsText(m) {
    if (!Array.isArray(m) || m.length >= 12) return 'All year';
    const on = (k) => m.includes(((k - 1 + 12) % 12) + 1), runs = [];
    for (let k = 1; k <= 12; k++) {
        if (!on(k) || on(k - 1)) continue;
        let e = k;
        while (on(e + 1) && e - k < 11) e++;
        runs.push(MON[k - 1] + (e > k ? ' to ' + MON[(e - 1) % 12] : ''));
    }
    return runs.join(', ');
}
const GRADES = { T1: 'T1 easy trail', T2: 'T2 mountain trail', T3: 'T3 demanding' };
function passShort(p) {
    if (p.far) return 'Extra ticket';
    const o = String(p.ostwind || '');
    return /^yes/i.test(o) ? 'Ostwind' : /^not needed/i.test(o) ? 'On foot' : 'Ostwind + extra';
}
let placeNow = -1, placeFrom = null;
function closePlace() {
    const d = $('ch-place'), was = d && !d.hidden;
    placeNow = -1;
    if (d) { d.hidden = true; d.classList.remove('ch-small'); }
    clearVRoute();
    if (was && placeFrom && document.contains(placeFrom)) { try { placeFrom.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
    placeFrom = null;
}
function guestCard(i, move) {
    const p = PLACES[i];
    if (!p) return false;
    if (modes.time.on() || modes.profile.on()) { toast('Close Then and now or Route first to see a place.', 2600); return true; }
    const id = String(p.id), dock = $('ch-place'), b = $('ch-place-body');
    placeNow = i;
    b.textContent = '';
    if (typeof p.photo === 'string' && /^[a-z0-9][a-z0-9._-]{0,80}\.(jpg|jpeg|png|webp)$/.test(p.photo)) {
        const img = el('img', 'ch-pl-photo');
        img.src = app.dataset.photos + p.photo; img.alt = String(p.name); img.loading = 'lazy'; img.decoding = 'async';
        b.appendChild(img);
    }
    const kinds = el('p', 'ch-pl-kinds');
    (p.kinds || []).map((k) => KINDS.find((x) => x.id === k)).filter(Boolean).forEach((k) => {
        const s = el('span');
        s.append(picto(String(k.id), String(k.colour)), document.createTextNode(String(k.name)));
        kinds.appendChild(s);
    });
    const h2 = el('h2', 'ch-pl-name', String(p.name));
    h2.tabIndex = -1;
    b.append(kinds, h2);
    // the key facts at a glance
    const stats = el('ul', 'ch-pl-stats');
    const stat = (k, v) => { const li = el('li'); li.append(el('span', null, k), el('strong', null, v)); stats.appendChild(li); };
    stat('From St. Gallen', fmtMins(p.mins));
    if (p.hike) stat('Walk', String(p.hike));
    if (p.grade && GRADES[p.grade]) stat('Trail', GRADES[p.grade]);
    stat('Season', monthsText(p.months) + (isOpen(p, thisMonth()) ? '' : ' (closed now)'));
    stat('Ticket', passShort(p));
    b.appendChild(stats);
    b.appendChild(el('p', 'ch-pl-why', String(p.why || '')));
    const acts = el('div', 'ch-v-acts');
    if (p.stop) {
        const t = el('button', 'ch-chip ch-chip-ic');
        t.type = 'button';
        t.append(picto('rail'), document.createTextNode('Train from St. Gallen'));
        t.addEventListener('click', () => showTrip('St. Gallen', String(p.stop), 'To ' + String(p.name)));
        acts.appendChild(t);
    }
    const star = el('button', 'ch-chip ch-v-star');
    const paint = () => { const on = plan.includes(id); star.textContent = on ? '★ In my plan' : '☆ Add to my plan'; star.classList.toggle('ch-v-starred', on); };
    star.type = 'button'; paint();
    star.addEventListener('click', () => { togglePlan(id); paint(); toast(plan.includes(id) ? 'Added to My plan (a tab in Visitors)' : 'Removed from My plan', 2200); });
    const link = el('button', 'ch-chip', 'Share');
    link.type = 'button'; link.title = 'Send a link to this place';
    link.addEventListener('click', () => shareLink(pageUrl() + '#visitors/' + id, String(p.name)));
    acts.append(star, link);
    if (typeof p.link === 'string' && p.link.indexOf('https://') === 0) {
        const a = el('a', 'ch-chip ch-pl-web', 'Website');
        a.href = p.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
        acts.appendChild(a);
    }
    b.appendChild(acts);
    // the details
    const dl = el('dl', 'ch-pl-facts');
    const fact = (k, v) => { if (v) { const d = el('div'); d.append(el('dt', null, k), el('dd', null, String(v))); dl.appendChild(d); } };
    fact('Getting there', p.trip);
    fact('On foot', p.walk);
    fact('Costs', p.extra);
    fact('When', p.season);
    fact('Ostwind pass', p.ostwind);
    fact('Good to know', p.know);
    const wd = el('div'), dd = el('dd', null, 'Loading…');
    wd.append(el('dt', null, 'Weather there'), dd);
    dl.appendChild(wd);
    b.appendChild(dl);
    placeWeather(p, dd);
    const src = el('p', 'ch-card-src');
    const om = el('a', null, 'Open-Meteo');
    om.href = 'https://open-meteo.com/'; om.target = '_blank'; om.rel = 'noopener noreferrer';
    src.append(document.createTextNode('Forecast: '), om, document.createTextNode(' (CC BY 4.0).'));
    if (LINES.has(id)) {
        const osm = el('a', null, 'OpenStreetMap');
        osm.href = 'https://www.openstreetmap.org/copyright'; osm.target = '_blank'; osm.rel = 'noopener noreferrer';
        src.append(document.createTextNode(' Path: © '), osm, document.createTextNode(' contributors, BRouter.'));
    }
    b.appendChild(src);
    // on a phone the panel starts low, so the map and the path stay in sight above it
    dock.classList.toggle('ch-small', matchMedia('(max-width: 900px)').matches);
    placeFrom = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    dock.hidden = false;
    dock.scrollTop = 0;
    h2.focus({ preventScroll: true });
    closeCard();
    showVRoute(id, move);
    if (move && !LINES.has(id)) {
        // an offset, not padding: a flight's padding would stay on the map and add to every later fit
        const pd = cardPad();
        mapA.flyTo({ center: [+p.lon, +p.lat], zoom: Math.max(mapA.getZoom(), 13), offset: [(pd.left - pd.right) / 2, (pd.top - pd.bottom) / 2], duration: reduced ? 0 : 1400, essential: true });
    }
    return true;
}

/* a train trip on the map: the next connection's stops from the SBB timetable (transport.opendata.ch), joined by a
   line from stop to stop (the stations are exact, the line between them is straight) */
let tripReq = 0, tripBuilding = false, tripOpen = false;   // tripOpen: the card on the right is a train's
function clearTrip() {
    tripReq++;
    tripOpen = false;
    if (mapA && mapA.getSource('trip')) mapA.getSource('trip').setData(EMPTY);
}
async function showTrip(from, to, title) {
    const req = ++tripReq;
    if (!styleReady) { toast('The map is still loading.', 2000); return; }
    if (layersSaved) return;   // not in Then and now
    try {
        const res = await fetch('https://transport.opendata.ch/v1/connections?limit=1&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to),
                                { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error(res.status);
        const d = await res.json();
        if (req !== tripReq || (!visitorsOn && !layerOn.guests)) return;
        const c = (d.connections || [])[0];
        const stops = [];
        ((c && c.sections) || []).forEach((sec) => {
            const j = sec.journey;
            if (!j || !Array.isArray(j.passList)) return;
            j.passList.forEach((p) => {
                const co = p.station && p.station.coordinate, lat = Number(co && co.x), lon = Number(co && co.y);
                const ts = Number(p.departureTimestamp || p.arrivalTimestamp), t = new Date(ts > 0 ? ts * 1000 : NaN);
                if (!isFinite(lat) || !isFinite(lon) || lat < 44 || lat > 49 || lon < 5 || lon > 12) return;
                if (stops.length && stops[stops.length - 1].name === String(p.station.name || '')) return;
                stops.push({ name: String(p.station.name || ''), lon, lat, time: isNaN(t) ? '' : t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }),
                             line: lineName(j.category, j.number) });
            });
        });
        if (stops.length < 2) throw new Error('empty');
        if (!mapA.getLayer('trip-line')) {
            if (!mapA.getSource('trip')) mapA.addSource('trip', { type: 'geojson', data: EMPTY });
            const under = mapA.getLayer('guests-dot') ? 'guests-dot' : undefined;
            mapA.addLayer({ id: 'trip-line', type: 'line', source: 'trip', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#d52b1e', 'line-width': 4, 'line-opacity': 0.85 } }, under);
            mapA.addLayer({ id: 'trip-stop', type: 'circle', source: 'trip', filter: ['==', ['geometry-type'], 'Point'],
                            paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#d52b1e', 'circle-stroke-width': 2.5 } }, under);
            mapA.addLayer({ id: 'trip-name', type: 'symbol', source: 'trip', filter: ['==', ['geometry-type'], 'Point'],
                            layout: { 'text-field': ['get', 'label'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 12, 'text-offset': [0, -1.1], 'text-anchor': 'bottom', 'text-padding': 2 },
                            paint: { 'text-color': '#7f1d1d', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
        }
        ['trip-line', 'trip-stop', 'trip-name'].forEach((id) => mapA.setLayoutProperty(id, 'visibility', 'visible'));
        mapA.getSource('trip').setData({ type: 'FeatureCollection', features: [
            { type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map((q) => [q.lon, q.lat]) }, properties: {} },
            ...stops.map((q) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [q.lon, q.lat] }, properties: { label: q.name } }))] });
        let w = 180, so = 90, e = -180, n = -90;
        stops.forEach((q) => { w = Math.min(w, q.lon); e = Math.max(e, q.lon); so = Math.min(so, q.lat); n = Math.max(n, q.lat); });
        tripBuilding = true;
        try { card((b) => {
            b.append(el('p', 'ch-card-kind', 'By train'), el('h2', null, title));
            const dl = el('dl', 'ch-card-facts ch-trip');
            stops.forEach((q) => row(dl, q.time, q.name));
            b.appendChild(dl);
            b.appendChild(el('p', 'ch-card-src', 'Next connection: ' + stops[0].line + '. SBB timetable (transport.opendata.ch); the line joins the stops.'));
        }); tripOpen = true; } finally { tripBuilding = false; }
        // the map fitted once the card is there, so the line keeps clear of it
        mapA.fitBounds([[w, so], [e, n]], { padding: cardPad(), bearing: mapA.getBearing(), duration: reduced ? 0 : 1200 });
    } catch (e) {
        if (req === tripReq) toast('The train could not be loaded right now.', 3000);
    }
}
/* ---- the list: one line a place, grouped by the time from St. Gallen ---- */
function placeRow(i) {
    const p = PLACES[i];
    const li = el('li', 'ch-v-place k-' + kindOf(p) + (isOpen(p, thisMonth()) ? '' : ' ch-v-closed'));
    const btn = el('button', 'ch-v-btn');
    btn.type = 'button';
    const dot = picto(kindOf(p), kindColour(kindOf(p)), 'ch-v-pin');
    const txt = el('span', 'ch-v-txt');
    txt.append(el('strong', null, (plan.includes(String(p.id)) ? '★ ' : '') + String(p.name)), el('span', null, fmtMins(p.mins)));
    if (!isOpen(p, thisMonth())) btn.title = 'Not open in ' + MONTHS[thisMonth() - 1];
    btn.append(dot, txt);
    btn.addEventListener('click', () => guestCard(i, true));
    li.appendChild(btn);
    return li;
}
function vPlaces() {
    // a chip pressed = shown; a kind or a time group can be turned off, the rainy-day chip keeps only those places
    document.querySelectorAll('#ch-v-kinds .ch-v-kind').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === 'rain' ? vRain : !kindOff.has(b.dataset.kind))));
    document.querySelectorAll('#ch-v-times .ch-v-kind').forEach((b) => b.setAttribute('aria-pressed', String(!groupOff.has(Number(b.dataset.group)))));
    const list = $('ch-v-places');
    list.textContent = '';
    if (planOnly) {
        const li = el('li', 'ch-v-only');
        const all = el('button', 'ch-chip', 'Show all');
        all.type = 'button';
        all.addEventListener('click', () => showOnly(null));
        li.append(el('span', null, 'Only the places of a plan. Show all to add more with \u2606.'), all);
        list.appendChild(li);
    }
    let group = -1;
    V_ORDER.filter((i) => shown(PLACES[i])).forEach((i) => {
        const g = groupOf(PLACES[i]);
        if (g !== group) { group = g; const h = el('li', 'ch-v-group', V_GROUPS[g].name); h.setAttribute('role', 'presentation'); list.appendChild(h); }
        list.appendChild(placeRow(i));
    });
    if (!list.children.length) list.appendChild(el('li', 'ch-ly-note', 'Nothing matches these choices.'));
    if (mapA && mapA.getSource('guests')) mapA.getSource('guests').setData({ type: 'FeatureCollection', features: guestFeatures() });
}
/* the sheet's four tabs */
let vCurrent = 'places';
function vTab(t) {
    vCurrent = t;
    document.querySelectorAll('.ch-v-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    document.querySelectorAll('.ch-v-pane').forEach((p) => { p.hidden = p.dataset.tab !== t; });
    clearInterval(depTimer); depTimer = null;
    if (t === 'now' && visitorsOn) { loadNow(); depTimer = setInterval(() => { if (!document.hidden) loadNow(); }, 60000); }
}
function buildVisitors() {
    // the legend: one chip per kind, each turns its places off and on (on the list and the map); one for a rainy day
    const chips = $('ch-v-kinds');
    KINDS.forEach((k) => {
        const b = el('button', 'ch-v-kind');
        b.type = 'button'; b.dataset.kind = String(k.id);
        const dot = picto(String(k.id), String(k.colour), 'ch-v-dot');
        b.append(dot, el('span', null, String(k.short || k.name)));
        b.title = 'Show or hide: ' + String(k.name);
        b.addEventListener('click', () => { planOnly = null; if (kindOff.has(k.id)) kindOff.delete(k.id); else kindOff.add(k.id); vPlaces(); renderPlan(); });
        chips.appendChild(b);
    });
    const rain = el('button', 'ch-v-kind ch-v-rain');
    rain.type = 'button'; rain.dataset.kind = 'rain'; rain.title = 'Only places that are good in bad weather';
    rain.append(picto('rain', '#475569', 'ch-v-dot'), el('span', null, 'Rainy day only'));
    rain.addEventListener('click', () => { planOnly = null; vRain = !vRain; vPlaces(); renderPlan(); });
    chips.appendChild(rain);
    // the time groups, also on and off
    const times = $('ch-v-times');
    V_GROUPS.forEach((g, k) => {
        const b = el('button', 'ch-v-kind ch-v-time', g.name);
        b.type = 'button'; b.dataset.group = String(k); b.title = 'Show or hide: ' + g.name;
        b.addEventListener('click', () => { planOnly = null; if (groupOff.has(k)) groupOff.delete(k); else groupOff.add(k); vPlaces(); renderPlan(); });
        times.appendChild(b);
    });
    // the pins' own switch, the same as Layers, Visitor places
    const pins = $('ch-v-pins');
    pins.addEventListener('change', () => setLayer(LAYERS.find((d) => d.id === 'guests'), pins.checked));
    const op = $('ch-v-open');
    $('ch-v-open-name').textContent = 'Open in ' + MONTHS[thisMonth() - 1];
    op.addEventListener('change', () => { planOnly = null; vOpen = op.checked; vPlaces(); renderPlan(); });
    renderPlan();
    vPlaces();
    const ow = $('ch-v-ostwind');
    ow.addEventListener('change', () => { ostwindOn = ow.checked; if (ostwindOn && styleReady) visitorsLayers(); showOstwind(); });
    const al = $('ch-v-arrival');
    (guests.arrival || []).forEach((a) => {
        const li = el('li');
        const b = el('button', 'ch-v-ticket ch-v-trip');
        b.type = 'button';
        b.append(el('strong', 'ch-v-tname', String(a.name)), el('span', 'ch-v-ttext', String(a.text)), el('span', 'ch-v-show', 'Show on the map'));
        if (a.from && a.to) b.addEventListener('click', () => showTrip(String(a.from), String(a.to), String(a.name)));
        li.appendChild(b);
        al.appendChild(li);
    });
    const tl = $('ch-v-tickets');
    (guests.tickets || []).forEach((t) => {
        const li = el('li', 'ch-v-ticket' + (t.best ? ' ch-v-best' : ''));
        li.appendChild(el('strong', 'ch-v-tname', String(t.name)));
        const pr = el('dl', 'ch-v-prices');
        [['Adults', t.price], [String(t.half_label || 'Half Fare or child'), t.half]].forEach(([k, v]) => { if (v) { const d = el('div'); d.append(el('dt', null, k), el('dd', null, String(v))); pr.appendChild(d); } });
        li.append(pr, el('p', null, String(t.note)));
        tl.appendChild(li);
    });
}

/* a train's name as on the departure boards: S-Bahn lines run together (S21), the others with a space (IR 13) */
function lineName(cat, num) {
    cat = String(cat || ''); num = String(num || '');
    return /^(S|SN)$/.test(cat) || !num ? cat + num : cat + ' ' + num;
}
/* now: departures and the weather in St. Gallen */
async function loadNow() {
    const ul = $('ch-v-deps'), st = $('ch-v-deps-state');
    try {
        const res = await fetch('https://transport.opendata.ch/v1/stationboard?id=8506302&limit=8', { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error(res.status);
        const d = await res.json();
        ul.textContent = '';
        (Array.isArray(d.stationboard) ? d.stationboard : []).slice(0, 8).forEach((j) => {
            // the timestamp, not the text: Safari cannot read the text's form (+0100 without a colon)
            const s = (j && j.stop) || {}, t = new Date(Number(s.departureTimestamp) * 1000);
            if (isNaN(t)) return;
            const li = el('li', 'ch-v-dep');
            const hm = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
            const late = Number(s.delay) > 0 ? ' +' + Math.round(Number(s.delay)) : '';
            li.append(el('span', 'ch-v-time', hm + late), el('span', 'ch-v-line', lineName(j.category, j.number)),
                      el('span', 'ch-v-to', String(j.to || '')), el('span', 'ch-v-pl', s.platform ? 'Pl. ' + String(s.platform) : ''));
            ul.appendChild(li);
        });
        st.textContent = 'From St. Gallen station. Updated every minute.';
    } catch (e) {
        st.textContent = 'The departures could not be loaded right now.';
    }
    [['STG', 'ch-v-wx-stg']].forEach(async ([id, out]) => {
        try {
            const r = await fetch(WX_HOST + 'ch.meteoschweiz.ogd-smn/' + id.toLowerCase() + '/ogd-smn_' + id.toLowerCase() + '_t_now.csv', { credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!r.ok) throw new Error(r.status);
            const lines = (await r.text()).trim().split(/\r?\n/);
            const head = lines[0].split(';');
            let row2 = null;
            for (let k = lines.length - 1; k > 0 && !row2; k--) {
                const c = lines[k].split(';');
                if (c.length === head.length && isFinite(parseFloat(c[head.indexOf('tre200s0')]))) row2 = c;
            }
            if (!row2) throw new Error('empty');
            const v = (k) => { const x = parseFloat(row2[head.indexOf(k)]); return isFinite(x) && Math.abs(x) < 999 ? x : null; };
            const bits = [fmtTemp(v('tre200s0'))];
            if (v('fu3010z0') !== null) bits.push('wind ' + Math.round(v('fu3010z0')) + ' km/h');
            if (v('rre150z0')) bits.push('raining');
            if (v('sre000z0') !== null) bits.push(v('sre000z0') >= 5 ? 'sunny' : 'no sun');
            $(out).textContent = bits.join(' · ');
        } catch (e) { $(out).textContent = 'not available'; }
    });
}

function wireVisitors() {
    if (!(guests.places || []).length) return;
    buildVisitors();
    const btn = $('ch-visitors-btn'), panel = $('ch-visitors');
    btn.addEventListener('click', () => { const on = panel.hidden; sheet('ch-visitors', on); showVisitors(on); });
    $('ch-place-close').addEventListener('click', closePlace);
    $('ch-visitors-close').addEventListener('click', () => { sheet('ch-visitors', false); showVisitors(false); btn.focus(); });
    document.querySelectorAll('.ch-v-tab').forEach((b) => b.addEventListener('click', () => vTab(b.dataset.tab)));
    // Visitors is the page's main view: it opens at the start (on a phone as a low sheet over the map) unless the
    // address asks for a map view or a mode of its own; the pins are on from the start and stay until turned off.
    // Links: #visitors/<place> opens that place's card, #plan=<place>,<place> offers a plan someone sent.
    const h = location.hash;
    const one = /^#visitors\/([a-z0-9]{1,24})$/.exec(h), sent = /^#plan=([a-z0-9,]{1,1600})$/.exec(h);
    if (sent) {
        // a plan link with no known place in it is dropped at once, so the address keeps following the map
        const c = planClean(sent[1].split(','));
        sharedPlan = c.length ? c : null;
        planOnly = sharedPlan ? sharedPlan.slice() : null;
        if (!sharedPlan) history.replaceState(null, '', location.pathname + '#visitors');
        renderPlan(); vPlaces(); vTab('plan');
    }
    if (!h || h === '#visitors' || one || sent || /,v$/.test(h)) {
        sheet('ch-visitors', true);
        if (matchMedia('(max-width: 900px)').matches && !one && !sent) panel.classList.add('ch-small');
        showVisitors(true);
    }
    onLoad.push(() => {
        if (layerOn.guests) visitorsLayers();
        const i = one ? placeIndex(one[1]) : -1;
        if (i >= 0) guestCard(i, true);
        if (sent && planOnly) fitPlaces(planOnly);
    });
}
