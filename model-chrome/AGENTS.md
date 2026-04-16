# AGENTS.md

## Project Name
BIM Viewer Chrome — UI Layer

## Context
This directory (`model-chrome/`) is a **read-only sync source** inside the fyn 3D Model Viewer project. It is periodically updated from the external ModelChrome repository maintained by colleagues. The working copy of these components lives at `src/chrome/` in the root project.

**Authoritative rules:** See [`../CLAUDE.md`](../CLAUDE.md) — specifically Sections 3 (UI Chrome Layer) and 4 (ViewerAdapter Boundary). This file supplements those rules for chrome-specific development.

## Mission
Build a modular React UI chrome (header, toolbars, view cube, minimap, navigation controls) that works with any 3D viewer engine through the ViewerAdapter interface.

## Current Scope

### In Scope
- Top header (navigation, search, settings)
- Left vertical toolbar (6 feature buttons)
- Right vertical toolbar groups (3 groups, 10 buttons)
- Bottom-center navigation control shell
- Top-right floating view cube shell
- Bottom-right floating minimap shell
- Central viewer canvas mount point
- Basic hover/active/focus interaction states
- ViewerAdapter interface and mock implementation

### Out of Scope (handled by the 3D engine in `src/core/` and `src/features/`)
- 3D rendering, IFC/model loading, camera controls
- Full BIM tool behavior (measure, markup, etc.)
- Persistence or backend APIs

## Architectural Rules
1. **Root CLAUDE.md is authoritative.** All rules in `../CLAUDE.md` apply here.
2. **God Object Protection extends here.** Chrome components must never import from or modify `src/core/ModelViewer.js`.
3. **Import Boundary.** Chrome components must **never** import directly from `src/core/`, `src/features/`, or `src/services/`. All viewer communication goes through the ViewerAdapter interface.
4. **ViewerAdapter is the only bridge.** All button clicks, tool toggles, and view commands must route through `src/chrome/features/viewer-adapter/`. No direct calls to any engine class.
5. **Engine-agnostic interface.** The ViewerAdapter `types.ts` must not contain Three.js types, Procore types, or any engine-specific imports. Swapping engines = writing a new adapter file, not changing chrome components.
6. **Each UI component is a standalone feature.** Every toolbar button, panel, and widget is its own self-contained plugin in `src/chrome/features/[feature-name]/`. No cross-feature imports between siblings.
7. **ChromeLayout is just a shell.** It composes features but must not contain feature-specific logic.
8. **Shared primitives only in `shared/`.** Reusable UI primitives (buttons, icons, layout containers) go in `src/chrome/shared/`. If a component references a specific feature name, it belongs in `features/`, not `shared/`.
9. Floating overlays (view cube, minimap, nav control, right tool groups) should remain independently positioned — not coupled to normal page flow.

## Development Priorities
1. Component isolation (standalone features)
2. ViewerAdapter contract compliance
3. Layout fidelity to reference
4. Clean state boundaries
5. Documentation quality

## Coding Guidelines
- Use React + TypeScript
- Prefer small, focused components
- Keep files readable and narrowly scoped
- Each feature gets its own directory under `features/`
- No cross-feature imports — features communicate only through the ViewerAdapter
- Avoid introducing new libraries without explanation
- Use descriptive prop and type names
- Keep state local unless shared state is clearly needed

## Styling Guidelines
- Use Tailwind for layout and styling
- Match the reference layout proportions and alignment first
- Use restrained shadows, borders, radii, and neutral UI treatments
- Floating controls should visually read as overlays above the viewer area

## Documentation Requirements
When making meaningful changes:
- Update `docs/product/prd.md` if scope changes
- Update `docs/product/acceptance-criteria.md` if completion criteria change
- Update `docs/architecture/integration-contract.md` if viewer-facing controls or events change
- Record major architectural choices in `docs/decisions/`

## Sync Workflow
- **Do not edit files in `model-chrome/` directly** within the fyn repo. Edits go in `src/chrome/`.
- When this directory is updated from the external repo, diff against `src/chrome/` and merge relevant changes.
- Once colleagues move to the fyn repo, they will contribute directly to `src/chrome/` via their own branches. At that point, this directory can be removed.
