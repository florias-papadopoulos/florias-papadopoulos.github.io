/* Toolbox: Base32 (RFC 4648) encoding and decoding, 5 bytes to 8 characters of 5 bits, also the base32hex alphabet. */
Calc.tool({
    id: 'base32',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text (or hex), or Base32 to decode', rows: 3, optional: true, maxLength: 30000, placeholder: 'foobar' },
        { id: 'form', type: 'select', label: 'Bytes are', value: 'text', options: [['text', 'Text (UTF-8)'], ['hex', 'Hex digits']], help: 'What you type to encode, or how the decoded bytes are shown.' },
        { id: 'variant', type: 'select', label: 'Alphabet', value: 'std', options: [['std', 'Standard (A-Z, 2-7)'], ['hex', 'Extended hex (0-9, A-V)']] },
        { id: 'pad', type: 'check', label: 'Pad with =', value: true }
    ],
    actions: [{ id: 'enc', label: 'Encode' }, { id: 'dec', label: 'Decode' }],
    examples: [{ input: 'foobar', form: 'text', variant: 'std', pad: true }, { input: 'JBSWY3DPEE======', form: 'text', variant: 'std', pad: true, _action: 'dec' },
        { input: 'Hi', form: 'text', variant: 'hex', pad: true }, { input: '3d 2a 61 7f 00', form: 'hex', variant: 'std', pad: false }],
    run: function (v, S) {
        var E = Calc.lib.enc;
        var A = v.variant === 'hex' ? '0123456789ABCDEFGHIJKLMNOPQRSTUV' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        var CH = { 1: 2, 2: 4, 3: 5, 4: 7 }, PADS = { 2: 6, 4: 4, 5: 3, 7: 1 };
        function alphabetTable(s) {
            var head = ['']; for (var c = 0; c < 8; c++) head.push('+' + c);
            var rows = [];
            for (var r = 0; r < 4; r++) { var row = [String(8 * r)]; for (var k = 0; k < 8; k++) row.push(A.charAt(8 * r + k)); rows.push(row); }
            s.table(head, rows, { mono: true, caption: 'The alphabet: value $v$ is in the row of $8 \\lfloor v/8 \\rfloor$ and the column $v \\bmod 8$.' });
        }
        if (v._action === 'dec') return decode();

        var bytes = E.bytesStep(S, v.input, v.form, 'input');
        var out = '', rows = [];
        for (var i = 0; i < bytes.length; i += 5) {
            var blk = bytes.slice(i, i + 5), n = blk.length, nc = CH[n] || 8;
            var bits = blk.map(function (b) { return E.bin(b); }).join(''), fill = 5 * nc - bits.length;
            var all = bits + E.pad('', fill), vals = [];
            for (var j = 0; j < all.length; j += 5) vals.push(parseInt(all.substr(j, 5), 2));
            var chars = vals.map(function (x) { return A.charAt(x); }).join(''), padding = v.pad ? E.pad('', 8 - nc, '=') : '';
            out += chars + padding;
            rows.push([i / 5 + 1, E.hex(blk), E.group(bits, 8) + (fill ? ' + ' + E.pad('', fill) : ''), E.group(all, 5), vals.join(', '), { v: chars + padding, hl: true }]);
        }
        S.result(bytes.length ? out : '(empty)', { copy: out, label: 'Base32' });
        if (!bytes.length) return;
        var s = S.step('Cut the bytes into blocks of 5 and the bits into groups of 5');
        s.p('5 bytes are 40 bits, exactly 8 groups of 5 bits. A group of 5 bits is a number from 0 to 31, one character of the alphabet.');
        s.table(['Block', 'Bytes (hex)', 'Bits (8 each)', 'Groups (5 bits each)', 'Values', 'Characters'], rows, { mono: true });
        alphabetTable(S.step('Look up each value in the alphabet'));
        var r = bytes.length % 5, s3 = S.step('Padding at the end');
        if (!r) s3.p('The length, ' + bytes.length + ' bytes, is a multiple of 5: no padding is needed.');
        else s3.p('The last block has ' + r + ' byte' + (r === 1 ? '' : 's') + ' = ' + 8 * r + ' bits, which needs ' + CH[r] + ' characters (' + 5 * CH[r] + ' bits, so ' + (5 * CH[r] - 8 * r) + ' zero bits are added). ' + (v.pad ? 'The other ' + (8 - CH[r]) + ' places of the block of 8 are filled with =.' : 'Without padding the = signs are left out.'));
        s3.p(bytes.length + ' bytes become ' + out.length + ' characters: Base32 is 60% longer than the data, but uses only capital letters and digits, so it survives case-insensitive systems and is easy to type.');

        function decode() {
            var src = v.input.replace(/\s+/g, '').toUpperCase();
            var p = src.indexOf('='), body = p < 0 ? src : src.slice(0, p), padStr = p < 0 ? '' : src.slice(p);
            if (!/^=*$/.test(padStr)) Calc.fail('An = sign can only be padding at the very end.', 'input');
            for (var q = 0; q < body.length; q++) if (A.indexOf(body.charAt(q)) < 0) Calc.fail('"' + Calc.chr(body, q) + '" (position ' + (q + 1) + ') is not in this Base32 alphabet' + (v.variant === 'std' && /[01890]/.test(body.charAt(q)) ? ' (0, 1, 8 and 9 are left out so they cannot be confused with O, I and B)' : '') + '.', 'input');
            var last = body.length % 8;
            if (last && !PADS[last]) Calc.fail('A last group of ' + last + ' characters is impossible: only 2, 4, 5 or 7 characters can end a block.', 'input');
            if (padStr && (padStr.length !== (last ? PADS[last] : 0))) Calc.fail('Wrong padding: a last group of ' + last + ' characters needs ' + (last ? PADS[last] : 0) + ' = signs.', 'input');
            var bytes = [], rows = [], loose = false;
            for (var i = 0; i < body.length; i += 8) {
                var grp = body.slice(i, i + 8), vals = grp.split('').map(function (c) { return A.indexOf(c); });
                var bits = vals.map(function (x) { return E.bin(x, 5); }).join(''), nb = Math.floor(bits.length / 8), bs = [];
                for (var k = 0; k < nb; k++) bs.push(parseInt(bits.substr(8 * k, 8), 2));
                var rest = bits.slice(8 * nb);
                if (/1/.test(rest)) loose = true;
                Array.prototype.push.apply(bytes, bs);
                rows.push([grp, vals.join(', '), E.group(bits, 5), E.group(bits.slice(0, 8 * nb), 8) + (rest ? ' (drop ' + rest + ')' : ''), { v: E.hex(bs), hl: true }]);
            }
            var s = S.step('Look up each character and regroup the bits');
            s.p('Letters are read as capitals and spaces are ignored. Each character is a value from 0 to 31 (5 bits); eight of them give 40 bits, 5 bytes.' + (last ? ' The last group is shorter; its leftover bits (zeros) are dropped.' : ''));
            s.table(['Characters', 'Values', 'Bits (5 each)', 'Bytes (8 each)', 'Hex'], rows, { mono: true });
            if (loose) s.check(false, 'The dropped bits at the end are not all zero, so this is not canonical Base32 (accepted anyway).');
            alphabetTable(S.step('The alphabet used'));
            if (v.form === 'hex') { var h = E.hex(bytes); S.result(bytes.length ? h : '(empty)', { copy: h, label: 'Bytes (hex)' }); return; }
            var d = E.textStep(S, bytes);
            S.result(bytes.length ? Calc.esc(d.text) : '(empty)', { copy: d.text, label: 'Text' });
            if (d.errors) S.note('These bytes are not UTF-8 text. Choose "Hex digits" to see the bytes.');
        }
    }
});
