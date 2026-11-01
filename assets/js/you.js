/* "What this site knows about you" (layouts/_default/you.html): fills in what the owner of a website could learn
   about a visit, as server logs and a basic analytics script would record it. Everything is read here, in the
   visitor's browser, and only shown on the page: nothing is stored or sent. The one request to another site is the
   IP lookup at ipapi.co, made only when the visitor presses the button. Values appear one by one, typed in quickly
   (at once with reduced motion). */
(function () {
    'use strict';
    var root = document.getElementById('you');
    if (!root) return;
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nav = navigator, ua = nav.userAgent || '';

    function item(k) { return root.querySelector('.you-item[data-k="' + k + '"]'); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }

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
        var n = 0, step = Math.max(1, Math.ceil(text.length / 14));
        (function type() {
            n = Math.min(text.length, n + step);
            main.textContent = text.slice(0, n);
            if (n < text.length) return setTimeout(type, 22);
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
    /* a live value already on the page: change only its text, no retyping */
    function update(k, text, sub) {
        var it = item(k);
        if (!it || !it.classList.contains('is-shown')) return;
        var m = it.querySelector('.you-main'), s = it.querySelector('.you-subval');
        if (m && text != null) m.textContent = text;
        if (s && sub != null) s.textContent = sub;
    }
    function watch(sec) {
        if (!('IntersectionObserver' in window) || calm) { seen.add(sec); return; }
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { seen.add(sec); io.disconnect(); pump(); } });
        }, { rootMargin: '0px 0px -10% 0px' });
        io.observe(sec);
    }
    Array.prototype.forEach.call(root.querySelectorAll('.you-sec'), watch);

    /* ---------- what the request itself carries: the User-Agent, Accept-Language and Referer headers ---------- */
    function browser() {
        var m, rules = [
            [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Microsoft Edge'], [/OPR\/([\d.]+)/, 'Opera'], [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
            [/FxiOS\/([\d.]+)/, 'Firefox'], [/CriOS\/([\d.]+)/, 'Chrome'], [/Firefox\/([\d.]+)/, 'Firefox'],
            [/Chrome\/([\d.]+)/, 'Chrome'], [/Version\/([\d.]+).*Safari\//, 'Safari']
        ];
        for (var i = 0; i < rules.length; i++) {
            if ((m = ua.match(rules[i][0]))) return rules[i][1] + ' ' + m[1].split('.').slice(0, 2).join('.').replace(/\.0$/, '');
        }
        return null;
    }
    function os(hi) {
        var m;
        if (/Windows NT 10/.test(ua)) return hi && hi.platformVersion ? (parseInt(hi.platformVersion, 10) >= 13 ? 'Windows 11' : 'Windows 10') : 'Windows 10 or 11';
        if ((m = ua.match(/Windows NT ([\d.]+)/))) return 'Windows NT ' + m[1];
        if ((m = ua.match(/(?:iPhone|CPU) OS ([\d_]+)/))) return (/iPad/.test(ua) ? 'iPadOS ' : 'iOS ') + m[1].replace(/_/g, '.');
        if (/Macintosh/.test(ua) && nav.maxTouchPoints > 1) return 'iPadOS';
        if ((m = ua.match(/Android ([\d.]+)/))) return 'Android ' + m[1];
        if (/Mac OS X/.test(ua)) return hi && hi.platformVersion ? 'macOS ' + hi.platformVersion.split('.').slice(0, 2).join('.') : 'macOS';
        if (/CrOS/.test(ua)) return 'ChromeOS';
        if (/Linux/.test(ua)) return 'Linux' + (/x86_64|amd64/.test(ua) ? ' (64-bit PC)' : /aarch64|arm/i.test(ua) ? ' (ARM)' : '');
        return null;
    }
    function device(hi) {
        var model = hi && hi.model ? ', ' + hi.model : '';
        if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return 'Tablet' + model;
        if (/Mobi|iPhone|iPod/.test(ua)) return 'Phone' + model;
        return 'Computer' + (nav.maxTouchPoints > 0 ? ' with a touch screen' : '');
    }
    function fillRequest(hi) {
        var b = browser(), o = os(hi);
        set('browser', b || 'Not recognised', b ? '' : ua.slice(0, 120), !b);
        set('os', o || 'Not recognised', '', !o);
        set('dtype', device(hi));

        var langs = (nav.languages && nav.languages.length ? nav.languages : [nav.language]).filter(Boolean), names = '';
        try {
            var dn = new Intl.DisplayNames(['en'], { type: 'language' });
            names = langs.map(function (l) { return dn.of(l); }).join(', ');
        } catch (e) { /* no display names */ }
        set('langs', langs.join(', ') || 'Not shared', names, !langs.length);

        var ref = document.referrer, here = location.origin, from;
        try { from = ref ? new URL(ref).origin : ''; } catch (e) { from = ''; }
        if (!from) set('ref', 'Nothing', 'You typed the address, used a bookmark, or your browser kept it to itself.', true);
        else if (from === here) set('ref', 'Another page of this site');
        else set('ref', from.replace(/^https?:\/\//, ''), from);

        var now = new Date(), utc = now.toUTCString().replace(/^\w+, /, '').replace(' GMT', ' UTC');
        set('when', now.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            'In my log, in UTC: ' + utc);
    }
    /* Chromium can also name the Windows version and a phone model (client hints a server can ask for too) */
    var hints = nav.userAgentData && nav.userAgentData.getHighEntropyValues;
    if (hints) {
        var done = false, go = function (hi) { if (!done) { done = true; fillRequest(hi); } };
        nav.userAgentData.getHighEntropyValues(['platformVersion', 'model']).then(go, function () { go(null); });
        setTimeout(function () { go(null); }, 800);
    } else fillRequest(null);

    /* ---------- what a few lines of analytics JavaScript would add ---------- */
    function screenText() { return screen.width + ' × ' + screen.height; }
    function screenSub() {
        return 'Pixel ratio ' + (Math.round((window.devicePixelRatio || 1) * 100) / 100) + ', browser window ' + innerWidth + ' × ' + innerHeight;
    }
    set('screen', screenText(), screenSub());
    window.addEventListener('resize', function () { update('screen', screenText(), screenSub()); });

    var tz = '', off = -new Date().getTimezoneOffset();
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no Intl */ }
    var utcOff = 'UTC' + (off >= 0 ? '+' : '−') + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ':' + pad(Math.abs(off) % 60) : '');
    function clock() { var d = new Date(); return 'Your clock says ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
    set('tz', (tz ? tz.replace(/_/g, ' ') + ' (' + utcOff + ')' : utcOff), clock());

    var refPath = '';
    try { if (document.referrer && new URL(document.referrer).origin === location.origin) refPath = new URL(document.referrer).pathname; } catch (e) { /* none */ }
    var hist = history.length;
    set('pages', refPath ? refPath + ', then this page' : 'This is the first page you opened here',
        'This tab has ' + hist + (hist === 1 ? ' page' : ' pages') + ' in its history: a script can count them, not read them.');

    var t0 = Date.now() - (window.performance && performance.now ? performance.now() : 0);
    function spent() {
        var s = Math.max(0, Math.floor((Date.now() - t0) / 1000)), m = Math.floor(s / 60);
        return m ? m + ' min ' + pad(s % 60) + ' s' : s + ' s';
    }
    function hidden() { return document.visibilityState === 'hidden'; }
    var away = 0;
    function awayText() { return hidden() ? 'You are looking at another tab right now.' : away ? 'You switched away ' + away + (away === 1 ? ' time' : ' times') + ', and a script would notice.' : 'Counting while you stay.'; }
    document.addEventListener('visibilitychange', function () { if (hidden()) away++; update('time', spent(), awayText()); });
    set('time', spent(), awayText());
    setInterval(function () {
        update('time', spent(), awayText());
        update('tz', null, clock());
    }, 1000);

    /* ---------- the IP lookup: only when the visitor presses the button ---------- */
    var btn = document.getElementById('you-ip-btn'), status = document.getElementById('you-ip-status'), box = document.getElementById('you-ip');
    if (!btn) return;
    function say(t, bad) { status.textContent = t; status.classList.toggle('is-bad', !!bad); }
    btn.addEventListener('click', function () {
        if (btn.disabled) return;
        btn.disabled = true;
        say('Asking ipapi.co…');
        var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
        fetch('https://ipapi.co/json/', { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
            .then(function (r) {
                if (r.status === 429) throw new Error('busy');
                if (!r.ok) throw new Error('http');
                return r.json();
            })
            .then(function (d) {
                if (!d || d.error || !d.ip) throw new Error(d && /limit/i.test(d.reason || '') ? 'busy' : 'http');
                function v(x) { return x ? String(x) : ''; }
                box.hidden = false;
                if (calm || !('IntersectionObserver' in window)) seen.add(box.closest('.you-sec'));
                set('ip', d.ip, d.version ? 'Version ' + d.version.replace(/^IPv/, '') + ' address' : '');
                set('city', v(d.city) || 'Not known', '', !d.city);
                set('region', v(d.region) || 'Not known', '', !d.region);
                set('country', v(d.country_name) || v(d.country) || 'Not known', '', !(d.country_name || d.country));
                set('org', v(d.org) || 'Not known', d.asn ? 'Network ' + d.asn : '', !d.org);
                say('Here is what my server could see. Only you see it here.');
                btn.textContent = 'Look it up again';
            })
            .catch(function (e) {
                if (e && e.message === 'busy') say('ipapi.co is getting too many requests from your network right now. Try again in a while.', true);
                else if (e && e.name === 'AbortError') say('ipapi.co did not answer in time. Try again later.', true);
                else say('Could not reach ipapi.co. A tracker blocker may have stopped the request (good for you), or you are offline.', true);
            })
            .then(function () { clearTimeout(timer); btn.disabled = false; });
    });
})();
