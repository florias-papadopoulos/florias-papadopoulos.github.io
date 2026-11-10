/* Toolbox: Base64 (RFC 4648) encoding and decoding, 3 bytes to 4 characters of 6 bits, also the URL-safe alphabet. */
Calc.tool({
    id: 'base64',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text (or hex), or Base64 to decode', rows: 3, optional: true, maxLength: 30000, placeholder: 'Man' },
        { id: 'form', type: 'select', label: 'Bytes are', value: 'text', options: [['text', 'Text (UTF-8)'], ['hex', 'Hex digits']], help: 'What you type to encode, or how the decoded bytes are shown.' },
        { id: 'variant', type: 'select', label: 'Alphabet', value: 'std', options: [['std', 'Standard (+ and /)'], ['url', 'URL-safe (- and _)']] },
        { id: 'pad', type: 'check', label: 'Pad with =', value: true }
    ],
    actions: [{ id: 'enc', label: 'Encode' }, { id: 'dec', label: 'Decode' }],
    examples: [{ input: 'Man', form: 'text', variant: 'std', pad: true }, { input: 'SGVsbG8sIHfDtnJsZCE=', form: 'text', variant: 'std', pad: true, _action: 'dec' },
        { input: 'Ma', form: 'text', variant: 'std', pad: true }, { input: 'fb ff fe', form: 'hex', variant: 'url', pad: false }],
    run: function (v, S) {
        var E = Calc.lib.enc;
        var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + (v.variant === 'url' ? '-_' : '+/');
        function alphabetTable(s) {
            var head = ['']; for (var c = 0; c < 16; c++) head.push('+' + c);
            var rows = [];
            for (var r = 0; r < 4; r++) { var row = [String(16 * r)]; for (var k = 0; k < 16; k++) row.push(A.charAt(16 * r + k)); rows.push(row); }
            s.table(head, rows, { mono: true, caption: 'The alphabet: the character for value $v$ is in the row of $16 \\lfloor v/16 \\rfloor$ and the column $v \\bmod 16$.' });
        }
        if (v._action === 'dec') return decode();

        var bytes = E.bytesStep(S, v.input, v.form, 'input');
        var out = '', rows = [];
        for (var i = 0; i < bytes.length; i += 3) {
            var blk = bytes.slice(i, i + 3), n = blk.length;
            var bits = blk.map(function (b) { return E.bin(b); }).join('');
            var fill = n === 3 ? 0 : n === 2 ? 2 : 4;
            var all = bits + E.pad('', fill), sext = [];
            for (var j = 0; j < all.length; j += 6) sext.push(parseInt(all.substr(j, 6), 2));
            var chars = sext.map(function (x) { return A.charAt(x); }).join('');
            var padding = v.pad ? E.pad('', 4 - sext.length, '=') : '';
            out += chars + padding;
            rows.push([i / 3 + 1, E.hex(blk), E.group(bits, 8) + (fill ? ' + ' + E.pad('', fill) : ''), E.group(all, 6), sext.join(', '), { v: Calc.esc(chars + padding), hl: true }]);
        }
        S.result(bytes.length ? Calc.esc(out) : '(empty)', { copy: out, label: 'Base64' });
        if (!bytes.length) return;
        var s = S.step('Cut the bytes into blocks of 3 and the bits into groups of 6');
        s.p('3 bytes are 24 bits, exactly 4 groups of 6 bits. A group of 6 bits is a number from 0 to 63, one character of the alphabet.');
        s.table(['Block', 'Bytes (hex)', 'Bits (8 + 8 + 8)', 'Sextets (6 bits each)', 'Values', 'Characters'], rows, { mono: true });
        var s2 = S.step('Look up each value in the alphabet');
        alphabetTable(s2);
        var r = bytes.length % 3;
        var s3 = S.step('Padding at the end');
        if (!r) s3.p('The length, ' + bytes.length + ' bytes, is a multiple of 3: every block is full and no padding is needed.');
        else {
            s3.p('The last block has only ' + r + ' byte' + (r === 1 ? '' : 's') + ' (' + 8 * r + ' bits). Zero bits are added to fill ' + (r === 1 ? 'two' : 'three') + ' sextets (' + (r === 1 ? 4 : 2) + ' zero bits)' + (v.pad ? ', and = stands for each missing character, so the output length stays a multiple of 4.' : '. Without padding the = signs are left out; a decoder can tell from the length how many bytes the last block holds.'));
        }
        s3.p('Size: ' + bytes.length + ' bytes become ' + out.length + ' characters' + (v.pad ? ', that is $4 \\lceil n/3 \\rceil$' : '') + '. Base64 makes data about a third longer.');

        function decode() {
            var src = v.input.replace(/\s+/g, '');
            if (/[-_]/.test(src) && /[+/]/.test(src)) Calc.fail('The text mixes both alphabets (+ / and - _).', 'input');
            var other = v.variant === 'url' ? '+/' : '-_';
            var A2 = A;
            if (src.indexOf(other.charAt(0)) >= 0 || src.indexOf(other.charAt(1)) >= 0) A2 = A.slice(0, 62) + other;
            var p = src.indexOf('=');
            var body = p < 0 ? src : src.slice(0, p), padStr = p < 0 ? '' : src.slice(p);
            if (!/^=*$/.test(padStr)) Calc.fail('An = sign can only be padding at the very end.', 'input');
            if (padStr.length > 2) Calc.fail('At most two = signs of padding.', 'input');
            for (var q = 0; q < body.length; q++) if (A2.indexOf(body.charAt(q)) < 0) Calc.fail('"' + Calc.chr(body, q) + '" (position ' + (q + 1) + ') is not a Base64 character.', 'input');
            if (padStr && (body.length + padStr.length) % 4) Calc.fail('With padding the length must be a multiple of 4 (it is ' + src.length + ').', 'input');
            if (body.length % 4 === 1) Calc.fail('A length of 4k + 1 characters is impossible: one character carries only 6 bits, not a whole byte.', 'input');
            var bytes = [], rows = [], loose = false;
            for (var i = 0; i < body.length; i += 4) {
                var grp = body.slice(i, i + 4), vals = grp.split('').map(function (c) { return A2.indexOf(c); });
                var bits = vals.map(function (x) { return E.bin(x, 6); }).join(''), nb = Math.floor(bits.length / 8);
                var bs = [];
                for (var k = 0; k < nb; k++) bs.push(parseInt(bits.substr(8 * k, 8), 2));
                var rest = bits.slice(8 * nb);
                if (/1/.test(rest)) loose = true;
                Array.prototype.push.apply(bytes, bs);
                rows.push([Calc.esc(grp), vals.join(', '), E.group(bits, 6), E.group(bits.slice(0, 8 * nb), 8) + (rest ? ' (drop ' + rest + ')' : ''), { v: E.hex(bs), hl: true }]);
            }
            var s = S.step('Look up each character and regroup the bits');
            s.p('Spaces and line breaks are ignored' + (padStr ? ', and the padding = only marks the end' : '') + '. Each character is a value from 0 to 63 (6 bits); four of them give 24 bits, that is 3 bytes.' + (body.length % 4 ? ' The last group is shorter, and its extra bits (zeros) are dropped.' : ''));
            s.table(['Characters', 'Values', 'Bits (6 each)', 'Bytes (8 each)', 'Hex'], rows, { mono: true });
            if (loose) s.check(false, 'The dropped bits at the end are not all zero: an encoder would never produce this. Accepted anyway, but the text is not canonical Base64.');
            alphabetTable(S.step('The alphabet used'));
            if (A2 !== A) S.note('The text uses the ' + (v.variant === 'url' ? 'standard' : 'URL-safe') + ' alphabet, so it was read with that one.');
            if (v.form === 'hex') {
                var h = E.hex(bytes);
                S.result(bytes.length ? h : '(empty)', { copy: h, label: 'Bytes (hex)' });
                return;
            }
            var d = E.textStep(S, bytes);
            S.result(bytes.length ? Calc.esc(d.text) : '(empty)', { copy: d.text, label: 'Text' });
            if (d.errors) S.note('These bytes are not UTF-8 text (' + d.errors + ' invalid sequence' + (d.errors === 1 ? '' : 's') + '). Choose "Hex digits" to see the bytes.');
        }
    }
});
