/* Toolbox: Euler's totient phi(n) from the prime factorization (product formula, prime power by prime power), and
   for small n the list of the numbers coprime to n. */
Calc.tool({
    id: 'euler-totient',
    live: true,
    inputs: [
        { id: 'n', label: 'Number $n$', width: 'l', placeholder: '36', min: 1 }
    ],
    examples: [{ n: '36' }, { n: '97' }, { n: '3233' }, { n: '10!' }, { n: '2^64 - 1' }],
    run: async function (v, S) {
        var P = Calc.lib.primes, nt = Calc.lib.nt, T = Calc.lib.primes.T, n = v.n;
        var r = await P.factorStep(S, n), fs = r.factors, phi = P.phi(fs);
        S.result('$\\varphi(' + T(n) + ') = ' + T(phi) + '$', { copy: String(phi) });
        if (n === 1n) {
            S.note('By convention $\\varphi(1) = 1$: the only number in $1..1$ is 1, and $\\gcd(1, 1) = 1$.');
        } else {
            var s = S.step('Apply the product formula');
            s.p('$\\varphi$ is multiplicative, and a prime power $p^e$ has $p^{e-1}$ multiples of $p$ among $1, \\dots, p^e$, so $\\varphi(p^e) = p^e - p^{e-1} = p^{e-1}(p - 1)$. Together:');
            s.math('\\varphi(n) = n \\prod_{p \\mid n} \\Bigl(1 - \\frac 1p\\Bigr) = \\prod_{p^e \\,\\|\\, n} p^{e-1}(p - 1)');
            s.table(['$p^e$', '$p^{e-1}(p - 1)$', '$\\varphi(p^e)$'], fs.map(function (f) {
                return ['$' + T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : '') + '$', '$' + (f.e > 1 ? T(f.p) + (f.e > 2 ? '^{' + (f.e - 1) + '}' : '') + ' \\cdot ' : '') + T(f.p - 1n) + '$', '$' + T(P.phi([f])) + '$'];
            }));
            s.math('\\varphi(' + T(n) + ') = ' + fs.map(function (f) { return T(P.phi([f])); }).join(' \\cdot ') + ' = ' + T(phi));
            if (fs.length === 1 && fs[0].e === 1) S.note('$n$ is prime, so every number from 1 to $n - 1$ is coprime to it: $\\varphi(n) = n - 1$.');
            else if (fs.length === 2 && fs[0].e === 1 && fs[1].e === 1) S.note('For an RSA modulus $N = pq$: $\\varphi(N) = (p-1)(q-1)$. Knowing $\\varphi(N)$ is as hard as factoring $N$.');
            S.note('The share of numbers coprime to $n$: $\\varphi(n)/n \\approx ' + (Number(phi * 1000000n / n) / 1000000).toFixed(4) + '$.');
        }
        if (n <= 300n) {
            var list = [];
            for (var k = 1n; k <= n; k++) if (nt.gcd(k, n) === 1n) list.push(k);
            var sl = S.step('Check: list the numbers coprime to $n$');
            sl.p('The numbers $k$ with $1 \\le k \\le ' + n + '$ and $\\gcd(k, ' + n + ') = 1$:');
            sl.p(P.mlist(list) + '.');
            sl.check(BigInt(list.length) === phi, 'There are ' + list.length + ' of them');
        }
    }
});
