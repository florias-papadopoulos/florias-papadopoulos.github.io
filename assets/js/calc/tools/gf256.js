/* Toolbox: arithmetic in GF(2^8) as in AES (modulus x^8 + x^4 + x^3 + x + 1): addition, multiplication by xtime and
   add (table) checked by polynomial long division, inverse by the extended Euclidean algorithm over GF(2)[x], and
   the AES S-box value. Values in hex, binary and polynomial form. */
Calc.tool({
    id: 'gf256',
    live: true,
    inputs: [
        { id: 'a', type: 'text', label: 'Byte $a$', placeholder: '57', help: 'Hex like 57, binary like 0b01010111, or a polynomial like x^6 + x^4 + x^2 + x + 1.' },
        { id: 'b', type: 'text', label: 'Byte $b$ (to add or multiply)', placeholder: '83', optional: true }
    ],
    actions: [{ id: 'mul', label: 'Multiply' }, { id: 'add', label: 'Add' }, { id: 'inv', label: 'Inverse of a' }],
    examples: [
        { a: '57', b: '83' },
        { a: '53', b: '', _action: 'inv' },
        { a: '57', b: '13' },
        { a: 'x^6 + x^4 + x^2 + x + 1', b: 'x^7 + x + 1', _action: 'add' },
        { a: '0b10000000', b: '02' }
    ],
    run: function (v, S) {
        var MOD = 0x11B;
        function hex(n) { return (n < 16 ? '0' : '') + n.toString(16).toUpperCase(); }
        function bin(n, w) { var s = n.toString(2); while (s.length < (w || 8)) s = '0' + s; return s; }
        /* a polynomial over GF(2) (bit i = coefficient of x^i) in TeX */
        function ptex(n) {
            if (!n) return '0';
            var t = [];
            for (var i = 15; i >= 0; i--) if (n >> i & 1) t.push(i === 0 ? '1' : i === 1 ? 'x' : 'x^{' + i + '}');
            return t.join(' + ');
        }
        function deg(n) { var d = -1; while (n >> (d + 1)) d++; return d; }
        function clmul(x, y) { var r = 0; for (var i = 0; y >> i; i++) if (y >> i & 1) r ^= x << i; return r; }
        function pdiv(x, y) { var q = 0, dy = deg(y); while (x && deg(x) >= dy) { var s = deg(x) - dy; q |= 1 << s; x ^= y << s; } return { q: q, r: x }; }
        function gmul(x, y) { return pdiv(clmul(x, y), MOD).r; }
        function parse(raw, field) {
            var s = String(raw == null ? '' : raw).trim().replace(/^\{(.*)\}$/, '$1').replace(/\s+/g, '');
            if (!s) Calc.fail('Please enter a byte.', field);
            var n;
            if (/^0b[01]+$/i.test(s)) n = parseInt(s.slice(2), 2);
            else if (/^0x[0-9a-f]+$/i.test(s)) n = parseInt(s.slice(2), 16);
            else if (/^[0-9a-f]+$/i.test(s)) n = parseInt(s, 16);
            else if (/^[x0-9^+]+$/i.test(s)) {
                n = 0;
                s.toLowerCase().split('+').forEach(function (term) {
                    var m = /^(?:x(?:\^(\d+))?|1|0)$/.exec(term);
                    if (!m) Calc.fail('Cannot read the term "' + term + '": use terms like x^7, x and 1.', field);
                    if (term === '0') return;
                    var e = term === '1' ? 0 : m[1] ? parseInt(m[1], 10) : 1;
                    if (e > 7) Calc.fail('A byte is a polynomial of degree at most 7 (x^' + e + ' is too large).', field);
                    n ^= 1 << e;
                });
            } else Calc.fail('Write the byte in hex (57), binary (0b01010111) or as a polynomial (x^6 + x + 1).', field);
            if (n > 255) Calc.fail('A byte is at most FF (255); this one is ' + n.toString(16).toUpperCase() + '.', field);
            return n;
        }
        function forms(rows) { return rows.map(function (r) { return [r[0], '$\\{\\texttt{' + hex(r[1]) + '}\\}$', '$\\texttt{' + bin(r[1]) + '}$', '$' + ptex(r[1]) + '$']; }); }
        var a = parse(v.a, 'a'), b = null, head = ['', 'Hex', 'Binary', 'Polynomial'];
        if (v._action !== 'inv') {
            if (!String(v.b || '').trim()) Calc.fail('Please enter the second byte b.', 'b');
            b = parse(v.b, 'b');
        }
        S.step('The bytes as polynomials').p('A byte $b_7 b_6 \\ldots b_0$ stands for the polynomial $b_7 x^7 + \\ldots + b_1 x + b_0$ with coefficients in $\\mathbb{F}_2 = \\{0, 1\\}$. The field is $\\mathbb{F}_2[x] / (m(x))$ with the AES modulus $m(x) = x^8 + x^4 + x^3 + x + 1$ ($\\{\\texttt{11B}\\}$), which is irreducible.')
            .table(head, forms(b === null ? [['$a$', a]] : [['$a$', a], ['$b$', b]]));

        if (v._action === 'add') {
            var sum = a ^ b;
            S.step('Add the coefficients modulo 2: bitwise XOR').p('In characteristic 2, $1 + 1 = 0$, so addition is the exclusive or of the bits (and subtraction is the same operation). No reduction is ever needed.')
                .table(['', 'Binary', 'Polynomial'], [['$a$', '$\\texttt{' + bin(a) + '}$', '$' + ptex(a) + '$'], ['$b$', '$\\texttt{' + bin(b) + '}$', '$' + ptex(b) + '$'], [{ v: '$a \\oplus b$', hl: true }, { v: '$\\texttt{' + bin(sum) + '}$', hl: true }, { v: '$' + ptex(sum) + '$', hl: true }]], { mono: true });
            S.result(['$\\{\\texttt{' + hex(a) + '}\\} \\oplus \\{\\texttt{' + hex(b) + '}\\} = \\{\\texttt{' + hex(sum) + '}\\}$'], { copy: hex(sum) });
            return;
        }
        if (v._action === 'mul') {
            var rows = [], acc = 0, cur = a;
            for (var i = 0; i < 8; i++) {
                var how;
                if (i === 0) how = '$a$';
                else {
                    var prev = cur, top = prev & 0x80;
                    cur = ((prev << 1) & 0xFF) ^ (top ? 0x1B : 0);
                    how = top ? 'shift ' + '$\\texttt{' + bin(prev) + '}$, top bit was 1: XOR $\\{\\texttt{1B}\\}$' : 'shift $\\texttt{' + bin(prev) + '}$ left';
                }
                var bit = b >> i & 1;
                if (bit) acc ^= cur;
                rows.push(['$' + i + '$', how, '$\\{\\texttt{' + hex(cur) + '}\\}$', bit ? { v: '1', hl: true } : '0', bit ? '$\\{\\texttt{' + hex(acc) + '}\\}$' : '']);
            }
            var s1 = S.step('Multiply by shift and add (xtime)');
            s1.p('Write $b = \\sum b_i x^i$, so $a \\cdot b = \\sum_{b_i = 1} a \\cdot x^i$. Each $a \\cdot x^i$ comes from the previous one by xtime: shift left by one bit, and if a bit falls off the top ($x^8$ appears), replace $x^8$ by $x^4 + x^3 + x + 1$, that is XOR $\\{\\texttt{1B}\\}$. The powers for the bits of $b$ that are 1 are added (XOR).');
            s1.table(['$i$', 'How', '$a \\cdot x^i$', 'Bit $b_i$', 'Sum so far'], rows);
            var prod = acc;
            S.result(['$\\{\\texttt{' + hex(a) + '}\\} \\cdot \\{\\texttt{' + hex(b) + '}\\} = \\{\\texttt{' + hex(prod) + '}\\}$'], { copy: hex(prod) });
            /* the same product as polynomials: multiply, then reduce modulo m(x) */
            var c = clmul(a, b), s2 = S.step('Check: multiply the polynomials, then reduce modulo $m(x)$');
            s2.p('Without reduction the product has degree up to 14:');
            s2.math('(' + ptex(a) + ')(' + ptex(b) + ') = ' + ptex(c));
            var red = [], r = c;
            while (r && deg(r) >= 8) {
                var sh = deg(r) - 8, before = r;
                r ^= MOD << sh;
                red.push(['$x^{' + (sh + 8) + '}$', (sh === 0 ? '$m(x)$' : '$x^{' + sh + '} \\cdot m(x)$'), '$\\texttt{' + bin(before, 15) + '} \\oplus \\texttt{' + bin(MOD << sh, 15) + '} = \\texttt{' + bin(r, 15) + '}$']);
            }
            if (red.length) {
                s2.p('Long division by $m(x)$: cancel the highest term with a shifted copy of $m(x)$ (XOR), until the degree is below 8:');
                s2.table(['Highest term', 'Subtract', 'Bits'], red, { mono: true });
            } else s2.p('The degree is already below 8: no reduction needed.');
            s2.math('\\text{remainder} = ' + ptex(r) + ' = \\{\\texttt{' + hex(r) + '}\\}');
            s2.check(r === prod, 'Same result as shift and add');
            return;
        }
        /* inverse */
        if (a === 0) Calc.fail('0 has no inverse (AES maps 0 to 0 by convention in its S-box).', 'a');
        var r0 = MOD, r1 = a, t0 = 0, t1 = 1, tab = [['$0$', '$' + ptex(r0) + '$', '', '$0$'], ['$1$', '$' + ptex(r1) + '$', '', '$1$']], k = 1;
        while (r1 !== 0) {
            var d = pdiv(r0, r1), r2 = d.r, t2 = t0 ^ clmul(d.q, t1);
            tab[tab.length - 1][2] = '$' + ptex(d.q) + '$';
            k++;
            tab.push(['$' + k + '$', '$' + ptex(r2) + '$', '', '$' + ptex(t2) + '$']);
            r0 = r1; r1 = r2; t0 = t1; t1 = t2;
        }
        var inv = t0;
        tab[tab.length - 2][1] = { v: tab[tab.length - 2][1], hl: true };
        tab[tab.length - 2][3] = { v: tab[tab.length - 2][3], hl: true };
        var si = S.step('Extended Euclidean algorithm on $m(x)$ and $a(x)$');
        si.p('The same table as for numbers, with polynomial division over $\\mathbb{F}_2$: every row keeps $r_i \\equiv t_i \\cdot a \\pmod{m(x)}$, $q_i$ is the quotient of $r_{i-1}$ by $r_i$, and $t_{i+1} = t_{i-1} - q_i t_i$ (minus is plus here). $m(x)$ is irreducible, so the last non-zero remainder is 1 and its $t$ is the inverse.');
        si.table(['$i$', '$r_i$', '$q_i$', '$t_i$'], tab);
        S.result(['$\\{\\texttt{' + hex(a) + '}\\}^{-1} = \\{\\texttt{' + hex(inv) + '}\\}$'], { copy: hex(inv) });
        var chk = gmul(a, inv);
        S.step('Check').check(chk === 1, '$\\{\\texttt{' + hex(a) + '}\\} \\cdot \\{\\texttt{' + hex(inv) + '}\\} = \\{\\texttt{' + hex(chk) + '}\\}$')
            .p('The multiplicative group has $255$ elements, so also $a^{-1} = a^{254}$.');
        /* the AES S-box: affine map of the inverse */
        function rotl(x, n) { return ((x << n) | (x >> (8 - n))) & 0xFF; }
        var sb = inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63;
        S.step('Bonus: the AES S-box value').p('AES SubBytes takes the inverse and applies an affine map over $\\mathbb{F}_2$: $s = b \\oplus (b \\lll 1) \\oplus (b \\lll 2) \\oplus (b \\lll 3) \\oplus (b \\lll 4) \\oplus \\{\\texttt{63}\\}$, with $b = a^{-1}$ and $\\lll$ a rotation of the 8 bits.')
            .table(['', 'Binary'], [[ '$b$', '$\\texttt{' + bin(inv) + '}$'], ['$b \\lll 1$', '$\\texttt{' + bin(rotl(inv, 1)) + '}$'], ['$b \\lll 2$', '$\\texttt{' + bin(rotl(inv, 2)) + '}$'], ['$b \\lll 3$', '$\\texttt{' + bin(rotl(inv, 3)) + '}$'], ['$b \\lll 4$', '$\\texttt{' + bin(rotl(inv, 4)) + '}$'], ['$\\{\\texttt{63}\\}$', '$\\texttt{01100011}$'], [{ v: 'XOR of all', hl: true }, { v: '$\\texttt{' + bin(sb) + '} = \\{\\texttt{' + hex(sb) + '}\\}$', hl: true }]], { mono: true });
        S.note('AES S-box: $S(\\{\\texttt{' + hex(a) + '}\\}) = \\{\\texttt{' + hex(sb) + '}\\}$.');
    }
});
