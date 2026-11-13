/* /phd/gfm/: the state and the controls. Alice's region (a ready one or drawn), the Partitioner shown step by
   step, the resolution slider and the cost chart, Bob dragged around (or moved with the arrow keys), and the three
   views. On touch screens a finger on the map scrolls the page; only Bob's pin and the drawing tools take the
   finger (touch-action in gfm.css), and a tap on the map puts Bob there. */
(function (G) {
    'use strict';
    var root = document.getElementById('gfm');
    if (!root) return;
    var $ = function (id) { return document.getElementById(id); };
    var app = $('gfm-app'), svg = $('gfm-map'), wrap = $('gfm-mapwrap'), handle = $('gfm-handle'), slider = $('gfm-r'), rOut = $('gfm-r-out'),
        stepEl = $('gfm-step'), stepsEl = $('gfm-steps');
    var ans = { k: $('gfm-who-k'), res: $('gfm-result'), learns: $('gfm-learns') };
    app.hidden = false;
    var N = G.N;
    var S = { goal: 'total', region: null, m: null, sw: null, top: G.RMAX, r: 1, part: null, bob: { x: G.bobStart.x, y: G.bobStart.y },
        view: 'god', tool: null, p: 2, draft: null, boxes: [], hit: null };
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    G.layers(svg);
    var chart = G.chart($('gfm-chart'), function (r) { setR(r); });
    function pressed(sel, attr, val) {
        Array.prototype.forEach.call(app.querySelectorAll(sel), function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val));
        });
    }

    /* "Best for": what r* minimises, each read off the paper's complexity theorem and protocol figure (Section 4;
       the sums are in G.cost, 10-core.js). Message size is shown in kB. */
    var SUM = '&Sigma;2&lfloor;log<sub>2</sub>(2<var>&delta;</var>+1)&rfloor;', LR = '<var>L<sub>r</sub></var>', NJ = '<var>N<sub>r</sub></var>&middot;<var>J<sub>S</sub></var>';
    function kB(v) { return v ? (Math.round(v * 10) / 10) + ' kB' : '0'; }
    var GOALS = {
        total: { name: 'Cost', scale: 1, fmt: G.fmt,
            f: 'Cost = ' + SUM + ' + ' + LR + ' + (<var>d</var>+1)&middot;' + NJ + ': all that both sides compute (the complexity theorem).' },
        alice: { name: 'Alice’s work', scale: 1, fmt: G.fmt,
            f: 'Alice = ' + SUM + ' + ' + LR + ' + ' + NJ + ': her OKVS entries for the rectangles and the residual points, and one check per answer (the theorem’s receiver bound).' },
        bob: { name: 'Bob’s work', scale: 1, fmt: G.fmt,
            f: 'Bob = <var>d</var>&middot;' + NJ + ': <var>d</var> lookups per string vector in every rectangle (the sender bound). Residual points cost him one lookup in all, so he would rather have no rectangles.' },
        bits: { name: 'Message size', scale: 8000, fmt: kB,
            f: 'Size = 2<var>&lambda;</var>(' + SUM + ' + ' + LR + ') + (<var>&lambda;</var>+<var>&kappa;&prime;</var>)&middot;' + NJ + ' bits: Alice’s pairs of group elements, Bob’s answers. The theorem leaves out ' + LR + ', the protocol figure sends it; <var>&lambda;</var> = 256 and <var>&kappa;</var> = 40 are chosen here, the paper fixes neither.' }
    };
    function best() { return S.sw.best[S.goal]; }
    function drawChart() {
        var g = GOALS[S.goal];
        chart.set(S.sw.list.map(function (e) { return { r: e.r, cost: e[S.goal] / g.scale }; }), S.top, best(), g.fmt);
        $('gfm-goal-f').innerHTML = g.f;
        pressed('[data-goal]', 'data-goal', S.goal);
    }

    /* ---------- the stages of the Partitioner ---------- */
    var timer = null, NSTEPS = 7;
    var LAYERS = ['region', 'box', 'grid', 'cells', 'runs', 'rects', 'lit', 'res', 'litres', 'outline'];
    for (var i = 0; i < NSTEPS; i++) stepsEl.appendChild(document.createElement('i'));
    function only(list) { LAYERS.forEach(function (n) { G.show(n, list.indexOf(n) >= 0); }); }
    function cap(t) { stepEl.textContent = t || ' '; }
    function progress(k) {             /* k steps done of NSTEPS; 0 hides the ticks */
        stepsEl.hidden = !k;
        Array.prototype.forEach.call(stepsEl.children, function (t, j) { t.className = j < k ? 'is-done' : ''; });
    }
    function plural(n, one, many) { return G.fmt(n) + ' ' + (n === 1 ? one : many); }
    function finalView() {
        only(['region', 'rects', 'lit', 'res', 'litres', 'outline']);
        progress(0);
        var p = S.part;
        if (S.tool) cap(HINTS[S.tool]);
        else cap(p.box ? plural(p.K, 'rectangle', 'rectangles') + ', ' + plural(p.L, 'residual point', 'residual points') + '. Drag Bob or tap the map.' : 'Pick or draw a region.');
    }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } svg.classList.remove('is-playing'); }
    function play() {
        stop();
        var p = S.part;
        if (!p.box || still) { finalView(); return; }
        var pts = 0;
        for (var i = 0; i < N * N; i++) pts += S.m[i];
        var steps = [
            [['region', 'outline'], 'Alice’s region' + (S.preset ? ', ' + G.presetName[S.preset] : '') + ': ' + plural(pts, 'lattice point', 'lattice points')],
            [['region', 'outline', 'box'], 'Its bounding box'],
            [['region', 'outline', 'box', 'grid'], 'Cut into cells of ' + S.r + ' × ' + S.r + ' points'],
            [['region', 'outline', 'grid', 'cells'], 'Keep the cells wholly inside: ' + G.fmt(p.cells.length)],
            [['region', 'outline', 'grid', 'runs'], 'Fuse neighbours along each row'],
            [['region', 'outline', 'rects'], 'and down the columns: ' + plural(p.K, 'rectangle', 'rectangles')],
            [['region', 'outline', 'rects', 'res'], 'The points they miss: ' + plural(p.L, 'residual point', 'residual points')]
        ];
        var k = 0;
        svg.classList.add('is-playing');
        (function next() {
            if (k === steps.length) { timer = null; svg.classList.remove('is-playing'); finalView(); return; }
            only(steps[k][0]); cap(steps[k][1]);
            k++;
            progress(k);
            timer = setTimeout(next, k === 1 ? 1000 : 1400);
        })();
    }

    /* ---------- region, resolution, Bob ---------- */
    function setRegion(rg, animate) {
        stop();
        S.region = rg;
        S.m = rg ? G.mask(rg) : new Uint8Array(N * N);
        S.sw = G.sweep(S.m);
        S.top = G.RMAX;
        for (var i = 0; i < S.sw.list.length; i++) if (S.sw.list[i].K === 0) { S.top = Math.max(4, i + 1); break; }
        slider.max = S.top;
        drawChart();
        G.drawRegion(rg, S.m);
        S.r = best();
        compute();
        if (animate) play(); else finalView();
        syncBar();
    }
    function count(dt, dd, unit) {
        var d = document.createElement('div');
        var t = document.createElement('dt'); t.innerHTML = dt;
        var v = document.createElement('dd'); v.textContent = dd;
        if (unit) { var u = document.createElement('span'); u.textContent = ' ' + unit; v.appendChild(u); }
        d.appendChild(v); d.appendChild(t);
        return d;
    }
    function compute() {
        S.part = G.partition(S.m, S.r, S.sw.S);
        G.drawPartition(S.part);
        slider.value = S.r;
        rOut.textContent = S.r;
        chart.cur(S.r);
        var c = G.cost(S.part), g = GOALS[S.goal], counts = $('gfm-counts');
        counts.textContent = '';
        counts.appendChild(count('<var>N<sub>r</sub></var> rectangles', G.fmt(S.part.K)));
        counts.appendChild(count('<var>L<sub>r</sub></var> residual points', G.fmt(S.part.L)));
        counts.appendChild(count(g.name, g.fmt(c[S.goal] / g.scale)));
        $('gfm-best').disabled = S.r === best();
        moveBob(S.bob.x, S.bob.y);
    }
    function setR(r) {
        r = Math.max(1, Math.min(S.top, r));
        if (r === S.r && !timer) return;
        stop();
        S.r = r;
        compute();
        finalView();
    }
    /* the pin's scale: about the same size on screen at any width, a little larger on small maps */
    function pinScale() {
        var u = (svg.clientWidth || 640) / N;
        return Math.min(1.7, Math.max(1, 4.8 / u));
    }
    function placeHandle() {
        var u = (svg.clientWidth || 640) / N, k = pinScale();
        var cx = (S.bob.x + 0.5) * u, cy = (S.bob.y + 0.5 - G.PIN_HEAD * k) * u;
        handle.style.transform = 'translate(' + (cx - 22).toFixed(1) + 'px,' + (cy - 22).toFixed(1) + 'px)';
    }
    function moveBob(x, y) {
        S.bob = { x: Math.max(0, Math.min(N - 1, x)), y: Math.max(0, Math.min(N - 1, y)) };
        S.hit = S.part && S.part.box ? G.locate(S.part, S.bob.x, S.bob.y) : null;
        G.drawBob(S.bob, pinScale());
        placeHandle();
        G.drawLit(S.part, S.hit, S.bob);
        G.answer(ans, S.view, S.part, S.hit);
        G.dasa($('gfm-dasa'), S.view, S.part, S.hit, S.bob);
        root.classList.toggle('is-in', !!S.hit);
    }
    function setView(v) {
        S.view = v;
        root.setAttribute('data-view', v);
        pressed('button[data-view]', 'data-view', v);
        if (S.part) moveBob(S.bob.x, S.bob.y);
    }

    /* ---------- drawing tools ---------- */
    var HINTS = { ball: 'Drag from the centre outward.', poly: 'Tap the corners, then the first one again.', boxes: 'Drag rectangles; overlaps are fine.' };
    function syncBar() {
        pressed('[data-tool]', 'data-tool', S.tool);
        var ball = S.tool === 'ball' || (!S.tool && S.region && S.region.kind === 'ball');
        $('gfm-sub').hidden = !(S.tool || ball);
        $('gfm-p').hidden = !ball;
        $('gfm-hint').textContent = S.tool ? HINTS[S.tool] : '';
        $('gfm-hint').hidden = !S.tool;
        $('gfm-done').hidden = !(S.tool === 'poly' || S.tool === 'boxes');
        Array.prototype.forEach.call(app.querySelectorAll('[data-p]'), function (b) {
            var p = b.getAttribute('data-p') === 'inf' ? Infinity : +b.getAttribute('data-p');
            b.setAttribute('aria-pressed', String(p === S.p));
        });
        Array.prototype.forEach.call(app.querySelectorAll('[data-preset]'), function (b) {
            b.setAttribute('aria-pressed', String(!S.tool && S.preset === b.getAttribute('data-preset')));
        });
        wrap.classList.toggle('is-drawing', !!S.tool);
    }
    function setTool(t) {
        stop();
        S.tool = S.tool === t ? null : t;
        S.draft = null; S.boxes = [];
        G.drawDraft('');
        if (S.tool) S.preset = null;
        if (S.tool === 'boxes') setRegion(null, false);
        else finalView();
        syncBar();
    }
    function finish(rg) {
        S.tool = null; S.draft = null;
        G.drawDraft('');
        if (rg) setRegion(rg, true); else { finalView(); syncBar(); }
    }
    function closePoly() {
        if (S.draft && S.draft.length >= 3) finish({ kind: 'poly', pts: S.draft });
    }

    function toView(e) {
        var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        var v = pt.matrixTransform(svg.getScreenCTM().inverse());
        return [Math.max(0, Math.min(N - 0.01, v.x)), Math.max(0, Math.min(N - 0.01, v.y))];
    }
    var drag = null, tap = null;
    wrap.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button > 0) return;
        if (e.target.closest('.gfm-osm')) return;
        var v = toView(e), lx = Math.floor(v[0]), ly = Math.floor(v[1]);
        if (!S.tool && S.view === 'alice') return;          /* Alice does not see Bob */
        if (!S.tool && e.target !== handle && e.pointerType === 'touch') {
            tap = { id: e.pointerId, x: e.clientX, y: e.clientY };     /* a tap puts Bob here; a swipe scrolls */
            return;
        }
        e.preventDefault();
        try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* not needed */ }
        if (!S.tool) {
            /* grabbing the pin moves his point with it, a click elsewhere puts Bob there */
            drag = { kind: 'bob', off: [0, 0] };
            if (e.target === handle) { drag.off = [S.bob.x + 0.5 - v[0], S.bob.y + 0.5 - v[1]]; handle.focus({ preventScroll: true }); }
            else moveBob(lx, ly);
            wrap.classList.add('is-dragging');
        } else if (S.tool === 'ball') {
            stop();
            drag = { kind: 'ball', cx: lx, cy: ly };
        } else if (S.tool === 'boxes') {
            drag = { kind: 'boxes', x: lx, y: ly };
        } else if (S.tool === 'poly') {
            var d = S.draft || [];
            if (d.length >= 3 && Math.hypot(v[0] - d[0][0], v[1] - d[0][1]) < 4) { closePoly(); return; }
            d.push(v); S.draft = d;
            G.drawDraft(G.paths.polyD(d, false), d);
        }
    });
    wrap.addEventListener('pointermove', function (e) {
        if (tap && tap.id === e.pointerId && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap = null;
        if (!drag) return;
        var v = toView(e), lx = Math.floor(v[0]), ly = Math.floor(v[1]);
        if (drag.kind === 'bob') {
            moveBob(Math.floor(v[0] + drag.off[0]), Math.floor(v[1] + drag.off[1]));
        } else if (drag.kind === 'ball') {
            drag.R = Math.round(Math.hypot(v[0] - drag.cx - 0.5, v[1] - drag.cy - 0.5));
            G.drawDraft(G.ballD({ cx: drag.cx, cy: drag.cy, R: Math.max(1, drag.R), p: S.p }));
        } else if (drag.kind === 'boxes') {
            drag.b = { x0: Math.min(drag.x, lx), y0: Math.min(drag.y, ly), x1: Math.max(drag.x, lx), y1: Math.max(drag.y, ly) };
            G.drawDraft(G.paths.rectD(drag.b.x0, drag.b.y0, drag.b.x1 - drag.b.x0 + 1, drag.b.y1 - drag.b.y0 + 1));
        }
    });
    function up(e) {
        if (tap && tap.id === e.pointerId) {
            var v = toView(e);
            tap = null;
            if (e.type === 'pointerup') moveBob(Math.floor(v[0]), Math.floor(v[1]));
            return;
        }
        if (!drag) return;
        var d = drag;
        drag = null;
        wrap.classList.remove('is-dragging');
        if (d.kind === 'ball') {
            G.drawDraft('');
            if (d.R >= 2) finish({ kind: 'ball', cx: d.cx, cy: d.cy, R: d.R, p: S.p });
        } else if (d.kind === 'boxes') {
            G.drawDraft('');
            if (d.b && d.b.x1 > d.b.x0 && d.b.y1 > d.b.y0) {
                S.boxes.push(d.b);
                setRegion({ kind: 'boxes', boxes: S.boxes.slice() }, false);
            }
        }
    }
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', up);
    handle.addEventListener('keydown', function (e) {
        var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!k || S.tool) return;
        e.preventDefault();
        var s = e.shiftKey ? 8 : 1;
        moveBob(S.bob.x + k[0] * s, S.bob.y + k[1] * s);
    });
    var rz = null;
    window.addEventListener('resize', function () {
        if (rz) cancelAnimationFrame(rz);
        rz = requestAnimationFrame(function () { rz = null; G.drawBob(S.bob, pinScale()); placeHandle(); });
    });

    /* ---------- buttons ---------- */
    app.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.hasAttribute('data-preset')) {
            S.tool = null; S.boxes = []; S.draft = null; G.drawDraft('');
            var name = b.getAttribute('data-preset'), rg = G.presets[name]();
            if (rg.kind === 'ball') S.p = 2;
            S.preset = name;
            S.bob = { x: G.bobAt[name].x, y: G.bobAt[name].y };
            setRegion(rg, true);
        }
        else if (b.hasAttribute('data-tool')) setTool(b.getAttribute('data-tool'));
        else if (b.hasAttribute('data-view')) setView(b.getAttribute('data-view'));
        else if (b.hasAttribute('data-p')) {
            S.p = b.getAttribute('data-p') === 'inf' ? Infinity : +b.getAttribute('data-p');
            if (!S.tool && S.region && S.region.kind === 'ball') {
                S.preset = null;
                setRegion({ kind: 'ball', cx: S.region.cx, cy: S.region.cy, R: S.region.R, p: S.p }, true);
            } else syncBar();
        }
        else if (b.id === 'gfm-done') { if (S.tool === 'poly') closePoly(); else finish(S.boxes.length ? { kind: 'boxes', boxes: S.boxes.slice() } : null); }
        else if (b.id === 'gfm-best') setR(best());
        else if (b.hasAttribute('data-goal')) { S.goal = b.getAttribute('data-goal'); drawChart(); setR(best()); compute(); }
        else if (b.id === 'gfm-replay') { if (S.tool) finish(null); play(); }
    });
    slider.addEventListener('input', function () { setR(+slider.value); });

    setView('god');
    S.preset = 'park';
    setRegion(G.presets.park(), true);
})(GFM);
