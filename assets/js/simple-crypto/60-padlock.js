/* Open padlocks (public-key encryption). Scenes:
   0 the dog has an open padlock and the only key that opens it; the key stays with the dog;
   1 copies of the open padlock fly to the cat, the fox and everyone else (the public key);
   2 the cat puts a letter in a box and snaps a padlock shut, no key needed; then it cannot open it itself;
   3 the fox grabs the box on its way: shaking does nothing, its own open padlock opens nothing; the box goes on;
   4 the dog's key opens the lock, the lid opens, the letter comes out. */
(function () {
    'use strict';
    var BRASS = '#e0a93b';

    /* a padlock around (0, 0) = the middle of its body; lock.open(k) lifts the shackle (1 open, 0 shut) */
    function padlock(H, parent) {
        var g = H.el('g', { 'class': 'sc-lock' }, parent);
        var sh = H.el('path', { 'class': 'sc-shackle', d: 'M-8-8v-8a8 8 0 0 1 16 0v8' }, g);
        H.el('rect', { 'class': 'ol', fill: BRASS, x: -13, y: -10, width: 26, height: 21, rx: 4 }, g);
        H.el('path', { 'class': 'sc-hole', d: 'M0-4a2.6 2.6 0 0 1 1.4 4.8L2.4 5h-4.8l1-4.2A2.6 2.6 0 0 1 0-4z' }, g);
        g.open = function (k) { sh.setAttribute('transform', 'translate(0 ' + (-8 * k).toFixed(2) + ')'); };
        return g;
    }
    /* the key, its bit pointing right; drawn in an inner group so that it can turn */
    function key(H, parent) {
        var g = H.el('g', { 'class': 'sc-key' }, parent), inner = H.el('g', {}, g);
        H.el('path', { 'class': 'ol', fill: BRASS, d: 'M-6-3h28v6h-3v5h-4V3h-3v4h-4V3H-6z' }, inner);
        H.el('circle', { 'class': 'ol', fill: BRASS, cx: -13, cy: 0, r: 9 }, inner);
        H.el('circle', { 'class': 'sc-hole', cx: -15, cy: 0, r: 3 }, inner);
        g.turn = function (d) { inner.setAttribute('transform', d ? 'rotate(' + d.toFixed(1) + ' 16 0)' : ''); };
        return g;
    }

    SC.story({
        id: 'padlock',
        scenes: [5, 5, 7, 6, 6.5],
        poster: 22.9,
        build: function (svg, H) {
            var S = [0, 5, 10, 17, 23];
            H.room(svg);
            var fox = H.fox(svg), cat = H.pet(svg, 'cat'), dog = H.pet(svg, 'dog');
            var FLOOR = 384;
            var HOME = { x: 590, y: 300 }, AT_CAT = { x: 230, y: 352 }, AT_FOX = { x: 452, y: 408 }, KREST = { x: 610, y: 404 };
            var BOX_CAT = { x: 290, y: FLOOR }, BOX_FOX = { x: 400, y: 214 }, BOX_DOG = { x: 548, y: FLOOR };

            /* the box with a letter */
            var letter = H.letter(svg, [[16, 12, 20], [10, 22, 14], [24, 18]]);
            var box = H.el('g', { 'class': 'sc-box' }, svg);
            H.el('rect', { 'class': 'box-body ol', x: -36, y: -46, width: 72, height: 46, rx: 4 }, box);
            H.el('path', { 'class': 'box-band', d: 'M-36-30h72' }, box);
            var lid = H.el('g', {}, box);
            H.el('rect', { 'class': 'box-lid ol', x: -38, y: -60, width: 76, height: 15, rx: 4 }, lid);

            var pDog = padlock(H, svg), pCat = padlock(H, svg), pFox = padlock(H, svg), pE1 = padlock(H, svg), pE2 = padlock(H, svg);
            var dKey = key(H, svg);
            var click = H.el('path', { 'class': 'sc-glint', d: 'M0-30v-10M-22-22l-7-7M22-22l7-7M-30 0h-10M30 0h10' }, svg);
            var cross = H.cross(svg), cross2 = H.cross(svg), wonder = H.wonder(svg);
            var hearts = [H.heart(svg), H.heart(svg), H.heart(svg)];
            var lOpen = H.label(svg, 'open padlock', HOME.x, 254, 'sc-small');
            var lKey = H.label(svg, 'the key stays with the dog', 540, 442, 'sc-small');
            var lPub = H.label(svg, 'a copy for anyone who asks', 400, 120);
            var lBox = H.label(svg, '', 290, 232, 'sc-small');
            var lFox = H.label(svg, 'its padlock only locks', 400, 70, 'sc-warn');

            function to(n, a, b, k, h, s0, s1) { var p = H.arc(a.x, a.y, b.x, b.y, h, k); H.at(n, p.x, p.y, H.lerp(s0, s1, k)); }

            return function (t) {
                var inK = H.seg(t, 0, 0.8);
                cat.place(105, 372, 1.6); dog.place(695, 372, 1.6, -1); fox.place(400, 372, 1.25);
                H.show(cat.g, inK); H.show(dog.g, inK); H.show(fox.g, inK);
                var a1 = S[1], a2 = S[2], a3 = S[3], a4 = S[4];

                /* ---- 0: the open padlock and the key ---- */
                H.at(pDog, HOME.x, HOME.y, 1.6 * H.pop(t, 0.8, 1.3)); pDog.open(1);
                H.show(pDog, t > 0.8 ? 1 - H.seg(t, a2, a2 + 0.5) : 0);
                H.show(lOpen, H.seg(t, 1.2, 1.6) * (1 - H.seg(t, a1, a1 + 0.4)));
                H.show(lKey, H.seg(t, 2.4, 2.8) * (1 - H.seg(t, a2, a2 + 0.4)));

                /* ---- 1: copies for everyone ---- */
                var cp = H.seg(t, a1 + 0.4, a1 + 1.8), cp2 = H.seg(t, a1 + 0.9, a1 + 2.3);
                to(pFox, HOME, AT_FOX, cp, 80, 1.6, 1.1); pFox.open(1);
                to(pE1, HOME, { x: 250, y: -40 }, cp2, 60, 1.6, 1.2); pE1.open(1);
                to(pE2, HOME, { x: 770, y: -40 }, cp2, 40, 1.6, 1.2); pE2.open(1);
                H.show(pE1, t > a1 + 0.9 && cp2 < 1 ? 1 : 0); H.show(pE2, t > a1 + 0.9 && cp2 < 1 ? 1 : 0);
                H.show(pFox, t > a1 + 0.4 ? 1 : 0);
                H.show(lPub, H.seg(t, a1 + 1.4, a1 + 1.8) * (1 - H.seg(t, a2, a2 + 0.4)));

                /* ---- 2: the cat locks the box (the box then travels: the fox, the dog) ---- */
                var boxPos = BOX_CAT, boxS = 1.2;
                if (t >= a3 && t < a4) boxPos = H.arc(BOX_CAT.x, BOX_CAT.y, BOX_FOX.x, BOX_FOX.y, 60, H.seg(t, a3 + 0.3, a3 + 1.3));
                else if (t >= a4) boxPos = H.arc(BOX_FOX.x, BOX_FOX.y, BOX_DOG.x, BOX_DOG.y, 50, H.seg(t, a4 + 0.1, a4 + 1.1));
                var sh = H.shake(t, a3 + 1.4, a3 + 2.6, 5);
                H.at(box, boxPos.x + sh, boxPos.y, boxS * H.pop(t, a2 + 0.2, a2 + 0.7), sh);
                H.show(box, t > a2 + 0.2 ? 1 : 0);
                var lidOpen = t < a2 + 1.8 ? 1 : (1 - H.seg(t, a2 + 1.8, a2 + 2.2)) + H.seg(t, a4 + 3.4, a4 + 3.8);
                lid.setAttribute('transform', 'rotate(' + (-105 * Math.min(1, lidOpen)) + ' -38 -46)');
                var lIn = H.seg(t, a2 + 0.8, a2 + 1.6), lOut = H.seg(t, a4 + 3.8, a4 + 4.6);
                H.at(letter.g, boxPos.x, boxPos.y - 120 + 80 * lIn - 110 * lOut, 0.55 * H.pop(t, a2 + 0.6, a2 + 0.9) * (1 + 0.6 * lOut));
                H.show(letter.g, t > a2 + 0.6 && (t < a2 + 1.7 || t > a4 + 3.7) ? 1 : 0);
                /* the cat's padlock: it arrives in scene 1, goes onto the box, snaps shut, and rides with the box */
                var lockOnBox = { x: boxPos.x + sh, y: boxPos.y - 29 * boxS };
                var tug = H.shake(t, a2 + 4.4, a2 + 5.6, 4);
                if (t < a2) to(pCat, HOME, AT_CAT, cp, 70, 1.6, 1.2);
                else if (t < a2 + 3.2) to(pCat, AT_CAT, lockOnBox, H.seg(t, a2 + 2.4, a2 + 3.2), 40, 1.2, 1.5);
                else H.at(pCat, lockOnBox.x + tug, lockOnBox.y, 1.5, tug * 2);
                pCat.open(t < a2 + 3.3 ? 1 : t < a4 ? 1 - H.seg(t, a2 + 3.3, a2 + 3.5) : H.seg(t, a4 + 2.7, a4 + 2.9));
                H.show(pCat, t > a1 + 0.4 ? 1 - H.seg(t, a4 + 3.1, a4 + 3.6) : 0);
                H.at(click, lockOnBox.x, lockOnBox.y, 0.8 * H.seg(t, a2 + 3.3, a2 + 3.5));
                H.show(click, t > a2 + 3.3 && t < a2 + 3.9 ? 1 : 0);
                var early = t < a2 + 4.3;
                lBox.set(early ? 'snap: no key needed' : 'even the cat cannot open it now');
                lBox.setAttribute('class', 'sc-label sc-small' + (early ? '' : ' sc-warn'));
                H.show(lBox, H.seg(t, a2 + 3.4, a2 + 3.7) * (1 - H.seg(t, a3, a3 + 0.3)));
                cat.arm(-40 * (H.seg(t, a2 + 2.2, a2 + 2.5) - H.seg(t, a2 + 3.3, a2 + 3.6)) - 30 * (H.seg(t, a2 + 4.2, a2 + 4.4) - H.seg(t, a2 + 5.6, a2 + 5.9)));

                /* ---- 3: the fox tries: shaking, then its own open padlock ---- */
                fox.arm(-60 * (H.seg(t, a3 + 1, a3 + 1.3) - H.seg(t, a4, a4 + 0.3)));
                fox.tilt(-12 * (H.seg(t, a3 + 1, a3 + 1.3) - H.seg(t, a4, a4 + 0.3)));
                if (t >= a3) {
                    var fl = H.seg(t, a3 + 2.8, a3 + 3.6) * (1 - H.seg(t, a4 + 0.1, a4 + 0.7)), fsh = H.shake(t, a3 + 3.6, a3 + 4.4, 3);
                    H.at(pFox, H.lerp(AT_FOX.x, BOX_FOX.x + 58, fl) + fsh, H.lerp(AT_FOX.y, BOX_FOX.y - 34, fl), 1.1 + 0.3 * fl);
                }
                H.at(cross, BOX_FOX.x, 120, H.pop(t, a3 + 2.4, a3 + 2.8)); H.show(cross, t > a3 + 2.4 && t < a3 + 3.4 ? 1 : 0);
                H.at(cross2, BOX_FOX.x, 120, H.pop(t, a3 + 4.2, a3 + 4.6)); H.show(cross2, t > a3 + 4.2 && t < a4 ? 1 : 0);
                H.show(lFox, H.seg(t, a3 + 4.3, a3 + 4.7) * (1 - H.seg(t, a4, a4 + 0.4)));
                H.at(wonder, 372, 290, 1.3 * H.pop(t, a3 + 4.8, a3 + 5.3));
                H.show(wonder, t > a3 + 4.8 && t < a4 + 0.3 ? 1 : 0);

                /* ---- 4: the dog's key ---- */
                var kk = H.seg(t, a4 + 1.3, a4 + 2.2) * (1 - H.seg(t, a4 + 3.4, a4 + 4));
                H.at(dKey, H.lerp(KREST.x, lockOnBox.x + 30, kk), H.lerp(KREST.y, lockOnBox.y + 4, kk), 1.3 * H.pop(t, 1.8, 2.3), 0, -1);
                dKey.turn(70 * H.seg(t, a4 + 2.2, a4 + 2.6) * (1 - H.seg(t, a4 + 3.2, a4 + 3.4)));
                H.show(dKey, t > 1.8 ? 1 : 0);
                dog.arm(-40 * (H.seg(t, a4 + 1.1, a4 + 1.4) - H.seg(t, a4 + 3.4, a4 + 3.8)));
                var hk = H.lin(t, a4 + 4.4, a4 + 6);
                hearts.forEach(function (n, i) {
                    H.at(n, BOX_DOG.x + (i - 1) * 46 * hk, 200 - 60 * hk - (i === 1 ? 20 * hk : 0), 0.7);
                    H.show(n, hk > 0 && hk < 1 ? 1 - hk * hk : 0);
                });

                /* faces */
                fox.mood(t > a3 + 0.3 && t < a3 + 2.4 ? 'happy' : t > a3 + 4.2 && t < a4 + 4 ? 'sad' : '');
                cat.mood(t > a4 + 4.2 ? 'happy' : '');
                dog.mood(t > a4 + 4 ? 'happy' : '');
            };
        }
    });
})();
