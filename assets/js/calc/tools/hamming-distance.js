/* Toolbox: the Hamming distance between two strings, bit strings or hex values, with the differing positions marked. */
Calc.tool({
    id: 'hamming-distance',
    live: true,
    inputs: [
        { id: 'a', type: 'text', label: 'First', width: 'l', placeholder: 'karolin', maxLength: 20000 },
        { id: 'b', type: 'text', label: 'Second', width: 'l', placeholder: 'kathrin', maxLength: 20000 },
        { id: 'mode', type: 'select', label: 'Compare', value: 'text', options: [['text', 'Characters of two texts'], ['textbits', 'Bits of two texts (UTF-8)'], ['bits', 'Two bit strings'], ['hex', 'Two hex values, bit by bit']] }
    ],
    examples: [{ a: 'karolin', b: 'kathrin', mode: 'text' }, { a: '1011101', b: '1001001', mode: 'bits' }, { a: '0x2F', b: '0x3A', mode: 'hex' }, { a: 'this is a test', b: 'wokka wokka!!!', mode: 'textbits' }],
    run: function (v, S) {
        var E = Calc.lib.enc, A, B, unit;
        function hexBits(s, f) {
            var h = String(s).replace(/0x/gi, '').replace(/[\s:_]/g, '');
            if (!h) Calc.fail('Please enter a hex value.', f);
            var m = /[^0-9a-f]/iu.exec(h);
            if (m) Calc.fail('"' + m[0] + '" is not a hex digit (only 0-9 and A-F).', f);
            return h.toUpperCase().split('').map(function (d) { return E.bin(parseInt(d, 16), 4); }).join('').split('');
        }
        if (v.mode === 'text') {
            A = E.codePoints(v.a); B = E.codePoints(v.b); unit = 'character';
        } else if (v.mode === 'bits') {
            A = E.parseBits(v.a, 'a').split(''); B = E.parseBits(v.b, 'b').split(''); unit = 'bit';
            if (!A.length) Calc.fail('Please enter some bits.', 'a');
            if (!B.length) Calc.fail('Please enter some bits.', 'b');
        } else if (v.mode === 'textbits') {
            var ta = E.utf8(v.a), tb = E.utf8(v.b);
            if (ta.length !== tb.length) Calc.fail('The two texts must have the same number of UTF-8 bytes: ' + ta.length + ' and ' + tb.length + '.', 'b');
            A = ta.map(function (x) { return E.bin(x); }).join('').split(''); B = tb.map(function (x) { return E.bin(x); }).join('').split(''); unit = 'bit';
        } else { A = hexBits(v.a, 'a'); B = hexBits(v.b, 'b'); unit = 'bit'; }
        if (A.length !== B.length) Calc.fail('The Hamming distance needs two inputs of the same length: ' + A.length + ' and ' + B.length + ' ' + unit + 's' + (v.mode === 'hex' ? ' (pad the shorter one with leading zeros)' : '') + '.', 'b');
        var n = A.length, diff = [];
        function same(i) { return v.mode === 'text' ? A[i].cp === B[i].cp : A[i] === B[i]; }
        function cell(x) { return v.mode === 'text' ? E.show(x.cp, x.ch) : x; }
        for (var i = 0; i < n; i++) if (!same(i)) diff.push(i);
        var d = diff.length;
        S.result('$d = ' + d + '$', { copy: String(d), label: 'Hamming distance' });
        S.note(n ? d + ' of ' + n + ' ' + unit + 's differ (' + (100 * d / n).toFixed(1).replace(/\.0$/, '') + '%).' : 'Both inputs are empty.');
        var s1 = S.step('Line up the two ' + (v.mode === 'hex' ? 'values in binary' : 'inputs') + ' and compare position by position');
        if (v.mode === 'hex') s1.p('Each hex digit is 4 bits, so the values are compared as ' + n + ' bits.');
        if (v.mode === 'textbits') s1.p('Both texts are encoded in UTF-8 and compared as ' + n + ' bits (' + n / 8 + ' bytes of 8 bits).');
        s1.p('Positions are counted from 1 on the left. A highlighted column differs.');
        var W = 32, chunks = Math.min(Math.ceil(n / W), 8);
        for (var c = 0; c < chunks; c++) {
            var head = ['Position'], ra = ['First'], rb = ['Second'], rd = ['Differs'];
            for (var j = c * W; j < Math.min(n, (c + 1) * W); j++) {
                var df = !same(j);
                head.push(String(j + 1));
                ra.push(df ? { v: cell(A[j]), hl: true } : cell(A[j]));
                rb.push(df ? { v: cell(B[j]), hl: true } : cell(B[j]));
                rd.push(df ? { v: '1', hl: true } : '');
            }
            s1.table(head, [ra, rb, rd], { mono: true });
        }
        if (n > 8 * W) s1.p('The first ' + 8 * W + ' positions are shown.');
        var s2 = S.step('Count the differences');
        s2.p(d ? 'They differ at position' + (d === 1 ? ' ' : 's ') + diff.slice(0, 60).map(function (k) { return k + 1; }).join(', ') + (d > 60 ? ', ...' : '') + '.' : 'They agree everywhere.');
        s2.math('d = ' + d);
        if (v.mode !== 'text') {
            var x = BigInt('0b' + A.join('')) ^ BigInt('0b' + B.join('')), xs = E.bin(x, n);
            var s3 = S.step('The same with XOR');
            s3.p('For bits, the differing positions are exactly the 1 bits of $a \\oplus b$, so the distance is the number of ones in it (its weight, or popcount):');
            s3.pre(E.group(xs, 4) + (v.mode === 'hex' ? '   (hex ' + E.pad(x.toString(16).toUpperCase(), n / 4) + ')' : v.mode === 'textbits' ? '   (bytes ' + E.hex(E.bigToBytes(x, n / 8)) + ')' : ''));
            s3.check(xs.split('').filter(function (b) { return b === '1'; }).length === d, 'The XOR has ' + d + ' one' + (d === 1 ? '' : 's'));
        }
    }
});
