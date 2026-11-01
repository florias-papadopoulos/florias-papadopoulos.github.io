/* Mouse Sweeper: find the hidden mice on a 9x9 lawn. Numbers count the mice next to a cell; mark the mice with paws.
   Score = seconds, best = fastest win. Shell API: assets/js/games/arcade.js. */
Arcade.register('mouse-sweeper', function (api) {
    'use strict';
    api.css(
        '.ms { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }' +
        '.ms-bar { display: flex; gap: 10px; align-items: center; font-weight: 700; color: #475569; }' +
        '.ms-left { min-width: 3.2em; }' +
        '.ms-mode { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; color: #0f172a; font: inherit;' +
        '  font-size: .9rem; font-weight: 700; cursor: pointer; }' +
        '.ms-mode[aria-pressed="true"] { border-color: #d6336c; background: #d6336c; color: #fff; }' +
        '.ms-grid { display: grid; grid-template-columns: repeat(9, var(--c)); grid-auto-rows: var(--c); gap: 3px; padding: 6px;' +
        '  border-radius: 14px; background: #e2e8f0; -webkit-touch-callout: none; }' +
        '.ms-cell { display: grid; place-items: center; padding: 0; border: none; border-radius: 6px; font: 800 calc(var(--c) * .55)/1 ui-rounded, system-ui, sans-serif;' +
        '  background: linear-gradient(#eef2ff, #c7d2fe); box-shadow: 0 2px 0 #a5b4fc; color: #0f172a; cursor: pointer; -webkit-tap-highlight-color: transparent; }' +
        '.ms-cell:focus-visible { outline: 3px solid #f6a23a; outline-offset: 1px; position: relative; z-index: 1; }' +
        '.ms-cell.open { background: #fff; box-shadow: none; cursor: default; }' +
        '.ms-cell.open span { animation: ms-in .15s ease-out; }' +
        '.ms-still .ms-cell span { animation: none !important; }' +
        '.ms-cell.flag span { animation: ms-in .2s cubic-bezier(.3, 1.6, .5, 1); font-size: .8em; }' +
        '.ms-cell.mouse { background: #fef3c7; box-shadow: none; }' +
        '.ms-cell.boom { background: #fecdd3; }' +
        '.ms-cell.wrong { background: #e2e8f0; box-shadow: none; opacity: .6; }' +
        '.ms-n1 { color: #1e3a8a; } .ms-n2 { color: #15803d; } .ms-n3 { color: #d6336c; } .ms-n4 { color: #6d28d9; }' +
        '.ms-n5 { color: #b45309; } .ms-n6 { color: #0e7490; } .ms-n7 { color: #0f172a; } .ms-n8 { color: #64748b; }' +
        '@keyframes ms-in { from { transform: scale(.3); } to { transform: scale(1); } }');

    var N = 9, MICE = 10, SAFE = N * N - MICE;
    var MOUSE = '🐭', PAW = '🐾';
    var wrap = document.createElement('div');
    wrap.className = 'ms' + (api.reducedMotion ? ' ms-still' : '');
    wrap.innerHTML = '<div class="ms-bar"><span class="ms-left"></span>' +
        '<button class="ms-mode" type="button" aria-pressed="false">' + PAW + ' Flag mode</button></div><div class="ms-grid" role="group" aria-label="Lawn"></div>';
    api.el.appendChild(wrap);
    var grid = wrap.querySelector('.ms-grid'), leftEl = wrap.querySelector('.ms-left'), modeBtn = wrap.querySelector('.ms-mode');

    var cells = [], mouse = [], near = [], shown = [], flag = [];
    for (var i = 0; i < N * N; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ms-cell';
        b.dataset.i = i;
        b.setAttribute('aria-label', 'Hidden');
        grid.appendChild(b);
        cells.push(b);
        mouse.push(false); near.push(0); shown.push(false); flag.push(false);
    }
    var placed = false, over = false, opened = 0, flags = 0, flagMode = false, t0 = 0, secs = 0, ticker = null;

    /* cell size from the play area; when the grid spans the width, keep the mascot corner below it free */
    function fit(s) {
        var g = Math.min(46 * N + 36, s.w - 20, s.h - 76);
        if ((s.w - g) / 2 < 100) g = Math.min(g, s.h - 216);
        wrap.style.setProperty('--c', Math.max(18, Math.floor((g - 36) / N)) + 'px');
    }
    fit(api.size());
    api.onResize(fit);

    function around(k) {
        var r = Math.floor(k / N), c = k % N, out = [];
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
            var rr = r + dr, cc = c + dc;
            if ((dr || dc) && rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
        }
        return out;
    }
    /* mice are hidden after the first reveal, never on that cell or its neighbours */
    function hide(first) {
        var keep = around(first).concat(first), pool = [];
        for (var k = 0; k < N * N; k++) if (keep.indexOf(k) < 0) pool.push(k);
        for (var m = 0; m < MICE; m++) mouse[pool.splice(Math.floor(Math.random() * pool.length), 1)[0]] = true;
        for (k = 0; k < N * N; k++) near[k] = around(k).filter(function (j) { return mouse[j]; }).length;
        placed = true;
        t0 = performance.now();
        ticker = api.interval(tick, 250);
    }
    function tick() {
        secs = Math.floor((performance.now() - t0) / 1000);
        api.score(secs, 'Time');
    }
    function paint(k, html, cls) {
        cells[k].innerHTML = html ? '<span>' + html + '</span>' : '';
        if (cls) cells[k].className = 'ms-cell ' + cls;
    }
    function counter() { leftEl.textContent = MOUSE + ' ' + (MICE - flags); }

    function toggleFlag(k) {
        if (over || shown[k]) return;
        flag[k] = !flag[k];
        flags += flag[k] ? 1 : -1;
        paint(k, flag[k] ? PAW : '', flag[k] ? 'flag' : ' ');
        cells[k].setAttribute('aria-label', flag[k] ? 'Flagged' : 'Hidden');
        api.sfx(flag[k] ? 'pop' : 'tap');
        counter();
    }
    /* open a cell; cells with no mice around open their neighbours too */
    function reveal(k) {
        if (!placed) hide(k);
        if (mouse[k]) return lose(k);
        var stack = [k], count = 0;
        while (stack.length) {
            var j = stack.pop();
            if (shown[j] || flag[j]) continue;
            shown[j] = true;
            opened++;
            count++;
            paint(j, near[j] || '', 'open' + (near[j] ? ' ms-n' + near[j] : ''));
            cells[j].setAttribute('aria-label', near[j] ? near[j] + ' mice near' : 'Empty');
            if (!near[j]) stack.push.apply(stack, around(j).filter(function (x) { return !shown[x]; }));
        }
        api.sfx(count > 4 ? 'pop' : 'tap');
        if (opened === SAFE) win();
    }
    /* tapping an open number with as many paws around it opens the rest of its neighbours */
    function chord(k) {
        var nb = around(k);
        if (!near[k] || nb.filter(function (j) { return flag[j]; }).length !== near[k]) return;
        for (var x = 0; x < nb.length && !over; x++) if (!shown[nb[x]] && !flag[nb[x]]) reveal(nb[x]);
    }
    function act(k, asFlag) {
        if (over) return;
        if (shown[k]) chord(k);
        else if (asFlag) toggleFlag(k);
        else if (!flag[k]) reveal(k);
    }

    function stopClock() {
        if (ticker) clearInterval(ticker);
        if (placed) tick();
    }
    function lose(k) {
        over = true;
        stopClock();
        for (var j = 0; j < N * N; j++) {
            if (mouse[j] && !flag[j]) paint(j, MOUSE, j === k ? 'mouse boom' : 'mouse');
            else if (!mouse[j] && flag[j]) paint(j, PAW, 'wrong');
        }
        api.sfx('hit');
        api.cat('wow');
        api.say('Eek, a mouse!', 1600);
        api.timeout(function () { api.end({ win: false, text: 'You found a mouse.\nTry again!' }); }, 1100);
    }
    function win() {
        over = true;
        stopClock();
        for (var j = 0; j < N * N; j++) if (mouse[j] && !flag[j]) { flag[j] = true; paint(j, PAW, 'flag'); }
        flags = MICE;
        counter();
        var s = Math.max(1, secs);
        api.end({ score: s, win: true, lowerIsBetter: true, text: 'All mice found!\nTime: ' + s + ' s' });
    }

    /* input: click or tap reveals (flags in flag mode), right click or a long press flags */
    var lastType = 'mouse', press = null, px = 0, py = 0, longDone = false;
    function cellOf(e) { var c = e.target.closest('.ms-cell'); return c ? +c.dataset.i : -1; }
    function cancelPress() { if (press) clearTimeout(press); press = null; }
    api.on(grid, 'pointerdown', function (e) {
        lastType = e.pointerType;
        longDone = false;
        var k = cellOf(e);
        if (e.pointerType === 'mouse' || k < 0) return;
        px = e.clientX; py = e.clientY;
        cancelPress();
        press = api.timeout(function () {
            press = null;
            longDone = true;
            if (shown[k]) return;
            toggleFlag(k);
            if (navigator.vibrate) navigator.vibrate(15);
        }, 400);
    });
    api.on(grid, 'pointermove', function (e) {
        if (press && Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 12) cancelPress();
    });
    api.on(grid, 'pointerup', cancelPress);
    api.on(grid, 'pointercancel', cancelPress);
    api.on(grid, 'click', function (e) {
        var k = cellOf(e);
        if (k < 0 || longDone) return;                     /* the click that ends a long press must not reveal */
        act(k, flagMode);
    });
    api.on(grid, 'contextmenu', function (e) {
        e.preventDefault();
        var k = cellOf(e);
        if (k >= 0 && lastType === 'mouse') act(k, true);
    });
    /* keyboard: arrows move, Enter or Space reveals (native click), F flags */
    api.on(grid, 'keydown', function (e) {
        var k = cellOf(e);
        if (k < 0) return;
        longDone = false;
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); act(k, true); return; }
        var r = Math.floor(k / N), c = k % N;
        if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
        else if (e.key === 'ArrowRight') c = Math.min(N - 1, c + 1);
        else if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
        else if (e.key === 'ArrowDown') r = Math.min(N - 1, r + 1);
        else return;
        e.preventDefault();
        cells[r * N + c].focus();
    });
    api.on(modeBtn, 'click', function () {
        flagMode = !flagMode;
        modeBtn.setAttribute('aria-pressed', flagMode);
        api.sfx('tap');
    });

    counter();
    api.score(0, 'Time');
    api.say(api.touch ? 'Long-press or use flag mode to mark a mouse' : 'Right click marks a mouse', 3000);
});
