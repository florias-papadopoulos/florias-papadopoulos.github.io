/* Toolbox: a signed integer to n-bit two's complement (invert and add one) and back, with the range check. */
Calc.tool({
    id: 'twos-complement',
    live: true,
    inputs: [
        { id: 'dir', type: 'select', label: 'Direction', value: 'to', options: [['to', 'Integer to bits'], ['from', 'Bits to integer']] },
        { id: 'x', type: 'text', label: 'Integer', placeholder: '-42', when: { dir: 'to' } },
        { id: 'w', type: 'text', label: 'Width in bits', placeholder: '8', value: '8', when: { dir: 'to' } },
        { id: 'bits', type: 'text', label: 'Bits (or hex with 0x)', width: 'l', placeholder: '11010110', when: { dir: 'from' }, help: 'The number of digits is the width: 0x hex counts 4 bits per digit.' }
    ],
    examples: [{ dir: 'to', x: '-42', w: '8' }, { dir: 'from', bits: '11010110' }, { dir: 'to', x: '100', w: '8' }, { dir: 'to', x: '-1', w: '16' }, { dir: 'from', bits: '0x80000000' }, { dir: 'to', x: '-128', w: '8' }],
    run: function (v, S) {
        var E = Calc.lib.enc, T = Calc.tex, nt = Calc.lib.nt;
        function num(s, f) { try { return Calc.int(s); } catch (e) { if (e instanceof Calc.UserError) Calc.fail(e.message, f); throw e; } }
        function grid(s, rows, n) {
            if (n <= 32) {
                var head = [''];
                for (var i = n - 1; i >= 0; i--) head.push(i === n - 1 ? 'sign' : String(i));
                s.table(head, rows.map(function (r) { return [r[0]].concat(r[1].split('').map(function (c) { return r[2] ? { v: c, hl: true } : c; })); }), { mono: true });
            } else s.table(['', 'Bits'], rows.map(function (r) { return [r[0], r[2] ? { v: E.group(r[1], 4, true), hl: true } : E.group(r[1], 4, true)]; }), { mono: true });
        }
        function range(s, n) {
            var lo = -(1n << BigInt(n - 1)), hi = (1n << BigInt(n - 1)) - 1n;
            s.p('With ' + n + ' bits the top bit counts $-2^{' + (n - 1) + '}$ instead of $+2^{' + (n - 1) + '}$, so the numbers go from $' + T(lo) + '$ to $' + T(hi) + '$.');
            return [lo, hi];
        }
        function flip(b) { return b.split('').map(function (c) { return c === '1' ? '0' : '1'; }).join(''); }
        if (v.dir === 'from') return back();

        var x = num(v.x, 'x'), wn = num(v.w, 'w');
        if (wn < 1n || wn > 4096n) Calc.fail('The width must be between 1 and 4096 bits.', 'w');
        var n = Number(wn);
        var s0 = S.step('Check the range');
        var lh = range(s0, n);
        var ok = x >= lh[0] && x <= lh[1];
        s0.check(ok, '$' + T(lh[0]) + ' \\le ' + T(x) + ' \\le ' + T(lh[1]) + '$');
        if (!ok) {
            var needed = x < 0n ? nt.bitLength(-x - 1n) + 1 : nt.bitLength(x) + 1;
            Calc.fail(x + ' does not fit in ' + n + ' bits of two\'s complement (from ' + lh[0] + ' to ' + lh[1] + '). It needs at least ' + needed + ' bits.', 'x');
        }
        var u = x < 0n ? (1n << BigInt(n)) + x : x, bits = E.bin(u, n);
        S.result(['$\\mathtt{' + E.group(bits, 4, true).replace(/ /g, '\\ ') + '}$', '$\\text{hex } \\mathtt{' + E.pad(u.toString(16).toUpperCase(), Math.ceil(n / 4)) + '}$'], { copy: bits, label: String(x) + ' in ' + n + ' bits' });
        if (x >= 0n) {
            var s1 = S.step('A number that is not negative: plain binary');
            s1.p('Write ' + x + ' in binary and fill with zeros on the left up to ' + n + ' bits. The sign bit is 0.');
            grid(s1, [[T(x), bits, true]], n);
        } else {
            var m = -x, mb = E.bin(m, n), inv = flip(mb);
            var s2 = S.step('Write the absolute value $' + T(m) + '$ in binary');
            grid(s2, [['$' + T(m) + '$', mb, false]], n);
            var s3 = S.step('Invert every bit, then add one');
            s3.p('Inverting gives $(2^{' + n + '} - 1) - ' + T(m) + '$; adding 1 makes it $2^{' + n + '} - ' + T(m) + '$, the two\'s complement.');
            var carry = [], c = 1, sum = '';
            for (var i = n - 1; i >= 0; i--) { var d = (inv.charAt(i) === '1' ? 1 : 0) + c; sum = (d & 1) + sum; carry.unshift(c ? '1' : ''); c = d >> 1; }
            grid(s3, [['Inverted', inv, false], ['+ 1', E.pad('1', n), false], ['Result', sum, true]], n);
            var cs = carry.filter(Boolean).length;
            s3.p(cs > 1 ? 'The inverted number ends in ' + (cs - 1) + ' one' + (cs === 2 ? '' : 's') + ': adding 1 turns ' + (cs === 2 ? 'it' : 'them') + ' into 0 with a carry, and the carry stops at the first 0.' : 'The inverted number ends in 0, so adding 1 just sets that bit (no carry).');
            var s4 = S.step('Shortcut');
            s4.p('The same in one line: $2^{' + n + '} - ' + T(m) + ' = ' + T(u) + '$, and that is ' + bits + ' in binary.');
            if (m === (1n << BigInt(n - 1))) s4.p('The smallest number, $' + T(x) + '$, is its own complement: its negation $' + T(m) + '$ does not fit in ' + n + ' bits.');
        }
        var ck = S.step('Check: read the bits back');
        var top = bits.charAt(0) === '1' ? -(1n << BigInt(n - 1)) : 0n, rest = BigInt('0b' + (bits.slice(1) || '0'));
        ck.math((top ? '-2^{' + (n - 1) + '}' : '0') + ' + ' + T(rest) + ' = ' + T(top + rest));
        ck.check(top + rest === x, 'The bits stand for ' + T(x));

        function back() {
            var src = String(v.bits).trim(), b;
            if (/^0x/i.test(src)) {
                var h = src.slice(2).replace(/[\s_]/g, '');
                if (!h || /[^0-9a-f]/i.test(h)) Calc.fail('After 0x only hex digits 0-9, A-F.', 'bits');
                b = h.split('').map(function (d) { return E.bin(parseInt(d, 16), 4); }).join('');
            } else b = E.parseBits(src, 'bits');
            if (!b.length) Calc.fail('Please enter some bits.', 'bits');
            if (b.length > 4096) Calc.fail('At most 4096 bits.', 'bits');
            var n = b.length, ub = BigInt('0b' + b), val;
            var s0 = S.step('The width is ' + n + ' bits');
            range(s0, n);
            if (b.charAt(0) === '0') {
                val = ub;
                var s1 = S.step('The sign bit is 0: a number that is not negative');
                s1.p('Read the bits as ordinary binary:');
                s1.math(b + '_2 = ' + T(val));
            } else {
                var inv = flip(b), mag = BigInt('0b' + inv) + 1n;
                val = -mag;
                var s2 = S.step('The sign bit is 1: a negative number');
                s2.p('Its absolute value is found the same way as the complement: invert every bit and add one.');
                grid(s2, [['Bits', b, false], ['Inverted', inv, false], ['+ 1', E.bin(mag, n).slice(-n), true]], n);
                s2.p('That is $' + T(mag) + '$, so the number is $' + T(val) + '$.');
                var s3 = S.step('Or with the weight of the sign bit');
                s3.math('-2^{' + (n - 1) + '} + ' + T(ub - (1n << BigInt(n - 1))) + ' = ' + T(val));
                s3.p('Read as unsigned the same bits are $' + T(ub) + '$, which is $2^{' + n + '} + (' + T(val) + ')$.');
            }
            S.result('$' + T(val) + '$', { copy: String(val), label: n + '-bit two\'s complement' });
        }
    }
});
