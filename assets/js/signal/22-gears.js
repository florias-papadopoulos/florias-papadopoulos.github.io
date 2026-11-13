/* Signal's Double Ratchet, part 4: the ratchets as gears. Each person has a machine: one big toothed gear for the DH
   ratchet (the root chain, amber) and two small ones for the symmetric ratchets (the sending and the receiving
   chain), each held by a pawl so it turns one way only. A small gear has the colour of the person whose messages its
   chain encrypts: Alice's sending gear and Bob's receiving gear are the same chain, the same colour, and click the same
   tooth. Every KDF step turns a gear by exactly one tooth; under a small gear each click drops a numbered message
   key (a1, a2, ... from Alice's sending chain, b1, b2, ... from Bob's), under the big gear each turn drops a root key.
   A used key is shredded; a key kept for a late message waits with a dashed amber edge. A DH turn fits a fresh chain:
   the small gear flashes amber and a thin line starts the new chain in its column.
   The machine is driven by the ratchet's events (10-ratchet.js) and remembers them for the chain view (24-chain.js).
   Eve's copy is the same machine drawn in red ("ghost"), which jams at the DH turn she cannot follow. */
(function (SG) {
    'use strict';
    var h = SG.h, NS = 'http://www.w3.org/2000/svg';
    var TEETH = { dh: 18, send: 12, recv: 12 };
    var NAME = { dh: 'DH ratchet', send: 'sending', recv: 'receiving' };

    function svg(tag, attrs) {
        var el = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
        return el;
    }
    function pt(r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); }
    /* a ratchet wheel: saw teeth that rise slowly and drop straight (it can only turn one way), a rim, spokes and a
       hub; the pawl rests on the teeth at the top right. Strokes keep their width at any size (non-scaling). */
    SG.gear = function (n) {
        var R = 46, d = 7, step = 2 * Math.PI / n, a0 = -Math.PI / 2, p = 'M' + pt(R - d, a0);
        for (var i = 0; i < n; i++) p += 'L' + pt(R, a0 + (i + 1) * step - 0.025) + 'L' + pt(R - d, a0 + (i + 1) * step);
        var spokes = '';
        for (var j = 0; j < 5; j++) spokes += 'M' + pt(9, a0 + j * 2 * Math.PI / 5) + 'L' + pt(R - d - 6, a0 + j * 2 * Math.PI / 5);
        var s = svg('svg', { viewBox: '-58 -58 116 116', class: 'sg-gear-svg', 'aria-hidden': 'true' });
        var rot = svg('g', { class: 'sg-rot' });
        rot.appendChild(svg('path', { d: p + 'Z', class: 'sg-teeth' }));
        rot.appendChild(svg('circle', { r: String(R - d - 6), class: 'sg-rim' }));
        rot.appendChild(svg('path', { d: spokes, class: 'sg-spokes' }));
        rot.appendChild(svg('circle', { r: '7', class: 'sg-hub' }));
        rot.appendChild(svg('circle', { r: '2.5', class: 'sg-hole' }));
        s.appendChild(rot);
        /* the pawl: a short arm from a pin outside the wheel down onto a tooth */
        var g = svg('g', { class: 'sg-pawl' });
        g.appendChild(svg('path', { d: 'M33 -49L14 -40', class: 'sg-pawl-arm' }));
        g.appendChild(svg('circle', { cx: '33', cy: '-49', r: '3.2', class: 'sg-pawl-pin' }));
        s.appendChild(g);
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
            var who = k === 'dh' ? '' : self.letter(k);
            var btn = h('button.sg-gearbtn', { type: 'button', 'aria-label': k === 'dh' ? 'DH ratchet: show the root chain' : (k === 'send' ? 'Sending chain' : 'Receiving chain') + ': show it',
                onclick: function () { self.onTap(k); } }, [SG.gear(TEETH[k])]);
            var val = h('span.sg-gval');
            var list = h('ol.sg-keys', { 'aria-label': NAME[k] + ' keys' });
            var col = h('div.sg-col.sg-col-' + k + (who ? '.sg-ch' + who.toUpperCase() : ''), {}, [btn, h('span.sg-glabel', { text: NAME[k] }), val, list]);
            self.cols[k] = { el: col, btn: btn, rot: btn.querySelector('.sg-rot'), val: val, list: list };
        });
        this.mine = h('span.sg-dhkey');
        this.theirs = h('span.sg-dhkey');
        this.cols.dh.val.appendChild(this.mine);
        this.cols.dh.val.appendChild(this.theirs);
        this.el = h('div.sg-mach' + (opts.mirror ? '.sg-mirror' : '') + (this.ghost ? '.sg-ghost' : ''), {},
            [this.cols.dh.el, this.cols.send.el, this.cols.recv.el]);
    };
    var M = SG.Machine.prototype;

    /* the letter of a chain's keys: a for Alice's sending chain (and Bob's receiving one), b for Bob's */
    M.letter = function (chain) { return (chain === 'send' ? this.side : this.other) === 'A' ? 'a' : 'b'; };
    M.label = function (chain, n) { return this.letter(chain) + (this.base[chain] + n + 1); };

    function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
    /* one tooth on (a ratchet never turns back); reset: a new chain is fitted, the gear flashes amber instead */
    M.turn = function (k, reset) {
        var c = this.cols[k];
        if (reset) { replay(c.btn, 'sg-reset'); return; }
        this.turns[k]++;
        c.rot.style.transform = 'rotate(' + (this.turns[k] * 360 / TEETH[k]) + 'deg)';
        replay(c.btn, 'sg-click');
    };
    var code = SG.hexCode;
    M.setVal = function (k, bytes) {
        var v = this.cols[k].val;
        v.textContent = '';
        if (bytes) v.appendChild(code(bytes, '.sg-new'));
    };
    M.drop = function (k, li) {
        var list = this.cols[k].list;
        list.appendChild(li);
        list.scrollTop = list.scrollHeight;
        return li;
    };
    function chip(label, bytes, cls, props) { return h('li.sg-key' + (cls || ''), props || {}, [h('b', { text: label }), code(bytes)]); }
    M.key = function (chain, ev, wait) {
        var self = this, label = this.label(chain, ev.n);
        var li = chip(label, ev.mk, '.sg-dropin' + (wait ? '.sg-wait' : ''), { tabindex: '0', role: 'button',
            'aria-label': 'message key ' + label + (wait ? ', kept for a late message' : ''),
            onclick: function () { self.onTap(chain, ev.id); },
            onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.onTap(chain, ev.id); } } });
        li.label = label;
        this.chips[ev.id] = li;
        return this.drop(chain, li);
    };
    /* the start of a chain in a key column: a thin line (the chain key is in its title) */
    M.chainStart = function (k, ck, text) {
        var x = SG.hex(ck);
        this.drop(k, h('li.sg-chainstart', { title: text + ' ' + x, 'data-hex': x }, [h('span', { text: text })]));
    };
    M.chain = function (chain) { var l = this.log[chain]; return l[l.length - 1]; };
    M.dhKey = function (el, text, bytes) {
        el.textContent = '';
        el.appendChild(h('span', { text: text + ' ' }));
        el.appendChild(code(bytes, '.sg-new'));
    };

    /* draw one event of the ratchet (or of Eve); -> the key chip for ck, skip and useSkip */
    M.apply = function (ev) {
        var c, self = this;
        switch (ev.k) {
        case 'init':
            this.log.root.push({ rk: ev.rk, first: true });
            this.drop('dh', chip('root', ev.rk, '.sg-root'));
            return null;
        case 'gen':
            this.dhKey(this.mine, ev.prekey ? 'mine (prekey)' : 'mine', ev.pub);
            return null;
        case 'their':
            this.dhKey(this.theirs, 'theirs', ev.pub);
            return null;
        case 'root':
            this.turn('dh');
            this.log.root.push(ev);
            this.drop('dh', chip('r' + (this.log.root.length - 1), ev.rk, '.sg-root.sg-dropin'));
            this.base[ev.chain] += this.log[ev.chain].length ? ev.pn : 0;
            this.log[ev.chain].push({ ck: ev.ck, root: ev, steps: [] });
            this.turn(ev.chain, true);
            this.chainStart(ev.chain, ev.ck, 'new chain');
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
            this.dhKey(this.mine, 'stolen', ev.pub);
            this.log.root.push({ rk: ev.rk, first: true, stolen: true });
            this.drop('dh', chip('root', ev.rk, '.sg-root'));
            ['send', 'recv'].forEach(function (k) {
                var ck = k === 'send' ? ev.cks : ev.ckr;
                if (!ck) return;
                self.log[k].push({ ck: ck, steps: [], stolen: true });
                self.chainStart(k, ck, 'stolen chain');
                self.setVal(k, ck);
            });
            return null;
        case 'jam':
            replay(this.cols.dh.btn, 'sg-jam');
            this.el.classList.add('sg-jammed');
            this.drop('dh', h('li.sg-key.sg-root.sg-dropin.sg-unknown', {}, [h('b', { text: '?' }), h('span', { text: 'DH unknown' })]));
            return null;
        }
        return null;
    };
    /* a used key: shredded (it stays in the column, quiet) */
    M.shred = function (id) { var c = this.chips[id]; if (c) { c.classList.add('sg-shred'); c.setAttribute('aria-label', 'message key ' + c.label + ', shredded'); } };
    /* outline in red what Eve has (known: {hex: true}) */
    M.markEve = function (known) {
        Array.prototype.forEach.call(this.el.querySelectorAll('[data-hex]'), function (e) {
            var on = !!known[e.getAttribute('data-hex')], li = e.closest('li');
            (li || e).classList.toggle('sg-evehas', on);
        });
    };
    M.stolenBy = function (on) { this.el.classList.toggle('sg-robbed', !!on); };
})(window.SG);
