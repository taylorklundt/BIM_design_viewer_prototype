# Cross-Feature Dependencies — Q2 2026

## Overview

This document captures dependencies between features across different functionality areas. These are not standalone features — they describe relationships where one feature requires or benefits from another being built first or in parallel.

## Dependency Map

### 1. Save Viewpoint with Search Sets (High — Orange)

**Dependency:** Model Views ↔ Searchsets

When a user saves a viewpoint, it should be possible to associate one or more search sets with that viewpoint. Loading the viewpoint would then also apply the associated search set filters.

- **Requires:** Model Views (viewpoint saving) + Searchsets (search set creation/management)
- **Impact:** Both features must support linking/referencing the other's data

---

### 2. Markups Save in a Viewpoint (High — Orange)

**Dependency:** Model Views ↔ Markups

Markup annotations should persist when saved as part of a viewpoint. This is already captured as "Save with Markups" under Model Views.

- **Requires:** Model Views (viewpoint saving) + Markup system
- **Impact:** Markup data format must be compatible with viewpoint storage

---

### 3. Create Viewpoints with Search Sets (High — Orange)

**Dependency:** Model Views ↔ Searchsets

Users should be able to create new viewpoints that include search set criteria. When the viewpoint is loaded, the search set is automatically applied.

- **Requires:** Model Views (viewpoint creation) + Searchsets (search set system)
- **Impact:** Viewpoint creation UI needs a "attach search set" option

---

### 4. Import Revit Sheets (Low — Green)

**Dependency:** 2D Overlay ↔ External Data (Revit)

Related to the "Premapped Revit Sheets" exploration in 2D Overlay. Importing Revit sheets as 2D overlays depends on the Revit integration pipeline.

- **Requires:** 2D Overlay system + Revit file parsing capability
- **Impact:** Informs the Premapped Revit Sheets technical exploration

---

### 5. Draggable Windows (Medium — Yellow)

**Dependency:** UI Framework

Ability to drag, resize, and reposition UI panels/windows within the application. Affects multiple feature areas that use panels (2D Overlay panel, Model Views panel, Searchset panel, etc.).

- **Requires:** UI framework update to support draggable/dockable panels
- **Impact:** Improves usability across all feature panels

---

## Sequencing Recommendations

Based on the dependencies above, the following build order is recommended:

1. **Searchsets** (Search Constructor, Search Management) — needed before viewpoint-searchset linking
2. **Model Views** (Viewpoint saving, Markup saving) — needed before cross-feature linking
3. **Viewpoint + Searchset integration** — after both systems are stable
4. **Permissions framework** — can be developed in parallel, applied to all features once ready
5. **UI improvements** (Header UI, Draggable Windows) — can run independently
