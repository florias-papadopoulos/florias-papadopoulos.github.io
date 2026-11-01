/* Bachelor, Master, Papers (layouts/_default/timeline.html): entries start closed (without JavaScript everything
   stays open), #anchor opens its entry right away. Loaded without defer right after the entries, so nothing flashes
   open; the rest of the behaviour is assets/js/timeline.js. */
(function () {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    document.querySelectorAll('.tl-entry').forEach(function (e) {
        if (e.id && e.id === h) { e.classList.add('open'); e.querySelector('.tl-toggle').setAttribute('aria-expanded', 'true'); }
        else e.querySelector('.tl-more').hidden = true;
    });
})();
