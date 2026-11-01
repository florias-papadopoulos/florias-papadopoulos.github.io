/* Cucumber Hop: the cat runs and jumps over cucumbers and boxes, ducks under toy birds and catches fish for a score
   multiplier. Double jump in the air, hold for a higher jump. The run crosses four fantasy lands that blend into each
   other, from morning to dusk, night and dawn. Score = distance x multiplier.
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
        '.ch-hint small { display: block; margin-top: 4px; color: #5b6b80; font-weight: 600; font-size: .82rem; }' +
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
        dpr = Math.min(2, window.devicePixelRatio || 1);
        var nsc = Math.max(0.75, Math.min(1.3, Math.round(ground / 560 * 20) / 20)), key = nsc + '|' + dpr;
        if (key !== built) { sc = nsc; built = key; build(); }   /* sprites and far strips, once per size */
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

    /* ---------- the land: four fantasy lands, one after another, each fading into the next ----------
       Sky Isles (morning), Glowcap Hollow (dusk), Crystal Night (aurora) and Woolly Dawn, then the isles again.
       Depth, back to front: the sky, far landmarks (a castle on a cliff, a mushroom forest, snowy peaks, a sleeping
       dragon), floating things, back hills, near hills and the path. The sky, the light and the two far layers fade
       over time; the hills and what stands on them change in space, so new trees roll in from the right. Everything
       detailed is drawn once per size onto small canvases (sprites) and only stamped while running. */
    var LAND = 450, BLEND = 140;                           /* metres per land; its last BLEND metres fade into the next */
    var PAR = [0, 0.02, 0.08, 0.24, 0.5];                  /* parallax of the layers (1 = the ground) */
    var la = 0, lb = 1, lt = 0, ls = 0;                    /* landAt(): from land la to lb, t in 0..1, ls = segment */
    function landAt(d) {
        var m = d > 0 ? d / 40 : 0, k = Math.floor(m / LAND), r = (m - k * LAND - LAND + BLEND) / BLEND;
        la = k % 4; lb = (k + 1) % 4; ls = k;
        lt = r > 0 ? r * r * (3 - 2 * r) : 0;
    }
    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function css(a) { return 'rgb(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ')'; }
    function rgba(a, al) { return 'rgba(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ',' + Math.max(0, al).toFixed(3) + ')'; }
    function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
    /* colours (c) and amounts (n) of each land; the scene lerps between two of them */
    var LANDS = [
        { c: { sky0: '#7fbdee', sky1: '#c0e2f5', sky2: '#fcefdc', haze: '#e3eef3', mist: '#f4f1e7', back0: '#9cc5c3', back1: '#cfe2df',
               near0: '#a7cf9c', near1: '#d4e7ca', rim: '#ffffff', moss: '#97c787', path: '#efe4cd', path2: '#e4d4b6', stone: '#e4d6b9',
               seam: '#cfbb97', sun: '#fff1c0' },
          n: { night: 0, sun: 1, sunY: 0.2, moon: 0, moonY: 1.3, stars: 0, aurora: 0, rainbow: 0, cloud: 0.95, bank: 1, farHaze: 0.55 } },
        { c: { sky0: '#463f86', sky1: '#b4729f', sky2: '#ffbf8c', haze: '#e7a89e', mist: '#f1c8b6', back0: '#7a5a8b', back1: '#b3849c',
               near0: '#6d6a8d', near1: '#a48ba4', rim: '#ffd2a1', moss: '#84a98b', path: '#ead5bd', path2: '#dbc0a5', stone: '#dfc7ad',
               seam: '#b99c80', sun: '#ffab68' },
          n: { night: 0.4, sun: 0.95, sunY: 0.68, moon: 0.4, moonY: 0.5, stars: 0.35, aurora: 0, rainbow: 0, cloud: 0.85, bank: 0.6, farHaze: 0.5 } },
        { c: { sky0: '#0b1536', sky1: '#1d3266', sky2: '#3b5a8c', haze: '#35517f', mist: '#4f6c9c', back0: '#1c2b54', back1: '#2a406f',
               near0: '#273c67', near1: '#3a5384', rim: '#9ae6ff', moss: '#3f7481', path: '#5d6d98', path2: '#495883', stone: '#6c7ca6',
               seam: '#42507a', sun: '#ff9a6b' },
          n: { night: 1, sun: 0, sunY: 1.3, moon: 1, moonY: 0.2, stars: 1, aurora: 1, rainbow: 0, cloud: 0.5, bank: 0.45, farHaze: 0.45 } },
        { c: { sky0: '#97ade6', sky1: '#f1bfd6', sky2: '#ffe5c6', haze: '#f5d6dc', mist: '#fbeae4', back0: '#c4a5d5', back1: '#e6cde1',
               near0: '#eeb2c3', near1: '#f6d6df', rim: '#fff6f0', moss: '#a5d3b1', path: '#fbeee0', path2: '#f1dbc9', stone: '#f3dfcf',
               seam: '#dcc0aa', sun: '#ffd29e' },
          n: { night: 0.12, sun: 0.85, sunY: 0.52, moon: 0.15, moonY: 1.05, stars: 0.1, aurora: 0, rainbow: 1, cloud: 0.9, bank: 0.3, farHaze: 0.2 } }
    ];
    LANDS.forEach(function (l) { for (var key in l.c) l.c[key] = hex(l.c[key]); });
    var P = { c: {}, n: {} }, ga = 0, gb = 1, gt = 0;      /* the palette and the lands around the cat right now */
    function palette() {
        landAt(dist); ga = la; gb = lb; gt = lt;
        var A = LANDS[ga], B = LANDS[gb], key;
        for (key in A.c) P.c[key] = lerp3(A.c[key], B.c[key], gt);
        for (key in A.n) P.n[key] = A.n[key] + (B.n[key] - A.n[key]) * gt;
    }

    /* ---------- sprites: drawn once per size, in design units scaled by sc ---------- */
    var sc = 1, dpr = 1, built = '', SP = null, amb = 0;
    function mk(w, h, ax, fn, lo) {
        var r = lo ? Math.min(dpr, 1.25) : dpr, c = document.createElement('canvas');
        c.width = Math.max(1, Math.ceil(w * sc * r)); c.height = Math.max(1, Math.ceil(h * sc * r));
        var x = c.getContext('2d');
        x.scale(sc * r, sc * r); x.lineJoin = 'round'; x.lineCap = 'round';
        fn(x, w, h);
        return { c: c, w: w * sc, h: h * sc, ax: ax * sc };
    }
    function circ(c, x, yy, r) { c.beginPath(); c.arc(x, yy, r, 0, TAU); c.fill(); }
    function elli(c, x, yy, rx, ry) { c.beginPath(); c.ellipse(x, yy, rx, ry, 0, 0, TAU); c.fill(); }
    function poly(c, p) { c.beginPath(); c.moveTo(p[0], p[1]); for (var j = 2; j < p.length; j += 2) c.lineTo(p[j], p[j + 1]); c.closePath(); }
    function vgrad(c, y0, y1, a, b) { var gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
    function glow(c, x, yy, r, col, a) {
        var gr = c.createRadialGradient(x, yy, 0, x, yy, r);
        gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(0.45, 'rgba(' + col + ',' + (a * 0.4) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        c.fillStyle = gr; c.fillRect(x - r, yy - r, 2 * r, 2 * r);
    }
    function prism(c, x, by, w, h, tilt, lit, dark) {      /* a crystal: a lit and a shaded face and a pointed tip */
        var tx = x + tilt, ty = by - h - w * 0.9;
        poly(c, [x - w / 2, by, x, by + w * 0.12, tx, by - h, tx, ty, tx - w / 2, by - h]); c.fillStyle = lit; c.fill();
        poly(c, [x, by + w * 0.12, x + w / 2, by, tx + w / 2, by - h, tx, ty, tx, by - h]); c.fillStyle = dark; c.fill();
        c.strokeStyle = 'rgba(255, 255, 255, .6)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(tx - w / 2 + 1.5, by - h); c.lineTo(tx, ty); c.lineTo(tx, by - h); c.stroke();
    }
    function crown(c, balls, base, hi, shade) {            /* a round tree crown with a shaded and a lit side */
        var j;
        c.fillStyle = shade;
        for (j = 0; j < balls.length; j++) circ(c, balls[j][0] + 2.5, balls[j][1] + 2.5, balls[j][2]);
        c.fillStyle = base;
        for (j = 0; j < balls.length; j++) circ(c, balls[j][0], balls[j][1], balls[j][2]);
        c.fillStyle = hi;
        for (j = 0; j < balls.length; j++) circ(c, balls[j][0] - balls[j][2] * 0.3, balls[j][1] - balls[j][2] * 0.35, balls[j][2] * 0.5);
    }
    function yarnBall(c, x, yy, r, col, dark, light) {
        var gr = c.createRadialGradient(x - r * 0.35, yy - r * 0.4, r * 0.1, x, yy, r);
        gr.addColorStop(0, light); gr.addColorStop(0.55, col); gr.addColorStop(1, dark);
        c.fillStyle = gr; circ(c, x, yy, r);
        c.save();
        c.beginPath(); c.arc(x, yy, r - 0.5, 0, TAU); c.clip();
        c.lineWidth = Math.max(1, r * 0.06);
        var sets = [0.5, -0.8, 2.1];
        for (var s = 0; s < 3; s++) {
            c.save(); c.translate(x, yy); c.rotate(sets[s]);
            for (var j = 0; j < 4; j++) {
                c.strokeStyle = j % 2 ? 'rgba(255, 255, 255, .35)' : dark;
                c.beginPath(); c.ellipse(0, 0, r * (0.3 + j * 0.2), r * 1.15, 0, s === 2 ? 0.3 : -1.2, s === 2 ? 2.6 : 1.2); c.stroke();
            }
            c.restore();
        }
        c.restore();
    }
    var PUFF = [[[28, 52, 20], [56, 38, 28], [92, 36, 30], [124, 48, 22], [76, 56, 22], [42, 60, 16], [108, 60, 18]],
                [[24, 50, 16], [48, 40, 22], [78, 32, 26], [108, 44, 20], [64, 56, 18], [92, 58, 16]]];
    var CLOUDC = [['#ffffff', '#d7e5f1'], ['#ffe4d6', '#c595b5'], ['#6a80b2', '#33467a'], ['#fff8fa', '#efc8da']];
    var BANKC = [['#ffffff', '#e4edf4'], ['#f6c9bd', '#c995b1'], ['#4e6597', '#2c406e'], ['#fff3f4', '#f1d0de']];
    function puffs(c, list, dx, dy) {
        c.beginPath();
        for (var j = 0; j < list.length; j++) { var p = list[j]; c.moveTo(p[0] + dx + p[2], p[1] + dy); c.arc(p[0] + dx, p[1] + dy, p[2], 0, TAU); }
    }
    var SW = 1600, SH = 370, F = TAU / SW, LM = 900;       /* far strips: design size, tiling period, landmark x */
    function rfill(c, col, fn) {
        c.beginPath(); c.moveTo(0, SH);
        for (var x = 0; x <= SW; x += 8) c.lineTo(x, SH - fn(x));
        c.lineTo(SW, SH); c.closePath();
        if (col) { c.fillStyle = col; c.fill(); }
    }
    function snow(c, fn, y0, y1, a) {                      /* light on the tops of a range */
        c.save(); rfill(c, null, fn); c.clip();
        c.fillStyle = vgrad(c, y0, y1, 'rgba(235, 244, 255, ' + a + ')', 'rgba(235, 244, 255, 0)');
        c.fillRect(0, y0, SW, y1 - y0); c.restore();
    }
    function tiled(fn) { fn(0); fn(-SW); fn(SW); }        /* things near an edge of a strip, drawn on both sides */
    function mushSil(c, x, h, rx, ry, col) {
        c.fillStyle = col;
        poly(c, [x - rx * 0.16, SH, x - rx * 0.1, SH - h, x + rx * 0.1, SH - h, x + rx * 0.2, SH]); c.fill();
        c.beginPath(); c.ellipse(x, SH - h + 4, rx, ry, 0, Math.PI, TAU); c.closePath(); c.fill();
    }
    var STRIP = [
        function (c) {                                     /* Sky Isles: pale ranges and a castle on a cliff */
            var back = function (x) { return 205 + 40 * Math.sin(F * 3 * x + 0.5) + 26 * Math.sin(F * 7 * x + 1) + 10 * Math.sin(F * 17 * x); };
            rfill(c, '#d3e4f1', back);
            snow(c, back, SH - 290, SH - 205, 0.75);
            rfill(c, '#bcd5e9', function (x) { return 122 + 30 * Math.sin(F * 4 * x + 2) + 14 * Math.sin(F * 11 * x); });
            poly(c, [820, SH, 832, 240, 846, 206, 858, 178, 868, 160, 952, 160, 962, 182, 972, 214, 988, SH]);
            c.fillStyle = '#abc5de'; c.fill();
            poly(c, [910, 160, 952, 160, 962, 182, 972, 214, 988, SH, 930, SH]); c.fillStyle = 'rgba(120, 150, 190, .18)'; c.fill();
            c.fillStyle = '#a0bad6';
            c.fillRect(872, 108, 66, 54);
            for (var x = 872; x < 936; x += 9) c.fillRect(x, 101, 5, 8);
            c.fillStyle = '#98b3d0';
            c.fillRect(861, 88, 17, 74); c.fillRect(895, 62, 21, 100); c.fillRect(932, 92, 16, 70);
            c.fillStyle = '#86a5ca';
            poly(c, [858, 90, 869.5, 62, 881, 90]); c.fill();
            poly(c, [891, 64, 905.5, 26, 920, 64]); c.fill();
            poly(c, [929, 94, 940, 70, 951, 94]); c.fill();
            c.strokeStyle = '#86a5ca'; c.lineWidth = 1.2;
            c.beginPath(); c.moveTo(905.5, 26); c.lineTo(905.5, 12); c.moveTo(869.5, 62); c.lineTo(869.5, 52); c.stroke();
            c.fillStyle = '#f1b2c3';
            poly(c, [905.5, 12, 917, 15, 905.5, 18]); c.fill();
            poly(c, [869.5, 52, 878, 54.5, 869.5, 57]); c.fill();
            c.fillStyle = '#fff4d8';
            [[867, 104, 3, 6], [903, 80, 4, 7], [903, 100, 4, 7], [938, 110, 3, 6], [886, 128, 3, 5], [920, 128, 3, 5]]
                .forEach(function (r) { c.fillRect(r[0], r[1], r[2], r[3]); });
            c.fillStyle = '#8eaacb'; c.beginPath(); c.arc(905, 162, 8, Math.PI, TAU); c.fill();
            c.strokeStyle = 'rgba(255, 255, 255, .7)'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(957, 170); c.quadraticCurveTo(964, 240, 966, SH); c.stroke();
            rfill(c, '#adcae2', function (x) { return 58 + 18 * Math.sin(F * 5 * x + 1) + 8 * Math.sin(F * 13 * x); });
        },
        function (c) {                                     /* Glowcap Hollow: a misty forest of giant mushrooms */
            rfill(c, '#d8a5bc', function (x) { return 76 + 22 * Math.sin(F * 3 * x) + 10 * Math.sin(F * 9 * x + 1); });
            var j;
            for (j = 0; j < 10; j++) (function (j) {
                var x = j * 160 + hash(j + 20) * 80, h = 140 + hash(j + 30) * 120, rx = 40 + hash(j + 40) * 36;
                if (Math.abs(x - LM) < 120) return;
                tiled(function (o) { mushSil(c, x + o, h, rx, rx * 0.55, '#d09ab8'); });
            })(j);
            var lmx = LM;                                  /* the landmark: a mushroom tower with lit windows */
            mushSil(c, lmx, 262, 112, 66, '#a8779c');
            c.fillStyle = 'rgba(255, 220, 230, .25)';
            [[-60, 222, 9], [-20, 240, 12], [30, 232, 10], [64, 214, 7]].forEach(function (s) { circ(c, lmx + s[0], SH - s[1], s[2]); });
            [[lmx - 4, SH - 200], [lmx + 6, SH - 140], [lmx - 6, SH - 84]].forEach(function (p) {
                glow(c, p[0], p[1], 16, '255, 210, 140', 0.7);
                c.fillStyle = '#ffe2a6'; c.beginPath(); c.ellipse(p[0], p[1], 3.5, 5, 0, 0, TAU); c.fill();
            });
            for (j = 0; j < 8; j++) (function (j) {
                var x = j * 200 + 60 + hash(j + 50) * 90, h = 70 + hash(j + 60) * 80, rx = 30 + hash(j + 70) * 26;
                if (Math.abs(x - LM) < 70) return;
                tiled(function (o) { mushSil(c, x + o, h, rx, rx * 0.6, '#b9859f'); });
            })(j);
            rfill(c, '#ab7b98', function (x) { return 40 + 12 * Math.sin(F * 6 * x) + 6 * Math.sin(F * 17 * x + 2); });
        },
        function (c) {                                     /* Crystal Night: snowy peaks and a giant crystal */
            var back = function (x) { return 120 + 120 * (1 - Math.abs(Math.sin(F * 5 * x + 0.4))) + 30 * (1 - Math.abs(Math.sin(F * 13 * x + 1))); };
            rfill(c, '#2f4577', back);
            snow(c, back, SH - 270, SH - 175, 0.55);
            var front = function (x) { return 72 + 62 * (1 - Math.abs(Math.sin(F * 7 * x + 2))) + 14 * Math.sin(F * 19 * x); };
            var by = SH - front(LM) + 14;
            glow(c, LM, by - 90, 150, '120, 220, 255', 0.32);
            rfill(c, '#22355f', front);
            snow(c, front, SH - 150, SH - 95, 0.3);
            prism(c, LM - 26, by + 6, 16, 52, -8, '#b9a3ff', '#7058c8');
            prism(c, LM + 30, by + 8, 18, 70, 9, '#8fe1fa', '#3f8fc0');
            prism(c, LM, by, 34, 150, 4, '#a5ecff', '#3f94c6');
            [[260, 0.6], [520, 0.4], [1240, 0.5], [1450, 0.7]].forEach(function (s) {
                var x = s[0], yy = SH - back(x) + 30;
                glow(c, x, yy, 18, '150, 230, 255', s[1]);
            });
        },
        function (c) {                                     /* Woolly Dawn: pastel hills and a sleeping dragon */
            rfill(c, '#ecd8eb', function (x) { return 86 + 26 * Math.sin(F * 3 * x) + 12 * Math.sin(F * 8 * x + 1); });
            var o = 385, j;
            c.save(); c.translate(DC, SH - DY); c.scale(DS, DS); c.translate(-DC, -SH);
            var hump = function (x) { return SH - 212 * Math.pow(Math.max(0, Math.sin(Math.PI * (x - 240 - o) / 560)), 0.8); };
            c.fillStyle = '#c4a2d8';
            for (j = 0; j < 16; j++) {                     /* the tail: a chain of shrinking blobs that curls up */
                var t = j / 15, tx = o + 780 + 170 * t, ty = SH - 14 - 70 * t * t + 30 * t;
                circ(c, tx, ty, 26 - t * 20);
            }
            poly(c, [o + 948, SH - 52, o + 972, SH - 74, o + 960, SH - 44]); c.fill();
            c.beginPath(); c.moveTo(o + 240, SH);
            for (var x = o + 240; x <= o + 800; x += 5) c.lineTo(x, hump(x));
            c.closePath(); c.fill();
            elli(c, o + 715, SH - 26, 62, 34);
            c.fillStyle = '#b28cca';                       /* a folded wing */
            c.beginPath(); c.moveTo(o + 430, SH - 150); c.quadraticCurveTo(o + 560, SH - 220, o + 650, SH - 140);
            c.quadraticCurveTo(o + 600, SH - 120, o + 560, SH - 128); c.quadraticCurveTo(o + 520, SH - 108, o + 480, SH - 124);
            c.quadraticCurveTo(o + 455, SH - 120, o + 430, SH - 150); c.fill();
            c.fillStyle = '#a983c3';                       /* spine plates */
            for (j = 0; j < 9; j++) {
                var px = o + 330 + j * 48, ps = 30 - Math.abs(j - 4) * 3.5;
                poly(c, [px - 14, hump(px - 14) + 3, px + 4, hump(px) - ps, px + 14, hump(px + 14) + 3]); c.fill();
            }
            c.fillStyle = '#c4a2d8';                       /* neck, head and paw */
            c.beginPath(); c.moveTo(o + 330, SH - 120); c.quadraticCurveTo(o + 280, SH - 90, o + 250, SH - 76);
            c.bezierCurveTo(o + 210, SH - 92, o + 160, SH - 86, o + 130, SH - 64);
            c.bezierCurveTo(o + 108, SH - 52, o + 92, SH - 40, o + 98, SH - 22); c.lineTo(o + 104, SH); c.lineTo(o + 340, SH); c.fill();
            elli(c, o + 290, SH - 10, 46, 14);
            c.fillStyle = '#a983c3';
            poly(c, [o + 196, SH - 84, o + 236, SH - 112, o + 222, SH - 82]); c.fill();
            poly(c, [o + 176, SH - 82, o + 200, SH - 104, o + 196, SH - 80]); c.fill();
            c.strokeStyle = '#7f5f9a'; c.lineWidth = 3;
            c.beginPath(); c.arc(o + 170, SH - 66, 9, 0.3, 2.6); c.stroke();
            c.lineWidth = 2; c.beginPath(); c.arc(o + 200, SH - 38, 30, 2.1, 2.9); c.stroke();
            c.fillStyle = '#7f5f9a'; circ(c, o + 108, SH - 40, 3);
            c.fillStyle = '#ab88c5';                       /* small trees on its back, it has slept for ages */
            [[400, 4], [470, 5], [520, 4.5], [610, 5], [680, 4]].forEach(function (s) { var tx = o + s[0]; circ(c, tx, hump(tx) + 16, s[1] * 2); });
            c.fillStyle = 'rgba(255, 245, 250, .35)';      /* morning light on its back */
            c.beginPath(); c.moveTo(o + 300, hump(o + 300) + 6);
            for (x = o + 300; x <= o + 700; x += 10) c.lineTo(x, hump(x) + 4);
            for (x = o + 700; x >= o + 300; x -= 10) c.lineTo(x, hump(x) + 14);
            c.fill();
            c.restore();
            rfill(c, '#d2b8df', function (x) { return DY + 8 + 10 * Math.sin(F * 4 * x) + 5 * Math.sin(F * 11 * x + 1); });
            rfill(c, '#c9abd8', function (x) { return 26 + 10 * Math.sin(F * 6 * x + 0.5) + 5 * Math.sin(F * 15 * x); });
        }
    ];
    var DS = 1.1, DC = 385 + 540, DY = 92, NOSE = [DC + (385 + 100 - DC) * DS, SH - DY - 44 * DS];   /* where the dragon's smoke comes out */
    function build() {
        SP = { cloud: [], bank: [], strip: [], l2: [], l3: [], l4: [] };
        var j, k;
        for (j = 0; j < 4; j++) {
            SP.cloud.push([0, 1].map(function (s) {
                return mk(150, 82, 0, function (c) {
                    puffs(c, PUFF[s], 2, 5); c.fillStyle = 'rgba(80, 90, 140, .12)'; c.fill();
                    puffs(c, PUFF[s], 0, 0); c.fillStyle = vgrad(c, 8, 78, CLOUDC[j][0], CLOUDC[j][1]); c.fill();
                });
            }));
            SP.bank.push(mk(900, 110, 0, function (c) {
                var list = [];
                for (k = 0; k < 18; k++) list.push([k * 50 + hash(k + 7) * 20, 0, 26 + hash(k + 9) * 24]);
                c.beginPath();
                for (k = 0; k < list.length; k++) for (var o = -900; o <= 900; o += 900) {
                    var p = list[k]; c.moveTo(p[0] + o + p[2], 70 - p[2] * 0.6); c.arc(p[0] + o, 70 - p[2] * 0.6, p[2], 0, TAU);
                }
                c.rect(0, 60, 900, 50);
                c.fillStyle = vgrad(c, 10, 110, BANKC[j][0], BANKC[j][1]); c.fill();
            }, true));
            SP.strip.push(mk(SW, SH, 0, STRIP[j], true));
        }
        SP.moon = mk(96, 96, 48, function (c) {
            glow(c, 48, 48, 48, '230, 240, 255', 0.35);
            c.fillStyle = '#f3f6ff'; circ(c, 48, 48, 22);
            c.globalCompositeOperation = 'destination-out';
            circ(c, 60, 40, 19);
            c.globalCompositeOperation = 'source-over';
        });
        /* floating things, layer 2 */
        var island = function (v) {
            var w = v ? 130 : 180, h = v ? 118 : 156, top = 40;
            var s = mk(w, h, w / 2, function (c) {
                var cx = w / 2;
                poly(c, [6, top, w * 0.16, top + 26, w * 0.27, top + 22, w * 0.36, top + 58, w * 0.47, h - 3, w * 0.56, top + 66, w * 0.66, top + 38, w * 0.78, top + 46, w * 0.86, top + 20, w - 6, top]);
                c.fillStyle = vgrad(c, top, h, '#d2bea7', '#9b90b2'); c.fill();
                c.save(); c.clip();
                c.fillStyle = 'rgba(90, 80, 130, .2)'; poly(c, [cx + 6, top, w, top, w, h, cx - 4, h]); c.fill();
                c.strokeStyle = 'rgba(110, 90, 120, .25)'; c.lineWidth = 2;
                for (var j2 = 1; j2 < 4; j2++) { c.beginPath(); c.moveTo(0, top + j2 * 16); c.quadraticCurveTo(cx, top + j2 * 16 + 8, w, top + j2 * 16 - 2); c.stroke(); }
                c.restore();
                c.strokeStyle = '#7db178'; c.lineWidth = 1.6;
                [[0.22, 22], [0.4, 34], [0.72, 18]].forEach(function (vv) { c.beginPath(); c.moveTo(w * vv[0], top + 8); c.quadraticCurveTo(w * vv[0] + 4, top + vv[1] * 0.6, w * vv[0] - 2, top + vv[1]); c.stroke(); });
                c.fillStyle = '#90cb85'; elli(c, cx, top, w / 2, 12);
                for (var x = 12; x < w - 8; x += 13) { c.beginPath(); c.arc(x, top + 7, 5, 0, Math.PI); c.fill(); }
                c.fillStyle = '#b2df9f'; elli(c, cx - 4, top - 3, w / 2 - 10, 7);
                if (!v) {
                    c.fillStyle = '#a58a76'; c.fillRect(w * 0.3 - 2, top - 26, 4, 24);
                    crown(c, [[w * 0.3, top - 34, 13], [w * 0.3 - 10, top - 24, 9], [w * 0.3 + 10, top - 25, 10]], '#86c294', '#ade0b0', '#6aa983');
                    c.fillStyle = '#f4ede4'; c.fillRect(w * 0.6, top - 44, 16, 42);
                    c.fillStyle = 'rgba(120, 110, 140, .18)'; c.fillRect(w * 0.6 + 9, top - 44, 7, 42);
                    c.fillStyle = '#e8867a'; poly(c, [w * 0.6 - 4, top - 42, w * 0.6 + 8, top - 66, w * 0.6 + 20, top - 42]); c.fill();
                    c.fillStyle = '#ffe39c'; c.fillRect(w * 0.6 + 5, top - 32, 5, 7);
                } else {
                    [[0.6, 34], [0.76, 24]].forEach(function (p) {
                        var fx = w * p[0];
                        poly(c, [fx, top - p[1], fx + 9, top, fx - 9, top]); c.fillStyle = '#76b38f'; c.fill();
                        poly(c, [fx, top - p[1], fx - 9, top, fx - 2, top]); c.fillStyle = '#a5d6ae'; c.fill();
                    });
                }
                c.fillStyle = 'rgba(220, 240, 255, .9)'; elli(c, v ? 22 : w - 26, top + 3, 7, 2.5);
            });
            s.wx = (v ? 22 - w / 2 : w / 2 - 26) * sc; s.wy = (top + 4) * sc;
            return s;
        };
        var lantern = mk(44, 60, 22, function (c) {
            glow(c, 22, 32, 22, '255, 180, 100', 0.6);
            c.beginPath(); c.moveTo(15, 18); c.lineTo(29, 18); c.quadraticCurveTo(33, 30, 30, 42); c.lineTo(14, 42); c.quadraticCurveTo(11, 30, 15, 18);
            c.fillStyle = vgrad(c, 18, 42, '#ffe8a8', '#ff985a'); c.fill();
            c.strokeStyle = 'rgba(190, 80, 40, .3)'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(19.5, 19); c.lineTo(18.5, 41); c.moveTo(24.5, 19); c.lineTo(25.5, 41); c.stroke();
            c.fillStyle = '#fff5c8'; elli(c, 22, 41, 7.5, 2.2);
        });
        var shard = mk(120, 130, 60, function (c) {
            glow(c, 60, 34, 58, '120, 220, 255', 0.38);
            poly(c, [8, 54, 24, 76, 34, 72, 46, 104, 58, 126, 70, 100, 82, 80, 96, 84, 112, 54]);
            c.fillStyle = vgrad(c, 54, 126, '#4a5c94', '#1d2852'); c.fill();
            c.fillStyle = 'rgba(10, 20, 50, .25)'; poly(c, [62, 54, 112, 54, 96, 84, 82, 80, 70, 100, 58, 126]); c.fill();
            c.fillStyle = '#5d70a8'; elli(c, 60, 54, 53, 8);
            prism(c, 32, 56, 9, 16, -6, '#b4f3ff', '#4fb2e3');
            prism(c, 84, 55, 10, 22, 6, '#b4f3ff', '#4fb2e3');
            prism(c, 68, 57, 12, 28, 4, '#dccaff', '#8a6be0');
            prism(c, 50, 56, 16, 44, -3, '#c2f6ff', '#4fb2e3');
        });
        var balloon = function (col, dark, light) {
            return mk(70, 112, 35, function (c) {
                c.strokeStyle = 'rgba(120, 90, 80, .6)'; c.lineWidth = 1;
                c.beginPath(); c.moveTo(16, 50); c.lineTo(29, 92); c.moveTo(54, 50); c.lineTo(41, 92); c.stroke();
                yarnBall(c, 35, 34, 28, col, dark, light);
                c.fillStyle = '#d8ae7c'; c.fillRect(27, 91, 16, 13);
                c.strokeStyle = 'rgba(140, 90, 50, .5)';
                c.beginPath(); c.moveTo(27, 96); c.lineTo(43, 96); c.moveTo(27, 100); c.lineTo(43, 100); c.stroke();
                c.fillStyle = '#fff3e6'; circ(c, 35, 5, 4.5);
            });
        };
        SP.isles = [island(0), island(1)];
        SP.l2 = [SP.isles, [lantern], [shard], [balloon('#f6a9c5', '#cf6f99', '#ffe0ec'), balloon('#a5dcc6', '#5ea98f', '#e2fbf0')]];
        /* back hills, layer 3 */
        var treeA = mk(80, 132, 40, function (c) {
            c.fillStyle = '#a7968c'; poly(c, [36, 132, 37.5, 66, 42.5, 66, 44, 132]); c.fill();
            crown(c, [[40, 48, 25], [23, 64, 17], [57, 62, 19], [40, 72, 19]], '#8bbcad', '#b0d6c7', '#76a99c');
        });
        var cypress = mk(56, 140, 28, function (c) {
            c.fillStyle = '#a7968c'; c.fillRect(26, 112, 4, 28);
            for (var j2 = 0; j2 < 4; j2++) {               /* a pointed fir: four tiers, lit on the left */
                var ty = 14 + j2 * 24, hw = 12 + j2 * 5;
                poly(c, [28, ty, 28 + hw, ty + 36, 28 - hw, ty + 36]); c.fillStyle = '#7aab9e'; c.fill();
                poly(c, [28, ty, 28 - hw, ty + 36, 28 - hw * 0.2, ty + 36]); c.fillStyle = '#a3cabd'; c.fill();
            }
        });
        var tower = mk(50, 150, 25, function (c) {
            c.fillStyle = vgrad(c, 50, 150, '#eef0f4', '#cbd3de'); c.fillRect(13, 50, 24, 100);
            c.fillStyle = 'rgba(110, 120, 150, .16)'; c.fillRect(26, 50, 11, 100);
            c.fillStyle = '#86a9d8'; poly(c, [8, 53, 25, 8, 42, 53]); c.fill();
            c.fillStyle = '#7095c6'; poly(c, [25, 8, 42, 53, 25, 53]); c.fill();
            c.strokeStyle = '#7095c6'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(25, 8); c.lineTo(25, -2 + 4); c.stroke();
            c.fillStyle = '#f3a3b8'; poly(c, [25, 2, 34, 5, 25, 8]); c.fill();
            c.fillStyle = '#ffe7a3'; c.beginPath(); c.moveTo(21, 80); c.lineTo(21, 72); c.arc(25, 72, 4, Math.PI, TAU); c.lineTo(29, 80); c.fill();
        });
        var mush = function (w, h, rx, ry, c0, c1, spot, glowC) {
            return mk(w, h, w / 2, function (c) {
                var cx = w / 2, capY = h - h * 0.56;
                glow(c, cx + 4, capY + 14, rx * 1.15, glowC, 0.5);
                c.beginPath(); c.moveTo(cx - rx * 0.2, h); c.quadraticCurveTo(cx - rx * 0.12, h * 0.7, cx - rx * 0.06, capY + 4);
                c.lineTo(cx + rx * 0.2, capY + 4); c.quadraticCurveTo(cx + rx * 0.16, h * 0.7, cx + rx * 0.25, h); c.closePath();
                c.fillStyle = vgrad(c, capY, h, '#f6eaf3', '#c0a6cf'); c.fill();
                c.fillStyle = 'rgba(120, 90, 150, .2)'; poly(c, [cx + rx * 0.07, capY + 4, cx + rx * 0.2, capY + 4, cx + rx * 0.16, h * 0.7, cx + rx * 0.25, h, cx + rx * 0.1, h]); c.fill();
                c.fillStyle = 'rgba(255, 255, 255, .5)'; elli(c, cx + 2, capY + (h - capY) * 0.35, rx * 0.22, 4);
                c.fillStyle = '#f7d9ad'; elli(c, cx + 4, capY + 2, rx * 0.96, ry * 0.24);
                c.strokeStyle = 'rgba(190, 120, 90, .35)'; c.lineWidth = 1;
                c.beginPath();
                for (var a = 0.3; a < 2.9; a += 0.22) { c.moveTo(cx + 4, capY + 2); c.lineTo(cx + 4 + Math.cos(a) * rx * 0.9, capY + 2 + Math.sin(a) * ry * 0.22); }
                c.stroke();
                c.beginPath(); c.ellipse(cx + 4, capY + 2, rx, ry, 0, Math.PI, TAU); c.closePath();
                c.fillStyle = vgrad(c, capY - ry, capY + 2, c0, c1); c.fill();
                c.save(); c.clip();
                c.fillStyle = 'rgba(255, 255, 255, .22)'; elli(c, cx - rx * 0.3, capY - ry * 0.65, rx * 0.45, ry * 0.3);
                c.fillStyle = spot;
                [[-0.5, 0.45, 0.13], [-0.05, 0.75, 0.16], [0.42, 0.5, 0.12], [0.7, 0.2, 0.08], [-0.8, 0.15, 0.08], [0.15, 0.3, 0.09]]
                    .forEach(function (s) { elli(c, cx + 4 + s[0] * rx, capY + 2 - s[1] * ry, s[2] * rx, s[2] * rx * 0.8); });
                c.restore();
            });
        };
        var crysBig = function (main, mainD, side, sideD) {
            return mk(130, 240, 65, function (c) {
                glow(c, 65, 150, 85, '130, 220, 255', 0.32);
                c.fillStyle = '#1e2d56'; elli(c, 65, 238, 52, 9);
                prism(c, 22, 238, 12, 30, -12, side, sideD);
                prism(c, 40, 238, 20, 74, -9, side, sideD);
                prism(c, 104, 238, 13, 38, 12, main, mainD);
                prism(c, 86, 238, 22, 92, 9, main, mainD);
                prism(c, 64, 240, 30, 130, 3, main, mainD);
            });
        };
        var yarnTree = function (col, dark, light) {
            return mk(90, 150, 45, function (c) {
                c.fillStyle = '#dcb88f'; c.fillRect(41, 60, 8, 90);
                c.strokeStyle = 'rgba(150, 100, 60, .45)'; c.lineWidth = 1.2;
                c.beginPath();
                for (var yy = 82; yy < 148; yy += 7) { c.moveTo(41.5, yy); c.lineTo(45, yy + 3); c.lineTo(48.5, yy); }
                c.stroke();
                c.strokeStyle = dark; c.lineWidth = 2;
                c.beginPath(); c.moveTo(66, 62); c.bezierCurveTo(80, 80, 60, 92, 70, 108); c.stroke();
                yarnBall(c, 45, 42, 34, col, dark, light);
            });
        };
        SP.l3 = [
            [treeA, treeA, cypress, treeA, cypress, tower],
            [mush(150, 230, 64, 50, '#e7699f', '#a83f84', '#ffd8ea', '255, 228, 160'), mush(150, 210, 62, 46, '#5fc6bb', '#2e7b8e', '#dcfff7', '170, 255, 235'),
             mush(110, 250, 42, 36, '#f4a75a', '#c2632f', '#ffe9c4', '255, 220, 150')],
            [crysBig('#a8efff', '#46a7da', '#d4c2ff', '#7e5fd6'), crysBig('#d4c2ff', '#7e5fd6', '#a8efff', '#46a7da')],
            [yarnTree('#f7a8c4', '#cf6e98', '#ffe0ec'), yarnTree('#a3dcc4', '#5aa98d', '#e0fbef'), yarnTree('#c7b4ee', '#8c74c8', '#efe7ff'), yarnTree('#f8da94', '#cfa14c', '#fff6dc')]
        ];
        /* near hills, layer 4: smaller and calmer, right behind the obstacles */
        var bush = mk(66, 40, 33, function (c) {
            crown(c, [[17, 28, 13], [33, 22, 16], [50, 28, 13]], '#9ccb90', '#bde0ae', '#86b77f');
            [[14, 24, '#ffffff'], [27, 17, '#f7b9c9'], [38, 27, '#fbe39a'], [48, 21, '#ffffff'], [55, 30, '#f7b9c9']]
                .forEach(function (f) { c.fillStyle = f[2]; circ(c, f[0], f[1], 2.6); });
        });
        var blossom = mk(62, 88, 31, function (c) {
            c.fillStyle = '#ad9787'; poly(c, [29, 88, 30, 46, 33, 46, 34, 88]); c.fill();
            crown(c, [[31, 32, 19], [17, 44, 13], [45, 43, 14]], '#efc1cf', '#fbdde6', '#d9a3b6');
            c.fillStyle = '#ffffff';
            [[24, 26], [37, 36], [15, 44], [46, 46], [31, 46]].forEach(function (p) { circ(c, p[0], p[1], 1.8); });
        });
        var mcluster = mk(64, 54, 32, function (c) {
            [[20, 22, 11, '#ff8cbc', '255, 170, 210'], [36, 32, 14, '#7fe0d5', '160, 255, 240'], [51, 18, 9, '#ffb36b', '255, 210, 150']].forEach(function (m) {
                glow(c, m[0], 54 - m[1], m[2] * 2, m[4], 0.55);
                c.fillStyle = '#efe2ef'; c.fillRect(m[0] - 2.5, 54 - m[1], 5, m[1]);
                c.beginPath(); c.ellipse(m[0], 54 - m[1] + 1, m[2], m[2] * 0.75, 0, Math.PI, TAU); c.closePath();
                c.fillStyle = m[3]; c.fill();
                c.fillStyle = 'rgba(255, 255, 255, .7)'; circ(c, m[0] - m[2] * 0.35, 54 - m[1] - m[2] * 0.35, m[2] * 0.16); circ(c, m[0] + m[2] * 0.3, 54 - m[1] - m[2] * 0.2, m[2] * 0.12);
            });
        });
        var lpost = mk(40, 94, 12, function (c) {
            c.strokeStyle = '#5c4d6d'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(12, 94); c.lineTo(12, 14); c.quadraticCurveTo(14, 8, 28, 12); c.stroke();
            c.lineWidth = 1; c.beginPath(); c.moveTo(28, 12); c.lineTo(28, 20); c.stroke();
            glow(c, 28, 29, 18, '255, 200, 120', 0.7);
            c.fillStyle = '#ffd98a'; poly(c, [24, 21, 32, 21, 33, 34, 23, 34]); c.fill();
            c.fillStyle = '#5c4d6d'; c.fillRect(23, 19, 10, 2.5); c.fillRect(22.5, 33.5, 11, 2.5);
        });
        var ccluster = mk(56, 56, 28, function (c) {
            glow(c, 28, 34, 26, '130, 220, 255', 0.4);
            prism(c, 16, 56, 9, 12, -5, '#d4c2ff', '#7e5fd6');
            prism(c, 39, 56, 10, 17, 5, '#a8efff', '#46a7da');
            prism(c, 28, 57, 13, 25, 1, '#a8efff', '#46a7da');
        });
        var cflower = mk(36, 44, 18, function (c) {
            c.strokeStyle = '#4f8197'; c.lineWidth = 1.5;
            c.beginPath(); c.moveTo(18, 44); c.quadraticCurveTo(16, 26, 9, 16); c.moveTo(18, 44); c.quadraticCurveTo(20, 24, 27, 12); c.moveTo(18, 44); c.lineTo(18, 22); c.stroke();
            [[9, 16], [27, 12], [18, 22]].forEach(function (p) { glow(c, p[0], p[1] + 2, 9, '150, 240, 255', 0.6); c.fillStyle = '#c6f7ff'; circ(c, p[0], p[1] + 2, 2.6); });
        });
        var pompom = mk(66, 42, 33, function (c) {
            [[18, 28, 13, '#f8c6d5'], [34, 22, 15, '#cbe9da'], [50, 29, 12, '#e2d4f6']].forEach(function (b) {
                c.fillStyle = b[3]; circ(c, b[0], b[1], b[2]);
                c.fillStyle = 'rgba(255, 255, 255, .55)';
                for (var j2 = 0; j2 < 7; j2++) { var a = j2 * 2.4; circ(c, b[0] + Math.cos(a) * b[2] * 0.55, b[1] + Math.sin(a) * b[2] * 0.55, 1.4); }
            });
        });
        var button = mk(28, 56, 14, function (c) {
            c.strokeStyle = '#94c9a4'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(14, 56); c.lineTo(14, 22); c.stroke();
            c.fillStyle = '#9fd1ae'; c.beginPath(); c.ellipse(19, 42, 6, 3, -0.5, 0, TAU); c.fill();
            c.fillStyle = '#f5c46e'; circ(c, 14, 14, 11);
            c.fillStyle = '#fbd78f'; circ(c, 14, 14, 8.5);
            c.fillStyle = '#c48b4a';
            [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(function (p) { circ(c, 14 + p[0], 14 + p[1], 1.6); });
        });
        SP.l4 = [[bush, blossom, bush, bush], [mcluster, lpost, mcluster], [ccluster, cflower, ccluster], [pompom, button, pompom]];
        /* ambient sprites */
        SP.crane = mk(46, 30, 23, function (c) {
            c.fillStyle = '#f7ecf1'; poly(c, [8, 19, 23, 15, 38, 19, 23, 23]); c.fill();
            c.fillStyle = '#ffffff'; poly(c, [17, 17, 31, 1, 29, 17]); c.fill();
            c.fillStyle = '#ead7e2'; poly(c, [17, 17, 31, 1, 24, 16]); c.fill();
            c.fillStyle = '#f7ecf1'; poly(c, [11, 19, 2, 9, 5, 9, 15, 18]); c.fill();
            poly(c, [35, 19, 46, 13, 40, 20]); c.fill();
            c.fillStyle = '#e88aa5'; poly(c, [2, 9, 0, 11, 4, 10]); c.fill();
        });
        SP.fly = mk(24, 24, 12, function (c) { glow(c, 12, 12, 12, '225, 255, 150', 0.8); c.fillStyle = '#fbffd8'; circ(c, 12, 12, 1.8); });
        SP.spark = mk(22, 22, 11, function (c) {
            glow(c, 11, 11, 11, '170, 235, 255', 0.6);
            c.fillStyle = '#ffffff'; poly(c, [11, 2, 12.3, 9.7, 20, 11, 12.3, 12.3, 11, 20, 9.7, 12.3, 2, 11, 9.7, 9.7]); c.fill();
        });
        SP.seed = mk(22, 28, 11, function (c) {
            c.strokeStyle = 'rgba(255, 255, 255, .95)'; c.lineWidth = 0.9;
            c.beginPath(); c.moveTo(11, 26); c.lineTo(11, 11);
            for (var a = -2.6; a <= -0.5; a += 0.3) { c.moveTo(11, 11); c.lineTo(11 + Math.cos(a) * 9, 11 + Math.sin(a) * 9); }
            c.stroke();
            c.fillStyle = '#c9a98f'; elli(c, 11, 26, 1.4, 2.2);
        });
        SP.petal = mk(14, 10, 7, function (c) { c.fillStyle = '#f9c3d4'; c.beginPath(); c.ellipse(7, 5, 6, 3.4, 0.4, 0, TAU); c.fill(); c.fillStyle = '#ffe3ec'; elli(c, 5.5, 4, 2.6, 1.3); });
    }

    /* ---------- hills: their outline is a function of where they are, so a land rolls in from the right ---------- */
    function ridge(layer, land, u) {                       /* height above the ground, in design px, at layer position u */
        if (layer === 3) {
            if (land === 0) return 118 + 34 * Math.sin(u / 260) + 16 * Math.sin(u / 97 + 1);
            if (land === 1) return 126 + 26 * Math.sin(u / 210 + 2) + 12 * Math.sin(u / 71);
            if (land === 2) return 108 + 54 * (1 - Math.abs(Math.sin(u / 170))) + 12 * Math.sin(u / 57);
            return 108 + 30 * Math.sin(u / 240) + 12 * Math.sin(u / 118 + 0.5);
        }
        if (land === 0) return 54 + 15 * Math.sin(u / 170) + 7 * Math.sin(u / 61);
        if (land === 1) return 58 + 14 * Math.sin(u / 150 + 1) + 8 * Math.sin(u / 47);
        if (land === 2) return 50 + 22 * (1 - Math.abs(Math.sin(u / 120))) + 5 * Math.sin(u / 37);
        return 52 + 18 * Math.sin(u / 190) + 6 * Math.sin(u / 90);
    }
    function ridgeAt(layer, u) {
        landAt((u - W) / PAR[layer]);                      /* the land this spot belonged to when it came on screen */
        var uu = u / sc;
        return (lt > 0 ? ridge(layer, la, uu) + (ridge(layer, lb, uu) - ridge(layer, la, uu)) * lt : ridge(layer, la, uu)) * sc;
    }
    var SLOT = [0, 0, 0, 150, 104], DENS = [0, 0, 0, [0.72, 0.62, 0.55, 0.7], [0.62, 0.7, 0.6, 0.72]];
    function hills(layer) {
        var p = PAR[layer], off = dist * p, step = 12, top = ground, x, yy;
        g.beginPath(); g.moveTo(-step * 2, ground);
        for (x = -step - off % step; x <= W + step; x += step) {
            yy = ground - ridgeAt(layer, x + off);
            g.lineTo(x, yy);
            if (yy < top) top = yy;
        }
        g.lineTo(W + step * 2, ground); g.closePath();
        var c0 = layer === 3 ? P.c.back0 : P.c.near0, c1 = layer === 3 ? P.c.back1 : P.c.near1;
        g.fillStyle = vgrad(g, top, ground, css(c0), css(c1)); g.fill();
        g.strokeStyle = rgba(P.c.rim, layer === 3 ? 0.35 : 0.5); g.lineWidth = 2; g.stroke();
        var S = SLOT[layer] * sc, k0 = Math.floor((off - 90 * sc) / S), k1 = Math.ceil((off + W + 90 * sc) / S);
        for (var k = k0; k <= k1; k++) {
            var seed = k * 7.13 + layer * 101.7, u = k * S + hash(seed) * S * 0.6;
            landAt((u - W) / p);
            var land = hash(seed + 1.3) < lt ? lb : la;
            if (hash(seed + 2.9) > DENS[layer][land]) continue;
            var list = SP['l' + layer][land], s = list[Math.floor(hash(seed + 4.1) * list.length)];
            var base = ground - ridgeAt(layer, u) + 5 * sc;
            g.drawImage(s.c, u - off - s.ax, base - s.h, s.w, s.h);
        }
    }
    function band(y0, y1, col, a) {                        /* atmospheric haze: fades in towards the bottom */
        var gr = g.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, a));
        g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
    }

    /* ---------- the sky ---------- */
    var RAINBOW = ['#ff9aa8', '#ffc28a', '#fff1a0', '#b4ead2', '#9cd2ff', '#c7b4ff'].map(hex);
    var AURORA = [[90, 240, 190], [150, 120, 255]];
    function sky() {
        var n = P.n, j, x, yy;
        var gr = g.createLinearGradient(0, 0, 0, ground);
        gr.addColorStop(0, css(P.c.sky0)); gr.addColorStop(0.55, css(P.c.sky1)); gr.addColorStop(1, css(P.c.sky2));
        g.fillStyle = gr; g.fillRect(0, 0, W, ground + 2);
        if (n.stars > 0.02) {
            for (j = 0; j < 90; j++) {
                var tw = api.reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(amb * (1.5 + hash(j + 3)) + j * 2.1), sz = 0.8 + hash(j + 7) * 1.6;
                g.fillStyle = 'rgba(255, 255, 255, ' + (n.stars * tw * (0.45 + hash(j + 9) * 0.55)).toFixed(3) + ')';
                g.fillRect(hash(j) * W, hash(j + 50) * ground * 0.7, sz, sz);
            }
        }
        if (n.aurora > 0.02) {                             /* two ribbons of light that ripple slowly */
            var at = api.reducedMotion ? 0 : amb, ax = dist * 0.01;
            for (var r = 0; r < 2; r++) {
                var base = ground * (0.1 + r * 0.14), ph = r * 2.3;
                var top = function (xx) { return base + 26 * sc * Math.sin((xx + ax) / (170 * sc) + at * 0.35 + ph) + 10 * sc * Math.sin((xx + ax) / (61 * sc) - at * 0.6); };
                var ag = g.createLinearGradient(0, base - 40 * sc, 0, base + 120 * sc);
                ag.addColorStop(0, rgba(AURORA[r], 0)); ag.addColorStop(0.3, rgba(AURORA[r], 0.34 * n.aurora)); ag.addColorStop(1, rgba(AURORA[r], 0));
                g.fillStyle = ag;
                g.beginPath(); g.moveTo(-20, top(-20));
                for (x = 0; x <= W + 20; x += 20) g.lineTo(x, top(x));
                for (x = W + 20; x >= -20; x -= 20) g.lineTo(x, top(x) + (78 + 30 * Math.sin(x / (90 * sc) + at * 0.5 + ph)) * sc);
                g.closePath(); g.fill();
                g.strokeStyle = ag; g.lineWidth = 5 * sc;  /* soft curtain folds */
                g.globalAlpha = 0.22;
                g.beginPath();
                for (x = -((ax * 2) % (17 * sc)); x <= W; x += 17 * sc) {
                    var hh = (30 + 50 * hash(Math.floor((x + ax * 2) / (17 * sc)))) * sc;
                    g.moveTo(x, top(x) + 6 * sc); g.lineTo(x, top(x) + hh);
                }
                g.stroke();
                g.globalAlpha = 1;
            }
        }
        if (n.rainbow > 0.02) {
            var rx = W * 0.3, ry = ground * 1.04, R = Math.min(W * 0.55, ground * 0.72);
            g.lineWidth = 7 * sc;
            for (j = 0; j < RAINBOW.length; j++) {
                g.strokeStyle = rgba(RAINBOW[j], 0.3 * n.rainbow);
                g.beginPath(); g.arc(rx, ry, R - j * 7 * sc, Math.PI, TAU); g.stroke();
            }
        }
        if (n.sun > 0.02 && n.sunY < 1.15) {
            var sx = W * 0.74, sy = ground * n.sunY, sr = 24 * sc;
            var rg = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 5);
            rg.addColorStop(0, rgba(P.c.sun, 0.6 * n.sun)); rg.addColorStop(0.3, rgba(P.c.sun, 0.18 * n.sun)); rg.addColorStop(1, rgba(P.c.sun, 0));
            g.fillStyle = rg; g.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
            g.fillStyle = rgba(P.c.sun, n.sun);
            g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
        }
        if (n.moon > 0.02 && n.moonY < 1.1) {
            g.globalAlpha = Math.min(1, n.moon);
            g.drawImage(SP.moon.c, W * 0.24 - SP.moon.w / 2, ground * n.moonY - SP.moon.h / 2, SP.moon.w, SP.moon.h);
            g.globalAlpha = 1;
        }
        var cw = [1 - gt, gt], cl = [ga, gb], drift = dist * 0.015 + (api.reducedMotion ? 0 : amb * 7);
        for (j = 0; j < 6; j++) {                          /* high clouds */
            var span = W + 260 * sc, cx = ((hash(j + 11) * span - drift * (0.6 + j * 0.12)) % span + span) % span - 200 * sc;
            yy = ground * (0.06 + j * 0.065);
            for (var q = 0; q < 2; q++) {
                if (cw[q] < 0.004) continue;
                var s = SP.cloud[cl[q]][j % 2], f = 0.65 + hash(j + 5) * 0.55;
                g.globalAlpha = cw[q] * n.cloud * (0.75 + 0.25 * hash(j + 2));
                g.drawImage(s.c, cx, yy, s.w * f, s.h * f);
            }
        }
        g.globalAlpha = 1;
    }
    /* far landmarks and floating things: these fade between two lands over time */
    function far() {
        var wts = [Math.min(1, 2 * (1 - gt)), Math.min(1, 2 * gt)], lands = [ga, gb];
        for (var q = 0; q < 2; q++) {
            if (wts[q] < 0.004) continue;
            var land = lands[q], s = SP.strip[land], seg = ls + q;
            /* each visit to a land starts with its landmark to the right of the middle */
            var start = (seg * LAND - BLEND) * 40, x0 = W * 0.7 - LM * sc - (dist - start) * PAR[1];
            x0 = Math.round(((x0 % s.w) + s.w) % s.w - s.w);   /* whole pixels: no resampling of the big strips */
            g.globalAlpha = wts[q];
            for (var x = x0; x < W; x += s.w) g.drawImage(s.c, x, ground - s.h, s.w, s.h);
            if (land === 3 && !api.reducedMotion) {        /* the dragon breathes little clouds in its sleep */
                var nx = x0 + s.w + NOSE[0] * sc, ny = ground - s.h + NOSE[1] * sc;
                if (nx - s.w > -60 * sc) nx -= s.w;
                for (var j = 0; j < 3; j++) {
                    var t = (amb * 0.22 + j / 3) % 1;
                    g.fillStyle = 'rgba(255, 255, 255, ' + (0.55 * (1 - t) * wts[q]).toFixed(3) + ')';
                    g.beginPath(); g.arc(nx - t * 34 * sc, ny - t * 46 * sc, (3 + t * 13) * sc, 0, TAU); g.fill();
                }
            }
        }
        g.globalAlpha = 1;
        band(ground - SH * sc * 0.7, ground, P.c.haze, P.n.farHaze);
        /* layer 2: floating islands with waterfalls, lanterns, crystal shards, yarn balloons; then a bank of cloud */
        var S = 430 * sc, off = dist * PAR[2] + (api.reducedMotion ? 0 : amb * 5), bankY = ground - 205 * sc, w2 = [1 - gt, gt];
        for (var k = Math.floor((off - 200 * sc) / S); k * S - off < W + 200 * sc; k++) {
            var x = k * S + hash(k + 0.5) * S * 0.5 - off, yy = ground * 0.15 + hash(k + 0.7) * ground * 0.2;
            var bob = api.reducedMotion ? 0 : Math.sin(amb * 0.7 + k) * 4 * sc;
            if (yy > bankY - 150 * sc) yy = bankY - 150 * sc;
            for (q = 0; q < 2; q++) {
                land = lands[q];
                if (w2[q] < 0.004 || hash(k * 3.1 + land + 0.2) > 0.8) continue;
                var list = SP.l2[land], sp = list[Math.floor(hash(k * 5.3 + land) * list.length)];
                g.globalAlpha = w2[q];
                if (land === 1) {                          /* a few lanterns rising together */
                    for (j = 0; j < 3; j++) {
                        var f = 1.35 - j * 0.32, lx = x + (j - 1) * 46 * sc + hash(k + j) * 20 * sc;
                        var ly = yy + j * 30 * sc + (api.reducedMotion ? 0 : Math.sin(amb * 0.9 + k + j * 2) * 6 * sc);
                        g.drawImage(sp.c, lx - sp.ax * f, ly, sp.w * f, sp.h * f);
                    }
                    continue;
                }
                g.drawImage(sp.c, x - sp.ax, yy + bob, sp.w, sp.h);
                if (land === 0) waterfall(x + sp.wx, yy + bob + sp.wy, bankY + 40 * sc, w2[q]);
            }
        }
        g.globalAlpha = 1;
        var bx = -Math.round((dist * PAR[2] + (api.reducedMotion ? 0 : amb * 3)) % SP.bank[0].w);
        for (q = 0; q < 2; q++) {
            if (w2[q] < 0.004) continue;
            g.globalAlpha = w2[q] * LANDS[lands[q]].n.bank;
            for (x = bx; x < W; x += SP.bank[0].w) g.drawImage(SP.bank[lands[q]].c, x, bankY, SP.bank[0].w, SP.bank[0].h);
        }
        g.globalAlpha = 1;
    }
    function waterfall(x, y0, y1, a) {
        var w0 = 6 * sc, w1 = 11 * sc;
        g.fillStyle = vgrad(g, y0, y1, 'rgba(255, 255, 255, ' + (0.85 * a).toFixed(3) + ')', 'rgba(255, 255, 255, ' + (0.2 * a).toFixed(3) + ')');
        g.beginPath(); g.moveTo(x - w0 / 2, y0); g.lineTo(x + w0 / 2, y0); g.lineTo(x + w1 / 2, y1); g.lineTo(x - w1 / 2, y1); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(190, 225, 248, ' + (0.9 * a).toFixed(3) + ')'; g.lineWidth = 1.4 * sc;
        g.setLineDash([9 * sc, 13 * sc]); g.lineDashOffset = api.reducedMotion ? 0 : -amb * 80 * sc;
        g.beginPath(); g.moveTo(x - w0 * 0.2, y0 + 2); g.lineTo(x - w1 * 0.25, y1); g.moveTo(x + w0 * 0.25, y0 + 8); g.lineTo(x + w1 * 0.3, y1); g.stroke();
        g.setLineDash([]);
    }

    /* ---------- ambient life: paper cranes, fireflies, sparkles, dandelion seeds and petals ---------- */
    var motes = [], MAXM = api.reducedMotion ? 10 : 34, RATE = [0.3, 6, 4, 2.6];
    function addMote(land, anywhere) {
        if (motes.length >= MAXM) return;
        if (land === 0) { var n0 = 0; for (var j = 0; j < motes.length; j++) if (motes[j].land === 0) n0++; if (n0 >= 3) return; }
        var m = { land: land, t: 0, ph: Math.random() * TAU, s: 0.75 + Math.random() * 0.5, kind: Math.random() < 0.5 };
        m.x = anywhere ? Math.random() * W : W + 30 * sc;
        if (land === 0) { m.life = 60; m.y = ground * (0.08 + Math.random() * 0.26); m.vx = -18 - Math.random() * 16; m.vy = 0; m.par = 0.1; }
        else if (land === 1) { m.life = 3 + Math.random() * 4; m.y = ground - (24 + Math.random() * 190) * sc; m.vx = (Math.random() - 0.5) * 24; m.vy = 0; m.par = 0.45; if (!anywhere) m.x = Math.random() * (W + 120); }
        else if (land === 2) { m.life = 2.5 + Math.random() * 3; m.y = ground * (0.15 + Math.random() * 0.75); m.vx = 0; m.vy = -8 - Math.random() * 10; m.par = 0.3; if (!anywhere) m.x = Math.random() * (W + 120); }
        else { m.life = 14; m.y = ground * (0.15 + Math.random() * 0.65); m.vx = -22 - Math.random() * 26; m.vy = 6; m.par = 0.3; }
        if (api.reducedMotion) { m.vx *= 0.5; m.vy *= 0.5; }
        motes.push(m);
    }
    function updateMotes(dt) {
        var v = state === 'run' ? speed : 0, ws = [1 - gt, gt], ls2 = [ga, gb], q, j;
        if (!motes.length && amb < 0.1) { palette(); for (j = 0; j < 14; j++) addMote(ga, true); }
        for (q = 0; q < 2; q++) if (ws[q] > 0.004 && Math.random() < RATE[ls2[q]] * ws[q] * dt * (api.reducedMotion ? 0.3 : 1)) addMote(ls2[q], false);
        for (j = motes.length - 1; j >= 0; j--) {
            var m = motes[j];
            m.t += dt;
            m.x += (m.vx - v * m.par) * dt;
            m.y += m.vy * dt + (api.reducedMotion ? 0 : Math.sin(amb * 1.3 + m.ph) * (m.land === 1 ? 14 : 8) * dt);
            if (m.land === 1 && !api.reducedMotion) m.x += Math.cos(amb * 0.9 + m.ph) * 12 * dt;
            if (m.t > m.life || m.x < -40 * sc || m.y < -20) motes.splice(j, 1);
        }
    }
    function drawMotes(sky) {
        for (var j = 0; j < motes.length; j++) {
            var m = motes[j];
            if ((m.land === 0) !== sky) continue;
            var a = Math.min(1, m.t / 0.8, (m.life - m.t) / 0.8), s, f = 1;
            if (m.land === 0) { s = SP.crane; if (!api.reducedMotion) f = 0.75 + 0.25 * Math.sin(amb * 5 + m.ph); }
            else if (m.land === 1) { s = SP.fly; if (!api.reducedMotion) a *= 0.55 + 0.45 * Math.sin(amb * 5 + m.ph * 3); }
            else if (m.land === 2) { s = SP.spark; if (!api.reducedMotion) f = 0.7 + 0.3 * Math.sin(amb * 4 + m.ph); }
            else s = m.kind ? SP.seed : SP.petal;
            if (a <= 0.01) continue;
            g.globalAlpha = a;
            g.drawImage(s.c, m.x - s.w * m.s / 2, m.y - s.h * m.s * f / 2, s.w * m.s, s.h * m.s * f);
        }
        g.globalAlpha = 1;
    }

    /* ---------- drawing ---------- */
    function rr(x, y0, w, h, rad) {
        g.beginPath();
        g.moveTo(x + rad, y0); g.arcTo(x + w, y0, x + w, y0 + h, rad); g.arcTo(x + w, y0 + h, x, y0 + h, rad);
        g.arcTo(x, y0 + h, x, y0, rad); g.arcTo(x, y0, x + w, y0, rad); g.closePath();
    }
    function path() {                                      /* a calm mossy flagstone path */
        var c = P.c, x, row;
        g.fillStyle = vgrad(g, ground, H, css(c.path), css(c.path2));
        g.fillRect(0, ground, W, H - ground);
        for (var pass = 0; pass < 2; pass++) {
            g.fillStyle = css(pass ? c.stone : c.seam);
            g.globalAlpha = pass ? 1 : 0.55;
            for (row = 0; row < 2; row++) {
                var per = 62, o = dist + row * 31, y0 = ground + 15 + row * 22 + (pass ? 0 : 2), hh = row ? 11 : 13;
                for (var i2 = Math.floor(o / per); i2 * per - o < W; i2++) {
                    x = i2 * per - o;
                    rr(x, y0, per - 10 - hash(i2 * 2 + row) * 18, hh, hh / 2); g.fill();
                }
            }
        }
        g.globalAlpha = 1;
        g.fillStyle = css(c.moss);
        g.fillRect(0, ground - 2, W, 9);
        g.beginPath();
        var p9 = dist % 24;
        for (x = -p9; x < W + 24; x += 24) { g.moveTo(x, ground + 6); g.quadraticCurveTo(x + 6, ground + 15, x + 12, ground + 6); }
        g.fill();
        g.fillStyle = rgba(c.rim, 0.35);
        g.fillRect(0, ground - 2, W, 2);
    }
    function draw() {
        palette();
        sky();
        far();
        drawMotes(true);
        hills(3);
        band(ground - 150 * sc, ground, P.c.haze, 0.5);
        hills(4);
        drawMotes(false);
        band(ground - 90 * sc, ground, P.c.mist, 0.6);
        path();
        for (var k = 0; k < obs.length; k++) if (obs[k].on) drawObstacle(obs[k]);
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
        var f = P.n.night > 0.02 ? 'brightness(' + (1 - P.n.night * 0.2).toFixed(2) + ')' : '';
        if (f !== filt) { filt = f; cat.style.filter = f; }
    }
    function drawObstacle(o) {
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
        amb += dt;
        update(dt);
        updateFx(dt);
        updateMotes(dt);
        draw();
        place();
        if (state === 'over' && (overT += dt) > 1) stop();
    });
});
