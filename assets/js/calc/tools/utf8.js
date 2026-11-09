/* Toolbox: UTF-8 encoding of each character with the bit layout filled in, and decoding bytes with every error explained. */
Calc.tool({
    id: 'utf8',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text, or bytes in hex to decode', rows: 3, optional: true, maxLength: 20000, placeholder: 'aé€😀' }
    ],
    actions: [{ id: 'enc', label: 'Text to UTF-8' }, { id: 'dec', label: 'UTF-8 to text' }],
    examples: [{ input: 'aé€😀' }, { input: '48 C3 A9 E2 82 AC F0 9F 98 80', _action: 'dec' }, { input: 'C3 28 E0 80 AF ED A0 80 F0 9F 98', _action: 'dec' }, { input: 'Ω = 2π' }],
    run: function (v, S) {
        var E = Calc.lib.enc;
        var LAY = [
            { n: 1, from: 0, to: 0x7F, bits: 7, pat: '0xxxxxxx' },
            { n: 2, from: 0x80, to: 0x7FF, bits: 11, pat: '110xxxxx 10xxxxxx' },
            { n: 3, from: 0x800, to: 0xFFFF, bits: 16, pat: '1110xxxx 10xxxxxx 10xxxxxx' },
            { n: 4, from: 0x10000, to: 0x10FFFF, bits: 21, pat: '11110xxx 10xxxxxx 10xxxxxx 10xxxxxx' }
        ];
        var HEAD = [0, 7, 5, 4, 3];   // payload bits in the lead byte of an n-byte sequence: 8 - (n + 1), and 7 for n = 1
        function layout(cp) { for (var i = 0; i < 4; i++) if (cp <= LAY[i].to) return LAY[i]; return LAY[3]; }
        /* the filled pattern: [110]00011 [10]101001 */
        function filled(bytes) {
            var n = bytes.length;
            return bytes.map(function (b, i) {
                var mk = n === 1 ? 1 : i === 0 ? n + 1 : 2, s = E.bin(b);
                return '[' + s.slice(0, mk) + ']' + s.slice(mk);
            }).join(' ');
        }
        /* the code point's bits cut as the bytes take them: 00011 101001 */
        function cut(cp, L) {
            var s = E.bin(cp, L.bits), out = [], k = L.n === 1 ? 7 : HEAD[L.n];
            out.push(s.slice(0, k));
            for (var i = k; i < s.length; i += 6) out.push(s.slice(i, i + 6));
            return out.join(' ');
        }
        if (v._action === 'dec') return decode();

        var chars = E.utf8Chars(v.input), all = [];
        chars.forEach(function (c) { Array.prototype.push.apply(all, c.bytes); });
        var hex = E.hex(all);
        S.result(chars.length ? hex : '(no bytes)', { copy: hex, label: 'UTF-8 bytes (' + all.length + ')' });
        var s0 = S.step('The four layouts of UTF-8');
        s0.p('The code point decides the number of bytes. The x are the bits of the code point, filled in from the left; the fixed bits in front say how long the sequence is (0, 110, 1110, 11110) or that the byte continues one (10).');
        s0.table(['Code points', 'Bits', 'Bytes', 'Layout', 'Here'], LAY.map(function (L) {
            var k = chars.filter(function (c) { return layout(c.cp) === L; }).length;
            return [E.uplus(L.from) + ' to ' + E.uplus(L.to), L.bits, L.n, L.pat, k ? { v: k + ' char' + (k === 1 ? '' : 's'), hl: true } : ''];
        }), { mono: true });
        if (!chars.length) { s0.p('The text is empty, so there are no bytes.'); return; }
        var ex = chars.filter(function (c) { return c.cp > 0x7F; })[0];
        if (ex) {
            var L = layout(ex.cp), s1 = S.step('Worked example: ' + E.show(ex.cp, ex.ch) + ' (' + E.uplus(ex.cp) + ')');
            s1.p('In binary, padded to the ' + L.bits + ' bits of the ' + L.n + '-byte layout:');
            s1.math(E.uplus(ex.cp).replace('U+', '\\mathrm{') + '}_{16} = ' + E.bin(ex.cp, L.bits) + '_2');
            s1.p('Cut it as the layout takes it: ' + HEAD[L.n] + ' bits for the lead byte, then 6 bits per continuation byte: ' + cut(ex.cp, L) + '. Put the bits into ' + L.pat + ':');
            s1.math('\\texttt{' + filled(ex.bytes).replace(/\[/g, '\\underline{').replace(/\]/g, '}') + '} = \\texttt{' + E.hex(ex.bytes) + '}');
            if (ex.lone) s1.check(false, 'This is a lone surrogate, not a character; it is written as U+FFFD.');
        }
        var s2 = S.step('Every character');
        s2.p('The fixed bits are in brackets.');
        s2.table(['Character', 'Code point', 'Bits, cut', 'UTF-8 (binary)', 'Hex'], chars.map(function (c) {
            var L2 = layout(c.cp);
            return [E.show(c.cp, c.ch), E.uplus(c.cp), cut(c.lone ? 0xFFFD : c.cp, L2), filled(c.bytes), { v: E.hex(c.bytes), hl: true }];
        }), { mono: true });
        if (chars.some(function (c) { return c.lone; })) s2.check(false, 'The text contains a lone surrogate (broken UTF-16); it is encoded as U+FFFD (EF BF BD), as browsers do.');
        S.step('All bytes').p(chars.length + ' character' + (chars.length === 1 ? '' : 's') + ', ' + all.length + ' byte' + (all.length === 1 ? '' : 's') + ':').pre(hex);

        function decode() {
            var bytes = E.parseHex(v.input.replace(/%/g, ' '), 'input');
            var d = E.utf8Decode(bytes);
            S.result(bytes.length ? Calc.esc(d.text) : '(empty)', { copy: d.text, label: d.errors ? 'Text (with replacement characters)' : 'Text' });
            if (d.errors) S.note(d.errors + ' invalid sequence' + (d.errors === 1 ? '' : 's') + ', each replaced by U+FFFD as the WHATWG Encoding standard (and every browser) does. A strict decoder would stop at the first one.');
            var s = S.step('Read the lead byte, then its continuation bytes');
            if (!bytes.length) { s.p('There are no bytes.'); return; }
            s.p('The first bits of a lead byte give the length: 0xxxxxxx is one byte, 110xxxxx two, 1110xxxx three, 11110xxx four. The next bytes must be 10xxxxxx. Remove the fixed bits and join the rest.');
            s.table(['Bytes (hex)', 'Binary', 'Code point bits', 'Code point', 'Character'], d.chars.map(function (c) {
                if (c.err) return [{ v: E.hex(c.bytes), hl: true }, c.bytes.map(function (b) { return E.bin(b); }).join(' '), { v: 'invalid', hl: true }, '', Calc.esc(c.err)];
                var L = layout(c.cp);
                return [E.hex(c.bytes), filled(c.bytes), cut(c.cp, L), E.uplus(c.cp), E.show(c.cp)];
            }), { mono: true });
            var ok = S.step('Check the rules');
            ok.p('Besides the bit patterns, UTF-8 forbids overlong forms (a code point written with more bytes than needed, like C0 AF for /), the surrogates U+D800 to U+DFFF, and anything above U+10FFFF.');
            ok.check(!d.errors, d.errors ? d.errors + ' invalid sequence' + (d.errors === 1 ? '' : 's') + ' (highlighted above).' : 'All ' + bytes.length + ' bytes form valid UTF-8: ' + d.chars.length + ' character' + (d.chars.length === 1 ? '' : 's') + '.');
        }
    }
});
