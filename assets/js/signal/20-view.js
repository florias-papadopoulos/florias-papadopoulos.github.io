/* Signal's Double Ratchet, part 3: drawing. One card per person (name, chat, the box to write in, a slot for the
   gears) and the list of what travels on the wire. Every key on the page is the same chip: the first 6 hex digits in
   monospace, the whole value in its title (SG.hexCode). Each person has one colour, used for the bubbles they write,
   the keys of their sending chain (a1, a2 ... Alice; b1, b2 ... Bob) and their rows on the wire. Used by
   30-local.js. */
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
    /* a key as a chip: 6 hex digits, the full value in the title and in data-hex (Eve's outline finds it there) */
    SG.hexCode = function (bytes, cls) {
        if (!bytes) return h('code.sg-hex' + (cls || ''), { text: '?' });
        var x = SG.hex(bytes);
        return h('code.sg-hex' + (cls || ''), { text: x.slice(0, 6), title: x, 'data-hex': x });
    };

    /* ---------- a person: name, chat, the box to write in, and a place for the gears ---------- */
    /* opts: {side: 'A'|'B', hold: offer "deliver later", onSend(text, later)} */
    SG.Card = function (opts) {
        var self = this;
        this.side = opts.side;
        this.other = opts.side === 'A' ? 'B' : 'A';
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
        this.el = h('section.sg-party.sg-p' + opts.side, { 'aria-label': NAMES[opts.side] }, [
            h('h2.sg-name', { text: NAMES[opts.side] }),
            this.chat, this.form,
            this.hold ? h('label.sg-hold', {}, [this.hold, ' Deliver this one later']) : null, this.slot]);
        this.enable(false);
    };
    var C = SG.Card.prototype;
    C.enable = function (on, placeholder) {
        this.input.disabled = !on; this.btn.disabled = !on;
        if (this.hold) this.hold.disabled = !on;
        this.input.placeholder = placeholder || (on ? 'Write a message' : '');
    };
    /* a message in the chat, in its writer's colour, with the name of its message key (a1, b2, ...) */
    C.msg = function (mine, text, label) {
        var key = h('b.sg-mk', { text: label || '' });
        var li = h('li.sg-msg.' + (mine ? 'sg-mine' : 'sg-theirs') + '.sg-by' + (mine ? this.side : this.other), {}, [h('span.sg-text', { text: text }), key]);
        li.key = key;
        this.chat.appendChild(li);
        this.chat.scrollTop = this.chat.scrollHeight;
        return li;
    };
    C.note = function (text) {
        this.chat.appendChild(h('li.sg-turn', {}, [h('span', { text: text })]));
    };

    /* ---------- the wire ---------- */
    /* each row: who to whom, its key's name, the ratchet key and number in its header, its size, and what Eve
       makes of it */
    SG.Wire = function () {
        this.el = h('ol.sg-wire', { 'aria-live': 'polite' });
    };
    /* from: 'A' or 'B'; m: {h, ct}; step: a new ratchet key in its header; label: its key's name (a1, ...).
       Returns the row (for Eve's column). */
    SG.Wire.prototype.add = function (from, m, step, label) {
        var to = from === 'A' ? 'B' : 'A';
        var row = h('li.sg-w.sg-by' + from, {}, [
            h('span.sg-w-dir', {}, [h('span.sg-w-who', { text: NAMES[from] + ' → ' + NAMES[to] }), label ? h('b.sg-mk', { text: label }) : null]),
            h('span.sg-w-h' + (step ? '.sg-step-key' : ''), { title: step ? 'a new ratchet key' : null }, ['key ', SG.hexCode(m.h.dh), ' #' + m.h.n]),
            h('span.sg-w-ct', { title: SG.hex(m.ct) }, [m.ct.length + ' bytes'])
        ]);
        row.eve = h('span.sg-w-eve', { text: 'can’t read' });
        row.appendChild(row.eve);
        this.el.appendChild(row);
        this.el.scrollTop = this.el.scrollHeight;
        return row;
    };
    /* a message held back: a button to deliver it later */
    SG.Wire.prototype.hold = function (row, fn) {
        var b = h('button.sg-btn.sg-small', { type: 'button', text: 'Deliver now', onclick: function () {
            if (b.disabled || fn() === false) return;
            b.remove(); row.classList.remove('sg-held');
        } });
        row.classList.add('sg-held');
        row.appendChild(b);
        return b;
    };
    SG.Wire.prototype.mark = function (text) {
        this.el.appendChild(h('li.sg-w-mark', { text: text }));
        this.el.scrollTop = this.el.scrollHeight;
    };
    /* Eve's result on a row: the text she read, or null */
    SG.eveSays = function (row, text, why) {
        row.eve.textContent = text === null ? (why || 'can’t read') : 'reads “' + text + '”';
        row.eve.className = 'sg-w-eve' + (text === null ? '' : ' sg-read');
        row.classList.toggle('sg-leak', text !== null);
    };

    /* a one line caption (cls: 'sg-good' or 'sg-bad'); the element keeps its own classes */
    SG.say = function (el, text, cls) {
        el.textContent = text;
        el.classList.remove('sg-good', 'sg-bad');
        if (!el.className) el.className = 'sg-say';
        if (cls) el.classList.add(cls);
    };
})(window.SG);
