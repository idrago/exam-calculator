"use strict";
/* Test runner: executes every *.test.js suite against the live calculator.html
 * and exits non-zero on any failure.  Usage:  node tests/run.js  */
const { Tester } = require('./harness');

const suites = [
  ['engine', require('./engine.test.js')],
  ['ui',     require('./ui.test.js')],
];

let allGreen = true;
for (const [name, run] of suites) {
  const t = new Tester();
  run(t);
  allGreen = t.report(name + '.test.js') && allGreen;
}

console.log(allGreen ? '\n✓ all suites passed' : '\n✗ failures present');
process.exit(allGreen ? 0 : 1);
