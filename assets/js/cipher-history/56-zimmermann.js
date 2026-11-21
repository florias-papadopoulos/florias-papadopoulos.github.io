/* Cipher History story: the Zimmermann telegram, January 1917 (content/cipher-history/zimmermann.md).
   A code, not a cipher: every word is a number group from a codebook. Our codebook is made up and in alphabetical
   order: a word's group grows with its place in the alphabet (the first five letters decide), so groups that are
   close together belong to words that are close in a dictionary. The real telegram was in German, in German
   diplomatic codes; we use the English text of the decode that the State Department received (National Archives,
   RG 59, ID 302024; public domain), up to "Arizona", with one slip of the transcript ("or" for "of") put right.
   The machine: the visitor's words as groups in one codebook. Your turn: the telegram in another codebook of the same
   kind, most of it already known; the visitor fills in the missing words (desk tool 25-desk-codebook.js). */
(function () {
    'use strict';
    /* a codebook: groups from lo to hi, in alphabetical order */
    var MACHINE = { lo: 10000, hi: 99999 }, PUZZLE = { lo: 21000, hi: 88000 };
    function number(word, book) {
        var w = CH.letters(word), f = 0, scale = 1;
        for (var i = 0; i < 5; i++) { scale /= 27; f += (i < w.length ? w.charCodeAt(i) - 64 : 0) * scale; }
        return String(book.lo + Math.floor(f * (book.hi - book.lo)));
    }

    var GROUPS = '78533 44688 72008 26447 59508 71381 36779 58773 36357 74459 70086 78228 78533 68888 34708 44620 69651 58773 71397 72008 48774 71381 74430 69992 58773 24695 56274 44620 71381 35448 58773 71397 57187 70088 78533 53389 53801 23481 62411 58773 24626 59508 71381 37309 26120 53389 78227 72032 53389 61167 72032 38878 36763 70134 24781 24768 74412 59508 60213 60859 71370 53801 45079 72008 66138 71381 52223 71152 44620 71171 56278 53801 24781 25169';
    /* the groups already known; the others are missing from the book */
    var KNOWN = { 23481: 'a', 24768: 'an', 24781: 'and', 26120: 'basis', 26447: 'begin', 34708: 'endeavor', 35448: 'event', 36763: 'financial', 36779: 'first', 37309: 'following', 38878: 'generous', 44620: 'in', 44688: 'intend', 45079: 'is', 48774: 'keep', 52223: 'lost', 53389: 'make', 56278: 'new', 57187: 'not', 58773: 'of', 59508: 'on', 60213: 'our', 60859: 'part', 62411: 'proposal', 66138: 'reconquer', 68888: 'shall', 69651: 'spite', 69992: 'states', 70088: 'succeeding', 70134: 'support', 71152: 'territory', 71370: 'that', 71381: 'the', 71397: 'this', 72008: 'to', 74412: 'understanding', 74430: 'united', 74459: 'unrestricted', 78227: 'war', 78228: 'warfare', 78533: 'we' };
    /* the missing groups: CH.print of each word, so the page can say when a guess is right (see test/stories.test.js) */
    var PRINTS = { 24626: 'hij5e7', 24695: 'zqfbpy', 25169: '16hgk7q', 36357: 'xjruik', 53801: '9angj5', 56274: '19r8i4h', 61167: 'p71es8', 70086: '24b0fe', 71171: '1meq473', 72032: '1560c30' };
    var ANSWER = '1kfk6gf';   /* CH.print of the passage, see test/stories.test.js */

    CH.story({
        id: 'zimmermann',
        number: number,
        PUZZLE: PUZZLE,
        MACHINE: MACHINE,
        groups: GROUPS,
        known: KNOWN,
        prints: PRINTS,
        answer: ANSWER,
        machine: function (el) {
            var input = CH.textarea('Make war together, make peace together', 2);
            el.appendChild(CH.field('Your text', input));
            var out = CH.el('div', { class: 'ch-cb-msg', 'aria-live': 'polite' });
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'In code: one group per word' }));
            el.appendChild(out);
            var sorted = CH.el('p', { class: 'ch-help' });
            el.appendChild(sorted);
            function draw() {
                CH.clear(out);
                var words = String(input.value).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 40);
                words.forEach(function (w) { out.appendChild(CH.el('span', { class: 'ch-cb-g is-static' }, [CH.el('b', { text: number(w, MACHINE) }), CH.el('i', { text: w })])); });
                var uniq = [];
                words.forEach(function (w) { if (uniq.indexOf(w) < 0) uniq.push(w); });
                uniq.sort();
                sorted.textContent = uniq.length > 1 ? 'Sorted by group, your words come out in alphabetical order: ' + uniq.map(function (w) { return number(w, MACHINE) + ' ' + w; }).join(', ') + '. The same word always gets the same group.' : '';
            }
            input.addEventListener('input', draw);
            draw();
        },
        puzzle: function (el, turn) {
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'Tap a group with ??? to jump to its line in the book. A box turns green when the word is right.' }));
            CH.desk.codebook(el, {
                groups: GROUPS.split(' '),
                known: KNOWN,
                prints: PRINTS,
                onChange: function (b) {
                    if (b.solved() && CH.print(b.plain()) === ANSWER) { turn.solved('Solved: you rebuilt the missing words of the codebook, and the whole passage reads.'); return; }
                    var found = b.total() - b.left();
                    turn.say(found ? found + ' of ' + b.total() + ' missing words found.' : 'Start with the words that context gives away.');
                }
            });
        }
    });
})();
