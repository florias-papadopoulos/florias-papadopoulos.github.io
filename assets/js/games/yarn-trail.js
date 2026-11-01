/* Yarn Trail: the cat walks a grid, eats fish and leaves a growing yarn trail behind.
   Bumping into the trail or the wall ends the walk; score = fish eaten. Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('yarn-trail', function (api) {
    'use strict';
    api.css(
        '.yt { position: absolute; inset: 0; }' +
        '.yt canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.yt-hint { position: absolute; left: 50%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.yt-hint[hidden] { display: none; }' +
        '.yt-pad { position: absolute; left: 16px; bottom: 14px; display: grid; gap: 6px;' +
        '  grid-template: "a u b" 54px "l d r" 54px / 54px 54px 54px; }' +
        '.yt-pad button { border: none; border-radius: 16px; background: #fff; box-shadow: 0 4px 0 #e2e8f0; color: #1e3a8a;' +
        '  font-size: 20px; touch-action: none; }' +
        '.yt-pad button:active { transform: translateY(2px); box-shadow: 0 2px 0 #e2e8f0; }');

    var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          /* directions: 0 up, 1 right, 2 down, 3 left */
    var KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
    var wrap = document.createElement('div');
    wrap.className = 'yt';
    wrap.innerHTML = '<canvas></canvas><div class="yt-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.yt-hint');
    hint.textContent = (api.touch ? 'Swipe or use the arrows' : 'Arrow keys or WASD') + '\nEat fish, avoid your yarn\n' +
        (api.touch ? 'Tap to start' : 'Press a key to start');

    if (api.touch) {                                       /* on-screen arrows, bottom left (the cat sits bottom right) */
        var pad = document.createElement('div');
        pad.className = 'yt-pad';
        pad.innerHTML = '<button type="button" data-d="0" style="grid-area:u" aria-label="Up">&#9650;</button>' +
            '<button type="button" data-d="3" style="grid-area:l" aria-label="Left">&#9664;</button>' +
            '<button type="button" data-d="2" style="grid-area:d" aria-label="Down">&#9660;</button>' +
            '<button type="button" data-d="1" style="grid-area:r" aria-label="Right">&#9654;</button>';
        wrap.appendChild(pad);
        api.on(pad, 'pointerdown', function (e) {
            var b = e.target.closest('button');
            e.stopPropagation();
            e.preventDefault();
            if (b) turn(+b.dataset.d);
        });
    }

    var W = 0, H = 0, cols = 0, rows = 0, cell = 0, ox = 0, oy = 0;
    var body, occ, dir, queue, fish, eaten = 0, stepMs, acc = 0, state = 'ready', bg = null, dash = [4, 4];

    /* the grid size is fixed when the game starts; a resize only changes the cell size */
    function bottomSpace(w) { return api.touch ? 150 : (w < 700 ? 86 : 16); }
    function fit(s) {
        W = s.w; H = s.h;
        var aw = W - 24, ah = H - 16 - bottomSpace(W);
        if (!cols) {
            cols = Math.max(10, Math.min(22, Math.floor(aw / 30)));
            rows = Math.max(10, Math.min(26, Math.floor(ah / 30)));
        }
        cell = Math.max(8, Math.floor(Math.min(aw / cols, ah / rows)));
        ox = Math.round((W - cols * cell) / 2);
        oy = 8 + Math.round((ah - rows * cell) / 2);
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        dash = [cell * 0.16, cell * 0.2];
        hint.style.top = (oy + rows * cell * 0.27) + 'px';      /* above the cat, which starts in the middle */
        drawBoard(dpr);
        draw(performance.now());
    }
    /* the checkered board is drawn once per resize into its own canvas */
    function drawBoard(dpr) {
        bg = bg || document.createElement('canvas');
        var bw = cols * cell, bh = rows * cell, c = bg.getContext('2d');
        bg.width = Math.round(bw * dpr); bg.height = Math.round(bh * dpr);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.fillStyle = '#fff';
        rr(c, 0, 0, bw, bh, 14); c.fill();
        c.save(); rr(c, 0, 0, bw, bh, 14); c.clip();
        c.fillStyle = '#f1f5f9';
        for (var y = 0; y < rows; y++) for (var x = (y & 1); x < cols; x += 2) c.fillRect(x * cell, y * cell, cell, cell);
        c.restore();
    }
    function rr(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    function reset() {
        occ = new Uint8Array(cols * rows);
        var cy = rows >> 1, cx = cols >> 1;
        body = [cy * cols + cx, cy * cols + cx - 1, cy * cols + cx - 2];   /* head first */
        body.forEach(function (k) { occ[k] = 1; });
        dir = 1; queue = []; eaten = 0; stepMs = 150; acc = 0;
        placeFish();
        api.score(0, 'Fish');
    }
    /* a random free cell, not hidden under the cat in the corner */
    function placeFish() {
        function ok(k) {
            if (occ[k]) return false;
            var x = ox + (k % cols) * cell, y = oy + ((k / cols) | 0) * cell;
            return !(x + cell > W - 100 && y + cell > H - 84);
        }
        for (var t = 0; t < 300; t++) {
            var k = Math.floor(Math.random() * cols * rows);
            if (ok(k)) { fish = k; return; }
        }
        for (k = 0; k < cols * rows; k++) if (!occ[k]) { fish = k; return; }
        fish = -1;
    }

    function turn(d) {
        if (state === 'over') return;
        var last = queue.length ? queue[queue.length - 1] : dir;
        if (d !== last && d !== (last + 2) % 4 && queue.length < 2) queue.push(d);
        if (state === 'ready') begin();
    }
    function begin() {
        state = 'run';
        hint.hidden = true;
        api.sfx('tap');
    }
    function step() {
        if (queue.length) dir = queue.shift();
        var h = body[0], nx = h % cols + DX[dir], ny = ((h / cols) | 0) + DY[dir];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return crash('Bonk, the wall!');
        var n = ny * cols + nx, grow = n === fish;
        if (!grow) occ[body.pop()] = 0;                    /* the tail end moves away first */
        if (occ[n]) return crash('Tangled in yarn!');
        body.unshift(n);
        occ[n] = 1;
        if (!grow) return;
        eaten++;
        api.score(eaten, 'Fish');
        stepMs = Math.max(68, 150 - eaten * 2.6);          /* a little faster with every fish */
        if (eaten % 10 === 0) {
            api.sfx('point');
            api.cat('happy');
            api.say(['Yum, ' + eaten + ' fish!', 'So much yarn!', 'Purrfect!'][(eaten / 10) % 3]);
        } else {
            api.sfx('pop');
            if (eaten % 5 === 0) api.cat('wow');
        }
        placeFish();
        if (fish < 0) {
            state = 'over';
            api.end({ score: eaten, win: true, text: 'The whole board is yarn!\nFish eaten: ' + eaten });
        }
    }
    function crash(why) {
        state = 'over';
        api.sfx('hit');
        api.say(eaten ? 'Mrrow!' : 'Oops!');
        api.end({ score: eaten, win: false, text: why + '\nFish eaten: ' + eaten });
    }

    /* ---------- drawing ---------- */
    function cx(k) { return ox + (k % cols + 0.5) * cell; }
    function cy(k) { return oy + (((k / cols) | 0) + 0.5) * cell; }
    function draw(now) {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, W, H);
        if (!body) return;
        g.drawImage(bg, ox, oy, cols * cell, rows * cell);
        if (fish >= 0) drawFish(cx(fish), cy(fish) + (api.reducedMotion ? 0 : Math.sin(now / 260) * cell * 0.06));
        /* the yarn: a soft pink strand with a twisted thread on top */
        var tail = body[body.length - 1];
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(cx(body[0]), cy(body[0]));
        for (var i = 1; i < body.length; i++) g.lineTo(cx(body[i]), cy(body[i]));
        g.strokeStyle = '#e8739f'; g.lineWidth = cell * 0.42; g.stroke();
        g.strokeStyle = '#f9b4cd'; g.lineWidth = cell * 0.26; g.stroke();
        g.setLineDash(dash);
        g.strokeStyle = '#d6336c'; g.lineWidth = Math.max(1, cell * 0.06); g.stroke();
        g.setLineDash([]);
        drawBall(cx(tail), cy(tail));
        drawHead(cx(body[0]), cy(body[0]));
    }
    function drawBall(x, y) {
        var r = cell * 0.36;
        g.fillStyle = '#f48fb5';
        g.strokeStyle = '#d6336c';
        g.lineWidth = Math.max(1, cell * 0.05);
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); g.stroke();
        g.beginPath();
        g.arc(x - r * 0.9, y - r * 0.2, r * 1.1, -0.9, 0.9);
        g.moveTo(x + r * 0.2, y - r); g.arc(x + r * 1.3, y + r * 0.1, r * 1.6, 3.6, 2.6, true);
        g.stroke();
    }
    function drawFish(x, y) {
        var s = cell * 0.36;
        g.fillStyle = '#7fb2ea';
        g.strokeStyle = '#1e3a8a';
        g.lineWidth = Math.max(1, cell * 0.05);
        g.beginPath();
        g.moveTo(x + s, y);
        g.quadraticCurveTo(x, y - s * 0.95, x - s * 0.6, y);
        g.lineTo(x - s * 1.1, y - s * 0.55); g.lineTo(x - s * 1.05, y + s * 0.55); g.lineTo(x - s * 0.6, y);
        g.quadraticCurveTo(x, y + s * 0.95, x + s, y);
        g.fill(); g.stroke();
        g.fillStyle = '#1e3a8a';
        g.beginPath(); g.arc(x + s * 0.45, y - s * 0.12, Math.max(1, s * 0.12), 0, 6.2832); g.fill();
    }
    /* the cat's face, looking a little towards where it walks */
    function drawHead(x, y) {
        var s = cell * 0.5, lx = DX[dir] * s * 0.12, ly = DY[dir] * s * 0.12;
        g.lineWidth = Math.max(1, cell * 0.06);
        g.strokeStyle = '#3b2a1e';
        g.fillStyle = '#f6a23a';
        g.beginPath();                                     /* ears */
        g.moveTo(x - s * 0.85, y - s * 0.2); g.lineTo(x - s * 0.7, y - s * 1.05); g.lineTo(x - s * 0.15, y - s * 0.65);
        g.moveTo(x + s * 0.85, y - s * 0.2); g.lineTo(x + s * 0.7, y - s * 1.05); g.lineTo(x + s * 0.15, y - s * 0.65);
        g.fill(); g.stroke();
        g.beginPath(); g.ellipse(x, y, s * 0.92, s * 0.8, 0, 0, 6.2832); g.fill(); g.stroke();
        g.fillStyle = '#ffe9c9';
        g.beginPath(); g.ellipse(x + lx, y + s * 0.32 + ly, s * 0.42, s * 0.28, 0, 0, 6.2832); g.fill();
        g.fillStyle = '#1f1610';
        g.beginPath();
        g.ellipse(x - s * 0.36 + lx, y - s * 0.12 + ly, s * 0.1, s * 0.18, 0, 0, 6.2832);
        g.ellipse(x + s * 0.36 + lx, y - s * 0.12 + ly, s * 0.1, s * 0.18, 0, 0, 6.2832);
        g.fill();
        g.fillStyle = '#ff8fa3';
        g.beginPath(); g.arc(x + lx, y + s * 0.18 + ly, s * 0.1, 0, 6.2832); g.fill();
    }

    /* ---------- input ---------- */
    api.on(document, 'keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Escape' || e.key === 'Tab') return;
        var d = KEYS[e.code];
        if (d === undefined && state === 'ready' && !/^(Shift|Control|Alt|Meta)/.test(e.key)) {
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
            begin();
            return;
        }
        if (d === undefined) return;
        e.preventDefault();
        turn(d);
    });
    var sx = 0, sy = 0, swiping = false, swiped = false;
    api.on(wrap, 'pointerdown', function (e) { sx = e.clientX; sy = e.clientY; swiping = true; swiped = false; });
    api.on(wrap, 'pointermove', function (e) {
        if (!swiping) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
        turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
        sx = e.clientX; sy = e.clientY; swiped = true;     /* keep swiping without lifting the finger */
    });
    api.on(window, 'pointerup', function () {
        if (swiping && !swiped && state === 'ready') begin();
        swiping = false;
    });
    api.on(window, 'pointercancel', function () { swiping = false; });

    fit(api.size());
    reset();
    api.onResize(fit);
    var stop = api.loop(function (dt, now) {
        if (state === 'run') {
            acc += dt * 1000;
            while (acc >= stepMs && state === 'run') { acc -= stepMs; step(); }
        }
        draw(now);
        if (state === 'over') stop();
    });
});
