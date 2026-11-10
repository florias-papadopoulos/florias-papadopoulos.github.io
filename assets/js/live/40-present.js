/* The presenter's live page /live/present/#<code> (layouts/live/present.html): the projector view (big and clean, for a
   browser window next to the slides) or the remote (the same page on the presenter's phone, 42-remote.js). Both are
   presenter connections to the session and send the same commands; every change comes back to all of them, and to
   every phone, from the worker.
   Keys on the projector: right arrow or Page Down: next activity (or start); left or Page Up: back; R: reveal the
   results (Shift+R hides them); Q: the QR code; L: the quiz ranking; Escape: close the activity (phones show "next
   question coming"); P: quick poll; F: full screen; ?: these keys. */
(function (LV) {
    'use strict';
    var root = LV.root;
    if (!root || !root.classList.contains('lv-pres')) return;
    var h = LV.h, app = LV.$('lv-app');
    window.addEventListener('hashchange', function () { location.reload(); });

    if (!LV.end) { app.appendChild(h('p.lv-plain', { text: 'Audience mode is not set up yet (params.liveEndpoint in config.yml).' })); return; }
    var name = LV.code();
    if (!name) {
        app.appendChild(h('p.lv-plain', {}, ['Open this page from the ', h('a', { href: LV.base + 'admin/', text: 'presenter page' }), '.']));
        return;
    }
    /* the audience link carries the join secret, which the worker sends with the presenter view (pv.join) */
    var pv = null, conn = null, mode = '', link = '', joinK = null, bigQr = null;
    var stage, screen, corner, cornerQr, cornerLink, cornerN, overlay, overlayQr, overlayLink, floats, bar, toast, remoteBox, help, quickBox;
    if (!LV.key()) LV.keyForm(app, '', start);
    else start();

    function start() {
        LV.clear(app);
        var small = Math.min(window.screen.width || innerWidth, window.screen.height || innerHeight) < 700;
        mode = LV.get('live-mode') || (matchMedia('(pointer: coarse)').matches && small ? 'remote' : 'screen');
        build();
        conn = LV.connect(name, 'p', { hello: function () { return { t: 'hi', key: LV.key() }; }, message: message, status: status });
        LV.P = { send: send, name: name, setMode: setMode, quick: openQuick };
    }
    function send(m) { if (!conn || !conn.send(m)) { say('Not connected right now.'); return false; } return true; }

    /* ---------- the page ---------- */
    function build() {
        screen = h('div.lv-screen');
        cornerN = h('span.lv-corner-n');
        cornerQr = h('span.lv-corner-qr');
        cornerLink = h('span');
        corner = h('div.lv-corner', { hidden: true }, [cornerQr, h('span.lv-corner-text', {}, [cornerLink, cornerN])]);
        overlayQr = h('span.lv-qr-huge-box');
        overlayLink = h('p.lv-scr-link');
        overlay = h('div.lv-qr-overlay', { hidden: true, onclick: function () { send({ t: 'qr', on: false }); } }, [overlayQr, overlayLink]);
        floats = h('div.lv-floats', { 'aria-hidden': 'true' });
        toast = h('p.lv-toast', { role: 'status' });
        bar = h('nav.lv-controls', { 'aria-label': 'Controls' });
        help = h('div.lv-help', { hidden: true, onclick: function () { help.hidden = true; } }, [h('div.lv-help-box', {}, [
            h('h2', { text: 'Keys' }),
            h('dl', {}, [['→  or  Page Down', 'Next activity (or start)'], ['←  or  Page Up', 'Back'], ['R', 'Reveal the results (Shift+R hides them)'],
                ['Q', 'Show or hide the QR code'], ['L', 'Quiz ranking'], ['Esc', 'Close the activity: phones show “next question coming”'],
                ['P', 'Quick poll'], ['F', 'Full screen'], ['?', 'This list']].reduce(function (a, r) { return a.concat([h('dt', { text: r[0] }), h('dd', { text: r[1] })]); }, [])),
            h('p.lv-sub', { text: 'On your phone, open this same page for the remote, with the questions to approve.' })])]);
        stage = h('div.lv-stage', {}, [screen, corner, overlay, floats, bar, toast, help]);
        remoteBox = h('div.lv-remote-box');
        app.appendChild(stage);
        app.appendChild(remoteBox);
        setMode(mode);
    }
    function setMode(m) {
        mode = m;
        LV.set('live-mode', m === 'remote' ? 'remote' : 'screen');
        root.classList.toggle('is-remote', m === 'remote');
        stage.hidden = m === 'remote';
        remoteBox.hidden = m !== 'remote';
        draw();
    }

    /* the QR codes and the short link, made again when the join secret changes (or first arrives) */
    function setLink(k) {
        if (k === joinK) return;
        joinK = k;
        link = k ? LV.link(name, k) : '';
        bigQr = link ? LV.qrImg(link, 'lv-qr-big') : null;
        LV.clear(cornerQr); LV.clear(overlayQr);
        if (link) { cornerQr.appendChild(LV.qrImg(link, 'lv-qr-small')); overlayQr.appendChild(LV.qrImg(link, 'lv-qr-huge')); }
        LV.clear(cornerLink); LV.clear(overlayLink);
        if (link) { LV.linkParts(link).forEach(function (x) { cornerLink.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); LV.linkParts(link).forEach(function (x) { overlayLink.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); }
        else cornerLink.textContent = overlayLink.textContent = 'No link yet: save the talk on the presenter page.';
    }

    /* ---------- drawing ---------- */
    function fixTime(v) { if (v && v.act && v.act.left !== undefined) v.act.end = Date.now() + v.act.left; }
    function now(v) { if (v && v.act && v.act.end) v.act.left = Math.max(0, v.act.end - Date.now()); }
    function draw() {
        if (!pv) return;
        LV.stopTicks();
        now(pv);
        document.title = (pv.test ? 'Rehearsal: ' : '') + (pv.title || name) + ' · present';
        if (mode === 'remote') { LV.clear(remoteBox).appendChild(LV.remote(pv)); return; }
        LV.clear(screen).appendChild(LV.screen(pv, { link: link, qr: bigQr, timeUp: timeUp }));
        var open = pv.s === 'live' && pv.ph === 'open' && pv.act && !pv.board;
        corner.hidden = !open || pv.qr;
        cornerN.textContent = LV.plural(pv.n || 0, 'person', 'people');
        overlay.hidden = !pv.qr;
        drawBar();
    }
    function timeUp() {
        /* the projector reveals a quiz by itself when its time is up */
        var a = pv && pv.act;
        if (mode === 'screen' && a && a.type === 'quiz' && !a.shown && pv.ph === 'open') setTimeout(function () { if (pv.act && pv.act.id === a.id && !pv.act.shown) send({ t: 'reveal' }); }, 700);
    }
    function btn(label, key, fn, cls) {
        return h('button.lv-ctl' + (cls ? '.' + cls : ''), { type: 'button', title: key ? label + ' (' + key + ')' : label, onclick: fn }, [label, key ? h('kbd', { text: key }) : null]);
    }
    function drawBar() {
        LV.clear(bar);
        var live = pv.s === 'live', a = pv.act && pv.ph === 'open' ? pv.act : null, votes = a && (a.type === 'poll' || a.type === 'quiz');
        var newQs = (pv.qs || []).filter(function (q) { return q.st === 'new'; }).length;
        if (!live) bar.appendChild(btn(pv.s === 'ended' ? 'Start again' : 'Start the session', '→', startSession, 'is-main'));
        if (live) {
            bar.appendChild(btn('Back', '←', function () { send({ t: 'prev' }); }));
            bar.appendChild(btn('Next', '→', function () { send({ t: 'next' }); }, 'is-main'));
            if (votes) bar.appendChild(btn(a.shown ? 'Hide results' : 'Reveal', 'R', function () { send({ t: a.shown ? 'hide' : 'reveal' }); }));
            if (a && a.type === 'poll') bar.appendChild(btn(a.live ? 'Live bars: on' : 'Live bars: off', '', function () { send({ t: 'live', on: !a.live }); }));
            if (a) bar.appendChild(btn('Close', 'Esc', function () { send({ t: 'close' }); }));
            bar.appendChild(btn(pv.board ? 'Hide ranking' : 'Ranking', 'L', function () { send({ t: 'board' }); }));
            bar.appendChild(btn('Quick poll', 'P', openQuick));
        }
        bar.appendChild(btn(pv.qr ? 'Hide QR' : 'QR', 'Q', function () { send({ t: 'qr' }); }));
        if (live) bar.appendChild(btn('End', '', endSession));
        bar.appendChild(btn('Full screen', 'F', fullscreen));
        bar.appendChild(btn('Remote view', '', function () { setMode('remote'); }));
        bar.appendChild(btn('?', '', function () { help.hidden = !help.hidden; }));
        if (newQs) bar.appendChild(h('span.lv-ctl-info', { text: LV.plural(newQs, 'new question', 'new questions') + ' to approve on the remote' }));
        var newNames = pv.names ? pv.names.nw : 0;
        if (newNames) bar.appendChild(h('span.lv-ctl-info', { text: LV.plural(newNames, 'new nickname', 'new nicknames') + ' to approve on the remote' }));
    }
    function startSession() {
        if (pv.s === 'ended' && !confirm('Start this talk again? The results of the last run are deleted.')) return;
        send({ t: 'start' });
    }
    function endSession() {
        if (confirm('End the session? Phones show "the talk has ended", and the audience data is deleted 24 hours from now.')) send({ t: 'end' });
    }
    LV.startSession = function () { startSession(); };
    LV.endSession = function () { endSession(); };
    function fullscreen() {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () { /* refused */ });
    }

    /* votes arrive one by one: the bars move in place instead of the screen being redrawn */
    function updateVotes() {
        var a = pv.act;
        if (mode === 'remote') { draw(); return; }
        var rows = screen.querySelectorAll('.lv-bar');
        if (rows.length !== (a.opts || []).length) { draw(); return; }
        Array.prototype.forEach.call(rows, function (row, i) {
            var p = a.total ? Math.round(100 * a.n[i] / a.total) : 0;
            row.querySelector('.lv-bar-fill').style.width = p + '%';
            row.querySelector('.lv-bar-num').textContent = p + '%';
            row.querySelector('.lv-bar-count').textContent = '(' + a.n[i] + ')';
        });
        var c = screen.querySelector('.lv-scr-count');
        if (c) c.textContent = LV.plural(a.total, 'answer', 'answers');
    }

    /* reactions float up the projector; at most 40 at once */
    function float(e) {
        if (mode !== 'screen' || floats.childNodes.length > 40) return;
        var f = h('span.lv-float', { text: LV.EMOJI[e] || '' });
        f.style.left = (8 + Math.random() * 84).toFixed(1) + '%';
        f.style.animationDuration = (3 + Math.random() * 1.5).toFixed(2) + 's';
        f.addEventListener('animationend', function () { if (f.parentNode) f.parentNode.removeChild(f); });
        floats.appendChild(f);
    }

    /* ---------- quick poll ---------- */
    function openQuick() {
        if (!pv || pv.s !== 'live') { say('Start the session first.'); return; }
        if (quickBox) { quickBox.querySelector('input').focus(); return; }
        var q = h('input.lv-in', { type: 'text', id: 'lv-quick-q', maxlength: String(LV.LIMITS.q), placeholder: 'Your question', required: true });
        var o = h('textarea.lv-in', { id: 'lv-quick-o', rows: '4', placeholder: 'Answers, one per line (empty: Yes and No)' });
        function close() { if (quickBox && quickBox.parentNode) quickBox.parentNode.removeChild(quickBox); quickBox = null; }
        quickBox = h('div.lv-dialog', { role: 'dialog', 'aria-label': 'Quick poll' }, [h('form.lv-form.lv-dialog-box', { onsubmit: function (e) {
            e.preventDefault();
            var opts = o.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
            if (opts.length === 1 || opts.length > LV.LIMITS.maxOpts) { say('Give 2 to ' + LV.LIMITS.maxOpts + ' answers, or none for Yes and No.'); return; }
            if (send({ t: 'quick', q: q.value, opts: opts })) close();
        }, onkeydown: function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } } }, [
            h('h2', { text: 'Quick poll' }),
            h('label', { for: 'lv-quick-q', text: 'Question' }), q,
            h('label', { for: 'lv-quick-o', text: 'Answers' }), o,
            h('div.lv-form-row', {}, [h('button.lv-btn', { type: 'submit', text: 'Ask now' }), h('button.lv-btn.is-quiet', { type: 'button', text: 'Cancel', onclick: close })])
        ])]);
        (mode === 'remote' ? remoteBox : stage).appendChild(quickBox);
        q.focus();
    }

    /* ---------- keys ---------- */
    document.addEventListener('keydown', function (e) {
        if (mode !== 'screen' || !pv || e.ctrlKey || e.metaKey || e.altKey) return;
        var t = e.target && e.target.tagName;
        if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
        var k = e.key, live = pv.s === 'live', did = true;
        if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { if (live) send({ t: 'next' }); else if (k !== ' ') startSession(); }
        else if (k === 'ArrowLeft' || k === 'PageUp') { if (live) send({ t: 'prev' }); }
        else if (k === 'r' || k === 'R') send({ t: e.shiftKey ? 'hide' : 'reveal' });
        else if (k === 'q' || k === 'Q') send({ t: 'qr' });
        else if (k === 'l' || k === 'L') send({ t: 'board' });
        else if (k === 'Escape') { if (!help.hidden) help.hidden = true; else if (pv.qr) send({ t: 'qr', on: false }); else if (pv.board) send({ t: 'board', on: false }); else if (live) send({ t: 'close' }); }
        else if (k === 'p' || k === 'P') openQuick();
        else if (k === 'f' || k === 'F') fullscreen();
        else if (k === '?') help.hidden = !help.hidden;
        else did = false;
        if (did) e.preventDefault();
    });
    /* the controls fade out while the mouse rests, so the projector shows only the content */
    var idle = 0;
    function wake() { root.classList.remove('is-idle'); clearTimeout(idle); idle = setTimeout(function () { if (!quickBox) root.classList.add('is-idle'); }, 3000); }
    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });

    var toastTimer = 0;
    function say(t) {
        if (!toast) return;
        toast.textContent = t;
        toast.classList.add('is-on');
        (mode === 'remote' ? remoteBox : stage).appendChild(toast);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 3500);
    }
    LV.say = say;

    /* ---------- what the worker says ---------- */
    var ERR = { notlive: 'Start the session first.', noplan: 'There is no saved plan for this code.', toomany: 'That is the most quick polls for one talk.', bad: 'That did not work.' };
    function message(m) {
        if (m.t === 'pstate') { fixTime(m); pv = m; setLink(m.join || ''); draw(); return; }
        if (!pv) return;
        if (m.t === 'votes' && pv.act && pv.act.id === m.a) { pv.act.n = m.n; pv.act.total = m.total; updateVotes(); }
        else if (m.t === 'n') { pv.n = m.n; if (mode === 'remote' || !(pv.ph === 'open' && pv.act)) draw(); else { cornerN.textContent = LV.plural(m.n, 'person', 'people'); drawBar(); } }
        else if (m.t === 'q') { pv.qs.push(m.q); if (mode === 'remote') draw(); else drawBar(); }
        else if (m.t === 'qup') { pv.qs.forEach(function (q) { if (q.id === m.q) q.up = m.up; }); if (mode === 'remote' || (pv.act && pv.act.type === 'questions')) draw(); }
        else if (m.t === 'react') float(m.e);
        else if (m.t === 'err') say(m.x || ERR[m.e] || 'That did not work.');
    }
    function status(s) {
        root.setAttribute('data-conn', s);
        if (s === 'key') { LV.setKey(''); LV.keyForm(app, 'That key was not accepted.', function () { location.reload(); }); }
        else if (s === 'retry') say('Connection lost. Reconnecting…');
        else if (s === 'stopped') say('Could not connect. Reload the page to try again.');
        else if (s === 'none') say('No such talk.');
    }
})(window.LV);
