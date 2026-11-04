/* Laser Chase: you steer a laser pointer dot and the cat chases it through a house, seen from above. The cat follows
   with a springy lag, so it overshoots sharp turns and drifts wide at speed: steering it means leading the dot early.
   The house scrolls on by itself (faster and faster), room after room: living room, kitchen, study, sunroom, then
   round again. Knocking over a vase, a stack of plates, a fishbowl or the like costs a life, so does bumping the robot
   vacuum or getting stuck behind furniture while the house moves on. Furniture and walls are solid but harmless.
   Pickups: fish treats (they also trace a good line through each room), a rare golden fish in the tight spots and
   catnip (soft paws for a few seconds: nothing breaks). Treats and close calls (brushing past something fragile) fill
   a streak that raises the score multiplier; a break resets it. Score = distance in cat lengths + bonuses.
   Mouse: the dot follows the pointer. Touch: drag anywhere, the dot moves with the finger but a bit further, so the
   finger never hides the cat. Keys: arrows or WASD. Everything is drawn on one canvas.
   Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('laser-chase', function (api) {
    'use strict';
    api.css(
        '.lc { position: absolute; inset: 0; overflow: hidden; touch-action: none; cursor: crosshair; }' +
        '.lc canvas { position: absolute; left: 0; top: 0; display: block; touch-action: none; }' +
        '.lc-hint { position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.lc-hint small { display: block; margin-top: 4px; color: #5b6b80; font-weight: 600; font-size: .82rem; }' +
        '.lc-hint[hidden] { display: none; }');

    /* difficulty: scroll speed at the start and at most (units/s), speed gained per second, lives, the narrowest gap
       between fragile things, rows apart, the cat's spring and damping (lower damping: more overshoot), top multiplier,
       first room with robot vacuums and their speed, doorway width (share of the room) */
    var LV = {
        easy:   { v0: 62, vmax: 180, ramp: 1.25, lives: 3, pass: 100, rowGap: 225, k: 20, d: 6.2, mult: 3, vac: 2, vacSp: 55, door: 0.5 },
        normal: { v0: 78, vmax: 220, ramp: 1.8,  lives: 3, pass: 84,  rowGap: 196, k: 19, d: 4.6, mult: 4, vac: 1, vacSp: 80, door: 0.42 },
        hard:   { v0: 96, vmax: 270, ramp: 2.4,  lives: 2, pass: 72,  rowGap: 172, k: 18, d: 3.7, mult: 5, vac: 1, vacSp: 105, door: 0.36 }
    };
    var L = LV[api.level()] || LV.normal;
    var LW = 440;                                          /* the room is 440 units wide; the view scales to fit */
    var RL = 1500;                                         /* each room is this long */
    var CAT_R = 15, VMAX = 650, AMAX = 2900, METER = 40, TAU = 6.2832;
    var STREAK = 5;                                        /* treats and close calls per multiplier step */

    var ROOMS = [
        { name: 'Living room', say: 'The living room. Mind the vases!', floor: 'wood', a: '#e8c497', b: '#ddb583', ln: '#c4925c', wall: '#f1dfc4',
          items: ['vase', 'pot', 'lamp'], furn: ['sofa', 'table'], rug: '#d9826b' },
        { name: 'Kitchen', say: 'Kitchen! Careful with the plates.', floor: 'tiles', a: '#f8f3ea', b: '#cfe0ef', ln: '#b9cbe0', wall: '#e3eef5',
          items: ['plates', 'cup', 'bottle'], furn: ['counter', 'kitable'], rug: null },
        { name: 'Study', say: 'The study. The fishbowl!', floor: 'carpet', a: '#c6d6bd', b: '#b8cbaf', ln: '#a5bb9a', wall: '#ebe4d2',
          items: ['fishbowl', 'globe', 'teapot'], furn: ['desk', 'shelf'], rug: '#8f6fb3' },
        { name: 'Sunroom', say: 'Sunroom, so many pots!', floor: 'stone', a: '#efe6d6', b: '#e4d8c3', ln: '#cbbca3', wall: '#e9f2e1',
          items: ['cactus', 'gnome', 'orchid'], furn: ['bench', 'planter'], rug: null }
    ];
    /* fragile things: collision radius, how they are named when they fall, their main color (for the shards) */
    var ITEMS = {
        vase:     { r: 14, name: 'the vase', col: '#5b8fd6' },
        pot:      { r: 15, name: 'the flower pot', col: '#d9773f' },
        lamp:     { r: 13, name: 'the lamp', col: '#f4e3b5' },
        plates:   { r: 16, name: 'the plates', col: '#ffffff' },
        cup:      { r: 11, name: 'a teacup', col: '#f9c6d3' },
        bottle:   { r: 10, name: 'a bottle', col: '#58a36a' },
        fishbowl: { r: 17, name: 'the fishbowl (the fish is fine)', col: '#a5d8f3' },
        globe:    { r: 15, name: 'the globe', col: '#4f8fd0' },
        teapot:   { r: 14, name: 'the teapot', col: '#ffffff' },
        cactus:   { r: 13, name: 'the cactus pot', col: '#d9773f' },
        gnome:    { r: 13, name: 'the garden gnome', col: '#e5484d' },
        orchid:   { r: 14, name: 'the orchid', col: '#f0a6d8' }
    };

    var C = (function () {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* ginger */ }
        function v(name, dflt) { var s = cs && cs.getPropertyValue('--' + name).trim(); return s || dflt; }
        return { fur: v('fur-bot', '#f0932c'), light: v('fur-top', '#ffc06e'), head: v('head-top', '#ffc479'),
                 stripe: v('stripe', '#cf7419'), cream: v('cream', '#ffe9c9'), tail: v('tail', '#f5a03c'),
                 iris: v('iris', '#8ed383'), line: '#3b2a1e', ear: v('ear', '#b97a33'), nose: v('nose', '#2b2220'),
                 dog: document.documentElement.dataset.pet === 'dog' };   /* a dog look: the hero is a dog */
    })();
    var PET = C.dog ? 'dog' : 'cat';

    var wrap = document.createElement('div');
    wrap.className = 'lc';
    wrap.innerHTML = '<canvas></canvas><div class="lc-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.lc-hint');
    hint.textContent = (api.touch ? 'Drag anywhere to move the laser dot' : 'Click, then move the mouse (or use the arrow keys)') +
        '\nThe ' + PET + ' chases the dot. Don\'t let it break things!';
    var small = document.createElement('small');
    small.textContent = 'Treats and close calls raise your multiplier, catnip gives soft paws';
    hint.appendChild(small);

    /* state */
    var W = 0, H = 0, k = 1, rx = 0, VH = 640, dpr = 1;
    var state = 'ready', time = 0, speed = L.v0, camTop = 0, dist = 0, bonus = 0, score = 0, overT = 0;
    var lives = L.lives, mult = 1, pips = 0, inv = 0, soft = 0, shake = 0, treats = 0, closeCalls = 0;
    var cat = { x: LW / 2, y: 0, vx: 0, vy: 0, ang: 0, step: 0, tail: 0 };
    var dot = { x: LW / 2, y: 0 }, keys = {}, roomShown = 0, banner = 0;
    var items = [], furn = [], vacs = [], picks = [], decor = [], parts = [], texts = [];
    var genY = 0, nextWall = 1, pass = { x: LW / 2, y: 0 }, nipRoom = 0, endWhy = '';

    function reset() {
        camTop = -VH;                                      /* world y grows downwards, the house goes on upwards */
        cat.x = LW / 2; cat.y = -VH * 0.24; cat.ang = 0;
        dot.x = LW / 2; dot.y = VH * 0.5;
        genY = -VH * 0.62; pass = { x: LW / 2, y: cat.y };
        addRug(0);
        generate();
    }

    /* size: the room is as wide as fits, but the view always shows at least 700 units */
    function fit(s) {
        var first = !W;
        W = s.w; H = s.h;
        k = Math.max(0.5, Math.min(W / LW, H / 700, 1.7));
        rx = Math.round((W - LW * k) / 2);
        var oldVH = VH;
        VH = H / k;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        sprites = {}; spriteScale = dpr * k;
        if (first) reset();
        else if (state === 'ready') { camTop = -VH; cat.y = -VH * 0.24; dot.y = VH * 0.5; }
        else { camTop += oldVH - VH; dot.y = clamp(dot.y, VH * 0.1, VH - 8); }   /* keep the bottom of the view where it was */
        draw(performance.now());
    }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
    function roomAt(y) { return Math.max(0, Math.floor(-y / RL)); }
    function depth01(y) { return clamp(-y / 9000, 0, 1); }

    /* input */
    var touchId = -1, lastX = 0, lastY = 0, GAIN = 1.35;
    function toDot(cx, cy) {
        var r = cv.getBoundingClientRect();
        dot.x = clamp((cx - r.left - rx) / k, 6, LW - 6);
        dot.y = clamp((cy - r.top) / k, VH * 0.1, VH - 8);
    }
    api.on(wrap, 'pointerdown', function (e) {
        e.preventDefault();
        if (state === 'over') return;
        if (e.pointerType === 'mouse') toDot(e.clientX, e.clientY);
        else {
            touchId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
            if (wrap.setPointerCapture) try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
        }
        begin();
    });
    api.on(wrap, 'pointermove', function (e) {
        if (state === 'over') return;
        if (e.pointerType === 'mouse') { toDot(e.clientX, e.clientY); return; }
        if (e.pointerId !== touchId) return;
        e.preventDefault();
        dot.x = clamp(dot.x + (e.clientX - lastX) * GAIN / k, 6, LW - 6);
        dot.y = clamp(dot.y + (e.clientY - lastY) * GAIN / k, VH * 0.1, VH - 8);
        lastX = e.clientX; lastY = e.clientY;
    });
    function up(e) { if (e.pointerId === touchId) touchId = -1; }
    api.on(window, 'pointerup', up);
    api.on(window, 'pointercancel', up);
    api.on(wrap, 'touchmove', function (e) { e.preventDefault(); }, { passive: false });   /* no page scroll while dragging */
    var KEYS = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
    api.on(document, 'keydown', function (e) {
        var kk = KEYS[e.code];
        if (!kk || state === 'over') return;
        var a = document.activeElement;
        if (a && (a.tagName === 'BUTTON' || a.tagName === 'SELECT')) a.blur();
        e.preventDefault();
        keys[kk] = true;
        begin();
    });
    api.on(document, 'keyup', function (e) { var kk = KEYS[e.code]; if (kk) keys[kk] = false; });
    api.on(window, 'blur', function () { keys = {}; });

    function begin() {
        if (state !== 'ready') return;
        state = 'run'; hint.hidden = true;
        api.cat('happy');
        api.sfx('tap');
    }

    /* the house: rows of things ahead of the view, a wall with a doorway between rooms */
    function generate() {
        while (genY > camTop - 260) {
            var wallY = -nextWall * RL;
            if (genY - 120 < wallY) {                      /* the doorway to the next room */
                addWall(wallY);
                genY = wallY - 150;
                nextWall++;
                continue;
            }
            row(genY);
            genY -= L.rowGap * (1 - 0.25 * depth01(genY)) * rnd(0.85, 1.2);
        }
    }
    function addWall(y) {
        var dd = depth01(y), gw = LW * (L.door - 0.1 * dd), gx = rnd(gw / 2 + 14, LW - gw / 2 - 14), T = 18;
        furn.push({ kind: 'wall', x: 0, y: y - T / 2, w: gx - gw / 2, h: T });
        furn.push({ kind: 'wall', x: gx + gw / 2, y: y - T / 2, w: LW - gx - gw / 2, h: T });
        trail(gx, y + 60);
        addTreat(gx, y);
        pass = { x: gx, y: y - 30 };
        addRug(roomAt(y - 10));
    }
    function addRug(r) {
        var th = ROOMS[r % ROOMS.length];
        if (!th.rug) return;
        var w = rnd(180, 300), h = rnd(260, 420), y0 = -r * RL - RL * rnd(0.25, 0.6);
        decor.push({ x: rnd(10, LW - w - 10), y: y0, w: w, h: h, c: th.rug });
    }
    function freeGaps(spans) {                             /* gaps between [a, b] spans across the room, widest first */
        spans.sort(function (p, q) { return p[0] - q[0]; });
        var out = [], at = 0;
        for (var i = 0; i < spans.length; i++) {
            if (spans[i][0] > at) out.push([at, spans[i][0]]);
            at = Math.max(at, spans[i][1]);
        }
        if (at < LW) out.push([at, LW]);
        return out;
    }
    function addItem(kind, x, y) {
        var d = ITEMS[kind];
        items.push({ kind: kind, x: x, y: y, r: d.r, broken: false, near: 99, done: false, wob: 0 });
    }
    function addTreat(x, y, kind) {
        for (var i = picks.length - 1; i >= 0 && i > picks.length - 8; i--) {   /* never two on one spot */
            var p = picks[i];
            if (Math.abs(p.x - x) < 26 && Math.abs(p.y - y) < 26) { if (kind) p.kind = kind; return; }
        }
        picks.push({ kind: kind || 'treat', x: x, y: y, ph: Math.random() * TAU, got: false });
    }
    /* treats from the last passage to the next one: they show a line that works */
    function trail(x, y) {
        var n = 2;
        for (var i = 1; i <= n; i++) {
            var t = i / (n + 1);
            addTreat(pass.x + (x - pass.x) * t, pass.y + (y - pass.y) * t);
        }
    }
    function row(y) {
        var room = roomAt(y), th = ROOMS[room % ROOMS.length], dd = depth01(y);
        var P = L.pass * (1 - 0.15 * dd), r = Math.random(), px;
        if (-y < VH * 0.55) {                              /* a calm start: just treats */
            px = clamp(pass.x + rnd(-120, 120), 40, LW - 40);
            trail(px, y); addTreat(px, y); pass = { x: px, y: y };
            return;
        }
        if (r < 0.08) {                                    /* a breather */
            px = rnd(50, LW - 50);
            trail(px, y); addTreat(px, y); pass = { x: px, y: y };
            return;
        }
        if (room >= L.vac && r < 0.08 + 0.08 + 0.1 * dd && !vacs.some(function (v) { return v.y > y - 400; })) {
            var dir = Math.random() < 0.5 ? -1 : 1;
            vacs.push({ x: rnd(40, LW - 40), y: y, vx: dir * L.vacSp * (1 + 0.5 * dd), r: 18, ph: 0 });
            px = rnd(60, LW - 60);
            trail(px, y - 70); addTreat(px, y - 70); pass = { x: px, y: y - 70 };
            return;
        }
        var kind = pick(th.items), ir = ITEMS[kind].r;
        if (r < 0.42) {                                    /* a piece of furniture from one side, maybe with something at its end */
            var left = Math.random() < 0.5, h = rnd(52, 80);
            var withItem = Math.random() < 0.65, room2 = P + 30 + (withItem ? ir * 2 + 4 : 0);
            var w = Math.min(rnd(150, 250) * (1 + 0.2 * dd), LW - room2);
            var fx = left ? 0 : LW - w;
            furn.push({ kind: pick(th.furn), x: fx, y: y - h / 2, w: w, h: h });
            var edge = left ? w : LW - w, ex = edge;
            if (withItem) {
                var ix = edge + (left ? 1 : -1) * (ir + 3), iy = y + rnd(-h / 2 + ir, h / 2 - 4);
                addItem(kind, ix, iy);
                ex = ix + (left ? 1 : -1) * ir;
            }
            px = left ? (ex + LW) / 2 : ex / 2;
            if (Math.random() < 0.35 && Math.abs(px - (left ? ex : 0)) > 80) {   /* one more thing in the open part */
                var k2 = pick(th.items), r2 = ITEMS[k2].r, x2 = left ? LW - r2 - rnd(0, 20) : r2 + rnd(0, 20);
                if (Math.abs((left ? x2 - r2 : x2 + r2) - ex) > P + 10) {
                    addItem(k2, x2, y + rnd(-20, 20));
                    px = left ? (ex + x2 - r2) / 2 : (x2 + r2 + ex) / 2;
                }
            }
        } else if (r < 0.62) {                             /* a gate: two things with a gap, sometimes a golden fish in a tight one */
            var gold = Math.random() < 0.14, gw = gold ? P * 0.82 : P * rnd(1, 1.35);
            px = rnd(gw / 2 + ir * 2, LW - gw / 2 - ir * 2);
            addItem(kind, px - gw / 2 - ir, y + rnd(-8, 8));
            addItem(pick(th.items), px + gw / 2 + ITEMS[kind].r, y + rnd(-8, 8));
            if (gold) { trail(px, y + 40); addTreat(px, y, 'gold'); pass = { x: px, y: y }; return; }
        } else {                                           /* a scatter of one to three things, always with a way through */
            var n = 1 + (Math.random() < 0.65 + 0.3 * dd ? 1 : 0) + (Math.random() < 0.25 + 0.45 * dd ? 1 : 0);
            for (var tries = 0; tries < 14; tries++) {
                var list = [], spans = [];
                for (var i = 0; i < n; i++) {
                    var kk = pick(th.items), rr0 = ITEMS[kk].r, x = rnd(rr0, LW - rr0);
                    list.push([kk, x, y + rnd(-26, 26)]); spans.push([x - rr0, x + rr0]);
                }
                var gaps = freeGaps(spans).filter(function (gp) { return gp[1] - gp[0] >= P; });
                var tooClose = false;                      /* things side by side need the cat's width between them, or none */
                for (i = 0; i < spans.length; i++) for (var j = i + 1; j < spans.length; j++) {
                    var gap = Math.max(spans[i][0], spans[j][0]) - Math.min(spans[i][1], spans[j][1]);
                    if (gap > 0 && gap < CAT_R * 2 + 8) tooClose = true;
                    var ddx = list[i][1] - list[j][1], ddy = list[i][2] - list[j][2], rs = spans[i][1] - list[i][1] + spans[j][1] - list[j][1] + 8;
                    if (ddx * ddx + ddy * ddy < rs * rs) tooClose = true;   /* not on top of each other */
                }
                if (gaps.length && !tooClose) {
                    list.forEach(function (it) { addItem(it[0], it[1], it[2]); });
                    var best = gaps[0], bd = 1e9;
                    gaps.forEach(function (gp) { var c = (gp[0] + gp[1]) / 2, dd2 = Math.abs(c - pass.x); if (dd2 < bd) { bd = dd2; best = gp; } });
                    px = (best[0] + best[1]) / 2;
                    break;
                }
                if (tries === 7 && n > 1) n--;
            }
            if (px === undefined) px = LW / 2;
        }
        trail(px, y);
        if (room > 0 && nipRoom < room && Math.random() < (L === LV.easy ? 0.35 : 0.22)) { addTreat(px, y, 'nip'); nipRoom = room; }
        else addTreat(px, y);
        pass = { x: px, y: y };
    }

    /* the run */
    function update(dt) {
        if (inv > 0) inv -= dt;
        if (shake > 0) shake -= dt;
        if (banner > 0) banner -= dt;
        if (state !== 'run') { if (state === 'ready') face(dot.x - cat.x, dot.y + camTop - cat.y, dt); return; }
        time += dt;
        if (soft > 0) soft -= dt;
        speed = Math.min(L.vmax, L.v0 + time * L.ramp);
        camTop -= speed * dt;
        dist += speed * dt;
        var kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
        if (kx || ky) {
            var kl = Math.sqrt(kx * kx + ky * ky);
            dot.x = clamp(dot.x + kx / kl * 470 * dt, 6, LW - 6);
            dot.y = clamp(dot.y + ky / kl * 470 * dt, VH * 0.1, VH - 8);
        }
        var n = Math.ceil(dt / 0.009), h = dt / n;
        for (var i = 0; i < n && state === 'run'; i++) physics(h);
        if (state !== 'run') return;
        var sp = Math.sqrt(cat.vx * cat.vx + cat.vy * cat.vy);
        cat.step += sp * dt / 26;
        cat.tail += dt * (2.2 + sp / 160);
        face(cat.vx, cat.vy, dt * Math.min(1, sp / 120));
        for (i = 0; i < vacs.length; i++) {
            var v = vacs[i];
            v.x += v.vx * dt; v.ph += dt;
            if (v.x < v.r) { v.x = v.r; v.vx = Math.abs(v.vx); }
            if (v.x > LW - v.r) { v.x = LW - v.r; v.vx = -Math.abs(v.vx); }
        }
        pickups();
        nearMisses(sp);
        if (cat.y - camTop > VH + CAT_R * 0.6) return behind();
        var room = roomAt(cat.y);
        if (room > roomShown) {
            roomShown = room; banner = 2.4;
            api.sfx('point');
            api.cat('wow');
            api.say(ROOMS[room % ROOMS.length].say, 1800);
        }
        generate();
        cull();
        var sc = Math.floor(dist / METER) + bonus;
        if (sc !== score) { score = sc; api.score(score); }
    }
    function face(dx, dy, rate) {                          /* turn the cat's head smoothly towards a direction */
        if (dx * dx + dy * dy < 4) return;
        var target = Math.atan2(dx, -dy), d = target - cat.ang;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        cat.ang += d * Math.min(1, rate * 10);
    }
    /* the chase: a spring pulls the cat towards the dot, with damping, a top acceleration and a top speed */
    function physics(h) {
        var tx = dot.x, ty = dot.y + camTop;
        var ax = (tx - cat.x) * L.k - cat.vx * L.d, ay = (ty - cat.y) * L.k - cat.vy * L.d;
        var al = Math.sqrt(ax * ax + ay * ay);
        if (al > AMAX) { ax *= AMAX / al; ay *= AMAX / al; }
        cat.vx += ax * h; cat.vy += ay * h;
        var vl = Math.sqrt(cat.vx * cat.vx + cat.vy * cat.vy);
        if (vl > VMAX) { cat.vx *= VMAX / vl; cat.vy *= VMAX / vl; }
        cat.x += cat.vx * h; cat.y += cat.vy * h;
        if (cat.x < CAT_R) { cat.x = CAT_R; if (cat.vx < 0) cat.vx = 0; }
        if (cat.x > LW - CAT_R) { cat.x = LW - CAT_R; if (cat.vx > 0) cat.vx = 0; }
        for (var i = 0; i < furn.length; i++) solid(furn[i]);
        for (i = 0; i < items.length; i++) {
            var it = items[i];
            if (it.broken) continue;
            var dx = cat.x - it.x, dy = cat.y - it.y, dd = Math.sqrt(dx * dx + dy * dy), gap = dd - CAT_R - it.r;
            if (gap < 0) {
                if (inv > 0 || soft > 0) {
                    if (it.wob <= 0) { it.wob = 0.6; if (soft > 0) api.sfx('move'); }
                    it.done = true;
                } else { smash(it, dx / (dd || 1), dy / (dd || 1)); if (state !== 'run') return; }
            } else if (gap < it.near && inv <= 0 && soft <= 0) it.near = gap;
        }
        for (i = 0; i < vacs.length; i++) {
            var v = vacs[i], vx = cat.x - v.x, vy = cat.y - v.y, vd = Math.sqrt(vx * vx + vy * vy);
            if (vd < CAT_R + v.r && inv <= 0) { bump(v, vx / (vd || 1), vy / (vd || 1)); if (state !== 'run') return; }
        }
    }
    function solid(f) {                                    /* circle against a box: slide along it */
        var nx = clamp(cat.x, f.x, f.x + f.w), ny = clamp(cat.y, f.y, f.y + f.h);
        var dx = cat.x - nx, dy = cat.y - ny, d2 = dx * dx + dy * dy;
        if (d2 >= CAT_R * CAT_R) return;
        var d = Math.sqrt(d2);
        if (d < 0.001) {                                   /* the centre is inside: out the nearest side */
            var l = cat.x - f.x, r = f.x + f.w - cat.x, t = cat.y - f.y, b = f.y + f.h - cat.y, m = Math.min(l, r, t, b);
            dx = m === l ? -1 : m === r ? 1 : 0; dy = m === t ? -1 : m === b ? 1 : 0;
            if (dx && dy) dy = 0;
            cat.x += dx * (m + CAT_R); cat.y += dy * (m + CAT_R);
        } else {
            dx /= d; dy /= d;
            cat.x += dx * (CAT_R - d); cat.y += dy * (CAT_R - d);
        }
        var vn = cat.vx * dx + cat.vy * dy;
        if (vn < 0) { cat.vx -= vn * dx; cat.vy -= vn * dy; }
    }
    function hurt(why, x, y) {
        lives -= 1;
        mult = 1; pips = 0;
        shake = api.reducedMotion ? 0 : 0.3;
        if (lives <= 0) return over(why);
        inv = 1.5;
        api.cat('sad');
        api.say(lives === 1 ? 'Oops! Last life.' : 'Oops! ' + lives + ' lives left.', 1500);
        text(x, y - 30, 'Oops!', '#c2410c');
    }
    function smash(it, nx, ny) {
        it.broken = true; it.done = true;
        api.sfx('hit');
        shards(it.x, it.y, ITEMS[it.kind].col);
        cat.vx = nx * 220; cat.vy = ny * 220;
        hurt(ITEMS[it.kind].name, it.x, it.y);
    }
    function bump(v, nx, ny) {
        api.sfx('hit');
        cat.vx = nx * 320; cat.vy = ny * 320;
        v.vx = -v.vx;
        stars(cat.x, cat.y);
        hurt('vacuum', cat.x, cat.y);
    }
    function behind() {
        api.sfx('hit');
        hurt('behind', cat.x, camTop + VH - 40);
        if (state !== 'run') return;
        /* the cat hops back into view, where the dot is, or the nearest free spot to it */
        var y0 = camTop + VH * 0.62, best = null;
        for (var s = 0; s < 22 && !best; s++) {
            var x = clamp(dot.x + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 20, CAT_R, LW - CAT_R);
            if (free(x, y0)) best = x;
        }
        cat.x = best === null ? dot.x : best; cat.y = y0; cat.vx = 0; cat.vy = -speed;
        dot.y = Math.min(dot.y, VH * 0.6);
    }
    function free(x, y) {
        for (var i = 0; i < furn.length; i++) {
            var f = furn[i];
            if (x > f.x - CAT_R - 4 && x < f.x + f.w + CAT_R + 4 && y > f.y - CAT_R - 4 && y < f.y + f.h + CAT_R + 4) return false;
        }
        for (i = 0; i < items.length; i++) if (!items[i].broken && Math.abs(items[i].x - x) < 40 && Math.abs(items[i].y - y) < 40) return false;
        return true;
    }
    function over(why) {
        state = 'over';
        keys = {};
        score = Math.max(0, Math.floor(dist / METER) + bonus);
        api.score(score);
        var m = Math.floor(dist / METER), what;
        if (why === 'vacuum') what = 'Spooked by the robot vacuum!';
        else if (why === 'behind') what = 'The ' + PET + ' got stuck and lost the dot!';
        else what = 'Crash! The ' + PET + ' knocked over ' + why + '.';
        api.cat('sad');
        api.say(why === 'vacuum' ? 'Hiss!' : 'Oh no...', 1600);
        api.sfx('lose');
        api.end({ score: score, win: false, text: what + '\nScore: ' + score + ' (' + m + ' ' + PET + ' lengths, ' + treats + ' treats' +
            (closeCalls ? ', ' + closeCalls + ' close call' + (closeCalls === 1 ? '' : 's') : '') + ')' });
    }
    function streak(n) {
        pips += n;
        while (pips >= STREAK) {
            if (mult < L.mult) {
                pips -= STREAK; mult++;
                api.sfx('point');
                text(cat.x, cat.y - 46, 'x' + mult + '!', '#d6336c');
                if (mult === L.mult) api.cat('happy');
            } else { pips = STREAK; break; }
        }
    }
    function pickups() {
        for (var i = 0; i < picks.length; i++) {
            var p = picks[i];
            if (p.got) continue;
            var dx = cat.x - p.x, dy = cat.y - p.y, rr0 = p.kind === 'treat' ? 24 : 27;
            if (dx * dx + dy * dy > rr0 * rr0) continue;
            p.got = true;
            if (p.kind === 'nip') {
                soft = 7; bonus += 5;
                api.sfx('jump');
                api.say('Catnip! Soft paws for a bit.', 1400);
                text(p.x, p.y - 16, 'Soft paws!', '#2f9e5b');
                sparks(p.x, p.y, '#86efac', 10);
                continue;
            }
            var v = (p.kind === 'gold' ? 20 : 1) * mult;
            bonus += v; treats++;
            api.sfx(p.kind === 'gold' ? 'win' : 'pop');
            text(p.x, p.y - 14, '+' + v, p.kind === 'gold' ? '#b45309' : '#2563eb');
            sparks(p.x, p.y, '#fcd34d', p.kind === 'gold' ? 14 : 5);
            streak(p.kind === 'gold' ? 3 : 1);
        }
    }
    /* a close call: the cat passed within a whisker of something fragile, at speed, and left it standing */
    function nearMisses(sp) {
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (it.done || it.broken || it.near > 10) continue;
            var dx = cat.x - it.x, dy = cat.y - it.y, gap = Math.sqrt(dx * dx + dy * dy) - CAT_R - it.r;
            if (gap < 26) continue;
            it.done = true;
            if (sp < 90) continue;
            var v = 5 * mult;
            bonus += v; closeCalls++;
            api.sfx('tap');
            text(it.x, it.y - 40, 'Close! +' + v, '#7c3aed');
            it.wob = 0.5;
            streak(2);
        }
    }
    function cull() {
        var lim = camTop + VH + 160;
        function keep(o) { return o.y < lim; }
        items = items.filter(keep); picks = picks.filter(function (p) { return !p.got && p.y < lim; });
        furn = furn.filter(function (f) { return f.y < lim; });
        vacs = vacs.filter(keep);
        decor = decor.filter(function (d) { return d.y < lim; });
    }

    /* particles and floating text */
    function part(x, y, vx, vy, life, c, r, kind) {
        parts.push({ x: x, y: y, vx: vx, vy: vy, t: 0, life: life, c: c, r: r, kind: kind || 0, a: Math.random() * TAU });
        if (parts.length > 140) parts.shift();
    }
    function shards(x, y, c) {
        var n = api.reducedMotion ? 0 : 12;
        for (var i = 0; i < n; i++) { var a = Math.random() * TAU, v = 60 + Math.random() * 160; part(x, y - 10, Math.cos(a) * v, Math.sin(a) * v, 0.7, c, 3 + Math.random() * 3, 1); }
        for (i = 0; i < 6; i++) items.push({ kind: 'shard', x: x + rnd(-18, 18), y: y + rnd(-12, 12), r: 0, broken: true, done: true, c: c, a: Math.random() * TAU, s: rnd(3, 6) });
    }
    function sparks(x, y, c, n) {
        if (api.reducedMotion) return;
        for (var i = 0; i < n; i++) { var a = Math.random() * TAU, v = 40 + Math.random() * 110; part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.45, c, 2 + Math.random() * 2, 0); }
    }
    function stars(x, y) {
        if (api.reducedMotion) return;
        for (var i = 0; i < 9; i++) { var a = Math.random() * TAU, v = 80 + Math.random() * 120; part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6, i % 2 ? '#fcd34d' : '#f9a8d4', 3, 0); }
    }
    function text(x, y, s, c) { texts.push({ x: x, y: y, s: s, c: c, t: 0 }); }
    function updateFx(dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            p.t += dt;
            if (p.t >= p.life) { parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.a += dt * 8;
        }
        for (i = texts.length - 1; i >= 0; i--) if ((texts[i].t += dt) > 1) texts.splice(i, 1);
        for (i = 0; i < items.length; i++) if (items[i].wob > 0) items[i].wob -= dt;
    }

    /* sprites: each fragile thing and pickup is drawn once per scale into a small canvas */
    var sprites = {}, spriteScale = 1;
    function sprite(kind) {
        var s = sprites[kind];
        if (s) return s;
        var box = BOX[kind] || [44, 72, 12];               /* width, height above the anchor, depth below it */
        var c = document.createElement('canvas');
        c.width = Math.ceil(box[0] * spriteScale); c.height = Math.ceil((box[1] + box[2]) * spriteScale);
        var x = c.getContext('2d');
        x.setTransform(spriteScale, 0, 0, spriteScale, box[0] / 2 * spriteScale, box[1] * spriteScale);
        x.lineJoin = 'round'; x.lineCap = 'round';
        x.strokeStyle = C.line; x.lineWidth = 1.6;
        DRAW[kind](x);
        s = sprites[kind] = { c: c, w: box[0], h: box[1] + box[2], ax: box[0] / 2, ay: box[1] };
        return s;
    }
    var BOX = { lamp: [44, 80, 12], vase: [44, 66, 12], gnome: [36, 60, 10], orchid: [46, 64, 10], fishbowl: [44, 48, 10],
        globe: [40, 50, 10], bottle: [28, 48, 10], cup: [32, 24, 10], plates: [40, 26, 12], treat: [30, 20, 14], gold: [36, 24, 16], nip: [34, 26, 14] };
    function ell(c, x, y, a, b) { c.beginPath(); c.ellipse(x, y, a, b, 0, 0, TAU); }
    function shadow(c, rx0, ry0) { c.fillStyle = 'rgba(80, 50, 20, .18)'; ell(c, 0, 3, rx0, ry0); c.fill(); }
    function fs(c, fill) { c.fillStyle = fill; c.fill(); c.stroke(); }
    function rrect(c, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    function potShape(c, top, bot, wt, wb, fill) {         /* a flower pot: wider at the top */
        c.beginPath(); c.moveTo(-wt, top); c.lineTo(wt, top); c.lineTo(wb, bot); c.quadraticCurveTo(0, bot + 3, -wb, bot); c.closePath(); fs(c, fill);
        rrect(c, -wt - 2, top - 4, wt * 2 + 4, 6, 2); fs(c, fill);
    }
    var DRAW = {
        vase: function (c) {
            shadow(c, 15, 6);
            c.strokeStyle = '#3f8f3a'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(-1, -40); c.quadraticCurveTo(-8, -50, -10, -56); c.moveTo(1, -40); c.quadraticCurveTo(6, -52, 9, -58); c.moveTo(0, -40); c.lineTo(1, -60); c.stroke();
            c.strokeStyle = C.line; c.lineWidth = 1.6;
            [[-10, -57, '#f78fb3'], [9, -59, '#fcd34d'], [1, -61, '#ffffff']].forEach(function (f) { c.beginPath(); c.arc(f[0], f[1], 4.2, 0, TAU); fs(c, f[2]); c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(f[0], f[1], 1.4, 0, TAU); c.fill(); });
            c.beginPath();
            c.moveTo(-5, -40); c.quadraticCurveTo(-4, -30, -12, -22); c.quadraticCurveTo(-18, -12, -9, 2); c.lineTo(9, 2);
            c.quadraticCurveTo(18, -12, 12, -22); c.quadraticCurveTo(4, -30, 5, -40); c.closePath(); fs(c, '#5b8fd6');
            c.fillStyle = '#e8f1fb'; c.beginPath(); c.moveTo(-15, -15); c.quadraticCurveTo(0, -10, 15, -15); c.lineTo(14.5, -11); c.quadraticCurveTo(0, -6, -14.5, -11); c.fill();
            c.fillStyle = 'rgba(255, 255, 255, .45)'; ell(c, -8, -22, 2, 5); c.fill();
            ell(c, 0, -40, 5.5, 2); fs(c, '#3f6fb5');
        },
        pot: function (c) {
            shadow(c, 16, 6);
            [[-10, -30, -0.5], [10, -31, 0.5], [0, -38, 0], [-5, -26, -1], [6, -25, 1]].forEach(function (l) {
                c.beginPath(); c.ellipse(l[0], l[1], 5, 11, l[2], 0, TAU); fs(c, '#5aa452');
            });
            c.strokeStyle = '#3f7d39'; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, -32); c.stroke(); c.strokeStyle = C.line;
            potShape(c, -16, 3, 14, 10, '#d9773f');
        },
        lamp: function (c) {
            shadow(c, 13, 5);
            ell(c, 0, 0, 11, 4); fs(c, '#6b7280');
            c.fillStyle = '#4b5563'; c.fillRect(-1.5, -50, 3, 50); c.strokeRect(-1.5, -50, 3, 50);
            c.beginPath(); c.moveTo(-9, -72); c.lineTo(9, -72); c.lineTo(15, -50); c.lineTo(-15, -50); c.closePath(); fs(c, '#f4e3b5');
            c.strokeStyle = '#d9b96a'; c.beginPath(); c.moveTo(-14, -54); c.lineTo(14, -54); c.stroke();
        },
        plates: function (c) {
            shadow(c, 18, 6);
            for (var i = 0; i < 6; i++) { ell(c, 0, -i * 3.2, 16, 6); fs(c, '#ffffff'); c.strokeStyle = '#7aa7d9'; ell(c, 0, -i * 3.2, 12, 4.2); c.stroke(); c.strokeStyle = C.line; }
        },
        cup: function (c) {
            shadow(c, 13, 5);
            ell(c, 0, 1, 12, 4.5); fs(c, '#ffffff');
            c.beginPath(); c.arc(9, -6, 4, -1.4, 1.4); c.lineWidth = 2.4; c.stroke(); c.lineWidth = 1.6;
            c.beginPath(); c.moveTo(-9, -12); c.lineTo(9, -12); c.quadraticCurveTo(9, 0, 0, 0); c.quadraticCurveTo(-9, 0, -9, -12); fs(c, '#f9c6d3');
            ell(c, 0, -12, 9, 3); fs(c, '#a86b3c');
            c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-3, -6, 1.6, 0, TAU); c.arc(3, -4, 1.6, 0, TAU); c.fill();
        },
        bottle: function (c) {
            shadow(c, 10, 4);
            rrect(c, -7, -28, 14, 30, 5); fs(c, '#58a36a');
            rrect(c, -3, -40, 6, 14, 2); fs(c, '#58a36a');
            rrect(c, -3.5, -44, 7, 5, 1.5); fs(c, '#c08a55');
            c.fillStyle = '#f8f3ea'; c.fillRect(-7, -18, 14, 9); c.strokeRect(-7, -18, 14, 9);
            c.strokeStyle = 'rgba(255, 255, 255, .7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, -25); c.lineTo(-4, -21); c.stroke();
        },
        fishbowl: function (c) {
            shadow(c, 17, 6);
            c.beginPath(); c.arc(0, -16, 18, 0, TAU); c.fillStyle = 'rgba(190, 228, 248, .9)'; c.fill();
            c.save(); c.beginPath(); c.arc(0, -16, 18, 0, TAU); c.clip();
            c.fillStyle = '#7cc3ea'; c.fillRect(-20, -22, 40, 30);
            c.fillStyle = '#e0c48a'; ell(c, 0, 1, 16, 4); c.fill();
            c.restore();
            c.beginPath(); c.arc(0, -16, 18, 0, TAU); c.stroke();
            ell(c, 0, -32, 9, 3); fs(c, '#d8eef9');
            c.fillStyle = '#fb923c'; ell(c, -2, -12, 6, 3.6); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(4, -12); c.lineTo(9, -16); c.lineTo(9, -8); c.closePath(); fs(c, '#fb923c');
            c.fillStyle = C.line; c.beginPath(); c.arc(-5.5, -13, 0.9, 0, TAU); c.fill();
            c.fillStyle = 'rgba(255, 255, 255, .8)'; ell(c, -9, -24, 2.4, 4.5); c.fill();
        },
        globe: function (c) {
            shadow(c, 14, 5);
            ell(c, 0, 0, 11, 4); fs(c, '#8d5a3b');
            c.fillStyle = '#8d5a3b'; c.fillRect(-1.5, -12, 3, 12);
            c.beginPath(); c.arc(0, -27, 15, 0, TAU); fs(c, '#4f8fd0');
            c.fillStyle = '#7cc46b';
            c.beginPath(); c.ellipse(-5, -31, 6, 4.5, 0.4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(6, -22, 5, 6.5, -0.3, 0, TAU); c.fill();
            c.beginPath(); c.ellipse(-4, -18, 3, 2, 0, 0, TAU); c.fill();
            c.strokeStyle = '#c9a227'; c.lineWidth = 2; c.beginPath(); c.arc(0, -27, 18, 2.2, 4.1 + 2.2); c.stroke();
        },
        teapot: function (c) {
            shadow(c, 16, 5);
            c.beginPath(); c.moveTo(11, -10); c.quadraticCurveTo(21, -12, 22, -22); c.lineTo(19, -22); c.quadraticCurveTo(17, -15, 10, -14); fs(c, '#ffffff');
            c.beginPath(); c.arc(-13, -11, 6, 1.6, 4.7); c.lineWidth = 3; c.stroke(); c.lineWidth = 1.6;
            ell(c, 0, -10, 13, 11); fs(c, '#ffffff');
            c.fillStyle = '#5b8fd6'; [[-5, -12], [4, -14], [0, -5], [7, -6], [-8, -5]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 1.8, 0, TAU); c.fill(); });
            ell(c, 0, -20, 7, 2.5); fs(c, '#ffffff');
            c.beginPath(); c.arc(0, -23, 2.4, 0, TAU); fs(c, '#5b8fd6');
        },
        cactus: function (c) {
            shadow(c, 14, 5);
            c.fillStyle = '#5fa35a';
            rrect(c, -6, -44, 12, 34, 6); fs(c, '#5fa35a');
            rrect(c, -15, -34, 7, 14, 3.5); fs(c, '#5fa35a');
            rrect(c, 8, -38, 7, 12, 3.5); fs(c, '#5fa35a');
            c.strokeStyle = '#3f7d39'; c.beginPath(); c.moveTo(0, -40); c.lineTo(0, -16); c.stroke(); c.strokeStyle = C.line;
            c.fillStyle = '#f78fb3'; c.beginPath(); c.arc(0, -45, 3, 0, TAU); c.fill(); c.stroke();
            potShape(c, -14, 3, 12, 9, '#d9773f');
        },
        gnome: function (c) {
            shadow(c, 13, 5);
            c.beginPath(); c.moveTo(-11, 2); c.lineTo(11, 2); c.lineTo(8, -22); c.lineTo(-8, -22); c.closePath(); fs(c, '#3b82f6');
            c.beginPath(); c.moveTo(-8, -24); c.lineTo(8, -24); c.lineTo(0, -6); c.closePath(); fs(c, '#ffffff');
            c.beginPath(); c.arc(0, -27, 6, 0, TAU); fs(c, '#ffd3b0');
            c.beginPath(); c.moveTo(-9, -29); c.lineTo(9, -29); c.quadraticCurveTo(3, -46, -2, -56); c.quadraticCurveTo(-6, -42, -9, -29); fs(c, '#e5484d');
            c.fillStyle = '#e58a7a'; c.beginPath(); c.arc(0, -25.5, 2, 0, TAU); c.fill();
        },
        orchid: function (c) {
            shadow(c, 14, 5);
            c.strokeStyle = '#3f7d39'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(-2, -40, 10, -50); c.stroke();
            c.strokeStyle = C.line; c.lineWidth = 1.6;
            [[-14, -18, -0.9], [14, -18, 0.9]].forEach(function (l) { c.beginPath(); c.ellipse(l[0] * 0.6, l[1], 4, 10, l[2] * 1.4, 0, TAU); fs(c, '#4f9a4a'); });
            [[-3, -38], [5, -46], [12, -50], [-2, -28]].forEach(function (f) {
                c.fillStyle = '#f0a6d8';
                for (var i = 0; i < 5; i++) { var a = i / 5 * TAU; c.beginPath(); c.ellipse(f[0] + Math.cos(a) * 3.2, f[1] + Math.sin(a) * 3.2, 3, 2, a, 0, TAU); c.fill(); }
                c.fillStyle = '#fde68a'; c.beginPath(); c.arc(f[0], f[1], 1.4, 0, TAU); c.fill();
            });
            potShape(c, -14, 3, 11, 9, '#f3f4f6');
        },
        treat: function (c) { fish(c, 1, '#e8913f', '#c46a22'); },
        gold: function (c) { fish(c, 1.3, '#fcd34d', '#d4a017'); c.fillStyle = '#ffffff'; star(c, 10, -12, 3); star(c, -11, -8, 2.2); },
        nip: function (c) {
            c.fillStyle = 'rgba(80, 50, 20, .15)'; ell(c, 0, 4, 11, 4); c.fill();
            [[-7, -6, -0.7], [7, -6, 0.7], [0, -11, 0]].forEach(function (l) { c.beginPath(); c.ellipse(l[0], l[1], 5, 9, l[2], 0, TAU); fs(c, '#4ade80'); });
            c.strokeStyle = '#15803d'; c.beginPath(); c.moveTo(0, 3); c.lineTo(0, -12); c.moveTo(0, 0); c.lineTo(-7, -7); c.moveTo(0, 0); c.lineTo(7, -7); c.stroke();
        }
    };
    function fish(c, s, fill, dark) {
        c.fillStyle = 'rgba(80, 50, 20, .15)'; ell(c, 0, 5 * s, 10 * s, 3.5 * s); c.fill();
        c.beginPath(); c.moveTo(6 * s, -3 * s); c.lineTo(12 * s, -8 * s); c.lineTo(12 * s, 2 * s); c.closePath(); fs(c, fill);
        ell(c, -2 * s, -3 * s, 9 * s, 5.5 * s); fs(c, fill);
        c.strokeStyle = dark; c.beginPath(); c.moveTo(1 * s, -7 * s); c.quadraticCurveTo(3 * s, -3 * s, 1 * s, 1 * s); c.stroke(); c.strokeStyle = C.line;
        c.fillStyle = C.line; c.beginPath(); c.arc(-6 * s, -4 * s, 1.1 * s, 0, TAU); c.fill();
    }
    function star(c, x, y, r) {
        c.beginPath();
        for (var i = 0; i < 8; i++) { var a = i / 8 * TAU, rr0 = i % 2 ? r * 0.35 : r; c.lineTo(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0); }
        c.closePath(); c.fill();
    }

    /* drawing */
    function draw(now) {
        if (!W) return;
        var sx = 0, sy = 0;
        if (shake > 0) { sx = (Math.random() - 0.5) * 6; sy = (Math.random() - 0.5) * 6; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = '#e9dcc6';
        g.fillRect(0, 0, W, H);
        g.setTransform(dpr * k, 0, 0, dpr * k, dpr * (rx + sx), dpr * (sy - camTop * k));
        var top = camTop, bot = camTop + VH, r0 = roomAt(bot), r1 = roomAt(top), r;
        for (r = r0; r <= r1; r++) floor(r, Math.max(top, -(r + 1) * RL), Math.min(bot, -r * RL));
        for (var i = 0; i < decor.length; i++) rug(decor[i]);
        g.lineJoin = 'round'; g.lineCap = 'round';
        for (i = 0; i < items.length; i++) if (items[i].kind === 'shard') shard(items[i]);
        for (i = 0; i < furn.length; i++) if (furn[i].y < bot + 20 && furn[i].y + furn[i].h > top - 20) furniture(furn[i]);
        for (i = 0; i < picks.length; i++) if (!picks[i].got && picks[i].y > top - 40 && picks[i].y < bot + 40) pickup(picks[i], now);
        /* things that stand up, the vacuums and the cat, back to front */
        var list = [];
        for (i = 0; i < items.length; i++) if (items[i].kind !== 'shard' && !items[i].broken && items[i].y > top - 20 && items[i].y < bot + 90) list.push(items[i]);
        for (i = 0; i < vacs.length; i++) list.push(vacs[i]);
        list.push(cat);
        list.sort(function (p, q) { return p.y - q.y; });
        for (i = 0; i < list.length; i++) {
            var o = list[i];
            if (o === cat) drawCat(now);
            else if (o.vx !== undefined) vacuum(o, now);
            else thing(o, now);
        }
        drawFx();
        drawDot(now);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var low = (cat.y - camTop) / VH;                   /* the cat is falling behind: a warm glow at the bottom */
        if (state === 'run' && low > 0.8) {
            var gr = g.createLinearGradient(0, H - 70, 0, H);
            gr.addColorStop(0, 'rgba(239, 68, 68, 0)'); gr.addColorStop(1, 'rgba(239, 68, 68, ' + Math.min(0.45, (low - 0.8) * 2.2).toFixed(3) + ')');
            g.fillStyle = gr; g.fillRect(0, H - 70, W, 70);
        }
        hud();
    }
    function floor(r, y0, y1) {
        if (y1 <= y0) return;
        var th = ROOMS[r % ROOMS.length], h = y1 - y0, i, y;
        g.fillStyle = th.wall;                              /* the walls beside the room */
        g.fillRect(-rx / k - 4, y0, rx / k + 4, h); g.fillRect(LW, y0, rx / k + 4, h);
        g.fillStyle = th.a; g.fillRect(0, y0, LW, h);
        g.save(); g.beginPath(); g.rect(0, y0, LW, h); g.clip();
        if (th.floor === 'wood') {
            g.strokeStyle = th.ln; g.lineWidth = 1.2; g.beginPath();
            for (y = Math.floor(y0 / 26) * 26; y < y1; y += 26) {
                var rowN = Math.round(y / 26);
                g.moveTo(0, y); g.lineTo(LW, y);
                for (var x = ((rowN * 97) % 150 + 150) % 150; x < LW; x += 150) { g.moveTo(x, y); g.lineTo(x, y + 26); }
            }
            g.stroke();
            g.fillStyle = th.b;
            for (y = Math.floor(y0 / 26) * 26; y < y1; y += 52) g.fillRect(0, y + 2, LW, 4);
        } else if (th.floor === 'tiles') {
            g.fillStyle = th.b;
            for (y = Math.floor(y0 / 44) * 44; y < y1; y += 44) {
                var odd = Math.round(y / 44) & 1;
                for (i = odd; i * 44 < LW; i += 2) g.fillRect(i * 44, y, 44, 44);
            }
        } else if (th.floor === 'carpet') {
            g.fillStyle = th.b;
            for (y = Math.floor(y0 / 30) * 30; y < y1; y += 30) for (i = (Math.round(y / 30) & 1) * 15; i < LW; i += 30) g.fillRect(i + 6, y + 6, 3, 3);
        } else {
            g.strokeStyle = th.ln; g.lineWidth = 1.5; g.beginPath();
            for (y = Math.floor(y0 / 46) * 46; y < y1; y += 46) {
                g.moveTo(0, y); g.lineTo(LW, y);
                for (var xs = (Math.round(y / 46) & 1) * 34; xs < LW; xs += 68) { g.moveTo(xs, y); g.lineTo(xs, y + 46); }
            }
            g.stroke();
        }
        g.restore();
        g.fillStyle = 'rgba(110, 80, 50, .35)';             /* skirting boards */
        g.fillRect(-4, y0, 4, h); g.fillRect(LW, y0, 4, h);
    }
    function rug(d) {
        g.fillStyle = d.c; rrect(g, d.x, d.y, d.w, d.h, 10); g.fill();
        g.strokeStyle = 'rgba(255, 255, 255, .55)'; g.lineWidth = 3; rrect(g, d.x + 10, d.y + 10, d.w - 20, d.h - 20, 6); g.stroke();
        g.setLineDash([3, 6]); rrect(g, d.x + 20, d.y + 20, d.w - 40, d.h - 40, 4); g.stroke(); g.setLineDash([]);
    }
    var FURN = {
        wall:    ['#cdb79a', '#a68a68'],
        sofa:    ['#7aa6c2', '#5b87a3'],
        table:   ['#c08552', '#965f33'],
        counter: ['#eef0f3', '#9ca3af'],
        kitable: ['#d4a373', '#a87545'],
        desk:    ['#9a6845', '#6f4528'],
        shelf:   ['#7c4a2d', '#57311c'],
        bench:   ['#a3b18a', '#7c8a63'],
        planter: ['#9c6644', '#744a2f']
    };
    function furniture(f) {
        var col = FURN[f.kind] || FURN.table, x = f.x, y = f.y, w = f.w, h = f.h, i;
        g.lineWidth = 1.6; g.strokeStyle = C.line;
        if (f.kind === 'wall') {
            g.fillStyle = col[1]; g.fillRect(x, y, w, h);
            g.fillStyle = col[0]; g.fillRect(x, y, w, h - 6);
            g.fillStyle = '#ffffff'; g.globalAlpha = 0.35; g.fillRect(x, y + 2, w, 2); g.globalAlpha = 1;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.moveTo(x, y + h); g.lineTo(x + w, y + h);
            if (x > 0) { g.moveTo(x, y); g.lineTo(x, y + h); }
            if (x + w < LW) { g.moveTo(x + w, y); g.lineTo(x + w, y + h); }
            g.stroke();
            return;
        }
        g.fillStyle = 'rgba(80, 50, 20, .16)'; rrect(g, x + 3, y + 5, w, h, 8); g.fill();
        rrect(g, x, y, w, h, 7); g.fillStyle = col[1]; g.fill(); g.stroke();
        rrect(g, x + 1, y + 1, w - 2, h - 9, 6); g.fillStyle = col[0]; g.fill();
        g.lineWidth = 1.2;
        if (f.kind === 'sofa') {
            g.fillStyle = col[1]; rrect(g, x + 4, y + 3, w - 8, 14, 6); g.fill();
            g.strokeStyle = 'rgba(40, 60, 80, .4)'; g.beginPath();
            for (i = 1; i < 3; i++) { g.moveTo(x + w * i / 3, y + 18); g.lineTo(x + w * i / 3, y + h - 10); }
            g.stroke();
            g.fillStyle = '#f2d16b'; rrect(g, x + w * 0.62, y + 20, 22, 16, 5); g.fill();
        } else if (f.kind === 'table' || f.kind === 'kitable') {
            if (f.kind === 'kitable') {
                g.fillStyle = '#fff7ed'; g.fillRect(x + 14, y + 6, w - 28, h - 20);
                g.fillStyle = 'rgba(220, 38, 38, .35)';
                for (i = x + 14; i < x + w - 20; i += 16) g.fillRect(i, y + 6, 8, h - 20);
            }
            g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + w * 0.3, y + h * 0.4, 7, 0, TAU); g.fill(); g.strokeStyle = C.line; g.stroke();
            g.fillStyle = '#a86b3c'; g.beginPath(); g.arc(x + w * 0.3, y + h * 0.4, 4, 0, TAU); g.fill();
            g.fillStyle = '#e5484d'; g.fillRect(x + w * 0.6, y + h * 0.25, 26, 18); g.strokeRect(x + w * 0.6, y + h * 0.25, 26, 18);
        } else if (f.kind === 'counter') {
            g.fillStyle = '#d6b88f'; rrect(g, x + w * 0.2, y + 10, 40, 26, 4); g.fill(); g.stroke();
            g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(x + w * 0.65, y + h * 0.4, 9, 0, TAU); g.fill(); g.stroke();
            g.fillStyle = '#ef4444'; g.beginPath(); g.arc(x + w * 0.65 + 9, y + h * 0.4 + 3, 6, 0, TAU); g.fill(); g.stroke();
        } else if (f.kind === 'desk') {
            g.fillStyle = '#ffffff'; g.save(); g.translate(x + w * 0.35, y + h * 0.4); g.rotate(-0.15); g.fillRect(-14, -10, 28, 20); g.strokeRect(-14, -10, 28, 20); g.restore();
            g.strokeStyle = '#facc15'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w * 0.6, y + h * 0.3); g.lineTo(x + w * 0.6 + 24, y + h * 0.5); g.stroke();
        } else if (f.kind === 'shelf') {
            var cols = ['#e5484d', '#3b82f6', '#f2d16b', '#5aa452', '#8f6fb3', '#fb923c'];
            for (i = 0, x = f.x + 6; x < f.x + w - 12; i++) { var bw = 8 + (i * 7) % 6; g.fillStyle = cols[i % cols.length]; g.fillRect(x, y + 6, bw - 1, h - 20); x += bw; }
        } else if (f.kind === 'bench') {
            g.strokeStyle = 'rgba(60, 70, 40, .45)'; g.beginPath();
            for (i = y + 12; i < y + h - 10; i += 11) { g.moveTo(x + 4, i); g.lineTo(x + w - 4, i); }
            g.stroke();
        } else if (f.kind === 'planter') {
            g.fillStyle = '#5aa452'; g.strokeStyle = C.line;
            for (i = x + 16; i < x + w - 8; i += 24) { g.beginPath(); g.arc(i, y + h * 0.4 + ((i * 7) % 6), 12, 0, TAU); g.fill(); g.stroke(); }
        }
    }
    function thing(it, now) {
        var s = sprite(it.kind);
        if (it.wob > 0 && !api.reducedMotion) {
            g.save(); g.translate(it.x, it.y); g.rotate(Math.sin(now / 40) * 0.12 * Math.min(1, it.wob * 2));
            g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); g.restore();
        } else g.drawImage(s.c, it.x - s.ax, it.y - s.ay, s.w, s.h);
    }
    function shard(it) {
        g.fillStyle = it.c; g.strokeStyle = C.line; g.lineWidth = 1;
        g.beginPath();
        g.moveTo(it.x + Math.cos(it.a) * it.s, it.y + Math.sin(it.a) * it.s);
        g.lineTo(it.x + Math.cos(it.a + 2.2) * it.s, it.y + Math.sin(it.a + 2.2) * it.s);
        g.lineTo(it.x + Math.cos(it.a + 4) * it.s * 0.6, it.y + Math.sin(it.a + 4) * it.s * 0.6);
        g.closePath(); g.fill(); g.stroke();
    }
    function pickup(p, now) {
        var s = sprite(p.kind), bob = api.reducedMotion ? 0 : Math.sin(now / 260 + p.ph) * 2;
        g.drawImage(s.c, p.x - s.ax, p.y - s.ay + bob, s.w, s.h);
    }
    function vacuum(v, now) {
        g.lineWidth = 1.6; g.strokeStyle = C.line;
        g.fillStyle = 'rgba(80, 50, 20, .18)'; ell(g, v.x + 2, v.y + 4, v.r + 2, v.r * 0.8); g.fill();
        g.beginPath(); g.arc(v.x, v.y, v.r, 0, TAU); g.fillStyle = '#4b5563'; g.fill(); g.stroke();
        g.beginPath(); g.arc(v.x, v.y, v.r * 0.68, 0, TAU); g.fillStyle = '#9ca3af'; g.fill();
        g.fillStyle = (Math.floor(now / 400) & 1) || api.reducedMotion ? '#4ade80' : '#166534';
        g.beginPath(); g.arc(v.x + (v.vx > 0 ? 7 : -7), v.y - 3, 2.6, 0, TAU); g.fill();
        g.strokeStyle = '#1f2937'; g.lineWidth = 2;
        var a = api.reducedMotion ? 0 : v.ph * 14;          /* the side brush */
        g.beginPath();
        for (var i = 0; i < 3; i++) { var b = a + i * 2.1, bx = v.x + (v.vx > 0 ? 12 : -12), by = v.y + 10; g.moveTo(bx, by); g.lineTo(bx + Math.cos(b) * 7, by + Math.sin(b) * 7); }
        g.stroke();
    }
    /* the cat seen from above, facing its heading: tail, paws, a striped body and the round head with ears */
    function drawCat(now) {
        if (C.dog) return drawDog();
        var blink = inv > 0 && state === 'run' && Math.floor(inv * 10) % 2;
        g.save();
        g.translate(cat.x, cat.y);
        g.fillStyle = 'rgba(80, 50, 20, .2)'; ell(g, 2, 5, 17, 21); g.fill();
        if (soft > 0) {
            g.strokeStyle = soft < 2 && Math.floor(soft * 6) % 2 ? 'rgba(74, 222, 128, .3)' : 'rgba(74, 222, 128, .8)';
            g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.stroke();
        }
        if (blink) g.globalAlpha = 0.45;
        g.rotate(cat.ang);
        var moving = state === 'run' ? 1 : 0, st = api.reducedMotion ? 0 : Math.sin(cat.step) * 4 * moving;
        var sw = api.reducedMotion ? 0.3 : Math.sin(cat.tail) * (state === 'run' ? 0.7 : 0.4);
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(0, 14); g.quadraticCurveTo(sw * 14, 26, sw * 22, 36);
        g.strokeStyle = C.line; g.lineWidth = 8; g.stroke();
        g.strokeStyle = C.tail; g.lineWidth = 5.4; g.stroke();
        g.strokeStyle = C.stripe; g.lineWidth = 5.4; g.beginPath(); g.moveTo(sw * 19, 31); g.lineTo(sw * 22, 36); g.stroke();
        g.lineWidth = 1.5; g.strokeStyle = C.line; g.fillStyle = C.fur;
        [[-9, 9 + st], [9, 9 - st], [-9, -7 - st], [9, -7 + st]].forEach(function (p) { ell(g, p[0], p[1], 4.4, 5.4); g.fill(); g.stroke(); });
        ell(g, 0, 2, 11.5, 16); g.fillStyle = C.fur; g.fill(); g.stroke();
        g.strokeStyle = C.stripe; g.lineWidth = 2.2; g.beginPath();
        g.moveTo(-8, -1); g.quadraticCurveTo(0, 2, 8, -1); g.moveTo(-9, 5); g.quadraticCurveTo(0, 8, 9, 5); g.moveTo(-7, 11); g.quadraticCurveTo(0, 14, 7, 11);
        g.stroke();
        g.lineWidth = 1.5; g.strokeStyle = C.line;
        g.fillStyle = C.fur; g.beginPath();                  /* ears */
        g.moveTo(-9, -15); g.lineTo(-10, -27); g.lineTo(-2, -21);
        g.moveTo(9, -15); g.lineTo(10, -27); g.lineTo(2, -21);
        g.fill(); g.stroke();
        g.fillStyle = '#ffb3c4'; g.beginPath(); g.moveTo(-8, -18); g.lineTo(-8.6, -24); g.lineTo(-4.5, -21); g.moveTo(8, -18); g.lineTo(8.6, -24); g.lineTo(4.5, -21); g.fill();
        g.beginPath(); g.arc(0, -16, 10.5, 0, TAU); g.fillStyle = C.head; g.fill(); g.stroke();
        g.strokeStyle = C.stripe; g.lineWidth = 1.6; g.beginPath();
        g.moveTo(-3, -9); g.lineTo(-2.4, -13); g.moveTo(0, -8.5); g.lineTo(0, -13); g.moveTo(3, -9); g.lineTo(2.4, -13); g.stroke();
        g.fillStyle = C.cream; ell(g, 0, -23, 4.6, 3); g.fill();
        g.fillStyle = C.iris; ell(g, -4.4, -19.5, 2.3, 2.6); g.fill(); ell(g, 4.4, -19.5, 2.3, 2.6); g.fill();
        g.fillStyle = '#1f1610'; ell(g, -4.4, -20, 1, 2.1); g.fill(); ell(g, 4.4, -20, 1, 2.1); g.fill();
        g.fillStyle = '#ff8fa3'; g.beginPath(); g.arc(0, -25.2, 1.5, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(59, 42, 30, .55)'; g.lineWidth = 0.8; g.beginPath();
        g.moveTo(-4, -23.5); g.lineTo(-13, -25); g.moveTo(-4, -22.5); g.lineTo(-13, -21.5);
        g.moveTo(4, -23.5); g.lineTo(13, -25); g.moveTo(4, -22.5); g.lineTo(13, -21.5); g.stroke();
        g.restore();
        g.globalAlpha = 1;
    }
    /* the dog in dog mode, the same size: a wagging tail, plain body, round head with a snout, a dark nose and floppy ears */
    function drawDog() {
        var blink = inv > 0 && state === 'run' && Math.floor(inv * 10) % 2;
        g.save();
        g.translate(cat.x, cat.y);
        g.fillStyle = 'rgba(80, 50, 20, .2)'; ell(g, 2, 5, 17, 21); g.fill();
        if (soft > 0) {
            g.strokeStyle = soft < 2 && Math.floor(soft * 6) % 2 ? 'rgba(74, 222, 128, .3)' : 'rgba(74, 222, 128, .8)';
            g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.stroke();
        }
        if (blink) g.globalAlpha = 0.45;
        g.rotate(cat.ang);
        var moving = state === 'run' ? 1 : 0, st = api.reducedMotion ? 0 : Math.sin(cat.step) * 4 * moving;
        var sw = api.reducedMotion ? 0.3 : Math.sin(cat.tail * 2.6) * (state === 'run' ? 0.8 : 0.5);   /* a quick wag */
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(0, 14); g.quadraticCurveTo(sw * 6, 22, sw * 13, 28);
        g.strokeStyle = C.line; g.lineWidth = 9; g.stroke();
        g.strokeStyle = C.tail; g.lineWidth = 6.4; g.stroke();
        g.lineWidth = 1.5; g.strokeStyle = C.line; g.fillStyle = C.fur;
        [[-9, 9 + st], [9, 9 - st], [-9, -7 - st], [9, -7 + st]].forEach(function (p) { ell(g, p[0], p[1], 4.4, 5.4); g.fill(); g.stroke(); });
        ell(g, 0, 2, 11.5, 16); g.fillStyle = C.fur; g.fill(); g.stroke();
        g.fillStyle = C.light; ell(g, 0, 3, 6, 9.5); g.fill();
        g.beginPath(); g.arc(0, -15, 10.5, 0, TAU); g.fillStyle = C.head; g.fill(); g.stroke();
        g.fillStyle = C.cream; ell(g, 0, -24, 5.2, 4.6); g.fill(); g.stroke();      /* the snout */
        g.fillStyle = C.nose; ell(g, 0, -27.6, 2.8, 2); g.fill();
        g.fillStyle = 'rgba(255, 255, 255, .55)'; ell(g, -0.9, -28.1, 0.9, 0.5); g.fill();
        g.fillStyle = C.iris; ell(g, -4.4, -18.2, 2.2, 2.3); g.fill(); ell(g, 4.4, -18.2, 2.2, 2.3); g.fill();
        g.fillStyle = '#1f1610'; ell(g, -4.4, -18.4, 1.4, 1.5); g.fill(); ell(g, 4.4, -18.4, 1.4, 1.5); g.fill();
        g.fillStyle = C.ear; g.strokeStyle = C.line; g.lineWidth = 1.5;
        [-1, 1].forEach(function (sd) {                    /* floppy ears hanging down the sides of the head */
            g.save(); g.translate(sd * 10, -12); g.rotate(sd * 0.25);
            ell(g, 0, 0, 3.8, 7.5); g.fill(); g.stroke();
            g.restore();
        });
        g.restore();
        g.globalAlpha = 1;
    }
    function drawDot(now) {
        var x = dot.x, y = dot.y + camTop, p = api.reducedMotion ? 0 : Math.sin(now / 90) * 1.5;
        g.fillStyle = 'rgba(255, 40, 70, .22)'; g.beginPath(); g.arc(x, y, 12 + p, 0, TAU); g.fill();
        g.fillStyle = '#ff2d55'; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill();
        g.fillStyle = '#ffd6de'; g.beginPath(); g.arc(x - 1, y - 1, 2, 0, TAU); g.fill();
    }
    function drawFx() {
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            g.globalAlpha = 1 - p.t / p.life;
            g.fillStyle = p.c;
            if (p.kind) {
                g.strokeStyle = C.line; g.lineWidth = 1;
                g.beginPath(); g.moveTo(p.x + Math.cos(p.a) * p.r, p.y + Math.sin(p.a) * p.r);
                g.lineTo(p.x + Math.cos(p.a + 2.3) * p.r, p.y + Math.sin(p.a + 2.3) * p.r);
                g.lineTo(p.x + Math.cos(p.a + 4.2) * p.r, p.y + Math.sin(p.a + 4.2) * p.r); g.closePath(); g.fill(); g.stroke();
            } else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
        }
        g.globalAlpha = 1;
        g.font = '800 15px system-ui, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3.5; g.lineJoin = 'round'; g.strokeStyle = '#fff';
        for (i = 0; i < texts.length; i++) {
            var t = texts[i], y = t.y - (api.reducedMotion ? 0 : t.t * 34);
            g.globalAlpha = Math.min(1, (1 - t.t) * 3);
            g.strokeText(t.s, t.x, y);
            g.fillStyle = t.c; g.fillText(t.s, t.x, y);
        }
        g.globalAlpha = 1;
    }
    function heart(x, y, s, full) {
        g.beginPath();
        g.moveTo(x, y + s * 0.35);
        g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35);
        g.bezierCurveTo(x - s * 0.5, y + s * 0.65, x, y + s * 0.8, x, y + s);
        g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.65, x + s * 0.5, y + s * 0.35);
        g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
        g.fillStyle = full ? '#f43f5e' : 'rgba(255, 255, 255, .7)'; g.fill();
        g.strokeStyle = full ? '#9f1239' : 'rgba(100, 80, 60, .5)'; g.lineWidth = 1.5; g.stroke();
    }
    /* lives, the multiplier with its streak, soft paws time and the room name, in screen pixels */
    function hud() {
        var x = 12, y = 10, i;
        g.fillStyle = 'rgba(255, 255, 255, .82)';
        rrect(g, x - 4, y - 4, 22 * L.lives + 92, 30, 10); g.fill();
        for (i = 0; i < L.lives; i++) heart(x + 10 + i * 22, y + 2, 18, i < lives);
        var mx = x + 22 * L.lives + 8;
        g.font = '800 16px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillStyle = mult > 1 ? '#d6336c' : '#5b6b80';
        g.fillText('x' + mult, mx, y + 11);
        for (i = 0; i < STREAK; i++) {
            g.fillStyle = mult >= L.mult ? '#d6336c' : i < pips ? '#f59e0b' : 'rgba(91, 107, 128, .25)';
            g.beginPath(); g.arc(mx + 32 + i * 9, y + 11, 3, 0, TAU); g.fill();
        }
        if (soft > 0) {
            var bw = 110, bx = x - 4;
            g.fillStyle = 'rgba(255, 255, 255, .82)'; rrect(g, bx, y + 32, bw, 18, 8); g.fill();
            g.fillStyle = '#86efac'; rrect(g, bx + 3, y + 35, Math.max(6, (bw - 6) * soft / 7), 12, 6); g.fill();
            g.fillStyle = '#166534'; g.font = '700 11px system-ui, sans-serif'; g.textAlign = 'center';
            g.fillText('Soft paws', bx + bw / 2, y + 41.5);
        }
        if (banner > 0) {
            var a = Math.min(1, banner * 2, (2.4 - banner) * 4), name = ROOMS[roomShown % ROOMS.length].name;
            g.globalAlpha = a;
            g.font = '800 22px system-ui, sans-serif'; g.textAlign = 'center';
            g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = '#fff';
            g.strokeText(name, W / 2, 74);
            g.fillStyle = '#1e3a8a'; g.fillText(name, W / 2, 74);
            g.globalAlpha = 1;
        }
    }

    fit(api.size());
    api.onResize(fit);
    api.score(0);
    var stop = api.loop(function (dt, now) {
        update(dt);
        updateFx(dt);
        draw(now);
        if (state === 'over' && (overT += dt) > 1.2) stop();
    });
});
