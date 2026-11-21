/* Cipher History story: Venona, 1943 to 1980 (content/cipher-history/venona.md).
   Soviet messages were put into code (words into groups of digits) and then a one-time pad's key was added digit
   by digit. Used once, the pad leaves nothing to find. But some pad pages were printed twice, so two messages could
   share a key: a "depth". The machine: the visitor's words through a codebook of ours (with a spell table for other
   words) and a fresh pad page. Your turn: two messages of ours in depth; subtract to remove the key, then drag guessed
   words along (38-desk-depth.js). The codebook, the messages and the key are made up (see test/stories.test.js). */
(function () {
    'use strict';
    /* our codebook: words into four digit groups */
    var BOOK = {
        ADDRESS: '1194', AGENT: '3616', ARRIVED: '1607', BY: '5914', CENTRE: '1652', COURIER: '2908',
        DOCUMENTS: '9285', FACTORY: '0822', FOLLOW: '8239', FOR: '5682', FRIDAY: '1389', FROM: '6366',
        INSTRUCTIONS: '4790', MEET: '1931', MEETING: '2972', MET: '8524', MONDAY: '3940', MONEY: '9072', NEW: '0879',
        NEXT: '5520', ON: '2396', PHOTOGRAPHED: '4673', PLANS: '4031', POUCH: '8317', RECEIVED: '3581',
        REPLY: '4287', REPORT: '0029', SEND: '1346', SOURCE: '8120', STATION: '1981', STOP: '3827', TO: '8110',
        URGENT: '8023', WEEK: '3865', WITH: '6316'
    };
    /* the spell table: for words that are not in the book, SPELL, then one group per letter, then SPELL again */
    var SPELL = '9999';
    function letterGroup(L) { return String(1000 + (L.charCodeAt(0) - 65) * 37).slice(-4); }

    var A = '7613 6326 3177 6398 2160 5271 0687 3260 7948 8687 6207';
    var B = '9370 9622 4029 1355 1508 3754 3098 9667 4239 6538 1717';
    var ANSWER = 'f170c6';     /* CH.print of both messages, A then B, see test/stories.test.js */

    function encode(text) {
        var out = [];
        String(text).toUpperCase().split(/[^A-Z]+/).filter(Boolean).forEach(function (w) {
            if (BOOK[w]) { out.push({ w: w, g: BOOK[w] }); return; }
            out.push({ w: 'spell', g: SPELL });
            w.split('').forEach(function (L) { out.push({ w: L.toLowerCase(), g: letterGroup(L) }); });
            out.push({ w: 'spell', g: SPELL });
        });
        return out;
    }
    function padGroup() { var s = ''; for (var i = 0; i < 4; i++) s += Math.floor(Math.random() * 10); return s; }

    CH.story({
        id: 'venona',
        book: BOOK,
        a: A,
        b: B,
        answer: ANSWER,
        encode: encode,
        machine: function (el) {
            var input = CH.textarea('Courier arrived with money stop', 2);
            el.appendChild(CH.field('Your text', input));
            var row = CH.el('div', { class: 'ch-row' });
            el.appendChild(row);
            var grid = CH.el('div', { class: 'ch-dp-cards is-machine', 'aria-live': 'polite' });
            el.appendChild(grid);
            var note = CH.el('p', { class: 'ch-help' });
            el.appendChild(note);
            var pad = [];
            row.appendChild(CH.button('Tear off a new pad page', function () { pad = []; draw(); }));
            function draw() {
                var code = encode(input.value).slice(0, 30);
                while (pad.length < code.length) pad.push(padGroup());
                CH.clear(grid);
                code.forEach(function (c, i) {
                    grid.appendChild(CH.el('div', { class: 'ch-dp-card' }, [
                        CH.el('i', { class: 'ch-dp-w', text: c.w.toLowerCase() }),
                        CH.el('span', { class: 'ch-dp-code', text: c.g }),
                        CH.el('span', { class: 'ch-dp-k', text: '+ ' + pad[i] }),
                        CH.el('b', { class: 'ch-dp-c', text: CH.depth.add(c.g, pad[i]) })
                    ]));
                });
                note.textContent = code.length ? 'Each card: the word, its code group, the key from the pad, and what is sent. Every key digit is random, so the sent digits are random too: without the pad, any message of this length is just as likely. Used once, this cannot be broken.' : '';
            }
            input.addEventListener('input', draw);
            draw();
        },
        puzzle: function (el, turn) {
            CH.desk.depth(el, {
                a: A.split(' '), b: B.split(' '), book: BOOK,
                onChange: function (d) {
                    if (CH.print(d.words('a') + ' ' + d.words('b')) === ANSWER) { turn.solved('Solved: both messages read, and you never had the key. The key under each card is the reused pad page.'); return; }
                    if (!d.subtracted()) { turn.say('Start by subtracting: the key cancels out.'); return; }
                    var f = d.filled();
                    turn.say(f ? f + ' of ' + d.size + ' places read in both messages.' : 'Pick a word you expect in a Soviet telegram and see where it fits.');
                }
            });
        }
    });
})();
