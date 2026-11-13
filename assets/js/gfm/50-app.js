/* /phd/projects/gfm/: the state and the controls. Alice's region (a ready one or drawn), the Partitioner shown step by
   step, the resolution slider and the cost chart, Bob dragged around (or moved with the arrow keys), and the three
   views. */
(function (G) {
    'use strict';
    var root = document.getElementById('gfm');
    if (!root) return;
    var $ = function (id) { return document.getElementById(id); };
    var app = $('gfm-app'), svg = $('gfm-map'), slider = $('gfm-r'), rOut = $('gfm-r-out'), stepEl = $('gfm-step');
    app.hidden = false;
    var N = G.N;
    var S = { goal: 'total', region: null, m: null, sw: null, top: G.RMAX, r: 1, part: null, bob: { x: G.bobStart.x, y: G.bobStart.y },
        view: 'god', tool: null, p: 2, draft: null, boxes: [], hit: null };
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    G.layers(svg);
    svg.setAttribute('tabindex', '0');
    var chart = G.chart($('gfm-chart'), function (r) { setR(r); });

    /* "Best for": what r* minimises, each read off the paper's complexity theorem and protocol figure (Section 4;
       the sums are in G.cost, 10-core.js). Message size is shown in kB. */
    var SUM = '&Sigma;2&lfloor;log<sub>2</sub>(2<var>&delta;</var>+1)&rfloor;', LR = '<var>L<sub>r</sub></var>', NJ = '<var>N<sub>r</sub></var>&middot;<var>J<sub>S</sub></var>';
    function kB(v) { return v ? (Math.round(v * 10) / 10) + ' kB' : '0'; }
    var GOALS = {
        total: { name: 'Cost(r)', scale: 1, fmt: G.fmt,
            f: 'Cost = ' + SUM + ' + ' + LR + ' + (<var>d</var>+1)&middot;' + NJ + ': all that both sides compute (the complexity theorem).' },
        alice: { name: 'Alice\u2019s work', scale: 1, fmt: G.fmt,
            f: 'Alice = ' + SUM + ' + ' + LR + ' + ' + NJ + ': her OKVS entries for the rectangles and the residual points, and one check per answer (the theorem\u2019s receiver bound).' },
        bob: { name: 'Bob\u2019s work', scale: 1, fmt: G.fmt,
            f: 'Bob = <var>d</var>&middot;' + NJ + ': <var>d</var> lookups per string vector in every rectangle (the sender bound). Residual points cost him one lookup in all, so he would rather have no rectangles.' },
        bits: { name: 'Message size', scale: 8000, fmt: kB,
            f: 'Size = 2<var>&lambda;</var>(' + SUM + ' + ' + LR + ') + (<var>&lambda;</var>+<var>&kappa;&prime;</var>)&middot;' + NJ + ' bits: Alice\u2019s pairs of group elements, Bob\u2019s answers. The theorem leaves out ' + LR + ', the protocol figure sends it; <var>&lambda;</var> = 256 and <var>&kappa;</var> = 40 are chosen here, the paper fixes neither.' }
    };
    function best() { return S.sw.best[S.goal]; }
    function drawChart() {
        var g = GOALS[S.goal];
        chart.set(S.sw.list.map(function (e) { return { r: e.r, cost: e[S.goal] / g.scale }; }), S.top, best(), g.fmt);
        $('gfm-goal-f').innerHTML = g.f;
        Array.prototype.forEach.call(document.querySelectorAll('[data-goal]'), function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-goal') === S.goal));
        });
    }

    /* ---------- the stages of the Partitioner ---------- */
    var timer = null;
    var LAYERS = ['region', 'box', 'grid', 'cells', 'runs', 'rects', 'lit', 'res', 'litres', 'outline'];
    function only(list) { LAYERS.forEach(function (n) { G.show(n, list.indexOf(n) >= 0); }); }
    function cap(t) { stepEl.textContent = t || ' '; }
    function plural(n, one, many) { return G.fmt(n) + ' ' + (n === 1 ? one : many); }
    function finalView() {
        only(['region', 'rects', 'lit', 'res', 'litres', 'outline']);
        var p = S.part;
        cap(p.box ? 'r = ' + S.r + ': ' + plural(p.K, 'rectangle', 'rectangles') + ' and ' + plural(p.L, 'residual point', 'residual points') + '. Drag Bob.' : '');
    }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } svg.classList.remove('is-playing'); }
    function play() {
        stop();
        var p = S.part;
        if (!p.box || still) { finalView(); return; }
        var pts = 0;
        for (var i = 0; i < N * N; i++) pts += S.m[i];
        var steps = [
            [['region', 'outline'], 'Alice’s region: ' + plural(pts, 'lattice point', 'lattice points')],
            [['region', 'outline', 'box'], 'Its bounding box'],
            [['region', 'outline', 'box', 'grid'], 'Cut into cells of ' + S.r + ' × ' + S.r + ' points'],
            [['region', 'outline', 'grid', 'cells'], 'Keep the cells wholly inside: ' + G.fmt(p.cells.length)],
            [['region', 'outline', 'grid', 'runs'], 'Fuse neighbours along each row'],
            [['region', 'outline', 'rects'], '… and down the columns: ' + plural(p.K, 'rectangle', 'rectangles')],
            [['region', 'outline', 'rects', 'res'], 'The points they miss: ' + plural(p.L, 'residual point', 'residual points')]
        ];
        var k = 0;
        svg.classList.add('is-playing');
        (function next() {
            if (k === steps.length) { timer = null; svg.classList.remove('is-playing'); finalView(); return; }
            only(steps[k][0]); cap(steps[k][1]);
            k++;
            timer = setTimeout(next, k === 1 ? 900 : 1300);
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
    function compute() {
        S.part = G.partition(S.m, S.r, S.sw.S);
        G.drawPartition(S.part);
        slider.value = S.r;
        rOut.textContent = S.r;
        chart.cur(S.r);
        var c = G.cost(S.part);
        var counts = $('gfm-counts');
        counts.textContent = '';
        [['N', S.part.K, S.part.K === 1 ? 'rectangle' : 'rectangles'], ['L', S.part.L, S.part.L === 1 ? 'residual point' : 'residual points']].forEach(function (x) {
            var v = document.createElement('var'); v.textContent = x[0];
            var sub = document.createElement('sub'); sub.textContent = 'r';
            v.appendChild(sub);
            counts.appendChild(v);
            counts.appendChild(document.createTextNode(' = ' + G.fmt(x[1]) + ' ' + x[2]));
            counts.appendChild(document.createElement('br'));
        });
        var g = GOALS[S.goal];
        counts.appendChild(document.createTextNode(g.name + ' = ' + g.fmt(c[S.goal] / g.scale)));
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
    function moveBob(x, y) {
        S.bob = { x: Math.max(0, Math.min(N - 1, x)), y: Math.max(0, Math.min(N - 1, y)) };
        S.hit = S.part && S.part.box ? G.locate(S.part, S.bob.x, S.bob.y) : null;
        G.drawBob(S.bob);
        G.drawLit(S.part, S.hit, S.bob);
        G.answer($('gfm-result'), $('gfm-learns'), S.view, S.part, S.hit);
        G.dasa($('gfm-dasa'), S.view, S.part, S.hit, S.bob);
    }
    function setView(v) {
        S.view = v;
        root.setAttribute('data-view', v);
        Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) {
            if (b !== root) b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v));
        });
        if (S.part) moveBob(S.bob.x, S.bob.y);
    }

    /* ---------- drawing tools ---------- */
    var HINTS = { ball: 'Drag from the centre outward.', poly: 'Tap the corners; tap the first one again to close.', boxes: 'Drag rectangles; overlaps are fine.' };
    function syncBar() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-tool') === S.tool));
        });
        var ball = S.tool === 'ball' || (!S.tool && S.region && S.region.kind === 'ball');
        $('gfm-sub').hidden = !(S.tool || ball);
        $('gfm-p').hidden = !ball;
        $('gfm-hint').textContent = S.tool ? HINTS[S.tool] : '';
        $('gfm-done').hidden = !(S.tool === 'poly' || S.tool === 'boxes');
        Array.prototype.forEach.call(document.querySelectorAll('[data-p]'), function (b) {
            var p = b.getAttribute('data-p') === 'inf' ? Infinity : +b.getAttribute('data-p');
            b.setAttribute('aria-pressed', String(p === S.p));
        });
        svg.classList.toggle('is-drawing', !!S.tool);
    }
    function setTool(t) {
        stop();
        S.tool = S.tool === t ? null : t;
        S.draft = null; S.boxes = [];
        G.drawDraft('');
        if (S.tool === 'boxes') setRegion(null, false);
        else if (S.tool) cap(HINTS[S.tool]);
        syncBar();
    }
    function finish(rg) {
        S.tool = null; S.draft = null;
        G.drawDraft('');
        if (rg) setRegion(rg, true); else syncBar();
    }
    function closePoly() {
        if (S.draft && S.draft.length >= 3) finish({ kind: 'poly', pts: S.draft });
    }

    function toView(e) {
        var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        var v = pt.matrixTransform(svg.getScreenCTM().inverse());
        return [Math.max(0, Math.min(N - 0.01, v.x)), Math.max(0, Math.min(N - 0.01, v.y))];
    }
    var drag = null;
    svg.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button > 0) return;
        var v = toView(e), lx = Math.floor(v[0]), ly = Math.floor(v[1]);
        e.preventDefault();
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* not needed */ }
        if (!S.tool) {
            drag = { kind: 'bob' };
            /* the cat floats above the point: grabbing the cat moves the point with it, a tap elsewhere puts Bob there */
            var dx = v[0] - (S.bob.x + 0.5), dy = v[1] - (S.bob.y + 0.5 - 6.5);
            drag.off = dx * dx + dy * dy < 40 ? [S.bob.x + 0.5 - v[0], S.bob.y + 0.5 - v[1]] : [0, 0];
            if (!drag.off[0] && !drag.off[1]) moveBob(lx, ly);
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
    svg.addEventListener('pointermove', function (e) {
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
    function up() {
        if (!drag) return;
        var d = drag;
        drag = null;
        if (d.kind === 'ball') {
            G.drawDraft('');
            if (d.R >= 2) finish({ kind: 'ball', cx: d.cx, cy: d.cy, R: d.R, p: S.p });
        } else if (d.kind === 'boxes') {
            G.drawDraft('');
            if (d.b && d.b.x1 > d.b.x0 && d.b.y1 > d.b.y0) {
                S.boxes.push(d.b);
                setRegion({ kind: 'boxes', boxes: S.boxes.slice() }, false);
                cap(HINTS.boxes);
            }
        }
    }
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('keydown', function (e) {
        var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!k || S.tool) return;
        e.preventDefault();
        var s = e.shiftKey ? 8 : 1;
        moveBob(S.bob.x + k[0] * s, S.bob.y + k[1] * s);
    });

    /* ---------- buttons ---------- */
    app.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.hasAttribute('data-preset')) { S.tool = null; G.drawDraft(''); var name = b.getAttribute('data-preset'), rg = G.presets[name]();
            if (rg.kind === 'ball') S.p = 2;
            S.bob = { x: G.bobAt[name].x, y: G.bobAt[name].y };
            setRegion(rg, true);
        }
        else if (b.hasAttribute('data-tool')) setTool(b.getAttribute('data-tool'));
        else if (b.hasAttribute('data-view')) setView(b.getAttribute('data-view'));
        else if (b.hasAttribute('data-p')) {
            S.p = b.getAttribute('data-p') === 'inf' ? Infinity : +b.getAttribute('data-p');
            if (!S.tool && S.region && S.region.kind === 'ball') {
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
    setRegion(G.presets.park(), true);
})(GFM);
