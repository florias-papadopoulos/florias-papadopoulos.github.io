/* Toolbox: scytale: the text written along the rod in rows, the strip read off turn by turn (column by column). */
Calc.tool({
    id: 'scytale',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('I am hurt very badly help'),
        { id: 'around', label: 'Letters around the rod', placeholder: '4', width: 's', min: 2, max: 1000, help: 'The thickness of the rod: how many letters one turn of the strip holds.' },
        { id: 'pad', type: 'select', label: 'Last row', width: 'l', value: 'none', options: [['none', 'Leave it short'], ['fill', 'Fill it with filler letters']] },
        { id: 'filler', type: 'text', label: 'Filler', width: 's', value: 'X', placeholder: 'X', optional: true, when: { pad: 'fill' } }
    ].concat(Calc.lib.classic.transInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'I am hurt very badly help', around: '4', pad: 'none', chars: 'letters', caseK: false, five: false },
        { text: 'IRYYATBHMVAEHEDLURLP', around: '4', pad: 'none', chars: 'letters', caseK: false, five: false, _action: 'dec' },
        { text: 'Send more troops', around: '3', pad: 'fill', filler: 'X', chars: 'letters', caseK: false, five: true }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', ch = C.transChars(v.text, v);
        if (!ch.length) Calc.fail(v.chars === 'all' ? 'Please enter some text.' : 'The text has no letters A to Z.', 'text');
        var d = Number(v.around), added = 0;
        if (enc && v.pad === 'fill' && ch.length % d) {
            var fl = Array.from(v.chars === 'all' ? String(v.filler || 'X') : Calc.lib.text.deaccent(v.filler || 'X').replace(/[^A-Za-z]/g, ''));
            if (!fl.length) Calc.fail('The filler needs at least one letter.', 'filler');
            if (!v.caseK) fl = fl.map(function (c) { return c.toUpperCase(); });
            while (ch.length % d) ch.push(fl[added++ % fl.length]);
        }
        var N = ch.length, L = Math.ceil(N / d), read = [];
        for (var i = 0; i < L; i++) read.push(i);
        /* the rows along the rod hold L letters each: a columnar transposition with L columns in their natural order */
        var r = enc ? C.colEnc(ch, read) : C.colDec(ch, read);
        C.result(S, C.transOut(r.out, v), enc, added ? 'The last row was completed with ' + added + ' filler character' + (added > 1 ? 's' : '') + '.' : '');

        var s1 = S.step('The size of the rod');
        s1.p('One turn of the strip around the rod holds ' + d + ' characters, one in each row. The ' + N + ' characters need $\\lceil ' + N + ' / ' + d + ' \\rceil = ' + L + '$ turns, so each row along the rod holds ' + L + ' characters' + (N % L ? ' and the last row used is shorter' : '') + '.');
        var head = [''].concat(read.map(function (c) { return 'turn ' + (c + 1); }));
        var rows = r.grid.slice(0, 300).map(function (row, k) { var t = row.map(C.cell); while (t.length < L) t.push(''); return ['row ' + (k + 1)].concat(t); });
        while (rows.length < d && rows.length < 300) { var e = ['row ' + (rows.length + 1)]; for (var q = 0; q < L; q++) e.push(''); rows.push(e); }
        if (enc) {
            S.step('Write along the rod').p('Wind the strip around the rod and write the text along it, row after row' + (v.chars === 'all' ? ' (␣ is a space)' : '') + ':').table(head, rows, { mono: true });
            S.step('Unwind the strip').p('Unwound, the strip shows the characters turn by turn, that is, column by column:')
                .table(['Turn', 'Characters'], r.cols.map(function (col, t) { return [t + 1, col.map(C.cell).join('')]; }), { mono: true });
        } else {
            S.step('Wind the strip around the rod').p('Cut the ciphertext into ' + L + ' turns. A turn holds one character for each row it crosses' + (N % L || r.grid.length < d ? ': ' + r.grid.length + ' for the first ' + (N % L || L) + (N % L ? ', ' + (r.grid.length - 1) + ' for the others (the last row is short)' : '') : ', ' + d + ' here') + '.')
                .table(['Turn', 'Characters'], r.cols.map(function (col, t) { return [t + 1, col.map(C.cell).join('')]; }), { mono: true });
            S.step('Read along the rod').p('Now the rows along the rod carry the plaintext:').table(head, rows, { mono: true });
        }
        var back = enc ? C.colDec(r.out, read).out : C.colEnc(r.out, read).out;
        C.checkBack(S, enc, back.join(''), ch.join(''), added ? '(with the filler)' : '');
    }
});
