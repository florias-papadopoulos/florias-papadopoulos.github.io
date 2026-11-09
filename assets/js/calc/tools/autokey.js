/* Toolbox: autokey cipher (Vigenère's own): the key is a primer followed by the plaintext itself. Decryption
   recovers the key as it goes. */
Calc.tool({
    id: 'autokey',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Attack at dawn'),
        { id: 'key', type: 'text', label: 'Primer (start of the key)', placeholder: 'QUEENLY' }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'attack at dawn', key: 'QUEENLY', keep: true, caseK: false, five: false },
        { text: 'QNXEPV YT WTWP', key: 'QUEENLY', keep: true, caseK: false, five: false, _action: 'dec' },
        { text: 'Meet me by the old oak tree at noon.', key: 'K', keep: true, caseK: true, five: true }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', p = C.prep(v.text), K = C.letterKey(v.key, 'key', 'The primer');
        C.needLetters(p);
        /* returns {out, key}: key is the full running key (primer then plaintext) */
        function go(L, e) {
            var o = '', key = K, plain = '';
            for (var i = 0; i < L.length; i++) {
                var k = C.idx(key.charAt(i)), x = C.idx(L.charAt(i));
                var y = C.mod(e ? x + k : x - k, 26), pl = e ? L.charAt(i) : C.AZ.charAt(y);
                o += C.AZ.charAt(y);
                plain += pl;
                if (key.length < L.length) key += pl;
            }
            return { out: o, key: key.slice(0, L.length) };
        }
        var r = go(p.L, enc), out = r.out, key = r.key, plain = enc ? p.L : out;
        C.result(S, C.put(p, out, v), enc);

        var s1 = S.step('Build the running key');
        s1.p('The key starts with the primer ' + Calc.esc(K) + ' and continues with the plaintext itself, letter by letter. So the key never repeats. Counting positions from $i = 0$, the key letter $k_i$ is')
            .math('k_i = \\begin{cases} \\text{letter } i \\text{ of the primer} & i < ' + K.length + ' \\\\ p_{i - ' + K.length + '} & i \\ge ' + K.length + ' \\end{cases}');
        if (!enc) s1.p('When decrypting, the plaintext is not known in advance: each plain letter is found first and then added to the end of the key, ready for use ' + K.length + ' letter' + (K.length > 1 ? 's' : '') + ' later.');
        var n = Math.min(p.L.length, 96);
        s1.pre('Plain:  ' + plain.slice(0, n) + '\nKey:    ' + key.slice(0, n) + '\nCipher: ' + (enc ? out : p.L).slice(0, n) + (p.L.length > n ? '\n(first ' + n + ' letters)' : ''));

        var rows = [];
        for (var m = 0; m < p.L.length; m++) {
            var x = C.idx(p.L.charAt(m)), kc = key.charAt(m), k = C.idx(kc);
            rows.push([p.L.charAt(m), x, kc, m < K.length ? 'primer' : 'plain letter ' + (m - K.length + 1), k, C.modCell(x + (enc ? ' + ' : ' - ') + k, enc ? x + k : x - k), out.charAt(m)]);
        }
        S.step('Letter by letter').p(enc ? 'Add the key letter: $c_i = (p_i + k_i) \\bmod 26$.' : 'Subtract the key letter: $p_i = (c_i - k_i) \\bmod 26$; the plain letter found becomes a later key letter.')
            .table([enc ? 'Plain' : 'Cipher', enc ? '$p_i$' : '$c_i$', 'Key', 'Key from', '$k_i$', enc ? '$p_i + k_i \\bmod 26$' : '$c_i - k_i \\bmod 26$', enc ? 'Cipher' : 'Plain'], rows, { mono: true });
        C.checkBack(S, enc, go(out, !enc).out, p.L, '(letters only)');
    }
});
