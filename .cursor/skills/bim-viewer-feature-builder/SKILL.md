---
name: bim-viewer-feature-builder
description: >-
  Design and build features for a professional BIM 3D model viewer.
  Use when the user asks to add, design, or plan a viewer feature —
  sectioning tools, gizmos, selection behavior, overlays, panels,
  measurement, navigation, loading states, or any 3D interaction.
  Provides BIM-specific interaction design patterns, lifecycle
  checklists, and acceptance-criteria formatting. Complements
  CLAUDE.md (architecture) and FEATURE_INTAKE.md (requirements).
---

# BIM Viewer Feature Builder

This skill provides **BIM domain knowledge and interaction design patterns** for building features in this viewer. It does NOT repeat architecture rules (see `CLAUDE.md`) or requirements gathering (see `FEATURE_INTAKE.md`).

## When to Use

After `FEATURE_INTAKE.md` questionnaire is complete — or when the user skips intake and describes a feature directly — use this skill to translate the request into precise, buildable interaction design before writing code.

## Design Defaults

When something is ambiguous, always choose:
- **Constrained** over freeform (axis-locked over free-spin)
- **Professional** over flashy (stable and precise over animated and clever)
- **Anchored** over floating (attached to real geometry, not arbitrary screen positions)
- **Explicit** over implied (state every visual change, don't say "highlight it nicely")

State assumptions briefly, then continue.

---

## Interaction Lifecycle Checklist

Every tool or interactive feature must define ALL of these before implementation:

| Phase | Define |
|-------|--------|
| **Entry** | How the tool activates (button click, shortcut, context menu) |
| **Targeting** | What can be hovered/selected while the tool is active |
| **Creation** | What happens on first click/action |
| **Manipulation** | Drag/handle behavior, axis constraints, value ranges |
| **Feedback** | Exact visual response at every step (hover, active, dragging, complete) |
| **Conflict prevention** | What is disabled while this tool is active (orbit, selection, other tools) |
| **Exit** | How the interaction ends (Escape, click away, toggle off) |
| **Persistence** | What state survives after exit (is the result kept? editable later?) |
| **Re-entry** | How the user selects and edits the result again later |
| **Cleanup** | What "Reset View" or tool destruction clears |

Skip none of these. If a phase doesn't apply, say "N/A" explicitly.

---

## BIM-Specific Interaction Rules

### Selection & Hover States

Always define three distinct visual states with exact differences:

| State | Material behavior |
|-------|------------------|
| **Hover** | Lighten the object's own color (preserve hue, boost lightness). No flat overlay color. |
| **Selected** | Apply selection color (`highlightMaterial`). Full material replacement. |
| **Edit** | Selection color + visible gizmo/handles. Object stays selected-color while being edited. |

Never describe a visual state vaguely. Specify: color change, opacity, emissive, outline, or overlay — and the exact values or relative adjustments.

### Sectioning Tools

Treat these as **separate tools** (they share UI space but have different behavior):

| Tool | Creates | Orientation source | Depth control |
|------|---------|-------------------|---------------|
| **Section cut** | Infinite clipping plane | Clicked face normal | Drag along normal |
| **Section plane** | Bounded plane with visible edges | Clicked face normal or world axis | Drag along normal |
| **Section box** | 6-sided clipping volume | World-axis-aligned | Drag individual faces |

For any sectioning feature, define:
1. How it is **created** (click face, click point, menu action)
2. How **orientation** is determined (face normal, world axis, manual)
3. How **depth/direction** is controlled (drag handle, numeric input, both)
4. How it **enters edit mode** (click the section object, double-click, auto on creation)
5. How it is **selected again later** (click the plane/box visual, toolbar re-select)
6. How it **exits edit mode** (Escape, click away, toggle tool off)

### Gizmos

- Appear **only** in edit state — never visible when tool is inactive
- Positioned at the **center** of the editable object (section plane center, measurement midpoint, etc.)
- Clearly represent constrained axes (color-coded: red=X, green=Y, blue=Z)
- Movement is **axis-constrained by default** — free movement only if explicitly requested
- "Left/right and forward/back" = constrained axis rotation, NOT free spin
- **Orbit controls are disabled** while dragging any gizmo handle
- Define exactly what each handle does (translate along normal, rotate around axis, scale uniformly, etc.)
- Scale relative to camera distance so they remain usable at any zoom level

### Loading & Streaming

- Distinguish **initial load** (model appearing for first time) vs **in-view streaming** (progressive detail)
- Show feedback only when delay is noticeable (> ~500ms)
- Per-object placeholders (bounding box wireframes) for streaming when geometry count is known
- Progress indicators belong in the chrome layer, not the 3D scene

### Panels

- Smooth repositioning when dragging — no jumping or snapping unpredictably
- Define insertion logic when docking (push siblings, overlay, collapse)
- Preserve layout stability — opening a panel must not shift the 3D viewport unexpectedly
- Panels must not contain 3D logic — they read state from the ViewerAdapter

### Overlays (view cube, minimap, tooltips)

- Anchor to a safe viewport corner with explicit padding from edges
- Avoid overlap with header, toolbars, and open panels
- Define exact positioning: which corner, pixel offset, resize behavior

### Measurements

- Snap to vertices, edges, midpoints, or face centers — define which
- Display label at midpoint of the measurement line
- Label always faces camera (billboard behavior)
- Units follow model units or user preference
- Clear all on "Reset View"

---

## Acceptance Criteria Format

Write acceptance criteria as a flat list of specific, testable statements. Every criterion must be a concrete behavior, not a goal.

**Good:**
```
- Clicking a model face creates a section plane aligned to that face's normal.
- The section immediately enters edit mode.
- A gizmo appears at the center of the section plane.
- Dragging the depth handle moves the cut along the face normal.
- Rotation handles allow pitch and yaw adjustment only (no roll).
- Orbit controls are disabled while dragging a gizmo handle.
- Pressing Escape exits edit mode, hides the gizmo, preserves the section.
- Clicking the section plane visual re-enters edit mode.
- "Reset View" removes all section planes.
```

**Bad:**
```
- The section tool should work well.
- Users can adjust the section plane.
- It should look professional.
```

---

## Output: How to Respond

After gathering requirements (via `FEATURE_INTAKE.md` or direct description), produce:

1. **Completed interaction lifecycle table** (from checklist above)
2. **Acceptance criteria** (flat list, specific, testable)
3. **State model** (what states exist, transitions between them)
4. **Visual spec** (exact material/color/opacity for each state)
5. **Conflict map** (what this feature disables/enables in other features)

Then implement following `CLAUDE.md` architecture rules.
