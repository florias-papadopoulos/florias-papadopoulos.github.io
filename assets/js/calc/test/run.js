/* Toolbox tests: node assets/js/calc/test/run.js [filter]
   Loads core.js, lib/*.js and every tools/*.js into node (no page), then:
   - the test files test/*.test.js (expected answers, random property checks, library checks);
   - every tool's examples: they must run without error and give a result and steps;
   - every formula a tool produced is parsed by the site's KaTeX (static/katex), so broken TeX fails here;
   - data/toolbox/*.yaml and the tool files agree (every listed tool has a file and the other way round, related ids
     exist), and no text uses an em or en dash.
   node run.js cat:<category> checks one category only (data/toolbox/<category>.yaml, its tools, test/<category>.test.js,
   lib/<category>.js): files of other categories that fail to load are ignored, so work in progress elsewhere does not
   get in the way. A plain word runs only the tools and tests whose id contains it. Exit code 1 on any failure. */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..');
var SITE = path.resolve(ROOT, '../../..');
var arg = process.argv[2] || '';
var CAT = /^cat:/.test(arg) ? arg.slice(4) : '', filter = CAT ? '' : arg, OWN = null;
if (CAT) {
    var catFile = path.join(SITE, 'data/toolbox', CAT + '.yaml');
    if (!fs.existsSync(catFile)) { console.log('No data/toolbox/' + CAT + '.yaml'); process.exit(1); }
    OWN = {};
    (fs.readFileSync(catFile, 'utf8').match(/^ {2}- id: *([a-z0-9-]+)/mg) || []).forEach(function (l) { OWN[l.replace(/.*id: */, '')] = 1; });
}
function mine(id) { return !OWN || OWN[id]; }
var loadErrors = [];
function load(f, own) {
    try { vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f }); }
    catch (e) { if (own) loadErrors.push(path.relative(SITE, f) + ': ' + (e && e.stack || e).split('\n').slice(0, 4).join(' | ')); else console.log('(ignored, other category) ' + path.relative(SITE, f) + ' does not load'); }
}
load(path.join(ROOT, 'core.js'), true);
fs.readdirSync(path.join(ROOT, 'lib')).filter(function (f) { return /\.js$/.test(f); }).sort(function (a, b) { var k = function (f) { return f === 'nt.js' ? '0' : f === 'text.js' ? '1' : '2' + f; }; return k(a) < k(b) ? -1 : 1; }).forEach(function (f) { load(path.join(ROOT, 'lib', f), !CAT || f === CAT + '.js' || f === 'nt.js' || f === 'text.js'); });
fs.readdirSync(path.join(ROOT, 'data')).filter(function (f) { return /\.js$/.test(f); }).sort().forEach(function (f) { load(path.join(ROOT, 'data', f), !CAT); });
var toolFiles = fs.readdirSync(path.join(ROOT, 'tools')).filter(function (f) { return /\.js$/.test(f) && mine(f.replace(/\.js$/, '')); }).sort();
toolFiles.forEach(function (f) { load(path.join(ROOT, 'tools', f), true); });
var Calc = global.Calc;
var katex = require(path.join(SITE, 'static/katex/katex.min.js'));

var fails = 0, passes = 0, pending = [];
function fail(where, msg) { fails++; console.log('FAIL ' + where + ': ' + msg); }
function pass() { passes++; }
/* load errors are reported once everything (test files too) has been loaded: see the end */

/* ---------- formulas: every $...$ and every math block must parse ---------- */
function texOk(where, tex) {
    try { katex.renderToString(tex, { throwOnError: true, strict: 'ignore', maxExpand: 20000 }); return true; }
    catch (e) { fail(where, 'TeX error in "' + tex.slice(0, 120) + '": ' + String(e.message).slice(0, 160)); return false; }
}
function richOk(where, s) { Calc.rich(s).forEach(function (p) { if (p.m) texOk(where, p.v); }); }
function checkOutput(where, S) {
    if (S.res) S.res.lines.forEach(function (l) { richOk(where + ' result', l); });
    S.notes.forEach(function (n) { richOk(where + ' note', n); });
    S.steps.forEach(function (st, i) {
        richOk(where + ' step ' + (i + 1) + ' title', st.title);
        st.blocks.forEach(function (b) {
            if (b.t === 'math') texOk(where + ' step ' + (i + 1), b.v);
            else if (b.t === 'p' || b.t === 'check') richOk(where + ' step ' + (i + 1), b.v);
            else if (b.t === 'list') b.v.forEach(function (x) { richOk(where + ' step ' + (i + 1), x); });
            else if (b.t === 'table') {
                b.head.forEach(function (h) { richOk(where + ' table head', String(h)); });
                b.rows.forEach(function (r) { r.forEach(function (c) { richOk(where + ' table', String(c && typeof c === 'object' && 'v' in c ? c.v : c)); }); });
            }
        });
    });
}

/* ---------- the API of the test files ---------- */
/* a small seeded random generator, so failures can be repeated */
function Rnd(seed) { this.s = BigInt(seed || 1) & 0xFFFFFFFFFFFFFFFFn; }
Rnd.prototype.next = function () { this.s = (this.s * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn; return this.s >> 11n; };
Rnd.prototype.int = function (lo, hi) { lo = BigInt(lo); hi = BigInt(hi); var span = hi - lo + 1n, r = 0n, bits = 0n; while ((1n << bits) < span * 1024n) { r = (r << 53n) | this.next(); bits += 53n; } return lo + r % span; };
Rnd.prototype.num = function (lo, hi) { return Number(this.int(lo, hi)); };
Rnd.prototype.pick = function (arr) { return arr[this.num(0, arr.length - 1)]; };
Rnd.prototype.text = function (n, chars) { chars = chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz.,!?0123456789'; var s = ''; for (var i = 0; i < n; i++) s += chars.charAt(this.num(0, chars.length - 1)); return s; };

var T = global.T = {
    Rnd: Rnd,
    /* expected answers: cases [{in: {...}, copy: 'expected copy text'} | {in, error: true} | {in, action, check: fn(S, copy) -> true or a message}] */
    tool: function (id, cases) {
        if (filter && id.indexOf(filter) < 0) return;
        cases.forEach(function (c, i) {
            var where = id + ' case ' + (i + 1);
            pending.push(function () {
                var def = Calc.tools[id];
                if (!def) return fail(where, 'no such tool');
                return Calc.run(def, c.in, c.action).then(function (out) {
                    if (c.error) return out.errors ? pass() : fail(where, 'expected an input error, got ' + JSON.stringify(out.S.res && out.S.res.copy));
                    if (out.errors) return fail(where, 'unexpected input error ' + JSON.stringify(out.errors));
                    checkOutput(where, out.S);
                    var copy = out.S.res ? out.S.res.copy : null;
                    if (c.copy != null && copy !== c.copy) return fail(where, 'expected ' + JSON.stringify(c.copy) + ', got ' + JSON.stringify(copy));
                    if (c.check) { var r = c.check(out.S, copy); if (r !== true) return fail(where, r || 'check failed (copy: ' + JSON.stringify(copy) + ')'); }
                    pass();
                }, function (e) { fail(where, 'threw ' + (e && e.stack || e)); });
            });
        });
    },
    /* random property: fn(rnd, i) returns true, or a message, or a Promise of those; run n times */
    prop: function (name, n, fn) {
        if (filter && name.indexOf(filter) < 0) return;
        pending.push(function () {
            var rnd = new Rnd(12345), chain = Promise.resolve(), bad = 0;
            for (var i = 0; i < n; i++) (function (i) {
                chain = chain.then(function () { if (bad) return; return fn(rnd, i); }).then(function (r) {
                    if (bad) return;
                    if (r !== true) { bad++; fail(name + ' #' + i, r || 'property failed'); }
                }, function (e) { if (!bad) { bad++; fail(name + ' #' + i, 'threw ' + (e && e.stack || e)); } });
            })(i);
            return chain.then(function () { if (!bad) pass(); });
        });
    },
    /* run a tool and get {S, errors, copy} (for use inside prop) */
    run: function (id, input, action) {
        return Calc.run(Calc.tools[id], input, action).then(function (out) { checkOutput(id + ' (prop)', out.S); return { S: out.S, errors: out.errors, copy: out.S.res ? out.S.res.copy : null }; });
    },
    /* a plain check */
    ok: function (name, cond, msg) { if (filter && name.indexOf(filter) < 0) return; pending.push(function () { return cond ? pass() : fail(name, msg || 'not true'); }); },
    eq: function (name, got, want) { if (filter && name.indexOf(filter) < 0) return; pending.push(function () { return String(got) === String(want) ? pass() : fail(name, 'expected ' + want + ', got ' + got); }); }
};

fs.readdirSync(__dirname).filter(function (f) { return /\.test\.js$/.test(f) && (!CAT || f === CAT + '.test.js'); }).sort().forEach(function (f) { load(path.join(__dirname, f), true); });

/* ---------- every tool's examples ---------- */
Object.keys(Calc.tools).sort().forEach(function (id) {
    if ((filter && id.indexOf(filter) < 0) || !mine(id)) return;
    var def = Calc.tools[id];
    if (!def.examples.length) { pending.push(function () { fail(id, 'has no examples'); }); return; }
    def.examples.forEach(function (ex, i) {
        pending.push(function () {
            return Calc.run(def, ex, ex._action).then(function (out) {
                var where = id + ' example ' + (i + 1);
                if (out.errors) return fail(where, 'error ' + JSON.stringify(out.errors));
                if (!out.S.res) return fail(where, 'no result');
                if (!out.S.steps.length) return fail(where, 'no steps');
                checkOutput(where, out.S);
                pass();
            }, function (e) { fail(id + ' example ' + (i + 1), 'threw ' + (e && e.stack || e)); });
        });
    });
});

/* ---------- data files and tool files agree; no dashes ---------- */
pending.push(function () {
    var dataDir = path.join(SITE, 'data/toolbox'), listed = {}, all = {};
    var yaml = fs.readdirSync(dataDir).filter(function (f) { return /\.ya?ml$/.test(f); });
    var allIds = {};
    yaml.forEach(function (f) { (fs.readFileSync(path.join(dataDir, f), 'utf8').match(/^ {2}- id: *([a-z0-9-]+)/mg) || []).forEach(function (l) { allIds[l.replace(/.*id: */, '')] = 1; }); });
    if (CAT) yaml = [CAT + '.yaml'];
    yaml.forEach(function (f) {
        var src = fs.readFileSync(path.join(dataDir, f), 'utf8');
        /* a real YAML parse (Hugo fails on what the regexes below would miss) */
        var py = require('child_process').spawnSync('python3', ['-c', 'import sys, yaml; d = yaml.safe_load(open(sys.argv[1])); assert isinstance(d.get("tools"), list) and d.get("name") and isinstance(d.get("order"), int), "needs name, order and a tools list"; [(_ for _ in ()).throw(AssertionError("tool without id, title or short: %r" % t)) for t in d["tools"] if not (t.get("id") and t.get("title") and t.get("short"))]', path.join(dataDir, f)], { encoding: 'utf8' });
        if (py.error) console.log('(python3 with PyYAML not found: YAML syntax not checked)');
        else if (py.status !== 0) fail('data/toolbox/' + f, 'is not valid YAML: ' + String(py.stderr).trim().split('\n').slice(-3).join(' | '));
        if (/[–—]|(^|[^-])--([^-]|$)/m.test(src.replace(/^#.*$/mg, ''))) fail('data/toolbox/' + f, 'contains an em/en dash or "--"');
        (src.match(/^ {2}- id: *([a-z0-9-]+)/mg) || []).forEach(function (l) { var id = l.replace(/.*id: */, ''); if (listed[id]) fail('data/toolbox', 'tool ' + id + ' is listed twice'); listed[id] = f; });
        var rel = src.match(/related: *\[([^\]]*)\]/g) || [];
        rel.forEach(function (r) { r.replace(/.*\[|\]/g, '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (id) { all[id] = f; }); });
    });
    Object.keys(listed).forEach(function (id) { if (!Calc.tools[id]) fail('data/toolbox/' + listed[id], 'tool ' + id + ' has no tools/' + id + '.js (or it does not register that id)'); });
    toolFiles.forEach(function (f) { var id = f.replace(/\.js$/, ''); if (!listed[id]) fail('tools/' + f, 'is not listed in any data/toolbox/*.yaml'); if (!Calc.tools[id]) fail('tools/' + f, 'does not register the id ' + id); });
    Object.keys(all).forEach(function (id) { if (!allIds[id]) fail('data/toolbox/' + all[id], 'related tool ' + id + ' does not exist'); });
    toolFiles.forEach(function (f) { var s = fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8'); if (/[–—]/.test(s)) fail('tools/' + f, 'contains an em or en dash'); });
    pass();
});

pending.unshift(function () { loadErrors.forEach(function (e) { fail('load', e); }); });
(function next() {
    var job = pending.shift();
    if (!job) {
        console.log((fails ? 'FAILED: ' + fails + ' failure(s), ' : 'ok: ') + passes + ' check(s) passed, ' + Object.keys(Calc.tools).length + ' tools');
        process.exit(fails ? 1 : 0);
    }
    Promise.resolve().then(job).catch(function (e) { fail('runner', e && e.stack || e); }).then(next);
})();
