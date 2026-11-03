/* Cipher Cat: the cat locked its diary with four little ciphers, one lock after the other, each against its own clock.
     1. Shift wheel (Caesar): turn the inner ring of a cipher wheel until the note reads right.
     2. Tail shuffle (columnar transposition): the note is written in rows, its columns shuffled; tap two columns to swap
        them until the rows read right.
     3. Paw combination (Vigenere): a combination lock with 3 or 4 wheels; each wheel shifts the letters of its colour.
        The key is a little cat word.
     4. Letter swap (substitution cryptogram): tap a hidden letter, then pick its letter on the cat's keyboard (or type
        it). Letter counts help (frequency analysis), and a known word (a crib) is given on easy and normal.
   The locks open by themselves once the note is right. After each lock a one-line fact about real ciphers.
   Hints (button or the ? key) cost 10 seconds of the clock. Score per lock: a base (100, 150, 200, 300) plus 2 points
   per second left. Easy: the clock only sets the bonus, it never ends the game. Normal and hard: a clock that runs out
   ends the run (the score of the opened locks stays). Hard: fewer gifts, more wheels and columns, no spaces in the
   shifted notes. No text inputs at all: an on-screen keyboard for touch, the real keyboard on desktop.
   Shell API: assets/js/games/arcade.js. */
(function () {
    'use strict';
    /* notes already shown, kept while the page is open so a restart does not repeat them soon */
    var USED = {};

    var SHORT = [
        'THE BOX IS MINE NOW', 'I SAT ON YOUR LAPTOP', 'NAP TIME IS ALL DAY', 'FEED ME AT SIX SHARP',
        'THE RED DOT GOT AWAY', 'I LOVE YOU A LITTLE', 'WARM SOCKS ARE A BED', 'THE FISH LOOKED AT ME',
        'BIRDS ARE TV FOR CATS', 'I KNOCKED IT OFF FOR FUN', 'THE SUNNY SPOT IS TAKEN', 'MY BOWL IS HALF EMPTY',
        'YARN IS MY BEST FRIEND', 'I HID YOUR HAIR TIE', 'THE DOG STARTED IT', 'PURRING IS MY SUPERPOWER',
        'I WILL SIT IN THIS BOX', 'WAKE UP IT IS BREAKFAST', 'TUNA IS A FOOD GROUP', 'MY TAIL HAS A MIND OF ITS OWN',
        'THE PLANT TASTED FUNNY', 'KEYBOARDS ARE WARM', 'I GUARD THE HOUSE AT NIGHT', 'RAIN IS NOT ALLOWED',
        'BRUSH ME BUT ONLY TWICE', 'ZOOMIES AT THREE AM', 'THE VACUUM IS MY ENEMY', 'I CAUGHT A MOTH TODAY',
        'YOUR CHAIR IS MY CHAIR', 'SECRET SNACKS IN THE DRAWER', 'THE WINDOW IS MY CINEMA', 'I PRETEND NOT TO HEAR YOU',
        'LOVE IS A FULL FOOD BOWL', 'MY WHISKERS KNOW THINGS', 'THE CURTAIN WAS ASKING FOR IT', 'I ONLY MEOW FOR YOU',
        'DO NOT CLOSE THAT DOOR', 'BOXES BEAT ALL TOYS', 'SLOW BLINK MEANS I LOVE YOU', 'THE BED IS WARMER WITH ME',
        'I ATE THE RIBBON', 'MORE TREATS PLEASE', 'THE MOUSE TOY IS GONE', 'YOUR SHOES SMELL GREAT'
    ];
    var LONG = [
        'MY HUMAN THINKS SHE OWNS THE HOUSE BUT THE CAT KNOWS BETTER',
        'EVERY MORNING I SING THE MEOW SONG UNTIL BREAKFAST APPEARS',
        'I HAVE HIDDEN A FISH UNDER THE SOFA FOR A RAINY DAY',
        'A GOOD NAP IN THE SUN IS WORTH MORE THAN ANY TOY',
        'THE MOUSE ON THE DESK DOES NOT SQUEAK AND I AM DISAPPOINTED',
        'IF IT FITS IN A BOX THEN I MUST SIT IN THE BOX',
        'I PURR LOUDLY SO YOU NEVER FORGET WHO IS IN CHARGE',
        'MY TAIL KNOWS WHERE IT WANTS TO GO EVEN WHEN I DO NOT',
        'ONE SOFT PAW ON YOUR FACE MEANS IT IS TIME TO GET UP',
        'THE CAT NEXT DOOR STARES AT ME THROUGH THE WINDOW ALL DAY',
        'WHEN YOU WORK AT HOME I HELP BY SITTING ON THE KEYBOARD',
        'I CAUGHT THE RED DOT ONCE AND I WILL CATCH IT AGAIN',
        'PLEASE DO NOT MOVE THE BOX BECAUSE I LIVE THERE NOW',
        'A FISH AND A NAP AND A WARM LAP MAKE A PERFECT DAY',
        'THE MEOW AT THREE IN THE MORNING IS VERY IMPORTANT NEWS',
        'I KNOCK THINGS OFF THE TABLE TO TEST GRAVITY FOR SCIENCE',
        'IF YOU OPEN A CAN I WILL APPEAR FROM ANYWHERE IN THE HOUSE',
        'THE BIRD OUTSIDE IS TEASING ME AND I DO NOT LIKE IT',
        'I SLEEP SIXTEEN HOURS A DAY BECAUSE BEING CUTE IS HARD WORK',
        'SECRET PLAN STEAL THE FISH WHILE THE HUMAN IS ON THE PHONE',
        'A CAT ALWAYS LANDS ON ITS FEET BUT NOT ALWAYS ON THE SOFA',
        'WHEN I PURR NEXT TO YOUR EAR IT MEANS I CHOSE YOU',
        'MY FAVOURITE TOY IS THE STRING FROM YOUR NEW JUMPER',
        'THE BEST SEAT IN THE HOUSE IS ALWAYS THE ONE YOU WANTED'
    ];
    var CRIBS = ['MEOW', 'PURR', 'FISH', 'MOUSE', 'CAT', 'BOX', 'NAP', 'TAIL', 'PAW', 'TOY', 'SOFA'];
    var KEYS = {
        3: ['PAW', 'MEW', 'FUR', 'NAP', 'TOM', 'KIT', 'NIP', 'BOX', 'RUG', 'SOX', 'ZZZ'],
        4: ['PURR', 'MEOW', 'TAIL', 'FISH', 'YARN', 'MICE', 'NOSE', 'CLAW', 'LICK', 'NOOK', 'TUNA']
    };
    var FACTS = {
        caesar: [
            'Julius Caesar is said to have shifted his letters by three. With only 25 possible shifts, you can simply try them all: that is called brute force.',
            'ROT13 is a shift of 13. Doing it twice gives the note back, which is why it was used online to hide spoilers.',
            'A cipher with few keys is weak however clever it looks. Modern ciphers have more keys than there are atoms on Earth.'
        ],
        shuffle: [
            'This was a transposition: every letter stays, only the order changes. The Spartans did it by winding a strip of leather around a stick.',
            'Shuffled columns were used for real in both World Wars, often twice in a row to make them much harder.',
            'Transpositions keep the letter counts of normal English, so codebreakers spot them quickly. Good ciphers mix both ideas: swap letters and move them around.'
        ],
        vigenere: [
            'This is the Vigenere cipher, called "the indecipherable cipher" for about 300 years, until Babbage and Kasiski broke it in the 1800s.',
            'Make the key as long as the note, truly random and use it only once: that is the one-time pad, proven unbreakable by Claude Shannon in 1949.',
            'Computers do the same thing with bits: each bit of the message is flipped or not by a key bit (XOR). That is the heart of a stream cipher.'
        ],
        subst: [
            'Counting letters (frequency analysis) was described by al-Kindi in the 9th century. In English E, T and A are the most common letters.',
            'A known word is called a crib. At Bletchley Park, cribs like the German word for weather helped to break Enigma.',
            'A letter swap cipher like this one cost Mary, Queen of Scots, her head in 1587: her secret letters were decoded.',
            'Edgar Allan Poe loved these puzzles: in "The Gold-Bug" (1843) a treasure map is cracked with letter counts.'
        ],
        final: [
            'Modern ciphers come with proofs: cracking one would mean solving a maths puzzle nobody can solve.',
            'Cryptographers prove ciphers secure: breaking one would solve a problem everyone believes is hard.',
            'The newest ciphers are post-quantum, built to resist even quantum computers. The cat approves.'
        ]
    };
    var LOCKS = [
        { id: 'caesar', name: 'Shift wheel', base: 100, t: { easy: 90, normal: 60, hard: 40 } },
        { id: 'shuffle', name: 'Tail shuffle', base: 150, t: { easy: 150, normal: 100, hard: 80 } },
        { id: 'vigenere', name: 'Paw combination', base: 200, t: { easy: 180, normal: 130, hard: 110 } },
        { id: 'subst', name: 'Letter swap', base: 300, t: { easy: 420, normal: 300, hard: 240 } }
    ];
    var HINT_COST = 10, PER_SEC = 2;
    var AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function rand(n) { return Math.floor(Math.random() * n); }
    function mod(a, n) { return ((a % n) + n) % n; }
    function code(ch) { return ch.charCodeAt(0) - 65; }
    function letter(n) { return AZ.charAt(mod(n, 26)); }
    function isLetter(ch) { return ch >= 'A' && ch <= 'Z'; }
    function pick(list, tag, ok) {
        var seen = USED[tag] || (USED[tag] = []);
        var free = [];
        list.forEach(function (x, i) { if ((!ok || ok(x)) && seen.indexOf(i) < 0) free.push(i); });
        if (!free.length) {
            seen.length = 0;
            list.forEach(function (x, i) { if (!ok || ok(x)) free.push(i); });
        }
        var i = free[rand(free.length)];
        seen.push(i);
        return list[i];
    }
    function shuffled(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }

    Arcade.register('cipher-cat', function (api) {
        var C = {
            ink: '#2b2340', paper: '#fff8ec', line: '#e6d8bf', orange: '#e8771c', teal: '#21867a', pink: '#d6336c',
            blue: '#3a66c4', green: '#3f8f3a', sun: '#ffe08a'
        };
        api.css(
            '.cc { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; background: #fbf3e4;' +
            '  color: #2b2340; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }' +
            '.cc-in { box-sizing: border-box; max-width: 760px; min-height: 100%; margin: 0 auto; padding: 14px 16px 84px;' +
            '  display: flex; flex-direction: column; gap: 12px; }' +
            '.cc button { font: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }' +
            '.cc button:focus-visible { outline: 3px solid #3a66c4; outline-offset: 2px; }' +
            '.cc-btn { min-height: 40px; padding: 6px 16px; border: 2px solid #2b2340; border-radius: 8px; background: #fff;' +
            '  box-shadow: 0 3px 0 #2b2340; font-weight: 800; }' +
            '.cc-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #2b2340; }' +
            '.cc-btn:disabled { opacity: .4; cursor: default; transform: none; box-shadow: 0 3px 0 #2b2340; }' +
            '.cc-go { background: #e8771c; color: #fff !important; }' +
            '.cc-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }' +
            '.cc-lock { flex: 1 1 auto; min-width: 0; font-weight: 800; font-size: 1.08rem; }' +
            '.cc-lock small { display: block; color: #8a7a66; font-size: .78rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }' +
            '.cc-clock { display: flex; align-items: center; gap: 6px; font: 800 1.25rem/1 ui-monospace, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }' +
            '.cc-clock svg { width: 22px; height: 22px; }' +
            '.cc-clock.low { color: #d6336c; }' +
            '.cc-clock.over { color: #8a7a66; }' +
            '.cc-hint { min-height: 36px; padding: 4px 12px; font-size: .9rem; }' +
            '.cc-hint small { font-weight: 700; color: #8a7a66; }' +
            '.cc-tip { margin: 0; line-height: 1.4; color: #4d4260; font-size: .98rem; }' +
            '.cc-tip b { color: #2b2340; }' +
            '.cc-board { display: flex; flex-direction: column; align-items: center; gap: 14px; }' +
            /* the note: a tile per letter, the reading on top, the hidden letter below */
            '.cc-msg { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 14px; padding: 12px 10px; width: 100%; box-sizing: border-box;' +
            '  background: #fff; border: 2px solid #e6d8bf; border-radius: 10px; }' +
            '.cc-word { display: flex; gap: 2px; }' +
            '.cc-t { display: flex; flex-direction: column; align-items: center; width: 24px; }' +
            '.cc-t b { display: block; width: 100%; height: 28px; line-height: 28px; text-align: center; border-bottom: 2px solid #2b2340;' +
            '  font: 800 1.2rem/28px ui-monospace, Menlo, Consolas, monospace; }' +
            '.cc-t i { font: 700 .8rem/1.5 ui-monospace, Menlo, Consolas, monospace; font-style: normal; color: #8a7a66; }' +
            '.cc-done .cc-t b { color: #3f8f3a; border-color: #3f8f3a; }' +
            '.cc-k0 b { color: #e8771c; } .cc-k1 b { color: #3a66c4; } .cc-k2 b { color: #21867a; } .cc-k3 b { color: #d6336c; }' +
            '.cc-k0 i { box-shadow: inset 0 -3px 0 #f6c08f; } .cc-k1 i { box-shadow: inset 0 -3px 0 #b4c6ee; }' +
            '.cc-k2 i { box-shadow: inset 0 -3px 0 #9fd6cd; } .cc-k3 i { box-shadow: inset 0 -3px 0 #f3b2c7; }' +
            /* shift wheel */
            '.cc-wheel { width: min(280px, 72vw); height: auto; touch-action: none; cursor: grab; }' +
            '.cc-wheel.drag { cursor: grabbing; }' +
            '.cc-ring { transition: transform .18s ease-out; }' +
            '.cc-wheel.drag .cc-ring { transition: none; }' +
            '.cc-row { display: flex; align-items: center; gap: 14px; }' +
            '.cc-turn { width: 52px; height: 48px; font-size: 1.3rem; padding: 0; }' +
            '.cc-shift { min-width: 82px; text-align: center; font-weight: 800; }' +
            /* tail shuffle */
            '.cc-cols { display: flex; gap: 6px; justify-content: center; }' +
            '.cc-col { display: flex; flex-direction: column; align-items: center; padding: 4px 0 6px; width: 54px; border: 2px solid #e6d8bf;' +
            '  border-radius: 10px; background: #fff; box-shadow: 0 3px 0 #e6d8bf; }' +
            '.cc-col span { display: block; height: 40px; font: 800 1.5rem/40px ui-monospace, Menlo, Consolas, monospace; }' +
            '.cc-col span.sp { color: #d9c9ae; }' +
            '.cc-col.cur { border-color: #3a66c4; }' +
            '.cc-col.sel { border-color: #e8771c; background: #fff1dc; box-shadow: 0 3px 0 #e8771c; transform: translateY(-4px); }' +
            '.cc-col.fixed { background: #eef7ec; border-color: #9cc996; box-shadow: 0 3px 0 #9cc996; cursor: default; }' +
            '.cc-col.pop { animation: cc-pop .25s ease-out; }' +
            '.cc-col svg { width: 16px; height: 16px; margin-top: 2px; }' +
            '.cc-read { margin: 0; font: 800 1.05rem/1.4 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .06em; text-align: center; word-break: break-word; }' +
            '.cc-read span { color: #b8a78c; }' +
            '.cc-done.cc-cols .cc-col { border-color: #3f8f3a; box-shadow: 0 3px 0 #3f8f3a; }' +
            /* paw combination */
            '.cc-dials { display: flex; gap: 10px; justify-content: center; }' +
            '.cc-dial { display: flex; flex-direction: column; align-items: center; width: 64px; border: 2px solid #2b2340; border-radius: 12px; background: #fff;' +
            '  overflow: hidden; touch-action: none; }' +
            '.cc-dial.cur { outline: 3px solid #3a66c4; outline-offset: 2px; }' +
            '.cc-dial button { width: 100%; height: 36px; border: 0; background: none; font-size: 1rem; padding: 0; }' +
            '.cc-dial button:active { background: #fbf3e4; }' +
            '.cc-win { width: 100%; text-align: center; border-top: 2px solid #2b2340; border-bottom: 2px solid #2b2340; padding: 2px 0; cursor: ns-resize; }' +
            '.cc-win span { display: block; font: 800 .9rem/20px ui-monospace, Menlo, Consolas, monospace; color: #b8a78c; }' +
            '.cc-win b { display: block; font: 800 1.8rem/40px ui-monospace, Menlo, Consolas, monospace; }' +
            '.cc-dial.fixed .cc-win { background: #eef7ec; cursor: default; }' +
            '.cc-dial.fixed button { visibility: hidden; }' +
            '.cc-d0 .cc-win { background: #fde3cc; } .cc-d1 .cc-win { background: #dde6f8; } .cc-d2 .cc-win { background: #d6efea; } .cc-d3 .cc-win { background: #fadbe5; }' +
            '.cc-d0 .cc-win b { color: #b45309; } .cc-d1 .cc-win b { color: #2d4f9a; } .cc-d2 .cc-win b { color: #17675e; } .cc-d3 .cc-win b { color: #a3264f; }' +
            '.cc-done .cc-dial .cc-win { background: #eef7ec; }' +
            '.cc-dial.nudge .cc-win b { animation: cc-pop .2s ease-out; }' +
            /* letter swap */
            '.cc-sub .cc-t { cursor: pointer; border-radius: 5px; }' +
            '.cc-sub .cc-t b { color: #2b2340; }' +
            '.cc-sub .cc-t.same { background: #fff1dc; }' +
            '.cc-sub .cc-t.sel { background: #ffe08a; }' +
            '.cc-sub .cc-t.fixed b { color: #21867a; }' +
            '.cc-sub .cc-t.bad b { color: #d6336c; }' +
            '.cc-sub.cc-done .cc-t b { color: #3f8f3a; }' +
            '.cc-freq { display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: center; justify-content: center; font-size: .86rem; color: #6b5e4c; }' +
            '.cc-freq button { min-width: 38px; height: 32px; padding: 0 6px; border: 1.5px solid #e6d8bf; border-radius: 6px; background: #fff;' +
            '  font: 700 .9rem ui-monospace, Menlo, Consolas, monospace; }' +
            '.cc-freq button.sel { background: #ffe08a; border-color: #e8b730; }' +
            '.cc-freq button.ok { color: #b8a78c; }' +
            '.cc-crib { margin: 0; text-align: center; font-size: .92rem; color: #4d4260; }' +
            '.cc-crib b { font-family: ui-monospace, Menlo, Consolas, monospace; letter-spacing: .08em; }' +
            '.cc-kb { display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 520px; }' +
            '.cc-kr { display: flex; gap: 5px; justify-content: center; }' +
            '.cc-kb button { flex: 1 1 0; max-width: 46px; height: 44px; padding: 0; border: 1.5px solid #cdbb9c; border-radius: 7px; background: #fff;' +
            '  box-shadow: 0 2px 0 #cdbb9c; font: 800 1.05rem ui-monospace, Menlo, Consolas, monospace; }' +
            '.cc-kb button:active { transform: translateY(2px); box-shadow: none; }' +
            '.cc-kb button.used { background: #f1e8d8; color: #a8987f; }' +
            '.cc-kb button.wide { max-width: 72px; flex-grow: 1.6; font-size: .9rem; }' +
            /* the cards between locks */
            '.cc-card { width: 100%; max-width: 520px; box-sizing: border-box; margin: auto; padding: 18px 18px 20px; background: #fff;' +
            '  border: 2px solid #2b2340; border-radius: 14px; box-shadow: 0 5px 0 #2b2340; text-align: center; animation: cc-up .3s ease-out; }' +
            '.cc-card h2 { margin: 4px 0 8px; font-size: 1.45rem; }' +
            '.cc-card p { margin: 8px 0; line-height: 1.45; }' +
            '.cc-card .cc-note { font: 800 1.05rem/1.45 ui-monospace, Menlo, Consolas, monospace; color: #21867a; }' +
            '.cc-card .cc-pts { font-weight: 800; color: #e8771c; }' +
            '.cc-card .cc-fact { padding: 10px 12px; background: #fbf3e4; border-radius: 8px; text-align: left; font-size: .95rem; }' +
            '.cc-card .cc-fact b { display: block; margin-bottom: 2px; color: #3a66c4; font-size: .8rem; letter-spacing: .05em; text-transform: uppercase; }' +
            '.cc-card ol { margin: 10px auto; padding: 0; list-style: none; display: inline-block; text-align: left; }' +
            '.cc-card li { margin: 5px 0; display: flex; align-items: center; gap: 8px; }' +
            '.cc-card li svg { width: 22px; height: 22px; flex: none; }' +
            '.cc-face { width: 74px; height: 64px; }' +
            '.cc-small { font-size: .88rem; color: #6b5e4c; }' +
            '.cc-still *, .cc-still .cc-ring { animation: none !important; transition: none !important; }' +
            '@keyframes cc-pop { 0% { transform: scale(1); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } }' +
            '@keyframes cc-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }' +
            '@media (max-width: 600px) {' +
            '  .cc-in { padding: 10px 12px 72px; gap: 10px; }' +
            '  .cc-t { width: 21px; } .cc-t b { font-size: 1.08rem; }' +
            '  .cc-msg { gap: 6px 10px; padding: 10px 6px; }' +
            '  .cc-col { width: 42px; } .cc-col span { height: 32px; font-size: 1.25rem; line-height: 32px; }' +
            '  .cc-dial { width: 58px; }' +
            '  .cc-kb button { height: 46px; }' +
            '  .cc-kr { gap: 4px; }' +
            '}' +
            '@media (pointer: coarse) { .cc button { font-size: 16px; } .cc-kb button, .cc-col span { font-size: 18px; } .cc-win b { font-size: 1.8rem; } }');

        var level = api.level();
        var easy = level === 'easy', hard = level === 'hard';
        var CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/>' +
            '<path d="M12 8.5V13l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M9.5 2.5h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
        var PADLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#2b2340" stroke-width="2.2"/>' +
            '<rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill="#e8771c" stroke="#2b2340" stroke-width="2"/><circle cx="12" cy="15.5" r="1.7" fill="#2b2340"/></svg>';
        var PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#3f8f3a" stroke-width="2.4"/>' +
            '<rect x="5" y="11" width="14" height="10" rx="2.5" fill="#3f8f3a"/></svg>';
        var FACE = '<svg class="cc-face" viewBox="0 0 80 68" aria-hidden="true"><path d="M12 30 L14 4 L32 18 Z M68 30 L66 4 L48 18 Z" fill="#e8771c" stroke="#2b2340" stroke-width="2.5" stroke-linejoin="round"/>' +
            '<path d="M17 12 L19 22 L26 17 Z M63 12 L61 22 L54 17 Z" fill="#ffb3c4"/>' +
            '<ellipse cx="40" cy="40" rx="30" ry="25" fill="#f39a3c" stroke="#2b2340" stroke-width="2.5"/>' +
            '<path d="M29 36 q4 -5 8 0 M43 36 q4 -5 8 0" fill="none" stroke="#2b2340" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M37 45 h6 l-3 3.5 z" fill="#d6336c"/><path d="M40 48.5 q-3 4 -7 2 M40 48.5 q3 4 7 2" fill="none" stroke="#2b2340" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M8 42 h14 M9 48 l13 -3 M72 42 h-14 M71 48 l-13 -3" stroke="#2b2340" stroke-width="1.6" stroke-linecap="round"/>' +
            '<rect x="30" y="56" width="20" height="12" rx="2" fill="#ffe08a" stroke="#2b2340" stroke-width="2"/><path d="M34 56 v-4 a6 6 0 0 1 12 0 v4" fill="none" stroke="#2b2340" stroke-width="2"/></svg>';

        var wrap = document.createElement('div');
        wrap.className = 'cc' + (api.reducedMotion ? ' cc-still' : '');
        var inner = document.createElement('div');
        inner.className = 'cc-in';
        wrap.appendChild(inner);
        api.el.appendChild(wrap);

        function el(tag, cls, html) {
            var e = document.createElement(tag);
            if (cls) e.className = cls;
            if (html != null) e.innerHTML = html;
            return e;
        }
        function button(cls, html, fn) {
            var b = el('button', 'cc-btn' + (cls ? ' ' + cls : ''), html);
            b.type = 'button';
            b.addEventListener('click', fn);
            return b;
        }
        function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

        /* run state */
        var lockNo = -1, score = 0, timeLeft = 0, running = false, over = false, overtime = false, spoke10 = false;
        var puzzle = null, phase = 'intro', nextFn = null;
        var head, lockEl, clockEl, hintBtn, tipEl, board;
        api.score(0);

        function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60); }
        function showClock() {
            clockEl.innerHTML = CLOCK + '<span>' + fmt(timeLeft) + '</span>';
            clockEl.className = 'cc-clock' + (overtime ? ' over' : timeLeft <= 10 ? ' low' : '');
            clockEl.title = overtime ? 'No time bonus left, take your time' : 'Time left for this lock';
            if (hintBtn) hintBtn.disabled = !running || !puzzle || !puzzle.canHint() || (!easy && timeLeft <= HINT_COST + 1);
        }
        api.loop(function (dt) {
            if (!running || over) return;
            var before = Math.ceil(timeLeft);
            timeLeft -= dt;
            if (timeLeft <= 0) {
                timeLeft = 0;
                if (easy) {
                    if (!overtime) { overtime = true; api.say('No rush on easy. Take your time!', 2600); api.cat('think'); }
                } else { showClock(); fail(); return; }
            }
            if (!spoke10 && timeLeft <= 10 && !overtime) { spoke10 = true; api.say('Ten seconds!', 1500); api.cat('wow'); }
            if (Math.ceil(timeLeft) !== before) showClock();
        });

        function intro() {
            phase = 'intro';
            inner.innerHTML = '';
            var card = el('div', 'cc-card');
            card.innerHTML = FACE + '<h2>Cipher Cat</h2>' +
                '<p>The cat locked its diary with four secret codes. Crack each lock before its clock runs out.</p>' +
                '<ol>' + LOCKS.map(function (L, i) { return '<li>' + PADLOCK + '<span><b>' + (i + 1) + '. ' + L.name + '</b> (' + fmt(L.t[level]) + ')</span></li>'; }).join('') + '</ol>' +
                '<p class="cc-small">' + (easy ? 'Easy: the clock only sets your time bonus, it never ends the game.' :
                    'When a clock runs out, the cat changes the code and the run ends.') +
                ' Hints cost ' + HINT_COST + ' seconds. No codebreaking experience needed!</p>';
            var go = button('cc-go', 'Start cracking', function () { startLock(0); });
            card.appendChild(go);
            inner.appendChild(card);
            nextFn = function () { startLock(0); };
            if (!api.touch) go.focus();
        }

        function startLock(i) {
            lockNo = i;
            phase = 'play';
            var L = LOCKS[i];
            inner.innerHTML = '';
            head = el('div', 'cc-head');
            lockEl = el('div', 'cc-lock', '<small>Lock ' + (i + 1) + ' of ' + LOCKS.length + '</small>' + L.name);
            clockEl = el('div', 'cc-clock');
            hintBtn = button('cc-hint', 'Hint <small>-' + HINT_COST + ' s</small>', hint);
            hintBtn.title = 'Get a hint (key ?), costs ' + HINT_COST + ' seconds';
            head.appendChild(lockEl); head.appendChild(clockEl); head.appendChild(hintBtn);
            tipEl = el('p', 'cc-tip');
            board = el('div', 'cc-board');
            inner.appendChild(head); inner.appendChild(tipEl); inner.appendChild(board);
            timeLeft = L.t[level]; overtime = false; spoke10 = false;
            puzzle = BUILD[L.id]();
            tipEl.innerHTML = puzzle.tip;
            running = true;
            showClock();
            api.cat('idle');
            wrap.scrollTop = 0;
        }
        function hint() {
            if (!running || !puzzle || !puzzle.canHint()) return;
            if (!easy && timeLeft <= HINT_COST + 1) { api.say('Not enough time left for a hint!'); return; }
            timeLeft = Math.max(0, timeLeft - HINT_COST);
            api.sfx('pop');
            api.cat('think');
            puzzle.hint();
            showClock();
        }
        function solved() {
            if (!running) return;
            running = false;
            var L = LOCKS[lockNo], bonus = overtime ? 0 : PER_SEC * Math.ceil(timeLeft);
            score += L.base + bonus;
            api.score(score);
            api.sfx('point');
            api.cat('happy');
            showClock();
            hintBtn.disabled = true;
            var plain = puzzle.plain;
            api.timeout(function () {
                if (over) return;
                if (lockNo === LOCKS.length - 1) return finish(plain);
                phase = 'card';
                inner.innerHTML = '';
                var card = el('div', 'cc-card');
                card.innerHTML = '<h2>Lock ' + (lockNo + 1) + ' open!</h2>' +
                    '<p class="cc-note">"' + esc(plain) + '"</p>' +
                    '<p class="cc-pts">+' + L.base + ' for the lock' + (bonus ? ', +' + bonus + ' time bonus' : '') + '</p>' +
                    '<p class="cc-fact"><b>Did you know?</b>' + esc(pick(FACTS[L.id], 'f-' + L.id)) + '</p>';
                var n = lockNo + 1;
                var go = button('cc-go', 'Next lock: ' + LOCKS[n].name, function () { startLock(n); });
                card.appendChild(go);
                inner.appendChild(card);
                nextFn = function () { startLock(n); };
                wrap.scrollTop = 0;
                if (!api.touch) go.focus();
            }, 1100);
        }
        function finish(plain) {
            over = true;
            phase = 'over';
            api.end({ score: score, win: true, text: 'All four locks open!\n"' + plain + '"\nScore ' + score + '\n\n' + pick(FACTS.final, 'f-final') });
        }
        function fail() {
            if (over) return;
            over = true; running = false; phase = 'over';
            if (puzzle && puzzle.reveal) puzzle.reveal();
            api.end({ score: score, win: false, text: 'Time is up on lock ' + (lockNo + 1) + ', the cat changed the code.\n' +
                'It said: "' + puzzle.plain + '"\n' + lockNo + (lockNo === 1 ? ' lock' : ' locks') + ' opened, score ' + score });
        }

        /* the note as tiles, grouped in words (or in fives without spaces); colour(i) gives a class per letter */
        function noteTiles(text, fives, colour) {
            var box = el('div', 'cc-msg'), tiles = [], word = null, li = 0;
            for (var i = 0; i < text.length; i++) {
                var ch = text.charAt(i);
                if (ch === ' ') { if (!fives) word = null; continue; }
                if (!word || (fives && li % 5 === 0)) { word = el('span', 'cc-word'); box.appendChild(word); }
                var t = el('span', 'cc-t' + (colour ? ' ' + colour(li) : ''), '<b></b><i>' + ch + '</i>');
                word.appendChild(t);
                tiles.push({ el: t, top: t.firstChild, ch: ch, li: li });
                li++;
            }
            return { el: box, tiles: tiles };
        }

        var BUILD = {};

        /* 1. shift wheel */
        BUILD.caesar = function () {
            var plain = pick(SHORT, 'note'), key = 3 + rand(21), pos = 0;
            var cipher = plain.replace(/[A-Z]/g, function (c) { return letter(code(c) + key); });
            var note = noteTiles(cipher, hard);
            board.appendChild(note.el);
            var STEP = 360 / 26, svg = '<svg class="cc-wheel" viewBox="-130 -130 260 260" role="img" aria-label="Cipher wheel">' +
                '<circle r="126" fill="#fff" stroke="' + C.ink + '" stroke-width="3"/>' +
                '<circle r="92" fill="#ffe8c9" stroke="' + C.ink + '" stroke-width="2.5"/>' +
                '<circle r="58" fill="#fff8ec" stroke="' + C.ink + '" stroke-width="2"/>' +
                '<path d="M-11 -129 h22 v76 h-22 z" fill="none" stroke="' + C.pink + '" stroke-width="3" rx="4"/>' +
                '<path d="M-8 -134 h16 l-8 9 z" fill="' + C.pink + '"/>';
            for (var i = 0; i < 26; i++) {
                var a = i * STEP;
                svg += '<text transform="rotate(' + a + ') translate(0 -101)" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="800" font-size="17" fill="' + C.ink + '">' + AZ.charAt(i) + '</text>';
            }
            svg += '<g class="cc-ring">';
            for (i = 0; i < 26; i++) {
                a = i * STEP;
                svg += '<text transform="rotate(' + a + ') translate(0 -74)" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="800" font-size="16" fill="' + C.orange + '">' + AZ.charAt(i) + '</text>';
            }
            svg += '</g><text y="-8" text-anchor="middle" font-size="12" font-weight="700" fill="#8a7a66">hidden &#8594; real</text>' +
                '<text class="cc-mid2" y="18" text-anchor="middle" font-size="22" font-weight="800" fill="' + C.ink + '"></text></svg>';
            var holder = el('div', null, svg);
            var wheel = holder.firstChild, ring = wheel.querySelector('.cc-ring'), mid = wheel.querySelector('.cc-mid2');
            board.appendChild(wheel);
            var row = el('div', 'cc-row');
            var left = button('cc-turn', '&#9664;', function () { turn(-1); });
            var shiftEl = el('div', 'cc-shift');
            var right = button('cc-turn', '&#9654;', function () { turn(1); });
            left.setAttribute('aria-label', 'Turn back'); right.setAttribute('aria-label', 'Turn on');
            row.appendChild(left); row.appendChild(shiftEl); row.appendChild(right);
            board.appendChild(row);
            var done = false, rot = 0;
            function show(fromDrag) {
                var s = mod(pos, 26);
                note.tiles.forEach(function (t) { t.top.textContent = letter(code(t.ch) - s); });
                if (!fromDrag) { rot = -pos * STEP; ring.style.transform = 'rotate(' + rot + 'deg)'; }
                shiftEl.textContent = 'shift ' + s;
                mid.textContent = AZ.charAt(s) + ' \u2192 A';
                if (s === key && !done) { done = true; note.el.classList.add('cc-done'); solved(); }
            }
            function turn(d) { if (done || !running) return; pos += d; api.sfx('move'); show(); }
            /* drag the inner ring round */
            var drag = null;
            function angle(e) {
                var r = wheel.getBoundingClientRect();
                return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
            }
            wheel.addEventListener('pointerdown', function (e) {
                if (done || !running) return;
                drag = { a: angle(e), total: 0, pos0: pos, rot0: -pos * STEP };
                wheel.classList.add('drag');
                try { wheel.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
                e.preventDefault();
            });
            wheel.addEventListener('pointermove', function (e) {
                if (!drag) return;
                var a = angle(e), d = a - drag.a;
                if (d > 180) d -= 360; else if (d < -180) d += 360;
                drag.a = a; drag.total += d;
                ring.style.transform = 'rotate(' + (drag.rot0 + drag.total) + 'deg)';
                var p = drag.pos0 - Math.round(drag.total / STEP);
                if (p !== pos) { pos = p; api.sfx('move'); show(true); }
            });
            function up() { if (!drag) return; drag = null; wheel.classList.remove('drag'); show(); }
            wheel.addEventListener('pointerup', up);
            wheel.addEventListener('pointercancel', up);
            show();
            var hinted = false;
            return {
                plain: plain,
                tip: 'Every letter was moved the same number of steps along the alphabet. <b>Turn the wheel</b> (drag it, or use the arrows) until the note makes sense.',
                canHint: function () { return !hinted && !done; },
                hint: function () {
                    hinted = true;
                    api.say('The note starts with ' + plain.charAt(0) + '. Turn until the first letter is ' + plain.charAt(0) + '!', 3600);
                },
                key: function (e) {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { turn(-1); return true; }
                    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { turn(1); return true; }
                    return false;
                },
                reveal: function () { pos = key; done = true; show(); }
            };
        };

        /* 2. tail shuffle: columns of a grid in a shuffled order */
        BUILD.shuffle = function () {
            var K = easy ? 4 : hard ? 6 : 5;
            var plain = pick(SHORT, 'note', function (m) { return m.length <= 30 && m.length >= 16; });
            var text = plain;
            while (text.length % K) text += ' ';
            var rows = text.length / K, order = [], fixed = [], i;
            for (i = 0; i < K; i++) { order.push(i); fixed.push(false); }
            function wrongCount() { var n = 0; for (var j = 0; j < K; j++) if (order[j] !== j) n++; return n; }
            if (easy) fixed[0] = true;
            do {
                var rest = shuffled(order.slice(easy ? 1 : 0));
                order = easy ? [0].concat(rest) : rest;
            } while (wrongCount() < Math.min(K - (easy ? 1 : 0), 3) || reads() === text);
            var cols = el('div', 'cc-cols'), read = el('p', 'cc-read');
            board.appendChild(cols); board.appendChild(read);
            var colEls = [], sel = -1, cur = 0, done = false;
            function reads() { var s = ''; for (var r = 0; r < rows; r++) for (var c = 0; c < K; c++) s += text.charAt(r * K + order[c]); return s; }
            for (i = 0; i < K; i++) (function (c) {
                var b = el('button', 'cc-col');
                b.type = 'button';
                for (var r = 0; r < rows; r++) {
                    var ch = text.charAt(r * K + c);
                    b.appendChild(el('span', ch === ' ' ? 'sp' : '', ch === ' ' ? '&middot;' : ch));
                }
                b.addEventListener('click', function () { tap(order.indexOf(c)); });
                colEls[c] = b;
            })(i);
            function render(popped) {
                order.forEach(function (c, p) {
                    var b = colEls[c];
                    cols.appendChild(b);
                    var isFixed = fixed[c];
                    b.className = 'cc-col' + (isFixed ? ' fixed' : '') + (p === sel ? ' sel' : '') + (p === cur && !api.touch ? ' cur' : '') +
                        (popped && popped.indexOf(p) >= 0 ? ' pop' : '');
                    var lockIcon = b.querySelector('svg');
                    if (isFixed && !lockIcon) b.insertAdjacentHTML('beforeend', PIN);
                    b.setAttribute('aria-label', 'Column ' + (p + 1) + (isFixed ? ', in place' : '') + (p === sel ? ', picked' : ''));
                });
                var s = reads(), out = '';
                for (var j = 0; j < s.length; j++) out += s.charAt(j) === ' ' ? '<span>&middot;</span>' : s.charAt(j);
                read.innerHTML = out.replace(/(<span>&middot;<\/span>)+$/, '');
                if (s === text && !done) { done = true; sel = -1; cols.classList.add('cc-done'); solved(); }
            }
            function tap(p) {
                if (done || !running || p < 0 || fixed[order[p]]) return;
                cur = p;
                if (sel < 0) { sel = p; api.sfx('tap'); render(); return; }
                if (sel === p) { sel = -1; render(); return; }
                var a = sel, t = order[a]; order[a] = order[p]; order[p] = t;
                sel = -1;
                api.sfx('move');
                render([a, p]);
            }
            render();
            return {
                plain: plain,
                tip: 'The cat wrote the note in rows and then shuffled the columns. <b>Tap two columns to swap them</b> until the rows read right. The dots are spaces.',
                canHint: function () { return !done && wrongCount() > 0; },
                hint: function () {
                    for (var p = 0; p < K; p++) if (order[p] !== p) {
                        var q = order.indexOf(p); order[q] = order[p]; order[p] = p; fixed[p] = true; sel = -1;
                        render([p, q]);
                        api.say('Column ' + (p + 1) + ' is in place now.');
                        return;
                    }
                },
                key: function (e) {
                    var k = e.key;
                    if (k === 'ArrowLeft') { cur = mod(cur - 1, K); render(); return true; }
                    if (k === 'ArrowRight') { cur = mod(cur + 1, K); render(); return true; }
                    if (k === ' ' || k === 'Enter') { tap(cur); return true; }
                    if (/^[1-9]$/.test(k) && +k <= K) { tap(+k - 1); return true; }
                    return false;
                },
                reveal: function () { for (var j = 0; j < K; j++) order[j] = j; done = true; render(); }
            };
        };

        /* 3. paw combination (Vigenere): wheel j shifts letters j, j+n, j+2n, ... */
        BUILD.vigenere = function () {
            var n = hard ? 4 : 3;
            var plain = pick(SHORT, 'note', function (m) { return m.replace(/ /g, '').length >= 14; });
            var word = pick(KEYS[n], 'key' + n), key = word.split('').map(code);
            var li = 0;
            var cipher = plain.replace(/[A-Z]/g, function (c) { return letter(code(c) + key[li++ % n]); });
            var note = noteTiles(cipher, hard, function (j) { return 'cc-k' + (j % n); });
            board.appendChild(note.el);
            var dialsEl = el('div', 'cc-dials'), dial = [], fixed = [], cur = 0, done = false, j;
            for (j = 0; j < n; j++) { var v; do { v = rand(26); } while (v === key[j]); dial.push(v); fixed.push(false); }
            if (easy) { dial[0] = key[0]; fixed[0] = true; cur = 1; }
            var dEls = [];
            for (j = 0; j < n; j++) (function (j) {
                var d = el('div', 'cc-dial cc-d' + j);
                var upB = el('button', null, '&#9650;'), dnB = el('button', null, '&#9660;');
                upB.type = dnB.type = 'button';
                upB.setAttribute('aria-label', 'Wheel ' + (j + 1) + ' back'); dnB.setAttribute('aria-label', 'Wheel ' + (j + 1) + ' on');
                var w = el('div', 'cc-win', '<span></span><b></b><span></span>');
                d.appendChild(upB); d.appendChild(w); d.appendChild(dnB);
                upB.addEventListener('click', function () { cur = j; spin(j, -1); });
                dnB.addEventListener('click', function () { cur = j; spin(j, 1); });
                /* drag the window up or down to roll the wheel */
                var y0 = null, moved = 0;
                w.addEventListener('pointerdown', function (e) {
                    if (fixed[j] || done) return;
                    y0 = e.clientY; moved = 0; cur = j; show();
                    try { w.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
                    e.preventDefault();
                });
                w.addEventListener('pointermove', function (e) {
                    if (y0 === null) return;
                    var steps = Math.trunc((e.clientY - y0) / 26);
                    if (steps !== moved) { spin(j, -(steps - moved)); moved = steps; }
                });
                function stop() { y0 = null; }
                w.addEventListener('pointerup', stop); w.addEventListener('pointercancel', stop);
                dialsEl.appendChild(d);
                dEls.push(d);
            })(j);
            board.appendChild(dialsEl);
            board.appendChild(el('p', 'cc-crib', 'The key is a ' + n + '-letter cat word.'));
            function show(nudged) {
                note.tiles.forEach(function (t) { t.top.textContent = letter(code(t.ch) - dial[t.li % n]); });
                var right = 0;
                dEls.forEach(function (d, j) {
                    var sp = d.querySelectorAll('span');
                    sp[0].textContent = letter(dial[j] - 1); sp[1].textContent = letter(dial[j] + 1);
                    d.querySelector('b').textContent = letter(dial[j]);
                    d.className = 'cc-dial cc-d' + j + (fixed[j] ? ' fixed' : '') + (j === cur && !api.touch && !done ? ' cur' : '') + (nudged === j ? ' nudge' : '');
                    if (dial[j] === key[j]) right++;
                });
                if (right === n && !done) { done = true; note.el.classList.add('cc-done'); dialsEl.classList.add('cc-done'); solved(); }
            }
            function spin(j, d) {
                if (done || !running || fixed[j]) return;
                dial[j] = mod(dial[j] + d, 26);
                api.sfx('move');
                show(j);
            }
            show();
            function nextFree(from, d) { for (var s = 1; s <= n; s++) { var k = mod(from + d * s, n); if (!fixed[k]) return k; } return from; }
            return {
                plain: plain,
                tip: 'A combination lock: <b>each wheel shifts the letters of its own colour</b>. Roll a wheel (arrows, drag, or type a letter) until its letters fit, then the next one.',
                canHint: function () { return !done && fixed.indexOf(false) >= 0; },
                hint: function () {
                    var j = fixed[cur] ? nextFree(cur, 1) : cur;
                    if (dial[j] === key[j]) for (var k = 0; k < n; k++) if (!fixed[k] && dial[k] !== key[k]) { j = k; break; }
                    dial[j] = key[j]; fixed[j] = true; cur = nextFree(j, 1);
                    api.say('Wheel ' + (j + 1) + ' is set.');
                    show(j);
                },
                key: function (e) {
                    var k = e.key;
                    if (k === 'ArrowLeft') { cur = nextFree(cur, -1); show(); return true; }
                    if (k === 'ArrowRight') { cur = nextFree(cur, 1); show(); return true; }
                    if (k === 'ArrowUp') { spin(cur, -1); return true; }
                    if (k === 'ArrowDown') { spin(cur, 1); return true; }
                    if (/^[a-zA-Z]$/.test(k) && !fixed[cur]) {
                        dial[cur] = code(k.toUpperCase()); api.sfx('tap');
                        var j = cur; cur = nextFree(cur, 1); show(j);
                        return true;
                    }
                    return false;
                },
                reveal: function () { dial = key.slice(); done = true; show(); }
            };
        };

        /* 4. letter swap: a substitution cryptogram */
        BUILD.subst = function () {
            var plain = pick(LONG, 'long');
            var perm;
            do { perm = shuffled(AZ.split('')); } while (perm.some(function (c, i) { return c === AZ.charAt(i); }));   /* no letter stays itself */
            var enc = {}, dec = {};
            AZ.split('').forEach(function (p, i) { enc[p] = perm[i]; dec[perm[i]] = p; });
            var cipher = plain.replace(/[A-Z]/g, function (c) { return enc[c]; });
            var words = plain.split(' ');
            var crib = null;
            CRIBS.some(function (w) { if (words.indexOf(w) >= 0) { crib = w; return true; } return false; });
            if (!crib) crib = words.slice().sort(function (a, b) { return b.length - a.length; })[0];
            var guess = {}, fixed = {}, count = {}, order = [];
            cipher.split('').forEach(function (c) { if (isLetter(c)) { if (!count[c]) { count[c] = 0; order.push(c); } count[c]++; } });
            function give(p) { var c = enc[p]; if (count[c]) { guess[c] = p; fixed[c] = true; } }
            if (easy) {
                crib.split('').forEach(give);
                var common = order.filter(function (c) { return !fixed[c]; }).sort(function (a, b) { return count[b] - count[a]; });
                if (common.length) give(dec[common[0]]);
            }
            var cribEl = el('p', 'cc-crib');
            if (!hard) cribEl.innerHTML = easy ? 'The word <b>' + crib + '</b> is filled in for you.' : 'Somewhere in the note is the word <b>' + crib + '</b>.';
            else cribEl.innerHTML = 'No gifts on hard. A hint fills in a letter.';
            var note = noteTiles(cipher, false);
            note.el.classList.add('cc-sub');
            board.appendChild(note.el);
            board.appendChild(cribEl);
            var freq = el('div', 'cc-freq');
            board.appendChild(freq);
            var kb = el('div', 'cc-kb'), kbBtns = {};
            ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].forEach(function (r, ri) {
                var row = el('div', 'cc-kr');
                r.split('').forEach(function (ch) {
                    var b = el('button', null, ch);
                    b.type = 'button';
                    b.addEventListener('click', function () { put(ch); });
                    row.appendChild(b);
                    kbBtns[ch] = b;
                });
                if (ri === 2) {
                    var del = el('button', 'wide', 'Erase');
                    del.type = 'button';
                    del.setAttribute('aria-label', 'Erase this letter');
                    del.addEventListener('click', function () { put(''); });
                    row.appendChild(del);
                }
                kb.appendChild(row);
            });
            board.appendChild(kb);
            var sel = null, done = false, showBad = false;
            note.tiles.forEach(function (t) {
                t.el.addEventListener('click', function () { if (!done && running) { select(t.ch); api.sfx('tap'); } });
            });
            function firstOpen(from) {
                var i0 = from ? order.indexOf(from) : -1;
                for (var s = 1; s <= order.length; s++) { var c = order[(i0 + s) % order.length]; if (!fixed[c] && !guess[c]) return c; }
                return null;
            }
            function select(c) { if (fixed[c]) return; sel = c; showBad = false; render(); }
            function put(p) {
                if (done || !running) return;
                if (!sel) { api.say('Tap a letter in the note first.'); return; }
                if (p) {
                    for (var c in guess) if (guess[c] === p && c !== sel) {
                        if (fixed[c]) { api.say(p + ' is already solved.'); return; }
                        delete guess[c];
                    }
                    guess[sel] = p;
                    api.sfx('tap');
                    var nx = firstOpen(sel);
                    if (nx) sel = nx;
                } else { delete guess[sel]; api.sfx('move'); }
                showBad = false;
                render();
                check();
            }
            function check() {
                var all = order.every(function (c) { return guess[c]; });
                if (!all) return;
                var right = order.every(function (c) { return guess[c] === dec[c]; });
                if (right) {
                    done = true; sel = null; note.el.classList.add('cc-done'); render(); solved();
                } else {
                    api.sfx('hit'); api.cat('think');
                    if (easy) { showBad = true; render(); api.say('Not quite: the pink letters are wrong.', 2600); }
                    else api.say('Not quite yet. Some letters are off.', 2400);
                }
            }
            function render() {
                note.tiles.forEach(function (t) {
                    var c = t.ch, g = guess[c] || '';
                    t.top.textContent = g;
                    t.el.className = 'cc-t' + (fixed[c] ? ' fixed' : '') + (c === sel ? ' sel' : '') + (showBad && g && g !== dec[c] ? ' bad' : '');
                });
                var used = {};
                for (var c in guess) used[guess[c]] = true;
                AZ.split('').forEach(function (p) { kbBtns[p].className = used[p] ? 'used' : ''; });
                var top = order.slice().sort(function (a, b) { return count[b] - count[a] || order.indexOf(a) - order.indexOf(b); }).slice(0, api.size().w < 500 ? 7 : 9);
                freq.innerHTML = '<span>Most common:</span>';
                top.forEach(function (c) {
                    var b = el('button', (c === sel ? 'sel' : '') + (guess[c] ? ' ok' : ''), c + ' ' + count[c]);
                    b.type = 'button';
                    b.title = c + ' appears ' + count[c] + ' times';
                    b.addEventListener('click', function () { if (!done && running && !fixed[c]) { select(c); api.sfx('tap'); } });
                    freq.appendChild(b);
                });
                freq.appendChild(el('span', null, 'In English: E T A O I N'));
            }
            sel = firstOpen(null);
            render();
            return {
                plain: plain,
                tip: 'Each letter was swapped for another one, the same way every time. <b>Tap a hidden letter, then pick what it really is.</b> Common letters and short words are your best clues.',
                canHint: function () { return !done && order.some(function (c) { return !fixed[c]; }); },
                hint: function () {
                    var c = sel && !fixed[sel] && guess[sel] !== dec[sel] ? sel : null;
                    if (!c) c = order.filter(function (x) { return !fixed[x] && guess[x] !== dec[x]; }).sort(function (a, b) { return count[b] - count[a]; })[0];
                    if (!c) c = order.filter(function (x) { return !fixed[x]; })[0];
                    var p = dec[c];
                    for (var x in guess) if (guess[x] === p) delete guess[x];
                    guess[c] = p; fixed[c] = true;
                    sel = firstOpen(c);
                    api.say(c + ' is really ' + p + '.');
                    render();
                    check();
                },
                key: function (e) {
                    var k = e.key;
                    if (/^[a-zA-Z]$/.test(k)) { put(k.toUpperCase()); return true; }
                    if (k === 'Backspace' || k === 'Delete' || k === ' ') { put(''); return true; }
                    if (k === 'ArrowRight' || k === 'ArrowLeft') {
                        var free = order.filter(function (c) { return !fixed[c]; });
                        if (!free.length) return true;
                        var i = free.indexOf(sel);
                        sel = free[mod(i + (k === 'ArrowRight' ? 1 : -1), free.length)];
                        render();
                        return true;
                    }
                    return false;
                },
                reveal: function () { order.forEach(function (c) { guess[c] = dec[c]; }); sel = null; showBad = false; render(); }
            };
        };

        /* keys: never while typing in a field (the leaderboard name box), never with modifier keys */
        api.on(document, 'keydown', function (e) {
            if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
            var t = e.target, tag = t && t.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
            if (over || e.key === 'Escape') return;
            if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ') && !(t.closest && t.closest('.cc'))) return;   /* the top bar's buttons */
            if (phase !== 'play') {
                if ((e.key === 'Enter' || e.key === ' ') && nextFn) { e.preventDefault(); var f = nextFn; nextFn = null; f(); }
                return;
            }
            if (!running || !puzzle) return;
            if (e.key === '?') { e.preventDefault(); hint(); return; }
            if (puzzle.key(e)) e.preventDefault();
        });

        intro();
        return { destroy: function () { running = false; over = true; } };
    });
})();
