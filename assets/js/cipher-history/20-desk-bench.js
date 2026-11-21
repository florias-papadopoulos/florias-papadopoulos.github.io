/* Cipher History desk tool: the frequency bench, for any substitution where each sign stands for a letter (or, in a
   nomenclator, for a whole word or for nothing at all).

   CH.desk.tokens(text) splits a letter ciphertext into tokens: [{ s: 'Q' }, { sep: ' ' }, ...].
   CH.desk.bench(el, {
       tokens,                 cipher signs and separators (from CH.desk.tokens, or built by a story)
       words: false,           true: a sign may stand for a word (inputs take several letters, no swapping)
       special: { sign: 'double' },   signs with a known job: 'double' repeats the letter before it
       rank: true,             show the button "Match by rank" (al-Kindi's first step: most common sign = E, ...)
       onChange(bench)         after every change
   })
   draws: the English letter counts, a card per cipher sign (how often it occurs, a bar, a box for its letter), and
   the message with the letters found so far under each sign. Returns { map, set(sign, text), plain(), reset() }. */
(function () {
    'use strict';

    CH.desk.tokens = function (text) {
        var out = [];
        String(text).toUpperCase().split('').forEach(function (c) {
            if (/[A-Z]/.test(c)) out.push({ s: c });
            else out.push({ sep: c });
        });
        return out;
    };

    /* English letters from most to least common (the Toolbox's table) */
    CH.desk.englishOrder = function () {
        var en = CH.english(), idx = [];
        for (var i = 0; i < 26; i++) idx.push(i);
        idx.sort(function (a, b) { return en[b] - en[a]; });
        return idx.map(function (i) { return CH.ALPHA.charAt(i); });
    };

    /* the English bars: one small bar per letter, most common first */
    CH.desk.englishBars = function (el, title) {
        var en = CH.english(), max = Math.max.apply(null, en);
        var row = CH.el('div', { class: 'ch-bars ch-bars-en', role: 'img', 'aria-label': 'English letters from most to least common: ' + CH.desk.englishOrder().join(' ') });
        CH.desk.englishOrder().forEach(function (L) {
            var p = en[L.charCodeAt(0) - 65];
            row.appendChild(CH.el('span', { class: 'ch-bar' }, [
                CH.el('i', { style: 'height:' + Math.max(2, Math.round(p / max * 100)) + '%' }),
                CH.el('b', { text: L })
            ]));
        });
        el.appendChild(CH.el('div', { class: 'ch-bars-box' }, [CH.el('p', { class: 'ch-bars-h', text: title || 'Ordinary English: letters from most to least common' }), row]));
        return row;
    };

    CH.desk.bench = function (el, opt) {
        var tokens = opt.tokens, special = opt.special || {}, words = !!opt.words;
        var counts = {}, order = [];
        tokens.forEach(function (t) { if (t.s != null && !special[t.s]) { if (!counts[t.s]) { counts[t.s] = 0; order.push(t.s); } counts[t.s]++; } });
        order.sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); });
        var total = order.reduce(function (n, s) { return n + counts[s]; }, 0), max = counts[order[0]] || 1;
        var map = {}, inputs = {}, cells = [];
        var api = { map: map };

        /* ---------- the cards: sign, count, bar, its letter ---------- */
        if (opt.english !== false) CH.desk.englishBars(el);
        var tools = CH.el('div', { class: 'ch-bench-tools' });
        var grid = CH.el('div', { class: 'ch-cards' });
        order.forEach(function (s) {
            var inp = CH.el('input', { type: 'text', class: 'ch-card-in', maxlength: words ? 14 : 1, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Plain letter for the sign ' + s });
            inputs[s] = inp;
            inp.addEventListener('input', function () { set(s, inp.value, true); });
            inp.addEventListener('focus', function () { inp.select(); mark(s); });
            inp.addEventListener('blur', function () { mark(null); });
            grid.appendChild(CH.el('div', { class: 'ch-card' }, [
                CH.el('span', { class: 'ch-card-sign' + (opt.signClass ? ' ' + opt.signClass : ''), text: s }),
                CH.el('span', { class: 'ch-card-bar' }, [CH.el('i', { style: 'width:' + Math.round(counts[s] / max * 100) + '%' })]),
                CH.el('span', { class: 'ch-card-n', text: counts[s] + '×' }),
                inp
            ]));
        });
        if (opt.rank) tools.appendChild(CH.button('Match by rank', function () { rankMatch(); }, 'is-primary'));
        tools.appendChild(CH.button('Clear all', function () { api.reset(); }));
        el.appendChild(CH.el('p', { class: 'ch-bars-h', text: 'The message: ' + total + ' signs, ' + order.length + ' different, most common first. Type the letter you think each sign stands for.' }));
        el.appendChild(grid);
        el.appendChild(tools);

        /* ---------- the message, with the letters found so far under each sign ---------- */
        var msg = CH.el('div', { class: 'ch-msg', 'aria-label': 'The message with your letters under each sign' });
        var word = null;
        tokens.forEach(function (t) {
            if (t.sep != null) {
                word = null;
                if (t.sep === '\n') msg.appendChild(CH.el('br'));
                else msg.appendChild(document.createTextNode(t.sep === ' ' ? ' ' : t.sep));
                return;
            }
            if (!word) { word = CH.el('span', { class: 'ch-w' }); msg.appendChild(word); }
            var c = CH.el('span', { class: 'ch-c' + (special[t.s] ? ' is-special' : ''), 'data-s': t.s }, [
                CH.el('b', { class: opt.signClass || null, text: t.s }), CH.el('i', { text: '·' })
            ]);
            if (!special[t.s]) c.addEventListener('click', function () { inputs[t.s].focus(); });
            cells.push({ t: t, el: c, out: c.lastChild });
            word.appendChild(c);
        });
        el.appendChild(CH.el('p', { class: 'ch-bars-h', text: 'The message, with your letters under the signs:' }));
        el.appendChild(msg);

        function mark(s) { cells.forEach(function (c) { c.el.classList.toggle('is-on', s != null && c.t.s === s); }); }
        function clean(v) { return CH.letters(v).slice(0, words ? 14 : 1); }
        function set(s, v, typed) {
            v = clean(v);
            if (!words && v) {
                /* a letter can only stand for one sign: the sign that had it gets this sign's old letter (a swap) */
                Object.keys(map).forEach(function (o) {
                    if (o !== s && map[o] === v) { map[o] = map[s] || ''; inputs[o].value = map[o]; }
                });
            }
            map[s] = v;
            if (!typed || inputs[s].value !== v) inputs[s].value = v;
            render();
        }
        function rankMatch() {
            var en = CH.desk.englishOrder();
            order.forEach(function (s, i) { map[s] = en[i] || ''; inputs[s].value = map[s]; });
            render();
        }
        api.plain = function () {
            var out = '', prev = '';
            tokens.forEach(function (t) {
                if (t.sep != null) { out += t.sep; return; }
                if (special[t.s] === 'double') { out += prev; return; }
                var v = map[t.s];
                if (v == null || v === '') { if (opt.nulls && opt.nulls[t.s]) return; out += '?'; prev = '?'; return; }
                out += v.toLowerCase();
                prev = v.toLowerCase().slice(-1);
            });
            return out;
        };
        function render() {
            var prev = '·';
            cells.forEach(function (c) {
                var v;
                if (special[c.t.s] === 'double') v = prev;
                else v = map[c.t.s] ? map[c.t.s].toLowerCase() : '·';
                c.out.textContent = v;
                c.el.classList.toggle('is-set', v !== '·');
                if (special[c.t.s] !== 'double') prev = v === '·' ? '·' : v.slice(-1);
            });
            if (opt.onChange) opt.onChange(api);
        }
        api.set = function (s, v) { if (inputs[s]) set(s, v); };
        api.reset = function () { Object.keys(map).forEach(function (s) { map[s] = ''; inputs[s].value = ''; }); render(); };
        api.order = order;
        api.counts = counts;
        render();
        return api;
    };
})();
