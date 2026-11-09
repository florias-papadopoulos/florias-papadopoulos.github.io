/* Toolbox: textbook RSA, key generation from p, q, e, encryption and decryption by square and multiply, and
   decryption with the Chinese remainder theorem (dp, dq, qinv). Messages as numbers or as short text. */
Calc.tool({
    id: 'rsa',
    inputs: [
        { id: 'p', label: 'Prime $p$', placeholder: '61' },
        { id: 'q', label: 'Prime $q$', placeholder: '53' },
        { id: 'e', label: 'Public exponent $e$', placeholder: '17', help: 'Coprime to $\\varphi(N)$; 65537 is the usual choice.' },
        { id: 'fmt', type: 'select', label: 'Message as', value: 'num', options: [['num', 'A number'], ['text', 'Text (UTF-8 bytes)']] },
        { id: 'm', type: 'text', label: 'Message $m$ (to encrypt)', placeholder: '65', optional: true, when: { fmt: 'num' } },
        { id: 'text', type: 'text', label: 'Message text (to encrypt)', placeholder: 'Hi', optional: true, maxLength: 256, when: { fmt: 'text' } },
        { id: 'c', type: 'text', label: 'Ciphertext $c$ (to decrypt)', placeholder: '2790', optional: true, width: 'l' }
    ],
    actions: [{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }],
    examples: [
        { p: '61', q: '53', e: '17', fmt: 'num', m: '65', c: '' },
        { p: '61', q: '53', e: '17', fmt: 'num', m: '', c: '2790', _action: 'dec' },
        { p: '2^61 - 1', q: '2^89 - 1', e: '65537', fmt: 'text', text: 'RSA!', c: '' },
        { p: '1000003', q: '1000033', e: '65537', fmt: 'num', m: '123456789', c: '' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex;
        var key = M.rsaKeySteps(S, v.p, v.q, v.e), N = key.N, d = key.d, p = v.p, q = v.q;
        var m, c;
        if (v._action === 'enc') {
            var sm = S.step('The message as a number $m$');
            if (v.fmt === 'text') {
                if (!v.text) Calc.fail('Please enter a message to encrypt.', 'text');
                m = M.textStep(sm, v.text, 'm');
            } else {
                m = M.optInt(v.m, 'm');
                if (m === null) Calc.fail('Please enter a message m to encrypt.', 'm');
                sm.math('m = ' + T(m));
            }
            if (m < 0n) Calc.fail('The message must not be negative.', 'm');
            if (m >= N) Calc.fail('The message must be smaller than N = ' + N + ' (it is ' + m + '). Use larger primes or a shorter message.', v.fmt === 'text' ? 'text' : 'm');
            sm.check(true, '$0 \\le m < N$: the message fits in one block');
            c = M.powStep(S.step('Encrypt: $c \\equiv m^e \\pmod N$'), m, v.e, N, { name: 'c \\equiv ' + T(m) + '^{' + T(v.e) + '}' });
            S.result(['$c = ' + T(c) + '$'], { copy: String(c), label: 'Ciphertext' });
            S.note('Public key $(N, e) = (' + T(N) + ', ' + T(v.e) + ')$, private exponent $d = ' + T(d) + '$.');
        } else {
            c = M.optInt(v.c, 'c');
            if (c === null) Calc.fail('Please enter the ciphertext c to decrypt.', 'c');
            if (c < 0n || c >= N) Calc.fail('The ciphertext must be between 0 and N - 1 = ' + (N - 1n) + '.', 'c');
        }
        var m2 = M.powStep(S.step('Decrypt: $m \\equiv c^d \\pmod N$'), c, d, N, { name: 'm \\equiv ' + T(c) + '^{' + T(d) + '}' });

        /* the CRT speed-up (Garner's form, as in PKCS #1) */
        var dp = d % (p - 1n), dq = d % (q - 1n), sc = S.step('Decrypt faster with the Chinese remainder theorem');
        sc.p('Work modulo $p$ and $q$ separately, with exponents reduced by Fermat\'s little theorem, then recombine. Real implementations do this: it is about four times faster.');
        sc.lines([
            'd_p &= d \\bmod (p - 1) = ' + T(d) + ' \\bmod ' + T(p - 1n) + ' = ' + T(dp),
            'd_q &= d \\bmod (q - 1) = ' + T(d) + ' \\bmod ' + T(q - 1n) + ' = ' + T(dq),
            'c \\bmod p &= ' + T(c) + ' \\bmod ' + T(p) + ' = ' + T(nt.mod(c, p)) + ', \\quad c \\bmod q = ' + T(c) + ' \\bmod ' + T(q) + ' = ' + T(nt.mod(c, q))
        ]);
        var qinv = M.invStep(S.step('$q_{\\mathrm{inv}} \\equiv q^{-1} \\pmod p$'), q, p, 'q_{\\mathrm{inv}}');
        var mp = M.powStep(S.step('$m_p \\equiv c^{d_p} \\pmod p$'), c, dp, p, { name: 'm_p \\equiv ' + T(nt.mod(c, p)) + '^{' + T(dp) + '}' });
        var mq = M.powStep(S.step('$m_q \\equiv c^{d_q} \\pmod q$'), c, dq, q, { name: 'm_q \\equiv ' + T(nt.mod(c, q)) + '^{' + T(dq) + '}' });
        var h = nt.mod(qinv * (mp - mq), p), m3 = mq + h * q;
        S.step('Recombine (Garner\'s formula)').lines([
            'h &= q_{\\mathrm{inv}} \\cdot (m_p - m_q) \\bmod p = ' + T(qinv) + ' \\cdot ' + M.par(mp - mq) + ' \\bmod ' + T(p) + ' = ' + T(h),
            'm &= m_q + h \\cdot q = ' + T(mq) + ' + ' + T(h) + ' \\cdot ' + T(q) + ' = ' + T(m3)
        ]).check(m3 === m2, 'Same result as $c^d \\bmod N$');

        var text = null;
        if (v.fmt === 'text') {
            var bytes = M.intToBytes(m2);
            text = M.fromUtf8(bytes);
            var st = S.step('Back to text');
            st.p('Write $m$ in base 256 to get the bytes back' + (bytes.length ? ': $\\texttt{' + (M.hex(bytes) || '00') + '}$.' : '.'));
            if (text === null) st.p('These bytes are not valid UTF-8 text.');
            else st.p('As UTF-8 text: "' + Calc.esc(text) + '".');
        }
        if (v._action === 'enc') {
            S.step('Check').check(m2 === m, 'Decryption gives the message back: $' + T(m2) + ' = m$');
        } else if (text !== null) {
            S.result(['$m = ' + T(m2) + '$', 'Text: ' + Calc.esc(text)], { copy: text, label: 'Plaintext' });
        } else {
            S.result(['$m = ' + T(m2) + '$'], { copy: String(m2), label: 'Plaintext' });
        }
        S.note('Textbook RSA (no padding) is deterministic and malleable, so it is not secure as it is: real systems use RSA-OAEP for encryption, and primes of 1024 bits or more.');
    }
});
