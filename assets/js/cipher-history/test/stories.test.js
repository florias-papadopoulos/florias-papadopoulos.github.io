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
};
