    /* ---------- Kitty Kart Duo: a race with a friend on another device ----------
       One player hosts and gets a four letter code from the site's counter (api.server, tools/workers/stats/worker.js);
       the friend types it in. The counter only passes the two WebRTC offers on, then forgets them; from then on the two
       devices talk directly over two data channels: "fast" (unordered, never resent) for the friend's keys and the
       host's snapshots, "sure" (reliable, in order) for what must arrive: start, go, sounds and speech, leaving.
       The host runs the race as if alone, with the friend's kart (pal, karts[1]) steered by the keys they send. The
       friend's device runs no race at all: it shows the host's snapshots (30 a second) LAG seconds late, blending the
       two around that moment so that everything moves smoothly. Nothing is saved: no best times, no last track.
       The host's "start" and the friend's "ready" also carry that player's kit (skin and look, myKit), checked on
       arrival (cleanKit), so both screens draw both players' karts; from an older version it is missing (or ignored
       there), and the kart keeps its default look. A kart being put back after a cut has flag 128 in the snapshot. */
    var LAG = 0.1, SNAP_MS = 33, KF = 13, ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }], PH = ['pick', 'count', 'race', 'done'];
    var SERVER = (api.server || '').replace(/\/+$/, '');
    var pc = null, fast = null, sure = null, gen = 0, linked = false, role = '', roomCode = null, roomKey = null, codeAt = 0, heard = 0;
    var raceNo = 0, ready = false, snapAt = 0, snapSeq = 0, yarnId = 0, doneAt = 0, myDone = false, palUsed = 0;
    var palIn = { thr: 0, want: 0, use: 0, seq: 0, at: 0 };
    var snaps = [], vclock = -1, lastSeq = 0, cd = -1, sinceGo = 0, uses = 0, inSeq = 0, sentAt = 0, heldItem = null, resKey = '';
    var duoLevel = 'normal', lobbyEl = null, resEl = null, pickBack = null, acts = [];
    var CAT_NAMES = [null, null, 'Black cat', 'White cat'];
    var FAIL = {
        nocode: ['Code not found', 'There is no race with that code, or it has expired (codes last two minutes). Check the letters, or ask your friend for a new code.'],
        taken: ['That race is taken', 'Someone already joined with this code. Ask your friend for a new one.'],
        direct: ['Could not connect', 'Your two devices could not reach each other directly. Kitty Kart Duo needs both on the same ' +
            'home wifi; a phone\'s hotspot, two mobile networks, VPNs and some university, hotel or café networks keep devices apart. ' +
            'To play on one phone, the two of you sharing it, use Kitty Kart Split Screen.'],
        server: ['Could not reach the server', 'Check your internet connection and try again.'],
        full: ['Too many races right now', 'Please try again in a minute.'],
        none: ['Not available here', 'Racing a friend needs the site\'s small server, which this copy of the site does not have.'],
        old: ['Not in this browser', 'Racing a friend needs WebRTC, which this browser does not offer. A current Firefox, Chrome or Safari has it.']
    };
    if (duo) {
        try { var pref = JSON.parse(localStorage.getItem('kitty-kart-duo')); if (pref && /^(easy|normal|hard)$/.test(pref.level)) duoLevel = pref.level; } catch (e) { /* none yet */ }
        lobbyEl = document.createElement('div');
        lobbyEl.className = 'kk-lobby';
        lobbyEl.innerHTML = '<div class="kk-pick-box kk-lb" role="dialog" aria-label="Race a friend">' +
            '<section data-s="menu"><h3>Race a friend</h3><p class="kk-lb-p">Open this game on two phones or computers, <b>both on the same home wifi</b>. ' +
            'One of you hosts and gets a code, the other joins with it, and the race runs straight between your two devices.</p>' +
            '<p class="kk-lb-p kk-lb-wifi">A phone\'s hotspot, two mobile networks, VPNs and some university, hotel or café networks will not work. ' +
            'To play on one phone, the two of you sharing it, use <a href="#play/kitty-kart-split">Kitty Kart Split Screen</a> instead: no network needed.</p>' +
            '<div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-big" data-a="host">Host a race</button>' +
            '<button type="button" class="kk-lb-btn kk-lb-big" data-a="join">Join a race</button></div>' +
            '<p class="kk-lb-small">Your two devices see each other\'s network address, as with any direct connection. <a href="/privacy/">Privacy</a></p></section>' +
            '<section data-s="code"><h3>Your race code</h3><p class="kk-code"></p>' +
            '<p class="kk-lb-p">Read it out to your friend. They open this game, tap Join a race and type it.</p>' +
            '<p class="kk-lb-wait">Waiting for your friend…</p><div class="kk-lb-row"><button type="button" class="kk-lb-btn" data-a="menu">Cancel</button></div></section>' +
            '<section data-s="join"><h3>Join a race</h3><p class="kk-lb-p">Type the code shown on your friend\'s screen.</p>' +
            '<div class="kk-lb-row"><input class="kk-in" type="text" maxlength="4" autocomplete="off" autocorrect="off" autocapitalize="characters" ' +
            'spellcheck="false" enterkeyhint="go" aria-label="Race code"><button type="button" class="kk-lb-btn kk-lb-go" data-a="go">Join</button></div>' +
            '<p class="kk-lb-err" role="alert"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn" data-a="menu">Back</button></div></section>' +
            '<section data-s="msg"><h3></h3><p class="kk-lb-p"></p><div class="kk-lb-row"></div></section></div>';
        wrapEl.appendChild(lobbyEl);
        resEl = document.createElement('div');
        resEl.className = 'kk-res';
        resEl.innerHTML = '<div class="kk-pick-box kk-lb" role="dialog" aria-label="Results"><h3>Results</h3><ol class="kk-res-list"></ol>' +
            '<p class="kk-lb-p kk-res-note"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-go" data-a="again">Rematch</button>' +
            '<button type="button" class="kk-lb-btn" data-a="new">New track</button><button type="button" class="kk-lb-btn" data-a="leave">Leave</button></div></div>';
        wrapEl.appendChild(resEl);
        /* the track picker, for the host: also the computer cats' level, and a way back */
        var pickBox = wrapEl.querySelector('.kk-pick-box'), lv = document.createElement('div');
        pickBox.querySelector('h3').textContent = 'Pick a track for your race';
        lv.className = 'kk-lvl';
        lv.innerHTML = '<span>Computer ' + (DOG ? 'dogs' : 'cats') + '</span><button type="button" data-l="easy">Easy</button><button type="button" data-l="normal">Normal</button><button type="button" data-l="hard">Hard</button>';
        pickBox.insertBefore(lv, mapsEl);
        pickBack = document.createElement('button');
        pickBack.type = 'button'; pickBack.className = 'kk-lb-btn kk-pick-back'; pickBack.textContent = 'Back';
        pickBox.appendChild(pickBack);
        var levelBtns = function () { Array.prototype.forEach.call(lv.querySelectorAll('button'), function (b) { b.classList.toggle('kk-sel', b.dataset.l === duoLevel); }); };
        levelBtns();
        api.on(lv, 'click', function (e) { var b = e.target.closest('button'); if (b) { duoLevel = b.dataset.l; levelBtns(); } });
        api.on(pickBack, 'click', function () { menu(); });
        api.on(lobbyEl, 'click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            var a = b.dataset.a;
            if (a === 'host') {
                if (!SERVER) fail('none'); else if (!window.RTCPeerConnection) fail('old'); else showPicker();
            } else if (a === 'join') {
                if (!SERVER) fail('none'); else if (!window.RTCPeerConnection) fail('old'); else joinScreen();
            } else if (a === 'go') joinRoom();
            else if (a === 'menu') menu();
            else if (b.dataset.i) acts[+b.dataset.i]();
        });
        var codeIn = lobbyEl.querySelector('.kk-in');
        api.on(codeIn, 'input', function () {
            var v = codeIn.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
            if (v !== codeIn.value) codeIn.value = v;
            lobbyEl.querySelector('.kk-lb-err').textContent = '';
        });
        api.on(codeIn, 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); joinRoom(); } });
        api.on(resEl, 'click', function (e) {
            var b = e.target.closest('button');
            if (!b || b.disabled) return;
            if (b.dataset.a === 'again') startRace();
            else if (b.dataset.a === 'new') { send({ t: 'pick' }); showPicker(); }
            else if (b.dataset.a === 'leave') leave();
        });
        /* silence: no word from the friend for 5 s means they are gone (a little grace after this tab was hidden) */
        api.interval(function () {
            if (!linked) return;
            send({ t: 'ping' });
            if (performance.now() - heard > 5000) lost();
        }, 1000);
        api.on(document, 'visibilitychange', function () { if (!document.hidden) heard = Math.max(heard, performance.now() - 3000); });
        api.on(window, 'pagehide', function () { if (linked) send({ t: 'bye' }); if (roomCode) closeRoom(); });
        lobby('menu');
    }

    /* the lobby: one of its parts at a time (menu, code, join, msg), or none */
    function lobby(name) {
        wrapEl.classList.toggle('kk-lobby-on', !!name);
        Array.prototype.forEach.call(lobbyEl.querySelectorAll('section'), function (s) { s.classList.toggle('kk-on', s.dataset.s === name); });
    }
    function msg(title, text, list) {  /* a message with buttons: list of [label, action, main] */
        var s = lobbyEl.querySelector('[data-s="msg"]'), row = s.querySelector('.kk-lb-row');
        s.querySelector('h3').textContent = title;
        s.querySelector('p').textContent = text;
        row.innerHTML = '';
        acts = [];
        list.forEach(function (o, i) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'kk-lb-btn' + (o[2] ? ' kk-lb-go' : ''); b.textContent = o[0]; b.dataset.i = i;
            acts.push(o[1]); row.appendChild(b);
        });
        lobby('msg');
    }
    function menu() { teardown(true); lobby('menu'); }
    function joinScreen() {
        teardown(true);
        lobby('join');
        var inp = lobbyEl.querySelector('.kk-in');
        lobbyEl.querySelector('.kk-lb-err').textContent = '';
        try { inp.focus(); } catch (e) { /* fine */ }
    }
    function showPicker() {  /* the host picks a track (and, before a friend is there, the level of the computer cats) */
        phase = 'pick'; ready = false;
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        lobby(null);
        wrapEl.querySelector('.kk-pick-tip').textContent = (api.touch ? 'Tap a track' : 'Click a track, or arrows and Enter') + (linked ? ' to race' : ' to get your code');
        pickBack.hidden = linked;
        wrapEl.querySelector('.kk-lvl').hidden = linked;
    }
    function picked() {
        try { localStorage.setItem('kitty-kart-duo', JSON.stringify({ level: duoLevel })); } catch (e) { /* private mode: fine */ }
        if (linked) startRace(); else hostRoom();
    }
    /* the ways to reach a device that its description offers, e.g. "2 local (hidden), 1 public": for the details line */
    function ways(d) {
        var n = { ip: 0, mdns: 0, srflx: 0, relay: 0 }, out = [];
        ((d && d.sdp) || '').split('\n').forEach(function (l) {
            var m = /^a=candidate:\S+ \d+ \S+ \d+ (\S+) \d+ typ (\w+)/.exec(l);
            if (!m) return;
            if (m[2] === 'host') n[/\.local$/.test(m[1]) ? 'mdns' : 'ip']++; else if (m[2] === 'srflx' || m[2] === 'prflx') n.srflx++; else n.relay++;
        });
        if (n.ip) out.push(n.ip + ' local');
        if (n.mdns) out.push(n.mdns + ' local (hidden)');
        if (n.srflx) out.push(n.srflx + ' public');
        if (n.relay) out.push(n.relay + ' relay');
        return out.length ? out.join(', ') : 'none';
    }
    function fail(kind) {
        var was = role, text = FAIL[kind][1];
        if (kind === 'direct' && pc) text += ' Details: this device offered ' + ways(pc.localDescription) + '; your friend\'s ' +
            ways(pc.remoteDescription) + '; state ' + pc.iceConnectionState + '.';
        teardown(true);
        var again = kind === 'none' || kind === 'old' ? [] : [[kind === 'nocode' || kind === 'taken' ? 'Try another code' : 'Try again', was === 'guest' ? joinScreen : was === 'host' ? hostRoom : menu, 1]];
        msg(FAIL[kind][0], text, again.concat([['Back to the lobby', menu]]));
    }
    function lost() {  /* the friend left, closed the game or lost the connection */
        teardown(true);
        msg('Your friend left', 'The connection to your friend has ended.', [['Back to the lobby', menu, 1]]);
    }
    function leave() { send({ t: 'bye' }); menu(); }

    /* ---------- signalling: the counter passes the offer and the answer on ----------
       The host asks for a room with a host key ("k": 1); the counter sends one back (a counter from before the key
       does not, and then everything works as before). Only the host knows it: waiting for the answer sends it in the
       Authorization header, closing the room in the body, never in the address, so nobody else can take the answer
       or close the room. */
    function ask(method, path, body, key) {
        var h = {};
        if (body) h['Content-Type'] = 'text/plain';
        if (key) h.Authorization = 'Room ' + key;
        return fetch(SERVER + path, { method: method, cache: 'no-store', credentials: 'omit',
            headers: h, body: body ? JSON.stringify(body) : null })
            .then(function (r) {
                if (r.status !== 200) return { status: r.status };
                return r.json().then(function (d) { return { status: 200, data: d || {} }; });
            });
    }
    function closeRoom() {  /* the host stops waiting: the counter deletes the room now rather than after two minutes */
        var c = roomCode, k = roomKey;
        roomCode = roomKey = null;
        /* text/plain: a simple request (no preflight), which keepalive needs to get out while the page closes */
        try {
            fetch(SERVER + '/room/' + c + '/close', { method: 'POST', keepalive: true, cache: 'no-store', credentials: 'omit',
                headers: k ? { 'Content-Type': 'text/plain' } : {}, body: k ? JSON.stringify({ key: k }) : null }).catch(function () {});
        } catch (e) { /* offline */ }
    }
    function peer() {
        var p = new RTCPeerConnection({ iceServers: ICE }), g = gen;
        fast = p.createDataChannel('fast', { negotiated: true, id: 0, ordered: false, maxRetransmits: 0 });
        sure = p.createDataChannel('sure', { negotiated: true, id: 1 });
        fast.onmessage = function (e) { if (g === gen) { heard = performance.now(); onFast(e.data); } };
        sure.onmessage = function (e) { if (g === gen) { heard = performance.now(); onSure(e.data); } };
        sure.onopen = function () { if (g === gen) linkUp(); };
        sure.onclose = function () { if (g === gen && linked) lost(); };
        p.onconnectionstatechange = function () { if (g === gen && p.connectionState === 'failed') { if (linked) lost(); else fail('direct'); } };
        return p;
    }
    function gathered(p) {  /* the description is sent once, with every way to reach this device: wait for them (4 s at most) */
        return new Promise(function (done) {
            if (p.iceGatheringState === 'complete') { done(); return; }
            api.timeout(done, 4000);
            p.addEventListener('icegatheringstatechange', function () { if (p.iceGatheringState === 'complete') done(); });
        });
    }
    function linkWait(g) { api.timeout(function () { if (g === gen && !linked) fail('direct'); }, 15000); }
    function hostRoom() {
        teardown(true);
        var g = gen;
        role = 'host';
        msg('Getting a code', 'One moment…', [['Cancel', menu]]);
        pc = peer();
        pc.createOffer().then(function (o) { return g === gen ? pc.setLocalDescription(o) : null; })
            .then(function () { return g === gen ? gathered(pc) : null; })
            .then(function () { return g === gen ? ask('POST', '/room', { offer: pc.localDescription.sdp, k: 1 }) : null; })
            .then(function (r) {
                if (!r || g !== gen) return;
                if (r.status !== 200 || !/^[A-Z]{4}$/.test(r.data.code)) { fail(r.status === 503 ? 'full' : 'server'); return; }
                roomCode = r.data.code; codeAt = Date.now();
                roomKey = typeof r.data.key === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(r.data.key) ? r.data.key : null;
                lobbyEl.querySelector('.kk-code').textContent = roomCode;
                lobby('code');
                api.timeout(function () { waitAnswer(g); }, 1200);
            })
            .catch(function () { if (g === gen) fail('server'); });
    }
    function waitAnswer(g) {  /* the host asks every 1.2 s whether the friend has answered */
        if (g !== gen || !roomCode) return;
        if (Date.now() - codeAt > 115000) { expired(); return; }
        ask('GET', '/room/' + roomCode + '/answer', null, roomKey).then(function (r) {
            if (g !== gen) return;
            if (r.status === 204) { api.timeout(function () { waitAnswer(g); }, 1200); return; }
            if (r.status !== 200 || typeof r.data.answer !== 'string') { roomCode = roomKey = null; expired(); return; }
            roomCode = roomKey = null;  /* the counter has deleted the room */
            msg('Connecting', 'Your friend is joining…', [['Cancel', menu]]);
            pc.setRemoteDescription({ type: 'answer', sdp: r.data.answer }).then(function () { linkWait(g); }, function () { if (g === gen) fail('direct'); });
        }, function () { if (g === gen) api.timeout(function () { waitAnswer(g); }, 2500); });  /* a hiccup: ask again */
    }
    function expired() {
        teardown(true);
        msg('Your code expired', 'Codes last two minutes. Get a new one when your friend is ready.', [['New code', hostRoom, 1], ['Back to the lobby', menu]]);
    }
    function joinRoom() {
        var c = lobbyEl.querySelector('.kk-in').value.toUpperCase().replace(/[^A-Z]/g, '');
        if (c.length !== 4) { lobbyEl.querySelector('.kk-lb-err').textContent = 'The code has four letters.'; return; }
        teardown(true);
        var g = gen;
        role = 'guest';
        msg('Joining', 'Looking for the race…', [['Cancel', joinScreen]]);
        ask('GET', '/room/' + c).then(function (r) {
            if (g !== gen) return null;
            if (r.status !== 200 || typeof r.data.offer !== 'string') { fail(r.status === 404 ? 'nocode' : 'server'); return null; }
            pc = peer();
            return pc.setRemoteDescription({ type: 'offer', sdp: r.data.offer })
                .then(function () { return pc.createAnswer(); })
                .then(function (a) { return pc.setLocalDescription(a); })
                .then(function () { return gathered(pc); })
                .then(function () { return g === gen ? ask('POST', '/room/' + c, { answer: pc.localDescription.sdp }) : null; })
                .then(function (r2) {
                    if (!r2 || g !== gen) return;
                    if (r2.status !== 204) { fail(r2.status === 404 ? 'nocode' : r2.status === 409 ? 'taken' : 'server'); return; }
                    msg('Connecting', 'Almost there…', [['Cancel', menu]]);
                    linkWait(g);
                });
        }).catch(function () { if (g === gen) fail('server'); });
    }
    /* back to no friend: closes the connection; fresh: also puts the track back as in the lobby (not when the game closes) */
    function teardown(fresh) {
        gen++;
        if (roomCode) closeRoom();
        var p = pc;
        linked = ready = false; pc = fast = sure = null; role = '';
        if (p) try { p.close(); } catch (e) { /* already closed */ }
        host = remote = false; pal = null; me = karts[0]; palKit = null;
        snaps = []; vclock = -1; cd = -1; sinceGo = 0; myDone = false;
        if (!fresh) return;
        phase = 'pick'; keys = {}; pads = {}; raceTime = 0; place = 4;
        Array.prototype.forEach.call(wrapEl.querySelectorAll('.kk-on'), function (b) { if (b.dataset.k) b.classList.remove('kk-on'); });
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        count(''); hintEl.style.display = '';
        choose(sel);
    }

    /* ---------- the two devices linked ---------- */
    function send(o) { if (sure && sure.readyState === 'open') try { sure.send(JSON.stringify(o)); } catch (e) { /* closing */ } }
    function tell(k, v) { send({ t: 'fx', k: k, v: v }); }
    function linkUp() {
        linked = true; heard = performance.now();
        if (role === 'host') { host = true; pal = karts[1]; startRace(); }
        else { remote = true; me = karts[1]; pal = karts[0]; slot(); msg('Connected', 'Your friend is starting the race…', [['Leave', leave]]); }
    }
    function startRace() {  /* the host: the picked track, for both */
        raceNo++; ready = false;
        LEVEL = duoLevel;
        choose(sel);
        phase = 'pick';
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        send({ t: 'start', n: raceNo, map: MAP.id, kit: myKit() });  /* kit: this player's skin and look (older versions ignore it) */
        msg('Get ready', 'Waiting for your friend\'s screen…', [['Leave', leave]]);
    }
    function begin() {  /* both: the countdown starts (the host's "go" reaches the friend a moment later) */
        raceTime = 0; finishers = 0; place = 4; wrongFor = 0; shake = 0; lastSay = -99; doneAt = 0; myDone = false; sinceGo = 0; resKey = '';
        phase = 'count'; clock = 0; keys = {};
        count(''); hintEl.style.display = '';
        lobby(null);
        wrapEl.classList.remove('kk-picking', 'kk-res-on');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
        api.sfx('tap');
        if (host) { send({ t: 'go', n: raceNo }); ready = true; palIn = { thr: 0, want: 0, use: palIn.use, seq: 0, at: 0 }; palUsed = palIn.use; }
        else cd = 0;
    }
    function onSure(text) {
        var m, i;
        try { m = JSON.parse(text); } catch (e) { return; }
        if (!m || typeof m !== 'object') return;
        if (m.t === 'bye') { lost(); return; }
        if (host) { if (m.t === 'ready' && m.n === raceNo && phase === 'pick') { palKit = cleanKit(m.kit); kits(); begin(); } return; }
        if (!remote) return;
        if (m.t === 'start' && typeof m.n === 'number') {
            for (i = 0; i < MAPS.length && MAPS[i].id !== m.map; i++);
            if (i === MAPS.length) return;
            raceNo = m.n; snaps = []; vclock = -1; lastSeq = 0; myDone = false; heldItem = null; cd = -1; sinceGo = 0; palKit = cleanKit(m.kit);
            phase = 'pick';
            wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
            choose(i);
            msg('Get ready', MAP.name + ', three laps.', [['Leave', leave]]);
            send({ t: 'ready', n: raceNo, kit: myKit() });
        } else if (m.t === 'go' && m.n === raceNo) begin();
        else if (m.t === 'pick') {
            wrapEl.classList.remove('kk-res-on');
            msg('Your friend is picking a track', 'The next race starts as soon as they choose.', [['Leave', leave]]);
        } else if (m.t === 'fx') {
            if (m.k === 's' && /^(tap|pop|point|hit|jump|move)$/.test(m.v)) api.sfx(m.v);
            else if (m.k === 'c' && /^(happy|sad|wow)$/.test(m.v)) api.cat(m.v);
            else if (m.k === 't' && typeof m.v === 'string') say(m.v.slice(0, 80));
            else if (m.k === 'k' && typeof m.v === 'number') { api.sfx('hit'); if (!api.reducedMotion) shake = Math.min(6, m.v / 25); }
        }
    }
    function onFast(text) {
        var m;
        try { m = JSON.parse(text); } catch (e) { return; }
        if (!Array.isArray(m) || m[0] !== raceNo || typeof m[1] !== 'number') return;
        if (host) {  /* the friend's keys: [race, number, throttle, steering, items used so far] */
            if (m[1] <= palIn.seq) return;
            palIn.seq = m[1]; palIn.at = performance.now();
            palIn.thr = clamp(+m[2] || 0, -1, 1); palIn.want = clamp(+m[3] || 0, -1, 1);
            var u = Math.floor(+m[4] || 0);
            if (u > palIn.use) palIn.use = u;
        } else if (remote) {  /* a snapshot, see pack */
            if (m[1] <= lastSeq || m.length < 11 || !Array.isArray(m[6]) || m[6].length !== 4 * KF) return;
            lastSeq = m[1];
            snaps.push(m);
            if (snaps.length > 30) snaps.shift();
        }
    }
    function steerPal(dt) {  /* the host drives the friend's kart with the keys they send (none for a moment: let go) */
        var c = pal, fresh = performance.now() - palIn.at < 400;
        if (c.fin || phase !== 'race') { autopilot(c, 0.45); return; }
        if (split) { drive2(dt); return; }  /* split screen: player 2's keys on this keyboard */
        c.thr = fresh ? palIn.thr : 0;
        c.steer += ((fresh ? palIn.want : 0) - c.steer) * Math.min(1, dt * 10);
        if (c.laser > 0) c.steer = c.steer * 0.3 + 0.7 * clamp(wrap(Math.atan2(c.doty - c.y, c.dotx - c.x) - c.a) * 3, -1, 1);
        if (palIn.use > palUsed) { palUsed = palIn.use; useItem(c); }
    }
    function rd(v, k) { return Math.round(v * k) / k; }
    /* a snapshot: [race, number, clock, race time, phase, fish tins taken (bits), karts (KF numbers each), yarn balls
       (id, x, y, roll), spilt milk (x, y, age), bell rings (kart, age), the track's moving hazards (see hzPack)] */
    function pack() {
        var ks = [], ys = [], ms = [], rs = [], mask = 0, i, c;
        for (i = 0; i < 4; i++) {
            c = karts[i];
            ks.push(rd(c.x, 10), rd(c.y, 10), rd(wrap(c.a), 1000), rd(Math.max(0, c.z), 10), Math.round(c.vx), Math.round(c.vy), rd(c.steer, 100),
                (c.boost > 0 ? 1 : 0) | (c.shield > 0 ? 2 : 0) | (c.tangled > 0 ? 4 : 0) | (c.nap > 0 ? 8 : 0) | (c.laser > 0 ? 16 : 0) | (c.dotS > 0 ? 32 : 0) | (c.spin > 0 ? 64 : 0) | (c.poof > 0 ? 128 : 0),
                c.fall > 0 ? rd(c.fall, 100) : 0, c.k, rd(c.prog, 10), rd(c.fin, 100), c.item ? ITEMS.indexOf(c.item) + 1 : 0);
        }
        for (i = 0; i < tins.length; i++) if (tins[i].t > 0) mask |= 1 << i;
        yarns.forEach(function (y) { if (!y.id) y.id = ++yarnId; ys.push(y.id, rd(y.x, 10), rd(y.y, 10), rd(y.roll % 6.2832, 100)); });
        milks.forEach(function (m) { ms.push(rd(m.x, 10), rd(m.y, 10), rd(m.t, 10)); });
        rings.forEach(function (g) { rs.push(karts.indexOf(g.who), rd(g.t, 100)); });
        return [raceNo, ++snapSeq, rd(clock, 1000), rd(raceTime, 100), PH.indexOf(phase), mask, ks, ys, ms, rs, hzPack()];
    }
    function hzPack() {  /* what moves on the track and is not worked out from the clock alone */
        var m = MAP, out = [];
        if (m === CITY) {
            out.push(rd(m.tram.s, 10), m.tram.dir, rd(m.tram.wait, 100));
            m.cones.forEach(function (q, i) { if (q.vx || q.vy || clock - q.hit < 3) out.push(i, rd(q.x, 10), rd(q.y, 10), rd(q.a, 100)); });
        } else if (m === REEF) out.push(rd(m.turtle.s, 10), m.turtle.dir);
        else if (m === MOON || m === VOLCANO) (m === MOON ? m.met : m.burst.list).forEach(function (q) { out.push(rd(q.x, 10), rd(q.y, 10), rd(q.t, 100)); });
        else if (m === DESERT) { out.push(rd(m.storm.on, 100)); m.weeds.forEach(function (w) { out.push(rd(w.s, 10), rd(w.rot, 100)); }); }
        else if (m === ZOMBIE) m.zs.forEach(function (z) { out.push(rd(z.s, 10), z.dir, rd(Math.max(0, z.down), 10)); });
        return out;
    }
    function mix(u, v, f, jump) { return typeof u !== 'number' || Math.abs(v - u) > jump ? v : u + (v - u) * f; }
    function hzSet(a, b, f) {
        var m = MAP, i, j;
        if (!Array.isArray(a) || !Array.isArray(b)) return;
        if (m === CITY && b.length >= 3) {
            m.tram.s = mix(a[0], b[0], f, 60); m.tram.dir = b[1]; m.tram.wait = b[2];
            for (i = 3; i + 3 < b.length; i += 4) { var q = m.cones[b[i]]; if (q) { q.x = b[i + 1]; q.y = b[i + 2]; q.a = b[i + 3]; q.vx = q.vy = q.va = 0; } }
        } else if (m === REEF && b.length >= 2) { m.turtle.s = mix(a[0], b[0], f, 30); m.turtle.dir = b[1]; }
        else if (m === MOON || m === VOLCANO) {
            var old = m === MOON ? m.met : m.burst.list, list = [], at = m === MOON ? 1.5 : 1.4;
            for (i = 0; i + 2 < b.length; i += 3) {
                var o = null;
                for (j = 0; j < old.length; j++) if (old[j].x === b[i] && old[j].y === b[i + 1]) o = old[j];
                o = o || { x: b[i], y: b[i + 1] };
                o.t = b[i + 2];
                if (o.t >= at && !o.hit) {  /* the rock lands, or the lava bursts: the same puffs as on the host */
                    o.hit = true;
                    for (j = 0; j < 12; j++) puff(m === MOON ? 'dust' : 'lava', o.x, o.y, (Math.random() - 0.5) * 230, (Math.random() - 0.5) * 230, 0.9, m === MOON ? 6 + Math.random() * 6 : 3 + Math.random() * 4);
                }
                list.push(o);
            }
            if (m === MOON) m.met = list; else m.burst.list = list;
        } else if (m === DESERT && b.length >= 7) {
            m.storm.on = b[0];
            m.weeds.forEach(function (w, n) { w.s = mix(a[1 + n * 2], b[1 + n * 2], f, 60); w.rot = mix(a[2 + n * 2], b[2 + n * 2], f, 3); });
        } else if (m === ZOMBIE && b.length >= m.zs.length * 3) {  /* the zombies the host moves; the graves go by the clock */
            m.zs.forEach(function (z, n) { z.s = mix(a[n * 3], b[n * 3], f, 40); z.dir = b[n * 3 + 1]; z.down = b[n * 3 + 2]; var q = side(z.j, z.s); z.x = q.x; z.y = q.y; });
        }
    }
    /* the friend's device, every frame: the moment LAG behind the newest snapshot, blended from the two around it */
    function view(dt) {
        var i, j, c, n = snaps.length, s0 = null, s1 = null, f = 0;
        if (n) {
            var last = snaps[n - 1], aim = last[2] - LAG;
            vclock += dt;
            if (vclock < 0 || Math.abs(aim - vclock) > 0.5) vclock = aim; else vclock += (aim - vclock) * Math.min(1, dt * 2);
            s0 = s1 = snaps[0];
            for (i = 0; i < n; i++) { if (snaps[i][2] <= vclock) s0 = s1 = snaps[i]; else { s1 = snaps[i]; break; } }
            if (s1 !== s0) f = clamp((vclock - s0[2]) / (s1[2] - s0[2]), 0, 1);
            while (snaps.length > 2 && snaps[1][2] <= vclock) snaps.shift();
            clock = Math.max(0, Math.min(vclock, last[2]));
        } else clock += dt;
        if (MAP.update) MAP.update(dt);
        moveParts(dt);
        if (s0) {
            raceTime = s0[3] + (s1[3] - s0[3]) * f;
            phase = PH[s1[4]] || phase;
            var a = s0[6], b = s1[6];
            for (i = 0; i < 4; i++) {
                c = karts[i];
                var o = i * KF, fl = b[o + 7], wasZ = c.z;
                c.x = mix(a[o], b[o], f, 150); c.y = mix(a[o + 1], b[o + 1], f, 150);
                c.a = a[o + 2] + wrap(b[o + 2] - a[o + 2]) * f;
                c.z = mix(a[o + 3], b[o + 3], f, 1e9); c.vx = b[o + 4]; c.vy = b[o + 5]; c.steer = mix(a[o + 6], b[o + 6], f, 1e9);
                c.boost = fl & 1 ? 1 : 0; c.shield = fl & 2 ? 1 : 0; c.tangled = fl & 4 ? 1 : 0; c.nap = fl & 8 ? 1 : 0;
                c.laser = fl & 16 ? 1 : 0; c.dotS = fl & 32 ? 1 : -1; c.spin = fl & 64 ? 1 : 0; c.poof = fl & 128 ? 1 : 0;
                c.fall = b[o + 8] > 0 ? mix(a[o + 8] || b[o + 8], b[o + 8], f, 1e9) : 0;
                c.k = b[o + 9]; c.prog = b[o + 10]; c.fin = b[o + 11]; c.item = ITEMS[b[o + 12] - 1] || null;
                c.vf = c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
                if (c.laser) setDot(c, i);
                if (wasZ > 0 && !(c.z > 0)) for (j = 0; j < 6; j++) puff('dust', c.x, c.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 0.8, 5 + Math.random() * 5);
                if (c.boost && Math.random() < 0.6) puff('leaf', c.x - Math.cos(c.a) * 18, c.y - Math.sin(c.a) * 18, -c.vx * 0.2 + (Math.random() - 0.5) * 60, -c.vy * 0.2 + (Math.random() - 0.5) * 60, 0.5, 3);
                if (MAP === REEF && Math.abs(c.vf) > 40 && vis(c.x, c.y, 40) && (c.bt = (c.bt || 0) - dt) <= 0) {
                    c.bt = 0.12;
                    puff('bub', c.x - Math.cos(c.a) * 17, c.y - Math.sin(c.a) * 17, -c.vx * 0.1 + (Math.random() - 0.5) * 20, -c.vy * 0.1 + (Math.random() - 0.5) * 20, 1.1, 2 + Math.random() * 2.5);
                }
            }
            for (i = 0; i < tins.length; i++) {
                var gone = (s1[5] >> i) & 1;
                if (gone && !(tins[i].t > 0)) for (j = 0; j < 7; j++) puff('spark', tins[i].x, tins[i].y, (Math.random() - 0.5) * 170, (Math.random() - 0.5) * 170, 0.5, 2.6);
                tins[i].t = gone;
            }
            var had = {}, now = [], ya = s0[7], yb = s1[7];
            yarns.forEach(function (y) { had[y.id] = y; });
            for (i = 0; i + 3 < yb.length; i += 4) {
                var y = had[yb[i]] || { id: yb[i], trail: [] }, x = yb[i + 1], yy = yb[i + 2];
                for (j = 0; j + 3 < ya.length; j += 4) if (ya[j] === y.id) { x = ya[j + 1] + (x - ya[j + 1]) * f; yy = ya[j + 2] + (yy - ya[j + 2]) * f; break; }
                y.x = x; y.y = yy; y.roll = yb[i + 3];
                y.trail.push(x, yy);
                if (y.trail.length > 18) y.trail.splice(0, 2);
                delete had[y.id]; now.push(y);
            }
            Object.keys(had).forEach(function (k) {  /* a yarn ball that hit someone or rolled away */
                for (j = 0; j < 6; j++) { var q = puff('spark', had[k].x, had[k].y, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140, 0.5, 2.4); if (q) q.c = DOG ? '#bef264' : '#f472b6'; }
            });
            yarns = now;
            milks = [];
            for (i = 0; i + 2 < s1[8].length; i += 3) milks.push({ x: s1[8][i], y: s1[8][i + 1], t: s1[8][i + 2] });
            rings = [];
            for (i = 0; i + 1 < s1[9].length; i += 2) rings.push({ who: karts[s1[9][i]] || karts[0], t: s1[9][i + 1] });
            hzSet(s0[10], s1[10], f);
        }
        nearest(me);
        if (cd >= 0) {  /* the countdown runs on this device's own clock, from the host's "go" */
            cd += dt;
            var left = 3 - Math.floor(cd - 0.6);
            if (cd >= 0.6 && left >= 1 && shown.count !== String(left)) { count(String(left)); api.sfx('tap'); }
            if (left < 1) { cd = -1; sinceGo = 0.001; count('Go!', 'kk-go'); api.sfx('point'); hintEl.style.display = 'none'; }
        }
        if (sinceGo > 0) {
            sinceGo += dt;
            if (sinceGo > 0.8 && shown.count === 'Go!') count('');
            if (!me.fin && phase === 'race') {
                var p = rankOf(me);
                if (p !== place && clock - lastSay > 6) {
                    if (p === 1) { api.cat('happy'); say('Purr! You took the lead!'); }
                    else if (p < place) { api.cat('wow'); say('Nice pass!'); }
                    else if (p === 2 && place === 1) { api.cat('sad'); say('Hiss! Catch them!'); }
                }
                place = p;
                var wrong = Math.abs(wrap(me.a - me.ang)) > 2.1 && me.vf > 20 && !me.spin && !me.fall;
                wrongFor = wrong ? wrongFor + dt : 0;
                if (sinceGo > 1.4) count(wrongFor > 0.8 ? 'Wrong way!' : '', 'kk-warn');
            }
        }
        if (me.fin && !myDone && sinceGo > 0) duoFinish();
        if (me.item !== heldItem) { heldItem = me.item; slot(); }
        camX += (me.x + me.vx * 0.4 - camX) * Math.min(1, dt * 4);
        camY += (me.y + me.vy * 0.4 - camY) * Math.min(1, dt * 4);
        shake = Math.max(0, shake - dt * 20);
    }
    function duoFinish() {  /* this player is through; the race goes on until both are (then the host can start another) */
        myDone = true; doneAt = clock; place = rankOf(me);
        count(''); show();
        var beat = !pal.fin || me.fin < pal.fin;
        api.cat(beat ? 'happy' : 'sad'); api.sfx(beat ? 'win' : 'lose');
        api.say(dogify(place === 1 ? 'Purrfect! First place!' : beat ? 'Ahead of your friend!' : 'Your friend was quicker. Rematch?'), 2400);
        if (host && pal.fin) phase = 'done';
        resKey = '';
        api.timeout(function () { if (myDone) wrapEl.classList.add('kk-res-on'); }, 650);
    }
    function results() {  /* the results box, rebuilt when something in it changes */
        var order = karts.slice().sort(function (a, b) { return ahead(a, b) ? -1 : ahead(b, a) ? 1 : 0; });
        var again = host && (phase === 'done' || clock - doneAt > 30);
        var key = order.map(function (c) { return karts.indexOf(c) + ':' + c.fin; }).join() + again + host;
        if (key === resKey) return;
        resKey = key;
        var list = resEl.querySelector('.kk-res-list');
        list.innerHTML = '';
        order.forEach(function (c, i) {
            var li = document.createElement('li');
            li.innerHTML = '<b></b><i></i><span></span><em></em>';
            if (c === me) li.className = 'kk-me';
            li.querySelector('b').textContent = i + 1;
            li.querySelector('i').style.background = kartCol(c);
            li.querySelector('span').textContent = c === me ? 'You' : c === pal ? 'Your friend' : dogify(CAT_NAMES[karts.indexOf(c)]);
            li.querySelector('em').textContent = c.fin ? c.fin.toFixed(1) + ' s' : 'still racing';
            list.appendChild(li);
        });
        resEl.querySelector('.kk-res-note').textContent = host ? (phase === 'done' ? 'Race again on this track, or pick another.' : 'Waiting for your friend to finish…') :
            pal.fin ? 'Your friend picks what comes next.' : 'Your friend is still racing.';
        resEl.querySelector('[data-a="again"]').hidden = resEl.querySelector('[data-a="new"]').hidden = !host;
        resEl.querySelector('[data-a="again"]').disabled = resEl.querySelector('[data-a="new"]').disabled = !again;
    }
    function duoTick(now) {  /* after every frame: snapshots out (host), keys out (friend), the results box */
        if (myDone) results();
        if (!linked || !fast || fast.readyState !== 'open') return;
        if (host && ready && now - snapAt >= SNAP_MS - 4 && fast.bufferedAmount < 65536) {
            snapAt = now;
            var t = JSON.stringify(pack());
            if (test) test.snapBytes = Math.max(test.snapBytes || 0, t.length);
            fast.send(t);
        }
        if (remote && phase !== 'pick' && now - sentAt >= 15) {
            sentAt = now;
            var thr = (keys.up || pads.up ? 1 : 0) - (keys.down || pads.down ? 1 : 0), want = (keys.right || pads.right ? 1 : 0) - (keys.left || pads.left ? 1 : 0);
            if (test && test.bot && phase === 'race' && !me.fin) {  /* test only: the computer drives the friend's keys */
                autopilot(me, test.skill || 0.9); thr = me.thr; want = me.steer;
                if (me.item && Math.random() < 0.02) uses++;
            }
            fast.send(JSON.stringify([raceNo, ++inSeq, thr, rd(want, 100), uses]));
        }
    }
    if (test) test.hz = function () { return [rd(clock, 100), hzPack()]; };  /* only on the test page: the moving hazards, to compare host and friend */
    if (test) test.duo = function () {
        return { role: host ? 'host' : remote ? 'guest' : role, linked: linked, code: roomCode, race: raceNo, phase: phase, place: place, time: raceTime,
            lobby: wrapEl.classList.contains('kk-lobby-on') ? (lobbyEl.querySelector('section.kk-on') || {}).dataset.s : null,
            title: (lobbyEl.querySelector('[data-s="msg"] h3') || {}).textContent, results: wrapEl.classList.contains('kk-res-on'),
            snaps: snaps.length, snapBytes: test.snapBytes || 0, map: MAP.id, uses: uses, palUsed: palUsed,
            karts: karts.map(function (c) { return [Math.round(c.x), Math.round(c.y), c.k, c.fin, c.item]; }), me: karts.indexOf(me) };
    };

