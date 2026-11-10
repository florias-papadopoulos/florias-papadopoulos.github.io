/* "What this site knows about you" (layouts/_default/you.html): shows the visitor exactly what the visit counter
   records about this visit. The values come from window.StatsDetect (assets/js/site/stats-detect.js, bundled before this
   file), the same code that assets/js/site/stats-hit.js uses to send them, so the two always agree. The country is asked
   from GET <endpoint>/whoami (tools/workers/stats/worker.js), only when the visit is counted; nothing is stored here.
   Values appear one by one, typed in quickly (at once with reduced motion). */
(function () {
    'use strict';
    var root = document.getElementById('you'), D = window.StatsDetect;
    if (!root || !D) return;
    var end = (root.getAttribute('data-endpoint') || '').replace(/\/+$/, '');
    if (!end) return;
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nav = navigator;

    function item(k) { return root.querySelector('.you-item[data-k="' + k + '"]'); }

    /* ---------- showing values: one at a time, in page order, once their section is in view ---------- */
    var queue = [], busy = false, seen = new WeakSet();
    function fill(it, v) {
        var dd = it.querySelector('.you-val');
        dd.textContent = '';
        var main = document.createElement('span');
        main.className = 'you-main' + (v.missing ? ' you-missing' : '');
        dd.appendChild(main);
        if (v.sub) {
            var sub = document.createElement('span');
            sub.className = 'you-subval';
            sub.textContent = v.sub;
            dd.appendChild(sub);
        }
        it.classList.add('is-shown');
        return main;
    }
    function pump() {
        if (busy) return;
        var i = -1;                                /* the first value in page order whose section is in view */
        queue.forEach(function (q, j) {
            if (!seen.has(q.it.closest('.you-sec'))) return;
            if (i < 0 || (queue[i].it.compareDocumentPosition(q.it) & Node.DOCUMENT_POSITION_PRECEDING)) i = j;
        });
        if (i < 0) return;
        var q = queue.splice(i, 1)[0], main = fill(q.it, q.v), text = q.v.text;
        if (calm) { main.textContent = text; return pump(); }
        busy = true;
        var n = 0, chars = Array.from(text), step = Math.max(1, Math.ceil(chars.length / 14));
        (function type() {
            n = Math.min(chars.length, n + step);
            main.textContent = chars.slice(0, n).join('');
            if (n < chars.length) return setTimeout(type, 22);
            setTimeout(function () { busy = false; pump(); }, 90);
        })();
    }
    function set(k, text, sub, missing) {
        var it = item(k);
        if (!it) return;
        var v = { text: String(text), sub: sub || '', missing: !!missing };
        if (it.classList.contains('is-shown')) { fill(it, v).textContent = v.text; return; }
        queue = queue.filter(function (q) { return q.it !== it; });
        queue.push({ it: it, v: v });
        pump();
    }
    Array.prototype.forEach.call(root.querySelectorAll('.you-sec'), function (sec) {
        if (!('IntersectionObserver' in window) || calm) { seen.add(sec); return; }
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { seen.add(sec); io.disconnect(); pump(); } });
        }, { rootMargin: '0px 0px -10% 0px' });
        io.observe(sec);
    });

    /* ---------- names, as on /stats/ ---------- */
    var regions = null;
    try { regions = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { /* codes only */ }
    function flag(cc) {
        if (!/^[A-Z]{2}$/.test(cc) || cc === 'XX' || cc === 'T1') return '';
        return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
    }
    function countryName(cc) {
        if (cc === 'XX' || !cc) return 'Unknown';
        if (cc === 'T1') return 'Tor network';
        var n = '';
        try { n = regions ? regions.of(cc) : ''; } catch (e) { /* not a region code */ }
        return n && n !== cc ? n : cc;
    }
    var DEVICE = { phone: 'Phone', tablet: 'Tablet', desktop: 'Computer' };

    /* ---------- is this visit counted? the same conditions as the counter ---------- */
    var why = D.skip(), counted = !why;
    if (counted) set('counted', 'Counted', 'Once, for this page view, like every page you open here.');
    else {
        var sub = '';
        if (why === 'dnt') {
            var sig = [];
            if (nav.doNotTrack === '1' || window.doNotTrack === '1') sig.push('Do Not Track');
            if (nav.globalPrivacyControl === true) sig.push('Global Privacy Control');
            sub = 'Your browser sends ' + (sig.join(' and ') || 'Do Not Track') + ', and the counter respects that.';
        } else if (why === 'ignored') sub = 'You switched counting off on this browser.';
        else sub = 'This is a preview copy of the site, which the counter leaves out.';
        set('counted', 'Not counted', sub, true);
        document.getElementById('you-rec-intro').textContent = 'Nothing about this visit is recorded. If it were counted, these five things would be all of it.';
    }

    /* ---------- the five values ---------- */
    var page = root.getAttribute('data-page') || location.pathname, ref = D.referrer(), dev = D.device(), br = D.browser();
    set('page', page, root.getAttribute('data-title') || '');
    if (ref) set('ref', ref);
    else set('ref', 'Nothing', 'You came directly, or from within this site.', true);
    set('device', DEVICE[dev] || dev);
    set('browser', br);

    /* what is added to the day's totals (kept per UTC day, like the counter) */
    var day = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    function adds(country) {
        if (!counted) return set('adds', 'Nothing', 'This visit is not counted, so no total changes.', true);
        var parts = ['views', page, ref || 'direct', country || 'your country', dev, br];
        set('adds', parts.map(function (p) { return p + ' +1'; }).join(', '), 'In the totals of ' + day + ' (UTC).');
    }

    /* search engines: what Search Console gives me, said to someone who just came from one */
    if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|qwant|startpage|baidu|yandex|kagi)\.[a-z.]+$|^search\.brave\.com$/.test(ref) && !/^scholar\./.test(ref)) {
        var s = document.getElementById('you-search');
        if (s) s.textContent = 'You came from ' + ref + '. ' + s.textContent;
    }

    if (!counted) {
        set('country', 'Not looked up', 'This visit is not counted, so the counter is not asked.', true);
        adds();
        return;
    }
    /* the country the counter stores, from the counter itself (it reads Cloudflare's network data and keeps nothing) */
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    fetch(end + '/whoami', { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
            if (r.status === 404) throw new Error('soon');
            if (!r.ok) throw new Error('http');
            return r.json();
        })
        .then(function (d) {
            var cc = d && typeof d.country === 'string' ? d.country.toUpperCase() : '';
            if (!/^[A-Z][A-Z0-9]$/.test(cc)) throw new Error('shape');
            var name = countryName(cc), f = flag(cc);
            set('country', (f ? f + ' ' : '') + name, cc === 'XX' ? 'Cloudflare could not tell, so it is counted as unknown.' : 'Stored as ' + cc + '.', cc === 'XX');
            adds(name);
        })
        .catch(function (e) {
            if (e && e.message === 'soon') set('country', 'Shown once the counter update is live', 'The counter still stores it; this page cannot ask for it yet.', true);
            else set('country', 'Could not be looked up right now', 'The counter still stores it; please try again later.', true);
            adds();
        })
        .then(function () { clearTimeout(timer); });
})();
