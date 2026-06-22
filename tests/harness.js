"use strict";
/* Shared test harness.
 *
 * Tests run against the REAL source: we read calculator.html and eval the
 * relevant function blocks, so the suite can never drift from a stale copy.
 *
 *   loadEngine() -> pure math engine (no DOM)
 *   loadUI()     -> stateful string helpers (toggleSign / insert / del / ...)
 *   new Tester() -> tiny assertion framework with a final report()
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HTML_PATH = path.join(__dirname, '..', 'calculator.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// Display glyphs the UI actually emits (handy in test files).
const U = { mul: '×', div: '÷', minus: '−', sqrt: '√', pi: 'π' };

// Extract a top-level `function NAME(...) { ... }` by brace-matching.
function grab(name) {
  const i = html.indexOf('function ' + name + '(');
  assert(i >= 0, 'cannot find function ' + name);
  let depth = 0, started = false, k = html.indexOf('{', i);
  for (; k < html.length; k++) {
    if (html[k] === '{') { depth++; started = true; }
    else if (html[k] === '}') { depth--; if (started && depth === 0) { k++; break; } }
  }
  return html.slice(i, k);
}

// The DOM-free engine block (between the two section banners).
function loadEngine() {
  const start = html.indexOf('const FUNCS');
  const end   = html.indexOf('/* ---- 2. State');
  assert(start > 0 && end > start, 'cannot locate engine block');
  const src = html.slice(start, end);
  return new Function(src + '\nreturn {compute, fmt, tokenize, toRPN, normalize, factorial, evalRPN};')();
}

// The stateful string helpers, wired to a mutable `expr` with a no-op render.
function loadUI() {
  const src = ['operandStart', 'toggleSign', 'insert', 'clearAll', 'del', 'editingElsewhere']
    .map(grab).join('\n');
  return new Function(`
    let expr = '', justEvaluated = false;
    function render(){}
    ${src}
    return {
      set:  (e) => { expr = e; justEvaluated = false; },
      setEvaluated: (e) => { expr = e; justEvaluated = true; },
      get:  () => expr,
      isJustEvaluated: () => justEvaluated,
      operandStart, toggleSign, insert, clearAll, del, editingElsewhere
    };`)();
}

class Tester {
  constructor() { this.pass = 0; this.fail = 0; this.failures = []; this.section = '(root)'; }
  _ok(name)        { this.pass++; }
  _bad(name, msg)  { this.fail++; this.failures.push(`  [${this.section}] ${name}\n      ${msg}`); }

  group(title) { this.section = title; }

  // Strict equality on a produced string/value.
  is(actual, expected, name) {
    if (String(actual) === String(expected)) this._ok(name);
    else this._bad(name, `expected ${JSON.stringify(String(expected))}, got ${JSON.stringify(String(actual))}`);
  }
  // Run fn, compare its return to expected.
  eq(fn, expected, name) {
    let got; try { got = fn(); } catch (e) { got = 'THROW:' + e.message; }
    this.is(got, expected, name);
  }
  // Assert fn throws.
  throws(fn, name) {
    let threw = false, got;
    try { got = fn(); } catch (_) { threw = true; }
    if (threw) this._ok(name); else this._bad(name, `expected throw, got ${JSON.stringify(String(got))}`);
  }
  // Approximate numeric compare.
  near(actual, expected, name, tol = 1e-9) {
    let v; try { v = actual(); } catch (e) { v = NaN; }
    if (Math.abs(v - expected) <= tol) this._ok(name);
    else this._bad(name, `expected ~${expected} (±${tol}), got ${v}`);
  }
  // Generic boolean assertion.
  ok(cond, name) { if (cond) this._ok(name); else this._bad(name, 'expected truthy'); }

  report(label) {
    const total = this.pass + this.fail;
    console.log(`\n${label}: ${this.pass}/${total} passed${this.fail ? `, ${this.fail} FAILED` : ''}`);
    if (this.fail) { console.log('\nFAILURES:\n' + this.failures.join('\n')); }
    return this.fail === 0;
  }
}

module.exports = { loadEngine, loadUI, Tester, U };
