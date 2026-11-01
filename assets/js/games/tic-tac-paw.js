/* Tic-Tac-Paw: three in a row against the cat, your paws against its fish. Rounds go on until the cat wins one:
   a win scores 2 points plus 1 for every win before it in the streak, a draw scores 1. On normal and hard a kitten
   naps on a square every few rounds (nobody can play there). Easy: the cat is often distracted; normal: sometimes;
   hard: perfect play, so the cat never loses and draws are what count. Best score = most points in one run.
   Reference game for the shell API (see assets/js/games/arcade.js).
   The same file is Tic Tac Two (id tic-tac-paw-2p): two players take turns on one screen, Player 1 with
   paws, Player 2 with fish, no cat playing and no kitten naps. A running tally (wins of each player and draws) lasts
   until the page is left, "Play again" lets the other player start (the "Starts" toggle can change that until the
   first move), Reset clears the tally and starts a fresh board, and nothing is saved as a best. Single player is
   untouched by it: duo is false there. */
(function () {
var tally = { p1: 0, p2: 0, draws: 0, next: 'Y' };   /* Tic Tac Two: the match so far and who starts next */
Arcade.register('tic-tac-paw', function (api) { return ticTacPaw(api, false); });
Arcade.register('tic-tac-paw-2p', function (api) { return ticTacPaw(api, true); });

function ticTacPaw(api, duo) {
    'use strict';
    var PAW_PATH = '<ellipse cx="20" cy="26" rx="8" ry="6.8"/><circle cx="10.5" cy="17.5" r="3.4"/><circle cx="16.3" cy="11" r="3.4"/>' +
        '<circle cx="23.7" cy="11" r="3.4"/><circle cx="29.5" cy="17.5" r="3.4"/>';
    var PAW = '<svg class="ttp-paw" viewBox="0 0 40 40">' + PAW_PATH + '</svg>';
    var FISH = '<svg class="ttp-fish" viewBox="0 0 40 40"><path d="M5 20c5-8 15-10 22-5l8-6v22l-8-6c-7 5-17 3-22-5z"/>' +
        '<path class="fin" d="M16 13l4-5 3 6z"/><circle class="eye" cx="12" cy="18.5" r="2"/></svg>';
    var KITTEN = '<svg class="ttp-nap" viewBox="3 4 34 34"><path class="body" d="M7 30c0-8 6-12 14-12s13 4 13 10c0 3-2 5-5 5H10c-2 0-3-1-3-3z"/>' +
        '<path class="body" d="M7 23l1-7 4 4zM17 21l-1-6-4 4z"/><circle class="body" cx="12" cy="24" r="6.5"/>' +
        '<path class="line" d="M8.5 24.5q1.5 1.3 3 0M13 24.5q1.5 1.3 3 0M34 28c3 2 1 6-4 6H14"/>' +
        '<text x="27" y="15">z</text><text x="32" y="9" class="small">z</text></svg>';
    var hoverPaw = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="#f6a23a" opacity=".22">' +
        PAW_PATH + '</svg>') + '")';
    var hoverFish = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="#4c6ef5" opacity=".2">' +
        '<path d="M5 20c5-8 15-10 22-5l8-6v22l-8-6c-7 5-17 3-22-5z"/></svg>') + '")';
    api.css(
        '.ttp { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }' +
        '.ttp-turn { min-height: 1.3em; font-weight: 700; color: #475569; }' +
        '.ttp-chips { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; min-height: 26px; }' +
        '.ttp-chip { padding: 3px 11px; border-radius: 999px; background: #fff; box-shadow: 0 2px 0 #e9dfcf; color: #64748b; font-size: .82rem; font-weight: 700; }' +
        '.ttp-chip.hot { background: #fff1dc; color: #c2620a; }' +
        '.ttp-chip.nap { background: #e8efff; color: #3b5bdb; }' +
        '.ttp-board { position: relative; display: grid; grid-template: repeat(3, minmax(0, 1fr)) / repeat(3, minmax(0, 1fr)); gap: calc(var(--s) * .03);' +
        '  width: var(--s); height: var(--s); padding: calc(var(--s) * .035); box-sizing: border-box; border-radius: 26px;' +
        '  background: linear-gradient(160deg, #dfe9fb, #c9daf6); box-shadow: 0 7px 0 #aac2ec, 0 16px 30px rgba(30, 58, 138, .12); }' +
        '.ttp-cell { position: relative; padding: 0; border: none; border-radius: 18px; background: #fffdf8 center / 58% no-repeat;' +
        '  box-shadow: 0 5px 0 #eadfcd; cursor: pointer; transition: transform .12s, box-shadow .12s, background-color .2s; -webkit-tap-highlight-color: transparent; }' +
        '@media (hover: hover) { .ttp-cell:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 7px 0 #eadfcd; background-image: ' + hoverPaw + '; }' +
        '  .ttp-duo.p2 .ttp-cell:hover:not(:disabled) { background-image: ' + hoverFish + '; } }' +
        '.ttp-cell:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 2px 0 #eadfcd; }' +
        '.ttp-cell:focus-visible { outline: 3px solid #f6a23a; outline-offset: 2px; }' +
        '.ttp-cell:disabled { cursor: default; }' +
        '.ttp-cell.win { background-color: #fff1d6; box-shadow: 0 5px 0 #f8c77e; }' +
        '.ttp-cell.napping { background-color: #eef2fb; box-shadow: 0 5px 0 #d5dff2; }' +
        '.ttp-cell svg { position: absolute; left: 19%; top: 19%; width: 62%; height: 62%; animation: ttp-in .3s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.ttp-paw { fill: #f08c2e; filter: drop-shadow(0 3px 0 #f8d3a6); }' +
        '.ttp-fish path { fill: #4c6ef5; } .ttp-fish .fin { fill: #748ffc; } .ttp-fish .eye { fill: #fff; }' +
        '.ttp-fish { filter: drop-shadow(0 3px 0 #c5d0fa); }' +
        '.ttp-nap .body { fill: #c9b8a6; } .ttp-nap .line { fill: none; stroke: #8a7563; stroke-width: 1.4; stroke-linecap: round; }' +
        '.ttp-nap text { fill: #7c93c9; font: 700 7px sans-serif; animation: ttp-z 2s ease-in-out infinite; }' +
        '.ttp-nap .small { font-size: 5px; animation-delay: .6s; }' +
        '.ttp-cell.win svg { animation: ttp-in .3s cubic-bezier(.3, 1.6, .5, 1), ttp-hop .5s ease-in-out .3s 2 alternate; }' +
        '.ttp-strike { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }' +
        '.ttp-strike line { stroke: #f6a23a; stroke-width: 7; stroke-linecap: round; opacity: .85; stroke-dasharray: 1000; animation: ttp-draw .45s ease-out both; }' +
        '.ttp-strike.cat line { stroke: #5c7cfa; }' +
        '.ttp-bit { position: absolute; width: 8px; height: 12px; border-radius: 2px; pointer-events: none; animation: ttp-bit 1.1s ease-out forwards; }' +
        '.ttp-calm *, .ttp-calm .ttp-cell svg { animation: none !important; transition: none !important; }' +
        /* for two: the tally on top, the turn (or the result and "Play again") under it */
        '.ttp-score { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; align-items: center; }' +
        '.ttp-side { display: inline-flex; align-items: center; gap: 5px; padding: 2px 11px 2px 4px; border: 2px solid transparent; border-radius: 999px;' +
        '  background: #fff; box-shadow: 0 2px 0 #e9dfcf; color: #475569; font-size: .88rem; font-weight: 700; font-variant-numeric: tabular-nums; }' +
        '.ttp-side svg { width: 24px; height: 24px; }' +
        '.ttp-side.on { border-color: #f6a23a; } .ttp-side.p2.on { border-color: #5c7cfa; }' +
        '.ttp-draws { padding: 4px 11px; color: #64748b; font-size: .85rem; font-weight: 700; font-variant-numeric: tabular-nums; }' +
        '.ttp-duo .ttp-turn { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 40px; }' +
        '.ttp-turn.p1 { color: #c2620a; } .ttp-turn.p2 { color: #3b5bdb; }' +
        '.ttp-btn { min-height: 36px; padding: 5px 14px; border: none; border-radius: 999px; background: #fff; color: #64748b; font: inherit;' +
        '  font-size: .88rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 0 #e9dfcf; -webkit-tap-highlight-color: transparent; }' +
        '.ttp-btn.go { min-height: 40px; padding: 6px 18px; background: #f08c2e; color: #fff; font-size: 1rem; box-shadow: 0 3px 0 #c96a14; }' +
        '.ttp-btn:active { transform: translateY(2px); box-shadow: none; }' +
        '.ttp-btn:focus-visible { outline: 3px solid #f6a23a; outline-offset: 2px; }' +
        '.ttp-btn:disabled { opacity: .45; cursor: default; }' +
        '.ttp-btn[hidden], .ttp-turn [hidden] { display: none; }' +
        '.ttp-start { display: inline-flex; align-items: center; gap: 6px; color: #64748b; font-size: .88rem; font-weight: 700; }' +
        '.ttp-start button { display: inline-flex; align-items: center; gap: 5px; min-height: 40px; padding: 3px 12px 3px 6px; border: 2px solid transparent;' +
        '  border-radius: 999px; background: #fff; color: #64748b; font: inherit; cursor: pointer; box-shadow: 0 2px 0 #e9dfcf; -webkit-tap-highlight-color: transparent; }' +
        '.ttp-start svg { width: 22px; height: 22px; }' +
        '.ttp-start [aria-pressed="true"] { border-color: #f6a23a; color: #c2620a; }' +
        '.ttp-start [data-p="C"][aria-pressed="true"] { border-color: #5c7cfa; color: #3b5bdb; }' +
        '.ttp-start button:focus-visible { outline: 3px solid #f6a23a; outline-offset: 2px; }' +
        '@media (max-width: 420px) { .ttp-score { gap: 4px; } .ttp-side { gap: 4px; padding-right: 8px; font-size: .8rem; }' +
        '  .ttp-draws { padding: 4px 3px; font-size: .8rem; } .ttp-reset { padding: 5px 10px; font-size: .8rem; } }' +
        '@keyframes ttp-in { from { transform: scale(0) rotate(-20deg); } to { transform: none; } }' +
        '@keyframes ttp-hop { to { transform: translateY(-8%) scale(1.08); } }' +
        '@keyframes ttp-draw { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }' +
        '@keyframes ttp-z { 0%, 100% { opacity: .2; transform: translateY(1px); } 50% { opacity: 1; transform: translateY(-1px); } }' +
        '@keyframes ttp-bit { 55% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 1; }' +
        '  100% { transform: translate(var(--x), calc(var(--y) + 90px)) rotate(var(--r)); opacity: 0; } }');

    var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    var level = api.level();
    var MISTAKE = { easy: 0.5, normal: 0.18, hard: 0 }[level];     /* chance the cat plays a random square */
    var NAP_EVERY = duo ? 0 : { easy: 0, normal: 3, hard: 2 }[level];   /* a napping kitten every n-th round */
    var wrap = document.createElement('div');
    wrap.className = 'ttp' + (duo ? ' ttp-duo' : '') + (api.reducedMotion ? ' ttp-calm' : '');
    wrap.innerHTML = duo ? '<div class="ttp-score"><span class="ttp-side p1">' + PAW + 'Player 1 <b>0</b></span>' +
        '<span class="ttp-draws">Draws <b>0</b></span><span class="ttp-side p2">' + FISH + 'Player 2 <b>0</b></span>' +
        '<button type="button" class="ttp-btn ttp-reset">Reset</button></div>' +
        '<div class="ttp-turn"><span aria-live="polite"></span><span class="ttp-start" role="group" aria-label="Who starts">Starts:' +
        '<button type="button" data-p="Y">' + PAW + 'Player 1</button><button type="button" data-p="C">' + FISH + 'Player 2</button></span>' +
        '<button type="button" class="ttp-btn go" hidden>Play again</button></div><div class="ttp-board"></div>' :
        '<div class="ttp-turn" aria-live="polite"></div><div class="ttp-board"></div><div class="ttp-chips"></div>';
    api.el.appendChild(wrap);
    var board = wrap.querySelector('.ttp-board'), turnEl = wrap.querySelector(duo ? '.ttp-turn span' : '.ttp-turn'), chips = wrap.querySelector('.ttp-chips');
    var cells = [], grid, busy, points = 0, streak = 0, draws = 0, round = 0, memo = {};
    var turn = 'Y', againBtn = wrap.querySelector('.go'), resetBtn = wrap.querySelector('.ttp-reset');   /* for two: whose turn */
    var startEl = wrap.querySelector('.ttp-start'), picked = false;    /* picked: the starter was chosen by hand this round */

    for (var i = 0; i < 9; i++) {
        var b = document.createElement('button');
        b.className = 'ttp-cell';
        b.type = 'button';
        b.dataset.i = i;
        board.appendChild(b);
        cells.push(b);
    }
    /* the board is square; when it spans the width, keep the mascot corner below it free */
    function fit(s) {
        var size = Math.min(420, s.w - 32, s.h - (duo ? 140 : 120));
        if ((s.w - size) / 2 < 100) size = Math.min(size, s.h - (duo ? 250 : 200));
        wrap.style.setProperty('--s', Math.max(180, size) + 'px');
    }
    fit(api.size());
    api.onResize(fit);

    /* grid squares: null (free), 'Y' (you), 'C' (cat) or 'N' (a napping kitten, belongs to nobody) */
    function winner(g) {
        for (var k = 0; k < LINES.length; k++) {
            var l = LINES[k], p = g[l[0]];
            if (p && p !== 'N' && p === g[l[1]] && p === g[l[2]]) return { who: p, line: l };
        }
        return g.indexOf(null) < 0 ? { who: 'draw' } : null;
    }
    /* minimax from the cat's point of view: +1 cat wins, -1 you win, 0 draw (remembered per position) */
    function minimax(g, catTurn) {
        var key = g.map(function (v) { return v || '.'; }).join('') + catTurn;
        if (key in memo) return memo[key];
        var w = winner(g), best;
        if (w) best = w.who === 'C' ? 1 : w.who === 'Y' ? -1 : 0;
        else {
            best = catTurn ? -2 : 2;
            for (var k = 0; k < 9; k++) {
                if (g[k]) continue;
                g[k] = catTurn ? 'C' : 'Y';
                var v = minimax(g, !catTurn);
                g[k] = null;
                best = catTurn ? Math.max(best, v) : Math.min(best, v);
            }
        }
        return (memo[key] = best);
    }
    function freeSquares() {
        var free = [];
        grid.forEach(function (v, k) { if (!v) free.push(k); });
        return free;
    }
    /* how many of your replies would lose: on hard the cat prefers moves that set traps */
    function traps() {
        var n = 0;
        freeSquares().forEach(function (k) {
            grid[k] = 'Y';
            if (minimax(grid, true) === 1) n++;
            grid[k] = null;
        });
        return n;
    }
    function catMove() {
        var free = freeSquares();
        if (Math.random() < MISTAKE) return free[Math.floor(Math.random() * free.length)];   /* the cat gets distracted */
        var best = -2, moves = [];
        free.forEach(function (k) {
            grid[k] = 'C';
            var v = minimax(grid, false);
            if (level === 'hard' && v === 0) v += traps() / 100;   /* still a draw, but a tricky one */
            grid[k] = null;
            if (v > best) { best = v; moves = [k]; } else if (v === best) moves.push(k);
        });
        return moves[Math.floor(Math.random() * moves.length)];
    }
    function put(k, who) {
        grid[k] = who;
        cells[k].innerHTML = who === 'Y' ? PAW : who === 'C' ? FISH : KITTEN;
        cells[k].disabled = true;
        if (who === 'N') { cells[k].classList.add('napping'); cells[k].setAttribute('aria-label', 'A kitten naps here'); }
    }

    function show(nap) {
        api.score(points, 'Points');
        chips.innerHTML = '<span class="ttp-chip">Round ' + round + '</span>' +
            (streak > 1 ? '<span class="ttp-chip hot">Streak ' + streak + '</span>' : '') +
            (draws ? '<span class="ttp-chip">Draws ' + draws + '</span>' : '') +
            (nap ? '<span class="ttp-chip nap">Kitten nap</span>' : '');
    }
    /* a line drawn through the three winning squares */
    function strike(line, who) {
        var a = cells[line[0]], c = cells[line[2]];
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'ttp-strike' + (who === 'C' ? ' cat' : ''));
        svg.innerHTML = '<line x1="' + (a.offsetLeft + a.offsetWidth / 2) + '" y1="' + (a.offsetTop + a.offsetHeight / 2) +
            '" x2="' + (c.offsetLeft + c.offsetWidth / 2) + '" y2="' + (c.offsetTop + c.offsetHeight / 2) + '"/>';
        board.appendChild(svg);
    }
    /* paper bits flying out from the middle of the board */
    function confetti() {
        if (api.reducedMotion) return;
        var colors = ['#f6a23a', '#fbbf24', '#5c7cfa', '#f783ac', '#69db7c'];
        var x = board.offsetLeft + board.offsetWidth / 2, y = board.offsetTop + board.offsetHeight / 2;
        for (var k = 0; k < 36; k++) {
            var p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 140;
            p.className = 'ttp-bit';
            p.style.cssText = 'left:' + x + 'px; top:' + y + 'px; background:' + colors[k % colors.length] + '; --x:' + Math.round(Math.cos(a) * d) +
                'px; --y:' + Math.round(Math.sin(a) * d - 60) + 'px; --r:' + Math.round(Math.random() * 720 - 360) + 'deg';
            wrap.appendChild(p);
            api.timeout(p.remove.bind(p), 1200);
        }
    }
    function finish(w) {
        busy = true;
        cells.forEach(function (c) { c.disabled = true; });
        if (w.line) {
            w.line.forEach(function (k) { cells[k].classList.add('win'); });
            strike(w.line, w.who);
        }
        if (duo) return duoFinish(w);
        if (w.who === 'Y') {
            streak++;
            points += 1 + streak;                 /* 2, 3, 4, ... for each win in a row */
            show();
            turnEl.textContent = 'Three paws! +' + (1 + streak);
            api.sfx('point');
            api.cat('sad');
            api.say(streak > 2 ? 'You are on a roll.' : ['Hmph.', 'Lucky paw!', 'Best of three?'][round % 3]);
            confetti();
            api.timeout(newRound, 1500);
        } else if (w.who === 'draw') {
            streak = 0;
            draws++;
            points++;
            show();
            turnEl.textContent = 'A draw. +1';
            api.sfx('move');
            api.cat('think');
            api.say(level === 'hard' ? 'Nobody beats me. Again!' : 'A draw. Again!');
            api.timeout(newRound, 1300);
        } else {
            turnEl.textContent = 'The cat got three in a row';
            api.say('Meow! I win.');
            api.end({ score: points, win: false, text: 'The cat wins round ' + round + '.\n' + points + (points === 1 ? ' point' : ' points') +
                (draws ? ', ' + draws + (draws === 1 ? ' draw' : ' draws') : '') });
        }
    }
    function catTurn() {
        busy = true;
        turnEl.textContent = 'The cat is thinking…';
        api.cat('think');
        api.timeout(function () {
            put(catMove(), 'C');
            api.sfx('move');
            api.cat('idle');
            var w = winner(grid);
            if (w) return finish(w);
            busy = false;
            turnEl.textContent = 'Your turn';
        }, 450 + Math.random() * 350);
    }
    /* ---------- for two ---------- */
    function name(p) { return p === 'Y' ? 'Player 1' : 'Player 2'; }
    function duoStatus(text, p) {
        turnEl.textContent = text;
        turnEl.parentNode.className = 'ttp-turn' + (p ? ' ' + (p === 'Y' ? 'p1' : 'p2') : '');
    }
    function duoShow() {                          /* the tally, and whose turn it is */
        var sides = wrap.querySelectorAll('.ttp-side');
        sides[0].querySelector('b').textContent = tally.p1;
        sides[1].querySelector('b').textContent = tally.p2;
        wrap.querySelector('.ttp-draws b').textContent = tally.draws;
        sides[0].classList.toggle('on', !busy && turn === 'Y');
        sides[1].classList.toggle('on', !busy && turn === 'C');
        wrap.classList.toggle('p2', turn === 'C');
        /* before the first move of a round the starter can still be picked; after it the toggle goes away */
        var fresh = !busy && grid.indexOf('Y') < 0 && grid.indexOf('C') < 0;
        startEl.hidden = !fresh;
        turnEl.hidden = fresh;
        startEl.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.p === turn); });
        if (fresh) duoStatus('', turn);
        else if (!busy) duoStatus(name(turn) + '\u2019s turn', turn);
    }
    function duoFinish(w) {
        if (w.who === 'draw') {
            tally.draws++;
            duoStatus('A draw');
            api.sfx('move');
            api.cat('think');
        } else {
            tally[w.who === 'Y' ? 'p1' : 'p2']++;
            duoStatus(name(w.who) + ' wins!', w.who);
            api.sfx('point');
            api.cat('happy');
            confetti();
        }
        duoShow();
        againBtn.hidden = false;
        againBtn.focus();
    }

    function newRound() {
        round++;
        grid = [null, null, null, null, null, null, null, null, null];
        busy = false;
        api.cat('idle');
        board.querySelectorAll('.ttp-strike').forEach(function (s) { s.remove(); });
        cells.forEach(function (c) { c.innerHTML = ''; c.disabled = false; c.className = 'ttp-cell'; c.removeAttribute('aria-label'); });
        var nap = NAP_EVERY && round % NAP_EVERY === 0;
        if (nap) {
            put(Math.floor(Math.random() * 9), 'N');
            if (round === NAP_EVERY) api.say('A kitten naps on one square. Play around it!', 2400);
        }
        if (duo) {                                /* the starter changes every round */
            turn = tally.next;
            tally.next = turn === 'Y' ? 'C' : 'Y';
            picked = false;
            againBtn.hidden = true;
            return duoShow();
        }
        show(nap);
        if (round % 2 === 0) {                    /* the cat starts every other round */
            catTurn();
            turnEl.textContent = 'The cat starts';
        } else {
            turnEl.textContent = 'Your turn';
        }
    }

    api.on(board, 'click', function (e) {
        var c = e.target.closest('.ttp-cell');
        if (!c || busy || grid[+c.dataset.i]) return;
        put(+c.dataset.i, duo ? turn : 'Y');
        api.sfx(turn === 'C' ? 'move' : 'tap');
        var w = winner(grid);
        if (w) return finish(w);
        if (!duo) return catTurn();
        turn = turn === 'Y' ? 'C' : 'Y';
        duoShow();
    });
    if (duo) {
        api.on(againBtn, 'click', newRound);
        /* Reset: a new match, the tally back to 0 and a fresh board; Player 1 starts unless a starter was just picked */
        api.on(resetBtn, 'click', function () {
            var first = picked ? turn : 'Y';
            tally.p1 = tally.p2 = tally.draws = 0;
            tally.next = first;
            api.sfx('pop');
            newRound();
            api.say('New match! ' + name(first) + ' starts.', 1600);
        });
        api.on(startEl, 'click', function (e) {
            var b = e.target.closest('button');
            if (!b || busy || startEl.hidden || b.dataset.p === turn) return;
            turn = b.dataset.p;
            tally.next = turn === 'Y' ? 'C' : 'Y';   /* and the next round goes on alternating from here */
            picked = true;
            api.sfx('tap');
            duoShow();
        });
    }
    /* arrow keys move the focus between squares, Enter or Space plays (native button) */
    api.on(board, 'keydown', function (e) {
        var c = e.target.closest('.ttp-cell');
        var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
        if (!c || !d) return;
        e.preventDefault();
        var k = +c.dataset.i + d;
        while (k >= 0 && k < 9 && cells[k].disabled) k += d;      /* skip squares already taken */
        if (k >= 0 && k < 9) cells[k].focus();
    });
    if (level === 'hard' && !duo) api.say('On hard I never lose. Hold me to draws!', 2600);
    else if (duo && !(tally.p1 || tally.p2 || tally.draws)) api.say('Two players, one screen. I keep the score!', 2400);
    newRound();
}
})();
