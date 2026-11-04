/* Sliding Kitten: the classic sliding tile puzzle with a picture of the cat. Five pictures (cosy room, garden, sunset
   sail, space, snow day) are drawn on a canvas, the cat itself is the one from the corner; the row of thumbnails above
   the board picks one (remembered in localStorage). 3x3 on easy, 4x4 on normal, 5x5 on hard. The shuffle is a random
   arrangement fixed up to be solvable. Tapping a tile in the gap's row or column slides the whole line.
   Hold "Peek" (or P) to see the whole picture; on easy and normal tiles in their home spot glow softly.
   Score = moves, best = fewest moves per difficulty. Shell API: assets/js/games/arcade.js. */
(function () {
    'use strict';
    var pick = { nums: true };                    /* tile numbers on or off, remembered while the page is open */

    /* grid[cell] = tile, n*n-1 is the gap. Any arrangement is solvable exactly when the parity of the permutation
       equals the parity of the gap's distance from its home corner (every move is one swap and one gap step) */
    function solvable(grid, n) {
        var seen = [], swaps = 0, g = grid.indexOf(n * n - 1);
        for (var i = 0; i < grid.length; i++) {
            if (seen[i]) continue;
            for (var j = i, len = 0; !seen[j]; j = grid[j], len++) seen[j] = true;
            swaps += len - 1;
        }
        return swaps % 2 === ((n - 1 - Math.floor(g / n)) + (n - 1 - g % n)) % 2;
    }
    function mix(n, rnd) {                        /* a random solvable arrangement, not too close to solved */
        var grid, k, far;
        do {
            grid = [];
            for (k = 0; k < n * n; k++) grid.push(k);
            for (k = grid.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), x = grid[k]; grid[k] = grid[j]; grid[j] = x; }
            if (!solvable(grid, n)) {             /* swapping two tiles (not the gap) flips the parity */
                var a = grid[0] === n * n - 1 || grid[1] === n * n - 1 ? 2 : 0, b = a + 1;
                if (grid[b] === n * n - 1) b++;
                x = grid[a]; grid[a] = grid[b]; grid[b] = x;
            }
            for (far = 0, k = 0; k < n * n; k++) if (grid[k] !== n * n - 1)
                far += Math.abs(Math.floor(grid[k] / n) - Math.floor(k / n)) + Math.abs(grid[k] % n - k % n);
        } while (far < n * n);
        return grid;
    }

    /* ---------- the pictures, each drawn on a canvas in a 1000 x 1000 space. The corner cat is laid on top of the
       picture at cat: [left, top, width] in percent (its height follows from the mascot's 110 x 90 shape) ---------- */
    function rng(seed) { return function () { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; }
    function twinkle(c, x, y, r, fill) {
        c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
        c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fillStyle = fill; c.fill();
    }
    function thread(c, pts, w) {                  /* a loose wool thread: a start point, then bezier triples */
        c.strokeStyle = '#d6336c'; c.lineWidth = w || 6;
        c.beginPath(); c.moveTo(pts[0], pts[1]);
        for (var i = 2; i < pts.length; i += 6) c.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]);
        c.stroke();
    }
    /* a ball of pink wool: shaded sphere, bands of wound strands clipped to it, outline and a highlight */
    function yarn(c, x, y, r) {
        var s = r / 82, g = c.createRadialGradient(x - r * 0.37, y - r * 0.39, 8 * s, x, y, r);
        g.addColorStop(0, '#ffdeeb'); g.addColorStop(0.45, '#f783ac'); g.addColorStop(0.85, '#e64980'); g.addColorStop(1, '#c2255c');
        blob(c, x, y, r, r, g);
        c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip();
        [[0.35, 0.18, 0], [1.3, 0.3, Math.PI], [2.25, 0.12, 0], [-0.75, 0.4, Math.PI]].forEach(function (band) {
            for (var j = 0; j < 5; j++) {
                var ry = r * (band[1] + j * 0.075), a0 = band[2];
                c.beginPath(); c.ellipse(x, y, r * 1.02, ry, band[0], a0, a0 + Math.PI);
                c.strokeStyle = 'rgba(166, 30, 77, .55)'; c.lineWidth = 3 * s; c.stroke();
                c.beginPath(); c.ellipse(x, y, r * 1.02, Math.max(1, ry - 2.5 * s), band[0], a0 + 0.15, a0 + Math.PI - 0.15);
                c.strokeStyle = 'rgba(255, 222, 235, .45)'; c.lineWidth = 1.5 * s; c.stroke();
            }
        });
        g = c.createRadialGradient(x - r * 0.3, y - r * 0.32, r * 0.4, x, y, r);   /* a little shade at the edge for roundness */
        g.addColorStop(0, 'rgba(194, 37, 92, 0)'); g.addColorStop(1, 'rgba(134, 20, 62, .32)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        c.restore();
        c.beginPath(); c.arc(x, y, r, 0, 7); c.strokeStyle = '#a61e4d'; c.lineWidth = 4 * s; c.stroke();
        c.save(); c.translate(x - r * 0.41, y - r * 0.49); c.rotate(-0.6); blob(c, 0, 0, 20 * s, 9 * s, 'rgba(255, 255, 255, .6)'); c.restore();
    }
    function cloud(c, x, y, s, fill) {
        blob(c, x, y, 70 * s, 30 * s, fill); blob(c, x - 34 * s, y + 4 * s, 40 * s, 24 * s, fill);
        blob(c, x + 10 * s, y - 18 * s, 44 * s, 32 * s, fill); blob(c, x + 44 * s, y + 2 * s, 38 * s, 22 * s, fill);
    }
    function flower(c, x, y, r, petal, mid) {
        for (var k = 0; k < 5; k++) {
            var a = k / 5 * Math.PI * 2;
            c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.36, a, 0, 7); c.fillStyle = petal; c.fill();
        }
        blob(c, x, y, r * 0.34, r * 0.34, mid || '#fcd34d');
    }
    function butterfly(c, x, y, s, a, w1, w2) {
        c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
        c.beginPath(); c.ellipse(-16, -12, 18, 24, -0.5, 0, 7); c.fillStyle = w1; c.fill();
        c.beginPath(); c.ellipse(16, -12, 18, 24, 0.5, 0, 7); c.fill();
        c.beginPath(); c.ellipse(-12, 14, 12, 15, 0.4, 0, 7); c.fillStyle = w2; c.fill();
        c.beginPath(); c.ellipse(12, 14, 12, 15, -0.4, 0, 7); c.fill();
        blob(c, -16, -14, 6, 7, 'rgba(255, 255, 255, .7)'); blob(c, 16, -14, 6, 7, 'rgba(255, 255, 255, .7)');
        blob(c, 0, 2, 4.5, 22, '#3b2a1e');
        c.strokeStyle = '#3b2a1e'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(-2, -18); c.quadraticCurveTo(-8, -32, -14, -34); c.moveTo(2, -18); c.quadraticCurveTo(8, -32, 14, -34); c.stroke();
        c.restore();
    }
    function pine(c, x, y, h, fill, snow) {       /* a fir tree standing at (x, y), three tiers */
        c.fillStyle = '#8a5a2f'; c.fillRect(x - h * 0.05, y - h * 0.16, h * 0.1, h * 0.16);
        for (var k = 0; k < 3; k++) {
            var top = y - h + k * h * 0.24, bot = y - h * 0.12 - (2 - k) * h * 0.2, w = h * (0.22 + k * 0.1);
            c.beginPath(); c.moveTo(x, top); c.lineTo(x + w, bot); c.lineTo(x - w, bot); c.closePath(); c.fillStyle = fill; c.fill();
            if (snow) {
                c.beginPath(); c.moveTo(x, top); c.lineTo(x + w * 0.42, top + (bot - top) * 0.42);
                c.quadraticCurveTo(x, top + (bot - top) * 0.55, x - w * 0.42, top + (bot - top) * 0.42); c.closePath(); c.fillStyle = '#fff'; c.fill();
            }
        }
    }
    function paw(c, x, y, s, a, fill) {
        c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = fill;
        c.beginPath(); c.ellipse(0, 4 * s, 7 * s, 6 * s, 0, 0, 7); c.fill();
        [[-7, -4], [-2.5, -8], [2.5, -8], [7, -4]].forEach(function (t) { c.beginPath(); c.ellipse(t[0] * s, t[1] * s, 2.4 * s, 3 * s, 0, 0, 7); c.fill(); });
        c.restore();
    }
    function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function blob(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
    function room(c) {
        var k, g;
        /* wall with soft stripes and dots */
        g = c.createLinearGradient(0, 0, 0, 700);
        g.addColorStop(0, '#d6e6fb'); g.addColorStop(1, '#fdf1e4');
        c.fillStyle = g; c.fillRect(0, 0, 1000, 700);
        c.fillStyle = 'rgba(255, 255, 255, .35)';
        for (k = 0; k < 1000; k += 80) c.fillRect(k, 0, 34, 700);
        c.fillStyle = 'rgba(246, 162, 58, .16)';
        for (k = 0; k < 12; k++) for (var m = 0; m < 9; m++) { c.beginPath(); c.arc(40 + k * 80 + (m % 2) * 40, 60 + m * 72, 5, 0, 7); c.fill(); }
        /* bunting along the top */
        var cols = ['#f6a23a', '#93c5fd', '#f9a8d4', '#86efac', '#fde68a', '#c4b5fd'];
        c.strokeStyle = '#8a6a50'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(-10, 30); c.quadraticCurveTo(500, 120, 1010, 30); c.stroke();
        for (k = 0; k < 13; k++) {
            var u = (k + 0.5) / 13, bx = -10 + 1020 * u, by = 30 + 2 * u * (1 - u) * 90;
            c.beginPath(); c.moveTo(bx - 30, by); c.lineTo(bx + 30, by); c.lineTo(bx, by + 62); c.closePath();
            c.fillStyle = cols[k % cols.length]; c.fill();
        }
        /* window with sky, sun and a cloud, curtains on the sides */
        rr(c, 60, 150, 290, 300, 26); c.fillStyle = '#fffaf2'; c.fill();
        g = c.createLinearGradient(0, 170, 0, 430); g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#e0f2fe');
        rr(c, 80, 170, 250, 260, 16); c.fillStyle = g; c.fill();
        c.save(); rr(c, 80, 170, 250, 260, 16); c.clip();
        blob(c, 265, 235, 42, 42, '#fde68a'); blob(c, 265, 235, 30, 30, '#fcd34d');
        blob(c, 150, 330, 50, 26, '#fff'); blob(c, 190, 316, 40, 30, '#fff'); blob(c, 225, 334, 36, 20, '#fff');
        blob(c, 205, 470, 190, 70, '#a7f3d0'); blob(c, 90, 460, 110, 60, '#86efac');
        c.restore();
        c.fillStyle = '#fffaf2'; c.fillRect(197, 170, 16, 260); c.fillRect(80, 292, 250, 14);
        rr(c, 44, 444, 322, 24, 10); c.fillStyle = '#e8c9a0'; c.fill();
        c.fillStyle = '#f9a8d4';
        c.beginPath(); c.moveTo(36, 130); c.lineTo(112, 130); c.quadraticCurveTo(70, 300, 104, 470); c.lineTo(36, 470); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(374, 130); c.lineTo(298, 130); c.quadraticCurveTo(340, 300, 306, 470); c.lineTo(374, 470); c.closePath(); c.fill();
        c.fillStyle = '#f472b6'; c.fillRect(30, 118, 350, 18);
        /* round clock in the middle of the wall */
        blob(c, 520, 210, 70, 70, '#f6a23a'); blob(c, 520, 210, 56, 56, '#fffaf2');
        c.strokeStyle = '#1e3a8a'; c.lineWidth = 7;
        c.beginPath(); c.moveTo(520, 210); c.lineTo(520, 172); c.moveTo(520, 210); c.lineTo(548, 222); c.stroke();
        for (k = 0; k < 12; k++) { var a = k / 6 * Math.PI; blob(c, 520 + Math.cos(a) * 45, 210 + Math.sin(a) * 45, 4, 4, '#94a3b8'); }
        /* shelf with books and a plant */
        var books = [[660, 110, '#93c5fd'], [700, 140, '#f6a23a'], [748, 120, '#f9a8d4'], [790, 100, '#86efac']];
        books.forEach(function (b) { rr(c, b[0], 360 - b[1], 36, b[1], 6); c.fillStyle = b[2]; c.fill(); c.fillStyle = 'rgba(255, 255, 255, .6)'; c.fillRect(b[0] + 8, 380 - b[1], 20, 8); });
        c.save(); c.translate(842, 360); c.rotate(-0.25); rr(c, 0, -110, 34, 110, 6); c.fillStyle = '#c4b5fd'; c.fill(); c.restore();
        rr(c, 620, 360, 350, 24, 8); c.fillStyle = '#c08348'; c.fill();
        c.fillStyle = '#a86a35'; c.fillRect(660, 384, 18, 40); c.fillRect(912, 384, 18, 40);
        c.fillStyle = '#4ade80';
        [[-0.9, 70], [-0.4, 85], [0, 95], [0.45, 80], [0.95, 66]].forEach(function (l) {
            c.save(); c.translate(925, 300); c.rotate(l[0]); c.beginPath(); c.ellipse(0, -l[1] / 2, 16, l[1] / 2, 0, 0, 7); c.fill(); c.restore();
        });
        c.fillStyle = '#e8794a'; c.beginPath(); c.moveTo(888, 296); c.lineTo(962, 296); c.lineTo(950, 360); c.lineTo(900, 360); c.closePath(); c.fill();
        c.fillStyle = '#f39a6b'; c.fillRect(884, 290, 82, 16);
        /* floor boards and the skirting */
        g = c.createLinearGradient(0, 700, 0, 1000); g.addColorStop(0, '#f2c58f'); g.addColorStop(1, '#e3a86e');
        c.fillStyle = g; c.fillRect(0, 700, 1000, 300);
        c.strokeStyle = 'rgba(160, 100, 50, .35)'; c.lineWidth = 4;
        for (k = 0; k < 5; k++) {
            var y = 700 + k * 62; c.beginPath(); c.moveTo(0, y); c.lineTo(1000, y); c.stroke();
            for (var x = (k % 2) * 130 + 60; x < 1000; x += 260) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 62); c.stroke(); }
        }
        c.fillStyle = '#fffaf2'; c.fillRect(0, 684, 1000, 26); c.fillStyle = 'rgba(160, 100, 50, .2)'; c.fillRect(0, 708, 1000, 6);
        /* a framed heart on the right, a scratching post on the left */
        rr(c, 862, 450, 108, 120, 12); c.fillStyle = '#c08348'; c.fill();
        rr(c, 874, 462, 84, 96, 6); c.fillStyle = '#fffaf2'; c.fill();
        c.fillStyle = '#f472b6'; c.beginPath(); c.moveTo(916, 536); c.bezierCurveTo(870, 506, 886, 470, 916, 490);
        c.bezierCurveTo(946, 470, 962, 506, 916, 536); c.fill();
        rr(c, 18, 520, 110, 22, 8); c.fillStyle = '#a5b4fc'; c.fill();
        c.fillStyle = '#e8c9a0'; c.fillRect(48, 542, 50, 170);
        c.strokeStyle = '#c9a274'; c.lineWidth = 5;
        for (k = 0; k < 8; k++) { c.beginPath(); c.moveTo(48, 556 + k * 20); c.lineTo(98, 548 + k * 20); c.stroke(); }
        rr(c, 10, 704, 126, 26, 10); c.fillStyle = '#a5b4fc'; c.fill();
        c.strokeStyle = '#f6a23a'; c.lineWidth = 5; c.beginPath(); c.moveTo(118, 542); c.quadraticCurveTo(130, 580, 116, 610); c.stroke();
        blob(c, 116, 616, 11, 11, '#f6a23a');
        /* striped rug and the cushion the cat sits on */
        blob(c, 500, 900, 430, 92, '#fb923c'); blob(c, 500, 900, 392, 76, '#fde68a'); blob(c, 500, 900, 352, 62, '#fdba74');
        blob(c, 500, 900, 300, 48, '#fef3c7');
        blob(c, 500, 862, 240, 58, '#e879a8'); blob(c, 500, 852, 228, 50, '#f9a8d4'); blob(c, 450, 838, 120, 18, 'rgba(255, 255, 255, .35)');
        /* food bowl on the left */
        blob(c, 120, 800, 92, 20, 'rgba(120, 70, 30, .2)');
        c.fillStyle = '#60a5fa'; c.beginPath(); c.moveTo(40, 760); c.lineTo(200, 760); c.lineTo(180, 800); c.lineTo(60, 800); c.closePath(); c.fill();
        blob(c, 120, 760, 80, 16, '#bfdbfe'); blob(c, 120, 758, 62, 10, '#c08348');
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(116, 782, 18, 9, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(130, 782); c.lineTo(142, 774); c.lineTo(142, 790); c.closePath(); c.fill();
        /* toy fish bottom left */
        c.save(); c.translate(150, 940); c.rotate(-0.2);
        c.fillStyle = '#2dd4bf'; c.beginPath(); c.ellipse(0, 0, 70, 34, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(60, 0); c.lineTo(112, -34); c.lineTo(112, 34); c.closePath(); c.fill();
        c.fillStyle = '#99f6e4'; c.beginPath(); c.ellipse(-8, 8, 40, 14, 0, 0, 7); c.fill();
        blob(c, -40, -6, 9, 9, '#fff'); blob(c, -42, -6, 5, 5, '#0f172a');
        c.strokeStyle = '#0d9488'; c.lineWidth = 5; c.beginPath(); c.moveTo(-6, -26); c.lineTo(6, 26); c.moveTo(16, -24); c.lineTo(28, 24); c.stroke();
        c.restore();
        /* yarn ball with a loose thread, bottom right */
        thread(c, [804, 950, 764, 992, 690, 988, 680, 952, 672, 918, 724, 914, 714, 948, 704, 988, 620, 992, 556, 974]);
        yarn(c, 860, 900, 82);
        /* a few sparkles in the air */
        c.fillStyle = '#fff';
        [[430, 430], [610, 470], [960, 560], [40, 600], [700, 610]].forEach(function (s) {
            c.beginPath(); c.moveTo(s[0], s[1] - 16); c.lineTo(s[0] + 5, s[1] - 5); c.lineTo(s[0] + 16, s[1]); c.lineTo(s[0] + 5, s[1] + 5);
            c.lineTo(s[0], s[1] + 16); c.lineTo(s[0] - 5, s[1] + 5); c.lineTo(s[0] - 16, s[1]); c.lineTo(s[0] - 5, s[1] - 5); c.closePath(); c.fill();
        });
    }

    /* sunny garden: tree with a swing, picket fence, flower beds, butterflies, a balloon and a smiling sun */
    function garden(c) {
        var k, g, R = rng(11), cols = ['#f472b6', '#fde047', '#c4b5fd', '#fff', '#fb923c', '#f87171', '#93c5fd'];
        g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#93cdfb'); g.addColorStop(1, '#e8f6ff');
        c.fillStyle = g; c.fillRect(0, 0, 1000, 660);
        c.strokeStyle = '#fcd34d'; c.lineWidth = 12;
        for (k = 0; k < 12; k++) { var a = k / 6 * Math.PI; c.beginPath(); c.moveTo(860 + Math.cos(a) * 96, 130 + Math.sin(a) * 96); c.lineTo(860 + Math.cos(a) * 124, 130 + Math.sin(a) * 124); c.stroke(); }
        blob(c, 860, 130, 80, 80, '#fde68a'); blob(c, 860, 130, 64, 64, '#fcd34d');
        blob(c, 838, 120, 7, 9, '#b45309'); blob(c, 882, 120, 7, 9, '#b45309'); blob(c, 826, 146, 10, 6, '#fb923c'); blob(c, 894, 146, 10, 6, '#fb923c');
        c.strokeStyle = '#b45309'; c.lineWidth = 6; c.beginPath(); c.arc(860, 138, 20, 0.3, Math.PI - 0.3); c.stroke();
        cloud(c, 200, 110, 1, '#fff'); cloud(c, 560, 70, 0.75, '#fff'); cloud(c, 420, 250, 0.55, 'rgba(255, 255, 255, .9)');
        /* hot air balloon */
        c.save(); c.beginPath(); c.ellipse(660, 270, 62, 74, 0, 0, 7); c.clip();
        for (k = 0; k < 6; k++) { c.fillStyle = ['#f9a8d4', '#fde68a', '#93c5fd'][k % 3]; c.fillRect(598 + k * 21, 190, 21, 160); }
        c.restore();
        c.strokeStyle = '#8a5a2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(616, 318); c.lineTo(645, 372); c.moveTo(704, 318); c.lineTo(675, 372); c.stroke();
        rr(c, 640, 368, 40, 30, 6); c.fillStyle = '#c08348'; c.fill();
        /* hills and the fence */
        blob(c, 240, 660, 420, 170, '#c6f6d5'); blob(c, 800, 670, 400, 150, '#a7f3d0');
        c.fillStyle = '#fffaf2';
        c.fillRect(0, 590, 1000, 16); c.fillRect(0, 640, 1000, 16);
        for (k = 0; k < 19; k++) { c.beginPath(); c.moveTo(k * 56 + 4, 690); c.lineTo(k * 56 + 4, 572); c.lineTo(k * 56 + 20, 556); c.lineTo(k * 56 + 36, 572); c.lineTo(k * 56 + 36, 690); c.closePath(); c.fill(); }
        /* tree with apples and a swing */
        rr(c, 92, 300, 54, 400, 22); c.fillStyle = '#a86a35'; c.fill();
        c.strokeStyle = '#a86a35'; c.lineWidth = 26; c.beginPath(); c.moveTo(130, 360); c.quadraticCurveTo(200, 330, 268, 344); c.stroke();
        blob(c, 120, 230, 128, 104, '#4ade80'); blob(c, 50, 300, 84, 70, '#22c55e'); blob(c, 196, 296, 92, 70, '#34d399'); blob(c, 126, 152, 90, 72, '#86efac');
        [[70, 220], [150, 190], [200, 260], [96, 300], [40, 270], [170, 120]].forEach(function (p) { blob(c, p[0], p[1], 13, 13, '#f87171'); blob(c, p[0] - 4, p[1] - 4, 4, 4, '#fecaca'); });
        c.strokeStyle = '#8a5a2f'; c.lineWidth = 4; c.beginPath(); c.moveTo(196, 346); c.lineTo(196, 530); c.moveTo(254, 344); c.lineTo(254, 530); c.stroke();
        rr(c, 180, 526, 90, 18, 6); c.fillStyle = '#f6a23a'; c.fill();
        /* birdhouse on a post */
        c.fillStyle = '#a86a35'; c.fillRect(872, 420, 22, 270);
        rr(c, 830, 330, 106, 100, 10); c.fillStyle = '#f9a8d4'; c.fill();
        c.fillStyle = '#e8590c'; c.beginPath(); c.moveTo(816, 340); c.lineTo(883, 280); c.lineTo(950, 340); c.closePath(); c.fill();
        blob(c, 883, 372, 18, 18, '#5b3a22'); c.fillStyle = '#8a5a2f'; c.fillRect(876, 400, 14, 6);
        blob(c, 925, 268, 14, 11, '#60a5fa'); blob(c, 936, 262, 8, 8, '#60a5fa'); c.fillStyle = '#f59e0b'; c.beginPath(); c.moveTo(943, 262); c.lineTo(954, 265); c.lineTo(943, 268); c.fill();
        /* lawn with blades of grass and stepping stones */
        g = c.createLinearGradient(0, 660, 0, 1000); g.addColorStop(0, '#a3e8b0'); g.addColorStop(1, '#55c977');
        c.fillStyle = g; c.fillRect(0, 680, 1000, 320);
        c.strokeStyle = 'rgba(34, 139, 74, .45)'; c.lineWidth = 4;
        for (k = 0; k < 120; k++) { var gx = R() * 1000, gy = 700 + R() * 300; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx - 4, gy - 14); c.moveTo(gx + 6, gy); c.lineTo(gx + 9, gy - 12); c.stroke(); }
        [[500, 965, 76, 24], [478, 912, 60, 18], [522, 872, 44, 13]].forEach(function (s) { blob(c, s[0], s[1] + 4, s[2], s[3], '#d9c7a8'); blob(c, s[0], s[1], s[2], s[3], '#f3e8d2'); });
        blob(c, 500, 862, 190, 24, 'rgba(21, 128, 61, .22)');
        /* flower beds left and right */
        [[0, 330], [670, 1000]].forEach(function (bed) {
            for (var f = 0; f < 15; f++) {
                var fx = bed[0] + 20 + R() * (bed[1] - bed[0] - 40), fy = 730 + R() * 250, fr = 18 + R() * 12;
                c.strokeStyle = '#16a34a'; c.lineWidth = 5; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy + 40); c.stroke();
                c.beginPath(); c.ellipse(fx + 10, fy + 26, 10, 5, -0.6, 0, 7); c.fillStyle = '#22c55e'; c.fill();
                flower(c, fx, fy, fr, cols[f % cols.length], f % 3 ? '#fcd34d' : '#fb923c');
            }
        });
        /* toadstools, watering can, butterflies and a bee */
        [[300, 690, 1], [336, 702, 0.7]].forEach(function (m) {
            c.fillStyle = '#fff7ed'; c.fillRect(m[0] - 8 * m[2], m[1], 16 * m[2], 30 * m[2]);
            c.beginPath(); c.ellipse(m[0], m[1], 30 * m[2], 22 * m[2], 0, Math.PI, 0); c.fillStyle = '#ef4444'; c.fill();
            blob(c, m[0] - 10 * m[2], m[1] - 10 * m[2], 5 * m[2], 4 * m[2], '#fff'); blob(c, m[0] + 9 * m[2], m[1] - 13 * m[2], 4 * m[2], 3 * m[2], '#fff');
        });
        c.fillStyle = '#60a5fa'; rr(c, 790, 860, 110, 90, 18); c.fill();
        c.strokeStyle = '#60a5fa'; c.lineWidth = 14; c.beginPath(); c.moveTo(796, 890); c.lineTo(730, 840); c.stroke();
        c.lineWidth = 10; c.beginPath(); c.arc(845, 860, 34, Math.PI, 0); c.stroke();
        blob(c, 726, 836, 14, 8, '#3b82f6'); blob(c, 820, 900, 16, 12, 'rgba(255, 255, 255, .45)');
        butterfly(c, 330, 330, 1.1, -0.3, '#f9a8d4', '#c4b5fd');
        butterfly(c, 740, 470, 0.9, 0.4, '#fde68a', '#fb923c');
        butterfly(c, 600, 120, 0.7, 0.2, '#93c5fd', '#a7f3d0');
        c.save(); c.translate(560, 520); c.rotate(-0.2);
        blob(c, -6, -16, 14, 10, 'rgba(255, 255, 255, .85)'); blob(c, 8, -16, 14, 10, 'rgba(255, 255, 255, .85)');
        blob(c, 0, 0, 24, 16, '#fcd34d');
        c.fillStyle = '#3b2a1e'; c.fillRect(-8, -15, 6, 30); c.fillRect(6, -15, 6, 30); blob(c, -20, -2, 4, 4, '#3b2a1e');
        c.restore();
        c.setLineDash([2, 12]); c.strokeStyle = 'rgba(59, 42, 30, .4)'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(590, 528); c.bezierCurveTo(640, 560, 640, 470, 700, 500); c.stroke(); c.setLineDash([]);
    }

    /* sunset sail: the cat on a little sailing boat, a lighthouse, an island with a palm, fish and gulls */
    function sea(c) {
        var k, g, R = rng(5);
        g = c.createLinearGradient(0, 0, 0, 560);
        g.addColorStop(0, '#6f63c9'); g.addColorStop(0.35, '#b99ae8'); g.addColorStop(0.65, '#f7a8cf'); g.addColorStop(0.9, '#fdba74'); g.addColorStop(1, '#fde68a');
        c.fillStyle = g; c.fillRect(0, 0, 1000, 562);
        for (k = 0; k < 26; k++) { var sx = R() * 1000, sy = R() * 200; blob(c, sx, sy, 2 + R() * 2.5, 2 + R() * 2.5, 'rgba(255, 255, 255, .8)'); }
        twinkle(c, 120, 70, 16, '#fff'); twinkle(c, 520, 40, 12, '#fff'); twinkle(c, 920, 110, 14, '#fff');
        g = c.createRadialGradient(620, 560, 40, 620, 560, 300); g.addColorStop(0, 'rgba(255, 241, 184, .9)'); g.addColorStop(1, 'rgba(255, 241, 184, 0)');
        c.fillStyle = g; c.fillRect(300, 250, 640, 312);
        c.save(); c.beginPath(); c.rect(0, 0, 1000, 562); c.clip();
        blob(c, 620, 562, 112, 112, '#fff1b8'); blob(c, 620, 562, 92, 92, '#fcd34d');
        c.restore();
        [[180, 190, 1.1], [720, 150, 0.9], [420, 320, 0.7], [880, 340, 0.6], [80, 380, 0.5]].forEach(function (p) {
            blob(c, p[0], p[1], 110 * p[2], 18 * p[2], 'rgba(251, 207, 232, .9)'); blob(c, p[0] - 20 * p[2], p[1] - 12 * p[2], 70 * p[2], 16 * p[2], 'rgba(255, 228, 242, .95)');
        });
        c.strokeStyle = '#4c3d8f'; c.lineWidth = 5;
        [[300, 250, 1], [356, 226, 0.8], [780, 250, 0.9], [470, 180, 0.6]].forEach(function (b) {
            c.beginPath(); c.moveTo(b[0] - 20 * b[2], b[1]); c.quadraticCurveTo(b[0] - 10 * b[2], b[1] - 12 * b[2], b[0], b[1]);
            c.quadraticCurveTo(b[0] + 10 * b[2], b[1] - 12 * b[2], b[0] + 20 * b[2], b[1]); c.stroke();
        });
        /* island with a palm tree */
        blob(c, 150, 566, 190, 40, '#7a5fb8'); blob(c, 150, 556, 120, 22, '#f3c995');
        c.strokeStyle = '#8a5a2f'; c.lineWidth = 14; c.beginPath(); c.moveTo(150, 556); c.quadraticCurveTo(140, 470, 178, 410); c.stroke();
        c.fillStyle = '#3f9a6a';
        [-2.6, -2.1, -1.4, -0.8, -0.3].forEach(function (a) {
            c.save(); c.translate(178, 410); c.rotate(a); c.beginPath(); c.ellipse(52, 0, 56, 14, 0.2, 0, 7); c.fill(); c.restore();
        });
        blob(c, 170, 420, 9, 9, '#8a5a2f'); blob(c, 186, 424, 9, 9, '#8a5a2f');
        /* lighthouse on its rocks */
        blob(c, 880, 580, 120, 44, '#5b4d9a'); blob(c, 830, 566, 60, 34, '#6d5bb3'); blob(c, 940, 570, 50, 30, '#6d5bb3');
        c.save(); c.beginPath(); c.moveTo(846, 572); c.lineTo(914, 572); c.lineTo(898, 360); c.lineTo(862, 360); c.closePath(); c.clip();
        c.fillStyle = '#fffaf2'; c.fillRect(840, 350, 80, 230);
        c.fillStyle = '#f43f5e'; for (k = 0; k < 4; k++) c.fillRect(840, 380 + k * 54, 80, 26);
        c.restore();
        g = c.createLinearGradient(880, 330, 1000, 300); g.addColorStop(0, 'rgba(255, 241, 184, .8)'); g.addColorStop(1, 'rgba(255, 241, 184, 0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(880, 330); c.lineTo(1000, 270); c.lineTo(1000, 380); c.closePath(); c.fill();
        rr(c, 856, 312, 48, 48, 8); c.fillStyle = '#fde68a'; c.fill();
        c.fillStyle = '#f43f5e'; c.beginPath(); c.moveTo(846, 316); c.lineTo(880, 280); c.lineTo(914, 316); c.closePath(); c.fill();
        c.fillStyle = '#4c3d8f'; c.fillRect(850, 356, 60, 8);
        /* the sea, the sun's reflection and rows of little waves */
        g = c.createLinearGradient(0, 560, 0, 1000);
        g.addColorStop(0, '#f6b3b0'); g.addColorStop(0.25, '#a98ddb'); g.addColorStop(0.6, '#5b80d0'); g.addColorStop(1, '#2f5aa5');
        c.fillStyle = g; c.fillRect(0, 588, 1000, 412);
        for (k = 0; k < 9; k++) { var w = 150 - k * 14; rr(c, 620 - w / 2 + (k % 2) * 16, 600 + k * 20, w, 8, 4); c.fillStyle = 'rgba(253, 230, 138, ' + (0.85 - k * 0.08) + ')'; c.fill(); }
        c.strokeStyle = 'rgba(255, 255, 255, .45)'; c.lineWidth = 4;
        for (var row = 0; row < 10; row++) {
            var wy = 640 + row * 40, off = (row % 2) * 45;
            for (var wx = -40 + off; wx < 1040; wx += 90 + row * 4) { c.beginPath(); c.arc(wx, wy, 16 + row, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
        }
        /* a fish leaps, a buoy bobs */
        c.setLineDash([3, 12]); c.strokeStyle = 'rgba(255, 255, 255, .7)'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(60, 990); c.quadraticCurveTo(130, 820, 220, 960); c.stroke(); c.setLineDash([]);
        c.save(); c.translate(150, 890); c.rotate(0.5);
        c.fillStyle = '#fb923c'; c.beginPath(); c.ellipse(0, 0, 40, 18, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(-34, 0); c.lineTo(-62, -18); c.lineTo(-62, 18); c.closePath(); c.fill();
        blob(c, 22, -4, 6, 6, '#fff'); blob(c, 23, -4, 3, 3, '#0f172a'); c.restore();
        blob(c, 220, 965, 30, 8, 'rgba(255, 255, 255, .6)'); blob(c, 60, 992, 24, 6, 'rgba(255, 255, 255, .6)');
        c.save(); c.translate(910, 880); c.rotate(0.15);
        c.save(); c.beginPath(); c.ellipse(0, 0, 34, 42, 0, 0, 7); c.clip(); c.fillStyle = '#fff'; c.fillRect(-40, -50, 80, 100);
        c.fillStyle = '#f43f5e'; c.fillRect(-40, -50, 80, 28); c.fillRect(-40, 2, 80, 22); c.restore();
        c.fillStyle = '#4c3d8f'; c.fillRect(-3, -86, 6, 46); c.fillStyle = '#fde68a'; c.beginPath(); c.moveTo(3, -86); c.lineTo(34, -76); c.lineTo(3, -64); c.fill();
        c.restore();
        blob(c, 910, 926, 48, 8, 'rgba(255, 255, 255, .5)');
        /* the boat: fishing rod at the bow, mast and sail at the stern */
        c.strokeStyle = '#8a5a2f'; c.lineWidth = 7; c.beginPath(); c.moveTo(300, 800); c.lineTo(110, 600); c.stroke();
        c.strokeStyle = 'rgba(255, 255, 255, .8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(110, 600); c.quadraticCurveTo(70, 700, 86, 800); c.stroke();
        blob(c, 86, 806, 11, 11, '#f43f5e'); c.save(); c.beginPath(); c.rect(70, 806, 40, 20); c.clip(); blob(c, 86, 806, 11, 11, '#fff'); c.restore();
        c.fillStyle = '#8a5a2f'; c.fillRect(694, 330, 12, 470);
        c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(714, 350); c.lineTo(714, 770); c.quadraticCurveTo(820, 760, 900, 770); c.closePath(); c.fill();
        c.strokeStyle = '#f2d9b3'; c.lineWidth = 4; c.beginPath(); c.moveTo(714, 490); c.lineTo(810, 500); c.moveTo(714, 630); c.lineTo(860, 640); c.stroke();
        c.fillStyle = '#f472b6'; c.beginPath(); c.moveTo(706, 330); c.lineTo(760, 344); c.lineTo(706, 360); c.fill();
        c.beginPath(); c.moveTo(220, 790); c.lineTo(770, 790); c.quadraticCurveTo(750, 900, 650, 912); c.lineTo(330, 912); c.quadraticCurveTo(240, 900, 220, 790); c.closePath();
        c.fillStyle = '#f6a23a'; c.fill();
        c.save(); c.clip(); c.fillStyle = '#fff7ed'; c.fillRect(200, 820, 600, 22); c.fillStyle = '#e8590c'; c.fillRect(200, 880, 600, 40); c.restore();
        [[380, 862], [500, 862], [620, 862]].forEach(function (p) { blob(c, p[0], p[1], 15, 15, '#c2410c'); blob(c, p[0], p[1], 10, 10, '#fde68a'); });
        rr(c, 212, 780, 566, 16, 8); c.fillStyle = '#c2410c'; c.fill();
        c.strokeStyle = 'rgba(255, 255, 255, .8)'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(250, 916); for (k = 0; k < 9; k++) c.quadraticCurveTo(275 + k * 55, 932, 300 + k * 55, 916); c.stroke();
    }

    /* space trip: the cat on a little lilac moon among planets, a rocket, a comet and a floating yarn ball */
    function space(c) {
        var k, g, R = rng(23);
        g = c.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, '#26266a'); g.addColorStop(0.55, '#3d3080'); g.addColorStop(1, '#5c4396');
        c.fillStyle = g; c.fillRect(0, 0, 1000, 1000);
        [[240, 460, 320, 'rgba(244, 114, 182, .22)'], [790, 300, 280, 'rgba(45, 212, 191, .16)'], [600, 660, 240, 'rgba(167, 139, 250, .25)']].forEach(function (n) {
            g = c.createRadialGradient(n[0], n[1], 0, n[0], n[1], n[2]); g.addColorStop(0, n[3]); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            c.fillStyle = g; c.fillRect(n[0] - n[2], n[1] - n[2], n[2] * 2, n[2] * 2);
        });
        for (k = 0; k < 170; k++) { var r = 1.2 + R() * 2.8; blob(c, R() * 1000, R() * 860, r, r, 'rgba(255, 255, 255, ' + (0.45 + R() * 0.55) + ')'); }
        for (k = 0; k < 14; k++) twinkle(c, R() * 1000, R() * 760, 8 + R() * 10, ['#fff', '#fde68a', '#bae6fd'][k % 3]);
        /* comet */
        g = c.createLinearGradient(300, 50, 470, 130); g.addColorStop(0, 'rgba(186, 230, 253, 0)'); g.addColorStop(1, 'rgba(186, 230, 253, .9)');
        c.strokeStyle = g; c.lineWidth = 18; c.beginPath(); c.moveTo(300, 50); c.lineTo(462, 126); c.stroke();
        blob(c, 470, 130, 16, 16, '#fff'); blob(c, 470, 130, 26, 26, 'rgba(255, 255, 255, .25)');
        /* ringed planet */
        c.save(); c.translate(210, 220); c.rotate(-0.35);
        c.strokeStyle = 'rgba(253, 230, 138, .9)'; c.lineWidth = 14; c.beginPath(); c.ellipse(0, 0, 172, 42, 0, Math.PI, Math.PI * 2); c.stroke();
        g = c.createRadialGradient(-30, -34, 10, 0, 0, 96); g.addColorStop(0, '#ffe2c2'); g.addColorStop(1, '#f08c4a');
        blob(c, 0, 0, 96, 96, g);
        c.save(); c.beginPath(); c.arc(0, 0, 96, 0, 7); c.clip(); c.fillStyle = 'rgba(214, 51, 108, .22)';
        c.fillRect(-100, -40, 200, 16); c.fillRect(-100, 6, 200, 24); c.fillRect(-100, 50, 200, 12); c.restore();
        c.strokeStyle = 'rgba(253, 230, 138, .95)'; c.beginPath(); c.ellipse(0, 0, 172, 42, 0, 0, Math.PI); c.stroke();
        c.restore();
        /* moon with craters, a blue planet and a little pink one */
        g = c.createRadialGradient(810, 150, 10, 830, 170, 64); g.addColorStop(0, '#f5f1ff'); g.addColorStop(1, '#c9bdf2');
        blob(c, 830, 170, 64, 64, g);
        [[810, 150, 14], [856, 188, 18], [826, 206, 9], [858, 140, 8]].forEach(function (p) { blob(c, p[0], p[1], p[2], p[2] * 0.85, '#b3a5e8'); });
        g = c.createRadialGradient(886, 540, 6, 900, 560, 52); g.addColorStop(0, '#bae6fd'); g.addColorStop(1, '#3b82f6');
        blob(c, 900, 560, 52, 52, g);
        c.strokeStyle = 'rgba(255, 255, 255, .6)'; c.lineWidth = 6;
        c.beginPath(); c.arc(900, 600, 50, Math.PI * 1.2, Math.PI * 1.7); c.stroke(); c.beginPath(); c.arc(900, 520, 46, Math.PI * 0.25, Math.PI * 0.7); c.stroke();
        blob(c, 80, 600, 32, 32, '#fda4af'); blob(c, 72, 592, 10, 8, '#fecdd3');
        /* satellite */
        c.save(); c.translate(140, 430); c.rotate(0.4);
        c.fillStyle = '#60a5fa'; c.fillRect(-90, -16, 60, 32); c.fillRect(30, -16, 60, 32);
        c.strokeStyle = '#bfdbfe'; c.lineWidth = 2; for (k = 0; k < 3; k++) { c.strokeRect(-90 + k * 20, -16, 20, 32); c.strokeRect(30 + k * 20, -16, 20, 32); }
        rr(c, -30, -22, 60, 44, 8); c.fillStyle = '#fcd34d'; c.fill();
        c.strokeStyle = '#e2e8f0'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -22); c.lineTo(0, -48); c.stroke(); blob(c, 0, -52, 7, 7, '#f43f5e');
        c.restore();
        /* rocket with a flame */
        c.save(); c.translate(740, 370); c.rotate(0.6);
        blob(c, 0, 92, 18, 40, '#fb923c'); blob(c, 0, 86, 10, 24, '#fde68a');
        c.fillStyle = '#f43f5e'; c.beginPath(); c.moveTo(-28, 40); c.lineTo(-50, 80); c.lineTo(-24, 70); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(28, 40); c.lineTo(50, 80); c.lineTo(24, 70); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(-30, 66); c.quadraticCurveTo(-36, -30, 0, -80); c.quadraticCurveTo(36, -30, 30, 66); c.closePath(); c.fillStyle = '#fffaf2'; c.fill();
        c.save(); c.clip(); c.fillStyle = '#f43f5e'; c.fillRect(-40, -90, 80, 40); c.restore();
        blob(c, 0, 0, 16, 16, '#1e3a8a'); blob(c, 0, 0, 11, 11, '#7dd3fc'); blob(c, -4, -4, 4, 4, '#fff');
        c.restore();
        /* a yarn ball drifting by, its thread trailing */
        thread(c, [196, 716, 150, 760, 170, 800, 110, 830, 70, 850, 60, 900, 20, 910], 5);
        yarn(c, 230, 690, 42);
        /* the little moon the cat sits on, with craters, crystals and a flag */
        g = c.createLinearGradient(0, 780, 0, 1000); g.addColorStop(0, '#ddd2ff'); g.addColorStop(1, '#a596e2');
        c.beginPath(); c.arc(500, 1580, 800, 0, 7); c.fillStyle = g; c.fill();
        [[150, 920, 50], [330, 860, 30], [640, 950, 42], [820, 880, 34], [480, 985, 26], [920, 960, 30], [60, 990, 26]].forEach(function (p) {
            blob(c, p[0], p[1], p[2], p[2] * 0.36, '#9f8fdd'); blob(c, p[0], p[1] + p[2] * 0.08, p[2] * 0.8, p[2] * 0.26, '#b9abef');
        });
        blob(c, 490, 812, 170, 18, 'rgba(76, 61, 143, .3)');
        [[210, 850, 26, '#5eead4'], [240, 862, 18, '#f9a8d4'], [184, 866, 16, '#c4b5fd']].forEach(function (s) {
            c.fillStyle = s[3]; c.beginPath(); c.moveTo(s[0], s[1] - s[2] * 2); c.lineTo(s[0] + s[2] * 0.6, s[1]); c.lineTo(s[0] - s[2] * 0.6, s[1]); c.closePath(); c.fill();
            c.fillStyle = 'rgba(255, 255, 255, .5)'; c.beginPath(); c.moveTo(s[0], s[1] - s[2] * 2); c.lineTo(s[0] + s[2] * 0.6, s[1]); c.lineTo(s[0], s[1]); c.closePath(); c.fill();
        });
        c.fillStyle = '#e2e8f0'; c.fillRect(770, 690, 7, 130);
        c.fillStyle = '#f472b6'; c.beginPath(); c.moveTo(777, 694); c.quadraticCurveTo(820, 680, 860, 700); c.lineTo(860, 752); c.quadraticCurveTo(820, 734, 777, 748); c.closePath(); c.fill();
        paw(c, 818, 722, 2, 0, '#fff');
    }

    /* snow day: a cabin with a warm window, mountains and firs, a snowman, a sled with a yarn ball, paw prints */
    function snow(c) {
        var k, g, R = rng(31);
        g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#a3c4f0'); g.addColorStop(1, '#e6f0fd');
        c.fillStyle = g; c.fillRect(0, 0, 1000, 660);
        g = c.createRadialGradient(780, 120, 10, 780, 120, 150); g.addColorStop(0, 'rgba(255, 247, 214, .95)'); g.addColorStop(1, 'rgba(255, 247, 214, 0)');
        c.fillStyle = g; c.fillRect(630, 0, 300, 270); blob(c, 780, 120, 50, 50, '#fff7d6');
        cloud(c, 470, 90, 0.7, 'rgba(255, 255, 255, .85)'); cloud(c, 120, 60, 0.55, 'rgba(255, 255, 255, .8)');
        /* mountains with snowy tops */
        [[0, 580, 230, 250, 470, '#c3cdf7'], [300, 580, 570, 190, 840, '#aebdf2'], [640, 580, 870, 270, 1100, '#c3cdf7']].forEach(function (m) {
            c.beginPath(); c.moveTo(m[0], m[1]); c.lineTo(m[2], m[3]); c.lineTo(m[4], m[1]); c.closePath(); c.fillStyle = m[5]; c.fill();
            var h = (m[1] - m[3]) * 0.28, wl = (m[2] - m[0]) * 0.28, wr = (m[4] - m[2]) * 0.28;
            c.beginPath(); c.moveTo(m[2], m[3]); c.lineTo(m[2] + wr, m[3] + h); c.lineTo(m[2] + wr * 0.4, m[3] + h * 0.8); c.lineTo(m[2], m[3] + h * 1.05);
            c.lineTo(m[2] - wl * 0.45, m[3] + h * 0.8); c.lineTo(m[2] - wl, m[3] + h); c.closePath(); c.fillStyle = '#fff'; c.fill();
        });
        for (k = 0; k < 16; k++) pine(c, 330 + k * 44 + (k % 2) * 10, 640 + (k % 3) * 6, 90 + (k % 4) * 16, k % 2 ? '#5aa58a' : '#4a9a80', true);
        /* snowy ground with soft blue shadows */
        c.beginPath(); c.moveTo(0, 650); c.quadraticCurveTo(250, 610, 500, 660); c.quadraticCurveTo(760, 700, 1000, 640); c.lineTo(1000, 1000); c.lineTo(0, 1000); c.closePath();
        c.fillStyle = '#f7fbff'; c.fill();
        c.strokeStyle = '#dbe7fb'; c.lineWidth = 14;
        [[0, 760, 300, 720, 520, 770], [380, 850, 640, 800, 1000, 860], [0, 960, 260, 920, 560, 990]].forEach(function (w) {
            c.beginPath(); c.moveTo(w[0], w[1]); c.quadraticCurveTo(w[2], w[3], w[4], w[5]); c.stroke();
        });
        /* cabin with icicles, a glowing window and smoke from the chimney */
        c.fillStyle = '#c97b4a'; c.fillRect(60, 480, 260, 210);
        c.strokeStyle = '#a65f34'; c.lineWidth = 5; for (k = 0; k < 6; k++) { c.beginPath(); c.moveTo(60, 512 + k * 34); c.lineTo(320, 512 + k * 34); c.stroke(); }
        rr(c, 236, 380, 40, 80, 6); c.fillStyle = '#a65f34'; c.fill(); rr(c, 230, 370, 52, 18, 8); c.fillStyle = '#fff'; c.fill();
        [[262, 330, 20], [290, 280, 26], [272, 222, 30], [306, 168, 34]].forEach(function (s) { blob(c, s[0], s[1], s[2], s[2], 'rgba(255, 255, 255, .8)'); });
        c.fillStyle = '#8b4a2b'; c.beginPath(); c.moveTo(34, 492); c.lineTo(190, 390); c.lineTo(346, 492); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(26, 498); c.lineTo(190, 380); c.lineTo(354, 498); c.quadraticCurveTo(190, 470, 26, 498); c.fill();
        c.fillStyle = '#e0f2fe'; for (k = 0; k < 9; k++) { c.beginPath(); c.moveTo(56 + k * 32, 496); c.lineTo(70 + k * 32, 496); c.lineTo(63 + k * 32, 520 + (k % 3) * 8); c.fill(); }
        g = c.createRadialGradient(140, 570, 6, 140, 570, 90); g.addColorStop(0, 'rgba(255, 210, 122, .55)'); g.addColorStop(1, 'rgba(255, 210, 122, 0)');
        c.fillStyle = g; c.fillRect(40, 470, 200, 200);
        rr(c, 100, 530, 80, 76, 8); c.fillStyle = '#ffd27a'; c.fill();
        c.fillStyle = '#a65f34'; c.fillRect(136, 530, 8, 76); c.fillRect(100, 564, 80, 8);
        rr(c, 220, 570, 64, 120, 10); c.fillStyle = '#7a3f22'; c.fill(); blob(c, 270, 632, 5, 5, '#fcd34d');
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(190, 694, 180, 22, 0, 0, 7); c.fill();
        /* snowman with hat and scarf, fir trees behind */
        pine(c, 965, 700, 270, '#2f7d62', true); pine(c, 720, 660, 170, '#3a8b6f', true);
        blob(c, 840, 806, 90, 16, '#dbe7fb');
        blob(c, 840, 760, 74, 70, '#fff'); blob(c, 840, 664, 56, 52, '#fff'); blob(c, 840, 584, 40, 38, '#fff');
        blob(c, 860, 760, 40, 50, 'rgba(219, 231, 251, .7)');
        c.strokeStyle = '#8a5a2f'; c.lineWidth = 7; c.beginPath(); c.moveTo(796, 660); c.lineTo(730, 610); c.lineTo(716, 620); c.moveTo(884, 660); c.lineTo(950, 618); c.stroke();
        rr(c, 806, 520, 68, 14, 6); c.fillStyle = '#1e3a8a'; c.fill(); rr(c, 818, 478, 44, 48, 6); c.fill(); c.fillStyle = '#f43f5e'; c.fillRect(818, 514, 44, 8);
        blob(c, 828, 578, 5, 5, '#0f172a'); blob(c, 852, 578, 5, 5, '#0f172a');
        c.fillStyle = '#fb923c'; c.beginPath(); c.moveTo(838, 590); c.lineTo(878, 600); c.lineTo(838, 600); c.closePath(); c.fill();
        [640, 668, 696, 730, 762].forEach(function (y) { blob(c, 840, y, 5, 5, '#334155'); });
        c.fillStyle = '#f43f5e'; rr(c, 798, 612, 84, 20, 10); c.fill(); rr(c, 852, 620, 20, 64, 8); c.fill();
        c.fillStyle = '#fde68a'; c.fillRect(856, 650, 12, 6); c.fillRect(856, 664, 12, 6);
        /* snowballs, a sled with a yarn ball, paw prints leading to the cat */
        [[640, 950, 26], [690, 958, 22], [664, 920, 22]].forEach(function (s) { blob(c, s[0], s[1], s[2], s[2], '#fff'); blob(c, s[0] + 6, s[1] + 6, s[2] * 0.6, s[2] * 0.5, '#e3ecfb'); });
        c.save(); c.translate(-96, 0);
        c.strokeStyle = '#94a3b8'; c.lineWidth = 6; c.beginPath(); c.moveTo(120, 930); c.quadraticCurveTo(220, 948, 350, 930); c.quadraticCurveTo(372, 926, 368, 906); c.stroke();
        rr(c, 120, 890, 230, 26, 10); c.fillStyle = '#ef4444'; c.fill();
        c.fillStyle = '#b91c1c'; c.fillRect(150, 914, 10, 18); c.fillRect(310, 914, 10, 18);
        c.strokeStyle = '#b91c1c'; c.lineWidth = 4; c.beginPath(); c.moveTo(126, 900); c.quadraticCurveTo(110, 860, 150, 850); c.stroke();
        thread(c, [296, 870, 330, 850, 352, 880, 380, 872], 5);
        yarn(c, 250, 846, 46);
        c.restore();
        for (k = 0; k < 6; k++) paw(c, 300 + k * 26 + (k % 2) * 22, 1000 - k * 24, 1.4, 0.5, '#c4d4ee');
        /* a robin on a snowy post, bottom right */
        c.fillStyle = '#a86a35'; c.fillRect(912, 880, 26, 120); rr(c, 904, 872, 42, 14, 7); c.fillStyle = '#fff'; c.fill();
        blob(c, 925, 846, 24, 20, '#8a6a50'); blob(c, 934, 852, 14, 12, '#f97316'); blob(c, 944, 832, 13, 12, '#8a6a50');
        blob(c, 948, 829, 3, 3, '#0f172a'); c.fillStyle = '#f59e0b'; c.beginPath(); c.moveTo(955, 832); c.lineTo(966, 835); c.lineTo(955, 838); c.fill();
        c.fillStyle = '#6b4a33'; c.beginPath(); c.moveTo(904, 846); c.lineTo(884, 836); c.lineTo(890, 856); c.closePath(); c.fill();
        blob(c, 790, 960, 70, 10, '#dbe7fb'); blob(c, 760, 990, 22, 8, '#e3ecfb');
        blob(c, 500, 864, 180, 20, '#dbe7fb');
        /* falling snow everywhere */
        for (k = 0; k < 150; k++) { var r = 2.5 + R() * 4.5; blob(c, R() * 1000, R() * 1000, r, r, 'rgba(255, 255, 255, .92)'); }
        c.strokeStyle = '#fff'; c.lineWidth = 3.5;
        for (k = 0; k < 12; k++) {
            var fx = R() * 1000, fy = R() * 980, fr = 9 + R() * 8;
            for (var a = 0; a < 3; a++) { var an = a * Math.PI / 3; c.beginPath(); c.moveTo(fx - Math.cos(an) * fr, fy - Math.sin(an) * fr); c.lineTo(fx + Math.cos(an) * fr, fy + Math.sin(an) * fr); c.stroke(); }
        }
    }

    var SCENES = [
        { id: 'room', name: 'Cosy room', draw: room, cat: [15, 29, 70] },
        { id: 'garden', name: 'Sunny garden', draw: garden, cat: [15, 30, 70] },
        { id: 'sea', name: 'Sunset sail', draw: sea, cat: [20, 36, 54] },
        { id: 'space', name: 'Space trip', draw: space, cat: [17, 30, 64] },
        { id: 'snow', name: 'Snow day', draw: snow, cat: [15, 31, 70] }
    ];
    function render(cv, sc, px) {
        cv.width = cv.height = px;
        var c = cv.getContext('2d');
        c.scale(px / 1000, px / 1000);
        c.lineJoin = c.lineCap = 'round';
        sc.draw(c);
    }
    function store(v) {                           /* the chosen picture, kept in localStorage */
        try {
            if (v === undefined) return localStorage.getItem('sliding-kitten-picture');
            localStorage.setItem('sliding-kitten-picture', v);
        } catch (e) { return null; }
    }

    Arcade.register('sliding-kitten', function (api) {
        api.css(
            '.sk { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;' +
            '  -webkit-user-select: none; user-select: none; }' +
            '.sk-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }' +
            '.sk-pill { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; box-sizing: border-box; border-radius: 999px;' +
            '  background: #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, .08); color: #1e3a8a; font-weight: 800; font-variant-numeric: tabular-nums; }' +
            '.sk-btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border: none; border-radius: 999px; background: #fff;' +
            '  box-shadow: 0 2px 0 #cbd5e1, 0 2px 8px rgba(15, 23, 42, .06); color: #0f172a; font: inherit; font-size: .9rem; font-weight: 800; cursor: pointer;' +
            '  -webkit-tap-highlight-color: transparent; touch-action: none; }' +
            '.sk-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }' +
            '.sk-btn:active, .sk-btn.on { transform: translateY(2px); box-shadow: none; }' +
            '.sk-btn[aria-pressed="true"], .sk-btn.on { background: #f6a23a; color: #fff; }' +
            '.sk-board { position: relative; width: var(--s); height: var(--s); border-radius: 18px; background: #c9daf3; overflow: hidden;' +
            '  box-shadow: 0 12px 28px rgba(30, 58, 138, .16), inset 0 3px 8px rgba(30, 58, 138, .18); touch-action: manipulation; }' +
            '.sk-tile { position: absolute; left: 0; top: 0; overflow: hidden; border-radius: var(--r); cursor: default;' +
            '  box-shadow: 0 3px 6px rgba(15, 23, 42, .18), inset 0 0 0 1px rgba(255, 255, 255, .55); transition: transform .15s cubic-bezier(.2, .8, .3, 1.1);' +
            '  -webkit-tap-highlight-color: transparent; }' +
            '.sk-tile.mv { cursor: pointer; }' +
            '.sk-tile::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; transition: box-shadow .3s;' +
            '  box-shadow: inset 0 2px 0 rgba(255, 255, 255, .45), inset 0 -3px 0 rgba(15, 23, 42, .12); }' +
            '.sk-glow .sk-tile.ok::after { box-shadow: inset 0 0 0 3px rgba(74, 222, 128, .75), inset 0 -3px 0 rgba(15, 23, 42, .12); }' +
            '.sk-still .sk-tile, .sk-still .sk-full, .sk-still .sk-tile::after { transition: none; }' +
            '.sk-pic, .sk-full { position: absolute; pointer-events: none; background: var(--pic) 0 0 / 100% 100%, #fdf2e9; }' +
            '.sk .cat { position: absolute; pointer-events: none; cursor: inherit; }' +
            '.sk-pics { display: flex; gap: 8px; max-width: 100%; box-sizing: border-box; padding: 4px; overflow-x: auto; scrollbar-width: none; }' +
            '.sk-pics::-webkit-scrollbar { display: none; }' +
            '.sk-thumb { position: relative; flex: none; width: 50px; height: 50px; padding: 0; border: none; border-radius: 12px; overflow: hidden; cursor: pointer;' +
            '  background: #fdf2e9; box-shadow: 0 2px 6px rgba(15, 23, 42, .18); transition: transform .15s, box-shadow .15s; -webkit-tap-highlight-color: transparent; }' +
            '.sk-thumb canvas { display: block; width: 100%; height: 100%; }' +
            '.sk-thumb:hover { transform: translateY(-2px); }' +
            '.sk-thumb[aria-checked="true"] { transform: translateY(-2px); box-shadow: 0 0 0 3px #f6a23a, 0 4px 10px rgba(246, 162, 58, .4); }' +
            '.sk-thumb:focus-visible { outline: 3px solid #1e3a8a; outline-offset: 2px; }' +
            '.sk-num { position: absolute; left: 5px; top: 4px; min-width: 1.5em; padding: 1px 5px; border-radius: 999px; background: rgba(255, 255, 255, .9);' +
            '  color: #1e3a8a; font: 800 12px/1.35 ui-rounded, system-ui, sans-serif; text-align: center; box-shadow: 0 1px 3px rgba(15, 23, 42, .15); }' +
            '.sk-nonum .sk-num { display: none; }' +
            '.sk-full { inset: 0; z-index: 3; opacity: 0; transition: opacity .25s; }' +
            '.sk-board.peek .sk-full { opacity: 1; }' +
            '.sk-board.won .sk-full { opacity: 1; transition-duration: .8s; }' +
            '.sk-spark { position: absolute; z-index: 4; width: 14px; height: 14px; margin: -7px; pointer-events: none;' +
            '  background: radial-gradient(circle, #fff 0 20%, var(--c) 30% 45%, transparent 50%); animation: sk-spark .9s ease-out forwards; }' +
            '@keyframes sk-spark { from { transform: scale(.2); opacity: 1; } 60% { opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(1.2); opacity: 0; } }');

        var LEVELS = { easy: { n: 3, glow: true }, normal: { n: 4, glow: true }, hard: { n: 5, glow: false } };
        var L = LEVELS[api.level()] || LEVELS.normal, n = L.n, GAPV = n * n - 1;
        var EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

        var wrap = document.createElement('div');
        wrap.className = 'sk' + (api.reducedMotion ? ' sk-still' : '');
        wrap.innerHTML = '<div class="sk-pics" role="radiogroup" aria-label="Picture"></div><div class="sk-bar"><span class="sk-pill sk-time" title="Time">0:00</span>' +
            '<button class="sk-btn sk-peek" type="button" title="Hold to see the whole picture">' + EYE + 'Peek</button>' +
            '<button class="sk-btn sk-toggle" type="button" title="Tile numbers">#</button></div>' +
            '<div class="sk-board' + (L.glow ? ' sk-glow' : '') + '" role="group" aria-label="Puzzle"></div>';
        api.el.appendChild(wrap);
        var board = wrap.querySelector('.sk-board'), timeEl = wrap.querySelector('.sk-time');
        var peekBtn = wrap.querySelector('.sk-peek'), numBtn = wrap.querySelector('.sk-toggle');
        var catSvg = document.querySelector('.arcade .mascot svg');
        var canvas = document.createElement('canvas'), picsEl = wrap.querySelector('.sk-pics');
        var cur = 0;
        SCENES.forEach(function (sc, i) { if (sc.id === store()) cur = i; });

        var grid, gap, tiles = [], moves = 0, done = false, size = 0, peeks = 0, t0 = 0, secs = 0, ticker = null;
        var GAP = 4;                              /* px between tiles */

        /* the current picture, drawn at the screen's pixel density */
        function draw(px) {
            render(canvas, SCENES[cur], px);
            try { wrap.style.setProperty('--pic', 'url(' + canvas.toDataURL('image/png') + ')'); } catch (e) { /* plain background */ }
        }

        /* a slice of the picture: the canvas scene plus the cat from the corner */
        function picture(cls, sc) {
            var p = document.createElement(cls === 'sk-thumb' ? 'button' : 'div');
            p.className = cls;
            sc = sc || SCENES[cur];
            if (catSvg) {
                var c = document.createElement('div');
                c.className = 'cat';
                c.style.cssText = 'left:' + sc.cat[0] + '%;top:' + sc.cat[1] + '%;width:' + sc.cat[2] + '%;height:' + (sc.cat[2] * 90 / 110) + '%';
                c.appendChild(catSvg.cloneNode(true));
                p.appendChild(c);
            }
            return p;
        }
        var full;

        /* the picture picker: one thumbnail per picture, arrow keys move between them like radio buttons */
        var thumbs = SCENES.map(function (sc, i) {
            var b = picture('sk-thumb', sc), cv = document.createElement('canvas');
            b.type = 'button';
            b.title = sc.name;
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-label', sc.name);
            b.insertBefore(cv, b.firstChild);
            render(cv, sc, Math.round(50 * Math.min(3, window.devicePixelRatio || 1)));
            picsEl.appendChild(b);
            api.on(b, 'click', function () { choose(i); });
            return b;
        });
        function showThumbs() {
            thumbs.forEach(function (b, i) { b.setAttribute('aria-checked', i === cur); b.tabIndex = i === cur ? 0 : -1; });
        }
        api.on(picsEl, 'keydown', function (e) {
            var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            e.stopPropagation();                      /* the arrows pick a picture here, they do not slide tiles */
            var i = (cur + d + SCENES.length) % SCENES.length;
            choose(i);
            thumbs[i].focus();
        });
        function choose(i) {
            if (i === cur) return;
            cur = i;
            store(SCENES[i].id);
            showThumbs();
            api.sfx('tap');
            draw(px());
            newRound();
            board.setAttribute('aria-label', 'Puzzle: ' + SCENES[i].name);
        }

        function build() {
            board.innerHTML = '';
            board.classList.remove('won', 'peek');
            board.classList.toggle('sk-nonum', !pick.nums);
            tiles = [];
            for (var k = 0; k < GAPV; k++) {
                var t = document.createElement('div');
                t.className = 'sk-tile';
                t.dataset.k = k;
                t.appendChild(picture('sk-pic'));
                var num = document.createElement('span');
                num.className = 'sk-num';
                num.textContent = k + 1;
                t.appendChild(num);
                board.appendChild(t);
                tiles.push(t);
            }
            full = picture('sk-full');
            board.appendChild(full);
            numBtn.setAttribute('aria-pressed', pick.nums);
        }

        /* tiles keep their picture slice from the solved position */
        function place() {
            var t = (size - GAP * (n + 1)) / n, mv = movable();
            for (var cell = 0; cell < n * n; cell++) {
                var k = grid[cell];
                if (k === GAPV) continue;
                var el = tiles[k], p = el.firstChild;
                el.style.width = el.style.height = t + 'px';
                el.style.transform = 'translate(' + (GAP + (cell % n) * (t + GAP)) + 'px,' + (GAP + Math.floor(cell / n) * (t + GAP)) + 'px)';
                el.classList.toggle('ok', k === cell);
                el.classList.toggle('mv', mv.indexOf(cell) >= 0);
                p.style.width = p.style.height = size + 'px';
                p.style.left = -(GAP + (k % n) * (t + GAP)) + 'px';
                p.style.top = -(GAP + Math.floor(k / n) * (t + GAP)) + 'px';
            }
        }
        function fit(s) {
            var v = Math.min(540, s.w - 24, s.h - 136);
            if ((s.w - v) / 2 < 100) v = Math.max(Math.min(v, s.h - 280), Math.min(v, 300));   /* keep the mascot corner free if it fits */
            var old = size;
            size = Math.max(180, Math.floor(v));
            wrap.style.setProperty('--s', size + 'px');
            wrap.style.setProperty('--r', Math.max(6, Math.round(size / n * 0.09)) + 'px');
            if (size !== old) draw(px());
            if (grid) place();
        }

        function px() { return Math.min(2048, Math.round(size * Math.min(3, window.devicePixelRatio || 1))); }

        /* cells in the gap's row and column: tapping one slides the whole line towards the gap */
        function movable() {
            var out = [], r = Math.floor(gap / n), c = gap % n;
            for (var k = 0; k < n; k++) { if (k !== c) out.push(r * n + k); if (k !== r) out.push(k * n + c); }
            return out;
        }
        function solved() {
            for (var k = 0; k < n * n; k++) if (grid[k] !== k) return false;
            return true;
        }
        function clock() {
            secs = Math.floor((performance.now() - t0) / 1000);
            timeEl.textContent = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2);
        }
        function sparkle() {
            if (api.reducedMotion) return;
            var cols = ['#f6a23a', '#93c5fd', '#f9a8d4', '#fde68a', '#86efac'];
            for (var k = 0; k < 22; k++) {
                var s = document.createElement('div'), a = Math.random() * Math.PI * 2, d = size * (0.15 + Math.random() * 0.3);
                s.className = 'sk-spark';
                s.style.left = size * (0.3 + Math.random() * 0.4) + 'px';
                s.style.top = size * (0.3 + Math.random() * 0.4) + 'px';
                s.style.setProperty('--c', cols[k % cols.length]);
                s.style.setProperty('--dx', Math.cos(a) * d + 'px');
                s.style.setProperty('--dy', Math.sin(a) * d + 'px');
                s.style.animationDelay = Math.random() * 0.3 + 's';
                board.appendChild(s);
            }
        }

        function newRound() {
            clearInterval(ticker);
            ticker = null;
            peeks = 0;
            timeEl.textContent = '0:00';
            build();
            grid = mix(n, Math.random);
            gap = grid.indexOf(GAPV);
            moves = 0;
            done = false;
            api.score(0, 'Moves');
            api.cat('idle');
            fit(api.size());
        }
        function tryMove(cell) {
            if (done || cell < 0 || cell === gap || movable().indexOf(cell) < 0) return;
            var step = Math.floor(cell / n) === Math.floor(gap / n) ? (cell > gap ? 1 : -1) : (cell > gap ? n : -n);
            if (!moves) { t0 = performance.now(); ticker = api.interval(clock, 250); }
            while (gap !== cell) {                    /* each tile of the line moves one step */
                grid[gap] = grid[gap + step];
                gap += step;
                grid[gap] = GAPV;
                moves++;
            }
            api.score(moves, 'Moves');
            api.sfx('move');
            place();
            if (solved()) {
                done = true;
                clearInterval(ticker);
                clock();
                board.classList.remove('peek');
                board.classList.add('won');
                var c = full.querySelector('.cat');
                if (c) c.classList.add('happy');
                sparkle();
                api.end({ score: moves, win: true, lowerIsBetter: true,
                    text: (document.documentElement.dataset.pet === 'dog' ? 'Puppy' : 'Kitten') + ' restored!\n' + SCENES[cur].name + ', ' + n + 'x' + n + ' in ' + moves + ' moves, ' + timeEl.textContent + (peeks ? ', ' + peeks + (peeks === 1 ? ' peek' : ' peeks') : '') });
            }
        }
        function peek(on) {
            if (done || board.classList.contains('peek') === on) return;
            board.classList.toggle('peek', on);
            peekBtn.classList.toggle('on', on);
            if (on) { peeks++; api.sfx('tap'); }
        }

        api.on(board, 'click', function (e) {
            var t = e.target.closest('.sk-tile');
            if (t && !board.classList.contains('peek')) tryMove(grid.indexOf(+t.dataset.k));
        });
        api.on(peekBtn, 'pointerdown', function (e) { e.preventDefault(); peek(true); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { api.on(peekBtn, ev, function () { peek(false); }); });
        api.on(peekBtn, 'contextmenu', function (e) { e.preventDefault(); });
        api.on(numBtn, 'click', function () {
            api.sfx('tap');
            pick.nums = !pick.nums;
            board.classList.toggle('sk-nonum', !pick.nums);
            numBtn.setAttribute('aria-pressed', pick.nums);
        });
        /* arrow keys (or WASD) push the tile next to the gap into it, in the arrow's direction; hold P to peek */
        api.on(document, 'keydown', function (e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            var k = e.key.length === 1 ? e.key.toLowerCase() : e.key, r = Math.floor(gap / n), c = gap % n, cell = -1;
            if (k === 'p') { e.preventDefault(); peek(true); return; }
            if (k === 'ArrowLeft' || k === 'a') cell = c < n - 1 ? gap + 1 : -1;
            else if (k === 'ArrowRight' || k === 'd') cell = c > 0 ? gap - 1 : -1;
            else if (k === 'ArrowUp' || k === 'w') cell = r < n - 1 ? gap + n : -1;
            else if (k === 'ArrowDown' || k === 's') cell = r > 0 ? gap - n : -1;
            else return;
            e.preventDefault();
            tryMove(cell);
        });
        api.on(document, 'keyup', function (e) { if (e.key === 'p' || e.key === 'P') peek(false); });

        api.onResize(fit);
        showThumbs();
        board.setAttribute('aria-label', 'Puzzle: ' + SCENES[cur].name);
        newRound();
        api.say(api.touch ? 'Tap a tile in the gap\'s row or column' : 'Click tiles or use the arrow keys, hold P to peek', 2800);
    });
})();
