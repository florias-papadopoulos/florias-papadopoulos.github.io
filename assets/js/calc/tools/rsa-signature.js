/* Toolbox: textbook RSA signatures: s = h^d mod N, verified by s^e = h mod N, where h is the message as a number or
   SHA-256 of the message reduced mod N. */
Calc.tool({
    id: 'rsa-signature',
    inputs: [
        { id: 'p', label: 'Prime $p$', placeholder: '61' },
        { id: 'q', label: 'Prime $q$', placeholder: '53' },
        { id: 'e', label: 'Public exponent $e$', placeholder: '17' },
        { id: 'fmt', type: 'select', label: 'Message as', value: 'num', options: [['num', 'A number'], ['text', 'Text']] },
        { id: 'm', type: 'text', label: 'Message $m$', placeholder: '65', optional: true, when: { fmt: 'num' } },
        { id: 'text', type: 'text', label: 'Message text', placeholder: 'Hello', optional: true, maxLength: 1000, when: { fmt: 'text' } },
        { id: 'hash', type: 'select', label: 'What is signed', width: 'l', value: 'none', options: [['none', 'The message itself (as a number)'], ['sha', 'SHA-256 of the message, mod N']] },
        { id: 'sig', type: 'text', label: 'Signature $s$ (to verify)', placeholder: '588', optional: true, width: 'l' }
    ],
    actions: [{ id: 'sign', label: 'Sign' }, { id: 'verify', label: 'Verify' }],
    examples: [
        { p: '61', q: '53', e: '17', fmt: 'num', m: '65', hash: 'none', sig: '' },
        { p: '61', q: '53', e: '17', fmt: 'num', m: '65', hash: 'none', sig: '588', _action: 'verify' },
        { p: '2^89 - 1', q: '2^107 - 1', e: '65537', fmt: 'text', text: 'I owe you 10 euros', hash: 'sha', sig: '' },
        { p: '61', q: '53', e: '17', fmt: 'num', m: '65', hash: 'none', sig: '589', _action: 'verify' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex;
        var key = M.rsaKeySteps(S, v.p, v.q, v.e), N = key.N, d = key.d;
        var field = v.fmt === 'text' ? 'text' : 'm', sm = S.step(v.hash === 'sha' ? 'Hash the message' : 'The message as a number'), h, m;
        if (v.fmt === 'text') {
            if (!v.text) Calc.fail('Please enter a message.', 'text');
        } else {
            m = M.optInt(v.m, 'm');
            if (m === null) Calc.fail('Please enter a message m.', 'm');
            if (m < 0n) Calc.fail('The message must not be negative.', 'm');
        }
        if (v.hash === 'sha') {
            var bytes = v.fmt === 'text' ? M.utf8(v.text) : M.intToBytes(m);
            var dig = M.sha256(bytes), hv = M.bytesToInt(dig);
            sm.p(v.fmt === 'text' ? 'SHA-256 of the UTF-8 bytes of "' + Calc.esc(v.text) + '":' : 'SHA-256 of the bytes of $m$ (big-endian, $\\texttt{' + (M.hex(bytes) || 'empty') + '}$):');
            sm.math('H(m) = \\texttt{' + M.hex(dig).toLowerCase() + '} = ' + T(hv));
            h = hv % N;
            sm.p(N > hv ? 'Here $N$ is larger than the digest, so reducing modulo $N$ changes nothing:' : 'This toy $N$ is smaller than the 256-bit digest, so the digest is reduced modulo $N$ (with real keys of 2048 bits the padded hash fits):');
            sm.math('h = H(m) \\bmod N = ' + T(h));
        } else {
            h = v.fmt === 'text' ? M.textStep(sm, v.text, 'h') : m;
            if (v.fmt !== 'text') sm.math('h = m = ' + T(h));
            if (h >= N) Calc.fail('The message as a number must be smaller than N = ' + N + ' (it is ' + h + '). Use larger primes, or sign the SHA-256 hash.', field);
        }
        var s;
        if (v._action === 'sign') {
            s = M.powStep(S.step('Sign with the private key: $s \\equiv h^d \\pmod N$'), h, d, N, { name: 's \\equiv ' + T(h) + '^{' + T(d) + '}' });
            S.result(['$s = ' + T(s) + '$'], { copy: String(s), label: 'Signature' });
            S.note('Anyone with the public key $(N, e) = (' + T(N) + ', ' + T(v.e) + ')$ can check it.');
        } else {
            s = M.optInt(v.sig, 'sig');
            if (s === null) Calc.fail('Please enter the signature s to verify.', 'sig');
            if (s < 0n || s >= N) Calc.fail('A signature is a number from 0 to N - 1 = ' + (N - 1n) + '.', 'sig');
        }
        var hv2 = M.powStep(S.step('Verify with the public key: $s^e \\bmod N$'), s, v.e, N, { name: 's^e \\equiv ' + T(s) + '^{' + T(v.e) + '}' });
        var ok = hv2 === h;
        S.step('Compare with $h$').check(ok, ok ? '$s^e \\equiv ' + T(hv2) + ' = h$: the signature is valid' : '$s^e \\equiv ' + T(hv2) + ' \\ne h = ' + T(h) + '$: the signature is not valid');
        if (v._action === 'verify') S.result([ok ? 'Valid signature' : 'Invalid signature'], { copy: ok ? 'valid' : 'invalid', label: 'Verification' });
        S.note(v.hash === 'sha'
            ? 'Hash then sign is the right idea, but real RSA signatures also pad the hash (RSA-PSS or PKCS #1 v1.5) and use keys of 2048 bits or more.'
            : 'Signing the message itself is insecure: anyone can pick $s$ and publish $(s^e \\bmod N, s)$ as a valid pair, and two signatures multiply into a signature on the product. Real schemes sign a padded hash (RSA-PSS).');
    }
});
