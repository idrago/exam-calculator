"use strict";
/* Tests for the state helpers: toggleSign, insert (with the justEvaluated
 * continuation rule), equals and Ans, del, clearAll and the rendered display.
 * They operate on the display string `expr` through loadUI()'s accessors. */
const { loadUI, U } = require('./harness');

module.exports = function run(t) {
  const ui = loadUI();

  // Apply `fn` to a starting expr and assert the resulting expr.
  const after = (start, fn) => { ui.set(start); fn(ui); return ui.get(); };
  const sign  = (start, exp, name) => t.is(after(start, u => u.toggleSign()), exp, name || `±  ${JSON.stringify(start)}`);
  // ± on a single product negates its value.
  const negates = (start) => t.eq(() => ui.value(after(start, u => u.toggleSign())), ui.value(U.minus + '(' + start + ')'),
                                  `±  ${JSON.stringify(start)} negates the value`);
  // Key sequence from an empty expression: '=' equals, '±' sign, '⌫' delete, else insert.
  const press = (...keys) => {
    ui.set('');
    for (const k of keys) {
      if (k === '=') ui.equals(); else if (k === '±') ui.toggleSign(); else if (k === '⌫') ui.del(); else ui.insert(k);
    }
    return ui;
  };

  // ---------------------------------------------------------------- //
  t.group('toggleSign — numbers');
  sign('5', U.minus + '5');
  sign(U.minus + '5', '5');                                  // toggle back off
  sign('3.5', U.minus + '3.5');
  sign('', '', '± on empty is a no-op');
  sign('3+5', '3+' + U.minus + '5');                         // negate 2nd operand
  sign('3+' + U.minus + '5', '3+5');                         // and back
  t.is(after('5', u => { u.toggleSign(); u.toggleSign(); }), '5', '± twice restores');
  sign('3.', U.minus + '3.');                                // trailing decimal point
  sign('.5', U.minus + '.5');

  t.group('toggleSign — groups, functions, constants');
  sign('sin(30)', U.minus + 'sin(30)');                      // negate a function result
  sign(U.minus + 'sin(30)', 'sin(30)');                      // and back
  sign('(2+3)', U.minus + '(2+3)');                          // negate a paren group
  sign('2' + U.mul + '(3+4)', '2' + U.mul + U.minus + '(3+4)');
  sign(U.pi, U.minus + U.pi);                                // negate π
  sign('cos(45)', U.minus + 'cos(45)');
  sign('1+sqrt(9)', '1+' + U.minus + 'sqrt(9)');
  sign(U.sqrt + '(9)', U.minus + U.sqrt + '(9)');            // √ key glyph
  sign('2' + U.mul + U.sqrt + '(9)', '2' + U.mul + U.minus + U.sqrt + '(9)');
  sign('5!', U.minus + '5!');                                // factorial operand
  sign('(2+1)!', U.minus + '(2+1)!');
  sign('Ans', U.minus + 'Ans');

  t.group('toggleSign — implied multiplication gets an explicit ×');
  sign('2' + U.pi, '2' + U.mul + U.minus + U.pi);
  sign('2' + U.mul + U.minus + U.pi, '2' + U.mul + U.pi);    // and back
  sign('2(3)', '2' + U.mul + U.minus + '(3)');
  sign('2sin(30)', '2' + U.mul + U.minus + 'sin(30)');
  sign('(1+2)(3+4)', '(1+2)' + U.mul + U.minus + '(3+4)');
  sign('2' + U.sqrt + '(9)', '2' + U.mul + U.minus + U.sqrt + '(9)');
  for (const s of ['2' + U.pi, '2(3)', '2sin(30)', '(1+2)(3+4)', U.sqrt + '(9)', '2' + U.sqrt + '(9)', '5!', '(2+1)!', '3.', 'e' + U.pi]) negates(s);

  t.group('toggleSign — leading-minus detection');
  sign(U.minus + '(2+3)', '(2+3)');                          // strip a leading sign
  sign('2' + U.mul + U.minus + '(3+4)', '2' + U.mul + '(3+4)');
  sign(U.minus + 'sin(30)', 'sin(30)');
  sign('3' + U.minus + '5', '3' + U.minus + U.minus + '5');  // binary minus stays

  // ---------------------------------------------------------------- //
  t.group('equals — result kept as Ans');
  t.is(press('6' + U.mul + '7', '=').get(), 'Ans', '= leaves Ans as the expression');
  t.is(ui.exprText(), '42', '= displays the result');
  t.is(ui.previewText(), '', '= clears the preview');
  t.ok(ui.isJustEvaluated(), '= sets justEvaluated');
  t.is(press('1' + U.div + '0', '=').get(), '1' + U.div + '0', 'error leaves the expression');
  t.is(ui.previewText(), 'Error', 'error shown in the preview');
  t.is(press('=').get(), '', '= on empty is a no-op');

  t.group('insert — justEvaluated continuation');
  // After "=", an operator continues from Ans...
  t.is(press('42', '=', '+').get(), 'Ans+', 'result then + continues');
  t.is(press('42', '=', U.mul).get(), 'Ans' + U.mul, 'result then × continues');
  t.is(press('42', '=', '^').get(), 'Ans^', 'result then ^ continues');
  t.is(press('42', '=', '!').get(), 'Ans!', 'result then ! continues');
  t.is(press('42', '=', U.minus).get(), 'Ans' + U.minus, 'result then − continues');
  // ...while a fresh value starts over.
  t.is(press('42', '=', '7').get(), '7', 'result then digit starts fresh');
  t.is(press('42', '=', '.').get(), '0.', 'result then . starts fresh as 0.');
  t.is(press('42', '=', '(').get(), '(', 'result then ( starts fresh');
  t.is(press('42', '=', 'sin(').get(), 'sin(', 'result then sin( starts fresh');
  t.is(press('42', '=', U.sqrt + '(').get(), U.sqrt + '(', 'result then √( starts fresh');
  t.is(press('42', '=', U.pi).get(), U.pi, 'result then π starts fresh');
  t.is(press('42', '=', 'e').get(), 'e', 'result then e starts fresh');
  // Normal append when not just-evaluated.
  t.is(after('12', u => u.insert('3')), '123', 'plain append');
  t.is(after('', u => u.insert('7')), '7', 'append to empty');

  t.group('chained results use full precision');
  const chain = (keys, exp, name) => t.is(press(...keys).exprText(), exp, name);
  chain(['1' + U.div + '10000000', '=', '='], '1' + U.mul + '10^-7', '1÷10000000 = =');
  chain(['10^21', '=', '='], '1' + U.mul + '10^21', '10^21 = =');
  chain(['1' + U.div + '3000000', '=', '±', '='], '-3.33333333333' + U.mul + '10^-7', '1÷3000000 = ± =');
  chain(['1234567890123', '='], '1234567890123', '13-digit integer');
  chain(['999999999999+2', '='], '1000000000001', '999999999999+2');
  chain(['2^50', '=', '%', '7', '='], '4', '2^50 = mod 7 =');
  chain(['1' + U.div + '3', '=', U.mul, '3', '='], '1', '1÷3 = ×3 =');
  chain(['3' + U.minus + '8', '=', '^', '2', '='], '25', '3−8 = ^2 = is (−5)^2');
  t.is(press('3' + U.minus + '8', '=', '^', '2').previewText(), '= 25', 'preview of Ans^2');
  t.is(press('1' + U.minus + '4', '=', '!', '=').previewText(), 'Error', '1−4 = ! = is (−3)!, an error');
  t.is(press('3' + U.minus + '8', '=', '±').get(), U.minus + 'Ans', '± after = negates Ans');
  t.is(ui.previewText(), '= 5', 'preview of −Ans');
  t.is(press('3' + U.minus + '8', '=', '±', '±').get(), 'Ans', '± twice restores Ans');

  // ---------------------------------------------------------------- //
  t.group('del & clearAll');
  t.is(after('123', u => u.del()), '12', 'del removes last char');
  t.is(after('1', u => u.del()), '', 'del to empty');
  t.is(after('', u => u.del()), '', 'del on empty is a no-op');
  t.is(after('sin(', u => u.del()), 'sin', 'del removes one glyph');
  t.is(press('42', '=', '⌫').get(), '', 'del after = removes Ans as one token');
  t.is(press('42', '=', '+', '⌫').get(), 'Ans', 'del of an operator after Ans');
  t.is(after('99', u => u.clearAll()), '', 'clearAll empties');
  t.ok((() => { press('5', '='); ui.clearAll(); return !ui.isJustEvaluated(); })(), 'clearAll resets justEvaluated');

  // ---------------------------------------------------------------- //
  t.group('insert — block a second decimal point');
  t.is(after('1.2', u => u.insert('.')), '1.2', 'second . in a number is ignored');
  t.is(after('3', u => { u.insert('.'); u.insert('1'); u.insert('.'); u.insert('4'); }), '3.14', '1..3..4 typed -> 3.14');
  t.is(after('1.2+', u => u.insert('.')), '1.2+0.', '. starts a fresh number as 0.');
  t.is(after('', u => u.insert('.')), '0.', '. on empty -> 0.');
  t.is(after('(', u => u.insert('.')), '(0.', '. after ( -> (0.');
  t.is(after('1.2+3', u => u.insert('.')), '1.2+3.', '. allowed in a fresh number after operator');
  t.is(after('1.2+3.', u => u.insert('.')), '1.2+3.', 'but not a second one there');
  t.is(after('12', u => u.insert('.')), '12.', 'first . is fine');

  // ---------------------------------------------------------------- //
  t.group('keyboard guard — editingElsewhere (inline embedding)');
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
