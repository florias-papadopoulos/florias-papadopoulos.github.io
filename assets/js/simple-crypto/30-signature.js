/* Story 2, signature. Scenes:
   0 the cat has a paw stamp only it owns; it stamps a see-through sheet and gives a copy to everyone (the dog, the fox);
   1 the cat writes a letter and seals it with the stamp; the letter goes to the dog;
   2 the dog lays its see-through sheet on the seal: the paw fits, a tick;
   3 the fox writes a letter and seals it with its own paw; on the dog's sheet it does not fit, a cross;
   4 the cat seals another letter, the fox catches it and changes one word: the seal cracks, and the dog's check fails. */
(function () {
    'use strict';
    var ROWS = [[16, 12, 20], [10, 22, 14], [24, 18], [12, 16]];
    var CHECK = { x: 560, y: 190, s: 2.2 }, SEAL = { x: 18, y: 32 };

    SC.story({
        id: 'signature',
        scenes: [4.2, 5.2, 4, 6.4, 9],
        poster: 12,
        keys: [4.1, 9, 12.4, 19.1],          /* the stills with reduced motion (10-player.js) */
        build: function (svg, H) {
            var S = [0, 4.2, 9.4, 13.4, 19.8];
            H.room(svg);
            var fox = H.fox(svg), cat = H.pet(svg, 'cat'), dog = H.pet(svg, 'dog');

            function makeLetter(foxy) {
                var L = H.letter(svg, ROWS);
                var seal = H.el('g', { transform: 'translate(' + SEAL.x + ' ' + SEAL.y + ')' }, L.g);
                var inner = H.el('g', {}, seal);
                L.disc = H.el('path', { 'class': 'seal ol', fill: '#c8372d', d: 'M0-13l3.6 1.6 4.4-.6 1.8 4 3.6 2.6-1 4.4 1 4.4-3.6 2.6-1.8 4-4.4-.6L0 13l-3.6-1.6-4.4.6-1.8-4-3.6-2.6 1-4.4-1-4.4 3.6-2.6 1.8-4 4.4.6z' }, inner);
                H.at(H.paw(inner, 'seal-paw', foxy), 0, 0.5, 0.78);
                L.crack = H.el('path', { 'class': 'seal-crack', d: 'M-3-14l3 6-4 5 5 4-3 5 4 8' }, inner);
                H.show(L.crack, 0);
                L.seal = seal; L.inner = inner;
                return L;
            }
            /* the stamp: a wooden knob, a gold block, the paw underneath */
            var stamp = H.el('g', { 'class': 'sc-stamp' }, svg);
            H.el('rect', { 'class': 'st-wood ol', x: -5, y: -34, width: 10, height: 16 }, stamp);
            H.el('circle', { 'class': 'st-wood ol', cx: 0, cy: -40, r: 9 }, stamp);
            H.el('rect', { 'class': 'st-gold ol', x: -19, y: -20, width: 38, height: 14, rx: 3 }, stamp);
            H.el('rect', { 'class': 'st-ink ol', x: -16, y: -6, width: 32, height: 6, rx: 2 }, stamp);
            var glint = H.el('path', { 'class': 'sc-glint', d: 'M0-14v-10M0 14v10M-14 0h-10M14 0h10M-10-10l-6-6M10-10l6-6M-10 10l-6 6M10 10l6 6' }, svg);

            /* the see-through sheets: the cat's (made by the stamp), the dog's and the fox's copies */
            function sheet() {
                var g = H.el('g', { 'class': 'sc-sheet' }, svg);
                H.el('rect', { x: -30, y: -30, width: 60, height: 60, rx: 6 }, g);
                g.pawN = H.paw(g, 'sheet-paw');
                H.at(g.pawN, 0, 0.65, 1.01);
                return g;
            }
            var L1 = makeLetter(false), L2 = makeLetter(true), L3 = makeLetter(false);
            var sheetC = sheet(), sheetD = sheet(), sheetF = sheet();
            var scribble = H.el('path', { 'class': 'sc-scribble', d: 'M-2 4l4-6 4 6 4-6 4 6 4-6' }, L3.g);
            var tick = H.tick(svg), cross = H.cross(svg), cross2 = H.cross(svg);

            var CAT = 105, DOG = 695, FOXX = 400, FLOOR = 384;
            var REST = { x: 182, y: 386 }, DESK = { x: 262, y: 300 }, FOXDESK = { x: 470, y: 300 };
            var SD = { x: 590, y: 340, s: 0.9 }, SF = { x: 330, y: 352, s: 0.75 };

            /* a letter's words appear one by one from a; the seal pops at sealAt */
            function write(L, t, a, sealAt) {
                L.words.forEach(function (w, i) { H.show(w, H.seg(t, a + i * 0.09, a + i * 0.09 + 0.15)); });
                H.at(L.inner, 0, 0, 1.3 * H.pop(t, sealAt, sealAt + 0.4));
                H.show(L.seal, t > sealAt ? 1 : 0);
            }
            /* the stamp presses at (x, y) (the bottom of the stamp) around time a */
            function press(t, a, x, y) {
                var k = H.seg(t, a, a + 0.5) * (1 - H.seg(t, a + 0.9, a + 1.3));
                var down = H.seg(t, a + 0.5, a + 0.65) * (1 - H.seg(t, a + 0.75, a + 0.9));
                return { k: k, x: H.lerp(REST.x, x, k), y: H.lerp(REST.y, y - 30, k) + 30 * down - 30 * Math.sin(Math.PI * H.seg(t, a, a + 0.5)) * (1 - H.seg(t, a + 0.5, a + 0.6)) };
            }
            /* a letter flies from (x0, y0, s0) to the dog's checking place */
            function toCheck(L, t, a, x0, y0, s0) {
                var k = H.seg(t, a, a + 1.3), q = H.arc(x0, y0, CHECK.x, CHECK.y, 120, k);
                H.at(L.g, q.x, q.y, H.lerp(s0, CHECK.s, k));
            }
            /* the dog's sheet goes onto the seal at the checking place and comes back */
            function check(t, a, b) {
                var k = H.seg(t, a, a + 0.8) * (1 - H.seg(t, b, b + 0.6));
                var sx = CHECK.x + SEAL.x * CHECK.s, sy = CHECK.y + SEAL.y * CHECK.s;
                H.at(sheetD, H.lerp(SD.x, sx, k), H.lerp(SD.y, sy, k), H.lerp(SD.s, CHECK.s, k));
                return k;
            }

            return function (t) {
                var inK = H.seg(t, 0, 0.8);
                cat.place(CAT, 372, 1.6); dog.place(DOG, 372, 1.6, -1); fox.place(FOXX, 372, 1.25);
                H.show(cat.g, inK); H.show(dog.g, inK); H.show(fox.g, inK);

                /* ---- 0: the stamp, and the see-through sheets ---- */
                var p = { x: REST.x, y: REST.y }, pr;
                if (t < S[1]) { pr = press(t, 2.1, DESK.x, DESK.y + 27); p = pr; }
                else if (t < S[3]) { pr = press(t, S[1] + 1.8, DESK.x + SEAL.x * 1.3, DESK.y + SEAL.y * 1.3 + 15); p = pr; }
                else { pr = press(t, S[4] + 1.1, DESK.x + SEAL.x * 1.3, DESK.y + SEAL.y * 1.3 + 15); p = pr; }
                H.at(stamp, p.x, p.y, 1.2 * H.pop(t, 0.8, 1.4));
                H.show(stamp, t > 0.8 ? 1 : 0);
                cat.arm(-45 * pr.k);
                H.at(glint, REST.x, REST.y - 60, H.seg(t, 1.1, 1.5) * (1 - H.seg(t, 1.6, 2)));
                H.show(glint, t > 1.1 && t < 2 ? 1 : 0);
                /* the sheet the stamp marks, then copies fly to the dog and the fox */
                H.show(sheetC.pawN, t > 2.7 ? 1 : 0);
                var cp = H.seg(t, 3, 4);
                var dq = H.arc(DESK.x, DESK.y, SD.x, SD.y, 110, cp), fq = H.arc(DESK.x, DESK.y, SF.x, SF.y, 60, cp);
                H.at(sheetC, DESK.x, DESK.y, 1.2 * H.pop(t, 1.5, 2) * (1 - H.seg(t, S[1], S[1] + 0.4)));
                H.show(sheetC, t > 1.5 && t < S[1] + 0.4 ? 1 : 0);
                if (t < S[2]) H.at(sheetD, dq.x, dq.y, H.lerp(1.2, SD.s, cp));
                H.show(sheetD, t > 3 ? 1 : 0);
                H.at(sheetF, fq.x, fq.y, H.lerp(1.2, SF.s, cp));
                H.show(sheetF, t > 3 ? 1 : 0);
                H.show(sheetD.pawN, 1); H.show(sheetF.pawN, 1);

                /* ---- 1 and 2: a sealed letter, and the dog's check ---- */
                var a1 = S[1];
                write(L1, t, a1 + 0.5, a1 + 2.35);
                if (t < a1 + 3.4) H.at(L1.g, DESK.x, DESK.y, 1.3 * H.pop(t, a1 + 0.1, a1 + 0.6));
                else toCheck(L1, t, a1 + 3.4, DESK.x, DESK.y, 1.3);
                var out1 = H.seg(t, S[3] - 0.6, S[3]);
                if (out1 > 0) H.at(L1.g, CHECK.x + 140 * out1, CHECK.y + 150 * out1, CHECK.s * (1 - 0.7 * out1));
                H.show(L1.g, t > a1 + 0.1 && t < S[3] ? 1 - out1 * out1 : 0);
                if (t >= S[2] && t < S[3]) check(t, S[2] + 0.1, S[3] - 0.9);
                H.at(tick, CHECK.x + 100, CHECK.y - 80, 1.3 * H.pop(t, S[2] + 1.1, S[2] + 1.6));
                H.show(tick, t > S[2] + 1.1 && t < S[3] - 0.4 ? 1 : 0);

                /* ---- 3: the fox's fake ---- */
                var a3 = S[3];
                write(L2, t, a3 + 0.5, a3 + 2.2);
                fox.arm(-50 * H.seg(t, a3 + 1.6, a3 + 2) * (1 - H.seg(t, a3 + 2.2, a3 + 2.6)) - 40 * H.seg(t, S[4] + 2.5, S[4] + 3) * (1 - H.seg(t, S[4] + 4.4, S[4] + 4.8)));
                if (t < a3 + 2.8) H.at(L2.g, FOXDESK.x, FOXDESK.y, 1.3 * H.pop(t, a3 + 0.1, a3 + 0.6));
                else toCheck(L2, t, a3 + 2.8, FOXDESK.x, FOXDESK.y, 1.3);
                var out2 = H.seg(t, S[4] - 0.6, S[4]);
                if (out2 > 0) H.at(L2.g, CHECK.x + 140 * out2, CHECK.y + 150 * out2, CHECK.s * (1 - 0.7 * out2));
                H.show(L2.g, t > a3 + 0.1 && t < S[4] ? 1 - out2 * out2 : 0);
                if (t >= S[3] && t < S[4]) check(t, a3 + 4.2, S[4] - 0.9);
                H.at(cross, CHECK.x + 100, CHECK.y - 80, 1.3 * H.pop(t, a3 + 5.1, a3 + 5.6));
                H.show(cross, t > a3 + 5.1 && t < S[4] - 0.4 ? 1 : 0);

                /* ---- 4: the fox changes a sealed letter: the seal cracks ---- */
                var a4 = S[4];
                write(L3, t, a4 + 0.4, a4 + 1.65);
                var grab = H.seg(t, a4 + 2.2, a4 + 3.2);
                if (t < a4 + 2.2) H.at(L3.g, DESK.x, DESK.y, 1.3 * H.pop(t, a4 + 0.1, a4 + 0.5));
                else if (t < a4 + 6) { var q = H.arc(DESK.x, DESK.y, FOXDESK.x, FOXDESK.y, 70, grab); H.at(L3.g, q.x, q.y, 1.3); }
                else toCheck(L3, t, a4 + 6, FOXDESK.x, FOXDESK.y, 1.3);
                H.show(L3.g, t > a4 + 0.1 ? 1 : 0);
                /* one word changes (shorter, red, scribbled), then the seal cracks and goes grey */
                var w = L3.words[4], ch = H.seg(t, a4 + 3.6, a4 + 4.2);
                w.setAttribute('width', H.lerp(22, 9, ch)); w.setAttribute('fill', H.mix('#8b95a5', '#e5484d', ch));
                H.show(scribble, ch); scribble.setAttribute('transform', 'translate(-12 -15)');
                var cr = H.seg(t, a4 + 4.6, a4 + 5);
                H.show(L3.crack, cr);
                L3.disc.setAttribute('fill', H.mix('#c8372d', '#9c8f8c', cr));
                L3.seal.setAttribute('transform', 'translate(' + SEAL.x + ' ' + SEAL.y + ') rotate(' + (H.shake(t, a4 + 4.5, a4 + 5.2, 1) * 6) + ')');
                if (t >= a4) check(t, a4 + 7.4, 99);
                H.at(cross2, CHECK.x + 100, CHECK.y - 80, 1.3 * H.pop(t, a4 + 8.3, a4 + 8.8));
                H.show(cross2, t > a4 + 8.3 ? 1 : 0);

                /* faces */
                var good = t > S[2] + 1.2 && t < S[3] - 0.2;
                cat.mood(good ? 'happy' : t > a4 + 8.4 ? 'sad' : '');
                dog.mood(good ? 'happy' : (t > a3 + 5.2 && t < S[4]) || t > a4 + 8.4 ? 'sad' : '');
                fox.mood((t > a3 + 0.2 && t < a3 + 5.1) || (t > a4 + 3 && t < a4 + 8.3) ? 'happy' : (t > a3 + 5.2 && t < S[4]) || t > a4 + 8.4 ? 'sad' : '');
                fox.tilt(-10 * H.seg(t, a4 + 2.4, a4 + 3) * (1 - H.seg(t, a4 + 6, a4 + 6.5)));
                dog.tilt(t > S[2] && t < S[3] ? 8 * H.seg(t, S[2], S[2] + 0.5) : 0);
            };
        }
    });
})();
