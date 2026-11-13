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

    /* ---------- a person: name, chat, the box to write in, and a place for the gears ---------- */
    /* opts: {side: 'A'|'B', me: true for the phone's own person, hold: offer "deliver later", onSend(text, later)} */
    SG.Card = function (opts) {
        var self = this;
        this.side = opts.side;
        this.chat = h('ol.sg-chat', { 'aria-live': 'polite' });
        this.input = h('input.sg-input', { type: 'text', maxlength: String(SG.MAX_TEXT), autocomplete: 'off', 'aria-label': 'Message from ' + NAMES[opts.side] });
        this.btn = h('button.sg-btn', { type: 'submit', text: 'Send' });
        this.hold = opts.hold ? h('input', { type: 'checkbox' }) : null;
        this.form = h('form.sg-form', { onsubmit: function (e) {
            e.preventDefault();
            var t = self.input.value.trim();
            if (!t || self.btn.disabled) return;
            opts.onSend(t, !!(self.hold && self.hold.checked));
        } }, [this.input, this.btn]);
        this.slot = h('div.sg-slot');
        this.el = h('section.sg-party.sg-' + opts.side, { 'aria-label': NAMES[opts.side] }, [
            h('h2.sg-name', { text: NAMES[opts.side] + (opts.me ? ' (this phone)' : '') }), this.chat, this.form,
            this.hold ? h('label.sg-hold', {}, [this.hold, ' deliver this one later']) : null, this.slot]);
        this.enable(false);
    };
    var C = SG.Card.prototype;
    C.enable = function (on, placeholder) {
        this.input.disabled = !on; this.btn.disabled = !on;
        if (this.hold) this.hold.disabled = !on;
        this.input.placeholder = placeholder || (on ? 'Write a message' : '');
    };
    /* a message in the chat, with the name of its message key (a1, b2, ...) */
    C.msg = function (mine, text, label) {
        var key = h('span.sg-mk', {}, [h('b', { text: label || '' })]);
        var li = h('li.sg-msg.' + (mine ? 'sg-mine' : 'sg-theirs'), {}, [h('span.sg-text', { text: text }), key]);
        li.key = key;
        this.chat.appendChild(li);
        this.chat.scrollTop = this.chat.scrollHeight;
        return li;
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
    /* from: 'A' or 'B'; m: {h, ct}; step: a new ratchet key in its header; label: its key's name (a1, ...).
       Returns the row (for Eve's column). */
    SG.Wire.prototype.add = function (from, m, step, label) {
        var to = from === 'A' ? 'B' : 'A';
        var row = h('li.sg-w.sg-from-' + from, {}, [
            h('span.sg-w-dir', {}, [NAMES[from] + ' → ' + NAMES[to] + ' ', label ? h('b.sg-w-label', { text: label }) : null]),
            h('span.sg-w-h' + (step ? '.sg-step-key' : ''), {}, ['ratchet ', h('code', { text: SG.short(m.h.dh), title: SG.hex(m.h.dh) }), ' #' + m.h.n]),
            h('span.sg-w-ct', {}, [h('code', { text: SG.short(m.ct, 6), title: SG.hex(m.ct) }), ' ' + m.ct.length + ' bytes'])
        ]);
        if (this.eve) { row.eve = h('span.sg-w-eve', { text: 'can’t read' }); row.appendChild(row.eve); }
        this.el.appendChild(row);
        this.el.scrollTop = this.el.scrollHeight;
        return row;
    };
    /* a message held back: a button to deliver it later */
    SG.Wire.prototype.hold = function (row, fn) {
        var b = h('button.sg-btn.sg-small', { type: 'button', text: 'Deliver now', onclick: function () {
            if (b.disabled) return;
            b.remove(); row.classList.remove('sg-held'); fn();
        } });
        row.classList.add('sg-held');
        row.insertBefore(b, row.eve || null);
        return b;
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
