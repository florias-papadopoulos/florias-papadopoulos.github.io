/* "Site stats" (layouts/_default/stats.html): reads the totals of the visit counter (GET <endpoint>/stats?days=N, see
   tools/workers/stats/worker.js; it covers the days up to yesterday and groups small numbers as "(other)") and draws them: two numbers, a bar chart of views per day (inline SVG) and ranked lists
   of pages, referring sites, countries, devices and browsers. The 7/30/90 day buttons fetch that period. Owner only:
   the worker answers only with the owner's key (Authorization: Bearer, its STATS_KEY secret), kept in localStorage
   'stats-key'. Without a key the page just says it is private; /stats/?me shows the box to enter it. Also the
   "Don't count my visits on this browser" box, which sets localStorage 'stats-ignore' (read by assets/js/site/stats-hit.js). */
(function () {
    'use strict';
    var root = document.getElementById('stats');
    if (!root) return;
    var end = (root.getAttribute('data-endpoint') || '').replace(/\/+$/, '');
    var $ = function (id) { return document.getElementById(id); };
    var NS = 'http://www.w3.org/2000/svg';

    /* ---------- the "don't count me" box ---------- */
    var ign = $('st-ignore');
    if (ign) {
        try { ign.checked = localStorage.getItem('stats-ignore') === '1'; } catch (e) { ign.disabled = true; }
        ign.addEventListener('change', function () {
            try { if (ign.checked) localStorage.setItem('stats-ignore', '1'); else localStorage.removeItem('stats-ignore'); } catch (e) { /* blocked */ }
        });
    }
    if (!end) return;

    /* ---------- the owner's key ---------- */
    var me = /(^|&)me(=|&|$)/.test(location.search.slice(1));
    var form = $('st-key'), input = $('st-key-in'), why = $('st-key-why'), owner = $('st-owner'), key = '';
    try { key = localStorage.getItem('stats-key') || ''; } catch (e) { /* blocked: enter it each visit */ }
    function lock(msg) {
        key = '';
        try { localStorage.removeItem('stats-key'); } catch (e) { /* blocked */ }
        owner.hidden = true;
        $('st-private').hidden = false;
        if (me) { form.hidden = false; if (msg) { why.textContent = msg; why.classList.add('is-bad'); } }
    }
    function unlock() {
        form.hidden = true;
        $('st-private').hidden = true;
        owner.hidden = false;
    }
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var k = input.value.trim();
        if (k.length < 24) { why.textContent = 'The key has at least 24 characters.'; why.classList.add('is-bad'); return; }
        key = k;
        input.value = '';
        try { localStorage.setItem('stats-key', k); } catch (e2) { /* blocked: works until the page is left */ }
        cache = {};
        unlock();
        load(days);
    });
    $('st-forget').addEventListener('click', function () { cache = {}; lock(); });

    /* ---------- names ---------- */
    var pageNames = {};
    try { JSON.parse(root.getAttribute('data-names') || '[]').forEach(function (x) { pageNames[x.p] = x.t; }); } catch (e) { /* plain paths then */ }
    var regions = null;
    try { regions = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { /* codes only */ }
    function fmt(n) { return Number(n).toLocaleString('en-US'); }
    function pageName(p) {
        if (pageNames[p]) return pageNames[p];
        if (pageNames[p + '/']) return pageNames[p + '/'];
        var last = p.replace(/\/+$/, '').split('/').pop() || p;
        last = decodeURIComponentSafe(last).replace(/\.html?$/, '').replace(/[-_]+/g, ' ');
        return last.charAt(0).toUpperCase() + last.slice(1);
    }
    function decodeURIComponentSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
    function flag(cc) {
        if (!/^[A-Z]{2}$/.test(cc) || cc === 'XX') return '';
        return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
    }
    function country(cc) {
        if (cc === 'XX' || !cc) return 'Unknown';
        if (cc === 'T1') return 'Tor network';
        var n = '';
        try { n = regions ? regions.of(cc) : ''; } catch (e) { /* not a region code */ }
        return n && n !== cc ? n : cc;
    }
    var LABEL = {
        page: function (k) { return { text: pageName(k), sub: k }; },
        ref: function (k) { return k === '(direct)' ? { text: 'No other site', sub: 'typed, bookmarked, or a link within this site', muted: true } : { text: k }; },
        country: function (k) { return { text: country(k), icon: flag(k), muted: k === 'XX' }; },
        device: function (k) { return { text: { phone: 'Phone', tablet: 'Tablet', desktop: 'Computer' }[k] || k }; },
        browser: function (k) { return { text: k }; }
    };
    var LIMIT = { page: 10, ref: 8, country: 10, device: 3, browser: 6 };

    /* ---------- dates (the counter's days are UTC days) ---------- */
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    function utc(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
    function iso(d) { return d.toISOString().slice(0, 10); }
    function short(d) { return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
    function long(d) { return DAY[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }

    /* ---------- state ---------- */
    var status = $('st-status'), body = $('st-body'), cache = {}, days = 30, data = null, req = 0;
    function say(t, bad) { status.textContent = t; status.classList.toggle('is-bad', !!bad); }

    function load(n) {
        days = n;
        Array.prototype.forEach.call(root.querySelectorAll('.st-range-btn'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-days') === n)); });
        if (cache[n]) return show(cache[n]);
        var my = ++req;
        say('Loading the numbers…');
        root.classList.add('is-loading');
        var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
        fetch(end + '/stats?days=' + n, { credentials: 'omit', headers: { Authorization: 'Bearer ' + key }, cache: 'no-store', signal: ctl ? ctl.signal : undefined })
            .then(function (r) {
                if (r.status === 401) { lock('That key was not accepted.'); throw new Error('key'); }
                if (!r.ok) throw new Error('http ' + r.status);
                return r.json();
            })
            .then(function (d) {
                if (!d || typeof d.daily !== 'object' || typeof d.totals !== 'object') throw new Error('shape');
                cache[n] = d;
                if (my === req) show(d);
            })
            .catch(function (err) {
                if (my !== req || (err && err.message === 'key')) return;
                body.hidden = true;
                say('The numbers could not be loaded right now. Please try again later.', true);
            })
            .then(function () { clearTimeout(timer); if (my === req) root.classList.remove('is-loading'); });
    }

    function show(d) {
        data = d;
        root.classList.remove('is-loading');
        var list = [], start = utc(d.since), n = d.days || days, total = 0;
        for (var i = 0; i < n; i++) {
            var day = new Date(start.getTime() + i * 864e5), v = +d.daily[iso(day)] || 0;
            list.push({ day: day, v: v });
            total += v;
        }
        if (!total) {
            body.hidden = true;
            say('No visits counted yet' + (n < 90 ? ' in the last ' + n + ' days.' : '.'));
            return;
        }
        say('');
        body.hidden = false;
        $('st-total').textContent = fmt(total);
        $('st-total-cap').textContent = (total === 1 ? 'view' : 'views') + ' in the ' + n + ' days to ' + short(list[list.length - 1].day);
        var avg = total / n;
        $('st-today').textContent = avg < 10 ? avg.toFixed(1) : fmt(Math.round(avg));
        data.list = list;
        chart(list);
        Array.prototype.forEach.call(root.querySelectorAll('.st-list'), function (ol) { ranked(ol, ol.getAttribute('data-kind'), d.totals[ol.getAttribute('data-kind')] || {}); });
    }

    /* ---------- ranked lists: name, count and share, with a thin bar for the share ---------- */
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function ranked(ol, kind, obj) {
        ol.textContent = '';
        var rows = Object.keys(obj).map(function (k) { return [k, +obj[k] || 0]; }).filter(function (r) { return r[1] > 0; });
        rows.sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); });
        var sum = rows.reduce(function (s, r) { return s + r[1]; }, 0);
        if (!sum) { ol.appendChild(el('li', 'st-none', 'Nothing yet.')); return; }
        /* "(other)" (small numbers grouped by the counter) always goes last, together with what does not fit */
        var lim = LIMIT[kind] || 8, rest = 0, restN = 0, other = false;
        rows = rows.filter(function (r) { if (r[0] !== '(other)') return true; rest += r[1]; other = true; return false; });
        if (rows.length > (other ? lim - 1 : lim)) {
            rows.slice(lim - 1).forEach(function (r) { rest += r[1]; restN++; });
            rows = rows.slice(0, lim - 1);
        }
        var max = Math.max(rows.length ? rows[0][1] : 0, rest);
        function row(lab, v) {
            var li = el('li', 'st-row' + (lab.muted ? ' is-muted' : '')), name = el('span', 'st-name');
            if (lab.icon) name.appendChild(el('span', 'st-flag', lab.icon));
            name.appendChild(el('span', 'st-name-text', lab.text));
            if (lab.sub && lab.sub !== lab.text) name.title = lab.sub;
            li.appendChild(name);
            var pct = Math.round(v / sum * 100);
            li.appendChild(el('span', 'st-val', fmt(v)));
            li.appendChild(el('span', 'st-pct', (pct < 1 ? '<1' : pct) + '%'));
            if (kind === 'page' && lab.sub && lab.sub !== lab.text) li.appendChild(el('span', 'st-path', lab.sub));
            var bar = el('span', 'st-track'), fill = el('span', 'st-fill');
            fill.style.width = Math.max(1, v / max * 100) + '%';
            bar.appendChild(fill);
            li.appendChild(bar);
            ol.appendChild(li);
        }
        rows.forEach(function (r) { row(LABEL[kind] ? LABEL[kind](r[0]) : { text: r[0] }, r[1]); });
        if (other) row({ text: 'Others', sub: 'Under 3 views each, grouped so no single visit shows', muted: true }, rest);
        else if (restN) row({ text: restN + ' more', muted: true }, rest);
    }

    /* ---------- the daily chart: one navy bar per day up to yesterday, a tooltip on hover ---------- */
    var chartBox = $('st-chart'), tip = null;
    function svg(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function nice(max) {
        if (max <= 4) return Math.max(1, max);
        var p = Math.pow(10, Math.floor(Math.log10(max))), m = max / p;
        var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
        for (var i = 0; i < steps.length; i++) if (m <= steps[i] + 1e-9) return steps[i] * p;
        return 10 * p;
    }
    function chart(list) {
        chartBox.textContent = '';
        var W = Math.max(260, chartBox.clientWidth), phone = W < 520, H = phone ? 150 : 190;
        var padL = 36, padR = 4, padT = 10, padB = 24, iw = W - padL - padR, ih = H - padT - padB;
        var max = nice(Math.max.apply(null, list.map(function (x) { return x.v; })));
        var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Views per day over the last ' + list.length + ' days' }, chartBox);
        /* grid: 0, half and the top, recessive */
        [0, max / 2, max].forEach(function (t, i) {
            var y = padT + ih - t / max * ih;
            svg('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: i ? 'st-grid-line' : 'st-base-line' }, s);
            if (i && t !== Math.round(t)) return;
            svg('text', { x: padL - 6, y: y + 4, class: 'st-axis', 'text-anchor': 'end' }, s).textContent = fmt(t);
        });
        var step = iw / list.length, gap = step > 6 ? 2 : step > 3 ? 1 : 0, bw = Math.max(1, step - gap), r = Math.min(3, bw / 3);
        list.forEach(function (x, i) {
            var h = x.v / max * ih, X = padL + i * step + gap / 2, Y = padT + ih - h;
            if (h > 0) {
                h = Math.max(h, 1.5);
                Y = padT + ih - h;
                var rr = Math.min(r, h);
                svg('path', { d: 'M' + X + ',' + (padT + ih) + 'V' + (Y + rr) + 'Q' + X + ',' + Y + ' ' + (X + rr) + ',' + Y + 'H' + (X + bw - rr) + 'Q' + (X + bw) + ',' + Y + ' ' + (X + bw) + ',' + (Y + rr) + 'V' + (padT + ih) + 'Z',
                    class: 'st-bar', 'data-i': i }, s);
            }
            svg('rect', { x: padL + i * step, y: padT, width: step, height: ih, class: 'st-hit', 'data-i': i }, s);
        });
        /* date labels: first, middle and last day */
        var marks = list.length > 2 ? [0, Math.floor((list.length - 1) / 2), list.length - 1] : [0, list.length - 1];
        marks.forEach(function (i, j) {
            var x = padL + (i + 0.5) * step, anchor = j === 0 ? 'start' : j === marks.length - 1 ? 'end' : 'middle';
            if (j === 0) x = padL; else if (j === marks.length - 1) x = W - padR;
            svg('text', { x: x, y: H - 6, class: 'st-axis', 'text-anchor': anchor }, s).textContent = short(list[i].day);
        });
        tip = el('div', 'st-tip');
        tip.hidden = true;
        chartBox.appendChild(tip);
        function hover(e) {
            var t = e.target.closest ? e.target.closest('[data-i]') : null;
            if (!t) return off();
            var i = +t.getAttribute('data-i'), x = list[i];
            Array.prototype.forEach.call(s.querySelectorAll('.st-bar.is-on'), function (b) { b.classList.remove('is-on'); });
            var bar = s.querySelector('.st-bar[data-i="' + i + '"]');
            if (bar) bar.classList.add('is-on');
            tip.textContent = '';
            tip.appendChild(el('strong', null, fmt(x.v) + (x.v === 1 ? ' view' : ' views')));
            tip.appendChild(el('span', null, long(x.day)));
            tip.hidden = false;
            var cx = padL + (i + 0.5) * step, tw = tip.offsetWidth;
            tip.style.left = Math.max(0, Math.min(W - tw, cx - tw / 2)) + 'px';
            tip.style.top = Math.max(0, padT + ih - x.v / max * ih - tip.offsetHeight - 8) + 'px';
        }
        function off() {
            tip.hidden = true;
            Array.prototype.forEach.call(s.querySelectorAll('.st-bar.is-on'), function (b) { b.classList.remove('is-on'); });
        }
        s.addEventListener('mousemove', hover);
        s.addEventListener('click', hover);
        s.addEventListener('mouseleave', off);
    }
    var lastW = 0, rt = null;
    window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { if (data && data.list && !body.hidden && chartBox.clientWidth !== lastW) { lastW = chartBox.clientWidth; chart(data.list); } }, 150);
    });

    Array.prototype.forEach.call(root.querySelectorAll('.st-range-btn'), function (b) {
        b.addEventListener('click', function () { load(+b.getAttribute('data-days')); });
    });
    if (key) { unlock(); load(30); } else lock();
})();
