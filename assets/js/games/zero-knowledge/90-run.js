    /* ---------- Zero Knowledge, part 90: the run. The level kit K that every level's build(K) gets, the cards between
       levels, trust and score, the clock, and Arcade.register. A level is
           level({ id, name, dogName, tag, role, intro: function (K) { return 'plain text'; }, toolbox, build: function (K) {...} })
       K:  K.lv ('easy' | 'normal' | 'hard'), K.easy, K.hard, K.dog, K.pet ('cat' | 'dog'), K.Pet, K.C (the pet's colours), K.rnd
           K.draw = function (g, W, H, t) {...}   draws the scene every frame (t in seconds); K.tap = function (x, y) {...}
           K.msg(html)            the line under the scene (the game's own strings only)
           K.ctrl()               empties the control row and returns it;  K.btn(label, cls, fn) a button
           K.numpad({ label, digits, onSubmit(n) })   an on-screen number pad (keys 0-9, Backspace, Enter work too)
           K.timer(seconds, onOut)  a clock bar for one answer (twice as long on Easy): { stop(), frac(), left() }
           K.role('honest' | 'cheat' | 'check' | 'film')   the badge in the top row
           K.odds(text, frac)     the soundness line (frac 0..1 fills its bar); K.odds(null) hides it
           K.points(n, why), K.strike(why) (false when the run is over), K.done(fact)
           K.later(fn, ms), K.alive(), K.key(fn(e)), K.sfx(name), K.mood(m), K.say(text, ms) ---------- */
    var ORDER = {
        easy: ['cave', 'balls', 'envelopes', 'bell', 'video', 'watch'],
        normal: ['cave', 'balls', 'envelopes', 'twins', 'roots', 'bell', 'video', 'watch'],
        hard: ['cave', 'balls', 'envelopes', 'twins', 'roots', 'bell', 'video', 'watch', 'fences']
    };
    var ROLES = { honest: 'You prove', cheat: 'You cheat', check: 'You check', film: 'You film' };
    var PAWSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><ellipse cx="5.6" cy="10.4" rx="2" ry="2.6"/>' +
        '<ellipse cx="9.6" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="14.4" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="18.4" cy="10.4" rx="2" ry="2.6"/></svg>';

    if (typeof module === 'object' && module && module.exports) { module.exports = { LOGIC: LOGIC, LEVELS: LEVELS, ORDER: ORDER }; return; }

    Arcade.register('zero-knowledge', function (api) {
        api.css(CSS);
        var lv = api.level(), easy = lv === 'easy', hard = lv === 'hard';
        var C = petColours(), dog = C.dog, PET = dog ? 'dog' : 'cat';
        var list = (window.__zkOnly || ORDER[lv]).map(function (id) { return LEVELS[id]; }).filter(Boolean);
        var TRUST = easy ? 5 : 3;

        var wrap = document.createElement('div');
        wrap.className = 'zk';
        wrap.innerHTML = '<div class="zk-top"><div class="zk-title"><small></small><span></span></div><span class="zk-role" hidden></span>' +
            '<div class="zk-trust" title="Trust"></div></div>' +
            '<div class="zk-odds" hidden><span class="zk-odds-t"></span><span class="zk-odds-bar" aria-hidden="true"><i></i></span></div>' +
            '<div class="zk-stage"><canvas></canvas></div><div class="zk-time" aria-hidden="true"><i></i></div>' +
            '<div class="zk-panel"><p class="zk-msg" aria-live="polite"></p><div class="zk-ctrl"></div></div>' +
            '<div class="zk-cover" hidden><div class="zk-card"></div></div>';
        api.el.appendChild(wrap);
        function q(s) { return wrap.querySelector(s); }
        var el = {
            step: q('.zk-title small'), title: q('.zk-title span'), role: q('.zk-role'), trust: q('.zk-trust'),
            odds: q('.zk-odds'), oddsT: q('.zk-odds-t'), oddsBar: q('.zk-odds-bar i'),
            stage: q('.zk-stage'), cv: q('canvas'), time: q('.zk-time'), timeBar: q('.zk-time i'),
            panel: q('.zk-panel'), msg: q('.zk-msg'), ctrl: q('.zk-ctrl'), cover: q('.zk-cover'), card: q('.zk-card')
        };
        var g = el.cv.getContext('2d');
        var W = 0, H = 0, dpr = 1;
        var idx = -1, K = null, res = null, score = 0, trust = TRUST, levelPts = 0, coverGo = null, over = false, dead = false, clock = null;
        var toolboxOk = false;
        /* the Toolbox (calculators) is linked from a level only when the site has it */
        try {
            var tb = new URL('../toolbox/', location.href).href;
            if (window.fetch) fetch(tb, { method: 'HEAD' }).then(function (r) { toolboxOk = r.ok; }).catch(function () { /* none */ });
        } catch (e) { /* no URL support: no link */ }

        function paintTrust() {
            var s = '';
            for (var i = 0; i < TRUST; i++) s += PAWSVG.replace('<svg', '<svg class="' + (i < trust ? 'on' : 'off') + '"');
            el.trust.innerHTML = s;
            el.trust.setAttribute('aria-label', 'Trust: ' + trust + ' of ' + TRUST);
        }
        function steps() {
            var s = '<div class="zk-steps" aria-hidden="true">';
            for (var i = 0; i < list.length; i++) s += '<i class="' + (i < idx ? 'done' : i === idx ? 'now' : '') + '"></i>';
            return s + '</div>';
        }
        function cover(html, go, fn) {
            el.card.innerHTML = steps() + html;
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'zk-btn zk-go'; b.textContent = go;
            b.addEventListener('click', function () { if (coverGo !== fn) return; coverGo = null; el.cover.hidden = true; api.sfx('tap'); fn(); });
            el.card.appendChild(b);
            coverGo = fn;
            el.cover.hidden = false;
            el.cover.scrollTop = 0;
            setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 30);
        }
        function nameOf(def) { return dog && def.dogName ? def.dogName : def.name; }

        /* ---------- one level ---------- */
        function makeKit(def) {
            var live = true, offs = [], keyFns = [];
            var k = {
                lv: lv, easy: easy, hard: hard, dog: dog, pet: PET, Pet: dog ? 'Dog' : 'Cat', C: C, rnd: Math.random,
                draw: null, tap: null,
                msg: function (html) { el.msg.innerHTML = html; },
                ctrl: function () { el.ctrl.innerHTML = ''; return el.ctrl; },
                btn: function (labelText, cls, fn) {
                    var b = document.createElement('button');
                    b.type = 'button'; b.className = 'zk-btn' + (cls ? ' ' + cls : ''); b.textContent = labelText;
                    if (fn) b.addEventListener('click', function (e) { if (live && !over) fn(e); });
                    return b;
                },
                add: function () { for (var i = 0; i < arguments.length; i++) el.ctrl.appendChild(arguments[i]); },
                role: function (r) { el.role.hidden = !r; el.role.className = 'zk-role ' + (r || ''); el.role.textContent = ROLES[r] || ''; },
                odds: function (text, frac) {
                    el.odds.hidden = text == null;
                    if (text == null) return;
                    el.oddsT.textContent = text;
                    el.oddsBar.style.width = Math.round(clamp(frac == null ? 1 : frac, 0, 1) * 100) + '%';
                },
                timer: function (sec, onOut) {
                    if (clock) clock.stop();
                    var c = { total: sec * (easy ? 2 : 1), left: sec * (easy ? 2 : 1), onOut: onOut, on: true };
                    c.stop = function () { c.on = false; if (clock === c) { clock = null; el.time.classList.remove('on', 'low'); } };
                    c.frac = function () { return clamp(c.left / c.total, 0, 1); };
                    c.leftS = function () { return Math.max(0, c.left); };
                    clock = c;
                    el.time.classList.add('on');
                    return c;
                },
                points: function (n, why) {
                    if (!n) return;
                    score += n; levelPts += n; api.score(score);
                    var p = document.createElement('div');
                    p.className = 'zk-pts';
                    p.textContent = '+' + n + (why ? ' ' + why : '');
                    el.stage.appendChild(p);
                    setTimeout(function () { p.remove(); }, 1150);
                },
                strike: function (why) {
                    if (!live || over) return false;
                    trust--; paintTrust();
                    api.sfx('hit'); api.cat('sad');
                    var p = document.createElement('div');
                    p.className = 'zk-pts bad'; p.textContent = '-1 trust';
                    el.stage.appendChild(p);
                    setTimeout(function () { p.remove(); }, 1150);
                    if (why) api.say(why, 2600);
                    if (trust <= 0) { gameOver(why); return false; }
                    return true;
                },
                done: function (fact) { if (!live || over) return; live = false; cleared(fact); },
                alive: function () { return live && !over; },
                later: function (fn, ms) { var id = setTimeout(function () { if (live && !over) fn(); }, ms); offs.push(function () { clearTimeout(id); }); },
                key: function (fn) { keyFns.push(fn); },
                sfx: function (n) { api.sfx(n); },
                mood: function (m) { api.cat(m); },
                say: function (t, ms) { api.say(t, ms || 2400); },
                numpad: function (o) {
                    o = o || {};
                    var digits = o.digits || 3, val = '';
                    var box = document.createElement('div'); box.className = 'zk-pad';
                    var show = document.createElement('div'); show.className = 'zk-pad-show';
                    show.innerHTML = '<small></small><span>_</span>';
                    show.firstChild.textContent = o.label || 'Your answer';
                    var num = show.lastChild;
                    box.appendChild(show);
                    var keys = document.createElement('div'); keys.className = 'zk-keys';
                    function paint() { num.textContent = val || '_'; }
                    function press(kk) {
                        if (!live || over || box.dataset.off) return;
                        if (kk === 'del') val = val.slice(0, -1);
                        else if (kk === 'ok') { if (val !== '' && o.onSubmit) o.onSubmit(parseInt(val, 10)); return; }
                        else if (val.length < digits) val = (val === '0' ? '' : val) + kk;
                        api.sfx('tap'); paint();
                    }
                    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'del', 'ok'].forEach(function (kk) {
                        var b = document.createElement('button');
                        b.type = 'button';
                        if (kk === 'ok') b.className = 'ok';
                        b.textContent = kk === 'del' ? '⌫' : kk === 'ok' ? 'OK' : kk;
                        if (kk === 'del') b.setAttribute('aria-label', 'Delete');
                        b.addEventListener('click', function () { press(kk); });
                        keys.appendChild(b);
                    });
                    box.appendChild(keys);
                    k.key(function (e) {
                        if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
                        else if (e.key === 'Backspace') { press('del'); e.preventDefault(); }
                        else if (e.key === 'Enter') { press('ok'); e.preventDefault(); }
                    });
                    return { el: box, clear: function () { val = ''; paint(); }, lock: function () { box.dataset.off = '1'; } };
                },
                _end: function () { live = false; offs.forEach(function (f) { f(); }); offs = []; keyFns = []; },
                _key: function (e) { for (var i = 0; i < keyFns.length; i++) keyFns[i](e); }
            };
            return k;
        }
        function endLevel() {
            if (clock) clock.stop();
            if (K) K._end();
            if (res && res.destroy) { try { res.destroy(); } catch (e) { /* gone anyway */ } }
            K = null; res = null;
            el.ctrl.innerHTML = ''; el.msg.innerHTML = '';
        }
        function intro(i) {
            idx = i;
            var def = list[i];
            var probe = makeKit(def);
            var txt = def.intro(probe);
            probe._end();
            var link = def.toolbox && toolboxOk ? '<p>Numbers getting big? The <a href="' + esc(new URL('../toolbox/', location.href).href) +
                '" target="_blank" rel="noopener">Toolbox</a> has calculators for this.</p>' : '';
            cover('<h3>' + esc(nameOf(def)) + '</h3><p class="tag">Level ' + (i + 1) + ' of ' + list.length + ' · ' + esc(def.tag) + '</p>' +
                '<p>' + esc(txt).replace(/\n/g, '<br>') + '</p>' + link, 'Start', function () { startLevel(i); });
        }
        function startLevel(i) {
            endLevel();
            idx = i; levelPts = 0;
            var def = list[i];
            el.step.textContent = 'Level ' + (i + 1) + ' of ' + list.length + ' · ' + def.tag;
            el.title.textContent = nameOf(def);
            K = makeKit(def);
            K.role(def.role); K.odds(null);
            res = def.build(K) || null;
            api.cat('think');
        }
        function cleared(fact) {
            if (clock) clock.stop();
            var def = list[idx];
            score += 50; levelPts += 50; api.score(score);
            api.sfx('win'); api.cat('happy');
            var last = idx === list.length - 1;
            setTimeout(function () {
                if (over) return;
                endLevel();
                cover('<h3>' + (last ? 'All gates passed!' : 'Level cleared!') + '</h3><p class="tag">' + esc(nameOf(def)) + '</p>' +
                    '<p><b>+' + levelPts + ' points</b> (with 50 for clearing it)</p><p class="fact">' + esc(fact) + '</p>',
                    last ? 'See the score' : 'Next level', function () { if (last) finish(); else intro(idx + 1); });
            }, 900);
        }
        function finish() {
            over = true;
            var bonus = trust * 25;
            score += bonus; api.score(score);
            api.end({ score: score, win: true, text: 'Hoot is convinced, and still knows nothing about your secrets.\n' +
                list.length + ' levels, ' + trust + ' paw' + (trust === 1 ? '' : 's') + ' of trust left (+' + bonus + ').\nScore ' + score + '.' });
        }
        function gameOver(why) {
            over = true;
            var def = list[idx];
            setTimeout(function () {
                if (dead) return;
                endLevel();
                api.sfx('lose');
                api.end({ score: score, win: false, text: 'Hoot has lost all trust in you' + (why ? ': ' + why.replace(/[.!]$/, '') : '') + '.\n' +
                    'Reached level ' + (idx + 1) + ' of ' + list.length + ', ' + nameOf(def) + '.\nScore ' + score + '.' });
            }, 900);
        }

        /* ---------- canvas, clock and input ---------- */
        function fit() {
            var w = el.stage.clientWidth, h = el.stage.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
            if (w === W && h === H && d === dpr) return;
            W = w; H = h; dpr = d;
            el.cv.width = Math.max(1, Math.round(W * dpr)); el.cv.height = Math.max(1, Math.round(H * dpr));
            el.cv.style.width = W + 'px'; el.cv.style.height = H + 'px';
        }
        var t0 = performance.now();
        api.loop(function (dt) {
            fit();
            if (clock && clock.on && !over && el.cover.hidden) {
                clock.left -= dt;
                el.timeBar.style.width = (clock.frac() * 100) + '%';
                el.time.classList.toggle('low', clock.left < Math.min(5, clock.total * 0.3));
                if (clock.left <= 0) { var c = clock; c.stop(); if (c.onOut) c.onOut(); }
            }
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.clearRect(0, 0, W, H);
            if (K && K.draw && W > 0 && H > 0) {
                try { K.draw(g, W, H, (performance.now() - t0) / 1000); } catch (e) { if (window.console) console.error(e); K.draw = null; }
            }
        });
        api.on(el.cv, 'pointerdown', function (e) {
            if (!K || !K.tap || over) return;
            var r = el.cv.getBoundingClientRect();
            K.tap(e.clientX - r.left, e.clientY - r.top);
        });
        api.on(document, 'keydown', function (e) {
            if (!el.cover.hidden) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var b = el.card.querySelector('button'); if (b) b.click(); }
                return;
            }
            if (K && !over) K._key(e);
        });

        paintTrust();
        api.score(0);
        idx = 0;
        cover('<h3>Zero Knowledge</h3><p class="tag">Proof puzzles</p><p>Hoot the guard owl lets nobody pass who cannot prove they know the secret. ' +
            'But a secret that is shown is no secret any more. So you will prove that you know it without ever showing it: ' +
            'the way real zero-knowledge proofs work.</p><p>Sometimes you prove honestly, sometimes you try to cheat and see how fast you are caught, ' +
            'and later you are the guard. ' + list.length + ' levels. Mistakes cost trust: you have ' + TRUST + ' paws of it.</p>',
            'Begin', function () { intro(0); });

        return { destroy: function () { over = true; dead = true; endLevel(); } };
    });
})();
