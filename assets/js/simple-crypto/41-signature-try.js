/* Story 3, "Try it": be the fox. The cat signed a letter: its seal is the cat's paw over the first three blocks of the
   letter's real SHA-256 fingerprint. The reader edits the letter, or swaps in the fox's paw, and sees the dog's two
   checks (paw, colours) and the verdict, live. */
(function () {
    'use strict';
    var SIGNED = 'See you at the park at 5';
    var PAW = '<path d="M0 1c4 0 7 3 7 6s-3 4-7 4-7-1-7-4 3-6 7-6z"/><ellipse cx="-8" cy="-2" rx="2.9" ry="3.4"/><ellipse cx="-3.2" cy="-7.4" rx="2.9" ry="3.4"/><ellipse cx="3.2" cy="-7.4" rx="2.9" ry="3.4"/><ellipse cx="8" cy="-2" rx="2.9" ry="3.4"/>';
    var FOXPAW = '<path d="M0 9c-5 0-6-4-5-7 1-3 3-5 5-5s4 2 5 5c1 3 0 7-5 7z"/><ellipse cx="-6" cy="-6" rx="1.7" ry="2.8"/><ellipse cx="-2" cy="-10" rx="1.7" ry="2.8"/><ellipse cx="2.6" cy="-10" rx="1.7" ry="2.8"/><ellipse cx="6.6" cy="-6" rx="1.7" ry="2.8"/>';

    SC.tryBox('signature', function (box, U) {
        U.h('p', 'sc-try-lead', '<b>Be the fox.</b> The cat signed this letter. Change anything in it, or stamp it with your own paw, and see what the dog’s check says.', box);
        var lab = U.h('label', 'sc-field', '<span>The letter</span>', box);
        var input = U.h('input', '', { type: 'text', value: SIGNED, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '200' }, lab);
        var sig = U.h('div', 'sc-sigrow', null, box);
        var sealBox = U.h('div', 'sc-sigcell', null, sig);
        var seal = U.h('span', 'sc-seal', null, sealBox);
        var pawSvg = U.h('span', 'sc-seal-paw', null, seal);
        var sealFp = U.blocks(seal, 3, 'sc-seal-blocks');
        U.h('span', 'sc-mixlab', 'the seal on the letter', sealBox);
        var dogBox = U.h('div', 'sc-sigcell', null, sig);
        var dogFp = U.blocks(dogBox, 3, 'sc-dog-blocks');
        U.h('span', 'sc-mixlab', 'fingerprint of the letter, made by the dog', dogBox);
        var foxBtn = U.h('button', 'sc-tbtn sc-wide', { type: 'button', 'aria-pressed': 'false' }, box);
        var checks = U.h('ul', 'sc-checks', null, box);
        var c1 = U.h('li', '', '', checks), c2 = U.h('li', '', '', checks);
        var say = U.h('p', 'sc-say', '', box);
        var reset = U.h('button', 'sc-tbtn sc-wide', { type: 'button' }, box);
        reset.textContent = 'Back to the signed letter';
        var foxy = false;
        var signedFp = SC.colours(SC.sha256(SIGNED), 3);
        function show() {
            var fp = SC.colours(SC.sha256(input.value), 3);
            var same = input.value === SIGNED || fp.join() === signedFp.join();
            pawSvg.innerHTML = '<svg viewBox="-12 -14 24 26" aria-hidden="true">' + (foxy ? FOXPAW : PAW) + '</svg>';
            sealFp.set(foxy ? fp : signedFp);
            dogFp.set(fp);
            /* the fox's own seal: it can make the right fingerprint (the machine is public), but not the cat's paw */
            var pawOk = !foxy, colOk = foxy ? true : same;
            c1.className = pawOk ? 'sc-ok' : 'sc-bad';
            c1.innerHTML = pawOk ? '<b>Paw fits</b> the cat’s see-through sheet.' : '<b>Paw does not fit</b> the cat’s sheet: this is not the cat’s stamp.';
            c2.className = colOk ? 'sc-ok' : 'sc-bad';
            c2.innerHTML = colOk ? '<b>Colours match</b> the fingerprint of this letter.' : '<b>Colours do not match</b>: the letter is not the one that was sealed.';
            say.innerHTML = pawOk && colOk ? '<b>Accepted:</b> the cat wrote exactly this letter.' : '<b>Rejected.</b> ' + (foxy ? 'To pass, the fox would need the cat’s stamp, and that never leaves the cat.' : 'The fox would need to stamp the new letter with the cat’s paw, and only the cat has the stamp.');
            say.className = 'sc-say ' + (pawOk && colOk ? 'sc-good' : 'sc-bad-say');
            foxBtn.textContent = foxy ? 'Use the cat’s real seal again' : 'Stamp it with the fox’s own paw';
            foxBtn.setAttribute('aria-pressed', foxy ? 'true' : 'false');
            reset.hidden = input.value === SIGNED && !foxy;
        }
        input.addEventListener('input', show);
        foxBtn.addEventListener('click', function () { foxy = !foxy; show(); });
        reset.addEventListener('click', function () { input.value = SIGNED; foxy = false; show(); });
        show();
    });
})();
