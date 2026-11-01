/* Cucumber Hop: the cat runs and jumps over cucumbers and boxes, ducks under toy birds and catches fish for a score
   multiplier. Double jump in the air, hold for a higher jump; day turns to night as it runs. Score = distance x multiplier.
   The runner is a copy of the corner cat (an SVG); the world is a canvas. Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('cucumber-hop', function (api) {
    'use strict';
    api.css(
        '.ch { position: absolute; inset: 0; overflow: hidden; }' +
        '.ch canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.ch .ch-cat { left: 0; top: 0; pointer-events: none; cursor: default; will-change: transform; }' +
        '.ch .ch-cat.ch-low .cat-tilt { transform: rotate(var(--tilt, 0deg)) scale(1.14, .6); }' +
        '.ch .ch-cat.ch-spin .cat-flip { animation: ch-spin .42s ease-out; }' +
        '.ch-hint { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.ch-hint small { display: block; margin-top: 4px; color: #64748b; font-weight: 600; font-size: .82rem; }' +
        '.ch-hint[hidden] { display: none; }' +
        '@keyframes ch-spin { from { transform: rotate(0); } to { transform: rotate(-360deg); } }' +
        '@media (prefers-reduced-motion: reduce) { .ch .ch-cat.ch-spin .cat-flip { animation: none; } }');

    /* difficulty: start speed, top speed (px/s), speed gained per second, gap factor, lives, distance from which birds,
       high birds and tall stacks may appear, highest fish multiplier */
    var LV = {
        easy:   { speed: 300, max: 660,  ramp: 5,   gap: 1.3,  lives: 3, bird: 220, high: 1e9, tall: 1e9, mult: 3 },
        normal: { speed: 380, max: 900,  ramp: 8.5, gap: 1,    lives: 2, bird: 100, high: 450, tall: 350, mult: 4 },
        hard:   { speed: 460, max: 1060, ramp: 12,  gap: 0.84, lives: 1, bird: 30,  high: 150, tall: 120, mult: 5 }
    };
    var L = LV[api.level()] || LV.normal;
    var GRAV = 2800, JUMP = 900, JUMP2 = 780, HOLD = 0.18;   /* px/s^2, px/s, px/s, seconds of floaty rise while held */
    var DAY = 110;                                         /* seconds for a whole day and night */
    var TAU = 6.2832;
    /* obstacles: w, h, and the distance from which they may appear */
    var KINDS = [
        { w: 22, h: 48, from: 0, cuc: true },             /* standing cucumber */
        { w: 60, h: 20, from: 0, cuc: true },             /* lying cucumber */
        { w: 42, h: 37, from: 0 },                        /* box */
        { w: 42, h: 74, from: 120 },                      /* two boxes */
        { w: 88, h: 37, from: 250 },                      /* two boxes side by side */
        { w: 42, h: 111, from: 0, tall: true },           /* three boxes: a high (or double) jump */
        { w: 46, h: 26, from: 0, bird: true }             /* a toy bird: duck under the low ones */
    ];
    var wrap = document.createElement('div');
    wrap.className = 'ch';
    wrap.innerHTML = '<canvas></canvas><div class="ch-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.ch-hint');
    hint.textContent = api.touch ? 'Tap to jump, twice for a double jump\nSwipe down to duck' : 'Space to jump, twice for a double jump\n↓ to duck';
    var small = document.createElement('small');
    small.textContent = 'Fish boost your score';
    hint.appendChild(small);

    /* the runner: a clone of the corner cat, posed with the classes of cat.css */
    var src = document.querySelector('.arcade .mascot svg');
    var cat = document.createElement('div');
    cat.className = 'cat ch-cat';
    cat.innerHTML = '<div class="cat-tilt"><div class="cat-flip"></div></div>';
    if (src) cat.querySelector('.cat-flip').appendChild(src.cloneNode(true));
    wrap.appendChild(cat);
    var RUN = api.reducedMotion ? 'cat ch-cat moving walk' : 'cat ch-cat moving run';

    var W = 0, H = 0, ground = 0, catX = 60, y = 0, vy = 0, onGround = true, held = false, holdT = 0, buffer = 0, airJumps = 0;
    var duck = false, keyDuck = false, swipeDuck = false, jumpAt = -1;
    var speed = L.speed, maxSpeed = L.max, dist = 0, points = 0, score = 0, meters = 0, gapLeft = 0, time = 0, state = 'ready';
    var pose = 'cat ch-cat', cls = pose, lives = L.lives, hurtT = 0, spinT = 0, flash = 0, mult = 1, pips = 0, filt = '';
    var obs = [], fishes = [], parts = [], texts = [];
    for (var i = 0; i < 8; i++) obs.push({ on: false, x: 0, k: KINDS[0], alt: 0, ph: 0 });
    for (i = 0; i < 14; i++) fishes.push({ on: false, x: 0, alt: 0, got: false });

    function fit(s) {
        W = s.w; H = s.h;
        ground = Math.round(H - Math.max(110, H * 0.22));  /* the corner cat sits below the ground line */
        catX = Math.round(Math.max(30, Math.min(140, W * 0.1)));
        maxSpeed = L.max * Math.max(0.7, Math.min(1, W / 1000));
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
        place();
    }
    function setPose(p) { pose = p; poseNow(); }
    function poseNow() {
        var c = pose + (duck && state === 'run' ? ' ch-low' : '') + (spinT > 0 ? ' ch-spin' : '');
        if (c !== cls) { cls = c; cat.className = c; }
    }
    function place() {
        cat.style.transform = 'translate(' + catX + 'px,' + (ground - 69 - y).toFixed(1) + 'px)';
        cat.style.opacity = hurtT > 0 && state === 'run' && Math.floor(hurtT * 10) % 2 ? '0.35' : '';
    }

    /* ---------- input: press to jump (again in the air for a double jump), hold for more height, down to duck ---------- */
    function press() {
        if (state === 'over') return;
        held = true;
        begin();
        if (onGround) { jump(); jumpAt = performance.now(); }
        else if (airJumps < 1) doubleJump();
        else buffer = 0.12;                                /* a press just before landing still counts */
    }
    function release() { held = false; }
    function begin() {
        if (state !== 'ready') return;
        state = 'run'; hint.hidden = true; gapLeft = W * 0.4;  /* a short calm start */
        setPose(RUN);
    }
    function jump() {
        vy = JUMP; onGround = false; holdT = 0; buffer = 0; airJumps = 0;
        setPose('cat ch-cat moving jump');
        puff(catX + 46, ground, 6);
        api.sfx('jump');
    }
    function doubleJump() {
        vy = Math.max(vy, JUMP2); holdT = 0; airJumps++;
        spinT = 0.42;
        setPose('cat ch-cat moving jump');
        ring(catX + 46, ground - y - 10);
        api.sfx('jump');
    }
    function setDuck() {
        var d = keyDuck || swipeDuck;
        if (d && !duck && state === 'run' && !onGround && vy > -400) vy = -400;   /* ducking in the air: drop fast */
        duck = d;
    }
    var downY = 0, downId = -1;
    api.on(wrap, 'pointerdown', function (e) {
        e.preventDefault();
        downY = e.clientY; downId = e.pointerId;
        press();
    });
    api.on(wrap, 'pointermove', function (e) {
        if (e.pointerId !== downId || swipeDuck) return;
        if (e.clientY - downY > 36) {
            /* a swipe that starts on the ground ducks instead of jumping: undo the jump the touch began */
            if (performance.now() - jumpAt < 250 && airJumps === 0 && y < 60) { y = 0; vy = 0; onGround = true; setPose(RUN); }
            swipeDuck = true; setDuck();
        }
    });
    function up(e) {
        if (e.pointerId === downId) { downId = -1; if (swipeDuck) { swipeDuck = false; setDuck(); } }
        release();
    }
    api.on(window, 'pointerup', up);
    api.on(window, 'pointercancel', up);
    function isJumpKey(e) { return e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'; }
    function isDuckKey(e) { return e.code === 'ArrowDown' || e.code === 'KeyS'; }
    api.on(document, 'keydown', function (e) {
        if ((!isJumpKey(e) && !isDuckKey(e)) || state === 'over') return;
        var a = document.activeElement;                    /* space must not also press a focused button */
        if (a && (a.tagName === 'BUTTON' || a.tagName === 'SELECT')) a.blur();
        e.preventDefault();
        if (isDuckKey(e)) { keyDuck = true; setDuck(); return; }
        if (!e.repeat) press();
    });
    api.on(document, 'keyup', function (e) {
        if (isJumpKey(e)) release();
        if (isDuckKey(e)) { keyDuck = false; setDuck(); }
    });

    /* ---------- the run ---------- */
    function slot(list) { for (var j = 0; j < list.length; j++) if (!list[j].on) return list[j]; return null; }
    function addFish(x, alt) {
        var f = slot(fishes);
        if (f) { f.on = true; f.got = false; f.x = x; f.alt = alt; }
    }
    function spawn() {
        var o = slot(obs);
        if (!o) return;
        var pool = [];
        for (var j = 0; j < KINDS.length; j++) {
            var k = KINDS[j];
            if (meters < k.from || (k.tall && meters < L.tall) || (k.bird && meters < L.bird)) continue;
            pool.push(k);
            if (k.bird) pool.push(k);                      /* birds come a bit more often once they appear */
        }
        o.k = pool[Math.floor(Math.random() * pool.length)];
        o.x = W + 10;
        o.alt = o.k.bird ? (meters >= L.high && Math.random() < 0.35 ? 74 : 34) : 0;
        o.ph = Math.random() * TAU;
        o.on = true;
        /* the next one leaves room to land and jump again */
        gapLeft = (o.k.w + speed * (0.72 + Math.random() * 0.85) + 110) * L.gap + (o.k.bird ? 60 : 0);
        /* fish: an arc above an obstacle, a pair under a low bird, or a row on the ground in the gap */
        var r = Math.random(), cx = o.x + o.k.w / 2;
        if (o.k.bird && o.alt < 40 && r < 0.6) { addFish(cx - 16, 4); addFish(cx + 18, 4); }
        else if (o.k.bird && r < 0.6) { addFish(cx - 18, 6); addFish(cx + 18, 6); }
        else if (!o.k.bird && r < 0.45) for (j = 0; j < 3; j++) addFish(cx + (j - 1) * 46, o.k.h + 48 + (j === 1 ? 26 : 0));
        else if (r < 0.7 && gapLeft > 360) for (j = 0; j < 3; j++) addFish(o.x + o.k.w + gapLeft * 0.45 + j * 34, 8);
    }
    function catBox() {
        return { l: catX + 22, r: catX + 72, b: ground - y - 4, t: ground - y - (duck ? 28 : 50) };
    }
    function update(dt) {
        if (spinT > 0) spinT -= dt;
        if (flash > 0) flash -= dt;
        if (state !== 'run') return;
        time += dt;
        if (hurtT > 0) hurtT -= dt;
        speed = Math.min(maxSpeed, L.speed + time * L.ramp);
        var dx = speed * dt;
        dist += dx;
        points += dx / 40 * mult;
        if (Math.floor(points) !== score) { score = Math.floor(points); api.score(score); }
        var m = Math.floor(dist / 40);
        if (m !== meters) {
            meters = m;
            if (meters % 100 === 0) {
                api.sfx('point');
                if (meters === 100 || meters === 300 || meters === 600 || meters % 1000 === 0) {
                    api.cat('wow');
                    api.say(meters >= 1000 ? 'Zoomies!' : meters === 600 ? 'So fast!' : meters === 300 ? 'Keep going!' : 'Nice hops!');
                }
            }
        }
        /* jump physics: lighter gravity while the button is held on the way up, heavier while ducking */
        if (!onGround) {
            holdT += dt;
            vy -= GRAV * (held && vy > 0 && holdT < HOLD ? 0.45 : duck ? 2.2 : 1) * dt;
            y += vy * dt;
            if (y <= 0) {
                y = 0; vy = 0; onGround = true; airJumps = 0;
                setPose(RUN);
                puff(catX + 46, ground, 5);
                if (buffer > 0) jump();
            }
        }
        if (buffer > 0) buffer -= dt;
        gapLeft -= dx;
        if (gapLeft <= 0) spawn();
        var c = catBox();
        for (var j = 0; j < fishes.length; j++) {
            var f = fishes[j];
            if (!f.on) continue;
            f.x -= dx;
            var fy = ground - f.alt - 8;
            if (!f.got && f.x + 14 > c.l - 6 && f.x - 14 < c.r + 6 && fy + 9 > c.t - 6 && fy - 9 < c.b + 6) catchFish(f, fy);
            else if (!f.got && f.x < c.l - 30) missFish();
            if (f.x < -40) f.on = false;
        }
        for (j = 0; j < obs.length; j++) {
            var o = obs[j];
            if (!o.on) continue;
            o.x -= dx + (o.k.bird ? 50 * dt : 0);         /* birds fly towards the cat */
            if (o.x + o.k.w < -20) { o.on = false; continue; }
            var bot = ground - o.alt, tp = bot - o.k.h;
            if (hurtT <= 0 && o.x + 4 < c.r && o.x + o.k.w - 4 > c.l && tp + 4 < c.b && bot - 2 > c.t) return crash(o);
        }
        poseNow();
    }
    function catchFish(f, fy) {
        f.got = true; f.on = false;
        pips++;
        var bonus = 5 * mult;
        if (pips >= 3 && mult < L.mult) {
            pips = 0; mult++;
            api.sfx('point');
            texts.push({ x: catX + 46, y: ground - y - 80, s: 'x' + mult + '!', c: '#d6336c', t: 0, big: true });
            if (mult === L.mult) api.cat('wow');
        } else {
            if (mult === L.mult) pips = Math.min(pips, 3);
            api.sfx('pop');
        }
        points += bonus;
        texts.push({ x: f.x, y: fy - 14, s: '+' + bonus, c: '#2563eb', t: 0 });
        sparks(f.x, fy, '#fcd34d', 8);
    }
    function missFish() {
        for (var j = 0; j < fishes.length; j++) if (fishes[j].on && !fishes[j].got && fishes[j].x < catX - 8) fishes[j].got = true;   /* one penalty per group */
        if (mult > 1 || pips > 0) {
            if (pips > 0) pips = 0; else mult--;
            api.sfx('move');
        }
    }
    function crash(o) {
        var what = o.k.cuc ? 'cucumber' : o.k.bird ? 'bird' : 'box';
        api.sfx('hit');
        stars(catX + 50, ground - y - 30);
        flash = api.reducedMotion ? 0 : 0.18;
        mult = 1; pips = 0;
        lives--;
        if (lives > 0) {
            hurtT = 1.6;
            time = Math.max(0, time - 10);                 /* a little slower again */
            api.cat('sad');
            api.say(what === 'cucumber' ? 'Eek! ' + lives + (lives > 1 ? ' lives' : ' life') + ' left' : 'Ouch! ' + lives + (lives > 1 ? ' lives' : ' life') + ' left');
            return;
        }
        state = 'over';
        duck = false;
        setPose('cat ch-cat');
        cat.style.setProperty('--tilt', '-12deg');
        api.say(what === 'cucumber' ? 'Eek, a cucumber!' : what === 'bird' ? 'Bonk, a bird!' : 'Ouch, a box!');
        api.end({ score: score, win: false, text: (what === 'cucumber' ? 'Startled by a cucumber!' : what === 'bird' ? 'Bumped into a toy bird!' : 'Bumped into a box!') +
            '\nScore: ' + score + ', distance: ' + meters });
    }

    /* ---------- particles ---------- */
    function part(x, yy, vx, vy0, life, c, r, grav) {
        parts.push({ x: x, y: yy, vx: vx, vy: vy0, t: 0, life: life, c: c, r: r, g: grav });
        if (parts.length > 120) parts.shift();
    }
    function puff(x, yy, n) {
        if (api.reducedMotion) return;
        for (var j = 0; j < n; j++) part(x + (Math.random() - 0.5) * 30, yy - 3, (Math.random() - 0.7) * 120, -30 - Math.random() * 60, 0.45, 'rgba(203, 178, 140, .55)', 4 + Math.random() * 4, 0);
    }
    function ring(x, yy) {
        if (api.reducedMotion) return;
        for (var j = 0; j < 10; j++) { var a = j / 10 * TAU; part(x, yy, Math.cos(a) * 160, Math.sin(a) * 80, 0.35, 'rgba(255, 255, 255, .9)', 3, 0); }
    }
    function sparks(x, yy, c, n) {
        if (api.reducedMotion) return;
        for (var j = 0; j < n; j++) { var a = Math.random() * TAU, v = 60 + Math.random() * 140; part(x, yy, Math.cos(a) * v, Math.sin(a) * v, 0.5, c, 2 + Math.random() * 2.5, 300); }
    }
    function stars(x, yy) {
        if (api.reducedMotion) return;
        for (var j = 0; j < 9; j++) { var a = Math.random() * TAU, v = 80 + Math.random() * 160; part(x, yy, Math.cos(a) * v, Math.sin(a) * v - 80, 0.7, j % 2 ? '#fcd34d' : '#f9a8d4', 3 + Math.random() * 2, 500); }
    }
    function updateFx(dt) {
        for (var j = parts.length - 1; j >= 0; j--) {
            var p = parts[j];
            p.t += dt;
            if (p.t >= p.life) { parts.splice(j, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.96;
        }
        for (j = texts.length - 1; j >= 0; j--) if ((texts[j].t += dt) > 0.9) texts.splice(j, 1);
    }

    /* ---------- the sky: day, sunset, night and dawn ---------- */
    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    function mix(a, b, t) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }
    function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    var SKY = [[0, '#bfe3fa', '#fdf6ea', 0], [0.36, '#bfe3fa', '#fdf6ea', 0], [0.47, '#f6b28d', '#fde4c4', 0.3],
               [0.58, '#24315f', '#4d5c8f', 1], [0.84, '#24315f', '#4d5c8f', 1], [0.94, '#f3bfd0', '#fdf0e2', 0.2], [1, '#bfe3fa', '#fdf6ea', 0]]
        .map(function (s) { return [s[0], hex(s[1]), hex(s[2]), s[3]]; });
    var COL = {                                            /* [day, night] */
        far: [hex('#d3e4f4'), hex('#34427a')], mid: [hex('#dcecd6'), hex('#2e4a5e')], tree: [hex('#b9dcb2'), hex('#2c5552')],
        trunk: [hex('#d1aa84'), hex('#4d4a5e')], grass: [hex('#bfe3b4'), hex('#3c6b63')], path: [hex('#f6ecd9'), hex('#5b6087')],
        pebble: [hex('#e3d3b5'), hex('#4a4f75')], cloud: [hex('#ffffff'), hex('#5a6796')]
    };
    function col(name, n) { return mix(COL[name][0], COL[name][1], n); }
    function skyAt(p) {
        for (var j = 0; j < SKY.length - 1; j++) {
            if (p <= SKY[j + 1][0]) {
                var a = SKY[j], b = SKY[j + 1], t = (p - a[0]) / (b[0] - a[0] || 1);
                t = t * t * (3 - 2 * t);
                return { top: lerp3(a[1], b[1], t), bot: lerp3(a[2], b[2], t), n: a[3] + (b[3] - a[3]) * t };
            }
        }
        return { top: SKY[0][1], bot: SKY[0][2], n: 0 };
    }
    var moonCv = null;
    function moon() {                                      /* a crescent, cut out once on its own little canvas */
        if (moonCv) return moonCv;
        moonCv = document.createElement('canvas');
        moonCv.width = moonCv.height = 96;
        var m = moonCv.getContext('2d');
        m.fillStyle = 'rgba(253, 230, 138, .22)';
        m.beginPath(); m.arc(48, 48, 46, 0, TAU); m.fill();
        m.fillStyle = '#f1f5ff';
        m.beginPath(); m.arc(48, 48, 34, 0, TAU); m.fill();
        m.globalCompositeOperation = 'destination-out';
        m.beginPath(); m.arc(66, 36, 30, 0, TAU); m.fill();
        return moonCv;
    }
    function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

    /* ---------- drawing ---------- */
    function rr(x, y0, w, h, rad) {
        g.beginPath();
        g.moveTo(x + rad, y0); g.arcTo(x + w, y0, x + w, y0 + h, rad); g.arcTo(x + w, y0 + h, x, y0 + h, rad);
        g.arcTo(x, y0 + h, x, y0, rad); g.arcTo(x, y0, x + w, y0, rad); g.closePath();
    }
    function cloud(x, y0, s) {
        g.beginPath();
        g.arc(x, y0, 16 * s, 0, TAU);
        g.moveTo(x + 40 * s, y0 - 8 * s); g.arc(x + 20 * s, y0 - 8 * s, 20 * s, 0, TAU);
        g.moveTo(x + 57 * s, y0); g.arc(x + 42 * s, y0, 15 * s, 0, TAU);
        g.fill();
    }
    function draw() {
        var phase = (time / DAY + 0.08) % 1, sky = skyAt(phase), n = sky.n;
        var gr = g.createLinearGradient(0, 0, 0, ground);
        gr.addColorStop(0, mix(sky.top, sky.bot, 0)); gr.addColorStop(1, mix(sky.top, sky.bot, 1));
        g.fillStyle = gr;
        g.fillRect(0, 0, W, ground + 2);
        /* stars and the moon by night, the sun by day */
        if (n > 0.05) {
            g.fillStyle = 'rgba(255, 255, 255, ' + (n * 0.9).toFixed(2) + ')';
            for (var k = 0; k < 40; k++) {
                var sx = hash(k) * W, sy = hash(k + 50) * ground * 0.6, tw = api.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(time * 2 + k);
                g.fillRect(sx, sy, 1.5 * tw + 0.5, 1.5 * tw + 0.5);
            }
        }
        var arcX = function (p) { return W * (0.1 + 0.8 * p); }, arcY = function (p) { return ground * (0.62 - 0.48 * Math.sin(p * 3.1416)); };
        var sp = (phase + 0.06) / 0.58;
        if (sp > 0 && sp < 1) {
            g.fillStyle = 'rgba(253, 224, 71, .25)';
            g.beginPath(); g.arc(arcX(sp), arcY(sp), 34, 0, TAU); g.fill();
            g.fillStyle = '#fde68a';
            g.beginPath(); g.arc(arcX(sp), arcY(sp), 22, 0, TAU); g.fill();
        }
        var mp = (phase - 0.5) / 0.46;
        if (mp > 0 && mp < 1) {
            g.globalAlpha = Math.min(1, n * 1.2);
            g.drawImage(moon(), arcX(mp) - 24, arcY(mp) - 24, 48, 48);
            g.globalAlpha = 1;
        }
        /* far clouds and two layers of hills, slower than the ground */
        g.fillStyle = col('cloud', n);
        g.globalAlpha = 0.9 - n * 0.5;
        var c = dist * 0.04 + (api.reducedMotion ? 0 : time * 6);
        for (k = 0; k < 4; k++) {
            var span = W + 200;
            cloud((((k * 0.29 + 0.15) * span - c) % span + span) % span - 100, ground * (0.18 + k * 0.1), 1 - k * 0.12);
        }
        g.globalAlpha = 1;
        g.fillStyle = col('far', n);
        g.beginPath();
        g.moveTo(0, ground);
        var h0 = dist * 0.08;
        for (var x = 0; x <= W + 20; x += 20) g.lineTo(x, ground - 95 - 40 * Math.sin((x + h0) / 210) - 22 * Math.sin((x + h0) / 77));
        g.lineTo(W + 20, ground);
        g.fill();
        h0 = dist * 0.25;
        g.fillStyle = col('mid', n);
        g.beginPath();
        g.moveTo(0, ground);
        for (x = 0; x <= W + 20; x += 20) g.lineTo(x, ground - 46 - 22 * Math.sin((x + h0) / 150) - 10 * Math.sin((x + h0) / 53));
        g.lineTo(W + 20, ground);
        g.fill();
        var tc = col('tree', n), trk = col('trunk', n);         /* round trees on the near hills */
        for (var t = Math.floor(h0 / 230) - 1; t * 230 - h0 < W + 60; t++) {
            if (hash(t) < 0.35) continue;
            var tx = t * 230 - h0 + hash(t + 9) * 120, ts = 0.7 + hash(t + 3) * 0.6;
            var ty = ground - 46 - 22 * Math.sin((tx + h0) / 150) - 10 * Math.sin((tx + h0) / 53) + 6;
            g.fillStyle = trk; g.fillRect(tx - 3 * ts, ty - 22 * ts, 6 * ts, 24 * ts);
            g.fillStyle = tc;
            g.beginPath(); g.arc(tx, ty - 30 * ts, 16 * ts, 0, TAU); g.fill();
            g.beginPath(); g.arc(tx - 10 * ts, ty - 22 * ts, 11 * ts, 0, TAU); g.fill();
            g.beginPath(); g.arc(tx + 11 * ts, ty - 23 * ts, 12 * ts, 0, TAU); g.fill();
        }
        /* the ground: a grass edge, a cream path and its moving pebbles */
        g.fillStyle = col('path', n);
        g.fillRect(0, ground, W, H - ground);
        g.fillStyle = col('grass', n);
        g.fillRect(0, ground - 2, W, 9);
        g.beginPath();
        var p9 = dist % 24;
        for (x = -p9; x < W + 24; x += 24) { g.moveTo(x, ground + 6); g.quadraticCurveTo(x + 6, ground + 15, x + 12, ground + 6); }
        g.fill();
        g.fillStyle = col('pebble', n);
        var p = dist % 90;
        for (x = -p; x < W; x += 90) {
            g.beginPath(); g.ellipse(x + 7, ground + 28, 7, 2.5, 0, 0, TAU); g.ellipse(x + 51, ground + 46, 4, 2, 0, 0, TAU); g.fill();
        }
        for (k = 0; k < obs.length; k++) if (obs[k].on) drawObstacle(obs[k], n);
        for (k = 0; k < fishes.length; k++) if (fishes[k].on) drawFish(fishes[k]);
        /* the cat's shadow on the ground */
        g.fillStyle = 'rgba(15, 23, 42, ' + (0.13 * Math.max(0.3, 1 - y / 220)).toFixed(3) + ')';
        g.beginPath(); g.ellipse(catX + 48, ground + 2, 30 * Math.max(0.5, 1 - y / 300), 5, 0, 0, TAU); g.fill();
        if (!src) {                                        /* fallback runner, if the corner cat is missing */
            g.fillStyle = '#f6a23a';
            rr(catX + 20, ground - y - (duck ? 28 : 46), 56, duck ? 24 : 42, 12); g.fill();
        }
        drawFx();
        drawHud();
        if (flash > 0) { g.fillStyle = 'rgba(255, 255, 255, ' + (flash * 3).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
        /* the runner dims a little at night, like the world */
        var f = n > 0.02 ? 'brightness(' + (1 - n * 0.22).toFixed(2) + ')' : '';
        if (f !== filt) { filt = f; cat.style.filter = f; }
    }
    function drawObstacle(o, n) {
        var x = o.x, w = o.k.w, h = o.k.h, bot = ground - o.alt, t = bot - h;
        g.fillStyle = 'rgba(15, 23, 42, .12)';
        g.beginPath(); g.ellipse(x + w / 2, ground + 2, w / 2 + (o.k.bird ? -8 : 4), 4, 0, 0, TAU); g.fill();
        g.lineWidth = 2;
        g.strokeStyle = '#3b2a1e';
        if (o.k.bird) return drawBird(o);
        if (o.k.cuc) {
            var gr = w < h ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, t, 0, t + h);
            gr.addColorStop(0, '#9edaa9'); gr.addColorStop(0.45, '#7cc68d'); gr.addColorStop(1, '#58a86b');
            g.fillStyle = gr;
            rr(x, t, w, h, Math.min(w, h) / 2); g.fill(); g.stroke();
            g.fillStyle = '#c8ecd0';                       /* little bumps */
            for (var i = 1; i < 4; i++) {
                g.beginPath();
                if (w < h) g.arc(x + w / 2 + (i % 2 ? -4 : 4), t + h * i / 4 + 4, 1.8, 0, TAU);
                else g.arc(x + w * i / 4 + 6, t + h / 2 + (i % 2 ? -4 : 4), 1.8, 0, TAU);
                g.fill();
            }
            g.fillStyle = '#4b8f5c';                       /* the stem end */
            if (w < h) { rr(x + w / 2 - 3, t - 3, 6, 6, 2); g.fill(); } else { rr(x + w - 4, t + h / 2 - 3, 7, 6, 2); g.fill(); }
            g.fillStyle = '#1f3a2a';                       /* a sleepy cucumber face */
            var fx = w < h ? x + w / 2 : x + 14, fy = w < h ? t + 14 : t + h / 2 - 1;
            g.beginPath(); g.arc(fx - 4, fy, 1.6, 0, TAU); g.arc(fx + 4, fy, 1.6, 0, TAU); g.fill();
            g.lineWidth = 1.4; g.strokeStyle = '#1f3a2a';
            g.beginPath(); g.arc(fx, fy + 3, 2.6, 0.3, 2.84); g.stroke();
            return;
        }
        for (var bx = x; bx < x + w - 1; bx += 46) {       /* boxes, 42 px wide, stacked to the height */
            for (var by = bot; by > t + 1; by -= 37) {
                var bh = Math.min(37, by - t), by0 = by - bh;
                var gb = g.createLinearGradient(0, by0, 0, by);
                gb.addColorStop(0, '#f0d0ac'); gb.addColorStop(1, '#ddb48b');
                g.fillStyle = gb; g.strokeStyle = '#3b2a1e'; g.lineWidth = 2;
                rr(bx, by0, 42, bh, 4); g.fill(); g.stroke();
                g.fillStyle = 'rgba(255, 255, 255, .35)';
                g.fillRect(bx + 3, by0 + 3, 36, 3);
                g.fillStyle = '#c9965f';                   /* tape */
                g.fillRect(bx + 17, by0 + 1, 8, Math.min(12, bh - 2));
                g.strokeStyle = 'rgba(59, 42, 30, .35)'; g.lineWidth = 1;
                g.beginPath(); g.moveTo(bx + 6, by0 + bh * 0.62); g.lineTo(bx + 14, by0 + bh * 0.62); g.stroke();
            }
        }
    }
    function drawBird(o) {
        var x = o.x + o.k.w / 2, yy = ground - o.alt - o.k.h / 2 + (api.reducedMotion ? 0 : Math.sin(time * 6 + o.ph) * 3);
        var flap = api.reducedMotion ? 0.3 : Math.sin(time * 20 + o.ph);
        g.strokeStyle = 'rgba(30, 58, 138, .45)'; g.lineWidth = 1;   /* the toy's string */
        g.beginPath(); g.moveTo(x + 2, yy - 10); g.lineTo(x + 8, yy - 30); g.stroke();
        g.lineWidth = 2; g.strokeStyle = '#1e3a8a'; g.lineJoin = 'round';
        g.fillStyle = '#6fa6e3';                           /* tail feathers */
        g.beginPath(); g.moveTo(x + 12, yy + 1); g.lineTo(x + 24, yy - 7); g.lineTo(x + 22, yy + 1); g.lineTo(x + 25, yy + 7); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#a7cdf3';                           /* round body and head */
        g.beginPath(); g.ellipse(x + 2, yy + 2, 15, 11, 0, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.arc(x - 11, yy - 5, 9, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#eef6fd';
        g.beginPath(); g.ellipse(x - 2, yy + 6, 9, 5, 0, 0, TAU); g.fill();
        g.fillStyle = '#f6a23a';                           /* beak */
        g.beginPath(); g.moveTo(x - 19, yy - 8); g.lineTo(x - 27, yy - 4); g.lineTo(x - 19, yy - 1); g.closePath(); g.fill();
        g.strokeStyle = '#c2410c'; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#1e3a8a';
        g.beginPath(); g.arc(x - 13, yy - 7, 2, 0, TAU); g.fill();
        g.fillStyle = 'rgba(244, 114, 160, .55)';
        g.beginPath(); g.arc(x - 9, yy - 1, 2.4, 0, TAU); g.fill();
        g.save();                                          /* the flapping wing */
        g.translate(x + 2, yy - 2); g.rotate(-0.2 - flap * 0.7);
        g.fillStyle = '#7fb2ea'; g.strokeStyle = '#1e3a8a'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(6, -4, 11, 6, -0.4, 0, TAU); g.fill(); g.stroke();
        g.restore();
    }
    function drawFish(f) {
        var x = f.x, yy = ground - f.alt - 8 + (api.reducedMotion ? 0 : Math.sin(time * 5 + x * 0.05) * 2), s = 12;
        g.fillStyle = 'rgba(253, 230, 138, .45)';
        g.beginPath(); g.arc(x, yy, 15, 0, TAU); g.fill();
        g.fillStyle = '#8ec0f0'; g.strokeStyle = '#1e3a8a'; g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x - s, yy);
        g.quadraticCurveTo(x, yy - s * 0.95, x + s * 0.6, yy);
        g.lineTo(x + s * 1.1, yy - s * 0.55); g.lineTo(x + s * 1.05, yy + s * 0.55); g.lineTo(x + s * 0.6, yy);
        g.quadraticCurveTo(x, yy + s * 0.95, x - s, yy);
        g.fill(); g.stroke();
        g.fillStyle = '#1e3a8a';
        g.beginPath(); g.arc(x - s * 0.45, yy - s * 0.12, 1.5, 0, TAU); g.fill();
    }
    function heart(x, yy, s, full) {
        g.beginPath();
        g.moveTo(x, yy + s * 0.9);
        g.bezierCurveTo(x - s * 1.3, yy, x - s * 0.6, yy - s * 0.9, x, yy - s * 0.25);
        g.bezierCurveTo(x + s * 0.6, yy - s * 0.9, x + s * 1.3, yy, x, yy + s * 0.9);
        g.fillStyle = full ? '#f472a0' : 'rgba(148, 163, 184, .35)'; g.fill();
    }
    function drawHud() {
        var x = 12, yy = 12;
        g.fillStyle = 'rgba(255, 255, 255, .85)';
        var w = (L.lives > 1 ? L.lives * 20 + 8 : 0) + 74;
        rr(x, yy, w, 28, 14); g.fill();
        var hx = x + 16;
        if (L.lives > 1) { for (var i = 0; i < L.lives; i++) heart(hx + i * 20, yy + 13, 7, i < lives); hx += L.lives * 20; }
        g.font = '800 14px system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
        g.fillStyle = mult > 1 ? '#d6336c' : '#64748b';
        g.fillText('x' + mult, hx - 4, yy + 14.5);
        for (i = 0; i < 3; i++) {                          /* fish caught towards the next multiplier */
            g.fillStyle = mult >= L.mult ? '#fcd34d' : i < pips ? '#5b9be0' : 'rgba(148, 163, 184, .4)';
            g.beginPath(); g.arc(hx + 22 + i * 12, yy + 14, 4, 0, TAU); g.fill();
        }
    }
    function drawFx() {
        for (var j = 0; j < parts.length; j++) {
            var p = parts[j];
            g.globalAlpha = 1 - p.t / p.life;
            g.fillStyle = p.c;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (j = 0; j < texts.length; j++) {
            var t = texts[j], yy = t.y - (api.reducedMotion ? 0 : t.t * 40);
            g.font = '800 ' + (t.big ? 22 : 15) + 'px system-ui, sans-serif';
            g.globalAlpha = Math.min(1, (0.9 - t.t) * 3);
            g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(t.s, t.x, yy);
            g.fillStyle = t.c; g.fillText(t.s, t.x, yy);
        }
        g.globalAlpha = 1;
    }

    fit(api.size());
    api.onResize(fit);
    api.score(0);
    var overT = 0;
    var stop = api.loop(function (dt) {
        update(dt);
        updateFx(dt);
        draw();
        place();
        if (state === 'over' && (overT += dt) > 1) stop();
    });
});
