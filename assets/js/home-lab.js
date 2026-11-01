/* Home page world of the cat (the cat itself: assets/js/cat-core.js, bundled before this file by
   layouts/partials/cat.html; markup there, styles in assets/css/common/cat.css).

   On desktop, a floor of bits that light up under the cat's paws and numbers, letters and field symbols floating in
   the margins (nothing on phones). The cat knocks letters of the name and symbols loose: they fly, fall, land, and
   the cat (or the visitor, by dragging) moves them around. The reset button puts everything back. */
(function () {
    'use strict';
    var layer = document.getElementById('cat-layer');
    var world = document.getElementById('world-layer');
    var cat = document.getElementById('cat');
    var panel = document.querySelector('.home .home-panel');
    if (!layer || !world || !cat || !panel || !window.SiteCat) return;
    document.body.appendChild(world);              /* page coordinates, including the side margins */

    var api, rel, clamp, bonk;
    var ridge = [], wide = false, phone = false, side = 0;

    /* letters of the name become separate spans the cat can bat */
    var h1 = document.querySelector('.home .name-block h1');
    if (h1 && !h1.querySelector('.ltr')) {
        var name = h1.textContent.trim();
        h1.setAttribute('aria-label', name);
        h1.textContent = '';
        name.split('').forEach(function (c) {
            var s = document.createElement('span');
            s.className = 'ltr';
            s.setAttribute('aria-hidden', 'true');
            s.textContent = c;
            h1.appendChild(s);
        });
    }

    /* ---------- the floor ---------- */
    function groundY(x) {
        if (!ridge.length) return 0;
        if (x <= ridge[0].x) return ridge[0].y;
        for (var i = 1; i < ridge.length; i++) {
            if (x <= ridge[i].x) {
                var a = ridge[i - 1], b = ridge[i], t = (x - a.x) / (b.x - a.x);
                return a.y + (b.y - a.y) * t;
            }
        }
        return ridge[ridge.length - 1].y;
    }

    /* Desktop world: a floor of bits along the bottom of the page (it spells the name in ASCII; a bit flips and lights
       up when the cat steps on it), and numbers, letters and field symbols float in the side margins as platforms.
       Phones: nothing, just a flat floor at the bottom of the page. */
    var GLYPHS = ['𝔽<sub>q</sub>', '7', 'λ', 'ℤ<sub>p</sub>', 'A', '∑', 'GF(2<sup>8</sup>)', '0x2A', 'ℝ', '⊕', 'π', 'k',
                  'ℤ<sub>q</sub><sup>n</sup>', '∀', '3', 'ℚ', 'mod p', '∃', 'ℂ', '≡', '𝔽<sub>2</sub>', 'x²', '∞', '1'];
    var FLOOR_TEXT = 'FLORIAS';
    var KEY_ICON = '<svg viewBox="0 0 64 30" aria-hidden="true"><circle cx="13" cy="15" r="9" fill="none" stroke="currentColor" stroke-width="5"/>' +
        '<path d="M22 15h36M50 15v9M44 15v6" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>';
    var glyphs = [], bits = [];
    function buildTerrain() {
        Array.prototype.forEach.call(world.querySelectorAll('.bits, .glyph'), function (e) { e.remove(); });
        glyphs = []; bits = [];
        var W = layer.clientWidth, F = parseFloat(layer.style.height);
        var p = rel(panel);
        side = Math.max(0, Math.min(p.x, W - p.x - p.w));
        wide = side > 200;
        phone = W < 700;
        if (phone) {
            ridge = [{ x: 0, y: F - 2 }, { x: W, y: F - 2 }];
            return;
        }
        /* the floor of bits, one group of eight per letter */
        var FH = 34, strip = document.createElement('div');
        strip.className = 'bits';
        strip.style.top = (F - FH - 10) + 'px';
        strip.style.width = W + 'px';
        for (var used = 10, c = 0; used < W - 10; c++) {
            var byte = document.createElement('span');
            byte.className = 'byte';
            var code = FLOOR_TEXT.charCodeAt(c % FLOOR_TEXT.length).toString(2);
            code = ('00000000' + code).slice(-8);
            for (var i = 0; i < 8; i++) {
                var b = document.createElement('span');
                b.className = 'bit';
                b.textContent = code[i];
                byte.appendChild(b);
                bits.push(b);
            }
            strip.appendChild(byte);
            used += 8 * 24 + 14;
        }
        world.appendChild(strip);
        var floor = F - FH - 10;
        ridge = [{ x: 0, y: floor }, { x: W, y: floor }];
        /* platforms in the margins: five levels a side, a comfortable jump apart */
        if (side < 150) return;
        var top = 110, levels = 5, step = (floor - 70 - top) / (levels - 1), n = 0;
        [0, 1].forEach(function (s2) {
            for (var lv = 0; lv < levels; lv++) {
                var g = document.createElement('div');
                var x0 = s2 ? W - side + 18 : 18, span = side - 140;
                g.style.left = (x0 + span * (((lv * 0.37 + s2 * 0.5) % 1) * 0.9 + 0.05)) + 'px';
                g.style.top = Math.min(top + lv * step + (s2 ? step * 0.45 : 0), floor - 70) + 'px';   /* never into the floor */
                if (n % 7 === 3) { g.className = 'glyph keyicon'; g.innerHTML = KEY_ICON; }
                else { g.className = 'glyph' + (n % 2 ? ' pink' : ''); g.innerHTML = GLYPHS[(n * 5) % GLYPHS.length]; }
                g.setAttribute('aria-hidden', 'true');
                world.appendChild(g);
                glyphs.push(g);
                grabbable(g);
                n++;
            }
        });
    }
    /* a glyph reacts when the cat bats it or someone clicks it: numbers count up, letters move on, the rest wiggles */
    function poke(g) {
        var t = g.textContent;
        if (/^0x[0-9A-F]+$/i.test(t)) g.textContent = '0x' + (parseInt(t.slice(2), 16) + 1).toString(16).toUpperCase();
        else if (/^\d$/.test(t)) g.textContent = String((+t + 1) % 10);
        else if (/^[A-Z]$/.test(t)) g.textContent = t === 'Z' ? 'A' : String.fromCharCode(t.charCodeAt(0) + 1);
        bonk(g, 'poked', 600);
    }
    /* a bit flips and lights up under the cat's paws (and where something lands on it) */
    var lastBit = null;
    function stepAt(x, again) {
        for (var i = 0; i < bits.length; i++) {
            var r = rel(bits[i]);
            if (x >= r.x - 2 && x <= r.x + r.w + 2) {
                if (bits[i] !== lastBit || again) {
                    lastBit = bits[i];
                    bits[i].textContent = bits[i].textContent === '1' ? '0' : '1';
                    bonk(bits[i], 'lit', 1200);
                }
                return;
            }
        }
    }

    /* ---------- loose things: letters of the name and symbols the cat knocked off ---------- */
    var loose = [], physOn = false, G = 2400;
    /* el is a glyph (it moves into the cat layer) or a letter of the name (a copy flies, the letter leaves a gap) */
    function makeLoose(el, vx, vy) {
        var r = rel(el), it = { vx: vx, vy: vy, vr: (Math.random() - 0.5) * 900, rot: 0, rest: false, held: false };
        if (el.classList.contains('ltr')) {
            var c = document.createElement('span'), cs = getComputedStyle(el);
            c.className = 'loose loose-ltr';
            c.textContent = el.textContent;
            c.style.fontFamily = cs.fontFamily;
            c.style.fontSize = cs.fontSize;
            c.style.fontWeight = cs.fontWeight;
            c.style.color = cs.color;
            c.style.height = c.style.lineHeight = Math.round(r.h * 0.8) + 'px';
            c.style.width = r.w + 'px';
            el.classList.add('gone');
            it.el = c; it.src = el;
            grabbable(c);
        } else {
            it.el = el;
            el.classList.add('loose');
            glyphs.splice(glyphs.indexOf(el), 1);
        }
        el._loose = it.el._loose = it;
        layer.insertBefore(it.el, cat);           /* in front of the page, behind the cat */
        it.w = r.w; it.h = it.src ? Math.round(r.h * 0.8) : r.h;
        it.x = r.x + r.w / 2; it.y = r.y + it.h;
        loose.push(it);
        draw(it);
        physics();
        return it;
    }
    function draw(it) {
        it.el.style.left = (it.x - it.w / 2) + 'px';
        it.el.style.top = (it.y - it.h) + 'px';
        /* shifted so the bottom of the turned box stays on y (a letter lying on its side sits on the floor) */
        var a = it.rot * Math.PI / 180, dy = (it.h - it.h * Math.abs(Math.cos(a)) - it.w * Math.abs(Math.sin(a))) / 2;
        it.el.style.transform = it.rot ? 'translateY(' + dy.toFixed(1) + 'px) rotate(' + it.rot.toFixed(1) + 'deg)' : '';
    }
    /* the angle something comes to rest at: letters stay fallen over on their nearest side, symbols stand up */
    function restAngle(it) { return it.src ? Math.round((it.rot - 90) / 180) * 180 + 90 : 0; }
    /* the top of whatever is under x between heights y0 and y1 (page elements, glyphs, the floor), or null */
    function landing(x, y0, y1) {
        var best = null, gy = groundY(x);
        if (gy >= y0 - 1 && gy <= y1 + 1) best = gy;
        perches().forEach(function (p) {
            if (p.kind === 'name') return;
            var r = rel(p.el);
            if (x >= r.x + 2 && x <= r.x + r.w - 2 && r.y >= y0 - 1 && r.y <= y1 + 1 && (best === null || r.y < best)) best = r.y;
        });
        return best;
    }
    function physics() {
        if (physOn) return;
        physOn = true;
        var last = performance.now();
        requestAnimationFrame(function frame(now) {
            var dt = Math.min(0.033, (now - last) / 1000), busy = false, W = layer.clientWidth;
            last = now;
            loose.forEach(function (it) {
                if (it.held || it.rest) return;
                busy = true;
                var under = it.vy >= 0 ? landing(it.x, it.y - 1, it.y + 1) : null;
                if (under !== null && it.vy < 60) {                 /* on a surface: slide and slow down */
                    it.vy = 0; it.y = under;
                    it.vx *= Math.exp(-7 * dt);
                    var ra = restAngle(it);
                    it.rot = ra + (it.rot - ra) * Math.exp(-12 * dt);
                    if (Math.abs(it.vx) < 8) { it.vx = 0; it.rot = ra; it.rest = true; }
                } else {
                    it.vy += G * dt;
                    it.rot += it.vr * dt;
                    var ny = it.y + it.vy * dt, hit = it.vy > 0 ? landing(it.x + it.vx * dt, it.y, ny) : null;
                    if (hit !== null) {
                        ny = hit;
                        if (it.vy > 420) { it.vy *= -0.32; it.vx *= 0.7; it.vr *= 0.5; } else it.vy = 0;
                        if (Math.abs(hit - groundY(it.x)) < 2) stepAt(it.x, true);
                    }
                    it.y = Math.min(ny, groundY(it.x));
                }
                it.x += it.vx * dt;
                if (it.x < it.w / 2) { it.x = it.w / 2; it.vx = Math.abs(it.vx) * 0.5; }
                if (it.x > W - it.w / 2) { it.x = W - it.w / 2; it.vx = -Math.abs(it.vx) * 0.5; }
                draw(it);
            });
            if (busy) requestAnimationFrame(frame); else physOn = false;
        });
    }
    function launch(it, vx, vy) {
        it.vx = vx; it.vy = vy; it.vr = (Math.random() - 0.5) * 700 + vx;
        it.rest = false;
        physics();
    }
    /* walking into something loose on the same surface kicks it along */
    function nudge(dir, run) {
        var pos = api.pos();
        loose.forEach(function (it) {
            if (it.held || Math.abs(it.y - pos.y) > 8) return;
            var ahead = (it.x - pos.x) * dir;
            if (ahead > 0 && ahead < 26 + it.w / 2 && (it.rest || Math.abs(it.vx) < 120))
                launch(it, dir * (run ? 480 : 230) + (Math.random() - 0.5) * 60, -(run ? 380 : 190));
        });
    }
    /* visitors can drag symbols and loose letters around and throw them; a click without moving pokes a glyph */
    function grabbable(el) {
        var it = null, lastP, lastT;
        api.draggable(el, {
            start: function (p) {
                it = el._loose || makeLoose(el, 0, 0);
                it.held = true; it.rest = false; it.rot = 0;
                lastP = p; lastT = performance.now();
                el.classList.add('held');
            },
            move: function (p) {
                var now = performance.now(), dt = Math.max(0.008, (now - lastT) / 1000);
                it.vx = clamp((p.x - lastP.x) / dt, -1400, 1400);
                it.vy = clamp((p.y - lastP.y) / dt, -1400, 1400);
                lastP = p; lastT = now;
                it.x = p.x; it.y = p.y + it.h / 2;
                draw(it);
            },
            end: function () {
                it.held = false;
                el.classList.remove('held');
                if (performance.now() - lastT > 120) { it.vx = 0; it.vy = 0; }
                it.vr = it.vx * 0.5;
                physics();
            },
            click: function () { if (!el.classList.contains('loose-ltr')) poke(el); }
        });
    }

    function sizeLayers() {
        layer.style.height = world.style.height = '0px';
        layer.style.height = world.style.height = document.documentElement.scrollHeight + 'px';
    }

    /* ---------- where the cat can go and what it does there ---------- */
    function perches() {
        var list = [];
        function push(sel, kind, extra) {
            Array.prototype.forEach.call(document.querySelectorAll(sel), function (e) {
                if (e.getBoundingClientRect().width > 24) {
                    var p = { el: e, kind: kind };
                    for (var k in extra) p[k] = extra[k];
                    list.push(p);
                }
            });
        }
        var CH = api.size().h;
        push('.home .profile-photo', 'photo');
        /* the name: a big hop is fine, a little less room above is enough, and it may stay to bat another letter */
        push('.home .name-block h1', 'name', { w: 3, room: CH - 6, hop: 480, again: true });
        /* not the chips: sitting there, the cat would cover the tagline */
        push('.home .route', 'card');
        push('.home .news', 'card');
        push('.home .buttons .button', 'button');
        glyphs.forEach(function (g) { list.push({ el: g, kind: 'glyph', w: 1.4 }); });
        return list;
    }
    function spot(p, fx) {
        if (p.kind !== 'name') return null;
        var l = h1.querySelectorAll('.ltr'), lr = rel(l[Math.floor(fx * (l.length - 1))]);
        return { x: lr.x + lr.w / 2, y: lr.y + lr.h * 0.18 };
    }
    /* something loose on the floor: go and push it */
    function options(add) {
        var pos = api.pos();
        loose.forEach(function (it) {
            if (!it.rest || Math.abs(it.y - groundY(it.x)) > 2) return;
            var sx = it.x + (pos.x < it.x ? -1 : 1) * (30 + it.w / 2);
            add({ kind: 'ground', what: 'push', item: it }, function () { return { x: sx, y: groundY(sx) }; }, 1.4);
        });
    }
    function arrive(p, r) {
        var pos = api.pos(), left = cat.classList.contains('left');
        if (p.kind === 'name' && r < 0.75) {
            var best = null, bd = 1e9, reach = left ? -30 : 30;
            Array.prototype.forEach.call(h1.querySelectorAll('.ltr'), function (l) {
                var lr = rel(l), d = Math.abs(lr.x + lr.w / 2 - (pos.x + reach));
                if (l.textContent.trim() && d < bd) { bd = d; best = l; }
            });
            if (best) {
                var dir = left ? -1 : 1;
                if (Math.random() < 0.65) api.bat(function () { makeLoose(best, dir * (180 + Math.random() * 220), -(380 + Math.random() * 220)); });
                else api.bat(function () { bonk(best, 'bonk', 900); });
            }
            api.next(1700 + Math.random() * 1500);
            return true;
        }
        if (p.what === 'push' && loose.indexOf(p.item) >= 0 && Math.abs(p.item.y - pos.y) < 8) {
            var d = p.item.x > pos.x ? 1 : -1;
            api.face(d);
            api.bat(function () { launch(p.item, d * (260 + Math.random() * 260), -(260 + Math.random() * 200)); });
            api.next(1300 + Math.random() * 1200);
            return true;
        }
        var near = null;                           /* something loose next to it on the same surface: swat it off */
        loose.forEach(function (it) {
            if (it.rest && Math.abs(it.y - pos.y) < 8 && Math.abs(it.x - pos.x) < 80 && (!near || Math.abs(it.x - pos.x) < Math.abs(near.x - pos.x))) near = it;
        });
        if (near && r < 0.8) {
            var nd = near.x > pos.x ? 1 : -1;
            api.face(nd);
            api.bat(function () { launch(near, nd * (220 + Math.random() * 200), -(300 + Math.random() * 200)); });
            api.next(1500 + Math.random() * 1200);
            return true;
        }
        if (p.kind === 'glyph' && r < 0.4 && glyphs.indexOf(p.el) >= 0) {   /* kicks off from the symbol, sending it flying */
            var kd = left ? -1 : 1, g = p.el;
            api.bat(function () {
                makeLoose(g, -kd * (160 + Math.random() * 160), -(200 + Math.random() * 150));
                var lx = api.pos().x + kd * 90;
                api.goTo({ p: { kind: 'ground', what: 'wander' }, target: function () { return { x: lx, y: groundY(lx) }; } });
            });
            return true;
        }
        if (p.kind === 'chip' && r < 0.7) { api.bat(function () { bonk(p.el, 'nudged', 700); }); api.next(1900 + Math.random() * 1500); return true; }
        if (p.kind === 'glyph' && r < 0.75) { api.bat(function () { poke(p.el); }); api.next(1800 + Math.random() * 1500); return true; }
        if (p.kind === 'photo' && r < 0.18) { api.nap(); return true; }
        return false;
    }
    function start() {
        var CH = api.size().h;
        var first = perches().filter(function (p) { return p.kind === 'name' || p.kind === 'button'; })
            .filter(function (p) { return api.spotOn(p, 0.95).y > CH + 34; })[0];
        if (first) first.fx = 0.95;
        return first || null;
    }

    window.SiteCat({
        init: function (a) { api = a; rel = a.rel; clamp = a.clamp; bonk = a.bonk; },
        layout: function () { sizeLayers(); buildTerrain(); },
        ground: groundY,
        perches: perches,
        spot: spot,
        options: options,
        step: function (x, dir, run) { stepAt(x); nudge(dir, run); },
        arrive: arrive,
        start: start
    });

    /* the reset button: letters back into the name, symbols back in place, the cat back at the start */
    function reset() {
        loose.forEach(function (it) { it.el.remove(); });
        loose = [];
        Array.prototype.forEach.call(h1.querySelectorAll('.ltr.gone'), function (l) { l.classList.remove('gone'); });
        api.reset();
    }
    var resetBtn = document.getElementById('home-reset');
    if (resetBtn) { document.body.appendChild(resetBtn); resetBtn.addEventListener('click', reset); }
})();
