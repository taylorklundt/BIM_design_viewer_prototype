# Federation — Q2 2026 Requirements

## Overview

**Type:** Enhancement to existing functionality

Enhancements to the existing Federation system in Model Manager. This quarter focuses on cleaning up the project view by hiding temporary/transient elements, exploring multi-scene support, access control for federated models, and version tracking.

## Scope Summary


| #   | Sub-Feature                        | Priority (Cell Color) | Q2 Status              |
| --- | ---------------------------------- | --------------------- | ---------------------- |
| 1   | Hide Temp Elements in Project View | Medium (Yellow)       | In Scope               |
| 2   | Multiple Federated Scenes          | Low (Green)           | In Scope (Exploratory) |
| 3   | Permissions                        | High (Orange)         | In Scope               |
| 4   | Versioning                         | Low (Green)           | In Scope               |


---

## Sub-Feature Requirements

### 1. Hide Temp Elements in Project View (Medium)

**Summary:** Allow users to hide temporary, transient, or federation-generated elements from the Project View, reducing visual clutter and improving navigation.

**Current State:** All elements — including temporary construction objects, federation artifacts, and user-hidden elements — appear in the Project View tree, making it difficult to focus on relevant model content.

**Key Requirements:**

- Users can mark elements as "temporary" and hide them from the Project View panel
- Support for hiding different categories of temp elements:
  - Construction/temporary objects (scaffolding, shoring, formwork, etc.)
  - Federation-generated artifacts (duplicates, clash markers, alignment helpers)
  - User-isolated/hidden elements that should not appear in the tree
- Bulk hide/show for temp element categories
- A filter or toggle in the Project View to show/hide all temp elements at once
- Hidden elements should remain accessible via search or a dedicated "hidden elements" view

**Acceptance Criteria:**

- User can mark one or more elements as temporary and they disappear from the Project View tree
- A toggle in the Project View re-shows all hidden temp elements when needed
- Hiding temp elements does not affect model data — only the Project View display

---

### 2. Multiple Federated Scenes (Low — Exploratory)

**Summary:** Enable the creation of multiple federated scene configurations, allowing different combinations of models to be grouped for different purposes.

**Current State:** A single federated scene is supported per project.

**Note:** This feature is still under definition. The exact scope and implementation approach will be refined during Q2.

**High-Level Goals:**

- Allow users to create and save multiple federated scene configurations within a project
- Each scene can contain a different subset of models
- Users can switch between scenes without re-federating
- Investigate use cases: structural review, MEP coordination, full model, etc.

**Acceptance Criteria (Preliminary):**

- User can create at least 2 separate federated scenes in a single project
- Switching between scenes loads the correct model combination
- Scenes are named and manageable from a central list

---

### 3. Permissions (High)

**Summary:** Introduce access control for federated scenes, allowing administrators to manage who can create, modify, and view federated models.

**Key Requirements:**

- Role-based access: define who can create, modify, delete, and view federated scenes
- Permission levels: View Only, Edit, and Admin
- Permissions apply at the federated scene level
- Integration with the broader Model Manager permissions system
- Permission changes take effect immediately

**Acceptance Criteria:**

- A View Only user can open and navigate a federated scene but cannot add/remove models or change settings
- An admin can assign/revoke permissions for other users on a specific federated scene
- Permission restrictions are enforced consistently across UI and API

---

### 4. Versioning (Low)

**Summary:** Track versions of the overall federated scene — recording which models, at what versions, were combined at any given point.

**Key Requirements:**

- Each federation action (add model, remove model, update model version) creates a version record
- Users can view the version history of a federated scene
- Version history shows: timestamp, user, action taken, and model versions included
- Users can compare the current scene to a previous version
- Ability to restore a previous federation state (rollback)

**Acceptance Criteria:**

- Modifying a federated scene creates a new version entry in the history
- User can view the full version history with timestamps and actions
- User can roll back to a previous version and the correct model combination is restored

