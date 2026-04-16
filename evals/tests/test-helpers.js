/**
 * Test Helpers for 3D Model Viewer Evals
 */

/**
 * Wait for the viewer to be ready and load a sample model
 */
export async function setupViewer(page) {
  // Navigate to test page with mock scene (Vite root is demo/)
  await page.goto('/test-page.html');

  // Wait for viewer and mock scene to initialize
  await page.waitForFunction(() => window.viewer !== undefined, { timeout: 10000 });
  await page.waitForFunction(() => window.__sceneReady === true, { timeout: 10000 });

  // Wait for rendering
  await page.waitForTimeout(1000);

  // Return viewer reference for assertions
  return page;
}

/**
 * Alternative setup that waits for load-complete event
 */
export async function setupViewerWithModel(page) {
  // Navigate to demo page
  await page.goto('/demo/');

  // Wait for viewer to initialize
  await page.waitForFunction(() => window.viewer !== undefined, { timeout: 10000 });

  // Set up load tracking
  await page.evaluate(() => {
    window.__modelLoaded = false;
    window.viewer.on('load-complete', () => {
      window.__modelLoaded = true;
    });
  });

  // Load sample model
  await page.click('.sample-model-btn');

  // Wait for load-complete event
  await page.waitForFunction(
    () => window.__modelLoaded === true,
    { timeout: 60000 }
  );

  // Wait for rendering
  await page.waitForTimeout(2000);

  return page;
}

/**
 * Get the canvas element
 */
export async function getCanvas(page) {
  return page.locator('.mv-canvas-container canvas');
}

/**
 * Click on the canvas at center (should hit the model)
 */
export async function clickCanvasCenter(page, options = {}) {
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  if (options.ctrl) {
    await page.keyboard.down('Control');
  }

  if (options.button === 'right') {
    await page.mouse.click(x, y, { button: 'right' });
  } else if (options.dblclick) {
    await page.mouse.dblclick(x, y);
  } else {
    await page.mouse.click(x, y);
  }

  if (options.ctrl) {
    await page.keyboard.up('Control');
  }
}

/**
 * Click on canvas at a specific offset from center
 */
export async function clickCanvas(page, offsetX = 0, offsetY = 0, options = {}) {
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();

  const x = box.x + box.width / 2 + offsetX;
  const y = box.y + box.height / 2 + offsetY;

  if (options.ctrl) {
    await page.keyboard.down('Control');
  }

  if (options.button === 'right') {
    await page.mouse.click(x, y, { button: 'right' });
  } else if (options.dblclick) {
    await page.mouse.dblclick(x, y);
  } else {
    await page.mouse.click(x, y);
  }

  if (options.ctrl) {
    await page.keyboard.up('Control');
  }
}

/**
 * Click on empty space (corner of canvas)
 */
export async function clickEmptySpace(page, options = {}) {
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();

  // Click near top-left corner (should be empty sky)
  const x = box.x + 30;
  const y = box.y + 30;

  if (options.ctrl) {
    await page.keyboard.down('Control');
  }

  await page.mouse.click(x, y);

  if (options.ctrl) {
    await page.keyboard.up('Control');
  }
}

/**
 * Hover over canvas center
 */
export async function hoverCanvasCenter(page) {
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
}

/**
 * Move mouse to empty space
 */
export async function hoverEmptySpace(page) {
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();

  const x = box.x + 50;
  const y = box.y + 50;

  await page.mouse.move(x, y);
}

/**
 * Capture events from the viewer
 * Returns a function to get captured events
 */
export async function captureEvents(page, eventNames) {
  await page.evaluate((events) => {
    window.__capturedEvents = [];
    events.forEach(eventName => {
      window.viewer.on(eventName, (data) => {
        window.__capturedEvents.push({
          type: eventName,
          data: JSON.parse(JSON.stringify(data, (key, value) => {
            // Handle Three.js objects
            if (value && typeof value === 'object') {
              if (value.isVector3) {
                return { x: value.x, y: value.y, z: value.z, _type: 'Vector3' };
              }
              if (value.isMesh) {
                return { uuid: value.uuid, _type: 'Mesh' };
              }
            }
            return value;
          })),
          timestamp: Date.now()
        });
      });
    });
  }, eventNames);

  return async () => {
    return page.evaluate(() => window.__capturedEvents);
  };
}

/**
 * Clear captured events
 */
export async function clearEvents(page) {
  await page.evaluate(() => {
    window.__capturedEvents = [];
  });
}

/**
 * Get current selection
 */
export async function getSelection(page) {
  return page.evaluate(() => window.viewer.selection.getSelected());
}

/**
 * Get last intersection data
 */
export async function getLastIntersection(page) {
  return page.evaluate(() => {
    const intersection = window.viewer.selection.getLastIntersection();
    if (!intersection) return null;
    return {
      elementId: intersection.elementId,
      hasPoint: !!intersection.point,
      hasNormal: !!intersection.normal,
      screenX: intersection.screenX,
      screenY: intersection.screenY
    };
  });
}

/**
 * Check if an element is highlighted (has selection material)
 */
export async function isElementHighlighted(page, elementId) {
  return page.evaluate((id) => {
    const selected = window.viewer.selection.getSelected();
    return selected.includes(id);
  }, elementId);
}

/**
 * Inject mock tree data from the scene's existing meshes into ObjectTree.
 * Avoids IFC model loading for tree panel tests.
 */
export async function injectMockTreeData(page) {
  await page.evaluate(() => {
    const tree = window.viewer.objectTree;
    const meshes = [];
    window.viewer.sceneManager.getScene().traverse(obj => {
      if (obj.isMesh && obj.userData.expressID) meshes.push(obj);
    });
    meshes.forEach(mesh => {
      const nodeId = `node-${mesh.userData.expressID}`;
      const node = {
        id: nodeId,
        type: 'element',
        name: mesh.userData.name || nodeId,
        elementIds: [mesh.userData.expressID],
        children: [],
      };
      tree.nodeMap.set(nodeId, node);
      tree.elementToNode.set(mesh.userData.expressID, nodeId);
      tree.treeData.push(node);
    });
    // Use render() not refresh() — refresh() calls buildTree() which wipes treeData
    window.viewer.treePanel.render();
  });
  await page.waitForSelector('.mv-tree-node-row', { timeout: 3000 });
}

/**
 * Call deselect on the selection
 */
export async function deselectAll(page) {
  await page.evaluate(() => window.viewer.selection.deselect());
}

/**
 * Set hover enabled state
 */
export async function setHoverEnabled(page, enabled) {
  await page.evaluate((e) => window.viewer.selection.setHoverEnabled(e), enabled);
}
