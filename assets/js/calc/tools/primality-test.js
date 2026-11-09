/* Toolbox: primality test. Trial division (a full proof for small n), Fermat's test, and Miller-Rabin with every
   base shown (n - 1 = 2^s d and the chain of squarings), with the bases that make it exact below 3.3 * 10^24. */
Calc.tool({
    id: 'primality-test',
    live: true,
    inputs: [
        { id: 'n', label: 'Number $n$', width: 'l', placeholder: '561', help: 'Any whole number up to 4096 bits, e.g. 2^127-1.' },
        { id: 'bases', type: 'list', optional: true, label: 'Own bases (optional)', placeholder: '2, 3, 5', help: 'Leave empty for the standard bases.' }
    ],
    examples: [{ n: '97' }, { n: '561' }, { n: '2^61 - 1' }, { n: '3215031751' }, { n: '2^127 - 1' }, { n: '2^128 + 1' }, { n: '2047', bases: '2' }],
    run: async function (v, S) {
        var nt = Calc.lib.nt, P = Calc.lib.primes, T = Calc.lib.primes.T, n = v.n;
        if (nt.bitLength(n) > 4096) Calc.fail('At most 4096 bits (about 1233 digits).', 'n');
        var own = v.bases || [];
        if (own.length > 40) Calc.fail('At most 40 bases.', 'bases');
        function done(prime, word, copy) {
            S.result('$' + T(n) + '$ is ' + word, { copy: copy || (prime ? 'prime' : 'composite') });
        }
        if (n < 2n) {
            done(false, 'not prime', 'not prime');
            S.step('Definition').p('A prime is a whole number $p \\ge 2$ whose only positive divisors are $1$ and $p$. ' + (n === 1n ? 'The number 1 is excluded on purpose, so that factorizations are unique.' : 'So numbers below 2 are not prime.'));
            return;
        }
        if (n < 4n) {
            done(true, 'prime');
            S.step('Small case').p('$' + n + '$ has no divisor between $2$ and $' + (n - 1n) + '$, so it is prime.');
            return;
        }

        /* 1. small primes, and a complete proof by trial division when sqrt(n) is small */
        var limit = nt.isqrt(n), full = limit <= 1000000n, plist = P.primesUpTo(full ? Number(limit) : 1000);
        var s1 = S.step(full ? 'Trial division up to $\\sqrt n$' : 'Trial division by small primes');
        var factor = null, rows = [];
        for (var i = 0; i < plist.length; i++) {
            var p = BigInt(plist[i]);
            if (p * p > n) break;
            var rem = n % p;
            if (rows.length < 200 || rem === 0n) rows.push(['$' + p + '$', rem === 0n ? { v: '$0$', hl: true } : '$' + T(rem) + '$']);
            if (rem === 0n) { factor = p; i++; break; }
            if (i % 2000 === 0) await S.tick();
        }
        if (full) s1.p('If $n$ is composite it has a prime factor $p \\le ' + (limit * limit === n ? '\\sqrt n = ' : '\\lfloor\\sqrt n\\rfloor = ') + T(limit) + '$. Try them all:');
        else s1.p('A cheap first filter: the remainders of $n$ modulo the primes up to 1000.');
        s1.table(['$p$', '$n \\bmod p$'], rows, { mono: true, max: 16, caption: i > rows.length ? 'The first 200 of the ' + i + ' primes tried' + (factor ? ', and the one that divides.' : '.') : '' });
        if (factor) {
            done(false, 'composite');
            S.note('$' + T(n) + ' = ' + T(factor) + ' \\cdot ' + T(n / factor) + '$.');
            s1.p('$' + factor + '$ divides $n$:').math(T(n) + ' = ' + T(factor) + ' \\cdot ' + T(n / factor));
            if (factor === 2n) return;
            s1.p('So $n$ is composite. For comparison, here is what the fast tests, which never look for a factor, say about it.');
        } else if (full) {
            s1.check(true, 'No prime $p \\le ' + T(limit) + '$ divides $n$, so $n$ is prime (this is a proof)');
            S.note('Proved by trial division. The tests below are how one checks large numbers, where trial division is hopeless.');
        } else s1.p('None of them divides $n$. Trying every prime up to $\\sqrt n \\approx 10^{' + Math.floor(String(n).length / 2) + '}$ is hopeless, so use a probabilistic test.');

        /* 2. Fermat */
        var s2 = S.step('Fermat test with base 2');
        var f2 = nt.powmod(2n, n - 1n, n);
        s2.p('Fermat\'s little theorem: if $n$ is prime then $a^{n-1} \\equiv 1 \\pmod n$ for every $a$ not divisible by $n$. Compute it with square and multiply:');
        s2.math('2^{' + T(n - 1n) + '} \\equiv ' + T(f2) + ' \\pmod{' + T(n) + '}');
        if (f2 !== 1n) {
            s2.check(false, 'Not 1, so $n$ is certainly composite (2 is a Fermat witness), even though no factor is known');
        } else s2.check(true, 'The result is 1: $n$ is a probable prime to base 2. That is not a proof: composites such as $341 = 11 \\cdot 31$ pass for base 2, and Carmichael numbers such as $561$ pass for every base coprime to them.');

        /* 3. Miller-Rabin */
        var d = n - 1n, s = 0;
        while ((d & 1n) === 0n) { d >>= 1n; s++; }
        var sd = S.step('Miller-Rabin: write $n - 1 = 2^s \\cdot d$ with $d$ odd');
        sd.math(T(n) + ' - 1 = ' + T(n - 1n) + ' = 2^{' + s + '} \\cdot ' + T(d));
        sd.p('For a prime $n$ the only square roots of 1 are $\\pm 1$. So in the chain $a^d, a^{2d}, a^{4d}, \\dots, a^{2^s d} = a^{n-1}$ (each term the square of the one before), either the first term is 1 or a term $-1 \\equiv ' + T(n - 1n) + '$ comes before the first 1. A base for which this fails is a witness: $n$ is composite.');
        var set = P.mrBases(n), bases = own.length ? own.map(function (a) { return nt.mod(a, n); }) : set.bases;
        if (!own.length) sd.p(set.exact ? 'For $n < ' + T(set.bound) + '$ ' + (set.bases.length > 1 ? 'the bases $' + set.bases.join(', ') + '$ are enough: every composite below that bound fails for one of them' : 'the base $2$ alone is enough: every composite below that bound fails for it') + ' (found by exhaustive search), so here the test is a proof.'
            : 'Above $3.3 \\cdot 10^{24}$ no small fixed set of bases is known to be enough. Use the first 13 primes and 7 more bases spread over $[2, n-2]$: a composite passes one base with probability at most $1/4$.');
        var witness = null, trivial = [];
        for (var b = 0; b < bases.length; b++) {
            var a = bases[b];
            if (a <= 1n || a >= n - 1n) { trivial.push(a); continue; }
            var g = nt.gcd(a, n);
            var r = P.mr(n, a), st = S.step('Base $a = ' + T(a) + '$');
            if (g !== 1n) {
                st.p('$\\gcd(' + T(a) + ', n) = ' + T(g) + '$, a factor of $n$: composite.');
                witness = { a: a, factor: g };
                break;
            }
            var lim = r.pass ? (r.at < 0 ? 0 : r.at) : r.seq.length - 1;
            st.table(['', 'power', 'value mod $n$'], r.seq.slice(0, lim + 1).map(function (x, j) {
                return [j === 0 ? 'start' : 'square', '$a^{' + (j === 0 ? '' : '2^{' + j + '}') + 'd}$', { v: '$' + T(x) + '$' + (x === n - 1n ? ' ($= -1$)' : ''), hl: x === 1n || x === n - 1n }];
            }), { mono: true, max: 16 });
            if (r.pass) {
                st.check(true, r.at < 0 ? '$a^d \\equiv 1$: base ' + T(a) + ' passes' : 'Reached $-1$ at $a^{' + (r.at ? '2^{' + r.at + '}' : '') + 'd}$: base ' + T(a) + ' passes');
            } else {
                st.check(false, r.kind === 'fermat' ? '$a^{n-1} \\not\\equiv 1$: base ' + T(a) + ' is a witness (it even fails Fermat\'s test)' : 'A square root of 1 that is not $\\pm 1$: base ' + T(a) + ' is a witness');
                if (r.kind === 'root') st.p('Bonus: $x = ' + T(r.root) + '$ has $x^2 \\equiv 1$ but $x \\not\\equiv \\pm 1$, so $n$ divides $(x-1)(x+1)$ without dividing either factor. Hence $\\gcd(x - 1, n) = ' + T(r.factor) + '$ is a divisor of $n$ other than $1$ and $n$.');
                witness = { a: a, kind: r.kind, factor: r.kind === 'root' ? r.factor : null };
                break;
            }
            if (b % 2 === 1) await S.tick();
        }
        if (trivial.length) S.step('Bases skipped').p('The bases $' + trivial.join(', ') + '$ reduce to $0$, $1$ or $n - 1$, which pass for every $n$ and prove nothing.');
        var tested = bases.length - trivial.length;
        if (factor && !witness && tested) {
            S.note('$n$ is composite, yet it passes Miller-Rabin for ' + (tested > 1 ? 'all these bases' : 'this base') + ': it is a strong pseudoprime to base' + (tested > 1 ? 's ' : ' ') + bases.filter(function (a) { return trivial.indexOf(a) < 0; }).join(', ') + '. This is why several bases are used.');
        }
        if (witness || factor) {
            if (!factor) done(false, 'composite');
            if (witness && witness.factor && !factor) S.note('A divisor: $' + T(witness.factor) + '$, since $' + T(n) + ' = ' + T(witness.factor) + ' \\cdot ' + T(n / witness.factor) + '$.');
            if (f2 === 1n) {
                var fs = nt.bitLength(n) <= 64 ? nt.factor(n) : null;
                var carm = fs && fs.complete && fs.factors.length > 1 && fs.factors.every(function (x) { return x.e === 1 && (n - 1n) % (x.p - 1n) === 0n; });
                if (carm) S.note('$' + T(n) + ' = ' + fs.factors.map(function (x) { return T(x.p); }).join(' \\cdot ') + '$ is a Carmichael number: it is square free and $p - 1$ divides $n - 1$ for each prime factor $p$ (Korselt\'s criterion), so it passes Fermat\'s test for every base coprime to it.' + (witness ? ' Miller-Rabin still catches it.' : ''));
                else if (witness) S.note('$n$ passes Fermat\'s test for base 2 (a Fermat pseudoprime), but not Miller-Rabin.');
            }
        } else if (full) {
            done(true, 'prime');
        } else if (!tested) {
            done(false, 'not decided', 'not decided');
            S.note('No usable base was given.');
        } else if (own.length) {
            done(true, 'a probable prime', 'probable prime');
            S.note('It passes Miller-Rabin for your ' + tested + ' base' + (tested > 1 ? 's' : '') + '. Leave the bases empty for the standard set.');
        } else if (set.exact) {
            done(true, 'prime');
            S.note('Proved: Miller-Rabin with these bases has no false positives below $' + T(set.bound) + '$.');
        } else {
            done(true, 'a probable prime', 'probable prime');
            S.note('It passes Miller-Rabin for ' + tested + ' bases. For a composite at most a quarter of all bases pass, so with bases picked at random the chance of a false "prime" is below $4^{-' + tested + '}$. Composites can be built to pass the small prime bases (Arnault built one for every prime base below 300), which is why bases spread over the whole range are added.');
        }
    }
});
