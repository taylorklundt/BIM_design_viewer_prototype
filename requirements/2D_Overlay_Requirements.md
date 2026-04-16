# 2D Overlay — Q2 2026 Requirements

## Overview

**Type:** Enhancement to existing functionality

Enhancements to the existing 2D Overlay system in Model Manager. This quarter focuses on improving multi-floor support, linking elevation drawings to 3D views, enabling bulk operations, and introducing access control for overlays.

## Scope Summary

| # | Sub-Feature | Priority (Cell Color) | Q2 Status |
|---|------------|----------------------|-----------|
| 1 | Multilevel | Critical (Red) | In Scope |
| 2 | Elevation Mapping | Medium (Yellow) | In Scope |
| 3 | Bulk Actions | Low (Green) | In Scope |
| 4 | Permissions | High (Orange) | In Scope |
| 5 | Premapped Revit Sheets | Low (Green) | Technical Exploration Only |

---

## Sub-Feature Requirements

### 1. Multilevel (Critical)

**Summary:** Enable users to view and manage 2D overlays across multiple building levels/floors, with the ability to switch between them.

**Current State:** 2D Overlay currently supports single-level viewing. Users cannot navigate between floors within the overlay context.

**Key Requirements:**

- Users can select and switch between building levels/floors within the 2D Overlay panel
- Each level displays its corresponding 2D sheet(s) as overlays
- Level switching should preserve the user's current zoom and pan state where applicable
- The active level should be clearly indicated in the UI
- Level order should reflect the logical building structure (e.g., basement → ground → upper floors)

**Acceptance Criteria:**

- User can view 2D overlays for at least 2 different building levels in a single session
- Switching levels loads the correct overlay sheet(s) without requiring a full page reload
- Level selection state persists within the current session

---

### 2. Elevation Mapping (Medium)

**Summary:** Link 2D elevation drawing sheets to their corresponding views/sections in the 3D model, enabling users to navigate between 2D elevations and 3D context.

**Current State:** 2D elevation sheets exist independently of the 3D model with no automated linking.

**Key Requirements:**

- Users can map a 2D elevation sheet to a specific section/view in the 3D model
- Clicking on a mapped elevation should orient the 3D view to the corresponding section cut
- Mapping should support standard elevation types (front, rear, left, right, and custom sections)
- The system should provide a visual indicator showing which elevations are mapped vs. unmapped

**Acceptance Criteria:**

- A 2D elevation sheet can be linked to a 3D section view
- Navigation from 2D elevation to 3D section cut positions the camera correctly
- Mapped elevations are visually distinguished from unmapped ones

---

### 3. Bulk Actions (Low)

**Summary:** Allow users to perform operations on multiple 2D overlays simultaneously, reducing repetitive manual actions.

**Current State:** Overlay operations (show/hide, delete, reorder, etc.) are performed one at a time.

**Key Requirements:**

- Multi-select capability in the overlay list (shift-click range, ctrl-click individual, select all)
- Bulk visibility toggling (show/hide multiple overlays at once)
- Bulk CRUD operations: delete, move, and reorder multiple overlays
- Bulk export of selected overlays
- Bulk permission assignment (once Permissions feature is available)
- Undo support for bulk operations

**Acceptance Criteria:**

- User can select 3+ overlays and toggle visibility in a single action
- User can delete multiple selected overlays with a single confirmation prompt
- Bulk operations complete without requiring page refresh

---

### 4. Permissions (High)

**Summary:** Introduce access control for 2D overlays, allowing project administrators to manage who can view, edit, and manage overlays.

**Key Requirements:**

- Role-based access: define who can create, edit, delete, and view overlays
- Permission levels: View Only, Edit, and Admin
- Permissions can be applied per overlay or at the overlay collection level
- Permission changes take effect immediately without requiring a session restart
- Integration with the broader Model Manager permissions system

**Acceptance Criteria:**

- A user with View Only permission cannot modify or delete an overlay
- An admin can change permissions for other users on a specific overlay
- Permission restrictions are enforced consistently across all overlay actions (UI and API)

---

### 5. Premapped Revit Sheets (Low — Technical Exploration)

**Summary:** Investigate the feasibility of automatically pre-mapping Revit sheets to the appropriate building levels and sections when a Revit model is imported.

**Status:** Technical exploration only — no deliverable expected in Q2. Findings will inform Q3 planning.

**Exploration Goals:**

- Assess whether Revit sheet metadata (level, view type, section reference) is sufficient for auto-mapping
- Prototype a mapping algorithm and evaluate accuracy
- Identify edge cases (custom views, non-standard naming conventions, linked models)
- Document technical approach and estimated effort for full implementation

---

## Design Notes

> In the 2D Views Panel, when clicking to "view" an overlay, the system will apply a section cut but **not change the camera** until user feedback is collected. This is a deliberate UX decision pending validation.
