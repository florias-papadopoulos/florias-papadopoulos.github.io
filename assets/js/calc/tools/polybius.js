/* Toolbox: Polybius square: every letter becomes its row and column in a 5x5 (or 6x6) square, keyed or not. */
Calc.tool({
    id: 'polybius',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Polybius square'),
        { id: 'sq', type: 'select', label: 'Square', width: 'l', value: 'ij', options: Calc.lib.classic.squareOptions(true) },
        { id: 'key', type: 'text', label: 'Keyword (optional)', placeholder: 'none', optional: true },
        { id: 'labels', type: 'text', label: 'Row and column labels', width: 's', placeholder: '12345', optional: true, help: 'Empty for 1 to 5 (or 1 to 6); letters such as ADFGX work too.' },
        { id: 'keep', type: 'check', label: 'Mark word breaks with /', value: true }
    ],
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Polybius square', sq: 'ij', key: '', labels: '', keep: true },
        { text: '23 15 31 31 34 / 52 34 42 31 14', sq: 'ij', key: '', labels: '', keep: true, _action: 'dec' },
        { text: 'Meet at 10 pm', sq: 'd36', key: 'SECRET', labels: '', keep: true },
        { text: 'Attack', sq: 'ij', key: 'KEYWORD', labels: 'ADFGX', keep: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, tx = Calc.lib.text, enc = v._action !== 'dec', sq = C.square(v.key || '', v.sq), n = sq.n;
        var lab = String(v.labels || '').trim().toUpperCase() || '123456'.slice(0, n);
        if (lab.length !== n || /[\s\/]/.test(lab) || lab.split('').some(function (c, i) { return lab.indexOf(c) !== i; })) Calc.fail('Give exactly ' + n + ' different labels (no spaces), for example ' + '123456'.slice(0, n) + '.', 'labels');
        var out = '', rows = [], plain = '', codes = [];
        if (enc) {
            var words = tx.deaccent(v.text).split(/\s+/).map(function (w) { return C.sqChars(w, v.sq); }).filter(Boolean);
            if (!words.length) Calc.fail('The text has nothing the square can hold.', 'text');
            var parts = words.map(function (w) {
                return w.split('').map(function (c) {
                    var p = sq.pos[c], code = lab.charAt(p[0]) + lab.charAt(p[1]);
                    rows.push([c === 'I' && v.sq === 'ij' ? 'I/J' : c, p[0] + 1, p[1] + 1, Calc.esc(code)]);
                    codes.push(code);
                    return code;
                }).join(' ');
            });
            out = v.keep ? parts.join(' / ') : parts.join(' ');
            plain = words.join('');
        } else {
            var s = String(v.text).toUpperCase(), syms = [];
            for (var i = 0; i < s.length; i++) { var c = s.charAt(i); if (lab.indexOf(c) >= 0) syms.push(c); else if (c === '/' && v.keep) syms.push('/'); }
            var seq = [], cur = [];
            syms.forEach(function (c) { if (c === '/') { if (cur.length % 2) Calc.fail('A word break falls between the two halves of a pair.', 'text'); seq.push('/'); } else cur.push(c); if (cur.length === 2) { seq.push(cur.join('')); cur = []; } });
            if (cur.length) Calc.fail('The coordinates do not come in pairs (one label is left over).', 'text');
            if (!seq.filter(function (x) { return x !== '/'; }).length) Calc.fail('The text has no coordinates made of the labels ' + lab + '.', 'text');
            seq.forEach(function (pr) {
                if (pr === '/') { if (out && out.slice(-1) !== ' ') out += ' '; return; }
                var r = lab.indexOf(pr.charAt(0)), k = lab.indexOf(pr.charAt(1)), ch = sq.rows[r][k];
                out += ch;
                plain += ch;
                codes.push(pr);
                rows.push([Calc.esc(pr), r + 1, k + 1, ch === 'I' && v.sq === 'ij' ? 'I/J' : ch]);
            });
            out = out.trim();
        }
        C.result(S, out, enc, !enc && v.sq === 'ij' && /I/.test(out) ? 'I and J share a cell: read each I as I or J, whichever makes sense.' : '');

        var t = C.squareTable(sq, lab);
        S.step('The square').p(C.squareWords(sq) + ' Rows and columns are labelled ' + Calc.esc(lab.split('').join(', ')) + '.').table(t.head, t.rows, { mono: true });
        var s2 = S.step(enc ? 'Each letter becomes its row and column' : 'Each pair is a row and a column');
        if (enc) s2.p('The label of the row comes first, then the label of the column.' + (v.sq === 'q' && /Q/i.test(tx.deaccent(v.text)) ? ' Q is not in the square and is left out.' : '') + (v.sq !== 'd36' && /\d/.test(v.text) ? ' Digits are not in this square and are left out.' : '') + (v.keep ? ' A / marks the end of a word.' : ''));
        else s2.p('Only the labels ' + Calc.esc(lab) + (v.keep ? ' and /' : '') + ' are read; everything else is ignored. The first label of a pair is the row, the second the column.');
        s2.table([enc ? 'Letter' : 'Pair', 'Row', 'Column', enc ? 'Code' : 'Letter'], rows, { mono: true });

        /* check: the other direction, from the codes back to the letters or the other way round */
        var back = enc ? codes.map(function (cd) { return sq.rows[lab.indexOf(cd.charAt(0))][lab.indexOf(cd.charAt(1))]; }).join('')
            : plain.split('').map(function (ch) { var q = sq.pos[ch]; return lab.charAt(q[0]) + lab.charAt(q[1]); }).join(' ');
        C.checkBack(S, enc, back, enc ? plain : codes.join(' '), enc ? '(its letters)' : '(its pairs)');
    }
});
