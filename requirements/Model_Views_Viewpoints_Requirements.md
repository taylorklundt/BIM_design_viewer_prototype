# Model Views / Viewpoints — Q2 2026 Requirements

## Overview

**Type:** Enhancement to existing functionality

Enhancements to the existing Model Views and Viewpoints system in Model Manager. This quarter focuses on hierarchical view organization, bulk operations, shareable view links, markup persistence, and access control.

## Scope Summary


| #   | Sub-Feature                 | Priority (Cell Color) | Q2 Status |
| --- | --------------------------- | --------------------- | --------- |
| 1   | Multilevel Folder           | High (Orange)         | In Scope  |
| 2   | Bulk Actions                | Low (Green)           | In Scope  |
| 3   | Share Views                 | Medium (Yellow)       | In Scope  |
| 4   | Save with Markups           | High (Orange)         | In Scope  |
| 5   | Permissions                 | High (Orange)         | In Scope  |
| 6   | Public / Private Views      | Medium (Yellow)       | In Scope  |
| 7   | Auto Import from Navisworks | High (Orange)         | In Scope  |


---

## Sub-Feature Requirements

### 1. Multilevel Folder (High)

**Summary:** Introduce a nested folder structure for organizing saved model views, enabling users to group and navigate views hierarchically like a file explorer.

**Current State:** Views are stored in a flat list with no folder grouping.

**Key Requirements:**

- Users can create folders and sub-folders to organize saved views
- Drag-and-drop support for moving views between folders
- Folder tree navigation with expand/collapse behavior
- Right-click context menu for folder operations (rename, delete, move)
- Views can exist at the root level or inside any folder
- Folder structure persists across sessions and is visible to all users with access

**Acceptance Criteria:**

- User can create a folder, create a sub-folder inside it, and move views into both
- Folder tree renders correctly with proper nesting indentation
- Deleting a folder prompts for confirmation and handles child items (move to root or delete)

---

### 2. Bulk Actions (Low)

**Summary:** Enable batch operations on multiple views simultaneously.

**Current State:** View management operations are performed individually.

**Key Requirements:**

- Multi-select capability (shift-click, ctrl-click, select all)
- Bulk delete with confirmation prompt
- Bulk move to a folder
- Bulk export of selected views
- Undo support for bulk operations

**Acceptance Criteria:**

- User can select multiple views and move them to a folder in a single action
- Bulk delete removes all selected views after one confirmation
- Multi-select works correctly across different folder levels

---

### 3. Share Views (Medium)

**Summary:** Allow users to generate a shareable link for any saved view by clicking a share button, enabling team members to open the exact same view state.

**Current State:** Views cannot be shared directly; users must verbally communicate camera positions or recreate views manually.

**Key Requirements:**

- Share button accessible from each view's context menu or view details panel
- Generated link restores the full view state: camera position, element visibility, and any associated settings
- Link should be copyable to clipboard with one click
- Shared links should work for any team member with project access
- Links should remain valid as long as the source view exists

**Acceptance Criteria:**

- Clicking "Share" on a view generates a unique URL
- Opening the URL in another session restores the same camera position and visibility state
- Link works for team members with appropriate project access permissions

---

### 4. Save with Markups (High)

**Summary:** Allow markup annotations (redlines, callouts, text notes, measurements) to be saved as part of a viewpoint, so they are restored when the view is loaded.

**Key Requirements:**

- When saving a viewpoint, any active markups are captured and stored with the view
- Loading a saved view restores all associated markups in their original state
- Markups remain editable after loading (not flattened to a snapshot)
- Users can choose to save with or without markups when creating/updating a view
- Markup data is lightweight and does not significantly impact view load times

**Acceptance Criteria:**

- User creates markups, saves a view → reloading the view restores all markups
- Markups are editable after being restored from a saved view
- Saving a view without markups does not carry over any existing annotations

---

### 5. Permissions (High)

**Summary:** Introduce role-based access control for model views, allowing administrators to manage who can create, edit, delete, and view saved viewpoints.

**Key Requirements:**

- Permission levels: View Only, Edit, and Admin
- Permissions can be set per view or per folder
- Permission inheritance from parent folders (with ability to override at view level)
- Integration with the broader Model Manager permissions system
- Permission changes take effect immediately

**Acceptance Criteria:**

- A View Only user cannot modify or delete a viewpoint
- An admin can grant/revoke permissions for other users on specific views
- Folder-level permissions correctly cascade to child views

---

### 6. Public / Private Views (Medium)

**Summary:** Allow users to mark views as public (visible to all project members) or private (visible only to the creator).

**Key Requirements:**

- Toggle between public and private on any saved view
- Private views are hidden from other users' view lists
- Default visibility setting (public or private) is configurable
- Bulk visibility change for multiple views

**Acceptance Criteria:**

- A view marked as private is not visible to other project members
- Changing a view from private to public makes it immediately visible to the team
- View creator always has access regardless of visibility setting

---

### 7. Auto Import from Navisworks (High)

**Summary:** Automatically import saved viewpoints from Autodesk Navisworks when a Navisworks model is loaded into Model Manager.

**Key Requirements:**

- Detect and extract saved viewpoints from Navisworks (.nwd/.nwf) files on import
- Map Navisworks viewpoint properties (camera position, section planes, visibility overrides) to Model Manager view format
- Allow users to review and selectively import viewpoints
- Preserve viewpoint names and folder structure from Navisworks
- Handle edge cases: viewpoints referencing missing elements, incompatible section types

**Acceptance Criteria:**

- Importing a Navisworks file with saved viewpoints presents a list of available viewpoints to import
- Imported viewpoints correctly reproduce the camera position from Navisworks
- Users can choose which viewpoints to import (select all / select individual)

