/* Cipher History desk tool: a hill climber for a homophonic cipher (several signs for one letter), the method that
   broke Mary Stuart's letters in 2022 (55-mary-2023.js).

   The key's shape is known: how many signs each letter has (e has three, t two, and so on). A key gives each sign
   one letter; a step swaps the letters of two signs and keeps the swap if the text reads at least as well as before.
   "Reads well" is the English quadgram score of the Toolbox (lib/code-breaking.js and data/english-quadgrams.js):
   how common each run of four letters is in ordinary English, averaged, about -4.3 for English, -5.9 for nonsense.
   When nothing has helped for a long while, the climber starts again from a random key and keeps the best so far.

   CH.climb.make(ct, shape, rnd) with ct the message as sign numbers 0..n-1 and shape[i] the letter code that sign i's
     slot has in the key's shape; returns { key, best, bestKey, score, steps, restarts, step(), run(n) }.
   CH.desk.climber(el, { ct, signs, shape, onKey(map), onStep(info) }) draws the buttons (one step with its reason, or
     climb until it reads), the score and a chart of the best score so far. map is { sign: 'E', ... }. */
(function () {
    'use strict';

    CH.climb = {};
    CH.climb.make = function (ct, shape, rnd) {
        rnd = rnd || Math.random;
        var B = CH.B(), n = shape.length, dec = new Array(ct.length);
        var c = { key: shape.slice(), steps: 0, restarts: 0, stale: 0 };
        function score() { for (var i = 0; i < ct.length; i++) dec[i] = c.key[ct[i]]; return B.quadSum(dec) / Math.max(1, ct.length - 3); }
        function shuffle() {
            for (var i = n - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = c.key[i]; c.key[i] = c.key[j]; c.key[j] = t; }
            c.score = score();
        }
        shuffle();
        c.best = c.score;
        c.bestKey = c.key.slice();
        /* one try: swap two signs' letters; returns what happened, for the guided mode */
        c.step = function () {
            var a = Math.floor(rnd() * n), b = Math.floor(rnd() * n);
            while (c.key[a] === c.key[b]) { a = Math.floor(rnd() * n); b = Math.floor(rnd() * n); }
            var before = c.score, t = c.key[a];
            c.key[a] = c.key[b]; c.key[b] = t;
            var after = score(), kept = after >= before;
            c.steps++;
            if (kept) { if (after > before) c.stale = 0; c.score = after; } else { c.key[b] = c.key[a]; c.key[a] = t; c.stale++; }
            if (c.score > c.best) { c.best = c.score; c.bestKey = c.key.slice(); }
            var info = { a: a, b: b, before: before, after: after, kept: kept, restart: false };
            if (c.stale > 1500) { c.restarts++; c.stale = 0; shuffle(); info.restart = true; }
            return info;
        };
        c.run = function (k) { var last; for (var i = 0; i < k; i++) last = c.step(); return last; };
        return c;
    };

    function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }

    CH.desk.climber = function (el, opt) {
        var signs = opt.signs, A = CH.ALPHA, B = CH.B(), climb = null, timer = null, history = [], started = false;
        function fresh() { climb = CH.climb.make(opt.ct, opt.shape); history = [climb.best]; }
        function mapOf(key) { var m = {}; signs.forEach(function (s, i) { m[s] = A.charAt(key[i]); }); return m; }

        var row = CH.el('div', { class: 'ch-row' });
        var stepBtn = CH.button('One step', function () { started = true; stop(); if (!climb) fresh(); explain(climb.step()); show(); });
        var runBtn = CH.button('Climb', function () { started = true; if (timer) stop(); else go(); }, 'is-primary');
        var newBtn = CH.button('Start again', function () { started = true; stop(); fresh(); line.textContent = 'A new random key: the text is nonsense, the score is low.'; show(); });
        row.appendChild(stepBtn); row.appendChild(runBtn); row.appendChild(newBtn);
        el.appendChild(row);
        var read = CH.el('p', { class: 'ch-climb-read', 'aria-live': 'polite' });
        el.appendChild(read);
        var svg = CH.svg('svg', { class: 'ch-climb-chart', viewBox: '0 0 320 90', role: 'img', 'aria-label': 'The best score so far, step by step' });
        el.appendChild(svg);
        var line = CH.el('p', { class: 'ch-help' });
        el.appendChild(line);

        /* the chart: -6 (nonsense) at the bottom, -4 (better than most English) at the top */
        function y(v) { return 80 - Math.max(0, Math.min(1, (v + 6) / 2)) * 72; }
        function chart() {
            CH.clear(svg);
            CH.svg('line', { x1: 0, x2: 320, y1: y(B.EN_FIT), y2: y(B.EN_FIT), class: 'ch-climb-en' }, svg);
            CH.svg('text', { x: 4, y: y(B.EN_FIT) - 4, class: 'ch-climb-lab', text: 'English, about ' + B.EN_FIT }, svg);
            CH.svg('text', { x: 4, y: 86, class: 'ch-climb-lab', text: 'nonsense, about ' + B.RANDOM_FIT }, svg);
            var pts = history.map(function (v, i) { return (history.length < 2 ? 0 : i / (history.length - 1) * 316 + 2).toFixed(1) + ',' + y(v).toFixed(1); });
            CH.svg('polyline', { points: pts.join(' '), class: 'ch-climb-line' }, svg);
        }
        function show() {
            read.textContent = 'Steps: ' + climb.steps + (climb.restarts ? ', fresh starts: ' + climb.restarts : '') + '. Score now ' + f2(climb.score) + ', best ' + f2(climb.best) + '.';
            chart();
            if (opt.onKey && started) opt.onKey(mapOf(timer ? climb.bestKey : climb.key));
        }
        function explain(info) {
            var a = signs[info.a], b = signs[info.b];
            if (info.restart) line.textContent = 'Nothing has helped for a long time: start again from a random key (the best key so far is kept).';
            else line.textContent = 'Swap the letters of ' + a + ' and ' + b + ': score ' + f2(info.before) + ' becomes ' + f2(info.after) + (info.kept ? (info.after > info.before ? '. Better: keep it.' : '. The same: keep it.') : '. Worse: undo it.');
        }
        function stop() { if (timer) { clearTimeout(timer); timer = null; } runBtn.textContent = 'Climb'; }
        function go() {
            if (!climb) fresh();
            runBtn.textContent = 'Pause';
            line.textContent = 'Climbing: thousands of swaps a second, each kept only if the text reads at least as well.';
            (function tick() {
                climb.run(500);
                history.push(climb.best);
                if (history.length > 160) history = history.filter(function (v, i) { return i % 2 === 0 || i === history.length - 1; });
                timer = setTimeout(tick, 30);
                show();
                if (opt.done && opt.done(mapOf(climb.bestKey))) { stop(); line.textContent = 'The best key reads: the climb is over.'; }
                else if (climb.steps >= 400000) { stop(); line.textContent = 'Stuck on a hill that is not the top. Press Start again, or fix the last letters by hand below.'; }
            })();
        }
        fresh();
        show();
        line.textContent = 'The climber has a random key to start with: its score is low.';
        return { stop: stop, map: function () { return mapOf(climb.bestKey); } };
    };
})();
