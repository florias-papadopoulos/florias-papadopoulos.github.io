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
     api.end({score, win, text, lowerIsBetter, board})   game over: saves the best, shows text and "Play again". When the
                                 site has its server, it also shows the game's leaderboard (top 10 this week and all
                                 time, per difficulty) and, if the score makes it in, a box to add it under a nickname;
                                 board: an optional sub-board, e.g. the Kitty Kart track. Games of the "two" group have
                                 no leaderboard (the server lists the games that have one: tools/stats-worker/worker.js)
     api.cat(mood)               the cat in the corner: 'happy', 'sad', 'wow', 'think' or 'idle'
     api.say(text, ms)           a speech bubble from the cat
     api.sfx(name)               'tap', 'pop', 'point', 'hit', 'jump', 'move', 'win', 'lose'
     api.server                  the address of the site's own small server (params.statsEndpoint), '' when there is none
     api.touch                   true on touch screens
     api.reducedMotion           true if the visitor prefers less motion
     api.restart()               start the game again

   One file can register more than one id: an entry in content/games/_index.md with "script: <file>" loads
   assets/js/games/<file>.js and runs the game registered under its own id. "restart: false" hides the restart button
   (for a game that a restart would break, like one linked to another player).

   Likes: every card has a like button (a paw print, "paws up") with the total of all visitors (GET and POST /likes on the site's
   server, tools/stats-worker/worker.js). When the page loads, the cards of each tab are ordered by likes (most first,
   then the order of content/games/_index.md). A browser's own like is kept in localStorage 'arcade-votes' ({id: 1});
   pressing it again takes it back.

   Sound: short effects generated with the Web Audio API (nothing downloaded). Music: the note button (in the list
   header, and in the top bar while a game runs) picks one of four looping background mixes of 11 to 12 minutes, files
   in static/music (CC0 tracks joined, credits in static/music/credits.txt), listed in the layout. One <audio>, quieter
   than the effects, which play on top; a file loads only once its mix is picked. The choice and volume are kept in
   localStorage 'arcade-music'; after a reload the music starts again at the first click or key (browsers only allow
   sound after one). */
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
    /* a game's name: its dog name (dogTitle in content/games/_index.md) while a dog is chosen */
    function nameOf(g) { return document.documentElement.dataset.pet === 'dog' && g.dogTitle ? g.dogTitle : g.title; }

    function store(key, value) {
        try {
            if (value === undefined) return JSON.parse(localStorage.getItem(key));
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { return null; }
    }
    /* what comes back from storage is checked: a plain object, keeping only entries that pass ok() */
    function clean(o, ok) {
        var out = {};
        if (o && typeof o === 'object' && !Array.isArray(o)) {
            Object.keys(o).forEach(function (k) { if (k !== '__proto__' && ok(o[k])) out[k] = o[k]; });
        }
        return out;
    }
    var bests = clean(store('arcade-best'), function (v) { return typeof v === 'number' && isFinite(v); });
    var levels = clean(store('arcade-level'), function (v) { return v === 'easy' || v === 'normal' || v === 'hard'; });
    /* games that were renamed: old links still open them, and their saved bests and levels move along */
    var RENAMED = { 'yarn-trail': 'long-cat' };
    Object.keys(RENAMED).forEach(function (old) {
        var now = RENAMED[old], moved = false;
        Object.keys(bests).forEach(function (k) {
            if (k === old || k.indexOf(old + '/') === 0) { var nk = now + k.slice(old.length); if (!(nk in bests)) bests[nk] = bests[k]; delete bests[k]; moved = true; }
        });
        if (old in levels) { if (!(now in levels)) levels[now] = levels[old]; delete levels[old]; moved = true; }
        if (moved) { store('arcade-best', bests); store('arcade-level', levels); }
    });
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

    /* ---------- music: one looping <audio> for the mix picked in the menu of the note button ---------- */
    var musicBox = root.querySelector('.music');
    var mix = 'off', tune = null, musicWaiting = false, musicMenu = null, musicBtn = null;
    if (musicBox) (function () {
        musicBtn = musicBox.querySelector('.music-btn');
        musicMenu = musicBox.querySelector('.music-menu');
        var volRow = musicBox.querySelector('.music-vol'), volInput = volRow.querySelector('input');
        var credit = musicBox.querySelector('.music-credit');
        var inputs = musicBox.querySelectorAll('input[name="music-mix"]'), MIXES = {};
        Array.prototype.forEach.call(inputs, function (i) { MIXES[i.value] = i; });
        function known(v) { return typeof v === 'string' && Object.prototype.hasOwnProperty.call(MIXES, v); }
        var saved = store('arcade-music') || {};
        var vol = typeof saved.volume === 'number' && saved.volume >= 0 && saved.volume <= 100 ? Math.round(saved.volume) : 45;
        mix = known(saved.mix) ? saved.mix : 'off';
        musicWaiting = mix !== 'off';             /* a saved mix waits for the first click or key */

        function save() { store('arcade-music', { mix: mix, volume: vol }); }
        function setVolume() { if (tune) tune.volume = Math.pow(vol / 100, 2) * 0.6; }   /* squared feels even; at most 0.6, under the effects */
        function play() {
            musicWaiting = false;
            if (mix === 'off') {
                if (tune && tune.getAttribute('src')) { tune.pause(); tune.removeAttribute('src'); tune.load(); }
                return;
            }
            if (!tune) {
                tune = document.createElement('audio');
                tune.preload = 'none';
                tune.loop = true;
                tune.volume = 0.5;
                if (tune.volume !== 0.5) volRow.hidden = true;   /* iPhones fix the volume of <audio>: their buttons set it */
            }
            var src = MIXES[mix].dataset.src;
            if (tune.getAttribute('src') !== src) tune.src = src;
            setVolume();
            if (document.hidden) return;
            var p = tune.play();
            if (p && p.catch) p.catch(function () { musicWaiting = mix !== 'off'; });   /* not allowed yet: try at the next click */
        }
        function show() {
            MIXES[mix].checked = true;
            musicBtn.classList.toggle('on', mix !== 'off');
            musicBtn.setAttribute('aria-label', mix === 'off' ? 'Music' : 'Music: ' + MIXES[mix].parentNode.querySelector('.mm-name').textContent);
            var a = document.createElement('a');
            credit.textContent = mix === 'off' ? 'Free CC0 tracks from OpenGameArt.org, ' : 'Mix of ' + MIXES[mix].dataset.tracks + ' CC0 tracks, ';
            a.href = credit.dataset.credits; a.textContent = 'see credits'; a.target = '_blank'; a.rel = 'noopener';
            credit.appendChild(a);
        }
        function menu(open) {
            if (musicMenu.hidden === !open) return;
            musicMenu.hidden = !open;
            musicBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) MIXES[mix].focus();
        }
        musicBox.close = function () { menu(false); };

        Array.prototype.forEach.call(inputs, function (i) {
            i.addEventListener('change', function () { if (!i.checked) return; mix = i.value; save(); show(); play(); });
        });
        volInput.value = vol;
        volInput.addEventListener('input', function () { vol = +volInput.value; setVolume(); save(); });
        musicBtn.addEventListener('click', function () { menu(musicMenu.hidden); });
        musicBtn.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !musicMenu.hidden) { e.stopPropagation(); menu(false); }
        });
        /* keys used in the menu stay there: the games listen on document and window */
        musicMenu.addEventListener('keydown', function (e) {
            e.stopPropagation();
            if (e.key === 'Escape') { menu(false); musicBtn.focus(); }
        });
        musicMenu.addEventListener('keyup', function (e) { e.stopPropagation(); });
        musicBox.addEventListener('focusout', function (e) { if (e.relatedTarget && !musicBox.contains(e.relatedTarget)) menu(false); });
        document.addEventListener('pointerdown', function (e) { if (!musicMenu.hidden && !musicBox.contains(e.target)) menu(false); }, true);
        function wake() { if (musicWaiting && !document.hidden) play(); }
        document.addEventListener('pointerup', wake, true);
        document.addEventListener('keydown', wake, true);
        document.addEventListener('visibilitychange', function () {
            if (!tune || mix === 'off') return;
            if (document.hidden) tune.pause(); else play();
        });
        window.addEventListener('pagehide', function () { if (tune) tune.pause(); });
        window.addEventListener('pageshow', function (e) { if (e.persisted && tune && mix !== 'off') play(); });
        show();
        musicBox.hidden = false;
    })();

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

    /* ---------- leaderboards (end of a game; server side: /scores in tools/stats-worker/worker.js) ---------- */
    var boardEl = msg.querySelector('.stage-board'), boardSeq = 0;
    var LEVEL_NAME = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
    function hideBoard() { boardSeq++; if (boardEl) { boardEl.hidden = true; boardEl.innerHTML = ''; } }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function scoreFmt(id) { return function (v) { return id === 'kitty-kart' ? v.toFixed(1) + ' s' : String(v); }; }
    function topList(list, fmt, mine, empty) {
        if (!list.length) return el('p', 'sb-empty', empty);
        var ol = el('ol', 'sb-list');
        list.forEach(function (r) {
            var li = el('li', mine && r.n.toLowerCase() === mine.toLowerCase() ? 'sb-me' : '');
            li.appendChild(el('span', 'sb-name', r.n));
            li.appendChild(el('span', 'sb-score', fmt(r.s)));
            ol.appendChild(li);
        });
        return ol;
    }
    function showBoard(id, o) {
        var server = root.dataset.server, g = byId[id];
        if (!boardEl || !server || !g || g.group === 'two' || typeof o.score !== 'number' || !(o.lowerIsBetter || o.score > 0)) return;
        var seq = ++boardSeq, lower = !!o.lowerIsBetter, level = levelOf(id), sub = o.board || '';
        var q = 'g=' + encodeURIComponent(id) + '&l=' + level + (sub ? '&b=' + encodeURIComponent(sub) : '');
        var fmt = scoreFmt(id);
        var better = function (a, b) { return lower ? a < b : a > b; };
        var shown = 'week', data = null, mine = null;
        boardEl.innerHTML = '';
        boardEl.appendChild(el('p', 'sb-load', 'Loading the leaderboard...'));
        boardEl.hidden = false;
        function fits(list) { return list.length < 10 || better(o.score, list[list.length - 1].s); }
        function render() {
            boardEl.innerHTML = '';
            var head = el('div', 'sb-head');
            head.appendChild(el('span', 'sb-title', 'Leaderboard' + (g.levels ? ', ' + LEVEL_NAME[level] : '')));
            var tabs = el('span', 'sb-tabs');
            [['week', 'This week'], ['all', 'All time']].forEach(function (t) {
                var b = el('button', 'sb-tab', t[1]);
                b.type = 'button';
                b.setAttribute('aria-pressed', shown === t[0] ? 'true' : 'false');
                b.addEventListener('click', function () { shown = t[0]; render(); });
                tabs.appendChild(b);
            });
            head.appendChild(tabs);
            boardEl.appendChild(head);
            boardEl.appendChild(topList(data[shown], fmt, mine, 'No scores yet. Be the first!'));
            if (!mine && (fits(data.week) || fits(data.all))) form();
        }
        function form() {
            var box = el('div', 'sb-form');
            var label = el('label', 'sb-label');
            label.appendChild(el('span', null, 'Your score ' + fmt(o.score) + ' makes the list. Your name:'));
            var input = el('input', 'sb-input');
            input.type = 'text'; input.maxLength = 20; input.autocomplete = 'nickname'; input.spellcheck = false;
            input.placeholder = 'Nickname';
            input.value = store('arcade-name') || '';
            label.appendChild(input);
            box.appendChild(label);
            var send = el('button', 'arcade-btn sb-send', 'Add my score');
            send.type = 'button';
            box.appendChild(send);
            var note = el('p', 'sb-note');
            box.appendChild(note);
            /* typing a name must not steer the game or close it */
            ['keydown', 'keyup', 'keypress'].forEach(function (t) { input.addEventListener(t, function (e) { e.stopPropagation(); if (t === 'keydown' && e.key === 'Enter') submit(); }); });
            send.addEventListener('click', submit);
            function submit() {
                var name = input.value.trim().replace(/\s+/g, ' ');
                if (name.length < 2) { note.textContent = 'At least 2 letters, please.'; return; }
                send.disabled = true; note.textContent = 'Sending...';
                fetch(server + '/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ g: id, l: level, b: sub, n: name, s: o.score }) })
                    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d }; }); })
                    .then(function (r) {
                        if (seq !== boardSeq) return;
                        send.disabled = false;
                        if (r.status === 422) { note.textContent = 'That name is not allowed. Try another one.'; return; }
                        if (r.status !== 200 || !r.d.all) { note.textContent = 'The leaderboard is not reachable right now.'; return; }
                        store('arcade-name', name);
                        mine = name; data = r.d;
                        render();
                    })
                    .catch(function () { if (seq === boardSeq) { send.disabled = false; note.textContent = 'The leaderboard is not reachable right now.'; } });
            }
            boardEl.appendChild(box);
        }
        fetch(server + '/scores?' + q, { cache: 'no-cache' })   /* fresh: a score may have been added a moment ago */
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (d) { if (seq !== boardSeq) return; data = { week: d.week || [], all: d.all || [] }; render(); })
            .catch(function () { if (seq === boardSeq) { boardEl.innerHTML = ''; boardEl.appendChild(el('p', 'sb-load', 'The leaderboard is not reachable right now.')); } });
    }

    function start(id) {
        stop();
        var g = byId[id];
        var cleanups = [], resizeFns = [], ended = false;
        msg.hidden = true;
        hideBoard();
        area.innerHTML = '';
        area.className = 'stage-area game-' + id;
        stage.querySelector('.stage-title').textContent = nameOf(g);
        stage.querySelector('.stage-score').textContent = '';
        var key = bestKey(id), b = bests[key];
        stage.querySelector('.stage-best').textContent = b == null ? '' : 'Best ' + b;
        if (levelPick) { levelPick.hidden = !g.levels; levelPick.value = levelOf(id); }
        stage.querySelector('.stage-restart').hidden = g.restart === false;
        catMood('idle');
        if (bubble) { bubble.remove(); bubble = null; }   /* no leftover speech bubble from the previous round */
        var api = {
            el: area,
            server: root.dataset.server || '',
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
                var mt = o.text || (o.win === false ? 'Game over' : 'You win!');
                msg.querySelector('.stage-msg-text').textContent = mt + (isBest && typeof o.score === 'number' ? (mt.indexOf('\n') >= 0 ? '\n' : '  ') + 'New best!' : '');
                showBoard(id, o);
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
        if (musicBox && musicBox.parentNode !== stage.querySelector('.stage-bar')) { musicBox.close(); stage.querySelector('.stage-bar').appendChild(musicBox); }
        load(id, function () { start(id); });
    }
    function close() {
        stop();
        stage.hidden = true;
        msg.hidden = true;
        hideBoard();
        document.body.classList.remove('arcade-playing');
        if (musicBox && musicBox.parentNode === stage.querySelector('.stage-bar')) { musicBox.close(); root.querySelector('.arcade-head').appendChild(musicBox); }
    }
    /* The Leaderboards tab, filled when first opened. Overview: one card per game that has scores (top 3 all time of its
       busiest board: Normal if it has players, and for track games the track with the most players), the games with
       the most players first, each with a button to its full leaderboard. Full leaderboards: pick a game, a difficulty
       (and a Kitty Kart track), see both top 10s. Without /scores/summary on the server, the full view opens. */
    var boards = document.getElementById('panel-boards'), boardsReady = false, boardsSeq = 0;
    function boardsLoad() {
        var gSel = boards.querySelector('.ab-game'), lSel = boards.querySelector('.ab-level'), tSel = boards.querySelector('.ab-track');
        var id = gSel.value, g = byId[id], server = root.dataset.server;
        boards.querySelector('.ab-level-l').hidden = !g.levels;
        var tracks = g.tracks || [];
        boards.querySelector('.ab-track-l').hidden = tracks.length < 2;   /* one track (Garden Defender's tour): no picker */
        boards.querySelector('.ab-track-n').textContent = g.trackLabel || 'Track';
        if (tSel.dataset.game !== id) {
            tSel.innerHTML = '';
            tracks.forEach(function (t) { var op = el('option', null, t.name); op.value = t.id; tSel.appendChild(op); });
            tSel.dataset.game = id;
        }
        var level = g.levels ? lSel.value : 'normal', sub = tracks.length ? tSel.value : '';
        var lists = boards.querySelectorAll('.ab-list'), seq = ++boardsSeq;
        Array.prototype.forEach.call(lists, function (l) { l.innerHTML = ''; l.appendChild(el('p', 'sb-load', 'Loading...')); });
        fetch(server + '/scores?g=' + encodeURIComponent(id) + '&l=' + level + (sub ? '&b=' + encodeURIComponent(sub) : ''), { cache: 'no-cache' })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (d) {
                if (seq !== boardsSeq) return;
                var mine = store('arcade-name');
                Array.prototype.forEach.call(lists, function (l) { l.innerHTML = ''; l.appendChild(topList(d[l.dataset.k] || [], scoreFmt(id), mine, 'No scores yet.')); });
            })
            .catch(function () {
                if (seq !== boardsSeq) return;
                Array.prototype.forEach.call(lists, function (l) { l.innerHTML = ''; l.appendChild(el('p', 'sb-load', 'Not reachable right now.')); });
            });
    }
    function boardsView(v) {
        Array.prototype.forEach.call(boards.querySelectorAll('.ab-view'), function (b) { b.setAttribute('aria-pressed', b.dataset.view === v ? 'true' : 'false'); });
        boards.querySelector('.ab-over').hidden = v !== 'over';
        boards.querySelector('.ab-full').hidden = v !== 'full';
        if (v === 'full') boardsLoad();
    }
    function trackName(g, id) { var t = (g.tracks || []).filter(function (x) { return x.id === id; })[0]; return t ? t.name : id; }
    function boardsOverview() {
        var over = boards.querySelector('.ab-over');
        over.innerHTML = '';
        over.appendChild(el('p', 'sb-load', 'Loading...'));
        fetch(root.dataset.server + '/scores/summary', { cache: 'no-cache' })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (d) {
                var games = {}, mine = store('arcade-name');
                (d.boards || []).forEach(function (b) {
                    var p = b.b.split('/'), g = byId[p[0]];
                    if (!g || !b.top || !b.top.length) return;
                    var e = games[g.id] || (games[g.id] = { g: g, players: 0, boards: [] });
                    e.players += b.p;
                    e.boards.push({ level: p[1], track: p[2] || '', p: b.p, top: b.top });
                });
                var list = Object.keys(games).map(function (k) { return games[k]; });
                list.sort(function (a, b) { return b.players - a.players; });
                over.innerHTML = '';
                if (!list.length) { over.appendChild(el('p', 'sb-empty', 'No scores yet. Play a game and be the first!')); return; }
                var grid = el('div', 'ab-cards');
                list.forEach(function (e) {
                    var normal = e.boards.filter(function (b) { return b.level === 'normal'; });
                    var pick = (normal.length ? normal : e.boards).slice().sort(function (a, b) { return b.p - a.p; })[0];
                    var card = el('section', 'ab-card');
                    var head = el('h3', 'ab-card-h');
                    head.appendChild(el('span', 'ab-card-i', e.g.emoji));
                    head.appendChild(el('span', null, nameOf(e.g)));
                    card.appendChild(head);
                    var sub = [];
                    if (e.g.levels) sub.push(LEVEL_NAME[pick.level] || pick.level);
                    if (pick.track && (e.g.tracks || []).length > 1) sub.push(trackName(e.g, pick.track));
                    sub.push(e.players + (e.players === 1 ? ' player' : ' players'));
                    card.appendChild(el('p', 'ab-card-sub', sub.join(' · ')));
                    var ol = topList(pick.top, scoreFmt(e.g.id), mine, '');
                    ol.classList.add('ab-podium');
                    card.appendChild(ol);
                    var more = el('button', 'arcade-btn ab-more', 'Full leaderboard');
                    more.type = 'button';
                    more.addEventListener('click', function () {
                        boards.querySelector('.ab-game').value = e.g.id;
                        boards.querySelector('.ab-level').value = pick.level;
                        boards.querySelector('.ab-track').dataset.game = '';
                        boardsLoad();
                        if (pick.track) boards.querySelector('.ab-track').value = pick.track;
                        boardsView('full');
                    });
                    card.appendChild(more);
                    grid.appendChild(card);
                });
                over.appendChild(grid);
            })
            .catch(function () { boardsView('full'); });
    }
    function boardsOpen() {
        if (!boards || !root.dataset.server) return;
        if (!boardsReady) {
            boardsReady = true;
            Array.prototype.forEach.call(boards.querySelectorAll('.ab-view'), function (b) { b.addEventListener('click', function () { boardsView(b.dataset.view); }); });
            var gSel = boards.querySelector('.ab-game');
            Array.prototype.forEach.call(root.querySelectorAll('.arcade-grid .game-card'), function (c) {   /* page order: Best, then More */
                var g = byId[c.dataset.id];
                if (!g || g.group === 'two' || !g.src) return;
                var op = el('option', null, nameOf(g)); op.value = g.id; gSel.appendChild(op);
            });
            boards.querySelector('.ab-level').value = 'normal';
            Array.prototype.forEach.call(boards.querySelectorAll('select'), function (sel) { sel.addEventListener('change', boardsLoad); });
        }
        if (!boards.querySelector('.ab-over').hidden) boardsOverview(); else boardsLoad();
    }

    /* ---------- likes: a paw print on every card, the most liked first in each tab ---------- */
    (function () {
        var server = root.dataset.server;
        if (!server || !window.fetch) return;
        var mine = {};
        try { mine = JSON.parse(localStorage.getItem('arcade-votes') || '{}') || {}; } catch (e) { mine = {}; }
        var counts = {}, busy = false;
        function show() {
            Array.prototype.forEach.call(root.querySelectorAll('.game-cell'), function (cell) {
                var box = cell.querySelector('.gc-votes');
                if (!box) return;
                var id = cell.dataset.id, c = counts[id] || { u: 0, d: 0 };
                Array.prototype.forEach.call(box.querySelectorAll('.gc-vote'), function (b) {
                    var v = +b.dataset.v;
                    b.querySelector('.gc-n').textContent = v === 1 ? c.u : c.d;
                    b.setAttribute('aria-pressed', mine[id] === v ? 'true' : 'false');
                });
                box.title = c.u === 1 ? '1 paw up' : c.u + ' paws up';
                box.hidden = false;
            });
        }
        function sort() {
            Array.prototype.forEach.call(root.querySelectorAll('.arcade-grid'), function (grid) {
                var cells = Array.prototype.slice.call(grid.querySelectorAll('.game-cell'));
                cells.forEach(function (c, i) { if (c.dataset.order == null) c.dataset.order = i; });
                function likes(c) { return (counts[c.dataset.id] || { u: 0 }).u; }
                cells.sort(function (a, b) { return likes(b) - likes(a) || a.dataset.order - b.dataset.order; });
                cells.forEach(function (c) { grid.appendChild(c); });
            });
            balance();
        }
        function take(d) { counts = d && typeof d === 'object' ? d : {}; }
        fetch(server + '/likes', { cache: 'no-cache' })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (d) { take(d); sort(); show(); })
            .catch(function () { /* no server: the cards stay as they are, without votes */ });
        root.addEventListener('click', function (e) {
            var b = e.target.closest('.gc-vote');
            if (!b || busy) return;
            e.stopPropagation();
            var id = b.closest('.game-cell').dataset.id, v = +b.dataset.v, from = mine[id] || 0, to = from === v ? 0 : v;   /* an old dislike (-1) turns into a like */
            /* show it at once, then take the server's totals */
            var c = counts[id] || (counts[id] = { u: 0, d: 0 });
            c.u = Math.max(0, c.u + (to === 1) - (from === 1)); c.d = Math.max(0, c.d + (to === -1) - (from === -1));
            if (to) mine[id] = to; else delete mine[id];
            try { localStorage.setItem('arcade-votes', JSON.stringify(mine)); } catch (err) { /* kept for this visit only */ }
            show();
            if (to) { b.classList.remove('boop'); void b.offsetWidth; b.classList.add('boop'); }
            if (audio()) SFX[to ? 'pop' : 'tap'](ctx.currentTime + 0.005);
            busy = true;
            fetch(server + '/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ g: id, f: from, t: to }) })
                .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(function (d) { take(d); show(); })
                .catch(function () { /* the vote stays shown; it was not counted */ })
                .then(function () { busy = false; });
        });
    })();

    /* ---------- balanced rows of cards: the cards of a tab are dealt into rows that differ by at most one card (the
       longer rows first), as many per row as fit: 4 cards where 3 fit become 2 + 2, 13 where 4 fit 4 + 3 + 3 + 3.
       Each row is a .gc-row; rebuilt on resize and after the cards are sorted by likes. ---------- */
    function balance() {
        Array.prototype.forEach.call(root.querySelectorAll('.arcade-grid'), function (grid) {
            var cells = Array.prototype.slice.call(grid.querySelectorAll('.game-cell')), n = cells.length, avail = root.clientWidth;
            if (!n || !avail) return;
            var phone = window.matchMedia('(max-width: 600px)').matches, gap = phone ? 10 : 14, w = phone ? (avail - gap) / 2 : 200;
            var fit = phone ? 2 : Math.max(1, Math.floor((avail + gap) / (w + gap)));
            var rows = Math.ceil(n / Math.min(fit, n)), base = Math.floor(n / rows), extra = n % rows, at = 0;
            var frag = document.createDocumentFragment();
            for (var r = 0; r < rows; r++) {
                var row = document.createElement('div'), size = base + (r < extra ? 1 : 0);
                row.className = 'gc-row';
                for (var i = 0; i < size; i++) row.appendChild(cells[at++]);
                frag.appendChild(row);
            }
            Array.prototype.forEach.call(grid.querySelectorAll('.gc-row'), function (old) { old.remove(); });
            grid.appendChild(frag);
        });
    }
    balance();
    window.addEventListener('resize', balance);

    /* The Best / 2 Player / More tabs above the cards (and Leaderboards). */
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.arcade-tab'));
    function showTab(tab, focus) {
        tabs.forEach(function (t) {
            var on = t === tab;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
        if (focus) tab.focus();
        if (tab.id === 'tab-boards') boardsOpen();
        window.dispatchEvent(new Event('tl-change'));   /* the roaming cat (cat-pages.js) leaves cards that just hid */
    }
    tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { showTab(t); });
        t.addEventListener('keydown', function (e) {
            var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
            if (j === null) return;
            e.preventDefault();
            showTab(tabs[(j + tabs.length) % tabs.length], true);
        });
    });
    function route() {
        var m = /^#play\/([\w-]+)$/.exec(location.hash);
        if (m && RENAMED[m[1]]) { history.replaceState(null, '', '#play/' + RENAMED[m[1]]); m[1] = RENAMED[m[1]]; }
        if (m) {
            var card = root.querySelector('.game-card[data-id="' + m[1] + '"]');   /* back from a linked game lands on its tab */
            var panel = card && card.closest('[role="tabpanel"]');
            if (panel) showTab(document.getElementById(panel.getAttribute('aria-labelledby')));
            open(m[1]);
        } else close();
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
