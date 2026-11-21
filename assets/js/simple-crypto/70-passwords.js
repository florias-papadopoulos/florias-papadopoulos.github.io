/* Passwords and salt. The dog runs a website, the cat has an account, the fox steals the website's list. The
   fingerprints are real: the first six hex digits of SHA-256 (00-core.js), so the fox's book matches the list
   exactly when the colours are the same. Scenes:
   0 the cat's password goes into the list as it is (a careless site);
   1 the fox steals a copy of the list: it has the password;
   2 a good site grinds the password and keeps only the fingerprint; logging in grinds it again and compares;
   3 the fox steals the list of fingerprints, opens its book of common passwords' fingerprints, finds fish123;
   4 salt: random letters added before grinding, kept in the list next to the fingerprint;
   5 the fox's book has no salted fingerprints: no match. */
(function () {
    'use strict';
    var PW = 'fish123', SALT = 'x7Q';
    var BOOK = ['123456', 'password', PW, 'qwerty'];

    function gearPath(r, teeth) {
        var d = '', n = teeth * 2;
        for (var i = 0; i < n; i++) {
            var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
            d += (i ? 'L' : 'M') + (rr * Math.cos(a0)).toFixed(2) + ' ' + (rr * Math.sin(a0)).toFixed(2) + 'L' + (rr * Math.cos(a1)).toFixed(2) + ' ' + (rr * Math.sin(a1)).toFixed(2);
        }
        return d + 'Z';
    }

    SC.story({
        id: 'passwords',
        scenes: [6, 5, 8, 8, 8, 7],
        poster: 26.9,
        build: function (svg, H) {
            var S = [0, 6, 11, 19, 27, 35];
            var FP = SC.colours(SC.sha256(PW)), FPS = SC.colours(SC.sha256(SALT + PW));
            H.room(svg);
            var fox = H.fox(svg), cat = H.pet(svg, 'cat'), dog = H.pet(svg, 'dog');
            var M = { x: 566, y: 372 }, OUT = { x: 566, y: 230 }, ROW = { x: 330, y: 76 }, MOUTH = { x: 566, y: 252 };

            /* the website's list */
            var board = H.el('g', { 'class': 'sc-board' }, svg);
            H.el('rect', { 'class': 'ol', x: 240, y: 22, width: 320, height: 92, rx: 8 }, board);
            H.label(board, 'the website’s list', 256, 50, 'sc-small', 'start');
            H.label(board, 'cat', 258, 96, 'sc-small', 'start');
            var vText = H.label(board, PW, 330, 96, 'sc-mono', 'start');
            var vSalt = H.label(board, SALT, 330, 96, 'sc-mono sc-salt-text', 'start');
            var vStrip = H.strip(board, FP, 22, 4);

            /* the fingerprint machine */
            var mach = H.el('g', { 'class': 'sc-machine' }, svg);
            H.el('path', { 'class': 'm-funnel ol', d: 'M-32-120h64l-16 26h-32z' }, mach);
            H.el('rect', { 'class': 'm-body ol', x: -38, y: -96, width: 76, height: 96, rx: 10 }, mach);
            H.el('circle', { 'class': 'm-window ol', cx: 0, cy: -52, r: 22 }, mach);
            var gear = H.el('path', { 'class': 'm-gear ol', d: gearPath(14, 8) }, mach);
            var lMach = H.label(svg, 'fingerprint machine', M.x, 432, 'sc-small');

            /* the password and the salt as little tags */
            function tag(text, cls) {
                var g = H.el('g', { 'class': 'sc-tag ' + (cls || '') }, svg), w = text.length * 14 + 18;
                H.el('rect', { 'class': 'ol', x: -w / 2, y: -17, width: w, height: 34, rx: 8 }, g);
                H.label(g, text, 0, 8, 'sc-mono');
                return g;
            }
            var t0 = tag(PW), t2 = tag(PW), tLog = tag(PW), t4 = tag(PW), tS = tag(SALT, 'sc-salt');
            var sOut = H.strip(svg, FP, 22, 4), sLog = H.strip(svg, FP, 22, 4), sOutS = H.strip(svg, FPS, 22, 4);
            var tick = H.tick(svg), cross = H.cross(svg);

            /* the fox's stolen copies and its book */
            var copy = H.letter(svg, [[30, 20], [40], [34, 12]]);
            var book = H.el('g', { 'class': 'sc-book' }, svg);
            H.el('rect', { 'class': 'ol', x: -120, y: -78, width: 240, height: 156, rx: 6 }, book);
            H.el('path', { 'class': 'book-mid', d: 'M0-78v156' }, book);
            H.label(book, 'the fox’s book', 0, -52, 'sc-small');
            var rows = BOOK.map(function (p, i) {
                var y = -32 + i * 28;
                var hl = H.el('rect', { 'class': 'book-hl', x: -114, y: y - 2, width: 228, height: 26, rx: 4 }, book);
                var st = H.strip(book, SC.colours(SC.sha256(p)), 13, 2);
                H.at(st, -108, y + 4.5);
                H.label(book, p, -14, y + 19, 'sc-mono sc-book-pw', 'start');
                return hl;
            });
            var lStolen = H.label(svg, 'stolen!', 400, 238, 'sc-warn');
            var lFound = H.label(svg, 'found: fish123', 264, 314, 'sc-warn');
            var lNone = H.label(svg, 'not in the book', 264, 314, 'sc-ok');
            var lSalt = H.label(svg, 'salt: random letters', 300, 196, 'sc-small');
            var lCheck = H.label(svg, 'same blocks: welcome in', 566, 190, 'sc-small sc-ok');

            var CATM = { x: 210, y: 268 };
            function fly(n, a, b, k, h, s0, s1) { var p = H.arc(a.x, a.y, b.x, b.y, h, k); H.at(n, p.x, p.y, H.lerp(s0 || 1, s1 || 1, k)); }
            /* a strip pops out over the machine at a, then flies to the list from b (or stays when b is null) */
            function stripOut(n, t, a, b) {
                var up = H.seg(t, a, a + 0.5), k = b == null ? 0 : H.seg(t, b, b + 0.9);
                var x0 = OUT.x - n.w / 2, p = H.arc(x0, OUT.y - 20 * up, ROW.x + (n === sOutS ? 60 : 0), ROW.y, 40, k);
                H.at(n, p.x, p.y, 1);
                H.show(n, t > a ? 1 : 0);
            }

            return function (t) {
                var inK = H.seg(t, 0, 0.8);
                cat.place(105, 372, 1.6); dog.place(695, 372, 1.6, -1); fox.place(400, 372, 1.25);
                H.show(cat.g, inK); H.show(dog.g, inK); H.show(fox.g, inK);
                H.show(board, inK); H.show(mach, inK); H.show(lMach, inK);
                var a1 = S[1], a2 = S[2], a3 = S[3], a4 = S[4], a5 = S[5];
                var runs = [[a2 + 2, a2 + 3], [a2 + 5.6, a2 + 6.4], [a4 + 3, a4 + 4]], turn = 0, sh = 0;
                runs.forEach(function (r) { turn += H.lin(t, r[0], r[1]); sh += H.shake(t, r[0], r[1], 1.5); });
                H.at(mach, M.x + sh, M.y);
                gear.setAttribute('transform', 'translate(0 -52) rotate(' + (turn * 400).toFixed(1) + ')');

                /* ---- what the list holds: the password, then the fingerprint, then salt and fingerprint ---- */
                H.show(vText, t > a1 - 2.6 && t < a2 + 0.6 ? 1 - H.seg(t, a2, a2 + 0.5) : 0);
                H.at(vStrip, ROW.x, ROW.y);
                H.show(vStrip, t > a2 + 4 && t < a4 + 0.5 ? 1 - H.seg(t, a4, a4 + 0.5) : 0);
                H.show(vSalt, t > a4 + 4.9 ? 1 : 0);

                /* ---- 0: the careless site ---- */
                var k0 = H.seg(t, 2.4, 3.4);
                fly(t0, CATM, { x: 380, y: 88 }, k0, 80, 1, 0.9);
                H.show(t0, t > 0.8 && k0 < 1 ? H.pop(t, 0.8, 1.3) : 0);

                /* ---- 1 and 3 and 5: the fox steals a copy of the list ---- */
                var steal = t >= a5 ? a5 : t >= a3 ? a3 : a1;
                var sk = H.seg(t, steal + 0.3, steal + 1.3);
                fly(copy.g, { x: 400, y: 70 }, { x: 330, y: 410 }, sk, 30, 1, 0.45);
                H.show(copy.g, t > a1 + 0.3 && !(t > a2 && t < a3 + 0.3) && !(t > a4 && t < a5 + 0.3) ? 1 : 0);
                H.show(lStolen, H.seg(t, a1 + 1.4, a1 + 1.8) * (1 - H.seg(t, a2, a2 + 0.3)));

                /* ---- 2: the good site keeps fingerprints; logging in ---- */
                fly(t2, CATM, MOUTH, H.seg(t, a2 + 1, a2 + 2), 70, 1, 0.8);
                H.show(t2, t > a2 + 0.3 && t < a2 + 2 ? H.pop(t, a2 + 0.3, a2 + 0.8) : 0);
                stripOut(sOut, t, a2 + 3, a2 + 3.2);
                H.show(sOut, t > a2 + 3 && t < a2 + 4.1 ? 1 : 0);
                fly(tLog, CATM, MOUTH, H.seg(t, a2 + 4.6, a2 + 5.6), 70, 1, 0.8);
                H.show(tLog, t > a2 + 4.2 && t < a2 + 5.6 ? H.pop(t, a2 + 4.2, a2 + 4.6) : 0);
                stripOut(sLog, t, a2 + 6.4, null);
                H.show(sLog, t > a2 + 6.4 && t < a3 ? 1 : 0);
                H.at(tick, OUT.x - 104, OUT.y - 9, H.pop(t, a2 + 7, a2 + 7.4));
                H.show(tick, t > a2 + 7 && t < a3 ? 1 : 0);
                H.show(lCheck, H.seg(t, a2 + 7, a2 + 7.3) * (1 - H.seg(t, a3, a3 + 0.3)));

                /* ---- 3 and 5: the book ---- */
                var open = t >= a3 && t < a4 ? H.pop(t, a3 + 1.4, a3 + 1.9) : t >= a5 ? H.pop(t, a5 + 1.4, a5 + 1.9) : 0;
                H.at(book, 285, 196, open);
                H.show(book, open > 0 ? 1 : 0);
                var look = t >= a5 ? a5 : a3, scan = Math.floor(H.lin(t, look + 2.2, look + 3.6) * 4.99);
                var found = t < a4 && t > a3 + 3.6;
                rows.forEach(function (r, i) {
                    var on = found ? i === 2 : t > look + 2.2 && t < look + 3.7 && scan === i;
                    r.setAttribute('class', 'book-hl' + (on ? (found ? ' hit' : ' look') : ''));
                });
                H.show(lFound, t > a3 + 3.7 && t < a4 ? H.seg(t, a3 + 3.7, a3 + 4) : 0);
                H.show(lNone, H.seg(t, a5 + 3.8, a5 + 4.1));
                H.at(cross, 420, 130, H.pop(t, a5 + 3.9, a5 + 4.3));
                H.show(cross, t > a5 + 3.9 ? 1 : 0);

                /* ---- 4: salt ---- */
                var lift = H.seg(t, a4 + 2, a4 + 3);
                fly(t4, CATM, MOUTH, lift, 70, 1, 0.8);
                H.show(t4, t > a4 + 0.3 && t < a4 + 3 ? H.pop(t, a4 + 0.3, a4 + 0.8) : 0);
                fly(tS, { x: CATM.x, y: CATM.y - 44 }, MOUTH, lift, 90, 1, 0.8);
                H.show(tS, t > a4 + 0.9 && t < a4 + 3 ? H.pop(t, a4 + 0.9, a4 + 1.4) : 0);
                H.show(lSalt, H.seg(t, a4 + 1.1, a4 + 1.4) * (1 - H.seg(t, a4 + 2, a4 + 2.3)));
                stripOut(sOutS, t, a4 + 4, a4 + 4.2);
                if (t > a4 + 5.1) H.at(sOutS, ROW.x + 60, ROW.y);

                /* faces */
                var foxWin = (t > a1 + 1.3 && t < a2) || (t > a3 + 3.6 && t < a4);
                fox.mood(foxWin ? 'happy' : t > a5 + 4 ? 'sad' : '');
                cat.mood(foxWin ? 'sad' : (t > a2 + 7 && t < a3) || t > a5 + 4.2 ? 'happy' : '');
                dog.mood(t > a5 + 4.2 ? 'happy' : foxWin ? 'sad' : '');
                fox.tilt(open > 0 ? 10 : 0);
                cat.arm(-40 * (H.seg(t, 2.1, 2.4) - H.seg(t, 3.4, 3.7)));
            };
        }
    });
})();
