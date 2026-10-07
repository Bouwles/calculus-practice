# Calculus practice

**Practice derivatives and indefinite integrals in the browser.** Work each question out in your head, then reveal the answer along with the rule that gets you there.

[![Play online](https://img.shields.io/badge/play-online-25282d?style=for-the-badge)](https://bouwles.github.io/calculus-practice/)
[![Works offline](https://img.shields.io/badge/works-offline-435c78?style=for-the-badge)](#play-offline)

<p align="center">
  <a href="https://bouwles.github.io/calculus-practice/">
    <img src=".github/screenshot.png" alt="An integration question, ∫ x³ − 2x² + 4x dx, with its answer ¼x⁴ − ⅔x³ + 2x² + C and the power rule shown below it" width="560">
  </a>
</p>

## Features

- **Three modes:** Derivatives, Integration, and Mixed.
- **A new question every time.** Questions are generated at random, and the same question never comes up twice in a row.
- **Every answer explained.** Each answer comes with a one-line explanation and the general rule, typeset with KaTeX.
- **No pressure.** There's no timer, score, or grading. A counter tracks how many answers you've revealed.
- **One file.** The whole app, including scripts, styles, and math fonts, is a single `index.html` with no CDN or server dependencies.
- **Works on phones and laptops.** You can also play it with the keyboard alone.

## What it covers

Questions need a little thought while keeping the arithmetic mental: two or three short terms, or one small chain-rule step. Coefficients stay small (up to ±4), and inner multipliers are just 2 or 3. All integrals are indefinite and include `+ C` in the answer.

| Question type | Example | Derivative rule | Integral rule |
| --- | --- | --- | --- |
| Polynomial (2–3 terms) | $x^3 - 2x^2 + 4$ | Power rule, term by term | Power rule, term by term |
| Combined rules | $x^2 + \sin(x)$ | Combine the power and trig rules | Combine the power and trig rules |
| Shifted power | $(2x + 1)^3$ | Chain rule: multiply by the inner derivative | — |
| Scaled sine/cosine | $3\cos(2x)$ | Chain rule, including the sign and inner multiplier | — |
| Exponential | $e^{3x}$ | Chain rule for the inner multiplier | Unscaled $e^x$ appears in sums |
| Reciprocal powers | $2/x^2 + x$ | Rewrite as negative powers, then differentiate | Rewrite as negative powers, then integrate |
| Trig/exponential sums | $\sin(x) + e^x$ | — | Apply the basic rule to each term |

Positive powers go up to $x^4$ in derivative questions and $x^3$ in integral questions. Reciprocal integrals use $1/x^2$ or $1/x^3$ so no logarithms are needed. Integrals avoid substitution and integration by parts.

## How to play

1. Pick a mode.
2. Solve the question in your head.
3. Click **Show answer** to check your work against the answer, explanation, and rule.
4. Click **Next** for another question, or **Skip** to move on without revealing the answer.

Focus moves between the buttons as you go, so after your first click you can just keep pressing <kbd>Enter</kbd>. Switching modes keeps your count, and **Reset** sets it back to zero.

### Play offline

Download [`index.html`](index.html) and open it in any browser. It doesn't need an internet connection, an install, or a local server, and you can copy it anywhere.

## Development

You'll need [Node.js](https://nodejs.org/) 22.12 or newer.

```sh
npm ci
npm run dev        # start a dev server with live reload
npm run build      # rebuild the self-contained index.html
npm run preview    # serve the production build locally
```

Edit the files in `src/`. After each change, run `npm run build` to regenerate the root `index.html` (and `dist/index.html`). The root page is committed on purpose: it's both the downloadable file and the page that GitHub Pages serves.

### Tests

```sh
npm test                       # unit tests
npx playwright install chromium
npm run test:browser           # browser tests (desktop + phone)
```

- **Unit tests** check hand-calculated answers, difficulty limits, and every question family. They also confirm that questions don't repeat and check 1,000 generated questions per mode using independent numerical differentiation at several sample points.
- **Browser tests** open the actual built page in Playwright and run through every mode, revealing answers by mouse and keyboard. They test Skip and Reset and check the layout on phone and laptop sizes. One test copies the page to another folder to make sure the styles, fonts, and controls still work offline.

### Project layout

```
index.html               Generated, self-contained page (what GitHub Pages serves)
src/
  index.html             Page template
  main.js                UI: rendering questions and the reveal flow
  questions.js           Question generator, answers, and rule explanations
  style.css              Styles
scripts/build.mjs        Bundles with Vite and inlines the JS, CSS, and fonts into index.html
tests/
  calculus.test.js       Unit tests (node --test)
  helpers/answers.js     Independent symbolic/numeric test helpers
  browser/game.spec.js   Playwright tests
```

## Built with

- Vanilla JavaScript and CSS
- [KaTeX](https://katex.org/) for math typesetting
- [Vite](https://vite.dev/) for development and bundling
- [Playwright](https://playwright.dev/) for browser tests
