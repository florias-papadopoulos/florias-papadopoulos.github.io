/* Part 62: Visitors, for guests staying in St. Gallen. A sheet of its own (the suitcase in the icon row, or the link
   /switzerland/#visitors) with three tabs: the places (data/switzerland.yaml, guests; numbered pins on the map, a
   card each), the Ostwind day tickets (and the Ostwind area shaded on the map: static/switzerland/ostwind.json from
   tools/swiss-map/make_ostwind.py), and now: the next departures from St. Gallen (transport.opendata.ch) and the
   weather in St. Gallen and on the Säntis (MeteoSwiss, as part 60). The map moves to the region when it opens. */
const guests = facts.guests || { places: [], tickets: [] };
let visitorsOn = false, depTimer = null, styleReady = false;
onLoad.push(() => { styleReady = true; });

function visitorsLayers() {
    if (mapA.getSource('guests')) return;
    mapA.addSource('ostwind', { type: 'geojson', data: app.dataset.ostwind });
    mapA.addLayer({ id: 'ostwind-fill', type: 'fill', source: 'ostwind', filter: ['==', ['get', 'kind'], 'area'],
                    paint: { 'fill-color': '#0d9488', 'fill-opacity': 0.16 } }, 'canton-fill');
    mapA.addLayer({ id: 'ostwind-edge', type: 'line', source: 'ostwind', filter: ['==', ['get', 'kind'], 'edge'],
                    layout: { 'line-join': 'round' }, paint: { 'line-color': '#0f766e', 'line-width': 2.5, 'line-opacity': 0.9, 'line-dasharray': [3, 2] } }, 'canton-fill');
    // pins that would touch become one bubble ("1–3"); a tap on it zooms in until they part
    mapA.addSource('guests', { type: 'geojson', cluster: true, clusterRadius: 26, clusterMaxZoom: 14,
        clusterProperties: { lo: ['min', ['get', 'i']], hi: ['max', ['get', 'i']] },
        data: { type: 'FeatureCollection', features: (guests.places || []).map((p, i) => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [+p.lon, +p.lat] }, properties: { i, n: String(i + 1), name: String(p.name) } })) } });
    mapA.addLayer({ id: 'guests-dot', type: 'circle', source: 'guests',
                    paint: { 'circle-radius': ['case', ['has', 'point_count'], 15, 11], 'circle-color': '#d52b1e', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
    mapA.addLayer({ id: 'guests-n', type: 'symbol', source: 'guests',
                    // a bubble: its numbers as a range when they follow each other, otherwise how many places it holds
                    layout: { 'text-field': ['case', ['has', 'point_count'],
                                             ['case', ['==', ['-', ['get', 'hi'], ['get', 'lo']], ['-', ['get', 'point_count'], 1]],
                                              ['concat', ['to-string', ['+', ['get', 'lo'], 1]], '–', ['to-string', ['+', ['get', 'hi'], 1]]],
                                              ['concat', ['to-string', ['get', 'point_count']], ' places']], ['get', 'n']], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true },
                    paint: { 'text-color': '#ffffff' } });
    mapA.addLayer({ id: 'guests-name', type: 'symbol', source: 'guests', minzoom: 9, filter: ['!', ['has', 'point_count']],
                    layout: { 'text-field': ['get', 'name'], 'text-font': ['Frutiger Neue Condensed Bold'], 'text-size': 13, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-padding': 2 },
                    paint: { 'text-color': '#7f1d1d', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 } });
}
function showVisitors(on) {
    // the map's style must be there before layers are added (the link can open the sheet while the map loads)
    if (on && !styleReady) { onLoad.push(() => { if (!$('ch-visitors').hidden) showVisitors(true); }); return; }
    visitorsOn = on;
    if (on) visitorsLayers();
    ['ostwind-fill', 'ostwind-edge', 'guests-dot', 'guests-n', 'guests-name'].forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
    if (on) {
        const r = guests.region || [8.45, 47.05, 9.75, 47.75];
        const pad = matchMedia('(max-width: 900px)').matches ? { top: 60, bottom: Math.round(innerHeight * 0.5), left: 20, right: 60 } : { top: 40, bottom: 40, left: 380, right: 60 };
        mapA.fitBounds([[r[0], r[1]], [r[2], r[3]]], { padding: pad, pitch: threeD ? 50 : 0, duration: reduced ? 0 : 1200 });
        vTab(vCurrent);
    } else {
        clearInterval(depTimer); depTimer = null;
    }
}

/* a place's card */
function guestCard(i) {
    const p = (guests.places || [])[i];
    if (!p) return false;
    card((b) => {
        b.append(el('p', 'ch-card-kind', String(p.area || 'Visitors')), el('h2', null, String(p.name)));
        b.appendChild(el('p', 'ch-card-line', String(p.why || '')));
        const dl = el('dl', 'ch-card-facts ch-card-facts-wide');
        row(dl, 'From St. Gallen', String(p.trip));
        if (p.ostwind) row(dl, 'Ostwind pass', String(p.ostwind));
        if (p.extra) row(dl, 'Also', String(p.extra));
        if (p.season) row(dl, 'When', String(p.season));
        b.appendChild(dl);
        if (typeof p.link === 'string' && p.link.indexOf('https://') === 0) {
            const a = el('a', 'ch-card-link', 'Website');
            a.href = p.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
            b.appendChild(a);
        }
    });
    return true;
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
    const list = $('ch-v-places');
    let area = '';
    (guests.places || []).forEach((p, i) => {
        if (p.area !== area) { area = p.area; list.appendChild(el('li', 'ch-v-group', String(area))); }
        const li = el('li', 'ch-v-place');
        const btn = el('button', 'ch-v-btn');
        btn.type = 'button';
        const num = el('span', 'ch-v-num', String(i + 1));
        const txt = el('span', 'ch-v-txt');
        txt.append(el('strong', null, String(p.name)), el('span', null, String(p.trip)));
        btn.append(num, txt);
        btn.addEventListener('click', () => {
            mapA.flyTo({ center: [+p.lon, +p.lat], zoom: Math.max(mapA.getZoom(), 12), duration: reduced ? 0 : 1400, essential: true });
            guestCard(i);
        });
        li.appendChild(btn);
        list.appendChild(li);
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
    // the link for guests
    if (location.hash === '#visitors') { sheet('ch-visitors', true); showVisitors(true); }
}
