# Exam Calculator

> 🪄 A **vibe-coded** scientific calculator — designed, reviewed, hardened, and
> tested entirely through conversation with Claude.

A single-file scientific calculator (`calculator.html`) for embedding in
Moodle quizzes. No network, no storage, no `eval()` — every line is auditable.

The math engine is a classic pipeline: **tokenize → shunting-yard (RPN) →
stack evaluator**. The UI is plain DOM, built from a `KEYS` table.

## Embedding in Moodle

**Embed via an `<iframe>`** (host the file and reference it in the question
text, or use Moodle's media/file embedding). The iframe isolates the
calculator's CSS, global names, and keyboard focus from the quiz page — the
supported, trouble-free path.

The build is hardened so it also degrades gracefully if pasted *inline*:

- **Keyboard works immediately** (no click needed). The `keydown` listener is
  on `window` but **yields** whenever focus is in another field (`INPUT`,
  `TEXTAREA`, `SELECT`, contenteditable), so it never steals keystrokes from
  quiz inputs. It also ignores `Ctrl`/`Cmd`/`Alt` shortcuts, and lets a focused
  calculator button handle its own `Enter`.
- **Buttons are `type="button"`**, so a key press can never submit the quiz form.
- **All JS is wrapped in an IIFE** — no global names leak into the page.

Inline embedding still shares CSS with the host page (the stylesheet uses
`html, body, *, button` and the IDs `expr` / `preview` / `pad`). If you must
embed inline, prefer the iframe anyway, or scope the CSS and IDs first. Don't
place two inline copies on one page (IDs would collide).

## Features

- `+ − × ÷`, `^` (right-assoc), `%` (modulo), `!` (factorial)
- `sin cos tan asin acos atan`, `√`, `ln`, `log` (base 10), `exp`, `abs`
- Constants `π`, `e`; DEG/RAD toggle
- Implicit multiplication: `2π`, `2(3)`, `2sin(30)`, `(1+2)(3+4)`
- Exact angles read cleanly (`cos(90)=0`, `sin(90)=1`, `asin(0.5)=30`);
  `tan(90)` / `tan(270)` report `Error` (undefined)
- Functions require parentheses: a malformed `√9` or `sin30` reports `Error`
  rather than silently evaluating `sqrt(9)` / `sin(30)`
- A second decimal point in the same number is ignored (no `1.2.3`)
- Live preview of the result while typing; `±` negates the trailing operand
  (number, parenthesised group, function result, or constant)

## Known limitations (by design)

- `%` uses JavaScript remainder semantics: `−5 % 3 = −2` (sign follows the
  dividend), not Euclidean modulo.
- A negative base with a fractional exponent reports `Error` (e.g. `(−8)^(1÷3)`),
  since `Math.pow` returns `NaN` there — real odd roots of negatives aren't
  computed.
- No autofocus on load, to avoid stealing focus when embedded inline (the
  keyboard still works immediately without it).
- Inline embedding shares CSS/IDs with the host page — use an iframe.

## Tests

```sh
node tests/run.js
```

Tests read `calculator.html` and evaluate its function blocks directly, so they
always exercise the shipped source (no copy to drift). Suites:

- `tests/engine.test.js` — arithmetic, precedence/associativity, unary minus,
  trig (deg/rad + snapping), logs/roots/factorial, implicit multiplication,
  error handling, formatting, tokenizer.
- `tests/ui.test.js` — `toggleSign`, the `justEvaluated` continuation rule,
  `insert`, `del`, `clearAll`.
- `tests/harness.js` — source extraction + a small assertion framework.

---

*Vibe-coded with care by 🤖 [Claude](https://claude.com/claude-code) (Anthropic).*
