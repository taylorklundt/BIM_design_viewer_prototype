# Project Context — Chrome UI Integration

## What This Project Is

A **3D BIM/IFC Model Viewer** built with Three.js, web-ifc, and @thatopen/components. The viewer loads IFC building models, provides orbit/pan navigation, element selection, visibility control, sectioning planes, object trees, and search sets.

A **Chrome UI** (React 19 / TypeScript / Tailwind) is being integrated as the new presentation layer — replacing the existing dark-theme vanilla JS UI with a modern, modular, light-themed interface.

## Architecture Decision: Blend Approach

The Chrome UI and 3D engine live in the **same project, same `npm install`, same Vite build**. React owns the layout shell; the vanilla JS engine runs inside it.

### Why Blend (not npm workspaces or separate repos)
- Single build pipeline — no cross-package dependency headaches
- Procore Viewer integration is planned — the adapter boundary matters more than folder structure
- Colleagues currently work in a separate ModelChrome repo but will eventually move to this repo
- `model-chrome/` is kept as a **read-only sync source** until colleagues migrate

## Two Entry Points

| Entry | URL | Theme | Purpose |
|---|---|---|---|
| `demo/index.html` | `localhost:3000/` | Dark | Legacy UI, used by all Playwright tests |
| `demo/chrome.html` | `localhost:3000/chrome.html` | Light (Tailwind) | Chrome UI with real 3D engine |

- `npm run dev` opens the dark-theme legacy UI
- `npm run dev:chrome` opens the Chrome UI
- **Never modify `demo/index.html` or `demo/test-page.html`** — 185 tests depend on them

## The ViewerAdapter Boundary

**The single most important architectural rule:** Chrome components communicate with the 3D engine **only** through the `ViewerAdapter` interface. No exceptions.

```
Chrome UI (React) ←→ ViewerAdapter ←→ 3D Engine (vanilla JS)
```

### Key files
| File | Role |
|---|---|
| `src/chrome/features/viewer-adapter/types.ts` | Interface definition (engine-agnostic) |
| `src/chrome/features/viewer-adapter/mockViewerAdapter.ts` | Console-logging mock for standalone dev |
| `src/chrome/features/viewer-adapter/modelViewerAdapter.ts` | Real adapter wrapping ModelViewer |
| `src/chrome/features/viewer-adapter/ViewerAdapterContext.tsx` | React Context + `useViewerAdapter()` hook |

### Sole engine import rule
Only `src/chrome/app/ChromeApp.tsx` imports from the engine (`../../index.js`). Every other chrome file gets engine access through the adapter context. This keeps the boundary clean.

## Plugin Pattern

Both engine features and chrome UI components follow a **standalone plugin pattern**:

- **Engine features:** `src/features/[FeatureName].js` — class with `enable()`, `disable()`, `destroy()`
- **Chrome features:** `src/chrome/features/[feature-name]/` — React component(s) with own state and adapter calls
- No cross-feature imports between siblings
- Each feature is independently enable-able/disable-able

## God Object Protection

`src/core/ModelViewer.js` is the stability anchor. **Never modify it** unless explicitly asked to refactor core. Never add feature-specific logic into it.

## Chrome UI Structure

```
src/chrome/
├── app/
│   ├── App.tsx              ← Standalone mock-mode entry (model-chrome dev)
│   └── ChromeApp.tsx        ← Blended entry (creates ModelViewer + real adapter)
├── features/
│   ├── chrome-layout/       ← Shell that composes all features (no logic)
│   ├── header/              ← Back/forward, project dropdown, search, settings
│   ├── left-toolbar/        ← Object Tree, Search Sets, Views, Items, Properties, Deviation
│   ├── right-toolbar/       ← View group, Tools group, History group
│   ├── view-cube/           ← 3D orientation indicator
│   ├── minimap/             ← Floor plan overview
│   ├── navigation-wheel/    ← Fit-to-view button
│   ├── viewer-canvas/       ← Mount point for 3D engine (ref-based)
│   └── viewer-adapter/      ← Interface, mock, real adapter, React Context
├── shared/                  ← For shared UI primitives (currently empty)
├── assets/icons/            ← SVGs for all toolbars and header
├── index.css                ← Tailwind directives + dark-theme CSS overrides
└── main.tsx                 ← Entry point (loads ChromeApp)
```

## How ChromeApp Integrates the Engine

1. `ViewerCanvas` provides a `<div ref>` as the mount point
2. `ChromeApp` creates `ModelViewer(container, { showToolbar: false, showStatusBar: false })` in a `useEffect`
3. On `ready` event: overrides dark scene background to light gray, creates real adapter via `createModelViewerAdapter(viewer)`, sets adapter state
4. `ViewerAdapterProvider` distributes the adapter to all chrome components via React Context
5. Chrome components call `useViewerAdapter()` to get the adapter
6. A `WelcomeOverlay` shows until a model is loaded (supports drag-drop and sample model button)

## CSS Override Strategy

`dark-theme.css` is a side-effect import in `ModelViewer.js` — it always loads when the engine is instantiated. In Chrome mode, `src/chrome/index.css` overrides:

- `.model-viewer { position: absolute; inset: 0; background: transparent }` — removes dark background, fixes positioning
- `.mv-toolbar, .mv-status-bar, .mv-left-sidebar { display: none }` — hides dark-theme UI elements Chrome replaces
- `.mv-context-menu, .mv-tree-panel, .mv-panel { background: white; color: gray }` — re-themes engine panels to light
- `.mv-loading { background: white }` — light loading overlay

## Current Wiring Status

### Wired and working
- **Reset** → `viewer.resetView()`
- **Object Tree** → `viewer.treePanel.toggle()`
- **Sectioning** → `viewer.sectioning.clearClipPlanes()`
- **NavigationWheel** → `viewer.navigation.zoomToFit()`
- **Isolation** → `viewer.visibility.isolate()` / `showAll()`
- **Zoom In/Out** → `viewer.navigation.zoom(±1)` (adapter ready, no button yet)
- **View Orientations** → `viewer.navigation.setCamera()` with presets (adapter ready, ViewCube not wired)

### Wired to stubs (engine feature not built)
- Properties, Measure, Undo, Redo — log to console

### Not wired yet
- Search Sets, Views & Markups, Items, Deviation, Orthographic, Render Modes, X-Ray, Markup, Quick Create, ViewCube faces, Header Search, MiniMap

## React StrictMode Consideration

React StrictMode double-mounts in dev mode. The `ChromeApp` uses a `viewerInstanceRef` guard to prevent creating two ModelViewer instances. The cleanup function in `useEffect` does **not** call `viewer.destroy()` because the WebGL context disposal is irreversible.

## Sync Workflow (model-chrome/)

1. Colleagues update their external ModelChrome repo
2. Pull their changes into `model-chrome/` in this repo
3. Diff `model-chrome/src/` against `src/chrome/` and merge relevant changes
4. Once colleagues move to this repo, they contribute to `src/chrome/` directly and `model-chrome/` is removed

## Tech Stack

| Layer | Technologies |
|---|---|
| 3D Engine | Three.js, web-ifc, @thatopen/components, @thatopen/fragments |
| Chrome UI | React 19, TypeScript 5.7, Tailwind CSS 3.4, Lucide React |
| Build | Vite 5 + @vitejs/plugin-react |
| Tests | Playwright (engine e2e tests in `evals/tests/`) |
| Config | `tsconfig.json` (scoped to `src/chrome/`), `tailwind.config.js` (scoped to `src/chrome/`), `postcss.config.js` |

## Test Suites

| Suite | Count | Location |
|---|---|---|
| Regression | 80 | `evals/tests/regression.spec.js` |
| Search Sets | 28 | `evals/tests/search-sets.spec.js` |
| Selection | 23 (3 pre-existing failures) | `evals/tests/selection.spec.js` |
| Left Sidebar | 11 | `evals/tests/left-sidebar.spec.js` |
| IFC Loading | 8 | `evals/tests/ifc-loading.spec.js` |
| Chrome Compatibility | 43 (15 expected failures) | `evals/tests/chrome-compatibility.spec.js` |

Run all: `npm test`. Tests use `demo/index.html` and `demo/test-page.html` — never `chrome.html`.

## Known Issues / Next Steps

1. **Toolbar buttons feel disconnected** — many Chrome buttons aren't wired to the adapter yet. Each "not wired" button needs: adapter method added to `types.ts`, implemented in `modelViewerAdapter.ts` and `mockViewerAdapter.ts`, and called from the Chrome component.
2. **Right-click context menu** — engine's context menu renders inside the ViewerCanvas stacking context. CSS has been re-themed to light, but z-index layering with Chrome toolbars may need tuning.
3. **No active state management** — Chrome toolbar buttons don't track active/pressed state. Need state in each toolbar to show which tool is active.
4. **SearchSets not wired** — the engine has a full SearchSets feature + panel, but the Chrome left toolbar button doesn't toggle it yet.
5. **File loading** — currently handled by a `WelcomeOverlay` in `ChromeApp.tsx`. May need to be moved to the Chrome Header for better UX (Load IFC button in header).
6. **Procore Viewer integration** — future work. Write `procoreAdapter.ts` implementing the same `ViewerAdapter` interface. Chrome components don't change.

## Branch History

| Branch | Purpose |
|---|---|
| `main` | Stable base |
| `searchsetManager` | Search Set Manager feature |
| `feature/model-chrome-ui` | Chrome UI integration (current work) |
