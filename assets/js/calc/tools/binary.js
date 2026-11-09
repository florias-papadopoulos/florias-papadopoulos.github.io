/* Toolbox: text to binary (8-bit groups of the UTF-8 bytes) and binary back to text. */
Calc.tool({
    id: 'binary',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text, or binary to decode', rows: 3, optional: true, maxLength: 20000, placeholder: 'Hi' },
        { id: 'sep', type: 'check', label: 'Space between bytes', value: true }
    ],
    actions: [{ id: 'enc', label: 'Text to binary' }, { id: 'dec', label: 'Binary to text' }],
    examples: [{ input: 'Hi', sep: true }, { input: '01001000 01101001 00100001', sep: true, _action: 'dec' }, { input: 'é', sep: true }, { input: '1001000 1101001', _action: 'dec' }],
    run: function (v, S) {
        var E = Calc.lib.enc, PV = [128, 64, 32, 16, 8, 4, 2, 1];
        function placeTable(s, b) {
            var bits = E.bin(b);
            s.table(['Place value'].concat(PV), [['Bit'].concat(bits.split('')), ['Counts'].concat(bits.split('').map(function (c, i) { return c === '1' ? { v: PV[i], hl: true } : ''; }))], { mono: true });
            var parts = PV.filter(function (p, i) { return bits.charAt(i) === '1'; });
            s.math((parts.length ? parts.join(' + ') : '0') + ' = ' + b);
        }
        if (v._action === 'dec') {
            var src = v.input.trim(), groups;
            if (/[^01\s,]/.test(src)) Calc.fail('"' + /[^01\s,]/.exec(src)[0] + '" is not a binary digit: only 0, 1 and spaces.', 'input');
            var spaced = /[\s,]/.test(src);
            if (!src) groups = [];
            else if (spaced) groups = src.split(/[\s,]+/).filter(Boolean);
            else {
                if (src.length % 8) Calc.fail(src.length + ' bits without spaces is not a whole number of bytes (a multiple of 8). Put spaces between the bytes if they are shorter.', 'input');
                groups = src.match(/.{8}/g);
            }
            groups.forEach(function (g, i) { if (g.length > 8) Calc.fail('Group ' + (i + 1) + ' has ' + g.length + ' bits; a byte has at most 8.', 'input'); });
            var bytes = groups.map(function (g) { return parseInt(g, 2); });
            var s = S.step(spaced ? 'Read each group of bits as a byte' : 'Cut the bits into bytes of 8');
            if (bytes.length) {
                s.p(spaced ? 'The groups are separated by spaces; a group shorter than 8 bits is the same number with leading zeros.' : 'From the left, 8 bits at a time.');
                s.p('Each bit counts its place value (128, 64, ..., 1) when it is 1. The first byte:');
                placeTable(s, bytes[0]);
                s.table(['Group', 'Bits', 'Decimal', 'Hex'], groups.map(function (g, i) { return [i + 1, E.bin(bytes[i]), bytes[i], E.hex2(bytes[i])]; }), { mono: true });
            } else s.p('There are no bits.');
            var d = E.textStep(S, bytes);
            S.result(bytes.length ? Calc.esc(d.text) : '(empty)', { copy: d.text, label: 'Text' });
            if (d.errors) S.note('These bytes are not valid UTF-8 text; invalid sequences are shown as the replacement character.');
            return;
        }
        var b2 = E.bytesStep(S, v.input, 'text', 'input');
        var out = b2.map(function (b) { return E.bin(b); }).join(v.sep ? ' ' : '');
        S.result(b2.length ? out : '(no bytes)', { copy: out, label: 'Binary (' + b2.length * 8 + ' bits)' });
        if (!b2.length) return;
        var t = S.step('Write each byte with 8 bits');
        t.p('Take away the largest place value that fits, write 1, and go on with the rest (a 0 where it does not fit). The first byte, ' + b2[0] + ':');
        placeTable(t, b2[0]);
        t.table(['Byte', 'Decimal', 'Hex', 'Bits'], b2.map(function (b, i) { return [i + 1, b, E.hex2(b), { v: E.bin(b), hl: true }]; }), { mono: true });
        S.step('Join the groups').pre(out);
    }
});
