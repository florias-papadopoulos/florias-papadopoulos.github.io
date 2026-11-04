    /* ---------- strips: the ground, walls and roofs of each world ---------- */
    var bz = [], nK, nS, nY, fK, fS, fY, SF, SL, SDZ, SPAR, SNEAR, SZN, SZF, SGN, SGF, SCN, SCF;
    function buildStrips() {
        bz.length = 0;
        var z = camZ + NEAR, end = camZ + FAR;
        bz.push(z);
        while (z < end - 1e-6) {
            var d = z - camZ, st = d < 12 ? 1 : d < 24 ? 2 : 4;
            z = Math.min(end, (Math.floor(z / st + 1e-7) + 1) * st);
            bz.push(z);
        }
    }
    function setStrip(zn, zf, Z) {
        var zx = zf + (zf - zn) * 0.05, dn = zn - camZ, dx = zx - camZ;  /* the far edge overlaps a little: no seams */
        nK = F / dn; nS = CX + (cx(zn) - camX - camS * dn) * nK; nY = HOR + (EYE - hy(zn) + camHY) * nK;
        fK = F / dx; fS = CX + (cx(zx) - camX - camS * dx) * fK; fY = HOR + (EYE - hy(zx) + camHY) * fK;
        SDZ = (zn + zf) / 2 - camZ; SF = fogf(SDZ); SZN = zn; SZF = zf;
        SPAR = (Math.floor(zn + 1e-6) & 1); SNEAR = Math.max(0, 1 - SDZ / 16);
        SL = Z.light ? Z.light((zn + zf) / 2) : 1;
        if (envW > 0) SL *= Math.pow((ZONES[envA % NZ].amb + (ZONES[envB % NZ].amb - ZONES[envA % NZ].amb) * envW) / Z.amb, 0.85);  /* light blends with the sky */
        SGN = growAt(zn); SGF = growAt(zx); SCN = 1 + (1 - SGN) * 3.2; SCF = 1 + (1 - SGF) * 3.2;
    }
    function QQ(xan, yan, xbn, ybn, xaf, yaf, xbf, ybf, fill) {
        ctx.beginPath();
        ctx.moveTo(nS + xan * nK, nY - yan * nK); ctx.lineTo(nS + xbn * nK, nY - ybn * nK);
        ctx.lineTo(fS + xbf * fK, fY - ybf * fK); ctx.lineTo(fS + xaf * fK, fY - yaf * fK);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function Q(xa, ya, xb, yb, fill) { QQ(xa, ya, xb, yb, xa, ya, xb, yb, fill); }
    function QS(xa, ya, xb, yb, fill) { QQ(xa * SCN, ya * SCN, xb * SCN, yb * SCN, xa * SCF, ya * SCF, xb * SCF, yb * SCF, fill); }  /* scaled out near the gates */
    function QF(t0, t1, xa, xb, y, fill) {  /* a piece of floor from t0 to t1 of the way to the strip's far edge */
        var k0 = nK + (fK - nK) * t0, s0 = nS + (fS - nS) * t0, b0 = nY + (fY - nY) * t0;
        var k1 = nK + (fK - nK) * t1, s1 = nS + (fS - nS) * t1, b1 = nY + (fY - nY) * t1;
        ctx.beginPath();
        ctx.moveTo(s0 + xa * k0, b0 - y * k0); ctx.lineTo(s0 + xb * k0, b0 - y * k0);
        ctx.lineTo(s1 + xb * k1, b1 - y * k1); ctx.lineTo(s1 + xa * k1, b1 - y * k1);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function wallSeg(x, za, zb, y0, y1, fill) {  /* a piece of a (scaled) side wall between za and zb, like a window */
        var L = SZF - SZN, t0 = clamp((za - SZN) / L, 0, 1), t1 = clamp((zb - SZN) / L, 0, 1);
        if (t1 <= t0) return;
        var k0 = nK + (fK - nK) * t0, s0 = nS + (fS - nS) * t0, b0 = nY + (fY - nY) * t0, c0 = SCN + (SCF - SCN) * t0;
        var k1 = nK + (fK - nK) * t1, s1 = nS + (fS - nS) * t1, b1 = nY + (fY - nY) * t1, c1 = SCN + (SCF - SCN) * t1;
        ctx.beginPath();
        ctx.moveTo(s0 + x * c0 * k0, b0 - y0 * k0); ctx.lineTo(s0 + x * c0 * k0, b0 - y1 * k0);
        ctx.lineTo(s1 + x * c1 * k1, b1 - y1 * k1); ctx.lineTo(s1 + x * c1 * k1, b1 - y0 * k1);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function edgeLine(x, y, col, w) {  /* a line running along the strip, like a rope or a rail */
        ctx.beginPath(); ctx.moveTo(nS + x * nK, nY - y * nK); ctx.lineTo(fS + x * fK, fY - y * fK);
        ctx.strokeStyle = col; ctx.lineWidth = clamp(w * (nK + fK) / 2, 0.6, 9); ctx.stroke();
    }
    function dots(seed, n, x0, x1, col) {  /* small glowing specks on the floor of this strip */
        for (var i = 0; i < n; i++) { var h = hash(seed + i * 7.3), h2 = hash(seed * 1.7 + i), x = x0 + (x1 - x0) * h; QF(h2 * 0.8, h2 * 0.8 + 0.12, x, x + 0.06, 0.002, col); }
    }
    function C(c, k) { return mixc(c, FOG, SF, (k || 1) * SL); }
    function CP(c, k) { return C(c, (k || 1) * (1 - 0.06 * SPAR * SNEAR)); }  /* checkered by metre, fading with distance */
    function CE(c, k) { return mixc(c, FOG, SF * 0.55, k); }                    /* glowing: the fog dims it less */
    function CA(c, a) { return mixa(c, FOG, SF, a); }
    function at(z, step) { return Math.abs(z / step - Math.round(z / step)) < 1e-4; }
    function nearLine(pts, col, w, close) {  /* a polyline in the plane of the strip's near edge */
        ctx.beginPath();
        for (var i = 0; i < pts.length; i += 2) { var x = nS + pts[i] * nK, y = nY - pts[i + 1] * nK; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        if (close) { ctx.closePath(); ctx.fillStyle = col; ctx.fill(); return; }
        ctx.strokeStyle = col; ctx.lineWidth = clamp(w * nK, 1, 14); ctx.stroke();
    }
    function nearRect(x0, x1, y0, y1, col) { ctx.fillStyle = col; ctx.fillRect(nS + x0 * nK, nY - y1 * nK, (x1 - x0) * nK, (y1 - y0) * nK); }

    /* Skyfall Isles: grassy floating islands joined by rope bridges, the cloud sea far below */
    function bridgeAt(z) { var u = z - zoneIdx(z) * ZL, m = ((z % 28) + 28) % 28; return u > 16 && u < ZL - 16 && m >= 16 && hash(Math.floor(z / 28) + 3.7) > 0.25; }
    function fallsAt(z) {  /* the waterfall run: a narrow bridge behind curtains of falling water, from 52 to 108 m into the isles */
        var zi = zoneIdx(z), u = z - zi * ZL;
        return ZONES[zi % NZ].key === 'isles' && u >= 52 && u < 108;
    }
    K.isles.strip = function () {
        if (fallsAt(SZN + 0.01)) {
            Q(-0.9, -0.1, -0.8, -0.1, C([70, 50, 52])); Q(0.8, -0.1, 0.9, -0.1, C([70, 50, 52]));
            if (SZF - SZN < 1.5) QF(0, 0.72, -0.95, 0.95, 0, C([146, 104, 84], SPAR ? 0.93 : 1)); else Q(-0.95, 0, 0.95, 0, C([136, 98, 80]));
            var wc = CA([238, 248, 255], 0.5), wf = CA([255, 255, 255], 0.3);
            Q(-1.45, -10, -1.45, 3.0, wc); Q(1.45, -10, 1.45, 3.0, wc);
            Q(-1.45, 3.0, 0, 3.6, wf); Q(0, 3.6, 1.45, 3.0, wf);
            if (SDZ < 30) { var rc2 = C([226, 190, 140]); edgeLine(-1.0, 0.9, rc2, 0.03); edgeLine(1.0, 0.9, rc2, 0.03); }
            return;
        }
        if (bridgeAt(SZN + 0.01)) {
            Q(-0.96, -0.12, -0.84, -0.12, C([92, 62, 54])); Q(0.84, -0.12, 0.96, -0.12, C([92, 62, 54]));
            if (SZF - SZN < 1.5) { QF(0, 0.64, -1, 1, 0, C([196, 140, 96], SPAR ? 0.95 : 1)); QF(0.64, 0.7, -1, 1, 0, C([120, 82, 62])); }
            else Q(-1, 0, 1, 0, C([168, 120, 86]));
            if (SDZ < 34) {
                var rc = C([226, 190, 140]);
                edgeLine(-1.08, 0.95, rc, 0.03); edgeLine(1.08, 0.95, rc, 0.03); edgeLine(-1.08, 0.48, rc, 0.02); edgeLine(1.08, 0.48, rc, 0.02);
            }
            return;
        }
        var g1 = [86, 158, 92], g2 = [116, 182, 104], p = [232, 206, 160];
        Q(-1.84, -0.06, -1.74, 0, C([62, 116, 76])); Q(1.74, 0, 1.84, -0.06, C([62, 116, 76]));
        Q(-1.74, 0, -1.08, 0, CP(g1)); Q(1.08, 0, 1.74, 0, CP(g1, 1.05));
        Q(-1.08, 0, -0.62, 0, CP(g2)); Q(0.62, 0, 1.08, 0, CP(g2, 1.05));
        Q(-0.62, 0, -0.48, 0, C([170, 194, 132])); Q(0.48, 0, 0.62, 0, C([176, 198, 136]));
        Q(-0.48, 0, 0.48, 0, CP(p));
    };
    K.isles.front = function (zn) {
        if (fallsAt(zn + 0.01)) {
            if (SDZ < 0.8) return;
            var a = (0.35 + 0.3 * (RM ? 0.3 : Math.sin(clock * 9 + zn * 1.7))) * (1 - SF);
            nearLine([-1.44, 3.0, -1.44, -6], 'rgba(255,255,255,' + a.toFixed(2) + ')', 0.05);
            nearLine([1.44, 3.0, 1.44, -6], 'rgba(255,255,255,' + (a * 0.8).toFixed(2) + ')', 0.05);
            if (at(zn, 2)) { var pc2 = C([110, 78, 60]); nearLine([-1.0, 0, -1.0, 0.98], pc2, 0.06); nearLine([1.0, 0, 1.0, 0.98], pc2, 0.06); }
            return;
        }
        if (bridgeAt(zn + 0.01)) {
            if (at(zn, 2) && SDZ > 0.8) {
                var pc = C([120, 84, 62]);
                nearLine([-1.08, 0, -1.08, 1.05], pc, 0.07); nearLine([1.08, 0, 1.08, 1.05], pc, 0.07);
            }
        } else if (bridgeAt(zn - 0.5) && SDZ > 0.6) {  /* the rocky face where an island begins after a bridge */
            nearLine([-1.84, 0, 1.84, 0, 1.3, -0.8, 0.5, -2.6, -0.4, -2.0, -1.3, -0.9], C([150, 100, 104]), 0, true);
            nearLine([-1.84, 0, 1.84, 0, 1.6, -0.25, -1.6, -0.25], C([86, 150, 90]), 0, true);
        }
    };
    K.isles.inside = function (lx, y, z) {
        var a = Math.abs(lx);
        if (fallsAt(z)) return a < 1.45 && y < 3.2 && y > (a < 1.0 ? 0 : -6);
        return a < 16 && y < 12 && y > (a < 1.8 ? 0 : -6);
    };
    K.isles.floor = function (lx, z) { return Math.abs(lx) < (fallsAt(z) ? 1.0 : 1.8) ? 0 : -60; };

    /* Glowcap Hollow: a mossy trail under giant glowing mushrooms */
    K.glow.light = function (z) { var u = ((z % 9) + 9) % 9 - 4.5; return 0.8 + 0.4 * Math.exp(-u * u / 5); };
    K.glow.strip = function () {
        var gr = [26, 54, 66], pa = [40, 80, 92];
        Q(-10, 0, -1.36, 0, CP(gr)); Q(1.36, 0, 10, 0, CP(gr, 1.04));
        Q(-1.36, 0, -0.55, 0, CP(pa)); Q(0.55, 0, 1.36, 0, CP(pa, 1.04));
        Q(-0.55, 0, 0.55, 0, CP([50, 98, 110]));
        Q(-1.44, 0.002, -1.32, 0.002, CE([80, 240, 200], 0.8)); Q(1.32, 0.002, 1.44, 0.002, CE([200, 120, 255], 0.75));
        if (SDZ < 30) { var zs = Math.floor(SZN + 1e-6); dots(zs * 3.1, SZF - SZN < 1.5 ? 3 : 5, -2.6, 2.6, CE(zs % 3 ? [120, 255, 220] : [255, 140, 230])); }
    };
    K.glow.inside = function (lx, y) { return Math.abs(lx) < 10 && y > 0 && y < 10; };

    /* Geode Depths: a faceted crystal tunnel that opens into a huge cavern near the gates */
    var GEO = [-2.35, 0, -2.85, 1.0, -2.75, 2.2, -2.1, 3.05, -1.0, 3.5, 0, 3.62, 1.0, 3.5, 2.1, 3.05, 2.75, 2.2, 2.85, 1.0, 2.35, 0];
    var FACET = [[78, 52, 140], [60, 70, 148], [98, 60, 150], [52, 92, 142], [116, 70, 158], [70, 48, 124]];
    K.geode.light = function (z) { var u = ((z % 11) + 11) % 11 - 5.5; return (0.8 + 0.32 * Math.exp(-u * u / 7)) * (0.72 + 0.28 * Math.min(1, (z - camZ) / 9)); };
    K.geode.strip = function () {
        var blk = Math.floor(SZN / 2 + 1e-6);
        QS(-2.35, 0, 2.35, 0, CP([46, 34, 68]));
        Q(-0.8, 0.001, 0.8, 0.001, CP([60, 46, 84]));
        if (SDZ < 30) dots(Math.floor(SZN + 1e-6) * 5.3, 2, -2.1, 2.1, CE(blk % 2 ? [255, 130, 230] : [130, 220, 255]));
        for (var i = 0; i < GEO.length - 2; i += 2) {
            var hh = hash(blk * 11 + i), up = (GEO[i + 1] + GEO[i + 3]) / 2 > 2.9;
            QS(GEO[i], GEO[i + 1], GEO[i + 2], GEO[i + 3], C(FACET[(hh * FACET.length) | 0], (up ? 0.74 : 0.96) * (0.92 + 0.16 * hh) * (GEO[i + 1] + GEO[i + 3] < 1.5 ? 0.82 : 1)));
            if (hh > 0.8 && SDZ < 26) QS(GEO[i] * 0.98, GEO[i + 1] * 0.98 + 0.05, GEO[i + 2] * 0.98, GEO[i + 3] * 0.98 + 0.05, CA([210, 160, 255], 0.28));
        }
    };
    K.geode.front = function (zn) {
        if (!at(zn, 2) || SDZ < 1.2 || SDZ > 32) return;
        var s = SCN, pts = [];
        for (var i = 0; i < GEO.length; i += 2) pts.push(GEO[i] * s, GEO[i + 1] * s);
        ctx.globalAlpha = Math.min(1, (SDZ - 1.2) / 2) * (1 - SDZ / 32);
        nearLine(pts, 'rgba(226,200,255,.55)', 0.035);
        ctx.globalAlpha = 1;
    };
    K.geode.inside = function (lx, y, z) { var s = 1 + (1 - growAt(z)) * 3.2, u = lx / (2.95 * s), v = y / (3.62 * s); return y > 0 && u * u + v * v < 1; };

    /* Aurora Palace: a polished ice causeway between snowfields, ice arches overhead */
    var ARCHI = [];
    for (var ai = 0; ai <= 20; ai++) { var aa = Math.PI * (1 - ai / 20); ARCHI.push(Math.cos(aa) * 2.78, 3.0 + Math.sin(aa) * 1.55); }
    K.aurora.strip = function () {
        Q(-16, 0, -2.62, 0, CP([206, 224, 244])); Q(2.62, 0, 16, 0, CP([214, 230, 248]));
        Q(-2.62, 0, -1.3, 0, CP([138, 184, 222])); Q(1.3, 0, 2.62, 0, CP([144, 190, 226]));
        Q(-1.3, 0, 1.3, 0, CP([164, 206, 238]));
        Q(-0.4, 0.002, 0.4, 0.002, CA([150, 255, 210], 0.09 + 0.05 * Math.sin(SZN * 0.35 + clock * 0.8)));
        var hn = 0.66 * SGN, hf = 0.66 * SGF;
        if (hn > 0.02 || hf > 0.02) {
            QQ(-2.62, 0, -2.62, hn, -2.62, 0, -2.62, hf, CA([196, 232, 255], 0.6)); QQ(2.62, 0, 2.62, hn, 2.62, 0, 2.62, hf, CA([206, 238, 255], 0.6));
            QQ(-2.74, hn, -2.56, hn, -2.74, hf, -2.56, hf, C([246, 252, 255])); QQ(2.56, hn, 2.74, hn, 2.56, hf, 2.74, hf, C([246, 252, 255]));
        }
    };
    K.aurora.front = function (zn) {
        if (!at(zn, 8) || SDZ < 1 || SGN < 0.03) return;
        var g = SGN, pts = [];
        for (var i = 0; i < ARCHI.length; i += 2) pts.push(ARCHI[i], ARCHI[i + 1] * g);
        ctx.globalAlpha = Math.min(1, (SDZ - 1) / 2) * (1 - 0.6 * SF);
        nearRect(-2.98, -2.58, 0, 3.0 * g, C([214, 240, 255])); nearRect(2.58, 2.98, 0, 3.0 * g, C([200, 232, 252]));
        nearRect(-2.98, -2.86, 0, 3.0 * g, 'rgba(255,255,255,.55)'); nearRect(2.58, 2.68, 0, 3.0 * g, 'rgba(255,255,255,.55)');
        nearLine(pts, CA([140, 230, 255], 0.3), 0.42);
        nearLine(pts, C([232, 248, 255]), 0.16);
        ctx.globalAlpha = 1;
    };
    K.aurora.inside = function (lx, y) { return Math.abs(lx) < 12 && y > 0 && y < 10; };

    /* Clockwork Spire: a brass walkway across the shaft of a giant clock tower */
    var PANEL = [[118, 74, 42], [104, 66, 40], [128, 84, 46]];
    K.clock.light = function (z) { var u = ((z % 12) + 12) % 12 - 6; return 0.84 + 0.32 * Math.exp(-u * u / 8); };
    K.clock.strip = function () {
        var blk = Math.floor(SZN / 4 + 1e-6), pc = PANEL[(hash(blk) * 3) | 0];
        QS(-4.2, -6, -4.2, 7.5, C(pc, 0.86)); QS(4.2, -6, 4.2, 7.5, C(pc));
        QS(-4.2, -6, -4.2, -1.2, C([40, 26, 18])); QS(4.2, -6, 4.2, -1.2, C([46, 30, 20]));
        QS(-4.2, 2.6, -4.2, 2.78, C([226, 170, 90])); QS(4.2, 2.6, 4.2, 2.78, C([232, 176, 92]));
        if (SDZ < 34) for (var wz = Math.floor(SZN / 8) * 8; wz < SZF; wz += 8) for (var sd = -1; sd <= 1; sd += 2) {  /* tall lit windows */
            var lit = hash(wz * 0.37 + sd) > 0.3;
            wallSeg(sd * 4.19, wz + 2, wz + 4.2, 1.7, 4.6, C([60, 36, 22]));
            if (lit) { wallSeg(sd * 4.18, wz + 2.2, wz + 4.0, 1.85, 4.45, CE([255, 190, 100], 0.95)); wallSeg(sd * 4.17, wz + 3.02, wz + 3.18, 1.85, 4.45, C([90, 56, 30])); wallSeg(sd * 4.17, wz + 2.2, wz + 4.0, 3.1, 3.2, C([90, 56, 30])); }
        }
        if (SDZ < 32) { var pp = C([196, 140, 70]); QS(-4.18, 1.3, -4.18, 1.48, pp); QS(4.18, 1.3, 4.18, 1.48, pp); QS(-4.18, 3.6, -4.18, 3.72, C([170, 120, 60])); QS(4.18, 3.6, 4.18, 3.72, C([170, 120, 60])); }
        Q(-1.62, 0, 1.62, 0, CP([116, 80, 50]));
        Q(-0.62, 0.001, 0.62, 0.001, CP([158, 114, 62]));
        Q(-1.72, -0.16, -1.62, 0, C([214, 162, 82])); Q(1.62, 0, 1.72, -0.16, C([214, 162, 82]));
        if (SDZ < 36) { var rc = C([236, 186, 96]); edgeLine(-1.66, 1.0, rc, 0.05); edgeLine(1.66, 1.0, rc, 0.05); }
    };
    K.clock.front = function (zn) {
        if (SDZ < 0.8) return;
        if (at(zn, 2)) { var pc = C([190, 140, 70]); nearLine([-1.66, 0, -1.66, 1.0], pc, 0.06); nearLine([1.66, 0, 1.66, 1.0], pc, 0.06); }
        if (at(zn, 4) && SDZ < 30) { var s = SCN, lc = C([70, 44, 26]); nearLine([-4.2 * s, -1.2, -4.2 * s, 7.5], lc, 0.08); nearLine([4.2 * s, -1.2, 4.2 * s, 7.5], lc, 0.08); }
        if (at(zn, 16) && SGN > 0.4) {
            ctx.globalAlpha = (SGN - 0.4) / 0.6;
            nearRect(-4.2 * SCN, 4.2 * SCN, 5.0, 5.35, C([150, 104, 56]));
            nearRect(-4.2 * SCN, 4.2 * SCN, 5.0, 5.07, C([230, 176, 92]));
            ctx.globalAlpha = 1;
        }
    };
    K.clock.inside = function (lx, y, z) { var a = Math.abs(lx), s = 1 + (1 - growAt(z)) * 3.2; return a < 4.2 * s && y < 9 && y > (a < 1.7 ? 0 : -6); };
    K.clock.floor = function (lx) { return Math.abs(lx) < 1.7 ? 0 : -60; };

    /* Starlight Road: a glowing glass ribbon through space */
    K.stars.strip = function () {
        Q(-1.55, 0, 1.55, 0, CP([30, 26, 72]));
        Q(-0.9, 0.001, 0.9, 0.001, CP([38, 32, 88]));
        if (SDZ < 36 && Math.floor(SZN + 1e-6) % 3 === 0) Q(-0.05, 0.002, 0.05, 0.002, CE([130, 232, 255]));
        Q(-1.63, 0.01, -1.5, 0.01, CE([255, 112, 214])); Q(1.5, 0.01, 1.63, 0.01, CE([130, 222, 255]));
    };
    K.stars.front = function (zn) {
        if (SDZ < 1) return;
        if (at(zn, 4) && SDZ < 34) nearLine([-1.5, 0.003, 1.5, 0.003], CA([180, 160, 255], 0.35), 0.025);
        if (at(zn, 24) && SGN > 0.3) {  /* neon hoops over the road */
            var pts = [];
            for (var i = 0; i <= 24; i++) { var a = Math.PI * (1 - i / 24); pts.push(Math.cos(a) * 2.3, Math.sin(a) * 3.3 * SGN); }
            ctx.globalAlpha = Math.min(1, (SDZ - 1) / 2) * (SGN - 0.3) / 0.7;
            nearLine(pts, CA(zn % 48 < 1 ? [255, 120, 220] : [120, 220, 255], 0.3), 0.4);
            nearLine(pts, CE([255, 240, 255]), 0.08);
            ctx.globalAlpha = 1;
        }
    };
    K.stars.inside = function (lx, y) { var a = Math.abs(lx); return a < 16 && y < 12 && y > (a < 1.6 ? 0 : -8); };
    K.stars.floor = function (lx) { return Math.abs(lx) < 1.6 ? 0 : -60; };

    /* Woolly Dreamland: a striped knitted scarf for a road across rolling knitted meadows */
    var SCARF = [[255, 184, 216], [255, 236, 194], [186, 226, 255], [208, 192, 255], [192, 240, 212]];
    K.wool.light = function (z) { return 0.94 + 0.08 * Math.sin(z * 0.21); };
    K.wool.strip = function () {
        Q(-16, 0, -1.72, 0, CP([180, 230, 204])); Q(1.72, 0, 16, 0, CP([188, 234, 208]));
        var band = SCARF[((Math.floor(SZN / 2 + 1e-6) % 5) + 5) % 5];
        Q(-1.62, 0, 1.62, 0, C(band));
        if (SDZ < 30) { var rc = C(band, 0.85); for (var x = -1.2; x <= 1.21; x += 0.4) edgeLine(x, 0.002, rc, 0.03); }
        Q(-1.74, 0.03, -1.62, 0.03, C([255, 255, 255])); Q(1.62, 0.03, 1.74, 0.03, C([255, 255, 255]));
    };
    K.wool.front = function (zn) {  /* tassels on the scarf's edges */
        if (!at(zn, 2) || SDZ < 1 || SDZ > 26) return;
        var tc = C(SCARF[((Math.floor(zn / 2 + 1e-6) % 5) + 5) % 5], 0.9);
        nearLine([-1.74, 0.03, -1.95, 0.0], tc, 0.06); nearLine([1.74, 0.03, 1.95, 0.0], tc, 0.06);
    };
    K.wool.inside = function (lx, y) { return Math.abs(lx) < 14 && y > 0 && y < 12; };
    K.wool.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.55) prop('knit', z + rnd(0, 4), { lx: side() * rnd(5, 18), s: rnd(5, 11) * (0.4 + 0.6 * g), v: (Math.random() * 3) | 0 });
        if (Math.random() < 0.45 * g) prop('ytree', z + rnd(0, 4), { lx: side() * rnd(2.3, 6), s: rnd(1.0, 1.6), v: Math.random() < 0.5 ? 0 : 1 });
        if (Math.random() < 0.18 * g) prop('button', z + rnd(0, 4), { lx: side() * rnd(3.2, 9), s: rnd(1.2, 2.4), v: Math.random() < 0.5 ? 0 : 1 });
        if (Math.random() < 0.5) prop('pompom', z + rnd(0, 4), { lx: side() * rnd(1.85, 2.8), s: rnd(0.6, 0.9) });
    };
    function floorAt(lx, z) { var Z = zoneOf(z); return Z.floor ? Z.floor(lx, z) : 0; }

    /* ---------- scenery props (every 4 m), drawn as sprites or live ---------- */
    function prop(kind, z, o) { var p = { kind: kind, z: z, ph: rnd(0, 6) }; for (var k in o) p[k] = o[k]; props.push(p); }
    function side() { return Math.random() < 0.5 ? -1 : 1; }
    K.isles.props = function (z) {
        var g = growAt(z), s = rnd(1.6, 3.6);
        if (Math.random() < 0.6) prop('islet', z + rnd(0, 4), { lx: side() * (3.2 + s + rnd(0, 9)), y: rnd(-4.5, 3.5), s: s, v: (Math.random() * 3) | 0, fall: Math.random() < 0.75 });
        if (Math.random() < 0.85) prop('cloud', z + rnd(0, 4), { lx: side() * rnd(3, 24), y: rnd(-15, -8), s: rnd(6, 13), v: Math.random() < 0.5 ? 0 : 1 });
        if (!bridgeAt(z + 2) && !fallsAt(z + 2)) {
            if (Math.random() < 0.3 * g) prop('tree', z + rnd(0, 4), { lx: side() * rnd(1.45, 1.65), s: rnd(0.9, 1.3) });
            if (Math.random() < 0.55) prop('flowers', z + rnd(0, 4), { lx: side() * rnd(0.75, 1.6) });
            if (at(z, 12) && g > 0.5) prop('post', z + 1, { lx: (at(z, 24) ? -1 : 1) * 1.62, v: 0, h: 1.9 });
        }
        if (Math.random() < 0.05) prop('birds', z + 30, { lx: rnd(-10, 10), y: rnd(5, 9) });
    };
    K.glow.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.9) { var hgt = rnd(3, 7.5) * (0.3 + 0.7 * g); prop('shroom', z + rnd(0, 4), { lx: side() * (1.9 + hgt * 0.32 + rnd(0, 3)), h: hgt, v: (Math.random() * 3) | 0 }); }
        if (Math.random() < 0.65) prop('sprouts', z + rnd(0, 4), { lx: side() * rnd(1.5, 2.4), s: rnd(0.8, 1.3) });
    };
    K.geode.props = function (z) {
        var g = growAt(z), sc = 1 + (1 - g) * 3.2;
        if (Math.random() < 0.6) prop('crystals', z + rnd(0, 4), { lx: side() * rnd(1.75, 2.25) * sc, s: rnd(0.8, 1.5) * (0.6 + 0.4 * g), v: (Math.random() * 3) | 0 });
        if (Math.random() < 0.4 * g) prop('stal', z + rnd(0, 4), { lx: side() * rnd(1.0, 1.9), y: 3.4, s: rnd(0.6, 1.0), v: Math.random() < 0.5 ? 0 : 1 });
    };
    K.aurora.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.6) prop('spire', z + rnd(0, 4), { lx: side() * rnd(3.4, 10), s: rnd(1.2, 3.4) * (0.4 + 0.6 * g) });
        if (Math.random() < 0.5) prop('pine', z + rnd(0, 4), { lx: side() * rnd(4.5, 14), s: rnd(1.6, 3) });
        if (at(z, 8) && g > 0.3) prop('post', z + 4, { lx: (at(z, 16) ? -1 : 1) * 2.66, v: 4, h: 1.1, y: 0.66 });
    };
    K.clock.props = function (z) {
        var g = growAt(z), sc = 1 + (1 - g) * 3.2;
        if (Math.random() < 0.75) { var s = rnd(1.4, 3.4); prop('gear', z + rnd(0, 4), { lx: side() * Math.min(4.0 * sc - s * 0.4, 1.9 + s * 0.5 + rnd(0, 1.5)), y: rnd(-3, 6), s: s, v: Math.random() < 0.5 ? 0 : 1, w: rnd(0.25, 0.8) * side() }); }
        if (Math.random() < 0.08 * g) prop('pendulum', z + rnd(0, 4), { lx: side() * rnd(2.5, 3.2) });
        if (at(z, 12) && g > 0.4) prop('post', z + 2, { lx: (at(z, 24) ? -1 : 1) * 1.66, v: 1, h: 1.9 });
    };
    K.stars.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.6) prop('rock', z + rnd(0, 4), { lx: side() * rnd(3, 15), y: rnd(-6, 6), s: rnd(0.6, 2.6), v: Math.random() < 0.5 ? 0 : 1, w: rnd(-0.6, 0.6) });
        if (Math.random() < 0.05) prop('planet', z + rnd(0, 4), { lx: side() * rnd(16, 28), y: rnd(-6, 8), s: rnd(5, 10), v: Math.random() < 0.5 ? 0 : 1 });
        if (at(z, 8) && g > 0.3) prop('post', z + 1, { lx: (at(z, 16) ? -1 : 1) * 1.72, v: at(z, 16) ? 2 : 3, h: 1.9 });
    };
    var PROP = {
        islet: function (p, a) {
            var x = cx(p.z) + p.lx, s = p.s;
            if (p.fall && P(x + s * 0.45 * (p.lx > 0 ? -1 : 1), p.y - 0.15, p.z)) {  /* a waterfall pouring into the clouds */
                var tx = px, ty = py, k = pk;
                P(x + s * 0.45 * (p.lx > 0 ? -1 : 1), p.y - 14, p.z);
                var wd = Math.max(1.5, 0.22 * s * k), gr = ctx.createLinearGradient(0, ty, 0, py);
                gr.addColorStop(0, 'rgba(255,255,255,' + (0.85 * a).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,240,245,0)');
                ctx.fillStyle = gr; ctx.fillRect(tx - wd / 2, ty, wd, py - ty);
                if (!RM) {
                    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * a).toFixed(2) + ')';
                    for (var i = 0; i < 3; i++) { var u = ((clock * 0.6 + i / 3 + p.ph) % 1); ctx.fillRect(tx - wd * 0.3, ty + (py - ty) * u * 0.6, wd * 0.6, Math.max(2, 0.4 * k)); }
                }
            }
            drawSpr(SPR.islet(p.v), x, p.y, p.z, 2 * s, a, 52 / 270);
        },
        cloud: function (p, a) { drawSpr(SPR.cloud(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a * 0.9, 0.6); },
        tree: function (p, a) { drawSpr(SPR.tree(), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        flowers: function (p, a) {
            if (!PL(p.lx, 0.05, p.z)) return;
            var k = pk, cols = ['#ff9fb8', '#ffd36b', '#ffffff', '#c7a4ff'];
            ctx.globalAlpha = a;
            for (var i = 0; i < 5; i++) { ctx.fillStyle = cols[(i + Math.floor(p.ph)) % 4]; ctx.beginPath(); ctx.arc(px + (i - 2) * 0.1 * k, py - (i % 2) * 0.06 * k, Math.max(0.8, 0.045 * k), 0, TAU); ctx.fill(); }
        },
        post: function (p, a) {
            var s = SPR.post(p.v);
            drawSpr(s, cx(p.z) + p.lx, p.y || 0, p.z, p.h * s.w / s.h, a);
            if (P(cx(p.z) + p.lx, (p.y || 0) + p.h * 0.84, p.z)) halo(px, py, 0.9 * pk, [[255, 200, 120], [255, 190, 100], [255, 120, 220], [120, 230, 255], [170, 240, 255]][p.v], a * 0.35);
        },
        birds: function (p, a) {
            if (!PL(p.lx, p.y, p.z)) return;
            var k = pk; ctx.strokeStyle = 'rgba(90,60,100,' + (0.7 * a).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, 0.05 * k); ctx.beginPath();
            for (var i = 0; i < 4; i++) {
                var bx = px + (i - 1.5) * 0.7 * k + Math.sin(i * 2.1) * 0.3 * k, by = py + Math.abs(i - 1.5) * 0.35 * k, fl = Math.sin(clock * 7 + i) * 0.12 * k;
                ctx.moveTo(bx - 0.25 * k, by - fl); ctx.quadraticCurveTo(bx - 0.1 * k, by - 0.08 * k, bx, by); ctx.quadraticCurveTo(bx + 0.1 * k, by - 0.08 * k, bx + 0.25 * k, by - fl);
            }
            ctx.stroke();
        },
        shroom: function (p, a) { drawSpr(SPR.shroom(p.v), cx(p.z) + p.lx, 0, p.z, p.h * 230 / 300 * 1.25, a * (0.85 + 0.15 * Math.sin(clock * 1.3 + p.ph))); },
        sprouts: function (p, a) { drawSpr(SPR.sprouts(), cx(p.z) + p.lx, 0, p.z, p.s, a * (0.8 + 0.2 * Math.sin(clock * 2 + p.ph))); },
        crystals: function (p, a) { drawSpr(SPR.crystals(p.v), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        stal: function (p, a) { drawSpr(SPR.stalactite(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0); },
        spire: function (p, a) { drawSpr(SPR.crystals(3), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        pine: function (p, a) { drawSpr(SPR.pine(), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        gear: function (p, a) { drawSpr(SPR.gear(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0.5, RM ? 0 : clock * p.w + p.ph); },
        pendulum: function (p, a) {
            var sw = Math.sin(clock * 1.4 + p.ph) * 0.5, x = cx(p.z) + p.lx;
            if (!P(x, 9, p.z)) return;
            var ax = px, ay = py; P(x + Math.sin(sw) * 6, 9 - Math.cos(sw) * 6, p.z);
            ctx.globalAlpha = a; ctx.strokeStyle = '#b8873e'; ctx.lineWidth = Math.max(1, 0.06 * pk);
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
            var gr = ctx.createRadialGradient(px - 0.15 * pk, py - 0.15 * pk, 0, px, py, 0.5 * pk);
            gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(1, '#8a5a24');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, 0.5 * pk, 0, TAU); ctx.fill();
        },
        rock: function (p, a) { drawSpr(SPR.rock(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0.5, RM ? 0 : clock * p.w + p.ph); },
        planet: function (p, a) { drawSpr(SPR.planet(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0.5); },
        knit: function (p, a) { drawSpr(SPR.knit(p.v), cx(p.z) + p.lx, -0.3, p.z, p.s, a); },
        ytree: function (p, a) { drawSpr(SPR.ytree(p.v), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        button: function (p, a) { drawSpr(SPR.button(p.v), cx(p.z) + p.lx, p.s * 0.4, p.z, p.s, a, 0.5, RM ? 0 : Math.sin(clock * 0.5 + p.ph) * 0.3); },
        pompom: function (p, a) { drawSpr(SPR.pompom(), cx(p.z) + p.lx, 0, p.z, p.s, a); }
    };

