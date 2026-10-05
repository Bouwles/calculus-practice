const families = ['constant', 'power', 'polynomial', 'sin', 'cos', 'exp'];
const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const coefficient = (random) => integer(random, 1, 5) * (random() < 0.5 ? -1 : 1);

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
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
    const factor = term.type === 'power'
      ? (term.power === 0 ? '' : term.power === 1 ? 'x' : tex ? `x^{${term.power}}` : `x^${term.power}`)
      : term.type === 'exp' ? 'e^x' : `${tex ? '\\' : ''}${term.type}(x)`;
    const number = denominator === 1 ? `${numerator}` : tex ? `\\frac{${numerator}}{${denominator}}` : `(${numerator}/${denominator})`;
    const body = (numerator === denominator && factor ? '' : number) + factor;
    const sign = term.coefficient < 0 ? '-' : '+';
    parts.push(parts.length ? ` ${sign} ${body}` : (sign === '-' ? '-' : '') + body);
  }
  return parts.join('') || '0';
}

function createQuestion(kind, family, random) {
  const maxPower = kind === 'derivative' ? 4 : 3;
  let terms;
  if (family === 'constant') {
    terms = [{ type: 'power', power: 0, coefficient: integer(random, -6, 6) }];
  } else if (family === 'power') {
    terms = [{ type: 'power', power: integer(random, 1, maxPower), coefficient: coefficient(random) }];
  } else if (family === 'polynomial') {
    const powers = Array.from({ length: maxPower + 1 }, (_, index) => index);
    // A partial Fisher-Yates shuffle gives distinct powers without retries.
    const count = integer(random, 2, 3);
    terms = [];
    for (let index = 0; index < count; index++) {
      const chosen = integer(random, index, powers.length - 1);
      [powers[index], powers[chosen]] = [powers[chosen], powers[index]];
      terms.push({ type: 'power', power: powers[index], coefficient: coefficient(random) });
    }
    terms.sort((a, b) => b.power - a.power);
  } else {
    terms = [{ type: family, coefficient: coefficient(random) }];
  }
  return describeQuestion(kind, family, terms);
}

function describeQuestion(kind, family, terms) {
  const integral = kind === 'integral';
  const answerTerms = terms.map((term) => {
    if (term.type === 'power') return integral
      ? { ...term, power: term.power + 1, denominator: term.power + 1 }
      : { ...term, power: Math.max(0, term.power - 1), coefficient: term.coefficient * term.power };
    if (term.type === 'sin') return { type: 'cos', coefficient: term.coefficient * (integral ? -1 : 1) };
    if (term.type === 'cos') return { type: 'sin', coefficient: term.coefficient * (integral ? 1 : -1) };
    return { ...term };
  });
  let explanation;
  let ruleTex;
  if (family === 'sin' || family === 'cos' || family === 'exp') {
    explanation = `Use the basic ${family === 'exp' ? 'exponential' : 'trigonometric'} ${integral ? 'integral' : 'derivative'} rule, keeping the coefficient.`;
    const base = family === 'exp' ? 'e^x' : `\\${family}(x)`;
    const result = expression(answerTerms.map((term) => ({ ...term, coefficient: term.coefficient / terms[0].coefficient })), true);
    ruleTex = integral ? `\\int ${base}\\,dx = ${result} + C` : `\\frac{d}{dx}${base} = ${result}`;
  } else if (family === 'constant') {
    explanation = integral ? 'The integral of a constant is that constant times x.' : 'A constant has derivative zero.';
    ruleTex = integral ? '\\int a\\,dx = ax + C' : '\\frac{d}{dx}a = 0';
  } else {
    explanation = integral
      ? 'Use the power rule: add one to each power, then divide by the new power.'
      : 'Use the power rule: multiply by the power, then reduce the power by one.';
    if (family === 'polynomial') explanation += integral ? ' Integrate each term separately.' : ' Differentiate each term separately; constants become zero.';
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
    question = createQuestion(kind, families[integer(random, 0, families.length - 1)], random);
    if (question.id !== previousId) return question;
  }
  // Deterministic fallback also prevents a repeat with a degenerate RNG.
  const terms = question.terms.map((term, index) => index === 0 ? { ...term, coefficient: term.coefficient === 0 ? 1 : -term.coefficient } : term);
  return describeQuestion(question.kind, question.family, terms);
}
