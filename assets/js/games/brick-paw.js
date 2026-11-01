/* Brick Paw: a paw bounces a yarn ball into rows of pastel bricks. Three levels, three lives; score = bricks cleared.
   Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('brick-paw', function (api) {
    'use strict';
    api.css(
        '.bp { position: absolute; inset: 0; cursor: default; }' +
        '.bp canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.bp-hint { position: absolute; left: 50%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.bp-hint[hidden] { display: none; }');

    /* levels: 9 columns, x = brick, . = gap (original layouts: rows, a diamond, a cat face) */
    var LEVELS = [
        ['xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx'],
        ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...'],
        ['x.......x', 'xx.....xx', 'xxxxxxxxx', 'xx.xxx.xx', 'xxxxxxxxx', 'xxxx.xxxx', '.xxxxxxx.', '..xxxxx..']
    ];
    var FILL = ['#fbcfe8', '#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fed7aa', '#a5f3fc', '#fecdd3'];
    var EDGE = ['#f0a6c8', '#f5cf5c', '#86e0a8', '#8fbcf5', '#b9aef5', '#f9b77c', '#6fdcef', '#fca5b3'];
    var COLS = 9, MAXR = 8;
    var wrap = document.createElement('div');
    wrap.className = 'bp';
    wrap.innerHTML = '<canvas></canvas><div class="bp-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.bp-hint');

    var W = 0, H = 0, fx = 0, fw = 0, top = 54, py = 0, bw = 0, bh = 0, gap = 6, bTop = 0;
    var bricks = new Uint8Array(COLS * MAXR), fade = new Float32Array(COLS * MAXR), was = new Uint8Array(COLS * MAXR), rowsN = 0, left = 0;
    var px = 0, pw = 100, ph = 18, target = null, keyL = false, keyR = false;
    var bx = 0, by = 0, vx = 0, vy = 0, r = 8, spin = 0, speedUp = 1;
    var lives = 3, cleared = 0, level = 0, state = 'ready';

    function fit(s) {
        var ofx = fx, ofw = fw, opy = py;
        W = s.w; H = s.h;
        fw = Math.min(W - 24, 760);
        fx = Math.round((W - fw) / 2);
        py = H - (fx + fw > W - 100 ? 92 : 44);            /* keep the paw above the cat in the corner */
        pw = Math.max(76, Math.min(130, fw * 0.17));
        r = Math.max(6, Math.min(9, fw / 80));
        bw = (fw - gap * (COLS + 1)) / COLS;
        bh = Math.max(16, Math.min(26, bw * 0.42));
        bTop = top + 32;
        if (ofw) {                                         /* keep paw and ball in place after a resize */
            px = fx + (px - ofx) / ofw * fw;
            bx = fx + (bx - ofx) / ofw * fw;
            by = by / opy * py;
        } else px = fx + fw / 2;
        clampPaddle();
        if (state === 'ready') stick();
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        hint.style.top = Math.min(py - 70, bTop + MAXR * (bh + gap) + 66) + 'px';
        draw();
    }
    function speed() { return H * (0.5 + level * 0.07) * speedUp; }
    function clampPaddle() { px = Math.max(fx + pw / 2, Math.min(fx + fw - pw / 2, px)); }
    function stick() { bx = px; by = py - r - 1; }

    function build() {
        var rows = LEVELS[level];
        rowsN = rows.length; left = 0;
        bricks.fill(0); fade.fill(0);
        for (var y = 0; y < rowsN; y++) for (var x = 0; x < COLS; x++) {
            if (rows[y][x] === 'x') { bricks[y * COLS + x] = 1 + (y + level * 2) % FILL.length; left++; }
        }
        speedUp = 1;
    }
    function ready(text) {
        state = 'ready';
        stick();
        hint.textContent = text + '\n' + (api.touch ? 'Drag to move, lift to launch' : 'Mouse or arrows: move the paw\nClick or space: launch');
        hint.hidden = false;
    }
    function launch() {
        if (state !== 'ready') return;
        state = 'run';
        hint.hidden = true;
        var a = (Math.random() - 0.5) * 0.8, sp = speed();
        vx = sp * Math.sin(a); vy = -sp * Math.cos(a);
        api.sfx('jump');
    }

    /* ---------- physics: small sub-steps so the ball never skips a brick ---------- */
    function update(dt) {
        if (keyL || keyR) {
            target = null;
            px += (keyR - keyL) * fw * 1.3 * dt;
        } else if (target !== null) px = target;
        clampPaddle();
        if (state === 'ready') { stick(); return; }
        if (state !== 'run') return;
        var sp = speed(), n = Math.ceil(sp * dt / (r * 0.5));
        spin += sp * dt / (r * 4);
        for (var i = 0; i < n && state === 'run'; i++) move(dt / n);
    }
    function move(t) {
        bx += vx * t; by += vy * t;
        if (bx - r < fx) { bx = fx + r; vx = Math.abs(vx); }
        if (bx + r > fx + fw) { bx = fx + fw - r; vx = -Math.abs(vx); }
        if (by - r < top) { by = top + r; vy = Math.abs(vy); }
        /* the paw: where the ball lands sets the angle, up to 60 degrees */
        if (vy > 0 && by + r >= py && by - r <= py + ph && bx >= px - pw / 2 - r && bx <= px + pw / 2 + r) {
            var off = Math.max(-1, Math.min(1, (bx - px) / (pw / 2))), sp = speed();
            vx = sp * Math.sin(off * 1.05); vy = -sp * Math.cos(off * 1.05);
            by = py - r;
            api.sfx('tap');
        }
        if (by - r > H) return lose();
        /* bricks near the ball */
        var c0 = Math.max(0, Math.floor((bx - r - fx - gap) / (bw + gap))), c1 = Math.min(COLS - 1, Math.floor((bx + r - fx - gap) / (bw + gap)));
        var r0 = Math.max(0, Math.floor((by - r - bTop) / (bh + gap))), r1 = Math.min(rowsN - 1, Math.floor((by + r - bTop) / (bh + gap)));
        for (var y = r0; y <= r1; y++) for (var x = c0; x <= c1; x++) {
            var k = y * COLS + x;
            if (!bricks[k]) continue;
            var x0 = fx + gap + x * (bw + gap), y0 = bTop + y * (bh + gap);
            var dx = bx - Math.max(x0, Math.min(x0 + bw, bx)), dy = by - Math.max(y0, Math.min(y0 + bh, by));
            if (dx * dx + dy * dy >= r * r) continue;
            if (Math.abs(dx) > Math.abs(dy)) vx = dx > 0 ? Math.abs(vx) : -Math.abs(vx);
            else vy = dy < 0 ? -Math.abs(vy) : Math.abs(vy);
            if (dx === 0 && dy === 0) vy = -vy;
            hit(k);
            return;
        }
    }
    function hit(k) {
        was[k] = bricks[k];                                /* remember the colour for the pop animation */
        fade[k] = api.reducedMotion ? 0 : 1;
        bricks[k] = 0;
        left--; cleared++;
        api.score(cleared, 'Bricks');
        speedUp = Math.min(1.3, speedUp + 0.006);
        var sp = speed(), m = Math.sqrt(vx * vx + vy * vy);
        vx *= sp / m; vy *= sp / m;
        if (left > 0) { api.sfx('pop'); return; }
        level++;
        if (level === LEVELS.length) {
            state = 'over';
            api.say('All clear, purr!');
            api.end({ score: cleared, win: true, text: 'Every brick cleared!\nBricks: ' + cleared + ', lives left: ' + lives });
            return;
        }
        api.sfx('point');
        api.cat('happy');
        api.say('Level ' + (level + 1) + '!');
        build();
        ready('Level ' + (level + 1));
    }
    function lose() {
        lives--;
        api.sfx('hit');
        if (lives > 0) {
            api.cat('sad');
            api.say(lives === 1 ? 'Last ball!' : 'Oops, the yarn!');
            ready(lives + ' balls left');
            return;
        }
        state = 'over';
        api.end({ score: cleared, win: false, text: 'Out of yarn!\nBricks cleared: ' + cleared });
    }

    /* ---------- drawing ---------- */
    function rr(x, y, w, h, rad) {
        g.beginPath();
        g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
        g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath();
    }
    function draw(dt) {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff';
        rr(fx, top, fw, H - top + 20, 18); g.fill();
        g.strokeStyle = '#e2e8f0'; g.lineWidth = 1; g.stroke();
        for (var k = 0; k < rowsN * COLS; k++) {
            var c = bricks[k], f = 1;
            if (!c && fade[k] > 0) {                       /* a broken brick shrinks away */
                c = was[k];
                f = fade[k];
                fade[k] = Math.max(0, f - (dt || 0) * 5);
            }
            if (!c) continue;
            var x = fx + gap + (k % COLS) * (bw + gap) + bw * (1 - f) / 2, y = bTop + ((k / COLS) | 0) * (bh + gap) + bh * (1 - f) / 2;
            g.globalAlpha = f;
            g.fillStyle = EDGE[c - 1];
            rr(x, y, bw * f, bh * f, 7); g.fill();
            g.fillStyle = FILL[c - 1];
            rr(x, y, bw * f, (bh - 4) * f, 7); g.fill();
        }
        g.globalAlpha = 1;
        drawPaw();
        drawBall();
        /* lives as little balls and the level, at the top */
        g.font = '700 14px system-ui, sans-serif';
        g.fillStyle = '#64748b';
        g.textBaseline = 'middle';
        g.textAlign = 'right';
        g.fillText('Level ' + (level + 1) + ' of ' + LEVELS.length, fx + fw - 14, top + 14);
        for (var i = 0; i < lives; i++) yarn(fx + 22 + i * 22, top + 14, 7, 0);
    }
    function drawPaw() {
        var x = px - pw / 2;
        g.fillStyle = '#f6a23a'; g.strokeStyle = '#3b2a1e'; g.lineWidth = 2;
        rr(x, py, pw, ph, ph / 2); g.fill(); g.stroke();
        g.fillStyle = '#ffaebf'; g.strokeStyle = '#e07a96'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(px, py + ph * 0.64, pw * 0.11, ph * 0.22, 0, 0, 6.2832); g.fill(); g.stroke();
        for (var i = 0; i < 4; i++) {                      /* four toe beans */
            var tx = px + (i - 1.5) * pw * 0.1, ty = py + ph * (i === 0 || i === 3 ? 0.36 : 0.27);
            g.beginPath(); g.ellipse(tx, ty, ph * 0.13, ph * 0.15, 0, 0, 6.2832); g.fill(); g.stroke();
        }
    }
    function yarn(x, y, rad, a) {
        g.save();
        g.translate(x, y); g.rotate(a);
        g.fillStyle = '#f48fb5'; g.strokeStyle = '#d6336c'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(0, 0, rad, 0, 6.2832); g.fill(); g.stroke();
        g.beginPath();                                     /* two wound strands */
        g.arc(-rad * 0.9, 0, rad * 1.05, -0.95, 0.95);
        g.moveTo(rad * 0.29, -rad * 0.85);
        g.arc(rad * 0.9, 0, rad * 1.05, 4.09, 2.19, true);
        g.stroke();
        g.restore();
    }
    function drawBall() { yarn(bx, by, r, api.reducedMotion ? 0 : spin); }

    /* ---------- input: pointer follows (mouse) or drags (touch), keys too ---------- */
    var dragging = false, downX = 0;
    function toX(e) { return e.clientX - wrap.getBoundingClientRect().left; }
    api.on(wrap, 'pointerdown', function (e) { dragging = true; downX = e.clientX; target = toX(e); });
    api.on(wrap, 'pointermove', function (e) { if (dragging || e.pointerType === 'mouse') target = toX(e); });
    api.on(window, 'pointerup', function () { if (dragging) launch(); dragging = false; });
    api.on(window, 'pointercancel', function () { dragging = false; });
    function onKey(e, down) {
        var k = e.code;
        if (k === 'ArrowLeft' || k === 'KeyA') keyL = down;
        else if (k === 'ArrowRight' || k === 'KeyD') keyR = down;
        else if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') { if (down && state !== 'over') launch(); }
        else return;
        if (state === 'over') return;
        var a = document.activeElement;                    /* space must not also press a focused button */
        if (a && a.tagName === 'BUTTON') a.blur();
        e.preventDefault();
    }
    api.on(document, 'keydown', function (e) { onKey(e, true); });
    api.on(document, 'keyup', function (e) { onKey(e, false); });

    build();
    ready('Clear the bricks');
    fit(api.size());
    api.onResize(fit);
    api.score(0, 'Bricks');
    var stop = api.loop(function (dt) {
        update(dt);
        draw(dt);
        if (state === 'over') stop();
    });
});
