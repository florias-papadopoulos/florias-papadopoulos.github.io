/* The key in the top right corner (layouts/_default/baseof.html): the door between the two sides of the site. The page
   decides its side: the lab's home page, Games and the Toolbox are the playful side (baseof.html sets html[data-mode="play"] there, with the
   play navigation of layouts/partials/play-nav.html, the pet and warm colours, all in assets/css/common/play.css), every
   other page is the normal site. Turning the key on a normal page opens the
   lab's home page (/lab/); turning it back (or "Back to the normal site") opens the normal home page. No animation of
   its own (play.css cross-fades the two pages where the browser can). No sound. Bundled after
   assets/js/cat-picker.js. */
(function () {
    'use strict';
    var root = document.documentElement, key = document.getElementById('key-btn'), back = document.getElementById('play-off');
    if (!key) return;
    var busy = false;

    function isOn() { return root.dataset.mode === 'play'; }
    function mark() {
        var on = isOn();
        key.setAttribute('aria-pressed', on ? 'true' : 'false');
        key.title = on ? 'Turn the key back: the normal site' : 'Turn the key: the lab';
    }
    /* the lab opens on its own home page (data-play), leaving it always goes to the normal home page (data-home) */
    function remember() { try { sessionStorage.removeItem('side-play'); localStorage.removeItem('site-mode'); } catch (e) { /* no storage */ } }
    function destination(on) { return key.getAttribute(on ? 'data-play' : 'data-home'); }
    function go(on) { location.href = destination(on); }
    /* the pet and its world (cat-pages.js, home-lab.js) only start in play mode: they wait for "playmode-on";
       "playmode-off" lets the home page put its letters back */
    function set(on) {
        if (on) root.dataset.mode = 'play'; else delete root.dataset.mode;
        mark();
        try { document.dispatchEvent(new Event(on ? 'playmode-on' : 'playmode-off')); } catch (e) { /* old browsers */ }
    }

    /* no animation of its own: the next page simply opens (browsers that support cross-page view transitions
       cross-fade it, play.css) */
    function turn(on) {
        if (busy || on === isOn()) return;
        busy = true;
        go(on);
    }

    key.addEventListener('click', function () { turn(!isOn()); });
    if (back) back.addEventListener('click', function () { turn(false); });
    /* coming back to a page with the browser's back button: it may still show the animation's end */
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        busy = false;
                var built = root.getAttribute('data-side') === 'play';   /* the side this page belongs to */
        if (isOn() !== built) set(built);
    });
    remember();
    mark();
})();
