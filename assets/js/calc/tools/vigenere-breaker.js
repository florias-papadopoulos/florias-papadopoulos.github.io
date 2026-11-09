/* Toolbox: break a Vigenère cipher: the key length (IC of the columns, Kasiski), each column solved as a Caesar
   shift by chi-squared, a quadgram polish, the key and the plaintext. */
Calc.tool({
    id: 'vigenere-breaker',
    inputs: [
        { id: 'text', type: 'textarea', label: 'Ciphertext', rows: 6, maxLength: 50000, placeholder: 'Paste a Vigenère ciphertext (a few hundred letters is best)' },
        { id: 'len', type: 'select', label: 'Key length', value: 'auto', options: [['auto', 'Find it']].concat((function () { var o = []; for (var i = 1; i <= 30; i++) o.push([String(i), String(i)]); return o; })()) }
    ],
    button: 'Break',
    examples: [
        { text: 'EHRHP UYTGU MLFHD EXXIG RCCYB QSROT UXRRE COJLX RVCSR OIILP VRGME TMESH VVGSE FNRNR YTQHA EUPTE BQDRO TUXAZ PVPBE MJUPD GAIXE PAGEI EFFNG BPZGD HBGIC VVEJT XVELN QPVFG PTUXA VNEHR KMEND MNEPS BZKJB XYNRR RXRTB GEELL ZCDPN LWVQQ AEHYK NESRT EEQYO AXSWG SEFTM CBCSR OIIXY EJAMJ ALMRR IKRLC UHJKU PMGKY JGPDG AICVR HGAIB RATON VEVYG GAVFH RHGAI CBYGJ BRKRC NVZLK FEHRG MXUET ETMEY PFGML VPTTL TXRDF AEMII CLSGX PVIPN NGHIB WLRWW CBHLL MLIBF GUMLV FWERI METEO JGWFS EHROE CYPYV GXYRO IABRX PLRNM MIROW NBXVE AOHKI UPZFS XIWBC TJHXI NGEYE IIFHH BAEUA PVRKQ VGMES HVVNY DORXY REIZX XYRQI ELXXE PYYBK YGLPC XEIRO OIXVK UPHVE PJGSE LAEUG ZLQXE TUZTU XVKUP SGHVZ RDOSM LVVCL VOIJJ SIPAR VVEHR KSWGS EZAEU RGEEM SCQLN LHRVR WSR', len: 'auto' },
        { text: 'EH ULCAYB OLOM BSP IKCLCU ZQWWUX ETEX WICEI FWYR RYNZCU XIHY. VUZXPHM JCZKAPE LFJTPD, SBMPDU UVO MQMSPEI IN MCEQV PRWM, ESTBY BSP RUSPC IITO HQLU MCUUL QCEG I HTDXWH EXUB ZAUHMO ZDNW ESU MBCPUN. KSTBXZPY HUV MPJQMPY JBM DEQFTD HYNP ESUCZ OZWM, IYO JBM XFICKTLDM XWLOYL ESU MIXP JBZPP IIVRD KHBTW UPMY EXY XTRUIVD DUYUPO JI SYZM NPP HELLD. MO HWZY UPMCJJBQYR MUA DZBX IYO JBM DBKUZP HQM YFTUN IRLYH. I DPSLME XUMALRU CA ZYBS ID DJLWYR QM BSP CYBSZT NPLE XCLPD YN. NZC SYVEFHCMD NBYZVD QHL DZBXQPCI NZFDJYL DTCJTP NYJPPCI NPLE IBQQEUX WC CUJTLNUX TPEJYZD, LDX NZC SYVEFHCMD AQNQPYJ LMLOULA MCEEM ESUG JJ NEOVETDA. BSP CIAE NEGUZY BYBEPH CV L WEHO PYWFQDS JYFE TI UTXZIN IWHQSA P, QEFTZHUX JJ E QHL L, LDX BSLJ MQYRBY NLNJ OVOTT GIYJ ACVRD QHL RPDYZLWI QPZ MUFQPGUX BSPYL TPEJYZD HULM DLVY.', len: 'auto' },
        { text: 'EHRHP UYTGU MLFHD EXXIG RCCYB QSROT UXRRE COJLX RVCSR OIILP VRGME TMESH VVGSE FNRNR YTQHA EUPTE BQDRO TUXAZ PVPBE MJUPD GAIXE PAGEI EFFNG BPZGD HBGIC VVEJT XVELN QPVFG PTUXA VNEHR KMEND MNEPS BZKJB XYNRR RXRTB GEELL ZCDPN LWVQQ AEHYK NESRT EEQYO AXSWG SEFTM CBCSR OIIXY EJAMJ ALMRR IKRLC UHJKU PMGKY JGPDG AICVR HGAIB RATON VEVYG GAVFH RHGAI CBYGJ BRKRC NVZLK FEHRG MXUET ETMEY PFGML VPTTL TXRDF AEMII CLSGX PVIPN NGHIB WLRWW CBHLL MLIBF GUMLV FWERI METEO JGWFS EHROE CYPYV GXYRO IABRX PLRNM MIROW NBXVE AOHKI UPZFS XIWBC TJHXI NGEYE IIFHH BAEUA PVRKQ VGMES HVVNY DORXY REIZX XYRQI ELXXE PYYBK YGLPC XEIRO OIXVK UPHVE PJGSE LAEUG ZLQXE TUZTU XVKUP SGHVZ RDOSM LVVCL VOIJJ SIPAR VVEHR KSWGS EZAEU RGEEM SCQLN LHRVR WSR', len: '7' }
    ],
    run: function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        var L = tx.letters(v.text), N = L.length;
        if (N < 8) Calc.fail('The breaker needs at least 8 letters A to Z (a few hundred are best).', 'text');
        var c = B.codes(L), forced = v.len === 'auto' ? 0 : Number(v.len);
        if (forced && forced > N / 2) Calc.fail('A key of length ' + forced + ' leaves fewer than 2 letters per column. Choose a shorter one.', 'len');
        var cs = N > 3000 ? c.slice(0, 3000) : c;   // the polish scores the first 3000 letters (plenty)
        var maxL = Math.max(1, Math.min(20, Math.floor(N / 4)));

        function solveCols(p) {
            var cols = B.columns(c, p), key = [], tables = [];
            cols.forEach(function (col) {
                var r = [];
                for (var k = 0; k < 26; k++) r.push({ k: k, chi: B.chi2(B.countCodes(col.map(function (y) { return (y - k + 26) % 26; }))) });
                r.sort(function (a, b) { return a.chi - b.chi || a.k - b.k; });
                key.push(r[0].k);
                tables.push(r);
            });
            return { key: key, tables: tables };
        }
        function decode(key, cc) { var p = key.length; return (cc || c).map(function (y, i) { return (y - key[i % p] + 26) % 26; }); }
        function polish(key) {
            key = key.slice();
            var fit = B.fitness(decode(key, cs)), changes = [];
            for (var round = 0; round < 4; round++) {
                var moved = false;
                for (var i = 0; i < key.length; i++) {
                    var keep = key[i], bestK = keep;
                    for (var k = 0; k < 26; k++) {
                        if (k === keep) continue;
                        key[i] = k;
                        var g = B.fitness(decode(key, cs));
                        if (g > fit + 1e-9) { fit = g; bestK = k; }
                    }
                    key[i] = bestK;
                    if (bestK !== keep) { changes.push({ i: i, from: keep, to: bestK }); moved = true; }
                }
                if (!moved) break;
            }
            return { key: key, fit: fit, changes: changes };
        }
        function word(key) { return key.map(function (k) { return tx.chr(k); }).join(''); }
        /* the shortest period of a key (KEYKEY -> KEY) */
        function shortest(key) {
            for (var p = 1; p < key.length; p++) {
                if (key.length % p) continue;
                var ok = true;
                for (var i = p; i < key.length && ok; i++) if (key[i] !== key[i - p]) ok = false;
                if (ok) return key.slice(0, p);
            }
            return key;
        }

        var ic1 = B.icCounts(B.countCodes(c));
        var s1 = S.step('First look at the ciphertext');
        s1.p('$N = ' + N + '$ letters, index of coincidence $' + f(ic1, 4) + '$ (English about $' + f(B.EN_IC, 4) + '$, random letters $0.0385$). ' + (ic1 < 0.055 ? 'The low IC fits several alphabets used in turn, as in Vigenère.' : 'The IC is English-like: maybe a short key or a single alphabet (key length 1).'));
        s1.p('Vigenère enciphers the $i$-th letter with the Caesar shift given by the $(i \\bmod L)$-th key letter: $y_i = (x_i + k_{i \\bmod L}) \\bmod 26$. Once the key length $L$ is known, every $L$-th letter forms a plain Caesar cipher.');

        var icRows = [];
        for (var p = 1; p <= maxL; p++) icRows.push({ p: p, ic: B.periodIC(c, p) });
        var icPick = B.pickPeriod(icRows.filter(function (r) { return N / r.p >= 8; })), kas = B.kasiski(c, 3, maxL), cands = [];
        if (forced) cands = [forced];
        else {
            if (icPick) cands.push(icPick);
            if (kas.likely) cands.push(kas.likely);
            icRows.slice().sort(function (a, b) { return b.ic - a.ic; }).slice(0, 5).forEach(function (r) { cands.push(r.p); });
            cands = cands.filter(function (x, i, a) { return a.indexOf(x) === i; });
        }
        var s2 = S.step('Key length from the index of coincidence of the columns');
        s2.p('For each period $p$ the letters are split into $p$ columns and the column ICs are averaged. At the true key length every column is a Caesar cipher and looks like English (IC near ' + f(B.EN_IC, 3) + ').');
        s2.table(['Period', 'Average IC', 'Bar'], icRows.map(function (r) { return [r.p, r.p === icPick ? { v: f(r.ic, 4), hl: true } : f(r.ic, 4), B.bar((r.ic - 0.03) / 0.05, 14)]; }), { mono: true, max: 20 });
        s2.p(icPick ? 'The smallest period close to the best average is $' + icPick + '$.' : 'No period stands out clearly.');
        var s3 = S.step('Key length from Kasiski repeats');
        if (kas.repeats.length) {
            var shown = kas.repeats.slice(0, 6).map(function (r) { return r.seq + ' at ' + r.pos.join(', ') + ' (distance ' + r.dists.join(', ') + ')'; });
            s3.p(kas.repeats.length + ' repeated sequences of 3 or more letters, for example:').list(shown);
            var tops = kas.tally.slice().sort(function (a, b) { return b.count - a.count || b.m - a.m; }).slice(0, 6);
            s3.p('Lengths that divide the most of the ' + kas.dists.length + ' distances: ' + tops.map(function (t) { return t.m + ' (' + t.count + ')'; }).join(', ') + '. ' + (kas.likely ? 'Kasiski suggests $' + kas.likely + '$.' : 'No clear suggestion.'));
        } else s3.p('No sequence of 3 letters repeats, so Kasiski gives no hint here.');

        var tried = cands.map(function (p) {
            var sol = solveCols(p), pol = polish(sol.key);
            return { p: p, sol: sol, chiKey: sol.key, key: pol.key, fit: pol.fit, chiFit: B.fitness(decode(sol.key, cs)), changes: pol.changes };
        });
        tried.sort(function (a, b) { return b.fit - a.fit || a.p - b.p; });
        var win = tried[0];
        /* a multiple of the true length decrypts just as well: prefer the shortest that is (nearly) as good */
        tried.forEach(function (t) { if (t !== win && win.p % t.p === 0 && t.fit >= win.fit - 0.02) win = t; });
        var red = shortest(win.key);
        var s4 = S.step(forced ? 'The forced key length' : 'Try the candidate lengths');
        s4.p(forced ? 'The key length is set to $' + forced + '$.' : 'Each candidate length is solved (next steps) and the plaintext it gives is scored with English quadgrams (average $\\log_{10}$ probability, about $' + B.EN_FIT + '$ for English). The best plaintext decides.');
        s4.table(['Length', 'Key by $\\chi^2$', 'Key after polish', 'Fitness', 'Start of the plaintext'], tried.map(function (t) {
            return [t.p, word(t.chiKey), word(t.key), f(t.fit, 3), B.preview(B.str(decode(t.key)), 30)];
        }), { mono: true, hl: tried.indexOf(win) });

        var P = win.p, cols = B.columns(c, P);
        win.sol.tables.forEach(function (r, j) {
            var col = cols[j], st = S.step('Column ' + (j + 1) + ' of ' + P + ': a Caesar cipher');
            st.p('Letters at positions $' + j + ', ' + (j + P) + ', ' + (j + 2 * P) + ', \\dots$ (' + col.length + ' letters): ' + B.str(col.slice(0, 40)) + (col.length > 40 ? '...' : '') + '. Each shift $k$ is undone and the letter counts are compared with English by $\\chi^2$; the smallest wins.');
            st.table(['Rank', 'Shift $k$', 'Key letter', '$\\chi^2$'], r.map(function (x, i) { return [i + 1, x.k, tx.chr(x.k), f(x.chi, 1)]; }), { mono: true, max: 5, hl: 0 });
            var fin = win.key[j];
            st.p('Key letter ' + (j + 1) + ': ' + tx.chr(r[0].k) + (fin !== r[0].k ? ' by $\\chi^2$, corrected to ' + tx.chr(fin) + ' by the polish below.' : '.'));
        });
        var s6 = S.step('Polish the key with quadgrams');
        s6.p('$\\chi^2$ looks at each column alone, and a short column can mislead it. Changing one key letter at a time and keeping the change when the whole plaintext scores better fixes such slips.');
        if (win.changes.length) s6.list(win.changes.map(function (ch) { return 'Key letter ' + (ch.i + 1) + ': ' + tx.chr(ch.from) + ' changed to ' + tx.chr(ch.to); })).p('Fitness ' + f(win.chiFit, 3) + ' became ' + f(win.fit, 3) + '.');
        else s6.check(true, 'No single change improves the fitness ' + f(win.fit, 3) + ': the $\\chi^2$ key stands.');

        var keyW = word(red), plain = B.layout(v.text, B.vigenere(v.text, keyW, true));
        var s7 = S.step('Decrypt with the key ' + keyW);
        if (red.length < win.key.length) s7.p('The key ' + word(win.key) + ' repeats ' + keyW + ', so the key is ' + keyW + ' (length ' + red.length + ').');
        s7.p('Subtract the key letters in turn: $x_i = (y_i - k_{i \\bmod ' + red.length + '}) \\bmod 26$. The first letters:');
        var n = Math.min(N, Math.max(24, red.length * 3), 60), kr = '';
        for (var i = 0; i < n; i++) kr += keyW.charAt(i % red.length);
        s7.pre('Cipher ' + L.slice(0, n) + '\nKey    ' + kr + '\nPlain  ' + B.vigenere(L.slice(0, n), keyW, true));
        s7.p('The whole text, with its spaces and punctuation:');
        s7.pre(plain);
        if (win.fit < -5) s7.p('The fitness is still far from English: the text may not be a Vigenère cipher, or it is too short for its key length.');
        S.result(Calc.esc(plain), { copy: plain, label: 'Plaintext' });
        S.note('Key: ' + keyW + ' (length ' + red.length + ').');
        if (B.grouped(v.text)) S.note('The ciphertext came in groups of equal length, which hide the word breaks, so the plaintext letters are run together.');
    }
});
