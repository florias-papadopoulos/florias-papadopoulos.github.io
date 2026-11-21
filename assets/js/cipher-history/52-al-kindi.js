/* Cipher History story: al-Kindi and letter counting (content/cipher-history/al-kindi.md).
   The machine: count the letters of any text; scramble it with a secret alphabet and see that the counts only change
   places. Your turn: a substitution message we wrote, broken on the frequency bench (20-desk-bench.js): match by
   rank as al-Kindi describes, then fix the letters with the words you can read. */
(function () {
    'use strict';
    var MSG = 'KC XRQJ ZJARSX, VIR MQJQBQS ZJDK WQFJQ JRQMIRX VIR MAVC VIAF KDJSASU GAVI ASE, MYDVI QSX VIR WDDEF CDT QFERX ZDJ. A IQBR IAXXRS VIRK AS VIR IDTFR DZ VIR DYX FMJAWR SRQJ VIR WJAXUR. MDKR QZVRJ VIR RBRSASU KRQY QSX WJASU VIR FAYBRJ. VRYY SD DSR QWDTV VIAF YRVVRJ, QSX WTJS AV GIRS CDT IQBR JRQX AV. AZ QSCDSR QFEF, FQC VIQV CDT QJR WTCASU XQVRF QSX IDSRC ZDJ CDTJ KDVIRJ. VIR UTQJXF QV VIR SDJVI UQVR QJR GQVMIASU RBRJC VJQXRJ VIAF GRRE, FD VQER VIR YDSU JDQX WC VIR JABRJ QSX GQAV TSVAY VIR FVJRRVF QJR LTARV.';
    var ANSWER = 'aj1qzf';   /* CH.print of the plaintext, see test/stories.test.js */

    /* bars of a text's letters, A to Z, as tall as the most common one */
    function bars(el, text, label) {
        var c = CH.B().countCodes(CH.B().codes(text)), max = Math.max.apply(null, c) || 1;
        var row = CH.el('div', { class: 'ch-bars', role: 'img', 'aria-label': label });
        for (var i = 0; i < 26; i++) row.appendChild(CH.el('span', { class: 'ch-bar' }, [CH.el('i', { style: 'height:' + Math.round(c[i] / max * 100) + '%' }), CH.el('b', { text: CH.ALPHA.charAt(i) })]));
        CH.clear(el).appendChild(row);
    }
    function randomAlphabet() {
        var a = CH.ALPHA.split('');
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
        return a.join('');
    }

    CH.story({
        id: 'al-kindi',
        msg: MSG,
        answer: ANSWER,
        machine: function (el) {
            var input = CH.textarea('Write or paste a few sentences of ordinary English here. The longer the text, the more its bars look like those of any other English text: E on top, then T and A, and almost no J, Q, X or Z.', 4);
            el.appendChild(CH.field('Your text', input));
            var plainBars = CH.el('div');
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Its letters, A to Z' }));
            el.appendChild(plainBars);
            var key = randomAlphabet();
            var row = CH.el('div', { class: 'ch-row' });
            row.appendChild(CH.button('New secret alphabet', function () { key = randomAlphabet(); draw(); }));
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Enciphered with a secret alphabet' }));
            var out = CH.pre('', 'is-cipher');
            el.appendChild(out);
            var cipherBars = CH.el('div');
            el.appendChild(cipherBars);
            el.appendChild(row);
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'Same bars, different letters: the secret alphabet only moves each bar to another letter. That is the weakness al-Kindi used.' }));
            function draw() {
                bars(plainBars, input.value, 'Letter counts of your text');
                var c = CH.B().subst(input.value, key);
                out.textContent = c;
                bars(cipherBars, c, 'Letter counts of the enciphered text');
            }
            input.addEventListener('input', draw);
            draw();
        },
        puzzle: function (el, turn) {
            var bench = CH.desk.bench(el, {
                tokens: CH.desk.tokens(MSG),
                rank: true,
                onChange: function (b) {
                    var plain = b.plain();
                    if (CH.print(plain) === ANSWER) { turn.solved('Solved: every letter is right. The message is readable.'); return; }
                    var set = b.order.filter(function (s) { return b.map[s]; }).length;
                    turn.say(set ? set + ' of ' + b.order.length + ' signs have a letter. Keep going until every word reads.' : 'Start with "Match by rank", then fix the letters that make no sense.');
                }
            });
            return bench;
        }
    });
})();
