/* The player of one story (SC.player(root, def), started by 90-boot.js for each .sc-player): a big play button on the
   picture, and under it a bar with scene back, play/pause (replay at the end), scene forward, the scene track (one
   segment per scene, click or drag to move; arrow keys on it) and full screen. Keys anywhere in the player: space
   play/pause, left/right a scene back/forward, Home the start, F full screen. With reduced motion the story plays as
   still pictures, one per scene (def.keys, or the end of each scene), each held a few seconds. Only one story plays at a time, and a
   story pauses when it scrolls out of view. */
SC.player = (function () {
    'use strict';
    var all = [];
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var ICON = {
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
        replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ln" d="M5 12a7 7 0 1 0 2.1-5"/><path d="M4 3.5v5.5h5.5z"/></svg>',
        prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2.6v14H6zM19 5.5v13L9.5 12z"/></svg>',
        next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 5H18v14h-2.6zM5 5.5v13L14.5 12z"/></svg>',
        full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ln" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
        exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ln" d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>'
    };
    function h(tag, cls, attrs, parent) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }
    function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
    var canFull = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);

    return function (root, def) {
        var svg = root.querySelector('.sc-stage'), screen = root.querySelector('.sc-screen');
        var render = def.build(svg, SC.H);
        var starts = [], T = 0;
        def.scenes.forEach(function (d) { starts.push(T); T += d; });
        var n = starts.length;
        var t = def.poster || 0, playing = false, last = 0, raf = 0, hold = 0, started = false;

        /* ---------- the controls ---------- */
        var big = h('button', 'sc-big', { type: 'button', 'aria-label': 'Play' }, screen);
        var bar = h('div', 'sc-bar', {}, root);
        var bPrev = h('button', 'sc-btn', { type: 'button', 'aria-label': 'Previous scene', title: 'Previous scene (left arrow)' }, bar);
        var bPlay = h('button', 'sc-btn sc-play', { type: 'button', 'aria-label': 'Play', title: 'Play (space)' }, bar);
        var bNext = h('button', 'sc-btn', { type: 'button', 'aria-label': 'Next scene', title: 'Next scene (right arrow)' }, bar);
        var track = h('div', 'sc-track', { role: 'slider', tabindex: '0', 'aria-label': 'Scene', 'aria-valuemin': '1', 'aria-valuemax': String(n) }, bar);
        var fills = def.scenes.map(function (d) {
            var s = h('span', 'sc-seg', {}, track);
            s.style.flexGrow = d;
            return h('i', '', {}, s);
        });
        var bFull = h('button', 'sc-btn sc-fullbtn', { type: 'button', 'aria-label': 'Full screen', title: 'Full screen (F)' }, bar);
        bPrev.innerHTML = ICON.prev; bNext.innerHTML = ICON.next; bFull.innerHTML = ICON.full;
        if (!canFull) bFull.hidden = true;

        /* the picture of scene i in still mode: def.keys[i] when given, else the end of the scene */
        function keyT(i) { return i === n - 1 ? T : def.keys && def.keys[i] != null ? def.keys[i] : starts[i] + def.scenes[i] - 0.01; }
        function sceneAt(x) { for (var i = n - 1; i >= 0; i--) if (x >= starts[i] - 1e-6) return i; return 0; }
        function ended() { return t >= T - 1e-6; }

        function draw() {
            render(t);
            var sc = sceneAt(Math.min(t, T - 1e-3));
            fills.forEach(function (f, i) {
                var k = i < sc ? 1 : i > sc ? 0 : (t - starts[i]) / def.scenes[i];
                if (ended()) k = 1;
                f.style.transform = 'scaleX(' + Math.max(0, Math.min(1, k)).toFixed(4) + ')';
            });
            track.setAttribute('aria-valuenow', String(sc + 1));
            track.setAttribute('aria-valuetext', 'Scene ' + (sc + 1) + ' of ' + n);
            var icon = playing ? 'pause' : ended() ? 'replay' : 'play';
            var label = playing ? 'Pause' : ended() ? 'Play again' : 'Play';
            if (bPlay.dataset.icon !== icon) {
                bPlay.dataset.icon = icon;
                bPlay.innerHTML = ICON[icon];
                big.innerHTML = ICON[icon === 'pause' ? 'play' : icon];
                bPlay.setAttribute('aria-label', label); big.setAttribute('aria-label', label);
                bPlay.title = label + ' (space)';
            }
            root.classList.toggle('playing', playing);
            root.classList.toggle('sc-mid', !playing && started && !ended());   /* paused halfway: no big button over the picture */
        }

        function frame(ts) {
            raf = 0;
            if (!playing) return;
            var dt = Math.min(0.1, (ts - last) / 1000);
            last = ts;
            if (reduce.matches) {
                /* still pictures: hold the end of each scene, then the next */
                hold -= dt;
                if (hold <= 0) {
                    var sc = sceneAt(Math.min(t, T - 1e-3));
                    if (t >= keyT(sc) - 1e-3) sc++;
                    if (sc >= n) { t = T; playing = false; draw(); return; }
                    t = keyT(sc);
                    hold = Math.max(3.5, def.scenes[sc] * 0.8);
                    draw();
                }
            } else {
                t = Math.min(T, t + dt);
                if (ended()) playing = false;
                draw();
            }
            if (playing) raf = requestAnimationFrame(frame);
        }
        function play() {
            if (!started || ended()) { t = 0; started = true; }
            all.forEach(function (p) { if (p !== api) p.pause(); });
            playing = true;
            hold = 0;
            if (reduce.matches && t > 0) hold = 3.5;   /* already on a picture: show it a while first */
            last = performance.now();
            root.classList.add('sc-on');
            /* the roaming pet moves off the player (assets/js/lab/cat-pages.js listens) */
            window.dispatchEvent(new Event('tl-change'));
            draw();
            if (!raf) raf = requestAnimationFrame(frame);
        }
        function pause() { if (!playing) return; playing = false; draw(); }
        function toggle() { if (playing) pause(); else play(); }
        function seek(x, keep) {
            started = true;
            t = Math.max(0, Math.min(T, x));
            if (!keep) playing = false;
            hold = reduce.matches ? 3.5 : 0;
            last = performance.now();
            draw();
            if (playing && !raf) raf = requestAnimationFrame(frame);
        }
        /* a scene back or forward. Back: the start of this scene, or the one before when already near its start.
           With reduced motion the steps land on the still of a scene (keyT). */
        function step(d) {
            var cur = started ? t : 0, sc = sceneAt(Math.min(cur, T - 1e-3)), to;
            if (reduce.matches) {
                var shown = cur >= keyT(sc) - 0.02 || ended() ? sc : sc - 1;
                var k = Math.max(0, Math.min(n - 1, shown + d));
                return seek(keyT(k), playing);
            }
            if (d < 0) to = cur - starts[sc] > 0.8 || sc === 0 ? starts[sc] : starts[sc - 1];
            else to = sc + 1 < n ? starts[sc + 1] : T;
            seek(to, playing && to < T);
        }

        big.addEventListener('click', toggle);
        svg.addEventListener('click', toggle);
        bPlay.addEventListener('click', toggle);
        bPrev.addEventListener('click', function () { step(-1); });
        bNext.addEventListener('click', function () { step(1); });
        bFull.addEventListener('click', function () {
            if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
        });
        function onFull() {
            var on = fsEl() === root;
            root.classList.toggle('sc-full', on);
            bFull.innerHTML = on ? ICON.exit : ICON.full;
            bFull.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen');
            if (on) root.focus();
        }
        document.addEventListener('fullscreenchange', onFull);
        document.addEventListener('webkitfullscreenchange', onFull);

        /* the track: click or drag anywhere on it */
        function fromPointer(e) {
            var r = track.getBoundingClientRect();
            seek(T * Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
        }
        track.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            track.focus();
            if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
            fromPointer(e);
            function move(ev) { fromPointer(ev); }
            function up() { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); track.removeEventListener('pointercancel', up); }
            track.addEventListener('pointermove', move);
            track.addEventListener('pointerup', up);
            track.addEventListener('pointercancel', up);
        });

        root.tabIndex = 0;
        root.addEventListener('keydown', function (e) {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            var k = e.key, onBtn = e.target.tagName === 'BUTTON';
            if ((k === ' ' || k === 'Enter') && onBtn) return;      /* the button itself */
            if (k === ' ' || k === 'k' || (k === 'Enter' && e.target === root)) { e.preventDefault(); toggle(); }
            else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); step(-1); }
            else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); step(1); }
            else if (k === 'Home') { e.preventDefault(); seek(0); }
            else if (k === 'End') { e.preventDefault(); seek(T); }
            else if ((k === 'f' || k === 'F') && canFull) { e.preventDefault(); bFull.click(); }
        });

        /* out of view: pause */
        if (window.IntersectionObserver) {
            new IntersectionObserver(function (es) {
                es.forEach(function (x) { if (x.intersectionRatio < 0.15 && !fsEl()) pause(); });
            }, { threshold: 0.15 }).observe(root);
        }

        var api = { pause: pause, play: play, seek: seek, root: root };
        all.push(api);
        draw();
        return api;
    };
})();
