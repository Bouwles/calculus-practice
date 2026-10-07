// Weight the selection toward questions that take two short steps.
const derivativeFamilies = ['polynomial', 'polynomial', 'mixed', 'mixed', 'chain-power', 'chain-power', 'sin', 'cos', 'exp', 'reciprocal'];
const integralFamilies = ['polynomial', 'polynomial', 'mixed', 'mixed', 'mixed', 'mixed', 'reciprocal', 'reciprocal', 'trig-sum', 'trig-sum'];
const functions = ['sin', 'cos', 'exp'];
const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const coefficient = (random, max = 3) => integer(random, 1, max) * (random() < 0.5 ? -1 : 1);

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function argument(term) {
  const scale = term.scale ?? 1;
  const shift = term.shift ?? 0;
  return `${scale === 1 ? '' : scale}x${shift ? ` ${shift < 0 ? '-' : '+'} ${Math.abs(shift)}` : ''}`;
}

function factor(term, tex) {
  if (term.type === 'power') {
    return term.power === 0 ? '' : term.power === 1 ? 'x' : tex ? `x^{${term.power}}` : `x^${term.power}`;
  }
  const inner = argument(term);
  if (term.type === 'chain-power') {
    const brackets = tex ? `\\left(${inner}\\right)` : `(${inner})`;
    return brackets + (term.power === 1 ? '' : tex ? `^{${term.power}}` : `^${term.power}`);
  }
  if (term.type === 'exp') return tex ? `e^{${inner}}` : inner === 'x' ? 'e^x' : `e^(${inner})`;
  return `${tex ? '\\' : ''}${term.type}(${inner})`;
}

function expression(terms, tex = false) {
  const parts = [];
  for (const term of terms) {
    if (!term.coefficient) continue;
    let numerator = Math.abs(term.coefficient);
    let denominator = term.denominator ?? 1;
    const divisor = gcd(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
    const value = factor(term, tex);
    const number = denominator === 1 ? `${numerator}` : tex ? `\\frac{${numerator}}{${denominator}}` : `(${numerator}/${denominator})`;
    const body = tex && term.type === 'power' && term.power < 0
      ? `\\frac{${numerator}}{${denominator === 1 ? '' : denominator}${factor({ ...term, power: -term.power }, true)}}`
      : (numerator === denominator && value ? '' : number) + value;
    const sign = term.coefficient < 0 ? '-' : '+';
    parts.push(parts.length ? ` ${sign} ${body}` : (sign === '-' ? '-' : '') + body);
  }
  return parts.join('') || '0';
}

function createQuestion(kind, family, random) {
  const integral = kind === 'integral';
  let terms;
  if (family === 'polynomial') {
    const leading = integer(random, 2, integral ? 3 : 4);
    const second = integer(random, 1, leading - 1);
    const powers = integer(random, 2, 3) === 3 ? [leading, second, 0] : [leading, second];
    terms = powers.map((power) => ({ type: 'power', power, coefficient: coefficient(random, 4) }));
  } else if (family === 'mixed') {
    terms = [
      { type: 'power', power: integer(random, integral ? 1 : 2, integral ? 2 : 3), coefficient: coefficient(random) },
      { type: functions[integer(random, 0, 2)], coefficient: coefficient(random) },
    ];
  } else if (family === 'chain-power') {
    terms = [{ type: family, coefficient: coefficient(random, 2), scale: integer(random, 2, 3), shift: coefficient(random, 2), power: integer(random, 2, 3) }];
  } else if (family === 'reciprocal') {
    terms = [
      { type: 'power', power: integer(random, integral ? -3 : -2, integral ? -2 : -1), coefficient: coefficient(random) },
      { type: 'power', power: integer(random, 1, 2), coefficient: coefficient(random) },
    ];
  } else if (family === 'trig-sum') {
    const first = functions[integer(random, 0, 2)];
    const firstCoefficient = coefficient(random);
    const remaining = functions.filter((type) => type !== first);
    terms = [
      { type: first, coefficient: firstCoefficient },
      { type: remaining[integer(random, 0, 1)], coefficient: coefficient(random) },
    ];
  } else {
    terms = [{ type: family, coefficient: coefficient(random), scale: integer(random, 2, 3) }];
  }
  return describeQuestion(kind, family, terms);
}

function describeQuestion(kind, family, terms) {
  const integral = kind === 'integral';
  const answerTerms = terms.map((term) => {
    if (term.type === 'power') return integral
      ? { ...term, power: term.power + 1, coefficient: term.coefficient * Math.sign(term.power + 1), denominator: Math.abs(term.power + 1) }
      : { ...term, power: term.power === 0 ? 0 : term.power - 1, coefficient: term.coefficient * term.power };
    if (term.type === 'chain-power') return { ...term, power: term.power - 1, coefficient: term.coefficient * term.power * term.scale };
    const multiplier = integral ? 1 : term.scale ?? 1;
    if (term.type === 'sin') return { ...term, type: 'cos', coefficient: term.coefficient * multiplier * (integral ? -1 : 1) };
    if (term.type === 'cos') return { ...term, type: 'sin', coefficient: term.coefficient * multiplier * (integral ? 1 : -1) };
    return { ...term, coefficient: term.coefficient * multiplier };
  });
  let explanation;
  let ruleTex;
  if (family === 'chain-power') {
    explanation = `Use the chain rule: differentiate the outer power, then multiply by the inner derivative, ${terms[0].scale}. Keep the shifted expression in brackets.`;
    ruleTex = '\\frac{d}{dx}(ax+b)^n = an(ax+b)^{n-1}';
  } else if (functions.includes(family)) {
    const outerRule = family === 'sin' ? 'sin becomes cos' : family === 'cos' ? 'cos becomes minus sin' : 'the exponential stays the same';
    explanation = `Use the chain rule: ${outerRule}. Multiply by the coefficient and the inner derivative, ${terms[0].scale}.`;
    const base = expression([{ ...terms[0], coefficient: 1 }], true);
    const result = expression(answerTerms.map((term) => ({ ...term, coefficient: term.coefficient / terms[0].coefficient })), true);
    ruleTex = `\\frac{d}{dx}${base} = ${result}`;
  } else if (family === 'mixed' || family === 'trig-sum') {
    explanation = `${integral ? 'Integrate' : 'Differentiate'} each term separately. ${family === 'mixed' ? 'Combine the power rule with the basic trig or exponential rule.' : 'Use the basic trig and exponential rules, paying attention to the signs.'}`;
    ruleTex = integral ? '\\int(f+g)\\,dx = \\int f\\,dx + \\int g\\,dx' : '\\frac{d}{dx}(f+g) = f\' + g\'';
  } else {
    explanation = family === 'reciprocal' ? 'Rewrite the fraction as a negative power of x. ' : '';
    explanation += integral
      ? 'Use the power rule on each term: add one to the power and divide by that new power.'
      : 'Use the power rule on each term: multiply by the power and reduce it by one.';
    if (!integral && terms.some((term) => term.power === 0)) explanation += ' Constants become zero.';
    ruleTex = integral ? '\\int ax^n\\,dx = \\frac{a}{n+1}x^{n+1} + C' : '\\frac{d}{dx}(ax^n) = anx^{n-1}';
  }
  const source = expression(terms);
  const sourceTex = expression(terms, true);
  return {
    id: `${kind}:${source}`, kind, family, terms, source,
    tex: integral ? `\\int ${sourceTex}\\,dx` : `\\frac{d}{dx}\\left(${sourceTex}\\right)`,
    answer: expression(answerTerms), answerTex: expression(answerTerms, true), explanation, ruleTex,
  };
}

export function generateQuestion(mode, previousId, random = Math.random) {
  if (!['derivatives', 'integration', 'mixed'].includes(mode)) throw new Error('Unknown practice mode');
  let question;
  for (let attempt = 0; attempt < 12; attempt++) {
    const kind = mode === 'mixed' ? (random() < 0.5 ? 'derivative' : 'integral') : mode === 'integration' ? 'integral' : 'derivative';
    const families = kind === 'integral' ? integralFamilies : derivativeFamilies;
    question = createQuestion(kind, families[integer(random, 0, families.length - 1)], random);
    if (question.id !== previousId) return question;
  }
  // Deterministic fallback also prevents a repeat with a degenerate RNG.
  const terms = question.terms.map((term, index) => index === 0 ? { ...term, coefficient: -term.coefficient } : term);
  return describeQuestion(question.kind, question.family, terms);
}
