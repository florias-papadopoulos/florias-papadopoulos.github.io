    /* ---------- page: canvas, HUD, countdown, touch buttons, track picker ---------- */
    function arrow(d) { return '<svg viewBox="0 0 24 24"><path d="' + d + '"/></svg>'; }
    var TOUCH_HINT = 'Hold Gas, steer with the arrows, tap the item button to use an item';
    var wrapEl = document.createElement('div');
    wrapEl.className = 'kk kk-picking' + (api.touch ? ' kk-touch' : '') + (duo ? ' kk-lobby-on' : '');
    wrapEl.innerHTML = '<canvas class="kk-cv"></canvas>' +
        '<div class="kk-hud"><span class="kk-pill kk-pos">4th</span><span class="kk-pill"><small>Lap</small><b class="kk-lap">1/3</b></span>' +
        '<span class="kk-pill kk-time">0.0</span><span class="kk-pill kk-slot kk-empty" title="Item"><canvas width="64" height="64"></canvas></span></div>' +
        '<div class="kk-count"></div><div class="kk-hint">' + (api.touch ? TOUCH_HINT : 'Arrows or WASD to drive and brake, Space or Shift to use an item') + '</div>' +
        '<button class="kk-btn kk-use kk-empty" aria-label="Use item"><canvas width="64" height="64"></canvas></button>' +
        '<button class="kk-btn kk-left" data-k="left" aria-label="Steer left">' + arrow('M15 5l-7 7 7 7') + '</button>' +
        '<button class="kk-btn kk-right" data-k="right" aria-label="Steer right">' + arrow('M9 5l7 7-7 7') + '</button>' +
        '<button class="kk-btn kk-brake" data-k="down">Brake</button><button class="kk-btn kk-gas" data-k="up">Gas</button>' +
        '<div class="kk-pick"><div class="kk-pick-box" role="dialog" aria-label="Pick a track"><h3>Pick a track</h3><div class="kk-skin-box"></div><div class="kk-maps"></div>' +
        '<p class="kk-pick-tip">' + (api.touch ? 'Tap a track to race' : 'Click a track, or arrows to choose and Enter to race') + '</p></div></div>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.kk-cv'), ctx = cv.getContext('2d', { alpha: false });
    var posEl = wrapEl.querySelector('.kk-pos'), lapEl = wrapEl.querySelector('.kk-lap'), timeEl = wrapEl.querySelector('.kk-time');
    var countEl = wrapEl.querySelector('.kk-count'), hintEl = wrapEl.querySelector('.kk-hint'), mapsEl = wrapEl.querySelector('.kk-maps');
    var slotEl = wrapEl.querySelector('.kk-slot'), useEl = wrapEl.querySelector('.kk-use');
    var slotG = slotEl.querySelector('canvas').getContext('2d'), useG = useEl.querySelector('canvas').getContext('2d');

    /* the last track and the best time on each track are remembered in this browser */
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('kitty-kart-maps')); } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object') saved = {};
    if (!saved.best || typeof saved.best !== 'object') saved.best = {};
    function persist() { try { localStorage.setItem('kitty-kart-maps', JSON.stringify(saved)); } catch (e) { /* private mode: fine */ } }
    var sel = 0;
    MAPS.forEach(function (m, i) { if (m.id === saved.map) sel = i; });
    var MAP = MAPS[sel];

    var tins = [], boosts = [], yarns = [], milks = [], rings = [];
    function load(m) {  /* build a track with its shortcut, fish tins and boost pads */
        build(m);
        if (m.prep) m.prep();
        tins = []; boosts = [];
        (m.picks || []).forEach(function (j) {
            [-0.55, 0, 0.55].forEach(function (l) { var q = side(j, l * HW); tins.push({ x: q.x, y: q.y, idx: j, lat: l * HW, t: 0 }); });
        });
        (m.pads || []).forEach(function (d) {  /* [main index, side] or [fraction of the shortcut, side, true] */
            var j = d[2] ? Math.round(d[0] * (ALT.n - 1)) : d[0], q = d[2] ? altSide(j, d[1] * ALT.hw) : side(j, d[1] * HW), a = d[2] ? ALT.ang[j] : A[j];
            boosts.push({ x: q.x, y: q.y, a: a, ca: Math.cos(a), sa: Math.sin(a) });
        });
    }
    var cards = MAPS.map(function (m, i) {
        load(m);
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'kk-map';
        b.innerHTML = '<canvas width="240" height="180"></canvas><b></b><small></small><small class="kk-mbest"></small>';
        b.querySelector('b').textContent = m.name;
        b.querySelector('small').textContent = m.blurb;
        thumb(b.querySelector('canvas').getContext('2d'), m);
        mapsEl.appendChild(b);
        api.on(b, 'click', function () { if (phase !== 'pick') return; choose(i); go(); });
        api.on(b, 'focus', function () { if (phase === 'pick' && sel !== i) choose(i); });
        return b;
    });
    function thumb(g, m) {  /* a small picture of the track for its button */
        var s = Math.min(220 / WW, 160 / WH), i;
        g.fillStyle = m.col.bg; g.fillRect(0, 0, 240, 180);
        g.save(); g.translate((240 - WW * s) / 2, (180 - WH * s) / 2); g.scale(s, s); g.lineJoin = 'round';
        if (m === MOON) { seed = 3; for (i = 0; i < 60; i++) circle(g, rnd() * WW, rnd() * WH, 6, '#cbd5e1'); }
        if (m === REEF) { seed = 3; for (i = 0; i < 26; i++) circle(g, rnd() * WW, rnd() * WH, 30, ['#ff7f9e', '#ffd166', '#b88ae6'][i % 3]); }
        if (m === CITY) { seed = 3; for (i = 0; i < 40; i++) { g.fillStyle = i % 4 ? '#323b52' : '#ffd27a'; g.fillRect(rnd() * WW, rnd() * WH, 90, 70); } }
        if (m === MEADOW) { seed = 3; for (i = 0; i < 40; i++) circle(g, rnd() * WW, rnd() * WH, 34, '#97d08f'); }
        if (m === VOLCANO) { seed = 3; for (i = 0; i < 30; i++) circle(g, rnd() * WW, rnd() * WH, 22, i % 3 ? '#3a302d' : '#f97316'); }
        if (m === TREES) { seed = 3; for (i = 0; i < 14; i++) circle(g, rnd() * WW, rnd() * WH, 70, '#5b3b22'); }
        if (m === DESERT) { seed = 3; for (i = 0; i < 10; i++) circle(g, rnd() * WW, rnd() * WH, 80, '#b44d2a'); }
        if (m === SKY) { seed = 3; for (i = 0; i < 40; i++) { g.fillStyle = ['#ffb3c7', '#9be3de', '#ffe08a', '#ffc4dd'][i % 4]; g.fillRect(rnd() * WW, rnd() * WH, 80, 70); } }
        if (m.thumbDeco) m.thumbDeco(g);
        strokeLoop(g, 0, N, 2 * HW + (m === MOON ? 200 : 60), m.col.edge);
        if (ALT) { strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 30, m.col.edge); strokeAlt(g, 1, ALT.n - 2, 2 * ALT.hw + 6, m.col.road, [26, 14]); }
        strokeLoop(g, 0, N, 2 * HW + 30, m.col.road);
        g.setLineDash([]);
        g.translate(X[0], Y[0]); g.rotate(A[0]); g.fillStyle = '#0f172a'; g.fillRect(-12, -HW - 15, 24, 2 * HW + 30);
        g.fillStyle = '#fff'; g.fillRect(-12, -HW - 15, 12, 2 * HW + 30);
        g.restore();
    }
    function showBests() {
        cards.forEach(function (b, i) {
            var t = duo || split ? null : saved.best[MAPS[i].id];  /* racing a friend keeps no best times */
            b.querySelector('.kk-mbest').textContent = typeof t === 'number' ? 'Best ' + t.toFixed(1) + ' s' : '';
            b.classList.toggle('kk-sel', i === sel);
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
        });
    }

    var dpr = 1, W = 0, H = 0, FW = 0, zoom = 1, res = 0, track = null, mini = null, MM = 110, mmK = 1, dirty = true;
    function fit(s) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);  /* sharp enough, and much lighter on phones */
        FW = s.w;  /* the whole play area, for the picker */
        if (split) s = layout(s);  /* split screen: W and H are one view's */
        W = s.w; H = s.h;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        zoom = clamp(Math.sqrt(W * H) / 760, 0.7, 1.4);
        MM = W < 600 ? 92 : 120;
        wrapEl.classList.toggle('kk-narrow', FW < 600);
        MAPS.forEach(function (m) { m.beam = m.ray = null; });  /* gradients belong to the old canvas state */
        var r = Math.min(zoom * dpr, Math.sqrt(9e6 / (WW * WH)));  /* cap the cached track at about 9 megapixels */
        if (Math.abs(r - res) > 0.01 || !track || dirty) { res = r; renderTrack(); dirty = false; }
        renderMini();
    }

    /* the static track, drawn once into an offscreen canvas in world units times res */
    function renderTrack() {
        track = track || document.createElement('canvas');
        track.width = Math.ceil(WW * res); track.height = Math.ceil(WH * res);
        var g = track.getContext('2d'), i, k;
        g.setTransform(res, 0, 0, res, 0, 0);
        g.lineJoin = g.lineCap = 'round';
        MAP.paint(g);
        g.setLineDash([]);
        boosts.forEach(function (b) {  /* boost pads */
            g.save(); g.translate(b.x, b.y); g.rotate(b.a);
            g.fillStyle = 'rgba(15,23,42,.25)'; rr(g, -20, -14, 44, 34, 6); g.fill();
            g.fillStyle = MAP.padCol[0]; rr(g, -22, -17, 44, 34, 6); g.fill();
            g.strokeStyle = MAP.padCol[1]; g.lineWidth = 4; g.lineCap = g.lineJoin = 'round';
            for (k = -10; k <= 14; k += 12) { g.beginPath(); g.moveTo(k - 6, -9); g.lineTo(k, 0); g.lineTo(k - 6, 9); g.stroke(); }
            g.restore();
        });
        g.save();  /* start/finish line, chequered */
        g.translate(X[0], Y[0]); g.rotate(A[0]);
        var q = HW / 5;
        for (i = 0; i < 10; i++) for (k = 0; k < 2; k++) { g.fillStyle = (i + k) % 2 ? '#0f172a' : '#ffffff'; g.fillRect(-q + k * q, -HW + i * q, q, q); }
        g.restore();
        for (i = 0; i < 4; i++) {  /* grid boxes */
            var j = N - 3 - i * 3, sd = (i % 2 ? 1 : -1) * HW * 0.45;
            g.save(); g.translate(X[j] - Math.sin(A[j]) * sd, Y[j] + Math.cos(A[j]) * sd); g.rotate(A[j]);
            g.strokeStyle = MAP.col.grid || 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.strokeRect(-14, -12, 32, 24);
            g.restore();
        }
    }
    function renderMini() {
        mini = mini || document.createElement('canvas');
        mmK = MM / Math.max(WW, WH);
        mini.width = Math.ceil(WW * mmK * dpr); mini.height = Math.ceil(WH * mmK * dpr);
        var g = mini.getContext('2d');
        g.setTransform(mmK * dpr, 0, 0, mmK * dpr, 0, 0);
        g.lineJoin = g.lineCap = 'round';
        if (ALT) strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 10, MAP.col.mini || '#b4bcc6', [40, 26]);
        strokeLoop(g, 0, N, 2 * HW, MAP.col.mini || '#b4bcc6');
        g.setLineDash([]);
        g.translate(X[0], Y[0]); g.rotate(A[0]);  /* the start line */
        g.fillStyle = MAP.col.mini ? '#d6336c' : '#0f172a'; g.fillRect(-1 / mmK, -HW, 2 / mmK, 2 * HW);
    }

