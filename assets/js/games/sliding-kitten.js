/* Sliding Kitten: the classic sliding tile puzzle with a picture of the cat in a cosy room (drawn on a canvas,
   the cat itself is the one from the corner). 3x3 on easy, 4x4 on normal, 5x5 on hard. The shuffle is a random
   arrangement fixed up to be solvable. Tapping a tile in the gap's row or column slides the whole line.
   Hold "Peek" (or P) to see the whole picture; on easy and normal tiles in their home spot glow softly.
   Score = moves, best = fewest moves per difficulty. Shell API: assets/js/games/arcade.js. */
(function () {
    'use strict';
    var pick = { nums: true };                    /* tile numbers on or off, remembered while the page is open */

    /* grid[cell] = tile, n*n-1 is the gap. Any arrangement is solvable exactly when the parity of the permutation
       equals the parity of the gap's distance from its home corner (every move is one swap and one gap step) */
    function solvable(grid, n) {
        var seen = [], swaps = 0, g = grid.indexOf(n * n - 1);
        for (var i = 0; i < grid.length; i++) {
            if (seen[i]) continue;
            for (var j = i, len = 0; !seen[j]; j = grid[j], len++) seen[j] = true;
            swaps += len - 1;
        }
        return swaps % 2 === ((n - 1 - Math.floor(g / n)) + (n - 1 - g % n)) % 2;
    }
    function mix(n, rnd) {                        /* a random solvable arrangement, not too close to solved */
        var grid, k, far;
        do {
            grid = [];
            for (k = 0; k < n * n; k++) grid.push(k);
            for (k = grid.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), x = grid[k]; grid[k] = grid[j]; grid[j] = x; }
            if (!solvable(grid, n)) {             /* swapping two tiles (not the gap) flips the parity */
                var a = grid[0] === n * n - 1 || grid[1] === n * n - 1 ? 2 : 0, b = a + 1;
                if (grid[b] === n * n - 1) b++;
                x = grid[a]; grid[a] = grid[b]; grid[b] = x;
            }
            for (far = 0, k = 0; k < n * n; k++) if (grid[k] !== n * n - 1)
                far += Math.abs(Math.floor(grid[k] / n) - Math.floor(k / n)) + Math.abs(grid[k] % n - k % n);
        } while (far < n * n);
        return grid;
    }

    Arcade.register('sliding-kitten', function (api) {
        api.css(
            '.sk { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;' +
            '  -webkit-user-select: none; user-select: none; }' +
            '.sk-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }' +
            '.sk-pill { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; box-sizing: border-box; border-radius: 999px;' +
            '  background: #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, .08); color: #1e3a8a; font-weight: 800; font-variant-numeric: tabular-nums; }' +
            '.sk-btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border: none; border-radius: 999px; background: #fff;' +
            '  box-shadow: 0 2px 0 #cbd5e1, 0 2px 8px rgba(15, 23, 42, .06); color: #0f172a; font: inherit; font-size: .9rem; font-weight: 800; cursor: pointer;' +
            '  -webkit-tap-highlight-color: transparent; touch-action: none; }' +
            '.sk-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }' +
            '.sk-btn:active, .sk-btn.on { transform: translateY(2px); box-shadow: none; }' +
            '.sk-btn[aria-pressed="true"], .sk-btn.on { background: #f6a23a; color: #fff; }' +
            '.sk-board { position: relative; width: var(--s); height: var(--s); border-radius: 18px; background: #c9daf3; overflow: hidden;' +
            '  box-shadow: 0 12px 28px rgba(30, 58, 138, .16), inset 0 3px 8px rgba(30, 58, 138, .18); touch-action: manipulation; }' +
            '.sk-tile { position: absolute; left: 0; top: 0; overflow: hidden; border-radius: var(--r); cursor: default;' +
            '  box-shadow: 0 3px 6px rgba(15, 23, 42, .18), inset 0 0 0 1px rgba(255, 255, 255, .55); transition: transform .15s cubic-bezier(.2, .8, .3, 1.1);' +
            '  -webkit-tap-highlight-color: transparent; }' +
            '.sk-tile.mv { cursor: pointer; }' +
            '.sk-tile::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; transition: box-shadow .3s;' +
            '  box-shadow: inset 0 2px 0 rgba(255, 255, 255, .45), inset 0 -3px 0 rgba(15, 23, 42, .12); }' +
            '.sk-glow .sk-tile.ok::after { box-shadow: inset 0 0 0 3px rgba(74, 222, 128, .75), inset 0 -3px 0 rgba(15, 23, 42, .12); }' +
            '.sk-still .sk-tile, .sk-still .sk-full, .sk-still .sk-tile::after { transition: none; }' +
            '.sk-pic, .sk-full { position: absolute; pointer-events: none; background: var(--pic) 0 0 / 100% 100%, #fdf2e9; }' +
            '.sk .cat { position: absolute; left: 15%; top: 29%; width: 70%; height: 57.3%; pointer-events: none; cursor: inherit; }' +
            '.sk-num { position: absolute; left: 5px; top: 4px; min-width: 1.5em; padding: 1px 5px; border-radius: 999px; background: rgba(255, 255, 255, .9);' +
            '  color: #1e3a8a; font: 800 12px/1.35 ui-rounded, system-ui, sans-serif; text-align: center; box-shadow: 0 1px 3px rgba(15, 23, 42, .15); }' +
            '.sk-nonum .sk-num { display: none; }' +
            '.sk-full { inset: 0; z-index: 3; opacity: 0; transition: opacity .25s; }' +
            '.sk-board.peek .sk-full { opacity: 1; }' +
            '.sk-board.won .sk-full { opacity: 1; transition-duration: .8s; }' +
            '.sk-spark { position: absolute; z-index: 4; width: 14px; height: 14px; margin: -7px; pointer-events: none;' +
            '  background: radial-gradient(circle, #fff 0 20%, var(--c) 30% 45%, transparent 50%); animation: sk-spark .9s ease-out forwards; }' +
            '@keyframes sk-spark { from { transform: scale(.2); opacity: 1; } 60% { opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(1.2); opacity: 0; } }');

        var LEVELS = { easy: { n: 3, glow: true }, normal: { n: 4, glow: true }, hard: { n: 5, glow: false } };
        var L = LEVELS[api.level()] || LEVELS.normal, n = L.n, GAPV = n * n - 1;
        var EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

        var wrap = document.createElement('div');
        wrap.className = 'sk' + (api.reducedMotion ? ' sk-still' : '');
        wrap.innerHTML = '<div class="sk-bar"><span class="sk-pill sk-time" title="Time">0:00</span>' +
            '<button class="sk-btn sk-peek" type="button" title="Hold to see the whole picture">' + EYE + 'Peek</button>' +
            '<button class="sk-btn sk-toggle" type="button" title="Tile numbers">#</button></div>' +
            '<div class="sk-board' + (L.glow ? ' sk-glow' : '') + '" role="group" aria-label="Puzzle"></div>';
        api.el.appendChild(wrap);
        var board = wrap.querySelector('.sk-board'), timeEl = wrap.querySelector('.sk-time');
        var peekBtn = wrap.querySelector('.sk-peek'), numBtn = wrap.querySelector('.sk-toggle');
        var catSvg = document.querySelector('.arcade .mascot svg');
        var canvas = document.createElement('canvas');

        var grid, gap, tiles = [], moves = 0, done = false, size = 0, peeks = 0, t0 = 0, secs = 0, ticker = null;
        var GAP = 4;                              /* px between tiles */

        /* ---------- the picture, drawn in a 1000 x 1000 space ---------- */
        function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
        function blob(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
        function draw(px) {
            canvas.width = canvas.height = px;
            var c = canvas.getContext('2d'), k, g;
            c.scale(px / 1000, px / 1000);
            c.lineJoin = c.lineCap = 'round';
            /* wall with soft stripes and dots */
            g = c.createLinearGradient(0, 0, 0, 700);
            g.addColorStop(0, '#d6e6fb'); g.addColorStop(1, '#fdf1e4');
            c.fillStyle = g; c.fillRect(0, 0, 1000, 700);
            c.fillStyle = 'rgba(255, 255, 255, .35)';
            for (k = 0; k < 1000; k += 80) c.fillRect(k, 0, 34, 700);
            c.fillStyle = 'rgba(246, 162, 58, .16)';
            for (k = 0; k < 12; k++) for (var m = 0; m < 9; m++) { c.beginPath(); c.arc(40 + k * 80 + (m % 2) * 40, 60 + m * 72, 5, 0, 7); c.fill(); }
            /* bunting along the top */
            var cols = ['#f6a23a', '#93c5fd', '#f9a8d4', '#86efac', '#fde68a', '#c4b5fd'];
            c.strokeStyle = '#8a6a50'; c.lineWidth = 4;
            c.beginPath(); c.moveTo(-10, 30); c.quadraticCurveTo(500, 120, 1010, 30); c.stroke();
            for (k = 0; k < 13; k++) {
                var u = (k + 0.5) / 13, bx = -10 + 1020 * u, by = 30 + 2 * u * (1 - u) * 90;
                c.beginPath(); c.moveTo(bx - 30, by); c.lineTo(bx + 30, by); c.lineTo(bx, by + 62); c.closePath();
                c.fillStyle = cols[k % cols.length]; c.fill();
            }
            /* window with sky, sun and a cloud, curtains on the sides */
            rr(c, 60, 150, 290, 300, 26); c.fillStyle = '#fffaf2'; c.fill();
            g = c.createLinearGradient(0, 170, 0, 430); g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#e0f2fe');
            rr(c, 80, 170, 250, 260, 16); c.fillStyle = g; c.fill();
            c.save(); rr(c, 80, 170, 250, 260, 16); c.clip();
            blob(c, 265, 235, 42, 42, '#fde68a'); blob(c, 265, 235, 30, 30, '#fcd34d');
            blob(c, 150, 330, 50, 26, '#fff'); blob(c, 190, 316, 40, 30, '#fff'); blob(c, 225, 334, 36, 20, '#fff');
            blob(c, 205, 470, 190, 70, '#a7f3d0'); blob(c, 90, 460, 110, 60, '#86efac');
            c.restore();
            c.fillStyle = '#fffaf2'; c.fillRect(197, 170, 16, 260); c.fillRect(80, 292, 250, 14);
            rr(c, 44, 444, 322, 24, 10); c.fillStyle = '#e8c9a0'; c.fill();
            c.fillStyle = '#f9a8d4';
            c.beginPath(); c.moveTo(36, 130); c.lineTo(112, 130); c.quadraticCurveTo(70, 300, 104, 470); c.lineTo(36, 470); c.closePath(); c.fill();
            c.beginPath(); c.moveTo(374, 130); c.lineTo(298, 130); c.quadraticCurveTo(340, 300, 306, 470); c.lineTo(374, 470); c.closePath(); c.fill();
            c.fillStyle = '#f472b6'; c.fillRect(30, 118, 350, 18);
            /* round clock in the middle of the wall */
            blob(c, 520, 210, 70, 70, '#f6a23a'); blob(c, 520, 210, 56, 56, '#fffaf2');
            c.strokeStyle = '#1e3a8a'; c.lineWidth = 7;
            c.beginPath(); c.moveTo(520, 210); c.lineTo(520, 172); c.moveTo(520, 210); c.lineTo(548, 222); c.stroke();
            for (k = 0; k < 12; k++) { var a = k / 6 * Math.PI; blob(c, 520 + Math.cos(a) * 45, 210 + Math.sin(a) * 45, 4, 4, '#94a3b8'); }
            /* shelf with books and a plant */
            var books = [[660, 110, '#93c5fd'], [700, 140, '#f6a23a'], [748, 120, '#f9a8d4'], [790, 100, '#86efac']];
            books.forEach(function (b) { rr(c, b[0], 360 - b[1], 36, b[1], 6); c.fillStyle = b[2]; c.fill(); c.fillStyle = 'rgba(255, 255, 255, .6)'; c.fillRect(b[0] + 8, 380 - b[1], 20, 8); });
            c.save(); c.translate(842, 360); c.rotate(-0.25); rr(c, 0, -110, 34, 110, 6); c.fillStyle = '#c4b5fd'; c.fill(); c.restore();
            rr(c, 620, 360, 350, 24, 8); c.fillStyle = '#c08348'; c.fill();
            c.fillStyle = '#a86a35'; c.fillRect(660, 384, 18, 40); c.fillRect(912, 384, 18, 40);
            c.fillStyle = '#4ade80';
            [[-0.9, 70], [-0.4, 85], [0, 95], [0.45, 80], [0.95, 66]].forEach(function (l) {
                c.save(); c.translate(925, 300); c.rotate(l[0]); c.beginPath(); c.ellipse(0, -l[1] / 2, 16, l[1] / 2, 0, 0, 7); c.fill(); c.restore();
            });
            c.fillStyle = '#e8794a'; c.beginPath(); c.moveTo(888, 296); c.lineTo(962, 296); c.lineTo(950, 360); c.lineTo(900, 360); c.closePath(); c.fill();
            c.fillStyle = '#f39a6b'; c.fillRect(884, 290, 82, 16);
            /* floor boards and the skirting */
            g = c.createLinearGradient(0, 700, 0, 1000); g.addColorStop(0, '#f2c58f'); g.addColorStop(1, '#e3a86e');
            c.fillStyle = g; c.fillRect(0, 700, 1000, 300);
            c.strokeStyle = 'rgba(160, 100, 50, .35)'; c.lineWidth = 4;
            for (k = 0; k < 5; k++) {
                var y = 700 + k * 62; c.beginPath(); c.moveTo(0, y); c.lineTo(1000, y); c.stroke();
                for (var x = (k % 2) * 130 + 60; x < 1000; x += 260) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 62); c.stroke(); }
            }
            c.fillStyle = '#fffaf2'; c.fillRect(0, 684, 1000, 26); c.fillStyle = 'rgba(160, 100, 50, .2)'; c.fillRect(0, 708, 1000, 6);
            /* a framed heart on the right, a scratching post on the left */
            rr(c, 862, 450, 108, 120, 12); c.fillStyle = '#c08348'; c.fill();
            rr(c, 874, 462, 84, 96, 6); c.fillStyle = '#fffaf2'; c.fill();
            c.fillStyle = '#f472b6'; c.beginPath(); c.moveTo(916, 536); c.bezierCurveTo(870, 506, 886, 470, 916, 490);
            c.bezierCurveTo(946, 470, 962, 506, 916, 536); c.fill();
            rr(c, 18, 520, 110, 22, 8); c.fillStyle = '#a5b4fc'; c.fill();
            c.fillStyle = '#e8c9a0'; c.fillRect(48, 542, 50, 170);
            c.strokeStyle = '#c9a274'; c.lineWidth = 5;
            for (k = 0; k < 8; k++) { c.beginPath(); c.moveTo(48, 556 + k * 20); c.lineTo(98, 548 + k * 20); c.stroke(); }
            rr(c, 10, 704, 126, 26, 10); c.fillStyle = '#a5b4fc'; c.fill();
            c.strokeStyle = '#f6a23a'; c.lineWidth = 5; c.beginPath(); c.moveTo(118, 542); c.quadraticCurveTo(130, 580, 116, 610); c.stroke();
            blob(c, 116, 616, 11, 11, '#f6a23a');
            /* striped rug and the cushion the cat sits on */
            blob(c, 500, 900, 430, 92, '#fb923c'); blob(c, 500, 900, 392, 76, '#fde68a'); blob(c, 500, 900, 352, 62, '#fdba74');
            blob(c, 500, 900, 300, 48, '#fef3c7');
            blob(c, 500, 862, 240, 58, '#e879a8'); blob(c, 500, 852, 228, 50, '#f9a8d4'); blob(c, 450, 838, 120, 18, 'rgba(255, 255, 255, .35)');
            /* food bowl on the left */
            blob(c, 120, 800, 92, 20, 'rgba(120, 70, 30, .2)');
            c.fillStyle = '#60a5fa'; c.beginPath(); c.moveTo(40, 760); c.lineTo(200, 760); c.lineTo(180, 800); c.lineTo(60, 800); c.closePath(); c.fill();
            blob(c, 120, 760, 80, 16, '#bfdbfe'); blob(c, 120, 758, 62, 10, '#c08348');
            c.fillStyle = '#fff'; c.beginPath(); c.ellipse(116, 782, 18, 9, 0, 0, 7); c.fill();
            c.beginPath(); c.moveTo(130, 782); c.lineTo(142, 774); c.lineTo(142, 790); c.closePath(); c.fill();
            /* toy fish bottom left */
            c.save(); c.translate(150, 940); c.rotate(-0.2);
            c.fillStyle = '#2dd4bf'; c.beginPath(); c.ellipse(0, 0, 70, 34, 0, 0, 7); c.fill();
            c.beginPath(); c.moveTo(60, 0); c.lineTo(112, -34); c.lineTo(112, 34); c.closePath(); c.fill();
            c.fillStyle = '#99f6e4'; c.beginPath(); c.ellipse(-8, 8, 40, 14, 0, 0, 7); c.fill();
            blob(c, -40, -6, 9, 9, '#fff'); blob(c, -42, -6, 5, 5, '#0f172a');
            c.strokeStyle = '#0d9488'; c.lineWidth = 5; c.beginPath(); c.moveTo(-6, -26); c.lineTo(6, 26); c.moveTo(16, -24); c.lineTo(28, 24); c.stroke();
            c.restore();
            /* yarn ball with a loose thread, bottom right */
            c.strokeStyle = '#3b82f6'; c.lineWidth = 7;
            c.beginPath(); c.moveTo(800, 930); c.bezierCurveTo(740, 990, 640, 940, 600, 990); c.stroke();
            blob(c, 860, 900, 82, 82, '#93c5fd');
            c.save(); c.beginPath(); c.arc(860, 900, 82, 0, 7); c.clip();
            c.strokeStyle = '#60a5fa'; c.lineWidth = 7;
            for (k = -3; k <= 3; k++) { c.beginPath(); c.ellipse(860 + k * 26, 900, 30, 100, 0.5, 0, 7); c.stroke(); }
            c.strokeStyle = '#bfdbfe'; c.lineWidth = 5;
            for (k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(860, 900 + k * 30, 100, 24, -0.3, 0, 7); c.stroke(); }
            c.restore();
            blob(c, 836, 868, 18, 10, 'rgba(255, 255, 255, .5)');
            /* a few sparkles in the air */
            c.fillStyle = '#fff';
            [[430, 430], [610, 470], [960, 560], [40, 600], [700, 610]].forEach(function (s) {
                c.beginPath(); c.moveTo(s[0], s[1] - 16); c.lineTo(s[0] + 5, s[1] - 5); c.lineTo(s[0] + 16, s[1]); c.lineTo(s[0] + 5, s[1] + 5);
                c.lineTo(s[0], s[1] + 16); c.lineTo(s[0] - 5, s[1] + 5); c.lineTo(s[0] - 16, s[1]); c.lineTo(s[0] - 5, s[1] - 5); c.closePath(); c.fill();
            });
            try { wrap.style.setProperty('--pic', 'url(' + canvas.toDataURL('image/png') + ')'); } catch (e) { /* plain background */ }
        }

        /* a slice of the picture: the canvas scene plus the cat from the corner */
        function picture(cls) {
            var p = document.createElement('div');
            p.className = cls;
            if (catSvg) {
                var c = document.createElement('div');
                c.className = 'cat';
                c.appendChild(catSvg.cloneNode(true));
                p.appendChild(c);
            }
            return p;
        }
        var full = picture('sk-full');

        function build() {
            board.innerHTML = '';
            board.classList.remove('won', 'peek');
            board.classList.toggle('sk-nonum', !pick.nums);
            tiles = [];
            for (var k = 0; k < GAPV; k++) {
                var t = document.createElement('div');
                t.className = 'sk-tile';
                t.dataset.k = k;
                t.appendChild(picture('sk-pic'));
                var num = document.createElement('span');
                num.className = 'sk-num';
                num.textContent = k + 1;
                t.appendChild(num);
                board.appendChild(t);
                tiles.push(t);
            }
            board.appendChild(full);
            numBtn.setAttribute('aria-pressed', pick.nums);
        }

        /* tiles keep their picture slice from the solved position */
        function place() {
            var t = (size - GAP * (n + 1)) / n, mv = movable();
            for (var cell = 0; cell < n * n; cell++) {
                var k = grid[cell];
                if (k === GAPV) continue;
                var el = tiles[k], p = el.firstChild;
                el.style.width = el.style.height = t + 'px';
                el.style.transform = 'translate(' + (GAP + (cell % n) * (t + GAP)) + 'px,' + (GAP + Math.floor(cell / n) * (t + GAP)) + 'px)';
                el.classList.toggle('ok', k === cell);
                el.classList.toggle('mv', mv.indexOf(cell) >= 0);
                p.style.width = p.style.height = size + 'px';
                p.style.left = -(GAP + (k % n) * (t + GAP)) + 'px';
                p.style.top = -(GAP + Math.floor(k / n) * (t + GAP)) + 'px';
            }
        }
        function fit(s) {
            var v = Math.min(540, s.w - 24, s.h - 70);
            if ((s.w - v) / 2 < 100) v = Math.max(Math.min(v, s.h - 216), Math.min(v, 300));   /* keep the mascot corner free if it fits */
            var old = size;
            size = Math.max(180, Math.floor(v));
            wrap.style.setProperty('--s', size + 'px');
            wrap.style.setProperty('--r', Math.max(6, Math.round(size / n * 0.09)) + 'px');
            if (size !== old) draw(Math.min(2048, Math.round(size * Math.min(3, window.devicePixelRatio || 1))));
            if (grid) place();
        }

        /* cells in the gap's row and column: tapping one slides the whole line towards the gap */
        function movable() {
            var out = [], r = Math.floor(gap / n), c = gap % n;
            for (var k = 0; k < n; k++) { if (k !== c) out.push(r * n + k); if (k !== r) out.push(k * n + c); }
            return out;
        }
        function solved() {
            for (var k = 0; k < n * n; k++) if (grid[k] !== k) return false;
            return true;
        }
        function clock() {
            secs = Math.floor((performance.now() - t0) / 1000);
            timeEl.textContent = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2);
        }
        function sparkle() {
            if (api.reducedMotion) return;
            var cols = ['#f6a23a', '#93c5fd', '#f9a8d4', '#fde68a', '#86efac'];
            for (var k = 0; k < 22; k++) {
                var s = document.createElement('div'), a = Math.random() * Math.PI * 2, d = size * (0.15 + Math.random() * 0.3);
                s.className = 'sk-spark';
                s.style.left = size * (0.3 + Math.random() * 0.4) + 'px';
                s.style.top = size * (0.3 + Math.random() * 0.4) + 'px';
                s.style.setProperty('--c', cols[k % cols.length]);
                s.style.setProperty('--dx', Math.cos(a) * d + 'px');
                s.style.setProperty('--dy', Math.sin(a) * d + 'px');
                s.style.animationDelay = Math.random() * 0.3 + 's';
                board.appendChild(s);
            }
        }

        function newRound() {
            build();
            grid = mix(n, Math.random);
            gap = grid.indexOf(GAPV);
            moves = 0;
            done = false;
            api.score(0, 'Moves');
            api.cat('idle');
            fit(api.size());
        }
        function tryMove(cell) {
            if (done || cell < 0 || cell === gap || movable().indexOf(cell) < 0) return;
            var step = Math.floor(cell / n) === Math.floor(gap / n) ? (cell > gap ? 1 : -1) : (cell > gap ? n : -n);
            if (!moves) { t0 = performance.now(); ticker = api.interval(clock, 250); }
            while (gap !== cell) {                    /* each tile of the line moves one step */
                grid[gap] = grid[gap + step];
                gap += step;
                grid[gap] = GAPV;
                moves++;
            }
            api.score(moves, 'Moves');
            api.sfx('move');
            place();
            if (solved()) {
                done = true;
                clearInterval(ticker);
                clock();
                board.classList.remove('peek');
                board.classList.add('won');
                var c = full.querySelector('.cat');
                if (c) c.classList.add('happy');
                sparkle();
                api.end({ score: moves, win: true, lowerIsBetter: true,
                    text: 'Kitten restored!\n' + n + 'x' + n + ' in ' + moves + ' moves, ' + timeEl.textContent + (peeks ? ', ' + peeks + (peeks === 1 ? ' peek' : ' peeks') : '') });
            }
        }
        function peek(on) {
            if (done || board.classList.contains('peek') === on) return;
            board.classList.toggle('peek', on);
            peekBtn.classList.toggle('on', on);
            if (on) { peeks++; api.sfx('tap'); }
        }

        api.on(board, 'click', function (e) {
            var t = e.target.closest('.sk-tile');
            if (t && !board.classList.contains('peek')) tryMove(grid.indexOf(+t.dataset.k));
        });
        api.on(peekBtn, 'pointerdown', function (e) { e.preventDefault(); peek(true); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { api.on(peekBtn, ev, function () { peek(false); }); });
        api.on(peekBtn, 'contextmenu', function (e) { e.preventDefault(); });
        api.on(numBtn, 'click', function () {
            api.sfx('tap');
            pick.nums = !pick.nums;
            board.classList.toggle('sk-nonum', !pick.nums);
            numBtn.setAttribute('aria-pressed', pick.nums);
        });
        /* arrow keys (or WASD) push the tile next to the gap into it, in the arrow's direction; hold P to peek */
        api.on(document, 'keydown', function (e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            var k = e.key.length === 1 ? e.key.toLowerCase() : e.key, r = Math.floor(gap / n), c = gap % n, cell = -1;
            if (k === 'p') { e.preventDefault(); peek(true); return; }
            if (k === 'ArrowLeft' || k === 'a') cell = c < n - 1 ? gap + 1 : -1;
            else if (k === 'ArrowRight' || k === 'd') cell = c > 0 ? gap - 1 : -1;
            else if (k === 'ArrowUp' || k === 'w') cell = r < n - 1 ? gap + n : -1;
            else if (k === 'ArrowDown' || k === 's') cell = r > 0 ? gap - n : -1;
            else return;
            e.preventDefault();
            tryMove(cell);
        });
        api.on(document, 'keyup', function (e) { if (e.key === 'p' || e.key === 'P') peek(false); });

        api.onResize(fit);
        newRound();
        api.say(api.touch ? 'Tap a tile in the gap\'s row or column' : 'Click tiles or use the arrow keys, hold P to peek', 2800);
    });
})();
