/* Toolbox: break an affine cipher: a frequency shortcut (E and T), then all 312 keys ranked by quadgram fitness. */
Calc.tool({
    id: 'affine-breaker',
    live: true,
    inputs: [
        { id: 'text', type: 'textarea', label: 'Ciphertext', rows: 5, maxLength: 30000, placeholder: 'Paste an affine ciphertext' }
    ],
    examples: [
        { text: 'D ZFRSFG JFZZDTF HZ XQCP DZ ZGSXQT DZ GAF JFGAXY GADG AHYFZ HG. MXS RFQGNSHFZ RCFSVZ DQY ZXCYHFSZ GSNZGFY ZHJECF RHEAFSZ GADG ZAHMGFY XS SFECDRFY CFGGFSZ, DQY MXS RFQGNSHFZ EDGHFQG SFDYFSZ KSXVF GAFJ KP RXNQGHQT. GAF JXZG RXJJXQ CFGGFS HQ D CXQT FQTCHZA GFIG HZ DCJXZG DCBDPZ F, MXCCXBFY KP G DQY D, DQY GADG ZHQTCF MDRG NQYHY JDQP VHQTZ DQY TFQFSDCZ BAX KFCHFUFY GAFHS CFGGFSZ BFSF ZDMF.' },
        { text: 'TRKQJ ZJCGR TRQEI KYKKB KXOJC UDKZT RKFSX XQAIT SCXIK PKXWK PKFCF GDKVQ XKTRK IEFAK FTZQA FRKTX CUUKZ TRKAC OYBQJ CIRKZ TRKGX KSTJK FIEFT CJCTI RQFKJ CYKAS TKXSF ZAXQT KTRKA KSTRK XCFSI USJJD QQYAC TRSGX KKFOQ PKXIR CBIBS IIKZV SXQET STIKS SFZFQ FKQVT RKISC JQXIK PKXYF KARCI FSUKW KTKSO RQVTR KUTXE ITKZT RKJCG RTRKY KBTDE XFCFG TRXQE GRTRK JQFGA CFTKX FCGRT I' }
    ],
    run: function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, nt = Calc.lib.nt, f = B.f;
        var L = tx.letters(v.text), N = L.length;
        if (N < 4) Calc.fail('The breaker needs at least 4 letters A to Z.', 'text');
        var c = B.codes(L), counts = B.countCodes(c);

        var s0 = S.step('The keys to try');
        s0.p('An affine cipher enciphers $x \\mapsto y = (a x + b) \\bmod 26$ (letters numbered A = 0 to Z = 25). It can be undone only when $\\gcd(a, 26) = 1$, which leaves 12 values of $a$ (' + B.AFFINE_A.join(', ') + ') and 26 of $b$: $12 \\cdot 26 = 312$ keys. Decryption is $x = a^{-1} (y - b) \\bmod 26$.');
        s0.table(['$a$'].concat(B.AFFINE_A.map(String)), [['$a^{-1} \\bmod 26$'].concat(B.AFFINE_A.map(function (a) { return String(B.INV26[a]); }))], { mono: true });

        /* the shortcut: the two most frequent letters are E (4) and T (19) */
        var ord = [];
        for (var i = 0; i < 26; i++) ord.push(i);
        ord.sort(function (x, y) { return counts[y] - counts[x] || x - y; });
        var y1 = ord[0], y2 = ord[1], sc = S.step('A shortcut from the two most frequent letters');
        sc.p('The most frequent ciphertext letters are ' + tx.chr(y1) + ' (' + counts[y1] + ') and ' + tx.chr(y2) + ' (' + counts[y2] + '). Guess that they stand for E $= 4$ and T $= 19$. Two equations:');
        sc.lines([y1 + ' &\\equiv 4a + b \\pmod{26}', y2 + ' &\\equiv 19a + b \\pmod{26}']);
        var dy = B.mod26(y2 - y1), sa = null;
        sc.p('Subtract the first from the second: $15 a \\equiv ' + dy + ' \\pmod{26}$. Since $15^{-1} \\equiv 7$, $a \\equiv 7 \\cdot ' + dy + ' \\equiv ' + B.mod26(7 * dy) + '$.');
        var ga = B.mod26(7 * dy);
        if (B.INV26[ga]) {
            var gb = B.mod26(y1 - 4 * ga);
            sa = { a: ga, b: gb };
            sc.p('Then $b \\equiv ' + y1 + ' - 4 \\cdot ' + ga + ' \\equiv ' + gb + '$. The guessed key $(a, b) = (' + ga + ', ' + gb + ')$ gives:');
            sc.pre(B.preview(B.affine(v.text, ga, gb, true), 80));
        } else sc.p('But $\\gcd(' + ga + ', 26) = ' + nt.gcd(BigInt(ga), 26n) + ' \\ne 1$: no valid key, so the guess E, T was wrong. Hence the search over all keys.');

        var rows = [];
        B.AFFINE_A.forEach(function (a) {
            var ai = B.INV26[a];
            for (var b = 0; b < 26; b++) {
                var map = [];
                for (var y = 0; y < 26; y++) map[y] = (ai * (y - b + 26)) % 26;
                var dec = c.map(function (y) { return map[y]; });
                rows.push({ a: a, b: b, fit: B.fitness(dec), chi: B.chi2(B.countCodes(dec)) });
            }
        });
        rows.sort(function (p, q) { return q.fit - p.fit || p.a - q.a || p.b - q.b; });
        var best = rows[0], second = rows[1];
        var s2 = S.step('Try all 312 keys and rank them by English fitness');
        s2.p('Each key decrypts the text; the score is the average $\\log_{10}$ probability of its quadgrams in English (about $' + B.EN_FIT + '$ for English, higher is better). The $\\chi^2$ of the letter counts is shown as a second opinion.');
        s2.table(['Rank', '$a$', '$b$', 'Fitness', '$\\chi^2$', 'Start of the decryption'], rows.map(function (r, i) {
            return [i + 1, r.a, r.b, f(r.fit, 3), f(r.chi, 1), B.preview(B.affine(v.text, r.a, r.b, true), 34)];
        }), { mono: true, max: 12, hl: 0 });
        if (sa) s2.p(sa.a === best.a && sa.b === best.b ? 'The shortcut found the same key.' : 'The shortcut key $(' + sa.a + ', ' + sa.b + ')$ is not the best one: the most frequent letters were not exactly E and T.');

        var ai = B.INV26[best.a], plain = B.layout(v.text, B.affine(v.text, best.a, best.b, true));
        var s3 = S.step('Decrypt with $a = ' + best.a + '$, $b = ' + best.b + '$');
        s3.p('The best key leads by ' + f(best.fit - second.fit, 2) + ' per quadgram over $(' + second.a + ', ' + second.b + ')$. With $a^{-1} = ' + ai + '$ every letter becomes $x = ' + ai + ' (y - ' + best.b + ') \\bmod 26$:');
        var head = ['Cipher'], row = ['Plain'];
        for (var y = 0; y < 26; y++) { head.push(tx.chr(y)); row.push(tx.chr(ai * (y - best.b + 26))); }
        s3.table(head, [row], { mono: true });
        s3.pre(plain);
        if (best.fit < -5) s3.p('Even the best key is far from English: the text is probably not an affine cipher of English.');
        S.result(Calc.esc(plain), { copy: plain, label: 'Plaintext' });
        var name = best.a === 1 ? ' (with $a = 1$ this is a Caesar shift)' : best.a === 25 && best.b === 25 ? ' (this key is the Atbash cipher)' : '';
        S.note('Key $a = ' + best.a + '$, $b = ' + best.b + '$: encryption $y = (' + best.a + 'x + ' + best.b + ') \\bmod 26$' + name + '.');
        if (B.grouped(v.text)) S.note('The ciphertext came in groups of equal length, which hide the word breaks, so the plaintext letters are run together.');
    }
});
