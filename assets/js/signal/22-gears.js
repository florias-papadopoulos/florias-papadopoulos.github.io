/* Signal in two browsers, part 4: the ratchets as gears. Each person has a machine: one big toothed gear for the DH
   ratchet (the root chain) and two small ones for the symmetric ratchets (the sending and the receiving chain), each
   with a "one way" arrow. Every KDF step turns a gear by exactly one tooth with a little click of its pawl; under a
   small gear each click drops a numbered message key (a1, a2, ... from Alice's sending chain, b1, b2, ... from
   Bob's), under the big gear each turn drops a root key. A used key is shredded; a key kept for a late message waits
   with a dashed edge. A DH turn fits a fresh chain: the small gear flashes amber and its old keys grey out.
   The machine is driven by the ratchet's events (10-ratchet.js) and remembers them for the chain view (24-chain.js).
   Eve's copy is the same machine drawn in red ("ghost"), which jams at the DH turn she cannot follow. */
(function (SG) {
    'use strict';
    var h = SG.h, NS = 'http://www.w3.org/2000/svg';
    var TEETH = { dh: 16, send: 12, recv: 12 };

    function svg(tag, attrs) {
        var el = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
        return el;
    }
    function pt(r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); }
    /* a ratchet wheel: saw teeth that rise slowly and drop straight (it can only turn one way), a hub and spokes */
    SG.gear = function (n, big) {
        var R = 40, d = big ? 7 : 8, step = 2 * Math.PI / n, p = 'M' + pt(R - d, 0);
        for (var i = 0; i < n; i++) p += 'L' + pt(R, (i + 1) * step - 0.03) + 'L' + pt(R - d, (i + 1) * step);
        var spokes = '';
        for (var j = 0; j < 6; j++) spokes += 'M' + pt(8, j * Math.PI / 3) + 'L' + pt(R - d - 3, j * Math.PI / 3);
        var s = svg('svg', { viewBox: '-60 -60 120 120', class: 'sg-gear-svg', 'aria-hidden': 'true' });
        var rot = svg('g', { class: 'sg-rot' });
        rot.appendChild(svg('path', { d: p + 'Z', class: 'sg-teeth' }));
        rot.appendChild(svg('circle', { r: String(R - d - 3), class: 'sg-rim' }));
        rot.appendChild(svg('path', { d: spokes, class: 'sg-spokes' }));
        rot.appendChild(svg('circle', { r: '7', class: 'sg-hub' }));
        s.appendChild(rot);
        /* the pawl that lets it turn one way only, resting on the teeth at the top */
        s.appendChild(svg('path', { d: 'M30 -52L6 -40', class: 'sg-pawl' }));
        s.appendChild(svg('circle', { cx: '30', cy: '-52', r: '3', class: 'sg-pawl-pin' }));
        /* the "one way" arrow, outside the teeth on the right */
        s.appendChild(svg('path', { d: 'M' + pt(52, -0.5) + 'A52 52 0 0 1 ' + pt(52, 0.75), class: 'sg-way' }));
        s.appendChild(svg('path', { d: 'M' + pt(52, 0.75) + 'l-1 -9M' + pt(52, 0.75) + 'l-9 -2', class: 'sg-way' }));
        return s;
    };

    /* opts: {side: 'A'|'B', mirror: true for Bob (DH gear on the right), ghost: Eve's copy, onTap(kind, id)} */
    SG.Machine = function (opts) {
        var self = this;
        this.side = opts.side;
        this.other = opts.side === 'A' ? 'B' : 'A';
        this.ghost = !!opts.ghost;
        this.onTap = opts.onTap || function () {};
        this.turns = { dh: 0, send: 0, recv: 0 };
        this.base = { send: 0, recv: 0 };
        this.chips = {};       // message keys by id
        this.log = { root: [], send: [], recv: [] };   // for the chain view: root steps, and the chains (each {ck, steps})
        this.cols = {};
        ['dh', 'send', 'recv'].forEach(function (k) {
            var btn = h('button.sg-gearbtn', { type: 'button', 'aria-label': k === 'dh' ? 'DH ratchet: show the root chain' : (k === 'send' ? 'Sending chain' : 'Receiving chain') + ': show it',
                onclick: function () { self.onTap(k); } }, [SG.gear(TEETH[k], k === 'dh')]);
            var val = h('span.sg-gval');
            var list = h('ol.sg-keys');
            var col = h('div.sg-col.sg-col-' + k, {}, [btn, h('span.sg-glabel', { text: k === 'dh' ? 'DH ratchet' : k }), val, list]);
            self.cols[k] = { el: col, btn: btn, rot: btn.querySelector('.sg-rot'), val: val, list: list };
        });
        this.mine = h('span.sg-dhkey');
        this.theirs = h('span.sg-dhkey.sg-their');
        this.cols.dh.val.appendChild(this.mine);
        this.cols.dh.val.appendChild(this.theirs);
        this.el = h('div.sg-mach' + (opts.mirror ? '.sg-mirror' : '') + (this.ghost ? '.sg-ghost' : ''), {},
            [this.cols.dh.el, this.cols.send.el, this.cols.recv.el]);
    };
    var M = SG.Machine.prototype;

    /* the letter of a chain's keys: a for Alice's sending chain (and Bob's receiving one), b for Bob's */
    M.letter = function (chain) { return (chain === 'send' ? this.side : this.other) === 'A' ? 'a' : 'b'; };
    M.label = function (chain, n) { return this.letter(chain) + (this.base[chain] + n + 1); };

    /* one tooth on (a ratchet never turns back); reset: a new chain is fitted, the gear flashes amber instead */
    M.turn = function (k, reset) {
        var c = this.cols[k];
        if (reset) { c.btn.classList.remove('sg-reset'); void c.btn.offsetWidth; c.btn.classList.add('sg-reset'); return; }
        this.turns[k]++;
        c.rot.style.transform = 'rotate(' + (this.turns[k] * 360 / TEETH[k]) + 'deg)';
        c.btn.classList.remove('sg-click'); void c.btn.offsetWidth; c.btn.classList.add('sg-click');
    };
    /* a short key with its full value in data-hex (Eve's outline finds it there) */
    function keyCode(bytes, cls) { return h('code' + (cls || ''), { text: SG.short(bytes), title: SG.hex(bytes), 'data-hex': SG.hex(bytes) }); }
    M.setVal = function (k, bytes, prefix) {
        var v = this.cols[k].val, old = v.querySelector('code:not(.sg-old)');
        v.textContent = '';
        if (prefix) v.appendChild(document.createTextNode(prefix + ' '));
        if (old && bytes && old.getAttribute('data-hex') !== SG.hex(bytes)) { old.className = 'sg-old'; v.appendChild(old); }
        if (bytes) v.appendChild(keyCode(bytes, '.sg-new'));
    };
    M.drop = function (k, li) {
        var list = this.cols[k].list;
        list.appendChild(li);
        list.scrollTop = list.scrollHeight;
        return li;
    };
    M.key = function (chain, ev, wait) {
        var self = this, label = this.label(chain, ev.n);
        var li = h('li.sg-key.sg-dropin' + (wait ? '.sg-wait' : ''), { tabindex: '0', role: 'button', 'aria-label': 'message key ' + label,
            onclick: function () { self.onTap(chain, ev.id); },
            onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.onTap(chain, ev.id); } } },
            [h('b', { text: label }), keyCode(ev.mk)]);
        li.label = label;
        this.chips[ev.id] = li;
        return this.drop(chain, li);
    };
    M.chain = function (chain) { var l = this.log[chain]; return l[l.length - 1]; };

    /* draw one event of the ratchet (or of Eve); -> the key chip for ck, skip and useSkip */
    M.apply = function (ev) {
        var c;
        switch (ev.k) {
        case 'init':
            this.log.root.push({ rk: ev.rk, first: true });
            this.drop('dh', h('li.sg-key.sg-root', {}, [h('b', { text: 'root' }), keyCode(ev.rk)]));
            return null;
        case 'gen':
            this.mine.textContent = '';
            var was = this.mine.getAttribute('data-was');
            if (was) this.mine.appendChild(h('s.sg-old', { text: was, title: 'private key deleted' }));
            this.mine.appendChild(document.createTextNode(ev.prekey ? 'mine (prekey) ' : 'mine '));
            this.mine.appendChild(keyCode(ev.pub, '.sg-new'));
            this.mine.setAttribute('data-was', SG.short(ev.pub));
            return null;
        case 'their':
            this.theirs.textContent = '';
            this.theirs.appendChild(document.createTextNode('theirs '));
            this.theirs.appendChild(keyCode(ev.pub, '.sg-new'));
            return null;
        case 'root':
            this.turn('dh');
            this.log.root.push(ev);
            var rl = this.log.root.length - 1;
            this.drop('dh', h('li.sg-key.sg-root.sg-dropin', {}, [h('b', { text: 'r' + rl }), keyCode(ev.rk)]));
            this.base[ev.chain] += this.log[ev.chain].length ? ev.pn : 0;
            Array.prototype.forEach.call(this.cols[ev.chain].list.children, function (li) { li.classList.add('sg-dead'); });
            this.log[ev.chain].push({ ck: ev.ck, root: ev, steps: [] });
            this.turn(ev.chain, true);
            this.drop(ev.chain, h('li.sg-chainstart', {}, ['new chain ', keyCode(ev.ck)]));
            this.setVal(ev.chain, ev.ck);
            return null;
        case 'ck':
        case 'skip':
            this.turn(ev.chain);
            c = this.chain(ev.chain);
            if (c) c.steps.push({ ev: ev, label: this.label(ev.chain, ev.n) });
            this.setVal(ev.chain, ev.ck);
            return this.key(ev.chain, ev, ev.k === 'skip');
        case 'useSkip':
            c = this.chips[ev.id];
            if (c) c.classList.remove('sg-wait');
            return c || null;
        case 'stolen':
            this.mine.textContent = '';
            this.mine.appendChild(document.createTextNode('stolen '));
            this.mine.appendChild(keyCode(ev.pub));
            this.log.root.push({ rk: ev.rk, first: true, stolen: true });
            this.drop('dh', h('li.sg-key.sg-root', {}, [h('b', { text: 'root' }), keyCode(ev.rk)]));
            var self = this;
            ['send', 'recv'].forEach(function (k) {
                var ck = k === 'send' ? ev.cks : ev.ckr;
                if (!ck) return;
                self.log[k].push({ ck: ck, steps: [], stolen: true });
                self.drop(k, h('li.sg-chainstart', {}, ['stolen ', keyCode(ck)]));
                self.setVal(k, ck);
            });
            return null;
        case 'jam':
            var b = this.cols.dh.btn;
            b.classList.remove('sg-jam'); void b.offsetWidth; b.classList.add('sg-jam');
            this.el.classList.add('sg-jammed');
            this.drop('dh', h('li.sg-key.sg-root.sg-dropin', {}, [h('b', { text: '?' }), h('code', { text: 'DH unknown' })]));
            return null;
        }
        return null;
    };
    /* a used key: crossed out and dissolving */
    M.shred = function (id) { var c = this.chips[id]; if (c) c.classList.add('sg-shred'); };
    /* outline in red what Eve has (known: {hex: true}) */
    M.markEve = function (known) {
        Array.prototype.forEach.call(this.el.querySelectorAll('[data-hex]'), function (e) {
            var on = !!known[e.getAttribute('data-hex')], li = e.closest('li');
            (li || e).classList.toggle('sg-evehas', on);
        });
    };
    M.stolenBy = function (on) { this.el.classList.toggle('sg-robbed', !!on); };
})(window.SG);
