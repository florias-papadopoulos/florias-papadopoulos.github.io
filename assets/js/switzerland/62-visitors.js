/* Part 62: Visitors, the page's main view, for people visiting St. Gallen: St. Gallen is the base of every trip.
   A sheet (open at the start, or the sun-and-mountain icon) with three tabs:
   - Places (data/switzerland.yaml, guests): grouped by the time it takes from St. Gallen station; chips for the six
     kinds and for a rainy day; switches for "open this month" and the Ostwind area (static/switzerland/ostwind.json,
     tools/swiss-map/make_ostwind.py). Each place has a card with the next train from St. Gallen (transport.opendata.ch),
     the forecast there (Open-Meteo), and for hikes the line of the walk (static/switzerland/visitor-routes.json,
     tools/swiss-map/make_visitor_routes.py). A star puts a place on "My plan" (kept in this browser, localStorage
     'ch-plan'), which can be sent as a link (#plan=id,id); a single place has a link too (#visitors/id).
   - Travel: the trains from Zurich Airport (drawn stop by stop) and the day tickets.
   - Now: the next departures from St. Gallen and the weather in St. Gallen and on the Säntis (MeteoSwiss).
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
const V_GROUPS = [{ max: 20, name: 'In town' }, { max: 60, name: 'Under 1 h' }, { max: 119, name: '1 to 2 h' }, { max: Infinity, name: 'Long day (2 h and more)' }];
const groupOf = (p) => V_GROUPS.findIndex((g) => (Number(p.mins) || 0) <= g.max);
const V_ORDER = PLACES.map((p, i) => i).sort((a, b) => (Number(PLACES[a].mins) || 0) - (Number(PLACES[b].mins) || 0) || a - b);
let vKind = '';     // a kind, 'rain' (good in bad weather) or '' (all)
let vOpen = false;  // only what is open this month
const shown = (p) => (!vKind || (vKind === 'rain' ? !!p.rain : (p.kinds || []).includes(vKind))) && (!vOpen || isOpen(p, thisMonth()));
function guestFeatures() {
    return PLACES.map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+p.lon, +p.lat] },
        properties: { i, name: String(p.name), colour: kindColour(kindOf(p)) } })).filter((f) => shown(PLACES[f.properties.i]));
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
    mapA.addLayer({ id: 'guests-dot', type: 'circle', source: 'guests',
                    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4.5, 10, 7, 13, 9], 'circle-color': ['get', 'colour'],
                             'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2] } });
    mapA.addLayer({ id: 'guests-name', type: 'symbol', source: 'guests', minzoom: 10.5,
                    layout: { 'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 13, 'text-offset': [0, 1], 'text-anchor': 'top', 'text-padding': 2 },
                    paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 } });
}
function showVisitors(on) {
    // the map's style must be there before layers are added (the link can open the sheet while the map loads)
    if (on && !styleReady) { onLoad.push(() => { if (!$('ch-visitors').hidden) showVisitors(true); }); return; }
    visitorsOn = on;
    // the sheet turns the place pins on; they stay when it closes (Layers, Visitor places, turns them off)
    if (on && !layerOn.guests) setLayer(LAYERS.find((d) => d.id === 'guests'), true);
    ['trip-line', 'trip-stop', 'trip-name'].forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
    if (on) vTab(vCurrent);
    else { clearInterval(depTimer); depTimer = null; }
}
/* the Ostwind area, shaded only while its switch is on */
function showOstwind() {
    ['ostwind-fill', 'ostwind-edge'].forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', layerOn.guests && ostwindOn ? 'visible' : 'none'));
}

/* ---- a hike's line, drawn while its card is open, in the trail sign colours (as the Route tool) ---- */
let vRoutes = null, vRouteId = '';
async function showVRoute(id, move) {
    vRouteId = id;
    if (!vRoutes) {
        try { const r = await fetch(app.dataset.vroutes, { credentials: 'omit' }); vRoutes = r.ok ? await r.json() : { features: [] }; }
        catch (e) { vRoutes = { features: [] }; }
    }
    if (vRouteId !== id || !mapA || !styleReady) return;
    const f = (Array.isArray(vRoutes.features) ? vRoutes.features : []).filter((x) => x && x.properties && x.properties.id === id);
    if (!mapA.getSource('vroute')) {
        mapA.addSource('vroute', { type: 'geojson', data: EMPTY });
        mapA.addLayer({ id: 'vroute-case', type: 'line', source: 'vroute', layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': ['case', ['==', ['get', 'diff'], 1], '#6b5a00', '#ffffff'], 'line-width': ['case', ['==', ['get', 'diff'], 1], 7, 8] } }, 'guests-dot');
        mapA.addLayer({ id: 'vroute-fill', type: 'line', source: 'vroute', layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': ['match', ['get', 'diff'], 1, DIFF_COLOUR[1], 2, DIFF_COLOUR[2], DIFF_COLOUR[3]], 'line-width': ['case', ['==', ['get', 'diff'], 1], 5, 3] } }, 'guests-dot');
    }
    mapA.getSource('vroute').setData({ type: 'FeatureCollection', features: f });
    if (move && f.length) {
        let w = 180, s = 90, e = -180, n = -90;
        f.forEach((x) => x.geometry.coordinates.forEach((c) => { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); }));
        mapA.fitBounds([[w, s], [e, n]], { padding: cardPad(), maxZoom: 14, duration: reduced ? 0 : 1200 });
    }
}
function clearVRoute() {
    vRouteId = '';
    if (mapA && mapA.getSource('vroute')) mapA.getSource('vroute').setData(EMPTY);
}
/* room for the sheet and the card around what is shown */
function cardPad() {
    return matchMedia('(max-width: 900px)').matches ? { top: 60, bottom: Math.round(innerHeight * 0.5), left: 30, right: 60 } : { top: 60, bottom: 60, left: 380, right: 340 };
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
        let d = wxCache[p.id];
        if (!d) {
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + (+p.lat).toFixed(3) + '&longitude=' + (+p.lon).toFixed(3) +
                '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FZurich&forecast_days=2';
            const r = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!r.ok) throw new Error(r.status);
            d = wxCache[p.id] = await r.json();
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
function renderPlan() {
    const box = $('ch-v-plan');
    box.textContent = '';
    if (sharedPlan && sharedPlan.length) {
        const sec = el('div', 'ch-v-planbox ch-v-shared');
        sec.appendChild(el('p', 'ch-v-group', 'A plan sent to you (' + sharedPlan.length + ')'));
        const ul = el('ol', 'ch-v-list');
        planRows(ul, sharedPlan);
        const acts = el('div', 'ch-v-acts');
        const save = el('button', 'ch-chip', 'Save to my plan'), no = el('button', 'ch-chip', 'Dismiss');
        save.type = no.type = 'button';
        save.addEventListener('click', () => { plan = planClean(plan.concat(sharedPlan)); savePlan(); sharedPlan = null; history.replaceState(null, '', location.pathname + '#visitors'); renderPlan(); toast('Saved in this browser', 2000); });
        no.addEventListener('click', () => { sharedPlan = null; history.replaceState(null, '', location.pathname + '#visitors'); renderPlan(); });
        acts.append(save, no);
        sec.append(ul, acts);
        box.appendChild(sec);
    }
    if (plan.length) {
        const sec = el('div', 'ch-v-planbox');
        sec.appendChild(el('p', 'ch-v-group', 'My plan (' + plan.length + ')'));
        const ul = el('ol', 'ch-v-list');
        planRows(ul, plan);
        const acts = el('div', 'ch-v-acts');
        const send = el('button', 'ch-chip', 'Send as a link'), clear = el('button', 'ch-chip', 'Clear');
        send.type = clear.type = 'button';
        send.addEventListener('click', () => shareLink(pageUrl() + '#plan=' + plan.join(','), 'My plan in Switzerland'));
        clear.addEventListener('click', () => { if (window.confirm('Remove all places from your plan?')) { plan = []; savePlan(); renderPlan(); } });
        acts.append(send, clear);
        sec.append(ul, acts);
        box.appendChild(sec);
    }
}

/* ---- a place's card ---- */
function guestCard(i, move) {
    const p = PLACES[i];
    if (!p) return false;
    const id = String(p.id);
    card((b) => {
        const kinds = (p.kinds || []).map((k) => KINDS.find((x) => x.id === k)).filter(Boolean).map((k) => String(k.name)).join(' · ');
        b.append(el('p', 'ch-card-kind', kinds || String(p.area || 'Visitors')), el('h2', null, String(p.name)));
        b.appendChild(el('p', 'ch-card-line', String(p.why || '')));
        const acts = el('div', 'ch-v-acts');
        if (p.stop) {
            const t = el('button', 'ch-chip', 'Train from St. Gallen');
            t.type = 'button';
            t.addEventListener('click', () => showTrip('St. Gallen', String(p.stop), 'To ' + String(p.name)));
            acts.appendChild(t);
        }
        const star = el('button', 'ch-chip ch-v-star', plan.includes(id) ? '★ In my plan' : '☆ Add to my plan');
        star.type = 'button';
        star.setAttribute('aria-pressed', String(plan.includes(id)));
        star.addEventListener('click', () => { togglePlan(id); star.textContent = plan.includes(id) ? '★ In my plan' : '☆ Add to my plan'; star.setAttribute('aria-pressed', String(plan.includes(id))); });
        const link = el('button', 'ch-chip', 'Link');
        link.type = 'button'; link.title = 'Send a link to this place';
        link.addEventListener('click', () => shareLink(pageUrl() + '#visitors/' + id, String(p.name)));
        acts.append(star, link);
        b.appendChild(acts);
        const dl = el('dl', 'ch-card-facts ch-card-facts-wide');
        row(dl, 'From St. Gallen', String(p.trip));
        if (!isOpen(p, thisMonth())) row(dl, 'Now', 'Not open in ' + MONTHS[thisMonth() - 1] + ' (see When)');
        if (p.walk) row(dl, 'On foot', String(p.walk));
        if (p.ostwind) row(dl, 'Ostwind pass', String(p.ostwind));
        if (p.extra) row(dl, 'Costs', String(p.extra));
        if (p.season) row(dl, 'When', String(p.season));
        if (p.know) row(dl, 'Good to know', String(p.know));
        const wd = el('div'), dd = el('dd', null, 'Loading…');
        wd.append(el('dt', null, 'Weather there'), dd);
        dl.appendChild(wd);
        b.appendChild(dl);
        placeWeather(p, dd);
        if (typeof p.link === 'string' && p.link.indexOf('https://') === 0) {
            const a = el('a', 'ch-card-link', 'Website');
            a.href = p.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
            b.appendChild(a);
        }
        b.appendChild(el('p', 'ch-card-src', 'Forecast: Open-Meteo (CC BY 4.0). Walks: OpenStreetMap contributors, BRouter.'));
    });
    showVRoute(id, move);
    if (move && !(vRoutes && (vRoutes.features || []).some((x) => x.properties && x.properties.id === id))) {
        mapA.flyTo({ center: [+p.lon, +p.lat], zoom: Math.max(mapA.getZoom(), 12), padding: cardPad(), duration: reduced ? 0 : 1400, essential: true });
    }
    return true;
}

/* a train trip on the map: the next connection's stops from the SBB timetable (transport.opendata.ch), joined by a
   line from stop to stop (the stations are exact, the line between them is straight) */
let tripReq = 0;
async function showTrip(from, to, title) {
    const req = ++tripReq;
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
        if (!mapA.getSource('trip')) {
            mapA.addSource('trip', { type: 'geojson', data: EMPTY });
            mapA.addLayer({ id: 'trip-line', type: 'line', source: 'trip', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#d52b1e', 'line-width': 4, 'line-opacity': 0.85 } }, 'guests-dot');
            mapA.addLayer({ id: 'trip-stop', type: 'circle', source: 'trip', filter: ['==', ['geometry-type'], 'Point'],
                            paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#d52b1e', 'circle-stroke-width': 2.5 } }, 'guests-dot');
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
        mapA.fitBounds([[w, so], [e, n]], { padding: cardPad(), duration: reduced ? 0 : 1200 });
        card((b) => {
            b.append(el('p', 'ch-card-kind', 'By train'), el('h2', null, title));
            const dl = el('dl', 'ch-card-facts');
            stops.forEach((q) => row(dl, q.time, q.name));
            b.appendChild(dl);
            b.appendChild(el('p', 'ch-card-src', 'Next connection: ' + stops[0].line + '. SBB timetable (transport.opendata.ch); the line joins the stops.'));
        });
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
    document.querySelectorAll('.ch-v-kind').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === vKind)));
    const list = $('ch-v-places');
    list.textContent = '';
    let group = -1;
    V_ORDER.filter((i) => shown(PLACES[i])).forEach((i) => {
        const g = groupOf(PLACES[i]);
        if (g !== group) { group = g; list.appendChild(el('li', 'ch-v-group', V_GROUPS[g].name)); }
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
    // the legend: one chip per kind, which also shows only that kind (tap again for all), and one for a rainy day
    const chips = $('ch-v-kinds');
    KINDS.concat([{ id: 'rain', name: 'Good in bad weather', short: 'Rainy day', colour: '#64748b' }]).forEach((k) => {
        const b = el('button', 'ch-v-kind');
        b.type = 'button'; b.dataset.kind = String(k.id); b.setAttribute('aria-pressed', 'false');
        const dot = el('span', 'ch-v-dot'); dot.style.background = String(k.colour);
        b.append(dot, el('span', null, String(k.short || k.name)));
        b.title = String(k.name);
        b.addEventListener('click', () => { vKind = vKind === k.id ? '' : String(k.id); vPlaces(); });
        chips.appendChild(b);
    });
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
        b.append(el('strong', 'ch-v-tname', String(a.name)), el('span', 'ch-v-ttext', String(a.text)), el('span', 'ch-v-show', 'Show the train on the map'));
        if (a.from && a.to) b.addEventListener('click', () => showTrip(String(a.from), String(a.to), String(a.name)));
        li.appendChild(b);
        al.appendChild(li);
    });
    const tl = $('ch-v-tickets');
    (guests.tickets || []).forEach((t) => {
        const li = el('li', 'ch-v-ticket' + (t.best ? ' ch-v-best' : ''));
        li.appendChild(el('strong', 'ch-v-tname', String(t.name)));
        const pr = el('dl', 'ch-v-prices');
        [['Adults', t.price], ['Half Fare or child', t.half]].forEach(([k, v]) => { if (v) { const d = el('div'); d.append(el('dt', null, k), el('dd', null, String(v))); pr.appendChild(d); } });
        li.append(pr, el('p', null, String(t.note)));
        tl.appendChild(li);
    });
}

/* a train's name as on the departure boards: S-Bahn lines run together (S21), the others with a space (IR 13) */
function lineName(cat, num) {
    cat = String(cat || ''); num = String(num || '');
    return /^(S|SN)$/.test(cat) || !num ? cat + num : cat + ' ' + num;
}
/* now: departures and the weather of two stations */
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
    [['STG', 'ch-v-wx-stg'], ['SAE', 'ch-v-wx-sae']].forEach(async ([id, out]) => {
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
    $('ch-visitors-close').addEventListener('click', () => { sheet('ch-visitors', false); showVisitors(false); btn.focus(); });
    document.querySelectorAll('.ch-v-tab').forEach((b) => b.addEventListener('click', () => vTab(b.dataset.tab)));
    // Visitors is the page's main view: it opens at the start (on a phone as a low sheet over the map) unless the
    // address asks for a map view or a mode of its own; the pins are on from the start and stay until turned off.
    // Links: #visitors/<place> opens that place's card, #plan=<place>,<place> offers a plan someone sent.
    const h = location.hash;
    const one = /^#visitors\/([a-z0-9]{1,24})$/.exec(h), sent = /^#plan=([a-z0-9,]{1,1600})$/.exec(h);
    if (sent) { sharedPlan = planClean(sent[1].split(',')); renderPlan(); }
    if (!h || h === '#visitors' || one || sent) {
        sheet('ch-visitors', true);
        if (matchMedia('(max-width: 900px)').matches && !one) panel.classList.add('ch-small');
        showVisitors(true);
    }
    onLoad.push(() => {
        if (layerOn.guests) visitorsLayers();
        const i = one ? placeIndex(one[1]) : -1;
        if (i >= 0) guestCard(i, true);
    });
}
