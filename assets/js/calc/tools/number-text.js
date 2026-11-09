/* Toolbox: text to one big integer through its UTF-8 bytes (big-endian, as in textbook RSA) and back, also from hex. */
Calc.tool({
    id: 'number-text',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text, or a number to turn into text', rows: 3, optional: true, maxLength: 5000, placeholder: 'Hi', help: 'A number may be decimal or hex with 0x (expressions like 2^64 + 1 work too).' },
        { id: 'out', type: 'select', label: 'Write the number in', value: 'dec', options: [['dec', 'Decimal'], ['hex', 'Hexadecimal']] }
    ],
    actions: [{ id: 'toNum', label: 'Text to number' }, { id: 'toText', label: 'Number to text' }],
    examples: [{ input: 'Hi', out: 'dec' }, { input: '18537', _action: 'toText' }, { input: 'attack at dawn', out: 'dec' }, { input: '0x48656c6c6f2c20f09f8c8d', _action: 'toText' }],
    run: function (v, S) {
        var E = Calc.lib.enc, T = Calc.tex;
        if (v._action === 'toText') return toText();
        var bytes = E.bytesStep(S, v.input, 'text', 'input');
        if (!bytes.length) { S.result('$0$', { copy: '0', label: 'Number' }); S.note('The empty text has no bytes; by convention it is the number 0.'); return; }
        var m = E.bytesToBig(bytes), k = bytes.length, hex = E.hex(bytes, '').toLowerCase();
        var res = v.out === 'hex' ? '0x' + hex.replace(/^0+(?=.)/, '') : String(m);
        S.result(v.out === 'hex' ? '$\\mathtt{' + res + '}$' : '$' + T(m) + '$', { copy: res, label: 'Number (' + k + ' byte' + (k === 1 ? '' : 's') + ', ' + Calc.lib.nt.bitLength(m) + ' bits)' });
        var s1 = S.step('Read the bytes as one number in base 256');
        s1.p('Big-endian: the first byte is the most significant digit, so $m = \\sum_{i=0}^{k-1} b_i \\cdot 256^{k-1-i}$ with $k = ' + k + '$.');
        if (k <= 6) s1.math('m = ' + bytes.map(function (b, i) { var e = k - 1 - i; return b + (e ? ' \\cdot 256^{' + e + '}' : ''); }).join(' + ') + ' = ' + T(m));
        var rows = [], acc = 0n;
        bytes.forEach(function (b, i) { var prev = acc; acc = acc * 256n + BigInt(b); rows.push([i + 1, E.hex2(b), b, '$' + T(prev) + ' \\cdot 256 + ' + b + '$', { v: '$' + T(acc) + '$', hl: i === k - 1 }]); });
        s1.p('Horner\'s rule does it one byte at a time: multiply by 256, add the next byte.');
        s1.table(['Byte', 'Hex', 'Value', 'Computation', 'Number so far'], rows, { mono: true });
        var s2 = S.step('In hex it is just the bytes side by side');
        s2.p('256 is $16^2$, so every byte is two hex digits of the number:');
        s2.math('m = \\mathtt{0x' + hex + '} = ' + T(m));
        S.note('In textbook RSA this $m$ is the message, and it must be smaller than the modulus $N$ (here at least ' + Calc.lib.nt.bitLength(m) + ' bits). Real RSA first pads the message (OAEP).');

        function toText() {
            var src = v.input.trim(), n;
            if (!src) Calc.fail('Please enter a number.', 'input');
            try { n = Calc.int(src.replace(/^0X/, '0x')); } catch (e) { if (e instanceof Calc.UserError) Calc.fail(e.message, 'input'); throw e; }
            if (n < 0n) Calc.fail('A negative number has no bytes: only numbers 0 and up.', 'input');
            if (Calc.lib.nt.bitLength(n) > 40000) Calc.fail('At most 5000 bytes (40000 bits).', 'input');
            var bytes = n === 0n ? [] : E.bigToBytes(n);
            var s = S.step('Write the number in base 256');
            if (n === 0n) s.p('The number 0 has no bytes (or a single zero byte, which is the NUL character): the text is empty.');
            else {
                s.p('Divide by 256 again and again; the remainders are the bytes, last byte first.');
                var rows = [], x = n;
                while (x > 0n) { rows.push(['$' + T(x) + '$', '$' + T(x / 256n) + '$', { v: String(x % 256n), hl: true }, E.hex2(Number(x % 256n))]); x /= 256n; }
                s.table(['Number', 'Divided by 256', 'Remainder', 'Hex'], rows, { mono: true });
                s.p('From the bottom up: ' + E.hex(bytes) + '. (In hex, simply cut the digits into pairs from the right.)');
            }
            var d = E.textStep(S, bytes);
            S.result(bytes.length ? Calc.esc(d.text) : '(empty)', { copy: d.text, label: 'Text' });
            if (d.errors) S.note('These bytes are not valid UTF-8, so this number does not come from a text (shown with replacement characters).');
        }
    }
});
