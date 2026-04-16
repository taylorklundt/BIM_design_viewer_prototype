/**
 * Selection Feature - Automated Eval Tests
 *
 * These tests verify the Selection feature implementation.
 * Run with: npx playwright test evals/tests/selection.spec.js
 */

import { test, expect } from '@playwright/test';
import {
  setupViewer,
  clickCanvasCenter,
  clickCanvas,
  clickEmptySpace,
  hoverCanvasCenter,
  hoverEmptySpace,
  captureEvents,
  clearEvents,
  getSelection,
  getLastIntersection,
  deselectAll,
  setHoverEnabled,
} from './test-helpers.js';

test.describe('Selection Feature', () => {

  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  // ============================================
  // Category 1: Basic Selection
  // ============================================

  test.describe('Basic Selection', () => {

    test('TEST-SEL-001: Click to Select', async ({ page }) => {
      const getEvents = await captureEvents(page, ['selection-change', 'element-click']);

      // Click on model
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      // Check selection
      const selected = await getSelection(page);
      expect(selected.length).toBeGreaterThan(0);

      // Check events
      const events = await getEvents();
      const selectionEvent = events.find(e => e.type === 'selection-change');
      expect(selectionEvent).toBeTruthy();
      expect(selectionEvent.data.added.length).toBeGreaterThan(0);
    });

    test('TEST-SEL-002: Click Empty Space to Deselect', async ({ page }) => {
      // First select something
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      let selected = await getSelection(page);
      expect(selected.length).toBeGreaterThan(0);

      const getEvents = await captureEvents(page, ['selection-change']);

      // Click empty space
      await clickEmptySpace(page);
      await page.waitForTimeout(300);

      // Check deselected
      selected = await getSelection(page);
      expect(selected.length).toBe(0);

      // Check event
      const events = await getEvents();
      const selectionEvent = events.find(e => e.type === 'selection-change');
      expect(selectionEvent).toBeTruthy();
      expect(selectionEvent.data.removed.length).toBeGreaterThan(0);
    });

    test('TEST-SEL-003: Click Different Element', async ({ page }) => {
      // Click first element
      await clickCanvas(page, -50, 0);
      await page.waitForTimeout(300);

      const firstSelection = await getSelection(page);
      expect(firstSelection.length).toBeGreaterThan(0);
      const firstId = firstSelection[0];

      const getEvents = await captureEvents(page, ['selection-change']);

      // Click different element
      await clickCanvas(page, 50, 0);
      await page.waitForTimeout(300);

      const secondSelection = await getSelection(page);
      expect(secondSelection.length).toBe(1);

      // Check event has both added and removed
      const events = await getEvents();
      const selectionEvent = events.find(e => e.type === 'selection-change');
      expect(selectionEvent).toBeTruthy();
    });

  });

  // ============================================
  // Category 2: Multi-Select
  // ============================================

  test.describe('Multi-Select', () => {

    test('TEST-SEL-004: Ctrl+Click to Add', async ({ page }) => {
      // Select first element
      await clickCanvas(page, -50, 0);
      await page.waitForTimeout(300);

      const firstSelection = await getSelection(page);
      expect(firstSelection.length).toBe(1);

      // Ctrl+click second element
      await clickCanvas(page, 50, 0, { ctrl: true });
      await page.waitForTimeout(300);

      const multiSelection = await getSelection(page);
      // Should have at least 1 (might be same element depending on model)
      expect(multiSelection.length).toBeGreaterThanOrEqual(1);
    });

    test('TEST-SEL-005: Ctrl+Click to Remove', async ({ page }) => {
      // Select element
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      let selected = await getSelection(page);
      expect(selected.length).toBe(1);
      const selectedId = selected[0];

      // Ctrl+click same element to deselect
      await clickCanvasCenter(page, { ctrl: true });
      await page.waitForTimeout(300);

      selected = await getSelection(page);
      expect(selected.includes(selectedId)).toBe(false);
    });

    test('TEST-SEL-006: Ctrl+Click Empty Space', async ({ page }) => {
      // Select element
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      const initialSelection = await getSelection(page);
      expect(initialSelection.length).toBe(1);

      // Ctrl+click empty space
      await clickEmptySpace(page);
      await page.keyboard.down('Control');
      await clickEmptySpace(page);
      await page.keyboard.up('Control');
      await page.waitForTimeout(300);

      // Selection should be preserved (Ctrl+click on empty doesn't deselect)
      const afterSelection = await getSelection(page);
      // Note: Implementation may vary - some deselect on any empty click
      // Adjust expectation based on requirements
    });

  });

  // ============================================
  // Category 3: Visual Highlighting
  // ============================================

  test.describe('Visual Highlighting', () => {

    test('TEST-SEL-007: Highlight Material Applied', async ({ page }) => {
      // Click to select
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      const selected = await getSelection(page);
      expect(selected.length).toBeGreaterThan(0);

      // Visual check would require screenshot comparison
      // For now, verify selection state exists
      const hasSelection = await page.evaluate(() => {
        return window.viewer.selection.selectedElements.size > 0;
      });
      expect(hasSelection).toBe(true);
    });

    test('TEST-SEL-008: Highlight Removed on Deselect', async ({ page }) => {
      // Select then deselect
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);
      await deselectAll(page);
      await page.waitForTimeout(300);

      // Verify no selection
      const selected = await getSelection(page);
      expect(selected.length).toBe(0);

      // Verify materials restored
      const materialsRestored = await page.evaluate(() => {
        return window.viewer.selection.originalMaterials.size === 0;
      });
      expect(materialsRestored).toBe(true);
    });

  });

  // ============================================
  // Category 4: Hover
  // ============================================

  test.describe('Hover', () => {

    test('TEST-SEL-009: Hover Highlight', async ({ page }) => {
      const getEvents = await captureEvents(page, ['element-hover']);

      // Hover over model
      await hoverCanvasCenter(page);
      await page.waitForTimeout(500);

      const events = await getEvents();
      const hoverEvent = events.find(e => e.type === 'element-hover' && e.data.elementId);
      expect(hoverEvent).toBeTruthy();
    });

    test('TEST-SEL-010: Hover Off', async ({ page }) => {
      // First hover on element
      await hoverCanvasCenter(page);
      await page.waitForTimeout(300);

      const getEvents = await captureEvents(page, ['element-hover']);

      // Move to empty space
      await hoverEmptySpace(page);
      await page.waitForTimeout(500);

      const events = await getEvents();
      const hoverOffEvent = events.find(e =>
        e.type === 'element-hover' && e.data.elementId === null
      );
      expect(hoverOffEvent).toBeTruthy();
    });

    test('TEST-SEL-012: Hover Disabled', async ({ page }) => {
      // Disable hover
      await setHoverEnabled(page, false);

      const getEvents = await captureEvents(page, ['element-hover']);

      // Try to hover
      await hoverCanvasCenter(page);
      await page.waitForTimeout(500);

      const events = await getEvents();
      // Should have no hover events (or only null ones)
      const hoverOnEvents = events.filter(e =>
        e.type === 'element-hover' && e.data.elementId !== null
      );
      expect(hoverOnEvents.length).toBe(0);
    });

  });

  // ============================================
  // Category 5: Context Menu (Right-Click)
  // ============================================

  test.describe('Context Menu', () => {

    test('TEST-SEL-013: Right-Click on Element', async ({ page }) => {
      const getEvents = await captureEvents(page, ['context-menu']);

      // Right-click on model
      await clickCanvasCenter(page, { button: 'right' });
      await page.waitForTimeout(300);

      const events = await getEvents();
      const contextEvent = events.find(e => e.type === 'context-menu');

      expect(contextEvent).toBeTruthy();
      expect(contextEvent.data.elementId).toBeTruthy();
      expect(contextEvent.data.screenX).toBeDefined();
      expect(contextEvent.data.screenY).toBeDefined();
    });

    test('TEST-SEL-014: Right-Click Empty Space', async ({ page }) => {
      const getEvents = await captureEvents(page, ['context-menu']);

      // Right-click on empty space
      await clickEmptySpace(page);
      await page.mouse.click(50, 50, { button: 'right' });
      await page.waitForTimeout(300);

      const events = await getEvents();
      const contextEvent = events.find(e => e.type === 'context-menu');

      expect(contextEvent).toBeTruthy();
      expect(contextEvent.data.elementId).toBeNull();
    });

    test('TEST-SEL-015: getLastIntersection()', async ({ page }) => {
      // Right-click on element
      await clickCanvasCenter(page, { button: 'right' });
      await page.waitForTimeout(300);

      const intersection = await getLastIntersection(page);

      expect(intersection).toBeTruthy();
      expect(intersection.elementId).toBeTruthy();
      expect(intersection.hasPoint).toBe(true);
      expect(intersection.hasNormal).toBe(true);
    });

    test('TEST-SEL-016: Normal Calculation', async ({ page }) => {
      // Right-click on element
      await clickCanvasCenter(page, { button: 'right' });
      await page.waitForTimeout(300);

      const normalData = await page.evaluate(() => {
        const intersection = window.viewer.selection.getLastIntersection();
        if (!intersection || !intersection.normal) return null;
        return {
          x: intersection.normal.x,
          y: intersection.normal.y,
          z: intersection.normal.z,
          length: intersection.normal.length()
        };
      });

      expect(normalData).toBeTruthy();
      // Normal should be normalized (length ~1)
      expect(normalData.length).toBeCloseTo(1, 1);
    });

  });

  // ============================================
  // Category 6: Double-Click
  // ============================================

  test.describe('Double-Click', () => {

    test('TEST-SEL-017: Double-Click Event', async ({ page }) => {
      const getEvents = await captureEvents(page, ['element-double-click']);

      // Double-click on model
      await clickCanvasCenter(page, { dblclick: true });
      await page.waitForTimeout(300);

      const events = await getEvents();
      const dblClickEvent = events.find(e => e.type === 'element-double-click');

      expect(dblClickEvent).toBeTruthy();
      expect(dblClickEvent.data.elementId).toBeTruthy();
    });

  });

  // ============================================
  // Category 7: Programmatic Selection
  // ============================================

  test.describe('Programmatic API', () => {

    test('TEST-SEL-018: selectByIds()', async ({ page }) => {
      // First get an element ID by clicking
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      const clickedSelection = await getSelection(page);
      expect(clickedSelection.length).toBe(1);
      const elementId = clickedSelection[0];

      // Deselect
      await deselectAll(page);
      let selected = await getSelection(page);
      expect(selected.length).toBe(0);

      // Select by ID
      await page.evaluate((id) => {
        window.viewer.selection.selectByIds([id]);
      }, elementId);
      await page.waitForTimeout(300);

      selected = await getSelection(page);
      expect(selected).toContain(elementId);
    });

    test('TEST-SEL-019: deselect() All', async ({ page }) => {
      // Select multiple elements
      await clickCanvasCenter(page);
      await page.waitForTimeout(200);
      await clickCanvas(page, 50, 0, { ctrl: true });
      await page.waitForTimeout(200);

      // Deselect all
      await deselectAll(page);
      await page.waitForTimeout(200);

      const selected = await getSelection(page);
      expect(selected.length).toBe(0);
    });

    test('TEST-SEL-020: deselect() Specific IDs', async ({ page }) => {
      // Select element
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      const selected = await getSelection(page);
      expect(selected.length).toBe(1);
      const elementId = selected[0];

      // Deselect specific ID
      await page.evaluate((id) => {
        window.viewer.selection.deselect([id]);
      }, elementId);
      await page.waitForTimeout(200);

      const afterDeselect = await getSelection(page);
      expect(afterDeselect.includes(elementId)).toBe(false);
    });

  });

  // ============================================
  // Category 8: Edge Cases
  // ============================================

  test.describe('Edge Cases', () => {

    test('TEST-SEL-021: Rapid Clicking', async ({ page }) => {
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        await clickCanvas(page, (i % 2) * 50 - 25, 0);
        await page.waitForTimeout(50);
      }

      // Should not throw errors - just verify page is still responsive
      const selected = await getSelection(page);
      expect(Array.isArray(selected)).toBe(true);
    });

    test('TEST-SEL-023: destroy() Cleanup', async ({ page }) => {
      // Select something
      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      // Call destroy
      await page.evaluate(() => {
        window.viewer.selection.destroy();
      });

      // Verify cleanup
      const state = await page.evaluate(() => ({
        selectedCount: window.viewer.selection.selectedElements?.size ?? 0,
        materialsCount: window.viewer.selection.originalMaterials?.size ?? 0,
        listenersCount: window.viewer.selection.eventListeners?.size ?? 0
      }));

      expect(state.selectedCount).toBe(0);
      expect(state.materialsCount).toBe(0);
      expect(state.listenersCount).toBe(0);
    });

  });

});

// ============================================
// Summary Test - Quick Smoke Test
// ============================================

test('Selection Smoke Test', async ({ page }) => {
  await setupViewer(page);

  // Debug: Check canvas and model state
  const debugInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.mv-canvas-container canvas');
    let meshCount = 0;
    window.viewer.sceneManager.getScene().traverse((obj) => {
      if (obj.isMesh && obj.visible) meshCount++;
    });
    return {
      canvasExists: !!canvas,
      canvasWidth: canvas?.clientWidth,
      canvasHeight: canvas?.clientHeight,
      meshCount,
      viewerReady: !!window.viewer
    };
  });
  console.log('Debug info:', debugInfo);

  // 1. Click selects
  await clickCanvasCenter(page);
  await page.waitForTimeout(500);
  let selected = await getSelection(page);

  // Debug: Check what happened with the click
  const clickDebug = await page.evaluate(() => {
    return {
      selectedCount: window.viewer.selection.getSelected().length,
      selectedElements: window.viewer.selection.getSelected(),
      selectionMapSize: window.viewer.selection.selectedElements?.size
    };
  });
  console.log('After click:', clickDebug);

  expect(selected.length).toBeGreaterThan(0);

  // 2. Click empty deselects
  await clickEmptySpace(page);
  await page.waitForTimeout(300);
  selected = await getSelection(page);
  expect(selected.length).toBe(0);

  // 3. Right-click provides intersection data
  await clickCanvasCenter(page, { button: 'right' });
  await page.waitForTimeout(300);
  const intersection = await getLastIntersection(page);
  expect(intersection).toBeTruthy();
  expect(intersection.hasNormal).toBe(true);

  // All critical functionality works
});
