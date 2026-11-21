/* Passwords and salt, "Try it": type a password and see its real fingerprint (SHA-256) without salt, and whether
   the fox's little book of common passwords has it; then with a random salt, which no book was made for. */
(function () {
    'use strict';
    var COMMON = ['123456', 'password', '123456789', '12345678', 'qwerty', '111111', '12345', 'abc123', 'password1',
        'iloveyou', '1234567', '123123', 'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'football', 'sunshine',
        'princess', 'qwerty123', '000000', 'fish123', 'hello', 'starwars', 'pokemon', 'secret'];
    var ABC = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    function salt() { var s = ''; for (var i = 0; i < 4; i++) s += ABC.charAt(Math.floor(Math.random() * ABC.length)); return s; }

    SC.tryBox('passwords', function (box, U) {
        U.h('p', 'sc-try-lead', '<b>Be the website.</b> Type a password (a made-up one, not your real one). This page keeps nothing and sends nothing.', box);
        var lab = U.h('label', 'sc-field', '<span>Password</span>', box);
        var input = U.h('input', '', { type: 'text', value: 'fish123', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '60' }, lab);

        var r1 = U.h('div', 'sc-pwrow', null, box);
        U.h('span', 'sc-pwlab', 'Without salt', r1);
        var b1 = U.blocks(r1, 6);
        var say1 = U.h('p', 'sc-say', '', box);

        var r2 = U.h('div', 'sc-pwrow sc-gap-top', null, box);
        U.h('span', 'sc-pwlab', 'With salt', r2);
        var sChip = U.h('code', 'sc-saltchip', '', r2);
        var b2 = U.blocks(r2, 6);
        var r3 = U.h('div', 'sc-pwrow', null, box);
        U.h('span', 'sc-pwlab', 'Same password, another user', r3);
        var sChip2 = U.h('code', 'sc-saltchip', '', r3);
        var b3 = U.blocks(r3, 6);
        U.h('p', 'sc-say', 'The fox’s book cannot help with either: it was made without these salts. And two users with the same password no longer have the same blocks.', box);
        var again = U.h('button', 'sc-tbtn sc-wide', { type: 'button' }, box);
        again.textContent = 'New salts';
        var s1 = salt(), s2 = salt();

        function show() {
            var pw = input.value;
            b1.set(SC.colours(SC.sha256(pw)));
            b2.set(SC.colours(SC.sha256(s1 + pw)));
            b3.set(SC.colours(SC.sha256(s2 + pw)));
            sChip.textContent = s1; sChip2.textContent = s2;
            var hit = COMMON.indexOf(pw) >= 0;
            say1.innerHTML = !pw ? 'Type something.' : hit ? '<b>In the fox’s book.</b> A stolen list gives this password away in a second.'
                : pw.length < 8 ? 'Not in this little book. But real books hold billions of leaked passwords, and short ones can simply all be tried.'
                : 'Not in this little book. A long password that you use nowhere else is the hardest to guess.';
            say1.className = 'sc-say' + (hit || pw.length < 8 ? ' sc-bad-say' : ' sc-good');
        }
        input.addEventListener('input', show);
        again.addEventListener('click', function () { s1 = salt(); s2 = salt(); show(); });
        show();
    });
})();
