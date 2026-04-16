# Integration Contract
# Chrome UI ↔ 3D Engine

## Purpose
This document defines the architectural boundary between the Chrome UI (`src/chrome/`) and the 3D engine (`src/core/`, `src/features/`). The ViewerAdapter interface is the **only** bridge between the two layers.

## Integration Principles
1. Chrome owns presentation and user-facing controls.
2. The engine owns rendering, camera movement, and model interaction.
3. All communication goes through the `ViewerAdapter` interface — no exceptions.
4. Chrome components must never import from `src/core/`, `src/features/`, or `src/services/`.
5. The adapter interface must remain engine-agnostic (no Three.js or Procore types).
6. Swapping engines = writing a new adapter file. Chrome components never change.

## ViewerAdapter Interface

```ts
export type ViewOrientation =
  | 'top' | 'bottom' | 'front' | 'back'
  | 'left' | 'right' | 'isometric';

export interface ViewerAdapter {
  // Required
  zoomIn(): void;
  zoomOut(): void;
  fitToView(): void;
  resetView(): void;
  setViewOrientation(view: ViewOrientation): void;

  // Optional
  toggleModelBrowser?(): void;
  togglePropertiesPanel?(): void;
  toggleMeasureTool?(): void;
  toggleSectionTool?(): void;
  toggleIsolationMode?(): void;
  undo?(): void;
  redo?(): void;
}
```

## Adapter Implementations

| File | Engine | Status |
|---|---|---|
| `mockViewerAdapter.ts` | None (logs to console) | Working |
| `modelViewerAdapter.ts` | Three.js / web-ifc `ModelViewer` | Working — wired via `ViewerAdapterContext` |
| `procoreAdapter.ts` | Procore Viewer | Future |

## Concrete Mapping: ViewerAdapter → ModelViewer API

### Required Methods

| Adapter Method | ModelViewer API | Status |
|---|---|---|
| `zoomIn()` | `viewer.navigation.zoom(1)` | Ready |
| `zoomOut()` | `viewer.navigation.zoom(-1)` | Ready |
| `fitToView()` | `viewer.navigation.zoomToFit()` | Ready |
| `resetView()` | `viewer.resetView()` | Ready |
| `setViewOrientation(view)` | `viewer.navigation.setCamera(position, target)` with preset position map | Wired — preset orientations in `modelViewerAdapter.ts` |

### Optional Methods

| Adapter Method | ModelViewer API | Status |
|---|---|---|
| `toggleModelBrowser()` | `viewer.treePanel.toggle()` | Ready |
| `togglePropertiesPanel()` | — | Missing — `Properties.js` is a stub |
| `toggleMeasureTool()` | — | Missing — `MeasureTool.js` is a stub |
| `toggleSectionTool()` | `viewer.sectioning.clearClipPlanes()` | Wired — clears planes (toggle UI still needed) |
| `toggleIsolationMode()` | `viewer.visibility.isolate(selected)` / `showAll()` | Wired — isolates selection or shows all |
| `undo()` | — | Missing — `UndoRedo.js` is a stub |
| `redo()` | — | Missing — `UndoRedo.js` is a stub |

## Chrome Button → Adapter → Engine Mapping

### Left Toolbar

| Chrome Button | Adapter Method | Engine Feature | Status |
|---|---|---|---|
| Object Tree | `toggleModelBrowser()` | `ObjectTree` + `TreePanel` | Wired |
| Search Sets | *(not wired yet)* | `SearchSets` + `SearchSetsPanel` | Not wired |
| Views & Markups | *(not wired yet)* | `ViewsAndMarkups.js` stub | Missing |
| Items | *(not wired yet)* | `AllItems.js` stub | Missing |
| Properties | `togglePropertiesPanel()` | `Properties.js` stub | Wired (stub) |
| Deviation | *(not wired yet)* | `Deviation.js` stub | Missing |

### Right Toolbar

| Chrome Button | Adapter Method | Engine Feature | Status |
|---|---|---|---|
| Orthographic | *(not wired yet)* | `OrthographicCamera.js` stub | Not wired |
| Render Modes | *(not wired yet)* | `RenderModes.js` stub | Not wired |
| X-Ray | *(not wired yet)* | `viewer.visibility.setOpacity()` | Not wired |
| Markup | *(not wired yet)* | `MarkupTool.js` stub | Not wired |
| Measure | `toggleMeasureTool()` | `MeasureTool.js` stub | Wired (stub) |
| Quick Create | *(not wired yet)* | `QuickCreate.js` stub | Not wired |
| Sectioning | `toggleSectionTool()` | `viewer.sectioning.clearClipPlanes()` | Wired |
| Reset | `resetView()` | `viewer.resetView()` | Wired |
| Undo | `undo()` | `UndoRedo.js` stub | Wired (stub) |
| Redo | `redo()` | `UndoRedo.js` stub | Wired (stub) |

### Other Components

| Chrome Component | Adapter Method | Engine API | Status |
|---|---|---|---|
| ViewCube faces | `setViewOrientation()` | `viewer.navigation.setCamera()` | Adapter ready, button not wired |
| NavigationWheel | `fitToView()` | `viewer.navigation.zoomToFit()` | Wired |
| Header Search | *(custom — not in adapter yet)* | `viewer.objectTree.filterTree()` | Ready |
| MiniMap | *(needs read-only camera state)* | `viewer.navigation.getCamera()` | Needs event sync |

## Event Sync: Engine → Chrome

Chrome components need to react to engine events for real-time state updates:

| Engine Event | Chrome Component | What It Updates |
|---|---|---|
| `camera-change` | ViewCube | Orientation indicator |
| `camera-change` | MiniMap | Viewport position |
| `mode-change` | NavigationWheel | Active mode highlight |
| `selection-change` | Left toolbar (Properties, Items) | Badge counts / content |
| `load-complete` | Header | Model name display |
| `section-plane-add/remove` | Right toolbar (Sectioning) | Active state |

**Implementation pattern:** The adapter subscribes to engine events and exposes them as React-friendly state (context, callbacks, or a state store).

## Viewer Mount Point

`ViewerCanvas` provides a ref-based mount point. `ChromeApp` creates the engine and provides the adapter:

```tsx
// src/chrome/app/ChromeApp.tsx (actual implementation):
const viewerContainerRef = useRef<HTMLDivElement>(null);
const [adapter, setAdapter] = useState<ViewerAdapter>(mockViewerAdapter);

useEffect(() => {
  const viewer = new ModelViewer(container, {
    showToolbar: false,    // Chrome provides its own
    showStatusBar: false,  // Chrome provides its own
    showGrid: true,
  });

  viewer.on('ready', () => {
    scene.background.setHex(0xf3f4f6); // Light gray
    const realAdapter = createModelViewerAdapter(viewer);
    setAdapter(realAdapter); // All chrome components re-render with real adapter
  });
}, []);

// Adapter distributed via React Context:
<ViewerAdapterProvider adapter={adapter}>
  <ChromeLayout viewerContainerRef={viewerContainerRef} />
</ViewerAdapterProvider>
```

**Key files:**
- `src/chrome/app/ChromeApp.tsx` — sole engine import, creates ModelViewer, provides adapter
- `src/chrome/features/viewer-adapter/ViewerAdapterContext.tsx` — React Context + `useViewerAdapter()` hook
- `src/chrome/features/viewer-adapter/modelViewerAdapter.ts` — `createModelViewerAdapter(viewer)` factory
- `src/chrome/index.css` — CSS overrides to neutralize `dark-theme.css` in Chrome mode

## Extending the Adapter

When adding a new chrome feature that needs engine interaction:

1. Add the method to `ViewerAdapter` interface in `types.ts` (optional `?` if not all engines support it).
2. Implement it in `modelViewerAdapter.ts` using the existing ModelViewer API.
3. Add a `mockViewerAdapter.ts` logging implementation.
4. Add a test in `chrome-compatibility.spec.js` to track engine readiness.
5. Wire the chrome component to call the adapter method.

## Compatibility Tracking

The `evals/tests/chrome-compatibility.spec.js` test suite tracks which adapter methods the current engine supports. Run it to see the current state:

```bash
npx playwright test evals/tests/chrome-compatibility.spec.js
```

As of Chrome UI integration (Phase 2):
- **7 of 19** chrome buttons wired to engine via adapter (Reset, Object Tree, Sectioning, Measure, Undo, Redo, NavigationWheel/FitToView)
- **5 of 7** wired buttons call real engine APIs (Reset, Object Tree, Sectioning, FitToView, Isolation)
- **4 of 7** wired buttons call stubs (Properties, Measure, Undo, Redo — engine features not yet built)
- **12 of 19** chrome buttons not yet wired (Search Sets, Views & Markups, Items, Deviation, Orthographic, Render Modes, X-Ray, Markup, Quick Create, ViewCube faces, Header Search, MiniMap)
