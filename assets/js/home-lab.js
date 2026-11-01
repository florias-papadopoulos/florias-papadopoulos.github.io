/* Home page cat (markup in layouts/partials/cat.html, styles in assets/css/common/cat.css).

   The cat walks, runs, climbs and jumps between page elements and a mountain range at the bottom of the page
   (no mountains on phones). You can drag the cat and click it to pet it. */
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
    var at = null;                                 /* where it is: {kind, el?} */
    var timer = null, moving = false, token = 0;
    var ridge = [], wide = false, phone = false, side = 0;
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
        return list;
    }
    function spotOn(p, fx) {
        var r = rel(p.el), pad = Math.min(26, r.w / 2);
        if (p.kind === 'name') {
            var l = h1.querySelectorAll('.ltr'), lr = rel(l[Math.floor(fx * (l.length - 1))]);
            return { x: lr.x + lr.w / 2, y: lr.y + lr.h * 0.18 };
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
        if (fromGround) {
            var ux = tg.x + (pos.x < tg.x ? -70 : 70);
            return walkGround(ux, function () { leap(o.target, function () { settle(o.p); }); });
        }
        leap(o.target, function () { settle(o.p); });
    }
    function decide() {
        if (moving) return next(400);
        var opts = [], fromGround = at && at.kind === 'ground';
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
                p.kind === 'name' ? 2 : p.kind === 'chip' ? 1.3 : 1);
        });
        if (ridge.length) {
            var reach = fromGround || Math.abs(groundY(pos.x) - pos.y) < 300;
            if (reach) {
                var gw = fromGround ? 2.2 : 1;
                var tops = ridge.filter(function (q, i) { return i > 0 && i < ridge.length - 1 && q.y < ridge[i - 1].y && q.y < ridge[i + 1].y; });
                var pk = tops[Math.floor(Math.random() * tops.length)];
                if (pk) add({ kind: 'ground', what: 'peak' }, function () { return { x: pk.x, y: pk.y }; }, gw * 1.2);
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
    /* the first surface below (x, y): a page element or the mountains */
    function surfaceBelow(x, y) {
        var best = { y: groundY(x), p: { kind: 'ground', what: 'dropped' } };
        pagePerches().forEach(function (p) {
            var r = rel(p.el);
            if (x >= r.x + 6 && x <= r.x + r.w - 6 && r.y >= y - 4 && r.y < best.y && r.y > CH) best = { y: r.y, p: p };
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
                settle(s.p);
            });
        },
        click: pet
    });
    cat.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); }
    });

    /* ---------- start ---------- */
    function layout() {
        sizeLayers();
        buildTerrain();
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
    }
    var resizeTimer;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 150); });
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
