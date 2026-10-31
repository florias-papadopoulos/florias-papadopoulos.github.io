/* Home page cat and its research lab (markup in layouts/partials/cat.html, styles in assets/css/common/cat.css).

   The cat walks, runs, climbs and jumps between page elements and a mountain range at the bottom of the page.
   Around it, toys from the research on privacy-preserving proximity testing:
   - two drones (w, q) with an l-infinity delta-region: each one learns only the bit "is something inside my
     region?", shows it, and swerves to avoid collisions; the cat can ride them
   - a fuzzy-matching card: the interval [42, 55] and the point q as binary prefixes with wildcards, matching
     when the two sets intersect (as in the talk slides)
   - a 3^k mod 7 clock and integer blocks
   You can drag the cat, the drones, the blocks and q, click the clock, and click the cat to pet it. */
(function () {
    'use strict';
    var layer = document.getElementById('cat-layer');
    var world = document.getElementById('world-layer');
    var cat = document.getElementById('cat');
    var svgT = document.getElementById('terrain');
    var panel = document.querySelector('.home .home-panel');
    if (!layer || !world || !cat || !svgT || !panel) return;
    document.body.appendChild(world);              /* page coordinates, including the side margins */
    document.body.appendChild(layer);

    var NS = 'http://www.w3.org/2000/svg';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var CW = 88, CH = 72;
    var pos = { x: 0, y: 0 };                      /* the cat's feet, in layer coordinates */
    var at = null;                                 /* where it is: {kind, el?, drone?} */
    var timer = null, moving = false, token = 0;
    var ridge = [], wide = false, phone = false, side = 0;
    var drones = [], clock = null, fm = null, blocks = [];
    var pets = 0;
    try { pets = +localStorage.getItem('cat-pets') || 0; } catch (e) { /* no storage */ }

    /* ---------- helpers ---------- */
    function rel(el) {
        var r = el.getBoundingClientRect(), L = layer.getBoundingClientRect();
        return { x: r.left - L.left, y: r.top - L.top, w: r.width, h: r.height };
    }
    function pointer(e) {
        var L = layer.getBoundingClientRect();
        return { x: e.clientX - L.left, y: e.clientY - L.top };
    }
    function onScreen(y) {
        var t = y + layer.getBoundingClientRect().top;
        return t > -40 && t < window.innerHeight + 40;
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function div(cls, parent, html) {
        var d = document.createElement('div');
        d.className = cls;
        if (html) d.innerHTML = html;
        (parent || layer).appendChild(d);
        return d;
    }
    function svgEl(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        (parent || svgT).appendChild(e);
        return e;
    }
    /* drag with mouse or touch; click() is called when the pointer did not move */
    function draggable(el, h) {
        el.addEventListener('pointerdown', function (e) {
            if (e.button > 0) return;
            e.preventDefault();
            e.stopPropagation();
            el.setPointerCapture(e.pointerId);
            var start = pointer(e), dragging = false;
            function move(ev) {
                var p = pointer(ev);
                if (!dragging && Math.abs(p.x - start.x) + Math.abs(p.y - start.y) > 5) { dragging = true; if (h.start) h.start(p); }
                if (dragging) h.move(p);
            }
            function up(ev) {
                el.removeEventListener('pointermove', move);
                el.removeEventListener('pointerup', up);
                el.removeEventListener('pointercancel', up);
                if (dragging) h.end(pointer(ev)); else if (h.click) h.click(ev);
            }
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
        });
    }

    /* letters of the name become separate spans the cat can bat */
    var h1 = document.querySelector('.home .name-block h1');
    if (h1 && !h1.querySelector('.ltr')) {
        var name = h1.textContent.trim();
        h1.setAttribute('aria-label', name);
        h1.textContent = '';
        name.split('').forEach(function (c) {
            var s = document.createElement('span');
            s.className = 'ltr';
            s.setAttribute('aria-hidden', 'true');
            s.textContent = c;
            h1.appendChild(s);
        });
    }

    /* ---------- mountains ---------- */
    function groundY(x) {
        if (!ridge.length) return 0;
        if (x <= ridge[0].x) return ridge[0].y;
        for (var i = 1; i < ridge.length; i++) {
            if (x <= ridge[i].x) {
                var a = ridge[i - 1], b = ridge[i], t = (x - a.x) / (b.x - a.x);
                return a.y + (b.y - a.y) * t;
            }
        }
        return ridge[ridge.length - 1].y;
    }
    function slope(x, dir) { return Math.atan2(groundY(x + 4 * (dir || 1)) - groundY(x), 4) * 180 / Math.PI; }

    function buildTerrain() {
        while (svgT.firstChild) svgT.removeChild(svgT.firstChild);
        var W = layer.clientWidth, F = parseFloat(layer.style.height);
        var p = rel(panel);
        side = Math.max(0, Math.min(p.x, W - p.x - p.w));
        wide = side > 200;
        phone = W < 700;
        if (phone) {                               /* phones: no mountains, a flat floor at the bottom of the page */
            ridge = [{ x: 0, y: F - 2 }, { x: W, y: F - 2 }];
            return { W: W, F: F, peak: 0, xm: 0 };
        }
        var peak = wide ? Math.min(400, window.innerHeight * 0.44) : 120;
        var mid = wide ? 74 : 60;
        var xm = Math.max(side, W * 0.2);
        var Lp = [[0, .5], [.16, .74], [.3, .6], [.5, 1], [.68, .64], [.84, .8], [1, .36]];
        var Rp = [[0, .4], [.14, .78], [.3, .62], [.48, 1.06], [.66, .7], [.82, .84], [1, .52]];
        var pts = Lp.map(function (q) { return { x: q[0] * xm, y: F - q[1] * peak }; });
        var n = Math.max(2, Math.round((W - 2 * xm) / 110));
        for (var i = 1; i < n; i++) {
            var h = mid * (0.7 + 0.35 * Math.sin(i * 1.7) + 0.15 * Math.cos(i * 3.1));
            pts.push({ x: xm + (W - 2 * xm) * i / n, y: F - h });
        }
        Rp.forEach(function (q) { pts.push({ x: W - xm + q[0] * xm, y: F - q[1] * peak }); });
        ridge = pts;

        svgT.setAttribute('width', W);
        svgT.setAttribute('height', F + 2);
        var defs = svgEl('defs', {});
        var g = svgEl('linearGradient', { id: 't-grad', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        svgEl('stop', { offset: 0, 'stop-color': '#d2dcea' }, g);
        svgEl('stop', { offset: 1, 'stop-color': '#bccadc' }, g);
        var back = pts.map(function (q, i) { return q.x + ',' + (q.y - 30 - 22 * Math.sin(i * 1.3)); });
        svgEl('polygon', { 'class': 't-back', points: '0,' + F + ' ' + back.join(' ') + ' ' + W + ',' + F });
        svgEl('polygon', { 'class': 't-ground', points: '0,' + (F + 4) + ' ' + pts.map(function (q) { return q.x + ',' + q.y; }).join(' ') + ' ' + W + ',' + (F + 4) });
        var top = null;
        for (var j = 1; j < pts.length - 1; j++) {
            var a = pts[j - 1], b = pts[j], c = pts[j + 1];
            if (F - b.y > peak * 0.82 && b.y < a.y && b.y < c.y) {
                var lx = b.x + (a.x - b.x) * 26 / (a.y - b.y), rx = b.x + (c.x - b.x) * 26 / (c.y - b.y);
                svgEl('polygon', { 'class': 't-snow', points: [b.x + ',' + b.y, rx + ',' + (b.y + 26), (b.x + (rx - b.x) * .45) + ',' + (b.y + 18),
                    b.x + ',' + (b.y + 24), (b.x + (lx - b.x) * .45) + ',' + (b.y + 18), lx + ',' + (b.y + 26)].join(' ') });
                if (!top || b.y < top.y) top = b;
            }
        }
        /* small clusters of layered pines on the lower slopes, light on the left and shaded on the right */
        for (var k = 2; k < pts.length - 1; k += 2) {
            if (F - pts[k].y < peak * 0.55) {
                var n = 2 + (k % 3 === 0 ? 1 : 0);
                for (var t = 0; t < n; t++) pine(pts[k].x + 10 + t * 15, 22 + ((k * 7 + t * 13) % 3) * 7);
            }
        }
        if (wide && top) {
            svgEl('line', { 'class': 't-pole', x1: top.x, y1: top.y + 2, x2: top.x, y2: top.y - 36 });
            svgEl('polygon', { 'class': 't-flag', points: top.x + ',' + (top.y - 36) + ' ' + (top.x + 24) + ',' + (top.y - 30) + ' ' + top.x + ',' + (top.y - 24) });
        }
        return { W: W, F: F, peak: peak, xm: xm };
    }

    function pine(x, h) {
        var y = groundY(x) + 3;
        svgEl('rect', { 'class': 't-trunk', x: x - 1.6, y: y - 6, width: 3.2, height: 7, rx: 1 });
        for (var i = 0; i < 3; i++) {
            var top = y - 5 - h + i * h * 0.27, hh = h * 0.48, w = h * (0.28 + 0.09 * i);
            svgEl('polygon', { 'class': 't-pine-l', points: x + ',' + top + ' ' + (x - w) + ',' + (top + hh) + ' ' + x + ',' + (top + hh) });
            svgEl('polygon', { 'class': 't-pine-d', points: x + ',' + top + ' ' + x + ',' + (top + hh) + ' ' + (x + w) + ',' + (top + hh) });
        }
    }

    function sizeLayers() {
        layer.style.height = world.style.height = '0px';
        layer.style.height = world.style.height = document.documentElement.scrollHeight + 'px';
    }

    /* ---------- lab: integer blocks ---------- */
    function placeOnGround(o) {
        o.el.style.left = (o.x - o.w / 2) + 'px';
        o.el.style.top = (groundY(o.x) - o.h + 2) + 'px';
    }
    function fall(o, done) {                       /* a dragged block falls back to the ground */
        var y0 = o.y, y1 = groundY(o.x) - o.h + 2;
        var dur = reduce ? 1 : Math.sqrt(Math.max(0, y1 - y0) / 1200) * 1000 + 60;
        animate(dur, function (t) { o.el.style.top = (y0 + (y1 - y0) * t * t) + 'px'; }, done || function () {}, true);
    }
    function makeBlocks(geo) {
        var vals = [42, 55, 49];
        var xs = wide ? [geo.xm + 40, geo.xm + 90, geo.W - geo.xm - 70] : [geo.W * 0.56, geo.W * 0.68, geo.W * 0.8];
        blocks = vals.map(function (v, i) {
            var b = { el: div('block' + (v === 49 ? ' is-q' : ''), layer), x: xs[i], w: 30, h: 30, v: v };
            b.el.textContent = v;
            b.el.title = v + ' = ' + v.toString(2).padStart(8, '0');
            placeOnGround(b);
            draggable(b.el, {
                move: function (p) { b.x = clamp(p.x, 20, geo.W - 20); b.y = p.y - b.h / 2; b.el.style.left = (b.x - b.w / 2) + 'px'; b.el.style.top = b.y + 'px'; },
                end: function () { fall(b); },
                click: function () { b.el.classList.toggle('show-bin'); }
            });
            return b;
        });
    }
    function pushBlock(b) {
        var dir = cat.classList.contains('left') ? -1 : 1;
        var from = b.x, to = clamp(from + dir * (36 + Math.random() * 40), 20, layer.clientWidth - 20);
        animate(600, function (t) { b.x = from + (to - from) * (1 - Math.pow(1 - t, 3)); placeOnGround(b); }, function () {}, true);
    }

    /* ---------- lab: 3^k mod 7 clock ---------- */
    function makeClock(geo) {
        var x = wide ? geo.xm * 0.62 : geo.W * 0.2;
        var c = { el: div('modclock', layer), x: x, w: 74, h: 92, k: 0 };
        c.el.innerHTML = '<div class="mc-face"><div class="mc-hand"></div><div class="mc-val">1</div></div>' +
            '<div class="mc-cap">3<sup class="mc-k">0</sup> mod 7</div>';
        for (var i = 0; i < 7; i++) {
            var t = document.createElement('span');
            t.className = 'mc-tick';
            t.textContent = i;
            t.style.transform = 'rotate(' + (i * 360 / 7) + 'deg) translateY(-25px) rotate(' + (-i * 360 / 7) + 'deg)';
            c.el.firstChild.appendChild(t);
        }
        placeOnGround(c);
        c.step = function () {
            c.k = (c.k + 1) % 6;
            var v = 1;
            for (var j = 0; j < c.k; j++) v = (v * 3) % 7;
            c.el.querySelector('.mc-val').textContent = v;
            c.el.querySelector('.mc-k').textContent = c.k;
            c.el.querySelector('.mc-hand').style.transform = 'rotate(' + (v * 360 / 7) + 'deg)';
            c.el.classList.remove('tick'); void c.el.offsetWidth; c.el.classList.add('tick');
        };
        c.el.addEventListener('click', c.step);
        c.el.title = 'Click: k → k + 1';
        clock = c;
    }

    /* ---------- lab: fuzzy matching card (wide screens) ---------- */
    var BITS = 8, LO = 32, HI = 63, WA = 42, WB = 55;
    function bin(v, len) { return v.toString(2).padStart(BITS, '0').slice(0, len); }
    function cover(a, b) {                         /* [a, b] as few dyadic intervals: prefixes with wildcards */
        var out = [];
        while (a <= b) {
            var size = 1, len = BITS;
            while (len > 0 && a % (size * 2) === 0 && a + size * 2 - 1 <= b) { size *= 2; len--; }
            out.push(bin(a, len) + '*'.repeat(BITS - len));
            a += size;
        }
        return out;
    }
    function prefixes(q, upTo) {                   /* q and its prefixes, up to upTo wildcards */
        var out = [];
        for (var s = 0; s <= upTo; s++) out.push(bin(q, BITS - s) + '*'.repeat(s));
        return out;
    }
    function makeFM(geo) {
        if (!wide) { fm = null; return; }
        var w = Math.min(232, side - 28);
        var f = { el: div('fm', layer), q: 49, w: w };
        f.el.style.width = w + 'px';
        f.el.style.left = ((side - w) / 2) + 'px';
        f.el.innerHTML = '<div class="fm-title">fuzzy matching &middot; is q within &delta; of w?</div>' +
            '<div class="fm-line"><div class="fm-int"></div><div class="fm-w"></div><div class="fm-q" title="drag q"></div></div>' +
            '<div class="fm-scale"><span>' + LO + '</span><span>w = 48.5, &delta; = 6.5</span><span>' + HI + '</span></div>' +
            '<div class="fm-set fm-W"></div><div class="fm-set fm-Q"></div><div class="fm-out"></div>';
        var line = f.el.querySelector('.fm-line');
        var frac = function (v) { return (v - LO) / (HI - LO) * 100; };
        f.el.querySelector('.fm-int').style.left = frac(WA) + '%';
        f.el.querySelector('.fm-int').style.width = (frac(WB) - frac(WA)) + '%';
        f.el.querySelector('.fm-w').style.left = frac((WA + WB) / 2) + '%';
        f.set = function (q) {
            f.q = clamp(Math.round(q), LO, HI);
            f.el.querySelector('.fm-q').style.left = frac(f.q) + '%';
            var W = cover(WA, WB), maxStar = Math.max.apply(null, W.map(function (s) { return (s.match(/\*/g) || []).length; }));
            var Q = prefixes(f.q, maxStar + 1);
            var hit = Q.filter(function (s) { return W.indexOf(s) >= 0; });
            f.el.querySelector('.fm-W').innerHTML = '<b>W</b>' + W.map(function (s) { return '<code' + (hit.indexOf(s) >= 0 ? ' class="hit"' : '') + '>' + s + '</code>'; }).join('');
            f.el.querySelector('.fm-Q').innerHTML = '<b>q=' + f.q + '</b>' + Q.map(function (s) { return '<code' + (hit.indexOf(s) >= 0 ? ' class="hit"' : '') + '>' + s + '</code>'; }).join('');
            f.el.querySelector('.fm-out').innerHTML = hit.length ? 'W &cap; Q &ne; &empty; &rarr; <b>match: 1</b>' : 'W &cap; Q = &empty; &rarr; <b>match: 0</b>';
            f.el.classList.toggle('is-match', hit.length > 0);
        };
        function fromX(p) { var r = rel(line); f.set(LO + (p.x - r.x) / r.w * (HI - LO)); }
        draggable(line, { move: fromX, end: fromX, click: function (e) { fromX(pointer(e)); } });
        f.set(f.q);
        /* vertically: centred between the top of the page and the mountains */
        var r = f.el.getBoundingClientRect();
        f.el.style.top = Math.max(20, (geo.F - geo.peak - r.height) * 0.42) + 'px';
        fm = f;
    }

    /* ---------- lab: drones with an l-infinity delta-region ---------- */
    var DRONE_SVG = '<svg viewBox="0 0 64 30" aria-hidden="true">' +
        '<g class="rotor"><ellipse cx="9" cy="5" rx="9" ry="2.2"/></g><g class="rotor"><ellipse cx="55" cy="5" rx="9" ry="2.2"/></g>' +
        '<path class="arm" d="M9 6v6h46V6"/>' +
        '<rect class="hull" x="18" y="9" width="28" height="13" rx="6"/>' +
        '<circle class="led" cx="32" cy="15.5" r="2.4"/>' +
        '<path class="arm" d="M24 22l-4 6M40 22l4 6"/></svg>';
    function hex(x, y) { return ((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ 0x5bd1e995) >>> 0; }
    function makeDrones(geo) {
        var delta = wide ? 62 : 34, box;     /* the whole delta-region stays on screen */
        if (wide) box = { x0: geo.W - side + delta + 6, x1: geo.W - delta - 8, y0: delta + 46, y1: Math.max(delta + 120, geo.F - geo.peak - 50) };
        else box = { x0: delta + 8, x1: geo.W - delta - 8, y0: geo.F - 92, y1: geo.F - 72 };
        var names = wide ? ['w', 'q'] : ['q'];
        drones = names.map(function (nm, i) {
            var d = { name: nm, el: div('drone drone-' + nm, layer), box: box, delta: delta, w: 64, h: 30,
                x: box.x0 + (box.x1 - box.x0) * (i ? 0.75 : 0.25), y: box.y0 + (box.y1 - box.y0) * (i ? 0.7 : 0.3),
                vx: 0, vy: 0, tx: 0, ty: 0, hold: 0, drag: false, alert: false, encT: 0 };
            d.el.innerHTML = '<div class="zone"></div>' + DRONE_SVG + '<span class="d-name">' + nm + '</span>' +
                '<span class="d-bit">proximity: 0</span><span class="d-enc"></span>';
            d.el.querySelector('.zone').style.cssText = 'width:' + 2 * delta + 'px;height:' + 2 * delta + 'px;margin:' + (-delta) + 'px 0 0 ' + (-delta) + 'px';
            pickWaypoint(d);
            draggable(d.el, {
                start: function () { d.drag = true; },
                move: function (p) { d.x = clamp(p.x, 20, geo.W - 20); d.y = clamp(p.y, 20, geo.F - 40); drawDrone(d); },
                end: function () { d.drag = false; d.vx = d.vy = 0; pickWaypoint(d); }
            });
            drawDrone(d);
            return d;
        });
    }
    function pickWaypoint(d) {
        var other = drones.filter(function (o) { return o !== d; })[0];
        if (other && Math.random() < 0.35) {      /* sometimes head for the other drone, to show the avoidance */
            d.tx = clamp(other.x + (Math.random() - 0.5) * 60, d.box.x0, d.box.x1);
            d.ty = clamp(other.y + (Math.random() - 0.5) * 60, d.box.y0, d.box.y1);
            return;
        }
        d.tx = d.box.x0 + Math.random() * (d.box.x1 - d.box.x0);
        d.ty = d.box.y0 + Math.random() * (d.box.y1 - d.box.y0);
    }
    function drawDrone(d) {
        d.el.style.left = d.x + 'px';
        d.el.style.top = d.y + 'px';
    }
    function inside(d, x, y) { return Math.max(Math.abs(x - d.x), Math.abs(y - d.y)) <= d.delta; }

    function tickDrones(dt, now) {
        drones.forEach(function (d) {
            var riding = at && at.kind === 'drone' && at.drone === d;
            if (!d.drag && !reduce) {
                if (now < d.hold) { d.vx *= 0.85; d.vy *= 0.85; }
                else {
                    var ax = (d.tx - d.x) * 1.6, ay = (d.ty - d.y) * 1.6;
                    var sp = riding ? 55 : 95;
                    d.vx += (clamp(ax, -sp, sp) - d.vx) * Math.min(1, dt * 2);
                    d.vy += (clamp(ay, -sp, sp) - d.vy) * Math.min(1, dt * 2);
                    if (Math.abs(d.tx - d.x) < 8 && Math.abs(d.ty - d.y) < 8) pickWaypoint(d);
                }
                d.x += d.vx * dt;
                d.y += d.vy * dt;
                d.x = clamp(d.x, d.box.x0, d.box.x1);
                d.y = clamp(d.y, d.box.y0, d.box.y1);
                drawDrone(d);
            }
            /* proximity: each drone only learns one bit, "is something inside my delta-region?" */
            var near = false, what = '';
            drones.forEach(function (o) {
                if (o !== d && inside(d, o.x, o.y)) {
                    near = true;
                    what = 'drone';
                    if (!d.drag && !reduce) {    /* collision avoidance: head away from the other drone */
                        d.tx = clamp(d.x + Math.sign(d.x - o.x || 1) * 140, d.box.x0, d.box.x1);
                        d.ty = clamp(d.y + Math.sign(d.y - o.y || 1) * 110, d.box.y0, d.box.y1);
                    }
                }
            });
            if (!riding && inside(d, pos.x, pos.y - CH / 2)) { near = true; what = what || 'cat'; }
            if (near !== d.alert) {
                d.alert = near;
                d.el.classList.toggle('alert', near);
                d.el.querySelector('.d-bit').textContent = near ? (what === 'cat' ? 'proximity: 1 · cat!' : 'proximity: 1 · avoid') : 'proximity: 0';
            }
            if (now - d.encT > 350) {
                d.encT = now;
                d.el.querySelector('.d-enc').textContent = 'Enc(x,y) ' + hex(d.x, d.y).toString(16).padStart(8, '0') + '…';
            }
            if (riding && !moving) place(d.x, d.y - d.h / 2 + 6);
        });
    }

    /* ---------- the cat ---------- */
    function place(x, y) {
        pos = { x: x, y: y };
        cat.style.left = (x - CW / 2) + 'px';
        cat.style.top = (y - CH + 3) + 'px';
    }
    function face(dx) {
        if (dx < -1) cat.classList.add('left');
        else if (dx > 1) cat.classList.remove('left');
    }
    function tilt(deg) { cat.style.setProperty('--tilt', (deg || 0).toFixed(1) + 'deg'); }
    function pose(cls) {
        cat.classList.remove('walk', 'run', 'climb', 'jump', 'crouch');
        if (cls) cls.split(' ').forEach(function (c) { cat.classList.add(c); });
    }
    function next(delay) {
        clearTimeout(timer);
        if (!reduce) timer = setTimeout(decide, delay);
    }
    /* frame-by-frame animation; a newer cat movement (or a drag) cancels older ones */
    function animate(dur, frame, done, free) {
        var id = free ? null : token, t0 = performance.now();
        function step(now) {
            if (!free && id !== token) return;
            var t = Math.min(1, (now - t0) / Math.max(1, dur));
            frame(t);
            if (t < 1) requestAnimationFrame(step); else done();
        }
        requestAnimationFrame(step);
    }
    function startMove() { token++; moving = true; cat.classList.add('moving'); cat.classList.remove('sleep', 'groom'); }
    function walkGround(x1, done) {
        x1 = clamp(x1, 30, layer.clientWidth - 30);
        var x0 = pos.x, dx = x1 - x0;
        if (Math.abs(dx) < 3) return done();
        var run = Math.abs(dx) > 380;
        face(dx);
        animate(Math.abs(dx) / (run ? 300 : 95) * 1000, function (t) {
            var x = x0 + dx * t, s = slope(x, Math.sign(dx));
            pose(run ? 'run' : Math.abs(s) > 32 ? 'walk climb' : 'walk');
            tilt(clamp(Math.sign(dx) * s, -55, 55));
            place(x, groundY(x));
        }, function () { pose(''); tilt(0); done(); });
    }
    function leap(target, done) {                 /* target(): {x, y}, read again at the end for moving targets */
        var x0 = pos.x, y0 = pos.y, t1 = target();
        face(t1.x - x0);
        pose('crouch');
        var id = token;
        setTimeout(function () {
            if (id !== token) return;
            var apex = Math.min(y0, t1.y) - 40 - Math.min(60, Math.abs(t1.x - x0) * 0.08);
            var dur = 380 + Math.sqrt(Math.abs(t1.y - y0) + Math.abs(t1.x - x0) * 0.5) * 22;
            var lead = Math.sign(t1.x - x0 || 1);
            pose('jump');
            animate(dur, function (t) {
                var tg = target(), a = 2 * y0 + 2 * tg.y - 4 * apex, b = -3 * y0 - tg.y + 4 * apex;
                tilt(lead * (t < 0.5 ? -10 : 8));
                place(x0 + (tg.x - x0) * t, a * t * t + b * t + y0);
            }, function () {
                pose(''); tilt(0);
                cat.classList.remove('land'); void cat.offsetWidth; cat.classList.add('land');
                done();
            });
        }, reduce ? 0 : 160);
    }
    function settle(p) {
        moving = false;
        cat.classList.remove('moving');
        at = p;
        arrive(p);
    }

    /* ---------- where the cat can go ---------- */
    function pagePerches() {
        var list = [];
        function push(sel, kind) {
            Array.prototype.forEach.call(document.querySelectorAll(sel), function (e) {
                if (e.getBoundingClientRect().width > 24) list.push({ el: e, kind: kind });
            });
        }
        push('.home .profile-photo', 'photo');
        push('.home .name-block h1', 'name');
        /* not the chips: sitting there, the cat would cover the tagline */
        push('.home .route', 'card');
        push('.home .paper', 'card');
        push('.home .buttons .button', 'button');
        if (fm) list.push({ el: fm.el, kind: 'fm' });
        return list;
    }
    function spotOn(p, fx) {
        var r = rel(p.el), pad = Math.min(26, r.w / 2);
        if (p.kind === 'name') {
            var l = h1.querySelectorAll('.ltr'), lr = rel(l[Math.floor(fx * (l.length - 1))]);
            return { x: lr.x + lr.w / 2, y: lr.y + lr.h * 0.18 };
        }
        if (p.kind === 'fm') {                     /* sit above the q marker */
            var qr = rel(fm.el.querySelector('.fm-q'));
            return { x: clamp(qr.x + qr.w / 2, r.x + 30, r.x + r.w - 30), y: r.y };
        }
        return { x: r.x + pad + (r.w - 2 * pad) * fx, y: r.y };
    }
    function goTo(o) {
        clearTimeout(timer);
        if (reduce) { var t = o.target(); place(t.x, t.y); at = o.p; return; }
        startMove();
        var tg = o.target(), fromGround = at && at.kind === 'ground';
        if (o.p.kind === 'ground') {
            if (fromGround) return walkGround(tg.x, function () { settle(o.p); });
            var lx = pos.x + (tg.x > pos.x ? 60 : -60);
            return leap(function () { return { x: lx, y: groundY(lx) }; }, function () { walkGround(tg.x, function () { settle(o.p); }); });
        }
        if (fromGround && o.p.kind !== 'drone') {
            var ux = tg.x + (pos.x < tg.x ? -70 : 70);
            return walkGround(ux, function () { leap(o.target, function () { settle(o.p); }); });
        }
        if (o.p.kind === 'drone') o.p.drone.hold = performance.now() + 1400;     /* the drone waits for the cat */
        leap(o.target, function () { settle(o.p); });
    }
    function decide() {
        if (moving) return next(400);
        var opts = [], fromGround = at && at.kind === 'ground', riding = at && at.kind === 'drone';
        function add(p, target, w) {
            var t = target();
            if (t.y < CH + 34) return;            /* no room above for the cat and its purr bubble */
            if (!fromGround && Math.abs(t.y - pos.y) > 300) return;   /* one hop at a time */
            if (fromGround && pos.y - t.y > 280 && p.kind !== 'ground') return;
            w = w / (1 + Math.abs(t.x - pos.x) / 500);
            if (!onScreen(t.y)) w *= 0.15;
            opts.push({ p: p, target: target, w: w });
        }
        pagePerches().forEach(function (p) {
            if (at && at.el === p.el && p.kind !== 'name') return;
            var fx = Math.random();
            add(p, function () { return spotOn(p, fx); },
                p.kind === 'name' ? 2 : p.kind === 'chip' ? 1.3 : p.kind === 'fm' ? 2.2 : 1);
        });
        drones.forEach(function (d) {
            if (riding && at.drone === d) return;
            add({ kind: 'drone', drone: d }, function () { return { x: d.x, y: d.y - d.h / 2 + 6 }; }, riding ? 0.4 : 1.8);
        });
        if (ridge.length) {
            var reach = fromGround || Math.abs(groundY(pos.x) - pos.y) < 300;
            if (reach) {
                var gw = fromGround ? 2.2 : 1;
                var tops = ridge.filter(function (q, i) { return i > 0 && i < ridge.length - 1 && q.y < ridge[i - 1].y && q.y < ridge[i + 1].y; });
                var pk = tops[Math.floor(Math.random() * tops.length)];
                if (pk) add({ kind: 'ground', what: 'peak' }, function () { return { x: pk.x, y: pk.y }; }, gw * 1.2);
                if (clock) add({ kind: 'ground', what: 'clock' }, function () { var x = clock.x - 46; return { x: x, y: groundY(x) }; }, gw * 1.4);
                blocks.forEach(function (b) {
                    add({ kind: 'ground', what: 'block', block: b }, function () { var x = b.x + (pos.x < b.x ? -34 : 34); return { x: x, y: groundY(x) }; }, gw * 0.7);
                });
                var rx = 40 + Math.random() * (layer.clientWidth - 80);
                add({ kind: 'ground', what: 'wander' }, function () { return { x: rx, y: groundY(rx) }; }, gw);
            }
        }
        var total = opts.reduce(function (s, o) { return s + o.w; }, 0), r = Math.random() * total;
        for (var i = 0; i < opts.length; i++) {
            r -= opts[i].w;
            if (r <= 0) return goTo(opts[i]);
        }
        next(1500);
    }

    /* ---------- what it does where it lands ---------- */
    function bat(after) {
        cat.classList.add('bat');
        setTimeout(after, 220);
        setTimeout(function () { cat.classList.remove('bat'); }, 950);
    }
    function bonk(e, cls, ms) {
        e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls);
        setTimeout(function () { e.classList.remove(cls); }, ms);
    }
    function arrive(p) {
        var r = Math.random();
        if (p.kind === 'drone') return next(4000 + Math.random() * 4000);      /* enjoy the ride */
        if (p.kind === 'name' && r < 0.75) {
            var best = null, bd = 1e9, reach = cat.classList.contains('left') ? -30 : 30;
            Array.prototype.forEach.call(h1.querySelectorAll('.ltr'), function (l) {
                var lr = rel(l), d = Math.abs(lr.x + lr.w / 2 - (pos.x + reach));
                if (l.textContent.trim() && d < bd) { bd = d; best = l; }
            });
            if (best) bat(function () { bonk(best, 'bonk', 900); });
            return next(1700 + Math.random() * 1500);
        }
        if (p.kind === 'chip' && r < 0.7) { bat(function () { bonk(p.el, 'nudged', 700); }); return next(1900 + Math.random() * 1500); }
        if (p.kind === 'fm') {
            bat(function () { fm.set(fm.q + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 6))); });
            return next(2200 + Math.random() * 1500);
        }
        if (p.what === 'clock') { face(clock.x - pos.x); bat(clock.step); return next(2000 + Math.random() * 1200); }
        if (p.what === 'block') { face(p.block.x - pos.x); bat(function () { pushBlock(p.block); }); return next(2200); }
        if ((p.what === 'peak' || p.kind === 'photo') && r < 0.18) return nap();
        if (r > 0.94 && p.kind !== 'button' && p.kind !== 'chip') return nap();
        if (r > 0.6) {
            cat.classList.add('groom');
            setTimeout(function () { cat.classList.remove('groom'); }, 2600);
        }
        next(2400 + Math.random() * 3000);
    }
    function nap() {
        cat.classList.add('sleep');
        var z = document.createElement('span');
        z.className = 'cat-zzz';
        z.textContent = 'z z';
        cat.appendChild(z);
        clearTimeout(timer);
        timer = setTimeout(function () { cat.classList.remove('sleep'); z.remove(); decide(); }, 6000 + Math.random() * 5000);
    }

    /* ---------- petting and dragging the cat ---------- */
    function pet() {
        pets++;
        try { localStorage.setItem('cat-pets', pets); } catch (e) { /* no storage */ }
        var wasAsleep = cat.classList.contains('sleep');
        cat.classList.remove('sleep', 'groom');
        Array.prototype.forEach.call(cat.querySelectorAll('.cat-zzz, .cat-bubble'), function (e) { e.remove(); });
        cat.classList.add('happy');
        var b = document.createElement('span');
        b.className = 'cat-bubble';
        b.textContent = wasAsleep ? 'mrrp?' : pets === 1 ? 'purr' : 'purr ×' + pets;
        cat.appendChild(b);
        for (var i = 0; i < 3; i++) {
            var h = document.createElement('span');
            h.className = 'cat-heart';
            h.textContent = '♥';
            h.style.left = (26 + i * 13) + 'px';
            h.style.setProperty('--dx', ((i - 1) * 16) + 'px');
            h.style.animationDelay = (i * 0.12) + 's';
            cat.appendChild(h);
            setTimeout(h.remove.bind(h), 1700);
        }
        clearTimeout(cat._petTimer);
        cat._petTimer = setTimeout(function () { cat.classList.remove('happy'); b.remove(); }, 2300);
        if (!moving) next(2900);
    }
    /* the first surface below (x, y): page element, drone, or the mountains */
    function surfaceBelow(x, y) {
        var best = { y: groundY(x), p: { kind: 'ground', what: 'dropped' } };
        pagePerches().forEach(function (p) {
            var r = rel(p.el);
            if (x >= r.x + 6 && x <= r.x + r.w - 6 && r.y >= y - 4 && r.y < best.y && r.y > CH) best = { y: r.y, p: p };
        });
        drones.forEach(function (d) {
            var top = d.y - d.h / 2 + 6;
            if (Math.abs(x - d.x) < 32 && top >= y - 4 && top < best.y) best = { y: top, p: { kind: 'drone', drone: d } };
        });
        return best;
    }
    draggable(cat, {
        start: function () {
            token++;
            clearTimeout(timer);
            moving = true;
            at = null;
            cat.classList.add('moving', 'held');
            cat.classList.remove('sleep', 'groom', 'walk', 'run', 'climb', 'crouch');
            cat.classList.add('jump');
            tilt(0);
        },
        move: function (p) { place(p.x, p.y + CH / 2); },
        end: function (p) {
            cat.classList.remove('held');
            var x = clamp(p.x, 20, layer.clientWidth - 20), y0 = p.y + CH / 2;
            var s = surfaceBelow(x, y0), dist = Math.max(0, s.y - y0);
            animate(reduce ? 1 : Math.sqrt(dist / 1300) * 1000 + 40, function (t) { place(x, y0 + dist * t * t); }, function () {
                pose('');
                cat.classList.remove('land'); void cat.offsetWidth; cat.classList.add('land');
                if (s.p.kind === 'drone') place(s.p.drone.x, s.p.drone.y - s.p.drone.h / 2 + 6);
                settle(s.p);
            });
        },
        click: pet
    });
    cat.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); }
    });

    /* ---------- start ---------- */
    function clearLab() {
        Array.prototype.forEach.call(layer.querySelectorAll('.block, .modclock, .fm, .drone'), function (e) { e.remove(); });
    }
    function layout() {
        sizeLayers();
        var geo = buildTerrain();
        clearLab();
        if (!phone) {                              /* the lab only where there is room for it */
            makeBlocks(geo);
            makeClock(geo);
            makeFM(geo);
            makeDrones(geo);
        } else {
            blocks = []; clock = null; fm = null; drones = [];
        }
        if (at && at.kind === 'drone') at = { kind: 'ground', what: 'wander' };
        if (!moving && at) {
            if (at.kind === 'ground') place(pos.x, groundY(pos.x));
            else if (at.el) { var s = spotOn(at, 0.5); place(s.x, s.y); }
        }
    }
    function start() {
        layout();
        var first = pagePerches().filter(function (p) { return p.kind === 'name' || p.kind === 'button'; })
            .filter(function (p) { return spotOn(p, 0.95).y > CH + 34; })[0];
        if (first) { var s = spotOn(first, 0.95); place(s.x, s.y); at = first; }
        else { place(layer.clientWidth / 2, groundY(layer.clientWidth / 2)); at = { kind: 'ground' }; }
        next(1600);
        var last = performance.now();
        (function loop(now) {
            var dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            tickDrones(dt, now);
            requestAnimationFrame(loop);
        })(last);
    }
    var resizeTimer;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 150); });
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
