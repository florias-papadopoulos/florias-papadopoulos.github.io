/* Night Prowl: a top-down stealth puzzle in a house at night. Sneak the cat from its basket to the treat jar through
   eight rooms: hide under furniture, walk softly past the sleeping dog, jump onto counters, knock a vase off to lure
   people away, dodge the robot vacuum. Everything moves tile by tile on a 15 x 10 grid; on a tall screen the map is
   shown transposed (rows become columns), so the same levels fill a phone. Score: 10 per level, 3 per fish, 5 per life
   left at the end. Shell API: arcade.js. */
Arcade.register('night-prowl', function (api) {
    'use strict';
    api.css(
        '.np { position: absolute; inset: 0; overflow: hidden; background: #1d1a3a; }' +
        '.np-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: pointer; }' +
        '.np-hud { position: absolute; left: 8px; right: 8px; top: 8px; display: flex; gap: 6px; align-items: center; pointer-events: none; }' +
        '.np-pill { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,.93);' +
        '  box-shadow: 0 3px 10px rgba(10,8,40,.25); color: #2e2a5a; font-weight: 800; font-size: .85rem; white-space: nowrap; }' +
        '.np-pill small { color: #7c78a8; font-weight: 700; font-size: .72rem; }' +
        '.np-lv { min-width: 0; flex: 0 1 auto; }' +
        '.np-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: #5b5690; font-weight: 700; }' +
        '.np-gap { flex: 1; }' +
        '.np-pill svg { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.2; }' +
        '.np-fishp svg { fill: #5bb8e8; stroke: none; width: 18px; }' +
        '.np-lives { color: #e8577e; letter-spacing: 1px; }' +
        '.np-lives i { color: #d9d4ee; font-style: normal; }' +
        '.np-meter { color: #7c78a8; }' +
        '.np-bar { width: 48px; height: 8px; border-radius: 4px; background: #e6e3f5; overflow: hidden; }' +
        '.np-bar i { display: block; height: 100%; width: 0; background: #f5b83d; border-radius: 4px; }' +
        '.np-meter.np-hot { color: #e8577e; }' +
        '.np-meter.np-hot .np-bar i { background: #e8577e; }' +
        '.np-hint { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); max-width: calc(100% - 24px); padding: 6px 12px;' +
        '  border-radius: 12px; background: rgba(255,255,255,.93); color: #4a4578; font-size: .82rem; font-weight: 600; line-height: 1.3;' +
        '  text-align: center; pointer-events: none; }' +
        '.np-narrow .np-hint { left: 10px; right: 104px; transform: none; max-width: none; bottom: 12px; text-align: left; }' +
        '.np-narrow .np-pill { padding: 4px 8px; }' +
        '.np-narrow .np-lv small { display: none; }' +
        '.np-card { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); min-width: 210px; max-width: min(88%, 420px);' +
        '  padding: 14px 20px; border-radius: 18px; background: rgba(255,255,255,.96); box-shadow: 0 10px 30px rgba(10,8,40,.4);' +
        '  text-align: center; pointer-events: none; transition: opacity .3s; }' +
        '.np-card b { display: block; color: #7c78a8; font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; }' +
        '.np-card strong { display: block; color: #2e2a5a; font-size: 1.45rem; line-height: 1.2; margin: 2px 0 4px; }' +
        '.np-card span { display: block; color: #5b5690; font-size: .88rem; font-weight: 600; line-height: 1.35; }' +
        '.np-card.np-hide { opacity: 0; }' +
        '.np-card.np-bad strong { color: #d6336c; }' +
        '.np-card.np-good strong { color: #2f9e6e; }');

    /* ---------- the levels: 15 x 10 tiles ----------
       .  floor     ~  rug        m  moonlight    q  creaky board (squeaks even when you walk)
       #  wall      H  bookshelf  P  plant        V  vase on a stand (knock it off)
       T  table     S  sofa       B  bed          (the cat hides under these)
       C  counter   X  box        (the cat jumps up onto these)
       @  basket (start)   J  treat jar   j  treat jar on a counter   f  fish   g  fish on a counter
       humans walk their route in a loop (a guard with one waypoint stands there and looks around);
       dogs sleep where they are put; vacuums drive their loop */
    var LEVELS = [
        { title: 'Midnight Snack',
          hint: ['Walk to the treat jar: arrows or WASD (or click a spot).', 'Tap a spot and the cat walks there. Find the treat jar.'],
          map: ['Bm@~~#....H#CCC',
                'B..~~#.f...#..J',
                'P....#.....#...',
                '..........T..f.',
                'P....#....T#..C',
                '######.....####',
                'm..........S..P',
                '....T......S...',
                '...f...........',
                'PH......P.....m'] },
        { title: 'Duck and Cover',
          hint: ['Hide under tables, sofas and beds: the flashlight can\'t see you there.'],
          map: ['B@~~#.........m',
                'B.~~#..........',
                'P...#...TT.....',
                '.......STT.....',
                'P...#..S....S..',
                '#####.....f.S..',
                'H..P#..........',
                '....#..TT..####',
                '.f....fTT.....J',
                'PH..#......#CCC'],
          humans: [[[5, 1], [13, 1], [13, 6], [5, 6]]] },
        { title: 'Let Sleeping Dogs Lie',
          hint: ['Hold Shift to run, but running is loud. Walk softly past the dog.', 'Double tap to run, but running is loud. Walk softly past the dog.'],
          map: ['@.....f.....#CC',
                'm~~~~~~~~~..#.J',
                '##########..#..',
                'P..TT.......#..',
                '...TT..........',
                'P.......S...#..',
                '####.###S...#.f',
                'Hf..........#..',
                '....T..BB...#C.',
                'P...T..BB...#CC'],
          dogs: [[10, 3, Math.PI]] },
        { title: 'Up and Over',
          hint: ['Walk into a box or counter to jump up. The jar is on the counter.', 'Tap a box or counter to jump up. The jar is on the counter.'],
          map: ['B@..X....#CCCCj',
                'B...X....#C....',
                'm...X.TT.#C.f..',
                '....X....XX....',
                'P...X....X..SS.',
                'XXXXX....X.....',
                'P.......PX..T..',
                '.f...TT..X..T..',
                '...........C..P',
                'HH....P...CCg..'],
          dogs: [[6, 4, Math.PI / 2]] },
        { title: 'Oops, the Vase',
          hint: ['Stand next to a vase and press E or Space to knock it off. The crash lures people away.', 'Tap a vase to knock it off. The crash lures people away.'],
          map: ['.m......TT#CCCj',
                'P.......TT#....',
                '...........f...',
                '..SS......#....',
                '..SS....P.#..CC',
                '####.####.#..CC',
                '@.........#....',
                'B......V..#....',
                'B..f......#....',
                'PP.....P..#CCCP'],
          humans: [{ route: [[9, 2]], looks: [Math.PI, Math.PI / 2, Math.PI, -Math.PI / 2] }] },
        { title: 'Robo Sweep',
          hint: ['Dodge the robot vacuum: bumping into it makes you yowl, and that wakes the dog.'],
          map: ['B@.m#.........J',
                'B...#..TT....CC',
                'P...#..TT......',
                '...............',
                'P...#..SS......',
                '#####.....#####',
                'H....f....#..P.',
                '..T.......#....',
                '..T....S.....f.',
                'PP.....S...#HH.'],
          dogs: [[12, 3, Math.PI]],
          vacs: [[[6, 0], [9, 0], [9, 5], [6, 5]]] },
        { title: 'Creaky Floor',
          hint: ['Cracked boards squeak even when you walk. Step around them.'],
          map: ['B@.m#..TT.f#..j',
                'B...#......#..C',
                'P...#......#...',
                '......q.qqq.q..',
                'P...#qq.q..qq..',
                '#####q.qq.q#.CC',
                'H....q.....#...',
                '..TT.....S.#.f.',
                '..TT.....S....P',
                'PP...f....P#HH.'],
          humans: [[[5, 2], [10, 2]]],
          dogs: [[7, 7, 0]] },
        { title: 'The Big Prowl',
          hint: ['Everything at once: hide, sneak, jump and distract.'],
          map: ['B@~~#...V..#CCj',
                'B.~~#.TT...#...',
                'P...#.TT...#...',
                '...........XX..',
                'P...#..q....#..',
                '#####.SS..q##CC',
                'H....q.....#...',
                '..TT....q..#.f.',
                '..TT..V........',
                'PP..f...SS.#HHP'],
          humans: [[[5, 3], [10, 3]]],
          dogs: [[7, 7, 0]],
          vacs: [[[5, 6], [10, 6], [10, 8], [5, 8]]] }
    ];

    var MW = 15, MH = 10, LIVES = 3, TAU = Math.PI * 2;
    var WALK = 3.4, RUN = 6.2, JUMP_T = 0.3, H_SLOW = 1.4, H_FAST = 2.1;
    var H_RANGE = 4.6, H_HALF = 0.5, D_RANGE = 3, D_HALF = 0.95;
    var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

    /* ---------- page: canvas, HUD, hint and the level card ---------- */
    var wrapEl = document.createElement('div');
    wrapEl.className = 'np';
    wrapEl.innerHTML = '<canvas class="np-cv"></canvas>' +
        '<div class="np-hud"><span class="np-pill np-lv"><small>Level</small><b class="np-lvn"></b><span class="np-title"></span></span>' +
        '<span class="np-gap"></span>' +
        '<span class="np-pill np-meter" title="Spotted"><svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>' +
        '<circle cx="12" cy="12" r="3"/></svg><span class="np-bar"><i></i></span></span>' +
        '<span class="np-pill np-fishp"><svg viewBox="0 0 26 16"><path d="M2 8c3-6 10-7 15-3l6-4v14l-6-4C12 15 5 14 2 8z"/></svg><b class="np-fish"></b></span>' +
        '<span class="np-pill np-lives"></span></div>' +
        '<div class="np-hint"></div><div class="np-card np-hide"><b></b><strong></strong><span></span></div>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.np-cv'), ctx = cv.getContext('2d', { alpha: false });
    var hintEl = wrapEl.querySelector('.np-hint'), cardEl = wrapEl.querySelector('.np-card');
    var lvEl = wrapEl.querySelector('.np-lvn'), titleEl = wrapEl.querySelector('.np-title');
    var fishEl = wrapEl.querySelector('.np-fish'), livesEl = wrapEl.querySelector('.np-lives');
    var meterEl = wrapEl.querySelector('.np-meter'), barEl = wrapEl.querySelector('.np-bar i');
    var stat = document.createElement('canvas');
    var touchy = api.touch;

    /* ---------- game state ---------- */
    var level = 0, lives = LIVES, score = 0, levelFish = 0, phase = 'intro', phaseT = 0, clock = 0;
    var grid = [], fish = [], goal = null, start = null, humans = [], dogs = [], vacs = [];
    var cat = null, noises = [], texts = [], falls = [], spotted = 0, flash = 0, seenOnce = false;
    var keyStack = [], shift = false, anyInput = false, dbg = { speed: 1, god: false };

    function at(x, y) { return x < 0 || y < 0 || x >= MW || y >= MH ? '#' : grid[y][x]; }
    function isHigh(c) { return c === 'C' || c === 'X' || c === 'j'; }
    function isHide(c) { return c === 'T' || c === 'S' || c === 'B'; }
    function isBlock(c) { return c === '#' || c === 'H' || c === 'P' || c === 'V' || c === 'v'; }
    function isOpaque(c) { return c === '#' || c === 'H' || c === 'P'; }
    function sleeperAt(x, y) {
        for (var i = 0; i < dogs.length; i++) if (dogs[i].state === 'sleep' && dogs[i].m.x === x && dogs[i].m.y === y) return true;
        return false;
    }
    function catOk(x0, y0, x1, y1) { return !isBlock(at(x1, y1)) && !sleeperAt(x1, y1); }
    function folkOk(x0, y0, x1, y1) { var c = at(x1, y1); return !isBlock(c) && !isHide(c) && !isHigh(c); }
    function vacOk(x0, y0, x1, y1) { var c = at(x1, y1); return !isBlock(c) && !isHigh(c); }
    function catCost(x0, y0, x1, y1) {   /* the cat's paths avoid creaky boards when they can */
        var c = at(x1, y1);
        return c === 'q' ? 6 : isHigh(c) !== isHigh(at(x0, y0)) ? 1.4 : 1;
    }

    /* shortest path on the grid (Dijkstra, 150 tiles): list of [x, y] steps after the start, or null.
       With `near`, an unreachable goal gives the path to the reachable tile closest to it. */
    function findPath(sx, sy, ok, cost, goalFn, near) {
        var N = MW * MH, dist = [], prev = [], done = [], i;
        for (i = 0; i < N; i++) { dist.push(1e9); prev.push(-1); done.push(false); }
        var s = sy * MW + sx, hit = -1, best = s, bestD = 1e9;
        dist[s] = 0;
        for (;;) {
            var u = -1, du = 1e9;
            for (i = 0; i < N; i++) if (!done[i] && dist[i] < du) { du = dist[i]; u = i; }
            if (u < 0) break;
            done[u] = true;
            var x = u % MW, y = (u - x) / MW;
            if (goalFn(x, y)) { hit = u; break; }
            if (near) {
                var dd = (x - near.x) * (x - near.x) + (y - near.y) * (y - near.y);
                if (dd < bestD) { bestD = dd; best = u; }
            }
            for (i = 0; i < 4; i++) {
                var nx = x + DIRS[i][0], ny = y + DIRS[i][1];
                if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || !ok(x, y, nx, ny)) continue;
                var v = ny * MW + nx, nd = du + (cost ? cost(x, y, nx, ny) : 1);
                if (nd < dist[v]) { dist[v] = nd; prev[v] = u; }
            }
        }
        if (hit < 0) { if (!near) return null; hit = best; }
        var path = [];
        for (var c = hit; c !== s; c = prev[c]) path.unshift([c % MW, Math.floor(c / MW)]);
        return path;
    }
    function pathTo(sx, sy, tx, ty, ok, cost) {
        return findPath(sx, sy, ok, cost, function (x, y) { return x === tx && y === ty; }, { x: tx, y: ty }) || [];
    }

    /* movers: anything that walks tile by tile (x, y = tile it is on or leaving; tx, ty = tile it walks to) */
    function mover(x, y, a) { return { x: x, y: y, tx: x, ty: y, t: 0, fx: x + 0.5, fy: y + 0.5, moving: false, path: [], a: a || 0 }; }
    function place(m) {
        m.fx = m.x + 0.5 + (m.tx - m.x) * m.t;
        m.fy = m.y + 0.5 + (m.ty - m.y) * m.t;
    }
    function turn(m, target, rate) { var d = wrap(target - m.a); m.a += clamp(d, -rate, rate); }
    function walk(m, dt, speed, turnRate) {   /* follow m.path; true when it has run out */
        var left = dt;
        while (left > 0) {
            if (!m.moving) {
                if (!m.path.length) break;
                var n = m.path.shift();
                m.tx = n[0]; m.ty = n[1]; m.t = 0; m.moving = true;
            }
            var need = (1 - m.t) / speed;
            if (left >= need) { left -= need; m.x = m.tx; m.y = m.ty; m.t = 0; m.moving = false; }
            else { m.t += left * speed; left = 0; }
        }
        if (m.moving) turn(m, Math.atan2(m.ty - m.y, m.tx - m.x), (turnRate || 8) * dt);
        place(m);
        return !m.moving && !m.path.length;
    }
    function from(m) { return m.moving ? [m.tx, m.ty] : [m.x, m.y]; }

    /* ---------- sight ---------- */
    function clear(x0, y0, x1, y1) {
        var dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.sqrt(dx * dx + dy * dy) / 0.15);
        for (var i = 1; i < n; i++) if (isOpaque(at(Math.floor(x0 + dx * i / n), Math.floor(y0 + dy * i / n)))) return false;
        return true;
    }
    function catTile() { return at(Math.floor(cat.fx), Math.floor(cat.fy)); }
    function catHidden() { return isHide(catTile()) && !cat.jump; }
    function catUp() { return isHigh(catTile()) || (cat.jump && cat.t > 0.25 && cat.t < 0.75); }
    function view(m, px, py, range, half) {   /* 0 = (px, py) is out of sight, else how close it is (up to 1) */
        var dx = px - m.fx, dy = py - m.fy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > range) return 0;
        if (d > 0.7 && Math.abs(wrap(Math.atan2(dy, dx) - m.a)) > half) return 0;
        if (!clear(m.fx, m.fy, px, py)) return 0;
        return Math.max(0.05, 1 - d / range);
    }
    function sees(m, range, half) { return catHidden() || dbg.god ? 0 : view(m, cat.fx, cat.fy, range, half); }
    function ray(x, y, a, max) {
        var c = Math.cos(a), s = Math.sin(a);
        for (var d = 0.1; d < max; d += 0.1) if (isOpaque(at(Math.floor(x + c * d), Math.floor(y + s * d)))) return d;
        return max;
    }

    /* ---------- levels: load and reset ---------- */
    function startLevel(n) {
        level = n;
        var L = LEVELS[n], x, y;
        grid = []; fish = []; levelFish = 0;
        for (y = 0; y < MH; y++) {
            var row = [];
            for (x = 0; x < MW; x++) {
                var c = L.map[y].charAt(x) || '.';
                if (c === '@') start = { x: x, y: y };
                if (c === 'J' || c === 'j') goal = { x: x, y: y };
                if (c === 'f' || c === 'g') { fish.push({ x: x, y: y, got: false }); c = c === 'f' ? '.' : 'C'; }
                row.push(c);
            }
            grid.push(row);
        }
        cat = mover(start.x, start.y, 0);
        cat.jump = false; cat.run = false; cat.stun = 0; cat.knock = null; cat.steps = 0; cat.pathRun = false; cat.mark = null; cat.da = 0;
        humans = (L.humans || []).map(function (o) {
            var r = o.route || o, h = { m: mover(r[0][0], r[0][1]), route: r, looks: o.looks, li: 0, ri: 0, state: 'pause', timer: 1, see: 0 };
            var w = r[1 % r.length], p = pathTo(r[0][0], r[0][1], w[0], w[1], folkOk);
            if (p.length) h.m.a = Math.atan2(p[0][1] - r[0][1], p[0][0] - r[0][0]);
            if (h.looks) h.m.a = h.looks[0];
            h.look = h.m.a;
            return h;
        });
        dogs = (L.dogs || []).map(function (d) {
            return { m: mover(d[0], d[1], d[2]), home: d, state: 'sleep', timer: 0, see: 0 };
        });
        vacs = (L.vacs || []).map(function (r) { return { m: mover(r[0][0], r[0][1]), route: r, ri: 0, dir: 1, cool: 0 }; });
        noises = []; texts = []; falls = []; spotted = 0; flash = 0; seenOnce = false; keyStack = [];
        phase = 'intro'; phaseT = 0; anyInput = false;
        card('Level ' + (n + 1) + ' of ' + LEVELS.length, L.title, hintText(), '');
        hintEl.textContent = hintText();
        renderStatic();
        hud();
    }
    function hintText() { var h = LEVELS[level].hint; return touchy && h[1] ? h[1] : h[0]; }
    function card(kicker, title, sub, cls) {
        cardEl.className = 'np-card' + (cls ? ' ' + cls : '');
        cardEl.querySelector('b').textContent = kicker;
        cardEl.querySelector('strong').textContent = title;
        cardEl.querySelector('span').textContent = sub;
    }
    function hideCard() { cardEl.classList.add('np-hide'); }
    var shown = {};
    function setText(el, key, v) { if (shown[key] !== v) { shown[key] = v; el.textContent = v; } }
    function hud() {
        setText(lvEl, 'lv', (level + 1) + '/' + LEVELS.length);
        setText(titleEl, 'title', LEVELS[level].title);
        var got = 0;
        fish.forEach(function (f) { if (f.got) got++; });
        setText(fishEl, 'fish', got + '/' + fish.length);
        var h = '';
        for (var i = 0; i < LIVES; i++) h += i < lives ? '♥' : '<i>♥</i>';
        if (shown.lives !== h) { shown.lives = h; livesEl.innerHTML = h; }
        if (shown.score !== score) { shown.score = score; api.score(score); }
    }
    function meter() {
        var w = Math.round(spotted * 100) + '%';
        if (shown.meter !== w) { shown.meter = w; barEl.style.width = w; meterEl.classList.toggle('np-hot', spotted > 0.6); }
    }

    /* ---------- noise, words and the house folk ---------- */
    function say(x, y, text, color) { texts.push({ x: x, y: y, text: text, color: color || '#ffe08a', t: 0 }); }
    function noise(x, y, r, label) {
        noises.push({ x: x, y: y, r: r, t: 0 });
        if (label) say(x, y, label);
        dogs.forEach(function (d) { if (Math.hypot(d.m.fx - x, d.m.fy - y) <= r) dogHear(d, x, y); });
        humans.forEach(function (h) { if (Math.hypot(h.m.fx - x, h.m.fy - y) <= r) humanHear(h, x, y); });
    }
    function investigate(o, x, y, speed) {
        var f = from(o.m);
        o.m.path = pathTo(f[0], f[1], Math.floor(x), Math.floor(y), folkOk);
        o.state = 'investigate'; o.speed = speed;
    }
    function humanHear(h, x, y) {
        if (h.state === 'alert') return;
        investigate(h, x, y, H_FAST);
        say(h.m.fx, h.m.fy - 0.2, '?', '#ffd27a');
    }
    function dogHear(d, x, y) {
        if (d.state === 'chase') return;
        if (d.state === 'sleep') { d.state = 'wake'; d.timer = 0.8; d.nx = x; d.ny = y; say(d.m.fx, d.m.fy - 0.2, '!', '#ff9fb5'); return; }
        if (d.state !== 'wake') investigate(d, x, y, 2.6);
    }
    function nextLeg(h) {   /* the human's path to the next waypoint of its route */
        h.ri = (h.ri + 1) % h.route.length;
        var f = from(h.m), w = h.route[h.ri];
        h.m.path = pathTo(f[0], f[1], w[0], w[1], folkOk);
    }
    function updateHuman(h, dt) {
        var m = h.m;
        h.see = sees(m, H_RANGE, H_HALF);
        if (h.see) {
            h.lx = cat.x; h.ly = cat.y;
            if (h.state !== 'alert') { h.state = 'alert'; m.path = []; say(m.fx, m.fy - 0.2, '!', '#ff9fb5'); }
            h.timer = 0.7;
        }
        if (h.state === 'alert') {
            walk(m, dt, H_SLOW);
            if (h.see) turn(m, Math.atan2(cat.fy - m.fy, cat.fx - m.fx), 3.2 * dt);
            else if ((h.timer -= dt) <= 0) investigate(h, h.lx + 0.5, h.ly + 0.5, H_FAST);
        } else if (h.state === 'pause') {
            turn(m, h.look, 2.4 * dt);
            if ((h.timer -= dt) <= 0) { h.state = 'patrol'; nextLeg(h); }
        } else if (h.state === 'patrol') {
            if (walk(m, dt, H_SLOW)) {   /* at a waypoint: stop, then turn toward the next leg (a guard: the next look) */
                h.state = 'pause'; h.timer = h.looks ? 1.8 : 1.3;
                var w = h.route[(h.ri + 1) % h.route.length], p = pathTo(m.x, m.y, w[0], w[1], folkOk);
                h.look = h.looks ? h.looks[++h.li % h.looks.length] : p.length ? Math.atan2(p[0][1] - m.y, p[0][0] - m.x) : m.a;
            }
        } else if (h.state === 'investigate') {
            if (walk(m, dt, h.speed)) { h.state = 'search'; h.timer = 2.6; h.base = m.a; }
        } else if (h.state === 'search') {
            m.a = h.base + Math.sin((2.6 - h.timer) * 2.4) * 1.1;
            if ((h.timer -= dt) <= 0) {   /* back to the closest waypoint, then on with the route */
                var best = 1e9;
                h.route.forEach(function (w, i) {
                    var p = pathTo(m.x, m.y, w[0], w[1], folkOk);
                    if (p.length < best) { best = p.length; h.ri = (i + h.route.length - 1) % h.route.length; }
                });
                h.state = 'patrol'; nextLeg(h);
            }
        }
    }
    function updateDog(d, dt) {
        var m = d.m;
        d.see = 0;
        if (d.state === 'sleep') return;
        if (d.state === 'wake') { if ((d.timer -= dt) <= 0) investigate(d, d.nx, d.ny, 2.6); return; }
        d.see = sees(m, D_RANGE, D_HALF);
        if (d.see) {
            d.lx = cat.x; d.ly = cat.y;
            if (d.state !== 'chase') { d.state = 'chase'; m.path = []; say(m.fx, m.fy - 0.2, '!', '#ff9fb5'); }
            d.timer = 1.2;
        }
        if (d.state === 'chase') {
            if (!m.moving) m.path = pathTo(m.x, m.y, cat.x, cat.y, folkOk).slice(0, 1);
            walk(m, dt, 3.2);
            if (!d.see && (d.timer -= dt) <= 0) investigate(d, d.lx + 0.5, d.ly + 0.5, 2.6);
        } else if (d.state === 'investigate') {
            if (walk(m, dt, d.speed)) { d.state = 'sniff'; d.timer = 1.5; d.base = m.a; }
        } else if (d.state === 'sniff') {
            m.a = d.base + Math.sin((1.5 - d.timer) * 5) * 0.7;
            if ((d.timer -= dt) <= 0) { d.state = 'wander'; d.timer = 5; }
        } else if (d.state === 'wander') {
            if (!m.moving && !m.path.length) {
                var opts = [];
                DIRS.forEach(function (v) { if (folkOk(m.x, m.y, m.x + v[0], m.y + v[1])) opts.push([m.x + v[0], m.y + v[1]]); });
                if (opts.length) m.path = [pick(opts)];
            }
            walk(m, dt, 1.6);
            if ((d.timer -= dt) <= 0 && !m.moving) { d.state = 'return'; m.path = pathTo(m.x, m.y, d.home[0], d.home[1], folkOk); }
        } else if (d.state === 'return') {
            if (walk(m, dt, 2)) {
                if (m.x === d.home[0] && m.y === d.home[1]) { d.state = 'sleep'; m.a = d.home[2]; }
                else m.path = pathTo(m.x, m.y, d.home[0], d.home[1], folkOk);
            }
        }
    }
    function updateVac(v, dt) {
        var m = v.m, len = v.route.length;
        if (v.cool > 0) v.cool -= dt;
        if (!m.moving && !m.path.length) {
            v.ri = (v.ri + v.dir + len) % len;
            m.path = pathTo(m.x, m.y, v.route[v.ri][0], v.route[v.ri][1], vacOk);
        }
        walk(m, dt, 1.5, 5);
        if (v.cool <= 0 && !catUp() && Math.hypot(m.fx - cat.fx, m.fy - cat.fy) < 0.72) {
            v.cool = 1.6;   /* bump: the cat yowls and freezes, the vacuum backs off the way it came */
            if (m.moving) { var tx = m.tx, ty = m.ty; m.tx = m.x; m.ty = m.y; m.x = tx; m.y = ty; m.t = 1 - m.t; }
            v.ri = (v.ri - v.dir + len) % len; v.dir = -v.dir;
            m.path = pathTo(m.tx, m.ty, v.route[v.ri][0], v.route[v.ri][1], vacOk);
            cat.path = []; cat.knock = null; cat.stun = 0.7;
            noise(cat.fx, cat.fy, 5, 'Yowl!');
            api.sfx('hit');
            api.cat('wow');
        }
    }

    /* ---------- the cat ---------- */
    var SDIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
    function keyDir() {
        if (!keyStack.length) return null;
        var v = SDIR[keyStack[keyStack.length - 1]];
        return portrait ? [v[1], v[0]] : v;
    }
    function startStep(nx, ny) {
        cat.a = Math.atan2(ny - cat.y, nx - cat.x);
        if (Math.abs(nx - cat.x) + Math.abs(ny - cat.y) !== 1 || !catOk(cat.x, cat.y, nx, ny)) return false;
        cat.tx = nx; cat.ty = ny; cat.t = 0; cat.moving = true;
        cat.jump = isHigh(at(cat.x, cat.y)) !== isHigh(at(nx, ny));
        if (cat.jump) api.sfx('jump');
        return true;
    }
    function arrive() {
        var jumped = cat.jump;
        cat.x = cat.tx; cat.y = cat.ty; cat.moving = false; cat.t = 0; cat.jump = false;
        place(cat);
        fish.forEach(function (f) {
            if (!f.got && f.x === cat.x && f.y === cat.y) {
                f.got = true; levelFish++; score += 3;
                say(cat.fx, cat.fy - 0.3, '+3', '#9fe3ff'); api.sfx('pop'); hud();
            }
        });
        if (at(cat.x, cat.y) === 'q') { noise(cat.fx, cat.fy, 3.4, 'Squeak!'); api.sfx('tap'); }
        else if (cat.run && !jumped && ++cat.steps % 2 === 0) noise(cat.fx, cat.fy, 2.8, '');
        if (cat.x === goal.x && cat.y === goal.y) cleared();
    }
    function updateCat(dt) {
        if (cat.stun > 0) { cat.stun -= dt; return; }
        var left = dt, guard = 0;
        while (left > 0 && guard++ < 6 && (phase === 'play' || phase === 'intro')) {
            if (!cat.moving) {
                var d = keyDir(), n = null;
                if (d) { cat.path = []; cat.knock = null; cat.mark = null; cat.run = shift; n = [cat.x + d[0], cat.y + d[1]]; }
                else if (cat.path.length) { cat.run = cat.pathRun; n = cat.path[0]; }
                if (!n) {
                    if (cat.knock) { var k = cat.knock; cat.knock = null; if (near8(cat.x, cat.y, k[0], k[1]) && at(k[0], k[1]) === 'V') knock(k[0], k[1]); }
                    cat.mark = null;
                    break;
                }
                if (!startStep(n[0], n[1])) { cat.path = []; cat.mark = null; break; }
                if (!d) cat.path.shift();
            }
            var speed = cat.jump ? 1 / JUMP_T : cat.run ? RUN : WALK, need = (1 - cat.t) / speed;
            if (left >= need) { left -= need; arrive(); } else { cat.t += left * speed; left = 0; }
        }
        place(cat);
    }
    function near8(x, y, vx, vy) { return Math.abs(x - vx) <= 1 && Math.abs(y - vy) <= 1 && (x !== vx || y !== vy); }
    function knock(vx, vy) {
        grid[vy][vx] = 'v';
        var a = Math.atan2(vy - cat.y, vx - cat.x);
        cat.a = a;
        falls.push({ x: vx + 0.5, y: vy + 0.5, a: a, t: 0 });
        noise(vx + 0.5, vy + 0.5, 7, 'Crash!');
        api.sfx('hit');
        renderStatic();
    }
    function knockKey() {   /* E or Space: the vase next to the cat, the one it faces first */
        if (phase !== 'play' && phase !== 'intro') return;
        var best = null, bd = -9;
        for (var y = cat.y - 1; y <= cat.y + 1; y++) for (var x = cat.x - 1; x <= cat.x + 1; x++) {
            if (at(x, y) !== 'V' || (x === cat.x && y === cat.y)) continue;
            var dd = Math.cos(Math.atan2(y - cat.y, x - cat.x) - cat.a);
            if (dd > bd) { bd = dd; best = [x, y]; }
        }
        if (best && !cat.moving) knock(best[0], best[1]);
        else if (best) cat.knock = best;
    }
    function setTarget(tx, ty, run) {
        if (phase !== 'play' && phase !== 'intro') return;
        var f = from(cat);
        if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return;
        if (at(tx, ty) === 'V') {
            if (!cat.moving && near8(cat.x, cat.y, tx, ty)) { cat.path = []; knock(tx, ty); return; }
            var p = findPath(f[0], f[1], catOk, catCost, function (x, y) { return near8(x, y, tx, ty); }, null);
            if (p) { cat.path = p; cat.knock = [tx, ty]; cat.pathRun = run; cat.mark = [tx, ty]; }
            return;
        }
        if (tx === f[0] && ty === f[1]) { cat.path = []; cat.knock = null; cat.mark = null; return; }
        cat.path = findPath(f[0], f[1], catOk, catCost, function (x, y) { return x === tx && y === ty; }, { x: tx, y: ty }) || [];
        cat.knock = null; cat.pathRun = run;
        cat.mark = cat.path.length ? cat.path[cat.path.length - 1] : null;
    }

    /* ---------- caught, cleared, the end ---------- */
    function caught(who) {
        if (phase !== 'play') return;
        phase = 'caught'; phaseT = 0; lives--; flash = 1;
        score -= levelFish * 3; levelFish = 0;
        api.sfx('hit'); api.cat('sad');
        api.say(who === 'dog' ? pick(['Eek, the dog!', 'Woof! Run!']) : pick(['Busted!', 'Oops, seen!', 'Caught in the light!']), 1700);
        card(lives > 0 ? (lives === 1 ? '1 life left' : lives + ' lives left') : 'No lives left',
            who === 'dog' ? 'Woof! Caught!' : 'Caught!', lives > 0 ? 'Back to the basket.' : '', 'np-bad');
        hud();
    }
    function cleared() {
        phase = 'clear'; phaseT = 0; score += 10;
        api.sfx('point'); api.cat('happy');
        api.say(pick(['Nom nom!', 'Purrfect sneaking!', 'Treats secured!', 'Sneaky paws!']), 1600);
        var got = fish.filter(function (f) { return f.got; }).length;
        card('Level ' + (level + 1) + ' cleared', 'Treats!', '+10' + (got ? ', fish +' + got * 3 : ''), 'np-good');
        hud();
    }
    function finish(win) {
        phase = 'over';
        if (win) { score += lives * 5; hud(); api.say('Best night ever!', 2400); }
        api.end({ score: score, win: win,
            text: win ? 'Every treat jar is yours!\nScore ' + score : 'Caught on level ' + (level + 1) + '.\nScore ' + score });
    }

    /* ---------- layout: fit the map to the play area (transposed when the area is tall) ---------- */
    var dpr = 1, W = 0, H = 0, k = 20, ox = 0, oy = 0, SC = MW, SR = MH, portrait = false, narrow = false;
    function fit(s) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, s.w); H = Math.max(1, s.h);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        narrow = W < 640;
        wrapEl.classList.toggle('np-narrow', narrow);
        var top = 48, bottom = narrow ? 74 : 48, aw = W - 20, ah = H - top - bottom;
        var kL = Math.min(aw / MW, ah / MH), kP = Math.min(aw / MH, ah / MW);
        portrait = kP > kL * 1.04;
        k = Math.max(8, Math.floor(portrait ? kP : kL));
        SC = portrait ? MH : MW; SR = portrait ? MW : MH;
        ox = Math.round((W - SC * k) / 2);
        oy = Math.round(top + Math.max(0, (ah - SR * k) / 2));
        cardEl.style.top = Math.round(oy + SR * k * 0.45) + 'px';
        if (grid.length) renderStatic();
    }
    function sx(wx, wy) { return ox + (portrait ? wy : wx) * k; }
    function sy(wx, wy) { return oy + (portrait ? wx : wy) * k; }
    function sa(a) { return portrait ? Math.PI / 2 - a : a; }
    function sAt(c, r) { return portrait ? at(r, c) : at(c, r); }

    /* ---------- the static house, drawn once per level (and after a vase falls) ---------- */
    var WALL = '#262150', WALL_EDGE = '#6159ad', OL = '#3b2a1e';
    function hash(c, r) { return ((c * 73 + r * 151 + c * r * 7) % 97 + 97) % 97; }
    function shape(g, x0, y0, x1, y1, rtl, rtr, rbr, rbl) {
        g.beginPath(); g.moveTo(x0 + rtl, y0);
        g.arcTo(x1, y0, x1, y1, rtr); g.arcTo(x1, y1, x0, y1, rbr);
        g.arcTo(x0, y1, x0, y0, rbl); g.arcTo(x0, y0, x1, y0, rtl); g.closePath();
    }
    /* a tile of a piece of furniture that merges with its neighbours of the same kind (same = [right, down, left, up]) */
    function piece(g, x, y, s, same, ins, rad, col, insBottom) {
        var x0 = x + (same[2] ? 0 : ins), y0 = y + (same[3] ? 0 : ins);
        var x1 = x + s - (same[0] ? 0 : ins), y1 = y + s - (same[1] ? 0 : (insBottom === undefined ? ins : insBottom));
        shape(g, x0, y0, x1, y1, !same[2] && !same[3] ? rad : 0, !same[0] && !same[3] ? rad : 0,
            !same[0] && !same[1] ? rad : 0, !same[2] && !same[1] ? rad : 0);
        g.fillStyle = col; g.fill();
    }
    function sameAs(c, r, set) {
        return DIRS.map(function (d) { return set.indexOf(sAt(c + d[0], r + d[1])) >= 0 && inside(c + d[0], r + d[1]); });
    }
    function inside(c, r) { return c >= 0 && r >= 0 && c < SC && r < SR; }
    function circle(g, x, y, r, col) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col; g.fill(); }

    function renderStatic() {
        stat.width = cv.width; stat.height = cv.height;
        var g = stat.getContext('2d'), c, r, x, y, ch, s = k, i;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#191635'); gr.addColorStop(1, '#2b2455');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        var seed = 11;
        function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        for (i = 0; i < 70; i++) circle(g, rnd() * W, rnd() * H, rnd() < 0.15 ? 1.4 : 0.8, 'rgba(255,255,255,' + (0.25 + rnd() * 0.4).toFixed(2) + ')');
        var b = Math.max(5, Math.round(k * 0.2)), MWs = SC * k, MHs = SR * k;
        g.fillStyle = 'rgba(6,4,22,.5)'; shape(g, ox - b + 3, oy - b + 6, ox + MWs + b + 3, oy + MHs + b + 6, b, b, b, b); g.fill();
        g.fillStyle = WALL; shape(g, ox - b, oy - b, ox + MWs + b, oy + MHs + b, b, b, b, b); g.fill();

        for (r = 0; r < SR; r++) for (c = 0; c < SC; c++) {   /* floors */
            ch = sAt(c, r); x = ox + c * s; y = oy + r * s;
            if (ch === '#') continue;
            var h = hash(c, r), ph = s / 3;
            g.fillStyle = '#37336a'; g.fillRect(x, y, s, s);
            for (i = 0; i < 3; i++) {
                g.fillStyle = ch === 'q' ? ['#55508f', '#5a5494', '#524c8a'][(h + i) % 3] : ['#45407c', '#49447f', '#423d78'][(h + i) % 3];
                g.fillRect(x, y + i * ph + 0.5, s, ph - 1);
                g.fillStyle = '#37336a'; g.fillRect(x + ((h * (i + 2)) % 7 + 1) / 8 * s, y + i * ph, 1, ph);
            }
            if (ch === 'q') {   /* creaky board: cracks */
                g.strokeStyle = '#2a2656'; g.lineWidth = Math.max(1, s * 0.04); g.beginPath();
                g.moveTo(x + s * 0.15, y + s * 0.3); g.lineTo(x + s * 0.35, y + s * 0.42); g.lineTo(x + s * 0.5, y + s * 0.33); g.lineTo(x + s * 0.72, y + s * 0.48);
                g.moveTo(x + s * 0.3, y + s * 0.72); g.lineTo(x + s * 0.5, y + s * 0.62); g.lineTo(x + s * 0.68, y + s * 0.78); g.lineTo(x + s * 0.86, y + s * 0.68);
                g.stroke();
                g.strokeStyle = 'rgba(255,240,200,.28)'; g.beginPath();
                g.moveTo(x + s * 0.12, y + s * 0.12); g.lineTo(x + s * 0.22, y + s * 0.2); g.moveTo(x + s * 0.88, y + s * 0.84); g.lineTo(x + s * 0.78, y + s * 0.9);
                g.stroke();
            }
        }
        for (r = 0; r < SR; r++) for (c = 0; c < SC; c++) {   /* rugs, moonlight, the basket, shadows of walls */
            ch = sAt(c, r); x = ox + c * s; y = oy + r * s;
            if (ch === '#') continue;
            if (ch === '~') {
                var sm = sameAs(c, r, '~');
                piece(g, x, y, s, sm, s * 0.1, s * 0.12, '#8e7cc9');
                piece(g, x, y, s, sm, s * 0.17, s * 0.08, '#6a58a8');
                circle(g, x + s / 2, y + s / 2, s * 0.08, '#8e7cc9');
            }
            if (ch === 'm') {
                g.fillStyle = 'rgba(205,220,255,.16)'; g.fillRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76);
                g.fillStyle = 'rgba(30,26,70,.35)'; g.fillRect(x + s * 0.48, y + s * 0.12, s * 0.05, s * 0.76); g.fillRect(x + s * 0.12, y + s * 0.47, s * 0.76, s * 0.05);
                if (r === 0 || c === 0 || r === SR - 1 || c === SC - 1) {   /* the window it comes through */
                    g.fillStyle = '#a9c1ff';
                    if (r === 0) g.fillRect(x + s * 0.15, oy - b * 0.75, s * 0.7, b * 0.5);
                    else if (r === SR - 1) g.fillRect(x + s * 0.15, oy + MHs + b * 0.25, s * 0.7, b * 0.5);
                    else if (c === 0) g.fillRect(ox - b * 0.75, y + s * 0.15, b * 0.5, s * 0.7);
                    else g.fillRect(ox + MWs + b * 0.25, y + s * 0.15, b * 0.5, s * 0.7);
                }
            }
            if (ch === '@') {
                g.fillStyle = 'rgba(8,6,28,.35)'; g.beginPath(); g.ellipse(x + s * 0.53, y + s * 0.57, s * 0.42, s * 0.36, 0, 0, TAU); g.fill();
                g.fillStyle = '#c58b55'; g.beginPath(); g.ellipse(x + s / 2, y + s / 2, s * 0.42, s * 0.36, 0, 0, TAU); g.fill();
                g.strokeStyle = '#9c6a3c'; g.lineWidth = Math.max(1, s * 0.03);
                for (i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + s / 2, y + s / 2, s * (0.42 - i * 0.04), s * (0.36 - i * 0.04), 0, 0, TAU); g.stroke(); }
                g.fillStyle = '#f2b5c8'; g.beginPath(); g.ellipse(x + s / 2, y + s / 2, s * 0.28, s * 0.23, 0, 0, TAU); g.fill();
            }
            var wu = r === 0 || sAt(c, r - 1) === '#', wl = c === 0 || sAt(c - 1, r) === '#';
            if (wu) { gr = g.createLinearGradient(0, y, 0, y + s * 0.3); gr.addColorStop(0, 'rgba(8,6,28,.45)'); gr.addColorStop(1, 'rgba(8,6,28,0)'); g.fillStyle = gr; g.fillRect(x, y, s, s * 0.3); }
            if (wl) { gr = g.createLinearGradient(x, 0, x + s * 0.18, 0); gr.addColorStop(0, 'rgba(8,6,28,.35)'); gr.addColorStop(1, 'rgba(8,6,28,0)'); g.fillStyle = gr; g.fillRect(x, y, s * 0.18, s); }
        }
        for (r = 0; r < SR; r++) for (c = 0; c < SC; c++) {   /* furniture shadows */
            ch = sAt(c, r); x = ox + c * s; y = oy + r * s;
            if ('TSBCjXHPVv'.indexOf(ch) < 0) continue;
            var round = ch === 'P' || ch === 'V' || ch === 'v';
            g.fillStyle = 'rgba(8,6,28,.38)';
            if (round) { g.beginPath(); g.arc(x + s * 0.56, y + s * 0.6, s * 0.34, 0, TAU); g.fill(); }
            else piece(g, x + s * 0.06, y + s * 0.1, s, ch === 'X' ? [0, 0, 0, 0] : sameAs(c, r, ch === 'C' || ch === 'j' ? 'Cj' : ch), s * 0.06, s * 0.14, 'rgba(8,6,28,.38)');
        }
        for (r = 0; r < SR; r++) for (c = 0; c < SC; c++) {   /* walls and furniture */
            ch = sAt(c, r); x = ox + c * s; y = oy + r * s;
            drawTile(g, ch, c, r, x, y, s);
        }
        var e = Math.max(1.5, s * 0.07);   /* light rim where the floor meets the outer wall */
        g.fillStyle = WALL_EDGE;
        for (c = 0; c < SC; c++) {
            if (sAt(c, 0) !== '#') g.fillRect(ox + c * s, oy - e, s, e);
            if (sAt(c, SR - 1) !== '#') g.fillRect(ox + c * s, oy + MHs, s, e);
        }
        for (r = 0; r < SR; r++) {
            if (sAt(0, r) !== '#') g.fillRect(ox - e, oy + r * s, e, s);
            if (sAt(SC - 1, r) !== '#') g.fillRect(ox + MWs, oy + r * s, e, s);
        }
    }
    function drawTile(g, ch, c, r, x, y, s) {
        var sm, i, e;
        if (ch === '#') {
            g.fillStyle = WALL; g.fillRect(x, y, s, s);
            e = Math.max(1.5, s * 0.07); g.fillStyle = WALL_EDGE;
            if (r > 0 && sAt(c, r - 1) !== '#') g.fillRect(x, y, s, e);
            if (r < SR - 1 && sAt(c, r + 1) !== '#') g.fillRect(x, y + s - e, s, e);
            if (c > 0 && sAt(c - 1, r) !== '#') g.fillRect(x, y, e, s);
            if (c < SC - 1 && sAt(c + 1, r) !== '#') g.fillRect(x + s - e, y, e, s);
        } else if (ch === 'T') {
            sm = sameAs(c, r, 'T');
            piece(g, x, y, s, sm, s * 0.07, s * 0.16, '#b08cb3');
            piece(g, x, y, s, sm, s * 0.13, s * 0.1, '#8a6a90');
            g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; g.beginPath();
            g.moveTo(x + (sm[2] ? 0 : s * 0.2), y + s * 0.4); g.lineTo(x + s - (sm[0] ? 0 : s * 0.2), y + s * 0.4);
            g.moveTo(x + (sm[2] ? 0 : s * 0.2), y + s * 0.65); g.lineTo(x + s - (sm[0] ? 0 : s * 0.2), y + s * 0.65); g.stroke();
        } else if (ch === 'S') {
            sm = sameAs(c, r, 'S');
            piece(g, x, y, s, sm, s * 0.05, s * 0.2, '#4c5fb0');
            g.fillStyle = '#7488da'; shape(g, x + s * 0.17, y + s * 0.17, x + s * 0.83, y + s * 0.83, s * 0.14, s * 0.14, s * 0.14, s * 0.14); g.fill();
            g.fillStyle = 'rgba(255,255,255,.12)'; shape(g, x + s * 0.24, y + s * 0.22, x + s * 0.6, y + s * 0.4, s * 0.08, s * 0.08, s * 0.08, s * 0.08); g.fill();
        } else if (ch === 'B') {
            sm = sameAs(c, r, 'B');
            piece(g, x, y, s, sm, s * 0.04, s * 0.14, '#6d5384');
            piece(g, x, y, s, sm, s * 0.1, s * 0.1, '#d48cb8');
            if (!sm[3]) { g.fillStyle = '#f1e9fb'; shape(g, x + s * 0.18, y + s * 0.14, x + s * 0.82, y + s * 0.44, s * 0.12, s * 0.12, s * 0.12, s * 0.12); g.fill(); }
            else { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = Math.max(1, s * 0.03); g.beginPath(); g.moveTo(x + s * 0.12, y + s * 0.3); g.lineTo(x + s * 0.88, y + s * 0.3); g.stroke(); }
        } else if (ch === 'C' || ch === 'j') {
            sm = sameAs(c, r, 'Cj');
            piece(g, x, y, s, sm, 0, s * 0.1, '#5a6094');
            piece(g, x, y, s, sm, s * 0.05, s * 0.08, '#b9c0e8', s * 0.18);
            piece(g, x, y, s, sm, s * 0.1, s * 0.06, '#9aa2d2', s * 0.23);
            g.fillStyle = 'rgba(255,255,255,.25)';
            for (i = 0; i < 3; i++) g.fillRect(x + s * (0.25 + ((hash(c, r) + i * 31) % 50) / 100), y + s * (0.25 + i * 0.15), 2, 2);
        } else if (ch === 'X') {
            g.fillStyle = '#8c6741'; shape(g, x + s * 0.06, y + s * 0.06, x + s * 0.94, y + s * 0.94, s * 0.08, s * 0.08, s * 0.08, s * 0.08); g.fill();
            g.fillStyle = '#d3a671'; shape(g, x + s * 0.06, y + s * 0.06, x + s * 0.94, y + s * 0.8, s * 0.08, s * 0.08, s * 0.04, s * 0.04); g.fill();
            g.fillStyle = '#ecd3a6'; g.fillRect(x + s * 0.44, y + s * 0.06, s * 0.12, s * 0.74);
            g.strokeStyle = 'rgba(90,60,30,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + s * 0.1, y + s * 0.43); g.lineTo(x + s * 0.9, y + s * 0.43); g.stroke();
        } else if (ch === 'H') {
            sm = sameAs(c, r, 'H');
            piece(g, x, y, s, sm, s * 0.04, s * 0.06, '#3a2e50');
            var cols = ['#e9839f', '#7fc7d9', '#f2c46d', '#9b8be0', '#86d1a2'], n = 5, bw = s * 0.72 / n;
            for (i = 0; i < n; i++) {
                g.fillStyle = cols[(hash(c, r) + i) % cols.length];
                g.fillRect(x + s * 0.14 + i * bw, y + s * (0.18 + ((hash(c, r) + i * 3) % 3) * 0.04), bw - 1.5, s * 0.6);
            }
        } else if (ch === 'P') {
            circle(g, x + s / 2, y + s / 2, s * 0.26, '#c27560');
            circle(g, x + s / 2, y + s / 2, s * 0.2, '#6e4a3a');
            for (i = 0; i < 6; i++) {
                var a = i / 6 * TAU + 0.3;
                g.fillStyle = i % 2 ? '#5cb88c' : '#7fd1a8';
                g.beginPath(); g.ellipse(x + s / 2 + Math.cos(a) * s * 0.2, y + s / 2 + Math.sin(a) * s * 0.2, s * 0.2, s * 0.09, a, 0, TAU); g.fill();
            }
        } else if (ch === 'V' || ch === 'v') {
            circle(g, x + s / 2, y + s / 2, s * 0.3, '#8f79ad');
            circle(g, x + s / 2, y + s / 2, s * 0.25, '#6a5585');
            if (ch === 'v') {   /* the shards stay where the vase fell */
                g.fillStyle = '#78d3cc';
                for (i = 0; i < 7; i++) {
                    var aa = i * 0.9 + 0.4, d = s * (0.32 + (i % 3) * 0.06), px = x + s / 2 + Math.cos(aa) * d, py = y + s / 2 + Math.sin(aa) * d;
                    g.beginPath(); g.moveTo(px, py - s * 0.05); g.lineTo(px + s * 0.06, py + s * 0.03); g.lineTo(px - s * 0.04, py + s * 0.04); g.closePath(); g.fill();
                }
            }
        }
    }

    /* ---------- drawing the moving things ---------- */
    function ell(x, y, rx, ry, col) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
    var FUR = '#f6a23a', STRIPE = '#cf7419';
    function drawCat(x, y, a, lift, alpha) {
        var u = k / 36 * (1 + lift * 0.3), still = api.reducedMotion;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
        ell(k * 0.04, k * 0.1, k * 0.33 * (1 - lift * 0.25), k * 0.2 * (1 - lift * 0.25), 'rgba(8,6,28,.42)');
        if (!lift) ell(0, 0, k * 0.46, k * 0.4, 'rgba(255,214,150,.10)');
        ctx.scale(u, u); ctx.rotate(a);
        var wag = still ? 2 : Math.sin(clock * 4) * 4, st = cat.moving && !cat.jump && !still ? Math.sin(cat.t * Math.PI * 2) * 2.4 : 0;
        ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-17, wag * 0.4 + 2, -21, wag + 5);
        ctx.strokeStyle = OL; ctx.lineWidth = 6.2; ctx.stroke(); ctx.strokeStyle = FUR; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = FUR; ctx.strokeStyle = OL; ctx.lineWidth = 1.3;
        [[5 + st, -6.6], [5 - st, 6.6], [-7 - st, -6.4], [-7 + st, 6.4]].forEach(function (p) {
            ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, TAU); ctx.fill(); ctx.stroke();
        });
        ctx.beginPath(); ctx.ellipse(-2, 0, 11, 7.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = STRIPE; ctx.lineWidth = 1.9; ctx.beginPath();
        ctx.moveTo(-7, -5.6); ctx.quadraticCurveTo(-5.5, 0, -7, 5.6); ctx.moveTo(-3, -6.6); ctx.quadraticCurveTo(-1.5, 0, -3, 6.6);
        ctx.moveTo(1, -6.2); ctx.quadraticCurveTo(2.5, 0, 1, 6.2); ctx.stroke();
        ctx.fillStyle = FUR; ctx.strokeStyle = OL; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(12, -9.5); ctx.lineTo(14, -3); ctx.closePath();
        ctx.moveTo(8, 4); ctx.lineTo(12, 9.5); ctx.lineTo(14, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(10, 0, 6.6, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f7b8c8'; ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(11.8, -8); ctx.lineTo(12.6, -4.6); ctx.closePath();
        ctx.moveTo(10, 5); ctx.lineTo(11.8, 8); ctx.lineTo(12.6, 4.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#dcf57c'; ctx.beginPath(); ctx.arc(13.4, -2.5, 1.5, 0, TAU); ctx.arc(13.4, 2.5, 1.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f08aa6'; ctx.beginPath(); ctx.arc(16.2, 0, 1.1, 0, TAU); ctx.fill();
        ctx.restore();
    }
    function drawHuman(h, x, y) {
        var u = k / 38, m = h.m;
        ctx.save(); ctx.translate(x, y);
        ell(k * 0.05, k * 0.1, k * 0.36, k * 0.3, 'rgba(8,6,28,.4)');
        ctx.scale(u, u); ctx.rotate(sa(m.a));
        ctx.lineCap = 'round'; ctx.strokeStyle = OL; ctx.lineWidth = 6.5;
        ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(11, 5); ctx.moveTo(0, -8); ctx.lineTo(6, -11); ctx.stroke();
        ctx.strokeStyle = '#f4a6c4'; ctx.lineWidth = 4.5; ctx.stroke();
        ctx.fillStyle = '#4a4f6b'; ctx.fillRect(10, 2.6, 9, 4.4);
        ctx.fillStyle = '#fff3c4'; ctx.fillRect(18.4, 2.2, 2.4, 5.2);
        ctx.fillStyle = '#f4a6c4'; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(-1, 0, 7.5, 12.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(-3, i * 6, 1.2, 0, TAU); ctx.arc(2, i * 6 + 3, 1.2, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#f2c9a8'; ctx.beginPath(); ctx.arc(2.5, 0, 6.3, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6e4b3c'; ctx.beginPath(); ctx.arc(0.5, 0, 6.4, Math.PI * 0.55, Math.PI * 1.45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(1, 0, 6.6, Math.PI * 0.62, Math.PI * 1.38); ctx.fill();
        ctx.restore();
    }
    function drawDog(d, x, y) {
        var u = k / 38, m = d.m, still = api.reducedMotion;
        ctx.save(); ctx.translate(x, y);
        ell(k * 0.05, k * 0.1, k * 0.38, k * 0.28, 'rgba(8,6,28,.4)');
        ctx.scale(u, u); ctx.rotate(sa(m.a));
        ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
        if (d.state === 'sleep') {   /* curled up */
            ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 13, 0.6, 2.4); ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.stroke();
            ctx.strokeStyle = '#c9996a'; ctx.lineWidth = 3.8; ctx.stroke();
            ctx.fillStyle = '#c9996a'; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(-1, -1, 11, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#e2bf96'; ctx.beginPath(); ctx.ellipse(-3, 2, 6, 4.5, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#c9996a'; ctx.beginPath(); ctx.arc(6, -4, 6.2, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#8b5a3c'; ctx.beginPath(); ctx.ellipse(4, -9.5, 4.2, 2.6, 0.3, 0, TAU); ctx.fill();
            ctx.fillStyle = '#e2bf96'; ctx.beginPath(); ctx.ellipse(11, -3, 3.4, 2.8, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(6.6, -2.4, 1.6, 0.2, Math.PI - 0.2); ctx.stroke();
        } else {
            var wag = still ? 0 : Math.sin(clock * 14) * 5;
            ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-20, wag);
            ctx.strokeStyle = OL; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = '#c9996a'; ctx.lineWidth = 3.4; ctx.stroke();
            ctx.fillStyle = '#c9996a'; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.ellipse(-2, 0, 13, 8.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#a77b52'; ctx.beginPath(); ctx.ellipse(-5, -1, 5, 4, 0.4, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#5fb6ff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(7, -6); ctx.lineTo(7, 6); ctx.stroke();
            ctx.fillStyle = '#c9996a'; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(12, 0, 7, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#e2bf96'; ctx.beginPath(); ctx.ellipse(18, 0, 4.4, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#2b2033'; ctx.beginPath(); ctx.arc(21.6, 0, 1.7, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(14.5, -3, 1.2, 0, TAU); ctx.arc(14.5, 3, 1.2, 0, TAU); ctx.fill();
            ctx.fillStyle = '#8b5a3c'; ctx.beginPath(); ctx.ellipse(10, -7.5, 4.6, 2.8, -0.3, 0, TAU); ctx.ellipse(10, 7.5, 4.6, 2.8, 0.3, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }
    function drawVac(v, x, y) {
        var u = k / 38, m = v.m;
        ctx.save(); ctx.translate(x, y);
        ell(k * 0.04, k * 0.08, k * 0.36, k * 0.34, 'rgba(8,6,28,.4)');
        ctx.scale(u, u); ctx.rotate(sa(m.a));
        circle(ctx, 0, 0, 13.5, '#8f95b8');
        circle(ctx, 0, 0, 12.3, '#e4e7f5');
        circle(ctx, -1, 0, 7.5, '#c7cce3');
        ctx.strokeStyle = '#8f95b8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, 11, -1.1, 1.1); ctx.stroke();
        var spin = api.reducedMotion ? 0 : clock * 12;
        ctx.strokeStyle = '#6b7194'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (var i = 0; i < 3; i++) { var a = spin + i * TAU / 3; ctx.moveTo(9, -9); ctx.lineTo(9 + Math.cos(a) * 5, -9 + Math.sin(a) * 5); }
        ctx.stroke();
        circle(ctx, 8.5, 0, 1.8, v.cool > 0 || Math.sin(clock * 6) > -0.3 ? '#4fe3ff' : '#2a8fb0');
        ctx.restore();
    }
    function drawCone(m, range, half, warm, hot) {
        var x0 = m.fx + Math.cos(m.a) * 0.25, y0 = m.fy + Math.sin(m.a) * 0.25, N = 28;
        var X0 = sx(x0, y0), Y0 = sy(x0, y0);
        ctx.beginPath(); ctx.moveTo(X0, Y0);
        for (var i = 0; i <= N; i++) {
            var a = m.a - half + 2 * half * i / N, d = ray(x0, y0, a, range), px = x0 + Math.cos(a) * d, py = y0 + Math.sin(a) * d;
            ctx.lineTo(sx(px, py), sy(px, py));
        }
        ctx.closePath();
        var gr = ctx.createRadialGradient(X0, Y0, k * 0.2, X0, Y0, range * k);
        if (warm) {
            gr.addColorStop(0, hot ? 'rgba(255,160,140,.6)' : 'rgba(255,230,160,.55)');
            gr.addColorStop(0.55, hot ? 'rgba(255,140,120,.3)' : 'rgba(255,214,130,.28)');
            gr.addColorStop(1, 'rgba(255,200,110,0)');
        } else {
            gr.addColorStop(0, hot ? 'rgba(255,170,170,.3)' : 'rgba(220,225,255,.16)');
            gr.addColorStop(1, 'rgba(220,225,255,0)');
        }
        ctx.fillStyle = gr; ctx.fill();
    }
    function bubble(x, y, text, col) {
        var r = k * 0.22;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r * 0.8); ctx.lineTo(x, y + r * 1.5); ctx.lineTo(x + r * 0.4, y + r * 0.8); ctx.fill();
        ctx.fillStyle = col; ctx.font = '900 ' + Math.round(r * 1.5) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + r * 0.08);
    }
    function drawFish(x, y, s) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s / 30, s / 30);
        ctx.fillStyle = 'rgba(159,227,255,.18)'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8fd8ff'; ctx.strokeStyle = '#2f5d8a'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-2, -8, 7, 0); ctx.quadraticCurveTo(-2, 8, -10, 0); ctx.closePath();
        ctx.moveTo(6, 0); ctx.lineTo(12, -5); ctx.lineTo(12, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2f5d8a'; ctx.beginPath(); ctx.arc(-5.5, -1, 1.2, 0, TAU); ctx.fill();
        ctx.restore();
    }
    function drawJar(x, y) {
        var p = api.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(clock * 3);
        var gr = ctx.createRadialGradient(x, y, 0, x, y, k * 0.75);
        gr.addColorStop(0, 'rgba(255,214,120,' + (0.35 + p * 0.2).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, k * 0.75, 0, TAU); ctx.fill();
        var w = k * 0.5, h = k * 0.56, x0 = x - w / 2, y0 = y - h / 2 + k * 0.04;
        ctx.fillStyle = 'rgba(8,6,28,.35)'; ctx.beginPath(); ctx.ellipse(x + k * 0.04, y0 + h, w * 0.55, k * 0.08, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(214,236,255,.92)'; ctx.strokeStyle = '#4b5a8f'; ctx.lineWidth = 1.5;
        shape(ctx, x0, y0, x0 + w, y0 + h, w * 0.25, w * 0.25, w * 0.25, w * 0.25); ctx.fill(); ctx.stroke();
        var cols = ['#c97b4a', '#e8a15f', '#f08aa6'];
        for (var i = 0; i < 7; i++) circle(ctx, x0 + w * (0.25 + (i % 3) * 0.25), y0 + h * (0.82 - Math.floor(i / 3) * 0.2), w * 0.11, cols[i % 3]);
        ctx.fillStyle = '#e86a8e'; shape(ctx, x0 - w * 0.06, y0 - h * 0.14, x0 + w * 1.06, y0 + h * 0.08, 3, 3, 3, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x0 + w * 0.16, y0 + h * 0.22, w * 0.1, h * 0.4);
    }
    function drawVase(x, y) {
        var s = k;
        ctx.fillStyle = '#78d3cc'; ctx.strokeStyle = '#2f6b78'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y + s * 0.02, s * 0.17, 0, TAU); ctx.fill(); ctx.stroke();
        circle(ctx, x, y + s * 0.02, s * 0.07, '#2f6b78');
        circle(ctx, x - s * 0.08, y - s * 0.1, s * 0.07, '#ff9ec4');
        circle(ctx, x + s * 0.07, y - s * 0.12, s * 0.06, '#ffd27a');
        circle(ctx, x + s * 0.01, y - s * 0.2, s * 0.06, '#c5a8ff');
    }
    function tileRect(i, j) { return portrait ? [ox + j * k, oy + i * k] : [ox + i * k, oy + j * k]; }

    function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(stat, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var i, x, y, bob = api.reducedMotion ? 0 : Math.sin(clock * 3) * k * 0.04;
        drawJar(sx(goal.x + 0.5, goal.y + 0.5), sy(goal.x + 0.5, goal.y + 0.5));
        fish.forEach(function (f, n) { if (!f.got) drawFish(sx(f.x + 0.5, f.y + 0.5), sy(f.x + 0.5, f.y + 0.5) + (api.reducedMotion ? 0 : Math.sin(clock * 3 + n) * k * 0.04), k * 0.75); });
        for (var r = 0; r < MH; r++) for (var c = 0; c < MW; c++) if (grid[r][c] === 'V') drawVase(sx(c + 0.5, r + 0.5), sy(c + 0.5, r + 0.5));
        falls.forEach(function (f) {   /* the vase tipping off its stand */
            var t = Math.min(1, f.t / 0.35), px = f.x + Math.cos(f.a) * 0.45 * t, py = f.y + Math.sin(f.a) * 0.45 * t;
            ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (f.t - 0.35) / 0.3); drawVase(sx(px, py), sy(px, py)); ctx.restore();
        });
        if (cat.mark && (cat.path.length || cat.knock)) {   /* where a tap sends the cat */
            var mk = cat.mark;
            x = sx(mk[0] + 0.5, mk[1] + 0.5); y = sy(mk[0] + 0.5, mk[1] + 0.5);
            ctx.strokeStyle = cat.pathRun ? 'rgba(255,170,190,.85)' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, k * (0.28 + (api.reducedMotion ? 0 : Math.sin(clock * 6) * 0.03)), 0, TAU); ctx.stroke();
        }
        vacs.forEach(function (v) { drawVac(v, sx(v.m.fx, v.m.fy), sy(v.m.fx, v.m.fy)); });
        dogs.forEach(function (d) { drawDog(d, sx(d.m.fx, d.m.fy), sy(d.m.fx, d.m.fy)); });

        var lift = cat.jump ? Math.sin(cat.t * Math.PI) : 0, hid = catHidden();
        if (api.reducedMotion) lift *= 0.4;
        x = sx(cat.fx, cat.fy); y = sy(cat.fx, cat.fy) - lift * k * 0.15;
        cat.da += clamp(wrap(cat.a - cat.da), -0.5, 0.5);
        drawCat(x, y, sa(cat.da), lift, hid ? 0.8 : 1);
        if (hid) {   /* under furniture: draw it over the cat again, half see-through */
            var tr = tileRect(Math.floor(cat.fx), Math.floor(cat.fy));
            ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.5;
            ctx.drawImage(stat, tr[0] * dpr, tr[1] * dpr, k * dpr, k * dpr, tr[0] * dpr, tr[1] * dpr, k * dpr, k * dpr);
            ctx.restore();
        }
        humans.forEach(function (h) { drawCone(h.m, H_RANGE, H_HALF, true, h.see > 0); });
        dogs.forEach(function (d) { if (d.state !== 'sleep' && d.state !== 'wake') drawCone(d.m, D_RANGE, D_HALF, false, d.see > 0); });
        humans.forEach(function (h) { drawHuman(h, sx(h.m.fx, h.m.fy), sy(h.m.fx, h.m.fy)); });

        noises.forEach(function (n) {
            var t = n.t / 0.7, rr = (api.reducedMotion ? 1 : Math.min(1, n.t / 0.45)) * n.r * k;
            ctx.strokeStyle = 'rgba(255,236,190,' + (0.6 * (1 - t)).toFixed(2) + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sx(n.x, n.y), sy(n.x, n.y), rr, 0, TAU); ctx.stroke();
        });
        humans.forEach(function (h) {
            var hx = sx(h.m.fx, h.m.fy), hy = sy(h.m.fx, h.m.fy) - k * 0.62;
            if (h.state === 'alert') bubble(hx, hy, '!', '#e8577e');
            else if (h.state === 'investigate' || h.state === 'search') bubble(hx, hy, '?', '#e89a2c');
        });
        dogs.forEach(function (d) {
            var dx = sx(d.m.fx, d.m.fy), dy = sy(d.m.fx, d.m.fy) - k * 0.55;
            if (d.state === 'sleep') {
                ctx.fillStyle = 'rgba(220,225,255,.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                for (i = 0; i < 2; i++) {
                    var zt = api.reducedMotion ? i * 0.5 : (clock * 0.5 + i * 0.5) % 1;
                    ctx.font = '800 ' + Math.round(k * (0.22 + zt * 0.14)) + 'px system-ui, sans-serif';
                    ctx.globalAlpha = 1 - zt * 0.8; ctx.fillText('z', dx + k * (0.2 + zt * 0.2), dy - zt * k * 0.3 + bob);
                }
                ctx.globalAlpha = 1;
            } else if (d.state === 'chase' || d.state === 'wake') bubble(dx, dy, '!', '#e8577e');
            else if (d.state === 'investigate' || d.state === 'sniff') bubble(dx, dy, '?', '#e89a2c');
        });
        if (hid) {   /* a small closed eye over the hidden cat */
            var ex = sx(cat.fx, cat.fy), ey = sy(cat.fx, cat.fy) - k * 0.55;
            ctx.fillStyle = 'rgba(255,255,255,.9)'; shape(ctx, ex - k * 0.2, ey - k * 0.12, ex + k * 0.2, ey + k * 0.12, k * 0.12, k * 0.12, k * 0.12, k * 0.12); ctx.fill();
            ctx.strokeStyle = '#5b5690'; ctx.lineWidth = Math.max(1.2, k * 0.04); ctx.beginPath(); ctx.arc(ex, ey - k * 0.04, k * 0.1, 0.3, Math.PI - 0.3); ctx.stroke();
        } else if (spotted > 0.02 && phase === 'play') {
            bubble(sx(cat.fx, cat.fy), sy(cat.fx, cat.fy) - k * 0.6, '!', spotted > 0.6 ? '#e8577e' : '#e89a2c');
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        texts.forEach(function (t) {
            if (t.text === '!' || t.text === '?') return;
            var a = 1 - t.t / 1.1, tx = sx(t.x, t.y), ty = sy(t.x, t.y) - k * 0.4 - (api.reducedMotion ? 0 : t.t * k * 0.5);
            ctx.globalAlpha = Math.max(0, a);
            ctx.font = '900 ' + Math.round(Math.max(11, k * 0.36)) + 'px system-ui, sans-serif';
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,24,70,.85)'; ctx.strokeText(t.text, tx, ty);
            ctx.fillStyle = t.color; ctx.fillText(t.text, tx, ty);
        });
        ctx.globalAlpha = 1;
        if (flash > 0) { ctx.fillStyle = 'rgba(255,110,140,' + (flash * (api.reducedMotion ? 0.15 : 0.3)).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    /* ---------- the loop ---------- */
    function update(dt) {
        clock += dt; phaseT += dt;
        flash = Math.max(0, flash - dt * 1.5);
        noises = noises.filter(function (n) { n.t += dt; return n.t < 0.7; });
        texts = texts.filter(function (t) { t.t += dt; return t.t < 1.1; });
        falls = falls.filter(function (f) { f.t += dt; return f.t < 0.65; });
        if (phase === 'intro') {
            updateCat(dt);
            if (phaseT > 2.6 || anyInput || cat.moving) { phase = 'play'; hideCard(); if (level === 0 && !anyInput) api.say('Psst, the treats are this way!', 1800); }
        } else if (phase === 'play') {
            updateCat(dt);
            if (phase !== 'play') return;
            humans.forEach(function (h) { updateHuman(h, dt); });
            dogs.forEach(function (d) { updateDog(d, dt); });
            vacs.forEach(function (v) { updateVac(v, dt); });
            var rate = 0, who = 'human';
            humans.forEach(function (h) { if (h.see) rate += 0.6 + 1.3 * h.see; });
            dogs.forEach(function (d) { if (d.see) { rate += 0.9 + 1.2 * d.see; who = 'dog'; } });
            if (dbg.god) rate = 0;
            if (rate > 0 && !seenOnce) { seenOnce = true; api.cat('wow'); api.sfx('move'); }
            spotted = rate > 0 ? Math.min(1, spotted + rate * dt) : Math.max(0, spotted - 0.45 * dt);
            if (!dbg.god) {
                humans.forEach(function (h) { if (Math.hypot(h.m.fx - cat.fx, h.m.fy - cat.fy) < 0.75 && !catHidden()) { spotted = 1; who = 'human'; } });
                dogs.forEach(function (d) { if (d.state !== 'sleep' && d.state !== 'wake' && !catUp() && Math.hypot(d.m.fx - cat.fx, d.m.fy - cat.fy) < 0.75) { spotted = 1; who = 'dog'; } });
            }
            if (spotted >= 1) caught(who);
        } else if (phase === 'caught' && phaseT > 1.7) {
            if (lives > 0) startLevel(level); else finish(false);
        } else if (phase === 'clear' && phaseT > 1.7) {
            if (level + 1 < LEVELS.length) startLevel(level + 1); else finish(true);
        }
    }
    api.loop(function (dt) {
        dt *= dbg.speed;
        var n = Math.max(1, Math.ceil(dt / 0.02));
        for (var i = 0; i < n; i++) update(dt / n);
        draw();
        meter();
    });

    /* ---------- controls: keys, and tap or click a tile to walk there (double tap runs) ---------- */
    var KEYS = { arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd', arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r' };
    api.on(window, 'keydown', function (e) {
        if (phase === 'over') return;
        shift = e.shiftKey;
        var key = (e.key || '').toLowerCase(), m = KEYS[key];
        if (m) {
            e.preventDefault(); anyInput = true;
            var i = keyStack.indexOf(m);
            if (i >= 0) keyStack.splice(i, 1);
            keyStack.push(m);
        } else if (key === 'e' || key === ' ') { e.preventDefault(); anyInput = true; knockKey(); }
    });
    api.on(window, 'keyup', function (e) {
        shift = e.shiftKey;
        var m = KEYS[(e.key || '').toLowerCase()], i = m ? keyStack.indexOf(m) : -1;
        if (i >= 0) keyStack.splice(i, 1);
    });
    api.on(window, 'blur', function () { keyStack = []; shift = false; });
    var held = false, lastTap = 0, lastTile = null, tapRun = false;
    function tileAt(e) {
        var b = cv.getBoundingClientRect(), px = e.clientX - b.left, py = e.clientY - b.top;
        var wx = portrait ? (py - oy) / k : (px - ox) / k, wy = portrait ? (px - ox) / k : (py - oy) / k;
        return [Math.floor(wx), Math.floor(wy)];
    }
    api.on(cv, 'pointerdown', function (e) {
        if (e.pointerType === 'touch' && !touchy) { touchy = true; hintEl.textContent = hintText(); }
        if (phase === 'over') return;
        e.preventDefault();
        var t = tileAt(e), now = performance.now();
        tapRun = now - lastTap < 330 && lastTile && Math.abs(lastTile[0] - t[0]) + Math.abs(lastTile[1] - t[1]) <= 2;
        lastTap = now; lastTile = t; held = true; anyInput = true;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not all pointers can be captured */ }
        setTarget(t[0], t[1], tapRun);
    });
    api.on(cv, 'pointermove', function (e) {
        if (!held) return;
        var t = tileAt(e);
        if (t[0] === lastTile[0] && t[1] === lastTile[1]) return;
        lastTile = t;
        if (at(t[0], t[1]) !== 'V') setTarget(t[0], t[1], tapRun);
    });
    ['pointerup', 'pointercancel'].forEach(function (type) { api.on(cv, type, function () { held = false; }); });
    api.on(cv, 'contextmenu', function (e) { e.preventDefault(); });

    /* a hook for the standalone test page only (it defines window.__errors) */
    if (window.__errors) {
        window.__np = {
            dbg: dbg,
            count: LEVELS.length,
            go: function (n) { lives = LIVES; startLevel(n); },
            walk: function (x, y, run) { setTarget(x, y, !!run); },
            knock: knockKey,
            plan: function (x, y) { var f = from(cat); return findPath(f[0], f[1], catOk, catCost, function (a, b) { return a === x && b === y; }, null) || []; },
            visible: function (x, y) {   /* would a cat on this tile be seen right now (with a small margin)? */
                var px = x + 0.5, py = y + 0.5;
                return humans.some(function (h) { return view(h.m, px, py, H_RANGE + 0.4, H_HALF + 0.12) || Math.hypot(h.m.fx - px, h.m.fy - py) < 1.6; }) ||
                    dogs.some(function (d) { return d.state !== 'sleep' && (view(d.m, px, py, D_RANGE + 0.4, D_HALF + 0.1) || Math.hypot(d.m.fx - px, d.m.fy - py) < 1.6); }) ||
                    vacs.some(function (v) { return Math.hypot(v.m.fx - px, v.m.fy - py) < 1.3; });
            },
            screen: function (x, y) { return [sx(x + 0.5, y + 0.5), sy(x + 0.5, y + 0.5)]; },
            solvable: function (n) {   /* a path from the basket to the jar, around walls, furniture and sleeping dogs */
                startLevel(n);
                var p = findPath(start.x, start.y, catOk, null, function (x, y) { return x === goal.x && y === goal.y; }, null);
                return p ? p.length : -1;
            },
            state: function () {
                return { level: level, lives: lives, score: score, phase: phase, spotted: spotted, portrait: portrait, k: k,
                    cat: [cat.x, cat.y], moving: cat.moving, hidden: catHidden(), path: cat.path.length, goal: [goal.x, goal.y],
                    fish: fish.map(function (f) { return [f.x, f.y, f.got]; }),
                    humans: humans.map(function (h) { return [h.m.x, h.m.y, h.state, h.m.a]; }),
                    dogs: dogs.map(function (d) { return [d.m.x, d.m.y, d.state]; }),
                    vacs: vacs.map(function (v) { return [v.m.x, v.m.y]; }),
                    vases: grid.map(function (row) { return row.join(''); }).join('').split('V').length - 1 };
            }
        };
    }

    fit(api.size());
    api.onResize(fit);
    startLevel(0);
    return { destroy: function () { if (window.__np) delete window.__np; } };
});
