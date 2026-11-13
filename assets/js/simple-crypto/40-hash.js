/* Story 3, fingerprint (hash). Scenes:
   0 the cat puts a letter into the grinder: a row of six coloured blocks comes out (the fingerprint), up on the board;
   1 the cat sends the same letter to the dog, the dog grinds it: the same fingerprint, a tick;
   2 a letter with one word changed: a completely different fingerprint, a cross;
   3 the fox takes a fingerprint and runs the machine backwards: only crumbs come out. */
(function () {
    'use strict';
    var ROWS = [[16, 12, 20], [10, 22, 14], [24, 18], [12, 16]];
    var FP1 = ['#e5484d', '#f4c430', '#2f7fd0', '#22a06b', '#a855f7', '#f08a4b'];
    var FP2 = ['#14b8a6', '#ec4899', '#84cc16', '#4f46e5', '#f59e0b', '#7dd3fc'];
    var BW = 24, GAP = 4, SW = 6 * BW + 5 * GAP;                /* a strip: six blocks */
    var BOARD = { x: 400 - SW / 2, y: [38, 76, 114] };
    var CHUTE = { x: 476, y: 344 };
    /* when the machine runs: [from, to, direction] */
    var RUNS = [[3, 5, 1], [9.6, 11.4, 1], [17.6, 19.4, 1], [25.9, 28.2, -1]];

    function gearPath(r, teeth) {
        var d = '', n = teeth * 2;
        for (var i = 0; i < n; i++) {
            var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
            d += (i ? 'L' : 'M') + (rr * Math.cos(a0)).toFixed(2) + ' ' + (rr * Math.sin(a0)).toFixed(2) +
                'L' + (rr * Math.cos(a1)).toFixed(2) + ' ' + (rr * Math.sin(a1)).toFixed(2);
        }
        return d + 'Z';
    }

    SC.story({
        id: 'hash',
        scenes: [7, 7, 8, 10.4],
        poster: 21.8,
        build: function (svg, H) {
            var S = [0, 7, 14, 22];
            H.room(svg);
            var fox = H.fox(svg), cat = H.pet(svg, 'cat'), dog = H.pet(svg, 'dog');

            /* the board for the fingerprints */
            var board = H.el('g', { 'class': 'sc-board' }, svg);
            H.el('rect', { 'class': 'ol', x: BOARD.x - 18, y: 22, width: SW + 36, height: 132, rx: 8 }, board);
            BOARD.y.forEach(function (y) { H.el('rect', { 'class': 'slot', x: BOARD.x, y: y, width: SW, height: BW, rx: 4 }, board); });

            /* strips come out of the chute: while they are in it, only the part outside the machine shows */
            var defs = H.el('defs', {}, svg), clip = H.el('clipPath', { id: 'sc-chute-clip' }, defs);
            H.el('rect', { x: CHUTE.x + 8, y: 0, width: 400, height: 450 }, clip);
            var strips = H.el('g', {}, svg);
            function strip(colours) {
                var w = H.el('g', {}, strips);
                var g = H.el('g', { 'class': 'sc-strip' }, w);
                g.wrap = w;
                colours.forEach(function (c, i) { H.el('rect', { 'class': 'ol', x: i * (BW + GAP), y: 0, width: BW, height: BW, rx: 4, fill: c }, g); });
                return g;
            }
            var s1 = strip(FP1), s2 = strip(FP1), s3 = strip(FP2), sF = strip(FP1);
            var LA = H.letter(svg, ROWS), LB = H.letter(svg, ROWS), LC = H.letter(svg, ROWS);
            var ring = H.el('ellipse', { 'class': 'sc-ring', cx: -8, cy: -13, rx: 15, ry: 9 }, LC.g);

            /* the machine: body, funnel, a window with two gears, a crank, lights and the chute */
            var mach = H.el('g', { 'class': 'sc-machine' }, svg);
            H.el('path', { 'class': 'm-funnel ol', d: 'M352 166h96l-26 54h-44z' }, mach);
            H.el('rect', { 'class': 'm-chute ol', x: 462, y: 332, width: 22, height: 26, rx: 3 }, mach);
            H.el('rect', { 'class': 'm-body ol', x: 330, y: 218, width: 140, height: 154, rx: 12 }, mach);
            H.el('circle', { 'class': 'm-window ol', cx: 400, cy: 290, r: 36 }, mach);
            var g1 = H.el('path', { 'class': 'm-gear ol', d: gearPath(17, 9) }, mach);
            var g2 = H.el('path', { 'class': 'm-gear2 ol', d: gearPath(12, 7) }, mach);
            var lights = [H.el('circle', { 'class': 'm-light ol', cx: 360, cy: 238, r: 6 }, mach), H.el('circle', { 'class': 'm-light ol', cx: 440, cy: 238, r: 6 }, mach)];
            var crank = H.el('g', {}, mach);
            H.el('path', { 'class': 'm-arm', d: 'M0 0h-22' }, crank);
            H.el('circle', { 'class': 'm-knob ol', cx: -22, cy: 0, r: 6 }, crank);
            H.el('circle', { 'class': 'm-hub ol', cx: 330, cy: 300, r: 7 }, mach);

            svg.appendChild(strips);
            var tick = H.tick(svg), cross = H.cross(svg), wonder = H.wonder(svg);
            var crumbs = [], rnd = 7;
            function r01() { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; }
            for (var i = 0; i < 26; i++) {
                var c = H.el('path', { 'class': 'sc-crumb', d: 'M0-4l4 1 1 4-4 2-4-2z', fill: i % 3 ? FP1[i % 6] : '#fff' }, svg);
                crumbs.push({ n: c, vx: (r01() - 0.5) * 300, vy: -160 - r01() * 160, d: r01() * 0.6, rot: r01() * 360, fx: 330 + r01() * 150 });
            }

            var CAT = 105, DOG = 695, FLOOR = 384, DESKC = { x: 246, y: 300 }, DESKD = { x: 556, y: 300 }, MOUTH = { x: 400, y: 182 };

            function run(t) {
                var a = 0;
                RUNS.forEach(function (r) { a += H.lin(t, r[0], r[1]) * (r[1] - r[0]) * r[2]; });
                return a;
            }
            function working(t) { return RUNS.some(function (r) { return t > r[0] && t < r[1]; }); }
            function shake(t) { var s = 0; RUNS.forEach(function (r) { s += H.shake(t, r[0], r[1], 1.6); }); return s; }
            /* a letter: pops at its desk, words appear, then into the funnel */
            function feed(L, t, a, desk, into, from) {
                var k = H.seg(t, into, into + 1);
                var x0 = from ? from.x : desk.x, y0 = from ? from.y : desk.y;
                var q = H.arc(desk.x, desk.y, MOUTH.x, MOUTH.y, 90, k);
                H.at(L.g, q.x, q.y, 1.3 * H.pop(t, a, a + 0.5) * (1 - 0.6 * k));
                H.show(L.g, t > a && t < into + 1 ? 1 : 0);
                L.words.forEach(function (w, i) { H.show(w, H.seg(t, a + 0.2 + i * 0.05, a + 0.35 + i * 0.05)); });
                return x0 + y0;
            }
            /* a strip comes out of the chute (from behind the machine), then flies up to its row */
            function out(sN, t, a, row) {
                var e = H.seg(t, a, a + 0.8), f = H.seg(t, a + 1, a + 1.8);
                var x = H.lerp(CHUTE.x - SW * 0.7, CHUTE.x + 6, e), y = CHUTE.y - BW * 0.35;
                var q = H.arc(x, y, BOARD.x, BOARD.y[row], 60, f);
                H.at(sN, q.x, q.y, H.lerp(0.7, 1, f));
                H.show(sN, t > a ? 1 : 0);
                inChute(sN, f <= 0);
            }

            function inChute(sN, on) {
                if (on) sN.wrap.setAttribute('clip-path', 'url(#sc-chute-clip)'); else sN.wrap.removeAttribute('clip-path');
            }

            return function (t) {
                var inK = H.seg(t, 0, 0.8);
                cat.place(CAT, 372, 1.6); dog.place(DOG, 372, 1.6, -1);
                H.show(cat.g, inK); H.show(dog.g, inK);
                H.show(board, inK); H.show(mach, inK);

                /* the machine at work */
                var a = run(t), sh = shake(t);
                mach.setAttribute('transform', 'translate(' + sh.toFixed(2) + ' 0)');
                g1.setAttribute('transform', 'translate(388 282) rotate(' + (a * 220).toFixed(1) + ')');
                g2.setAttribute('transform', 'translate(414 304) rotate(' + (-a * 310).toFixed(1) + ')');
                crank.setAttribute('transform', 'translate(330 300) rotate(' + (a * 360).toFixed(1) + ')');
                var on = working(t), blink = Math.floor(t * 6) % 2;
                lights[0].setAttribute('fill', on ? (blink ? '#4ade80' : '#facc15') : '#cbd5e1');
                lights[1].setAttribute('fill', on ? (blink ? '#facc15' : '#4ade80') : '#cbd5e1');

                /* ---- 0: the cat's letter ---- */
                feed(LA, t, 0.8, DESKC, 2);
                cat.arm(-40 * H.seg(t, 1.8, 2.2) * (1 - H.seg(t, 2.6, 3)) - 40 * H.seg(t, S[2] + 2.3, S[2] + 2.7) * (1 - H.seg(t, S[2] + 3.1, S[2] + 3.5)));
                out(s1, t, 4.6, 0);

                /* ---- 1: the same letter to the dog, the dog grinds it ---- */
                var a1 = S[1], send = H.seg(t, a1 + 0.3, a1 + 1.4);
                if (t < a1 + 1.5) {
                    var q = H.arc(DESKC.x, DESKC.y, DESKD.x, DESKD.y, 140, send);
                    H.at(LB.g, q.x, q.y, 1.3 * H.pop(t, a1, a1 + 0.3));
                    H.show(LB.g, t > a1 ? 1 : 0);
                    LB.words.forEach(function (w) { H.show(w, 1); });
                } else feed(LB, t, a1 - 1, DESKD, a1 + 1.6);
                dog.arm(-40 * H.seg(t, a1 + 1.4, a1 + 1.8) * (1 - H.seg(t, a1 + 2.2, a1 + 2.6)));
                out(s2, t, a1 + 4.1, 1);
                H.at(tick, BOARD.x + SW + 46, BOARD.y[1] + BW / 2, 0.9 * H.pop(t, a1 + 5.9, a1 + 6.3));
                H.show(tick, t > a1 + 5.9 ? 1 : 0);

                /* ---- 2: one word changed ---- */
                var a2 = S[2];
                feed(LC, t, a2 + 0.2, DESKC, a2 + 2.6);
                var w = LC.words[4], ch = H.seg(t, a2 + 1, a2 + 1.4);
                w.setAttribute('width', H.lerp(22, 11, ch)); w.setAttribute('fill', H.mix('#8b95a5', '#e5484d', ch));
                H.show(ring, ch * (1 - H.seg(t, a2 + 2.6, a2 + 2.9)));
                ring.setAttribute('stroke-width', (2.5 + Math.max(0, Math.sin((t - a2) * 9)) * 1.5 * ch).toFixed(2));
                out(s3, t, a2 + 5.2, 2);
                H.at(cross, BOARD.x + SW + 46, BOARD.y[2] + BW / 2, 0.9 * H.pop(t, a2 + 7.1, a2 + 7.5));
                H.show(cross, t > a2 + 7.1 ? 1 : 0);

                /* ---- 3: the fox runs it backwards ---- */
                var a3 = S[3], come = H.seg(t, a3 + 0.2, a3 + 1.4);
                fox.place(H.lerp(400, 566, come), 372, 1.15, -1);
                H.show(fox.g, t > a3 + 0.1 ? 1 : 0);
                var take = H.seg(t, a3 + 1.6, a3 + 2.6), push = H.seg(t, a3 + 2.8, a3 + 3.8);
                var tq = H.arc(BOARD.x, BOARD.y[0], CHUTE.x + 30, CHUTE.y - 40, 40, take);
                var px = H.lerp(tq.x, CHUTE.x - SW * 0.8, push), py = H.lerp(tq.y, CHUTE.y - BW * 0.35, push);
                H.at(sF, px, py, H.lerp(1, 0.7, take));
                H.show(sF, t > a3 + 1.6 && push < 1 ? 1 : 0);
                inChute(sF, push > 0.5);
                fox.arm(-50 * H.seg(t, a3 + 2.6, a3 + 2.9) * (1 - H.seg(t, a3 + 3.8, a3 + 4.2)));
                crumbs.forEach(function (c) {
                    var dt = t - (a3 + 5.6 + c.d);
                    if (dt <= 0) { H.show(c.n, 0); return; }
                    var x = 400 + c.vx * dt, y = 186 + c.vy * dt + 420 * dt * dt;
                    var land = y > FLOOR + 6;
                    if (land) { y = FLOOR + 6 + (c.fx % 10); x = 400 + c.vx * ((-c.vy + Math.sqrt(c.vy * c.vy + 4 * 420 * (FLOOR + 6 - 186))) / 840); }
                    H.at(c.n, x, y, 2, land ? c.rot : c.rot + dt * 400);
                    H.show(c.n, 1);
                });
                H.at(wonder, 540, 270, H.pop(t, a3 + 7.6, a3 + 8.1) * 1.4);
                H.show(wonder, t > a3 + 7.6 ? 1 : 0);

                /* faces */
                var same = t > a1 + 6 && t < S[2];
                cat.mood(same ? 'happy' : '');
                dog.mood(same ? 'happy' : '');
                fox.mood(t > a3 + 0.4 && t < a3 + 6.4 ? 'happy' : t > a3 + 7 ? 'sad' : '');
                dog.tilt(t > a2 + 7 && t < a3 ? 10 : 0);
            };
        }
    });
})();
