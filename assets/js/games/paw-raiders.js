/* Paw Raiders (id paw-raiders): a vertical scrolling shooter. A cat flies a cardboard box rocket up through seven
   worlds (Living Room Clouds, Kitchen Sky, Candy Clouds, Toy Factory, Night Garden, Bubble Sea, Outer Space) and
   throws yarn at rubber ducks, toy planes, robot vacuums, drones, candy jellies, spring bots and jellyfish, each with
   its own flight path and attack. Every world lasts about a minute of waves and ends with its own boss in three
   phases (it changes pattern at 2/3 and 1/3 of its health, every big attack is announced by a glow or a warning
   line); then the rocket flies through a themed cloud bank into the next world. Some worlds add a twist: steam that
   drifts up, treats that float, conveyor belts, gusts of wind, a current. After the last world the worlds loop,
   faster and denser. Power ups: triple yarn, laser pointer beam, shield and a fish magnet; enemies drop fish coins.
   Kills in quick succession build a combo (up to x8), a hit resets it.
   Everything lives in a virtual playfield PW units wide (360 to 510) and PH tall (at least 580), drawn scaled into a
   column in the middle of the play area. The world's scene (parallax layers drawn from cells placed by a hash, so
   nothing visibly repeats) fills the whole area; on wide screens the HUD sits on soft panels beside the column, on
   narrow ones in a thin band at the top. Easy, Normal and Hard change the enemy density, the bullet speed, the fire
   rate and the lives. Shell API: arcade.js. */
Arcade.register('paw-raiders', function (api) {
    'use strict';
    api.css(
        '.pr, .pr-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
        '.pr { overflow: hidden; background: #2a2f55; }' +
        '.pr-cv { touch-action: none; cursor: grab; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }' +
        '.pr-cv.pr-drag { cursor: grabbing; }' +
        '.stage-area.game-paw-raiders ~ .mascot { opacity: .45; pointer-events: none; }');

    /* ---------- constants and small helpers ---------- */
    var TAU = Math.PI * 2, RM = !!api.reducedMotion, MAXP = RM ? 90 : 260;
    var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    var LVL = api.level();
    var D = LVL === 'easy' ? { dens: 0.6, bs: 0.72, fire: 0.5, pat: 0.72, lives: 5, boss: 0.75, drop: 1.35 } :
            LVL === 'hard' ? { dens: 1.55, bs: 1.3, fire: 2, pat: 1.4, lives: 2, boss: 1.25, drop: 0.85 } :
                             { dens: 1.25, bs: 1.12, fire: 1.6, pat: 1.2, lives: 3, boss: 1, drop: 1 };
    var HR = 4.5, KSPD = 300, FR = 8, LASER_DPS = 17, SHOT_V = 560;
    var POW = { triple: 12, laser: 7, shield: 20, magnet: 12 };
    var PNAME = { triple: 'Triple yarn', laser: 'Laser pointer', shield: 'Shield', magnet: 'Fish magnet' };
    var PCOL = { triple: '#ff7ab6', laser: '#ff3b3b', shield: '#5ad1ff', magnet: '#ffc23d' };
    var WORLDS = [
        { name: 'Living Room Clouds', T: 64, pool: { duck: 5, plane: 2, vac: 2 }, boss: 'vac', sky: ['#8ec9ff', '#cfe6ff', '#ffdcec'], dark: false,
          veil: '255,248,252', va: 0.22, bank: ['#ffffff', 'cloud'] },
        { name: 'Kitchen Sky', T: 66, pool: { duck: 3, plane: 4, vac: 2, drone: 2 }, boss: 'toaster', sky: ['#ffd36e', '#ffe9b8', '#ffc3a0'], dark: false,
          veil: '255,246,226', va: 0.22, bank: ['#fff4e6', 'steam'], twist: 'steam' },
        { name: 'Candy Clouds', T: 68, pool: { duck: 2, jelly: 5, plane: 2, drone: 1 }, boss: 'candy', sky: ['#ffa8dc', '#ffd9f0', '#c4e6ff'], dark: false,
          veil: '255,240,250', va: 0.22, bank: ['#ffd1ec', 'sprinkle'], twist: 'float' },
        { name: 'Toy Factory', T: 70, pool: { spring: 4, vac: 3, drone: 2, plane: 2 }, boss: 'golem', sky: ['#4f5d7a', '#7d8daa', '#b9a888'], dark: true,
          veil: '38,44,62', va: 0.2, bank: ['#c9ccd6', 'steam'], twist: 'belt' },
        { name: 'Night Garden', T: 70, pool: { duck: 3, plane: 3, vac: 2, drone: 4 }, boss: 'sprinkler', sky: ['#0d1533', '#1d2a55', '#2d2157'], dark: true,
          veil: '10,16,40', va: 0.2, bank: ['#26346a', 'fly'], twist: 'gust' },
        { name: 'Bubble Sea', T: 72, pool: { jellyfish: 5, duck: 2, drone: 2, plane: 2 }, boss: 'crab', sky: ['#0b4f7a', '#1487a8', '#3fc1c9'], dark: true,
          veil: '6,50,80', va: 0.2, bank: ['#9fe6f5', 'bubble'], twist: 'current' },
        { name: 'Outer Space', T: 74, pool: { duck: 3, plane: 4, vac: 3, drone: 4, jelly: 1, spring: 1, jellyfish: 1 }, boss: 'mother',
          sky: ['#04030c', '#140d33', '#2a1450'], dark: true, veil: '4,3,14', va: 0.22, bank: ['#160f38', 'warp'] }];
    var HINT = { steam: 'Steam clouds drift up', float: 'Treats float slowly here', belt: 'Conveyor belts push you sideways',
        gust: 'Watch out for gusts of wind', current: 'The current pulls you sideways' };
    var BOSS = {
        vac: { name: 'Mega Vac', hp: 230, r: 46 },
        toaster: { name: 'Toaster Titan', hp: 270, r: 48 },
        candy: { name: 'Bonbon Baron', hp: 290, r: 44 },
        golem: { name: 'Gear Golem', hp: 320, r: 48 },
        sprinkler: { name: 'Sprinkler King', hp: 330, r: 44 },
        crab: { name: 'Captain Pinch', hp: 350, r: 48 },
        mother: { name: 'Quackship', hp: 390, r: 54 }};
    var FOE = {
        duck: { hp: 2, r: 13, pts: 100, fish: 1, pow: 0.03 },
        plane: { hp: 2, r: 12, pts: 150, fish: 1, pow: 0.04 },
        drone: { hp: 5, r: 14, pts: 250, fish: 2, pow: 0.12 },
        vac: { hp: 8, r: 19, pts: 300, fish: 3, pow: 0.2 },
        jelly: { hp: 3, r: 14, pts: 120, fish: 1, pow: 0.05 },
        spring: { hp: 4, r: 13, pts: 200, fish: 2, pow: 0.1 },
        jellyfish: { hp: 4, r: 15, pts: 220, fish: 2, pow: 0.1 }};
    var FCOL = { duck: '#ffd23f', plane: '#ff6b6b', drone: '#7df9ff', vac: '#c9c2d6', jelly: '#7ee0a8', spring: '#6fa8dc', jellyfish: '#c49bff' };

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function seeded(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

    /* the cat's colours follow the look picked with the corner mascot (CSS variables of cat.css), ginger if missing */
    var SK = { fur: '#f6a23a', light: '#ffc06e', stripe: '#cf7419', line: '#3b2a1e' };
    (function () {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* ginger */ }
        function v(name, dflt) { var s = cs && cs.getPropertyValue(name).trim(); return s || dflt; }
        var look = document.documentElement.getAttribute('data-cat') || 'ginger';
        SK.fur = v('--fur-bot', SK.fur); SK.light = v('--fur-top', SK.light); SK.stripe = v('--stripe', SK.stripe);
        if (look === 'tuxedo' || look === 'bat' || look === 'hacker') SK.line = '#17181c';
    })();

    /* ---------- page ---------- */
    var wrapEl = document.createElement('div');
    wrapEl.className = 'pr';
    wrapEl.innerHTML = '<canvas class="pr-cv"></canvas>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.pr-cv'), ctx = cv.getContext('2d', { alpha: false });
    var dpr = 1, W = 1, H = 1, SC = 1, PW = 360, PH = 620, OX = 0, wide = false, HB = 0, skyG = [], sprites = {};

    /* ---------- state ---------- */
    var phase = 'play', world = 0, loop = 0, wt = 0, clock = 0, score = 0, shownScore = -1, lives = D.lives;
    var chain = 0, chainT = 0, mult = 1, spawnT = 2.6, pity = 0, overT = 0, ended = false, paused = false, warnT = 0, clearT = 0;
    var ship = { x: 180, y: 560, vx: 0, inv: 0, fireT: 0, tilt: 0, hit: 0 };
    var pw = { triple: 0, laser: 0, shield: 0, magnet: 0 };
    var shots = [], foes = [], bullets = [], items = [], parts = [], pops = [], beams = [], boss = null;
    var keys = {}, fireKey = false, auto = true, drag = null, laserOn = false;
    var shake = 0, redFlash = 0, bgY = 0, trans = null, banner = { text: '', sub: '', t: 9, dur: 3 }, hintT = 0, sfxT = {};
    var belts = [], steams = [], gust = null, beltT = 4, steamT = 2, gustT = 8, twT = 0;
    var test = null;

    function K() { return 1 + 0.06 * world + 0.25 * loop; }     /* every world, and every loop, is a bit harder */
    function BS() { return D.bs * Math.min(1.5, 1 + 0.025 * world + 0.12 * loop); }
    function FK() { return D.fire * K(); }
    function sfx(n, gap) { if (clock - (sfxT[n] || -9) < (gap || 0.07)) return; sfxT[n] = clock; api.sfx(n); }
    function say(text, mood) { if (mood) api.cat(mood); api.say(text, 1800); }
    function show(text, sub, dur) { banner.text = text; banner.sub = sub || ''; banner.t = 0; banner.dur = dur || 3; }

    /* ---------- layout ---------- */
    function fit(s) {
        W = Math.max(1, s.w); H = Math.max(1, s.h);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        SC = Math.min(W / 360, H / 580);
        PH = H / SC;
        PW = Math.min(W / SC, Math.max(360, PH * 0.82));
        OX = (W - PW * SC) / 2;
        wide = OX >= 160;
        HB = wide ? 0 : 32 / SC;
        ship.x = clamp(ship.x, 16, PW - 16); ship.y = clamp(ship.y, HB + 40, PH - 26);
        if (phase === 'play' && clock < 0.1) ship.y = PH - 70;
        skyG = WORLDS.map(function (w) {
            var g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, w.sky[0]); g.addColorStop(0.55, w.sky[1]); g.addColorStop(1, w.sky[2]);
            return g;
        });
        sprites = {};
    }

    /* small cached sprites (glows, bullets, clouds), drawn at the device resolution */
    function sprite(key, size, draw) {
        var sp = sprites[key];
        if (sp) return sp;
        var c = document.createElement('canvas'), px = Math.ceil(size * SC * dpr) + 2;
        c.width = c.height = px;
        var g = c.getContext('2d');
        g.translate(px / 2, px / 2); g.scale(SC * dpr, SC * dpr);
        draw(g);
        sprites[key] = sp = { c: c, s: size };
        return sp;
    }
    function blit(sp, x, y, k) {
        var s = sp.s * (k || 1);
        ctx.drawImage(sp.c, x - s / 2, y - s / 2, s, s);
    }
    var BCOL = { duck: ['#ffd23f', '#a86b00'], dust: ['#c9c2d6', '#5b5470'], plane: ['#ff6b6b', '#8a1f2a'], drone: ['#7df9ff', '#1d6b8a'],
        crumb: ['#f2b56b', '#7a4a1a'], water: ['#7cc8ff', '#1e4f9a'], star: ['#ff9cf0', '#7a2a8a'], butter: ['#fff1a8', '#b8901a'],
        candy: ['#ff7ab6', '#9a1f5a'], gum: ['#7ee08a', '#2a7a3a'], gear: ['#d3dcea', '#34445f'], shell: ['#ff8a5c', '#8a2a10'], bubble: ['#d6f8ff', '#2a7a9a'] };
    function bulletSprite(c, r) {
        return sprite('b' + c + r, r * 2 + 6, function (g) {
            var col = BCOL[c] || BCOL.dust;
            g.fillStyle = col[1]; g.beginPath(); g.arc(0, 0, r + 1.6, 0, TAU); g.fill();
            g.fillStyle = col[0]; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
            g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.15, -r * 0.15, r * 0.48, 0, TAU); g.fill();
        });
    }
    function glowSprite(col, r) {
        return sprite('g' + col + r, r * 2, function (g) {
            var gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        });
    }
    function cloudSprite(tint) {
        return sprite('c' + tint, 120, function (g) {
            g.fillStyle = tint;
            [[-30, 8, 22], [-8, -6, 28], [20, 2, 24], [38, 12, 16], [-44, 16, 14], [4, 16, 24]].forEach(function (p) {
                g.beginPath(); g.arc(p[0], p[1], p[2], 0, TAU); g.fill();
            });
        });
    }

    /* ---------- spawning ---------- */
    function foe(type, x, y, extra) {
        var b = FOE[type], f = { type: type, x: x, y: y, vx: 0, vy: 0, hp: b.hp, r: b.r, t: 0, wait: 0, flash: 0, fireT: rnd(1.5, 4) / FK(),
            state: 'in', ang: Math.PI / 2, spin: Math.random() * TAU, small: false };
        if (loop > 0) f.hp = Math.ceil(f.hp * (1 + 0.3 * loop));
        for (var k in extra) f[k] = extra[k];
        foes.push(f);
        return f;
    }
    function weighted(pool) {
        var tot = 0, k;
        for (k in pool) tot += pool[k];
        var r = Math.random() * tot;
        for (k in pool) { r -= pool[k]; if (r <= 0) return k; }
        return 'duck';
    }
    function squad() {
        var early = world === 0 && loop === 0 && wt < 16, type = early ? 'duck' : weighted(WORLDS[world].pool);
        var dens = D.dens * K(), n, i, side, x0;
        if (type === 'duck') {
            n = Math.round(rnd(3, 5) * (0.75 + 0.25 * dens));
            if (Math.random() < 0.5) {   /* a column wobbling down */
                x0 = rnd(60, PW - 60);
                for (i = 0; i < n; i++) foe('duck', x0, -20 - i * 38, { x0: x0, amp: rnd(30, 60), fq: rnd(1.4, 2.2), ph: i * 0.5, vy: rnd(62, 78) });
            } else {                     /* a row bobbing down together */
                for (i = 0; i < n; i++) {
                    x0 = PW * (i + 0.5) / n;
                    foe('duck', x0, -20 - (i % 2) * 22, { x0: x0, amp: 14, fq: 2.6, ph: i, vy: rnd(55, 66) });
                }
            }
        } else if (type === 'plane') {
            n = Math.round(rnd(3, 5) * (0.8 + 0.2 * dens)); side = Math.random() < 0.5 ? -1 : 1;
            var y0 = HB + rnd(30, 120), v = rnd(160, 200), turn = rnd(0.55, 1.1);
            for (i = 0; i < n; i++) foe('plane', side < 0 ? -24 : PW + 24, y0, { vx: -side * v, vy: 30, turn: turn, wait: i * 0.28, shot: false });
        } else if (type === 'vac') {
            n = dens > 1.2 && Math.random() < 0.5 ? 2 : 1;
            for (i = 0; i < n; i++) foe('vac', n === 1 ? rnd(50, PW - 50) : PW * (0.28 + 0.44 * i), -30,
                { ty: HB + rnd(70, PH * 0.3), dir: Math.random() < 0.5 ? -1 : 1, life: rnd(6, 9) });
        } else if (type === 'jelly') {
            n = Math.round(rnd(2, 3) * (0.8 + 0.2 * dens));
            for (i = 0; i < n; i++) foe('jelly', rnd(40, PW - 40), -20 - i * 46, { vx: (Math.random() < 0.5 ? -1 : 1) * rnd(45, 75), vy: rnd(50, 64) });
        } else if (type === 'spring') {
            n = Math.round(rnd(2, 3) * (0.8 + 0.2 * dens));
            for (i = 0; i < n; i++) foe('spring', rnd(40, PW - 40), -20, { wait: i * 0.45, life: rnd(7, 9), hops: 0 });
        } else if (type === 'jellyfish') {
            n = Math.round(rnd(2, 3) * (0.8 + 0.2 * dens));
            for (i = 0; i < n; i++) foe('jellyfish', PW * (i + 0.5) / n + rnd(-20, 20), -24 - i * 30, { hy: HB + rnd(70, PH * 0.38), life: rnd(6, 8), ph: Math.random() * TAU });
        } else {
            n = Math.round(rnd(2, 3) * (0.8 + 0.2 * dens));
            for (i = 0; i < n; i++) foe('drone', rnd(30, PW - 30), -24, { hx: PW * (i + 0.5) / n + rnd(-20, 20), hy: HB + rnd(60, PH * 0.3),
                life: rnd(7, 9), burst: 0, burstT: 0, wait: i * 0.35 });
        }
    }

    /* ---------- enemy bullets ---------- */
    function bullet(x, y, vx, vy, c, r, extra) {
        var b = { x: x, y: y, vx: vx, vy: vy, c: c, r: r || 5, ax: 0, ay: 0, t: 0, kind: '' };
        for (var k in extra) b[k] = extra[k];
        bullets.push(b);
        return b;
    }
    function aimed(x, y, n, spread, spd, c, r) {
        var a = Math.atan2(ship.y - y, ship.x - x), i;
        spd *= BS();
        for (i = 0; i < n; i++) {
            var aa = a + (n > 1 ? (i - (n - 1) / 2) * spread : 0);
            bullet(x, y, Math.cos(aa) * spd, Math.sin(aa) * spd, c, r);
        }
    }
    function ring(x, y, n, spd, off, c, r, gapAt, gapN) {
        spd *= BS();
        for (var i = 0; i < n; i++) {
            if (gapN && ((i - gapAt + n) % n) < gapN) continue;
            var a = off + i * TAU / n;
            bullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, c, r);
        }
    }
    function canShoot(f) { return f.y > HB + 12 && f.y < ship.y - 90 && phase !== 'over'; }

    /* ---------- enemies ---------- */
    function upFoe(f, dt) {
        f.flash = Math.max(0, f.flash - dt);
        if (f.wait > 0) { f.wait -= dt; return true; }
        f.t += dt; f.spin += dt * 18;
        var fk = FK();
        if (f.type === 'duck') {
            f.y += f.vy * dt; f.x = f.x0 + f.amp * Math.sin(f.t * f.fq + f.ph);
            f.fireT -= dt;
            if (f.fireT <= 0) {
                f.fireT = rnd(3.5, 6.5) / fk;
                if (canShoot(f) && (world > 0 || loop > 0 || wt > 9)) aimed(f.x, f.y + 8, 1, 0, 105, 'duck', 5);
            }
        } else if (f.type === 'plane') {
            if (f.t > f.turn) {
                f.vy = Math.min(205, f.vy + 250 * dt); f.vx *= Math.pow(0.4, dt);
                if (!f.shot) { f.shot = true; if (canShoot(f) && Math.random() < 0.55 * Math.min(1.4, fk)) aimed(f.x, f.y, 1, 0, 150, 'plane', 4.5); }
            }
            f.x += f.vx * dt; f.y += f.vy * dt; f.ang = Math.atan2(f.vy, f.vx);
        } else if (f.type === 'vac') {
            if (f.state === 'in') { f.y += 110 * dt; if (f.y >= f.ty) f.state = 'sweep'; }
            else if (f.state === 'sweep') {
                f.x += f.dir * 72 * dt;
                if (f.x < 34 || f.x > PW - 34) { f.dir = -f.dir; f.x = clamp(f.x, 34, PW - 34); }
                f.life -= dt; f.fireT -= dt;
                if (f.fireT <= 0) { f.fireT = rnd(1.9, 2.5) / fk; if (canShoot(f)) aimed(f.x, f.y + 10, 3, 0.26, 120, 'dust', 5.5); }
                if (f.life <= 0) f.state = 'out';
            } else f.y += 140 * dt;
        } else if (f.type === 'drone') {
            if (f.state === 'in') {
                f.x += (f.hx - f.x) * Math.min(1, dt * 2.6); f.y += (f.hy - f.y) * Math.min(1, dt * 2.6);
                if (Math.abs(f.hy - f.y) < 6) f.state = 'hover';
            } else if (f.state === 'hover') {
                f.x = f.hx + Math.sin(f.t * 2.1) * 10; f.y = f.hy + Math.sin(f.t * 3.3) * 5;
                f.life -= dt; f.fireT -= dt;
                if (f.fireT <= 0) { f.fireT = rnd(2.4, 3) / fk; f.burst = LVL === 'easy' ? 2 : 3; f.burstT = 0; }
                if (f.burst > 0) { f.burstT -= dt; if (f.burstT <= 0) { f.burst -= 1; f.burstT = 0.13; if (canShoot(f)) aimed(f.x, f.y + 8, 1, 0, 170, 'drone', 4.5); } }
                if (f.life <= 0) { f.state = 'out'; f.vx = f.x < PW / 2 ? -190 : 190; f.vy = -50; }
            } else { f.x += f.vx * dt; f.y += f.vy * dt; }
        } else if (f.type === 'jelly') {   /* candy jellies bounce off the walls on the way down and split in two when popped */
            f.x += f.vx * dt; f.y += f.vy * dt;
            if ((f.x < f.r && f.vx < 0) || (f.x > PW - f.r && f.vx > 0)) f.vx = -f.vx;
            f.fireT -= dt;
            if (f.fireT <= 0) { f.fireT = rnd(4, 6) / fk; if (canShoot(f) && !f.small) aimed(f.x, f.y + 8, 1, 0, 120, 'candy', 5); }
        } else if (f.type === 'spring') {   /* spring bots hop down in arcs and every third landing may shoot */
            if (f.hopT === undefined || f.hopT <= 0) {
                if (f.hopT !== undefined) {
                    f.hops += 1;
                    if (f.hops % 3 === 0 && canShoot(f) && Math.random() < 0.5 * Math.min(1.5, fk)) {
                        if (LVL === 'easy') aimed(f.x, f.y, 1, 0, 120, 'gear', 5); else ring(f.x, f.y, LVL === 'hard' ? 7 : 5, 95, Math.random(), 'gear', 5);
                    }
                }
                f.hopT = 0.95; f.x0 = f.x; f.y0 = f.y; f.hx = clamp(f.x + rnd(-80, 80), 24, PW - 24);
                f.hd = f.life <= 0 ? 150 : f.y < HB + PH * 0.4 ? rnd(40, 70) : rnd(-10, 15);
            }
            f.hopT -= dt; f.life -= dt;
            var u = 1 - f.hopT / 0.95;
            f.x = f.x0 + (f.hx - f.x0) * u; f.y = f.y0 + f.hd * u - Math.sin(u * Math.PI) * 38; f.squash = Math.sin(u * Math.PI);
        } else if (f.type === 'jellyfish') {   /* jellyfish pulse down, hover a while and puff rings of bubbles */
            if (f.state !== 'out' && f.y >= f.hy) { f.life -= dt; if (f.life <= 0) f.state = 'out'; }
            f.vy = (f.state === 'out' ? 70 : f.y < f.hy ? 30 : 3) + 50 * Math.max(0, Math.sin(f.t * 3));
            f.y += f.vy * dt; f.x = clamp(f.x + Math.sin(f.t * 0.8 + f.ph) * 22 * dt, 16, PW - 16);
            f.fireT -= dt;
            if (f.fireT <= 0) { f.fireT = rnd(3, 4.5) / fk; if (canShoot(f)) ring(f.x, f.y + 6, LVL === 'easy' ? 4 : 6, 80, Math.random(), 'bubble', 6); }
        }
        return f.y < PH + 50 && f.y > -260 && f.x > -80 && f.x < PW + 80 && !(f.type === 'drone' && f.state === 'out' && f.y < -40);
    }
    function hitFoe(f, dmg) {
        f.hp -= dmg; f.flash = 0.07;
        if (f.hp <= 0) killFoe(f);
    }
    function killFoe(f) {
        if (f.dead) return;
        f.dead = true;
        var b = FOE[f.type], pts = (f.small ? 40 : b.pts) * mult;
        chain += 1; chainT = 2.2; mult = Math.min(8, 1 + Math.floor(chain / 6));
        addScore(pts, f.x, f.y);
        burst(f.x, f.y, f.type === 'vac' ? 16 : 10, FCOL[f.type]);
        if (f.type === 'jelly' && !f.small) for (var s2 = -1; s2 <= 1; s2 += 2) foe('jelly', f.x + s2 * 8, f.y, { small: true, hp: 1, r: 9, vx: s2 * 90, vy: 70 });
        sfx('pop');
        if (test) test.kills += 1;
        if (!f.small) {
            var i, nf = Math.random() < 0.7 ? b.fish : b.fish - 1;
            for (i = 0; i < nf; i++) items.push({ kind: 'fish', x: f.x + rnd(-8, 8), y: f.y, vx: rnd(-40, 40), vy: rnd(-90, -40), t: 0 });
            if (Math.random() < b.pow * D.drop || (pity > 24 && f.type !== 'duck')) dropPow(f.x, f.y);
        }
        if (f.type === 'vac' || f.type === 'drone') kick(3);
    }
    function dropPow(x, y) {
        pity = 0;
        var kinds = ['triple', 'triple', 'laser', 'shield', 'magnet'];
        if (lives <= 1) kinds.push('shield');
        items.push({ kind: pick(kinds), x: x, y: y, vx: rnd(-20, 20), vy: -40, t: 0 });
    }

    /* ---------- the bosses ---------- */
    function startBoss() {
        var w = WORLDS[world], def = BOSS[w.boss], hp = Math.round(def.hp * D.boss * (1 + 0.35 * loop));
        boss = { kind: w.boss, name: def.name, r: def.r, x: PW / 2, y: -90, ty: HB + 120, hp: hp, max: hp, ph: 0, t: 0, pt: 0,
            at: 1.5, at2: 3, ang: 0, dir: 1, state: 'enter', flash: 0, glow: 0, sx: 0, gap: 0, swing: 0, fade: 0 };
        phase = 'boss';
        if (test) test.bosses += 1;
    }
    function bossPhase() {
        var f = boss.hp / boss.max;
        return f > 2 / 3 ? 0 : f > 1 / 3 ? 1 : 2;
    }
    function upBoss(dt) {
        var b = boss, pk = D.pat * K();
        b.t += dt; b.flash = Math.max(0, b.flash - dt); b.glow = Math.max(0, b.glow - dt);
        if (b.state === 'enter') {
            b.y += (b.ty - b.y) * Math.min(1, dt * 1.6);
            if (Math.abs(b.y - b.ty) < 3) { b.state = 'fight'; b.pt = 0; }
            return;
        }
        if (b.state === 'dead') {
            b.fade += dt;
            if (b.fade < 1.6 && Math.random() < dt * 14) burst(b.x + rnd(-b.r, b.r), b.y + rnd(-b.r, b.r), 8, pick(['#fff', '#ffd23f', '#ff8a5c']));
            if (b.fade >= 1.8) { boss = null; worldClear(); }
            return;
        }
        var ph = bossPhase();
        if (ph !== b.ph) {   /* a new phase: a short breather, the bullets on screen fly off harmlessly */
            b.ph = ph; b.pt = 0; b.at = 1.2; b.at2 = 2.4; b.state2 = ''; b.flash = 0.4;
            bullets.forEach(function (q) { q.dead = true; parts.length < MAXP && parts.push({ x: q.x, y: q.y, vx: 0, vy: -30, t: 0, max: 0.4, c: '#fff', s: 3 }); });
            beams.length = 0;
            show(b.name + ' is angry!', 'Phase ' + (ph + 1) + ' of 3', 1.8); sfx('jump'); kick(6);
        }
        b.pt += dt; b.at -= dt * pk; b.at2 -= dt * pk;
        if (b.at < 0.45 || b.at2 < 0.45) b.glow = 0.12;
        var cx = PW / 2, amp = PW / 2 - b.r - 16;
        if (b.kind === 'vac') {
            if (ph === 0) {
                b.x = cx + amp * Math.sin(b.pt * 0.7);
                if (b.at <= 0) { b.at = 1.35; aimed(b.x, b.y + 20, 3, 0.24, 150, 'dust', 6); }
                if (b.at2 <= 0) { b.at2 = 3.6; ring(b.x, b.y, 12, 95, Math.random(), 'dust', 6); }
            } else if (ph === 1) {
                b.x += (cx + 40 * Math.sin(b.pt * 0.5) - b.x) * Math.min(1, dt * 2);
                if (b.at <= 0) { b.at = 1.6; b.ang += 0.5; ring(b.x, b.y, 18, 105, b.ang, 'dust', 6, Math.floor(Math.random() * 18), 4); }
                if (b.at2 <= 0) { b.at2 = 0.8; aimed(b.x, b.y + 20, 1, 0, 170, 'dust', 5.5); }
            } else {   /* aim (a red column shows where it will charge), dash down, come back spinning dust */
                if (!b.state2) { b.state2 = 'aim'; b.st = 0; }
                b.st += dt * pk;
                if (b.state2 === 'aim') {
                    b.x += (clamp(ship.x, b.r, PW - b.r) - b.x) * Math.min(1, dt * 3);
                    if (b.st > 1.1) { b.state2 = 'dash'; b.st = 0; b.sx = b.x; }
                } else if (b.state2 === 'dash') {
                    b.y += 480 * dt * Math.min(1.25, pk);
                    if (b.y > PH * 0.64) { b.state2 = 'back'; b.st = 0; kick(8); ring(b.x, b.y, 10, 90, 0, 'dust', 6); }
                } else {
                    b.y -= 170 * dt; b.ang += dt * 5;
                    if (b.at <= 0) { b.at = 0.09; bullet(b.x, b.y, Math.cos(b.ang) * 120 * BS(), Math.sin(b.ang) * 120 * BS(), 'dust', 5); }
                    if (b.y <= b.ty) { b.y = b.ty; b.state2 = 'rest'; b.st = 0; }
                }
                if (b.state2 === 'rest') {
                    b.x += (cx - b.x) * Math.min(1, dt * 1.5);
                    if (b.at2 <= 0) { b.at2 = 1.1; aimed(b.x, b.y + 20, 5, 0.2, 140, 'dust', 5.5); }
                    if (b.st > 1.6) { b.state2 = 'aim'; b.st = 0; }
                }
            }
        } else if (b.kind === 'toaster') {
            b.x = cx + amp * 0.75 * Math.sin(b.pt * (ph === 2 ? 0.9 : 0.55));
            if (ph === 0) {
                if (b.at <= 0) { b.at = 2.1; toast(b, -1); toast(b, 1); }
                if (b.at2 <= 0) { b.at2 = 1.15; aimed(b.x, b.y + 24, 1, 0, 160, 'crumb', 5.5); }
            } else if (ph === 1) {   /* a fan sweeping across and back, then a pause */
                b.swing += dt * pk;
                var cyc = b.swing % 3.2;
                if (cyc < 2.2 && b.at <= 0) {
                    b.at = 0.085;
                    var u = cyc / 2.2, a = Math.PI / 2 + (u < 0.5 ? -1 + 4 * u : 3 - 4 * u) * 0.75;
                    bullet(b.x, b.y + 24, Math.cos(a) * 165 * BS(), Math.sin(a) * 165 * BS(), 'crumb', 5);
                }
                if (b.at2 <= 0) { b.at2 = 3.6; toast(b, Math.random() < 0.5 ? -1 : 1); }
            } else {   /* butter walls with one gap, and aimed crumbs */
                if (b.at <= 0) { b.at = 2.5; butterWall(); }
                if (b.at2 <= 0) { b.at2 = 1.5; aimed(b.x, b.y + 24, 3, 0.22, 150, 'crumb', 5.5); }
            }
        } else if (b.kind === 'sprinkler') {
            if (ph === 0) {
                b.x = cx + 30 * Math.sin(b.pt * 0.4);
                if (b.pt % 3.2 < dt * pk) b.dir = -b.dir;
                b.ang += dt * 1.5 * b.dir;
                if (b.at <= 0) { b.at = 0.12; arms(b, 2, 115); }
            } else if (ph === 1) {
                b.x = cx + 40 * Math.sin(b.pt * 0.5);
                b.ang += dt * 1.1;
                if (b.at <= 0) { b.at = 0.15; arms(b, 3, 105); }
                if (b.at2 <= 0) { b.at2 = 2.2; aimed(b.x, b.y + 16, 3, 0.18, 175, 'water', 5); }
            } else {
                b.x = cx + amp * 0.8 * Math.sin(b.pt * 0.6);
                b.ang += dt * 1.6 * Math.sin(b.pt * 0.5);
                if (b.at <= 0) { b.at = 0.17; arms(b, 4, 120); }
                if (b.at2 <= 0) { b.at2 = 1.8; aimed(b.x, b.y + 16, 1, 0, 190, 'water', 5); }
            }
        } else if (b.kind === 'mother') {
            b.x = cx + amp * 0.7 * Math.sin(b.pt * 0.5);
            if (ph === 0) {
                if (b.at <= 0) { b.at = 3.6; for (var i = -1; i <= 1; i++) foe('duck', b.x + i * 34, b.y + 30, { x0: b.x + i * 34, amp: 26, fq: 2, ph: i, vy: 80, hp: 1, small: true }); }
                if (b.at2 <= 0) { b.at2 = 1.45; aimed(b.x, b.y + 30, 5, 0.17, 135, 'star', 5.5); }
            } else if (ph === 1) {
                if (b.at <= 0) { b.at = 0.95; b.dir = -b.dir; ring(b.x, b.y, 18, 92, b.dir > 0 ? 0 : Math.PI / 18, 'star', 5.5); }
                if (b.at2 <= 0) { b.at2 = 2.6; aimed(b.x, b.y + 30, 3, 0.2, 165, 'star', 5.5); }
            } else {   /* laser columns: thin lines first, then the beams */
                if (b.at <= 0) {
                    b.at = 3.1;
                    var n = LVL === 'hard' ? 3 : 2, xs = [clamp(ship.x, 20, PW - 20)];
                    while (xs.length < n) { var x = rnd(24, PW - 24), ok = true; xs.forEach(function (q) { if (Math.abs(q - x) < 70) ok = false; }); if (ok) xs.push(x); }
                    xs.forEach(function (x) { beams.push({ x: x, w: 26, t: 0, warn: 1.05, dur: 0.7 }); });
                }
                if (b.at2 <= 0) { b.at2 = 1.0; aimed(b.x, b.y + 30, 1, 0, 150, 'star', 5.5); }
            }
        } else if (b.kind === 'candy') {
            b.x = cx + amp * 0.6 * Math.sin(b.pt * 0.6);
            if (ph === 0) {   /* a spinning cross of candies in bursts, and aimed triples */
                b.ang += dt * 2.2;
                if ((b.pt % 2.6) < 1.5 && b.at <= 0) { b.at = 0.17; arms(b, 4, 110, 'candy'); }
                if (b.at2 <= 0) { b.at2 = 1.7; aimed(b.x, b.y + 24, 3, 0.22, 150, 'candy', 5.5); }
            } else if (ph === 1) {   /* gumdrops that bounce off the walls once */
                if (b.at <= 0) {
                    b.at = 1.9;
                    for (i = -2; i <= 2; i++) { var ga = Math.PI / 2 + i * 0.34; bullet(b.x, b.y + 20, Math.cos(ga) * 140 * BS(), Math.sin(ga) * 140 * BS(), 'gum', 7, { bounce: 1 }); }
                }
                if (b.at2 <= 0) { b.at2 = 3; ring(b.x, b.y, 12, 95, Math.random(), 'candy', 5.5); }
            } else {   /* two lollipop swirls turning against each other */
                b.ang += dt * 1.7;
                if (b.at <= 0) {
                    b.at = 0.16;
                    var sa = b.ang, sb = -b.ang + Math.PI;
                    bullet(b.x, b.y, Math.cos(sa) * 115 * BS(), Math.sin(sa) * 115 * BS(), 'candy', 5);
                    bullet(b.x, b.y, Math.cos(sb) * 115 * BS(), Math.sin(sb) * 115 * BS(), 'gum', 5);
                }
                if (b.at2 <= 0) { b.at2 = 1.5; aimed(b.x, b.y + 24, 1, 0, 165, 'candy', 5.5); }
            }
        } else if (b.kind === 'golem') {
            if (ph === 0) {   /* turning rings of gears */
                b.x = cx + amp * 0.5 * Math.sin(b.pt * 0.5); b.ang += dt * 0.8;
                if (b.at <= 0) { b.at = 1.15; ring(b.x, b.y, 10, 100, b.ang, 'gear', 6); }
                if (b.at2 <= 0) { b.at2 = 2.2; aimed(b.x, b.y + 30, 3, 0.25, 140, 'gear', 5.5); }
            } else if (ph === 1) {   /* hammer slams: a wide striped warning column, then the hammer */
                b.x += (cx - b.x) * Math.min(1, dt);
                if (b.at <= 0) { b.at = 2.3; beams.push({ x: clamp(ship.x, 36, PW - 36), w: 64, t: 0, warn: 1.0, dur: 0.35, kind: 'hammer' }); }
                if (b.at2 <= 0) { b.at2 = 1.6; aimed(b.x, b.y + 30, 3, 0.22, 150, 'gear', 5.5); }
            } else {   /* saw blades that bounce off the walls twice */
                b.x = cx + amp * 0.7 * Math.sin(b.pt * 0.7);
                if (b.at <= 0) { b.at = 2.4; for (i = -1; i <= 1; i += 2) bullet(b.x + i * 30, b.y + 20, i * 120 * BS(), 135 * BS(), 'gear', 10, { kind: 'saw', bounce: 2 }); }
                if (b.at2 <= 0) { b.at2 = 2; ring(b.x, b.y, 14, 95, Math.random(), 'gear', 5.5); }
            }
        } else if (b.kind === 'crab') {
            b.x = cx + amp * 0.6 * Math.sin(b.pt * 0.55);
            if (ph === 0) {   /* aimed pairs from both claws, slow bubble rings */
                if (b.at <= 0) { b.at = 1.25; aimed(b.x - 40, b.y + 24, 2, 0.12, 150, 'shell', 5.5); aimed(b.x + 40, b.y + 24, 2, 0.12, 150, 'shell', 5.5); }
                if (b.at2 <= 0) { b.at2 = 3.2; ring(b.x, b.y, 10, 70, Math.random(), 'bubble', 7); }
            } else if (ph === 1) {   /* a swaying curtain of bubbles with one gap */
                if (b.at <= 0) {
                    b.at = 2.5;
                    var gw = LVL === 'easy' ? 96 : LVL === 'hard' ? 66 : 80, gx = clamp(ship.x + rnd(-100, 100), gw / 2 + 24, PW - gw / 2 - 24);
                    for (var xx = 12; xx < PW; xx += 24) if (Math.abs(xx - gx) > gw / 2) bullet(xx, b.y + 30, 0, 72 * BS(), 'bubble', 7, { kind: 'wavy', x0: xx });
                }
                if (b.at2 <= 0) { b.at2 = 1.7; aimed(b.x, b.y + 20, 1, 0, 160, 'shell', 5.5); }
            } else {   /* claw beams: dashed lines first, one of them where the cat is */
                if (b.at <= 0) {
                    b.at = 2.7;
                    var bx1 = clamp(ship.x, 20, PW - 20), bx2 = clamp(bx1 + (bx1 < PW / 2 ? 1 : -1) * rnd(100, 150), 20, PW - 20);
                    beams.push({ x: bx1, w: 24, t: 0, warn: 0.95, dur: 0.6 }); beams.push({ x: bx2, w: 24, t: 0, warn: 0.95, dur: 0.6 });
                }
                if (b.at2 <= 0) { b.at2 = 2.2; ring(b.x, b.y, 12, 75, Math.random(), 'bubble', 7); }
            }
        }
    }
    function toast(b, side) {   /* a slice of toast pops up, falls back and bursts into crumbs */
        bullet(b.x + side * 20, b.y - 10, side * rnd(50, 120), -rnd(230, 280), 'crumb', 9,
            { kind: 'toast', ay: 300, fuse: HB + rnd(PH * 0.3, PH * 0.5) });
    }
    function butterWall() {
        var gw = LVL === 'easy' ? 96 : LVL === 'hard' ? 64 : 78, gx = clamp(ship.x + rnd(-110, 110), gw / 2 + 10, PW - gw / 2 - 10);
        for (var x = 11; x < PW; x += 22) if (Math.abs(x - gx) > gw / 2) bullet(x, boss.y + 30, 0, 82 * BS(), 'butter', 8, { kind: 'butter' });
    }
    function arms(b, n, spd, c) {
        for (var i = 0; i < n; i++) {
            var a = b.ang + i * TAU / n;
            bullet(b.x + Math.cos(a) * 20, b.y + Math.sin(a) * 20, Math.cos(a) * spd * BS(), Math.sin(a) * spd * BS(), c || 'water', 5);
        }
    }
    function hitBoss(dmg) {
        if (!boss || boss.state !== 'fight') return;
        boss.hp -= dmg; boss.flash = Math.max(boss.flash, 0.05);
        if (boss.hp <= 0) {
            boss.hp = 0; boss.state = 'dead'; boss.fade = 0;
            addScore(5000 * (world + 1) * (1 + loop), boss.x, boss.y);
            bullets.forEach(function (q) {   /* every bullet on screen turns into a fish coin */
                q.dead = true;
                if (items.length < 80) items.push({ kind: 'fish', x: q.x, y: q.y, vx: 0, vy: -40, t: 0 });
            });
            beams.length = 0;
            kick(14); sfx('win'); say('Purrfect!', 'happy');
            if (test) test.beaten += 1;
        }
    }
    function worldClear() {
        phase = 'clear'; clearT = 0;
        var extra = lives < D.lives + 2;
        if (extra) lives += 1;
        show('World cleared!', extra ? '+1 life' : 'Bonus fish', 2);
    }
    function nextWorld() {   /* called in the middle of the cloud bank, when the screen is covered */
        world += 1;
        if (world >= WORLDS.length) { world = 0; loop += 1; }
        wt = 0; spawnT = 2.6; phase = 'play';
        belts.length = 0; gust = null; beltT = 4; gustT = 8; steamT = 1;
        var tw = WORLDS[world].twist;
        show('World ' + (world + 1) + ': ' + WORLDS[world].name, loop ? 'Loop ' + (loop + 1) + ': faster and busier' : tw ? HINT[tw] : '', 3.2);
    }
    function twist(dt) {   /* the world's own twist pushes the ship (belts, gusts, current) or adds steam */
        var tw = WORLDS[world].twist, i;
        twT += dt;
        if (trans && !trans.switched) tw = '';
        if (tw === 'belt') {
            if (phase === 'play' && wt < WORLDS[world].T) { beltT -= dt; if (beltT <= 0) { beltT = rnd(6, 9); belts.push({ y: -20, dir: Math.random() < 0.5 ? -1 : 1 }); } }
        } else if (tw === 'current') {
            ship.x = clamp(ship.x + Math.sin(twT * 0.5) * 34 * dt, 16, PW - 16);
        } else if (tw === 'gust') {
            if (!gust && phase === 'play') { gustT -= dt; if (gustT <= 0) { gustT = rnd(9, 13); gust = { t: 0, dir: Math.random() < 0.5 ? -1 : 1 }; } }
        } else if (tw === 'steam') {
            steamT -= dt;
            if (steamT <= 0 && phase !== 'clear') { steamT = rnd(1.8, 3); steams.push({ x: rnd(30, PW - 30), y: PH + 40, r: rnd(28, 42), t: 0 }); }
        }
        for (i = 0; i < belts.length; i++) {
            var b = belts[i];
            b.y += 55 * dt;
            if (Math.abs(ship.y - b.y) < 15) ship.x = clamp(ship.x + b.dir * 85 * dt, 16, PW - 16);
        }
        belts = belts.filter(function (q) { return q.y < PH + 30; });
        if (gust) {
            gust.t += dt;
            if (gust.t > 1 && gust.t < 2.8) ship.x = clamp(ship.x + gust.dir * 85 * dt, 16, PW - 16);
            if (gust.t > 2.8) gust = null;
        }
        for (i = 0; i < steams.length; i++) { steams[i].y -= 45 * dt; steams[i].t += dt; }
        steams = steams.filter(function (q) { return q.y > -70; });
    }

    /* ---------- player ---------- */
    function addScore(n, x, y) {
        score += n;
        if (x !== undefined) pops.push({ x: x, y: y, t: 0, text: '+' + n, c: mult > 1 ? '#ffd23f' : '#fff' });
    }
    function burst(x, y, n, col) {
        if (RM) n = Math.ceil(n / 2);
        for (var i = 0; i < n && parts.length < MAXP; i++) {
            var a = Math.random() * TAU, v = rnd(40, 170);
            parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: rnd(0.35, 0.7), c: i % 3 ? col : '#fff', s: rnd(2, 4.5) });
        }
    }
    function kick(n) { if (!RM) shake = Math.max(shake, n); }
    function hurt(cause) {
        if (ship.inv > 0 || phase === 'over' || (test && test.dbg.god)) return;
        if (pw.shield > 0) {
            pw.shield = 0; ship.inv = 1.1; sfx('hit'); burst(ship.x, ship.y, 14, '#5ad1ff'); clearNear(70);
            return;
        }
        lives -= 1; ship.inv = 2.3; ship.hit = 0.5;
        chain = 0; mult = 1; pw.triple = 0; pw.laser = 0;
        redFlash = 1; kick(10); sfx('hit', 0); burst(ship.x, ship.y, 22, '#c8955b');
        clearNear(110);
        if (test) test.hits.push(Math.round(test.time * 10) / 10 + ':' + cause);
        if (lives <= 0) {
            phase = 'over'; overT = 0; burst(ship.x, ship.y, 40, SK.fur);
            if (test) test.deadAt = test.time;
        } else say(lives === 1 ? 'Last life, careful!' : 'Ouch!', 'sad');
    }
    function clearNear(rad) {
        bullets.forEach(function (q) { if ((q.x - ship.x) * (q.x - ship.x) + (q.y - ship.y) * (q.y - ship.y) < rad * rad) q.dead = true; });
    }
    function moveShip(dt) {
        var ox = ship.x, g = null, sp = KSPD;
        if (test && test.ctrl) g = test.ctrl(test.view);
        else if (drag) { g = drag; sp = 1700; }
        if (g) {
            var dx = g.x - ship.x, dy = g.y - ship.y, d = Math.sqrt(dx * dx + dy * dy), st = sp * dt;
            if (d > st) { dx *= st / d; dy *= st / d; }
            ship.x += dx; ship.y += dy;
        } else {
            var kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
            if (kx && ky) { kx *= 0.7071; ky *= 0.7071; }
            ship.x += kx * KSPD * dt; ship.y += ky * KSPD * dt;
        }
        ship.x = clamp(ship.x, 16, PW - 16); ship.y = clamp(ship.y, HB + 40, PH - 26);
        ship.vx = dt > 0 ? (ship.x - ox) / dt : 0;
        ship.tilt += (clamp(ship.vx / 900, -0.3, 0.3) - ship.tilt) * Math.min(1, dt * 10);
    }
    function fire(dt) {
        ship.fireT -= dt;
        var firing = phase !== 'over' && (auto || fireKey || (drag && drag.mouse));
        laserOn = firing && pw.laser > 0;
        if (laserOn || !firing || ship.fireT > 0) return;
        ship.fireT = 1 / FR;
        shot(0);
        if (pw.triple > 0) { shot(-0.2); shot(0.2); }
    }
    function shot(a) {
        shots.push({ x: ship.x + a * 30, y: ship.y - 18, vx: Math.sin(a) * SHOT_V, vy: -Math.cos(a) * SHOT_V, spin: Math.random() * TAU, col: pick(['#ff7ab6', '#7ad3ff', '#b28cff', '#7ee08a']) });
    }

    /* ---------- the update ---------- */
    function update(dt) {
        clock += dt;
        if (paused) return;
        shake = Math.max(0, shake - dt * 30); redFlash = Math.max(0, redFlash - dt * 2.4);
        banner.t += dt; hintT += dt;
        bgY += dt * (trans ? 170 : phase === 'boss' ? 26 : 46);
        if (trans) {
            trans.t += dt;
            if (!trans.switched && trans.t >= trans.dur / 2) { trans.switched = true; nextWorld(); }
            if (trans.t >= trans.dur) trans = null;
        }
        if (test) test.time += dt;
        var i, k;
        for (k in pw) pw[k] = Math.max(0, pw[k] - dt);
        ship.inv = Math.max(0, ship.inv - dt); ship.hit = Math.max(0, ship.hit - dt);
        chainT -= dt;
        if (chainT <= 0 && chain) { chain = 0; mult = 1; }
        pity += dt;
        if (phase !== 'over') { moveShip(dt); twist(dt); fire(dt); }
        else { overT += dt; if (overT > 1.5 && !ended) finish(); }

        if (phase === 'play') {
            wt += dt;
            var w = WORLDS[world];
            if (wt < w.T) {
                spawnT -= dt;
                if (spawnT <= 0) {
                    var cap = Math.round(12 * D.dens * K()) + 4;
                    if (foes.length < cap) squad();
                    spawnT = rnd(0.8, 1.25) * (3 - 1.15 * Math.min(1, wt / w.T)) / (D.dens * K());
                }
            } else if (!foes.length || wt > w.T + 7) { phase = 'warn'; warnT = 0; show('Warning!', BOSS[w.boss].name + ' is coming', 2.4); sfx('lose'); api.cat('wow'); }
        } else if (phase === 'warn') {
            warnT += dt;
            if (warnT > 2.4) startBoss();
        } else if (phase === 'clear') {
            clearT += dt;
            if (clearT > 1.6 && !trans) trans = { t: 0, dur: RM ? 1.6 : 2.6, to: (world + 1) % WORLDS.length, switched: false };
        }
        if (boss) upBoss(dt);

        foes = foes.filter(function (f) { return !f.dead && upFoe(f, dt); });
        for (i = 0; i < beams.length; i++) {
            var bm = beams[i];
            if (bm.kind === 'hammer' && bm.t <= bm.warn && bm.t + dt > bm.warn) { kick(7); sfx('hit', 0.2); }
            bm.t += dt;
            if (bm.t > bm.warn && bm.t < bm.warn + bm.dur && Math.abs(ship.x - bm.x) < bm.w / 2 + HR * 0.6) hurt('beam');
        }
        beams = beams.filter(function (q) { return q.t < q.warn + q.dur; });

        /* enemy bullets */
        var hr2;
        for (i = 0; i < bullets.length; i++) {
            var q = bullets[i];
            if (q.dead) continue;
            q.t += dt; q.vx += q.ax * dt; q.vy += q.ay * dt; q.x += q.vx * dt; q.y += q.vy * dt;
            if (q.bounce > 0 && ((q.x < q.r && q.vx < 0) || (q.x > PW - q.r && q.vx > 0))) { q.vx = -q.vx; q.bounce -= 1; }
            if (q.kind === 'wavy') q.x = q.x0 + Math.sin(q.t * 2.5) * 14;
            if (q.kind === 'toast' && q.vy > 0 && q.y > q.fuse) {
                q.dead = true; burst(q.x, q.y, 6, '#f2b56b');
                var n = LVL === 'easy' ? 5 : LVL === 'hard' ? 8 : 6;
                for (k = 0; k < n; k++) { var a = q.t * 3 + k * TAU / n; bullet(q.x, q.y, Math.cos(a) * 105 * BS(), Math.sin(a) * 105 * BS(), 'crumb', 4.5); }
                continue;
            }
            if (q.x < -40 || q.x > PW + 40 || q.y > PH + 40 || (q.y < -60 && q.vy < 0 && q.kind !== 'toast')) { q.dead = true; continue; }
            hr2 = q.r * 0.8 + HR;
            if (phase !== 'over' && (q.x - ship.x) * (q.x - ship.x) + (q.y - ship.y) * (q.y - ship.y) < hr2 * hr2) { q.dead = true; hurt(q.kind || q.c); }
        }
        bullets = bullets.filter(function (q) { return !q.dead; });

        /* yarn and the laser */
        for (i = 0; i < shots.length; i++) {
            var s = shots[i];
            s.x += s.vx * dt; s.y += s.vy * dt; s.spin += dt * 14;
            if (s.y < -20 || s.x < -20 || s.x > PW + 20) { s.dead = true; continue; }
            for (k = 0; k < foes.length; k++) {
                var f = foes[k];
                if (f.dead || f.wait > 0 || f.y < -10) continue;
                var rr = f.r + 4;
                if ((f.x - s.x) * (f.x - s.x) + (f.y - s.y) * (f.y - s.y) < rr * rr) { s.dead = true; hitFoe(f, 1); spark(s.x, s.y, s.col); break; }
            }
            if (!s.dead && boss && boss.state === 'fight') {
                var br = boss.r + 4;
                if ((boss.x - s.x) * (boss.x - s.x) + (boss.y - s.y) * (boss.y - s.y) < br * br) { s.dead = true; hitBoss(1); spark(s.x, s.y, s.col); }
            }
        }
        shots = shots.filter(function (q) { return !q.dead; });
        if (laserOn) {
            var top = -10, lx = ship.x;
            for (k = 0; k < foes.length; k++) {
                var g = foes[k];
                if (!g.dead && g.wait <= 0 && g.y < ship.y && g.y > -10 && Math.abs(g.x - lx) < g.r + 5) { hitFoe(g, LASER_DPS * dt); if (Math.random() < dt * 20) spark(g.x, g.y + g.r * 0.5, '#ff3b3b'); }
            }
            if (boss && boss.state === 'fight' && Math.abs(boss.x - lx) < boss.r && boss.y < ship.y) { hitBoss(LASER_DPS * dt); top = boss.y; if (Math.random() < dt * 20) spark(lx, boss.y + boss.r * 0.6, '#ff3b3b'); }
            laserTop = top;
        }

        /* body contact */
        if (phase !== 'over') {
            for (k = 0; k < foes.length; k++) {
                var e = foes[k], cr = e.r * 0.65 + HR + 2;
                if (!e.dead && e.wait <= 0 && (e.x - ship.x) * (e.x - ship.x) + (e.y - ship.y) * (e.y - ship.y) < cr * cr) { hurt('body ' + e.type); hitFoe(e, 3); }
            }
            if (boss && boss.state !== 'dead') {
                var bc = boss.r * 0.8 + HR;
                if ((boss.x - ship.x) * (boss.x - ship.x) + (boss.y - ship.y) * (boss.y - ship.y) < bc * bc) hurt('boss');
            }
        }

        /* fish coins and power ups (they float in Candy Clouds) */
        var floaty = WORLDS[world].twist === 'float';
        for (i = 0; i < items.length; i++) {
            var it = items[i];
            it.t += dt;
            var dx = ship.x - it.x, dy = ship.y - it.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
            if (it.kind === 'fish' && phase !== 'over' && (pw.magnet > 0 || dd < 56)) {
                var pull = pw.magnet > 0 ? 520 : 300;
                it.vx += dx / dd * pull * dt * 3; it.vy += dy / dd * pull * dt * 3;
                var vv = Math.sqrt(it.vx * it.vx + it.vy * it.vy);
                if (vv > pull) { it.vx *= pull / vv; it.vy *= pull / vv; }
            } else if (it.kind === 'fish') { it.vy = Math.min(floaty ? 32 : 70, it.vy + (floaty ? 70 : 160) * dt); it.vx *= Math.pow(0.3, dt); }
            else { it.vy = Math.min(floaty ? 24 : 46, it.vy + 80 * dt); it.vx = Math.sin(it.t * 2) * 24; }
            it.x += it.vx * dt; it.y += it.vy * dt;
            if (it.y > PH + 20) { it.dead = true; continue; }
            if (phase !== 'over' && dd < 24) {
                it.dead = true;
                if (it.kind === 'fish') { addScore(50 * mult); sfx('point', 0.09); if (test) test.fish += 1; }
                else {
                    pw[it.kind] = POW[it.kind];
                    if (it.kind === 'laser') pw.triple = 0;
                    if (it.kind === 'triple') pw.laser = 0;
                    pops.push({ x: it.x, y: it.y - 10, t: 0, text: PNAME[it.kind] + '!', c: PCOL[it.kind] });
                    sfx('jump', 0); burst(it.x, it.y, 10, PCOL[it.kind]);
                    if (test) test.pows[it.kind] = (test.pows[it.kind] || 0) + 1;
                }
            }
        }
        items = items.filter(function (q) { return !q.dead; });
        for (i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            p.t += dt;
            if (p.t >= p.max) { parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
        }
        pops = pops.filter(function (q) { q.t += dt; return q.t < 0.9; });
    }
    var laserTop = -10;
    function spark(x, y, c) { if (parts.length < MAXP) parts.push({ x: x, y: y, vx: rnd(-60, 60), vy: rnd(-80, 10), t: 0, max: 0.25, c: c, s: 2.5 }); }

    function finish() {
        ended = true;
        var where = (loop ? 'Loop ' + (loop + 1) + ', ' : '') + 'World ' + (world + 1) + ' (' + WORLDS[world].name + ')';
        api.end({ score: score, win: false, text: 'Game over\n' + where + '\nScore ' + score });
    }

    /* ---------- drawing: the worlds ----------
       Each world is a sky gradient, a backdrop (tiles, a rainbow, girders, the moon, light rays) and five parallax
       layers drawn across the whole play area, so the column and the sides are one scene. A layer is an endless
       column of cells; each cell holds n set pieces placed by a hash of the cell number, so nothing repeats in a
       visible tile. sp: scroll speed (1 = the speed of the action), cell: cell height, a: opacity, s: size range,
       rise and fall: extra drift (bubbles, sprinkles). */
    var LAYERS = [
        [{ k: ['window'], sp: 0.1, cell: 300, a: 0.55, s: [0.9, 1.3] }, { k: ['cloud'], sp: 0.25, cell: 150, n: 2, a: 0.8, s: [0.8, 1.5] },
         { k: ['lamp', 'frame', 'plant'], sp: 0.5, cell: 220, a: 0.7, s: [0.9, 1.25] }, { k: ['cushion', 'book'], sp: 0.95, cell: 260, a: 0.7, s: [1, 1.4] },
         { k: ['mote'], sp: 0.7, cell: 60, n: 2, a: 0.7, s: [0.6, 1.2], fall: 6 }],
        [{ k: ['shelf'], sp: 0.1, cell: 320, a: 0.5, s: [0.9, 1.3] }, { k: ['cloud', 'steamPuff'], sp: 0.25, cell: 170, a: 0.6, s: [0.7, 1.2] },
         { k: ['cup', 'teapot', 'jar'], sp: 0.5, cell: 200, a: 0.75, s: [0.9, 1.3] }, { k: ['spoon', 'whisk'], sp: 0.95, cell: 260, a: 0.7, s: [1.1, 1.5] },
         { k: ['crumb'], sp: 0.8, cell: 70, n: 2, a: 0.6, s: [0.6, 1.2] }],
        [{ k: ['hill'], sp: 0.08, cell: 300, a: 0.6, s: [1.2, 1.8] }, { k: ['cloudPink'], sp: 0.22, cell: 150, n: 2, a: 0.85, s: [0.8, 1.4] },
         { k: ['lolli', 'cane'], sp: 0.5, cell: 190, a: 0.8, s: [0.9, 1.3] }, { k: ['gumdrop', 'wrapped'], sp: 0.95, cell: 220, a: 0.75, s: [1, 1.4] },
         { k: ['sprinkle'], sp: 0.85, cell: 36, n: 2, a: 0.85, s: [0.8, 1.2], fall: 30 }],
        [{ k: ['pipeFar'], sp: 0.1, cell: 240, a: 0.45, s: [1, 1.4] }, { k: ['gearFar'], sp: 0.22, cell: 210, a: 0.5, s: [1.1, 1.8] },
         { k: ['belt', 'crate'], sp: 0.5, cell: 180, a: 0.75, s: [0.9, 1.2] }, { k: ['gear', 'bolt'], sp: 0.95, cell: 230, a: 0.7, s: [0.9, 1.3] },
         { k: ['spark'], sp: 0.9, cell: 70, a: 1, s: [0.8, 1.2] }],
        [{ k: ['star'], sp: 0.05, cell: 30, n: 2, a: 0.9, s: [0.6, 1.3] }, { k: ['hedge'], sp: 0.18, cell: 260, a: 0.55, s: [1, 1.6] },
         { k: ['leaf', 'flower'], sp: 0.5, cell: 170, a: 0.75, s: [0.9, 1.3] }, { k: ['grass'], sp: 0.95, cell: 210, a: 0.7, s: [1, 1.5] },
         { k: ['fly'], sp: 0.35, cell: 80, a: 1, s: [0.8, 1.2] }],
        [{ k: ['rock'], sp: 0.1, cell: 260, a: 0.5, s: [1.1, 1.8] }, { k: ['kelp', 'coral'], sp: 0.35, cell: 140, a: 0.7, s: [0.9, 1.4] },
         { k: ['fish'], sp: 0.5, cell: 190, a: 0.85, s: [0.8, 1.2] }, { k: ['shell2', 'starfish'], sp: 0.95, cell: 250, a: 0.7, s: [1, 1.4] },
         { k: ['bubble'], sp: 0.5, cell: 46, a: 0.75, s: [0.6, 1.4], rise: 70 }],
        [{ k: ['star'], sp: 0.04, cell: 24, n: 2, a: 0.85, s: [0.5, 1.1] }, { k: ['nebula'], sp: 0.08, cell: 330, a: 0.45, s: [1.2, 1.8] },
         { k: ['star'], sp: 0.18, cell: 40, a: 1, s: [0.9, 1.6] }, { k: ['planet', 'asteroid'], sp: 0.45, cell: 250, a: 0.8, s: [0.8, 1.3] },
         { k: ['comet', 'asteroid'], sp: 1.05, cell: 280, a: 0.7, s: [0.9, 1.3] }]];
    function hsh(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function blitC(sp, x, y, size) { ctx.drawImage(sp.c, x - size / 2, y - size / 2, size, size); }
    function drawWorld(wi) {
        var w = WORLDS[wi], L = LAYERS[wi], li, k, j, m = 150 * SC;
        ctx.fillStyle = skyG[wi]; ctx.fillRect(0, 0, W, H);
        backdrop(wi);
        for (li = 0; li < L.length; li++) {
            var ly = L[li], cell = ly.cell * SC, n = ly.n || 1;
            var s = bgY * ly.sp * SC * (RM ? 0.6 : 1) + clock * ((ly.fall || 0) - (ly.rise || 0)) * SC * (RM ? 0.3 : 1);
            var k0 = Math.floor((s - cell - H - m) / cell), k1 = Math.ceil((s + m) / cell);
            for (k = k0; k <= k1; k++) for (j = 0; j < n; j++) {
                var hb = k * 7.31 + j * 3.17 + li * 101.3 + wi * 977.7, y = s - k * cell - hsh(hb + 1) * cell;
                if (y < -m || y > H + m) continue;
                ctx.globalAlpha = ly.a;
                deco(ly.k[Math.floor(hsh(hb + 4) * ly.k.length)], hsh(hb + 2) * W, y, (ly.s[0] + (ly.s[1] - ly.s[0]) * hsh(hb + 3)) * SC, hsh(hb + 5), hb);
            }
        }
        ctx.globalAlpha = 1;
        /* a soft veil over the column keeps the bullets readable; it fades out over 180 px, so there is no seam */
        var x0 = OX - 140, x1 = OX + PW * SC + 140, g = ctx.createLinearGradient(x0, 0, x1, 0), f = 180 / (x1 - x0), c = 'rgba(' + w.veil + ',';
        g.addColorStop(0, c + '0)'); g.addColorStop(f, c + w.va + ')'); g.addColorStop(1 - f, c + w.va + ')'); g.addColorStop(1, c + '0)');
        ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, H);
    }
    function backdrop(wi) {
        var t = RM ? 0 : clock, i, x, y;
        if (wi === 1) {   /* faint kitchen tiles, scrolling slowly */
            var ts = 46 * SC, off = (bgY * 0.12 * SC) % (ts * 2);
            ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath();
            for (var ty = -ts * 2 + off, row = 0; ty < H; ty += ts, row++) for (var tx = (row % 2) * ts; tx < W; tx += ts * 2) ctx.rect(tx, ty, ts, ts);
            ctx.fill();
        } else if (wi === 2) {   /* a rainbow far away */
            var R = Math.max(W, H) * 0.8;
            ['#ff9aa2', '#ffd59e', '#fff6a0', '#b5f2c0', '#a8d8ff', '#cdb4ff'].forEach(function (c, j) {
                ctx.globalAlpha = 0.3; ctx.strokeStyle = c; ctx.lineWidth = 16 * SC;
                ctx.beginPath(); ctx.arc(W / 2, H * 1.05, R - j * 16 * SC, Math.PI, 0); ctx.stroke();
            });
        } else if (wi === 3) {   /* the factory wall: girders and beams */
            ctx.fillStyle = 'rgba(20,24,38,.22)';
            for (x = 30 * SC; x < W; x += 150 * SC) ctx.fillRect(x, 0, 12 * SC, H);
            var bo = (bgY * 0.1 * SC) % (190 * SC);
            for (y = bo - 190 * SC; y < H; y += 190 * SC) ctx.fillRect(0, y, W, 9 * SC);
        } else if (wi === 4) {   /* a crescent moon, beside the column on wide screens */
            x = wide ? W - OX / 2 : W * 0.8; y = wide ? H * 0.68 : 64 + 34 * SC;
            ctx.globalAlpha = 0.5; blitC(glowSprite('rgba(255,246,200,.55)', 70), x, y, 150 * SC); ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff6cf'; ctx.beginPath(); ctx.arc(x, y, 30 * SC, 0, TAU); ctx.fill();
            ctx.fillStyle = WORLDS[4].sky[0]; ctx.beginPath(); ctx.arc(x + 12 * SC, y - 8 * SC, 26 * SC, 0, TAU); ctx.fill();
        } else if (wi === 5) {   /* light rays from the surface */
            ctx.fillStyle = 'rgba(210,255,255,.07)';
            for (i = 0; i < 6; i++) {
                x = W * (i / 5) + Math.sin(t * 0.3 + i) * 30 * SC;
                ctx.beginPath(); ctx.moveTo(x - 20 * SC, 0); ctx.lineTo(x + 34 * SC, 0); ctx.lineTo(x + 150 * SC, H); ctx.lineTo(x + 50 * SC, H); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
    function gear(x, y, R, n, rot, col) {   /* a toothed wheel with a hole */
        var i, w = Math.PI / n * 0.45;
        ctx.fillStyle = col; ctx.beginPath();
        for (i = 0; i < n; i++) {
            var a = rot + i * TAU / n, b = a + Math.PI / n;
            ctx.lineTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R); ctx.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R);
            ctx.lineTo(x + Math.cos(b - w) * R * 0.78, y + Math.sin(b - w) * R * 0.78); ctx.lineTo(x + Math.cos(b + w) * R * 0.78, y + Math.sin(b + w) * R * 0.78);
        }
        ctx.closePath(); ctx.moveTo(x + R * 0.28, y); ctx.arc(x, y, R * 0.28, 0, TAU, true); ctx.fill();
    }
    function deco(k, x, y, u, r, hb) {   /* one set piece; u is its scale in pixels per unit, r a random number */
        var a0 = ctx.globalAlpha, t = RM ? 0 : clock, i, sd;
        switch (k) {
            case 'window':   /* a distant window with curtains */
                ctx.fillStyle = '#fff3d9'; rr(x - 34 * u, y - 44 * u, 68 * u, 88 * u, 6 * u); ctx.fill();
                ctx.fillStyle = '#c4e6ff'; ctx.fillRect(x - 28 * u, y - 38 * u, 56 * u, 76 * u);
                ctx.fillStyle = '#fff3d9'; ctx.fillRect(x - 2 * u, y - 38 * u, 4 * u, 76 * u); ctx.fillRect(x - 28 * u, y - 2 * u, 56 * u, 4 * u);
                ctx.fillStyle = r < 0.5 ? '#ffb3cf' : '#b8e0b0';
                for (sd = -1; sd <= 1; sd += 2) {
                    ctx.beginPath(); ctx.moveTo(x + sd * 40 * u, y - 48 * u); ctx.quadraticCurveTo(x + sd * 18 * u, y, x + sd * 36 * u, y + 46 * u);
                    ctx.lineTo(x + sd * 46 * u, y + 46 * u); ctx.lineTo(x + sd * 46 * u, y - 48 * u); ctx.fill();
                }
                break;
            case 'cloud': blitC(cloudSprite('#ffffff'), x, y, 120 * u); break;
            case 'cloudPink': blitC(cloudSprite(r < 0.5 ? '#ffe0f2' : '#fff4fb'), x, y, 120 * u); break;
            case 'steamPuff': ctx.globalAlpha = a0 * 0.6; blitC(cloudSprite('#ffffff'), x, y + Math.sin(t + hb) * 6 * u, 80 * u); break;
            case 'mote': ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + Math.sin(t * 0.7 + hb) * 10 * u, y, 2 * u, 0, TAU); ctx.fill(); break;
            case 'lamp':
                ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(x - 14 * u, y); ctx.lineTo(x + 14 * u, y); ctx.lineTo(x + 8 * u, y - 16 * u); ctx.lineTo(x - 8 * u, y - 16 * u); ctx.fill();
                ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x - 1.5 * u, y, 3 * u, 18 * u); ctx.fillRect(x - 8 * u, y + 18 * u, 16 * u, 3 * u); break;
            case 'frame':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * 0.4 - 0.2);
                ctx.fillStyle = '#c9905a'; ctx.fillRect(-18 * u, -14 * u, 36 * u, 28 * u);
                ctx.fillStyle = '#bfe6ff'; ctx.fillRect(-13 * u, -9 * u, 26 * u, 18 * u);
                ctx.fillStyle = '#7cc47f'; ctx.beginPath(); ctx.moveTo(-13 * u, 9 * u); ctx.lineTo(-2 * u, -3 * u); ctx.lineTo(13 * u, 9 * u); ctx.fill(); ctx.restore(); break;
            case 'plant':
                ctx.fillStyle = '#5fae6a';
                for (i = -2; i <= 2; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate(i * 0.45 + Math.sin(t + hb) * 0.05); ctx.beginPath(); ctx.ellipse(0, -14 * u, 5 * u, 13 * u, 0, 0, TAU); ctx.fill(); ctx.restore(); }
                ctx.fillStyle = '#d9825b'; ctx.beginPath(); ctx.moveTo(x - 11 * u, y - 2 * u); ctx.lineTo(x + 11 * u, y - 2 * u); ctx.lineTo(x + 8 * u, y + 14 * u); ctx.lineTo(x - 8 * u, y + 14 * u); ctx.fill(); break;
            case 'cushion':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * TAU + t * 0.1);
                ctx.fillStyle = r < 0.5 ? '#ff9fc4' : '#9fd6a8'; rr(-22 * u, -16 * u, 44 * u, 32 * u, 12 * u); ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(0, 0, 3 * u, 0, TAU); ctx.fill(); ctx.restore(); break;
            case 'book':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * TAU - t * 0.12);
                ctx.fillStyle = ['#e26d5a', '#5a8fe2', '#e2b85a'][Math.floor(r * 3)]; rr(-14 * u, -18 * u, 28 * u, 36 * u, 3 * u); ctx.fill();
                ctx.fillStyle = '#fff8e8'; ctx.fillRect(10 * u, -16 * u, 3 * u, 32 * u); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-8 * u, -8 * u, 14 * u, 3 * u); ctx.restore(); break;
            case 'shelf':
                ctx.fillStyle = '#b07a42'; ctx.fillRect(x - 60 * u, y, 120 * u, 7 * u);
                for (i = 0; i < 3; i++) { ctx.fillStyle = ['#ffffff', '#ff9a7a', '#9ad0ff'][i]; rr(x - 45 * u + i * 34 * u, y - 22 * u, 20 * u, 22 * u, 4 * u); ctx.fill(); }
                break;
            case 'cup':
                ctx.fillStyle = r < 0.5 ? '#ffffff' : '#9ad0ff'; rr(x - 12 * u, y - 10 * u, 24 * u, 20 * u, 5 * u); ctx.fill();
                ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(x + 13 * u, y - 1 * u, 5 * u, -1.3, 1.3); ctx.stroke();
                ctx.fillStyle = '#c47a3a'; ctx.fillRect(x - 10 * u, y - 9 * u, 20 * u, 3 * u); break;
            case 'teapot':
                ctx.fillStyle = r < 0.5 ? '#ff9a7a' : '#a8e0c0'; ctx.beginPath(); ctx.ellipse(x, y, 18 * u, 14 * u, 0, 0, TAU); ctx.fill();
                ctx.beginPath(); ctx.moveTo(x + 14 * u, y); ctx.lineTo(x + 28 * u, y - 10 * u); ctx.lineTo(x + 26 * u, y - 4 * u); ctx.lineTo(x + 14 * u, y + 6 * u); ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y - 14 * u, 4 * u, 0, TAU); ctx.fill(); break;
            case 'jar':
                ctx.fillStyle = '#ffffff'; rr(x - 11 * u, y - 16 * u, 22 * u, 30 * u, 5 * u); ctx.fill();
                ctx.fillStyle = r < 0.5 ? '#e2475a' : '#f2a43a'; rr(x - 9 * u, y - 6 * u, 18 * u, 18 * u, 4 * u); ctx.fill();
                ctx.fillStyle = '#d64545'; ctx.fillRect(x - 12 * u, y - 20 * u, 24 * u, 6 * u); break;
            case 'spoon':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * TAU + t * 0.2);
                ctx.fillStyle = '#d5dbe6'; ctx.beginPath(); ctx.ellipse(0, -14 * u, 6 * u, 8 * u, 0, 0, TAU); ctx.fill(); ctx.fillRect(-1.5 * u, -8 * u, 3 * u, 24 * u); ctx.restore(); break;
            case 'whisk':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * TAU - t * 0.2);
                ctx.fillStyle = '#c9905a'; ctx.fillRect(-2.5 * u, 4 * u, 5 * u, 18 * u);
                ctx.strokeStyle = '#d5dbe6'; ctx.lineWidth = 1.6 * u;
                for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, -10 * u, (3 + i * 3) * u, 14 * u, 0, 0, TAU); ctx.stroke(); }
                ctx.restore(); break;
            case 'crumb': ctx.fillStyle = '#c98a4a'; ctx.beginPath(); ctx.arc(x, y, 2.4 * u, 0, TAU); ctx.fill(); break;
            case 'hill':   /* a far candy hill with drips */
                ctx.fillStyle = ['#ffc6e5', '#c8f0d8', '#fff0b3'][Math.floor(r * 3)];
                ctx.beginPath(); ctx.ellipse(x, y, 110 * u, 55 * u, 0, 0, TAU); ctx.fill();
                for (i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(x + i * 34 * u, y + 52 * u, 10 * u, 0, TAU); ctx.fill(); }
                break;
            case 'lolli':   /* a lollipop tower */
                ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3 * u, y, 6 * u, 80 * u);
                ctx.fillStyle = ['#ff7ab6', '#7ad3ff', '#b28cff', '#ffd23f'][Math.floor(r * 4)]; ctx.beginPath(); ctx.arc(x, y, 24 * u, 0, TAU); ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5 * u; ctx.beginPath();
                for (i = 0; i < 30; i++) { var sa = i * 0.5 + t * 0.6, sr = i * 0.75 * u; ctx.lineTo(x + Math.cos(sa) * sr, y + Math.sin(sa) * sr); }
                ctx.stroke(); break;
            case 'cane':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r - 0.5); ctx.lineCap = 'round'; ctx.lineWidth = 8 * u;
                ctx.beginPath(); ctx.moveTo(0, 50 * u); ctx.lineTo(0, -20 * u); ctx.arc(12 * u, -20 * u, 12 * u, Math.PI, 0); ctx.strokeStyle = '#ffffff'; ctx.stroke();
                ctx.setLineDash([7 * u, 7 * u]); ctx.strokeStyle = '#ff4d6d'; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt'; ctx.restore(); break;
            case 'gumdrop':
                ctx.fillStyle = ['#7ee08a', '#ff8fc8', '#ffd23f', '#8fb6ff'][Math.floor(r * 4)];
                ctx.beginPath(); ctx.moveTo(x - 16 * u, y + 10 * u); ctx.quadraticCurveTo(x - 16 * u, y - 16 * u, x, y - 16 * u); ctx.quadraticCurveTo(x + 16 * u, y - 16 * u, x + 16 * u, y + 10 * u); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.75)'; for (i = 0; i < 5; i++) { ctx.fillRect(x + (hsh(hb + i) - 0.5) * 22 * u, y + (hsh(hb + i + 9) - 0.6) * 18 * u, 2 * u, 2 * u); }
                break;
            case 'wrapped':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * TAU + t * 0.3);
                ctx.fillStyle = r < 0.5 ? '#ffb347' : '#b28cff';
                ctx.beginPath(); ctx.moveTo(-10 * u, 0); ctx.lineTo(-22 * u, -9 * u); ctx.lineTo(-22 * u, 9 * u); ctx.closePath(); ctx.moveTo(10 * u, 0); ctx.lineTo(22 * u, -9 * u); ctx.lineTo(22 * u, 9 * u); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, 12 * u, 0, TAU); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.arc(0, 0, 7 * u, -1, 1.2); ctx.stroke(); ctx.restore(); break;
            case 'sprinkle':
                ctx.save(); ctx.translate(x + Math.sin(t + hb) * 8 * u, y); ctx.rotate(r * TAU + t * 2);
                ctx.fillStyle = ['#ff4d8d', '#4dd2ff', '#ffd23f', '#7ee08a', '#b28cff'][Math.floor(r * 5)]; rr(-4 * u, -1.3 * u, 8 * u, 2.6 * u, 1.3 * u); ctx.fill(); ctx.restore(); break;
            case 'pipeFar':
                ctx.fillStyle = '#39445e'; ctx.fillRect(x - 9 * u, y - 110 * u, 18 * u, 220 * u);
                ctx.fillStyle = '#4a5674'; for (i = -1; i <= 1; i++) ctx.fillRect(x - 13 * u, y + i * 70 * u - 5 * u, 26 * u, 10 * u);
                break;
            case 'gearFar': gear(x, y, 46 * u, 12, (r < 0.5 ? -1 : 1) * t * 0.3 + r * 6, '#3a4560'); break;
            case 'gear': gear(x, y, 22 * u, 9, (r < 0.5 ? -1 : 1) * t * 0.9 + r * 6, r < 0.5 ? '#d9a441' : '#9aa6b8'); break;
            case 'belt':   /* a little conveyor carrying a crate */
                ctx.fillStyle = '#2b3040'; rr(x - 64 * u, y - 7 * u, 128 * u, 14 * u, 7 * u); ctx.fill();
                ctx.fillStyle = '#6b7488'; for (i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(x + i * 18 * u, y, 4 * u, 0, TAU); ctx.fill(); }
                var bx = x - 52 * u + ((t * 22 + hb * 13) % 104) * u;
                ctx.fillStyle = r < 0.5 ? '#ff7a5a' : '#5ab0ff'; rr(bx - 9 * u, y - 25 * u, 18 * u, 18 * u, 3 * u); ctx.fill(); break;
            case 'crate':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * 0.6 - 0.3);
                ctx.fillStyle = '#c8955b'; ctx.fillRect(-13 * u, -13 * u, 26 * u, 26 * u);
                ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 2 * u; ctx.strokeRect(-13 * u, -13 * u, 26 * u, 26 * u);
                ctx.beginPath(); ctx.moveTo(-13 * u, -13 * u); ctx.lineTo(13 * u, 13 * u); ctx.moveTo(13 * u, -13 * u); ctx.lineTo(-13 * u, 13 * u); ctx.stroke(); ctx.restore(); break;
            case 'bolt':
                ctx.fillStyle = '#b8c0cc'; ctx.beginPath();
                for (i = 0; i < 6; i++) { var ba = r * 3 + t * 0.5 + i * TAU / 6; ctx.lineTo(x + Math.cos(ba) * 9 * u, y + Math.sin(ba) * 9 * u); }
                ctx.closePath(); ctx.moveTo(x + 3.5 * u, y); ctx.arc(x, y, 3.5 * u, 0, TAU, true); ctx.fill(); break;
            case 'spark':
                if (!RM && (t * 2.5 + hb) % 1 > 0.45) break;
                ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.6 * u; ctx.beginPath();
                ctx.moveTo(x - 5 * u, y); ctx.lineTo(x + 5 * u, y); ctx.moveTo(x, y - 5 * u); ctx.lineTo(x, y + 5 * u); ctx.stroke(); break;
            case 'star':
                ctx.globalAlpha = a0 * (RM ? 1 : 0.6 + 0.4 * Math.sin(clock * 2 + hb)); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1.7 * u, 1.7 * u); break;
            case 'hedge':
                ctx.fillStyle = '#16362c';
                for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + (i - 1.5) * 26 * u, y + (i % 2) * 10 * u, 26 * u, 0, TAU); ctx.fill(); }
                break;
            case 'leaf':
                ctx.save(); ctx.translate(x, y); ctx.rotate(r * TAU + Math.sin(t * 0.8 + hb) * 0.15); ctx.fillStyle = r < 0.5 ? '#1f4a3a' : '#28584a';
                ctx.beginPath(); ctx.ellipse(0, 0, 34 * u, 13 * u, 0, 0, TAU); ctx.fill();
                ctx.strokeStyle = 'rgba(120,190,150,.35)'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.moveTo(-30 * u, 0); ctx.lineTo(30 * u, 0); ctx.stroke(); ctx.restore(); break;
            case 'flower':
                ctx.fillStyle = r < 0.5 ? '#6a4c9a' : '#3d6aa8';
                for (i = 0; i < 5; i++) { var fa = r * 6 + i * TAU / 5; ctx.beginPath(); ctx.arc(x + Math.cos(fa) * 9 * u, y + Math.sin(fa) * 9 * u, 7 * u, 0, TAU); ctx.fill(); }
                ctx.fillStyle = '#e8c45a'; ctx.beginPath(); ctx.arc(x, y, 5 * u, 0, TAU); ctx.fill(); break;
            case 'grass':
                ctx.strokeStyle = '#2c5a40'; ctx.lineWidth = 3 * u; ctx.lineCap = 'round'; ctx.beginPath();
                for (i = -2; i <= 2; i++) { ctx.moveTo(x + i * 6 * u, y + 20 * u); ctx.quadraticCurveTo(x + i * 8 * u, y, x + i * 10 * u + Math.sin(t + hb + i) * 6 * u, y - 22 * u); }
                ctx.stroke(); ctx.lineCap = 'butt'; break;
            case 'fly':
                ctx.globalAlpha = a0 * (RM ? 0.8 : 0.5 + 0.5 * Math.sin(clock * 3 + hb * 3));
                blitC(glowSprite('rgba(220,255,120,.9)', 12), x + Math.sin(t * 0.9 + hb) * 16 * u, y + Math.cos(t * 0.7 + hb) * 10 * u, 24 * u); break;
            case 'rock':
                ctx.fillStyle = '#0f3d58'; ctx.beginPath();
                for (i = 0; i < 7; i++) { var ra = i * TAU / 7, rl = (40 + hsh(hb + i) * 24) * u; ctx.lineTo(x + Math.cos(ra) * rl * 1.4, y + Math.sin(ra) * rl * 0.8); }
                ctx.fill(); break;
            case 'kelp':
                ctx.strokeStyle = r < 0.5 ? '#2f8f5a' : '#3fa86a'; ctx.lineWidth = 6 * u; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + 60 * u);
                for (i = 1; i <= 6; i++) ctx.lineTo(x + Math.sin(t * 1.2 + hb + i * 0.8) * 9 * u, y + 60 * u - i * 22 * u);
                ctx.stroke(); ctx.lineCap = 'butt'; break;
            case 'coral':
                ctx.strokeStyle = r < 0.5 ? '#ff7f9f' : '#ffa25a'; ctx.lineWidth = 5 * u; ctx.lineCap = 'round'; ctx.beginPath();
                ctx.moveTo(x, y + 24 * u); ctx.lineTo(x, y - 6 * u); ctx.lineTo(x - 12 * u, y - 22 * u); ctx.moveTo(x, y - 6 * u); ctx.lineTo(x + 14 * u, y - 18 * u);
                ctx.moveTo(x, y + 8 * u); ctx.lineTo(x - 16 * u, y - 2 * u); ctx.stroke(); ctx.lineCap = 'butt'; break;
            case 'fish':   /* a little school swimming across */
                var dir = r < 0.5 ? 1 : -1, span = W + 160, fx = (((x + t * 34 * dir * u) % span) + span) % span - 80;
                ctx.fillStyle = ['#ffd23f', '#ff8a5c', '#9ef0ff'][Math.floor(r * 3)];
                for (i = 0; i < 3; i++) {
                    var ox = fx - dir * i * 22 * u, oy = y + (i - 1) * 14 * u + Math.sin(t * 3 + i) * 3 * u;
                    ctx.beginPath(); ctx.ellipse(ox, oy, 9 * u, 5 * u, 0, 0, TAU); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(ox - dir * 7 * u, oy); ctx.lineTo(ox - dir * 14 * u, oy - 5 * u); ctx.lineTo(ox - dir * 14 * u, oy + 5 * u); ctx.fill();
                }
                break;
            case 'shell2':
                ctx.fillStyle = '#ffd6c2'; ctx.beginPath(); ctx.moveTo(x, y + 12 * u); ctx.arc(x, y + 12 * u, 20 * u, Math.PI * 1.15, Math.PI * 1.85); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#e8a088'; ctx.lineWidth = 1.5 * u; ctx.beginPath();
                for (i = -2; i <= 2; i++) { ctx.moveTo(x, y + 12 * u); ctx.lineTo(x + i * 7 * u, y - 6 * u); }
                ctx.stroke(); break;
            case 'starfish':
                ctx.fillStyle = '#ff9a4a'; ctx.beginPath();
                for (i = 0; i < 10; i++) { var pa = r * 6 + t * 0.2 + i * Math.PI / 5, pr = (i % 2 ? 6 : 15) * u; ctx.lineTo(x + Math.cos(pa) * pr, y + Math.sin(pa) * pr); }
                ctx.closePath(); ctx.fill(); break;
            case 'bubble':
                ctx.strokeStyle = 'rgba(220,250,255,.9)'; ctx.lineWidth = 1.4 * u; ctx.beginPath(); ctx.arc(x + Math.sin(t * 1.5 + hb) * 6 * u, y, 5 * u, 0, TAU); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x + Math.sin(t * 1.5 + hb) * 6 * u - 2 * u, y - 3 * u, 1.6 * u, 1.6 * u); break;
            case 'nebula': blitC(glowSprite(['rgba(255,110,200,.6)', 'rgba(110,160,255,.6)', 'rgba(170,110,255,.6)'][Math.floor(r * 3)], 80), x, y, 300 * u); break;
            case 'planet':
                ctx.fillStyle = ['#ff9f7a', '#8fd0ff', '#c79bff', '#9be3a4'][Math.floor(r * 4)]; ctx.beginPath(); ctx.arc(x, y, 22 * u, 0, TAU); ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(x + 7 * u, y + 5 * u, 18 * u, 0, TAU); ctx.fill();
                if (r < 0.6) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.ellipse(x, y, 36 * u, 8 * u, -0.3, 0, TAU); ctx.stroke(); }
                break;
            case 'asteroid':
                ctx.fillStyle = '#7a7488'; ctx.beginPath();
                for (i = 0; i < 7; i++) { var aa = r * 6 + t * 0.3 + i * TAU / 7, al = (8 + hsh(hb + i * 2) * 6) * u; ctx.lineTo(x + Math.cos(aa) * al, y + Math.sin(aa) * al); }
                ctx.closePath(); ctx.fill(); break;
            case 'comet':
                ctx.strokeStyle = 'rgba(160,220,255,.55)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 26 * u, y - 40 * u); ctx.stroke();
                ctx.fillStyle = '#e0f4ff'; ctx.beginPath(); ctx.arc(x, y, 3 * u, 0, TAU); ctx.fill(); break;
        }
        ctx.globalAlpha = a0;
    }
    function drawBank() {   /* the themed cloud bank between two worlds: the switch happens while it covers the screen */
        if (!trans) return;
        var c = Math.sin(Math.PI * Math.min(1, trans.t / trans.dur)), w = WORLDS[trans.to], kind = w.bank[1], i, n = kind === 'cloud' || kind === 'steam' ? 22 : 46;
        if (c <= 0.01) return;
        ctx.globalAlpha = c * 0.93; ctx.fillStyle = w.bank[0]; ctx.fillRect(0, 0, W, H);
        var tt = RM ? 0 : trans.t;
        for (i = 0; i < n; i++) {
            var x = hsh(i * 3.1 + 7) * W, sz = (110 + hsh(i * 5.7) * 150) * SC, sp = 600 + hsh(i * 2.3) * 500;
            var y = ((hsh(i * 9.3) * (H + 320)) + tt * sp * SC) % (H + 320) - 160;
            ctx.globalAlpha = c;
            if (kind === 'cloud' || kind === 'steam') blitC(cloudSprite(kind === 'steam' ? '#eef1f7' : '#ffffff'), x, y, sz * 1.8);
            else if (kind === 'sprinkle') {
                ctx.fillStyle = ['#ff4d8d', '#4dd2ff', '#ffd23f', '#7ee08a', '#b28cff'][i % 5];
                ctx.save(); ctx.translate(x, y); ctx.rotate(i + tt * 3); rr(-9 * SC, -3 * SC, 18 * SC, 6 * SC, 3 * SC); ctx.fill(); ctx.restore();
            } else if (kind === 'bubble') {
                ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5 * SC; ctx.beginPath(); ctx.arc(x, H - y, sz * 0.12, 0, TAU); ctx.stroke();
            } else if (kind === 'fly') {
                blitC(glowSprite('rgba(220,255,120,.9)', 12), x + Math.sin(tt * 3 + i) * 20 * SC, y, 30 * SC);
            } else {   /* warp: streaks flying out of the centre */
                var a = hsh(i * 1.7) * TAU, d0 = ((hsh(i * 4.1) + tt * 0.9) % 1) * Math.max(W, H) * 0.7;
                ctx.strokeStyle = 'rgba(220,230,255,.85)'; ctx.lineWidth = 2 * SC; ctx.beginPath();
                ctx.moveTo(W / 2 + Math.cos(a) * d0, H / 2 + Math.sin(a) * d0); ctx.lineTo(W / 2 + Math.cos(a) * (d0 + 60 * SC), H / 2 + Math.sin(a) * (d0 + 60 * SC)); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }
    function rr(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }

    /* ---------- drawing: things (virtual units) ---------- */
    function drawShip() {
        if (phase === 'over') return;
        if (ship.inv > 0 && !RM && Math.floor(clock * 14) % 2 && ship.inv < 2.2) return;
        var x = ship.x, y = ship.y, i;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ship.tilt);
        var fl = RM ? 1 : 0.8 + 0.3 * Math.sin(clock * 40);   /* rocket flames */
        for (i = -1; i <= 1; i += 2) {
            ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(i * 9 - 5, 12); ctx.lineTo(i * 9, 12 + 16 * fl); ctx.lineTo(i * 9 + 5, 12); ctx.fill();
            ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.moveTo(i * 9 - 2.5, 12); ctx.lineTo(i * 9, 12 + 9 * fl); ctx.lineTo(i * 9 + 2.5, 12); ctx.fill();
        }
        ctx.lineJoin = 'round'; ctx.strokeStyle = '#6b4520'; ctx.lineWidth = 1.6;
        ctx.fillStyle = '#b07a42';   /* open flaps */
        ctx.beginPath(); ctx.moveTo(-17, -6); ctx.lineTo(-26, -15); ctx.lineTo(-13, -15); ctx.lineTo(-9, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(17, -6); ctx.lineTo(26, -15); ctx.lineTo(13, -15); ctx.lineTo(9, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
        drawCatHead(0, -12, 1);
        ctx.fillStyle = '#c8955b'; ctx.beginPath(); ctx.rect(-17, -6, 34, 20); ctx.fill(); ctx.stroke();   /* the box */
        ctx.fillStyle = '#e8d6a8'; ctx.fillRect(-3, -6, 6, 20);                                          /* tape */
        ctx.fillStyle = SK.fur; ctx.strokeStyle = SK.line; ctx.lineWidth = 1.2;                          /* paws on the rim */
        ctx.beginPath(); ctx.ellipse(-9, -6, 4, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(9, -6, 4, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#9a6a3a'; ctx.fillRect(-13, 4, 7, 2); ctx.fillRect(6, 7, 7, 2);
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d6336c'; ctx.lineWidth = 1.5;   /* the hit point */
        ctx.beginPath(); ctx.arc(x, y + 4, HR - 1, 0, TAU); ctx.fill(); ctx.stroke();
        if (pw.shield > 0) {
            ctx.globalAlpha = pw.shield < 3 && Math.floor(clock * 6) % 2 ? 0.3 : 0.6;
            ctx.strokeStyle = '#5ad1ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - 2, 30, 0, TAU); ctx.stroke();
            ctx.globalAlpha = 0.14; ctx.fillStyle = '#5ad1ff'; ctx.fill(); ctx.globalAlpha = 1;
        }
        if (pw.magnet > 0) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(clock * 8); ctx.strokeStyle = '#ffc23d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 40 + (RM ? 0 : (clock * 40) % 20), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    function drawCatHead(x, y, k) {
        var u = 9 * k;
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = SK.fur; ctx.strokeStyle = SK.line; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-u * 0.95, -u * 0.2); ctx.lineTo(-u * 0.75, -u * 1.25); ctx.lineTo(-u * 0.15, -u * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u * 0.95, -u * 0.2); ctx.lineTo(u * 0.75, -u * 1.25); ctx.lineTo(u * 0.15, -u * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, u, u * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = SK.stripe; ctx.fillRect(-u * 0.12, -u * 0.85, u * 0.24, u * 0.35);
        ctx.fillStyle = '#9fe3ff'; ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 1.2;   /* goggles */
        ctx.beginPath(); ctx.arc(-u * 0.4, -u * 0.1, u * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(u * 0.4, -u * 0.1, u * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-u * 0.4, -u * 0.08, u * 0.13, 0, TAU); ctx.arc(u * 0.4, -u * 0.08, u * 0.13, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.moveTo(-u * 0.12, u * 0.3); ctx.lineTo(u * 0.12, u * 0.3); ctx.lineTo(0, u * 0.45); ctx.fill();
        ctx.restore();
    }
    function drawYarn(x, y, r, spin, col) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(x, y, r * 0.62, spin, spin + 2.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * 0.95, spin + 3, spin + 4.6); ctx.stroke();
    }
    function drawFoe(f) {
        if (f.wait > 0) return;
        var x = f.x, y = f.y, r = f.r, i;
        ctx.save(); ctx.translate(x, y);
        if (f.type === 'duck') {
            var bob = Math.sin(f.t * 6) * 1.5, s = f.small ? 0.75 : 1;
            ctx.scale(s, s); ctx.translate(0, bob);
            ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#a86b00'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(0, 4, 13, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(-4, -6, 7, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-17, -3); ctx.lineTo(-10, -2); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-6, -8, 1.6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ffbf1f'; ctx.beginPath(); ctx.ellipse(4, 3, 6, 4, -0.3, 0, TAU); ctx.fill();
        } else if (f.type === 'plane') {
            ctx.rotate(f.ang - Math.PI / 2);
            ctx.fillStyle = '#4d8cff'; ctx.fillRect(-15, -2, 30, 7); ctx.fillRect(-6, -13, 12, 4);   /* wings, tail */
            ctx.fillStyle = '#ff6b6b'; ctx.strokeStyle = '#8a1f2a'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.arc(0, 4, 2.6, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(60,60,70,.5)'; ctx.fillRect(-8, 13, 16, 2);   /* propeller blur */
        } else if (f.type === 'vac') {
            ctx.fillStyle = '#3c3f4a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
            ctx.fillStyle = '#8f95a6'; ctx.beginPath(); ctx.arc(0, -1, r - 4, 0, TAU); ctx.fill();
            ctx.fillStyle = '#5b6070'; ctx.beginPath(); ctx.arc(0, -1, r - 9, 0, TAU); ctx.fill();
            ctx.fillStyle = Math.floor(f.t * 3) % 2 ? '#5cff8a' : '#2a8a4a'; ctx.beginPath(); ctx.arc(0, -r + 7, 2.5, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#c9c2d6'; ctx.lineWidth = 1.5;   /* side brushes */
            for (i = 0; i < 3; i++) {
                var a = f.spin + i * TAU / 3;
                ctx.beginPath(); ctx.moveTo(-r + 3, r - 6); ctx.lineTo(-r + 3 + Math.cos(a) * 9, r - 6 + Math.sin(a) * 9); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(r - 3, r - 6); ctx.lineTo(r - 3 + Math.cos(-a) * 9, r - 6 + Math.sin(-a) * 9); ctx.stroke();
            }
        } else if (f.type === 'drone') {
            ctx.strokeStyle = '#3a4a5c'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-11, -11); ctx.lineTo(11, 11); ctx.moveTo(11, -11); ctx.lineTo(-11, 11); ctx.stroke();
            for (i = 0; i < 4; i++) {
                var rx = i % 2 ? 11 : -11, ry = i < 2 ? -11 : 11;
                ctx.fillStyle = 'rgba(200,230,255,.55)'; ctx.beginPath(); ctx.ellipse(rx, ry, 7, RM ? 3 : 2 + Math.abs(Math.sin(f.spin + i)) * 3, 0, 0, TAU); ctx.fill();
            }
            ctx.fillStyle = '#e9eef5'; ctx.strokeStyle = '#3a4a5c'; ctx.lineWidth = 1.5;
            rr(-8, -7, 16, 14, 5); ctx.fill(); ctx.stroke();
            ctx.fillStyle = f.burst > 0 ? '#ff3b5c' : '#1d6b8a'; ctx.beginPath(); ctx.arc(0, 2, 3.5, 0, TAU); ctx.fill();
        } else if (f.type === 'jelly') {
            var sq = RM ? 0 : Math.sin(f.t * 7) * 0.08, js2 = r / 14;
            ctx.scale(js2 * (1 + sq), js2 * (1 - sq));
            ctx.fillStyle = f.small ? '#ff9ad5' : '#7ee0a8'; ctx.strokeStyle = f.small ? '#b03a7a' : '#2a8a5a'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-14, 8); ctx.quadraticCurveTo(-15, -14, 0, -14); ctx.quadraticCurveTo(15, -14, 14, 8); ctx.quadraticCurveTo(0, 13, -14, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-6, -7, 3, 5, -0.4, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-4, -1, 1.8, 0, TAU); ctx.arc(4, -1, 1.8, 0, TAU); ctx.fill();
        } else if (f.type === 'spring') {
            ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 4);
            for (i = 1; i <= 5; i++) ctx.lineTo(i % 2 ? 5 : -5, 4 + i * 2.6 * (1 + (f.squash || 0) * 0.6));
            ctx.stroke();
            ctx.fillStyle = '#6fa8dc'; ctx.strokeStyle = '#2a4a7a'; ctx.lineWidth = 1.5; rr(-10, -14, 20, 18, 4); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-7, -10, 14, 6); ctx.fillStyle = '#1b1530'; ctx.fillRect(-5, -9, 3, 4); ctx.fillRect(2, -9, 3, 4);
            ctx.strokeStyle = '#2a4a7a'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -19); ctx.stroke();
            ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.arc(0, -20, 2.2, 0, TAU); ctx.fill();
        } else if (f.type === 'jellyfish') {
            var pl = RM ? 0 : Math.max(0, Math.sin(f.t * 3)) * 0.15;
            ctx.strokeStyle = 'rgba(220,190,255,.9)'; ctx.lineWidth = 1.6;
            for (i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, 2); ctx.quadraticCurveTo(i * 4 + (RM ? 0 : Math.sin(f.t * 4 + i) * 4), 12, i * 4, 22); ctx.stroke(); }
            ctx.fillStyle = 'rgba(196,155,255,.95)'; ctx.strokeStyle = '#6a3aa8';
            ctx.beginPath(); ctx.ellipse(0, 2, 15 * (1 + pl), 14 * (1 - pl), 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-6, -5, 3, 4, -0.4, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-4, -1, 1.6, 0, TAU); ctx.arc(4, -1, 1.6, 0, TAU); ctx.fill();
        }
        ctx.restore();
        if (f.flash > 0) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    function drawBoss() {
        var b = boss, x = b.x, y = b.y, r = b.r, i;
        if (b.state === 'dead') { ctx.globalAlpha = Math.max(0, 1 - b.fade / 1.6); }
        if (b.kind === 'vac' && b.state2 === 'aim') {   /* where the charge will go */
            ctx.fillStyle = 'rgba(255,60,90,' + (0.12 + 0.1 * Math.sin(clock * 16)).toFixed(3) + ')';
            ctx.fillRect(x - r, y, r * 2, PH * 0.64 - y + r);
        }
        if (b.glow > 0) { var gs = glowSprite('rgba(255,240,150,.8)', 70); blit(gs, x, y, r * 2.6 / gs.s); }
        ctx.save(); ctx.translate(x, y);
        if (b.kind === 'vac') {
            ctx.fillStyle = '#2f323c'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
            ctx.fillStyle = '#a0a6b8'; ctx.beginPath(); ctx.arc(0, -2, r - 6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#d7dbe6'; ctx.beginPath(); ctx.arc(0, -4, r - 16, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ff3b5c'; ctx.beginPath(); ctx.ellipse(-12, -6, 6, 4, 0, 0, TAU); ctx.ellipse(12, -6, 6, 4, 0, 0, TAU); ctx.fill();   /* angry eyes */
            ctx.strokeStyle = '#2f323c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, -15); ctx.lineTo(-6, -10); ctx.moveTo(20, -15); ctx.lineTo(6, -10); ctx.stroke();
            ctx.fillStyle = '#1a1c22'; rr(-14, 8, 28, 6, 3); ctx.fill();
            ctx.strokeStyle = '#e0dbe9'; ctx.lineWidth = 2.5;
            for (i = 0; i < 4; i++) {
                var a = b.t * 14 + i * TAU / 4;
                ctx.beginPath(); ctx.moveTo(-r + 6, r - 10); ctx.lineTo(-r + 6 + Math.cos(a) * 18, r - 10 + Math.sin(a) * 18); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(r - 6, r - 10); ctx.lineTo(r - 6 + Math.cos(-a) * 18, r - 10 + Math.sin(-a) * 18); ctx.stroke();
            }
        } else if (b.kind === 'toaster') {
            ctx.fillStyle = '#c9ced8'; ctx.strokeStyle = '#59606e'; ctx.lineWidth = 2.5;
            rr(-r, -r * 0.75, r * 2, r * 1.5, 16); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#3a3f4a'; ctx.fillRect(-r * 0.62, -r * 0.75 - 2, r * 0.42, 7); ctx.fillRect(r * 0.2, -r * 0.75 - 2, r * 0.42, 7);
            ctx.fillStyle = '#e8b06a'; ctx.fillRect(-r * 0.58, -r * 0.75 - 12, r * 0.34, 12); ctx.fillRect(r * 0.24, -r * 0.75 - 12, r * 0.34, 12);
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-14, -4, 5, 0, TAU); ctx.arc(14, -4, 5, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, -14); ctx.lineTo(-8, -10); ctx.moveTo(22, -14); ctx.lineTo(8, -10); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 16, 9, Math.PI + 0.3, -0.3); ctx.stroke();
            ctx.fillStyle = '#ff5d5d'; ctx.fillRect(r - 10, 4, 6, 14);
        } else if (b.kind === 'sprinkler') {
            ctx.fillStyle = '#2f7a4a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
            ctx.fillStyle = '#4fb06a'; ctx.beginPath(); ctx.arc(0, 0, r - 6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ffd23f';   /* a crown */
            ctx.beginPath(); ctx.moveTo(-18, -r + 4); ctx.lineTo(-18, -r - 12); ctx.lineTo(-9, -r - 3); ctx.lineTo(0, -r - 15); ctx.lineTo(9, -r - 3); ctx.lineTo(18, -r - 12); ctx.lineTo(18, -r + 4); ctx.fill();
            ctx.save(); ctx.rotate(b.ang);
            ctx.fillStyle = '#c9ced8'; ctx.strokeStyle = '#59606e'; ctx.lineWidth = 2;
            var na = b.ph + 2;
            for (i = 0; i < na; i++) { ctx.save(); ctx.rotate(i * TAU / na); rr(10, -4, r - 4, 8, 4); ctx.fill(); ctx.stroke(); ctx.restore(); }
            ctx.restore();
            ctx.fillStyle = '#e9eef5'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-5, -2, 2.6, 0, TAU); ctx.arc(5, -2, 2.6, 0, TAU); ctx.fill();
        } else if (b.kind === 'mother') {
            ctx.fillStyle = '#9aa6c8'; ctx.beginPath(); ctx.ellipse(0, 10, r, r * 0.42, 0, 0, TAU); ctx.fill();   /* saucer */
            ctx.fillStyle = '#ffffff';
            for (i = 0; i < 6; i++) { ctx.globalAlpha = (Math.floor(b.t * 4) + i) % 2 ? 1 : 0.4; ctx.beginPath(); ctx.arc(-r * 0.75 + i * r * 0.3, 14, 3, 0, TAU); ctx.fill(); }
            ctx.globalAlpha = b.state === 'dead' ? Math.max(0, 1 - b.fade / 1.6) : 1;
            ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#a86b00'; ctx.lineWidth = 2;   /* the giant duck in the dome */
            ctx.beginPath(); ctx.ellipse(4, -4, 28, 18, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(-12, -22, 14, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(-24, -22); ctx.lineTo(-38, -16); ctx.lineTo(-24, -14); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-16, -26, 3, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(200,235,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -8, r * 0.72, Math.PI, 0); ctx.stroke();
        } else if (b.kind === 'candy') {   /* a wrapped bonbon with a top hat and a monocle */
            ctx.fillStyle = '#ff7ab6'; ctx.strokeStyle = '#9a1f5a'; ctx.lineWidth = 2.5;
            for (i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(i * r * 0.8, 0); ctx.lineTo(i * r * 1.45, -r * 0.45); ctx.lineTo(i * r * 1.28, 0); ctx.lineTo(i * r * 1.45, r * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); }
            ctx.fillStyle = '#ffd1ec'; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.clip(); ctx.rotate(b.ang); ctx.fillStyle = '#ff5fa2';
            for (i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.5, -r * 0.25, r, -r * 0.05); ctx.lineTo(r, r * 0.22); ctx.quadraticCurveTo(r * 0.5, r * 0.05, 0, 0); ctx.fill(); }
            ctx.restore();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-12, -4, 7, 0, TAU); ctx.arc(12, -4, 7, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-11, -3, 3, 0, TAU); ctx.arc(13, -3, 3, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(12, -4, 9, 0, TAU); ctx.moveTo(20, 0); ctx.lineTo(23, 14); ctx.stroke();
            ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 20, 8, Math.PI + 0.4, -0.4); ctx.stroke();
            ctx.fillStyle = '#2a2233'; ctx.fillRect(-18, -r * 0.85 - 4, 36, 6); ctx.fillRect(-12, -r * 0.85 - 26, 24, 23);
            ctx.fillStyle = '#ff5fa2'; ctx.fillRect(-12, -r * 0.85 - 10, 24, 4);
        } else if (b.kind === 'golem') {   /* a box robot in front of a big turning gear */
            gear(0, -8, r * 1.1, 12, b.ang + b.t * 0.6, '#8a6a3a');
            ctx.fillStyle = '#5b6475'; for (i = -1; i <= 1; i += 2) { rr(i * r * 0.95 - 9, -6, 18, 34, 5); ctx.fill(); }
            ctx.fillStyle = '#7c8799'; ctx.strokeStyle = '#3a4252'; ctx.lineWidth = 2.5; rr(-r * 0.72, -r * 0.6, r * 1.44, r * 1.25, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = b.ph === 2 ? '#ff5d5d' : '#ffd23f'; ctx.fillRect(-20, -16, 13, 9); ctx.fillRect(7, -16, 13, 9);
            ctx.fillStyle = '#2b3040'; rr(-16, 4, 32, 12, 3); ctx.fill();
            ctx.strokeStyle = '#7c8799'; ctx.lineWidth = 2; ctx.beginPath(); for (i = -1; i <= 1; i++) { ctx.moveTo(i * 8, 4); ctx.lineTo(i * 8, 16); } ctx.stroke();
            ctx.fillStyle = '#c9ced8'; [[-r * 0.6, -r * 0.48], [r * 0.6, -r * 0.48], [-r * 0.6, r * 0.52], [r * 0.6, r * 0.52]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, TAU); ctx.fill(); });
        } else if (b.kind === 'crab') {   /* a crab in a captain's hat, claws snapping */
            var cl = RM ? 0.3 : 0.3 + 0.25 * Math.sin(b.t * 5);
            ctx.strokeStyle = '#c2401f'; ctx.lineWidth = 3;
            for (i = -1; i <= 1; i += 2) for (var lg = 0; lg < 3; lg++) { ctx.beginPath(); ctx.moveTo(i * r * 0.6, lg * 8); ctx.lineTo(i * (r * 0.95 + 6), lg * 9 + 10); ctx.stroke(); }
            for (i = -1; i <= 1; i += 2) {
                ctx.save(); ctx.translate(i * 40, 20);
                ctx.fillStyle = '#ff6b4a'; ctx.strokeStyle = '#8a2a10'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(0, 4, 12, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.save(); ctx.translate(-i * 3, 14); ctx.rotate(i * cl); ctx.beginPath(); ctx.ellipse(0, 8, 5, 10, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
                ctx.save(); ctx.translate(i * 4, 14); ctx.rotate(-i * cl); ctx.beginPath(); ctx.ellipse(0, 8, 5, 10, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
                ctx.restore();
            }
            ctx.fillStyle = '#ff7a52'; ctx.strokeStyle = '#8a2a10'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.82, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#8a2a10'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -r * 0.45); ctx.lineTo(-13, -r * 0.45 - 12); ctx.moveTo(10, -r * 0.45); ctx.lineTo(13, -r * 0.45 - 12); ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-13, -r * 0.45 - 15, 6, 0, TAU); ctx.arc(13, -r * 0.45 - 15, 6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-12, -r * 0.45 - 14, 2.6, 0, TAU); ctx.arc(14, -r * 0.45 - 14, 2.6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#23325a'; ctx.beginPath(); ctx.moveTo(-22, -r * 0.3); ctx.lineTo(22, -r * 0.3); ctx.lineTo(16, -r * 0.3 - 14); ctx.lineTo(-16, -r * 0.3 - 14); ctx.fill();
            ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -r * 0.3 - 7, 3.5, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#8a2a10'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 12, 7, Math.PI + 0.4, -0.4); ctx.stroke();
        }
        ctx.restore();
        if (b.flash > 0) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
    }
    function drawItem(it) {
        var x = it.x, y = it.y;
        if (it.kind === 'fish') {
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(it.t * 5) * 0.3);
            ctx.fillStyle = '#ffc23d'; ctx.strokeStyle = '#a8700a'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(-1, 0, 7, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-4.5, -1, 1, 0, TAU); ctx.fill();
            ctx.restore();
            return;
        }
        var c = PCOL[it.kind], pulse = RM ? 1 : 1 + 0.08 * Math.sin(it.t * 7);
        blit(glowSprite('rgba(255,255,255,.7)', 24), x, y, pulse);
        ctx.fillStyle = c; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 12 * pulse, 0, TAU); ctx.fill(); ctx.stroke();
        powIcon(it.kind, x, y, 1);
    }
    function powIcon(k, x, y, s) {   /* small white symbols: three dots, a beam, a shield, a magnet */
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
        if (k === 'triple') { [-5, 0, 5].forEach(function (d, i) { ctx.beginPath(); ctx.arc(x + d * s, y + (i === 1 ? -3 : 2) * s, 2.3 * s, 0, TAU); ctx.fill(); }); }
        else if (k === 'laser') { ctx.beginPath(); ctx.moveTo(x, y + 6 * s); ctx.lineTo(x, y - 6 * s); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y + 6 * s, 2.4 * s, 0, TAU); ctx.fill(); }
        else if (k === 'shield') { ctx.beginPath(); ctx.moveTo(x, y - 6 * s); ctx.lineTo(x + 5 * s, y - 3.5 * s); ctx.lineTo(x + 4 * s, y + 2 * s); ctx.lineTo(x, y + 6 * s); ctx.lineTo(x - 4 * s, y + 2 * s); ctx.lineTo(x - 5 * s, y - 3.5 * s); ctx.closePath(); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(x, y - 1 * s, 5 * s, Math.PI, 0); ctx.moveTo(x - 5 * s, y - 1 * s); ctx.lineTo(x - 5 * s, y + 5 * s); ctx.moveTo(x + 5 * s, y - 1 * s); ctx.lineTo(x + 5 * s, y + 5 * s); ctx.stroke(); }
        ctx.lineCap = 'butt';
    }

    /* ---------- drawing: HUD and text (CSS pixels) ---------- */
    function heart(x, y, s, on) {
        ctx.fillStyle = on ? '#ff5d7a' : 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
        ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1, x, y - s * 0.35);
        ctx.bezierCurveTo(x + s * 0.7, y - s * 1, x + s * 1.4, y, x, y + s * 0.9); ctx.fill();
    }
    function txt(t, x, y, size, col, align, weight) {
        ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.fillStyle = col; ctx.fillText(t, x, y);
    }
    function drawHud() {
        var dark = WORLDS[world].dark, k, i, n = 0, left, y;
        var bossBar = boss && boss.state !== 'enter';
        if (!wide) {
            ctx.fillStyle = 'rgba(18,20,44,.62)'; ctx.fillRect(0, 0, W, 32);
            ctx.textBaseline = 'middle';
            txt(String(score), 10, 16, 16, '#fff');
            left = 10 + ctx.measureText(String(score)).width + 8;
            if (mult > 1) { txt('x' + mult, left, 16, 15, '#ffd23f'); left += ctx.measureText('x' + mult).width + 8; }
            for (i = 0; i < Math.min(lives, 7); i++) heart(W - 14 - i * 19, 16, 7, true);
            var px0 = Math.max(left + 4, W / 2 - 40);
            for (k in pw) if (pw[k] > 0) {
                var bx = px0 + n * 30;
                ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.arc(bx + 10, 14, 9, 0, TAU); ctx.fill(); powIcon(k, bx + 10, 14, 0.75);
                ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bx + 1, 26, 18 * pw[k] / POW[k], 3);
                n++;
            }
            ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(0, 32, W, 3);
            if (bossBar) { ctx.fillStyle = '#ff5d7a'; ctx.fillRect(0, 32, W * boss.hp / boss.max, 3); }
            else if (phase === 'play') { ctx.fillStyle = '#7ee08a'; ctx.fillRect(0, 32, W * Math.min(1, wt / WORLDS[world].T), 3); }
            if (bossBar) txt(boss.name, W / 2, 44, 11, dark ? '#ffd0da' : '#7a1a33', 'center', 800);
            ctx.textBaseline = 'alphabetic';
            return;
        }
        /* wide: soft panels beside the column, over the scene */
        var pl = 16, pr = W - OX + 16, col = '#eef1ff', pwid = Math.min(220, OX - 20), np = 0;
        for (k in pw) if (pw[k] > 0) np++;
        y = 34;
        ctx.fillStyle = 'rgba(16,18,42,.55)';
        rr(6, 12, pwid + 4, bossBar ? 222 : 202, 14); ctx.fill();
        rr(W - OX + 6, 12, pwid + 4, 84 + Math.max(1, np) * 30, 14); ctx.fill();
        txt('SCORE', pl, y, 11, '#aab3e0'); txt(String(score), pl, y + 26, 24, col);
        txt('COMBO', pl, y + 62, 11, '#aab3e0'); txt('x' + mult, pl, y + 86, 22, mult > 1 ? '#ffd23f' : col);
        ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(pl, y + 94, 90, 4);
        if (chain) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(pl, y + 94, 90 * Math.max(0, chainT) / 2.2, 4); }
        txt((loop ? 'LOOP ' + (loop + 1) + ', ' : '') + 'WORLD ' + (world + 1), pl, y + 128, 11, '#aab3e0');
        txt(WORLDS[world].name, pl, y + 148, 15, col, 'left', 700);
        ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(pl, y + 158, Math.min(150, OX - 32), 5);
        ctx.fillStyle = bossBar ? '#ff5d7a' : '#7ee08a';
        ctx.fillRect(pl, y + 158, Math.min(150, OX - 32) * (bossBar ? boss.hp / boss.max : phase === 'play' ? Math.min(1, wt / WORLDS[world].T) : 1), 5);
        if (bossBar) txt(boss.name, pl, y + 182, 13, '#ffb3c4', 'left', 800);
        txt('LIVES', pr, y, 11, '#aab3e0');
        for (i = 0; i < Math.min(lives, 8); i++) heart(pr + 9 + i * 21, y + 18, 8, true);
        txt('POWER UPS', pr, y + 62, 11, '#aab3e0');
        for (k in pw) if (pw[k] > 0) {
            var yy = y + 84 + n * 30;
            ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.arc(pr + 11, yy, 11, 0, TAU); ctx.fill(); powIcon(k, pr + 11, yy, 0.85);
            txt(PNAME[k], pr + 28, yy - 2, 12, col, 'left', 700);
            ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(pr + 28, yy + 5, 80, 3);
            ctx.fillStyle = PCOL[k]; ctx.fillRect(pr + 28, yy + 5, 80 * pw[k] / POW[k], 3);
            n++;
        }
        if (!n) txt('none', pr, y + 86, 12, '#7f88b8', 'left', 600);
        var hy = H - 92;
        if (hy > y + 220) {
            ctx.fillStyle = 'rgba(16,18,42,.45)'; rr(W - OX + 6, hy - 20, pwid + 4, (api.touch ? 2 : 3) * 18 + 12, 12); ctx.fill();
            var lines = api.touch ? ['Drag to fly', 'Yarn fires by itself'] : ['Arrows or WASD, or drag', 'F: auto fire ' + (auto ? 'on' : 'off') + (auto ? '' : ', Space fires'), 'P: pause'];
            lines.forEach(function (l, j) { txt(l, pr, hy + j * 18, 12, '#8f98c8', 'left', 600); });
        }
    }
    function drawText() {
        var cxs = OX + PW * SC / 2, a;
        ctx.textBaseline = 'middle';
        if (banner.t < banner.dur) {
            a = Math.min(1, banner.t * 4, (banner.dur - banner.t) * 2.5);
            var by = Math.round(H * 0.36), big = Math.min(26, Math.max(18, PW * SC / 16));
            ctx.globalAlpha = a;
            ctx.font = '800 ' + big + 'px ' + FONT;
            var bw = Math.min(PW * SC - 20, Math.max(ctx.measureText(banner.text).width, banner.sub ? 160 : 0) + 40);
            ctx.fillStyle = 'rgba(18,20,44,.72)'; rrS(cxs - bw / 2, by - big, bw, banner.sub ? big * 2 + 22 : big * 2, 14); ctx.fill();
            txt(banner.text, cxs, by, big, banner.text === 'Warning!' ? '#ff6b81' : '#fff', 'center');
            if (banner.sub) txt(banner.sub, cxs, by + big + 4, 14, '#ffd23f', 'center', 700);
            ctx.globalAlpha = 1;
        }
        if (hintT < 5.5 && phase === 'play' && world === 0 && loop === 0) {
            a = Math.min(1, (5.5 - hintT) * 1.5);
            var lines = api.touch ? ['Drag anywhere to fly', 'Yarn fires by itself', 'Catch fish and power ups'] :
                ['Arrows or WASD to fly (or drag the mouse)', 'Yarn fires by itself, F turns it off', 'Catch fish and power ups, P pauses'];
            var hy = Math.round(H * 0.58), lw = 0;
            ctx.font = '700 14px ' + FONT;
            lines.forEach(function (l) { lw = Math.max(lw, ctx.measureText(l).width); });
            ctx.globalAlpha = a; ctx.fillStyle = 'rgba(18,20,44,.66)'; rrS(cxs - lw / 2 - 16, hy - 16, lw + 32, lines.length * 22 + 10, 12); ctx.fill();
            lines.forEach(function (l, j) { txt(l, cxs, hy + j * 22, 14, '#fff', 'center', 700); });
            ctx.globalAlpha = 1;
        }
        if (gust && gust.t < 2.8) {   /* the gust warning, near the top of the column */
            var gtxt = gust.dir > 0 ? 'Gust from the left  >>' : '<<  Gust from the right';
            ctx.globalAlpha = gust.t < 1 ? 0.6 + 0.4 * Math.sin(gust.t * 18) : 1;
            ctx.font = '800 15px ' + FONT; var gw2 = ctx.measureText(gtxt).width + 24;
            ctx.fillStyle = 'rgba(18,20,44,.7)'; rrS(cxs - gw2 / 2, HB * SC + 30, gw2, 28, 10); ctx.fill();
            txt(gtxt, cxs, HB * SC + 44, 15, '#cfe8ff', 'center');
            ctx.globalAlpha = 1;
        }
        if (paused) {
            ctx.fillStyle = 'rgba(12,14,32,.55)'; ctx.fillRect(0, 0, W, H);
            txt('Paused', cxs, H * 0.42, 28, '#fff', 'center');
            txt(api.touch ? 'Tap to go on' : 'Click or press any key to go on', cxs, H * 0.42 + 32, 14, '#dfe4ff', 'center', 700);
        }
        ctx.textBaseline = 'alphabetic';
    }
    function rrS(x, y, w, h, r) { rr(x, y, w, h, r); }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawWorld(world);
        var sx = 0, sy = 0, i;
        if (shake > 0 && !RM) { sx = rnd(-shake, shake) * 0.5; sy = rnd(-shake, shake) * 0.5; }
        ctx.setTransform(SC * dpr, 0, 0, SC * dpr, (OX + sx) * dpr, sy * dpr);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PW, PH); ctx.clip();
        for (i = 0; i < beams.length; i++) {   /* boss laser columns: a dashed warning line, then the beam */
            var bm = beams[i];
            if (bm.kind === 'hammer') {   /* striped warning column, then the hammer comes down */
                if (bm.t < bm.warn) {
                    ctx.fillStyle = 'rgba(255,170,40,' + (0.14 + 0.1 * Math.sin(bm.t * 18)).toFixed(3) + ')'; ctx.fillRect(bm.x - bm.w / 2, 0, bm.w, PH);
                    ctx.strokeStyle = 'rgba(255,170,40,.9)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
                    ctx.beginPath(); ctx.moveTo(bm.x - bm.w / 2, 0); ctx.lineTo(bm.x - bm.w / 2, PH); ctx.moveTo(bm.x + bm.w / 2, 0); ctx.lineTo(bm.x + bm.w / 2, PH); ctx.stroke(); ctx.setLineDash([]);
                } else {
                    var hu = (bm.t - bm.warn) / bm.dur;
                    ctx.fillStyle = 'rgba(160,170,190,.45)'; ctx.fillRect(bm.x - bm.w / 2, 0, bm.w, PH);
                    ctx.fillStyle = '#7c8799'; ctx.strokeStyle = '#3a4252'; ctx.lineWidth = 3; rr(bm.x - bm.w / 2, hu * PH - 40, bm.w, 56, 8); ctx.fill(); ctx.stroke();
                }
                continue;
            }
            if (bm.t < bm.warn) {
                ctx.strokeStyle = 'rgba(255,80,200,' + (0.35 + 0.3 * Math.sin(bm.t * 20)).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
                ctx.beginPath(); ctx.moveTo(bm.x, 0); ctx.lineTo(bm.x, PH); ctx.stroke(); ctx.setLineDash([]);
            } else {
                ctx.fillStyle = 'rgba(255,90,210,.55)'; ctx.fillRect(bm.x - bm.w / 2, 0, bm.w, PH);
                ctx.fillStyle = 'rgba(255,240,255,.9)'; ctx.fillRect(bm.x - bm.w / 6, 0, bm.w / 3, PH);
            }
        }
        for (i = 0; i < belts.length; i++) {   /* Toy Factory conveyor belts: chevrons show which way they push */
            var bl = belts[i], off = ((clock * 60 * bl.dir) % 26 + 26) % 26;
            ctx.fillStyle = 'rgba(40,46,62,.82)'; ctx.fillRect(0, bl.y - 13, PW, 26);
            ctx.fillStyle = '#6b7488'; ctx.fillRect(0, bl.y - 13, PW, 3); ctx.fillRect(0, bl.y + 10, PW, 3);
            ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath();
            for (var cx2 = -26 + off; cx2 < PW + 26; cx2 += 26) { ctx.moveTo(cx2 - bl.dir * 4, bl.y - 6); ctx.lineTo(cx2 + bl.dir * 4, bl.y); ctx.lineTo(cx2 - bl.dir * 4, bl.y + 6); }
            ctx.stroke();
        }
        for (i = 0; i < items.length; i++) drawItem(items[i]);
        for (i = 0; i < shots.length; i++) drawYarn(shots[i].x, shots[i].y, 5, shots[i].spin, shots[i].col);
        if (laserOn && phase !== 'over') {
            var lw = 6 + (RM ? 0 : Math.sin(clock * 50));
            ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.fillRect(ship.x - lw, laserTop, lw * 2, ship.y - 18 - laserTop);
            ctx.fillStyle = '#ff5050'; ctx.fillRect(ship.x - lw / 3, laserTop, lw / 1.5, ship.y - 18 - laserTop);
            blit(glowSprite('rgba(255,60,60,.9)', 16), ship.x, laserTop + 4);
        }
        for (i = 0; i < foes.length; i++) drawFoe(foes[i]);
        if (boss) drawBoss();
        drawShip();
        for (i = 0; i < bullets.length; i++) {
            var q = bullets[i];
            if (q.kind === 'toast') {
                ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.t * 4);
                ctx.fillStyle = '#e8b06a'; ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 1.6; rr(-9, -9, 18, 18, 5); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fff1d0'; rr(-6, -6, 12, 12, 3); ctx.fill(); ctx.restore();
            } else if (q.kind === 'butter') {
                ctx.fillStyle = '#b8901a'; rr(q.x - 9, q.y - 6, 18, 12, 3); ctx.fill();
                ctx.fillStyle = '#fff1a8'; rr(q.x - 7.5, q.y - 4.5, 15, 9, 2.5); ctx.fill();
            } else if (q.kind === 'saw') {
                gear(q.x, q.y, q.r + 2, 10, q.t * 12, '#d5dbe6');
                ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, TAU); ctx.fill();
            } else blit(bulletSprite(q.c, q.r), q.x, q.y);
        }
        for (i = 0; i < steams.length; i++) {   /* Kitchen Sky steam drifts over everything, a little see through */
            ctx.globalAlpha = 0.34; blitC(cloudSprite('#ffffff'), steams[i].x, steams[i].y, steams[i].r * 2.6);
        }
        ctx.globalAlpha = 1;
        if (gust && gust.t > 1) {   /* wind streaks while a gust blows */
            ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.beginPath();
            for (i = 0; i < 14; i++) {
                var gx = ((hsh(i * 3.3) * PW + clock * 420 * gust.dir) % PW + PW) % PW, gy = hsh(i * 7.7) * PH;
                ctx.moveTo(gx, gy); ctx.lineTo(gx - gust.dir * 40, gy);
            }
            ctx.stroke();
        }
        for (i = 0; i < parts.length; i++) {
            var p = parts[i];
            ctx.globalAlpha = 1 - p.t / p.max; ctx.fillStyle = p.c;
            ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        }
        ctx.globalAlpha = 1;
        ctx.textBaseline = 'middle';
        for (i = 0; i < pops.length; i++) {
            var o = pops[i];
            ctx.globalAlpha = 1 - o.t / 0.9;
            ctx.font = '800 12px ' + FONT; ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.strokeText(o.text, o.x, o.y - o.t * 30);
            ctx.fillStyle = o.c; ctx.fillText(o.text, o.x, o.y - o.t * 30);
        }
        ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
        ctx.restore();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (wide) {   /* a faint edge marks where the action stops */
            ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(OX - 1, 0, 1, H); ctx.fillRect(W - OX, 0, 1, H);
        }
        drawBank();
        if (redFlash > 0) { ctx.fillStyle = 'rgba(255,60,90,' + (redFlash * (RM ? 0.12 : 0.28)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
        drawHud();
        drawText();
    }

    /* ---------- the loop ---------- */
    var fpsN = 0, fpsT = 0;
    api.loop(function (dt) {
        if (test) { fpsN++; fpsT += dt; if (fpsT >= 1) { test.fps = fpsN / fpsT; fpsN = 0; fpsT = 0; } dt *= test.dbg.speed; }
        var n = Math.max(1, Math.ceil(dt / (1 / 60)));
        for (var i = 0; i < n; i++) update(dt / n);
        if (!test || !test.dbg.nodraw) draw();
        if (shownScore !== score) { shownScore = score; api.score(score); }
    });

    /* ---------- controls: keys, mouse drag, touch drag (relative: the finger never covers the ship) ---------- */
    var KEYS = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    function resume() { if (paused) { paused = false; return true; } return false; }
    api.on(window, 'keydown', function (e) {
        var k = (e.key || '').toLowerCase();
        if (k === 'escape') return;
        if (phase === 'over') return;
        if (paused && k !== 'p') { resume(); e.preventDefault(); return; }
        if (KEYS[k]) { keys[KEYS[k]] = true; e.preventDefault(); return; }
        if (k === ' ' || k === 'spacebar') { fireKey = true; e.preventDefault(); return; }
        if (e.repeat) return;
        if (k === 'f') { auto = !auto; pops.push({ x: ship.x, y: ship.y - 30, t: 0, text: auto ? 'Auto fire on' : 'Auto fire off: Space fires', c: '#fff' }); }
        if (k === 'p') { paused = !paused; e.preventDefault(); }
    });
    api.on(window, 'keyup', function (e) {
        var k = (e.key || '').toLowerCase();
        if (KEYS[k]) keys[KEYS[k]] = false;
        if (k === ' ' || k === 'spacebar') fireKey = false;
    });
    api.on(window, 'blur', function () { keys = {}; fireKey = false; drag = null; if (phase !== 'over') paused = true; });
    api.on(document, 'visibilitychange', function () { if (document.hidden && phase !== 'over') { paused = true; keys = {}; drag = null; } });
    function toV(e) { var b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left - OX) / SC, y: (e.clientY - b.top) / SC }; }
    api.on(cv, 'pointerdown', function (e) {
        e.preventDefault();
        if (resume()) return;
        if (phase === 'over' || (drag && drag.id !== e.pointerId)) return;
        var p = toV(e);
        drag = { id: e.pointerId, px: p.x, py: p.y, sx: ship.x, sy: ship.y, x: ship.x, y: ship.y, mouse: e.pointerType === 'mouse' };
        cv.classList.add('pr-drag');
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not every pointer can be captured */ }
    });
    api.on(cv, 'pointermove', function (e) {
        if (!drag || drag.id !== e.pointerId) return;
        var p = toV(e), k = drag.mouse ? 1 : 1.25;   /* a finger moves the ship a little further than itself */
        drag.x = clamp(drag.sx + (p.x - drag.px) * k, 16, PW - 16);
        drag.y = clamp(drag.sy + (p.y - drag.py) * k, HB + 40, PH - 26);
        if (drag.x === 16 || drag.x === PW - 16 || drag.y === HB + 40 || drag.y === PH - 26) { drag.sx = drag.x; drag.sy = drag.y; drag.px = p.x; drag.py = p.y; }
    });
    function endDrag(e) { if (drag && drag.id === e.pointerId) { drag = null; cv.classList.remove('pr-drag'); } }
    api.on(cv, 'pointerup', endDrag);
    api.on(cv, 'pointercancel', endDrag);
    api.on(cv, 'contextmenu', function (e) { e.preventDefault(); });

    /* ---------- a hook for the test pages only (they define window.__errors) ---------- */
    if (window.__errors) {
        test = window.__pr = {
            dbg: { speed: 1, god: false, nodraw: false }, ctrl: null, time: 0, fps: 0, kills: 0, fish: 0, bosses: 0, beaten: 0, hits: [], deadAt: null, pows: {},
            view: null,
            state: function () {
                return { phase: phase, world: world, name: WORLDS[world].name, trans: trans ? Math.round(trans.t * 100) / 100 : null, belts: belts.length, steams: steams.length, gust: !!gust, loop: loop, wt: wt, score: score, lives: lives, mult: mult, foes: foes.length, bullets: bullets.length, shots: shots.length, laser: laserOn,
                    boss: boss ? { kind: boss.kind, hp: boss.hp, max: boss.max, ph: boss.ph, state: boss.state, x: boss.x, y: boss.y } : null,
                    ship: { x: ship.x, y: ship.y }, PW: PW, PH: PH, SC: SC, OX: OX, HB: HB, wide: wide, paused: paused, pw: pw, auto: auto, parts: parts.length,
                    time: test.time, kills: test.kills, hits: test.hits, deadAt: test.deadAt, bossesSeen: test.bosses, beaten: test.beaten, fps: test.fps, pows: test.pows, fish: test.fish };
            },
            toBoss: function (w) { world = w || 0; boss = null; trans = null; belts.length = 0; foes.length = 0; bullets.length = 0; beams.length = 0; wt = WORLDS[world].T + 8; phase = 'play'; },
            toWorld: function (w) { world = w; wt = 0; phase = 'play'; boss = null; trans = null; belts.length = 0; foes.length = 0; bullets.length = 0; },
            power: function (k) { pw[k] = POW[k]; },
            bossHp: function (f) { if (boss) boss.hp = Math.max(1, boss.max * f); },
            kill: function () { lives = 1; ship.inv = 0; pw.shield = 0; hurt(); }
        };
        test.view = { ship: ship, bullets: function () { return bullets; }, foes: function () { return foes; }, items: function () { return items; },
            beams: function () { return beams; }, boss: function () { return boss; }, dims: function () { return { PW: PW, PH: PH, HB: HB }; } };
    }

    fit(api.size());
    ship.x = PW / 2; ship.y = PH - 80;
    api.onResize(fit);
    show('World 1: ' + WORLDS[0].name, '', 2.6);
    return { destroy: function () { if (window.__pr === test) delete window.__pr; } };
});
