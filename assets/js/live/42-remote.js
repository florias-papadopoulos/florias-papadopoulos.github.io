/* The remote: /live/present/#<code> on the presenter's phone (40-present.js switches to it on small touch screens,
   or with its "Remote view" button). Big buttons for the same commands as the projector's keys, the audience
   questions, the nicknames on the ranking (shown at once; one can be hidden, it then shows as "Guest 123"), a quick poll, and the list of activities to jump to. LV.remote(pv) draws it from the presenter view; commands go through LV.P.send. */
(function (LV) {
    'use strict';
    var h = LV.h;
    function send(m) { return LV.P.send(m); }
    function big(label, fn, cls, dis) { return h('button.lv-rbtn' + (cls ? '.' + cls : ''), { type: 'button', text: label, onclick: fn, disabled: !!dis }); }

    LV.remote = function (pv) {
        var live = pv.s === 'live', a = pv.act && pv.ph === 'open' ? pv.act : null;
        var state = pv.s === 'waiting' ? 'Not started' : pv.s === 'ended' ? 'Ended' : pv.s === 'none' ? 'No plan' : 'Live';
        var kids = [h('header.lv-rhead', {}, [
            h('p.lv-kicker', { text: (pv.test ? 'Rehearsal  ·  ' : '') + state + '  ·  ' + LV.plural(pv.n || 0, 'person', 'people') + ' connected' }),
            h('h1.lv-title', { text: pv.title || pv.code })
        ])];

        /* what is on screen now */
        var cur = [];
        if (pv.s === 'none') cur.push(h('p.lv-msg', { text: 'There is no saved plan with this code.' }));
        else if (!live) cur.push(h('p.lv-msg', { text: pv.s === 'ended' ? 'The session has ended.' : 'Phones wait on “not started yet”.' }),
            big(pv.s === 'ended' ? 'Start again' : 'Start the session', LV.startSession, 'is-main'));
        else if (!a) {
            var next = pv.acts[pv.cur + 1];
            cur.push(h('p.lv-msg', { text: pv.board ? 'The ranking is on screen.' : 'Nothing open: phones show “next question coming”.' }));
            cur.push(h('p.lv-sub', { text: next ? 'Next: ' + LV.TYPE_NAMES[next.type] + ', “' + next.q + '”' : 'That was the last activity.' }));
        } else {
            cur.push(h('p.lv-kicker', { text: LV.TYPE_NAMES[a.type] + '  ·  ' + (pv.cur + 1) + ' of ' + pv.acts.length + (a.shown ? '  ·  revealed' : '') }));
            cur.push(h('h2.lv-q', { text: a.q }));
            if (a.type === 'quiz' && !a.shown) cur.push(LV.timer(a.left, a.secs));
            if (a.opts) {
                cur.push(LV.bars(a.opts, a.n, a.total, a.correct || null));
                cur.push(h('p.lv-sub', { text: LV.plural(a.total || 0, 'answer', 'answers') + (a.type === 'quiz' ? '  ·  ✓ marks the right answer (the projector shows it after the reveal)' : '') }));
            }
        }
        kids.push(h('section.lv-card.lv-rcur', {}, cur));

        /* the pad */
        if (live) {
            var votes = a && a.opts;
            kids.push(h('div.lv-rpad', {}, [
                big('← Back', function () { send({ t: 'prev' }); }),
                big('Next →', function () { send({ t: 'next' }); }, 'is-main'),
                big(a && a.shown ? 'Hide results' : 'Reveal results', function () { send({ t: a.shown ? 'hide' : 'reveal' }); }, '', !votes),
                big('Close', function () { send({ t: 'close' }); }, '', !a),
                big(pv.qr ? 'Hide QR' : 'Show QR', function () { send({ t: 'qr' }); }),
                big(pv.board ? 'Hide ranking' : 'Ranking', function () { send({ t: 'board' }); }),
                a && a.type === 'poll' ? big(a.live ? 'Live bars: on' : 'Live bars: off', function () { send({ t: 'live', on: !a.live }); }) : null,
                big('Quick poll', function () { LV.P.quick(); })
            ]));
        }

        /* the audience questions */
        var qs = pv.qs || [];
        if (qs.length || pv.ask || pv.acts.some(function (x) { return x.type === 'questions'; })) {
            var groups = [['new', 'New: approve to show them on the screen and the phones'], ['shown', 'On the screen'], ['hidden', 'Hidden']];
            var sec = [h('h2.lv-h2', { text: 'Audience questions' })];
            groups.forEach(function (g) {
                var list = qs.filter(function (q) { return q.st === g[0]; }).sort(function (x, y) { return g[0] === 'new' ? x.id - y.id : y.up - x.up || x.id - y.id; });
                if (!list.length) { if (g[0] === 'new') sec.push(h('p.lv-sub', { text: 'No new questions.' })); return; }
                sec.push(h('h3.lv-h3', { text: g[1] + ' (' + list.length + ')' }));
                sec.push(h('ol.lv-rqs', {}, list.map(function (q) {
                    var acts = g[0] === 'new' ? [big('Show', function () { send({ t: 'qset', q: q.id, st: 'shown' }); }, 'is-main'), big('Hide', function () { send({ t: 'qset', q: q.id, st: 'hidden' }); })] :
                        g[0] === 'shown' ? [big(q.big ? 'Unspotlight' : 'Spotlight', function () { send({ t: 'qbig', q: q.id }); }, q.big ? 'is-main' : ''), big('Hide', function () { send({ t: 'qset', q: q.id, st: 'hidden' }); })] :
                            [big('Show again', function () { send({ t: 'qset', q: q.id, st: 'shown' }); })];
                    return h('li', {}, [h('p.lv-rq-text', { text: q.x }), h('div.lv-rq-row', {}, [h('span.lv-up.is-static', { text: '▲ ' + q.up })].concat(acts))]);
                })));
            });
            kids.push(h('section.lv-card', {}, sec));
        }

        /* the nicknames for the quiz ranking */
        var nm = pv.names || { waiting: [], off: [], nw: 0, nno: 0, nok: 0 };
        if (nm.nw || nm.nno || nm.nok) {
            var nsec = [h('h2.lv-h2', { text: 'Nicknames' }),
                h('p.lv-sub', { text: LV.plural(nm.nok, 'nickname is', 'nicknames are') + ' on the ranking (nicknames with rude words are refused). A hidden one shows as “Guest 123”.' })];
            if (nm.shown && nm.shown.length) {
                nsec.push(h('h3.lv-h3', { text: 'On the ranking (' + nm.nok + ')' }));
                nsec.push(h('ol.lv-rqs', {}, nm.shown.map(function (n) {
                    return h('li', {}, [h('p.lv-rq-text', { text: n }), h('div.lv-rq-row', {}, [big('Hide', function () { send({ t: 'name', n: n, s: 'no' }); })])]);
                })));
            }
            if (nm.nw) {
                nsec.push(h('h3.lv-h3', { text: 'New (' + nm.nw + ')' }));
                nsec.push(big('Approve all (' + nm.nw + ')', function () { send({ t: 'names' }); }, 'is-main'));
                nsec.push(h('ol.lv-rqs', {}, nm.waiting.map(function (n) {
                    return h('li', {}, [h('p.lv-rq-text', { text: n }), h('div.lv-rq-row', {}, [
                        big('Approve', function () { send({ t: 'name', n: n, s: 'ok' }); }, 'is-main'),
                        big('Keep off', function () { send({ t: 'name', n: n, s: 'no' }); })])]);
                })));
                if (nm.nw > nm.waiting.length) nsec.push(h('p.lv-sub', { text: 'And ' + (nm.nw - nm.waiting.length) + ' more.' }));
            }
            if (nm.off.length) {
                nsec.push(h('h3.lv-h3', { text: 'Hidden (' + nm.nno + ')' }));
                nsec.push(h('ol.lv-rqs', {}, nm.off.map(function (n) {
                    return h('li', {}, [h('p.lv-rq-text', { text: n }), h('div.lv-rq-row', {}, [big('Show again', function () { send({ t: 'name', n: n, s: 'ok' }); })])]);
                })));
            }
            kids.push(h('section.lv-card', {}, nsec));
        }

        /* jump to any activity */
        if (live && pv.acts.length) {
            kids.push(h('section.lv-card', {}, [h('h2.lv-h2', { text: 'Activities' }), h('ol.lv-racts', {}, pv.acts.map(function (x, i) {
                return h('li' + (i === pv.cur && pv.ph === 'open' ? '.is-cur' : ''), {}, [h('button.lv-ract', { type: 'button', onclick: function () { send({ t: 'go', i: i }); } }, [
                    h('span.lv-ract-n', { text: String(i + 1) }),
                    h('span.lv-ract-text', {}, [h('span.lv-ract-type', { text: LV.TYPE_NAMES[x.type] + (x.quick ? ' (quick)' : '') + (x.total ? ', ' + LV.plural(x.total, 'answer', 'answers') : '') }), h('span', { text: x.q })])
                ])]);
            }))]));
        }

        kids.push(h('footer.lv-rfoot', {}, [
            live ? big('End the session', LV.endSession, 'is-danger') : null,
            pv.test && pv.s !== 'waiting' ? big('Start the rehearsal fresh', function () { if (confirm('Delete everything from this rehearsal and start over?')) send({ t: 'reset' }); }) : null,
            big('Projector view', function () { LV.P.setMode('screen'); }, 'is-quiet'),
            LV.forgetButton()
        ]));
        return h('div.lv-remote', {}, kids);
    };
})(window.LV);
