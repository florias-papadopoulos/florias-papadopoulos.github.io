/* Toolbox: ROT13, ROT5, ROT18 and ROT47: fixed rotations that are their own inverse, with a character table. */
Calc.tool({
    id: 'rot13',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Why did the chicken cross the road?'),
        { id: 'variant', type: 'select', label: 'Variant', width: 'l', value: 'rot13', options: [
            ['rot13', 'ROT13: letters move by 13'],
            ['rot5', 'ROT5: digits move by 5'],
            ['rot18', 'ROT18: ROT13 on letters and ROT5 on digits'],
            ['rot47', 'ROT47: every visible ASCII character moves by 47']
        ] }
    ],
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Why did the chicken cross the road?', variant: 'rot13' },
        { text: 'Hello, World! 2027', variant: 'rot47' },
        { text: 'Gb trg gb gur bgure fvqr.', variant: 'rot13', _action: 'dec' },
        { text: 'Call 0123456789', variant: 'rot18' }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', V = v.variant;
        var s = V === 'rot47' ? String(v.text) : Calc.lib.text.deaccent(v.text);
        /* which characters move, and how: [first code, size of the range, shift] */
        var ranges = { rot13: [[65, 26, 13], [97, 26, 13]], rot5: [[48, 10, 5]], rot18: [[65, 26, 13], [97, 26, 13], [48, 10, 5]], rot47: [[33, 94, 47]] }[V];
        function rot(ch) {
            var c = ch.charCodeAt(0);
            for (var i = 0; i < ranges.length; i++) {
                var r = ranges[i];
                if (c >= r[0] && c < r[0] + r[1]) return { c: String.fromCharCode(r[0] + (c - r[0] + r[2]) % r[1]), r: r };
            }
            return null;
        }
        var out = '', rows = [], moved = 0;
        for (var i = 0; i < s.length; i++) {
            var ch = s.charAt(i), m = rot(ch);
            if (!m) { out += ch; continue; }
            out += m.c;
            moved++;
            var x = ch.charCodeAt(0) - m.r[0];
            rows.push(V === 'rot47' ? [C.cell(ch), ch.charCodeAt(0), C.modCell(x + ' + 47', x + 47, 94), m.c.charCodeAt(0), C.cell(m.c)]
                : [C.cell(ch), x, C.modCell(x + ' + ' + m.r[2], x + m.r[2], m.r[1]), C.cell(m.c)]);
        }
        if (!moved) Calc.fail(V === 'rot5' ? 'The text has no digits.' : V === 'rot47' ? 'The text has no visible ASCII characters.' : 'The text has nothing this variant changes.', 'text');
        C.result(S, out, enc, 'Encrypting and decrypting are the same operation: applying it twice gives the text back.');

        var s1 = S.step('The rule');
        if (V === 'rot47') {
            s1.p('ROT47 works on the 94 visible ASCII characters, from ! (code 33) to ~ (code 126). Number them $x = \\text{code} - 33$, so $x$ runs from 0 to 93, and move each by 47:')
                .math('x \\mapsto (x + 47) \\bmod 94');
            s1.p('Since $47 + 47 = 94 \\equiv 0$, doing it twice moves every character by a full turn. Spaces, accents and other characters stay as they are.');
        } else {
            var parts = [];
            if (V !== 'rot5') parts.push('a letter $x$ (A = 0, ..., Z = 25) becomes $(x + 13) \\bmod 26$');
            if (V !== 'rot13') parts.push('a digit $d$ becomes $(d + 5) \\bmod 10$');
            s1.p('In ' + V.toUpperCase() + ', ' + parts.join(' and ') + '. Case is kept and every other character stays as it is.');
            s1.p('Moving by half the range twice is a full turn ($13 + 13 = 26$, $5 + 5 = 10$), so the same rule also decrypts.');
            if (V !== 'rot5') {
                var head = [], row = [];
                for (var j = 0; j < 26; j++) { head.push(C.AZ.charAt(j)); row.push(C.AZ.charAt((j + 13) % 26)); }
                s1.table(head, [row], { mono: true, caption: 'The letters and their partners:' });
            }
        }
        var rule = V === 'rot13' ? '$x + 13 \\bmod 26$' : V === 'rot5' ? '$d + 5 \\bmod 10$' : '$x + 13 \\bmod 26$ or $d + 5 \\bmod 10$';
        S.step('Character by character').table(V === 'rot47' ? ['Character', 'Code', '$x + 47 \\bmod 94$, $x = \\text{code} - 33$', 'New code', 'Result'] : ['Character', V === 'rot5' ? '$d$' : 'Number', rule, 'Result'], rows, { mono: true });

        var back = '';
        for (var b = 0; b < out.length; b++) { var mm = rot(out.charAt(b)); back += mm ? mm.c : out.charAt(b); }
        var c = S.step('Check: apply it once more');
        c.p('Applying ' + V.toUpperCase() + ' to the result gives: ' + C.short(back, 80));
        c.check(back === s, back === s ? 'This is the input again.' : 'This differs from the input.');
    }
});
