/* Mouse Sweeper: find the hidden mice on the lawn. Numbers count the mice next to a cell; mark the mice with paws.
   The first tap always opens a patch. Tapping a number with as many paws around it opens the rest (chording).
   The cat's sniff shows a safe cell (a few times on easy, once otherwise); on easy the cat also catches the first
   mouse you uncover (+10 s). Board size and mice per difficulty; the long side of the board follows the screen.
   Score = seconds, best = fastest win. Shell API: assets/js/games/arcade.js. */
Arcade.register('mouse-sweeper', function (api) {
    'use strict';
    api.css(
        '.ms { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;' +
        '  -webkit-user-select: none; user-select: none; }' +
        '.ms-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; align-items: center; font-weight: 800; color: #475569; }' +
        '.ms-pill { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; box-sizing: border-box; border-radius: 999px;' +
        '  background: #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, .08); color: #1e3a8a; font-variant-numeric: tabular-nums; }' +
        '.ms-pill svg { width: 20px; height: 20px; }' +
        '.ms-btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border: none; border-radius: 999px; background: #fff;' +
        '  box-shadow: 0 2px 0 #cbd5e1, 0 2px 8px rgba(15, 23, 42, .06); color: #0f172a; font: inherit; font-size: .9rem; font-weight: 800; cursor: pointer;' +
        '  -webkit-tap-highlight-color: transparent; }' +
        '.ms-btn svg { width: 18px; height: 18px; }' +
        '.ms-btn:active { transform: translateY(2px); box-shadow: none; }' +
        '.ms-btn[aria-pressed="true"] { background: #f6a23a; color: #fff; box-shadow: 0 2px 0 #c2410c; }' +
        '.ms-btn[aria-pressed="true"] .pw { fill: #fff; }' +
        '.ms-btn:disabled { opacity: .45; cursor: default; transform: none; }' +
        '.ms-lives { color: #d6336c; }' +
        '.ms-grid { position: relative; display: grid; grid-template-columns: repeat(var(--cols), var(--c)); grid-auto-rows: var(--c); gap: 2px; padding: 6px;' +
        '  border-radius: 16px; background: #c9daf3; box-shadow: 0 10px 26px rgba(30, 58, 138, .14), inset 0 -4px 0 #b3c8ea; -webkit-touch-callout: none; touch-action: manipulation; }' +
        '.ms-cell { position: relative; display: grid; place-items: center; padding: 0; border: none; border-radius: calc(var(--c) * .2);' +
        '  font: 800 calc(var(--c) * .56)/1 ui-rounded, "Nunito", system-ui, sans-serif; color: #0f172a; cursor: pointer; -webkit-tap-highlight-color: transparent;' +
        '  background: linear-gradient(#eaf2ff, #c7dbfb); box-shadow: inset 0 -3px 0 #a3c0ee, inset 0 2px 0 rgba(255, 255, 255, .8); transition: filter .1s; }' +
        '.ms-cell.alt { background: linear-gradient(#e2ecfd, #b9d1f8); }' +
        '.ms-cell:hover { filter: brightness(1.05); }' +
        '.ms-cell:focus-visible { outline: 3px solid #f6a23a; outline-offset: 1px; z-index: 1; }' +
        '.ms-cell svg { width: 70%; height: 70%; display: block; pointer-events: none; }' +
        '.ms-cell.open { background: #fff8ea; box-shadow: inset 0 0 0 1px #f4e3c4; cursor: default; filter: none; }' +
        '.ms-cell.open.alt { background: #fdf1da; }' +
        '.ms-cell.open, .ms-cell.mouse { animation: ms-open .22s ease-out backwards; animation-delay: var(--d, 0s); }' +
        '.ms-cell.open > span { animation: ms-in .2s ease-out backwards; animation-delay: var(--d, 0s); }' +
        '.ms-cell.flag svg { animation: ms-in .22s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.ms-cell.press::after { content: ""; position: absolute; inset: 8%; border-radius: 50%; border: 3px solid #f6a23a; animation: ms-press .4s linear forwards; }' +
        '.ms-cell.peek { background: #fde7c0; }' +
        '.ms-cell.sniff { z-index: 2; animation: ms-sniff .7s ease-in-out; box-shadow: 0 0 0 3px #f6a23a, 0 0 16px 4px rgba(246, 162, 58, .7); }' +
        '.ms-cell.mouse { background: #fff1d6; box-shadow: inset 0 0 0 1px #f6d9a8; }' +
        '.ms-cell.boom { background: radial-gradient(circle, #fecdd3, #fda4af); box-shadow: 0 0 0 3px #f43f5e; z-index: 1; }' +
        '.ms-cell.caught { background: #e0f2fe; box-shadow: inset 0 0 0 2px #7dd3fc; }' +
        '.ms-cell.wrong { background: #e2e8f0; box-shadow: none; opacity: .6; }' +
        '.ms-cell.wrong::after { content: ""; position: absolute; inset: 22%; background: linear-gradient(45deg, transparent 44%, #d6336c 44% 56%, transparent 56%); }' +
        '.ms-cell.won { animation: ms-hop .5s ease-out backwards; animation-delay: var(--d, 0s); }' +
        '.ms-n1 { color: #2563eb; } .ms-n2 { color: #16a34a; } .ms-n3 { color: #e8590c; } .ms-n4 { color: #7c3aed; }' +
        '.ms-n5 { color: #be123c; } .ms-n6 { color: #0e7490; } .ms-n7 { color: #334155; } .ms-n8 { color: #64748b; }' +
        '.ms-float { position: absolute; z-index: 3; transform: translate(-50%, -50%); padding: 2px 8px; border-radius: 999px; background: #fff;' +
        '  color: #d6336c; font-weight: 800; font-size: .9rem; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 8px rgba(15, 23, 42, .15);' +
        '  animation: ms-up 1.1s ease-out forwards; }' +
        '.ms .bd { fill: #cbd5e1; stroke: #475569; stroke-width: 2.4; } .ms .ea { fill: #fbcfe8; } .ms .ey { fill: #0f172a; } .ms .no { fill: #e8618c; }' +
        '.ms .pw { fill: #f08c2e; }' +
        '.ms-still *, .ms-still .ms-cell { animation: none !important; transition: none !important; }' +
        '@keyframes ms-in { from { transform: scale(.2); } to { transform: scale(1); } }' +
        '@keyframes ms-open { from { transform: scale(.75); filter: brightness(1.15); } to { transform: none; filter: none; } }' +
        '@keyframes ms-press { from { transform: scale(.2); opacity: .2; } to { transform: scale(1); opacity: 1; } }' +
        '@keyframes ms-sniff { 0%, 100% { transform: none; } 30% { transform: scale(1.15); } 60% { transform: scale(.95); } }' +
        '@keyframes ms-hop { 0% { transform: none; } 40% { transform: translateY(-30%) scale(1.08); } 100% { transform: none; } }' +
        '@keyframes ms-up { from { opacity: 1; } to { opacity: 0; transform: translate(-50%, -190%); } }');

    /* difficulty: short side, long side, mice, sniffs, lives (mice the cat catches for you) */
    var LEVELS = {
        easy:   { a: 8, b: 8, mice: 8, sniffs: 3, lives: 1 },
        normal: { a: 9, b: 11, mice: 16, sniffs: 1, lives: 0 },
        hard:   { a: 10, b: 14, mice: 28, sniffs: 1, lives: 0 }
    };
    var L = LEVELS[api.level()] || LEVELS.normal;
    var s0 = api.size(), wide = s0.w > s0.h * 1.1;
    var COLS = wide ? L.b : L.a, ROWS = wide ? L.a : L.b, CELLS = COLS * ROWS, MICE = L.mice, SAFE = CELLS - MICE;
    var PENALTY = 10;                              /* seconds added when the cat catches a mouse for you */
    var MOUSE = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle class="bd" cx="10" cy="12" r="7"/><circle class="ea" cx="10" cy="12" r="3.6"/>' +
        '<circle class="bd" cx="30" cy="12" r="7"/><circle class="ea" cx="30" cy="12" r="3.6"/><ellipse class="bd" cx="20" cy="23" rx="12" ry="11"/>' +
        '<circle class="ey" cx="15.5" cy="21" r="2"/><circle class="ey" cx="24.5" cy="21" r="2"/><circle fill="#fff" cx="16.2" cy="20.3" r=".7"/>' +
        '<circle fill="#fff" cx="25.2" cy="20.3" r=".7"/><ellipse class="no" cx="20" cy="27" rx="2.2" ry="1.7"/></svg>';
    var PAW = '<svg viewBox="0 0 40 40" aria-hidden="true"><g class="pw"><ellipse cx="20" cy="26" rx="9.5" ry="8"/><ellipse cx="8.5" cy="16" rx="3.8" ry="4.8"/>' +
        '<ellipse cx="15.5" cy="9.5" rx="3.8" ry="4.8"/><ellipse cx="24.5" cy="9.5" rx="3.8" ry="4.8"/><ellipse cx="31.5" cy="16" rx="3.8" ry="4.8"/></g></svg>';
    var NOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#f08c2e" d="M3 9l2-7 5 5zM21 9l-2-7-5 5z"/><ellipse fill="#f6a23a" cx="12" cy="13" rx="9" ry="8"/>' +
        '<path fill="#ff8fa3" d="M10 13h4c0 1.4-1 2.2-2 2.6-1-.4-2-1.2-2-2.6z"/><circle fill="#3b2a1e" cx="8.5" cy="10.5" r="1.3"/><circle fill="#3b2a1e" cx="15.5" cy="10.5" r="1.3"/></svg>';

    var wrap = document.createElement('div');
    wrap.className = 'ms' + (api.reducedMotion ? ' ms-still' : '');
    wrap.innerHTML = '<div class="ms-bar"><span class="ms-pill ms-left" title="Mice left"></span>' +
        (L.lives ? '<span class="ms-pill ms-lives" title="The cat catches one mouse for you"></span>' : '') +
        '<button class="ms-btn ms-sniff" type="button" disabled></button>' +
        '<button class="ms-btn ms-mode" type="button" aria-pressed="false">' + PAW + 'Flag</button></div>' +
        '<div class="ms-grid" role="group" aria-label="Lawn"></div>';
    api.el.appendChild(wrap);
    var grid = wrap.querySelector('.ms-grid'), leftEl = wrap.querySelector('.ms-left'), modeBtn = wrap.querySelector('.ms-mode');
    var sniffBtn = wrap.querySelector('.ms-sniff'), livesEl = wrap.querySelector('.ms-lives');
    grid.style.setProperty('--cols', COLS);

    var cells = [], mouse = [], near = [], shown = [], flag = [], caught = [];
    for (var i = 0; i < CELLS; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.i = i;
        b.setAttribute('aria-label', 'Hidden');
        grid.appendChild(b);
        cells.push(b);
        mouse.push(false); near.push(0); shown.push(false); flag.push(false); caught.push(false);
        cellClass(i, '');
    }
    var placed = false, over = false, opened = 0, flags = 0, flagMode = false, t0 = 0, secs = 0, ticker = null;
    var sniffs = L.sniffs, lives = L.lives, penalty = 0;

    /* cell size from the play area; keep the mascot corner free when that still leaves cells big enough to tap */
    function fit(s) {
        var room = function (h) { return Math.min(46, (s.w - 24 - 12 - (COLS - 1) * 2) / COLS, (h - 12 - (ROWS - 1) * 2) / ROWS); };
        var full = room(s.h - 70), c = full;
        if ((s.w - COLS * full) / 2 < 100) c = Math.max(room(s.h - 216), Math.min(full, 30));
        wrap.style.setProperty('--c', Math.max(18, Math.floor(c)) + 'px');
    }
    fit(s0);
    api.onResize(fit);

    function cellClass(k, cls) { cells[k].className = 'ms-cell' + ((Math.floor(k / COLS) + k % COLS) % 2 ? ' alt' : '') + (cls ? ' ' + cls : ''); }
    function around(k) {
        var r = Math.floor(k / COLS), c = k % COLS, out = [];
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
            var rr = r + dr, cc = c + dc;
            if ((dr || dc) && rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(rr * COLS + cc);
        }
        return out;
    }
    function dist(a, b) { return Math.max(Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)), Math.abs(a % COLS - b % COLS)); }
    /* mice are hidden after the first reveal, never on that cell or its neighbours, so the first tap opens a patch */
    function hide(first) {
        var keep = around(first).concat(first), pool = [];
        for (var k = 0; k < CELLS; k++) if (keep.indexOf(k) < 0) pool.push(k);
        for (var m = 0; m < MICE; m++) mouse[pool.splice(Math.floor(Math.random() * pool.length), 1)[0]] = true;
        for (k = 0; k < CELLS; k++) near[k] = around(k).filter(function (j) { return mouse[j]; }).length;
        placed = true;
        t0 = performance.now();
        ticker = api.interval(tick, 250);
        showSniff();
    }
    function tick() {
        secs = Math.floor((performance.now() - t0) / 1000) + penalty;
        api.score(secs, 'Time');
    }
    function paint(k, html, cls) {
        cells[k].innerHTML = html ? (/^</.test(html) ? html : '<span>' + html + '</span>') : '';
        if (cls != null) cellClass(k, cls);
    }
    function counter() { leftEl.innerHTML = MOUSE + (MICE - flags); }
    function showSniff() {
        sniffBtn.innerHTML = NOSE + 'Sniff' + (sniffs > 1 ? ' ' + sniffs : '');
        sniffBtn.disabled = !placed || over || sniffs <= 0;
        sniffBtn.title = sniffs > 0 ? 'The cat sniffs out a safe cell' : 'No sniffs left';
    }
    function showLives() { if (livesEl) livesEl.textContent = '♥ ' + lives; }
    function float(k, text) {
        var f = document.createElement('div'), c = cells[k];
        f.className = 'ms-float';
        f.textContent = text;
        f.style.left = c.offsetLeft + c.offsetWidth / 2 + 'px';
        f.style.top = c.offsetTop + 'px';
        grid.appendChild(f);
        api.timeout(function () { f.remove(); }, 1150);
    }

    function toggleFlag(k) {
        if (over || shown[k] || caught[k]) return;
        flag[k] = !flag[k];
        flags += flag[k] ? 1 : -1;
        paint(k, flag[k] ? PAW : '', flag[k] ? 'flag' : '');
        cells[k].setAttribute('aria-label', flag[k] ? 'Flagged' : 'Hidden');
        api.sfx(flag[k] ? 'pop' : 'tap');
        counter();
    }
    /* open a cell; cells with no mice around open their neighbours too, in a wave from the tapped cell */
    function reveal(k) {
        if (!placed) hide(k);
        if (mouse[k]) return found(k);
        var stack = [k], count = 0;
        while (stack.length) {
            var j = stack.pop();
            if (shown[j] || flag[j]) continue;
            shown[j] = true;
            opened++;
            count++;
            paint(j, near[j] || '', 'open' + (near[j] ? ' ms-n' + near[j] : ''));
            cells[j].style.setProperty('--d', Math.min(0.5, dist(j, k) * 0.035) + 's');
            cells[j].setAttribute('aria-label', near[j] ? near[j] + ' mice near' : 'Empty');
            if (!near[j]) stack.push.apply(stack, around(j).filter(function (x) { return !shown[x]; }));
        }
        api.sfx(count > 4 ? 'pop' : 'tap');
        if (count > 14) api.cat('happy');
        if (opened === SAFE) win();
    }
    /* uncovered a mouse: on easy the cat catches the first one (+10 s), otherwise the game is lost */
    function found(k) {
        if (lives > 0) {
            lives--;
            showLives();
            caught[k] = flag[k] = true;
            flags++;
            counter();
            paint(k, MOUSE, 'caught');
            cells[k].setAttribute('aria-label', 'Caught mouse');
            penalty += PENALTY;
            tick();
            float(k, '+' + PENALTY + ' s');
            api.sfx('hit');
            api.cat('wow');
            api.say('Got it! That one was close.', 1800);
            return;
        }
        lose(k);
    }
    /* tapping an open number with as many paws around it opens the rest of its neighbours;
       with too few paws, the hidden neighbours light up for a moment */
    function chord(k) {
        var nb = around(k), hid = nb.filter(function (j) { return !shown[j] && !flag[j]; });
        if (!near[k] || !hid.length) return;
        if (nb.filter(function (j) { return flag[j]; }).length !== near[k]) {
            hid.forEach(function (j) { cells[j].classList.add('peek'); });
            api.timeout(function () { hid.forEach(function (j) { cells[j].classList.remove('peek'); }); }, 260);
            return;
        }
        for (var x = 0; x < hid.length && !over; x++) if (!shown[hid[x]] && !flag[hid[x]]) reveal(hid[x]);
    }
    function act(k, asFlag) {
        if (over || caught[k]) return;
        if (shown[k]) chord(k);
        else if (asFlag) toggleFlag(k);
        else if (!flag[k]) reveal(k);
    }
    /* the cat sniffs out a safe hidden cell, preferably one next to the open area */
    function sniff() {
        if (!placed || over || sniffs <= 0) return;
        var edge = [], any = [];
        for (var k = 0; k < CELLS; k++) {
            if (shown[k] || mouse[k] || flag[k]) continue;
            any.push(k);
            if (around(k).some(function (j) { return shown[j]; })) edge.push(k);
        }
        var pool = edge.length ? edge : any;
        if (!pool.length) return;
        var c = pool[Math.floor(Math.random() * pool.length)];
        sniffs--;
        showSniff();
        api.cat('think');
        api.say('Sniff sniff... no mouse here!', 1600);
        api.sfx('jump');
        cells[c].classList.add('sniff');
        cells[c].focus({ preventScroll: true });
        api.timeout(function () { cells[c].classList.remove('sniff'); if (!over) { api.cat('happy'); reveal(c); } }, api.reducedMotion ? 150 : 650);
    }

    function stopClock() {
        if (ticker) clearInterval(ticker);
        if (placed) tick();
    }
    function lose(k) {
        over = true;
        stopClock();
        showSniff();
        var order = [];
        for (var j = 0; j < CELLS; j++) {
            if (mouse[j] && !flag[j]) order.push(j);
            else if (!mouse[j] && flag[j]) paint(j, PAW, 'wrong');
        }
        order.sort(function (a, b) { return dist(a, k) - dist(b, k); });
        order.forEach(function (j, n) {
            paint(j, MOUSE, j === k ? 'mouse boom' : 'mouse');
            cells[j].style.setProperty('--d', (j === k ? 0 : Math.min(1, 0.15 + n * 0.04)) + 's');
        });
        api.sfx('hit');
        api.cat('wow');
        api.say('Eek, a mouse!', 1600);
        var pct = Math.floor(opened / SAFE * 100);
        api.timeout(function () { api.end({ win: false, text: 'You found a mouse.\n' + pct + '% of the lawn cleared. Try again!' }); }, 1300);
    }
    function win() {
        over = true;
        stopClock();
        showSniff();
        for (var j = 0; j < CELLS; j++) {
            if (mouse[j] && !flag[j]) { flag[j] = true; paint(j, PAW, 'flag'); }
            if (!api.reducedMotion) { cells[j].classList.add('won'); cells[j].style.setProperty('--d', (Math.floor(j / COLS) + j % COLS) * 0.025 + 's'); }
        }
        flags = MICE;
        counter();
        var s = Math.max(1, secs);
        api.end({ score: s, win: true, lowerIsBetter: true,
            text: 'All mice found!\n' + COLS + 'x' + ROWS + ', ' + MICE + ' mice in ' + s + ' s' + (penalty ? ' (with +' + penalty + ' s)' : '') });
    }

    /* input: click or tap reveals (flags in flag mode), right click or a long press flags */
    var lastType = 'mouse', press = null, pressCell = -1, px = 0, py = 0, longDone = false;
    function cellOf(e) { var c = e.target.closest && e.target.closest('.ms-cell'); return c ? +c.dataset.i : -1; }
    function cancelPress() {
        if (press) clearTimeout(press);
        press = null;
        if (pressCell >= 0) cells[pressCell].classList.remove('press');
        pressCell = -1;
    }
    api.on(grid, 'pointerdown', function (e) {
        lastType = e.pointerType;
        longDone = false;
        var k = cellOf(e);
        if (e.pointerType === 'mouse' || k < 0 || over) return;
        px = e.clientX; py = e.clientY;
        cancelPress();
        if (shown[k] || caught[k]) return;
        pressCell = k;
        cells[k].classList.add('press');
        press = api.timeout(function () {
            press = null;
            longDone = true;
            cancelPress();
            act(k, !flagMode);                         /* a long press does the opposite of a tap */
            if (navigator.vibrate) navigator.vibrate(15);
        }, 380);
    });
    api.on(grid, 'pointermove', function (e) {
        if (press && Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 12) cancelPress();
    });
    api.on(grid, 'pointerup', function () { if (press) cancelPress(); });
    api.on(grid, 'pointercancel', cancelPress);
    api.on(grid, 'click', function (e) {
        var k = cellOf(e);
        if (k < 0) return;
        if (longDone) { longDone = false; return; }        /* the click that ends a long press must not reveal */
        act(k, flagMode);
    });
    api.on(grid, 'contextmenu', function (e) {
        e.preventDefault();
        var k = cellOf(e);
        if (k >= 0 && lastType === 'mouse') act(k, true);
    });
    api.on(grid, 'auxclick', function (e) {           /* middle click on a number chords, as in the classic game */
        var k = cellOf(e);
        if (e.button === 1 && k >= 0 && shown[k]) chord(k);
    });
    /* keyboard: arrows move, Enter or Space reveals (native click), F flags, S sniffs */
    api.on(grid, 'keydown', function (e) {
        var k = cellOf(e);
        if (k < 0) return;
        longDone = false;
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); act(k, true); return; }
        if (e.key === 's' || e.key === 'S') { e.preventDefault(); sniff(); return; }
        var r = Math.floor(k / COLS), c = k % COLS;
        if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
        else if (e.key === 'ArrowRight') c = Math.min(COLS - 1, c + 1);
        else if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
        else if (e.key === 'ArrowDown') r = Math.min(ROWS - 1, r + 1);
        else return;
        e.preventDefault();
        cells[r * COLS + c].focus();
    });
    api.on(modeBtn, 'click', function () {
        flagMode = !flagMode;
        modeBtn.setAttribute('aria-pressed', flagMode);
        api.sfx('tap');
    });
    api.on(sniffBtn, 'click', sniff);

    counter();
    showSniff();
    showLives();
    api.score(0, 'Time');
    api.say(api.touch ? 'Long-press or use Flag to mark a mouse' : 'Right click marks a mouse', 3000);
});
