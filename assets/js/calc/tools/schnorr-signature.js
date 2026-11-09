/* Toolbox: Schnorr signatures in a subgroup of prime order q of Z_p^*: r = g^k, e = H(r || m) mod q, s = k - x e mod q;
   verification recomputes r from g^s y^e. The hash is SHA-256 or a stated toy hash. */
Calc.tool({
    id: 'schnorr-signature',
    inputs: [
        { id: 'p', label: 'Prime $p$', placeholder: '607' },
        { id: 'q', label: 'Prime $q$ dividing $p - 1$', placeholder: '101' },
        { id: 'g', label: 'Generator $g$ of order $q$', placeholder: '64' },
        { id: 'x', label: 'Private key $x$', placeholder: '37', help: 'From 1 to $q - 1$.' },
        { id: 'text', type: 'text', label: 'Message', placeholder: 'Hello', width: 'l', maxLength: 500 },
        { id: 'hash', type: 'select', label: 'Hash $H$', width: 'l', value: 'sha', options: [['sha', 'SHA-256, reduced mod q'], ['toy', 'Toy hash: the bytes as a number, mod q']] },
        { id: 'k', type: 'text', label: 'Nonce $k$ (to sign)', placeholder: '25', optional: true, help: 'Empty: drawn at random. Never reuse it.' },
        { id: 'sig', type: 'text', label: 'Signature $(e, s)$ (to verify)', placeholder: '12, 34', optional: true, width: 'l' }
    ],
    actions: [{ id: 'sign', label: 'Sign' }, { id: 'verify', label: 'Verify' }],
    examples: [
        { p: '607', q: '101', g: '64', x: '37', text: 'Hello', hash: 'toy', k: '25', sig: '' },
        { p: '607', q: '101', g: '64', x: '37', text: 'Hello', hash: 'sha', k: '', sig: '' },
        { p: '(2^128 + 84) * (2^127 + 29) + 1', q: '2^127 + 29', g: '12681870763165738614323761775430947950982576161237889604987157678906842875131', x: '2^100 + 12345', text: 'Pay Bob 5 euros', hash: 'sha', k: '', sig: '' },
        { p: '607', q: '101', g: '64', x: '37', text: 'Hello', hash: 'toy', k: '', sig: '89, 65', _action: 'verify' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex, p = v.p, q = v.q;
        M.needPrime(p, 'p', 'p');
        M.needPrime(q, 'q', 'q');
        if (nt.bitLength(p) > 4096) Calc.fail('p has more than 4096 bits; this walkthrough stops there.', 'p');
        if ((p - 1n) % q !== 0n) Calc.fail('q = ' + q + ' does not divide p - 1 = ' + (p - 1n) + ', so Z_p^* has no subgroup of order q.', 'q');
        var g = nt.mod(v.g, p), cof = (p - 1n) / q;
        var s0 = S.step('Group parameters: a subgroup of prime order $q$ in $\\mathbb{Z}_p^*$');
        s0.check(true, '$p = ' + T(p) + '$ and $q = ' + T(q) + '$ are prime');
        s0.check(true, '$q$ divides $p - 1$: $p - 1 = ' + T(cof) + ' \\cdot ' + T(q) + '$');
        var gq = nt.powmod(g, q, p);
        s0.p('Since $q$ is prime, $g$ has order exactly $q$ when $g \\ne 1$ and $g^q \\equiv 1 \\pmod p$:');
        s0.math(T(g) + '^{' + T(q) + '} \\equiv ' + T(gq) + ' \\pmod{' + T(p) + '}');
        if (g === 1n || gq !== 1n) {
            var hh = 2n, sug;
            while ((sug = nt.powmod(hh, cof, p)) === 1n) hh++;
            Calc.fail('g = ' + g + ' does not have order q (g^q = ' + gq + ' mod p). An element of order q is h^((p-1)/q) mod p for any h giving a value other than 1, e.g. g = ' + hh + '^' + cof + ' mod p = ' + sug + '.', 'g');
        }
        s0.check(true, '$g = ' + T(g) + '$ has order $q$');
        var x = v.x;
        if (x < 1n || x >= q) Calc.fail('The private key must be from 1 to q - 1 = ' + (q - 1n) + '.', 'x');
        var y = M.powStep(S.step('Key generation: public key $y \\equiv g^x \\pmod p$'), g, x, p, { name: 'y \\equiv ' + T(g) + '^{' + T(x) + '}' });
        S.step('The keys').list(['Public key: $y = ' + T(y) + '$ (with the group $p, q, g$)', 'Private key: $x = ' + T(x) + '$']);

        var mb = M.utf8(v.text), mnum = M.bytesToInt(mb), lenP = M.intToBytes(p).length;
        function H(s, r, rn, en, explain) {
            var rb = M.intToBytes(r, lenP), all = rb.concat(mb);
            s.p('The input of the hash is $' + rn + '$ as ' + lenP + ' bytes (big-endian), followed by the UTF-8 bytes of the message:');
            var mh = mb.length > 40 ? '\\texttt{' + M.hex(mb.slice(0, 24)) + '}\\ldots\\texttt{' + M.hex(mb.slice(-8)) + '}' : '\\texttt{' + M.hex(mb) + '}';
            s.math(rn + ' \\,\\|\\, m = \\texttt{' + M.hex(rb) + '}\\;' + mh);
            if (v.hash === 'sha') {
                var d = M.sha256(all), dv = M.bytesToInt(d), e = dv % q;
                s.math('\\mathrm{SHA\\text{-}256}(' + rn + ' \\,\\|\\, m) = \\texttt{' + M.hex(d).toLowerCase() + '} = ' + T(dv));
                s.math(en + ' = ' + T(dv) + ' \\bmod ' + T(q) + ' = ' + T(e));
                return e;
            }
            var big = M.bytesToInt(all), e2 = big % q;
            if (explain) s.p('Toy hash: the bytes read as one number, reduced modulo $q$, that is $H(' + rn + ' \\| m) = (' + rn + ' \\cdot 256^{' + mb.length + '} + \\bar m) \\bmod q$ with $\\bar m = ' + T(mnum) + '$ the message bytes as a number. It is easy to compute by hand but has no security at all (collisions are trivial).');
            s.math(en + ' = (' + T(r) + ' \\cdot 256^{' + mb.length + '} + ' + T(mnum) + ') \\bmod ' + T(q) + ' = ' + T(big) + ' \\bmod ' + T(q) + ' = ' + T(e2));
            return e2;
        }
        var e, s;
        if (v._action === 'sign') {
            var k = M.optInt(v.k, 'k'), drawn = k === null;
            if (drawn) k = M.rand(1n, q - 1n);
            if (k < 1n || k >= q) Calc.fail('The nonce must be from 1 to q - 1.', 'k');
            S.step('Signing: choose a fresh secret nonce $k$').p(drawn ? 'Drawn uniformly from $1 \\le k \\le q - 1$: $k = ' + T(k) + '$.' : '$k = ' + T(k) + '$.');
            var r = M.powStep(S.step('Commitment $r \\equiv g^k \\pmod p$'), g, k, p, { name: 'r \\equiv ' + T(g) + '^{' + T(k) + '}', explain: false });
            e = H(S.step('Challenge $e = H(r \\,\\|\\, m)$'), r, 'r', 'e', true);
            s = nt.mod(k - x * e, q);
            S.step('Response $s \\equiv k - x \\cdot e \\pmod q$').math('s \\equiv ' + T(k) + ' - ' + T(x) + ' \\cdot ' + T(e) + ' = ' + T(k - x * e) + ' \\equiv ' + T(s) + ' \\pmod{' + T(q) + '}');
            S.result(['$(e, s) = (' + T(e) + ', ' + T(s) + ')$'], { copy: e + ', ' + s, label: 'Signature' });
        } else {
            var l = M.optList(v.sig, 'sig');
            if (!l) Calc.fail('Please enter the signature e, s to verify.', 'sig');
            if (l.length !== 2) Calc.fail('The signature is two numbers: e, s.', 'sig');
            e = l[0]; s = l[1];
            if (e < 0n || e >= q || s < 0n || s >= q) Calc.fail('Both parts of the signature are numbers from 0 to q - 1.', 'sig');
        }
        var gs = M.powStep(S.step('Verification: $g^s \\bmod p$'), g, s, p, { name: 'g^s \\equiv ' + T(g) + '^{' + T(s) + '}', explain: false });
        var ye = M.powStep(S.step('Verification: $y^e \\bmod p$'), y, e, p, { name: 'y^e \\equiv ' + T(y) + '^{' + T(e) + '}', explain: false });
        var rv = gs * ye % p;
        S.step('Recompute the commitment $r_v \\equiv g^s \\cdot y^e \\pmod p$').math('r_v \\equiv ' + T(gs) + ' \\cdot ' + T(ye) + ' = ' + T(gs * ye) + ' \\equiv ' + T(rv) + ' \\pmod{' + T(p) + '}')
            .p('For a genuine signature this is $r$: $g^s y^e = g^{k - xe} \\cdot g^{xe} = g^k$.');
        var ev = H(S.step('Recompute the challenge $e_v = H(r_v \\,\\|\\, m)$'), rv, 'r_v', 'e_v', v._action !== 'sign');
        var ok = ev === e;
        S.step('Compare').check(ok, ok ? '$e_v = ' + T(ev) + ' = e$: the signature is valid' : '$e_v = ' + T(ev) + ' \\ne e = ' + T(e) + '$: the signature is not valid');
        if (v._action === 'verify') S.result([ok ? 'Valid signature' : 'Invalid signature'], { copy: ok ? 'valid' : 'invalid', label: 'Verification' });
        S.note('Toy sizes: in $\\mathbb{Z}_p^*$, real parameters need $p$ of at least 2048 bits and $q$ of at least 256 bits. The nonce must be secret, uniform and fresh: two signatures with the same $k$ give $x \\equiv (s_1 - s_2)(e_2 - e_1)^{-1} \\pmod q$. EdDSA, the elliptic curve form of Schnorr, derives $k$ from the key and the message.');
    }
});
