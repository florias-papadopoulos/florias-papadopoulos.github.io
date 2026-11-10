    /* ---------- Kitty Kart Split Screen: two players on one phone, or on one keyboard ----------
       Player 1 drives the usual kart (me, karts[0]), player 2 the next one (pal, karts[1]); the two computer cats race as
       always. On a phone lying flat between the two, each player has half of the screen, turned to face them, with
       its own buttons, and the race fills the whole screen. On a keyboard player 1 has W A S D and player 2 the arrow
       keys, side by side. The play area is cut into two views, each a canvas of its own with its own camera and HUD. Before a view is drawn,
       cv, ctx, W, H, the camera and me point at it, so draw() and the tracks work unchanged. Keys are tracked by e.code
       (where the key sits, not what it types), so both players can hold keys at once. Nothing is saved, nothing is sent. */
    var GRID = [2, 3, 0, 1], views = null, splitNo = 0, splitResKey = '', frameNo = 0, sRes = null;
    var PKEYS = { KeyW: [0, 'up'], KeyS: [0, 'down'], KeyA: [0, 'left'], KeyD: [0, 'right'],
        ArrowUp: [1, 'up'], ArrowDown: [1, 'down'], ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'] };
    var IKEYS = { KeyQ: 0, ShiftLeft: 0, Enter: 1, NumpadEnter: 1, ShiftRight: 1 };  /* use an item: 0 player 1, 1 player 2 */
    var WHO = [['Player 1', 'W A S D', 'Q', 'W A S D to drive and brake, Q or Left Shift to use an item'],
        ['Player 2', 'arrows', 'Enter', 'Arrow keys to drive and brake, Enter or Right Shift to use an item']];
    var SPLIT_NAMES = ['Player 1', 'Player 2', 'Black cat', 'White cat'];
    /* phone: two players share a touch screen lying flat between them (each half has its own buttons and is turned to
       face its player); otherwise a keyboard. full: the race fills the whole screen (and, where allowed, goes fullscreen). */
    var phone = !!api.touch, full = false, pads2 = {}, wake = null;
    if (split) {
        pal = karts[1];
        wrapEl.classList.add('kk-split');
        views = [0, 1].map(function (n) {
            var el = document.createElement('div');
            el.className = 'kk-view kk-v' + (n + 1);
            el.innerHTML = '<div class="kk-vhud"><button type="button" class="kk-close" aria-label="Stop the race">&times;</button>' +
                '<span class="kk-pill kk-who"></span><span class="kk-pill kk-pos">4th</span>' +
                '<span class="kk-pill"><small>Lap</small><b class="kk-vlap">1/3</b></span><span class="kk-pill kk-time">0.0</span>' +
                '<span class="kk-pill kk-slot kk-empty"><canvas width="64" height="64"></canvas><small></small></span></div>' +
                '<div class="kk-count"></div><div class="kk-hint"></div><div class="kk-vsay" role="status"></div>' +
                '<button type="button" class="kk-btn kk-use kk-empty" data-k="use" aria-label="Use item"><canvas width="64" height="64"></canvas></button>' +
                '<button type="button" class="kk-btn kk-left" data-k="left" aria-label="Steer left">' + arrow('M15 5l-7 7 7 7') + '</button>' +
                '<button type="button" class="kk-btn kk-right" data-k="right" aria-label="Steer right">' + arrow('M9 5l7 7-7 7') + '</button>' +
                '<button type="button" class="kk-btn kk-brake" data-k="down">Brake</button><button type="button" class="kk-btn kk-gas" data-k="up">Gas</button>' +
                '<div class="kk-vres"><div class="kk-pick-box kk-lb" role="dialog" aria-label="Results"><h3></h3><ol class="kk-res-list"></ol>' +
                '<p class="kk-lb-p kk-res-note"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-go" data-a="again">Race again</button>' +
                '<button type="button" class="kk-lb-btn" data-a="new">New track</button></div></div></div>';
            var c = n ? document.createElement('canvas') : cv;  /* player 1's view draws on the main canvas */
            c.className = 'kk-cv';
            el.insertBefore(c, el.firstChild);
            wrapEl.insertBefore(el, wrapEl.children[n]);
            el.querySelector('.kk-who').appendChild(document.createTextNode(WHO[n][0] + ' '));
            var keysEl = document.createElement('small'); keysEl.textContent = WHO[n][1];
            el.querySelector('.kk-who').appendChild(keysEl);
            el.querySelector('.kk-slot small').textContent = WHO[n][2];
            el.querySelector('.kk-slot').title = 'Item: ' + WHO[n][3].split(', ')[1];
            return { el: el, cv: c, g: n ? c.getContext('2d', { alpha: false }) : ctx, kart: karts[n], hud: el.querySelector('.kk-vhud'),
                pos: el.querySelector('.kk-pos'), lap: el.querySelector('.kk-vlap'), time: el.querySelector('.kk-time'),
                slot: el.querySelector('.kk-slot'), slotG: el.querySelector('.kk-slot canvas').getContext('2d'),
                use: el.querySelector('.kk-use'), useG: el.querySelector('.kk-use canvas').getContext('2d'), res: el.querySelector('.kk-vres'),
                count: el.querySelector('.kk-count'), hint: el.querySelector('.kk-hint'), say: el.querySelector('.kk-vsay'),
                fingers: {}, pads: n ? pads2 : null, rot: 0,
                camX: 0, camY: 0, shake: 0, place: 4, wrongFor: 0, held: undefined, sayAt: 0, shown: {}, r: [0, 0, 0, 0] };
        });
        /* the picker: who drives with which keys, or, on a phone, who holds which half */
        var sBox = wrapEl.querySelector('.kk-pick .kk-pick-box'), keyLine = document.createElement('p'), phoneLine = document.createElement('p');
        sBox.querySelector('h3').textContent = 'Pick a track for two players';
        keyLine.className = 'kk-keys';
        keyLine.innerHTML = '<span><b>Player 1</b>W A S D, item Q or Left Shift</span><span><b>Player 2</b>arrow keys, item Enter or Right Shift</span>';
        phoneLine.className = 'kk-phone-line';
        sBox.insertBefore(phoneLine, mapsEl);
        sBox.insertBefore(keyLine, mapsEl);
        sRes = document.createElement('div');
        sRes.className = 'kk-res';
        sRes.innerHTML = '<div class="kk-pick-box kk-lb" role="dialog" aria-label="Results"><h3>Results</h3><ol class="kk-res-list"></ol>' +
            '<p class="kk-lb-p kk-res-note"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-go" data-a="again">Race again</button>' +
            '<button type="button" class="kk-lb-btn" data-a="new">New track</button></div></div>';
        wrapEl.appendChild(sRes);
        var resClick = function (e) {
            var b = e.target.closest('button');
            if (!b || phase !== 'done') return;
            if (b.dataset.a === 'again') { GRID = [GRID[1], GRID[0], 0, 1]; phase = 'pick'; choose(sel); splitGo(); }  /* the two swap places on the grid */
            else if (b.dataset.a === 'new') splitPick();
        };
        api.on(sRes, 'click', resClick);
        views.forEach(function (v) {
            api.on(v.res, 'click', resClick);
            api.on(v.el.querySelector('.kk-close'), 'click', function () { splitPick(); });
            /* the buttons of this half: every finger is followed by its id, and only ever drives this half's player */
            api.on(v.el, 'pointerdown', function (e) {
                var b = e.target.closest && e.target.closest('.kk-btn');
                if (!b) return;
                e.preventDefault();
                if (b.dataset.k === 'use') { useItem(v.kart); return; }
                try { v.el.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
                v.fingers[e.pointerId] = b.dataset.k;
                press(v);
            });
            api.on(v.el, 'pointermove', function (e) {  /* a finger sliding from one button to another of the same half */
                if (!(e.pointerId in v.fingers)) return;
                var t = document.elementFromPoint(e.clientX, e.clientY), b = t && t.closest && t.closest('.kk-btn[data-k]');
                var k = b && v.el.contains(b) && b.dataset.k !== 'use' ? b.dataset.k : null;
                if (k !== v.fingers[e.pointerId]) { v.fingers[e.pointerId] = k; press(v); }
            });
            ['pointerup', 'pointercancel'].forEach(function (t) {
                api.on(v.el, t, function (e) { if (e.pointerId in v.fingers) { delete v.fingers[e.pointerId]; press(v); } });
            });
            api.on(v.el, 'contextmenu', function (e) { e.preventDefault(); });
        });
        api.on(wrapEl, 'pointerdown', function (e) {  /* a touch screen the media query missed: phone layout */
            if (e.pointerType === 'touch' && !phone) { phone = true; fit(api.size()); }
        });
        api.on(document, 'visibilitychange', function () { if (!document.hidden && full) keepAwake(); });
    }
    function press(v) {  /* which of a half's buttons are held, from its fingers */
        var on = {}, p = v.kart === me ? pads : pads2;
        for (var id in v.fingers) if (v.fingers[id]) on[v.fingers[id]] = true;
        ['up', 'down', 'left', 'right'].forEach(function (k) { p[k] = !!on[k]; });
        Array.prototype.forEach.call(v.el.querySelectorAll('.kk-btn[data-k]'), function (b) { b.classList.toggle('kk-on', !!on[b.dataset.k]); });
    }
    function layout(s) {  /* the two views of the play area s; returns one view's size (before turning it) */
        if (full) s = { w: wrapEl.clientWidth, h: wrapEl.clientHeight };
        wrapEl.classList.toggle('kk-phone', phone); wrapEl.classList.toggle('kk-touch', phone || api.touch);
        var gap = 2, wide = s.w >= s.h, rw = wide ? Math.floor((s.w - gap) / 2) : s.w, rh = wide ? s.h : Math.floor((s.h - gap) / 2);
        /* keyboard: player 1 left (or top), both upright. Phone: the halves face their players, who sit at the two short
           ends in portrait (player 1 at the bottom, player 2 at the top, turned half round) or at the left and right ends
           in landscape (each half turned a quarter towards its player) */
        var rects = wide ? [[0, 0], [s.w - rw, 0]] : phone ? [[0, s.h - rh], [0, 0]] : [[0, 0], [0, s.h - rh]];
        var rots = !phone ? [0, 0] : wide ? [90, -90] : [0, 180];
        var SB = wide ? ['left', 'right'] : ['bottom', 'top'];
        var w = rots[0] % 180 ? rh : rw, h = rots[0] % 180 ? rw : rh;
        views.forEach(function (v, n) {
            var st = v.el.style;
            st.left = (rects[n][0] + (rw - w) / 2) + 'px'; st.top = (rects[n][1] + (rh - h) / 2) + 'px'; st.width = w + 'px'; st.height = h + 'px';
            st.transform = rots[n] ? 'rotate(' + rots[n] + 'deg)' : '';
            st.setProperty('--sb', phone ? 'env(safe-area-inset-' + SB[n] + ', 0px)' : '0px');
            v.rot = rots[n];
            v.cv.width = Math.round(w * dpr); v.cv.height = Math.round(h * dpr);
            v.hud.style.right = ((w < 600 ? 92 : 120) + 30) + 'px';  /* clear of the minimap */
            v.hint.textContent = phone ? TOUCH_HINT : WHO[n][3];
        });
        phoneLine.innerHTML = 'Lay the phone flat between you. <b>Player 1</b> holds the ' + (wide ? 'left' : 'bottom') + ' half, <b>Player 2</b> the ' +
            (wide ? 'right' : 'top') + ' half; each half has its own Gas, Brake, steering and item buttons.';
        wrapEl.querySelector('.kk-pick-tip').textContent = phone ? 'Tap a track to race' : 'Click a track, or W A S D or arrows to choose and Enter to race';
        return { w: w, h: h };
    }
    /* the whole screen for the race on a phone: the page's bar and the cat go under it; fullscreen and keeping the
       screen on where the browser allows (iPhones do not do fullscreen for a page: the fixed layout covers that) */
    function enterFull() {
        if (!full) { full = true; wrapEl.classList.add('kk-full'); fit(api.size()); }
        if (!document.fullscreenElement && wrapEl.requestFullscreen) {
            try { var p = wrapEl.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(function () { /* not allowed: the fixed layout is enough */ }); } catch (e) { /* same */ }
        }
        keepAwake();
    }
    function keepAwake() {
        if (wake || !navigator.wakeLock) return;
        try { navigator.wakeLock.request('screen').then(function (l) { if (full) { wake = l; l.addEventListener('release', function () { if (wake === l) wake = null; }); } else l.release(); }, function () { /* fine */ }); } catch (e) { /* fine */ }
    }
    function leaveFull() {
        if (!full) return;
        full = false; wrapEl.classList.remove('kk-full');
        if (document.fullscreenElement === wrapEl && document.exitFullscreen) {
            try { var p = document.exitFullscreen(); if (p && p.catch) p.catch(function () { /* fine */ }); } catch (e) { /* fine */ }
        }
        if (wake) { try { wake.release(); } catch (e) { /* fine */ } wake = null; }
        fit(api.size());
    }
    function splitPick() {  /* back to the picker: after the results, or the close button during a race */
        phase = 'pick'; leaveFull(); choose(sel); count('');
        views.forEach(function (v) { v.fingers = {}; press(v); });
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
    }
    function splitGo() {  /* the picked track: on to the countdown, for both */
        splitNo++;
        phase = 'count'; clock = 0; keys = {}; keys2 = {};
        raceTime = 0; finishers = 0; lastSay = -99; shake = 0; splitResKey = '';
        views.forEach(function (v) { v.place = 4; v.wrongFor = 0; v.shake = 0; v.held = undefined; v.sayAt = 0; v.say.textContent = ''; v.fingers = {}; press(v); });
        count('');
        wrapEl.classList.remove('kk-picking', 'kk-res-on');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
        if (phone) enterFull();  /* a tap started it: fullscreen is allowed now */
        api.sfx('tap');
    }
    function drive2(dt) {  /* player 2 on the arrow keys or their half's buttons, just as player 1 drives */
        var c = pal, want = (keys2.right || pads2.right ? 1 : 0) - (keys2.left || pads2.left ? 1 : 0);
        c.thr = (keys2.up || pads2.up ? 1 : 0) - (keys2.down || pads2.down ? 1 : 0);
        c.steer += (want - c.steer) * Math.min(1, dt * 10);
        if (c.laser > 0) c.steer = c.steer * 0.3 + 0.7 * clamp(wrap(Math.atan2(c.doty - c.y, c.dotx - c.x) - c.a) * 3, -1, 1);
    }
    function splitKey(e, down) {
        var m = PKEYS[e.code], it = IKEYS[e.code];
        if (m) {
            e.preventDefault();  /* arrows never scroll the page */
            if (phase !== 'pick') (m[0] ? keys2 : keys)[m[1]] = down;
            else if (down) {  /* in the picker either player chooses */
                var cols = FW < 600 ? 3 : 4;
                choose(sel + (m[1] === 'left' ? -1 : m[1] === 'right' ? 1 : m[1] === 'up' ? -cols : cols));
                if (wrapEl.contains(document.activeElement)) cards[sel].focus();
            }
            return;
        }
        if (phase === 'pick') {
            if (down && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && !(e.target && e.target.closest && e.target.closest('.kk-skins'))) { e.preventDefault(); go(); }
            return;
        }
        if (phase === 'done' && e.target && e.target.closest && e.target.closest('button')) return;  /* a results button has the focus */
        if (it !== undefined) { e.preventDefault(); if (down && !e.repeat) useItem(it ? pal : me); }
        else if (e.code === 'Space') e.preventDefault();  /* nor does the space bar */
    }
    function splitSay(n, t) {  /* what is said to a player shows at the bottom of their half */
        var v = views[n];
        v.say.textContent = dogify(t); v.sayAt = performance.now();
    }
    function splitPlaces(dt) {
        if (phase !== 'race') return;
        views.forEach(function (v) {
            var c = v.kart;
            if (c.fin) return;
            var p = rankOf(c);
            if (p !== v.place && quiet(c, 6)) {
                if (p === 1) { mood(c, 'happy'); say('Purr! You took the lead!', c); }
                else if (p < v.place) { mood(c, 'wow'); say('Nice pass!', c); }
                else if (p === 2 && v.place === 1) { mood(c, 'sad'); say('Hiss! Catch them!', c); }
            }
            v.place = p;
            var wrong = Math.abs(wrap(c.a - c.ang)) > 2.1 && c.vf > 20 && !(c.spin > 0) && !(c.fall > 0);
            v.wrongFor = wrong ? v.wrongFor + dt : 0;
        });
    }
    function splitFinish(c) {  /* one player is through: their half shows the place; both through: the results */
        var n = c === me ? 0 : 1, v = views[n], other = n ? me : pal, no = splitNo;
        v.place = rankOf(c);
        api.sfx(v.place === 1 ? 'win' : 'point');
        splitSay(n, v.place === 1 ? 'Purrfect! First place!' : !other.fin ? 'Ahead of ' + SPLIT_NAMES[1 - n] + '!' : 'Meow. Next time!');
        if (!me.fin || !pal.fin) return;
        phase = 'done';
        api.cat('happy');
        api.timeout(function () { if (no === splitNo && phase === 'done') wrapEl.classList.add('kk-res-on'); }, 900);
    }
    function splitResults() {  /* the results box, rebuilt when something in it changes (the cats may still be racing) */
        var order = karts.slice().sort(function (a, b) { return ahead(a, b) ? -1 : ahead(b, a) ? 1 : 0; });
        var key = order.map(function (c) { return karts.indexOf(c) + ':' + c.fin; }).join();
        if (key === splitResKey) return;
        splitResKey = key;
        var d = Math.abs(me.fin - pal.fin), note = d < 0.05 ? 'A dead heat between the two players!' :
            (me.fin < pal.fin ? 'Player 1 beat Player 2' : 'Player 2 beat Player 1') + ' by ' + d.toFixed(1) + ' s on ' + MAP.name + '.';
        [sRes].concat(views.map(function (v) { return v.res; })).forEach(function (box, b) {  /* the shared box, and one in each half */
            var list = box.querySelector('.kk-res-list');
            list.innerHTML = '';
            order.forEach(function (c, i) {
                var li = document.createElement('li'), n = karts.indexOf(c);
                li.innerHTML = '<b></b><i></i><span></span><em></em>';
                if (n < 2) li.className = n ? 'kk-p2' : 'kk-me';
                li.querySelector('b').textContent = i + 1;
                li.querySelector('i').style.background = kartCol(c);
                li.querySelector('span').textContent = dogify(SPLIT_NAMES[n]);
                li.querySelector('em').textContent = c.fin ? c.fin.toFixed(1) + ' s' : 'still racing';
                list.appendChild(li);
            });
            box.querySelector('.kk-res-note').textContent = note;
            if (b) box.querySelector('h3').textContent = SPLIT_NAMES[b - 1] + ': ' + ordinal(views[b - 1].place) + ' place';
        });
    }
    function tag(c, text, col) {  /* a name tag over a player's kart */
        if (!vis(c.x, c.y, 40)) return;
        ctx.font = '800 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.fillStyle = col;
        ctx.strokeText(text, c.x, c.y - 22 - c.z * 0.5); ctx.fillText(text, c.x, c.y - 22 - c.z * 0.5);
    }
    function vset(v, key, val) { if (v.shown[key] !== val) { v.shown[key] = val; v[key].textContent = val; } }
    function splitFrame() {  /* every frame: both views, then both HUDs */
        var c0 = cv, g0 = ctx, n, v;
        VB = null;
        for (n = 0; n < 2; n++) {
            v = views[n];
            cv = v.cv; ctx = v.g; me = v.kart;
            if (n) { camX = v.camX; camY = v.camY; shake = v.shake; }
            var vw = W / 2 / zoom, vh = H / 2 / zoom;  /* keep the view inside the field */
            camX = vw * 2 < WW ? clamp(camX, vw, WW - vw) : WW / 2;
            camY = vh * 2 < WH ? clamp(camY, vh, WH - vh) : WH / 2;
            draw();
            v.r = [VX0, VY0, VX1, VY1];
            if (n) { v.camX = camX; v.camY = camY; } else { views[0].camX = camX; views[0].camY = camY; views[0].shake = shake; }
        }
        cv = c0; ctx = g0; me = karts[0];
        camX = views[0].camX; camY = views[0].camY; shake = views[0].shake;
        /* until the next frame, "visible" means in either view (sparks, steam and petals near both players) */
        frameNo++;
        var a = views[frameNo & 1].r;
        VX0 = a[0]; VY0 = a[1]; VX1 = a[2]; VY1 = a[3]; VB = views[1 - (frameNo & 1)].r;
        for (n = 0; n < 2; n++) {
            v = views[n];
            var c = v.kart, text = '', cls = '';
            vset(v, 'pos', ordinal(v.place));
            vset(v, 'lap', Math.min(LAPS, laps(c) + 1) + '/' + LAPS);
            vset(v, 'time', (c.fin || raceTime).toFixed(1));
            if (c.item !== v.held) {
                v.held = c.item; itemPic(v.slotG, c.item); itemPic(v.useG, c.item);
                v.slot.classList.toggle('kk-empty', !c.item); v.use.classList.toggle('kk-empty', !c.item);
            }
            if (c.fin) { text = ordinal(v.place) + ' place, ' + c.fin.toFixed(1) + ' s'; cls = 'kk-fin'; }
            else if (phase === 'race' && clock > 5 && v.wrongFor > 0.8) { text = 'Wrong way!'; cls = 'kk-warn'; }
            else if (shown.count) { text = shown.count; cls = text === 'Go!' ? 'kk-go' : ''; }
            if (v.shown.count !== text) {
                v.shown.count = text;
                v.count.textContent = text;
                v.count.className = 'kk-count' + (cls ? ' ' + cls : '');
                if (text && !api.reducedMotion) { void v.count.offsetWidth; v.count.classList.add('kk-pop'); }
            }
            var hint = phase === 'count' ? '' : 'none';
            if (v.hint.style.display !== hint) v.hint.style.display = hint;
            if (v.sayAt && performance.now() - v.sayAt > 1800) { v.sayAt = 0; v.say.textContent = ''; }
        }
        if (phase === 'done') splitResults();
    }
    if (test && split) test.split = function () {  /* only on the test page: where each player is, and which keys a driver would hold */
        return { phase: phase, map: MAP.id, results: wrapEl.classList.contains('kk-res-on'), time: raceTime, finishers: finishers, phone: phone, full: full,
            fs: document.fullscreenElement === wrapEl, pads: [JSON.stringify(pads), JSON.stringify(pads2)],
            views: views.map(function (v) { var r = v.el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), v.rot, v.cv.width, v.cv.height]; }),
            karts: karts.map(function (c, i) {
                var look = Math.round((34 + Math.abs(c.vf) * 0.32) / SP), j = routeAt(c, look), km = 0;
                for (var q = 1; q < 26; q++) km = Math.max(km, Math.abs(rK(routeAt(c, q))));
                var vt = VMAX * 0.85 / (1 + km * 80 * CARE);
                return { x: Math.round(c.x), y: Math.round(c.y), lap: laps(c), k: c.k, fin: c.fin, item: c.item, vf: Math.round(c.vf),
                    place: i < 2 ? views[i].place : rankOf(c), thr: c.thr, cs: Math.round(c.steer * 100) / 100,
                    steer: clamp(wrap(Math.atan2(rY(j) - c.y, rX(j) - c.x) - c.a) * 3, -1, 1), want: c.vf < vt ? 1 : c.vf > vt + 30 ? -1 : 0 };
            }) };
    };

    load(MAP);
    reset();
    fit(api.size());
    api.onResize(fit);
    showBests();
    buildSkins();
    if (!split) show();
    /* "Play again" in the end panel of arcade.js: the same track again, straight to the countdown ("Tracks" there
       starts the game without api.again, on the picker) */
    if (!duo && !split && api.again && api.again.track) {
        MAPS.forEach(function (m, i) { if (m.id === api.again.track && i !== sel) choose(i); });
        go();
    }
    return { destroy: function () {
        if (window.__kk === test) try { delete window.__kk; } catch (e) { window.__kk = undefined; }
        if (duo) { send({ t: 'bye' }); teardown(false); }
        if (split) leaveFull();
        if (noteAC) try { noteAC.close(); } catch (e) { /* fine */ }
    } };
}
})();
