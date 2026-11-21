    /* ---------- shared bits for the tracks in parts 12a to 14b ---------- */
    function pillar(x, y, r, h, side, top) {  /* something round standing up: its side up to the lifted top; returns the top centre */
        var tx = liftX(x, h), ty = liftY(y, h), dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * r, ny = dx / d * r;
        ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(tx + nx, ty + ny); ctx.lineTo(tx - nx, ty - ny); ctx.lineTo(x - nx, y - ny); ctx.fill();
        circle(ctx, x, y, r, side);
        if (top) circle(ctx, tx, ty, r, top);
        return { x: tx, y: ty };
    }
    function hear(x, y, r, n) {  /* a sound for the players at this device who are near (x, y); nothing is sent: every device works it out */
        if (!me) return;
        if (Math.hypot(me.x - x, me.y - y) < r || (split && Math.hypot(pal.x - x, pal.y - y) < r)) api.sfx(n);
    }
    function locals() { return split ? [karts[0], karts[1]] : [me]; }  /* the karts driven at this device */
    var noteAC = null, noteOut = null, PENT = [0, 2, 4, 7, 9];
    function note(k, type, dur, vol) {  /* a musical note, k steps up a two octave pentatonic scale from middle C and back */
        try {
            if (!noteAC) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                noteAC = new AC(); noteOut = noteAC.createGain(); noteOut.gain.value = 0.28; noteOut.connect(noteAC.destination);
            }
            noteOut.gain.value = 0.28 * (window.Arcade && Arcade.sfxLevel ? Arcade.sfxLevel() : 1);   /* the Effects slider */
            if (noteAC.state === 'suspended') noteAC.resume();
            if (!noteOut.gain.value) return;
            var m = ((k % 18) + 18) % 18; if (m > 9) m = 18 - m;
            var f = 261.63 * Math.pow(2, (Math.floor(m / 5) * 12 + PENT[m % 5]) / 12) * (type === 'sine' ? 2 : 1);
            var t = noteAC.currentTime + 0.005, o = noteAC.createOscillator(), g = noteAC.createGain();
            o.type = type; o.frequency.setValueAtTime(f, t);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(noteOut); o.start(t); o.stop(t + dur + 0.05);
        } catch (e) { /* no sound: fine */ }
    }
    function quad(g, a, b, c, d) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); }
    function lerp(a, b, f) { return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }
    function kartNear(x, y) {  /* how far the closest kart is from (x, y) */
        var d = 1e9;
        for (var i = 0; karts && i < karts.length; i++) d = Math.min(d, Math.hypot(karts[i].x - x, karts[i].y - y));
        return d;
    }
    function critters(list, l, run) {  /* little animals sitting l from the road at main points [j, side (1 right, -1 left)], each
                                          with a hiding place up to run further out, kept away from the other roads */
        var o = { x: 0, y: 0 };
        return list.map(function (d, n) {
            var h = side(d[0], d[1] * l), r = run, q = h;
            for (; r > 30; r -= 20) { q = side(d[0], d[1] * (l + r)); o.x = q.x; o.y = q.y; nearest(o); if (o.dist > l + 40) break; }
            return { hx: h.x, hy: h.y, rx: q.x, ry: q.y, f: 0, x: h.x, y: h.y, a: A[ix(d[0])] - d[1] * Math.PI / 2, ph: n * 1.7 };
        });
    }
    function scare(list, dt, r) {  /* a kart within r: run for the hiding place; all quiet again: come back out slowly */
        list.forEach(function (s) {
            s.f = clamp(s.f + (kartNear(s.hx, s.hy) < r ? 3.2 : -0.35) * dt, 0, 1);
            var e = s.f * s.f * (3 - 2 * s.f);
            s.x = s.hx + (s.rx - s.hx) * e; s.y = s.hy + (s.ry - s.hy) * e;
        });
    }
    function inner() {  /* the open place inside the track's bounding box that is furthest from every road */
        var o = { x: 0, y: 0 }, best = null, x, y;
        for (x = PAD + 100; x < WW - PAD - 100; x += 40) for (y = PAD + 100; y < WH - PAD - 100; y += 40) {
            o.x = x; o.y = y; nearest(o);
            if (!best || o.dist > best.d) best = { x: x, y: y, d: o.dist };
        }
        return best || { x: WW / 2, y: WH / 2, d: 0 };
    }
    function hash(k, s) { var v = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }  /* a steady random number in [0, 1) */
    function drift(n, T, vx, vy, fn) {  /* things blowing through the air (leaves, petals, dust): n per T by T tile of the view, moving
                                           at about (vx, vy) per second, all from the clock; fn(x, y, k) draws one */
        if (api.reducedMotion) vx = vy = 0;
        var tx0 = Math.floor(VX0 / T), ty0 = Math.floor(VY0 / T), tx1 = Math.floor(VX1 / T), ty1 = Math.floor(VY1 / T), tx, ty, k;
        for (tx = tx0; tx <= tx1; tx++) for (ty = ty0; ty <= ty1; ty++) for (k = 0; k < n; k++) {
            var h = hash(k, 1), h2 = hash(k, 2);
            var x = tx * T + (((h * T + clock * vx * (0.7 + h2 * 0.6)) % T) + T) % T, y = ty * T + (((h2 * T + clock * vy * (0.7 + h * 0.6)) % T) + T) % T;
            if (x > VX0 - 10 && x < VX1 + 10 && y > VY0 - 10 && y < VY1 + 10) fn(x, y, k + (tx * 31 + ty * 17) * n);
        }
    }

    /* spectators: little cats (dogs when the player drives a dog) sitting beside the road, facing it. They bob along all
       the time and jump and wave paws and flags while a kart goes by. crowd() places them, fans() draws a group */
    var FUR = ['#f6a23a', '#a3aab5', '#45424d', '#fbf7ef', '#e8c9a0', '#8a5a3c'], DFUR = ['#c8843f', '#f3e3c3', '#6b4a32', '#ece6dc', '#3a2c25', '#d9a35f'];
    var FLAG = ['#d6336c', '#1e3a8a', '#facc15', '#16a34a'];
    function crowd(j0, j1, l, rows, look) {  /* spectators from main point j0 to j1, l from the centre line (l > 0: right of the driving
                                                direction), rows deep; look: optional { glow: colour, zombie: true } */
        var s = l > 0 ? 1 : -1, out = [], step = Math.max(1, Math.round(34 / SP)), r, j, cx = 0, cy = 0;
        seed = j0 * 31 + rows * 7 + (l > 0 ? 3 : 5);
        for (r = 0; r < rows; r++) for (j = j0 + (r % 2 ? step / 2 : 0); j <= j1; j += step) {
            if (rnd() < 0.18) continue;
            var p = side(Math.round(j), l + s * r * 28);
            out.push({ x: p.x + (rnd() - 0.5) * 6, y: p.y + (rnd() - 0.5) * 6, a: A[ix(Math.round(j))] - s * Math.PI / 2, c: Math.floor(rnd() * 6), ph: rnd() * 7, flag: rnd() < 0.3 ? Math.floor(rnd() * 4) : -1 });
            cx += p.x; cy += p.y;
        }
        cx /= out.length || 1; cy /= out.length || 1;
        var R = 0;
        out.forEach(function (f) { R = Math.max(R, Math.hypot(f.x - cx, f.y - cy)); });
        return { fans: out, x: cx, y: cy, r: R + 20, look: look || {} };
    }
    function fans(g) {
        if (!vis(g.x, g.y, g.r)) return;
        var hype = clamp(1.5 - kartNear(g.x, g.y) / (g.r + 160), 0.12, 1), L = g.look, F = L.zombie ? ['#9bd17a', '#a3c98a', '#8fbf6f'] : DOG ? DFUR : FUR, i;
        if (phase === 'count') hype = Math.max(hype, 0.6);
        for (i = 0; i < g.fans.length; i++) {
            var f = g.fans[i];
            if (!vis(f.x, f.y, 24)) continue;
            var t = clock * (3 + 9 * hype) + f.ph, up = Math.abs(Math.sin(t)) * hype, col = F[f.c % F.length], w = Math.sin(t * 1.3) * 4 * hype;
            ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a);
            ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(-2, 2, 10, 8, 0, 0, 7); ctx.fill();
            ctx.scale(1.35 + up * 0.3, 1.35 + up * 0.3);
            if (L.glow) { circle(ctx, 3 + w, -11, 4.5, L.glow); }  /* a glow stick or a lantern held up */
            circle(ctx, -6, 0, 7, L.zombie ? ['#7c3aed', '#0e7490', '#b45309'][f.c % 3] : col);  /* the body behind the head */
            ctx.fillStyle = col;
            if (L.zombie) { ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(9, -7 + w); ctx.moveTo(-2, 6); ctx.lineTo(9, 7 - w); ctx.stroke(); }
            else { circle(ctx, 3 + w, -8, 2.8, col); circle(ctx, 3 - w, 8, 2.8, col); }  /* waving paws */
            circle(ctx, 2, 0, 6.5, col); ctx.strokeStyle = 'rgba(40,30,20,.45)'; ctx.lineWidth = 0.8; ctx.stroke();
            if (DOG && !L.zombie) {  /* floppy ears and a snout */
                ctx.fillStyle = f.c % 2 ? '#5b3a24' : '#a0663a'; ctx.beginPath(); ctx.ellipse(0, -6, 4.5, 2.6, 0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 6, 4.5, 2.6, -0.3, 0, 7); ctx.fill();
                circle(ctx, 7, 0, 3, '#f3e3c3'); circle(ctx, 9, 0, 1.6, '#1f2937');
            } else if (!L.zombie) {
                ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(-4, -9); ctx.lineTo(2, -6); ctx.moveTo(-1, 3); ctx.lineTo(-4, 9); ctx.lineTo(2, 6); ctx.fill();
            } else { ctx.fillStyle = '#3f3a2a'; ctx.beginPath(); ctx.ellipse(-1, 0, 3.5, 4.5, 0, 0, 7); ctx.fill(); }
            circle(ctx, 6, -2.4, 1.3, '#1f2937'); circle(ctx, 6, 2.4, 1.3, '#1f2937');
            if (f.flag >= 0 && !L.zombie) {  /* a little flag on a stick */
                ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3 + w, -8); ctx.lineTo(10 + w, -16); ctx.stroke();
                ctx.fillStyle = FLAG[f.flag]; ctx.beginPath(); ctx.moveTo(10 + w, -16); ctx.lineTo(4 + w + Math.sin(t * 2) * 2, -22); ctx.lineTo(7 + w, -14); ctx.fill();
            }
            ctx.restore();
        }
    }
