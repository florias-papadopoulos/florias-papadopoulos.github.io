/* The player of one story (SC.player(root, def), started by 90-boot.js for each .sc-player). The story goes step by
   step: one scene of the animation per step, with its caption (the <li>s of the story's .sc-steps list in the page)
   shown under the picture. A step plays once and the picture stops at its end, so the reader goes on with Next when
   ready. Under the caption: the steps track (tap a step to play it), Back, Pause / Play / Replay this step, Next, full
   screen. Keys anywhere in the player: space or Enter (pause, go on, or the next step when this one is done), right
   arrow Next, left arrow Back, R replay the step, Home the start, F full screen. With reduced motion every step is a
   still picture (def.keys, or the end of its scene). Only one story plays at a time, and a story pauses when it
   scrolls out of view. */
SC.player = (function () {
    'use strict';
    var all = [];
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var ICON = {
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
        replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ln" d="M5 12a7 7 0 1 0 2.1-5"/><path d="M4 3.5v5.5h5.5z"/></svg>',
        back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ln" d="M14.5 6l-6 6 6 6"/></svg>',
        next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ln" d="M9.5 6l6 6-6 6"/></svg>',
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
        var story = root.closest('.sc-story') || root.parentNode;
        var list = story.querySelector('.sc-steps');
        var caps = list ? Array.prototype.map.call(list.querySelectorAll('li'), function (li) { return li.innerHTML; }) : [];
        if (list) list.classList.add('sc-js');               /* the plain list is for pages without the script */
        var render = def.build(svg, SC.H);
        var starts = [], T = 0;
        def.scenes.forEach(function (d) { starts.push(T); T += d; });
        var n = starts.length;
        /* cur: the step shown; t: the time in the whole story; stop: where the step ends */
        var cur = -1, t = def.poster || 0, stop = 0, playing = false, last = 0, raf = 0;

        /* ---------- the controls ---------- */
        var big = h('button', 'sc-big', { type: 'button', 'aria-label': 'Start the story' }, screen);
        big.innerHTML = ICON.play;
        var cap = h('div', 'sc-caption', { 'aria-live': 'polite' }, root);
        var capNo = h('span', 'sc-stepno', {}, cap), capText = h('span', 'sc-captext', {}, cap);
        var bar = h('div', 'sc-bar', {}, root);
        var track = h('div', 'sc-track', { role: 'group', 'aria-label': 'Steps' }, bar);
        var segs = def.scenes.map(function (d, i) {
            var b = h('button', 'sc-seg', { type: 'button', 'aria-label': 'Step ' + (i + 1) }, track);
            h('i', '', {}, h('span', '', {}, b));
            b.addEventListener('click', function () { playStep(i); });
            return b;
        });
        var row = h('div', 'sc-row', {}, bar);
        var bBack = h('button', 'sc-btn sc-back', { type: 'button', title: 'Back a step (left arrow)' }, row);
        bBack.innerHTML = ICON.back + '<span>Back</span>';
        var bMid = h('button', 'sc-btn sc-mid-btn', { type: 'button' }, row);
        var bNext = h('button', 'sc-btn sc-next', { type: 'button', title: 'Next step (right arrow)' }, row);
        var nextText = h('span', '', {}, bNext);
        bNext.insertAdjacentHTML('beforeend', ICON.next);
        var bFull = h('button', 'sc-btn sc-fullbtn', { type: 'button', 'aria-label': 'Full screen', title: 'Full screen (F)' }, row);
        bFull.innerHTML = ICON.full;
        if (!canFull) bFull.hidden = true;

        /* where step i stops: just before the next one starts (at its very start the picture is already the next
           step's); the still of step i with reduced motion: def.keys[i] when given, else that end */
        function endOf(i) { return i === n - 1 ? T : starts[i] + def.scenes[i] - 0.02; }
        function keyT(i) { return def.keys && def.keys[i] != null ? def.keys[i] : endOf(i); }
        function done() { return cur >= 0 && !playing && t >= stop - 1e-6; }
        function lastDone() { return cur === n - 1 && done(); }

        function draw() {
            render(t);
            segs.forEach(function (b, i) {
                var k = cur < 0 ? 0 : i < cur ? 1 : i > cur ? 0 : reduce.matches ? 1 : (t - starts[i]) / def.scenes[i];
                b.firstChild.firstChild.style.transform = 'scaleX(' + Math.max(0, Math.min(1, k)).toFixed(4) + ')';
                if (i === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
            });
            if (cur < 0) {
                capNo.textContent = n + ' steps';
                capText.textContent = 'Press play, then Next whenever you are ready.';
            } else if (capNo.dataset.i !== String(cur)) {
                capNo.dataset.i = String(cur);
                capNo.textContent = (cur + 1) + ' / ' + n;
                capText.innerHTML = caps[cur] || '';
            }
            var mid = playing ? 'pause' : done() || cur < 0 ? 'replay' : 'play';
            if (bMid.dataset.icon !== mid) {
                bMid.dataset.icon = mid;
                bMid.innerHTML = ICON[mid];
                var lab = mid === 'pause' ? 'Pause' : mid === 'play' ? 'Go on' : 'Replay this step';
                bMid.setAttribute('aria-label', lab);
                bMid.title = lab + (mid === 'replay' ? ' (R)' : ' (space)');
            }
            bMid.disabled = cur < 0;
            bBack.disabled = cur <= 0;
            var nx = cur < 0 ? 'Start' : lastDone() ? 'Again' : 'Next';
            if (nextText.textContent !== nx) nextText.textContent = nx;
            bNext.classList.toggle('sc-wait', playing);
            root.classList.toggle('playing', playing);
            root.classList.toggle('sc-started', cur >= 0);
            story.classList.toggle('sc-ended', lastDone());
        }

        function frame(ts) {
            raf = 0;
            if (!playing) return;
            var dt = Math.min(0.1, (ts - last) / 1000);
            last = ts;
            t = Math.min(stop, t + dt);
            if (t >= stop) playing = false;
            draw();
            if (playing) raf = requestAnimationFrame(frame);
        }
        function run() {
            all.forEach(function (p) { if (p !== api) p.pause(); });
            playing = true;
            last = performance.now();
            /* the roaming pet moves off the player (assets/js/lab/cat-pages.js listens) */
            window.dispatchEvent(new Event('tl-change'));
            draw();
            if (!raf) raf = requestAnimationFrame(frame);
        }
        /* play step i from its start (with reduced motion: show its still) */
        function playStep(i) {
            cur = Math.max(0, Math.min(n - 1, i));
            stop = endOf(cur);
            if (reduce.matches) { t = keyT(cur); stop = t; playing = false; draw(); return; }
            t = starts[cur];
            run();
        }
        function pause() { if (!playing) return; playing = false; draw(); }
        function next() { playStep(cur < 0 || lastDone() ? 0 : cur + 1); }
        function back() { playStep(cur - 1); }
        function replay() { if (cur >= 0) playStep(cur); }
        /* space, Enter, a tap on the picture: pause, go on, or the next step when this one is done */
        function toggle() {
            if (playing) pause();
            else if (cur < 0 || done()) next();
            else run();
        }
        function mid() { if (playing) pause(); else if (done()) replay(); else if (cur >= 0) run(); }

        big.addEventListener('click', function () { playStep(0); });
        svg.addEventListener('click', toggle);
        bMid.addEventListener('click', mid);
        bBack.addEventListener('click', back);
        bNext.addEventListener('click', next);
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

        root.tabIndex = 0;
        root.addEventListener('keydown', function (e) {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            var k = e.key, onBtn = e.target.tagName === 'BUTTON';
            if ((k === ' ' || k === 'Enter') && onBtn) return;      /* the button itself */
            if (k === ' ' || k === 'Enter') { e.preventDefault(); toggle(); }
            else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); next(); }
            else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); if (cur > 0) back(); }
            else if (k === 'r' || k === 'R') { e.preventDefault(); replay(); }
            else if (k === 'Home') { e.preventDefault(); playStep(0); }
            else if ((k === 'f' || k === 'F') && canFull) { e.preventDefault(); bFull.click(); }
        });

        /* out of view: pause */
        if (window.IntersectionObserver) {
            new IntersectionObserver(function (es) {
                es.forEach(function (x) { if (x.intersectionRatio < 0.15 && !fsEl()) pause(); });
            }, { threshold: 0.15 }).observe(root);
        }

        var api = { pause: pause, playStep: playStep, root: root, state: function () { return { cur: cur, t: t, playing: playing, n: n }; },
            /* for tests: the end of step i, at once */
            jump: function (i) { cur = i; t = stop = keyT(i); playing = false; draw(); } };
        all.push(api);
        draw();
        return api;
    };
})();
