/* Part 62: Visitors, the page's main view, for people visiting St. Gallen: St. Gallen is the base of every trip.
   A sheet (open at the start, or the sun-and-mountain icon) with three tabs:
   - Places (data/switzerland.yaml, guests): grouped by the time it takes from St. Gallen station; chips for the six
     kinds and for a rainy day; switches for "open this month" and the Ostwind area (static/switzerland/ostwind.json,
     tools/swiss-map/make_ostwind.py). Each place has a card with the next train from St. Gallen (transport.opendata.ch),
     the forecast there (Open-Meteo), and for hikes the line of the walk (static/switzerland/visitor-routes.json,
     tools/swiss-map/make_visitor_routes.py). A star puts a place on "My plan" (kept in this browser, localStorage
     'ch-plan'), which can be sent as a link (#plan=id,id); a single place has a link too (#visitors/id).
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
    ['trip-line', 'trip-stop', 'trip-name'].forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
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
    if (matchMedia('(max-width: 900px)').matches) return { top: 70, bottom: Math.round(dh || innerHeight * 0.4) + 20, left: 30, right: 70 };
    const sheetOpen = !$('ch-visitors').hidden;
    return { top: 70, bottom: Math.round(dh) + 30, left: sheetOpen ? 380 : 60, right: $('ch-card').hidden ? 90 : 340 };
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
const planClean = (a) => (Array.isArray(a) ? a : []).map(String).filter((id, k, all) => /^[a-z0-9]{1,24}$/.test(id) && placeIndex(id) >= 0 && all.indexOf(id) === k).slice(0, 60);
let plan = [];
try { plan = planClean(JSON.parse(localStorage.getItem('ch-plan') || '[]')); } catch (e) { plan = []; }
let sharedPlan = null;   // a plan opened from a link, until it is saved or dismissed
function savePlan() { try { localStorage.setItem('ch-plan', JSON.stringify(plan)); } catch (e) { /* kept for this visit only */ } }
function togglePlan(id) {
    plan = plan.includes(id) ? plan.filter((x) => x !== id) : plan.concat(id);
    savePlan();
    if (planOnly && !sharedPlan) planOnly = plan.length ? plan.slice() : null;
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
let placeNow = -1;
function closePlace() {
    placeNow = -1;
    const d = $('ch-place');
    if (d) { d.hidden = true; d.classList.remove('ch-small'); }
    clearVRoute();
}
function guestCard(i, move) {
    const p = PLACES[i];
    if (!p) return false;
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
        const s = el('span'), dot = el('i');
        dot.style.background = String(k.colour);
        s.append(dot, document.createTextNode(String(k.name)));
        kinds.appendChild(s);
    });
    b.append(kinds, el('h2', 'ch-pl-name', String(p.name)));
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
        const t = el('button', 'ch-chip', 'Train from St. Gallen');
        t.type = 'button';
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
    src.append(document.createTextNode('Forecast: '), om, document.createTextNode(' (CC BY 4.0).' + (LINES.has(id) ? ' Path: © OpenStreetMap contributors, BRouter.' : '')));
    b.appendChild(src);
    // on a phone the panel starts low, so the map and the path stay in sight above it
    dock.classList.toggle('ch-small', matchMedia('(max-width: 900px)').matches);
    dock.hidden = false;
    dock.scrollTop = 0;
    closeCard();
    showVRoute(id, move);
    if (move && !LINES.has(id)) {
        mapA.flyTo({ center: [+p.lon, +p.lat], zoom: Math.max(mapA.getZoom(), 13), padding: cardPad(), duration: reduced ? 0 : 1400, essential: true });
    }
    return true;
}

/* a train trip on the map: the next connection's stops from the SBB timetable (transport.opendata.ch), joined by a
   line from stop to stop (the stations are exact, the line between them is straight) */
let tripReq = 0, tripBuilding = false;
function clearTrip() {
    tripReq++;
    if (mapA && mapA.getSource('trip')) mapA.getSource('trip').setData(EMPTY);
}
async function showTrip(from, to, title) {
    const req = ++tripReq;
    if (!styleReady) { toast('The map is still loading.', 2000); return; }
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
        mapA.fitBounds([[w, so], [e, n]], { padding: cardPad(), bearing: mapA.getBearing(), duration: reduced ? 0 : 1200 });
        tripBuilding = true;
        card((b) => {
            b.append(el('p', 'ch-card-kind', 'By train'), el('h2', null, title));
            const dl = el('dl', 'ch-card-facts ch-trip');
            stops.forEach((q) => row(dl, q.time, q.name));
            b.appendChild(dl);
            b.appendChild(el('p', 'ch-card-src', 'Next connection: ' + stops[0].line + '. SBB timetable (transport.opendata.ch); the line joins the stops.'));
        });
        tripBuilding = false;
    } catch (e) {
        if (req === tripReq) toast('The train could not be loaded right now.', 3000);
    }
}
/* ---- the list: one line a place, grouped by the time from St. Gallen ---- */
function placeRow(i) {
    const p = PLACES[i];
    const li = el('li', 'ch-v-place' + (isOpen(p, thisMonth()) ? '' : ' ch-v-closed'));
    const btn = el('button', 'ch-v-btn');
    btn.type = 'button';
    const dot = el('span', 'ch-v-pin');
    dot.style.background = kindColour(kindOf(p));
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
/* the sheet's three tabs */
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
        const dot = el('span', 'ch-v-dot'); dot.style.background = String(k.colour);
        b.append(dot, el('span', null, String(k.short || k.name)));
        b.title = 'Show or hide: ' + String(k.name);
        b.addEventListener('click', () => { if (kindOff.has(k.id)) kindOff.delete(k.id); else kindOff.add(k.id); vPlaces(); });
        chips.appendChild(b);
    });
    const rain = el('button', 'ch-v-kind ch-v-rain');
    rain.type = 'button'; rain.dataset.kind = 'rain'; rain.title = 'Only places that are good in bad weather';
    rain.append(el('span', 'ch-v-dot'), el('span', null, 'Rainy day only'));
    rain.addEventListener('click', () => { vRain = !vRain; vPlaces(); });
    chips.appendChild(rain);
    // the time groups, also on and off
    const times = $('ch-v-times');
    V_GROUPS.forEach((g, k) => {
        const b = el('button', 'ch-v-kind ch-v-time', g.name);
        b.type = 'button'; b.dataset.group = String(k); b.title = 'Show or hide: ' + g.name;
        b.addEventListener('click', () => { if (groupOff.has(k)) groupOff.delete(k); else groupOff.add(k); vPlaces(); });
        times.appendChild(b);
    });
    // the pins' own switch, the same as Layers, Visitor places
    const pins = $('ch-v-pins');
    pins.addEventListener('change', () => setLayer(LAYERS.find((d) => d.id === 'guests'), pins.checked));
    const op = $('ch-v-open');
    $('ch-v-open-name').textContent = 'Open in ' + MONTHS[thisMonth() - 1];
    op.addEventListener('change', () => { vOpen = op.checked; vPlaces(); });
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
    if (sent) { sharedPlan = planClean(sent[1].split(',')); planOnly = sharedPlan.length ? sharedPlan.slice() : null; renderPlan(); vPlaces(); vCurrent = 'plan'; }
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
