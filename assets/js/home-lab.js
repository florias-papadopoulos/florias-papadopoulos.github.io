/* Home page cat (markup in layouts/partials/cat.html, styles in assets/css/common/cat.css).

   The cat walks, runs and jumps between page elements and, on desktop, a keyboard along the bottom of the page and
   numbers, letters and keys floating in the margins (nothing on phones). You can drag the cat and click it to pet it. */
(function () {
    'use strict';
    var layer = document.getElementById('cat-layer');
    var world = document.getElementById('world-layer');
    var cat = document.getElementById('cat');
    var panel = document.querySelector('.home .home-panel');
    if (!layer || !world || !cat || !panel) return;
    document.body.appendChild(world);              /* page coordinates, including the side margins */
    document.body.appendChild(layer);

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
    /* drag with mouse or touch; click() is called when the pointer did not move */
    function draggable(el, h) {
        el.addEventListener('pointerdown', function (e) {
            if (e.button > 0) return;
            e.preventDefault();
            e.stopPropagation();
            try { el.setPointerCapture(e.pointerId); } catch (err) { /* no capture: the drag still works */ }
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

    /* ---------- the floor ---------- */
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

    /* Desktop world: a keyboard along the bottom of the page is the floor, and numbers, letters, symbols and keys
       float in the side margins as platforms. Phones: nothing, just a flat floor at the bottom of the page. */
    var GLYPHS = ['0x2A', '7', 'λ', 'A', 'π', 'mod p', '∑', '{ }', '3', 'k', '#', '∞', '0', 'x²', 'Δ', '1'];
    var CAPS = ['Ctrl', 'K', 'Enter', 'Esc', 'Tab', 'F'];
    var KEY_ICON = '<svg viewBox="0 0 64 30" aria-hidden="true"><circle cx="13" cy="15" r="9" fill="none" stroke="currentColor" stroke-width="5"/>' +
        '<path d="M22 15h36M50 15v9M44 15v6" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>';
    var glyphs = [], keys = [];
    function buildTerrain() {
        Array.prototype.forEach.call(world.querySelectorAll('.kb, .glyph'), function (e) { e.remove(); });
        glyphs = []; keys = [];
        var W = layer.clientWidth, F = parseFloat(layer.style.height);
        var p = rel(panel);
        side = Math.max(0, Math.min(p.x, W - p.x - p.w));
        wide = side > 200;
        phone = W < 700;
        if (phone) {
            ridge = [{ x: 0, y: F - 2 }, { x: W, y: F - 2 }];
            return;
        }
        /* the keyboard */
        var KH = 34, kb = document.createElement('div');
        kb.className = 'kb';
        kb.style.top = (F - KH - 10) + 'px';
        kb.style.width = W + 'px';
        var row = ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
                   'Ctrl', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Enter', 'Alt', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Space'];
        for (var used = 8, i = 0; used < W - 8; i++) {
            var label = row[i % row.length], k = document.createElement('span');
            k.className = 'kb-key' + (label.length > 1 ? ' wide' : '');
            k.textContent = label;
            kb.appendChild(k);
            used += (label === 'Space' ? 140 : label.length > 1 ? 58 : 36) + 4;
            if (label === 'Space') k.classList.add('space');
        }
        world.appendChild(kb);
        Array.prototype.forEach.call(kb.children, function (k) { keys.push(k); });
        var floor = F - KH - 10;
        ridge = [{ x: 0, y: floor }, { x: W, y: floor }];
        /* platforms in the margins: five levels a side, a comfortable jump apart */
        if (side < 150) return;
        var top = 110, levels = 5, step = (floor - 70 - top) / (levels - 1), n = 0;
        [0, 1].forEach(function (s2) {
            for (var lv = 0; lv < levels; lv++) {
                var g = document.createElement('div'), kind = (lv + s2) % 3;
                var x0 = s2 ? W - side + 18 : 18, span = side - 140;
                g.style.left = (x0 + span * (((lv * 0.37 + s2 * 0.5) % 1) * 0.9 + 0.05)) + 'px';
                g.style.top = Math.min(top + lv * step + (s2 ? step * 0.45 : 0), floor - 70) + 'px';   /* never into the keyboard */
                if (kind === 2 && n % 2 === 0) { g.className = 'glyph cap'; g.textContent = CAPS[n % CAPS.length]; }
                else if (n % 7 === 3) { g.className = 'glyph keyicon'; g.innerHTML = KEY_ICON; }
                else { g.className = 'glyph' + (n % 2 ? ' pink' : ''); g.textContent = GLYPHS[n % GLYPHS.length]; }
                g.setAttribute('aria-hidden', 'true');
                world.appendChild(g);
                glyphs.push(g);
                g.addEventListener('click', function () { poke(this); });
                n++;
            }
        });
    }
    /* a glyph reacts when the cat bats it or someone clicks it: numbers count up, letters move on, the rest wiggles */
    function poke(g) {
        var t = g.textContent;
        if (/^0x[0-9A-F]+$/i.test(t)) g.textContent = '0x' + (parseInt(t.slice(2), 16) + 1).toString(16).toUpperCase();
        else if (/^\d$/.test(t)) g.textContent = String((+t + 1) % 10);
        else if (/^[A-Z]$/.test(t) && !g.classList.contains('cap')) g.textContent = t === 'Z' ? 'A' : String.fromCharCode(t.charCodeAt(0) + 1);
        bonk(g, 'poked', 600);
    }
    /* keys go down under the cat's paws */
    var lastKey = null;
    function pressKeyAt(x) {
        if (!keys.length) return;
        for (var i = 0; i < keys.length; i++) {
            var r = rel(keys[i]);
            if (x >= r.x && x <= r.x + r.w) {
                if (keys[i] !== lastKey) { lastKey = keys[i]; bonk(keys[i], 'down', 220); }
                return;
            }
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
            pressKeyAt(x);
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
        glyphs.forEach(function (g) { list.push({ el: g, kind: 'glyph' }); });
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
                p.kind === 'name' ? 2 : p.kind === 'glyph' ? 1.6 : 1);
        });
        if (ridge.length) {
            var reach = fromGround || Math.abs(groundY(pos.x) - pos.y) < 300;
            if (reach) {
                var gw = fromGround ? 1.6 : 0.8;
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
        if (p.kind === 'glyph' && r < 0.7) { bat(function () { poke(p.el); }); return next(1800 + Math.random() * 1500); }
        if (p.kind === 'photo' && r < 0.18) return nap();
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
        /* the first time ever: the cat tells the visitor about its games behind the paw in the corner */
        var hint = false;
        try { hint = !localStorage.getItem('cat-games-hint'); localStorage.setItem('cat-games-hint', '1'); } catch (e) { hint = pets === 1; }
        var paw = document.getElementById('paw-link');
        if (hint && paw) {
            b.textContent = 'Psst! Press the 🐾 at the top right to play games with me.';
            b.classList.add('long');
            bonk(paw, 'wiggle', 2100);
        }
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
        cat._petTimer = setTimeout(function () { cat.classList.remove('happy'); b.remove(); }, hint ? 5000 : 2300);
        if (!moving) next(2900);
    }
    /* the first surface below (x, y): a page element, a glyph or the floor */
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
            Array.prototype.forEach.call(cat.querySelectorAll('.cat-zzz'), function (z) { z.remove(); });   /* picked up: awake */
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
