/* Toolbox: rail fence cipher: the zigzag drawn with characters (rails and offset), read rail by rail; decryption
   cuts the ciphertext into rails of the right lengths and follows the zigzag again. */
Calc.tool({
    id: 'rail-fence',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('We are discovered. Run at once!'),
        { id: 'rails', label: 'Rails', placeholder: '3', width: 's', min: 2, max: 1000 },
        { id: 'offset', label: 'Offset', value: '0', placeholder: '0', width: 's', min: 0, help: 'How far along the zigzag the first character starts.' }
    ].concat(Calc.lib.classic.transInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'We are discovered. Run at once!', rails: '3', offset: '0', chars: 'letters', caseK: false, five: false },
        { text: 'WECRUOERDSOEERNTNEAIVDAC', rails: '3', offset: '0', chars: 'letters', caseK: false, five: false, _action: 'dec' },
        { text: 'Hello, World!', rails: '4', offset: '2', chars: 'all', caseK: true, five: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', ch = C.transChars(v.text, v), N = ch.length;
        if (!N) Calc.fail(v.chars === 'all' ? 'Please enter some text.' : 'The text has no letters A to Z.', 'text');
        if (N > 20000) Calc.fail('At most 20000 characters.', 'text');
        var R = Number(v.rails), cyc = 2 * (R - 1), off = Number(v.offset % BigInt(cyc));
        function rail(i) { var t = (i + off) % cyc; return t < R ? t : cyc - t; }
        var of = [], cnt = [];
        for (var r = 0; r < R; r++) cnt.push(0);
        for (var i = 0; i < N; i++) { of.push(rail(i)); cnt[of[i]]++; }
        /* positions of the text in reading order (rail 0 left to right, then rail 1, ...) */
        var order = [];
        for (var r2 = 0; r2 < R; r2++) for (var j = 0; j < N; j++) if (of[j] === r2) order.push(j);
        var plain = [], out = [];
        if (enc) { plain = ch; out = order.map(function (k) { return ch[k]; }); }
        else { plain = []; order.forEach(function (k, t) { plain[k] = ch[t]; }); out = plain; }
        var res = C.transOut(out, v);
        C.result(S, res, enc, R >= N ? 'With at least as many rails as characters, the zigzag never turns and the text does not change.' : '');

        var s1 = S.step('The zigzag');
        s1.p('Write the ' + (enc ? 'text' : 'plaintext positions') + ' diagonally down and up across ' + R + ' rails: one period is ' + cyc + ' characters (down ' + (R - 1) + ', up ' + (R - 1) + ')' + (off ? ', and an offset of ' + off + ' starts the text ' + off + ' steps into the first period' : '') + '.' + (v.chars === 'all' ? ' Spaces are shown as ␣, empty places as ·.' : ''));
        var W = Math.min(N, 120), lines = [], dot = v.chars === 'all' ? '·' : '.';
        for (var r3 = 0; r3 < R && r3 < 60; r3++) {
            var line = '';
            for (var k = 0; k < W; k++) line += of[k] === r3 ? (plain[k] === ' ' ? '␣' : plain[k] === '\n' ? '↵' : plain[k]) : dot;
            lines.push(line);
        }
        s1.pre(lines.join('\n') + (N > W || R > 60 ? '\n(first ' + W + ' characters' + (R > 60 ? ', first 60 rails' : '') + ')' : ''));

        var s2 = S.step(enc ? 'Read the rails' : 'Cut the ciphertext into rails');
        if (!enc) s2.p('The zigzag of ' + N + ' characters puts this many on each rail, so the ciphertext is cut into pieces of these lengths, top rail first. Writing the pieces onto their rails and following the zigzag gives the plaintext (drawn above).');
        else s2.p('Read the rails from top to bottom, each from left to right:');
        var rows = [], at = 0;
        for (var r4 = 0; r4 < R; r4++) {
            var piece = (enc ? out : ch).slice(at, at + cnt[r4]).map(C.cell).join('');
            at += cnt[r4];
            rows.push([r4 + 1, cnt[r4], piece || '(empty)']);
        }
        s2.table(['Rail', 'Characters', enc ? 'Read' : 'Piece'], rows, { mono: true });

        var back = enc ? [] : order.map(function (q) { return out[q]; });
        if (enc) order.forEach(function (q, t) { back[q] = out[t]; });
        C.checkBack(S, enc, back.join(''), ch.join(''), '');
    }
});
