/* The satellites page, part 30: the "close approaches" panel. Sends the objects shown to the worker (50-worker.js,
   its own script, data-worker on #sat-app), lists what it finds, and shows a pair on the globe when it is clicked.
   Runs once by itself when the orbits are loaded. */
var SATCA = (function () {
    'use strict';
    var P = self.SATPAGE, app = document.getElementById('sat-app');
    if (!P || !app) return null;
    var $ = function (id) { return document.getElementById(id); };
    var worker = null, job = 0, sent = null, busy = false, SHOW = 40, FIRST = 10;
    var run = $('sat-ca-run'), stat = $('sat-ca-status'), list = $('sat-ca-list');

    function start() {
        if (!window.Worker) { stat.textContent = 'This browser cannot run the screening (no Web Workers).'; return; }
        if (!worker) {
            try { worker = new Worker(app.getAttribute('data-worker')); } catch (e) { worker = null; }
            if (!worker) { stat.textContent = 'The screening could not start.'; return; }
            worker.onmessage = got;
            worker.onerror = function () { busy = false; run.disabled = false; stat.textContent = 'The screening stopped with an error.'; };
        }
        var O = P.objects, objs = [], map = [];
        for (var i = 0; i < O.n; i++) {
            var g = P.groups[O.grp[i]];
            if (!g.el.checked) continue;
            objs.push({ rec: O.rec[i], own: g.own });
            map.push(i);
        }
        if (objs.length < 2) { stat.textContent = 'Show at least two objects to screen them.'; list.innerHTML = ''; return; }
        var hours = Number($('sat-ca-hours').value), km = Number($('sat-ca-km').value);
        var t = Math.round(P.time() / 1000) * 1000;
        sent = { id: ++job, map: map, hours: hours, km: km, start: t, n: objs.length, t0: Date.now() };
        busy = true;
        run.disabled = true;
        $('sat-ca-stale').hidden = true;
        stat.textContent = 'Screening ' + P.nf(objs.length) + ' objects';
        worker.postMessage({ cmd: 'screen', id: job, objs: objs, start: t, hours: hours, km: km });
    }

    function got(e) {
        var m = e.data;
        if (!sent || m.id !== sent.id) return;
        if (m.progress !== undefined && !m.done) {
            stat.textContent = 'Screening ' + P.nf(sent.n) + ' objects: ' + Math.round(m.progress * 100) + '%';
            return;
        }
        busy = false;
        run.disabled = false;
        if (m.error) { stat.textContent = 'The screening stopped with an error.'; return; }
        var s = sent, secs = ((Date.now() - s.t0) / 1000);
        stat.textContent = (m.found ? P.nf(m.found) + (m.found === 1 ? ' pair passes' : ' pairs pass') : 'No pair passes') +
            ' within ' + s.km + ' km of each other in the ' + s.hours + ' hours from ' + P.fmtTime(s.start).slice(0, 5) +
            ' UTC (' + P.nf(m.objects) + ' objects, ' + P.nf(secs, 1) + ' s in this browser).' +
            (m.found ? ' Closest first:' : '');
        list.innerHTML = '';
        m.list.slice(0, SHOW).forEach(function (r, k) {
            var a = s.map[r.a], b = s.map[r.b], O = P.objects;
            var li = document.createElement('li'), btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sat-ca-item';
            btn.innerHTML = '<span class="sat-ca-d">' + P.nf(r.d, 2) + ' km</span>' +
                '<span class="sat-ca-names">' + P.esc(O.name[a]) + ' <span class="sat-ca-and">and</span> ' + P.esc(O.name[b]) + '</span>' +
                '<span class="sat-ca-when">' + P.fmtTime(r.t) + ' UTC, ' + P.fmtOffset(r.t - Date.now()) + ', ' + P.nf(r.alt) +
                ' km up, ' + P.nf(r.v, 1) + ' km/s</span>';
            btn.addEventListener('click', function () {
                Array.prototype.forEach.call(list.querySelectorAll('.sat-ca-item'), function (x) { x.removeAttribute('aria-current'); });
                btn.setAttribute('aria-current', 'true');
                P.showPair(a, b, r);
            });
            li.appendChild(btn);
            if (k >= FIRST) li.hidden = true;
            list.appendChild(li);
        });
        var more = $('sat-ca-more'), rest = Math.min(m.list.length, SHOW) - FIRST;
        more.hidden = rest <= 0;
        more.textContent = 'Show ' + rest + ' more';
    }
    $('sat-ca-more').addEventListener('click', function () {
        Array.prototype.forEach.call(list.children, function (li) { li.hidden = false; });
        this.hidden = true;
    });

    run.addEventListener('click', function () { if (!busy) start(); });
    return {
        ready: function () { run.disabled = false; start(); },
        stale: function () { if (sent) $('sat-ca-stale').hidden = false; }
    };
}());
