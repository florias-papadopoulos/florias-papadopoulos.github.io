/* Toolbox: Beaufort cipher c = (k - p) mod 26 (its own inverse), and the variant Beaufort c = (p - k) mod 26. */
Calc.tool({
    id: 'beaufort',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Defend the east wall of the castle'),
        { id: 'key', type: 'text', label: 'Key', placeholder: 'FORTIFICATION' },
        { id: 'variant', type: 'select', label: 'Variant', width: 'l', value: 'beaufort', options: [['beaufort', 'Beaufort: c = k - p'], ['german', 'Variant Beaufort: c = p - k']] }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Defend the east wall of the castle', key: 'FORTIFICATION', variant: 'beaufort', keep: false, caseK: false, five: false },
        { text: 'CKMPVCPVWPIWUJOGIUAPVWRIWUUK', key: 'FORTIFICATION', variant: 'beaufort', keep: true, caseK: true, five: false, _action: 'dec' },
        { text: 'Attack at dawn', key: 'LEMON', variant: 'german', keep: true, caseK: true, five: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', p = C.prep(v.text), K = C.letterKey(v.key, 'key'), G = v.variant === 'german';
        C.needLetters(p);
        /* one letter x with key letter k, encrypting (e) or decrypting */
        function f(x, k, e) { return G ? C.mod(e ? x - k : x + k, 26) : C.mod(k - x, 26); }
        function go(L, e) { var o = ''; for (var i = 0; i < L.length; i++) o += C.AZ.charAt(f(C.idx(L.charAt(i)), C.idx(K.charAt(i % K.length)), e)); return o; }
        var out = go(p.L, enc);
        C.result(S, C.put(p, out, v), enc, G ? 'The variant Beaufort is a Vigenère cipher run backwards: encrypting with it is decrypting Vigenère with the same key.' : 'The Beaufort cipher is its own inverse: decrypting is the same operation as encrypting.');

        var rule = G ? (enc ? 'c_i = (p_i - k_i) \\bmod 26' : 'p_i = (c_i + k_i) \\bmod 26') : (enc ? 'c_i = (k_i - p_i) \\bmod 26' : 'p_i = (k_i - c_i) \\bmod 26');
        var s1 = S.step('The rule and the key');
        s1.p('With A = 0, ..., Z = 25, every letter uses the key letter under it (the key ' + Calc.esc(K) + ' is repeated, other characters do not use key letters):').math(rule);
        if (!G) s1.p('Solving $c = k - p$ for $p$ gives $p = k - c$: the same formula, which is why one operation both encrypts and decrypts.');
        var n = Math.min(p.L.length, 96), ks = '';
        for (var i = 0; i < n; i++) ks += K.charAt(i % K.length);
        s1.pre((enc ? 'Plain:  ' : 'Cipher: ') + p.L.slice(0, n) + '\nKey:    ' + ks + '\n' + (enc ? 'Cipher: ' : 'Plain:  ') + out.slice(0, n) + (p.L.length > n ? '\n(first ' + n + ' letters)' : ''));

        var rows = [], xs = enc ? 'p_i' : 'c_i';
        for (var m = 0; m < p.L.length; m++) {
            var x = C.idx(p.L.charAt(m)), kc = K.charAt(m % K.length), k = C.idx(kc);
            var ex = G ? (enc ? x + ' - ' + k : x + ' + ' + k) : k + ' - ' + x, val = G ? (enc ? x - k : x + k) : k - x;
            rows.push([p.L.charAt(m), x, kc, k, C.modCell(ex, val), out.charAt(m)]);
        }
        var hcalc = '$' + (G ? (enc ? 'p_i - k_i' : 'c_i + k_i') : 'k_i - ' + xs) + ' \\bmod 26$';
        S.step('Letter by letter').table([enc ? 'Plain' : 'Cipher', '$' + xs + '$', 'Key', '$k_i$', hcalc, enc ? 'Cipher' : 'Plain'], rows, { mono: true });
        C.checkBack(S, enc, go(out, !enc), p.L, '(letters only)');
    }
});
