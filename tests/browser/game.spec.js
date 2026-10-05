import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';

const pageUrl = pathToFileURL(resolve('index.html')).href;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.75; });
  await page.goto(pageUrl);
});

for (const [mode, answer] of [
  ['Derivatives', '-4\\sin(x)'], ['Integration', '4\\sin(x) + C'], ['Mixed', '4\\sin(x) + C'],
]) {
  test(`${mode}: reveal the answer and rule, then load another question`, async ({ page }) => {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('#question .katex')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.locator('#feedback')).toBeHidden();
    const reveal = page.getByRole('button', { name: 'Show answer', exact: true });
    await reveal.focus();
    await reveal.press('Enter');
    await expect(page.locator('#correct-answer .katex')).toBeVisible();
    await expect(page.locator('#correct-answer annotation')).toHaveText(answer);
    await expect(page.locator('#explanation')).toContainText('rule');
    await expect(page.locator('#rule .katex')).toBeVisible();
    await expect(page.locator('#score')).toHaveText('1 answer shown');
    await expect(reveal).toBeHidden();
    const question = await page.locator('#question').innerText();
    await page.getByRole('button', { name: 'Next', exact: true }).press('Enter');
    await expect(page.locator('#question')).not.toHaveText(question);
    await expect(page.locator('#feedback')).toBeHidden();
    await expect(reveal).toBeVisible();
    await reveal.click();
    await expect(page.locator('#score')).toHaveText('2 answers shown');
  });
}

test('skip, mode switching, and reset keep the reveal state consistent', async ({ page }) => {
  await page.getByRole('button', { name: 'Show answer', exact: true }).click();
  await page.getByRole('button', { name: 'Integration', exact: true }).click();
  await expect(page.locator('#question-label')).toHaveText('Find an antiderivative.');
  await expect(page.locator('#feedback')).toBeHidden();
  const question = await page.locator('#question').innerText();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.locator('#question')).not.toHaveText(question);
  await expect(page.locator('#score')).toHaveText('1 answer shown');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('#score')).toHaveText('0 answers shown');
  await expect(page.getByRole('button', { name: 'Integration', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Show answer', exact: true })).toBeVisible();
});

test('mixed mode produces derivatives and indefinite integrals', async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 17;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await page.reload();
  await page.getByRole('button', { name: 'Mixed', exact: true }).click();
  const kinds = new Set();
  for (let index = 0; index < 20; index++) {
    kinds.add(await page.locator('#question-label').innerText());
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
  }
  expect([...kinds].sort()).toEqual(['Find an antiderivative.', 'Find the derivative.']);
});

test('opening index.html offline loads styling, maths, and working controls', async ({ page, context }, testInfo) => {
  const errors = [];
  const remoteRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  const portablePath = testInfo.outputPath('portable/index.html');
  await mkdir(dirname(portablePath), { recursive: true });
  await copyFile(resolve('index.html'), portablePath);
  await context.setOffline(true);
  await page.goto(pathToFileURL(portablePath).href);
  await expect(page.locator('#question .katex')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show answer', exact: true })).toBeInViewport();
  const layout = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      background: getComputedStyle(document.documentElement).backgroundColor,
      width: document.querySelector('main').getBoundingClientRect().width,
      fits: document.documentElement.scrollWidth <= innerWidth,
      mathFontLoaded: [...document.fonts].some((font) => font.family === 'KaTeX_Main' && font.status === 'loaded'),
    };
  });
  expect(layout.background).toBe('rgb(250, 250, 250)');
  expect(layout.width).toBeLessThanOrEqual(668);
  expect(layout.fits).toBe(true);
  expect(layout.mathFontLoaded).toBe(true);
  await page.getByRole('button', { name: 'Show answer', exact: true }).click();
  await expect(page.locator('#correct-answer .katex')).toBeVisible();
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('answer-reveal.png'), fullPage: true });
});

test('a three-term polynomial fits a narrow phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => {
    const values = [0.4, 0.9, 0.6, 0.99, 0.1, 0.99, 0.99, 0.1, 0, 0.99, 0.1];
    Math.random = () => values.shift() ?? 0.75;
  });
  await page.reload();
  await expect(page.locator('#question .katex')).toBeVisible();
  const contained = await page.locator('#question').evaluate((element) => {
    const parent = element.getBoundingClientRect();
    const math = element.querySelector('.katex').getBoundingClientRect();
    return math.left >= parent.left && math.right <= parent.right;
  });
  expect(contained).toBe(true);
  await page.getByRole('button', { name: 'Show answer', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('narrow-polynomial.png'), fullPage: true });
});
