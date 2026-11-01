/* Sliding Kitten: the classic sliding tile puzzle with a picture of the cat. 3x3 or 4x4, one gap.
   Score = moves, best = fewest moves (shared by both sizes). Shell API: assets/js/games/arcade.js. */
(function () {
    'use strict';
    var pick = { n: 3, nums: true };              /* size and numbers, remembered between rounds while the page is open */

    Arcade.register('sliding-kitten', function (api) {
        api.css(
            '.sk { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }' +
            '.sk-bar { display: flex; gap: 8px; align-items: center; }' +
            '.sk-btn { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; color: #0f172a; font: inherit;' +
            '  font-size: .9rem; font-weight: 700; cursor: pointer; }' +
            '.sk-btn[aria-pressed="true"] { border-color: #1e3a8a; background: #1e3a8a; color: #fff; }' +
            '.sk-board { position: relative; width: var(--s); height: var(--s); border-radius: 16px; background: #e2e8f0; overflow: hidden; }' +
            '.sk-tile { position: absolute; left: 0; top: 0; overflow: hidden; border-radius: 8px; cursor: pointer;' +
            '  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .7); transition: transform .13s ease-out; }' +
            '.sk-still .sk-tile { transition: none; }' +
            '.sk-pic, .sk-full { position: absolute; pointer-events: none;' +
            '  background: radial-gradient(ellipse 42% 9% at 52% 87%, #f9a8d4 96%, transparent 100%), linear-gradient(#dbeafe, #fdf2f8 75%); }' +
            '.sk-pic i, .sk-full i { position: absolute; font-style: normal; line-height: 1; }' +
            '.sk .cat { left: 2%; top: 9%; width: 96%; height: 78.5%; pointer-events: none; cursor: inherit; }' +
            '.sk-num { position: absolute; left: 5px; top: 4px; min-width: 1.5em; padding: 1px 4px; border-radius: 999px; background: rgba(255, 255, 255, .85);' +
            '  color: #1e3a8a; font: 700 12px/1.3 ui-monospace, Menlo, Consolas, monospace; text-align: center; }' +
            '.sk-nonum .sk-num { display: none; }' +
            '.sk-full { inset: 0; opacity: 0; transition: opacity .5s; }' +
            '.sk-board.won .sk-full { opacity: 1; }');

        var wrap = document.createElement('div');
        wrap.className = 'sk' + (api.reducedMotion ? ' sk-still' : '');
        wrap.innerHTML = '<div class="sk-bar" role="group" aria-label="Puzzle size">' +
            '<button class="sk-btn" type="button" data-n="3">3x3</button><button class="sk-btn" type="button" data-n="4">4x4</button>' +
            '<button class="sk-btn sk-toggle" type="button" title="Tile numbers">#</button></div>' +
            '<div class="sk-board" role="group" aria-label="Puzzle"></div>';
        api.el.appendChild(wrap);
        var board = wrap.querySelector('.sk-board'), bar = wrap.querySelector('.sk-bar');
        var catSvg = document.querySelector('.arcade .mascot svg');

        var n, grid, gap, tiles, moves, done, size = 0;
        var GAP = 3;                              /* px between tiles */

        /* the picture: pastel background, cushion, a yarn ball and a fish, the cat from the corner in the middle */
        function picture(cls) {
            var p = document.createElement('div');
            p.className = cls;
            p.innerHTML = '<i style="left:83%;top:72%">🧶</i><i style="left:78%;top:8%">🐟</i><i style="left:9%;top:9%">⭐</i>';
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
            n = pick.n;
            board.innerHTML = '';
            board.classList.remove('won');
            board.classList.toggle('sk-nonum', !pick.nums);
            tiles = [];
            for (var k = 0; k < n * n - 1; k++) {
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
            Array.prototype.forEach.call(bar.querySelectorAll('[data-n]'), function (b) { b.setAttribute('aria-pressed', +b.dataset.n === n); });
            bar.querySelector('.sk-toggle').setAttribute('aria-pressed', pick.nums);
        }

        /* grid[cell] = tile number, n*n-1 marks the gap; tiles keep their picture slice from the solved position */
        function place() {
            var t = (size - GAP * (n + 1)) / n;
            full.style.fontSize = size / 9 + 'px';
            for (var cell = 0; cell < n * n; cell++) {
                var k = grid[cell];
                if (k === n * n - 1) continue;
                var el = tiles[k], p = el.firstChild;
                el.style.width = el.style.height = t + 'px';
                el.style.transform = 'translate(' + (GAP + (cell % n) * (t + GAP)) + 'px,' + (GAP + Math.floor(cell / n) * (t + GAP)) + 'px)';
                p.style.width = p.style.height = size + 'px';
                p.style.fontSize = size / 9 + 'px';
                p.style.left = -(GAP + (k % n) * (t + GAP)) + 'px';
                p.style.top = -(GAP + Math.floor(k / n) * (t + GAP)) + 'px';
            }
        }
        function fit(s) {
            var v = Math.min(520, s.w - 24, s.h - 76);
            if ((s.w - v) / 2 < 100) v = Math.min(v, s.h - 216);   /* keep the mascot corner free */
            size = Math.max(150, Math.floor(v));
            wrap.style.setProperty('--s', size + 'px');
            if (grid) place();
        }

        function neighbours(cell) {
            var r = Math.floor(cell / n), c = cell % n, out = [];
            if (r > 0) out.push(cell - n);
            if (r < n - 1) out.push(cell + n);
            if (c > 0) out.push(cell - 1);
            if (c < n - 1) out.push(cell + 1);
            return out;
        }
        function swap(cell) {
            grid[gap] = grid[cell];
            grid[cell] = n * n - 1;
            gap = cell;
        }
        function solved() {
            for (var k = 0; k < n * n; k++) if (grid[k] !== k) return false;
            return true;
        }
        /* random legal moves from the solved picture, so the result is always solvable */
        function shuffle() {
            grid = [];
            for (var k = 0; k < n * n; k++) grid.push(k);
            gap = n * n - 1;
            var prev = -1, steps = n === 3 ? 90 : 240;
            for (var s = 0; s < steps || solved(); s++) {
                var opts = neighbours(gap).filter(function (c) { return c !== prev; });
                prev = gap;
                swap(opts[Math.floor(Math.random() * opts.length)]);
            }
        }

        function newRound() {
            build();
            shuffle();
            moves = 0;
            done = false;
            api.score(0, 'Moves');
            api.cat('idle');
            fit(api.size());
        }
        function tryMove(cell) {
            if (done || cell < 0 || neighbours(gap).indexOf(cell) < 0) return;
            swap(cell);
            moves++;
            api.score(moves, 'Moves');
            api.sfx('move');
            place();
            if (solved()) {
                done = true;
                board.classList.add('won');
                var c = full.querySelector('.cat');
                if (c) c.classList.add('happy');
                api.end({ score: moves, win: true, lowerIsBetter: true, text: 'Kitten restored!\n' + n + 'x' + n + ' in ' + moves + ' moves' });
            }
        }

        api.on(board, 'click', function (e) {
            var t = e.target.closest('.sk-tile');
            if (t) tryMove(grid.indexOf(+t.dataset.k));
        });
        api.on(bar, 'click', function (e) {
            var b = e.target.closest('.sk-btn');
            if (!b) return;
            api.sfx('tap');
            if (b.dataset.n) { pick.n = +b.dataset.n; newRound(); return; }
            pick.nums = !pick.nums;
            board.classList.toggle('sk-nonum', !pick.nums);
            b.setAttribute('aria-pressed', pick.nums);
        });
        /* arrow keys (or WASD) push the tile next to the gap into it, in the arrow's direction */
        api.on(document, 'keydown', function (e) {
            var k = e.key.length === 1 ? e.key.toLowerCase() : e.key, r = Math.floor(gap / n), c = gap % n, cell = -1;
            if (k === 'ArrowLeft' || k === 'a') cell = c < n - 1 ? gap + 1 : -1;
            else if (k === 'ArrowRight' || k === 'd') cell = c > 0 ? gap - 1 : -1;
            else if (k === 'ArrowUp' || k === 'w') cell = r < n - 1 ? gap + n : -1;
            else if (k === 'ArrowDown' || k === 's') cell = r > 0 ? gap - n : -1;
            else return;
            e.preventDefault();
            tryMove(cell);
        });

        api.onResize(fit);
        newRound();
        api.say(api.touch ? 'Tap a tile next to the gap' : 'Click tiles or use the arrow keys', 2600);
    });
})();
