/* "What this site knows about you" (layouts/_default/you.html): shows the visitor exactly what the visit counter
   records about this visit. The values come from window.StatsDetect (assets/js/stats-detect.js, bundled before this
   file), the same code that assets/js/stats-hit.js uses to send them, so the two always agree. The country is asked
   from GET <endpoint>/whoami (tools/stats-worker/worker.js), only when the visit is counted. The lesson at the end
   runs only when its button is pressed: it works out a browser fingerprint here and POSTs it to <endpoint>/seen, which
   sends back what reached the server and keeps nothing. The only thing ever stored is the optional "remember me"
   record (localStorage 'you-visitor'), created only by its button and deleted by Forget me.
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
        if (v.link) {                              /* a plain link the visitor may follow; nothing is loaded from it */
            var a = document.createElement('a');
            a.className = 'you-out';
            a.href = v.link.href;
            a.textContent = v.link.text;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            dd.appendChild(a);
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
    function set(k, text, sub, missing, link) {
        var it = item(k);
        if (!it) return;
        var v = { text: String(text), sub: sub || '', missing: !!missing, link: link || null };
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

    /* ---------- the lesson: what reaches my server, and what a tracker would add. Runs only on a click ---------- */
    (function lesson() {
        var btn = document.getElementById('you-seen-btn');
        if (!btn) return;
        var $ = function (id) { return document.getElementById(id); };
        var status = $('you-seen-status'), box = $('you-seen'), server = $('you-seen-server'), welcome = $('you-welcome');
        var memBtn = $('you-mem-btn'), forgetBtn = $('you-forget-btn'), memText = $('you-mem-text'), memDefault = memText.textContent;
        var KEY = 'you-visitor', thisLoad = null;   /* thisLoad: the remembered record as it was before this page load counted */

        /* the optional "remember me" record: only ever created by the Remember me button */
        function readMem() {
            try {
                var m = JSON.parse(localStorage.getItem(KEY) || 'null');
                if (m && typeof m.id === 'string' && /^[a-z0-9-]{1,40}$/.test(m.id) && m.n >= 1) return m;
            } catch (e) { /* blocked or broken */ }
            return null;
        }
        function writeMem(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); return true; } catch (e) { return false; } }
        function newId() {
            var b = new Uint8Array(16), s = '';
            if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
            else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
            for (var j = 0; j < 16; j++) s += (b[j] < 16 ? '0' : '') + b[j].toString(16);
            return s;
        }
        function memUI() {
            var m = readMem();
            memBtn.hidden = !!m;
            forgetBtn.hidden = !m;
            memText.textContent = m ? 'This browser is remembered, with the id ' + m.id.slice(0, 8) + '… It lives in your browser only; Forget me deletes it.' : memDefault;
        }
        function ordinal(n) {
            var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        }
        function when(iso) {
            var d = new Date(iso), now = new Date();
            if (isNaN(d)) return 'an unknown day';
            if (d.toDateString() === now.toDateString()) return 'earlier today at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '');
        }
        /* a visit is one page load: the first click on this page counts it, later clicks show the same */
        function visit() {
            var m = readMem();
            if (!m) { thisLoad = null; return null; }
            if (!thisLoad) {
                thisLoad = { n: m.n, last: m.last };
                m.n += 1;
                m.last = new Date().toISOString();
                writeMem(m);
            }
            return m;
        }
        function greet(m) {
            if (!m) { welcome.hidden = true; return; }
            welcome.hidden = false;
            var w = when(thisLoad && thisLoad.last);
            welcome.textContent = m.n <= 1 ? 'This browser is now remembered: this is your first visit. Come back another day and press the button again.'
                : 'Welcome back: this is your ' + ordinal(m.n) + ' visit, last one ' + (/^earlier/.test(w) ? w : 'on ' + w) + '.';
        }
        memBtn.addEventListener('click', function () {
            if (!writeMem({ id: newId(), n: 1, last: new Date().toISOString() })) {
                memText.textContent = 'Your browser does not let this page keep anything, so it cannot remember you. Trackers have the same problem.';
                return;
            }
            thisLoad = { n: 0, last: null };          /* this page load is visit 1 */
            memUI();
            if (!box.hidden) greet(readMem());
        });
        forgetBtn.addEventListener('click', function () {
            try { localStorage.removeItem(KEY); } catch (e) { /* nothing to remove */ }
            thisLoad = null;
            memUI();
            welcome.hidden = true;
        });
        memUI();

        /* ---------- the fingerprint, from what any page can read ---------- */
        function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
        function sha256(str) {
            if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve(null);
            return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(hex, function () { return null; });
        }
        function canvasData() {
            try {
                var c = document.createElement('canvas'), x = c.getContext('2d');
                if (!x) return '';
                c.width = 280; c.height = 60;
                x.textBaseline = 'top';
                x.fillStyle = '#1e3a8a'; x.fillRect(150, 4, 70, 22);
                x.fillStyle = '#f0932c'; x.font = "16px Arial, sans-serif"; x.fillText('Florias éßφ 🐈 0.1234', 4, 8);
                x.fillStyle = 'rgba(30, 58, 138, 0.6)'; x.font = '18px serif'; x.fillText('Cwm fjordbank glyphs vext quiz', 6, 32);
                x.beginPath(); x.arc(250, 30, 18, 0, Math.PI * 1.6); x.strokeStyle = '#64748b'; x.lineWidth = 3; x.stroke();
                return c.toDataURL();
            } catch (e) { return ''; }
        }
        function webgl() {
            try {
                var c = document.createElement('canvas'), g = c.getContext('webgl') || c.getContext('experimental-webgl');
                if (!g) return '';
                var e = g.getExtension('WEBGL_debug_renderer_info');
                return [g.getParameter(e ? e.UNMASKED_VENDOR_WEBGL : g.VENDOR), g.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : g.RENDERER)].filter(Boolean).join(', ');
            } catch (e) { return ''; }
        }
        var FONTS = ['Arial', 'Helvetica', 'Helvetica Neue', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Calibri', 'Cambria', 'Segoe UI',
            'Roboto', 'Ubuntu', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans', 'Menlo', 'Consolas', 'Comic Sans MS', 'Lucida Grande', 'Tahoma'];
        function fonts() {
            try {
                var x = document.createElement('canvas').getContext('2d'), probe = 'mmmmmmmmmmlli1WQ@#', base = {}, kinds = ['monospace', 'serif', 'sans-serif'];
                if (!x) return [];
                kinds.forEach(function (k) { x.font = '72px ' + k; base[k] = x.measureText(probe).width; });
                return FONTS.filter(function (f) {
                    return kinds.some(function (k) { x.font = "72px '" + f + "', " + k; return x.measureText(probe).width !== base[k]; });
                });
            } catch (e) { return []; }
        }
        function fingerprint() {
            var tz = '';
            try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* none */ }
            var parts = {
                gpu: webgl(),
                screen: screen.width + ' × ' + screen.height + ' at pixel ratio ' + (Math.round((window.devicePixelRatio || 1) * 100) / 100) + ', ' + screen.colorDepth + '-bit colour',
                tz: tz,
                langs: (nav.languages || [nav.language]).join(', '),
                platform: nav.platform || '',
                cores: nav.hardwareConcurrency || '',
                fonts: fonts()
            };
            return sha256(canvasData()).then(function (canvas) {
                parts.canvas = canvas || '';
                return sha256(JSON.stringify(parts)).then(function (fp) { return { fp: fp, parts: parts }; });
            });
        }
        function group(h) { return h ? h.slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ') : ''; }
        var NS = 'http://www.w3.org/2000/svg';
        function identicon(h) {
            var svg = $('you-identicon');
            svg.textContent = '';
            if (!h) { svg.classList.remove('is-on'); return; }
            var bg = document.createElementNS(NS, 'rect');
            bg.setAttribute('width', 8); bg.setAttribute('height', 8); bg.setAttribute('class', 'you-ic-bg');
            svg.appendChild(bg);
            for (var r = 0; r < 8; r++) {
                for (var c = 0; c < 4; c++) {
                    var v = parseInt(h.charAt(r * 4 + c), 16);
                    if (!(v & 1)) continue;
                    [c, 7 - c].forEach(function (x) {
                        var q = document.createElementNS(NS, 'rect');
                        q.setAttribute('x', x); q.setAttribute('y', r); q.setAttribute('width', 1); q.setAttribute('height', 1);
                        q.setAttribute('class', v & 4 ? 'you-ic-a' : 'you-ic-b');
                        if (!calm) q.style.animationDelay = ((r * 4 + Math.min(x, 7 - x)) * 22) + 'ms';
                        svg.appendChild(q);
                    });
                }
            }
            svg.classList.add('is-on');
        }

        /* ---------- what the counter says it received ---------- */
        var COLO = { ZRH: 'Zurich', GVA: 'Geneva', FRA: 'Frankfurt', MUC: 'Munich', BER: 'Berlin', HAM: 'Hamburg', DUS: 'Düsseldorf', VIE: 'Vienna',
            MXP: 'Milan', AMS: 'Amsterdam', LHR: 'London', MAN: 'Manchester', CDG: 'Paris', MRS: 'Marseille', MAD: 'Madrid', BCN: 'Barcelona',
            LIS: 'Lisbon', BRU: 'Brussels', CPH: 'Copenhagen', ARN: 'Stockholm', OSL: 'Oslo', HEL: 'Helsinki', WAW: 'Warsaw', PRG: 'Prague',
            ATH: 'Athens', SKG: 'Thessaloniki', IST: 'Istanbul', DUB: 'Dublin', IAD: 'Washington', EWR: 'Newark', ORD: 'Chicago', LAX: 'Los Angeles',
            SJC: 'San Jose', SEA: 'Seattle', DFW: 'Dallas', ATL: 'Atlanta', MIA: 'Miami', YYZ: 'Toronto', GRU: 'São Paulo', NRT: 'Tokyo',
            HKG: 'Hong Kong', SIN: 'Singapore', SYD: 'Sydney', BOM: 'Mumbai', DXB: 'Dubai', JNB: 'Johannesburg' };
        function str(v) { return v == null ? '' : String(v); }
        function showServer(d, mine) {
            server.hidden = false;
            set('ip', str(d.ip) || 'Not received', '', !d.ip);
            var cc = str(d.country).toUpperCase(), place = [str(d.city), str(d.region), d.postalCode ? 'postcode area ' + d.postalCode : '', cc ? countryName(cc) : ''].filter(Boolean);
            set('place', place.length ? (flag(cc) ? flag(cc) + ' ' : '') + place.join(', ') : 'Not received', '', !place.length);
            var lat = parseFloat(d.latitude), lon = parseFloat(d.longitude);
            if (isFinite(lat) && isFinite(lon)) {
                set('coords', lat.toFixed(3) + ', ' + lon.toFixed(3), d.timezone ? 'Time zone from the same data: ' + d.timezone + '.' : '', false,
                    { href: 'https://www.openstreetmap.org/?mlat=' + lat.toFixed(4) + '&mlon=' + lon.toFixed(4) + '#map=11/' + lat.toFixed(4) + '/' + lon.toFixed(4), text: 'Show on OpenStreetMap' });
            } else set('coords', 'Not received', '', true);
            set('isp', str(d.asOrganization) || 'Not received', d.asn ? 'Network AS' + d.asn : '', !d.asOrganization);
            var colo = str(d.colo).toUpperCase();
            set('colo', colo ? colo + (COLO[colo] ? ' (' + COLO[colo] + ')' : '') : 'Not received', colo ? 'Cloudflare names its data centres after the nearest airport.' : '', !colo);
            set('ua', str(d.userAgent) || 'Not received', '', !d.userAgent);
            set('al', str(d.acceptLanguage) || 'Not received', '', !d.acceptLanguage);
            if (d.fp) set('fprx', group(d.fp), d.fp === mine ? 'Exactly the hash worked out in this page.' : 'Not the hash worked out here.');
            else set('fprx', 'Not received', mine ? '' : 'Nothing to send: see above.', true);
            if (d.vid) set('vid', d.vid, d.n ? 'Sent with your visit number: ' + d.n + '.' : '');
            else set('vid', 'None', 'You have not asked this page to remember you, so it cannot tell whether you were here before.', true);
        }

        var running = false;
        btn.addEventListener('click', function () {
            if (running) return;
            running = true;
            btn.disabled = true;
            status.classList.remove('is-bad');
            status.textContent = 'Working out your fingerprint…';
            seen.add(btn.closest('.you-sec'));
            var m = visit(), mine = null;
            fingerprint().then(function (f) {
                mine = f.fp;
                box.hidden = false;
                greet(m);
                identicon(mine);
                var p = f.parts;
                if (mine) set('fp', group(mine), 'Full hash: ' + mine);
                else set('fp', 'Not available', 'Your browser offers no SHA-256 here, so no hash was made.', true);
                set('fpparts', 'Canvas drawing, graphics chip, screen, time zone, languages, platform, processor cores, fonts',
                    'Graphics: ' + (p.gpu || 'not shared') + '. Screen: ' + p.screen + '. Time zone: ' + (p.tz || 'not shared') + '. Languages: ' + (p.langs || 'not shared') +
                    '. Platform: ' + (p.platform || 'not shared') + '. Cores: ' + (p.cores || 'not shared') + '. Fonts found: ' + p.fonts.length + ' of ' + FONTS.length +
                    (p.fonts.length ? ' (' + p.fonts.join(', ') + ')' : '') + '. Canvas drawing hash: ' + (p.canvas ? p.canvas.slice(0, 12) : 'none') + '.');
                status.textContent = 'Sending it to my counter…';
                var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
                var body = { fp: mine };
                if (m) { body.vid = m.id; body.n = m.n; }
                return fetch(end + '/seen', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
                    .then(function (r) {
                        clearTimeout(timer);
                        if (r.status === 404) throw new Error('soon');
                        if (r.status === 403) throw new Error('refused');
                        if (!r.ok) throw new Error('http');
                        return r.json();
                    })
                    .then(function (d) {
                        if (!d || typeof d !== 'object') throw new Error('shape');
                        showServer(d, mine);
                        status.textContent = 'Received, shown here, and forgotten by my counter.';
                        btn.textContent = 'Show it again';
                    });
            }).catch(function (e) {
                var msg = e && e.message;
                server.hidden = true;
                set('fprx', 'Not received', 'My counter did not answer, so nothing reached it.', true);
                set('vid', m ? m.id : 'None', m ? 'Kept in your browser; not sent this time.' : 'You have not asked this page to remember you.', !m);
                status.classList.add('is-bad');
                status.textContent = msg === 'soon' ? 'This part works once the counter update is live. The fingerprint below was still worked out in your browser.'
                    : msg === 'refused' ? 'My counter only answers pages of this site, so it refused this request.'
                    : 'Could not reach my counter right now. A tracker blocker may have stopped the request, which is fine.';
            }).then(function () { running = false; btn.disabled = false; });
        });
    })();

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
        } else if (why === 'ignored') sub = 'You switched counting off on this browser, on Site stats.';
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
