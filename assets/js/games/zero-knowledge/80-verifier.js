    /* ---------- Zero Knowledge, part 80: the verifier levels, where you are the guard. Night Watch: provers come to the
       ring cave one by one, some know the word and some bluff, each with a strategy (a coin, always left, copying or
       zigzagging your last shout, or reading your habits); you have a limited number of shouts for the whole night.
       Fence Inspector (Hard): the same with the envelope proof; you pick the fence to open, and one cheater always
       hides its bad fence on the fence you just opened. Right calls score, wrong calls cost trust. ---------- */
    var OTHER_CATS = [
        { name: 'Pepper', fur: '#4a4a55', light: '#6a6a75', head: '#55555f', stripe: '#33333b', cream: '#d9d9de', tail: '#4a4a55', iris: '#e9c46a' },
        { name: 'Biscuit', fur: '#e3c690', light: '#f1d9a7', head: '#f1dcae', stripe: '#c9a46a', cream: '#fbf1dc', tail: '#e3c690', iris: '#7cc4e8' },
        { name: 'Luna', fur: '#8f9aa6', light: '#aab3bd', head: '#a1abb6', stripe: '#6f7a86', cream: '#e6eaee', tail: '#8f9aa6', iris: '#9be37a' },
        { name: 'Ziggy', fur: '#e8935a', light: '#f3b07e', head: '#f0a874', stripe: '#c96f35', cream: '#fff1e2', tail: '#e8935a', iris: '#8ed383' },
        { name: 'Olive', fur: '#b8a794', light: '#cdbfae', head: '#c6b7a5', stripe: '#968572', cream: '#efe8de', tail: '#b8a794', iris: '#e9b949' },
        { name: 'Tofu', fur: '#f4efe6', light: '#fffaf2', head: '#fbf7f0', stripe: '#e2a066', cream: '#ffffff', tail: '#e2a066', iris: '#6fa8dc' },
        { name: 'Nori', fur: '#33343b', light: '#4a4b53', head: '#3c3d45', stripe: '#26272d', cream: '#f2f2f2', tail: '#33343b', iris: '#c6e37a' }
    ];
    var OTHER_DOGS = [
        { name: 'Rex', fur: '#c98546', light: '#e8b57a', head: '#ecbd86', cream: '#fffaf2', tail: '#c98546', ear: '#8a5428', nose: '#2b2220' },
        { name: 'Bella', fur: '#7f8893', light: '#cdd4dc', head: '#d6dce3', cream: '#f7f9fb', tail: '#8a929c', ear: '#5e6670', nose: '#22252b' },
        { name: 'Cooper', fur: '#64402a', light: '#93644a', head: '#9c6d52', cream: '#c49a7a', tail: '#6e4730', ear: '#4a2b19', nose: '#1d1411' },
        { name: 'Daisy', fur: '#e6c48f', light: '#f3dcb3', head: '#f5e0bb', cream: '#fff8ea', tail: '#e6c48f', ear: '#c79a5a', nose: '#2b2220' },
        { name: 'Bailey', fur: '#3a3a40', light: '#55555c', head: '#4a4a52', cream: '#e8e2d8', tail: '#3a3a40', ear: '#2a2a2f', nose: '#111' },
        { name: 'Rosie', fur: '#b5651d', light: '#d08a48', head: '#d39150', cream: '#f5e3cc', tail: '#b5651d', ear: '#7a3f10', nose: '#2b2220' },
        { name: 'Teddy', fur: '#f2ede4', light: '#fffaf3', head: '#fbf7f0', cream: '#ffffff', tail: '#f2ede4', ear: '#c9b79c', nose: '#2b2220' }
    ];
    function provers(K, n, kinds) {
        var pool = shuffle(K.rnd, K.dog ? OTHER_DOGS : OTHER_CATS).slice(0, n);
        kinds = shuffle(K.rnd, kinds);
        return pool.map(function (p, i) {
            var c = {}; for (var k in p) c[k] = p[k];
            c.dog = K.dog; c.stripe = c.stripe || c.fur; c.iris = c.iris || '#5a3a1e'; c.ear = c.ear || c.fur; c.nose = c.nose || '#2b2220';
            return { name: p.name, look: c, kind: kinds[i], passes: 0, rounds: 0, guessed: 0, done: false };
        });
    }
    var TELL = {
        coin: 'flipped a coin for each tunnel', lefty: 'always went in on the left',
        copycat: 'always went in on the side you shouted last', zigzag: 'always went in on the side you did not shout last',
        reader: 'guessed from your habits: whatever you shouted after the same two shouts before',
        fixed: 'had one bad fence and kept it in the same place', sneak: 'always put its bad fence on the fence you had just opened, betting you would not open it twice in a row'
    };

    /* ================= Night Watch ================= */
    level({
        id: 'watch', name: 'Night Watch', tag: 'You are the guard', role: 'check',
        intro: function (K) {
            var n = K.easy ? 4 : K.hard ? 6 : 5, B = K.easy ? 30 : K.hard ? 32 : 28;
            return 'Hoot needs a night off, so you guard the cave. ' + n + ' visitors come; some know the magic word and some only bluff. You have ' + B + ' shouts for the whole night.\n' +
                'For each visitor: shout a side, see where they come out. Once they come out wrong, they are caught. Let in the ones who know the word, turn away the bluffers. ' +
                'Careful: some bluffers watch how you shout and try to predict you.';
        },
        build: function (K) {
            var n = K.easy ? 4 : K.hard ? 6 : 5, BUDGET = K.easy ? 30 : K.hard ? 32 : 28;
            var kinds = K.easy ? ['honest', 'honest', 'coin', 'lefty'] :
                K.hard ? ['honest', 'honest', 'lefty', 'copycat', 'zigzag', 'reader'] : ['honest', 'honest', 'coin', 'copycat', 'zigzag'];
            var P = provers(K, n, kinds), cur = -1, left = BUDGET, hist = [], busy = false, cave = makeCave(K), calls = 0;
            cave.pet.show = false;
            K.draw = function (g, W, H, t) {
                cave.draw(g, W, H, t);
                rr(g, 6, 4, 128, 46, 8); fillStroke(g, 'rgba(255,255,255,.88)', null);
                label(g, 'Shouts left: ' + left, 12, 16, 14, INK, 'left', 800);
                P.forEach(function (p, i) {
                    var x = 20 + i * 22, y = 38;
                    ell(g, x, y, 8, 8); fillStroke(g, p.done ? (p.right ? '#2f8a3a' : '#c92a54') : i === cur ? '#ffb400' : '#fff', INK, 1.5);
                });
            };
            function odds(p) { K.odds('A coin-flipping bluffer gets this far: ' + (p.passes ? oneIn(Math.pow(2, p.passes)) : 'always'), Math.pow(0.5, p.passes)); }
            function nextProver() {
                cur++;
                if (cur >= n) { finish(); return; }
                var p = P[cur];
                cave.petWho = p.look; cave.petName = p.name; cave.pet.show = true; cave.mark = null; cave.hidden = false;
                cave.owl = { closed: false, shout: '', look: 0 };
                busy = true;
                K.msg(p.name + ' says they know the magic word.');
                odds(p);
                K.ctrl();
                cave.hidden = true; cave.walk(cave.routeIn(K.rnd() < 0.5 ? 'L' : 'R', true), function () { busy = false; controls(); });
            }
            function controls() {
                var p = P[cur], c = K.ctrl();
                K.msg(p.name + ' is inside, out of sight. ' + (left ? '<b>Shout a side</b>, or decide.' : 'No shouts left: you have to decide.') +
                    (p.rounds ? ' Passed ' + p.passes + ' of ' + p.rounds + '.' : ''));
                var bL = K.btn('Shout LEFT', null, function () { shout('L'); }), bR = K.btn('Shout RIGHT', null, function () { shout('R'); });
                bL.disabled = bR.disabled = !left;
                c.appendChild(bL); c.appendChild(bR);
                c.appendChild(K.btn('Let in', 'zk-yes', function () { decide(true); }));
                c.appendChild(K.btn('Turn away', 'zk-no', function () { decide(false); }));
            }
            function shout(side) {
                if (busy || !left) return;
                var p = P[cur];
                busy = true; left--; K.ctrl();
                var entry = p.kind === 'honest' ? side : LOGIC.BLUFFERS[p.kind](hist, K.rnd);
                hist.push(side);
                p.rounds++;
                if (entry === side) p.guessed++;
                var exit = p.kind === 'honest' ? side : entry, pass = exit === side;
                cave.owl = { closed: false, shout: 'Come out ' + (side === 'L' ? 'LEFT' : 'RIGHT') + '!', look: side === 'L' ? -1 : 1, frown: true };
                K.sfx('pop');
                K.later(function () {
                    cave.hidden = false;
                    cave.pet.kind = 'ring'; cave.pet.th = TH[exit];
                    cave.walk([{ ring: [TH[exit], Math.PI * 0.5], ms: 500 }, { line: [0, 1], ms: 320 }], function () {
                        cave.mark = { side: exit, good: pass };
                        cave.owl.shout = '';
                        if (pass) {
                            p.passes++; odds(p); K.sfx('point');
                            K.msg(p.name + ' came out on the ' + (exit === 'L' ? 'left' : 'right') + '. Passed.');
                            K.later(function () {
                                cave.hidden = true; cave.walk(cave.routeIn(K.rnd() < 0.5 ? 'L' : 'R', true), function () { busy = false; controls(); });
                            }, 600);
                        } else {
                            K.sfx('hit');
                            p.done = true; p.right = true; calls++;
                            K.points(40, 'caught');
                            K.msg(p.name + ' came out on the WRONG side: a bluffer, caught after ' + p.rounds + ' shout' + (p.rounds === 1 ? '' : 's') + '. ' +
                                'It ' + TELL[p.kind] + '.');
                            next();
                        }
                    });
                }, 500);
            }
            function decide(letIn) {
                if (busy) return;
                var p = P[cur];
                busy = true; p.done = true;
                var honest = p.kind === 'honest', right = letIn === honest;
                p.right = right;
                K.ctrl();
                cave.hidden = false; cave.pet.show = false;
                if (right) {
                    calls++; K.points(40, 'right call'); K.sfx('point');
                    K.msg(honest ? p.name + ' really knew the word. Welcome in!' : 'Good call: ' + p.name + ' was bluffing. It ' + TELL[p.kind] + ', and guessed ' + p.guessed + ' of your ' + p.rounds + ' shouts.');
                    next();
                } else {
                    var msg = honest ? p.name + ' knew the word: an honest visitor turned away!' :
                        p.name + ' was bluffing and got in! It ' + TELL[p.kind] + ', and guessed ' + p.guessed + ' of your ' + p.rounds + ' shouts.';
                    K.msg(msg);
                    if (K.strike(honest ? 'That one was honest!' : 'A bluffer got in!')) next();
                }
            }
            function next() {
                var c = K.ctrl();
                c.appendChild(K.btn(cur + 1 < n ? 'Next visitor' : 'End of the night', 'zk-go', function () { busy = false; nextProver(); }));
            }
            function finish() {
                cave.pet.show = false; cave.hidden = false;
                K.odds(null);
                if (left) K.points(left * 3, 'shouts saved');
                K.msg(calls + ' of ' + n + ' right calls, ' + left + ' shouts left over.');
                K.done('A guard must pick challenges at random: any pattern (always left, alternating, copying) is something a bluffer can learn. ' +
                    'With a fair coin, every bluffer is caught half the time each round, whatever it tries.');
            }
            K.key(function (e) {
                if (busy || cur < 0 || cur >= n) return;
                if (e.key === 'ArrowLeft') { e.preventDefault(); shout('L'); }
                else if (e.key === 'ArrowRight') { e.preventDefault(); shout('R'); }
            });
            K.msg('Ready for the night? ' + BUDGET + ' shouts for ' + n + ' visitors.');
            var c = K.ctrl();
            c.appendChild(K.btn('First visitor', 'zk-go', function () { nextProver(); }));
        }
    });

    /* ================= Fence Inspector (Hard) ================= */
    level({
        id: 'fences', name: 'Fence Inspector', tag: 'You are the guard', role: 'check',
        intro: function (K) {
            return 'Now you check the envelope proof. Three visitors each claim a colouring of this map. Every round the visitor repaints and seals the gardens, and you tap one fence: ' +
                'its two envelopes open. Two different colours: passed. The same colour: a cheater.\n' +
                'A cheater has at least one bad fence, but there are many fences, so one round catches it only now and then. You have 30 checks for all three.';
        },
        build: function (K) {
            var n = 5, map = LOGIC.genColourMap(K.rnd, n, 6), E = map.edges.length, BUDGET = 30;
            var P = provers(K, 3, K.rnd() < 0.5 ? ['honest', 'fixed', 'sneak'] : ['honest', 'honest', 'sneak']);
            P.forEach(function (p) { p.bad = Math.floor(K.rnd() * E); });
            var cur = -1, left = BUDGET, hist = [], busy = true, st = 'idle', fence = -1, shown = null, pts = null, calls = 0;
            K.draw = function (g, W, H, t) {
                var box = mapBox(W, H);
                g.fillStyle = '#eef3e4'; g.fillRect(0, 0, W, H);
                var col = null;
                if (st === 'open' && shown) { col = []; col[map.edges[fence][0]] = shown[0]; col[map.edges[fence][1]] = shown[1]; }
                pts = drawMap(g, map, box, { sealed: true, dog: K.dog, hi: st === 'open' ? fence : -1, open: st === 'open' ? { fence: fence, p: 1 } : null, col: col });
                label(g, 'Checks left: ' + left, 12, 16, 14, INK, 'left', 800);
                if (box.wide && cur >= 0 && cur < P.length) {
                    var ps = clamp(H * 0.45, 70, 150);
                    drawPet(g, P[cur].look, W - ps * 0.7, H - 6, ps, { t: t });
                    label(g, P[cur].name, W - ps * 0.7, H - ps * 1.15, 14, INK);
                }
            };
            function segDist(px, py, a, b) {
                var dx = b.x - a.x, dy = b.y - a.y, u = clamp(((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
                return Math.hypot(a.x + u * dx - px, a.y + u * dy - py);
            }
            K.tap = function (x, y) {
                if (busy || st !== 'sealed' || !pts || !left) return;
                var best = -1, bd = 22;
                map.edges.forEach(function (e, i) { var d = segDist(x, y, pts[e[0]], pts[e[1]]); if (d < bd) { bd = d; best = i; } });
                if (best >= 0) open(best);
            };
            function odds(p) {
                var pr = Math.pow((E - 1) / E, p.passes);
                K.odds('A cheater with one bad fence gets this far: ' + (p.passes ? pct(pr) : '100%'), pr);
            }
            function nextProver() {
                cur++;
                if (cur >= P.length) { finish(); return; }
                odds(P[cur]);
                seal();
            }
            function seal() {
                var p = P[cur];
                st = 'sealed'; fence = -1; shown = null; busy = false;
                K.msg(p.name + ' sealed a fresh colouring. ' + (left ? '<b>Tap a fence</b> to open its two envelopes, or decide.' : 'No checks left: decide.') +
                    (p.rounds ? ' Passed ' + p.passes + ' of ' + p.rounds + '.' : ''));
                var c = K.ctrl();
                c.appendChild(K.btn('Let in', 'zk-yes', function () { decide(true); }));
                c.appendChild(K.btn('Turn away', 'zk-no', function () { decide(false); }));
            }
            function open(f) {
                var p = P[cur];
                busy = true; left--; p.rounds++;
                var bad = p.kind === 'honest' ? -1 : LOGIC.FENCERS[p.kind](hist, E, p, K.rnd);
                hist.push(f);
                fence = f; st = 'open';
                var a = Math.floor(K.rnd() * 3), b = (a + 1 + Math.floor(K.rnd() * 2)) % 3;
                shown = f === bad ? [a, a] : [a, b];
                K.sfx('pop');
                K.ctrl();
                if (f !== bad) {
                    p.passes++; odds(p);
                    K.msg('Two different colours: ' + PAINT[shown[0]].name + ' and ' + PAINT[shown[1]].name + '. Passed.');
                    K.later(seal, 1000);
                } else {
                    p.done = true; p.right = true; calls++;
                    K.sfx('hit'); K.points(40, 'caught');
                    K.msg('Both ' + PAINT[a].name + '! ' + p.name + ' is a cheater, caught after ' + p.rounds + ' check' + (p.rounds === 1 ? '' : 's') + '. It ' + TELL[p.kind] + '.');
                    next();
                }
            }
            function decide(letIn) {
                if (busy) return;
                var p = P[cur];
                busy = true; p.done = true;
                var honest = p.kind === 'honest', right = letIn === honest;
                K.ctrl();
                if (right) {
                    calls++; K.points(40, 'right call'); K.sfx('point');
                    K.msg(honest ? p.name + ' had a real colouring. Welcome in!' : 'Good call: ' + p.name + ' was cheating. It ' + TELL[p.kind] + '.');
                    next();
                } else {
                    K.msg(honest ? p.name + ' had a real colouring: an honest visitor turned away!' : p.name + ' was cheating and got in! It ' + TELL[p.kind] + '.');
                    if (K.strike(honest ? 'That one was honest!' : 'A cheater got in!')) next();
                }
            }
            function next() {
                var c = K.ctrl();
                c.appendChild(K.btn(cur + 1 < P.length ? 'Next visitor' : 'Finish', 'zk-go', function () { st = 'idle'; nextProver(); }));
            }
            function finish() {
                K.odds(null);
                if (left) K.points(left * 3, 'checks saved');
                K.msg(calls + ' of ' + P.length + ' right calls.');
                K.done('With ' + E + ' fences a round catches a one-fence cheater only 1 time in ' + E + ', so real colouring proofs run many rounds. ' +
                    'And a guard who opens fences in order is easy to dodge: only random choices force the cheater to be lucky.');
            }
            K.msg('Three visitors, ' + BUDGET + ' checks. Pick fences at random, and don’t look where a cheater expects.');
            var c = K.ctrl();
            c.appendChild(K.btn('First visitor', 'zk-go', nextProver));
        }
    });
