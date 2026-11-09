/* Toolbox: guess which cipher or encoding produced a text, from its character set and statistics, as a ranked list
   with the reasons and the tool to use next. */
Calc.tool({
    id: 'cipher-identifier',
    inputs: [
        { id: 'text', type: 'textarea', label: 'Ciphertext', rows: 6, maxLength: 20000, placeholder: 'Paste a text you want identified' }
    ],
    button: 'Identify',
    examples: [
        { text: 'EH ULCAYB OLOM BSP IKCLCU ZQWWUX ETEX WICEI FWYR RYNZCU XIHY. VUZXPHM JCZKAPE LFJTPD, SBMPDU UVO MQMSPEI IN MCEQV PRWM, ESTBY BSP RUSPC IITO HQLU MCUUL QCEG I HTDXWH EXUB ZAUHMO ZDNW ESU MBCPUN. KSTBXZPY HUV MPJQMPY JBM DEQFTD HYNP ESUCZ OZWM, IYO JBM XFICKTLDM XWLOYL ESU MIXP JBZPP IIVRD KHBTW UPMY EXY XTRUIVD DUYUPO JI SYZM NPP HELLD. MO HWZY UPMCJJBQYR MUA DZBX IYO JBM DBKUZP HQM YFTUN IRLYH. I DPSLME XUMALRU CA ZYBS ID DJLWYR QM BSP CYBSZT NPLE XCLPD YN. NZC SYVEFHCMD NBYZVD QHL DZBXQPCI NZFDJYL DTCJTP NYJPPCI NPLE IBQQEUX WC CUJTLNUX TPEJYZD, LDX NZC SYVEFHCMD AQNQPYJ LMLOULA MCEEM ESUG JJ NEOVETDA. BSP CIAE NEGUZY BYBEPH CV L WEHO PYWFQDS JYFE TI UTXZIN IWHQSA P, QEFTZHUX JJ E QHL L, LDX BSLJ MQYRBY NLNJ OVOTT GIYJ ACVRD QHL RPDYZLWI QPZ MUFQPGUX BSPYL TPEJYZD HULM DLVY.' },
        { text: 'SMEYO HOHTN SSLTD ERSDL EACII AREUT TNRNI TOALB AALUA GESLT EWFCS SSGMT DOULN IUIIT IRCTD NSNEK BTEOE NEHST SOTNS FDYAE HEETR RSOSA EHERR EDESM PHFRE EFTPT REYIM MTANT AAEWA DIAIK NROVI EEATG LRTHT IEEKO SELET EPLSR RTEBH OGSOE OLXMW ODDHG TMNGL EDLSA EANTS TASCI RSRTP HATED ROUAR STCNO MTLGE LLFEN TNCDI DABER RSEEI ANEDI FTCAD RSCSH OATNE EEDOM NHCLI GSISY LYATE NNSNW IHTEE' },
        { text: '.. - / .-- --- .-. -.- ... / -.-. .-.. . .- .-. .-.. -.--' }
    ],
    run: function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        var s = String(v.text).trim(), ns = s.replace(/\s+/g, ''), n = ns.length;
        if (!n) Calc.fail('Please enter some text.', 'text');
        var cand = [];
        function add(name, score, tool, reasons) { cand.push({ name: name, score: Math.round(Math.max(0, Math.min(99, score))), tool: tool, reasons: reasons }); }

        /* ---------- the characters ---------- */
        var cls = { up: 0, low: 0, dig: 0, sp: s.length - n, oth: 0 }, sym = {};
        for (var i = 0; i < ns.length; i++) {
            var ch = ns.charAt(i);
            sym[ch] = (sym[ch] || 0) + 1;
            if (/[A-Z]/.test(ch)) cls.up++; else if (/[a-z]/.test(ch)) cls.low++; else if (/[0-9]/.test(ch)) cls.dig++; else cls.oth++;
        }
        var syms = Object.keys(sym).sort(), nl = cls.up + cls.low;
        var s1 = S.step('Look at the characters');
        s1.table(['Kind', 'Count'], [['Upper case letters', cls.up], ['Lower case letters', cls.low], ['Digits', cls.dig], ['Other signs', cls.oth], ['Spaces and line breaks', cls.sp]], { mono: true });
        s1.p(syms.length + ' different symbols (spaces not counted): ' + Calc.esc(syms.length <= 70 ? syms.join(' ') : syms.slice(0, 70).join(' ') + ' ...'));

        /* ---------- encodings: the character set says a lot ---------- */
        var enc = [], dec;
        function readable(t) { return B.readability(t).score; }
        if (/^[01\s]+$/.test(s)) {
            dec = B.decode.binary(s);
            enc.push(['Only 0 and 1', true]);
            add('Binary (8-bit character codes)', dec ? 60 + 0.38 * readable(dec) : 55, 'decoder-guesser, or binary', ['only the digits 0 and 1', dec ? 'decodes as bytes to: ' + B.preview(dec, 30) : 'the bit count is not a multiple of 8']);
        }
        if (/^[.\-\s/|·_]+$/.test(s) && /[.\-]/.test(s)) {
            dec = B.decode.morse(s);
            enc.push(['Only dots, dashes and separators', true]);
            add('Morse code', dec ? 70 + 0.29 * readable(dec) : 60, 'decoder-guesser, or morse', ['only dots, dashes, spaces and slashes', dec ? 'decodes to: ' + B.preview(dec, 30) : 'some groups are not Morse letters']);
        }
        if (/%[0-9A-Fa-f]{2}/.test(s)) {
            dec = B.decode.url(s);
            if (dec) { enc.push(['Percent signs followed by two hex digits', true]); add('URL (percent) encoding', 60 + 0.38 * readable(dec), 'decoder-guesser, or url-encoding', ['contains %XX escapes', 'decodes to: ' + B.preview(dec, 30)]); }
        }
        var digitsOnly = /^[\d\s,;]+$/.test(s) && cls.dig > 0;
        if (digitsOnly) {
            var dg = s.replace(/[^\d]/g, ''), nums = s.split(/[\s,;]+/).filter(Boolean);
            if (/^[1-5]+$/.test(dg) && dg.length % 2 === 0 && nums.every(function (x) { return x.length % 2 === 0; })) {
                enc.push(['Only the digits 1 to 5, an even number of them', true]);
                var poly = '';
                for (i = 0; i < dg.length; i += 2) { var r = +dg.charAt(i) - 1, cc = +dg.charAt(i + 1) - 1; poly += 'ABCDEFGHIKLMNOPQRSTUVWXYZ'.charAt(r * 5 + cc); }
                var pr = B.fitness(poly);
                add('Polybius square (or tap code)', 75 + (pr != null && pr > -5 ? 20 : 0), 'a Polybius square decoder', ['only digits 1 to 5, read in pairs (row, column)', 'with the plain 5 by 5 square (I and J together) the pairs give: ' + B.preview(poly, 30) + (pr != null && pr > -5 ? ', which reads as English' : ', not English, so the square is probably keyed')]);
            }
            if (nums.length > 1 && nums.every(function (x) { return +x >= 1 && +x <= 26; })) {
                dec = B.decode.a1z26(s);
                add('Letter numbers (A1Z26: A = 1, ..., Z = 26)', 55 + 0.4 * readable(dec), 'decoder-guesser', ['all numbers lie between 1 and 26', 'as letters: ' + B.preview(dec, 30)]);
            }
            if (nums.length > 1 && nums.every(function (x) { return +x >= 32 && +x <= 255; })) {
                dec = B.decode.decimal(s);
                add('Decimal character codes (ASCII)', 50 + 0.45 * readable(dec), 'decoder-guesser, or character-codes', ['all numbers lie between 32 and 255, the range of printable characters', 'as characters: ' + B.preview(dec, 30)]);
            }
        }
        var hexOk = /^(0x)?[0-9A-Fa-f\s:]+$/.test(s) && ns.replace(/0x|:/gi, '').length % 2 === 0 && n >= 4;
        if (hexOk) {
            dec = B.decode.hex(s);
            if (dec) { enc.push(['Only hexadecimal digits, an even number', true]); add('Hexadecimal bytes', 40 + 0.55 * readable(dec), 'decoder-guesser, or hex', ['only 0 to 9 and A to F, an even number of them', 'as bytes: ' + B.preview(dec, 30)]); }
        }
        if (/^[A-Za-z0-9+/\-_]+={0,2}$/.test(ns) && n >= 8 && n % 4 !== 1 && !digitsOnly) {
            dec = B.decode.base64(ns);
            var mixed = cls.up && cls.low, rd = dec ? readable(dec) : 0;
            if (dec && (mixed || /=$/.test(ns) || rd > 40)) {
                enc.push(['The Base64 alphabet (A to Z, a to z, 0 to 9, + and /)', true]);
                add('Base64', 30 + (n % 4 === 0 ? 10 : 0) + (/=$/.test(ns) ? 10 : 0) + (mixed && cls.dig ? 5 : 0) + 0.45 * rd, 'decoder-guesser, or base64', ['only Base64 characters' + (n % 4 === 0 ? ', length a multiple of 4' : '') + (/=$/.test(ns) ? ', ends with = padding' : ''), 'decodes to: ' + B.preview(dec, 30)]);
            }
        }
        if (/^[A-Z2-7]+=*$/.test(ns) && n >= 8 && /[2-7]/.test(ns)) {
            dec = B.decode.base32(ns);
            if (dec) add('Base32', 40 + (n % 8 === 0 ? 10 : 0) + 0.45 * readable(dec), 'decoder-guesser, or base32', ['only A to Z and 2 to 7' + (n % 8 === 0 ? ', length a multiple of 8' : ''), 'decodes to: ' + B.preview(dec, 30)]);
        }

        /* ---------- letter ciphers ---------- */
        var L = tx.letters(s), N = L.length;
        var lettersMostly = N >= 0.8 * n;
        if (N && syms.length <= 3 && lettersMostly && N >= 10) {
            var two = Object.keys(B.countCodes(B.codes(L)).reduce(function (o, k, i2) { if (k) o[tx.chr(i2)] = 1; return o; }, {}));
            if (two.length === 2) add('Baconian cipher (two symbols in groups of 5)', 80 + (N % 5 === 0 ? 15 : 0), 'a Bacon cipher decoder', ['only two different letters, ' + two.join(' and '), N % 5 === 0 ? 'the length ' + N + ' is a multiple of 5' : 'but the length ' + N + ' is not a multiple of 5']);
        }
        if (N >= 10 && lettersMostly && /^[ADFGVX]+$/.test(L) && N % 2 === 0) {
            var v6 = /V/.test(L);
            add(v6 ? 'ADFGVX cipher' : 'ADFGX cipher', 88, 'an ADFGVX decoder (it needs the key)', ['only the letters ' + (v6 ? 'A D F G V X' : 'A D F G X') + ', an even number of them']);
        }
        if (N >= 12 && lettersMostly) {
            var c = B.codes(L.slice(0, 2000)), M = c.length, counts = B.countCodes(c);
            var ic = B.icCounts(counts), chi = B.chi2(counts), fit = B.fitness(c);
            var rev = B.fitness(c.slice().reverse());
            var bc = { k: 0, fit: -99 };
            for (var k = 1; k < 26; k++) { var g = B.fitness(c.map(function (y) { return (y - k + 26) % 26; })); if (g > bc.fit) bc = { k: k, fit: g }; }
            var ba = { a: 1, b: 0, fit: -99 };
            B.AFFINE_A.forEach(function (a) {
                if (a === 1) return;
                var ai = B.INV26[a];
                for (var b = 0; b < 26; b++) { var g2 = B.fitness(c.map(function (y) { return (ai * (y - b + 26)) % 26; })); if (g2 > ba.fit) ba = { a: a, b: b, fit: g2 }; }
            });
            var pRows = [];
            for (var p = 1; p <= Math.max(1, Math.min(20, Math.floor(M / 10))); p++) pRows.push({ p: p, ic: B.periodIC(c, p) });
            var per = B.pickPeriod(pRows), perIC = 0;
            pRows.forEach(function (r) { if (r.p === per) perIC = r.ic; });
            var pairsDbl = 0;
            for (i = 0; i + 1 < L.length; i += 2) if (L.charAt(i) === L.charAt(i + 1)) pairsDbl++;
            var hasJ = /J/.test(L), distinct = counts.filter(Boolean).length, evenN = N % 2 === 0;
            var good = -4.85;   // fitness this high (average log10 per quadgram) reads as English

            var s2 = S.step('Letter statistics');
            s2.p(N + ' letters' + (N > 2000 ? ' (the first 2000 are used)' : '') + '. The fitness is the average $\\log_{10}$ probability of the quadgrams in English: about $' + B.EN_FIT + '$ for English text, about $' + B.RANDOM_FIT + '$ for random letters.');
            s2.table(['Statistic', 'Value', 'English', 'Random'], [
                ['Index of coincidence', f(ic, 4), f(B.EN_IC, 4), '0.0385'],
                ['$\\chi^2$ against English counts', f(chi, 0), 'small', 'large'],
                ['Fitness', f(fit, 3), B.EN_FIT, B.RANDOM_FIT],
                ['Fitness backwards', f(rev, 3), '', ''],
                ['Best Caesar shift', f(bc.fit, 3) + ' (shift ' + bc.k + ')', '', ''],
                ['Best other affine key', f(ba.fit, 3) + ' (' + ba.a + ', ' + ba.b + ')', '', ''],
                ['Period with English columns', per ? per + ' (IC ' + f(perIC, 4) + ')' : 'none up to ' + pRows.length, '1', 'none'],
                ['Distinct letters', distinct, '26', '26'],
                ['Letter count, doubled pairs, J', (evenN ? 'even' : 'odd') + ', ' + pairsDbl + ', ' + (hasJ ? 'J' : 'no J'), '', '']
            ]);
            s2.p('The fitness rows are the average $\\log_{10}$ quadgram probability of the text as it is, read backwards, and after the best Caesar shift and the best affine key (a, b). The last row checks the marks of Playfair: an even count, no pair of equal letters (counting pairs from the start), no J.');

            if (fit > good) add('Not enciphered (plain English)', 95, 'none needed', ['the text already scores like English (' + f(fit, 3) + ')']);
            if (rev > good && rev > fit + 0.3) add('Reversed text', 93, 'decoder-guesser', ['read backwards it scores like English (' + f(rev, 3) + ')']);
            if (bc.fit > good && bc.fit > fit + 0.3) add(bc.k === 13 ? 'ROT13 (Caesar shift 13)' : 'Caesar cipher', 94, 'caesar-breaker', ['shifting every letter back by ' + bc.k + ' gives English (fitness ' + f(bc.fit, 3) + ')']);
            if (ba.fit > good && ba.fit > bc.fit + 0.3 && ba.fit > fit + 0.3) add(ba.a === 25 && ba.b === 25 ? 'Atbash (A and Z swapped, B and Y, ...)' : 'Affine cipher', 93, ba.a === 25 && ba.b === 25 ? 'affine-breaker, or atbash' : 'affine-breaker', ['the affine key a = ' + ba.a + ', b = ' + ba.b + ' gives English (fitness ' + f(ba.fit, 3) + ')']);
            var english = Math.max(fit, rev, bc.fit, ba.fit) > good;
            if (!english) {
                /* one alphabet: an English-like IC, or period 1 already as good as any other (columns of 10 letters or more) */
                var oneAlpha = ic > 0.058 || (per === 1 && ic > 0.05), countsEn = chi < 100 + 0.3 * M && ic > 0.05;
                if (countsEn) add('Transposition (rail fence, columnar, ...)', 82, 'transposition-breaker', ['the letter counts are those of English ($\\chi^2 = ' + f(chi, 0) + '$, IC ' + f(ic, 4) + ')', 'but the order is not: the fitness is only ' + f(fit, 3) + ', so the letters were moved, not replaced']);
                if (oneAlpha && !countsEn) add('Monoalphabetic substitution (mixed alphabet)', 80, 'substitution-solver', ['the IC ' + f(ic, 4) + ' is English-like: one alphabet', 'but the letter counts are not English ($\\chi^2 = ' + f(chi, 0) + '$) and no Caesar or affine key fits']);
                var pf = evenN && pairsDbl === 0 && !hasJ && distinct <= 25 && N >= 20;
                if (pf) add('Playfair (or another digraph cipher)', N >= 80 ? 84 : 60, 'a Playfair tool', ['an even number of letters, no pair of two equal letters, no J and at most 25 letters, exactly what Playfair produces' + (N < 80 ? ' (but the text is short, so this could be chance)' : ''), 'IC ' + f(ic, 4) + ', between English and random, as digraph ciphers give']);
                else if (N >= 40 && ic < 0.058) add('Playfair', 5, 'a Playfair tool', [!evenN ? 'ruled out: an odd number of letters' : pairsDbl ? 'ruled out: ' + pairsDbl + ' pair' + (pairsDbl > 1 ? 's' : '') + ' of equal letters, which Playfair never produces' : hasJ ? 'unlikely: the letter J appears' : 'unlikely: all 26 letters appear']);
                var lettersFound = cand.length;
                if (ic < 0.058 && per && per > 1) add('Vigenère (or another periodic polyalphabetic cipher)', 78 + (ic < 0.05 ? 10 : 0), 'vigenere-breaker', ['the IC ' + f(ic, 4) + ' is low: several alphabets', 'split into ' + per + ' columns, each column has an English-like IC (' + f(perIC, 4) + '), so the key probably has ' + per + ' letters']);
                else if (ic < 0.048) {
                    add('Vigenère with a long key, autokey or running key', 45, 'vigenere-breaker, index-of-coincidence', ['the IC ' + f(ic, 4) + ' is close to random', 'no period up to ' + pRows.length + ' makes the columns English-like']);
                    add('One-time pad or a modern cipher (random letters)', 40, 'none: without the key this cannot be broken', ['the letters look uniformly random (IC ' + f(ic, 4) + ')']);
                }
                if (cand.length === lettersFound && !oneAlpha && !countsEn) add('Unclear: a substitution or a polyalphabetic cipher', 30, 'frequency-analysis, index-of-coincidence', ['the IC ' + f(ic, 4) + ' lies between one alphabet and several, and no period stands out' + (M < 200 ? ' (the text is short)' : '')]);
            }
        }
        if (!cand.length) add('Unknown', 10, 'decoder-guesser', ['no rule matched: the text mixes many kinds of characters' + (N < 12 ? ', or it is too short' : '')]);

        cand.sort(function (a, b) { return b.score - a.score; });
        var s3 = S.step('Rank the candidates');
        s3.p('Each rule gives a confidence from 0 to 99 (a rough guide, not a probability).');
        s3.table(['Cipher or encoding', 'Confidence', 'Try next'], cand.map(function (x) { return [x.name, x.score, x.tool]; }), { hl: 0 });
        s3.p('The reasons:').list(cand.map(function (x) { return x.name + ': ' + x.reasons.join('; ') + '.'; }));
        var top = cand[0];
        S.result(Calc.esc(top.name), { copy: top.name, label: 'Most likely' });
        S.note('Confidence ' + top.score + '. Next: ' + top.tool + '.');
        if (cand.length > 1) S.note('Also possible: ' + cand.slice(1, 3).map(function (x) { return x.name + ' (' + x.score + ')'; }).join(', ') + '.');
    }
});
