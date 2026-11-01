// Visit counter for florias-papadopoulos.github.io (a Cloudflare Worker with a D1 database bound as DB).
// It keeps daily totals only: no cookies, no IP addresses, nothing about any one visitor.
//   POST /hit    one page view, sent by the site: {"p": "/games/", "r": "google.com", "d": "phone", "b": "Firefox"}
//   GET  /stats  the totals of the last ?days=30 days, read by the site's /stats/ page
//   GET  /whoami the country this request would be counted under (for the /you/ page; nothing is stored)
//   POST /seen   for the lesson on /you/: sends back what reached the server with this request (IP address, Cloudflare's
//                location and network data, two headers, and the posted {"fp", "vid", "n"}); stores and logs nothing
// Table (schema.sql): counts(day, kind, key, n), kind is total, page, ref, device, browser or country.
const SITE = 'https://florias-papadopoulos.github.io';
const BROWSERS = ['Firefox', 'Chrome', 'Safari', 'Edge', 'Opera', 'Other'];
const TOP = 40;   // /stats lists at most this many pages, referrers, countries... (keeps the answer small whatever is sent)

function headers(extra) {
    return Object.assign({ 'Access-Control-Allow-Origin': SITE, 'Vary': 'Origin' }, extra || {});
}

export default {
    async fetch(req, env) {
        const url = new URL(req.url);
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: headers({ 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' }) });
        }
        try {
            if (url.pathname === '/hit' && req.method === 'POST') return await hit(req, env);
            if (url.pathname === '/stats' && req.method === 'GET') return await stats(url, env);
            if (url.pathname === '/seen' && req.method === 'POST') return await seen(req);
            if (url.pathname === '/whoami' && req.method === 'GET') {
                return new Response(JSON.stringify({ country: (req.cf && req.cf.country) || 'XX' }),
                    { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }) });
            }
        } catch (e) {
            return new Response('Error', { status: 500, headers: headers() });
        }
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
    try { d = JSON.parse(await req.text()); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') return new Response(null, { status: 400, headers: headers() });
    /* a page is a short path of the site's own kind (/master/, /games/, /404/), a referrer a plain host name */
    const page = String(d.p || '');
    if (!/^\/[a-z0-9\-_\/]{0,80}$/i.test(page)) return new Response(null, { status: 400, headers: headers() });
    const ref = /^[a-z0-9.\-]{1,80}$/i.test(d.r || '') ? d.r.toLowerCase() : '(direct)';
    const device = d.d === 'phone' || d.d === 'tablet' ? d.d : 'desktop';
    const browser = BROWSERS.indexOf(d.b) >= 0 ? d.b : 'Other';
    const country = (req.cf && req.cf.country) || 'XX';   // worked out by Cloudflare; the IP address is never read here
    const day = new Date().toISOString().slice(0, 10);
    const add = env.DB.prepare('INSERT INTO counts (day, kind, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1');
    await env.DB.batch([['total', 'all'], ['page', page], ['ref', ref], ['device', device], ['browser', browser], ['country', country]]
        .map(function (r) { return add.bind(day, r[0], r[1]); }));
    return new Response(null, { status: 204, headers: headers() });
}

/* What reached the server with this request, sent straight back to the visitor and not kept anywhere: no database
   write, no log line. Only for pages of the site itself. */
async function seen(req) {
    if (req.headers.get('Origin') !== SITE) return new Response('Forbidden', { status: 403, headers: headers() });
    let d = null;
    try {
        const text = await req.text();
        if (text.length <= 2000) d = JSON.parse(text);
    } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    const cf = req.cf || {};
    const pick = function (k) { return cf[k] != null && cf[k] !== '' ? cf[k] : null; };
    const head = function (k) { return (req.headers.get(k) || '').slice(0, 400) || null; };
    const out = {
        ip: head('CF-Connecting-IP'),
        city: pick('city'), region: pick('region'), regionCode: pick('regionCode'), postalCode: pick('postalCode'),
        country: pick('country'), continent: pick('continent'), latitude: pick('latitude'), longitude: pick('longitude'),
        timezone: pick('timezone'), asOrganization: pick('asOrganization'), asn: pick('asn'), colo: pick('colo'),
        userAgent: head('User-Agent'), acceptLanguage: head('Accept-Language'),
        /* echoed only when well formed: a hex hash, a short id, a visit number */
        fp: typeof d.fp === 'string' && /^[0-9a-f]{1,64}$/i.test(d.fp) ? d.fp.toLowerCase() : null,
        vid: typeof d.vid === 'string' && /^[a-z0-9-]{1,40}$/.test(d.vid) ? d.vid : null,
        n: Number.isInteger(d.n) && d.n > 0 && d.n < 1000000 ? d.n : null
    };
    return new Response(JSON.stringify(out), { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }) });
}

async function stats(url, env) {
    const asked = parseInt(url.searchParams.get('days') || '30', 10);
    const days = Math.min(365, Math.max(1, isNaN(asked) ? 30 : asked));
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
    for (const k in out.totals) {
        const top = Object.keys(out.totals[k]).sort(function (a, b) { return out.totals[k][b] - out.totals[k][a]; }).slice(0, TOP);
        const keep = {};
        top.forEach(function (key) { keep[key] = out.totals[k][key]; });
        out.totals[k] = keep;
    }
    return new Response(JSON.stringify(out), { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }) });
}
