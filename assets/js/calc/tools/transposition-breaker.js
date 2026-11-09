/* Toolbox: break a rail fence or a columnar transposition: every rail count and offset, every column order up to 8
   columns, hill climbing on the order beyond, all ranked by English quadgram fitness. */
Calc.tool({
    id: 'transposition-breaker',
    inputs: [
        { id: 'text', type: 'textarea', label: 'Ciphertext', rows: 5, maxLength: 5000, placeholder: 'Paste a transposition ciphertext' },
        { id: 'kind', type: 'select', label: 'Cipher', value: 'both', options: [['both', 'Rail fence and columnar'], ['rail', 'Rail fence only'], ['col', 'Columnar only']] },
        { id: 'maxc', type: 'select', label: 'Most columns', value: '8', when: { kind: ['both', 'col'] }, options: [['6', '6'], ['7', '7'], ['8', '8 (every order)'], ['10', '10 (hill climbing above 8)'], ['12', '12'], ['15', '15']] }
    ],
    button: 'Break',
    examples: [
        { text: 'SMEYO HOHTN SSLTD ERSDL EACII AREUT TNRNI TOALB AALUA GESLT EWFCS SSGMT DOULN IUIIT IRCTD NSNEK BTEOE NEHST SOTNS FDYAE HEETR RSOSA EHERR EDESM PHFRE EFTPT REYIM MTANT AAEWA DIAIK NROVI EEATG LRTHT IEEKO SELET EPLSR RTEBH OGSOE OLXMW ODDHG TMNGL EDLSA EANTS TASCI RSRTP HATED ROUAR STCNO MTLGE LLFEN TNCDI DABER RSEEI ANEDI FTCAD RSCSH OATNE EEDOM NHCLI GSISY LYATE NNSNW IHTEE', kind: 'both', maxc: '8' },
        { text: 'OETALHLFWEUPEDTOSTEWEMOOOETRBNATRNUNEAESEENEOONENOTAQGNKTSHURLETCSOEOANMROGPLHENBESRWGWEHKRDARAOADWTPDNHSECDENEETTLIHIDADMSASYDSMREGULVHPOSMDNWWRYOVRIGSLDHURSUAAMRDYEQEIDIATNBRDFRSRHAECSAAKOBNGHLEASLRBDRWNTAEETTTEHLNATEHSLWTEOSTEIIPATEEHSNNIETIESETKTEDBOEYHWSDNEQEAITIAASFWRGEABTSESFEIBOMFIHNORIRWESHGHCLHTOTNGEOHSNTAASWEN', kind: 'both', maxc: '8' }
    ],
    run: async function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        var raw = tx.deaccent(v.text).replace(/[^A-Za-z]/g, ''), N = raw.length;
        if (N < 8) Calc.fail('The breaker needs at least 8 letters A to Z.', 'text');
        if (N > 3000) Calc.fail('At most 3000 letters (longer texts take too long to search).', 'text');
        var c = B.codes(raw), counts = B.countCodes(c), all = [];
        var doRail = v.kind !== 'col', doCol = v.kind !== 'rail', maxc = Math.min(Number(v.maxc || 8), Math.floor(N / 2));

        var chi = B.chi2(counts), ic = B.icCounts(counts), fit0 = B.fitness(c);
        var s1 = S.step('Check that the letters are English');
        s1.p('$N = ' + N + '$ letters (spaces and signs removed). A transposition only moves the letters, so their counts stay those of English: $\\chi^2 = ' + f(chi, 1) + '$ against English, IC $= ' + f(ic, 4) + '$ (English about $' + f(B.EN_IC, 4) + '$).');
        s1.p(chi < 100 + 0.3 * N && ic > 0.055 ? 'Both fit English: the letters are right, only their order is wrong. As it stands, the text scores $' + f(fit0, 3) + '$ in quadgram fitness (English about $' + B.EN_FIT + '$).' : 'The counts do not look like English, so this is probably not a transposition of English (try the cipher identifier). The search runs anyway.');

        var tick = 0;
        async function breathe() { if ((++tick & 255) === 0) { var w = S.tick(); if (w) await w; } }

        if (doRail) {
            var rr = [];
            for (var r = 2; r <= Math.min(N - 1, 40); r++) {
                for (var o = 0; o < 2 * (r - 1); o++) {
                    var d = B.railFence(raw, r, o, true);
                    rr.push({ kind: 'rail', r: r, o: o, fit: B.fitness(d), text: d });
                    await breathe();
                }
            }
            rr.sort(function (a, b) { return b.fit - a.fit || a.r - b.r || a.o - b.o; });
            /* other offsets give nearly the same text, turned by a few letters (moved from one end to the other), and the
               scores can be nearly equal: then the usual start on the top rail (offset 0) is preferred */
            for (var z = 1; z < rr.length && rr[z].fit > rr[0].fit - 0.01; z++) if (rr[z].o === 0 && rr[z].r === rr[0].r && rr[0].o !== 0) { rr.unshift(rr.splice(z, 1)[0]); rr[0].pref = true; break; }
            var s2 = S.step('Rail fence: every number of rails and every offset');
            s2.p('A rail fence writes the text in a zigzag over $r$ rails and reads the rails one after another. The zigzag may start part way through its cycle of $2(r - 1)$ letters (the offset). ' + rr.length + ' settings, each undone and scored by quadgram fitness:');
            s2.table(['Rank', 'Rails', 'Offset', 'Fitness', 'Start of the decryption'], rr.map(function (x, i) { return [i + 1, x.r, x.o, f(x.fit, 3), B.preview(x.text, 36)]; }), { mono: true, max: 10, hl: 0 });
            all = all.concat(rr.slice(0, 10));
        }

        if (doCol) {
            var per = [], t0 = Date.now();
            var dec = new Array(N);
            function score(order, k) {
                var j = 0;
                for (var q = 0; q < k; q++) for (var p = order[q]; p < N; p += k) dec[p] = c[j++];
                return B.quadSum(dec) / (N - 3);
            }
            for (var k = 2; k <= maxc; k++) {
                var best = null, tried = 0, how;
                if (k <= 8) {
                    how = 'all ' + k + '! orders';
                    /* Heap's algorithm visits every order */
                    var a = [], cc = [];
                    for (var i = 0; i < k; i++) { a.push(i); cc.push(0); }
                    var g = score(a, k);
                    best = { fit: g, order: a.slice() };
                    tried = 1;
                    i = 0;
                    while (i < k) {
                        if (cc[i] < i) {
                            var sw = i % 2 ? cc[i] : 0, t = a[sw];
                            a[sw] = a[i]; a[i] = t;
                            g = score(a, k);
                            tried++;
                            if (g > best.fit) best = { fit: g, order: a.slice() };
                            cc[i]++;
                            i = 0;
                            await breathe();
                        } else { cc[i] = 0; i++; }
                    }
                } else {
                    how = 'hill climbing';
                    var rnd = B.rng(B.hash(raw) + k), hits = 0, tk = Date.now();
                    for (var rs = 0; rs < 60 && Date.now() - tk < 2500 && hits < 3; rs++) {
                        var ord = [];
                        for (i = 0; i < k; i++) ord.push(i);
                        for (i = k - 1; i > 0; i--) { var rj = Math.floor(rnd() * (i + 1)), tt = ord[i]; ord[i] = ord[rj]; ord[rj] = tt; }
                        var cur = score(ord, k), moved = true;
                        while (moved) {
                            moved = false;
                            for (var x = 0; x < k; x++) for (var y = x + 1; y < k; y++) {
                                tt = ord[x]; ord[x] = ord[y]; ord[y] = tt;
                                g = score(ord, k);
                                tried++;
                                if (g > cur + 1e-9) { cur = g; moved = true; } else { ord[y] = ord[x]; ord[x] = tt; }
                                await breathe();
                            }
                            /* also try moving one column to another place */
                            for (x = 0; x < k; x++) for (y = 0; y < k; y++) {
                                if (x === y) continue;
                                var o2 = ord.slice(), m = o2.splice(x, 1)[0];
                                o2.splice(y, 0, m);
                                g = score(o2, k);
                                tried++;
                                if (g > cur + 1e-9) { cur = g; ord = o2; moved = true; }
                                await breathe();
                            }
                        }
                        if (best && Math.abs(cur - best.fit) < 1e-9) hits++;
                        else if (!best || cur > best.fit) { best = { fit: cur, order: ord.slice() }; hits = 1; }
                    }
                }
                var txt = B.columnar(raw, best.order, true);
                per.push({ kind: 'col', k: k, order: best.order, fit: best.fit, text: txt, how: how, tried: tried });
            }
            var s3 = S.step('Columnar transposition: every width from 2 to ' + maxc);
            s3.p('A columnar transposition writes the text in rows of $k$ letters and reads the columns in the order of a key; the last row may be short. To undo it, cut the ciphertext into $k$ columns of the right lengths, put them back in their places and read across. For each width the best column order (written as the number above each column, 1 = read first):');
            per.sort(function (a, b) { return a.k - b.k; });
            var bestK = per.slice().sort(function (a, b) { return b.fit - a.fit; })[0];
            s3.table(['Width', 'Search', 'Orders scored', 'Best key', 'Fitness', 'Start of the decryption'], per.map(function (x) {
                return [x.k, x.how, x.tried, B.ranks(x.order).join(' '), x === bestK ? { v: f(x.fit, 3), hl: true } : f(x.fit, 3), B.preview(x.text, 30)];
            }), { mono: true, max: 20 });
            s3.p('Searched in ' + f((Date.now() - t0) / 1000, 1) + ' s.' + (maxc > 8 ? ' Above 8 columns there are too many orders ($9! = 362\\,880$ and growing fast), so the solver swaps and moves columns while the fitness improves, restarting a few times.' : ''));
            all = all.concat(per);
        }

        all.sort(function (a, b) { return b.fit - a.fit; });
        all.forEach(function (x, i) { if (x.pref && i > 0 && x.fit > all[0].fit - 0.01) all.unshift(all.splice(i, 1)[0]); });
        var win = all[0];
        function label(x) { return x.kind === 'rail' ? 'Rail fence, ' + x.r + ' rails, offset ' + x.o : 'Columnar, ' + x.k + ' columns, key ' + B.ranks(x.order).join(' '); }
        var s4 = S.step('Rank all candidates');
        s4.table(['Rank', 'Cipher and key', 'Fitness', 'Start of the decryption'], all.slice(0, 12).map(function (x, i) { return [i + 1, label(x), f(x.fit, 3), B.preview(x.text, 30)]; }), { mono: true, hl: 0 });
        var s5 = S.step('The winner: ' + label(win));
        if (all[1] && all[1].text !== win.text && win.fit - all[1].fit < 0.02) s5.p('Nearly a tie with ' + label(all[1]) + ' (fitness ' + f(all[1].fit, 3) + '): the two decryptions differ only a little, for example by a few letters moved from one end to the other. Read both.');
        if (win.kind === 'rail') {
            var n = Math.min(N, 60), pat = B.railPattern(n, win.r, win.o), lines = [];
            for (var rl = 0; rl < win.r; rl++) { var ln = ''; for (var q = 0; q < n; q++) ln += pat[q] === rl ? win.text.charAt(q) : '.'; lines.push(ln); }
            s5.p('The plaintext on its ' + win.r + ' rails (first ' + n + ' letters); the ciphertext is rail 1, then rail 2, and so on:');
            s5.pre(lines.join('\n'));
        } else {
            var K = win.k, ranks = B.ranks(win.order), rows = [], len = [];
            for (var col = 0; col < K; col++) len.push(Math.floor(N / K) + (col < N % K ? 1 : 0));
            for (var st = 0; st < N && rows.length < 12; st += K) rows.push(win.text.slice(st, st + K).split(''));
            s5.p('The columns have ' + (N % K ? Math.floor(N / K) + 1 + ' or ' + Math.floor(N / K) : N / K) + ' letters (the first ' + (N % K || K) + ' columns are the longer ones). The ciphertext is cut in that order: column ' + win.order.map(function (x) { return x + 1; }).join(', then ') + '. Reading the grid across gives the plaintext' + (rows.length * K < N ? ' (first rows)' : '') + ':');
            s5.table(ranks.map(String), rows, { mono: true, max: 12 });
        }
        s5.pre(win.text);
        if (win.fit < -5) s5.p('Even the best candidate is far from English: maybe another transposition (double, route, or with more columns), or not a transposition at all.');
        S.result(Calc.esc(win.text), { copy: win.text, label: 'Plaintext' });
        S.note(label(win) + ', fitness ' + f(win.fit, 3) + '.');
    }
});
