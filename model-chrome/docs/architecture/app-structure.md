# App Structure
# BIM Viewer Chrome Prototype

## Architectural Goal
Create a UI-focused front-end architecture that is:
- modular
- easy to iterate on
- visually faithful
- ready for future viewer integration

## Recommended Stack
- React
- TypeScript
- Vite
- Tailwind CSS

## Recommended Directory Structure

```txt
src/
  app/
    App.tsx
    providers/
    routes/
  components/
    chrome-layout/
      ChromeLayout.tsx
    header/
      Header.tsx
      HeaderButton.tsx
      HeaderSearch.tsx
    left-toolbar/
      LeftToolbar.tsx
      LeftToolbarButton.tsx
    right-toolbar/
      RightToolbar.tsx
      RightToolbarGroup.tsx
      RightToolbarButton.tsx
    view-cube/
      ViewCube.tsx
    minimap/
      MiniMap.tsx
    navigation-wheel/
      NavigationWheel.tsx
    viewer-canvas/
      ViewerCanvas.tsx
  features/
    toolbar-state/
    navigation-state/
    viewer-adapter/
      types.ts
      mockViewerAdapter.ts
      index.ts
  lib/
    constants/
    types/
    utils/
  assets/
    icons/
    mock-data/
```

## Component Responsibilities

### `App`
Owns the top-level app bootstrap for the BIM viewer chrome prototype.

### `ChromeLayout`
Owns the overall page composition and positioning of major UI regions.

### `Header`
Owns top application controls and search layout.

### `LeftToolbar`
Owns left-side stacked actions.

### `RightToolbar`
Owns grouped action rails on the right.

### `RightToolbarGroup`
Owns a single grouped vertical rail inside the right-side toolbar system.

### `ViewCube`
Owns the top-right orientation shell.

### `MiniMap`
Owns the bottom-right minimap shell.

### `NavigationWheel`
Owns the bottom-center circular control and future expansion state.

### `ViewerCanvas`
Owns the central placeholder area and future viewer mount boundary.

## State Boundaries

### Local state first
Use local state for:
- hover / active styles
- open / closed placeholder menus
- navigation wheel expansion shell
- lightweight presentational UI state

### Shared state later
Introduce shared state only when needed for:
- cross-toolbar selection sync
- viewer command dispatch
- external viewer binding
- tool activation that affects multiple chrome regions

## Integration Boundary
Any viewer-facing action should pass through a future adapter layer:
- `src/features/viewer-adapter/`

This keeps the UI independent from the future 3D engine implementation.

## Viewer Adapter Role
The viewer adapter layer should:
- expose a stable contract for viewer-facing actions
- isolate presentational components from viewer internals
- support a mock implementation in the prototype phase
- support a real implementation in a later integration phase

## Implementation Notes
- Keep floating overlays positioned independently from normal content flow
- Avoid embedding viewer behavior directly in presentational components
- Start with structural correctness and visual hierarchy before polishing micro-details
- Prefer small focused components over large composite files
- Keep layout logic readable and easy to refine against the reference image
