/* Open padlocks, "Try it": the padlock and key as small numbers (RSA with 33 = 3 x 11, lock with 3, open with 7):
   lock a number of your choice and watch the dog's key bring it back. Then the fox's problem: the key comes from
   the two numbers whose product is the padlock's number, so try to split 8051 (83 x 97). */
(function () {
    'use strict';
    var NUM = 33, E = 3, D = 7, BIG = 8051;
    function powmod(b, e, m) { var r = 1; for (var i = 0; i < e; i++) r = r * b % m; return r; }
    function pow(b, e) { var r = 1; for (var i = 0; i < e; i++) r *= b; return r; }

    SC.tryBox('padlock', function (box, U) {
        U.h('p', 'sc-try-lead', '<b>The padlock as numbers.</b> The dog’s open padlock is the number 33 and the number 3: to lock a number, multiply it by itself 3 times and keep the remainder after dividing by 33. The dog’s key is the number 7: the same, 7 times, gives the number back.', box);
        var pick = U.h('div', 'sc-stepper', null, box);
        U.h('span', 'sc-mixlab', 'Your secret number', pick);
        var minus = U.h('button', 'sc-tbtn', { type: 'button', 'aria-label': 'One less' }, pick);
        minus.textContent = '−';
        var num = U.h('output', 'sc-num-out', { 'aria-live': 'polite' }, pick);
        var plus = U.h('button', 'sc-tbtn', { type: 'button', 'aria-label': 'One more' }, pick);
        plus.textContent = '+';
        var lines = U.h('ol', 'sc-calc-steps', null, box);
        var m = 4;
        function show() {
            var c = powmod(m, E, NUM), back = powmod(c, D, NUM);
            num.textContent = m;
            lines.innerHTML = '<li><b>Lock</b> (anyone can): ' + m + ' × ' + m + ' × ' + m + ' = ' + U.big(pow(m, 3)) + ', which leaves <b>' + c + '</b> after dividing by 33. This is all the fox sees.</li>' +
                '<li><b>Open</b> (only the dog): ' + c + ' multiplied 7 times is ' + U.big(pow(c, 7)) + ', which leaves <b>' + back + '</b>. Your number is back.</li>';
            minus.disabled = m <= 2; plus.disabled = m >= NUM - 1;
        }
        minus.addEventListener('click', function () { if (m > 2) { m--; show(); } });
        plus.addEventListener('click', function () { if (m < NUM - 1) { m++; show(); } });
        show();

        U.h('p', 'sc-try-lead sc-gap', '<b>Now be the fox.</b> The dog made its key 7 from the two numbers that multiply to 33, which are 3 and 11. Whoever finds them can make the key too. For 33 that is easy. Try this padlock: which two whole numbers multiply to <b>' + BIG + '</b>?', box);
        var lab = U.h('label', 'sc-field sc-short', '<span>One of the two numbers</span>', box);
        var row = U.h('span', 'sc-inrow', null, lab);
        var input = U.h('input', '', { type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: '5', pattern: '[0-9]*' }, row);
        var go = U.h('button', 'sc-tbtn', { type: 'button' }, row);
        go.textContent = 'Check';
        var say = U.h('p', 'sc-say', '', box);
        var tries = 0;
        function check() {
            var x = parseInt(input.value, 10);
            if (!(x > 0)) { say.textContent = 'Type a whole number.'; say.className = 'sc-say'; return; }
            tries++;
            if (x > 1 && x < BIG && BIG % x === 0) {
                say.innerHTML = '<b>Yes: ' + BIG + ' = ' + Math.min(x, BIG / x) + ' × ' + Math.max(x, BIG / x) + '.</b> You could now make the dog’s key. A real padlock number has about 600 digits, and splitting it would take every computer on Earth longer than the universe has existed.';
                say.className = 'sc-say sc-good';
            } else {
                say.innerHTML = x === 1 || x === BIG ? 'That one is too easy: 1 × ' + BIG + ' does not help. Look for two numbers bigger than 1.'
                    : BIG + ' ÷ ' + x + ' = ' + (BIG / x).toFixed(2) + ', not a whole number. ' + (tries > 2 ? 'Hard, right? There is no shortcut: you try one number after another. (Hint: both are a bit below 100.)' : 'Try another.');
                say.className = 'sc-say';
            }
        }
        go.addEventListener('click', check);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    });
})();
