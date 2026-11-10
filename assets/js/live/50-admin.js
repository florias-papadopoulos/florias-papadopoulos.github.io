/* The presenter page /live/admin/ (layouts/live/admin.html): talk plans made with a form. Pick or create a talk (a
   short code like "pkc27" and a title), add activities with buttons, fill in each one (question, answers with add
   and remove, the right answers of a quiz, a time limit), move them up and down, copy or delete them, and save. Plans
   live in the worker (PUT /plans/<code>), never in this public repository, so quiz answers stay private. The side
   column (55-admin-side.js) shows the preview, the QR codes, the rehearsal and the results. */
(function (LV) {
    'use strict';
    var root = LV.root;
    if (!root || !root.classList.contains('lv-admin')) return;
    var h = LV.h, $ = LV.$, app = $('lv-app');
    var A = LV.A = { plan: null, saved: '', sel: 0, fresh: false, list: [] };

    if (!LV.end) { app.appendChild(h('p.lv-plain', { text: 'Audience mode is not set up yet: set params.liveEndpoint in config.yml to the worker’s address (tools/workers/live/README.md).' })); return; }
    if (!LV.key()) LV.keyForm(app, '', boot); else boot();

    var bar, edit, side, status, saveBtn;

    function boot() {
        LV.clear(app).appendChild(h('p.lv-sub', { text: 'Loading your talks…' }));
        LV.api('GET', '/plans').then(function (r) {
            if (r.status === 401) { LV.setKey(''); LV.keyForm(app, 'That key was not accepted.', boot); return; }
            if (r.status !== 200 || !r.data) { LV.clear(app).appendChild(h('p.lv-plain', { text: 'The worker did not answer (' + (r.status || 'no connection') + '). Try again later.' })); return; }
            A.list = r.data.plans || [];
            layout();
            var want = decodeURIComponent(location.hash.slice(1)) || LV.get('live-admin-last');
            if (want && A.list.some(function (p) { return p.code === want; })) open(want);
            else if (A.list.length) open(A.list[0].code);
            else newTalk();
        });
    }

    function layout() {
        bar = h('div.lv-abar');
        edit = h('section.lv-aedit');
        side = h('aside.lv-aside');
        status = h('span.lv-save-status', { role: 'status' });
        saveBtn = h('button.lv-btn', { type: 'button', text: 'Save', onclick: save });
        LV.clear(app).appendChild(h('div.lv-ahead', {}, [
            h('div', {}, [h('h1.lv-title', { text: 'Audience mode' }), h('p.lv-sub', { text: 'Your talk plans. Only you can open this page; the plans are kept in the worker, not on the site.' })]),
            LV.forgetButton()
        ]));
        app.appendChild(bar);
        app.appendChild(h('div.lv-acols', {}, [h('div.lv-aleft', {}, [edit, h('div.lv-savebar', {}, [saveBtn, status])]), side]));
        LV.A.side = side;
    }

    /* ---------- the talk picker ---------- */
    function drawBar() {
        var sel = h('select.lv-in', { id: 'lv-talk', 'aria-label': 'Talk', onchange: function () { if (leave()) open(this.value); else this.value = A.plan.code; } },
            A.list.map(function (p) { return h('option', { value: p.code, text: p.code + '  ·  ' + p.title, selected: A.plan && p.code === A.plan.code }); }));
        if (A.fresh) sel.appendChild(h('option', { value: A.plan.code, text: A.plan.code + '  ·  (new, not saved)', selected: true }));
        LV.clear(bar).appendChild(h('label', { for: 'lv-talk', text: 'Talk' }));
        if (A.list.length || A.fresh) bar.appendChild(sel);
        bar.appendChild(h('button.lv-btn.is-quiet', { type: 'button', text: 'New talk', onclick: function () { if (leave()) newTalk(); } }));
        if (A.plan && !A.fresh) {
            bar.appendChild(h('button.lv-btn.is-quiet', { type: 'button', text: 'Duplicate', onclick: duplicate }));
            bar.appendChild(h('button.lv-btn.is-quiet.is-danger', { type: 'button', text: 'Delete', onclick: remove }));
        }
    }
    function leave() { return !dirty() || confirm('Leave this talk without saving the changes?'); }
    function dirty() { return A.plan && (A.fresh || JSON.stringify(A.plan) !== A.saved); }
    window.addEventListener('hashchange', function () {
        var want = decodeURIComponent(location.hash.slice(1));
        if (A.plan && want !== A.plan.code && A.list.some(function (p) { return p.code === want; }) && leave()) open(want);
    });
    window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); save(); } });

    function open(code) {
        say('Loading…');
        LV.api('GET', '/plans/' + encodeURIComponent(code)).then(function (r) {
            if (r.status !== 200 || !r.data || !r.data.plan) { say('Could not load ' + code + ' (' + (r.status || 'no connection') + ').', true); return; }
            set(r.data.plan, false);
            say('');
        });
    }
    function set(plan, fresh) {
        A.plan = plan; A.fresh = fresh; A.saved = fresh ? '' : JSON.stringify(plan); A.sel = 0;
        LV.set('live-admin-last', fresh ? '' : plan.code);
        if (!fresh && location.hash.slice(1) !== plan.code) history.replaceState(null, '', '#' + plan.code);
        drawBar(); drawEdit(); LV.A.drawSide();
    }

    function newTalk() {
        var code = h('input.lv-in', { id: 'lv-new-code', type: 'text', maxlength: '20', spellcheck: 'false', autocapitalize: 'none', placeholder: 'pkc27', required: true });
        var title = h('input.lv-in', { id: 'lv-new-title', type: 'text', maxlength: String(LV.LIMITS.title), placeholder: 'Title of the talk', required: true });
        var note = h('p.lv-formnote', { role: 'status', text: 'The code is part of the link and the QR code (lower case letters, digits and hyphens). It cannot change later.' });
        LV.clear(edit).appendChild(h('form.lv-form.lv-card', { onsubmit: function (e) {
            e.preventDefault();
            var c = code.value.trim().toLowerCase();
            if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,19}$/.test(c)) { note.textContent = 'Use 2 to 20 lower case letters, digits and single hyphens, like pkc27.'; note.className = 'lv-formnote is-bad'; return; }
            if (A.list.some(function (p) { return p.code === c; })) { note.textContent = 'There is already a talk with this code.'; note.className = 'lv-formnote is-bad'; return; }
            set({ code: c, title: title.value.trim(), ask: true, react: true, acts: [] }, true);
        } }, [
            h('h2.lv-h2', { text: 'New talk' }),
            h('label', { for: 'lv-new-code', text: 'Code' }), code,
            h('label', { for: 'lv-new-title', text: 'Title' }), title, note,
            h('div.lv-form-row', {}, [h('button.lv-btn', { type: 'submit', text: 'Create' }),
                A.plan ? h('button.lv-btn.is-quiet', { type: 'button', text: 'Cancel', onclick: function () { drawEdit(); } }) : null])
        ]));
        LV.clear(side);
        code.focus();
    }

    function duplicate() {
        if (!leave()) return;
        var c = (prompt('Code for the copy (for the next conference), e.g. ' + A.plan.code.replace(/\d+$/, '') + '28:') || '').trim().toLowerCase();
        if (!c) return;
        if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,19}$/.test(c)) { say('Use 2 to 20 lower case letters, digits and single hyphens.', true); return; }
        if (A.list.some(function (p) { return p.code === c; })) { say('There is already a talk with this code.', true); return; }
        var copy = JSON.parse(A.saved || JSON.stringify(A.plan));
        copy.code = c;
        delete copy.join; delete copy.tjoin;  // the worker makes new join secrets for the new code
        copy.acts.forEach(function (a) { delete a.id; });
        set(copy, true);
        save();
    }
    function remove() {
        if (!confirm('Delete the talk “' + A.plan.title + '” (' + A.plan.code + ')? Its QR code stops working. Results of a session already held are deleted on their usual schedule.')) return;
        LV.api('DELETE', '/plans/' + encodeURIComponent(A.plan.code)).then(function (r) {
            if (r.status !== 200) { say('Could not delete (' + (r.status || 'no connection') + ').', true); return; }
            A.list = A.list.filter(function (p) { return p.code !== A.plan.code; });
            A.plan = null; A.saved = '';
            history.replaceState(null, '', location.pathname);
            if (A.list.length) open(A.list[0].code); else newTalk();
            drawBar();
        });
    }

    /* ---------- saving ---------- */
    function check(p) {
        if (!p.title.trim()) return 'The talk needs a title.';
        for (var i = 0; i < p.acts.length; i++) {
            var a = p.acts[i], w = 'Activity ' + (i + 1) + ': ';
            if ((a.type === 'poll' || a.type === 'quiz') && !a.q.trim()) return w + 'the question is empty.';
            if (a.opts && a.opts.some(function (o) { return !o.trim(); })) return w + 'an answer is empty.';
            if (a.type === 'quiz' && !a.correct.length) return w + 'mark the right answer.';
            if (a.type === 'quiz' && a.correct.length === a.opts.length) return w + 'not every answer can be right.';
        }
        return '';
    }
    function save() {
        if (!A.plan) return;
        var bad = check(A.plan);
        if (bad) { say(bad, true); return; }
        saveBtn.disabled = true;
        say('Saving…');
        var fresh = A.fresh;
        LV.api('PUT', '/plans/' + encodeURIComponent(A.plan.code) + (fresh ? '?new=1' : ''), A.plan).then(function (r) {
            saveBtn.disabled = false;
            if (r.status !== 200 || !r.data || !r.data.plan) { say(r.data && r.data.error ? r.data.error : 'Not saved (' + (r.status || 'no connection') + ').', true); return; }
            var sel = A.sel;
            A.plan = r.data.plan; A.saved = JSON.stringify(A.plan); A.fresh = false; A.sel = Math.min(sel, A.plan.acts.length - 1);
            var s = { code: A.plan.code, title: A.plan.title, n: A.plan.acts.length, updated: Date.now() };
            A.list = [s].concat(A.list.filter(function (p) { return p.code !== s.code; }));
            LV.set('live-admin-last', A.plan.code);
            history.replaceState(null, '', '#' + A.plan.code);
            drawBar(); drawEdit(); LV.A.drawSide();
            var t = new Date();
            say('Saved at ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) + '.');
        });
    }
    function say(t, bad) { if (status) { status.textContent = t; status.classList.toggle('is-bad', !!bad); } }
    function changed() {
        if (dirty()) say('Unsaved changes.'); else say('');
        LV.A.drawPreview();
    }
    A.changed = changed;

    /* ---------- the form ---------- */
    var ADD = [['poll', '+ Poll'], ['quiz', '+ Quiz question'], ['questions', '+ Audience questions'], ['reactions', '+ Reactions'], ['leaderboard', '+ Quiz ranking']];
    function blankAct(type) {
        if (type === 'poll') return { type: 'poll', q: '', opts: ['', ''], live: false };
        if (type === 'quiz') return { type: 'quiz', q: '', opts: ['', '', '', ''], correct: [], secs: 20 };
        return { type: type, q: { questions: 'Questions for the speaker', reactions: 'How is it going?', leaderboard: 'Quiz ranking' }[type] };
    }
    /* a new type keeps the question and the answers */
    function retype(a, type) {
        var b = blankAct(type);
        if (a.q && (b.opts || !a.opts)) b.q = a.q;
        if (b.opts && a.opts) b.opts = a.opts.slice();
        if (b.correct && a.correct) b.correct = a.correct.filter(function (i) { return i < b.opts.length; });
        if (a.id) b.id = a.id;
        return b;
    }

    function drawEdit() {
        var p = A.plan;
        if (!p) return;
        var title = h('input.lv-in.lv-in-title', { id: 'lv-title', type: 'text', maxlength: String(LV.LIMITS.title), value: p.title, oninput: function () { p.title = this.value; changed(); } });
        var kids = [
            h('div.lv-card.lv-talkhead', {}, [
                h('p.lv-kicker', { text: 'Code: ' + p.code + (A.fresh ? ' (not saved yet)' : '') }),
                h('label', { for: 'lv-title', text: 'Title' }), title,
                check2('lv-ask', 'Audience questions at any time (else only during an “audience questions” activity)', p.ask, function (v) { p.ask = v; }),
                check2('lv-react', 'Reactions at any time (else only during a “reactions” activity)', p.react, function (v) { p.react = v; })
            ])
        ];
        if (!p.acts.length) kids.push(h('p.lv-sub.lv-empty', { text: 'No activities yet. Add the first one with a button below.' }));
        p.acts.forEach(function (a, i) { kids.push(card(a, i)); });
        kids.push(h('div.lv-addbar', {}, ADD.map(function (t) {
            return h('button.lv-btn.is-quiet', { type: 'button', text: t[1], disabled: p.acts.length >= LV.LIMITS.acts, onclick: function () {
                p.acts.push(blankAct(t[0])); A.sel = p.acts.length - 1; drawEdit(); changed();
                var q = edit.querySelector('.lv-actcard.is-sel .lv-in-q');
                if (q) q.focus();
            } });
        })));
        LV.clear(edit);
        kids.forEach(function (k) { edit.appendChild(k); });
    }
    function check2(id, label, on, set) {
        return h('label.lv-check2', { for: id }, [h('input', { id: id, type: 'checkbox', checked: !!on, onchange: function () { set(this.checked); changed(); } }), label]);
    }

    function card(a, i) {
        var p = A.plan, n = p.acts.length;
        function move(d) { var j = i + d; if (j < 0 || j >= n) return; p.acts.splice(j, 0, p.acts.splice(i, 1)[0]); A.sel = j; drawEdit(); changed(); }
        var type = h('select.lv-in.lv-in-type', { 'aria-label': 'Type of activity ' + (i + 1), onchange: function () { p.acts[i] = retype(a, this.value); drawEdit(); changed(); } },
            LV.TYPES.map(function (t) { return h('option', { value: t, text: LV.TYPE_NAMES[t], selected: t === a.type }); }));
        var head = h('div.lv-acthead', {}, [
            h('span.lv-actn', { text: String(i + 1) }), type,
            h('span.lv-acttools', {}, [
                tool('↑', 'Move up', function () { move(-1); }, i === 0),
                tool('↓', 'Move down', function () { move(1); }, i === n - 1),
                tool('Copy', 'Duplicate this activity', function () { var c = JSON.parse(JSON.stringify(a)); delete c.id; p.acts.splice(i + 1, 0, c); A.sel = i + 1; drawEdit(); changed(); }, n >= LV.LIMITS.acts),
                tool('Delete', 'Delete this activity', function () { p.acts.splice(i, 1); A.sel = Math.max(0, Math.min(A.sel, p.acts.length - 1)); drawEdit(); changed(); })
            ])
        ]);
        var qid = 'lv-q-' + i;
        var kids = [head,
            h('label', { for: qid, text: a.type === 'poll' || a.type === 'quiz' ? 'Question' : 'Text on the screen' }),
            h('textarea.lv-in.lv-in-q', { id: qid, rows: '2', maxlength: String(LV.LIMITS.q), value: a.q, oninput: function () { a.q = this.value; changed(); } })];
        if (a.opts) {
            kids.push(h('p.lv-flabel', { text: a.type === 'quiz' ? 'Answers (tick the right one)' : 'Answers' }));
            kids.push(h('ol.lv-aopts', {}, a.opts.map(function (o, k) {
                var right = a.correct && a.correct.indexOf(k) >= 0;
                return h('li' + (right ? '.is-right' : ''), {}, [
                    a.type === 'quiz' ? h('input.lv-right', { type: 'checkbox', checked: right, 'aria-label': 'Answer ' + LV.LETTERS[k] + ' is right', onchange: function () {
                        a.correct = a.correct.filter(function (x) { return x !== k; });
                        if (this.checked) a.correct.push(k);
                        a.correct.sort(); this.parentNode.classList.toggle('is-right', this.checked); changed();
                    } }) : null,
                    h('span.lv-letter', { text: LV.LETTERS[k] }),
                    h('input.lv-in', { type: 'text', maxlength: String(LV.LIMITS.opt), value: o, 'aria-label': 'Answer ' + LV.LETTERS[k], oninput: function () { a.opts[k] = this.value; changed(); } }),
                    tool('×', 'Remove this answer', function () {
                        a.opts.splice(k, 1);
                        if (a.correct) a.correct = a.correct.filter(function (x) { return x !== k; }).map(function (x) { return x > k ? x - 1 : x; });
                        drawEdit(); changed();
                    }, a.opts.length <= LV.LIMITS.minOpts)
                ]);
            })));
            if (a.opts.length < LV.LIMITS.maxOpts) kids.push(h('button.lv-link', { type: 'button', text: '+ Add an answer', onclick: function () {
                a.opts.push(''); drawEdit(); changed();
                var ins = edit.querySelectorAll('.lv-actcard')[i].querySelectorAll('.lv-aopts .lv-in');
                ins[ins.length - 1].focus();
            } }));
        }
        if (a.type === 'poll') kids.push(check2('lv-live-' + i, 'Show the bars live while people vote (else after the reveal)', a.live, function (v) { a.live = v; }));
        if (a.type === 'quiz') {
            var sid = 'lv-secs-' + i;
            kids.push(h('div.lv-form-row.lv-secs', {}, [h('label', { for: sid, text: 'Time limit' }),
                h('input.lv-in', { id: sid, type: 'number', min: String(LV.LIMITS.minSecs), max: String(LV.LIMITS.maxSecs), step: '1', value: String(a.secs), oninput: function () {
                    var s = parseInt(this.value, 10);
                    if (s >= LV.LIMITS.minSecs && s <= LV.LIMITS.maxSecs) { a.secs = s; changed(); }
                } }), h('span', { text: 'seconds' })]));
        }
        return h('div.lv-card.lv-actcard' + (i === A.sel ? '.is-sel' : ''), { onfocusin: function () { pick(i, this); }, onclick: function () { pick(i, this); } }, kids);
    }
    function pick(i, el) {
        if (A.sel === i) return;
        A.sel = i;
        Array.prototype.forEach.call(edit.querySelectorAll('.lv-actcard'), function (c) { c.classList.toggle('is-sel', c === el); });
        LV.A.drawPreview();
    }
    function tool(label, title, fn, dis) {
        return h('button.lv-tool', { type: 'button', text: label, title: title, 'aria-label': title, disabled: !!dis, onclick: function (e) { e.stopPropagation(); fn(); } });
    }
})(window.LV);
