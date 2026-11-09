/* Toolbox: try the common encodings (Base64, Base32, hex, binary, decimal, A1Z26, Morse, URL, ROT13, Atbash,
   reversed) on a text, also two in a row, and rank the outputs by how readable they are. */
Calc.tool({
    id: 'decoder-guesser',
    live: true,
    inputs: [
        { id: 'text', type: 'textarea', label: 'Encoded text', rows: 5, maxLength: 20000, placeholder: 'Paste something that looks encoded' },
        { id: 'chain', type: 'check', label: 'Also try two decodings in a row', value: true }
    ],
    examples: [
        { text: 'VGhlIGZpcnN0IHJ1bGUgb2YgZGVjb2Rpbmc6IGxvb2sgYXQgdGhlIGFscGhhYmV0IGJlZm9yZSB5b3UgZ3Vlc3Mu', chain: true },
        { text: '.-- . .-.. .-.. / -.. --- -. . --..-- / -.-- --- ..- / ..-. --- ..- -. -.. / - .... . / -.-. --- -.. .', chain: true },
        { text: '4d65657420617420746865206f6c64206d696c6c', chain: true },
        { text: 'NDI3MjY5NmU2NzIwNzQ2ODY1MjA2ZDYxNzA=', chain: true }
    ],
    run: function (v, S) {
        var B = Calc.lib.breaking, f = B.f, D = B.decode;
        var s = String(v.text);
        if (!s.trim()) Calc.fail('Please enter some text.', 'text');
        var list = [
            ['base64', 'Base64', 'needs A to Z, a to z, 0 to 9, + / and a valid length'],
            ['base32', 'Base32', 'needs A to Z and 2 to 7 only'],
            ['hex', 'Hexadecimal bytes', 'needs an even number of hex digits'],
            ['binary', 'Binary bytes', 'needs 0 and 1 only, in groups of 8'],
            ['decimal', 'Decimal character codes', 'needs numbers separated by spaces'],
            ['a1z26', 'Letter numbers (A = 1 to Z = 26)', 'needs numbers from 1 to 26'],
            ['morse', 'Morse code', 'needs dots, dashes and spaces'],
            ['url', 'URL (percent) encoding', 'needs %XX escapes'],
            ['rot13', 'ROT13', 'needs letters'],
            ['atbash', 'Atbash', 'needs letters'],
            ['reverse', 'Reversed', 'needs at least 2 characters']
        ];
        function tryAll(src) {
            return list.map(function (d) {
                var out = null;
                try { out = D[d[0]](src); } catch (e) { out = null; }
                if (out === src) out = null;
                return { id: d[0], name: d[1], why: d[2], out: out, r: out == null ? null : B.readability(out) };
            });
        }
        var base = B.readability(s), one = tryAll(s);
        var s1 = S.step('Try every decoder on the input');
        s1.p('Each decoder first checks that the input uses its alphabet, then decodes. Bytes are read as UTF-8 text when they form valid UTF-8, otherwise as Latin-1. The readability score (0 to 100) multiplies three things: the share of printable characters (cubed, so binary junk sinks fast), how English its letters are (quadgram fitness from about $' + B.RANDOM_FIT + '$ for random letters to $' + B.EN_FIT + '$ for English), and the share of letters.');
        var rows = [['No decoding (the input as it is)', '', f(base.score, 1), f(base.fit, 2), B.preview(s, 34)]];
        one.forEach(function (d) {
            rows.push(d.out == null ? [d.name, 'no', '', '', d.why] : [d.name, 'yes', f(d.r.score, 1), f(d.r.fit, 2), B.preview(d.out, 34)]);
        });
        s1.table(['Decoder', 'Fits', 'Readability', 'Fitness', 'Output'], rows, { mono: true, max: 20 });

        var cands = one.filter(function (d) { return d.out != null; }).map(function (d) { return { chain: [d.name], ids: [d.id], out: d.out, r: d.r }; });
        if (v.chain) {
            var two = [];
            cands.slice().forEach(function (c1) {
                if (c1.out.length > 20000 || c1.r.printable < 0.9) return;
                tryAll(c1.out).forEach(function (d) {
                    if (d.out == null) return;
                    var inv = { rot13: 'rot13', atbash: 'atbash', reverse: 'reverse' };
                    if (inv[d.id] && inv[d.id] === c1.ids[0]) return;   // undoing the first step
                    two.push({ chain: [c1.chain[0], d.name], ids: [c1.ids[0], d.id], out: d.out, r: d.r });
                });
            });
            two.sort(function (a, b) { return b.r.score - a.r.score; });
            var bestOne = cands.reduce(function (m, x) { return Math.max(m, x.r.score); }, base.score);
            var better = two.filter(function (x) { return x.r.score > bestOne + 5; }).slice(0, 8);
            var s2 = S.step('Try two decodings in a row');
            s2.p('Encodings are often stacked (hex inside Base64, Base64 of a Morse text). Every readable first output is decoded once more, ' + two.length + ' pairs in all.');
            if (better.length) {
                s2.table(['First', 'Then', 'Readability', 'Output'], better.map(function (x) { return [x.chain[0], x.chain[1], f(x.r.score, 1), B.preview(x.out, 40)]; }), { mono: true });
                cands = cands.concat(better);
            } else s2.p('No pair reads better than the best single decoding.');
        }
        cands.sort(function (a, b) { return b.r.score - a.r.score || a.chain.length - b.chain.length; });
        var s3 = S.step('Rank the results');
        if (!cands.length || cands[0].r.score <= base.score + 2 || cands[0].r.score < 15) {
            s3.p(base.score > 50 ? 'The input already reads as English, and no decoding improves it.' : 'No decoder gives readable text. The input may be a cipher with a key rather than an encoding: try the cipher identifier (cipher-identifier).');
            if (cands.length) s3.table(['Rank', 'Decoding', 'Readability'], cands.slice(0, 6).map(function (x, i) { return [i + 1, x.chain.join(', then '), f(x.r.score, 1)]; }), { mono: true });
            S.result(base.score > 50 ? 'Already readable: no decoding needed' : 'No readable decoding found', { copy: base.score > 50 ? s : 'none', label: 'Decoded' });
            return;
        }
        s3.table(['Rank', 'Decoding', 'Readability', 'Output'], cands.slice(0, 10).map(function (x, i) { return [i + 1, x.chain.join(', then '), f(x.r.score, 1), B.preview(x.out, 40)]; }), { mono: true, hl: 0 });
        var w = cands[0];
        s3.p('The winner is ' + w.chain.join(', then ') + ' with readability ' + f(w.r.score, 1) + (cands[1] ? ', ahead of ' + cands[1].chain.join(', then ') + ' at ' + f(cands[1].r.score, 1) : '') + '. Its output in full:');
        s3.pre(w.out);
        S.result(Calc.esc(w.out), { copy: w.out, label: w.chain.join(', then ') });
        if (w.r.score < 30) S.note('The best result is still hard to read: it may be enciphered with a key as well (try cipher-identifier).');
    }
});
