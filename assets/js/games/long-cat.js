/* Long Cat: a cat walks a grid and eats fish, and every fish makes it longer: head in front,
   a striped furry body behind, back paws and a swishing tail at the end.
   Bumping into its own body, a houseplant or the wall ends the walk. Bonuses: golden fish (+3, gone after a few seconds),
   a mouse that runs away (+5) and catnip (slow motion, walk through yourself). Easy: the walls wrap around and there
   are no plants; hard: faster, more plants, a quicker mouse. In dog mode the dog eats bones instead (golden bones),
   chases a squirrel instead of the mouse and finds a squeaky toy instead of catnip, same cells and rules.
   Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('long-cat', function (api) {
    'use strict';
    api.css(
        '.yt { position: absolute; inset: 0; }' +
        '.yt canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.yt-hint { position: absolute; left: 50%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.yt-hint small { display: block; margin-top: 4px; color: #5b6b80; font-weight: 600; font-size: .82rem; }' +
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
    var DOG = document.documentElement.dataset.pet === 'dog';   /* dog mode: bones, a squirrel and a squeaky toy */
    var CRITTER = DOG ? 'squirrel' : 'mouse', NIP = DOG ? 'Squeaky toy' : 'Catnip';
    var SLOW = 1.8;                                        /* catnip: the world runs this many times slower */
    var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          /* directions: 0 up, 1 right, 2 down, 3 left */
    var KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
    var TAU = 6.2832;
    var wrap = document.createElement('div');
    wrap.className = 'yt';
    wrap.innerHTML = '<canvas></canvas><div class="yt-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.yt-hint');
    hint.textContent = (api.touch ? 'Swipe or use the arrows' : 'Arrow keys or WASD') + '\nEat ' + (DOG ? 'bones' : 'fish') + ' to grow, avoid your own tail' +
        (L.wrap ? '\nThe walls wrap around' : '\nMind the walls and houseplants') + '\n' + (api.touch ? 'Tap to start' : 'Press a key to start');
    var small = document.createElement('small');
    small.textContent = DOG ? 'Gold bone +3, squirrel +5, squeaky toy slows time' : 'Gold fish +3, mouse +5, catnip slows time';
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
        occ = new Uint8Array(cols * rows);                 /* cat pieces per cell (catnip lets them overlap) */
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
        if (occ[n] && nipT <= 0) return crash('Tangled in your own tail!');
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
                api.say(['Yum, ' + eaten + (DOG ? ' bones!' : ' fish!'), C.dog ? 'Such a long dog!' : 'Such a long cat!', C.dog ? 'Pawsome!' : 'Purrfect!'][(eaten / 10) % 3]);
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
            api.say('Got the ' + CRITTER + '!');
        }
        if (nip && n === nip.k) {
            nip = null;
            nipT = L.nip;
            burst(cx(n), cy(n), '#5fae74', 14);
            api.sfx('jump');
            api.cat('wow');
            api.say(NIP + '! Slow motion, walk through yourself');
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
            if (k >= 0) { mouse = { k: k, from: k, acc: 0, t: 16, face: 1 }; api.say('A ' + CRITTER + '!', 1400); }
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
                api.say('The ' + CRITTER + ' got away', 1400);
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
        api.end({ score: score, win: false, text: why + '\nScore: ' + score + ', ' + (DOG ? 'bones' : 'fish') + ': ' + eaten });
    }
    function win() {
        state = 'over';
        api.end({ score: score, win: true, text: 'The whole board is ' + (C.dog ? 'dog' : 'cat') + '!\nScore: ' + score });
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
        drawCat(now);
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
        if (DOG) return drawBone(x, y, fill, edge, size);
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
    /* dog mode: a bone in the fish's place, the same size; outlined first, then filled, so the knobs merge */
    function drawBone(x, y, fill, edge, size) {
        var s = cell * 0.36 * size;
        shadowAt(x, y + cell * 0.36, s * 0.7);
        if (fill === '#8ec0f0') { fill = '#fbf3e2'; edge = '#9a7b4f'; }   /* the plain bone is cream, the golden one stays gold */
        g.save(); g.translate(x, y); g.rotate(-0.35);
        g.beginPath();
        g.rect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.4);
        for (var i = -1; i <= 1; i += 2) for (var j = -1; j <= 1; j += 2) {
            g.moveTo(i * s * 0.78 + s * 0.27, j * s * 0.22); g.arc(i * s * 0.78, j * s * 0.22, s * 0.27, 0, TAU);
        }
        g.strokeStyle = edge; g.lineWidth = Math.max(2, cell * 0.1); g.lineJoin = 'round'; g.stroke();
        g.fillStyle = fill; g.fill();
        g.strokeStyle = 'rgba(255, 255, 255, .75)'; g.lineWidth = Math.max(1, cell * 0.04); g.lineCap = 'round';
        g.beginPath(); g.moveTo(-s * 0.45, -s * 0.06); g.lineTo(s * 0.4, -s * 0.06); g.stroke();   /* a shine on top */
        g.restore();
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
        if (DOG) return drawDuck(x, y, s, bob, part);
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
    /* dog mode: a yellow rubber duck squeaky toy in the catnip's place */
    function drawDuck(x, y, s, bob, part) {
        g.fillStyle = 'rgba(253, 230, 138, .35)';
        g.beginPath(); g.arc(x, y, cell * 0.48, 0, TAU); g.fill();
        g.lineWidth = Math.max(1, cell * 0.05); g.strokeStyle = '#b45309'; g.lineJoin = 'round';
        g.fillStyle = '#facc15';
        g.beginPath(); g.ellipse(x - s * 0.05, y + s * 0.3, s * 0.72, s * 0.42, 0, 0, TAU); g.fill(); g.stroke();   /* body */
        g.beginPath(); g.moveTo(x - s * 0.6, y + s * 0.1); g.lineTo(x - s * 0.95, y - s * 0.12); g.lineTo(x - s * 0.7, y + s * 0.35); g.fill();   /* tail tip */
        g.beginPath(); g.arc(x + s * 0.25, y - s * 0.3, s * 0.36, 0, TAU); g.fill(); g.stroke();   /* head */
        g.fillStyle = '#fb923c';
        g.beginPath(); g.moveTo(x + s * 0.55, y - s * 0.38); g.lineTo(x + s * 0.92, y - s * 0.24); g.lineTo(x + s * 0.55, y - s * 0.12); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#1f2937';
        g.beginPath(); g.arc(x + s * 0.32, y - s * 0.38, Math.max(1, s * 0.08), 0, TAU); g.fill();
        g.strokeStyle = '#eab308';                         /* a wing */
        g.beginPath(); g.arc(x - s * 0.1, y + s * 0.25, s * 0.28, 0.3, 2.6); g.stroke();
        sparkle(x - s * 0.7, y - s * 0.6, cell * 0.1, '#fffbeb');
        timerRing(x, y - bob, part, '#f59e0b');
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
        if (DOG) { drawSquirrel(x, y, s, d, now); g.globalAlpha = 1; return; }
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
    /* dog mode: a squirrel in the mouse's place, the same size: a big bushy tail curled up behind */
    function drawSquirrel(x, y, s, d, now) {
        var sw = api.reducedMotion ? 0 : Math.sin(now / 110) * s * 0.12;
        g.lineWidth = Math.max(1, cell * 0.05); g.strokeStyle = '#7c3f12'; g.lineJoin = 'round';
        g.fillStyle = '#d9822b';                           /* bushy tail */
        g.beginPath(); g.ellipse(x - d * s * 0.85, y - s * 0.35 + sw, s * 0.42, s * 0.72, d * 0.35, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#f3b46a';
        g.beginPath(); g.ellipse(x - d * s * 0.8, y - s * 0.4 + sw, s * 0.18, s * 0.45, d * 0.35, 0, TAU); g.fill();
        g.fillStyle = '#c96f22';                           /* body */
        g.beginPath(); g.ellipse(x, y + s * 0.15, s * 0.72, s * 0.55, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#f7d7a8';                           /* cream belly */
        g.beginPath(); g.ellipse(x + d * s * 0.2, y + s * 0.3, s * 0.32, s * 0.28, 0, 0, TAU); g.fill();
        g.fillStyle = '#c96f22';                           /* pointy ear */
        g.beginPath(); g.moveTo(x + d * s * 0.25, y - s * 0.3); g.lineTo(x + d * s * 0.35, y - s * 0.72); g.lineTo(x + d * s * 0.55, y - s * 0.28); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#1f2937';
        g.beginPath(); g.arc(x + d * s * 0.5, y - s * 0.02, Math.max(1, s * 0.1), 0, TAU); g.fill();
        g.beginPath(); g.arc(x + d * s * 0.8, y + s * 0.12, Math.max(1, s * 0.08), 0, TAU); g.fill();   /* nose */
    }
    /* ---------- the long cat: head in front, a furry striped body, back paws and a swishing tail at the end ---------- */
    /* colours of the chosen cat look (the CSS variables of cat.css), ginger if they are missing */
    var C = (function () {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* ginger */ }
        function v(name, dflt) { var s = cs && cs.getPropertyValue(name).trim(); return s || dflt; }
        return { fur: v('--fur-bot', '#f0932c'), light: v('--fur-top', '#ffc06e'), head: v('--head-top', '#ffc479'),
                 stripe: v('--stripe', '#cf7419'), cream: v('--cream', '#ffe9c9'), tail: v('--tail', '#f5a03c'),
                 iris: v('--iris', '#8ed383'), line: '#3b2a1e', ear: v('--ear', '#b97a33'), nose: v('--nose', '#2b2220'),
                 dog: document.documentElement.dataset.pet === 'dog' };   /* a dog look: a long dog instead */
    })();
    /* opaque blends of the fur with its lighter and darker tones (drawing twice at a joint must not change them) */
    function blend(a, b, t) {
        function rgb(h) {
            h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h) ? h.slice(1) : null;
            if (!h) return null;
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        }
        var x = rgb(a), y = rgb(b);
        if (!x || !y) return b;
        return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); }).join(',') + ')';
    }
    C.back = blend(C.fur, C.light, 0.5);
    C.belly = blend(C.fur, C.cream, 0.75);
    C.mark = blend(C.fur, C.stripe, 0.85);
    C.sock = blend(C.light, C.cream, 0.6);
    var BODY = 0.74, EDGE = 0.84;                           /* fur and outline width, in cells */
    /* the body as short straight pieces, head to tail; each starts on a cell centre (or one just past the edge),
       so the stripes stay put on the board while the cat glides */
    function pieces(f) {
        var segs = [], n = body.length, i, a, b, v;
        function seg(x, y, dx, dy, len) { segs.push([x, y, x + dx * len * cell, y + dy * len * cell]); }
        a = body[0]; b = body[1];
        v = vec(b, a);
        seg(cx(b), cy(b), v[0], v[1], f);                  /* the neck, growing towards the head */
        if (jump(a, b)) seg(cx(a) - v[0] * cell, cy(a) - v[1] * cell, v[0], v[1], f);
        for (i = 2; i < n; i++) {
            a = body[i - 1]; b = body[i];
            v = vec(b, a);
            seg(cx(b), cy(b), v[0], v[1], 1);
            if (jump(a, b)) seg(cx(a), cy(a), -v[0], -v[1], 1);   /* across the wrap: the other side too */
        }
        var t = body[n - 1];
        if (prevTail >= 0 && prevTail !== t && state === 'run') {
            v = vec(t, prevTail);                          /* the back end, still leaving the cell behind */
            seg(cx(t), cy(t), v[0], v[1], 1 - f);
        }
        return segs;
    }
    function trace(list, from, to, ox2, oy2) {
        g.beginPath();
        for (var i = from; i < to; i++) {
            var s = list[i];
            g.moveTo(s[0] + ox2, s[1] + oy2); g.lineTo(s[2] + ox2, s[3] + oy2);
        }
    }
    /* the fur, then its markings: a soft light back, a cream belly side and curved tabby stripes coming down
       from the back (the back is the upper left side, where the light comes from) */
    function fur(list, from, to, cap) {
        trace(list, from, to, 0, 0);
        g.lineCap = cap || 'round'; g.strokeStyle = C.fur; g.lineWidth = cell * BODY; g.stroke();
        g.lineCap = 'round';
    }
    function marks(list, from, to) {
        trace(list, from, to, -cell * 0.08, -cell * 0.1);
        g.strokeStyle = C.back; g.lineWidth = cell * 0.3; g.stroke();
        trace(list, from, to, cell * 0.13, cell * 0.15);
        g.strokeStyle = C.belly; g.lineWidth = cell * 0.17; g.stroke();
        if (C.dog) return;                                 /* a dog has no tabby stripes */
        g.beginPath();
        var hw = cell * BODY / 2;
        for (var i = from; i < to; i++) {
            var q = list[i], len = Math.abs(q[2] - q[0]) + Math.abs(q[3] - q[1]);
            if (len < 1) continue;
            var ux = (q[2] - q[0]) / len, uy = (q[3] - q[1]) / len, bx = -uy, by = ux;
            if (bx + by > 0) { bx = -bx; by = -by; }       /* the back side */
            var sx = q[2] > q[0] || q[3] > q[1] ? 1 : -1;  /* stripes lean the same way whichever way it was drawn */
            for (var k = 0; k < 2; k++) {
                var d = (k ? 0.72 : 0.28) * cell;
                if (d > len) break;
                var px2 = q[0] + ux * d, py2 = q[1] + uy * d;
                g.moveTo(px2 + bx * hw * 0.95, py2 + by * hw * 0.95);
                g.quadraticCurveTo(px2 + bx * hw * 0.2 + ux * sx * cell * 0.1, py2 + by * hw * 0.2 + uy * sx * cell * 0.1,
                    px2 - bx * hw * (k ? 0.2 : 0.55), py2 - by * hw * (k ? 0.2 : 0.55));
            }
        }
        g.strokeStyle = C.mark; g.lineWidth = Math.max(1.2, cell * 0.09); g.stroke();
    }
    function paw(x, y) {
        g.fillStyle = C.sock; g.strokeStyle = C.line; g.lineWidth = Math.max(1, cell * 0.045);
        g.beginPath(); g.ellipse(x, y, cell * 0.17, cell * 0.14, 0, 0, TAU); g.fill(); g.stroke();
    }
    function tail(x, y, ex, ey, now) {
        var px2 = -ey, py2 = ex, sw = api.reducedMotion ? 0.4 : Math.sin(now / 420);
        var k = 0.55 + 0.45 * sw, c = cell;
        var x0 = x + ex * c * 0.25, y0 = y + ey * c * 0.25;
        var x1 = x0 + ex * c * 0.55 + px2 * c * 0.12 * sw, y1 = y0 + ey * c * 0.55 + py2 * c * 0.12 * sw;
        var x2 = x0 + ex * c * 1.15 + px2 * c * 0.5 * k, y2 = y0 + ey * c * 1.15 + py2 * c * 0.5 * k;
        var x3 = x0 + ex * c * 0.85 + px2 * c * 0.9 * k, y3 = y0 + ey * c * 0.85 + py2 * c * 0.9 * k;
        function path() { g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x1, y1, x2, y2, x3, y3); }
        g.lineCap = 'round';
        path(); g.strokeStyle = nipT > 0 ? '#2f9e5b' : C.line; g.lineWidth = c * 0.34; g.stroke();
        path(); g.strokeStyle = C.tail; g.lineWidth = c * 0.24; g.stroke();
        if (C.dog) return;                                 /* a plain dog tail: no rings, no cream tip */
        path(); g.setLineDash([c * 0.09, c * 0.16]); g.strokeStyle = C.stripe; g.globalAlpha = 0.8; g.stroke();
        g.setLineDash([]); g.globalAlpha = 1;
        g.fillStyle = C.cream;                             /* the tip */
        g.beginPath(); g.arc(x3, y3, c * 0.11, 0, TAU); g.fill();
    }
    function drawCat(now) {
        var f = state === 'run' ? frac : 1, n = body.length, ghost = nipT > 0;
        var D = [DX[lastDir], DY[lastDir]];
        var hx = cx(body[0]) - D[0] * (1 - f) * cell, hy = cy(body[0]) - D[1] * (1 - f) * cell;
        var t = body[n - 1], ex, ey, tx = cx(t), ty = cy(t), e;
        if (prevTail >= 0 && prevTail !== t && state === 'run') {
            e = vec(t, prevTail);
            tx += e[0] * cell * (1 - f); ty += e[1] * cell * (1 - f);
        } else e = vec(body[n - 2], t);
        ex = e[0]; ey = e[1];                              /* pointing away from the body */
        var segs = pieces(f), m = segs.length, step0 = (steps + f) * 3.1416, walk = api.reducedMotion ? 0 : 1;
        g.lineJoin = 'round';
        trace(segs, 0, m, 0, cell * 0.09);                 /* shadow */
        g.lineCap = 'round'; g.strokeStyle = 'rgba(120, 72, 20, .15)'; g.lineWidth = cell * EDGE; g.stroke();
        tail(tx, ty, ex, ey, now);
        /* small groups from the tail to the head, so a body crossing itself (catnip) shows the newer part on top */
        for (var end = m, first = true; end > 0; end -= 4) {
            var from = Math.max(0, end - 4);
            trace(segs, from, end, 0, 0);
            g.lineCap = 'round'; g.strokeStyle = ghost ? '#2f9e5b' : C.line; g.lineWidth = cell * EDGE; g.stroke();
            var to = Math.min(m, end + 1);                 /* one piece more: mends the joint with the group before */
            fur(segs, from, end);
            if (to > end) fur(segs, end, to, 'butt');     /* square ends, so it does not cover the older markings */
            marks(segs, from, to);
            if (first) {                                   /* back paws on the last cell */
                first = false;
                var bs = Math.sin(step0) * cell * 0.08 * walk;
                paw(tx - ex * cell * 0.12 - ey * cell * 0.36 + ex * bs, ty - ey * cell * 0.12 + ex * cell * 0.36 + ey * bs);
                paw(tx - ex * cell * 0.12 + ey * cell * 0.36 - ex * bs, ty - ey * cell * 0.12 - ex * cell * 0.36 - ey * bs);
            }
        }
        var fs = Math.sin(step0 + 1.6) * cell * 0.08 * walk;       /* front paws just behind the head */
        var fx0 = hx - D[0] * cell * 0.42, fy0 = hy - D[1] * cell * 0.42;
        paw(fx0 - D[1] * cell * 0.36 + D[0] * fs, fy0 + D[0] * cell * 0.36 + D[1] * fs);
        paw(fx0 + D[1] * cell * 0.36 - D[0] * fs, fy0 - D[0] * cell * 0.36 - D[1] * fs);
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
    /* the cat's face, looking a little towards where it walks */
    function drawHead(x, y) {
        if (C.dog) return drawDogHead(x, y);
        var s = cell * 0.5, lx = DX[dir] * s * 0.12, ly = DY[dir] * s * 0.12;
        g.lineWidth = Math.max(1, cell * 0.06);
        g.strokeStyle = C.line;
        g.fillStyle = C.fur;
        g.beginPath();                                     /* ears */
        g.moveTo(x - s * 0.85, y - s * 0.2); g.lineTo(x - s * 0.7, y - s * 1.05); g.lineTo(x - s * 0.15, y - s * 0.65);
        g.moveTo(x + s * 0.85, y - s * 0.2); g.lineTo(x + s * 0.7, y - s * 1.05); g.lineTo(x + s * 0.15, y - s * 0.65);
        g.fill(); g.stroke();
        g.fillStyle = '#ffb3c4';
        g.beginPath();
        g.moveTo(x - s * 0.66, y - s * 0.4); g.lineTo(x - s * 0.62, y - s * 0.82); g.lineTo(x - s * 0.36, y - s * 0.6);
        g.moveTo(x + s * 0.66, y - s * 0.4); g.lineTo(x + s * 0.62, y - s * 0.82); g.lineTo(x + s * 0.36, y - s * 0.6);
        g.fill();
        var hg = g.createRadialGradient(x - s * 0.3, y - s * 0.35, s * 0.1, x, y, s);
        hg.addColorStop(0, C.head); hg.addColorStop(1, C.fur);
        g.fillStyle = hg;
        g.beginPath(); g.ellipse(x, y, s * 0.92, s * 0.8, 0, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = C.stripe;                          /* forehead stripes */
        g.beginPath();
        g.moveTo(x - s * 0.18, y - s * 0.74); g.lineTo(x - s * 0.12, y - s * 0.5);
        g.moveTo(x, y - s * 0.78); g.lineTo(x, y - s * 0.52);
        g.moveTo(x + s * 0.18, y - s * 0.74); g.lineTo(x + s * 0.12, y - s * 0.5);
        g.stroke();
        g.fillStyle = C.cream;
        g.beginPath(); g.ellipse(x + lx, y + s * 0.32 + ly, s * 0.42, s * 0.28, 0, 0, TAU); g.fill();
        g.fillStyle = C.iris;                              /* eyes: iris and a dark pupil */
        g.beginPath();
        g.ellipse(x - s * 0.36 + lx, y - s * 0.12 + ly, s * 0.15, s * 0.2, 0, 0, TAU);
        g.ellipse(x + s * 0.36 + lx, y - s * 0.12 + ly, s * 0.15, s * 0.2, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#1f1610';
        g.beginPath();
        g.ellipse(x - s * 0.36 + lx * 1.4, y - s * 0.12 + ly * 1.4, s * 0.075, s * 0.16, 0, 0, TAU);
        g.ellipse(x + s * 0.36 + lx * 1.4, y - s * 0.12 + ly * 1.4, s * 0.075, s * 0.16, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - s * 0.31 + lx, y - s * 0.2 + ly, s * 0.045, 0, TAU);
        g.arc(x + s * 0.41 + lx, y - s * 0.2 + ly, s * 0.045, 0, TAU);
        g.fill();
        g.fillStyle = '#ff8fa3';
        g.beginPath(); g.arc(x + lx, y + s * 0.18 + ly, s * 0.1, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255, 143, 163, .45)';          /* cheeks */
        g.beginPath();
        g.ellipse(x - s * 0.58 + lx, y + s * 0.2, s * 0.14, s * 0.08, 0, 0, TAU);
        g.ellipse(x + s * 0.58 + lx, y + s * 0.2, s * 0.14, s * 0.08, 0, 0, TAU);
        g.fill();
    }
    /* the dog's face in dog mode, the same size: floppy ears hanging down, a round cream snout, a dark nose, a small tongue */
    function drawDogHead(x, y) {
        var s = cell * 0.5, lx = DX[dir] * s * 0.12, ly = DY[dir] * s * 0.12;
        g.lineWidth = Math.max(1, cell * 0.06);
        g.strokeStyle = C.line;
        var hg = g.createRadialGradient(x - s * 0.3, y - s * 0.35, s * 0.1, x, y, s);
        hg.addColorStop(0, C.head); hg.addColorStop(1, C.fur);
        g.fillStyle = hg;
        g.beginPath(); g.ellipse(x, y, s * 0.88, s * 0.84, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = C.ear;                               /* floppy ears */
        [-1, 1].forEach(function (sd) {
            g.beginPath(); g.ellipse(x + sd * s * 0.8, y + s * 0.02, s * 0.24, s * 0.5, sd * 0.3, 0, TAU); g.fill(); g.stroke();
        });
        g.fillStyle = C.cream;                             /* the snout */
        g.beginPath(); g.ellipse(x + lx, y + s * 0.36 + ly, s * 0.44, s * 0.33, 0, 0, TAU); g.fill();
        g.fillStyle = '#ff7f96';                           /* tongue */
        g.beginPath(); g.ellipse(x + lx, y + s * 0.66 + ly, s * 0.11, s * 0.13, 0, 0, TAU); g.fill();
        g.fillStyle = C.iris;                              /* eyes: round, with a big dark pupil */
        g.beginPath();
        g.arc(x - s * 0.34 + lx, y - s * 0.14 + ly, s * 0.15, 0, TAU);
        g.arc(x + s * 0.34 + lx, y - s * 0.14 + ly, s * 0.15, 0, TAU);
        g.fill();
        g.fillStyle = '#1f1610';
        g.beginPath();
        g.arc(x - s * 0.34 + lx * 1.4, y - s * 0.14 + ly * 1.4, s * 0.1, 0, TAU);
        g.arc(x + s * 0.34 + lx * 1.4, y - s * 0.14 + ly * 1.4, s * 0.1, 0, TAU);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - s * 0.3 + lx, y - s * 0.2 + ly, s * 0.045, 0, TAU);
        g.arc(x + s * 0.38 + lx, y - s * 0.2 + ly, s * 0.045, 0, TAU);
        g.fill();
        g.fillStyle = C.nose;                              /* nose */
        g.beginPath(); g.ellipse(x + lx, y + s * 0.2 + ly, s * 0.17, s * 0.12, 0, 0, TAU); g.fill();
        g.strokeStyle = C.line; g.lineWidth = Math.max(1, cell * 0.04);   /* mouth */
        g.beginPath();
        g.moveTo(x + lx, y + s * 0.3 + ly); g.lineTo(x + lx, y + s * 0.44 + ly);
        g.moveTo(x - s * 0.16 + lx, y + s * 0.5 + ly); g.quadraticCurveTo(x + lx, y + s * 0.58 + ly, x + s * 0.16 + lx, y + s * 0.5 + ly);
        g.stroke();
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
        g.fillStyle = DOG ? '#fde68a' : '#86efac';
        rr(g, x + 3, y + 3, Math.max(6, (w - 6) * nipT / L.nip), h - 6, 7); g.fill();
        g.font = '700 11px system-ui, sans-serif';
        g.fillStyle = DOG ? '#92400e' : '#166534'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(NIP, x + w / 2, y + h / 2 + 0.5);
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
