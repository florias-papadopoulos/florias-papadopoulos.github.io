/* Cipher History desk tool: two messages "in depth", enciphered with the same page of a one-time pad (Venona,
   58-venona.js), and the crib dragger.

   The messages are code groups of four digits with a key group added digit by digit, without carrying (7 + 5 = 2).
   Subtracting one ciphertext from the other, digit by digit, removes the key: what is left is code A minus code B.
   Guess a word in one message (a crib), and the difference gives the group at the same place in the other message;
   if that group is in the codebook, the guess is probably right.

   CH.depth.add(code, key), CH.depth.sub(x, y): digit by digit, mod 10, on strings of digits.
   CH.desk.depth(el, { a: ['1234', ...], b: [...], book: { word: '1234' }, onChange(api) }) draws a card per place
   (cipher A, cipher B, A minus B once subtracted, the words found and the key they give), the subtract button and the
   crib dragger. Returns { words(which), filled() }. */
(function () {
    'use strict';

    CH.depth = {
        add: function (x, k) { var o = ''; for (var i = 0; i < x.length; i++) o += (+x.charAt(i) + +k.charAt(i)) % 10; return o; },
        sub: function (x, k) { var o = ''; for (var i = 0; i < x.length; i++) o += (+x.charAt(i) - +k.charAt(i) + 10) % 10; return o; }
    };

    CH.desk.depth = function (el, opt) {
        var D = CH.depth, a = opt.a, b = opt.b, n = Math.min(a.length, b.length), book = opt.book;
        var word = {};
        Object.keys(book).forEach(function (w) { word[book[w]] = w; });
        var found = { a: [], b: [] }, subtracted = false, api = {};

        /* ---------- the cards ---------- */
        var cards = CH.el('div', { class: 'ch-dp-cards' }), cells = [];
        for (var i = 0; i < n; i++) {
            var c = {
                a: CH.el('b', { class: 'ch-dp-c', text: a[i] }), b: CH.el('b', { class: 'ch-dp-c', text: b[i] }),
                d: CH.el('b', { class: 'ch-dp-d', text: '····' }), wa: CH.el('i', { class: 'ch-dp-w' }), wb: CH.el('i', { class: 'ch-dp-w' }), k: CH.el('span', { class: 'ch-dp-k' })
            };
            cells.push(c);
            cards.appendChild(CH.el('div', { class: 'ch-dp-card' }, [CH.el('span', { class: 'ch-dp-n', text: String(i + 1) }), c.a, c.wa, c.b, c.wb, c.d, c.k]));
        }
        el.appendChild(CH.el('p', { class: 'ch-help', text: 'Each card is one place: what was sent in message A (red) and its word, the same for message B, then A minus B (amber, once you subtract) and the key a found word gives.' }));
        el.appendChild(cards);
        var subBtn = CH.button('Subtract B from A, digit by digit', function () { subtracted = true; subBtn.disabled = true; render(); }, 'is-primary');
        el.appendChild(CH.el('div', { class: 'ch-row' }, [subBtn]));

        /* ---------- the crib dragger ---------- */
        var crib = CH.el('div', { class: 'ch-dp-crib', hidden: true });
        crib.appendChild(CH.el('h3', { class: 'ch-h3', text: 'Drag a guessed word along' }));
        var sel = CH.el('select', { class: 'ch-dp-sel', 'aria-label': 'The guessed word' });
        Object.keys(book).sort().forEach(function (w) { sel.appendChild(CH.el('option', { value: w, text: w.toLowerCase() + ' (' + book[w] + ')' })); });
        var side = CH.el('select', { class: 'ch-dp-sel', 'aria-label': 'Which message the guess is in' }, [CH.el('option', { value: 'a', text: 'in message A' }), CH.el('option', { value: 'b', text: 'in message B' })]);
        crib.appendChild(CH.el('div', { class: 'ch-row' }, [sel, side]));
        var out = CH.el('div', { 'aria-live': 'polite' });
        crib.appendChild(out);
        el.appendChild(crib);
        sel.addEventListener('change', drag);
        side.addEventListener('change', drag);

        function drag() {
            CH.clear(out);
            var w = sel.value, g = book[w], inA = side.value === 'a', hits = [], miss = 0;
            for (var i = 0; i < n; i++) {
                var diff = D.sub(a[i], b[i]);
                /* A - B = diff, so B = A - diff and A = B + diff */
                var other = inA ? D.sub(g, diff) : D.add(g, diff);
                if (word[other]) hits.push({ i: i, other: other }); else miss++;
            }
            var list = CH.el('ul', { class: 'ch-dp-hits' });
            hits.forEach(function (h) {
                var wa = inA ? w : word[h.other], wb = inA ? word[h.other] : w;
                list.appendChild(CH.el('li', {}, [
                    CH.el('span', { text: 'Place ' + (h.i + 1) + ': A ' + wa.toLowerCase() + ', B ' + wb.toLowerCase() + ' ' }),
                    CH.button('Put it there', function () { found.a[h.i] = wa; found.b[h.i] = wb; render(); })
                ]));
            });
            out.appendChild(CH.el('p', { class: 'ch-help', text: hits.length ? 'At these places the other message gets a group that is in the codebook:' : 'Nowhere does the other message get a group that is in the codebook.' }));
            if (hits.length) out.appendChild(list);
            out.appendChild(CH.el('p', { class: 'ch-help', text: miss + ' of ' + n + ' places give a group that is not in the book: the word is not there.' }));
        }
        function render() {
            cells.forEach(function (c, i) {
                var diff = D.sub(a[i], b[i]);
                c.d.textContent = subtracted ? diff : '····';
                c.d.classList.toggle('is-zero', subtracted && diff === '0000');
                c.wa.textContent = found.a[i] ? found.a[i].toLowerCase() : '?';
                c.wb.textContent = found.b[i] ? found.b[i].toLowerCase() : '?';
                c.k.textContent = found.a[i] ? 'key ' + D.sub(a[i], book[found.a[i]]) : '';
            });
            cards.classList.toggle('is-sub', subtracted);
            crib.hidden = !subtracted;
            if (subtracted && !out.firstChild) drag();
            if (opt.onChange) opt.onChange(api);
        }
        api.words = function (which) { var f = found[which], o = []; for (var i = 0; i < n; i++) o.push(f[i] || '?'); return o.join(' '); };
        api.filled = function () { var k = 0; for (var i = 0; i < n; i++) if (found.a[i] && found.b[i]) k++; return k; };
        api.size = n;
        api.subtracted = function () { return subtracted; };
        render();
        return api;
    };
})();
