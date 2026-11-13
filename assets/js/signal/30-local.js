/* Signal in two browsers, part 4: one device. Alice and Bob side by side in this tab, Eve under them reading the
   wire. The visitor agrees a key (X3DH), chats both ways (the Double Ratchet) and steals one side's keys: Eve then
   reads the next messages but none of the earlier ones (forward secrecy), and loses access again once a fresh
   ratchet key has gone round (post-compromise security). */
(function (SG) {
    'use strict';
    var h = SG.h, N = SG.NAMES;
    var LINES = { A: ['Hi Bob', 'Lunch at 12?', 'See you there'], B: ['Hi Alice', 'Sure, 12 works', 'Great'] };

    SG.local = function (app) {
        var R = { A: new SG.Ratchet(), B: new SG.Ratchet() }, eve = new SG.Eve();
        var busy = false, agreed = false, stolen = '', lost = false, sent = 0, said = { A: 0, B: 0 }, lastPub = {}, log = [];
        var bob = null, ikA = null, dead = false;
        var cards = { A: new SG.Card({ side: 'A', onSend: function (t) { send('A', t); } }),
            B: new SG.Card({ side: 'B', onSend: function (t) { send('B', t); } }) };
        var wire = new SG.Wire({ eve: true });
        var say = h('p.sg-say');
        var agreeBtn = h('button.sg-btn.sg-main', { type: 'button', text: 'Agree a key', disabled: true, onclick: function () { agree().catch(fail); } });
        var thief = { A: h('button.sg-btn', { type: 'button', text: 'Steal Alice’s keys', disabled: true, onclick: function () { steal('A'); } }),
            B: h('button.sg-btn', { type: 'button', text: 'Steal Bob’s keys', disabled: true, onclick: function () { steal('B'); } }) };
        var eveSay = h('p.sg-eve-say', { text: 'Eve sees every message on the network, as ciphertext.' });
        var box = { rows: {}, keys: h('dl.sg-keys.sg-stolen') };
        var agreeRow = h('div.sg-agree', {}, [agreeBtn]);
        app.appendChild(say);
        app.appendChild(h('div.sg-pair', {}, [cards.A.el, cards.B.el]));
        app.appendChild(agreeRow);
        app.appendChild(h('section.sg-eve', { 'aria-label': 'Eve' }, [
            h('div.sg-eve-head', {}, [h('h2.sg-name', { text: 'Eve, on the network' }), h('span.sg-thieves', {}, [thief.A, thief.B])]),
            eveSay, box.keys, wire.el]));

        /* Bob's keys on the server, Alice's identity key */
        SG.say(say, 'Bob has published his public keys. Alice uses them to agree a key with him.');
        (async function () {
            bob = await SG.makeBob();
            ikA = await SG.genDH();
            if (dead) return;
            cards.A.key('ik', 'Identity key', ikA.pub);
            cards.B.key('ik', 'Identity key', bob.ik.pub);
            cards.B.key('spk', 'Signed prekey', bob.spk.pub, 'signed');
            cards.B.key('opk', 'One-time prekey', bob.opk.pub);
            agreeBtn.disabled = false;
        })().catch(fail);

        async function agree() {
            agreeBtn.disabled = true;
            var a = await SG.x3dhAlice(ikA, SG.bundleOf(bob));
            cards.A.key('ek', 'Ephemeral key', a.ek.pub);
            var b = await SG.x3dhBob(bob, ikA.pub, a.ek.pub);
            if (!SG.same(a.sk, b.sk)) throw new Error('X3DH: the keys differ');
            cards.A.key('sk', 'Shared key', a.sk, 'from 4 DH', 'sg-match');
            cards.B.key('sk', 'Shared key', b.sk, 'from 4 DH', 'sg-match');
            agreeRow.remove();
            SG.say(say, 'The same key on both sides, and it never crossed the network.', 'sg-good');
            await new Promise(function (ok) { SG.later(1200, ok); });
            /* used once, then deleted: the ephemeral key, the one-time prekey and the shared key (now the first root key) */
            cards.A.drop('ek'); cards.B.drop('opk'); cards.A.drop('sk'); cards.B.drop('sk');
            await R.A.initAlice(a.sk, a.ad, bob.spk.pub);
            R.B.initBob(b.sk, b.ad, bob.spk);
            cards.B.removeKey('spk');
            cards.A.ratchet(R.A.view()); cards.B.ratchet(R.B.view());
            lastPub.B = SG.hex(bob.spk.pub);
            agreed = true;
            thief.A.disabled = false; thief.B.disabled = false;
            cards.A.enable(true); cards.A.input.value = LINES.A[0];
            cards.B.enable(false, 'Alice writes first');
            SG.say(say, 'Now chat, both ways. Watch the keys change.');
        }

        async function send(side, text) {
            if (busy || !agreed) return;
            busy = true;
            var o = side === 'A' ? 'B' : 'A';
            try {
                var m = await R[side].encrypt(text);
                var step = lastPub[side] !== SG.hex(m.h.dh);
                lastPub[side] = SG.hex(m.h.dh);
                if (!sent) { cards.A.removeKey('ek'); cards.A.removeKey('sk'); cards.B.removeKey('opk'); cards.B.removeKey('sk'); }
                sent++;
                cards[side].msg(true, text, m.mk);
                cards[side].ratchet(R[side].view());
                said[side]++;
                cards[side].input.value = LINES[side][said[side]] || '';
                var row = wire.add(side, m, step);
                log.push({ from: side, m: m, row: row });
                var d = await R[o].decrypt(m.h, m.ct);
                if (d.step) cards[o].turn();
                cards[o].msg(false, d.text, d.mk);
                cards[o].ratchet(R[o].view());
                if (side === 'A' && cards.B.btn.disabled) { cards.B.enable(true); if (!cards.B.input.value) cards.B.input.value = LINES.B[said.B] || ''; }
                if (stolen) await eveTries(side, m, row);
                else if (sent === 3) SG.say(say, 'Now steal one side’s keys, then keep chatting.');
            } catch (e) { fail(e); }
            busy = false;
        }

        async function eveTries(side, m, row) {
            var t = await eve.follow(side, m);
            SG.eveSays(row, t);
            if (t !== null) {
                lost = false;
                SG.say(eveSay, 'Eve reads the new messages with the stolen keys.', 'sg-bad');
            } else if (!lost) {
                lost = true;
                SG.say(eveSay, 'Eve is locked out again: a fresh ratchet key healed the session.', 'sg-good');
                SG.say(say, 'Steal again, or keep chatting.');
            }
            eveBox();
        }
        function eveBox() {
            SG.Card.prototype.key.call(box, 'rk', 'Root key', eve.rk, eve.rk ? '' : 'lost');
        }

        async function steal(side) {
            if (busy || !agreed) return;
            busy = true;
            var k = eve.steal(side, R[side]);
            stolen = side; lost = false;
            box.keys.textContent = ''; box.rows = {};
            var key = SG.Card.prototype.key;
            key.call(box, 'who', 'Stolen from', null, N[side]);
            key.call(box, 'dh', 'Ratchet private key', R[side].DHs.priv);
            key.call(box, 'rk', 'Root key', k.rk);
            key.call(box, 'cks', 'Sending chain', k.cks);
            key.call(box, 'ckr', 'Receiving chain', k.ckr);
            wire.mark('Eve steals ' + N[side] + '’s keys here');
            for (var i = 0; i < log.length; i++) SG.eveSays(log[i].row, await eve.tryOld(log[i].m), 'key deleted');
            SG.say(eveSay, log.length ? 'Earlier messages stay locked: their keys are already deleted.' : 'Eve has ' + N[side] + '’s keys. Keep chatting.', log.length ? 'sg-good' : 'sg-bad');
            SG.say(say, 'Keep chatting: what can Eve read now?');
            busy = false;
        }

        function fail(e) {
            SG.say(say, 'Something went wrong in this browser (' + (e && e.message || e) + '). Start again?', 'sg-bad');
            busy = false;
        }
        return { stop: function () { dead = true; } };
    };
})(window.SG);
