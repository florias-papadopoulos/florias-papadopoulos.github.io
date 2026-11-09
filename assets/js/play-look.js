/* Play mode (the key in the top right corner, assets/js/play.js): applied before anything is drawn, like the pet's
   look (bundled after assets/js/cat-look.js, loaded without defer at the top of <body> in layouts/_default/baseof.html).
   The visitor's choice is kept in localStorage "site-mode" ("play", anything else is the academic site) and shows as
   html[data-mode="play"]. ?play=1 in the address switches play mode on and ?play=0 off (handy for testing; it only sets
   the same choice the key sets). */
(function () {
    var root = document.documentElement, m = /[?&]play=([01])(?:&|$)/.exec(location.search), on = false;
    try {
        if (m) localStorage.setItem('site-mode', m[1] === '1' ? 'play' : 'academic');
        on = localStorage.getItem('site-mode') === 'play';
    } catch (e) { on = !!m && m[1] === '1'; }
    if (on) root.dataset.mode = 'play';
})();
