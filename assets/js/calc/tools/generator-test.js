/* Toolbox: is g a generator of Z_n^*, of Z_n or of the subgroup of order q of Z_p^*? The test g^(N/r) != 1 for every
   prime r dividing the group order N, then the order of g (N cut down prime by prime) and the subgroup g generates,
   listed when it is small. */
(function () {
    'use strict';
    var SHOW = 60;

    Calc.tool({
        id: 'generator-test',
        live: true,
        inputs: [
            { id: 'group', type: 'select', label: 'Group', width: 'l', value: 'mul', options: [['mul', 'Z_n*, multiplication mod n'], ['add', 'Z_n, addition mod n'], ['sub', 'Subgroup of order q in Z_p* (Schnorr group)']] },
            { id: 'g', label: 'Element $g$', width: 'l', placeholder: '3' },
            { id: 'n', label: 'Modulus $n$', width: 'l', placeholder: '7', min: 2, when: { group: ['mul', 'add'] } },
            { id: 'p', label: 'Prime $p$', width: 'l', placeholder: '23', min: 3, when: { group: 'sub' } },
            { id: 'q', label: 'Subgroup order $q$', width: 'l', placeholder: '11', min: 2, help: 'A divisor of p - 1, usually a prime.', when: { group: 'sub' } }
        ],
        examples: [{ group: 'mul', g: '3', n: '7' }, { group: 'mul', g: '2', n: '7' }, { group: 'mul', g: '5', n: '18' }, { group: 'add', g: '9', n: '12' }, { group: 'sub', g: '4', p: '23', q: '11' }, { group: 'mul', g: '3', n: '8' }, { group: 'mul', g: '3', n: '2^127 - 1' }],
        run: async function (v, S) {
            var P = Calc.lib.primes, nt = Calc.lib.nt, T = P.T;
            var G = await P.group(v, S), N = G.N, add = G.kind === 'add', sub = G.kind === 'sub', g = nt.mod(v.g, G.mod);
            if (g !== v.g) S.step('Reduce $g$ modulo $' + T(G.mod) + '$').math(T(v.g) + ' \\bmod ' + T(G.mod) + ' = ' + T(g));
            function no(why) { S.result(['No: $' + T(g) + '$ is not in $' + G.name + '$', why], { copy: 'generator = no\norder = none' }); }
            /* is g in the group at all? */
            if (G.kind === 'mul') {
                var d = nt.gcd(g, G.mod);
                if (d !== 1n) {
                    no('$\\gcd(' + T(g) + ', ' + T(G.mod) + ') = ' + T(d) + '$');
                    S.step('Check $\\gcd(g, n)$').math('\\gcd(' + T(g) + ', ' + T(G.mod) + ') = ' + T(d) + ' \\ne 1').p('Only numbers coprime to $n$ have an inverse modulo $n$, so only they are in $\\mathbb Z_n^*$.');
                    return;
                }
            }
            if (sub) {
                var gq = g === 0n ? 0n : G.pw(g, N), sm = S.step('Is $g$ in the subgroup?');
                sm.p('The elements of the subgroup are exactly the $x$ with $x^q \\equiv 1 \\pmod p$.');
                sm.check(gq === 1n, '$' + T(g) + '^{' + T(N) + '} \\bmod ' + T(G.mod) + ' = ' + T(gq) + (gq === 1n ? '$' : ' \\ne 1$'));
                if (gq !== 1n) {
                    no('$g^q \\not\\equiv 1 \\pmod p$');
                    if (g !== 0n) S.note('$' + T(g) + '$ is in $\\mathbb Z_{' + T(G.mod) + '}^*$, but outside the subgroup of order $' + T(N) + '$. The power $g^{' + T(G.m) + '}$ is in it.');
                    return;
                }
            }
            if (N === 1n) {
                S.result('Yes: $1$ generates the trivial group $\\{1\\}$', { copy: 'generator = yes\norder = 1' });
                return;
            }
            var ord = N, ok;
            if (add) {
                /* in Z_n no factoring is needed: k g = 0 exactly when n / gcd(g, n) divides k */
                var dd = nt.gcd(g, N);
                ord = N / dd; ok = dd === 1n;
                var sd = S.step('The order of $g$ in $' + G.name + '$');
                sd.p('$k \\cdot g \\equiv 0 \\pmod n$ means that $n$ divides $k g$. With $d = \\gcd(g, n)$ this happens exactly when $n / d$ divides $k$, so the order of $g$ is $n / d$:');
                sd.math('\\gcd(' + T(g) + ', ' + T(N) + ') = ' + T(dd) + ', \\qquad \\operatorname{ord}(' + T(g) + ') = ' + T(N) + ' / ' + T(dd) + ' = ' + T(ord));
                sd.check(ok, ok ? 'The gcd is $1$: $g$ generates $' + G.name + '$' : 'The gcd is not $1$: $g$ only reaches the multiples of $' + T(dd) + '$');
            } else {
                var nf = await P.orderFactors(S, G), rs = nf.map(function (f) { return f.p; });
                var vals = rs.map(function (r) { return G.pw(g, N / r); });
                ok = vals.every(function (x) { return x !== G.one; });
                var st = S.step('Test $g = ' + T(g) + '$');
                st.table(['$r$', '$N / r$', '$' + G.ptex('g', 'N/r') + ' \\bmod ' + T(G.mod) + '$', ''], rs.map(function (r, i) {
                    var one = vals[i] === G.one;
                    return ['$' + T(r) + '$', '$' + T(N / r) + '$', one ? { v: '$' + T(vals[i]) + '$', hl: true } : '$' + T(vals[i]) + '$', one ? 'the identity: fails' : 'passes'];
                }), { mono: true });
                st.check(ok, ok ? 'No test gives the identity, so the order of $' + T(g) + '$ is $N$' : 'A test gives the identity, so the order of $' + T(g) + '$ is smaller than $N$');

                if (!ok) {
                    var o = P.orderFrom(function (k) { return G.pw(g, k); }, function (y) { return y === G.one; }, N, nf);
                    ord = o.ord;
                    S.step('The order of $g$').p('Start with $t = N$; for each prime $r$, as long as $' + G.ptex('g', 't/r') + '$ is still the identity, replace $t$ by $t/r$. What is left is the order.')
                        .table(['$r$', '$t / r$', '$' + G.ptex('g', 't/r') + '$', 'then'], o.rows.map(function (x) { return ['$' + T(x.r) + '$', '$' + T(x.k) + '$', x.one ? { v: '$' + T(x.y) + '$', hl: true } : '$' + T(x.y) + '$', x.one ? 'divide by ' + x.r : 'keep']; }), { mono: true });
                }
            }
            if (ord <= BigInt(SHOW)) {
                var pw = [], x = G.one, el = [];
                for (var k = 1n; k <= ord; k++) { x = add ? (x + g) % G.mod : x * g % G.mod; el.push(x); pw.push(['$' + k + '$', k === ord ? { v: '$' + T(x) + '$', hl: true } : '$' + T(x) + '$']); }
                el.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
                S.step('The subgroup generated by $g$').p(add ? 'Add $' + T(g) + '$ again and again; the cycle closes at the order:' : 'Multiply by $' + T(g) + '$ again and again; the cycle closes at the order:')
                    .table(['$k$', '$' + G.ptex(T(g), 'k') + ' \\bmod ' + T(G.mod) + '$'], pw, { mono: true, max: 24 })
                    .p('$\\langle ' + T(g) + ' \\rangle = \\{' + el.map(T).join(', ') + '\\}$' + (ord === N ? ', the whole group.' : ', ' + T(ord) + ' of the $' + T(N) + '$ elements.'));
            }
            /* huge numbers stay out of the result lines (they are in the steps) */
            var big = String(G.mod).length > 40, gn = big ? 'the group' : '$' + G.name + '$', gt = String(g).length > 40 ? 'g' : T(g);
            if (ok) S.result(['Yes: $' + gt + '$ generates ' + gn, 'Its order is $N' + (big ? '' : ' = ' + T(N)) + '$'], { copy: 'generator = yes\norder = ' + N });
            else S.result(['No: $' + gt + '$ does not generate ' + gn, 'Its order is $' + (big ? 'N / ' + T(N / ord) : T(ord)) + '$, a proper divisor of $N' + (big ? '' : ' = ' + T(N)) + '$'], { copy: 'generator = no\norder = ' + ord });
            if (!G.cyclic) S.note('$' + G.name + '$ is not cyclic, so no element generates it. The largest order is $\\lambda(' + T(G.mod) + ') = ' + T(P.lambda(G.fs)) + '$.');
            else if (!ok) S.note('$\\langle ' + gt + ' \\rangle$ is the subgroup of ' + (big ? '' : 'order $' + T(ord) + '$, of ') + 'index $' + T(N / ord) + '$.' + (G.kind === 'mul' && G.mod > 5n && N === G.mod - 1n && ord === N / 2n && nt.isPrime(N / 2n) ? ' Here $g$ is a square modulo $' + (big ? 'p' : T(G.mod)) + '$ (a quadratic residue): the squares form the subgroup of prime order $(p - 1)/2' + (big ? '' : ' = ' + T(N / 2n)) + '$.' : ''));
            else if (G.kind === 'mul') S.note('$' + gt + '$ is a primitive root modulo ' + (big ? 'this $n$' : '$' + T(G.mod) + '$') + '.');
        }
    });
})();
