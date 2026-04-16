# Permissions — Q2 2026 Requirements

## Overview

**Type:** Newly developed functionality

A new permissions framework for Model Manager that defines two user roles with tool-level access and granular feature-level permissions. The system controls what users can do across all features, from full administrative control to view-only access.

---

## Role Definitions

| Role          | Description                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**     | Full control across all features. Can create, edit, delete, and manage all content. Can manage other users' content and assign permissions. |
| **Read Only** | View-only access. Can see and navigate content but cannot create, edit, or delete anything.                                                  |

**Key Principles:**

- Both roles have access to all features — the difference is the level of interaction permitted
- Users have tool-level access (they can access Model Manager) with granular per-feature permissions
- Permission assignment model (per user vs. per group) is TBD
- Authentication is fully internal to Model Manager

---

## Q2 Scope Summary

| #   | Sub-Feature                     | Priority     | Q2 Status |
| --- | ------------------------------- | ------------ | --------- |
| 1   | Admin and Read Only Permissions | High         | In Scope  |

---

## Permission Matrix — Q2 Features

### 2D Overlay

| Action                             | Admin | Read Only |
| ---------------------------------- | ----- | --------- |
| View overlays                      | Yes   | Yes       |
| Switch between levels (Multilevel) | Yes   | Yes       |
| Navigate elevation mappings        | Yes   | Yes       |
| Create / upload overlays           | Yes   | No        |
| Edit / update overlays             | Yes   | No        |
| Delete overlays                    | Yes   | No        |
| Map elevations to 3D sections      | Yes   | No        |
| Bulk actions on overlays           | Yes   | No        |
| Manage overlay permissions         | Yes   | No        |

### Model Views / Viewpoints

| Action                            | Admin | Read Only |
| --------------------------------- | ----- | --------- |
| View saved viewpoints             | Yes   | Yes       |
| Navigate folder structure         | Yes   | Yes       |
| Open shared view links            | Yes   | Yes       |
| Create viewpoints                 | Yes   | No        |
| Save viewpoints with markups      | Yes   | No        |
| Edit / update viewpoints          | Yes   | No        |
| Delete viewpoints                 | Yes   | No        |
| Create / manage folders           | Yes   | No        |
| Share views (generate link)       | Yes   | No        |
| Set views as public / private     | Yes   | No        |
| Import viewpoints from Navisworks | Yes   | No        |
| Bulk actions on views             | Yes   | No        |
| Manage view permissions           | Yes   | No        |

### Federation

| Action                         | Admin | Read Only |
| ------------------------------ | ----- | --------- |
| View federated scenes          | Yes   | Yes       |
| Navigate federated models      | Yes   | Yes       |
| Hide / show temp elements      | Yes   | Yes       |
| Create federated scenes        | Yes   | No        |
| Add / remove models from scene | Yes   | No        |
| Delete federated scenes        | Yes   | No        |
| View version history           | Yes   | Yes       |
| Rollback to previous version   | Yes   | No        |
| Manage federation permissions  | Yes   | No        |

### Searchsets

| Action                           | Admin | Read Only |
| -------------------------------- | ----- | --------- |
| View / browse search sets        | Yes   | Yes       |
| Run existing search sets         | Yes   | Yes       |
| Create search sets (Constructor) | Yes   | No        |
| Edit / update search sets        | Yes   | No        |
| Delete search sets               | Yes   | No        |
| Import search sets               | Yes   | No        |
| Set search as public / private   | Yes   | No        |
| Manage searchset permissions     | Yes   | No        |

### Mobile

| Action                         | Admin | Read Only |
| ------------------------------ | ----- | --------- |
| Access mobile app              | Yes   | Yes       |
| View models on mobile          | Yes   | Yes       |
| Download model for offline use | Yes   | No        |

---

## Sub-Feature Requirements

### 1. Admin and Read Only Permissions (High)

**Summary:** Establish the core two-role permission framework (Admin, Read Only) that applies across all Model Manager features. This is the foundational system that all feature-level permissions build upon.

**Key Requirements:**

- Two roles implemented: Admin, Read Only
- Role assignment at the tool level with granular feature-level overrides
- **Admin capabilities:**
  - Full CRUD on all content across all features
  - Assign and revoke roles for other users
  - Configure default permissions for new content
  - View an audit log of permission changes
  - Manage other users' content (edit, delete)
- **Read Only capabilities:**
  - View-only access to all content
  - Cannot create, edit, or delete any content
- At least one Admin must exist per project (cannot remove the last Admin)
- Permission model is extensible to new features without architecture changes

**Acceptance Criteria:**

- [ ] An Admin can assign roles to users across all features
- [ ] A Read Only user can view all content but cannot perform any create/edit/delete action
- [ ] Changing a user's role immediately updates their available actions
- [ ] The permission framework supports adding new features without code changes to the permission engine
- [ ] Attempting a restricted action shows a clear "insufficient permissions" message

---

## Cross-Feature Dependencies

The Permissions system is foundational and connects to permission-related sub-features across all functionalities:

| Feature        | Dependency                                        |
| -------------- | ------------------------------------------------- |
| 2D Overlay     | Overlay-specific Admin/Read Only behavior         |
| Model Views    | View-specific Admin/Read Only behavior            |
| Searchsets     | Searchset-specific Admin/Read Only behavior       |
| Mobile         | Mobile-specific Admin/Read Only behavior          |

---

## Open Questions

| Question                  | Context                                                                                                      | Status |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| Assignment model          | Should permissions be assigned per individual user, per user group, or both?                                 | TBD    |
| Default role              | What is the default role for a new user added to a project? (Admin or Read Only?)                            | TBD    |
| Feature-level overrides   | Can an Admin override a user's general role for specific features? (e.g., Admin overall, but Read Only for a specific feature) | TBD    |

---

## Out of Scope for Q2

| Feature                            | Reason / Notes                          | Target    |
| ---------------------------------- | --------------------------------------- | --------- |
| PDM Permissions to Federated Scene | Deferred to future quarter              | TBD       |
| Standard (mid-tier) role           | Simplified to two-role model for Q2     | TBD       |

---

*Document Version: 1.0*
*Last Updated: 2026-03-18*
