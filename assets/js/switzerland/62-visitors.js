/* Part 62: Visitors, for guests staying in St. Gallen. A sheet of its own (the suitcase in the icon row, or the link
   /switzerland/#visitors) with three tabs: Places (data/switzerland.yaml, guests; a legend of kinds that also filters,
   pins in the kind's colour, bubbles where they crowd, a card each; listed near (inside Ostwind) and far), Travel (the trains from Zurich Airport, with the
   next one drawn stop by stop from transport.opendata.ch, the Ostwind day ticket, and the Ostwind area shaded on the
   map on request: static/switzerland/ostwind.json from tools/swiss-map/make_ostwind.py), and Now: the next departures
   from St. Gallen (transport.opendata.ch) and the weather in St. Gallen and on the Säntis (MeteoSwiss, as part 60).
   St. Gallen is the base: every trip is counted from there. The map stays where it is when the sheet opens. */
const guests = facts.guests || { places: [], tickets: [] };
const KINDS = guests.kinds || [];
const kindOf = (p) => (Array.isArray(p.kinds) && p.kinds[0]) || '';
const kindColour = (id) => { const k = KINDS.find((x) => x.id === id); return k ? String(k.colour) : '#d52b1e'; };
let vKind = '';   // the chip chosen in the Places tab ('' = all)
/* the order of the list (near before far, then by first kind in the legend's order), which also numbers the pins */
const V_ORDER = (guests.places || []).map((p, i) => i).sort((a, b) => {
    const p = guests.places[a], q = guests.places[b], order = KINDS.map((k) => k.id);
    return (!!p.far - !!q.far) || order.indexOf(kindOf(p)) - order.indexOf(kindOf(q)) || a - b;
});
const vNum = [];
V_ORDER.forEach((i, k) => { vNum[i] = k; });
function guestFeatures() {
    return (guests.places || []).map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+p.lon, +p.lat] },
        properties: { i, o: vNum[i], n: String(vNum[i] + 1), name: String(p.name), colour: kindColour(kindOf(p)) } }))
        .filter((f) => !vKind || ((guests.places[f.properties.i].kinds || []).includes(vKind)));
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
    // every pin at its own place: small dots from afar, numbered pins from closer in (no bubbles that sit in between)
    showOstwind();
    mapA.addSource('guests', { type: 'geojson', data: { type: 'FeatureCollection', features: guestFeatures() } });
    mapA.addLayer({ id: 'guests-dot', type: 'circle', source: 'guests',
                    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 9.5, 5.5, 10, 11], 'circle-color': ['get', 'colour'],
                             'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2] } });
    mapA.addLayer({ id: 'guests-n', type: 'symbol', source: 'guests', minzoom: 10,
                    layout: { 'text-field': ['get', 'n'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true },
                    paint: { 'text-color': '#ffffff' } });
    mapA.addLayer({ id: 'guests-name', type: 'symbol', source: 'guests', minzoom: 11,
                    layout: { 'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 13, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-padding': 2 },
                    paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 } });
}
function showVisitors(on) {
    // the map's style must be there before layers are added (the link can open the sheet while the map loads)
    if (on && !styleReady) { onLoad.push(() => { if (!$('ch-visitors').hidden) showVisitors(true); }); return; }
    visitorsOn = on;
    // the sheet turns the place pins on; they stay when it closes (Layers, Visitor places, turns them off)
    if (on && !layerOn.guests) setLayer(LAYERS.find((d) => d.id === 'guests'), true);
    ['trip-line', 'trip-stop', 'trip-name'].forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
    // the map stays where it is: the list moves it to a place when one is chosen
    if (on) {
        vTab(vCurrent);
    } else {
        clearInterval(depTimer); depTimer = null;
    }
}

/* the Ostwind area, shaded only while its switch is on */
function showOstwind() {
    ['ostwind-fill', 'ostwind-edge'].forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', layerOn.guests && ostwindOn ? 'visible' : 'none'));
}
/* a place's card */
function guestCard(i) {
    const p = (guests.places || [])[i];
    if (!p) return false;
    card((b) => {
        const kinds = (p.kinds || []).map((id) => KINDS.find((x) => x.id === id)).filter(Boolean).map((k) => String(k.name)).join(' · ');
        b.append(el('p', 'ch-card-kind', kinds || String(p.area || 'Visitors')), el('h2', null, String(p.name)));
        b.appendChild(el('p', 'ch-card-line', String(p.why || '')));
        const dl = el('dl', 'ch-card-facts ch-card-facts-wide');
        row(dl, 'From St. Gallen', String(p.trip));
        if (p.walk) row(dl, 'On foot', String(p.walk));
        if (p.ostwind) row(dl, 'Ostwind pass', String(p.ostwind));
        if (p.extra) row(dl, 'Costs', String(p.extra));
        if (p.season) row(dl, 'When', String(p.season));
        if (p.know) row(dl, 'Good to know', String(p.know));
        b.appendChild(dl);
        if (typeof p.link === 'string' && p.link.indexOf('https://') === 0) {
            const a = el('a', 'ch-card-link', 'Website');
            a.href = p.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
            b.appendChild(a);
        }
    });
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
        if (req !== tripReq || !visitorsOn) return;
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
        mapA.getSource('trip').setData({ type: 'FeatureCollection', features: [
            { type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map((q) => [q.lon, q.lat]) }, properties: {} },
            ...stops.map((q) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [q.lon, q.lat] }, properties: { label: q.name } }))] });
        let w = 180, so = 90, e = -180, n = -90;
        stops.forEach((q) => { w = Math.min(w, q.lon); e = Math.max(e, q.lon); so = Math.min(so, q.lat); n = Math.max(n, q.lat); });
        const pad = matchMedia('(max-width: 900px)').matches ? { top: 60, bottom: Math.round(innerHeight * 0.5), left: 30, right: 60 } : { top: 60, bottom: 60, left: 380, right: 340 };
        mapA.fitBounds([[w, so], [e, n]], { padding: pad, duration: reduced ? 0 : 1200 });
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
/* the places in two groups, near (inside Ostwind) and the day trips beyond it; in each, by their first kind in the
   order of the legend */
const V_GROUPS = [{ far: false, name: 'Near, with the Ostwind pass' }, { far: true, name: 'Day trips further away (extra ticket)' }];
function vPlaces() {
    document.querySelectorAll('.ch-v-kind').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === vKind)));
    const list = $('ch-v-places');
    list.textContent = '';
    const items = V_ORDER.map((i) => ({ p: guests.places[i], i })).filter(({ p }) => !vKind || (p.kinds || []).includes(vKind));
    let group = null;
    items.forEach(({ p, i }) => {
        const g = V_GROUPS[p.far ? 1 : 0];
        if (g !== group) {
            group = g;
            list.appendChild(el('li', 'ch-v-group', g.name));
        }
        const li = el('li', 'ch-v-place');
        const btn = el('button', 'ch-v-btn');
        btn.type = 'button';
        const num = el('span', 'ch-v-num', String(vNum[i] + 1));
        num.style.background = kindColour(kindOf(p));
        const txt = el('span', 'ch-v-txt');
        txt.append(el('strong', null, String(p.name)), el('span', null, String(p.area || '')));
        btn.append(num, txt);
        btn.addEventListener('click', () => {
            mapA.flyTo({ center: [+p.lon, +p.lat], zoom: Math.max(mapA.getZoom(), 12), duration: reduced ? 0 : 1400, essential: true });
            guestCard(i);
        });
        li.appendChild(btn);
        list.appendChild(li);
    });
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
    // the legend: one chip per kind, which also shows only that kind (tap again for all)
    const chips = $('ch-v-kinds');
    KINDS.forEach((k) => {
        const b = el('button', 'ch-v-kind');
        b.type = 'button'; b.dataset.kind = String(k.id); b.setAttribute('aria-pressed', 'false');
        const dot = el('span', 'ch-v-dot'); dot.style.background = String(k.colour);
        b.append(dot, el('span', null, String(k.short || k.name)));
        b.title = String(k.name);
        b.addEventListener('click', () => { vKind = vKind === k.id ? '' : String(k.id); vPlaces(); });
        chips.appendChild(b);
    });
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
    // address asks for a place or a mode of its own; the pins are on from the start and stay until turned off
    if (!location.hash || location.hash === '#visitors') {
        sheet('ch-visitors', true);
        if (matchMedia('(max-width: 900px)').matches) panel.classList.add('ch-small');
        showVisitors(true);
    }
    onLoad.push(() => { if (layerOn.guests) visitorsLayers(); });
}
