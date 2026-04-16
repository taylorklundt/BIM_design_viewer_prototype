# CLAUDE.md

## Commands
- **Start Server (Chrome UI):** `npm run dev` → opens `http://localhost:3000` (`demo/index.html`)
- **Start Server (legacy dark theme):** `npm run dev:old` → opens `http://localhost:3000/old.html`
- **Run Tests:** `npm test`
- **Smoke Test:** `npm run smoke`
- **Lint:** `npm run lint`

## Architecture & Code Style

### 1. The "God Object" Protection
- **CRITICAL:** Do NOT modify `src/core/ModelViewer.js` unless explicitly asked to "Refactor Core".
- This file is the stability anchor. Never add feature-specific logic (like "Selection" or "FPS") directly into it.
- This rule extends to the chrome layer: `src/chrome/` must never import from or modify files in `src/core/`.

### 2. Feature Isolation (Plugin Pattern)
- All new **3D engine features** must be standalone classes in `src/features/`.
- **Naming:** `[FeatureName].js` (e.g., `ClashDetection.js`).
- **Structure:**
  ```javascript
  export class FeatureName {
    constructor(viewer) { this.viewer = viewer; }
    enable() { /* Add listeners */ }
    disable() { /* Remove listeners */ }
  }
  ```
- This pattern applies to vanilla JS engine features only. UI chrome components follow React patterns in `src/chrome/` (see Section 3).

### 3. UI Chrome Layer (`src/chrome/`) — Plugin Pattern
- `src/chrome/` is the **React/TypeScript/Tailwind** presentation layer — the visual shell (header, toolbars, view cube, minimap, etc.).
- **Every UI component is a standalone feature.** Each toolbar icon, panel, and widget is its own self-contained plugin — same isolation philosophy as the engine features in Section 2, but using React patterns.
- **Structure:**
  ```
  src/chrome/
  ├── features/              ← Each UI feature is a standalone plugin
  │   ├── object-tree/       ← Own component(s), own state, own adapter calls
  │   ├── search-sets/
  │   ├── properties/
  │   ├── sectioning-tool/
  │   ├── measure-tool/
  │   ├── view-cube/
  │   ├── minimap/
  │   ├── header/
  │   └── viewer-adapter/    ← The bridge (not a UI feature)
  ├── shared/                ← Shared primitives only (buttons, icons, layout shell)
  └── assets/
  ```
- **Naming:** `src/chrome/features/[feature-name]/` directory per feature.
- **Rules for each chrome feature:**
  - Must be self-contained: own component(s), own state, own adapter calls.
  - Must **not** import from sibling features. No cross-feature imports.
  - Communicates with the 3D engine only through the ViewerAdapter (see Section 4).
  - Must be independently enable-able/disable-able.
- **Adding a new toolbar button or UI widget = adding a new feature directory.** Never add feature logic into an existing feature or into the layout shell.
- The layout shell (`ChromeLayout`) only composes features — it must not contain feature-specific logic.
- **CRITICAL — Import Boundary:** Chrome features must **never** import directly from `src/core/`, `src/features/`, or `src/services/`. All viewer communication goes through the ViewerAdapter (see Section 4).

### 4. ViewerAdapter Boundary
- The `ViewerAdapter` interface (`src/chrome/features/viewer-adapter/types.ts`) is the **only** bridge between the React chrome and the 3D engine.
- All button clicks, tool toggles, and view commands in chrome components must route through the adapter — no direct calls to `ModelViewer` or any feature class.
- The adapter interface must remain **engine-agnostic**: no Three.js types, no Procore types, no engine-specific imports in `types.ts`.
- Adapter implementations live in `src/chrome/features/viewer-adapter/`:
  - `mockViewerAdapter.ts` — logs to console (for standalone chrome development)
  - `modelViewerAdapter.ts` — wraps the current Three.js/web-ifc ModelViewer (working)
  - Future: `procoreAdapter.ts` — wraps Procore Viewer
- The adapter is provided to all chrome components via React Context (`ViewerAdapterContext.tsx` + `useViewerAdapter()` hook).
- **Swapping engines = writing a new adapter file.** Chrome components must never change when the engine changes.
- **The sole engine import** lives in `src/chrome/app/ChromeApp.tsx` — this is the only file that imports from `src/index.js`. No other chrome file may import engine code.

### 4a. Chrome Entry Points
- **`demo/index.html`** — the Chrome UI entry point (default). Loads `src/chrome/main.tsx` → `ChromeApp.tsx`.
- **`demo/old.html`** — the legacy dark-theme entry point. Used by existing Playwright tests. **Do not modify.**
- **`demo/test-page.html`** — mock scene test page. Used by regression and selection tests. **Do not modify.**
- `ChromeApp.tsx` creates `ModelViewer` with `showToolbar: false, showStatusBar: false` (Chrome provides its own UI), overrides the dark scene background to light gray, and provides the real adapter via React Context.
- `src/chrome/index.css` contains Tailwind directives and CSS overrides that neutralize `dark-theme.css` styles (transparent background, hidden dark toolbar/status bar, light-themed panels).

### 5. Sync Source (`model-chrome/`)
- `model-chrome/` is a **read-only reference copy** of the external ModelChrome repository maintained by colleagues.
- It is periodically updated by pulling from their repo.
- **Do not edit files in `model-chrome/` directly.** All edits go in `src/chrome/`.
- When `model-chrome/` is updated, diff against `src/chrome/` and merge relevant changes into `src/chrome/`.
- Once colleagues move to this repo, they will contribute directly to `src/chrome/` via their own branches. At that point, `model-chrome/` can be removed.

### 6. Testing
- **Full test plan:** See [`test_plan.md`](./test_plan.md) for test infrastructure, suites, helpers, and guidelines.
- **Run all tests:** `npm test`
- **Run regression only:** `npx playwright test evals/tests/regression.spec.js`
- **Run IFC loading only:** `npx playwright test evals/tests/ifc-loading.spec.js`
- Every new **engine feature** must have a corresponding test file in `evals/tests/`.
- Every new **chrome component** must have a corresponding test. Chrome tests live in `src/chrome/__tests__/`.

### 7. Adding New Features
- **IMPORTANT:** When a user asks to add a new feature, **do not start coding immediately**.
- First, use the questionnaire in [`FEATURE_INTAKE.md`](./FEATURE_INTAKE.md) to gather requirements.
- The questionnaire uses simple, non-technical language that PMs and designers can answer.
- Once the questionnaire is complete, translate the answers into the correct technical implementation following the patterns in this file.
- This ensures all features follow the plugin architecture and have proper test coverage.

### 8. Merge-to-Main Test Gate

Tests run **when merging to main**, not on every push to a feature branch.

See **[`mergetomain.md`](./mergetomain.md)** for:
- The feature → test suite mapping table
- Agent instructions (run targeted tests before `gh pr merge`)
- Human instructions (run tests manually before merging)
