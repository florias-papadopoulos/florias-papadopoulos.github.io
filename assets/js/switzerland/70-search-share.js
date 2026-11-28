/* Part 70: search and the view in the address. Search asks swisstopo's search service (api3.geo.admin.ch, place names,
   addresses, municipalities) as the visitor types, and flies to the chosen place with a red pin. The address of the page
   carries the view (#lat,lon,zoom,bearing,pitch,map[,3d]) and updates as the map moves, so a copied link opens the
   map there again. */
let searchAbort = null, searchTimer = null, results = [];
const ZOOM_BY_ORIGIN = { kantone: 9, district: 10, gg25: 12.5, zipcode: 13, gazetteer: 14, sn25: 14, address: 17, parcel: 17 };

function plain(html) {
    // the service marks the match with <b>; parse it as inert text (DOMParser runs no scripts) and keep only the text
    try { return new DOMParser().parseFromString(String(html), 'text/html').body.textContent.trim(); }
    catch (e) { return String(html).replace(/<[^>]*>/g, ''); }
}
/* what most visitors look for comes first: summits, lakes, glaciers, passes, valleys and towns, then the rest in the
   service's own order (small places of the same name, addresses) */
const FIRST = /\b(peak|summit|lake|glacier|pass|valley|waterfall|gorge|viewpoint|massif)\b/i;
/* the service's labels: "Matterhorn Mont Cervin|Monte Cervino () - " becomes "Matterhorn / Mont Cervin / Monte Cervino" */
function tidy(t) {
    return t.replace(/^Alpin peak\b/, 'Alpine peak').replace(/\|/g, ' / ').replace(/\s*\(\)\s*-?\s*$/, '').replace(/\s+-\s*$/, '').replace(/\s+/g, ' ').trim();
}
function rankOf(a, i) {
    const kind = plain(a.label);
    if (FIRST.test(kind)) return i;
    if (a.origin === 'gg25' || a.origin === 'kantone' || a.origin === 'district') return 10 + i;
    return 20 + i;
}
async function search(q) {
    const list = $('ch-results');
    if (searchAbort) searchAbort.abort();
    if (q.length < 2) { results = []; list.hidden = true; list.textContent = ''; return; }
    searchAbort = new AbortController();
    try {
        const url = API + 'api/SearchServer?type=locations&sr=4326&limit=20&lang=en&searchText=' + encodeURIComponent(q.slice(0, 80));
        const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: searchAbort.signal });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        results = (data && Array.isArray(data.results) ? data.results : []).map((r) => r && r.attrs).filter((a) => a && isFinite(a.lon) && isFinite(a.lat))
            .map((a, i) => ({ label: tidy(plain(a.label)), lon: +a.lon, lat: +a.lat, zoom: own(ZOOM_BY_ORIGIN, a.origin) ? ZOOM_BY_ORIGIN[a.origin] : 14, rank: rankOf(a, i) }))
            .sort((x, y) => x.rank - y.rank).slice(0, 8);
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        results = [];
    }
    list.textContent = '';
    results.forEach((r, i) => {
        const li = el('li');
        const b = el('button', 'ch-result', r.label);
        b.type = 'button';
        b.id = 'ch-result-' + i;
        b.addEventListener('click', () => pick(i));
        li.appendChild(b);
        list.appendChild(li);
    });
    if (!results.length) list.appendChild(el('li', 'ch-noresult', 'Nothing found'));
    list.hidden = false;
}
function pick(i) {
    const r = results[i];
    if (!r) return;
    $('ch-results').hidden = true;
    $('ch-search').value = r.label;
    $('ch-search').blur();
    $('ch-search-box').hidden = true;
    $('ch-search-btn').setAttribute('aria-expanded', 'false');
    mapA.getSource('pin').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lon, r.lat] }, properties: {} }] });
    mapA.flyTo({ center: [r.lon, r.lat], zoom: r.zoom, duration: reduced ? 0 : 2400, essential: true });
}

/* ---------- the view in the address ---------- */
function readHash() {
    const m = /^#(-?\d{1,2}(?:\.\d{1,7})?),(-?\d{1,3}(?:\.\d{1,7})?),(\d{1,2}(?:\.\d{1,4})?),(-?\d{1,3}(?:\.\d{1,4})?),(\d{1,2}(?:\.\d{1,4})?),([a-z]{1,12})(,3d)?$/.exec(location.hash);
    if (!m) return null;
    const lat = +m[1], lon = +m[2];
    if (lat < AREA[1] || lat > AREA[3] || lon < AREA[0] || lon > AREA[2]) return null;
    return { center: [lon, lat], zoom: clamp(+m[3], 5.6, 19), bearing: +m[4] % 360, pitch: clamp(+m[5], 0, 80),
             base: own(BASES, m[6]) ? m[6] : 'map', threeD: !!m[7] };
}
let hashTimer = null;
function writeHash() {
    // the guests' link (#visitors) stays in the address while their sheet is open, so a reload opens it again
    if (!mapA || (typeof visitorsOn !== 'undefined' && visitorsOn)) return;
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
        const c = mapA.getCenter();
        const h = '#' + c.lat.toFixed(5) + ',' + c.lng.toFixed(5) + ',' + mapA.getZoom().toFixed(2) + ',' +
                  Math.round(mapA.getBearing()) + ',' + Math.round(mapA.getPitch()) + ',' + base + (threeD ? ',3d' : '');
        if (h !== location.hash) history.replaceState(null, '', location.pathname + location.search + h);
    }, 400);
}
onLoad.push((view) => {
    if (view) {
        if (view.threeD) terrainSource().catch(() => {});
        if (view.base !== base) setBase(view.base);
        if (view.threeD) set3D(true, { fly: false });
    }
    mapA.on('moveend', writeHash);
});

function wireSearch() {
    const input = $('ch-search'), list = $('ch-results'), btn = $('ch-search-btn'), box = $('ch-search-box');
    const open = (on) => {
        box.hidden = !on;
        btn.setAttribute('aria-expanded', String(on));
        if (on) input.focus(); else { list.hidden = true; }
    };
    btn.addEventListener('click', () => open(box.hidden));
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !input.value) { open(false); btn.focus(); } });
    input.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { searchTimer = null; search(input.value.trim()); }, 250);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; search(input.value.trim()).then(() => { if (results.length) pick(0); }); }
            else if (results.length) pick(0);
        }
        else if (e.key === 'Escape') { list.hidden = true; }
        else if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); list.hidden = false; $('ch-result-0').focus(); }
    });
    list.addEventListener('keydown', (e) => {
        const items = [...list.querySelectorAll('.ch-result')], i = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? items[i - 1] : input).focus(); }
        if (e.key === 'Escape') { list.hidden = true; input.focus(); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.ch-search-box')) list.hidden = true; });
}
