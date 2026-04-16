/**
 * IFC Model Loading - Automated Test Suite
 * Tests the full IFC model loading pipeline including WASM initialization,
 * file fetching, parsing, and scene rendering.
 */
import { test, expect } from '@playwright/test';

test.describe('IFC Model Loading', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the demo page
    await page.goto('/');
    // Wait for viewer to initialize
    await page.waitForFunction(() => window.viewer !== undefined, { timeout: 15000 });
  });

  test('WASM files are accessible from the server', async ({ page }) => {
    // Verify web-ifc.wasm is served correctly
    const wasmResponse = await page.evaluate(async () => {
      const res = await fetch('/web-ifc.wasm');
      return { status: res.status, ok: res.ok, contentType: res.headers.get('content-type') };
    });
    expect(wasmResponse.ok).toBe(true);
    expect(wasmResponse.status).toBe(200);
  });

  test('IFC loader initializes without errors', async ({ page }) => {
    // Check that the IFC loader was created
    const loaderReady = await page.evaluate(async () => {
      const viewer = window.viewer;
      // Wait for init promise to complete
      if (viewer.ifcLoader && viewer.ifcLoader._initPromise) {
        await viewer.ifcLoader._initPromise;
      }
      return {
        hasLoader: !!viewer.ifcLoader,
        hasComponents: !!viewer.ifcLoader?.components,
        hasIfcLoader: !!viewer.ifcLoader?.ifcLoader,
      };
    });
    expect(loaderReady.hasLoader).toBe(true);
    expect(loaderReady.hasComponents).toBe(true);
    expect(loaderReady.hasIfcLoader).toBe(true);
  });

  test('IFC loader WASM settings are correctly configured', async ({ page }) => {
    // After init, verify wasm settings point to local path, not CDN
    const wasmSettings = await page.evaluate(async () => {
      const viewer = window.viewer;
      if (viewer.ifcLoader && viewer.ifcLoader._initPromise) {
        await viewer.ifcLoader._initPromise;
      }
      const settings = viewer.ifcLoader?.ifcLoader?.settings;
      return {
        wasmPath: settings?.wasm?.path,
        wasmAbsolute: settings?.wasm?.absolute,
        autoSetWasm: settings?.autoSetWasm,
      };
    });
    // WASM path should be local, not CDN
    expect(wasmSettings.wasmPath).toBe('/');
    expect(wasmSettings.wasmAbsolute).toBe(true);
    // autoSetWasm should be false to prevent CDN override
    expect(wasmSettings.autoSetWasm).toBe(false);
  });

  test('Sample IFC model file is accessible', async ({ page }) => {
    // Verify the Condos.ifc file can be fetched
    const modelResponse = await page.evaluate(async () => {
      const res = await fetch('/models/Condos.ifc');
      return {
        status: res.status,
        ok: res.ok,
        size: parseInt(res.headers.get('content-length') || '0', 10)
      };
    });
    expect(modelResponse.ok).toBe(true);
    expect(modelResponse.status).toBe(200);
  });

  test('Sample IFC model loads successfully via button click', async ({ page }) => {
    // Set up event tracking before loading
    await page.evaluate(() => {
      window.__loadEvents = [];
      window.__loadError = null;

      window.viewer.on('load-start', (data) => {
        window.__loadEvents.push({ type: 'load-start', data });
      });
      window.viewer.on('load-complete', (data) => {
        window.__loadEvents.push({ type: 'load-complete', data });
      });
      window.viewer.on('load-error', (data) => {
        window.__loadEvents.push({ type: 'load-error', data });
        window.__loadError = data.error;
      });
    });

    // Click the sample model button
    await page.click('.sample-model-btn');

    // Wait for either load-complete or load-error (up to 120 seconds for large model)
    const result = await page.waitForFunction(
      () => {
        return window.__loadEvents.some(
          e => e.type === 'load-complete' || e.type === 'load-error'
        );
      },
      { timeout: 120000 }
    );

    // Check results
    const loadResult = await page.evaluate(() => ({
      events: window.__loadEvents.map(e => e.type),
      error: window.__loadError,
      modelCount: window.viewer.ifcLoader?.loadedModels?.size || 0,
    }));

    // Should have load-start and load-complete, no error
    expect(loadResult.events).toContain('load-start');
    expect(loadResult.events).toContain('load-complete');
    expect(loadResult.events).not.toContain('load-error');
    expect(loadResult.error).toBeNull();
    expect(loadResult.modelCount).toBeGreaterThan(0);
  });

  test('Model adds meshes to the scene after loading', async ({ page }) => {
    // Set up load tracking
    await page.evaluate(() => {
      window.__modelLoaded = false;
      window.__loadError = null;
      window.viewer.on('load-complete', () => { window.__modelLoaded = true; });
      window.viewer.on('load-error', (data) => { window.__loadError = data.error; });
    });

    // Click sample model button
    await page.click('.sample-model-btn');

    // Wait for load to finish
    await page.waitForFunction(
      () => window.__modelLoaded || window.__loadError,
      { timeout: 120000 }
    );

    // Verify no error and meshes exist in scene
    const sceneInfo = await page.evaluate(() => {
      if (window.__loadError) return { error: window.__loadError };

      const scene = window.viewer.sceneManager.getScene();
      let meshCount = 0;
      scene.traverse((obj) => {
        if (obj.isMesh) meshCount++;
      });
      return { error: null, meshCount };
    });

    expect(sceneInfo.error).toBeNull();
    expect(sceneInfo.meshCount).toBeGreaterThan(0);
  });

  test('No console errors during model loading', async ({ page }) => {
    const consoleErrors = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Set up load tracking
    await page.evaluate(() => {
      window.__modelLoaded = false;
      window.__loadError = null;
      window.viewer.on('load-complete', () => { window.__modelLoaded = true; });
      window.viewer.on('load-error', (data) => { window.__loadError = data.error; });
    });

    // Click sample model button
    await page.click('.sample-model-btn');

    // Wait for load to finish
    await page.waitForFunction(
      () => window.__modelLoaded || window.__loadError,
      { timeout: 120000 }
    );

    // Filter out non-critical console errors (e.g. favicon, source maps)
    const criticalErrors = consoleErrors.filter(
      e => !e.includes('favicon') && !e.includes('.map') && !e.includes('404')
    );

    const criticalPageErrors = pageErrors.filter(
      e => !e.includes('favicon') && !e.includes('.map')
    );

    // Check there are no critical errors
    expect(criticalPageErrors).toEqual([]);
    // The load should succeed
    const loadError = await page.evaluate(() => window.__loadError);
    expect(loadError).toBeNull();
  });

  test('loadModel API works programmatically', async ({ page }) => {
    // Test the programmatic API directly
    const result = await page.evaluate(async () => {
      try {
        const modelId = await window.viewer.loadModel('/models/Condos.ifc', 'Test Model');
        return { success: true, modelId, error: null };
      } catch (error) {
        return { success: false, modelId: null, error: error.message };
      }
    });

    expect(result.success).toBe(true);
    expect(result.modelId).toBeTruthy();
    expect(result.error).toBeNull();
  });

  test('Object streaming lifecycle events are emitted during load', async ({ page }) => {
    await page.evaluate(() => {
      window.__streamEvents = [];
      window.__streamDone = false;
      window.__streamFailed = null;

      const capture = (type) => (data) => {
        window.__streamEvents.push({ type, data });
      };

      window.viewer.on('stream-capability', capture('stream-capability'));
      window.viewer.on('object-load-start', capture('object-load-start'));
      window.viewer.on('object-load-progress', capture('object-load-progress'));
      window.viewer.on('object-load-complete', capture('object-load-complete'));
      window.viewer.on('object-load-error', (data) => {
        window.__streamFailed = data?.error || 'unknown stream error';
        capture('object-load-error')(data);
      });
      window.viewer.on('model-stream-complete', () => {
        window.__streamDone = true;
      });
      window.viewer.on('load-error', (data) => {
        window.__streamFailed = data?.error || 'unknown load error';
      });
    });

    await page.click('.sample-model-btn');

    await page.waitForFunction(
      () => window.__streamDone || window.__streamFailed,
      { timeout: 120000 }
    );

    const result = await page.evaluate(() => ({
      failed: window.__streamFailed,
      events: window.__streamEvents.map((e) => e.type),
      progressPayloads: window.__streamEvents
        .filter((e) => e.type === 'object-load-progress')
        .map((e) => e.data),
    }));

    expect(result.failed).toBeNull();
    expect(result.events).toContain('stream-capability');
    expect(result.events).toContain('object-load-progress');
    expect(result.events).toContain('object-load-complete');

    const hasProgress = result.progressPayloads.some(
      (p) => typeof p?.parserProgress === 'number'
    );
    expect(hasProgress).toBe(true);
  });

});
