/* Cipher History: the frame of "Your turn" on a story page (layouts/cipher-history/single.html): the hints, given one
   at a time, the status line and the stamp in the detective's notebook.

   CH.turn(root, id) returns the object a story's puzzle receives:
     turn.solved(text)   the message is broken: the stamp, the status line, the notebook (localStorage, this browser only)
     turn.say(text)      a neutral line under the puzzle ("3 of 20 letters right so far")
     turn.done           true once solved (also when the notebook says it was solved on an earlier visit)
     turn.hintsShown()   how many hints the visitor has opened */
(function () {
    'use strict';

    CH.turn = function (root, id) {
        var status = root.querySelector('.ch-status');
        var stamp = root.querySelector('.ch-stamp');
        var list = root.querySelector('.ch-hints-list');
        var turn = { done: false };
        var shown = 0;

        /* the hints: hidden until asked for, one by one */
        if (list) {
            var items = Array.prototype.slice.call(list.children);
            items.forEach(function (li) { li.hidden = true; });
            var btn = CH.el('button', { type: 'button', class: 'ch-btn ch-hint-btn' });
            function label() {
                btn.textContent = shown < items.length ? 'Show hint ' + (shown + 1) + ' of ' + items.length : 'No more hints';
                btn.disabled = shown >= items.length;
            }
            btn.addEventListener('click', function () {
                if (shown >= items.length) return;
                items[shown].hidden = false;
                shown++;
                label();
            });
            label();
            list.parentNode.insertBefore(btn, list.nextSibling);
            list.classList.add('is-js');
        }
        turn.hintsShown = function () { return shown; };

        turn.say = function (text) {
            if (turn.done || !status) return;
            status.className = 'ch-status';
            status.textContent = text;
        };
        turn.solved = function (text) {
            if (status) { status.className = 'ch-status is-solved'; status.textContent = text || 'Solved.'; }
            if (stamp) stamp.hidden = false;
            if (!turn.done) CH.notebook.mark(id);
            turn.done = true;
            root.classList.add('is-solved');
        };
        if (CH.notebook.solved(id) && stamp) { stamp.hidden = false; root.classList.add('was-solved'); }
        return turn;
    };
})();
