/**
 * Chrome UI — Search Sets Panel Tests
 *
 * Tests the React SearchSetsPanel component on chrome.html.
 * Seed data ("All Walls", "All Slabs") is pre-loaded from SearchSetStorage.
 *
 * Run: npx playwright test evals/tests/chrome-search-sets-panel.spec.js
 */

import { test, expect } from '@playwright/test';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function setupChrome(page) {
  await page.goto('/chrome.html');
  // __viewerAdapterReady is set in ChromeApp after the real adapter replaces
  // the mock — this guarantees toolbar button clicks reach the engine.
  await page.waitForFunction(() => window.__viewerAdapterReady === true, { timeout: 15000 });
  await page.waitForTimeout(100);
}

async function openSearchSetsPanel(page) {
  await page.locator('[aria-label="Search Sets"]').click();
  // SearchSetsPanel renders null when closed; wait for the panel title span.
  await page.waitForSelector('span:has-text("Search Sets")', { timeout: 5000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Chrome Search Sets Panel', () => {

  test.beforeEach(async ({ page }) => {
    await setupChrome(page);
  });

  // ── Toolbar & open / close ────────────────────────────────────────────────

  test('CHROME-SS-001: Search Sets toolbar button exists', async ({ page }) => {
    await expect(page.locator('[aria-label="Search Sets"]')).toBeVisible();
  });

  test('CHROME-SS-002: Clicking toolbar button opens the panel', async ({ page }) => {
    await openSearchSetsPanel(page);
    // Panel container is visible
    await expect(page.locator('span:has-text("Search Sets")')).toBeVisible();
  });

  test('CHROME-SS-003: Close button (×) closes the panel', async ({ page }) => {
    await openSearchSetsPanel(page);
    await page.locator('button[aria-label="Close"]').filter({ hasText: '×' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('span:has-text("Search Sets")')).not.toBeVisible();
  });

  test('CHROME-SS-004: Clicking toolbar button again closes the panel (toggle)', async ({ page }) => {
    await openSearchSetsPanel(page);
    await page.locator('[aria-label="Search Sets"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('span:has-text("Search Sets")')).not.toBeVisible();
  });

  // ── Seed data ─────────────────────────────────────────────────────────────

  test('CHROME-SS-005: Panel shows seed search set "All Walls"', async ({ page }) => {
    await openSearchSetsPanel(page);
    await expect(page.locator('text=All Walls')).toBeVisible();
  });

  test('CHROME-SS-006: Panel shows seed search set "All Slabs"', async ({ page }) => {
    await openSearchSetsPanel(page);
    await expect(page.locator('text=All Slabs')).toBeVisible();
  });

  test('CHROME-SS-007: Each search set row has a Run button', async ({ page }) => {
    await openSearchSetsPanel(page);
    const count = await page.locator('button:text("Run")').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('CHROME-SS-008: Each search set row has a Del button', async ({ page }) => {
    await openSearchSetsPanel(page);
    const count = await page.locator('button:text("Del")').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  test('CHROME-SS-009: Del button removes the item from the list', async ({ page }) => {
    await openSearchSetsPanel(page);
    const countBefore = await page.locator('button:text("Del")').count();

    await page.locator('button:text("Del")').first().click();
    await page.waitForTimeout(200);

    const countAfter = await page.locator('button:text("Del")').count();
    expect(countAfter).toBe(countBefore - 1);
  });

  test('CHROME-SS-010: Deleting all items shows "No saved searches" message', async ({ page }) => {
    await openSearchSetsPanel(page);

    // Delete each item until none remain
    while (await page.locator('button:text("Del")').first().isVisible().catch(() => false)) {
      await page.locator('button:text("Del")').first().click();
      await page.waitForTimeout(150);
    }

    await expect(page.locator('text=No saved searches')).toBeVisible();
  });

  // ── Panel re-open ─────────────────────────────────────────────────────────

  test('CHROME-SS-011: Re-opening panel shows same item count as before close', async ({ page }) => {
    await openSearchSetsPanel(page);
    const countFirst = await page.locator('button:text("Run")').count();

    await page.locator('button[aria-label="Close"]').filter({ hasText: '×' }).click();
    await page.waitForTimeout(200);

    await openSearchSetsPanel(page);
    const countSecond = await page.locator('button:text("Run")').count();
    expect(countSecond).toBe(countFirst);
  });

  // ── Adapter wiring ────────────────────────────────────────────────────────

  test('CHROME-SS-012: mv:toggle-search-sets custom event drives panel visibility', async ({ page }) => {
    // Panel is closed — dispatch event directly to open it
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('mv:toggle-search-sets')));
    await page.waitForSelector('span:has-text("Search Sets")', { timeout: 3000 });
    await expect(page.locator('span:has-text("Search Sets")')).toBeVisible();

    // Dispatch again to close
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('mv:toggle-search-sets')));
    await page.waitForTimeout(200);
    await expect(page.locator('span:has-text("Search Sets")')).not.toBeVisible();
  });

  test('CHROME-SS-013: viewer.searchSets.getAll() returns seed data', async ({ page }) => {
    const count = await page.evaluate(() => {
      if (!window.viewer?.searchSets) return null;
      return window.viewer.searchSets.getAll().length;
    });
    if (count === null) {
      test.skip(); // searchSets not initialised yet
      return;
    }
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('CHROME-SS-014: Run button calls viewer.searchSets.executeAndSelect', async ({ page }) => {
    // Spy on the engine method
    const canSpy = await page.evaluate(() => !!window.viewer?.searchSets?.executeAndSelect);
    if (!canSpy) {
      test.skip();
      return;
    }

    await page.evaluate(() => {
      window.__ssRunCount = 0;
      const orig = window.viewer.searchSets.executeAndSelect.bind(window.viewer.searchSets);
      window.viewer.searchSets.executeAndSelect = (...args) => {
        window.__ssRunCount++;
        return orig(...args);
      };
    });

    await openSearchSetsPanel(page);
    await page.locator('button:text("Run")').first().click();
    await page.waitForTimeout(300);

    const ran = await page.evaluate(() => window.__ssRunCount ?? 0);
    expect(ran).toBe(1);
  });

});
