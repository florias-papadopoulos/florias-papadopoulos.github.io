/* Toolbox: one-time pad on letters (Vernam with addition mod 26): a key as long as the message, used once; an
   empty key on encryption draws a fresh random key in the browser. */
Calc.tool({
    id: 'one-time-pad',
    live: false,
    inputs: [
        Calc.lib.classic.textInput('Meet at noon'),
        { id: 'key', type: 'textarea', label: 'Key (at least as many letters as the message; empty to draw a random key)', rows: 2, maxLength: 20000, optional: true, placeholder: 'XMCKLQZTRVOA' }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Meet at noon', key: 'XMCKLQZTRVOA', keep: true, caseK: true, five: false },
        { text: 'Jqgd lj mhfi', key: 'XMCKLQZTRVOA', keep: true, caseK: true, five: false, _action: 'dec' },
        { text: 'HELLO', key: 'XMCKL', keep: true, caseK: true, five: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, tx = Calc.lib.text, enc = v._action !== 'dec', p = C.prep(v.text);
        C.needLetters(p);
        var K = tx.letters(v.key || ''), drawn = false, n = p.L.length;
        if (!K) {
            if (!enc) Calc.fail('Decrypting needs the key that was used to encrypt.', 'key');
            if (n > 20000) Calc.fail('At most 20000 letters.', 'text');
            /* uniform letters: bytes below 234 = 9 * 26 taken mod 26, others drawn again */
            var cr = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null;
            while (K.length < n) {
                var buf = new Uint8Array(64);
                if (cr) cr.getRandomValues(buf); else for (var z = 0; z < 64; z++) buf[z] = Math.floor(Math.random() * 256);
                for (var y = 0; y < 64 && K.length < n; y++) if (buf[y] < 234) K += C.AZ.charAt(buf[y] % 26);
            }
            drawn = true;
        }
        if (K.length < n) Calc.fail('The key has ' + K.length + ' letters but the message has ' + n + '. A one-time pad needs a key at least as long as the message: repeating a shorter key turns it into a breakable Vigenère cipher.', 'key');
        function go(L, e) { var o = ''; for (var i = 0; i < L.length; i++) o += C.AZ.charAt(C.mod(C.idx(L.charAt(i)) + (e ? 1 : -1) * C.idx(K.charAt(i)), 26)); return o; }
        var out = go(p.L, enc);
        C.result(S, C.put(p, out, v), enc, drawn ? 'A fresh random key was drawn in your browser: ' + K + '. Keep it secret, give it to the receiver safely, and never use it again.' : '');
        if (K.length > n) S.note('Only the first ' + n + ' of the ' + K.length + ' key letters are used; the rest stays unused for the next message.');

        var s1 = S.step('The key');
        s1.p((drawn ? 'The key was drawn at random, each letter uniformly from A to Z (with the browser\'s cryptographic random generator). ' : '') + 'Key letter $i$ is used for letter $i$ of the message and for nothing else; with A = 0, ..., Z = 25:')
            .math(enc ? 'c_i = (p_i + k_i) \\bmod 26' : 'p_i = (c_i - k_i) \\bmod 26');
        var m = Math.min(n, 96);
        s1.pre((enc ? 'Plain:  ' : 'Cipher: ') + p.L.slice(0, m) + '\nKey:    ' + K.slice(0, m) + '\n' + (enc ? 'Cipher: ' : 'Plain:  ') + out.slice(0, m) + (n > m ? '\n(first ' + m + ' letters)' : ''));

        var rows = [];
        for (var i = 0; i < n; i++) {
            var x = C.idx(p.L.charAt(i)), k = C.idx(K.charAt(i));
            rows.push([p.L.charAt(i), x, K.charAt(i), k, C.modCell(x + (enc ? ' + ' : ' - ') + k, enc ? x + k : x - k), out.charAt(i)]);
        }
        S.step('Letter by letter').table([enc ? 'Plain' : 'Cipher', enc ? '$p_i$' : '$c_i$', 'Key', '$k_i$', enc ? '$p_i + k_i \\bmod 26$' : '$c_i - k_i \\bmod 26$', enc ? 'Cipher' : 'Plain'], rows, { mono: true });

        var c0 = enc ? out.charAt(0) : p.L.charAt(0), w = S.step('Why it cannot be broken, and why the key is used once');
        w.p('For a cipher letter such as ' + c0 + ', every plain letter is possible: plain letter $x$ comes from the key letter $(' + C.idx(c0) + ' - x) \\bmod 26$, and all key letters are equally likely. So the ciphertext alone says nothing about the message except its length: this is perfect secrecy (Shannon, 1949).');
        w.p('Two messages encrypted with the same key lose this: subtracting the ciphertexts cancels the key, $c_i - c\'_i \\equiv p_i - p\'_i \\pmod{26}$, and the difference of two English texts can be unpicked by guessing words. Hence one time.');
        C.checkBack(S, enc, go(out, !enc), p.L, '(letters only)');
    }
});
