/* Toolbox: columnar transposition: the key turned into a column order, the text written in rows under it, the
   columns read off in that order (with or without filling the last row). */
Calc.tool({
    id: 'columnar-transposition',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('We are discovered. Flee at once.'),
        { id: 'key', type: 'text', label: 'Key', placeholder: 'ZEBRAS', help: 'A word (columns in alphabetical order) or numbers such as 3 1 4 2.' },
        { id: 'pad', type: 'select', label: 'Last row', width: 'l', value: 'none', options: [['none', 'Leave it short (irregular)'], ['fill', 'Fill it with filler letters']] },
        { id: 'filler', type: 'text', label: 'Filler', width: 's', value: 'X', placeholder: 'X', optional: true, when: { pad: 'fill' }, help: 'Used in turn, e.g. X or QKJEU.' }
    ].concat(Calc.lib.classic.transInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'We are discovered. Flee at once.', key: 'ZEBRAS', pad: 'none', chars: 'letters', caseK: false, five: true },
        { text: 'We are discovered. Flee at once.', key: 'ZEBRAS', pad: 'fill', filler: 'QKJEU', chars: 'letters', caseK: false, five: true },
        { text: 'EVLNA CDTES EAROF ODEEC WIREE', key: 'ZEBRAS', pad: 'none', chars: 'letters', caseK: false, five: false, _action: 'dec' },
        { text: 'Attack at dawn!', key: '3 1 4 2', pad: 'none', chars: 'all', caseK: true, five: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', ch = C.transChars(v.text, v);
        if (!ch.length) Calc.fail(v.chars === 'all' ? 'Please enter some text.' : 'The text has no letters A to Z.', 'text');
        var o = C.order(v.key, 'key'), n = o.n, added = 0;
        if (n > 200) Calc.fail('At most 200 columns.', 'key');
        if (enc && v.pad === 'fill' && ch.length % n) {
            var fl = Array.from(v.chars === 'all' ? String(v.filler || 'X') : Calc.lib.text.deaccent(v.filler || 'X').replace(/[^A-Za-z]/g, ''));
            if (!fl.length) Calc.fail('The filler needs at least one letter.', 'filler');
            if (!v.caseK) fl = fl.map(function (c) { return c.toUpperCase(); });
            while (ch.length % n) ch.push(fl[added++ % fl.length]);
        }
        var r = enc ? C.colEnc(ch, o.read) : C.colDec(ch, o.read);
        var res = C.transOut(r.out, v);
        C.result(S, res, enc, added ? 'The last row was completed with ' + added + ' filler character' + (added > 1 ? 's' : '') + '.' : !enc && v.pad === 'fill' ? 'If the sender filled the last row, the last characters are filler.' : '');

        var s1 = S.step('The column order');
        s1.p(/\d/.test(v.key) ? 'The numbers give the order in which the columns are read.' : 'Number the key letters in alphabetical order (equal letters from left to right): the column under the first letter of the alphabet is read first.');
        s1.table(['Key'].concat(o.labels.map(Calc.esc)), [['Order'].concat(o.rank.map(function (x) { return x + 1; }))], { mono: true });
        var head = o.labels.map(function (l, c) { return Calc.esc(l) + ' (' + (o.rank[c] + 1) + ')'; });
        var rows = r.grid.slice(0, 400).map(function (row) { var t = row.map(C.cell); while (t.length < n) t.push(''); return t; });
        var pieces = r.cols.map(function (col, t) { return [t + 1, Calc.esc(o.labels[o.read[t]]), col.map(C.cell).join('')]; });
        if (enc) {
            S.step('Write the text in rows').p('Write the ' + ch.length + ' characters row by row under the ' + n + ' key letters' + (ch.length % n ? '; the last row stays short' : '') + (added ? ', the last row filled with filler' : '') + (v.chars === 'all' ? ' (␣ is a space)' : '') + ':')
                .table(head, rows, { mono: true });
            S.step('Read the columns in key order').table(['Order', 'Column', 'Characters'], pieces, { mono: true });
        } else {
            var full = ch.length % n, rowsN = Math.ceil(ch.length / n);
            S.step('Cut the ciphertext into columns').p(ch.length + ' characters in ' + n + ' columns make ' + rowsN + ' rows' + (full ? (full === 1 ? ', and only the leftmost column reaches' : ', and only the ' + full + ' leftmost columns reach') + ' the last row: ' + (full === 1 ? 'it is ' : 'they are ') + rowsN + ' long, the others ' + (rowsN - 1) : ', all full') + '. Cut the ciphertext into pieces of these lengths, taking the columns in key order:')
                .table(['Order', 'Column', 'Piece of the ciphertext'], pieces, { mono: true });
            S.step('Set the columns under the key and read the rows').p('Each piece goes under its key letter' + (v.chars === 'all' ? ' (␣ is a space)' : '') + '; reading row by row gives the plaintext.')
                .table(head, rows, { mono: true });
        }
        var back = enc ? C.colDec(r.out, o.read).out : C.colEnc(r.out, o.read).out;
        C.checkBack(S, enc, back.join(''), ch.join(''), added ? '(with the filler)' : '');
    }
});
