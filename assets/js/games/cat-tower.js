/* Cat Tower Stack: a big cat paw carries furniture pieces back and forth above a cat tree; tap, click or press Space
   to let go. The pieces (tree shelves, cushions, cardboard boxes, scratching posts, baskets, cat cubes) are small rigid
   bodies in an own box physics (impulse solver with warm starting, in the style of Box2D-lite), so an offset stack
   leans, slides and tumbles for real. A drop centered on the piece below is "purrfect": it snaps straight, calms the
   wobble and grows a streak bonus. Every few pieces a cat hops onto the tower; cats climb up when a piece covers them
   and leap away (unharmed) when their piece tips. A piece that falls off costs a life (one per tumble). Pieces well
   below the top settle for good, so only the top of the tower can collapse, and the paw speeds up as the tower grows.
   Score = highest resting height in cm + purrfect bonuses (10 x streak, at most 50 a drop) + 25 per cat that hops on.
   Easy: wide base, slow paw, 5 lives and a drop guide. Hard: narrow base, fast paw, 2 lives, more scratching posts.
   Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('cat-tower', function (api) {
    'use strict';
    api.css(
        '.ctw { position: absolute; inset: 0; cursor: pointer; touch-action: none; }' +
        '.ctw canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.ctw-hint { position: absolute; left: 50%; top: 13%; transform: translateX(-50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 6px 18px rgba(120, 72, 20, .14); color: #7a3e12; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.ctw-hint small { display: block; margin-top: 3px; color: #8a6a4f; font-weight: 600; font-size: .82rem; }' +
        '.ctw-hint[hidden] { display: none; }');

    /* difficulty: lives, base width (cm), paw speed (cm/s), its growth per placed piece and cap (times the start),
       purrfect tolerance (cm), how many top pieces stay loose, a cat every n pieces, drop guide, piece mix */
    var LV = {
        easy:   { lives: 5, base: 150, speed: 80,  ramp: 0.035, cap: 3.2, tol: 7,   keep: 6, catEvery: 3, guide: true,
                  mix: { plank: 4, cushion: 3, box: 3, post: 1, basket: 3, cube: 3 } },
        normal: { lives: 3, base: 128, speed: 105, ramp: 0.04,  cap: 3.6, tol: 5,   keep: 7, catEvery: 4, guide: false,
                  mix: { plank: 3, cushion: 3, box: 3, post: 2, basket: 3, cube: 2 } },
        hard:   { lives: 2, base: 108, speed: 135, ramp: 0.045, cap: 4,   tol: 3.5, keep: 8, catEvery: 5, guide: false,
                  mix: { plank: 3, cushion: 2, box: 2, post: 3, basket: 2, cube: 2 } }
    };
    var LVL = api.level();
    var L = LV[LVL] || LV.normal;
    /* pieces in cm: physics box size, density, friction */
    var KINDS = {
        plank:   { w: 112, h: 14, dens: 1.0,  fric: 0.8 },
        cushion: { w: 74,  h: 22, dens: 0.55, fric: 0.95 },
        box:     { w: 56,  h: 46, dens: 0.6,  fric: 0.7 },
        post:    { w: 30,  h: 74, dens: 1.1,  fric: 0.8 },
        basket:  { w: 68,  h: 30, dens: 0.7,  fric: 0.8 },
        cube:    { w: 46,  h: 42, dens: 0.8,  fric: 0.75 }
    };
    var CATS = [
        { name: 'Mochi',   fur: '#f4a259', mark: '#d9803a', tabby: true },
        { name: 'Pepper',  fur: '#4a4a55', mark: '#33333b', tabby: false },
        { name: 'Biscuit', fur: '#f1d9a7', mark: '#ddbb7c', tabby: true },
        { name: 'Luna',    fur: '#9aa5b1', mark: '#7c8794', tabby: true },
        { name: 'Tofu',    fur: '#fbf8f2', mark: '#e9a66b', patches: true },
        { name: 'Nori',    fur: '#2f2f36', mark: '#2f2f36', socks: true },
        { name: 'Ziggy',   fur: '#e8935a', mark: '#fbf8f2', patches: true },
        { name: 'Olive',   fur: '#b8a794', mark: '#968572', tabby: true }
    ];
    var G = 1500, STEP = 1 / 120, ITER = 10, SLOP = 0.4, BIAS = 0.2, MAXBIAS = 80, FLOOR = -90, TAU = 6.2832;
    var rm = api.reducedMotion;

    var wrap = document.createElement('div');
    wrap.className = 'ctw';
    wrap.innerHTML = '<canvas></canvas><div class="ctw-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.ctw-hint');
    hint.textContent = api.touch ? 'Tap to drop the piece' : 'Click or press Space to drop';
    var small = document.createElement('small');
    small.textContent = 'Stack it high, center drops are purrfect';
    hint.appendChild(small);

    var W = 0, H = 0, S = 1;
    var bodies = [], arbs = {}, uid = 0, ord = 0, acc = 0, t = 0;
    var cats = [], parts = [], texts = [], ghosts = [];
    var state = 'play', lives = L.lives, placed = 0, dropped = 0, streak = 0, bestStreak = 0, perfects = 0;
    var bonus = 0, maxH = 0, curTop = 0, pawTop = 0, frozenTop = 0, catsIn = 0, catPick = Math.floor(Math.random() * CATS.length);
    var held = null, active = null, reload = 0.2, pawP = -0.6, pawDir = 1, pawX = 0, pawY = 175, pawOpen = 0;
    var pawA = L.base / 2 + 70, camTop = 0, camInit = false, nextKind = null, lastKind = null;
    var lastMiss = -9, lastWow = -9, endAt = 0, shake = 0, catWait = 0, catQueue = 0;
    var sway = { x: 0, v: 0 }, shown = -1;

    function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    /* rigid boxes */
    function newBody(kind, x, y, w, h, dens, fric, stat) {
        var m = dens * w * h * 0.001;
        return { id: ++uid, ord: ord++, kind: kind, x: x, y: y, a: 0, vx: 0, vy: 0, av: 0, hw: w / 2, hh: h / 2,
                 r: Math.sqrt(w * w + h * h) / 2, fric: fric, m: m, im: stat ? 0 : 1 / m, iI: stat ? 0 : 12 / (m * (w * w + h * h)),
                 stat: stat, landed: stat, ghost: false, rest: 0, squash: 0, fade: 1, floorT: 0, seed: Math.random() };
    }
    function freeze(b) { b.stat = true; b.im = 0; b.iI = 0; b.vx = b.vy = b.av = 0; }
    function topOf(b) { return b.y + Math.abs(Math.sin(b.a)) * b.hw + Math.abs(Math.cos(b.a)) * b.hh; }
    function lowOf(b) { return b.y - Math.abs(Math.sin(b.a)) * b.hw - Math.abs(Math.cos(b.a)) * b.hh; }

    /* box against box: separating axes, then the incident edge clipped against the reference face (Box2D-lite).
       Returns up to two contacts; the normal points from A to B. */
    function incident(B, c, s, nx, ny) {
        var lx = -(c * nx + s * ny), ly = -(-s * nx + c * ny), hx = B.hw, hy = B.hh, v;
        if (Math.abs(lx) > Math.abs(ly)) v = lx > 0 ? [hx, -hy, hx, hy] : [-hx, hy, -hx, -hy];
        else v = ly > 0 ? [hx, hy, -hx, hy] : [-hx, -hy, hx, -hy];
        return [B.x + c * v[0] - s * v[1], B.y + s * v[0] + c * v[1], B.x + c * v[2] - s * v[3], B.y + s * v[2] + c * v[3]];
    }
    function clipSeg(p, nx, ny, off) {
        if (!p) return null;
        var d0 = nx * p[0] + ny * p[1] - off, d1 = nx * p[2] + ny * p[3] - off, o = [];
        if (d0 <= 0) o.push(p[0], p[1]);
        if (d1 <= 0) o.push(p[2], p[3]);
        if (d0 * d1 < 0) { var k = d0 / (d0 - d1); o.push(p[0] + k * (p[2] - p[0]), p[1] + k * (p[3] - p[1])); }
        return o.length < 4 ? null : o;
    }
    function collide(A, B) {
        var cA = Math.cos(A.a), sA = Math.sin(A.a), cB = Math.cos(B.a), sB = Math.sin(B.a);
        var dx = B.x - A.x, dy = B.y - A.y;
        var dAx = cA * dx + sA * dy, dAy = -sA * dx + cA * dy, dBx = cB * dx + sB * dy, dBy = -sB * dx + cB * dy;
        var a11 = Math.abs(cA * cB + sA * sB), a12 = Math.abs(-cA * sB + sA * cB), a21 = Math.abs(-sA * cB + cA * sB), a22 = a11;
        var faX = Math.abs(dAx) - A.hw - (a11 * B.hw + a12 * B.hh), faY = Math.abs(dAy) - A.hh - (a21 * B.hw + a22 * B.hh);
        if (faX > 0 || faY > 0) return null;
        var fbX = Math.abs(dBx) - (a11 * A.hw + a21 * A.hh) - B.hw, fbY = Math.abs(dBy) - (a12 * A.hw + a22 * A.hh) - B.hh;
        if (fbX > 0 || fbY > 0) return null;
        var axis = 0, sep = faX, nx = dAx > 0 ? cA : -cA, ny = dAx > 0 ? sA : -sA;
        if (faY > 0.95 * sep + 0.01 * A.hh) { axis = 1; sep = faY; nx = dAy > 0 ? -sA : sA; ny = dAy > 0 ? cA : -cA; }
        if (fbX > 0.95 * sep + 0.01 * B.hw) { axis = 2; sep = fbX; nx = dBx > 0 ? cB : -cB; ny = dBx > 0 ? sB : -sB; }
        if (fbY > 0.95 * sep + 0.01 * B.hh) { axis = 3; sep = fbY; nx = dBy > 0 ? -sB : sB; ny = dBy > 0 ? cB : -cB; }
        var fnx, fny, front, snx, sny, side, ext, inc;
        if (axis < 2) {
            fnx = nx; fny = ny;
            if (axis === 0) { front = A.x * fnx + A.y * fny + A.hw; snx = -sA; sny = cA; ext = A.hh; }
            else { front = A.x * fnx + A.y * fny + A.hh; snx = cA; sny = sA; ext = A.hw; }
            side = A.x * snx + A.y * sny;
            inc = incident(B, cB, sB, fnx, fny);
        } else {
            fnx = -nx; fny = -ny;
            if (axis === 2) { front = B.x * fnx + B.y * fny + B.hw; snx = -sB; sny = cB; ext = B.hh; }
            else { front = B.x * fnx + B.y * fny + B.hh; snx = cB; sny = sB; ext = B.hw; }
            side = B.x * snx + B.y * sny;
            inc = incident(A, cA, sA, fnx, fny);
        }
        var cp = clipSeg(clipSeg(inc, -snx, -sny, -side + ext), snx, sny, side + ext);
        if (!cp) return null;
        var out = [];
        for (var i = 0; i < 4; i += 2) {
            var s = fnx * cp[i] + fny * cp[i + 1] - front;
            if (s <= 0) out.push({ x: cp[i] - s * fnx, y: cp[i + 1] - s * fny, nx: nx, ny: ny, sep: s, pn: 0, pt: 0 });
        }
        return out.length ? out : null;
    }
    function push(A, B, c, px, py) {
        A.vx -= A.im * px; A.vy -= A.im * py; A.av -= A.iI * (c.r1x * py - c.r1y * px);
        B.vx += B.im * px; B.vy += B.im * py; B.av += B.iI * (c.r2x * py - c.r2y * px);
    }
    function step(h) {
        var inv = 1 / h, next = {}, i, j, k, landings = [];
        for (i = 0; i < bodies.length; i++) {
            var A = bodies[i];
            if (A.ghost) continue;
            for (j = i + 1; j < bodies.length; j++) {
                var B = bodies[j];
                if (B.ghost || (A.stat && B.stat)) continue;
                var dx = B.x - A.x, dy = B.y - A.y, rr = A.r + B.r;
                if (dx * dx + dy * dy > rr * rr) continue;
                var cs = collide(A, B);
                if (!cs) continue;
                var key = A.id + ':' + B.id, old = arbs[key];
                if (old) cs.forEach(function (c) {           /* warm start: reuse impulses of contacts nearby */
                    for (var q = 0; q < old.cs.length; q++) {
                        var o = old.cs[q];
                        if ((o.x - c.x) * (o.x - c.x) + (o.y - c.y) * (o.y - c.y) < 9) { c.pn = o.pn; c.pt = o.pt; break; }
                    }
                });
                next[key] = { A: A, B: B, cs: cs, f: Math.sqrt(A.fric * B.fric) };
                if (!A.landed) landings.push([A, B]); else if (!B.landed) landings.push([B, A]);
            }
        }
        arbs = next;
        landings.forEach(function (p) { if (!p[0].landed) land(p[0], p[1]); });
        for (i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            if (b.stat || b.ghost) continue;
            b.vy -= G * h;
            b.av *= 0.996;
        }
        var list = [];
        for (k in arbs) list.push(arbs[k]);
        list.forEach(function (ar) {
            var A = ar.A, B = ar.B;
            ar.cs.forEach(function (c) {
                c.r1x = c.x - A.x; c.r1y = c.y - A.y; c.r2x = c.x - B.x; c.r2y = c.y - B.y;
                var nx = c.nx, ny = c.ny, tx = ny, ty = -nx;
                var rn1 = c.r1x * nx + c.r1y * ny, rn2 = c.r2x * nx + c.r2y * ny;
                var kn = A.im + B.im + A.iI * (c.r1x * c.r1x + c.r1y * c.r1y - rn1 * rn1) + B.iI * (c.r2x * c.r2x + c.r2y * c.r2y - rn2 * rn2);
                var rt1 = c.r1x * tx + c.r1y * ty, rt2 = c.r2x * tx + c.r2y * ty;
                var kt = A.im + B.im + A.iI * (c.r1x * c.r1x + c.r1y * c.r1y - rt1 * rt1) + B.iI * (c.r2x * c.r2x + c.r2y * c.r2y - rt2 * rt2);
                c.mn = 1 / kn; c.mt = 1 / kt;
                c.bias = Math.min(MAXBIAS, -BIAS * inv * Math.min(0, c.sep + SLOP));
                push(A, B, c, c.pn * nx + c.pt * tx, c.pn * ny + c.pt * ty);
            });
        });
        for (var it = 0; it < ITER; it++) {
            for (k = 0; k < list.length; k++) {
                var ar = list[k], A2 = ar.A, B2 = ar.B;
                for (j = 0; j < ar.cs.length; j++) {
                    var c = ar.cs[j], nx = c.nx, ny = c.ny, tx = ny, ty = -nx;
                    var dvx = B2.vx - B2.av * c.r2y - A2.vx + A2.av * c.r1y, dvy = B2.vy + B2.av * c.r2x - A2.vy - A2.av * c.r1x;
                    var dpn = c.mn * (-(dvx * nx + dvy * ny) + c.bias), p0 = c.pn;
                    c.pn = Math.max(p0 + dpn, 0); dpn = c.pn - p0;
                    push(A2, B2, c, dpn * nx, dpn * ny);
                    dvx = B2.vx - B2.av * c.r2y - A2.vx + A2.av * c.r1y; dvy = B2.vy + B2.av * c.r2x - A2.vy - A2.av * c.r1x;
                    var dpt = c.mt * -(dvx * tx + dvy * ty), mx = ar.f * c.pn, t0 = c.pt;
                    c.pt = clamp(t0 + dpt, -mx, mx); dpt = c.pt - t0;
                    push(A2, B2, c, dpt * tx, dpt * ty);
                }
            }
        }
        for (i = 0; i < bodies.length; i++) {
            b = bodies[i];
            if (b.stat || b.ghost) continue;
            b.av = clamp(b.av, -18, 18);
            b.vy = Math.max(b.vy, -1400);
            b.x += b.vx * h; b.y += b.vy * h; b.a += b.av * h;
        }
    }

    /* game rules */
    var base = newBody('base', 0, -8, L.base, 16, 1, 0.8, true);
    bodies.push(base);

    function pickKind() {
        if (!dropped && !nextKind) return Math.random() < 0.5 ? 'box' : 'plank';
        var tot = 0, k, mix = L.mix;
        for (k in mix) if (!(k === 'post' && lastKind === 'post')) tot += mix[k];
        var r = Math.random() * tot;
        for (k in mix) {
            if (k === 'post' && lastKind === 'post') continue;
            if ((r -= mix[k]) < 0) return k;
        }
        return 'box';
    }
    function spawnHeld() {
        var k = nextKind || pickKind();
        lastKind = k;
        nextKind = pickKind();
        held = { kind: k, t: 0 };
    }
    function drop() {
        if (state !== 'play' || !held || held.t < 0.6) return;
        hint.hidden = true;
        var k = KINDS[held.kind];
        var b = newBody(held.kind, pawX, pawY - 4 - k.h / 2, k.w, k.h, k.dens, k.fric, false);
        b.vy = -40;
        bodies.push(b);
        active = b; held = null; pawOpen = 1; dropped++;
        api.sfx('move');
    }
    function land(b, other) {
        b.landed = true;
        if (b === active) { active = null; reload = 0.3; }
        placed++;
        b.squash = rm ? 0 : 1;
        var dx = b.x - other.x, flat = Math.abs(other.a) < 0.12, onTop = b.y > other.y + other.hh * 0.5;
        if (flat && onTop && Math.abs(dx) <= L.tol) {
            b.x = other.x; b.a = other.a; b.vx = other.vx; b.av = 0;
            streak++; perfects++; bestStreak = Math.max(bestStreak, streak);
            var add = 10 * Math.min(streak, 5);
            bonus += add;
            sway.v *= 0.3;
            text(b.x, topOf(b) + 12, streak > 1 ? 'Purrfect x' + streak : 'Purrfect!', '#c2410c', 1.3);
            text(b.x, topOf(b) - 4, '+' + add, '#7a3e12', 1);
            sparkle(b.x, b.y - b.hh);
            api.sfx(streak >= 3 ? 'pop' : 'point');
            if (streak === 3 || streak === 6) api.cat('happy');
        } else {
            streak = 0;
            if (!rm) sway.v += clamp(dx / Math.max(20, other.hw), -1.2, 1.2) * 22 + (Math.random() - 0.5) * 8;
            api.sfx('tap');
        }
        dust(b.x - b.hw, b.y - b.hh); dust(b.x + b.hw, b.y - b.hh);
        if (!rm) shake = Math.max(shake, 0.08);
        if (placed % L.catEvery === 0) { catQueue++; catWait = Math.max(catWait, 0.7); }
        showScore();
    }
    function score() { return Math.max(0, Math.round(maxH) + bonus); }
    function showScore() { var s = score(); if (s !== shown) { shown = s; api.score(s); } }
    function loseLife(b) {
        ghosts.push(b);
        b.ghost = true;
        if (b === active) { active = null; reload = 0.4; }
        streak = 0;
        if (t - lastMiss < 1.6 || state !== 'play') return;   /* one life per tumble */
        lastMiss = t;
        lives--;
        api.sfx('hit');
        api.cat('sad');
        if (!rm) shake = 0.35;
        var tx = clamp(b.x, -pawA + 30, pawA - 30), ty = Math.max(b.y, curTop + 20);
        text(tx, ty, b.landed ? 'Tumble!' : 'Missed!', '#b91c1c', 1.2);
        if (lives <= 0) { state = 'ending'; endAt = t + 1.6; held = null; }
        else api.say(lives === 1 ? 'Last life, careful!' : 'Oops, steady paws!', 1300);
    }
    function finish() {
        state = 'over';
        var s = score(), best = api.best();
        var m = (maxH / 100).toFixed(2);
        api.end({ score: s, win: best === null || s > best,
                  text: 'Your cat tower reached ' + m + ' m!\n' + placed + ' pieces, ' + perfects + ' purrfect' +
                        (catsIn ? ', ' + catsIn + (catsIn === 1 ? ' cat' : ' cats') + ' hopped on' : '') + '\nScore: ' + s });
    }

    /* cats */
    function seat(p, lx) {
        var c = Math.cos(p.a), s = Math.sin(p.a);
        return { x: p.x + c * lx - s * p.hh, y: p.y + s * lx + c * p.hh, a: p.a };
    }
    function topPiece() {
        var best = null, bt = -1e9;
        bodies.forEach(function (b) {
            if (b.ghost || !b.landed || (!b.stat && b.rest < 0.25) || Math.abs(b.a) > 0.25) return;
            var tp = topOf(b);
            if (tp > bt) { bt = tp; best = b; }
        });
        return best;
    }
    function freeSpot(p) {
        var room = Math.max(0, p.hw - 10);
        for (var i = 0; i < 10; i++) {
            var lx = (Math.random() * 2 - 1) * room, ok = true;
            cats.forEach(function (c) { if (c.st !== 'flee' && c.p === p && Math.abs(c.lx - lx) < 20) ok = false; });
            if (ok) return lx;
        }
        return null;
    }
    function spawnCat() {
        var p = topPiece();
        if (!p || cats.filter(function (c) { return c.st !== 'flee'; }).length >= 7) return;
        var lx = freeSpot(p);
        if (lx === null) return;
        var side = Math.random() < 0.5 ? -1 : 1, look = CATS[catPick++ % CATS.length];
        var s = seat(p, lx), x0 = side * (W / 2 / S + 30);
        cats.push({ p: p, lx: lx, st: 'hop', t: rm ? 1 : 0, dur: 0.8, x0: x0, y0: s.y - 70, x: x0, y: s.y - 70, a: 0,
                    look: look, face: -side, blink: Math.random() * 4, fade: rm ? 0 : 1 });
        catsIn++;
        bonus += 25;
        showScore();
        api.sfx('pop');
        api.say(look.name + ' hopped on!', 1500);
        api.cat('happy');
    }
    function hopTo(cat, q) {
        var c = Math.cos(q.a), s = Math.sin(q.a), dx = cat.x - q.x, dy = cat.y - q.y;
        var room = Math.max(0, q.hw - 9);
        cat.p = q; cat.lx = clamp(c * dx + s * dy, -room, room);
        cat.st = 'hop'; cat.t = rm ? 1 : 0; cat.dur = 0.35; cat.x0 = cat.x; cat.y0 = cat.y;
    }
    function jolt(p, lx) {
        if (p.stat || p.ghost) return;
        var J = 40, c = Math.cos(p.a);
        p.vy -= p.im * J;
        p.av -= p.iI * (c * lx) * J;
    }
    function updateCats(dt) {
        for (var i = cats.length - 1; i >= 0; i--) {
            var cat = cats[i], p = cat.p;
            cat.blink -= dt;
            if (cat.blink < -0.15) cat.blink = 2 + Math.random() * 4;
            if (cat.st === 'flee') {
                cat.vy -= G * 0.6 * dt; cat.x += cat.vx * dt; cat.y += cat.vy * dt; cat.a += cat.spin * dt;
                if (cat.y < camTop - H / S - 80 || Math.abs(cat.x) > W / S) cats.splice(i, 1);
                continue;
            }
            if (p.ghost || Math.abs(p.a) > 0.7 || bodies.indexOf(p) < 0) { flee(cat); continue; }
            var s = seat(p, cat.lx);
            if (cat.st === 'hop') {
                cat.t = Math.min(1, cat.t + dt / cat.dur);
                var k = cat.t, arc = 40 + Math.max(0, s.y - cat.y0) * 0.4;
                cat.x = cat.x0 + (s.x - cat.x0) * k; cat.y = cat.y0 + (s.y - cat.y0) * k + arc * 4 * k * (1 - k);
                cat.a = s.a * k;
                if (cat.fade > 0) cat.fade = Math.max(0, cat.fade - dt * 3);
                if (k >= 1) { cat.st = 'sit'; jolt(p, cat.lx); }
                continue;
            }
            cat.x = s.x; cat.y = s.y; cat.a = s.a;
            var hx = cat.x - Math.sin(cat.a) * 14, hy = cat.y + Math.cos(cat.a) * 14;
            for (var j = 0; j < bodies.length; j++) {
                var q = bodies[j];
                if (q === p || q.ghost || !q.landed) continue;
                var qc = Math.cos(q.a), qs = Math.sin(q.a), lx = qc * (hx - q.x) + qs * (hy - q.y), ly = -qs * (hx - q.x) + qc * (hy - q.y);
                if (Math.abs(lx) < q.hw + 2 && Math.abs(ly) < q.hh + 2) { hopTo(cat, q); break; }
            }
        }
    }
    function flee(cat) {
        var dir = cat.lx >= 0 ? 1 : -1;
        if (Math.abs(cat.lx) < 4) dir = Math.random() < 0.5 ? -1 : 1;
        cat.st = 'flee'; cat.vx = dir * 150; cat.vy = 330; cat.spin = dir * -3; cat.face = dir;
        text(cat.x, cat.y + 30, 'Mrrow!', '#6b4a2f', 0.9);
    }

    /* effects */
    function text(x, y, s, col, size) { texts.push({ x: x, y: y, s: s, col: col, size: size, t: 0 }); }
    function dust(x, y) {
        if (rm) return;
        for (var i = 0; i < 4; i++) parts.push({ x: x, y: y + 2, vx: (Math.random() - 0.5) * 60, vy: 20 + Math.random() * 30,
                                                 t: 0, life: 0.45, r: 3 + Math.random() * 3, col: 'rgba(160, 130, 100, .45)', star: false });
    }
    function sparkle(x, y) {
        if (rm) return;
        var cols = ['#f59e0b', '#f472b6', '#60a5fa', '#34d399'];
        for (var i = 0; i < 10; i++) {
            var a = i / 10 * TAU;
            parts.push({ x: x, y: y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 80 + 60, t: 0, life: 0.7, r: 3.5, col: cols[i % 4], star: true });
        }
    }

    /* update */
    function update(dt) {
        t += dt;
        var sp = L.speed * Math.min(L.cap, 1 + L.ramp * placed);
        pawP += pawDir * sp * dt / pawA;
        if (pawP > 1) { pawP = 2 - pawP; pawDir = -1; }
        if (pawP < -1) { pawP = -2 - pawP; pawDir = 1; }
        pawX = pawP * pawA;
        pawY += (Math.max(curTop, pawTop) + 175 - pawY) * Math.min(1, dt * 3);
        if (pawOpen > 0) pawOpen = Math.max(0, pawOpen - dt * 2.5);
        if (state === 'play' && !held && !active && (reload -= dt) <= 0) spawnHeld();
        if (held) held.t = Math.min(1, held.t + dt / 0.25);

        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; }
        if (n === 5) acc = 0;

        /* bookkeeping: resting, falling off, freezing the low part, tower height */
        frozenTop = 0;
        var loose = [], top = 0, reach = 0, wobbly = false, i, b;
        for (i = 0; i < bodies.length; i++) {
            b = bodies[i];
            if (b.ghost) continue;
            if (b.stat) { if (b !== base) frozenTop = Math.max(frozenTop, topOf(b)); continue; }
            if (b.squash > 0) b.squash = Math.max(0, b.squash - dt * 5);
            var still = b.vx * b.vx + b.vy * b.vy < 225 && Math.abs(b.av) < 0.15;
            b.rest = still ? b.rest + dt : 0;
        }
        for (i = bodies.length - 1; i >= 0; i--) {
            b = bodies[i];
            if (b.ghost || b.stat) continue;
            if (b.y < -15 || (b.y < frozenTop - 40 && b.vy < -200) || Math.abs(b.x) > W / S / 2 + 120) {
                bodies.splice(i, 1);
                loseLife(b);
            }
        }
        for (i = 0; i < bodies.length; i++) {
            b = bodies[i];
            if (b.ghost || !b.landed) continue;
            if (!b.stat) {
                loose.push(b);
                if (Math.abs(b.a) > 0.3 && b.rest === 0) wobbly = true;
            }
            if (b.stat || b.rest > 0.25) top = Math.max(top, topOf(b));
            reach = Math.max(reach, topOf(b));
        }
        if (loose.length > L.keep) {
            var old = loose[0];
            if (old.rest > 0.4 || loose.length > L.keep + 3) freeze(old);
        }
        curTop = top;
        pawTop = reach;
        if (top > maxH) { maxH = top; showScore(); }
        if (wobbly && t - lastWow > 3 && state === 'play') { lastWow = t; api.cat('wow'); }

        if (catQueue > 0 && state === 'play' && (catWait -= dt) <= 0) { catQueue--; catWait = 0.9; spawnCat(); }
        updateCats(dt);

        for (i = ghosts.length - 1; i >= 0; i--) {     /* pieces that fell off: tumble down, rest on the floor, fade */
            b = ghosts[i];
            if (b.floorT > 0) {
                if ((b.floorT += dt) > 1.6) b.fade -= dt * 2;
            } else {
                b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.av * dt;
                if (lowOf(b) < FLOOR) { b.floorT = 0.01; b.y += FLOOR - lowOf(b); b.vy = 0; b.vx = 0; b.av = 0; }
            }
            if (b.fade <= 0 || b.y < camTop - H / S - 300) ghosts.splice(i, 1);
        }
        if (!rm) { sway.v += (-55 * sway.x - 5 * sway.v) * dt; sway.x += sway.v * dt; }
        for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i];
            q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy -= (q.star ? 260 : 20) * dt;
            if (q.t > q.life) parts.splice(i, 1);
        }
        for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 1.1) texts.splice(i, 1); }
        if (shake > 0) shake = Math.max(0, shake - dt);

        var view = H / S, target = Math.max(pawY + 0.2 * view + 10, FLOOR - 40 + view);
        if (!camInit) { camTop = target; camInit = true; }
        camTop += (target - camTop) * (rm ? 1 : Math.min(1, dt * 4));
        if (state === 'ending' && t > endAt) finish();
    }

    /* drawing */
    function sx(x) { return W / 2 + x * S; }
    function sy(y) { return (camTop - y) * S; }
    function rr(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        g.beginPath();
        g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function paw(x, y, s, col) {                       /* a small paw print, used as a stamp */
        g.fillStyle = col;
        g.beginPath(); g.ellipse(x, y + s * 0.35, s * 0.55, s * 0.42, 0, 0, TAU); g.fill();
        [[-0.55, -0.25], [-0.2, -0.55], [0.2, -0.55], [0.55, -0.25]].forEach(function (p) {
            g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s, s * 0.2, 0, TAU); g.fill();
        });
    }
    /* a piece in its own frame: cm units, y down, centered */
    function art(kind, w, h, seed) {
        var x = -w / 2, y = -h / 2, i;
        g.lineWidth = 1.2;
        if (kind === 'plank' || kind === 'base') {
            var dark = kind === 'base';
            rr(x, y, w, h, 3); g.fillStyle = dark ? '#a8794b' : '#c4925f'; g.fill();
            rr(x, y, w, h * 0.62, 3); g.fillStyle = dark ? '#d7c3a0' : '#f0dcb8'; g.fill();
            g.fillStyle = dark ? '#c6ae86' : '#e2c899';
            for (i = 0; i < w / 9; i++) { g.beginPath(); g.arc(x + 5 + i * 9 + (i % 2) * 2, y + 2.5 + (i % 3) * 1.5, 0.9, 0, TAU); g.fill(); }
            rr(x, y, w, h, 3); g.strokeStyle = dark ? '#7a5532' : '#8f6640'; g.stroke();
        } else if (kind === 'cushion') {
            rr(x, y, w, h, h * 0.45); g.fillStyle = '#f7b8c9'; g.fill(); g.strokeStyle = '#d9819b'; g.stroke();
            g.fillStyle = 'rgba(255, 255, 255, .45)';
            g.beginPath(); g.ellipse(x + w * 0.28, y + h * 0.28, w * 0.14, h * 0.12, 0, 0, TAU); g.fill();
            g.fillStyle = '#e58aa5';
            g.beginPath(); g.arc(-w * 0.2, 1, 2.2, 0, TAU); g.arc(w * 0.2, 1, 2.2, 0, TAU); g.fill();
        } else if (kind === 'box') {
            rr(x, y, w, h, 2); g.fillStyle = '#d8a065'; g.fill();
            g.fillStyle = '#c98e52'; g.fillRect(x, y, w, h * 0.22);
            g.fillStyle = '#efcf9a'; g.fillRect(-5, y, 10, h * 0.22);
            g.strokeStyle = '#a8723d';
            g.beginPath(); g.moveTo(x, y + h * 0.22); g.lineTo(x + w, y + h * 0.22); g.stroke();
            paw(w * 0.16, h * 0.15, 6, '#b98247');
            rr(x, y, w, h, 2); g.stroke();
        } else if (kind === 'post') {
            g.fillStyle = '#dcc08f'; g.fillRect(x + 3, y + 6, w - 6, h - 12);
            g.strokeStyle = '#b8995f'; g.lineWidth = 1;
            g.save(); g.beginPath(); g.rect(x + 3, y + 6, w - 6, h - 12); g.clip();
            for (i = -2; i < h / 5 + 2; i++) { g.beginPath(); g.moveTo(x, y + i * 5); g.lineTo(x + w, y + i * 5 + 4); g.stroke(); }
            g.restore();
            g.lineWidth = 1.2;
            rr(x, y, w, 7, 2); g.fillStyle = '#8fb6dd'; g.fill(); g.strokeStyle = '#6a92bb'; g.stroke();
            rr(x, y + h - 7, w, 7, 2); g.fill(); g.stroke();
        } else if (kind === 'basket') {
            g.fillStyle = '#9fd8c8';
            g.beginPath(); g.ellipse(-w * 0.12, y + 5, w * 0.3, 5, 0, Math.PI, TAU); g.fill();
            rr(x + 2, y + 4, w - 4, h - 4, 7); g.fillStyle = '#cf9455'; g.fill();
            g.strokeStyle = '#ad7238'; g.lineWidth = 1;
            for (var r = 0; r < 3; r++) for (i = 0; i < w / 8; i++) {
                var cx = x + 6 + i * 8 + (r % 2) * 4, cy = y + 12 + r * 6;
                if (cx < x + w - 4 && cy < y + h - 3) { g.beginPath(); g.arc(cx, cy, 3, 0.2, Math.PI - 0.2); g.stroke(); }
            }
            g.lineWidth = 1.2;
            rr(x, y + 2, w, 6, 3); g.fillStyle = '#a86e36'; g.fill();
            rr(x + 2, y + 4, w - 4, h - 4, 7); g.strokeStyle = '#8c5a2a'; g.stroke();
        } else if (kind === 'cube') {
            rr(x, y, w, h, 4); g.fillStyle = '#a9c8e8'; g.fill(); g.strokeStyle = '#7b9cc2'; g.stroke();
            g.fillStyle = '#4f6584';
            g.beginPath(); g.arc(0, 3, Math.min(w, h) * 0.26, 0, TAU); g.fill();
            g.fillStyle = 'rgba(255, 255, 255, .35)'; g.fillRect(x + 3, y + 3, w - 6, 3);
        }
    }
    function swayOf(y) {
        if (rm || !sway.x) return 0;
        var k = clamp((y - frozenTop + 40) / (curTop - frozenTop + 60), 0, 1);
        return sway.x * k * k;
    }
    function drawBody(b, alpha) {
        var px = sx(b.x + (b.landed && !b.ghost && !b.stat ? swayOf(b.y) : 0)), py = sy(b.y);
        if (py < -b.r * S - 20 || py > H + b.r * S + 20) return;
        g.save();
        if (alpha < 1) g.globalAlpha = Math.max(0, alpha);
        g.translate(px, py); g.rotate(-b.a); g.scale(S, S);
        if (b.squash > 0) {
            var q = Math.sin(b.squash * Math.PI) * 0.1;
            g.translate(0, b.hh); g.scale(1 + q, 1 - q); g.translate(0, -b.hh);
        }
        art(b.kind, b.hw * 2, b.hh * 2, b.seed);
        g.restore();
    }
    function drawCat(cat) {
        var L2 = cat.look, px = sx(cat.x + (cat.st === 'sit' ? swayOf(cat.y) : 0)), py = sy(cat.y);
        if (py < -60 || py > H + 60) return;
        g.save();
        g.translate(px, py); g.rotate(-cat.a); g.scale(S * cat.face, S);
        if (cat.fade > 0) g.globalAlpha = 1 - cat.fade;
        var out = L2.fur === '#2f2f36' || L2.fur === '#4a4a55' ? '#1f1f25' : 'rgba(80, 50, 30, .55)';
        g.lineWidth = 1; g.strokeStyle = out; g.fillStyle = L2.fur;
        var swish = rm ? 0 : Math.sin(t * 2.2 + cat.lx) * 2.5, hop = cat.st !== 'sit';
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(-6, -3); g.quadraticCurveTo(-15, -4 + swish, -13 + swish * 0.4, -15);  /* tail */
        g.lineWidth = 3.4; g.strokeStyle = out; g.stroke();
        g.lineWidth = 2.2; g.strokeStyle = L2.fur; g.stroke();
        g.lineWidth = 1; g.strokeStyle = out;
        g.beginPath(); g.ellipse(-1, hop ? -8 : -7, hop ? 9 : 7.5, hop ? 5.5 : 7, 0, 0, TAU); g.fill(); g.stroke();   /* body */
        if (L2.tabby) {
            g.strokeStyle = L2.mark; g.lineWidth = 1.4;
            for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-6 + i * 3, -12.5); g.lineTo(-5 + i * 3, -9); g.stroke(); }
            g.lineWidth = 1; g.strokeStyle = out;
        }
        if (L2.patches) { g.fillStyle = L2.mark; g.beginPath(); g.ellipse(-3, -9, 3.5, 3, 0.4, 0, TAU); g.fill(); }
        g.fillStyle = L2.socks ? '#fbf8f2' : L2.fur;
        g.beginPath(); g.ellipse(2.5, -0.8, 2.2, 1.4, 0, 0, TAU); g.ellipse(-3.5, -0.8, 2.2, 1.4, 0, 0, TAU); g.fill(); g.stroke();
        var hx = 5, hy = hop ? -14 : -16;                  /* head */
        g.fillStyle = L2.fur;
        g.beginPath(); g.moveTo(hx - 5, hy - 2); g.lineTo(hx - 4.2, hy - 8.5); g.lineTo(hx - 0.8, hy - 4.8); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(hx + 5, hy - 2); g.lineTo(hx + 4.2, hy - 8.5); g.lineTo(hx + 0.8, hy - 4.8); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(hx, hy, 6, 5.4, 0, 0, TAU); g.fill(); g.stroke();
        if (L2.patches) { g.fillStyle = L2.mark; g.beginPath(); g.ellipse(hx - 2.5, hy - 2.5, 2.6, 2.2, 0, 0, TAU); g.fill(); }
        g.fillStyle = '#f9a8b8';
        g.beginPath(); g.moveTo(hx + 1.6, hy + 1); g.lineTo(hx + 3.2, hy + 1); g.lineTo(hx + 2.4, hy + 2); g.closePath(); g.fill();
        var eye = L2.fur === '#2f2f36' || L2.fur === '#4a4a55' ? '#f6d860' : '#2b2b33';
        if (cat.blink < 0 || cat.st === 'flee') {
            g.strokeStyle = eye; g.lineWidth = 0.9;
            g.beginPath(); g.moveTo(hx - 1.6, hy - 1); g.lineTo(hx + 0.2, hy - 1); g.moveTo(hx + 3.4, hy - 1); g.lineTo(hx + 5.2, hy - 1); g.stroke();
        } else {
            g.fillStyle = eye;
            g.beginPath(); g.arc(hx - 0.6, hy - 1, 1.05, 0, TAU); g.arc(hx + 4.2, hy - 1, 1.05, 0, TAU); g.fill();
        }
        g.restore();
    }
    var SKY = [[-300, [251, 241, 225]], [380, [251, 241, 225]], [800, [214, 234, 247]], [1800, [170, 209, 240]],
               [3000, [128, 146, 204]], [4200, [52, 61, 110]], [6000, [26, 31, 68]]];
    function skyAt(y) {
        for (var i = 1; i < SKY.length; i++) if (y < SKY[i][0]) {
            var a = SKY[i - 1], b = SKY[i], k = (y - a[0]) / (b[0] - a[0]);
            return 'rgb(' + [0, 1, 2].map(function (j) { return Math.round(a[1][j] + (b[1][j] - a[1][j]) * k); }).join(',') + ')';
        }
        return 'rgb(26,31,68)';
    }
    function drawBg() {
        var yTop = camTop, yBot = camTop - H / S, i, k;
        var grd = g.createLinearGradient(0, 0, 0, H);
        for (i = 0; i <= 4; i++) grd.addColorStop(i / 4, skyAt(yTop - (yTop - yBot) * i / 4));
        g.fillStyle = grd; g.fillRect(0, 0, W, H);
        if (yBot < 520) {                                 /* the room: striped wallpaper fading into the sky */
            var wallTop = sy(520), x0 = sx(-W / S), xs = 40 * S;
            var fadeG = g.createLinearGradient(0, wallTop, 0, sy(250));
            fadeG.addColorStop(0, 'rgba(240, 222, 196, 0)'); fadeG.addColorStop(1, 'rgba(240, 222, 196, .5)');
            g.fillStyle = fadeG;
            for (var x = W / 2 - Math.ceil(W / 2 / xs) * xs; x < W; x += xs) g.fillRect(x, wallTop, xs * 0.35, sy(FLOOR) - wallTop);
            /* window */
            var wx = sx(-150), wy = sy(260), ww = 70 * S, wh = 100 * S;
            g.fillStyle = '#d4ebf7'; g.fillRect(wx, wy, ww, wh);
            g.fillStyle = 'rgba(255, 255, 255, .8)'; g.beginPath(); g.arc(wx + ww * 0.3, wy + wh * 0.35, 9 * S, 0, TAU); g.arc(wx + ww * 0.45, wy + wh * 0.32, 11 * S, 0, TAU); g.fill();
            g.strokeStyle = '#fff'; g.lineWidth = 4 * S; g.strokeRect(wx, wy, ww, wh);
            g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
            g.strokeStyle = '#e4d2b4'; g.lineWidth = 1; g.strokeRect(wx - 2 * S, wy - 2 * S, ww + 4 * S, wh + 4 * S);
            /* framed fish picture */
            var fx = sx(95), fy = sy(215), fw = 46 * S, fh = 34 * S;
            g.fillStyle = '#fffaf1'; g.fillRect(fx, fy, fw, fh);
            g.strokeStyle = '#c9a77c'; g.lineWidth = 3 * S; g.strokeRect(fx, fy, fw, fh);
            g.fillStyle = '#7cb7d9';
            g.beginPath(); g.ellipse(fx + fw * 0.45, fy + fh / 2, fw * 0.22, fh * 0.2, 0, 0, TAU); g.fill();
            g.beginPath(); g.moveTo(fx + fw * 0.66, fy + fh / 2); g.lineTo(fx + fw * 0.8, fy + fh * 0.32); g.lineTo(fx + fw * 0.8, fy + fh * 0.68); g.closePath(); g.fill();
            /* skirting board and floor */
            var fl = sy(FLOOR);
            g.fillStyle = '#fffdf8'; g.fillRect(0, fl - 10 * S, W, 10 * S);
            g.fillStyle = '#e6d6bd'; g.fillRect(0, fl - 1, W, 1.5);
            g.fillStyle = '#d9ab7c'; g.fillRect(0, fl, W, H - fl);
            g.strokeStyle = '#c69465'; g.lineWidth = 1;
            for (k = 1; k < 6; k++) { var ly = fl + k * 14 * S; if (ly > H) break; g.beginPath(); g.moveTo(0, ly); g.lineTo(W, ly); g.stroke(); }
            g.fillStyle = '#a9d0bf';
            g.beginPath(); g.ellipse(sx(0), fl + 6 * S, (L.base * 0.75) * S, 7 * S, 0, 0, TAU); g.fill();
            /* the cat tree trunk under the base */
            g.fillStyle = '#dcc08f'; g.fillRect(sx(-17), sy(-16), 34 * S, (FLOOR + 16) * -S);
            g.strokeStyle = '#b8995f';
            for (k = -16; k > FLOOR + 4; k -= 6) { g.beginPath(); g.moveTo(sx(-17), sy(k)); g.lineTo(sx(17), sy(k - 4)); g.stroke(); }
            rr(sx(-L.base * 0.38), sy(FLOOR + 8), L.base * 0.76 * S, 8 * S, 3 * S); g.fillStyle = '#a8794b'; g.fill();
        }
        /* clouds, then stars */
        var b0 = Math.floor(Math.max(500, yBot) / 260), b1 = Math.floor(yTop / 260);
        for (k = b0; k <= b1; k++) {
            if (k * 260 < 600 || k * 260 > 4200) continue;
            var cx = (hash(k) - 0.5) * W / S * 1.1, cy = k * 260 + hash(k + 9) * 200, cs = 14 + hash(k + 3) * 14;
            g.fillStyle = k * 260 > 3000 ? 'rgba(255, 255, 255, .35)' : 'rgba(255, 255, 255, .85)';
            g.beginPath();
            g.arc(sx(cx), sy(cy), cs * S, 0, TAU); g.arc(sx(cx + cs * 1.1), sy(cy + cs * 0.35), cs * 1.25 * S, 0, TAU);
            g.arc(sx(cx + cs * 2.3), sy(cy), cs * 0.95 * S, 0, TAU); g.fill();
        }
        if (yTop > 3000) {
            var sb0 = Math.floor(Math.max(3000, yBot) / 90), sb1 = Math.floor(yTop / 90);
            for (k = sb0; k <= sb1; k++) {
                var al = clamp((k * 90 - 3000) / 1500, 0, 1) * (0.5 + 0.5 * hash(k + 5));
                g.fillStyle = 'rgba(255, 250, 220, ' + al.toFixed(2) + ')';
                g.beginPath(); g.arc(sx((hash(k + 1) - 0.5) * W / S), sy(k * 90 + hash(k + 2) * 90), (1 + hash(k + 7) * 1.4) * S, 0, TAU); g.fill();
            }
        }
    }
    function drawRuler() {                             /* a growth chart on the left edge */
        var yTop = camTop, yBot = camTop - H / S;
        g.fillStyle = 'rgba(255, 250, 240, .85)'; g.fillRect(0, 0, 24, H);
        g.fillStyle = '#e3cfae'; g.fillRect(24, 0, 1.5, H);
        g.strokeStyle = '#a57c52'; g.fillStyle = '#7a5532'; g.lineWidth = 1;
        g.font = '700 9px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
        for (var y = Math.ceil(Math.max(0, yBot) / 10) * 10; y <= yTop; y += 10) {
            var py = Math.round(sy(y)) + 0.5, len = y % 100 === 0 ? 12 : y % 50 === 0 ? 8 : 4;
            g.beginPath(); g.moveTo(24 - len, py); g.lineTo(24, py); g.stroke();
            if (y % 100 === 0 && y > 0) g.fillText(y / 100 + 'm', 2, py - 7);
        }
        if (maxH > 0) {
            var my = sy(maxH);
            g.fillStyle = '#e8574d';
            g.beginPath(); g.moveTo(25, my); g.lineTo(34, my - 5); g.lineTo(34, my + 5); g.closePath(); g.fill();
        }
    }
    function drawPaw() {
        var x = sx(pawX), y = sy(pawY), aw = 24 * S, lift = pawOpen * 10 * S;
        y -= lift;
        g.fillStyle = '#f4a259'; g.strokeStyle = '#c9732e'; g.lineWidth = 1.5;
        g.fillRect(x - aw / 2, -4, aw, y + 4);
        g.beginPath(); g.moveTo(x - aw / 2, -4); g.lineTo(x - aw / 2, y); g.moveTo(x + aw / 2, -4); g.lineTo(x + aw / 2, y); g.stroke();
        g.fillStyle = '#de8a3f';
        for (var k = y - 30 * S; k > -10; k -= 26 * S) g.fillRect(x - aw / 2 + 2, k, aw - 4, 7 * S);
        var pw = 17 * S, ph = 12 * S, spread = pawOpen * 4 * S;
        g.fillStyle = '#f7b06b'; g.strokeStyle = '#c9732e';
        g.beginPath(); g.ellipse(x, y - 2 * S, pw, ph, 0, 0, TAU); g.fill(); g.stroke();
        for (var i = -1.5; i <= 1.5; i++) {
            g.beginPath(); g.ellipse(x + i * (8 * S + spread), y + 7 * S - pawOpen * 2 * S, 4.5 * S, 5 * S, 0, 0, TAU);
            g.fillStyle = '#f7b06b'; g.fill(); g.stroke();
            if (pawOpen > 0) { g.fillStyle = '#f9a8b8'; g.beginPath(); g.arc(x + i * (8 * S + spread), y + 8 * S - pawOpen * 2 * S, 2 * S, 0, TAU); g.fill(); }
        }
    }
    function landY(x, hw) {                        /* where a straight drop at x would meet the tower (for the guide) */
        var y = FLOOR;
        bodies.forEach(function (b) {
            if (b.ghost || !b.landed) return;
            var ex = Math.abs(Math.cos(b.a)) * b.hw + Math.abs(Math.sin(b.a)) * b.hh;
            if (Math.abs(b.x - x) < ex + hw) y = Math.max(y, topOf(b));
        });
        return y;
    }
    function drawHeld() {
        if (!held) return;
        var k = KINDS[held.kind], s = rm ? 1 : 0.6 + 0.4 * Math.min(1, held.t);
        var cx = sx(pawX), cy = sy(pawY - 4 - k.h / 2);
        if (L.guide && held.t >= 0.6) {
            g.strokeStyle = 'rgba(194, 65, 12, .35)'; g.lineWidth = 2; g.setLineDash([5, 6]);
            g.beginPath(); g.moveTo(cx, cy + k.h / 2 * S); g.lineTo(cx, sy(landY(pawX, k.w / 2))); g.stroke();
            g.setLineDash([]);
        }
        g.save();
        g.globalAlpha = rm ? 1 : Math.min(1, held.t * 2);
        g.translate(cx, cy); g.scale(S * s, S * s);
        art(held.kind, k.w, k.h, 0);
        g.restore();
    }
    function drawHud() {
        var x = 34;
        g.textAlign = 'left'; g.textBaseline = 'top';
        g.lineJoin = 'round';
        g.font = '800 22px system-ui, sans-serif';
        var label = (maxH / 100).toFixed(2) + ' m';
        g.lineWidth = 4; g.strokeStyle = 'rgba(255, 255, 255, .85)'; g.strokeText(label, x, 10);
        g.fillStyle = '#7a3e12'; g.fillText(label, x, 10);
        for (var i = 0; i < L.lives; i++) {            /* lives as little fish */
            var fx = x + 6 + i * 20, fy = 46;
            g.fillStyle = i < lives ? '#5aa9d6' : 'rgba(120, 120, 130, .3)';
            g.beginPath(); g.ellipse(fx, fy, 7, 4.5, 0, 0, TAU); g.fill();
            g.beginPath(); g.moveTo(fx + 5, fy); g.lineTo(fx + 11, fy - 4.5); g.lineTo(fx + 11, fy + 4.5); g.closePath(); g.fill();
            if (i < lives) { g.fillStyle = '#fff'; g.beginPath(); g.arc(fx - 3, fy - 1, 1.3, 0, TAU); g.fill(); }
        }
        if (streak >= 2) {
            g.font = '800 14px system-ui, sans-serif';
            var st = 'Purrfect streak x' + streak;
            g.lineWidth = 3; g.strokeText(st, x, 58); g.fillStyle = '#c2410c'; g.fillText(st, x, 58);
        }
        if (nextKind && state === 'play') {               /* the next piece, top right */
            var k = KINDS[nextKind], sc = Math.min(46 / k.w, 32 / k.h), nx = W - 40, ny = 34;
            g.font = '700 11px system-ui, sans-serif'; g.textAlign = 'center';
            g.lineWidth = 3; g.strokeText('next', nx, 6); g.fillStyle = '#8a6a4f'; g.fillText('next', nx, 6);
            g.save(); g.translate(nx, ny); g.scale(sc, sc); art(nextKind, k.w, k.h, 0); g.restore();
        }
    }
    function draw() {
        g.save();
        if (shake > 0 && !rm) g.translate((Math.random() - 0.5) * shake * 18, (Math.random() - 0.5) * shake * 12);
        drawBg();
        var i;
        for (i = 0; i < ghosts.length; i++) drawBody(ghosts[i], ghosts[i].fade);
        for (i = 0; i < bodies.length; i++) drawBody(bodies[i], 1);
        for (i = 0; i < cats.length; i++) drawCat(cats[i]);
        drawPaw();
        drawHeld();
        for (i = 0; i < parts.length; i++) {
            var q = parts[i], al = 1 - q.t / q.life;
            g.globalAlpha = al; g.fillStyle = q.col;
            g.beginPath();
            if (q.star) {
                var px = sx(q.x), py = sy(q.y), r = q.r * S * 1.2;
                g.moveTo(px, py - r); g.lineTo(px + r * 0.3, py - r * 0.3); g.lineTo(px + r, py); g.lineTo(px + r * 0.3, py + r * 0.3);
                g.lineTo(px, py + r); g.lineTo(px - r * 0.3, py + r * 0.3); g.lineTo(px - r, py); g.lineTo(px - r * 0.3, py - r * 0.3);
            } else g.arc(sx(q.x), sy(q.y), q.r * S * (1 + q.t * 2), 0, TAU);
            g.fill();
        }
        g.globalAlpha = 1;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (i = 0; i < texts.length; i++) {
            var tx = texts[i], up = rm ? 0 : tx.t * 40;
            g.globalAlpha = Math.min(1, (1.1 - tx.t) * 3);
            g.font = '800 ' + Math.round(17 * tx.size) + 'px system-ui, sans-serif';
            var xx = clamp(sx(tx.x), 70, W - 70), yy = sy(tx.y) - up;
            g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(tx.s, xx, yy);
            g.fillStyle = tx.col; g.fillText(tx.s, xx, yy);
        }
        g.globalAlpha = 1;
        g.restore();
        drawRuler();
        drawHud();
    }

    /* setup, input, loop */
    function fit(s) {
        W = s.w; H = s.h;
        S = Math.max(0.6, Math.min(W / 330, H / 500));
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        camInit = false;
    }
    api.on(wrap, 'pointerdown', function (e) { if (e.button === 0 || e.pointerType !== 'mouse') { e.preventDefault(); drop(); } });
    api.on(document, 'keydown', function (e) {
        var k = e.code;
        if (k !== 'Space' && k !== 'Enter' && k !== 'ArrowDown' && k !== 'KeyS') return;
        if (state === 'over') return;
        var a = document.activeElement;
        if (a && (a.tagName === 'BUTTON' || a.tagName === 'SELECT')) { if (k === 'Enter') return; a.blur(); }
        e.preventDefault();
        if (!e.repeat) drop();
    });
    fit(api.size());
    api.onResize(fit);
    api.score(0);
    shown = 0;
    var overT = 0;
    var stop = api.loop(function (dt) {
        update(dt);
        draw();
        if (state === 'over' && (overT += dt) > 2.5) stop();
    });
});
