/* The key's door effect (assets/js/lab/play.js, styles in assets/css/common/play.css): when the key opened this page,
   the browser's page transition gets the type "door", so the new side opens as a circle growing from the key instead
   of the plain cross-fade every other link gets. Loaded in the head without defer: pagereveal fires before the first
   paint. Browsers without cross-page view transitions (Firefox for now) ignore all of this. */
(function () {
    'use strict';
    window.addEventListener('pagereveal', function (e) {
        var door = null;
        try { door = sessionStorage.getItem('door'); sessionStorage.removeItem('door'); } catch (x) { /* no storage */ }
        if (door && e.viewTransition && e.viewTransition.types) e.viewTransition.types.add('door');
    });
})();
