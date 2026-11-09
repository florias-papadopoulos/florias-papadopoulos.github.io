/* Toolbox: text to hexadecimal bytes (UTF-8) and hex back to text, nibble by nibble. */
Calc.tool({
    id: 'hex',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text, or hex to decode', rows: 3, optional: true, maxLength: 20000, placeholder: 'Hello' },
        { id: 'sep', type: 'select', label: 'Between bytes', value: 'space', options: [['space', 'A space'], ['none', 'Nothing'], ['colon', 'A colon'], ['0x', '0x before each']] },
        { id: 'lower', type: 'check', label: 'Lower case a-f' }
    ],
    actions: [{ id: 'enc', label: 'Text to hex' }, { id: 'dec', label: 'Hex to text' }],
    examples: [{ input: 'Hello', sep: 'space' }, { input: '48 c3 a9 21', sep: 'space', _action: 'dec' }, { input: 'Ünïcode 😀', sep: 'none', lower: true }, { input: '0xDE 0xAD 0xBE 0xEF', _action: 'dec' }],
    run: function (v, S) {
        var E = Calc.lib.enc, HEX = '0123456789ABCDEF';
        function fmt(bytes) {
            var h = bytes.map(function (b) { return E.hex2(b, v.lower); });
            return v.sep === 'none' ? h.join('') : v.sep === 'colon' ? h.join(':') : v.sep === '0x' ? h.map(function (x) { return '0x' + x; }).join(' ') : h.join(' ');
        }
        function nibbleTable(s, bytes) {
            s.table(['Byte', 'Bits', 'High 4 bits', 'Low 4 bits', 'Hex'], bytes.map(function (b) {
                var hi = b >> 4, lo = b & 15;
                return [b, E.bin(b), E.bin(hi, 4) + ' = ' + hi, E.bin(lo, 4) + ' = ' + lo, { v: HEX.charAt(hi) + HEX.charAt(lo), hl: true }];
            }), { mono: true });
        }
        if (v._action === 'dec') {
            var bytes = E.parseHex(v.input, 'input');
            var s = S.step('Clean up and pair the digits');
            s.p('Spaces, commas, colons and 0x prefixes are dropped; what is left must be hex digits, two per byte.');
            if (bytes.length) {
                s.p('Each pair is $16 \\cdot \\text{first} + \\text{second}$, with A = 10, B = 11, ..., F = 15.');
                var f = bytes[0];
                s.math('\\mathrm{' + E.hex2(f) + '}_{16} = ' + (f >> 4) + ' \\cdot 16 + ' + (f & 15) + ' = ' + f);
                nibbleTable(s, bytes);
            }
            var d = E.textStep(S, bytes);
            S.result(bytes.length ? Calc.esc(d.text) : '(empty)', { copy: d.text, label: 'Text' });
            if (d.errors) S.note('These bytes are not valid UTF-8 text; ' + d.errors + ' invalid sequence' + (d.errors === 1 ? ' is' : 's are') + ' shown as the replacement character.');
            return;
        }
        var b2 = E.bytesStep(S, v.input, 'text', 'input');
        var out = fmt(b2);
        S.result(b2.length ? Calc.esc(out) : '(no bytes)', { copy: out, label: 'Hex (' + b2.length + ' byte' + (b2.length === 1 ? '' : 's') + ')' });
        if (!b2.length) return;
        var t = S.step('Write each byte as two hex digits');
        t.p('A byte is 8 bits. Split them into two halves of 4 bits (nibbles): each nibble is a number from 0 to 15, one hex digit 0-9, A-F.');
        nibbleTable(t, b2);
        S.step('Join the digits').p('With ' + (v.sep === 'none' ? 'nothing' : v.sep === 'colon' ? 'a colon' : v.sep === '0x' ? '0x before every byte' : 'a space') + ' between the bytes:').pre(out);
    }
});
