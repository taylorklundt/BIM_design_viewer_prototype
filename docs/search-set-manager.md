# Search Set Manager — Implementation Reference

This document fully describes the implemented Search Set Manager feature. It is self-contained: an engineer can rebuild the feature from scratch using only this file.

---

## Overview

The Search Set Manager is a **manager-only** panel (no query builder/constructor UI) that lets users browse, execute, rename, and delete saved search sets. When a search set is clicked, its query is evaluated against all meshes in the 3D scene and matching elements are selected. A minimal query engine provides full execution capability.

### What Was Built

| Component | File | Role |
|---|---|---|
| **SearchSetStorage** | `src/services/SearchSetStorage.js` | localStorage persistence with swappable interface |
| **SearchQueryEngine** | `src/services/SearchQueryEngine.js` | Pure-function query evaluator against Three.js scene |
| **SearchSets** | `src/features/SearchSets.js` | Feature plugin — CRUD + execute + events |
| **SearchSetsPanel** | `src/ui/SearchSetsPanel.js` | Manager panel UI — list, click-to-execute, inline rename, delete |
| **CSS** | `src/styles/dark-theme.css` | `.mv-search-sets-panel` and `.mv-ss-*` styles |
| **Tests** | `evals/tests/search-sets.spec.js` | 28 Playwright e2e tests, all user-click driven |

### What Was NOT Built (Deferred to V2)

- Search Constructor / Query Builder UI (visual form for creating/editing queries)
- Search Groups (combining multiple search sets)
- Viewpoint ↔ Search Set relationship
- Backend API integration
- Public/Private permissions

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  LeftSidebar                                          │
│  └─ "Search Sets" button (data-panel="searchSets")   │
│     └─ opens/closes SearchSetsPanel                   │
├──────────────────────────────────────────────────────┤
│  SearchSetsPanel (UI)                                 │
│  ├─ Reads list from SearchSets.getAll()               │
│  ├─ Click item → SearchSets.executeAndSelect(id)      │
│  ├─ Edit icon → inline rename → SearchSets.rename()   │
│  ├─ Delete icon → confirm → SearchSets.delete()       │
│  └─ Listens to search-saved / search-deleted → re-render │
├──────────────────────────────────────────────────────┤
│  SearchSets (Feature Plugin)                          │
│  ├─ CRUD: getAll, getById, save, delete, rename       │
│  ├─ execute(idOrObject) → delegates to engine         │
│  ├─ executeAndSelect(id) → execute + selection.deselect + selectByIds │
│  ├─ Events: search-executed, search-saved, search-deleted │
│  └─ Storage: SearchSetStorage instance                │
├──────────────────────────────────────────────────────┤
│  SearchQueryEngine (Pure Logic)                       │
│  ├─ Traverses scene for isMesh && visible             │
│  ├─ Extracts props from mesh.userData                  │
│  ├─ Evaluates condition groups (AND/OR, nested)       │
│  └─ Returns matching element IDs                      │
├──────────────────────────────────────────────────────┤
│  SearchSetStorage (Persistence)                       │
│  ├─ localStorage key: "mv-search-sets"                │
│  ├─ Interface: getAll, getById, save, delete, clear   │
│  └─ Pre-seeds 3 example search sets on first load     │
└──────────────────────────────────────────────────────┘
```

### Plugin Pattern Compliance

The feature follows the project's plugin pattern. `ModelViewer.js` is **never modified**. Instead, the feature is instantiated externally in the page script:

```javascript
import { SearchSets } from '../src/features/SearchSets.js';
import { SearchSetsPanel } from '../src/ui/SearchSetsPanel.js';

viewer.on('ready', () => {
  const searchSets = new SearchSets(viewer.sceneManager, {
    selection: viewer.selection,
    sectioning: viewer.sectioning,
  });
  searchSets.enable();
  viewer.searchSets = searchSets;

  const searchSetsPanel = new SearchSetsPanel(
    document.querySelector('#viewer-container'),
    searchSets
  );
  viewer.searchSetsPanel = searchSetsPanel;

  const sidebar = new LeftSidebar(container, viewer);
  sidebar.syncSearchSetsPanelState();
});
```

---

## Data Model

### SearchSet (stored in localStorage as JSON array)

```json
{
  "id": "uuid-string",
  "name": "All Walls",
  "createdAt": "2025-06-01T08:00:00Z",
  "updatedAt": "2025-06-01T08:00:00Z",
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
        "property": "type",
        "operator": "equals | notEquals | contains | notContains | defined | undefined",
        "value": "IfcWall"
      },
      {
        "type": "group",
        "logic": "or",
        "rules": [ /* nested conditions/groups */ ]
      }
    ]
  }
}
```

### Property Categories

The query engine resolves categories from `mesh.userData`:

| Category | Source | Properties |
|---|---|---|
| `Element` | Top-level `userData` fields | `name`, `type` (or `ifcType`), `expressID`, `level` |
| Any other (e.g. `Pset_Common`) | `userData.properties[categoryName]` | Whatever keys exist in that object |

### Operators

| Operator | Behavior |
|---|---|
| `equals` | `String(value) === String(condValue)` |
| `notEquals` | `String(value) !== String(condValue)` |
| `contains` | Case-insensitive substring match |
| `notContains` | Case-insensitive: value does NOT contain substring |
| `defined` | Property exists and is non-empty (value field ignored) |
| `undefined` | Property does not exist or is empty (value field ignored) |

### Scope Resolution

| Scope | Behavior |
|---|---|
| `entireModel` | All visible meshes in the scene (`isMesh && visible`) |
| `currentSelection` | Only meshes whose element ID is in `selection.getSelected()` |
| `appliedSectionBox` | Stub — currently falls through to entireModel (V2: filter by clip planes) |

### Mode

| Mode | Behavior |
|---|---|
| `within` | Return elements that MATCH the conditions |
| `excluding` | Return elements that do NOT match the conditions |

---

## File-by-File Implementation

### 1. `src/services/SearchSetStorage.js`

**Constructor:** `new SearchSetStorage(storageKey = 'mv-search-sets')`

**Methods:**

| Method | Signature | Behavior |
|---|---|---|
| `getAll()` | `→ SearchSet[]` | Read and parse localStorage |
| `getById(id)` | `→ SearchSet \| null` | Find by id |
| `save(searchSet)` | `→ SearchSet` | If `searchSet.id` exists in storage, update it (merge + new `updatedAt`). Otherwise create with `crypto.randomUUID()` + timestamps. |
| `delete(id)` | `→ void` | Filter out by id, rewrite |
| `clear()` | `→ void` | Write empty array |

**Seeding:** On construction, if storage is empty or contains old test-only seed IDs (`seed-boxes`, `seed-box-1-or-2`), it writes `SEED_DATA` while preserving any user-created (non-`seed-` prefixed) sets.

**3 Seed Search Sets (for real IFC models):**

1. **"All Walls"** — `Element.type contains "Wall"` (matches `IfcWall`, `IfcWallStandardCase`)
2. **"All Slabs"** — `Element.type contains "Slab"`
3. **"Doors & Windows"** — OR: `Element.type contains "Door"` OR `Element.type contains "Window"`

### 2. `src/services/SearchQueryEngine.js`

**Constructor:** `new SearchQueryEngine(scene, { selection, sectioning })`

**Method:** `execute(searchSet) → string[]` (element IDs)

**Algorithm:**
1. Resolve meshes in scope (`_getMeshesInScope`)
2. For each mesh, extract properties into `{ Element: {...}, Pset_X: {...} }` map
3. Evaluate the condition group tree recursively (`_evaluateGroup`)
4. Apply `within`/`excluding` inversion
5. Return matching element IDs

**Key implementation details:**
- Traverses `scene.traverse()` for `obj.isMesh && obj.visible`
- Element ID: `mesh.userData?.expressID || mesh.uuid`
- Type: `mesh.userData?.type || mesh.userData?.ifcType`
- Property sets: `mesh.userData?.properties` (object of category→props objects)
- `contains`/`notContains` are case-insensitive
- Empty rules array in a group → evaluates to `true` (matches everything)
- AND short-circuits on first `false`; OR short-circuits on first `true`

### 3. `src/features/SearchSets.js`

**Constructor:** `new SearchSets(sceneManager, { selection, sectioning })`

**Methods:**

| Method | Behavior |
|---|---|
| `enable()` | Lazily creates the query engine |
| `disable()` | Clears lastResults |
| `getAll()` | Delegates to storage |
| `getById(id)` | Delegates to storage |
| `save(searchSet)` | Saves to storage, emits `search-saved` |
| `delete(id)` | Deletes from storage, emits `search-deleted` |
| `rename(id, newName)` | Gets existing, updates name, calls `save()` |
| `execute(idOrObject)` | Resolves search set (by ID or as object), runs engine, stores results, emits `search-executed` |
| `executeAndSelect(idOrObject)` | Calls `execute()`, then `selection.deselect()` + `selection.selectByIds(results)` |
| `getLastResults()` | Returns last execution results |
| `destroy()` | Clears state and event listeners |

**Events:**

| Event | Payload |
|---|---|
| `search-executed` | `{ searchSet, results: string[] }` |
| `search-saved` | Full saved SearchSet object |
| `search-deleted` | `{ id }` |

### 4. `src/ui/SearchSetsPanel.js`

**Constructor:** `new SearchSetsPanel(container, searchSets)`

**Panel structure (DOM):**
```
div.mv-panel.mv-search-sets-panel.mv-hidden
├── div.mv-panel-header
│   ├── span "Search Sets"
│   └── div.mv-panel-header-actions → button.mv-panel-close
└── div.mv-panel-content.mv-ss-content
    ├── div.mv-ss-list → [.mv-ss-item ...]
    └── div.mv-ss-empty.mv-hidden → icon + "No search sets saved yet."
```

**Each `.mv-ss-item`:**
```
div.mv-ss-item[data-id="..."]
├── div.mv-ss-item-icon → search SVG (accent colored)
├── div.mv-ss-item-body
│   ├── span.mv-ss-name (or input.mv-ss-name-input when editing)
│   └── span.mv-ss-meta → "1 condition · Entire Model · Jun 1, 2025"
└── div.mv-ss-item-actions (opacity 0 → 1 on hover)
    ├── button.mv-ss-edit-btn → pencil SVG
    └── button.mv-ss-delete-btn → trash SVG
```

**Behaviors:**

| User action | Panel behavior |
|---|---|
| Click item body | `searchSets.executeAndSelect(id)`. Flash border accent. Meta briefly shows "N elements found" in green (or yellow for 0). Reverts after 2s. |
| Click edit icon | Replaces `.mv-ss-name` span with `.mv-ss-name-input` text input. Auto-focused, text selected. |
| Enter in input | Commits: `searchSets.rename(id, value)`. Re-renders. |
| Escape in input | Cancels: clears `editingId`, re-renders with original name. |
| Blur input | Same as Enter (commits). |
| Click delete icon | `confirm()` dialog. If accepted: `searchSets.delete(id)`. |
| Close button | `panel.classList.add('mv-hidden')`, emits `close`. |

**Events emitted:** `open`, `close`, `search-executed` (with `{ id, count }`)

**Auto-refresh:** Listens to `search-saved` and `search-deleted` on the `searchSets` feature to re-render the list.

**Sorting:** Items sorted by `updatedAt` descending (most recent first).

### 5. LeftSidebar Integration (`src/ui/LeftSidebar.js`)

Changes to the existing file (do NOT replace — patch these methods):

**`openPanel(panelId)`:** Add `else if` for `searchSets`:
```javascript
} else if (panelId === 'searchSets' && this.viewer.searchSetsPanel) {
  if (!this.viewer.searchSetsPanel.isOpen) {
    this.viewer.searchSetsPanel.open();
  }
}
```

**`closePanel(panelId)`:** Same pattern for close.

**`syncSearchSetsPanelState()`:** New method — call after constructing the sidebar:
```javascript
syncSearchSetsPanelState() {
  if (!this.viewer.searchSetsPanel) return;
  this.viewer.searchSetsPanel.on('close', () => {
    if (this.activePanel === 'searchSets') {
      this.activePanel = null;
      this.updateButtonStates();
    }
  });
  this.viewer.searchSetsPanel.on('open', () => {
    this.activePanel = 'searchSets';
    this.updateButtonStates();
  });
}
```

### 6. CSS (`src/styles/dark-theme.css`)

Add before the `/* Responsive adjustments */` section. Key classes:

| Selector | Purpose |
|---|---|
| `.mv-search-sets-panel` | Position: `top: 60px; left: 12px; width: 280px` |
| `.mv-has-left-sidebar .mv-search-sets-panel` | Shift right: `left: 68px` |
| `.mv-ss-content` | `max-height: 480px; padding: 8px` |
| `.mv-ss-item` | Row with `gap: 8px`, secondary bg, transparent border, hover reveals border |
| `.mv-ss-item.mv-ss-flash` | Accent border + accent-light bg (applied for 600ms on execute) |
| `.mv-ss-item-actions` | `opacity: 0` default, `opacity: 1` on `.mv-ss-item:hover` |
| `.mv-ss-name-input` | Inline edit input: accent border, primary bg |
| `.mv-ss-delete-btn:hover` | Red tint: `rgba(239,68,68,0.15)` bg, error color |
| `.mv-ss-empty` | Centered muted text + icon for empty state |

### 7. Exports (`src/index.js`)

Add these exports:
```javascript
export { SearchSetsPanel } from './ui/SearchSetsPanel.js';
export { SearchSetStorage } from './services/SearchSetStorage.js';
export { SearchQueryEngine } from './services/SearchQueryEngine.js';
```

### 8. Package script (`package.json`)

Add:
```json
"test:search-sets": "npx playwright test evals/tests/search-sets.spec.js"
```

---

## Mock Scene for Testing (`demo/test-page.html`)

The test page creates 5 meshes with enriched userData:

| Index | expressID | name | type | level | Pset_Common.FireRating | Pset_Common.LoadBearing |
|---|---|---|---|---|---|---|
| 0 | `element-0` | Box 1 | TestBox | Level 1 | 2HR | true |
| 1 | `element-1` | Box 2 | TestBox | Level 1 | 2HR | false |
| 2 | `element-2` | Box 3 | TestWall | Level 2 | 2HR | true |
| 3 | `element-3` | Box 4 | TestBox | Level 2 | 1HR | false |
| 4 | `element-4` | Box 5 | TestWall | Level 3 | 1HR | true |

Property sets are stored as `mesh.userData.properties = { Pset_Common: { FireRating: '...', LoadBearing: '...' } }`.

The test page also instantiates `SearchSets`, `SearchSetsPanel`, `LeftSidebar` and calls `sidebar.syncSearchSetsPanelState()`.

---

## Test Suite (`evals/tests/search-sets.spec.js`)

28 end-to-end Playwright tests. **Every test simulates real user clicks/keystrokes** — no test calls `execute()` directly. Tests seed localStorage in `beforeEach` with 3 search sets matching the mock scene data.

### Test Inventory

| ID | Category | User Action → Success Criteria |
|---|---|---|
| SS-UI-001 | Panel | Click sidebar button → panel opens, shows 3 items |
| SS-UI-002 | Panel | Click button twice → opens then closes |
| SS-UI-003 | Panel | Click X button → panel hides, sidebar button deactivates |
| SS-UI-004 | Panel | Open Search Sets → closes Object Tree panel |
| SS-UI-005 | Execute | Click "Test Boxes" → selects exactly `[element-0, element-1, element-3]` |
| SS-UI-006 | Execute | Click "All Walls" → selects exactly `[element-2, element-4]` |
| SS-UI-007 | Execute | Click "Box 1 or Box 2" → selects exactly `[element-0, element-1]` (OR logic) |
| SS-UI-008 | Execute | Execute clears previous selection first |
| SS-UI-009 | Execute | Click same set twice → re-runs, re-selects |
| SS-UI-010 | Execute | Click different sets in sequence → selection updates each time |
| SS-UI-011 | Execute | Meta line flashes "N elements found" after execution |
| SS-UI-012 | Rename | Click edit icon → input appears with current name |
| SS-UI-013 | Rename | Type new name + Enter → persists in storage and label |
| SS-UI-014 | Rename | Press Escape → reverts to original name |
| SS-UI-015 | Rename | Renamed set still executes correctly |
| SS-UI-016 | Delete | Click delete + confirm → item removed from list and storage |
| SS-UI-017 | Delete | Click delete + cancel → item remains |
| SS-UI-018 | Delete | Delete all → empty state visible |
| SS-UI-019 | Metadata | Item shows name, condition count, scope, date |
| SS-UI-020 | Metadata | OR group shows "2 conditions" |
| SS-UI-021 | Metadata | Action buttons have CSS opacity transition |
| SS-UI-022 | Integration | Execute updates status bar "N selected" |
| SS-UI-023 | Engine | No-match query → 0 elements selected |
| SS-UI-024 | Engine | "excluding" mode inverts: selects non-matching elements |
| SS-UI-025 | Engine | Property-set query (Pset_Common.FireRating = "2HR") → 3 matches |
| SS-UI-026 | Engine | Nested AND+OR group → correct 2-element intersection |
| SS-UI-027 | Engine | "currentSelection" scope restricts to pre-selected elements |
| SS-UI-028 | Cleanup | `destroy()` removes panel from DOM |

### Running Tests

```bash
npm run test:search-sets       # Just search sets (28 tests)
npm test                       # All suites including search sets
```

---

## Integration Points

| System | How It Integrates |
|---|---|
| **Selection** (`src/features/Selection.js`) | `executeAndSelect()` calls `selection.deselect()` then `selection.selectByIds(results)` |
| **LeftSidebar** (`src/ui/LeftSidebar.js`) | `openPanel`/`closePanel` handle `searchSets` panel ID. `syncSearchSetsPanelState()` keeps button active state in sync. |
| **Status Bar** | Selection change from `executeAndSelect` propagates through existing `selection-change` → `updateStatusBar()` flow |
| **Object Tree** | Selection change syncs to tree via existing `selection-change` → `objectTree.selectNodesByElementIds()` flow |

---

## How to Rebuild From Scratch

1. Create `src/services/SearchSetStorage.js` — localStorage CRUD with seed data
2. Create `src/services/SearchQueryEngine.js` — scene traversal + condition evaluation
3. Replace `src/features/SearchSets.js` — feature plugin wrapping storage + engine
4. Create `src/ui/SearchSetsPanel.js` — manager panel (list, execute, rename, delete)
5. Add `.mv-search-sets-panel` and `.mv-ss-*` CSS to `src/styles/dark-theme.css`
6. Patch `src/ui/LeftSidebar.js` — add `searchSets` to `openPanel`/`closePanel`, add `syncSearchSetsPanelState()`
7. Add exports to `src/index.js`
8. Instantiate in `demo/index.html` and `demo/test-page.html` (with enriched mock userData)
9. Create `evals/tests/search-sets.spec.js` with 28 user-click-driven tests
10. Add `test:search-sets` script to `package.json`

**Critical rule:** Do NOT modify `src/core/ModelViewer.js`. Attach `viewer.searchSets` and `viewer.searchSetsPanel` from the page script.
