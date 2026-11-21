/* Cipher History desk tool: the cipher wheel (shift ciphers) and the table of all 25 shifts.

   CH.desk.wheel(el, { shift, onChange(k) }) draws two rings: the plain alphabet outside, the cipher alphabet inside,
   turned by the shift k (plain A sits over cipher A+k). Turn it with the buttons, the slider, the arrow keys or by
   dragging the inner ring. Returns { get(), set(k) }.
   CH.desk.shift(text, k) shifts the letters of text by k (case kept, other characters kept): the Toolbox's Caesar.
   CH.desk.allShifts(el, text, onPick(k)) lists the text under every shift, as a codebreaker tries them all. */
(function () {
    'use strict';
    var A = CH.ALPHA, STEP = 360 / 26;

    CH.desk.shift = function (text, k) { return CH.B().caesar(String(text), ((k % 26) + 26) % 26); };

    CH.desk.wheel = function (el, opt) {
        opt = opt || {};
        var k = ((opt.shift || 0) % 26 + 26) % 26, turned = -k * STEP;
        var wrap = CH.el('div', { class: 'ch-wheel' });
        var svg = CH.svg('svg', { viewBox: '0 0 300 300', class: 'ch-wheel-svg', role: 'img', 'aria-label': 'A cipher wheel' });
        CH.svg('circle', { cx: 150, cy: 150, r: 146, class: 'ch-wh-outer' }, svg);
        CH.svg('circle', { cx: 150, cy: 150, r: 108, class: 'ch-wh-line' }, svg);
        var inner = CH.svg('g', { class: 'ch-wh-inner' }, svg);
        CH.svg('circle', { cx: 150, cy: 150, r: 106, class: 'ch-wh-disc' }, inner);
        CH.svg('circle', { cx: 150, cy: 150, r: 70, class: 'ch-wh-line' }, inner);
        for (var j = 0; j < 26; j++) {
            var a = j * STEP;
            CH.svg('text', { x: 150, y: 30, class: 'ch-wh-plain', transform: 'rotate(' + a + ' 150 150)', text: A.charAt(j) }, svg);
            CH.svg('text', { x: 150, y: 68, class: 'ch-wh-cipher', transform: 'rotate(' + a + ' 150 150)', text: A.charAt(j) }, inner);
            CH.svg('line', { x1: 150, y1: 4, x2: 150, y2: 12, class: 'ch-wh-tick', transform: 'rotate(' + (a + STEP / 2) + ' 150 150)' }, svg);
        }
        /* the window at the top: plain A over its cipher letter */
        CH.svg('path', { d: 'M137 8h26v68h-26z', class: 'ch-wh-window' }, svg);
        CH.svg('circle', { cx: 150, cy: 150, r: 34, class: 'ch-wh-hub' }, svg);
        var hub = CH.svg('text', { x: 150, y: 158, class: 'ch-wh-hubtext' }, svg);
        wrap.appendChild(svg);

        var minus = CH.button('−', function () { set(k - 1); }, 'ch-btn-round');
        var plus = CH.button('+', function () { set(k + 1); }, 'ch-btn-round');
        minus.setAttribute('aria-label', 'Turn back one letter');
        plus.setAttribute('aria-label', 'Turn on one letter');
        var range = CH.el('input', { type: 'range', min: 0, max: 25, step: 1, value: k, class: 'ch-range', 'aria-label': 'Shift' });
        range.addEventListener('input', function () { set(Number(range.value)); });
        var read = CH.el('p', { class: 'ch-wh-read', 'aria-live': 'polite' });
        wrap.appendChild(CH.el('div', { class: 'ch-wh-controls' }, [minus, range, plus]));
        wrap.appendChild(read);
        el.appendChild(wrap);

        function draw() {
            inner.style.transform = 'rotate(' + turned + 'deg)';
            hub.textContent = k;
            range.value = k;
            read.textContent = 'Shift ' + k + ': plain A becomes ' + A.charAt(k) + ', B becomes ' + A.charAt((k + 1) % 26) + ', and so on.';
        }
        function set(n, quiet) {
            var nk = ((Math.round(n) % 26) + 26) % 26;
            /* turn the short way round */
            var d = nk - k;
            if (d > 13) d -= 26;
            if (d < -13) d += 26;
            turned -= d * STEP;
            k = nk;
            draw();
            if (!quiet && opt.onChange) opt.onChange(k);
        }

        /* drag the wheel round */
        var dragging = null;
        function angle(e) {
            var r = svg.getBoundingClientRect();
            return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
        }
        svg.addEventListener('pointerdown', function (e) {
            dragging = { a: angle(e), k: k };
            svg.setPointerCapture(e.pointerId);
            svg.classList.add('is-dragging');
        });
        svg.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var d = angle(e) - dragging.a;
            if (d > 180) d -= 360;
            if (d < -180) d += 360;
            var nk = dragging.k - Math.round(d / STEP);
            if ((((nk % 26) + 26) % 26) !== k) set(nk);
        });
        function stop() { dragging = null; svg.classList.remove('is-dragging'); }
        svg.addEventListener('pointerup', stop);
        svg.addEventListener('pointercancel', stop);
        draw();
        return { get: function () { return k; }, set: set };
    };

    CH.desk.allShifts = function (el, text, onPick) {
        var list = CH.el('ol', { class: 'ch-shifts', start: 1 });
        for (var k = 1; k < 26; k++) {
            /* deciphering with key k means shifting back by k */
            var line = CH.desk.shift(text, -k);
            var b = CH.el('button', { type: 'button', class: 'ch-shift-row', 'data-k': k }, [
                CH.el('span', { class: 'ch-shift-k', text: 'Key ' + k }),
                CH.el('span', { class: 'ch-shift-t', text: line })
            ]);
            if (onPick) b.addEventListener('click', (function (kk) { return function () { onPick(kk); }; })(k));
            list.appendChild(CH.el('li', null, [b]));
        }
        el.appendChild(list);
        return list;
    };
})();
