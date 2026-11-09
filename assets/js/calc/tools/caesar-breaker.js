/* Toolbox: break a Caesar cipher: all 26 shifts ranked by English quadgram fitness (or chi-squared). */
Calc.tool({
    id: 'caesar-breaker',
    live: true,
    inputs: [
        { id: 'text', type: 'textarea', label: 'Ciphertext', rows: 5, maxLength: 50000, placeholder: 'Paste a Caesar ciphertext' },
        { id: 'rank', type: 'select', label: 'Rank the shifts by', value: 'quad', options: [['quad', 'Quadgram fitness (best for any length)'], ['chi', 'Chi-squared of the letter counts']] }
    ],
    examples: [
        { text: 'Zy xlcvpe oljd esp dbflcp qtwwpo htes nlced wzyr mpqzcp olhy. Qlcxpcd mczfrse laawpd, nsppdp lyo mldvped zq mczhy prrd, hstwp esp mlvpc dzwo hlcx mcplo qczx l htyozh esle zapypo zyez esp decppe. Nstwocpy cly mpehppy esp delwwd htes esptc ozrd, lyo esp xfdtntlyd awljpo esp dlxp escpp dzyrd fyetw pgpy esp atrpzyd dppxpo ez vyzh esp hzcod. Mj yzzy pgpcjestyr hld dzwo lyo esp dbflcp hld bftpe lrlty.', rank: 'quad' },
        { text: 'Aol xbpjr iyvdu mve qbtwz vcly aol shgf kvn.', rank: 'quad' },
        { text: 'MAX GBZAM MKTBG EXYM MAX VBMR TM T JNTKMXK ITLM XEXOXG TGW KHEEXW LEHPER MAKHNZA MAX LEXXIBGZ MHPGL HY MAX OTEEXR. BG MAX WBGBGZ VTK T MBKXW PTBMXK IHNKXW VHYYXX YHK MPH MKTOXEEXKL PAH ATW GXOXK FXM UXYHKX, TGW UR MAX MBFX MAX YBKLM ZKXR EBZAM TIIXTKXW HOXK MAX ABEEL MAXR ATW MHEW XTVA HMAXK MAX LMHKBXL HY MAXBK EBOXL, PABVA GXBMAXK HY MAXF ATW XOXK MHEW TGRHGX XELX.', rank: 'chi' }
    ],
    run: function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        var L = tx.letters(v.text), N = L.length;
        if (!N) Calc.fail('There are no letters A to Z in this text.', 'text');
        var c = B.codes(L), counts = B.countCodes(c);
        var byQuad = v.rank === 'quad' && N >= 4;

        var top = 0;
        for (var i = 1; i < 26; i++) if (counts[i] > counts[top]) top = i;
        var s1 = S.step('Count the ciphertext letters');
        s1.p('$N = ' + N + '$ letters. A Caesar cipher moves every letter by the same shift $k$: $y = (x + k) \\bmod 26$. Counts move with the letters, so the most frequent ciphertext letter, ' + tx.chr(top) + ' (' + counts[top] + ' times), probably stands for E. That guess gives $k = \\mathrm{' + tx.chr(top) + '} - \\mathrm{E} = ' + top + ' - 4 \\equiv ' + B.mod26(top - 4) + '$.');
        s1.p('Rather than trust one letter, every shift is tried below.');

        var rows = [];
        for (var k = 0; k < 26; k++) {
            var dec = c.map(function (x) { return (x - k + 26) % 26; });
            rows.push({ k: k, chi: B.chi2(B.countCodes(dec)), fit: N >= 4 ? B.fitness(dec) : null });
        }
        rows.sort(byQuad ? function (a, b) { return b.fit - a.fit || a.k - b.k; } : function (a, b) { return a.chi - b.chi || a.k - b.k; });
        var best = rows[0], second = rows[1];
        var s2 = S.step('Decrypt with all 26 shifts and score each one');
        s2.p(byQuad
            ? 'Every candidate $x = (y - k) \\bmod 26$ gets the average $\\log_{10}$ probability of its quadgrams (groups of 4 consecutive letters) in English: about $' + B.EN_FIT + '$ for English, about $' + B.RANDOM_FIT + '$ for random letters. Higher is better. The $\\chi^2$ of the letter counts against English is shown too (lower is better).'
            : 'Every candidate $x = (y - k) \\bmod 26$ gets $\\chi^2 = \\sum (n_i - E_i)^2 / E_i$, the distance of its letter counts from English. Lower is better.' + (v.rank === 'quad' ? ' (Fewer than 4 letters: quadgrams cannot be used.)' : ''));
        s2.table(['Rank', 'Shift $k$', 'Key (A becomes)', 'Fitness', '$\\chi^2$', 'Start of the decryption'], rows.map(function (r, i) {
            return [i + 1, r.k, tx.chr(r.k), f(r.fit, 3), f(r.chi, 1), B.preview(B.caesar(v.text, 26 - r.k), 36)];
        }), { mono: true, max: 26, hl: 0 });

        var plain = B.layout(v.text, B.caesar(v.text, 26 - best.k));
        var s3 = S.step('The winner');
        if (byQuad) s3.p('Shift $k = ' + best.k + '$ has fitness $' + f(best.fit, 3) + '$, ahead of shift ' + second.k + ' at $' + f(second.fit, 3) + '$ (a gap of ' + f(best.fit - second.fit, 2) + ' per quadgram, so about $10^{' + f((best.fit - second.fit) * Math.max(1, N - 3), 0) + '}$ times more likely as English).');
        else s3.p('Shift $k = ' + best.k + '$ has the smallest $\\chi^2 = ' + f(best.chi, 1) + '$, next is shift ' + second.k + ' with $' + f(second.chi, 1) + '$.');
        if (best.fit != null && best.fit < -5) s3.p('Even the best fitness is far from English: the text is probably not a Caesar cipher of English.');
        s3.p('Decrypt every letter with $x = (y - ' + best.k + ') \\bmod 26$, keeping spaces and punctuation:');
        s3.pre(plain);
        S.result(Calc.esc(plain), { copy: plain, label: 'Plaintext' });
        S.note('Shift $k = ' + best.k + '$ (A becomes ' + tx.chr(best.k) + ')' + (best.k === 13 ? ', that is ROT13' : '') + '.');
        if (N < 20) S.note('Short text: with few letters several shifts can look plausible, so check the runners-up.');
        if (B.grouped(v.text)) S.note('The ciphertext came in groups of equal length, which hide the word breaks, so the plaintext letters are run together.');
    }
});
