/* Toolbox: ElGamal encryption in Z_p^*: keys, encryption with a nonce k (given or drawn), decryption with the
   inverse of the shared value s. */
Calc.tool({
    id: 'elgamal',
    inputs: [
        { id: 'p', label: 'Prime $p$', placeholder: '23' },
        { id: 'g', label: 'Base $g$', placeholder: '5' },
        { id: 'x', label: 'Private key $x$', placeholder: '6' },
        { id: 'm', type: 'text', label: 'Message $m$ (to encrypt)', placeholder: '10', optional: true, help: 'A number from 1 to $p - 1$.' },
        { id: 'k', type: 'text', label: 'Nonce $k$ (to encrypt)', placeholder: '3', optional: true, help: 'Empty: drawn at random. Never reuse it.' },
        { id: 'ct', type: 'text', label: 'Ciphertext $(c_1, c_2)$ (to decrypt)', placeholder: '10, 14', optional: true, width: 'l' }
    ],
    actions: [{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }],
    examples: [
        { p: '23', g: '5', x: '6', m: '10', k: '3', ct: '' },
        { p: '23', g: '5', x: '6', m: '', k: '', ct: '10, 14', _action: 'dec' },
        { p: '2^89 - 1', g: '3', x: '123456789', m: '42424242', k: '', ct: '' },
        { p: '467', g: '2', x: '127', m: '100', k: '213', ct: '' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex, p = v.p;
        M.needPrime(p, 'p', 'p');
        if (p < 5n) Calc.fail('Take a prime p of at least 5.', 'p');
        if (nt.bitLength(p) > 4096) Calc.fail('p has more than 4096 bits; this walkthrough stops there.', 'p');
        var g = nt.mod(v.g, p);
        if (g <= 1n || g === p - 1n) Calc.fail('Take a base 1 < g < p - 1.', 'g');
        if (v.x < 1n || v.x > p - 2n) Calc.fail('Take a private key from 1 to p - 2.', 'x');
        var x = v.x;

        var s0 = S.step('Public parameters: $p = ' + T(p) + '$, $g = ' + T(g) + '$');
        s0.check(true, '$p$ is prime');
        var gi = M.groupStep(s0, g, p, 'g');
        var h = M.powStep(S.step('Key generation: public key $h \\equiv g^x \\pmod p$'), g, x, p, { name: 'h \\equiv ' + T(g) + '^{' + T(x) + '}' });
        S.step('The keys').list(['Public key: $(p, g, h) = (' + T(p) + ', ' + T(g) + ', ' + T(h) + ')$', 'Private key: $x = ' + T(x) + '$']);

        var m = null, c1, c2;
        if (v._action === 'enc') {
            m = M.optInt(v.m, 'm');
            if (m === null) Calc.fail('Please enter a message m to encrypt.', 'm');
            if (m < 1n || m >= p) Calc.fail('The message must be a number from 1 to p - 1 = ' + (p - 1n) + '.', 'm');
            var k = M.optInt(v.k, 'k'), drawn = k === null;
            if (drawn) k = M.rand(1n, p - 2n);
            if (k < 1n || k > p - 2n) Calc.fail('Take a nonce from 1 to p - 2.', 'k');
            S.step('Encryption: choose a fresh nonce $k$').p(drawn ? 'Drawn uniformly from $1 \\le k \\le p - 2$ with the browser\'s random generator: $k = ' + T(k) + '$.' : '$k = ' + T(k) + '$ (it must be secret and new for every message).');
            c1 = M.powStep(S.step('First part: $c_1 \\equiv g^k \\pmod p$'), g, k, p, { name: 'c_1 \\equiv ' + T(g) + '^{' + T(k) + '}', explain: false });
            var s = M.powStep(S.step('Shared value: $s \\equiv h^k \\pmod p$'), h, k, p, { name: 's \\equiv ' + T(h) + '^{' + T(k) + '}', explain: false });
            c2 = m * s % p;
            S.step('Second part: $c_2 \\equiv m \\cdot s \\pmod p$').math('c_2 \\equiv ' + T(m) + ' \\cdot ' + T(s) + ' = ' + T(m * s) + ' \\equiv ' + T(c2) + ' \\pmod{' + T(p) + '}');
            S.result(['$(c_1, c_2) = (' + T(c1) + ', ' + T(c2) + ')$'], { copy: c1 + ', ' + c2, label: 'Ciphertext' });
        } else {
            var l = M.optList(v.ct, 'ct');
            if (!l) Calc.fail('Please enter the ciphertext c1, c2 to decrypt.', 'ct');
            if (l.length !== 2) Calc.fail('The ciphertext is two numbers: c1, c2.', 'ct');
            c1 = l[0]; c2 = l[1];
            if (c1 < 1n || c1 >= p || c2 < 1n || c2 >= p) Calc.fail('Both parts must be from 1 to p - 1.', 'ct');
        }
        var s2 = M.powStep(S.step('Decryption: recompute the shared value $s \\equiv c_1^x \\pmod p$'), c1, x, p, { name: 's \\equiv ' + T(c1) + '^{' + T(x) + '}', explain: false });
        S.steps[S.steps.length - 1].p('This is the same $s$, because $c_1^x = (g^k)^x = (g^x)^k = h^k$.');
        var si = M.invStep(S.step('Invert $s$ modulo $p$'), s2, p, 's^{-1}');
        var m2 = c2 * si % p;
        S.step('Recover $m \\equiv c_2 \\cdot s^{-1} \\pmod p$').math('m \\equiv ' + T(c2) + ' \\cdot ' + T(si) + ' = ' + T(c2 * si) + ' \\equiv ' + T(m2) + ' \\pmod{' + T(p) + '}');
        if (m !== null) S.step('Check').check(m2 === m, 'Decryption gives the message back: $' + T(m2) + ' = m$');
        else S.result(['$m = ' + T(m2) + '$'], { copy: String(m2), label: 'Plaintext' });
        S.note('Textbook ElGamal is malleable ($(c_1, 2c_2)$ decrypts to $2m$), and in all of $\\mathbb{Z}_p^*$ it leaks the Legendre symbol of $m$; in practice it runs in a subgroup of prime order, or on an elliptic curve. Reusing $k$ reveals $m_2 = c_2\' \\cdot c_2^{-1} \\cdot m_1$.' + (gi.order !== null && gi.order !== p - 1n ? ' Here $g$ is not a generator (order $' + T(gi.order) + '$).' : ''));
    }
});
