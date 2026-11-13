/* The key's switch between the two sides (assets/js/lab/play.js): a page opened by the key appears at once, with no
   page transition (every other link keeps the browser's soft cross-fade, play.css). The key leaves a note in
   sessionStorage; on the next page pagereveal sees it and skips the transition. Loaded in the head without defer:
   pagereveal fires before the first paint. Browsers without cross-page view transitions (Firefox for now) switch at
   once anyway. */
(function () {
    'use strict';
    window.addEventListener('pagereveal', function (e) {
        var key = null;
        try { key = sessionStorage.getItem('door'); sessionStorage.removeItem('door'); } catch (x) { /* no storage */ }
        if (key && e.viewTransition) e.viewTransition.skipTransition();
    });
})();
