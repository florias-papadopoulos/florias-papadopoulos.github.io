/* The Toolbox tab (layouts/toolbox/list.html), three ways in:
   - the box: typed words filter the tools (every word must appear in the title, description or keywords, accents
     ignored); pasted input that looks like something (a number, a modular expression, Base64, hex, binary, Morse,
     a ciphertext...) is recognised by guess() below, which offers the right tools as links that open them already
     filled in (the tool pages read their inputs from the address, see core.js);
   - the "What do you want to do?" tiles: one task at a time narrows the list to its tools (data/toolbox_tasks.yaml);
   - the categories, with jump links.
   Exported as window.ToolboxGuess for the tests (assets/js/calc/test/run.js). */
(function () {
    'use strict';

    /* ---------- recognising pasted input ---------- */
    var INT = /^-?\s*\d[\d_]*$/;
    var EXPR = /^[\d\s+\-*\/^!().,_]+$/;
    function words(s) { return (s.toLowerCase().match(/[a-z]+/g) || []); }
    var COMMON = ['the', 'and', 'of', 'to', 'is', 'in', 'that', 'it', 'you', 'for', 'was', 'with', 'this', 'are', 'be', 'have', 'not', 'on', 'what', 'my'];
    function looksEnglish(s) {
        var w = words(s);
        if (w.length < 4) return false;
        var hits = w.filter(function (x) { return COMMON.indexOf(x) >= 0; }).length;
        return hits / w.length > 0.12;
    }
    /* Returns {what: 'Looks like Base64', tools: [[id, label, {param: value}], ...]} or null */
    function guess(raw) {
        var s = String(raw || '').trim();
        if (!s || s.length > 20000) return null;
        var one = s.replace(/\s+/g, ' '), m, nums;

        /* modular expressions */
        if ((m = /^(.+?)\s*\^\s*\(?\s*-\s*1\s*\)?\s*(?:mod|%)\s*(\S+)$/i.exec(one)))
            return { what: 'Looks like a modular inverse', tools: [['modular-inverse', 'Find the inverse', { a: m[1], n: m[2] }], ['extended-euclid', 'Extended Euclid', { a: m[1], b: m[2] }]] };
        if ((m = /^(?:the\s+)?inverse\s+of\s+(.+?)\s+(?:mod|modulo)\s+(\S+)$/i.exec(one)))
            return { what: 'Looks like a modular inverse', tools: [['modular-inverse', 'Find the inverse', { a: m[1], n: m[2] }]] };
        if ((m = /^(.+?)\s*\^\s*(.+?)\s*(?:mod|%)\s*(\S+)$/i.exec(one)) && EXPR.test(m[1]) && EXPR.test(m[2]))
            return { what: 'Looks like a modular power', tools: [['modular-exponentiation', 'Square and multiply', { a: m[1], e: m[2], n: m[3] }], ['modular-calculator', 'Modular calculator', { expr: m[1] + '^' + m[2], n: m[3] }]] };
        if ((m = /^(\d+)\s*\*?\s*x\s*(?:≡|=)\s*(-?\d+)\s*\(?\s*(?:mod|%)\s*(\d+)\s*\)?$/i.exec(one)))
            return { what: 'Looks like a linear congruence', tools: [['linear-congruence', 'Solve for x', { a: m[1], b: m[2], n: m[3] }]] };
        var lines = s.split(/\n|;/).map(function (l) { return l.trim(); }).filter(Boolean);
        if (lines.length >= 2 && lines.every(function (l) { return /(mod|≡|%)/i.test(l) && /\d/.test(l); }))
            return { what: 'Looks like a system of congruences', tools: [['chinese-remainder', 'Chinese remainder theorem', { form: 'lines', sys: lines.join('\n') }]] };
        if ((m = /^(.+?)\s*(?:mod|%)\s*(\S+)$/i.exec(one)) && EXPR.test(m[1]) && /^-?\d[\d_]*$/.test(m[2]))
            return { what: 'Looks like a remainder', tools: [['modulo', 'a mod n', { a: m[1], n: m[2], conv: 'euclid' }], ['modular-calculator', 'Modular calculator', { expr: m[1], n: m[2] }]] };

        /* numbers (binary first: 0s and 1s in groups of 8 are bytes, not a list of numbers) */
        var compact = s.replace(/\s+/g, '');
        if (/^[01]+$/.test(compact) && compact.length >= 8 && compact.length % 8 === 0)
            return { what: 'Looks like binary', tools: [['binary', 'Decode the bits as text', { input: s }], ['base-conversion', 'As a number', { num: compact, from: '2', to: '10' }]] };
        nums = one.split(/\s*[,;]\s*|\s+/).filter(Boolean);
        if (nums.length >= 2 && nums.length <= 12 && nums.every(function (x) { return INT.test(x); })) {
            var t = [['gcd', 'GCD and LCM', { nums: nums.join(', ') }]];
            if (nums.length === 2) t.push(['modular-inverse', 'Inverse of the first modulo the second', { a: nums[0], n: nums[1] }], ['extended-euclid', 'Bézout coefficients', { a: nums[0], b: nums[1] }]);
            return { what: 'Looks like whole numbers', tools: t };
        }
        if (INT.test(one)) {
            var n = one.replace(/[\s_]/g, '');
            return { what: 'Looks like a whole number', tools: [['prime-factorization', 'Factor it', { n: n }], ['primality-test', 'Is it prime?', { n: n }], ['base-conversion', 'In binary and other bases', { num: n, from: '10', to: '2' }], ['euler-totient', "Euler's totient", { n: n }]] };
        }
        if (/^-?\d*\.\d+(e[-+]?\d+)?$/i.test(one))
            return { what: 'Looks like a decimal number', tools: [['ieee754', 'How a computer stores it', { dir: 'dec', x: one }]] };
        if (/[\/]/.test(one) && /^[\d\s+\-*\/^().]+$/.test(one))
            return { what: 'Looks like a calculation with fractions', tools: [['fractions', 'Fraction calculator', { expr: one }], ['big-number', 'Exact big number calculator', { expr: one }]] };
        if (EXPR.test(one) && /[+\-*^!]/.test(one) && /\d/.test(one))
            return { what: 'Looks like a calculation', tools: [['big-number', 'Calculate it exactly', { expr: one }]] };
        if (/^\[\s*\[/.test(one) || (lines.length >= 2 && lines.every(function (l) { return /^[-\d\s,\/]+$/.test(l); })))
            return { what: 'Looks like a matrix', tools: [['matrix', 'Determinant, inverse, row reduction', { A: s, ring: 'q' }]] };

        /* codes */
        if (/^[.\-\/\s·•_]+$/.test(s) && /[.·•]/.test(s) && /[-_]/.test(s))
            return { what: 'Looks like Morse code', tools: [['morse', 'Decode the Morse code', { input: s }]] };
        if (/%[0-9a-f]{2}/i.test(s) && !/\s/.test(s.trim()))
            return { what: 'Looks URL-encoded', tools: [['url-encoding', 'Decode it', { input: s }]] };
        if ((/^(0x)?[0-9a-f]+$/i.test(compact) && compact.replace(/^0x/i, '').length % 2 === 0 && /[a-f]/i.test(compact) && compact.length >= 4) || /^([0-9a-f]{2}[\s:])+[0-9a-f]{2}$/i.test(s))
            return { what: 'Looks like hexadecimal', tools: [['hex', 'Decode the bytes as text', { input: s }], ['base-conversion', 'As a number', { num: compact.replace(/^0x/i, ''), from: '16', to: '10' }], ['decoder-guesser', 'Try every decoder', { text: s }]] };
        if (/^[A-Za-z0-9+\/_-]+={0,2}$/.test(compact) && compact.length >= 8 && (compact.length % 4 === 0 || /=$/.test(compact)) && /[a-z]/.test(compact) && /[A-Z]/.test(compact) && !looksEnglish(s))
            return { what: 'Looks like Base64', tools: [['base64', 'Decode it', { input: compact }], ['decoder-guesser', 'Try every decoder', { text: s }]] };

        /* text */
        var letters = s.replace(/[^A-Za-z]/g, '').length;
        if (letters >= 20 && letters / s.replace(/\s/g, '').length > 0.7) {
            if (looksEnglish(s)) return { what: 'Looks like English text', tools: [['vigenere', 'Encrypt it with Vigenère', { text: s, key: 'LEMON' }], ['caesar', 'Encrypt it with Caesar', { text: s, shift: '3' }], ['frequency-analysis', 'Count its letters', { text: s }], ['hash', 'Its SHA-256 hash', { input: s }]] };
            return { what: 'Looks like a ciphertext', tools: [['cipher-identifier', 'Which cipher is it?', { text: s }], ['caesar-breaker', 'Try every Caesar shift', { text: s }], ['vigenere-breaker', 'Break it as Vigenère', { text: s }], ['substitution-solver', 'Solve it as a substitution', { text: s }]] };
        }
        if (s.length >= 2 && !/^[a-z\s]+$/i.test(s))
            return { what: 'Some text', tools: [['base64', 'Encode it in Base64', { input: s }], ['hex', 'Its bytes in hex', { input: s }], ['hash', 'Its SHA-256 hash', { input: s }], ['decoder-guesser', 'Try to decode it', { text: s }]] };
        return null;
    }
    var api = { guess: guess };
    (typeof window !== 'undefined' ? window : globalThis).ToolboxGuess = api;
    if (typeof document === 'undefined') return;

    /* ---------- the page ---------- */
    var box = document.getElementById('tb-search');
    if (!box) return;
    var tools = Array.prototype.slice.call(document.querySelectorAll('.tb-tool'));
    var cats = Array.prototype.slice.call(document.querySelectorAll('.tb-cat'));
    var none = document.getElementById('tb-nores'), out = document.getElementById('tb-guess');
    var tiles = Array.prototype.slice.call(document.querySelectorAll('.tb-task'));
    var bar = document.getElementById('tb-taskbar'), barText = document.getElementById('tb-tasktext');
    var titles = {}, task = '';
    tools.forEach(function (t) {
        var a = t.querySelector('a');
        titles[t.getAttribute('data-id')] = { title: a.textContent, href: a.getAttribute('href') };
    });
    function flat(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    tools.forEach(function (t) { t._q = flat(t.getAttribute('data-q') || ''); t._tasks = (t.getAttribute('data-tasks') || '').split(' '); });

    function link(id, label, params) {
        var t = titles[id];
        if (!t) return null;
        var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
        if (id === 'base64' || id === 'hex' || id === 'binary' || id === 'morse' || id === 'url-encoding') {
            var decode = !/^(Encode|Its bytes)/.test(label);
            q.push('do=' + (decode ? 'dec' : 'enc'));
        }
        if ((id === 'vigenere' || id === 'caesar') && /^Encrypt/.test(label)) q.push('do=enc');
        var a = document.createElement('a');
        a.href = t.href + (q.length ? '#' + q.join('&') : '');   /* after the #: never sent to a server */
        a.className = 'tb-guess-link';
        var b = document.createElement('b');
        b.textContent = label;
        var sp = document.createElement('span');
        sp.textContent = t.title;
        a.appendChild(b);
        a.appendChild(sp);
        return a;
    }
    function showGuess(g) {
        out.textContent = '';
        out.hidden = !g;
        if (!g) return;
        var h = document.createElement('p');
        h.className = 'tb-guess-what';
        h.textContent = g.what + ':';
        out.appendChild(h);
        var list = document.createElement('div');
        list.className = 'tb-guess-list';
        g.tools.forEach(function (x) { var a = link(x[0], x[1], x[2]); if (a) list.appendChild(a); });
        out.appendChild(list);
    }
    function apply() {
        var raw = box.value, g = guess(raw);
        showGuess(g);
        /* pasted input that was recognised does not filter the list; plain words do */
        var ws = g ? [] : flat(raw).split(/\s+/).filter(Boolean), shown = 0;
        tools.forEach(function (t) {
            var on = (!task || t._tasks.indexOf(task) >= 0) && ws.every(function (w) { return t._q.indexOf(w) >= 0; });
            t.hidden = !on;
            if (on) shown++;
        });
        cats.forEach(function (c) { c.hidden = !c.querySelector('.tb-tool:not([hidden])'); });
        none.hidden = shown > 0 || !!g;
    }
    function setTask(id) {
        task = task === id ? '' : id;
        tiles.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-task') === task)); });
        bar.hidden = !task;
        if (task) {
            var b = tiles.filter(function (x) { return x.getAttribute('data-task') === task; })[0];
            barText.textContent = 'Showing the tools to ' + b.querySelector('b').textContent.toLowerCase().replace(/^see/, 'see') + '.';
        }
        apply();
        if (task) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    tiles.forEach(function (b) { b.addEventListener('click', function () { setTask(b.getAttribute('data-task')); }); });
    document.getElementById('tb-taskall').addEventListener('click', function () { setTask(task); });
    box.addEventListener('input', apply);
    /* /toolbox/#q=... fills the box (links can point to a search or a pasted value; ?q= works too) */
    var q = /[#?&]q=([^&]*)/.exec(location.hash + '&' + location.search);
    if (q) { try { box.value = decodeURIComponent(q[1].replace(/\+/g, ' ')); } catch (e) { /* bad escape: ignore */ } }
    if (box.value) apply();
})();
