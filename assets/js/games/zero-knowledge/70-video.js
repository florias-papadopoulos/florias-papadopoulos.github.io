    /* ---------- Zero Knowledge, part 70: Fake Video, the simulator. Without the magic word but with a camera that can
       rewind, you film a perfect video of the cave proof: every take where Hoot shouts the other side is cut. Then the
       premiere: your fake next to a real video, and nobody can tell which is which (unless you always went in by the
       same side or always switched: then the fake gives itself away, since a good simulator guesses at random too). That is what "zero knowledge"
       means: whatever Hoot sees, he could have faked himself. On Normal and Hard, a second part fakes Schnorr rounds by
       choosing the challenge first and computing the bell backwards. ---------- */
    level({
        id: 'video', name: 'Fake Video', tag: 'The simulator', role: 'film',
        intro: function (K) {
            return 'Hoot’s friends want a video of you passing the cave test. You do not know the magic word, but you have a camera with a rewind button.\n' +
                'Go in by any side. If Hoot shouts that side, walk out: a good clip. If not, rewind and cut that take, as if it never happened. ' +
                'Then compare your video with a real one: make yours look real. If a fake made without the secret looks just like the real thing, the real thing cannot be leaking the secret.';
        },
        build: function (K) {
            var NEED = K.easy ? 4 : K.hard ? 8 : 6, cave = makeCave(K), clips = [], takes = 0, cuts = 0, entry = null, busy = false, rewind = 0;
            var Sc = K.easy ? null : LOGIC.genSchnorr(K.rnd, K.lv), fakes = 0, FAKES = 2;
            var drawCave = function (g, W, H, t) {
                cave.draw(g, W, H, t);
                /* the film strip */
                var fw = clamp(W / (NEED + 3), 22, 34), fh = fw * 0.8, x0 = 8, y0 = 8;
                rr(g, x0 - 4, y0 - 4, NEED * (fw + 3) + 5, fh + 22, 6); fillStroke(g, 'rgba(35,31,58,.85)', null);
                for (var i = 0; i < NEED; i++) {
                    var x = x0 + i * (fw + 3);
                    rr(g, x, y0, fw, fh, 3); fillStroke(g, clips[i] ? '#fff1c7' : '#4a4466', null);
                    if (clips[i]) label(g, clips[i], x + fw / 2, y0 + fh / 2 + 1, fh * 0.55, INK);
                }
                label(g, clips.length + '/' + NEED + ' clips, ' + cuts + ' cut', x0, y0 + fh + 9, 11, '#fff', 'left', 700);
                if (rewind > 0) {
                    g.fillStyle = 'rgba(40,36,60,' + (0.35 * Math.min(1, rewind)) + ')'; g.fillRect(0, 0, W, H);
                    label(g, '\u25c0\u25c0 REWIND', W / 2, H * 0.45, clamp(W * 0.06, 20, 40), '#fff');
                    rewind = Math.max(0, rewind - 0.012);
                }
            };
            K.draw = drawCave;
            K.odds(null);
            function ask() {
                busy = false; entry = null;
                cave.owl = { closed: false, shout: '', look: 0 };
                cave.mark = null;
                K.msg('Clip ' + (clips.length + 1) + ' of ' + NEED + '. Camera rolling: <b>pick a tunnel</b>.');
                var c = K.ctrl();
                c.appendChild(K.btn('← Go in left', null, function () { goIn('L'); }));
                c.appendChild(K.btn('Go in right →', null, function () { goIn('R'); }));
            }
            function goIn(side) {
                if (busy) return;
                busy = true; entry = side; takes++;
                K.ctrl(); K.sfx('move');
                cave.owl.closed = true;
                K.msg('Take ' + takes + '...');
                cave.walk(cave.routeIn(side, true), function () {
                    var shout = K.rnd() < 0.5 ? 'L' : 'R';
                    cave.owl = { closed: false, shout: 'Come out ' + (shout === 'L' ? 'LEFT' : 'RIGHT') + '!', look: shout === 'L' ? -1 : 1, frown: true };
                    K.sfx('pop');
                    if (shout === side) {
                        K.msg('He shouted your side. Walk out: a perfect clip.');
                        K.later(function () {
                            cave.owl.shout = '';
                            cave.walk(cave.routeOut(side, side, true), function () {
                                clips.push(side); K.points(5); K.sfx('point');
                                cave.mark = { side: side, good: true };
                                if (clips.length >= NEED) K.later(premiere, 700); else K.later(ask, 500);
                            });
                        }, 500);
                    } else {
                        K.msg('The other side! Nobody needs to see this...');
                        var c = K.ctrl();
                        c.appendChild(K.btn('\u25c0\u25c0 Rewind and cut', 'zk-go', function () {
                            K.ctrl(); cuts++; rewind = 1; K.sfx('jump');
                            cave.owl = { closed: false, shout: '', look: 0 };
                            cave.walk([{ ring: [TH[side], TH.fork], ms: 350 }, { line: [0, 1], ms: 250 }], function () { K.later(ask, 300); });
                        }));
                    }
                });
            }
            /* two videos: yours (the clips you kept) and a real one (random shouts, all passed) */
            function premiere() {
                var real, i;
                do { real = []; for (i = 0; i < NEED; i++) real.push(K.rnd() < 0.5 ? 'L' : 'R'); } while (LOGIC.patterned(real));
                var odd = LOGIC.patterned(clips);
                var mineFirst = K.rnd() < 0.5, vids = mineFirst ? [clips, real] : [real, clips];
                K.draw = function (g, W, H) {
                    g.fillStyle = '#2a2640'; g.fillRect(0, 0, W, H);
                    label(g, 'The premiere', W / 2, 22, clamp(W * 0.04, 15, 22), '#fff1c7');
                    var fw = clamp((W - 60) / (NEED + 1), 26, 64), fh = fw * 0.9;
                    vids.forEach(function (v, k) {
                        var y = H * (k ? 0.64 : 0.3) - fh / 2, x0 = (W - NEED * (fw + 6)) / 2;
                        label(g, 'Video ' + (k + 1), W / 2, y - 14, 14, '#fff', 'center', 800);
                        v.forEach(function (s, j) {
                            var x = x0 + j * (fw + 6);
                            rr(g, x, y, fw, fh, 4); fillStroke(g, '#fff1c7', '#000', 2);
                            label(g, s, x + fw / 2, y + fh * 0.4, fh * 0.42, INK);
                            label(g, '✓', x + fw / 2, y + fh * 0.8, fh * 0.24, '#2f8a3a');
                        });
                    });
                };
                K.msg('Both videos: Hoot shouts a side, the ' + K.pet + ' comes out there, every time. One of them is your fake (' + cuts + ' take' + (cuts === 1 ? '' : 's') + ' cut). <b>Which one?</b>');
                var c = K.ctrl();
                function pickV(k) {
                    K.ctrl();
                    var mine = mineFirst ? 1 : 2;
                    if (odd) {
                        if (k === mine) { K.points(30, 'right'); K.sfx('point'); }
                        else K.sfx('hit');
                        K.msg((k === mine ? 'Right: ' : 'The audience saw it: ') + 'yours was video ' + mine + '. A real guard shouts at random, but in yours he ' +
                            (odd === 'same' ? 'shouted the same side every time' : 'switched sides every time') + ', because you always ' +
                            (odd === 'same' ? 'went in by the same side' : 'switched sides') + '. A good fake guesses each side at random, just like the guard.');
                    } else if (k === 0) {
                        K.points(30, 'right');
                        K.sfx('point');
                        K.msg('Exactly: no one can tell. (Yours was video ' + mine + '.) Both are random shouts, each answered. Since a fake looks the same, the real video shows nothing that needs the word.');
                    } else {
                        K.sfx(k === mine ? 'pop' : 'hit');
                        K.msg((k === mine ? 'Right, by luck: ' : 'No, ') + 'yours was video ' + mine + '. But nothing in the videos gives it away: both are random shouts, each answered. The best answer was "no one can tell".');
                    }
                    var c2 = K.ctrl();
                    c2.appendChild(K.btn(Sc ? 'Now fake some numbers' : 'Next gate', 'zk-go', Sc ? schnorrPart : fact));
                }
                c.appendChild(K.btn('Video 1', null, function () { pickV(1); }));
                c.appendChild(K.btn('Video 2', null, function () { pickV(2); }));
                c.appendChild(K.btn('No one can tell', null, function () { pickV(0); }));
            }
            /* faking Schnorr: the challenge first, then any s, then t computed backwards */
            var S = { lines: [], shout: '' }, fc = 0;
            function schnorrPart() {
                K.draw = boardScene(K, S);
                fakeRound();
            }
            function fakeRound() {
                fc = ri(K.rnd, 1, Sc.q - 1);
                S.lines = [{ t: 'Public: g = ' + Sc.g + ', p = ' + Sc.p + ', q = ' + Sc.q + ', y = ' + Sc.y, c: 'dim' },
                    { t: 'Your secret: none. Your power: rewind.', c: 'bad' },
                    { t: 'Fake ' + (fakes + 1) + ' of ' + FAKES + ': you already know c = ' + fc, c: 'hi' }];
                S.shout = '';
                K.msg('In a video you can pick the challenge first: c = ' + fc + '. Now <b>pick any s</b> from 0 to ' + (Sc.q - 1) + ', and the bell t is computed backwards from it.');
                var c = K.ctrl();
                c.appendChild(K.numpad({ label: 's', digits: 2, onSubmit: function (s) {
                    if (s >= Sc.q) { K.say('From 0 to ' + (Sc.q - 1) + '!'); return; }
                    var t = LOGIC.schFake(Sc, fc, s), ok = LOGIC.schCheck(Sc, t, fc, s);
                    S.lines.push({ t: 't = g^s × y^(-c) = ' + t });
                    S.lines.push({ t: 'Video: t = ' + t + ', c = ' + fc + ', s = ' + s });
                    S.lines.push({ t: 'Check: g^s = ' + powmod(Sc.g, s, Sc.p) + ', t × y^c = ' + mulmod(t, powmod(Sc.y, fc, Sc.p), Sc.p) + (ok ? '  ✓' : '  ✗'), c: ok ? 'ok' : 'bad' });
                    S.shout = 'Looks real!';
                    fakes++; K.points(10); K.sfx('point');
                    var c2 = K.ctrl();
                    if (fakes < FAKES) c2.appendChild(K.btn('Another one', 'zk-go', fakeRound));
                    else c2.appendChild(K.btn('Next gate', 'zk-go', fact));
                } }).el);
            }
            function fact() {
                K.done('A simulator makes transcripts that look exactly like real ones, without the secret, by choosing or rewinding the challenge. ' +
                    'So a real transcript cannot hold anything about the secret: the proof gives zero knowledge. It also convinces only the one who picked the challenges live.');
            }
            ask();
        }
    });
