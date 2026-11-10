// Do the site's QR codes scan? Encodes live links with assets/js/live/20-qr.js and the vendored encoder, writes each
// as a PNG and as the SVG path the page makes, and decodes them with an independent decoder (zxing-cpp for Python,
// given by its folder): node tools/workers/live/test/qr.cjs <out dir> <python path with zxingcpp>
// Without the decoder it only checks the format (finder patterns, timing patterns, sizes).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib'), cp = require('child_process');
const site = path.join(__dirname, '../../../assets/js/live');
const out = process.argv[2] || path.join(__dirname, 'out-qr');
const pylib = process.argv[3] || '';
fs.mkdirSync(out, { recursive: true });

const box = { window: {}, unescape: unescape, encodeURIComponent: encodeURIComponent };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(site, 'vendor/qrcode-generator.js'), 'utf8') + '\nwindow.qrcode = qrcode;', box);
vm.runInContext(fs.readFileSync(path.join(site, '20-qr.js'), 'utf8'), box);
const LV = box.window.LV;

/* a grayscale PNG of the matrix (k pixels per module, quiet zone 4) */
function png(m, k) {
    const w = (m.n + 8) * k, raw = Buffer.alloc((w + 1) * w, 255);
    for (let y = 0; y < w; y++) {
        raw[y * (w + 1)] = 0;
        for (let x = 0; x < w; x++) {
            const r = Math.floor(y / k) - 4, c = Math.floor(x / k) - 4;
            if (r >= 0 && c >= 0 && r < m.n && c < m.n && m.dark(r, c)) raw[y * (w + 1) + 1 + x] = 0;
        }
    }
    function chunk(type, data) {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
        return Buffer.concat([len, td, crc]);
    }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(w, 4); ihdr[8] = 8; ihdr[9] = 0;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
let table = null;
function crc32(b) {
    if (!table) { table = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = table[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return c ^ 0xffffffff;
}
/* the SVG path back into a matrix, to check that the SVG draws the same modules */
function fromSvg(svg, n) {
    const g = []; for (let r = 0; r < n; r++) g.push(new Array(n).fill(false));
    const re = /M(\d+) (\d+)h(\d+)v1h-\d+z/g; let m;
    while ((m = re.exec(svg))) for (let i = 0; i < +m[3]; i++) g[+m[2] - 4][+m[1] - 4 + i] = true;
    return g;
}

const texts = ['https://florias-papadopoulos.github.io/live/#pkc27/k3x9mn2p', 'https://florias-papadopoulos.github.io/live/#pkc27.test/w7c2qzht',
    'https://florias-papadopoulos.github.io/live/#eurocrypt-2027-talk/abcdefgh', 'https://florias-papadopoulos.github.io/live/#pkc27',
    'https://florias-papadopoulos.github.io/live/#eurocrypt-2027-talk', 'https://florias-papadopoulos.github.io/live/#ab',
    'http://localhost:8810/live/#demo'];
let fail = 0;
const files = [];
texts.forEach(function (t, i) {
    const m = LV.qr(t);
    /* finder patterns in three corners, timing patterns between them */
    const finder = function (r0, c0) {
        for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
            const want = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            if (m.dark(r0 + r, c0 + c) !== want) return false;
        }
        return true;
    };
    let timing = true;
    for (let k = 8; k < m.n - 8; k++) if (m.dark(6, k) !== (k % 2 === 0) || m.dark(k, 6) !== (k % 2 === 0)) timing = false;
    if (!finder(0, 0) || !finder(0, m.n - 7) || !finder(m.n - 7, 0) || !timing || (m.n - 17) % 4) { fail++; console.log('FAIL format ' + t); }
    const g = fromSvg(LV.qrSvg(t), m.n);
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (g[r][c] !== m.dark(r, c)) { fail++; console.log('FAIL svg ' + t); r = c = m.n; }
    const f = path.join(out, 'qr-' + i + '.png');
    fs.writeFileSync(f, png(m, 6));
    files.push({ f: f, t: t, v: (m.n - 17) / 4 });
});

if (pylib) {
    const py = 'import sys, json\nsys.path.insert(0, sys.argv[1])\nimport zxingcpp, numpy\nfrom PIL import Image\n' +
        'print(json.dumps([[r.text for r in zxingcpp.read_barcodes(numpy.array(Image.open(f).convert("L")))] for f in sys.argv[2:]]))\n';
    const res = JSON.parse(cp.execFileSync('python3', ['-I', '-c', py, pylib].concat(files.map(function (x) { return x.f; }))).toString());
    files.forEach(function (x, i) {
        const ok = res[i].length === 1 && res[i][0] === x.t;
        if (!ok) fail++;
        console.log((ok ? 'ok   ' : 'FAIL ') + 'version ' + x.v + '  ' + x.t + (ok ? '' : '  decoded: ' + JSON.stringify(res[i])));
    });
} else console.log('(no decoder given: format checks only)');
console.log(fail ? fail + ' failed' : 'all QR checks passed');
if (fail) process.exit(1);
