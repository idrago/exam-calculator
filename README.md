# Exam Calculator

A single-file scientific calculator (`calculator.html`) for embedding in
Moodle quizzes, used in Safe Exam Browser (Chromium on Windows, WebKit on
macOS/iOS). No network, no storage, no `eval()`.

The math engine is a classic pipeline: **tokenize → shunting-yard (RPN) →
stack evaluator**. The UI is plain DOM, built from a `KEYS` table.

## Embedding in Moodle

**Embed via an `<iframe>`** (host the file and reference it in the question
text, or use Moodle's media/file embedding). The iframe isolates the
calculator's CSS, global names, and keyboard focus from the quiz page.
Keyboard input reaches the calculator once the iframe has focus, i.e. after a
click on it.

Inline embedding (the file pasted into the question) is handled as follows:

- The `keydown` listener is on `window`, so keys work without a click. It
  **yields** whenever focus is in another field (`INPUT`, `TEXTAREA`,
  `SELECT`, contenteditable), so quiz inputs keep their keystrokes, and it
  ignores `Ctrl`/`Cmd`/`Alt` shortcuts.
- `Enter` evaluates only when focus is on the calculator or on no element. A
  focused button or link, on the calculator or on the quiz page, keeps its own
  `Enter` activation.
- **Buttons are `type="button"`**, so a key press can never submit the quiz form.
- **All JS is wrapped in an IIFE**: no global names leak into the page.

Inline embedding still shares CSS with the host page (the stylesheet uses
`html, body, *, button` and the IDs `expr` / `preview` / `pad`); scope the CSS
and IDs before embedding inline. Two inline copies on one page collide on IDs.

## Features

- `+ − × ÷`, `^` (right-assoc), `%` (modulo), `!` (factorial)
- `sin cos tan asin acos atan`, `√`, `ln`, `log` (base 10); `exp`, `abs` in the
  parser only (no key)
- Constants `π`, `e`; DEG/RAD toggle
- `Ans`: after `=`, an operator continues from the full-precision result as one
  operand (`Ans×2`, `Ans^2`); a digit, `.`, `(`, function or constant starts a
  new expression. `⌫` removes `Ans` as one token.
- Results: exact integers below 2^53 in full; otherwise 12 significant digits,
  with the exponent written as `×10^n` (`1×10^-7`), never with `e`
- Implicit multiplication: `2π`, `2(3)`, `2sin(30)`, `(1+2)(3+4)`, `ee`,
  `esin(30)`
- Any non-finite intermediate value is an `Error`: `1÷(1÷0)`, `1÷tan(90)`,
  `1÷171!`
- Trig: DEG angles are reduced exactly (mod 360), so multiples of 90° are
  exact (`cos(90)=0`, `sin(180)=0`), `tan(90)` / `tan(270)` report `Error`, and
  large angles keep full accuracy. In RAD, a result below the rounding error of
  the argument is 0 (`sin(π)=0`, `tan(π÷2)` → `Error`). `tan` and inverse-trig
  results within 1e-14 (relative) of a nonzero integer snap to it
  (`asin(0.5)=30`, `tan(45)=1`).
- Functions require parentheses: a malformed `√9` or `sin30` reports `Error`
  rather than silently evaluating `sqrt(9)` / `sin(30)`
- A second decimal point in the same number is ignored on entry and rejected
  by the parser (no `1.2.3`)
- Live preview of the result while typing; `±` negates the trailing operand
  (number, parenthesised group, function result, constant, `Ans`, factorial).
  An operand joined by implicit multiplication gets an explicit `×`:
  `2π` → `2×−π`.
- Keyboard: digits, `.` or `,` (decimal point), `+ - * / ^ % ! ( )`,
  `Enter`/`=`, `Backspace`, `Escape`. A mouse click on a key leaves focus on the
  calculator, so `Enter` after clicks evaluates instead of repeating the key.

## Known limitations (by design)

- `%` uses JavaScript remainder semantics: `−5 % 3 = −2` (sign follows the
  dividend), not Euclidean modulo.
- A negative base with a fractional exponent reports `Error` (e.g. `(−8)^(1÷3)`),
  since `Math.pow` returns `NaN` there — real odd roots of negatives aren't
  computed.
- No autofocus on load, to avoid taking focus from the quiz page. Standalone
  and inline, keys work without it; in an iframe, a click on the calculator
  is needed first.
- Inline embedding shares CSS/IDs with the host page — use an iframe.

## Tests

```sh
node tests/run.js
```

Tests read `calculator.html` and evaluate its function blocks directly, so they
always exercise the shipped source (no copy to drift). Suites:

- `tests/engine.test.js` — arithmetic, precedence/associativity, unary minus,
  trig (deg/rad, exact quadrants, poles), logs/roots/factorial, implicit
  multiplication, name splitting, `Ans`, non-finite intermediates, error
  handling, formatting, tokenizer.
- `tests/ui.test.js` — `toggleSign`, `equals` and `Ans` chaining, the
  `justEvaluated` continuation rule, `insert`, `del`, `clearAll`, rendered
  display text.
- `tests/harness.js` — source extraction + a small assertion framework.

Keyboard and focus behaviour (click focus, `Enter`, inline and iframe
embedding) needs a browser and is not covered by the Node suites.
