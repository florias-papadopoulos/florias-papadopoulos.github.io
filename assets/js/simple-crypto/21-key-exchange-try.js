/* Story 1, "Try it": be the fox. First with paint: slide a colour until yellow plus it gives the cat's orange (paint
   lets you see when you are close). Then the real thing in small numbers: 5 multiplied by itself on a 23 hour clock;
   the results jump around, so there is no warmer or colder, only trying one number after another. */
(function () {
    'use strict';
    var Y = '#f4c430', SECRET_HUE = 339, G = 5, P = 23, A = 6;

    function hsl(hh) {
        /* the cat's pink is hsl(339, 71%, 57%); the slider changes only the hue */
        var s = 0.71, l = 0.57, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2, rgb;
        if (hh < 60) rgb = [c, x, 0]; else if (hh < 120) rgb = [x, c, 0]; else if (hh < 180) rgb = [0, c, x];
        else if (hh < 240) rgb = [0, x, c]; else if (hh < 300) rgb = [x, 0, c]; else rgb = [c, 0, x];
        return '#' + rgb.map(function (v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }).join('');
    }
    function power(k) { var r = 1; for (var i = 0; i < k; i++) r *= G; return r; }

    SC.tryBox('key-exchange', function (box, U) {
        var H = SC.H;
        /* ---- with paint ---- */
        U.h('p', 'sc-try-lead', '<b>Be the fox.</b> You saw the yellow and the cat’s orange. Find the cat’s secret colour: slide until yellow plus your colour gives the orange.', box);
        var row = U.h('div', 'sc-mixrow', null, box);
        function cell(lab, colour) {
            var c = U.h('span', 'sc-mixcell', null, row);
            var sw = U.swatch(c, colour, 'sc-pot-sw');
            U.h('span', 'sc-mixlab', lab, c);
            return sw;
        }
        cell('public yellow', Y);
        U.h('span', 'sc-op', '+', row);
        var swGuess = cell('your guess', Y);
        U.h('span', 'sc-op', '=', row);
        var swMix = cell('your mix', Y);
        U.h('span', 'sc-op sc-vs', 'vs', row);
        var target = H.mix(Y, hsl(SECRET_HUE), 0.5);
        cell('cat’s orange', target);
        var lab = U.h('label', 'sc-slider', '<span>Your colour</span>', box);
        var range = U.h('input', '', { type: 'range', min: '0', max: '359', value: '130', 'aria-label': 'Your guess for the cat’s secret colour' }, lab);
        var say = U.h('p', 'sc-say', '', box);
        function paint() {
            var hh = +range.value, c = hsl(hh), d = Math.abs(hh - SECRET_HUE);
            d = Math.min(d, 360 - d);
            swGuess.set(c); swMix.set(H.mix(Y, c, 0.5));
            say.innerHTML = d <= 3 ? '<b>Got it!</b> With paint you could see yourself getting closer. That is where paint is only a picture. The real thing uses numbers:'
                : d <= 15 ? 'Very close.' : d <= 45 ? 'Warmer.' : 'Far off.';
            say.classList.toggle('sc-good', d <= 3);
        }
        range.addEventListener('input', paint);
        paint();

        /* ---- with numbers ---- */
        U.h('p', 'sc-try-lead sc-gap', '<b>Now with numbers, as computers do it.</b> The public yellow is the number 5. Mixing is multiplying 5 by itself, as many times as the secret says, on a clock with 23 hours: keep only the remainder after dividing by 23. The cat’s mix is <b>' + (power(A) % P) + '</b>. How many times did it multiply?', box);
        var pick = U.h('div', 'sc-stepper', null, box);
        var minus = U.h('button', 'sc-tbtn', { type: 'button', 'aria-label': 'One less' }, pick);
        minus.textContent = '−';
        var num = U.h('output', 'sc-num-out', { 'aria-live': 'polite' }, pick);
        var plus = U.h('button', 'sc-tbtn', { type: 'button', 'aria-label': 'One more' }, pick);
        plus.textContent = '+';
        var out = U.h('p', 'sc-calc', '', box);
        var trail = U.h('div', 'sc-trail', null, box);
        var end = U.h('p', 'sc-say', '', box);
        var tried = {}, k = 1;
        function show() {
            var v = power(k), r = v % P;
            num.textContent = k;
            out.innerHTML = '5 multiplied ' + k + (k === 1 ? ' time' : ' times') + ' is ' + U.big(v) + '. Divided by 23 it leaves <b>' + r + '</b>' + (r === power(A) % P ? '.' : ', not ' + (power(A) % P) + '.');
            tried[k] = r;
            trail.innerHTML = '';
            for (var i = 1; i < P; i++) {
                if (tried[i] == null) continue;
                var c = U.h('span', 'sc-chip' + (i === A ? ' sc-hit' : '') + (i === k ? ' sc-now' : ''), '<i>' + i + '</i>' + tried[i], trail);
                c.title = i + ' times gives ' + tried[i];
            }
            minus.disabled = k <= 1; plus.disabled = k >= P - 1;
            var found = tried[A] != null;
            end.innerHTML = found ? '<b>Found: 6.</b> But only by trying one number after the other: the remainders jump around, so a guess never tells you if you are close. A real clock has about 600 digits, and trying them all would take longer than the age of the universe.'
                : Object.keys(tried).length > 2 ? 'Notice: next to each other, the guesses give results that jump all over the clock. No warmer or colder here.' : '';
            end.classList.toggle('sc-good', found);
        }
        minus.addEventListener('click', function () { if (k > 1) { k--; show(); } });
        plus.addEventListener('click', function () { if (k < P - 1) { k++; show(); } });
        show();
    });
})();
