/* Toolbox: element orders and subgroups of Z_n^* or Z_n for small n. The order of every element, how many elements
   have each order, and every subgroup with its elements, a generating set and the subgroups directly above it (the
   subgroup lattice). Subgroups are found from the cyclic ones <a>, joined with one more element at a time. */
(function () {
    'use strict';
    var MAXN = 2000, JOIN = 256, MAXSUB = 300, SHOWEL = 16;
    function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
    function phiN(m) { var r = m; for (var p = 2; p * p <= m; p++) if (m % p === 0) { while (m % p === 0) m /= p; r -= r / p; } if (m > 1) r -= r / m; return r; }

    Calc.tool({
        id: 'subgroups',
        live: true,
        inputs: [
            { id: 'group', type: 'select', label: 'Group', width: 'l', value: 'mul', options: [['mul', 'Z_n*, multiplication mod n'], ['add', 'Z_n, addition mod n']] },
            { id: 'n', label: 'Modulus $n$', placeholder: '15', min: 2, max: MAXN, help: 'Up to ' + MAXN + '.' }
        ],
        examples: [{ group: 'mul', n: '15' }, { group: 'mul', n: '7' }, { group: 'mul', n: '8' }, { group: 'mul', n: '24' }, { group: 'add', n: '12' }, { group: 'mul', n: '18' }],
        run: async function (v, S) {
            var T = Calc.lib.primes.T, n = Number(v.n), add = v.group === 'add', i, j;
            var op = add ? function (a, b) { return (a + b) % n; } : function (a, b) { return a * b % n; };
            var one = add ? 0 : 1, els = [];
            for (i = add ? 0 : 1; i < n; i++) if (add || gcd(i, n) === 1) els.push(i);
            var N = els.length, name = add ? '\\mathbb Z_{' + n + '}' : '\\mathbb Z_{' + n + '}^*';
            var pt = add ? function (k, a) { return k + ' \\cdot ' + a; } : function (k, a) { return a + '^{' + k + '}'; };

            /* the order of every element, and the cyclic subgroup it generates */
            var ord = {}, cyc = [], bySize = {}, rows = [];
            for (i = 0; i < N; i++) {
                var a = els[i], x = a, list = [a];
                while (x !== one) { x = op(x, a); list.push(x); }
                ord[a] = list.length;
                var shown = list.slice(0, 8).map(function (y, k) { return '$' + pt(k + 1, 'a') + ' = ' + y + '$'; });
                rows.push(['$' + a + '$', ord[a] === N ? { v: '$' + N + '$', hl: true } : '$' + ord[a] + '$', shown.join(', ') + (list.length > 8 ? ', ...' : '')]);
                /* <a> is a subgroup already found when a lies in one of the same order */
                var known = (bySize[list.length] || []).some(function (C) { return C.set[a]; });
                if (!known) {
                    var C2 = { els: list.slice().sort(function (p, q) { return p - q; }), gens: [a], set: {} };
                    list.forEach(function (y) { C2.set[y] = 1; });
                    (bySize[list.length] = bySize[list.length] || []).push(C2);
                    cyc.push(C2);
                }
                if (i % 200 === 0) await S.tick();
            }
            var s1 = S.step('The order of every element of $' + name + '$');
            s1.p(add ? 'The order of $a$ is the smallest $k \\ge 1$ with $k \\cdot a \\equiv 0 \\pmod{' + n + '}$, which is $' + n + ' / \\gcd(a, ' + n + ')$.' : 'The group has the $\\varphi(' + n + ') = ' + N + '$ numbers below $' + n + '$ coprime to it. The order of $a$ is the smallest $k \\ge 1$ with $a^k \\equiv 1 \\pmod{' + n + '}$: multiply by $a$ until $1$ comes back.');
            s1.table(['$a$', 'Order', 'Powers'], rows, { mono: true, max: 40, align: ['r', 'r', 'l'] });

            /* how many of each order */
            var count = {};
            els.forEach(function (a) { count[ord[a]] = (count[ord[a]] || 0) + 1; });
            var ds = Object.keys(count).map(Number).sort(function (p, q) { return p - q; });
            var maxO = ds[ds.length - 1], isCyc = maxO === N;
            var s2 = S.step('How many elements of each order');
            s2.p('By Lagrange\'s theorem every order divides $N = ' + N + '$.' + (isCyc ? ' The group is cyclic, and a cyclic group of order $N$ has exactly $\\varphi(d)$ elements of order $d$ for every divisor $d$ of $N$.' : ' The largest order is $' + maxO + ' < N$, so the group is not cyclic.'));
            s2.table(['Order $d$', 'Elements'].concat(isCyc ? ['$\\varphi(d)$'] : []), ds.map(function (d) { return ['$' + d + '$', count[d]].concat(isCyc ? ['$' + phiN(d) + '$'] : []); }), { mono: true });

            /* the subgroups: the cyclic ones, then joins <H, c> until nothing new appears */
            var subs = cyc.slice(), byKey = {}, complete = true;
            subs.forEach(function (H) { byKey[H.els.join(',')] = H; });
            var cycList = subs.slice();
            if (!isCyc) {
                if (N > JOIN) complete = false;
                for (i = 0; complete && i < subs.length; i++) {
                    var H = subs[i], inH = {};
                    H.els.forEach(function (y) { inH[y] = 1; });
                    for (j = 0; j < cycList.length; j++) {
                        var c = cycList[j].gens[0];
                        if (inH[c]) continue;
                        /* <H, c> = H, Hc, Hc^2, ... until a power of c falls into H (the group is abelian) */
                        var J = H.els.slice(), seen = {}, y = c;
                        H.els.forEach(function (z) { seen[z] = 1; });
                        while (!inH[y]) { H.els.forEach(function (z) { var w = op(z, y); if (!seen[w]) { seen[w] = 1; J.push(w); } }); y = op(y, c); }
                        J.sort(function (p, q) { return p - q; });
                        var k2 = J.join(',');
                        if (!byKey[k2]) {
                            byKey[k2] = { els: J, gens: H.gens.concat([c]) };
                            subs.push(byKey[k2]);
                            if (subs.length > MAXSUB) { complete = false; break; }
                        }
                    }
                    if (i % 20 === 0) await S.tick();
                }
                if (!complete) subs = cycList.slice();
            }
            subs.sort(function (A, B) { return A.els.length - B.els.length || (A.els[1] || 0) - (B.els[1] || 0); });
            /* cyclic subgroups: name the smallest generator; the directly larger subgroups (the lattice) */
            subs.forEach(function (A, idx) {
                A.idx = idx + 1;
                var m = A.els.length, g = A.els.filter(function (y) { return ord[y] === m; });
                A.cyclic = g.length > 0;
                if (A.cyclic) A.gens = [g[0]];
                A.set = {};
                A.els.forEach(function (y) { A.set[y] = 1; });
            });
            function inside(A, B) { return B.els.length > A.els.length && B.els.length % A.els.length === 0 && A.els.every(function (y) { return B.set[y]; }); }
            if (complete) subs.forEach(function (A) {
                var up = subs.filter(function (B) { return inside(A, B); });
                A.up = up.filter(function (B) { return !up.some(function (C) { return C !== B && inside(C, B); }); }).map(function (B) { return 'H_{' + B.idx + '}'; });
            });
            var s3 = S.step(complete ? 'All ' + subs.length + ' subgroups' : 'The cyclic subgroups');
            if (isCyc) s3.p('In a cyclic group there is exactly one subgroup for each divisor $d$ of $N$, the elements whose order divides $d$, and it is cyclic. $N = ' + N + '$ has ' + ds.length + ' divisors.');
            else if (complete) s3.p('Every subgroup is built from cyclic ones: start with the groups $\\langle a \\rangle$, and keep adding one more element and closing up under the operation until nothing new appears. Subgroups of the same order can be different here, which never happens in a cyclic group.');
            else s3.p('There are too many subgroups to find them all here (the limit is ' + JOIN + ' elements and ' + MAXSUB + ' subgroups), so only the $' + subs.length + '$ cyclic subgroups $\\langle a \\rangle$ are listed.');
            s3.table(['', 'Order', 'Elements', 'Generated by'].concat(complete ? ['Directly inside'] : []), subs.map(function (A) {
                var e = A.els.slice(0, SHOWEL).join(', ') + (A.els.length > SHOWEL ? ', ... (' + A.els.length + ')' : '');
                var gtxt = '$' + A.gens.join(', ') + '$' + (A.cyclic ? '' : ' (not cyclic)');
                return ['$H_{' + A.idx + '}$', '$' + A.els.length + '$', '$\\{' + e + '\\}$', gtxt].concat(complete ? [A.up.length ? '$' + A.up.join(', ') + '$' : 'the top'] : []);
            }), { mono: true, max: 40, align: ['l', 'r', 'l', 'l', 'l'] });
            if (complete) s3.p('"Directly inside" is the subgroup lattice: $H_i$ lies in each listed group with no other subgroup in between.');

            var orders = ds.map(function (d) { return d + ': ' + count[d]; }).join(', ');
            S.result(['$' + name + '$ has ' + N + ' element' + (N === 1 ? '' : 's') + ' and is ' + (isCyc ? 'cyclic' : 'not cyclic (largest order $' + maxO + '$)'), complete ? subs.length + ' subgroup' + (subs.length === 1 ? '' : 's') + ', ' + subs.filter(function (A) { return A.cyclic; }).length + ' of them cyclic' : subs.length + ' cyclic subgroups (more subgroups exist)'],
                { copy: 'order = ' + N + '\nelement orders = ' + orders + '\nsubgroups = ' + (complete ? subs.length : 'more than ' + subs.length), label: 'Subgroups' });
        }
    });
})();
