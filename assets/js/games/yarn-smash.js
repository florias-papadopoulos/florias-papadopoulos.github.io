/* Yarn Smash: run down an endless hallway and throw yarn balls to shatter the glass before you reach it.
   Pseudo-3D: x across the hall, y up, z forward; the camera looks down +z and points are projected with
   sx = CX + x F / dz, sy = HY - (y - EYE) F / dz. The hall is the same at every z, so its walls, floor and ceiling
   (with fog) are drawn once per resize into a cached canvas; only the things that move are drawn every frame.
   Yarn is the ammo: crystals give more, crashing into glass costs some, the game ends at 0. Shell API: arcade.js. */
Arcade.register('yarn-smash', function (api) {
    'use strict';
    api.css(
        '.ys, .ys-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
        '.ys-cv { touch-action: none; cursor: crosshair; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }' +
        '.ys-hint { position: absolute; left: 50%; bottom: 24%; transform: translateX(-50%); width: max-content; max-width: 84%; padding: 8px 14px;' +
        '  border-radius: 14px; background: rgba(255,255,255,.94); box-shadow: 0 4px 14px rgba(15,23,42,.1); color: #475569; font-weight: 700;' +
        '  font-size: .95rem; line-height: 1.35; text-align: center; pointer-events: none; transition: opacity .4s; }' +
        '.ys-hint.ys-gone { opacity: 0; }');

    /* ---------- the hall: sizes in metres, colours ---------- */
    var HW = 1.8, CH = 2.7, EYE = 1.2, NEAR = 0.3, FAR = 46;    /* half width, ceiling, eye height, clip planes */
    var G = 9, BALL_V = 24, BR = 0.11, MAXP = 260;               /* gravity, throw speed, ball radius, particle cap */
    var DW = 1.3, DH = 2.15;                                     /* doorway in a door wall */
    var PW = 0.36, ROWS = 10, JL = 2.4, CELL = 7;                /* floor planks, wall decor cells */
    var FOG = [248, 241, 230];
    var C = { floor: [226, 182, 132], ceil: [255, 251, 245] };
    var BANDS = [[0, 0.13, [255, 251, 245]], [0.13, 0.88, [253, 244, 231]], [0.88, 0.94, [234, 207, 170]],
                 [0.94, CH - 0.09, [251, 228, 198]], [CH - 0.09, CH, [255, 250, 243]]];
    var STOPS = [0.3, 1, 2, 4, 7, 11, 16, 22, 29, 37, 46];
    var FUR = '#f6a23a', STRIPE = '#cf7419', OL = '#3b2a1e', BEAN = '#f7a6bf';
    var YARN = [['#f58fb5', '#c9507f'], ['#a78bfa', '#6d52c9'], ['#5ec6c2', '#2f8f8b'], ['#f6a23a', '#c26f12']];
    var GLASS = ['rgba(170,215,240,', 'rgba(205,233,250,', 'rgba(255,255,255,'];
    var VASE = ['rgba(246,160,196,', 'rgba(140,214,190,', 'rgba(190,170,240,', 'rgba(150,200,240,'];

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function fogf(dz) { return Math.pow(clamp((dz - 4) / (FAR - 4), 0, 1), 1.3); }
    function mix(c, f, k) {
        k = k || 1;
        return 'rgb(' + Math.round((c[0] * k) * (1 - f) + FOG[0] * f) + ',' + Math.round((c[1] * k) * (1 - f) + FOG[1] * f) + ',' +
            Math.round((c[2] * k) * (1 - f) + FOG[2] * f) + ')';
    }
    function fade(dz) { return clamp((FAR + 2 - dz) / 8, 0, 1) * (1 - 0.8 * fogf(dz)); }

    /* ---------- page ---------- */
    var wrapEl = document.createElement('div');
    wrapEl.className = 'ys';
    wrapEl.innerHTML = '<canvas class="ys-cv"></canvas><div class="ys-hint">' +
        (api.touch ? 'Tap to throw yarn.' : 'Click (or press Space) to throw yarn.') + ' Shatter the glass before you reach it.</div>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.ys-cv'), ctx = cv.getContext('2d', { alpha: false }), hintEl = wrapEl.querySelector('.ys-hint');
    var bg = null, dpr = 1, W = 1, H = 1, F = 1, CX = 0, HY = 0, PAW = 50;

    /* ---------- state ---------- */
    var camZ = 0, speed = 0, clock = 0, playT = 0, phase = 'play', balls = 15, bonus = 0, smashed = 0, shownScore = -1;
    var streak = 0, multi = 1, lastThrow = -9, stumble = 1, zoomT = 0, shake = 0, flash = 0, runPh = 0;
    var ents = [], flying = [], parts = [], floats = [], rings = [], paws = [0, 0];
    var nextZ = 14, lastDoorZ = -99, lastDotZ = -99, labels = {}, lastSay = -99, lowWarned = false, firstPane = true, hinted = false;
    var px = 0, py = 0, pk = 0, SX = 0, SY = 0, SZ = 0, SR = 0, HIT = null;

    function P(x, y, z) {  /* project a world point into px, py; pk = pixels per metre there */
        var dz = z - camZ;
        if (dz < NEAR) return false;
        pk = F / dz; px = CX + x * pk; py = HY - (y - EYE) * pk;
        return true;
    }

    function fit(s) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, s.w); H = Math.max(1, s.h);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        F = Math.min(W * 0.92, H * 0.95);
        CX = W / 2; HY = H * 0.42;
        PAW = clamp(Math.min(W, H) * 0.1, 34, 68);
        renderBg();
    }

    /* the hall without anything that moves, with fog as gradients (screen position maps to depth) */
    function renderBg() {
        bg = bg || document.createElement('canvas');
        bg.width = cv.width; bg.height = cv.height;
        var g = bg.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = mix(FOG, 0); g.fillRect(0, 0, W, H);
        function sx(x, dz) { return CX + x * F / dz; }
        function sy(y, dz) { return HY - (y - EYE) * F / dz; }
        function grad(horiz, fn, col, k) {
            var a = fn(NEAR), b = fn(FAR), gr = horiz ? g.createLinearGradient(a, 0, b, 0) : g.createLinearGradient(0, a, 0, b);
            STOPS.forEach(function (dz) { gr.addColorStop(clamp((fn(dz) - a) / (b - a), 0, 1), mix(col, fogf(dz), k)); });
            return gr;
        }
        function poly(p, fill) {
            g.beginPath(); g.moveTo(p[0], p[1]);
            for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
            g.closePath(); g.fillStyle = fill; g.fill();
        }
        var n = NEAR, f = FAR;
        poly([sx(-HW, n), sy(0, n), sx(HW, n), sy(0, n), sx(HW, f), sy(0, f), sx(-HW, f), sy(0, f)],
             grad(false, function (dz) { return sy(0, dz); }, C.floor));
        poly([sx(-HW, n), sy(CH, n), sx(HW, n), sy(CH, n), sx(HW, f), sy(CH, f), sx(-HW, f), sy(CH, f)],
             grad(false, function (dz) { return sy(CH, dz); }, C.ceil));
        [-1, 1].forEach(function (s) {
            var fx = function (dz) { return sx(s * HW, dz); };
            BANDS.forEach(function (b) {
                poly([fx(n), sy(b[1], n), fx(f), sy(b[1], f), fx(f), sy(b[0], f), fx(n), sy(b[0], n)], grad(true, fx, b[2], s < 0 ? 1 : 0.97));
            });
        });
        var y30 = sy(0, 30), lg = g.createLinearGradient(0, H, 0, y30);  /* planks along the hall */
        lg.addColorStop(0, 'rgba(150,98,50,.34)'); lg.addColorStop(1, 'rgba(150,98,50,0)');
        g.strokeStyle = lg; g.lineWidth = 1.2; g.beginPath();
        for (var i = 1; i < ROWS; i++) { var x = -HW + i * PW; g.moveTo(sx(x, 0.5), sy(0, 0.5)); g.lineTo(sx(x, 30), y30); }
        g.stroke();
        var vy = sy(1.3, FAR), rg = g.createRadialGradient(CX, vy, 0, CX, vy, HW * F / FAR * 3);  /* light at the far end */
        rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }

    /* ---------- spawning: a blocker (glass or a door) every gap, with extras in between ---------- */
    function label(type, text) { if (labels[type]) return null; labels[type] = true; return text; }
    function pane(z) {
        var lvl = clamp(z / 700, 0, 1), r = Math.random(), kind = 1, secs = [];
        if (z > 120 && r < 0.12 + 0.3 * lvl) kind = 2;
        if (z > 300 && r < 0.04 + 0.12 * lvl) kind = 4;
        var xs = kind === 1 ? [-HW, HW] : [-HW, 0, HW], ys = kind === 4 ? [0, CH / 2, CH] : [0, CH];
        for (var i = 0; i + 1 < xs.length; i++) for (var j = 0; j + 1 < ys.length; j++) {
            var s = { x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1], broken: false, bits: [] };
            [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) {  /* jagged leftovers in the corners once broken */
                var X = c[0] ? s.x1 : s.x0, Y = c[1] ? s.y1 : s.y0, dx = c[0] ? -1 : 1, dy = c[1] ? -1 : 1, a = rnd(0.2, 0.55), b = rnd(0.2, 0.55);
                s.bits.push([X, Y, X + dx * a, Y, X + dx * a * rnd(0.2, 0.45), Y + dy * b * rnd(0.2, 0.45), X, Y + dy * b]);
            });
            secs.push(s);
        }
        return { type: 'pane', z: z, secs: secs, paw: Math.random() < 0.3, blocker: true };
    }
    function spawn() {
        while (nextZ < camZ + FAR + 4) {
            var z = nextZ, lvl = clamp(z / 700, 0, 1);
            if (z > 70 && z - lastDoorZ > 55 && Math.random() < 0.22) {
                ents.push({ type: 'door', z: z, a: 0, open: false, blocker: true, label: label('door', 'Hit the handle!') });
                lastDoorZ = z;
            } else ents.push(pane(z));
            var gap = 17 - 6 * lvl + rnd(0, 4), slots = [0.15, 0.4, 0.65, 0.9].sort(function () { return Math.random() - 0.5; });
            var at = function () { return z + 3 + slots.pop() * (gap - 6); };
            if (z < 15 || Math.random() < (balls <= 4 ? 0.95 : 0.7)) ents.push({ type: 'crystal', z: at(), x: rnd(-1.1, 1.1), y: rnd(1.1, 1.7), ph: rnd(0, 6), label: label('crystal', '+3 yarn') });
            if (Math.random() < 0.6) {
                var side = Math.random() < 0.5 ? -1 : 1;
                ents.push({ type: 'vase', z: at(), side: side, x: side * (HW - 0.32), kind: Math.floor(Math.random() * 3),
                            col: VASE[Math.floor(Math.random() * VASE.length)], h: rnd(0.34, 0.48) });
            }
            if (z > 40 && Math.random() < 0.2) ents.push({ type: 'lamp', z: at(), ph: rnd(0, 6), label: label('lamp', 'Bonus!') });
            if (z > 90 && z - lastDotZ > 70 && Math.random() < 0.35) {
                ents.push({ type: 'dot', z: at(), ph: rnd(0, 6), label: label('dot', 'Catch the dot!') });
                lastDotZ = z;
            }
            nextZ = z + gap;
        }
    }

    /* centre and radius of a round target at time t, into SX, SY, SZ, SR */
    function pos(e, t) {
        var a;
        SZ = e.z;
        if (e.type === 'vase') { SX = e.x; SY = 0.72 + e.h * 0.5; SR = 0.2; }
        else if (e.type === 'crystal') { SX = e.x; SY = e.y + Math.sin(t * 2 + e.ph) * 0.08; SR = 0.3; }
        else if (e.type === 'lamp') { a = 0.75 * Math.sin(t * 2.1 + e.ph); SX = Math.sin(a) * 1.05; SY = CH - Math.cos(a) * 1.05; SR = 0.27; }
        else if (e.type === 'dot') { SX = 1.25 * Math.sin(t * 2.4 + e.ph) + 0.3 * Math.sin(t * 5.3 + e.ph); SY = 0.12; SR = 0.36; }
        else { SX = DW / 2 - 0.16; SY = 1.0; SZ = e.z - 0.06; SR = 0.16; }  /* door handle */
    }
    function round(e) { return !e.broken && (e.type === 'vase' || e.type === 'crystal' || e.type === 'lamp' || e.type === 'dot'); }

    /* ---------- throwing: aim along the tapped ray at the first thing it meets, then lob the ball there ---------- */
    function claimed(e, sec) {  /* a ball already on its way to this target */
        for (var i = 0; i < flying.length; i++) if (flying[i].ce === e && flying[i].cs === sec) return true;
        return false;
    }
    function aim(sx, sy) {
        var dx = (sx - CX) / F, dy = -(sy - HY) / F, t = FAR, tg = null, skipped = false;  /* ray from the eye: (dx t, EYE + dy t, camZ + t) */
        if (dx < 0) t = Math.min(t, -HW / dx); else if (dx > 0) t = Math.min(t, HW / dx);
        if (dy < 0) t = Math.min(t, -EYE / dy); else if (dy > 0) t = Math.min(t, (CH - EYE) / dy);
        var dd = dx * dx + dy * dy + 1;
        function onRay() {
            var ox = SX, oy = SY - EYE, oz = SZ - camZ, tt = (ox * dx + oy * dy + oz) / dd;
            var ex = ox - dx * tt, ey = oy - dy * tt, ez = oz - tt, rr = Math.max(SR * 1.4, 26 * oz / F);  /* at least 26 px to tap */
            return tt >= 0.6 && tt < t && ex * ex + ey * ey + ez * ez < rr * rr ? tt : -1;
        }
        function sphere(e, isKnob) {
            pos(e, clock);
            var now = onRay(), dz = SZ - camZ;
            if (!isKnob) pos(e, clock + flightT(SX, SY - EYE + 0.45, dz));  /* lead moving targets */
            var tt = onRay();
            if (tt < 0) tt = now;  /* tapped where it is now: still aim where it will be */
            if (tt < 0) return;
            if ((isKnob || e.type === 'vase' || e.type === 'crystal') && claimed(e, null)) skipped = true;
            else { t = tt; tg = [SX, SY, SZ, e, null]; }
        }
        ents.forEach(function (e) {
            var tz = e.z - camZ;
            if (round(e)) return sphere(e);
            if (e.type === 'door' && !e.open) sphere(e, true);
            if (tz < 0.6 || tz >= t) return;
            var x = dx * tz, y = EYE + dy * tz;
            if (e.type === 'pane') {
                for (var i = 0; i < e.secs.length; i++) {
                    var s = e.secs[i];
                    if (s.broken || x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) continue;
                    if (claimed(e, s)) skipped = true; else { t = tz; tg = [x, y, e.z, e, s]; }
                }
            } else if (e.type === 'door' && (!e.open || Math.abs(x) > DW / 2 || y > DH)) { t = tz; tg = [x, y, e.z]; }
        });
        if (!tg && skipped) return null;  /* only something a ball is already flying to: no need to throw again */
        if (!tg) {  /* nothing on the ray: snap to a round target or handle within 40 px of the tap */
            var bd = 40 * 40;
            ents.forEach(function (e) {
                if (!round(e) && !(e.type === 'door' && !e.open)) return;
                if (e.type !== 'lamp' && e.type !== 'dot' && claimed(e, null)) return;
                pos(e, clock);
                if (SZ - camZ < 1 || SZ - camZ > t + 1 || !P(SX, SY, SZ)) return;
                var q = (px - sx) * (px - sx) + (py - sy) * (py - sy);
                if (q >= bd) return;
                bd = q;
                if (e.type === 'lamp' || e.type === 'dot') pos(e, clock + flightT(SX, SY - EYE + 0.45, SZ - camZ));
                tg = [SX, SY, SZ, e, null];
            });
        }
        return tg || [dx * t, EYE + dy * t, camZ + t];
    }
    function throwAt(sx, sy) {
        if (phase !== 'play' || balls <= 0 || clock - lastThrow < 0.12) return;
        var tg = aim(sx, sy);
        rings.push({ x: sx, y: sy, t: 0 });
        if (!tg) return;
        lastThrow = clock;
        balls--;
        if (!hinted) { hinted = true; hintEl.classList.add('ys-gone'); }
        var side = sx < CX ? -1 : 1, th = { left: multi, hits: 0 };
        for (var i = 0; i < multi; i++) {  /* the first ball goes where you aimed, playful extras to the sides */
            var off = i === 0 ? 0 : (i === 1 ? -1 : 1) * (tg[0] > 0 ? 1 : -1) * 0.45, from = i === 1 ? -side : side;
            var b = launch(from * 0.3, clamp(tg[0] + off, -HW + 0.2, HW - 0.2), tg[1] + (i ? 0.12 : 0), tg[2], th);
            if (i === 0 && tg[3]) { b.ce = tg[3]; b.cs = tg[4]; }
        }
        paws[side < 0 ? 0 : 1] = 1;
        if (multi > 1) paws[side < 0 ? 1 : 0] = 0.8;
        api.sfx('tap');
    }
    function flightT(dx, dy, dz) {  /* flight time: faster for far throws, and never so high it hits the ceiling */
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz), T = Math.max(0.15, d / (BALL_V + d * 0.5));
        for (var i = 0; i < 8; i++) {
            var vy = dy / T + 0.5 * G * T;
            if (vy <= 0 || EYE - 0.45 + vy * vy / (2 * G) < CH - 0.2) break;
            T *= 0.85;
        }
        return T;
    }
    function launch(x0, tx, ty, tz, th) {
        var b = { type: 'ball', x: x0, y: EYE - 0.45, z: camZ + 0.25, th: th, age: 0, spin: rnd(0, 6), trail: [], c: YARN[Math.floor(Math.random() * YARN.length)] };
        var dx = tx - b.x, dy = ty - b.y, dz = tz - b.z, T = flightT(dx, dy, dz);
        b.vx = dx / T; b.vy = dy / T + 0.5 * G * T; b.vz = dz / T;
        flying.push(b);
        return b;
    }

    /* swept hit tests: return the fraction s of the segment a..b where it meets e, or -1; HIT says what was hit */
    function segSphere(ax, ay, az, bx, by, bz, r) {
        var ux = bx - ax, uy = by - ay, uz = bz - az, L = ux * ux + uy * uy + uz * uz;
        var s = L > 0 ? clamp(((SX - ax) * ux + (SY - ay) * uy + (SZ - az) * uz) / L, 0, 1) : 0;
        var ex = ax + ux * s - SX, ey = ay + uy * s - SY, ez = az + uz * s - SZ;
        return ex * ex + ey * ey + ez * ez < r * r ? s : -1;
    }
    function hitTest(e, ax, ay, az, bx, by, bz) {
        if (round(e)) { pos(e, clock); HIT = 'ball'; return segSphere(ax, ay, az, bx, by, bz, SR + BR); }
        if (e.type === 'door' && !e.open) {
            pos(e, clock);
            var k = segSphere(ax, ay, az, bx, by, bz, SR + BR);
            if (k >= 0) { HIT = 'knob'; return k; }
        }
        if (e.type !== 'pane' && e.type !== 'door') return -1;
        if (!(az < e.z && bz >= e.z)) return -1;
        var s = (e.z - az) / (bz - az), x = ax + (bx - ax) * s, y = ay + (by - ay) * s;
        if (e.type === 'door') {
            if (Math.abs(x) < DW / 2 && y < DH) { if (e.open) return -1; HIT = 'door'; } else HIT = 'wall';
            return s;
        }
        for (var i = 0; i < e.secs.length; i++) {
            var c = e.secs[i];
            if (!c.broken && x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) { HIT = c; return s; }
        }
        return -1;
    }
    function stepBall(b, dt) {
        var ax = b.x, ay = b.y, az = b.z;
        b.age += dt; b.spin += dt * 9;
        b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        b.trail.unshift(ax, ay, az);
        if (b.trail.length > 15) b.trail.length = 15;
        var best = 2, be = null, what = null;
        for (var i = 0; i < ents.length; i++) {
            var s = hitTest(ents[i], ax, ay, az, b.x, b.y, b.z);
            if (s >= 0 && s < best) { best = s; be = ents[i]; what = HIT; }
        }
        if (be) {
            var hx = ax + (b.x - ax) * best, hy = ay + (b.y - ay) * best, hz = az + (b.z - az) * best;
            return done(b, smash(be, what, hx, hy, hz, b));
        }
        if (b.y < BR || b.y > CH - BR || Math.abs(b.x) > HW - BR || b.z > camZ + FAR + 4 || (b.age > 0.1 && b.z < camZ + 0.2)) {
            puff(clamp(b.x, -HW, HW), clamp(b.y, 0, CH), b.z, b.c[0], 5);
            return done(b, false);
        }
        return true;
    }
    function done(b, hit) {  /* a throw counts as a hit if any of its balls hit something */
        var th = b.th;
        th.left--;
        if (hit) th.hits++;
        if (th.left === 0) {
            if (th.hits) streak++;
            else {
                if (multi > 1) addFloat(0, EYE + 0.4, camZ + 3, 'Combo lost', '#94a3b8');
                streak = 0;
            }
            var m = streak >= 10 ? 3 : streak >= 4 ? 2 : 1;
            if (m > multi) {
                addFloat(0, EYE + 0.5, camZ + 3.5, m === 2 ? 'Double yarn!' : 'Triple yarn!', '#d6336c', true);
                chat(m === 2 ? 'Double yarn!' : 'Triple yarn! Mrrow!', 'wow', true);
                api.sfx('point');
            }
            multi = m;
        }
        return false;
    }

    /* ---------- what happens when something gets hit ---------- */
    function smash(e, what, hx, hy, hz, b) {
        if (what === 'wall' || what === 'door') { puff(hx, hy, hz - 0.05, b.c[0], 6); api.sfx('move'); return false; }
        if (what === 'knob') {
            e.open = true; points(20, 0.4, 1.4, e.z);
            api.sfx('point');
            if (Math.random() < 0.4) chat('Door? What door?', 'happy');
            return true;
        }
        if (e.type === 'pane') {
            breakSec(e, what, 1, b.vx * 0.15);
            points(10, (what.x0 + what.x1) / 2, (what.y0 + what.y1) / 2 + 0.3, e.z);
            api.sfx('pop');
            if (firstPane) { firstPane = false; chat('Purrfect aim!', 'happy', true); }
            return true;
        }
        e.broken = true; smashed++;
        pos(e, clock);
        if (e.type === 'vase') {
            shards(SX, SY, SZ, 0.18, 12, [e.col], 1, 0);
            points(15, SX, SY + 0.35, SZ); addYarn(1, SX, SY + 0.6, SZ);
            api.sfx('pop');
            if (Math.random() < 0.3) chat(Math.random() < 0.5 ? 'Oops. Not sorry.' : 'It was in the way.', 'happy');
        } else if (e.type === 'crystal') {
            shards(SX, SY, SZ, 0.2, 12, ['rgba(150,226,192,', 'rgba(205,245,225,', 'rgba(255,255,255,'], 0.6, 0);
            points(10, SX, SY + 0.35, SZ); addYarn(3, SX, SY + 0.65, SZ);
            api.sfx('point');
            if (Math.random() < 0.35) chat(Math.random() < 0.5 ? 'More yarn!' : 'Catnip!', 'happy');
        } else if (e.type === 'lamp') {
            shards(SX, SY, SZ, 0.2, 14, ['rgba(255,214,165,', 'rgba(255,240,200,', 'rgba(255,255,255,'], 1, 0);
            points(40, SX, SY - 0.3, SZ); addYarn(2, SX, SY - 0.6, SZ);
            api.sfx('pop'); api.sfx('point');
            chat('Shiny!', 'wow');
        } else if (e.type === 'dot') {
            zoomT = 4;
            shards(SX, 0.05, SZ, 0.2, 10, ['rgba(255,90,120,', 'rgba(255,190,200,'], 0.5, 0);
            points(30, SX, 0.6, SZ);
            addFloat(0, EYE + 0.6, camZ + 4, 'Zoomies!', '#d6336c', true);
            api.sfx('point');
            chat('ZOOMIES!', 'wow', true);
        }
        return true;
    }
    function breakSec(e, s, dir, push) {
        s.broken = true; smashed++;
        var n = parts.length > MAXP - 30 ? 8 : 18;
        for (var i = 0; i < n; i++) {
            var x = rnd(s.x0 + 0.1, s.x1 - 0.1), y = rnd(s.y0 + 0.05, s.y1 - 0.1);
            addPart(x, y, e.z, (x - (s.x0 + s.x1) / 2) * 1.2 + rnd(-1, 1) + (push || 0), rnd(-0.5, 2.5),
                    dir > 0 ? rnd(1.5, 4.5) : speed * rnd(0.85, 1.05) + rnd(-0.5, 0.5), rnd(0.1, 0.3), GLASS[i % 3], rnd(1, 1.8));
        }
    }
    function shards(x, y, z, spread, n, cols, up, vz) {
        if (parts.length > MAXP - 20) n = Math.ceil(n / 2);
        for (var i = 0; i < n; i++) {
            addPart(x + rnd(-spread, spread), y + rnd(-spread, spread), z, rnd(-2.2, 2.2), rnd(0.5, 3) * up, vz + rnd(0.5, 2.5),
                    rnd(0.05, 0.13), cols[i % cols.length], rnd(0.8, 1.4));
        }
    }
    function puff(x, y, z, col, n) {
        for (var i = 0; i < n; i++) addPart(x, y, z, rnd(-1, 1), rnd(0, 1.5), rnd(-0.5, 0.5), 0.04, 'rgba(255,255,255,', 0.4, col);
    }
    function addPart(x, y, z, vx, vy, vz, s, col, life, solid) {
        if (parts.length >= MAXP) parts.shift();
        parts.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, s: s, c: col, solid: solid, r: rnd(0, 6), vr: rnd(-8, 8), life: life, max: life });
    }
    function points(n, x, y, z) { bonus += n; addFloat(x, y, z, '+' + n, '#1e3a8a'); }
    function addYarn(n, x, y, z) {
        balls += n;
        if (balls >= 6) lowWarned = false;
        addFloat(x, y, z, '+' + n + ' yarn', '#d6336c');
    }
    function addFloat(x, y, z, text, col, big) { floats.push({ x: x, y: y, z: z, text: text, c: col, big: big, t: 0 }); }
    function chat(text, mood, force) {
        if (!force && clock - lastSay < 5) return;
        lastSay = clock;
        if (mood) api.cat(mood);
        api.say(text, 1700);
    }
    function crash(e) {
        var hurt = false;
        if (e.type === 'pane') e.secs.forEach(function (s) { if (!s.broken) { breakSec(e, s, -1, 0); hurt = true; } });
        else if (!e.open) { e.open = true; e.a = 1.45; hurt = true; shards(0, 1, e.z, 0.6, 10, ['rgba(220,162,116,', 'rgba(240,200,160,'], 1, speed); }
        if (!hurt) return;
        if (zoomT > 0) { bonus += 10; api.sfx('pop'); return; }
        var lost = Math.min(balls, 3);
        balls -= lost;
        stumble = 0.35; flash = 1; shake = api.reducedMotion ? 3 : 16;
        if (multi > 1) addFloat(0, EYE + 0.2, camZ + 3, 'Combo lost', '#94a3b8');
        streak = 0; multi = 1;
        addFloat(0, EYE - 0.1, camZ + 2.5, '-' + lost + ' yarn', '#e8484f', true);
        api.sfx('hit');
        api.cat('sad');
        chat(e.type === 'door' ? 'Bonk! My nose!' : (Math.random() < 0.5 ? 'Ouch, my whiskers!' : 'Mrrp! Glass!'), 'sad');
    }

    /* ---------- the loop ---------- */
    function update(dt) {
        clock += dt;
        if (phase === 'play') playT += dt;
        stumble += (1 - stumble) * Math.min(1, dt * 1.6);
        if (zoomT > 0) zoomT -= dt;
        var want = phase === 'play' ? Math.min(9.5, 3.8 + playT * 0.05) * stumble * (zoomT > 0 ? 1.7 : 1) : 0;
        speed += (want - speed) * Math.min(1, dt * (phase === 'play' ? 4 : 1.5));
        camZ += speed * dt;
        runPh += speed * dt * 1.6;
        spawn();
        var i, e;
        for (i = 0; i < ents.length; i++) {
            e = ents[i];
            if (e.type === 'door' && e.open) e.a += (1.45 - e.a) * Math.min(1, dt * 7);
            if (e.blocker && !e.passed && e.z - camZ < 0.45) { e.passed = true; if (phase === 'play') crash(e); }
        }
        for (i = ents.length - 1; i >= 0; i--) if (ents[i].z < camZ + 0.1) ents.splice(i, 1);
        for (i = flying.length - 1; i >= 0; i--) if (!stepBall(flying[i], dt)) flying.splice(i, 1);
        for (i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            p.vy -= G * 0.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += p.vr * dt; p.life -= dt;
            if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; p.vr *= 0.5; }
            if (p.life <= 0 || p.z < camZ + NEAR) parts.splice(i, 1);
        }
        for (i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.1) floats.splice(i, 1); }
        for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.35) rings.splice(i, 1); }
        paws[0] = Math.max(0, paws[0] - dt * 4); paws[1] = Math.max(0, paws[1] - dt * 4);
        shake = Math.max(0, shake - dt * 40);
        flash = Math.max(0, flash - dt * 2.5);
        var score = Math.floor(camZ) + bonus;
        if (score !== shownScore) { shownScore = score; api.score(score); }
        if (phase !== 'play') return;
        if (balls <= 3 && balls > 0 && !lowWarned) { lowWarned = true; chat('Low on yarn! Hit the crystals.', 'think', true); }
        if (balls <= 0 && !flying.length) {
            phase = 'over';
            api.say('Out of yarn. Nap time.', 2400);
            api.end({ score: score, win: false,
                text: 'Out of yarn!\nYou ran ' + Math.floor(camZ) + ' m and smashed ' + smashed + (smashed === 1 ? ' thing.' : ' things.') });
        }
    }

    /* ---------- drawing ---------- */
    function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function quad(pts) {  /* pts: 4 world points [x, y, z, ...], all in front of the camera */
        ctx.beginPath();
        for (var i = 0; i < 12; i += 3) { P(pts[i], pts[i + 1], pts[i + 2]); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.closePath();
    }
    function wallQuad(side, z0, z1, y0, y1) {
        z0 = Math.max(z0, camZ + NEAR + 0.01);
        if (z1 <= z0) return false;
        var x = side * HW;
        quad([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0]);
        return true;
    }
    function drawHall() {
        var i, z, dz, s;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#a8743f';
        for (i = 0; i < ROWS; i++) {  /* staggered plank ends on the floor */
            var xa = -HW + i * PW, off = (i * 1.37) % JL;
            for (z = Math.ceil((camZ + 0.8 - off) / JL) * JL + off; z < camZ + 26; z += JL) {
                dz = z - camZ;
                ctx.globalAlpha = 0.4 * (1 - dz / 26);
                P(xa, 0, z); var x1 = px, y1 = py; P(xa + PW, 0, z);
                ctx.lineWidth = Math.max(0.7, 0.02 * pk);
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(px, py); ctx.stroke();
            }
        }
        ctx.strokeStyle = '#dcc29c';  /* wainscot panels */
        for (z = Math.ceil((camZ + 0.5) / 1.6) * 1.6; z < camZ + 28; z += 1.6) {
            dz = z - camZ;
            ctx.globalAlpha = 0.9 * (1 - dz / 28);
            ctx.lineWidth = Math.max(0.7, 0.025 * F / dz);
            for (s = -1; s <= 1; s += 2) if (wallQuad(s, z + 0.16, z + 1.44, 0.26, 0.76)) ctx.stroke();
        }
        for (z = Math.ceil((camZ + 1) / 6) * 6; z < camZ + FAR; z += 6) {  /* ceiling lights */
            ctx.globalAlpha = fade(z - camZ);
            quad([-0.32, CH, z, 0.32, CH, z, 0.32, CH, z + 0.7, -0.32, CH, z + 0.7]);
            ctx.fillStyle = '#fff4cf'; ctx.fill();
            ctx.strokeStyle = '#ecd59f'; ctx.lineWidth = 1; ctx.stroke();
        }
        var c0 = Math.floor((camZ + NEAR) / CELL), c1 = Math.floor((camZ + FAR) / CELL);
        for (var c = c1; c >= c0; c--) for (s = -1; s <= 1; s += 2) decor(c, s);
        ctx.globalAlpha = 1;
    }
    function decor(c, s) {  /* pictures, windows and side doors on the walls, the same every visit */
        var h = hash(c * 2 + (s > 0 ? 1 : 0)), z = c * CELL, k = hash(c * 7 + s * 3);
        if (h < 0.34) {
            if (!wallQuad(s, z + 2, z + 3.6, 1.3, 2.15)) return;
            ctx.globalAlpha = fade(z + 2.8 - camZ);
            ctx.fillStyle = ['#e9b98f', '#f3c6d6', '#bfd9ef'][Math.floor(k * 3)]; ctx.fill();
            wallQuad(s, z + 2.1, z + 3.5, 1.4, 2.05);
            ctx.fillStyle = '#e8f4fb'; ctx.fill();
            wallQuad(s, z + 2.1, z + 3.5, 1.4, 1.62);
            ctx.fillStyle = '#bfe3c4'; ctx.fill();  /* a meadow */
            var sz = z + (k < 0.5 ? 2.5 : 3.1);
            if (P(s * HW, 1.85, sz - 0.1)) {
                var sx0 = px; P(s * HW, 1.85, sz + 0.1);
                ctx.beginPath(); ctx.ellipse((sx0 + px) / 2, py, Math.max(0.5, Math.abs(px - sx0) / 2), 0.1 * pk, 0, 0, 7);
                ctx.fillStyle = '#ffd36b'; ctx.fill();  /* a sun */
            }
        } else if (h < 0.52) {
            if (!wallQuad(s, z + 1.5, z + 4, 0.98, 2.28)) return;
            ctx.globalAlpha = fade(z + 2.7 - camZ);
            ctx.fillStyle = '#ffffff'; ctx.fill();
            wallQuad(s, z + 1.6, z + 3.9, 1.06, 2.2);
            ctx.fillStyle = '#d4ecfa'; ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 0.05 * F / Math.max(0.5, z + 2.7 - camZ));
            ctx.beginPath(); if (P(s * HW, 1.06, z + 2.75)) { ctx.moveTo(px, py); P(s * HW, 2.2, z + 2.75); ctx.lineTo(px, py); }
            if (P(s * HW, 1.63, Math.max(z + 1.6, camZ + NEAR + 0.01))) { ctx.moveTo(px, py); P(s * HW, 1.63, z + 3.9); ctx.lineTo(px, py); }
            ctx.stroke();
        } else if (h < 0.62) {
            if (!wallQuad(s, z + 2, z + 3.3, 0, 2.1)) return;
            ctx.globalAlpha = fade(z + 2.6 - camZ);
            ctx.fillStyle = '#fffaf2'; ctx.fill();
            wallQuad(s, z + 2.08, z + 3.22, 0.02, 2.04);
            ctx.fillStyle = '#e9bd8f'; ctx.fill();
            if (P(s * HW, 1, z + 3.08)) { ctx.beginPath(); ctx.arc(px, py, Math.max(1, 0.05 * pk), 0, 7); ctx.fillStyle = '#f5c84c'; ctx.fill(); }
        }
    }

    function drawPane(e) {
        if (!P(0, 0, e.z)) return;
        var k = pk, dz = e.z - camZ, L = CX - HW * k, T = HY - (CH - EYE) * k, Wd = 2 * HW * k, Ht = CH * k;
        ctx.globalAlpha = fade(dz);
        e.secs.forEach(function (s) {
            var x = CX + s.x0 * k, y = HY - (s.y1 - EYE) * k, w = (s.x1 - s.x0) * k, h = (s.y1 - s.y0) * k;
            if (!s.broken) {
                ctx.fillStyle = 'rgba(165,212,240,.42)'; ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1, 0.06 * k); ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x + w * 0.2, y + h * 0.1); ctx.lineTo(x + w * 0.06, y + h * 0.36);
                ctx.moveTo(x + w * 0.34, y + h * 0.1); ctx.lineTo(x + w * 0.1, y + h * 0.55);
                ctx.moveTo(x + w * 0.9, y + h * 0.62); ctx.lineTo(x + w * 0.8, y + h * 0.8);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(110,170,215,.55)'; ctx.lineWidth = Math.max(1, 0.03 * k); ctx.strokeRect(x, y, w, h);
            } else {
                ctx.fillStyle = 'rgba(165,212,240,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1;
                s.bits.forEach(function (b) {
                    ctx.beginPath();
                    for (var i = 0; i < 8; i += 2) { var bx = CX + b[i] * k, by = HY - (b[i + 1] - EYE) * k; if (i) ctx.lineTo(bx, by); else ctx.moveTo(bx, by); }
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                });
            }
        });
        if (e.paw && !e.secs[0].broken) {  /* a paw print sticker */
            var s0 = e.secs[0], cx = CX + (s0.x0 * 0.3 + s0.x1 * 0.7) * k, cy = HY - (s0.y1 * 0.72 - EYE) * k, r = 0.13 * k;
            ctx.fillStyle = 'rgba(255,255,255,.7)';
            ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, 7); ctx.fill();
            for (var t = 0; t < 4; t++) { ctx.beginPath(); ctx.arc(cx + (t - 1.5) * r * 0.75, cy - r * (t === 0 || t === 3 ? 1.05 : 1.45), r * 0.36, 0, 7); ctx.fill(); }
        }
        var fw = 0.1 * k;  /* the frame */
        ctx.fillStyle = '#f7e6cf'; ctx.strokeStyle = '#d9bd96'; ctx.lineWidth = Math.max(1, 0.02 * k);
        var bars = [[L, T, fw, Ht], [L + Wd - fw, T, fw, Ht], [L, T, Wd, fw], [L, T + Ht - 0.06 * k, Wd, 0.06 * k]];
        if (e.secs.length > 1) bars.push([CX - fw * 0.4, T, fw * 0.8, Ht]);
        if (e.secs.length > 2) bars.push([L, HY - (CH / 2 - EYE) * k - fw * 0.4, Wd, fw * 0.8]);
        bars.forEach(function (b) { ctx.fillRect(b[0], b[1], b[2], b[3]); ctx.strokeRect(b[0], b[1], b[2], b[3]); });
        ctx.globalAlpha = 1;
    }
    function drawDoor(e) {
        if (!P(0, 0, e.z)) return;
        var k = pk, dz = e.z - camZ, L = CX - HW * k, R = CX + HW * k, T = HY - (CH - EYE) * k, B = HY + EYE * k;
        var dl = CX - DW / 2 * k, dr = CX + DW / 2 * k, dt = HY - (DH - EYE) * k;
        ctx.globalAlpha = fade(dz);
        var ca = Math.cos(e.a), sa = Math.sin(e.a), hx = -DW / 2;  /* the door leaf, hinged on the left, swings away */
        function dp(u, v) { P(hx + DW * ca * u, DH * v, e.z + DW * sa * u); }
        function leafQuad(u0, u1, v0, v1) {
            ctx.beginPath(); dp(u0, v0); ctx.moveTo(px, py); dp(u1, v0); ctx.lineTo(px, py); dp(u1, v1); ctx.lineTo(px, py); dp(u0, v1); ctx.lineTo(px, py); ctx.closePath();
        }
        leafQuad(0, 1, 0, 1); ctx.fillStyle = '#e2a979'; ctx.fill();
        ctx.fillStyle = '#d4955f';
        leafQuad(0.16, 0.84, 0.55, 0.9); ctx.fill();
        leafQuad(0.16, 0.84, 0.1, 0.45); ctx.fill();
        P(0, 0, e.z);
        ctx.beginPath(); ctx.rect(L, T, R - L, B - T);  /* the wall around the doorway */
        ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.closePath();
        ctx.fillStyle = mix([251, 228, 198], fogf(dz)); ctx.fill('evenodd');
        ctx.fillStyle = mix([253, 244, 231], fogf(dz));
        var w0 = HY - (0.88 - EYE) * k, w1 = HY - (0.13 - EYE) * k;
        ctx.fillRect(L, w0, dl - L, w1 - w0); ctx.fillRect(dr, w0, R - dr, w1 - w0);
        ctx.fillStyle = mix([255, 251, 245], fogf(dz));
        ctx.fillRect(L, w1, dl - L, B - w1); ctx.fillRect(dr, w1, R - dr, B - w1);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, 0.1 * k); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.stroke();
        if (!e.open || e.a < 0.3) {  /* the handle, with a pulsing ring to show it is the target */
            pos(e, clock);
            if (P(SX, SY, SZ)) {
                var r = 0.07 * pk;
                if (!e.open) {
                    ctx.strokeStyle = 'rgba(214,51,108,.7)'; ctx.lineWidth = Math.max(1.5, 0.025 * pk);
                    ctx.beginPath(); ctx.arc(px, py, r * (2.2 + Math.sin(clock * 6) * 0.5), 0, 7); ctx.stroke();
                }
                ctx.fillStyle = '#f5c84c'; ctx.strokeStyle = '#c99a1e'; ctx.lineWidth = Math.max(1, 0.02 * pk);
                ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.3, 0, 7); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
    function drawVase(e) {
        var dz = e.z - camZ;
        if (dz < NEAR + 0.32) return;
        ctx.globalAlpha = fade(dz);
        var xo = e.side * HW, xi = e.side * (HW - 0.62), z0 = e.z - 0.3, z1 = e.z + 0.3, lw = Math.max(1, 0.015 * F / dz);
        ctx.strokeStyle = '#d6b88f'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
        ctx.fillStyle = '#e3caa8';
        quad([xi, 0, z1, xi + e.side * 0.06, 0, z1, xi + e.side * 0.06, 0.62, z1, xi, 0.62, z1]); ctx.fill();  /* back leg */
        quad([xi, 0.6, z0, xi, 0.6, z1, xi, 0.72, z1, xi, 0.72, z0]); ctx.fillStyle = '#f0dcc0'; ctx.fill(); ctx.stroke();  /* side apron */
        quad([xi, 0.72, z0, xo, 0.72, z0, xo, 0.72, z1, xi, 0.72, z1]); ctx.fillStyle = '#fffaf1'; ctx.fill(); ctx.stroke();  /* top */
        quad([xi, 0.6, z0, xo, 0.6, z0, xo, 0.72, z0, xi, 0.72, z0]); ctx.fillStyle = '#f6e6cf'; ctx.fill(); ctx.stroke();  /* front apron */
        ctx.fillStyle = '#e3caa8';
        quad([xi, 0, z0, xi + e.side * 0.06, 0, z0, xi + e.side * 0.06, 0.6, z0, xi, 0.6, z0]); ctx.fill(); ctx.stroke();
        quad([xo - e.side * 0.06, 0, z0, xo, 0, z0, xo, 0.6, z0, xo - e.side * 0.06, 0.6, z0]); ctx.fill(); ctx.stroke();
        if (!e.broken && P(e.x, 0.72, e.z)) {
            ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk);
            var h = e.h, col = e.col;
            ctx.lineWidth = 0.018; ctx.strokeStyle = col + '1)';
            ctx.beginPath();
            if (e.kind === 0) {  /* round vase with flowers */
                ctx.strokeStyle = '#7fb77e'; ctx.lineWidth = 0.02;
                ctx.moveTo(-0.02, -h * 0.75); ctx.lineTo(-0.08, -h - 0.12); ctx.moveTo(0.02, -h * 0.75); ctx.lineTo(0.09, -h - 0.08); ctx.stroke();
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-0.08, -h - 0.13, 0.045, 0, 7); ctx.fill();
                ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(0.09, -h - 0.09, 0.04, 0, 7); ctx.fill();
                ctx.lineWidth = 0.018; ctx.strokeStyle = col + '1)';
                ctx.beginPath(); ctx.ellipse(0, -h * 0.36, 0.15, h * 0.36, 0, 0, 7);
                ctx.rect(-0.055, -h, 0.11, h * 0.35);
            } else if (e.kind === 1) {  /* bottle */
                rrect(-0.09, -h * 0.68, 0.18, h * 0.68, 0.05);
                ctx.rect(-0.035, -h - 0.06, 0.07, h * 0.4);
            } else {  /* tall glass */
                ctx.moveTo(-0.1, -h - 0.04); ctx.lineTo(0.1, -h - 0.04); ctx.lineTo(0.06, 0); ctx.lineTo(-0.06, 0); ctx.closePath();
            }
            ctx.fillStyle = col + '.78)'; ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-0.05, -h * 0.55); ctx.lineTo(-0.06, -h * 0.2); ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }
    function drawCrystal(e) {
        pos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var dz = SZ - camZ, sp = Math.cos(clock * 2.2 + e.ph), w = 0.2 * (0.3 + 0.7 * Math.abs(sp));
        ctx.globalAlpha = fade(dz);
        ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk);
        ctx.fillStyle = 'rgba(150,226,192,.28)'; ctx.beginPath(); ctx.arc(0, 0, 0.36 + Math.sin(clock * 4 + e.ph) * 0.03, 0, 7); ctx.fill();
        ctx.lineJoin = 'round'; ctx.lineWidth = 0.02; ctx.strokeStyle = '#4fae86';
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(-w, -0.07); ctx.lineTo(0, 0.3); ctx.closePath(); ctx.fillStyle = sp > 0 ? '#8edcb8' : '#c8f2dd'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(w, -0.07); ctx.lineTo(0, 0.3); ctx.closePath(); ctx.fillStyle = sp > 0 ? '#c8f2dd' : '#8edcb8'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(w, -0.07); ctx.lineTo(0, 0.3); ctx.lineTo(-w, -0.07); ctx.closePath();
        ctx.moveTo(-w, -0.07); ctx.lineTo(w, -0.07); ctx.stroke();
        var tw = 0.06 + 0.04 * Math.sin(clock * 7 + e.ph);  /* a twinkle */
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(0.1, -0.2 - tw); ctx.lineTo(0.115, -0.215); ctx.lineTo(0.1 + tw, -0.2); ctx.lineTo(0.115, -0.185);
        ctx.lineTo(0.1, -0.2 + tw); ctx.lineTo(0.085, -0.185); ctx.lineTo(0.1 - tw, -0.2); ctx.lineTo(0.085, -0.215); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    function drawLamp(e) {
        if (!P(0, CH, e.z)) return;
        var ax = px, ay = py, a = 0.75 * Math.sin(clock * 2.1 + e.ph);
        pos(e, clock); P(SX, SY, SZ);
        ctx.globalAlpha = fade(e.z - camZ);
        ctx.strokeStyle = '#9b8a77'; ctx.lineWidth = Math.max(1, 0.015 * pk);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
        ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk); ctx.rotate(-a);
        ctx.fillStyle = '#c9b9a5'; ctx.fillRect(-0.04, -0.14, 0.08, 0.06);
        if (!e.broken) {
            ctx.fillStyle = 'rgba(255,240,180,.55)'; ctx.beginPath(); ctx.arc(0, 0.12, 0.13, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-0.07, -0.1); ctx.lineTo(0.07, -0.1); ctx.quadraticCurveTo(0.12, 0.02, 0.27, 0.12);
            ctx.lineTo(-0.27, 0.12); ctx.quadraticCurveTo(-0.12, 0.02, -0.07, -0.1); ctx.closePath();
            ctx.fillStyle = 'rgba(255,200,170,.8)'; ctx.fill();
            ctx.strokeStyle = '#e59a86'; ctx.lineWidth = 0.02; ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-0.05, -0.05); ctx.quadraticCurveTo(-0.1, 0.03, -0.18, 0.08); ctx.stroke();
            ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, 0.13, 0.05, 0, 7); ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    function drawDot(e) {
        pos(e, clock);
        if (!P(SX, 0.005, SZ)) return;
        var dz = SZ - camZ, sq = clamp(EYE / dz, 0.12, 1), r = 0.12 * pk * (1 + 0.15 * Math.sin(clock * 12));
        ctx.globalAlpha = fade(dz);
        ctx.fillStyle = 'rgba(255,80,110,.25)'; ctx.beginPath(); ctx.ellipse(px, py, r * 2.6, r * 2.6 * sq, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,60,95,.9)'; ctx.beginPath(); ctx.ellipse(px, py, r, r * sq, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(px, py, r * 0.4, r * 0.4 * sq, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
    }
    function yarnBall(x, y, r, c, spin) {
        ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.strokeStyle = c[1]; ctx.lineWidth = Math.max(1, r * 0.14); ctx.stroke();
        ctx.beginPath();
        for (var j = 0; j < 3; j++) {
            var a = spin + j * 2.1, cx = x + Math.cos(a) * r * 0.95, cy = y + Math.sin(a) * r * 0.95;
            ctx.moveTo(cx + Math.cos(a + Math.PI - 0.8) * r * 0.8, cy + Math.sin(a + Math.PI - 0.8) * r * 0.8);
            ctx.arc(cx, cy, r * 0.8, a + Math.PI - 0.8, a + Math.PI + 0.8);
        }
        ctx.lineWidth = Math.max(0.8, r * 0.1); ctx.stroke();
    }
    function drawBall(b) {
        if (!P(b.x, 0, b.z)) return;
        var sq = clamp(EYE / (b.z - camZ), 0.1, 1);
        ctx.fillStyle = 'rgba(80,50,20,.15)'; ctx.beginPath(); ctx.ellipse(px, py, BR * pk * 1.1, BR * pk * sq, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = b.c[0]; ctx.lineWidth = Math.max(1, 0.02 * F / (b.z - camZ)); ctx.lineCap = 'round';
        ctx.beginPath(); P(b.x, b.y, b.z); ctx.moveTo(px, py);
        for (var i = 0; i < b.trail.length; i += 3) if (P(b.trail[i], b.trail[i + 1] + Math.sin(i + b.spin) * 0.02, b.trail[i + 2])) ctx.lineTo(px, py);
        ctx.stroke();
        P(b.x, b.y, b.z);
        yarnBall(px, py, BR * pk, b.c, b.spin);
    }
    function drawLabel(e) {
        if (!e.label || e.broken || e.open || e.passed) return;
        var dz = e.z - camZ;
        if (dz > 30 || dz < 2) return;
        if (e.type === 'door') pos(e, clock); else if (round(e)) pos(e, clock);
        var y = e.type === 'door' ? DH + 0.25 : e.type === 'lamp' ? CH - 0.15 : e.type === 'dot' ? 0.6 : SY + 0.5;
        if (!P(e.type === 'door' ? 0 : SX, y, e.z)) return;
        ctx.globalAlpha = clamp((30 - dz) / 5, 0, 1);
        ctx.font = '800 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var w = ctx.measureText(e.label).width + 18;
        ctx.fillStyle = 'rgba(255,255,255,.94)'; rrect(px - w / 2, py - 14, w, 28, 14); ctx.fill();
        ctx.fillStyle = '#d6336c'; ctx.fillText(e.label, px, py + 1);
        ctx.globalAlpha = 1;
    }
    function drawPaw(x, y, r, lift) {
        ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.fillStyle = FUR; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x - r * 0.72, H + 4); ctx.lineTo(x - r * 0.72, y + r * 0.55);
        ctx.quadraticCurveTo(x - r, y + r * 0.35, x - r, y);
        ctx.ellipse(x, y, r, r * 0.82, 0, Math.PI, 2 * Math.PI);
        ctx.quadraticCurveTo(x + r, y + r * 0.35, x + r * 0.72, y + r * 0.55); ctx.lineTo(x + r * 0.72, H + 4); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = STRIPE; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.6); ctx.quadraticCurveTo(x, y + r * 0.45, x + r * 0.5, y + r * 0.6);
        ctx.moveTo(x - r * 0.45, y + r * 1.05); ctx.quadraticCurveTo(x, y + r * 0.9, x + r * 0.45, y + r * 1.05); ctx.stroke();
        if (lift > 0.25) {  /* palm forward: toe beans */
            ctx.fillStyle = BEAN;
            ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.36, r * 0.28, 0, 0, 7); ctx.fill();
            for (var t = 0; t < 4; t++) { ctx.beginPath(); ctx.arc(x + (t - 1.5) * r * 0.36, y - r * (t === 0 || t === 3 ? 0.3 : 0.48), r * 0.13, 0, 7); ctx.fill(); }
        } else {
            ctx.strokeStyle = OL; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 0.8); ctx.lineTo(x - r * 0.26, y - r * 0.5); ctx.moveTo(x + r * 0.3, y - r * 0.8); ctx.lineTo(x + r * 0.26, y - r * 0.5); ctx.stroke();
        }
    }
    function pill(x, y, w, fill) { ctx.fillStyle = fill || 'rgba(255,255,255,.92)'; rrect(x, y, w, 34, 17); ctx.fill(); }
    function drawHud() {
        ctx.font = '800 18px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        var txt = String(balls), w = ctx.measureText(txt).width + 50, low = balls <= 3, x = 10;
        pill(x, 10, w, low && Math.sin(clock * 10) > 0 ? 'rgba(255,228,232,.95)' : null);
        yarnBall(x + 19, 27, 9, YARN[0], 0.6);
        ctx.fillStyle = low ? '#e8484f' : '#0f172a'; ctx.fillText(txt, x + 35, 28);
        x += w + 6;
        if (multi > 1 || streak > 0) {
            var t2 = multi > 1 ? 'x' + multi + ' yarn' : 'Streak ' + streak;
            ctx.font = '800 15px system-ui, sans-serif';
            var w2 = ctx.measureText(t2).width + 24;
            pill(x, 10, w2, multi > 1 ? '#d6336c' : null);
            ctx.fillStyle = multi > 1 ? '#ffffff' : '#64748b'; ctx.fillText(t2, x + 12, 28);
            x += w2 + 6;
        }
        if (zoomT > 0) {
            ctx.font = '800 15px system-ui, sans-serif';
            pill(x, 10, 96, '#fff3c4');
            ctx.fillStyle = '#b45309'; ctx.fillText('Zoomies!', x + 12, 25);
            ctx.fillStyle = '#f59e0b'; ctx.fillRect(x + 12, 34, 72 * clamp(zoomT / 4, 0, 1), 3);
        }
    }
    function draw() {
        var ox = shake ? (Math.random() - 0.5) * shake : 0, oy = shake ? (Math.random() - 0.5) * shake : 0, i;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#f8f1e6'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(bg, Math.round(ox * dpr), Math.round(oy * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
        drawHall();
        var list = ents.concat(flying);
        list.sort(function (a, b) { return b.z - a.z; });
        for (i = 0; i < list.length; i++) {
            var e = list[i];
            if (e.z - camZ > FAR + 2) continue;
            if (e.type === 'pane') drawPane(e);
            else if (e.type === 'door') drawDoor(e);
            else if (e.type === 'vase') drawVase(e);
            else if (e.type === 'ball') drawBall(e);
            else if (!e.broken || e.type === 'lamp') {
                if (e.type === 'crystal') drawCrystal(e); else if (e.type === 'lamp') drawLamp(e); else if (e.type === 'dot') drawDot(e);
            }
        }
        for (i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p.z - camZ < 0.8 || !P(p.x, p.y, p.z)) continue;
            var s = Math.min(p.s * pk, 34);
            if (s < 0.6) continue;
            var a = Math.min(1, p.life / (p.max * 0.5)) * fade(p.z - camZ);
            ctx.fillStyle = p.solid || (p.c + (0.85 * a).toFixed(2) + ')');
            ctx.globalAlpha = p.solid ? a : 1;
            ctx.beginPath();
            ctx.moveTo(px + Math.cos(p.r) * s, py + Math.sin(p.r) * s);
            ctx.lineTo(px + Math.cos(p.r + 2.3) * s * 0.7, py + Math.sin(p.r + 2.3) * s * 0.7);
            ctx.lineTo(px + Math.cos(p.r + 4.1) * s * 0.85, py + Math.sin(p.r + 4.1) * s * 0.85);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < ents.length; i++) drawLabel(ents[i]);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        for (i = 0; i < floats.length; i++) {
            var f = floats[i];
            if (!P(f.x, f.y, f.z)) continue;
            ctx.globalAlpha = clamp((1.1 - f.t) / 0.4, 0, 1);
            ctx.font = '800 ' + (f.big ? 26 : 18) + 'px system-ui, sans-serif';
            var fy = py - f.t * 46;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeText(f.text, px, fy);
            ctx.fillStyle = f.c; ctx.fillText(f.text, px, fy);
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < rings.length; i++) {
            var rg = rings[i];
            ctx.strokeStyle = 'rgba(214,51,108,' + (1 - rg.t / 0.35).toFixed(2) + ')'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(rg.x, rg.y, 6 + rg.t * 50, 0, 7); ctx.stroke();
        }
        if (zoomT > 0 && !api.reducedMotion) {  /* speed lines */
            ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath();
            for (i = 0; i < 14; i++) {
                var an = Math.random() * 6.283, r0 = rnd(0.25, 0.45) * Math.max(W, H), r1 = r0 + rnd(30, 90);
                ctx.moveTo(CX + Math.cos(an) * r0, HY + Math.sin(an) * r0); ctx.lineTo(CX + Math.cos(an) * r1, HY + Math.sin(an) * r1);
            }
            ctx.stroke();
        }
        var bob = api.reducedMotion ? 0 : Math.sin(runPh) * PAW * 0.08 * Math.min(1, speed / 4);
        drawPaw(W * 0.24, H - PAW * 0.12 - paws[0] * PAW * 1.1 + bob, PAW, paws[0]);
        drawPaw(W * 0.76, H - PAW * 0.12 - paws[1] * PAW * 1.1 - bob, PAW, paws[1]);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (flash > 0) { ctx.fillStyle = 'rgba(255,170,190,' + (flash * 0.35).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
        drawHud();
    }

    api.loop(function (dt) { update(dt); draw(); });

    /* ---------- input: tap or click to throw, Space throws straight ahead ---------- */
    api.on(cv, 'pointerdown', function (e) {
        e.preventDefault();
        var r = cv.getBoundingClientRect();
        throwAt(e.clientX - r.left, e.clientY - r.top);
    });
    api.on(cv, 'contextmenu', function (e) { e.preventDefault(); });
    api.on(window, 'keydown', function (e) {
        if (e.key !== ' ' && e.code !== 'Space') return;
        e.preventDefault();
        if (!e.repeat) throwAt(CX, HY);
    });

    fit(api.size());
    api.onResize(fit);
    spawn();
});
