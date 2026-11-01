/* Four in a Row: drop your paws into a 7 x 6 board, connect four before the cat's fish do.
   The cat plays an alpha-beta search (depth 2, 4 or 6 by difficulty, under a time budget). Score = wins in a row. */
Arcade.register('four-in-a-row', function fr(api) {
    'use strict';
    api.css(
        '.fr { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }' +
        '.fr-head { display: flex; flex-direction: column; align-items: center; gap: 8px; }' +
        '.fr-diff { display: flex; gap: 6px; }' +
        '.fr-diff button { padding: 5px 13px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; color: #475569; font: inherit;' +
        '  font-size: .88rem; font-weight: 600; cursor: pointer; }' +
        '.fr-diff button[aria-pressed="true"] { background: #1e3a8a; border-color: #1e3a8a; color: #fff; }' +
        '.fr-turn { min-height: 1.3em; font-weight: 700; color: #475569; }' +
        '.fr-play { position: relative; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }' +
        '.fr-aim { position: relative; height: var(--cs); }' +
        '.fr-board { position: relative; display: grid; grid-template-columns: repeat(7, var(--cs)); grid-auto-rows: var(--cs);' +
        '  padding: var(--pad); border-radius: calc(var(--cs) * .32); background: #bcd3f7; box-shadow: 0 6px 0 #93b4ea; }' +
        '.fr-hole { margin: calc(var(--off) - 1px); border-radius: 50%; background: #f8fafc; box-shadow: inset 0 3px 0 #dbe5f5; }' +
        '.fr-tok { position: absolute; width: var(--ts); height: var(--ts); border-radius: 50%; box-shadow: inset 0 -3px 0 rgba(15, 23, 42, .2); }' +
        '.fr-tok svg { display: block; width: 100%; height: 100%; fill: #fff; }' +
        '.fr-you { background: radial-gradient(circle at 35% 30%, #f06595, #d6336c 70%); }' +
        '.fr-cat { background: radial-gradient(circle at 35% 30%, #4263eb, #1e3a8a 70%); }' +
        '.fr-cat .eye { fill: #1e3a8a; }' +
        '.fr-aim .fr-tok { top: calc(var(--off) - var(--cs) * .08); transition: left .12s; opacity: .9; }' +
        '.fr-aim.off .fr-tok { opacity: 0; }' +
        '.fr-tok.win { box-shadow: 0 0 0 4px #fbbf24, 0 0 16px #fbbf24; animation: fr-pulse .5s ease-in-out infinite alternate; }' +
        '.fr-calm .fr-tok { animation: none !important; transition: none !important; }' +
        '@keyframes fr-pulse { from { transform: scale(1); } to { transform: scale(1.08); } }');

    var COLS = 7, ROWS = 6, YOU = 1, CAT = 2, WIN = 1000000;
    var level = fr.level == null ? 1 : fr.level;     /* 0 easy, 1 medium, 2 hard: kept on the factory across "Play again" */
    var NAMES = ['Easy', 'Medium', 'Hard'], DEPTH = [2, 4, 6];
    var ORDER = [3, 2, 4, 1, 5, 0, 6];            /* centre first: better moves first, more pruning */
    var ART = [0,                                 /* indexed by player: paw print, fish */
        '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="25" rx="7.5" ry="6.5"/><circle cx="11" cy="17" r="3.2"/>' +
        '<circle cx="16.5" cy="11.5" r="3.2"/><circle cx="23.5" cy="11.5" r="3.2"/><circle cx="29" cy="17" r="3.2"/></svg>',
        '<svg viewBox="0 0 40 40"><path d="M7 20c4-6 12-8 18-4l7-5v18l-7-5c-6 4-14 2-18-4z"/><circle class="eye" cx="13" cy="19" r="1.7"/></svg>'];

    /* every line of four as cell indices (cell = column * 6 + row, row 0 at the bottom), and the lines through each cell */
    var LINES = [], AT = [];
    for (var k = 0; k < COLS * ROWS; k++) AT.push([]);
    [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(function (d) {
        for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) {
            var ce = c + 3 * d[0], re = r + 3 * d[1];
            if (ce >= COLS || re < 0 || re >= ROWS) continue;
            var line = [0, 1, 2, 3].map(function (s) { return (c + s * d[0]) * ROWS + r + s * d[1]; });
            line.forEach(function (i) { AT[i].push(LINES.length); });
            LINES.push(line);
        }
    });

    var wrap = document.createElement('div');
    wrap.className = 'fr' + (api.reducedMotion ? ' fr-calm' : '');
    wrap.innerHTML = '<div class="fr-head"><div class="fr-diff" role="group" aria-label="Difficulty">' +
        NAMES.map(function (n, i) { return '<button type="button" data-d="' + i + '">' + n + '</button>'; }).join('') +
        '</div><div class="fr-turn" aria-live="polite"></div></div>' +
        '<div class="fr-play"><div class="fr-aim"><div class="fr-tok fr-you">' + ART[YOU] + '</div></div><div class="fr-board"></div></div>';
    api.el.appendChild(wrap);
    var play = wrap.querySelector('.fr-play'), aim = wrap.querySelector('.fr-aim'), aimTok = aim.firstChild;
    var boardEl = wrap.querySelector('.fr-board'), turnEl = wrap.querySelector('.fr-turn');
    var diffBtns = wrap.querySelectorAll('.fr-diff button');
    for (k = 0; k < COLS * ROWS; k++) boardEl.appendChild(document.createElement('div')).className = 'fr-hole';

    var cs = 60, pad = 7, off = 5;
    function fit(s) {
        cs = Math.max(30, Math.floor(Math.min((s.w - 24) / 7.3, (s.h - 110) / 7.6, 72)));
        pad = Math.round(cs * 0.12);
        off = Math.round(cs * 0.08);
        var v = { cs: cs, pad: pad, off: off, ts: cs - 2 * off };
        for (var n in v) wrap.style.setProperty('--' + n, v[n] + 'px');
        placeAim();
    }

    var grid, heights, moves, toks, cursor = 3, busy = true, over = false, wins = 0, round = 0, lastSay = 0, gen = 0;

    /* ---------- rules and the cat's search ---------- */
    function line4(i, p) {                        /* a line of four through cell i, all p, or null */
        var ls = AT[i];
        for (var n = 0; n < ls.length; n++) {
            var l = LINES[ls[n]];
            if (grid[l[0]] === p && grid[l[1]] === p && grid[l[2]] === p && grid[l[3]] === p) return l;
        }
        return null;
    }
    function winning(c, p) {                      /* would p connect four by dropping into column c? */
        if (heights[c] === ROWS) return false;
        var i = c * ROWS + heights[c];
        grid[i] = p;
        var w = line4(i, p);
        grid[i] = 0;
        return !!w;
    }
    var SCORE = [0, 1, 6, 40];
    function evaluate() {                         /* from the cat's side: open lines, weighted by how full they are */
        var s = 0;
        for (var r = 0; r < ROWS; r++) s += grid[3 * ROWS + r] === CAT ? 3 : grid[3 * ROWS + r] === YOU ? -3 : 0;
        for (var n = 0; n < LINES.length; n++) {
            var l = LINES[n], a = 0, b = 0;
            for (var j = 0; j < 4; j++) { var v = grid[l[j]]; if (v === CAT) a++; else if (v === YOU) b++; }
            if (!b) s += SCORE[a]; else if (!a) s -= SCORE[b];
        }
        return s;
    }
    var deadline = 0, nodes = 0, stopped = false;
    function negamax(depth, alpha, beta, p, ply) {
        if ((++nodes & 255) === 0 && performance.now() > deadline) stopped = true;
        if (stopped) return 0;
        if (moves === COLS * ROWS) return 0;
        if (depth === 0) return p === CAT ? evaluate() : -evaluate();
        var n, c, best = -Infinity;
        for (n = 0; n < COLS; n++) if (winning(ORDER[n], p)) return WIN - ply;   /* a win on the spot ends it here */
        for (n = 0; n < COLS; n++) {
            c = ORDER[n];
            if (heights[c] === ROWS) continue;
            var i = c * ROWS + heights[c]++;
            grid[i] = p; moves++;
            var v = -negamax(depth - 1, -beta, -alpha, 3 - p, ply + 1);
            grid[i] = 0; moves--; heights[c]--;
            if (v > best) best = v;
            if (best > alpha) alpha = best;
            if (alpha >= beta) break;
        }
        return best;
    }
    /* iterative deepening up to the level's depth; stops early when the time budget is used up */
    function catMove() {
        var legal = ORDER.filter(function (c) { return heights[c] < ROWS; });
        if (level === 0 && Math.random() < 0.25) return legal[Math.floor(Math.random() * legal.length)];   /* the cat gets distracted */
        deadline = performance.now() + 110;
        stopped = false;
        var pick = legal;
        for (var d = 1; d <= DEPTH[level]; d++) {
            var best = -Infinity, moves2 = [];
            for (var n = 0; n < legal.length && !stopped; n++) {
                var c = legal[n], v = WIN;
                if (!winning(c, CAT)) {
                    var i = c * ROWS + heights[c]++;
                    grid[i] = CAT; moves++;
                    /* the window (best - 1) still tells equal moves apart, so ties can be broken at random */
                    v = -negamax(d - 1, -Infinity, 1 - best, YOU, 1);
                    grid[i] = 0; moves--; heights[c]--;
                }
                if (v > best) { best = v; moves2 = [c]; } else if (v === best) moves2.push(c);
            }
            if (stopped) break;
            pick = moves2;
            if (best >= WIN - 50 || best <= 50 - WIN) break;     /* the outcome is already decided */
        }
        return pick[Math.floor(Math.random() * pick.length)];
    }

    /* ---------- board and turns ---------- */
    function later(fn, ms) {                      /* a timeout that is dropped once a new round has begun */
        var g = gen;
        api.timeout(function () { if (g === gen) fn(); }, ms);
    }
    function placeAim() {
        aimTok.style.left = (pad + cursor * cs + off) + 'px';
    }
    function showAim() { aim.classList.toggle('off', busy || over); }
    function status(t) { turnEl.textContent = t; }
    function chat(text, mood, force) {            /* not more than one comment every few moves */
        if (mood) api.cat(mood);
        if (!force && moves - lastSay < 6) return;
        lastSay = moves;
        api.say(text, 1800);
    }
    function drop(c, p, then) {
        var r = heights[c]++, i = c * ROWS + r;
        grid[i] = p;
        moves++;
        var t = document.createElement('div');
        t.className = 'fr-tok ' + (p === YOU ? 'fr-you' : 'fr-cat');
        t.innerHTML = ART[p];
        t.style.left = 'calc(var(--cs) * ' + c + ' + var(--off) + var(--pad))';
        t.style.top = 'calc(var(--cs) * ' + (ROWS - 1 - r) + ' + var(--off) + var(--pad))';
        boardEl.appendChild(t);
        toks[i] = t;
        api.sfx(p === YOU ? 'tap' : 'move');
        var ms = 0;
        if (!api.reducedMotion && t.animate) {
            var dist = (ROWS - r) * cs + pad, bounce = Math.round(cs * 0.12);
            ms = 160 + 40 * (ROWS - r);
            t.animate([
                { transform: 'translateY(' + -dist + 'px)', easing: 'cubic-bezier(.5, 0, 1, 1)' },
                { transform: 'none', offset: 0.78, easing: 'ease-out' },
                { transform: 'translateY(' + -bounce + 'px)', offset: 0.9, easing: 'ease-in' },
                { transform: 'none' }], ms);
        }
        later(function () { then(line4(i, p)); }, ms);
    }
    function check(line, p) {                     /* after a drop: true if the round is over */
        if (line) {
            line.forEach(function (i) { toks[i].classList.add('win'); });
            finish(p);
            return true;
        }
        if (moves === COLS * ROWS) { finish(0); return true; }
        return false;
    }
    function finish(p) {
        busy = true;
        showAim();
        if (p === YOU) {
            wins++;
            api.score(wins, 'Wins');
            status('Four paws in a row!');
            api.sfx('point');
            chat(['Hmph.', 'Lucky paw!', 'I was just warming up.', 'Again!'][wins % 4], 'sad', true);
            later(newRound, 1700);
        } else if (p === CAT) {
            over = true;
            status('Four fish in a row');
            api.say('Meow! Four fish.', 2000);
            api.end({ score: wins, win: false, text: 'The cat connects four.\nYour streak: ' + wins + (wins === 1 ? ' win' : ' wins') + ' (' + NAMES[level] + ')' });
        } else {
            status('A draw. Again!');
            api.sfx('move');
            chat('Full board! A draw.', 'think', true);
            later(newRound, 1700);
        }
    }
    function catTurn(text) {
        busy = true;
        showAim();
        status(text || 'The cat is thinking…');
        api.cat('think');
        later(function () {                       /* short pause first so the screen shows the last move */
            var threat = -1;                      /* did you have a winning drop? */
            for (var c = 0; c < COLS; c++) if (winning(c, YOU)) threat = c;
            var t0 = performance.now(), col = catMove();
            boardEl.dataset.ms = (performance.now() - t0).toFixed(1);   /* last search time, handy for testing */
            api.cat('idle');
            drop(col, CAT, function (line) {
                if (check(line, CAT)) return;
                if (col === threat) chat(['Not so fast!', 'I saw that.', 'Nice try!'][Math.floor(Math.random() * 3)], 'wow');
                busy = false;
                showAim();
                status('Your turn');
            });
        }, 260 + Math.random() * 200);
    }
    function youDrop(c) {
        if (busy || over || heights[c] === ROWS) return;
        cursor = c;
        placeAim();
        busy = true;
        showAim();
        drop(c, YOU, function (line) {
            if (!check(line, YOU)) catTurn();
        });
    }
    function newRound() {
        round++;
        gen++;
        grid = new Int8Array(COLS * ROWS);
        heights = [0, 0, 0, 0, 0, 0, 0];
        moves = 0;
        lastSay = 0;
        toks = [];
        boardEl.querySelectorAll('.fr-tok').forEach(function (t) { t.remove(); });
        api.cat('idle');
        if (round % 2 === 0) {                    /* the cat starts every other round */
            catTurn('The cat starts');
        } else {
            busy = false;
            showAim();
            status('Your turn (' + NAMES[level] + ')');
        }
    }
    function setLevel(d) {
        level = fr.level = d;
        diffBtns.forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.d === level); });
    }

    /* ---------- input ---------- */
    function colAt(e) {
        var x = e.clientX - boardEl.getBoundingClientRect().left - pad;
        return Math.max(0, Math.min(COLS - 1, Math.floor(x / cs)));
    }
    api.on(play, 'click', function (e) { youDrop(colAt(e)); });
    api.on(play, 'pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        cursor = colAt(e);
        placeAim();
    });
    api.on(wrap.querySelector('.fr-diff'), 'click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        b.blur();
        if (+b.dataset.d === level || over) return;
        setLevel(+b.dataset.d);                   /* a new level starts a new streak */
        wins = 0;
        round = 0;
        api.score(0, 'Wins');
        api.say(['Easy, I will go gently.', 'Medium it is.', 'Hard! Paws ready.'][level], 1800);
        newRound();
    });
    api.on(document, 'keydown', function (e) {
        if (busy || over || e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key, active = document.activeElement;
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
            cursor = Math.max(0, Math.min(COLS - 1, cursor + (k === 'ArrowLeft' ? -1 : 1)));
            placeAim();
            api.sfx('move');
        } else if (k === 'Enter' || k === ' ' || k === 'ArrowDown') {
            if (k !== 'ArrowDown' && active && active.tagName === 'BUTTON') return;   /* the button's own click wins */
            youDrop(cursor);
        } else if (/^[1-7]$/.test(k)) {
            youDrop(+k - 1);
        } else return;
        e.preventDefault();
    });

    fit(api.size());
    api.onResize(fit);
    setLevel(level);
    api.score(0, 'Wins');
    newRound();
});
