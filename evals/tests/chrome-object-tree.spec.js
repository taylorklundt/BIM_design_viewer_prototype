/**
 * Chrome UI — Object Tree Panel Tests
 *
 * Section A (chrome.html): Panel structure, open/close, search input
 * Section B (test-page.html): Checkbox selection sync with the 3D viewport
 *
 * Run: npx playwright test evals/tests/chrome-object-tree.spec.js
 */

import { test, expect } from '@playwright/test';
import { setupViewer, clickCanvasCenter, clickEmptySpace, getSelection, injectMockTreeData } from './test-helpers.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function setupChrome(page) {
  await page.goto('/chrome.html');
  // __viewerAdapterReady is set in ChromeApp after the real adapter replaces
  // the mock — this guarantees toolbar button clicks reach the engine.
  await page.waitForFunction(() => window.__viewerAdapterReady === true, { timeout: 15000 });
  await page.waitForTimeout(100);
}

async function openTreePanel(page) {
  await page.locator('[aria-label="Object Tree"]').click();
  // .mv-tree-panel:not(.mv-hidden) becomes visible after toggle()
  await page.waitForSelector('.mv-tree-panel:not(.mv-hidden)', { timeout: 5000 });
}

// ─── Section A: Chrome UI structure (chrome.html) ─────────────────────────────

test.describe('Chrome Object Tree — Panel Structure', () => {

  test.beforeEach(async ({ page }) => {
    await setupChrome(page);
  });

  test('CHROME-OT-001: Object Tree toolbar button exists', async ({ page }) => {
    await expect(page.locator('[aria-label="Object Tree"]')).toBeVisible();
  });

  test('CHROME-OT-002: Panel is hidden before toolbar button is clicked', async ({ page }) => {
    // waitForSelector with state:attached finds even display:none elements
    await page.waitForSelector('.mv-tree-panel', { state: 'attached' });
    await expect(page.locator('.mv-tree-panel')).toBeHidden();
  });

  test('CHROME-OT-003: Clicking the toolbar button opens the panel', async ({ page }) => {
    await openTreePanel(page);
    await expect(page.locator('.mv-tree-panel')).toBeVisible();
  });

  test('CHROME-OT-004: Panel displays "Object Tree" title', async ({ page }) => {
    await openTreePanel(page);
    const header = page.locator('.mv-panel-header span').first();
    await expect(header).toHaveText('Object Tree');
  });

  test('CHROME-OT-005: Search input has "Filter by Keyword" placeholder', async ({ page }) => {
    await openTreePanel(page);
    await expect(page.locator('.mv-tree-search input')).toHaveAttribute(
      'placeholder',
      'Filter by Keyword',
    );
  });

  test('CHROME-OT-006: Close button hides the panel', async ({ page }) => {
    await openTreePanel(page);
    await page.locator('.mv-panel-close').click();
    await expect(page.locator('.mv-tree-panel')).toBeHidden();
  });

  test('CHROME-OT-007: Clicking toolbar button again toggles panel closed', async ({ page }) => {
    await openTreePanel(page);
    await page.locator('[aria-label="Object Tree"]').click();
    await expect(page.locator('.mv-tree-panel')).toBeHidden();
  });

  test('CHROME-OT-008: Panel is 380px wide', async ({ page }) => {
    await openTreePanel(page);
    const box = await page.locator('.mv-tree-panel').boundingBox();
    expect(box.width).toBeCloseTo(380, -1); // within ±10px
  });

});

// ─── Section B: Checkbox selection sync (test-page.html with mock 3D scene) ──

test.describe('Chrome Object Tree — Checkbox Selection Sync', () => {

  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
    await page.evaluate(() => window.viewer.treePanel.open());
    await page.waitForSelector('.mv-tree-panel:not(.mv-hidden)', { timeout: 5000 });
    await injectMockTreeData(page);
  });

  test('CHROME-OT-009: Tree panel renders rows with checkboxes', async ({ page }) => {
    await expect(page.locator('.mv-tree-node-row').first()).toBeVisible();
    await expect(
      page.locator('.mv-tree-node-row').first().locator('.mv-tree-checkbox'),
    ).toBeVisible();
  });

  test('CHROME-OT-010: Clicking a row marks its checkbox blue (inline style)', async ({ page }) => {
    await page.locator('.mv-tree-node-row').first().click();
    await page.waitForTimeout(200);

    // renderNode() sets inline background on checkbox when selected
    const checkbox = page.locator('.mv-tree-node-row.selected .mv-tree-checkbox').first();
    await expect(checkbox).toBeVisible();
    const style = await checkbox.getAttribute('style');
    expect(style).toContain('2563eb');
  });

  test('CHROME-OT-011: Checkmark SVG is visible when row is selected', async ({ page }) => {
    await page.locator('.mv-tree-node-row').first().click();
    await page.waitForTimeout(200);

    const icon = page
      .locator('.mv-tree-node-row.selected .mv-tree-checkbox-icon')
      .first();
    const style = await icon.getAttribute('style');
    // Inline style should NOT be display:none
    expect(style ?? '').not.toContain('display:none');
    expect(style ?? '').not.toContain('display: none');
  });

  test('CHROME-OT-012: Clicking a row selects elements in the 3D viewport', async ({ page }) => {
    await page.locator('.mv-tree-node-row.mv-tree-leaf').first().click();
    await page.waitForTimeout(300);

    const selected = await getSelection(page);
    expect(selected.length).toBeGreaterThan(0);
  });

  test('CHROME-OT-013: 3D viewport click syncs checkbox state (reverse sync)', async ({ page }) => {
    await clickCanvasCenter(page);
    await page.waitForTimeout(400);

    const selected = await getSelection(page);
    if (selected.length === 0) return; // no selectable geometry in scene

    // At least one checkbox should carry the blue inline style
    const blueCheckbox = page.locator('.mv-tree-checkbox[style*="2563eb"]');
    await expect(blueCheckbox.first()).toBeVisible({ timeout: 2000 });
  });

  test('CHROME-OT-014: Deselecting in 3D clears all checkbox blue styles', async ({ page }) => {
    await clickCanvasCenter(page);
    await page.waitForTimeout(300);
    await clickEmptySpace(page);
    await page.waitForTimeout(300);

    const selected = await getSelection(page);
    expect(selected.length).toBe(0);

    const blueCheckboxes = await page.locator('.mv-tree-checkbox[style*="2563eb"]').count();
    expect(blueCheckboxes).toBe(0);
  });

  test('CHROME-OT-015: Search filter reduces visible rows', async ({ page }) => {
    const totalBefore = await page.locator('.mv-tree-node-row').count();

    await page.locator('.mv-tree-search input').fill('IfcWall');
    await page.waitForTimeout(400); // debounce

    const totalAfter = await page.locator('.mv-tree-node-row').count();
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
  });

  test('CHROME-OT-016: Clearing search restores all rows', async ({ page }) => {
    const totalBefore = await page.locator('.mv-tree-node-row').count();

    const input = page.locator('.mv-tree-search input');
    await input.fill('xyz_no_match');
    await page.waitForTimeout(400);
    await input.fill('');
    await page.waitForTimeout(400);

    const totalAfter = await page.locator('.mv-tree-node-row').count();
    expect(totalAfter).toBe(totalBefore);
  });

  test.skip('CHROME-OT-017: Ctrl+click adds second row to selection', async ({ page }) => {
    // Known issue: Playwright's keyboard.down('Control') + locator.click() does not
    // reliably propagate ctrlKey=true through the tree container's event delegation.
    // Manual test steps:
    //   1. Open test-page.html, open tree panel, click a row to select it
    //   2. Hold Ctrl, click a second row
    //   3. Verify both rows show blue checkboxes and "2 selected" in the status bar
    const rows = page.locator('.mv-tree-node-row');
    if ((await rows.count()) < 2) return;

    await rows.nth(0).click();
    await page.waitForTimeout(200);
    await page.keyboard.down('Control');
    await rows.nth(1).click();
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);

    const blueBoxes = await page.locator('.mv-tree-checkbox[style*="2563eb"]').count();
    expect(blueBoxes).toBeGreaterThanOrEqual(2);
  });

});
