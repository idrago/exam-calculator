"use strict";
/* Tests for the stateful string helpers: toggleSign, insert (with the
 * justEvaluated continuation rule), del and clearAll. These manipulate the
 * display string `expr`; we drive them through loadUI()'s accessors. */
const { loadUI, U } = require('./harness');

module.exports = function run(t) {
  const ui = loadUI();

  // Apply `fn` to a starting expr and assert the resulting expr.
  const after = (start, fn) => { ui.set(start); fn(ui); return ui.get(); };
  const sign  = (start, exp, name) => t.is(after(start, u => u.toggleSign()), exp, name || `±  ${JSON.stringify(start)}`);

  // ---------------------------------------------------------------- //
  t.group('toggleSign — numbers');
  sign('5', U.minus + '5');
  sign(U.minus + '5', '5');                                  // toggle back off
  sign('3.5', U.minus + '3.5');
  sign('', '', '± on empty is a no-op');
  sign('3+5', '3+' + U.minus + '5');                         // negate 2nd operand
  sign('3+' + U.minus + '5', '3+5');                         // and back
  t.is(after('5', u => { u.toggleSign(); u.toggleSign(); }), '5', '± twice restores');

  t.group('toggleSign — groups, functions, constants (#3 fix)');
  sign('sin(30)', U.minus + 'sin(30)');                      // negate a function result
  sign(U.minus + 'sin(30)', 'sin(30)');                      // and back
  sign('(2+3)', U.minus + '(2+3)');                          // negate a paren group
  sign('2' + U.mul + '(3+4)', '2' + U.mul + U.minus + '(3+4)');
  sign(U.pi, U.minus + U.pi);                                // negate π
  sign('cos(45)', U.minus + 'cos(45)');
  sign('1+sqrt(9)', '1+' + U.minus + 'sqrt(9)');

  t.group('toggleSign — leading-minus detection');
  sign(U.minus + '(2+3)', '(2+3)');                          // strip a leading sign
  sign('2' + U.mul + U.minus + '(3+4)', '2' + U.mul + '(3+4)');
  sign(U.minus + 'sin(30)', 'sin(30)');

  // ---------------------------------------------------------------- //
  t.group('insert — justEvaluated continuation');
  // After "=", an operator continues from the result...
  t.is(after('42', u => { u.setEvaluated('42'); u.insert('+'); }), '42+', 'result then + continues');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert(U.mul); }), '42' + U.mul, 'result then × continues');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert('^'); }), '42^', 'result then ^ continues');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert('!'); }), '42!', 'result then ! continues');
  // ...while a fresh value starts over.
  t.is(after('42', u => { u.setEvaluated('42'); u.insert('7'); }), '7', 'result then digit starts fresh');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert('.'); }), '0.', 'result then . starts fresh as 0.');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert('('); }), '(', 'result then ( starts fresh');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert('sin('); }), 'sin(', 'result then sin( starts fresh');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert(U.sqrt + '('); }), U.sqrt + '(', 'result then √( starts fresh');
  t.is(after('42', u => { u.setEvaluated('42'); u.insert(U.pi); }), U.pi, 'result then π starts fresh');
  // Normal append when not just-evaluated.
  t.is(after('12', u => u.insert('3')), '123', 'plain append');
  t.is(after('', u => u.insert('7')), '7', 'append to empty');

  // ---------------------------------------------------------------- //
  t.group('del & clearAll');
  t.is(after('123', u => u.del()), '12', 'del removes last char');
  t.is(after('1', u => u.del()), '', 'del to empty');
  t.is(after('', u => u.del()), '', 'del on empty is a no-op');
  t.is(after('sin(', u => u.del()), 'sin', 'del removes one glyph');
  t.is(after('99', u => u.clearAll()), '', 'clearAll empties');
  t.ok((() => { ui.setEvaluated('5'); ui.clearAll(); return !ui.isJustEvaluated(); })(), 'clearAll resets justEvaluated');

  // ---------------------------------------------------------------- //
  t.group('insert — block a second decimal point (#5)');
  t.is(after('1.2', u => u.insert('.')), '1.2', 'second . in a number is ignored');
  t.is(after('3', u => { u.insert('.'); u.insert('1'); u.insert('.'); u.insert('4'); }), '3.14', '1..3..4 typed -> 3.14');
  t.is(after('1.2+', u => u.insert('.')), '1.2+0.', '. starts a fresh number as 0.');
  t.is(after('', u => u.insert('.')), '0.', '. on empty -> 0.');
  t.is(after('(', u => u.insert('.')), '(0.', '. after ( -> (0.');
  t.is(after('1.2+3', u => u.insert('.')), '1.2+3.', '. allowed in a fresh number after operator');
  t.is(after('1.2+3.', u => u.insert('.')), '1.2+3.', 'but not a second one there');
  t.is(after('12', u => u.insert('.')), '12.', 'first . is fine');

  // ---------------------------------------------------------------- //
  t.group('keyboard guard — editingElsewhere (#3 / inline safety)');
  const root = { contains: (el) => el && el.__inside === true };
  const ee = ui.editingElsewhere;
  t.ok(ee(null, root) === false, 'no focused element -> handle');
  t.ok(ee(root, root) === false, 'focus is the device itself -> handle');
  t.ok(ee({ tagName: 'BUTTON', __inside: true }, root) === false, 'focus on our own button -> handle');
  t.ok(ee({ tagName: 'INPUT' }, root) === true, 'focus in a foreign INPUT -> yield');
  t.ok(ee({ tagName: 'TEXTAREA' }, root) === true, 'foreign TEXTAREA -> yield');
  t.ok(ee({ tagName: 'SELECT' }, root) === true, 'foreign SELECT -> yield');
  t.ok(ee({ tagName: 'DIV', isContentEditable: true }, root) === true, 'foreign contenteditable -> yield');
  t.ok(ee({ tagName: 'DIV' }, root) === false, 'foreign non-editable DIV (e.g. body) -> handle');
};
