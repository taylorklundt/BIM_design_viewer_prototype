# Test Plan

## Overview

All tests are end-to-end Playwright tests that run against the live Vite dev server in a headless Chromium browser. Tests are located in `evals/tests/` and configured via `playwright.config.js`.

## Running Tests

| Command | Purpose |
|---|---|
| `npm test` | Run **all** test suites |
| `npx playwright test evals/tests/regression.spec.js` | Regression suite only (80 tests) |
| `npx playwright test evals/tests/ifc-loading.spec.js` | IFC model loading suite only (8 tests) |
| `npx playwright test evals/tests/selection.spec.js` | Selection suite only |
| `npx playwright test -g "test name"` | Run a single test by name |
| `npx playwright test evals/tests/left-sidebar.spec.js` | Left sidebar suite only |
| `npx playwright test evals/tests/search-sets.spec.js` | Search sets suite only |
| `npx playwright test evals/tests/chrome-compatibility.spec.js` | Chrome UI compatibility suite |
| `npm run test:ui` | Open the interactive Playwright UI |
| `npm run test:report` | View the last HTML report |

## Test Infrastructure

### Playwright Configuration (`playwright.config.js`)

- **Test directory:** `./evals/tests`
- **Timeout:** 180 seconds (accommodates large IFC model loading)
- **Browser:** Chromium (headless)
- **Web server:** Vite dev server auto-started on port 3001 (`npm run dev -- --port 3001`)
- **Reporters:** HTML (`evals/report/`), JSON (`evals/results.json`), list (console)
- **Artifacts:** Screenshots on failure, video retained on failure

### Test Pages

| Page | URL | Purpose |
|---|---|---|
| `demo/test-page.html` | `/test-page.html` | Mock scene with 5 colored boxes. Used by regression and selection tests for fast, deterministic assertions without loading real IFC files. |
| `demo/index.html` | `/` | Full demo page with IFC loading (dark theme). Used by `ifc-loading.spec.js` to test real model loading via the sample model button. |
| `demo/chrome.html` | `/chrome.html` | Chrome UI entry point (React/Tailwind light theme). Used for Chrome UI development and manual testing. Not used by automated Playwright tests yet. |

### Shared Helpers (`evals/tests/test-helpers.js`)

| Helper | Description |
|---|---|
| `setupViewer(page)` | Navigates to `/test-page.html`, waits for `window.viewer` and `window.__sceneReady`. |
| `setupViewerWithModel(page)` | Navigates to demo, clicks sample model button, waits for `load-complete` event. |
| `getCanvas(page)` | Returns Playwright locator for the viewer canvas. |
| `clickCanvasCenter(page, opts)` | Clicks center of canvas. Supports `ctrl`, `button: 'right'`, `dblclick`. |
| `clickCanvas(page, offsetX, offsetY, opts)` | Clicks at offset from canvas center. |
| `clickEmptySpace(page, opts)` | Clicks near the top-left corner (sky area). |
| `hoverCanvasCenter(page)` | Moves mouse to canvas center. |
| `captureEvents(page, eventNames)` | Starts capturing viewer events; returns a getter function. |
| `getSelection(page)` | Returns current selection array from the viewer. |
| `deselectAll(page)` | Clears the viewer selection. |
| `setHoverEnabled(page, enabled)` | Toggles hover highlighting. |

## Test Suites

### 1. Regression Suite (`regression.spec.js`) — 80 tests

Comprehensive regression coverage across all features. Uses the mock scene (`test-page.html`) for speed and determinism.

#### Test ID Convention: `REG-{CATEGORY}-{NNN}`

| Category | ID Prefix | Tests | What It Covers |
|---|---|---|---|
| Viewer Initialization | `REG-INIT` | 5 | DOM structure, subsystem references, mock meshes, canvas dimensions, grid helper |
| Navigation | `REG-NAV` | 13 | Orbit/pan modes, zoom, camera get/set, controls enable/disable, walk speed, zoomToFit/zoomToSelection |
| Visibility | `REG-VIS` | 14 | hide/show/toggle single and multiple, hideAll/showAll, isolate, opacity, hideByType/showByType, destroy cleanup |
| Object Tree | `REG-TREE` | 9 | buildTree, expand/collapse, toggleNode, selectNode, selectNodesByElementIds, filterTree, destroy, icon/type formatting |
| Sectioning | `REG-SEC` | 9 | addClipPlane, removeClipPlane, clearClipPlanes, movePlane, flipPlane, setPlaneEnabled, setPlaneVisible, state round-trip, destroy |
| State Persistence | `REG-STATE` | 6 | getState structure, camera capture, nav mode capture, hidden elements capture, selection capture, setState restore |
| View Reset | `REG-RESET` | 4 | Deselects all, shows hidden elements, clears section planes, resets nav mode |
| Keyboard Shortcuts | `REG-KEY` | 5 | R (reset), O (orbit), P (pan), H (hide selected), I (isolate selected) |
| Scene Manager | `REG-SCENE` | 7 | getScene, getCamera, getRenderer, getDomElement, showGrid toggle, add/remove objects, resize |
| Integration & Edge Cases | `REG-INT` | 8 | Cross-feature workflows, rapid toggles, destroy cleanup, status bar, event emission |

### 2. IFC Model Loading Suite (`ifc-loading.spec.js`) — 8 tests

Tests the full IFC loading pipeline against the real 25 MB Condos.ifc model. Uses the demo page (`/`).

| Test | What It Verifies |
|---|---|
| WASM files are accessible | `/web-ifc.wasm` returns HTTP 200 |
| IFC loader initializes without errors | `ifcLoader`, `components`, and inner `IfcLoader` are all instantiated |
| WASM settings are correctly configured | `wasm.path` is `'/'`, `wasm.absolute` is `true`, `autoSetWasm` is `false` |
| Sample IFC model file is accessible | `/models/Condos.ifc` returns HTTP 200 |
| Sample IFC model loads via button click | `load-start` and `load-complete` events fire, no `load-error` |
| Model adds meshes to the scene | Scene contains mesh objects after loading |
| No console errors during loading | No critical `console.error` or uncaught page errors |
| loadModel API works programmatically | `viewer.loadModel('/models/Condos.ifc')` resolves with a model ID |

### 3. Selection Suite (`selection.spec.js`) — 23 tests

Tests click-based element selection, multi-select (Ctrl+click), deselection, hover highlighting, and context menu interactions.

### 4. Left Sidebar Suite (`left-sidebar.spec.js`) — 11 tests

Tests the vertical toolbar on the left side of the viewer.

| Test | What It Verifies |
|---|---|
| SIDEBAR-001 to SIDEBAR-004 | Sidebar renders with 7 buttons, correct positioning, titles, and data-panel attributes |
| SIDEBAR-005 to SIDEBAR-007 | Active state management: single active, toggle on/off |
| SIDEBAR-008 | Object Tree button toggles tree panel open/close |
| SIDEBAR-009 | Stub buttons (Views & Markups, All Items, Properties, Object Groups, Deviation) do not crash |
| SIDEBAR-010 | Each button contains an SVG icon |
| SIDEBAR-011 | Container receives `.mv-has-left-sidebar` class |

### 5. Search Sets Suite (`search-sets.spec.js`) — 28 tests

End-to-end tests for search set management via the UI panel. All execution is triggered by clicking list items, not by calling APIs directly.

| Category | Tests | What It Covers |
|---|---|---|
| Panel open/close | SS-UI-001 to SS-UI-004 | Open via sidebar button, close, toggle, mutual exclusion with Object Tree |
| Execution | SS-UI-005 to SS-UI-011 | Click to execute (AND, OR, nested), result count flash, clear previous selection, re-run |
| Inline rename | SS-UI-012 to SS-UI-015 | Edit icon → input, Enter to save, Escape to cancel, renamed set still executes |
| Delete | SS-UI-016 to SS-UI-018 | Delete with confirm, cancel preserves, empty state after deleting all |
| Metadata | SS-UI-019 to SS-UI-021 | Name, condition count, scope, date display, action button hover transition |
| Cross-feature | SS-UI-022 to SS-UI-027 | Status bar count, no-match query, excluding mode, property-set query, nested groups, currentSelection scope |
| Cleanup | SS-UI-028 | Panel destroy removes from DOM |

### 6. Chrome Compatibility Suite (`chrome-compatibility.spec.js`) — 43 tests

Tests the current 3D engine against every capability that the Chrome UI requires via the ViewerAdapter interface. Used to track readiness for Chrome UI integration.

| Category | Tests | What It Covers |
|---|---|---|
| Required adapter methods | CHROME-REQ-001 to 005 | zoomIn, zoomOut, fitToView, resetView, setViewOrientation |
| Optional adapter methods | CHROME-OPT-001 to 007 | toggleModelBrowser, togglePropertiesPanel, toggleMeasureTool, toggleSectionTool, toggleIsolationMode, undo, redo |
| Left toolbar features | CHROME-LT-001 to 006 | Object Tree, Search Sets, Views & Markups, All Items, Properties, Deviation |
| Right toolbar features | CHROME-RT-001 to 008 | Orthographic, Render Modes, X-Ray, Markup, Measure, Quick Create, Sectioning, Reset |
| Unique components | CHROME-UC-001 to 005 | ViewCube camera API, preset orientations, MiniMap bounds, NavigationWheel modes, Header search |
| UI replacement tracking | CHROME-RPL-001 to 007 | Confirms current UI elements that Chrome will replace |
| New UI tracking | CHROME-NEW-001 to 005 | Confirms Chrome elements that don't exist yet (Header, Right Toolbar, ViewCube, MiniMap, NavigationWheel) |

**Note:** Some tests are expected to fail — they document missing features (undo/redo, measure, markup, etc.). As features are implemented, these tests should turn green.

## Chrome UI Testing

Chrome component tests live in `src/chrome/__tests__/` and are separate from the engine Playwright tests.

### What to test

| Layer | Location | What It Tests |
|---|---|---|
| **Engine features** | `evals/tests/` (Playwright) | Viewer API behavior, 3D interactions, model loading |
| **Chrome components** | `src/chrome/__tests__/` | React component rendering, button clicks, adapter calls, active states |
| **Chrome compatibility** | `evals/tests/chrome-compatibility.spec.js` (Playwright) | Whether the engine supports what Chrome UI needs |

### Chrome test guidelines

- Chrome component tests verify that clicking a button calls the correct ViewerAdapter method.
- They do **not** test the engine itself — that's what `evals/tests/` is for.
- Mock the ViewerAdapter in chrome tests. The mock should verify the correct method was called with the correct arguments.
- Each chrome feature in `src/chrome/features/[name]/` should have a corresponding test file in `src/chrome/__tests__/[name].test.tsx`.

## Writing New Tests

### For a New Engine Feature

1. Create `evals/tests/[feature-name].spec.js`.
2. Import helpers from `./test-helpers.js`.
3. Use `setupViewer(page)` for mock-scene tests (fast, deterministic).
4. Use `setupViewerWithModel(page)` only when you need a real IFC model.
5. Follow the naming convention: `REG-{CATEGORY}-{NNN}: Description`.
6. Add a corresponding `npm` script in `package.json` if the suite should be runnable independently:
   ```json
   "test:[feature]": "npx playwright test evals/tests/[feature-name].spec.js"
   ```

### For a New Chrome Feature

1. Create the feature in `src/chrome/features/[feature-name]/`.
2. Create `src/chrome/__tests__/[feature-name].test.tsx`.
3. Test that the component renders, handles clicks, and calls the correct ViewerAdapter methods.
4. If the feature requires a new ViewerAdapter method, add it to `types.ts` and update `chrome-compatibility.spec.js` to track engine readiness.

### Test Structure Template

```javascript
import { test, expect } from '@playwright/test';
import { setupViewer } from './test-helpers.js';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await setupViewer(page);
  });

  test('REG-FEAT-001: Description of what is tested', async ({ page }) => {
    // Arrange: set up preconditions via page.evaluate()
    // Act: trigger the feature
    // Assert: verify outcomes with expect()
  });
});
```

### Guidelines

- **Prefer the mock scene** (`setupViewer`) over real IFC loading (`setupViewerWithModel`) — it is 10x faster.
- **Use `page.evaluate()`** to call viewer APIs and read state. Avoid relying on DOM selectors for internal state.
- **Capture events** with the `captureEvents` helper when testing that the viewer emits the correct events.
- **Timeouts:** The global timeout is 180s. For IFC loading tests, use explicit `{ timeout: 120000 }` on `waitForFunction`.
- **No flaky waits:** Prefer `waitForFunction` over `waitForTimeout` wherever possible. Use `waitForTimeout` only for rendering settle time after setup.
- **Cleanup:** Features with `destroy()` methods should have a test verifying cleanup (listeners removed, state cleared).

## CI / Pre-Merge Checklist

Before merging any change, ensure:

1. `npm test` passes (all suites, all tests green).
2. No new `console.error` output during any test run.
3. If a new **engine feature** was added, a corresponding test file exists in `evals/tests/`.
4. If a new **chrome feature** was added, a corresponding test file exists in `src/chrome/__tests__/`.
5. The regression suite (`regression.spec.js`) still passes — it must never decrease in count.
6. If a new ViewerAdapter method was added, `chrome-compatibility.spec.js` has a test for it.
