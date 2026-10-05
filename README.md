# Calculus practice

A small browser practice game with Derivatives, Integration, and Mixed modes. Questions are generated from simple rules: constants, powers, short polynomials, sin(x), cos(x), and e^x. All integrals are indefinite. There is no timer.

## Run locally

Install Node.js 22.12 or newer, then run:

```sh
npm ci
npm run dev
```

Open the localhost URL shown in the terminal. To build and preview the static production files:

```sh
npm run build
npm run preview
```

## Use

Choose a mode, type your answer, and press Enter or Check. The result shows the correct answer and a short rule explanation. Next loads another question. Skip loads a new question without counting an attempt. The score covers the current session across modes; Reset clears it and keeps the selected mode. Reloading starts a new session.

Type familiar expressions such as `3x^2`, `x^3/3`, `2(x+1)`, `-sin(x)`, or `e^x`. Spaces, implicit multiplication, fractions, decimals, and `exp(x)` are supported. For integrals, `+ C` is displayed beside the input; enter only the antiderivative. Adding a numeric constant or a trailing `+ C` is also accepted.

## Test

```sh
npm test
npx playwright install chromium
npm run test:browser
```

The unit suite checks mathematical equivalence, invalid input, generated question families, repeat avoidance, and 1,000 questions per mode. Browser tests exercise all modes, keyboard submission, feedback, scoring, skip, reset, and phone/laptop layouts.

## Implementation

Vanilla JavaScript and CSS, [Vite](https://vite.dev/guide/) for local development/builds, and [KaTeX](https://katex.org/docs/api.html) for notation. Math and fonts are bundled locally; the game needs no server API or CDN at runtime.

`src/questions.js` generates questions and rule explanations. `src/answers.js` uses an allowlisted parser and exact rational symbolic algebra, comparing derivatives directly and checking integrals by differentiating the submitted expression. It never executes input or uses numerical spot checks. Equivalent expanded, factored, and rational expressions in x, sin(x), cos(x), and e^x are supported, including the basic sin²(x) + cos²(x) identity. Function arguments are limited to x and -x; expression size and integer powers are bounded to keep checking immediate. Blank or unsupported syntax can be corrected without counting an attempt.

`src/main.js` handles interaction. Tests use Node's built-in test runner and Playwright.
