/* Drawing the views the worker sends (tools/workers/live/src/session.js: audienceView and presenterView): the phone's
   main card (LV.phoneMain), the question list (LV.qItems), the ranking (LV.boardList) and the projector's screen
   (LV.screen). The presenter page draws its previews with the same functions, so what it shows is what people see. */
(function (LV) {
    'use strict';
    var h = LV.h;

    /* ---------- a ticking clock for quiz timers (one interval for all; cleared when a view is redrawn) ---------- */
    var ticks = [], tickTimer = 0;
    LV.tick = function (fn) {
        ticks.push(fn);
        fn();
        if (!tickTimer) tickTimer = setInterval(function () { ticks.forEach(function (f) { f(); }); }, 200);
    };
    LV.stopTicks = function () { ticks = []; clearInterval(tickTimer); tickTimer = 0; };

    function pct(n, total) { return total ? Math.round(100 * n / total) : 0; }
    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
    LV.plural = plural;

    /* a quiz timer: a bar that runs out and the seconds left; at 0 it calls done() once */
    function timer(left, secs, done, big) {
        var end = Date.now() + (left || 0), fill = h('span.lv-timer-fill'), num = h('span.lv-timer-num');
        var el = h('div.lv-timer' + (big ? '.is-big' : ''), { role: 'timer' }, [h('span.lv-timer-track', {}, [fill]), num]);
        var fired = false;
        LV.tick(function () {
            var ms = Math.max(0, end - Date.now());
            fill.style.width = (100 * ms / (secs * 1000)).toFixed(2) + '%';
            num.textContent = Math.ceil(ms / 1000) + ' s';
            el.classList.toggle('is-low', ms < 5000);
            if (!ms && !fired) { fired = true; el.classList.add('is-up'); num.textContent = 'Time is up'; if (done) done(); }
        });
        return el;
    }
    LV.timer = timer;

    /* answers as rows with a bar each: [letter] text ... 42% (12) */
    LV.bars = function (opts, n, total, correct, mine, big) {
        return h('ol.lv-bars' + (big ? '.is-big' : ''), {}, opts.map(function (o, i) {
            var right = correct && correct.indexOf(i) >= 0, p = pct(n ? n[i] : 0, total);
            var cls = 'li.lv-bar' + (right ? '.is-right' : correct ? '.is-wrong' : '') + (mine === i ? '.is-mine' : '');
            return h(cls, {}, [
                h('span.lv-bar-head', {}, [
                    h('span.lv-letter', { text: LV.LETTERS[i] }),
                    h('span.lv-bar-text', { text: o }),
                    right ? h('span.lv-check', { text: '✓', 'aria-label': 'correct' }) : null,
                    h('span.lv-bar-num', { text: p + '%' }),
                    h('span.lv-bar-count', { text: '(' + (n ? n[i] : 0) + ')' })
                ]),
                h('span.lv-bar-track', {}, [h('span.lv-bar-fill', { style: 'width:' + p + '%' })])
            ]);
        }));
    };

    /* the ranking: 1. Milo 1840 */
    LV.boardList = function (top, meRank, big) {
        if (!top || !top.length) return h('p.lv-sub', { text: 'No points yet.' });
        return h('ol.lv-board' + (big ? '.is-big' : ''), {}, top.map(function (e, i) {
            return h('li' + (meRank === i + 1 ? '.is-me' : ''), {}, [
                h('span.lv-rank', { text: String(i + 1) }), h('span.lv-name', { text: e.n }), h('span.lv-pts', { text: String(e.p) })
            ]);
        }));
    };

    /* the audience questions: text, upvotes; on.up(id) when one is tapped */
    LV.qItems = function (qs, on, big) {
        on = on || {};
        return h('ol.lv-qs' + (big ? '.is-big' : ''), {}, qs.map(function (q) {
            var up = on.up && !q.mine && q.st === 'shown' ? h('button.lv-up' + (q.v ? '.is-on' : ''), { type: 'button', disabled: q.v || on.preview,
                'aria-label': 'Upvote', onclick: function () { on.up(q.id); } }, [h('span', { text: '▲' }), ' ' + q.up]) :
                h('span.lv-up.is-static', {}, [h('span', { text: '▲' }), ' ' + q.up]);
            return h('li.lv-qi' + (q.st === 'new' ? '.is-new' : '') + (q.big ? '.is-big' : ''), { 'data-q': q.id }, [
                h('span.lv-qtext', { text: q.x }), up,
                q.st === 'new' ? h('span.lv-qwait', { text: 'Waiting for the speaker' }) : null
            ]);
        }));
    };

    /* ---------- the phone ---------- */
    /* v: the audience view; on: { vote(c), up(id), preview } */
    LV.phoneMain = function (v, on) {
        on = on || {};
        var kicker = v.test ? 'Rehearsal' : 'Live talk';
        if (v.s === 'none') return h('section.lv-card', {}, [
            h('p.lv-msg', { text: 'There is no talk with this code.' }),
            h('p.lv-sub', { text: 'Check the link, or scan the code from the slides again.' })]);
        if (v.s === 'waiting') return h('section.lv-card', {}, [
            h('p.lv-kicker', { text: kicker }), h('h1.lv-title', { text: v.title }),
            h('p.lv-msg', { text: 'This talk hasn’t started yet.' }),
            h('p.lv-sub', { text: 'Keep this page open: it joins by itself when the talk starts.' })]);
        if (v.s === 'ended') return h('section.lv-card', {}, [
            h('p.lv-kicker', { text: kicker }), h('h1.lv-title', { text: v.title }),
            h('p.lv-msg', { text: 'The talk has ended. Thank you for taking part!' }),
            v.me && v.me.rank ? h('p.lv-sub', { text: 'You came ' + ordinal(v.me.rank) + ' of ' + v.me.of + ' in the quiz, with ' + plural(v.me.p, 'point', 'points') + '.' }) : null,
            v.top ? LV.boardList(v.top, v.me && v.me.rank) : null]);
        var a = v.act;
        if (!a) return h('section.lv-card', {}, [
            h('p.lv-kicker', { text: kicker }), h('h1.lv-title', { text: v.title }),
            h('p.lv-msg', { text: 'The next question is coming.' }),
            h('p.lv-sub', { text: 'Stay on this page: it changes by itself.' })]);
        var kids = [h('p.lv-kicker', { text: LV.TYPE_NAMES[a.type] }), h('h2.lv-q', { text: a.q })];
        if (a.type === 'poll' || a.type === 'quiz') {
            var voted = a.mine !== undefined, timeUp = a.type === 'quiz' && a.left === 0;
            var closed = a.shown || voted || timeUp;
            if (a.type === 'quiz' && !a.shown) kids.push(timer(a.left, a.secs, on.timeUp));
            if (a.n && (a.shown || voted)) kids.push(LV.bars(a.opts, a.n, a.total, a.shown ? a.correct : null, a.mine));
            else kids.push(h('ol.lv-opts', {}, a.opts.map(function (o, i) {
                var right = a.shown && a.correct && a.correct.indexOf(i) >= 0;
                return h('li', {}, [h('button.lv-opt' + (a.mine === i ? '.is-mine' : '') + (right ? '.is-right' : ''), {
                    type: 'button', disabled: closed, 'aria-pressed': a.mine === i ? 'true' : null,
                    onclick: function () { if (on.vote) on.vote(i); }
                }, [h('span.lv-letter', { text: LV.LETTERS[i] }), h('span.lv-otext', { text: o }), right ? h('span.lv-check', { text: '✓' }) : null])]);
            })));
            var note;
            if (a.type === 'quiz' && a.shown) note = !voted ? 'You did not answer this one.' : a.ok ? 'Right! +' + a.pts + ' points' : 'Not this time.';
            else if (voted) note = a.type === 'quiz' ? 'Answer locked in. Wait for the result.' : 'Thanks, your vote is in.';
            else if (a.shown || timeUp) note = a.type === 'quiz' ? 'Time is up.' : 'Voting is closed.';
            else note = a.type === 'quiz' ? 'Faster right answers get more points.' : 'Tap an answer.';
            kids.push(h('p.lv-note' + (a.type === 'quiz' && a.shown ? (a.ok ? '.is-right' : '.is-wrong') : ''), { text: note, role: 'status' }));
            if (a.type === 'quiz' && v.me) kids.push(playing(v.me));
        } else if (a.type === 'questions') {
            kids.push(h('p.lv-sub', { text: 'Write your question below. The speaker picks which ones go on the screen; tap ▲ on the ones you want answered.' }));
        } else if (a.type === 'reactions') {
            kids.push(h('p.lv-sub', { text: 'Tap a face below: it floats across the screen.' }));
        } else if (a.type === 'leaderboard') {
            kids.push(LV.boardList(v.top, v.me && v.me.rank));
            if (v.me && v.me.rank > 10) kids.push(h('p.lv-sub', { text: 'You: ' + ordinal(v.me.rank) + ' of ' + v.me.of + ', ' + plural(v.me.p, 'point', 'points') + '.' }));
            else if (v.me && !v.me.rank) kids.push(h('p.lv-sub', { text: 'Answer the quiz questions to get on the ranking.' }));
        }
        return h('section.lv-card.lv-act', { 'data-type': a.type }, kids);
    };
    function playing(me) {
        var who = me.n || me.guest;
        return h('p.lv-playing', { text: 'Playing as ' + who + (me.p !== undefined ? ', ' + plural(me.p, 'point', 'points') : '') + (me.rank ? ', ' + ordinal(me.rank) + ' of ' + me.of : '') });
    }
    function ordinal(n) {
        var s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
        return n + s;
    }
    LV.ordinal = ordinal;

    /* ---------- the projector ---------- */
    /* pv: the presenter view; o: { link: the audience link (with the join secret), qr: element for the big code, timeUp() } */
    LV.screen = function (pv, o) {
        o = o || {};
        if (pv.s === 'none') return h('div.lv-scr.lv-scr-center', {}, [
            h('p.lv-scr-msg', { text: 'No talk is planned with the code “' + pv.code + '”.' }),
            h('p.lv-scr-sub', { text: 'Create it on the presenter page first.' })]);
        var a = pv.act && pv.ph === 'open' ? pv.act : null;
        if (pv.board && pv.s === 'live') return board(pv);
        if (pv.s === 'ended') return h('div.lv-scr.lv-scr-center', {}, [
            h('p.lv-scr-kicker', { text: pv.title }), h('h1.lv-scr-title', { text: 'Thank you!' }),
            pv.top && pv.top.length ? h('div.lv-scr-podium', {}, [h('p.lv-scr-sub', { text: 'Quiz ranking' }), LV.boardList(pv.top.slice(0, 3), 0, true)]) : null]);
        if (!a) return lobby(pv, o);
        var kicker = a.type === 'leaderboard' ? pv.title : LV.TYPE_NAMES[a.type] + (pv.acts.length ? '  ·  ' + (pv.cur + 1) + ' of ' + pv.acts.length : '');
        var kids = [h('p.lv-scr-kicker', { text: kicker }),
            h('h1.lv-scr-q', { text: a.q })];
        if (a.type === 'poll' || a.type === 'quiz') {
            var show = a.shown || (a.type === 'poll' && a.live);
            if (a.type === 'quiz' && !a.shown) kids.push(timer(a.left, a.secs, o.timeUp, true));
            if (show) kids.push(LV.bars(a.opts, a.n, a.total, a.shown && a.correct ? a.correct : null, undefined, true));
            else kids.push(h('ol.lv-scr-opts', {}, a.opts.map(function (t, i) {
                return h('li', {}, [h('span.lv-letter', { text: LV.LETTERS[i] }), h('span', { text: t })]);
            })));
            kids.push(h('p.lv-scr-count', { text: plural(a.total || 0, 'answer', 'answers') + (show || a.shown ? '' : '  ·  results after the reveal') }));
        } else if (a.type === 'questions') {
            var shown = (pv.qs || []).filter(function (q) { return q.st === 'shown'; }).sort(function (x, y) { return y.up - x.up || x.id - y.id; });
            var big = shown.filter(function (q) { return q.big; })[0];
            if (big) kids.push(h('blockquote.lv-scr-big', {}, [h('p', { text: big.x }), h('span.lv-up.is-static', {}, [h('span', { text: '▲' }), ' ' + big.up])]));
            if (shown.length) kids.push(LV.qItems(shown.filter(function (q) { return !q.big; }).slice(0, big ? 4 : 7), {}, true));
            else kids.push(h('p.lv-scr-sub', { text: 'Send your questions from your phone.' }));
        } else if (a.type === 'reactions') {
            kids.push(h('p.lv-scr-emoji', { 'aria-hidden': 'true', text: LV.EMOJI.join('  ') }));
            kids.push(h('p.lv-scr-sub', { text: 'Tap a face on your phone.' }));
        } else if (a.type === 'leaderboard') {
            kids.push(LV.boardList(pv.top, 0, true));
        }
        return h('div.lv-scr', { 'data-type': a.type }, kids);
    };
    function lobby(pv, o) {
        var waiting = pv.s === 'waiting', past = pv.s === 'live' && pv.cur >= pv.acts.length;
        return h('div.lv-scr.lv-scr-lobby', {}, [
            h('div.lv-scr-lobby-text', {}, [
                h('p.lv-scr-kicker', { text: pv.test ? 'Rehearsal' : waiting ? 'Starting soon' : past ? 'That was the last question' : 'Join in' }),
                h('h1.lv-scr-title', { text: pv.title }),
                h('p.lv-scr-sub', { text: 'Scan the code with your phone camera, or open' }),
                h('p.lv-scr-link', {}, linkParts(o.link)),
                h('p.lv-scr-joined', { text: plural(pv.n || 0, 'person', 'people') + ' connected' })
            ]),
            o.qr || null
        ]);
    }
    /* a long link breaks before the "#", never inside the code or the join secret */
    function linkParts(link) {
        var t = (link || '').replace(/^https?:\/\//, ''), i = t.indexOf('#');
        return i < 0 ? [t] : [t.slice(0, i), h('wbr'), t.slice(i)];
    }
    LV.linkParts = linkParts;
    function board(pv) {
        return h('div.lv-scr', { 'data-type': 'leaderboard' }, [h('p.lv-scr-kicker', { text: pv.title }), h('h1.lv-scr-q', { text: 'Quiz ranking' }), LV.boardList(pv.top, 0, true)]);
    }
})(window.LV);
