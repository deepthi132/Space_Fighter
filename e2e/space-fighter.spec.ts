import { expect, test } from '@playwright/test';

test.describe('Space Fighter', () => {
  test('presents an accessible ready state', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Space Fighter/);
    await expect(page.getByRole('heading', { level: 1, name: 'Space Fighter' })).toBeVisible();
    await expect(page.getByRole('application', { name: 'Space Fighter game area' })).toBeVisible();
    await expect(page.locator('#state-value')).toHaveText('Ready');
    await expect(page.locator('#score-value')).toHaveText('0');
    await expect(page.locator('#lives-value')).toHaveText('3');
    await expect(page.getByRole('button', { name: 'Start game' })).toBeEnabled();
    await expect(page.locator('#pause-btn')).toBeDisabled();
  });

  test('supports configuration and the start-pause-resume lifecycle', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Pulse' }).click();
    await page.getByRole('button', { name: 'Viper' }).click();
    await expect(page.getByRole('button', { name: 'Pulse' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Viper' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.locator('#state-value')).toHaveText('Running');
    await expect(page.locator('#game-overlay')).toBeHidden();
    await expect(page.locator('#pause-btn')).toBeEnabled();

    await page.locator('#pause-btn').click();
    await expect(page.locator('#state-value')).toHaveText('Paused');
    await expect(page.getByRole('heading', { name: 'Flight paused' })).toBeVisible();

    await page.locator('#start-btn').click();
    await expect(page.locator('#state-value')).toHaveText('Running');
    await expect(page.locator('#game-overlay')).toBeHidden();

    await page.keyboard.press('Digit3');
    await expect(page.getByRole('button', { name: 'Cannon' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('restores the persisted high score', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('space-fighter-high-score', '240'));
    await page.reload();

    await expect(page.locator('#high-score-value')).toHaveText('240');
  });

  test('remains usable without horizontal overflow on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Laser' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scout' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
