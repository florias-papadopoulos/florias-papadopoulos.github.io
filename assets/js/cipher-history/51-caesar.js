/* Cipher History story: Caesar's shift (content/cipher-history/caesar.md).
   The machine: the cipher wheel on the visitor's own text (Caesar's 3 or Augustus's 1, or any shift).
   Your turn: a captured note, shifted. Turn the wheel until it reads, or try all 25 keys. Solved when the deciphered
   letters match the answer's fingerprint (the answer itself is not in this file; the tests check it). */
(function () {
    'use strict';
    var NOTE = 'L KDYH VHW RXW ZLWK WKH OHJLRQV DQG ZLOO VRRQ EH ZLWK BRX. NHHS BRXU ROG FRXUDJH.';
    var ANSWER = '1sqbnyq';   /* CH.print of the plaintext, see test/stories.test.js */

    CH.story({
        id: 'caesar',
        note: NOTE,
        answer: ANSWER,
        machine: function (el) {
            var input = CH.textarea('Write your name here', 2);
            el.appendChild(CH.field('Your text', input));
            var row = CH.el('div', { class: 'ch-row' });
            var pair = CH.el('div', { class: 'ch-pair is-wide' });
            var left = CH.el('div'), right = CH.el('div');
            pair.appendChild(left);
            pair.appendChild(right);
            el.appendChild(row);
            el.appendChild(pair);
            var out = CH.pre('', 'is-cipher');
            right.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Enciphered' }));
            right.appendChild(out);
            right.appendChild(CH.el('p', { class: 'ch-help', text: 'Every letter moves the same number of places along the alphabet. Spaces and punctuation stay. Our wheel has the 26 letters of today.' }));
            var wheel = CH.desk.wheel(left, { shift: 3, onChange: draw });
            row.appendChild(CH.button('Caesar: shift 3', function () { wheel.set(3); }));
            row.appendChild(CH.button('Augustus: shift 1', function () { wheel.set(1); }));
            function draw() { out.textContent = CH.desk.shift(input.value, wheel.get()); }
            input.addEventListener('input', draw);
            draw();
        },
        puzzle: function (el, turn) {
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The captured note' }));
            el.appendChild(CH.pre(NOTE, 'is-cipher'));
            var pair = CH.el('div', { class: 'ch-pair is-wide' });
            var left = CH.el('div'), right = CH.el('div');
            pair.appendChild(left);
            pair.appendChild(right);
            el.appendChild(pair);
            var out = CH.pre('', 'ch-plainout');
            right.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Read with this key' }));
            right.appendChild(out);
            var wheel = CH.desk.wheel(left, { shift: 0, onChange: draw });
            var listBox = CH.el('div');
            var all = CH.button('Try all 25 keys', function () {
                all.hidden = true;
                CH.desk.allShifts(listBox, NOTE, function (k) { wheel.set(k); left.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
            });
            right.appendChild(all);
            right.appendChild(listBox);
            function draw() {
                var k = wheel.get(), plain = CH.desk.shift(NOTE, -k);
                out.textContent = plain;
                if (CH.print(plain) === ANSWER) turn.solved('Solved: the key is ' + k + '. This is our English wording of the message Caesar says he sent (see part 4).');
                else if (!turn.done) turn.say(k === 0 ? 'Turn the wheel: the window shows which letter stands for A.' : 'Key ' + k + ': not English yet.');
            }
            draw();
        }
    });
})();
