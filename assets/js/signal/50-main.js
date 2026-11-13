/* Signal in two browsers, part 6: the start. One device by default; two phones when this page was opened from a QR
   code (#<room>/<secret>) or when the visitor asks for it and the relay answers. Without params.liveEndpoint, or
   with a worker deployed before the relay existed, the page says so in one line and stays on one device. */
(function (SG) {
    'use strict';
    var root = document.getElementById('sg'), app = document.getElementById('sg-app');
    if (!root || !app) return;
    var h = SG.h;
    var end = (root.getAttribute('data-endpoint') || '').replace(/\/+$/, '');
    var base = root.getAttribute('data-base') || location.href.replace(/#.*$/, '');
    var cur = null, mode = 'one';
    var tabs = {
        one: h('button.sg-tab', { type: 'button', text: 'One device', onclick: function () { show('one'); } }),
        two: h('button.sg-tab', { type: 'button', text: 'Two phones', onclick: two })
    };
    var again = h('button.sg-link', { type: 'button', text: 'Start again', onclick: function () { show(mode); } });
    var note = h('p.sg-mode-note', { hidden: true });
    app.textContent = '';
    var bar = h('div.sg-modes', {}, [tabs.one, tabs.two, again]);
    var stage = h('div.sg-stage');
    app.appendChild(bar);
    app.appendChild(note);
    app.appendChild(stage);

    function tell(text) { note.textContent = text || ''; note.hidden = !text; }
    function show(m, join) {
        if (cur) cur.stop();
        mode = m;
        stage.textContent = '';
        tabs.one.setAttribute('aria-pressed', String(m === 'one'));
        tabs.two.setAttribute('aria-pressed', String(m === 'two'));
        if (m === 'one') cur = SG.local(stage);
        else { tell(''); cur = SG.pair(stage, { end: end, base: base, join: join || null }); }
    }
    function two() {
        if (!end) { tell('Two phones need the relay, which is not set up on this site yet. One device works.'); return; }
        tabs.two.disabled = true;
        SG.relayOk(end).then(function (ok) {
            tabs.two.disabled = false;
            if (ok) show('two');
            else tell('The relay is not available right now. One device works.');
        });
    }

    SG.ready.then(function (info) {
        var eng = document.getElementById('sg-engine');
        if (eng) eng.textContent = 'In this browser: ' + info.dh + ', signatures with ' + info.sig + '.';
        var join = SG.joinFromHash();
        if (join && end) show('two', join);
        else {
            show('one');
            if (join) tell('Two phones need the relay, which is not set up on this site yet. Here is the one-device version.');
        }
        /* a link pasted into this tab */
        window.addEventListener('hashchange', function () {
            var j = SG.joinFromHash();
            if (j && end) show('two', j);
        });
    }, function () {
        app.textContent = '';
        app.appendChild(h('p.sg-say.sg-bad', { text: 'This browser has no WebCrypto, which the demo needs. A current Chrome, Firefox or Safari has it.' }));
    });
})(window.SG);
