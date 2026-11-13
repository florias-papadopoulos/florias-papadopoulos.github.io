/* The satellites page, part 20: loading the orbits, moving every object in time, the controls and the panel of the
   picked object. SGP4 is too slow to run for every object on every frame of a phone, so objects are propagated at
   sample times S seconds apart (the next sample is computed a little on every frame, ahead of time) and each frame
   interpolates between two samples (Hermite, 00-core.js). The layout is layouts/phd/satellites.html. */
var SATPAGE = (function () {
    'use strict';
    var app = document.getElementById('sat-app');
    if (!app || !self.SATJS) return null;
    var canvas = document.getElementById('sat-canvas');
    var $ = function (id) { return document.getElementById(id); };
    var nf = function (x, d) { return x.toLocaleString('en-GB', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); };

    /* the groups, from the check boxes in the page (their order is the order of loading; an object in two groups
       keeps the first) */
    var groups = Array.prototype.map.call(app.querySelectorAll('input[data-group]'), function (el) {
        var c = el.getAttribute('data-color');
        return { id: el.getAttribute('data-group'), el: el, label: el.getAttribute('data-label'),
            own: el.hasAttribute('data-own'), rgb: [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }), n: 0 };
    });
    var O = { n: 0, name: [], id: [], intl: [], grp: [], rec: [], s: [] };
    var globe = null, pos = null, col = null, tmp = null;
    var clock = { t: Date.now(), speed: 1, live: true, wall: performance.now() };
    var sel = null;           /* { list: [i], orbitT: ms } or a close approach { list: [a, b], ca: {...} } */
    var running = true;

    function status(msg) {
        var el = $('sat-loading');
        el.textContent = msg || '';
        el.hidden = !msg;
    }

    /* ---------- loading ---------- */
    function load() {
        var base = app.getAttribute('data-base');
        var meta = fetch(base + 'meta.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
        var files = groups.map(function (g) {
            return fetch(base + g.id + '.csv').then(function (r) {
                if (!r.ok) throw new Error(g.id + ': ' + r.status);
                return r.text();
            });
        });
        return Promise.all([meta].concat(files)).then(function (res) {
            var seen = new Set();
            groups.forEach(function (g, gi) {
                SAT.parseCSV(res[gi + 1]).forEach(function (r) {
                    if (seen.has(r.NORAD_CAT_ID)) return;
                    seen.add(r.NORAD_CAT_ID);
                    var s = SAT.satrec(r);
                    if (!s) return;
                    O.name.push(r.OBJECT_NAME); O.id.push(r.NORAD_CAT_ID); O.intl.push(r.OBJECT_ID);
                    O.grp.push(gi); O.rec.push(r); O.s.push(s);
                    g.n++;
                });
            });
            O.n = O.name.length;
            showMeta(res[0]);
        });
    }
    function showMeta(meta) {
        groups.forEach(function (g) {
            var c = g.el.parentNode.querySelector('.sat-count');
            if (c) c.textContent = nf(g.n);
        });
        var when = 0;          /* the oldest group (a group whose download failed keeps an older snapshot) */
        if (meta && meta.groups) Object.keys(meta.groups).forEach(function (k) {
            var f = Date.parse(meta.groups[k].fetched || '');
            if (f && (!when || f < when)) when = f;
        });
        var el = $('sat-fetched');
        if (el) el.textContent = nf(O.n) + ' objects, orbital elements fetched from CelesTrak ' +
            (when ? fmtDate(when) + ' UTC' : 'recently') + '.';
    }

    /* ---------- time and propagation ---------- */
    var smp = { A: null, B: null, C: null, spare: [] };
    function sample(t) {
        var s = smp.spare.pop() || { p: new Float64Array(3 * O.n), v: new Float64Array(3 * O.n), ok: new Uint8Array(O.n) };
        s.t = t; s.k = 0;
        return s;
    }
    function fill(s, budget) {
        var end = performance.now() + budget;
        while (s.k < O.n) {
            for (var c = 0; c < 250 && s.k < O.n; c++, s.k++) s.ok[s.k] = SAT.state(O.s[s.k], s.t, s.p, s.v, 3 * s.k) ? 1 : 0;
            if (performance.now() > end) break;
        }
        return s.k >= O.n;
    }
    function step() { return Math.max(60, Math.min(300, clock.speed * 2)) * 1000; }
    function positions(t) {
        if (!smp.A || t < smp.A.t || t > smp.B.t + 600000) {
            [smp.A, smp.B, smp.C].forEach(function (s) { if (s) smp.spare.push(s); });
            smp.A = sample(t); fill(smp.A, Infinity);
            smp.B = sample(t + step()); fill(smp.B, Infinity);
            smp.C = null;
        }
        while (t > smp.B.t) {
            if (!smp.C) smp.C = sample(smp.B.t + step());
            fill(smp.C, Infinity);
            smp.spare.push(smp.A);
            smp.A = smp.B; smp.B = smp.C; smp.C = null;
        }
        if (!smp.C) smp.C = sample(smp.B.t + step());
        if (smp.C.k < O.n) fill(smp.C, 4);
        var A = smp.A, B = smp.B, h = (B.t - A.t) / 1000, u = (t - A.t) / (B.t - A.t), k = 1 / SAT.RE;
        for (var i = 0; i < O.n; i++) {
            var o = 3 * i;
            if (A.ok[i] && B.ok[i]) {
                SAT.hermite(A.p, A.v, B.p, B.v, o, h, u, tmp, null, o);
                pos[o] = tmp[o] * k; pos[o + 1] = tmp[o + 1] * k; pos[o + 2] = tmp[o + 2] * k;
            } else { pos[o] = pos[o + 1] = pos[o + 2] = 0; }      /* inside the Earth: not drawn */
        }
    }
    function now() {
        var w = performance.now();
        clock.t += (w - clock.wall) * clock.speed;
        clock.wall = w;
        return clock.t;
    }
    function setTime(t, speed) {
        now();
        clock.t = t;
        if (speed !== undefined) clock.speed = speed;
        clock.live = false;
        timeButtons();
    }
    function goLive() {
        clock.t = Date.now(); clock.wall = performance.now(); clock.speed = 1; clock.live = true;
        timeButtons();
    }
    function timeButtons() {
        Array.prototype.forEach.call(app.querySelectorAll('[data-speed]'), function (b) {
            b.setAttribute('aria-pressed', Number(b.getAttribute('data-speed')) === clock.speed ? 'true' : 'false');
        });
        $('sat-now').setAttribute('aria-pressed', clock.live && clock.speed === 1 ? 'true' : 'false');
    }

    /* ---------- colours ---------- */
    function colours() {
        for (var i = 0; i < O.n; i++) {
            var g = groups[O.grp[i]];
            col[4 * i] = g.rgb[0]; col[4 * i + 1] = g.rgb[1]; col[4 * i + 2] = g.rgb[2];
            col[4 * i + 3] = g.el.checked ? (g.own ? 170 : 235) : 0;
        }
        if (globe) globe.updateColors(col);
    }
    function shown(i) { return groups[O.grp[i]].el.checked; }
    var spaceBg = [0.05, 0.08, 0.14];
    function readBg() {
        var c = getComputedStyle(canvas).getPropertyValue('--sat-space').trim();
        var m = /^#([0-9a-f]{6})$/i.exec(c);
        if (m) spaceBg = [0, 2, 4].map(function (i) { return parseInt(m[1].substr(i, 2), 16) / 255; });
        if (globe) globe.dirty = true;
    }

    /* ---------- the picked object(s) ---------- */
    var HL = [[255, 255, 255], [255, 209, 102]];
    function orbitOf(i, t) {
        var per = SAT.orbit(O.rec[i]).period, n = 240, p = new Float32Array(3 * (n + 1)), q = new Float64Array(3), v = new Float64Array(3);
        var span = Math.min(per, 1440) * 60000, last = null;
        for (var k = 0; k <= n; k++) {
            if (SAT.state(O.s[i], t + span * k / n, q, v, 0)) last = [q[0] / SAT.RE, q[1] / SAT.RE, q[2] / SAT.RE];
            if (last) p.set(last, 3 * k);
        }
        return p;
    }
    function select(i) {
        sel = i < 0 ? null : { list: [i] };
        refreshSelection(true);
        info();
    }
    function refreshSelection(force) {
        if (!globe) return;
        var t = clock.t;
        if (!sel) { globe.setLines([]); globe.setMarkers([]); info(); return; }
        var per = SAT.orbit(O.rec[sel.list[0]]).period * 60000;
        if (force || !sel.orbitT || Math.abs(t - sel.orbitT) > per / 2) {
            sel.orbitT = t;
            globe.setLines(sel.list.map(function (i, k) {
                return { pts: orbitOf(i, t - (sel.ca ? per / 4 : 0)), c: HL[k].map(function (x) { return x / 255; }).concat(0.8) };
            }));
        }
        var m = sel.list.map(function (i, k) { return { p: [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]], c: HL[k], size: 16 }; });
        if (sel.ca) m.push({ p: sel.ca.p, c: [255, 107, 107], size: 9 });
        globe.setMarkers(m);
    }
    function info() {
        var box = $('sat-info');
        if (!sel) {
            box.innerHTML = '<p class="sat-info-empty">Tap or click a dot to see what it is.</p>';
            return;
        }
        var t = clock.t, html = '';
        if (sel.ca) {
            var ca = sel.ca;
            html += '<p class="sat-info-kicker">Close approach</p><p class="sat-info-big">' + nf(ca.d, 2) + ' km apart at ' +
                fmtTime(ca.t) + ' UTC</p><p class="sat-info-line">' + nf(ca.alt) + ' km up, passing each other at ' +
                nf(ca.v, 1) + ' km/s. Time is stopped there; press play to watch.</p>';
        }
        sel.list.forEach(function (i, k) {
            var o = SAT.orbit(O.rec[i]), q = new Float64Array(3), v = new Float64Array(3);
            var ok = SAT.state(O.s[i], t, q, v, 0), g = ok ? SAT.geodetic(q, t) : null;
            var age = (t - Date.parse(O.rec[i].EPOCH + 'Z')) / 3600000;
            html += '<div class="sat-obj"><p class="sat-info-name"><span class="sat-swatch" style="background:rgb(' +
                (sel.list.length > 1 ? HL[k] : groups[O.grp[i]].rgb).join(',') + ')"></span>' + esc(O.name[i]) + '</p>' +
                '<p class="sat-info-sub">' + esc(groups[O.grp[i]].label) + ', catalogue number ' + esc(O.id[i]) +
                (O.intl[i] ? ', launched ' + esc(O.intl[i].slice(0, 4)) : '') + '</p><dl class="sat-dl">' +
                (ok ? row('Altitude', nf(g.alt) + ' km') + row('Speed', nf(Math.hypot(v[0], v[1], v[2]), 2) + ' km/s') +
                    row('Over', fmtLatLon(g.lat, g.lon)) : row('Position', 'no longer computable (decayed?)')) +
                row('Orbit', SAT.orbitClass(o)) +
                row('Height range', nf(o.perigee) + ' to ' + nf(o.apogee) + ' km') +
                row('One orbit', o.period < 180 ? nf(o.period) + ' min' : nf(o.period / 60, 1) + ' h') +
                row('Inclination', nf(o.inc, 1) + '°') +
                row('Elements', (Math.abs(age) < 48 ? nf(Math.abs(age)) + ' h ' : nf(Math.abs(age) / 24) + ' days ') + (age >= 0 ? 'old' : 'ahead')) +
                '</dl></div>';
        });
        box.innerHTML = html;
    }
    function row(k, v) { return '<dt>' + k + '</dt><dd>' + v + '</dd>'; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
    function fmtLatLon(lat, lon) {
        return nf(Math.abs(lat), 1) + '°' + (lat >= 0 ? 'N' : 'S') + ', ' + nf(Math.abs(lon), 1) + '°' + (lon >= 0 ? 'E' : 'W');
    }
    function pad(x) { return (x < 10 ? '0' : '') + x; }
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function fmtDate(t) {
        var d = new Date(t);
        return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ', ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
    }
    function fmtTime(t) {
        var d = new Date(t);
        return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
    }
    function fmtOffset(ms) {
        var m = Math.round(Math.abs(ms) / 60000);
        if (m < 1) return 'now';
        var s = m < 60 ? m + ' min' : m < 2880 ? Math.floor(m / 60) + ' h ' + pad(m % 60) + ' min' : Math.round(m / 1440) + ' days';
        return ms > 0 ? 'in ' + s : s + ' ago';
    }

    /* a close approach from the list (30-approach.js): both objects, their orbits, time stopped at the closest point */
    function showPair(a, b, ca) {
        setTime(ca.t, 0);
        var q = new Float64Array(3), v = new Float64Array(3), p = [0, 0, 0];
        if (SAT.state(O.s[a], ca.t, q, v, 0)) p = [q[0] / SAT.RE, q[1] / SAT.RE, q[2] / SAT.RE];
        sel = { list: [a, b], ca: { t: ca.t, d: ca.d, v: ca.v, alt: ca.alt, p: p } };
        positions(clock.t);
        globe.updatePositions(pos);
        refreshSelection(true);
        globe.lookAt(p, 3);
        info();
        var top = app.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight / 3) window.scrollTo(0, window.scrollY + top - 12);
    }

    /* ---------- the loop ---------- */
    var lastInfo = 0, lastClock = 0, visible = true;
    function frame() {
        if (!running) return;
        requestAnimationFrame(frame);
        if (!visible) return;
        var t = now();
        if (clock.speed !== 0 || !smp.A) {
            positions(t);
            globe.updatePositions(pos);
            globe.setTime(SAT.gmst(t), SAT.sunDir(t));
            if (sel) refreshSelection(false);
        }
        var w = performance.now();
        if (w - lastClock > 250) {
            lastClock = w;
            $('sat-clock').textContent = fmtDate(t) + ':' + pad(new Date(t).getUTCSeconds()) + ' UTC';
            var off = t - Date.now();
            $('sat-offset').textContent = clock.live && Math.abs(off) < 2000 ? 'live' : fmtOffset(off);
        }
        if (sel && clock.speed !== 0 && w - lastInfo > 500) { lastInfo = w; info(); }
        if (globe.dirty) globe.render(spaceBg);
    }

    /* ---------- start ---------- */
    function start() {
        try { globe = GLOBE.create(canvas); } catch (e) { globe = null; }
        if (!globe) { status('This browser cannot draw the globe (WebGL is off or not supported).'); return; }
        readBg();
        var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
        if (mq && mq.addEventListener) mq.addEventListener('change', readBg);
        new MutationObserver(readBg).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        var img = new Image();
        img.onload = function () { globe.setEarthImage(img); };
        img.src = app.getAttribute('data-earth');
        globe.cam.lon = SAT.gmst(Date.now()) + 15 * Math.PI / 180;       /* Europe and Africa in view */
        globe.cam.dist = window.innerWidth < 600 ? 7.5 : 7;
        status('Loading orbits');
        load().then(function () {
            pos = new Float32Array(3 * O.n); col = new Uint8Array(4 * O.n); tmp = new Float64Array(3 * O.n);
            positions(clock.t);
            globe.setPoints(pos, col, O.n);
            colours();
            status('');
            info();
            requestAnimationFrame(frame);
            if (self.SATCA) SATCA.ready();
        }).catch(function () { status('The orbit data could not be loaded.'); });

        groups.forEach(function (g) { g.el.addEventListener('change', function () { colours(); if (self.SATCA) SATCA.stale(); }); });
        Array.prototype.forEach.call(app.querySelectorAll('[data-speed]'), function (b) {
            b.addEventListener('click', function () {
                now();
                var s = Number(b.getAttribute('data-speed'));
                clock.speed = s;
                if (s !== 1) clock.live = false;
                timeButtons();
            });
        });
        $('sat-now').addEventListener('click', function () {
            if (sel && sel.ca) { sel = null; refreshSelection(true); }
            goLive();
        });
        $('sat-zoom-in').addEventListener('click', function () { globe.zoom(0.8); });
        $('sat-zoom-out').addEventListener('click', function () { globe.zoom(1.25); });
        globe.onTap = function (x, y, type) {
            if (!O.n) return;
            var i = globe.pick(x, y, pos, O.n, shown, type === 'mouse' ? 10 : 20);
            select(i);
        };
        if ('IntersectionObserver' in window) {
            /* nothing is drawn while the globe is scrolled out of view (the clock still runs) */
            new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) globe.dirty = true; }).observe(canvas);
        }
        timeButtons();
    }

    start();
    return {
        objects: O, groups: groups, showPair: showPair, time: function () { return clock.t; },
        fmtTime: fmtTime, fmtOffset: fmtOffset, nf: nf, esc: esc
    };
}());
