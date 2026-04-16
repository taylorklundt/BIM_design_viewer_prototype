/**
 * Search Sets — End-to-End Test Suite
 *
 * Every test simulates real user clicks / keystrokes against the UI.
 * No test calls window.viewer.searchSets.execute() directly —
 * execution is always triggered by clicking a list item in the panel.
 *
 * Mock scene (test-page.html) provides 5 meshes:
 *   element-0  "Box 1"  TestBox   Level 1  FireRating 2HR  LoadBearing true
 *   element-1  "Box 2"  TestBox   Level 1  FireRating 2HR  LoadBearing false
 *   element-2  "Box 3"  TestWall  Level 2  FireRating 2HR  LoadBearing true
 *   element-3  "Box 4"  TestBox   Level 2  FireRating 1HR  LoadBearing false
 *   element-4  "Box 5"  TestWall  Level 3  FireRating 1HR  LoadBearing true
 *
 * Run with: npx playwright test evals/tests/search-sets.spec.js
 */
import { test, expect } from '@playwright/test';
import { setupViewer, getSelection, deselectAll } from './test-helpers.js';

// ─── Helpers local to this suite ──────────────────────────────

/** Click the Search Sets sidebar button to open the panel. */
async function openPanel(page) {
  await page.locator('.mv-sidebar-btn[data-panel="searchSets"]').click();
  await expect(page.locator('.mv-search-sets-panel')).not.toHaveClass(/mv-hidden/);
}

/** Click a search-set list item by its data-id and wait for selection to settle. */
async function clickSearchSetItem(page, id) {
  await page.locator(`.mv-ss-item[data-id="${id}"]`).click();
  await page.waitForTimeout(400);
}

/** Seed localStorage with predictable search sets that match the mock scene. */
async function seedStorage(page) {
  await page.evaluate(() => {
    localStorage.setItem('mv-search-sets', JSON.stringify([
      {
        id: 'seed-walls', name: 'All Walls',
        createdAt: '2025-06-01T08:00:00Z', updatedAt: '2025-06-01T08:00:00Z',
        scope: { type: 'entireModel' }, mode: 'within',
        conditions: { logic: 'and', rules: [
          { type: 'condition', category: 'Element', property: 'type', operator: 'contains', value: 'Wall' }
        ]}
      },
      {
        id: 'seed-boxes', name: 'Test Boxes',
        createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z',
        scope: { type: 'entireModel' }, mode: 'within',
        conditions: { logic: 'and', rules: [
          { type: 'condition', category: 'Element', property: 'type', operator: 'equals', value: 'TestBox' }
        ]}
      },
      {
        id: 'seed-box-1-or-2', name: 'Box 1 or Box 2',
        createdAt: '2025-06-01T10:00:00Z', updatedAt: '2025-06-01T10:00:00Z',
        scope: { type: 'entireModel' }, mode: 'within',
        conditions: { logic: 'or', rules: [
          { type: 'condition', category: 'Element', property: 'name', operator: 'equals', value: 'Box 1' },
          { type: 'condition', category: 'Element', property: 'name', operator: 'equals', value: 'Box 2' }
        ]}
      }
    ]));
  });
}

// ─── Tests ────────────────────────────────────────────────────

test.describe('Search Sets — User Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
    await seedStorage(page);
  });

  // ── Opening & Closing the Panel ────────────────────────────

  test('SS-UI-001: User clicks sidebar button → panel opens showing 3 items', async ({ page }) => {
    const panel = page.locator('.mv-search-sets-panel');
    await expect(panel).toHaveClass(/mv-hidden/);

    await openPanel(page);

    await expect(panel).toBeVisible();
    await expect(page.locator('.mv-ss-item')).toHaveCount(3);
  });

  test('SS-UI-002: User clicks sidebar button twice → panel opens then closes', async ({ page }) => {
    const btn = page.locator('.mv-sidebar-btn[data-panel="searchSets"]');
    const panel = page.locator('.mv-search-sets-panel');

    await btn.click();
    await expect(panel).not.toHaveClass(/mv-hidden/);

    await btn.click();
    await expect(panel).toHaveClass(/mv-hidden/);
  });

  test('SS-UI-003: User clicks panel close button → panel hides, sidebar button deactivates', async ({ page }) => {
    const btn = page.locator('.mv-sidebar-btn[data-panel="searchSets"]');
    await openPanel(page);
    await expect(btn).toHaveClass(/active/);

    await page.locator('.mv-search-sets-panel .mv-panel-close').click();

    await expect(page.locator('.mv-search-sets-panel')).toHaveClass(/mv-hidden/);
    await expect(btn).not.toHaveClass(/active/);
  });

  test('SS-UI-004: Opening Search Sets closes an already-open Object Tree panel', async ({ page }) => {
    const treePanel = page.locator('.mv-tree-panel');
    const ssPanel = page.locator('.mv-search-sets-panel');

    await page.locator('.mv-sidebar-btn[data-panel="objectTree"]').click();
    await expect(treePanel).not.toHaveClass(/mv-hidden/);

    await page.locator('.mv-sidebar-btn[data-panel="searchSets"]').click();
    await expect(ssPanel).not.toHaveClass(/mv-hidden/);
    await expect(treePanel).toHaveClass(/mv-hidden/);
  });

  // ── Executing Search Sets via Click ────────────────────────

  test('SS-UI-005: Click "Test Boxes" → selects exactly the 3 TestBox elements', async ({ page }) => {
    // Success: selection contains element-0, element-1, element-3 and nothing else
    await deselectAll(page);
    await openPanel(page);
    await clickSearchSetItem(page, 'seed-boxes');

    const selected = await getSelection(page);
    expect(selected).toHaveLength(3);
    expect(selected.sort()).toEqual(['element-0', 'element-1', 'element-3']);
  });

  test('SS-UI-006: Click "All Walls" → selects exactly the 2 TestWall elements', async ({ page }) => {
    // Success: selection contains element-2, element-4 and nothing else
    await deselectAll(page);
    await openPanel(page);
    await clickSearchSetItem(page, 'seed-walls');

    const selected = await getSelection(page);
    expect(selected).toHaveLength(2);
    expect(selected.sort()).toEqual(['element-2', 'element-4']);
  });

  test('SS-UI-007: Click "Box 1 or Box 2" → selects exactly 2 elements via OR logic', async ({ page }) => {
    // Success: selection contains element-0, element-1 and nothing else
    await deselectAll(page);
    await openPanel(page);
    await clickSearchSetItem(page, 'seed-box-1-or-2');

    const selected = await getSelection(page);
    expect(selected).toHaveLength(2);
    expect(selected.sort()).toEqual(['element-0', 'element-1']);
  });

  test('SS-UI-008: Executing a search set clears the previous 3D selection first', async ({ page }) => {
    // Pre-select element-4 manually
    await page.evaluate(() => window.viewer.selection.selectByIds(['element-4']));
    expect(await getSelection(page)).toContain('element-4');

    // Now click "Box 1 or Box 2" which does NOT include element-4
    await openPanel(page);
    await clickSearchSetItem(page, 'seed-box-1-or-2');

    const selected = await getSelection(page);
    expect(selected).not.toContain('element-4');
    expect(selected).toHaveLength(2);
  });

  test('SS-UI-009: Clicking the same search set twice re-runs and re-selects', async ({ page }) => {
    await openPanel(page);
    await clickSearchSetItem(page, 'seed-boxes');
    expect(await getSelection(page)).toHaveLength(3);

    // Manually deselect everything, then click the same set again
    await deselectAll(page);
    expect(await getSelection(page)).toHaveLength(0);

    await clickSearchSetItem(page, 'seed-boxes');
    expect(await getSelection(page)).toHaveLength(3);
  });

  test('SS-UI-010: Clicking different search sets in sequence updates selection each time', async ({ page }) => {
    await openPanel(page);

    await clickSearchSetItem(page, 'seed-boxes');
    expect(await getSelection(page)).toHaveLength(3);

    await clickSearchSetItem(page, 'seed-walls');
    const sel = await getSelection(page);
    expect(sel).toHaveLength(2);
    expect(sel.sort()).toEqual(['element-2', 'element-4']);
  });

  test('SS-UI-011: Meta line briefly shows result count after execution', async ({ page }) => {
    await openPanel(page);
    await clickSearchSetItem(page, 'seed-boxes');

    const meta = page.locator('.mv-ss-item[data-id="seed-boxes"] .mv-ss-meta');
    // The meta should show "3 elements found" briefly (green color)
    await expect(meta).toContainText('3 elements found');
  });

  // ── Inline Rename ──────────────────────────────────────────

  test('SS-UI-012: Click edit icon → name becomes editable input with current name', async ({ page }) => {
    await openPanel(page);
    const item = page.locator('.mv-ss-item[data-id="seed-boxes"]');

    await item.locator('.mv-ss-edit-btn').click();

    const input = item.locator('.mv-ss-name-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('Test Boxes');
  });

  test('SS-UI-013: Type new name + Enter → name persists in storage', async ({ page }) => {
    await openPanel(page);
    const item = page.locator('.mv-ss-item[data-id="seed-boxes"]');

    await item.locator('.mv-ss-edit-btn').click();
    const input = item.locator('.mv-ss-name-input');
    await input.fill('My Custom Boxes');
    await input.press('Enter');
    await page.waitForTimeout(200);

    // Success: storage reflects the new name
    const stored = await page.evaluate(() =>
      window.viewer.searchSets.getById('seed-boxes')?.name
    );
    expect(stored).toBe('My Custom Boxes');

    // Success: the rendered label shows the new name
    await expect(item.locator('.mv-ss-name')).toHaveText('My Custom Boxes');
  });

  test('SS-UI-014: Press Escape during rename → reverts to original name', async ({ page }) => {
    await openPanel(page);
    const item = page.locator('.mv-ss-item[data-id="seed-boxes"]');

    await item.locator('.mv-ss-edit-btn').click();
    const input = item.locator('.mv-ss-name-input');
    await input.fill('SHOULD NOT SAVE');
    await input.press('Escape');
    await page.waitForTimeout(200);

    // Success: storage still has the original name
    const stored = await page.evaluate(() =>
      window.viewer.searchSets.getById('seed-boxes')?.name
    );
    expect(stored).toBe('Test Boxes');
  });

  test('SS-UI-015: Renamed search set still executes correctly when clicked', async ({ page }) => {
    await openPanel(page);
    const item = page.locator('.mv-ss-item[data-id="seed-boxes"]');

    // Rename it
    await item.locator('.mv-ss-edit-btn').click();
    await item.locator('.mv-ss-name-input').fill('Renamed Boxes');
    await item.locator('.mv-ss-name-input').press('Enter');
    await page.waitForTimeout(200);

    // Click the renamed item to execute
    await deselectAll(page);
    await page.locator('.mv-ss-item[data-id="seed-boxes"]').click();
    await page.waitForTimeout(400);

    // Success: same 3 elements selected as before the rename
    const selected = await getSelection(page);
    expect(selected).toHaveLength(3);
    expect(selected.sort()).toEqual(['element-0', 'element-1', 'element-3']);
  });

  // ── Delete ─────────────────────────────────────────────────

  test('SS-UI-016: Click delete icon + confirm → item removed from list and storage', async ({ page }) => {
    await openPanel(page);
    await expect(page.locator('.mv-ss-item')).toHaveCount(3);

    // Accept the upcoming confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    await page.locator('.mv-ss-item[data-id="seed-boxes"] .mv-ss-delete-btn').click();
    await page.waitForTimeout(200);

    // Success: only 2 items remain in the panel
    await expect(page.locator('.mv-ss-item')).toHaveCount(2);

    // Success: storage no longer contains the deleted set
    const exists = await page.evaluate(() =>
      window.viewer.searchSets.getById('seed-boxes')
    );
    expect(exists).toBeNull();
  });

  test('SS-UI-017: Click delete icon + cancel → item remains', async ({ page }) => {
    await openPanel(page);

    // Dismiss the confirmation dialog
    page.on('dialog', dialog => dialog.dismiss());

    await page.locator('.mv-ss-item[data-id="seed-boxes"] .mv-ss-delete-btn').click();
    await page.waitForTimeout(200);

    // Success: all 3 items still present
    await expect(page.locator('.mv-ss-item')).toHaveCount(3);
  });

  test('SS-UI-018: After deleting all items, panel shows empty state', async ({ page }) => {
    await openPanel(page);
    page.on('dialog', dialog => dialog.accept());

    // Delete all 3 items one by one
    for (let i = 0; i < 3; i++) {
      await page.locator('.mv-ss-item .mv-ss-delete-btn').first().click();
      await page.waitForTimeout(200);
    }

    // Success: no items remain, empty state is visible
    await expect(page.locator('.mv-ss-item')).toHaveCount(0);
    await expect(page.locator('.mv-ss-empty')).toBeVisible();
  });

  // ── List Rendering & Metadata ──────────────────────────────

  test('SS-UI-019: Each item displays name, condition count, scope, and date', async ({ page }) => {
    await openPanel(page);

    const item = page.locator('.mv-ss-item[data-id="seed-boxes"]');
    await expect(item.locator('.mv-ss-name')).toHaveText('Test Boxes');

    const meta = await item.locator('.mv-ss-meta').textContent();
    // "1 condition · Entire Model · Jun 1, 2025" (locale-dependent date)
    expect(meta).toContain('1 condition');
    expect(meta).toContain('Entire Model');
  });

  test('SS-UI-020: Item with OR group shows correct condition count', async ({ page }) => {
    await openPanel(page);

    const item = page.locator('.mv-ss-item[data-id="seed-box-1-or-2"]');
    const meta = await item.locator('.mv-ss-meta').textContent();
    expect(meta).toContain('2 conditions');
  });

  test('SS-UI-021: Action buttons have CSS transition rule for opacity on hover', async ({ page }) => {
    await openPanel(page);
    const actions = page.locator('.mv-ss-item[data-id="seed-boxes"] .mv-ss-item-actions');

    // The actions container exists and has an opacity CSS transition
    const transition = await actions.evaluate(el => getComputedStyle(el).transition);
    expect(transition).toContain('opacity');

    // Hovering the parent item makes the buttons interactable (edit works)
    await page.locator('.mv-ss-item[data-id="seed-boxes"]').hover();
    await expect(page.locator('.mv-ss-item[data-id="seed-boxes"] .mv-ss-edit-btn')).toBeAttached();
  });

  // ── Cross-Feature: Selection State ─────────────────────────

  test('SS-UI-022: Executing search set updates status bar selected count', async ({ page }) => {
    await openPanel(page);
    await clickSearchSetItem(page, 'seed-boxes');

    const statusText = await page.locator('.mv-status-item[data-info="selected"] span').textContent();
    expect(statusText).toBe('3 selected');
  });

  test('SS-UI-023: Executing a search set with no matches selects nothing', async ({ page }) => {
    // Add a search set that matches nothing, directly in localStorage before opening
    await page.evaluate(() => {
      const sets = JSON.parse(localStorage.getItem('mv-search-sets'));
      sets.push({
        id: 'no-match', name: 'No Match',
        createdAt: '2025-06-01T11:00:00Z', updatedAt: '2025-06-01T11:00:00Z',
        scope: { type: 'entireModel' }, mode: 'within',
        conditions: { logic: 'and', rules: [
          { type: 'condition', category: 'Element', property: 'type', operator: 'equals', value: 'IfcNonExistent' }
        ]}
      });
      localStorage.setItem('mv-search-sets', JSON.stringify(sets));
    });

    await openPanel(page);
    await clickSearchSetItem(page, 'no-match');

    const selected = await getSelection(page);
    expect(selected).toHaveLength(0);
  });

  // ── Excluding Mode ─────────────────────────────────────────

  test('SS-UI-024: Search set with "excluding" mode selects everything EXCEPT matches', async ({ page }) => {
    // Add to localStorage before opening panel
    await page.evaluate(() => {
      const sets = JSON.parse(localStorage.getItem('mv-search-sets'));
      sets.push({
        id: 'exclude-boxes', name: 'Not Boxes',
        createdAt: '2025-06-01T11:00:00Z', updatedAt: '2025-06-01T11:00:00Z',
        scope: { type: 'entireModel' }, mode: 'excluding',
        conditions: { logic: 'and', rules: [
          { type: 'condition', category: 'Element', property: 'type', operator: 'equals', value: 'TestBox' }
        ]}
      });
      localStorage.setItem('mv-search-sets', JSON.stringify(sets));
    });

    await openPanel(page);
    await clickSearchSetItem(page, 'exclude-boxes');

    const selected = await getSelection(page);
    expect(selected).toHaveLength(2);
    expect(selected.sort()).toEqual(['element-2', 'element-4']);
  });

  // ── Property-Set Query ─────────────────────────────────────

  test('SS-UI-025: Search by Pset_Common.FireRating = "2HR" selects 3 elements', async ({ page }) => {
    await page.evaluate(() => {
      const sets = JSON.parse(localStorage.getItem('mv-search-sets'));
      sets.push({
        id: 'fire-2hr', name: 'Fire Rating 2HR',
        createdAt: '2025-06-01T11:00:00Z', updatedAt: '2025-06-01T11:00:00Z',
        scope: { type: 'entireModel' }, mode: 'within',
        conditions: { logic: 'and', rules: [
          { type: 'condition', category: 'Pset_Common', property: 'FireRating', operator: 'equals', value: '2HR' }
        ]}
      });
      localStorage.setItem('mv-search-sets', JSON.stringify(sets));
    });

    await openPanel(page);
    await clickSearchSetItem(page, 'fire-2hr');

    const selected = await getSelection(page);
    expect(selected).toHaveLength(3);
    expect(selected.sort()).toEqual(['element-0', 'element-1', 'element-2']);
  });

  // ── Nested Group (AND + OR) ────────────────────────────────

  test('SS-UI-026: Nested AND+OR query: TestBox AND (Box 1 OR Box 4) selects 2', async ({ page }) => {
    await page.evaluate(() => {
      const sets = JSON.parse(localStorage.getItem('mv-search-sets'));
      sets.push({
        id: 'nested', name: 'Nested Query',
        createdAt: '2025-06-01T11:00:00Z', updatedAt: '2025-06-01T11:00:00Z',
        scope: { type: 'entireModel' }, mode: 'within',
        conditions: {
          logic: 'and',
          rules: [
            { type: 'condition', category: 'Element', property: 'type', operator: 'equals', value: 'TestBox' },
            { type: 'group', logic: 'or', rules: [
              { type: 'condition', category: 'Element', property: 'name', operator: 'equals', value: 'Box 1' },
              { type: 'condition', category: 'Element', property: 'name', operator: 'equals', value: 'Box 4' },
            ]}
          ]
        }
      });
      localStorage.setItem('mv-search-sets', JSON.stringify(sets));
    });

    await openPanel(page);
    await clickSearchSetItem(page, 'nested');

    const selected = await getSelection(page);
    expect(selected).toHaveLength(2);
    expect(selected.sort()).toEqual(['element-0', 'element-3']);
  });

  // ── Current Selection Scope ────────────────────────────────

  test('SS-UI-027: Scope "currentSelection" searches only within already-selected elements', async ({ page }) => {
    // Pre-select 3 TestBox elements
    await page.evaluate(() => window.viewer.selection.selectByIds(['element-0', 'element-1', 'element-3']));

    await page.evaluate(() => {
      const sets = JSON.parse(localStorage.getItem('mv-search-sets'));
      sets.push({
        id: 'scope-sel', name: 'Box 1 in Selection',
        createdAt: '2025-06-01T11:00:00Z', updatedAt: '2025-06-01T11:00:00Z',
        scope: { type: 'currentSelection' }, mode: 'within',
        conditions: { logic: 'and', rules: [
          { type: 'condition', category: 'Element', property: 'name', operator: 'equals', value: 'Box 1' }
        ]}
      });
      localStorage.setItem('mv-search-sets', JSON.stringify(sets));
    });

    await openPanel(page);
    await clickSearchSetItem(page, 'scope-sel');

    // Only element-0 (Box 1) was in the pre-selection AND matches the query
    const selected = await getSelection(page);
    expect(selected).toHaveLength(1);
    expect(selected).toEqual(['element-0']);
  });

  // ── Panel Destroy / Cleanup ────────────────────────────────

  test('SS-UI-028: Destroying panel removes it from DOM', async ({ page }) => {
    await openPanel(page);
    await expect(page.locator('.mv-search-sets-panel')).toBeAttached();

    await page.evaluate(() => window.viewer.searchSetsPanel.destroy());

    await expect(page.locator('.mv-search-sets-panel')).not.toBeAttached();
  });
});
