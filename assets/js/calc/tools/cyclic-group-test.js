/* Toolbox: is the group cyclic? Z_n^* (Gauss's rule n = 1, 2, 4, p^k, 2p^k, checked against lambda(n) = phi(n)), Z_n
   (always) or a product Z_m1 x Z_m2 x ... (cyclic iff the m_i are pairwise coprime). The structure as a product of
   cyclic groups: split by the Chinese remainder theorem into prime powers, then collected into the invariant factors
   n_1 | n_2 | ... | n_k, with n_k the largest order of an element. */
(function () {
    'use strict';

    /* the step that collects cyclic factors of orders ms (BigInt, > 1) into invariant factors; returns the list */
    async function combine(S, ms, P) {
        var T = P.T, facs = [];
        for (var i = 0; i < ms.length; i++) facs.push((await P.factorize(ms[i], S)).factors);
        var r = P.invariant(facs), s = S.step('Collect the factors: the invariant factors');
        if (ms.length === 1) { s.p('There is only one cyclic factor, $\\mathbb Z_{' + T(ms[0]) + '}$: the group is cyclic.'); return r.inv; }
        s.p('By the Chinese remainder theorem $\\mathbb Z_m \\cong \\mathbb Z_a \\times \\mathbb Z_b$ when $m = ab$ with $\\gcd(a, b) = 1$. So every factor splits into prime powers:');
        s.table(['Factor', 'Prime powers'], ms.map(function (m, j) {
            return ['$\\mathbb Z_{' + T(m) + '}$', '$' + facs[j].map(function (f) { return '\\mathbb Z_{' + T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : '') + '}'; }).join(' \\times ') + '$'];
        }));
        s.p('Gluing works the same way: powers of different primes multiply to one cyclic group. Sort the powers of each prime from largest to smallest; the largest ones together make $n_k$, the second largest $n_{k-1}$, and so on:');
        s.table(['Prime', 'Powers, largest first'], r.primes.map(function (x) { return ['$' + T(x.p) + '$', '$' + x.es.map(function (e) { return T(x.p) + (e > 1 ? '^{' + e + '}' : ''); }).join(', ') + '$']; }));
        s.math(P.zTex(r.inv) + (r.inv.length > 1 ? ', \\quad ' + r.inv.map(T).join(' \\mid ') : ''));
        if (r.inv.length > 1) s.p('Each $n_i$ divides the next, and this form is unique: two groups are isomorphic exactly when they have the same invariant factors.');
        return r.inv;
    }

    Calc.tool({
        id: 'cyclic-group-test',
        live: true,
        inputs: [
            { id: 'group', type: 'select', label: 'Group', width: 'l', value: 'mul', options: [['mul', 'Z_n*, multiplication mod n'], ['add', 'Z_n, addition mod n'], ['prod', 'A product Z_m1 x Z_m2 x ...']] },
            { id: 'n', label: 'Modulus $n$', width: 'l', placeholder: '15', min: 1, when: { group: ['mul', 'add'] } },
            { id: 'ms', type: 'list', label: 'Orders $m_1, m_2, \\dots$', width: 'l', placeholder: '2, 3', when: { group: 'prod' }, help: 'The product of Z_m1, Z_m2, ... (each m at least 1, at most 12 of them).' }
        ],
        examples: [{ group: 'mul', n: '15' }, { group: 'mul', n: '18' }, { group: 'mul', n: '8' }, { group: 'mul', n: '105' }, { group: 'add', n: '12' }, { group: 'prod', ms: '2, 3' }, { group: 'prod', ms: '4, 6, 10' }, { group: 'mul', n: '2^127 - 1' }],
        run: async function (v, S) {
            var P = Calc.lib.primes, nt = Calc.lib.nt, T = P.T, inv, order, exp;
            if (v.group === 'prod') {
                var ms = v.ms;
                if (ms.length > 12) Calc.fail('At most 12 factors.', 'ms');
                if (ms.some(function (m) { return m < 1n; })) Calc.fail('Every m must be at least 1.', 'ms');
                if (ms.some(function (m) { return nt.bitLength(m) > 256; })) Calc.fail('Every m must have at most 256 bits here.', 'ms');
                var name = ms.map(function (m) { return '\\mathbb Z_{' + T(m) + '}'; }).join(' \\times ');
                order = ms.reduce(function (a, m) { return a * m; }, 1n);
                exp = ms.reduce(function (a, m) { return nt.lcm(a, m); }, 1n);
                var s0 = S.step('Order and exponent');
                s0.p('The elements of $' + name + '$ are tuples, added component by component. The group has $' + ms.map(T).join(' \\cdot ') + ' = ' + T(order) + '$ elements.');
                s0.p('A tuple returns to $0$ after $k$ steps when every component does, so its order is the lcm of the orders of its components. The largest order (the exponent) is therefore');
                s0.math('\\operatorname{lcm}(' + ms.map(T).join(', ') + ') = ' + T(exp));
                var sc = S.step('Cyclic means: the exponent equals the order');
                sc.p('A group of $N$ elements is cyclic when some element has order $N$.');
                sc.check(exp === order, '$' + T(exp) + (exp === order ? ' = ' : ' < ') + T(order) + '$');
                var big = ms.filter(function (m) { return m > 1n; });
                if (big.length >= 2 && big.length <= 8) {
                    var rows = [];
                    for (var i = 0; i < big.length; i++) for (var j = i + 1; j < big.length; j++) { var g = nt.gcd(big[i], big[j]); rows.push(['$\\gcd(' + T(big[i]) + ', ' + T(big[j]) + ')$', g === 1n ? '$1$' : { v: '$' + T(g) + '$', hl: true }]); }
                    sc.p('The lcm equals the product exactly when the orders are pairwise coprime:').table(['Pair', 'gcd'], rows, { mono: true });
                }
                inv = big.length ? await combine(S, big, P) : [];
                finish(S, P, name, order, exp, inv, null);
                return;
            }
            var n = v.n, r = await P.factorStep(S, n), fs = r.factors;
            if (v.group === 'add') {
                var sa = S.step('$\\mathbb Z_{' + T(n) + '}$ is cyclic');
                sa.p('The numbers $0, 1, \\dots, ' + T(n - 1n) + '$ with addition modulo $' + T(n) + '$: every element is $1 + 1 + \\dots + 1$, so $1$ generates the group. Every $a$ with $\\gcd(a, n) = 1$ does too, which gives $\\varphi(' + T(n) + ') = ' + T(P.phi(fs)) + '$ generators.');
                if (fs.length > 1) sa.p('By the Chinese remainder theorem it is also a product of cyclic groups of coprime orders:').math('\\mathbb Z_{' + T(n) + '} \\cong ' + fs.map(function (f) { return '\\mathbb Z_{' + T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : '') + '}'; }).join(' \\times '));
                finish(S, P, '\\mathbb Z_{' + T(n) + '}', n, n, n > 1n ? [n] : [], '0');
                return;
            }
            /* Z_n^* */
            order = P.phi(fs); exp = P.lambda(fs);
            var nm = '\\mathbb Z_{' + T(n) + '}^*', so = S.step('The order of $' + nm + '$');
            so.p('The group has $\\varphi(n)$ elements, the numbers below $n$ coprime to $n$:');
            so.math('\\varphi(' + T(n) + ') = ' + (fs.length ? fs.map(function (f) { return '\\varphi(' + T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : '') + ')'; }).join(' \\cdot ') + ' = ' : '') + T(order));
            var cyc = P.cyclic(fs), sg = S.step('Gauss\'s rule');
            sg.p('$\\mathbb Z_n^*$ is cyclic exactly when $n$ is $1, 2, 4$, a power $p^k$ of an odd prime, or twice such a power $2p^k$.');
            sg.check(cyc, '$' + T(n) + (fs.length > 1 || (fs.length && fs[0].e > 1) ? ' = ' + P.tex(fs) : '') + '$ ' + (cyc ? 'is of that form' : 'is not of that form'));
            if (!cyc) sg.p(fs.length === 1 ? 'Powers of 2 from 8 on fail: $3, 5$ and $7$ all square to $1$ modulo $8$, so there are three elements of order 2.'
                : 'With two odd prime factors (or $4$ and an odd prime) the number $1$ has more than two square roots, by the Chinese remainder theorem: $x \\equiv \\pm 1$ modulo each part. That gives several elements of order 2, and a cyclic group has at most one.');
            var parts = P.unitParts(fs), sp = S.step('Split with the Chinese remainder theorem');
            sp.p('Modulo $n = ' + P.tex(fs) + '$ a number is coprime to $n$ exactly when it is coprime to every prime power, and the CRT matches residues one to one:');
            sp.math(nm + ' \\cong ' + (fs.length ? fs.map(function (f) { return '\\mathbb Z_{' + T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : '') + '}^*'; }).join(' \\times ') : '\\{1\\}'));
            sp.p('Each prime power gives cyclic groups: $\\mathbb Z_{p^k}^* \\cong \\mathbb Z_{p^{k-1}(p-1)}$ for odd $p$; $\\mathbb Z_2^* = \\{1\\}$, $\\mathbb Z_4^* \\cong \\mathbb Z_2$, and $\\mathbb Z_{2^k}^* \\cong \\mathbb Z_2 \\times \\mathbb Z_{2^{k-2}}$ for $k \\ge 3$ (generated by $-1$ and $5$).');
            sp.table(['Prime power', 'Order', 'Structure'], parts.map(function (x) {
                var pe = T(x.f.p) + (x.f.e > 1 ? '^{' + x.f.e + '}' : '');
                return ['$\\mathbb Z_{' + pe + '}^*$', '$' + T(P.phi([x.f])) + '$', '$' + P.zTex(x.orders) + '$'];
            }));
            var ms2 = [];
            parts.forEach(function (x) { x.orders.forEach(function (m) { ms2.push(m); }); });
            inv = ms2.length ? await combine(S, ms2, P) : [];
            var se = S.step('Check with the Carmichael function');
            se.p('The largest order of an element is $\\lambda(n)$, the lcm of the orders of the factors, and the group is cyclic exactly when $\\lambda(n) = \\varphi(n)$:');
            se.math('\\lambda(' + T(n) + ') = ' + T(exp) + (exp === order ? ' = ' : ' < ') + T(order) + ' = \\varphi(' + T(n) + ')');
            se.check((exp === order) === cyc && (!inv.length || inv[inv.length - 1] === exp), 'Gauss\'s rule, $\\lambda(n)$ and the largest invariant factor agree');
            finish(S, P, nm, order, exp, inv, '1');
        }
    });

    function finish(S, P, name, order, exp, inv, one) {
        var T = P.T, cyc = exp === order;
        var lines = [cyc ? 'Yes: $' + name + '$ is cyclic' + (inv.length === 1 && name === P.zTex(inv) ? '' : ', $\\cong ' + (inv.length ? P.zTex(inv) : '\\{' + (one || '0') + '\\}') + '$') : 'No: $' + name + '$ is not cyclic',
            cyc ? 'Order $' + T(order) + '$' : '$' + name + ' \\cong ' + P.zTex(inv) + '$, order $' + T(order) + '$, largest element order $' + T(exp) + '$'];
        S.result(lines, { copy: 'cyclic = ' + (cyc ? 'yes' : 'no') + '\norder = ' + order + '\nexponent = ' + exp + '\nstructure = ' + P.zPlain(inv, one || '0'), label: 'Cyclic?' });
        if (!cyc) S.note('It needs ' + inv.length + ' generators: no single element reaches all $' + T(order) + '$ elements, but every element is a combination of one generator from each factor.');
    }
})();
