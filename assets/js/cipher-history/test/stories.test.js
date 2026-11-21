/* Tests of the stories' puzzles: each puzzle's text is the plaintext enciphered with the stated key, its answer
   fingerprint matches, and the method of the time really breaks it. The plaintexts live here (not in the page's
   script), so the answers are not sitting in the code the visitor downloads. */
module.exports = function (CH, t) {
    var B = CH.B(), S = CH.stories;

    /* ---------- Caesar: our English wording of the message Caesar says he sent (Gallic War 5.48), shift 3 ---------- */
    var caesarPlain = 'I have set out with the legions and will soon be with you. Keep your old courage.';
    if (S.caesar) {
        t.eq(S.caesar.note, CH.desk.shift(caesarPlain, 3).toUpperCase(), 'caesar: the note is the plaintext shifted by 3');
        t.eq(S.caesar.answer, CH.print(caesarPlain), 'caesar: answer fingerprint');
        var hits = [];
        for (var k = 1; k < 26; k++) if (CH.print(CH.desk.shift(S.caesar.note, -k)) === S.caesar.answer) hits.push(k);
        t.eq(hits.join(','), '3', 'caesar: exactly one key reads');
    }

    /* ---------- al-Kindi: a message we wrote, in a secret alphabet ---------- */
    var kindiPlain = 'My dear friend, the caravan from Basra reached the city this morning with ink, cloth and the books you asked for. I have hidden them in the house of the old scribe near the bridge. Come after the evening meal and bring the silver. Tell no one about this letter, and burn it when you have read it. If anyone asks, say that you are buying dates and honey for your mother. The guards at the north gate are watching every trader this week, so take the long road by the river and wait until the streets are quiet.';
    var kindiKey = 'QWMXRZUIAOEYKSDNLJFVTBGHCP';
    if (S['al-kindi']) {
        var K = S['al-kindi'];
        t.eq(K.msg, B.subst(kindiPlain, kindiKey).toUpperCase(), 'al-kindi: the message is the plaintext in the secret alphabet');
        t.eq(K.answer, CH.print(kindiPlain), 'al-kindi: answer fingerprint');
        t.ok(CH.letters(kindiPlain).length > 350, 'al-kindi: long enough for counting');
        /* matching by rank gets the commonest letters right (E and T at least), as al-Kindi promises */
        var counts = B.countCodes(B.codes(K.msg)), order = [];
        for (var i = 0; i < 26; i++) if (counts[i]) order.push(i);
        order.sort(function (a, b) { return counts[b] - counts[a] || a - b; });
        var en = CH.desk.englishOrder(), right = [];
        order.forEach(function (x, r) { if (CH.ALPHA.charAt(kindiKey.indexOf(CH.ALPHA.charAt(x))) === en[r]) right.push(en[r]); });
        t.ok(right.indexOf('E') >= 0 && right.indexOf('T') >= 0, 'al-kindi: rank matching finds E and T (found ' + right.join('') + ')');
        /* the full key reads it */
        var inv = {};
        kindiKey.split('').forEach(function (c, j) { inv[c] = CH.ALPHA.charAt(j); });
        t.eq(CH.print(K.msg.replace(/[A-Z]/g, function (c) { return inv[c]; })), K.answer, 'al-kindi: the inverse key solves it');
    }

    /* ---------- Bellaso: a message we wrote, countersign FIORE ---------- */
    var bellasoPlain = 'To the ambassador. The fleet will leave the harbour at the end of the month and the enemy must not learn of it. Tell the captain of the guard that the letters from the north are false and that the enemy has spies in the palace. Send your answer with the same courier and keep the key in your own hand. If the courier is taken, burn the key and the letters at once. The enemy reads every letter that is not in cipher, so write nothing in plain words about the fleet or the money.';
    if (S.bellaso) {
        var Bl = S.bellaso, ct = Bl.msg.replace(/ /g, '');
        t.eq(ct, B.vigenere(CH.letters(bellasoPlain), 'FIORE'), 'bellaso: the message is the plaintext under FIORE');
        t.eq(Bl.answer, CH.print(bellasoPlain), 'bellaso: answer fingerprint');
        var rep = CH.desk.findRepeats(ct);
        t.eq(rep.likely, 5, 'bellaso: Kasiski points to 5');
        var five = rep.dists.filter(function (d) { return d % 5 === 0; }).length;
        [2, 3, 4, 6, 7].forEach(function (m) { t.ok(rep.dists.filter(function (d) { return d % m === 0; }).length < five, 'bellaso: ' + m + ' divides fewer gaps than 5'); });
        var cols = B.columns(B.codes(ct), 5);
        t.eq(cols.map(function (col) { return CH.ALPHA.charAt(CH.desk.bestShift(B.countCodes(col))); }).join(''), 'FIORE', 'bellaso: column counts give the key');
        t.eq(CH.print(B.vigenere(Bl.msg, 'FIORE', true)), Bl.answer, 'bellaso: FIORE solves it');
    }

    /* ---------- Babington: Mary's letter of 17 July 1586, section vii (Pollen 1922, spelling modernised) ---------- */
    var babPlain = 'The affairs being thus prepared and forces in readiness both without and within the realm, then shall it be time to set the six gentlemen to work, taking order, upon the accomplishing of their design, I may be suddenly transported out of this place';
    var psPlain = 'I would be glad to know the names and qualities of the six gentlemen which are to accomplish the designment, for it may be I shall be able upon knowledge of the parties to give you some further advice necessary to be followed therein';
    if (S.babington) {
        var Bb = S.babington;
        t.eq(Bb.answer, CH.print(Bb.normal(babPlain)), 'babington: answer fingerprint');
        t.eq(Bb.decipher(Bb.msg), Bb.normal(babPlain).length ? Bb.decipher(Bb.encipher(babPlain)) : '', 'babington: the message deciphers like a fresh encipherment (nulls dropped)');
        t.eq(CH.letters(Bb.decipher(Bb.msg)), Bb.normal(babPlain), 'babington: the message is the passage');
        t.eq(CH.letters(Bb.decipher(Bb.ps)), Bb.normal(psPlain), 'babington: the postscript is the forged postscript');
        t.eq(Bb.normal('Jewels of Venice, who knows'), 'IEUUELSOFUENICEUUHOKNOUUS', 'babington: J as I, V as U, W as UU');
        /* round trips on random text, with nulls */
        var rnd = B.rng(7);
        for (var r = 0; r < 20; r++) {
            var words = [], n = 3 + Math.floor(rnd() * 8);
            for (var w = 0; w < n; w++) { var len = 1 + Math.floor(rnd() * 7), s = ''; for (var q = 0; q < len; q++) s += 'ABCDEFGHIKLMNOPQRSTUXYZ'.charAt(Math.floor(rnd() * 23)); words.push(s); }
            var text = words.join(' ');
            t.eq(CH.letters(Bb.decipher(Bb.encipher(text, rnd))), Bb.normal(text), 'babington: round trip ' + text);
        }
        /* a tripled letter keeps its third letter */
        t.eq(CH.letters(Bb.decipher(Bb.encipher('AAA'))), 'AAA', 'babington: three of a kind');
    }

    /* ---------- Mary 2023: a letter we wrote in English, in a homophonic key of 33 signs (shuffled with seed 1583) ---------- */
    var maryPlain = 'Monsieur de Mauvissiere, I have received your letter of the tenth. My health is worse this winter, and my keepers allow me no air and no exercise. I beg you to press the Queen of England again about my liberty, for I fear that all this talk of my release is only words to keep me quiet. Do not trust Walsingham, who reads all that passes through his hands. Send your answer by the same way, in this cipher, and burn this letter when you have read it.';
    if (S['mary-2023']) {
        var My = S['mary-2023'], mr = B.rng(1583), msigns = My.signs.slice();
        for (var mi = msigns.length - 1; mi > 0; mi--) { var mj = Math.floor(mr() * (mi + 1)), mt = msigns[mi]; msigns[mi] = msigns[mj]; msigns[mj] = mt; }
        var mkey = {}, mdec = {};
        msigns.forEach(function (sg, i2) { var L = CH.ALPHA.charAt(My.shape[i2]); (mkey[L] = mkey[L] || []).push(sg); mdec[sg] = L; });
        t.eq(My.signs.length, 33, 'mary: 33 signs');
        t.eq(My.shape.length, 33, 'mary: the key shape has 33 slots');
        t.eq(My.msg, My.encipher(maryPlain, mkey, B.rng(1584)), 'mary: the message is the plaintext in the secret key');
        t.eq(My.answer, CH.print(maryPlain), 'mary: answer fingerprint');
        var plainOf = function (m) { return My.msg.split('').map(function (sg) { return m[sg] || '?'; }).join(''); };
        t.eq(CH.print(plainOf(mdec)), My.answer, 'mary: the secret key solves it');
        /* counting fails: the commonest sign is not one of e's, and matching by rank leaves the text unreadable */
        var mc = {};
        My.msg.split('').forEach(function (sg) { mc[sg] = (mc[sg] || 0) + 1; });
        var morder = Object.keys(mc).sort(function (a, b) { return mc[b] - mc[a] || (a < b ? -1 : 1); });
        t.ok(mdec[morder[0]] !== 'E', 'mary: the commonest sign is not e (it is ' + mdec[morder[0]] + ')');
        var en = CH.desk.englishOrder(), rank = {}, rightRank = 0;
        morder.forEach(function (sg, r) { rank[sg] = en[r] || '?'; });
        My.msg.split('').forEach(function (sg) { if (rank[sg] === mdec[sg]) rightRank++; });
        t.ok(rightRank / My.msg.length < 0.4, 'mary: rank matching gets under 40 percent of the letters (' + Math.round(rightRank / My.msg.length * 100) + ')');
        /* the hill climber finds the key from several random starts */
        var midx = {};
        My.signs.forEach(function (sg, i2) { midx[sg] = i2; });
        var mct = My.msg.split('').map(function (sg) { return midx[sg]; }), msolved = 0;
        for (var seed = 1; seed <= 6; seed++) {
            var cl = CH.climb.make(mct, My.shape, B.rng(seed));
            for (var k2 = 0; k2 < 400; k2++) {
                cl.run(1000);
                if (CH.print(mct.map(function (x) { return CH.ALPHA.charAt(cl.bestKey[x]); }).join('')) === My.answer) { msolved++; break; }
            }
        }
        t.eq(msolved, 6, 'mary: the climber solves it from 6 of 6 random starts within 400000 steps');
    }

    /* ---------- Zimmermann: the State Department's English decode up to "Arizona" (NARA, ID 302024), "or" put right as "of" ---------- */
    var zimPlain = 'We intend to begin on the first of February unrestricted submarine warfare. We shall endeavor in spite of this to keep the United States of America neutral. In the event of this not succeeding, we make Mexico a proposal of alliance on the following basis: make war together, make peace together, generous financial support and an understanding on our part that Mexico is to reconquer the lost territory in Texas, New Mexico, and Arizona.';
    var zimMissing = ['february', 'submarine', 'america', 'neutral', 'mexico', 'alliance', 'together', 'peace', 'texas', 'arizona'];
    if (S.zimmermann) {
        var Z = S.zimmermann, zw = zimPlain.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean), zg = Z.groups.split(' ');
        t.eq(zg.join(' '), zw.map(function (w) { return Z.number(w, Z.PUZZLE); }).join(' '), 'zimmermann: the groups are the words in the puzzle\'s codebook');
        t.eq(Z.answer, CH.print(zw.join(' ')), 'zimmermann: answer fingerprint');
        var zbook = {};
        zw.forEach(function (w, i3) { t.ok(!zbook[zg[i3]] || zbook[zg[i3]] === w, 'zimmermann: one word per group (' + w + ')'); zbook[zg[i3]] = w; });
        Object.keys(zbook).forEach(function (g) {
            var w = zbook[g], missing = zimMissing.indexOf(w) >= 0;
            if (missing) t.eq(Z.prints[g], CH.print(w), 'zimmermann: the fingerprint of the missing ' + w);
            else t.eq(Z.known[g], w, 'zimmermann: the known word ' + w);
            t.ok(missing ? Z.known[g] == null : Z.prints[g] == null, 'zimmermann: ' + w + ' is either known or missing');
        });
        t.eq(Object.keys(Z.prints).length, zimMissing.length, 'zimmermann: ten missing words');
        /* the book is alphabetical: sorting the words by group sorts them in alphabetical order */
        var zsorted = Object.keys(zbook).sort().map(function (g) { return zbook[g]; });
        t.eq(zsorted.join(' '), zsorted.slice().sort().join(' '), 'zimmermann: the codebook is in alphabetical order');
        /* the machine's book is another one, so it does not give the puzzle's groups away */
        zimMissing.forEach(function (w) { t.ok(Z.number(w, Z.MACHINE) !== Z.number(w, Z.PUZZLE), 'zimmermann: the machine\'s group for ' + w + ' differs'); });
    }
};
