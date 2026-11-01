// Visit counter for florias-papadopoulos.github.io (a Cloudflare Worker with a D1 database bound as DB).
// It keeps daily totals only: no cookies, no IP addresses, nothing about any one visitor.
//   POST /hit    one page view, sent by the site: {"p": "/games/", "r": "google.com", "d": "phone", "b": "Firefox"}
//   GET  /stats  the totals of the last ?days=30 days, read by the site's /stats/ page
// Table (schema.sql): counts(day, kind, key, n), kind is total, page, ref, device, browser or country.
const SITE = 'https://florias-papadopoulos.github.io';
const BROWSERS = ['Firefox', 'Chrome', 'Safari', 'Edge', 'Opera', 'Other'];

function headers(extra) {
    return Object.assign({ 'Access-Control-Allow-Origin': SITE, 'Vary': 'Origin' }, extra || {});
}
function clean(s, max) { return String(s || '').replace(/[^\w\-./:%]/g, '').slice(0, max); }

export default {
    async fetch(req, env) {
        const url = new URL(req.url);
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: headers({ 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' }) });
        }
        if (url.pathname === '/hit' && req.method === 'POST') return hit(req, env);
        if (url.pathname === '/stats' && req.method === 'GET') return stats(url, env);
        return new Response('Not found', { status: 404, headers: headers() });
    }
};

async function hit(req, env) {
    const ua = req.headers.get('User-Agent') || '';
    /* only page views from the site itself, and no search engine robots */
    if (req.headers.get('Origin') !== SITE || /bot|crawl|spider|slurp|headless|preview|lighthouse/i.test(ua)) {
        return new Response(null, { status: 204, headers: headers() });
    }
    let d;
    try { d = JSON.parse(await req.text()); } catch (e) { return new Response(null, { status: 400, headers: headers() }); }
    const page = clean(d.p, 120);
    if (page.charAt(0) !== '/') return new Response(null, { status: 400, headers: headers() });
    const ref = clean(d.r, 80) || '(direct)';
    const device = d.d === 'phone' || d.d === 'tablet' ? d.d : 'desktop';
    const browser = BROWSERS.indexOf(d.b) >= 0 ? d.b : 'Other';
    const country = (req.cf && req.cf.country) || 'XX';   // worked out by Cloudflare; the IP address is never read here
    const day = new Date().toISOString().slice(0, 10);
    const add = env.DB.prepare('INSERT INTO counts (day, kind, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1');
    await env.DB.batch([['total', 'all'], ['page', page], ['ref', ref], ['device', device], ['browser', browser], ['country', country]]
        .map(function (r) { return add.bind(day, r[0], r[1]); }));
    return new Response(null, { status: 204, headers: headers() });
}

async function stats(url, env) {
    const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
    const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
    const rows = (await env.DB.prepare('SELECT day, kind, key, n FROM counts WHERE day >= ?1 ORDER BY day').bind(since).all()).results;
    const out = { since: since, days: days, daily: {}, totals: {} };
    for (const r of rows) {
        if (r.kind === 'total') out.daily[r.day] = r.n;
        else {
            const t = out.totals[r.kind] || (out.totals[r.kind] = {});
            t[r.key] = (t[r.key] || 0) + r.n;
        }
    }
    return new Response(JSON.stringify(out), { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }) });
}
