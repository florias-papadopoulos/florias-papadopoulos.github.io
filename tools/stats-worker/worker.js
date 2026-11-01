// Visit counter for florias-papadopoulos.github.io (a Cloudflare Worker with a D1 database bound as DB).
// It keeps daily totals only: no cookies, no IP addresses, nothing about any one visitor.
//   POST /hit    one page view, sent by the site: {"p": "/games/", "r": "google.com", "d": "phone", "b": "Firefox"}
//   GET  /stats  the totals of the ?days=7, 30 or 90 days up to yesterday (UTC), read by the site's /stats/ page. Today is
//                left out and anything under MIN views is grouped as "(other)", so no single visit can be read off it.
//   GET  /whoami the country this request would be counted under (for the /you/ page; nothing is stored)
// Table (schema.sql): counts(day, kind, key, n), kind is total, page, ref, device, browser or country.
const SITE = 'https://florias-papadopoulos.github.io';
const BROWSERS = ['Firefox', 'Chrome', 'Safari', 'Edge', 'Opera', 'Other'];
const TOP = 40;   // /stats lists at most this many pages, referrers, countries... (keeps the answer small whatever is sent)
const MIN = 3;    // /stats groups pages, referrers, countries... with fewer views than this as "(other)"
const RANGES = [7, 30, 90];
/* The site's pages. Anything else that is sent (a page added later, or made up) is counted as "(other)", so nobody can
   put words on the public /stats/ page. Add new pages here. */
const PAGES = ['/', '/bachelor/', '/master/', '/papers/', '/games/', '/projects/', '/you/', '/stats/', '/privacy/', '/404/'];
const MAX_REFS = 50;      // distinct referring sites a day; later new ones are counted as "(other site)"
const DAY_CAP = 5000;     // page views counted a day; past it nothing is written, so fake hits cannot use up the database quota
const MAX_BODY = 1000;    // bytes; a real /hit body is under 100

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
    const d = await body(req, MAX_BODY);
    if (!d) return new Response(null, { status: 400, headers: headers() });
    /* a page is a short path of the site's own kind (/master/, /games/, /404/), a referrer a plain host name */
    const page = String(d.p || '');
    if (!/^\/[a-z0-9\-_\/]{0,80}$/i.test(page)) return new Response(null, { status: 400, headers: headers() });
    let ref = typeof d.r === 'string' && /^[a-z0-9.\-]{1,80}$/i.test(d.r) ? d.r.toLowerCase() : '(direct)';
    const device = d.d === 'phone' || d.d === 'tablet' ? d.d : 'desktop';
    const browser = BROWSERS.indexOf(d.b) >= 0 ? d.b : 'Other';
    const country = (req.cf && req.cf.country) || 'XX';   // worked out by Cloudflare; the IP address is never read here
    const day = new Date().toISOString().slice(0, 10);
    /* one read: today's views so far, how many referring sites today has, and whether this one is among them */
    const now = await env.DB.prepare("SELECT (SELECT n FROM counts WHERE day = ?1 AND kind = 'total' AND key = 'all') AS total, " +
        "(SELECT COUNT(*) FROM counts WHERE day = ?1 AND kind = 'ref') AS refs, " +
        "(SELECT COUNT(*) FROM counts WHERE day = ?1 AND kind = 'ref' AND key = ?2) AS known").bind(day, ref).first();
    if (now && now.total >= DAY_CAP) return new Response(null, { status: 204, headers: headers() });
    if (now && !now.known && now.refs >= MAX_REFS) ref = '(other site)';
    const add = env.DB.prepare('INSERT INTO counts (day, kind, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1');
    await env.DB.batch([['total', 'all'], ['page', PAGES.indexOf(page) >= 0 ? page : '(other)'], ['ref', ref], ['device', device], ['browser', browser], ['country', country]]
        .map(function (r) { return add.bind(day, r[0], r[1]); }));
    return new Response(null, { status: 204, headers: headers() });
}

/* The posted JSON object, or null when it is missing, malformed or longer than max bytes (checked before reading it
   when the browser says its length). */
async function body(req, max) {
    if (+(req.headers.get('Content-Length') || 0) > max) return null;
    try {
        const text = await req.text();
        const d = text.length <= max ? JSON.parse(text) : null;
        return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
    } catch (e) { return null; }
}

/* The answer only changes at midnight (UTC), so each running copy of the worker keeps it for 10 minutes. */
const memo = {};

async function stats(url, env) {
    const asked = parseInt(url.searchParams.get('days') || '30', 10);
    const days = RANGES.indexOf(asked) >= 0 ? asked : 30;
    const today = Date.parse(new Date().toISOString().slice(0, 10));
    const since = new Date(today - days * 864e5).toISOString().slice(0, 10);
    const until = new Date(today - 864e5).toISOString().slice(0, 10);
    const key = days + ' ' + until, hit = memo[key];
    let text = hit && Date.now() - hit.at < 6e5 ? hit.text : null;
    if (!text) {
        const out = { since: since, until: until, days: days, daily: {}, totals: {} };
        const daily = (await env.DB.prepare("SELECT day, n FROM counts WHERE kind = 'total' AND day BETWEEN ?1 AND ?2")
            .bind(since, until).all()).results;
        for (const r of daily) out.daily[r.day] = r.n;
        const rows = (await env.DB.prepare("SELECT kind, key, SUM(n) AS n FROM counts WHERE kind != 'total' AND day BETWEEN ?1 AND ?2 " +
            "GROUP BY kind, key ORDER BY n DESC").bind(since, until).all()).results;
        for (const r of rows) {
            const t = out.totals[r.kind] || (out.totals[r.kind] = {});
            /* small numbers, the capped referrers and everything past the TOP are grouped */
            const k = r.n < MIN || r.key === '(other site)' || Object.keys(t).length >= TOP ? '(other)' : r.key;
            t[k] = (t[k] || 0) + r.n;
        }
        text = JSON.stringify(out);
        memo[key] = { at: Date.now(), text: text };
    }
    return new Response(text, { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' }) });
}
