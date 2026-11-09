/* Toolbox: discrete logarithm g^x = h (mod n) by baby-step giant-step: a table of g^j for j < m, then giant steps
   h * g^(-im) until one lands in the table, with m about the square root of the order of g. */
Calc.tool({
    id: 'discrete-logarithm',
    inputs: [
        { id: 'g', label: 'Base $g$', placeholder: '3' },
        { id: 'h', label: 'Target $h$', placeholder: '13' },
        { id: 'n', label: 'Modulus $p$ (or $n$)', placeholder: '17', min: 2 }
    ],
    examples: [{ g: '3', h: '13', n: '17' }, { g: '2', h: '1000', n: '1019' }, { g: '5', h: '2', n: '23' }, { g: '2', h: '3', n: '7' }, { g: '7', h: '123456789', n: '10^10 + 19' }],
    run: async function (v, S) {
        var nt = Calc.lib.nt, P = Calc.lib.primes, T = Calc.lib.primes.T, n = v.n, g = nt.mod(v.g, n), h = nt.mod(v.h, n);
        if (g !== v.g || h !== v.h) S.step('Reduce modulo $' + T(n) + '$').math('g = ' + T(g) + ', \\quad h = ' + T(h));
        if (nt.gcd(g, n) !== 1n) Calc.fail('The base g must be coprime to the modulus (here gcd = ' + nt.gcd(g, n) + ').', 'g');
        if (nt.gcd(h, n) !== 1n) {
            S.result('$' + T(g) + '^x \\equiv ' + T(h) + ' \\pmod{' + T(n) + '}$ has no solution', { copy: 'no solution' });
            S.step('No power of $g$ can be $h$').p('Every power of $g$ is coprime to $n$, but $\\gcd(' + T(h) + ', ' + T(n) + ') = ' + T(nt.gcd(h, n)) + '$.');
            return;
        }
        /* the order of g: the size of the group it generates */
        var prime = nt.isPrime(n), phi;
        if (prime) phi = n - 1n;
        else phi = P.phi((await P.factorize(n, S)).factors);
        var pf = (await P.factorize(phi, S)).factors, ord = phi;
        pf.forEach(function (f) { for (var k = 0; k < f.e && nt.powmod(g, ord / f.p, n) === 1n; k++) ord /= f.p; });
        var so = S.step('The order of $g$');
        so.p('Powers of $g$ repeat with period $\\operatorname{ord}(g)$, so $x$ only matters modulo the order. ' + (prime ? 'For a prime modulus the group has $p - 1 = ' + T(phi) + '$ elements' : 'The group has $\\varphi(n) = ' + T(phi) + '$ elements') + ', and from $' + T(phi) + ' = ' + P.tex(pf) + '$ (the multiplicative order tool shows how):');
        so.math('\\operatorname{ord}_{' + T(n) + '}(' + T(g) + ') = ' + T(ord));
        var m = nt.isqrt(ord - 1n) + 1n;
        if (m > 1048576n) Calc.fail('The order of g is about 10^' + (String(ord).length - 1) + ', so baby-step giant-step would need two tables of ' + m + ' entries. This page stops at about 10^6 (orders up to 10^12).');
        var sm = S.step('Choose $m = \\lceil \\sqrt{\\operatorname{ord}(g)}\\,\\rceil$');
        sm.math('m = \\lceil \\sqrt{' + T(ord) + '}\\,\\rceil = ' + T(m));
        sm.p('Every $0 \\le x < m^2$ can be written $x = i m + j$ with $0 \\le i, j < m$. Then $g^x = h$ means $g^j = h \\cdot (g^{-m})^i$: store all $g^j$ (baby steps) and walk through the $h \\cdot g^{-im}$ (giant steps) until one is in the store. That is $2m$ operations instead of up to $m^2$.');
        /* baby steps */
        var SHOWN = 120, table = new Map(), baby = [], x = 1n;
        for (var j = 0n; j < m; j++) {
            if (!table.has(x)) table.set(x, j);
            if (j < BigInt(SHOWN)) baby.push({ j: j, v: x });
            x = x * g % n;
            if (j % 4096n === 0n) await S.tick();
        }
        /* giant steps */
        var gm = nt.powmod(nt.inv(g, n), m, n), y = h, giant = [], sol = null;
        for (var i = 0n; i < m; i++) {
            var hit = table.has(y) ? table.get(y) : null;
            if (i < BigInt(SHOWN) || hit !== null) giant.push({ i: i, v: y, hit: hit });
            if (hit !== null) { sol = { i: i, j: hit }; break; }
            y = y * gm % n;
            if (i % 4096n === 0n) await S.tick();
        }
        if (sol && sol.j >= BigInt(SHOWN)) baby.push({ j: sol.j, v: nt.powmod(g, sol.j, n) });
        var sb = S.step('Baby steps: $g^j$ for $0 \\le j < ' + T(m) + '$');
        sb.p('Multiply by $g = ' + T(g) + '$ each time and store value and exponent (a hash table in practice).');
        sb.table(['$j$', '$' + T(g) + '^j \\bmod ' + T(n) + '$'], baby.map(function (b) { return ['$' + T(b.j) + '$', sol && b.j === sol.j ? { v: '$' + T(b.v) + '$', hl: true } : '$' + T(b.v) + '$']; }),
            { mono: true, max: 24, caption: m > BigInt(SHOWN) ? 'The first ' + SHOWN + ' of the ' + T(m) + ' rows' + (sol && sol.j >= BigInt(SHOWN) ? ', and the one that matches' : '') + '.' : '' });
        var sg = S.step('Giant steps: $h \\cdot g^{-' + T(m) + 'i}$');
        sg.p('$g^{-1} \\equiv ' + T(nt.inv(g, n)) + '$, so $g^{-m} \\equiv ' + T(nt.inv(g, n)) + '^{' + T(m) + '} \\equiv ' + T(gm) + '$. Start at $h = ' + T(h) + '$ and multiply by $' + T(gm) + '$ until the value is among the baby steps:');
        sg.table(['$i$', '$h \\cdot g^{-mi} \\bmod ' + T(n) + '$', 'in the table?'], giant.map(function (r) { return ['$' + T(r.i) + '$', r.hit !== null ? { v: '$' + T(r.v) + '$', hl: true } : '$' + T(r.v) + '$', r.hit !== null ? 'yes, $j = ' + T(r.hit) + '$' : 'no']; }), { mono: true, max: 24 });
        if (!sol) {
            S.result('$' + T(g) + '^x \\equiv ' + T(h) + ' \\pmod{' + T(n) + '}$ has no solution', { copy: 'no solution' });
            sg.p('No giant step hit the table, so $h$ is not a power of $g$: it lies outside the subgroup of the ' + T(ord) + ' powers of $g$' + (ord !== phi ? ' (that is not all of the group, since $g$ is not a primitive root)' : '') + '.');
            return;
        }
        var xs = sol.i * m + sol.j;
        var sx = S.step('Put the two halves together');
        sx.math('g^{' + T(sol.j) + '} \\equiv h \\cdot g^{-' + T(m) + ' \\cdot ' + T(sol.i) + '} \\quad\\Longrightarrow\\quad x = ' + T(sol.i) + ' \\cdot ' + T(m) + ' + ' + T(sol.j) + ' = ' + T(xs));
        S.result('$x = ' + T(xs) + '$', { copy: String(xs) });
        S.note('All solutions: $x \\equiv ' + T(xs) + ' \\pmod{' + T(ord) + '}$, that is $x = ' + T(xs) + ' + ' + T(ord) + 'k$.');
        S.step('Check').check(nt.powmod(g, xs, n) === h, '$' + T(g) + '^{' + T(xs) + '} \\equiv ' + T(nt.powmod(g, xs, n)) + ' \\pmod{' + T(n) + '}$');
        S.step('How hard is this in real life?').p('Baby-step giant-step takes about $\\sqrt{\\operatorname{ord}(g)}$ time and memory. Diffie-Hellman and DSA work in groups of prime order $q$ of at least 256 bits, where $\\sqrt q \\ge 2^{128}$ steps are far beyond any computer. Modulo a prime $p$ the index calculus and the number field sieve are faster, which is why $p$ itself needs 2048 bits or more; on good elliptic curves nothing better than about $\\sqrt q$ is known.');
    }
});
