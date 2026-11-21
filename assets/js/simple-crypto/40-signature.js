/* Story 3, signature. The seal is the cat's paw stamped over the letter's fingerprint (three coloured blocks, as in
   the fingerprint story), so a seal belongs to one letter only. Scenes:
   0 the cat has a paw stamp only it owns; it stamps a see-through sheet and gives a copy to everyone (the dog, the fox);
   1 the cat writes a letter, makes its fingerprint and stamps its paw over it: the seal;
   2 the dog checks: its sheet fits the paw ("paw fits"), the fingerprint it makes of the letter matches the seal's
     colours ("colours match"): a tick;
   3 the fox seals a letter with its own paw: the sheet does not fit, a cross;
   4 the fox moves a real seal from an old letter of the cat onto its own letter: the paw fits, the colours do not;
   5 the fox changes one word of a sealed letter: the paw fits, the letter's new fingerprint does not match: a cross.
   The two lines over the checked letter say what the dog found. */
(function () {
    'use strict';
    var ROWS = [[16, 12, 20], [10, 22, 14], [24, 18], [12]];
    var CHECK = { x: 560, y: 196, s: 2.2 }, SEAL = { x: 16, y: 28 };
    var FP_A = ['#e5484d', '#f4c430', '#2f7fd0'], FP_B = ['#22a06b', '#a855f7', '#f08a4b'], FP_D = ['#14b8a6', '#ec4899', '#84cc16'];
    var FP_C = ['#4f46e5', '#f59e0b', '#22a06b'], FP_C2 = ['#ec4899', '#2f7fd0', '#f4c430'];
    var SEAL_PAW = 0.62, PAW_Y = -4;                 /* the paw in the seal: its size and where it sits */

    SC.story({
        id: 'signature',
        scenes: [4.2, 6, 6, 6.4, 8, 9],
        poster: 16.1,
        build: function (svg, H) {
            var S = [0, 4.2, 10.2, 16.2, 22.6, 30.6];
            H.room(svg);
            var fox = H.fox(svg), cat = H.pet(svg, 'cat'), dog = H.pet(svg, 'dog');

            /* a seal: red wax with the paw on top and the fingerprint's three blocks under it */
            function makeSeal(parent, fp, foxy) {
                var g = H.el('g', {}, parent);
                var wax = H.el('g', {}, g);
                H.el('rect', { 'class': 'seal ol', fill: '#c8372d', x: -15, y: -15, width: 30, height: 30, rx: 5 }, wax);
                H.at(H.paw(wax, 'seal-paw', foxy), 0, PAW_Y, SEAL_PAW);
                var blocks = H.strip(g, fp, 7, 1);
                blocks.setAttribute('class', 'sc-strip sc-thin');
                return { g: g, wax: wax, blocks: blocks };
            }
            function makeLetter(fp, foxy) {
                var L = H.letter(svg, ROWS);
                L.seal = makeSeal(L.g, fp, foxy);
                H.at(L.seal.g, SEAL.x, SEAL.y);
                return L;
            }
            /* put a seal's blocks: k 0 above the letter (just made), 1 in the seal */
            function blocksAt(sl, k) { H.at(sl.blocks, -11.5, H.lerp(-92, 4.5, k)); }

            /* the stamp: a wooden knob, a gold block, the paw underneath */
            var stamp = H.el('g', { 'class': 'sc-stamp' }, svg);
            H.el('rect', { 'class': 'st-wood ol', x: -5, y: -34, width: 10, height: 16 }, stamp);
            H.el('circle', { 'class': 'st-wood ol', cx: 0, cy: -40, r: 9 }, stamp);
            H.el('rect', { 'class': 'st-gold ol', x: -19, y: -20, width: 38, height: 14, rx: 3 }, stamp);
            H.el('rect', { 'class': 'st-ink ol', x: -16, y: -6, width: 32, height: 6, rx: 2 }, stamp);
            var glint = H.el('path', { 'class': 'sc-glint', d: 'M0-14v-10M0 14v10M-14 0h-10M14 0h10M-10-10l-6-6M10-10l6-6M-10 10l-6 6M10 10l6 6' }, svg);
            var lStamp = H.label(svg, 'only the cat has it', 200, 432, 'sc-small');

            /* the see-through sheets: the cat's (made by the stamp), the dog's and the fox's copies */
            function sheet() {
                var g = H.el('g', { 'class': 'sc-sheet' }, svg);
                H.el('rect', { x: -30, y: -30, width: 60, height: 60, rx: 6 }, g);
                g.pawN = H.paw(g, 'sheet-paw');
                H.at(g.pawN, 0, 0.65, 1.01);
                return g;
            }
            var L1 = makeLetter(FP_A), L2 = makeLetter(FP_B, true), Lold = makeLetter(FP_A), L4 = makeLetter(FP_D), L3 = makeLetter(FP_C);
            /* the fox's own letter in scene 4 has other words, and gets the seal of the old letter */
            [L4.words[0], L4.words[3], L4.words[6]].forEach(function (w) { w.setAttribute('fill', '#e5484d'); });
            H.show(L4.seal.g, 0);
            var moved = makeSeal(svg, FP_A);
            var sheetC = sheet(), sheetD = sheet(), sheetF = sheet();
            var lEvery = H.label(svg, 'a copy for everyone', 470, 432, 'sc-small');
            var scribble = H.el('path', { 'class': 'sc-scribble', d: 'M-2 4l4-6 4 6 4-6 4 6 4-6' }, L3.g);
            var lFp = H.label(svg, 'fingerprint', 262, 196, 'sc-small');
            /* the fingerprint the dog makes of the letter it checks, under the seal */
            var dogFp = H.strip(svg, FP_A, 15, 2);
            /* what the dog found */
            var res1 = H.label(svg, '', CHECK.x, 42, 'sc-res'), res2 = H.label(svg, '', CHECK.x, 72, 'sc-res');
            var tick = H.tick(svg), cross = H.cross(svg);

            var CAT = 105, DOG = 695, FOXX = 400;
            var REST = { x: 182, y: 386 }, DESK = { x: 262, y: 300 }, FOXDESK = { x: 470, y: 300 }, OLD = { x: 330, y: 300 };
            var SD = { x: 590, y: 346, s: 0.9 }, SF = { x: 330, y: 352, s: 0.75 };

            /* a letter's words appear one by one from a */
            function write(L, t, a) { L.words.forEach(function (w, i) { H.show(w, H.seg(t, a + i * 0.09, a + i * 0.09 + 0.15)); }); }
            /* the stamp presses at (x, y) (the bottom of the stamp) around time a */
            function press(t, a, x, y) {
                var k = H.seg(t, a, a + 0.5) * (1 - H.seg(t, a + 0.9, a + 1.3));
                var down = H.seg(t, a + 0.5, a + 0.65) * (1 - H.seg(t, a + 0.75, a + 0.9));
                return { k: k, x: H.lerp(REST.x, x, k), y: H.lerp(REST.y, y - 30, k) + 30 * down - 30 * Math.sin(Math.PI * H.seg(t, a, a + 0.5)) * (1 - H.seg(t, a + 0.5, a + 0.6)) };
            }
            /* where a letter at (x, y, s) has its seal */
            function sealPos(x, y, s) { return { x: x + SEAL.x * s, y: y + SEAL.y * s }; }
            /* a letter flies from (x0, y0, s0) to the dog's checking place */
            function toCheck(L, t, a, x0, y0, s0) {
                var k = H.seg(t, a, a + 1.3), q = H.arc(x0, y0, CHECK.x, CHECK.y, 120, k);
                H.at(L.g, q.x, q.y, H.lerp(s0, CHECK.s, k));
            }
            /* the dog's sheet goes onto the seal's paw at the checking place from a, back from b */
            function check(t, a, b) {
                var k = H.seg(t, a, a + 0.8) * (1 - H.seg(t, b, b + 0.6));
                var sp = sealPos(CHECK.x, CHECK.y, CHECK.s), s1 = CHECK.s * SEAL_PAW / 1.01;
                H.at(sheetD, H.lerp(SD.x, sp.x, k), H.lerp(SD.y, sp.y + PAW_Y * CHECK.s - 0.65 * s1, k), H.lerp(SD.s, s1, k));
            }
            /* the dog's own fingerprint of the checked letter pops out under its seal */
            function dogPrint(t, a, fp) {
                var sp = sealPos(CHECK.x, CHECK.y, CHECK.s), k = H.seg(t, a, a + 0.6);
                dogFp.set(fp);
                H.at(dogFp, sp.x - dogFp.w / 2, H.lerp(CHECK.y, sp.y + 16 * CHECK.s + 6, k), 1);
                H.show(dogFp, k > 0 ? 1 : 0);
            }
            function result(n, t, a, ok, yes, no) {
                n.set(ok ? yes : no);
                n.setAttribute('class', 'sc-label sc-res ' + (ok ? 'sc-ok' : 'sc-bad'));
                H.show(n, H.seg(t, a, a + 0.3));
            }
            /* a letter leaves the checking place to the bottom right */
            function leave(L, t, a) {
                var k = H.seg(t, a, a + 0.6);
                if (k > 0) H.at(L.g, CHECK.x + 140 * k, CHECK.y + 150 * k, CHECK.s * (1 - 0.7 * k));
                return 1 - k * k;
            }

            return function (t) {
                var inK = H.seg(t, 0, 0.8);
                cat.place(CAT, 372, 1.6); dog.place(DOG, 372, 1.6, -1); fox.place(FOXX, 372, 1.25);
                H.show(cat.g, inK); H.show(dog.g, inK); H.show(fox.g, inK);
                var a1 = S[1], a2 = S[2], a3 = S[3], a4 = S[4], a5 = S[5];

                /* ---- 0: the stamp, and the see-through sheets ---- */
                var pr;
                var sp1 = sealPos(DESK.x, DESK.y, 1.3);
                if (t < S[1]) pr = press(t, 2.1, DESK.x, DESK.y + 27);
                else if (t < S[5]) pr = press(t, a1 + 3.4, sp1.x, sp1.y + 20);
                else pr = press(t, a5 + 1, sp1.x, sp1.y + 20);
                H.at(stamp, pr.x, pr.y, 1.2 * H.pop(t, 0.8, 1.4));
                H.show(stamp, t > 0.8 ? 1 : 0);
                cat.arm(-45 * pr.k);
                H.at(glint, REST.x, REST.y - 60, H.seg(t, 1.1, 1.5) * (1 - H.seg(t, 1.6, 2)));
                H.show(glint, t > 1.1 && t < 2 ? 1 : 0);
                H.show(lStamp, H.seg(t, 1.1, 1.5) * (1 - H.seg(t, S[1], S[1] + 0.4)));
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
                H.show(lEvery, H.seg(t, 3.6, 4) * (1 - H.seg(t, S[1], S[1] + 0.4)));

                /* ---- 1: a letter, its fingerprint, the stamp on it ---- */
                write(L1, t, a1 + 0.5);
                var down1 = H.seg(t, a1 + 2.4, a1 + 3.2);
                blocksAt(L1.seal, down1);
                H.show(L1.seal.blocks, H.seg(t, a1 + 1.6, a1 + 2));
                H.show(lFp, H.seg(t, a1 + 1.8, a1 + 2.1) * (1 - H.seg(t, a1 + 2.4, a1 + 2.7)));
                H.at(L1.seal.wax, 0, 0, H.pop(t, a1 + 3.95, a1 + 4.3));
                H.show(L1.seal.wax, t > a1 + 3.95 ? 1 : 0);
                if (t < a2 + 0.1) H.at(L1.g, DESK.x, DESK.y, 1.3 * H.pop(t, a1 + 0.1, a1 + 0.6));
                else toCheck(L1, t, a2 + 0.1, DESK.x, DESK.y, 1.3);
                var o1 = leave(L1, t, S[3]);
                H.show(L1.g, t > a1 + 0.1 && t < S[3] + 0.6 ? o1 : 0);

                /* ---- 2: the dog's check ---- */
                if (t >= a2 && t < S[3]) check(t, a2 + 1.6, a2 + 3.4);
                else if (t >= S[3] && t < a4) check(t, a3 + 4.2, 99);
                else if (t >= a4 && t < a5) check(t, a4 + 5.2, 99);
                else if (t >= a5) check(t, a5 + 6.4, 99);
                var ok;
                if (t < S[3]) {
                    result(res1, t, a2 + 2.5, true, 'paw fits', '');
                    result(res2, t, a2 + 4.6, true, 'colours match', '');
                    dogPrint(t, a2 + 3.8, FP_A);
                } else if (t < a4) {
                    result(res1, t, a3 + 5.1, false, '', 'paw does not fit');
                    H.show(res2, 0); H.show(dogFp, 0);
                } else if (t < a5) {
                    result(res1, t, a4 + 6, true, 'paw fits', '');
                    dogPrint(t, a4 + 6.6, FP_D);
                    result(res2, t, a4 + 7.3, false, '', 'colours do not match');
                } else {
                    result(res1, t, a5 + 7.2, true, 'paw fits', '');
                    dogPrint(t, a5 + 7.6, FP_C2);
                    result(res2, t, a5 + 8.2, false, '', 'colours do not match');
                }
                ok = t > a2 + 5 && t < S[3];
                H.at(tick, CHECK.x + 112, CHECK.y - 60, 1.2 * H.pop(t, a2 + 5, a2 + 5.4));
                H.show(tick, ok ? 1 : 0);
                var bad = (t > a3 + 5.5 && t < a4) || (t > a4 + 7.7 && t < a5) || t > a5 + 8.5;
                var badAt = t < a4 ? a3 + 5.5 : t < a5 ? a4 + 7.7 : a5 + 8.5;
                H.at(cross, CHECK.x + 112, CHECK.y - 60, 1.2 * H.pop(t, badAt, badAt + 0.4));
                H.show(cross, bad ? 1 : 0);

                /* ---- 3: the fox's own seal ---- */
                write(L2, t, a3 + 0.6);
                fox.arm(-50 * H.seg(t, a3 + 1.7, a3 + 2.1) * (1 - H.seg(t, a3 + 2.3, a3 + 2.7)) - 45 * H.seg(t, a4 + 2, a4 + 2.4) * (1 - H.seg(t, a4 + 3, a4 + 3.4)) -
                    40 * H.seg(t, a5 + 2.4, a5 + 2.9) * (1 - H.seg(t, a5 + 4.4, a5 + 4.8)));
                blocksAt(L2.seal, 1);
                H.at(L2.seal.g, SEAL.x, SEAL.y, H.pop(t, a3 + 2.1, a3 + 2.5));
                H.show(L2.seal.g, t > a3 + 2.1 ? 1 : 0);
                if (t < a3 + 2.8) H.at(L2.g, FOXDESK.x, FOXDESK.y, 1.3 * H.pop(t, a3 + 0.2, a3 + 0.7));
                else toCheck(L2, t, a3 + 2.8, FOXDESK.x, FOXDESK.y, 1.3);
                var o2 = leave(L2, t, a4);
                H.show(L2.g, t > a3 + 0.2 && t < a4 + 0.6 ? o2 : 0);

                /* ---- 4: a real seal moved to another letter ---- */
                blocksAt(Lold.seal, 1); H.at(Lold.seal.g, SEAL.x, SEAL.y);
                H.at(Lold.g, OLD.x, OLD.y, 1.0 * H.pop(t, a4 + 0.3, a4 + 0.7));
                Lold.words.forEach(function (w) { H.show(w, 1); });
                H.show(Lold.g, t > a4 + 0.3 && t < a5 ? 1 - H.seg(t, a4 + 3.4, a4 + 3.9) : 0);
                H.show(Lold.seal.g, t < a4 + 2.2 ? 1 : 0);
                write(L4, t, a4 + 0.8);
                if (t < a4 + 3.8) H.at(L4.g, FOXDESK.x, FOXDESK.y, 1.3 * H.pop(t, a4 + 0.6, a4 + 1));
                else toCheck(L4, t, a4 + 3.8, FOXDESK.x, FOXDESK.y, 1.3);
                var o4 = leave(L4, t, a5);
                H.show(L4.g, t > a4 + 0.6 && t < a5 + 0.6 ? o4 : 0);
                /* the seal flies from the old letter to the fox's letter, then rides on it */
                blocksAt(moved, 1);
                var mv = H.seg(t, a4 + 2.2, a4 + 3.2);
                var from = sealPos(OLD.x, OLD.y, 1), to = sealPos(FOXDESK.x, FOXDESK.y, 1.3), q = H.arc(from.x, from.y, to.x, to.y, 60, mv);
                if (t < a4 + 3.3) H.at(moved.g, q.x, q.y, H.lerp(1, 1.3, mv));
                H.show(moved.g, t > a4 + 2.2 && t < a4 + 3.3 ? 1 : 0);
                H.show(L4.seal.g, t >= a4 + 3.3 ? 1 : 0);
                blocksAt(L4.seal, 1); L4.seal.blocks.set(FP_A);

                /* ---- 5: a word changed in a sealed letter ---- */
                write(L3, t, a5 + 0.3);
                blocksAt(L3.seal, 1);
                H.at(L3.seal.wax, 0, 0, H.pop(t, a5 + 1.55, a5 + 1.9));
                H.show(L3.seal.g, t > a5 + 1.5 ? 1 : 0);
                var grab = H.seg(t, a5 + 2.2, a5 + 3.2);
                if (t < a5 + 2.2) H.at(L3.g, DESK.x, DESK.y, 1.3 * H.pop(t, a5 + 0.1, a5 + 0.5));
                else if (t < a5 + 5) { var q3 = H.arc(DESK.x, DESK.y, FOXDESK.x, FOXDESK.y, 70, grab); H.at(L3.g, q3.x, q3.y, 1.3); }
                else toCheck(L3, t, a5 + 5, FOXDESK.x, FOXDESK.y, 1.3);
                H.show(L3.g, t > a5 + 0.1 ? 1 : 0);
                var w = L3.words[4], ch = H.seg(t, a5 + 3.6, a5 + 4.2);
                w.setAttribute('width', H.lerp(22, 9, ch)); w.setAttribute('fill', H.mix('#8b95a5', '#e5484d', ch));
                H.show(scribble, ch); scribble.setAttribute('transform', 'translate(-12 -15)');

                /* faces */
                var good = t > a2 + 5 && t < S[3];
                var dogSad = bad;
                cat.mood(good ? 'happy' : t > a5 + 8.6 ? 'sad' : '');
                dog.mood(good ? 'happy' : dogSad ? 'sad' : '');
                fox.mood((t > a3 + 0.3 && t < a3 + 5.4) || (t > a4 + 0.4 && t < a4 + 7.6) || (t > a5 + 2.4 && t < a5 + 8.4) ? 'happy' : bad ? 'sad' : '');
                fox.tilt(-10 * H.seg(t, a5 + 2.4, a5 + 3) * (1 - H.seg(t, a5 + 5, a5 + 5.5)));
                dog.tilt(t > a2 + 1 && t < S[3] ? 8 * H.seg(t, a2 + 1, a2 + 1.5) : 0);
            };
        }
    });
})();
