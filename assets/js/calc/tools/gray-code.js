/* Toolbox: binary to Gray code (b XOR b >> 1) and back (prefix XOR from the top bit), and the table for n bits. */
Calc.tool({
    id: 'gray-code',
    live: true,
    inputs: [
        { id: 'dir', type: 'select', label: 'Convert', value: 'b2g', options: [['b2g', 'Binary to Gray code'], ['g2b', 'Gray code to binary'], ['table', 'Table of all n-bit codes']] },
        { id: 'x', type: 'text', label: 'Number', width: 'l', placeholder: '1011', when: { dir: ['b2g', 'g2b'] } },
        { id: 'fmt', type: 'select', label: 'Written in', value: 'bin', when: { dir: ['b2g', 'g2b'] }, options: [['bin', 'Binary digits'], ['dec', 'Decimal']] },
        { id: 'n', type: 'int', label: 'Bits $n$', value: '3', min: 1, max: 10, when: { dir: 'table' } }
    ],
    examples: [{ dir: 'b2g', x: '1011', fmt: 'bin' }, { dir: 'g2b', x: '1110', fmt: 'bin' }, { dir: 'table', n: '3' }, { dir: 'b2g', x: '2026', fmt: 'dec' }],
    run: function (v, S) {
        var E = Calc.lib.enc;
        function gray(b) { return b ^ (b >> 1n); }
        function ungray(g) { var b = g; for (var s = g >> 1n; s > 0n; s >>= 1n) b ^= s; return b; }
        if (v.dir === 'table') {
            var n = Number(v.n), N = 1 << n, rows = [], codes = [];
            for (var k = 0; k < N; k++) {
                var g = Number(gray(BigInt(k))), gs = E.bin(g, n), prev = k ? Number(gray(BigInt(k - 1))) : null;
                var ch = prev === null ? '' : 'bit ' + Math.log2(g ^ prev);
                codes.push(gs);
                rows.push([k, E.bin(k, n), { v: gs, hl: true }, ch]);
            }
            S.result(Calc.esc(codes.join(' ')), { copy: codes.join(' '), label: 'Gray codes, ' + n + ' bit' + (n === 1 ? '' : 's') });
            var t = S.step('Compute $g = k \\oplus (k \\gg 1)$ for $k = 0, \\ldots, ' + (N - 1) + '$');
            t.p('Next to each code, the bit that changed from the row above: always exactly one.');
            t.table(['$k$', 'Binary', 'Gray', 'Changed'], rows, { mono: true });
            var r = S.step('The reflection');
            r.p('The same list can be built by reflecting: take the list for ' + (n - 1) + ' bit' + (n === 2 ? '' : 's') + (n === 1 ? ' (one empty code)' : '') + ', write it once forwards with a 0 in front and once backwards with a 1 in front. That is why it is called the reflected binary code.');
            r.check(true, 'The last code, ' + codes[N - 1] + ', also differs from the first, ' + codes[0] + ', in one bit: the code is cyclic.');
            return;
        }
        var src = String(v.x).trim(), x, w;
        if (v.fmt === 'dec') {
            if (!/^\d+$/.test(src)) Calc.fail('A decimal number that is not negative, please.', 'x');
            x = BigInt(src);
            w = Math.max(1, x.toString(2).length);
        } else {
            var b = E.parseBits(src, 'x');
            if (!b.length) Calc.fail('Please enter some bits.', 'x');
            x = BigInt('0b' + b);
            w = b.length;
        }
        if (w > 4096) Calc.fail('At most 4096 bits.', 'x');
        var out = v.dir === 'b2g' ? gray(x) : ungray(x), outs = E.bin(out, w), xs = E.bin(x, w);
        var lines = ['$\\mathtt{' + outs + '}$'];
        if (v.fmt === 'dec') lines.push('$= ' + Calc.tex(out) + '$ in decimal');
        S.result(lines, { copy: v.fmt === 'dec' ? String(out) : outs, label: v.dir === 'b2g' ? 'Gray code' : 'Binary' });
        function rowsGrid(s, rows) {
            if (w <= 32) {
                var head = [''];
                for (var i = w - 1; i >= 0; i--) head.push(String(i));
                s.table(head, rows.map(function (r, ri) { return [r[0]].concat(r[1].split('').map(function (c) { return ri === rows.length - 1 ? { v: c, hl: true } : c; })); }), { mono: true });
            } else s.table(['', 'Bits'], rows.map(function (r) { return [r[0], E.group(r[1], 4, true)]; }), { mono: true });
        }
        if (v.fmt === 'dec') S.step('Write the number in binary').math(Calc.tex(x) + ' = ' + xs + '_2');
        if (v.dir === 'b2g') {
            var s = S.step('XOR the number with itself shifted right by one');
            s.p('Each Gray bit is the XOR of a binary bit and the bit to its left: $g_i = b_i \\oplus b_{i+1}$. The top bit stays as it is.');
            rowsGrid(s, [['$b$', xs], ['$b \\gg 1$', E.bin(x >> 1n, w)], ['$g$', outs]]);
            var c = S.step('Check: back to binary');
            c.check(ungray(out) === x, 'Converting ' + outs + ' back gives ' + xs);
        } else {
            var s2 = S.step('XOR from the top bit down');
            s2.p('Undo it from the left: the top bit stays, and each next binary bit is the previous binary bit XOR the Gray bit, $b_i = b_{i+1} \\oplus g_i$. So $b_i$ is the XOR of all Gray bits from the top down to $i$ (a prefix XOR), and $b = g \\oplus (g \\gg 1) \\oplus (g \\gg 2) \\oplus \\cdots$.');
            var rows = [], prev = 0;
            for (var i = 0; i < w; i++) {
                var gi = Number(xs.charAt(i)), bi = prev ^ gi;
                rows.push([w - 1 - i, gi, i ? prev : '(none)', { v: bi, hl: true }]);
                prev = bi;
            }
            s2.table(['Bit $i$', '$g_i$', '$b_{i+1}$', '$b_i$'], rows, { mono: true });
            rowsGrid(s2, [['$g$', xs], ['$b$', outs]]);
            var c2 = S.step('Check: back to Gray code');
            c2.check(gray(out) === x, 'Converting ' + outs + ' to Gray code gives ' + xs + ' again');
        }
    }
});
