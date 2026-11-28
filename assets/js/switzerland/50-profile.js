/* Part 50: the elevation profile. While it is on, each tap on the map adds a point; from two points on, swisstopo's
   profile service (api3.geo.admin.ch, heights of swissALTI3D and DHM25) returns the heights along the line, and the
   panel shows the profile, the distance, the climb and descent and a walking time. The walking time follows the
   German hiking standard DIN 33466 (4 km/h on the flat, 300 m an hour up, 500 m an hour down; the larger of the
   horizontal and vertical times plus half the smaller): an estimate for a fit walker without breaks. */
let profilePts = [], profileData = null, profileReq = 0, profileAbort = null;

function setProfile(on) {
    if (on === (mode === 'profile')) return;
    if (on) {
        only('profile');
        mode = 'profile';
        closeCard();
        toast('Tap the map to add points along your route.', 3200);
    } else {
        mode = null;
        if (profileAbort) profileAbort.abort();
        profilePts = []; profileData = null;
        drawProfileLine();
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
    fetchProfile();
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
    drawProfileLine();
    profileData = null;
    renderProfile();
    if (profilePts.length < 2) return;
    profileAbort = new AbortController();
    const geom = JSON.stringify({ type: 'LineString', coordinates: profilePts.map((c) => toLV95(c[0], c[1]).map((v) => Math.round(v * 10) / 10)) });
    $('ch-pf-state').textContent = 'Measuring…';
    try {
        const url = API + 'profile.json?sr=2056&nb_points=300&distinct_points=true&geom=' + encodeURIComponent(geom);
        const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: profileAbort.signal });
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
    svg.toggleAttribute('hidden', !profileData);
    stats.hidden = !profileData;
    if (!profileData) {
        if (profilePts.length < 2) state.textContent = profilePts.length ? 'Add one more point.' : 'Tap the map to start a route.';
        return;
    }
    state.textContent = '';
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
        drawCursor(fromLV95(best.e, best.n));
    };
    let raf = 0, lastX = 0;
    svg.onpointermove = (e) => { lastX = e.clientX; if (!raf) raf = requestAnimationFrame(() => { raf = 0; at(lastX); }); };
    svg.onpointerdown = (e) => at(e.clientX);
    svg.onpointerleave = () => { dot.setAttribute('cx', -10); $('ch-pf-at').textContent = ''; drawCursor(null); };
    const hm = Math.round(s.hours * 60), hh = Math.floor(hm / 60), mm = hm % 60;
    [['Distance', (s.km < 10 ? s.km.toFixed(1) : Math.round(s.km)) + ' km'], ['Climb', fmt(s.up) + ' m'], ['Descent', fmt(s.down) + ' m'],
     ['Highest', fmt(s.max) + ' m'], ['Walking time', (hh ? hh + ' h ' : '') + mm + ' min']].forEach(([k, v]) => row(stats, k, v));
}

function wireProfile() {
    $('ch-profile').addEventListener('click', () => setProfile(mode !== 'profile'));
    $('ch-profile-close').addEventListener('click', () => setProfile(false));
    $('ch-pf-undo').addEventListener('click', () => { profilePts.pop(); fetchProfile(); });
    $('ch-pf-clear').addEventListener('click', () => { profilePts = []; fetchProfile(); });
}
