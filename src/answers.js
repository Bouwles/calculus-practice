// Exact rational polynomials in x, sin(x), cos(x), and exp(x).
// Input is parsed into an allowlisted syntax tree; it is never executed.
const ZERO_KEY = '0,0,0,0';
const MAX_TERMS = 128;
const syntaxError = () => new Error('Use numbers, x, +, -, *, /, ^, parentheses, sin(x), cos(x), or e^x.');
const complexityError = () => new Error('That expression is too large. Try a shorter answer with small powers.');
const absolute = (n) => n < 0n ? -n : n;

function fraction(n, d = 1n) {
  if (d === 0n) throw new Error('Division by zero is not allowed.');
  if (d < 0n) { n = -n; d = -d; }
  let a = absolute(n), b = d;
  while (b) [a, b] = [b, a % b];
  const value = { n: n / a, d: d / a };
  if (absolute(value.n).toString().length > 64 || value.d.toString().length > 64) throw complexityError();
  return value;
}
const addCoefficient = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const multiplyCoefficient = (a, b) => fraction(a.n * b.n, a.d * b.d);
const negateCoefficient = (a) => ({ n: -a.n, d: a.d });
const polynomialConstant = (value) => value.n ? new Map([[ZERO_KEY, value]]) : new Map();
const one = () => polynomialConstant(fraction(1n));

function putTerm(poly, powers, coefficient) {
  if (!coefficient.n) return;
  if (powers.some((power) => power > 64)) throw complexityError();
  // sin(x)^2 = 1 - cos(x)^2 gives a common form for trig identities.
  if (powers[1] >= 2) {
    const reduced = [...powers];
    reduced[1] -= 2;
    putTerm(poly, reduced, coefficient);
    reduced[2] += 2;
    putTerm(poly, reduced, negateCoefficient(coefficient));
    return;
  }
  const key = powers.join(',');
  const value = addCoefficient(poly.get(key) ?? fraction(0n), coefficient);
  if (value.n) poly.set(key, value); else poly.delete(key);
  if (poly.size > MAX_TERMS) throw complexityError();
}

function addPolynomials(a, b, subtract = false) {
  const result = new Map(a);
  for (const [key, value] of b) putTerm(result, key.split(',').map(Number), subtract ? negateCoefficient(value) : value);
  return result;
}

function multiplyPolynomials(a, b) {
  const result = new Map();
  for (const [aKey, aValue] of a) {
    const aPowers = aKey.split(',').map(Number);
    for (const [bKey, bValue] of b) {
      const bPowers = bKey.split(',').map(Number);
      putTerm(result, aPowers.map((value, index) => value + bPowers[index]), multiplyCoefficient(aValue, bValue));
    }
  }
  return result;
}

function rational(n, d = one()) {
  if (!d.size) throw new Error('Division by zero is not allowed.');
  if (!n.size) return { n, d: one() };
  if (d.size === 1 && d.has(ZERO_KEY)) {
    const divisor = d.get(ZERO_KEY);
    return { n: new Map([...n].map(([key, value]) => [key, fraction(value.n * divisor.d, value.d * divisor.n)])), d: one() };
  }
  return { n, d };
}
const constant = (n, d = 1n) => rational(polynomialConstant(fraction(n, d)));
const add = (a, b, subtract = false) => rational(addPolynomials(multiplyPolynomials(a.n, b.d), multiplyPolynomials(b.n, a.d), subtract), multiplyPolynomials(a.d, b.d));
const multiply = (a, b) => rational(multiplyPolynomials(a.n, b.n), multiplyPolynomials(a.d, b.d));
const divide = (a, b) => rational(multiplyPolynomials(a.n, b.d), multiplyPolynomials(a.d, b.n));
const equal = (a, b) => addPolynomials(multiplyPolynomials(a.n, b.d), multiplyPolynomials(b.n, a.d), true).size === 0;

function atom(index) {
  const powers = [0, 0, 0, 0];
  powers[index] = 1;
  return rational(new Map([[powers.join(','), fraction(1n)]]));
}

function power(base, exponent) {
  if (exponent < 0) return power(divide(constant(1n), base), -exponent);
  let result = constant(1n);
  for (let index = 0; index < exponent; index++) result = multiply(result, base);
  return result;
}

function derivativePolynomial(poly) {
  const result = new Map();
  for (const [key, coefficient] of poly) {
    const powers = key.split(',').map(Number);
    for (let index = 0; index < 4; index++) {
      if (!powers[index]) continue;
      const next = [...powers];
      if (index < 3) next[index]--;
      if (index === 1) next[2]++;
      if (index === 2) next[1]++;
      putTerm(result, next, multiplyCoefficient(coefficient, fraction(BigInt(powers[index] * (index === 2 ? -1 : 1)))));
    }
  }
  return result;
}

function differentiate(value) {
  return rational(addPolynomials(multiplyPolynomials(derivativePolynomial(value.n), value.d), multiplyPolynomials(value.n, derivativePolynomial(value.d)), true), multiplyPolynomials(value.d, value.d));
}

function parse(input) {
  if (!input.trim()) throw new Error('Enter an answer before checking.');
  if (input.length > 160) throw complexityError();
  input = input.replace(/−/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3');
  const tokens = [];
  const tokenizer = /\s+|(?:\d+(?:\.\d*)?|\.\d+)|[a-zA-Z]+|[()+*/^\-]/gy;
  let position = 0;
  while (position < input.length) {
    tokenizer.lastIndex = position;
    const match = tokenizer.exec(input);
    if (!match) throw syntaxError();
    if (!/^\s+$/.test(match[0])) {
      if (/^(?:\d|\.)/.test(match[0]) && /^(?:\d|\.)/.test(tokens.at(-1) ?? '')) throw syntaxError();
      tokens.push(match[0]);
    }
    position = tokenizer.lastIndex;
  }
  if (tokens.length > 100) throw complexityError();
  let cursor = 0, depth = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const startsAtom = (token) => token === '(' || /^(?:\d|\.)/.test(token ?? '') || /^[a-z]+$/i.test(token ?? '');

  function primary() {
    const token = take();
    if (/^(?:\d|\.)/.test(token ?? '')) {
      if (token.length > 16) throw complexityError();
      return { type: 'number', value: token };
    }
    if (token === '(') {
      const value = sum();
      if (take() !== ')') throw syntaxError();
      return value;
    }
    if (token === 'x' || token === 'e') return { type: token };
    if (['sin', 'cos', 'exp'].includes(token)) {
      if (take() !== '(') throw new Error('Put the function argument in parentheses, for example sin(x).');
      const argument = sum();
      if (take() !== ')') throw syntaxError();
      return { type: token, argument };
    }
    throw syntaxError();
  }
  function unary() {
    if (++depth > 24) throw complexityError();
    let value;
    if (peek() === '+' || peek() === '-') {
      const sign = take();
      value = { type: 'unary', sign, value: unary() };
    } else {
      value = primary();
      if (peek() === '^') { take(); value = { type: '^', left: value, right: unary() }; }
    }
    depth--;
    return value;
  }
  function product() {
    let value = unary();
    while (peek() === '*' || peek() === '/' || startsAtom(peek())) {
      const type = peek() === '*' || peek() === '/' ? take() : '*';
      value = { type, left: value, right: unary() };
    }
    return value;
  }
  function sum() {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const type = take();
      value = { type, left: value, right: product() };
    }
    return value;
  }
  const result = sum();
  if (cursor !== tokens.length) throw syntaxError();
  return result;
}

function compile(node) {
  if (node.type === 'number') {
    const [whole, decimal = ''] = node.value.split('.');
    return constant(BigInt((whole || '0') + decimal), 10n ** BigInt(decimal.length));
  }
  if (node.type === 'x') return atom(0);
  if (node.type === 'unary') return multiply(constant(node.sign === '-' ? -1n : 1n), compile(node.value));
  if (node.type === 'e') throw new Error('Write the exponential as e^x or exp(x).');
  if (['sin', 'cos', 'exp'].includes(node.type) || (node.type === '^' && node.left.type === 'e')) {
    const type = node.type === '^' ? 'exp' : node.type;
    const argument = compile(node.argument ?? node.right);
    const negative = equal(argument, multiply(constant(-1n), atom(0)));
    if (equal(argument, constant(0n))) return constant(type === 'sin' ? 0n : 1n);
    if (!negative && !equal(argument, atom(0))) throw new Error('Use sin(x), cos(x), or e^x with x as the argument.');
    const value = atom(type === 'sin' ? 1 : type === 'cos' ? 2 : 3);
    return negative ? type === 'cos' ? value : type === 'sin' ? multiply(constant(-1n), value) : divide(constant(1n), value) : value;
  }
  const left = compile(node.left), right = compile(node.right);
  if (node.type === '+') return add(left, right);
  if (node.type === '-') return add(left, right, true);
  if (node.type === '*') return multiply(left, right);
  if (node.type === '/') return divide(left, right);
  if (node.type === '^') {
    const value = right.n.get(ZERO_KEY) ?? fraction(0n);
    if (right.n.size > 1 || (right.n.size === 1 && !right.n.has(ZERO_KEY)) || right.d.size !== 1 || !right.d.has(ZERO_KEY) || value.d !== 1n || absolute(value.n) > 12n) throw new Error('Use a small whole-number power.');
    return power(left, Number(value.n));
  }
  throw syntaxError();
}

export function checkAnswer(input, question) {
  try {
    if (question.kind === 'integral') input = input.replace(/\+\s*c\s*$/i, '');
    const candidate = compile(parse(input));
    const expected = compile(parse(question.kind === 'integral' ? question.source : question.answer));
    return { correct: equal(question.kind === 'integral' ? differentiate(candidate) : candidate, expected) };
  } catch (error) {
    return { correct: false, error: error.message };
  }
}
