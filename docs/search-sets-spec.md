# Search Sets — V1 Feature Specification

## Context

This document captures the product decisions and technical requirements for the Search Sets feature in the 3D IFC Model Viewer. It was derived from a discovery conversation between a product owner, a BIM coordinator perspective, and a VP of Product perspective.

The viewer is a web-based 3D IFC Model Viewer built with Three.js, web-ifc, and @thatopen/components. It follows a plugin architecture where features are standalone classes in `src/features/` with `constructor(sceneManager)`, `enable()`, `disable()`, `destroy()`, and an event system (`on/off/emit`). There is a "God Object" rule: `src/core/ModelViewer.js` must NOT be modified unless explicitly asked.

---

## What is Search Sets?

Search Sets allows users to build, save, and re-execute structured queries against the loaded IFC model. When a search set is executed, it selects all matching elements in the 3D view. The core value is **persistence and repeatability** — the coordinator builds a search once, saves it, and every time they open it, it re-evaluates against the current model state and gives a fresh, reliable element list. The saved query becomes the source of truth, not a one-time filter result.

This is distinct from the Object Tree's `filterTree` which is a quick-find by name. Search Sets searches by **structured properties** (category, property sets, materials, IFC types) and **saves those queries for reuse**.

---

## V1 Scope

### In Scope

- Search Constructor (query builder UI)
- Search execution with 3D element selection
- Save / Edit / Delete search sets
- All search sets shared/visible to all users (no private-only sets)
- Within / Excluding toggle (built-in invert)
- AND/OR compound conditions with nested groups
- Integration with existing Selection feature

### Out of Scope (V2+)

- Search Groups (combining multiple search sets — document in spec, defer implementation)
- Viewpoint ↔ Search Set relationship (open discovery question — see below)
- Public/Private permissions with user identity
- Export/Import of search set definitions
- Numeric range operators (greater than, less than)
- Backend API integration (V1 uses localStorage mock)
- Search Manager panel (to be specced separately)

### Open Discovery Items

- **Viewpoint ↔ Search Set relationship**: When a user saves a viewpoint after running a search set, should the search set own the viewpoint reference, or should the viewpoint own the search set reference? The Navisworks model has the viewpoint reference a search set by ID (Scenario A — re-evaluates the query on recall). The product owner is leaning toward the search set holding the viewpoint reference, but needs more user discovery. **For V1: search sets are standalone query definitions with no viewpoint coupling.** The viewpoint feature (assumed already built) can integrate later.
- **Nesting depth limit**: Should condition group nesting be capped (e.g., 3 levels deep) or unlimited? To be decided during implementation/testing.

---

## Feature Details

### 1. Search Constructor (Query Builder)

The Search Builder is a **visual form-based constructor** (not text-based). It opens as a panel when the user creates or edits a search set.

#### 1.1 Data Set Scope

At the top of the builder, the user selects the search scope:


| Option                   | Description                                                                                                                       | V1 Status                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Entire Model**         | Search all elements in the loaded model                                                                                           | Yes                          |
| **Current Selection**    | Search only within currently selected elements                                                                                    | Yes                          |
| **Applied Section Box**  | Search elements visible within the active section cut (visually clipped — any element partially inside the section box qualifies) | Yes                          |
| Object Tree              | Search within a specific subtree                                                                                                  | Defer                        |
| Search Groups            | Search within combined search set results                                                                                         | Defer (document only)        |
| Current Object Selection | Same as Current Selection                                                                                                         | Merge with Current Selection |


#### 1.2 Within / Excluding Toggle

- **Within**: Find elements that MATCH the conditions (default)
- **Excluding**: Find all elements EXCEPT those that match the conditions (built-in invert)

#### 1.3 Search Conditions

Each condition row consists of:

```
[Select Category] → [Select Property] → [Not toggle] [Operator] → [Select/Enter Value]  [X remove]
```

**Categories**: Populated dynamically from the loaded IFC model's available property categories (e.g., Element, Pset_WallCommon, Material, etc.)

**Properties**: Populated dynamically based on selected category (e.g., Name, Type, Level, Fire Rating, etc.)

**Operators (V1)**:


| Operator     | Description                                |
| ------------ | ------------------------------------------ |
| Equals       | Exact match                                |
| Not Equals   | Does not match                             |
| Contains     | Value contains substring                   |
| Not Contains | Value does not contain substring           |
| Defined      | Property exists on the element (any value) |
| Undefined    | Property does not exist on the element     |


**Value**: Free text input or dropdown of known values for the selected property. For Defined/Undefined operators, value field is hidden.

#### 1.4 Compound Conditions (AND/OR Groups)

- Conditions within a group are joined by **AND** or **OR** (toggled per group)
- Users can **Add Condition** (new row in current group) or **Add Group** (new nested group)
- Groups can be nested inside groups (depth limit TBD)
- Each group has its own AND/OR toggle
- Conditions and groups can be **duplicated** or **deleted**

#### 1.5 Example Query Structure

```
AND
├── Category: Element, Property: Type, Equals: "IfcWall"
├── OR (nested group)
│   ├── Category: Pset_WallCommon, Property: FireRating, Contains: "2HR"
│   └── Category: Pset_WallCommon, Property: FireRating, Contains: "1HR"
└── Category: Element, Property: Level, Equals: "Level 3"
```

This finds all walls on Level 3 that have either a 1HR or 2HR fire rating.

### 2. Search Execution

- Clicking **"Search"** executes the query against the model within the selected scope
- Matching elements are **selected** in the 3D view (using the existing Selection feature)
- No user configuration on output action in V1 — always selects (opinionated default)
- Selection should also reflect in the Object Tree (if Object Tree integration is feasible)

### 3. Search Management

#### 3.1 Save

- Single **"Save"** button (no dropdown variants)
- Prompts for a name when saving a new search set
- Overwrites when saving an existing search set being edited

#### 3.2 Saved Search Sets List

- Flat list of saved search sets (no folders in V1)
- Each entry shows: name, created by (if available), last modified
- Click to execute (re-runs the query, selects results)
- Edit button to reopen in Search Builder
- Delete button with confirmation

#### 3.3 Persistence

- V1: localStorage with a clean storage interface (`SearchSetStorage` class)
- Interface designed for easy swap to API calls:
  ```
  getAll() → SearchSet[]
  getById(id) → SearchSet
  save(searchSet) → SearchSet
  delete(id) → void
  ```
- Future: server-side DB, all search sets shared across users

### 4. Search Groups (V2 — Document Only)

Search Groups allow combining multiple saved search sets into a named group. Executing a Search Group runs all child search sets and **unions** their results into one combined selection.

- A Search Group contains references to multiple search set IDs
- Executing a group runs each child search set and merges all matching element IDs
- Groups can be used as a scope source for other search sets ("Search within Search Group X")
- **Not implemented in V1** — only documented for future reference

### 5. Permissions & Sharing (V2 — Document Only)

- V1: All search sets are visible to all users (no public/private distinction)
- V2: Public/Private toggle per search set
  - Public: visible and executable by all users on the project
  - Private: visible only to the creator
- Requires: user identity/auth system, server-side storage
- Alternative consideration: Export/Import JSON flow for sharing without auth

---

## UI Flow (Based on Design Screenshots)

### Panel Layout

The Search Builder opens as a panel (likely from the left sidebar Search Sets button). The panel contains:

1. **Header**: "Search Builder" with expand and close buttons
2. **Define Data Set section**:
  - Within / Excluding radio toggle
  - Scope dropdown (Entire Model, Current Selection, Applied Section Box)
3. **Search Groups section** (V2 — hidden or disabled in V1)
4. **Define Search Parameters section**:
  - Condition rows with category/property/operator/value dropdowns
  - AND/OR toggle between groups
  - "+ Add Condition" and "+ Add Group" buttons
  - Duplicate / Delete buttons per condition and group
5. **Footer actions**: Save button, Search button

### Interaction Flow

1. User clicks Search Sets button in left sidebar → panel opens
2. Panel shows list of saved search sets (if any) with "New Search" button
3. User clicks "New Search" → Search Builder form opens
4. User configures scope, conditions, groups
5. User clicks "Search" → elements selected in 3D view
6. User clicks "Save" → prompted for name → search set saved to list
7. User returns to list → can click any saved search set to re-execute
8. User can edit (reopens builder) or delete saved search sets

---

## Data Model

### SearchSet

```json
{
  "id": "uuid",
  "name": "All Mechanical Ducts Level 3",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:20:00Z",
  "createdBy": "user-id",
  "scope": {
    "type": "entireModel | currentSelection | appliedSectionBox"
  },
  "mode": "within | excluding",
  "conditions": {
    "logic": "and | or",
    "rules": [
      {
        "type": "condition",
        "category": "Element",
        "property": "Type",
        "operator": "equals | notEquals | contains | notContains | defined | undefined",
        "value": "IfcDuctSegment"
      },
      {
        "type": "group",
        "logic": "or",
        "rules": [
          {
            "type": "condition",
            "category": "Pset_DuctCommon",
            "property": "PressureClass",
            "operator": "contains",
            "value": "High"
          }
        ]
      }
    ]
  }
}
```

### SearchGroup (V2)

```json
{
  "id": "uuid",
  "name": "MEP Level 3",
  "searchSetIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

---

## Technical Architecture

### Plugin Pattern

- `src/features/SearchSets.js` — core search engine and state management
- `src/ui/SearchBuilder.js` — query builder panel UI
- `src/ui/SearchSetsList.js` — saved search sets list panel UI
- `src/services/SearchSetStorage.js` — persistence interface (localStorage mock, swappable to API)

### Integration Points

- **Selection feature** (`src/features/Selection.js`): Search results are passed to `selection.select(elementIds)`
- **Object Tree** (`src/features/ObjectTree.js`): Search results sync with tree selection via `selectNodesByElementIds`
- **Sectioning** (`src/features/Sectioning.js`): "Applied Section Box" scope reads active clip planes to determine visible elements
- **LeftSidebar** (`src/ui/LeftSidebar.js`): Search Sets button already exists, needs to open the search panel
- **IFC Property Data**: Requires access to element property sets from the loaded IFC model (category/property enumeration)

### Key Design Decisions

1. **God Object rule**: Do NOT modify `src/core/ModelViewer.js`
2. **Storage interface pattern**: Abstract storage behind an interface so localStorage can be swapped for API
3. **Search engine is separate from UI**: The query evaluation logic should be a pure function that takes a query definition + model data and returns element IDs
4. **Event-driven**: Search execution emits events (`search-executed`, `search-saved`, `search-deleted`) for other features to react to

---

## Existing Codebase Reference

### Files Already Created

- `src/features/SearchSets.js` — stub plugin (needs full implementation)
- Left sidebar button already wired up with `data-panel="searchSets"`

### Key Existing Features to Integrate With

- `src/features/Selection.js` — has `select()`, `deselect()`, `getSelection()` methods
- `src/features/ObjectTree.js` — has `selectNodesByElementIds()`, `filterTree()` methods
- `src/features/Sectioning.js` — has `getState()` for active clip planes
- `src/ui/TreePanel.js` — sliding panel UI pattern to follow for the search panel
- `src/core/IFCLoader.js` — model loading, property access

### Dark Theme CSS Variables

All UI should use existing CSS variables from `src/styles/dark-theme.css`:

- `--mv-panel-bg`, `--mv-toolbar-bg`, `--mv-text-primary`, `--mv-text-secondary`
- `--mv-accent`, `--mv-hover-bg`, `--mv-border`, `--mv-active-bg`

---

## Summary of Decisions


| Decision              | Answer                                                         |
| --------------------- | -------------------------------------------------------------- |
| Search output action  | Select matching elements (opinionated, no config)              |
| Viewpoint integration | Deferred — open discovery item                                 |
| Search Groups         | Documented, deferred to V2                                     |
| Public/Private        | V1: all shared. V2: add toggle                                 |
| Persistence           | localStorage mock with swappable interface                     |
| Operators             | Equals, Not Equals, Contains, Not Contains, Defined, Undefined |
| Scope options         | Entire Model, Current Selection, Applied Section Box           |
| Section Box behavior  | Visually clipped (partial overlap counts)                      |
| Save variants         | Single "Save" button only                                      |
| Condition nesting     | AND/OR groups, nestable (depth limit TBD)                      |
| Within/Excluding      | Built into query definition (not a separate action)            |
| UI approach           | Visual form-based constructor (dropdowns, not text query)      |
| This is a prototype   | Frontend only, all persistence mocked                          |


