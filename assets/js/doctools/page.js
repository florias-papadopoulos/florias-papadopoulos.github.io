/* DocTools, Compress PDF page (layouts/doctools/single.html): choosing or dropping files, the level, the list of
   files with their results, and the "Where your files went" box. The work itself happens in a Web Worker
   (worker.js + compress.js, with MuPDF), started from a blob: URL so that it keeps this page's
   Content-Security-Policy (see worker.js). Nothing here sends a file anywhere: files are read with
   File.arrayBuffer(), handed to the worker, and the result comes back as a Blob to download. */
(function () {
    'use strict';
    var tool = document.getElementById('dt-tool');
    if (!tool) return;
    var drop = document.getElementById('dt-drop');
    var input = document.getElementById('dt-file');
    var list = document.getElementById('dt-files');
    var netBox = document.getElementById('dt-net');
    var netCount = document.getElementById('dt-net-count');
    var netList = document.getElementById('dt-net-list');
    var workerUrl = new URL(tool.getAttribute('data-worker'), location.href).href;
    var engineUrl = new URL(tool.getAttribute('data-engine'), location.href).href;
    var counterHost = tool.getAttribute('data-counter') || '';

    var files = [];        // { id, name, bytes, row, url, state }
    var queue = [];        // ids waiting
    var running = null;    // the file being worked on
    var worker = null, ready = null, engineLoaded = false, nextId = 1;

    function level() {
        var r = tool.querySelector('input[name="dt-level"]:checked');
        return r ? r.value : 'recommended';
    }

    function size(n) {
        if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
        return (n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0) + ' MB';
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    /* ---- the worker ---- */
    function startWorker() {
        var src = new Blob(['import ' + JSON.stringify(workerUrl) + ';'], { type: 'text/javascript' });
        var blobUrl = URL.createObjectURL(src);
        worker = new Worker(blobUrl, { type: 'module' });
        ready = new Promise(function (resolve, reject) {
            worker.onmessage = function (e) { if (e.data && e.data.ready) { URL.revokeObjectURL(blobUrl); worker.onmessage = onMessage; resolve(); } };
            worker.onerror = function (e) { URL.revokeObjectURL(blobUrl); reject(e); };
        });
        return ready;
    }

    function stopWorker() {
        if (worker) worker.terminate();
        worker = null; ready = null; engineLoaded = false;
    }

    function onMessage(e) {
        var m = e.data, f = running;
        if (!f || m.id !== f.id) return;
        if (m.progress) { showProgress(f, m.progress); return; }
        if (m.net) addNet(m.net);
        running = null;
        if (m.ok) { engineLoaded = true; done(f, m); } else failed(f, m.err);
        next();
    }

    function next() {
        if (running) return;
        var id = queue.shift();
        if (id == null) return;
        var f = byId(id);
        if (!f) { next(); return; }
        running = f;
        f.level = level();
        setStatus(f, engineLoaded ? 'Starting...' : 'Loading the PDF engine (about 5 MB, only the first time)...', true);
        (ready || startWorker()).then(function () {
            if (running !== f) return;
            // a copy goes to the worker, the original stays here for another level
            var copy = f.bytes.slice(0);
            worker.postMessage({ id: f.id, op: 'compress', engine: engineUrl, bytes: copy, level: f.level }, [copy]);
        }, function () {
            running = null; stopWorker();
            failed(f, 'WORKER');
            next();
        });
    }

    function byId(id) { for (var i = 0; i < files.length; i++) if (files[i].id === id) return files[i]; return null; }

    /* ---- one row per file ---- */
    function addFile(file) {
        var f = { id: nextId++, name: file.name, row: el('li', 'dt-file') };
        var head = el('div', 'dt-file-head');
        head.appendChild(el('span', 'dt-name', file.name));
        head.appendChild(el('span', 'dt-size', size(file.size)));
        var rm = el('button', 'dt-remove', '×');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Remove ' + file.name);
        rm.addEventListener('click', function () { remove(f); });
        head.appendChild(rm);
        f.row.appendChild(head);
        f.status = el('div', 'dt-status');
        f.row.appendChild(f.status);
        list.appendChild(f.row);
        list.hidden = false;
        files.push(f);
        setStatus(f, 'Reading...', true);
        file.arrayBuffer().then(function (buf) {
            var head = new TextDecoder('latin1').decode(new Uint8Array(buf, 0, Math.min(1024, buf.byteLength)));
            if (head.indexOf('%PDF-') < 0) { failed(f, 'NOT_PDF'); return; }
            f.bytes = buf;
            f.size = buf.byteLength;
            setStatus(f, 'Waiting...', true);
            queue.push(f.id);
            next();
        }, function () { failed(f, 'READ'); });
    }

    function remove(f) {
        if (running === f) { running = null; stopWorker(); }
        queue = queue.filter(function (id) { return id !== f.id; });
        if (f.url) URL.revokeObjectURL(f.url);
        f.bytes = null;
        files = files.filter(function (x) { return x !== f; });
        f.row.remove();
        if (!files.length) list.hidden = true;
        next();
    }

    function setStatus(f, text, busy) {
        f.status.textContent = '';
        f.row.classList.toggle('dt-busy', !!busy);
        f.status.appendChild(el('span', 'dt-msg', text));
        if (busy) { f.bar = el('progress', 'dt-bar'); f.status.appendChild(f.bar); } else f.bar = null;
    }

    var PHASES = { measure: 'Measuring the pictures on each page', images: 'Shrinking the pictures', save: 'Writing the new PDF' };
    function showProgress(f, p) {
        var label = PHASES[p[0]] || 'Working';
        var msg = f.status.querySelector('.dt-msg');
        if (msg) msg.textContent = label + (p[0] === 'save' ? '...' : ' (' + p[1] + ' of ' + p[2] + ')...');
        if (f.bar) { f.bar.max = p[2] || 1; f.bar.value = p[1]; }
    }

    function done(f, m) {
        if (f.url) { URL.revokeObjectURL(f.url); f.url = null; }
        var out = m.out.byteLength;
        f.status.textContent = '';
        f.row.classList.remove('dt-busy');
        if (out >= f.size * 0.98) {
            f.status.appendChild(el('span', 'dt-msg', 'Already compact: at this level the result would not be smaller (' + size(out) + '). Try a stronger level, or keep your file as it is.'));
            return;
        }
        var pct = Math.round(100 * (1 - out / f.size));
        var res = el('span', 'dt-msg dt-ok');
        res.appendChild(document.createTextNode(size(f.size) + ' → '));
        res.appendChild(el('b', null, size(out)));
        res.appendChild(document.createTextNode(', ' + pct + '% smaller'));
        f.status.appendChild(res);
        f.url = URL.createObjectURL(new Blob([m.out], { type: 'application/pdf' }));
        var a = el('a', 'dt-download', 'Download');
        a.href = f.url;
        a.download = f.name.replace(/\.pdf$/i, '') + '-compressed.pdf';
        f.status.appendChild(a);
        if (m.st && m.st.signed) f.status.appendChild(el('span', 'dt-msg dt-err', 'This PDF is digitally signed. The smaller copy is no longer signed: keep the original wherever the signature matters.'));
    }

    var ERRORS = {
        PASSWORD: 'This PDF is locked with a password. Open it, save a copy without the password, then try again.',
        NOT_PDF: 'This is not a PDF file.',
        READ: 'Your browser could not read this file.',
        WORKER: 'The PDF engine could not start in this browser.',
    };
    function failed(f, err) {
        f.row.classList.remove('dt-busy');
        f.status.textContent = '';
        var msg = ERRORS[err] || (/memory|malloc/i.test(err) ? 'This file is too big for the memory your browser gives a page. Try it on a computer, or split it first.' : 'MuPDF could not compress this PDF (' + err + ').');
        f.status.appendChild(el('span', 'dt-msg dt-err', msg));
        // after any engine failure (out of memory, an abort inside MuPDF) start a fresh engine for the next file
        if (err !== 'PASSWORD' && err !== 'NOT_PDF' && err !== 'READ') stopWorker();
    }

    /* ---- choosing files ---- */
    function take(fileList) {
        for (var i = 0; i < fileList.length; i++) addFile(fileList[i]);
        watchNet();
    }
    input.addEventListener('change', function () { take(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) {
        drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('dt-over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
        drop.addEventListener(t, function () { drop.classList.remove('dt-over'); });
    });
    drop.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) take(e.dataTransfer.files); });
    // a file dropped next to the box must not make the browser leave the page to show it
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });

    // another level: the same files again, from their originals
    tool.addEventListener('change', function (e) {
        if (e.target.name !== 'dt-level') return;
        files.forEach(function (f) {
            if (!f.bytes || running === f || queue.indexOf(f.id) >= 0) return;
            setStatus(f, 'Waiting...', true);
            queue.push(f.id);
        });
        if (running && running.level !== level()) queue.push(running.id);
        next();
    });

    /* ---- "Where your files went": every request since the first file, from the page and from the worker ---- */
    var watching = false, seen = 0, unexpected = 0;
    function watchNet() {
        if (watching) return;
        watching = true;
        netBox.hidden = false;
        if (window.PerformanceObserver) {
            try {
                new PerformanceObserver(function (l) {
                    addNet(l.getEntries().map(function (e) { return { url: e.name, bytes: e.transferSize || 0 }; }));
                }).observe({ type: 'resource' });
            } catch (e) { /* old browser: only the worker's requests are listed */ }
        }
        showNet();
    }
    function what(u) {
        var url;
        try { url = new URL(u); } catch (e) { return u; }
        var file = url.pathname.split('/').pop();
        if (url.origin === location.origin) {
            // blob: and data: never reach here (they are not requests)
            if (url.pathname.indexOf('/engines/') >= 0) return 'this site: ' + file + ' (the PDF engine)';
            if (url.pathname.indexOf('/js/') >= 0) return 'this site: ' + file + ' (this tool\'s code)';
            return 'this site: ' + url.pathname;
        }
        if (counterHost && url.host === counterHost) return url.host + ' (the visit counter: this page\'s name only)';
        unexpected++;
        return url.host + url.pathname + ' (not expected)';
    }
    function addNet(entries) {
        entries.forEach(function (e) {
            if (e.url.indexOf('blob:') === 0 || e.url.indexOf('data:') === 0) return;
            seen++;
            var li = el('li', null, what(e.url) + (e.bytes ? ', ' + size(e.bytes) + ' downloaded' : ''));
            netList.appendChild(li);
        });
        showNet();
    }
    function showNet() {
        netCount.textContent = seen === 0
            ? 'Requests since you chose a file: 0.'
            : unexpected
                ? 'Requests since you chose a file: ' + seen + ', listed below. ' + unexpected + ' went somewhere this tool does not expect.'
                : 'Requests since you chose a file: ' + seen + ', listed below: only downloads from this site, which carry nothing of yours.';
        netList.hidden = seen === 0;
    }
})();
