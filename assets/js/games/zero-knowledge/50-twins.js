    /* ---------- Zero Knowledge, part 50: Twin Maps, a graph isomorphism proof. Hoot has two maps of a burrow, one with
       numbered rooms and one with lettered rooms; you know the secret key that says which room is which (they are the
       same burrow). Each round you draw a scrambled copy with new names (symbols), Hoot asks how it matches one of the
       two maps, and you answer room by room. Matching the numbered map is just your scramble; matching the lettered one
       needs the key too: letter -> number (key, backwards) -> symbol (scramble). ---------- */
    var SYMS = ['●', '■', '▲', '◆', '★', '✚', '♥'];   /* circle, square, triangle, diamond, star, cross, heart */
    function sym(i) { return SYMS[i] + '︎'; }
    var LETTERS = 'ABCDEFG';
    /* the eight turns and mirror images of the unit square */
    function turn(p, k) {
        var x = p.x - 0.5, y = p.y - 0.5, t;
        if (k & 4) x = -x;
        for (var i = 0; i < (k & 3); i++) { t = x; x = -y; y = t; }
        return { x: x + 0.5, y: y + 0.5 };
    }
    function placed(nodes, perm, k) { var out = []; nodes.forEach(function (p, i) { out[perm[i]] = turn(p, k); }); return out; }

    level({
        id: 'twins', name: 'Twin Maps', tag: 'Graph isomorphism', role: 'honest',
        intro: function (K) {
            return 'Hoot has two maps of burrows: one with numbered rooms, one with lettered rooms. You know they are the same burrow, and your secret key says which number is which letter.\n' +
                'Each round you draw a scrambled copy with new names (symbols). Hoot then asks how it matches the numbered map or the lettered map, and you name the symbol of each room in turn. ' +
                'For the numbered map, read your scramble note. For the lettered map, go letter to number with the key, then number to symbol.';
        },
        build: function (K) {
            var n = K.hard ? 7 : 6, want = K.hard ? 9 : 7, ROUNDS = K.hard ? 4 : 3;
            var A = LOGIC.genTwin(K.rnd, n, want), pi = LOGIC.randPerm(K.rnd, n);
            var kB = 1 + Math.floor(K.rnd() * 7);
            var mapA = { nodes: A.nodes, edges: A.edges }, mapB = { nodes: placed(A.nodes, pi, kB), edges: LOGIC.relabel(A.edges, pi) };
            var labA = [], labB = [];
            for (var i = 0; i < n; i++) { labA.push(String(i + 1)); labB.push(LETTERS[i]); }
            var sigma = null, mapH = null, labH = [], askB = false, ans = [], st = 'idle', round = 0, passes = 0, timer = null, flash = 0, lastOk = false;
            function odds() { K.odds('A cheater gets this far: ' + (passes ? oneIn(Math.pow(2, passes)) : 'always'), Math.pow(0.5, passes)); }
            function panel(g, map, box, labels, title, o) {
                rr(g, box.x + 2, box.y + 2, box.w - 4, box.h - 4, 10); fillStroke(g, '#fbf7ee', '#cbbfa6', 2);
                label(g, title, box.x + box.w / 2, box.y + 14, clamp(box.w * 0.06, 11, 14), '#6f6888', 'center', 800);
                var inner = { x: box.x + 4, y: box.y + 22, w: box.w - 8, h: box.h - 26 };
                drawMap(g, map, inner, { labels: labels, pick: o && o.pick, r: clamp(Math.min(inner.w, inner.h) * 0.085, 12, 22), fenceTint: o && o.tint });
            }
            K.draw = function (g, W, H) {
                g.fillStyle = '#efe7d6'; g.fillRect(0, 0, W, H);
                var tintAsk = null;
                if (st === 'check' && flash > 0) { flash -= 0.02; tintAsk = (askB ? mapB : mapA).edges.map(function () { return lastOk ? '#2f8a3a' : '#c92a54'; }); }
                var pickAt = st === 'answer' && ans.length < n ? ans.length : null;
                if (W >= 640) {
                    var w3 = W / 3;
                    panel(g, mapA, { x: 0, y: 0, w: w3, h: H }, labA, 'Map 1 (numbers)', !askB && st !== 'idle' ? { pick: pickAt, tint: tintAsk } : null);
                    panel(g, mapB, { x: w3, y: 0, w: w3, h: H }, labB, 'Map 2 (letters)', askB && st !== 'idle' ? { pick: pickAt, tint: tintAsk } : null);
                    if (mapH) panel(g, mapH, { x: 2 * w3, y: 0, w: w3, h: H }, labH, 'Your copy');
                } else {
                    var w2 = W / 2;
                    if (st === 'answer' || st === 'check') panel(g, askB ? mapB : mapA, { x: 0, y: 0, w: w2, h: H }, askB ? labB : labA, askB ? 'Map 2' : 'Map 1', { pick: pickAt, tint: tintAsk });
                    else {
                        panel(g, mapA, { x: 0, y: 0, w: w2, h: H / 2 }, labA, 'Map 1');
                        panel(g, mapB, { x: 0, y: H / 2, w: w2, h: H / 2 }, labB, 'Map 2');
                    }
                    if (mapH) panel(g, mapH, { x: w2, y: 0, w: w2, h: H }, labH, 'Your copy');
                }
            };
            function notes() {
                var key = [], scr = [];
                for (var i = 0; i < n; i++) { key.push((i + 1) + '→' + LETTERS[pi[i]]); if (sigma) scr.push((i + 1) + '→' + sym(sigma[i])); }
                return '<span class="zk-note">Secret key: <b>' + key.join(' ') + '</b>' + (sigma ? '<br>Scramble: <b>' + scr.join(' ') + '</b>' : '') + '</span>';
            }
            function startRound() {
                st = 'idle'; ans = [];
                sigma = LOGIC.randPerm(K.rnd, n);
                var kH; do { kH = Math.floor(K.rnd() * 8); } while (kH === kB);
                mapH = { nodes: placed(A.nodes, sigma, kH), edges: LOGIC.relabel(A.edges, sigma) };
                labH = []; for (var i = 0; i < n; i++) labH.push(sym(i));
                K.sfx('pop');
                K.msg('Round ' + (round + 1) + ' of ' + ROUNDS + '. You drew a scrambled copy of map 1 and gave it to Hoot. He flips a coin...<br>' + notes());
                K.ctrl();
                K.later(function () {
                    askB = K.rnd() < 0.5;
                    st = 'answer';
                    K.sfx('move');
                    askNext();
                    timer = K.timer(K.hard ? 45 : 40, function () { timer = null; K.ctrl(); if (K.strike('Too slow, Hoot gave up waiting.')) K.later(startRound, 1300); });
                }, 900);
            }
            function askNext() {
                var who = askB ? LETTERS[ans.length] : String(ans.length + 1);
                K.msg('Hoot: "Show me your copy is <b>map ' + (askB ? '2' : '1') + '</b>." Which symbol is room <b>' + who + '</b>?' +
                    (askB && K.lv !== 'hard' ? ' (Key backwards: ' + who + ' is room ' + (LOGIC.invPerm(pi)[ans.length] + 1) + ' of map 1.)' : '') + '<br>' + notes());
                var c = K.ctrl();
                for (var i = 0; i < n; i++) (function (h) {
                    var b = K.btn(sym(h), 'zk-sym', function () { choose(h); });
                    if (ans.indexOf(h) >= 0) b.disabled = true;
                    b.setAttribute('aria-label', ['circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'heart'][h]);
                    c.appendChild(b);
                })(i);
                if (ans.length) c.appendChild(K.btn('Undo', null, function () { ans.pop(); askNext(); }));
            }
            function choose(h) {
                if (st !== 'answer' || ans.indexOf(h) >= 0) return;
                ans.push(h); K.sfx('tap');
                if (ans.length < n) { askNext(); return; }
                var left = timer ? timer.frac() : 0;
                if (timer) { timer.stop(); timer = null; }
                st = 'check'; flash = 1;
                var ok = lastOk = LOGIC.isIso(n, (askB ? mapB : mapA).edges, mapH.edges, ans);
                K.ctrl();
                if (ok) {
                    passes++; odds();
                    K.sfx('point'); K.points(20 + Math.round(20 * left));
                    K.msg('Hoot follows every tunnel: each one lands on a tunnel of your copy. Round passed.<br>' + notes());
                } else {
                    K.msg('Hoot found a tunnel that does not match. ' + (askB ? 'For map 2: letter, then the key backwards to a number, then the scramble.' : 'For map 1 the scramble note is the answer.'));
                    if (!K.strike('A tunnel did not match!')) return;
                }
                round++;
                var c = K.ctrl();
                if (round >= ROUNDS) c.appendChild(K.btn('Finish', 'zk-go', function () {
                    K.done('Hoot saw one matching per round, between a fresh copy and one of his maps. Both matchings of one copy together would give him your key, ' +
                        'which is why he only ever gets to ask for one.');
                }));
                else c.appendChild(K.btn('Next round', 'zk-go', startRound));
            }
            K.key(function (e) {
                if (st !== 'answer') return;
                var d = parseInt(e.key, 10);
                if (d >= 1 && d <= n) { e.preventDefault(); choose(d - 1); }
                else if (e.key === 'Backspace' && ans.length) { e.preventDefault(); ans.pop(); askNext(); }
            });
            odds();
            K.msg('Your key matches the two maps.<br>' + notes());
            var c = K.ctrl();
            c.appendChild(K.btn('Draw a scrambled copy', 'zk-go', startRound));
        }
    });
