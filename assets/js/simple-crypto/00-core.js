/* Simple Crypto (/simple-crypto/): the player and the drawing helpers. A story (10-, 20-, 30-...) registers itself with
   SC.story({ id, scenes: [seconds, ...], poster: seconds, keys: [seconds or null, ...], build: function (svg, H) { ...; return render; } }).
   poster: the picture shown before it is first played; keys (optional): the still of each scene with reduced motion.
   build() draws everything once; render(t) puts every part where it is at time t (seconds from the start). render is a
   pure function of t, so playing, scrubbing and stepping are all just render(t). 90-boot.js starts the players. */
var SC = (function () {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
    var stories = {};

    /* ---------- small helpers ---------- */
    function el(tag, attrs, parent) {
        var n = document.createElementNS(NS, tag);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function smooth(x) { x = clamp(x); return x * x * (3 - 2 * x); }
    /* where t is between a and b: 0 before, 1 after, eased in between */
    function seg(t, a, b) { return smooth((t - a) / (b - a)); }
    function lin(t, a, b) { return clamp((t - a) / (b - a)); }
    function lerp(a, b, k) { return a + (b - a) * k; }
    /* a pop: grows past full size and settles (0 before a, 1 after b) */
    function pop(t, a, b) {
        var x = clamp((t - a) / (b - a));
        return x <= 0 ? 0 : x >= 1 ? 1 : 1 + Math.sin(x * Math.PI) * 0.25 - (1 - x) * (1 - x) * 0.6;
    }
    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    function mix(a, b, k) {
        var x = hex(a), y = hex(b);
        return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(lerp(x[i], y[i], clamp(k))); }).join(',') + ')';
    }
    /* move a part: position, scale (negative sx mirrors it), rotation in degrees */
    function at(n, x, y, s, r, sx) {
        s = s == null ? 1 : s;
        n.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')' + (r ? ' rotate(' + r.toFixed(2) + ')' : '') +
            ' scale(' + (s * (sx || 1)).toFixed(3) + ' ' + s.toFixed(3) + ')');
    }
    function show(n, o) {
        o = o == null ? 1 : clamp(o);
        n.style.display = o <= 0.001 ? 'none' : '';
        n.setAttribute('opacity', o >= 0.999 ? 1 : o.toFixed(3));
    }
    /* a point on an arc from (x0, y0) to (x1, y1), rising h above the straight line in the middle */
    function arc(x0, y0, x1, y1, h, k) { return { x: lerp(x0, x1, k), y: lerp(y0, y1, k) - h * 4 * k * (1 - k) }; }
    /* a small shake while something works or fails */
    function shake(t, a, b, amp) { return t > a && t < b ? Math.sin(t * 55) * amp * Math.sin(Math.PI * (t - a) / (b - a)) : 0; }

    /* ---------- the characters ---------- */
    /* the cat or the dog: a copy of the site's drawing (cat-svg.html) without the costumes and the other poses. Sitting,
       facing right; scale it with a negative sx to face left. pet.mood('happy' | 'sad' | ''), pet.arm(deg) lifts the
       front paw, pet.tilt(deg) tilts the head. Placed with its feet at (x, y). */
    function pet(parent, kind) {
        var src = document.querySelector('.sc-sprites svg');
        var g = el('g', { 'class': 'sc-pet sc-' + kind }, parent);
        var inner = el('g', {}, g);
        if (!src) return { g: g, place: function () {}, mood: function () {}, arm: function () {}, tilt: function () {} };
        var s = src.cloneNode(true);
        s.removeAttribute('aria-hidden');
        s.setAttribute('width', '110'); s.setAttribute('height', '90'); s.setAttribute('overflow', 'visible');
        s.setAttribute('x', '-56'); s.setAttribute('y', '-88');
        var drop = '.calico-only,.hacker-only,.astro-only,.winter-only,.bat-only,.batdog-eyes,.p-stand,.p-sleep,defs,.eye-sleep,' +
            (kind === 'dog' ? '.cat-only,.stripe,.tail-stripe' : '.dog-only');
        Array.prototype.forEach.call(s.querySelectorAll(drop), function (n) { n.parentNode.removeChild(n); });
        inner.appendChild(s);
        var head = s.querySelector('.cat-head'), armN = s.querySelector('.paw-arm');
        var open = s.querySelector('.eye-open'), happy = s.querySelector('.eye-happy'), blush = s.querySelector('.blush');
        /* sad: worried brows (the inner ends up) over the open eyes */
        var brow = el('path', { 'class': 'sc-sad', d: 'M-12-7.5l7.5-3.5M13-7.5l-7.5-3.5' }, head);
        var dogBrow = s.querySelector('.dog-brow');
        var mood = null, tiltv = null, armv = null;
        return {
            g: g,
            place: function (x, y, s, sx, r) { at(g, x, y, s, r, sx); },
            mood: function (m) {
                if (m === mood) return;
                mood = m;
                open.style.display = m === 'happy' ? 'none' : '';
                happy.style.display = blush.style.display = m === 'happy' ? 'inline' : 'none';
                brow.style.display = m === 'sad' ? 'inline' : 'none';
                if (dogBrow) dogBrow.style.display = m === 'sad' ? 'none' : '';
            },
            arm: function (d) { if (d !== armv) { armv = d; armN.style.transform = d ? 'rotate(' + d + 'deg)' : ''; } },
            tilt: function (d) { if (d !== tiltv) { tiltv = d; head.style.transform = 'translate(66px, 30px) rotate(' + d + 'deg)'; } }
        };
    }
    /* the fox: drawn here in the same flat style (outline #3b2a1e), sitting, facing right, feet at (0, 0) like pet().
       Moods: '' sly, 'happy' grin, 'sad'. */
    function fox(parent) {
        var g = el('g', { 'class': 'sc-fox' }, parent);
        var b = el('g', { transform: 'translate(-56 -88)' }, g);
        el('ellipse', { 'class': 'sc-shadow', cx: 56, cy: 87.5, rx: 30, ry: 3.2 }, b);
        el('path', { 'class': 'fx-fur ol', d: 'M44 82C22 88 2 74 6 52 9 38 24 36 28 46c3 8 0 18 8 25 4 3 8 5 10 6z' }, b);
        el('path', { 'class': 'fx-white', d: 'M6 52C9 38 24 36 28 46c-5 1-9 3-12 7-4 1-7 1-10-1z' }, b);
        el('path', { 'class': 'fx-fur ol', d: 'M38 84c-6-18 2-38 22-40 16-1 22 16 16 40z' }, b);
        el('path', { 'class': 'fx-white', d: 'M58 49c9 1 13 12 10 31-4 2-10 2-14 0-3-14-2-29 4-31z' }, b);
        el('ellipse', { 'class': 'fx-fur ol', cx: 46, cy: 72, rx: 13, ry: 13 }, b);
        el('ellipse', { 'class': 'fx-sock ol', cx: 52, cy: 85, rx: 8.4, ry: 3.7 }, b);
        var arm = el('g', { 'class': 'fx-arm' }, b);
        el('rect', { 'class': 'fx-fur ol', x: 65, y: 56, width: 9, height: 28, rx: 4.5 }, arm);
        el('path', { 'class': 'fx-sock', d: 'M66 72h7v8h-7z' }, arm);
        el('ellipse', { 'class': 'fx-sock ol', cx: 70, cy: 84, rx: 6.2, ry: 3.5 }, arm);
        var head = el('g', { transform: 'translate(64 30)' }, b);
        var droop = el('g', {}, head), hd = el('g', {}, droop);
        el('path', { 'class': 'fx-fur ol', d: 'M-15-6-11-31-1-15zM3-15l9-16 3 25z' }, hd);
        el('path', { 'class': 'fx-dark', d: 'M-12.6-11-10.6-25.5-4.5-15.5zM6-15.5l5.6-10 1.6 14z' }, hd);
        el('path', { 'class': 'fx-fur ol', d: 'M-17 0c0-11 9-16 18-16 8 0 14 5 16 11l13 7c2 1.5 1.5 4.5-1 5l-14 3c-5 5.5-16 7-23 5-6-2-9-8-9-15z' }, hd);
        el('path', { 'class': 'fx-white', d: 'M-15.5 5.5c4 8 13 10.5 21 8.5L15 10l14-3c-5-1-11-2.5-17-4-8-2-19-1-27.5 2.5z' }, hd);
        el('ellipse', { 'class': 'fx-nose', cx: 29.6, cy: 3.6, rx: 2.8, ry: 2.3 }, hd);
        var eyes = {
            '': el('g', {}, hd),
            happy: el('path', { 'class': 'fx-line', d: 'M0-4q4.5-5 9 0' }, hd),
            sad: el('g', {}, hd)
        };
        el('ellipse', { 'class': 'fx-eye', cx: 5, cy: -4, rx: 2.6, ry: 3 }, eyes['']);
        el('circle', { fill: '#fff', cx: 5.9, cy: -5.1, r: 0.9 }, eyes['']);
        el('path', { 'class': 'fx-line', d: 'M0.5-9.5 9.5-7' }, eyes['']);
        el('ellipse', { 'class': 'fx-eye', cx: 5, cy: -3.4, rx: 2.4, ry: 2.8 }, eyes.sad);
        el('circle', { fill: '#fff', cx: 5.8, cy: -4.4, r: 0.8 }, eyes.sad);
        el('path', { 'class': 'fx-line', d: 'M0.5-11.5 9-8.5' }, eyes.sad);
        el('path', { 'class': 'fx-line', d: 'M14 9.5q4-1.6 8-.6' }, hd);
        var mood = null;
        function setMood(m) {
            if (m === mood) return;
            mood = m;
            for (var k in eyes) eyes[k].style.display = k === m ? '' : 'none';
            droop.setAttribute('transform', m === 'sad' ? 'rotate(14)' : '');    /* sad: the head hangs */
        }
        setMood('');
        return {
            g: g,
            place: function (x, y, s, sx, r) { at(g, x, y, s, r, sx); },
            mood: function (m) { setMood(m || ''); },
            arm: function (d) { arm.setAttribute('transform', d ? 'rotate(' + d + ' 70 58)' : ''); },
            tilt: function (d) { hd.setAttribute('transform', d ? 'rotate(' + d + ')' : ''); }
        };
    }

    /* ---------- props: each drawn around (0, 0) = the middle of its bottom unless said otherwise ---------- */
    /* a pot of paint; pot.paint(colour) */
    function pot(parent, colour) {
        var g = el('g', { 'class': 'sc-pot' }, parent);
        el('path', { 'class': 'pot-handle', d: 'M-19-34q19-26 38 0' }, g);
        el('path', { 'class': 'pot-body ol', d: 'M-22-36h44l-4 36h-36z' }, g);
        var p = [el('ellipse', { 'class': 'ol', cx: 0, cy: -36, rx: 22, ry: 6 }, g), el('path', { d: 'M12-33v12a3 3 0 0 0 6 0v-13z' }, g),
            el('path', { d: 'M-15-33v6a3 3 0 0 0 6 0v-7z' }, g)];
        var cur = null;
        function paint(c) { if (c !== cur) { cur = c; p.forEach(function (n) { n.setAttribute('fill', c); }); } }
        paint(colour);
        return { g: g, paint: paint };
    }
    /* a stream of paint pouring from (x, y0) down to y1; k 0..1 how far it reaches */
    function stream(parent) {
        var r = el('rect', { 'class': 'sc-stream', width: 7, rx: 3.5 }, parent);
        return function (x, y0, y1, k, c, o) {
            show(r, o);
            if (o <= 0) return;
            r.setAttribute('x', x - 3.5); r.setAttribute('y', y0); r.setAttribute('height', Math.max(0, (y1 - y0) * k)); r.setAttribute('fill', c);
        };
    }
    /* a letter: paper with rows of "words" (rounded bars). words: rows of widths; centre of the page at (0, 0) */
    function letter(parent, rows, colours) {
        var g = el('g', { 'class': 'sc-letter' }, parent);
        el('path', { 'class': 'paper ol', d: 'M-36-46h56l16 16v76h-72z' }, g);
        el('path', { 'class': 'paper-fold ol', d: 'M20-46v16h16' }, g);
        var words = [];
        rows.forEach(function (row, i) {
            var x = -27;
            row.forEach(function (w, j) {
                words.push(el('rect', { 'class': 'word', x: x, y: -30 + i * 14, width: w, height: 6, rx: 3, fill: (colours && colours[i + ',' + j]) || '#8b95a5' }, g));
                x += w + 4;
            });
        });
        return { g: g, words: words };
    }
    /* a paw print (a pad and four toes); fox = the fox's narrower print */
    function paw(parent, cls, foxy) {
        var g = el('g', { 'class': cls }, parent);
        if (foxy) {
            el('path', { d: 'M0 9c-5 0-6-4-5-7 1-3 3-5 5-5s4 2 5 5c1 3 0 7-5 7z' }, g);
            [[-6, -6], [-2, -10], [2.6, -10], [6.6, -6]].forEach(function (p) { el('ellipse', { cx: p[0], cy: p[1], rx: 1.7, ry: 2.8 }, g); });
        } else {
            el('path', { d: 'M0 1c4 0 7 3 7 6s-3 4-7 4-7-1-7-4 3-6 7-6z' }, g);
            [[-8, -2], [-3.2, -7.4], [3.2, -7.4], [8, -2]].forEach(function (p) { el('ellipse', { cx: p[0], cy: p[1], rx: 2.9, ry: 3.4 }, g); });
        }
        return g;
    }
    function tick(parent) {
        var g = el('g', { 'class': 'sc-tick' }, parent);
        el('circle', { r: 20 }, g); el('path', { d: 'M-9 0l6 6 11-12' }, g);
        return g;
    }
    function cross(parent) {
        var g = el('g', { 'class': 'sc-cross' }, parent);
        el('circle', { r: 20 }, g); el('path', { d: 'M-8-8l16 16M8-8l-16 16' }, g);
        return g;
    }
    /* a thought bubble with a question mark, its tail at (0, 0) going down-left */
    function wonder(parent) {
        var g = el('g', { 'class': 'sc-wonder' }, parent);
        el('circle', { cx: -6, cy: -6, r: 3 }, g); el('circle', { cx: -14, cy: -16, r: 4.5 }, g);
        el('ellipse', { cx: -30, cy: -42, rx: 22, ry: 19 }, g);
        el('path', { 'class': 'q', d: 'M-37-48c0-7 14-8 14 0 0 5-7 5-7 11' }, g);
        el('circle', { 'class': 'qd', cx: -30, cy: -30.5, r: 2.2 }, g);
        return g;
    }
    function heart(parent, colour) {
        return el('path', { 'class': 'sc-heart ol', d: 'M0 10C-14 1-14-10-6-10c3 0 5 2 6 4 1-2 3-4 6-4 8 0 8 11-6 20z', fill: colour || '#f05a7e' }, parent);
    }
    /* the scene: a light room (the same in light and dark mode, like a screen), with the floor at y 372 */
    function room(svg) {
        el('rect', { 'class': 'sc-wall', x: 0, y: 0, width: 800, height: 450 }, svg);
        el('rect', { 'class': 'sc-floor', x: 0, y: 372, width: 800, height: 78 }, svg);
        el('path', { 'class': 'sc-floorline', d: 'M0 372.5h800' }, svg);
    }

    var H = {
        el: el, seg: seg, lin: lin, lerp: lerp, pop: pop, mix: mix, at: at, show: show, arc: arc, shake: shake, clamp: clamp,
        pet: pet, fox: fox, pot: pot, stream: stream, letter: letter, paw: paw, tick: tick, cross: cross, wonder: wonder,
        heart: heart, room: room
    };
    return {
        H: H,
        players: {},                     /* the page's players by story id (90-boot.js) */
        story: function (def) { stories[def.id] = def; },
        get: function (id) { return stories[id]; }
    };
})();
