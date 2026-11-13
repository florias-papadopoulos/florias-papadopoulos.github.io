/* Signal's Double Ratchet, part 5: the chain view. Tapping a gear (or a key) shows that KDF chain as a ladder with
   the real values, as in the figures of the Double Ratchet specification: a key goes into a KDF box, the next chain
   key comes out below and a message key (or, for the root chain, a new sending or receiving chain key) to the side;
   into the root chain's KDF a DH output comes in from the side. Keys that are already deleted are shown quiet, as
   shredded. Closed, it is one line that says what to tap. */
(function (SG) {
    'use strict';
    var h = SG.h, N = SG.NAMES, code = SG.hexCode;

    function node(label, bytes, cls) { return h('li.sg-l-key' + (cls || ''), {}, [h('span.sg-l-node', {}, [h('span', { text: label + ' ' }), code(bytes)])]); }
    function kdf(name, side, sideCls, input) {
        return h('li.sg-l-kdf', {}, [
            input ? h('span.sg-l-in', {}, input) : null,
            h('span.sg-l-box', { text: name }),
            h('span.sg-l-out' + (sideCls || ''), {}, side)]);
    }

    SG.ChainView = function () {
        var self = this;
        this.title = h('h3.sg-cv-title');
        this.close = h('button.sg-link', { type: 'button', text: 'Hide', onclick: function () { self.clear(); } });
        this.list = h('ol.sg-ladder');
        this.hint = h('p.sg-cv-hint', { text: 'Tap a gear or a key to see its chain, with the real values.' });
        this.head = h('div.sg-cv-head', { hidden: true }, [this.title, this.close]);
        this.el = h('section.sg-chainview', { 'aria-live': 'polite' }, [this.hint, this.head, this.list]);
        this.cur = null;
    };
    var V = SG.ChainView.prototype;
    V.clear = function () {
        this.cur = null; this.title.textContent = ''; this.list.textContent = '';
        this.hint.hidden = false; this.head.hidden = true; this.el.classList.remove('sg-open');
    };
    /* m: a Machine; kind: 'dh', 'send' or 'recv'; id: a message key to point at (optional) */
    V.show = function (m, kind, id) {
        this.cur = { m: m, kind: kind, id: id };
        this.render();
        /* bring it into view (it sits under both people) */
        var r = this.el.getBoundingClientRect();
        if (r.top > window.innerHeight - 80 || r.bottom < 0) this.el.scrollIntoView({ block: 'nearest', behavior: SG.still ? 'auto' : 'smooth' });
    };
    /* drawn again after every step while open, so it follows the conversation */
    V.refresh = function (m) { if (this.cur && (!m || this.cur.m === m)) this.render(); };
    V.render = function () {
        var m = this.cur.m, kind = this.cur.kind, id = this.cur.id, L = this.list, who = m.ghost ? 'Eve’s copy of ' + N[m.side] + '’s' : N[m.side] + '’s';
        this.hint.hidden = true;
        this.head.hidden = false;
        this.el.classList.add('sg-open');
        this.el.classList.toggle('sg-cv-eve', m.ghost);
        L.textContent = '';
        if (kind === 'dh') {
            this.title.textContent = who + ' root chain (the DH ratchet)';
            var r = m.log.root;
            r.forEach(function (s, i) {
                if (s.first) { L.appendChild(node(s.stolen ? 'stolen root key' : i ? 'root key' : 'root key from X3DH', s.rk, i < r.length - 1 ? '.sg-l-gone' : '')); return; }
                L.appendChild(kdf('KDF', [h('span', { text: s.chain === 'send' ? 'new sending chain ' : 'new receiving chain ' }), code(s.ck)], '.sg-l-' + s.chain,
                    [h('span', { text: 'DH ' }), code(s.dh)]));
                L.appendChild(node('root key r' + i, s.rk, i < r.length - 1 ? '.sg-l-gone' : ''));
            });
            if (m.el.classList.contains('sg-jammed')) L.appendChild(kdf('KDF', [h('span', { text: 'Eve cannot go on' })], '.sg-l-bad', [h('span', { text: 'DH unknown' })]));
        } else {
            var chains = m.log[kind], c = null;
            for (var i = chains.length - 1; i >= 0 && !c; i--) if (!id || chains[i].steps.some(function (s) { return s.ev.id === id; })) c = chains[i];
            c = c || chains[chains.length - 1];
            this.title.textContent = who + ' ' + (kind === 'send' ? 'sending' : 'receiving') + ' chain (a symmetric ratchet)';
            if (!c) { L.appendChild(h('li.sg-l-none', { text: 'No chain yet.' })); return; }
            L.appendChild(node(c.stolen ? 'stolen chain key' : 'chain key from the root chain', c.ck, c.steps.length ? '.sg-l-gone' : ''));
            c.steps.forEach(function (s, j) {
                var chip = m.chips[s.ev.id], wait = chip && chip.classList.contains('sg-wait');
                var li = kdf('HMAC', [h('span', { text: 'message key ' + s.label + ' ' }), code(s.ev.mk), h('span.sg-l-state', { text: wait ? 'kept for a late message' : 'shredded after use' })],
                    wait ? '.sg-l-wait' : '.sg-l-gone');
                if (s.ev.id === id) li.classList.add('sg-l-focus');
                L.appendChild(li);
                L.appendChild(node('chain key', s.ev.ck, j < c.steps.length - 1 ? '.sg-l-gone' : ''));
            });
        }
        /* the newest step in view, or the key that was tapped */
        var f = L.querySelector('.sg-l-focus');
        if (f) L.scrollTop = f.offsetTop - L.offsetTop - L.clientHeight / 2;
        else L.scrollTop = L.scrollHeight;
    };
})(window.SG);
