### Product Brief · v1.0 · Draft

## 01 · Executive Summary

Searchset Management is a new feature within Procore's BIM Tool that enables BIM Managers and Project Managers to create, organize, and govern search sets (collections of model elements that match defined criteria) across a project. It introduces a structured, Admin-controlled library of search sets — replacing the current ad-hoc, per-user approach — ensuring the right elements are always discoverable, reusable, and properly scoped for all project team members.

## 02 · Problem Statement

In current BIM workflows using tools like **Navisworks** and **Revizto**, search sets are often created by individual users and stored locally or in personal workspaces. This leads to several compounding issues on large projects:

 Problem | Description |

 --- | --- |

 **Fragmented Search Sets**   | Searches are scattered across individual users with no shared, team-level repository.  |

 **Rampant Duplication**   | Multiple users independently recreate the same searches, wasting effort and causing inconsistency.  |

 **No Governance Layer**   | There is no Admin-level control over which search sets are project-canonical vs. personal experiments.  |

## 03 · Target Users

### 🏗️ BIM Manager — Primary

The BIM Manager is the primary owner and curator of the project's search set library.

**Needs:**

* Organize and maintain a clean, project-level library of search sets

* Control which search sets are Public (visible to all) vs. Private

* Import and curate search sets auto-ingested from NWD files

* Duplicate and iterate on search sets without creating clutter

* Monitor usage analytics to identify high-value vs. stale sets

### 📊 Project Manager — Secondary

The Project Manager consumes and runs search sets relevant to their project scope.

**Needs:**

* Quickly access saved, Public search sets relevant to their scope

* Run searches without needing to build them from scratch

* Rely on Admin-curated sets to ensure they're viewing the correct model elements

## 04 · Goals & Success Metrics

Success will be measured along three dimensions — adoption, quality, and governance — tracked over the first 90 days post-release.

 Metric | Target | Rationale |

 --- | --- | --- |

 **Shared Search Set Reuse Rate**   | ≥ 40% of search runs use a Public (Admin-curated) set  | Indicates teams are trusting and relying on centrally managed sets vs. creating their own.  |

 **Duplicate Search Set Reduction**   | ≤ 10% duplicate sets within a project's library  | Measures the effectiveness of Admin governance in keeping the library clean.  |

 **Admin Curation Activity**   | ≥ 1 Admin actively promotes/publishes sets per active project  | Confirms Admins are actively managing and growing the public library over the project lifecycle.  |

 **NWD Auto-Import Utilisation**   | ≥ 40% of imported NWD sets reviewed & actioned by Admin within 7 days  | Validates that the auto-import pipeline is surfacing value and not creating passive clutter.  |

 **Search Set Analytics Engagement**   | ≥ 50% of BIM Managers view analytics at least once per sprint  | Measures whether Admins are using data to prune stale sets and promote high-value ones.  |

## 05 · Feature Scope

> All items below are targeted for a **single Q2 2026 release**.

 Feature / Capability | Status | Notes |

 --- | --- | --- |

 Create, Rename, Delete Search Sets  | ✅ In Scope  | Core CRUD operations  |

 Organize Search Sets into Folders  | ✅ In Scope  | Folder CRUD + drag-and-drop hierarchy  |

 Private / Public Visibility Toggle (Admin)  | ✅ In Scope  | Admin-only action; sets start as Private  |

 Bulk Select & Bulk Actions  | ✅ In Scope  | Bulk delete, bulk move, bulk visibility change  |

 Run Search from Search Set  | ✅ In Scope  | Executes the search and surfaces matching elements  |

 Copy / Duplicate Search Set  | ✅ In Scope  | Creates a Private copy; user can rename & edit  |

 Search Set Analytics  | ✅ In Scope  | Usage counts, last-run date, creator attribution  |

 NWD Auto-Import of Search Sets  | ✅ In Scope  | Triggers on NWD processing; sets tagged as 'Navis'; default Private  |

 Source Tagging (e.g., 'Navis')  | ✅ In Scope  | Source stored as a property on the search set schema  |

 Role-Based Access (Admin vs. Member)  | ✅ In Scope  | Leverages Procore's existing permission system  |

 Search Constructor / Query Builder  | ❌ Out of Scope  | Separate Product Brief; out of scope for Q2 2026  |

 Share Search Set with Specific User  | ❌ Out of Scope  | Deferred; Public/Private toggle covers initial need  |

 Version History of Search Sets  | ❌ Out of Scope  | Deferred to a future release  |

 Export Search Sets back to NWD Format  | ❌ Out of Scope  | Under consideration; deferred post-Q2  |

## 06 · Key Features & Functionality

### 🗂️ Search Set Library

A centralized panel within the BIM Viewer that displays all search sets accessible to the current user. Supports folder-based organization, expand/collapse tree navigation, and quick-search filtering.

* Tree view with folder nesting

* Inline rename on double-click

* Empty state with "Create First Search Set" CTA

### 🔐 Private / Public Governance

Every search set defaults to **Private** on creation. Only Admins can promote a set to **Public**, making it visible to all project members. This ensures only validated, project-relevant sets are broadly accessible.

* 🔒 Lock icon indicates Private sets

* 🌐 Globe icon indicates Public sets

* Admin toggle available in search set row actions

### 📥 NWD Auto-Import Pipeline

When a Navisworks NWD file is processed in Procore, embedded search sets are automatically ingested into the library. Imported sets are tagged with a **'Navis'** source badge and remain Private until reviewed and promoted by an Admin.

* Source property: `{ "source": "navisworks" }`

* 'Navis' badge displayed on set row

* Admin inbox/review queue for imported sets

### ☑️ Bulk Actions

Users can multi-select search sets and folders to perform batch operations — reducing the overhead of managing large libraries.

* Bulk delete with confirmation dialog

* Bulk move to folder

* Bulk visibility toggle *(Admin only)*

### 📋 Copy / Duplicate

Any search set can be duplicated, creating a Private copy prefixed with *"Copy of…"*. This allows users to iterate on existing sets without risk of modifying the canonical version.

* Duplicate from row action menu

* Copy defaults to Private

* Appears in same folder as original

### 📈 Search Set Analytics

Admins can view usage data for each search set to identify high-value sets (frequently run) and stale sets (never or rarely used), enabling data-driven library curation.

* Run count per set

* Last run timestamp

* Created by / source attribution

## 07 · Integration & Technical Context

### Source Tool Compatibility

 Tool | Import Method | Source Tag |

 --- | --- | --- |

 **Navisworks (NWD)**   | Auto-import on NWD processing  | `source: "navisworks"`   |

 **Revizto**   | --- | `--` |

### Search Set Schema (Core Properties)

```json

{

  "id": "uuid",

  "name": "string",

  "source": "navisworks | manual | duplicated",

  "visibility": "private | public",

  "folderId": "uuid | null",

  "createdBy": "userId",

  "createdAt": "ISO8601",

  "lastRunAt": "ISO8601 | null",

  "runCount": "integer",

  "criteria": "SearchConstructorPayload (future)"

}