/* Brick Paw: a paw bounces a yarn ball into pastel bricks. Six layouts that follow each other when cleared; some bricks
   take 2 or 3 hits, stone ones never break. Bricks drop power-ups (wider paw, three balls, sticky paw, slow ball,
   power ball, an extra life; on hard also a tiny paw). Score = points for bricks and levels.
   In dog mode the yarn ball is a tennis ball (same size and physics).
   Uses the shell API of assets/js/games/arcade.js. */
Arcade.register('brick-paw', function (api) {
    'use strict';
    api.css(
        '.bp { position: absolute; inset: 0; cursor: default; }' +
        '.bp canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.bp-hint { position: absolute; left: 50%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 16px;' +
        '  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .12); color: #1e3a8a; font-weight: 700; text-align: center;' +
        '  line-height: 1.45; white-space: pre-line; width: max-content; max-width: calc(100% - 32px); pointer-events: none; }' +
        '.bp-hint small { display: block; margin-top: 4px; color: #5b6b80; font-weight: 600; font-size: .82rem; }' +
        '.bp-hint[hidden] { display: none; }');

    /* layouts: 9 columns; 1, 2, 3 = bricks needing that many hits, # = stone (never breaks), * = a brick with a gift
       (always drops a power-up), . = gap. Original layouts. */
    var LEVELS = [
        { name: 'Warm-up', rows: ['111111111', '111111111', '11*111*11', '111111111', '111111111'] },
        { name: 'Diamond', rows: ['....1....', '...121...', '..12*21..', '.1223221.', '122333221', '.1223221.', '..12*21..', '...121...', '....1....'] },
        { name: 'Cat face', rows: ['2.......2', '22.....22', '222222222', '21#222#12', '222222222', '2222*2222', '.2211122.', '..22222..'] },
        { name: 'Stone walls', rows: ['333333333', '222222222', '#1#1*1#1#', '111111111', '1.#...#.1'] },
        { name: 'Paw print', rows: ['..22.22..', '..22.22..', '22.....22', '22.333.22', '..33333..', '.333*333.', '.3333333.', '..33333..'] },
        { name: 'Fortress', rows: ['#2222222#', '#2333332#', '#23*1*32#', '#2333332#', '#2222222#', '##1###1##', '.........', '111111111'] }
    ];
    /* dog mode (a dog look, data-pet="dog"): the paw is the chosen dog's, and the cat face becomes a dog face with floppy ears */
    var DOG = document.documentElement.dataset.pet === 'dog';
    if (DOG) LEVELS[2] = { name: 'Dog face', rows: ['..22222..', '332222233', '332#2#233', '332222233', '3.21112.3', '3.21*12.3', '..21112..', '...222...'] };
    var DOGPAW = (function () {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* golden */ }
        function v(name, dflt) { var x = cs && cs.getPropertyValue('--' + name).trim(); return x || dflt; }
        return { top: v('fur-top', '#f6d79a'), bot: v('fur-bot', '#dca456') };
    })();
    /* difficulty: lives, ball speed (share of the height per second), speed-up per brick and its cap, paw width
       (share of the field), chance that a brick drops a power-up, ball size, extra hits for tough bricks */
    var LV = {
        easy:   { lives: 5, speed: 0.42, ramp: 0.004, cap: 1.15, paw: 0.22,  drop: 0.2,  ball: 1.15, tough: -1 },
        normal: { lives: 3, speed: 0.5,  ramp: 0.006, cap: 1.3,  paw: 0.17,  drop: 0.13, ball: 1,    tough: 0 },
        hard:   { lives: 2, speed: 0.6,  ramp: 0.008, cap: 1.45, paw: 0.135, drop: 0.1,  ball: 0.9,  tough: 1 }
    };
    var LVL = api.level();
    var L = LV[LVL] || LV.normal;
    /* power-ups: label, colours, seconds it lasts (0 = at once), how often it drops */
    var POWERS = {
        wide:   { label: 'Wide',   fill: '#bfdbfe', edge: '#60a5fa', ink: '#1e3a8a', time: 14, weight: 3 },
        multi:  { label: 'x3',     fill: '#fbcfe8', edge: '#f472b6', ink: '#9d174d', time: 0,  weight: 3 },
        sticky: { label: 'Sticky', fill: '#bbf7d0', edge: '#4ade80', ink: '#166534', time: 14, weight: 2 },
        slow:   { label: 'Slow',   fill: '#ddd6fe', edge: '#a78bfa', ink: '#5b21b6', time: 10, weight: LVL === 'easy' ? 3 : 2 },
        power:  { label: 'Power',  fill: '#fed7aa', edge: '#fb923c', ink: '#9a3412', time: 7,  weight: 2 },
        life:   { label: '+1',     fill: '#fecdd3', edge: '#fb7185', ink: '#9f1239', time: 0,  weight: LVL === 'easy' ? 1.2 : 0.6 },
        tiny:   { label: 'Tiny',   fill: '#e2e8f0', edge: '#94a3b8', ink: '#334155', time: 10, weight: LVL === 'hard' ? 2 : 0 }
    };
    var FILL = ['#fbcfe8', '#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fed7aa', '#a5f3fc', '#fecdd3'];
    var EDGE = ['#f0a6c8', '#f5cf5c', '#86e0a8', '#8fbcf5', '#b9aef5', '#f9b77c', '#6fdcef', '#fca5b3'];
    var DEEP = ['#ec4899', '#d97706', '#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#e11d48'];
    var COLS = 9, MAXR = 10, STONE = 255, TAU = 6.2832;
    var wrap = document.createElement('div');
    wrap.className = 'bp';
    wrap.innerHTML = '<canvas></canvas><div class="bp-hint"></div>';
    api.el.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), hint = wrap.querySelector('.bp-hint');

    var W = 0, H = 0, fx = 0, fw = 0, top = 54, py = 0, bw = 0, bh = 0, gap = 6, bTop = 0, bg = null;
    var N = COLS * MAXR;
    var hp = new Uint8Array(N), maxhp = new Uint8Array(N), tint = new Uint8Array(N), gift = new Uint8Array(N);
    var fade = new Float32Array(N), flash = new Float32Array(N), rowsN = 0, left = 0;
    var px = 0, pw = 100, pwBase = 100, ph = 20, target = null, keyL = false, keyR = false;
    var balls = [], caps = [], parts = [], texts = [];
    var r = 8, speedUp = 1, lives = L.lives, score = 0, level = 0, state = 'ready', shake = 0;
    var on = { wide: 0, sticky: 0, slow: 0, power: 0, tiny: 0 };

    function fit(s) {
        var ofx = fx, ofw = fw, opy = py;
        W = s.w; H = s.h;
        fw = Math.min(W - 24, 760);
        fx = Math.round((W - fw) / 2);
        py = H - (fx + fw > W - 100 ? 92 : 44);            /* keep the paw above the cat in the corner */
        pwBase = Math.max(60, Math.min(180, fw * L.paw));
        r = Math.max(6, Math.min(9, fw / 80)) * L.ball;
        bw = (fw - gap * (COLS + 1)) / COLS;
        bh = Math.max(14, Math.min(26, bw * 0.42, (py - top - 32) * 0.5 / MAXR - gap));
        bTop = top + 32;
        if (ofw) {                                         /* keep paw and balls in place after a resize */
            px = fx + (px - ofx) / ofw * fw;
            balls.forEach(function (b) { b.x = fx + (b.x - ofx) / ofw * fw; b.y = b.y / opy * py; });
            caps.forEach(function (c) { c.x = fx + (c.x - ofx) / ofw * fw; });
        } else { px = fx + fw / 2; pw = pwBase; }
        clampPaddle();
        balls.forEach(function (b) { if (b.stuck) stickTo(b); });
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        hint.style.top = Math.min(py - 80, bTop + MAXR * (bh + gap) + 60) + 'px';
        drawField(dpr);
        draw(0);
    }
    /* the field: cream with soft dots, drawn once per resize */
    function drawField(dpr) {
        bg = bg || document.createElement('canvas');
        var p = 16, w = fw + p * 2, h = H - top + 20 + p;
        bg.width = Math.round(w * dpr); bg.height = Math.round(h * dpr);
        var c = bg.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, p * dpr, p * dpr);
        c.save();
        c.shadowColor = 'rgba(120, 72, 20, .14)'; c.shadowBlur = 16; c.shadowOffsetY = 4;
        c.fillStyle = '#fffaf1';
        rrc(c, 0, 0, fw, H - top + 20, 18); c.fill();
        c.restore();
        c.save();
        rrc(c, 0, 0, fw, H - top + 20, 18); c.clip();
        c.fillStyle = '#f9ecd6';
        for (var y = 14, row = 0; y < H - top; y += 26, row++) for (var x = 13 + (row & 1) * 13; x < fw; x += 26) {
            c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill();
        }
        c.restore();
        c.strokeStyle = '#f0dcbc'; c.lineWidth = 1.5;
        rrc(c, 0.75, 0.75, fw - 1.5, H - top + 20, 18); c.stroke();
    }
    function speed() { return H * L.speed * (1 + level * 0.05) * speedUp * (on.slow > 0 ? 0.7 : 1); }
    function clampPaddle() { px = Math.max(fx + pw / 2, Math.min(fx + fw - pw / 2, px)); }
    function stickTo(b) { b.x = Math.max(px - pw / 2, Math.min(px + pw / 2, px + b.off)); b.y = py - r - 1; }
    function newBall() { return { x: px, y: py - r - 1, vx: 0, vy: 0, stuck: true, off: 0, spin: 0, trail: [], hold: 0 }; }

    function build() {
        var rows = LEVELS[level].rows;
        rowsN = rows.length; left = 0;
        hp.fill(0); maxhp.fill(0); gift.fill(0); fade.fill(0); flash.fill(0);
        for (var y = 0; y < rowsN; y++) for (var x = 0; x < COLS; x++) {
            var ch = rows[y][x], k = y * COLS + x;
            if (ch === '.') continue;
            tint[k] = (y + level * 2) % FILL.length;
            if (ch === '#') { hp[k] = maxhp[k] = STONE; continue; }
            var n = ch === '*' ? 1 : +ch;
            if (L.tough < 0 && n === 3) n = 2;            /* easy: softer bricks */
            if (L.tough > 0 && (n === 2 || (n === 1 && y === 0))) n++;   /* hard: tougher ones */
            hp[k] = maxhp[k] = n;
            gift[k] = ch === '*' ? 1 : 0;
            left++;
        }
        speedUp = 1;
    }
    function ready(text) {
        state = 'ready';
        balls = [newBall()];
        caps = [];
        for (var p in on) on[p] = 0;
        hint.textContent = text + '\n' + (api.touch ? 'Drag to move, lift to launch' : 'Mouse or arrows: move the paw\nClick or space: launch');
        var small = document.createElement('small');
        small.textContent = 'Catch the falling gifts for power-ups';
        hint.appendChild(small);
        hint.hidden = false;
    }
    /* launch every ball resting on the paw; the angle follows where it sits */
    function launch() {
        if (state === 'over') return;
        var any = false, sp = speed();
        balls.forEach(function (b) {
            if (!b.stuck) return;
            var off = Math.max(-1, Math.min(1, b.off / (pw / 2))), a = state === 'ready' && Math.abs(off) < 0.05 ? (Math.random() - 0.5) * 0.8 : off * 1.0;
            b.vx = sp * Math.sin(a); b.vy = -sp * Math.cos(a);
            b.stuck = false; any = true;
        });
        if (!any) return;
        if (state === 'ready') { state = 'run'; hint.hidden = true; }
        api.sfx('jump');
    }

    /* ---------- physics: small sub-steps so a ball never skips a brick ---------- */
    function update(dt) {
        var tw = pwBase * (on.wide > 0 ? 1.5 : 1) * (on.tiny > 0 ? 0.62 : 1);
        pw += (tw - pw) * Math.min(1, dt * 10);            /* the paw grows and shrinks smoothly */
        if (keyL || keyR) {
            target = null;
            px += (keyR - keyL) * fw * 1.3 * dt;
        } else if (target !== null) px = target;
        clampPaddle();
        balls.forEach(function (b) { if (b.stuck) stickTo(b); });
        if (shake > 0) shake -= dt;
        if (state !== 'run') return;
        for (var p in on) if (on[p] > 0) on[p] = Math.max(0, on[p] - dt);
        var sp = speed(), n = Math.ceil(sp * dt / (r * 0.5));
        for (var i = 0; i < balls.length; i++) {
            var b = balls[i];
            if (b.stuck) {                                 /* a sticky paw lets go by itself after a while */
                if ((b.hold += dt) > 3) { b.hold = 0; launchOne(b); }
                continue;
            }
            var m = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;   /* follow speed changes (slow ball, speed-up) */
            b.vx *= sp / m; b.vy *= sp / m;
            b.spin += sp * dt / (r * 4);
            for (var j = 0; j < n && !b.gone && state === 'run'; j++) move(b, dt / n, sp);
            if (!api.reducedMotion) { b.trail.push(b.x, b.y); if (b.trail.length > 16) b.trail.splice(0, 2); }
        }
        if (state !== 'run') return;
        balls = balls.filter(function (b) { return !b.gone; });
        if (!balls.length) return lose();
        for (i = caps.length - 1; i >= 0; i--) {           /* falling power-ups */
            var c = caps[i];
            c.y += H * 0.24 * dt;
            if (c.y + 9 >= py && c.y - 9 <= py + ph && Math.abs(c.x - px) <= pw / 2 + 24) { caps.splice(i, 1); power(c); }
            else if (c.y > H + 20) caps.splice(i, 1);
        }
    }
    function launchOne(b) {
        var off = Math.max(-1, Math.min(1, b.off / (pw / 2))), sp = speed();
        b.vx = sp * Math.sin(off); b.vy = -sp * Math.cos(off); b.stuck = false;
        api.sfx('jump');
    }
    /* keep the ball from flying almost sideways forever */
    function steady(b, sp) {
        var m = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
        b.vx *= sp / m; b.vy *= sp / m;
        if (Math.abs(b.vy) < sp * 0.32) {
            b.vy = (b.vy < 0 ? -1 : 1) * sp * 0.32;
            b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(sp * sp - b.vy * b.vy);
        }
    }
    function move(b, t, sp) {
        b.x += b.vx * t; b.y += b.vy * t;
        if (b.x - r < fx) { b.x = fx + r; b.vx = Math.abs(b.vx); }
        if (b.x + r > fx + fw) { b.x = fx + fw - r; b.vx = -Math.abs(b.vx); }
        if (b.y - r < top) { b.y = top + r; b.vy = Math.abs(b.vy); }
        /* the paw: where the ball lands sets the angle, up to 60 degrees */
        if (b.vy > 0 && b.y + r >= py && b.y - r <= py + ph && b.x >= px - pw / 2 - r && b.x <= px + pw / 2 + r) {
            var off = Math.max(-1, Math.min(1, (b.x - px) / (pw / 2)));
            b.vx = sp * Math.sin(off * 1.05); b.vy = -sp * Math.cos(off * 1.05);
            b.y = py - r;
            if (on.sticky > 0) { b.stuck = true; b.off = b.x - px; b.hold = 0; api.sfx('move'); }
            else api.sfx('tap');
            puff(b.x, py, 4, '#fcd9a8');
        }
        if (b.y - r > H) { b.gone = true; return; }
        /* bricks near the ball */
        var c0 = Math.max(0, Math.floor((b.x - r - fx - gap) / (bw + gap))), c1 = Math.min(COLS - 1, Math.floor((b.x + r - fx - gap) / (bw + gap)));
        var r0 = Math.max(0, Math.floor((b.y - r - bTop) / (bh + gap))), r1 = Math.min(rowsN - 1, Math.floor((b.y + r - bTop) / (bh + gap)));
        for (var y = r0; y <= r1; y++) for (var x = c0; x <= c1; x++) {
            var k = y * COLS + x;
            if (!hp[k]) continue;
            var x0 = fx + gap + x * (bw + gap), y0 = bTop + y * (bh + gap);
            var dx = b.x - Math.max(x0, Math.min(x0 + bw, b.x)), dy = b.y - Math.max(y0, Math.min(y0 + bh, b.y));
            if (dx * dx + dy * dy >= r * r) continue;
            var pierce = on.power > 0 && hp[k] !== STONE;
            if (!pierce) {
                if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
                else b.vy = dy < 0 ? -Math.abs(b.vy) : Math.abs(b.vy);
                if (dx === 0 && dy === 0) b.vy = -b.vy;
                steady(b, sp);
            }
            hit(k, pierce);
            return;
        }
    }
    function brickX(k) { return fx + gap + (k % COLS) * (bw + gap); }
    function brickY(k) { return bTop + ((k / COLS) | 0) * (bh + gap); }
    function hit(k, smash) {
        var bx = brickX(k) + bw / 2, by = brickY(k) + bh / 2;
        if (hp[k] === STONE) { flash[k] = 1; api.sfx('move'); return; }
        hp[k] = smash ? 0 : hp[k] - 1;
        if (hp[k] > 0) {                                   /* a tough brick cracks */
            flash[k] = 1;
            add(2);
            api.sfx('tap');
            chips(bx, by, EDGE[tint[k]], 4);
            return;
        }
        fade[k] = api.reducedMotion ? 0 : 1;
        left--;
        add(10 * maxhp[k]);
        chips(bx, by, FILL[tint[k]], 10);
        speedUp = Math.min(L.cap, speedUp + L.ramp);
        if (gift[k] || Math.random() < L.drop) drop(bx, by);
        if (left > 0) { api.sfx('pop'); return; }
        add(50 * (level + 1));
        say(fx + fw / 2, bTop + 40, 'Level clear! +' + 50 * (level + 1), '#d6336c', true);
        level++;
        if (level === LEVELS.length) {
            add(100 * lives);
            state = 'over';
            api.say(DOG ? 'All clear, woof!' : 'All clear, purr!');
            api.end({ score: score, win: true, text: 'Every level cleared!\nScore: ' + score + ' (lives left: ' + lives + ')' });
            return;
        }
        api.sfx('point');
        api.cat('happy');
        api.say('Level ' + (level + 1) + '!');
        build();
        ready('Level ' + (level + 1) + ' of ' + LEVELS.length + ': ' + LEVELS[level].name);
    }
    function add(n) { score += n; api.score(score); }
    function say(x, y, s, c, big) {                        /* floating text, stacked above any that is still fresh */
        for (var i = 0; i < texts.length; i++) if (texts[i].t < 0.5 && Math.abs(texts[i].y0 - y) < 20) y -= 20;
        texts.push({ x: x, y: y, y0: y, s: s, c: c, t: 0, big: big });
    }
    function drop(x, y) {
        var total = 0, p;
        for (p in POWERS) total += POWERS[p].weight;
        var roll = Math.random() * total;
        for (p in POWERS) { roll -= POWERS[p].weight; if (roll <= 0) break; }
        caps.push({ x: x, y: y, type: p, t: 0 });
    }
    function power(c) {
        var P = POWERS[c.type];
        say(c.x, py - 26, P.label === 'x3' ? 'Three balls!' : P.label === '+1' ? 'Extra life!' : P.label + '!', P.ink);
        sparks(c.x, py - 6, P.edge, 12);
        if (c.type === 'tiny') { api.sfx('hit'); api.cat('sad'); on.tiny = P.time; on.wide = 0; return; }
        api.sfx('point');
        if (c.type === 'wide') { on.wide = P.time; on.tiny = 0; }
        else if (c.type === 'multi') {
            var add3 = [];
            balls.forEach(function (b) {
                if (balls.length + add3.length >= 9) return;
                var sp = speed(), a = Math.atan2(b.vx, -b.vy) || 0;
                if (b.stuck) { b.stuck = false; a = 0; }
                [-0.45, 0.45].forEach(function (d) {
                    add3.push({ x: b.x, y: b.y, vx: sp * Math.sin(a + d), vy: -sp * Math.abs(Math.cos(a + d)), stuck: false, off: 0, spin: 0, trail: [], hold: 0 });
                });
                b.vx = sp * Math.sin(a); b.vy = -sp * Math.abs(Math.cos(a));
            });
            balls = balls.concat(add3);
        }
        else if (c.type === 'sticky') on.sticky = P.time;
        else if (c.type === 'slow') on.slow = P.time;
        else if (c.type === 'power') on.power = P.time;
        else if (c.type === 'life') { lives = Math.min(lives + 1, 9); api.cat('happy'); }
    }
    function lose() {
        lives--;
        api.sfx('hit');
        shake = api.reducedMotion ? 0 : 0.3;
        if (lives > 0) {
            api.cat('sad');
            api.say(lives === 1 ? 'Last ball!' : DOG ? 'Oops, the ball!' : 'Oops, the yarn!');
            ready(lives + (lives === 1 ? ' ball left' : ' balls left'));
            return;
        }
        state = 'over';
        api.end({ score: score, win: false, text: (DOG ? 'Out of tennis balls!' : 'Out of yarn!') + '\nScore: ' + score + ', reached level ' + (level + 1) });
    }

    /* ---------- particles ---------- */
    function part(x, y, vx, vy, life, c, size, grav) {
        parts.push({ x: x, y: y, vx: vx, vy: vy, t: 0, life: life, c: c, s: size, g: grav, a: Math.random() * TAU });
        if (parts.length > 160) parts.shift();
    }
    function chips(x, y, c, n) {
        if (api.reducedMotion) return;
        for (var i = 0; i < n; i++) part(x + (Math.random() - 0.5) * bw * 0.6, y, (Math.random() - 0.5) * 260, -60 - Math.random() * 160, 0.7, c, 3 + Math.random() * 4, 700);
    }
    function sparks(x, y, c, n) {
        if (api.reducedMotion) return;
        for (var i = 0; i < n; i++) { var a = Math.random() * TAU, v = 80 + Math.random() * 140; part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.5, c, 2.5, 200); }
    }
    function puff(x, y, n, c) {
        if (api.reducedMotion) return;
        for (var i = 0; i < n; i++) part(x + (Math.random() - 0.5) * 20, y, (Math.random() - 0.5) * 80, -40 - Math.random() * 40, 0.35, c, 2.5, 0);
    }
    function updateFx(dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            p.t += dt;
            if (p.t >= p.life) { parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.a += dt * 6;
        }
        for (i = texts.length - 1; i >= 0; i--) if ((texts[i].t += dt) > 1.1) texts.splice(i, 1);
        for (var k = 0; k < N; k++) {
            if (fade[k] > 0 && !hp[k]) fade[k] = Math.max(0, fade[k] - dt * 5);
            if (flash[k] > 0) flash[k] = Math.max(0, flash[k] - dt * 4);
        }
    }

    /* ---------- drawing ---------- */
    function rrc(c, x, y, w, h, rad) {
        rad = Math.max(0, Math.min(rad, w / 2, h / 2));
        c.beginPath();
        c.moveTo(x + rad, y); c.arcTo(x + w, y, x + w, y + h, rad); c.arcTo(x + w, y + h, x, y + h, rad);
        c.arcTo(x, y + h, x, y, rad); c.arcTo(x, y, x + w, y, rad); c.closePath();
    }
    function rr(x, y, w, h, rad) { rrc(g, x, y, w, h, rad); }
    function draw(now) {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, W, H);
        g.save();
        if (shake > 0) g.translate((Math.random() - 0.5) * 10 * shake / 0.3, (Math.random() - 0.5) * 6 * shake / 0.3);
        if (bg) g.drawImage(bg, fx - 16, top - 16, fw + 32, H - top + 36);
        for (var k = 0; k < rowsN * COLS; k++) if (hp[k] || fade[k] > 0) drawBrick(k, now);
        for (k = 0; k < caps.length; k++) drawCap(caps[k], now);
        drawPaw(now);
        for (k = 0; k < balls.length; k++) drawBall(balls[k], now);
        drawFx();
        g.restore();
        drawHud();
    }
    function drawBrick(k, now) {
        var c = tint[k], f = hp[k] ? 1 : fade[k], stone = hp[k] === STONE;
        var w = bw * f, h = bh * f, x = brickX(k) + (bw - w) / 2, y = brickY(k) + (bh - h) / 2, rad = Math.min(7, h / 2);
        g.globalAlpha = f;
        g.fillStyle = 'rgba(120, 72, 20, .1)';             /* soft shadow */
        rr(x + 1, y + 3, w, h, rad); g.fill();
        if (stone) {
            g.fillStyle = '#a8b4c6';
            rr(x, y, w, h, rad); g.fill();
            g.fillStyle = '#cbd5e1';
            rr(x, y, w, h - 4, rad); g.fill();
            g.fillStyle = '#e2e8f0';
            g.fillRect(x + rad, y + 3, w - rad * 2, 2);
            g.fillStyle = '#94a3b8';                       /* rivets */
            g.beginPath(); g.arc(x + 7, y + h / 2 - 1, 2, 0, TAU); g.arc(x + w - 7, y + h / 2 - 1, 2, 0, TAU); g.fill();
        } else {
            var tough = maxhp[k] > 1;
            g.fillStyle = tough ? DEEP[c] : EDGE[c];
            g.globalAlpha = f * (tough ? 0.55 : 1);
            rr(x, y, w, h, rad); g.fill();
            g.globalAlpha = f;
            g.fillStyle = FILL[c];
            rr(x, y, w, h - (tough ? 5 : 4) * f, rad); g.fill();
            g.fillStyle = 'rgba(255, 255, 255, .5)';      /* a glossy top */
            rr(x + 4, y + 2, w - 8, Math.max(2, h * 0.22), Math.min(3, h * 0.11)); g.fill();
            if (gift[k] && hp[k]) {                        /* a gift: a ribbon cross and a bow */
                var gx = x + w / 2, gy = y + (h - 4) / 2;
                g.fillStyle = 'rgba(236, 72, 153, .75)';
                g.fillRect(gx - 2.5, y, 5, h - 4);
                g.fillRect(x, gy - 2, w, 4);
                g.fillStyle = '#ec4899';
                g.beginPath(); g.ellipse(gx - 5, gy - 1, 5, 3.2, -0.6, 0, TAU); g.fill();
                g.beginPath(); g.ellipse(gx + 5, gy - 1, 5, 3.2, 0.6, 0, TAU); g.fill();
                g.beginPath(); g.arc(gx, gy, 2.4, 0, TAU); g.fill();
            }
            if (tough && hp[k]) {
                g.fillStyle = 'rgba(255, 255, 255, .9)';  /* hits left as dots */
                for (var i = 0; i < hp[k]; i++) { g.beginPath(); g.arc(x + w / 2 + (i - (hp[k] - 1) / 2) * 9, y + h / 2 - 2, 2.6, 0, TAU); g.fill(); }
                if (hp[k] < maxhp[k]) {                    /* cracks once it was hit */
                    g.strokeStyle = 'rgba(59, 42, 30, .45)'; g.lineWidth = 1.2;
                    g.beginPath();
                    g.moveTo(x + w * 0.24, y + 1); g.lineTo(x + w * 0.3, y + h * 0.35); g.lineTo(x + w * 0.24, y + h * 0.6); g.lineTo(x + w * 0.31, y + h - 5);
                    if (maxhp[k] - hp[k] > 1) { g.moveTo(x + w * 0.76, y + h - 5); g.lineTo(x + w * 0.7, y + h * 0.55); g.lineTo(x + w * 0.77, y + h * 0.3); g.lineTo(x + w * 0.71, y + 1); }
                    g.stroke();
                }
            }
        }
        if (flash[k] > 0) {
            g.globalAlpha = flash[k] * 0.7;
            g.fillStyle = '#fff';
            rr(x, y, w, h, rad); g.fill();
        }
        g.globalAlpha = 1;
    }
    function drawCap(c, now) {
        var P = POWERS[c.type], w = 50, h = 20, x = c.x - w / 2, y = c.y - h / 2;
        var wob = api.reducedMotion ? 0 : Math.sin(now / 150 + c.x) * 0.08;
        g.save();
        g.translate(c.x, c.y); g.rotate(wob); g.translate(-c.x, -c.y);
        g.fillStyle = 'rgba(15, 23, 42, .12)';
        rr(x + 1, y + 3, w, h, 10); g.fill();
        g.fillStyle = P.fill; g.strokeStyle = P.edge; g.lineWidth = 2;
        rr(x, y, w, h, 10); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255, 255, 255, .6)';
        rr(x + 6, y + 3, w - 12, 4, 2); g.fill();
        g.font = '800 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = P.ink;
        g.fillText(P.label, c.x, c.y + 1);
        g.restore();
    }
    function drawPaw(now) {
        var x = px - pw / 2, glow = on.sticky > 0 ? '#86efac' : on.power > 0 ? '#fdba74' : null;
        g.fillStyle = 'rgba(120, 72, 20, .14)';            /* shadow */
        g.beginPath(); g.ellipse(px, py + ph + 5, pw * 0.48, 4, 0, 0, TAU); g.fill();
        if (glow) {
            g.fillStyle = glow;
            g.globalAlpha = 0.45 + (api.reducedMotion ? 0 : Math.sin(now / 160) * 0.15);
            rr(x - 4, py - 4, pw + 8, ph + 8, (ph + 8) / 2); g.fill();
            g.globalAlpha = 1;
        }
        var gr = g.createLinearGradient(0, py, 0, py + ph);
        gr.addColorStop(0, DOG ? DOGPAW.top : '#fbbf6a'); gr.addColorStop(1, DOG ? DOGPAW.bot : '#ef9a2e');
        g.fillStyle = gr; g.strokeStyle = '#3b2a1e'; g.lineWidth = 2;
        rr(x, py, pw, ph, ph / 2); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255, 255, 255, .35)';
        rr(x + ph / 2, py + 3, pw - ph, 3, 1.5); g.fill();
        if (!DOG) {
        g.strokeStyle = '#d9822b'; g.lineWidth = 1.5;     /* fur stripes at the ends */
        g.beginPath();
        g.moveTo(x + 8, py + 4); g.lineTo(x + 12, py + ph - 4);
        g.moveTo(x + pw - 8, py + 4); g.lineTo(x + pw - 12, py + ph - 4);
        g.stroke();
        }
        if (DOG) { g.fillStyle = '#4a3a32'; g.strokeStyle = '#2b2220'; } else { g.fillStyle = '#ffb3c4'; g.strokeStyle = '#e07a96'; }   /* dark dog pads */
        g.lineWidth = 1;
        var s = Math.min(1.25, pw / 100);
        g.beginPath(); g.ellipse(px, py + ph * 0.64, 11 * s, ph * 0.22, 0, 0, TAU); g.fill(); g.stroke();
        for (var i = 0; i < 4; i++) {                      /* four toe beans */
            var tx = px + (i - 1.5) * 10 * s, ty = py + ph * (i === 0 || i === 3 ? 0.36 : 0.27);
            g.beginPath(); g.ellipse(tx, ty, ph * 0.13 * s, ph * 0.15, 0, 0, TAU); g.fill(); g.stroke();
        }
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
    /* dog mode: a tennis ball instead of the wool, same size: a fuzzy yellow-green sphere with two white seams
       (orange while the power ball is on), cached like the wool */
    var TENNIS = {
        pink:   { base: '#d4e85a', light: '#f4ffb0', dark: '#8aa21c' },
        orange: { base: '#fbb04b', light: '#ffe6bf', dark: '#c2410c' }
    };
    function tennisImg(r, tone) {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        r = Math.max(3, Math.round(r * 2) / 2);
        var key = 't' + r + tone + dpr;
        if (woolCache[key]) return woolCache[key];
        var C = TENNIS[tone], S = Math.ceil(r * 3.8), o = S / 2, cvs = document.createElement('canvas');
        cvs.width = cvs.height = Math.ceil(S * dpr);
        var c = cvs.getContext('2d');
        c.scale(dpr, dpr);
        var gr = c.createRadialGradient(o - r * 0.4, o - r * 0.45, r * 0.1, o, o, r * 1.05);
        gr.addColorStop(0, C.light); gr.addColorStop(0.5, C.base); gr.addColorStop(1, C.dark);
        c.fillStyle = gr;
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.fill();
        c.save();
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.clip();
        c.strokeStyle = 'rgba(255, 255, 255, .92)'; c.lineWidth = Math.max(1, r * 0.14);
        c.beginPath(); c.arc(o - r * 1.3, o, r * 0.95, -1.2, 1.2); c.stroke();   /* the two seams */
        c.beginPath(); c.arc(o + r * 1.3, o, r * 0.95, Math.PI - 1.2, Math.PI + 1.2); c.stroke();
        c.restore();
        c.strokeStyle = C.dark; c.lineWidth = Math.max(0.8, r * 0.07);
        c.beginPath(); c.arc(o, o, r - c.lineWidth / 2, 0, TAU); c.stroke();
        woolCache[key] = { cv: cvs, s: S };
        return woolCache[key];
    }
    function wool(ctx, x, y, r, a, tone) {
        var w = (DOG ? tennisImg : woolImg)(r, tone || 'pink');
        ctx.save();
        ctx.translate(x, y); if (a) ctx.rotate(a);
        ctx.drawImage(w.cv, -w.s / 2, -w.s / 2, w.s, w.s);
        ctx.restore();
    }
    function yarn(x, y, rad, a, hot) { wool(g, x, y, rad, a, hot ? 'orange' : 'pink'); }
    function drawBall(b, now) {
        var hot = on.power > 0, t = b.trail;
        if (t.length > 4 && !b.stuck) {                    /* a loose thread behind the ball */
            g.lineCap = 'round'; g.lineJoin = 'round';
            g.strokeStyle = hot ? '#fb923c' : DOG ? '#b5cc3a' : '#e8739f';   /* a dog's tennis ball leaves a green streak */
            g.lineWidth = hot ? 3 : 2;
            for (var i = 2; i <= t.length; i += 2) {      /* fading towards the end */
                g.globalAlpha = 0.5 * i / t.length;
                g.beginPath(); g.moveTo(t[i - 2], t[i - 1]);
                if (i < t.length) g.lineTo(t[i], t[i + 1]); else g.lineTo(b.x, b.y);
                g.stroke();
            }
            g.globalAlpha = 1;
        }
        if (hot) {
            g.fillStyle = 'rgba(253, 186, 116, .45)';
            g.beginPath(); g.arc(b.x, b.y, r * 1.8, 0, TAU); g.fill();
        }
        yarn(b.x, b.y, r, api.reducedMotion ? 0 : b.spin, hot);
    }
    function drawFx() {
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            g.globalAlpha = 1 - p.t / p.life;
            g.fillStyle = p.c;
            g.save(); g.translate(p.x, p.y); g.rotate(p.a);
            g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.7);
            g.restore();
        }
        g.globalAlpha = 1;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (i = 0; i < texts.length; i++) {
            var t = texts[i], y = t.y - (api.reducedMotion ? 0 : t.t * 30);
            g.font = '800 ' + (t.big ? 20 : 14) + 'px system-ui, sans-serif';
            g.globalAlpha = Math.min(1, (1.1 - t.t) * 3);
            g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(t.s, t.x, y);
            g.fillStyle = t.c; g.fillText(t.s, t.x, y);
        }
        g.globalAlpha = 1;
    }
    /* lives as little balls, the active power-ups with their time, and the level, at the top */
    function drawHud() {
        g.font = '700 14px system-ui, sans-serif';
        g.fillStyle = '#64748b';
        g.textBaseline = 'middle';
        g.textAlign = 'right';
        var narrow = fw < 520;
        g.fillText((narrow ? 'Lv ' : 'Level ') + (level + 1) + ' of ' + LEVELS.length, fx + fw - 14, top + 14);
        var shown = Math.min(lives, 6);
        for (var i = 0; i < shown; i++) yarn(fx + 22 + i * 20, top + 14, 7, 0, false);
        if (lives > shown) { g.textAlign = 'left'; g.fillText('+' + (lives - shown), fx + 14 + shown * 20, top + 14); }
        var x = fx + 30 + Math.min(lives, 7) * 20, maxX = fx + fw - (narrow ? 78 : 104);
        for (var p in on) {
            if (on[p] <= 0) continue;
            var P = POWERS[p], w = 46;
            if (x + w > maxX) break;
            g.fillStyle = P.fill;
            rr(x, top + 5, w, 18, 9); g.fill();
            g.fillStyle = P.edge;
            rr(x, top + 5, w * on[p] / P.time, 18, 9); g.fill();
            g.font = '800 10px system-ui, sans-serif'; g.textAlign = 'center';
            g.fillStyle = P.ink;
            g.fillText(P.label, x + w / 2, top + 14.5);
            x += w + 6;
        }
    }

    /* ---------- input: pointer follows (mouse) or drags (touch), keys too ---------- */
    var dragging = false;
    function toX(e) { return e.clientX - wrap.getBoundingClientRect().left; }
    api.on(wrap, 'pointerdown', function (e) { dragging = true; target = toX(e); });
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
        if (a && (a.tagName === 'BUTTON' || a.tagName === 'SELECT')) a.blur();
        e.preventDefault();
    }
    api.on(document, 'keydown', function (e) { onKey(e, true); });
    api.on(document, 'keyup', function (e) { onKey(e, false); });

    build();
    ready('Level 1 of ' + LEVELS.length + ': ' + LEVELS[0].name);
    fit(api.size());
    api.onResize(fit);
    api.score(0);
    var overT = 0;
    var stop = api.loop(function (dt, now) {
        update(dt);
        updateFx(dt);
        draw(now);
        if (state === 'over' && (overT += dt) > 1.2) stop();
    });
});
