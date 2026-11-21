/* Story 4, secret sheets (the one-time pad, and why a key must never be used twice). Pictures are 10 x 10 squares;
   the key is a see-through sheet of random blue dots, and laying it on a picture flips every square under a dot
   (white to dark, dark to white): that is XOR. Scenes:
   0 one key sheet, two copies: one for the cat, one for the dog (the fox gets none);
   1 the cat's picture (a fish); the key slides over it and the squares under its dots flip: noise;
   2 the noise travels to the dog, the fox copies it; the fox's bubble tries picture after picture: any is possible;
   3 the dog lays its key on the noise: the same squares flip back, the fish;
   4 the cat sends a heart with the same key ("same key again"); the fox copies that noise too;
   5 the fox lays its two copies on each other: the key cancels out, and the fish and the heart show together. */
(function () {
    'use strict';
    var N = 10, C = 13;                              /* squares per side, size of a square */
    function pic(rows) { var b = []; rows.forEach(function (r) { for (var i = 0; i < N; i++) b.push(r.charAt(i) === 'X'); }); return b; }
    /* the fish keeps to the top half and the heart to the bottom half, so that both stay easy to see when the fox
       lays them on each other (in the story) */
    var FISH_S = pic(['..........', '...XXXX..X', '.XXXXX.XXX', '.XXXXXXXXX', '...XXXX..X', '..........', '..........', '..........', '..........', '..........']);
    var HEART_S = pic(['..........', '..........', '..........', '..........', '..........', '.XXX..XXX.', '.XXXXXXXX.', '..XXXXXX..', '...XXXX...', '....XX....']);
    var HOUSE = pic(['..........', '....XX....', '...XXXX...', '..XXXXXX..', '.XXXXXXXX.', '..X....X..', '..X.XX.X..', '..X.XX.X..', '..XXXXXX..', '..........']);
    var CATP = pic(['..........', '.X......X.', '.XX....XX.', '.XXXXXXXX.', '.X.XXXX.X.', '.XXXXXXXX.', '.XXX..XXX.', '..XXXXXX..', '...XXXX...', '..........']);
    var KEY = (function () {
        var s = 11, b = [];
        for (var i = 0; i < N * N; i++) { s = (s * 1103515245 + 12345) % 2147483648; b.push((s >> 16) % 2 === 1); }
        return b;
    })();
    function xor(a, b) { return a.map(function (v, i) { return v !== b[i]; }); }
    var C1 = xor(FISH_S, KEY), C2 = xor(HEART_S, KEY);

    /* a sheet of squares: paper with N x N cells, centred on (0, 0); sheet.paint(bits) */
    function sheet(H, parent, cls) {
        var g = H.el('g', { 'class': 'sc-grid ' + (cls || '') }, parent), half = N * C / 2, cells = [];
        H.el('rect', { 'class': 'grid-paper ol', x: -half - 5, y: -half - 5, width: N * C + 10, height: N * C + 10, rx: 4 }, g);
        for (var i = 0; i < N * N; i++) {
            cells.push(H.el('rect', { x: -half + (i % N) * C + 0.5, y: -half + Math.floor(i / N) * C + 0.5, width: C - 1, height: C - 1, rx: 1.5 }, g));
        }
        var cur = [];
        g.paint = function (bits) {
            bits.forEach(function (v, i) { if (cur[i] !== v) { cur[i] = v; cells[i].setAttribute('class', v ? 'on' : ''); } });
        };
        return g;
    }
    /* the key: a see-through blue sheet with a dot on each 1 */
    function keySheet(H, parent) {
        var g = H.el('g', { 'class': 'sc-keysheet' }, parent), half = N * C / 2;
        H.el('rect', { 'class': 'ks-film', x: -half - 5, y: -half - 5, width: N * C + 10, height: N * C + 10, rx: 4 }, g);
        KEY.forEach(function (v, i) { if (v) H.el('circle', { cx: -half + (i % N) * C + C / 2, cy: -half + Math.floor(i / N) * C + C / 2, r: 3.6 }, g); });
        return g;
    }
    /* which columns the sweep from a to b has passed at t */
    function swept(t, a, b) { var k = (t - a) / (b - a); return function (i) { return k * N > (i % N) + 0.5; }; }
    /* bits xor (mask where swept) */
    function flip(bits, mask, sw) { return bits.map(function (v, i) { return mask[i] && sw(i) ? !v : v; }); }

    SC.story({
        id: 'one-time-pad',
        scenes: [5, 7, 7.5, 5.5, 7.5, 8],
        poster: 39,
        build: function (svg, H) {
            var S = [0, 5, 12, 19.5, 25, 32.5];
            H.room(svg);
            var fox = H.fox(svg), cat = H.pet(svg, 'cat'), dog = H.pet(svg, 'dog');
            var CATS = { x: 262, y: 196 }, DOGS = { x: 538, y: 196 }, FOXS = { x: 400, y: 100 };
            var KA = { x: 222, y: 342, s: 0.42 }, KB = { x: 578, y: 342, s: 0.42 };
            var F1 = { x: 368, y: 404, s: 0.36 }, F2 = { x: 432, y: 404, s: 0.36 };

            var m1 = sheet(H, svg), m2 = sheet(H, svg), f1 = sheet(H, svg), f2 = sheet(H, svg);
            var kA = keySheet(H, svg), kB = keySheet(H, svg);
            /* the fox's bubble, trying pictures */
            var bub = H.el('g', { 'class': 'sc-bubble' }, svg);
            H.el('circle', { cx: 398, cy: 236, r: 5 }, bub); H.el('circle', { cx: 402, cy: 214, r: 7 }, bub);
            H.el('ellipse', { cx: 386, cy: 112, rx: 80, ry: 84 }, bub);
            var guess = sheet(H, bub);
            var q = H.label(bub, '?', 446, 66, 'sc-q');
            var lKey = H.label(svg, 'key: random dots', 400, 84);
            var lCopy = H.label(svg, 'one copy each', 400, 130, 'sc-small');
            var lMsg = H.label(svg, 'message', CATS.x, 112, 'sc-small');
            var lSent = H.label(svg, 'sent: just noise', 478, 112, 'sc-small', 'start');
            var lFox = H.label(svg, 'the fox’s copy', 400, 446, 'sc-small sc-fox-label');
            var lSame = H.label(svg, 'same key again!', CATS.x, 112, 'sc-warn');
            var lCancel = H.label(svg, 'the key cancels out', 400, 30, 'sc-warn');
            var hearts = [H.heart(svg), H.heart(svg)];

            function at(n, p, s) { H.at(n, p.x, p.y, s == null ? 1 : s); }
            function move(n, a, b, k, h) { var p = H.arc(a.x, a.y, b.x, b.y, h || 60, k); H.at(n, p.x, p.y, H.lerp(a.s || 1, b.s || 1, k)); }

            return function (t) {
                var inK = H.seg(t, 0, 0.8);
                cat.place(105, 372, 1.6); dog.place(695, 372, 1.6, -1); fox.place(400, 372, 1.25);
                H.show(cat.g, inK); H.show(dog.g, inK); H.show(fox.g, inK);
                var a1 = S[1], a2 = S[2], a3 = S[3], a4 = S[4], a5 = S[5];

                /* ---- the two keys: made together, then each goes to its owner, and comes over a sheet when used ---- */
                var mid = { x: 400, y: 186, s: 1 };
                function keyAt(n, rest, uses) {
                    var split = H.seg(t, 2.6, 3.6);
                    if (t < 2.6) { at(n, mid, H.pop(t, 0.8, 1.4)); return; }
                    if (t < a1) { move(n, mid, rest, split, 50); return; }
                    var p = rest;
                    for (var i = 0; i < uses.length; i++) {
                        var u = uses[i], on = H.seg(t, u[0], u[0] + 0.8), off = H.seg(t, u[1], u[1] + 0.7);
                        if (t >= u[0] && t < u[1] + 0.7) { move(n, rest, u[2], on * (1 - off), 40); return; }
                    }
                    at(n, p, p.s);
                }
                keyAt(kA, KA, [[a1 + 1.6, a1 + 4.6, { x: CATS.x, y: CATS.y, s: 1 }], [a4 + 1.4, a4 + 4, { x: CATS.x, y: CATS.y, s: 1 }]]);
                keyAt(kB, KB, [[a3 + 0.3, a3 + 3.2, { x: DOGS.x, y: DOGS.y, s: 1 }]]);
                H.show(kA, t > 0.8 ? 1 : 0); H.show(kB, t > 0.8 ? 1 : 0);
                H.show(lKey, H.seg(t, 1.3, 1.7) * (1 - H.seg(t, 2.6, 3)));
                H.show(lCopy, H.seg(t, 3.6, 4) * (1 - H.seg(t, a1, a1 + 0.4)));

                /* ---- 1 to 3: the fish ---- */
                var sw1 = swept(t, a1 + 2.6, a1 + 4.2), sw3 = swept(t, a3 + 1.3, a3 + 2.9);
                m1.paint(flip(flip(FISH_S, KEY, sw1), KEY, sw3));
                var go = H.seg(t, a2 + 0.2, a2 + 1.4);
                if (t < a2 + 0.2) at(m1, CATS, H.pop(t, a1 + 0.2, a1 + 0.7));
                else move(m1, CATS, DOGS, go, 70);
                H.show(m1, t > a1 + 0.2 && t < a4 + 0.4 ? 1 - H.seg(t, a4, a4 + 0.4) : 0);
                H.show(lMsg, H.seg(t, a1 + 0.6, a1 + 1) * (1 - H.seg(t, a1 + 2.4, a1 + 2.7)) + H.seg(t, a4 + 0.6, a4 + 1) * (1 - H.seg(t, a4 + 1.2, a4 + 1.5)));
                H.show(lSent, H.seg(t, a2 + 1.4, a2 + 1.8) * (1 - H.seg(t, a3 + 1.2, a3 + 1.5)));

                /* ---- 2: the fox's copy, and its bubble ---- */
                f1.paint(flip(C1, C2, swept(t, a5 + 2.6, a5 + 4.2)));
                var cp1 = H.seg(t, a2 + 0.9, a2 + 1.9), mid1 = H.arc(CATS.x, CATS.y, DOGS.x, DOGS.y, 70, 0.55);
                if (t < a5 + 0.3) move(f1, { x: mid1.x, y: mid1.y, s: 1 }, F1, cp1, 30);
                else move(f1, F1, FOXS, H.seg(t, a5 + 0.3, a5 + 1.3), 30);
                H.show(f1, t > a2 + 0.85 ? 1 : 0);
                H.show(lFox, H.seg(t, a2 + 1.9, a2 + 2.3) * (1 - H.seg(t, a3, a3 + 0.4)));
                var bk = H.seg(t, a2 + 2.3, a2 + 2.7) * (1 - H.seg(t, a3, a3 + 0.4));
                H.show(bub, bk);
                var gi = Math.floor(Math.max(0, t - a2 - 2.5) / 0.9) % 4;
                guess.paint([HOUSE, HEART_S, CATP, FISH_S][gi]);
                guess.setAttribute('transform', 'translate(380 116) scale(0.55)');
                H.show(q, 1);

                /* ---- 4: the heart, with the same key ---- */
                var sw4 = swept(t, a4 + 2.4, a4 + 3.8);
                m2.paint(flip(HEART_S, KEY, sw4));
                if (t < a4 + 4.8) at(m2, CATS, H.pop(t, a4 + 0.3, a4 + 0.8));
                else move(m2, CATS, DOGS, H.seg(t, a4 + 4.8, a4 + 5.8), 70);
                H.show(m2, t > a4 + 0.3 ? 1 : 0);
                H.show(lSame, H.seg(t, a4 + 1.6, a4 + 2) * (1 - H.seg(t, a5, a5 + 0.4)));
                f2.paint(C2);
                var mid2 = H.arc(CATS.x, CATS.y, DOGS.x, DOGS.y, 70, 0.55);
                if (t < a5 + 1.5) move(f2, { x: mid2.x, y: mid2.y, s: 1 }, F2, H.seg(t, a4 + 5.3, a4 + 6.3), 30);
                else move(f2, F2, FOXS, H.seg(t, a5 + 1.5, a5 + 2.4), 50);
                H.show(f2, t > a4 + 5.25 && t < a5 + 2.6 ? 1 - H.seg(t, a5 + 2.3, a5 + 2.6) : 0);

                /* ---- 5: the fox's two copies on each other ---- */
                H.show(lCancel, H.seg(t, a5 + 4.4, a5 + 4.8));

                /* faces */
                var dogHappy = t > a3 + 3 && t < a4;
                var foxWins = t > a5 + 4.4;
                cat.mood(dogHappy ? 'happy' : foxWins ? 'sad' : '');
                dog.mood(dogHappy ? 'happy' : foxWins ? 'sad' : '');
                fox.mood(foxWins || (t > a2 + 1 && t < a2 + 2.3) ? 'happy' : t > a2 + 4 && t < a3 + 0.5 ? 'sad' : '');
                fox.tilt(-12 * (H.seg(t, a2 + 2.2, a2 + 2.6) - H.seg(t, a3, a3 + 0.4)) - 12 * (H.seg(t, a5 + 0.3, a5 + 0.8)));
                cat.arm(-40 * (H.seg(t, a1 + 1.4, a1 + 1.8) - H.seg(t, a1 + 4.6, a1 + 5)) - 40 * (H.seg(t, a4 + 1.2, a4 + 1.6) - H.seg(t, a4 + 4, a4 + 4.4)));
                dog.arm(-40 * (H.seg(t, a3 + 0.1, a3 + 0.5) - H.seg(t, a3 + 3.2, a3 + 3.6)));
                var hk = H.lin(t, a3 + 3.2, a3 + 4.6);
                hearts.forEach(function (n, i) {
                    H.at(n, DOGS.x + (i ? 50 : -50) * hk, 90 - 40 * hk, 0.8);
                    H.show(n, hk > 0 && hk < 1 ? 1 - hk * hk : 0);
                });
            };
        }
    });
    SC.otp = { N: N, FISH: FISH_S, HEART: HEART_S, HOUSE: HOUSE, CAT: CATP, xor: xor };
})();
