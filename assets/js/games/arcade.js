/* Games page shell (layouts/_default/arcade.html, styles assets/css/common/arcade.css).

   A game is a file assets/js/games/<id>.js that calls

       Arcade.register('<id>', function (api) {
           ...build the game inside api.el...
           return { destroy: function () { ... } };   // optional, for anything api.* does not clean up
       });

   The api (everything registered through it is cleaned up when the player leaves or restarts):
     api.el                      the play area (position: relative), fills the screen below the top bar
     api.size()                  {w, h} of the play area in CSS pixels
     api.onResize(fn)            fn({w, h}) when the play area changes size
     api.on(target, type, fn)    addEventListener, removed on exit
     api.loop(fn)                requestAnimationFrame loop, fn(dt seconds, now ms); returns stop()
     api.timeout(fn, ms), api.interval(fn, ms)
     api.css(text)               add the game's styles once (scope them with a class of your own)
     api.score(value, label)     show the score in the top bar (label defaults to "Score")
     api.best()                  best score so far (number) or null, at the current difficulty
     api.level()                 'easy', 'normal' or 'hard': the difficulty picked in the top bar. The picker shows for
                                 games with "levels: true" in content/games/_index.md; changing it restarts the game,
                                 and each difficulty keeps its own best
     api.end({score, win, text, lowerIsBetter})   game over: saves the best, shows text and "Play again"
     api.cat(mood)               the cat in the corner: 'happy', 'sad', 'wow', 'think' or 'idle'
     api.say(text, ms)           a speech bubble from the cat
     api.sfx(name)               'tap', 'pop', 'point', 'hit', 'jump', 'move', 'win', 'lose'
     api.touch                   true on touch screens
     api.reducedMotion           true if the visitor prefers less motion
     api.restart()               start the game again

   Sound: short effects only, generated with the Web Audio API (nothing downloaded). */
(function () {
    'use strict';
    var root = document.getElementById('arcade');
    if (!root) return;
    var games = JSON.parse(root.dataset.games || '[]');
    var byId = {};
    games.forEach(function (g) { byId[g.id] = g; });
    var stage = root.querySelector('.arcade-stage');
    var area = stage.querySelector('.stage-area');
    var msg = stage.querySelector('.stage-msg');
    var mascot = stage.querySelector('.mascot');
    var factories = {}, loading = {}, current = null;

    function store(key, value) {
        try {
            if (value === undefined) return JSON.parse(localStorage.getItem(key));
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { return null; }
    }
    var bests = store('arcade-best') || {};
    var levels = store('arcade-level') || {};
    var levelPick = stage.querySelector('.stage-level');
    function levelOf(id) { return byId[id] && byId[id].levels && levels[id] || 'normal'; }
    function bestKey(id) { var l = levelOf(id); return l === 'normal' ? id : id + '/' + l; }   /* normal: the old key */

    window.Arcade = {
        register: function (id, factory) {
            factories[id] = factory;
            if (loading[id]) { loading[id].forEach(function (cb) { cb(); }); delete loading[id]; }
        }
    };

    /* ---------- sound: one AudioContext for the effects ---------- */
    var ctx = null, master = null, sfxGain = null;
    function audio() {
        if (!ctx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
            sfxGain = ctx.createGain(); sfxGain.gain.value = 0.32; sfxGain.connect(master);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    var NOTES = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
    function freq(n) {                             /* 'A4', 'C#5', 'Eb3' -> Hz */
        var m = /^([A-G])([#b]?)(\d)$/.exec(n);
        var semis = NOTES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 4) * 12;
        return 440 * Math.pow(2, semis / 12);
    }
    function tone(f, t, dur, type, gain, dest) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
        return o;
    }
    var noiseBuf = null;
    function noise(t, dur, gain, hp, dest) {
        if (!noiseBuf) {
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
            var d = noiseBuf.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
    }
    var SFX = {
        tap:   function (t) { tone(660, t, 0.06, 'square', 0.3, sfxGain); },
        move:  function (t) { tone(330, t, 0.05, 'triangle', 0.4, sfxGain); },
        pop:   function (t) { tone(880, t, 0.05, 'square', 0.3, sfxGain); tone(1320, t + 0.04, 0.06, 'square', 0.25, sfxGain); },
        point: function (t) { tone(988, t, 0.07, 'square', 0.3, sfxGain); tone(1319, t + 0.07, 0.12, 'square', 0.3, sfxGain); },
        hit:   function (t) { noise(t, 0.15, 0.5, 300, sfxGain); tone(110, t, 0.15, 'sawtooth', 0.3, sfxGain); },
        jump:  function (t) {
            var o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'square'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(800, t + 0.12);
            g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
            o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.16);
        },
        win:   function (t) { ['C5', 'E5', 'G5', 'C6'].forEach(function (n, i) { tone(freq(n), t + i * 0.1, 0.18, 'square', 0.3, sfxGain); }); },
        lose:  function (t) { ['G4', 'E4', 'C4'].forEach(function (n, i) { tone(freq(n), t + i * 0.14, 0.22, 'triangle', 0.45, sfxGain); }); }
    };

    /* ---------- the cat in the corner ---------- */
    var moodTimer = null, bubble = null;
    function catMood(mood) {
        mascot.classList.remove('happy', 'sad', 'wow', 'think', 'sleep');
        clearTimeout(moodTimer);
        if (!mood || mood === 'idle') return;
        void mascot.offsetWidth;
        mascot.classList.add(mood);
        if (mood !== 'think') moodTimer = setTimeout(function () { mascot.classList.remove(mood); }, 1800);
    }
    function say(text, ms) {
        if (bubble) bubble.remove();
        bubble = document.createElement('div');
        bubble.className = 'mascot-say';
        bubble.textContent = text;
        stage.appendChild(bubble);
        var b = bubble;
        setTimeout(function () { if (b === bubble) { b.remove(); bubble = null; } }, ms || 2200);
    }
    if (levelPick) levelPick.addEventListener('change', function () {
        if (!current) return;
        levels[current.id] = levelPick.value;
        store('arcade-level', levels);
        showBests();
        levelPick.blur();                          /* arrow keys go to the game again */
        start(current.id);
    });
    mascot.addEventListener('click', function () { catMood('happy'); say('purr'); });

    /* ---------- running a game ---------- */
    function showBests() {
        Array.prototype.forEach.call(root.querySelectorAll('[data-best]'), function (el) {
            var id = el.dataset.best, b = bests[bestKey(id)], l = levelOf(id);
            el.textContent = b == null ? '' : 'Best' + (l === 'normal' ? '' : ' (' + l + ')') + ': ' + b;
        });
    }
    showBests();

    function load(id, done) {
        if (factories[id]) return done();
        if (loading[id]) return loading[id].push(done);
        loading[id] = [done];
        var s = document.createElement('script');
        s.src = byId[id].src;
        if (byId[id].integrity) { s.integrity = byId[id].integrity; s.crossOrigin = 'anonymous'; }
        document.head.appendChild(s);
    }

    function start(id) {
        stop();
        var g = byId[id];
        var cleanups = [], resizeFns = [], ended = false;
        msg.hidden = true;
        area.innerHTML = '';
        area.className = 'stage-area game-' + id;
        stage.querySelector('.stage-title').textContent = g.title;
        stage.querySelector('.stage-score').textContent = '';
        var key = bestKey(id), b = bests[key];
        stage.querySelector('.stage-best').textContent = b == null ? '' : 'Best ' + b;
        if (levelPick) { levelPick.hidden = !g.levels; levelPick.value = levelOf(id); }
        catMood('idle');
        if (bubble) { bubble.remove(); bubble = null; }   /* no leftover speech bubble from the previous round */
        var api = {
            el: area,
            touch: window.matchMedia('(pointer: coarse)').matches,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            size: function () { return { w: area.clientWidth, h: area.clientHeight }; },
            onResize: function (fn) { resizeFns.push(fn); },
            on: function (target, type, fn, opts) {
                target.addEventListener(type, fn, opts);
                cleanups.push(function () { target.removeEventListener(type, fn, opts); });
            },
            loop: function (fn) {
                var id2 = 0, last = performance.now(), running = true;
                function frame(now) {
                    if (!running) return;
                    var dt = Math.min(0.05, (now - last) / 1000);
                    last = now;
                    if (!document.hidden) fn(dt, now);
                    id2 = requestAnimationFrame(frame);
                }
                id2 = requestAnimationFrame(frame);
                function halt() { running = false; cancelAnimationFrame(id2); }
                cleanups.push(halt);
                return halt;
            },
            timeout: function (fn, ms) { var t = setTimeout(fn, ms); cleanups.push(function () { clearTimeout(t); }); return t; },
            interval: function (fn, ms) { var t = setInterval(fn, ms); cleanups.push(function () { clearInterval(t); }); return t; },
            css: function (text) {
                if (document.getElementById('css-' + id)) return;
                var st = document.createElement('style');
                st.id = 'css-' + id;
                st.textContent = text;
                document.head.appendChild(st);
            },
            score: function (v, label) { stage.querySelector('.stage-score').textContent = (label || 'Score') + ' ' + v; },
            best: function () { return bests[key] == null ? null : bests[key]; },
            level: function () { return levelOf(id); },
            end: function (o) {
                if (ended) return false;
                ended = true;
                o = o || {};
                var isBest = false;
                if (typeof o.score === 'number' && (o.lowerIsBetter || o.score > 0)) {   /* a score of 0 is never a best */
                    var old = bests[key];
                    if (old == null || (o.lowerIsBetter ? o.score < old : o.score > old)) {
                        bests[key] = o.score; store('arcade-best', bests); isBest = true;
                        stage.querySelector('.stage-best').textContent = 'Best ' + o.score;
                        showBests();
                    }
                }
                catMood(o.win === false ? 'sad' : 'happy');
                api.sfx(o.win === false ? 'lose' : 'win');
                msg.querySelector('.stage-msg-text').textContent = (o.text || (o.win === false ? 'Game over' : 'You win!')) + (isBest && typeof o.score === 'number' ? '  New best!' : '');
                setTimeout(function () { if (current && current.id === id) { msg.hidden = false; msg.querySelector('.stage-again').focus(); } }, 650);
                return isBest;
            },
            cat: catMood,
            say: say,
            sfx: function (name) { if (!audio() || !SFX[name]) return; SFX[name](ctx.currentTime + 0.005); },
            restart: function () { start(id); }
        };
        var ro = new ResizeObserver(function () { var s = api.size(); resizeFns.forEach(function (fn) { fn(s); }); });
        ro.observe(area);
        cleanups.push(function () { ro.disconnect(); });
        var inst = null;
        try { inst = factories[id](api) || {}; } catch (e) { area.textContent = 'Sorry, this game could not start.'; if (window.console) console.error(e); }
        current = { id: id, cleanup: function () {
            cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* keep cleaning */ } });
            if (inst && inst.destroy) { try { inst.destroy(); } catch (e) { /* ignore */ } }
        } };
    }
    function stop() {
        if (current) current.cleanup();
        current = null;
        area.innerHTML = '';
    }

    function open(id) {
        if (!byId[id] || !byId[id].src) return;
        audio();                                   /* opening a game is a user gesture: sound may start */
        document.body.classList.add('arcade-playing');
        stage.hidden = false;
        load(id, function () { start(id); });
    }
    function close() {
        stop();
        stage.hidden = true;
        msg.hidden = true;
        document.body.classList.remove('arcade-playing');
    }
    function route() {
        var m = /^#play\/([\w-]+)$/.exec(location.hash);
        if (m) open(m[1]); else close();
    }
    Array.prototype.forEach.call(root.querySelectorAll('.game-card'), function (c) {
        c.addEventListener('click', function () { audio(); location.hash = 'play/' + c.dataset.id; });
    });
    stage.querySelector('.stage-back').addEventListener('click', function () { history.length > 1 && /#play/.test(location.hash) ? history.back() : (location.hash = ''); });
    stage.querySelector('.stage-restart').addEventListener('click', function () { if (current) start(current.id); });
    stage.querySelector('.stage-again').addEventListener('click', function () { if (current) start(current.id); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !stage.hidden) stage.querySelector('.stage-back').click(); });
    window.addEventListener('hashchange', route);
    route();
})();
