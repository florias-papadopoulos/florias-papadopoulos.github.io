/* Tic-Tac-Paw: three in a row against the cat. Your paws against its fish; best score = longest winning streak.
   Reference game for the shell API (see assets/js/games/arcade.js). */
Arcade.register('tic-tac-paw', function (api) {
    'use strict';
    api.css(
        '.ttp { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }' +
        '.ttp-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: var(--s); height: var(--s); }' +
        '.ttp-cell { border: none; border-radius: 16px; background: #fff; box-shadow: 0 4px 0 #e2e8f0; font-size: calc(var(--s) / 5);' +
        '  line-height: 1; cursor: pointer; transition: transform .1s; }' +
        '.ttp-cell:hover:not(:disabled) { transform: translateY(-2px); }' +
        '.ttp-cell:disabled { cursor: default; }' +
        '.ttp-cell.win { background: #fef3c7; }' +
        '.ttp-cell span { display: inline-block; animation: ttp-in .25s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.ttp-turn { font-weight: 700; color: #475569; }' +
        '@keyframes ttp-in { from { transform: scale(0); } to { transform: scale(1); } }');

    var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    var YOU = '🐾', CAT = '🐟';          /* paw prints, fish */
    var wrap = document.createElement('div');
    wrap.className = 'ttp';
    wrap.innerHTML = '<div class="ttp-turn"></div><div class="ttp-board"></div>';
    api.el.appendChild(wrap);
    var board = wrap.querySelector('.ttp-board'), turnEl = wrap.querySelector('.ttp-turn');
    var cells = [], grid, busy, streak = 0, round = 0;

    for (var i = 0; i < 9; i++) {
        var b = document.createElement('button');
        b.className = 'ttp-cell';
        b.type = 'button';
        b.dataset.i = i;
        board.appendChild(b);
        cells.push(b);
    }
    function fit(s) { wrap.style.setProperty('--s', Math.min(420, s.w - 32, s.h - 110) + 'px'); }
    fit(api.size());
    api.onResize(fit);

    function winner(g) {
        for (var k = 0; k < LINES.length; k++) {
            var l = LINES[k];
            if (g[l[0]] && g[l[0]] === g[l[1]] && g[l[1]] === g[l[2]]) return { who: g[l[0]], line: l };
        }
        return g.indexOf(null) < 0 ? { who: 'draw' } : null;
    }
    /* minimax from the cat's point of view: +1 cat wins, -1 you win */
    function minimax(g, catTurn) {
        var w = winner(g);
        if (w) return w.who === 'C' ? 1 : w.who === 'Y' ? -1 : 0;
        var best = catTurn ? -2 : 2;
        for (var k = 0; k < 9; k++) {
            if (g[k]) continue;
            g[k] = catTurn ? 'C' : 'Y';
            var v = minimax(g, !catTurn);
            g[k] = null;
            best = catTurn ? Math.max(best, v) : Math.min(best, v);
        }
        return best;
    }
    function catMove() {
        var free = [];
        grid.forEach(function (v, k) { if (!v) free.push(k); });
        if (Math.random() < 0.22) return free[Math.floor(Math.random() * free.length)];   /* the cat gets distracted */
        var best = -2, moves = [];
        free.forEach(function (k) {
            grid[k] = 'C';
            var v = minimax(grid, false);
            grid[k] = null;
            if (v > best) { best = v; moves = [k]; } else if (v === best) moves.push(k);
        });
        return moves[Math.floor(Math.random() * moves.length)];
    }
    function put(k, who) {
        grid[k] = who;
        cells[k].innerHTML = '<span>' + (who === 'Y' ? YOU : CAT) + '</span>';
        cells[k].disabled = true;
    }
    function show() {
        api.score(streak, 'Streak');
    }
    function finish(w) {
        busy = true;
        cells.forEach(function (c) { c.disabled = true; });
        if (w.line) w.line.forEach(function (k) { cells[k].classList.add('win'); });
        if (w.who === 'Y') {
            streak++;
            show();
            api.sfx('point');
            api.cat('sad');
            api.say(['Hmph.', 'Lucky paw!', 'Best of three?'][streak % 3]);
            api.timeout(newRound, 1300);
        } else if (w.who === 'draw') {
            api.sfx('move');
            api.cat('think');
            api.say('A draw. Again!');
            api.timeout(newRound, 1300);
        } else {
            turnEl.textContent = 'The cat got three in a row';
            api.say('Meow! I win.');
            api.end({ score: streak, win: false, text: 'The cat wins.\nYour streak: ' + streak });
        }
    }
    function newRound() {
        round++;
        grid = [null, null, null, null, null, null, null, null, null];
        busy = false;
        api.cat('idle');
        cells.forEach(function (c) { c.innerHTML = ''; c.disabled = false; c.classList.remove('win'); });
        if (round % 2 === 0) {                    /* the cat starts every other round */
            turnEl.textContent = 'The cat starts';
            busy = true;
            api.timeout(function () { put(catMove(), 'C'); api.sfx('move'); busy = false; turnEl.textContent = 'Your turn'; }, 600);
        } else {
            turnEl.textContent = 'Your turn';
        }
    }
    api.on(board, 'click', function (e) {
        var c = e.target.closest('.ttp-cell');
        if (!c || busy || grid[+c.dataset.i]) return;
        put(+c.dataset.i, 'Y');
        api.sfx('tap');
        var w = winner(grid);
        if (w) return finish(w);
        busy = true;
        turnEl.textContent = 'The cat is thinking…';
        api.cat('think');
        api.timeout(function () {
            put(catMove(), 'C');
            api.sfx('move');
            api.cat('idle');
            var w2 = winner(grid);
            if (w2) return finish(w2);
            busy = false;
            turnEl.textContent = 'Your turn';
        }, 450 + Math.random() * 350);
    });
    show();
    newRound();
});
