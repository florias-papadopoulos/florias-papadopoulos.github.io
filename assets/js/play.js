/* Play mode: the key in the top right corner (layouts/_default/baseof.html) turns the whole site into its playful side
   and back. The choice is kept in localStorage "site-mode" and applied before the first paint by assets/js/play-look.js
   (html[data-mode="play"]); everything else is CSS (assets/css/common/play.css): the play navigation
   (layouts/partials/play-nav.html), the cat and dog pickers, slightly warmer colours.

   The switch takes about a second: the key turns with a short click, the menu items flip over like cards one after the
   other, then the play navigation flips in the same way, the colours warm up and the pet perks up. Turning it off runs
   the same steps backwards. With prefers-reduced-motion the page simply fades out and back in. A change in another tab
   is followed without animation. Bundled after assets/js/cat-picker.js. */
(function () {
    'use strict';
    var root = document.documentElement, key = document.getElementById('key-btn'), back = document.getElementById('play-off');
    if (!key) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var busy = false, actx = null;

    function isOn() { return root.dataset.mode === 'play'; }
    function mark() {
        var on = isOn();
        key.setAttribute('aria-pressed', on ? 'true' : 'false');
        key.title = on ? 'Turn the key back: the academic site' : 'Turn the key: play mode';
    }
    function store(on) { try { localStorage.setItem('site-mode', on ? 'play' : 'academic'); } catch (e) { /* no storage */ } }
    function set(on) { if (on) root.dataset.mode = 'play'; else delete root.dataset.mode; mark(); }
    /* the pets and worlds measure the page: tell them it changed (the sidebar and the tab bar take room) */
    function relayout() { try { window.dispatchEvent(new Event('resize')); } catch (e) { /* old browsers */ } }

    /* the click of the key: two very short ticks, as quiet as the games' sound effects (their volume, arcade-sfx, 0 is off) */
    function click() {
        var vol = 1;
        try { var v = localStorage.getItem('arcade-sfx'); if (v !== null) vol = Math.max(0, Math.min(100, +v)) / 100; } catch (e) { /* keep 1 */ }
        if (!vol || isNaN(vol)) return;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            actx = actx || new AC();
            if (actx.state === 'suspended') actx.resume();
            [[0, 2300], [0.07, 1500]].forEach(function (t) {
                var at = actx.currentTime + t[0], o = actx.createOscillator(), g = actx.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(t[1], at);
                g.gain.setValueAtTime(0.0001, at);
                g.gain.exponentialRampToValueAtTime(0.05 * vol, at + 0.003);
                g.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
                o.connect(g); g.connect(actx.destination);
                o.start(at); o.stop(at + 0.04);
            });
        } catch (e) { /* no sound */ }
    }

    /* the cards that flip: the academic menu (the header, not on the home page) and the play navigation; each gets its
       place in the row as --i, so they turn one after the other */
    function number(sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (e, i) { e.style.setProperty('--i', i); });
        return document.querySelectorAll(sel).length;
    }
    /* the pet (cat-core.js) perks up: a little hop with happy eyes; not while it sleeps or has left */
    function perk() {
        var cat = document.getElementById('cat');
        if (!cat || cat.classList.contains('sleep') || cat.classList.contains('away') || !cat.offsetParent) return;
        cat.classList.remove('perk'); void cat.offsetWidth;
        cat.classList.add('perk', 'happy');
        setTimeout(function () { cat.classList.remove('perk'); if (!cat.querySelector('.cat-bubble')) cat.classList.remove('happy'); }, 1200);
    }

    function turn(on) {
        if (busy || on === isOn()) return;
        busy = true;
        store(on);
        click();
        if (reduce) {
            root.classList.add('pm-fading', 'pm-faded');
            setTimeout(function () {
                set(on);
                relayout();
                root.classList.remove('pm-faded');
                setTimeout(function () { root.classList.remove('pm-fading'); busy = false; }, 220);
            }, 200);
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
            if (on) setTimeout(perk, 120);
            var rest = 160 + (on ? nav : menu) * 55 + 120;
            setTimeout(function () {
                root.classList.remove('pm-switching', 'pm-turn-on', 'pm-turn-off', 'pm-hide-menu', 'pm-hide-nav');
                relayout();
                busy = false;
            }, Math.max(rest, 620));
        }, first);
    }

    key.addEventListener('click', function () { turn(!isOn()); });
    if (back) back.addEventListener('click', function () { turn(false); });
    /* another tab turned the key */
    window.addEventListener('storage', function (e) {
        if (e.key !== 'site-mode' || busy) return;
        var on = e.newValue === 'play';
        if (on !== isOn()) { set(on); relayout(); }
    });
    mark();
})();
