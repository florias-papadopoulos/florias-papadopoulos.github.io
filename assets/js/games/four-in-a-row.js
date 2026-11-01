/* Four in a Row: drop your paws into the board, connect four (7 x 6 board) or, in the five mode, five (9 x 7 board)
   before the cat's fish do. The mode toggle above the board is remembered and starts a fresh run. Rounds go on until
   the cat has won three of them; score = your round wins (one best per difficulty, shared by both modes).
   Easy: the cat looks two moves ahead, is often distracted and you may take back two moves a round; normal: four
   moves ahead; hard: alpha-beta search with iterative deepening, a transposition table and forced-move extensions
   under a 300 ms budget (about ten moves ahead on a laptop in the four mode). */
Arcade.register('four-in-a-row', function fr(api) {
    'use strict';
    api.css(
        '.fr { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }' +
        '.fr-head { display: flex; flex-direction: column; align-items: center; gap: 8px; }' +
        '.fr-mode { display: flex; padding: 3px; border-radius: 999px; background: #e7eefb; box-shadow: inset 0 1px 2px rgba(30, 58, 138, .12); }' +
        '.fr-mode button { padding: 4px 13px; border: none; border-radius: 999px; background: none; color: #5b6b86; font: inherit; font-size: .84rem;' +
        '  font-weight: 700; cursor: pointer; transition: background-color .15s, color .15s; }' +
        '.fr-mode button[aria-pressed="true"] { background: #fff; color: #1e3a8a; box-shadow: 0 2px 0 #c9d7f2; cursor: default; }' +
        '.fr-mode button:focus-visible { outline: 3px solid #f6a23a; outline-offset: 1px; }' +
        '.fr-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }' +
        '.fr-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 11px 3px 4px; border-radius: 999px; background: #fff;' +
        '  box-shadow: 0 2px 0 #e9dfcf; color: #475569; font-size: .88rem; font-weight: 700; font-variant-numeric: tabular-nums; }' +
        '.fr-chip .fr-tok { position: static; width: 20px; height: 20px; box-shadow: none; }' +
        '.fr-pip { width: 10px; height: 10px; border-radius: 50%; background: #e2e8f0; }' +
        '.fr-pip.on { background: #4c6ef5; }' +
        '.fr-round { color: #94a3b8; font-size: .85rem; font-weight: 700; }' +
        '.fr-undo { padding: 4px 12px; border: none; border-radius: 999px; background: #fff1dc; color: #c2620a; font: inherit; font-size: .85rem;' +
        '  font-weight: 700; cursor: pointer; box-shadow: 0 2px 0 #f8d3a6; }' +
        '.fr-undo:disabled { opacity: .45; cursor: default; }' +
        '.fr-turn { min-height: 1.3em; font-weight: 700; color: #475569; }' +
        '.fr-play { position: relative; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }' +
        '.fr-aim { position: relative; height: var(--cs); }' +
        '.fr-board { position: relative; display: grid; grid-template-columns: repeat(var(--cols), var(--cs)); grid-auto-rows: var(--cs);' +
        '  padding: var(--pad); border-radius: calc(var(--cs) * .34); background: linear-gradient(170deg, #b9d0f6, #9dbcef);' +
        '  box-shadow: 0 7px 0 #7fa2e2, 0 18px 34px rgba(30, 58, 138, .16), inset 0 2px 0 rgba(255, 255, 255, .55); }' +
        '.fr-hole { margin: calc(var(--off) - 1px); border-radius: 50%; background: #f7f4ee; box-shadow: inset 0 4px 0 #d6e0f2, inset 0 -1px 0 #fff; }' +
        '.fr-col { position: absolute; top: calc(var(--pad) * .5); bottom: calc(var(--pad) * .5); width: var(--cs); border-radius: calc(var(--cs) * .5);' +
        '  background: rgba(255, 255, 255, .35); opacity: 0; transition: opacity .15s, left .1s; pointer-events: none; }' +
        '.fr-col.on { opacity: 1; }' +
        '.fr-tok { position: absolute; width: var(--ts); height: var(--ts); border-radius: 50%; box-shadow: inset 0 -4px 0 rgba(15, 23, 42, .18), 0 2px 3px rgba(15, 23, 42, .12); }' +
        '.fr-tok svg { display: block; width: 100%; height: 100%; }' +
        '.fr-you { background: radial-gradient(circle at 35% 28%, #ffc078, #f08c2e 55%, #e8590c); }' +
        '.fr-you svg { fill: #fff7ec; }' +
        '.fr-cat { background: radial-gradient(circle at 35% 28%, #91a7ff, #4c6ef5 55%, #3b5bdb); }' +
        '.fr-cat svg { fill: #fff; } .fr-cat .eye { fill: #3b5bdb; }' +
        '.fr-tok.ghost { opacity: .3; box-shadow: none; transition: top .1s, left .1s; pointer-events: none; }' +
        '.fr-aim .fr-tok { top: calc(var(--off) - var(--cs) * .08); transition: left .12s; }' +
        '.fr-aim.off .fr-tok, .fr-play .off { opacity: 0; }' +
        '.fr-tok.win { box-shadow: 0 0 0 4px #ffd43b, 0 0 18px #fab005; animation: fr-pulse .5s ease-in-out infinite alternate; }' +
        '.fr-tok.dim { opacity: .45; transition: opacity .4s; }' +
        '.fr-strike { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }' +
        '.fr-strike line { stroke: #fff; stroke-width: 6; stroke-linecap: round; opacity: .9; stroke-dasharray: 2000; animation: fr-draw .5s ease-out both; }' +
        '.fr-bit { position: absolute; width: 8px; height: 12px; border-radius: 2px; pointer-events: none; animation: fr-bit 1.2s ease-out forwards; }' +
        '.fr-calm *, .fr-calm .fr-tok { animation: none !important; transition: none !important; }' +
        '@keyframes fr-pulse { from { transform: scale(1); } to { transform: scale(1.08); } }' +
        '@keyframes fr-draw { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }' +
        '@keyframes fr-bit { 55% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 1; }' +
        '  100% { transform: translate(var(--x), calc(var(--y) + 110px)) rotate(var(--r)); opacity: 0; } }');

    var MODES = {                                 /* columns, rows, discs in a row, weights of an open line with 0, 1, 2, ... discs */
        four: { cols: 7, rows: 6, n: 4, name: 'Four', w: [0, 1, 8, 50, 1000] },
        five: { cols: 9, rows: 7, n: 5, name: 'Five', w: [0, 1, 4, 20, 90, 1000] }
    };
    var mode = fr.mode || 'four';                 /* kept on the factory too, in case localStorage is not available */
    try { mode = localStorage.getItem('arcade-fr-mode') || mode; } catch (e) { /* private mode: keep the factory's */ }
    if (!MODES[mode]) mode = 'four';
    var M = MODES[mode], COLS = M.cols, ROWS = M.rows, N = M.n;
    var YOU = 1, CAT = 2, WIN = 1000000, LIVES = 3;
    var level = api.level();
    var CFG = {                                   /* search depth, time budget (ms), chance of a random move, undos per round */
        easy: { depth: 2, ms: 60, mistake: 0.4, undo: 2 },
        normal: { depth: 4, ms: 150, mistake: 0.05, undo: 0 },
        hard: { depth: 63, ms: 300, mistake: 0, undo: 0 }
    }[level];
    var MID = (COLS - 1) / 2, ORDER = [];         /* centre first: better moves first, more pruning */
    for (var k = 0; k < COLS; k++) ORDER.push(k);
    ORDER.sort(function (a, b) { return Math.abs(a - MID) - Math.abs(b - MID) || a - b; });
    var ART = [0,                                 /* indexed by player: paw print, fish */
        '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="25" rx="7.5" ry="6.5"/><circle cx="11" cy="17" r="3.2"/>' +
        '<circle cx="16.5" cy="11.5" r="3.2"/><circle cx="23.5" cy="11.5" r="3.2"/><circle cx="29" cy="17" r="3.2"/></svg>',
        '<svg viewBox="0 0 40 40"><path d="M7 20c4-6 12-8 18-4l7-5v18l-7-5c-6 4-14 2-18-4z"/><circle class="eye" cx="13" cy="19" r="1.7"/></svg>'];

    /* every line of N as cell indices (cell = column * ROWS + row, row 0 at the bottom), and the lines through each cell */
    var LINES = [], AT = [], STEPS = [];
    for (k = 0; k < N; k++) STEPS.push(k);
    for (k = 0; k < COLS * ROWS; k++) AT.push([]);
    [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(function (d) {
        for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) {
            var ce = c + (N - 1) * d[0], re = r + (N - 1) * d[1];
            if (ce >= COLS || re < 0 || re >= ROWS) continue;
            var line = STEPS.map(function (s) { return (c + s * d[0]) * ROWS + r + s * d[1]; });
            line.forEach(function (i) { AT[i].push(LINES.length); });
            LINES.push(line);
        }
    });

    var wrap = document.createElement('div');
    wrap.className = 'fr' + (api.reducedMotion ? ' fr-calm' : '');
    wrap.innerHTML = '<div class="fr-head"><div class="fr-mode" role="group" aria-label="Game mode">' +
        '<button type="button" data-m="four">Four in a row</button><button type="button" data-m="five">Five in a row</button></div><div class="fr-bar">' +
        '<span class="fr-chip" title="Your round wins"><span class="fr-tok fr-you">' + ART[YOU] + '</span>You <b class="fr-wins">0</b></span>' +
        '<span class="fr-round"></span>' +
        '<span class="fr-chip" title="Rounds the cat has won (three end the game)"><span class="fr-tok fr-cat">' + ART[CAT] + '</span>Cat ' +
        '<span class="fr-pip"></span><span class="fr-pip"></span><span class="fr-pip"></span></span>' +
        (CFG.undo ? '<button type="button" class="fr-undo"></button>' : '') +
        '</div><div class="fr-turn" aria-live="polite"></div></div>' +
        '<div class="fr-play"><div class="fr-aim"><div class="fr-tok fr-you">' + ART[YOU] + '</div></div>' +
        '<div class="fr-board"><div class="fr-col"></div><div class="fr-tok fr-you ghost off">' + ART[YOU] + '</div></div></div>';
    api.el.appendChild(wrap);
    var play = wrap.querySelector('.fr-play'), aim = wrap.querySelector('.fr-aim'), aimTok = aim.firstChild;
    var boardEl = wrap.querySelector('.fr-board'), turnEl = wrap.querySelector('.fr-turn'), undoBtn = wrap.querySelector('.fr-undo');
    var colEl = wrap.querySelector('.fr-col'), ghost = wrap.querySelector('.ghost'), pips = wrap.querySelectorAll('.fr-pip');
    var modeBtns = wrap.querySelectorAll('.fr-mode button');
    modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === mode); });
    wrap.style.setProperty('--cols', COLS);
    for (k = 0; k < COLS * ROWS; k++) boardEl.appendChild(document.createElement('div')).className = 'fr-hole';

    var cs = 60, pad = 7, off = 5;
    function fit(s) {
        cs = Math.max(30, Math.floor(Math.min((s.w - 24) / (COLS + 0.3), (s.h - 170) / (ROWS + 1.7), 72)));
        pad = Math.round(cs * 0.12);
        off = Math.round(cs * 0.08);
        var v = { cs: cs, pad: pad, off: off, ts: cs - 2 * off };
        for (var n in v) wrap.style.setProperty('--' + n, v[n] + 'px');
        placeAim();
    }

    /* ---------- the position, kept up to date incrementally so the search is fast ---------- */
    var grid = new Int8Array(COLS * ROWS), heights = new Int8Array(COLS), moves = 0;
    var cnt = new Int8Array(LINES.length * 3);    /* discs of each player in each line */
    var score = 0;                                /* the evaluation from the cat's side: sum of lineValue over all lines */
    var W = M.w;
    var ZA = new Int32Array(COLS * ROWS * 3), ZB = new Int32Array(COLS * ROWS * 3), hashA = 0, hashB = 0;   /* Zobrist keys */
    for (k = 0; k < ZA.length; k++) { ZA[k] = Math.random() * 4294967296 | 0; ZB[k] = Math.random() * 4294967296 | 0; }
    function lineValue(n) {                       /* lines with both colours in them are dead */
        var a = cnt[n * 3 + CAT], b = cnt[n * 3 + YOU];
        return b ? (a ? 0 : -W[b]) : W[a];
    }
    function put(c, p) {                          /* drop p into column c; true if that connects N */
        var i = c * ROWS + heights[c]++, ls = AT[i], won = false;
        grid[i] = p;
        moves++;
        hashA ^= ZA[i * 3 + p]; hashB ^= ZB[i * 3 + p];
        for (var n = 0; n < ls.length; n++) {
            score -= lineValue(ls[n]);
            if (++cnt[ls[n] * 3 + p] === N) won = true;
            score += lineValue(ls[n]);
        }
        return won;
    }
    function take(c) {                            /* undo the top disc of column c */
        var i = c * ROWS + --heights[c], p = grid[i], ls = AT[i];
        grid[i] = 0;
        moves--;
        hashA ^= ZA[i * 3 + p]; hashB ^= ZB[i * 3 + p];
        for (var n = 0; n < ls.length; n++) {
            score -= lineValue(ls[n]);
            cnt[ls[n] * 3 + p]--;
            score += lineValue(ls[n]);
        }
    }
    function wins(c, p) {                         /* would p connect N by dropping into column c? */
        if (heights[c] === ROWS) return false;
        var ls = AT[c * ROWS + heights[c]];
        for (var n = 0; n < ls.length; n++) if (cnt[ls[n] * 3 + p] === N - 1) return true;
        return false;
    }

    /* ---------- the cat's search: negamax with alpha-beta and a transposition table ---------- */
    var TT = 1 << 19, ttKey = new Int32Array(TT), ttVal = new Int32Array(TT), ttDepth = new Int8Array(TT);
    var ttFlag = new Int8Array(TT), ttMove = new Int8Array(TT);   /* flag 0 exact, 1 lower bound, 2 upper bound; move + 1 */
    var MATE = WIN - 100;                         /* values beyond this are wins, stored relative to the node */
    function toTT(v, ply) { return v > MATE ? v + ply : v < -MATE ? v - ply : v; }
    function fromTT(v, ply) { return v > MATE ? v - ply : v < -MATE ? v + ply : v; }
    var deadline = 0, nodes = 0, stopped = false;
    function negamax(depth, alpha, beta, p, ply) {
        if ((++nodes & 1023) === 0 && performance.now() > deadline) stopped = true;
        if (stopped) return 0;
        var o = 3 - p, c, n, v, threat = -1;
        for (c = 0; c < COLS; c++) if (wins(c, p)) return WIN - ply;     /* a win on the spot ends it here */
        if (moves === COLS * ROWS) return 0;
        for (c = 0; c < COLS; c++) {
            if (!wins(c, o)) continue;
            if (threat >= 0) return ply + 1 - WIN;                          /* two threats: cannot block both */
            threat = c;
        }
        if (depth <= 0 && threat < 0) return p === CAT ? score : -score;   /* forced blocks are searched further */
        var idx = hashA & (TT - 1), hit = depth > 0 && ttKey[idx] === hashB && ttMove[idx] > 0, first = -1;
        if (hit) {
            first = ttMove[idx] - 1;
            if (ttDepth[idx] >= depth) {
                v = fromTT(ttVal[idx], ply);
                if (ttFlag[idx] === 0 || (ttFlag[idx] === 1 && v >= beta) || (ttFlag[idx] === 2 && v <= alpha)) return v;
            }
        }
        var list = threat >= 0 ? [threat] : first >= 0 ? [first] : [];
        if (threat < 0) for (n = 0; n < COLS; n++) if (ORDER[n] !== first && heights[ORDER[n]] < ROWS) list.push(ORDER[n]);
        var alpha0 = alpha, best = -Infinity, bestMove = list[0];
        for (n = 0; n < list.length; n++) {
            c = list[n];
            put(c, p);
            v = -negamax(depth - 1, -beta, -alpha, o, ply + 1);
            take(c);
            if (stopped) return 0;
            if (v > best) { best = v; bestMove = c; }
            if (v > alpha) alpha = v;
            if (alpha >= beta) break;
        }
        if (depth > 0) {
            ttKey[idx] = hashB; ttVal[idx] = toTT(best, ply); ttDepth[idx] = depth; ttMove[idx] = bestMove + 1;
            ttFlag[idx] = best <= alpha0 ? 2 : best >= beta ? 1 : 0;
        }
        return best;
    }
    /* iterative deepening up to the level's depth or until the time budget is used up; returns {col, value} */
    function catMove() {
        var legal = ORDER.filter(function (c) { return heights[c] < ROWS; }), c, n;
        for (n = 0; n < legal.length; n++) if (wins(legal[n], CAT)) return { col: legal[n], value: WIN };
        if (Math.random() < CFG.mistake) return { col: legal[Math.floor(Math.random() * legal.length)], value: 0 };   /* the cat gets distracted */
        if (moves === 0 && level !== 'easy') return { col: ORDER[0], value: 0 };   /* the centre is the best first move */
        deadline = performance.now() + CFG.ms;
        stopped = false;
        nodes = 0;
        var pick = legal, value = 0, scores = {};
        for (var d = 1; d <= CFG.depth && d <= COLS * ROWS - moves; d++) {
            var best = -Infinity, top = [];
            for (n = 0; n < legal.length; n++) {
                c = legal[n];
                put(c, CAT);
                /* the window (best - 1) still tells equal moves apart, so ties can be broken at random */
                var v = -negamax(d - 1, -Infinity, 1 - best, YOU, 1);
                take(c);
                if (stopped) break;
                scores[c] = v;
                if (v > best) { best = v; top = [c]; } else if (v === best) top.push(c);
            }
            if (stopped) break;
            pick = top;
            value = best;
            legal.sort(function (x, y) { return scores[y] - scores[x]; });   /* best first in the next, deeper pass */
            if (best > MATE || best < -MATE) break;                         /* the outcome is already decided */
        }
        boardEl.dataset.depth = d - 1;             /* handy for testing */
        return { col: pick[Math.floor(Math.random() * pick.length)], value: value };
    }

    /* ---------- board and turns ---------- */
    var toks, history, wins0 = 0, losses = 0, round = 0, cursor = ORDER[0], busy = true, over = false, lastSay = 0, gen = 0;
    var undos = 0, boasted = false;
    function later(fn, ms) {                      /* a timeout that is dropped once a new round has begun */
        var g = gen;
        api.timeout(function () { if (g === gen) fn(); }, ms);
    }
    function xy(i) {                              /* centre of cell i inside the board, in px */
        return { x: pad + Math.floor(i / ROWS) * cs + cs / 2, y: pad + (ROWS - 1 - i % ROWS) * cs + cs / 2 };
    }
    function placeAim() {
        aimTok.style.left = (pad + cursor * cs + off) + 'px';
        colEl.style.left = (pad + cursor * cs) + 'px';
        if (!heights || heights[cursor] === ROWS) { ghost.classList.add('off'); return; }
        var p = xy(cursor * ROWS + heights[cursor]);
        ghost.style.left = (p.x - cs / 2 + off) + 'px';
        ghost.style.top = (p.y - cs / 2 + off) + 'px';
    }
    var hovering = false;
    function showAim() {
        var idle = busy || over;
        aim.classList.toggle('off', idle);
        colEl.classList.toggle('on', !idle && hovering);
        ghost.classList.toggle('off', idle || !hovering || heights[cursor] === ROWS);
        if (undoBtn) {
            undoBtn.textContent = 'Undo (' + undos + ')';
            undoBtn.disabled = idle || !undos || !history.some(function (h) { return h.p === YOU; });
        }
    }
    function status(t) { turnEl.textContent = t; }
    function chat(text, mood, force) {            /* not more than one comment every few moves */
        if (mood) api.cat(mood);
        if (!force && moves - lastSay < 6) return;
        lastSay = moves;
        api.say(text, 1800);
    }
    function showScore() {
        api.score(wins0, 'Wins');
        wrap.querySelector('.fr-wins').textContent = wins0;
        pips.forEach(function (pip, n) { pip.classList.toggle('on', n < losses); });
        wrap.querySelector('.fr-round').textContent = 'Round ' + round;
    }
    function drop(c, p, then) {
        var i = c * ROWS + heights[c], won = put(c, p), r = i % ROWS;
        history.push({ c: c, p: p });
        var t = document.createElement('div'), at = xy(i);
        t.className = 'fr-tok ' + (p === YOU ? 'fr-you' : 'fr-cat');
        t.innerHTML = ART[p];
        t.style.left = 'calc(var(--cs) * ' + c + ' + var(--off) + var(--pad))';
        t.style.top = 'calc(var(--cs) * ' + (ROWS - 1 - r) + ' + var(--off) + var(--pad))';
        boardEl.appendChild(t);
        toks[i] = t;
        api.sfx(p === YOU ? 'tap' : 'move');
        var ms = 0;
        if (!api.reducedMotion && t.animate) {
            var dist = at.y + cs / 2, bounce = Math.round(cs * 0.14);
            ms = 180 + 45 * (ROWS - r);
            t.animate([
                { transform: 'translateY(' + -dist + 'px)', easing: 'cubic-bezier(.5, 0, 1, 1)' },
                { transform: 'none', offset: 0.7, easing: 'ease-out' },
                { transform: 'translateY(' + -bounce + 'px) scale(1.02, .98)', offset: 0.84, easing: 'ease-in' },
                { transform: 'scale(1.06, .94)', offset: 0.93 },
                { transform: 'none' }], ms);
        }
        later(function () {
            if (!won) return then(null);
            for (var n = 0; n < AT[i].length; n++) if (cnt[AT[i][n] * 3 + p] === N) return then(LINES[AT[i][n]]);
        }, ms);
    }
    function strike(line) {                       /* a line through the winning discs */
        var a = xy(line[0]), b = xy(line[N - 1]);
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'fr-strike');
        svg.innerHTML = '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>';
        boardEl.appendChild(svg);
    }
    function confetti() {                         /* paper bits flying out from the top of the board */
        if (api.reducedMotion) return;
        var colors = ['#f6a23a', '#ffd43b', '#4c6ef5', '#f783ac', '#69db7c'];
        var x = play.offsetLeft + play.offsetWidth / 2, y = play.offsetTop + cs * 2;
        for (var n = 0; n < 44; n++) {
            var p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 170;
            p.className = 'fr-bit';
            p.style.cssText = 'left:' + x + 'px; top:' + y + 'px; background:' + colors[n % colors.length] + '; --x:' + Math.round(Math.cos(a) * d) +
                'px; --y:' + Math.round(Math.sin(a) * d - 70) + 'px; --r:' + Math.round(Math.random() * 720 - 360) + 'deg';
            wrap.appendChild(p);
            api.timeout(p.remove.bind(p), 1300);
        }
    }
    function check(line, p) {                     /* after a drop: true if the round is over */
        if (line) {
            toks.forEach(function (t, i) { if (t && line.indexOf(i) < 0) t.classList.add('dim'); });
            line.forEach(function (i) { toks[i].classList.add('win'); });
            strike(line);
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
            wins0++;
            showScore();
            status(M.name + ' paws in a row!');
            api.sfx('point');
            confetti();
            chat(['Hmph.', 'Lucky paw!', 'I was just warming up.', 'Again!'][wins0 % 4], 'sad', true);
            later(newRound, 2000);
        } else if (p === CAT) {
            losses++;
            showScore();
            if (losses < LIVES) {
                status(M.name + ' fish in a row. ' + (LIVES - losses) + (LIVES - losses === 1 ? ' life left' : ' lives left'));
                api.sfx('hit');
                chat(['Meow! ' + M.name + ' fish.', 'Mine!', 'Purrfect line.'][losses % 3], 'happy', true);
                later(newRound, 2200);
            } else {
                over = true;
                status(M.name + ' fish in a row');
                api.say('Meow! Three rounds to me.', 2000);
                api.end({ score: wins0, win: false, text: 'The cat won three rounds.\nYou won ' + wins0 + (wins0 === 1 ? ' round' : ' rounds') + '\n(' + M.name.toLowerCase() + ' in a row, ' + level + ')' });
            }
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
            for (var c = 0; c < COLS; c++) if (wins(c, YOU)) threat = c;
            var t0 = performance.now(), m = catMove();
            boardEl.dataset.ms = (performance.now() - t0).toFixed(1);   /* last search time, handy for testing */
            api.cat('idle');
            drop(m.col, CAT, function (line) {
                if (check(line, CAT)) return;
                if (m.value > MATE && m.value < WIN && !boasted) {
                    boasted = true;
                    chat(['I see a way to win.', 'Purr. This looks good for me.', 'Got you now, I think.'][Math.floor(Math.random() * 3)], 'happy', true);
                } else if (m.col === threat) {
                    chat(['Not so fast!', 'I saw that.', 'Nice try!'][Math.floor(Math.random() * 3)], 'wow');
                } else if (m.value < -MATE) {
                    chat('Oh no. Oh no no.', 'wow');
                }
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
    function undo() {                             /* take back the cat's reply and your last move */
        if (busy || over || !undos) return;
        var n = 0;
        while (history.length && n < 2) {
            var h = history[history.length - 1];
            if (n === 0 && h.p === YOU) n = 1;    /* nothing from the cat to take back yet */
            history.pop();
            take(h.c);
            var i = h.c * ROWS + heights[h.c];
            toks[i].remove();
            toks[i] = null;
            n++;
        }
        undos--;
        api.sfx('pop');
        placeAim();
        showAim();
        status('Your turn');
    }
    function newRound() {
        round++;
        gen++;
        grid.fill(0); heights.fill(0); cnt.fill(0);
        moves = 0; score = 0; hashA = 0; hashB = 0;
        lastSay = 0;
        toks = [];
        history = [];
        undos = CFG.undo;
        boasted = false;
        boardEl.querySelectorAll('.fr-tok:not(.ghost), .fr-strike').forEach(function (t) { t.remove(); });
        showScore();
        placeAim();
        api.cat('idle');
        if (round % 2 === 0) {                    /* the cat starts every other round */
            catTurn('The cat starts');
        } else {
            busy = false;
            showAim();
            status('Your turn');
        }
    }

    /* ---------- input ---------- */
    function colAt(e) {
        var x = e.clientX - boardEl.getBoundingClientRect().left - pad;
        return Math.max(0, Math.min(COLS - 1, Math.floor(x / cs)));
    }
    api.on(play, 'click', function (e) { youDrop(colAt(e)); });
    api.on(play, 'pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        hovering = true;
        cursor = colAt(e);
        placeAim();
        showAim();
    });
    api.on(play, 'pointerleave', function () { hovering = false; showAim(); });
    if (undoBtn) api.on(undoBtn, 'click', function () { undoBtn.blur(); undo(); });
    /* the mode toggle: remember the choice and start a fresh run */
    api.on(wrap.querySelector('.fr-mode'), 'click', function (e) {
        var b = e.target.closest('button');
        if (!b || b.dataset.m === mode) return;
        fr.mode = b.dataset.m;
        try { localStorage.setItem('arcade-fr-mode', fr.mode); } catch (err) { /* remembered on the factory only */ }
        api.restart();
    });
    api.on(document, 'keydown', function (e) {
        if (busy || over || e.ctrlKey || e.metaKey || e.altKey) return;
        var key = e.key, active = document.activeElement;
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            cursor = Math.max(0, Math.min(COLS - 1, cursor + (key === 'ArrowLeft' ? -1 : 1)));
            placeAim();
            api.sfx('move');
        } else if (key === 'Enter' || key === ' ' || key === 'ArrowDown') {
            if (key !== 'ArrowDown' && active && active.tagName === 'BUTTON') return;   /* the button's own click wins */
            youDrop(cursor);
        } else if (/^[1-9]$/.test(key) && +key <= COLS) {
            youDrop(+key - 1);
        } else if (key === 'u' || key === 'Backspace') {
            undo();
        } else return;
        e.preventDefault();
    });

    fit(api.size());
    api.onResize(fit);
    if (level === 'hard') api.say('Hard: I think far ahead. Good luck!', 2400);
    else if (level === 'easy') api.say('Easy: I will go gently. Undo is allowed.', 2400);
    newRound();
});
