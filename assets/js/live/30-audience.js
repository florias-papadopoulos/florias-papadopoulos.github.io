/* The audience page /live/#<code>/<join secret> (layouts/live/list.html), phone first. It connects once to the talk's
   session (sending the join secret from the address, without which the worker lets no phone in) and
   only draws what the worker pushes: "not started yet", the activity on screen, "next question coming", the end.
   Votes, questions, upvotes, nicknames and reactions go back over the same connection. Without a code it shows one
   plain line and connects to nothing. */
(function (LV) {
    'use strict';
    var root = LV.root;
    if (!root || !root.classList.contains('lv-aud')) return;
    var h = LV.h, $ = LV.$;
    var app = $('lv-app');
    window.addEventListener('hashchange', function () { location.reload(); });

    if (!LV.end) { app.appendChild(h('p.lv-plain', { text: 'Audience mode is not set up yet.' })); return; }
    var name = LV.code(), joinKey = LV.joinKey();
    if (!name) { app.appendChild(h('p.lv-plain', { text: 'Scan the code from the talk.' })); return; }
    if (!joinKey) { app.appendChild(incomplete()); return; }
    function incomplete() {
        return h('section.lv-card', {}, [
            h('p.lv-msg', { text: 'This link is not complete, or no longer works.' }),
            h('p.lv-sub', { text: 'Scan the QR code on the slides again, or type the whole link shown under it, with the part after the slash.' })]);
    }

    var tok = LV.token(), view = null, conn = null;

    /* ---------- the page's parts: the main card is redrawn, the forms stay (so typing is never lost) ---------- */
    var main = h('div.lv-main', { 'aria-live': 'polite' });
    var connLine = h('p.lv-conn', { role: 'status' });

    var askIn = h('textarea.lv-ask-in', { id: 'lv-ask-in', rows: '3', maxlength: String(LV.LIMITS.ask), placeholder: 'Your question' });
    var askNote = h('p.lv-formnote', { role: 'status' });
    var askList = h('div.lv-ask-list');
    var ask = h('section.lv-card.lv-ask', { hidden: true }, [
        h('form.lv-form', { onsubmit: sendAsk }, [
            h('label', { for: 'lv-ask-in', text: 'Ask the speaker' }), askIn,
            h('div.lv-form-row', {}, [h('button.lv-btn', { type: 'submit', text: 'Send' }), askNote])
        ]),
        askList
    ]);

    var nickIn = h('input.lv-nick-in', { id: 'lv-nick-in', type: 'text', maxlength: String(LV.LIMITS.nick), autocomplete: 'nickname', spellcheck: 'false', placeholder: 'Nickname' });
    var nickNote = h('p.lv-formnote', { role: 'status' });
    var nick = h('section.lv-card.lv-nick', { hidden: true }, [
        h('form.lv-form', { onsubmit: sendNick }, [
            h('label', { for: 'lv-nick-in', text: 'Nickname for the quiz ranking (optional)' }),
            h('div.lv-form-row', {}, [nickIn, h('button.lv-btn', { type: 'submit', text: 'Save' })]),
            nickNote
        ])
    ]);

    var reactBtns = LV.EMOJI.map(function (e, i) {
        return h('button.lv-react-btn', { type: 'button', 'aria-label': LV.EMOJI_NAMES[i], onclick: function () { react(i, this); } }, [e]);
    });
    var reactBar = h('div.lv-react', { hidden: true, role: 'group', 'aria-label': 'Reactions' }, reactBtns);

    app.appendChild(main);
    app.appendChild(nick);
    app.appendChild(ask);
    app.appendChild(connLine);
    app.appendChild(h('footer.lv-foot', {}, [LV.privacy()]));
    root.appendChild(reactBar);
    main.appendChild(h('section.lv-card', {}, [h('p.lv-msg', { text: 'Connecting…' })]));

    /* ---------- drawing ---------- */
    /* a quiz's time left comes as milliseconds: kept as an end time, so a redraw does not restart the clock */
    function draw() {
        LV.stopTicks();
        if (view.act && view.act.end) view.act.left = Math.max(0, view.act.end - Date.now());
        LV.clear(main).appendChild(LV.phoneMain(view, { vote: vote, timeUp: timeUp }));
        document.title = view.title ? view.title + ' · live' : 'Live';
        var a = view.act;
        ask.hidden = !(view.ask || (a && a.type === 'questions'));
        drawQs();
        var quizzy = view.quiz && (view.s === 'waiting' || (view.s === 'live' && (!a || a.type === 'quiz' || a.type === 'leaderboard')));
        nick.hidden = !quizzy;
        if (quizzy && document.activeElement !== nickIn && !nickIn.value && view.me && view.me.n) nickIn.value = view.me.n;
        if (quizzy && !nickNote.textContent && view.me && view.me.n) nickNote.textContent = nickSaid(view.me.n, view.me.ns);
        reactBar.hidden = !view.react;
        root.classList.toggle('has-react', !!view.react);
    }
    function drawQs() {
        LV.clear(askList);
        var qs = view.qs || [];
        if (qs.length) askList.appendChild(LV.qItems(qs, { up: up }));
    }
    function timeUp() {
        if (view && view.act && view.act.left !== 0) { view.act.left = 0; setTimeout(draw, 0); }
    }

    /* ---------- sending ---------- */
    function vote(c) {
        var a = view && view.act;
        if (!a || a.mine !== undefined) return;
        if (!conn.send({ t: 'vote', a: a.id, c: c })) { flash('Not connected right now. Try again in a moment.'); return; }
        a.mine = c; a.pending = true;
        draw();
    }
    function sendAsk(e) {
        e.preventDefault();
        var x = askIn.value.replace(/\s+/g, ' ').trim();
        if (x.length < 3) { askNote.textContent = 'Write a little more.'; return; }
        if (!conn.send({ t: 'ask', x: x })) { askNote.textContent = 'Not connected right now. Try again in a moment.'; return; }
        askNote.textContent = 'Sending…';
    }
    function sendNick(e) {
        e.preventDefault();
        if (!conn.send({ t: 'nick', n: nickIn.value.trim() })) { nickNote.textContent = 'Not connected right now. Try again in a moment.'; return; }
        nickNote.textContent = 'Saving…';
    }
    function up(id) {
        if (!conn.send({ t: 'up', q: id })) return;
        (view.qs || []).forEach(function (q) { if (q.id === id && !q.v) { q.v = true; q.up++; } });
        drawQs();
    }
    /* the same allowance as the worker (5 at once, then one every 1.2 s), so no tap is sent just to be dropped */
    var rb = 5, rt = Date.now();
    function react(i, btn) {
        var now = Date.now();
        rb = Math.min(5, rb + (now - rt) / 1200); rt = now;
        if (rb < 1) { btn.classList.add('is-wait'); setTimeout(function () { btn.classList.remove('is-wait'); }, 300); return; }
        rb--;
        if (!conn.send({ t: 'react', e: i })) return;
        btn.classList.remove('is-pop'); void btn.offsetWidth; btn.classList.add('is-pop');
    }
    var flashTimer = 0;
    function flash(t) {
        connLine.textContent = t;
        clearTimeout(flashTimer);
        flashTimer = setTimeout(function () { if (connLine.textContent === t) connLine.textContent = ''; }, 4000);
    }

    /* ---------- what the worker says ---------- */
    var ERR = {
        wait: ['ask', 'Please wait a few seconds before the next question.'], askmax: ['ask', 'That is the most questions one person can send.'],
        short: ['ask', 'Write a little more.'], full: ['ask', 'No more questions can be taken.'], late: ['main', 'Too late: the time was up.'],
        closed: ['main', 'That is closed now.']
    };
    /* what the nickname line says: the speaker shows each nickname on the screen before others see it */
    function nickSaid(n, s) {
        var g = view && view.me ? view.me.guest : 'a guest';
        if (!n) return 'Cleared. You play as ' + g + '.';
        if (s === 'ok') return 'Saved. You are “' + n + '” on the ranking.';
        if (s === 'no') return 'The speaker did not put “' + n + '” on the screen: others see you as ' + g + '. You can pick another nickname.';
        return 'Saved. Others see “' + n + '” once the speaker approves it; until then you appear as ' + g + '.';
    }
    function message(m) {
        if (m.t === 'state') { if (m.act && m.act.left !== undefined) m.act.end = Date.now() + m.act.left; view = m; draw(); return; }
        if (!view) return;
        var a = view.act;
        if (m.t === 'voted' && a && a.id === m.a) { if (m.c !== undefined) a.mine = m.c; a.pending = false; draw(); }
        else if (m.t === 'votes' && a && a.id === m.a) { a.n = m.n; a.total = m.total; if (a.mine !== undefined || a.shown) draw(); }
        else if (m.t === 'qup') { (view.qs || []).forEach(function (q) { if (q.id === m.q) q.up = m.up; }); drawQs(); }
        else if (m.t === 'asked') { view.qs = (view.qs || []).concat([m.q]); askIn.value = ''; askNote.textContent = 'Sent. The speaker sees it first.'; drawQs(); }
        else if (m.t === 'nick') {
            if (m.ok) { view.me.n = m.n; view.me.ns = m.s; nickNote.textContent = nickSaid(m.n, m.s); }
            else nickNote.textContent = m.e === 'taken' ? 'Someone already has that nickname.' : m.e === 'full' ? 'No more nicknames can be taken.' :
                'Use 2 to 20 Latin letters, digits or spaces, and nothing rude.';
        } else if (m.t === 'err') {
            /* a vote that did not count (too late, or closed meanwhile) is taken back on the screen */
            if ((m.e === 'late' || m.e === 'closed' || m.e === 'full') && a && a.pending) {
                delete a.mine; a.pending = false; if (m.e === 'late') a.end = Date.now(); draw();
                if (m.e === 'full') { flash('This talk cannot take more people, sorry.'); return; }
            }
            var e = ERR[m.e];
            if (e && e[0] === 'ask') askNote.textContent = e[1];
            else if (e) flash(e[1]);
        }
    }
    function status(s) {
        root.setAttribute('data-conn', s);
        if (s === 'open') connLine.textContent = '';
        else if (s === 'connecting') { if (view) connLine.textContent = 'Connecting…'; }
        else if (s === 'retry') connLine.textContent = 'Connection lost. Reconnecting…';
        else if (s === 'full') connLine.textContent = 'This talk is full right now. Trying again in a moment.';
        else if (s === 'none') { LV.stopTicks(); view = { s: 'none' }; LV.clear(main).appendChild(LV.phoneMain(view)); ask.hidden = nick.hidden = reactBar.hidden = true; connLine.textContent = ''; }
        else if (s === 'join') { LV.stopTicks(); view = null; LV.clear(main).appendChild(incomplete()); ask.hidden = nick.hidden = reactBar.hidden = true; connLine.textContent = ''; }
        else if (s === 'stopped') {
            LV.clear(connLine).appendChild(document.createTextNode('Could not connect. '));
            connLine.appendChild(h('button.lv-link', { type: 'button', text: 'Try again', onclick: function () { conn.again(); } }));
        }
    }
    conn = LV.connect(name, 'a', { hello: function () { return { t: 'hi', tok: tok, k: joinKey }; }, message: message, status: status });
})(window.LV);
