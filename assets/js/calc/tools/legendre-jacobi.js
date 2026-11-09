/* Toolbox: Legendre and Jacobi symbols (a/n), computed without factoring: reduce a mod n, take out factors 2 with the
   rule for (2/n), flip with quadratic reciprocity, repeat. Euler's criterion as a check when n is prime, the product
   of Legendre symbols over the prime factors otherwise. */
Calc.tool({
    id: 'legendre-jacobi',
    live: true,
    inputs: [
        { id: 'a', label: 'Top $a$', placeholder: '1001' },
        { id: 'n', label: 'Bottom $n$ (odd, positive)', placeholder: '9907', min: 1 }
    ],
    examples: [{ a: '1001', n: '9907' }, { a: '2', n: '15' }, { a: '-1', n: '13' }, { a: '19', n: '45' }, { a: '7', n: '2^127 - 1' }, { a: '12', n: '35' }],
    run: function (v, S) {
        var nt = Calc.lib.nt, T = Calc.lib.primes.T, a0 = v.a, n0 = v.n;
        if (n0 % 2n === 0n) Calc.fail('The bottom number must be odd (the Jacobi symbol is defined for odd n > 0).', 'n');
        if (nt.bitLength(n0) > 4096) Calc.fail('At most 4096 bits.', 'n');
        var prime = nt.isPrime(n0), name = prime ? 'Legendre symbol' : 'Jacobi symbol';
        function sym(x, y) { return '\\left(\\frac{' + T(x) + '}{' + T(y) + '}\\right)'; }
        var top = sym(a0, n0);
        function finish(val) {
            S.result('$' + top + ' = ' + val + '$', { copy: String(val), label: name });
        }
        var intro = S.step('Which symbol');
        if (n0 === 1n) {
            intro.p('By convention $\\left(\\frac{a}{1}\\right) = 1$ for every $a$ (the empty product of Legendre symbols).');
            finish(1);
            return;
        }
        intro.p(prime
            ? '$n = ' + T(n0) + '$ is prime, so this is the Legendre symbol: $1$ if $a$ is a nonzero square modulo $n$, $-1$ if it is not, $0$ if $n$ divides $a$.'
            : '$n = ' + T(n0) + '$ is composite, so this is the Jacobi symbol: the product of the Legendre symbols $\\left(\\frac{a}{p}\\right)$ over the prime factors $p$ of $n$, with multiplicity. It is computed below without factoring $n$.');
        var g = nt.gcd(a0, n0);
        if (g !== 1n) {
            S.step('A common factor').math('\\gcd(' + T(a0) + ', ' + T(n0) + ') = ' + T(g)).p('Some prime divides both, and that Legendre symbol is $0$, so the whole symbol is $0$.');
            finish(0);
            return;
        }
        /* the chain of rules */
        var rows = [], sign = 1, A = nt.mod(a0, n0), N = n0;
        function cur() { return (sign < 0 ? '-' : '') + sym(A, N); }
        rows.push(['', '$' + top + '$']);
        if (A !== a0) rows.push(['reduce $a \\bmod n$ (the symbol only depends on $a \\bmod n$)', '$' + cur() + '$']);
        var guard = 0;
        while (A !== 1n) {
            if (++guard > 100000) break;
            var k = 0;
            while (A % 2n === 0n) { A /= 2n; k++; }
            if (k) {
                var r8 = N % 8n, two = r8 === 1n || r8 === 7n ? 1 : -1;
                var flip = two < 0 && k % 2 === 1;
                if (flip) sign = -sign;
                rows.push(['take out $2' + (k > 1 ? '^{' + k + '}' : '') + '$: $' + T(N) + ' \\equiv ' + r8 + ' \\pmod 8$ gives $\\left(\\frac{2}{' + T(N) + '}\\right) = ' + two + '$' + (two < 0 && k > 1 ? ', to the power ' + k : ''), '$' + cur() + '$']);
                if (A === 1n) break;
            }
            var both3 = A % 4n === 3n && N % 4n === 3n;
            if (both3) sign = -sign;
            var t = A; A = N; N = t;
            rows.push(['reciprocity: ' + (both3 ? 'both are $\\equiv 3 \\pmod 4$, so the sign flips' : 'not both $\\equiv 3 \\pmod 4$, so no sign change'), '$' + cur() + '$']);
            var A2 = A % N;
            if (A2 !== A) { A = A2; rows.push(['reduce the top modulo $' + T(N) + '$', '$' + cur() + '$']); }
        }
        rows.push(['$\\left(\\frac{1}{m}\\right) = 1$', '$' + sign + '$']);
        var s = S.step('Apply the rules until the top is 1');
        s.p('Rules, valid for every odd $n > 0$: the symbol depends only on $a \\bmod n$; $\\left(\\frac{2}{n}\\right) = 1$ when $n \\equiv \\pm 1 \\pmod 8$ and $-1$ when $n \\equiv \\pm 3 \\pmod 8$; and for odd coprime $a, n$, quadratic reciprocity $\\left(\\frac{a}{n}\\right) = \\left(\\frac{n}{a}\\right)$ unless $a \\equiv n \\equiv 3 \\pmod 4$, where the sign flips.');
        s.table(['rule', 'value'], rows);
        var val = sign;
        finish(val);
        var b = nt.bitLength(n0);
        if (prime && b <= 4096) {
            var e = nt.powmod(a0, (n0 - 1n) / 2n, n0), ev = e === 1n ? 1 : e === n0 - 1n ? -1 : null;
            var c = S.step('Check with Euler\'s criterion');
            c.p('For a prime $p$: $\\left(\\frac{a}{p}\\right) \\equiv a^{(p-1)/2} \\pmod p$.');
            c.math(T(a0) + '^{' + T((n0 - 1n) / 2n) + '} \\equiv ' + T(e) + (ev === -1 ? ' \\equiv -1' : '') + ' \\pmod{' + T(n0) + '}');
            c.check(ev === val, 'Same value, $' + val + '$');
            S.note(val === 1 ? '$' + T(a0) + '$ is a square modulo the prime $' + T(n0) + '$ (the modular square root tool finds its roots).' : '$' + T(a0) + '$ is not a square modulo the prime $' + T(n0) + '$.');
        } else if (!prime) {
            var f = b <= 64 ? nt.factor(n0) : null;
            if (f && f.complete) {
                var parts = f.factors.map(function (x) { return { p: x.p, e: x.e, l: nt.jacobi(a0, x.p) }; });
                var prod = parts.reduce(function (acc, x) { return acc * (x.e % 2 ? x.l : 1); }, 1);
                var c2 = S.step('Check with the factorization');
                c2.p('By definition the Jacobi symbol is the product of Legendre symbols over $n = ' + parts.map(function (x) { return T(x.p) + (x.e > 1 ? '^{' + x.e + '}' : ''); }).join(' \\cdot ') + '$:');
                c2.math(top + ' = ' + parts.map(function (x) { return sym(a0, x.p) + (x.e > 1 ? '^{' + x.e + '}' : ''); }).join(' ') + ' = ' + parts.map(function (x) { return '(' + x.l + ')' + (x.e > 1 ? '^{' + x.e + '}' : ''); }).join(' \\cdot ') + ' = ' + prod);
                c2.check(prod === val, 'Same value');
                var square = parts.every(function (x) { return x.l === 1; });
                S.note(square ? '$' + T(a0) + '$ is a square modulo every prime factor, so it is a square modulo $' + T(n0) + '$.'
                    : val === 1 ? 'Careful: the Jacobi symbol is $1$, yet $' + T(a0) + '$ is not a square modulo $' + T(n0) + '$, since it is not one modulo a prime factor. For composite $n$, $1$ does not mean "square".'
                        : 'The symbol is $-1$, so $' + T(a0) + '$ is certainly not a square modulo $' + T(n0) + '$.');
            } else S.note(val === -1 ? '$' + T(a0) + '$ is certainly not a square modulo $' + T(n0) + '$.' : 'For composite $n$ a Jacobi symbol $1$ does not prove that $a$ is a square modulo $n$.');
        }
    }
});
