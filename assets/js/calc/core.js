/* Toolbox core (assets/js/calc/README.md documents the whole API). Joined at build time with lib/*.js, the page's
   tool file and boot.js into one script per tool page (layouts/toolbox/single.html).

   Two halves:
   - the engine, which also runs in node for the tests (assets/js/calc/test/run.js): Calc.tool() to register a tool,
     Calc.int() / Calc.list() to read whole numbers of any size (BigInt) from expressions like 2^127-1, and the
     recorder S that a tool's run(v, S) fills with a result and the steps of the procedure;
   - the page: builds the form from the tool's inputs, runs it, draws the result and the steps (math with KaTeX),
     keeps the inputs in the address so a link reproduces the calculation, and offers Stop for long work.
   Rich text: in every string a tool gives to S (step text, table cells, result lines), $...$ is math (TeX) and the
   rest is plain text. Text that comes from the visitor goes through Calc.esc() (plain text) or Calc.tt() (inside
   math), so a $ or a backslash typed by someone never turns into math. Nothing is ever inserted as HTML. */
(function (G) {
    'use strict';
    var Calc = G.Calc = G.Calc || {};
    Calc.tools = {};
    Calc.lib = Calc.lib || {};

    /* ---------- registering a tool ---------- */
    Calc.tool = function (def) {
        if (!def || !def.id || typeof def.run !== 'function') throw new Error('Calc.tool needs an id and a run function');
        def.inputs = def.inputs || [];
        def.examples = def.examples || [];
        Calc.tools[def.id] = def;
        return def;
    };

    /* ---------- errors ---------- */
    /* Calc.fail('message'): a mistake in the input, shown to the visitor as it is. Any other exception is a bug. */
    function UserError(msg, field) { this.message = msg; this.field = field || null; }
    UserError.prototype = Object.create(Error.prototype);
    UserError.prototype.name = 'UserError';
    Calc.UserError = UserError;
    Calc.fail = function (msg, field) { throw new UserError(msg, field); };
    function Stopped() { this.message = 'Stopped'; }
    Stopped.prototype = Object.create(Error.prototype);
    Calc.Stopped = Stopped;

    /* ---------- text helpers ---------- */
    /* plain text for a rich string: $ and \ lose their meaning */
    Calc.esc = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/\$/g, '\\$'); };
    /* text inside math: \text{...} with TeX's special characters escaped */
    var TT = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&', '#': '\\#', '^': '\\textasciicircum{}', '_': '\\_', '%': '\\%', '~': '\\textasciitilde{}' };
    Calc.tt = function (s) { return '\\text{' + String(s).replace(/[\\{}$&#^_%~]/g, function (c) { return TT[c]; }) + '}'; };
    /* a whole number for display; long ones are grouped in threes inside math (\, is a thin space) */
    Calc.fmt = function (n) { return String(n); };
    Calc.tex = function (n) {
        var s = String(n), neg = s.charAt(0) === '-';
        if (neg) s = s.slice(1);
        if (s.length > 6 && s.length <= 60 && /^\d+$/.test(s)) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
        return (neg ? '-' : '') + s;
    };
    /* split a rich string into [{m: false, v: 'text'}, {m: true, v: 'tex'}] */
    Calc.rich = function (s) {
        s = s == null ? '' : String(s);
        var out = [], cur = '', math = false;
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i);
            if (c === '\\' && i + 1 < s.length) {
                var d = s.charAt(i + 1);
                if (math) { cur += c + d; i++; continue; }
                if (d === '$' || d === '\\') { cur += d; i++; continue; }
                cur += c;
                continue;
            }
            if (c === '$') {
                if (cur) out.push({ m: math, v: cur });
                cur = '';
                math = !math;
                continue;
            }
            cur += c;
        }
        if (cur) out.push({ m: math, v: cur });
        return out;
    };
    /* the plain-text version of a rich string (for copying and for tests) */
    Calc.plain = function (s) { return Calc.rich(s).map(function (p) { return p.v; }).join(''); };

    /* ---------- whole numbers of any size: Calc.int('2^127 - 1') ---------- */
    var MAX_BITS = 200000;        // results above this many bits are refused (keeps the page responsive)
    function bits(n) { if (n < 0n) n = -n; return n === 0n ? 0 : n.toString(2).length; }
    function big(n, what) { if (bits(n) > MAX_BITS) Calc.fail((what || 'A number') + ' is too large (over ' + MAX_BITS + ' bits).'); return n; }
    function parseExpr(src) {
        var s = String(src).replace(/[−–—]/g, '-').replace(/[×⋅·]/g, '*').replace(/\*\*/g, '^').replace(/ /g, ' ');
        var i = 0;
        function ws() { while (i < s.length && /\s/.test(s.charAt(i))) i++; }
        function peek() { ws(); return s.charAt(i); }
        function expect(c) { if (peek() !== c) Calc.fail('Expected "' + c + '" at position ' + (i + 1) + '.'); i++; }
        function number() {
            ws();
            var m = /^0x[0-9a-f]+|^0b[01]+|^0o[0-7]+|^\d[\d_]*(?:e\d+)?/i.exec(s.slice(i));
            if (!m) {
                if (i >= s.length) Calc.fail('The expression ends too early.');
                Calc.fail('Unexpected "' + s.charAt(i) + '" at position ' + (i + 1) + '.');
            }
            i += m[0].length;
            var t = m[0].replace(/_/g, '').toLowerCase();
            if (/^0[xbo]/.test(t)) return BigInt(t);
            var e = t.indexOf('e');
            if (e < 0) return BigInt(t);
            var exp = parseInt(t.slice(e + 1), 10);
            if (exp > 60000) Calc.fail('That power of ten is too large.');
            return BigInt(t.slice(0, e)) * (10n ** BigInt(exp));
        }
        var FUN = {
            gcd: function (a) { return a.reduce(function (x, y) { x = x < 0n ? -x : x; y = y < 0n ? -y : y; while (y) { var t = x % y; x = y; y = t; } return x; }); },
            lcm: function (a) { return a.reduce(function (x, y) { if (!x || !y) return 0n; var g = FUN.gcd([x, y]); var l = x / g * y; return l < 0n ? -l : l; }); },
            abs: function (a) { if (a.length !== 1) Calc.fail('abs takes one number.'); return a[0] < 0n ? -a[0] : a[0]; },
            min: function (a) { return a.reduce(function (x, y) { return y < x ? y : x; }); },
            max: function (a) { return a.reduce(function (x, y) { return y > x ? y : x; }); }
        };
        function primary() {
            var c = peek();
            if (c === '(') { i++; var v = expr(); expect(')'); return v; }
            var m = /^[a-z]+/i.exec(s.slice(i));
            if (m) {
                var f = FUN[m[0].toLowerCase()];
                if (!f) Calc.fail('Unknown name "' + m[0] + '". Use numbers, + - * / % ^ ! and gcd, lcm, abs, min, max.');
                i += m[0].length;
                expect('(');
                var args = [expr()];
                while (peek() === ',') { i++; args.push(expr()); }
                expect(')');
                return f(args);
            }
            return number();
        }
        function postfix() {
            var v = primary();
            while (peek() === '!') {
                i++;
                if (v < 0n) Calc.fail('Factorial needs a number that is not negative.');
                if (v > 20000n) Calc.fail('That factorial is too large.');
                var r = 1n;
                for (var k = 2n; k <= v; k++) r *= k;
                v = r;
            }
            return v;
        }
        function power() {
            var b = postfix();
            if (peek() === '^') {
                i++;
                var e = unary();
                if (e < 0n) Calc.fail('Negative powers are not whole numbers (for a modular inverse use the inverse tool).');
                if (b === 0n || b === 1n || b === -1n) return e === 0n ? 1n : (b === -1n && e % 2n === 0n ? 1n : b);
                if (BigInt(bits(b)) * e > BigInt(MAX_BITS)) Calc.fail('That power is too large (over ' + MAX_BITS + ' bits).');
                return b ** e;
            }
            return b;
        }
        function unary() {
            var c = peek();
            if (c === '-') { i++; return -unary(); }
            if (c === '+') { i++; return unary(); }
            return power();
        }
        function term() {
            var v = unary();
            for (;;) {
                var c = peek();
                if (c === '*') { i++; v = big(v * unary()); }
                else if (c === '/') {
                    i++;
                    var d = unary();
                    if (d === 0n) Calc.fail('Division by zero.');
                    if (v % d !== 0n) Calc.fail('"/" must divide exactly here (' + v + ' / ' + d + ' is not a whole number).');
                    v = v / d;
                } else if (c === '%') {
                    i++;
                    var n = unary();
                    if (n === 0n) Calc.fail('Modulo zero is not defined.');
                    var r = v % n;
                    if (r < 0n) r += n < 0n ? -n : n;
                    v = r;
                } else return v;
            }
        }
        function expr() {
            var v = term();
            for (;;) {
                var c = peek();
                if (c === '+') { i++; v = v + term(); }
                else if (c === '-') { i++; v = v - term(); }
                else return v;
            }
        }
        if (!s.trim()) Calc.fail('Please enter a number.');
        var v = expr();
        if (peek() !== '') Calc.fail('Unexpected "' + s.charAt(i) + '" at position ' + (i + 1) + '.');
        return big(v);
    }
    /* Calc.int(text) -> BigInt; Calc.list(text) -> [BigInt] (separated by commas, semicolons or new lines; when there
       are none of those, by spaces) */
    Calc.int = parseExpr;
    Calc.list = function (src) {
        var s = String(src).trim();
        if (!s) return [];
        var parts = /[,;\n]/.test(s) ? s.split(/[,;\n]+/) : s.split(/\s+/);
        return parts.map(function (p) { return p.trim(); }).filter(Boolean).map(parseExpr);
    };

    /* ---------- the recorder a tool's run(v, S) fills ---------- */
    function Step(title) { this.title = title || ''; this.blocks = []; }
    Step.prototype = {
        /* a paragraph of rich text */
        p: function (s) { this.blocks.push({ t: 'p', v: String(s) }); return this; },
        /* a displayed formula (TeX) */
        math: function (tex) { this.blocks.push({ t: 'math', v: String(tex) }); return this; },
        /* several displayed formula lines, aligned at & (TeX aligned) */
        lines: function (rows) { this.blocks.push({ t: 'math', v: '\\begin{aligned}' + rows.join('\\\\') + '\\end{aligned}' }); return this; },
        /* a table: head is a list of rich strings, rows a list of lists of cells (rich strings, numbers or BigInt, or
           {v: cell, hl: true} to highlight one). opts: {max: rows shown before "Show all" (default 40), hl: index of a
           row to highlight, mono: true for monospaced cells, caption: rich text above, align: ['l', 'r', 'c', ...] per
           column (default: first column left, the others right)} */
        table: function (head, rows, opts) { this.blocks.push({ t: 'table', head: head || [], rows: rows || [], o: opts || {} }); return this; },
        /* preformatted text (monospace, kept as typed) */
        pre: function (s) { this.blocks.push({ t: 'pre', v: String(s) }); return this; },
        /* a check: ok true shows a tick, false a cross */
        check: function (ok, s) { this.blocks.push({ t: 'check', ok: !!ok, v: String(s) }); return this; },
        /* a bulleted list of rich strings */
        list: function (items) { this.blocks.push({ t: 'list', v: items.map(String) }); return this; }
    };
    function Recorder() {
        this.res = null;     // {lines: [rich], copy: 'text'}
        this.notes = [];     // rich strings shown under the result
        this.steps = [];
        this._cur = null;
        this._stop = false;
        this._last = Date.now();
    }
    Recorder.prototype = {
        /* the answer: one rich string or a list of lines; opts.copy is the plain text the Copy button copies (by
           default the plain text of the lines). opts.label replaces the word "Result". */
        result: function (lines, opts) {
            lines = Array.isArray(lines) ? lines.map(String) : [String(lines)];
            opts = opts || {};
            this.res = { lines: lines, copy: opts.copy != null ? String(opts.copy) : lines.map(Calc.plain).join('\n'), label: opts.label || '' };
            return this;
        },
        note: function (s) { this.notes.push(String(s)); return this; },
        step: function (title) { this._cur = new Step(title); this.steps.push(this._cur); return this._cur; },
        /* shortcuts that add to the current step (a step without a title is made when there is none) */
        p: function (s) { return this._here().p(s); },
        math: function (t) { return this._here().math(t); },
        table: function (h, r, o) { return this._here().table(h, r, o); },
        _here: function () { return this._cur || this.step(''); },
        /* in long loops: if (i % 1000 === 0) await S.tick();  lets the page breathe and Stop work */
        tick: function () {
            if (this._stop) return Promise.reject(new Stopped());
            var now = Date.now();
            if (now - this._last < 30) return null;
            this._last = now;
            var self = this;
            return new Promise(function (r) { setTimeout(r, 0); }).then(function () { if (self._stop) throw new Stopped(); });
        }
    };
    Calc.Recorder = Recorder;

    /* ---------- reading the inputs ---------- */
    /* raw: {id: 'text as typed' or boolean}. Returns {values, errors: {id: message}} */
    Calc.readInputs = function (def, raw0) {
        var v = {}, errors = {}, raw = {};
        /* a field left out (tests, old links) gets its default, as on the page */
        def.inputs.forEach(function (f) { raw[f.id] = raw0[f.id] === undefined && f.value != null ? f.value : raw0[f.id]; });
        Object.keys(raw0).forEach(function (k) { if (!(k in raw)) raw[k] = raw0[k]; });
        def.inputs.forEach(function (f) {
            if (f.when && !Object.keys(f.when).every(function (k) { var w = f.when[k]; return Array.isArray(w) ? w.indexOf(raw[k]) >= 0 : raw[k] === w; })) return;
            var r = raw[f.id];
            try {
                switch (f.type || 'int') {
                    case 'int': {
                        if (f.optional && (r == null || !String(r).trim())) { v[f.id] = null; break; }
                        var n = parseExpr(r == null ? '' : r);
                        if (f.min != null && n < BigInt(f.min)) Calc.fail('Must be at least ' + f.min + '.');
                        if (f.max != null && n > BigInt(f.max)) Calc.fail('Must be at most ' + f.max + '.');
                        v[f.id] = n;
                        break;
                    }
                    case 'list': {
                        var l = Calc.list(r || '');
                        if (!l.length && !f.optional) Calc.fail('Please enter at least one number.');
                        v[f.id] = l;
                        break;
                    }
                    case 'num': {
                        var t = String(r == null ? '' : r).trim().replace(',', '.');
                        var x = Number(t);
                        if (!t || !isFinite(x)) Calc.fail('Please enter a number.');
                        v[f.id] = x;
                        break;
                    }
                    case 'check': v[f.id] = r === true || r === 1 || r === '1' || r === 'true' || r === 'on'; break;
                    case 'select': {
                        var ok = (f.options || []).some(function (o) { return String(o[0]) === String(r); });
                        v[f.id] = ok ? String(r) : String(f.value != null ? f.value : (f.options[0] || [''])[0]);
                        break;
                    }
                    default: {   // text, textarea
                        var str = r == null ? '' : String(r);
                        if (!str.trim() && !f.optional) Calc.fail('Please enter some text.');
                        if (f.maxLength && str.length > f.maxLength) Calc.fail('At most ' + f.maxLength + ' characters.');
                        v[f.id] = str;
                    }
                }
            } catch (e) {
                if (e instanceof UserError) errors[f.id] = e.message;
                else throw e;
            }
        });
        return { values: v, errors: errors };
    };

    /* Run a tool on raw inputs, without any page (used by the tests and by the page). Resolves to
       {S, errors} where errors is {id: message} for bad fields, or {_: message} for a Calc.fail inside run. */
    Calc.run = function (def, raw, action, S) {
        S = S || new Recorder();
        var r = Calc.readInputs(def, raw);
        if (Object.keys(r.errors).length) return Promise.resolve({ S: S, errors: r.errors });
        r.values._action = action || (def.actions && def.actions.length ? def.actions[0].id : 'run');
        return Promise.resolve().then(function () { return def.run(r.values, S); }).then(function () {
            return { S: S, errors: null };
        }, function (e) {
            if (e instanceof UserError) { var o = {}; o[e.field || '_'] = e.message; return { S: S, errors: o }; }
            throw e;
        });
    };

    if (typeof document === 'undefined') return;   // node (tests): the engine is all

    /* ======================================================================================================
       The page
       ====================================================================================================== */
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function texInto(node, tex, display) {
        if (G.katex) {
            try { G.katex.render(tex, node, { throwOnError: false, displayMode: !!display, strict: 'ignore', maxExpand: 20000 }); return node; }
            catch (e) { /* shown as plain text below */ }
        }
        node.textContent = tex;
        return node;
    }
    /* a rich string into a node: text as text, $...$ as KaTeX */
    function richInto(node, s) {
        Calc.rich(s).forEach(function (p) {
            if (p.m) node.appendChild(texInto(el('span', 'tb-m'), p.v, false));
            else node.appendChild(document.createTextNode(p.v));
        });
        return node;
    }
    Calc.richInto = richInto;

    function cellNode(tag, c) {
        var td = el(tag);
        if (c && typeof c === 'object' && !(typeof c === 'bigint') && 'v' in c) {
            if (c.hl) td.className = 'is-hl';
            c = c.v;
        }
        richInto(td, c == null ? '' : String(c));
        return td;
    }
    function tableNode(b) {
        var wrap = el('div', 'tb-table-wrap'), o = b.o, max = o.max || 40;
        if (o.caption) wrap.appendChild(richInto(el('p', 'tb-cap'), o.caption));
        var t = el('table', 'tb-table' + (o.mono ? ' is-mono' : ''));
        if (b.head.length) {
            var tr = el('tr');
            b.head.forEach(function (h, j) { var th0 = cellNode('th', h); if (o.align && o.align[j]) th0.style.textAlign = o.align[j] === 'l' ? 'left' : o.align[j] === 'c' ? 'center' : 'right'; tr.appendChild(th0); });
            var th = el('thead');
            th.appendChild(tr);
            t.appendChild(th);
        }
        var body = el('tbody');
        function aligned(td, j) { var a = o.align && o.align[j]; if (a) td.style.textAlign = a === 'l' ? 'left' : a === 'c' ? 'center' : 'right'; return td; }
        function row(r, i) {
            var tr = el('tr');
            if (o.hl === i) tr.className = 'is-hl';
            r.forEach(function (c, j) { tr.appendChild(aligned(cellNode('td', c), j)); });
            return tr;
        }
        var n = b.rows.length;
        if (n > max) {
            var head = Math.ceil(max * 0.6), tail = max - head;
            for (var i = 0; i < head; i++) body.appendChild(row(b.rows[i], i));
            var gap = el('tr', 'tb-gap'), td = el('td');
            td.colSpan = Math.max(1, b.head.length || (b.rows[0] || []).length);
            var btn = el('button', 'tb-more', 'Show all ' + n + ' rows (' + (n - max) + ' hidden)');
            btn.type = 'button';
            btn.addEventListener('click', function () {
                var frag = document.createDocumentFragment();
                for (var j = head; j < n - tail; j++) frag.appendChild(row(b.rows[j], j));
                body.replaceChild(frag, gap);
            });
            td.appendChild(btn);
            gap.appendChild(td);
            body.appendChild(gap);
            for (var k = n - tail; k < n; k++) body.appendChild(row(b.rows[k], k));
        } else b.rows.forEach(function (r, i) { body.appendChild(row(r, i)); });
        t.appendChild(body);
        wrap.appendChild(t);
        return wrap;
    }
    function blockNode(b) {
        switch (b.t) {
            case 'p': return richInto(el('p', 'tb-p'), b.v);
            case 'math': { var d = el('div', 'tb-display'); return texInto(d, b.v, true); }
            case 'table': return tableNode(b);
            case 'pre': return el('pre', 'tb-pre', b.v);
            case 'check': {
                var p = el('p', 'tb-check ' + (b.ok ? 'is-ok' : 'is-bad'));
                p.appendChild(el('span', 'tb-check-mark', b.ok ? '✓' : '✗'));
                return richInto(p, b.v);
            }
            case 'list': {
                var ul = el('ul', 'tb-list');
                b.v.forEach(function (s) { ul.appendChild(richInto(el('li'), s)); });
                return ul;
            }
        }
        return el('div');
    }

    var MAX_STEPS = 120;
    function render(S, box) {
        box.result.textContent = '';
        box.steps.textContent = '';
        if (S.res) {
            var r = el('div', 'tb-result');
            var head = el('div', 'tb-result-head');
            head.appendChild(el('span', 'tb-result-label', S.res.label || 'Result'));
            var copy = el('button', 'tb-copy', 'Copy');
            copy.type = 'button';
            copy.addEventListener('click', function () { copyText(S.res.copy, copy); });
            head.appendChild(copy);
            r.appendChild(head);
            S.res.lines.forEach(function (l) { r.appendChild(richInto(el('div', 'tb-result-line'), l)); });
            S.notes.forEach(function (n) { r.appendChild(richInto(el('p', 'tb-note'), n)); });
            box.result.appendChild(r);
        }
        box.procWrap.hidden = !S.steps.length;
        var ol = el('ol', 'tb-steps');
        function stepNode(s) {
            var li = el('li', 'tb-step');
            if (s.title) li.appendChild(richInto(el('h3', 'tb-step-title'), s.title));
            s.blocks.forEach(function (b) { li.appendChild(blockNode(b)); });
            return li;
        }
        var n = S.steps.length;
        S.steps.slice(0, Math.min(n, MAX_STEPS)).forEach(function (s) { ol.appendChild(stepNode(s)); });
        box.steps.appendChild(ol);
        if (n > MAX_STEPS) {
            var more = el('button', 'tb-more', 'Show the other ' + (n - MAX_STEPS) + ' steps');
            more.type = 'button';
            more.addEventListener('click', function () {
                S.steps.slice(MAX_STEPS).forEach(function (s) { ol.appendChild(stepNode(s)); });
                more.remove();
            });
            box.steps.appendChild(more);
        }
    }
    function copyText(text, btn) {
        function done(ok) { btn.textContent = ok ? 'Copied' : 'Copy failed'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        else {
            var ta = el('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { /* no */ }
            ta.remove();
            done(ok);
        }
    }

    /* ---------- the form ---------- */
    function buildForm(def, form) {
        var fields = {}, grid = el('div', 'tb-fields');
        def.inputs.forEach(function (f) {
            var type = f.type || 'int', id = 'tb-in-' + f.id;
            var wrap = el('div', 'tb-field tb-w-' + (f.width || (type === 'textarea' ? 'full' : type === 'check' ? 'auto' : 'm')) + ' tb-t-' + type);
            var input;
            if (type === 'check') {
                var lab = el('label', 'tb-check-label');
                input = el('input');
                input.type = 'checkbox';
                input.id = id;
                input.checked = !!f.value;
                lab.appendChild(input);
                lab.appendChild(document.createTextNode(' ' + f.label));
                wrap.appendChild(lab);
            } else {
                var label = el('label', 'tb-label');
                label.htmlFor = id;
                richInto(label, f.label || f.id);
                wrap.appendChild(label);
                if (type === 'select') {
                    input = el('select');
                    (f.options || []).forEach(function (o) {
                        var op = el('option', null, o[1] != null ? o[1] : o[0]);
                        op.value = o[0];
                        input.appendChild(op);
                    });
                    if (f.value != null) input.value = f.value;
                } else if (type === 'textarea') {
                    input = el('textarea');
                    input.rows = f.rows || 4;
                    input.spellcheck = false;
                } else {
                    input = el('input');
                    input.type = 'text';
                    input.spellcheck = false;
                    input.autocomplete = 'off';
                    if (type === 'int' || type === 'list' || type === 'num') input.inputMode = f.inputMode || 'text';
                }
                input.id = id;
                if (f.placeholder) input.placeholder = f.placeholder;
                if (f.value != null && type !== 'select') input.value = f.value;
                wrap.appendChild(input);
            }
            if (f.help) wrap.appendChild(richInto(el('small', 'tb-help'), f.help));
            var err = el('span', 'tb-ferr');
            err.setAttribute('role', 'alert');
            wrap.appendChild(err);
            grid.appendChild(wrap);
            fields[f.id] = { f: f, input: input, wrap: wrap, err: err };
        });
        form.appendChild(grid);
        return fields;
    }
    function rawValues(fields) {
        var raw = {};
        Object.keys(fields).forEach(function (k) {
            var x = fields[k];
            raw[k] = x.f.type === 'check' ? x.input.checked : x.input.value;
        });
        return raw;
    }
    function applyWhen(def, fields) {
        var raw = rawValues(fields);
        def.inputs.forEach(function (f) {
            if (!f.when) return;
            var on = Object.keys(f.when).every(function (k) { var w = f.when[k]; return Array.isArray(w) ? w.indexOf(raw[k]) >= 0 : raw[k] === w; });
            fields[f.id].wrap.hidden = !on;
        });
    }
    function fill(fields, vals) {
        Object.keys(vals).forEach(function (k) {
            var x = fields[k];
            if (!x) return;
            if (x.f.type === 'check') x.input.checked = vals[k] === true || vals[k] === '1' || vals[k] === 'true';
            else x.input.value = vals[k];
        });
    }

    /* ---------- mounting the page ---------- */
    Calc.mount = function () {
        var root = document.getElementById('tb-tool');
        if (!root) return;
        var def = Calc.tools[root.getAttribute('data-tool')];
        var form = document.getElementById('tb-form');
        var box = { result: document.getElementById('tb-result'), steps: document.getElementById('tb-steps'), procWrap: document.getElementById('tb-proc') };
        if (!def) { box.result.appendChild(el('p', 'tb-error', 'This tool is not ready yet.')); return; }
        var fields = buildForm(def, form);
        var bar = el('div', 'tb-actions');
        var actions = def.actions && def.actions.length ? def.actions : [{ id: 'run', label: def.button || 'Calculate' }];
        var lastAction = actions[0].id;
        actions.forEach(function (a, i) {
            var b = el('button', 'tb-btn' + (i === 0 ? ' is-primary' : ''), a.label);
            b.type = i === 0 ? 'submit' : 'button';
            b.setAttribute('data-action', a.id);
            if (i > 0) b.addEventListener('click', function () { go(a.id, true); });
            bar.appendChild(b);
        });
        var exi = 0;
        if (def.examples.length) {
            var ex = el('button', 'tb-btn is-quiet', def.examples.length > 1 ? 'Another example' : 'Example');
            ex.type = 'button';
            ex.addEventListener('click', function () {
                exi = (exi + 1) % def.examples.length;
                var e = def.examples[exi];
                fill(fields, e);
                applyWhen(def, fields);
                go(e._action || actions[0].id, true);
            });
            bar.appendChild(ex);
        }
        var status = el('span', 'tb-status');
        status.setAttribute('role', 'status');
        var stop = el('button', 'tb-btn is-quiet tb-stop', 'Stop');
        stop.type = 'button';
        stop.hidden = true;
        bar.appendChild(status);
        bar.appendChild(stop);
        form.appendChild(bar);

        var running = null, seq = 0;
        stop.addEventListener('click', function () { if (running) running._stop = true; });
        function clearErrors() { Object.keys(fields).forEach(function (k) { fields[k].err.textContent = ''; fields[k].wrap.classList.remove('is-bad'); }); }
        function showError(msg) {
            box.result.textContent = '';
            box.steps.textContent = '';
            box.procWrap.hidden = true;
            box.result.appendChild(richInto(el('p', 'tb-error'), msg));
        }
        function remember(raw, action) {
            if (!G.history || !history.replaceState) return;
            var q = [];
            def.inputs.forEach(function (f) {
                if (fields[f.id].wrap.hidden) return;
                var v = raw[f.id];
                if (f.type === 'check') { if (v) q.push(encodeURIComponent(f.id) + '=1'); return; }
                if (v !== '' && v != null) q.push(encodeURIComponent(f.id) + '=' + encodeURIComponent(v));
            });
            if (actions.length > 1) q.push('do=' + encodeURIComponent(action));
            var url = location.pathname + (q.length ? '?' + q.join('&') : '') + location.hash;
            if (url.length < 3000) history.replaceState(null, '', url);
        }
        function go(action, user) {
            lastAction = action || lastAction;
            clearErrors();
            var raw = rawValues(fields), my = ++seq;
            if (running) running._stop = true;
            var S = new Recorder();
            running = S;
            var slow = setTimeout(function () { if (running === S) { status.textContent = 'Working…'; stop.hidden = false; } }, 300);
            root.classList.add('is-busy');
            Calc.run(def, raw, lastAction, S).then(function (out) {
                if (my !== seq) return;
                if (out.errors) {
                    var general = [];
                    Object.keys(out.errors).forEach(function (k) {
                        if (fields[k]) { fields[k].err.textContent = out.errors[k]; fields[k].wrap.classList.add('is-bad'); }   // plain text
                        else general.push(out.errors[k]);
                    });
                    showError(general.length ? general.join(' ') : 'Please check the fields marked in red.');
                    return;
                }
                render(S, box);
                if (user) remember(raw, lastAction);
            }).catch(function (e) {
                if (my !== seq) return;
                if (e instanceof Stopped) showError('Stopped.');
                else { showError('Something went wrong with this input. Please try other numbers.'); if (G.console) console.error(e); }
            }).then(function () {
                clearTimeout(slow);
                if (my !== seq) return;
                running = null;
                status.textContent = '';
                stop.hidden = true;
                root.classList.remove('is-busy');
            });
        }
        form.addEventListener('submit', function (e) { e.preventDefault(); go(actions[0].id, true); });
        var live = null;
        form.addEventListener('input', function () {
            applyWhen(def, fields);
            if (!def.live) return;
            clearTimeout(live);
            live = setTimeout(function () { go(lastAction, true); }, 250);
        });
        form.addEventListener('change', function () { applyWhen(def, fields); });

        /* start: the inputs of the address if there are any, else the first example, so the procedure shows at once */
        var q = {}, any = false;
        location.search.slice(1).split('&').forEach(function (kv) {
            if (!kv) return;
            var i = kv.indexOf('='), k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, ' ')), v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
            q[k] = v;
            if (fields[k]) any = true;
        });
        if (any) {
            def.inputs.forEach(function (f) { if (f.type === 'check') fields[f.id].input.checked = q[f.id] === '1'; });
            fill(fields, q);
        } else if (def.examples.length) fill(fields, def.examples[0]);
        applyWhen(def, fields);
        var first = any && q['do'] && actions.some(function (a) { return a.id === q['do']; }) ? q['do'] : (!any && def.examples.length && def.examples[0]._action) || actions[0].id;
        go(first, false);
    };
})(typeof window !== 'undefined' ? window : globalThis);
