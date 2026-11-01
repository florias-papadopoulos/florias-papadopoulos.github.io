/* The visit counter (included by layouts/_default/baseof.html only when params.statsEndpoint is set; the receiver is
   tools/stats-worker/worker.js, the totals are shown on /stats/). Once the page has loaded it sends ONE small beacon
   per page view: the page path, the referring site (only when it is another site), phone/tablet/desktop and the
   browser family. No cookies, no identifiers, nothing stored here. Nothing is sent when the browser asks not to be
   tracked (Do Not Track, Global Privacy Control), on a local preview, or when this browser was excluded on /stats/
   (localStorage 'stats-ignore' = '1'). */
(function () {
    'use strict';
    var me = document.getElementById('stats-hit');
    var end = me && (me.getAttribute('data-endpoint') || '').replace(/\/+$/, '');
    if (!end) return;
    var nav = navigator, loc = location;

    if (nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.globalPrivacyControl === true) return;
    if (loc.protocol === 'file:' || /^(localhost|127(\.\d+){3}|\[?::1\]?|0\.0\.0\.0)$/.test(loc.hostname) || /\.localhost$/.test(loc.hostname)) return;
    try { if (localStorage.getItem('stats-ignore') === '1') return; } catch (e) { /* storage blocked: count normally */ }

    function device() {
        var ua = nav.userAgent || '', touch = nav.maxTouchPoints > 1, w = Math.min(screen.width, screen.height);
        if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || (/Macintosh/.test(ua) && touch)) return 'tablet';
        if (/Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/.test(ua)) return 'phone';
        if (touch && w && w < 600) return 'phone';
        return 'desktop';
    }
    function browser() {
        var ua = nav.userAgent || '';
        if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
        if (/OPR\/|Opera/.test(ua)) return 'Opera';
        if (/SamsungBrowser|YaBrowser|UCBrowser/.test(ua)) return 'Other';
        if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
        if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return 'Chrome';
        if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
        return 'Other';
    }
    function referrer() {
        try {
            var h = document.referrer ? new URL(document.referrer).hostname : '';
            return h && h !== loc.hostname ? h.replace(/^www\./, '') : '';
        } catch (e) { return ''; }
    }

    var sent = false;
    function send() {
        if (sent) return;
        sent = true;
        var body = JSON.stringify({ p: me.getAttribute('data-page') || loc.pathname, r: referrer(), d: device(), b: browser() });
        var url = end + '/hit';
        try {
            if (nav.sendBeacon && nav.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
        } catch (e) { /* fall back to fetch */ }
        try {
            fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain' }, keepalive: true, credentials: 'omit' })
                .catch(function () { /* the count is not worth an error */ });
        } catch (e) { /* nothing more to try */ }
    }
    function later() {
        if (window.requestIdleCallback) requestIdleCallback(send, { timeout: 3000 });
        else setTimeout(send, 1200);
    }
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later);
})();
