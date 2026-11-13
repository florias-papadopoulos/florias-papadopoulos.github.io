/* Signal in two browsers, part 5: two phones. The first phone is Bob: it makes a room and a secret and shows them
   as a QR code, a link to this page ending in #<room>/<secret> (the part after # never reaches a server). The other
   phone opens it and is Alice. The relay (tools/workers/live, route /relay/<room>) forwards public keys and
   ciphertexts between the two and keeps nothing. The secret never goes to the relay: each phone uses it to
   authenticate the keys it sends (HMAC), so the relay cannot swap them for its own. */
(function (SG) {
    'use strict';
    var h = SG.h, N = SG.NAMES;
    var Z32 = new Uint8Array(32), ABC = 'abcdefghijklmnopqrstuvwxyz234567';
    var HASH = /^#([a-z2-7]{12})\/([A-Za-z0-9_-]{22})$/;

    /* the room and secret from the address, if this phone came from a QR code */
    SG.joinFromHash = function () {
        var m = HASH.exec(location.hash || '');
        return m ? { room: m[1], secret: m[2] } : null;
    };
    /* is the relay there? (an older deploy of the worker has no /relay) */
    SG.relayOk = function (end) {
        if (!end || !window.fetch) return Promise.resolve(false);
        return fetch(end + '/relay', { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { return !!(j && j.relay === true); }, function () { return false; });
    };

    /* opts: {end: the worker's address, base: this page's address, join: {room, secret} or null} */
    SG.pair = function (app, opts) {
        var me = opts.join ? 'A' : 'B', other = me === 'A' ? 'B' : 'A';
        var room = opts.join ? opts.join.room : '', secret = opts.join ? opts.join.secret : '';
        if (!opts.join) {
            var r = SG.rand(12);
            for (var i = 0; i < 12; i++) room += ABC[r[i] & 31];
            secret = SG.b64u(SG.rand(16));
        }
        var link = opts.base + '#' + room + '/' + secret;
        var ws = null, tries = 0, dead = false, timer = null, ping = null, queue = Promise.resolve();
        var R = new SG.Ratchet(), agreed = false, peers = 0, macKey = null, bob = null, ikA = null, lastPub = {};

        var say = h('p.sg-say');
        var card = new SG.Card({ side: me, me: true, onSend: send });
        var view = new SG.ChainView();
        var mach = new SG.Machine({ side: me, mirror: me === 'B', onTap: function (k, id) { view.show(mach, k, id); } });
        card.slot.appendChild(mach.el);
        /* the gears turn here at once, step after step (no captions) */
        function draw(trace) {
            var chip = null;
            trace.forEach(function (ev) { chip = mach.apply(ev) || chip; });
            view.refresh();
            return chip;
        }
        var wire = new SG.Wire({});
        var safety = h('p.sg-safety');
        var qr = h('div.sg-qr');
        var talk = h('div.sg-talk', { hidden: true }, [safety, card.el, view.el,
            h('section.sg-relay', { 'aria-label': 'What the relay forwards' }, [h('h2.sg-name', { text: 'What the relay forwards' }), wire.el])]);
        app.appendChild(say);
        app.appendChild(qr);
        app.appendChild(talk);

        if (me === 'B') {
            var copy = h('button.sg-btn', { type: 'button', text: 'Copy link', onclick: function () {
                if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { copy.textContent = 'Copied'; }, function () { /* no clipboard */ });
            } });
            qr.appendChild(window.LV && LV.qrImg ? LV.qrImg(link, 'sg-qr-img', 'QR code that opens this page on the other phone') : h('span'));
            /* the link holds the secret: hidden until asked for (screen shares) */
            var shown = h('code', { hidden: true, text: link.replace(/^https?:\/\//, '') });
            var show = h('button.sg-btn', { type: 'button', text: 'Show link', onclick: function () { shown.hidden = !shown.hidden; show.textContent = shown.hidden ? 'Show link' : 'Hide link'; } });
            qr.appendChild(h('p.sg-qr-link', {}, [show, ' ', copy, h('br'), shown]));
            SG.say(say, 'Scan this with the other phone’s camera.');
        } else {
            /* the secret is in memory now; take it out of the address bar and the history */
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* fine */ }
            SG.say(say, 'Connecting to the other phone…');
        }

        (async function () {
            macKey = await SG.hkdf(SG.unb64u(secret), Z32, 'florias.signal.demo.pair', 32);
            /* two phones sign with ECDSA P-256, which every browser has (Ed25519 is still missing in some) */
            if (me === 'B') bob = await SG.makeBob(SG.sigs['ECDSA P-256']); else ikA = await SG.genDH();
            connect();
        })().catch(fail);

        function connect() {
            if (dead) return;
            try { ws = new WebSocket(opts.end.replace(/^http/, 'ws') + '/relay/' + room); } catch (e) { fail(e); return; }
            var opened = false;
            ws.onopen = function () { opened = true; tries = 0; };
            ws.onmessage = function (e) {
                var d = e.data;
                if (typeof d !== 'string' || d === 'pong') return;
                queue = queue.then(function () { return got(d); }).catch(fail);
            };
            ws.onclose = function (e) {
                clearInterval(ping);
                if (dead) return;
                peers = 0; card.enable(false);
                if (e.code === 4003) return end('Two phones are already using this code. Start again on this one.');
                if (e.code === 4008) return end('This pairing ended after 30 minutes. Start again.');
                if (!opened && !tries) return end('The relay can’t be reached right now. Try one device instead.');
                if (++tries > 5) return end('The connection is lost. Start again.');
                SG.say(say, 'Reconnecting…');
                timer = setTimeout(connect, 1000 * Math.pow(2, tries));
            };
            ping = setInterval(function () { if (ws && ws.readyState === 1) ws.send('ping'); }, 30000);
        }
        function out(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
        /* HMAC over the tag and each part with its length in front, so no two different lists give the same input */
        function mac(tag, parts) {
            var all = [SG.utf8(tag)];
            parts.forEach(function (p) { all.push(SG.u32(p.length), p); });
            return SG.hmac(macKey, SG.cat.apply(null, all));
        }

        async function got(d) {
            if (dead) return;
            if (d.slice(0, 6) === 'peers:') {
                peers = +d.slice(6);
                if (peers === 2 && me === 'B' && !agreed && bob) await sendBundle();
                if (peers < 2) {
                    card.enable(false);
                    if (agreed) SG.say(say, 'The other phone has left (or its screen is off).');
                } else if (agreed) { SG.say(say, 'Connected.', 'sg-good'); canWrite(); }
                return;
            }
            var o = null;
            try { o = JSON.parse(d); } catch (e) { return; }
            if (!o || typeof o.t !== 'string') return;
            if (o.t === 'bundle' && me === 'A' && !agreed) await gotBundle(o);
            else if (o.t === 'init' && me === 'B' && !agreed) await gotInit(o);
            else if (o.t === 'msg' && agreed) await gotMsg(o);
        }

        async function sendBundle() {
            var b = SG.bundleOf(bob);
            SG.say(say, 'The other phone is here. Agreeing a key…');
            out({ t: 'bundle', alg: b.alg, ik: SG.b64u(b.ik), sk: SG.b64u(b.sk), spk: SG.b64u(b.spk), sig: SG.b64u(b.sig), opk: SG.b64u(b.opk),
                mac: SG.b64u(await mac('B', [SG.utf8(b.alg), b.ik, b.sk, b.spk, b.opk])) });
        }
        async function gotBundle(o) {
            if (typeof o.alg !== 'string') return end('These keys came in an old format. Reload both phones and start again.');
            var b = { alg: o.alg, ik: SG.unb64u(o.ik), sk: SG.unb64u(o.sk), spk: SG.unb64u(o.spk), sig: SG.unb64u(o.sig), opk: SG.unb64u(o.opk) };
            if (!SG.same(SG.unb64u(o.mac), await mac('B', [SG.utf8(b.alg), b.ik, b.sk, b.spk, b.opk]))) return end('These keys did not come from the phone with the QR code. Start again.');
            var a;
            try { a = await SG.x3dhAlice(ikA, b); } catch (e) { if (e.message === 'alg') return end('This browser cannot check a ' + b.alg + ' signature. Try another browser.'); return end('Bob’s signature does not check out. Start again.'); }
            draw(await R.initAlice(a.sk, a.ad, b.spk));
            out({ t: 'init', ik: SG.b64u(ikA.pub), ek: SG.b64u(a.ek.pub), mac: SG.b64u(await mac('A', [ikA.pub, a.ek.pub, b.ik])) });
            await ready(ikA.pub, b.ik);
        }
        async function gotInit(o) {
            var ik = SG.unb64u(o.ik), ek = SG.unb64u(o.ek);
            if (!SG.same(SG.unb64u(o.mac), await mac('A', [ik, ek, bob.ik.pub]))) return end('These keys did not come from the phone that scanned the code. Start again.');
            var b = await SG.x3dhBob(bob, ik, ek);
            draw(R.initBob(b.sk, b.ad, bob.spk));
            bob.opk = null;   // the one-time prekey is used up
            await ready(ik, bob.ik.pub);
        }
        async function ready(ikAlice, ikBob) {
            agreed = true;
            qr.remove();
            safety.textContent = '';
            safety.appendChild(h('span', { text: 'Both phones show ' }));
            safety.appendChild(h('strong', { text: await SG.safety(ikAlice, ikBob) }));
            talk.hidden = false;
            SG.say(say, 'Key agreed. Only these two phones have it.', 'sg-good');
            canWrite();
            if (me === 'A') card.input.value = 'Hi Bob';
        }
        function canWrite() {
            if (!agreed || peers < 2) return card.enable(false);
            if (R.canSend()) card.enable(true); else card.enable(false, 'Alice writes first');
        }

        async function gotMsg(o) {
            var m;
            try { m = SG.unpack(o); } catch (e) { return; }
            var step = lastPub[other] !== SG.hex(m.h.dh);
            lastPub[other] = SG.hex(m.h.dh);
            var d;
            try { d = await R.decrypt(m.h, m.ct); } catch (e) { card.note('a message that does not decrypt was dropped'); return; }
            var chip = draw(d.trace);
            wire.add(other, m, step, chip && chip.label);
            card.msg(false, d.text, chip && chip.label);
            SG.later(900, function () { mach.shred(d.id); });
            canWrite();
        }
        var sending = false;
        async function send(text) {
            if (sending || !agreed || peers < 2 || !R.canSend()) return;
            sending = true;
            try {
                var m = await R.encrypt(text);
                out(SG.pack(m));
                var step = lastPub[me] !== SG.hex(m.h.dh);
                lastPub[me] = SG.hex(m.h.dh);
                var chip = draw(m.trace), id = SG.hex(m.h.dh) + ':' + m.h.n;
                card.msg(true, text, chip && chip.label);
                SG.later(900, function () { mach.shred(id); });
                wire.add(me, m, step, chip && chip.label);
                card.input.value = '';
            } catch (e) { fail(e); }
            sending = false;
        }

        function end(text) {
            dead = true;
            clearTimeout(timer); clearInterval(ping);
            try { if (ws) ws.close(1000, 'bye'); } catch (e) { /* closed */ }
            card.enable(false);
            SG.say(say, text, 'sg-bad');
        }
        function fail(e) { end('Something went wrong (' + (e && e.message || e) + '). Start again.'); }
        return { stop: function () { if (!dead) end(''); } };
    };
})(window.SG);
