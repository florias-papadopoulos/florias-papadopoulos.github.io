/* Toolbox: ADFGVX and ADFGX: a keyed Polybius square labelled with the letters A D F G V X, then a columnar
   transposition of the coordinates. */
Calc.tool({
    id: 'adfgvx',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Attack at 1200 am'),
        { id: 'variant', type: 'select', label: 'Cipher', width: 'l', value: 'adfgvx', options: [['adfgvx', 'ADFGVX: 6 by 6, letters and digits'], ['adfgx', 'ADFGX: 5 by 5, I and J share a cell']] },
        { id: 'sqkey', type: 'text', label: 'Square key', width: 'l', placeholder: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', optional: true, help: 'A keyword, or the whole square row by row.' },
        { id: 'key', type: 'text', label: 'Transposition key', placeholder: 'PRIVACY' },
        { id: 'five', type: 'check', label: 'Output in groups of five', value: true }
    ],
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Attack at 1200 am', variant: 'adfgvx', sqkey: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', key: 'PRIVACY', five: true },
        { text: 'DGDD DAGD DGAF ADDF DADV DVFA ADVX', variant: 'adfgvx', sqkey: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', key: 'PRIVACY', five: false, _action: 'dec' },
        { text: 'Attack at once', variant: 'adfgx', sqkey: 'BTALPDHOZKQFVSNGICUXMREWY', key: 'CARGO', five: true }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', six = v.variant !== 'adfgx';
        var lab = six ? 'ADFGVX' : 'ADFGX', kind = six ? 'd36' : 'ij', sq = C.square(v.sqkey || '', kind);
        var o = C.order(v.key, 'key');
        if (o.n > 200) Calc.fail('At most 200 columns.', 'key');
        var mid, out, r, rows = [];
        if (enc) {
            var P = C.sqChars(v.text, kind);
            if (!P.length) Calc.fail('The text has nothing the square can hold' + (six ? ' (letters and digits).' : ' (letters).'), 'text');
            mid = P.split('').map(function (c) { var q = sq.pos[c], pr = lab.charAt(q[0]) + lab.charAt(q[1]); rows.push([c === 'I' && !six ? 'I/J' : c, pr]); return pr; }).join('');
            r = C.colEnc(mid.split(''), o.read);
            out = r.out.join('');
        } else {
            var T = String(v.text).toUpperCase().split('').filter(function (c) { return lab.indexOf(c) >= 0; });
            if (!T.length) Calc.fail('The ciphertext has none of the letters ' + lab + '.', 'text');
            if (T.length % 2) Calc.fail('The ciphertext must have an even number of the letters ' + lab + ' (it has ' + T.length + ').', 'text');
            r = C.colDec(T, o.read);
            mid = r.out.join('');
            out = '';
            for (var i = 0; i < mid.length; i += 2) { var ch = sq.rows[lab.indexOf(mid.charAt(i))][lab.indexOf(mid.charAt(i + 1))]; out += ch; rows.push([mid.slice(i, i + 2), ch === 'I' && !six ? 'I/J' : ch]); }
        }
        C.result(S, v.five ? Calc.lib.text.groups(out, 5) : out, enc, !enc && !six && /I/.test(out) ? 'I and J share a cell: read each I as I or J, whichever makes sense.' : '');

        var t = C.squareTable(sq, lab);
        S.step('The square').p(C.squareWords(sq) + ' Rows and columns are labelled ' + lab.split('').join(', ') + ', letters chosen because they sound very different in Morse code.').table(t.head, t.rows, { mono: true });
        var head = o.labels.map(function (l, c) { return Calc.esc(l) + ' (' + (o.rank[c] + 1) + ')'; });
        var grid = r.grid.slice(0, 400).map(function (row) { var g = row.slice(); while (g.length < o.n) g.push(''); return g; });
        var cols = r.cols.map(function (col, i) { return [i + 1, Calc.esc(o.labels[o.read[i]]), col.join('')]; });
        var why = /\d/.test(v.key) ? 'the numbers of the key give the reading order' : 'the columns are read in the alphabetical order of the key letters, equal letters from left to right';
        if (enc) {
            S.step('Substitute: each character becomes two letters').p('Row label, then column label:').table(['Character', 'Pair'], rows, { mono: true }).p('Together: ' + C.short(mid, 120));
            S.step('Transpose: write the pairs in rows under the key').p('Write the ' + mid.length + ' letters row by row under the key ' + Calc.esc(o.labels.join('')) + '; ' + why + '.').table(head, grid, { mono: true });
            S.step('Read the columns in key order').table(['Order', 'Column', 'Letters'], cols, { mono: true });
        } else {
            var rowsN = Math.ceil(T.length / o.n), full = T.length % o.n;
            S.step('Undo the transposition: cut into columns').p(T.length + ' letters under ' + o.n + ' key letters make ' + rowsN + ' rows' + (full ? '; only the ' + full + ' leftmost columns reach the last row' : '') + '. Cut the ciphertext into columns of these lengths, in key order (' + why + '):')
                .table(['Order', 'Column', 'Letters'], cols, { mono: true });
            S.step('Read the rows').p('Set each column under its key letter and read row by row:').table(head, grid, { mono: true }).p('Together: ' + C.short(mid, 120));
            S.step('Undo the substitution: each pair is a row and a column').table(['Pair', 'Character'], rows, { mono: true });
        }
        /* check: the other direction */
        var back;
        if (enc) {
            var m2 = C.colDec(out.split(''), o.read).out.join(''), b2 = '';
            for (var k = 0; k < m2.length; k += 2) b2 += sq.rows[lab.indexOf(m2.charAt(k))][lab.indexOf(m2.charAt(k + 1))];
            back = b2;
            C.checkBack(S, enc, back, C.sqChars(v.text, kind), '');
        } else {
            back = C.colEnc(out.split('').map(function (c) { var q = sq.pos[c]; return lab.charAt(q[0]) + lab.charAt(q[1]); }).join('').split(''), o.read).out.join('');
            C.checkBack(S, enc, back, T.join(''), '(its letters ' + lab + ')');
        }
    }
});
