/* Signal's Double Ratchet, part 9: the start. A bar with the player's controls (filled by 30-local.js) and "Start
   again", then the demo. Without WebCrypto the page says so in one line. */
(function (SG) {
    'use strict';
    var root = document.getElementById('sg'), app = document.getElementById('sg-app');
    if (!root || !app) return;
    var h = SG.h, cur = null;
    var tools = h('span.sg-tools');
    var again = h('button.sg-link.sg-again', { type: 'button', text: 'Start again', onclick: start });
    var stage = h('div.sg-stage');

    function start() {
        if (cur) cur.stop();
        stage.textContent = '';
        tools.textContent = '';
        cur = SG.local(stage, tools);
    }

    SG.ready.then(function (info) {
        var eng = document.getElementById('sg-engine');
        if (eng) eng.textContent = 'In this browser: ' + info.dh + ', signatures with ' + info.sig + '.';
        app.textContent = '';
        app.appendChild(h('div.sg-modes', {}, [tools, again]));
        app.appendChild(stage);
        start();
    }, function () {
        app.textContent = '';
        app.appendChild(h('p.sg-say.sg-bad', { text: 'This browser has no WebCrypto, which the demo needs. A current Chrome, Firefox or Safari has it.' }));
    });
})(window.SG);
