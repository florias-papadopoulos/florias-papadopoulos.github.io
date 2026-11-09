/* Toolbox: Morse code (ITU), text to dots and dashes and back, with the timing in units. */
Calc.tool({
    id: 'morse',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text, or Morse code to decode', rows: 3, optional: true, maxLength: 10000, placeholder: 'SOS' },
        { id: 'sep', type: 'select', label: 'Between words', value: 'slash', options: [['slash', 'A slash ( / )'], ['spaces', 'Three spaces']], help: 'Letters are separated by one space. Decoding accepts both.' }
    ],
    actions: [{ id: 'enc', label: 'Text to Morse' }, { id: 'dec', label: 'Morse to text' }],
    examples: [{ input: 'SOS', sep: 'slash' }, { input: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..', _action: 'dec' }, { input: 'Morse code, 1838!', sep: 'slash' }, { input: '-- --- .-. ... .   -.-. --- -.. .', _action: 'dec' }],
    run: function (v, S) {
        var TX = Calc.lib.text;
        var M = {
            A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
            N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
            0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
            '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
            ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
        };
        var R = {};
        Object.keys(M).forEach(function (k) { R[M[k]] = k; });
        function units(code) { return code.split('').reduce(function (a, c) { return a + (c === '.' ? 1 : 3); }, 0) + code.length - 1; }
        function said(code) { return code.split('').map(function (c) { return c === '.' ? 'dit' : 'dah'; }).join(' '); }
        if (v._action === 'dec') return decode();

        var text = TX.deaccent(v.input).toUpperCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
        var words = text.split(/\s+/).filter(Boolean), skipped = {}, rows = [], outWords = [], total = 0;
        words.forEach(function (w, wi) {
            var codes = [];
            Array.from(w).forEach(function (c) {
                var code = M[c];
                if (!code) { skipped[c] = 1; return; }
                codes.push(code);
                rows.push([Calc.esc(c), code, said(code), units(code)]);
            });
            if (codes.length) {
                outWords.push(codes.join(' '));
                total += codes.reduce(function (a, k) { return a + units(k); }, 0) + 3 * (codes.length - 1);
            }
            if (wi < words.length - 1 && codes.length) rows.push([{ v: '(next word)', hl: true }, v.sep === 'slash' ? '/' : '(3 spaces)', '', '']);
        });
        if (outWords.length > 1) total += 7 * (outWords.length - 1);
        var out = outWords.join(v.sep === 'slash' ? ' / ' : '   ');
        S.result(out ? out : '(nothing to send)', { copy: out, label: 'Morse code' });
        var bad = Object.keys(skipped);
        if (bad.length) S.note('No Morse code for: ' + bad.map(function (c) { return Calc.lib.enc.show(c.codePointAt(0), c); }).join(' ') + ' (left out).');
        var s1 = S.step('Look up each character');
        if (!rows.length) { s1.p('There is no character that Morse code can send.'); return; }
        s1.p('Letters with accents are sent as the plain letter. A dot is called dit, a dash dah.');
        s1.table(['Character', 'Code', 'Spoken', 'Length (units)'], rows, { mono: true });
        var s2 = S.step('Timing');
        s2.p('Morse is a rhythm: a dot lasts 1 unit and a dash 3; inside a letter the gap is 1 unit, between letters 3 units, between words 7.');
        s2.p('The whole message takes ' + total + ' units. At 20 words per minute a unit is 60 ms, so it lasts about ' + (total * 0.06).toFixed(1) + ' s.');
        S.step('Write it down').p('One space between letters, ' + (v.sep === 'slash' ? 'a slash' : 'three spaces') + ' between words:').pre(out);

        function decode() {
            var src = v.input.replace(/[\u00B7\u2022\u2219\u22C5*]/g, '.').replace(/[\u2212\u2013\u2014\u2012_]/g, '-').trim();
            var m = /[^.\-\s/|]/.exec(src);
            if (m) Calc.fail('"' + m[0] + '" is not Morse: use dots, dashes, spaces, and / between words.', 'input');
            var wordsIn = src.split(/\s*[/|]\s*|\s{2,}/).filter(Boolean), out2 = [], rows2 = [];
            wordsIn.forEach(function (w, wi) {
                var letters = w.split(/\s+/).filter(Boolean), word = '';
                letters.forEach(function (code, li) {
                    var ch = R[code];
                    if (!ch) Calc.fail('"' + code + '" (word ' + (wi + 1) + ', letter ' + (li + 1) + ') is not a Morse code.', 'input');
                    word += ch;
                    rows2.push([code, Calc.esc(ch), said(code)]);
                });
                out2.push(word);
                if (wi < wordsIn.length - 1) rows2.push(['/', { v: '(space)', hl: true }, '']);
            });
            var res = out2.join(' ');
            S.result(res ? Calc.esc(res) : '(empty)', { copy: res, label: 'Text' });
            var t = S.step('Split into words and letters');
            t.p('A slash (or two or more spaces) ends a word, one space ends a letter. Other dot and dash signs (such as · and the minus sign) are read as . and -.');
            if (!rows2.length) { t.p('There is no code.'); return; }
            var t2 = S.step('Look up each code');
            t2.p('Short codes go to frequent letters: E is one dot, T one dash. The story goes that Alfred Vail, Morse\'s partner, counted the type in a printer\'s case to choose them.');
            t2.table(['Code', 'Character', 'Spoken'], rows2, { mono: true });
        }
    }
});
