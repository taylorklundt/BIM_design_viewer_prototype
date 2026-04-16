# 3D Model Viewer - Implementation Plan

## Overview
A reusable, batteries-included 3D IFC Model Viewer as an embeddable JavaScript component.

**Tech Stack:** Three.js + IFC.js (OpenBIM Components)
**Distribution:** Script tag (`<script src="model-viewer.js">`)
**Theme:** Single dark theme
**Persistence:** IndexedDB + Export/Import JSON

---

## Project Structure

```
3DModelViewer/
├── src/
│   ├── core/
│   │   ├── ModelViewer.js          # Main entry point class
│   │   ├── SceneManager.js         # Three.js scene setup
│   │   └── IFCLoader.js            # IFC file loading & parsing
│   ├── features/
│   │   ├── Navigation.js           # Camera controls
│   │   ├── Selection.js            # Object picking & highlighting
│   │   ├── Visibility.js           # Show/hide/isolate logic
│   │   ├── Measurement.js          # Distance & area tools
│   │   ├── Sectioning.js           # Clipping planes
│   │   ├── ModelViews.js           # Saved view states
│   │   ├── Markups.js              # 2D overlays & 3D annotations
│   │   └── ObjectTree.js           # Hierarchical element tree
│   ├── ui/
│   │   ├── Toolbar.js              # Main toolbar component
│   │   ├── PropertiesPanel.js      # Element properties display
│   │   ├── TreePanel.js            # Object tree UI
│   │   ├── ViewsPanel.js           # Saved views list
│   │   ├── MarkupToolbar.js        # Annotation tools
│   │   └── ContextMenu.js          # Right-click menu
│   ├── persistence/
│   │   ├── StorageManager.js       # IndexedDB operations
│   │   └── ExportImport.js         # JSON export/import
│   ├── styles/
│   │   └── dark-theme.css          # Dark theme styles
│   └── index.js                    # Bundle entry
├── demo/
│   ├── index.html                  # Demo page
│   └── models/                     # Demo IFC files
├── dist/
│   └── model-viewer.js             # Built bundle
└── package.json
```

---

## Feature Breakdown with Functions

### 1. Core: ModelViewer (Main Class)

**Purpose:** Entry point that initializes everything and exposes public API.

| Function | Description |
|----------|-------------|
| `constructor(selector, options)` | Initialize viewer in target container |
| `loadModel(url, name?)` | Load an IFC file into the scene |
| `unloadModel(modelId)` | Remove a model from the scene |
| `getLoadedModels()` | Return list of loaded model IDs and names |
| `destroy()` | Clean up all resources and event listeners |
| `resize()` | Handle container resize |
| `getState()` | Get complete viewer state (for export) |
| `setState(state)` | Restore viewer state (from import) |

---

### 2. Navigation

**Purpose:** Camera movement and view controls.

| Function | Description |
|----------|-------------|
| `setMode(mode)` | Switch mode: 'orbit', 'pan', 'firstPerson' |
| `getMode()` | Get current navigation mode |
| `orbit(deltaX, deltaY)` | Rotate camera around target |
| `pan(deltaX, deltaY)` | Move camera laterally |
| `zoom(delta)` | Zoom in/out |
| `zoomToFit(elementIds?)` | Fit view to elements or entire model |
| `zoomToSelection()` | Fit view to currently selected elements |
| `setTarget(point)` | Set orbit center point |
| `getCamera()` | Get camera position & target |
| `setCamera(position, target)` | Set camera position & target |
| `enableFirstPerson()` | Enable WASD + mouse look controls |
| `disableFirstPerson()` | Return to orbit mode |
| `setWalkSpeed(speed)` | Adjust first-person walk speed |

**Events:**
- `camera-change` — Fired when camera moves

---

### 3. Selection

**Purpose:** Picking objects and visual feedback.

| Function | Description |
|----------|-------------|
| `select(elementIds)` | Select elements by ID |
| `deselect(elementIds?)` | Deselect specific or all elements |
| `getSelected()` | Get array of selected element IDs |
| `toggleSelect(elementId)` | Toggle selection state |
| `setHighlightColor(color)` | Set selection highlight color |
| `setHoverEnabled(enabled)` | Enable/disable hover highlighting |
| `pickAtPoint(x, y)` | Get element at screen coordinates |

**Events:**
- `selection-change` — Fired when selection changes (includes selected IDs)
- `element-hover` — Fired when hovering over element
- `element-click` — Fired on element click
- `element-double-click` — Fired on double-click

---

### 4. Element Properties

**Purpose:** Retrieve and display IFC property sets.

| Function | Description |
|----------|-------------|
| `getProperties(elementId)` | Get all properties for an element |
| `getPropertySets(elementId)` | Get IFC property sets |
| `getQuantities(elementId)` | Get quantity takeoff data |
| `getType(elementId)` | Get IFC type (IfcWall, IfcDoor, etc.) |
| `getGlobalId(elementId)` | Get IFC GlobalId |
| `getName(elementId)` | Get element name |
| `searchByProperty(key, value)` | Find elements by property value |

---

### 5. Object Tree

**Purpose:** Hierarchical model structure navigation.

| Function | Description |
|----------|-------------|
| `getTree(modelId?)` | Get tree structure for model(s) |
| `expandNode(nodeId)` | Expand tree node |
| `collapseNode(nodeId)` | Collapse tree node |
| `expandAll()` | Expand entire tree |
| `collapseAll()` | Collapse entire tree |
| `scrollToElement(elementId)` | Scroll tree to show element |
| `filterTree(query)` | Filter tree by name/type search |
| `clearFilter()` | Clear tree filter |
| `getNodeByElement(elementId)` | Get tree node for element |
| `getElementsByNode(nodeId)` | Get elements under tree node |

**Tree Structure:**
```
Model File 1
├── IfcSite
│   └── IfcBuilding
│       ├── IfcBuildingStorey (Level 1)
│       │   ├── IfcWall (Wall-001)
│       │   ├── IfcDoor (Door-001)
│       │   └── ...
│       └── IfcBuildingStorey (Level 2)
│           └── ...
Model File 2
└── ...
```

**Events:**
- `tree-node-click` — Node clicked in tree
- `tree-node-toggle` — Node expanded/collapsed

---

### 6. Visibility

**Purpose:** Control element and model visibility.

| Function | Description |
|----------|-------------|
| `show(elementIds)` | Show elements |
| `hide(elementIds)` | Hide elements |
| `toggleVisibility(elementIds)` | Toggle visibility |
| `isolate(elementIds)` | Show only these elements, hide rest |
| `showAll()` | Show all elements |
| `hideAll()` | Hide all elements |
| `showModel(modelId)` | Show entire model |
| `hideModel(modelId)` | Hide entire model |
| `toggleModel(modelId)` | Toggle model visibility |
| `getHiddenElements()` | Get list of hidden element IDs |
| `getVisibleElements()` | Get list of visible element IDs |
| `setOpacity(elementIds, opacity)` | Set element transparency |
| `resetOpacity()` | Reset all to full opacity |
| `showByType(ifcType)` | Show all elements of IFC type |
| `hideByType(ifcType)` | Hide all elements of IFC type |

**Events:**
- `visibility-change` — Fired when visibility changes

---

### 7. Measurement

**Purpose:** Distance and area measurement tools.

| Function | Description |
|----------|-------------|
| `enableDistanceTool()` | Start distance measurement mode |
| `enableAreaTool()` | Start area measurement mode |
| `disableMeasurement()` | Exit measurement mode |
| `getMeasurements()` | Get all measurements |
| `deleteMeasurement(id)` | Delete a measurement |
| `clearMeasurements()` | Delete all measurements |
| `setUnit(unit)` | Set unit: 'mm', 'cm', 'm', 'ft', 'in' |
| `getUnit()` | Get current unit |
| `setSnapEnabled(enabled)` | Enable/disable snapping to edges/vertices |
| `setPrecision(decimals)` | Set decimal precision |

**Measurement Data:**
```javascript
{
  id: 'meas-001',
  type: 'distance', // or 'area'
  points: [{x, y, z}, ...],
  value: 5.25,
  unit: 'm',
  label: '5.25 m'
}
```

**Events:**
- `measurement-start` — Measurement started
- `measurement-complete` — Measurement finished
- `measurement-delete` — Measurement removed

---

### 8. Sectioning (Clipping Planes)

**Purpose:** Cut through model with clipping planes.

| Function | Description |
|----------|-------------|
| `addClipPlane(axis, position?)` | Add plane on X, Y, or Z axis |
| `addClipPlaneCustom(normal, point)` | Add plane with custom orientation |
| `removeClipPlane(planeId)` | Remove a clipping plane |
| `clearClipPlanes()` | Remove all clipping planes |
| `getClipPlanes()` | Get all active planes |
| `setPlanePosition(planeId, position)` | Move plane along its axis |
| `flipPlane(planeId)` | Flip clipping direction |
| `setPlaneVisible(planeId, visible)` | Show/hide plane helper |
| `enablePlaneGizmo(planeId)` | Enable drag handle for plane |
| `disablePlaneGizmo(planeId)` | Disable drag handle |
| `createSectionBox()` | Create 6-plane section box |
| `resetSectionBox()` | Reset box to model bounds |
| `setSectionBoxEnabled(enabled)` | Enable/disable section box |

**Events:**
- `clip-plane-add` — Plane added
- `clip-plane-move` — Plane position changed
- `clip-plane-remove` — Plane removed

---

### 9. Model Views (Saved States)

**Purpose:** Save and restore view configurations.

| Function | Description |
|----------|-------------|
| `createView(name, description?)` | Save current state as named view |
| `applyView(viewId)` | Restore a saved view |
| `updateView(viewId)` | Update existing view with current state |
| `deleteView(viewId)` | Delete a saved view |
| `getViews()` | Get all saved views |
| `renameView(viewId, name)` | Rename a view |
| `duplicateView(viewId)` | Duplicate a view |
| `setViewThumbnail(viewId)` | Capture current view as thumbnail |

**View State Includes:**
- Camera position & target
- Hidden elements list
- Clipping planes
- Selected elements
- Transparency states
- Active measurements

**Events:**
- `view-create` — View saved
- `view-apply` — View restored
- `view-delete` — View removed

---

### 10. Markups & Annotations

**Purpose:** 2D overlay drawings and 3D positioned annotations.

#### 10.1 2D Overlay Markups

| Function | Description |
|----------|-------------|
| `enableMarkupMode()` | Enter markup drawing mode |
| `disableMarkupMode()` | Exit markup mode |
| `setMarkupTool(tool)` | Set tool: 'arrow', 'rectangle', 'circle', 'freehand', 'text', 'cloud' |
| `setMarkupColor(color)` | Set stroke/fill color |
| `setMarkupStrokeWidth(width)` | Set line thickness |
| `undoMarkup()` | Undo last markup action |
| `redoMarkup()` | Redo markup action |
| `deleteMarkup(markupId)` | Delete a markup |
| `clearMarkups()` | Delete all markups |
| `getMarkups()` | Get all 2D markups |

#### 10.2 3D Annotations

| Function | Description |
|----------|-------------|
| `enable3DAnnotationMode()` | Enter 3D pin placement mode |
| `disable3DAnnotationMode()` | Exit annotation mode |
| `addAnnotation(point, text)` | Add annotation at 3D point |
| `updateAnnotation(id, text)` | Update annotation text |
| `deleteAnnotation(id)` | Delete annotation |
| `getAnnotations()` | Get all 3D annotations |
| `setAnnotationVisible(id, visible)` | Show/hide annotation |
| `showAllAnnotations()` | Show all annotations |
| `hideAllAnnotations()` | Hide all annotations |
| `linkAnnotationToElement(annotationId, elementId)` | Associate with element |

**Markup Data:**
```javascript
// 2D Markup
{
  id: 'markup-001',
  type: 'arrow',
  viewId: 'view-001', // Linked to a saved view
  points: [{x, y}, ...], // Screen coordinates
  color: '#ff0000',
  strokeWidth: 2
}

// 3D Annotation
{
  id: 'annot-001',
  position: {x, y, z}, // World coordinates
  text: 'Check this connection',
  linkedElementId: 'elem-123',
  createdAt: timestamp
}
```

**Events:**
- `markup-create` — Markup drawn
- `markup-delete` — Markup removed
- `annotation-create` — 3D annotation added
- `annotation-click` — Annotation clicked

---

### 11. Persistence

**Purpose:** Save/load viewer state.

#### 11.1 IndexedDB (Auto-save)

| Function | Description |
|----------|-------------|
| `enableAutoSave(intervalMs?)` | Enable auto-save (default 30s) |
| `disableAutoSave()` | Disable auto-save |
| `saveNow()` | Force immediate save |
| `loadLastSession()` | Load most recent session |
| `getSessions()` | List all saved sessions |
| `deleteSession(sessionId)` | Delete a session |
| `clearAllSessions()` | Delete all saved data |

#### 11.2 Export/Import

| Function | Description |
|----------|-------------|
| `exportState()` | Download state as JSON file |
| `importState(file)` | Load state from JSON file |
| `exportViews()` | Export only saved views |
| `importViews(file)` | Import views from file |
| `exportMarkups()` | Export markups/annotations |
| `importMarkups(file)` | Import markups |

**Exported State Structure:**
```javascript
{
  version: '1.0',
  exportedAt: timestamp,
  models: [{ url, name, visible }],
  camera: { position, target },
  hiddenElements: [...],
  clipPlanes: [...],
  views: [...],
  markups: [...],
  annotations: [...],
  measurements: [...]
}
```

---

### 12. UI Components

#### 12.1 Main Toolbar
- Navigation mode buttons (Orbit, Pan, First-Person)
- Zoom to fit button
- Selection mode toggle
- Measurement tools dropdown
- Section plane tools
- Markup tools button
- Views panel toggle
- Properties panel toggle
- Tree panel toggle
- Settings menu

#### 12.2 Properties Panel
- Element name & type header
- Property sets accordion
- Quantity data section
- GlobalId display
- Highlight in model button

#### 12.3 Tree Panel
- Multi-model tree with checkboxes
- Search/filter input
- Expand/collapse all buttons
- Context menu (select, isolate, hide, zoom to)
- Visibility toggles per node
- Model file headers with visibility toggle

#### 12.4 Views Panel
- List of saved views with thumbnails
- Create new view button
- Apply view on click
- Context menu (rename, update, delete, duplicate)

#### 12.5 Markup Toolbar (when in markup mode)
- Tool selection (arrow, rect, circle, freehand, text, cloud)
- Color picker
- Stroke width slider
- Undo/redo buttons
- Exit markup mode button

#### 12.6 Context Menu (right-click)
- Select
- Isolate
- Hide
- Show all
- Zoom to
- Properties
- Add annotation

---

## Implementation Phases

### Phase 1: Core Foundation
1. Project setup (Vite bundler, package.json)
2. Three.js scene initialization
3. IFC.js integration & model loading
4. Basic dark theme CSS
5. Container resize handling

### Phase 2: Navigation & Selection
1. Orbit controls
2. Pan controls
3. Zoom controls
4. First-person mode
5. Raycasting for selection
6. Selection highlighting
7. Multi-select support

### Phase 3: Object Tree & Properties
1. IFC spatial tree extraction
2. Tree UI component
3. Tree-to-model interaction
4. Properties extraction
5. Properties panel UI

### Phase 4: Visibility Controls
1. Element hide/show logic
2. Model-level visibility
3. Isolate functionality
4. Tree checkbox integration
5. Opacity/transparency

### Phase 5: Measurement Tools
1. Point-to-point distance
2. Multi-point distance
3. Area measurement
4. Measurement display labels
5. Snap to geometry
6. Unit conversion

### Phase 6: Sectioning
1. Single clipping plane
2. Multi-plane support
3. Plane manipulation gizmo
4. Section box
5. Clip plane UI controls

### Phase 7: Model Views
1. State capture logic
2. State restore logic
3. Views panel UI
4. Thumbnail capture
5. View CRUD operations

### Phase 8: Markups & Annotations
1. 2D canvas overlay setup
2. Drawing tools (arrow, rect, circle, freehand, text, cloud)
3. 3D annotation pins
4. Annotation panel/popup
5. Markup-to-view linking

### Phase 9: Persistence
1. IndexedDB schema design
2. Auto-save implementation
3. Session management
4. JSON export/import
5. File download/upload UI

### Phase 10: Polish & Bundle
1. Error handling throughout
2. Loading states & progress
3. Keyboard shortcuts
4. Final toolbar assembly
5. Vite production build
6. Demo page with sample IFC files

---

## Demo IFC Files
Will source 2-3 open IFC files:
- Small architectural model (house/small building)
- MEP model (mechanical/electrical systems)
- Structural model (if available)

Sources: OSArch community, IFC.js examples, buildingSMART samples

---

## Public API Summary

```javascript
// Initialize
const viewer = new ModelViewer('#container', {
  theme: 'dark',
  autoSave: true
});

// Load models
await viewer.loadModel('building.ifc', 'Main Building');
await viewer.loadModel('mep.ifc', 'MEP Systems');

// Navigation
viewer.navigation.setMode('orbit');
viewer.navigation.zoomToFit();

// Selection
viewer.selection.select(['element-1', 'element-2']);
viewer.on('selection-change', (ids) => console.log(ids));

// Visibility
viewer.visibility.isolate(['element-1']);
viewer.visibility.hideModel('mep-model-id');

// Properties
const props = viewer.properties.getProperties('element-1');

// Tree
viewer.tree.filterTree('wall');

// Measurement
viewer.measurement.enableDistanceTool();

// Sectioning
viewer.sectioning.addClipPlane('x', 5.0);
viewer.sectioning.createSectionBox();

// Views
viewer.views.createView('Design Review', 'Initial state');
viewer.views.applyView('view-001');

// Markups
viewer.markups.enableMarkupMode();
viewer.markups.setMarkupTool('arrow');
viewer.annotations.addAnnotation({x: 1, y: 2, z: 3}, 'Check here');

// Persistence
viewer.exportState(); // Downloads JSON
viewer.importState(file); // Restores from JSON
```

---

## Questions Resolved
- ✅ File format: IFC
- ✅ Features: Full BIM viewer feature set
- ✅ UI: Batteries-included
- ✅ Theme: Single dark theme
- ✅ Distribution: Script tag
- ✅ Persistence: IndexedDB + Export/Import
- ✅ Tech: Three.js + IFC.js
