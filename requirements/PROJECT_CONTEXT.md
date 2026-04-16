# 3D IFC Model Viewer - Complete Project Context

**Project Name:** 3D Model Viewer (BIM Viewer)
**Purpose:** Reusable, batteries-included 3D IFC Model Viewer as an embeddable JavaScript component
**Tech Stack:** Three.js + IFC.js (OpenBIM Components)
**Distribution:** Script tag (`<script src="model-viewer.js">`)
**Theme:** Single dark theme
**Persistence:** IndexedDB + Export/Import JSON

---

## Project Overview

This is a comprehensive 3D model viewer designed specifically for IFC (Industry Foundation Classes) BIM models. It provides a complete feature set for architectural and construction professionals to view, analyze, and present 3D building models in a web browser.

### Key Characteristics
- **Embeddable**: Distributed as a single JavaScript bundle
- **No Dependencies on Host**: Works independently in any HTML container
- **Dark Theme Only**: Professional dark UI for technical work
- **Multi-Model Support**: Load and work with multiple IFC files simultaneously
- **Rich Feature Set**: 12+ major features including navigation, selection, visibility, measurement, sectioning, and more

---

## File Structure Overview

```
3DModelViewer/
├── src/
│   ├── core/
│   │   ├── ModelViewer.js          # Main entry point class - initializes everything
│   │   ├── SceneManager.js         # Three.js scene setup and rendering
│   │   └── IFCLoader.js            # IFC file loading & parsing using IFC.js
│   ├── features/
│   │   ├── Navigation.js           # Camera controls (orbit, pan, first-person)
│   │   ├── Selection.js            # Object picking & highlighting
│   │   ├── Visibility.js           # Show/hide/isolate/opacity logic
│   │   ├── Measurement.js          # Distance & area tools
│   │   ├── Sectioning.js           # Clipping planes for cross-sections
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
│   └── index.js                    # Bundle entry point
├── demo/
│   ├── index.html                  # Demo page
│   └── models/                     # Demo IFC files
├── dist/
│   └── model-viewer.js             # Built bundle
└── package.json
```

---

## Core Modules Description

### 1. **ModelViewer.js** (Main Entry Point)

The main class that users instantiate. Initializes all features and exposes the public API.

**Responsibilities:**
- Container initialization
- Component lifecycle management
- Event aggregation
- Public API exposure

**Key Methods:**
```javascript
new ModelViewer('#container', options)
loadModel(url, name?)
unloadModel(modelId)
destroy()
getState() / setState(state)
```

**Key Events:**
- All events from sub-features bubble up through the main viewer

---

### 2. **SceneManager.js** (Three.js Scene)

Manages the Three.js scene, camera, renderer, and animation loop.

**Responsibilities:**
- Three.js scene initialization
- Camera setup (perspective camera, ~60° FOV)
- WebGL renderer with anti-aliasing
- Render loop and animation frame management
- Scene lighting setup

**Key Features:**
- Uses requestAnimationFrame for smooth animation
- Handles window resize events
- Provides scene traverse utility for finding objects

---

### 3. **IFCLoader.js** (IFC.js Integration)

Wraps IFC.js for loading and parsing IFC files.

**Responsibilities:**
- Initialize IFC.js library
- Load IFC files from URL
- Parse IFC structure and geometry
- Track loaded models
- Extract element metadata (type, properties, hierarchy)

**Key Methods:**
```javascript
loadModel(url, name) → modelId
getLoadedModels()
getModelById(modelId)
getElementProperties(elementId)
```

---

## Feature Modules

### Feature 1: **Navigation.js** (Camera Controls)

Three distinct navigation modes with camera manipulation.

**Modes:**
1. **Orbit Mode** (default): Right-click drag to rotate around target, scroll to zoom
2. **Pan Mode**: Right-click drag to move camera laterally
3. **First-Person Mode**: WASD movement, mouse look with pointer lock, Escape to exit

**Key Methods:**
```javascript
setMode(mode)  // 'orbit' | 'pan' | 'firstPerson'
orbit(deltaX, deltaY)
pan(deltaX, deltaY)
zoom(delta)
zoomToFit(elementIds?)
zoomToSelection(meshes)
```

**Implementation Details:**
- Uses Three.js OrbitControls for orbit/pan modes
- Custom first-person implementation with velocity-based movement
- Damping for smooth orbit transitions
- Euler angles for first-person camera rotation
- Supports PointerLock API for seamless mouse look

**Events Emitted:**
- `camera-change`: { position, target }
- `mode-change`: { mode }

---

### Feature 2: **Selection.js** (Object Picking)

Raycasting-based element selection with visual highlighting.

**Key Methods:**
```javascript
select(elementIds, meshes)
deselect(elementIds?)
toggleSelect(elementId, mesh)
getSelected() → elementId[]
pickAtPoint(x, y)
setHighlightColor(color)
```

**Implementation Details:**
- Raycaster for mouse-to-3D-space projection
- Highlight material: blue color (#00a8ff) with emissive property
- Hover material: lighter blue (#66ccff)
- Stores original materials for restoration
- **Critical for InstancedMesh**: Combines mesh.matrixWorld with instance matrix for correct world-space calculations
- Multi-select: Ctrl/Cmd+click to add/remove from selection

**Events Emitted:**
- `selection-change`: { selected, added, removed }
- `element-click`: { elementId, mesh, point, face }
- `element-double-click`: { elementId, mesh, point, face }
- `element-hover`: { elementId, mesh }
- `context-menu`: { elementId, mesh, point, face, normal, screenX, screenY }

---

### Feature 3: **Visibility.js** (Show/Hide/Isolate)

Element and model-level visibility control with opacity support.

**Key Methods:**
```javascript
show(elementIds)
hide(elementIds)
toggleVisibility(elementIds)
isolate(elementIds)  // Show only these, hide rest
showAll() / hideAll()
setOpacity(elementIds, opacity)  // X-ray effect
showByType(ifcType) / hideByType(ifcType)
showModel(modelId) / hideModel(modelId) / toggleModel(modelId)
getHiddenElements() / getVisibleElements()
```

**Implementation Details:**
- Tracks hidden elements in a Set for efficient lookups
- Material cloning for opacity changes (avoid affecting shared materials)
- Stores original materials for reset
- Opacity values: 0-1, typically 0.5 for X-ray effects

**Events Emitted:**
- `visibility-change`: { shown, hidden, allHidden, isolated?, byType? }
- `opacity-change`: { elementIds, opacity } or { reset: true }
- `model-visibility-change`: { modelId, visible }

---

### Feature 4: **ObjectTree.js** (Hierarchical Navigation)

Spatial tree structure extracted from IFC model.

**Tree Hierarchy:**
```
Model File
├── IfcSite
│   └── IfcBuilding
│       ├── IfcBuildingStorey (Level 1)
│       │   ├── IfcWall (Wall-001)
│       │   ├── IfcDoor (Door-001)
│       │   └── ...
│       └── IfcBuildingStorey (Level 2)
│           └── ...
```

**Key Methods:**
```javascript
buildTree() → treeData
getTree(modelId?)
getElementIdsByNode(nodeId)
expandNode(nodeId) / collapseNode(nodeId)
expandAll() / collapseAll()
selectNode(nodeId, addToSelection?)
getVisibilityState(nodeId) → 'visible' | 'hidden' | 'mixed'
filterTree(query) → matchingNodeIds
```

**Node Structure:**
```javascript
{
  id: 'model-abc123',
  type: 'model' | 'type-group' | 'element',
  name: 'Model Name',
  elementId: 'elem-456',  // For element nodes only
  children: [],
  elementIds: [],  // Recursive collection of all element IDs
  parentId: 'parent-node-id'
}
```

**Implementation Details:**
- Builds tree by grouping elements by IFC type
- Visibility state calculation with "mixed" state for partial visibility
- Search filter includes all ancestor nodes
- Deduplication of element IDs using Set

**Events Emitted:**
- `tree-built`: { tree }
- `tree-node-select`: { nodeId, elementIds, selected }
- `tree-visibility-toggle`: { nodeId, elementIds, visible }
- `tree-filter`: { query, matchingNodeIds }

---

### Feature 5: **TreePanel.js** (Object Tree UI)

Visual rendering of the object tree with interaction handlers.

**UI Elements:**
- Expandable/collapsible nodes with toggle icons
- Element icons based on IFC type
- Visibility toggles per node
- Search/filter input
- Expand All / Collapse All buttons

**Key Methods:**
```javascript
open() / close() / toggle()
refresh() / render()
updateVisibility()
```

**Interaction:**
- Click node: select element(s)
- Ctrl+click: add to selection
- Double-click: zoom to element
- Click visibility icon: toggle visibility
- Type in search: filter tree
- Right-click: context menu

**CSS Classes:**
```css
.mv-tree-panel
.mv-tree-node
.mv-tree-node-row
.mv-tree-toggle
.mv-tree-visibility
.mv-tree-search
```

---

### Feature 6: **Measurement.js** (Distance & Area)

Measurement tools for taking distances and calculating areas.

**Key Methods:**
```javascript
enableDistanceTool() / enableAreaTool()
disableMeasurement()
getMeasurements()
deleteMeasurement(id)
clearMeasurements()
setUnit(unit)  // 'mm', 'cm', 'm', 'ft', 'in'
setSnapEnabled(enabled)
setPrecision(decimals)
```

**Measurement Data:**
```javascript
{
  id: 'meas-001',
  type: 'distance' or 'area',
  points: [{x, y, z}, ...],
  value: 5.25,
  unit: 'm',
  label: '5.25 m'
}
```

**Implementation Details:**
- Snap-to-geometry for edges and vertices
- Multi-point measurement (user clicks multiple points)
- 3D labels showing measurements in scene space
- Unit conversion between metric and imperial

**Events Emitted:**
- `measurement-start`
- `measurement-complete`
- `measurement-delete`

---

### Feature 7: **Sectioning.js** (Clipping Planes)

Cross-section view creation using clipping planes.

**Key Methods:**
```javascript
addClipPlane(axis, position?) / addClipPlaneCustom(normal, point)
removeClipPlane(planeId)
clearClipPlanes()
getClipPlanes()
setPlanePosition(planeId, position)
flipPlane(planeId)
createSectionBox()  // 6-plane box around bounds
```

**Implementation Details:**
- Uses Three.js clipping planes with local clipping enabled
- **Critical**: Normal must be negated for correct clipping direction (Three.js clips on positive side)
- Visual helpers: semi-transparent plane, border outline, direction arrow
- Draggable plane gizmo for interactive manipulation
- **Important**: When moving plane, use `plane.constant += distance` (not `-=`)

**Plane Data:**
```javascript
{
  id: 'plane-001',
  normal: {x, y, z},  // Original normal (before negation)
  plane: THREE.Plane,
  point: {x, y, z},
  enabled: true,
  visible: true,
  helper: THREE.Group
}
```

**Events Emitted:**
- `plane-add`
- `plane-remove`
- `plane-move`
- `drag-start` / `drag-end`

---

### Feature 8: **ModelViews.js** (Saved View States)

Save and restore complete viewer configurations.

**Saved State Includes:**
- Camera position & target
- Hidden elements list
- Selected elements
- Navigation mode
- Clipping planes
- Opacity states

**Key Methods:**
```javascript
createView(name, description?) → viewId
applyView(viewId)
updateView(viewId)
deleteView(viewId)
getViews()
renameView(viewId, name)
duplicateView(viewId)
```

**State Structure:**
```javascript
{
  version: '1.0',
  exportedAt: timestamp,
  models: [{ url, name, visible }],
  camera: { position, target },
  hiddenElements: [...],
  selectedElements: [...],
  clipPlanes: [...],
  measurements: [...],
  annotations: [...]
}
```

**Events Emitted:**
- `view-create`: { viewId, name }
- `view-apply`: { viewId }
- `view-delete`: { viewId }

---

### Feature 9: **Markups.js** (Annotations)

2D overlay drawing and 3D annotation pins.

**2D Markup Tools:**
- Arrow
- Rectangle
- Circle
- Freehand
- Text
- Cloud annotation

**3D Annotations:**
- Position pins at 3D points
- Attached to view states
- Can link to elements

**Key Methods:**
```javascript
enableMarkupMode() / disableMarkupMode()
setMarkupTool(tool)
setMarkupColor(color)
setMarkupStrokeWidth(width)
undoMarkup() / redoMarkup()
deleteMarkup(markupId)
clearMarkups()
getMarkups()
enable3DAnnotationMode() / disable3DAnnotationMode()
addAnnotation(point, text)
updateAnnotation(id, text)
deleteAnnotation(id)
linkAnnotationToElement(annotationId, elementId)
```

**Markup Data:**
```javascript
{
  id: 'markup-001',
  type: 'arrow' | 'rect' | 'circle' | 'text' | 'freehand' | 'cloud',
  viewId: 'view-001',
  points: [{x, y}, ...],  // Screen coordinates
  color: '#ff0000',
  strokeWidth: 2
}
```

**Events Emitted:**
- `markup-create`
- `markup-delete`
- `annotation-create`
- `annotation-click`

---

### Feature 10: **PropertiesPanel.js** (Element Info)

Displays IFC property sets and element metadata.

**Displayed Information:**
- Element name & IFC type
- GlobalId
- Property sets (grouped by category)
- Quantity data (volume, area, etc.)
- Custom properties from IFC

**Key Methods:**
```javascript
show(elementId)
updateProperties(elementId)
clearProperties()
```

---

### Feature 11: **Toolbar.js** (Main UI Controls)

Top toolbar with buttons for all major features.

**Toolbar Sections:**
1. **Navigation Controls**: Orbit, Pan, First-Person mode buttons
2. **Zoom Controls**: Zoom to fit, Zoom to selection
3. **Selection Mode**: Toggle between select/pan
4. **Measurement**: Distance, Area tool buttons
5. **Sectioning**: Add section plane button
6. **Markup**: Enable markup mode, tool selection
7. **View Management**: Save/Load view buttons
8. **Panel Toggles**: Tree, Properties, Views panels
9. **Settings**: General settings menu

**Button States:**
- Active state highlighting for current mode
- Disabled state for unavailable actions
- Tooltips for all buttons

---

### Feature 12: **ContextMenu.js** (Right-Click Menu)

Context menu shown on right-click with context-aware actions.

**Menu Items:**
- Create Section Plane (if face selected)
- Isolate
- Hide
- Show All
- Zoom to Fit
- Properties

**Positioning:** Appears at cursor, repositions if near screen edges

---

## UI Components Overview

### Dark Theme
- **Primary Background**: #1e1e1e
- **Secondary Background**: #2d2d2d
- **Text Color**: #cccccc
- **Accent Color**: #00a8ff (light blue)
- **Highlight Color**: #00a8ff with 0.3 emissive intensity
- **Border Color**: #3c3c3c

### Layout
- **Toolbar**: Fixed top, 50px height
- **Left Panel**: Object tree, 280px width, collapsible
- **Right Panel**: Properties panel, ~300px width, collapsible
- **Bottom**: Status bar with element count and mode display
- **Main Area**: 3D viewport fills remaining space

---

## Data Flow & Architecture

### Initialization Flow
1. User creates `new ModelViewer(container, options)`
2. ModelViewer initializes SceneManager (Three.js setup)
3. ModelViewer initializes all feature modules
4. UI components (Toolbar, Panels) are created and injected with event listeners
5. ModelViewer is ready to accept models

### Loading a Model Flow
1. `viewer.loadModel(url, name)`
2. IFCLoader.loadModel() → loads IFC file
3. IFC.js parses geometry and creates Three.js objects
4. SceneManager adds objects to scene
5. ObjectTree.buildTree() extracts hierarchy
6. TreePanel.render() displays hierarchy
7. ModelViewer emits `model-loaded` event

### Selection Flow
1. User clicks 3D element
2. Selection.raycast() → finds nearest mesh
3. Selection.select() → applies highlight material
4. Selection emits `selection-change`
5. Listeners: PropertiesPanel updates, TreePanel highlights node, Toolbar updates

### Visibility Toggle Flow
1. User clicks hide icon or calls visibility.hide()
2. Visibility.hide() → sets mesh.visible = false, tracks in Set
3. Visibility emits `visibility-change`
4. TreePanel updates visibility icon state

---

## External Dependencies

### Core Libraries
- **Three.js** (r128): 3D graphics rendering
- **IFC.js**: IFC file parsing and loading
- **OrbitControls.js**: Three.js orbit camera control addon

### Optional
- **IndexedDB**: Browser storage for session persistence
- **FileReader API**: For import/export JSON

### Build Tools
- **Vite**: Fast module bundler (recommended for development)
- **Rollup/Webpack**: Alternative bundlers for production

---

## State Management Patterns

### Feature State
Each feature module maintains its own state:
- Selection: `selectedElements` Map
- Visibility: `hiddenElements` Set, `elementOpacities` Map
- Navigation: `mode`, `controls`, camera position
- ObjectTree: `expandedNodes` Set, `selectedNodes` Set, `visibilityState` Map

### Global State
ModelViewer aggregates all feature states via `getState()`:
```javascript
{
  models: [...],
  camera: { position, target },
  hiddenElements: [...],
  selectedElements: [...],
  sectionPlanes: [...],
  navigationMode: 'orbit',
  ...
}
```

### Event-Driven Communication
- Features emit events specific to their domain
- UI components listen to feature events
- ModelViewer can listen to all events and re-emit

---

## Integration Points

### Using the Viewer

```javascript
// Initialize
const viewer = new ModelViewer('#container', {
  theme: 'dark',
  autoSave: true,
  enableMeasurement: true
});

// Load models
await viewer.loadModel('/models/building.ifc', 'Main Building');

// Interact programmatically
viewer.selection.select(['element-1']);
viewer.visibility.isolate(['element-1']);
viewer.navigation.zoomToFit();

// Listen to events
viewer.on('selection-change', (ids) => {
  console.log('Selected:', ids);
});

// Save/restore state
const state = viewer.getState();
viewer.setState(savedState);

// Cleanup
viewer.destroy();
```

---

## Known Implementation Gotchas

1. **InstancedMesh Handling**: IFC.js uses InstancedMesh. When raycasting or calculating normals, must combine `mesh.matrixWorld` with instance matrix.

2. **Plane Clipping Direction**: Three.js clips on positive side of plane normal. Must negate face normal for "behind the face" clipping.

3. **Material Cloning**: When modifying mesh materials (highlighting, opacity), clone them first to avoid affecting other meshes sharing the same material.

4. **Element ID Stability**: IFC express IDs are stable, UUIDs are not. Use express IDs when available for persistence.

5. **View State Restoration**: Assumes models are already loaded before restoring visibility/selection states.

6. **Performance**: Large models (50k+ elements) may be slow. Consider LOD, frustum culling, or InstancedMesh optimization.

7. **Hover vs Selection**: Don't apply hover highlight to already-selected elements. Hover should not change selected material.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| O | Orbit mode |
| P | Pan mode |
| F | First-person mode |
| H | Hide selected |
| I | Isolate selected |
| Home | Zoom to fit |
| Escape | Exit first-person, deselect all |
| WASD | Move (first-person) |
| Space | Move up (first-person) |
| Shift | Move down (first-person) |
| Ctrl+Click | Add to selection |
| Double-Click | Zoom to element |
| Right-Click | Context menu |

---

## Build & Distribution

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
# Outputs: dist/model-viewer.js (single bundled file)
```

### Usage in HTML
```html
<div id="viewer" style="width: 100%; height: 100vh;"></div>
<script src="dist/model-viewer.js"></script>
<script>
  const viewer = new ModelViewer('#viewer');
  viewer.loadModel('/models/building.ifc');
</script>
```

---

## Testing Recommendations

1. **Unit Tests**: Feature modules (Selection, Visibility, Navigation)
2. **Integration Tests**: ModelViewer initialization, model loading
3. **E2E Tests**: Full user workflows (load model → select → measure → save state)
4. **Performance Tests**: Large model rendering, memory usage
5. **Compatibility Tests**: Different browsers, IFC file versions

---

## Performance Optimization Tips

1. **Frustum Culling**: Three.js enables automatically, ensure camera setup is correct
2. **LOD (Level of Detail)**: Large models should have simplified versions
3. **InstancedMesh**: IFC.js already uses this, leverages GPU instancing
4. **Mesh Merging**: Combine static geometry when possible
5. **Event Throttling**: Limit camera-change events
6. **Material Pooling**: Reuse materials instead of creating new ones
7. **Memory Management**: Call destroy() to cleanup resources

---

## Future Enhancement Ideas

1. Measurement tools with snapping to edges
2. Advanced filtering (by property, type, layer)
3. Schedule visualization (4D/temporal)
4. Collaboration features (multi-user annotations)
5. MEP-specific tools (ductwork, piping)
6. Export to different formats (glTF, USDZ)
7. AR/VR support
8. Real-time model updates
9. BIM clash detection
10. Cost/schedule analysis

---

## Documentation Files Included

- `navigation.md` - Detailed Navigation implementation spec
- `selection.md` - Detailed Selection implementation spec
- `objecttree.md` - Detailed ObjectTree implementation spec
- `visibility.md` - Detailed Visibility implementation spec
- `viewstates.md` - Detailed View States implementation spec
- `sectionplane.md` - Detailed Section Plane implementation spec
- `onboarding-mockup.html` - UI mockup reference

---

## Quick Reference: API Examples

```javascript
// Basic setup
const viewer = new ModelViewer('#container');

// Model management
viewer.loadModel('building.ifc', 'Main');
viewer.unloadModel(modelId);
viewer.getLoadedModels();

// Navigation
viewer.navigation.setMode('orbit');
viewer.navigation.zoomToFit();
viewer.navigation.zoomToSelection(meshes);

// Selection
viewer.selection.select(elementIds);
viewer.selection.getSelected();
viewer.selection.deselect();

// Visibility
viewer.visibility.hide(elementIds);
viewer.visibility.isolate(elementIds);
viewer.visibility.showAll();
viewer.visibility.setOpacity(elementIds, 0.5);

// Object Tree
viewer.objectTree.buildTree();
viewer.objectTree.filterTree('wall');
viewer.objectTree.expandAll();

// Measurement
viewer.measurement.enableDistanceTool();
viewer.measurement.getMeasurements();

// Sectioning
viewer.sectioning.addClipPlane('x', 5.0);
viewer.sectioning.clearClipPlanes();

// View States
viewer.saveViewState('View 1');
viewer.loadViewState(viewId);
viewer.exportViewState(viewId);

// State
const state = viewer.getState();
viewer.setState(state);

// Cleanup
viewer.destroy();
```

---

**Last Updated:** January 2024
**Version:** 1.0
**Status:** Implementation Ready
