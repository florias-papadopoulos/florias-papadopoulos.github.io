/* Signal in two browsers, part 3: drawing. One card per person (keys, chat, the box to write in) and the list of
   what travels on the wire. A key that changes keeps its old value next to it, struck through and fading: that is
   the ratchet deleting it. Used by both modes (30-local.js, 40-pair.js). */
(function (SG) {
    'use strict';
    var NAMES = { A: 'Alice', B: 'Bob' };
    SG.NAMES = NAMES;
    SG.MAX_TEXT = 300;

    /* h('p.sg-x', {text: 'Hi', onclick: f}, [children]) */
    SG.h = function (sel, props, kids) {
        var p = sel.split('.'), el = document.createElement(p[0] || 'div');
        if (p.length > 1) el.className = p.slice(1).join(' ');
        props = props || {};
        Object.keys(props).forEach(function (k) {
            var v = props[k];
            if (v === undefined || v === null || v === false) return;
            if (k === 'text') el.textContent = v;
            else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
            else if (k in el && typeof v !== 'string') el[k] = v;
            else el.setAttribute(k, v === true ? '' : v);
        });
        (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return el;
    };
    var h = SG.h;
    SG.later = function (ms, f) { return setTimeout(f, ms); };

    /* ---------- a person ---------- */
    /* opts: {side: 'A'|'B', me: true for the phone's own person, onSend(text)} */
    SG.Card = function (opts) {
        var self = this;
        this.side = opts.side;
        this.rows = {};
        this.keys = h('dl.sg-keys');
        this.chat = h('ol.sg-chat', { 'aria-live': 'polite' });
        this.input = h('input.sg-input', { type: 'text', maxlength: String(SG.MAX_TEXT), autocomplete: 'off', 'aria-label': 'Message from ' + NAMES[opts.side] });
        this.btn = h('button.sg-btn', { type: 'submit', text: 'Send' });
        this.form = h('form.sg-form', { onsubmit: function (e) {
            e.preventDefault();
            var t = self.input.value.trim();
            if (!t || self.btn.disabled) return;
            opts.onSend(t);
        } }, [this.input, this.btn]);
        this.el = h('section.sg-party.sg-' + opts.side, { 'aria-label': NAMES[opts.side] }, [
            h('h2.sg-name', { text: NAMES[opts.side] + (opts.me ? ' (this phone)' : '') }), this.keys, this.chat, this.form]);
        this.enable(false);
    };
    var C = SG.Card.prototype;
    C.enable = function (on, placeholder) {
        this.input.disabled = !on; this.btn.disabled = !on;
        this.input.placeholder = placeholder || (on ? 'Write a message' : '');
    };
    /* one key line: label, value (bytes or null), and an optional note after it; a changed value strikes the old one */
    C.key = function (id, label, bytes, note, cls) {
        var r = this.rows[id];
        if (!r) {
            r = this.rows[id] = { dd: h('dd'), val: null, dt: h('dt', { text: label }) };
            this.keys.appendChild(h('div.sg-k' + (cls ? '.' + cls : ''), { 'data-k': id }, [r.dt, r.dd]));
        }
        r.dt.textContent = label;
        var hex = bytes ? SG.short(bytes) : '', old = r.val;
        if (hex === old && r.note === note) return;
        r.dd.textContent = '';
        if (old && old !== hex) r.dd.appendChild(h('s.sg-old', { text: old, title: 'deleted' }));
        if (hex) r.dd.appendChild(h('code.sg-now' + (old && old !== hex ? '.sg-new' : ''), { text: hex, title: SG.hex(bytes) }));
        else if (!old && !note) r.dd.appendChild(h('span.sg-none', { text: 'none yet' }));
        if (note) r.dd.appendChild(h('span.sg-note', { text: note }));
        r.val = hex; r.note = note;
    };
    /* a key that is gone for good (a one-time prekey, an ephemeral key): struck through, no new value */
    C.drop = function (id) {
        var r = this.rows[id];
        if (!r || !r.val) return;
        r.dd.textContent = '';
        r.dd.appendChild(h('s.sg-old.sg-gone', { text: r.val, title: 'deleted' }));
        r.val = '';
    };
    C.removeKey = function (id) {
        var r = this.rows[id];
        if (r) { r.dt.parentNode.remove(); delete this.rows[id]; }
    };
    /* the ratchet's state: its own ratchet public key, the root key, the two chains */
    C.ratchet = function (v) {
        this.key('dh', 'Ratchet key', v.dh);
        this.key('rk', 'Root key', v.rk);
        this.key('cks', 'Sending chain', v.cks, v.cks ? 'next #' + v.ns : '');
        this.key('ckr', 'Receiving chain', v.ckr, v.ckr ? 'next #' + v.nr : '');
    };
    /* a message in the chat, with the message key used for it, which is deleted right after */
    C.msg = function (mine, text, mk) {
        var key = h('span.sg-mk', { title: mk ? SG.hex(mk) : '' }, ['key ', h('code', { text: mk ? SG.short(mk) : '' })]);
        var li = h('li.sg-msg.' + (mine ? 'sg-mine' : 'sg-theirs'), {}, [h('span.sg-text', { text: text }), key]);
        this.chat.appendChild(li);
        this.chat.scrollTop = this.chat.scrollHeight;
        SG.later(900, function () { key.classList.add('sg-del'); key.title = 'deleted'; });
        return li;
    };
    /* a thin line in the chat where the DH ratchet turned */
    C.turn = function () {
        this.chat.appendChild(h('li.sg-turn', { 'aria-label': 'new ratchet keys' }, [h('span', { text: 'new ratchet keys' })]));
    };
    C.note = function (text) {
        this.chat.appendChild(h('li.sg-turn.sg-quiet', {}, [h('span', { text: text })]));
    };

    /* ---------- the wire ---------- */
    /* opts: {eve: true to have Eve's column} */
    SG.Wire = function (opts) {
        this.eve = !!(opts && opts.eve);
        this.el = h('ol.sg-wire' + (this.eve ? '.sg-with-eve' : ''), { 'aria-live': 'polite' });
    };
    /* from: 'A' or 'B'; m: {h, ct}; step: a new ratchet key in its header. Returns the row (for Eve's column). */
    SG.Wire.prototype.add = function (from, m, step) {
        var to = from === 'A' ? 'B' : 'A';
        var row = h('li.sg-w.sg-from-' + from, {}, [
            h('span.sg-w-dir', { text: NAMES[from] + ' → ' + NAMES[to] }),
            h('span.sg-w-h' + (step ? '.sg-step-key' : ''), {}, ['ratchet ', h('code', { text: SG.short(m.h.dh), title: SG.hex(m.h.dh) }), ' #' + m.h.n]),
            h('span.sg-w-ct', {}, [h('code', { text: SG.short(m.ct, 6), title: SG.hex(m.ct) }), ' ' + m.ct.length + ' bytes'])
        ]);
        if (this.eve) { row.eve = h('span.sg-w-eve', { text: 'can’t read' }); row.appendChild(row.eve); }
        this.el.appendChild(row);
        this.el.scrollTop = this.el.scrollHeight;
        return row;
    };
    SG.Wire.prototype.mark = function (text) {
        this.el.appendChild(h('li.sg-w-mark', { text: text }));
        this.el.scrollTop = this.el.scrollHeight;
    };
    /* Eve's result on a row: the text she read, or null */
    SG.eveSays = function (row, text, why) {
        if (!row.eve) return;
        row.eve.textContent = text === null ? (why || 'can’t read') : 'reads “' + text + '”';
        row.eve.className = 'sg-w-eve' + (text === null ? '' : ' sg-read');
        row.classList.toggle('sg-leak', text !== null);
    };

    /* a one line instruction above the demo */
    SG.say = function (el, text, cls) { el.textContent = text; el.className = 'sg-say' + (cls ? ' ' + cls : ''); };
})(window.SG);
