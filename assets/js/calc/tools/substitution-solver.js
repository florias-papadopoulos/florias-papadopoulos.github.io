/* Toolbox: solve a monoalphabetic substitution by hill climbing on English quadgram fitness, with restarts, letters
   fixed by hand, a time cap and Stop. */
Calc.tool({
    id: 'substitution-solver',
    inputs: [
        { id: 'text', type: 'textarea', label: 'Ciphertext', rows: 6, maxLength: 20000, placeholder: 'Paste a substitution ciphertext (200 letters or more works best)' },
        { id: 'fixed', type: 'text', label: 'Letters you know (optional)', optional: true, width: 'l', placeholder: 'Q=T, X=H', help: 'Ciphertext letter = plaintext letter, separated by commas. The solver keeps them.' },
        { id: 'time', type: 'select', label: 'Time limit', value: '10', options: [['5', '5 seconds'], ['10', '10 seconds'], ['20', '20 seconds'], ['40', '40 seconds']] }
    ],
    button: 'Solve',
    examples: [
        { text: 'ZIT GSR SOUIZIGXLT ATTHTK ESODWTR ZIT FQKKGV LZQOKL TCTKN TCTFOFU WTYGKT ZIT LXF VTFZ RGVF. IT ZKODDTR ZIT VOEA, HGSOLITR ZIT UKTQZ STFL XFZOS OZ LIGFT SOAT VQZTK, QFR VKGZT ZIT VTQZITK OF Q LDQSS WGGA VOZI Q UKTTF EGCTK. LIOHL HQLLTR YQK GXZ QZ LTQ, QFR FGFT GY ZIT LQOSGKL TCTK AFTV IOL FQDT, NTZ TQEI GY ZITD ZKXLZTR ZIT SOUIZ IT ATHZ WXKFOFU ZIKGXUI ZIT SGFU VOFZTK FOUIZL. GF DQKATZ RQNL ZIT LJXQKT YOSSTR VOZI EQKZL SGFU WTYGKT RQVF. YQKDTKL WKGXUIZ QHHSTL, EITTLT QFR WQLATZL GY WKGVF TUUL, VIOST ZIT WQATK LGSR VQKD WKTQR YKGD Q VOFRGV ZIQZ GHTFTR GFZG ZIT LZKTTZ. EIOSRKTF KQF WTZVTTF ZIT LZQSSL VOZI ZITOK RGUL, QFR ZIT DXLOEOQFL HSQNTR ZIT LQDT ZIKTT LGFUL XFZOS TCTF ZIT HOUTGFL LTTDTR ZG AFGV ZIT VGKRL. WN FGGF TCTKNZIOFU VQL LGSR QFR ZIT LJXQKT VQL JXOTZ QUQOF.', fixed: '', time: '10' },
        { text: 'Z PABOAQ JAPPZCA FP LKIX ZP PQOLKC ZP QDA JAQDLR QDZQ DFRAP FQ. SLO BAKQTOFAP BIAOHP ZKR PLIRFAOP QOTPQAR PFJMIA BFMDAOP QDZQ PDFSQAR LO OAMIZBAR IAQQAOP, ZKR SLO BAKQTOFAP MZQFAKQ OAZRAOP EOLHA QDAJ EX BLTKQFKC. QDA JLPQ BLJJLK IAQQAO FK Z ILKC AKCIFPD QAWQ FP ZIJLPQ ZIVZXP A, SLIILVAR EX Q ZKR Z, ZKR QDZQ PFKCIA SZBQ TKRFR JZKX HFKCP ZKR CAKAOZIP VDL EAIFAUAR QDAFO IAQQAOP VAOA PZSA. QDA KFCDQ QOZFK IASQ QDA BFQX ZQ Z NTZOQAO MZPQ AIAUAK ZKR OLIIAR PILVIX QDOLTCD QDA PIAAMFKC QLVKP LS QDA UZIIAX. FK QDA RFKFKC BZO Z QFOAR VZFQAO MLTOAR BLSSAA SLO QVL QOZUAIIAOP VDL DZR KAUAO JAQ EASLOA, ZKR EX QDA QFJA QDA SFOPQ COAX IFCDQ ZMMAZOAR LUAO QDA DFIIP QDAX DZR QLIR AZBD LQDAO QDA PQLOFAP LS QDAFO IFUAP, VDFBD KAFQDAO LS QDAJ DZR AUAO QLIR ZKXLKA AIPA.', fixed: '', time: '10' }
    ],
    run: async function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        var L = tx.letters(v.text), N = L.length;
        if (N < 20) Calc.fail('The solver needs at least 20 letters A to Z (200 or more for a reliable answer).', 'text');
        var c = B.codes(L), counts = B.countCodes(c), i, j;

        /* letters fixed by hand: cipher -> plain */
        var fix = {}, fixPlain = {}, fixList = [];
        var fs = String(v.fixed || '').toUpperCase().replace(/\s*(->|=|:|>)\s*/g, '=').split(/[\s,;]+/).filter(Boolean);
        fs.forEach(function (t) {
            var m = /^([A-Z])=([A-Z])$/.exec(t);
            if (!m) Calc.fail('Write the known letters as pairs like Q=T, X=H ("' + t + '" is not one).', 'fixed');
            var x = m[1].charCodeAt(0) - 65, y = m[2].charCodeAt(0) - 65;
            if (fix[x] != null && fix[x] !== y) Calc.fail('The ciphertext letter ' + m[1] + ' is fixed twice, to different letters.', 'fixed');
            if (fixPlain[y] != null && fixPlain[y] !== x) Calc.fail('Two ciphertext letters are fixed to the same plaintext letter ' + m[2] + '.', 'fixed');
            if (fix[x] == null) fixList.push([x, y]);
            fix[x] = y;
            fixPlain[y] = x;
        });
        var free = [];
        for (i = 0; i < 26; i++) if (fix[i] == null) free.push(i);
        var freePlain = [];
        for (i = 0; i < 26; i++) if (fixPlain[i] == null) freePlain.push(i);
        /* swaps worth trying: two free cipher letters, at least one of them in the text */
        var pairs = [];
        for (i = 0; i < free.length; i++) for (j = i + 1; j < free.length; j++) if (counts[free[i]] || counts[free[j]]) pairs.push([free[i], free[j]]);

        var rnd = B.rng(B.hash(L + '|' + v.fixed));
        function fitOf(map) { return B.quadSum(c, map) / (N - 3); }
        function withFixed(order) {   // order: the free plain letters in the order given to the free cipher letters
            var map = [];
            fixList.forEach(function (p) { map[p[0]] = p[1]; });
            free.forEach(function (x, k) { map[x] = order[k]; });
            return map;
        }
        function randomKey() {
            var a = freePlain.slice();
            for (var k = a.length - 1; k > 0; k--) { var r = Math.floor(rnd() * (k + 1)), t = a[k]; a[k] = a[r]; a[r] = t; }
            return withFixed(a);
        }
        var enOrder = [];
        for (i = 0; i < 26; i++) enOrder.push(i);
        enOrder.sort(function (a, b) { return tx.EN[b] - tx.EN[a]; });
        function freqKey() {
            var cs = free.slice().sort(function (a, b) { return counts[b] - counts[a] || a - b; });
            var ps = enOrder.filter(function (p) { return fixPlain[p] == null; }), map = withFixed(freePlain);
            cs.forEach(function (x, k) { map[x] = ps[k]; });
            return map;
        }
        async function climb(map) {
            var best = fitOf(map), kept = 0, improved = true, ops = 0;
            while (improved) {
                improved = false;
                for (var k = 0; k < pairs.length; k++) {
                    var a = pairs[k][0], b = pairs[k][1], t = map[a];
                    map[a] = map[b]; map[b] = t;
                    var g = fitOf(map);
                    if (g > best + 1e-9) { best = g; kept++; improved = true; }
                    else { map[b] = map[a]; map[a] = t; }
                    if ((++ops & 31) === 0) { var w = S.tick(); if (w) await w; }
                }
            }
            return { map: map, fit: best, kept: kept };
        }

        var ic = B.icCounts(counts);
        var s1 = S.step('Look at the ciphertext');
        s1.p('$N = ' + N + '$ letters, ' + counts.filter(Boolean).length + ' different, index of coincidence $' + f(ic, 4) + '$. ' + (ic > 0.055 ? 'An English-like IC: one alphabet, as expected for a substitution.' : 'The IC is low for one alphabet: this may not be a simple substitution (a Vigenère cipher, for example).'));
        s1.p('A substitution replaces each letter by another one through a fixed mixed alphabet. There are $26! \\approx 4 \\cdot 10^{26}$ keys, far too many to try, so the solver climbs: it changes the key a little and keeps the change when the decryption looks more like English.');
        if (fixList.length) S.step('Letters fixed by hand').p('These stay as given; the climb only moves the other letters:').list(fixList.map(function (p) { return 'ciphertext ' + tx.chr(p[0]) + ' is plaintext ' + tx.chr(p[1]); }));

        var start = freqKey(), startFit = fitOf(start);
        var s2 = S.step('A first key from the letter frequencies');
        var byC = free.filter(function (x) { return counts[x]; }).sort(function (a, b) { return counts[b] - counts[a] || a - b; });
        s2.p('Match the ciphertext letters, most frequent first, with English letters in their usual order E T A O I N S H R D L U:');
        s2.table(['Cipher'].concat(byC.slice(0, 13).map(function (x) { return tx.chr(x); })), [['Count'].concat(byC.slice(0, 13).map(function (x) { return counts[x]; })), ['Plain'].concat(byC.slice(0, 13).map(function (x) { return tx.chr(start[x]); }))], { mono: true });
        s2.p('Its decryption has fitness $' + f(startFit, 3) + '$ (average $\\log_{10}$ probability per quadgram; English is about $' + B.EN_FIT + '$, random letters about $' + B.RANDOM_FIT + '$):');
        s2.pre(B.str(c.slice(0, 80).map(function (x) { return start[x]; })).toLowerCase() + (N > 80 ? '...' : ''));

        var cap = Number(v.time) * 1000, t0 = Date.now(), runs = [], best = null, hits = 0, why = '', maxRuns = 200;
        for (var r = 0; r < maxRuns; r++) {
            var res = await climb(r === 0 ? start.slice() : randomKey());
            var isNew = !best || res.fit > best.fit + 1e-6;
            if (best && Math.abs(res.fit - best.fit) <= 1e-6) hits++;
            if (isNew) { best = res; hits = 1; }
            runs.push({ fit: res.fit, kept: res.kept, map: res.map, isNew: isNew });
            if (hits >= 3) { why = 'the best key came out of 3 different restarts, a good sign that nothing better is nearby'; break; }
            if (Date.now() - t0 > cap) { why = 'the time limit of ' + v.time + ' seconds was reached'; break; }
        }
        if (!why) why = 'the limit of ' + maxRuns + ' restarts was reached';
        var secs = (Date.now() - t0) / 1000;

        var s3 = S.step('Hill climbing with restarts');
        s3.p('One climb: try swapping the plaintext letters of two ciphertext letters (all ' + pairs.length + ' pairs in turn) and keep the swap when the fitness goes up; repeat until no swap helps. A climb can get stuck on a hilltop that is not the summit, so the solver starts again from random keys (the first climb starts from the frequency key) and keeps the best result.');
        s3.table(['Restart', 'Fitness reached', 'Swaps kept', 'Start of the decryption', 'Best so far'], runs.map(function (x, k) {
            return [k + 1, x.fit === best.fit ? { v: f(x.fit, 4), hl: true } : f(x.fit, 4), x.kept, Calc.esc(B.str(c.slice(0, 30).map(function (y) { return x.map[y]; })).toLowerCase()), x.isNew ? 'new best' : ''];
        }), { mono: true, max: 16 });
        s3.p(runs.length + ' climbs in ' + f(secs, 2) + ' s. Stopped because ' + why + '.');

        var map = best.map, head = ['Cipher'], row = ['Plain'];
        for (i = 0; i < 26; i++) { head.push(tx.chr(i)); row.push(counts[i] ? (fix[i] != null ? { v: tx.chr(map[i]), hl: true } : tx.chr(map[i])) : '.'); }
        var encKey = '';
        for (var p = 0; p < 26; p++) { var x = map.indexOf(p); encKey += x >= 0 && counts[x] ? tx.chr(x) : '?'; }
        var s4 = S.step('The key found');
        s4.p('Each ciphertext letter and the plaintext letter it stands for (a dot: the letter does not occur, so the text says nothing about it' + (fixList.length ? '; highlighted: fixed by hand' : '') + '):');
        s4.table(head, [row], { mono: true });
        s4.p('Written the other way round, as the encryption key (plaintext alphabet on top):');
        s4.pre('Plain  ABCDEFGHIJKLMNOPQRSTUVWXYZ\nCipher ' + encKey);
        var plain = B.layout(v.text, tx.mapLetters(v.text, function (y) { return map[y]; }));
        var s5 = S.step('Decrypt');
        s5.p('Final fitness $' + f(best.fit, 3) + '$' + (best.fit > B.EN_FIT - 0.35 ? ', in the range of English text.' : best.fit > -5 ? ': close to English, but a few letters may still be wrong. Fix the ones you can read with the field above and solve again.' : ': far from English. The text may be too short, or not a simple substitution.'));
        s5.pre(plain);
        S.result(Calc.esc(plain), { copy: plain, label: 'Plaintext' });
        S.note('Key (plaintext A to Z becomes): ' + encKey + '. Rare letters are the least certain: correct them with "Letters you know".');
        if (B.grouped(v.text)) S.note('The ciphertext came in groups of equal length, which hide the word breaks, so the plaintext letters are run together.');
    }
});
