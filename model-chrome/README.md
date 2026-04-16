# BIM Viewer Chrome — UI Layer

## Context

This directory (`model-chrome/`) is a **read-only sync source** inside the [fyn 3D Model Viewer](../) project. It is periodically updated from the external ModelChrome repository.

- **Working copy:** Components from here are copied to `src/chrome/` in the root project, where all edits happen.
- **Do not edit files here directly.** Changes should go into `src/chrome/`.
- **Authoritative rules:** See [`../CLAUDE.md`](../CLAUDE.md) for the full project architecture.

Once colleagues move to the fyn repo, they will contribute directly to `src/chrome/` and this directory can be removed.

## Overview

The **UI chrome** is the visual shell of a BIM Viewer — header, toolbars, view cube, minimap, navigation controls — built in React + TypeScript + Tailwind CSS. It does not contain 3D rendering logic. All viewer communication goes through the [ViewerAdapter interface](src/features/viewer-adapter/types.ts).

## Tech Stack
- React 19
- TypeScript 5.7
- Vite 6
- Tailwind CSS 3.4
- Lucide React (icons)

## UI Regions

| Region | Component | Location |
|---|---|---|
| Header | Back/forward, search, settings, close | Top |
| Left Toolbar | 6 feature buttons (Object Tree, Search Sets, etc.) | Left, floating |
| Right Toolbar | 3 groups (View, Tools, History) — 10 buttons | Right, floating |
| View Cube | 3D orientation indicator | Top-right, floating |
| MiniMap | Floor plan overview | Bottom-right, floating |
| Navigation Wheel | Mode toggle button | Bottom-center, floating |
| Viewer Canvas | Mount point for 3D engine | Center |

## ViewerAdapter — The Integration Boundary

All chrome components communicate with the 3D engine through the `ViewerAdapter` interface:

```typescript
interface ViewerAdapter {
  zoomIn(): void;
  zoomOut(): void;
  fitToView(): void;
  resetView(): void;
  setViewOrientation(view: ViewOrientation): void;
  toggleModelBrowser?(): void;
  togglePropertiesPanel?(): void;
  toggleMeasureTool?(): void;
  toggleSectionTool?(): void;
  toggleIsolationMode?(): void;
  undo?(): void;
  redo?(): void;
}
```

- **Current:** `mockViewerAdapter.ts` logs all actions to console.
- **In fyn:** `modelViewerAdapter.ts` wraps the Three.js/web-ifc ModelViewer.
- **Future:** `procoreAdapter.ts` wraps the Procore Viewer.

Swapping engines = writing a new adapter file. Chrome components never change.

## Running Standalone (for chrome-only development)

```bash
cd model-chrome
npm install
npm run dev      # Vite dev server with mock adapter
npm run build    # Type-check + production build
```

## Key Documentation
- `docs/architecture/integration-contract.md` — ViewerAdapter boundary and mapping to fyn APIs
- `docs/architecture/app-structure.md` — component structure and responsibilities
- `docs/design/ui-inventory.md` — breakdown of all UI regions
- `docs/design/interaction-spec.md` — hover/active/focus interaction states
- `docs/product/prd.md` — product requirements
- `docs/product/acceptance-criteria.md` — phase 1 completion criteria
- `AGENTS.md` — development rules for AI-assisted work
