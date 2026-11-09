/* Toolbox: Bifid cipher (Delastelle): Polybius coordinates written in two lines, read across, and paired up
   again, block by block when a period is given. */
Calc.tool({
    id: 'bifid',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Flee at once'),
        { id: 'key', type: 'text', label: 'Keyword', placeholder: 'BGWKZQPNDSIOAXEFCLUMTHYVR', optional: true },
        { id: 'sq', type: 'select', label: 'Square', width: 'l', value: 'ij', options: Calc.lib.classic.squareOptions(false) },
        { id: 'period', label: 'Period', value: '0', placeholder: '0', width: 's', min: 0, help: 'Length of the blocks; 0 for the whole text as one block.' }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Flee at once', key: 'BGWKZQPNDSIOAXEFCLUMTHYVR', sq: 'ij', period: '0', keep: false, caseK: false, five: false },
        { text: 'UAEOLWRINS', key: 'BGWKZQPNDSIOAXEFCLUMTHYVR', sq: 'ij', period: '0', keep: true, caseK: true, five: false, _action: 'dec' },
        { text: 'Defend the east wall of the castle', key: 'KEYWORD', sq: 'ij', period: '5', keep: true, caseK: true, five: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', sq = C.square(v.key || '', v.sq);
        var src = v.sq === 'q' ? Calc.lib.text.deaccent(v.text).replace(/[Qq]/g, '') : v.text;
        var p = C.prep(src), L = v.sq === 'ij' ? p.L.replace(/J/g, 'I') : p.L;
        C.needLetters(p);
        var per = Number(v.period > 100000n ? 100000n : v.period) || L.length;
        function crypt(T, e) {
            var o = '', blocks = [];
            for (var b = 0; b < T.length; b += per) {
                var B = T.slice(b, b + per), R = [], K = [], line, pairs = [];
                B.split('').forEach(function (c) { R.push(sq.pos[c][0] + 1); K.push(sq.pos[c][1] + 1); });
                if (e) line = R.concat(K);
                else { line = []; B.split('').forEach(function (c, i) { line.push(R[i], K[i]); }); }
                var out = '';
                if (e) for (var i = 0; i < line.length; i += 2) { pairs.push('' + line[i] + line[i + 1]); out += sq.rows[line[i] - 1][line[i + 1] - 1]; }
                else for (var j = 0; j < B.length; j++) { pairs.push('' + line[j] + line[j + B.length]); out += sq.rows[line[j] - 1][line[j + B.length] - 1]; }
                o += out;
                blocks.push({ B: B, R: R, K: K, line: line, pairs: pairs, out: out });
            }
            return { out: o, blocks: blocks };
        }
        var r = crypt(L, enc), out = r.out;
        C.result(S, C.put(p, out, v), enc, v.sq === 'ij' && !enc && /I/.test(out) ? 'I and J share a cell: read each I as I or J, whichever makes sense.' : '');

        var t = C.squareTable(sq);
        S.step('The square').p(C.squareWords(sq)).table(t.head, t.rows, { mono: true });
        var s2 = S.step(enc ? 'Write the coordinates in two lines' : 'Write the coordinates in one line');
        var blk = per >= L.length ? 'the whole text is one block' : 'the letters are taken in blocks of ' + per + ' (the last may be shorter)';
        if (enc) s2.p('Under each letter write its row, and under that its column; ' + blk + '. Then read each block across: first the line of rows, then the line of columns. Cut this sequence into pairs (row, column) and look each pair up in the square.');
        else s2.p('Encryption read the rows of a block and then its columns. So write the coordinates (row, column) of the cipher letters in one line: its first half is the line of rows of the plaintext and the second half the line of columns; ' + blk + '. Pair the two halves position by position.');
        var f = r.blocks[0];
        if (enc) s2.pre('Letters: ' + f.B.split('').join(' ') + '\nRows:    ' + f.R.join(' ') + '\nColumns: ' + f.K.join(' ') + '\n\nRead across: ' + f.line.join('') + '\nPairs:       ' + f.pairs.join(' ') + '\nLetters:     ' + f.out.split('').join('  ') + (r.blocks.length > 1 ? '\n(first block)' : ''));
        else {
            var h = f.B.length;
            s2.pre('Letters:       ' + f.B.split('').join('  ') + '\nCoordinates:   ' + f.B.split('').map(function (c, i) { return '' + f.R[i] + f.K[i]; }).join(' ') + '\n\nRows:    ' + f.line.slice(0, h).join(' ') + '\nColumns: ' + f.line.slice(h).join(' ') + '\nLetters: ' + f.out.split('').join(' ') + (r.blocks.length > 1 ? '\n(first block)' : ''));
        }
        S.step('Block by block').table(['Block', enc ? 'Plain' : 'Cipher', enc ? 'Rows, then columns' : 'Coordinates in one line', 'Pairs', enc ? 'Cipher' : 'Plain'],
            r.blocks.map(function (b, i) { return [i + 1, b.B, b.line.join(''), b.pairs.join(' '), b.out]; }), { mono: true });
        C.checkBack(S, enc, crypt(out, !enc).out, L, v.sq === 'ij' && /J/.test(p.L) ? '(with J written as I)' : '(letters only)');
    }
});
