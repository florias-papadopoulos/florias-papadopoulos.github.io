    /* ---------- Zero Knowledge, part 20: the ring cave (a scene shared by Moon Cave, Fake Video and Night Watch) and
       the Moon Cave level. The cave is a ring of tunnel seen from above, one way in at the bottom, and a door at the
       top that only the magic word opens. Places on the ring are angles th (canvas angles: PI/2 the bottom fork,
       0 the right side, PI the left side, 3PI/2 the door); deep in the left tunnel is TH.L, deep in the right TH.R. ---------- */
    var TH = { fork: Math.PI / 2, L: Math.PI * 1.32, R: -Math.PI * 0.32, doorFromL: Math.PI * 1.68, doorFromR: -Math.PI * 0.68 };

    function makeCave(K) {
        var cv = {
            pet: { kind: 'out', f: 1, th: TH.fork, show: true },  /* where the pet is: on the 'line' (f 0 fork .. 1 outside) or the 'ring' */
            anim: null, door: 0, doorT: 0, hidden: false, jiggle: 0,
            owl: { closed: false, shout: '', look: 0, frown: false, s: 1 },
            mark: null,          /* a side to tint: { side: 'L' | 'R', good } */
            petWho: null,        /* another prover to draw instead of the player's pet: { fur, light, ... } */
            onDraw: null
        };
        /* a walk: a list of steps { line: [f0, f1] } or { ring: [th0, th1] } or { wait: s } or { door: 1 | 0 }, each taking ms */
        cv.walk = function (stepsList, done) {
            var t = 0;
            stepsList.forEach(function (s) { s.t0 = t; t += s.ms; });
            cv.anim = { steps: stepsList, t: 0, total: t, done: done };
        };
        cv.routeIn = function (side, fast) {
            var m = fast ? 0.6 : 1;
            return [{ line: [1, 0], ms: 450 * m }, { ring: [TH.fork, TH[side]], ms: 650 * m }];
        };
        /* from deep in `side`, out by the exit `exit` (through the door when it is the other side) */
        cv.routeOut = function (side, exit, fast) {
            var m = fast ? 0.6 : 1, st = [];
            if (exit !== side) {
                st.push({ ring: [TH[side], side === 'L' ? Math.PI * 1.48 : -Math.PI * 0.48], ms: 300 * m });
                st.push({ door: 1, ms: 380 * m });
                st.push({ ring: [side === 'L' ? Math.PI * 1.48 : -Math.PI * 0.48, side === 'L' ? TH.doorFromL : TH.doorFromR], ms: 300 * m });
                st.push({ door: 0, ms: 1 });
                st.push({ ring: [side === 'L' ? TH.doorFromL : TH.doorFromR, side === 'L' ? Math.PI * 2.5 : -Math.PI * 1.5], ms: 650 * m });
            } else st.push({ ring: [TH[side], side === 'L' ? Math.PI * 0.5 : Math.PI * 0.5], ms: 650 * m });
            st.push({ line: [0, 1], ms: 450 * m });
            return st;
        };
        /* a bluffer who has to come out on the other side: up to the locked door, a rattle, and back the same way */
        cv.routeStuck = function (side, fast) {
            var m = fast ? 0.6 : 1, near = side === 'L' ? Math.PI * 1.46 : -Math.PI * 0.46;
            return [{ ring: [TH[side], near], ms: 300 * m }, { jiggle: 1, ms: 650 * m }, { ring: [near, Math.PI * 0.5], ms: 800 * m }, { line: [0, 1], ms: 450 * m }];
        };
        function step(dt) {
            var a = cv.anim;
            if (!a) return;
            a.t += dt * 1000;
            var cur = null;
            for (var i = 0; i < a.steps.length; i++) { var s = a.steps[i]; if (a.t >= s.t0 && a.t < s.t0 + s.ms) { cur = s; break; } }
            if (!cur) { cur = a.steps[a.steps.length - 1]; }
            var p = clamp((a.t - cur.t0) / cur.ms, 0, 1);
            cv.jiggle = cur.jiggle ? Math.sin(p * Math.PI * 8) * (1 - p) : 0;
            if (cur.line) { cv.pet.kind = 'line'; cv.pet.f = cur.line[0] + (cur.line[1] - cur.line[0]) * p; }
            else if (cur.ring) { cv.pet.kind = 'ring'; cv.pet.th = cur.ring[0] + (cur.ring[1] - cur.ring[0]) * p; }
            if (cur.door === 1) cv.door = p; else cv.door = Math.max(0, cv.door - dt * 2.5);
            if (a.t >= a.total) {
                cv.anim = null; cv.jiggle = 0;
                if (a.steps[a.steps.length - 1].line && a.steps[a.steps.length - 1].line[1] === 1) cv.pet.kind = 'out';
                if (a.done) a.done();
            }
        }
        var last = 0;
        cv.draw = function (g, W, H, t) {
            var dt = last ? Math.min(0.05, t - last) : 0; last = t;
            step(dt);
            var S = Math.min(W * 0.9, H * 1.02, 560), cx = W / 2 + Math.min(W * 0.08, 40), top = (H - S) / 2;
            var cy = top + S * 0.42, R = S * 0.3, tw = S * 0.1, exitY = top + S * 0.98;
            /* rock */
            rr(g, cx - S * 0.44, top + S * 0.04, S * 0.88, S * 0.86, S * 0.12); fillStroke(g, '#6f667e', INK, 2.5);
            g.fillStyle = '#625a72';
            [[-0.3, 0.12, 0.05], [0.33, 0.2, 0.04], [-0.36, 0.72, 0.045], [0.3, 0.78, 0.05], [0.02, 0.43, 0.06]].forEach(function (r) { ell(g, cx + r[0] * S, top + r[1] * S, r[2] * S, r[2] * S * 0.7); g.fill(); });
            /* tunnels */
            g.lineCap = 'butt';
            g.strokeStyle = INK; g.lineWidth = tw + 5;
            g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
            g.beginPath(); g.moveTo(cx, cy + R); g.lineTo(cx, exitY); g.stroke();
            var sand = cv.hidden ? '#3d3650' : '#e4d6b6';
            g.strokeStyle = sand; g.lineWidth = tw;
            g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
            g.beginPath(); g.moveTo(cx, cy + R - tw / 2); g.lineTo(cx, exitY + 3); g.stroke();
            if (cv.mark) {
                g.strokeStyle = cv.mark.good ? 'rgba(47,138,58,.35)' : 'rgba(214,51,108,.35)'; g.lineWidth = tw;
                g.beginPath();
                if (cv.mark.side === 'L') g.arc(cx, cy, R, Math.PI * 0.55, Math.PI * 1.45); else g.arc(cx, cy, R, -Math.PI * 0.45, Math.PI * 0.45);
                g.stroke();
            }
            /* the door at the top */
            var dw = tw * 1.15, dh = tw * 0.36, dy = cy - R;
            g.save(); g.translate(cx + cv.jiggle * 3, dy);
            if (cv.door > 0) {
                g.globalAlpha = 1 - cv.door * 0.85;
            }
            rr(g, -dh / 2, -dw / 2, dh, dw, 2); fillStroke(g, '#a86a2c', INK, 2);
            g.globalAlpha = 1;
            if (cv.door < 0.2) {   /* the lock */
                rr(g, -dh * 0.35, -dh * 0.25, dh * 0.7, dh * 0.6, 1.5); fillStroke(g, '#f2c94c', INK, 1.4);
            }
            g.restore();
            if (cv.door > 0.2) { g.globalAlpha = cv.door; label(g, '✦', cx, dy - tw * 0.9, tw * 0.7, '#f2c94c'); g.globalAlpha = 1; }
            label(g, 'door', cx, dy + tw * 0.95, Math.max(11, tw * 0.33), '#efe8f8', 'center', 700);
            label(g, 'LEFT', cx - R + tw * 1.3, cy, Math.max(11, tw * 0.3), '#efe8f8', 'center', 800);
            label(g, 'RIGHT', cx + R - tw * 1.4, cy, Math.max(11, tw * 0.3), '#efe8f8', 'center', 800);
            /* a moon */
            g.fillStyle = '#f6e7a6'; ell(g, cx + S * 0.36, top + S * 0.13, S * 0.045, S * 0.045); g.fill();
            g.fillStyle = '#6f667e'; ell(g, cx + S * 0.38, top + S * 0.12, S * 0.04, S * 0.04); g.fill();
            if (cv.onDraw) cv.onDraw(g, { cx: cx, cy: cy, R: R, tw: tw, S: S, top: top, exitY: exitY });
            /* the pet (or another prover) */
            var ps = tw * 1.45, px, py, outY = exitY - ps * 0.45;
            if (cv.pet.show && !(cv.hidden && cv.pet.kind === 'ring')) {
                if (cv.pet.kind === 'ring') { px = cx + Math.cos(cv.pet.th) * R; py = cy + Math.sin(cv.pet.th) * R; }
                else if (cv.pet.kind === 'line') { px = cx; py = cy + R + (outY - cy - R) * cv.pet.f; }
                else { px = cx; py = outY; }
                var who = cv.petWho || K.C;
                drawPet(g, who, px + cv.jiggle * 2, py + ps * 0.42, ps, { t: t, mood: cv.petMood || null });
                if (cv.petName) label(g, cv.petName, px, py + ps * 0.62, Math.max(11, ps * 0.22), '#fff', 'center', 800);
            }
            if (cv.hidden) label(g, '?', cx, cy, R * 0.55, 'rgba(255,255,255,.5)');
            /* Hoot at the entrance */
            var os = clamp(S * 0.32, 70, 170);
            drawOwl(g, cx - S * 0.3, Math.min(H - 4, top + S * 1.0), os, { closed: cv.owl.closed, shout: cv.owl.shout, look: cv.owl.look, frown: cv.owl.frown });
        };
        return cv;
    }

    /* ================= Moon Cave ================= */
    level({
        id: 'cave', name: 'Moon Cave', tag: 'The ring cave', role: 'honest',
        intro: function (K) {
            return 'Behind the cave is the gate. The cave is a ring with a locked door at the far end, and only the magic word opens it. ' +
                'Hoot waits outside with his eyes shut while you go in by the left or the right tunnel. Then he shouts a side, and you must come out there.\n' +
                'Knowing the word, you always can: the door lets you through. Without the word, you only make it when he happens to shout the side you took. ' +
                'First you prove it honestly, then you forget the word and try your luck.';
        },
        build: function (K) {
            var cave = makeCave(K), HON = K.hard ? 3 : 2, BLUFF = K.easy ? 3 : K.hard ? 5 : 4;
            var phase = 'honest', round = 0, entry = null, shout = null, busy = false, passes = 0, timer = null;
            K.draw = cave.draw;
            function odds() {
                K.odds('A cheater gets this far: ' + (passes ? oneIn(Math.pow(2, passes)) : 'always'), Math.pow(0.5, passes));
            }
            function sideBtns() {
                var c = K.ctrl();
                c.appendChild(K.btn('← Go in left', null, function () { goIn('L'); }));
                c.appendChild(K.btn('Go in right →', null, function () { goIn('R'); }));
            }
            function ask() {
                busy = false; entry = null;
                cave.owl = { closed: false, shout: '', look: 0, frown: false };
                cave.mark = null;
                if (phase === 'honest') K.msg('Round ' + (round + 1) + ' of ' + HON + '. You know the magic word. Hoot shuts his eyes: <b>pick a tunnel</b> to go in by.');
                else K.msg('You forgot the magic word! Round ' + (round + 1) + ' of ' + BLUFF + '. Pick a tunnel and hope Hoot shouts that side.');
                sideBtns();
            }
            function goIn(side) {
                if (busy) return;
                busy = true; entry = side;
                K.ctrl(); K.sfx('move');
                cave.owl.closed = true;
                K.msg('You walk in by the ' + (side === 'L' ? 'left' : 'right') + ' tunnel...');
                cave.walk(cave.routeIn(side), function () {
                    shout = K.rnd() < 0.5 ? 'L' : 'R';
                    cave.owl = { closed: false, shout: 'Come out ' + (shout === 'L' ? 'LEFT' : 'RIGHT') + '!', look: shout === 'L' ? -1 : 1, frown: true };
                    K.sfx('pop');
                    if (phase === 'honest') {
                        K.msg('Hoot shouts <b>' + (shout === 'L' ? 'LEFT' : 'RIGHT') + '</b>. You are in the ' + (entry === 'L' ? 'left' : 'right') + ' tunnel. How do you come out?');
                        var c = K.ctrl();
                        c.appendChild(K.btn('Walk back out', null, function () { answer(false); }));
                        c.appendChild(K.btn('Say the word, through the door', null, function () { answer(true); }));
                        timer = K.timer(K.hard ? 6 : 8, function () { answer(null); });
                    } else bluffOut();
                });
            }
            function answer(viaDoor) {
                if (!timer) return;
                var left = timer.frac(); timer.stop(); timer = null;
                K.ctrl();
                if (viaDoor === null) {
                    K.msg('Too slow! Hoot waited and waited.');
                    cave.owl.shout = 'Well?';
                    if (K.strike('Too slow, Hoot got suspicious.')) K.later(next, 1400);
                    return;
                }
                var exit = viaDoor ? (entry === 'L' ? 'R' : 'L') : entry, ok = exit === shout;
                cave.owl.shout = '';
                cave.walk(cave.routeOut(entry, exit), function () {
                    if (ok) {
                        passes++; odds();
                        cave.mark = { side: exit, good: true };
                        cave.owl.shout = 'Hm. Correct.';
                        K.sfx('point'); K.points(20 + Math.round(20 * left));
                        K.msg('You came out on the ' + (exit === 'L' ? 'left' : 'right') + ', as asked.' + (viaDoor ? ' Hoot never heard the word: the door is far inside.' : ''));
                        K.later(next, 1300);
                    } else {
                        cave.mark = { side: exit, good: false };
                        cave.owl = { shout: 'Wrong side!', frown: true };
                        K.msg('You came out on the wrong side. Hoot only sees which side you come out of.');
                        if (K.strike('Wrong side! Even an honest prover has to come out where asked.')) K.later(next, 1600);
                    }
                });
            }
            function bluffOut() {
                var ok = LOGIC.cavePasses(entry, shout, false);
                K.msg(ok ? 'Hoot shouted your side! Just walk back out.' : 'He shouted the other side, and the door will not open for you...');
                cave.owl.shout = '';
                cave.walk(ok ? cave.routeOut(entry, entry) : cave.routeStuck(entry), function () {
                    cave.mark = { side: entry, good: ok };
                    if (ok) {
                        passes++; odds();
                        cave.owl.shout = 'Hm. Correct.';
                        K.sfx('point'); K.points(5);
                        K.msg('Lucky! You passed round ' + (round + 1) + ' without the word.');
                        K.later(next, 1200);
                    } else {
                        cave.owl = { shout: 'Caught you!', frown: true };
                        K.sfx('hit'); K.mood('sad');
                        K.msg('Caught after ' + passes + ' lucky round' + (passes === 1 ? '' : 's') + '. That is how it goes: each round halves a cheater’s luck.');
                        finish(false);
                    }
                });
            }
            function next() {
                round++;
                if (phase === 'honest' && round >= HON) {
                    phase = 'bluff'; round = 0; passes = 0;
                    K.role('cheat'); odds();
                    K.msg('Now the twist: you <b>forgot the magic word</b>. Let’s see how far luck takes you.');
                    var c = K.ctrl();
                    c.appendChild(K.btn('Try anyway', 'zk-go', function () { ask(); }));
                    return;
                }
                if (phase === 'bluff' && round >= BLUFF) {
                    K.points(20, 'luck');
                    K.msg('You passed all ' + BLUFF + ' rounds without the word: a ' + oneIn(Math.pow(2, BLUFF)) + ' chance! With 20 rounds it would be 1 in a million.');
                    finish(true);
                    return;
                }
                ask();
            }
            function finish() {
                var c = K.ctrl();
                c.appendChild(K.btn('On to the gate', 'zk-go', function () {
                    K.done('An honest prover always passes (completeness). A cheater passes each round only half the time, so after k rounds ' +
                        'the chance is 1 in 2^k (soundness). And Hoot only ever saw you come out where he asked: he learned nothing about the word.');
                }));
            }
            K.key(function (e) {
                if (e.key === 'ArrowLeft' && !busy && !timer) { e.preventDefault(); goIn('L'); }
                else if (e.key === 'ArrowRight' && !busy && !timer) { e.preventDefault(); goIn('R'); }
            });
            odds();
            ask();
        }
    });
