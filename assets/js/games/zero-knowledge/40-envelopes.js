    /* ---------- Zero Knowledge, part 40: Sealed Envelopes, a 3-colouring proof. Your secret is a colouring of a map
       of gardens in which no fence joins two gardens of the same colour. Every round you repaint it with a fresh
       swap of the three colours (tap a garden to change its colour), seal each garden in an envelope (the
       commitment), and Hoot opens the two envelopes at one fence of his choice. ---------- */
    function swatch(c) {
        var p = PAINT[c];
        return '<span style="display:inline-block;width:1.15em;height:1.15em;border-radius:50%;border:2px solid #231f3a;vertical-align:-.25em;background:' + p.c + '"></span> ' + p.name;
    }
    /* the scene box for a map, leaving room for Hoot on wide screens */
    function mapBox(W, H) {
        var wide = W > 560, side = wide ? Math.min(W * 0.26, 220) : 0;
        var w = Math.min(W - 16 - side, H * 1.5), h = H - 16;
        return { x: (W - side - w) / 2, y: 8, w: w, h: h, wide: wide, side: side };
    }
    function drawGuardSide(g, W, H, o) {
        var os = clamp(Math.min(H * 0.6, W * 0.2), 80, 180);
        drawOwl(g, W - os * 0.75, H - 6, os, o);
    }

    level({
        id: 'envelopes', name: 'Sealed Envelopes', tag: 'Map colouring', role: 'honest',
        intro: function (K) {
            return 'Your secret: a way to colour this map of gardens with three colours so that no fence joins two gardens of the same colour. ' +
                'Hoot wants proof that you have one, without seeing it.\n' +
                'Every round you repaint the map with the three colours swapped (the swap card says how: tap a garden to change its colour), ' +
                'then each garden goes into a sealed envelope. Hoot picks one fence and opens just the two envelopes next to it. Different colours: the round is passed.';
        },
        build: function (K) {
            var n = K.easy ? 5 : K.hard ? 7 : 6, want = K.easy ? 6 : K.hard ? 10 : 8, ROUNDS = K.easy ? 3 : K.hard ? 5 : 4;
            var map = LOGIC.genColourMap(K.rnd, n, want);
            var E = map.edges.length;
            var cur = map.col.slice(), paint = cur.slice(), target = null, perm = null;
            var round = 0, passes = 0, st = 'paint', fence = -1, openP = 0, timer = null, notes = [], pts = null, rad = 16;
            function odds() {
                var p = Math.pow((E - 1) / E, passes);
                K.odds('A cheater with one bad fence gets this far: ' + (passes ? pct(p) : '100%'), p);
            }
            K.draw = function (g, W, H, t) {
                var box = mapBox(W, H);
                g.fillStyle = '#eef3e4'; g.fillRect(0, 0, W, H);
                if (st === 'open') openP = Math.min(1, openP + 0.04);
                rad = clamp(Math.min(box.w, box.h) * 0.075, 15, 26);
                pts = drawMap(g, map, box, {
                    col: paint, sealed: st === 'sealed' || st === 'open', dog: K.dog, r: rad,
                    hi: st === 'open' || st === 'sealed' && fence >= 0 ? fence : -1,
                    open: st === 'open' ? { fence: fence, p: openP } : null
                });
                if (box.wide) drawGuardSide(g, W, H, { shout: st === 'open' ? (openP < 1 ? 'Opening...' : 'Different. Fine.') : st === 'sealed' ? 'This fence!' : '', look: -1 });
            };
            K.tap = function (x, y) {
                if (st !== 'paint' || !pts) return;
                for (var i = 0; i < pts.length; i++) {
                    if (Math.hypot(pts[i].x - x, pts[i].y - y) <= rad + 8) {
                        paint[i] = (paint[i] + 1) % 3;
                        K.sfx('tap');
                        return;
                    }
                }
            };
            function startRound() {
                st = 'paint'; fence = -1; openP = 0;
                perm = LOGIC.colourShuffle(K.rnd);
                target = LOGIC.applyShuffle(cur, perm);
                paint = cur.slice();
                K.msg('Round ' + (round + 1) + ' of ' + ROUNDS + '. Repaint by the swap card: ' +
                    [0, 1, 2].map(function (c) { return swatch(c) + ' → ' + swatch(perm[c]); }).join(', &nbsp;') + '. <b>Tap gardens</b> to change their colour.');
                var c = K.ctrl();
                c.appendChild(K.btn('Seal the envelopes', 'zk-go', seal));
                timer = K.timer(K.hard ? 22 : 25, function () { timer = null; K.ctrl(); if (K.strike('Too slow with the paint!')) K.later(startRound, 1200); });
            }
            function seal() {
                if (st !== 'paint') return;
                var wrong = 0;
                for (var i = 0; i < n; i++) if (paint[i] !== target[i]) wrong++;
                if (wrong) {
                    K.sfx('hit');
                    K.say(wrong + ' garden' + (wrong === 1 ? ' does' : 's do') + ' not follow the swap card yet.', 2000);
                    return;
                }
                var left = timer ? timer.frac() : 0;
                if (timer) { timer.stop(); timer = null; }
                st = 'sealed';
                K.ctrl(); K.sfx('pop');
                K.msg('Sealed. Hoot looks at the fences and picks one...');
                K.later(function () {
                    fence = Math.floor(K.rnd() * E);
                    K.sfx('move');
                    K.later(function () {
                        st = 'open'; openP = 0;
                        var e = map.edges[fence], a = paint[e[0]], b = paint[e[1]];
                        notes.push(PAINT[a].name + ' + ' + PAINT[b].name);
                        passes++; odds();
                        K.sfx('point'); K.points(20 + Math.round(20 * left));
                        K.msg('Hoot opens the two envelopes at that fence: ' + swatch(a) + ' and ' + swatch(b) + '. Different, so the round passes.<br>' +
                            '<span class="zk-note">Hoot’s notebook: ' + notes.map(function (x, i) { return (i + 1) + ': ' + x; }).join(' · ') + '</span>');
                        var c = K.ctrl();
                        cur = paint.slice();
                        round++;
                        if (round >= ROUNDS) c.appendChild(K.btn('Finish', 'zk-go', function () {
                            K.done('Because the colours are swapped each round, every page of Hoot’s notebook is just "two different colours", which he could have written himself. ' +
                                'Any map can be checked this way, which is why colouring proofs can prove anything a computer can check.');
                        }));
                        else c.appendChild(K.btn('Next round', 'zk-go', startRound));
                    }, 700);
                }, 700);
            }
            K.key(function (e) { if (e.key === 'Enter' && st === 'paint') { e.preventDefault(); seal(); } });
            odds();
            startRound();
        }
    });
