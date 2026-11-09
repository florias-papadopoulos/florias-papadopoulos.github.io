/* Toolbox: Kasiski examination: repeated sequences in a ciphertext, their distances, the factors of the distances,
   and the key lengths that divide most distances. */
Calc.tool({
    id: 'kasiski',
    live: true,
    inputs: [
        { id: 'text', type: 'textarea', label: 'Ciphertext', rows: 6, maxLength: 20000, placeholder: 'Paste a Vigenère ciphertext' },
        { id: 'min', type: 'select', label: 'Shortest repeat', value: '3', options: [['3', '3 letters'], ['4', '4 letters'], ['5', '5 letters']] },
        { id: 'maxm', type: 'num', label: 'Largest key length', value: '20', width: 's' }
    ],
    examples: [
        { text: 'VVHSI FZLKE VVRYP GYHIM GFFPF OPHHQ JSQEO TCZWQ CWUWB XSUCB XSQMK IPHJL TSWLB UIQAB PHGST PVHXO KAPIA VVHAF EYSSI KGKIA VVHKO GOWPB PGXRQ KZLXP JCQII KYHAX VSUEK FKUSQ GHKIT GOWLB TWQEP OOOPY QCNAF VVDKO GSQGL XSUWE KDVTX UGHHC CFRYQ CHVIX CBGRL PSRJQ JSVEF NCUWB XSUOK GKKMP POPIV GHHEZ JCIXE GAWVR UHHHQ JSOMD JHKIH GDWFR TBLRD VVUSR IVWLB NCQKT KBWIO PWJLQ UCQQX TYHXA CMVXE GGTYX TSIMI NSGAF VVFEO VGOSK IPHJL TSGET PTDVJ GFVFO QIJLQ CDSPB UQKIB USDRA DOVOB VGRJY TCZRB IUVAE KZHXE GPDOB TGRPA YOUQY TSDHC TCPET KBGST VVDXL RSQIA QBWSQ JSVXO GSWGE KZGVB PFDRY GHZIB PHKIP VOOPP YWWLQ JSLVA QUVEK FHKIJ WGLGF CBVTI CMHHQ JSVEJ GHKVB GGRRD UIQXF NSYIK VVHTF ISRRP USHQB FHROK QKWLB YCUHP DMQSL PSYIO AHKMK IKDWP QZGEK FHKIP SIDVB YOVUR KSWED CWQEP GQUIQ OSVWX ISLWL PZBEP UHUSK IOVXE GAHXE QRWLX VVLHB UWWJL TQHRQ WFLIP EZHVH UOQHP QZGMB TGWVR UHHHP KASPB EWSLB TGWLX VGKMC VSGSO TSSPX ESGPB VHHVP CBGJL TQHRQ WFLIP ROWMB PHUIX FSUWY TCNIQ JSPFV ECXRQ KBJXE GARWQ ECPQL PZHXQ GFLRX NCQKB PUOMP JHHBQ KGDPJ QGWEI YOBWB HCOPL YSGFV VOQHX CBGXE CHVMK IZHJX EHXRA KRPEK AYLRD UOQHD GBHVX NGZLL DSOMB XSGXE GWUPB VHHVP YSUIP CTH', min: '3', maxm: '20' },
        { text: 'EHRHP UYTGU MLFHD EXXIG RCCYB QSROT UXRRE COJLX RVCSR OIILP VRGME TMESH VVGSE FNRNR YTQHA EUPTE BQDRO TUXAZ PVPBE MJUPD GAIXE PAGEI EFFNG BPZGD HBGIC VVEJT XVELN QPVFG PTUXA VNEHR KMEND MNEPS BZKJB XYNRR RXRTB GEELL ZCDPN LWVQQ AEHYK NESRT EEQYO AXSWG SEFTM CBCSR OIIXY EJAMJ ALMRR IKRLC UHJKU PMGKY JGPDG AICVR HGAIB RATON VEVYG GAVFH RHGAI CBYGJ BRKRC NVZLK FEHRG MXUET ETMEY PFGML VPTTL TXRDF AEMII CLSGX PVIPN NGHIB WLRWW CBHLL MLIBF GUMLV FWERI METEO JGWFS EHROE CYPYV GXYRO IABRX PLRNM MIROW NBXVE AOHKI UPZFS XIWBC TJHXI NGEYE IIFHH BAEUA PVRKQ VGMES HVVNY DORXY REIZX XYRQI ELXXE PYYBK YGLPC XEIRO OIXVK UPHVE PJGSE LAEUG ZLQXE TUZTU XVKUP SGHVZ RDOSM LVVCL VOIJJ SIPAR VVEHR KSWGS EZAEU RGEEM SCQLN LHRVR WSR', min: '3', maxm: '20' }
    ],
    run: function (v, S) {
        var tx = Calc.lib.text, B = Calc.lib.breaking, f = B.f;
        var L = tx.letters(v.text), N = L.length, min = Number(v.min);
        if (N < 2 * min) Calc.fail('The text needs at least ' + 2 * min + ' letters A to Z.', 'text');
        if (!(v.maxm >= 2 && v.maxm <= 40) || Math.floor(v.maxm) !== v.maxm) Calc.fail('Choose a whole number from 2 to 40.', 'maxm');
        var c = B.codes(L), k = B.kasiski(c, min, v.maxm);

        var s1 = S.step('Look for repeated sequences');
        s1.p('Spaces and punctuation are removed: $N = ' + N + '$ letters. Positions count from 0. A Vigenère cipher sends the same plaintext to the same ciphertext whenever it meets the same position of the key, so a common word repeated at a distance that is a multiple of the key length shows up repeated in the ciphertext.');
        s1.pre(tx.groups(N > 500 ? L.slice(0, 500) + '...' : L, 5));
        if (!k.repeats.length) {
            s1.p('No sequence of ' + min + ' letters or more appears twice. Kasiski needs a longer text (a few hundred letters) or a shorter key; try the index of coincidence instead.');
            S.result('No repeated sequences of ' + min + ' letters or more', { copy: 'none', label: 'Kasiski' });
            return;
        }
        var maxm = v.maxm;
        function factors(d) { var r = []; for (var m = 2; m <= maxm; m++) if (d % m === 0) r.push(m); return r; }
        var s2 = S.step('Measure the distances');
        s2.p(k.repeats.length + ' repeated sequence' + (k.repeats.length > 1 ? 's' : '') + ', the longest first. Each sequence is taken as long as the two copies agree. The distance is the difference of two starting positions; its factors up to ' + maxm + ' are the key lengths that could explain it.');
        s2.table(['Sequence', 'Positions', 'Distances', 'Factors (2 to ' + maxm + ')'], k.repeats.map(function (r) {
            var ds = r.dists.filter(function (d, i, a) { return a.indexOf(d) === i; });
            return [r.seq, r.pos.join(', '), ds.join(', '), ds.map(function (d) { return d + ': ' + (factors(d).join(' ') || 'none'); }).join('; ')];
        }), { mono: true, max: 30 });
        if (k.capped) s2.p('(Very many repeats: only the first 20000 pairs are used.)');

        var tot = k.dists.length, top = 0;
        k.tally.forEach(function (t) { if (t.count > top) top = t.count; });
        var s3 = S.step('Count which key lengths divide the distances');
        s3.p('For every candidate length $m$, the number of the ' + tot + ' distances that are multiples of $m$. Accidental repeats add noise, and small numbers such as 2 and 3 divide many distances by chance; the true key length and its factors divide nearly all the genuine ones.');
        var hl = null;
        k.tally.forEach(function (t, i) { if (t.m === k.likely) hl = i; });
        s3.table(['Length $m$', 'Distances divisible', 'Share', 'Bar'], k.tally.map(function (t) {
            return [t.m, t.count + ' of ' + tot, f(100 * t.count / tot, 0) + ' %', B.bar(top ? t.count / top : 0, 14)];
        }), { mono: true, max: 40, hl: hl });

        var ranked = k.tally.slice().sort(function (a, b) { return b.count - a.count || b.m - a.m; }).slice(0, 5);
        var s4 = S.step('The most likely key length');
        if (k.likely) {
            var divs = k.tally.filter(function (t) { return t.m < k.likely && k.likely % t.m === 0; }).map(function (t) { return t.m; });
            s4.p('The largest length that divides at least 80 percent as many distances as the best one is $m = ' + k.likely + '$' + (divs.length ? ' (its factors ' + divs.join(', ') + ' score as well, as they must)' : '') + '.');
            s4.p('The five lengths that divide the most distances: ' + ranked.map(function (t) { return t.m + ' (' + t.count + ')'; }).join(', ') + '. Check with the index of coincidence: the columns of the right length look like English.');
        } else s4.p('Too few distances to decide.');
        S.result(k.likely ? 'Most likely key length: $' + k.likely + '$' : 'No clear key length', { copy: String(k.likely || 'none'), label: 'Kasiski' });
        S.note('From ' + k.repeats.length + ' repeated sequences and ' + tot + ' distances.');
    }
});
