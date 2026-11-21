/* Cipher History story: Enigma and the Polish Cipher Bureau (content/cipher-history/enigma.md).
   The machine: an Enigma I (rotors I to V, reflector B, plugboard, the rotors stepping with each key) on the visitor's
   text (35-desk-enigma.js).
   Your turn: Rejewski's characteristic. Until September 1938 every operator enciphered his message key twice at the
   day's start position, so the first and the fourth letter of each message hide the same key letter. From a day's
   indicators the visitor traces the chains from the 1st to the 4th letter (and 2nd to 5th, 3rd to 6th): their
   lengths do not depend on the plugboard. Then the catalogue (made on the fly, 6 rotor orders x 17,576 positions)
   gives the rotor order and the start position. The day key is ours: rotors III II I, start QHN, rings at A (to keep
   it short; the Poles had to find the ring settings too), six plug pairs. The indicators and the message are made
   with it (see test/stories.test.js); the page keeps only a fingerprint of the answer. */
(function () {
    'use strict';
    var A = CH.ALPHA;
    /* the day's indicators (30 messages) and the first message's text after its indicator */
    var IND = 'YLPGRQ THTTJX NMIWPC KVOBBO FBREMG LKVKKK JZZFOP NNUWCU DAYIUY BFNZNN MWUNLU ZUQYWT AQGRSF MGINQC CJEXIS RDSMFB GYHOXW AWKRLR JNXFCZ EEWPEI WSGCYF HCJHZJ URMJAM OXFDGV PTXADZ SMDQPE IQASSH QPBVHL VOLLTD XICUVA';
    var BODY = 'IZZDRAFHPGWHKUYHYHSNHUKTYDGDJRXLQWTPZNIQBWNTIBUOMGCONKSJD';
    var ANSWER = 'iwivaf';     /* CH.print of the rotor order (I, II, III as A, B, C) and start position, see test/stories.test.js */
    var PLUGS = 'BJ DW FK GT MY OX';   /* the day's plugboard, shown once the catalogue has found the rotors */      /* the day key, shown once the catalogue has found it: rotors, start, plugboard */

    function inds() { return IND.split(' '); }
    /* the answer's fingerprint: rotors I, II, III written A, B, C, then the start, e.g. CBAQHN */
    function keyPrint(order, pos) { return CH.print(order.map(function (r) { return A.charAt(r.length - 1); }).join('') + pos); }
    /* the permutation from position a to position b of the indicators, as an array (undefined where unknown) */
    function link(list, a, b) { var m = []; list.forEach(function (w) { m[A.indexOf(w.charAt(a))] = A.indexOf(w.charAt(b)); }); return m; }

    function tracer(el, list, a, onDone) {
        var map = link(list, a, a + 3), seen = [], lengths = [];
        var box = CH.el('div', { class: 'ch-tr' });
        box.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Letter ' + (a + 1) + ' to letter ' + (a + 4) }));
        var keys = CH.el('div', { class: 'ch-tr-keys' });
        var chains = CH.el('ol', { class: 'ch-tr-chains' });
        var line = CH.el('p', { class: 'ch-tr-line' });
        var btns = [];
        A.split('').forEach(function (L, c) {
            var b = CH.el('button', { type: 'button', class: 'ch-tr-k', text: L, 'aria-label': 'Start a chain at ' + L });
            b.addEventListener('click', function () { trace(c); });
            btns.push(b);
            keys.appendChild(b);
        });
        box.appendChild(keys);
        box.appendChild(chains);
        box.appendChild(line);
        el.appendChild(box);
        function trace(c) {
            if (seen[c]) return;
            var cyc = [], x = c;
            while (!seen[x]) { seen[x] = true; cyc.push(A.charAt(x)); btns[x].disabled = true; btns[x].classList.add('is-used'); x = map[x]; }
            lengths.push(cyc.length);
            chains.appendChild(CH.el('li', {}, [CH.el('span', { class: 'ch-tr-cyc', text: cyc.join(' ') + ' ' + cyc[0] }), CH.el('b', { text: ' ' + cyc.length })]));
            draw();
        }
        function done() { return lengths.reduce(function (s, n) { return s + n; }, 0) === 26; }
        function result() { return lengths.slice().sort(function (p, q) { return q - p; }).join(' '); }
        function draw() {
            line.textContent = lengths.length ? 'Chain lengths: ' + result() + (done() ? '. Complete.' : '. Tap a letter that is not in a chain yet.') : 'Tap any letter to follow its chain.';
            box.classList.toggle('is-done', done());
            onDone();
        }
        draw();
        return { done: done, result: result };
    }

    CH.story({
        id: 'enigma',
        ind: IND,
        body: BODY,
        answer: ANSWER,
        plugs: PLUGS,
        link: link,
        keyPrint: keyPrint,
        machine: function (el) {
            var box = CH.el('div', { class: 'ch-postscript' });
            var draw = function (st) {
                /* 26 doubled message keys at this start, as an operator before September 1938 would send them */
                var list = [];
                for (var i = 0; i < 26; i++) {
                    var k = A.charAt(i) + A.charAt((i + 7) % 26) + A.charAt((i + 13) % 26);
                    list.push(CH.enigma.make({ order: st.order, pos: st.pos, plugs: st.plugs }).text(k + k));
                }
                CH.clear(box);
                box.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Rejewski\'s chains for this setting' }));
                [0, 1, 2].forEach(function (a) {
                    var cyc = CH.enigma.cycles(link(list, a, a + 3)).sort(function (p, q) { return q.length - p.length; });
                    box.appendChild(CH.el('p', { class: 'ch-tr-line', text: 'Letter ' + (a + 1) + ' to ' + (a + 4) + ': lengths ' + cyc.map(function (c) { return c.length; }).join(' ') + (a === 0 ? '; longest chain ' + cyc[0].map(function (x) { return A.charAt(x); }).join(' ') : '') }));
                });
                box.appendChild(CH.el('p', { class: 'ch-help', text: 'Each key is enciphered twice at the start above, as operators did until September 1938. Change the plugboard: the letters in the chains change, their lengths do not. Turn a rotor: the lengths change.' }));
            };
            CH.desk.enigma(el, { order: ['I', 'II', 'III'], pos: 'ABC', plugs: 'AM FI NV PS TU WZ', text: 'Attack at dawn', onChange: draw });
            el.appendChild(box);
            draw({ order: ['I', 'II', 'III'], pos: 'ABC', plugs: 'AM FI NV PS TU WZ' });
        },
        puzzle: function (el, turn) {
            var list = inds();
            el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The day\'s indicators: the first six letters of 30 messages' }));
            el.appendChild(CH.el('p', { class: 'ch-ind ch-text is-cipher', text: list.map(function (w) { return w.slice(0, 3) + ' ' + w.slice(3); }).join('   ') }));
            el.appendChild(CH.el('h3', { class: 'ch-h3', text: '1. Follow the chains' }));
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'A message that starts with D and has V in fourth place says: D leads to V. Look up the message that starts with V, read its fourth letter, and so on, until you are back at D. The page looks up the letters; you choose where to start.' }));
            var lookBtn;
            var trs = [];
            var trBox = CH.el('div', { class: 'ch-trs' });
            el.appendChild(trBox);
            function check() {
                var all = trs.length === 3 && trs.every(function (t) { return t.done(); });
                if (lookBtn) lookBtn.disabled = !all;
                if (!turn.done) turn.say(all ? 'All three chains are complete. Now look them up in the catalogue.' : 'Trace all three: letters 1 to 4, 2 to 5, 3 to 6.');
            }
            for (var a = 0; a < 3; a++) trs.push(tracer(trBox, list, a, function () { if (trs.length === 3) check(); }));
            el.appendChild(CH.el('h3', { class: 'ch-h3', text: '2. Look them up in the catalogue' }));
            el.appendChild(CH.el('p', { class: 'ch-help', text: 'The Poles built a catalogue of these chain lengths for every rotor order and every start position: 6 x 17,576 = 105,456 cases. Your browser makes the same catalogue now, and keeps only the cases that match your three lines.' }));
            var bar = CH.el('progress', { class: 'ch-progress', max: 100, value: 0, hidden: true });
            var res = CH.el('div', { 'aria-live': 'polite' });
            lookBtn = CH.button('Search the catalogue', function () {
                lookBtn.disabled = true;
                bar.hidden = false;
                CH.clear(res);
                var target = trs.map(function (t) { return t.result(); });
                CH.enigma.search(target, function (found) {
                    bar.hidden = true;
                    lookBtn.disabled = false;
                    show(found);
                }, function (p) { bar.value = Math.round(p * 100); });
            }, 'is-primary');
            lookBtn.disabled = true;
            el.appendChild(CH.el('div', { class: 'ch-row' }, [lookBtn, bar]));
            el.appendChild(res);
            function show(found) {
                if (!found.length) { res.appendChild(CH.el('p', { class: 'ch-help', text: 'No position matches. Check the three lines of chain lengths.' })); return; }
                res.appendChild(CH.el('p', { class: 'ch-out-h', text: found.length === 1 ? 'One position in the whole catalogue matches:' : found.length + ' positions match:' }));
                found.forEach(function (f) { res.appendChild(CH.el('p', { class: 'ch-keyline', text: 'Rotors ' + f.order.join(' ') + ', start ' + f.pos })); });
                var hit = found.filter(function (f) { return keyPrint(f.order, f.pos) === ANSWER; })[0];
                if (!hit) return;
                var m = CH.enigma.make({ order: hit.order, pos: hit.pos, plugs: PLUGS });
                var ind = list[0], key = m.text(ind);
                var body = CH.enigma.make({ order: hit.order, pos: key.slice(0, 3), plugs: PLUGS }).text(BODY);
                res.appendChild(CH.el('div', { class: 'ch-postscript' }, [
                    CH.el('p', { class: 'ch-help', text: 'The chains are the same whatever the plugboard, so the catalogue ignores it. With the rotors known, the plugboard can be worked out too (we skip that step). It was: ' + PLUGS + '.' }),
                    CH.el('p', { class: 'ch-out-h', text: 'The first message: indicator ' + ind.slice(0, 3) + ' ' + ind.slice(3) + ' at start ' + hit.pos + ' gives the message key ' + key.slice(0, 3) + ' ' + key.slice(3) + ' (twice, as it should). At start ' + key.slice(0, 3) + ':' }),
                    CH.pre(BODY.replace(/(.{5})/g, '$1 ').trim(), 'is-cipher'),
                    CH.pre(body.toLowerCase(), 'ch-plainout'),
                    CH.el('p', { class: 'ch-help', text: 'Real messages were in German; this one is in English for you.' })
                ]));
                turn.solved('Solved: rotors ' + hit.order.join(' ') + ', start ' + hit.pos + '. You read the day\'s key from the indicators alone.');
            }
            check();
        }
    });
})();
