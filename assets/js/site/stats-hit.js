/* The visit counter (included by layouts/_default/baseof.html only when params.statsEndpoint is set; the receiver is
   tools/workers/stats/worker.js, the totals are shown on /stats/). Once the page has loaded it sends ONE small beacon
   per page view: the page path, the referring site (only when it is another site), phone/tablet/desktop and the
   browser family. No cookies, no identifiers, nothing stored here. Nothing is sent when the browser asks not to be
   tracked (Do Not Track, Global Privacy Control), on a local preview, or when this browser was excluded on /stats/
   (localStorage 'stats-ignore' = '1'). What is sent, and these conditions, are worked out in assets/js/site/stats-detect.js,
   which /you/ uses too to show visitors exactly what is recorded about their visit. */
(function () {
    'use strict';
    var me = document.getElementById('stats-hit');
    var end = me && (me.getAttribute('data-endpoint') || '').replace(/\/+$/, '');
    if (!end) return;
    var nav = navigator, loc = location;

    var D = window.StatsDetect;               /* assets/js/site/stats-detect.js, bundled before this file */
    if (!D || D.skip()) return;

    var sent = false;
    function send() {
        if (sent) return;
        sent = true;
        var body = JSON.stringify({ p: me.getAttribute('data-page') || loc.pathname, r: D.referrer(), d: D.device(), b: D.browser() });
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
