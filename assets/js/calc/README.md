# Toolbox: how a tool is built

The Toolbox tab (`/toolbox/`) lists calculators, ciphers and decoders that show the whole procedure. Every tool is
one page `/toolbox/<id>/` with a form, the result, the numbered steps of the procedure, a "How it works" text and
related tools. Everything runs in the visitor's browser.

## Files

| File | What |
|---|---|
| `data/toolbox/<category>.yaml` | One category: `name`, `order`, `intro`, and its `tools` (id, title, short, related, keywords, needs, about) |
| `content/toolbox/_content.gotmpl` | Makes one page per listed tool (no .md file per tool) |
| `layouts/toolbox/list.html`, `single.html` | The tab and a tool's page |
| `assets/js/calc/core.js` | The engine: registry, number parser, step recorder, page rendering (read its header) |
| `assets/js/calc/lib/*.js` | Shared pure libraries, loaded on every tool page: `nt.js` (number theory on BigInt), `text.js` (letters, keyed alphabets, frequencies, IC, chi-squared) |
| `assets/js/calc/data/<name>.js` | Bulky data a few tools need (word lists, n-gram tables): loaded only by tools that list it in `needs` |
| `assets/js/calc/tools/<id>.js` | One tool. The file name is the id |
| `assets/js/calc/boot.js` | Starts the page (always last) |
| `assets/js/calc/test/run.js` | Tests: `node assets/js/calc/test/run.js [word]` |
| `assets/js/calc/test/<category>.test.js` | Tests of one category |
| `assets/css/common/toolbox.css` | Styles |

A tool page's script is `core.js + lib/*.js + data/<needs>.js + tools/<id>.js + boot.js`, joined and minified.
Local node is v12: write JavaScript it can parse (no `?.`, no `??`, no numeric separators, no top-level await).
BigInt literals (`12n`) are fine.

## Listing a tool (data/toolbox/<category>.yaml)

```yaml
name: Modular arithmetic
order: 1
intro: One sentence about the category.
tools:
  - id: modular-inverse          # = tools/modular-inverse.js, page /toolbox/modular-inverse/
    title: Modular inverse calculator
    short: One line for the list and the page's lede (plain text, no math).
    keywords: [inverse, bezout, rsa]   # optional, extra search words
    related: [gcd, modulo]           # ids of other tools (any category)
    needs: [quadgrams]               # optional, data/quadgrams.js is loaded before the tool
    about: |
      Two to four short paragraphs of Markdown, $math$ allowed: what it is, how the method works, where it is used
      (in cryptography when it is). Written in your own words.
```

## Writing a tool (tools/<id>.js)

```js
Calc.tool({
    id: 'modular-inverse',
    live: true,                 // recompute while typing (only for fast tools)
    inputs: [
        { id: 'a', label: 'Number $a$', placeholder: '17' },                 // type 'int' (default): BigInt
        { id: 'n', label: 'Modulus $n$', min: 2 },
        { id: 'mode', type: 'select', label: 'Mode', value: 'enc', options: [['enc', 'Encrypt'], ['dec', 'Decrypt']] },
        { id: 'key', type: 'text', label: 'Key', when: { mode: 'enc' } }    // shown only when mode is enc
    ],
    actions: [{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }],  // optional: several buttons, v._action
    examples: [{ a: '17', n: '3120' }, { a: '3', n: '26', _action: 'dec' }],      // the first runs when the page opens
    run: function (v, S) { ... }   // may be async; see below
});
```

Input types: `int` (BigInt, accepts expressions such as `2^127-1`, `0xff`, `10!`, `gcd(a,b)`; `min`/`max`),
`list` (array of BigInt, separated by commas, `optional: true` allows empty), `num` (a JS number), `text`, `textarea`
(`rows`), `select` (`options: [[value, label]]`), `check` (boolean). All: `label` (rich), `placeholder`, `help` (rich),
`value` (default), `width` (`s`, `m`, `l`, `full`), `when` (`{otherId: value or [values]}`), `optional`, `maxLength`.

In `run(v, S)`: `v.<id>` are the parsed values, `v._action` the button pressed.

- `Calc.fail('message', 'fieldId')`: an input mistake, shown to the visitor (the field id marks the field red). With a field id the message is shown as plain text next to the field (no math); without one it is rich text.
- To name a typed character in a message use `Calc.chr(text, i)` (or a regex with the `u` flag), not `charAt`: an emoji is two UTF-16 units and `charAt` gives half of it.
- Checkboxes are true for `true`, `'1'`, `'true'`; a field missing from the raw input (in tests) gets its `value` default, as on the page.
- `optional: true` on an `int` field gives `null` when it is left empty.
- Libraries load in this order: `nt.js`, `text.js`, then the others alphabetically.
- `Calc.tex` groups digits only for numbers up to 60 digits (KaTeX limits how many spacing commands one formula may hold).
- Table option `align: ['l', 'r', 'c']` sets the alignment per column.
- The yaml is parsed for real by the tests (PyYAML): quote any `short:` or keyword containing `: ` or starting with a special character.
- `S.result(lineOrLines, { copy: 'plain text', label: 'Plaintext' })`: the answer. Always give `copy`: it is what Copy copies and what the tests compare.
- `S.note(rich)`: a remark under the result. (The result `label` is plain text.)
- `var s = S.step('Title (rich)')`, then on `s`: `.p(rich)`, `.math(tex)` (displayed), `.lines([tex rows with &])` (aligned), `.table(head, rows, { max, hl: rowIndex, mono, caption })` (cells rich strings, numbers, BigInt, or `{ v: cell, hl: true }`), `.pre(text)`, `.check(ok, rich)`, `.list([rich])`. All chain.
- Long loops: make `run` async and `if (i % 500 === 0) await S.tick();` so the page stays responsive and Stop works. Cap work anyway (refuse inputs that would take more than a few seconds, with a clear message).

**Rich strings:** plain text with `$...$` for math (TeX, rendered by KaTeX). Anything the visitor typed must go
through `Calc.esc(s)` (in plain text) or `Calc.tt(s)` (inside math, as `\text{...}`), so a typed `$` or backslash
never becomes math. Never build HTML. Numbers inside math: `Calc.tex(n)` (groups long numbers with thin spaces).

**Steps** are the point of the Toolbox: write them as a good teacher would on the board. Every step has a title
saying what is done, then the computation with the actual numbers (or letters), then the outcome. Use tables for
repeated rounds (Euclid, square and multiply, a letter by letter cipher table), keep a final check where one
exists (decrypt to compare, multiply back). Long tables are cut automatically (first and last rows, "Show all").
Look at `tools/modular-inverse.js`, `tools/gcd.js` and `tools/modulo.js` for the style.

## Rules

- Texts in your own words. No copying from other calculator sites.
- No em or en dash characters anywhere, and no `--` as a dash: use commas, colons, parentheses (the tests check).
- Plain, precise English. Mathematical conventions: $\gcd$, $\bmod$, $\pmod n$, $\equiv$.
- Inputs that are too big for the method: refuse with a clear message rather than freezing the page.
- Every tool has at least 2 examples and tests in `test/<category>.test.js`: known answers (textbook values), edge
  cases (0, 1, negative, empty text, non-letters), input errors, and random round trips or properties
  (decrypt(encrypt(x)) = x, a·a⁻¹ ≡ 1, ...). See `test/modular-arithmetic.test.js`; the API is in `test/run.js`.
- `node assets/js/calc/test/run.js` must end with `ok`. It also runs every example, parses every formula with
  KaTeX, and checks that the yaml and the tool files agree.
