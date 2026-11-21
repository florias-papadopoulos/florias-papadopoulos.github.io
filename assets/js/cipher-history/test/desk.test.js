/* Tests of the shared desk tools (the parts without a page): shifts, English order, Kasiski, column fitting. */
module.exports = function (CH, t) {
    var B = CH.B();
    /* shifts: Suetonius's example, D for A, and round trips */
    t.eq(CH.desk.shift('A', 3), 'D', 'Caesar: A becomes D');
    t.eq(CH.desk.shift('xyz, ABC', 3), 'abc, DEF', 'shift keeps case and punctuation, wraps round');
    t.eq(CH.desk.shift(CH.desk.shift('Veni, vidi, vici', 11), -11), 'Veni, vidi, vici', 'shift back undoes the shift');
    t.eq(CH.desk.shift('ABC', 29), 'DEF', 'a shift of 29 is a shift of 3');

    /* the English order of the Toolbox's table starts E T A O */
    t.eq(CH.desk.englishOrder().slice(0, 4).join(''), 'ETAO', 'English letters by frequency');
    t.eq(CH.desk.englishOrder().length, 26, 'all 26 letters');

    /* tokens */
    var tk = CH.desk.tokens('Ab c');
    t.eq(tk.length, 4, 'tokens: letters and separators');
    t.eq(tk[0].s + tk[1].s + tk[2].sep + tk[3].s, 'AB C', 'tokens are upper case');

    /* Kasiski: a repeated plaintext under a repeating key repeats at a multiple of the key length */
    var plain = 'THE ENEMY IS AT THE GATE AND THE ENEMY IS AT THE WALL AND THE ENEMY IS IN THE TOWN';
    var c = B.vigenere(plain, 'KEY');
    var k = CH.desk.findRepeats(c);
    t.ok(k.repeats.length > 0, 'Kasiski finds repeats');
    t.ok(k.dists.every(function (d) { return d % 3 === 0; }) || k.likely === 3, 'distances are multiples of 3 (key KEY)');
    t.eq(CH.desk.divisors(12).join(' '), '2 3 4 6 12', 'divisors of 12 up to 12');

    /* column fitting: a long English text, one shift per column, is found again */
    var text = 'IT WAS THE BEST OF TIMES IT WAS THE WORST OF TIMES IT WAS THE AGE OF WISDOM IT WAS THE AGE OF FOOLISHNESS IT WAS THE EPOCH OF BELIEF IT WAS THE EPOCH OF INCREDULITY IT WAS THE SEASON OF LIGHT IT WAS THE SEASON OF DARKNESS IT WAS THE SPRING OF HOPE IT WAS THE WINTER OF DESPAIR WE HAD EVERYTHING BEFORE US WE HAD NOTHING BEFORE US';
    var key = 'LUCE', ct = B.vigenere(text, key), cols = B.columns(B.codes(ct), key.length);
    var found = cols.map(function (col) { return CH.ALPHA.charAt(CH.desk.bestShift(B.countCodes(col))); }).join('');
    t.eq(found, key, 'the best shift of each column gives the key');
    t.ok(CH.desk.likeEnglish(B.countCodes(B.codes(text)), 0) > 80, 'English looks like English');
    t.ok(CH.desk.likeEnglish(B.countCodes(B.codes(text)), 7) < 40, 'a shifted profile does not');

    /* the fingerprint ignores case, spaces and punctuation */
    t.eq(CH.print('Hello, world'), CH.print('HELLOWORLD'), 'fingerprint of the letters only');
    t.ok(CH.print('HELLOWORLD') !== CH.print('HELLOWORLE'), 'one letter changes the fingerprint');
};
