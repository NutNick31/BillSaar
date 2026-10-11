import { expect, test } from '@playwright/test';

const PAGE = '/karnataka/bescom-bill-calculator/';

test('calculates, reacts to kW, syncs the URL and restores it on reload', async ({ page }) => {
  await page.goto(PAGE);
  const total = page.locator('[data-total]');

  await page.getByLabel('Units used this month (kWh)').fill('250');
  await expect(total).toHaveText(/^₹[\d,]+$/);
  const at1kw = await total.textContent();

  await page.getByText('Advanced: load, FPPCA, true-up, Gruha Jyothi').click();
  await page.getByLabel('Sanctioned load (kW)').fill('2');
  await expect(total).not.toHaveText(at1kw!);
  const at2kw = await total.textContent();

  await expect(page).toHaveURL(/units=250/);
  await expect(page).toHaveURL(/kw=2/);

  await page.reload();
  await expect(page.getByLabel('Units used this month (kWh)')).toHaveValue('250');
  await expect(page.getByLabel('Sanctioned load (kW)')).toHaveValue('2');
  await expect(total).toHaveText(at2kw!);
});

test('meter readings mode and friendly errors', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByText('Meter readings').click();
  await page.getByLabel('Previous reading').fill('1450');
  await page.getByLabel('Current reading').fill('1200');
  await expect(page.locator('[data-error="curr"]')).toContainText('lower than the previous');
  await expect(page.locator('[data-total]')).toHaveText('—');
  await page.getByLabel('Current reading').fill('1700');
  await expect(page.locator('[data-total]')).toHaveText(/^₹/);
});

test('shared links prefill the calculator', async ({ page }) => {
  await page.goto(`${PAGE}?units=180&gj=1&gju=150`);
  await expect(page.getByLabel('Units used this month (kWh)')).toHaveValue('180');
  await expect(page.locator('.breakdown')).toContainText('Gruha Jyothi subsidy');
  await expect(page.locator('[data-whatsapp]')).toHaveAttribute('href', /wa\.me\/\?text=/);
});

test('works without JavaScript as a worked example', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:4329${PAGE}`);
  await expect(page.locator('[data-total]')).toHaveText(/^₹[\d,]+$/);
  await expect(page.locator('[data-example-note]')).toBeVisible();
  await ctx.close();
});
