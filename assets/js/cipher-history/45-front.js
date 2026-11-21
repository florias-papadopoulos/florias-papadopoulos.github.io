/* Cipher History, the front page (layouts/cipher-history/list.html): a stamp on each story the visitor has cracked
   in this browser (the detective's notebook, CH.notebook in 00-core.js), the count in the notebook line, and a way to
   wipe it. Nothing is sent anywhere. */
(function () {
    'use strict';
    CH.front = function (root) {
        var nb = CH.notebook.read(), cards = root.querySelectorAll('[data-ch-card]'), n = 0;
        Array.prototype.forEach.call(cards, function (card) {
            var done = !!nb[card.getAttribute('data-ch-card')];
            card.classList.toggle('is-cracked', done);
            var st = card.querySelector('.ch-stamp');
            if (st) st.hidden = !done;
            if (done) n++;
        });
        var line = root.querySelector('.ch-notebook');
        if (!line) return;
        CH.clear(line);
        line.appendChild(CH.el('span', { text: 'Your notebook: ' + n + ' of ' + cards.length + ' cracked. ' }));
        if (n) line.appendChild(CH.el('button', { type: 'button', class: 'ch-link', text: 'Wipe it', on: { click: function () { CH.notebook.forget(); CH.front(root); } } }));
        line.appendChild(CH.el('span', { class: 'ch-help-inline', text: ' Kept in this browser only.' }));
    };
})();
