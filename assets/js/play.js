/* The key in the top right corner (layouts/_default/baseof.html): the door between the two sides of the site. The page
   decides its side: Games and the Toolbox are the playful side (baseof.html sets html[data-mode="play"] there, with the
   play navigation of layouts/partials/play-nav.html, the pet and warm colours, all in assets/css/common/play.css), every
   other page is the normal site. Turning the key on a normal page runs a short animation (the menu items flip over like
   cards, the play navigation flips in, the colours warm up) and then opens the playful side: the last playful page
   visited in this tab, or the Games. Turning it back (or "Back to the normal site") runs it backwards and returns to the
   last normal page, or the home page. With prefers-reduced-motion the page fades instead. No sound. Bundled after
   assets/js/cat-picker.js. */
(function () {
    'use strict';
    var root = document.documentElement, key = document.getElementById('key-btn'), back = document.getElementById('play-off');
    if (!key) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var busy = false;

    function isOn() { return root.dataset.mode === 'play'; }
    function mark() {
        var on = isOn();
        key.setAttribute('aria-pressed', on ? 'true' : 'false');
        key.title = on ? 'Turn the key back: the normal site' : 'Turn the key: the lab';
    }
    /* where each side was left, in this tab: the door opens back onto it */
    var here = location.pathname + location.search + location.hash;
    function remember() { try { sessionStorage.setItem(isOn() ? 'side-play' : 'side-normal', here); localStorage.removeItem('site-mode'); } catch (e) { /* no storage */ } }
    function destination(on) {
        var d = null;
        try { d = sessionStorage.getItem(on ? 'side-play' : 'side-normal'); } catch (e) { /* no storage */ }
        return d && d.charAt(0) === '/' && d.charAt(1) !== '/' ? d : (on ? key.getAttribute('data-play') : key.getAttribute('data-home'));
    }
    function go(on) { location.href = destination(on); }
    /* the pet and its world (cat-pages.js, home-lab.js) only start in play mode: they wait for "playmode-on";
       "playmode-off" lets the home page put its letters back */
    function set(on) {
        if (on) root.dataset.mode = 'play'; else delete root.dataset.mode;
        mark();
        try { document.dispatchEvent(new Event(on ? 'playmode-on' : 'playmode-off')); } catch (e) { /* old browsers */ }
    }

    /* the cards that flip: the academic menu (the header, not on the home page) and the play navigation; each gets its
       place in the row as --i, so they turn one after the other */
    function number(sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (e, i) { e.style.setProperty('--i', i); });
        return document.querySelectorAll(sel).length;
    }
    function turn(on) {
        if (busy || on === isOn()) return;
        busy = true;
        if (reduce) {
            root.classList.add('pm-fading', 'pm-faded');
            setTimeout(function () { go(on); }, 200);
            return;
        }
        var menu = number('#menu > li'), nav = number('.play-nav .pm-card');
        /* the cards going away: the menu when turning on, the play navigation when turning off */
        var away = on ? menu : nav, first = away ? 140 + away * 55 + 60 : 260;
        root.classList.add('pm-switching', on ? 'pm-turn-on' : 'pm-turn-off', on ? 'pm-hide-menu' : 'pm-hide-nav');
        setTimeout(function () {
            /* the other side comes in: drawn flipped away first, then flipped back one card after the other */
            root.classList.add(on ? 'pm-hide-nav' : 'pm-hide-menu');
            set(on);
            void root.offsetWidth;
            root.classList.remove(on ? 'pm-hide-nav' : 'pm-hide-menu');
            var rest = 160 + (on ? nav : menu) * 55 + 120;
            /* the other side is a different page: open it once the cards have turned */
            setTimeout(function () { go(on); }, Math.max(rest, 620));
        }, first);
    }

    key.addEventListener('click', function () { turn(!isOn()); });
    if (back) back.addEventListener('click', function () { turn(false); });
    /* coming back to a page with the browser's back button: it may still show the animation's end */
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        busy = false;
        root.classList.remove('pm-switching', 'pm-turn-on', 'pm-turn-off', 'pm-hide-menu', 'pm-hide-nav', 'pm-fading', 'pm-faded');
        var built = root.getAttribute('data-side') === 'play';   /* the side this page belongs to */
        if (isOn() !== built) set(built);
    });
    remember();
    mark();
})();
