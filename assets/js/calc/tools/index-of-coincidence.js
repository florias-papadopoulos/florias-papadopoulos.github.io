/* Toolbox: index of coincidence of a text, Friedman's estimate, and the average IC of the columns for periods 1..P
   (the period with English-like columns is the Vigenère key length). */
Calc.tool({
    id: 'index-of-coincidence',
    live: true,
    inputs: [
        { id: 'text', type: 'textarea', label: 'Text', rows: 6, maxLength: 100000, placeholder: 'Paste a ciphertext' },
        { id: 'maxp', type: 'num', label: 'Periods to try', value: '20', width: 's', help: 'From 1 up to this number (at most 40).' }
    ],
    examples: [
        { text: 'EHRHP UYTGU MLFHD EXXIG RCCYB QSROT UXRRE COJLX RVCSR OIILP VRGME TMESH VVGSE FNRNR YTQHA EUPTE BQDRO TUXAZ PVPBE MJUPD GAIXE PAGEI EFFNG BPZGD HBGIC VVEJT XVELN QPVFG PTUXA VNEHR KMEND MNEPS BZKJB XYNRR RXRTB GEELL ZCDPN LWVQQ AEHYK NESRT EEQYO AXSWG SEFTM CBCSR OIIXY EJAMJ ALMRR IKRLC UHJKU PMGKY JGPDG AICVR HGAIB RATON VEVYG GAVFH RHGAI CBYGJ BRKRC NVZLK FEHRG MXUET ETMEY PFGML VPTTL TXRDF AEMII CLSGX PVIPN NGHIB WLRWW CBHLL MLIBF GUMLV FWERI METEO JGWFS EHROE CYPYV GXYRO IABRX PLRNM MIROW NBXVE AOHKI UPZFS XIWBC TJHXI NGEYE IIFHH BAEUA PVRKQ VGMES HVVNY DORXY REIZX XYRQI ELXXE PYYBK YGLPC XEIRO OIXVK UPHVE PJGSE LAEUG ZLQXE TUZTU XVKUP SGHVZ RDOSM LVVCL VOIJJ SIPAR VVEHR KSWGS EZAEU RGEEM SCQLN LHRVR WSR', maxp: '20' },
        { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood.', maxp: '12' }
    ],
    run: function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        var L = tx.letters(v.text), N = L.length;
        if (N < 2) Calc.fail('The IC needs at least two letters A to Z.', 'text');
        if (!(v.maxp >= 1 && v.maxp <= 40) || Math.floor(v.maxp) !== v.maxp) Calc.fail('Choose a whole number from 1 to 40.', 'maxp');
        var P = Math.min(v.maxp, Math.floor(N / 2) || 1);
        var c = B.codes(L), counts = B.countCodes(c), sum = 0;
        counts.forEach(function (k) { sum += k * (k - 1); });
        var ic = sum / (N * (N - 1));

        var s1 = S.step('Count the letters');
        s1.p('$N = ' + N + '$ letters (other characters ignored). For each letter its count $n_i$ and the number of ordered pairs $n_i (n_i - 1)$:');
        [[0, 13], [13, 26]].forEach(function (h) {
            var head = ['Letter'], r1 = ['$n_i$'], r2 = ['$n_i(n_i-1)$'];
            for (var i = h[0]; i < h[1]; i++) { head.push(tx.chr(i)); r1.push(counts[i]); r2.push(counts[i] * (counts[i] - 1)); }
            s1.table(head, [r1, r2], { mono: true });
        });

        var s2 = S.step('The index of coincidence');
        s2.p('Pick two different positions of the text at random: the IC is the probability that they hold the same letter.');
        s2.math('\\mathrm{IC} = \\frac{\\sum_i n_i (n_i - 1)}{N (N - 1)} = \\frac{' + sum + '}{' + N + ' \\cdot ' + (N - 1) + '} = \\frac{' + sum + '}{' + N * (N - 1) + '} = ' + f(ic, 4));
        s2.p('For English text the IC is about $\\kappa_p = \\sum p_i^2 \\approx ' + f(B.EN_IC, 4) + '$, for uniformly random letters $\\kappa_r = 1/26 \\approx 0.0385$. A substitution with one alphabet does not change the IC; several alphabets in turn push it toward $\\kappa_r$.');
        var den = (N - 1) * ic - N * B.RANDOM_IC + B.EN_IC, fr = den > 0 ? (B.EN_IC - B.RANDOM_IC) * N / den : null;
        if (N > 20) {
            var s3 = S.step('Friedman\'s estimate of the key length');
            s3.p('If the text was enciphered with $L$ alphabets used in turn, the expected IC is a mix of $\\kappa_p$ (two letters in the same column) and $\\kappa_r$ (different columns). Solving for $L$:');
            s3.math('L \\approx \\frac{(\\kappa_p - \\kappa_r) N}{(N - 1)\\,\\mathrm{IC} - N \\kappa_r + \\kappa_p} = ' + (fr == null ? '\\text{(no estimate)}' : f(fr, 2)));
            s3.p(fr == null || fr < 1.3 ? 'This is about 1: one alphabet, so no periodic key (or plain text).' : 'Friedman\'s estimate is rough (it varies a lot with chance), so the period test below is more reliable.');
        }

        var rows = [];
        for (var p = 1; p <= P; p++) rows.push({ p: p, ic: B.periodIC(c, p) });
        var best = B.pickPeriod(rows.filter(function (r) { return N / r.p >= 8; }));   // columns of fewer than 8 letters are too noisy
        var s4 = S.step('Average IC of the columns, for every period from 1 to ' + P);
        s4.p('For a period $p$, write the letters in $p$ columns (positions $1, 1 + p, 1 + 2p, \\dots$ go in the first column, and so on) and average the IC of the columns. When $p$ is the key length, each column was enciphered with one alphabet, so its IC is English-like. Multiples of the key length score high too.');
        s4.table(['Period', 'Column length', 'Average IC', 'Bar', 'vs English'], rows.map(function (r) {
            var len = Math.floor(N / r.p);
            return [r.p, len + (N % r.p ? ' or ' + (len + 1) : ''), r.p === best ? { v: f(r.ic, 4), hl: true } : f(r.ic, 4), B.bar((r.ic - 0.03) / 0.05, 14), f(100 * r.ic / B.EN_IC, 0) + ' %'];
        }), { mono: true, max: 40, hl: best ? best - 1 : undefined });
        if (P < v.maxp) s4.p('Periods above ' + P + ' are left out: the columns would hold fewer than 2 letters.');
        var top = 0;
        rows.forEach(function (r) { if (r.ic > top) top = r.ic; });
        if (best) {
            var mult = rows.filter(function (r) { return r.p > best && r.p % best === 0 && r.ic > B.RANDOM_IC + 0.6 * (top - B.RANDOM_IC); }).map(function (r) { return r.p; });
            s4.p('The smallest period whose columns come close to the best average (' + f(top, 4) + ') is $p = ' + best + '$' + (mult.length ? ', and its multiples ' + mult.join(', ') + ' confirm it.' : '.'));
            if (best === 1) s4.p('Period 1 already looks like English: the text uses a single alphabet (plain text, a transposition or a monoalphabetic substitution).');
        } else s4.p('No period gives English-like columns: the key may be longer than ' + P + ', the text too short, or it is not a periodic cipher.');
        S.result(['$\\mathrm{IC} = ' + f(ic, 4) + '$', best ? 'Most likely period: $' + best + '$' : 'No clear period up to ' + P], { copy: 'IC ' + f(ic, 4) + '\nperiod ' + (best || 'none'), label: 'Index of coincidence' });
        if (N < 100) S.note('Short text: with fewer than about 100 letters the IC varies a lot by chance.');
    }
});
