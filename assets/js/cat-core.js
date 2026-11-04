/* The site's cat, shared by every page that has one (markup in layouts/partials/cat.html, drawing in cat-svg.html,
   styles in assets/css/common/cat.css). Bundled with a "world" that says where the cat can go and what it plays with:
   assets/js/home-lab.js (home page: letters of the name, symbols) or assets/js/cat-pages.js
   (Bachelor, Master, Papers: entries, rail labels and the bottom of the window).

   The cat walks, runs and jumps between page elements and the ground, sits, grooms and naps. You can drag it and
   click it to pet it.

   SiteCat(world) starts it. The world object may have:
     init(api)             called first, with the functions below
     size()                {w, h} of the cat (default 88 x 72)
     layout()              size the layers and build the terrain (on start and on resize)
     ground(x)             height of the ground at x, in layer coordinates (required)
     perches()             [{el, kind, w?, room?, hop?, again?}]: places to sit on top of (w: weight, room: least y
                           of the spot, hop: furthest jump up or down to it, again: may pick the one it sits on)
     spot(p, fx)           {x, y} to sit on p, or null for the top of p.el at fraction fx of its width
     allow(p, t)           false to leave out a spot t on p
     options(add, fromGround)   add(p, target, weight) more places to go
     wander()              x of a random place on the ground
     reach, climb          furthest drop from a perch to the ground (default 300), and jump up from it (default 280)
     step(x, dir, run)     called on every step on the ground
     arrive(p, r)          true if the world handled what the cat does at p (r: a random number in [0, 1))
     start()               perch to start on (with .fx), {kind: 'ground', x} or null for the ground in the middle
     leaveAfter            pets in a row (each within 15 s of the last) after which the cat has had enough and runs off
                           the page; reset() brings it back (home page: 10). First it scratches the visitor's
                           cursor away: the real one is hidden (pages cannot move it) and a drawn copy in the
                           same spot gets swatted off the screen; the real one is back at the next mouse move.
                           On touch screens it leaves scratch marks where the finger was.

   With a dog chosen (html[data-pet="dog"]) the same animal is a dog: it says woof instead of purr. */
(function () {
    'use strict';
    window.SiteCat = function (world) {
        var layer = document.getElementById('cat-layer');
        var cat = document.getElementById('cat');
        if (!layer || !cat) return null;
        document.body.appendChild(layer);

        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var CW = 88, CH = 72, HOP = 300, CLIMB = 280;
        var pos = { x: 0, y: 0 };                      /* the cat's feet, in layer coordinates */
        var at = null;                                 /* where it is: {kind, el?, fx?} */
        var timer = null, moving = false, token = 0;
        var pets = 0, streak = 0, lastPet = 0, away = false;
        var lastPtr = null;   /* where the visitor's pointer last was (window coordinates) and what it is */
        document.addEventListener('pointerdown', function (e) { lastPtr = { x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' }; }, true);
        function isDog() { return document.documentElement.dataset.pet === 'dog'; }
        if (isDog()) cat.setAttribute('aria-label', 'A dog. Click to pet it.');
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
        function ground(x) { return world.ground(x); }
        function slope(x, dir) { return Math.atan2(ground(x + 4 * (dir || 1)) - ground(x), 4) * 180 / Math.PI; }
        function perches() { return world.perches ? world.perches() : []; }
        function bonk(e, cls, ms) {
            e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls);
            setTimeout(function () { e.classList.remove(cls); }, ms);
        }

        /* ---------- the cat ---------- */
        function place(x, y) {
            pos = { x: x, y: y };
            cat.style.left = (x - CW / 2) + 'px';
            cat.style.top = (y - CH + CH / 24) + 'px';
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
                place(x, ground(x));
                if (world.step) world.step(x, Math.sign(dx), run);
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
                    land();
                    done();
                });
            }, reduce ? 0 : 160);
        }
        function land() { cat.classList.remove('land'); void cat.offsetWidth; cat.classList.add('land'); }
        function settle(p) {
            moving = false;
            cat.classList.remove('moving');
            at = p;
            arrive(p);
        }

        /* ---------- where the cat can go ---------- */
        function spotOn(p, fx) {
            var s = world.spot ? world.spot(p, fx) : null;
            if (s) return s;
            var r = rel(p.el), pad = Math.min(26, r.w / 2);
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
                return leap(function () { return { x: lx, y: ground(lx) }; }, function () { walkGround(tg.x, function () { settle(o.p); }); });
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
                if (t.y < (p.room != null ? p.room : CH + 34)) return;   /* no room above for the cat (and its purr bubble) */
                if (!fromGround && Math.abs(t.y - pos.y) > (p.hop || HOP)) return;   /* one hop at a time */
                if (fromGround && pos.y - t.y > (world.climb || CLIMB) && p.kind !== 'ground') return;
                if (world.allow && !world.allow(p, t)) return;
                w = w / (1 + Math.abs(t.x - pos.x) / 500);
                if (!onScreen(t.y)) w *= 0.15;
                opts.push({ p: p, target: target, w: w });
            }
            perches().forEach(function (p) {
                if (at && at.el === p.el && !p.again) return;
                var fx = Math.random();
                p.fx = fx;
                add(p, function () { return spotOn(p, fx); }, p.w || 1);
            });
            if (world.options) world.options(add, fromGround);
            var reach = fromGround || Math.abs(ground(pos.x) - pos.y) < (world.reach || HOP);
            if (reach) {
                var gw = fromGround ? 1.6 : 0.8;
                var rx = world.wander ? world.wander() : 40 + Math.random() * (layer.clientWidth - 80);
                add({ kind: 'ground', what: 'wander' }, function () { return { x: rx, y: ground(rx) }; }, gw);
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
        function arrive(p) {
            var r = Math.random();
            if (world.arrive && world.arrive(p, r)) return;
            if (r > 0.94 && p.kind !== 'button' && p.kind !== 'chip') return nap();
            if (r > 0.6) groom();
            next(2400 + Math.random() * 3000);
        }
        function groom() {
            cat.classList.add('groom');
            setTimeout(function () { cat.classList.remove('groom'); }, 2600);
        }
        function nap(ms) {
            cat.classList.add('sleep');
            var z = document.createElement('span');
            z.className = 'cat-zzz';
            z.textContent = 'z z';
            cat.appendChild(z);
            clearTimeout(timer);
            timer = setTimeout(function () { cat.classList.remove('sleep'); z.remove(); decide(); }, ms || 6000 + Math.random() * 5000);
        }

        /* ---------- petting and dragging the cat ---------- */
        function pet() {
            if (away) return;
            var now = Date.now();
            streak = now - lastPet < 15000 ? streak + 1 : 1;
            lastPet = now;
            if (world.leaveAfter && streak > world.leaveAfter) return leave();
            pets++;
            try { localStorage.setItem('cat-pets', pets); } catch (e) { /* no storage */ }
            var wasAsleep = cat.classList.contains('sleep');
            cat.classList.remove('sleep', 'groom');
            Array.prototype.forEach.call(cat.querySelectorAll('.cat-zzz, .cat-bubble'), function (e) { e.remove(); });
            cat.classList.add('happy');
            var b = document.createElement('span');
            b.className = 'cat-bubble';
            var word = isDog() ? 'woof' : 'purr';
            b.textContent = wasAsleep ? (isDog() ? 'huh?' : 'mrrp?') : pets === 1 ? word : word + ' ×' + pets;
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
                h.style.left = (CW * 0.3 + i * 13) + 'px';
                h.style.setProperty('--dx', ((i - 1) * 16) + 'px');
                h.style.animationDelay = (i * 0.12) + 's';
                cat.appendChild(h);
                setTimeout(h.remove.bind(h), 1700);
            }
            clearTimeout(cat._petTimer);
            cat._petTimer = setTimeout(function () { cat.classList.remove('happy'); b.remove(); }, hint ? 5000 : 2300);
            if (!moving) next(2900);
        }
        /* the swat at the cursor: a drawn copy of the grab hand (the cursor over the cat) where the real one was, which
           flies off spinning while the real one is hidden; three scratch marks either way */
        function scratchCursor() {
            if (!lastPtr) return;
            var x = lastPtr.x, y = lastPtr.y, root = document.documentElement;
            var marks = document.createElement('div');
            marks.className = 'cat-scratch';
            marks.style.left = x + 'px'; marks.style.top = y + 'px';
            marks.innerHTML = '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M8 10L40 46M18 6L50 40M28 4L56 30"/></svg>';
            document.body.appendChild(marks);
            setTimeout(function () { marks.remove(); }, 1400);
            if (!lastPtr.mouse || reduce) return;
            var fake = document.createElement('div');
            fake.className = 'fake-cursor';
            fake.style.left = x + 'px'; fake.style.top = y + 'px';
            fake.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 11V5.6a1.4 1.4 0 0 1 2.8 0V10V4.4a1.4 1.4 0 0 1 2.8 0V10V5.2a1.4 1.4 0 0 1 2.8 0V10.6V7.4a1.4 1.4 0 0 1 2.8 0v6.8c0 4-2.6 6.8-6.4 6.8h-.6c-2.4 0-3.8-.9-5.2-2.6l-3.4-4.4a1.5 1.5 0 0 1 2.2-2l2.2 2z"/></svg>';
            document.body.appendChild(fake);
            root.classList.add('cursor-gone');
            var dir = x < window.innerWidth / 2 ? 1 : -1;   /* toward the side with more room, so it crosses the screen */
            /* one steady flight off the screen at the same speed all the way (each stretch of the path gets its share of
               the time by its length), spinning as it goes, so it is clear what happened */
            var fx = dir * ((dir > 0 ? window.innerWidth - x : x) + 60), fy = -(window.innerHeight * 0.16 + 40);   /* across the screen, not up and out at once */
            var pts = [[0, 0], [dir * 46, -34], [dir * 70, -44], [fx * 0.9, fy * 0.9], [fx, fy]], len = [0];
            for (var i = 1; i < pts.length; i++) len[i] = len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            var frames = pts.map(function (q, i) {
                var f = len[i] / len[len.length - 1];
                return { transform: 'translate(' + q[0] + 'px, ' + q[1] + 'px) rotate(' + Math.round(dir * 720 * f) + 'deg)', opacity: i === pts.length - 1 ? 0 : 1, offset: f };
            });
            if (fake.animate) fake.animate(frames, { duration: 3800, easing: 'linear', fill: 'forwards' });
            else fake.style.opacity = '0';
            setTimeout(function () { fake.remove(); }, 3900);
            /* the real cursor back at the next move (not before the swat has been seen) */
            var t0 = Date.now();
            function back() {
                if (Date.now() - t0 < 3400) return;   /* not while the drawn one is still flying */
                root.classList.remove('cursor-gone');
                document.removeEventListener('pointermove', back);
            }
            document.addEventListener('pointermove', back);
            setTimeout(function () { root.classList.remove('cursor-gone'); document.removeEventListener('pointermove', back); }, 7000);
        }
        /* petted too often: it scratches the cursor away, says so, jumps down and runs off the nearer side of the page,
           until reset() */
        function leave() {
            away = true;
            token++;
            clearTimeout(timer);
            clearTimeout(cat._petTimer);
            cat.classList.remove('sleep', 'groom', 'happy');
            Array.prototype.forEach.call(cat.querySelectorAll('.cat-zzz, .cat-bubble, .cat-heart'), function (e) { e.remove(); });
            var b = document.createElement('span');
            b.className = 'cat-bubble';
            b.textContent = isDog() ? 'GRRR!' : 'HISS!';
            cat.appendChild(b);
            var id = token;
            cat.classList.add('bat');
            setTimeout(scratchCursor, 200);
            setTimeout(function () { cat.classList.remove('bat'); if (id === token) b.textContent = isDog() ? 'Enough! Bye.' : 'Enough. Bye.'; }, 950);
            setTimeout(function () {
                if (id !== token) return;
                b.remove();
                var x0 = pos.x, y0 = pos.y, W = layer.clientWidth, dir = x0 < W / 2 ? -1 : 1, x1 = dir < 0 ? -CW : W + CW;
                var gy0 = ground(x0), drop = Math.max(0, gy0 - y0);
                moving = true;
                cat.classList.add('moving');
                face(dir);
                /* first down to the ground (if it sits on something), then a run to the edge */
                animate(reduce ? 1 : Math.sqrt(drop / 1300) * 1000 + 40, function (t) { pose('jump'); place(x0, y0 + drop * t * t); }, function () {
                    animate(reduce ? 1 : Math.abs(x1 - x0) / 420 * 1000, function (t) {
                        var x = x0 + (x1 - x0) * t;
                        pose('run');
                        place(x, ground(clamp(x, 0, W)));
                    }, function () { pose(''); moving = false; cat.classList.add('away'); at = null; });
                });
            }, 2200);
        }
        /* the first surface below (x, y): a page element or the ground */
        function surfaceBelow(x, y) {
            var best = { y: ground(x), p: { kind: 'ground', what: 'dropped' } };
            perches().forEach(function (p) {
                var r = rel(p.el);
                if (x >= r.x + 6 && x <= r.x + r.w - 6 && r.y >= y - 4 && r.y < best.y && r.y > CH) best = { y: r.y, p: p };
            });
            if (best.p.el) best.p.fx = clamp((x - rel(best.p.el).x) / Math.max(1, rel(best.p.el).w), 0, 1);
            return best;
        }
        /* falls from where it is (feet at x, y0) onto the first surface below */
        function fall(x, y0) {
            token++;
            moving = true;
            cat.classList.add('moving', 'jump');
            cat.classList.remove('sleep', 'groom');
            Array.prototype.forEach.call(cat.querySelectorAll('.cat-zzz'), function (z) { z.remove(); });
            var s = surfaceBelow(x, y0), dist = Math.max(0, s.y - y0);
            animate(reduce ? 1 : Math.sqrt(dist / 1300) * 1000 + 40, function (t) { place(x, y0 + dist * t * t); }, function () {
                pose('');
                land();
                settle(s.p);
            });
        }
        draggable(cat, {
            start: function () {
                if (away) return;
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
            move: function (p) { if (!away) place(p.x, p.y + CH / 2); },
            end: function (p) {
                if (away) return;
                cat.classList.remove('held');
                fall(clamp(p.x, 20, layer.clientWidth - 20), p.y + CH / 2);
            },
            click: pet
        });

        cat.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); }
        });

        /* ---------- start ---------- */
        function layout() {
            if (world.size) {
                var sz = world.size();
                CW = sz.w; CH = sz.h;
                cat.style.width = CW + 'px';
                cat.style.height = CH + 'px';
            }
            if (world.layout) world.layout();
            if (!moving && at) {
                if (at.kind === 'ground') place(pos.x, ground(pos.x));
                else if (at.el) { var s = spotOn(at, at.fx != null ? at.fx : 0.5); place(s.x, s.y); }
            }
        }
        /* everything about the cat back to the start */
        function reset() {
            token++;
            clearTimeout(timer);
            moving = false;
            away = false; streak = 0;
            cat.classList.remove('moving', 'held', 'sleep', 'groom', 'happy', 'bat', 'left', 'away');
            Array.prototype.forEach.call(cat.querySelectorAll('.cat-zzz, .cat-bubble, .cat-heart'), function (e) { e.remove(); });
            pose(''); tilt(0);
            start();
        }
        function start() {
            layout();
            var first = world.start ? world.start() : null;
            if (first && first.el) { var s = spotOn(first, first.fx != null ? first.fx : 0.5); place(s.x, s.y); at = first; }
            else {
                var gx = first && first.x != null ? first.x : layer.clientWidth / 2;
                place(gx, ground(gx));
                at = { kind: 'ground' };
            }
            next(1600);
        }

        var api = {
            layer: layer, cat: cat, reduce: reduce,
            size: function () { return { w: CW, h: CH }; },
            pos: function () { return pos; },
            at: function () { return at; },
            moving: function () { return moving; },
            rel: rel, pointer: pointer, clamp: clamp, draggable: draggable, bonk: bonk,
            place: place, face: face, bat: bat, nap: nap, groom: groom, next: next, decide: decide, goTo: goTo,
            spotOn: spotOn, fall: fall, layout: layout, reset: reset
        };
        if (world.init) world.init(api);
        var resizeTimer;
        window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 150); });
        if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
        return api;
    };
})();
