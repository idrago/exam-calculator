"use strict";
/* Comprehensive tests for the math engine (tokenize -> RPN -> evaluate). */
const { loadEngine, U } = require('./harness');

module.exports = function run(t) {
  const { compute, fmt, tokenize, normalize } = loadEngine();

  // calc(expr) === exactly what equals()/preview shows the user.
  const calc = (expr, deg = true) => fmt(compute(expr, deg));
  const eq   = (expr, exp, deg = true) => t.eq(() => calc(expr, deg), String(exp), `${expr}${deg ? '' : ' [rad]'}`);
  const err  = (expr, deg = true)      => t.throws(() => calc(expr, deg), `${expr} -> Error`);
  const near = (expr, exp, deg = true, tol) => t.near(() => compute(expr, deg), exp, `${expr}${deg ? '' : ' [rad]'} ~ ${exp}`, tol);

  // ---------------------------------------------------------------- //
  t.group('arithmetic');
  eq('1+1', 2);
  eq('9'+U.minus+'4', 5);
  eq('2'+U.minus+'5', -3);
  eq('6'+U.mul+'7', 42);
  eq('8'+U.div+'2', 4);
  eq('7'+U.div+'2', 3.5);
  eq('2^10', 1024);
  eq('0', 0);
  eq('42', 42);
  eq('3.14159', 3.14159);
  eq(U.minus+'5', -5);
  eq('+5', 5);                       // leading unary plus is dropped
  eq('5.', 5);                       // trailing dot tolerated
  eq('0.5', 0.5);
  eq('0.000001', 0.000001);

  t.group('modulo (JS remainder semantics)');
  eq('10%3', 1);
  eq('10%2', 0);
  eq('7.5%2', 1.5);
  eq(U.minus+'5%3', -2);             // sign follows dividend (documented)
  eq('5%'+U.minus+'3', 2);

  // ---------------------------------------------------------------- //
  t.group('precedence & associativity');
  eq('2+3'+U.mul+'4', 14);
  eq('(2+3)'+U.mul+'4', 20);
  eq('2'+U.mul+'3+4', 10);
  eq('2+3'+U.minus+'1', 4);
  eq('100'+U.minus+'10'+U.minus+'5', 85);   // left-assoc -
  eq('20'+U.div+'4'+U.div+'5', 1);          // left-assoc /
  eq('2^3^2', 512);                         // right-assoc ^  => 2^(3^2)
  eq('2+10%3', 3);                          // % binds before +
  eq('1+2'+U.mul+'3^2', 19);                // ^ then * then +
  eq('('+'1+2'+')'+U.mul+'('+'3+4'+')', 21);

  t.group('unary minus (math convention)');
  eq(U.minus+'2^2', -4);                    // -(2^2): power binds tighter
  eq('('+U.minus+'2)^2', 4);                // explicit parens
  eq(U.minus+'2'+U.mul+'3', -6);            // (-2)*3
  eq('2^'+U.minus+'2', 0.25);               // 2^(-2)
  eq('3'+U.minus+U.minus+'2', 5);           // 3 - (-2)
  eq(U.minus+U.minus+'5', 5);               // double negation

  // ---------------------------------------------------------------- //
  t.group('trig — degree mode, exact angles snap clean');
  eq('sin(0)', 0);
  eq('sin(30)', 0.5);
  eq('sin(90)', 1);
  eq('sin(180)', 0);
  eq('cos(0)', 1);
  eq('cos(60)', 0.5);
  eq('cos(90)', 0);                         // exact, not 6.12e-17
  eq('cos(180)', -1);
  eq('tan(0)', 0);
  eq('tan(45)', 1);
  eq('tan(180)', 0);
  err('tan(90)');                           // undefined -> Error
  err('tan(270)');
  err('tan('+U.minus+'90)');
  eq('asin(0.5)', 30);
  eq('asin(1)', 90);
  eq('acos(0.5)', 60);
  eq('acos(1)', 0);
  eq('atan(1)', 45);
  eq('atan(0)', 0);

  t.group('trig — radian mode');
  near('sin(0)', 0, false);
  near('cos(0)', 1, false);
  near('atan(1)', Math.PI/4, false);
  near('sin('+U.pi+')', 0, false);          // snaps to 0
  eq('cos('+U.pi+')', -1, false);
  near('sin('+U.pi+'/2)', 1, false);

  t.group('log / root / exp / abs');
  eq('sqrt(0)', 0);
  eq('sqrt(9)', 3);
  eq(U.sqrt+'(16)', 4);
  eq('sqrt(2)^2', 2);                        // snaps back to 2
  eq('log(1)', 0);
  eq('log(100)', 2);
  eq('log(1000)', 3);
  eq('ln(1)', 0);
  eq('ln(e)', 1);
  near('exp(0)', 1);
  near('exp(1)', Math.E);
  near('ln(exp(3))', 3);
  eq('abs(7)', 7);
  eq('abs('+U.minus+'7)', 7);
  eq('abs(0)', 0);

  t.group('constants');
  near(U.pi, Math.PI);
  near('e', Math.E);
  near('pi', Math.PI);
  eq('cos(2'+U.mul+U.pi+')', 1, false);      // cos(2π)=1 in rad

  // ---------------------------------------------------------------- //
  t.group('factorial');
  eq('0!', 1);
  eq('1!', 1);
  eq('2!', 2);
  eq('5!', 120);
  eq('10!', 3628800);
  eq('3!+1', 7);
  eq('2'+U.mul+'3!', 12);                     // 2*(3!)
  eq('2^3!', 64);                             // 2^(3!)
  eq(U.minus+'3!', -6);                        // -(3!)
  eq('(2+1)!', 6);
  t.ok(isFinite(compute('170!', true)), '170! is finite');
  err('171!');                                // overflow -> Infinity -> Error
  err('('+U.minus+'1)!');                      // negative -> NaN -> Error
  err('2.5!');                                 // non-integer -> NaN -> Error

  // ---------------------------------------------------------------- //
  t.group('implicit multiplication');
  near('2'+U.pi, 2*Math.PI);
  eq('2(3)', 6);
  eq('(2)(3)', 6);
  eq('(1+2)(3+4)', 21);
  near('2sin(30)', 1);                         // 2 * 0.5
  eq('3'+U.minus+'2(4)', -5);                  // 3 - (2*4)
  near(U.pi+U.pi, Math.PI*Math.PI, false);     // π·π
  near('2'+U.sqrt+'(9)', 6);                   // 2 * sqrt(9)
  eq('2!3', 6);                                // (2!)*3 = 2*3
  eq('sin(30)cos(0)', 0.5);                    // implicit-mult = 0.5 * 1
  eq('sin(30)cos(0)', String(calc('sin(30)'+U.mul+'cos(0)')), true); // == explicit ×

  // ---------------------------------------------------------------- //
  t.group('nesting & composition');
  eq('((1+2)'+U.mul+'(3+4))', 21);
  near('sqrt(sin(30)'+U.mul+'2)', 1);
  eq('2'+U.mul+'(3+4)'+U.minus+'1', 13);
  eq('abs('+U.minus+'3'+U.minus+'4)', 7);
  near('sqrt(3^2+4^2)', 5);                    // hypotenuse

  // ---------------------------------------------------------------- //
  t.group('errors & malformed input');
  err('1'+U.div+'0');                          // Infinity
  err('0'+U.div+'0');                          // NaN
  err('ln(0)');                                // -Infinity
  err('ln('+U.minus+'1)');                     // NaN
  err('log(0)');
  err('asin(2)');                              // domain
  err('acos(2)');
  err('sqrt('+U.minus+'1)');
  err('1+');                                   // dangling op
  err(U.mul+'5');                              // leading binary op
  err('(1+2');                                 // unmatched (
  err('1+2)');                                 // unmatched )
  err('()');                                   // empty group
  err('sin()');                                // empty arg
  err('');                                     // empty expression
  err('@');                                    // bad char
  eq('1++2', 3);                               // second + is unary plus (valid)
  err('1+'+U.mul+'2');                         // binary then binary -> Error
  err('3'+U.mul+U.div+'4');                    // op op -> Error

  t.group('function must be followed by "("');
  err(U.sqrt+'9');                             // √9 (deleted paren) -> Error, not sqrt(9)
  err(U.sqrt+'9+7');                           // not sqrt(9+7)
  err('sin30');                                // not sin(30)
  err('sin30+1');                              // not sin(31)
  err('2sin30');
  eq('sin(30)+1', 1.5);                        // proper call still works
  near('2sin(30)', 1);                         // implicit-mult call still works
  eq(U.sqrt+'(9)+7', 10);
  near('sin(cos(0))', Math.sin(1 * Math.PI / 180)); // deg: cos(0)=1, then sin(1°)

  // ---------------------------------------------------------------- //
  t.group('formatting (fmt strips float noise)');
  eq('0.1+0.2', 0.3);
  eq('1'+U.div+'3', 0.333333333333);           // toPrecision(12)
  eq('2'+U.div+'3', 0.666666666667);
  eq('1000000'+U.mul+'1000000', 1000000000000);
  eq('0.1'+U.mul+'0.1', 0.01);

  // ---------------------------------------------------------------- //
  t.group('tokenizer / normalize');
  t.is(normalize('2'+U.mul+'3'), '2*3', 'normalize ×');
  t.is(normalize('6'+U.div+'2'), '6/2', 'normalize ÷');
  t.is(normalize(U.minus+'4'), '-4', 'normalize −');
  t.is(tokenize('12.5').length, 1, 'one number token');
  t.throws(() => tokenize('1.2.3'), '1.2.3 -> Error (second point in a number)');
  t.is(tokenize('sin').length, 1, 'function name single token');
  t.is(tokenize('   ').length, 0, 'whitespace -> no tokens');

  t.group('letter runs split into known names (longest first)');
  near('ee', Math.E * Math.E);
  near('esin(30)', Math.E / 2);
  eq('eln(e)', String(calc('e')));                    // e * ln(e) = e
  near('exp(1)', Math.E);                              // exp, not e*xp
  near('eexp(0)', Math.E);
  near('2e', 2 * Math.E);
  err('ex');                                           // x is not a name
  err('sinx(30)');

  // ---------------------------------------------------------------- //
  t.group('formatting — exact integers, ×10^n exponent (no "e")');
  t.is(fmt(1234567890123), '1234567890123', '13-digit integer in full');
  t.is(fmt(2 ** 53 - 1), '9007199254740991', '2^53 - 1 in full');
  t.is(fmt(2 ** 60), '1.15292150461' + U.mul + '10^18', 'beyond 2^53: 12 digits + exponent');
  t.is(fmt(1e21), '1' + U.mul + '10^21', '1e21');
  t.is(fmt(1e-7), '1' + U.mul + '10^-7', '1e-7');
  t.is(fmt(1 / 3000000), '3.33333333333' + U.mul + '10^-7', '1/3000000');
  t.is(fmt(-5), '-5', 'negative integer');
  t.is(fmt(-0), '0', '-0 shows as 0');
  t.is(fmt(123456789012.5), '123456789013', '12 significant digits, rounded');
  for (const x of [1e-7, 1 / 3000000, 1e21, -2.5e-9, 2 ** 60]) {
    near(fmt(x), x, true, Math.abs(x) * 1e-11);       // displayed text re-enters as the same value
  }

  // ---------------------------------------------------------------- //
  t.group('Ans — atomic full-precision operand');
  const withAns = (expr, ans, exp, deg = true) => t.eq(() => fmt(compute(expr, deg, ans)), String(exp), `${expr} with Ans=${ans}`);
  withAns('Ans^2', -5, 25);                            // (−5)^2, not −(5^2)
  withAns('Ans' + U.mul + '3', 1 / 3, 1);              // full precision, not 0.999999999999
  withAns('Ans%7', 2 ** 50, 4);
  withAns('2Ans', 3, 6);                               // implicit multiplication
  withAns(U.minus + 'Ans', 1e-7, '-1' + U.mul + '10^-7');
  withAns('Ans', 1234567890123, 1234567890123);
  t.throws(() => compute('Ans!', true, -3), 'Ans! with Ans=-3 -> Error');
  t.throws(() => compute('Ans', true), 'Ans without a value -> Error');

  // ---------------------------------------------------------------- //
  t.group('non-finite intermediate values are errors');
  err('1' + U.div + '(1' + U.div + '0)');
  err('5+1' + U.div + '(1' + U.div + '0)');
  err('atan(1' + U.div + '0)');
  err('1' + U.div + 'tan(90)');
  err('1' + U.div + '171!');
  err('0' + U.mul + 'ln(0)');

  t.group('trig — exact quadrants and accuracy near them');
  eq('sin(' + U.minus + '90)', -1);
  eq('cos(270)', 0);
  eq('cos(' + U.minus + '180)', -1);
  eq('sin(720)', 0);
  eq('tan(' + U.minus + '45)', -1);
  eq('tan(135)', -1);
  eq('sin(30)', 0.5);
  eq('sin(150)', 0.5);
  err('tan(450)');
  near('tan(89.99999999999)', 180 / (Math.PI * (90 - 89.99999999999)), true, 1e-12 * 5.73e12);   // finite, not Error
  near('sin(179.9999999)', Math.sin((180 - 179.9999999) * Math.PI / 180), true, 1e-21);
  near('cos(90.0000001)', -Math.sin((90.0000001 - 90) * Math.PI / 180), true, 1e-21);
  eq('sin(999999999750)', 0.5);                        // 360·2777777777 + 30, reduced exactly

  t.group('trig — radian mode, poles and tiny arguments');
  err('tan(' + U.pi + U.div + '2)', false);
  err('tan(3' + U.pi + U.div + '2)', false);
  eq('tan(' + U.pi + ')', 0, false);
  eq('tan(' + U.pi + U.div + '4)', 1, false);
  eq('cos(' + U.pi + U.div + '2)', 0, false);
  eq('sin(0.00000000005)', '5' + U.mul + '10^-11', false);   // not snapped to 0
  eq('atan(0.00000000001)', '1' + U.mul + '10^-11', false);
  eq('sin(3.14159265359)', '-2.0682310711' + U.mul + '10^-13', false);   // 12-digit π is not π

  t.group('factorial of a value within rounding of an integer');
  eq('(sqrt(2)^2)!', 2);
  eq('asin(0.5)!', String(calc('30!')));
  err('2.5!');
  err('(' + U.minus + '1)!');
};
