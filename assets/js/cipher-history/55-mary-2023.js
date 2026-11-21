/* Cipher History story: Mary Stuart's lost letters, deciphered in 2022 and published in 2023
   (content/cipher-history/mary-2023.md).
   A homophonic cipher: common letters have several signs (here e has three; t, a, o, i and n have two; every other
   letter one: 33 signs), so counting signs no longer points at e. The machine: the visitor's text in such a key.
   Your turn: a letter we wrote in English (not a translation of Mary's letters, which are in French), in a secret key
   of the same shape; rank matching fails, the hill climber (15-desk-climb.js) gets it, the bench (20-desk-bench.js)
   shows it and takes the visitor's corrections. Word breaks are dropped, as in a real cipher letter. */
(function () {
    'use strict';
    var SIGNS = 'αβγδεζηθλμξπσφχψωΔΘΛΞΣΦΨΩ∞∂⊕⊗†‡§¶'.split('');
    /* how many signs each letter has, A to Z */
    var COUNT = { E: 3, T: 2, A: 2, O: 2, I: 2, N: 2 };
    /* the key's shape: sign slot i belongs to letter SHAPE[i] (codes 0 to 25), e first */
    var SHAPE = [];
    'ETAOINBCDFGHJKLMPQRSUVWXYZ'.split('').forEach(function (L) { for (var k = 0; k < (COUNT[L] || 1); k++) SHAPE.push(L.charCodeAt(0) - 65); });
    /* the machine's key: sign i stands for SHAPE[i] (shown on the page) */
    function machineKey() { var m = {}; SIGNS.forEach(function (s, i) { var L = CH.ALPHA.charAt(SHAPE[i]); (m[L] = m[L] || []).push(s); }); return m; }

    /* the puzzle's message, in a secret key of the same shape (see test/stories.test.js) */
    var MSG = 'ηΘΞΣΦ⊕ξσ⊗ψη¶ξΨΦΣΣαψσψΦμ¶Ψ§σ§‡ψαΨ§⊗Δλξσ†§εε⊕σλω∂μψε§ΞεμηΔμ§¶†εμΦΣβΘσΣ⊕∂μαΣβαΞεψσΩΞ⊗ηΔ∞§§γ⊕σΣΩ††Θβη§ΞλΩΦσΩΞ⊗θλ§ζψσ‡ΦΣ§ΦπψΛΔΘξεΘγσ§ΣΣεμ§φξψ§ΞΘω⊕θΛ†¶Ξ⊗¶Λ¶αΞΩπλξ∂ηΔ†απ⊕σ∂ΔωλσΦωψΩσεμ¶∂Ω††∂μαΣε¶†∞λωηΔσ§†§ΩΣψαΣλθ†ΔβΘσ⊗Σ∂Θ∞⊕ψγη⊕φξΦ⊕ε⊗ΘθΘ∂εσξΣ∂β¶†ΣΦΞΛμΩηβμΘσ⊕Ω⊗ΣΩ††∂μΩεγ¶ΣΣ§ΣεμσΘξΛμμαΣμ¶θ⊗ΣΣ§θ⊗ΔΘξσ¶θΣβψσπΔ∂μψΣΩηψβΩΔΦΞεμΦΣ‡αγμ⊕σΩθ⊗πξσΞ∂μαΣ†§ε∂ψσβμ⊕θΔΘξμΩΨψσψΩ⊗α∂';
    var ANSWER = '12xi1x1';   /* CH.print of the plaintext, see test/stories.test.js */

    /* encipher: each letter takes one of its signs at random (rnd), so no sign is used much more than the others */
    function encipher(text, key, rnd) {
        rnd = rnd || Math.random;
        return CH.letters(text).split('').map(function (L) { var s = key[L]; return s[Math.floor(rnd() * s.length)]; }).join('');
    }

    CH.story({
        id: 'mary-2023',
        msg: MSG,
        answer: ANSWER,
        signs: SIGNS,
        shape: SHAPE,
        encipher: encipher,
        machine: function (el) {
            var key = machineKey();
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The key: one sign for a rare letter, two or three for a common one' }));
            var grid = CH.el('div', { class: 'ch-key' });
            CH.ALPHA.split('').forEach(function (L) {
                grid.appendChild(CH.el('div', { class: 'ch-key-cell' }, [CH.el('b', { class: 'ch-sign', text: key[L].join(' ') }), CH.el('span', { text: L.toLowerCase() })]));
            });
            el.appendChild(grid);
            var input = CH.textarea('I have received your letter, and I beg you to send the answer by the same way.', 3);
            el.appendChild(CH.field('Your text', input));
            var out = CH.el('p', { class: 'ch-signs ch-sign', 'aria-live': 'polite' });
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'In signs (each time a letter comes up, one of its signs is picked at random)' }));
            el.appendChild(out);
            var note = CH.el('p', { class: 'ch-help' });
            el.appendChild(note);
            function draw() {
                var signs = encipher(input.value, key);
                out.textContent = signs || ' ';
                var L = CH.letters(input.value), e = L.split('E').length - 1;
                if (!e) { note.textContent = ''; return; }
                var parts = key.E.map(function (s) { return s + ' ' + (signs.split(s).length - 1) + '×'; });
                note.textContent = 'Your text has ' + e + ' e. In signs they are spread out: ' + parts.join(', ') + '. Counting signs no longer shows which letter is the commonest.';
            }
            input.addEventListener('input', draw);
            draw();
        },
        puzzle: function (el, turn) {
            el.appendChild(CH.el('h3', { class: 'ch-h3', text: '1. Count, as al-Kindi did' }));
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'The cards below show how often each sign appears. Press Match by rank: the most common sign becomes e, the next t, and so on. The text stays nonsense.' }));
            var climbBox = CH.el('div');
            var benchBox = CH.el('div');
            var h2 = CH.el('h3', { class: 'ch-h3', text: '2. Climb, as the codebreakers of 2022 did' });
            var help2 = CH.el('p', { class: 'ch-help', text: 'Start from a random key. Swap the letters of two signs; if the text reads at least as well, keep the swap, if not, undo it. Press One step a few times to see it, then Climb. In this key e has three signs, t, a, o, i and n have two, every other letter one.' });
            var h3 = CH.el('h3', { class: 'ch-h3', text: '3. Read it, and fix by hand what is left' });
            var help3 = CH.el('p', { class: 'ch-help', text: 'Under each sign is its letter. If a word is nearly right, type the right letter into that sign\'s box.' });
            var bench;
            function check(b) {
                if (CH.print(b.plain()) === ANSWER) { turn.solved('Solved: the letter reads, and you never saw the key.'); return true; }
                var n = b.order.filter(function (s) { return b.map[s]; }).length;
                turn.say(n ? 'Not readable yet. Keep climbing, or fix letters by hand.' : 'Count first, then climb.');
                return false;
            }
            var signsOnly = MSG.split('').map(function (s) { return { s: s }; });
            /* the order: the counts first (part of the bench), then the climber, then the message */
            bench = CH.desk.bench(benchBox, { tokens: signsOnly, many: true, rank: true, signClass: 'ch-sign', onChange: function (b) { check(b); } });
            el.appendChild(benchBox);
            el.appendChild(h2);
            el.appendChild(help2);
            el.appendChild(climbBox);
            var msgPart = benchBox.querySelector('.ch-msg');
            if (msgPart) {
                el.appendChild(h3);
                el.appendChild(help3);
                el.appendChild(msgPart.previousSibling);
                el.appendChild(msgPart);
            }
            var idx = {};
            SIGNS.forEach(function (s, i) { idx[s] = i; });
            CH.desk.climber(climbBox, {
                ct: MSG.split('').map(function (s) { return idx[s]; }),
                signs: SIGNS,
                shape: SHAPE,
                onKey: function (m) { bench.setAll(m); },
                done: function () { return turn.done; }
            });
        }
    });
})();
