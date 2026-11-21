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
};
