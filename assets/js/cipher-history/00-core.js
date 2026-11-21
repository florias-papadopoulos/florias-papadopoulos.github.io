/* Cipher History (/cipher-history/): the shared core. Loaded first; then the Toolbox's text and code breaking libraries
   (assets/js/calc/lib/text.js and lib/code-breaking.js, unchanged, joined in by the layouts), then the desk tools
   (10- to 49-), the stories (50- to 89-) and 90-boot.js. See README.md in this folder.

   A story registers itself with CH.story({ id, machine: function (el, ctx), puzzle: function (el, turn, ctx) }).
   id is the story page's file name (content/cipher-history/<id>.md). machine draws the live cipher in el; puzzle
   draws "Your turn" in el and calls turn.solved() when the visitor has broken the message (40-desk-turn.js). */
var CH = (function (G) {
    'use strict';

    /* The Toolbox libraries expect a global Calc with lib and data (and Calc.esc for one display helper). On the
       Toolbox's own pages core.js makes it; here a minimal one is enough. */
    var Calc = G.Calc = G.Calc || {};
    Calc.lib = Calc.lib || {};
    Calc.data = Calc.data || {};
    if (!Calc.esc) Calc.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    var CH = { stories: {}, desk: {}, lib: {} };

    /* ---------- the registry ---------- */
    CH.story = function (def) { CH.stories[def.id] = def; return def; };

    /* ---------- the libraries (reached at call time: text.js and code-breaking.js load after this file) ---------- */
    CH.tx = function () { return Calc.lib.text; };
    CH.B = function () { return Calc.lib.breaking; };
    CH.ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    /* English letter frequencies in percent, A to Z (the Toolbox's table, lib/text.js) */
    CH.english = function () { return Calc.lib.text.EN.slice(); };
    /* only the letters A to Z of a text, upper case */
    CH.letters = function (s) { return Calc.lib.text.letters(s); };
    /* a short fingerprint of a text's letters (FNV-1a, lib/code-breaking.js): a puzzle keeps the fingerprint of its
       answer, not the answer, so reading the page's code does not give it away at once */
    CH.print = function (s) { return Calc.lib.breaking.hash('ch|' + CH.letters(s)).toString(36); };

    /* ---------- DOM helpers ---------- */
    /* CH.el('p', { class: 'x', text: 'hello' }, [children]) */
    CH.el = function (tag, attrs, kids) {
        var n = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) {
            var v = attrs[k];
            if (v == null || v === false) return;
            if (k === 'text') n.textContent = v;
            else if (k === 'html') n.innerHTML = v;
            else if (k === 'on') Object.keys(v).forEach(function (e) { n.addEventListener(e, v[e]); });
            else n.setAttribute(k, v === true ? '' : v);
        });
        (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return n;
    };
    var SVGNS = 'http://www.w3.org/2000/svg';
    CH.svg = function (tag, attrs, parent) {
        var n = document.createElementNS(SVGNS, tag);
        if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
        if (parent) parent.appendChild(n);
        return n;
    };
    CH.clear = function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; };
    /* a labelled text box (16 px on touch screens, see cipher-history.css) */
    var uid = 0;
    CH.field = function (label, input, help) {
        var id = 'ch-f' + (++uid);
        input.id = id;
        return CH.el('div', { class: 'ch-field' }, [CH.el('label', { for: id, text: label }), input, help ? CH.el('p', { class: 'ch-help', text: help }) : null]);
    };
    CH.input = function (value, attrs) {
        var a = { type: 'text', value: value || '', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' };
        Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
        return CH.el('input', a);
    };
    CH.textarea = function (value, rows) {
        var t = CH.el('textarea', { rows: rows || 2, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' });
        t.value = value || '';
        return t;
    };
    CH.button = function (text, onClick, cls) { return CH.el('button', { type: 'button', class: 'ch-btn' + (cls ? ' ' + cls : ''), text: text, on: { click: onClick } }); };
    /* a block of cipher or plain text, kept as written (line breaks and spaces), monospace */
    CH.pre = function (text, cls) { return CH.el('pre', { class: 'ch-text' + (cls ? ' ' + cls : ''), text: text }); };

    /* ---------- the detective's notebook: which stories the visitor has cracked, in this browser only ---------- */
    var KEY = 'ch-notebook';
    CH.notebook = {
        read: function () {
            try { var v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
        },
        solved: function (id) { return !!CH.notebook.read()[id]; },
        mark: function (id) {
            var nb = CH.notebook.read();
            if (nb[id]) return;
            nb[id] = { at: new Date().toISOString().slice(0, 10) };
            try { localStorage.setItem(KEY, JSON.stringify(nb)); } catch (e) { /* storage blocked: the stamp shows on this page only */ }
        },
        forget: function () { try { localStorage.removeItem(KEY); } catch (e) { /* nothing to forget */ } }
    };

    return CH;
})(typeof window !== 'undefined' ? window : globalThis);
