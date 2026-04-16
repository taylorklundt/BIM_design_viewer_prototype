# Permissions — Q2 2026 Requirements

## Overview

**Type:** Newly developed functionality

A new permissions framework for Model Manager that defines three user roles with tool-level access and granular feature-level permissions. The system controls what users can do across all features, from full administrative control to view-only access.

## Role Definitions


| Role         | Description                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**    | Full control across all features. Can create, edit, delete, and manage all content. Can manage other users' content and assign permissions. |
| **Standard** | Can use and create content within features. Can edit own content. Can view all content created by others.                                   |
| **None**     | View-only access. Can see and navigate content but cannot create, edit, or delete anything.                                                 |


**Key Principles:**

- All three roles have access to all features — the difference is the level of interaction permitted
- Users have tool-level access (they can access Model Manager) with granular per-feature permissions
- Permission assignment model (per user vs. per group) is TBD
- Authentication is fully internal to Model Manager

## Scope Summary


| #   | Sub-Feature                        | Priority (Cell Color) | Q2 Status |
| --- | ---------------------------------- | --------------------- | --------- |
| 1   | PDM Permissions to Federated Scene | Medium (Yellow)       | In Scope  |
| 2   | Admin and Non-Admin Permissions    | High (Orange)         | In Scope  |


---

## Permission Matrix — Q2 Features

### 2D Overlay


| Action                             | Admin | Standard | None |
| ---------------------------------- | ----- | -------- | ---- |
| View overlays                      | Yes   | Yes      | Yes  |
| Switch between levels (Multilevel) | Yes   | Yes      | Yes  |
| Navigate elevation mappings        | Yes   | Yes      | Yes  |
| Create / upload overlays           | Yes   | Yes      | No   |
| Edit / update overlays             | Yes   | Own only | No   |
| Delete overlays                    | Yes   | Own only | No   |
| Map elevations to 3D sections      | Yes   | Yes      | No   |
| Bulk actions on overlays           | Yes   | Own only | No   |
| Manage overlay permissions         | Yes   | No       | No   |


### Model Views / Viewpoints


| Action                            | Admin | Standard | None |
| --------------------------------- | ----- | -------- | ---- |
| View saved viewpoints             | Yes   | Yes      | Yes  |
| Navigate folder structure         | Yes   | Yes      | Yes  |
| Open shared view links            | Yes   | Yes      | Yes  |
| Create viewpoints                 | Yes   | Yes      | No   |
| Save viewpoints with markups      | Yes   | Yes      | No   |
| Edit / update viewpoints          | Yes   | Own only | No   |
| Delete viewpoints                 | Yes   | Own only | No   |
| Create / manage folders           | Yes   | Yes      | No   |
| Share views (generate link)       | Yes   | Yes      | No   |
| Set views as public / private     | Yes   | Own only | No   |
| Import viewpoints from Navisworks | Yes   | No       | No   |
| Bulk actions on views             | Yes   | Own only | No   |
| Manage view permissions           | Yes   | No       | No   |


### Federation


| Action                         | Admin | Standard | None |
| ------------------------------ | ----- | -------- | ---- |
| View federated scenes          | Yes   | Yes      | Yes  |
| Navigate federated models      | Yes   | Yes      | Yes  |
| Hide / show temp elements      | Yes   | Yes      | Yes  |
| Create federated scenes        | Yes   | Yes      | No   |
| Add / remove models from scene | Yes   | Own only | No   |
| Delete federated scenes        | Yes   | Own only | No   |
| View version history           | Yes   | Yes      | Yes  |
| Rollback to previous version   | Yes   | No       | No   |
| Manage federation permissions  | Yes   | No       | No   |


### Searchsets


| Action                           | Admin | Standard | None |
| -------------------------------- | ----- | -------- | ---- |
| View / browse search sets        | Yes   | Yes      | Yes  |
| Run existing search sets         | Yes   | Yes      | Yes  |
| Create search sets (Constructor) | Yes   | Yes      | No   |
| Edit / update search sets        | Yes   | Own only | No   |
| Delete search sets               | Yes   | Own only | No   |
| Import search sets               | Yes   | Yes      | No   |
| Set search as public / private   | Yes   | Own only | No   |
| Manage searchset permissions     | Yes   | No       | No   |


### Mobile


| Action                         | Admin | Standard | None |
| ------------------------------ | ----- | -------- | ---- |
| Access mobile app              | Yes   | Yes      | Yes  |
| View models on mobile          | Yes   | Yes      | Yes  |
| Download model for offline use | Yes   | Yes      | No   |


---

## Sub-Feature Requirements

### 1. PDM Permissions to Federated Scene (Medium)

**Summary:** Extend the permissions system to control who can create, modify, and view federated scenes. This maps the Admin / Standard / None roles specifically to federation actions.

**Key Requirements:**

- Apply the three-role model (Admin, Standard, None) to federated scene operations
- Admin can create, modify, delete any federated scene and manage permissions
- Standard can create new scenes and modify their own, view all others
- None can view and navigate all federated scenes but not alter them
- Permission changes take effect immediately without session restart

**Acceptance Criteria:**

- A None-role user can open and navigate a federated scene but cannot add/remove models
- A Standard user can create a new federated scene and modify it
- An Admin can modify any user's federated scene and change permission assignments
- Attempting a restricted action shows a clear "insufficient permissions" message

---

### 2. Admin and Non-Admin Permissions (High)

**Summary:** Establish the core three-role permission framework (Admin, Standard, None) that applies across all Model Manager features. This is the foundational system that all feature-level permissions build upon.

**Key Requirements:**

- Three roles implemented: Admin, Standard, None
- Role assignment at the tool level with granular feature-level overrides
- Admin capabilities:
  - Full CRUD on all content across all features
  - Assign and revoke roles for other users
  - Configure default permissions for new content
  - View an audit log of permission changes
  - Manage other users' content (edit, delete)
- Standard capabilities:
  - Create content within features
  - Edit and delete own content only
  - View all content (own and others')
- None capabilities:
  - View-only access to all content
  - Cannot create, edit, or delete any content
- At least one Admin must exist per project (cannot remove the last Admin)
- Permission model is extensible to new features without architecture changes

**Acceptance Criteria:**

- An Admin can assign roles to users across all features
- A Standard user can create content in any feature but can only edit/delete their own
- A None user can view all content but cannot perform any create/edit/delete action
- Changing a user's role immediately updates their available actions
- The permission framework supports adding new features without code changes to the permission engine

---

## Cross-Feature Dependencies

The Permissions system is foundational and connects to permission-related sub-features across all functionalities:

- **2D Overlay → Permissions**: Overlay-specific Admin/Standard/None behavior
- **Model Views → Permissions**: View-specific Admin/Standard/None behavior
- **Federation → Permissions**: Federated scene permissions (PDM Permissions above)
- **Searchsets → Permissions**: Searchset-specific Admin/Standard/None behavior

---

## Open Questions

- **Assignment model**: Should permissions be assigned per individual user, per user group, or both? (TBD)
- **Default role**: What is the default role for a new user added to a project? (Standard or None?)
- **Feature-level overrides**: Can an Admin override a user's general role for specific features? (e.g., Standard overall, but None for Federation)

