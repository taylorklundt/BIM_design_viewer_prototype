/**
 * Chrome UI Compatibility — Test Suite
 *
 * Tests the current 3D Model Viewer engine against every capability
 * that the Chrome UI (model-chrome/) requires via the ViewerAdapter interface.
 *
 * PURPOSE: Run these against the CURRENT viewer to see which Chrome UI
 * features are supported, which need adapter glue, and which are missing entirely.
 *
 * Run with: npx playwright test evals/tests/chrome-compatibility.spec.js
 */
import { test, expect } from '@playwright/test';
import { setupViewer } from './test-helpers.js';

// ═══════════════════════════════════════════════════════════════
// 1. ViewerAdapter — Required Methods
// ═══════════════════════════════════════════════════════════════

test.describe('Chrome Compatibility — ViewerAdapter Required Methods', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('CHROME-REQ-001: zoomIn — navigation.zoom exists and is callable', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.navigation.zoom === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-REQ-002: zoomOut — navigation.zoom exists and is callable', async ({ page }) => {
    // zoomIn and zoomOut both map to navigation.zoom(delta)
    const result = await page.evaluate(() => {
      try {
        window.viewer.navigation.zoom(-1);
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(result).toBe(true);
  });

  test('CHROME-REQ-003: fitToView — navigation.zoomToFit exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.navigation.zoomToFit === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-REQ-004: resetView — viewer.resetView exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.resetView === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-REQ-005: setViewOrientation — preset camera positions for Top/Front/Left/etc', async ({ page }) => {
    // Chrome ViewCube needs: setViewOrientation('top'|'front'|'left'|'right'|'back'|'bottom'|'isometric')
    // Current viewer has setCamera(position, target) but NO preset orientations
    const result = await page.evaluate(() => {
      const nav = window.viewer.navigation;
      // Check if a setViewOrientation method exists
      if (typeof nav.setViewOrientation === 'function') return 'native';
      // Check if setCamera exists (can build adapter from this)
      if (typeof nav.setCamera === 'function') return 'adaptable';
      return 'missing';
    });
    // Expect 'adaptable' — the method doesn't exist natively but can be built
    expect(['native', 'adaptable']).toContain(result);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. ViewerAdapter — Optional Methods
// ═══════════════════════════════════════════════════════════════

test.describe('Chrome Compatibility — ViewerAdapter Optional Methods', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('CHROME-OPT-001: toggleModelBrowser — treePanel.toggle exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.treePanel?.toggle === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-OPT-002: togglePropertiesPanel — properties panel exists', async ({ page }) => {
    // Chrome left toolbar has a Properties button
    const result = await page.evaluate(() => {
      // Check for a properties panel or feature
      return typeof window.viewer.propertiesPanel?.toggle === 'function'
        || typeof window.viewer.properties?.enable === 'function';
    });
    // Expected: FAIL — no properties panel implementation
    expect(result).toBe(true);
  });

  test('CHROME-OPT-003: toggleMeasureTool — measure feature exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.measureTool?.enable === 'function'
        || typeof window.viewer.measure?.enable === 'function';
    });
    // Expected: FAIL — no measure tool
    expect(result).toBe(true);
  });

  test('CHROME-OPT-004: toggleSectionTool — sectioning feature exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.sectioning?.addClipPlane === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-OPT-005: toggleIsolationMode — visibility.isolate exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.visibility?.isolate === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-OPT-006: undo — undo system exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.undo === 'function'
        || typeof window.viewer.history?.undo === 'function';
    });
    // Expected: FAIL — no undo system
    expect(result).toBe(true);
  });

  test('CHROME-OPT-007: redo — redo system exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.redo === 'function'
        || typeof window.viewer.history?.redo === 'function';
    });
    // Expected: FAIL — no redo system
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Chrome Left Toolbar — Feature Availability
// ═══════════════════════════════════════════════════════════════

test.describe('Chrome Compatibility — Left Toolbar Features', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('CHROME-LT-001: Object Tree — feature and panel exist', async ({ page }) => {
    const result = await page.evaluate(() => {
      return {
        feature: typeof window.viewer.objectTree?.buildTree === 'function',
        panel: typeof window.viewer.treePanel?.toggle === 'function',
      };
    });
    expect(result.feature).toBe(true);
    expect(result.panel).toBe(true);
  });

  test('CHROME-LT-002: Search Sets — feature and panel exist', async ({ page }) => {
    const result = await page.evaluate(() => {
      return {
        feature: typeof window.viewer.searchSets?.execute === 'function',
        panel: typeof window.viewer.searchSetsPanel?.toggle === 'function',
      };
    });
    expect(result.feature).toBe(true);
    expect(result.panel).toBe(true);
  });

  test('CHROME-LT-003: Views & Markups — feature exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.viewsAndMarkups?.enable === 'function';
    });
    // Expected: FAIL — stub feature, not implemented
    expect(result).toBe(true);
  });

  test('CHROME-LT-004: All Items — feature exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.allItems?.enable === 'function';
    });
    // Expected: FAIL — stub feature
    expect(result).toBe(true);
  });

  test('CHROME-LT-005: Properties — feature exists with data retrieval', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.properties?.getProperties === 'function'
        || typeof window.viewer.properties?.enable === 'function';
    });
    // Expected: FAIL — stub feature
    expect(result).toBe(true);
  });

  test('CHROME-LT-006: Deviation — feature exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.deviation?.enable === 'function';
    });
    // Expected: FAIL — stub feature
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Chrome Right Toolbar — Feature Availability
// ═══════════════════════════════════════════════════════════════

test.describe('Chrome Compatibility — Right Toolbar Features', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('CHROME-RT-001: Orthographic camera toggle exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cam = window.viewer.sceneManager.getCamera();
      // Check if camera is perspective (can we switch to ortho?)
      return cam?.isPerspectiveCamera === true
        && typeof window.viewer.sceneManager.setOrthographic === 'function';
    });
    // Expected: FAIL — no ortho toggle method, only perspective camera
    expect(result).toBe(true);
  });

  test('CHROME-RT-002: Render modes — wireframe/shaded/realistic toggle', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.renderModes?.setMode === 'function'
        || typeof window.viewer.sceneManager.setRenderMode === 'function';
    });
    // Expected: FAIL — no render mode system
    expect(result).toBe(true);
  });

  test('CHROME-RT-003: X-Ray mode — transparency/ghosting toggle', async ({ page }) => {
    const result = await page.evaluate(() => {
      // X-Ray can be built from setOpacity, but is there a dedicated toggle?
      if (typeof window.viewer.xray?.toggle === 'function') return 'native';
      if (typeof window.viewer.visibility?.setOpacity === 'function') return 'adaptable';
      return 'missing';
    });
    expect(['native', 'adaptable']).toContain(result);
  });

  test('CHROME-RT-004: Markup tool exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.markup?.enable === 'function';
    });
    // Expected: FAIL — no markup tool
    expect(result).toBe(true);
  });

  test('CHROME-RT-005: Measure tool exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.measure?.enable === 'function';
    });
    // Expected: FAIL — no measure tool
    expect(result).toBe(true);
  });

  test('CHROME-RT-006: Quick Create tool exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.quickCreate?.enable === 'function';
    });
    // Expected: FAIL — no quick create tool
    expect(result).toBe(true);
  });

  test('CHROME-RT-007: Sectioning tool — addClipPlane and toggle', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.sectioning?.addClipPlane === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-RT-008: Reset view button — resetView exists', async ({ page }) => {
    const noError = await page.evaluate(() => {
      try { window.viewer.resetView(); return true; } catch { return false; }
    });
    expect(noError).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Chrome Unique Components — Engine Requirements
// ═══════════════════════════════════════════════════════════════

test.describe('Chrome Compatibility — Unique Components', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('CHROME-UC-001: ViewCube — camera getCamera/setCamera available', async ({ page }) => {
    const result = await page.evaluate(() => {
      const nav = window.viewer.navigation;
      return typeof nav.getCamera === 'function' && typeof nav.setCamera === 'function';
    });
    expect(result).toBe(true);
  });

  test('CHROME-UC-002: ViewCube — preset orientations computable from camera', async ({ page }) => {
    // Test that we can set camera to known positions (needed for ViewCube faces)
    const result = await page.evaluate(() => {
      try {
        const nav = window.viewer.navigation;
        // Save current
        const before = nav.getCamera();
        // Set to a known position (front view)
        nav.setCamera(
          { x: 0, y: 0, z: 10 },
          { x: 0, y: 0, z: 0 }
        );
        const after = nav.getCamera();
        // Restore
        nav.setCamera(before.position, before.target);
        return after.position.z > 5; // camera moved
      } catch (e) {
        return false;
      }
    });
    expect(result).toBe(true);
  });

  test('CHROME-UC-003: MiniMap — scene bounding box retrievable for top-down view', async ({ page }) => {
    const result = await page.evaluate(() => {
      const scene = window.viewer.sceneManager.getScene();
      // Can we compute a bounding box of the scene?
      try {
        const THREE = window.THREE || {};
        if (typeof THREE.Box3 === 'function') {
          const box = new THREE.Box3().setFromObject(scene);
          return !box.isEmpty();
        }
        // THREE might not be on window, check scene children
        return scene.children.length > 0;
      } catch {
        return false;
      }
    });
    expect(result).toBe(true);
  });

  test('CHROME-UC-004: NavigationWheel — navigation mode switching works', async ({ page }) => {
    const result = await page.evaluate(() => {
      const nav = window.viewer.navigation;
      nav.setMode('pan');
      const mode = nav.getMode();
      nav.setMode('orbit'); // restore
      return mode === 'pan';
    });
    expect(result).toBe(true);
  });

  test('CHROME-UC-005: Header Search — objectTree.filterTree available', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.viewer.objectTree?.filterTree === 'function';
    });
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Existing UI Selectors — What Chrome Replaces
// ═══════════════════════════════════════════════════════════════

test.describe('Chrome Compatibility — Current UI Elements That Will Be Replaced', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('CHROME-RPL-001: .mv-left-sidebar exists (will be replaced by Chrome LeftToolbar)', async ({ page }) => {
    const exists = await page.locator('.mv-left-sidebar').count();
    expect(exists).toBeGreaterThan(0);
  });

  test('CHROME-RPL-002: .mv-sidebar-btn exists with 7 buttons (Chrome has 6)', async ({ page }) => {
    const count = await page.locator('.mv-sidebar-btn').count();
    expect(count).toBe(7); // Chrome LeftToolbar has only 6 (no Object Groups)
  });

  test('CHROME-RPL-003: .mv-tree-panel exists (Chrome needs equivalent)', async ({ page }) => {
    const exists = await page.locator('.mv-tree-panel').count();
    expect(exists).toBeGreaterThan(0);
  });

  test('CHROME-RPL-004: .mv-search-sets-panel exists (Chrome needs equivalent)', async ({ page }) => {
    const exists = await page.locator('.mv-search-sets-panel').count();
    expect(exists).toBeGreaterThan(0);
  });

  test('CHROME-RPL-005: .mv-context-menu exists (Chrome needs equivalent)', async ({ page }) => {
    const exists = await page.locator('.mv-context-menu').count();
    expect(exists).toBeGreaterThan(0);
  });

  test('CHROME-RPL-006: .mv-status-bar exists (Chrome has no status bar)', async ({ page }) => {
    const exists = await page.locator('.mv-status-bar').count();
    expect(exists).toBeGreaterThan(0);
  });

  test('CHROME-RPL-007: .mv-toolbar exists (Chrome replaces with Header)', async ({ page }) => {
    const exists = await page.locator('.mv-toolbar').count();
    expect(exists).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. Chrome New UI — Elements NOT in Current Viewer
// ═══════════════════════════════════════════════════════════════

test.describe('Chrome Compatibility — New UI Elements Chrome Adds', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('CHROME-NEW-001: No Header component exists yet', async ({ page }) => {
    // Chrome adds: back/forward nav, project dropdown, search, settings, info, close
    const headerExists = await page.evaluate(() => {
      return !!document.querySelector('[data-chrome-header]')
        || !!document.querySelector('.chrome-header');
    });
    expect(headerExists).toBe(false); // Confirms: Chrome Header is NEW
  });

  test('CHROME-NEW-002: No Right Toolbar exists yet', async ({ page }) => {
    // Chrome adds 3 groups: (Ortho, Render, X-Ray), (Markup, Measure, Create, Section), (Reset, Undo, Redo)
    const rightToolbar = await page.evaluate(() => {
      return !!document.querySelector('[data-chrome-right-toolbar]')
        || !!document.querySelector('.chrome-right-toolbar');
    });
    expect(rightToolbar).toBe(false); // Confirms: Right Toolbar is NEW
  });

  test('CHROME-NEW-003: No ViewCube exists yet', async ({ page }) => {
    const viewCube = await page.evaluate(() => {
      return !!document.querySelector('[data-chrome-viewcube]')
        || !!document.querySelector('.chrome-viewcube');
    });
    expect(viewCube).toBe(false); // Confirms: ViewCube is NEW
  });

  test('CHROME-NEW-004: No MiniMap exists yet', async ({ page }) => {
    const minimap = await page.evaluate(() => {
      return !!document.querySelector('[data-chrome-minimap]')
        || !!document.querySelector('.chrome-minimap');
    });
    expect(minimap).toBe(false); // Confirms: MiniMap is NEW
  });

  test('CHROME-NEW-005: No NavigationWheel exists yet', async ({ page }) => {
    const navWheel = await page.evaluate(() => {
      return !!document.querySelector('[data-chrome-nav-wheel]')
        || !!document.querySelector('.chrome-nav-wheel');
    });
    expect(navWheel).toBe(false); // Confirms: NavigationWheel is NEW
  });
});
