/* Signal in two browsers, part 8: one device. Alice and Bob side by side in this tab, each with a machine of
   ratchet gears (22-gears.js), Eve under them reading the wire. The visitor watches the X3DH picture make the first
   root key, then chats: every KDF step turns a gear by one tooth, drops a numbered message key that flies to its
   message and is shredded; the receiver's gear turns the same tooth and gets the same key. A change of direction
   turns the big DH gear. Stealing one side's keys gives Eve a red copy of that machine: it follows until the next
   DH turn she cannot compute, then jams. Steps play by themselves (chat) or one per click (step by step), each with
   a one line caption. */
(function (SG) {
    'use strict';
    var h = SG.h, N = SG.NAMES;
    var LINES = { A: ['Hi Bob', 'Lunch at 12?', 'See you there', 'Bring the slides'], B: ['Hi Alice', 'Sure, 12 works', 'Great', 'Will do'] };
    var DH_TEXT = ['Alice’s identity key with Bob’s signed prekey.', 'Alice’s ephemeral key with Bob’s identity key.',
        'Alice’s ephemeral key with Bob’s signed prekey.', 'Alice’s ephemeral key with Bob’s one-time prekey.'];

    SG.local = function (app) {
        var R = { A: new SG.Ratchet(), B: new SG.Ratchet() }, eve = new SG.Eve(), ghost = null;
        var busy = false, agreed = false, said = { A: 0, B: 0 }, lastPub = {}, log = [], held = [];
        var bob = null, ikA = null;
        var say = h('p.sg-say');
        var view = new SG.ChainView();
        var player = new SG.Player({
            say: function (t) { SG.say(say, t); },
            onBusy: function (b) { busy = b; buttons(); },
            onWait: function (w) { nextBtn.disabled = !w; if (w) nextBtn.focus({ preventScroll: true }); }
        });

        /* ---------- controls: chat or step by step, Next, speed ---------- */
        var modes = { chat: h('button.sg-tab', { type: 'button', text: 'Chat', 'aria-pressed': 'true', onclick: function () { mode(false); } }),
            step: h('button.sg-tab', { type: 'button', text: 'Step by step', 'aria-pressed': 'false', onclick: function () { mode(true); } }) };
        var nextBtn = h('button.sg-btn.sg-main', { type: 'button', text: 'Next', disabled: true, onclick: function () { player.next(); } });
        var speed = h('input.sg-speed', { type: 'range', min: '0.5', max: '3', step: '0.25', value: '1', 'aria-label': 'Animation speed',
            oninput: function () { player.speed = +speed.value; } });
        function mode(step) {
            modes.chat.setAttribute('aria-pressed', String(!step));
            modes.step.setAttribute('aria-pressed', String(step));
            nextBtn.hidden = !step;
            player.setStep(step);
        }
        nextBtn.hidden = true;

        /* ---------- the people, their gears, Eve ---------- */
        var mach = {}, cards = {};
        ['A', 'B'].forEach(function (s) {
            cards[s] = new SG.Card({ side: s, hold: true, onSend: function (t, later) { send(s, t, later); } });
            mach[s] = new SG.Machine({ side: s, mirror: s === 'B', onTap: function (k, id) { view.show(mach[s], k, id); } });
            cards[s].slot.appendChild(mach[s].el);
        });
        var x3 = new SG.X3dh();
        var agreeBtn = h('button.sg-btn.sg-main', { type: 'button', text: 'Agree a key', disabled: true, onclick: agree });
        var agreeRow = h('div.sg-agree', {}, [agreeBtn]);
        var pair = h('div.sg-pair', {}, [cards.A.el, cards.B.el]);
        var lines = new SG.Lines(pair);
        var wire = new SG.Wire({ eve: true });
        var thief = { A: h('button.sg-btn', { type: 'button', text: 'Steal Alice’s keys', disabled: true, onclick: function () { steal('A'); } }),
            B: h('button.sg-btn', { type: 'button', text: 'Steal Bob’s keys', disabled: true, onclick: function () { steal('B'); } }) };
        var eveSay = h('p.sg-eve-say', { text: 'Eve sees every message on the network, as ciphertext.' });
        var ghostSlot = h('div.sg-ghostslot');
        app.appendChild(h('div.sg-controls', {}, [say, h('div.sg-ctl', {}, [h('span.sg-seg', {}, [modes.chat, modes.step]), nextBtn,
            h('label.sg-speedl', {}, ['speed ', speed])])]));
        app.appendChild(x3.el);
        app.appendChild(agreeRow);
        app.appendChild(pair);
        app.appendChild(view.el);
        app.appendChild(h('section.sg-eve', { 'aria-label': 'Eve' }, [
            h('div.sg-eve-head', {}, [h('h2.sg-name', { text: 'Eve, on the network' }), h('span.sg-thieves', {}, [thief.A, thief.B])]),
            eveSay, ghostSlot, wire.el]));

        function buttons() {
            var free = !busy && agreed;
            ['A', 'B'].forEach(function (s) {
                var can = free && R[s].canSend();
                cards[s].enable(can, agreed && !R[s].canSend() ? 'Alice writes first' : '');
                if (can && !cards[s].input.value) cards[s].input.value = LINES[s][said[s]] || '';
                thief[s].disabled = !free;
            });
            held.forEach(function (b) { b.disabled = !free; });
        }
        function after() {
            ['A', 'B'].forEach(function (s) { mach[s].markEve(eve.known); });
            if (ghost) ghost.markEve(eve.known);
            view.refresh();
        }
        function step(cap, fn, ms) { player.add(cap, async function () { if (fn) await fn(); after(); }, ms); }
        function play() { return player.go(); }

        /* Bob's keys on the server, Alice's identity key */
        SG.say(say, 'Bob has published his keys. Alice combines them with hers into one secret.');
        (async function () {
            bob = await SG.makeBob();
            ikA = await SG.genDH();
            x3.setKey('ikA', ikA.pub); x3.setKey('ikB', bob.ik.pub); x3.setKey('spkB', bob.spk.pub); x3.setKey('opkB', bob.opk.pub);
            agreeBtn.disabled = false;
        })().catch(fail);

        async function agree() {
            agreeBtn.disabled = true;
            agreeRow.hidden = true;
            var a = await SG.x3dhAlice(ikA, SG.bundleOf(bob));
            var b = await SG.x3dhBob(bob, ikA.pub, a.ek.pub);
            if (!SG.same(a.sk, b.sk)) throw new Error('X3DH: the keys differ');
            var trA = await R.A.initAlice(a.sk, a.ad, bob.spk.pub), trB = R.B.initBob(b.sk, b.ad, bob.spk);
            step('Alice checks the signature on Bob’s prekey and makes an ephemeral key.', function () { x3.setKey('ekA', a.ek.pub); }, 900);
            a.dhs.forEach(function (d, i) { step('DH ' + (i + 1) + ': ' + DH_TEXT[i], function () { x3.dh(i, d); }, 900); });
            step('One KDF turns the four results into the first root key. Bob computes the same one.', function () { x3.kdf(a.sk); }, 1200);
            step('The ephemeral key and the one-time prekey are shredded.', function () { x3.shred(['ekA', 'opkB']); }, 900);
            step('Both machines start from that root key; Bob’s signed prekey is his first DH key.', function () {
                mach.A.apply(trA[0]); trB.forEach(function (e) { mach.B.apply(e); });
            }, 1000);
            step('Alice makes her first DH key pair.', function () { mach.A.apply(trA[1]); mach.A.apply(trA[2]); }, 900);
            step('Her DH gear turns one tooth: DH with Bob’s prekey starts her sending chain.', function () { mach.A.apply(trA[3]); }, 1100);
            step('', function () {
                lastPub.B = SG.hex(bob.spk.pub);
                agreed = true;
                cards.A.input.value = LINES.A[0];
                SG.say(say, 'Now write. Watch the gears.');
            }, 0);
            await play();
        }

        /* ---------- one message ---------- */
        async function send(X, text, later) {
            if (busy || !agreed) return;
            var Y = X === 'A' ? 'B' : 'A';
            busy = true; buttons();
            try {
                var m = await R[X].encrypt(text), ev = m.trace[0], chip = null, row = null;
                var step0 = lastPub[X] !== SG.hex(m.h.dh);
                lastPub[X] = SG.hex(m.h.dh);
                said[X]++;
                cards[X].input.value = LINES[X][said[X]] || '';
                if (cards[X].hold) cards[X].hold.checked = false;
                var lab = function () { return chip ? chip.label : mach[X].label('send', ev.n); };
                step(function () { return N[X] + '’s send gear clicks one tooth: message key ' + lab() + '.'; }, function () { chip = mach[X].apply(ev); }, 900);
                step(function () { return lab() + ' encrypts the message and is shredded; only ciphertext goes out.'; }, async function () {
                    var bubble = cards[X].msg(true, text, chip.label);
                    await SG.fly(chip, bubble.key, 800, player.speed);
                    mach[X].shred(ev.id);
                    row = wire.add(X, m, step0, chip.label);
                    log.push({ from: X, m: m, row: row });
                }, 700);
                var e = eve.who ? await eve.follow(X, m) : null;
                if (e) step(function () {
                    var j = e.trace.some(function (x) { return x.k === 'jam'; });
                    return e.text !== null ? 'Eve’s red copy turns too: she reads it.' : j ? 'Eve’s DH gear jams: she cannot compute this DH. She is locked out.' : 'Eve cannot read it.';
                }, function () {
                    e.trace.forEach(function (x) { if (ghost) ghost.apply(x); });
                    SG.eveSays(row, e.text);
                    SG.say(eveSay, e.text !== null ? 'Eve reads the new messages with the stolen keys.' : 'Eve is locked out: a fresh DH key healed the session.', e.text !== null ? 'sg-bad' : 'sg-good');
                }, 1000);
                if (later) step(function () { return lab() + ' waits on the network. Send more, then deliver it.'; }, function () {
                    held.push(wire.hold(row, function () { deliverLater(X, m, row, lab()); }));
                }, 600);
                else await receive(X, m, function () { return chip; });
                await play();
            } catch (err) { fail(err); }
        }
        async function deliverLater(X, m, row, label) {
            if (busy) return;
            busy = true; buttons();
            try { await receive(X, m, function () { return mach[X].chips[SG.hex(m.h.dh) + ':' + m.h.n]; }); await play(); } catch (err) { fail(err); }
        }

        /* the receiver's steps, from the events of its ratchet */
        async function receive(X, m, sentChip) {
            var Y = X === 'A' ? 'B' : 'A', d = await R[Y].decrypt(m.h, m.ct), tr = d.trace, got = null;
            for (var i = 0; i < tr.length; i++) (function (ev, nx) {
                if (ev.k === 'skip') step(function () { return mach[Y].label('recv', ev.n) + ' has not arrived: ' + N[Y] + '’s gear turns anyway and keeps the key.'; },
                    function () { mach[Y].apply(ev); }, 900);
                else if (ev.k === 'their') { step(N[Y] + ' sees ' + N[X] + '’s new DH key: the DH gear turns and starts a fresh receiving chain.', function () { mach[Y].apply(ev); mach[Y].apply(nx); }, 1300); i++; }
                else if (ev.k === 'gen') { step(N[Y] + ' makes a new DH key pair; the DH gear turns again for a fresh sending chain.', function () { mach[Y].apply(ev); mach[Y].apply(nx); }, 1300); i++; }
                else if (ev.k === 'ck') step(function () { return N[Y] + '’s recv gear clicks the same tooth: the same key ' + mach[Y].label('recv', ev.n) + '.'; }, function () {
                    got = mach[Y].apply(ev);
                    var s = sentChip();
                    if (s && got) lines.add(s, got, 'sg-line-match', 2600);
                }, 1000);
                else if (ev.k === 'useSkip') step(function () { return 'The late message opens with the key kept for it.'; }, function () {
                    got = mach[Y].apply(ev);
                    var s = sentChip();
                    if (s && got) lines.add(s, got, 'sg-line-match', 2600);
                }, 900);
            })(tr[i], tr[i + 1]);
            step(function () { return N[Y] + ' decrypts and shreds ' + (got ? got.label : 'the key') + '.'; }, async function () {
                var bubble = cards[Y].msg(false, d.text, got ? got.label : '');
                await SG.fly(got, bubble.key, 700, player.speed);
                mach[Y].shred(d.id);
            }, 700);
        }

        /* ---------- Eve ---------- */
        function steal(side) {
            if (busy || !agreed) return;
            var tr = eve.steal(side, R[side]);
            step('Eve copies ' + N[side] + '’s gears and current keys (in red). The shredded keys are gone for good.', async function () {
                ghostSlot.textContent = '';
                ghost = new SG.Machine({ side: side, mirror: side === 'B', ghost: true, onTap: function (k, id) { view.show(ghost, k, id); } });
                ghost.base = { send: mach[side].base.send, recv: mach[side].base.recv };
                ghostSlot.appendChild(h('p.sg-ghost-title', { text: 'Eve’s copy of ' + N[side] + '’s gears' }));
                ghostSlot.appendChild(ghost.el);
                tr.forEach(function (e) { ghost.apply(e); });
                mach.A.stolenBy(side === 'A'); mach.B.stolenBy(side === 'B');
                wire.mark('Eve steals ' + N[side] + '’s keys here');
                for (var i = 0; i < log.length; i++) SG.eveSays(log[i].row, await eve.tryOld(log[i].m), 'key shredded');
                SG.say(eveSay, log.length ? 'Earlier messages stay locked: their keys are shredded.' : 'Eve has ' + N[side] + '’s keys.', log.length ? 'sg-good' : 'sg-bad');
            }, 1200);
            step('Keep chatting: how long can Eve follow?', null, 0);
            play();
        }

        function fail(e) {
            SG.say(say, 'Something went wrong in this browser (' + (e && e.message || e) + '). Start again?', 'sg-bad');
            busy = false; buttons();
        }
        return { stop: function () { player.stop(); } };
    };
})(window.SG);
