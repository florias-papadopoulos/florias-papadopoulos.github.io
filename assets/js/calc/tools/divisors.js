/* Toolbox: all divisors of n from its prime factorization, their number tau(n) and sum sigma(n), and whether n is
   perfect, abundant or deficient. */
Calc.tool({
    id: 'divisors',
    live: true,
    inputs: [
        { id: 'n', label: 'Number $n$', width: 'l', placeholder: '360', help: 'A whole number; for a negative one the positive divisors of |n| are listed.' }
    ],
    examples: [{ n: '360' }, { n: '28' }, { n: '97' }, { n: '12' }, { n: '2^12 * 3^5 * 5^3' }, { n: '2^88 * (2^89 - 1)' }],
    run: async function (v, S) {
        var P = Calc.lib.primes, nt = Calc.lib.nt, T = Calc.lib.primes.T, n = nt.abs(v.n);
        if (n === 0n) Calc.fail('Every whole number divides 0, so 0 has infinitely many divisors.', 'n');
        if (v.n < 0n) S.step('Sign').p('The divisors of $' + T(v.n) + '$ are those of $' + T(n) + '$ (and their negatives). Only the positive ones are listed.');
        var r = await P.factorStep(S, n), fs = r.factors, tau = P.tau(fs), sigma = P.sigma(fs);
        var LIST = nt.bitLength(n) <= 256 ? 5000n : 300n, ds = tau <= LIST ? P.divisors(fs) : null;
        var s = S.step('Every divisor is a choice of exponents');
        s.p(n === 1n ? 'The only divisor of 1 is 1.' : 'A divisor of $n = ' + P.tex(fs) + '$ is $' + fs.map(function (f, i) { return T(f.p) + '^{k_' + (i + 1) + '}'; }).join(' \\cdot ') + '$ with each $0 \\le k_i \\le e_i$, and every choice gives a different divisor.');
        if (ds && fs.length && fs.length <= 3 && tau <= 200n) {
            /* the divisors built up prime by prime */
            var cur = [1n], rows = [];
            fs.forEach(function (f) {
                var next = [], pk = 1n;
                for (var k = 0; k <= f.e; k++) { cur.forEach(function (d) { next.push(d * pk); }); pk *= f.p; }
                cur = next.sort(function (a, b) { return a < b ? -1 : 1; });
                rows.push(['$1, ' + T(f.p) + (f.e > 1 ? ', \\dots, ' + T(f.p) + '^{' + f.e + '}' : '') + '$', P.mlist(cur)]);
            });
            s.table(['multiply by', 'divisors so far'], rows);
        }
        var st = S.step('Count them: $\\tau(n)$');
        st.p('There are $e_i + 1$ choices for each exponent:');
        st.math('\\tau(' + T(n) + ') = ' + (fs.length ? fs.map(function (f) { return '(' + f.e + ' + 1)'; }).join(' \\cdot ') : '1') + ' = ' + T(tau));
        var ss = S.step('Add them: $\\sigma(n)$');
        ss.p('Multiplying out $\\prod (1 + p + \\dots + p^{e})$ gives every divisor once, and each bracket is a geometric sum $\\frac{p^{e+1} - 1}{p - 1}$:');
        ss.math('\\sigma(' + T(n) + ') = ' + (fs.length ? fs.map(function (f) { return '\\frac{' + T(f.p) + '^{' + (f.e + 1) + '} - 1}{' + T(f.p - 1n) + '}'; }).join(' \\cdot ') + ' = ' + fs.map(function (f) { return T(P.sigma([f])); }).join(' \\cdot ') + ' = ' : '') + T(sigma));
        if (ds) ss.check(ds.reduce(function (a, b) { return a + b; }, 0n) === sigma && BigInt(ds.length) === tau, 'The ' + ds.length + ' divisors listed add up to $' + T(sigma) + '$');
        var aliquot = sigma - n, kind = aliquot === n ? 'perfect' : aliquot > n ? 'abundant' : 'deficient';
        var sk = S.step('Perfect, abundant or deficient?');
        sk.p('Compare the sum of the proper divisors (all except $n$ itself), $s(n) = \\sigma(n) - n$, with $n$:');
        sk.math('s(' + T(n) + ') = ' + T(sigma) + ' - ' + T(n) + ' = ' + T(aliquot) + (aliquot === n ? ' = n' : aliquot > n ? ' > n' : ' < n'));
        sk.p({ perfect: 'Equal: $n$ is perfect.', abundant: 'Larger: $n$ is abundant.', deficient: 'Smaller: $n$ is deficient' + (fs.length === 1 && fs[0].e === 1 ? ' (as every prime is: $s(p) = 1$).' : '.') }[kind]);
        if (ds) {
            S.result([P.mlist(ds), '$\\tau = ' + T(tau) + '$, $\\sigma = ' + T(sigma) + '$, ' + kind], { copy: ds.join(', '), label: tau === 1n ? 'Divisor' : tau + ' divisors' });
            if (ds.length > 2 && ds.length <= 400) {
                var pairs = [];
                for (var i = 0; i < Math.ceil(ds.length / 2); i++) pairs.push(['$' + T(ds[i]) + '$', '$' + T(ds[ds.length - 1 - i]) + '$', '$' + T(n) + '$']);
                S.step('Divisors come in pairs').p('$d$ divides $n$ exactly when $n / d$ does, and one of the two is at most $\\sqrt n$' + (nt.isSquare(n) ? ' ($n$ is a square, so $\\sqrt n$ pairs with itself and $\\tau(n)$ is odd)' : '') + ':').table(['$d$', '$n / d$', '$d \\cdot (n/d)$'], pairs, { mono: true, max: 20 });
            }
        } else {
            S.result(['$\\tau(' + T(n) + ') = ' + T(tau) + '$', '$\\sigma(' + T(n) + ') = ' + T(sigma) + '$, ' + kind], { copy: 'tau = ' + tau + '\nsigma = ' + sigma });
            S.note('There are too many divisors to list (more than ' + LIST + ').');
        }
        if (kind === 'perfect' && fs.length === 2 && fs[0].p === 2n) S.note('Euclid and Euler: the even perfect numbers are exactly $2^{p-1}(2^p - 1)$ with $2^p - 1$ a Mersenne prime. Here $' + T(fs[1].p) + ' = 2^{' + (fs[0].e + 1) + '} - 1$.');
    }
});
