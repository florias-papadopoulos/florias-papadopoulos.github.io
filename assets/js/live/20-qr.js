/* QR codes for the live links, drawn with the vendored encoder (vendor/qrcode-generator.js, MIT, loaded before this
   file): error correction M (survives a projector's glare and a bit of a slide's frame), the smallest version that
   fits, a quiet zone of 4 modules. Also used by tools/live-worker/test/qr.cjs, which decodes the codes again. */
(function (LV, qrcode) {
    'use strict';
    var QUIET = 4;

    /* { n: modules per side, dark(row, col) } */
    LV.qr = function (text) {
        var q = qrcode(0, 'M');
        q.addData(unescape(encodeURIComponent(text)), 'Byte');  // UTF-8 bytes, one per character
        q.make();
        var n = q.getModuleCount();
        return { n: n, dark: function (r, c) { return q.isDark(r, c); } };
    };

    /* an SVG (as text) with one path of horizontal runs; black on white, crisp at any size */
    LV.qrSvg = function (text, title) {
        var m = LV.qr(text), n = m.n, w = n + 2 * QUIET, d = '';
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                if (!m.dark(r, c)) continue;
                var s = c;
                while (c + 1 < n && m.dark(r, c + 1)) c++;
                d += 'M' + (s + QUIET) + ' ' + (r + QUIET) + 'h' + (c - s + 1) + 'v1h-' + (c - s + 1) + 'z';
            }
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + w + '" width="' + w * 10 + '" height="' + w * 10 +
            '" shape-rendering="crispEdges">' + (title ? '<title>' + esc(title) + '</title>' : '') +
            '<rect width="' + w + '" height="' + w + '" fill="#ffffff"/><path fill="#000000" d="' + d + '"/></svg>';
    };
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    /* an <img> of the code (a data: URL, which the site's Content-Security-Policy allows for images) */
    LV.qrImg = function (text, cls, alt) {
        var img = document.createElement('img');
        img.className = cls || '';
        img.alt = alt || 'QR code for ' + text.replace(/^https?:\/\//, '');
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LV.qrSvg(text));
        return img;
    };

    /* a PNG at least px wide, whole pixels per module (sharp when pasted into slides), as a data: URL */
    LV.qrPng = function (text, px) {
        var m = LV.qr(text), w = m.n + 2 * QUIET, k = Math.max(1, Math.ceil((px || 1200) / w));
        var cv = document.createElement('canvas');
        cv.width = cv.height = w * k;
        var g = cv.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, cv.width, cv.height);
        g.fillStyle = '#000000';
        for (var r = 0; r < m.n; r++) for (var c = 0; c < m.n; c++) if (m.dark(r, c)) g.fillRect((c + QUIET) * k, (r + QUIET) * k, k, k);
        return cv.toDataURL('image/png');
    };
})(window.LV = window.LV || {}, window.qrcode);
