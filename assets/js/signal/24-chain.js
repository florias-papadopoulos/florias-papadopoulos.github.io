/* Signal in two browsers, part 5: the chain view. Tapping a gear (or a key) shows that KDF chain as a ladder with
   the real values, as in the figures of the Double Ratchet specification: a key goes into a KDF box, the next chain
   key comes out below and a message key (or, for the root chain, a new sending or receiving chain key) to the side;
   into the root chain's KDF a DH output comes in from the side. Keys that are already deleted are struck through. */
(function (SG) {
    'use strict';
    var h = SG.h, N = SG.NAMES;

    function code(bytes) { return bytes ? h('code', { text: SG.short(bytes, 6), title: SG.hex(bytes), 'data-hex': SG.hex(bytes) }) : h('code', { text: '?' }); }
    function node(label, bytes, cls) { return h('li.sg-l-key' + (cls || ''), {}, [h('span', { text: label + ' ' }), code(bytes)]); }
    function kdf(name, side, sideCls, input) {
        return h('li.sg-l-kdf', {}, [
            input ? h('span.sg-l-in', {}, input) : null,
            h('span.sg-l-box', { text: name }),
            h('span.sg-l-out' + (sideCls || ''), {}, side)]);
    }

    SG.ChainView = function () {
        this.title = h('h3.sg-cv-title');
        this.list = h('ol.sg-ladder');
        this.hint = h('p.sg-cv-hint', { text: 'Tap a gear or a key to see its chain with the real values.' });
        this.el = h('section.sg-chainview', { 'aria-live': 'polite' }, [this.title, this.hint, this.list]);
        this.cur = null;
    };
    var V = SG.ChainView.prototype;
    V.clear = function () { this.cur = null; this.title.textContent = ''; this.list.textContent = ''; this.hint.hidden = false; };
    /* m: a Machine; kind: 'dh', 'send' or 'recv'; id: a message key to point at (optional) */
    V.show = function (m, kind, id) {
        this.cur = { m: m, kind: kind, id: id };
        this.render();
    };
    /* drawn again after every step while open, so it follows the conversation */
    V.refresh = function (m) { if (this.cur && (!m || this.cur.m === m)) this.render(); };
    V.render = function () {
        var m = this.cur.m, kind = this.cur.kind, id = this.cur.id, L = this.list, who = m.ghost ? 'Eve’s copy of ' + N[m.side] + '’s' : N[m.side] + '’s';
        this.hint.hidden = true;
        L.textContent = '';
        if (kind === 'dh') {
            this.title.textContent = who + ' root chain (the DH ratchet)';
            var r = m.log.root;
            r.forEach(function (s, i) {
                if (s.first) { L.appendChild(node(s.stolen ? 'stolen root key' : i ? 'root key' : 'root key from X3DH', s.rk, i < r.length - 1 ? '.sg-l-gone' : '')); return; }
                L.appendChild(kdf('KDF', [h('span', { text: s.chain === 'send' ? 'new sending chain ' : 'new receiving chain ' }), code(s.ck)], '.sg-l-' + s.chain,
                    [h('span', { text: 'DH(mine ' + SG.short(s.mine) + ', theirs ' + SG.short(s.theirs) + ') = ' }), code(s.dh)]));
                L.appendChild(node('root key r' + i, s.rk, i < r.length - 1 ? '.sg-l-gone' : ''));
            });
            if (m.el.classList.contains('sg-jammed')) L.appendChild(kdf('KDF', [h('span', { text: 'Eve cannot go on' })], '.sg-l-bad', [h('span', { text: 'DH(?, ?)' })]));
        } else {
            var chains = m.log[kind], c = null;
            for (var i = chains.length - 1; i >= 0 && !c; i--) if (!id || chains[i].steps.some(function (s) { return s.ev.id === id; })) c = chains[i];
            c = c || chains[chains.length - 1];
            this.title.textContent = who + ' ' + (kind === 'send' ? 'sending' : 'receiving') + ' chain (a symmetric ratchet)';
            if (!c) { L.appendChild(h('li.sg-l-key', { text: 'No chain yet.' })); return; }
            L.appendChild(node(c.stolen ? 'stolen chain key' : 'chain key from the root chain', c.ck, c.steps.length ? '.sg-l-gone' : ''));
            c.steps.forEach(function (s, j) {
                var chip = m.chips[s.ev.id], wait = chip && chip.classList.contains('sg-wait');
                var li = kdf('HMAC', [h('span', { text: 'message key ' + s.label + ' ' }), code(s.ev.mk), h('span.sg-l-state', { text: wait ? ' kept for a late message' : ' shredded after use' })],
                    wait ? '.sg-l-wait' : '.sg-l-gone');
                if (s.ev.id === id) li.classList.add('sg-l-focus');
                L.appendChild(li);
                L.appendChild(node('chain key', s.ev.ck, j < c.steps.length - 1 ? '.sg-l-gone' : ''));
            });
        }
    };
})(window.SG);
