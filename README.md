# Calculus practice

A small browser practice page with Derivatives, Integration, and Mixed modes. Questions are generated from simple rules: constants, powers, short polynomials, sin(x), cos(x), and e^x. All integrals are indefinite. There is no timer.

## Open the game

Double-click the `index.html` in the project root or open it in your browser. Everything is included in that file: styling, JavaScript, KaTeX, and mathematical fonts. It works offline and can be copied anywhere. No installation or local server is needed to play.

Solve the question mentally, then click **Show answer** to reveal the answer and a short rule explanation. **Next** loads another question; **Skip** moves on without revealing the answer. Mode switches keep the count of answers shown. **Reset** clears the count and keeps the selected mode. Integrals include `+ C` in the revealed answer.

## Develop locally

Install Node.js 22.12 or newer, then run:

```sh
npm ci
npm run dev
```

Open the localhost URL shown in the terminal. Edit `src/index.html`, `src/main.js`, `src/style.css`, or `src/questions.js`. Rebuild the portable page after changes:

```sh
npm run build
```

This updates both the root `index.html` and `dist/index.html`. The root page is generated and committed so it can be opened immediately after downloading the repository. To serve the production page locally, use `npm run preview`.

## Test

```sh
npm test
npx playwright install chromium
npm run test:browser
```

The unit suite verifies hand-calculated answers, generated question families, repeat avoidance, and 1,000 questions per mode using an independent symbolic test helper. Browser tests open the actual root HTML file, exercise every mode, reveal answers by click and keyboard, and check skip/reset and phone/laptop layouts. An offline test copies the HTML to another directory and checks that its styling, math fonts, and controls still work.

## Implementation

Vanilla JavaScript and CSS, [KaTeX](https://katex.org/docs/api.html) for notation, and [Vite](https://vite.dev/guide/build.html#library-mode) for development and bundling. `scripts/build.mjs` embeds the bundled script, styles, and fonts into the HTML. `src/questions.js` generates questions, answers, and rule explanations; `src/main.js` handles the reveal interaction. There is no answer input, grading, server API, or CDN dependency.
