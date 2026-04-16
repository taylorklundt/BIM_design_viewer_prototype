# Selection Feature - Eval Test Cases

## Test Environment Setup
1. Load a model with multiple elements
2. Open browser dev console for event verification

---

## Category 1: Basic Selection

### TEST-SEL-001: Click to Select
**Action**: Click on a model element
**Expected**:
- Element becomes visually highlighted (blue tint)
- `selection-change` event fires with element ID in `added` array
- `getSelected()` returns array containing clicked element ID

**Pass**: Element highlights AND event fires
**Fail**: No highlight OR no event OR getSelected() empty

---

### TEST-SEL-002: Click Empty Space to Deselect
**Action**: With element selected, click on empty space (background)
**Expected**:
- Previously selected element loses highlight
- `selection-change` event fires with element ID in `removed` array
- `getSelected()` returns empty array

**Pass**: Highlight removed AND event fires with removed ID
**Fail**: Element stays highlighted OR no event

---

### TEST-SEL-003: Click Different Element
**Action**: With element A selected, click element B
**Expected**:
- Element A loses highlight
- Element B gains highlight
- `selection-change` event fires with A in `removed`, B in `added`
- `getSelected()` returns only B

**Pass**: Selection transfers correctly
**Fail**: Both selected OR neither selected OR wrong events

---

## Category 2: Multi-Select

### TEST-SEL-004: Ctrl+Click to Add
**Action**: With element A selected, Ctrl+click element B
**Expected**:
- Both A and B highlighted
- `selection-change` event fires with B in `added`, `removed` empty
- `getSelected()` returns [A, B]

**Pass**: Both elements selected
**Fail**: Only one selected OR A deselected

---

### TEST-SEL-005: Ctrl+Click to Remove
**Action**: With elements A and B selected, Ctrl+click element A
**Expected**:
- A loses highlight, B keeps highlight
- `selection-change` event fires with A in `removed`
- `getSelected()` returns only B

**Pass**: A deselected, B remains
**Fail**: Both deselected OR A still selected

---

### TEST-SEL-006: Ctrl+Click Empty Space
**Action**: With elements selected, Ctrl+click on empty space
**Expected**:
- Selection unchanged (nothing deselected)
- No `selection-change` event

**Pass**: Selection preserved
**Fail**: Elements deselected

---

## Category 3: Visual Highlighting

### TEST-SEL-007: Highlight Material Applied
**Action**: Select an element
**Expected**:
- Element material changes to highlight color (blue)
- Original material stored for restore

**Pass**: Visual color change visible
**Fail**: No visual change OR wrong color

---

### TEST-SEL-008: Highlight Removed on Deselect
**Action**: Deselect an element
**Expected**:
- Element returns to original material/color
- No residual highlight

**Pass**: Original appearance restored
**Fail**: Stays highlighted OR wrong material

---

## Category 4: Hover

### TEST-SEL-009: Hover Highlight
**Action**: Move mouse over unselected element
**Expected**:
- Element shows hover highlight (lighter blue)
- `element-hover` event fires with element ID

**Pass**: Hover effect visible AND event fires
**Fail**: No hover effect OR no event

---

### TEST-SEL-010: Hover Off
**Action**: Move mouse away from hovered element
**Expected**:
- Hover highlight removed
- `element-hover` event fires with `elementId: null`

**Pass**: Hover removed AND event fires
**Fail**: Hover persists

---

### TEST-SEL-011: No Hover on Selected Element
**Action**: Hover over already-selected element
**Expected**:
- Selection highlight maintained (not replaced by hover)
- No flickering between hover/select states

**Pass**: Selection highlight stable
**Fail**: Flickers OR changes to hover color

---

### TEST-SEL-012: Hover Disabled
**Action**: Call `setHoverEnabled(false)`, then hover
**Expected**:
- No hover highlight appears
- No `element-hover` events

**Pass**: Hover completely disabled
**Fail**: Hover still works

---

## Category 5: Context Menu (Right-Click)

### TEST-SEL-013: Right-Click on Element
**Action**: Right-click on a model element
**Expected**:
- Browser default context menu prevented
- `context-menu` event fires with:
  - `elementId`: clicked element ID
  - `point`: THREE.Vector3 intersection point
  - `normal`: THREE.Vector3 face normal (world space)
  - `screenX`, `screenY`: mouse coordinates

**Pass**: Event fires with all data populated
**Fail**: Missing data OR browser menu appears

---

### TEST-SEL-014: Right-Click Empty Space
**Action**: Right-click on empty background
**Expected**:
- `context-menu` event fires with:
  - `elementId: null`
  - `point: null`
  - `screenX`, `screenY`: mouse coordinates

**Pass**: Event fires with null element data
**Fail**: No event OR error thrown

---

### TEST-SEL-015: getLastIntersection()
**Action**: Right-click element, then call `getLastIntersection()`
**Expected**:
- Returns object with intersection data from last right-click

**Pass**: Returns correct intersection data
**Fail**: Returns null OR stale data

---

### TEST-SEL-016: InstancedMesh Normal Calculation
**Action**: Right-click on an InstancedMesh element
**Expected**:
- Normal correctly calculated using instance matrix
- Normal is parallel to clicked face (not distorted)

**Pass**: Normal direction matches face orientation
**Fail**: Normal points wrong direction

---

## Category 6: Double-Click

### TEST-SEL-017: Double-Click Event
**Action**: Double-click on element
**Expected**:
- `element-double-click` event fires with:
  - `elementId`
  - `mesh`
  - `point`
  - `face`

**Pass**: Event fires with all data
**Fail**: No event OR missing data

---

## Category 7: Programmatic Selection

### TEST-SEL-018: selectByIds()
**Action**: Call `selection.selectByIds(['id1', 'id2'])`
**Expected**:
- Elements with those IDs become selected and highlighted
- `selection-change` event fires

**Pass**: Elements selected by ID
**Fail**: Elements not found OR not highlighted

---

### TEST-SEL-019: deselect() All
**Action**: With multiple selected, call `selection.deselect()`
**Expected**:
- All elements deselected
- All highlights removed
- `selection-change` event fires with all in `removed`

**Pass**: All deselected
**Fail**: Some remain selected

---

### TEST-SEL-020: deselect() Specific IDs
**Action**: With A, B, C selected, call `selection.deselect(['A'])`
**Expected**:
- Only A deselected
- B and C remain selected

**Pass**: Only specified element deselected
**Fail**: Wrong elements deselected

---

## Category 8: Edge Cases

### TEST-SEL-021: Rapid Clicking
**Action**: Click rapidly on different elements
**Expected**:
- No errors thrown
- Final state consistent (last clicked selected)

**Pass**: Handles rapid input gracefully
**Fail**: Errors OR inconsistent state

---

### TEST-SEL-022: Select Hidden Element
**Action**: Try to click on hidden (invisible) element
**Expected**:
- Hidden elements not selectable (raycast ignores them)

**Pass**: Hidden elements ignored
**Fail**: Hidden element selected

---

### TEST-SEL-023: destroy() Cleanup
**Action**: Call `selection.destroy()`
**Expected**:
- All event listeners removed
- All highlights removed
- No memory leaks

**Pass**: Clean destruction
**Fail**: Listeners persist OR highlights remain

---

## Category 9: Integration

### TEST-SEL-024: Selection Syncs with Tree
**Precondition**: ObjectTree feature active
**Action**: Select element in 3D view
**Expected**:
- Corresponding tree node highlights
- Tree scrolls to show selected node (if out of view)

**Pass**: Tree reflects 3D selection
**Fail**: Tree not updated

---

### TEST-SEL-025: Context Menu Creates Section Plane
**Precondition**: Sectioning feature active
**Action**: Right-click element, click "Create Section Plane"
**Expected**:
- Section plane created parallel to clicked face
- Uses intersection data from Selection

**Pass**: Correct plane orientation
**Fail**: Wrong plane OR error

---

## Summary Scoring

| Category | Tests | Weight |
|----------|-------|--------|
| Basic Selection | 3 | High |
| Multi-Select | 3 | High |
| Visual Highlighting | 2 | Medium |
| Hover | 4 | Medium |
| Context Menu | 4 | High |
| Double-Click | 1 | Low |
| Programmatic | 3 | Medium |
| Edge Cases | 3 | Low |
| Integration | 2 | Medium |

**Pass Threshold**:
- All "High" weight tests pass
- 80% of "Medium" weight tests pass
- 50% of "Low" weight tests pass

**Critical Failures** (instant fail):
- App crashes on click
- No visual selection feedback
- Context menu data missing (breaks Sectioning)
