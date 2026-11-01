/* Cucumber Hop: the cat runs and jumps over cucumbers and boxes. It gets faster; score = distance.
   The runner is a copy of the corner cat (an SVG); the world is a canvas. Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('cucumber-hop', function (api) {
    'use strict';
    api.css(
        '.ch { position: absolute; inset: 0; overflow: hidden; }' +
        '.ch canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.ch .ch-cat { left: 0; top: 0; pointer-events: none; cursor: default; will-change: transform; }' +
        '.ch-hint { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.ch-hint[hidden] { display: none; }');

    var GRAV = 2800, JUMP = 900, HOLD = 0.18;             /* px/s^2, px/s, seconds of floaty rise while held */
    /* obstacles: w, h, and the score from which they may appear */
    var KINDS = [
        { w: 22, h: 48, from: 0, cuc: true },             /* standing cucumber */
        { w: 60, h: 20, from: 0, cuc: true },             /* lying cucumber */
        { w: 42, h: 40, from: 0 },                        /* box */
        { w: 42, h: 74, from: 120 },                      /* two boxes */
        { w: 88, h: 40, from: 250 }                       /* two boxes side by side */
    ];
    var wrap = document.createElement('div');
    wrap.className = 'ch';
    wrap.innerHTML = '<canvas></canvas><div class="ch-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.ch-hint');
    hint.textContent = (api.touch ? 'Tap' : 'Click, tap or press space') + ' to jump\nHold for a higher jump';

    /* the runner: a clone of the corner cat, posed with the classes of cat.css */
    var src = document.querySelector('.arcade .mascot svg');
    var cat = document.createElement('div');
    cat.className = 'cat ch-cat';
    cat.innerHTML = '<div class="cat-tilt"><div class="cat-flip"></div></div>';
    if (src) cat.querySelector('.cat-flip').appendChild(src.cloneNode(true));
    wrap.appendChild(cat);
    var RUN = api.reducedMotion ? 'cat ch-cat moving walk' : 'cat ch-cat moving run';

    var W = 0, H = 0, ground = 0, catX = 60, y = 0, vy = 0, onGround = true, held = false, holdT = 0, buffer = 0;
    var speed = 380, maxSpeed = 900, dist = 0, score = 0, gapLeft = 0, time = 0, state = 'ready', pose = '';
    var obs = [];
    for (var i = 0; i < 8; i++) obs.push({ on: false, x: 0, k: KINDS[0] });

    function fit(s) {
        W = s.w; H = s.h;
        ground = Math.round(H - Math.max(110, H * 0.22));  /* the corner cat sits below the ground line */
        catX = Math.round(Math.max(30, Math.min(140, W * 0.1)));
        maxSpeed = Math.max(620, Math.min(950, W * 0.9));
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
        place();
    }
    function setPose(p) { if (p !== pose) { pose = p; cat.className = p; } }
    function place() { cat.style.transform = 'translate(' + catX + 'px,' + (ground - 69 - y).toFixed(1) + 'px)'; }

    /* ---------- input: press to jump, hold for a little more height ---------- */
    function press() {
        if (state === 'over') return;
        held = true;
        if (state === 'ready') { state = 'run'; hint.hidden = true; gapLeft = W * 0.4; }   /* a short calm start */
        if (onGround) jump(); else buffer = 0.12;          /* a press just before landing still counts */
    }
    function release() { held = false; }
    function jump() {
        vy = JUMP; onGround = false; holdT = 0; buffer = 0;
        setPose('cat ch-cat moving jump');
        api.sfx('jump');
    }
    api.on(wrap, 'pointerdown', function (e) { e.preventDefault(); press(); });
    api.on(window, 'pointerup', release);
    api.on(window, 'pointercancel', release);
    function isJumpKey(e) { return e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'; }
    api.on(document, 'keydown', function (e) {
        if (!isJumpKey(e) || state === 'over') return;
        var a = document.activeElement;                    /* space must not also press a focused button */
        if (a && a.tagName === 'BUTTON') a.blur();
        e.preventDefault();
        if (!e.repeat) press();
    });
    api.on(document, 'keyup', function (e) { if (isJumpKey(e)) release(); });

    /* ---------- the run ---------- */
    function spawn() {
        var o = null;
        for (var j = 0; j < obs.length; j++) if (!obs[j].on) { o = obs[j]; break; }
        if (!o) return;
        var n = 0;
        for (j = 0; j < KINDS.length; j++) if (score >= KINDS[j].from) n++;
        o.k = KINDS[Math.floor(Math.random() * n)];
        o.x = W + 10;
        o.on = true;
        /* the next one leaves room to land and jump again */
        gapLeft = o.k.w + speed * (0.72 + Math.random() * 0.85) + 110;
    }
    function update(dt) {
        if (state !== 'run') return;
        time += dt;
        speed = Math.min(maxSpeed, 380 + time * 9);
        var dx = speed * dt;
        dist += dx;
        var s = Math.floor(dist / 40);
        if (s !== score) {
            score = s;
            api.score(score, 'Distance');
            if (score % 100 === 0) {
                api.sfx('point');
                if (score === 100 || score === 300 || score === 600 || score % 1000 === 0) {
                    api.cat('wow');
                    api.say(score >= 1000 ? 'Zoomies!' : score === 600 ? 'So fast!' : score === 300 ? 'Keep going!' : 'Nice hops!');
                }
            }
        }
        /* jump physics: lighter gravity while the button is held on the way up */
        if (!onGround) {
            holdT += dt;
            vy -= GRAV * (held && vy > 0 && holdT < HOLD ? 0.45 : 1) * dt;
            y += vy * dt;
            if (y <= 0) {
                y = 0; vy = 0; onGround = true;
                setPose(RUN);
                if (buffer > 0) jump();
            }
        }
        if (buffer > 0) buffer -= dt;
        gapLeft -= dx;
        if (gapLeft <= 0) spawn();
        /* the cat's body, a bit smaller than its picture */
        var l = catX + 22, r = catX + 72, b = ground - y - 4, t = ground - y - 50;
        for (var j = 0; j < obs.length; j++) {
            var o = obs[j];
            if (!o.on) continue;
            o.x -= dx;
            if (o.x + o.k.w < -20) { o.on = false; continue; }
            if (o.x + 4 < r && o.x + o.k.w - 4 > l && ground - o.k.h + 4 < b && ground > t) return crash(o);
        }
    }
    function crash(o) {
        state = 'over';
        setPose('cat ch-cat');
        cat.style.setProperty('--tilt', '-12deg');
        api.sfx('hit');
        api.say(o.k.cuc ? 'Eek, a cucumber!' : 'Ouch, a box!');
        api.end({ score: score, win: false, text: (o.k.cuc ? 'Startled by a cucumber!' : 'Bumped into a box!') + '\nDistance: ' + score });
    }

    /* ---------- drawing ---------- */
    function rr(x, y0, w, h, rad) {
        g.beginPath();
        g.moveTo(x + rad, y0); g.arcTo(x + w, y0, x + w, y0 + h, rad); g.arcTo(x + w, y0 + h, x, y0 + h, rad);
        g.arcTo(x, y0 + h, x, y0, rad); g.arcTo(x, y0, x + w, y0, rad); g.closePath();
    }
    function cloud(x, y0, s) {
        g.beginPath();
        g.arc(x, y0, 16 * s, 0, 6.2832); g.arc(x + 20 * s, y0 - 8 * s, 20 * s, 0, 6.2832); g.arc(x + 42 * s, y0, 15 * s, 0, 6.2832);
        g.fill();
    }
    function draw() {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, W, H);
        /* far clouds and soft hills, slower than the ground */
        g.fillStyle = '#eaf0f7';
        var c = dist * 0.06;
        for (var k = 0; k < 3; k++) {
            var span = W + 200;
            cloud((((k * 0.37 + 0.15) * span - c) % span + span) % span - 100, ground * (0.25 + k * 0.13), 1 - k * 0.15);
        }
        g.fillStyle = '#e6ecf4';
        g.beginPath();
        g.moveTo(0, ground);
        var h0 = dist * 0.2;
        for (var x = 0; x <= W + 20; x += 20) {
            g.lineTo(x, ground - 60 - 34 * Math.sin((x + h0) / 170) - 18 * Math.sin((x + h0) / 61));
        }
        g.lineTo(W, ground);
        g.fill();
        /* the ground and its moving pebbles */
        g.fillStyle = '#eef2f7';
        g.fillRect(0, ground, W, H - ground);
        g.strokeStyle = '#b4c3d6'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, ground + 1); g.lineTo(W, ground + 1); g.stroke();
        g.fillStyle = '#cbd5e1';
        var p = dist % 90;
        for (x = -p; x < W; x += 90) { g.fillRect(x, ground + 14, 14, 3); g.fillRect(x + 47, ground + 30, 8, 3); }
        for (k = 0; k < obs.length; k++) if (obs[k].on) drawObstacle(obs[k]);
        if (!src) {                                        /* fallback runner, if the corner cat is missing */
            g.fillStyle = '#f6a23a';
            rr(catX + 20, ground - y - 46, 56, 42, 18); g.fill();
        }
    }
    function drawObstacle(o) {
        var x = o.x, w = o.k.w, h = o.k.h, t = ground - h;
        g.lineWidth = 2;
        g.strokeStyle = '#3b2a1e';
        if (o.k.cuc) {
            g.fillStyle = '#7cc68d';
            rr(x, t, w, h, Math.min(w, h) / 2); g.fill(); g.stroke();
            g.fillStyle = '#b7e4c0';                       /* little bumps */
            for (var i = 1; i < 4; i++) {
                g.beginPath();
                if (w < h) g.arc(x + w / 2 + (i % 2 ? -3 : 3), t + h * i / 4, 2, 0, 6.2832);
                else g.arc(x + w * i / 4, t + h / 2 + (i % 2 ? -3 : 3), 2, 0, 6.2832);
                g.fill();
            }
            return;
        }
        for (var bx = x; bx < x + w - 1; bx += 46) {       /* boxes, 42 px wide, stacked to the height */
            for (var by = ground; by > t + 1; by -= 37) {
                var bh = Math.min(37, by - t);
                g.fillStyle = '#e8c39e';
                rr(bx, by - bh, 42, bh, 4); g.fill(); g.stroke();
                g.fillStyle = '#d6a77a';
                g.fillRect(bx + 17, by - bh + 1, 8, Math.min(10, bh - 2));
            }
        }
    }

    fit(api.size());
    api.onResize(fit);
    api.score(0, 'Distance');
    var stop = api.loop(function (dt) {
        update(dt);
        draw();
        place();
        if (state === 'over') stop();
    });
});
