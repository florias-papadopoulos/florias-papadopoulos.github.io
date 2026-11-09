/* Toolbox: square roots modulo n. For a prime: Euler's criterion, the shortcut a^((p+1)/4) when p = 3 mod 4, else
   Tonelli-Shanks with its table. For composite n: the roots modulo each prime power (Hensel lifting, the special
   rules for powers of 2, a direct search when p divides a), combined with the Chinese remainder theorem. */
Calc.tool({
    id: 'modular-square-root',
    live: true,
    inputs: [
        { id: 'a', label: 'Number $a$', placeholder: '10' },
        { id: 'n', label: 'Modulus $n$', placeholder: '13', min: 2 }
    ],
    examples: [{ a: '10', n: '13' }, { a: '5', n: '41' }, { a: '2', n: '113' }, { a: '58', n: '77' }, { a: '1', n: '120' }, { a: '3', n: '7' }, { a: '2', n: '2^127 - 1' }, { a: '9', n: '27' }],
    run: async function (v, S) {
        var nt = Calc.lib.nt, P = Calc.lib.primes, T = Calc.lib.primes.T, n = v.n, a = nt.mod(v.a, n);
        if (nt.bitLength(n) > 4096) Calc.fail('At most 4096 bits.', 'n');
        if (a !== v.a) S.step('Reduce $a$ modulo $n$').math(T(v.a) + ' \\bmod ' + T(n) + ' = ' + T(a));
        function sortU(xs) { var seen = {}; return xs.filter(function (x) { var k = String(x); if (seen[k]) return false; seen[k] = 1; return true; }).sort(function (x, y) { return x < y ? -1 : x > y ? 1 : 0; }); }

        /* one root of a (coprime to p) modulo an odd prime p, or null; the steps go to S */
        function rootModPrime(a, p, where) {
            var e = nt.powmod(a, (p - 1n) / 2n, p);
            var s1 = S.step('Is $' + T(a) + '$ a square modulo $' + T(p) + '$?' + where);
            s1.p('Euler\'s criterion: $a^{(p-1)/2} \\equiv 1$ for a square and $\\equiv -1$ for a non-square.');
            s1.math(T(a) + '^{' + T((p - 1n) / 2n) + '} \\equiv ' + (e === p - 1n ? T(e) + ' \\equiv -1' : T(e)) + ' \\pmod{' + T(p) + '}');
            if (e !== 1n) { s1.check(false, 'Not a square: no square root exists'); return null; }
            s1.check(true, 'A square: it has two square roots');
            if (p % 4n === 3n) {
                var x = nt.powmod(a, (p + 1n) / 4n, p);
                S.step('Shortcut for $p \\equiv 3 \\pmod 4$').p('Then $(p+1)/4$ is a whole number and $x = a^{(p+1)/4}$ works: $x^2 = a^{(p+1)/2} = a \\cdot a^{(p-1)/2} \\equiv a \\cdot 1$.')
                    .math('x \\equiv ' + T(a) + '^{' + T((p + 1n) / 4n) + '} \\equiv ' + T(x) + ' \\pmod{' + T(p) + '}');
                return x;
            }
            var Q = p - 1n, s = 0n;
            while (Q % 2n === 0n) { Q /= 2n; s++; }
            var st = S.step('Tonelli-Shanks: write $p - 1 = Q \\cdot 2^S$');
            st.math(T(p) + ' - 1 = ' + T(Q) + ' \\cdot 2^{' + s + '}');
            var z = 2n, zrows = [];
            for (;;) {
                var ez = nt.powmod(z, (p - 1n) / 2n, p);
                zrows.push(['$' + T(z) + '$', ez === 1n ? '$1$ (a square)' : { v: '$-1$ (not a square)', hl: true }]);
                if (ez !== 1n) break;
                z++;
            }
            st.p('Find a non-square $z$ by trying $2, 3, \\dots$ with Euler\'s criterion (half of all numbers are non-squares, so this is quick):').table(['$z$', '$z^{(p-1)/2}$'], zrows, { mono: true, max: 12 });
            var M = s, c = nt.powmod(z, Q, p), c0 = c, t = nt.powmod(a, Q, p), R = nt.powmod(a, (Q + 1n) / 2n, p);
            var rows = [];
            var head = ['$M$', '$c$', '$t$', '$R$', '$i$', '$b = c^{2^{M-i-1}}$'];
            while (t !== 1n) {
                var i = 0n, t2 = t;
                while (t2 !== 1n) { t2 = t2 * t2 % p; i++; }
                var b = nt.powmod(c, 1n << (M - i - 1n), p);
                rows.push(['$' + M + '$', '$' + T(c) + '$', '$' + T(t) + '$', '$' + T(R) + '$', '$' + i + '$', '$' + T(b) + '$']);
                M = i; c = b * b % p; t = t * c % p; R = R * b % p;
            }
            rows.push(['$' + M + '$', '$' + T(c) + '$', { v: '$1$', hl: true }, { v: '$' + T(R) + '$', hl: true }, '', '']);
            var sl = S.step('Tonelli-Shanks: the loop');
            sl.p('Start with $M = S = ' + s + '$, $c = z^Q = ' + T(c0) + '$, $t = a^Q$, $R = a^{(Q+1)/2}$, so that $R^2 \\equiv a t$ always holds. While $t \\ne 1$: find the least $i$ with $t^{2^i} \\equiv 1$, set $b = c^{2^{M-i-1}}$, then $M \\leftarrow i$, $c \\leftarrow b^2$, $t \\leftarrow t b^2$, $R \\leftarrow R b$. The order of $t$ halves at least once per round; when $t = 1$, $R^2 \\equiv a$.');
            sl.table(head, rows, { mono: true });
            return R;
        }
        /* all roots of a modulo p^e */
        async function rootsModPP(a, p, e, where) {
            var pe = p ** BigInt(e), ap = nt.mod(a, pe);
            if (ap % p === 0n) {
                if (pe > 1000000n) Calc.fail('Here ' + p + ' divides both a and n, and ' + p + '^' + e + ' is too large for the direct search this case needs (at most 10^6).');
                var found = [];
                for (var x0 = 0n; x0 < pe; x0++) { if (x0 * x0 % pe === ap) found.push(x0); if (x0 % 5000n === 0n) await S.tick(); }
                S.step('Modulo $' + T(p) + (e > 1 ? '^{' + e + '}' : '') + ' = ' + T(pe) + '$' + where).p('$' + T(p) + '$ divides $a \\bmod ' + T(pe) + ' = ' + T(ap) + '$, so the usual method does not apply. Try every $x$ from $0$ to $' + T(pe - 1n) + '$:')
                    .p(found.length ? 'The squares equal to $' + T(ap) + '$ come from $x = ' + found.map(T).join(', ') + '$.' : 'No $x^2$ is $' + T(ap) + '$.');
                return found;
            }
            if (p === 2n) {
                var s2 = S.step('Modulo $' + (e > 1 ? '2^{' + e + '} = ' + T(pe) : '2') + '$' + where);
                if (e === 1) { s2.p('Modulo 2 every number is its own square: $x \\equiv 1$.'); return [1n]; }
                if (e === 2) {
                    s2.p('The odd squares modulo 4 are all $1$.');
                    if (ap !== 1n) { s2.check(false, '$' + T(ap) + ' \\not\\equiv 1 \\pmod 4$: no root'); return []; }
                    s2.p('Both $x = 1$ and $x = 3$ work.'); return [1n, 3n];
                }
                s2.p('Every odd square is $\\equiv 1 \\pmod 8$, and conversely each $a \\equiv 1 \\pmod 8$ has exactly four roots modulo $2^e$ for $e \\ge 3$.');
                if (ap % 8n !== 1n) { s2.check(false, '$' + T(ap) + ' \\equiv ' + (ap % 8n) + ' \\pmod 8$: no root'); return []; }
                var x = 1n, lrows = [['$3$', '$1$', '']];
                for (var k = 3; k < e; k++) {
                    var nx = (x * x - ap) % (1n << BigInt(k + 1)) === 0n ? x : x + (1n << BigInt(k - 1));
                    lrows.push(['$' + (k + 1) + '$', '$' + T(nx) + '$', nx === x ? 'already works' : 'add $2^{' + (k - 1) + '}$']);
                    x = nx;
                }
                s2.p('Lift a root from $2^k$ to $2^{k+1}$: if $x^2 \\not\\equiv a \\pmod{2^{k+1}}$, replace $x$ by $x + 2^{k-1}$ (this adds $2^k$ to $x^2$, modulo $2^{k+1}$).').table(['$k$', 'root mod $2^k$', ''], lrows, { mono: true });
                var h = 1n << BigInt(e - 1);
                return sortU([x, pe - x, nt.mod(x + h, pe), nt.mod(h - x, pe)]);
            }
            var r = rootModPrime(nt.mod(ap, p), p, where);
            if (r === null) return [];
            if (e > 1) {
                var hrows = [['$1$', '$' + T(r) + '$']], pk = p;
                for (var j = 2; j <= e; j++) {
                    pk *= p;
                    var inv2 = nt.inv(2n * r, pk);
                    r = nt.mod(r - (r * r - ap) * inv2, pk);
                    hrows.push(['$' + j + '$', '$' + T(r) + '$']);
                }
                S.step('Hensel lifting to $' + T(p) + '^{' + e + '}$').p('A root $x$ modulo $p^k$ becomes a root modulo $p^{k+1}$ with one Newton step $x \\leftarrow x - (x^2 - a)(2x)^{-1}$, as $2x$ is invertible modulo $p$:').table(['$k$', 'root mod $' + T(p) + '^k$'], hrows, { mono: true });
            }
            return sortU([r, pe - r]);
        }

        var roots, prime = nt.isPrime(n), distinct = 1;
        if (prime) {
            if (n === 2n) roots = [a];
            else if (a === 0n) { S.step('The root of 0').p('Modulo a prime, $x^2 \\equiv 0$ only for $x \\equiv 0$.'); roots = [0n]; }
            else { var r0 = rootModPrime(a, n, ''); roots = r0 === null ? [] : sortU([r0, n - r0]); }
        } else {
            var fr = await P.factorStep(S, n), fs = fr.factors, per = [];
            distinct = fs.length;
            if (fs.length > 1) fr.step.p('Solve $x^2 \\equiv a$ modulo each prime power, then combine the roots with the Chinese remainder theorem.');
            for (var i = 0; i < fs.length; i++) {
                var rs = await rootsModPP(a, fs[i].p, fs[i].e, fs.length > 1 ? ' (part ' + (i + 1) + ' of ' + fs.length + ')' : '');
                per.push({ m: fs[i].p ** BigInt(fs[i].e), roots: rs });
                if (!rs.length) break;
            }
            if (per.some(function (x) { return !x.roots.length; })) roots = [];
            else {
                var count = per.reduce(function (acc, x) { return acc * x.roots.length; }, 1);
                if (count > 4096) Calc.fail('There are ' + count + ' square roots, too many to list (at most 4096).');
                var combos = [[]];
                per.forEach(function (x) { var nc = []; combos.forEach(function (c) { x.roots.forEach(function (r) { nc.push(c.concat([r])); }); }); combos = nc; });
                var ms = per.map(function (x) { return x.m; }), crows = [];
                roots = combos.map(function (c) { var x = nt.crt(c, ms).x; crows.push(c.map(function (r) { return '$' + T(r) + '$'; }).concat(['$' + T(x) + '$'])); return x; });
                if (per.length > 1) S.step('Combine with the Chinese remainder theorem').p('Each choice of one root per prime power gives exactly one root modulo $n$ ($' + per.map(function (x) { return x.roots.length; }).join(' \\cdot ') + ' = ' + count + '$ choices):')
                    .table(ms.map(function (m) { return '$\\bmod ' + T(m) + '$'; }).concat(['$x \\bmod ' + T(n) + '$']), crows, { mono: true });
                roots = sortU(roots);
            }
        }
        if (!roots.length) {
            S.result('$x^2 \\equiv ' + T(a) + ' \\pmod{' + T(n) + '}$ has no solution', { copy: 'no solution' });
            S.note('$' + T(a) + '$ is not a square modulo $' + T(n) + '$.');
            return;
        }
        S.result((roots.length <= 4 ? '$x \\equiv ' + roots.map(T).join(',\\ ') + '$' : '$x \\equiv$ ' + P.mlist(roots)) + ' $\\pmod{' + T(n) + '}$', { copy: roots.join(', '), label: roots.length === 1 ? 'Square root' : roots.length + ' square roots' });
        if (roots.length > 2 && distinct > 1) S.note('Modulo a composite number a square can have more than two roots. Finding two that are not $\\pm$ each other factors $n$: this is why computing square roots modulo $n = pq$ is as hard as factoring $n$ (the Rabin cryptosystem).');
        var c = S.step('Check');
        var shown = roots.slice(0, 8);
        c.lines(shown.map(function (x) { return T(x) + '^2 = ' + T(x * x) + ' &\\equiv ' + T(x * x % n) + ' \\pmod{' + T(n) + '}'; }));
        c.check(roots.every(function (x) { return x * x % n === a; }), (roots.length > shown.length ? 'All ' + roots.length + ' roots give' : 'Each gives') + ' $' + T(a) + '$');
    }
});
