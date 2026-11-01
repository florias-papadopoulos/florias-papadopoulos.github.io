/* Yarn Trail: the cat walks a grid, eats fish and leaves a growing yarn trail behind.
   Bumping into the trail, a houseplant or the wall ends the walk. Bonuses: golden fish (+3, gone after a few seconds),
   a mouse that runs away (+5) and catnip (slow motion, walk through your yarn). Easy: the walls wrap around and there
   are no plants; hard: faster, more plants, a quicker mouse. Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('yarn-trail', function (api) {
    'use strict';
    api.css(
        '.yt { position: absolute; inset: 0; }' +
        '.yt canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.yt-hint { position: absolute; left: 50%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.yt-hint small { display: block; margin-top: 4px; color: #64748b; font-weight: 600; font-size: .82rem; }' +
        '.yt-hint[hidden] { display: none; }' +
        '.yt-pad { position: absolute; left: 16px; bottom: 14px; display: grid; gap: 6px;' +
        '  grid-template: "a u b" 54px "l d r" 54px / 54px 54px 54px; }' +
        '.yt-pad button { border: none; border-radius: 16px; background: #fff; box-shadow: 0 4px 0 #e2e8f0; color: #1e3a8a;' +
        '  font-size: 20px; touch-action: none; }' +
        '.yt-pad button:active { transform: translateY(2px); box-shadow: 0 2px 0 #e2e8f0; }');

    /* difficulty: step ms at the start, fastest step, ms faster per fish, wrap-around walls, plants at the start,
       one more plant every n fish (up to max), seconds a golden fish stays, mouse step / cat step, catnip seconds */
    var LV = {
        easy:   { step: 205, min: 118, ramp: 1.5, wrap: true,  plants: 0, every: 0,  max: 0,  gold: 7, mouse: 2.3, nip: 6 },
        normal: { step: 155, min: 80,  ramp: 2.4, wrap: false, plants: 3, every: 10, max: 8,  gold: 5, mouse: 1.7, nip: 5 },
        hard:   { step: 122, min: 60,  ramp: 3.0, wrap: false, plants: 6, every: 6,  max: 15, gold: 4, mouse: 1.3, nip: 4 }
    };
    var L = LV[api.level()] || LV.normal;
    var SLOW = 1.8;                                        /* catnip: the world runs this many times slower */
    var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          /* directions: 0 up, 1 right, 2 down, 3 left */
    var KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
    var TAU = 6.2832;
    var wrap = document.createElement('div');
    wrap.className = 'yt';
    wrap.innerHTML = '<canvas></canvas><div class="yt-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.yt-hint');
    hint.textContent = (api.touch ? 'Swipe or use the arrows' : 'Arrow keys or WASD') + '\nEat fish, avoid your yarn' +
        (L.wrap ? '\nThe walls wrap around' : '\nMind the walls and houseplants') + '\n' + (api.touch ? 'Tap to start' : 'Press a key to start');
    var small = document.createElement('small');
    small.textContent = 'Gold fish +3, mouse +5, catnip slows time';
    hint.appendChild(small);

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

    var W = 0, H = 0, cols = 0, rows = 0, cell = 0, ox = 0, oy = 0, bg = null;
    var body, occ, plant, plants, dir, lastDir, queue, prevTail, grow, fish, gold, mouse, nip, nipT;
    var eaten = 0, score = 0, steps = 0, stepMs, acc = 0, frac = 1, state = 'ready', overT = 0, shake = 0;
    var parts = [], texts = [];

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
        hint.style.top = (oy + rows * cell * 0.27) + 'px';      /* above the cat, which starts in the middle */
        drawBoard(dpr);
        draw(performance.now());
    }
    /* the board (a cream rug with a soft shadow) is drawn once per resize into its own canvas */
    var PADB = 14;
    function drawBoard(dpr) {
        bg = bg || document.createElement('canvas');
        var bw = cols * cell, bh = rows * cell, c = bg.getContext('2d');
        bg.width = Math.round((bw + PADB * 2) * dpr); bg.height = Math.round((bh + PADB * 2) * dpr);
        c.setTransform(dpr, 0, 0, dpr, PADB * dpr, PADB * dpr);
        c.save();
        c.shadowColor = 'rgba(120, 72, 20, .16)'; c.shadowBlur = 14; c.shadowOffsetY = 5;
        c.fillStyle = '#fffaf1';
        rr(c, 0, 0, bw, bh, 14); c.fill();
        c.restore();
        c.save(); rr(c, 0, 0, bw, bh, 14); c.clip();
        c.fillStyle = '#fcf1e1';
        for (var y = 0; y < rows; y++) for (var x = (y & 1); x < cols; x += 2) c.fillRect(x * cell, y * cell, cell, cell);
        c.restore();
        c.lineWidth = 2;
        if (L.wrap) {                                      /* dashed blue edge: the walls let the cat through */
            c.strokeStyle = '#93c0ec';
            c.setLineDash([cell * 0.4, cell * 0.3]);
        } else c.strokeStyle = '#efd7b4';
        rr(c, 1, 1, bw - 2, bh - 2, 13); c.stroke();
        c.setLineDash([]);
    }
    function rr(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    /* ---------- the grid ---------- */
    function colOf(k) { return k % cols; }
    function rowOf(k) { return (k / cols) | 0; }
    function dist(a, b) {                                  /* steps between two cells, across the wrap on easy */
        var dx = Math.abs(colOf(a) - colOf(b)), dy = Math.abs(rowOf(a) - rowOf(b));
        if (L.wrap) { dx = Math.min(dx, cols - dx); dy = Math.min(dy, rows - dy); }
        return dx + dy;
    }
    function hidden(k) {                                   /* under the cat in the corner */
        var x = ox + colOf(k) * cell, y = oy + rowOf(k) * cell;
        return x + cell > W - 100 && y + cell > H - 84;
    }
    function taken(k) {
        return occ[k] || plant[k] || k === fish || (gold && k === gold.k) || (mouse && k === mouse.k) || (nip && k === nip.k);
    }
    /* a random free cell at least far steps from the cat's head */
    function freeCell(far) {
        for (var t = 0; t < 400; t++) {
            var k = Math.floor(Math.random() * cols * rows);
            if (!taken(k) && !hidden(k) && dist(k, body[0]) >= far) return k;
        }
        for (k = 0; k < cols * rows; k++) if (!taken(k) && !hidden(k)) return k;
        return -1;
    }
    /* a plant never on the border, never next to another plant (no dead ends), never just ahead of the cat */
    function plantOk(k, far) {
        var x = colOf(k), y = rowOf(k), h = body[0];
        if (x < 1 || y < 1 || x > cols - 2 || y > rows - 2 || taken(k) || hidden(k) || dist(k, h) < far) return false;
        for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) if (plant[(y + j) * cols + x + i]) return false;
        for (i = 1; i <= 6; i++) if (colOf(h) + DX[dir] * i === x && rowOf(h) + DY[dir] * i === y) return false;
        return true;
    }
    function addPlant(far, now) {
        for (var t = 0; t < 300; t++) {
            var k = Math.floor(Math.random() * cols * rows);
            if (plantOk(k, far)) { plant[k] = 1; plants.push({ k: k, at: now }); return true; }
        }
        return false;
    }

    function reset() {
        occ = new Uint8Array(cols * rows);                 /* yarn pieces per cell (catnip lets them overlap) */
        plant = new Uint8Array(cols * rows);
        plants = [];
        var cy0 = rows >> 1, cx0 = cols >> 1;
        body = [cy0 * cols + cx0, cy0 * cols + cx0 - 1, cy0 * cols + cx0 - 2];   /* head first */
        body.forEach(function (k) { occ[k] = 1; });
        dir = lastDir = 1; queue = []; prevTail = -1; grow = 0;
        eaten = 0; score = 0; steps = 0; stepMs = L.step; acc = 0; frac = 1;
        fish = -1; gold = null; mouse = null; nip = null; nipT = 0;
        for (var i = 0; i < L.plants; i++) {               /* not in the cat's row at the start */
            for (var t = 0; t < 50; t++) {
                var k = Math.floor(Math.random() * cols * rows);
                if (Math.abs(rowOf(k) - cy0) > 1 && plantOk(k, 4)) { plant[k] = 1; plants.push({ k: k, at: -1e9 }); break; }
            }
        }
        fish = freeCell(3);
        api.score(0);
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
        acc = stepMs;                                      /* the first step right away, so the cat does not jump back */
        api.sfx('tap');
    }
    function step() {
        if (queue.length) dir = queue.shift();
        var h = body[0], nx = colOf(h) + DX[dir], ny = rowOf(h) + DY[dir];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
            if (!L.wrap) return crash('Bonk, the wall!');
            nx = (nx + cols) % cols; ny = (ny + rows) % rows;
        }
        var n = ny * cols + nx;
        if (plant[n]) return crash('Oof, a houseplant!');
        var tail = body[body.length - 1];
        if (grow > 0) { grow--; prevTail = tail; }
        else { body.pop(); occ[tail]--; prevTail = tail; }    /* the tail end moves away first */
        if (occ[n] && nipT <= 0) return crash('Tangled in yarn!');
        lastDir = dir;
        body.unshift(n);
        occ[n]++;
        steps++;
        eat(n);
    }
    function add(points, k, color) {
        score += points;
        api.score(score);
        texts.push({ x: cx(k), y: cy(k) - cell * 0.4, s: '+' + points, c: color, t: 0 });
        burst(cx(k), cy(k), color, 6 + points * 2);
    }
    function eat(n) {
        if (n === fish) {
            eaten++;
            grow++;
            add(1, n, '#5b9be0');
            stepMs = Math.max(L.min, L.step - eaten * L.ramp);     /* a little faster with every fish */
            if (eaten % 10 === 0) {
                api.sfx('point');
                api.cat('happy');
                api.say(['Yum, ' + eaten + ' fish!', 'So much yarn!', 'Purrfect!'][(eaten / 10) % 3]);
            } else {
                api.sfx('pop');
                if (eaten % 5 === 0) api.cat('wow');
            }
            bonuses();
            fish = freeCell(3);
            if (fish < 0) return win();
        }
        if (gold && n === gold.k) {
            gold = null;
            grow++;
            add(3, n, '#e0a21b');
            api.sfx('point');
            api.cat('wow');
        }
        if (mouse && n === mouse.k) {
            mouse = null;
            grow += 2;
            add(5, n, '#8b93a7');
            api.sfx('win');
            api.cat('happy');
            api.say('Got the mouse!');
        }
        if (nip && n === nip.k) {
            nip = null;
            nipT = L.nip;
            burst(cx(n), cy(n), '#5fae74', 14);
            api.sfx('jump');
            api.cat('wow');
            api.say('Catnip! Slow motion, walk through yarn');
        }
    }
    /* new bonuses appear after eating a fish */
    function bonuses() {
        var now = performance.now();
        if (!gold && eaten >= 3 && Math.random() < 0.24) {
            var k = freeCell(5);
            if (k >= 0) gold = { k: k, t: L.gold, max: L.gold };
        }
        if (!mouse && eaten >= 5 && (eaten % 7 === 0 || Math.random() < 0.08)) {
            k = freeCell(8);
            if (k >= 0) { mouse = { k: k, from: k, acc: 0, t: 16, face: 1 }; api.say('A mouse!', 1400); }
        }
        if (!nip && nipT <= 0 && eaten >= 8 && Math.random() < 0.13) {
            k = freeCell(5);
            if (k >= 0) nip = { k: k, t: 9, max: 9 };
        }
        if (L.every && eaten % L.every === 0 && plants.length < L.max) addPlant(4, now);
    }
    /* the mouse wanders, and runs away once the cat comes close */
    function moveMouse() {
        var m = mouse, x = colOf(m.k), y = rowOf(m.k), opts = [], best = -1, d0 = dist(m.k, body[0]);
        for (var d = 0; d < 4; d++) {
            var nx = x + DX[d], ny = y + DY[d], k = ny * cols + nx;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || taken(k) || hidden(k)) continue;
            opts.push({ k: k, d: d, s: dist(k, body[0]) + Math.random() * 0.8 });
        }
        m.from = m.k;
        if (!opts.length) return;
        if (d0 > 6 || Math.random() < 0.18) best = Math.floor(Math.random() * opts.length);
        else for (var i = 0; i < opts.length; i++) if (best < 0 || opts[i].s > opts[best].s) best = i;
        m.k = opts[best].k;
        if (DX[opts[best].d]) m.face = DX[opts[best].d];
    }
    function timers(dt) {
        var slow = nipT > 0 ? SLOW : 1;
        if (nipT > 0) {
            nipT -= dt;
            if (nipT <= 0) { api.sfx('move'); }
        }
        if (gold && (gold.t -= dt / slow) <= 0) { burst(cx(gold.k), cy(gold.k), '#fcd34d', 8); gold = null; }
        if (nip && (nip.t -= dt / slow) <= 0) { burst(cx(nip.k), cy(nip.k), '#9bd5a8', 8); nip = null; }
        if (mouse) {
            mouse.t -= dt / slow;
            if (mouse.t <= 0) {
                burst(cx(mouse.k), cy(mouse.k), '#c7ccd6', 8);
                mouse = null;
                api.say('The mouse got away', 1400);
                return;
            }
            var ms = stepMs * L.mouse * slow;
            mouse.acc += dt * 1000;
            while (mouse.acc >= ms) { mouse.acc -= ms; moveMouse(); }
            mouse.f = Math.min(1, mouse.acc / ms);
        }
    }
    function crash(why) {
        state = 'over';
        shake = api.reducedMotion ? 0 : 0.35;
        burst(cx(body[0]), cy(body[0]), '#f6a23a', 16);
        api.sfx('hit');
        api.say(score ? 'Mrrow!' : 'Oops!');
        api.end({ score: score, win: false, text: why + '\nScore: ' + score + ', fish: ' + eaten });
    }
    function win() {
        state = 'over';
        api.end({ score: score, win: true, text: 'The whole board is yarn!\nScore: ' + score });
    }

    /* ---------- particles: little bursts and floating points ---------- */
    function burst(x, y, c, n) {
        if (api.reducedMotion) return;
        for (var i = 0; i < n; i++) {
            var a = Math.random() * TAU, v = cell * (1.6 + Math.random() * 3.2);
            parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.4 + Math.random() * 0.35,
                c: c, r: cell * (0.05 + Math.random() * 0.07) });
        }
        if (parts.length > 140) parts.splice(0, parts.length - 140);
    }
    function updateFx(dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            p.t += dt;
            if (p.t >= p.life) { parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 0.9; p.vy = p.vy * 0.9 + cell * 6 * dt;
        }
        for (i = texts.length - 1; i >= 0; i--) if ((texts[i].t += dt) > 0.9) texts.splice(i, 1);
        if (shake > 0) shake -= dt;
    }

    /* ---------- drawing ---------- */
    function cx(k) { return ox + (colOf(k) + 0.5) * cell; }
    function cy(k) { return oy + (rowOf(k) + 0.5) * cell; }
    function jump(a, b) { return Math.abs(colOf(a) - colOf(b)) > 1 || Math.abs(rowOf(a) - rowOf(b)) > 1; }
    function vec(a, b) {                                   /* one cell from a towards b, across the wrap if needed */
        var dx = colOf(b) - colOf(a), dy = rowOf(b) - rowOf(a);
        return [dx > 1 ? -1 : dx < -1 ? 1 : dx, dy > 1 ? -1 : dy < -1 ? 1 : dy];
    }
    function draw(now) {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, W, H);
        if (!body) return;
        g.save();
        if (shake > 0) g.translate((Math.random() - 0.5) * cell * 0.5 * shake / 0.35, (Math.random() - 0.5) * cell * 0.5 * shake / 0.35);
        g.drawImage(bg, ox - PADB, oy - PADB, cols * cell + PADB * 2, rows * cell + PADB * 2);
        var bob = api.reducedMotion ? 0 : Math.sin(now / 260) * cell * 0.06;
        g.save();
        rr(g, ox, oy, cols * cell, rows * cell, 14); g.clip();
        for (var i = 0; i < plants.length; i++) drawPlant(plants[i], now);
        if (fish >= 0) drawFish(cx(fish), cy(fish) + bob, '#8ec0f0', '#1e3a8a', 1);
        if (gold) drawGold(now, bob);
        if (nip) drawNip(now, bob);
        if (mouse) drawMouse(now);
        drawYarn(now);
        g.restore();
        drawFx();
        g.restore();
        if (nipT > 0) drawNipBar();
    }
    function timerRing(x, y, part, color) {
        g.strokeStyle = color; g.lineWidth = Math.max(1.5, cell * 0.07); g.lineCap = 'round';
        g.beginPath(); g.arc(x, y, cell * 0.5, -1.5708, -1.5708 + TAU * part); g.stroke();
    }
    function shadowAt(x, y, w) {
        g.fillStyle = 'rgba(120, 72, 20, .13)';
        g.beginPath(); g.ellipse(x, y, w, w * 0.32, 0, 0, TAU); g.fill();
    }
    function drawPlant(p, now) {
        var x = cx(p.k), y = cy(p.k), s = cell * 0.5, k = Math.min(1, (now - p.at) / 350);
        if (k < 1) s *= 0.4 + 0.6 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * 3.1416) * 0.15;
        shadowAt(x, y + s * 0.86, s * 0.62);
        g.lineWidth = Math.max(1, cell * 0.05); g.strokeStyle = '#3f6b4b';
        var sway = api.reducedMotion ? 0 : Math.sin(now / 700 + p.k) * 0.08;
        var leaves = [[-0.55, -0.35, -0.7], [0.55, -0.35, 0.7], [-0.2, -0.75, -0.25], [0.25, -0.8, 0.3], [0, -0.5, 0]];
        for (var i = 0; i < leaves.length; i++) {
            var l = leaves[i];
            g.fillStyle = i % 2 ? '#7cc68d' : '#5fae74';
            g.beginPath(); g.ellipse(x + l[0] * s, y + l[1] * s, s * 0.22, s * 0.48, l[2] + sway, 0, TAU); g.fill(); g.stroke();
        }
        g.strokeStyle = '#a5532f';
        g.fillStyle = '#ee9a6f';                           /* terracotta pot with a rim */
        g.beginPath();
        g.moveTo(x - s * 0.5, y); g.lineTo(x + s * 0.5, y); g.lineTo(x + s * 0.38, y + s * 0.85); g.lineTo(x - s * 0.38, y + s * 0.85);
        g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#f4b393';
        rr(g, x - s * 0.6, y - s * 0.12, s * 1.2, s * 0.28, s * 0.1); g.fill(); g.stroke();
    }
    function drawFish(x, y, fill, edge, size) {
        var s = cell * 0.36 * size;
        shadowAt(x, y + cell * 0.36, s * 0.7);
        g.fillStyle = fill;
        g.strokeStyle = edge;
        g.lineWidth = Math.max(1, cell * 0.05);
        g.beginPath();
        g.moveTo(x + s, y);
        g.quadraticCurveTo(x, y - s * 0.95, x - s * 0.6, y);
        g.lineTo(x - s * 1.1, y - s * 0.55); g.lineTo(x - s * 1.05, y + s * 0.55); g.lineTo(x - s * 0.6, y);
        g.quadraticCurveTo(x, y + s * 0.95, x + s, y);
        g.fill(); g.stroke();
        g.strokeStyle = 'rgba(255, 255, 255, .7)';         /* a shine on the back */
        g.beginPath(); g.arc(x + s * 0.05, y + s * 0.3, s * 0.55, -2.2, -1.1); g.stroke();
        g.fillStyle = edge;
        g.beginPath(); g.arc(x + s * 0.45, y - s * 0.12, Math.max(1, s * 0.12), 0, TAU); g.fill();
    }
    function drawGold(now, bob) {
        var x = cx(gold.k), y = cy(gold.k), part = gold.t / gold.max;
        if (part < 0.3 && !api.reducedMotion && Math.floor(now / 120) % 2) return;   /* blinks before it goes */
        g.fillStyle = 'rgba(253, 224, 71, .28)';
        g.beginPath(); g.arc(x, y, cell * (0.5 + (api.reducedMotion ? 0 : Math.sin(now / 180) * 0.05)), 0, TAU); g.fill();
        drawFish(x, y + bob, '#fcd34d', '#a16207', 1.1);
        sparkle(x + cell * 0.3, y - cell * 0.32, cell * 0.12 * (api.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(now / 150)), '#fff7cc');
        timerRing(x, y, part, '#f59e0b');
    }
    function drawNip(now, bob) {
        var x = cx(nip.k), y = cy(nip.k) + bob, s = cell * 0.4, part = nip.t / nip.max;
        if (part < 0.25 && !api.reducedMotion && Math.floor(now / 120) % 2) return;
        g.fillStyle = 'rgba(134, 239, 172, .3)';
        g.beginPath(); g.arc(x, y, cell * 0.48, 0, TAU); g.fill();
        g.lineWidth = Math.max(1, cell * 0.05); g.strokeStyle = '#2f6b45';
        for (var i = 0; i < 3; i++) {                      /* three catnip leaves */
            var a = -1.5708 + (i - 1) * 0.85;
            g.fillStyle = i === 1 ? '#6cc58a' : '#8fd6a3';
            g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.45, y + s * 0.15 + Math.sin(a) * s * 0.45, s * 0.24, s * 0.48, a + 1.5708, 0, TAU);
            g.fill(); g.stroke();
        }
        g.strokeStyle = '#2f6b45';
        g.beginPath(); g.moveTo(x, y + s * 0.2); g.lineTo(x, y + s * 0.75); g.stroke();
        sparkle(x - s * 0.7, y - s * 0.6, cell * 0.1, '#ecfccb');
        timerRing(x, y - bob, part, '#4ade80');
    }
    function sparkle(x, y, r, c) {
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(x, y - r * 2); g.quadraticCurveTo(x, y, x + r * 2, y); g.quadraticCurveTo(x, y, x, y + r * 2);
        g.quadraticCurveTo(x, y, x - r * 2, y); g.quadraticCurveTo(x, y, x, y - r * 2);
        g.fill();
    }
    function drawMouse(now) {
        var m = mouse, f = m.f || 0, v = vec(m.from, m.k);
        var x = cx(m.from) + v[0] * cell * f, y = cy(m.from) + v[1] * cell * f, s = cell * 0.44, d = m.face;
        if (m.t < 2.5 && !api.reducedMotion && Math.floor(now / 140) % 2) g.globalAlpha = 0.45;
        shadowAt(x, y + s * 0.7, s * 0.9);
        g.lineWidth = Math.max(1, cell * 0.05); g.strokeStyle = '#4b5263';
        g.beginPath();                                     /* tail */
        g.moveTo(x - d * s * 0.8, y + s * 0.2);
        g.quadraticCurveTo(x - d * s * 1.5, y + s * 0.1 + (api.reducedMotion ? 0 : Math.sin(now / 90) * s * 0.3), x - d * s * 1.3, y - s * 0.5);
        g.stroke();
        g.fillStyle = '#c9ced9';
        g.beginPath(); g.ellipse(x, y + s * 0.1, s * 0.9, s * 0.62, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#ffc2d1';                           /* ear and nose */
        g.beginPath(); g.arc(x + d * s * 0.2, y - s * 0.45, s * 0.3, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.arc(x + d * s * 0.92, y + s * 0.05, s * 0.12, 0, TAU); g.fill();
        g.fillStyle = '#1f2937';
        g.beginPath(); g.arc(x + d * s * 0.5, y - s * 0.05, Math.max(1, s * 0.1), 0, TAU); g.fill();
        g.globalAlpha = 1;
    }
    /* the yarn: a strand of plied wool (grooves of the twist, a soft sheen); the head and the tail glide between cells */
    function drawYarn(now) {
        var f = state === 'run' ? frac : 1, n = body.length, ghost = nipT > 0;
        var hx = cx(body[0]) - DX[lastDir] * (1 - f) * cell, hy = cy(body[0]) - DY[lastDir] * (1 - f) * cell;
        var tx = cx(body[n - 1]), ty = cy(body[n - 1]);
        if (prevTail >= 0 && prevTail !== body[n - 1] && state === 'run') {
            var tv = vec(body[n - 1], prevTail);
            tx += tv[0] * cell * (1 - f); ty += tv[1] * cell * (1 - f);
        }
        function strand(ox2, oy2) {
            g.beginPath();
            g.moveTo(hx + ox2, hy + oy2);
            for (var i = 1; i < n; i++) {
                var a = body[i - 1], b = body[i];
                if (jump(a, b)) {                          /* across the wrap: out of one side, in at the other */
                    var v = vec(a, b);
                    g.lineTo(cx(a) + v[0] * cell + ox2, cy(a) + v[1] * cell + oy2);
                    g.moveTo(cx(b) - v[0] * cell + ox2, cy(b) - v[1] * cell + oy2);
                }
                g.lineTo(cx(b) + ox2, cy(b) + oy2);
            }
            g.lineTo(tx + ox2, ty + oy2);
        }
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.save();
        if (ghost) g.globalAlpha = 0.55;
        strand(0, cell * 0.08);                            /* shadow */
        g.strokeStyle = 'rgba(120, 40, 70, .16)'; g.lineWidth = cell * 0.46; g.stroke();
        strand(0, 0);
        g.strokeStyle = '#c2255c'; g.lineWidth = cell * 0.42; g.stroke();
        g.strokeStyle = '#f783ac'; g.lineWidth = cell * 0.34; g.stroke();
        g.setLineDash([cell * 0.05, cell * 0.0928]);        /* the twist: seven grooves per cell, fixed on the board */
        g.lineDashOffset = -(steps + f) * cell;
        g.lineCap = 'butt';
        g.strokeStyle = 'rgba(166, 30, 77, .42)'; g.lineWidth = cell * 0.34; g.stroke();
        g.setLineDash([]);
        g.lineCap = 'round';
        strand(-cell * 0.035, -cell * 0.06);               /* soft sheen on the top left */
        g.strokeStyle = 'rgba(255, 214, 230, .75)'; g.lineWidth = Math.max(1, cell * 0.08); g.stroke();
        drawBall(tx, ty, (steps + f) * 0.9);
        g.restore();
        if (ghost) {                                       /* catnip glow around the head */
            var pulse = api.reducedMotion ? 0 : Math.sin(now / 120) * 0.06;
            var gr = g.createRadialGradient(hx, hy, cell * 0.2, hx, hy, cell * (0.9 + pulse));
            gr.addColorStop(0, 'rgba(134, 239, 172, .55)'); gr.addColorStop(1, 'rgba(134, 239, 172, 0)');
            g.fillStyle = gr;
            g.beginPath(); g.arc(hx, hy, cell * (0.9 + pulse), 0, TAU); g.fill();
        }
        shadowAt(hx, hy + cell * 0.42, cell * 0.36);
        drawHead(hx, hy);
    }
    /* a ball of wool: a shaded sphere, bands of wound strands clipped to it, a highlight and a loose thread.
       Drawn once per size and colour into a little canvas, then only rotated for the spin. */
    var WOOL = {
        pink:   { base: '#f783ac', light: '#ffd0e0', dark: '#c2255c', lo: 'rgba(255, 228, 238, .7)', hi: 'rgba(166, 30, 77, .38)' },
        orange: { base: '#fb9a4b', light: '#ffe0bf', dark: '#c2410c', lo: 'rgba(255, 237, 213, .7)', hi: 'rgba(154, 52, 18, .38)' }
    };
    var woolCache = {};
    function woolImg(r, tone) {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        r = Math.max(3, Math.round(r * 2) / 2);
        var key = r + tone + dpr;
        if (woolCache[key]) return woolCache[key];
        var C = WOOL[tone], S = Math.ceil(r * 3.8), o = S / 2, cvs = document.createElement('canvas');
        cvs.width = cvs.height = Math.ceil(S * dpr);
        var c = cvs.getContext('2d'), lw = r < 10 ? Math.max(0.9, r * 0.1) : Math.max(0.7, r * 0.04);
        c.scale(dpr, dpr);
        c.lineCap = 'round';
        c.strokeStyle = C.dark; c.lineWidth = Math.max(1, r * 0.09);   /* the loose thread, curling off */
        c.beginPath(); c.moveTo(o + r * 0.5, o + r * 0.8);
        c.bezierCurveTo(o + r * 0.9, o + r * 1.55, o + r * 1.75, o + r * 1.2, o + r * 1.45, o + r * 0.7);
        c.bezierCurveTo(o + r * 1.3, o + r * 0.45, o + r * 1.05, o + r * 0.6, o + r * 1.2, o + r * 0.85);
        c.stroke();
        var gr = c.createRadialGradient(o - r * 0.4, o - r * 0.45, r * 0.1, o, o, r * 1.05);
        gr.addColorStop(0, C.light); gr.addColorStop(0.45, C.base); gr.addColorStop(1, C.dark);
        c.fillStyle = gr;
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.fill();
        c.save();
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.clip();
        /* bands: tilt, how round the strands curve, where the band sits; each strand is the front half of an ellipse */
        var small = r < 10, bands = small ? [[0.5, 0.55, -0.25], [-1.0, 0.7, 0.2]] :
            [[0.45, 0.5, -0.35], [-1.05, 0.65, 0.15], [2.0, 0.45, -0.05], [3.6, 0.7, 0.4]];
        for (var b = 0; b < bands.length; b++) {
            var a = bands[b][0], k = bands[b][1], n = small ? 3 : 7, gapS = r * (small ? 0.2 : 0.075);
            var nx = -Math.sin(a), ny = Math.cos(a);       /* across the band */
            c.fillStyle = C.hi;                            /* a faint shade under the band */
            c.globalAlpha = 0.35;
            c.beginPath(); c.ellipse(o + nx * bands[b][2] * r, o + ny * bands[b][2] * r, r * 1.05, r * k + gapS * n / 2, a, 0, Math.PI);
            c.ellipse(o + nx * bands[b][2] * r, o + ny * bands[b][2] * r, r * 1.05, Math.max(0, r * k - gapS * n / 2), a, Math.PI, 0, true);
            c.fill();
            c.globalAlpha = 1;
            for (var i = 0; i < n; i++) {
                var d = (i - (n - 1) / 2) * gapS + bands[b][2] * r;
                c.strokeStyle = i % 2 ? C.hi : C.lo; c.lineWidth = lw;
                c.beginPath(); c.ellipse(o + nx * d, o + ny * d, r * 1.05, r * k, a, 0, Math.PI); c.stroke();
            }
        }
        var sh = c.createRadialGradient(o - r * 0.3, o - r * 0.35, r * 0.3, o, o, r);   /* round it off again */
        sh.addColorStop(0, 'rgba(255, 255, 255, 0)'); sh.addColorStop(0.7, 'rgba(0, 0, 0, 0)'); sh.addColorStop(1, 'rgba(90, 20, 50, .28)');
        c.fillStyle = sh;
        c.fillRect(o - r, o - r, r * 2, r * 2);
        c.restore();
        var hl = c.createRadialGradient(o - r * 0.42, o - r * 0.45, 0, o - r * 0.42, o - r * 0.45, r * 0.42);
        hl.addColorStop(0, 'rgba(255, 255, 255, .65)'); hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
        c.fillStyle = hl;
        c.beginPath(); c.arc(o - r * 0.42, o - r * 0.45, r * 0.42, 0, TAU); c.fill();
        c.strokeStyle = C.dark; c.lineWidth = Math.max(0.8, r * 0.07);
        c.beginPath(); c.arc(o, o, r - c.lineWidth / 2, 0, TAU); c.stroke();
        woolCache[key] = { cv: cvs, s: S };
        return woolCache[key];
    }
    function wool(ctx, x, y, r, a, tone) {
        var w = woolImg(r, tone || 'pink');
        ctx.save();
        ctx.translate(x, y); if (a) ctx.rotate(a);
        ctx.drawImage(w.cv, -w.s / 2, -w.s / 2, w.s, w.s);
        ctx.restore();
    }
    function drawBall(x, y, a) { wool(g, x, y, cell * 0.38, api.reducedMotion ? 0 : a, 'pink'); }
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
        g.fillStyle = '#ffb3c4';
        g.beginPath();
        g.moveTo(x - s * 0.66, y - s * 0.4); g.lineTo(x - s * 0.62, y - s * 0.82); g.lineTo(x - s * 0.36, y - s * 0.6);
        g.moveTo(x + s * 0.66, y - s * 0.4); g.lineTo(x + s * 0.62, y - s * 0.82); g.lineTo(x + s * 0.36, y - s * 0.6);
        g.fill();
        g.fillStyle = '#f6a23a';
        g.beginPath(); g.ellipse(x, y, s * 0.92, s * 0.8, 0, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = '#d9822b';                         /* forehead stripes */
        g.beginPath();
        g.moveTo(x - s * 0.18, y - s * 0.74); g.lineTo(x - s * 0.12, y - s * 0.5);
        g.moveTo(x + s * 0.18, y - s * 0.74); g.lineTo(x + s * 0.12, y - s * 0.5);
        g.stroke();
        g.fillStyle = '#ffe9c9';
        g.beginPath(); g.ellipse(x + lx, y + s * 0.32 + ly, s * 0.42, s * 0.28, 0, 0, TAU); g.fill();
        g.fillStyle = '#1f1610';
        g.beginPath();
        g.ellipse(x - s * 0.36 + lx, y - s * 0.12 + ly, s * 0.1, s * 0.18, 0, 0, TAU);
        g.ellipse(x + s * 0.36 + lx, y - s * 0.12 + ly, s * 0.1, s * 0.18, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - s * 0.33 + lx, y - s * 0.2 + ly, s * 0.04, 0, TAU);
        g.arc(x + s * 0.39 + lx, y - s * 0.2 + ly, s * 0.04, 0, TAU);
        g.fill();
        g.fillStyle = '#ff8fa3';
        g.beginPath(); g.arc(x + lx, y + s * 0.18 + ly, s * 0.1, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255, 143, 163, .45)';          /* cheeks */
        g.beginPath();
        g.ellipse(x - s * 0.58 + lx, y + s * 0.2, s * 0.14, s * 0.08, 0, 0, TAU);
        g.ellipse(x + s * 0.58 + lx, y + s * 0.2, s * 0.14, s * 0.08, 0, 0, TAU);
        g.fill();
    }
    function drawFx() {
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            g.globalAlpha = 1 - p.t / p.life;
            g.fillStyle = p.c;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        g.font = '800 ' + Math.round(Math.max(12, cell * 0.6)) + 'px system-ui, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.lineJoin = 'round'; g.strokeStyle = '#fff';
        for (i = 0; i < texts.length; i++) {
            var t = texts[i], y = t.y - (api.reducedMotion ? 0 : t.t * cell * 1.2);
            g.globalAlpha = Math.min(1, (0.9 - t.t) * 3);
            g.strokeText(t.s, t.x, y);
            g.fillStyle = t.c; g.fillText(t.s, t.x, y);
        }
        g.globalAlpha = 1;
    }
    function drawNipBar() {                                /* catnip time left, a pill at the top of the board */
        var w = Math.min(150, cols * cell * 0.5), h = 20, x = ox + (cols * cell - w) / 2, y = oy + 8;
        g.fillStyle = 'rgba(255, 255, 255, .92)';
        rr(g, x, y, w, h, 10); g.fill();
        g.fillStyle = '#86efac';
        rr(g, x + 3, y + 3, Math.max(6, (w - 6) * nipT / L.nip), h - 6, 7); g.fill();
        g.font = '700 11px system-ui, sans-serif';
        g.fillStyle = '#166534'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('Catnip', x + w / 2, y + h / 2 + 0.5);
    }

    /* ---------- input ---------- */
    api.on(document, 'keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Escape' || e.key === 'Tab') return;
        var d = KEYS[e.code];
        if (d === undefined && state === 'ready' && !/^(Shift|Control|Alt|Meta)/.test(e.key)) {
            var a = document.activeElement;
            if (a && (a.tagName === 'BUTTON' || a.tagName === 'SELECT')) return;
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
            var eff = stepMs * (nipT > 0 ? SLOW : 1);
            acc += dt * 1000;
            while (acc >= eff && state === 'run') { acc -= eff; step(); eff = stepMs * (nipT > 0 ? SLOW : 1); }
            if (state === 'run') { frac = Math.min(1, acc / eff); timers(dt); }
        } else if (state === 'over') overT += dt;
        updateFx(dt);
        draw(now);
        if (state === 'over' && overT > 1.2) stop();
    });
});
