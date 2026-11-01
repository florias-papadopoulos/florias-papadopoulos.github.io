/* What the visit counter records about a page view, and whether it counts it at all, worked out in one place. Bundled
   before assets/js/stats-hit.js (which sends it, from layouts/_default/baseof.html) and before assets/js/you.js
   (which shows it to the visitor on /you/), so both always agree. */
window.StatsDetect = window.StatsDetect || (function () {
    'use strict';
    var nav = navigator, loc = location;

    /* phone, tablet or desktop */
    function device() {
        var ua = nav.userAgent || '', touch = nav.maxTouchPoints > 1, w = Math.min(screen.width, screen.height);
        if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || (/Macintosh/.test(ua) && touch)) return 'tablet';
        if (/Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/.test(ua)) return 'phone';
        if (touch && w && w < 600) return 'phone';
        return 'desktop';
    }
    /* the browser family: Firefox, Chrome, Safari, Edge, Opera or Other */
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
    /* the site that sent the visitor, only when it is another site ('' otherwise) */
    function referrer() {
        try {
            var h = document.referrer ? new URL(document.referrer).hostname : '';
            return h && h !== loc.hostname ? h.replace(/^www\./, '') : '';
        } catch (e) { return ''; }
    }
    /* why this page view is not counted: 'dnt' (Do Not Track or Global Privacy Control), 'local' (a preview copy),
       'ignored' (switched off on /stats/ in this browser), or '' when it is counted */
    function skip() {
        if (nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.globalPrivacyControl === true) return 'dnt';
        if (loc.protocol === 'file:' || /^(localhost|127(\.\d+){3}|\[?::1\]?|0\.0\.0\.0)$/.test(loc.hostname) || /\.localhost$/.test(loc.hostname)) return 'local';
        try { if (localStorage.getItem('stats-ignore') === '1') return 'ignored'; } catch (e) { /* storage blocked: count normally */ }
        return '';
    }
    return { device: device, browser: browser, referrer: referrer, skip: skip };
})();
