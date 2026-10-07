import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from '../src/questions.js';
import { checkAnswer, evaluateExpression } from './helpers/answers.js';
import katex from 'katex';

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

test('generates moderately challenging mental questions in every mode without repeats', () => {
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
      assert.ok(!/sqrt|log|ln/.test(q.source), 'no roots or logarithms');
      assert.ok(q.terms.length <= 3);
      for (const term of q.terms) {
        assert.ok(Math.abs(term.coefficient) <= 4);
        if (term.type === 'power') {
          assert.ok(term.power >= -3 && term.power <= (q.kind === 'integral' ? 3 : 4));
          if (q.kind === 'integral') assert.notEqual(term.power, -1, 'no logarithmic integrals');
        }
        if (term.scale) assert.ok(term.scale >= 1 && term.scale <= 3);
      }
      assert.ok(q.terms.length >= 2 || q.terms.some((term) => term.scale >= 2), 'each question needs more than a single basic rule');
      for (const x of [0.3, 0.8, 1.3]) {
        const h = 0.00001;
        const differentiated = q.kind === 'integral' ? q.answer : q.source;
        const expected = evaluateExpression(q.kind === 'integral' ? q.source : q.answer, x);
        const actual = (evaluateExpression(differentiated, x + h) - evaluateExpression(differentiated, x - h)) / (2 * h);
        assert.ok(Math.abs(actual - expected) <= 0.000001 * Math.max(1, Math.abs(expected)), JSON.stringify(q));
      }
      if (index < 30) {
        for (const tex of [q.tex, q.answerTex, q.ruleTex]) assert.doesNotThrow(() => katex.renderToString(tex, { throwOnError: true }));
      }
      families.add(q.family);
      kinds.add(q.kind);
      signatures.add(q.id);
      previous = q;
    }
    const derivativeFamilies = ['chain-power', 'cos', 'exp', 'mixed', 'polynomial', 'reciprocal', 'sin'];
    const integralFamilies = ['mixed', 'polynomial', 'reciprocal', 'trig-sum'];
    assert.deepEqual([...families].sort(), mode === 'derivatives' ? derivativeFamilies : mode === 'integration' ? integralFamilies : [...new Set([...derivativeFamilies, ...integralFamilies])].sort());
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
    ['derivatives', [0, 0, 0, 0, 0, 0.9, 0, 0.9], 'x^2 + x', '2x + 1'],
    ['integration', [0, 0, 0, 0, 0, 0.9, 0, 0.9], 'x^2 + x', '(1/3)x^3 + (1/2)x^2'],
    ['derivatives', [0.25, 0, 0, 0.9, 0, 0, 0.9], 'x^2 + sin(x)', '2x + cos(x)'],
    ['integration', [0.25, 0, 0, 0.9, 0, 0, 0.9], 'x + sin(x)', '(1/2)x^2 - cos(x)'],
    ['derivatives', [0.45, 0, 0.9, 0, 0, 0.9, 0], '(2x + 1)^2', '4(2x + 1)'],
    ['derivatives', [0.65, 0, 0, 0], '-sin(2x)', '-2cos(2x)'],
    ['derivatives', [0.75, 0, 0, 0], '-cos(2x)', '2sin(2x)'],
    ['derivatives', [0.85, 0, 0, 0], '-e^(2x)', '-2e^(2x)'],
    ['integration', [0.65, 0, 0, 0.9, 0, 0, 0.9], 'x^-3 + x', '-(1/2)x^-2 + (1/2)x^2'],
    ['derivatives', [0.95, 0, 0, 0.9, 0, 0, 0.9], 'x^-2 + x', '-2x^-3 + 1'],
    ['integration', [0.85, 0, 0, 0.9, 0, 0, 0.9], 'sin(x) + cos(x)', '-cos(x) + sin(x)'],
  ];
  for (const [mode, values, source, answer] of fixtures) {
    let index = 0;
    const q = generateQuestion(mode, undefined, () => values[index++] ?? 0);
    assert.equal(q.source, source);
    assert.equal(q.answer, answer);
  }
});

test('repeat fallback preserves a nonzero trig question and its basic rule', () => {
  let index = 0;
  const random = () => [0.65, 0, 0, 0][index++ % 4];
  const first = generateQuestion('derivatives', undefined, random);
  assert.equal(first.source, '-sin(2x)');
  const second = generateQuestion('derivatives', first.id, random);
  assert.notEqual(second.source, '0');
  assert.ok(second.explanation.includes('chain rule'));
  assert.ok(second.ruleTex.includes('2'));
});

test('numeric oracle independently evaluates scaled, shifted, and reciprocal expressions', () => {
  assert.equal(evaluateExpression('(2x+1)^3', 1), 27);
  assert.equal(evaluateExpression('3x^-2 + x', 2), 2.75);
  assert.ok(Math.abs(evaluateExpression('sin(2x) + e^(3x)', 0) - 1) < 1e-12);
});
