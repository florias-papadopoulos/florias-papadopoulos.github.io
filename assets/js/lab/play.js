/* The key in the top right corner (layouts/_default/baseof.html): the door between the two sides of the site. The page
   decides its side: the lab's home page, Games and the Toolbox are the playful side (baseof.html sets html[data-mode="play"] there, with the
   play navigation of layouts/partials/play-nav.html, the pet and warm colours, all in assets/css/common/play.css), every
   other page is the normal site. Turning the key on a normal page opens the
   lab's home page (/lab/); turning it back ("About me") opens the normal home page. No animation of
   its own: the next page opens with a door effect, a circle growing from the key (play.css, assets/js/site/door.js),
   where the browser can, and the other side's page is fetched ahead so it opens at once. No sound. Bundled after
   assets/js/lab/cat-picker.js. */
(function () {
    'use strict';
    var root = document.documentElement, key = document.getElementById('key-btn');
    if (!key) return;
    var busy = false;

    function isOn() { return root.dataset.mode === 'play'; }
    function mark() {
        var on = isOn();
        key.setAttribute('aria-pressed', on ? 'true' : 'false');
        key.title = on ? 'Turn the key back: about me' : 'Turn the key: the lab';
    }
    /* the lab opens on its own home page (data-play), leaving it always goes to the normal home page (data-home) */
    function remember() { try { sessionStorage.removeItem('side-play'); localStorage.removeItem('site-mode'); } catch (e) { /* no storage */ } }
    function destination(on) { return key.getAttribute(on ? 'data-play' : 'data-home'); }
    /* the key's page opens with the door effect (assets/js/site/door.js reads this on the next page) */
    function go(on) {
        try { sessionStorage.setItem('door', '1'); } catch (e) { /* no storage: a plain cross-fade */ }
        location.href = destination(on);
    }
    /* the other side's page fetched ahead, quietly, so the key opens it from the cache: once the page is idle, and
       again when a pointer or finger comes to the key (each address once; not when the visitor saves data) */
    var fetched = {};
    function ahead() {
        var c = navigator.connection, url = destination(!isOn());
        if (!url || fetched[url] || !window.fetch || (c && (c.saveData || /2g/.test(c.effectiveType || '')))) return;
        fetched[url] = true;
        fetch(url, { credentials: 'same-origin', priority: 'low' }).catch(function () { delete fetched[url]; });
    }
    key.addEventListener('pointerenter', ahead);
    key.addEventListener('touchstart', ahead, { passive: true });
    key.addEventListener('focus', ahead);
    window.addEventListener('load', function () {
        if (window.requestIdleCallback) requestIdleCallback(ahead, { timeout: 4000 }); else setTimeout(ahead, 2000);
    });
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
