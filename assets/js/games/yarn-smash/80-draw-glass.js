    /* ---------- drawing helpers ---------- */
    function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function quadW(a) {  /* a path through 4 world points [x, y, z, ...]; false if any is behind the camera */
        var s = [];
        for (var i = 0; i < 12; i += 3) { if (!P(a[i], a[i + 1], a[i + 2])) return false; s.push(px, py); }
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.lineTo(s[4], s[5]); ctx.lineTo(s[6], s[7]); ctx.closePath();
        return true;
    }
    function box(lx, z, w, d, y0, y1, cf, cs, ct) {  /* a box standing at local x lx; draws the faces the camera sees */
        var za = z - d / 2, zb = z + d / 2;
        if (za - camZ < NEAR + 0.05) return;
        var ca = cx(za), cb = cx(zb), xl = lx - w / 2, xr = lx + w / 2, X = ca + lx - camX - camS * (za - camZ);
        if (X > w / 2 && quadW([ca + xl, y0, za, cb + xl, y0, zb, cb + xl, y1, zb, ca + xl, y1, za])) { ctx.fillStyle = cs; ctx.fill(); }
        else if (X < -w / 2 && quadW([ca + xr, y0, za, cb + xr, y0, zb, cb + xr, y1, zb, ca + xr, y1, za])) { ctx.fillStyle = cs; ctx.fill(); }
        if (y1 < EYE && quadW([ca + xl, y1, za, ca + xr, y1, za, cb + xr, y1, zb, cb + xl, y1, zb])) { ctx.fillStyle = ct; ctx.fill(); }
        if (quadW([ca + xl, y0, za, ca + xr, y0, za, ca + xr, y1, za, ca + xl, y1, za])) { ctx.fillStyle = cf; ctx.fill(); }
    }
    function rectW(lx0, lx1, y0, y1, z) {  /* screen rect of a local rectangle in the plane z */
        if (!PL(lx0, y1, z)) return null;
        var x = px, y = py; PL(lx1, y0, z);
        return [x, y, px - x, py - y];
    }
    function archPath(sx, sy, k) {
        ctx.moveTo(sx - OW * k, sy); ctx.lineTo(sx - OW * k, sy - OH * k);
        ctx.arc(sx, sy - OH * k, OW * k, Math.PI, TAU); ctx.lineTo(sx + OW * k, sy); ctx.closePath();
    }
    function shadow(x, z, rw, a) {  /* a soft contact shadow on the floor */
        if (!P(x, floorAt(x - cx(z), z), z) || a <= 0.01) return;
        var dz = z - camZ, sq = clamp(EYE / dz, 0.08, 0.7);
        ctx.save(); ctx.translate(px, py); ctx.scale(1, sq);
        ctx.globalAlpha = a; ctx.drawImage(glowSpr([10, 6, 24]), -rw * pk, -rw * pk, 2 * rw * pk, 2 * rw * pk);
        ctx.restore();
    }

    /* ---------- glass, frames, gates and hatches ---------- */
    function drawGlass(e) {
        if (!paneQuad(e, clock)) return;
        var ax = QD[0], ay = QD[1], bx = QD[2], by = QD[3], cx2 = QD[4], cy2 = QD[5], dx = QD[6], dy = QD[7];
        var dz = e.z - camZ, k = Math.min(F / Math.max(NEAR, dz), 160), st = e.st, f = fogf(dz) * (st.portal ? 0.45 : 1), ca = Math.cos(QA), ga = ghostA(e, clock), A = fade(dz) * clamp((dz - 0.4) / 1.6, 0.35, 1);
        function qp(u, v) {  /* u: -1..1 across the panel, v: 0..1 up */
            var s = (u + 1) / 2, lx = ax + (dx - ax) * s, ly = ay + (dy - ay) * s, ux = bx + (cx2 - bx) * s, uy = by + (cy2 - by) * s;
            return [lx + (ux - lx) * v, ly + (uy - ly) * v];
        }
        function cell(u0, u1, v0, v1) {
            var a = qp(u0, v0), b = qp(u1, v0), c = qp(u1, v1), d = qp(u0, v1);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        }
        if (!e.broken && !e.arch) shadow(QX, e.z, e.w * Math.max(0.3, Math.abs(ca)) * 1.1, A * 0.3 * (1 - Math.min(1, QY / 1.8)) * (0.4 + 0.6 * ga));
        ctx.save();
        if (e.arch && PL(0, 0, e.z)) { ctx.beginPath(); archPath(px, py, pk); ctx.clip(); }
        ctx.globalAlpha = A;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (!e.broken) {
            var tint = st.tint, edge = st.edge || tint, gr = ctx.createLinearGradient(bx, by, dx, dy);
            gr.addColorStop(0, mixa(tint, FOG, f, 0.6 * ga)); gr.addColorStop(0.42, mixa(tint, FOG, f, 0.26 * ga));
            gr.addColorStop(0.5, mixa([255, 255, 255], FOG, f, 0.5 * ga)); gr.addColorStop(0.58, mixa(tint, FOG, f, 0.22 * ga));
            gr.addColorStop(1, mixa(edge, FOG, f, 0.55 * ga));
            cell(-1, 1, 0, 1); ctx.fillStyle = gr; ctx.fill();
            if (st.glow) {
                ctx.strokeStyle = mixa(st.glow, FOG, f * 0.6, 0.32 * ga); ctx.lineWidth = Math.max(3, 0.16 * k);
                cell(-1, 1, 0, 1); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * ga).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, 0.05 * k * Math.abs(ca));
            ctx.beginPath();
            var h1 = qp(-0.6, 0.9), h2 = qp(-0.88, 0.62), h3 = qp(-0.32, 0.9), h4 = qp(-0.8, 0.42), h5 = qp(0.8, 0.38), h6 = qp(0.6, 0.18);
            ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.moveTo(h3[0], h3[1]); ctx.lineTo(h4[0], h4[1]); ctx.moveTo(h5[0], h5[1]); ctx.lineTo(h6[0], h6[1]);
            ctx.stroke();
            if (e.hp > 1) {  /* geode glass: thick, faceted, glowing rim */
                ctx.strokeStyle = 'rgba(236,214,255,.85)'; ctx.lineWidth = Math.max(2, 0.08 * k); cell(-0.93, 0.93, 0.04, 0.96); ctx.stroke();
                if (e.hp > 2) { ctx.lineWidth = Math.max(1.5, 0.05 * k); cell(-0.8, 0.8, 0.1, 0.9); ctx.stroke(); }
                ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, 0.025 * k); ctx.beginPath();
                var fa = qp(-0.93, 0.3), fb = qp(0, 0.04), fc2 = qp(0.93, 0.5), fd = qp(0, 0.96);
                ctx.moveTo(fa[0], fa[1]); ctx.lineTo(fb[0], fb[1]); ctx.lineTo(fc2[0], fc2[1]); ctx.lineTo(fd[0], fd[1]); ctx.closePath(); ctx.stroke();
            }
            if (e.crack) {
                ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1, 0.022 * k);
                ctx.beginPath();
                e.crack.forEach(function (c) { for (var n = 0; n < c.length; n += 2) { var q = qp(clamp(c[n], -1, 1), clamp(c[n + 1], 0, 1)); if (n) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } });
                ctx.stroke();
            }
            if (e.heart) {  /* a crystal heart set in the glass */
                var hc = qp(0, 0.55), hs = Math.max(3, 0.2 * k);
                halo(hc[0], hc[1], hs * 2.4, [120, 255, 180], A * 0.6 * ga); ctx.globalAlpha = A * ga;
                ctx.fillStyle = '#7ce8b0'; ctx.beginPath(); ctx.moveTo(hc[0], hc[1] - hs); ctx.lineTo(hc[0] + hs * 0.6, hc[1]); ctx.lineTo(hc[0], hc[1] + hs); ctx.lineTo(hc[0] - hs * 0.6, hc[1]); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#d8ffe9'; ctx.beginPath(); ctx.moveTo(hc[0], hc[1] - hs); ctx.lineTo(hc[0] + hs * 0.6, hc[1]); ctx.lineTo(hc[0], hc[1]); ctx.closePath(); ctx.fill();
            }
            ctx.globalAlpha = A * (0.3 + 0.7 * ga);
            ctx.strokeStyle = st.frame; ctx.lineWidth = Math.max(1.5, 0.045 * k);
            cell(-1, 1, 0, 1); ctx.stroke();
        } else {
            ctx.fillStyle = mixa(st.tint, FOG, f, 0.55);
            [[-1, 0, 1, 1], [1, 0, -1, 1], [-1, 1, 1, -1], [1, 1, -1, -1]].forEach(function (c, n) {
                var l = 0.25 + hash(e.seed + n) * 0.3, a = qp(c[0], c[1]), b = qp(c[0] + c[2] * l, c[1]), m = qp(c[0] + c[2] * l * 0.3, c[1] + c[3] * l * 0.3), d = qp(c[0], c[1] + c[3] * l * 0.8);
                ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(m[0], m[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
            });
        }
        ctx.restore();
    }
    function drawFrame(e) {
        var dz = e.z - camZ;
        if (dz < NEAR + 0.05) return;
        var Z = e.Z, f = fogf(dz), A = fade(dz), t = 0.1, r, glow = Z.gate;
        ctx.globalAlpha = A; ctx.fillStyle = mixc(Z.post, FOG, f);
        if (e.kind === 'pivot') {
            r = rectW(-0.04, 0.04, 0, e.y1 + 0.55, e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            if (PL(0, e.y1 + 0.55, e.z)) { ctx.fillStyle = mixc([240, 190, 100], FOG, f); ctx.beginPath(); ctx.arc(px, py, Math.max(2, 0.14 * pk), 0, TAU); ctx.fill(); }
            ctx.globalAlpha = 1; return;
        }
        var tops = [];
        r = rectW(-e.half - t, -e.half + t * 0.4, 0, e.y1 + t, e.z); if (r) { ctx.fillRect(r[0], r[1], r[2], r[3]); tops.push(-e.half - t * 0.3); }
        r = rectW(e.half - t * 0.4, e.half + t, 0, e.y1 + t, e.z); if (r) { ctx.fillRect(r[0], r[1], r[2], r[3]); tops.push(e.half + t * 0.3); }
        if (e.kind === 'rail' || e.kind === 'lock') {
            r = rectW(-e.half - t, e.half + t, e.y1, e.y1 + (e.kind === 'lock' ? 0.36 : t), e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            if (e.kind === 'lock' && r) {  /* warning lights over the airlock */
                for (var i = 0; i < 5; i++) {
                    var on = Math.sin(clock * 4 + i * 1.3) > 0 || RM, lc = i % 2 ? [255, 120, 220] : [120, 230, 255];
                    if (PL(-e.half + (i + 0.5) * e.half * 2 / 5, e.y1 + 0.18, e.z)) {
                        ctx.globalAlpha = A; ctx.fillStyle = rgba(on ? lc : [60, 50, 90]); ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, 0.07 * pk), 0, TAU); ctx.fill();
                        if (on) halo(px, py, 0.3 * pk, lc, A * 0.5);
                    }
                }
            }
        }
        tops.forEach(function (x) { if (PL(x, e.y1 + t + 0.08, e.z)) { halo(px, py, 0.32 * pk, glow, A * 0.55); ctx.globalAlpha = A; ctx.fillStyle = rgba(lerpc(glow, [255, 255, 255], 0.5)); ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, 0.07 * pk), 0, TAU); ctx.fill(); } });
        ctx.globalAlpha = 1;
    }
    function drawPortal(e) {
        if (!PL(0, 0, e.z)) return;
        var k = pk, sx = px, sy = py, Zn = ZONES[e.zi % NZ], dz = e.z - camZ, A = fade(dz), c1 = Zn.gate, c2 = Zn.gate2, Hh = (OH + OW + 1.5) * k;
        ctx.save();
        ctx.translate(sx, sy); ctx.scale(1, clamp(EYE / dz, 0.06, 0.6));  /* a pool of light on the ground */
        ctx.globalAlpha = A * 0.55; ctx.drawImage(glowSpr(c1), -3.4 * k, -3.4 * k, 6.8 * k, 6.8 * k);
        ctx.restore();
        ctx.globalAlpha = A;
        [-1, 1].forEach(function (sd) {  /* two tapering pylons with glowing runes */
            var x0 = sx + sd * (OW + 0.55) * k, bw = 0.34 * k, tw = 0.16 * k;
            var gr = ctx.createLinearGradient(0, sy - Hh, 0, sy);
            gr.addColorStop(0, rgba(lerpc(c1, [40, 30, 70], 0.35))); gr.addColorStop(1, rgba(lerpc(c1, [30, 20, 50], 0.75)));
            ctx.fillStyle = gr;
            ctx.beginPath(); ctx.moveTo(x0 - bw, sy); ctx.lineTo(x0 - tw, sy - Hh); ctx.lineTo(x0 + tw, sy - Hh); ctx.lineTo(x0 + bw, sy); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = rgba(c2, 0.9); ctx.lineWidth = Math.max(1, 0.04 * k);
            ctx.beginPath();
            for (var i = 0; i < 4; i++) { var yy = sy - (0.6 + i * 0.95) * k; ctx.moveTo(x0 - 0.08 * k, yy); ctx.lineTo(x0, yy - 0.18 * k); ctx.lineTo(x0 + 0.08 * k, yy); }
            ctx.stroke();
            var bob = RM ? 0 : Math.sin(clock * 2 + sd) * 0.12 * k, cyy = sy - Hh - 0.45 * k + bob;
            halo(x0, cyy, 0.9 * k, c2, A * 0.6);
            ctx.globalAlpha = A; ctx.fillStyle = rgba(lerpc(c2, [255, 255, 255], 0.5));
            ctx.beginPath(); ctx.moveTo(x0, cyy - 0.28 * k); ctx.lineTo(x0 + 0.13 * k, cyy); ctx.lineTo(x0, cyy + 0.28 * k); ctx.lineTo(x0 - 0.13 * k, cyy); ctx.closePath(); ctx.fill();
        });
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var widths = [[0.55, rgba(c1, 0.25)], [0.2, rgba(c1, 0.95)], [0.07, rgba(lerpc(c2, [255, 255, 255], 0.4))]];
        widths.forEach(function (wc) {
            ctx.strokeStyle = wc[1]; ctx.lineWidth = Math.max(1, wc[0] * k);
            ctx.beginPath(); ctx.moveTo(sx - OW * k, sy); ctx.lineTo(sx - OW * k, sy - OH * k); ctx.arc(sx, sy - OH * k, OW * k, Math.PI, TAU); ctx.lineTo(sx + OW * k, sy); ctx.stroke();
        });
        locks.forEach(function (ls) {  /* the 2 s window of a gate challenge, as a shrinking arc of light */
            if (ls.gz !== e.gz || ls.t < 0 || ls.done) return;
            var left = clamp(1 - (clock - ls.t) / 2, 0, 1);
            ctx.globalAlpha = A; ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = Math.max(2, 0.12 * k);
            ctx.beginPath(); ctx.arc(sx, sy - OH * k, (OW + 0.6) * k, Math.PI, Math.PI + Math.PI * left); ctx.stroke();
        });
        for (var i = 0; i < 9; i++) {  /* sparks running round the arch */
            var an = Math.PI + (((RM ? 0 : clock * 0.22) + i / 9) % 1) * Math.PI, rr2 = (OW + 0.28) * k;
            halo(sx + Math.cos(an) * rr2, sy - OH * k + Math.sin(an) * rr2, 0.16 * k, c2, A * 0.9);
        }
        ctx.globalAlpha = 1;
    }
    function drawDoor(e) {  /* a brass bulkhead across the walkway with a hatch that opens when its lever is hit */
        if (!PL(0, 0, e.z)) return;
        var k = pk, dz = e.z - camZ, c0 = cx(e.z), sx = px, B = py, hw = 4.3, L = sx - hw * k, R = sx + hw * k, T = B - 7.5 * k, Bb = B + 1.2 * k;
        var dl = sx - DW / 2 * k, dr = sx + DW / 2 * k, dt = B - DH * k, f = fogf(dz);
        ctx.globalAlpha = fade(dz);
        var ca = Math.cos(e.a), sa = Math.sin(e.a), hx = -DW / 2;
        function leaf(u0, u1, v0, v1) {
            return quadW([c0 + hx + DW * ca * u0, DH * v0, e.z + DW * sa * u0, c0 + hx + DW * ca * u1, DH * v0, e.z + DW * sa * u1,
                          c0 + hx + DW * ca * u1, DH * v1, e.z + DW * sa * u1, c0 + hx + DW * ca * u0, DH * v1, e.z + DW * sa * u0]);
        }
        if (leaf(0, 1, 0, 1)) { ctx.fillStyle = mixc([176, 120, 60], FOG, f); ctx.fill(); }
        ctx.fillStyle = mixc([140, 92, 46], FOG, f);
        if (leaf(0.14, 0.86, 0.55, 0.9)) ctx.fill();
        if (leaf(0.14, 0.86, 0.1, 0.45)) ctx.fill();
        ctx.beginPath(); ctx.rect(L, T, R - L, Bb - T);
        ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.closePath();
        var gr = ctx.createLinearGradient(0, T, 0, Bb);
        gr.addColorStop(0, mixc([92, 60, 34], FOG, f)); gr.addColorStop(0.6, mixc([150, 102, 52], FOG, f)); gr.addColorStop(1, mixc([70, 44, 26], FOG, f));
        ctx.fillStyle = gr; ctx.fill('evenodd');
        ctx.fillStyle = mixc([230, 176, 92], FOG, f);
        ctx.fillRect(L, B - 2.7 * k, dl - L, 0.12 * k); ctx.fillRect(dr, B - 2.7 * k, R - dr, 0.12 * k); ctx.fillRect(L, B - 5.2 * k, R - L, 0.12 * k);
        for (var i = 0; i < 2; i++) {  /* two big gears set into the wall */
            var gx = sx + (i ? 1 : -1) * 2.6 * k, gy = B - 1.4 * k;
            ctx.save(); ctx.translate(gx, gy); ctx.rotate((i ? 1 : -1) * (RM ? 0 : clock * 0.6));
            ctx.drawImage(SPR.gear(i).cv, -1.1 * k, -1.1 * k, 2.2 * k, 2.2 * k); ctx.restore();
        }
        ctx.strokeStyle = '#ffd38a'; ctx.lineWidth = Math.max(2, 0.08 * k); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.stroke();
        if (!e.open || e.a < 0.3) {
            pos(e, clock);
            if (P(SX, SY, SZ)) {
                var rr = 0.08 * pk;
                if (!e.open) {
                    halo(px, py, rr * 5, [255, 200, 90], RM ? 0.75 : 0.6 + 0.3 * Math.sin(clock * 6));
                    ctx.globalAlpha = fade(dz);
                    ctx.strokeStyle = 'rgba(255,220,140,.9)'; ctx.lineWidth = Math.max(1.5, 0.025 * pk);
                    ctx.beginPath(); ctx.arc(px, py, rr * (2.2 + (RM ? 0 : Math.sin(clock * 6) * 0.5)), 0, TAU); ctx.stroke();
                }
                ctx.fillStyle = '#ffd25c'; ctx.strokeStyle = '#b07a1e'; ctx.lineWidth = Math.max(1, 0.02 * pk);
                gearPath(ctx, px, py, rr * 1.3, 8, rr * 0.35); ctx.fill(); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

