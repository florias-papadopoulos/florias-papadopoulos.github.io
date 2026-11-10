/* Toolbox: Base58 with the Bitcoin alphabet: the bytes as one big number, divided by 58 again and again. */
Calc.tool({
    id: 'base58',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text (or hex), or Base58 to decode', rows: 3, optional: true, maxLength: 4000, placeholder: 'Hello World!' },
        { id: 'form', type: 'select', label: 'Bytes are', value: 'text', options: [['text', 'Text (UTF-8)'], ['hex', 'Hex digits']], help: 'What you type to encode, or how the decoded bytes are shown.' }
    ],
    actions: [{ id: 'enc', label: 'Encode' }, { id: 'dec', label: 'Decode' }],
    examples: [{ input: 'Hello World!', form: 'text' }, { input: '00 00 28 7f b4 cd', form: 'hex' }, { input: '2NEpo7TZRRrLZSi2U', form: 'text', _action: 'dec' }, { input: '1BoatSLRHtKNngkdXEeobR76b53LETtpyT', form: 'hex', _action: 'dec' }],
    run: function (v, S) {
        var E = Calc.lib.enc, T = Calc.tex;
        var A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        if (v._action === 'dec') return decode();

        var bytes = E.bytesStep(S, v.input, v.form, 'input');
        if (bytes.length > 1000) Calc.fail('At most 1000 bytes: Base58 works on one big number and gets slow (quadratic) for long data.', 'input');
        var z = 0;
        while (z < bytes.length && bytes[z] === 0) z++;
        var rest = bytes.slice(z), N = E.bytesToBig(rest);
        var digits = [], rows = [], x = N;
        while (x > 0n) { var q = x / 58n, r = x % 58n; rows.push(['$' + T(x) + '$', '$' + T(q) + '$', { v: '$' + r + '$', hl: true }, A.charAt(Number(r))]); digits.unshift(A.charAt(Number(r))); x = q; }
        var out = E.pad('', z, '1') + digits.join('');
        S.result(bytes.length ? out : '(empty)', { copy: out, label: 'Base58' });
        if (!bytes.length) return;
        var s0 = S.step('Count the leading zero bytes');
        s0.p(z ? 'The data starts with ' + z + ' zero byte' + (z === 1 ? '' : 's') + '. As a number they would vanish (leading zeros), so each one is written as a 1, the character for 0.' : 'There is no leading zero byte.');
        if (!rest.length) { s0.p('All bytes are zero, so the output is only 1s.'); return; }
        var s1 = S.step('Read the other bytes as one big number');
        s1.p('Big-endian: the first byte is the most significant, so $N = \\sum_i b_i \\cdot 256^{k-1-i}$ for the $k = ' + rest.length + '$ bytes. In hex the bytes simply stand side by side:');
        s1.math('N = \\mathtt{' + E.hex(rest, '') + '}_{16} = ' + T(N));
        var s2 = S.step('Divide by 58 again and again');
        s2.p('Each remainder is one Base58 digit, from the last digit to the first; stop when the quotient is 0.');
        s2.table(['$N$', '$\\lfloor N / 58 \\rfloor$', 'Remainder', 'Character'], rows, { mono: true });
        var s3 = S.step('Read the remainders from the bottom up');
        s3.p(z ? z + ' times 1 for the zero bytes, then the digits:' : 'The digits from the last remainder to the first:');
        s3.pre(out);
        s3.p('The alphabet is 1-9, A-Z and a-z without 0, O, I and l, which look alike: ' + A + '.');

        function decode() {
            var src = v.input.trim();
            for (var i = 0; i < src.length; i++) {
                var c = Calc.chr(src, i);
                if (A.indexOf(c) < 0) Calc.fail('"' + c + '" (position ' + (i + 1) + ') is not a Base58 character' + (/[0OIl]/.test(c) ? ': 0, O, I and l are left out of the alphabet on purpose.' : '.'), 'input');
            }
            if (src.length > 1400) Calc.fail('At most 1400 characters.', 'input');
            var z1 = 0;
            while (z1 < src.length && src.charAt(z1) === '1') z1++;
            var N2 = 0n, rows2 = [];
            for (var k = z1; k < src.length; k++) {
                var d = BigInt(A.indexOf(src.charAt(k))), prev = N2;
                N2 = N2 * 58n + d;
                rows2.push([src.charAt(k), '$' + d + '$', '$' + T(prev) + ' \\cdot 58 + ' + d + '$', { v: '$' + T(N2) + '$', hl: k === src.length - 1 }]);
            }
            var bytes = new Array(z1).fill(0).concat(N2 > 0n ? E.bigToBytes(N2) : []);
            var t0 = S.step('Leading 1s are zero bytes');
            t0.p(z1 ? 'The text starts with ' + z1 + ' time' + (z1 === 1 ? '' : 's') + ' 1, so the bytes start with ' + z1 + ' zero byte' + (z1 === 1 ? '' : 's') + '.' : 'The text does not start with 1, so there is no leading zero byte.');
            if (rows2.length) {
                var t1 = S.step('Read the other characters as one number in base 58');
                t1.p('Each character is its position in the alphabet (1 = 0, 2 = 1, ..., z = 57). Horner\'s rule: multiply by 58 and add the next digit.');
                t1.table(['Character', 'Value', 'Computation', 'Number so far'], rows2, { mono: true });
                var t2 = S.step('Write the number in base 256');
                t2.p('Its bytes, big-endian, are the hex digits in pairs:');
                t2.math(T(N2) + ' = \\mathtt{' + E.hex(E.bigToBytes(N2), '') + '}_{16}');
            }
            if (v.form === 'hex') { var h = E.hex(bytes); S.result(bytes.length ? h : '(empty)', { copy: h, label: 'Bytes (hex)' }); return; }
            var dd = E.textStep(S, bytes);
            S.result(bytes.length ? Calc.esc(dd.text) : '(empty)', { copy: dd.text, label: 'Text' });
            if (dd.errors) S.note('These bytes are not UTF-8 text (Bitcoin addresses and keys are binary). Choose "Hex digits" to see the bytes.');
        }
    }
});
