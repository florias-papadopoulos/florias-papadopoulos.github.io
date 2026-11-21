/* Cipher History story: the Babington plot, 1586 (content/cipher-history/babington.md).
   Mary's nomenclator: a sign for each letter, signs for some common words, nulls (signs that mean nothing) and a
   sign that doubles the letter before it. The letter signs follow the key that Babington signed (The National
   Archives, SP 12/193/54), drawn with characters a browser can show; the word signs are simplified (the real key
   had more of them). The key has no J, V or W: J is written as I, V as U, and (our choice) W as UU.
   The machine: the visitor's own text in Mary's signs. Your turn: a passage of Mary's letter of 17 July 1586
   (spelling modernised), broken on the frequency bench; once solved, the forged postscript in the same signs. */
(function () {
    'use strict';
    var LETTERS = {
        A: '○', B: '‡', C: '∧', D: '#', E: 'α', F: '□', G: 'θ', H: '∞', I: '1', K: 'ð', L: 'n', M: '∥',
        N: 'ø', O: '∇', P: 's', Q: 'm', R: 'f', S: 'Δ', T: 'ε', U: 'c', X: '7', Y: '8', Z: '9'
    };
    var WORDS = { AND: '2', FOR: '3', THE: '⊕', OF: '⊤', IN: '×', THIS: 'Ω', WITH: '⊗', THAT: '∴', I: 'Ψ', MY: '⊂', YOU: '⊃', YOUR: 'Ξ' };
    var NULLS = ['¬', '⊥', '≡', '∓'];
    var DOUBLE = 'σ';

    /* the passage of the 17 July letter and the postscript, enciphered (see test/stories.test.js) */
    var MSG = '∓ ⊕ ○□σ○1fΔ ‡α1øθ ε∞cΔ ¬ sfαs○fα# ⊥ 2 □∇f∧αΔ × fα○#1øαΔσ ‡∇ε∞ cσ1ε∞∇cε 2 ∓ cσ1ε∞1ø ⊕ fα○n∥ ε∞αø Δ∞○nσ ≡ 1ε ‡α ε1∥α ε∇ Δαε ≡ ⊕ Δ17 θαøεnα∥αø ε∇ cσ∇fð ε○ð1øθ ∇f#αf ¬ cs∇ø ⊕ ○∧σ∇∥sn1Δ∞1øθ ⊤ ε∞α1f #αΔ1θø Ψ ∥○8 ‡α Δc#σαøn8 εf○øΔs∇fεα# ∇cε ⊤ Ω sn○∧α';
    var PS = 'Ψ cσ∇cn# ‡α θn○# ε∇ ðø∇cσ ⊕ ø○∥αΔ 2 mc○n1ε1αΔ ⊤ ⊕ Δ17 θαøεnα∥αø cσ∞1∧∞ ○fα ε∇ ○∧σ∇∥sn1Δ∞ ⊕ #αΔ1θø∥αøε 3 1ε ∥○8 ‡α Ψ Δ∞○nσ ‡α ○‡nα cs∇ø ðø∇cσnα#θα ⊤ ⊕ s○fε1αΔ ε∇ θ1cα ⊃ Δ∇∥α □cfε∞αf ○#c1∧α øα∧αΔσ○f8 ε∇ ‡α □∇nσ∇cσα# ε∞αfα1ø';
    var ANSWER = 'bxfoam';   /* CH.print of the passage as written in the key's letters, see test/stories.test.js */

    /* plain text into the key's letters: J as I, V as U, W as UU */
    function normal(text) { return CH.letters(text).replace(/J/g, 'I').replace(/V/g, 'U').replace(/W/g, 'UU'); }
    /* encipher: words with a sign of their own get it, other words letter by letter, a doubled letter is written
       once and followed by the doubling sign; rnd (optional) decides where a null goes */
    function encipher(text, rnd) {
        return String(text).toUpperCase().split(/[^A-Z]+/).filter(Boolean).map(function (w) {
            var out = '';
            if (WORDS[w]) out = WORDS[w];
            else {
                var n = normal(w);
                for (var i = 0; i < n.length; i++) {
                    if (i > 0 && n.charAt(i) === n.charAt(i - 1) && out.slice(-1) !== DOUBLE) out += DOUBLE;
                    else out += LETTERS[n.charAt(i)];
                }
            }
            if (rnd && rnd() < 0.12) out = NULLS[Math.floor(rnd() * NULLS.length)] + ' ' + out;
            return out;
        }).join(' ');
    }
    /* the tokens of a text in signs, for the bench */
    function tokens(signs) {
        var t = [];
        signs.split('').forEach(function (c) { t.push(c === ' ' ? { sep: ' ' } : { s: c }); });
        return t;
    }
    var SIGN2 = {};
    Object.keys(LETTERS).forEach(function (L) { SIGN2[LETTERS[L]] = L; });
    Object.keys(WORDS).forEach(function (w) { SIGN2[WORDS[w]] = w; });
    function decipher(signs) {
        var out = '', prev = '';
        signs.split('').forEach(function (c) {
            if (c === ' ') { out += ' '; return; }
            if (c === DOUBLE) { out += prev; return; }
            if (NULLS.indexOf(c) >= 0) return;
            var p = SIGN2[c] || '?';
            out += p.toLowerCase();
            prev = p.slice(-1).toLowerCase();
        });
        return out.replace(/ +/g, ' ').trim();
    }

    function keyTable(el) {
        var grid = CH.el('div', { class: 'ch-key' });
        Object.keys(LETTERS).forEach(function (L) { grid.appendChild(CH.el('div', { class: 'ch-key-cell' }, [CH.el('b', { class: 'ch-sign', text: LETTERS[L] }), CH.el('span', { text: L.toLowerCase() })])); });
        Object.keys(WORDS).forEach(function (w) { grid.appendChild(CH.el('div', { class: 'ch-key-cell' }, [CH.el('b', { class: 'ch-sign', text: WORDS[w] }), CH.el('span', { text: w.toLowerCase() })])); });
        grid.appendChild(CH.el('div', { class: 'ch-key-cell' }, [CH.el('b', { class: 'ch-sign', text: NULLS.join('') }), CH.el('span', { text: 'nulls' })]));
        grid.appendChild(CH.el('div', { class: 'ch-key-cell' }, [CH.el('b', { class: 'ch-sign', text: DOUBLE }), CH.el('span', { text: 'double' })]));
        el.appendChild(grid);
    }

    CH.story({
        id: 'babington',
        msg: MSG,
        ps: PS,
        answer: ANSWER,
        encipher: encipher,
        decipher: decipher,
        normal: normal,
        machine: function (el) {
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The key' }));
            keyTable(el);
            var input = CH.textarea('Send the letter with the same courier', 2);
            el.appendChild(CH.field('Your text', input));
            var nulls = CH.el('input', { type: 'checkbox', checked: true });
            el.appendChild(CH.el('label', { class: 'ch-row' }, [nulls, ' Throw in some nulls']));
            var out = CH.el('p', { class: 'ch-signs ch-sign', 'aria-live': 'polite' });
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'In Mary\'s signs' }));
            el.appendChild(out);
            function draw() { out.textContent = encipher(input.value, nulls.checked ? Math.random : null) || ' '; }
            input.addEventListener('input', draw);
            nulls.addEventListener('change', draw);
            draw();
        },
        puzzle: function (el, turn) {
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'Already known, as to any codebreaker of the time: σ doubles the letter before it. (Word breaks are kept, to make it fair.)' }));
            var after = CH.el('div');
            var nullMap = {};
            NULLS.forEach(function (n) { nullMap[n] = true; });
            CH.desk.bench(el, {
                tokens: tokens(MSG),
                words: true,
                special: { 'σ': 'double' },
                nulls: nullMap,
                signClass: 'ch-sign',
                onChange: function (b) {
                    if (CH.print(b.plain()) === ANSWER) {
                        if (!turn.done) showPostscript();
                        turn.solved('Solved: you read Mary\'s own words without the key.');
                        return;
                    }
                    var n = b.order.filter(function (s) { return b.map[s]; }).length;
                    turn.say(n ? n + ' of ' + b.order.length + ' signs have a meaning. Keep going until every word reads.' : 'Start with the most common signs, and with the short words.');
                }
            });
            el.appendChild(after);
            function showPostscript() {
                CH.clear(after);
                after.appendChild(CH.el('div', { class: 'ch-postscript' }, [
                    CH.el('p', { class: 'ch-out-h', text: 'The letter that reached Babington ended with this postscript, in the same signs:' }),
                    CH.el('p', { class: 'ch-signs ch-sign', text: PS }),
                    CH.el('p', { class: 'ch-out-h', text: 'Read with the key you found:' }),
                    CH.pre(decipher(PS), 'ch-plainout'),
                    CH.el('p', { class: 'ch-help', text: 'Mary never wrote it. It was added after Phelippes had read her letter, to make Babington name the six men (see part 4).' })
                ]));
            }
        }
    });
})();
