/* Story 4, "Try it": draw a picture on 10 x 10 squares (tap or drag), see the random key and what is sent (the
   picture with the squares under the key's dots flipped). Then reuse the key for a second picture and see what the
   fox gets by laying the two sent sheets on each other: both pictures, no key needed. */
(function () {
    'use strict';
    SC.tryBox('one-time-pad', function (box, U) {
        var O = SC.otp, N = O.N;
        function newKey() { var k = []; for (var i = 0; i < N * N; i++) k.push(Math.random() < 0.5); return k; }
        var key = newKey(), mine = O.FISH.slice(), second = O.HEART;

        /* a small picture of squares (not touchable); grid.paint(bits) */
        function grid(parent, cls, label) {
            var cell = U.h('figure', 'sc-gcell', null, parent);
            var g = U.h('div', 'sc-g ' + (cls || ''), null, cell), cs = [];
            for (var i = 0; i < N * N; i++) cs.push(U.h('span', '', null, g));
            if (label) U.h('figcaption', 'sc-mixlab', label, cell);
            g.paint = function (bits, dots) {
                bits.forEach(function (v, i) { cs[i].className = (v ? 'on' : '') + (dots && dots[i] ? ' dot' : ''); });
            };
            return g;
        }

        U.h('p', 'sc-try-lead', '<b>Draw your own secret.</b> Tap or drag on the squares. The cat sends it flipped by the key: wherever the key has a dot, white becomes dark and dark becomes white.', box);
        var drawWrap = U.h('div', 'sc-draw-wrap', null, box);
        var draw = grid(drawWrap, 'sc-draw', 'your picture');
        draw.setAttribute('role', 'img');
        draw.setAttribute('aria-label', 'Your picture: tap squares to switch them');
        var tools = U.h('div', 'sc-tools', null, drawWrap);
        var bClear = U.h('button', 'sc-tbtn', { type: 'button' }, tools); bClear.textContent = 'Clear';
        var bFish = U.h('button', 'sc-tbtn', { type: 'button' }, tools); bFish.textContent = 'Fish';
        var bKey = U.h('button', 'sc-tbtn', { type: 'button' }, tools); bKey.textContent = 'New key';

        var row1 = U.h('div', 'sc-grow', null, box);
        var gKey = grid(row1, 'sc-gkey', 'the key (random)');
        U.h('span', 'sc-op', '→', row1);
        var gSent = grid(row1, '', 'what the fox sees');
        U.h('p', 'sc-say', 'That is all the fox gets: noise. For any picture it imagines, some key turns it into exactly this noise, so it cannot tell which picture it was.', box);

        U.h('p', 'sc-try-lead sc-gap', '<b>Now break the rule.</b> The cat uses the same key again for a second picture:', box);
        var pick = U.h('div', 'sc-tools', null, box);
        var choices = [['Heart', O.HEART], ['House', O.HOUSE], ['Cat', O.CAT]].map(function (c) {
            var b = U.h('button', 'sc-tbtn', { type: 'button', 'aria-pressed': 'false' }, pick);
            b.textContent = c[0];
            b.addEventListener('click', function () { second = c[1]; show(); });
            b.bits = c[1];
            return b;
        });
        var row2 = U.h('div', 'sc-grow', null, box);
        var gSent2 = grid(row2, '', 'second sheet sent');
        U.h('span', 'sc-op', '+', row2);
        var gSent1 = grid(row2, '', 'first sheet sent');
        U.h('span', 'sc-op', '=', row2);
        var gBoth = grid(row2, 'sc-gfox', 'the fox lays them on each other');
        U.h('p', 'sc-say sc-bad-say', 'The key’s dots flip each square twice, so the key cancels out and both pictures show. The fox never needed the key.', box);

        function show() {
            var sent = O.xor(mine, key), sent2 = O.xor(second, key);
            draw.paint(mine);
            gKey.paint(key.map(function () { return false; }), key);
            gSent.paint(sent);
            gSent2.paint(sent2); gSent1.paint(sent); gBoth.paint(O.xor(sent, sent2));
            choices.forEach(function (b) { b.setAttribute('aria-pressed', b.bits === second ? 'true' : 'false'); });
        }
        /* drawing: a press switches a square, dragging paints the same way over the others */
        var painting = null;
        function cellAt(e) {
            var r = draw.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * N);
            return x >= 0 && x < N && y >= 0 && y < N ? y * N + x : -1;
        }
        draw.addEventListener('pointerdown', function (e) {
            var i = cellAt(e);
            if (i < 0) return;
            e.preventDefault();
            painting = !mine[i];
            mine[i] = painting;
            if (draw.setPointerCapture) draw.setPointerCapture(e.pointerId);
            show();
        });
        draw.addEventListener('pointermove', function (e) {
            if (painting === null) return;
            var i = cellAt(e);
            if (i >= 0 && mine[i] !== painting) { mine[i] = painting; show(); }
        });
        function stop() { painting = null; }
        draw.addEventListener('pointerup', stop);
        draw.addEventListener('pointercancel', stop);
        bClear.addEventListener('click', function () { mine = mine.map(function () { return false; }); show(); });
        bFish.addEventListener('click', function () { mine = O.FISH.slice(); show(); });
        bKey.addEventListener('click', function () { key = newKey(); show(); });
        show();
    });
})();
