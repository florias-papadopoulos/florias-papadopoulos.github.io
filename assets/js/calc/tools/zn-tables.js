/* Toolbox: the addition, multiplication and power tables of Z_n (n up to 30), with the units and their inverses,
   the zero divisors, and the group of units: its order phi(n), the order of every unit, and generators. */
(function () {
    'use strict';
    var MAXN = 30;
    function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }

    Calc.tool({
        id: 'zn-tables',
        live: true,
        inputs: [
            { id: 'n', label: 'Modulus $n$', placeholder: '12', min: 2, max: MAXN },
            { id: 'show', type: 'select', label: 'Tables', width: 'l', value: 'all', options: [['all', 'Addition, multiplication and powers'], ['add', 'Addition only'], ['mul', 'Multiplication only'], ['pow', 'Powers only'], ['units', 'Only the group of units']] }
        ],
        examples: [{ n: '12', show: 'all' }, { n: '7', show: 'all' }, { n: '8', show: 'mul' }, { n: '15', show: 'pow' }, { n: '26', show: 'units' }],
        run: function (v, S) {
            var n = Number(v.n), show = v.show, i, j;
            var units = [], zd = [], inv = {}, ord = {};
            for (i = 1; i < n; i++) {
                if (gcd(i, n) === 1) {
                    units.push(i);
                    for (j = 1; j < n; j++) if (i * j % n === 1) { inv[i] = j; break; }
                    var x = i, k = 1;
                    while (x !== 1 % n) { x = x * i % n; k++; }
                    ord[i] = k;
                } else zd.push(i);
            }
            var phi = units.length, gens = units.filter(function (u) { return ord[u] === phi; });
            var lambda = units.reduce(function (m, u) { return Math.max(m, ord[u]); }, 1);
            function set(xs) { return xs.length ? '\\{' + xs.join(', ') + '\\}' : '\\varnothing'; }

            S.result(['$\\mathbb{Z}_{' + n + '}^{\\times} = ' + set(units) + '$', '$\\varphi(' + n + ') = ' + phi + '$ units, ' + zd.length + ' zero divisor' + (zd.length === 1 ? '' : 's') + (gens.length ? ', cyclic with ' + gens.length + ' generator' + (gens.length === 1 ? '' : 's') : ', not cyclic')],
                { copy: 'units: ' + units.join(', ') + '\nzero divisors: ' + (zd.join(', ') || 'none') + '\ngenerators: ' + (gens.join(', ') || 'none') });
            if (zd.length === 0) S.note('$' + n + '$ is prime, so every non-zero element is a unit: $\\mathbb{Z}_{' + n + '}$ is a field.');

            S.step('The elements').p('$\\mathbb{Z}_{' + n + '}$ is the set of remainders modulo $' + n + '$, with addition and multiplication followed by reduction modulo $' + n + '$:').math('\\mathbb{Z}_{' + n + '} = \\{0, 1, \\dots, ' + (n - 1) + '\\}');

            var head = function (op) { var h = ['$' + op + '$']; for (var c = 0; c < n; c++) h.push('$' + c + '$'); return h; };
            if (show === 'all' || show === 'add') {
                var rowsA = [];
                for (i = 0; i < n; i++) {
                    var ra = ['$' + i + '$'];
                    for (j = 0; j < n; j++) { var s = (i + j) % n; ra.push(s === 0 ? { v: '0', hl: true } : String(s)); }
                    rowsA.push(ra);
                }
                S.step('Addition table').p('Row $a$, column $b$: $(a + b) \\bmod ' + n + '$. The highlighted zeros pair every element with its negative: $-a \\equiv ' + n + ' - a$. Every row is a shift of the one above, because adding 1 moves every entry one place.')
                    .table(head('+'), rowsA, { mono: true, max: 64 });
            }
            if (show === 'all' || show === 'mul') {
                var rowsM = [];
                for (i = 0; i < n; i++) {
                    var rm = ['$' + i + '$'];
                    for (j = 0; j < n; j++) { var p = i * j % n; rm.push(p === 1 ? { v: '1', hl: true } : String(p)); }
                    rowsM.push(rm);
                }
                S.step('Multiplication table').p('Row $a$, column $b$: $(a \\cdot b) \\bmod ' + n + '$. A highlighted 1 in row $a$ sits in the column of $a^{-1}$. The rows of the units contain every element exactly once; the rows of the other elements repeat values and contain a 0 off the first column (for $a \\ne 0$, these are the zero divisors).')
                    .table(head('\\cdot'), rowsM, { mono: true, max: 64 });
            }
            if (show === 'all' || show === 'pow') {
                var E = Math.max(phi, 2), rowsP = [], hp = ['$a$'];
                for (j = 1; j <= E; j++) hp.push('$a^{' + j + '}$');
                for (i = 0; i < n; i++) {
                    var rp = ['$' + i + '$'], y = 1;
                    for (j = 1; j <= E; j++) { y = y * i % n; rp.push(y === 1 && units.indexOf(i) >= 0 ? { v: '1', hl: true } : String(y)); }
                    rowsP.push(rp);
                }
                S.step('Power table').p('Row $a$, column $k$: $a^k \\bmod ' + n + '$, each entry the one to its left times $a$. For a unit the powers reach 1 (highlighted) and then repeat; the first 1 is at the order of $a$. Here every unit satisfies $a^{' + lambda + '} \\equiv 1$' + (lambda < phi ? ', even earlier than $a^{\\varphi(n)} = a^{' + phi + '}$ from Euler\'s theorem' : ' ($' + lambda + ' = \\varphi(' + n + ')$, Euler\'s theorem)') + '.')
                    .table(hp, rowsP, { mono: true, max: 64 });
            }

            /* units and their inverses */
            var su = S.step('Units and their inverses');
            su.p('$a$ has an inverse modulo $' + n + '$ exactly when $\\gcd(a, ' + n + ') = 1$. There are $\\varphi(' + n + ') = ' + phi + '$ of them:');
            su.table(['$a$', '$\\gcd(a, ' + n + ')$', '$a^{-1}$', 'Check', 'Order of $a$'], units.map(function (u) {
                return ['$' + u + '$', '$1$', '$' + inv[u] + '$', '$' + u + ' \\cdot ' + inv[u] + ' = ' + u * inv[u] + ' \\equiv 1$', { v: '$' + ord[u] + '$', hl: ord[u] === phi }];
            }), { max: 64 });
            var self = units.filter(function (u) { return inv[u] === u; });
            su.p('Self-inverse ($a^2 \\equiv 1$): $' + self.join(', ') + '$.');

            /* zero divisors */
            var sz = S.step('Zero divisors');
            if (!zd.length) sz.p('There are none: $' + n + '$ is prime, so $a \\cdot b \\equiv 0$ only when $a \\equiv 0$ or $b \\equiv 0$.');
            else {
                sz.p('A non-zero $a$ with $\\gcd(a, ' + n + ') = d > 1$ is a zero divisor: $a \\cdot \\frac{' + n + '}{d}$ is a multiple of $' + n + '$, although neither factor is $0$. In $\\mathbb{Z}_n$ every non-zero element is either a unit or a zero divisor.');
                sz.table(['$a$', '$d = \\gcd(a, ' + n + ')$', 'Witness'], zd.map(function (z) {
                    var d = gcd(z, n), w = n / d;
                    return ['$' + z + '$', '$' + d + '$', '$' + z + ' \\cdot ' + w + ' = ' + z * w + ' \\equiv 0$'];
                }), { max: 64 });
            }

            /* the group */
            var sg = S.step('The group of units $\\mathbb{Z}_{' + n + '}^{\\times}$');
            sg.p('The units form a group under multiplication: products and inverses of units are units. Its order is $\\varphi(' + n + ') = ' + phi + '$, and the order of every element divides it (Lagrange).');
            sg.check(units.every(function (u) { return phi % ord[u] === 0; }), 'Every order divides $' + phi + '$: ' + units.map(function (u) { return '$' + ord[u] + '$'; }).join(', '));
            if (gens.length) {
                var g = gens[0], cyc = [], z = 1;
                for (var t = 0; t < phi; t++) { z = z * g % n; cyc.push(z); }
                sg.p('An element of order $' + phi + '$ generates the whole group, so it is cyclic. The generators (primitive roots modulo $' + n + '$) are $' + gens.join(', ') + '$. The powers of $' + g + '$:');
                sg.p(cyc.map(function (x, k) { return '$' + g + '^{' + (k + 1) + '} \\equiv ' + x + '$'; }).join(', ') + '.');
            } else {
                sg.p('No element has order $' + phi + '$ (the largest order is $' + lambda + '$), so the group is not cyclic: there is no primitive root modulo $' + n + '$. A primitive root exists only for $n = 1, 2, 4, p^k$ and $2 p^k$ with $p$ an odd prime.');
            }
        }
    });
})();
