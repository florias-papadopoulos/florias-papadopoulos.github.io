/* Toolbox: text to Unicode code points (decimal, hex, binary, octal, U+) and code points back to text. */
Calc.tool({
    id: 'character-codes',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text, or codes to turn into text', rows: 3, optional: true, maxLength: 20000, placeholder: 'Hé!' },
        { id: 'fmt', type: 'select', label: 'Codes in', value: 'dec', options: [['dec', 'Decimal'], ['hex', 'Hexadecimal'], ['bin', 'Binary'], ['oct', 'Octal'], ['u', 'U+ notation']],
            help: 'When reading codes, a prefix wins: U+, 0x, 0b, 0o, &#x...; and &#...; are understood.' }
    ],
    actions: [{ id: 'enc', label: 'Text to codes' }, { id: 'dec', label: 'Codes to text' }],
    examples: [{ input: 'Hé!', fmt: 'dec' }, { input: '72 101 108 108 111', fmt: 'dec', _action: 'dec' }, { input: 'π≈3 😀', fmt: 'u' }, { input: '0x48 0x69 U+1F600', fmt: 'hex', _action: 'dec' }],
    run: function (v, S) {
        var E = Calc.lib.enc, fmt = v.fmt;
        var BASE = { dec: 10, hex: 16, bin: 2, oct: 8, u: 16 }, NAME = { dec: 'decimal', hex: 'hexadecimal', bin: 'binary', oct: 'octal', u: 'U+ notation' };
        function code(cp, f) {
            if (f === 'u') return E.uplus(cp);
            var s = cp.toString(BASE[f]);
            return f === 'hex' ? s.toUpperCase() : s;
        }
        if (v._action === 'dec') return decode();

        var cps = E.codePoints(v.input);
        if (!cps.length) { S.result('(no characters)', { copy: '' }); S.step('Split the text into characters').p('The text is empty.'); return; }
        var out = cps.map(function (c) { return code(c.cp, fmt); });
        S.result(Calc.esc(out.join(' ')), { copy: out.join(' '), label: 'Codes (' + NAME[fmt] + ')' });
        var units = v.input.length;
        var s1 = S.step('Split the text into characters');
        s1.p('The text has ' + cps.length + ' character' + (cps.length === 1 ? '' : 's') + ' (Unicode code points)' + (units !== cps.length ? '. JavaScript and Java count ' + units + ' because a character above U+FFFF is stored as two UTF-16 units (a surrogate pair).' : '.'));
        if (cps.some(function (c) { return c.lone; })) s1.check(false, 'The text contains a lone surrogate, which is not a real character.');
        var s2 = S.step('Look up each code point');
        s2.p('Unicode gives every character a number, its code point. Below 128 it is the ASCII code. The same number in four bases:');
        s2.table(['Character', 'U+', 'Decimal', 'Hex', 'Binary'], cps.map(function (c) {
            return [E.show(c.cp, c.ch), E.uplus(c.cp), c.cp, c.cp.toString(16).toUpperCase(), E.group(c.cp.toString(2), 4, true)];
        }), { mono: true });
        var f = cps[0], n = f.cp;
        var s3 = S.step('Changing the base, with the first character');
        var pw = [], k;
        for (k = 20; k >= 0; k--) if (n & (1 << k)) pw.push(k);
        if (n === 0) s3.p('The code is 0, which is 0 in every base.');
        else {
            s3.p('Binary: write ' + n + ' as a sum of powers of two; each power present is a 1 bit.');
            s3.math(n + ' = ' + pw.map(function (e) { return '2^{' + e + '}'; }).join(' + ') + ' = ' + n.toString(2) + '_2');
            var hd = [], m = n;
            while (m > 0) { hd.unshift(m % 16); m = Math.floor(m / 16); }
            s3.p('Hexadecimal: each hex digit is a power of 16 (or a group of 4 bits from the right).');
            s3.math(n + ' = ' + hd.map(function (d, i) { var e = hd.length - 1 - i; return d + (e ? ' \\cdot 16^{' + e + '}' : ''); }).join(' + ') + ' = \\mathrm{' + n.toString(16).toUpperCase() + '}_{16}');
        }

        function decode() {
            var src = v.input.trim();
            if (!src) { S.result('(empty)', { copy: '' }); S.step('Read the codes').p('There are no codes.'); return; }
            var toks = src.split(/[\s,;]+/).filter(Boolean), rows = [], text = '';
            toks.forEach(function (t, i) {
                var m, base = BASE[fmt], digits = t, how = NAME[fmt];
                if ((m = /^&#x([0-9a-f]+);?$/i.exec(t))) { base = 16; digits = m[1]; how = 'HTML hex entity'; }
                else if ((m = /^&#(\d+);?$/.exec(t))) { base = 10; digits = m[1]; how = 'HTML entity'; }
                else if ((m = /^(?:u\+|\\u\{?|0x)([0-9a-f]+)\}?$/i.exec(t))) { base = 16; digits = m[1]; how = 'hexadecimal (prefix)'; }
                else if ((m = /^0b([01]+)$/i.exec(t))) { base = 2; digits = m[1]; how = 'binary (prefix)'; }
                else if ((m = /^0o([0-7]+)$/i.exec(t))) { base = 8; digits = m[1]; how = 'octal (prefix)'; }
                var re = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/i }[base];
                if (!re.test(digits)) Calc.fail('Code ' + (i + 1) + ' ("' + t + '") is not a ' + NAME[base === 16 ? 'hex' : base === 2 ? 'bin' : base === 8 ? 'oct' : 'dec'] + ' number.', 'input');
                if (digits.replace(/^0+/, '').length > { 2: 21, 8: 7, 10: 7, 16: 6 }[base]) Calc.fail('Code ' + (i + 1) + ' ("' + t + '") is far above the last code point U+10FFFF.', 'input');
                var cp = parseInt(digits, base);
                if (cp > 0x10FFFF) Calc.fail('Code ' + (i + 1) + ' (' + cp + ') is above U+10FFFF = 1114111, the last code point.', 'input');
                if (cp >= 0xD800 && cp <= 0xDFFF) Calc.fail('Code ' + (i + 1) + ' (' + E.uplus(cp) + ') is a surrogate: these are reserved for UTF-16 and are not characters.', 'input');
                text += E.fromCodePoint(cp);
                rows.push([Calc.esc(t), how, cp, E.uplus(cp), E.show(cp)]);
            });
            S.result(Calc.esc(text), { copy: text, label: 'Text' });
            var d1 = S.step('Read each code as a number');
            d1.p('The codes are read in ' + NAME[fmt] + ' unless a prefix says otherwise. A code point must lie between 0 and U+10FFFF and must not be a surrogate (U+D800 to U+DFFF).');
            d1.table(['Code', 'Read as', 'Decimal', 'U+', 'Character'], rows, { mono: true });
            S.step('Put the characters together').p('The text, ' + toks.length + ' character' + (toks.length === 1 ? '' : 's') + ':').pre(text);
        }
    }
});
