/* Cipher History: start whatever is on the page. The front page has .ch-front (45-front.js); a story page has
   .ch-story[data-story] with a .ch-machine-box (the live cipher) and a .ch-turn (Your turn), drawn by the story
   registered under that id (50- to 89-). */
(function () {
    'use strict';
    function boot() {
        var front = document.querySelector('.ch-front');
        if (front) CH.front(front);
        var page = document.querySelector('.ch-story[data-story]');
        if (!page) return;
        var id = page.getAttribute('data-story'), def = CH.stories[id];
        if (!def) return;
        var machine = page.querySelector('.ch-machine-box'), turnRoot = page.querySelector('.ch-turn');
        if (machine && def.machine) { CH.clear(machine); def.machine(machine); }
        if (turnRoot && def.puzzle) {
            var box = turnRoot.querySelector('.ch-puzzle-box');
            CH.clear(box);
            def.puzzle(box, CH.turn(turnRoot, id));
        }
    }
    if (typeof document === 'undefined') return;   /* the tests load the script without a page */
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
