/* Cipher History desk tool: the codebook rebuilder, for a code where every word is a number group (the Zimmermann
   telegram, 56-zimmermann.js).

   CH.desk.codebook(el, {
       groups: ['12345', ...],     the message, one group per word
       known: { '12345': 'the' },  the groups already known (shown in the book and under the message)
       prints: { '23456': '...' }, for each unknown group the fingerprint CH.print(word): a box turns green when right
       onChange(api)               after every change
   })
   draws the message (each group with its word under it, or ??? while unknown; a tap jumps to its line in the book)
   and the book sorted by number, with a box for each unknown group. In an alphabetical codebook a number tells
   roughly where its word stands in the alphabet, so the known neighbours help. Returns { plain(), solved(), left() }. */
(function () {
    'use strict';

    CH.desk.codebook = function (el, opt) {
        var groups = opt.groups, known = opt.known || {}, prints = opt.prints || {};
        var guess = {}, cells = [], rows = {}, inputs = {};
        var api = {};

        /* ---------- the message ---------- */
        el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The telegram, group by group' }));
        var msg = CH.el('div', { class: 'ch-cb-msg' });
        groups.forEach(function (g) {
            var w = CH.el('i');
            var cell = CH.el('button', { type: 'button', class: 'ch-cb-g', 'aria-label': 'Group ' + g }, [CH.el('b', { text: g }), w]);
            cell.addEventListener('click', function () { if (inputs[g]) { inputs[g].focus(); inputs[g].scrollIntoView({ block: 'center', behavior: 'smooth' }); } else flash(g); });
            cells.push({ g: g, el: cell, w: w });
            msg.appendChild(cell);
        });
        el.appendChild(msg);

        /* ---------- the book, sorted by number ---------- */
        el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The codebook, sorted by number' }));
        var book = CH.el('ol', { class: 'ch-cb-book' });
        var nums = [];
        groups.forEach(function (g) { if (nums.indexOf(g) < 0) nums.push(g); });
        nums.sort();
        nums.forEach(function (g) {
            var right;
            if (known[g] != null) right = CH.el('span', { class: 'ch-cb-word', text: known[g] });
            else {
                var inp = CH.el('input', { type: 'text', class: 'ch-cb-in', maxlength: 16, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Word for group ' + g });
                inputs[g] = inp;
                inp.addEventListener('input', function () { guess[g] = inp.value; render(); });
                inp.addEventListener('focus', function () { mark(g); });
                inp.addEventListener('blur', function () { mark(null); });
                right = inp;
            }
            var li = CH.el('li', { class: 'ch-cb-row' + (known[g] != null ? '' : ' is-open') }, [CH.el('b', { text: g }), right]);
            rows[g] = li;
            book.appendChild(li);
        });
        el.appendChild(book);

        function ok(g) { return known[g] != null || (guess[g] && CH.print(guess[g]) === prints[g]); }
        function word(g) { return known[g] != null ? known[g] : (ok(g) ? CH.letters(guess[g]).toLowerCase() : (guess[g] ? CH.letters(guess[g]).toLowerCase() + '?' : '???')); }
        function mark(g) { cells.forEach(function (c) { c.el.classList.toggle('is-on', g != null && c.g === g); }); }
        function flash(g) { var r = rows[g]; if (!r) return; r.classList.add('is-on'); r.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { r.classList.remove('is-on'); }, 1200); }
        function render() {
            cells.forEach(function (c) {
                c.w.textContent = word(c.g);
                c.el.classList.toggle('is-open', known[c.g] == null && !ok(c.g));
                c.el.classList.toggle('is-found', known[c.g] == null && ok(c.g));
            });
            Object.keys(inputs).forEach(function (g) { rows[g].classList.toggle('is-found', ok(g)); });
            if (opt.onChange) opt.onChange(api);
        }
        api.plain = function () { return groups.map(word).join(' '); };
        api.left = function () { return Object.keys(inputs).filter(function (g) { return !ok(g); }).length; };
        api.total = function () { return Object.keys(inputs).length; };
        api.solved = function () { return api.left() === 0; };
        render();
        return api;
    };
})();
