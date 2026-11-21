/* Cipher History tests: node assets/js/cipher-history/test/run.js [word]
   Loads the page's script in the same order as layouts/partials/cipher-history/script.html (00-core.js, the Toolbox's
   lib/text.js, lib/code-breaking.js and data/english-quadgrams.js, then every other part in name order) into node without a page, then runs
   test/*.test.js. A test file gets (CH, t) and calls t.ok(cond, msg), t.eq(a, b, msg); a word as argument runs only
   the test files whose name contains it. It also checks the texts: no em or en dash and no "--" in the story pages
   (content/cipher-history/*.md) or in these scripts, and every story page has its script and the other way round.
   Exit code 1 on any failure. Node 12 is enough. */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var HERE = path.resolve(__dirname, '..');
var SITE = path.resolve(HERE, '../../..');
var filter = process.argv[2] || '';

function load(f) { vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f }); }
load(path.join(HERE, '00-core.js'));
load(path.join(SITE, 'assets/js/calc/lib/text.js'));
load(path.join(SITE, 'assets/js/calc/lib/code-breaking.js'));
load(path.join(SITE, 'assets/js/calc/data/english-quadgrams.js'));
fs.readdirSync(HERE).filter(function (f) { return /\.js$/.test(f) && f !== '00-core.js'; }).sort().forEach(function (f) { load(path.join(HERE, f)); });
var CH = global.CH;

var fails = 0, passes = 0, current = '';
var t = {
    ok: function (c, msg) { if (c) passes++; else { fails++; console.log('FAIL ' + current + ': ' + msg); } },
    eq: function (a, b, msg) { t.ok(a === b, (msg || 'values differ') + ': got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b)); }
};

fs.readdirSync(__dirname).filter(function (f) { return /\.test\.js$/.test(f) && f.indexOf(filter) >= 0; }).sort().forEach(function (f) {
    current = f;
    try { require(path.join(__dirname, f))(CH, t); } catch (e) { fails++; console.log('FAIL ' + f + ' threw: ' + (e && e.stack || e)); }
});

/* the texts: no dashes, and story pages and scripts agree */
current = 'texts';
var content = path.join(SITE, 'content/cipher-history');
var pages = fs.readdirSync(content).filter(function (f) { return /\.md$/.test(f); });
var files = pages.map(function (f) { return path.join(content, f); })
    .concat(fs.readdirSync(HERE).filter(function (f) { return /\.(js|md)$/.test(f); }).map(function (f) { return path.join(HERE, f); }))
    .concat(fs.readdirSync(__dirname).filter(function (f) { return /\.js$/.test(f); }).map(function (f) { return path.join(__dirname, f); }))
    .concat([path.join(SITE, 'layouts/cipher-history/list.html'), path.join(SITE, 'layouts/cipher-history/single.html'), path.join(SITE, 'assets/css/common/cipher-history.css')]);
files.forEach(function (f) {
    var s = fs.readFileSync(f, 'utf8');
    t.ok(!/[\u2013\u2014]/.test(s), path.relative(SITE, f) + ' contains an en or em dash');
    /* "--" used as a dash (a word, spaces, two hyphens, spaces); front matter fences and CSS variables are fine */
    t.ok(!/\s--\s/.test(s.replace(/^---$/mg, '')), path.relative(SITE, f) + ' contains a double hyphen used as a dash');
});
pages.filter(function (f) { return f !== '_index.md'; }).forEach(function (f) {
    var id = f.replace(/\.md$/, '');
    t.ok(!!CH.stories[id], 'content/cipher-history/' + f + ' has no script (CH.story({ id: \'' + id + '\' }))');
    var s = fs.readFileSync(path.join(content, f), 'utf8');
    ['title:', 'order:', 'era:', 'when:', 'place:', 'line:', 'story:', 'task:', 'hints:', 'truth:', 'sources:'].forEach(function (k) {
        t.ok(s.indexOf('\n' + k) >= 0, f + ' has no ' + k);
    });
    t.ok((s.match(/\n  - text:/g) || []).length >= 2, f + ' lists fewer than 2 sources');
});
Object.keys(CH.stories).forEach(function (id) { t.ok(pages.indexOf(id + '.md') >= 0, 'the script ' + id + ' has no page content/cipher-history/' + id + '.md'); });

console.log(passes + ' passed, ' + fails + ' failed');
console.log(fails ? 'FAILED' : 'ok');
process.exit(fails ? 1 : 0);
