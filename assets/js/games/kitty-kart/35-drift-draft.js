    /* ---------- drifting and the slipstream ----------
       Drift: holding Brake while steering hard at speed starts a drift that way (c.drift, -1 or 1). c.brk is "Brake is
       held", set with the other inputs: the keys and touch buttons, player 2's keys on split screen, the friend's keys
       in Duo (they send it along); the computer cats never set it (obey), so they do not drift. In a drift Brake does
       not brake: the kart holds DRIFT.vmax of its top speed with Gas held too, or slowly loses speed (DRIFT.scrub)
       without it. Steering into the drift turns from DRIFT.weak to DRIFT.turn of the usual rate, plus DRIFT.yaw that
       turns only the kart and not where it goes, so it slides (grip cut to DRIFT.grip), a few degrees on most tracks,
       more on the slippery ones. Sparks fly from the rear wheels, blue, then orange, then pink as the drift is held
       (c.dlv, after DRIFT.lv seconds). Letting go of Brake or steering straight ends it with a mini-turbo: c.boost for
       DRIFT.boost seconds by level. Too slow (DRIFT.off), a jump, a spin or a fall ends it with none;
       on the grass it goes on without charging. Brake pressed at speed waits DRIFT.grace seconds before it brakes (the
       kart coasts), so a drift still starts when the steering comes a moment after Brake (c.bT: how long Brake is
       held, c.bV: the speed when it was pressed).
       Slipstream: right behind another fast kart (DRAFT.near to DRAFT.far behind it, inside a narrow cone, both above
       DRAFT.min of the top speed and heading the same way) c.draft builds to 1 over a second and fades twice as fast,
       for up to DRAFT.v more top speed and DRAFT.a more acceleration, shown by faint wind lines. Every kart gets it.
       Both go to the friend's device in the snapshot flags (pack, view in the Duo part); drawSlide draws them. */
    var DRIFT = { on: 0.5, off: 0.32, steer: 0.5, keep: 0.15, weak: 0.5, turn: 0.92, yaw: 0.22, grip: 0.4, vmax: 0.9, acc: 0.6,
        scrub: 70, grace: 0.15, lv: [0.6, 1.3, 2.1], boost: [0, 0.3, 0.55, 0.85] };
    var DRAFT = { near: 26, far: 140, w: 12, cone: 0.15, min: 0.55, v: 0.04, a: 0.15 };
    var SPARK = ['rgba(255,255,255,.85)', '#60a5fa', '#fb923c', '#e879f9'];  /* by drift level: white, blue, orange, pink */
    function driftStep(c, dt, vf, ok) {  /* in step, before the throttle: start, hold or end a drift (ok: wheels down, no spin);
                                            true while Brake waits for the steering (step coasts then) */
        if (!c.brk) c.bT = 0;
        else { if (!(c.bT > 0)) c.bV = vf; c.bT = (c.bT || 0) + dt; }
        var fast = vf > VMAX * DRIFT.on || (c.bT < 0.4 && c.bV > VMAX * DRIFT.on && vf > VMAX * DRIFT.off);
        if (c.drift) {
            if (ok && c.brk && c.steer * c.drift > DRIFT.keep && vf > VMAX * DRIFT.off) {
                if (c.on) c.dT += dt;  /* on the grass the drift goes on, but charges nothing */
                var lv = c.dT > DRIFT.lv[2] ? 3 : c.dT > DRIFT.lv[1] ? 2 : c.dT > DRIFT.lv[0] ? 1 : 0;
                if (lv > c.dlv) { c.dlv = lv; sfx(c, 'tap'); }
                return false;
            }
            var b = ok && vf > VMAX * DRIFT.off ? DRIFT.boost[c.dlv] : 0;  /* let go: the mini-turbo */
            if (b > 0) { c.boost = Math.max(c.boost, b); sfx(c, 'point'); stat('turbo' + c.dlv); }
            c.drift = c.dlv = c.dT = 0;
        } else if (ok && c.on && c.brk && Math.abs(c.steer) > DRIFT.steer && fast) {
            c.drift = c.steer > 0 ? 1 : -1; c.dT = c.dlv = 0;
        }
        return !c.drift && ok && c.brk && c.bT < DRIFT.grace && c.bV > VMAX * DRIFT.on;
    }
    function driftSteer(c) {  /* in a drift: how hard the kart turns, from the steering (into the drift turns tighter) */
        return c.drift * (DRIFT.weak + (DRIFT.turn - DRIFT.weak) * clamp(c.steer * c.drift, 0, 1));
    }
    function draftStep(c, dt, vf) {  /* the slipstream: is c right behind another fast kart? */
        var t = false, i;
        if (vf > VMAX * DRAFT.min && c.on && !(c.z > 0)) for (i = 0; i < karts.length && !t; i++) {
            var o = karts[i];
            if (o === c || o.fall > 0 || o.z > 0 || o.vf < VMAX * DRAFT.min || Math.cos(c.a - o.a) < 0.85) continue;
            var oc = Math.cos(o.a), os = Math.sin(o.a), dx = c.x - o.x, dy = c.y - o.y, u = -(dx * oc + dy * os);  /* u: how far behind o */
            t = u > DRAFT.near && u < DRAFT.far && Math.abs(dy * oc - dx * os) < DRAFT.w + u * DRAFT.cone;
        }
        c.draft = t ? Math.min(1, (c.draft || 0) + dt) : Math.max(0, (c.draft || 0) - dt * 2);
    }
    function drawSlide(c) {  /* in drawKart, turned with the kart (nose at +x): drift sparks at the rear wheels, slipstream wind */
        var i, s, a, l;
        if (c.fall > 0) return;
        ctx.save(); ctx.lineCap = 'round';
        if (c.drift) {
            var lv = c.dlv || 0, col = SPARK[lv], k, pts = [];
            for (s = -1; s <= 1; s += 2) {
                if (lv) { ctx.globalAlpha = 0.3 + Math.random() * 0.15; circle(ctx, -16, s * 11, 5 + lv * 1.6, col); }
                for (i = 0; i < 2 + lv; i++) {  /* short sparks thrown back and out from the rear wheels */
                    a = Math.PI - s * 0.4 + (Math.random() - 0.5) * 1.2; l = 6 + Math.random() * (5 + lv * 3);
                    pts.push(-15, s * 12, -15 + Math.cos(a) * l, s * 12 + Math.sin(a) * l);
                }
            }
            ctx.globalAlpha = 1;
            for (k = 0; k < 2; k++) {  /* a thin dark edge under the colour, so they show on pale roads too */
                ctx.strokeStyle = k ? col : 'rgba(15,23,42,.3)'; ctx.lineWidth = (lv ? 2 : 1.4) + (k ? 0 : 1.6);
                ctx.beginPath();
                for (i = 0; i < pts.length; i += 4) { ctx.moveTo(pts[i], pts[i + 1]); ctx.lineTo(pts[i + 2], pts[i + 3]); }
                ctx.stroke();
            }
        }
        if (c.draft > 0.05) {  /* the slipstream: four faint streaks running back along the sides */
            for (i = 0; i < 4; i++) {
                var f = (clock * 2.4 + i * 0.29 + c.phase) % 1, y = (i % 2 ? 1 : -1) * (i < 2 ? 16 : 21), x = 24 - f * 50;
                ctx.globalAlpha = 0.5 * c.draft * Math.sin(f * Math.PI);
                ctx.strokeStyle = 'rgba(15,23,42,.25)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y + 0.6); ctx.lineTo(x - 12, y + 0.6); ctx.stroke();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y); ctx.stroke();
            }
        }
        ctx.restore();
    }
