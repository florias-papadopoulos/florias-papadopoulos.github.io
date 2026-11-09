/* World of the cat on the Bachelor, Master and Papers tabs (the cat itself: assets/js/cat-core.js, bundled before this
   file by layouts/partials/cat.html; the page: layouts/_default/timeline.html), and on the Games page
   (layouts/_default/arcade.html: it sits on the title, the tabs and the game cards; hidden while a game is open).

   The cat lives in the window, not on the whole page: its ground is the bottom of the window, and it sits on the page
   title, the semester (or year) labels of the rail and the entries that are in view, above their pictures so it does
   not hide titles. When the page scrolls, it rides along on whatever it sits on and drops down when that leaves the
   window. It never sits on opened entries and moves away soon when one opens under it. On phones it is a little smaller
   (66 x 54) and does the same, with longer naps on the ground in a corner. No symbols or reset button here (home page only). */
(function () {
    function boot() {
    'use strict';
    var layer = document.getElementById('cat-layer');
    var page = document.querySelector('.tl-page') || document.querySelector('.arcade');
    if (!layer || !page || !window.SiteCat) return;
    layer.classList.add('cat-viewport');

    var api, phone = false, moveSoon = null;

    function ground() { return layer.clientHeight - (phone ? 3 : 6); }
    function rel(el) { return api.rel(el); }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    /* the parts of opened entries in view, in layer coordinates */
    function openRects() {
        var out = [];
        Array.prototype.forEach.call(document.querySelectorAll('.tl-entry.open .tl-more'), function (m) {
            if (!m.hidden) out.push(rel(m));
        });
        return out;
    }
    /* would the cat with its feet at t hide part of an opened entry? */
    function covers(t) {
        var sz = api.size(), x0 = t.x - sz.w / 2 + 6, x1 = t.x + sz.w / 2 - 6, y0 = t.y - sz.h + 6, y1 = t.y - 2;
        return openRects().some(function (r) { return x1 > r.x && x0 < r.x + r.w && y1 > r.y && y0 < r.y + r.h; });
    }
    function inView(el) {
        var r = el.getBoundingClientRect();
        return r.width > 24 && r.bottom > 0 && r.top < window.innerHeight;
    }

    function perches() {
        var list = [], CH = api.size().h;
        function push(sel, kind, extra) {
            Array.prototype.forEach.call(document.querySelectorAll(sel), function (e) {
                if (!inView(e)) return;
                var p = { el: e, kind: kind };
                for (var k in extra) p[k] = extra[k];
                list.push(p);
            });
        }
        push('.tl-h1-text', 'title', { w: 1.2, room: CH - 6 });
        push('.tl-label-text', 'rail', { w: 1.6 });
        push('.tl-toggle', 'row', { w: 0.7 });
        if (document.body.classList.contains('arcade-playing')) return [];
        push('.arcade-head h1', 'title', { w: 1.2, room: CH - 6 });
        push('.arcade-tab', 'tab', { w: 0.5, room: CH - 6 });
        push('.arcade-grid:not([hidden]) .game-card', 'card', { w: 0.9 });
        push('.arcade-boards:not([hidden]) .ab-card', 'card', { w: 0.9 });
        return list;
    }
    /* Games page: the cat climbs up the side of a game card instead of jumping when the card stands in the same column
       as where it is: from the ground if the column of cards reaches down near it, or from the top of a card below */
    function climbPath(p, at, pos) {
        if (p.kind !== 'card') return null;
        var r = rel(p.el), cx = r.x + r.w / 2;
        function sameColumn(e) { var q = rel(e); return Math.abs(q.x + q.w / 2 - cx) < r.w / 2; }
        /* the side nearer the cat, unless the cat would hang off the screen there (phones: the cards fill the width) */
        var CHt = api.size().h, roomL = r.x, roomR = layer.clientWidth - (r.x + r.w), left = pos.x < cx;
        if (left && roomL < CHt * 0.8 && roomR > roomL) left = false;
        else if (!left && roomR < CHt * 0.8 && roomL > roomR) left = true;
        var side = left ? r.x - 2 : r.x + r.w + 2, wall = left ? 1 : -1;
        if (at && at.el && at.kind === 'card' && at.el !== p.el && sameColumn(at.el) && rel(at.el).y > r.y + r.h - 4) {
            return { x: side, from: pos.y, to: r.y, side: wall };      /* the card right below: climb from its top */
        }
        if (at && at.kind === 'ground') {
            var low = r.y + r.h;                              /* the bottom of the column of cards under this one */
            Array.prototype.forEach.call(document.querySelectorAll('.arcade-grid:not([hidden]) .game-card'), function (e) {
                var q = rel(e);
                if (sameColumn(e) && q.y > r.y && q.y - low < 30) low = Math.max(low, q.y + q.h);
            });
            if (ground() - low < 120) return { x: side, from: ground(), to: r.y, side: wall };
        }
        return null;
    }
    /* on a row the cat sits over the pictures (the row above has its picture there too), never over the titles */
    function spot(p, fx) {
        if (p.kind !== 'row') return null;
        var top = rel(p.el).y, th = p.el.querySelector('.tl-thumb'), w = api.size().w;
        var r = th ? rel(th) : { x: rel(p.el).x + 12, w: w };
        return { x: r.x + w / 2 - 4 + Math.max(0, r.w - w + 8) * fx, y: top };
    }
    function allow(p, t) {
        if (p.kind !== 'ground' && t.y > ground() - 12) return false;
        return !covers(t);
    }
    /* somewhere on the bottom edge: on desktop mostly in the margins beside the page, on phones in a corner */
    function wander() {
        var W = layer.clientWidth;
        if (phone) return Math.random() < 0.75 ? rnd(W - 64, W - 34) : rnd(34, 64);
        var m = page.getBoundingClientRect(), left = m.left - 50, right = W - m.right - 50;
        if (Math.random() < 0.9 && Math.max(left, right) > 90) {
            if (right > 90 && (left <= 90 || Math.random() < 0.5)) return rnd(m.right + 50, W - 40);
            return rnd(40, m.left - 10);
        }
        return rnd(40, W - 40);
    }
    function arrive(p, r) {
        if (phone && p.kind === 'ground') {      /* on phones it rests longer in its corner */
            if (r < 0.45) api.nap(rnd(14000, 24000)); else { if (r > 0.8) api.groom(); api.next(rnd(7000, 13000)); }
            return true;
        }
        if (p.kind === 'row' || p.kind === 'card') {   /* a short stop on a row or a game card */
            if (r < 0.3) api.groom();
            api.next(rnd(1600, 3400));
            return true;
        }
        if ((p.kind === 'rail' || p.kind === 'ground') && r < 0.16) { api.nap(); return true; }
        return false;
    }
    function start() {
        if (phone) return { kind: 'ground', x: layer.clientWidth - 48 };
        var first = perches().filter(function (p) { return p.kind === 'rail' && api.spotOn(p, 0.5).y > api.size().h + 34 && api.spotOn(p, 0.5).y < ground() - 12; })[0];
        if (first) { first.fx = 0.5; return first; }
        return { kind: 'ground', x: wander() };
    }

    /* the page moved under the cat (scrolling, an entry opening): ride along, drop down, or make room */
    function follow() {
        if (!api || api.moving()) return;
        var at = api.at(), pos = api.pos(), sz = api.size();
        if (!at) return;
        var s;
        if (at.kind === 'ground') {
            s = { x: pos.x, y: ground() };
            api.place(s.x, s.y);
        } else if (at.el) {
            s = api.spotOn(at, at.fx != null ? at.fx : 0.5);
            if (!at.el.isConnected || s.y > ground()) return api.fall(pos.x, ground());
            if (s.y < sz.h * 0.75) return api.fall(s.x, s.y + 6);
            api.place(s.x, s.y);
        } else return;
        if (covers(s)) {
            if (!moveSoon) moveSoon = setTimeout(function () { moveSoon = null; if (!api.moving() && covers(api.pos())) api.decide(); }, 600);
        }
    }
    var ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { ticking = false; follow(); });
    }

    window.SiteCat({
        init: function (a) { api = a; },
        size: function () {
            phone = layer.clientWidth < 700;
            return phone ? { w: 66, h: 54 } : { w: 88, h: 72 };
        },
        ground: ground,
        reach: 520,
        climb: 460,
        perches: perches,
        spot: spot,
        climbPath: climbPath,
        allow: allow,
        wander: wander,
        arrive: arrive,
        start: start
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('tl-change', onScroll);
    if (window.ResizeObserver) new ResizeObserver(onScroll).observe(page);

    }
    /* the pet and its world only come out in play mode, after the key (assets/js/play.js); the academic site is plain */
    if (document.documentElement.dataset.mode === 'play') boot();
    else document.addEventListener('playmode-on', boot, { once: true });
})();
