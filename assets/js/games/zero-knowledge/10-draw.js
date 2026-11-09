    /* ---------- Zero Knowledge, part 10: the drawing kit. Everything is drawn on the level's canvas with plain shapes:
       the visitor's pet (cat or dog, in its look's colours), Hoot the guard owl, yarn and tennis balls, envelopes with
       a paw or bone seal, a paw print, the map of gardens and speech bubbles. ---------- */
    function rr(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
        g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
        g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
        g.closePath();
    }
    function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
    function fillStroke(g, fill, stroke, lw) {
        if (fill) { g.fillStyle = fill; g.fill(); }
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); }
    }
    function label(g, text, x, y, size, colour, align, weight) {
        g.font = (weight || 800) + ' ' + Math.round(size) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
        g.textAlign = align || 'center'; g.textBaseline = 'middle';
        g.fillStyle = colour || INK;
        g.fillText(text, x, y);
    }

    /* the pet sitting, seen from the front; (x, y) is the middle of its feet, s its height in px.
       o: { look: -1..1 (eyes left/right), mood: 'happy' | 'sad' | 'wow' | null, wave: 0..1 (a raised paw), t: time in s } */
    function drawPet(g, C, x, y, s, o) {
        o = o || {};
        var k = s / 100, look = o.look || 0, t = o.t || 0;
        g.save();
        g.translate(x, y); g.scale(k, k);
        g.lineJoin = 'round'; g.lineCap = 'round';
        var line = '#3b2a1e';
        /* tail */
        g.beginPath();
        if (C.dog) { var wag = Math.sin(t * 9) * 8; g.moveTo(18, -14); g.quadraticCurveTo(40, -30, 36 + wag, -52); }
        else { var sw = Math.sin(t * 2) * 5; g.moveTo(20, -6); g.bezierCurveTo(52, -4, 48 + sw, -40, 34 + sw, -52); }
        g.strokeStyle = line; g.lineWidth = 13; g.stroke();
        g.strokeStyle = C.dog ? C.tail : C.tail; g.lineWidth = 9; g.stroke();
        /* body */
        ell(g, 0, -30, 27, 31); fillStroke(g, C.fur, line, 3);
        ell(g, 0, -26, 15, 21); fillStroke(g, C.cream, null);
        if (!C.dog) {   /* tabby marks on the sides */
            g.strokeStyle = C.stripe; g.lineWidth = 3;
            [-1, 1].forEach(function (sd) { for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(sd * 24, -44 + i * 10); g.lineTo(sd * 17, -41 + i * 10); g.stroke(); } });
        }
        /* front paws, one may wave */
        ell(g, -11, -3, 9, 6); fillStroke(g, C.light, line, 2.5);
        if (o.wave) { g.save(); g.translate(13, -30); g.rotate(-1.2 - 0.4 * Math.sin(t * 10)); ell(g, 0, -12, 7, 14); fillStroke(g, C.light, line, 2.5); g.restore(); }
        else { ell(g, 11, -3, 9, 6); fillStroke(g, C.light, line, 2.5); }
        /* head */
        g.save();
        g.translate(0, -70);
        if (o.mood === 'sad') g.rotate(-0.12); else if (o.mood === 'wow') g.translate(0, -4);
        if (C.dog) {
            ell(g, 0, 0, 24, 22); fillStroke(g, C.head, line, 3);
            [-1, 1].forEach(function (sd) {   /* floppy ears */
                g.save(); g.translate(sd * 21, -6); g.rotate(sd * 0.35);
                ell(g, 0, 12, 8, 17); fillStroke(g, C.ear, line, 2.5); g.restore();
            });
            ell(g, 0, 10, 13, 9); fillStroke(g, C.cream, line, 2);
            ell(g, 0, 5, 5, 3.6); fillStroke(g, C.nose, null);
            if (o.mood === 'happy') { ell(g, 0, 17, 4, 5); fillStroke(g, '#e86a7a', line, 1.5); }
        } else {
            [-1, 1].forEach(function (sd) {
                g.beginPath(); g.moveTo(sd * 8, -18); g.lineTo(sd * 21, -32); g.lineTo(sd * 23, -8); g.closePath();
                fillStroke(g, C.fur, line, 3);
                g.beginPath(); g.moveTo(sd * 12, -17); g.lineTo(sd * 19, -26); g.lineTo(sd * 20, -12); g.closePath();
                fillStroke(g, '#f6b3b3', null);
            });
            ell(g, 0, 0, 25, 21); fillStroke(g, C.head, line, 3);
            g.strokeStyle = C.stripe; g.lineWidth = 3;
            [-6, 0, 6].forEach(function (dx) { g.beginPath(); g.moveTo(dx, -20); g.lineTo(dx * 0.8, -13); g.stroke(); });
            ell(g, 0, 9, 10, 6.5); fillStroke(g, C.cream, null);
            g.beginPath(); g.moveTo(-3, 5); g.lineTo(3, 5); g.lineTo(0, 8.5); g.closePath(); fillStroke(g, '#e0787f', null);
            g.strokeStyle = '#7a6352'; g.lineWidth = 1.2;
            [-1, 1].forEach(function (sd) { for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(sd * 9, 9 + i * 2); g.lineTo(sd * 30, 6 + i * 6); g.stroke(); } });
            g.strokeStyle = line; g.lineWidth = 1.8;
            g.beginPath(); g.moveTo(0, 8.5); g.quadraticCurveTo(-3, 13, -6, 11); g.moveTo(0, 8.5); g.quadraticCurveTo(3, 13, 6, 11); g.stroke();
        }
        /* eyes */
        [-1, 1].forEach(function (sd) {
            var ex = sd * 9, ey = -4;
            if (o.mood === 'happy') { g.strokeStyle = line; g.lineWidth = 2.6; g.beginPath(); g.arc(ex, ey + 2, 4.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return; }
            if (o.mood === 'sad') { g.strokeStyle = line; g.lineWidth = 2.6; g.beginPath(); g.moveTo(ex - 4, ey + 1); g.lineTo(ex + 4, ey + 1); g.stroke(); return; }
            var r = o.mood === 'wow' ? 6.5 : 5.5;
            ell(g, ex, ey, r, r + 0.5); fillStroke(g, '#fff', line, 1.6);
            ell(g, ex + look * 2, ey + 0.5, r * 0.62, r * 0.7); fillStroke(g, C.dog ? '#3a2616' : C.iris, null);
            ell(g, ex + look * 2, ey + 0.5, r * 0.3, r * (C.dog ? 0.32 : 0.55)); fillStroke(g, '#1d1411', null);
        });
        g.restore();
        g.restore();
    }

    /* Hoot the guard owl; (x, y) the middle of its feet, s its height. o: { look: -1..1, wings: 0 (out, holding) ..
       1 (behind the back), shout: '' or a word shown in a bubble, blind: true greys the eyes (colour blind),
       closed: true shuts them, nod: 0..1, frown: true } */
    function drawOwl(g, x, y, s, o) {
        o = o || {};
        var k = s / 100, line = '#2e2419', look = o.look || 0, wb = o.wings || 0;
        g.save();
        g.translate(x, y); g.scale(k, k);
        g.lineJoin = 'round'; g.lineCap = 'round';
        /* feet */
        g.fillStyle = '#e39b2d';
        [-10, 10].forEach(function (fx) { ell(g, fx, -2, 7, 3.5); fillStroke(g, '#e39b2d', line, 1.6); });
        /* wings (drawn behind the body when they go behind the back) */
        function wing(sd) {
            g.save(); g.translate(sd * 26, -46);
            g.rotate(sd * (0.25 + wb * 0.9));
            ell(g, 0, 14, 10, 24); fillStroke(g, '#7a5f45', line, 2.5);
            g.restore();
        }
        if (wb > 0.5) { wing(-1); wing(1); }
        ell(g, 0, -40, 30, 38); fillStroke(g, '#9a7c5c', line, 3);
        ell(g, 0, -32, 19, 25); fillStroke(g, '#e9d8bd', null);
        g.strokeStyle = '#b39572'; g.lineWidth = 2;
        for (var i = 0; i < 3; i++) for (var j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(j * 9 - 3, -44 + i * 10); g.lineTo(j * 9, -41 + i * 10); g.lineTo(j * 9 + 3, -44 + i * 10); g.stroke(); }
        if (wb <= 0.5) { wing(-1); wing(1); }
        /* head */
        g.save(); g.translate(0, -84 + (o.nod || 0) * 4);
        [-1, 1].forEach(function (sd) {   /* ear tufts */
            g.beginPath(); g.moveTo(sd * 14, -14); g.lineTo(sd * 26, -30); g.lineTo(sd * 27, -8); g.closePath(); fillStroke(g, '#7a5f45', line, 2.5);
        });
        ell(g, 0, 0, 29, 24); fillStroke(g, '#9a7c5c', line, 3);
        /* guard cap */
        g.beginPath(); g.moveTo(-22, -12); g.quadraticCurveTo(0, -36, 22, -12); g.closePath(); fillStroke(g, '#2d3a6b', line, 2.5);
        g.beginPath(); g.moveTo(-25, -11); g.lineTo(25, -11); g.lineTo(18, -6); g.lineTo(-18, -6); g.closePath(); fillStroke(g, '#1d2648', line, 2);
        ell(g, 0, -20, 4.5, 4.5); fillStroke(g, '#f2c94c', line, 1.5);
        /* eyes and brows */
        [-1, 1].forEach(function (sd) {
            ell(g, sd * 11, 3, 10, 10); fillStroke(g, o.closed ? '#9a7c5c' : '#f6efe0', line, 2.2);
            if (o.closed) { g.strokeStyle = line; g.lineWidth = 2.6; g.beginPath(); g.arc(sd * 11, 1, 6, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
            else {
                ell(g, sd * 11 + look * 3, 4, 5, 5); fillStroke(g, '#1d1411', null);
                ell(g, sd * 11 + look * 3 + 1.5, 2.5, 1.5, 1.5); fillStroke(g, '#fff', null);
            }
            if (o.blind) { ell(g, sd * 11, 3, 10, 10); fillStroke(g, 'rgba(120,120,130,.55)', null); }
            g.strokeStyle = line; g.lineWidth = 3;
            g.beginPath();
            if (o.frown) { g.moveTo(sd * 20, -8); g.lineTo(sd * 4, -4); } else { g.moveTo(sd * 19, -6); g.lineTo(sd * 4, -7); }
            g.stroke();
        });
        if (o.blind) { g.strokeStyle = line; g.lineWidth = 2; g.beginPath(); g.moveTo(-1, 3); g.lineTo(1, 3); g.stroke(); }
        g.beginPath(); g.moveTo(-4, 11); g.lineTo(4, 11); g.lineTo(0, 19); g.closePath(); fillStroke(g, '#e39b2d', line, 1.8);
        g.restore();
        g.restore();
        if (o.shout) bubble(g, x + s * 0.18, y - s * 1.22, o.shout, s * 0.17);
    }

    /* a speech bubble whose tail points down to (x, y) */
    function bubble(g, x, y, text, size) {
        size = clamp(size || 14, 11, 22);
        g.font = '800 ' + Math.round(size) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
        var w = g.measureText(text).width + size * 1.2, h = size * 1.9, bx = x - w * 0.3, by = y - h - size * 0.6;
        var cw = g.canvas.width / (g.getTransform ? g.getTransform().a : 1);
        if (bx + w > cw - 4) bx = cw - 4 - w;
        if (bx < 4) bx = 4;
        rr(g, bx, by, w, h, h * 0.4); fillStroke(g, '#fff', INK, 2);
        g.beginPath(); g.moveTo(x - size * 0.3, by + h - 1); g.lineTo(x, y); g.lineTo(x + size * 0.5, by + h - 1); g.closePath();
        g.fillStyle = '#fff'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - size * 0.3, by + h); g.lineTo(x, y); g.lineTo(x + size * 0.5, by + h); g.stroke();
        label(g, text, bx + w / 2, by + h / 2 + 1, size, INK);
    }

    /* a ball of yarn (cat) or a tennis ball (dog) */
    function drawBall(g, x, y, r, colour, dog, spin) {
        spin = spin || 0;
        ell(g, x, y, r, r); fillStroke(g, colour, INK, Math.max(1.5, r * 0.09));
        g.save();
        g.beginPath(); g.arc(x, y, r - 1, 0, Math.PI * 2); g.clip();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1.5, r * 0.1);
        if (dog) {
            g.beginPath(); g.arc(x - r * 1.05, y, r * 0.75, -1.1 + spin, 1.1 + spin); g.stroke();
            g.beginPath(); g.arc(x + r * 1.05, y, r * 0.75, Math.PI - 1.1 + spin, Math.PI + 1.1 + spin); g.stroke();
        } else {
            g.strokeStyle = 'rgba(0,0,0,.18)';
            for (var i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(x, y, r * 0.95, r * (0.25 + 0.15 * Math.abs(i)), 0.6 + i * 0.5 + spin, 0, Math.PI * 2); g.stroke(); }
        }
        g.restore();
    }

    function drawPaw(g, x, y, r, colour) {
        g.fillStyle = colour;
        ell(g, x, y + r * 0.3, r * 0.55, r * 0.45); g.fill();
        [[-0.55, -0.2], [-0.2, -0.55], [0.2, -0.55], [0.55, -0.2]].forEach(function (p) { ell(g, x + p[0] * r, y + p[1] * r, r * 0.2, r * 0.26); g.fill(); });
    }
    function drawBone(g, x, y, w, colour) {
        var h = w * 0.32, r = h * 0.42;
        g.fillStyle = colour;
        rr(g, x - w * 0.36, y - h * 0.2, w * 0.72, h * 0.4, h * 0.15); g.fill();
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (p) { ell(g, x + p[0] * w * 0.38, y + p[1] * h * 0.24, r, r); g.fill(); });
    }

    /* a sealed envelope over a garden: w wide, seal: a paw (cat) or a bone (dog); open: 0..1 */
    function drawEnvelope(g, x, y, w, dog, open, colour) {
        var h = w * 0.68;
        rr(g, x - w / 2, y - h / 2, w, h, 3); fillStroke(g, '#fbf3df', INK, 2);
        g.beginPath(); g.moveTo(x - w / 2, y - h / 2 + 2);
        g.lineTo(x, y - h / 2 + h * (0.55 - (open || 0) * 1.0)); g.lineTo(x + w / 2, y - h / 2 + 2);
        g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
        if (!open) {
            ell(g, x, y + h * 0.06, w * 0.17, w * 0.17); fillStroke(g, '#c0392b', null);
            if (dog) drawBone(g, x, y + h * 0.06, w * 0.24, '#fbe3c8'); else drawPaw(g, x, y + h * 0.07, w * 0.13, '#fbe3c8');
        } else if (colour) {
            ell(g, x, y - h * 0.62 * open, w * 0.22, w * 0.22); fillStroke(g, colour, INK, 2);
        }
    }

    /* the mark inside a paint colour, so the three can be told apart without seeing colour */
    function paintMark(g, x, y, r, mark) {
        g.fillStyle = 'rgba(255,255,255,.9)'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(2, r * 0.22);
        if (mark === 'dot') { ell(g, x, y, r * 0.3, r * 0.3); g.fill(); }
        else if (mark === 'tri') { g.beginPath(); g.moveTo(x, y - r * 0.38); g.lineTo(x + r * 0.36, y + r * 0.26); g.lineTo(x - r * 0.36, y + r * 0.26); g.closePath(); g.fill(); }
        else { g.fillStyle = 'rgba(60,40,0,.55)'; g.fillRect(x - r * 0.4, y - r * 0.12, r * 0.8, r * 0.24); }
    }

    /* a map of gardens joined by fences, laid into the box {x, y, w, h}. o: { col: colours (index into PAINT) or null,
       sealed: true (envelopes), hi: highlighted fence index, open: {fence, p} for the opened fence, labels: [text],
       pick: highlighted garden, fenceTint: per fence colour or null, r: garden radius } ; returns the node positions */
    function mapPoints(map, box) {
        var pad = Math.min(box.w, box.h) * 0.08;
        return map.nodes.map(function (p) { return { x: box.x + pad + p.x * (box.w - 2 * pad), y: box.y + pad + p.y * (box.h - 2 * pad) }; });
    }
    function drawMap(g, map, box, o) {
        o = o || {};
        var P = mapPoints(map, box), r = o.r || clamp(Math.min(box.w, box.h) * 0.075, 13, 26);
        map.edges.forEach(function (e, i) {
            var a = P[e[0]], b = P[e[1]], hi = o.hi === i;
            g.lineCap = 'round';
            g.strokeStyle = hi ? '#ffb400' : (o.fenceTint && o.fenceTint[i]) || '#8a6a48';
            g.lineWidth = hi ? 9 : 6;
            g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            /* fence posts */
            if (!hi) {
                g.strokeStyle = '#5c432c'; g.lineWidth = 2;
                for (var k = 1; k < 4; k++) {
                    var px = a.x + (b.x - a.x) * k / 4, py = a.y + (b.y - a.y) * k / 4, nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
                    g.beginPath(); g.moveTo(px - nx / nl * 6, py - ny / nl * 6); g.lineTo(px + nx / nl * 6, py + ny / nl * 6); g.stroke();
                }
            }
        });
        P.forEach(function (p, i) {
            var opened = o.open && (map.edges[o.open.fence][0] === i || map.edges[o.open.fence][1] === i);
            if (o.sealed && !opened) {
                ell(g, p.x, p.y, r, r); fillStroke(g, '#cfe3b4', INK, 2);
                drawEnvelope(g, p.x, p.y, r * 1.7, o.dog, 0);
            } else {
                var c = o.col ? o.col[i] : null;
                ell(g, p.x, p.y, r, r); fillStroke(g, c == null ? '#e6eedb' : PAINT[c].c, INK, o.pick === i ? 4 : 2);
                if (c != null) paintMark(g, p.x, p.y, r, PAINT[c].mark);
                if (o.labels) label(g, o.labels[i], p.x, p.y + (c != null ? 0 : 1), r * 0.95, INK);
            }
            if (o.pick === i) { ell(g, p.x, p.y, r + 6, r + 6); g.strokeStyle = '#ffb400'; g.lineWidth = 3; g.stroke(); }
        });
        return P;
    }
