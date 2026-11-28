/* Part 50: Route. While it is on, each tap on the map adds a point. From two points on, the page asks BRouter (a free
   route planner, brouter.de, profile "hiking-mountain", map data OpenStreetMap) for up to three different routes
   along paths and trails through those points, one request after the other (the public server refuses parallel
   work). Each route is drawn section by section in the colours of the Swiss trail signs, from the paths' difficulty
   grades in OpenStreetMap (sac_scale): yellow for hiking trails (T1, and sections without a grade), white-red-white
   for mountain trails (T2, T3), white-blue-white for alpine routes (T4 to T6). The official closures and diversions
   of the hiking trails (ASTRA / SwitzerlandMobility, through swisstopo's api3 service) are looked up around the
   routes; a route that passes within 40 m of a closure is flagged. If BRouter cannot answer, the straight line
   between the points is measured instead (swisstopo's profile service), as before.
   The chart shows the chosen route's heights (BRouter's elevation model; swisstopo's for the straight line), the
   panel its distance, climb and descent and a walking time after the German hiking standard DIN 33466 (4 km/h on the
   flat, 300 m an hour up, 500 m an hour down; the larger of the horizontal and vertical times plus half the smaller):
   an estimate for a fit walker without breaks. */
let profilePts = [], profileData = null, profileReq = 0, profileAbort = null;
let routes = [], routeSel = 0, closures = [], routeNote = '', profileWait = 0;
const BROUTER = 'https://brouter.de/brouter';
const DIFF_COLOUR = { 1: '#f2c200', 2: '#e2001a', 3: '#1f5fbf' };

function setProfile(on) {
    if (on === (mode === 'profile')) return;
    if (on) {
        only('profile');
        mode = 'profile';
        closeCard();
        toast('Tap the map to add points along your route.', 3200);
    } else {
        mode = null;
        profileReq++;
        if (profileAbort) profileAbort.abort();
        clearTimeout(profileWait);
        profilePts = []; profileData = null; routes = []; closures = []; routeNote = '';
        drawProfileLine();
        drawRoutes();
        mapA.getCanvas().style.cursor = '';
    }
    $('ch-profile').setAttribute('aria-pressed', String(on));
    tools();
    $('ch-profile-panel').hidden = !on;
    renderProfile();
}
modes.profile = { on: () => mode === 'profile', off: () => setProfile(false) };

function profileAdd(ll) {
    if (profilePts.length >= 40) { toast('A route can have at most 40 points.'); return; }
    profilePts.push([ll.lng, ll.lat]);
    // the volunteers' route server is asked once the taps pause (0.4 s), not after each of a quick series
    if (profileAbort) { profileAbort.abort(); profileAbort = null; }
    profileReq++;
    drawProfileLine();
    clearTimeout(profileWait);
    profileWait = setTimeout(fetchProfile, 400);
}
function drawProfileLine() {
    const f = profilePts.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { kind: 'pt' } }));
    if (profilePts.length > 1) f.unshift({ type: 'Feature', geometry: { type: 'LineString', coordinates: profilePts }, properties: {} });
    mapA.getSource('profile').setData({ type: 'FeatureCollection', features: f });
    drawCursor(null);
}
/* the point on the map that matches the place pointed at on the chart: a source of its own, one point */
function drawCursor(c) {
    mapA.getSource('pin2').setData(c ? { type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { kind: 'cursor' } } : EMPTY);
}
async function fetchProfile() {
    const id = ++profileReq;   // any answer still on its way is now out of date
    if (profileAbort) { profileAbort.abort(); profileAbort = null; }
    profileData = null; routes = []; closures = []; routeSel = 0; routeNote = '';
    drawProfileLine();
    drawRoutes();
    renderProfile();
    if (profilePts.length < 2) return;
    profileAbort = new AbortController();
    const signal = profileAbort.signal;
    $('ch-pf-state').textContent = 'Finding routes along the trails…';
    // up to three routes, one after the other; the first is shown as soon as it is there
    for (let alt = 0; alt < 3; alt++) {
        let r = null;
        for (let attempt = 0; attempt < 2 && !r; attempt++) {
            try { r = await brouter(alt, signal); } catch (e) {
                if (signal.aborted) return;   // a newer request, or Route closed (a timeout is retried)
                if (attempt === 0) await new Promise((ok) => setTimeout(ok, 1200));
            }
            if (id !== profileReq) return;
        }
        if (!r) break;
        // a route that is nearly the same as one already found is not offered again
        if (routes.some((q) => Math.abs(q.km - r.km) < 0.05 * r.km && Math.abs(q.up - r.up) < 0.1 * Math.max(50, r.up))) continue;
        routes.push(r);
        if (routes.length === 1) selectRoute(0); else { drawRoutes(); renderProfile(); }
    }
    if (id !== profileReq) return;
    // the closures once all routes are in, so each of them is checked
    if (routes.length) { drawRoutes(); renderProfile(); lookClosures(id, signal); return; }
    routeNote = 'The trail route finder did not answer, so this is the straight line between your points.';
    await fetchStraight(id, signal);
}
/* one route from BRouter, cut into sections by difficulty */
async function brouter(alt, signal) {
    const ll = profilePts.map((c) => c[0].toFixed(5) + ',' + c[1].toFixed(5)).join('|');
    // the volunteers' server can hang: after 20 s the request is given up (and retried, then the straight line)
    const ac = new AbortController(), stop = () => ac.abort(), timer = setTimeout(stop, 20000);
    signal.addEventListener('abort', stop);
    let text;
    try {
        const res = await fetch(BROUTER + '?lonlats=' + ll + '&profile=hiking-mountain&alternativeidx=' + alt + '&format=geojson',
                                { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac.signal });
        if (!res.ok) throw new Error(res.status);
        text = await res.text();
    } finally { clearTimeout(timer); signal.removeEventListener('abort', stop); }
    if (text.charAt(0) !== '{') throw new Error('busy');   // e.g. "operation killed by thread-priority-watchdog"
    const f = (JSON.parse(text).features || [])[0];
    const coords = f && f.geometry && f.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2 || coords.length > 50000) throw new Error('empty');
    const msgs = (f.properties && Array.isArray(f.properties.messages)) ? f.properties.messages.slice(1) : [];
    // the difficulty of each piece: the messages list where the way's tags change (their end points, in millionths)
    const ends = msgs.map((m) => {
        const tags = {};
        String(m[9] || '').split(' ').forEach((t) => { const k = t.indexOf('='); if (k > 0) tags[t.slice(0, k)] = t.slice(k + 1); });
        const sc = tags.sac_scale || '';
        const diff = /alpine/.test(sc) ? 3 : /mountain/.test(sc) ? 2 : 1;
        return { lon: Number(m[0]) / 1e6, lat: Number(m[1]) / 1e6, diff };
    });
    const pts = [], segs = [];
    let e = 0, d = 0, cur = null;
    for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        if (!isFinite(c[0]) || !isFinite(c[1])) continue;
        if (i) d += metres(coords[i - 1], c);
        while (e < ends.length - 1 && Math.abs(ends[e].lon - c[0]) < 2e-6 && Math.abs(ends[e].lat - c[1]) < 2e-6 && i > 0) e++;
        const diff = ends.length ? ends[Math.min(e, ends.length - 1)].diff : 1;
        if (!cur || cur.diff !== diff) {
            if (cur) cur.coords.push([c[0], c[1]]);
            cur = { diff, coords: [] };
            segs.push(cur);
        }
        cur.coords.push([c[0], c[1]]);
        pts.push({ d, h: Number(c[2]), lon: c[0], lat: c[1] });
    }
    const clean = pts.filter((q) => isFinite(q.h));
    if (clean.length < 2) throw new Error('heights');
    const st = profileStats(clean);
    const byDiff = { 1: 0, 2: 0, 3: 0 };
    segs.forEach((g) => { for (let k = 1; k < g.coords.length; k++) byDiff[g.diff] += metres(g.coords[k - 1], g.coords[k]); });
    return { pts: clean, segs, km: st.km, up: st.up, hours: st.hours, byDiff, closed: [] };
}
function metres(a, b) {
    const k = Math.PI / 180, x = (b[0] - a[0]) * k * Math.cos((a[1] + b[1]) / 2 * k), y = (b[1] - a[1]) * k;
    return Math.sqrt(x * x + y * y) * 6371000;
}
function selectRoute(i) {
    if (!routes[i]) return;
    routeSel = i;
    profileData = routes[i].pts;
    drawRoutes();
    renderProfile();
}
/* the routes on the map: the others thin and grey, the chosen one in the trail sign colours */
function drawRoutes() {
    if (!mapA) return;
    if (!mapA.getSource('routes')) {
        mapA.addSource('routes', { type: 'geojson', data: EMPTY });
        mapA.addSource('closures', { type: 'geojson', data: EMPTY });
        const before = 'profile-pts';
        mapA.addLayer({ id: 'rt-closed', type: 'line', source: 'closures', layout: { 'line-cap': 'round' },
                        paint: { 'line-color': ['case', ['==', ['get', 'kind'], 'closed_way'], '#b91c1c', '#d97706'], 'line-width': 5,
                                 'line-dasharray': [1, 1.2], 'line-opacity': 0.9 } }, before);
        // from a tapped point to where the route meets the nearest path
        mapA.addLayer({ id: 'rt-link', type: 'line', source: 'routes', filter: ['==', ['get', 'link'], true],
                        paint: { 'line-color': '#374151', 'line-width': 1.5, 'line-dasharray': [2, 2] } }, before);
        mapA.addLayer({ id: 'rt-other', type: 'line', source: 'routes', filter: ['all', ['!=', ['get', 'sel'], true], ['!', ['has', 'link']]], layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#4b5563', 'line-width': 4, 'line-opacity': 0.55 } }, before);
        mapA.addLayer({ id: 'rt-case', type: 'line', source: 'routes', filter: ['==', ['get', 'sel'], true], layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': ['case', ['==', ['get', 'diff'], 1], '#6b5a00', '#ffffff'], 'line-width': ['case', ['==', ['get', 'diff'], 1], 7, 8] } }, before);
        mapA.addLayer({ id: 'rt-fill', type: 'line', source: 'routes', filter: ['==', ['get', 'sel'], true], layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': ['match', ['get', 'diff'], 1, DIFF_COLOUR[1], 2, DIFF_COLOUR[2], DIFF_COLOUR[3]],
                                 'line-width': ['case', ['==', ['get', 'diff'], 1], 5, 3] } }, before);
    }
    const f = [];
    routes.forEach((r, i) => r.segs.forEach((g) => f.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: g.coords },
                                                          properties: { r: i, diff: g.diff, sel: i === routeSel } })));
    const r = routes[routeSel];
    if (r && profilePts.length > 1) {
        const a = r.pts[0], b = r.pts[r.pts.length - 1], p0 = profilePts[0], p1 = profilePts[profilePts.length - 1];
        [[p0, [a.lon, a.lat]], [p1, [b.lon, b.lat]]].forEach(([x, y]) => { if (metres(x, y) > 15) f.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [x, y] }, properties: { link: true } }); });
    }
    mapA.getSource('routes').setData({ type: 'FeatureCollection', features: f });
    mapA.getSource('closures').setData({ type: 'FeatureCollection', features: closures });
    // with routes, the straight line between the points is not drawn
    mapA.setLayoutProperty('profile-line', 'visibility', routes.length ? 'none' : 'visible');
    credits();
}
/* the official closures and diversions around the routes (ASTRA, through api3); a route within 40 m of one is flagged */
async function lookClosures(id, signal) {
    try {
        const all = routes.length ? routes : [];
        let w = 180, s = 90, e = -180, n = -90;
        profilePts.forEach((c) => { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); });
        all.forEach((r) => r.pts.forEach((q) => { w = Math.min(w, q.lon); e = Math.max(e, q.lon); s = Math.min(s, q.lat); n = Math.max(n, q.lat); }));
        const [x1, y1] = toLV95(w - 0.02, s - 0.02), [x2, y2] = toLV95(e + 0.02, n + 0.02);
        const base = API + 'api/MapServer/identify?geometryType=esriGeometryEnvelope&geometry=' + [x1, y1, x2, y2].map(Math.round).join(',') +
            '&sr=2056&layers=all:ch.astra.wanderland-sperrungen_umleitungen&tolerance=0&returnGeometry=true&geometryFormat=geojson&limit=50&lang=en';
        // api3 gives 50 at a time; up to four pages, and at most 20 000 points of closures in all
        const found = [];
        let left = 20000;
        for (let page = 0; page < 4; page++) {
            const res = await fetch(base + '&offset=' + page * 50, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
            if (!res.ok) throw new Error(res.status);
            const d = await res.json();
            if (id !== profileReq) return;
            const got = Array.isArray(d.results) ? d.results : [];
            got.forEach((r) => {
                const p = r.properties || {}, g = r.geometry || {};
                const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
                const ll = [];
                lines.forEach((l) => {
                    if (!Array.isArray(l) || left <= 0) return;
                    const q = l.slice(0, left).filter((c) => Array.isArray(c) && isFinite(c[0]) && isFinite(c[1])).map((c) => fromLV95(c[0], c[1]));
                    left -= q.length;
                    if (q.length > 1) ll.push(q);
                });
                if (ll.length) found.push({ type: 'Feature', geometry: { type: 'MultiLineString', coordinates: ll },
                                            properties: { kind: String(p.sperrungen_type || ''), title: String(p.title_en || p.title_de || ''),
                                                          reason: String(p.reason_en || ''), until: String(p.duration_en || ''), type: String(p.sperrungen_type_en || '') } });
            });
            if (got.length < 50 || left <= 0) break;
        }
        closures = found;
        markClosed();
        drawRoutes();
        renderProfile();
    } catch (e) { /* no closures shown then */ }
}
function markClosed() {
    // each closed way is compared only with the route points inside its box, widened by about 50 m
    const boxes = closures.filter((c) => c.properties.kind === 'closed_way').map((c) => {
        let w = 180, s = 90, e = -180, n = -90;
        c.geometry.coordinates.forEach((l) => l.forEach((a) => { w = Math.min(w, a[0]); e = Math.max(e, a[0]); s = Math.min(s, a[1]); n = Math.max(n, a[1]); }));
        return { c, w: w - 0.0007, e: e + 0.0007, s: s - 0.0005, n: n + 0.0005 };
    });
    routes.forEach((r) => {
        r.closed = boxes.filter((b) => {
            const near = r.pts.filter((q) => q.lon >= b.w && q.lon <= b.e && q.lat >= b.s && q.lat <= b.n);
            if (!near.length) return false;
            // route points near the closure's segments, and the closure's points near the route's steps (a short closure between two route points)
            if (b.c.geometry.coordinates.some((l) => l.some((a, k) => k && near.some((q) => nearSeg([q.lon, q.lat], l[k - 1], a) < 40)))) return true;
            return r.pts.some((q, j) => j && (near.includes(q) || near.includes(r.pts[j - 1])) &&
                               b.c.geometry.coordinates.some((l) => l.some((a) => nearSeg(a, [r.pts[j - 1].lon, r.pts[j - 1].lat], [q.lon, q.lat]) < 40)));
        }).map((b) => b.c);
    });
}
/* metres from a point to a short segment (flat Earth, fine over a few hundred metres) */
function nearSeg(p, a, b) {
    const k = Math.PI / 180, cx = Math.cos(p[1] * k) * 6371000 * k, cy = 6371000 * k;
    const ax = (a[0] - p[0]) * cx, ay = (a[1] - p[1]) * cy, bx = (b[0] - p[0]) * cx, by = (b[1] - p[1]) * cy;
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = clamp(-(ax * dx + ay * dy) / L, 0, 1);
    return Math.hypot(ax + t * dx, ay + t * dy);
}
/* the straight line between the points, measured by swisstopo (the fallback) */
async function fetchStraight(id, signal) {
    const geom = JSON.stringify({ type: 'LineString', coordinates: profilePts.map((c) => toLV95(c[0], c[1]).map((v) => Math.round(v * 10) / 10)) });
    $('ch-pf-state').textContent = 'Measuring…';
    drawRoutes();
    try {
        const url = API + 'profile.json?sr=2056&nb_points=300&distinct_points=true&geom=' + encodeURIComponent(geom);
        const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
        if (!res.ok) throw new Error(res.status);
        const pts = await res.json();
        if (id !== profileReq) return;
        const clean = (Array.isArray(pts) ? pts : []).map((p) => ({
            d: Number(p.dist), h: Number(p.alts && (p.alts.COMB != null ? p.alts.COMB : p.alts.DTM25)), e: Number(p.easting), n: Number(p.northing)
        })).filter((p) => isFinite(p.d) && isFinite(p.h) && isFinite(p.e) && isFinite(p.n));
        if (clean.length < 2) throw new Error('empty');
        profileData = clean;
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        profileData = null;
        $('ch-pf-state').textContent = 'The heights could not be loaded (outside Switzerland, or no connection).';
        return;
    }
    renderProfile();
}
function profileStats(p) {
    let up = 0, down = 0, ref = p[0].h, max = -Infinity, min = Infinity;
    // climb and descent with a 3 m threshold, so the small ripples of a 2 m model do not add up
    p.forEach((q) => {
        max = Math.max(max, q.h); min = Math.min(min, q.h);
        const diff = q.h - ref;
        if (diff >= 3) { up += diff; ref = q.h; } else if (diff <= -3) { down -= diff; ref = q.h; }
    });
    const km = p[p.length - 1].d / 1000;
    const tH = km / 4, tV = up / 300 + down / 500;
    const hours = Math.max(tH, tV) + Math.min(tH, tV) / 2;
    return { km, up, down, max, min, hours };
}
function renderProfile() {
    const svg = $('ch-pf-svg'), stats = $('ch-pf-stats'), state = $('ch-pf-state');
    svg.textContent = '';
    stats.textContent = '';
    $('ch-pf-undo').disabled = !profilePts.length;
    $('ch-pf-clear').disabled = !profilePts.length;
    // the chart takes room only once there is something to draw: before that the panel is just the hint and buttons
    routeChooser();   // also empties the choices, warnings and legend of routes that are gone
    svg.toggleAttribute('hidden', !profileData);
    stats.hidden = !profileData;
    if (!profileData) {
        if (profilePts.length < 2) state.textContent = profilePts.length ? 'Add one more point.' : 'Tap the map to start a route.';
        return;
    }
    state.textContent = routeNote;
    const p = profileData, s = profileStats(p);
    const W = 600, H = 150, L = 44, B = 22, T = 8;
    const maxD = p[p.length - 1].d || 1, lo = Math.floor((s.min - 20) / 50) * 50, hi = Math.ceil((s.max + 20) / 50) * 50;
    const X = (d) => L + (d / maxD) * (W - L - 6), Y = (h) => T + (1 - (h - lo) / (hi - lo || 1)) * (H - T - B);
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k])); return e; };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    [lo, (lo + hi) / 2, hi].forEach((h) => {
        svg.appendChild(mk('line', { x1: L, x2: W - 6, y1: Y(h), y2: Y(h), class: 'ch-pf-grid' }));
        const t = mk('text', { x: L - 6, y: Y(h) + 4, class: 'ch-pf-axis', 'text-anchor': 'end' });
        t.textContent = fmt(h);
        svg.appendChild(t);
    });
    const tEnd = mk('text', { x: W - 6, y: H - 6, class: 'ch-pf-axis', 'text-anchor': 'end' });
    tEnd.textContent = (s.km < 10 ? s.km.toFixed(1) : Math.round(s.km)) + ' km';
    svg.appendChild(tEnd);
    const line = p.map((q, i) => (i ? 'L' : 'M') + X(q.d).toFixed(1) + ' ' + Y(q.h).toFixed(1)).join('');
    svg.appendChild(mk('path', { d: line + 'L' + X(maxD) + ' ' + (H - B) + 'L' + L + ' ' + (H - B) + 'Z', class: 'ch-pf-area' }));
    svg.appendChild(mk('path', { d: line, class: 'ch-pf-line' }));
    const dot = mk('circle', { r: 5, class: 'ch-pf-dot', cx: -10, cy: -10 });
    svg.appendChild(dot);
    // pointing at the profile shows that place on the map
    const at = (clientX) => {
        const r = svg.getBoundingClientRect();
        const d = clamp((clientX - r.left) / r.width * W - L, 0, W - L - 6) / (W - L - 6) * maxD;
        let best = p[0];
        for (const q of p) { if (Math.abs(q.d - d) < Math.abs(best.d - d)) best = q; }
        dot.setAttribute('cx', X(best.d)); dot.setAttribute('cy', Y(best.h));
        $('ch-pf-at').textContent = (best.d / 1000).toFixed(1) + ' km · ' + fmt(best.h) + ' m';
        drawCursor(best.lon != null ? [best.lon, best.lat] : fromLV95(best.e, best.n));
    };
    let raf = 0, lastX = 0;
    svg.onpointermove = (e) => { lastX = e.clientX; if (!raf) raf = requestAnimationFrame(() => { raf = 0; at(lastX); }); };
    svg.onpointerdown = (e) => at(e.clientX);
    svg.onpointerleave = () => { dot.setAttribute('cx', -10); $('ch-pf-at').textContent = ''; drawCursor(null); };
    const hm = Math.round(s.hours * 60), hh = Math.floor(hm / 60), mm = hm % 60;
    [['Distance', (s.km < 10 ? s.km.toFixed(1) : Math.round(s.km)) + ' km'], ['Climb', fmt(s.up) + ' m'], ['Descent', fmt(s.down) + ' m'],
     ['Highest', fmt(s.max) + ' m'], ['Walking time', (hh ? hh + ' h ' : '') + mm + ' min']].forEach(([k, v]) => row(stats, k, v));
}
/* the routes to choose from, each with its length, time, difficulty mix and a closure warning */
function routeChooser() {
    const box = $('ch-rt-list'), warn = $('ch-rt-warn');
    box.textContent = ''; warn.textContent = '';
    box.hidden = !routes.length;
    $('ch-rt-legend').hidden = !routes.length;
    routes.forEach((r, i) => {
        const b = el('button', 'ch-rt-opt');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(i === routeSel));
        const hm = Math.round(r.hours * 60);
        b.append(el('strong', null, 'Route ' + (i + 1)), el('span', null, (r.km < 10 ? r.km.toFixed(1) : Math.round(r.km)) + ' km · ' + Math.floor(hm / 60) + ' h ' + (hm % 60) + ' min'));
        const bar = el('span', 'ch-rt-bar');
        const tot = r.byDiff[1] + r.byDiff[2] + r.byDiff[3] || 1;
        [1, 2, 3].forEach((k) => { if (r.byDiff[k] > 0) { const q = el('i'); q.style.background = DIFF_COLOUR[k]; q.style.width = (100 * r.byDiff[k] / tot) + '%'; bar.appendChild(q); } });
        b.appendChild(bar);
        if (r.closed.length) b.appendChild(el('span', 'ch-rt-closed', 'Closure on the way'));
        b.addEventListener('click', () => selectRoute(i));
        box.appendChild(b);
    });
    const r = routes[routeSel];
    if (r && r.closed.length) {
        r.closed.forEach((c) => {
            const p = c.properties;
            warn.appendChild(el('p', null, p.type + ': ' + p.title + (p.reason ? ' (' + p.reason + ')' : '') + (p.until ? ', ' + p.until : '') + '.'));
        });
    }
}

function wireProfile() {
    $('ch-profile').addEventListener('click', () => setProfile(mode !== 'profile'));
    $('ch-profile-close').addEventListener('click', () => setProfile(false));
    $('ch-pf-undo').addEventListener('click', () => { clearTimeout(profileWait); profilePts.pop(); fetchProfile(); });
    $('ch-pf-clear').addEventListener('click', () => { clearTimeout(profileWait); profilePts = []; fetchProfile(); });
}
