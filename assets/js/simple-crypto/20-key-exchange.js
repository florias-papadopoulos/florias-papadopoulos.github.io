/* Story 1, key exchange (Diffie-Hellman as paint mixing). Scenes:
   0 everyone gets the same public yellow (the fox too);
   1 the cat takes a secret pink, the dog a secret blue; the fox has no idea what they are;
   2 each pours its secret into its yellow: orange (cat), green (dog);
   3 they swap the mixes in the open, and the fox catches a copy of each;
   4 each pours its own secret into the mix it got: both end with the same plum;
   5 the fox mixes its copies: a muddy khaki, not the plum;
   6 the plum becomes a key and a padlock: the cat locks a heart in a box, the fox's khaki key does not open it, the
     dog's plum key does. */
(function () {
    'use strict';
    var Y = '#f4c430', CS = '#e0457b', DS = '#2f7fd0', CM = '#f08a4b', DM = '#5aae5c', F = '#8a4f7d', FX = '#a8954a';

    function key(H, parent, colour) {
        var g = H.el('g', { 'class': 'sc-key' }, parent);
        H.el('path', { 'class': 'ol', fill: colour, d: 'M-6-3h28v6h-3v5h-4V3h-3v4h-4V3H-6z' }, g);
        H.el('circle', { 'class': 'ol', fill: colour, cx: -13, cy: 0, r: 9 }, g);
        H.el('circle', { 'class': 'sc-hole', cx: -15, cy: 0, r: 3 }, g);
        return g;
    }
    function padlock(H, parent, colour) {
        var g = H.el('g', { 'class': 'sc-lock' }, parent);
        var shackle = H.el('path', { 'class': 'sc-shackle', d: 'M-8-8v-8a8 8 0 0 1 16 0v8' }, g);
        H.el('rect', { 'class': 'ol', fill: colour, x: -13, y: -10, width: 26, height: 21, rx: 4 }, g);
        H.el('path', { 'class': 'sc-hole', d: 'M0-4a2.6 2.6 0 0 1 1.4 4.8L2.4 5h-4.8l1-4.2A2.6 2.6 0 0 1 0-4z' }, g);
        return { g: g, shackle: shackle };
    }

    SC.story({
        id: 'key-exchange',
        scenes: [3.2, 3.6, 4, 5.4, 4.2, 4.4, 12],
        poster: 20.9,
        keys: [null, 6.5],                  /* the stills with reduced motion (10-player.js) */
        build: function (svg, H) {
            var S = [0, 3.2, 6.8, 10.8, 16.2, 20.4, 24.8];
            H.room(svg);
            var fox = H.fox(svg), cat = H.pet(svg, 'cat'), dog = H.pet(svg, 'dog');
            var wonder = H.wonder(svg);
            /* the pots: public yellow for each, the secrets, the fox's three copies */
            var big = H.pot(svg, Y);
            var cSec = H.pot(svg, CS), dSec = H.pot(svg, DS);
            var potC = H.pot(svg, Y), potD = H.pot(svg, Y);          /* the cat's and the dog's own yellow */
            var fY = H.pot(svg, Y), fC = H.pot(svg, CM), fD = H.pot(svg, DM);   /* the fox's copies */
            var stC = H.stream(svg), stD = H.stream(svg), stF = H.stream(svg);
            var fCross = H.cross(svg);
            /* the box with a heart, the padlock and the three keys */
            var heart = H.heart(svg);
            var box = H.el('g', { 'class': 'sc-box' }, svg);
            H.el('rect', { 'class': 'box-body ol', x: -36, y: -46, width: 72, height: 46, rx: 4 }, box);
            H.el('path', { 'class': 'box-band', d: 'M-36-30h72' }, box);
            var lid = H.el('g', {}, box);
            H.el('rect', { 'class': 'box-lid ol', x: -38, y: -60, width: 76, height: 15, rx: 4 }, lid);
            var lock = padlock(H, box, F);
            var kC = key(H, svg, F), kD = key(H, svg, F), kF = key(H, svg, FX);
            var lockCross = H.cross(svg);
            var hearts = H.el('g', {}, svg);
            var hs = [H.heart(hearts), H.heart(hearts), H.heart(hearts)];

            var CAT = 105, DOG = 695, FOXX = 400, FLOOR = 384;
            var cP = 262, dP = 538, cS = 190, dS = 610;              /* where the pots stand */
            var slots = [352, 400, 448];

            /* the secret pot at (x, FLOOR) lifts, pours into the pot at px, and goes back; returns how far the pour is */
            function pour(potObj, st, x, px, dir, t, a, colourFrom, colourTo, target) {
                var up = H.seg(t, a, a + 0.9), down = H.seg(t, a + 2.4, a + 3.2), k = up * (1 - down);
                var ax = px - 40 * dir, ay = 300;
                H.at(potObj.g, H.lerp(x, ax, k), H.lerp(FLOOR, ay, k) - 20 * Math.sin(Math.PI * k), 1, 75 * dir * k);
                var p = H.lin(t, a + 0.9, a + 2.3);
                var on = t > a + 0.9 && t < a + 2.4;
                st(px, 312, 346, H.seg(t, a + 0.9, a + 1.2), colourFrom, on ? 1 : 0);
                if (target) target.paint(H.mix(colourTo[0], colourTo[1], p));
                return p;
            }

            return function (t) {
                /* ---- the cast ---- */
                var inK = H.seg(t, 0, 0.8);
                cat.place(CAT, 372, 1.6); dog.place(DOG, 372, 1.6, -1); fox.place(FOXX, 372, 1.25);
                H.show(cat.g, inK); H.show(dog.g, inK); H.show(fox.g, inK);
                var happy = (t > S[4] + 3.4 && t < S[5] + 0.5) || t > S[6] + 11;
                cat.mood(happy ? 'happy' : ''); dog.mood(happy ? 'happy' : '');
                var foxSad = t > S[5] + 3.2 && t < S[6] + 1.6 || t > S[6] + 7.6;
                fox.mood(foxSad ? 'sad' : (t > S[3] + 2.6 && t < S[4] + 1) || (t > S[6] + 5 && t < S[6] + 7.2) ? 'happy' : '');
                /* the fox looks up while pots fly over it */
                fox.tilt(-14 * (H.seg(t, S[3] + 0.3, S[3] + 0.8) - H.seg(t, S[3] + 2.6, S[3] + 3.2)) - 12 * (H.seg(t, S[6] + 4.6, S[6] + 5.1) - H.seg(t, S[6] + 8.4, S[6] + 8.9)));
                cat.arm(-40 * (H.seg(t, S[2] + 0.1, S[2] + 0.6) - H.seg(t, S[2] + 2.6, S[2] + 3.1)) - 40 * (H.seg(t, S[4] + 0.1, S[4] + 0.6) - H.seg(t, S[4] + 2.6, S[4] + 3.1)));
                dog.arm(-40 * (H.seg(t, S[2] + 0.1, S[2] + 0.6) - H.seg(t, S[2] + 2.6, S[2] + 3.1)) - 40 * (H.seg(t, S[4] + 0.1, S[4] + 0.6) - H.seg(t, S[4] + 2.6, S[4] + 3.1)));

                /* ---- 0: the public yellow, a copy for everyone ---- */
                var bk = H.pop(t, 0.8, 1.5), split = H.seg(t, 1.8, 3.0);
                H.at(big.g, 400, 190, 1.3 * bk); H.show(big.g, t < 1.9 ? (bk > 0 ? 1 : 0) : 0);
                function fly(p, x1, y1, s1, h) { var q = H.arc(400, 190, x1, y1, h, split); H.at(p.g, q.x, q.y, H.lerp(1.3, s1, split)); H.show(p.g, t >= 1.8 ? 1 : 0); }
                /* ---- 3: the swap, the cat's mix to the dog and the dog's to the cat ---- */
                var sw = H.seg(t, S[3] + 0.3, S[3] + 2.6);
                if (t < S[3]) { fly(potC, cP, FLOOR, 1, 40); fly(potD, dP, FLOOR, 1, 40); }
                else {
                    var a = H.arc(cP, FLOOR, dP, FLOOR, 200, sw), b = H.arc(dP, FLOOR, cP, FLOOR, 130, sw);
                    H.at(potC.g, a.x, a.y, 1); H.at(potD.g, b.x, b.y, 1); H.show(potC.g); H.show(potD.g);
                }
                fly(fY, slots[0], FLOOR + 22, 0.72, 20);
                /* the fox's copies split off at the top of the swap and fall to its feet */
                var cp = H.seg(t, S[3] + 1.5, S[3] + 2.4);
                var mc = H.arc(cP, FLOOR, dP, FLOOR, 200, 0.5), md = H.arc(dP, FLOOR, cP, FLOOR, 130, 0.5);
                H.at(fC.g, H.lerp(mc.x, slots[1], cp), H.lerp(mc.y, FLOOR + 22, cp * cp), H.lerp(1, 0.72, cp));
                H.show(fC.g, t > S[3] + 1.45 ? 1 : 0);

                /* ---- 1: the secrets ---- */
                H.at(cSec.g, cS, FLOOR, H.pop(t, S[1] + 0.1, S[1] + 0.8)); H.at(dSec.g, dS, FLOOR, H.pop(t, S[1] + 0.9, S[1] + 1.6));
                var secOut = 1 - H.seg(t, S[6], S[6] + 0.6);
                H.show(cSec.g, t > S[1] + 0.1 ? secOut : 0); H.show(dSec.g, t > S[1] + 0.9 ? secOut : 0);
                H.at(wonder, 378, 262, 1.6 * H.pop(t, S[1] + 1.8, S[1] + 2.3), 0, -1);
                H.show(wonder, t > S[1] + 1.8 && t < S[2] - 0.1 ? 1 : 0);

                /* ---- 2 and 4: pouring the secrets ---- */
                var potCc = Y, potDc = Y;
                if (t < S[4]) {
                    pour(cSec, stC, cS, cP, 1, t, S[2] + 0.2, CS, [Y, CM], potC);
                    pour(dSec, stD, dS, dP, -1, t, S[2] + 0.2, DS, [Y, DM], potD);
                    if (t < S[2] + 1.1) { potC.paint(Y); potD.paint(Y); }
                } else {
                    /* now the cat has the dog's green (at cP) and the dog the cat's orange (at dP) */
                    pour(cSec, stC, cS, cP, 1, t, S[4] + 0.2, CS, [DM, F], potD);
                    pour(dSec, stD, dS, dP, -1, t, S[4] + 0.2, DS, [CM, F], potC);
                }
                H.at(fD.g, H.lerp(md.x, slots[2], cp), H.lerp(md.y, FLOOR + 22, cp * cp), H.lerp(1, 0.72, cp));
                H.show(fD.g, t > S[3] + 1.45 ? 1 : 0);

                /* ---- 5: the fox mixes its copies: khaki ---- */
                if (t >= S[5]) {
                    var a5 = S[5] + 0.2, up = H.seg(t, a5, a5 + 0.8), down = H.seg(t, a5 + 2.3, a5 + 3), k = up * (1 - down);
                    H.at(fD.g, H.lerp(slots[2], slots[1] + 28, k), H.lerp(FLOOR + 22, 352, k) - 14 * Math.sin(Math.PI * k), 0.72, -75 * k);
                    var p = H.lin(t, a5 + 0.8, a5 + 2.2);
                    stF(slots[1], 360, 380, H.seg(t, a5 + 0.8, a5 + 1.1), DM, t > a5 + 0.8 && t < a5 + 2.3 ? 1 : 0);
                    fC.paint(H.mix(CM, FX, p));
                } else { stF(0, 0, 0, 0, DM, 0); fC.paint(CM); }
                H.at(fCross, slots[1], FLOOR + 4, H.pop(t, S[5] + 3.2, S[5] + 3.7) * 0.8);
                H.show(fCross, t > S[5] + 3.2 && t < S[6] + 1.6 ? 1 : 0);

                /* ---- 6: the colour as a key: lock the heart in a box ---- */
                var toKey = H.seg(t, S[6], S[6] + 0.7);
                if (t >= S[6]) {
                    H.show(potD.g, 1 - toKey); H.show(potC.g, 1 - toKey);
                    H.show(fC.g, 1 - toKey); H.show(fY.g, 1 - toKey); H.show(fD.g, 1 - toKey);
                }
                var B0 = S[6] + 1;
                /* the box comes, the heart drops in, the lid shuts, the padlock clicks on */
                var bx = 200, by = FLOOR, boxS = H.pop(t, B0, B0 + 0.6);
                var go1 = H.seg(t, B0 + 3.2, B0 + 4.3), go2 = H.seg(t, B0 + 6.9, B0 + 7.9);
                if (go1 > 0 && go2 <= 0) { var q1 = H.arc(200, FLOOR, 400, 240, 60, go1); bx = q1.x; by = q1.y; }
                if (go2 > 0) { var q2 = H.arc(400, 240, 615, FLOOR, 40, go2); bx = q2.x; by = q2.y; }
                H.at(box, bx, by, 1.2 * boxS); H.show(box, t > B0 ? 1 : 0);
                var lidOpen = (1 - H.seg(t, B0 + 1.6, B0 + 2.1)) + H.seg(t, B0 + 9.3, B0 + 9.8);
                if (t < B0 + 0.6) lidOpen = 1;
                lid.setAttribute('transform', 'rotate(' + (-105 * Math.min(1, lidOpen)) + ' -38 -46)');
                var hIn = H.seg(t, B0 + 0.6, B0 + 1.5), hOut = H.seg(t, B0 + 9.6, B0 + 10.4);
                H.at(heart, bx, by - 80 + 60 * hIn - 70 * hOut, 1.3 * H.pop(t, B0 + 0.4, B0 + 0.9));
                H.show(heart, t > B0 + 0.4 && (t < B0 + 1.6 || t > B0 + 9.5) ? 1 : 0);
                H.at(lock.g, 0, -24, H.pop(t, B0 + 2.1, B0 + 2.6));
                H.show(lock.g, t > B0 + 2.1 && t < B0 + 9.6 ? 1 : 0);
                var unlock = H.seg(t, B0 + 8.8, B0 + 9.2);
                lock.shackle.setAttribute('transform', 'translate(0 ' + (-7 * unlock) + ')');
                /* the keys: the cat's and the dog's plum, the fox's khaki */
                var kS = H.seg(t, S[6], S[6] + 0.7);
                var lockX = bx, lockY = by - 29 * boxS;
                H.at(kC, cP, FLOOR - 16, 1.5 * kS); H.show(kC, t > S[6] ? 1 : 0);
                /* the fox tries its key on the box over its head and fails */
                var fk = H.seg(t, B0 + 4.4, B0 + 5.1) * (1 - H.seg(t, B0 + 6.2, B0 + 6.8));
                var fsh = H.shake(t, B0 + 5.1, B0 + 6.1, 4);
                H.at(kF, H.lerp(slots[1], lockX - 40, fk) + fsh, H.lerp(FLOOR + 8, lockY, fk), H.lerp(1.1, 1.5, fk) * kS, fsh * 2);
                H.show(kF, t > S[6] ? 1 : 0);
                H.at(lockCross, 400, 150, H.pop(t, B0 + 5.4, B0 + 5.9));
                H.show(lockCross, t > B0 + 5.4 && t < B0 + 6.8 ? 1 : 0);
                /* the dog's key opens it */
                var dk = H.seg(t, B0 + 8, B0 + 8.8) * (1 - H.seg(t, B0 + 9.4, B0 + 9.9));
                H.at(kD, H.lerp(dP, lockX - 40, dk), H.lerp(FLOOR - 16, lockY, dk), 1.5 * kS); H.show(kD, t > S[6] ? 1 : 0);
                /* little hearts when it opens */
                var hk = H.lin(t, B0 + 10, B0 + 11.5);
                hs.forEach(function (n, i) {
                    var dx = (i - 1) * 46;
                    H.at(n, 615 + dx * hk, 250 - 60 * hk - (i === 1 ? 20 * hk : 0), 0.7);
                    H.show(n, hk > 0 && hk < 1 ? 1 - hk * hk : 0);
                });
            };
        }
    });
})();
