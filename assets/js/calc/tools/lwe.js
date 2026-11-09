/* Toolbox: Regev-style encryption of one bit under learning with errors, with toy sizes: key, public matrix and
   vector, encryption with a random subset of the samples, decryption by rounding, and why (and when) the error
   stays small enough. The random choices come from a seeded generator, so a link repeats them. */
Calc.tool({
    id: 'lwe',
    inputs: [
        { id: 'n', label: 'Dimension $n$', placeholder: '4', width: 's', min: 1, max: 16 },
        { id: 'q', label: 'Modulus $q$', placeholder: '97', width: 's', min: 5, max: 1000000000 },
        { id: 'm', label: 'Samples $m$', placeholder: '8', width: 's', min: 1, max: 64 },
        { id: 'B', label: 'Error bound $B$', placeholder: '2', width: 's', min: 0, help: 'Errors are uniform in $\\{-B, \\ldots, B\\}$.' },
        { id: 'bit', type: 'select', label: 'Bit to encrypt', value: '1', options: [['0', '0'], ['1', '1']], width: 's' },
        { id: 'seed', type: 'text', label: 'Seed of the random choices', placeholder: '2024', optional: true, help: 'Empty: a new random seed.' }
    ],
    examples: [
        { n: '4', q: '97', m: '8', B: '2', bit: '1', seed: '2024' },
        { n: '4', q: '97', m: '16', B: '8', bit: '1', seed: '21' },
        { n: '8', q: '3329', m: '24', B: '3', bit: '1', seed: '' },
        { n: '4', q: '97', m: '8', B: '2', bit: '0', seed: '99' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex;
        var n = Number(v.n), q = v.q, m = Number(v.m), B = v.B, mu = BigInt(v.bit), half = q / 2n;
        if (B >= q / 2n) Calc.fail('The error bound must be smaller than q/2.', 'B');
        var seed = M.optInt(v.seed, 'seed'), drawnSeed = seed === null;
        if (drawnSeed) seed = M.rand(1n, 999999n);
        var R = M.prng(seed);
        function md(x) { return nt.mod(x, q); }
        function centered(x) { x = md(x); return x > q / 2n ? x - q : x; }
        function vt(a) { return '(' + a.map(T).join(', ') + ')'; }
        function draw() {
            var s = [], A = [], e = [], b = [];
            for (var j = 0; j < n; j++) s.push(R.int(0n, q - 1n));
            for (var i = 0; i < m; i++) {
                var row = [];
                for (j = 0; j < n; j++) row.push(R.int(0n, q - 1n));
                var ei = R.int(-B, B), dot = 0n;
                for (j = 0; j < n; j++) dot += row[j] * s[j];
                A.push(row); e.push(ei); b.push(md(dot + ei));
            }
            return { s: s, A: A, e: e, b: b };
        }
        function encrypt(K, bit) {
            var sel = [], u = [], vv = 0n;
            for (var i = 0; i < m; i++) sel.push(R.int(0n, 1n) === 1n);
            for (var j = 0; j < n; j++) u.push(0n);
            K.A.forEach(function (row, i) { if (!sel[i]) return; for (var j = 0; j < n; j++) u[j] += row[j]; vv += K.b[i]; });
            return { sel: sel, u: u.map(md), v: md(vv + bit * half) };
        }
        function decrypt(K, c) {
            var us = 0n;
            for (var j = 0; j < n; j++) us += c.u[j] * K.s[j];
            var d = md(c.v - us), dc = centered(d);
            return { us: md(us), d: d, dc: dc, bit: nt.abs(dc) * 4n > q ? 1n : 0n };
        }

        var q4 = Number(q) / 4, worst = BigInt(m) * B;
        var s0 = S.step('Parameters');
        s0.list(['Secret dimension $n = ' + n + '$, modulus $q = ' + T(q) + '$, $m = ' + m + '$ samples', 'Errors $e_i$ uniform in $\\{' + T(-B) + ', \\ldots, ' + T(B) + '\\}$', 'Random choices from the seed ' + seed + (drawnSeed ? ' (drawn now; enter it to repeat them)' : '')]);
        s0.p('Decryption is correct when the sum of the errors that encryption adds up stays below $q/4 = ' + q4 + '$ in absolute value. In the worst case it is $m \\cdot B = ' + T(worst) + '$, ' + (worst * 4n < q ? 'below $q/4$: decryption can never fail with these parameters.' : 'which is not below $q/4$: decryption can fail.'));

        var K = draw();
        var s1 = S.step('Key generation');
        s1.p('The secret key is a uniform vector $s \\in \\mathbb{Z}_{' + T(q) + '}^{' + n + '}$:');
        s1.math('s = ' + vt(K.s));
        s1.p('The public key is a uniform matrix $A$ with rows $a_i$ and the vector $b = A s + e \\bmod q$, with small errors $e_i$. Without $e$, Gaussian elimination would recover $s$ from $(A, b)$; with it, recovering $s$ is the learning with errors problem.');
        s1.table(['$i$', 'Row $a_i$', '$a_i \\cdot s \\bmod q$', '$e_i$', '$b_i = a_i \\cdot s + e_i \\bmod q$'], K.A.map(function (row, i) {
            return ['$' + (i + 1) + '$', '$' + vt(row) + '$', '$' + T(md(K.b[i] - K.e[i])) + '$', '$' + T(K.e[i]) + '$', '$' + T(K.b[i]) + '$'];
        }), { mono: true });

        var c = encrypt(K, mu), idx = [];
        c.sel.forEach(function (x, i) { if (x) idx.push(i + 1); });
        var s2 = S.step('Encrypt the bit $\\mu = ' + mu + '$');
        s2.p('Pick a random subset $S$ of the samples (each one with probability 1/2): $S = \\{' + (idx.length ? idx.join(', ') : '') + '\\}$' + (idx.length ? '.' : ' (empty this time).') + ' Add up those rows and their $b_i$, and add $\\mu \\cdot \\lfloor q/2 \\rfloor = ' + T(mu * half) + '$ to the second part:');
        s2.lines(['u &= \\sum_{i \\in S} a_i \\bmod q = ' + vt(c.u), 'v &= \\sum_{i \\in S} b_i + \\mu \\lfloor q/2 \\rfloor \\bmod q = ' + T(c.v)]);
        s2.p('The ciphertext is $(u, v)$. To anyone without $s$ it looks like a fresh LWE sample, so it hides $\\mu$.');

        var D = decrypt(K, c), E = 0n;
        c.sel.forEach(function (x, i) { if (x) E += K.e[i]; });
        var s3 = S.step('Decrypt: compute $v - u \\cdot s$ and round');
        s3.math('u \\cdot s \\bmod q = ' + T(D.us) + ', \\qquad d = v - u \\cdot s \\bmod q = ' + T(c.v) + ' - ' + T(D.us) + ' \\equiv ' + T(D.d) + (D.dc !== D.d ? ' \\equiv ' + T(D.dc) : ''));
        s3.p('Since $b_i = a_i \\cdot s + e_i$, everything but the errors cancels: $d \\equiv \\sum_{i \\in S} e_i + \\mu \\lfloor q/2 \\rfloor$. So $d$ is near 0 for $\\mu = 0$ and near $q/2$ for $\\mu = 1$. Taken in $(-q/2, q/2]$, $d = ' + T(D.dc) + '$, and the rule is: output 1 when $|d| > q/4 = ' + q4 + '$, else 0.');
        s3.math('|d| = ' + T(nt.abs(D.dc)) + (D.bit ? ' > ' : ' \\le ') + q4 + ' \\quad \\Rightarrow \\quad \\mu\' = ' + D.bit);
        var ok = D.bit === mu;
        var s4 = S.step('Check');
        s4.p('The noise of this ciphertext is $\\sum_{i \\in S} e_i = ' + T(E) + '$.');
        s4.check(ok, ok ? 'Decryption gives the bit back: $\\mu\' = ' + D.bit + ' = \\mu$' : 'Decryption error: $\\mu\' = ' + D.bit + ' \\ne \\mu = ' + mu + '$, because the noise $' + T(E) + '$ is too large');

        /* how often decryption fails with this key, over many fresh encryptions */
        var trials = 1000, fails = 0;
        for (var t = 0; t < trials; t++) { var bt = BigInt(t & 1), ct = encrypt(K, bt); if (decrypt(K, ct).bit !== bt) fails++; }
        var s5 = S.step('Why the error must stay small');
        s5.p('Each ciphertext adds up about $m/2$ errors, so its noise grows with $m$ and $B$. While the noise stays inside $(-q/4, q/4)$, rounding removes it; once it can reach $q/4$, the rounding may land on the wrong bit. Encrypting ' + trials + ' more bits (alternating 0 and 1) with this key:');
        s5.check(fails === 0, fails + ' decryption error' + (fails === 1 ? '' : 's') + ' out of ' + trials + ' (' + (100 * fails / trials).toFixed(1) + '%)');
        s5.p(fails ? 'Too much noise. Real schemes choose $q$, $B$ and the error distribution so that the failure probability is negligible (below $2^{-138}$ for Kyber).' : 'Try a larger error bound $B$ or more samples $m$ to see decryption fail. The errors cannot be too small either: without them, or with tiny ones in small dimension, $s$ is easy to recover.');
        S.result(['Ciphertext $(u, v) = (' + vt(c.u) + ', ' + T(c.v) + ')$', 'Decrypts to $' + D.bit + '$' + (ok ? '' : ' (a decryption error)')], { copy: c.u.join(' ') + ' | ' + c.v + '\ndecrypts to ' + D.bit, label: 'Encryption of ' + mu });
        S.note('Toy sizes: this $n$ offers no security at all. Real LWE schemes use $n$ in the hundreds (Kyber, standardized as ML-KEM, uses module LWE over polynomials of degree 256 modulo $q = 3329$, in dimension 512 to 1024) and pack many bits into one ciphertext.');
    }
});
