/* Tests for the Classical ciphers tools and lib/classical-ciphers.js (see run.js for the API). Textbook values,
   edge cases, refused keys, and random round trips decrypt(encrypt(x)) for every cipher. */
var F = { keep: true, caseK: true, five: false };          // keep spaces, punctuation and case
var U = { keep: true, caseK: false, five: false };         // keep spaces and punctuation, upper case
function w(o, extra) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); Object.keys(extra).forEach(function (k) { r[k] = extra[k]; }); return r; }

T.tool('caesar', [
    { in: w(U, { text: 'The quick brown fox jumps over the lazy dog', shift: '3' }), copy: 'WKH TXLFN EURZQ IRA MXPSV RYHU WKH ODCB GRJ' },
    { in: w(U, { text: 'The quick brown fox jumps over the lazy dog', shift: '23' }), copy: 'QEB NRFZH YOLTK CLU GRJMP LSBO QEB IXWV ALD' },
    { in: w(F, { text: 'Veni, vidi, vici.', shift: '3' }), copy: 'Yhql, ylgl, ylfl.' },
    { in: w(F, { text: 'Yhql, ylgl, ylfl.', shift: '3' }), action: 'dec', copy: 'Veni, vidi, vici.' },
    { in: w(F, { text: 'abc xyz', shift: '-1' }), copy: 'zab wxy' },
    { in: w(F, { text: 'abc xyz', shift: '29' }), copy: 'def abc' },
    { in: w(F, { text: 'abc', shift: '0' }), copy: 'abc' },
    { in: w(F, { text: 'Crème brûlée!', shift: '1' }), copy: 'Dsfnf csvmff!' },
    { in: { text: 'Hello, World', shift: '13', keep: false, caseK: true, five: false }, copy: 'UryybJbeyq' },
    { in: { text: 'Hello, World', shift: '1', keep: true, caseK: false, five: true }, copy: 'IFMMP XPSME' },
    { in: w(F, { text: '1234 !?', shift: '3' }), error: true },
    { in: w(F, { text: '', shift: '3' }), error: true },
    { in: w(F, { text: 'abc', shift: 'x' }), error: true }
]);
T.tool('rot13', [
    { in: { text: 'Why did the chicken cross the road?', variant: 'rot13' }, copy: 'Jul qvq gur puvpxra pebff gur ebnq?' },
    { in: { text: 'Jul qvq gur puvpxra pebff gur ebnq?', variant: 'rot13' }, action: 'dec', copy: 'Why did the chicken cross the road?' },
    { in: { text: 'Hello, World!', variant: 'rot47' }, copy: 'w6==@[ (@C=5P' },
    { in: { text: 'The Quick Brown Fox Jumps Over The Lazy Dog.', variant: 'rot47' }, copy: '%96 "F:4< qC@H? u@I yF>AD ~G6C %96 {2KJ s@8]' },
    { in: { text: '0123456789 abc', variant: 'rot5' }, copy: '5678901234 abc' },
    { in: { text: 'Abc 2027', variant: 'rot18' }, copy: 'Nop 7572' },
    { in: { text: '!~', variant: 'rot47' }, copy: 'PO' },
    { in: { text: '123', variant: 'rot13' }, error: true },
    { in: { text: 'abc', variant: 'rot5' }, error: true }
]);
T.tool('atbash', [
    { in: w(F, { text: 'Hello world' }), copy: 'Svool dliow' },
    { in: w(U, { text: 'WIZARD' }), copy: 'DRAZIW' },
    { in: w(F, { text: 'Svool dliow' }), action: 'dec', copy: 'Hello world' },
    { in: { text: 'abc, xyz', keep: false, caseK: false, five: false }, copy: 'ZYXCBA' },
    { in: w(F, { text: '42' }), error: true }
]);
T.tool('affine', [
    { in: w(U, { text: 'AFFINE CIPHER', a: '5', b: '8' }), copy: 'IHHWVC SWFRCP' },
    { in: w(U, { text: 'IHHWVC SWFRCP', a: '5', b: '8' }), action: 'dec', copy: 'AFFINE CIPHER' },
    { in: w(U, { text: 'AFFINE CIPHER', a: '31', b: '-18' }), copy: 'IHHWVC SWFRCP' },
    { in: w(F, { text: 'Hello', a: '1', b: '3' }), copy: 'Khoor' },
    { in: w(F, { text: 'abcxyz', a: '25', b: '25' }), copy: 'zyxcba' },
    { in: w(F, { text: 'Hello', a: '2', b: '3' }), error: true },
    { in: w(F, { text: 'Hello', a: '13', b: '3' }), error: true },
    { in: w(F, { text: 'Hello', a: '0', b: '3' }), error: true },
    { in: w(F, { text: 'Hello', a: '26', b: '3' }), error: true },
    { in: w(F, { text: '!!', a: '5', b: '8' }), error: true }
]);
T.tool('keyword-substitution', [
    { in: w(U, { text: 'flee at once. we are discovered!', mode: 'keyword', key: 'ZEBRAS', fill: 'az' }), copy: 'SIAA ZQ LKBA. VA ZOA RFPBLUAOAR!' },
    { in: w(U, { text: 'SIAA ZQ LKBA. VA ZOA RFPBLUAOAR!', mode: 'keyword', key: 'zebras', fill: 'az' }), action: 'dec', copy: 'FLEE AT ONCE. WE ARE DISCOVERED!' },
    { in: w(U, { text: 'HELLO', mode: 'keyword', key: 'ZEBRAS', fill: 'after' }), copy: 'UAYYF' },
    { in: w(F, { text: 'Hello', mode: 'alphabet', alpha: 'QWERTYUIOPASDFGHJKLZXCVBNM' }), copy: 'Itssg' },
    { in: w(F, { text: 'Itssg', mode: 'alphabet', alpha: 'qwertyuiop asdfghjkl zxcvbnm' }), action: 'dec', copy: 'Hello' },
    { in: w(F, { text: 'Hello', mode: 'alphabet', alpha: 'QWERTYUIOPASDFGHJKLZXCVBN' }), error: true },
    { in: w(F, { text: 'Hello', mode: 'alphabet', alpha: 'QWERTYUIOPASDFGHJKLZXCVBNQ' }), error: true },
    { in: w(F, { text: 'Hello', mode: 'keyword', key: '123', fill: 'az' }), error: true }
]);
T.tool('vigenere', [
    { in: w(F, { text: 'ATTACKATDAWN', key: 'LEMON' }), copy: 'LXFOPVEFRNHR' },
    { in: w(F, { text: 'LXFOPVEFRNHR', key: 'LEMON' }), action: 'dec', copy: 'ATTACKATDAWN' },
    { in: w(F, { text: 'Attack at dawn!', key: 'lemon' }), copy: 'Lxfopv ef rnhr!' },
    { in: w(F, { text: 'Attack at dawn!', key: 'Le-mon 2' }), copy: 'Lxfopv ef rnhr!' },
    { in: { text: 'Attack at dawn!', key: 'LEMON', keep: true, caseK: false, five: true }, copy: 'LXFOP VEFRN HR' },
    { in: w(F, { text: 'Hello', key: 'A' }), copy: 'Hello' },
    { in: w(F, { text: 'Hello', key: '123' }), error: true }
]);
T.tool('beaufort', [
    { in: w(U, { text: 'Defend the east wall of the castle', key: 'FORTIFICATION', variant: 'beaufort', keep: false }), copy: 'CKMPVCPVWPIWUJOGIUAPVWRIWUUK' },
    { in: w(U, { text: 'CKMPVCPVWPIWUJOGIUAPVWRIWUUK', key: 'FORTIFICATION', variant: 'beaufort' }), action: 'dec', copy: 'DEFENDTHEEASTWALLOFTHECASTLE' },
    { in: w(U, { text: 'CKMPVCPVWPIWUJOGIUAPVWRIWUUK', key: 'FORTIFICATION', variant: 'beaufort' }), action: 'enc', copy: 'DEFENDTHEEASTWALLOFTHECASTLE' },
    { in: w(F, { text: 'LXFOPVEFRNHR', key: 'LEMON', variant: 'german' }), copy: 'ATTACKATDAWN' },
    { in: w(F, { text: 'ATTACKATDAWN', key: 'LEMON', variant: 'german' }), action: 'dec', copy: 'LXFOPVEFRNHR' },
    { in: w(F, { text: 'abc', key: '', variant: 'beaufort' }), error: true }
]);
T.tool('autokey', [
    { in: w(U, { text: 'attack at dawn', key: 'QUEENLY' }), copy: 'QNXEPV YT WTWP' },
    { in: w(F, { text: 'QNXEPVYTWTWP', key: 'QUEENLY' }), action: 'dec', copy: 'ATTACKATDAWN' },
    { in: w(F, { text: 'abc', key: 'QUEENLY' }), copy: 'qvg' },
    { in: w(F, { text: 'abc', key: '!' }), error: true }
]);
T.tool('playfair', [
    { in: { text: 'Hide the gold in the tree stump', key: 'PLAYFAIR EXAMPLE', sq: 'ij', pad: 'X', five: false }, copy: 'BMODZBXDNABEKUDMUIXMMOUVIF' },
    { in: { text: 'BMODZBXDNABEKUDMUIXMMOUVIF', key: 'PLAYFAIR EXAMPLE', sq: 'ij', pad: 'X', five: false }, action: 'dec', copy: 'HIDETHEGOLDINTHETREXESTUMP',
        check: function (S) { return S.notes.some(function (n) { return n.indexOf('HIDETHEGOLDINTHETREESTUMP') >= 0; }) || 'the note without fillers is missing'; } },
    { in: { text: 'instruments', key: 'MONARCHY', sq: 'ij', pad: 'Z', five: false }, copy: 'GATLMZCLRQTX' },
    { in: { text: 'instruments', key: 'MONARCHY', sq: 'ij', pad: 'X', five: true }, copy: 'GATLM ZCLRQ XA' },
    { in: { text: 'balloon', key: 'MONARCHY', sq: 'ij', pad: 'X', five: false }, copy: 'IBSUPMNA' },
    { in: { text: 'xx', key: 'MONARCHY', sq: 'ij', pad: 'X', five: false }, check: function (S, c) { return c.length === 4 || 'XX must become XQ XQ, got ' + c; } },
    { in: { text: 'ABC', key: '', sq: 'q', pad: 'Q', five: false }, error: true },
    { in: { text: 'ABC', key: 'KEY', sq: 'ij', pad: 'X', five: false }, action: 'dec', error: true },
    { in: { text: 'AABC', key: 'KEY', sq: 'ij', pad: 'X', five: false }, action: 'dec', error: true },
    { in: { text: '123', key: 'KEY', sq: 'ij', pad: 'X', five: false }, error: true }
]);
T.tool('hill', [
    { in: w(F, { text: 'ACT', key: 'GYBNQKURP', conv: 'col', pad: 'X' }), copy: 'POH' },
    { in: w(F, { text: 'CAT', key: 'GYBNQKURP', conv: 'col', pad: 'X' }), copy: 'FIN' },
    { in: w(F, { text: 'POH', key: 'GYBNQKURP', conv: 'col', pad: 'X' }), action: 'dec', copy: 'ACT' },
    { in: w(F, { text: 'POH', key: '6 24 1; 13 16 10; 20 17 15', conv: 'col', pad: 'X' }), action: 'dec', copy: 'ACT' },
    { in: w(F, { text: 'HELP', key: '3 3 2 5', conv: 'col', pad: 'X' }), copy: 'HIAT' },
    { in: w(F, { text: 'HELP', key: '3 2 3 5', conv: 'row', pad: 'X' }), copy: 'HIAT' },
    { in: w(F, { text: 'Help!', key: '29, -23, 2, 5', conv: 'col', pad: 'X' }), copy: 'Hiat!' },
    { in: w(F, { text: 'HEL', key: '3 3 2 5', conv: 'col', pad: 'X' }), check: function (S, c) { return c.length === 4 && c.slice(0, 2) === 'HI' || 'padding: ' + c; } },
    { in: w(F, { text: 'POHX', key: 'GYBNQKURP', conv: 'col', pad: 'X' }), action: 'dec', error: true },
    { in: w(F, { text: 'ABC', key: 'ABCD', conv: 'col', pad: 'X' }), error: true },
    { in: w(F, { text: 'ABC', key: '2 0 0 1', conv: 'col', pad: 'X' }), error: true },
    { in: w(F, { text: 'ABC', key: '13 0 0 1', conv: 'col', pad: 'X' }), error: true },
    { in: w(F, { text: 'ABC', key: 'ABCDE', conv: 'col', pad: 'X' }), error: true },
    { in: w(F, { text: 'ABC', key: 'AB 1 2', conv: 'col', pad: 'X' }), error: true }
]);
T.tool('rail-fence', [
    { in: { text: 'WE ARE DISCOVERED. RUN AT ONCE.', rails: '3', offset: '0', chars: 'letters', caseK: true, five: false }, copy: 'WECRUOERDSOEERNTNEAIVDAC' },
    { in: { text: 'WECRUOERDSOEERNTNEAIVDAC', rails: '3', offset: '0', chars: 'letters', caseK: true, five: false }, action: 'dec', copy: 'WEAREDISCOVEREDRUNATONCE' },
    { in: { text: 'HELLOWORLD', rails: '2', offset: '0', chars: 'letters', caseK: true, five: false }, copy: 'HLOOLELWRD' },
    { in: { text: 'HELLOWORLD', rails: '2', offset: '1', chars: 'letters', caseK: true, five: false }, copy: 'ELWRDHLOOL' },
    { in: { text: 'HELLOWORLD', rails: '2', offset: '3', chars: 'letters', caseK: true, five: false }, copy: 'ELWRDHLOOL' },
    { in: { text: 'ab', rails: '5', offset: '0', chars: 'letters', caseK: true, five: false }, copy: 'ab' },
    { in: { text: 'a b', rails: '2', offset: '0', chars: 'all', caseK: true, five: false }, copy: 'ab ' },
    { in: { text: 'abc', rails: '1', offset: '0', chars: 'letters', caseK: true, five: false }, error: true },
    { in: { text: '!!', rails: '3', offset: '0', chars: 'letters', caseK: true, five: false }, error: true }
]);
T.tool('columnar-transposition', [
    { in: { text: 'We are discovered. Flee at once.', key: 'ZEBRAS', pad: 'none', chars: 'letters', caseK: false, five: false }, copy: 'EVLNACDTESEAROFODEECWIREE' },
    { in: { text: 'We are discovered. Flee at once.', key: 'ZEBRAS', pad: 'fill', filler: 'QKJEU', chars: 'letters', caseK: false, five: true }, copy: 'EVLNE ACDTK ESEAQ ROFOJ DEECU WIREE' },
    { in: { text: 'EVLNACDTESEAROFODEECWIREE', key: 'ZEBRAS', pad: 'none', chars: 'letters', caseK: false, five: false }, action: 'dec', copy: 'WEAREDISCOVEREDFLEEATONCE' },
    { in: { text: 'EVLNACDTESEAROFODEECWIREE', key: '6 3 2 4 1 5', pad: 'none', chars: 'letters', caseK: false, five: false }, action: 'dec', copy: 'WEAREDISCOVEREDFLEEATONCE' },
    { in: { text: 'abcdef', key: '2 1', pad: 'none', chars: 'letters', caseK: true, five: false }, copy: 'bdface' },
    { in: { text: 'abcde', key: 'BA', pad: 'fill', filler: 'x', chars: 'letters', caseK: true, five: false }, copy: 'bdxace' },
    { in: { text: 'abc', key: '1 1 2', pad: 'none', chars: 'letters', caseK: true, five: false }, error: true },
    { in: { text: 'abc', key: '1 3', pad: 'none', chars: 'letters', caseK: true, five: false }, error: true },
    { in: { text: 'abc', key: '!!', pad: 'none', chars: 'letters', caseK: true, five: false }, error: true }
]);
T.tool('scytale', [
    { in: { text: 'I am hurt very badly help', around: '4', pad: 'none', chars: 'letters', caseK: false, five: false }, copy: 'IRYYATBHMVAEHEDLURLP' },
    { in: { text: 'IRYYATBHMVAEHEDLURLP', around: '4', pad: 'none', chars: 'letters', caseK: false, five: false }, action: 'dec', copy: 'IAMHURTVERYBADLYHELP' },
    { in: { text: 'abcde', around: '2', pad: 'none', chars: 'letters', caseK: true, five: false }, copy: 'adbec' },
    { in: { text: 'abcde', around: '2', pad: 'fill', filler: 'x', chars: 'letters', caseK: true, five: false }, copy: 'adbecx' },
    { in: { text: 'abc', around: '1', pad: 'none', chars: 'letters', caseK: true, five: false }, error: true }
]);
T.tool('polybius', [
    { in: { text: 'HELLO', sq: 'ij', key: '', labels: '', keep: true }, copy: '23 15 31 31 34' },
    { in: { text: 'Hello world', sq: 'ij', key: '', labels: '', keep: true }, copy: '23 15 31 31 34 / 52 34 42 31 14' },
    { in: { text: '23 15 31 31 34 / 52 34 42 31 14', sq: 'ij', key: '', labels: '', keep: true }, action: 'dec', copy: 'HELLO WORLD' },
    { in: { text: '2315313134', sq: 'ij', key: '', labels: '', keep: false }, action: 'dec', copy: 'HELLO' },
    { in: { text: 'Jam', sq: 'ij', key: '', labels: '', keep: true }, copy: '24 11 32' },
    { in: { text: 'A1', sq: 'd36', key: '', labels: '', keep: true }, copy: '11 54' },
    { in: { text: 'Attack', sq: 'ij', key: '', labels: 'ADFGX', keep: true }, copy: 'AA GG GG AA AF DX' },
    { in: { text: '231', sq: 'ij', key: '', labels: '', keep: true }, action: 'dec', error: true },
    { in: { text: 'abc', sq: 'ij', key: '', labels: '1234', keep: true }, error: true },
    { in: { text: 'abc', sq: 'ij', key: '', labels: '11234', keep: true }, error: true }
]);
T.tool('bifid', [
    { in: { text: 'Flee at once', key: 'BGWKZQPNDSIOAXEFCLUMTHYVR', sq: 'ij', period: '0', keep: false, caseK: false, five: false }, copy: 'UAEOLWRINS' },
    { in: { text: 'UAEOLWRINS', key: 'BGWKZQPNDSIOAXEFCLUMTHYVR', sq: 'ij', period: '0', keep: false, caseK: false, five: false }, action: 'dec', copy: 'FLEEATONCE' },
    { in: { text: 'Flee at once', key: 'BGWKZQPNDSIOAXEFCLUMTHYVR', sq: 'ij', period: '10', keep: true, caseK: true, five: false }, copy: 'Uaeo lw rins' },
    { in: { text: 'ab', key: '', sq: 'ij', period: '1', keep: true, caseK: true, five: false }, copy: 'ab' },
    { in: { text: '...', key: '', sq: 'ij', period: '0', keep: true, caseK: true, five: false }, error: true }
]);
T.tool('adfgvx', [
    { in: { text: 'Attack at 1200 am', variant: 'adfgvx', sqkey: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', key: 'PRIVACY', five: false }, copy: 'DGDDDAGDDGAFADDFDADVDVFAADVX' },
    { in: { text: 'DGDD DAGD DGAF ADDF DADV DVFA ADVX', variant: 'adfgvx', sqkey: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', key: 'PRIVACY', five: false }, action: 'dec', copy: 'ATTACKAT1200AM' },
    { in: { text: 'ab', variant: 'adfgx', sqkey: '', key: 'BA', five: false }, copy: 'ADAA' },
    { in: { text: 'ADF', variant: 'adfgvx', sqkey: '', key: 'KEY', five: false }, action: 'dec', error: true },
    { in: { text: '!!', variant: 'adfgvx', sqkey: '', key: 'KEY', five: false }, error: true },
    { in: { text: 'abc', variant: 'adfgvx', sqkey: '', key: '', five: false }, error: true }
]);
T.tool('bacon', [
    { in: { text: 'Bacon', version: '24', mode: 'symbols', a: 'A', b: 'B' }, copy: 'AAAAB AAAAA AAABA ABBAB ABBAA' },
    { in: { text: 'aaaab aaaaa aaaba abbab abbaa', version: '24', mode: 'symbols', a: 'A', b: 'B' }, action: 'dec', copy: 'BACON' },
    { in: { text: 'JUVW', version: '24', mode: 'symbols', a: 'A', b: 'B' }, copy: 'ABAAA BAABB BAABB BABAA' },
    { in: { text: 'JUVW', version: '26', mode: 'symbols', a: '0', b: '1' }, copy: '01001 10100 10101 10110' },
    { in: { text: '01001 10100 10101 10110 1', version: '26', mode: 'symbols', a: '0', b: '1' }, action: 'dec', copy: 'JUVW' },
    { in: { text: 'BBBBB', version: '24', mode: 'symbols', a: 'A', b: 'B' }, action: 'dec', copy: '?' },
    { in: { text: 'Yes', version: '26', mode: 'case', cover: 'Meet me by the old oak tree at noon, and bring the map.' }, copy: 'MEet me bY thE olD oak' },
    { in: { text: 'MEet me bY thE olD oak', version: '26', mode: 'case', cover: '' }, action: 'dec', copy: 'YES' },
    { in: { text: 'Yes', version: '26', mode: 'case', cover: 'Too short' }, error: true },
    { in: { text: 'abc', version: '26', mode: 'symbols', a: 'x', b: 'X' }, error: true },
    { in: { text: 'AB', version: '26', mode: 'symbols', a: 'A', b: 'B' }, action: 'dec', error: true }
]);
T.tool('one-time-pad', [
    { in: w(U, { text: 'HELLO', key: 'XMCKL' }), copy: 'EQNVZ' },
    { in: w(U, { text: 'EQNVZ', key: 'XMCKL' }), action: 'dec', copy: 'HELLO' },
    { in: w(F, { text: 'Hi there', key: 'XMCKLQZT' }), copy: 'Eu vrphd' },
    { in: w(U, { text: 'HELLO', key: 'XMCK' }), error: true },
    { in: w(U, { text: 'HELLO', key: '' }), action: 'dec', error: true },
    { in: w(U, { text: 'HELLO', key: '' }), check: function (S, c) {
        var m = /browser: ([A-Z]+)\./.exec(S.notes.join(' '));
        if (!m || m[1].length !== 5) return 'no drawn key in the note';
        var back = ''; for (var i = 0; i < 5; i++) back += String.fromCharCode(65 + ((c.charCodeAt(i) - m[1].charCodeAt(i) + 26) % 26));
        return back === 'HELLO' || 'drawn key does not decrypt: ' + back;
    } }
]);

/* ---------- random round trips ---------- */
var CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz.,!?0123456789 éÄ';
var AZaz = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function deacc(s) { return Calc.lib.text.deaccent(s); }
function letters(s) { return Calc.lib.text.letters(s); }
/* run enc then dec with the same inputs; the text of the second run is the first output */
function trip(id, input, want, what) {
    return T.run(id, input, 'enc').then(function (a) {
        if (a.errors) return id + ' enc error ' + JSON.stringify(a.errors) + ' on ' + JSON.stringify(input);
        var j = {}; Object.keys(input).forEach(function (k) { j[k] = input[k]; }); j.text = a.copy;
        return T.run(id, j, 'dec').then(function (b) {
            if (b.errors) return id + ' dec error ' + JSON.stringify(b.errors) + ' on ' + JSON.stringify(j);
            return b.copy === want ? true : id + (what ? ' (' + what + ')' : '') + ': ' + JSON.stringify(input) + ' gave ' + JSON.stringify(a.copy) + ' and back ' + JSON.stringify(b.copy) + ', want ' + JSON.stringify(want);
        });
    });
}
function key(r, lo, hi) { return r.text(r.num(lo, hi), AZaz); }
var COPRIME = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
T.prop('caesar round trip', 60, function (r) { var x = r.text(r.num(1, 50), CH) + 'a'; return trip('caesar', w(F, { text: x, shift: String(r.num(-100, 100)) }), deacc(x)); });
T.prop('rot13 round trip', 60, function (r) { var x = r.text(r.num(1, 50), CH) + 'a1!', vr = r.pick(['rot13', 'rot5', 'rot18', 'rot47']); return trip('rot13', { text: x, variant: vr }, vr === 'rot47' ? x : deacc(x)); });
T.prop('atbash round trip', 40, function (r) { var x = r.text(r.num(1, 50), CH) + 'a'; return trip('atbash', w(F, { text: x }), deacc(x)); });
T.prop('affine round trip', 60, function (r) { var x = r.text(r.num(1, 50), CH) + 'a'; return trip('affine', w(F, { text: x, a: String(r.pick(COPRIME) + 26 * r.num(-2, 2)), b: String(r.num(-50, 50)) }), deacc(x)); });
T.prop('affine refuses every a not coprime to 26', 1, function () {
    var chain = Promise.resolve(true);
    for (var a = 0; a < 26; a++) (function (a) {
        chain = chain.then(function (ok) {
            if (ok !== true) return ok;
            return T.run('affine', w(F, { text: 'abc', a: String(a), b: '1' })).then(function (o) { return (!!o.errors) === (COPRIME.indexOf(a) < 0) ? true : 'a = ' + a; });
        });
    })(a);
    return chain;
});
T.prop('keyword-substitution round trip', 60, function (r) {
    var x = r.text(r.num(1, 50), CH) + 'a';
    if (r.num(0, 1)) return trip('keyword-substitution', w(F, { text: x, mode: 'keyword', key: key(r, 1, 12), fill: r.pick(['az', 'after']) }), deacc(x));
    var al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); for (var i = 25; i > 0; i--) { var j = r.num(0, i), t = al[i]; al[i] = al[j]; al[j] = t; }
    return trip('keyword-substitution', w(F, { text: x, mode: 'alphabet', alpha: al.join('') }), deacc(x));
});
T.prop('vigenere round trip', 60, function (r) { var x = r.text(r.num(1, 60), CH) + 'a'; return trip('vigenere', w(F, { text: x, key: key(r, 1, 12) }), deacc(x)); });
T.prop('beaufort round trip', 60, function (r) { var x = r.text(r.num(1, 60), CH) + 'a'; return trip('beaufort', w(F, { text: x, key: key(r, 1, 12), variant: r.pick(['beaufort', 'german']) }), deacc(x)); });
T.prop('beaufort is its own inverse', 30, function (r) {
    var x = r.text(r.num(1, 40), CH) + 'a', inp = w(F, { text: x, key: key(r, 1, 8), variant: 'beaufort' });
    return T.run('beaufort', inp, 'enc').then(function (a) { return T.run('beaufort', inp, 'dec').then(function (b) { return a.copy === b.copy || 'enc and dec differ'; }); });
});
T.prop('autokey round trip', 60, function (r) { var x = r.text(r.num(1, 60), CH) + 'a'; return trip('autokey', w(F, { text: x, key: key(r, 1, 10) }), deacc(x)); });
T.prop('one-time-pad round trip', 40, function (r) { var x = r.text(r.num(1, 40), CH) + 'a'; return trip('one-time-pad', w(F, { text: x, key: r.text(letters(x).length + r.num(0, 5), AZaz) }), deacc(x)); });
T.prop('hill round trip', 80, function (r) {
    var n = r.pick([2, 3]), k = [];
    for (;;) {
        k = []; for (var i = 0; i < n * n; i++) k.push(r.num(0, 25));
        var d = n === 2 ? k[0] * k[3] - k[1] * k[2] : k[0] * (k[4] * k[8] - k[5] * k[7]) - k[1] * (k[3] * k[8] - k[5] * k[6]) + k[2] * (k[3] * k[7] - k[4] * k[6]);
        d = ((d % 26) + 26) % 26;
        if (d % 2 && d % 13) break;
    }
    var x = r.text(r.num(1, 40), CH) + 'a', L = letters(x), pad = (n - L.length % n) % n;
    var kk = r.num(0, 1) ? k.join(' ') : k.map(function (q) { return String.fromCharCode(65 + q); }).join('');
    return trip('hill', w(F, { text: x, key: kk, conv: r.pick(['col', 'row']), pad: 'X' }), deacc(x) + (pad ? (/[a-z]/.test(deacc(x).replace(/[^A-Za-z]/g, '').slice(-1)) ? 'xx' : 'XX').slice(0, pad) : ''));
});
T.prop('hill refuses keys with an even or 13-divisible determinant', 60, function (r) {
    var k = [r.num(0, 25), r.num(0, 25), r.num(0, 25), r.num(0, 25)], d = ((k[0] * k[3] - k[1] * k[2]) % 26 + 26) % 26;
    return T.run('hill', w(F, { text: 'abcd', key: k.join(' '), conv: 'col', pad: 'X' })).then(function (o) { return (!!o.errors) === !(d % 2 && d % 13) || 'key ' + k + ' det ' + d; });
});
T.prop('playfair round trip', 60, function (r) {
    var x = r.text(r.num(1, 50), CH) + 'a', sq = r.pick(['ij', 'q']), pad = r.pick(['X', 'Z']);
    var L = letters(x); L = sq === 'ij' ? L.replace(/J/g, 'I') : L.replace(/Q/g, '');
    var alt = ['X', 'Q', 'Z', 'K'].filter(function (c) { return c !== pad && !(sq === 'q' && c === 'Q'); })[0], want = '';
    for (var i = 0; i < L.length;) {
        var a = L.charAt(i), b = L.charAt(i + 1);
        if (!b || a === b) { want += a + (a === pad ? alt : pad); i++; } else { want += a + b; i += 2; }
    }
    return trip('playfair', { text: x, key: key(r, 0, 15), sq: sq, pad: pad, five: false }, want);
});
T.prop('rail-fence round trip', 60, function (r) { var x = r.text(r.num(1, 60), CH) + 'a'; return trip('rail-fence', { text: x, rails: String(r.num(2, 12)), offset: String(r.num(0, 30)), chars: 'all', caseK: true }, x); });
T.prop('columnar-transposition round trip', 60, function (r) {
    var x = r.text(r.num(1, 60), CH) + 'a', kk = r.num(0, 1) ? key(r, 1, 10) : (function () { var n = r.num(1, 9), a = []; for (var i = 1; i <= n; i++) a.splice(r.num(0, a.length), 0, i); return a.join(' '); })();
    return trip('columnar-transposition', { text: x, key: kk, pad: 'none', chars: 'all', caseK: true }, x);
});
T.prop('scytale round trip', 60, function (r) { var x = r.text(r.num(1, 60), CH) + 'a'; return trip('scytale', { text: x, around: String(r.num(2, 15)), pad: 'none', chars: r.pick(['all']), caseK: true }, x); });
T.prop('transpositions keep the letters (letters only, groups of five)', 40, function (r) {
    var x = r.text(r.num(1, 60), CH) + 'a', id = r.pick(['rail-fence', 'columnar-transposition', 'scytale']);
    var inp = { text: x, rails: String(r.num(2, 6)), offset: '0', key: key(r, 1, 7), around: String(r.num(2, 6)), pad: 'none', chars: 'letters', caseK: false, five: true };
    return T.run(id, inp).then(function (o) {
        var a = letters(x).split('').sort().join(''), b = o.copy.replace(/ /g, '').split('').sort().join('');
        if (a !== b) return id + ': the letters changed';
        return o.copy.split(' ').every(function (g, i, all) { return g.length === 5 || (i === all.length - 1 && g.length <= 5); }) || id + ': groups ' + o.copy;
    });
});
T.prop('polybius round trip', 40, function (r) {
    var x = r.text(r.num(1, 40), CH) + 'a', sq = r.pick(['ij', 'q', 'd36']);
    var want = deacc(x).split(/\s+/).map(function (wd) { return Calc.lib.classic.sqChars(wd, sq); }).filter(Boolean).join(' ');
    return trip('polybius', { text: x, sq: sq, key: key(r, 0, 10), labels: r.pick(['', sq === 'd36' ? 'ADFGVX' : 'ADFGX']), keep: true }, want);
});
T.prop('bifid round trip', 60, function (r) {
    var x = r.text(r.num(1, 50), CH) + 'a', sq = r.pick(['ij', 'q']);
    var want = deacc(x); want = sq === 'ij' ? want.replace(/J/g, 'I').replace(/j/g, 'i') : want.replace(/[Qq]/g, '');
    return trip('bifid', w(F, { text: x, key: key(r, 0, 12), sq: sq, period: String(r.pick([0, 0, r.num(1, 12)])) }), want);
});
T.prop('adfgvx round trip', 60, function (r) {
    var x = r.text(r.num(1, 50), CH) + 'a', vr = r.pick(['adfgvx', 'adfgx']);
    return trip('adfgvx', { text: x, variant: vr, sqkey: r.text(r.num(0, 20), AZaz + '0123456789'), key: key(r, 1, 9), five: false }, Calc.lib.classic.sqChars(x, vr === 'adfgx' ? 'ij' : 'd36'));
});
T.prop('bacon round trip', 40, function (r) {
    var x = r.text(r.num(1, 30), CH) + 'a', vr = r.pick(['24', '26']), L = letters(x);
    if (vr === '24') L = L.replace(/J/g, 'I').replace(/V/g, 'U');
    if (r.num(0, 1)) return trip('bacon', { text: x, version: vr, mode: 'symbols', a: r.pick(['A', '0', '.']), b: r.pick(['B', '1', '-']) }, L);
    return trip('bacon', { text: x, version: vr, mode: 'case', cover: r.text(5 * L.length + r.num(0, 40), CH) + ' ' + r.text(5 * L.length, AZaz) }, L);
});

/* ---------- the library ---------- */
T.prop('classic.order and columnar helpers', 200, function (r) {
    var C = Calc.lib.classic, o = C.order(key(r, 1, 12)), n = r.num(0, 40), a = [];
    for (var i = 0; i < n; i++) a.push(i);
    var e = C.colEnc(a, o.read).out, d = C.colDec(e, o.read).out;
    if (o.read.slice().sort(function (x, y) { return x - y; }).join() !== o.rank.map(function (x, i) { return i; }).join()) return 'read is not a permutation';
    return d.join() === a.join() || 'colDec(colEnc(x)) != x for key ' + o.labels.join('');
});
T.ok('classic.order ZEBRAS', Calc.lib.classic.order('ZEBRAS').rank.join(' ') === '5 2 1 3 0 4');
T.ok('classic.order equal letters left to right', Calc.lib.classic.order('BANANA').rank.join(' ') === '3 0 4 1 5 2');
T.eq('classic.square PLAYFAIR EXAMPLE', Calc.lib.classic.square('PLAYFAIR EXAMPLE', 'ij').alpha, 'PLAYFIREXMBCDGHKNOQSTUVWZ');
T.eq('classic.square with digits', Calc.lib.classic.square('ph0qg64mea1yl2nofdxkr3cvs5zw7bj9uti8', 'd36').alpha, 'PH0QG64MEA1YL2NOFDXKR3CVS5ZW7BJ9UTI8');
T.eq('classic.put keeps shape', Calc.lib.classic.put(Calc.lib.classic.prep('Ab, c!'), 'XYZW', { keep: true, caseK: true }), 'Xy, zw!');
T.eq('classic.inv', [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25].map(function (a) { return Calc.lib.classic.inv(a, 26); }).join(' '), '1 9 21 15 3 19 7 23 11 5 17 25');
