/* Toolbox: the generators of a cyclic group: Z_n^* (the primitive roots), Z_n (the numbers coprime to n) or the
   subgroup of order q of Z_p^* (a Schnorr group). How many there are (phi of the group order N), the smallest one
   by the test g^(N/r) != 1 for every prime r dividing N, and the list: all of them when N is small, the first few
   otherwise. */
(function () {
    'use strict';
    var LIST = 2000, FIRST = 10, TRIES = 100000;

    Calc.tool({
        id: 'cyclic-group-generators',
        live: true,
        inputs: [
            { id: 'group', type: 'select', label: 'Group', width: 'l', value: 'mul', options: [['mul', 'Z_n*, multiplication mod n'], ['add', 'Z_n, addition mod n'], ['sub', 'Subgroup of order q in Z_p* (Schnorr group)']] },
            { id: 'n', label: 'Modulus $n$', width: 'l', placeholder: '7', min: 2, when: { group: ['mul', 'add'] } },
            { id: 'p', label: 'Prime $p$', width: 'l', placeholder: '23', min: 3, when: { group: 'sub' } },
            { id: 'q', label: 'Subgroup order $q$', width: 'l', placeholder: '11', min: 2, help: 'A divisor of p - 1, usually a prime.', when: { group: 'sub' } }
        ],
        examples: [{ group: 'mul', n: '7' }, { group: 'mul', n: '18' }, { group: 'add', n: '12' }, { group: 'sub', p: '23', q: '11' }, { group: 'mul', n: '15' }, { group: 'sub', p: '(2^128 + 264) * (2^127 - 1) + 1', q: '2^127 - 1' }, { group: 'mul', n: '2^61 - 1' }],
        run: async function (v, S) {
            var P = Calc.lib.primes, nt = Calc.lib.nt, T = P.T;
            var G = await P.group(v, S), N = G.N, add = G.kind === 'add', sub = G.kind === 'sub';
            if (!G.cyclic) {
                var lam = P.lambda(G.fs);
                S.result('$' + G.name + '$ is not cyclic, so it has no generator', { copy: 'count = 0' });
                S.step('No element reaches the order $N$').p('The largest order of an element is $\\lambda(' + T(G.mod) + ') = ' + T(lam) + '$ (the Carmichael function), smaller than $N = \\varphi(' + T(G.mod) + ') = ' + T(N) + '$. So the powers of one element never give the whole group.');
                S.note('The tool "Is this group cyclic?" shows how $' + G.name + '$ splits into cyclic groups.');
                return;
            }
            if (N === 1n) {
                S.result('$' + G.name + ' = \\{1\\}$ has one generator, $1$', { copy: 'count = 1\nsmallest = 1\nall = 1' });
                S.step('The trivial group').p('Only the identity is in the group, and it generates it.');
                return;
            }
            var nf = await P.orderFactors(S, G), rs = nf.map(function (f) { return f.p; });
            function isGen(g) { return rs.every(function (r) { return G.pw(g, N / r) !== G.one; }); }
            var count = P.phi(nf);

            /* the smallest generator: try the candidates in turn (sub: the powers h^m of h = 2, 3, ...) */
            var rows = [], gens = [], first = null, firstH = null, c = add ? 1n : 2n, tried = 0;
            var head = (sub ? ['$h$', '$g = h^{' + T(G.m) + '}$'] : ['$g$']).concat(rs.map(function (r) { return r === N ? '$g$' : '$' + (add ? '\\frac{N}{' + T(r) + '} \\cdot g' : 'g^{N/' + T(r) + '}') + '$'; }), ['']);
            var want = add || sub || N <= BigInt(LIST) ? 1 : FIRST;
            while (gens.length < want && c < G.mod && tried < TRIES) {
                tried++;
                if (tried % 200 === 0) await S.tick();
                var g = c, pre = ['$' + T(c) + '$'];
                if (sub) { g = G.pw(c, G.m); pre.push('$' + T(g) + '$'); }
                c++;
                if (!sub && !add && nt.gcd(g, G.mod) !== 1n) { if (!first) rows.push(pre.concat(rs.map(function () { return ''; }), ['not in the group'])); continue; }
                if (sub && g === 1n) { if (!first) rows.push(pre.concat(rs.map(function () { return ''; }), ['the identity'])); continue; }
                var vals = rs.map(function (r) { return G.pw(g, N / r); }), ok = vals.every(function (x) { return x !== G.one; });
                if (!first) rows.push(pre.concat(vals.map(function (x) { return x === G.one ? { v: '$' + T(x) + '$', hl: true } : '$' + T(x) + '$'; }), [ok ? 'generator' : 'no']));
                if (ok) { gens.push(g); if (!first) { first = g; firstH = c - 1n; } }
            }
            if (!first) Calc.fail('No generator was found among the first ' + TRIES + ' candidates (this should not happen).');
            var st = S.step(sub ? 'Find a generator: $g = h^{' + T(G.m) + '}$ for $h = 2, 3, \\dots$' : add ? 'Test $g = 1$' : 'Try $g = 2, 3, 4, \\dots$');
            if (sub) st.p('Each $h^{' + T(G.m) + '}$ lies in $G_q$ (its $q$-th power is $h^{p-1} \\equiv 1$). Take the first that passes the test.');
            st.table(head, rows, { mono: true, hl: rows.length - 1 });

            /* how many, and which */
            var sc = S.step('How many generators');
            sc.p('Once one generator $g$ is known, every element is a power $' + G.ptex('g', 'k') + '$ with $0 \\le k < N$, and this element has order $N / \\gcd(k, N)$. It is a generator exactly when $\\gcd(k, N) = 1$, so there are');
            sc.math('\\varphi(N) = \\varphi(' + T(N) + ') = ' + T(count));
            sc.p('generators, ' + 'about ' + (count * 1000n / N < 10n ? (Number(count * 100000n / N) / 1000).toFixed(3) : (Number(count * 100000n / N) / 1000).toFixed(1)) + '% of the group.');
            var all = null;
            if (N <= BigInt(LIST)) {
                all = [];
                var x = G.one, g0 = first;
                for (var k = 1n; k <= N; k++) { x = add ? (x + first) % G.mod : x * first % G.mod; if (nt.gcd(k, N) === 1n) all.push(x); }
                all.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
                if (sub) first = all[0];
                var sa = S.step('All the generators');
                sa.p(add ? 'Here $g = 1$ and $k \\cdot 1 = k$: the generators are the $k$ with $\\gcd(k, ' + T(N) + ') = 1$.' : 'The powers $' + G.ptex(T(g0), 'k') + '$ with $\\gcd(k, ' + T(N) + ') = 1$, sorted:');
                sa.p(P.mlist(all) + '.');
            } else if (!sub) {
                if (add) {
                    gens = [];
                    for (var a = 1n; gens.length < FIRST && a < G.mod; a++) if (nt.gcd(a, G.mod) === 1n) gens.push(a);
                }
                S.step('The smallest ' + gens.length + ' generators').p((add ? 'The numbers coprime to $' + T(G.mod) + '$' : 'Continuing the test') + ': ' + P.mlist(gens) + ', and so on. Listing all $' + T(count) + '$ would be far too long.');
            } else {
                S.step('The other generators').p('All $' + T(count) + '$ generators are the powers $' + T(first) + '^k$ with $\\gcd(k, ' + T(N) + ') = 1$, too many to list.');
            }

            var lines = [(sub && !all ? 'A generator is $' : 'The smallest generator is $') + (String(first).length > 40 ? (sub ? T(firstH) + '^{(p-1)/q} \\bmod p' : '\\dots') : T(first)) + '$', (String(G.mod).length > 12 ? 'The group' : '$' + G.name + '$') + ' has $\\varphi(' + (String(N).length > 12 ? 'N' : T(N)) + ') = ' + T(count) + '$ generator' + (count === 1n ? '' : 's')];
            var copy = 'count = ' + count + (sub && !all ? '\ngenerator = ' : '\nsmallest = ') + first;
            if (all) copy += '\nall = ' + all.join(', ');
            else if (!sub) copy += '\nfirst = ' + gens.join(', ');
            S.result(lines, { copy: copy, label: 'Generators' });
            if (sub && nf.length === 1 && nf[0].e === 1) S.note('$q$ is prime: every element of $G_q$ except $1$ generates it. Diffie-Hellman, DSA and Schnorr signatures work in such a group, so that no small subgroup leaks bits of the secret.');
            else if (G.kind === 'mul' && !all) S.note('Each generator is a primitive root modulo ' + (String(G.mod).length > 40 ? 'this $n$' : '$' + T(G.mod) + '$') + '.');
        }
    });
})();
