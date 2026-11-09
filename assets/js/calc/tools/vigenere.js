/* Toolbox: Vigenère cipher: the key repeated under the text, the rows of the tabula recta it uses, and a letter by
   letter table with the sum (or difference) modulo 26. */
Calc.tool({
    id: 'vigenere',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Attack at dawn'),
        { id: 'key', type: 'text', label: 'Key', placeholder: 'LEMON' }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'ATTACKATDAWN', key: 'LEMON', keep: true, caseK: true, five: false },
        { text: 'Attack at dawn!', key: 'lemon', keep: true, caseK: true, five: false },
        { text: 'LXFOPV EF RNHR', key: 'LEMON', keep: true, caseK: true, five: false, _action: 'dec' }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', p = C.prep(v.text), K = C.letterKey(v.key, 'key');
        C.needLetters(p);
        function go(L, e) { var o = ''; for (var i = 0; i < L.length; i++) o += C.AZ.charAt(C.mod(C.idx(L.charAt(i)) + (e ? 1 : -1) * C.idx(K.charAt(i % K.length)), 26)); return o; }
        var out = go(p.L, enc);
        C.result(S, C.put(p, out, v), enc, K.length === 1 ? 'A key of one letter is a Caesar shift by ' + C.idx(K) + '.' : '');

        var s1 = S.step('Write the key under the text');
        s1.p('The key ' + Calc.esc(K) + ' is repeated under the letters (spaces and punctuation do not use up key letters). With A = 0, ..., Z = 25, each key letter is a shift:');
        var kn = [];
        K.split('').forEach(function (c, i) { if (i < 30) kn.push(c + ' = ' + C.idx(c)); });
        s1.p(kn.join(', ') + (K.length > 30 ? ', ...' : '') + '.');
        var n = Math.min(p.L.length, 96), ks = '';
        for (var i = 0; i < n; i++) ks += K.charAt(i % K.length);
        s1.pre((enc ? 'Plain:  ' : 'Cipher: ') + p.L.slice(0, n) + '\nKey:    ' + ks + '\n' + (enc ? 'Cipher: ' : 'Plain:  ') + out.slice(0, n) + (p.L.length > n ? '\n(first ' + n + ' letters)' : ''));

        var used = [];
        K.split('').forEach(function (c) { if (used.indexOf(c) < 0) used.push(c); });
        if (used.length <= 13) {
            var hd = ['Key'].concat(C.AZ.split('')), rows0 = used.map(function (c) {
                var r = [c], sh = C.idx(c);
                for (var j = 0; j < 26; j++) r.push(C.AZ.charAt((j + sh) % 26));
                return r;
            });
            S.step('The rows of the tabula recta').p('The tabula recta has one row per key letter: the alphabet shifted by that letter. ' + (enc ? 'A plain letter (column on top) is replaced by the letter in the row of its key letter.' : 'To decrypt, find the cipher letter in the row of its key letter; the column on top is the plain letter.') + ' The rows this key uses:')
                .table(hd, rows0, { mono: true });
        }

        var rows = [];
        for (var m = 0; m < p.L.length; m++) {
            var x = C.idx(p.L.charAt(m)), kc = K.charAt(m % K.length), k = C.idx(kc);
            rows.push([p.L.charAt(m), x, kc, k, C.modCell(x + (enc ? ' + ' : ' - ') + k, enc ? x + k : x - k), out.charAt(m)]);
        }
        S.step('Letter by letter').p(enc ? 'Add the key letter: $c_i = (p_i + k_i) \\bmod 26$.' : 'Subtract the key letter: $p_i = (c_i - k_i) \\bmod 26$.')
            .table([enc ? 'Plain' : 'Cipher', enc ? '$p_i$' : '$c_i$', 'Key', '$k_i$', enc ? '$p_i + k_i \\bmod 26$' : '$c_i - k_i \\bmod 26$', enc ? 'Cipher' : 'Plain'], rows, { mono: true });
        C.checkBack(S, enc, go(out, !enc), p.L, '(letters only)');
    }
});
