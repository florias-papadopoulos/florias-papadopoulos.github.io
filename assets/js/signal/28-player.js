/* Signal in two browsers, part 7: the player. Every step of the protocol is queued with a one line caption and
   played one after the other: by itself at the chosen speed (chat mode), or one step per click on "Next" (step by
   step mode). Also the flying key: a message key moving from its column to the message it encrypts. With
   prefers-reduced-motion the steps are quick and nothing flies. */
(function (SG) {
    'use strict';
    SG.still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function sleep(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

    /* opts: {say(text), onBusy(bool), onWait(bool)} */
    SG.Player = function (opts) {
        this.q = [];
        this.busy = false;
        this.stepMode = false;
        this.speed = 1;
        this.opts = opts;
        this.release = null;
        this.dead = false;
    };
    var P = SG.Player.prototype;
    /* caption (or ''), fn (may return a promise), ms: how long the step stays at speed 1 */
    P.add = function (cap, fn, ms) { this.q.push({ cap: cap, fn: fn, ms: ms === undefined ? 900 : ms }); return this; };
    P.wait = function (ms) { return sleep(SG.still ? Math.min(ms, 150) : ms / this.speed); };
    P.next = function () { if (this.release) { var r = this.release; this.release = null; this.opts.onWait(false); r(); } };
    P.setStep = function (on) { this.stepMode = on; if (!on) this.next(); };
    P.stop = function () { this.dead = true; this.q = []; this.next(); };
    /* plays the queue; resolves when it is empty */
    P.go = async function () {
        if (this.busy) return;
        this.busy = true;
        this.opts.onBusy(true);
        while (this.q.length && !this.dead) {
            var s = this.q.shift();
            var cap = typeof s.cap === 'function' ? s.cap() : s.cap;
            if (cap) this.opts.say(cap);
            try { var r = s.fn && s.fn(); if (r && r.then) await r; } catch (e) { this.q = []; this.opts.say('Something went wrong (' + (e && e.message || e) + '). Start again?'); }
            if (this.dead) break;
            if (this.stepMode && s.cap && this.q.length) {
                var self = this;
                this.opts.onWait(true);
                await new Promise(function (ok) { self.release = ok; });
            } else await this.wait(s.ms);
        }
        this.busy = false;
        if (!this.dead) this.opts.onBusy(false);
    };

    /* a copy of el flies to target (both elements), in ms at speed 1 */
    SG.fly = function (el, target, ms, speed) {
        if (SG.still || !el || !target) return Promise.resolve();
        var a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
        if (!a.width || !b.width) return Promise.resolve();
        var t = Math.round((ms || 700) / (speed || 1));
        var c = el.cloneNode(true);
        c.classList.add('sg-fly');
        c.style.left = a.left + 'px';
        c.style.top = a.top + 'px';
        c.style.width = a.width + 'px';
        c.style.transition = 'transform ' + t + 'ms cubic-bezier(.5,0,.3,1), opacity ' + t + 'ms';
        document.body.appendChild(c);
        void c.offsetWidth;
        c.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(0.8)';
        c.style.opacity = '0.2';
        return sleep(t).then(function () { c.remove(); });
    };
})(window.SG);
