/* Signal in two browsers, part 6: the X3DH picture. Alice's keys on the left, Bob's published keys on the right, and
   in the middle the four DH computations, each drawn as two lines from the keys it combines, all feeding one KDF
   that makes the first root key. Also the lines layer used across the page (SG.Lines): soft curves between two
   elements, measured from the page and placed again when anything moves. */
(function (SG) {
    'use strict';
    var h = SG.h, NS = 'http://www.w3.org/2000/svg';

    /* ---------- lines between elements ---------- */
    /* Lines are measured from the page, so they are placed again whenever something may have moved: the window
       changes size, the page or a list inside it scrolls, or the box changes size. */
    SG.Lines = function (box) {
        var self = this;
        this.box = box;
        this.svg = document.createElementNS(NS, 'svg');
        this.svg.setAttribute('class', 'sg-lines');
        this.svg.setAttribute('aria-hidden', 'true');
        box.appendChild(this.svg);
        this.items = [];
        this.frame = 0;
        this.onMove = function () {
            if (!box.isConnected) { self.off(); return; }
            if (!self.items.length || self.frame) return;
            self.frame = requestAnimationFrame(function () { self.frame = 0; self.redraw(); });
        };
        window.addEventListener('resize', this.onMove);
        document.addEventListener('scroll', this.onMove, true);
        if (window.ResizeObserver) { this.ro = new ResizeObserver(this.onMove); this.ro.observe(box); }
    };
    SG.Lines.prototype.off = function () {
        window.removeEventListener('resize', this.onMove);
        document.removeEventListener('scroll', this.onMove, true);
        if (this.ro) this.ro.disconnect();
    };
    /* a line from a to b (elements); cls for the colour */
    SG.Lines.prototype.add = function (a, b, cls) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('class', 'sg-line ' + (cls || ''));
        p.setAttribute('pathLength', '1');
        this.svg.appendChild(p);
        var it = { a: a, b: b, p: p };
        this.items.push(it);
        this.redraw();
        return it;
    };
    /* fade a line out, then remove it */
    SG.Lines.prototype.fade = function (it) {
        var self = this;
        it.p.classList.add('sg-line-out');
        SG.later(600, function () { self.remove(it); });
    };
    SG.Lines.prototype.remove = function (it) {
        var i = this.items.indexOf(it);
        if (i >= 0) this.items.splice(i, 1);
        if (it.p.parentNode) it.p.remove();
    };
    /* a soft S curve that leaves and enters level (side by side) or upright (one above the other) */
    SG.Lines.prototype.place = function (it, o) {
        var a = it.a.getBoundingClientRect(), b = it.b.getBoundingClientRect();
        if (!a.width || !b.width || !it.a.isConnected || !it.b.isConnected) { it.p.setAttribute('d', ''); return; }
        var ax, ay, bx, by, d;
        if (a.right <= b.left || b.right <= a.left) {
            var ltr = a.right <= b.left;
            ax = ltr ? a.right : a.left; bx = ltr ? b.left : b.right; ay = a.top + a.height / 2; by = b.top + b.height / 2;
            var mx = (ax + bx) / 2 - o.left;
            d = 'M' + f(ax - o.left) + ' ' + f(ay - o.top) + 'C' + f(mx) + ' ' + f(ay - o.top) + ' ' + f(mx) + ' ' + f(by - o.top) + ' ' + f(bx - o.left) + ' ' + f(by - o.top);
        } else {
            var down = a.bottom <= b.top;
            ax = a.left + a.width / 2; bx = b.left + b.width / 2; ay = down ? a.bottom : a.top; by = down ? b.top : b.bottom;
            var my = (ay + by) / 2 - o.top;
            d = 'M' + f(ax - o.left) + ' ' + f(ay - o.top) + 'C' + f(ax - o.left) + ' ' + f(my) + ' ' + f(bx - o.left) + ' ' + f(my) + ' ' + f(bx - o.left) + ' ' + f(by - o.top);
        }
        it.p.setAttribute('d', d);
    };
    function f(x) { return x.toFixed(1); }
    SG.Lines.prototype.redraw = function () {
        var o = this.box.getBoundingClientRect();
        this.svg.setAttribute('width', String(Math.ceil(o.width)));
        this.svg.setAttribute('height', String(Math.ceil(o.height)));
        for (var i = 0; i < this.items.length; i++) this.place(this.items[i], o);
    };

    /* ---------- X3DH ---------- */
    var PAIRS = [['ikA', 'spkB', 'DH1'], ['ekA', 'ikB', 'DH2'], ['ekA', 'spkB', 'DH3'], ['ekA', 'opkB', 'DH4']];
    var NAMES = { ikA: 'identity', ekA: 'ephemeral', ikB: 'identity', spkB: 'signed prekey', opkB: 'one-time prekey' };

    SG.X3dh = function () {
        var self = this;
        this.keys = {};
        function blob(id) {
            var c = h('code.sg-hex');
            var b = h('div.sg-blob.sg-blob-' + id, { hidden: id === 'ekA' }, [h('span', { text: NAMES[id] }), c]);
            self.keys[id] = { el: b, code: c };
            return b;
        }
        this.chips = PAIRS.map(function (p) { return h('div.sg-dhchip', { hidden: true }, [h('b', { text: p[2] }), h('code.sg-hex')]); });
        this.box = h('div.sg-kdfbox', { hidden: true, text: 'KDF' });
        this.out = h('div.sg-x3out', { hidden: true }, [h('span', { text: 'first root key ' }), h('code.sg-hex')]);
        this.el = h('section.sg-x3dh', { 'aria-label': 'X3DH' }, [
            h('div.sg-x3col.sg-x3a', {}, [h('h3.sg-byA', { text: 'Alice' }), blob('ikA'), blob('ekA')]),
            h('div.sg-x3col.sg-x3mid', {}, this.chips.concat([this.box, this.out])),
            h('div.sg-x3col.sg-x3b', {}, [h('h3.sg-byB', { text: 'Bob, published' }), blob('ikB'), blob('spkB'), blob('opkB')])]);
        this.lines = new SG.Lines(this.el);
        /* folded once the key is agreed: one line, the picture on request */
        this.sumKey = h('code.sg-hex');
        this.toggle = h('button.sg-link.sg-x3toggle', { type: 'button', text: 'Show', onclick: function () { self.fold(!self.el.classList.contains('sg-folded')); } });
        this.el.appendChild(h('p.sg-x3sum', {}, [h('b', { text: 'X3DH' }), ' Four DH results, one KDF: the first root key ', this.sumKey, ' ', this.toggle]));
    };
    SG.X3dh.prototype.fold = function (on) {
        this.el.classList.add('sg-agreed');
        this.el.classList.toggle('sg-folded', on);
        this.toggle.textContent = on ? 'Show' : 'Hide';
        if (!on) this.lines.redraw();
    };
    var X = SG.X3dh.prototype;
    function fill(code, bytes) { var x = SG.hex(bytes); code.textContent = x.slice(0, 6); code.title = x; code.setAttribute('data-hex', x); }
    /* keys: {ikA, ekA, ikB, spkB, opkB} (public keys) */
    X.setKey = function (id, bytes) {
        var k = this.keys[id];
        fill(k.code, bytes);
        k.el.hidden = false;
        k.el.classList.add('sg-dropin');
        this.lines.redraw();
    };
    /* the i-th DH (0 to 3) with its result */
    X.dh = function (i, out) {
        var p = PAIRS[i], c = this.chips[i];
        fill(c.querySelector('code'), out);
        c.hidden = false;
        c.classList.add('sg-dropin');
        this.lines.redraw();
        this.lines.add(this.keys[p[0]].el, c, 'sg-line-dh');
        this.lines.add(this.keys[p[1]].el, c, 'sg-line-dh');
    };
    X.kdf = function (sk) {
        this.box.hidden = false;
        fill(this.out.querySelector('code'), sk);
        fill(this.sumKey, sk);
        this.out.hidden = false;
        this.out.classList.add('sg-dropin');
        this.lines.redraw();
    };
    X.shred = function (ids) {
        var self = this;
        ids.forEach(function (id) { self.keys[id].el.classList.add('sg-shred'); });
    };
})(window.SG);
