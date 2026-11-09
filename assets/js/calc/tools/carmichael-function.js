/* Toolbox: the Carmichael function lambda(n), the exponent of the group Z_n^*, from the factorization (lcm of the
   lambda of each prime power), compared with phi(n). */
Calc.tool({
    id: 'carmichael-function',
    live: true,
    inputs: [
        { id: 'n', label: 'Number $n$', width: 'l', placeholder: '561', min: 1 }
    ],
    examples: [{ n: '561' }, { n: '3233' }, { n: '1000' }, { n: '2^32' }, { n: '15' }],
    run: async function (v, S) {
        var P = Calc.lib.primes, nt = Calc.lib.nt, T = Calc.lib.primes.T, n = v.n;
        var r = await P.factorStep(S, n), fs = r.factors, lam = P.lambda(fs), phi = P.phi(fs);
        S.result('$\\lambda(' + T(n) + ') = ' + T(lam) + '$', { copy: String(lam) });
        if (n <= 2n) { S.note('$\\mathbb Z_{' + n + '}^*$ is $\\{' + (n === 1n ? 0 : 1) + '\\}$, so $\\lambda(' + n + ') = 1$.'); return; }
        var s = S.step('$\\lambda$ of each prime power');
        s.p('For an odd prime power $\\lambda(p^e) = \\varphi(p^e) = p^{e-1}(p-1)$, because that group is cyclic. Powers of 2 are the exception: $\\lambda(2) = 1$, $\\lambda(4) = 2$ and $\\lambda(2^e) = 2^{e-2}$ for $e \\ge 3$ (every odd square is $1$ modulo 8).');
        s.table(['$p^e$', '$\\lambda(p^e)$', '$\\varphi(p^e)$'], fs.map(function (f) {
            return ['$' + T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : '') + '$', '$' + T(P.lambdaPP(f.p, f.e)) + '$', '$' + T(P.phi([f])) + '$'];
        }));
        var s2 = S.step('Take the least common multiple');
        s2.p('By the Chinese remainder theorem $a^k \\equiv 1 \\pmod n$ exactly when it holds modulo every prime power, so $\\lambda(n)$ is the lcm of the values above:');
        s2.math('\\lambda(' + T(n) + ') = \\operatorname{lcm}(' + fs.map(function (f) { return T(P.lambdaPP(f.p, f.e)); }).join(', ') + ') = ' + T(lam));
        var s3 = S.step('Compare with $\\varphi(n)$');
        s3.math('\\varphi(' + T(n) + ') = ' + T(phi) + (lam === phi ? ' = \\lambda(n)' : ' = ' + T(phi / lam) + ' \\cdot \\lambda(n)'));
        if (lam === phi) s3.p('They are equal, so some element has order $\\varphi(n)$: $\\mathbb Z_n^*$ is cyclic and $n$ has primitive roots.');
        else s3.p('$\\lambda(n)$ is a proper divisor of $\\varphi(n)$: no element has order $\\varphi(n)$, so $n$ has no primitive root. Every $a$ coprime to $n$ satisfies the stronger $a^{' + T(lam) + '} \\equiv 1 \\pmod{' + T(n) + '}$.');
        var carm = fs.length > 1 && fs.every(function (f) { return f.e === 1; }) && (n - 1n) % lam === 0n;
        if (carm) S.note('$\\lambda(n) = ' + T(lam) + '$ divides $n - 1 = ' + T(n - 1n) + '$ although $n$ is composite: $n$ is a Carmichael number, which fools Fermat\'s test for every base coprime to it.');
        if (fs.length === 2 && fs[0].e === 1 && fs[1].e === 1 && fs[0].p > 2n) S.note('For RSA with $N = pq$, any $d$ with $e d \\equiv 1 \\pmod{\\lambda(N)}$ works, and $\\lambda(N) = \\operatorname{lcm}(p-1, q-1)$ gives the smallest private exponent.');
    }
});
