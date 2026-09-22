import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const samplePath = path.join(import.meta.dirname, '../demo/public/sample.log');

const brokenLog = {
  name: 'broken.log',
  mimeType: 'text/plain',
  buffer: Buffer.from('reference 70.0 45.0 6\nthermometer temp-1\n2007-04-05T22:00 hot\n'),
};

const sampleRows = [
  'temp-1 precise',
  'temp-2 ultra precise',
  'hum-1 keep',
  'hum-2 discard',
  'mon-1 keep',
  'mon-2 discard',
];

async function expectSampleResults(page: Page) {
  const table = page.getByRole('table', { name: 'Results for sample.log' });
  await expect(table.getByRole('row')).toHaveCount(sampleRows.length + 1);
  for (const row of sampleRows) {
    await expect(table.getByRole('row', { name: row, exact: true })).toBeVisible();
  }
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('classifies every sensor in the sample log', async ({ page }) => {
  await page.getByLabel('Log file').setInputFiles(samplePath);

  await expectSampleResults(page);
  await expectNoAxeViolations(page);
});

test('shows an alert for a broken log', async ({ page }) => {
  await page.getByLabel('Log file').setInputFiles(brokenLog);

  await expect(page.getByRole('alert')).toHaveText(
    'broken.log could not be evaluated. Line 3: "hot" is not a number.',
  );
  await expectNoAxeViolations(page);
});

test('can be completed with only the keyboard', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Log file')).toBeFocused();
  const fileChooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Space');
  await (await fileChooser).setFiles(brokenLog);
  await expect(page.getByRole('alert')).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Use sample log' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expectSampleResults(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
