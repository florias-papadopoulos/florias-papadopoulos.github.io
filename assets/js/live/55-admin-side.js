/* The side column of the presenter page (50-admin.js): a preview of the chosen activity on a phone and on the
   projector (drawn by the same code as the real pages, from made-up numbers), the QR code of the talk (PNG and SVG to
   paste into slides, the short link), the rehearsal ("test on my phone", a separate session <code>.test with the
   same plan), and the results (download as JSON or CSV, or delete them now). */
(function (LV) {
    'use strict';
    var A = LV.A;
    if (!A) return;
    var h = LV.h, after = false, previewBox = null;

    A.drawSide = function () {
        var side = A.side, p = A.plan;
        if (!side || !p) return;
        LV.clear(side);
        previewBox = h('div.lv-preview');
        side.appendChild(h('section.lv-card', {}, [
            h('div.lv-side-head', {}, [h('h2.lv-h2', { text: 'Preview' }), h('label.lv-check2', { for: 'lv-after' }, [
                h('input', { id: 'lv-after', type: 'checkbox', checked: after, onchange: function () { after = this.checked; A.drawPreview(); } }), 'After the reveal'])]),
            previewBox
        ]));
        A.drawPreview();
        if (A.fresh) { side.appendChild(h('p.lv-sub', { text: 'Save the talk to get its QR code.' })); return; }
        /* a plan saved before join secrets existed gets them on its next save */
        if (!p.join || !p.tjoin) { side.appendChild(h('p.lv-sub', { text: 'Save the talk once more to get its link and QR code.' })); return; }

        /* the links carry the talk's join secret: phones without it cannot join. The projector links open in a tab
           that may keep a copy of this tab's presenter key (rel=opener, same site), so it is not asked again. */
        var link = LV.link(p.code, p.join), test = LV.link(p.code + '.test', p.tjoin);
        side.appendChild(h('section.lv-card.lv-qrcard', {}, [
            h('h2.lv-h2', { text: 'QR code for the slides' }),
            LV.qrImg(link, 'lv-qr-side'),
            h('p.lv-qrlink', {}, [h('a', { href: link, target: '_blank', rel: 'noopener', text: LV.shortLink(p.code, p.join) })]),
            h('div.lv-form-row', {}, [
                h('a.lv-btn', { href: '#', download: 'live-' + p.code + '-qr.png', text: 'PNG', onclick: function () { this.href = LV.qrPng(link, 1600); } }),
                h('a.lv-btn', { href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LV.qrSvg(link)), download: 'live-' + p.code + '-qr.svg', text: 'SVG' }),
                copyBtn('Copy link', function () { return navigator.clipboard.writeText(link); }),
                window.ClipboardItem && navigator.clipboard && navigator.clipboard.write ? copyBtn('Copy image', function () {
                    return navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob(LV.qrPng(link, 1200)) })]);
                }) : null
            ]),
            h('p.lv-sub', { text: 'The link and the code stay the same when you edit the plan. Only people with the whole link (or the code) can join. PNG for PowerPoint, Keynote and Beamer; SVG stays sharp at any size.' })
        ]));
        side.appendChild(h('section.lv-card', {}, [
            h('h2.lv-h2', { text: 'During the talk' }),
            h('p', {}, [h('a.lv-btn', { href: LV.base + 'present/#' + p.code, target: '_blank', rel: 'opener', text: 'Open the projector view' })]),
            h('p.lv-sub', { text: 'Open the same link on your phone for the remote (it asks for the key once in each new tab). Keys on the projector: → next, R reveal, Q QR code, L ranking, Esc close, P quick poll, ? help.' })
        ]));
        side.appendChild(h('section.lv-card', {}, [
            h('h2.lv-h2', { text: 'Test on my phone' }),
            h('div.lv-testrow', {}, [LV.qrImg(test, 'lv-qr-test'), h('div', {}, [
                h('p.lv-sub', { text: 'A rehearsal with the same plan, kept apart from the real talk. Scan this with your phone, then start the rehearsal on its projector view.' }),
                h('p', {}, [h('a.lv-btn.is-quiet', { href: LV.base + 'present/#' + p.code + '.test', target: '_blank', rel: 'opener', text: 'Rehearsal projector' })]),
                h('p.lv-qrlink', {}, [h('a', { href: test, target: '_blank', rel: 'noopener', text: LV.shortLink(p.code + '.test', p.tjoin) })])
            ])])
        ]));
        var note = h('p.lv-formnote', { role: 'status' });
        side.appendChild(h('section.lv-card', {}, [
            h('h2.lv-h2', { text: 'Results' }),
            h('p.lv-sub', { text: 'Votes, the quiz ranking and the questions of the last session. The worker deletes them by itself 24 hours after the session ends.' }),
            h('div.lv-form-row', {}, [
                h('button.lv-btn.is-quiet', { type: 'button', text: 'JSON', onclick: function () { results(p.code, 'json', note); } }),
                h('button.lv-btn.is-quiet', { type: 'button', text: 'CSV', onclick: function () { results(p.code, 'csv', note); } }),
                h('button.lv-btn.is-quiet.is-danger', { type: 'button', text: 'Delete now', onclick: function () {
                    if (!confirm('Delete the audience data of ' + p.code + ' now? The plan stays.')) return;
                    LV.api('DELETE', '/results/' + encodeURIComponent(p.code)).then(function (r) { note.textContent = r.status === 200 ? 'Deleted.' : 'Could not delete (' + (r.status || 'no connection') + ').'; });
                } })
            ]),
            note
        ]));
    };
    function copyBtn(label, fn) {
        return h('button.lv-btn.is-quiet', { type: 'button', text: label, onclick: function () {
            var b = this;
            Promise.resolve().then(fn).then(function () { b.textContent = 'Copied'; }, function () { b.textContent = 'Not allowed here'; })
                .then(function () { setTimeout(function () { b.textContent = label; }, 1800); });
        } });
    }
    function blob(dataUrl) {
        var bin = atob(dataUrl.split(',')[1]), a = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        return new Blob([a], { type: 'image/png' });
    }

    /* ---------- results ---------- */
    function results(code, kind, note) {
        note.textContent = 'Loading…';
        LV.api('GET', '/results/' + encodeURIComponent(code)).then(function (r) {
            if (r.status !== 200 || !r.data) { note.textContent = 'Could not load the results (' + (r.status || 'no connection') + ').'; return; }
            var d = r.data, day = (d.talk.started || d.exported || '').slice(0, 10);
            if (!d.talk.started) { note.textContent = 'There are no results: this talk has not been held yet (or they were deleted).'; return; }
            var text = kind === 'json' ? JSON.stringify(d, null, 2) : csv(d);
            var a = h('a', { href: 'data:' + (kind === 'json' ? 'application/json' : 'text/csv') + ';charset=utf-8,' + encodeURIComponent(text), download: 'live-' + code + '-' + day + '.' + kind });
            document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
            note.textContent = 'Downloaded.';
        });
    }
    function csv(d) {
        var rows = [['section', 'number', 'type', 'question or name', 'answer', 'votes or points', 'correct']];
        d.activities.forEach(function (a) {
            if (!a.answers) { rows.push(['activity', a.n, a.type, a.question, '', '', '']); return; }
            a.answers.forEach(function (x) { rows.push(['activity', a.n, a.type, a.question, x.answer, x.votes, x.correct === undefined ? '' : x.correct ? 'yes' : 'no']); });
        });
        d.ranking.forEach(function (e) { rows.push(['ranking', e.rank, '', e.name, '', e.points, e.correct]); });
        d.questions.forEach(function (q, i) { rows.push(['question', i + 1, q.status, q.text, '', q.upvotes, '']); });
        return rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n') + '\r\n';
    }
    /* One CSV cell. Text from the audience (questions, nicknames) must not run as a spreadsheet formula: a cell that
       starts with = + - @, a tab, a line break, or a full-width = + - @, gets a ' in front (OWASP's advice). */
    function cell(c) {
        c = String(c);
        if (/^[=+\-@\t\r\n\uff1d\uff0b\uff0d\uff20]/.test(c)) c = "'" + c;
        return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
    }
    A.csv = csv;

    /* ---------- the preview, from made-up numbers ---------- */
    var NAMES = ['Ada', 'Milo', 'Guest 512', 'Noor', 'Luca', 'Guest 287', 'Mira', 'Jonas', 'Elena', 'Guest 731'];
    var QS = [{ id: 1, x: 'Does this also hold against malicious senders?', up: 9, st: 'shown' }, { id: 2, x: 'How large are the keys in practice?', up: 4, st: 'shown' },
        { id: 3, x: 'Could the matching run on a phone?', up: 2, st: 'shown' }];
    A.drawPreview = function () {
        if (!previewBox) return;
        var p = A.plan;
        LV.stopTicks();
        LV.clear(previewBox);
        var a = p && p.acts[A.sel];
        if (!a) { previewBox.appendChild(h('p.lv-sub', { text: 'Add an activity to see how the phone and the projector will look.' })); return; }
        var opts = a.opts ? a.opts.map(function (o, k) { return o || 'Answer ' + LV.LETTERS[k]; }) : undefined;
        var n = opts ? opts.map(function (o, k) { return [14, 9, 4, 7, 3, 2][k]; }) : undefined, total = n ? n.reduce(function (s, x) { return s + x; }, 0) : 0;
        var top = NAMES.map(function (x, k) { return { n: x, p: 4200 - k * 310 }; });
        var x = { id: 'preview', type: a.type, q: a.q || '(no question yet)', opts: opts, shown: after && !!opts };
        if (a.type === 'quiz') { x.secs = a.secs; x.left = after ? 0 : a.secs * 600; }
        var phone = JSON.parse(JSON.stringify(x));
        if (after && opts) {
            phone.n = n; phone.total = total; phone.mine = a.type === 'quiz' && a.correct.length ? a.correct[0] : 0;
            if (a.type === 'quiz') { phone.correct = a.correct; phone.ok = true; phone.pts = 840; }
        }
        var v = { t: 'state', s: 'live', title: p.title, ask: p.ask || a.type === 'questions', react: p.react || a.type === 'reactions', quiz: true,
            me: { n: '', guest: 'Guest 123', p: 2650, rank: 3, of: 25 }, act: phone, top: top, qs: QS };
        var scr = JSON.parse(JSON.stringify(x));
        if (opts) { scr.n = n; scr.total = total; if (a.type === 'quiz') scr.correct = a.correct; if (a.type === 'poll') scr.live = !!a.live; }
        var pv = { t: 'pstate', s: 'live', name: p.code, code: p.code, title: p.title, cur: A.sel, ph: 'open', n: 42, qr: false, board: false,
            acts: p.acts, act: scr, qs: QS.concat([{ id: 4, x: 'A new question waits for you on the remote', up: 0, st: 'new' }]), top: top, players: 25 };

        var phoneEl = h('div.lv-frame-phone', { 'aria-label': 'Phone preview' }, [h('div.lv-frame-in', {}, [LV.phoneMain(v, { preview: true })])]);
        var inner = phoneEl.firstChild;
        if (v.ask) inner.appendChild(h('section.lv-card.lv-ask', {}, [h('p.lv-flabel', { text: 'Ask the speaker' }), h('div.lv-fake-in'), LV.qItems(QS.slice(0, 2), { up: function () {}, preview: true })]));
        if (v.react) inner.appendChild(h('div.lv-react.is-inline', {}, LV.EMOJI.map(function (e) { return h('span.lv-react-btn', { text: e }); })));
        var scrEl = h('div.lv-frame-screen', { 'aria-label': 'Projector preview' }, [h('div.lv-screen', {}, [LV.screen(pv, { link: LV.link(p.code, p.join) })])]);
        previewBox.appendChild(h('p.lv-flabel', { text: 'Phone' }));
        previewBox.appendChild(phoneEl);
        previewBox.appendChild(h('p.lv-flabel', { text: 'Projector' }));
        previewBox.appendChild(scrEl);
    };
})(window.LV);
