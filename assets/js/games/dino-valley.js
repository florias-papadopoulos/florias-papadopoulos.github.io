/* Dino Valley: a side view platformer. A baby dinosaur carries the cat on its back across a prehistoric valley to get
   home before the volcano erupts: five regions (Fern Forest, Tar Pits, Misty River, Ice Cave, Volcano Slope) of two
   levels each, walked at the player's own pace (the camera follows, nothing auto runs). The dino jumps, swipes its
   tail (knocks small critters away, breaks cracked rock), stomps from the air (squashes, cracks floors) and roars
   while the cat hisses (big creatures back off for a few seconds, and it wakes the sleeping long-neck at the very end).
   From the river on the cat opens a big leaf: press jump again in the air to glide for a moment.
   Eggs (a few hidden per level) and berries (every fifth heals a heart) give points, as do critters and finished
   levels. Difficulty from api.level(): Easy has more hearts, lives and checkpoints and slower hazards, Hard fewer and
   faster. The levels are 15 rows of 32 px tiles (legend above LEVELS); the camera zoom shows all 15 rows when the
   screen allows, so a phone in portrait sees the whole height. The physics (stepBody) is plain code at the top of the
   file, shared with a test solver (module.exports at the end of this block, unused in the browser) that checks every
   level and egg can be reached. Everything is drawn on one canvas; HUD, cards and touch buttons are DOM.
   With a dog look (data-pet "dog") a dog rides instead of the cat (floppy ears, snout, wagging tail, barks instead of
   hissing). Shell API: arcade.js. */
(function () {
    'use strict';
    var T = 32;                                    /* tile size in world px */
    /* player physics, px and seconds; y grows downwards */
    var PHYS = {
        w: 26, h: 24,                              /* hitbox of the dino (the cat on its back is drawn above it) */
        grav: 1700, jump: 600, cut: 230,           /* releasing jump early cuts the rise to `cut` */
        run: 175, acc: 1500, fric: 1800, airAcc: 1000, airFric: 260,
        iceRun: 215, iceAcc: 380, iceFric: 140,    /* ice: faster, slow to start and to stop */
        tarRun: 0.42, tarJump: 0.74,               /* tar: slower and a weaker jump */
        fall: 760, stomp: 900, glideFall: 70, glideTime: 1.1,
        coyote: 0.09, buffer: 0.12, geyser: 960
    };
    var SOLID = { '#': 1, R: 1, i: 1, o: 1, h: 1, s: 1 };
    var HAZARD = { w: 1, L: 1, '^': 1 };

    /* ---------- the levels: 15 rows, 32 px tiles ----------
       .  air          #  ground        =  ledge (jump up through it)      h  low branch (solid, the cat ducks)
       R  cracked rock (tail swipe from the side or stomp from above)       i  ice (slippery)
       ~  tar (slows you, weaker jump)  w  water   L  lava   ^  thorns (these three hurt and put you back)
       o  stepping stone   s  sinking stone (sinks a moment after you step on it, comes back)
       l  floating log (drifts across the water below it)    G  geyser (launches you when it erupts)
       F  falling rock or icicle (hangs here, drops when you pass)   V  swinging vine (hangs from here)
       C  checkpoint   c  checkpoint on Easy and Normal   e  checkpoint on Easy only
       E  egg   *  berry   k  beetle   x  crab   p  snapping plant   Q  pterosaur
       T  grumpy trike (the top left tile of its 3 x 2 box, standing on the ground below)
       Z  sleeping long-neck (lies on the ledge before the last gap)   N  the way on (home in the last level)   @  start */
    var LEVELS = [
        { region: 'forest', name: 'Morning Ferns',
          map: ['........................................................................................................',
                '........................................................................................................',
                '........................................................................................................',
                '........................................................................................................',
                '........................................................................................................',
                '........................................................................................................',
                '................................................................E.......................................',
                '...............................................................===......................................',
                '..................**.................**...............**................................................',
                '...................................######.............==................................................',
                '......***.......######.............R....#....*..............#............*...*................***.......',
                '..@.............######..k........#.R..E.#..C....p...........#.k....k...........e..p.............k...N...',
                '##########################...#######################......#################RR###########...#############',
                '##########################^^^#######################^^^^^^#################.E###########^^^#############',
                '########################################################################################################'] },
        { region: 'forest', name: 'Vine Hollow',
          map: ['................................................############....................................................',
                '................................................############....................................................',
                '.........................##########.............############....................................................',
                '.........................##########.............############....................................................',
                '................V..........F...F................############...........V........................................',
                '................................................############....................................................',
                '................................................############...............E....................................',
                '................*...............................############..............===.........................*.........',
                '................................................############..........................................==........',
                '......**........................................#RE#########....................................................',
                '..@..........................*...k..c................T..........................hhhhhh.............#............',
                '############.........################........*.....*.....*......C................***.....p...k..e..#.......N....',
                '############.........#############################################..........####################################',
                '############^^^^^^^^^#############################################^^^^^^^^^^####################################',
                '################################################################################################################'] },
        { region: 'tar', name: 'Sticky Steps',
          map: ['............................................................................................................',
                '............................................................................................................',
                '............................................................................................................',
                '............................................................................................................',
                '.....................................*......................................................................',
                '...................................c........................................................................',
                '................................#########..............E..............**....*...............................',
                '................................#########...........######..................................................',
                '................................#########...........######..................................................',
                '................................#########...........######..................................................',
                '......*......**.................#########...........######...................................#.##...**......',
                '..@.............k.....k.....G...#########.....G.....######...C...p.......G......e....k.......#RE#.......N...',
                '##########~~~~~~~~~######################~~~~~#~~~~~##################...##...####~~~~~~~~##################',
                '######################################################################^^^##^^^##############################',
                '############################################################################################################'] },
        { region: 'tar', name: 'Bubbling Bog',
          map: ['....................................................................................................................',
                '....................................................................................................................',
                '...................................................................###.###..........................................',
                '..................................................................#########.........................................',
                '.....................*............................................#########...E.........*...........................',
                '................**..................................................F...F...####....................................',
                '............................................................................####....................................',
                '............................................................................####....................................',
                '............................................**...*..........................####............................E.......',
                '............................................................................####............................==......',
                '...................G.......c...k............................................####..........................#.........',
                '..@..........G.....##...##########..........T...................C.....*....G####....G.......e..p........k.#.....N...',
                '##########...##....##...##########~~~~~~~##~~~~~~##~~~~~~~~~~~##################....##....########~~~~##############',
                '##########^^^##^^^^##^^^########################################################^^^^##^^^^##########################',
                '####################################################################################################################'] },
        { region: 'river', name: 'Stepping Stones',
          map: ['................................................................................................................',
                '................................................................................................................',
                '................................................................................................................',
                '................................................................................................................',
                '................................................................................................................',
                '................................................................................................................',
                '........................................................***............E........................................',
                '......................................................................===.......................................',
                '...........................................................*.......................E............................',
                '.....................................**..................................#......................................',
                '...............*...............................C..x...............x....x.#..............................**......',
                '..@....x..................x...c.............##########.......###############..................e...x..p......N...',
                '##########wwowwowwowww##########wwswwswwswww##########wwwwwww###############wwwowwwswwwowwww####################',
                '##########wwwwwwwwwwww##########wwwwwwwwwwww##########wwwwwww###############wwwwwwwwwwwwwwww####################',
                '##########wwwwwwwwwwww##########wwwwwwwwwwww##########wwwwwww###############wwwwwwwwwwwwwwww####################'] },
        { region: 'river', name: 'Log Ride',
          map: ['....................................................................................................................',
                '....................................................................................................................',
                '....................................................................................................................',
                '.......................................................................................................Q............',
                '...............................Q........................................Q...........................................',
                '...........................................................................*........................................',
                '...................................................................................................E................',
                '...........................................E......................................................==................',
                '....................................................................................................................',
                '................**...*.........................l.................................................#.......**.........',
                '..@..........................x...c........................C...x.....l..................e..x...p..#.............N....',
                '##########.l..............##########.l..................##########..........l.......################################',
                '##########wwwwwwwwwwwwwwww##########wwwwwwwwwwowwwwwwwww##########wwwwwwwwwswwwwwwww################################',
                '##########wwwwwwwwwwwwwwww##########wwwwwwwwwwwwwwwwwwww##########wwwwwwwwwwwwwwwwww################################',
                '##########wwwwwwwwwwwwwwww##########wwwwwwwwwwwwwwwwwwww##########wwwwwwwwwwwwwwwwww################################'] },
        { region: 'ice', name: 'Slippery Slide',
          map: ['##############################################################################################################',
                '##############################################################################################################',
                '##############################################################################################################',
                '..................F.....F.....................................F...F.....RR.....F..............................',
                '........................................................................RR....................................',
                '........................................................................RR....................................',
                '...........................................E............................RR....................................',
                '...........................................==...........................RR.................*..................',
                '........................................................................RR.................==.................',
                '........................................iii.....*.......................RR..######............................',
                '...............**.............................iiiiii....................RR..R.........................**......',
                '..@........................k.......c..........iiiiii......C..........p..RR..R.E......e..k........k........N...',
                '############iiiiiiiiiiiiiiiiii...iiiiiiiiiiiiiiiiiii....iiiiiiiiiiiiiiii##################....iiiiii##########',
                '############iiiiiiiiiiiiiiiiii^^^iiiiiiiiiiiiiiiiiii^^^^iiiiiiiiiiiiiiii##################^^^^iiiiii##########',
                '############iiiiiiiiiiiiiiiiii###iiiiiiiiiiiiiiiiiii####iiiiiiiiiiiiiiii######################iiiiii##########'] },
        { region: 'ice', name: 'Frozen Echo',
          map: ['####################################################################################################################',
                '####################################################################################################################',
                '................################......................................................F.............................',
                '................################.............................................................V......................',
                '................################.......................V..............Q.............................................',
                '................################.................................................................E..................',
                '................################.......................*.........................................==.................',
                '................################....................................................................................',
                '................RE##############.............................................**....k................................',
                '................................................................................########...................**.......',
                '........*...............T.................C....k................c.........x.....########............e..p.......N....',
                '..@................**..............*....##########............iiiiiiiiiiiiiiiiii########..........##################',
                '##############iiiiiiiiiiiiiiiiiiiiiiiiii##########............iiiiiiiiiiiiiiiiii########..........##################',
                '##############iiiiiiiiiiiiiiiiiiiiiiiiii##########^^^^^^^^^^^^iiiiiiiiiiiiiiiiii########^^^^^^^^^^##################',
                '##############iiiiiiiiiiiiiiiiiiiiiiiiii######################iiiiiiiiiiiiiiiiii####################################'] },
        { region: 'volcano', name: 'Ash Path',
          map: ['................................................................................................................',
                '................................................................................................................',
                '................................................................................................................',
                '................................................................................................................',
                '................................................................................................................',
                '.............................................................E..................................................',
                '...........................................................#####...............E................................',
                '................................*..........................#####................................................',
                '...........................................................#####................................................',
                '...........................................................#####................................................',
                '........*..........k...c........o..........**...T..........#####...............o................#.##...**.......',
                '..@.............##########...o........C................p..G#####..e...k.....s.....s.....c...x...#RE#........N...',
                '############LLLL##########LLLLLLLLLL######################################LLLLLLLLLLLL##########################',
                '############LLLL##########LLLLLLLLLL######################################LLLLLLLLLLLL##########################',
                '############LLLL##########LLLLLLLLLL######################################LLLLLLLLLLLL##########################'] },
        { region: 'volcano', name: 'Run Home!',
          map: ['....................................................................................................................................',
                '....................................................................................................................................',
                '....................................................................................................................................',
                '....................................................................................................................................',
                '....................................................................................................................................',
                '....................................................................................................................................',
                '....................................................................................................................................',
                '..........................................................................................................................E.........',
                '....................................................................................................................................',
                '............................####....................................E..........................**........................==.........',
                '.....................**..k..####......................**....o..#########........*.........c..........Z........................N.....',
                '....@............###############....*.............C............#########....k...........####################............############',
                '##############LLL###########################LLLL##########LLLLL#####################LLLL####################LLLLLLLLLLLL############',
                '##############LLL###########################LLLL##########LLLLL#####################LLLL####################LLLLLLLLLLLL############',
                '##############LLL###########################LLLL##########LLLLL#####################LLLL####################LLLLLLLLLLLL############'] }
    ];
    var REGIONS = {
        forest:  { title: 'Fern Forest' },
        tar:     { title: 'Tar Pits' },
        river:   { title: 'Misty River', glide: true },
        ice:     { title: 'Ice Cave', glide: true },
        volcano: { title: 'Volcano Slope', glide: true, meteors: true }
    };
    var VINE_L = 144, VINE_AMP = 0.8, VINE_W = 2.3, GRAB = 26;   /* vine length, swing (rad), speed (rad/s), grab radius */
    var LOG_W = 96;

    /* parse a level into a world: the tile grid (entities taken out of it) and lists of what lives in it */
    function parse(lv, diff) {
        var rows = lv.map.length, cols = lv.map[0].length, g = [], o = {
            rows: rows, cols: cols, g: g, start: null, cps: [], eggs: [], berries: [], critters: [], trikes: [], pteros: [],
            geysers: [], rocks: [], vines: [], logs: [], neck: null, exit: null, sunk: {}, plats: [],
            glide: !!REGIONS[lv.region].glide, region: lv.region
        };
        for (var r = 0; r < rows; r++) g.push(lv.map[r].split(''));
        for (r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
            var ch = g[r][c], x = c * T, y = r * T, keep = false;
            if (ch === '@') o.start = { x: x + 3, y: y + T - PHYS.h };
            else if (ch === 'C' || (ch === 'c' && diff !== 'hard') || (ch === 'e' && diff === 'easy')) o.cps.push({ x: x, y: y, on: false });
            else if (ch === 'E') o.eggs.push({ x: x + 16, y: y + 18, got: false, c: c, r: r });
            else if (ch === '*') o.berries.push({ x: x + 16, y: y + 16, got: false, c: c, r: r });
            else if (ch === 'k' || ch === 'x' || ch === 'p') o.critters.push({ kind: ch, x: x + 4, y: y + T - (ch === 'p' ? 26 : 16), w: 24, h: ch === 'p' ? 26 : 16, sx: x + 4, vx: ch === 'p' ? 0 : -1, dead: false, t: Math.random() * 3 });
            else if (ch === 'T') o.trikes.push({ sx: x, sy: y + 2 * T - 56 });
            else if (ch === 'Q') o.pteros.push({ hx: x + 16, hy: y + 16 });
            else if (ch === 'G') o.geysers.push({ c: c, r: r, x: x, y: y + T, t: (c * 0.37) % 1 });
            else if (ch === 'F') o.rocks.push({ c: c, r: r, x: x + 16, y0: y + 6 });
            else if (ch === 'V') o.vines.push({ ax: x + 16, ay: y + 16, ph: c * 0.9 });
            else if (ch === 'l') o.logs.push({ c: c, r: r });
            else if (ch === 'Z') o.neck = { c: c, r: r, x: x, y: y + T };
            else if (ch === 'N') o.exit = { x: x, y: y - T, w: T, h: 2 * T };
            else keep = true;
            if (!keep) g[r][c] = '.';
        }
        /* logs float on the water found below them and drift over its whole stretch */
        o.logs.forEach(function (l) {
            var wr = l.r;
            while (wr < rows && g[wr][l.c] !== 'w') wr++;
            var a = l.c, b = l.c;
            while (a > 0 && g[wr][a - 1] === 'w') a--;
            while (b < cols - 1 && g[wr][b + 1] === 'w') b++;
            l.min = a * T; l.max = (b + 1) * T - LOG_W; l.y = wr * T - 8;
            l.x = Math.max(l.min, Math.min(l.max, l.c * T)); l.w = LOG_W; l.dir = 1; l.dx = 0;
            o.plats.push(l);
        });
        /* the long-neck: once awake its neck bridges the gap to the next ground on the right */
        if (o.neck) {
            var n = o.neck, fc = n.c + 1;
            while (fc < cols && g[n.r + 1][fc] === '#') fc++;
            n.from = fc * T;
            while (fc < cols && !SOLID[g[n.r + 1][fc]] && !SOLID[g[n.r][fc]] && !SOLID[g[n.r - 1][fc]]) fc++;
            n.to = fc * T;
            n.bridge = { x: n.from - 10, y: n.y, w: n.to - n.from + 20, dx: 0, off: true };
            o.plats.push(n.bridge);
        }
        return o;
    }
    function tileAt(W, c, r) { return c < 0 || c >= W.cols || r < 0 || r >= W.rows ? '.' : W.g[r][c]; }
    function solidAt(W, c, r) {
        if (c < 0 || c >= W.cols) return true;     /* the level ends at walls left and right */
        if (r < 0 || r >= W.rows) return false;
        var ch = W.g[r][c];
        return !!SOLID[ch] && !(ch === 's' && W.sunk[c + ',' + r] > 0);
    }
    /* does the box (inset a little) touch a tile of the set? returns the first tile found */
    function touches(W, x, y, w, h, set) {
        var c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.01) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.01) / T);
        for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { var ch = tileAt(W, c, r); if (set[ch]) return ch; }
        return '';
    }
    function hazard(W, p) {
        if (p.y > W.rows * T + 40) return 'fall';
        return touches(W, p.x + 5, p.y + 6, p.w - 10, p.h - 8, HAZARD);
    }
    function newBody(x, y) {
        return { x: x, y: y, w: PHYS.w, h: PHYS.h, vx: 0, vy: 0, ground: false, coyote: 0, buf: 0, jumped: false,
            gliding: false, glideT: 0, stomping: false, plat: null, ice: false, tar: false, face: 1 };
    }
    function moveX(p, dx, W) {
        var nx = p.x + dx, r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 0.01) / T), c, r;
        if (dx > 0) {
            c = Math.floor((nx + p.w - 0.01) / T);
            for (r = r0; r <= r1; r++) if (solidAt(W, c, r)) { p.x = c * T - p.w; p.vx = 0; return true; }
        } else if (dx < 0) {
            c = Math.floor(nx / T);
            for (r = r0; r <= r1; r++) if (solidAt(W, c, r)) { p.x = (c + 1) * T; p.vx = 0; return true; }
        }
        p.x = nx;
        return false;
    }
    function moveY(p, dy, W, ev) {
        var c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.01) / T), c, r;
        if (dy >= 0) {
            var ob = p.y + p.h, nb = ob + dy, land = Infinity, plat = null;
            r = Math.floor((nb - 0.01) / T);
            if (r * T >= ob - 0.5) for (c = c0; c <= c1; c++) {
                if (solidAt(W, c, r) || tileAt(W, c, r) === '=') land = Math.min(land, r * T);
            }
            for (var i = 0; i < W.plats.length; i++) {
                var pl = W.plats[i];
                if (pl.off || p.x + p.w <= pl.x || p.x >= pl.x + pl.w) continue;
                if (ob <= pl.y + 0.5 && nb >= pl.y && pl.y < land) { land = pl.y; plat = pl; }
            }
            if (land < Infinity) {
                if (!p.ground) { ev.landed = true; ev.fallV = p.vy; ev.stomp = p.stomping; }
                p.y = land - p.h; p.vy = 0; p.ground = true; p.plat = plat; p.stomping = false; p.gliding = false;
                var under = tileAt(W, Math.floor((p.x + p.w / 2) / T), Math.floor(land / T));
                p.ice = !plat && under === 'i';
                ev.floor = land;
                return;
            }
            p.y += dy; p.ground = false; p.plat = null;
        } else {
            var nt = p.y + dy;
            r = Math.floor(nt / T);
            for (c = c0; c <= c1; c++) if (solidAt(W, c, r)) { p.y = (r + 1) * T; p.vy = 0; ev.bonk = true; return; }
            p.y = nt; p.ground = false; p.plat = null;
        }
    }
    /* one physics step of the dino. inp: l, r, jump (held), jumpHit (pressed now), downHit; returns events */
    function stepBody(p, inp, dt, W) {
        var ev = {};
        p.tar = !!touches(W, p.x + 2, p.y + p.h - 10, p.w - 4, 10, { '~': 1 });
        var ice = p.ground && p.ice;
        var max = (ice ? PHYS.iceRun : PHYS.run) * (p.tar ? PHYS.tarRun : 1);
        var dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
        if (dir) {
            var acc = p.ground ? (ice ? PHYS.iceAcc : PHYS.acc) : PHYS.airAcc;
            if (p.vx * dir < max) p.vx = Math.min(max, p.vx * dir + acc * dt) * dir;
            else p.vx -= dir * Math.min(p.vx * dir - max, PHYS.airFric * dt);   /* faster than running (a vine): ease off */
            p.face = dir;
        } else {
            var f = (p.ground ? (ice ? PHYS.iceFric : PHYS.fric) : PHYS.airFric) * dt;
            p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - f * (p.vx > 0 ? 1 : -1);
        }
        if (inp.jumpHit) p.buf = PHYS.buffer; else p.buf -= dt;
        if (p.ground) { p.coyote = PHYS.coyote; p.glideT = PHYS.glideTime; } else p.coyote -= dt;
        if (p.buf > 0 && p.coyote > 0) {
            p.vy = -PHYS.jump * (p.tar ? PHYS.tarJump : 1);
            p.ground = false; p.plat = null; p.coyote = 0; p.buf = 0; p.jumped = true; p.glideT = PHYS.glideTime;
            ev.jump = true;
        } else if (inp.jumpHit && !p.ground && W.glide && p.glideT > 0 && !p.stomping) {
            p.gliding = true; p.buf = 0; ev.glide = true;
        }
        if (!inp.jump) {
            p.gliding = false;
            if (p.jumped && p.vy < -PHYS.cut) p.vy = -PHYS.cut;
        }
        if (inp.downHit && !p.ground && !p.stomping) {
            p.stomping = true; p.gliding = false; p.vy = PHYS.stomp; p.vx *= 0.3; ev.stompStart = true;
        }
        p.vy += PHYS.grav * dt;
        if (p.gliding) {
            p.glideT -= dt;
            if (p.vy > PHYS.glideFall) p.vy = Math.max(PHYS.glideFall, p.vy - 2600 * dt);
            if (p.glideT <= 0) p.gliding = false;
        }
        if (p.vy > (p.stomping ? PHYS.stomp : PHYS.fall)) p.vy = p.stomping ? PHYS.stomp : PHYS.fall;
        if (p.vy >= 0) p.jumped = false;
        if (moveX(p, p.vx * dt, W)) ev.wall = true;
        moveY(p, p.vy * dt, W, ev);
        return ev;
    }
    /* where a vine's end is at time t: position and velocity */
    function vineTip(v, t) {
        var a = VINE_AMP * Math.sin(VINE_W * t + v.ph), da = VINE_AMP * VINE_W * Math.cos(VINE_W * t + v.ph);
        return { x: v.ax + VINE_L * Math.sin(a), y: v.ay + VINE_L * Math.cos(a), vx: VINE_L * Math.cos(a) * da, vy: -VINE_L * Math.sin(a) * da, a: a };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { T: T, PHYS: PHYS, LEVELS: LEVELS, REGIONS: REGIONS, parse: parse, stepBody: stepBody, newBody: newBody,
            hazard: hazard, solidAt: solidAt, tileAt: tileAt, vineTip: vineTip, VINE: { L: VINE_L, amp: VINE_AMP, w: VINE_W, grab: GRAB } };
    }
    if (typeof Arcade === 'undefined') return;

    var furthest = { easy: 0, normal: 0, hard: 0 };   /* the furthest level reached in this visit, per difficulty */

Arcade.register('dino-valley', function (api) {
    /* difficulty: hearts, lives, critter speed, trike charge speed, seconds a roar scares, roar cooldown,
       geyser rest, falling rock warning, meteor gap and warning, lava flood speed */
    var LV = {
        easy:   { hearts: 5, lives: 5, crit: 0.8,  charge: 170, scare: 5.5, roar: 3.5, rest: 2.2, shake: 0.8,  met: 2.8, warn: 1.6,  lava: 105 },
        normal: { hearts: 4, lives: 3, crit: 1,    charge: 220, scare: 4.5, roar: 5,   rest: 1.7, shake: 0.6,  met: 2,   warn: 1.25, lava: 128 },
        hard:   { hearts: 3, lives: 2, crit: 1.3,  charge: 270, scare: 3.5, roar: 6.5, rest: 1.2, shake: 0.42, met: 1.4, warn: 0.95, lava: 148 }
    };
    var diff = LV[api.level()] ? api.level() : 'normal', L = LV[diff];
    var touchUI = api.touch, RM = api.reducedMotion, TAU = Math.PI * 2;
    api.css(
        '.dv { position: absolute; inset: 0; overflow: hidden; background: #cfe9d9; display: flex; flex-direction: column; touch-action: none; }' +
        '.dv-hud { flex: none; height: 34px; display: flex; align-items: center; gap: 8px; padding: 0 10px; background: #fff;' +
        '  border-bottom: 1px solid #e2e8f0; color: #1e3a8a; font-weight: 800; font-size: .85rem; white-space: nowrap; overflow: hidden; }' +
        '.dv-hud small { color: #5b6b80; font-weight: 700; font-size: .75rem; margin-right: 3px; }' +
        '.dv-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: #2f6b3a; }' +
        '.dv-gap { flex: 1; }' +
        '.dv-hearts { color: #e8577e; letter-spacing: 1px; } .dv-hearts i { color: #d9dee8; font-style: normal; }' +
        '.dv-roar { display: flex; align-items: center; gap: 4px; color: #5b6b80; font-size: .75rem; }' +
        '.dv-bar { width: 38px; height: 7px; border-radius: 4px; background: #e6e9f0; overflow: hidden; }' +
        '.dv-bar i { display: block; height: 100%; width: 100%; background: #f59f00; border-radius: 4px; }' +
        '.dv-view { position: relative; flex: 1; min-height: 0; }' +
        '.dv-view canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.dv-tip { position: absolute; left: 50%; top: 8px; transform: translateX(-50%); max-width: calc(100% - 24px); padding: 5px 12px;' +
        '  border-radius: 12px; background: rgba(255,255,255,.92); color: #2f4a5e; font-size: .82rem; font-weight: 700; line-height: 1.3;' +
        '  text-align: center; pointer-events: none; transition: opacity .4s; }' +
        '.dv-tip.dv-off { opacity: 0; }' +
        '.dv-card { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); width: max-content; max-width: min(88%, 440px);' +
        '  padding: 14px 20px; border-radius: 18px; background: rgba(255,255,255,.96); box-shadow: 0 10px 30px rgba(15,23,42,.25);' +
        '  text-align: center; color: #2f4a5e; font-weight: 600; font-size: .9rem; line-height: 1.4; }' +
        '.dv-card[hidden] { display: none; }' +
        '.dv-card b { display: block; color: #5b8a3c; font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; }' +
        '.dv-card strong { display: block; color: #1e3a8a; font-size: 1.45rem; line-height: 1.2; margin: 2px 0 6px; }' +
        '.dv-card p { margin: 4px 0; white-space: pre-line; }' +
        '.dv-card button { margin: 8px 4px 0; padding: 8px 16px; border: none; border-radius: 12px; background: #2f9e44; color: #fff;' +
        '  font: 800 1rem/1.2 inherit; cursor: pointer; touch-action: manipulation; }' +
        '.dv-card button.dv-alt { background: #e9f5ec; color: #2f6b3a; font-size: .85rem; padding: 6px 10px; }' +
        '.dv-pad { flex: none; position: relative; height: 164px; background: #eef4ef; border-top: 1px solid #dfe8e1; display: none; }' +
        '.dv.dv-touch .dv-pad { display: block; }' +
        '.dv-pad.dv-over { position: absolute; left: 0; right: 0; bottom: 0; background: none; border: none; }' +
        '.dv-b { position: absolute; display: grid; place-items: center; width: 70px; height: 70px; padding: 0; border: none; border-radius: 50%;' +
        '  background: #fff; box-shadow: 0 4px 0 #c8d3cb; color: #2f6b3a; font: 800 .85rem/1 inherit; touch-action: none;' +
        '  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }' +
        '.dv-over .dv-b { background: rgba(255,255,255,.75); }' +
        '.dv-b svg { width: 32px; height: 32px; fill: none; stroke: currentColor; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }' +
        '.dv-b.dv-on { transform: translateY(3px); box-shadow: 0 1px 0 #c8d3cb; background: #2f6b3a; color: #fff; }' +
        '.dv-b.dv-cool { opacity: .5; }' +
        '.dv-left { left: 12px; bottom: 26px; } .dv-right { left: 90px; bottom: 26px; }' +
        '.dv-down { left: 51px; bottom: 104px; width: 70px; height: 46px; border-radius: 16px; font-size: .78rem; }' +
        '.dv-jump { right: 12px; bottom: 74px; width: 78px; height: 78px; background: #2f9e44; color: #fff; box-shadow: 0 4px 0 #237032; font-size: 1rem; }' +
        '.dv-jump.dv-on { background: #237032; }' +
        '.dv-tail { right: 100px; bottom: 20px; width: 64px; height: 64px; }' +
        '.dv-roarb { right: 100px; bottom: 94px; width: 64px; height: 56px; border-radius: 18px; color: #c2410c; }' +
        '@media (max-width: 360px) { .dv-right { left: 82px; } .dv-tail, .dv-roarb { right: 94px; } }');

    /* ---------- DOM: HUD band, the view (canvas, tip, card), touch pad ---------- */
    var wrap = document.createElement('div');
    wrap.className = 'dv' + (touchUI ? ' dv-touch' : '');
    function arrow(d) { return '<svg viewBox="0 0 24 24"><path d="' + d + '"/></svg>'; }
    wrap.innerHTML =
        '<div class="dv-hud"><span class="dv-name"></span><span class="dv-gap"></span>' +
        '<span class="dv-hearts"></span><span class="dv-lives"></span><span class="dv-eggs"></span>' +
        '<span class="dv-roar"><small>Roar</small><span class="dv-bar"><i></i></span></span></div>' +
        '<div class="dv-view"><canvas></canvas><div class="dv-tip dv-off"></div><div class="dv-card" hidden></div></div>' +
        '<div class="dv-pad">' +
        '<button type="button" class="dv-b dv-left" data-k="l" aria-label="Left">' + arrow('M15 5l-7 7 7 7') + '</button>' +
        '<button type="button" class="dv-b dv-right" data-k="r" aria-label="Right">' + arrow('M9 5l7 7-7 7') + '</button>' +
        '<button type="button" class="dv-b dv-down" data-k="d" aria-label="Stomp">Stomp</button>' +
        '<button type="button" class="dv-b dv-jump" data-k="j" aria-label="Jump">Jump</button>' +
        '<button type="button" class="dv-b dv-tail" data-k="t" aria-label="Tail swipe">Tail</button>' +
        '<button type="button" class="dv-b dv-roarb" data-k="o" aria-label="Roar">Roar</button></div>';
    api.el.appendChild(wrap);
    var view = wrap.querySelector('.dv-view'), cv = view.querySelector('canvas'), g = cv.getContext('2d');
    var tipEl = view.querySelector('.dv-tip'), card = view.querySelector('.dv-card'), pad = wrap.querySelector('.dv-pad');
    var hud = { name: wrap.querySelector('.dv-name'), hearts: wrap.querySelector('.dv-hearts'), lives: wrap.querySelector('.dv-lives'),
        eggs: wrap.querySelector('.dv-eggs'), roar: wrap.querySelector('.dv-bar i'), roarBox: wrap.querySelector('.dv-roar') };
    var roarBtn = pad.querySelector('.dv-roarb');

    /* the cat's colours follow the look picked with the corner mascot (CSS variables of cat.css), ginger if missing */
    var SK = { fur: '#f2a03d', light: '#ffc06e', stripe: '#d9822b', toe: '#f2a03d', line: '#5a3a1a', dog: false, ear: '#b97a33', nose: '#2b2220', cream: '#fcefd6' };
    (function () {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* ginger */ }
        function v(name, dflt) { var s = cs && cs.getPropertyValue(name).trim(); return s || dflt; }
        var look = document.documentElement.getAttribute('data-cat') || 'calico';
        SK.fur = v('--fur-bot', SK.fur); SK.light = v('--fur-top', SK.light); SK.stripe = v('--stripe', SK.stripe);
        SK.calico = look === 'calico';
        SK.toe = look === 'tuxedo' ? v('--cream', '#f6f6f4') : SK.fur;
        SK.line = look === 'tuxedo' || look === 'bat' || look === 'dog-bat' || look === 'hacker' ? '#17181c' : SK.line;
        SK.dog = document.documentElement.getAttribute('data-pet') === 'dog';   /* a dog rides instead, with --ear and --nose */
        if (SK.dog) { SK.ear = v('--ear', SK.ear); SK.nose = v('--nose', SK.nose); SK.cream = v('--cream', SK.cream); SK.toe = SK.fur; }
    })();
    var PET = SK.dog ? 'dog' : 'cat';

    /* ---------- state ---------- */
    var W = null, P = null, lvIdx = 0, firstLv = 0, state = 'title', stateT = 0, time = 0, score = 0, eggsGot = 0, eggsAll = 0;
    var hearts = L.hearts, lives = L.lives, berryPips = 0, cp = null, inv = 0, wobT = 0, cheerT = 0, hissT = 0, waveT = 0;
    var swipeT = 0, swipeCd = 0, roarT = 0, roarCd = 0, stompFx = 0, vine = null, vineLock = 0, lastSafe = null, shake = 0;
    var lavaX = -1e9, lavaOn = false, metT = 0, meteors = [], parts = [], texts = [], ending = 0, moved = false;
    var trikes = [], pteros = [];
    var vw = 0, vh = 0, zoom = 1, dpr = 1, cam = { x: 0, y: 0 }, tipT = 0;
    var keys = {}, hit = {}, padKeys = {};

    function setTip(text, secs) { tipEl.textContent = text; tipEl.classList.remove('dv-off'); tipT = secs || 5; }

    /* ---------- layout ---------- */
    function fit() {
        var s = api.size();
        var over = touchUI && s.h < 520;               /* short landscape phones: the buttons float over the view */
        pad.classList.toggle('dv-over', over);
        var r = view.getBoundingClientRect();
        vw = Math.max(1, Math.round(r.width)); vh = Math.max(1, Math.round(r.height));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
        cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
        /* a tall screen sees all 15 rows (at least 12 columns wide), a wide one 12 rows and the camera follows up and down */
        zoom = Math.max(0.6, Math.min(3, vh / ((vw > vh ? 12 : 15) * T), vw / (12 * T)));
        if (over) zoom = Math.max(0.6, Math.min(vh / (11 * T), vw / (16 * T)));
        if (W) camTo(true);
    }
    api.onResize(function () { fit(); });

    /* ---------- input ---------- */
    var KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'j', KeyW: 'j', Space: 'j', KeyZ: 'j',
        ArrowDown: 'd', KeyS: 'd', KeyJ: 't', KeyX: 't', KeyK: 'o', KeyC: 'o' };
    function held(k) { return !!(keys[k] || padKeys[k]); }
    function press(k) {
        hit[k] = true;
        if (state === 'title' && (k === 'j')) { begin(firstLv); return; }
        if (state === 'paused') resume();
    }
    api.on(document, 'keydown', function (e) {
        var k = KEYMAP[e.code];
        if (e.code === 'Enter' && state === 'title') { e.preventDefault(); begin(firstLv); return; }
        if (!k) { if (state === 'paused') resume(); return; }
        var a = document.activeElement;            /* space must not also press a focused button */
        if (a && (a.tagName === 'BUTTON' || a.tagName === 'SELECT')) a.blur();
        e.preventDefault();
        if (!e.repeat) { keys[k] = true; press(k); }
    });
    api.on(document, 'keyup', function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
    api.on(window, 'blur', function () { keys = {}; });
    /* touch pad: each finger presses the button under it, sliding from one button to the next works */
    var fingers = {};
    function padSync() {
        var now = {};
        Object.keys(fingers).forEach(function (id) { if (fingers[id]) now[fingers[id]] = true; });
        Object.keys(now).forEach(function (k) { if (!padKeys[k]) press(k); });
        padKeys = now;
        Array.prototype.forEach.call(pad.querySelectorAll('.dv-b'), function (b) { b.classList.toggle('dv-on', !!now[b.dataset.k]); });
    }
    function btnAt(e) {
        var t = document.elementFromPoint(e.clientX, e.clientY), b = t && t.closest && t.closest('.dv-b');
        return b && pad.contains(b) ? b.dataset.k : '';
    }
    api.on(pad, 'pointerdown', function (e) {
        e.preventDefault();
        if (!touchUI && e.pointerType === 'touch') { touchUI = true; wrap.classList.add('dv-touch'); fit(); }
        try { pad.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
        fingers[e.pointerId] = btnAt(e); padSync();
    });
    api.on(pad, 'pointermove', function (e) { if (e.pointerId in fingers) { var k = btnAt(e); if (k !== fingers[e.pointerId]) { fingers[e.pointerId] = k; padSync(); } } });
    function lift(e) { if (e.pointerId in fingers) { delete fingers[e.pointerId]; padSync(); } }
    api.on(pad, 'pointerup', lift);
    api.on(pad, 'pointercancel', lift);
    api.on(pad, 'contextmenu', function (e) { e.preventDefault(); });
    api.on(view, 'pointerdown', function (e) {
        if (e.pointerType === 'touch' && !touchUI) { touchUI = true; wrap.classList.add('dv-touch'); fit(); hintNow(); }
        if (e.target.closest && e.target.closest('button')) return;
        e.preventDefault();
        if (state === 'paused') resume();
    });
    api.on(document, 'visibilitychange', function () { if (document.hidden && (state === 'play' || state === 'intro')) pause(); });

    /* ---------- cards ---------- */
    function showCard(html) { card.innerHTML = html; card.hidden = false; }
    function hideCard() { card.hidden = true; }
    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    var pausedFrom = '';
    function pause() { pausedFrom = state; state = 'paused'; keys = {}; showCard('<strong>Paused</strong><p>' + (touchUI ? 'Tap' : 'Press a key') + ' to go on</p>'); }
    function resume() { state = pausedFrom || 'play'; hideCard(); }
    function controlsText() {
        return touchUI ? 'Arrows walk, Jump jumps (again in the air to glide, later).\nTail swipes, Stomp in the air, Roar scares big ones.'
            : 'Arrows or A D walk, Up, W or Space jump. Down in the air: stomp.\nJ or X: tail swipe.  K or C: roar (the ' + PET + (SK.dog ? ' barks' : ' hisses') + ' too).';
    }
    function titleCard() {
        state = 'title';
        var h = '<b>Dino Valley</b><strong>Ride home before the volcano blows</strong>' +
            '<p>You are a baby dinosaur, the ' + PET + ' rides on your back. Five regions to cross, eggs to find.</p><p>' + esc(controlsText()) + '</p>' +
            '<button type="button" data-go="0">Start</button>';
        if (furthest[diff] > 0) {
            h += '<p style="margin-top:8px">Or start at</p>';
            for (var i = 2; i <= furthest[diff]; i += 2) h += '<button type="button" class="dv-alt" data-go="' + i + '">' + esc(REGIONS[LEVELS[i].region].title) + '</button>';
        }
        showCard(h);
        Array.prototype.forEach.call(card.querySelectorAll('button[data-go]'), function (b) {
            api.on(b, 'click', function () { begin(+b.dataset.go); });
        });
        var s = card.querySelector('button'); if (s && !touchUI) s.focus();
    }

    /* ---------- levels ---------- */
    function begin(i) {
        firstLv = i; lvIdx = i; score = 0; eggsGot = 0; eggsAll = 0; lives = L.lives;
        api.score(0);
        loadLevel();
    }
    function hintNow() {
        var n = lvIdx, k = touchUI ? 1 : 0;
        var H = [
            ['Walk with the arrows, jump with Up or Space. Land on beetles to squash them.', 'Walk with the arrows, Jump to jump. Land on beetles to squash them.'],
            ['Grab a vine in the air, jump to let go. A trike blocks the tunnel: roar with K or C!', 'Grab a vine in the air, Jump to let go. A trike blocks the tunnel: Roar!'],
            ['Tar slows you down. Stand on a geyser and wait for it to blow.', 'Tar slows you down. Stand on a geyser and wait for it to blow.'],
            ['Geysers carry you over thorns. Roar at the trike in the bog.', 'Geysers carry you over thorns. Roar at the trike in the bog.'],
            ['The ' + PET + ' found a big leaf: press jump again in the air to glide. Stomp crabs (Down in the air).', 'The ' + PET + ' found a big leaf: Jump again in the air to glide. Stomp crabs from the air.'],
            ['Ride the logs. A roar sends the pterosaur away.', 'Ride the logs. A roar sends the pterosaur away.'],
            ['Ice is slippery. Watch out for icicles, swipe cracked ice with J or X.', 'Ice is slippery. Watch out for icicles, Tail breaks cracked ice.'],
            ['A woolly trike guards the hall: roar, then hurry past.', 'A woolly trike guards the hall: Roar, then hurry past.'],
            ['Meteors! Step away from the shadows.', 'Meteors! Step away from the shadows.'],
            ['The lava is coming: run! Roar to wake the long-neck at the end.', 'The lava is coming: run! Roar to wake the long-neck at the end.']
        ];
        setTip(H[n] ? H[n][k] : '', 6);
    }
    function loadLevel() {
        var lv = LEVELS[lvIdx];
        W = parse(lv, diff);
        if (lvIdx > furthest[diff]) furthest[diff] = lvIdx;
        eggsAll += W.eggs.length;
        cp = { x: W.start.x, y: W.start.y };
        hearts = L.hearts; berryPips = 0;
        hud.name.textContent = (Math.floor(lvIdx / 2) + 1) + '-' + (lvIdx % 2 + 1) + ' ' + lv.name;
        W.critters.forEach(function (k) { k.vx = k.kind === 'p' ? 0 : -40 * L.crit * (k.kind === 'x' ? 1.6 : 1); });
        spawnAt(cp, true);
        state = 'intro'; stateT = 0;
        showCard('<b>' + esc(REGIONS[lv.region].title) + '</b><strong>' + esc(lv.name) + '</strong>');
        hintNow();
        updHud();
        camTo(true);
    }
    /* back at the checkpoint (or the start): the moving dangers start over, what was collected or knocked out stays */
    function spawnAt(at, fresh) {
        P = newBody(at.x, at.y);
        inv = fresh ? 0 : 1.2; vine = null; swipeT = 0; roarT = 0; roarCd = 0; meteors = []; metT = 1.5; moved = false;
        lastSafe = { x: at.x, y: at.y };
        trikes = W.trikes.map(function (t) { return { x: t.sx, y: t.sy, w: 84, h: 56, dir: -1, mode: 'walk', t: 0, scared: 0, anim: 0 }; });
        pteros = W.pteros.map(function (q) { return { hx: q.hx, hy: q.hy, x: q.hx, y: q.hy, mode: 'fly', t: Math.random() * 5, tx: 0, ty: 0, vx: 0, vy: 0 }; });
        W.rocks.forEach(function (r) { r.mode = 'wait'; r.t = 0; r.y = r.y0; r.vy = 0; });
        W.geysers.forEach(function (gy) { gy.t = 0; });
        lavaOn = lvIdx === LEVELS.length - 1; lavaX = at.x - 10 * T;
        if (W.neck && !W.neck.awake) W.neck.bridge.off = true;
    }
    function updHud() {
        var hs = '';
        for (var i = 0; i < L.hearts; i++) hs += i < hearts ? '♥' : '<i>♥</i>';
        hud.hearts.innerHTML = hs;
        hud.lives.innerHTML = '<small>Lives</small>' + lives;
        hud.eggs.innerHTML = '<small>Eggs</small>' + W.eggs.filter(function (e) { return e.got; }).length + '/' + W.eggs.length;
    }
    function addScore(n, x, y, label) {
        score += n; api.score(score);
        if (x != null) texts.push({ x: x, y: y, t: 0, s: label || ('+' + n) });
    }

    /* ---------- particles ---------- */
    function puff(x, y, n, col, spd) {
        if (RM) n = Math.ceil(n / 3);
        for (var i = 0; i < n && parts.length < 220; i++) {
            var a = Math.random() * TAU, s = (spd || 80) * (0.4 + Math.random());
            parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.4 + Math.random() * 0.4, col: col || '#fff', r: 2 + Math.random() * 3, gr: 300 });
        }
    }
    function bump(s) { if (!RM) shake = Math.max(shake, s); }

    /* ---------- player actions ---------- */
    function hurt(fromX) {
        if (inv > 0 || state !== 'play') return;
        hearts--; inv = 1.3; wobT = 0.8;
        api.sfx('hit'); bump(6);
        vine = null;
        P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 230; P.vy = -320; P.ground = false; P.stomping = false; P.gliding = false;
        updHud();
        if (hearts <= 0) loseLife();
    }
    function hazardHit(kind) {
        var cx = P.x + P.w / 2, cy = P.y + P.h;
        puff(cx, cy, 14, kind === 'L' ? '#ff8a3d' : kind === 'w' ? '#cdeeff' : '#9bbf7a', 120);
        api.sfx('hit'); bump(5);
        hearts--; wobT = 0.8; updHud();
        if (hearts <= 0) { loseLife(); return; }
        var ls = lastSafe;
        P = newBody(ls.x, ls.y); inv = 1.3; vine = null;
    }
    function loseLife() {
        lives--; updHud();
        api.cat('sad');
        state = 'dead'; stateT = 0;
        if (lives <= 0) { gameOver(); return; }
    }
    /* the end panel of arcade.js: "Play again" starts the next run where this one started (api.again below), and once
       a later region is open a "Regions" button goes back to the title card with its "Or start at" choices */
    function endOpts(o) {
        o.again = { from: firstLv };
        if (furthest[diff] >= 2) o.menu = 'Regions';
        return o;
    }
    function gameOver() {
        state = 'over';
        api.timeout(function () {
            api.end(endOpts({ score: score, win: false, text: 'The valley was too much this time.\nScore ' + score + ', eggs ' + eggsGot + ' of ' + eggsAll }));
        }, 900);
    }
    function doSwipe() {
        if (swipeCd > 0 || vine) return;
        swipeT = 0.3; swipeCd = 0.45;
        api.sfx('move');
        var cx = P.x + P.w / 2, x0 = cx - 46, x1 = cx + 46, y0 = P.y - 10, y1 = P.y + P.h + 4;
        /* cracked rock in reach breaks */
        for (var r = Math.floor(y0 / T); r <= Math.floor((y1 - 0.01) / T); r++)
            for (var c = Math.floor(x0 / T); c <= Math.floor((x1 - 0.01) / T); c++) if (tileAt(W, c, r) === 'R') breakRock(c, r);
        W.critters.forEach(function (k) {
            if (k.dead || k.x + k.w < x0 || k.x > x1 || k.y + k.h < y0 - 6 || k.y > y1) return;
            knock(k, k.x + k.w / 2 < cx ? -1 : 1);
        });
    }
    function breakRock(c, r) {
        W.g[r][c] = '.';
        puff(c * T + 16, r * T + 16, 12, W.region === 'ice' ? '#d8f1ff' : '#a39282', 140);
        api.sfx('pop'); bump(3);
        addScore(5);
    }
    function knock(k, dir) {
        k.dead = true; k.fly = { vx: dir * 260, vy: -320, rot: 0 };
        api.sfx('pop');
        addScore(25, k.x + 12, k.y);
    }
    function doRoar() {
        if (roarCd > 0) return;
        roarT = 0.7; roarCd = L.roar; hissT = 0.9;
        api.sfx('hit'); api.sfx('lose');
        bump(4);
        var cx = P.x + P.w / 2, cy = P.y;
        trikes.forEach(function (t) {
            if (Math.abs(t.x + t.w / 2 - cx) < 320 && Math.abs(t.y - cy) < 160) { t.scared = L.scare; t.mode = 'scared'; }
        });
        pteros.forEach(function (q) {
            if (Math.abs(q.x - cx) < 360 && Math.abs(q.y - cy) < 300) { q.mode = 'flee'; q.t = 0; }
        });
        var n = W.neck;
        if (n && !n.awake && Math.abs(n.x + 40 - cx) < 340 && Math.abs(n.y - cy - P.h) < 160) { n.awake = true; n.t = 0; api.cat('wow'); setTip('It is waking up!', 2); }
    }

    /* ---------- update ---------- */
    var acc = 0, STEP = 1 / 120;
    function update(dt) {
        time += dt;
        if (tipT > 0) { tipT -= dt; if (tipT <= 0) tipEl.classList.add('dv-off'); }
        if (shake > 0) shake = Math.max(0, shake - dt * 30);
        stepFx(dt);
        if (state === 'intro') {
            stateT += dt;
            if (stateT > 1.5 || (stateT > 0.4 && anyHit())) { state = 'play'; hideCard(); }
            hit = {};
            return;
        }
        if (state === 'dead') {
            stateT += dt;
            if (stateT > 1.2 && lives > 0) { state = 'play'; hearts = L.hearts; updHud(); spawnAt(cp, false); }
            hit = {};
            return;
        }
        if (state === 'clear' || state === 'ending') { stepEnd(dt); hit = {}; return; }
        if (state !== 'play') { hit = {}; return; }
        acc += dt;
        var first = true;
        while (acc >= STEP) { acc -= STEP; tick(STEP, first); first = false; }
        if (!first) hit = {};                      /* presses wait for the next physics step (fast screens) */
    }
    function anyHit() { for (var k in hit) if (hit[k]) return true; return false; }
    function tick(dt, first) {
        var inp = { l: held('l'), r: held('r'), jump: held('j'), jumpHit: first && !!hit.j, downHit: first && !!hit.d };
        if (inp.l || inp.r || inp.jumpHit) moved = true;
        if (first && hit.t) doSwipe();
        if (first && hit.o) doRoar();
        if (inv > 0) inv -= dt;
        if (swipeT > 0) swipeT -= dt;
        if (swipeCd > 0) swipeCd -= dt;
        if (roarT > 0) roarT -= dt;
        if (roarCd > 0) roarCd -= dt;
        if (vineLock > 0) vineLock -= dt;
        stepWorld(dt);
        if (state !== 'play') return;
        /* riding a log: carried along */
        if (P.ground && P.plat && P.plat.dx) stepCarry(P.plat.dx);
        if (vine) stepVine(dt, inp);
        else {
            var ev = stepBody(P, inp, dt, W);
            if (ev.jump) { api.sfx('jump'); puff(P.x + P.w / 2, P.y + P.h, 4, '#fff', 50); }
            if (ev.glide) api.sfx('tap');
            if (ev.stompStart) api.sfx('move');
            if (ev.landed) land(ev);
            if (!vine && vineLock <= 0 && !P.ground) grabVine();
        }
        if (P.ground && !P.plat && safeHere()) { lastSafe.x = P.x; lastSafe.y = P.y; }
        var hz = hazard(W, P);
        if (hz) { hazardHit(hz); return; }
        collide();
    }
    function stepCarry(dx) {
        var nx = P.x + dx, r0 = Math.floor(P.y / T), r1 = Math.floor((P.y + P.h - 0.01) / T), c = Math.floor((dx > 0 ? nx + P.w - 0.01 : nx) / T);
        for (var r = r0; r <= r1; r++) if (solidAt(W, c, r)) return false;
        P.x = nx; return true;
    }
    /* a good spot to come back to after water or thorns: firm ground, no hazard next to it */
    function safeHere() {
        var c0 = Math.floor((P.x - 8) / T), c1 = Math.floor((P.x + P.w + 8) / T), r = Math.floor((P.y + P.h + 1) / T);
        for (var c = c0; c <= c1; c++) {
            var ch = tileAt(W, c, r);
            if (!SOLID[ch] || ch === 's' || ch === 'R') return false;
            if (HAZARD[tileAt(W, c, r - 1)]) return false;
        }
        return !(lavaOn && P.x < lavaX + 9 * T);
    }
    function land(ev) {
        var cx = P.x + P.w / 2;
        if (ev.stomp) {
            api.sfx('hit'); bump(5); stompFx = 0.3;
            puff(cx, P.y + P.h, 10, '#d9cbb4', 120);
            /* the stomp cracks rock under the feet */
            var r = Math.floor((P.y + P.h + 2) / T);
            for (var c = Math.floor(P.x / T); c <= Math.floor((P.x + P.w - 0.01) / T); c++) if (tileAt(W, c, r) === 'R') breakRock(c, r);
        } else if (ev.fallV > 500) puff(cx, P.y + P.h, 4, '#fff', 40);
        /* a sinking stone starts to go under */
        var sr = Math.floor((P.y + P.h + 1) / T);
        for (c = Math.floor(P.x / T); c <= Math.floor((P.x + P.w - 0.01) / T); c++) {
            var key = c + ',' + sr;
            if (tileAt(W, c, sr) === 's' && !W.sunk[key]) W.sunk[key] = -0.55;   /* negative: still holding, counting up */
        }
    }
    function grabVine() {
        var cx = P.x + P.w / 2, cy = P.y + P.h / 2;
        for (var i = 0; i < W.vines.length; i++) {
            var tp = vineTip(W.vines[i], time);
            var dx = tp.x - cx, dy = tp.y + 8 - cy;
            if (dx * dx + dy * dy < GRAB * GRAB) { vine = W.vines[i]; P.stomping = false; P.gliding = false; api.sfx('tap'); return; }
        }
    }
    function stepVine(dt, inp) {
        var tp = vineTip(vine, time);
        P.x = tp.x - P.w / 2; P.y = tp.y + 8 - P.h / 2; P.vx = tp.vx; P.vy = tp.vy;
        if (inp.r) P.face = 1; else if (inp.l) P.face = -1;
        if (inp.jumpHit || inp.downHit) {
            vine = null; vineLock = 0.35;
            P.vx = tp.vx + (inp.r ? 60 : inp.l ? -60 : 0);
            P.vy = inp.downHit ? 0 : Math.min(tp.vy, 0) - 420;
            P.jumped = false; P.glideT = PHYS.glideTime; P.ground = false;
            api.sfx('jump');
        }
    }
    function overlap(a, x, y, w, h) { return a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y; }
    function collide() {
        var cx = P.x + P.w / 2;
        W.berries.forEach(function (b) {
            if (b.got || Math.abs(b.x - cx) > 20 || Math.abs(b.y - (P.y + P.h / 2)) > 22) return;
            b.got = true; api.sfx('point'); addScore(10, b.x, b.y);
            puff(b.x, b.y, 5, '#c2255c', 60);
            if (++berryPips >= 5) { berryPips = 0; if (hearts < L.hearts) { hearts++; updHud(); texts.push({ x: b.x, y: b.y - 14, t: 0, s: '♥' }); } }
        });
        W.eggs.forEach(function (e) {
            if (e.got || Math.abs(e.x - cx) > 20 || Math.abs(e.y - (P.y + P.h / 2)) > 24) return;
            e.got = true; eggsGot++; api.sfx('win'); addScore(100, e.x, e.y); cheerT = 1.2;
            api.cat('wow'); puff(e.x, e.y, 12, '#fff3bf', 90); updHud();
        });
        W.cps.forEach(function (c) {
            if (c.on || !overlap(P, c.x, c.y - T, T, 2 * T)) return;
            c.on = true; cp = { x: c.x + 3, y: c.y + T - PHYS.h }; api.sfx('point'); cheerT = 0.9;
            puff(c.x + 16, c.y - 10, 10, '#b2f2bb', 80); setTip('Checkpoint', 1.5);
        });
        W.critters.forEach(function (k) {
            if (k.dead || !overlap(P, k.x + 2, k.y + 2, k.w - 4, k.h - 2)) return;
            var fromAbove = P.vy > 50 && P.y + P.h - k.y < 14;
            if (fromAbove && k.kind === 'k') { knock(k, P.face); P.vy = -380; P.jumped = false; P.stomping = false; return; }
            if (fromAbove && k.kind === 'x') {
                if (P.stomping) { knock(k, P.face); P.vy = -380; P.stomping = false; }
                else { P.vy = -330; api.sfx('tap'); }   /* its shell is too hard: only a stomp cracks it */
                return;
            }
            hurt(k.x + k.w / 2);
        });
        trikes.forEach(function (t) {
            if (t.mode === 'scared' || !overlap(P, t.x + 6, t.y + 6, t.w - 12, t.h - 6)) return;
            hurt(t.x + t.w / 2);
        });
        pteros.forEach(function (q) {
            if (q.mode === 'flee' || Math.abs(q.x - cx) > 24 || Math.abs(q.y - (P.y + P.h / 2)) > 20) return;
            hurt(q.x);
        });
        W.rocks.forEach(function (r) {
            if (r.mode === 'fall' && Math.abs(r.x - cx) < 18 && r.y + 12 > P.y && r.y - 12 < P.y + P.h) { hurt(r.x); shatter(r); }
        });
        if (lavaOn && P.x < lavaX && state === 'play') {
            hearts = 0; api.sfx('hit'); puff(P.x + P.w / 2, P.y + P.h, 14, '#ff8a3d', 120); loseLife();
        }
        if (W.exit && overlap(P, W.exit.x, W.exit.y, W.exit.w, W.exit.h)) levelDone();
    }
    function shatter(r) {
        r.mode = 'gone'; r.t = 0;
        puff(r.x, r.y, 8, W.region === 'ice' ? '#e3f6ff' : '#8d7b6a', 110);
    }

    function stepWorld(dt) {
        var cx = P.x + P.w / 2, cy = P.y + P.h / 2;
        /* small critters */
        W.critters.forEach(function (k) {
            k.t += dt;
            if (k.dead) {
                if (k.fly) { k.x += k.fly.vx * dt; k.y += k.fly.vy * dt; k.fly.vy += 1400 * dt; k.fly.rot += dt * 12; }
                return;
            }
            if (k.kind === 'p') { k.open = Math.abs(k.x + 12 - cx) < 70 && Math.abs(k.y - cy) < 60; return; }
            if (Math.abs(k.x - cx) > 900) return;
            var nx = k.x + k.vx * dt, front = k.vx > 0 ? nx + k.w : nx, c = Math.floor(front / T), r = Math.floor((k.y + k.h - 2) / T);
            var floorOk = solidAt(W, c, r + 1) || tileAt(W, c, r + 1) === '=';
            if (solidAt(W, c, r) || !floorOk || c <= 0 || c >= W.cols - 1) k.vx = -k.vx; else k.x = nx;
        });
        /* trikes: walk, charge when the dino is ahead of them, cower when roared at */
        trikes.forEach(function (t) {
            t.anim += dt;
            if (t.mode === 'scared') {
                t.scared -= dt;
                if (t.scared <= 0) { t.mode = 'rest'; t.t = 0.8; }
                return;
            }
            if (Math.abs(t.x - cx) > 1000) return;
            var ahead = (cx - (t.x + t.w / 2)) * t.dir > 0, near = Math.abs(cx - (t.x + t.w / 2)) < 240 && Math.abs(cy - (t.y + t.h / 2)) < 70;
            if (t.mode === 'rest') { t.t -= dt; if (t.t <= 0) t.mode = 'walk'; return; }
            if (t.mode === 'walk' && near) {
                if (!ahead) { t.dir = -t.dir; }
                t.mode = 'charge'; t.t = 0.35; api.sfx('move');
            }
            var spd = t.mode === 'charge' ? (t.t > 0 ? 0 : L.charge) : 40;
            if (t.mode === 'charge' && t.t > 0) t.t -= dt;
            var tarSlow = touchesTar(t) ? 0.5 : 1;
            var nx = t.x + t.dir * spd * tarSlow * dt, front = t.dir > 0 ? nx + t.w : nx, c = Math.floor(front / T);
            var rb = Math.floor((t.y + t.h - 2) / T), rt = Math.floor((t.y + 4) / T), blocked = false;
            for (var r = rt; r <= rb; r++) if (solidAt(W, c, r)) blocked = true;
            if (!solidAt(W, c, rb + 1)) blocked = true;
            if (blocked) {
                if (t.mode === 'charge') { t.mode = 'rest'; t.t = 1; bump(3); puff(t.dir > 0 ? t.x + t.w : t.x, t.y + t.h / 2, 6, '#d9cbb4', 80); }
                t.dir = -t.dir;
            } else t.x = nx;
            if (t.mode === 'charge' && Math.random() < dt * 20) puff(t.x + (t.dir > 0 ? 10 : t.w - 10), t.y + t.h, 1, '#e8dcc6', 30);
        });
        /* pterosaurs: circle, then dive at where the dino was */
        pteros.forEach(function (q) {
            q.t += dt;
            if (q.mode === 'fly') {
                q.x += (q.hx + Math.sin(q.t * 0.8) * 90 - q.x) * Math.min(1, dt * 3);
                q.y += (q.hy + Math.sin(q.t * 1.7) * 14 - q.y) * Math.min(1, dt * 3);
                if (Math.abs(cx - q.x) < 210 && cy > q.y + 40 && cy - q.y < 360 && q.t > 2) { q.mode = 'aim'; q.t = 0; api.sfx('tap'); }
            } else if (q.mode === 'aim') {
                if (q.t > 0.75) { q.mode = 'dive'; q.t = 0; var dx = cx - q.x, dy = cy - q.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy)); q.vx = dx / d * 330 * L.crit; q.vy = dy / d * 330 * L.crit; }
            } else if (q.mode === 'dive') {
                q.x += q.vx * dt; q.y += q.vy * dt;
                if (q.t > 1 || q.y > W.rows * T - 2 * T) { q.mode = 'back'; q.t = 0; }
            } else if (q.mode === 'back' || q.mode === 'flee') {
                var ty = q.mode === 'flee' ? q.hy - 260 : q.hy, dx2 = q.hx - q.x, dy2 = ty - q.y, d2 = Math.max(1, Math.sqrt(dx2 * dx2 + dy2 * dy2));
                var sp = q.mode === 'flee' ? 220 : 150;
                if (d2 > 4) { q.x += dx2 / d2 * Math.min(d2, sp * dt); q.y += dy2 / d2 * Math.min(d2, sp * dt); }
                if (q.mode === 'back' && d2 < 6) { q.mode = 'fly'; q.t = 0; }
                if (q.mode === 'flee' && q.t > 5) { q.mode = 'back'; q.t = 0; }
            }
        });
        /* geysers: rest, bubble (warning), blow */
        W.geysers.forEach(function (gy) {
            gy.t += dt;
            var cyc = L.rest + 0.8 + 1;
            var u = gy.t % cyc;
            gy.phase = u < L.rest ? 0 : u < L.rest + 0.8 ? 1 : 2;
            if (gy.phase === 2 && P.x + P.w > gy.x + 4 && P.x < gy.x + T - 4 && P.y + P.h > gy.y - 2.2 * T && P.y + P.h <= gy.y + 1 && P.vy > -PHYS.geyser * 0.8) {
                P.vy = -PHYS.geyser; P.ground = false; P.plat = null; P.jumped = false; P.stomping = false; P.gliding = false;
                P.glideT = PHYS.glideTime; vine = null;
                api.sfx('jump'); puff(gy.x + 16, gy.y - 10, 8, '#e7f5ff', 120);
            }
        });
        /* falling rocks and icicles */
        W.rocks.forEach(function (r) {
            r.t += dt;
            if (r.mode === 'wait' && Math.abs(cx - r.x) < 50 && cy > r.y) { r.mode = 'shake'; r.t = 0; }
            else if (r.mode === 'shake' && r.t > L.shake) { r.mode = 'fall'; r.vy = 0; }
            else if (r.mode === 'fall') {
                r.vy += 1500 * dt; r.y += r.vy * dt;
                var rr = Math.floor((r.y + 10) / T), c = Math.floor(r.x / T);
                if (solidAt(W, c, rr) || HAZARD[tileAt(W, c, rr)] || r.y > W.rows * T) { shatter(r); api.sfx('tap'); }
            } else if (r.mode === 'gone' && r.t > 2.4) { r.mode = 'wait'; r.y = r.y0; r.t = 0; }
        });
        /* logs */
        W.logs.forEach(function (l) {
            var sp = 55 * (diff === 'hard' ? 1.25 : diff === 'easy' ? 0.85 : 1), nx = l.x + l.dir * sp * dt;
            if (nx < l.min) { nx = l.min; l.dir = 1; } else if (nx > l.max) { nx = l.max; l.dir = -1; }
            l.dx = nx - l.x; l.x = nx;
        });
        /* sinking stones: hold for a moment, sink, come back */
        Object.keys(W.sunk).forEach(function (key) {
            var v = W.sunk[key] + dt;
            if (v >= 0 && W.sunk[key] < 0) { var pr = key.split(','); puff(+pr[0] * T + 16, +pr[1] * T, 6, '#cdeeff', 50); }
            if (v > 2.6) delete W.sunk[key]; else W.sunk[key] = v;
        });
        /* the long-neck rises and lays its neck over the gap */
        var n = W.neck;
        if (n && n.awake) { n.t += dt; if (n.t > 1.6 && n.bridge.off) { n.bridge.off = false; api.sfx('point'); } }
        /* meteors: a shadow first, then the rock */
        if (REGIONS[W.region].meteors && moved) {
            metT -= dt;
            if (metT <= 0) { metT = L.met * (0.7 + Math.random() * 0.6); dropMeteor(); }
        }
        meteors.forEach(function (m) {
            m.t += dt;
            if (!m.hit && m.t >= m.warn) {
                m.hit = true; bump(5); api.sfx('hit');
                puff(m.x, m.gy, 14, '#ff922b', 160);
                if (Math.abs(P.x + P.w / 2 - m.x) < 34 && Math.abs(P.y + P.h - m.gy) < 40) hurt(m.x);
            }
        });
        meteors = meteors.filter(function (m) { return m.t < m.warn + 0.6; });
        /* the lava flood */
        if (lavaOn && (moved || time > 0)) {
            var stop = W.neck ? (W.neck.c - 4) * T : 1e9;
            if (moved) lavaX = Math.min(stop, lavaX + L.lava * dt);
        }
    }
    function touchesTar(t) { return !!touches(W, t.x, t.y + t.h - 8, t.w, 8, { '~': 1 }); }
    function dropMeteor() {
        var tx = P.x + P.w / 2 + P.vx * 0.9 + (Math.random() * 2 - 1) * 70;
        if (W.neck && tx > W.neck.x - 4 * T) return;     /* none at the long-neck: waking it needs a calm moment */
        if (Math.abs(tx - cp.x) < 80 && inv > 0) return;
        var c = Math.floor(tx / T);
        if (c < 1 || c >= W.cols - 1) return;
        for (var r = 0; r < W.rows; r++) if (solidAt(W, c, r) || HAZARD[tileAt(W, c, r)]) break;
        meteors.push({ x: tx, gy: r * T, t: 0, warn: L.warn, hit: false });
    }
    function levelDone() {
        if (state !== 'play') return;
        var last = lvIdx === LEVELS.length - 1;
        state = last ? 'ending' : 'clear'; stateT = 0; ending = 0;
        addScore(250 + 50 * hearts);
        api.sfx('win'); api.cat('happy'); cheerT = 2; P.vx = 0;
        if (!last) {
            var got = W.eggs.filter(function (e) { return e.got; }).length;
            showCard('<b>Level clear</b><strong>' + esc(LEVELS[lvIdx].name) + '</strong><p>Eggs ' + got + ' of ' + W.eggs.length + '</p>');
        } else { waveT = 9; setTip('Home! Mama is so happy.', 4); }
    }
    function stepEnd(dt) {
        stateT += dt;
        if (state === 'clear') {
            if (stateT > 2.2) { lvIdx++; hideCard(); loadLevel(); }
            return;
        }
        /* the ending: walk up to Mama, she nuzzles, the volcano blows behind, the cat waves */
        var mx = W.exit.x - 40;
        if (P.x < mx) { P.x = Math.min(mx, P.x + 90 * dt); P.face = 1; }
        if (stateT > 1.2 && stateT - dt <= 1.2) { api.sfx('point'); bump(8); }
        if (stateT > 1.2 && Math.random() < dt * 8) puff(W.exit.x + 30 + Math.random() * 40, W.exit.y - 10, 1, '#ff8fab', 40);
        if (stateT > 4.2 && !ending) {
            ending = 1;
            addScore(300 * lives);
            api.end(endOpts({ score: score, win: true, text: 'Home before the eruption!\nScore ' + score + ', eggs ' + eggsGot + ' of ' + eggsAll }));
        }
    }
    function stepFx(dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
            var p = parts[i]; p.t += dt;
            if (p.t > p.life) { parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gr * dt;
        }
        for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.9) texts.splice(i, 1); }
        if (wobT > 0) wobT -= dt;
        if (cheerT > 0) cheerT -= dt;
        if (hissT > 0) hissT -= dt;
        if (stompFx > 0) stompFx -= dt;
        if (W && state === 'play') {
            var f = roarCd > 0 ? 1 - roarCd / L.roar : 1;
            hud.roar.style.width = Math.round(f * 100) + '%';
            roarBtn.classList.toggle('dv-cool', roarCd > 0);
        }
    }

    /* ---------- camera ---------- */
    function camTo(snap) {
        if (!P) return;
        var ww = vw / zoom, wh = vh / zoom, lw = W.cols * T, lh = W.rows * T;
        var tx = P.x + P.w / 2 + P.face * Math.min(70, ww * 0.12) - ww / 2;
        var ty = P.y + P.h / 2 - wh * 0.55;
        tx = lw <= ww ? (lw - ww) / 2 : Math.max(0, Math.min(lw - ww, tx));
        ty = lh <= wh ? lh - wh : Math.max(0, Math.min(lh - wh, ty));
        if (snap) { cam.x = tx; cam.y = ty; return; }
        cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.1;
    }

    /* ---------- drawing ---------- */
    var PAL = {
        forest:  { sky: ['#bfe6f2', '#e6f6e0'], far: '#9fd3a8', mid: '#74b97f', top: '#6cc04a', dirt: '#8a5a3c', dirt2: '#94623f', ledge: '#9a6b42' },
        tar:     { sky: ['#f6c48f', '#f9e3c2'], far: '#d79a6b', mid: '#b97a4f', top: '#c9b25a', dirt: '#8f6a45', dirt2: '#987049', ledge: '#7d5a3a' },
        river:   { sky: ['#a9dcf5', '#e7f6fb'], far: '#a7d1c6', mid: '#7fb7a3', top: '#7cc46a', dirt: '#7b6a58', dirt2: '#83715e', ledge: '#8a6a48' },
        ice:     { sky: ['#20345a', '#3c5c88'], far: '#2c4877', mid: '#3a5f92', top: '#dff4ff', dirt: '#5d7fae', dirt2: '#6386b5', ledge: '#9cc6e6' },
        volcano: { sky: ['#5b2a3a', '#d9714e'], far: '#6e3a3c', mid: '#4f2b30', top: '#5a4a4a', dirt: '#3d3236', dirt2: '#43373b', ledge: '#6b4b3a' }
    };
    function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
    function draw() {
        var pal = PAL[W ? W.region : 'forest'];
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var sky = g.createLinearGradient(0, 0, 0, vh);
        sky.addColorStop(0, pal.sky[0]); sky.addColorStop(1, pal.sky[1]);
        g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
        if (!W) return;
        var sx = shake > 0 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        drawBack(pal);
        var s = dpr * zoom;
        g.setTransform(s, 0, 0, s, Math.round((-cam.x + sx) * s), Math.round((-cam.y + sy) * s));
        var ww = vw / zoom, wh = vh / zoom;
        var c0 = Math.max(0, Math.floor(cam.x / T) - 1), c1 = Math.min(W.cols - 1, Math.ceil((cam.x + ww) / T) + 1);
        var r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(W.rows - 1, Math.ceil((cam.y + wh) / T));
        drawLiquids(c0, c1, r0, r1, pal);
        drawTiles(c0, c1, r0, r1, pal);
        drawProps(c0, c1);
        drawThings();
        drawPlayer();
        drawFx();
        if (lavaOn) drawLava(wh);
    }
    function drawBack(pal) {
        var reg = W.region, i, x, b;
        var horizon = vh * 0.62;
        if (reg === 'ice') {
            /* the cave: dark rock walls with glowing crystals */
            g.fillStyle = pal.far;
            for (i = -1; i < vw / 140 + 2; i++) {
                b = Math.floor(cam.x * 0.25 * zoom / 140) + i; x = b * 140 - cam.x * 0.25 * zoom;
                var hh = 60 + hash(b) * 120;
                g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, hh); g.lineTo(x + 140, 0); g.fill();
                g.beginPath(); g.moveTo(x, vh); g.lineTo(x + 70, vh - hh * 0.8); g.lineTo(x + 140, vh); g.fill();
                g.fillStyle = 'rgba(160,220,255,' + (0.35 + 0.2 * Math.sin(time * 1.5 + b)) + ')';
                g.beginPath(); g.moveTo(x + 60, vh - hh * 0.5); g.lineTo(x + 70, vh - hh * 0.8 - 10); g.lineTo(x + 80, vh - hh * 0.5); g.fill();
                g.fillStyle = pal.far;
            }
            return;
        }
        if (reg === 'volcano') {
            /* the volcano itself, smoking and glowing (erupting at the very end) */
            var vx = vw * 0.68 - cam.x * 0.03, top = horizon - vh * 0.38;
            g.fillStyle = '#3c2027';
            g.beginPath(); g.moveTo(vx - vw * 0.5, horizon + 40); g.lineTo(vx - 50, top); g.lineTo(vx + 50, top); g.lineTo(vx + vw * 0.5, horizon + 40); g.fill();
            var glow = state === 'ending' && stateT > 1.2 ? 1 : 0.5 + 0.2 * Math.sin(time * 2);
            g.fillStyle = 'rgba(255,120,40,' + glow + ')';
            g.beginPath(); g.moveTo(vx - 50, top); g.lineTo(vx + 50, top); g.lineTo(vx + 30, top + 26); g.lineTo(vx - 30, top + 26); g.fill();
            g.fillStyle = 'rgba(90,70,80,.55)';
            for (i = 0; i < 5; i++) {
                var u = ((time * 0.15 + i / 5) % 1), rr = 20 + u * 60;
                g.beginPath(); g.arc(vx + Math.sin(i * 2 + time * 0.3) * 30 * u, top - u * vh * 0.35, rr, 0, TAU); g.fill();
            }
            if (state === 'ending' && stateT > 1.2) {
                g.fillStyle = '#ff7b2e';
                for (i = 0; i < 14; i++) {
                    var a2 = -Math.PI / 2 + (hash(i) - 0.5) * 1.2, k = ((stateT - 1.2) * 0.8 + hash(i + 9)) % 1;
                    g.beginPath(); g.arc(vx + Math.cos(a2) * k * 160, top + Math.sin(a2) * k * 200 + k * k * 120, 6 - k * 3, 0, TAU); g.fill();
                }
            }
        }
        /* far hills and a middle row of plants, in parallax */
        g.fillStyle = pal.far;
        g.beginPath(); g.moveTo(0, vh);
        for (x = 0; x <= vw + 20; x += 20) {
            var wx = (x + cam.x * zoom * 0.15) / 90;
            g.lineTo(x, horizon - 30 - 34 * Math.sin(wx) - 18 * Math.sin(wx * 2.3 + 1));
        }
        g.lineTo(vw, vh); g.fill();
        g.fillStyle = pal.mid;
        var step = 120, off = cam.x * zoom * 0.35;
        for (i = Math.floor(off / step) - 1; i < (off + vw) / step + 1; i++) {
            x = i * step - off + hash(i) * 50;
            var hgt = 50 + hash(i + 3) * 60, base = horizon + 50;
            if (reg === 'forest' || reg === 'river') {           /* tree ferns */
                g.fillRect(x - 3, base - hgt, 6, hgt);
                for (var f = 0; f < 5; f++) {
                    var ang = -Math.PI + f * Math.PI / 4;
                    g.beginPath(); g.ellipse(x + Math.cos(ang) * 22, base - hgt + Math.sin(ang) * 10 + 6, 26, 6, ang * 0.6, 0, TAU); g.fill();
                }
            } else if (reg === 'tar') {                          /* dry rocks and bones */
                g.beginPath(); g.moveTo(x - 30, base); g.lineTo(x - 10, base - hgt * 0.7); g.lineTo(x + 15, base - hgt * 0.5); g.lineTo(x + 32, base); g.fill();
            } else {                                             /* dark spires */
                g.beginPath(); g.moveTo(x - 20, base); g.lineTo(x, base - hgt); g.lineTo(x + 20, base); g.fill();
            }
        }
        if (reg === 'river') {                                   /* drifting mist */
            g.fillStyle = 'rgba(255,255,255,.35)';
            for (i = 0; i < 3; i++) g.fillRect(0, horizon + 20 + i * 40 + Math.sin(time * 0.5 + i) * 6, vw, 10);
        }
        g.fillStyle = pal.mid; g.fillRect(0, horizon + 50, vw, vh);
    }
    function drawLiquids(c0, c1, r0, r1, pal) {
        for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
            var ch = W.g[r][c], x = c * T, y = r * T, top = tileAt(W, c, r - 1) !== ch;
            if (ch === 'w') {
                g.fillStyle = top ? '#5fb4e0' : '#4a9ccc';
                var wy = top ? y + 6 + (RM ? 0 : Math.sin(time * 2 + c) * 2) : y;
                g.fillRect(x, wy, T + 0.5, y + T - wy + 0.5);
                if (top) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + 4 + ((time * 10 + c * 7) % 20), wy + 3, 8, 2); }
            } else if (ch === 'L') {
                g.fillStyle = top ? '#ff7b2e' : '#e8590c';
                var ly = top ? y + 8 + (RM ? 0 : Math.sin(time * 1.5 + c * 0.7) * 2) : y;
                g.fillRect(x, ly, T + 0.5, y + T - ly + 0.5);
                if (top) { g.fillStyle = '#ffd43b'; g.fillRect(x + ((time * 14 + c * 11) % 24), ly + 2, 6, 3); }
            } else if (ch === '~') {
                g.fillStyle = '#2b2233'; g.fillRect(x, y + 6, T, T - 6);
                g.fillStyle = '#4b3b5c';
                var bu = (time * 0.7 + hash(c)) % 1;
                g.beginPath(); g.arc(x + 8 + hash(c + 1) * 16, y + 8 - bu * 4, 2 + bu * 3, 0, TAU); g.fill();
            } else if (ch === '^') {
                g.fillStyle = W.region === 'ice' ? '#bde3ff' : '#5b7f3a';
                g.beginPath();
                for (var k = 0; k < 4; k++) { g.moveTo(x + k * 8, y + T); g.lineTo(x + k * 8 + 4, y + 10 + (k % 2) * 6); g.lineTo(x + k * 8 + 8, y + T); }
                g.fill();
            }
        }
    }
    function drawTiles(c0, c1, r0, r1, pal) {
        for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
            var ch = W.g[r][c], x = c * T, y = r * T;
            if (ch === '#' || ch === 'i') {
                var open = !SOLID[tileAt(W, c, r - 1)] && r > 0;
                g.fillStyle = ch === 'i' ? '#a9d8f5' : hash(c * 7 + r * 13) < 0.3 ? pal.dirt2 : pal.dirt;
                g.fillRect(x, y, T + 0.5, T + 0.5);
                if (r > 0 && !SOLID[tileAt(W, c, r + 1)] && r < W.rows - 1) {   /* an overhang: a darker underside */
                    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + T - 6, T + 0.5, 6);
                    if (W.region === 'ice' && hash(c) < 0.5) { g.fillStyle = '#cfeeff'; g.beginPath(); g.moveTo(x + 8, y + T); g.lineTo(x + 12, y + T + 9); g.lineTo(x + 16, y + T); g.fill(); }
                }
                if (ch === 'i') { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 4, y + 8, 10, 3); }
                else if (hash(c * 31 + r) < 0.25) { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(x + 10 + hash(c) * 12, y + 14 + hash(r) * 10, 3, 0, TAU); g.fill(); }
                if (open) {
                    g.fillStyle = ch === 'i' ? '#e8f7ff' : pal.top;
                    g.fillRect(x, y, T + 0.5, 7);
                    if (ch === '#' && (W.region === 'forest' || W.region === 'river')) { g.beginPath(); g.moveTo(x + 6, y + 7); g.lineTo(x + 9, y + 11); g.lineTo(x + 12, y + 7); g.moveTo(x + 20, y + 7); g.lineTo(x + 23, y + 12); g.lineTo(x + 26, y + 7); g.fill(); }
                    if (W.region === 'volcano' && hash(c) < 0.3) { g.fillStyle = '#ff7b2e'; g.fillRect(x + 8 + hash(c + 2) * 12, y + 10, 2, 10); }
                }
            } else if (ch === 'R') {
                g.fillStyle = W.region === 'ice' ? '#b9def5' : '#a39282'; g.fillRect(x + 1, y + 1, T - 2, T - 2);
                g.strokeStyle = W.region === 'ice' ? '#6fa3c8' : '#5e4f43'; g.lineWidth = 2;
                g.beginPath(); g.moveTo(x + 6, y + 4); g.lineTo(x + 14, y + 14); g.lineTo(x + 10, y + 22); g.lineTo(x + 18, y + 29);
                g.moveTo(x + 14, y + 14); g.lineTo(x + 25, y + 11); g.stroke();
            } else if (ch === 'o' || ch === 's') {
                var sink = ch === 's' ? W.sunk[c + ',' + r] : 0, dy = sink > 0 ? Math.min(20, sink * 30) : 0;
                var wob = sink < 0 && !RM ? Math.sin(time * 40) * 1.5 : 0;
                g.fillStyle = ch === 's' ? '#a1937f' : '#8c8c8c';
                g.beginPath(); g.ellipse(x + 16 + wob, y + 14 + dy, 17, 13, 0, 0, TAU); g.fill();
                g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(x + 11 + wob, y + 8 + dy, 7, 3, 0, 0, TAU); g.fill();
                if (ch === 's') { g.strokeStyle = '#6d604f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 8, y + 14 + dy); g.lineTo(x + 24, y + 16 + dy); g.stroke(); }
            } else if (ch === '=') {
                g.fillStyle = pal.ledge; g.fillRect(x, y, T + 0.5, 9);
                g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + 7, T + 0.5, 2);
            } else if (ch === 'h') {
                g.fillStyle = '#7a5232'; g.fillRect(x, y + 10, T + 0.5, 8);
                g.fillStyle = '#5aa845';
                g.beginPath(); g.ellipse(x + 8, y + 22, 9, 6, 0.3, 0, TAU); g.ellipse(x + 24, y + 9, 9, 6, -0.3, 0, TAU); g.fill();
            }
        }
    }
    function drawProps(c0, c1) {
        var x0 = c0 * T, x1 = (c1 + 1) * T;
        /* checkpoints: a fern totem whose leaves light up */
        W.cps.forEach(function (c) {
            if (c.x < x0 - T || c.x > x1) return;
            var x = c.x + 16, y = c.y + T;
            g.fillStyle = '#7a5232'; g.fillRect(x - 3, y - 44, 6, 44);
            g.fillStyle = c.on ? '#51cf66' : '#a7b8a0';
            for (var i = 0; i < 3; i++) {
                g.beginPath(); g.ellipse(x - 9, y - 40 + i * 9, 10, 4, -0.5, 0, TAU); g.ellipse(x + 9, y - 40 + i * 9, 10, 4, 0.5, 0, TAU); g.fill();
            }
            if (c.on) { g.fillStyle = 'rgba(255,240,150,.5)'; g.beginPath(); g.arc(x, y - 48, 6 + Math.sin(time * 4), 0, TAU); g.fill(); }
        });
        /* berries and eggs */
        W.berries.forEach(function (b) {
            if (b.got || b.x < x0 || b.x > x1) return;
            var by = b.y + (RM ? 0 : Math.sin(time * 3 + b.c) * 2);
            g.fillStyle = '#c2255c'; g.beginPath(); g.arc(b.x - 4, by + 2, 5, 0, TAU); g.arc(b.x + 4, by + 2, 5, 0, TAU); g.arc(b.x, by - 4, 5, 0, TAU); g.fill();
            g.fillStyle = '#ff8fab'; g.beginPath(); g.arc(b.x - 5, by, 1.6, 0, TAU); g.fill();
            g.fillStyle = '#4c9a3a'; g.fillRect(b.x - 1, by - 12, 2, 5);
        });
        W.eggs.forEach(function (e) {
            if (e.got || e.x < x0 || e.x > x1) return;
            var ey = e.y + (RM ? 0 : Math.sin(time * 2 + e.c) * 1.5);
            g.fillStyle = 'rgba(255,240,170,.45)'; g.beginPath(); g.arc(e.x, ey, 15 + Math.sin(time * 3) * 2, 0, TAU); g.fill();
            g.fillStyle = '#fff8e7'; g.beginPath(); g.ellipse(e.x, ey, 9, 12, 0, 0, TAU); g.fill();
            g.fillStyle = '#74c0fc'; g.beginPath(); g.arc(e.x - 3, ey - 4, 2.2, 0, TAU); g.arc(e.x + 3, ey + 3, 2.6, 0, TAU); g.arc(e.x - 2, ey + 6, 1.6, 0, TAU); g.fill();
            g.strokeStyle = '#c9b48a'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(e.x, ey, 9, 12, 0, 0, TAU); g.stroke();
        });
        /* geysers */
        W.geysers.forEach(function (gy) {
            if (gy.x < x0 - T || gy.x > x1) return;
            var x = gy.x + 16, y = gy.y;
            g.fillStyle = '#6d5c4e'; g.beginPath(); g.ellipse(x, y - 3, 15, 6, 0, 0, TAU); g.fill();
            g.fillStyle = '#2b2233'; g.beginPath(); g.ellipse(x, y - 4, 7, 3, 0, 0, TAU); g.fill();
            var steam = W.region === 'volcano' ? 'rgba(255,230,210,' : 'rgba(225,245,255,';
            if (gy.phase === 1) {
                for (var i = 0; i < 3; i++) { var u = (time * 2 + i / 3) % 1; g.fillStyle = steam + (0.8 - u * 0.6) + ')'; g.beginPath(); g.arc(x + Math.sin(i * 3 + time * 5) * 6, y - 6 - u * 22, 3 + u * 3, 0, TAU); g.fill(); }
            } else if (gy.phase === 2) {
                var hgt = 7.5 * T;
                g.fillStyle = steam + '.75)';
                g.beginPath(); g.moveTo(x - 9, y - 4); g.lineTo(x - 15, y - hgt); g.lineTo(x + 15, y - hgt); g.lineTo(x + 9, y - 4); g.fill();
                for (i = 0; i < 4; i++) { g.beginPath(); g.arc(x + Math.sin(time * 9 + i) * 10, y - hgt + Math.cos(time * 7 + i) * 8, 12, 0, TAU); g.fill(); }
            }
        });
        /* vines */
        W.vines.forEach(function (v) {
            if (v.ax < x0 - 200 || v.ax > x1 + 200) return;
            var tp = vineTip(v, time);
            g.fillStyle = '#7a5232'; g.fillRect(v.ax - 40, v.ay - 22, 80, 10);
            g.fillStyle = W.region === 'ice' ? '#7ea9c9' : '#5aa845';
            g.beginPath(); g.ellipse(v.ax - 30, v.ay - 22, 16, 7, 0, 0, TAU); g.ellipse(v.ax + 28, v.ay - 24, 18, 7, 0, 0, TAU); g.fill();
            g.strokeStyle = W.region === 'ice' ? '#8fb7d6' : '#3f8a35'; g.lineWidth = 4; g.lineCap = 'round';
            g.beginPath(); g.moveTo(v.ax, v.ay - 14);
            g.quadraticCurveTo(v.ax + (tp.x - v.ax) * 0.4, v.ay + (tp.y - v.ay) * 0.55, tp.x, tp.y);
            g.stroke();
            g.fillStyle = '#69c25a'; g.beginPath(); g.ellipse(tp.x, tp.y + 2, 7, 5, tp.a, 0, TAU); g.fill();
        });
        /* falling rocks and icicles */
        W.rocks.forEach(function (r) {
            if (r.x < x0 - T || r.x > x1 + T || r.mode === 'gone') return;
            var wob = r.mode === 'shake' && !RM ? Math.sin(time * 50) * 2 : 0;
            if (W.region === 'ice') {
                g.fillStyle = '#d6f0ff'; g.beginPath(); g.moveTo(r.x - 9 + wob, r.y - 8); g.lineTo(r.x + 9 + wob, r.y - 8); g.lineTo(r.x + wob, r.y + 16); g.fill();
            } else {
                g.fillStyle = '#8d7b6a'; g.beginPath(); g.moveTo(r.x - 12 + wob, r.y - 8); g.lineTo(r.x + 11 + wob, r.y - 9); g.lineTo(r.x + 13 + wob, r.y + 6); g.lineTo(r.x + wob, r.y + 13); g.lineTo(r.x - 13 + wob, r.y + 5); g.fill();
            }
            if (r.mode === 'shake') { g.fillStyle = 'rgba(200,190,170,.7)'; g.fillRect(r.x - 6 + Math.random() * 12, r.y + 10 + Math.random() * 20, 2, 2); }
        });
        /* logs */
        W.logs.forEach(function (l) {
            if (l.x > x1 || l.x + l.w < x0) return;
            var by = l.y + (RM ? 0 : Math.sin(time * 2 + l.c) * 1.2);
            g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(l.x + l.w / 2, by + 8, l.w / 2, 9, 0, 0, TAU); g.fill();
            g.fillStyle = '#b07a4a'; g.beginPath(); g.ellipse(l.x + l.w - 6, by + 8, 5, 8, 0, 0, TAU); g.fill();
            g.strokeStyle = '#6b4325'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(l.x + 14, by + 4); g.lineTo(l.x + 60, by + 4); g.stroke();
        });
        if (W.neck) drawNeck(W.neck);
        if (W.exit) drawExit(W.exit);
        /* meteor shadows and meteors */
        meteors.forEach(function (m) {
            var u = Math.min(1, m.t / m.warn);
            g.fillStyle = 'rgba(30,10,10,' + (0.2 + u * 0.35) + ')';
            g.beginPath(); g.ellipse(m.x, m.gy - 2, 10 + u * 22, 4 + u * 5, 0, 0, TAU); g.fill();
            if (m.t > m.warn - 0.35 && !m.hit) {
                var k = 1 - (m.warn - m.t) / 0.35, mx = m.x + (1 - k) * 120, my = m.gy - (1 - k) * 420;
                g.strokeStyle = 'rgba(255,170,60,.6)'; g.lineWidth = 8; g.beginPath(); g.moveTo(mx + 30, my - 100); g.lineTo(mx, my); g.stroke();
                g.fillStyle = '#ff6b1a'; g.beginPath(); g.arc(mx, my, 11, 0, TAU); g.fill();
                g.fillStyle = '#5c3a2e'; g.beginPath(); g.arc(mx - 2, my + 1, 7, 0, TAU); g.fill();
            }
            if (m.hit) { g.fillStyle = 'rgba(255,140,40,' + (1 - (m.t - m.warn) / 0.6) + ')'; g.beginPath(); g.arc(m.x, m.gy - 8, 30, Math.PI, TAU); g.fill(); }
        });
    }
    function drawExit(e) {
        var x = e.x + 16, y = e.y + 2 * T;
        if (lvIdx === LEVELS.length - 1) {
            /* home: a nest, and Mama */
            g.fillStyle = '#a77c52'; g.beginPath(); g.ellipse(x + 30, y - 6, 46, 12, 0, 0, TAU); g.fill();
            g.save(); g.translate(x + 40, y - 8);
            var nuzzle = state === 'ending' && stateT > 1.2 ? Math.sin(Math.min(1, stateT - 1.2) * Math.PI / 2) * 0.25 : 0;
            dinoShape(-1, 2.4, 0, false, nuzzle, '#5cb85c', '#9ee09e');
            g.restore();
            return;
        }
        /* the way on: a sign with an arrow */
        g.fillStyle = '#7a5232'; g.fillRect(x - 3, y - 46, 6, 46);
        g.fillStyle = '#c99a62'; g.beginPath(); g.moveTo(x - 18, y - 52); g.lineTo(x + 14, y - 52); g.lineTo(x + 24, y - 42); g.lineTo(x + 14, y - 32); g.lineTo(x - 18, y - 32); g.fill();
        g.strokeStyle = '#5a3a1a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 10, y - 42); g.lineTo(x + 10, y - 42); g.moveTo(x + 4, y - 47); g.lineTo(x + 10, y - 42); g.lineTo(x + 4, y - 37); g.stroke();
    }
    function drawNeck(n) {
        var x = n.x, y = n.y;
        var up = n.awake ? Math.min(1, n.t / 1.6) : 0;
        g.fillStyle = '#7c9a6a';
        /* body and legs on the ledge */
        g.beginPath(); g.ellipse(x + 20, y - 34, 50, 28, 0, 0, TAU); g.fill();
        g.fillRect(x - 10, y - 20, 14, 20); g.fillRect(x + 34, y - 20, 14, 20);
        g.beginPath(); g.moveTo(x - 25, y - 40); g.quadraticCurveTo(x - 70, y - 30, x - 80, y - 8); g.lineTo(x - 70, y - 8); g.quadraticCurveTo(x - 50, y - 24, x - 20, y - 24); g.fill();
        g.fillStyle = '#a9c79a'; g.beginPath(); g.ellipse(x + 20, y - 22, 36, 10, 0, 0, TAU); g.fill();
        g.strokeStyle = '#7c9a6a'; g.lineWidth = 14; g.lineCap = 'round';
        if (up < 1) {
            /* asleep: the neck curls down to the ground, head resting */
            var hx = x + 70 + up * (n.to - n.from) * 0.5, hy = y - 10 - up * 60;
            g.beginPath(); g.moveTo(x + 55, y - 40); g.quadraticCurveTo(x + 90, y - 70 - up * 40, hx, hy); g.stroke();
            drawNeckHead(hx, hy, !n.awake);
            if (!n.awake) { g.fillStyle = '#4c6ef5'; g.font = '700 14px sans-serif'; g.fillText('z', hx + 12, hy - 16 - (time * 8 % 10)); g.fillText('Z', hx + 20, hy - 30 - (time * 8 % 12)); }
        } else {
            /* the bridge: the neck stretched over the gap, the head on the far side */
            g.beginPath(); g.moveTo(x + 55, y - 36); g.quadraticCurveTo(x + 70, y - 8, n.from, n.y - 2); g.lineTo(n.to + 4, n.y - 2); g.stroke();
            g.fillStyle = '#a9c79a'; g.fillRect(n.from, n.y + 2, n.to - n.from, 3);
            drawNeckHead(n.to + 12, n.y - 4, false);
        }
    }
    function drawNeckHead(x, y, sleep) {
        g.fillStyle = '#7c9a6a'; g.beginPath(); g.ellipse(x, y, 14, 9, 0, 0, TAU); g.fill();
        g.strokeStyle = '#2f3a2a'; g.lineWidth = 2;
        g.beginPath();
        if (sleep) { g.moveTo(x + 2, y - 3); g.lineTo(x + 8, y - 3); } else g.arc(x + 5, y - 3, 1.8, 0, TAU);
        g.stroke();
    }
    function drawThings() {
        var x0 = cam.x - 80, x1 = cam.x + vw / zoom + 80;
        W.critters.forEach(function (k) {
            if (k.x < x0 || k.x > x1 || (k.dead && (!k.fly || k.y > W.rows * T + 40))) return;
            g.save(); g.translate(k.x + 12, k.y + k.h);
            if (k.dead) { g.translate(0, -k.h / 2); g.rotate(k.fly.rot); g.translate(0, k.h / 2); }
            if (k.vx > 0) g.scale(-1, 1);
            if (k.kind === 'k') {                     /* beetle */
                var st = RM ? 0 : Math.sin(k.t * 14) * 2;
                g.strokeStyle = '#2b2233'; g.lineWidth = 2; g.beginPath();
                g.moveTo(-6, -3); g.lineTo(-9, 0 + st); g.moveTo(0, -3); g.lineTo(0, 0 - st); g.moveTo(6, -3); g.lineTo(9, 0 + st); g.stroke();
                g.fillStyle = '#7048e8'; g.beginPath(); g.ellipse(0, -8, 11, 8, 0, Math.PI, TAU); g.fill(); g.fillRect(-11, -8, 22, 4);
                g.fillStyle = '#b197fc'; g.beginPath(); g.arc(-4, -11, 2, 0, TAU); g.arc(4, -10, 2, 0, TAU); g.fill();
                g.fillStyle = '#2b2233'; g.beginPath(); g.arc(-12, -6, 4, 0, TAU); g.fill();
                g.fillStyle = '#fff'; g.beginPath(); g.arc(-13, -7, 1.4, 0, TAU); g.fill();
            } else if (k.kind === 'x') {              /* crab */
                var cl = RM ? 0 : Math.sin(k.t * 6) * 0.3;
                g.fillStyle = '#e8590c';
                g.beginPath(); g.ellipse(0, -7, 11, 7, 0, 0, TAU); g.fill();
                g.save(); g.translate(-12, -10); g.rotate(-0.4 + cl); g.beginPath(); g.arc(0, 0, 5, 0.4, TAU - 0.4); g.fill(); g.restore();
                g.save(); g.translate(12, -10); g.rotate(0.4 - cl); g.beginPath(); g.arc(0, 0, 5, Math.PI + 0.4, Math.PI - 0.4); g.fill(); g.restore();
                g.strokeStyle = '#c2410c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, -2); g.lineTo(-10, 1); g.moveTo(7, -2); g.lineTo(10, 1); g.moveTo(-3, -13); g.lineTo(-4, -17); g.moveTo(3, -13); g.lineTo(4, -17); g.stroke();
                g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -18, 2.5, 0, TAU); g.arc(4, -18, 2.5, 0, TAU); g.fill();
                g.fillStyle = '#2b2233'; g.beginPath(); g.arc(-4, -18, 1.2, 0, TAU); g.arc(4, -18, 1.2, 0, TAU); g.fill();
            } else {                                  /* snapping plant */
                var op = k.open ? 0.5 + 0.4 * Math.abs(Math.sin(k.t * 8)) : 0.15;
                g.strokeStyle = '#2f9e44'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -10, 0, -16); g.stroke();
                g.fillStyle = '#51cf66'; g.beginPath(); g.ellipse(-6, -3, 6, 3, 0.4, 0, TAU); g.ellipse(6, -3, 6, 3, -0.4, 0, TAU); g.fill();
                g.save(); g.translate(0, -18);
                g.fillStyle = '#e03131';
                g.save(); g.rotate(-op); g.beginPath(); g.ellipse(-4, 0, 9, 5, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(-11, -1, 3, 3); g.fillRect(-5, -1, 3, 3); g.restore();
                g.fillStyle = '#e03131';
                g.save(); g.rotate(op); g.beginPath(); g.ellipse(-4, 0, 9, 5, 0, 0, Math.PI); g.fill(); g.fillStyle = '#fff'; g.fillRect(-11, -2, 3, 3); g.fillRect(-5, -2, 3, 3); g.restore();
                g.restore();
            }
            g.restore();
        });
        trikes.forEach(function (t) {
            if (t.x + t.w < x0 || t.x > x1) return;
            drawTrike(t);
        });
        pteros.forEach(function (q) {
            if (q.x < x0 - 60 || q.x > x1 + 60) return;
            drawPtero(q);
        });
    }
    function drawTrike(t) {
        var ice = W.region === 'ice', cow = t.mode === 'scared';
        var body = ice ? '#a0785a' : W.region === 'volcano' ? '#a8423a' : '#d9822b', frill = ice ? '#f1f3f5' : W.region === 'volcano' ? '#e8a33a' : '#f4b860';
        g.save(); g.translate(t.x + t.w / 2, t.y + t.h);
        if (t.dir < 0) g.scale(-1, 1);
        if (cow) { g.translate(RM ? 0 : Math.sin(time * 40) * 1.5, 0); g.scale(1, 0.82); }
        var step = t.mode === 'charge' ? Math.sin(t.anim * 22) * 4 : Math.sin(t.anim * 7) * 2;
        g.fillStyle = body;
        g.fillRect(-30, -16 + step * 0.2, 12, 16); g.fillRect(14, -16 - step * 0.2, 12, 16);
        g.beginPath(); g.ellipse(-4, -26, 36, 20, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-36, -28); g.lineTo(-54, -14); g.lineTo(-34, -18); g.fill();
        if (ice) { g.fillStyle = '#c8a27e'; for (var i = 0; i < 6; i++) { g.beginPath(); g.arc(-30 + i * 10, -42 + (i % 2) * 3, 7, 0, TAU); g.fill(); } }
        /* frill and head; a cowering trike tucks its head behind the frill */
        var hx = cow ? 22 : 30;
        g.fillStyle = frill; g.beginPath(); g.ellipse(hx - 4, -36, 15, 22, 0.3, 0, TAU); g.fill();
        g.fillStyle = body; g.beginPath(); g.ellipse(hx + 8, -24, 16, 12, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff8e7';
        g.beginPath(); g.moveTo(hx + 8, -33); g.lineTo(hx + 26, -46); g.lineTo(hx + 12, -30); g.fill();
        g.beginPath(); g.moveTo(hx + 18, -24); g.lineTo(hx + 32, -30); g.lineTo(hx + 22, -20); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + 10, -28, 4, 0, TAU); g.fill();
        g.fillStyle = '#2b2233'; g.beginPath(); g.arc(hx + 11, -28, 2, 0, TAU); g.fill();
        g.strokeStyle = '#2b2233'; g.lineWidth = 2.5; g.beginPath();
        if (cow) { g.moveTo(hx + 5, -34); g.lineTo(hx + 14, -36); }          /* worried */
        else { g.moveTo(hx + 4, -36); g.lineTo(hx + 15, -32); }             /* grumpy */
        g.stroke();
        g.restore();
        if (cow && !RM) { g.fillStyle = '#4c6ef5'; g.beginPath(); g.ellipse(t.x + t.w / 2 + 20, t.y - 6 + (time * 20 % 8), 2.5, 4, 0, 0, TAU); g.fill(); }
        if (t.mode === 'charge' && t.t > 0) { g.fillStyle = '#e03131'; g.font = '800 20px sans-serif'; g.textAlign = 'center'; g.fillText('!', t.x + t.w / 2, t.y - 8); g.textAlign = 'start'; }
    }
    function drawPtero(q) {
        var flap = q.mode === 'dive' ? 0.3 : Math.sin(time * (q.mode === 'flee' ? 16 : 7)) * 0.6;
        var face = q.mode === 'dive' ? (q.vx > 0 ? 1 : -1) : Math.cos(q.t * 0.8) > 0 ? 1 : -1;
        g.save(); g.translate(q.x, q.y); g.scale(face, 1);
        if (q.mode === 'dive') g.rotate(Math.atan2(q.vy, Math.abs(q.vx)) * 0.6);
        g.fillStyle = '#9c6b9e';
        g.beginPath(); g.moveTo(-4, -2); g.lineTo(-30, -6 - flap * 18); g.lineTo(-8, 6); g.fill();
        g.beginPath(); g.moveTo(4, -2); g.lineTo(26, -8 - flap * 18); g.lineTo(8, 6); g.fill();
        g.fillStyle = '#b983b9'; g.beginPath(); g.ellipse(0, 2, 10, 7, 0, 0, TAU); g.fill();
        g.beginPath(); g.arc(10, -4, 6, 0, TAU); g.fill();
        g.fillStyle = '#f59f00'; g.beginPath(); g.moveTo(14, -6); g.lineTo(28, -3); g.lineTo(14, -1); g.fill();
        g.fillStyle = '#9c6b9e'; g.beginPath(); g.moveTo(6, -8); g.lineTo(-6, -14); g.lineTo(8, -4); g.fill();
        g.fillStyle = '#2b2233'; g.beginPath(); g.arc(11, -5, 1.6, 0, TAU); g.fill();
        g.restore();
        if (q.mode === 'aim') { g.fillStyle = '#e03131'; g.font = '800 18px sans-serif'; g.textAlign = 'center'; g.fillText('!', q.x, q.y - 16); g.textAlign = 'start'; }
    }
    /* the baby dino (or Mama, bigger): drawn facing right at the origin (feet), scaled */
    function dinoShape(face, sc, run, air, nuzzle, col, belly) {
        g.save(); g.scale(face * sc, sc);
        if (nuzzle) g.rotate(nuzzle);
        var lg = air ? 2 : Math.sin(run) * 3;
        g.fillStyle = col;
        g.fillRect(-9, -9 + Math.max(0, lg) * 0.5, 7, 9 - Math.max(0, lg) * 0.5);
        g.fillRect(3, -9 + Math.max(0, -lg) * 0.5, 7, 9 - Math.max(0, -lg) * 0.5);
        g.beginPath(); g.moveTo(-10, -18); g.quadraticCurveTo(-24, -16, -28, -8); g.quadraticCurveTo(-20, -8, -8, -8); g.fill();
        g.beginPath(); g.ellipse(-1, -14, 14, 9, 0, 0, TAU); g.fill();
        g.fillStyle = belly; g.beginPath(); g.ellipse(2, -10, 9, 5, 0, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.arc(12, -24, 9, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(18, -21, 8, 5.5, 0, 0, TAU); g.fill();
        g.fillStyle = '#3b8a3e';
        for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-9 + i * 6, -21 + i * 0.5); g.lineTo(-6 + i * 6, -27 + i); g.lineTo(-3 + i * 6, -21); g.fill(); }
        g.fillStyle = '#fff'; g.beginPath(); g.arc(14, -26, 3.4, 0, TAU); g.fill();
        g.fillStyle = '#2b2233'; g.beginPath(); g.arc(15, -26, 2, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(15.6, -26.8, 0.7, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,120,150,.55)'; g.beginPath(); g.ellipse(13, -20, 2.6, 1.6, 0, 0, TAU); g.fill();
        g.fillStyle = '#2b2233'; g.beginPath(); g.arc(23, -22, 0.9, 0, TAU); g.fill();
        g.restore();
    }
    function drawPlayer() {
        if (state === 'dead' || state === 'over') {
            if (stateT < 0.4 || state === 'over') { /* gone in a puff */ }
            return;
        }
        if (inv > 0 && Math.floor(inv * 12) % 2 && state === 'play') return;
        var fx = P.x + P.w / 2, fy = P.y + P.h, face = P.face;
        var air = !P.ground && !vine, run = P.ground && Math.abs(P.vx) > 20 ? time * 16 : 0;
        g.save(); g.translate(fx, fy + 1);
        if (wobT > 0 && !RM) g.rotate(Math.sin(wobT * 20) * 0.12);
        if (stompFx > 0) g.scale(1.15, 0.85);
        if (P.stomping) g.scale(0.9, 1.1);
        /* the tail swipe: the dino spins, the tail leaves an arc */
        if (swipeT > 0) {
            var u = 1 - swipeT / 0.3;
            g.strokeStyle = 'rgba(255,255,255,' + (0.8 - u * 0.6) + ')'; g.lineWidth = 5;
            g.beginPath(); g.ellipse(0, -10, 42, 14, 0, 0, TAU); g.stroke();
            face = Math.cos(u * TAU) > 0 ? P.face : -P.face;
        }
        if (P.tar) { g.fillStyle = 'rgba(43,34,51,.6)'; g.fillRect(-16, -6, 32, 6); }
        dinoShape(face, 1, run, air, 0, '#6cc56a', '#d3f9d8');
        if (roarT > 0) {                              /* roar: open mouth and rings */
            g.fillStyle = '#c92a2a'; g.beginPath(); g.ellipse(face * 22, -19, 4, 3.5, 0, 0, TAU); g.fill();
            var k = 1 - roarT / 0.7;
            g.strokeStyle = 'rgba(255,200,80,' + (1 - k) + ')'; g.lineWidth = 3;
            var a0 = face > 0 ? -0.7 : Math.PI - 0.7;
            for (var i = 0; i < 3; i++) { var rr = 16 + ((k + i / 3) % 1) * 90; g.beginPath(); g.arc(face * 24, -20, rr, a0, a0 + 1.4); g.stroke(); }
        }
        drawRider(face, air);
        g.restore();
    }
    /* the cat (or dog) on the dino's back: holds on in jumps, ducks under ceilings, cheers, wobbles, hisses (barks), glides, waves */
    function drawRider(face, air) {
        var duck = solidAt(W, Math.floor((P.x + P.w / 2) / T), Math.floor((P.y - 12) / T)) && !air;
        var hold = air && P.vy < 0 && !P.gliding;
        g.save(); g.scale(face, 1); g.translate(-3, -22);
        var bob = P.ground && Math.abs(P.vx) > 20 && !RM ? Math.abs(Math.sin(time * 16)) * 1.5 : 0;
        g.translate(0, -bob);
        if (wobT > 0) g.rotate(Math.sin(wobT * 26) * 0.35);
        if (duck || hold) g.scale(1.1, 0.75);
        var hiss = hissT > 0, puffUp = hiss && !SK.dog ? 1.25 : 1;
        g.lineWidth = 1.2; g.strokeStyle = SK.line;
        /* tail (a dog's is thicker and wags) */
        g.strokeStyle = SK.fur; g.lineWidth = SK.dog ? 3.8 : 3; g.lineCap = 'round';
        if (SK.dog) { var wag = RM ? 0 : Math.sin(time * (hiss || cheerT > 0 ? 26 : 12)) * 4; g.beginPath(); g.moveTo(-5, -4); g.quadraticCurveTo(-10, -7, -10 + wag, -13); g.stroke(); }
        else { g.beginPath(); g.moveTo(-5, -3); g.quadraticCurveTo(-12, hiss ? -16 : -4, -10, hiss ? -20 : -10); g.stroke(); }
        /* body */
        g.fillStyle = SK.fur; g.beginPath(); g.ellipse(0, -4, 6 * puffUp, 5 * puffUp, 0, 0, TAU); g.fill();
        if (SK.calico) { g.fillStyle = SK.stripe; g.beginPath(); g.ellipse(-2, -6, 3, 2.4, 0.4, 0, TAU); g.fill(); }   /* a calico patch */
        if (hiss && !SK.dog) { g.strokeStyle = SK.fur; g.lineWidth = 1.5; for (var i = 0; i < 5; i++) { var a = Math.PI + 0.3 + i * 0.6; g.beginPath(); g.moveTo(Math.cos(a) * 6, -4 + Math.sin(a) * 6); g.lineTo(Math.cos(a) * 10, -4 + Math.sin(a) * 9); g.stroke(); } }
        /* paws: hold on, cheer (both up), wave (one up) */
        g.fillStyle = SK.toe;
        if (cheerT > 0 && !duck) { g.fillRect(2, -16, 2.5, 8); g.fillRect(-3, -16, 2.5, 8); }
        else if (waveT > 0 && state === 'ending') { var wv = Math.sin(time * 10) * 0.5; g.save(); g.translate(4, -8); g.rotate(-0.4 + wv); g.fillRect(-1, -9, 2.6, 9); g.restore(); }
        else { g.beginPath(); g.arc(4, 0, 2, 0, TAU); g.arc(-2, 0.5, 2, 0, TAU); g.fill(); }
        /* head */
        var hx = 4, hy = duck ? -8 : -12;
        if (SK.dog) drawDogHead(hx, hy, hiss);
        else {
            g.fillStyle = SK.light; g.beginPath(); g.arc(hx, hy, 5.5 * puffUp, 0, TAU); g.fill();
            g.fillStyle = SK.fur;
            g.beginPath(); g.moveTo(hx - 5, hy - 2); g.lineTo(hx - 4, hy - 9); g.lineTo(hx - 1, hy - 4); g.fill();
            g.beginPath(); g.moveTo(hx + 1, hy - 4); g.lineTo(hx + 4, hy - 9); g.lineTo(hx + 5, hy - 2); g.fill();
            if (SK.calico) { g.fillStyle = SK.stripe; g.beginPath(); g.arc(hx - 3, hy - 3, 2.6, 0, TAU); g.fill(); }
            g.strokeStyle = SK.stripe; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - 1, hy - 5); g.lineTo(hx - 1, hy - 3); g.moveTo(hx + 1.5, hy - 5); g.lineTo(hx + 1.5, hy - 3); g.stroke();
            g.fillStyle = '#2b2233';
            if (cheerT > 0 || (state === 'ending')) { g.strokeStyle = '#2b2233'; g.beginPath(); g.arc(hx + 1, hy - 0.5, 1.2, Math.PI, TAU); g.arc(hx + 4, hy - 0.5, 1.2, Math.PI, TAU); g.stroke(); }
            else { g.beginPath(); g.arc(hx + 1.2, hy - 0.8, 1, 0, TAU); g.arc(hx + 4, hy - 0.8, 1, 0, TAU); g.fill(); }
            if (hiss) { g.fillStyle = '#c92a2a'; g.beginPath(); g.moveTo(hx + 2, hy + 2); g.lineTo(hx + 6, hy + 1.5); g.lineTo(hx + 4, hy + 4.5); g.fill(); }
        }
        /* the leaf umbrella while gliding */
        if (P.gliding) {
            g.strokeStyle = '#2f9e44'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + 3, hy + 2); g.lineTo(hx + 2, hy - 22); g.stroke();
            g.fillStyle = '#69db7c'; g.beginPath(); g.ellipse(hx + 2, hy - 24, 22, 7, 0, Math.PI, TAU); g.fill();
            g.strokeStyle = '#2f9e44'; g.beginPath(); g.moveTo(hx - 18, hy - 24); g.lineTo(hx + 22, hy - 24); g.stroke();
        }
        g.restore();
    }
    /* the dog's head, facing +x: round head, a snout with a dark nose in front, a floppy ear hanging at the back */
    function drawDogHead(hx, hy, bark) {
        g.fillStyle = SK.light; g.beginPath(); g.arc(hx, hy, 5.3, 0, TAU); g.fill();
        g.fillStyle = SK.cream; g.beginPath(); g.ellipse(hx + 5, hy + 1.3, 3.6, 2.7, 0, 0, TAU); g.fill();   /* snout */
        g.fillStyle = SK.nose; g.beginPath(); g.ellipse(hx + 8, hy + 0.2, 1.5, 1.2, 0, 0, TAU); g.fill();
        g.fillStyle = SK.ear; g.beginPath(); g.ellipse(hx - 2.4, hy + 0.6, 2.2, 4.6, 0.3, 0, TAU); g.fill();   /* the floppy ear */
        g.fillStyle = '#2b2233';
        if (cheerT > 0 || (state === 'ending')) { g.strokeStyle = '#2b2233'; g.lineWidth = 1; g.beginPath(); g.arc(hx + 2.2, hy - 1.6, 1.2, Math.PI, TAU); g.stroke(); }
        else { g.beginPath(); g.arc(hx + 2.4, hy - 1.8, 1.05, 0, TAU); g.fill(); }
        if (bark) { g.fillStyle = '#c92a2a'; g.beginPath(); g.moveTo(hx + 3.5, hy + 3); g.lineTo(hx + 8.5, hy + 2.6); g.lineTo(hx + 5.5, hy + 6); g.fill(); }
        else { g.fillStyle = '#ff8fab'; g.beginPath(); g.ellipse(hx + 6, hy + 4.3, 1.1, 1.4, 0, 0, TAU); g.fill(); }   /* tongue */
    }
    function drawFx() {
        parts.forEach(function (p) {
            g.globalAlpha = Math.max(0, 1 - p.t / p.life);
            g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
        });
        g.globalAlpha = 1;
        g.font = '800 14px sans-serif'; g.textAlign = 'center';
        texts.forEach(function (t) {
            g.globalAlpha = Math.max(0, 1 - t.t / 0.9);
            g.fillStyle = '#fff'; g.fillText(t.s, t.x + 1, t.y - t.t * 40 + 1);
            g.fillStyle = t.s === '♥' ? '#e8577e' : '#1e3a8a'; g.fillText(t.s, t.x, t.y - t.t * 40);
        });
        g.globalAlpha = 1; g.textAlign = 'start';
    }
    function drawLava(wh) {
        if (lavaX < cam.x - 40) return;
        var y1 = cam.y + wh + 20, top = W.rows * T - 6.5 * T;
        var glow = g.createLinearGradient(lavaX, 0, lavaX + 90, 0);
        glow.addColorStop(0, 'rgba(255,120,40,.4)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
        g.fillStyle = glow; g.fillRect(lavaX, top - 30, 90, y1 - top + 30);
        g.fillStyle = '#e8590c';
        g.beginPath(); g.moveTo(lavaX - 600, y1);
        for (var y = y1; y >= top; y -= 16) g.lineTo(lavaX + Math.sin(y * 0.05 + time * 4) * 8 - Math.max(0, top + 40 - y) * 0.8, y);
        g.lineTo(lavaX - 600, top); g.fill();
        g.fillStyle = '#ff922b'; g.fillRect(lavaX - 600, top, 560, 8);
        g.fillStyle = '#ffd43b';
        for (var i = 0; i < 6; i++) g.fillRect(lavaX - 20 - ((time * 40 + i * 37) % 120), W.rows * T - 5 * T + i * 20, 8, 3);
    }

    /* ---------- run ---------- */
    fit();
    W = parse(LEVELS[0], diff); P = newBody(W.start.x, W.start.y); camTo(true);
    var from = api.again && api.again.from;   /* "Play again": straight on, from the same region (if open at this difficulty) */
    if (typeof from === 'number') begin(from > 0 && from <= furthest[diff] ? from : 0);
    else titleCard();
    api.loop(function (dt) {
        update(dt);
        if (W && P && (state === 'play' || state === 'clear' || state === 'ending' || state === 'dead' || state === 'intro')) camTo(false);
        draw();
    });
    return { destroy: function () { keys = {}; } };
});
})();
