    /* ---------- the loop ---------- */
    var test = window.__errors ? (window.__kk = { bot: false, steps: 1, alt: null, stats: {}, level: LEVEL }) : null;  /* only on the test page */
    if (test) test.state = function () { return { phase: phase, map: MAP.id, lap: laps(me), place: place, time: raceTime, item: me.item, idx: me.idx, alt: me.alt, ai: me.ai, altn: ALT ? ALT.n : 0, storm: !!(MAP.storm && MAP.storm.on > 1.2 && MAP.storm.on < 3.8), yarns: yarns.length, milks: milks.length, fx: yarns.concat(milks, karts.filter(function (c) { return c.shield > 0 || c.tangled > 0 || c.nap > 0 || c.laser > 0; })).filter(function (o) { return Math.hypot(o.x - me.x, o.y - me.y) < 300; }).length, met: MAP.met ? MAP.met.filter(function (m) { return m.t < 1.5 && Math.hypot(m.x - me.x, m.y - me.y) < 260; }).length : 0, fin: karts.map(function (c) { return c.fin; }) }; };
    function stat(k) { if (test) test.stats[k] = (test.stats[k] || 0) + 1; }
    if (test) test.karts = function () { return karts.map(function (c) { return [Math.round(c.x), Math.round(c.y), c.idx, c.k, c.alt ? c.ai : -1, Math.round(c.vf), Math.round(c.dist), c.fall > 0 ? 1 : 0]; }); };
    if (test) test.overview = function (sc) {  /* only on the test page: the whole cached track with its point numbers */
        var c = document.createElement('canvas'), g = c.getContext('2d'), i;
        c.width = Math.round(WW * sc); c.height = Math.round(WH * sc);
        g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(track, 0, 0, c.width, c.height); g.scale(sc, sc);
        g.font = 'bold 26px sans-serif'; g.lineWidth = 5; g.strokeStyle = '#000';
        for (i = 0; i < N; i += 10) { circle(g, X[i], Y[i], 5, '#f0f'); g.fillStyle = '#fff'; g.strokeText(i, X[i] + 6, Y[i] - 6); g.fillText(i, X[i] + 6, Y[i] - 6); }
        if (ALT) for (i = 0; i < ALT.n; i += 4) { circle(g, ALT.x[i], ALT.y[i], 4, '#0ff'); g.fillStyle = '#0ff'; g.fillText((i / (ALT.n - 1)).toFixed(2), ALT.x[i] + 6, ALT.y[i] + 20); }
        return c.toDataURL();
    };
    function update(dt) {
        if (remote) { view(dt); return; }  /* the friend's device only shows the race (Duo part below) */
        clock += dt;
        if (MAP.update) MAP.update(dt);
        moveParts(dt);
        if (phase === 'pick') return;
        if (phase === 'count') {  /* 3, 2, 1, Go */
            var n = 3 - Math.floor(clock - 0.6);
            if (clock >= 0.6 && n >= 1 && shown.count !== String(n)) { count(String(n)); api.sfx('tap'); }
            if (n < 1) { phase = 'race'; count('Go!', 'kk-go'); api.sfx('point'); hintEl.style.display = 'none'; }
        } else {
            if (phase === 'done' && (test || duo || split) && finishers < 4) raceTime += dt;  /* test only, and racing a friend: time the others too */
            if (phase === 'race') {
                raceTime += dt;
                if (me.fin) autopilot(me, 0.45);  /* racing a friend: the race goes on after you finish */
                else if (test && test.bot) {  /* test only: the player bot, basic (the old driver) or perfect (the smart one) */
                    me.P = test.mode === 'perfect' ? PERFECT : null;
                    decide(me);
                    if (me.P) smart(me, PERFECT, 1); else autopilot(me, 0.98);
                    if (test.items !== false) { if (me.P) aiItemSmart(me, dt); else aiItem(me, dt); }
                    if (!me.on) test.stats.offT = (test.stats.offT || 0) + dt;
                }
                else {
                    me.thr = (keys.up || pads.up ? 1 : 0) - (keys.down || pads.down ? 1 : 0);
                    var want = (keys.right || pads.right ? 1 : 0) - (keys.left || pads.left ? 1 : 0);
                    me.steer += (want - me.steer) * Math.min(1, dt * 10);
                    if (me.laser > 0) me.steer = me.steer * 0.3 + 0.7 * clamp(wrap(Math.atan2(me.doty - me.y, me.dotx - me.x) - me.a) * 3, -1, 1);
                }
            } else autopilot(me, 0.45);  /* after the finish: a slow lap of honour */
            for (var i = 1; i < 4; i++) {
                var c = karts[i];  /* a little rubber band: the others ease off when far ahead and push when behind */
                if (c === pal) { steerPal(dt); continue; }
                decide(c);
                if (c.fin) autopilot(c, 0.6);
                else if (c.P) { smart(c, c.P, catchUp(c)); aiItemSmart(c, dt); }
                else { autopilot(c, c.skill * (1 + clamp((lead().prog - c.prog) / (SEG * 30), -0.07, 0.05))); aiItem(c, dt); }
            }
            for (i = 0; i < 4; i++) step(karts[i], dt);
            collide();
            for (i = 0; i < 4; i++) progress(karts[i], dt);
            pickups(dt);
            moveItems(dt);
            if (split) splitPlaces(dt);  /* each player's place and wrong way warning, in their own half */
            else if (phase === 'race' && !me.fin) {
                var p = 1;
                for (i = 1; i < 4; i++) if (karts[i].fin || karts[i].prog > me.prog) p++;
                if (p !== place && clock - lastSay > 6) {
                    if (p === 1) { api.cat('happy'); say('Purr! You took the lead!'); }
                    else if (p < place) { api.cat('wow'); say('Nice pass!'); }
                    else if (p === 2 && place === 1) { api.cat('sad'); say('Hiss! Catch them!'); }
                }
                place = p;
                var wrong = Math.abs(wrap(me.a - me.ang)) > 2.1 && me.vf > 20 && !(me.spin > 0) && !(me.fall > 0);
                wrongFor = wrong ? wrongFor + dt : 0;
                if (clock > 5) count(wrongFor > 0.8 ? 'Wrong way!' : '', 'kk-warn');
            }
            if (clock > 4.4 && shown.count === 'Go!') count('');
        }
        camX += (me.x + me.vx * 0.4 - camX) * Math.min(1, dt * 4);
        camY += (me.y + me.vy * 0.4 - camY) * Math.min(1, dt * 4);
        shake = Math.max(0, shake - dt * 20);
        if (split) {  /* player 2's view follows player 2 the same way */
            var v2 = views[1];
            v2.camX += (pal.x + pal.vx * 0.4 - v2.camX) * Math.min(1, dt * 4);
            v2.camY += (pal.y + pal.vy * 0.4 - v2.camY) * Math.min(1, dt * 4);
            v2.shake = Math.max(0, v2.shake - dt * 20);
        }
    }
    api.loop(function (dt, now) {
        for (var s = test ? test.steps : 1; s > 0; s--) update(dt);
        if (split) { splitFrame(); return; }  /* two views, two HUDs */
        var vw = W / 2 / zoom, vh = H / 2 / zoom;  /* keep the view inside the field */
        camX = vw * 2 < WW ? clamp(camX, vw, WW - vw) : WW / 2;
        camY = vh * 2 < WH ? clamp(camY, vh, WH - vh) : WH / 2;
        draw();
        show();
        if (duo) duoTick(now);
    });

    /* ---------- controls: keys on desktop, buttons on touch screens ---------- */
    var KEYMAP = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
    api.on(window, 'keydown', function (e) {
        if (split) { splitKey(e, true); return; }  /* two players: keys by where they sit on the keyboard */
        var key = (e.key || '').toLowerCase(), k = KEYMAP[key];
        if (duo && wrapEl.classList.contains('kk-lobby-on')) return;  /* typing a code, or reading the lobby */
        if (phase === 'pick') {  /* in the picker: arrows choose, Enter or Space races */
            if (k) {
                var cols = FW < 600 ? 3 : 4;
                choose(sel + (k === 'left' ? -1 : k === 'right' ? 1 : k === 'up' ? -cols : cols));
                if (wrapEl.contains(document.activeElement)) cards[sel].focus();
                e.preventDefault();
            }
            else if ((key === 'enter' || key === ' ') && !(e.target && e.target.closest && e.target.closest('.kk-skins'))) { e.preventDefault(); go(); }
            return;
        }
        if (key === ' ' || key === 'shift') { e.preventDefault(); useItem(me); return; }
        if (k) { keys[k] = true; e.preventDefault(); }
    });
    api.on(window, 'keyup', function (e) { if (split) { splitKey(e, false); return; } var k = KEYMAP[(e.key || '').toLowerCase()]; if (k) keys[k] = false; });
    api.on(window, 'blur', function () { keys = {}; keys2 = {}; });
    api.on(useEl, 'pointerdown', function (e) { e.preventDefault(); useItem(me); });
    api.on(useEl, 'contextmenu', function (e) { e.preventDefault(); });
    Array.prototype.forEach.call(wrapEl.querySelectorAll('.kk-btn[data-k]'), function (b) {
        function set(on) { return function (e) { e.preventDefault(); pads[b.dataset.k] = on; b.classList.toggle('kk-on', on); }; }
        api.on(b, 'pointerdown', set(true));
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { api.on(b, t, set(false)); });
        api.on(b, 'contextmenu', function (e) { e.preventDefault(); });
    });
    api.on(wrapEl, 'pointerdown', function (e) {  /* a touch screen the media query missed */
        if (e.pointerType === 'touch' && !wrapEl.classList.contains('kk-touch')) {
            wrapEl.classList.add('kk-touch'); hintEl.textContent = TOUCH_HINT;
        }
    });

