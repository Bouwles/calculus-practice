import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../src/questions.js';
import { checkAnswer } from '../src/answers.js';

function seededRandom(seed = 17) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('recognizes equivalent polynomial answers, including implicit multiplication', () => {
  for (const input of ['3x^2', ' 3 * x ^ 2 ', 'x*x+x^2+ x^2', '3(x+1)(x-1)+3', '6x^3/(2x)', '3.0x²']) {
    assert.equal(checkAnswer(input, { kind: 'derivative', answer: '3x^2' }).correct, true, input);
  }
  for (const input of ['3x', '-3x^2', '3x^2+0.0000001', '3x^2+x(x-1)(x+1)(x-2)(x+2)']) {
    assert.equal(checkAnswer(input, { kind: 'derivative', answer: '3x^2' }).correct, false, input);
  }
});

test('recognizes basic trig and exponential forms and identities', () => {
  for (const [input, answer] of [
    ['-sin(x)', '-sin(x)'], ['sin(-x)', '-sin(x)'], ['cos(-x)', 'cos(x)'],
    ['exp(x)', 'e^x'], ['e^(x)', 'e^x'], ['e^x*(sin(x)^2+cos(x)^2)', 'e^x'],
    ['2sin(x)/2', 'sin(x)'], ['-x^2', '-1*x^2'], ['(-x)^2', 'x^2'],
  ]) assert.equal(checkAnswer(input, { kind: 'derivative', answer }).correct, true, input);
  assert.equal(checkAnswer('sin(x)', { kind: 'derivative', answer: 'cos(x)' }).correct, false);
});

test('checks indefinite integrals by differentiating; accepts fractions and additive constants', () => {
  for (const [input, source] of [
    ['x^3/3', 'x^2'], ['(1/3)*x^3', 'x^2'], ['0.5x^2+7', 'x'],
    ['x^2 + C', '2x'], ['-cos(x)', 'sin(x)'], ['sin(x)+2', 'cos(x)'],
    ['exp(x)+9', 'e^x'], ['x^2/2+sin(x)^2+cos(x)^2', 'x'],
    ['x^3/3+2x', 'x^2+2'],
  ]) assert.equal(checkAnswer(input, { kind: 'integral', source }).correct, true, input);
  assert.equal(checkAnswer('cos(x)', { kind: 'integral', source: 'sin(x)' }).correct, false);
  assert.equal(checkAnswer('x^2', { kind: 'integral', source: 'x' }).correct, false);
});

test('invalid or excessive input is safely rejected with a useful error', () => {
  for (const input of ['', '   ', 'alert(1)', 'globalThis.process.exit()', '<script>', 'x;1',
    'x/0', '0/0', '1/(x-x)', 'x^999999', 'sin(2x)', 'x +', '1..2x', 'xx',
    '('.repeat(100) + 'x' + ')'.repeat(100), '9'.repeat(150)]) {
    const result = checkAnswer(input, { kind: 'derivative', answer: 'x' });
    assert.equal(result.correct, false, input);
    assert.equal(typeof result.error, 'string', input);
    assert.ok(result.error.length > 0);
  }
});

test('generates all requested families in each mode without immediate repeats', () => {
  for (const mode of ['derivatives', 'integration', 'mixed']) {
    const random = seededRandom();
    let previous;
    const families = new Set();
    const kinds = new Set();
    const signatures = new Set();
    for (let index = 0; index < 1000; index++) {
      const q = generateQuestion(mode, previous?.id, random);
      assert.notEqual(q.id, previous?.id);
      assert.ok(q.tex && q.answerTex && q.explanation);
      assert.ok(!q.tex.includes('\\int_'), 'no integral bounds');
      assert.ok(!/\/|sqrt|log/.test(q.source), 'mental arithmetic only');
      assert.ok(q.terms.length <= 3);
      for (const term of q.terms) {
        assert.ok(Math.abs(term.coefficient) <= 6);
        if (term.type === 'power') assert.ok(term.power >= 0 && term.power <= (q.kind === 'integral' ? 3 : 4));
      }
      assert.equal(checkAnswer(q.answer, q).correct, true, JSON.stringify(q));
      assert.equal(checkAnswer(`(${q.answer})+x`, q).correct, false);
      families.add(q.family);
      kinds.add(q.kind);
      signatures.add(q.id);
      previous = q;
    }
    assert.deepEqual([...families].sort(), ['constant', 'cos', 'exp', 'polynomial', 'power', 'sin']);
    assert.ok(signatures.size > 100, 'procedural variety');
    assert.deepEqual([...kinds].sort(), mode === 'mixed' ? ['derivative', 'integral'] : [mode === 'derivatives' ? 'derivative' : 'integral']);
  }
});

test('repeat avoidance terminates even with a constant random source', () => {
  for (const mode of ['derivatives', 'integration', 'mixed']) {
    const first = generateQuestion(mode, undefined, () => 0);
    const second = generateQuestion(mode, first.id, () => 0);
    assert.notEqual(first.id, second.id);
  }
  assert.throws(() => generateQuestion('unknown'), /mode/i);
});

test('generated answers match hand-calculated derivatives and integrals', () => {
  const fixtures = [
    [0, '-6', '0', '-6', '-6x'],
    [0.2, '-2x', '-2', '-2x', '-x^2'],
    [0.4, '-3x^2 - 3', '-6x', '-3x^2 - 3x', '-x^3 - (3/2)x^2'],
    [0.6, '4sin(x)', '4cos(x)', '4sin(x)', '-4cos(x)'],
    [0.75, '4cos(x)', '-4sin(x)', '4cos(x)', '4sin(x)'],
    [0.9, '5e^x', '5e^x', '5e^x', '5e^x'],
  ];
  for (const [random, derivativeSource, derivative, integralSource, integral] of fixtures) {
    const d = generateQuestion('derivatives', undefined, () => random);
    const i = generateQuestion('integration', undefined, () => random);
    assert.equal(d.source, derivativeSource);
    assert.equal(i.source, integralSource);
    assert.equal(d.answer, derivative);
    assert.equal(i.answer, integral);
  }
});

test('repeat fallback preserves a nonzero trig question and its basic rule', () => {
  let index = 0;
  const random = () => [0.51, 0, 0][index++ % 3];
  const first = generateQuestion('derivatives', undefined, random);
  assert.equal(first.source, '-sin(x)');
  const second = generateQuestion('derivatives', first.id, random);
  assert.notEqual(second.source, '0');
  assert.equal(second.ruleTex, '\\frac{d}{dx}\\sin(x) = \\cos(x)');
});
