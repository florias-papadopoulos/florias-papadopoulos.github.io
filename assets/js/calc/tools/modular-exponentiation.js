/* Toolbox: a^e mod n by square and multiply, over the bits of e from the left (or from the right), negative
   exponents through the inverse, and the Fermat or Euler shortcut for the exponent when it applies. */
(function () {
    'use strict';
    function plural(k, w) { return k + ' ' + w + (k === 1 ? '' : 's'); }
    Calc.tool({
        id: 'modular-exponentiation',
        live: true,
        inputs: [
            { id: 'a', label: 'Base $a$', placeholder: '5' },
            { id: 'e', label: 'Exponent $e$', placeholder: '117', help: 'A negative exponent uses the inverse of $a$.' },
            { id: 'n', label: 'Modulus $n$', placeholder: '19', min: 1 },
            { id: 'dir', type: 'select', label: 'Square and multiply', width: 'l', value: 'ltr', options: [
                ['ltr', 'Left to right (from the top bit)'],
                ['rtl', 'Right to left (from the lowest bit)']
            ] }
        ],
        examples: [{ a: '5', e: '117', n: '19', dir: 'ltr' }, { a: '4', e: '13', n: '497', dir: 'rtl' }, { a: '3', e: '-5', n: '7', dir: 'ltr' }, { a: '2', e: '10^20', n: '101', dir: 'ltr' }, { a: '7', e: '560', n: '561', dir: 'ltr' }, { a: '65', e: '17', n: '3233', dir: 'ltr' }],
        run: function (v, S) {
            var nt = Calc.lib.nt, M = Calc.lib.modArith, T = Calc.tex, P = M.par, a0 = v.a, e0 = v.e, n = v.n;
            if (nt.bitLength(n) > 8192) Calc.fail('Please use a modulus below 2^8192.', 'n');
            if (nt.bitLength(e0) > 20000) Calc.fail('Please use an exponent below 2^20000.', 'e');
            if (nt.bitLength(e0) * Math.max(64, nt.bitLength(n)) > 4194304) Calc.fail('Exponent and modulus are too large together to show every step (a 2048-bit exponent with a 2048-bit modulus is fine).', 'e');
            var head = P(a0) + '^{' + T(e0) + '}';
            function done(r, extra) {
                S.result('$' + head + ' \\equiv ' + T(r) + ' \\pmod{' + T(n) + '}$', { copy: String(r) });
                if (extra) S.note(extra);
            }
            if (n === 1n) {
                done(0n);
                S.step('Modulo 1').p('Every integer is a multiple of 1, so modulo 1 everything is congruent to $0$.');
                return;
            }
            var a = nt.mod(a0, n), e = e0;
            if (a !== a0) S.step('Reduce the base').p('Only the remainder of $a$ matters, since $a \\equiv a \\bmod n$ and products of congruent numbers are congruent:').math(T(a0) + ' \\bmod ' + T(n) + ' = ' + T(a));
            if (e < 0n) {
                var inv = M.inverseStep(S, a, n, 'Negative exponent: invert $' + T(a) + '$ modulo $' + T(n) + '$');
                if (inv === null) {
                    S.result('$' + head + '$ is not defined modulo $' + T(n) + '$', { copy: 'undefined' });
                    S.note('$a^{' + T(e0) + '} = (a^{-1})^{' + T(-e0) + '}$ needs the inverse of $a$, which exists only when $\\gcd(a, n) = 1$; here $\\gcd(' + T(a) + ', ' + T(n) + ') = ' + T(nt.gcd(a, n)) + '$.');
                    return;
                }
                S.step('Turn the exponent positive').p('$a^{-k} = (a^{-1})^k$, so continue with the base $' + T(inv) + '$ and the exponent $' + T(-e) + '$:').math(P(a0) + '^{' + T(e0) + '} \\equiv ' + T(inv) + '^{' + T(-e) + '} \\pmod{' + T(n) + '}');
                a = inv; e = -e;
            }
            if (e === 0n) {
                done(1n, a0 === 0n ? 'By the usual convention $0^0 = 1$ (the empty product).' : null);
                S.step('Exponent 0').p('A power with exponent 0 is the empty product, $a^0 = 1$, and $1 < ' + T(n) + '$ is already reduced.');
                return;
            }

            /* the bits */
            var bits = e.toString(2), L = bits.length, ones = bits.split('').filter(function (c) { return c === '1'; }).length;
            var sb = S.step('Write the exponent in binary');
            if (L <= 64) {
                sb.math(T(e) + ' = (' + bits + ')_2');
                if (L <= 16) {
                    var pw = [];
                    for (var i = 0; i < L; i++) if (bits.charAt(i) === '1') pw.push('2^{' + (L - 1 - i) + '}');
                    sb.math(T(e) + ' = ' + pw.join(' + '));
                }
            } else {
                sb.p('$' + T(e) + '$ has ' + L + ' bits:');
                sb.pre(bits.replace(/(.{64})/g, '$1\n').trim());
            }
            var big = nt.bitLength(e) <= 64;

            var r, compact = nt.bitLength(n) > 64;
            if (v.dir === 'ltr') {
                var st = S.step('Square and multiply, left to right');
                st.p('Start with $' + T(a) + '$ for the leading 1. For every next bit, square the running value (this doubles the exponent reached so far), and when the bit is 1, also multiply by $a = ' + T(a) + '$ (this adds 1). Reduce modulo $' + T(n) + '$ after every operation, so the numbers never grow.');
                var acc = a, k = 1n, rows = [];
                rows.push(['$1$', big ? '$1$' : '', '', '', '$' + T(acc) + '$']);
                for (var j = 1; j < L; j++) {
                    var bit = bits.charAt(j), sq = acc * acc % n, out = bit === '1' ? sq * a % n : sq;
                    k = 2n * k + (bit === '1' ? 1n : 0n);
                    if (compact) rows.push(['$' + bit + '$', big ? '$' + T(k) + '$' : '', '$' + T(sq) + '$', bit === '1' ? '$\\times\\, a$' : '', '$' + T(out) + '$']);
                    else rows.push(['$' + bit + '$', big ? '$' + T(k) + '$' : '', '$' + T(acc) + '^2 \\equiv ' + T(sq) + '$', bit === '1' ? '$' + T(sq) + ' \\cdot ' + T(a) + ' \\equiv ' + T(out) + '$' : '', '$' + T(out) + '$']);
                    acc = out;
                }
                var th = ['Bit', 'Exponent so far', compact ? 'Square $\\bmod n$' : 'Square', 'Multiply by $a$', 'Value $\\bmod ' + (compact ? 'n' : T(n)) + '$'];
                if (!big) { th.splice(1, 1); rows.forEach(function (x) { x.splice(1, 1); }); }
                st.table(th, rows, { hl: rows.length - 1 });
                r = acc;
                st.p('After the last bit the exponent reached is $' + (big ? T(e) : 'e') + '$, so $' + T(a) + '^{' + (big ? T(e) : 'e') + '} \\equiv ' + T(r) + '$. That took ' + plural(L - 1, 'squaring') + ' and ' + plural(ones - 1, 'multiplication') + ', instead of ' + (big ? T(e - 1n) : 'about $2^{' + (L - 1) + '}$') + ' multiplications one at a time.');
            } else {
                var sr = S.step('Square and multiply, right to left');
                sr.p('Go through the bits from the lowest. Keep the powers $a, a^2, a^4, a^8, \\dots$ (each the square of the one before), and multiply the result by $a^{2^i}$ whenever bit $i$ is 1. All modulo $' + T(n) + '$.');
                var base = a, res = 1n, rr = [];
                for (var i2 = 0; i2 < L; i2++) {
                    var b2 = bits.charAt(L - 1 - i2), before = res;
                    if (b2 === '1') res = res * base % n;
                    if (compact) rr.push(['$' + i2 + '$', '$' + b2 + '$', '$' + T(base) + '$', b2 === '1' ? '$' + T(res) + '$' : '(unchanged)']);
                    else rr.push(['$' + i2 + '$', '$' + b2 + '$', '$' + T(a) + '^{2^{' + i2 + '}} \\equiv ' + T(base) + '$', b2 === '1' ? '$' + T(before) + ' \\cdot ' + T(base) + ' \\equiv ' + T(res) + '$' : '$' + T(res) + '$ (unchanged)']);
                    if (i2 < L - 1) base = base * base % n;
                }
                sr.table(['$i$', 'Bit $e_i$', 'Power $a^{2^i}$', 'Result'], rr, { hl: rr.length - 1 });
                r = res;
                sr.p('That took ' + plural(L - 1, 'squaring') + ' and ' + plural(ones, 'multiplication') + ' (the first one, by 1, is free).');
            }
            var extra = null;

            /* the shortcut for the exponent */
            var g = nt.gcd(a, n), phi = null, prime = nt.isPrime(n);
            if (g === 1n) {
                if (prime) phi = n - 1n;
                else if (nt.bitLength(n) <= 64) phi = nt.phi(n);
            }
            if (phi !== null && e >= phi) {
                var er = e % phi, rs = nt.powmod(a, er, n);
                var sh = S.step(prime ? 'Shortcut: Fermat\'s little theorem' : 'Shortcut: Euler\'s theorem');
                if (prime) sh.p('$n = ' + T(n) + '$ is prime and does not divide $a$, so $a^{n-1} = a^{' + T(phi) + '} \\equiv 1$. The exponent can be reduced modulo $n - 1$:');
                else sh.p('$\\gcd(a, n) = 1$, so Euler\'s theorem gives $a^{\\varphi(n)} \\equiv 1$ with $\\varphi(' + T(n) + ') = ' + T(phi) + '$. The exponent can be reduced modulo $\\varphi(n)$:');
                sh.math(T(e) + ' = ' + T(e / phi) + ' \\cdot ' + T(phi) + ' + ' + T(er) + ' \\quad\\Rightarrow\\quad ' + T(a) + '^{' + T(e) + '} \\equiv (' + T(a) + '^{' + T(phi) + '})^{' + T(e / phi) + '} \\cdot ' + T(a) + '^{' + T(er) + '} \\equiv ' + T(a) + '^{' + T(er) + '} \\equiv ' + T(rs));
                sh.check(rs === r, 'The same value as square and multiply');
                extra = 'The exponent could also be reduced: $' + T(e) + ' \\bmod ' + T(phi) + ' = ' + T(er) + '$ (' + (prime ? 'Fermat' : 'Euler') + ').';
            } else if (g !== 1n && a !== 0n && e > 1n) {
                extra = '$\\gcd(' + T(a) + ', ' + T(n) + ') = ' + T(g) + '$, so Euler\'s theorem does not apply and the exponent cannot simply be reduced modulo $\\varphi(n)$.';
            }

            /* a direct check when the power is small enough to write down */
            if (BigInt(nt.bitLength(a)) * e <= 160n) {
                var full = a ** e, ck = S.step('Check by computing the power directly');
                ck.math(T(a) + '^{' + T(e) + '} = ' + T(full) + ' = ' + T(full / n) + ' \\cdot ' + T(n) + ' + ' + T(full % n));
                ck.check(full % n === r, 'The remainder is $' + T(r) + '$');
            }
            done(r, extra);
        }
    });
})();
