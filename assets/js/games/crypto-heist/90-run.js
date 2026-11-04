
    /* ---------- the run: intro, rooms one after the other with their clock, a card after each, the end ---------- */
    var COUNT = { easy: 6, normal: 8, hard: 10 };
    function pickRooms(level) {
        /* for testing: window.__chxOnly = ['pad-lock', ...] plays just those rooms, in that order */
        if (window.__chxOnly) return window.__chxOnly.map(function (id) { return ROOMS.filter(function (r) { return r.id === id; })[0]; }).filter(Boolean);
        var pool = ROOMS.filter(function (r) { return level === 'hard' || !r.hardOnly; });
        for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
        return pool.slice(0, COUNT[level]).sort(function (a, b) { return a.order - b.order; });
    }

    Arcade.register('crypto-heist', function (api) {
        api.css(CSS);
        var level = api.level(), easy = level === 'easy';
        var dog = document.documentElement.dataset.pet === 'dog', PET = dog ? 'dog' : 'cat';
        var list = pickRooms(level);

        var wrap = document.createElement('div');
        wrap.className = 'chx';
        wrap.innerHTML = '<div class="chx-in"><div class="chx-head"><div class="chx-title"><small></small><span></span></div>' +
            '<div class="chx-clock" aria-live="off">0:00</div><button class="chx-btn chx-hint" type="button">Hint <small>(-10 s)</small></button></div>' +
            '<p class="chx-tip"></p><div class="chx-room"></div></div><div class="chx-cover" hidden><div class="chx-cover-box"></div></div>';
        api.el.appendChild(wrap);
        var host = {
            title: wrap.querySelector('.chx-title span'), step: wrap.querySelector('.chx-title small'),
            clock: wrap.querySelector('.chx-clock'), hintBtn: wrap.querySelector('.chx-hint'),
            tip: wrap.querySelector('.chx-tip'), room: wrap.querySelector('.chx-room'),
            cover: wrap.querySelector('.chx-cover'), coverBox: wrap.querySelector('.chx-cover-box')
        };
        var idx = -1, ctx = null, res = null, playing = false, timeLeft = 0, score = 0, coverGo = null, spoke10 = false, overtime = false;

        var run = {
            level: level, hintText: '',
            penalty: function (s, isHint) {
                if (!playing || (easy && !isHint)) return;
                timeLeft -= s;
                paintClock();
            },
            solved: function (fact) {
                playing = false;
                var def = list[idx], pts = (def.hardOnly ? 150 : 100) + 3 * Math.max(0, Math.ceil(timeLeft));
                score += pts;
                api.score(score);
                api.sfx('point'); api.cat('happy');
                var last = idx === list.length - 1;
                api.timeout(function () {
                    endRoom();
                    cover(last ? 'Last lock open!' : 'Room cleared!', '+' + pts + ' points', fact, last ? 'Open the vault' : 'Next room', function () {
                        if (last) finish(); else startRoom(idx + 1);
                    });
                }, 650);
            }
        };

        function steps() {
            var s = '<div class="chx-steps" aria-hidden="true">';
            for (var i = 0; i < list.length; i++) s += '<i class="' + (i < idx + 1 ? 'done' : i === idx + 1 ? 'now' : '') + '"></i>';
            return s + '</div>';
        }
        function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        function cover(title, sub, text, go, fn) {
            host.coverBox.innerHTML = steps() + '<h3>' + esc(title) + '</h3>' + (sub ? '<p><b>' + esc(sub) + '</b></p>' : '') +
                (text ? '<p class="chx-fact">' + esc(text) + '</p>' : '');
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'chx-btn chx-go'; b.textContent = go;
            b.addEventListener('click', function () { if (coverGo !== fn) return; coverGo = null; host.cover.hidden = true; api.sfx('tap'); fn(); });
            host.coverBox.appendChild(b);
            coverGo = fn;
            host.cover.hidden = false;
            setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 30);
        }
        function paintClock() {
            var t = Math.max(0, Math.ceil(timeLeft));
            host.clock.textContent = Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
            host.clock.classList.toggle('low', !overtime && timeLeft <= 10);
            host.clock.classList.toggle('over', overtime);
        }
        function endRoom() {
            if (ctx) ctx._end();
            if (res && res.destroy) { try { res.destroy(); } catch (e) { /* the room is gone anyway */ } }
            ctx = null; res = null;
        }
        function startRoom(i) {
            endRoom();
            idx = i;
            var def = list[i];
            host.room.innerHTML = '';
            host.tip.innerHTML = '';
            host.step.textContent = 'Room ' + (i + 1) + ' of ' + list.length + ' · ' + def.tag;
            host.title.textContent = def.name;
            run.hintText = '';
            host.hintBtn.disabled = true;
            timeLeft = def.time[level]; overtime = false; spoke10 = false;
            paintClock();
            ctx = makeCtx(api, run, def, host);
            res = def.build(ctx) || null;
            playing = true;
            api.cat('think');
        }
        function finish() {
            api.end({ score: score, win: true, text: 'The Treat Vault is open!\n' + list.length + ' rooms cracked, score ' + score + '.\nThe ' + PET + ' is very pleased.' });
        }

        host.hintBtn.addEventListener('click', function () {
            if (!playing || !run.hintText) return;
            if (!easy && timeLeft <= 11) { api.say('Not enough time left for a hint!', 1800); return; }
            api.say(run.hintText, 6000);
            api.cat('think');
            run.penalty(10, true);
        });
        api.on(document, 'keydown', function (e) {
            if (!host.cover.hidden) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var b = host.coverBox.querySelector('button'); if (b) b.click(); } return; }
            if (e.key === '?' && playing) { host.hintBtn.click(); return; }
            if (ctx) ctx._key(e);
        });
        api.loop(function (dt) {
            if (!playing) return;
            timeLeft -= dt;
            if (timeLeft <= 10 && !spoke10 && !easy) { spoke10 = true; api.say('Ten seconds!', 1400); api.cat('wow'); }
            if (timeLeft <= 0) {
                if (easy) { if (!overtime) { overtime = true; api.say('No rush on Easy. Take your time!', 2400); } timeLeft = 0; }
                else {
                    playing = false;
                    var def = list[idx];
                    endRoom();
                    api.sfx('lose'); api.cat('sad');
                    api.end({ score: score, win: false, text: 'The alarm went off in room ' + (idx + 1) + ', ' + def.name + '.\n' +
                        idx + ' of ' + list.length + ' rooms cracked, score ' + score + '.' });
                    return;
                }
            }
            paintClock();
        });

        api.score(0);
        cover('Crypto Heist', null, 'The ' + PET + ' is locked out of the Treat Vault. ' + list.length + ' rooms stand in the way, each locked with a ' +
            'piece of real cryptography. Crack them one by one before the alarm goes off.' + (easy ? ' (Easy: no alarm, take your time.)' : ''),
            'Start the heist', function () { startRoom(0); });

        return { destroy: function () { endRoom(); } };
    });
})();
