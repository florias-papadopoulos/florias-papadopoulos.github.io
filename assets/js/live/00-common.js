/* Audience mode for talks (the hidden /live/ pages; README.md in this folder). Shared by all three pages: the page's
   settings, small DOM helpers, the browser token and presenter key, the HTTP calls and the WebSocket to the worker
   (tools/live-worker), which reconnects by itself but gently, so a broken network can never turn into a flood of
   requests. */
(function () {
    'use strict';
    var LV = window.LV = window.LV || {};
    var root = document.getElementById('live');
    LV.root = root;
    LV.end = root ? (root.getAttribute('data-endpoint') || '').replace(/\/+$/, '') : '';
    LV.base = root ? root.getAttribute('data-base') || '' : '';

    /* copies of the worker's limits (tools/live-worker/src/plan.js; its test checks that they agree) */
    LV.LIMITS = { title: 120, q: 200, opt: 80, minOpts: 2, maxOpts: 6, acts: 60, ask: 200, nick: 20, minSecs: 5, maxSecs: 120 };
    LV.TYPES = ['poll', 'quiz', 'questions', 'reactions', 'leaderboard'];
    LV.TYPE_NAMES = { poll: 'Poll', quiz: 'Quiz question', questions: 'Audience questions', reactions: 'Reactions', leaderboard: 'Quiz ranking' };
    LV.EMOJI = ['👏', '❤️', '😂', '😮', '🤔', '🎉'];
    LV.EMOJI_NAMES = ['Applause', 'Love it', 'Funny', 'Wow', 'Hmm', 'Party'];
    LV.LETTERS = 'ABCDEF';

    /* The session and its join secret from the address: /live/#pkc27/k3x9mn2p (the code first, so it reads well and
       can be typed; the part after # never reaches any server). The presenter's pages take only the code. */
    function hash() {
        var c = '';
        try { c = decodeURIComponent(location.hash.replace(/^#/, '')); } catch (e) { /* a broken % escape */ }
        return c.trim().toLowerCase().split('/');
    }
    LV.code = function () {
        var c = hash()[0];
        return /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,19}(\.test)?$/.test(c) ? c : '';
    };
    LV.joinKey = function () {
        var k = hash()[1] || '';
        return /^[a-km-np-z2-9]{8}$/.test(k) ? k : '';
    };
    LV.link = function (name, k) { return LV.base + '#' + name + (k ? '/' + k : ''); };
    LV.shortLink = function (name, k) { return LV.link(name, k).replace(/^https?:\/\//, ''); };

    /* h('p.lv-x', {text: 'Hi', onclick: f}, [children]) */
    LV.h = function (sel, props, kids) {
        var m = sel.split('.'), el = document.createElement(m[0] || 'div');
        if (m.length > 1) el.className = m.slice(1).join(' ');
        props = props || {};
        Object.keys(props).forEach(function (k) {
            var v = props[k];
            if (v === undefined || v === null || v === false) return;
            if (k === 'text') el.textContent = v;
            else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
            else if (k === 'value') el.value = v;
            else if (k === 'checked' || k === 'disabled' || k === 'hidden') el[k] = true;
            else el.setAttribute(k, v === true ? '' : v);
        });
        (kids || []).forEach(function (c) {
            if (c === null || c === undefined || c === false) return;
            el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return el;
    };
    LV.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
    LV.$ = function (id) { return document.getElementById(id); };

    /* localStorage, which can be blocked */
    LV.get = function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
    LV.set = function (k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* blocked */ } };

    /* a random token for this browser, so a reload or a lost connection is not a second person (and one vote stays
       one vote); not linked to anything else */
    var memTok = '';
    LV.token = function () {
        var t = LV.get('live-tok');
        if (/^[A-Za-z0-9_-]{16,40}$/.test(t)) return t;
        if (memTok) return memTok;
        var b = new Uint8Array(16), abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        crypto.getRandomValues(b);
        t = '';
        for (var i = 0; i < b.length; i++) t += abc[b[i] & 63];
        t += abc[b[0] >> 6] + abc[b[1] >> 6] + abc[b[2] >> 6] + abc[b[3] >> 6] + abc[b[4] >> 6] + abc[b[5] >> 6];
        memTok = t;
        LV.set('live-tok', t);
        return t;
    };

    /* The presenter key (the worker's PRESENTER_KEY), kept only in this tab's sessionStorage: gone when the tab is
       closed, never in localStorage (where every later visitor of this browser profile could read it). A copy that an
       older version left in localStorage is deleted. Without sessionStorage it is kept in this page only. */
    var memKey = '';
    try { localStorage.removeItem('live-key'); } catch (e) { /* blocked */ }
    LV.key = function () { try { return sessionStorage.getItem('live-key') || ''; } catch (e) { return memKey; } };
    LV.setKey = function (k) {
        memKey = k || '';
        try { if (k) sessionStorage.setItem('live-key', k); else sessionStorage.removeItem('live-key'); } catch (e) { /* blocked */ }
    };

    /* HTTP to the worker with the presenter key: resolves to { status, data } (status 0: no answer) */
    LV.api = function (method, path, body) {
        var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
        var opt = { method: method, credentials: 'omit', cache: 'no-store', headers: { Authorization: 'Bearer ' + LV.key() }, signal: ctl ? ctl.signal : undefined };
        if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
        return fetch(LV.end + path, opt).then(function (r) {
            return r.text().then(function (t) {
                var d = null;
                try { d = t ? JSON.parse(t) : null; } catch (e) { /* not JSON */ }
                return { status: r.status, data: d };
            });
        }, function () { return { status: 0, data: null }; }).then(function (x) { clearTimeout(timer); return x; });
    };

    /* One WebSocket to a session. o.hello() gives the first message, o.message(m) gets every message,
       o.status(s) hears 'connecting', 'open', 'retry', 'key' (wrong key), 'none' (no such talk), 'join' (a wrong or
       missing join secret), 'full', 'stopped'.
       Reconnects after 1.5 s, then 3, 6... up to 30 s (with some randomness, so a room of phones does not come back all
       at once), right away when the page is shown again, and gives up after 12 failures in a row or 60 connections
       in all (the page then offers a button). Sends "ping" every 50 s while the page is visible; the worker answers
       "pong" without waking up. */
    LV.connect = function (name, role, o) {
        var ws = null, fails = 0, opened = 0, timer = 0, pinger = 0, wait = 0, stopped = false, good = false;
        function url() { return LV.end.replace(/^http/, 'ws') + '/ws/' + encodeURIComponent(name) + '?r=' + role; }
        function open() {
            clearTimeout(timer);
            if (stopped || ws) return;
            if (++opened > 60) return stop('stopped');
            o.status('connecting');
            good = false;
            try { ws = new WebSocket(url()); } catch (e) { ws = null; return retry(); }
            var me = ws;
            ws.onopen = function () { me.send(JSON.stringify(o.hello())); };
            ws.onmessage = function (e) {
                if (me !== ws) return;
                clearTimeout(wait);
                if (e.data === 'pong') return;
                var m = null;
                try { m = JSON.parse(e.data); } catch (x) { return; }
                if (!good) { good = true; fails = 0; o.status('open'); ping(); }
                o.message(m);
            };
            ws.onclose = function (e) {
                if (me !== ws) return;
                ws = null;
                clearInterval(pinger); clearTimeout(wait);
                if (e.code === 4001) return stop('key');
                if (e.code === 4004) return stop('none');
                if (e.code === 4005) return stop('join');
                if (e.code === 4000) return stop('stopped');
                if (e.code === 4003) { o.status('full'); return retry(30000); }
                if (e.code === 4008) return retry(30000);
                retry();
            };
        }
        function retry(min) {
            if (stopped) return;
            if (++fails > 12) return stop('stopped');
            o.status('retry');
            var d = Math.min(30000, 1500 * Math.pow(2, fails - 1)) * (0.7 + 0.6 * Math.random());
            timer = setTimeout(open, Math.max(d, min || 0));
        }
        function stop(s) { stopped = true; clearTimeout(timer); clearInterval(pinger); o.status(s); }
        function ping() {
            clearInterval(pinger);
            pinger = setInterval(check, 50000);
        }
        /* a "ping" that gets no answer within 10 s means the connection is dead: start a new one */
        function check() {
            if (!ws || ws.readyState !== 1 || document.visibilityState === 'hidden') return;
            try { ws.send('ping'); } catch (e) { return; }
            clearTimeout(wait);
            var me = ws;
            wait = setTimeout(function () { if (me === ws) { try { me.close(); } catch (e) { /* gone */ } ws = null; open(); } }, 10000);
        }
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState !== 'visible' || stopped) return;
            if (!ws) { fails = Math.min(fails, 3); open(); } else check();
        });
        window.addEventListener('online', function () { if (!ws && !stopped) open(); });
        open();
        return {
            send: function (m) { if (ws && ws.readyState === 1 && good) { ws.send(JSON.stringify(m)); return true; } return false; },
            again: function () { stopped = false; fails = 0; opened = 0; open(); },
            close: function () { stopped = true; clearTimeout(timer); clearInterval(pinger); if (ws) { var w = ws; ws = null; w.close(1000); } }
        };
    };

    /* the privacy note, the same on every live page (opened from a small link) */
    LV.privacy = function () {
        return LV.h('details.lv-privacy', {}, [
            LV.h('summary', { text: 'Privacy' }),
            LV.h('p', { text: 'This page is run by Florias Papadopoulos for his talks. For one talk it keeps your answers, the questions you send, your nickname if you choose one (it appears on the screen only once the speaker approves it), and a random number your browser stores so that a reload does not count you twice. No account, no cookies, nothing that says who you are. No IP address is stored: against abuse, connections are only counted per address, in memory, while the talk runs.' }),
            LV.h('p', { text: 'Everything about a talk is deleted 24 hours after it ends (a nickname given before a talk that then does not start: 24 hours after it was given). Cloudflare runs the service: it sees your IP address in order to deliver the data, as with any website, and may keep backup copies of the stored data for a limited time after they are deleted.' })
        ]);
    };
})();
