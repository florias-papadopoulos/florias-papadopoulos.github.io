/* The presenter key box of /live/admin/ and /live/present/: the key (the worker's PRESENTER_KEY) is typed once per tab
   and kept in that tab's sessionStorage ('live-key', see 00-common.js), so it is gone when the tab is closed; it is only
   ever sent in an Authorization header or as the first WebSocket message, never in an address. */
(function (LV) {
    'use strict';
    var h = LV.h;
    function strong(k) { return k.length >= 24 && /[a-z]/.test(k) && /[A-Z]/.test(k) && /[0-9]/.test(k); }

    /* draws the box into el; done() runs once a key of the right shape is saved */
    LV.keyForm = function (el, msg, done) {
        var input = h('input.lv-key-in', { id: 'lv-key-in', type: 'password', autocomplete: 'current-password', spellcheck: 'false', required: true });
        var note = h('p.lv-formnote' + (msg ? '.is-bad' : ''), { role: 'status', text: msg || 'Kept in this tab only, until you close it.' });
        var form = h('form.lv-form.lv-key', { onsubmit: function (e) {
            e.preventDefault();
            var k = input.value.trim();
            if (!strong(k)) { note.textContent = 'The key has at least 24 characters, with lower case, upper case and digits.'; note.className = 'lv-formnote is-bad'; return; }
            input.value = '';
            LV.setKey(k);
            done(k);
        } }, [
            h('h1.lv-title', { text: 'Presenter' }),
            h('p.lv-sub', { text: 'This page is for the speaker.' }),
            h('label', { for: 'lv-key-in', text: 'Presenter key' }),
            h('div.lv-form-row', {}, [input, h('button.lv-btn', { type: 'submit', text: 'Open' })]),
            note
        ]);
        LV.clear(el).appendChild(h('section.lv-card.lv-keycard', {}, [form]));
        try { input.focus(); } catch (e) { /* fine */ }
    };
    LV.forgetButton = function (after) {
        return h('button.lv-link', { type: 'button', text: 'Forget the key in this tab', onclick: function () { LV.setKey(''); if (after) after(); else location.reload(); } });
    };
})(window.LV);
