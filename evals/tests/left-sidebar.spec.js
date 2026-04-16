/**
 * Left Sidebar - Automated Test Suite
 * Tests the vertical toolbar on the left side of the viewer.
 *
 * Run with: npx playwright test evals/tests/left-sidebar.spec.js
 */
import { test, expect } from '@playwright/test';
import { setupViewer } from './test-helpers.js';

test.describe('Left Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('SIDEBAR-001: Left sidebar renders with 7 buttons', async ({ page }) => {
    const sidebar = page.locator('.mv-left-sidebar');
    await expect(sidebar).toBeVisible();

    const buttonCount = await page.locator('.mv-sidebar-btn').count();
    expect(buttonCount).toBe(7);
  });

  test('SIDEBAR-002: Sidebar is positioned on the left side', async ({ page }) => {
    const sidebar = page.locator('.mv-left-sidebar');
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    // Should be near the left edge
    expect(box.x).toBeLessThan(80);
  });

  test('SIDEBAR-003: All buttons have correct tooltip titles', async ({ page }) => {
    const titles = await page.locator('.mv-sidebar-btn').evaluateAll(
      btns => btns.map(b => b.getAttribute('title'))
    );
    expect(titles).toEqual([
      'Views & Markups',
      'All Items',
      'Object Tree',
      'Properties',
      'Object Groups',
      'Deviation',
      'Search Sets',
    ]);
  });

  test('SIDEBAR-004: Buttons have correct data-panel attributes', async ({ page }) => {
    const panels = await page.locator('.mv-sidebar-btn').evaluateAll(
      btns => btns.map(b => b.dataset.panel)
    );
    expect(panels).toEqual([
      'viewsMarkups',
      'allItems',
      'objectTree',
      'properties',
      'objectGroups',
      'deviation',
      'searchSets',
    ]);
  });

  test('SIDEBAR-005: Clicking a button sets it as active', async ({ page }) => {
    const propsBtn = page.locator('.mv-sidebar-btn[data-panel="properties"]');
    await propsBtn.click();

    const isActive = await propsBtn.evaluate(el => el.classList.contains('active'));
    expect(isActive).toBe(true);
  });

  test('SIDEBAR-006: Only one button can be active at a time', async ({ page }) => {
    const propsBtn = page.locator('.mv-sidebar-btn[data-panel="properties"]');
    const devBtn = page.locator('.mv-sidebar-btn[data-panel="deviation"]');

    await propsBtn.click();
    await expect(propsBtn).toHaveClass(/active/);

    await devBtn.click();
    await expect(devBtn).toHaveClass(/active/);
    // Properties should no longer be active
    const propsActive = await propsBtn.evaluate(el => el.classList.contains('active'));
    expect(propsActive).toBe(false);
  });

  test('SIDEBAR-007: Clicking active button deactivates it', async ({ page }) => {
    const propsBtn = page.locator('.mv-sidebar-btn[data-panel="properties"]');

    // Click to activate
    await propsBtn.click();
    await expect(propsBtn).toHaveClass(/active/);

    // Click again to deactivate
    await propsBtn.click();
    const isActive = await propsBtn.evaluate(el => el.classList.contains('active'));
    expect(isActive).toBe(false);
  });

  test('SIDEBAR-008: Object Tree button toggles tree panel', async ({ page }) => {
    const treeBtn = page.locator('.mv-sidebar-btn[data-panel="objectTree"]');
    const treePanel = page.locator('.mv-tree-panel');

    // Initially the tree panel should be hidden
    await expect(treePanel).toHaveClass(/mv-hidden/);

    // Click to open
    await treeBtn.click();
    await expect(treePanel).not.toHaveClass(/mv-hidden/);
    await expect(treeBtn).toHaveClass(/active/);

    // Click to close
    await treeBtn.click();
    await expect(treePanel).toHaveClass(/mv-hidden/);
    const isActive = await treeBtn.evaluate(el => el.classList.contains('active'));
    expect(isActive).toBe(false);
  });

  test('SIDEBAR-009: Stub buttons do not crash when clicked', async ({ page }) => {
    const stubs = ['viewsMarkups', 'allItems', 'properties', 'objectGroups', 'deviation', 'searchSets'];
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const id of stubs) {
      const btn = page.locator(`.mv-sidebar-btn[data-panel="${id}"]`);
      await btn.click();
      // Wait a tick for any async errors
      await page.waitForTimeout(100);
    }

    expect(pageErrors).toEqual([]);
  });

  test('SIDEBAR-010: Each button contains an SVG icon', async ({ page }) => {
    const svgCounts = await page.locator('.mv-sidebar-btn').evaluateAll(
      btns => btns.map(b => b.querySelectorAll('svg').length)
    );
    // Every button should contain exactly 1 SVG
    for (const count of svgCounts) {
      expect(count).toBe(1);
    }
  });

  test('SIDEBAR-011: Container gets mv-has-left-sidebar class', async ({ page }) => {
    const hasClass = await page.evaluate(() => {
      const mv = document.querySelector('.model-viewer');
      return mv ? mv.classList.contains('mv-has-left-sidebar') : false;
    });
    expect(hasClass).toBe(true);
  });
});
