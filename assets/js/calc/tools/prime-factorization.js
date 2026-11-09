/* Toolbox: prime factorization. Trial division by the primes up to 10^4 (every division shown), Miller-Rabin on what
   is left, a perfect power check, then Pollard's rho (the first iterations in a table) until every part is prime. */
Calc.tool({
    id: 'prime-factorization',
    live: true,
    inputs: [
        { id: 'n', label: 'Number $n$', width: 'l', placeholder: '360', help: 'A whole number, or an expression such as 2^64+1 or 30!+1.' }
    ],
    examples: [{ n: '360' }, { n: '1001' }, { n: '2^64 + 1' }, { n: '600851475143' }, { n: '2^67 - 1' }, { n: '1000000016000000063' }],
    run: async function (v, S) {
        var nt = Calc.lib.nt, P = Calc.lib.primes, T = Calc.lib.primes.T, n0 = v.n, n = nt.abs(n0);
        if (n === 0n) Calc.fail('0 has no prime factorization: every prime divides 0.', 'n');
        if (nt.bitLength(n) > 2048) Calc.fail('At most 2048 bits (617 digits).', 'n');
        var neg = n0 < 0n, sign = neg ? '-1 \\cdot ' : '', signPlain = neg ? '-1 * ' : '';
        if (neg) S.step('Take out the sign').p('A negative number is $-1$ times a positive one, so factor $|n|$:').math(T(n0) + ' = -1 \\cdot ' + T(n));
        if (n === 1n) {
            S.result('$' + T(n0) + '$ has no prime factors', { copy: neg ? '-1' : '1' });
            S.step('Nothing to do').p('The number 1 is not prime and has no prime factors: its factorization is the empty product.');
            return;
        }
        var r = await P.factorize(n, S);
        r.events.forEach(function (e) {
            if (e.t === 'trial') {
                var st = S.step('Trial division by small primes');
                st.p('Divide by $2, 3, 5, 7, 11, \\dots$ in turn. When a prime divides, divide it out (as often as it goes) and continue with the quotient $m$. One only needs primes $p$ with $p^2 \\le m$: a number with no prime factor up to $\\sqrt m$ is prime.');
                if (e.rows.length) {
                    st.table(['$m$', 'divided by $p$', '$m / p$'], e.rows.map(function (x) { return ['$' + T(x.m) + '$', '$' + T(x.p) + '$', '$' + T(x.q) + '$']; }), { mono: true });
                } else st.p('No prime up to ' + (e.proved ? '$\\sqrt{' + T(e.n) + '}$' : '$' + T(e.limit) + '$') + ' divides $' + T(e.n) + '$.');
                var divs = {};
                e.rows.forEach(function (x) { divs[String(x.p)] = 1; });
                var others = P.primesUpTo(e.last).filter(function (p) { return !divs[String(p)]; });
                if (e.tried && others.length && others.length <= 30) st.p('The other primes tried leave a remainder: $' + others.join(', ') + '$.');
                else if (e.tried) st.p(e.tried + ' primes were tried, up to $' + e.last + '$.');
                if (e.rest === 1n) st.p('Nothing is left ($m = 1$), so the factorization is complete.');
                else if (e.proved) st.p('What is left, $m = ' + T(e.rest) + '$, has no prime factor $p$ with $p^2 \\le m$, so $m$ is prime.');
                else st.p('What is left, $m = ' + T(e.rest) + '$ (' + String(e.rest).length + ' digits), has no prime factor below $' + T(e.limit) + '$. Going on to $\\sqrt m$ would take too long, so switch to faster methods.');
            } else if (e.t === 'prime') {
                S.step('Is $' + T(e.m) + '$ prime?').p(e.exact
                    ? 'It passes the Miller-Rabin test for the bases that make the test exact below $3.3 \\cdot 10^{24}$, so it is prime (the primality test tool shows the rounds).'
                    : 'It passes the Miller-Rabin test for many bases, so it is prime with overwhelming probability (a probable prime; every composite fails at least 3 out of 4 bases).');
            } else if (e.t === 'composite') {
                S.step('Is $' + T(e.m) + '$ prime?').p(e.a ? 'No: Miller-Rabin with base $' + T(e.a) + '$ is a witness that it is composite (without telling a factor). It has to be split.' : 'No: it fails the Miller-Rabin test, so it is composite and has to be split.');
            } else if (e.t === 'power') {
                S.step('A perfect power').p('Before searching for a factor, check whether $m$ is a $k$-th power ($\\lfloor m^{1/k} \\rfloor^k = m$?). It is:').math(T(e.m) + ' = ' + T(e.r) + '^{' + e.k + '}');
            } else if (e.t === 'rho') {
                var s2 = S.step('Pollard\'s rho on $m = ' + T(e.m) + '$');
                s2.p('Iterate $f(x) = x^2 + ' + e.c + ' \\bmod m$ from $2$ with two runners: $x_i$ takes one step, $y_i = x_{2i}$ two steps. Modulo a hidden prime factor $p$ of $m$ the values repeat after about $\\sqrt p$ steps, and from then on $p$ divides some $x_i - y_i$, so $\\gcd(|x_i - y_i|, m)$ reveals it.');
                e.retries.forEach(function (rt) { s2.p('With $c = ' + rt.c + '$ both runners met modulo $m$ itself (the gcd was $m$) after ' + rt.steps + ' steps, so start again with $c = ' + (rt.c + 1n) + '$.'); });
                s2.table(['$i$', '$x_i$', '$y_i = x_{2i}$', '$\\gcd(|x_i - y_i|, m)$'], e.rows.map(function (x) { return [x.i, '$' + T(x.x) + '$', '$' + T(x.y) + '$', x.g !== 1n ? { v: '$' + T(x.g) + '$', hl: true } : '$1$']; }), { mono: true });
                if (e.steps > e.rows.length) s2.p('The gcd stays 1 for a while (in practice the differences are multiplied together and one gcd is taken per block of 128 steps). At step ' + e.steps + ' it is $' + T(e.d) + '$.');
                s2.p('So $m$ splits:').math(T(e.m) + ' = ' + T(e.d) + ' \\cdot ' + T(e.m / e.d));
            }
        });
        var fs = r.factors, txt = P.tex(fs);
        S.result('$' + T(n0) + ' = ' + sign + txt + '$', { copy: signPlain + P.plain(fs) });
        var omega = fs.length, Omega = fs.reduce(function (a, f) { return a + f.e; }, 0);
        if (omega === 1 && fs[0].e === 1) S.note('$' + T(n) + '$ is prime.');
        else S.note(omega + ' distinct prime factor' + (omega > 1 ? 's' : '') + ', ' + Omega + ' counted with multiplicity.');
        var c = S.step('Collect the prime factors');
        c.p('Group equal primes into powers and multiply back to check:');
        c.math(sign + txt + ' = ' + T(n0));
        c.check(P.value(fs) * (neg ? -1n : 1n) === n0 && fs.every(function (f) { return nt.isPrime(f.p); }), 'The product is $' + T(n0) + '$ and every factor is prime');
    }
});
