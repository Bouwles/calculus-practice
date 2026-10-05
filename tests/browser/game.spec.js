import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Controlled randomness gives hand-calculated questions without a test hook in the app.
  await page.addInitScript(() => { Math.random = () => 0.75; });
  await page.goto('/');
});

for (const [mode, answer, integral] of [
  ['Derivatives', '-4sin(x)', false], ['Integration', '4sin(x)', true], ['Mixed', '4sin(x)', true],
]) {
  test(`${mode}: check, Enter, feedback, next, skip, and scoring`, async ({ page }) => {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('#question .katex')).toBeVisible();
    await expect(page.locator('#integral-constant')).toBeVisible({ visible: integral });
    const input = page.getByRole('textbox', { name: 'Your answer' });
    await input.fill(answer);
    await input.press('Enter');
    await expect(page.getByText('Correct.', { exact: true })).toBeVisible();
    await expect(page.locator('#score')).toHaveText('1 / 1 correct');
    await expect(page.locator('#correct-answer .katex')).toBeVisible();
    await expect(page.locator('#explanation')).toContainText('rule');
    await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeDisabled();
    await expect(input).toBeDisabled();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await input.fill('0');
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.getByText('Incorrect.', { exact: true })).toBeVisible();
    await expect(page.locator('#score')).toHaveText('1 / 2 correct');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const question = await page.locator('#question').innerText();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page.locator('#question')).not.toHaveText(question);
    await expect(page.locator('#score')).toHaveText('1 / 2 correct');
    await expect(input).toHaveValue('');
    await expect(page.locator('#feedback')).toBeHidden();
  });
}

test('mode changes update the question; reset clears the session score', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Your answer' }).fill('-4sin(x)');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByRole('button', { name: 'Integration', exact: true }).click();
  await expect(page.locator('#integral-constant')).toBeVisible();
  await expect(page.locator('#feedback')).toBeHidden();
  await expect(page.locator('#score')).toHaveText('1 / 1 correct');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('#score')).toHaveText('0 / 0 correct');
  await expect(page.getByRole('button', { name: 'Integration', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeEnabled();
});

test('blank and unsafe input are editable and do not count as attempts', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Your answer' });
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('#input-error')).toContainText('Enter an answer');
  await input.fill('<script>alert(1)</script>');
  await input.press('Enter');
  await expect(page.locator('#input-error')).toBeVisible();
  await expect(page.locator('#score')).toHaveText('0 / 0 correct');
  await expect(input).toBeEnabled();
  await input.fill('-4 sin(x)');
  await input.press('Enter');
  await expect(page.getByText('Correct.', { exact: true })).toBeVisible();
});

test('mixed mode produces both kinds over successive questions', async ({ page }) => {
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

test('layout fits the viewport and loads without runtime errors', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.reload();
  await expect(page.locator('#question .katex')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeInViewport();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(fits).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('practice.png'), fullPage: true });
  await page.getByRole('button', { name: 'Integration', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('4sin(x)');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('integral-feedback.png'), fullPage: true });
});

test('a three-term polynomial stays readable on a narrow phone', async ({ page }, testInfo) => {
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
  await page.screenshot({ path: testInfo.outputPath('narrow-polynomial.png'), fullPage: true });
});
