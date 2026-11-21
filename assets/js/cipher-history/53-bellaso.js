/* Cipher History story: Bellaso's countersign, misnamed Vigenère, and Kasiski's attack (content/cipher-history/bellaso.md).
   The machine: a countersign written over the visitor's text, letter by letter, and the shifted alphabet each key
   letter picks. Your turn: Kasiski's two steps on a message we wrote: the repeats give the key length
   (30-desk-kasiski.js), then each column is an ordinary shift, solved by its letter counts. */
(function () {
    'use strict';
    var A = CH.ALPHA;
    var MSG = 'YWHYI FUPRW XIRFV YPSWP JMHNM QTZVE AMHYI MIFSS ZZOKX MMSEH TNHYI RWBKL FVRKL JMBVQ DUIJX SWHCI FZBFJ NBHVP QBVVG FXHRM SWTKL JOIRV IBVRX YPSCI YBSIW KZCDX MMBFV YPOII KIZJI FVRKL FBHYI JVSDC MIGJT NMGZR YPSGE QIQVW JVRPS ZZOEW BMFNM YPHYI XIAVG TCFZI WIBUO JMDKL JSSPM SGCLV TEBYE SLWWX MMQFY WQSIM XBOBI SJIIR YPSBI DIBUX MMZVX YMFJE YWBTI YPSVR JUMII FLGVZ JZMCI YBSIX MIHZW SWHZR HQDYI WACNV NBSES YPWEK NVDCE NVKFV IAOSS ZBHYI KTSVX TZHYI RWBVC';
    var ANSWER = '1lm03dx';   /* CH.print of the plaintext, see test/stories.test.js */

    CH.story({
        id: 'bellaso',
        msg: MSG,
        answer: ANSWER,
        machine: function (el) {
            var key = CH.input('LUNA', { maxlength: 24 });
            var text = CH.textarea('Meet me at the old bridge at noon', 2);
            el.appendChild(CH.field('Countersign (the key)', key, 'A word or a few words. Only the letters count.'));
            el.appendChild(CH.field('Your text', text));
            var align = CH.el('div', { class: 'ch-align', 'aria-label': 'Key, plain text and cipher, letter by letter' });
            var rows = CH.el('div');
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Key over plain text, cipher below' }));
            el.appendChild(align);
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The alphabets your key letters pick' }));
            el.appendChild(rows);
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'Key letter A shifts by 0, B by 1, C by 2, and so on. The same plain letter comes out differently under different key letters, so simple counting no longer works. These rows come from the square of 26 shifted alphabets now called the Vigenère table.' }));
            function draw() {
                var k = CH.letters(key.value), p = CH.letters(text.value);
                CH.clear(align);
                CH.clear(rows);
                if (!k || !p) { align.textContent = k ? 'Type some text.' : 'Type a countersign.'; return; }
                var c = CH.B().vigenere(p, k), per = 24;
                for (var i = 0; i < p.length; i += per) {
                    var kk = '', j;
                    for (j = i; j < Math.min(p.length, i + per); j++) kk += k.charAt(j % k.length);
                    align.appendChild(CH.el('div', null, [CH.el('span', { class: 'k', text: kk })]));
                    align.appendChild(CH.el('div', { text: p.slice(i, i + per).toLowerCase() }));
                    align.appendChild(CH.el('div', null, [CH.el('span', { class: 'c', text: c.slice(i, i + per) })]));
                    if (i + per < p.length) align.appendChild(CH.el('div', { html: '&nbsp;' }));
                }
                var seen = {};
                k.split('').forEach(function (L) {
                    if (seen[L]) return;
                    seen[L] = 1;
                    var s = L.charCodeAt(0) - 65, row = CH.el('div', { class: 'ch-tab-row' }, [CH.el('span', { text: 'Key ' + L + ':' })]);
                    for (var q = 0; q < 26; q++) row.appendChild(CH.el('span', { class: p.indexOf(A.charAt(q)) >= 0 ? 'is-hit' : null, text: A.charAt((q + s) % 26), title: A.charAt(q) + ' becomes ' + A.charAt((q + s) % 26) }));
                    rows.appendChild(row);
                });
                var head = CH.el('div', { class: 'ch-tab-row' }, [CH.el('span', { text: 'Plain:' })]);
                for (var q = 0; q < 26; q++) head.appendChild(CH.el('span', { text: A.charAt(q).toLowerCase() }));
                rows.insertBefore(head, rows.firstChild);
            }
            key.addEventListener('input', draw);
            text.addEventListener('input', draw);
            draw();
        },
        puzzle: function (el, turn) {
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Step 1: the repeats (Kasiski)' }));
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'The same word under the same part of the key gives the same cipher letters. The coloured pieces repeat; their gaps are multiples of the key length.' }));
            var stepTwo = CH.el('div');
            CH.desk.repeats(el, MSG, {
                onPick: function (p) {
                    CH.clear(stepTwo);
                    stepTwo.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Step 2: ' + p + ' columns, one per key letter' }));
                    stepTwo.appendChild(CH.el('p', { class: 'ch-help', text: 'Letters 1, ' + (p + 1) + ', ' + (2 * p + 1) + '... all used the first key letter, so they form a plain shift cipher. The same for the other columns.' }));
                    CH.desk.columns(stepTwo, MSG, p, {
                        onKey: function (key) {
                            var plain = CH.B().vigenere(MSG, key, true);
                            if (CH.print(plain) === ANSWER) turn.solved('Solved: the countersign is ' + key + '. The whole message reads.');
                            else turn.say('Key so far: ' + key + '. Slide each column until its bars match English.');
                        }
                    });
                }
            });
            el.appendChild(stepTwo);
            turn.say('Pick the key length that divides the most gaps (a smaller number that divides them too may only be a part of it).');
        }
    });
})();
