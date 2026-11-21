/* Cipher History desk tools for a keyword cipher (Bellaso's, later called the Vigenère): Kasiski's repeats and the
   column splitter. Both use the Toolbox's engine (lib/code-breaking.js: kasiski, columns, vigenere).

   CH.desk.repeats(el, cipher, { onPick(p) }) marks the repeated pieces of the ciphertext, lists their distances and
   which key lengths divide them, and offers the key lengths 2 to 12 as buttons.
   CH.desk.columns(el, cipher, p, { onKey(key) }) splits the letters into p columns, one per key letter. Each column has
   a slider: slide it until the column's bars look like English, and the slider's letter is that key letter. Below
   them, the whole message deciphered with the key so far. Returns { key(), set(i, shift) }. */
(function () {
    'use strict';
    var A = CH.ALPHA;
    var TINTS = ['#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa'];

    CH.desk.findRepeats = function (cipher) {
        var c = CH.B().codes(cipher);
        return CH.B().kasiski(c, 3, 12);
    };
    CH.desk.divisors = function (d, max) {
        var out = [];
        for (var m = 2; m <= (max || 12); m++) if (d % m === 0) out.push(m);
        return out;
    };

    CH.desk.repeats = function (el, cipher, opt) {
        opt = opt || {};
        var L = CH.letters(cipher), K = CH.desk.findRepeats(L);
        var reps = K.repeats.slice(0, TINTS.length);
        /* the ciphertext with the repeats coloured */
        var paint = [];
        reps.forEach(function (r, ri) { r.pos.forEach(function (p) { for (var i = 0; i < r.seq.length; i++) if (paint[p + i] == null) paint[p + i] = ri; }); });
        var pre = CH.el('p', { class: 'ch-text ch-letters' });
        for (var i = 0; i < L.length; i++) {
            var ch = L.charAt(i);
            if (paint[i] != null) pre.appendChild(CH.el('mark', { style: 'background:' + TINTS[paint[i]], text: ch }));
            else pre.appendChild(document.createTextNode(ch));
            if (i % 5 === 4) pre.appendChild(document.createTextNode(' '));
        }
        el.appendChild(pre);

        var rows = reps.map(function (r, ri) {
            var d = [];
            for (var a = 1; a < r.pos.length; a++) d.push(r.pos[a] - r.pos[a - 1]);
            return CH.el('tr', null, [
                CH.el('td', null, [CH.el('mark', { style: 'background:' + TINTS[ri], text: r.seq })]),
                CH.el('td', { text: d.join(', ') }),
                CH.el('td', { text: d.map(function (x) { return CH.desk.divisors(x).join(' '); }).join(' | ') })
            ]);
        });
        if (!rows.length) el.appendChild(CH.el('p', { class: 'ch-help', text: 'No piece of 3 or more letters repeats in this text.' }));
        else el.appendChild(CH.el('div', { class: 'ch-table-wrap' }, [CH.el('table', { class: 'ch-table' }, [
            CH.el('thead', null, [CH.el('tr', null, [CH.el('th', { text: 'Repeat' }), CH.el('th', { text: 'Gap (letters)' }), CH.el('th', { text: 'Key lengths that fit the gap' })])]),
            CH.el('tbody', null, rows)
        ])]));

        /* key length buttons, with how many gaps each length divides */
        var all = [];
        K.repeats.forEach(function (r) { for (var a = 1; a < r.pos.length; a++) all.push(r.pos[a] - r.pos[a - 1]); });
        var pick = CH.el('div', { class: 'ch-pick', role: 'group', 'aria-label': 'Key length' });
        var btns = [];
        for (var m = 2; m <= 12; m++) {
            var n = all.filter(function (x) { return x % m === 0; }).length;
            var b = CH.el('button', { type: 'button', class: 'ch-pick-b', 'aria-pressed': 'false', 'data-m': m }, [CH.el('b', { text: String(m) }), CH.el('span', { text: n + ' of ' + all.length })]);
            b.addEventListener('click', (function (mm, bb) { return function () {
                btns.forEach(function (x) { x.setAttribute('aria-pressed', x === bb ? 'true' : 'false'); });
                if (opt.onPick) opt.onPick(mm);
            }; })(m, b));
            btns.push(b);
            pick.appendChild(b);
        }
        el.appendChild(CH.el('p', { class: 'ch-bars-h', text: 'Pick a key length. Under each: how many of the gaps it divides.' }));
        el.appendChild(pick);
        return { repeats: K.repeats, gaps: all };
    };

    /* chi-squared distance of a column's counts, read with key shift s, from English (lower is more English) */
    CH.desk.chi = function (counts, s) {
        var x = [];
        for (var i = 0; i < 26; i++) x.push(counts[(i + s) % 26]);
        return CH.B().chi2(x);
    };
    /* the same as a friendly 0 to 100: about 70 or more for English, under 30 for a wrong key letter */
    CH.desk.likeEnglish = function (counts, s) {
        var n = counts.reduce(function (a, b) { return a + b; }, 0);
        return n ? Math.round(100 * Math.exp(-CH.desk.chi(counts, s) / (2 * n))) : 0;
    };
    /* the best shift of a column (used by the tests, never shown on its own) */
    CH.desk.bestShift = function (counts) {
        var best = 0, low = Infinity;
        for (var s = 0; s < 26; s++) { var v = CH.desk.chi(counts, s); if (v < low) { low = v; best = s; } }
        return best;
    };

    CH.desk.columns = function (el, cipher, p, opt) {
        opt = opt || {};
        var B = CH.B(), codes = B.codes(cipher), cols = B.columns(codes, p);
        var shifts = [], api = {}, parts = [];
        var en = CH.english(), enMax = Math.max.apply(null, en);
        var box = CH.el('div', { class: 'ch-cols' });
        cols.forEach(function (col, j) {
            var counts = B.countCodes(col), cMax = Math.max.apply(null, counts) || 1;
            shifts.push(0);
            var bars = CH.el('div', { class: 'ch-cbars', 'aria-hidden': 'true' });
            var mine = [], i;
            for (i = 0; i < 26; i++) {
                var bar = CH.el('i');
                mine.push(bar);
                bars.appendChild(CH.el('span', { class: 'ch-cbar' }, [bar, CH.el('em', { style: 'height:' + Math.round(en[i] / enMax * 100) + '%' }), CH.el('b', { text: A.charAt(i) })]));
            }
            var range = CH.el('input', { type: 'range', min: 0, max: 25, step: 1, value: 0, class: 'ch-range', 'aria-label': 'Key letter ' + (j + 1) });
            var keyL = CH.el('b', { class: 'ch-col-key', text: 'A' });
            var fit = CH.el('span', { class: 'ch-col-fit' });
            var head = CH.el('p', { class: 'ch-col-h' }, [CH.el('span', { text: 'Column ' + (j + 1) + ' (' + col.length + ' letters), key letter ' }), keyL, fit]);
            /* buttons beside the slider, for one step at a time on a touch screen */
            var back = CH.button('‹', function () { api.set(j, shifts[j] - 1); }, 'ch-btn-round');
            var fwd = CH.button('›', function () { api.set(j, shifts[j] + 1); }, 'ch-btn-round');
            back.setAttribute('aria-label', 'Key letter ' + (j + 1) + ': one back');
            fwd.setAttribute('aria-label', 'Key letter ' + (j + 1) + ': one on');
            var part = CH.el('div', { class: 'ch-col' }, [head, bars, CH.el('div', { class: 'ch-wh-controls' }, [back, range, fwd])]);
            function draw() {
                var s = shifts[j];
                for (var q = 0; q < 26; q++) mine[q].style.height = Math.round(counts[(q + s) % 26] / cMax * 100) + '%';
                keyL.textContent = A.charAt(s);
                fit.textContent = ' · looks like English: ' + CH.desk.likeEnglish(counts, s) + '%';
                range.value = s;
            }
            range.addEventListener('input', function () { shifts[j] = Number(range.value); draw(); out(); });
            parts.push({ draw: draw, counts: counts });
            draw();
            box.appendChild(part);
        });
        el.appendChild(CH.el('p', { class: 'ch-help', text: 'Dark bars: the column, read with its key letter. Light bars behind: ordinary English. Slide until they match: tall bars at E, T and A, almost nothing at J, Q, X and Z.' }));
        el.appendChild(box);
        var keyOut = CH.el('p', { class: 'ch-keyline' });
        var plain = CH.el('p', { class: 'ch-text ch-plainout' });
        el.appendChild(keyOut);
        el.appendChild(plain);
        function key() { return shifts.map(function (s) { return A.charAt(s); }).join(''); }
        function out() {
            keyOut.textContent = 'Key so far: ' + key();
            plain.textContent = B.vigenere(cipher, key(), true).toLowerCase();
            if (opt.onKey) opt.onKey(key());
        }
        api.key = key;
        api.set = function (j, s) { shifts[j] = ((s % 26) + 26) % 26; parts[j].draw(); out(); };
        api.best = function (j) { return CH.desk.bestShift(parts[j].counts); };
        out();
        return api;
    };
})();
