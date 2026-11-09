/* Toolbox: how big is a number? Bits and decimal digits with the log2 / log10 steps, the rule 2^k = 10^(0.301 k),
   bytes and hex digits, the time a brute force search of that many keys takes, and a table of the sizes that
   matter in cryptography (DES, AES, RSA, elliptic curves, hashes) with the closest one highlighted. */
Calc.tool({
    id: 'bits-and-sizes',
    live: true,
    inputs: [
        { id: 'mode', type: 'select', label: 'I have', width: 'l', value: 'num', options: [['num', 'A number'], ['bits', 'A number of bits k (the size 2^k)']] },
        { id: 'n', label: 'Number', width: 'l', placeholder: '2^128', when: { mode: 'num' }, help: 'Any whole number, also as an expression: 2^128, 10^80, 2^2048 - 1, 52!.' },
        { id: 'k', label: 'Bits $k$', placeholder: '128', min: 0, max: 100000, when: { mode: 'bits' } }
    ],
    examples: [
        { mode: 'num', n: '2^128' },
        { mode: 'bits', k: '2048' },
        { mode: 'num', n: '52!' },
        { mode: 'bits', k: '56' },
        { mode: 'num', n: '10^80' },
        { mode: 'num', n: '1000000' }
    ],
    run: function (v, S) {
        var gm = Calc.lib.gmath, nt = Calc.lib.nt, T = Calc.tex, B = function (x) { return gm.bigTex(x, 40); };
        var LOG10_2 = 0.30102999566398120;
        /* log2 of a positive BigInt, accurate to about 15 digits */
        function lg2(x) { var b = nt.bitLength(x), sh = b > 60 ? b - 60 : 0; return sh + Math.log2(Number(x >> BigInt(sh))); }
        function fx(x, d) { return (+x.toFixed(d)).toString(); }
        /* a power of ten 10^e as m x 10^f */
        /* a logarithm whose integer part is known exactly (from the bit or digit count): that part, then 6 decimals */
        function lg(intPart, val) {
            var f = val - intPart;
            if (f < 0) f = 0;
            var d = Math.floor(f * 1e6);
            if (d > 999999) d = 999999;
            return d ? intPart + '.' + String(1000000 + d).slice(1).replace(/0+$/, '') : String(intPart);
        }
        function sci(e) { var f = Math.floor(e), m = Math.pow(10, e - f); if (m >= 9.995) { m = 1; f++; } return fx(m, 2) + ' \\times 10^{' + f + '}'; }
        var x, L, bitsN, digitsN, label;
        if (v.mode === 'bits') {
            var k = Number(v.k);
            x = 1n << BigInt(k);
            L = k;
            bitsN = k + 1;
            digitsN = String(x).length;
            label = '2^{' + k + '}';
            var s0 = S.step('From bits to digits: $2^k \\approx 10^{0.301\\,k}$');
            s0.p('Since $2 = 10^{\\log_{10} 2}$ with $\\log_{10} 2 \\approx 0.30103$, every power of two is a power of ten with an exponent about 0.3 times as large:');
            s0.math('2^{' + k + '} = 10^{' + k + ' \\cdot \\log_{10} 2} \\approx 10^{' + fx(k * LOG10_2, 4) + '} \\approx ' + sci(k * LOG10_2));
            s0.p('The number of decimal digits is the integer part of that exponent plus one: $\\lfloor ' + fx(k * LOG10_2, 4) + ' \\rfloor + 1 = ' + (Math.floor(k * LOG10_2) + 1) + '$.');
            s0.check(Math.floor(k * LOG10_2) + 1 === digitsN, 'Counting the digits of $2^{' + k + '}$ exactly gives ' + digitsN);
            s0.p('A rule of thumb: 10 bits are about 3 digits, because $2^{10} = 1024 \\approx 10^3$.');
            var s0b = S.step('Storage');
            s0b.p('$k$ bits hold the $2^k$ numbers $0, 1, \\dots, 2^k - 1$. ' + (k % 8 ? 'That is $' + k + ' / 8 = ' + fx(k / 8, 3) + '$ bytes, so $' + Math.ceil(k / 8) + '$ whole bytes' : 'That is $' + k + ' / 8 = ' + (k / 8) + '$ bytes') + ', or $' + Math.ceil(k / 4) + '$ hexadecimal digits.');
            if (k <= 4096) s0b.p('The largest $' + k + '$-bit number, $2^{' + k + '} - 1$, has ' + String(x - 1n).length + ' decimal digits' + (k > 0 ? ', and the smallest one with exactly ' + k + ' bits is $2^{' + (k - 1) + '}$' : '') + '.');
            S.result(['$2^{' + k + '} = ' + B(x) + '$', '$' + digitsN + '$ decimal digits, $\\approx ' + sci(k * LOG10_2) + '$'], { copy: String(x) });
        } else {
            var n0 = v.n, n = nt.abs(n0);
            if (n === 0n) {
                S.result('$0$: 1 digit, 0 bits', { copy: 'bits 0, digits 1' });
                S.step('Zero').p('0 is written with one digit; as a number to store it needs no bits at all (any bit string of length 0, or one bit 0 in practice).');
                return;
            }
            bitsN = nt.bitLength(n);
            digitsN = String(n).length;
            L = lg2(n);
            x = n;
            label = B(n);
            var s1 = S.step('Bits');
            s1.p('$x$ has $b$ bits when $2^{b-1} \\le x < 2^b$, that is $b = \\lfloor \\log_2 x \\rfloor + 1$.');
            s1.math('\\log_2 ' + (digitsN <= 25 ? B(n) : 'x') + ' \\approx ' + lg(bitsN - 1, L) + ' \\quad\\Longrightarrow\\quad b = \\lfloor ' + lg(bitsN - 1, L) + ' \\rfloor + 1 = ' + bitsN);
            s1.math('2^{' + (bitsN - 1) + '} \\le ' + (digitsN <= 25 ? B(n) : 'x') + ' < 2^{' + bitsN + '}');
            if ((n & (n - 1n)) === 0n) s1.p('$x$ is exactly $2^{' + (bitsN - 1) + '}$: a 1 followed by ' + (bitsN - 1) + ' zeros in binary, so it needs ' + bitsN + ' bits, one more than its exponent. The numbers below it, $0$ to $2^{' + (bitsN - 1) + '} - 1$, fit in ' + (bitsN - 1) + ' bits.');
            if (n0 < 0n) s1.p('The sign takes one more bit in a signed (two\'s complement) representation.');
            var s2 = S.step('Decimal digits');
            s2.p('In the same way $d = \\lfloor \\log_{10} x \\rfloor + 1$, and $\\log_{10} x = \\log_2 x \\cdot \\log_{10} 2$:');
            s2.math('\\log_{10} x \\approx ' + lg(bitsN - 1, L) + ' \\cdot 0.30103 \\approx ' + lg(digitsN - 1, L * LOG10_2) + ' \\quad\\Longrightarrow\\quad d = \\lfloor ' + lg(digitsN - 1, L * LOG10_2) + ' \\rfloor + 1 = ' + digitsN);
            s2.p('So $x \\approx ' + sci(L * LOG10_2) + ' \\approx 2^{' + fx(L, 2) + '}$. Storage: $' + Math.ceil(bitsN / 8) + '$ bytes, $' + Math.ceil(bitsN / 4) + '$ hexadecimal digits.');
            S.result(['$' + bitsN + '$ bits, $' + digitsN + '$ decimal digits', '$' + (digitsN <= 25 ? B(n) + ' \\approx ' : '') + sci(L * LOG10_2) + ' \\approx 2^{' + fx(L, 2) + '}$'], { copy: 'bits ' + bitsN + ', digits ' + digitsN });
        }

        /* brute force */
        var sf = S.step('As a key space: how long does trying everything take?');
        sf.p('If $' + (v.mode === 'bits' ? label : 'x') + '$ is the number of possible keys, a brute force attack tries them one by one; on average it finds the key halfway. One year is about $3.16 \\times 10^7$ seconds.');
        var l10 = L * LOG10_2;
        function dur(lsec) {
            if (lsec < -2) return sci(lsec) + '\\text{ seconds}';
            if (lsec < Math.log10(60)) return fx(Math.pow(10, lsec), 2) + '\\text{ seconds}';
            if (lsec < Math.log10(3600)) return fx(Math.pow(10, lsec) / 60, 1) + '\\text{ minutes}';
            if (lsec < Math.log10(86400)) return fx(Math.pow(10, lsec) / 3600, 1) + '\\text{ hours}';
            if (lsec < Math.log10(31557600)) return fx(Math.pow(10, lsec) / 86400, 1) + '\\text{ days}';
            var ly = lsec - Math.log10(31557600);
            if (ly < 6) return fx(Math.pow(10, ly), 1) + '\\text{ years}';
            return sci(ly) + '\\text{ years}';
        }
        sf.table(['Keys per second', 'Who', 'Time to try all'], [
            ['$10^{9}$', 'one fast computer', '$' + dur(l10 - 9) + '$'],
            ['$10^{12}$', 'a thousand of them', '$' + dur(l10 - 12) + '$'],
            ['$10^{21}$', 'about the hash rate of the whole Bitcoin network (mid-2020s)', '$' + dur(l10 - 21) + '$']
        ]);
        sf.p('For comparison, the universe is about $1.4 \\times 10^{10}$ years old. Each extra bit doubles the time, so the margins in cryptography are counted in bits: a design with "128-bit security" asks about $2^{128}$ operations of an attacker.');

        /* common sizes */
        var SIZES = [
            [32, '2^{32}', 'IPv4 addresses; a 32-bit counter; searched in seconds'],
            [56, '2^{56}', 'DES keys; a dedicated machine searched them in days in 1998'],
            [lg2(435n * 10n ** 15n), '4.35 \\times 10^{17}', 'seconds since the Big Bang (about $2^{58.6}$)'],
            [64, '2^{64}', 'keys of 64 bits; within reach of large public efforts (RC5-64 was solved in 2002)'],
            [80, '2^{80}', 'the old minimum security level, no longer accepted for new systems'],
            [112, '2^{112}', 'the security of RSA-2048 and of 3-key Triple DES (NIST estimates)'],
            [128, '2^{128}', 'AES-128 keys; the security level of RSA-3072, of 256-bit elliptic curves (P-256, Curve25519) and of SHA-256 against collisions'],
            [192, '2^{192}', 'AES-192 keys; the security level of RSA-7680 and of 384-bit curves'],
            [lg2((function () { var f = 1n; for (var i = 2n; i <= 52n; i++) f *= i; return f; })()), '52!', 'the orders of a deck of 52 cards (about $2^{225.6}$)'],
            [256, '2^{256}', 'AES-256 keys and SHA-256 outputs; about the security of RSA-15360 and 512-bit curves'],
            [lg2(10n ** 80n), '10^{80}', 'roughly the number of atoms in the observable universe (about $2^{266}$)'],
            [2048, '2^{2048}', 'an RSA-2048 modulus: 2048 bits, 617 decimal digits']
        ];
        var best = 0;
        SIZES.forEach(function (r, i2) { if (Math.abs(r[0] - L) < Math.abs(SIZES[best][0] - L)) best = i2; });
        S.step('Sizes that matter in cryptography').p('The highlighted row is the closest to ' + (v.mode === 'bits' ? '$' + label + '$' : 'your number') + ' ($\\approx 2^{' + fx(L, 1) + '}$).')
            .table(['Size', 'Bits ($\\log_2$)', 'Decimal', 'What it is'], SIZES.map(function (r) {
                return ['$' + r[1] + '$', '$' + fx(r[0], 1) + '$', '$\\approx ' + sci(r[0] * LOG10_2) + '$', r[2]];
            }), { hl: best });
    }
});
