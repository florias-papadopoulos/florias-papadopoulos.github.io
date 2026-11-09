/* Toolbox: frequency analysis of a text: letter counts next to English, bigrams, trigrams, doubled letters, IC. */
Calc.tool({
    id: 'frequency-analysis',
    live: true,
    inputs: [
        { id: 'text', type: 'textarea', label: 'Text', rows: 6, maxLength: 100000, placeholder: 'Paste a ciphertext or any text' },
        { id: 'sort', type: 'select', label: 'Order of the letter table', value: 'count', options: [['count', 'Most frequent first'], ['alpha', 'Alphabetical']] }
    ],
    examples: [
        { text: 'ZIT GSR SOUIZIGXLT ATTHTK ESODWTR ZIT FQKKGV LZQOKL TCTKN TCTFOFU WTYGKT ZIT LXF VTFZ RGVF. IT ZKODDTR ZIT VOEA, HGSOLITR ZIT UKTQZ STFL XFZOS OZ LIGFT SOAT VQZTK, QFR VKGZT ZIT VTQZITK OF Q LDQSS WGGA VOZI Q UKTTF EGCTK. LIOHL HQLLTR YQK GXZ QZ LTQ, QFR FGFT GY ZIT LQOSGKL TCTK AFTV IOL FQDT, NTZ TQEI GY ZITD ZKXLZTR ZIT SOUIZ IT ATHZ WXKFOFU ZIKGXUI ZIT SGFU VOFZTK FOUIZL. GF DQKATZ RQNL ZIT LJXQKT YOSSTR VOZI EQKZL SGFU WTYGKT RQVF. YQKDTKL WKGXUIZ QHHSTL, EITTLT QFR WQLATZL GY WKGVF TUUL, VIOST ZIT WQATK LGSR VQKD WKTQR YKGD Q VOFRGV ZIQZ GHTFTR GFZG ZIT LZKTTZ. EIOSRKTF KQF WTZVTTF ZIT LZQSSL VOZI ZITOK RGUL, QFR ZIT DXLOEOQFL HSQNTR ZIT LQDT ZIKTT LGFUL XFZOS TCTF ZIT HOUTGFL LTTDTR ZG AFGV ZIT VGKRL. WN FGGF TCTKNZIOFU VQL LGSR QFR ZIT LJXQKT VQL JXOTZ QUQOF.', sort: 'count' },
        { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families.', sort: 'count' },
        { text: 'EH ULCAYB OLOM BSP IKCLCU ZQWWUX ETEX WICEI FWYR RYNZCU XIHY. VUZXPHM JCZKAPE LFJTPD, SBMPDU UVO MQMSPEI IN MCEQV PRWM, ESTBY BSP RUSPC IITO HQLU MCUUL QCEG I HTDXWH EXUB ZAUHMO ZDNW ESU MBCPUN. KSTBXZPY HUV MPJQMPY JBM DEQFTD HYNP ESUCZ OZWM, IYO JBM XFICKTLDM XWLOYL ESU MIXP JBZPP IIVRD KHBTW UPMY EXY XTRUIVD DUYUPO JI SYZM NPP HELLD. MO HWZY UPMCJJBQYR MUA DZBX IYO JBM DBKUZP HQM YFTUN IRLYH. I DPSLME XUMALRU CA ZYBS ID DJLWYR QM BSP CYBSZT NPLE XCLPD YN. NZC SYVEFHCMD NBYZVD QHL DZBXQPCI NZFDJYL DTCJTP NYJPPCI NPLE IBQQEUX WC CUJTLNUX TPEJYZD, LDX NZC SYVEFHCMD AQNQPYJ LMLOULA MCEEM ESUG JJ NEOVETDA. BSP CIAE NEGUZY BYBEPH CV L WEHO PYWFQDS JYFE TI UTXZIN IWHQSA P, QEFTZHUX JJ E QHL L, LDX BSLJ MQYRBY NLNJ OVOTT GIYJ ACVRD QHL RPDYZLWI QPZ MUFQPGUX BSPYL TPEJYZD HULM DLVY.', sort: 'alpha' }
    ],
    run: function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        /* English bigram and trigram shares in percent, from the same Gutenberg corpus as data/english-quadgrams.js */
        var EN2 = [['TH', 3.15], ['HE', 2.82], ['IN', 1.86], ['ER', 1.78], ['AN', 1.70], ['ND', 1.34], ['HA', 1.33], ['RE', 1.31], ['ED', 1.18], ['OU', 1.17], ['ES', 1.15], ['TO', 1.13], ['AT', 1.11], ['EN', 1.10], ['EA', 1.08]];
        var EN3 = [['THE', 1.89], ['AND', 0.98], ['ING', 0.75], ['HER', 0.57], ['THA', 0.51], ['HAT', 0.45], ['ERE', 0.41], ['HIS', 0.36], ['YOU', 0.34], ['ETH', 0.34], ['NTH', 0.34], ['WAS', 0.32], ['ENT', 0.32], ['THI', 0.31], ['FOR', 0.30]];
        var raw = tx.deaccent(v.text), L = tx.letters(raw), N = L.length;
        if (!N) Calc.fail('There are no letters A to Z in this text.', 'text');
        var counts = tx.counts(L), other = raw.replace(/\s/g, '').length - N;

        var s1 = S.step('Keep only the letters');
        s1.p('The text has ' + raw.length + ' characters. Accents are removed and case is ignored; spaces' + (other ? ' and the ' + other + ' other characters (digits, punctuation)' : '') + ' are not counted. That leaves $N = ' + N + '$ letters:');
        s1.pre(tx.groups(L.length > 600 ? L.slice(0, 600) + '...' : L, 5));

        var order = [];
        for (var i = 0; i < 26; i++) order.push(i);
        var byCount = order.slice().sort(function (a, b) { return counts[b] - counts[a] || a - b; });
        var enOrder = order.slice().sort(function (a, b) { return tx.EN[b] - tx.EN[a]; });
        var scale = Math.max(14, Math.ceil(100 * counts[byCount[0]] / N));
        var rows = (v.sort === 'alpha' ? order : byCount).map(function (k) {
            var pct = 100 * counts[k] / N, d = pct - tx.EN[k];
            return [tx.chr(k), counts[k], f(pct, 2), B.bar(pct / scale, 12), f(tx.EN[k], 2), (d > 0 ? '+' : '') + f(d, 2)];
        });
        var s2 = S.step('Count every letter and compare with English');
        s2.p('Share of a letter $=$ its count $/\\ N \\times 100$. The bar shows the share in the text (a full bar is ' + scale + ' percent); the last column is the share in the text minus the share in ordinary English.');
        s2.table(['Letter', 'Count', 'Text %', 'Bar', 'English %', 'Difference'], rows, { mono: true, max: 26 });

        var seen = byCount.filter(function (k) { return counts[k] > 0; });
        var s3 = S.step('Line up the letters by frequency');
        s3.pre('This text: ' + seen.map(function (k) { return tx.chr(k); }).join(' ') + '\nEnglish:   ' + enOrder.map(function (k) { return tx.chr(k); }).join(' '));
        s3.p('In a monoalphabetic substitution (Caesar, affine, any mixed alphabet) every letter keeps its count, so the top of the first line usually stands for E, T, A, O, I, N. In a transposition the letters themselves are English and the two lines nearly agree. A polyalphabetic cipher (Vigenère) flattens the counts.');

        function grams(n) {
            var c = {}, tot = 0;
            for (var i = 0; i + n <= N; i++) { var g = L.substr(i, n); c[g] = (c[g] || 0) + 1; tot++; }
            var list = Object.keys(c).sort(function (a, b) { return c[b] - c[a] || (a < b ? -1 : 1); });
            return { c: c, tot: tot, list: list };
        }
        [[2, 'bigrams', EN2], [3, 'trigrams', EN3]].forEach(function (g) {
            if (N < g[0] + 1) return;
            var r = grams(g[0]), rows2 = [];
            for (var i = 0; i < 15; i++) {
                var t = r.list[i];
                rows2.push([i + 1, t || '', t ? r.c[t] : '', t ? f(100 * r.c[t] / r.tot, 2) : '', g[2][i][0], f(g[2][i][1], 2)]);
            }
            var st = S.step('The most common ' + g[1]);
            st.p('Every ' + g[0] + ' consecutive letters (overlapping, across word gaps), ' + r.tot + ' in all, ' + r.list.length + ' different:');
            st.table(['Rank', 'Text', 'Count', 'Text %', 'English', 'English %'], rows2, { mono: true, max: 15 });
            if (g[0] === 2) {
                var dbl = r.list.filter(function (x) { return x.charAt(0) === x.charAt(1); }).slice(0, 8);
                st.p(dbl.length ? 'Doubled letters: ' + dbl.map(function (x) { return x + ' (' + r.c[x] + ')'; }).join(', ') + '. In English the most common are LL, EE, SS, OO, TT, FF.' : 'There are no doubled letters (a Playfair ciphertext never has them inside a pair).');
            }
        });

        var ic = tx.ic(L), chi = B.chi2(counts), sum = 0;
        counts.forEach(function (k) { sum += k * (k - 1); });
        var s5 = S.step('Index of coincidence and distance from English');
        s5.p('The index of coincidence is the chance that two letters drawn from the text are the same letter:');
        s5.math('\\mathrm{IC} = \\frac{\\sum_i n_i (n_i - 1)}{N (N - 1)} = \\frac{' + sum + '}{' + N + ' \\cdot ' + (N - 1) + '} = ' + f(ic, 4));
        s5.p('English gives about $' + f(B.EN_IC, 4) + '$, letters drawn uniformly at random $1/26 \\approx 0.0385$.');
        s5.math('\\chi^2 = \\sum_i \\frac{(n_i - E_i)^2}{E_i} = ' + f(chi, 1) + ', \\quad E_i = N \\cdot p_i^{\\text{English}}');
        var verdict;
        if (N < 40) verdict = 'With only ' + N + ' letters these numbers are rough: a few hundred letters give a reliable picture.';
        else if (ic > 0.058 && chi < 100 + 0.3 * N) verdict = 'The IC is English-like and the letters match English: plain English, or a transposition (the letters were only moved).';
        else if (ic > 0.058) verdict = 'The IC is English-like but the letters do not match English: probably a monoalphabetic substitution (Caesar, affine or a mixed alphabet).';
        else if (ic < 0.047) verdict = 'The IC is close to random: a polyalphabetic cipher such as Vigenère (try the index of coincidence tool for the key length), or random data.';
        else verdict = 'The IC lies between English and random: possibly a polyalphabetic cipher with a short key.';
        s5.p(verdict);

        var top = seen.slice(0, 6).map(function (k) { return tx.chr(k); }).join(' ');
        S.result(['Most frequent letters: ' + top, '$\\mathrm{IC} = ' + f(ic, 4) + '$, $N = ' + N + '$ letters'], {
            label: 'Frequencies',
            copy: byCount.filter(function (k) { return counts[k] > 0; }).map(function (k) { return tx.chr(k) + '\t' + counts[k] + '\t' + f(100 * counts[k] / N, 2); }).join('\n') + '\nIC\t' + f(ic, 4)
        });
        S.note(verdict);
    }
});
