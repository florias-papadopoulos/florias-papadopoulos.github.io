/* Toolbox: Paillier encryption with g = n + 1: keys, encryption of two messages, the homomorphic addition
   E(m1) * E(m2) = E(m1 + m2) and its decryption with L(u) = (u - 1) / n. */
Calc.tool({
    id: 'paillier',
    inputs: [
        { id: 'p', label: 'Prime $p$', placeholder: '17' },
        { id: 'q', label: 'Prime $q$', placeholder: '19' },
        { id: 'm1', type: 'text', label: 'Message $m_1$', placeholder: '42', optional: true },
        { id: 'm2', type: 'text', label: 'Message $m_2$', placeholder: '100', optional: true },
        { id: 'r1', type: 'text', label: 'Randomness $r_1$', placeholder: '23', optional: true, help: 'Empty: drawn at random.' },
        { id: 'r2', type: 'text', label: 'Randomness $r_2$', placeholder: '81', optional: true, help: 'Empty: drawn at random.' },
        { id: 'c', type: 'text', label: 'Ciphertext $c$ (to decrypt)', optional: true, width: 'l' }
    ],
    actions: [{ id: 'add', label: 'Encrypt and add' }, { id: 'dec', label: 'Decrypt' }],
    examples: [
        { p: '17', q: '19', m1: '42', m2: '100', r1: '23', r2: '81', c: '' },
        { p: '17', q: '19', m1: '', m2: '', r1: '', r2: '', c: '88465', _action: 'dec' },
        { p: '2^61 - 1', q: '2^89 - 1', m1: '123456789', m2: '987654321', r1: '', r2: '', c: '' },
        { p: '11', q: '13', m1: '100', m2: '80', r1: '5', r2: '7', c: '' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex, p = v.p, q = v.q;
        if (p === q) Calc.fail('p and q must be two different primes.', 'q');
        var s1 = S.step('Key generation: check $p$ and $q$');
        s1.check(nt.isPrime(p), '$p = ' + T(p) + '$ is prime').check(nt.isPrime(q), '$q = ' + T(q) + '$ is prime');
        M.needPrime(p, 'p', 'p');
        M.needPrime(q, 'q', 'q');
        var n = p * q, n2 = n * n, phi = (p - 1n) * (q - 1n);
        if (nt.bitLength(n) > 1024) Calc.fail('n = p * q has more than 1024 bits; this walkthrough stops there.', 'p');
        var gg = nt.gcd(n, phi);
        s1.check(gg === 1n, '$\\gcd(pq, (p-1)(q-1)) = \\gcd(' + T(n) + ', ' + T(phi) + ') = ' + T(gg) + '$');
        if (gg !== 1n) Calc.fail('gcd(pq, (p-1)(q-1)) = ' + gg + ', not 1: Paillier needs it to be 1 (true for primes of the same size).', 'q');
        var lam = nt.lcm(p - 1n, q - 1n), g = n + 1n;
        S.step('The modulus and Carmichael\'s function').lines([
            'n &= p \\cdot q = ' + T(p) + ' \\cdot ' + T(q) + ' = ' + T(n) + ', \\quad n^2 = ' + T(n2),
            '\\lambda &= \\operatorname{lcm}(p - 1, q - 1) = \\operatorname{lcm}(' + T(p - 1n) + ', ' + T(q - 1n) + ') = ' + T(lam),
            'g &= n + 1 = ' + T(g)
        ]).p('With $g = n + 1$, powers are easy: by the binomial theorem $(1 + n)^x = 1 + xn + \\binom{x}{2} n^2 + \\ldots \\equiv 1 + xn \\pmod{n^2}$.');
        var sm = S.step('Private value $\\mu = L(g^\\lambda \\bmod n^2)^{-1} \\bmod n$');
        sm.p('Here $L(u) = (u - 1)/n$. Since $g^\\lambda \\equiv 1 + \\lambda n \\pmod{n^2}$, $L(g^\\lambda \\bmod n^2) = \\lambda \\bmod n = ' + T(lam % n) + '$, so $\\mu = \\lambda^{-1} \\bmod n$:');
        var mu = M.invStep(sm, lam, n, '\\mu');
        S.step('The keys').list(['Public key: $(n, g) = (' + T(n) + ', ' + T(g) + ')$', 'Private key: $(\\lambda, \\mu) = (' + T(lam) + ', ' + T(mu) + ')$']);

        function enc(mv, rv, i, fm, fr) {
            var m = M.optInt(mv, fm);
            if (m === null) Calc.fail('Please enter the message m' + i + '.', fm);
            if (m < 0n || m >= n) Calc.fail('A message is a number from 0 to n - 1 = ' + (n - 1n) + '.', fm);
            var r = M.optInt(rv, fr), drawn = r === null;
            if (drawn) { do { r = M.rand(1n, n - 1n); } while (nt.gcd(r, n) !== 1n); }
            if (r < 1n || r >= n || nt.gcd(r, n) !== 1n) Calc.fail('The randomness must be from 1 to n - 1 and coprime to n.', fr);
            var s = S.step('Encrypt $m_' + i + ' = ' + T(m) + '$: $c_' + i + ' = g^{m_' + i + '} \\cdot r_' + i + '^n \\bmod n^2$');
            s.p((drawn ? 'Draw $r_' + i + '$ at random, coprime to $n$: ' : 'With ') + '$r_' + i + ' = ' + T(r) + '$. First $g^{m_' + i + '} \\equiv 1 + m_' + i + ' n = 1 + ' + T(m) + ' \\cdot ' + T(n) + ' = ' + T(1n + m * n) + (1n + m * n >= n2 ? ' \\equiv ' + T((1n + m * n) % n2) : '') + ' \\pmod{n^2}$, then $r_' + i + '^n$:');
            var rn = M.powStep(s, r, n, n2, { name: 'r_' + i + '^n \\equiv ' + T(r) + '^{' + T(n) + '}', explain: i === 1 });
            var gm = (1n + m * n) % n2, c = gm * rn % n2;
            s.math('c_' + i + ' \\equiv ' + T(gm) + ' \\cdot ' + T(rn) + ' \\equiv ' + T(c) + ' \\pmod{' + T(n2) + '}');
            return { m: m, c: c };
        }
        function dec(c, title) {
            var s = S.step(title);
            var u = M.powStep(s, c, lam, n2, { name: 'u \\equiv ' + T(c) + '^{' + T(lam) + '}' });
            var Lu = (u - 1n) / n, m = Lu * mu % n;
            s.lines(['L(u) &= \\frac{u - 1}{n} = \\frac{' + T(u - 1n) + '}{' + T(n) + '} = ' + T(Lu), 'm &= L(u) \\cdot \\mu \\bmod n = ' + T(Lu) + ' \\cdot ' + T(mu) + ' \\bmod ' + T(n) + ' = ' + T(m)]);
            s.p('Why it works: $c^\\lambda = g^{m\\lambda} r^{n\\lambda} \\equiv (1 + n)^{m\\lambda} \\equiv 1 + m\\lambda n \\pmod{n^2}$, because $r^{n\\lambda} \\equiv 1$ (the group $\\mathbb{Z}_{n^2}^*$ has exponent $n\\lambda$). So $L(u) \\equiv m\\lambda$ and multiplying by $\\mu = \\lambda^{-1}$ leaves $m$.');
            return m;
        }
        if (v._action === 'dec') {
            var c0 = M.optInt(v.c, 'c');
            if (c0 === null) Calc.fail('Please enter the ciphertext c to decrypt.', 'c');
            if (c0 < 1n || c0 >= n2 || nt.gcd(c0, n) !== 1n) Calc.fail('A ciphertext is a number from 1 to n^2 - 1 = ' + (n2 - 1n) + ', coprime to n.', 'c');
            var md = dec(c0, 'Decrypt: $u = c^\\lambda \\bmod n^2$, then $m = L(u) \\cdot \\mu \\bmod n$');
            S.result(['$m = ' + T(md) + '$'], { copy: String(md), label: 'Plaintext' });
            return;
        }
        var e1 = enc(v.m1, v.r1, 1, 'm1', 'r1'), e2 = enc(v.m2, v.r2, 2, 'm2', 'r2');
        var c = e1.c * e2.c % n2;
        S.step('Add under encryption: multiply the ciphertexts').math('c = c_1 \\cdot c_2 \\bmod n^2 = ' + T(e1.c) + ' \\cdot ' + T(e2.c) + ' \\bmod ' + T(n2) + ' = ' + T(c))
            .p('$c_1 c_2 = g^{m_1 + m_2} (r_1 r_2)^n$ is an encryption of $m_1 + m_2$ (with randomness $r_1 r_2$), computed without the private key.');
        var m = dec(c, 'Decrypt the product: $u = c^\\lambda \\bmod n^2$, then $m = L(u) \\cdot \\mu \\bmod n$');
        var want = (e1.m + e2.m) % n;
        S.step('Check').check(m === want, '$m = ' + T(m) + ' = (m_1 + m_2) \\bmod n = (' + T(e1.m) + ' + ' + T(e2.m) + ') \\bmod ' + T(n) + '$');
        S.result(['$c_1 = ' + T(e1.c) + '$, $c_2 = ' + T(e2.c) + '$', '$c_1 \\cdot c_2 \\bmod n^2 = ' + T(c) + '$, which decrypts to $' + T(m) + '$'], { copy: 'c1 = ' + e1.c + '\nc2 = ' + e2.c + '\nc1*c2 = ' + c + '\nm1 + m2 = ' + m, label: 'Homomorphic sum' });
        S.note('Sums are taken modulo $n$. Also $c_1^k \\bmod n^2$ encrypts $k \\cdot m_1$. Paillier is IND-CPA secure under the decisional composite residuosity assumption, but malleable by design; real keys have $n$ of 2048 bits or more.');
    }
});
