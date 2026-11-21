/* Story 2, "Try it": type anything and see its real SHA-256 fingerprint (00-core.js SC.sha256): six blocks, one per
   hex digit of the first six, and all 64 digits under them. The digits that differ from the fingerprint of the first
   text are marked, so changing one letter shows that about 60 of the 64 change. */
(function () {
    'use strict';
    var FIRST = 'See you at the park at 5';

    SC.tryBox('hash', function (box, U) {
        U.h('p', 'sc-try-lead', 'Type anything. The blocks are its real fingerprint (SHA-256, the hash your phone uses). Then change just one letter.', box);
        var lab = U.h('label', 'sc-field', '<span>Your text</span>', box);
        var input = U.h('input', '', { type: 'text', value: FIRST, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '200' }, lab);
        var shown = U.h('div', 'sc-fp', null, box);
        var row = U.blocks(shown, 6, 'sc-big-blocks');
        var hexEl = U.h('code', 'sc-hex', '', shown);
        var say = U.h('p', 'sc-say', '', box);
        var reset = U.h('button', 'sc-tbtn sc-wide', { type: 'button' }, box);
        reset.textContent = 'Back to the first text';
        var base = SC.sha256(FIRST);
        function show() {
            var hx = SC.sha256(input.value), diff = 0, html = '';
            row.set(SC.colours(hx, 6));
            for (var i = 0; i < 64; i++) {
                var d = hx.charAt(i) !== base.charAt(i);
                if (d) diff++;
                html += (d ? '<mark>' + hx.charAt(i) + '</mark>' : hx.charAt(i)) + (i % 8 === 7 && i < 63 ? ' ' : '');
            }
            hexEl.innerHTML = html;
            say.innerHTML = input.value === FIRST ? 'This is the fingerprint of the first text. Same text, same fingerprint, on every computer in the world.'
                : diff === 0 ? 'Same fingerprint: this is the same text.'
                : '<b>' + diff + ' of the 64 digits</b> are different from the first text’s fingerprint (marked). A small change in the text, a completely new fingerprint.';
            reset.hidden = input.value === FIRST;
        }
        input.addEventListener('input', show);
        reset.addEventListener('click', function () { input.value = FIRST; show(); });
        show();
        U.h('p', 'sc-try-note', 'And backwards? Given only the 64 digits, nobody can find the text, except by guessing texts until one fits.', box);
    });
})();
