/* Toolbox: the multiplicative order of a modulo n. The order divides lambda(n) (Carmichael), so only divisors of
   lambda(n) are tested: all of them in increasing order when there are few, else lambda(n) is cut down prime by
   prime. */
Calc.tool({
    id: 'multiplicative-order',
    live: true,
    inputs: [
        { id: 'a', label: 'Number $a$', placeholder: '3' },
        { id: 'n', label: 'Modulus $n$', placeholder: '7', min: 2 }
    ],
    examples: [{ a: '3', n: '7' }, { a: '2', n: '35' }, { a: '10', n: '49' }, { a: '2', n: '2^89 - 1' }, { a: '6', n: '15' }, { a: '5', n: '10^20 + 39' }],
    run: async function (v, S) {
        var P = Calc.lib.primes, nt = Calc.lib.nt, T = Calc.lib.primes.T, n = v.n, a = nt.mod(v.a, n);
        if (a !== v.a) S.step('Reduce $a$ modulo $n$').math(T(v.a) + ' \\bmod ' + T(n) + ' = ' + T(a));
        var g = nt.gcd(a, n);
        if (g !== 1n) {
            S.result('$' + T(v.a) + '$ has no order modulo $' + T(n) + '$', { copy: 'none' });
            S.step('Check $\\gcd(a, n)$').math('\\gcd(' + T(a) + ', ' + T(n) + ') = ' + T(g) + ' \\ne 1')
                .p('Every power $a^k$ is then divisible by $' + T(g) + '$ modulo $n$, so it can never be 1: only numbers coprime to $n$ have an order.');
            return;
        }
        var r = await P.factorStep(S, n), lam = P.lambda(r.factors), phi = P.phi(r.factors);
        var sl = S.step('The order divides $\\lambda(n)$');
        sl.p('In the group $\\mathbb Z_n^*$ the order of every element divides the exponent of the group, the Carmichael function $\\lambda(n)$ (which itself divides $\\varphi(n)$, by Lagrange\'s theorem). Here:');
        sl.math('\\lambda(' + T(n) + ') = ' + T(lam) + (lam !== phi ? ', \\quad \\varphi(' + T(n) + ') = ' + T(phi) : ' = \\varphi(' + T(n) + ')'));
        var lf = (await P.factorize(lam, S)).factors, tau = P.tau(lf), ord;
        sl.p('with $\\lambda(n) = ' + P.tex(lf) + '$, which has ' + tau + ' divisor' + (tau > 1n ? 's' : '') + '.');
        if (tau <= 48n) {
            var ds = P.divisors(lf), rows = [];
            for (var i = 0; i < ds.length; i++) {
                var x = nt.powmod(a, ds[i], n);
                rows.push(['$' + T(ds[i]) + '$', x === 1n ? { v: '$1$', hl: true } : '$' + T(x) + '$']);
                if (x === 1n) { ord = ds[i]; break; }
            }
            S.step('Test the divisors in increasing order').p('The order is the smallest divisor $d$ of $\\lambda(n)$ with $a^d \\equiv 1$:')
                .table(['$d$', '$' + T(a) + '^d \\bmod ' + T(n) + '$'], rows, { mono: true, hl: rows.length - 1 });
        } else {
            var t = lam, rows2 = [];
            lf.forEach(function (f) {
                for (var k = 0; k < f.e; k++) {
                    var x2 = nt.powmod(a, t / f.p, n), one = x2 === 1n;
                    rows2.push(['$' + T(f.p) + '$', '$' + T(t / f.p) + '$', one ? { v: '$1$', hl: true } : '$' + T(x2) + '$', one ? 'divide by ' + f.p : 'keep']);
                    if (!one) break;
                    t /= f.p;
                }
            });
            ord = t;
            S.step('Remove prime factors from $\\lambda(n)$').p('Too many divisors to try them all. Start with $t = \\lambda(n)$; for each prime $q$ of $\\lambda(n)$, as long as $a^{t/q} \\equiv 1$, replace $t$ by $t/q$. What is left is the order.')
                .table(['$q$', '$t / q$', '$a^{t/q} \\bmod n$', 'then'], rows2, { mono: true });
        }
        S.result('$\\operatorname{ord}_{' + T(n) + '}(' + T(a) + ') = ' + T(ord) + '$', { copy: String(ord) });
        if (ord === phi) S.note('The order is $\\varphi(n)$: $' + T(a) + '$ is a primitive root modulo $' + T(n) + '$.');
        else S.note('$' + T(a) + '$ generates a subgroup of ' + T(ord) + ' elements out of $\\varphi(n) = ' + T(phi) + '$.');
        if (ord <= 60n) {
            var pw = [], x3 = 1n;
            for (var k2 = 1n; k2 <= ord; k2++) { x3 = x3 * a % n; pw.push(['$' + k2 + '$', k2 === ord ? { v: '$' + T(x3) + '$', hl: true } : '$' + T(x3) + '$']); }
            S.step('Check: the powers of $a$').p('Multiply by $' + T(a) + '$ again and again; the cycle closes at the order:').table(['$k$', '$' + T(a) + '^k \\bmod ' + T(n) + '$'], pw, { mono: true, max: 24 });
        } else {
            var c = S.step('Check');
            c.check(nt.powmod(a, ord, n) === 1n, '$' + T(a) + '^{' + T(ord) + '} \\equiv 1 \\pmod{' + T(n) + '}$');
            var qs = (await P.factorize(ord, S)).factors;
            c.check(qs.every(function (f) { return nt.powmod(a, ord / f.p, n) !== 1n; }), 'and $a^{\\operatorname{ord}/q} \\not\\equiv 1$ for every prime $q$ dividing the order (' + qs.map(function (f) { return '$' + T(f.p) + '$'; }).join(', ') + '), so no smaller exponent works');
        }
    }
});
