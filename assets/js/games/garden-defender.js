/* Garden Defender (id garden-defender): a top down arena shooter. The cat keeps its garden with a water pistol while
   waves of ladybugs, snails (they leave slime that slows the cat), beetles (they stop, aim and charge) and wind up
   mice (fast straight runs, bouncing off the fence) come in from every side. Every fourth wave brings a mini boss:
   the Queen Beetle, the Clockwork Rat and the Giant Snail, then again, tougher. After each wave the cat picks one of
   three upgrades (fire rate, spread, splash, speed, extra life, sprinkler turret, water pressure, range).
   The garden is a virtual arena whose shorter side is 400 units, below a slim HUD strip; on phones held upright the
   two thumb sticks get their own band under the garden, so thumbs never cover the action. Easy, Normal and Hard
   change the hearts, the number and speed of the critters and the mini bosses' health. Score, and the best wave per
   difficulty (kept in localStorage). Shell API: arcade.js. */
Arcade.register('garden-defender', function (api) {
    'use strict';
    api.css(
        '.gd, .gd-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
        '.gd { overflow: hidden; background: #5c9e48; }' +
        '.gd-cv { touch-action: none; cursor: crosshair; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }' +
        '.stage-area.game-garden-defender ~ .mascot { opacity: .45; pointer-events: none; }');

    /* ---------- constants and small helpers ---------- */
    var TAU = Math.PI * 2, RM = !!api.reducedMotion, MAXP = RM ? 90 : 240;
    var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    var LVL = api.level();
    var D = LVL === 'easy' ? { hearts: 5, dens: 0.7, spd: 0.85, boss: 0.8, shoot: 0.7, grow: 1.1 } :
            LVL === 'hard' ? { hearts: 3, dens: 1.25, spd: 1.12, boss: 1.25, shoot: 1.3, grow: 1.16 } :
                             { hearts: 4, dens: 1, spd: 1, boss: 1, shoot: 1, grow: 1.13 };
    var TOPH = 34, CR = 11;                                   /* HUD strip (CSS px), the cat's radius (units) */
    var KIND = {
        bug: { hp: 1, r: 8, spd: 74, pts: 10 },
        mouse: { hp: 2, r: 10, spd: 140, pts: 20 },
        snail: { hp: 5, r: 12, spd: 24, pts: 30 },
        beetle: { hp: 3, r: 11, spd: 46, pts: 25 },
        queen: { hp: 60, r: 26, spd: 40, pts: 400, boss: 'Queen Beetle' },
        rat: { hp: 85, r: 24, spd: 150, pts: 500, boss: 'Clockwork Rat' },
        giant: { hp: 120, r: 30, spd: 20, pts: 600, boss: 'Giant Snail' }};
    var UPS = {
        rate: { name: 'Fire rate', desc: 'Spray 25% faster', col: '#4fb3ff', max: 5 },
        spread: { name: 'Spread', desc: 'One more stream', col: '#7ad9c8', max: 3 },
        splash: { name: 'Splash', desc: 'Drops splash nearby bugs', col: '#9b8cff', max: 4 },
        speed: { name: 'Speed', desc: 'Run 12% faster', col: '#ffb547', max: 3 },
        life: { name: 'Extra life', desc: 'One more heart', col: '#ff6b8a', max: 99 },
        treat: { name: 'Fish treat', desc: 'Bonus points', col: '#ffb547', max: 99 },
        turret: { name: 'Sprinkler', desc: 'A sprinkler turret where you stand', col: '#5ccf6e', max: 4 },
        power: { name: 'Pressure', desc: 'Each drop hits 35% harder', col: '#3d7bff', max: 4 },
        range: { name: 'Range', desc: 'Drops fly 25% further', col: '#55c2e0', max: 3 }};

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function seeded(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
    function bestWaves() { try { var o = JSON.parse(localStorage.getItem('garden-defender-wave')); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    function saveWave(n) {
        var o = bestWaves(), old = typeof o[LVL] === 'number' ? o[LVL] : 0;
        if (n > old) { o[LVL] = n; try { localStorage.setItem('garden-defender-wave', JSON.stringify(o)); } catch (e) { /* private mode */ } }
        return Math.max(n, old);
    }

    /* the cat's colours follow the look picked with the corner mascot (CSS variables of cat.css), ginger if missing */
    var SK = { fur: '#f6a23a', light: '#ffc06e', stripe: '#cf7419', line: '#3b2a1e' };
    (function () {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* ginger */ }
        function v(name, dflt) { var s = cs && cs.getPropertyValue(name).trim(); return s || dflt; }
        var look = document.documentElement.getAttribute('data-cat') || 'ginger';
        SK.fur = v('--fur-bot', SK.fur); SK.light = v('--fur-top', SK.light); SK.stripe = v('--stripe', SK.stripe); SK.tail = v('--tail', SK.fur);
        if (look === 'tuxedo' || look === 'bat' || look === 'hacker') SK.line = '#17181c';
    })();

    /* ---------- page ---------- */
    var wrapEl = document.createElement('div');
    wrapEl.className = 'gd';
    wrapEl.innerHTML = '<canvas class="gd-cv"></canvas>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.gd-cv'), ctx = cv.getContext('2d', { alpha: false });
    var dpr = 1, W = 1, H = 1, SC = 1, AW = 400, AH = 400, AX = 0, AY = TOPH, PADH = 0, touchy = !!api.touch, bg = document.createElement('canvas');

    /* ---------- state ---------- */
    var phase = 'play', wave = 0, clock = 0, score = 0, shownScore = -1, hearts = D.hearts, maxHearts = D.hearts, ended = false, paused = false;
    var cat = { x: 200, y: 200, ang: -Math.PI / 2, inv: 0, fireT: 0, walk: 0, moving: false, hurt: 0 };
    var lv = { rate: 0, spread: 0, splash: 0, speed: 0, power: 0, range: 0, turret: 0 };
    var foes = [], drops = [], shots = [], slime = [], turrets = [], parts = [], pops = [], warns = [];
    var queue = [], spawnT = 0, boss = null, cards = [], cardT = 0, waveT = 0, overT = 0, banner = { text: '', sub: '', t: 9, dur: 2.5 }, hintT = 0;
    var keys = {}, mouse = { x: 0, y: 0, on: false, down: false }, autoKey = false, sticks = { L: null, R: null }, sfxT = {};
    var shake = 0, redFlash = 0, kills = 0, test = null;

    function sfx(n, gap) { if (clock - (sfxT[n] || -9) < (gap || 0.07)) return; sfxT[n] = clock; api.sfx(n); }
    function show(text, sub, dur) { banner.text = text; banner.sub = sub || ''; banner.t = 0; banner.dur = dur || 2.5; }
    function kick(n) { if (!RM) shake = Math.max(shake, n); }

    /* ---------- layout ---------- */
    function fit(s) {
        W = Math.max(1, s.w); H = Math.max(1, s.h);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        PADH = touchy && H > W * 1.1 ? clamp(Math.round(H * 0.25), 140, 200) : 0;
        var aw = W, ah = Math.max(120, H - TOPH - PADH);
        SC = Math.min(aw, ah) / 400;
        var ow = AW, oh = AH;
        AW = aw / SC; AH = ah / SC; AX = 0; AY = TOPH;
        cat.x = clamp(cat.x * AW / ow, 20, AW - 20); cat.y = clamp(cat.y * AH / oh, 20, AH - 20);
        turrets.forEach(function (t) { t.x = clamp(t.x * AW / ow, 20, AW - 20); t.y = clamp(t.y * AH / oh, 20, AH - 20); });
        buildBg();
    }
    function buildBg() {   /* the garden: mown stripes, flower beds, stepping stones and the fence, drawn once */
        bg.width = cv.width; bg.height = cv.height;
        var g = bg.getContext('2d'), r = seeded(77), i, x, y;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = '#3d6b33'; g.fillRect(0, 0, W, H);
        g.setTransform(SC * dpr, 0, 0, SC * dpr, AX * dpr, AY * dpr);
        var sw = 36;
        for (i = 0; i * sw < AW + sw; i++) { g.fillStyle = i % 2 ? '#79bf5c' : '#6fb553'; g.fillRect(i * sw, 0, sw, AH); }
        for (i = 0; i < 90; i++) {   /* tufts */
            x = r() * AW; y = r() * AH;
            g.strokeStyle = 'rgba(40,90,30,.35)'; g.lineWidth = 1.2; g.beginPath();
            g.moveTo(x - 3, y + 3); g.lineTo(x - 1, y - 3); g.moveTo(x, y + 3); g.lineTo(x + 1, y - 4); g.moveTo(x + 3, y + 3); g.lineTo(x + 4, y - 2); g.stroke();
        }
        function bed(bx, by, w, h) {
            g.fillStyle = '#8a5a36'; g.beginPath(); g.ellipse(bx, by, w, h, 0, 0, TAU); g.fill();
            g.fillStyle = '#6e4529'; g.beginPath(); g.ellipse(bx, by, w - 4, h - 4, 0, 0, TAU); g.fill();
            for (var k = 0; k < 7; k++) {
                var fx = bx + (r() - 0.5) * w * 1.3, fy = by + (r() - 0.5) * h * 1.2, c = pick(['#ff7aa8', '#ffd84d', '#ffffff', '#b98cff', '#ff9f4d']);
                g.fillStyle = '#3f8a3a'; g.beginPath(); g.arc(fx + 3, fy + 4, 4, 0, TAU); g.fill();
                g.fillStyle = c;
                for (var p = 0; p < 5; p++) { var a = p * TAU / 5; g.beginPath(); g.arc(fx + Math.cos(a) * 3.6, fy + Math.sin(a) * 3.6, 3, 0, TAU); g.fill(); }
                g.fillStyle = '#ffcf3d'; g.beginPath(); g.arc(fx, fy, 2, 0, TAU); g.fill();
            }
        }
        bed(42, 42, 34, 24); bed(AW - 42, 42, 34, 24); bed(42, AH - 42, 34, 24); bed(AW - 42, AH - 42, 34, 24);
        for (i = 0; i < 6; i++) {   /* stepping stones across the middle */
            x = AW * (0.2 + 0.6 * i / 5); y = AH / 2 + Math.sin(i * 1.3) * AH * 0.12;
            g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x + 1.5, y + 2, 12, 8, 0.3, 0, TAU); g.fill();
            g.fillStyle = '#c9c3b5'; g.beginPath(); g.ellipse(x, y, 12, 8, 0.3, 0, TAU); g.fill();
        }
        g.fillStyle = '#e9d8b4'; g.strokeStyle = '#a88a5a'; g.lineWidth = 1.5;   /* fence posts along the border */
        var step = 22;
        for (x = 6; x < AW; x += step) { post(g, x, 5); post(g, x, AH - 5); }
        for (y = 6 + step; y < AH - step; y += step) { post(g, 5, y); post(g, AW - 5, y); }
        g.fillStyle = 'rgba(40,30,20,.25)'; g.fillRect(0, 9, AW, 1.5); g.fillRect(0, AH - 10, AW, 1.5);
        if (PADH) {   /* the thumb band below the garden: a wooden deck */
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.fillStyle = '#b78452'; g.fillRect(0, H - PADH, W, PADH);
            g.fillStyle = 'rgba(80,45,20,.25)';
            for (y = H - PADH + 22; y < H; y += 26) g.fillRect(0, y, W, 2);
            g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, H - PADH, W, 4);
        }
    }
    function post(g, x, y) { g.beginPath(); g.rect(x - 3, y - 4, 6, 8); g.fill(); g.stroke(); }

    /* ---------- waves ---------- */
    function isBossWave(n) { return n % 4 === 0; }
    function startWave() {
        wave += 1; waveT = 0; phase = 'play'; queue = []; spawnT = 1.2;
        var n = wave, k = Math.round((5 + n * 3.2) * D.dens), w = { bug: 6, mouse: n >= 2 ? 3 : 0, snail: n >= 3 ? 2 : 0, beetle: n >= 4 ? 2 + n * 0.2 : 0 };
        if (n >= 7) { w.mouse += 1; w.snail += 0.5; }
        var tot = w.bug + w.mouse + w.snail + w.beetle, i;
        if (isBossWave(n)) k = Math.round(k * 0.45);
        for (i = 0; i < k; i++) {
            var r = Math.random() * tot, t = 'bug';
            if ((r -= w.bug) > 0) { t = 'mouse'; if ((r -= w.mouse) > 0) { t = 'snail'; if ((r -= w.snail) > 0) t = 'beetle'; } }
            queue.push(t);
        }
        if (isBossWave(n)) {
            var bk = ['queen', 'rat', 'giant'][(n / 4 - 1) % 3];
            queue.splice(Math.min(3, queue.length), 0, bk);
            show('Wave ' + n, KIND[bk].boss + ' is coming!', 2.6); api.cat('wow');
        } else show('Wave ' + n, n === 1 ? 'Here they come' : '', 2);
        if (test) test.waves = wave;
    }
    function spawnFrom(type) {
        var side = Math.floor(Math.random() * 4), x, y, m = 16;
        if (side === 0) { x = rnd(20, AW - 20); y = -m; } else if (side === 1) { x = AW + m; y = rnd(20, AH - 20); }
        else if (side === 2) { x = rnd(20, AW - 20); y = AH + m; } else { x = -m; y = rnd(20, AH - 20); }
        if (Math.hypot(x - cat.x, y - cat.y) < 110) { x = AW - x; y = AH - y; }   /* never right next to the cat */
        warns.push({ x: clamp(x, 8, AW - 8), y: clamp(y, 8, AH - 8), t: 0, type: type, sx: x, sy: y });
    }
    function swarm(n) {   /* ladybugs climbing in from every side at once */
        var off = Math.random() * TAU, rad = Math.hypot(AW, AH) / 2 + 20;
        for (var i = 0; i < n; i++) {
            var a = off + i * TAU / n, x = AW / 2 + Math.cos(a) * rad, y = AH / 2 + Math.sin(a) * rad;
            x = clamp(x, -16, AW + 16); y = clamp(y, -16, AH + 16);
            var qi = queue.indexOf('bug');   /* only ladybugs from the queue join a swarm */
            if (qi >= 0) queue.splice(qi, 1);
            warns.push({ x: clamp(x, 8, AW - 8), y: clamp(y, 8, AH - 8), t: 0, type: 'bug', sx: x, sy: y });
        }
    }
    function makeFoe(type, x, y) {
        var b = KIND[type], cyc = Math.floor((wave - 1) / 12), sp = D.spd * Math.min(1.6, 1 + 0.035 * wave);
        var f = { type: type, x: x, y: y, vx: 0, vy: 0, r: b.r, hp: b.hp, max: b.hp, spd: b.spd * sp * rnd(0.9, 1.1), t: 0, flash: 0, ang: 0,
            st: 'walk', stT: rnd(1, 2.5), kb: 0, kx: 0, ky: 0, wob: Math.random() * TAU, slimeT: 0, tx: 0, ty: 0 };
        if (b.boss) {
            f.hp = f.max = Math.round(b.hp * D.boss * (1 + 0.3 * cyc) * Math.pow(D.grow, (wave - 4) * 0.8));
            f.spd = b.spd * D.spd; f.boss = true; f.stT = 2; f.atk = 2.5; f.split = 0;
            boss = f;
        } else { f.hp = f.max = b.hp * Math.pow(D.grow, wave - 1); }   /* the critters toughen up faster than the upgrades add */
        if (type === 'mouse' || type === 'rat') { var a = Math.atan2(cat.y - y, cat.x - x) + rnd(-0.4, 0.4); f.vx = Math.cos(a) * f.spd; f.vy = Math.sin(a) * f.spd; f.stT = rnd(1.2, 2); }
        foes.push(f);
        return f;
    }

    /* ---------- the cat's water ---------- */
    function fireInterval() { return 1 / (4.6 * Math.pow(1.25, lv.rate)); }
    function spray(a) {
        var n = 1 + lv.spread, spd = 390, life = 0.5 * Math.pow(1.25, lv.range), dmg = Math.pow(1.35, lv.power), i;
        for (i = 0; i < n; i++) {
            var aa = a + (i - (n - 1) / 2) * 0.13 + rnd(-0.03, 0.03);
            drops.push({ x: cat.x + Math.cos(a) * 16, y: cat.y + Math.sin(a) * 16, vx: Math.cos(aa) * spd, vy: Math.sin(aa) * spd, t: 0, life: life, dmg: dmg, r: 3.4 + lv.power * 0.4 });
        }
    }
    function nearestFoe(x, y, maxD) {
        var best = null, bd = maxD * maxD;
        for (var i = 0; i < foes.length; i++) { var f = foes[i], d = (f.x - x) * (f.x - x) + (f.y - y) * (f.y - y); if (d < bd && f.x > -5 && f.x < AW + 5 && f.y > -5 && f.y < AH + 5) { bd = d; best = f; } }
        return best;
    }
    function hitFoe(f, dmg, kx, ky) {
        if (f.dead) return;
        f.hp -= dmg; f.flash = 0.08;
        if (!f.boss) { f.kx += kx * 40; f.ky += ky * 40; }
        if (f.hp <= 0) killFoe(f);
    }
    function killFoe(f) {
        f.dead = true; kills += 1;
        var pts = Math.round(KIND[f.type].pts * (1 + wave * 0.1));
        score += pts;
        pops.push({ x: f.x, y: f.y - 8, t: 0, text: '+' + pts, c: f.boss ? '#ffd23f' : '#fff' });
        burst(f.x, f.y, f.boss ? 30 : 9, f.type === 'bug' ? '#ff4d4d' : f.type === 'snail' || f.type === 'giant' ? '#e0b37a' : f.type === 'beetle' || f.type === 'queen' ? '#3fb5a0' : '#b8bcc8');
        sfx('pop');
        if (f.boss) { boss = null; kick(12); sfx('win', 0); api.cat('happy'); api.say('Garden saved!', 1600); if (test) test.bossKills += 1; }
        if (test) test.kills += 1;
    }
    function burst(x, y, n, col) {
        if (RM) n = Math.ceil(n / 2);
        for (var i = 0; i < n && parts.length < MAXP; i++) {
            var a = Math.random() * TAU, v = rnd(30, 140);
            parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: rnd(0.3, 0.6), c: i % 3 ? col : '#fff', s: rnd(2, 4) });
        }
    }
    function hurtCat(cause) {
        if (cat.inv > 0 || phase !== 'play' || (test && test.dbg.god)) return;
        hearts -= 1; cat.inv = 1.5; cat.hurt = 0.4; redFlash = 1; kick(9); sfx('hit', 0);
        burst(cat.x, cat.y, 14, SK.fur);
        foes.forEach(function (f) {   /* a splash pushes the nearby critters away */
            var dx = f.x - cat.x, dy = f.y - cat.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d < 70 && !f.boss) { f.kx += dx / d * 220; f.ky += dy / d * 220; }
        });
        shots.forEach(function (s) { if (Math.hypot(s.x - cat.x, s.y - cat.y) < 60) s.dead = true; });
        if (test) test.hits.push(Math.round(test.time * 10) / 10 + ':' + cause);
        if (hearts <= 0) { phase = 'over'; overT = 0; burst(cat.x, cat.y, 30, '#7cc8ff'); if (test) test.deadAt = test.time; }
        else { api.cat('sad'); if (hearts === 1) api.say('One heart left!', 1500); }
    }

    /* ---------- upgrades between waves ---------- */
    function offer() {
        phase = 'pick'; cardT = 0;
        var pool = Object.keys(UPS).filter(function (k) { return k === 'treat' ? false : k === 'life' ? maxHearts < D.hearts + 3 || hearts < maxHearts : lv[k] < UPS[k].max; });
        cards = [];
        while (cards.length < 3 && pool.length) cards.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        while (cards.length < 3) cards.push('treat');   /* everything maxed out: fish treats for points */
        if (hearts <= 1 && cards.indexOf('life') < 0 && (maxHearts < D.hearts + 3 || hearts < maxHearts)) cards[2] = 'life';
        sfx('point', 0);
        if (test && test.autoPick) choose(test.autoPick(cards.slice(), lv, hearts));
    }
    function choose(i) {
        var k = cards[i];
        if (!k || phase !== 'pick') return;
        if (k === 'life') { maxHearts = Math.min(D.hearts + 3, maxHearts + 1); hearts = Math.min(maxHearts, hearts + 1); }
        else if (k === 'treat') score += 60 * wave;
        else if (k === 'turret') { lv.turret += 1; turrets.push({ x: clamp(cat.x, 24, AW - 24), y: clamp(cat.y, 24, AH - 24), ang: 0, fireT: 0, t: 0 }); }
        else lv[k] += 1;
        pops.push({ x: cat.x, y: cat.y - 24, t: 0, text: UPS[k].name + '!', c: UPS[k].col });
        sfx('jump', 0);
        if (test) test.picks.push(k);
        cards = [];
        startWave();
    }

    /* ---------- the update ---------- */
    function update(dt) {
        clock += dt;
        if (paused) return;
        shake = Math.max(0, shake - dt * 30); redFlash = Math.max(0, redFlash - dt * 2.5);
        banner.t += dt; hintT += dt;
        if (test) test.time += dt;
        cat.inv = Math.max(0, cat.inv - dt); cat.hurt = Math.max(0, cat.hurt - dt);
        var i, k;
        if (phase === 'over') { overT += dt; if (overT > 1.4 && !ended) finish(); }
        if (phase === 'pick') cardT += dt;
        if (phase !== 'over') moveCat(dt);
        if (phase === 'play') {
            waveT += dt;
            spawnT -= dt;
            if (spawnT <= 0 && queue.length) {
                var n = Math.min(queue.length, 1 + Math.floor(Math.random() * Math.min(6, 1 + wave / 2.5)));
                if (wave >= 5 && queue[0] === 'bug' && Math.random() < 0.3) swarm(Math.min(queue.filter(function (q) { return q === 'bug'; }).length, 6 + Math.floor(wave / 3)));
                else for (i = 0; i < n; i++) spawnFrom(queue.shift());
                spawnT = rnd(1.1, 1.9) / Math.min(2.4, D.dens * (1 + wave * 0.06));
            }
            if (!queue.length && !warns.length && !foes.length) {
                score += 100 * wave;
                pops.push({ x: cat.x, y: cat.y - 30, t: 0, text: 'Wave cleared +' + 100 * wave, c: '#ffd23f' });
                offer();
            }
            fireCat(dt);
        }
        for (i = warns.length - 1; i >= 0; i--) {   /* a dirt puff at the fence, then the critter climbs in */
            var w = warns[i];
            w.t += dt;
            if (w.t > 0.8) { warns.splice(i, 1); if (phase === 'play' || phase === 'over') makeFoe(w.type, w.sx, w.sy); }
        }
        for (i = 0; i < foes.length; i++) upFoe(foes[i], dt);
        for (i = 0; i < foes.length; i++) {   /* critters push each other apart a little */
            var a = foes[i];
            for (k = i + 1; k < foes.length; k++) {
                var b = foes[k], dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
                if (d2 < rr * rr && d2 > 0.01) {
                    var d = Math.sqrt(d2), push = (rr - d) * 0.5, ux = dx / d, uy = dy / d, wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
                    a.x -= ux * push * wa; a.y -= uy * push * wa; b.x += ux * push * wb; b.y += uy * push * wb;
                }
            }
        }
        foes = foes.filter(function (f) { return !f.dead; });
        for (i = 0; i < drops.length; i++) {
            var p = drops[i];
            p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.t > p.life || p.x < -10 || p.x > AW + 10 || p.y < -10 || p.y > AH + 10) { p.dead = true; splat(p.x, p.y, 2); continue; }
            for (k = 0; k < foes.length; k++) {
                var f = foes[k], hr = f.r + p.r;
                if (!f.dead && (f.x - p.x) * (f.x - p.x) + (f.y - p.y) * (f.y - p.y) < hr * hr) {
                    p.dead = true;
                    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    hitFoe(f, p.dmg, p.vx / sp, p.vy / sp);
                    splat(p.x, p.y, 4);
                    if (lv.splash) splashAt(p.x, p.y, f, p.dmg);
                    break;
                }
            }
        }
        drops = drops.filter(function (q) { return !q.dead; });
        for (i = 0; i < turrets.length; i++) upTurret(turrets[i], dt);
        for (i = 0; i < shots.length; i++) {   /* the mini bosses' gears and slime blobs */
            var s = shots[i];
            s.t += dt;
            if (s.kind === 'blob') {
                if (s.t >= s.T) {
                    s.dead = true; splat(s.tx, s.ty, 10); slime.push({ x: s.tx, y: s.ty, r: 22, t: 0, life: 7 });
                    if (Math.hypot(cat.x - s.tx, cat.y - s.ty) < 24 + CR * 0.6) hurtCat('blob');
                }
                continue;
            }
            s.x += s.vx * dt; s.y += s.vy * dt;
            if (s.x < -20 || s.x > AW + 20 || s.y < -20 || s.y > AH + 20) { s.dead = true; continue; }
            if (Math.hypot(cat.x - s.x, cat.y - s.y) < s.r + CR * 0.6) { s.dead = true; hurtCat('gear'); }
        }
        shots = shots.filter(function (q) { return !q.dead; });
        slime = slime.filter(function (q) { q.t += dt; return q.t < q.life; });
        for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i];
            q.t += dt;
            if (q.t >= q.max) { parts.splice(i, 1); continue; }
            q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92;
        }
        pops = pops.filter(function (o) { o.t += dt; return o.t < 1; });
    }
    function splat(x, y, n) {
        for (var i = 0; i < n && parts.length < MAXP; i++) {
            var a = Math.random() * TAU, v = rnd(20, 70);
            parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: 0.3, c: i % 2 ? '#bfe6ff' : '#5ab0ff', s: 2.5 });
        }
    }
    function splashAt(x, y, skip, dmg) {
        var rad = 18 + 9 * lv.splash, sd = dmg * (0.3 + 0.12 * lv.splash);
        for (var k = 0; k < foes.length; k++) {
            var f = foes[k];
            if (f !== skip && !f.dead && Math.hypot(f.x - x, f.y - y) < rad + f.r) hitFoe(f, sd, 0, 0);
        }
        if (parts.length < MAXP) parts.push({ x: x, y: y, vx: 0, vy: 0, t: 0, max: 0.25, c: 'ring', s: rad });
    }
    function moveCat(dt) {
        var mx = 0, my = 0, ctl = test && test.ctrl ? test.ctrl(test.view) : null;
        if (ctl) { mx = ctl.mx; my = ctl.my; }
        else if (sticks.L) { mx = sticks.L.dx; my = sticks.L.dy; }
        else { mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); }
        var m = Math.sqrt(mx * mx + my * my);
        if (m > 1) { mx /= m; my /= m; m = 1; }
        var onSlime = false;
        for (var i = 0; i < slime.length; i++) if (Math.hypot(slime[i].x - cat.x, slime[i].y - cat.y) < slime[i].r) { onSlime = true; break; }
        var sp = 150 * Math.pow(1.12, lv.speed) * (onSlime ? 0.55 : 1);
        cat.x = clamp(cat.x + mx * sp * dt, 14, AW - 14); cat.y = clamp(cat.y + my * sp * dt, 14, AH - 14);
        cat.moving = m > 0.1; if (cat.moving) cat.walk += dt * 10 * m;
        cat.slimed = onSlime;
        /* aiming: test bot, right stick, mouse, or the nearest critter */
        cat.firing = false;
        var ax = null, ay = null;
        if (ctl) { if (ctl.fire) { ax = ctl.ax; ay = ctl.ay; cat.firing = true; } }
        else if (sticks.R) {
            cat.firing = true;
            if (Math.hypot(sticks.R.dx, sticks.R.dy) > 0.25) { ax = sticks.R.dx; ay = sticks.R.dy; }
            else { var nf = nearestFoe(cat.x, cat.y, 260); if (nf) { ax = nf.x - cat.x; ay = nf.y - cat.y; } }
        } else if (mouse.on && !touchy) {
            ax = mouse.x - cat.x; ay = mouse.y - cat.y; cat.firing = mouse.down;
        }
        if (autoKey) {
            var nn = nearestFoe(cat.x, cat.y, 400);
            if (nn) { ax = nn.x - cat.x; ay = nn.y - cat.y; }
            cat.firing = true;
        }
        if (ax !== null && (ax || ay)) cat.ang = Math.atan2(ay, ax);
        else if (cat.moving && !mouse.on) cat.ang = Math.atan2(my, mx);
    }
    function fireCat(dt) {
        cat.fireT -= dt;
        if (!cat.firing || cat.fireT > 0) return;
        cat.fireT = fireInterval();
        spray(cat.ang);
        if (Math.random() < 0.3) sfx('tap', 0.18);
    }
    function upTurret(t, dt) {
        t.t += dt; t.fireT -= dt;
        var f = nearestFoe(t.x, t.y, 130 + 12 * lv.range);
        if (f) t.ang += Math.atan2(Math.sin(Math.atan2(f.y - t.y, f.x - t.x) - t.ang), Math.cos(Math.atan2(f.y - t.y, f.x - t.x) - t.ang)) * Math.min(1, dt * 10);
        else t.ang += dt * 1.5;
        if (f && t.fireT <= 0 && phase === 'play') {
            t.fireT = 0.42 / (1 + 0.15 * Math.max(0, lv.turret - turrets.length));
            var a = t.ang + rnd(-0.08, 0.08);
            drops.push({ x: t.x + Math.cos(a) * 10, y: t.y + Math.sin(a) * 10, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, t: 0, life: 0.45 * Math.pow(1.25, lv.range), dmg: 0.8 * Math.pow(1.35, lv.power), r: 3 });
        }
    }

    /* ---------- the critters ---------- */
    function upFoe(f, dt) {
        f.t += dt; f.flash = Math.max(0, f.flash - dt);
        var dx = cat.x - f.x, dy = cat.y - f.y, d = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / d, uy = dy / d, sp = f.spd, a;
        f.x += f.kx * dt; f.y += f.ky * dt; f.kx *= Math.pow(0.02, dt); f.ky *= Math.pow(0.02, dt);
        switch (f.type) {
            case 'bug':   /* ladybugs wiggle straight at the cat */
                a = Math.atan2(uy, ux) + Math.sin(f.t * 5 + f.wob) * 0.5;
                f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; break;
            case 'snail':
                f.vx = ux * sp; f.vy = uy * sp;
                f.slimeT -= dt;
                if (f.slimeT <= 0 && f.x > 0 && f.x < AW && f.y > 0 && f.y < AH) { f.slimeT = 0.7; slime.push({ x: f.x, y: f.y, r: 11, t: 0, life: 5 }); }
                break;
            case 'beetle':   /* walks closer, stops and aims (a red line), then charges */
                if (f.st === 'walk') {
                    f.vx = ux * sp; f.vy = uy * sp; f.stT -= dt;
                    if (f.stT <= 0 && d < 190 && f.x > 10 && f.x < AW - 10 && f.y > 10 && f.y < AH - 10) { f.st = 'aim'; f.stT = 0.75; f.tx = ux; f.ty = uy; }
                } else if (f.st === 'aim') {
                    f.vx = 0; f.vy = 0; f.stT -= dt;
                    if (f.stT <= 0) { f.st = 'charge'; f.stT = 0.55; }
                } else if (f.st === 'charge') {
                    f.vx = f.tx * 270 * D.spd; f.vy = f.ty * 270 * D.spd; f.stT -= dt;
                    if (f.stT <= 0) { f.st = 'walk'; f.stT = rnd(1.6, 2.6); }
                }
                break;
            case 'mouse':   /* wind up mice: fast straight runs, bounce off the fence, wind down, aim again */
                f.stT -= dt;
                if (f.st === 'walk' && f.stT <= 0) { f.st = 'wind'; f.stT = 0.5; }
                else if (f.st === 'wind') { f.vx *= Math.pow(0.02, dt); f.vy *= Math.pow(0.02, dt); if (f.stT <= 0) { f.st = 'walk'; f.stT = rnd(1.3, 2.1); a = Math.atan2(uy, ux) + rnd(-0.3, 0.3); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; } }
                bounce(f);
                break;
            case 'queen': upQueen(f, dt, ux, uy, d); break;
            case 'rat': upRat(f, dt, ux, uy); break;
            case 'giant': upGiant(f, dt, ux, uy); break;
        }
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.vx || f.vy) f.ang = Math.atan2(f.vy, f.vx);
        if (f.x > 4 && f.x < AW - 4 && f.y > 4 && f.y < AH - 4) f.inside = true;
        if (f.inside) { f.x = clamp(f.x, f.r * 0.6, AW - f.r * 0.6); f.y = clamp(f.y, f.r * 0.6, AH - f.r * 0.6); }
        else { f.x += ux * 30 * dt; f.y += uy * 30 * dt; }
        if (phase === 'play' && d < f.r * 0.8 + CR) hurtCat(f.type);
    }
    function bounce(f) {
        if (!f.inside) return;
        if ((f.x < f.r && f.vx < 0) || (f.x > AW - f.r && f.vx > 0)) f.vx = -f.vx;
        if ((f.y < f.r && f.vy < 0) || (f.y > AH - f.r && f.vy > 0)) f.vy = -f.vy;
    }
    function upQueen(f, dt, ux, uy, d) {
        f.atk -= dt;
        if (f.st === 'walk') {
            f.vx = ux * f.spd; f.vy = uy * f.spd; f.stT -= dt;
            if (f.stT <= 0 && f.inside) { f.st = 'aim'; f.stT = 0.9; f.tx = ux; f.ty = uy; }
        } else if (f.st === 'aim') { f.vx = f.vy = 0; f.stT -= dt; if (f.stT <= 0) { f.st = 'charge'; f.stT = 0.7; } }
        else { f.vx = f.tx * 250 * D.spd; f.vy = f.ty * 250 * D.spd; f.stT -= dt; bounce(f); if (f.stT <= 0) { f.st = 'walk'; f.stT = f.hp < f.max / 2 ? 1.4 : 2.2; kick(4); } }
        if (f.atk <= 0) {   /* calls her ladybugs */
            f.atk = 5.5 / D.shoot;
            var n = LVL === 'easy' ? 2 : 3;
            for (var i = 0; i < n; i++) { var b = makeFoe('bug', f.x + rnd(-20, 20), f.y + rnd(-20, 20)); b.inside = true; }
        }
    }
    function upRat(f, dt, ux, uy) {
        f.atk -= dt;
        if (f.st === 'walk') {
            bounce(f); f.stT -= dt;
            if (f.stT <= 0) { f.st = 'wind'; f.stT = 1.0; }
        } else {
            f.vx *= Math.pow(0.01, dt); f.vy *= Math.pow(0.01, dt); f.stT -= dt;
            if (f.stT <= 0) {   /* springs a ring of gears, then runs at the cat */
                var n = Math.round((LVL === 'easy' ? 8 : LVL === 'hard' ? 14 : 11) + (f.hp < f.max / 2 ? 3 : 0)), off = Math.random() * TAU;
                for (var i = 0; i < n; i++) { var a = off + i * TAU / n; shots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 105 * D.spd, vy: Math.sin(a) * 105 * D.spd, r: 6, t: 0, kind: 'gear' }); }
                sfx('move', 0);
                f.st = 'walk'; f.stT = rnd(1.6, 2.4);
                var aa = Math.atan2(uy, ux) + rnd(-0.25, 0.25); f.vx = Math.cos(aa) * f.spd; f.vy = Math.sin(aa) * f.spd;
            }
        }
    }
    function upGiant(f, dt, ux, uy) {
        f.vx = ux * f.spd; f.vy = uy * f.spd; f.atk -= dt; f.slimeT -= dt;
        if (f.slimeT <= 0 && f.inside) { f.slimeT = 0.5; slime.push({ x: f.x, y: f.y, r: 20, t: 0, life: 7 }); }
        if (f.atk <= 0 && f.inside) {   /* lobs slime blobs: a shadow ring shows where they land */
            f.atk = (f.hp < f.max / 2 ? 2.2 : 3) / D.shoot;
            var n = f.hp < f.max / 2 ? 3 : 2;
            for (var i = 0; i < n; i++) {
                var tx = clamp(cat.x + (i ? rnd(-60, 60) : 0), 20, AW - 20), ty = clamp(cat.y + (i ? rnd(-60, 60) : 0), 20, AH - 20);
                shots.push({ x: f.x, y: f.y, sx: f.x, sy: f.y, tx: tx, ty: ty, T: 1.15, t: 0, r: 8, kind: 'blob' });
            }
        }
        var frac = f.hp / f.max;   /* at 2/3 and 1/3 small snails break off */
        if ((f.split === 0 && frac < 2 / 3) || (f.split === 1 && frac < 1 / 3)) {
            f.split += 1;
            for (var k = 0; k < (LVL === 'easy' ? 2 : 3); k++) { var s = makeFoe('snail', f.x + rnd(-25, 25), f.y + rnd(-25, 25)); s.inside = true; }
            kick(5);
        }
    }

    function finish() {
        ended = true;
        var bw = saveWave(wave);
        api.end({ score: score, win: false, text: 'Game over\nWave ' + wave + ' (best wave ' + bw + ')\nScore ' + score });
    }

    /* ---------- drawing ---------- */
    function rr(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function txt(t, x, y, size, col, align, weight) {
        ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.fillStyle = col; ctx.fillText(t, x, y);
    }
    function heart(x, y, s, on, col) {
        ctx.fillStyle = col || (on ? '#ff5d7a' : 'rgba(255,255,255,.28)');
        ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
        ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1, x, y - s * 0.35);
        ctx.bezierCurveTo(x + s * 0.7, y - s * 1, x + s * 1.4, y, x, y + s * 0.9); ctx.fill();
    }
    function drawCat() {
        if (phase === 'over') return;
        if (cat.inv > 0 && !RM && Math.floor(clock * 14) % 2) ctx.globalAlpha = 0.45;
        var x = cat.x, y = cat.y, a = cat.ang, i, sw = cat.moving && !RM ? Math.sin(cat.walk) : 0;
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 4, 13, 10, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = SK.line; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
        ctx.strokeStyle = SK.tail || SK.fur; ctx.lineWidth = 4; ctx.lineCap = 'round';   /* tail */
        var tw = RM ? 0 : Math.sin(clock * 3) * 5;
        ctx.beginPath(); ctx.moveTo(0, 9); ctx.quadraticCurveTo(tw, 18, tw * 1.6 + 4, 22); ctx.stroke();
        ctx.fillStyle = SK.fur; ctx.strokeStyle = SK.line; ctx.lineWidth = 1.3;
        for (i = -1; i <= 1; i += 2) {   /* paws */
            ctx.beginPath(); ctx.arc(i * 8, -2 + sw * i * 3, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(i * 7, 8 - sw * i * 3, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(0, 3, 9, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();   /* body */
        ctx.fillStyle = SK.stripe; ctx.fillRect(-5, 3, 10, 2); ctx.fillRect(-5, 8, 10, 2);
        ctx.fillStyle = '#3d9cff'; ctx.strokeStyle = '#1f4f9a';   /* the water pistol */
        rr(3, -19, 6, 13, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.arc(6, -10, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = SK.fur; ctx.strokeStyle = SK.line;
        ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-7, -19); ctx.lineTo(-2, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -9); ctx.lineTo(7, -19); ctx.lineTo(2, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -10, 8, 0, TAU); ctx.fill(); ctx.stroke();   /* head */
        ctx.fillStyle = '#1b1530';
        if (cat.hurt > 0) { ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(-2, -11); ctx.moveTo(5, -12); ctx.lineTo(2, -11); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(-3.2, -12, 1.5, 0, TAU); ctx.arc(3.2, -12, 1.5, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.moveTo(-1.4, -15.5); ctx.lineTo(1.4, -15.5); ctx.lineTo(0, -14); ctx.fill();
        ctx.restore(); ctx.lineCap = 'butt';
        ctx.globalAlpha = 1;
    }
    function drawFoe(f) {
        var x = f.x, y = f.y, r = f.r, i, leg = RM ? 0 : Math.sin(f.t * 18) * 2;
        ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, r, r * 0.8, 0, 0, TAU); ctx.fill();
        if ((f.type === 'beetle' || f.type === 'queen') && f.st === 'aim') {   /* the charge warning */
            ctx.strokeStyle = 'rgba(255,50,70,' + (0.4 + 0.3 * Math.sin(clock * 24)).toFixed(2) + ')'; ctx.lineWidth = f.boss ? 4 : 2.5; ctx.setLineDash([7, 6]);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + f.tx * (f.boss ? 200 : 150), y + f.ty * (f.boss ? 200 : 150)); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.save(); ctx.translate(x, y); ctx.rotate(f.ang + Math.PI / 2);
        if (f.boss) ctx.scale(r / KIND[f.type === 'queen' ? 'beetle' : f.type === 'rat' ? 'mouse' : 'snail'].r, r / KIND[f.type === 'queen' ? 'beetle' : f.type === 'rat' ? 'mouse' : 'snail'].r);
        ctx.lineJoin = 'round';
        if (f.type === 'bug') {
            ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 1.2;
            for (i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-6, i * 3); ctx.lineTo(-10, i * 4 + leg * i); ctx.moveTo(6, i * 3); ctx.lineTo(10, i * 4 - leg * i); ctx.stroke(); }
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(0, -6, 4, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.ellipse(0, 1, 7, 8, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#1b1530'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 9); ctx.stroke();
            ctx.fillStyle = '#1b1530'; [[-3.5, -1], [3.5, -1], [-3, 4.5], [3, 4.5]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, TAU); ctx.fill(); });
        } else if (f.type === 'snail' || f.type === 'giant') {
            ctx.fillStyle = '#e8d9b0'; ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(0, -2, 6, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#8a7a50'; ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(-4, -20); ctx.moveTo(2, -14); ctx.lineTo(4, -20); ctx.stroke();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-4, -20, 1.5, 0, TAU); ctx.arc(4, -20, 1.5, 0, TAU); ctx.fill();
            ctx.fillStyle = f.type === 'giant' ? '#c77dff' : '#d98b5a'; ctx.strokeStyle = f.type === 'giant' ? '#6a2a9a' : '#7a3f1a';
            ctx.beginPath(); ctx.arc(0, 3, 10, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 3, 6, 0.5, 5.5); ctx.stroke(); ctx.beginPath(); ctx.arc(1, 3, 2.6, 2, 7); ctx.stroke();
        } else if (f.type === 'beetle' || f.type === 'queen') {
            ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 1.4;
            for (i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-7, i * 4); ctx.lineTo(-12, i * 5 + leg * i); ctx.moveTo(7, i * 4); ctx.lineTo(12, i * 5 - leg * i); ctx.stroke(); }
            ctx.fillStyle = '#1e3a40'; ctx.beginPath(); ctx.arc(0, -8, 5, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#1e3a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -16); ctx.stroke();
            ctx.fillStyle = f.type === 'queen' ? '#7a3fc4' : '#2a9d8f'; ctx.strokeStyle = '#123'; ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.ellipse(0, 2, 9, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 13); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-4, -1, 2.4, 5, 0, 0, TAU); ctx.fill();
            if (f.type === 'queen') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-5, -15); ctx.lineTo(-2, -12); ctx.lineTo(0, -16); ctx.lineTo(2, -12); ctx.lineTo(5, -15); ctx.lineTo(5, -10); ctx.fill(); }
        } else {
            ctx.strokeStyle = '#ff9fb6'; ctx.lineWidth = 1.6;   /* tail */
            ctx.beginPath(); ctx.moveTo(0, 9); ctx.quadraticCurveTo(RM ? 0 : Math.sin(f.t * 10) * 5, 15, 0, 20); ctx.stroke();
            ctx.fillStyle = f.type === 'rat' ? '#8d7f6a' : '#a9afbd'; ctx.strokeStyle = f.type === 'rat' ? '#4a3f30' : '#5b6070'; ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(9, -2, 7, 6); ctx.quadraticCurveTo(0, 12, -7, 6); ctx.quadraticCurveTo(-9, -2, 0, -12); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffb3c1'; ctx.beginPath(); ctx.arc(-5, -5, 3.2, 0, TAU); ctx.arc(5, -5, 3.2, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(-2.2, -8, 1.1, 0, TAU); ctx.arc(2.2, -8, 1.1, 0, TAU); ctx.fill();
            ctx.save(); ctx.translate(0, 2); ctx.rotate(f.st === 'wind' ? 0 : f.t * 9);   /* the wind up key */
            ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = 1.6; ctx.fillStyle = '#ffd25a';
            ctx.beginPath(); ctx.ellipse(-4, 0, 3, 2, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(4, 0, 3, 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.restore();
            if (f.type === 'rat') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-4, -14); ctx.lineTo(-1.5, -12); ctx.lineTo(0, -15); ctx.lineTo(1.5, -12); ctx.lineTo(4, -14); ctx.lineTo(4, -10); ctx.fill(); }
        }
        ctx.restore();
        if (f.flash > 0) { ctx.globalAlpha = 0.65; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        if (f.st === 'wind' && f.type === 'rat') { ctx.strokeStyle = 'rgba(255,210,90,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 6 + (1 - f.stT) * 8, 0, TAU); ctx.stroke(); }
        if (!f.boss && f.max > 1 && f.hp < f.max) {
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - r, y - r - 7, r * 2, 3);
            ctx.fillStyle = '#7ee08a'; ctx.fillRect(x - r, y - r - 7, r * 2 * Math.max(0, f.hp / f.max), 3);
        }
    }
    function drawTurret(t) {
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(t.x + 2, t.y + 3, 11, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4caf50'; ctx.strokeStyle = '#256b2a'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(t.x, t.y, 10, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.ang);
        ctx.fillStyle = '#d5dbe6'; ctx.strokeStyle = '#59606e'; rr(0, -3, 14, 6, 2); ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.arc(t.x, t.y, 4, 0, TAU); ctx.fill();
    }
    function drawStick(s, x, y, live) {
        var R = 46;
        ctx.globalAlpha = live ? 0.9 : 0.5;
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.stroke();
        var kx = x + (live ? s.dx * R : 0), ky = y + (live ? s.dy * R : 0);
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(kx, ky, 20, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
    }
    function stickHome(side) {   /* where a resting stick is drawn */
        if (PADH) return { x: side === 'L' ? W * 0.22 : W * 0.66, y: H - PADH / 2 + 10 };
        return { x: side === 'L' ? 80 : W - 80, y: H - 80 };
    }

    function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bg, 0, 0);
        var sx = 0, sy = 0, i;
        if (shake > 0 && !RM) { sx = rnd(-shake, shake) * 0.5; sy = rnd(-shake, shake) * 0.5; }
        ctx.setTransform(SC * dpr, 0, 0, SC * dpr, (AX + sx) * dpr, (AY + sy) * dpr);
        ctx.save(); ctx.beginPath(); ctx.rect(-4, -4, AW + 8, AH + 8); ctx.clip();
        for (i = 0; i < slime.length; i++) {
            var sl = slime[i];
            ctx.globalAlpha = 0.45 * Math.min(1, (sl.life - sl.t) / 1.2);
            ctx.fillStyle = '#c6f28a'; ctx.beginPath(); ctx.ellipse(sl.x, sl.y, sl.r, sl.r * 0.75, 0, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < warns.length; i++) {   /* dirt puffs where the next critters climb in */
            var w = warns[i], k = w.t / 0.8;
            ctx.fillStyle = 'rgba(120,80,40,' + (0.5 * (1 - k * 0.5)).toFixed(2) + ')';
            ctx.beginPath(); ctx.arc(w.x, w.y, 6 + k * 8, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y, 12 + (1 - k) * 10, 0, TAU); ctx.stroke();
        }
        for (i = 0; i < shots.length; i++) {
            var s = shots[i];
            if (s.kind === 'blob') {
                var u = s.t / s.T, bx = s.sx + (s.tx - s.sx) * u, by = s.sy + (s.ty - s.sy) * u - Math.sin(u * Math.PI) * 70;
                ctx.strokeStyle = 'rgba(120,200,60,' + (0.4 + 0.4 * u).toFixed(2) + ')'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(s.tx, s.ty, 24, 0, TAU); ctx.stroke();
                ctx.fillStyle = 'rgba(120,200,60,.18)'; ctx.fill();
                ctx.fillStyle = '#9be04a'; ctx.strokeStyle = '#4a8a1a'; ctx.beginPath(); ctx.arc(bx, by, 8, 0, TAU); ctx.fill(); ctx.stroke();
            }
        }
        for (i = 0; i < turrets.length; i++) drawTurret(turrets[i]);
        for (i = 0; i < foes.length; i++) drawFoe(foes[i]);
        drawCat();
        for (i = 0; i < drops.length; i++) {
            var p = drops[i];
            ctx.fillStyle = '#3d9cff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
            ctx.fillStyle = '#d8f0ff'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.45, 0, TAU); ctx.fill();
        }
        for (i = 0; i < shots.length; i++) {
            var g = shots[i];
            if (g.kind !== 'gear') continue;
            ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.t * 8);
            ctx.fillStyle = '#5b4a2e'; ctx.beginPath(); ctx.arc(0, 0, g.r + 1.5, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ffcf3d';
            for (var t = 0; t < 6; t++) { ctx.save(); ctx.rotate(t * TAU / 6); ctx.fillRect(-1.6, -g.r - 1.5, 3.2, 3.5); ctx.restore(); }
            ctx.beginPath(); ctx.arc(0, 0, g.r - 0.5, 0, TAU); ctx.fill();
            ctx.fillStyle = '#5b4a2e'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
            ctx.restore();
        }
        for (i = 0; i < parts.length; i++) {
            var q = parts[i];
            ctx.globalAlpha = 1 - q.t / q.max;
            if (q.c === 'ring') { ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (0.5 + q.t / q.max * 0.5), 0, TAU); ctx.stroke(); }
            else { ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
        }
        ctx.globalAlpha = 1;
        ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        for (i = 0; i < pops.length; i++) {
            var o = pops[i];
            ctx.globalAlpha = 1 - o.t;
            ctx.font = '800 12px ' + FONT; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3;
            ctx.strokeText(o.text, o.x, o.y - o.t * 26); ctx.fillStyle = o.c; ctx.fillText(o.text, o.x, o.y - o.t * 26);
        }
        ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
        ctx.restore();

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (redFlash > 0) { ctx.fillStyle = 'rgba(255,60,90,' + (redFlash * (RM ? 0.1 : 0.25)).toFixed(3) + ')'; ctx.fillRect(0, TOPH, W, H - TOPH - PADH); }
        drawHud();
        if (touchy) {
            var hl = stickHome('L'), hr = stickHome('R');
            if (sticks.L) drawStick(sticks.L, sticks.L.ox, sticks.L.oy, true); else if (phase === 'play' || PADH) drawStick(null, hl.x, hl.y, false);
            if (sticks.R) drawStick(sticks.R, sticks.R.ox, sticks.R.oy, true); else if (phase === 'play' || PADH) drawStick(null, hr.x, hr.y, false);
            if (PADH) {
                ctx.textBaseline = 'middle';
                txt('MOVE', hl.x, H - PADH + 16, 11, 'rgba(255,255,255,.75)', 'center');
                txt('AIM AND SPRAY', hr.x, H - PADH + 16, 11, 'rgba(255,255,255,.75)', 'center');
                ctx.textBaseline = 'alphabetic';
            }
        }
        drawText();
        if (phase === 'pick') drawCards();
    }
    function drawHud() {
        ctx.fillStyle = '#2f5a2a'; ctx.fillRect(0, 0, W, TOPH);
        ctx.textBaseline = 'middle';
        var i, x = 12;
        for (i = 0; i < Math.max(hearts, 0); i++) { heart(x + 8, TOPH / 2, 7.5, true); x += W < 420 ? 17 : 20; }
        x += 6;
        txt('Wave ' + Math.max(1, wave), W - 12, TOPH / 2, 15, '#fff', 'right');
        var ww = ctx.measureText('Wave ' + Math.max(1, wave)).width;
        txt(String(score), W - 24 - ww, TOPH / 2, 15, '#ffd23f', 'right');
        var sw2 = ctx.measureText(String(score)).width, right = W - 36 - ww - sw2;
        if (boss && right - x > 70) {
            var bw = Math.min(220, right - x - 8), bx = x + (right - x - bw) / 2;
            ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(bx, TOPH / 2 - 7, bw, 14, 7); ctx.fill();
            ctx.fillStyle = '#ff5d7a'; rr(bx, TOPH / 2 - 7, Math.max(14, bw * boss.hp / boss.max), 14, 7); ctx.fill();
            txt(KIND[boss.type].boss, bx + bw / 2, TOPH / 2 + 0.5, 10.5, '#fff', 'center');
        } else if (boss) {   /* very narrow: a thin bar under the strip */
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, TOPH - 4, W, 4);
            ctx.fillStyle = '#ff5d7a'; ctx.fillRect(0, TOPH - 4, W * boss.hp / boss.max, 4);
        }
        ctx.textBaseline = 'alphabetic';
    }
    function drawText() {
        var cx = AX + AW * SC / 2, cy = AY + AH * SC / 2, a;
        ctx.textBaseline = 'middle';
        if (banner.t < banner.dur) {
            a = Math.min(1, banner.t * 4, (banner.dur - banner.t) * 2.5);
            var big = W < 420 ? 22 : 26, by = AY + AH * SC * 0.3;
            ctx.globalAlpha = a; ctx.font = '800 ' + big + 'px ' + FONT;
            var bw = Math.min(W - 24, Math.max(ctx.measureText(banner.text).width, banner.sub ? 200 : 0) + 40);
            ctx.fillStyle = 'rgba(25,45,22,.7)'; rr(cx - bw / 2, by - big, bw, banner.sub ? big * 2 + 22 : big * 2, 14); ctx.fill();
            txt(banner.text, cx, by, big, '#fff', 'center');
            if (banner.sub) txt(banner.sub, cx, by + big + 4, 14, '#ffd23f', 'center', 700);
            ctx.globalAlpha = 1;
        }
        if (hintT < 6 && wave === 1 && phase === 'play') {
            a = Math.min(1, (6 - hintT) * 1.5);
            var lines = touchy ? ['Left thumb moves', 'Right thumb aims and sprays', 'Hold it still to spray the nearest bug'] :
                ['WASD or arrows to move', 'Aim with the mouse, hold the button to spray', 'Space sprays the nearest bug, P pauses'];
            var hy = AY + AH * SC * 0.66, lw = 0;
            ctx.font = '700 14px ' + FONT;
            lines.forEach(function (l) { lw = Math.max(lw, ctx.measureText(l).width); });
            ctx.globalAlpha = a; ctx.fillStyle = 'rgba(25,45,22,.66)'; rr(cx - lw / 2 - 16, hy - 16, lw + 32, lines.length * 22 + 10, 12); ctx.fill();
            lines.forEach(function (l, j) { txt(l, cx, hy + j * 22, 14, '#fff', 'center', 700); });
            ctx.globalAlpha = 1;
        }
        if (paused) {
            ctx.fillStyle = 'rgba(15,30,12,.55)'; ctx.fillRect(0, 0, W, H);
            txt('Paused', cx, cy - 10, 28, '#fff', 'center');
            txt(touchy ? 'Tap to go on' : 'Click or press any key to go on', cx, cy + 22, 14, '#e6f5dc', 'center', 700);
        }
        ctx.textBaseline = 'alphabetic';
    }
    var cardBoxes = [];
    function drawCards() {
        var n = cards.length, a = Math.min(1, cardT * 4), vertical = W < 560, i, cw, ch, gap = 12;
        ctx.globalAlpha = 0.55 * a; ctx.fillStyle = '#10200d'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a;
        cardBoxes = [];
        if (vertical) { cw = Math.min(W - 32, 380); ch = Math.max(74, Math.min(96, (H - 170) / 3 - gap)); }
        else { cw = Math.min(220, (W - 64) / 3); ch = 190; }
        var totW = vertical ? cw : n * cw + (n - 1) * gap, totH = vertical ? n * ch + (n - 1) * gap : ch;
        var x0 = (W - totW) / 2, y0 = Math.max(TOPH + 64, (H - totH) / 2 + 16);
        ctx.textBaseline = 'middle';
        txt('Wave ' + wave + ' cleared!', W / 2, y0 - 46, 22, '#fff', 'center');
        txt('Pick an upgrade' + (touchy ? '' : ' (1, 2, 3)'), W / 2, y0 - 20, 14, '#cfe8c4', 'center', 700);
        for (i = 0; i < n; i++) {
            var u = UPS[cards[i]], x = vertical ? x0 : x0 + i * (cw + gap), y = vertical ? y0 + i * (ch + gap) : y0;
            cardBoxes.push({ x: x, y: y, w: cw, h: ch });
            ctx.fillStyle = '#fffaf0'; rr(x, y, cw, ch, 14); ctx.fill();
            ctx.fillStyle = u.col; rr(x, y, vertical ? 10 : cw, vertical ? ch : 10, vertical ? 5 : 5); ctx.fill();
            var ix = vertical ? x + 46 : x + cw / 2, iy = vertical ? y + ch / 2 : y + 62;
            ctx.fillStyle = u.col; ctx.beginPath(); ctx.arc(ix, iy, 24, 0, TAU); ctx.fill();
            upIcon(cards[i], ix, iy);
            var lvTxt = cards[i] === 'life' ? hearts + ' of ' + (D.hearts + 3) + ' hearts' : cards[i] === 'treat' ? '+' + 60 * wave + ' points' : cards[i] === 'turret' ? turrets.length + ' placed' : 'Level ' + lv[cards[i]] + ' of ' + u.max;
            if (vertical) {
                txt(u.name, x + 84, y + ch / 2 - 15, 17, '#22301e', 'left');
                txt(u.desc, x + 84, y + ch / 2 + 6, 13, '#4a5a44', 'left', 600);
                txt(lvTxt, x + 84, y + ch / 2 + 24, 11, '#7a8a72', 'left', 700);
                if (!touchy) txt(String(i + 1), x + cw - 18, y + 18, 13, '#9aa892', 'center');
            } else {
                txt(u.name, x + cw / 2, y + 112, 17, '#22301e', 'center');
                wrapText(u.desc, x + cw / 2, y + 136, cw - 24, 13, '#4a5a44');
                txt(lvTxt, x + cw / 2, y + ch - 18, 11, '#7a8a72', 'center', 700);
                if (!touchy) txt(String(i + 1), x + cw - 16, y + 24, 13, '#9aa892', 'center');
            }
        }
        ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
    }
    function wrapText(t, x, y, maxW, size, col) {
        ctx.font = '600 ' + size + 'px ' + FONT;
        var words = t.split(' '), line = '', ly = y;
        words.forEach(function (w) {
            var tryL = line ? line + ' ' + w : w;
            if (ctx.measureText(tryL).width > maxW && line) { txt(line, x, ly, size, col, 'center', 600); line = w; ly += size + 4; } else line = tryL;
        });
        if (line) txt(line, x, ly, size, col, 'center', 600);
    }
    function upIcon(k, x, y) {
        ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        if (k === 'rate') { ctx.moveTo(x - 9, y - 7); ctx.lineTo(x - 1, y); ctx.lineTo(x - 9, y + 7); ctx.moveTo(x + 1, y - 7); ctx.lineTo(x + 9, y); ctx.lineTo(x + 1, y + 7); ctx.stroke(); }
        else if (k === 'spread') { ctx.moveTo(x - 8, y + 8); ctx.lineTo(x + 8, y - 10); ctx.moveTo(x - 8, y + 8); ctx.lineTo(x + 10, y + 2); ctx.moveTo(x - 8, y + 8); ctx.lineTo(x, y - 12); ctx.stroke(); }
        else if (k === 'splash') { ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.stroke(); }
        else if (k === 'speed') { ctx.moveTo(x - 10, y - 6); ctx.lineTo(x + 2, y - 6); ctx.moveTo(x - 6, y); ctx.lineTo(x + 8, y); ctx.moveTo(x - 10, y + 6); ctx.lineTo(x + 2, y + 6); ctx.stroke(); }
        else if (k === 'life') { ctx.lineCap = 'butt'; heart(x, y, 10, true, '#fff'); }
        else if (k === 'treat') { ctx.beginPath(); ctx.ellipse(x - 2, y, 9, 6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 12, y - 6); ctx.lineTo(x + 12, y + 6); ctx.fill(); }
        else if (k === 'turret') { ctx.arc(x, y + 2, 7, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 11, y - 8); ctx.stroke(); }
        else if (k === 'power') { ctx.moveTo(x - 6, y - 9); ctx.lineTo(x + 6, y - 9); ctx.lineTo(x + 2, y + 10); ctx.lineTo(x - 2, y + 10); ctx.closePath(); ctx.fill(); }
        else { ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x + 4, y - 6); ctx.lineTo(x + 10, y); ctx.lineTo(x + 4, y + 6); ctx.stroke(); }
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
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

    /* ---------- controls: keys and mouse, or two thumb sticks ---------- */
    var KEYS = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    function resume() { if (paused) { paused = false; return true; } return false; }
    api.on(window, 'keydown', function (e) {
        var k = (e.key || '').toLowerCase();
        if (k === 'escape' || phase === 'over') return;
        if (paused && k !== 'p') { resume(); e.preventDefault(); return; }
        if (KEYS[k]) { keys[KEYS[k]] = true; e.preventDefault(); return; }
        if (k === ' ' || k === 'spacebar') { autoKey = true; e.preventDefault(); return; }
        if (phase === 'pick' && /^[1-3]$/.test(k) && cardT > 0.4) { choose(+k - 1); return; }
        if (k === 'p' && !e.repeat) { paused = !paused; e.preventDefault(); }
    });
    api.on(window, 'keyup', function (e) {
        var k = (e.key || '').toLowerCase();
        if (KEYS[k]) keys[KEYS[k]] = false;
        if (k === ' ' || k === 'spacebar') autoKey = false;
    });
    function calm() { keys = {}; autoKey = false; mouse.down = false; sticks.L = sticks.R = null; }
    api.on(window, 'blur', function () { calm(); if (phase === 'play') paused = true; });
    api.on(document, 'visibilitychange', function () { if (document.hidden) { calm(); if (phase === 'play') paused = true; } });
    function local(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    function toArena(p) { return { x: (p.x - AX) / SC, y: (p.y - AY) / SC }; }
    api.on(cv, 'pointerdown', function (e) {
        e.preventDefault();
        var p = local(e);
        if (e.pointerType === 'touch' && !touchy) { touchy = true; fit(api.size()); }
        if (resume()) return;
        if (phase === 'pick') {
            if (cardT < 0.5) return;
            for (var i = 0; i < cardBoxes.length; i++) { var c = cardBoxes[i]; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { choose(i); return; } }
            return;
        }
        if (phase === 'over') return;
        if (e.pointerType === 'touch' || (touchy && e.pointerType !== 'mouse')) {
            var side = p.x < W / 2 ? 'L' : 'R';
            if (sticks[side]) return;
            sticks[side] = { id: e.pointerId, ox: p.x, oy: p.y, dx: 0, dy: 0 };
            try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not every pointer can be captured */ }
            return;
        }
        var q = toArena(p); mouse.x = q.x; mouse.y = q.y; mouse.on = true; mouse.down = true;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    });
    api.on(cv, 'pointermove', function (e) {
        var p = local(e), k;
        for (k in sticks) {
            var s = sticks[k];
            if (s && s.id === e.pointerId) {
                var dx = (p.x - s.ox) / 46, dy = (p.y - s.oy) / 46, m = Math.sqrt(dx * dx + dy * dy);
                if (m > 1) {   /* the base follows a thumb that slides too far */
                    s.ox = p.x - dx / m * 46; s.oy = p.y - dy / m * 46; dx /= m; dy /= m;
                }
                s.dx = dx; s.dy = dy;
                return;
            }
        }
        if (e.pointerType === 'mouse') { var q = toArena(p); mouse.x = q.x; mouse.y = q.y; mouse.on = true; }
    });
    function lift(e) {
        for (var k in sticks) if (sticks[k] && sticks[k].id === e.pointerId) sticks[k] = null;
        if (e.pointerType === 'mouse') mouse.down = false;
    }
    api.on(cv, 'pointerup', lift);
    api.on(cv, 'pointercancel', lift);
    api.on(cv, 'contextmenu', function (e) { e.preventDefault(); });

    /* ---------- a hook for the test pages only (they define window.__errors) ---------- */
    if (window.__errors) {
        test = window.__gd = {
            dbg: { speed: 1, god: false, nodraw: false }, ctrl: null, autoPick: null, time: 0, fps: 0, kills: 0, bossKills: 0, waves: 0, hits: [], deadAt: null, picks: [],
            state: function () {
                return { phase: phase, wave: wave, score: score, hearts: hearts, foes: foes.length, queue: queue.length, shots: shots.length, drops: drops.length,
                    boss: boss ? { type: boss.type, hp: boss.hp, max: boss.max, x: boss.x, y: boss.y } : null, cat: { x: cat.x, y: cat.y, ang: cat.ang, firing: cat.firing },
                    AW: AW, AH: AH, SC: SC, AX: AX, AY: AY, PADH: PADH, touchy: touchy, paused: paused, lv: lv, turrets: turrets.length, cards: cards.slice(), cardBoxes: cardBoxes,
                    time: test.time, kills: test.kills, bossKills: test.bossKills, hits: test.hits, deadAt: test.deadAt, picks: test.picks, fps: test.fps, parts: parts.length,
                    sticks: { L: !!sticks.L, R: !!sticks.R } };
            },
            toWave: function (n) { foes.length = 0; queue.length = 0; warns.length = 0; wave = n - 1; startWave(); },
            clearWave: function () { foes.forEach(function (f) { if (!f.boss) f.dead = true; }); queue.length = 0; warns.length = 0; },
            bossHp: function (f) { if (boss) boss.hp = Math.max(0.5, boss.max * f); },
            kill: function () { hearts = 1; cat.inv = 0; hurtCat('test'); }
        };
        test.view = { cat: cat, foes: function () { return foes; }, shots: function () { return shots; }, slime: function () { return slime; }, warns: function () { return warns; },
            dims: function () { return { AW: AW, AH: AH }; } };
    }

    fit(api.size());
    cat.x = AW / 2; cat.y = AH / 2;
    startWave();
    return { destroy: function () { if (window.__gd === test) delete window.__gd; } };
});
