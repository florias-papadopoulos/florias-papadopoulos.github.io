/* Crypto Heist, part 40: the hash rooms. Birthday Party (collisions of a tiny hash come after about the square root
   of its size), Password Bowl (a ready-made table cracks plain hashes, a salt makes it useless), Treat Miner (proof of
   work with the real SHA-256). Each room keeps its puzzle maker apart (gen) so a test can run it without a page. */
(function () {
    'use strict';

    var CATS = ('Luna Milo Oliver Leo Bella Simba Nala Kitty Lily Chloe Max Tiger Shadow Smokey Oreo Pepper Ginger Mittens ' +
        'Felix Tom Cleo Zoe Coco Misty Jasper Loki Salem Willow Pumpkin Mochi Biscuit Muffin Whiskers Sooty Tigger Garfield ' +
        'Socks Boots Pixel Nemo Ziggy Olive Hazel Maple Peanut Noodle Pickles Toffee Caramel Sushi Tofu Gizmo Rusty Dusty ' +
        'Marble Pebbles Button Clover Daisy Poppy Rosie Ruby Sage Juniper Mango Kiwi Bean Bagel Waffles Nugget Sprout Fig ' +
        'Pudding Cinnamon Nutmeg Saffron Basil Minnie Duchess Princess Ivy Lucky Patches Frankie Archie Ollie Theo Romeo ' +
        'Merlin Binx Onyx Ash Storm Thor').split(' ');
    var DOGS = ('Rex Buddy Bella Max Charlie Rocky Daisy Cooper Bailey Lucy Duke Sadie Bear Molly Tucker Lola Buster Rosie ' +
        'Bentley Zeus Winston Murphy Toby Ruby Riley Biscuit Scout Rusty Teddy Ziggy Ollie Lady Penny Gus Hank Marley Bruno ' +
        'Rufus Benji Lassie Fido Spot Patch Waffles Nugget Pudding Pepper Ginger Maple Peanut Cookie Mocha Oreo Bandit Ranger ' +
        'Apollo Diesel Moose Bowie Otis Pippa Coco Juno Willow Hazel Bonnie Dottie Fudge Muffin Taco Nacho Pickle Pretzel ' +
        'Boomer Bolt Chase Ace Blue Sky Sunny Rocket Comet Gizmo Kobe Louie Milo Frankie Archie Barney Chester Monty').split(' ');

    /* FNV-1a, 32 bits: the base of the small hashes of this part */
    function fnv(text, seed) {
        var h = seed === undefined ? 2166136261 : seed >>> 0;
        for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        return h;
    }
    function hash10(text) { var h = fnv(text + '#'); return (h ^ (h >>> 10) ^ (h >>> 20)) & 1023; }
    function hash16(text) {
        var h = fnv(text), s = ((h ^ (h >>> 16)) & 65535).toString(16).toUpperCase();
        while (s.length < 4) s = '0' + s;
        return s;
    }
    /* a 64 hex digit stand-in for SHA-256, only for browsers without crypto.subtle */
    function hash256(text) {
        var out = '', h = fnv(text);
        for (var i = 0; i < 8; i++) {
            h = fnv(text + ':' + i, h ^ Math.imul(i + 1, 2654435761));
            h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
            out += ('0000000' + (h >>> 0).toString(16)).slice(-8);
        }
        return out;
    }
    function shuffleWith(rnd, l) {
        l = l.slice();
        for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; }
        return l;
    }

    var CSS =
        /* Birthday Party */
        '.chh-meter { display: flex; align-items: center; gap: 10px; width: 100%; font-weight: 700; font-size: .9rem; color: #423b5e; }' +
        '.chh-meter-bar { flex: 1 1 auto; height: 14px; border: 2px solid #231f3a; border-radius: 7px; background: #fff; overflow: hidden; }' +
        '.chh-meter-bar i { display: block; height: 100%; width: 0; background: #ffb400; transition: width .25s; }' +
        '.chh-party { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; align-items: flex-start; width: 100%; }' +
        '.chh-boardbox { flex: 1 1 240px; max-width: 300px; }' +
        '.chh-board { display: grid; gap: 1px; width: 100%; max-width: 300px; padding: 3px; box-sizing: border-box; border: 2px solid #231f3a; border-radius: 8px; background: #ddd8ee; }' +
        '.chh-board i { aspect-ratio: 1 / 1; background: #fff; border-radius: 2px; }' +
        '.chh-board i.on { background: #4a5bd4; }' +
        '.chh-board i.new { background: #ffb400; }' +
        '.chh-board i.hit { background: #d6336c; outline: 2px solid #231f3a; z-index: 1; }' +
        '.chh-board-cap { font-size: .78rem; font-weight: 700; color: #7a7393; text-align: center; margin-top: 4px; }' +
        '.chh-guests { flex: 1 1 260px; display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; min-height: 60px; }' +
        '.chh-guest { display: inline-flex; align-items: baseline; gap: 6px; padding: 3px 8px; border: 2px solid #231f3a; border-radius: 16px; background: #fff;' +
        '  font-weight: 700; font-size: .9rem; animation: chh-pop .3s; }' +
        '.chh-guest b { font: 800 .9rem/1 ui-monospace, Menlo, Consolas, monospace; padding: 2px 5px; border-radius: 6px; background: #e8e5f5; }' +
        '.chh-guest.pair { background: #ffe9a8; border-color: #d6336c; box-shadow: 0 3px 0 #d6336c; }' +
        '.chh-guest.pair b { background: #d6336c; color: #fff; }' +
        '.chh-dim .chh-guest:not(.pair) { opacity: .45; }' +
        '@keyframes chh-pop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }' +
        '.chh-door { display: flex; flex-direction: column; align-items: center; gap: 6px; }' +
        '.chh-big { min-height: 56px; padding: 8px 26px; font-size: 1.15rem; }' +
        '.chh-next { font-size: .9rem; color: #7a7393; font-weight: 700; }' +
        '.chh-news { text-align: center; font-weight: 800; font-size: 1.05rem; }' +
        '.chh-stat { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 18px; font-weight: 700; }' +
        '.chh-stat span { white-space: nowrap; }' +
        '.chh-stat b { font: 800 1.2rem/1 ui-monospace, Menlo, Consolas, monospace; }' +
        /* Password Bowl */
        '.chh-cols { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; align-items: flex-start; }' +
        '.chh-col { flex: 1 1 300px; min-width: 0; }' +
        '.chh-col h4 { margin: 0 0 6px; font-size: .82rem; letter-spacing: .05em; text-transform: uppercase; color: #7a7393; }' +
        '.chh-list { display: flex; flex-direction: column; gap: 5px; }' +
        '.chh-r { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 38px; padding: 4px 10px; border: 2px solid #231f3a;' +
        '  border-radius: 8px; background: #fff; text-align: left; font-weight: 700; box-shadow: 0 2px 0 #231f3a; }' +
        '.chh-r:active { transform: translateY(2px); box-shadow: none; }' +
        '.chh-r .n { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
        '.chh-r .x { font: 800 1rem/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .06em; padding: 3px 6px; border-radius: 6px; background: #e8e5f5; }' +
        '.chh-r .s { font: 700 .85rem/1 ui-monospace, Menlo, Consolas, monospace; color: #7a7393; }' +
        '.chh-r .p { font: 800 .9rem/1 ui-monospace, Menlo, Consolas, monospace; color: #2f8a3a; }' +
        '.chh-r.sel { background: #ffe9a8; }' +
        '.chh-r.done { background: #e3f4e5; border-color: #2f8a3a; box-shadow: 0 2px 0 #2f8a3a; cursor: default; }' +
        '.chh-r.twin .x { background: #ffd2e0; }' +
        '.chh-useless { margin-top: 4px; }' +
        /* Treat Miner */
        '.chh-block { width: 100%; max-width: 560px; }' +
        '.chh-block .l { font-size: .78rem; font-weight: 700; color: #7a7393; text-transform: uppercase; letter-spacing: .05em; }' +
        '.chh-text { font: 800 1.05rem/1.5 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chh-text b { padding: 1px 6px; border-radius: 6px; background: #ffe9a8; }' +
        '.chh-hash { font: 700 .92rem/1.45 ui-monospace, Menlo, Consolas, monospace; word-break: break-all; color: #7a7393; }' +
        '.chh-hash .z { color: #231f3a; font-weight: 800; }' +
        '.chh-hash .lz { color: #fff; background: #2f8a3a; border-radius: 3px; }' +
        '.chh-hash.good .lz { background: #2f8a3a; }' +
        '.chh-hash .miss { color: #fff; background: #d6336c; border-radius: 3px; }' +
        '.chh-goal { font-weight: 700; text-align: center; }' +
        '.chh-goal code { font: 800 1rem ui-monospace, Menlo, Consolas, monospace; padding: 1px 6px; border-radius: 6px; background: #e3f4e5; }';

    function addCss() {
        if (document.getElementById('chh-css')) return;
        var s = document.createElement('style');
        s.id = 'chh-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ================= Birthday Party ================= */
    /* the guests in the order they come; Easy: the lists as written (first shared hat: guest 26 for cats, 23 for dogs) */
    function genBirthday(o) {
        var base = o.dog ? DOGS : CATS, size = o.hard ? 1024 : 256, hf = o.hard ? hash10 : o.hash8;
        var names = o.easy ? base.slice() : shuffleWith(o.rnd, base);
        var more = names.map(function (n) { return n + ' Jr.'; }).concat(names.map(function (n) { return n + ' III'; }));
        names = names.concat(more);
        var guests = [], seen = {}, at = -1;
        for (var i = 0; i < names.length; i++) {
            var v = hf(names[i]);
            guests.push({ name: names[i], hat: v });
            if (at < 0 && seen[v] !== undefined) at = i;
            if (seen[v] === undefined) seen[v] = i;
        }
        return { size: size, guests: guests, first: at, firstOf: at < 0 ? -1 : seen[guests[at].hat],
            expect: o.hard ? 40 : 20, root: o.hard ? 32 : 16 };
    }

    room({
        id: 'birthday-party', name: 'Birthday Party', tag: 'Hash collisions', order: 90,
        time: { easy: 90, normal: 60, hard: 70 },
        gen: genBirthday,
        build: function (ctx) {
            addCss();
            var P = genBirthday({ easy: ctx.easy, hard: ctx.hard, dog: ctx.dog, rnd: ctx.rnd, hash8: ctx.hash8 });
            var N = P.size, side = N === 256 ? 16 : 32;
            var invited = 0, phase = 'bet', bet = null, cells = [];

            ctx.tip('Every guest gets a <b>hat number</b> from a tiny hash of their name (0 to ' + (N - 1) + '). <b>Guess</b> first, then ' +
                '<b>invite guests</b> until two of them wear the same number.');
            ctx.hint('Just keep pressing Invite. With ' + N + ' numbers you need far fewer guests than ' + N + ': about ' + P.expect + '.');

            var ask = ctx.h('div', 'chx-card');
            var q = ctx.h('p', 'chh-news', 'How many guests until two share a hat number?');
            q.style.margin = '0 0 10px';
            ask.appendChild(q);
            var opts = ctx.h('div', 'chx-row');
            [[P.expect, 'About ' + P.expect], [N / 2, 'About ' + (N / 2)], [N, 'About ' + N]].forEach(function (c) {
                opts.appendChild(ctx.btn(c[1], null, function () { if (phase !== 'bet') return; bet = c[0]; startParty(); }));
            });
            ask.appendChild(opts);
            ctx.el.appendChild(ask);

            var party = ctx.h('div', 'chh-party');
            var door = ctx.h('div', 'chh-door');
            var invite = ctx.btn('Invite a guest', 'chx-go chh-big', function () { inviteOne(); });
            var next = ctx.h('div', 'chh-next', '');
            var meter = ctx.h('div', 'chh-meter');
            var bar = ctx.h('div', 'chh-meter-bar'), fill = ctx.h('i');
            var meterText = ctx.h('span', null, 'Chance of a shared hat: 0%');
            bar.appendChild(fill); meter.appendChild(meterText); meter.appendChild(bar);
            var stat = ctx.h('div', 'chh-stat');
            var sGuests = ctx.h('span'), sNums = ctx.h('span');
            sGuests.innerHTML = 'Guests: <b>0</b>';
            sNums.innerHTML = 'Hat numbers: <b>' + N + '</b>';
            stat.appendChild(sGuests); stat.appendChild(sNums);
            var news = ctx.h('div', 'chh-news', '');
            var boardBox = ctx.h('div', 'chh-boardbox');
            var board = ctx.h('div', 'chh-board');
            board.style.gridTemplateColumns = 'repeat(' + side + ', 1fr)';
            for (var i = 0; i < N; i++) { var c = ctx.h('i'); cells.push(c); board.appendChild(c); }
            boardBox.appendChild(board);
            boardBox.appendChild(ctx.h('div', 'chh-board-cap', 'All ' + N + ' hat numbers, one square each'));
            var guests = ctx.h('div', 'chh-guests');
            var claim = ctx.btn('Claim the collision', 'chx-go', function () {
                if (phase !== 'found') return;
                ctx.solve('Collisions come much sooner than you think: about the square root of the number of values, so real hashes like SHA-256 have 256 bits, and still need about 2^128 tries to collide.');
            });
            claim.hidden = true;

            function startParty() {
                phase = 'party';
                ask.remove();
                door.appendChild(invite); door.appendChild(next);
                ctx.el.appendChild(door); ctx.el.appendChild(stat); ctx.el.appendChild(meter);
                party.appendChild(boardBox); party.appendChild(guests);
                ctx.el.appendChild(party);
                ctx.tip('You guessed about <b>' + bet + '</b>. Now press <b>Invite a guest</b> (or Space) until two guests wear the <b>same hat number</b>.');
                paintNext();
                ctx.sfx('tap');
                try { invite.focus({ preventScroll: true }); } catch (e) { /* fine */ }
            }
            function paintNext() { next.textContent = 'At the door: ' + P.guests[invited].name; }
            function chance(n) { var p = 1; for (var k = 1; k < n; k++) p *= 1 - k / N; return 1 - p; }
            function inviteOne() {
                if (phase !== 'party') return;
                var g = P.guests[invited];
                invited++;
                var chip = ctx.h('span', 'chh-guest');
                chip.appendChild(document.createTextNode(g.name));
                chip.appendChild(ctx.h('b', null, String(g.hat)));
                g.chip = chip;
                guests.insertBefore(chip, guests.firstChild);
                cells.forEach(function (c) { c.classList.remove('new'); });
                cells[g.hat].classList.add('on');
                cells[g.hat].classList.add('new');
                sGuests.innerHTML = 'Guests: <b>' + invited + '</b>';
                var pc = Math.round(chance(invited) * 100);
                meterText.textContent = 'Chance of a shared hat: ' + pc + '%';
                fill.style.width = pc + '%';
                if (invited - 1 === P.first) { found(); return; }
                ctx.sfx('pop');
                paintNext();
            }
            function found() {
                phase = 'found';
                var a = P.guests[P.firstOf], b = P.guests[P.first];
                a.chip.classList.add('pair'); b.chip.classList.add('pair');
                guests.classList.add('chh-dim');
                guests.insertBefore(a.chip, guests.firstChild);
                guests.insertBefore(b.chip, guests.firstChild);
                cells[b.hat].classList.remove('new');
                cells[b.hat].classList.add('hit');
                invite.disabled = true;
                next.textContent = '';
                news.textContent = a.name + ' and ' + b.name + ' both got hat ' + b.hat + '!';
                door.insertBefore(news, invite);
                invite.remove();
                var sum = ctx.h('p', 'chx-tip');
                sum.style.textAlign = 'center';
                sum.innerHTML = 'It took <b>' + invited + '</b> guests, for <b>' + N + '</b> numbers. You guessed about ' + bet + '. ' +
                    'On average it takes about <b>' + P.expect + '</b>: a little more than the square root of ' + N + ' (' + P.root + ').';
                door.insertBefore(sum, next);
                door.insertBefore(claim, next);
                claim.hidden = false;
                ctx.tip('A <b>collision</b>! Two different names, the same hash. Press <b>Claim the collision</b>.');
                ctx.hint('Press Claim the collision: two guests already share a hat.');
                ctx.mood('wow'); ctx.sfx('win');
                ctx.say('Hat ' + b.hat + ' twice!', 1800);
                try { claim.focus({ preventScroll: true }); } catch (e) { /* fine */ }
            }
            ctx.key(function (e) {
                if ((e.key === ' ' || e.key === 'Enter') && phase === 'party') {
                    var a = document.activeElement;
                    if (a && a.tagName === 'BUTTON' && a !== invite) return;
                    if (a === invite) return;          /* the button itself handles it */
                    e.preventDefault(); inviteOne();
                }
            });
        }
    });

    /* ================= Password Bowl ================= */
    var PW = ['123456', 'password', 'qwerty', 'iloveyou', 'sunshine', 'letmein', 'meow123', 'catnip', 'tuna4ever', 'princess', 'dragon', 'monkey'];
    var PW_DOG = { meow123: 'woof123', catnip: 'goodboy', tuna4ever: 'bones4ever' };
    var SALT_CH = 'abcdefghjkmnpqrstuvwxyz23456789';

    function genPasswords(o) {
        var words = PW.map(function (p) { return o.dog && PW_DOG[p] || p; });
        var nTable = o.easy ? 8 : o.hard ? 12 : 10, nLeak = o.easy ? 3 : o.hard ? 5 : 4;
        var names = o.dog ? DOGS : CATS, table, leak, leak2;
        if (o.easy) {
            table = words.slice(0, 8);
            leak = [[names[0], words[3]], [names[1], words[0]], [names[18], words[6]]];
            leak2 = [[names[4], words[3], 'k3'], [names[19], words[0], 'zq'], [names[20], words[6], '9f']];
        } else {
            table = shuffleWith(o.rnd, words).slice(0, nTable);
            var who = shuffleWith(o.rnd, names.slice(0, 60)).slice(0, nLeak * 2);
            var pws = shuffleWith(o.rnd, table).slice(0, nLeak - 1);
            pws.push(pws[Math.floor(o.rnd() * pws.length)]);           /* two users share a password: the same hash */
            pws = shuffleWith(o.rnd, pws);
            leak = pws.map(function (p, i) { return [who[i], p]; });
            var pws2 = shuffleWith(o.rnd, table).slice(0, nLeak - 1);
            pws2.push(pws2[0]);                                         /* the same password twice, salted: two hashes */
            pws2 = shuffleWith(o.rnd, pws2);
            leak2 = pws2.map(function (p, i) { return [who[nLeak + i], p, null]; });
        }
        var tableRows = table.map(function (p) { return { pw: p, hash: hash16(p) }; });
        var known = {};
        tableRows.forEach(function (r) { known[r.hash] = 1; });
        tableRows.sort(function (a, b) { return a.hash < b.hash ? -1 : 1; });
        var used = {};
        var rows2 = leak2.map(function (u) {
            function fresh() { return SALT_CH.charAt(Math.floor(o.rnd() * SALT_CH.length)) + SALT_CH.charAt(Math.floor(o.rnd() * SALT_CH.length)); }
            var salt = u[2] || fresh(), h = hash16(salt + u[1]);
            while (known[h] || used[h]) { salt = fresh(); h = hash16(salt + u[1]); }
            used[h] = 1;
            return { user: u[0], pw: u[1], salt: salt, hash: h };
        });
        return {
            table: tableRows,
            leak: leak.map(function (u) { return { user: u[0], pw: u[1], hash: hash16(u[1]) }; }),
            leak2: rows2
        };
    }

    room({
        id: 'password-bowl', name: 'Password Bowl', tag: 'Salted passwords', order: 100,
        time: { easy: 100, normal: 75, hard: 70 },
        gen: genPasswords,
        build: function (ctx) {
            addCss();
            var P = genPasswords({ easy: ctx.easy, hard: ctx.hard, dog: ctx.dog, rnd: ctx.rnd });
            var phase = 1, sel = null, left = P.leak.length, rows = [];

            ctx.tip('A site leaked its password <b>hashes</b>. Tap a <b>leaked hash</b>, then the row of your table with the <b>same hash</b>: ' +
                'that is the password.');
            ctx.hint('Your table is sorted by hash. Find the same four characters as the leaked hash and tap that row.');

            var cols = ctx.h('div', 'chh-cols');
            var colL = ctx.h('div', 'chh-col'), colT = ctx.h('div', 'chh-col');
            var headL = ctx.h('h4', null, 'Leak 1: users and hashes');
            var listL = ctx.h('div', 'chh-list');
            colL.appendChild(headL); colL.appendChild(listL);
            var useless = ctx.btn('The table is useless here', 'chh-useless', function () {
                if (phase === 1) { ctx.wrong('Not useless yet: these hashes are in your table!'); return; }
                if (phase !== 2) return;
                phase = 3;
                rows.forEach(function (r) { r.b.classList.remove('sel'); });
                P.leak2.forEach(function (u, i) {
                    var p = ctx.h('span', 'p', u.pw);
                    rows[i].b.appendChild(p);
                    rows[i].b.classList.add('done');
                });
                useless.disabled = true;
                ctx.tip('Right! With a salt, every user needs a table of their own. (Here are the passwords, just so you know: the same words, other hashes.)');
                ctx.mood('happy'); ctx.sfx('win');
                ctx.later(function () {
                    ctx.solve('Salting makes ready-made tables useless: each account has to be attacked on its own. Sites should store slow, salted password hashes such as bcrypt or Argon2.');
                }, 1800);
            });
            colL.appendChild(useless);
            var headT = ctx.h('h4', null, 'Your table: common passwords, by hash');
            var listT = ctx.h('div', 'chh-list');
            colT.appendChild(headT); colT.appendChild(listT);
            cols.appendChild(colL); cols.appendChild(colT);
            ctx.el.appendChild(cols);

            P.table.forEach(function (r) {
                var b = ctx.h('button', 'chh-r');
                b.type = 'button';
                b.appendChild(ctx.h('span', 'n', r.pw));
                b.appendChild(ctx.h('span', 'x', r.hash));
                b.addEventListener('click', function () { if (ctx.alive()) pickTable(r); });
                listT.appendChild(b);
            });

            function showLeak(list, salted) {
                listL.innerHTML = ''; rows = [];
                list.forEach(function (u) {
                    var b = ctx.h('button', 'chh-r');
                    b.type = 'button';
                    b.appendChild(ctx.h('span', 'n', u.user));
                    if (salted) b.appendChild(ctx.h('span', 's', 'salt ' + u.salt));
                    b.appendChild(ctx.h('span', 'x', u.hash));
                    var r = { u: u, b: b, done: false };
                    b.addEventListener('click', function () { if (ctx.alive()) pickLeak(r); });
                    rows.push(r);
                    listL.appendChild(b);
                });
            }
            showLeak(P.leak, false);

            function pickLeak(r) {
                if (phase === 3 || r.done) return;
                rows.forEach(function (x) { x.b.classList.toggle('sel', x === r); });
                sel = r;
                ctx.sfx('tap');
                if (phase === 2) ctx.say('Hash ' + r.u.hash + '... is it in your table?', 1800);
            }
            function pickTable(t) {
                if (phase === 3) return;
                if (!sel) { ctx.say('First tap a leaked hash on the left.', 1800); return; }
                if (phase === 2) {
                    ctx.wrong('No row has hash ' + sel.u.hash + ': the salt changed it.');
                    return;
                }
                if (t.hash !== sel.u.hash) { ctx.wrong(sel.u.hash + ' and ' + t.hash + ' are not the same.'); return; }
                crack(sel);
                /* everyone with the same hash falls at once: the same password */
                rows.forEach(function (x) { if (!x.done && x.u.hash === t.hash) { crack(x); x.b.classList.add('twin'); sel.b.classList.add('twin'); } });
                sel = null;
                if (left === 0) ctx.later(nextLeak, 900);
            }
            function crack(r) {
                r.done = true; left--;
                r.b.classList.remove('sel'); r.b.classList.add('done');
                r.b.appendChild(ctx.h('span', 'p', r.u.pw));
                ctx.sfx('point');
            }
            function nextLeak() {
                phase = 2; sel = null;
                headL.textContent = 'Leak 2: a site that salts';
                showLeak(P.leak2, true);
                ctx.mood('think');
                ctx.say('A second leak!', 1500);
                ctx.tip('Cracked! Now a second site leaked. It stored <b>hash(salt + password)</b>, with a random salt per user. ' +
                    'Try your table. If nothing can match, press <b>The table is useless here</b>.');
                ctx.hint('Look for any leaked hash of Leak 2 in your table: none is there, because your table was made without these salts. Press The table is useless here.');
            }
        }
    });

    /* ================= Treat Miner ================= */
    function goalOf(level) {
        if (level === 'easy') return { zeros: 2, text: 'starts with <code>00</code>', expect: 256, ok: function (h) { return h.slice(0, 2) === '00'; } };
        if (level === 'hard') return { zeros: 3, text: 'starts with <code>000</code>', expect: 4096, ok: function (h) { return h.slice(0, 3) === '000'; } };
        return { zeros: 2, extra: true, text: 'starts with <code>00</code> and then a digit from 0 to 7', expect: 512,
            ok: function (h) { return h.slice(0, 2) === '00' && '01234567'.indexOf(h.charAt(2)) >= 0; } };
    }
    function genMiner(o) {
        var names = o.dog ? ['Rex', 'Buddy', 'Bella', 'Rocky', 'Daisy', 'Cooper'] : ['Milo', 'Luna', 'Felix', 'Nala', 'Simba', 'Cleo'];
        var thing = o.dog ? 'bones' : 'treats';
        if (o.easy) return { text: 'pay 3 ' + thing + ' to ' + names[0] + ', nonce: ', start: 0 };
        var n = 2 + Math.floor(o.rnd() * 8), who = names[Math.floor(o.rnd() * names.length)];
        return { text: 'pay ' + n + ' ' + thing + ' to ' + who + ', nonce: ', start: Math.floor(o.rnd() * 50) };
    }

    room({
        id: 'treat-miner', name: 'Treat Miner', tag: 'Proof of work', order: 110,
        time: { easy: 90, normal: 60, hard: 60 },
        gen: genMiner, goal: goalOf, fallbackHash: hash256,
        build: function (ctx) {
            addCss();
            var B = genMiner({ easy: ctx.easy, dog: ctx.dog, rnd: ctx.rnd }), G = goalOf(ctx.level);
            var nonce = B.start, cur = null, tries = 0, byHand = 0, HAND = 3, mining = false, busy = false, seq = 0;
            var BATCH = ctx.easy ? 10 : ctx.hard ? 96 : 16;

            function digest(t) {
                var p = ctx.sha256(t);
                return p ? p.then(null, function () { return hash256(t); }) : Promise.resolve(hash256(t));
            }

            ctx.tip('To add this block to the chain, its hash must ' + G.text.replace('starts', 'start') + '. Change the <b>nonce</b>: press <b>+1</b> a few times, ' +
                'then let <b>Mine</b> try thousands. When it works, <b>Submit block</b>.');
            ctx.hint('No way to aim: each nonce gives a random looking hash. Press +1 three times, then Mine, then Submit block.');

            var card = ctx.h('div', 'chx-card chh-block');
            card.appendChild(ctx.h('div', 'l', 'Block'));
            var txt = ctx.h('div', 'chh-text');
            card.appendChild(txt);
            card.appendChild(ctx.h('div', 'l', 'SHA-256 of the block'));
            var hashEl = ctx.h('div', 'chh-hash', '');
            card.appendChild(hashEl);
            ctx.el.appendChild(card);

            var goal = ctx.h('div', 'chh-goal');
            goal.innerHTML = 'Goal: the hash ' + G.text + '.';
            ctx.el.appendChild(goal);
            var stat = ctx.h('div', 'chh-stat');
            var sTries = ctx.h('span'), sExp = ctx.h('span');
            sExp.innerHTML = 'Expected: about <b>' + G.expect + '</b>';
            stat.appendChild(sTries); stat.appendChild(sExp);
            ctx.el.appendChild(stat);

            var row = ctx.h('div', 'chx-row');
            var plus = ctx.btn('+1', null, function () { step(); });
            plus.setAttribute('aria-label', 'Next nonce');
            plus.style.minWidth = '64px';
            var mine = ctx.btn('Mine', 'chx-go', function () { toggleMine(); });
            var submit = ctx.btn('Submit block', null, function () { send(); });
            row.appendChild(plus); row.appendChild(mine); row.appendChild(submit);
            ctx.el.appendChild(row);

            function paint(h) {
                txt.innerHTML = '';
                txt.appendChild(document.createTextNode(B.text));
                txt.appendChild(ctx.h('b', null, String(nonce)));
                sTries.innerHTML = 'Tries: <b>' + tries + '</b>';
                mine.textContent = mining ? 'Stop' : byHand < HAND ? 'Mine (after ' + (HAND - byHand) + ' by hand)' : 'Mine';
                mine.disabled = !mining && byHand < HAND;
                if (!h) { hashEl.textContent = '...'; return; }
                var html = '', lead = true;
                for (var i = 0; i < h.length; i++) {
                    var c = h.charAt(i);
                    if (lead && i < G.zeros && c === '0') html += '<span class="lz">0</span>';
                    else if (lead && G.extra && i === 2 && '01234567'.indexOf(c) >= 0) html += '<span class="lz">' + c + '</span>';
                    else if (lead && i <= (G.extra ? 2 : G.zeros - 1)) { lead = false; html += '<span class="miss">' + c + '</span>'; }
                    else { lead = false; html += c === '0' ? '<span class="z">0</span>' : c; }
                }
                hashEl.innerHTML = html;
            }
            function show(n, h) { nonce = n; cur = h; paint(h); }

            function step() {
                if (busy || mining) return;
                busy = true;
                var n = nonce + 1, my = ++seq;
                digest(B.text + n).then(function (h) {
                    busy = false;
                    if (!ctx.alive() || my !== seq) return;
                    tries++; byHand++;
                    show(n, h);
                    if (G.ok(h)) { ctx.mood('wow'); ctx.say('By hand! Lucky paw!', 1600); ctx.sfx('win'); }
                    else ctx.sfx('tap');
                });
            }
            function toggleMine() {
                if (mining) { mining = false; seq++; paint(cur); return; }
                if (byHand < HAND || busy) return;
                if (cur && G.ok(cur)) { ctx.say('This one is already good: submit it!', 1800); return; }
                mining = true;
                ctx.mood('think');
                paint(cur);
                tick(++seq);
            }
            function tick(my) {
                if (!mining || my !== seq || !ctx.alive()) return;
                var ns = [], ps = [];
                for (var k = 1; k <= BATCH; k++) { ns.push(nonce + k); ps.push(digest(B.text + (nonce + k))); }
                Promise.all(ps).then(function (hs) {
                    if (!ctx.alive() || !mining || my !== seq) return;
                    for (var i = 0; i < hs.length; i++) {
                        tries++;
                        if (G.ok(hs[i])) {
                            mining = false;
                            show(ns[i], hs[i]);
                            ctx.mood('happy'); ctx.sfx('win');
                            ctx.say('Found one! Nonce ' + ns[i] + '.', 1800);
                            ctx.tip('Nonce <b>' + ns[i] + '</b> works, after ' + tries + ' tries (about ' + G.expect + ' on average, luck varies a lot). Anyone can check it with <b>one</b> hash. Press <b>Submit block</b>.');
                            ctx.hint('The hash now starts with enough zeros: press Submit block.');
                            try { submit.focus({ preventScroll: true }); } catch (e) { /* fine */ }
                            return;
                        }
                    }
                    show(ns[ns.length - 1], hs[hs.length - 1]);
                    ctx.later(function () { tick(my); }, 30);
                });
            }
            function send() {
                if (mining) { ctx.say('Still mining...', 1200); return; }
                if (!cur || !G.ok(cur)) { ctx.wrong('That hash does not start with enough zeros.'); return; }
                ctx.solve('Proof of work: finding a good nonce takes many tries, checking it takes one. Bitcoin chains its blocks this way, so rewriting history means redoing all that work.');
            }
            ctx.key(function (e) {
                if (e.key === '+' || e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); step(); }
            });

            paint(null);
            digest(B.text + nonce).then(function (h) { if (ctx.alive() && !cur && !mining) show(nonce, h); });
        }
    });
})();
