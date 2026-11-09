    /* ---------- Zero Knowledge, part 30: Two Yarn Balls (Two Tennis Balls with a dog). Hoot is colour blind and holds
       two balls he thinks are the same. Behind his back he swaps them or not; you say which. Telling it every time
       proves the balls differ, while he never learns which colour is which. Hard uses close shades shown briefly.
       Then a twist: two balls that really are the same, and you have to guess. ---------- */
    function hsl(h, s, l) { return 'hsl(' + Math.round(mod(h, 360)) + ',' + s + '%,' + l + '%)'; }
    LOGIC.ballPair = function (rnd, lv) {
        var h = rnd() * 360, d = lv === 'easy' ? 150 : lv === 'hard' ? 22 : 55, sd = rnd() < 0.5 ? 1 : -1;
        var l2 = lv === 'easy' ? 42 : lv === 'hard' ? 54 : 50;
        return [hsl(h, 72, 55), hsl(h + sd * d, 72, l2)];
    };

    level({
        id: 'balls', name: 'Two Yarn Balls', dogName: 'Two Tennis Balls', tag: 'Proving two things differ', role: 'honest',
        intro: function (K) {
            var b = K.dog ? 'tennis balls' : 'balls of yarn';
            return 'Hoot is colour blind. He holds two ' + b + ' and is sure they are the same. You can see they are not.\n' +
                'To prove it, Hoot hides them behind his back, swaps them or not, and shows them again. You say "swapped" or "not swapped". ' +
                'If they really were the same, you could only guess. Watch closely: ' + (K.hard ? 'on Hard the shades are close and you only get a glimpse.' : 'you only get a short look.');
        },
        build: function (K) {
            var ROUNDS = K.easy ? 4 : K.hard ? 8 : 6, BLUFF = 2, SHOW = K.easy ? 1.6 : K.hard ? 0.75 : 1.1;
            var round = 0, phase = 'honest', passes = 0, swapped = false, pair = null, st = 'idle', stT = 0, timer = null;
            var held = [0, 1];   /* which colour of the pair is in the left and right wing */
            function odds() { K.odds('A cheater gets this far: ' + (passes ? oneIn(Math.pow(2, passes)) : 'always'), Math.pow(0.5, passes)); }
            K.draw = function (g, W, H, t) {
                if (!stT) stT = t;
                var since = t - stT;
                /* the state machine of one round: 'look' (balls out), 'hide' (behind the back), 'show' (out again), 'wait' */
                if (st === 'look' && since > SHOW) { st = 'hide'; stT = t; K.sfx('move'); }
                else if (st === 'hide' && since > 1.1) { st = 'show'; stT = t; if (swapped) held = [held[1], held[0]]; onShown(); }
                var os = clamp(Math.min(H * 0.62, W * 0.34), 90, 230), ox = W * 0.56, oy = H * 0.9;
                /* floor and wall */
                g.fillStyle = K.dog ? '#efe2cc' : '#e8e2f0'; g.fillRect(0, 0, W, H);
                g.fillStyle = K.dog ? '#d9c4a3' : '#cfc6dd'; g.fillRect(0, oy - 6, W, H - oy + 6);
                var wings = st === 'hide' ? Math.min(1, since * 3) : st === 'show' ? Math.max(0, 1 - since * 4) : 0;
                drawOwl(g, ox, oy, os, { wings: wings, blind: true, look: st === 'wait' ? (Math.sin(t * 1.3) > 0 ? 0.6 : -0.6) : 0,
                    shout: st === 'hide' ? (since < 0.55 ? 'Swish...' : 'Swish!') : st === 'wait' ? 'Well? Swapped or not?' : st === 'look' ? 'Look!' : '' });
                var br = os * 0.13;
                if (pair && wings < 0.4) {
                    [-1, 1].forEach(function (sd, i) {
                        var bx = ox + sd * os * 0.42, by = oy - os * 0.5;
                        drawBall(g, bx, by, br, pair[held[i]], K.dog, t * 0.3);
                    });
                }
                /* the pet watching from the left */
                var ps = clamp(os * 0.62, 60, 150);
                drawPet(g, K.C, Math.max(ps * 0.55, ox - os * 1.15), oy, ps, { t: t, look: 1, mood: st === 'look' ? 'wow' : null });
                /* what Hoot sees: the same two grey balls */
                var bw = clamp(W * 0.22, 96, 150), bh = bw * 0.55, bx0 = W - bw - 10, by0 = 10;
                rr(g, bx0, by0, bw, bh, 8); fillStroke(g, '#fff', INK, 2);
                label(g, 'What Hoot sees', bx0 + bw / 2, by0 + bh * 0.2, clamp(bw * 0.1, 10, 13), '#6f6888', 'center', 800);
                if (pair && wings < 0.4) [0.3, 0.7].forEach(function (f) { drawBall(g, bx0 + bw * f, by0 + bh * 0.62, bh * 0.22, '#9a9a9a', K.dog, 0); });
                else label(g, '?', bx0 + bw / 2, by0 + bh * 0.62, bh * 0.35, '#9a9a9a');
            };
            function start() {
                if (phase === 'honest') pair = LOGIC.ballPair(K.rnd, K.lv);
                else { var c = LOGIC.ballPair(K.rnd, K.lv)[0]; pair = [c, c]; }
                held = K.rnd() < 0.5 ? [0, 1] : [1, 0];
                swapped = K.rnd() < 0.5;
                st = 'look'; stT = 0;
                K.ctrl();
                K.msg(phase === 'honest' ? 'Round ' + (round + 1) + ' of ' + ROUNDS + '. <b>Remember</b> which colour is on which side!' :
                    'Hoot found two balls that really <b>are</b> the same colour. Watch anyway...');
            }
            function onShown() {
                st = 'wait';
                K.msg(phase === 'honest' ? 'Did Hoot swap them?' : 'You cannot tell. Guess: did he swap them?');
                var c = K.ctrl();
                c.appendChild(K.btn('Swapped', null, function () { answer(true); }));
                c.appendChild(K.btn('Not swapped', null, function () { answer(false); }));
                timer = K.timer(K.hard ? 4 : 5, function () { answer(null); });
            }
            function answer(said) {
                if (st !== 'wait' || !timer) return;
                var left = timer.frac(); timer.stop(); timer = null;
                st = 'idle';
                K.ctrl();
                var right = said === swapped;
                if (phase === 'honest') {
                    if (right) {
                        passes++; odds();
                        K.sfx('point'); K.points(20 + Math.round(20 * left));
                        K.msg('Right, he ' + (swapped ? 'swapped them' : 'did not swap them') + '. Hoot is a little more convinced.');
                        K.later(next, 1000);
                    } else {
                        K.msg(said === null ? 'Too slow!' : 'Wrong: he ' + (swapped ? 'did' : 'did not') + ' swap them. To Hoot that looks like guessing.');
                        if (K.strike(said === null ? 'Too slow, that looks like guessing.' : 'Wrong, that looks like guessing.')) K.later(next, 1500);
                    }
                } else {
                    if (right) {
                        passes++; odds();
                        K.sfx('point'); K.points(5);
                        K.msg('A lucky guess! He ' + (swapped ? 'did' : 'did not') + ' swap them.');
                        K.later(next, 1100);
                    } else {
                        K.sfx('hit');
                        K.msg(said === null ? 'No answer, so Hoot knows you cannot tell.' : 'Wrong guess: he ' + (swapped ? 'did' : 'did not') + ' swap them. With the same colours you have only a coin flip.');
                        end();
                    }
                }
            }
            function next() {
                round++;
                if (phase === 'honest' && round >= ROUNDS) {
                    phase = 'bluff'; round = 0; passes = 0;
                    K.role('cheat'); odds();
                    K.msg('Hoot is convinced. Now the other side: what if the balls really were the same?');
                    var c = K.ctrl();
                    c.appendChild(K.btn('Show me', 'zk-go', start));
                    return;
                }
                if (phase === 'bluff' && round >= BLUFF) { K.msg('Two lucky guesses in a row: a 1 in 4 chance. A few more rounds and luck runs out.'); end(); return; }
                start();
            }
            function end() {
                var c = K.ctrl();
                c.appendChild(K.btn('Next gate', 'zk-go', function () {
                    K.done('This proof is about a fact ("the balls differ"), not a secret number. Hoot ends up sure of it, yet still cannot tell which ball is which colour.');
                }));
            }
            K.key(function (e) {
                if (st !== 'wait') return;
                var k = e.key.toLowerCase();
                if (k === 's' || e.key === 'ArrowLeft') { e.preventDefault(); answer(true); }
                else if (k === 'n' || e.key === 'ArrowRight') { e.preventDefault(); answer(false); }
            });
            odds();
            start();
        }
    });
