# View States Feature - Implementation Requirements

## Overview

Implement view state save/restore functionality for a Three.js-based 3D model viewer. Users can save the current view (camera, visibility, selection, section planes) and restore it later.

## User Interaction Flow

1. User sets up desired view (camera position, hidden elements, section planes)
2. User saves the view state → state stored (localStorage or exported)
3. User makes changes to the view
4. User restores saved state → view returns to saved configuration

## Technical Requirements

### 1. State Structure

```javascript
{
  // Metadata
  id: 'view-001',
  name: 'Floor Plan View',
  timestamp: 1704067200000,

  // Camera
  camera: {
    position: { x: 10, y: 5, z: 15 },
    target: { x: 0, y: 0, z: 0 }
  },

  // Loaded models
  models: [
    { id: 'model-1', name: 'Building.ifc', url: '/models/building.ifc' }
  ],

  // Visibility
  hiddenElements: ['elem-1', 'elem-2', ...],

  // Selection
  selectedElements: ['elem-5', 'elem-6'],

  // Navigation mode
  navigationMode: 'orbit',

  // Section planes
  sectionPlanes: {
    clipPlanes: [
      {
        id: 'plane-001',
        normal: { x: 0, y: 0, z: 1 },
        constant: -5.2,
        enabled: true,
        visible: true
      }
    ]
  }
}
```

### 2. ModelViewer getState/setState

```javascript
// In ModelViewer.js

getState() {
  return {
    models: this.getLoadedModels(),
    camera: this.navigation.getCamera(),
    hiddenElements: this.visibility.getHiddenElements(),
    selectedElements: this.selection.getSelected(),
    navigationMode: this.navigation.getMode(),
    sectionPlanes: this.sectioning.getState()
  };
}

setState(state) {
  // Restore visibility
  if (state.hiddenElements && state.hiddenElements.length > 0) {
    this.visibility.hide(state.hiddenElements);
  }

  // Restore selection
  if (state.selectedElements && state.selectedElements.length > 0) {
    this.selection.selectByIds(state.selectedElements);
  }

  // Restore navigation mode
  if (state.navigationMode) {
    this.navigation.setMode(state.navigationMode);
  }

  // Restore camera
  if (state.camera) {
    const position = new THREE.Vector3(
      state.camera.position.x,
      state.camera.position.y,
      state.camera.position.z
    );
    const target = new THREE.Vector3(
      state.camera.target.x,
      state.camera.target.y,
      state.camera.target.z
    );
    this.navigation.setCamera(position, target);
  }

  // Restore section planes
  if (state.sectionPlanes) {
    this.sectioning.setState(state.sectionPlanes);
  }
}
```

### 3. Sectioning getState/setState

```javascript
// In Sectioning.js

getState() {
  const planes = [];

  this.clipPlanes.forEach(planeData => {
    planes.push({
      id: planeData.id,
      normal: {
        x: planeData.normal.x,
        y: planeData.normal.y,
        z: planeData.normal.z
      },
      constant: planeData.plane.constant,
      enabled: planeData.enabled,
      visible: planeData.visible
    });
  });

  return { clipPlanes: planes };
}

setState(state) {
  if (!state || !state.clipPlanes) return;

  // Clear existing planes
  this.clearClipPlanes();

  // Recreate planes from state
  state.clipPlanes.forEach(planeState => {
    const normal = new THREE.Vector3(
      planeState.normal.x,
      planeState.normal.y,
      planeState.normal.z
    );

    // Calculate point from normal and constant
    // plane equation: n·p + d = 0, so p = -d * n (for point on plane)
    const point = normal.clone().multiplyScalar(-planeState.constant);

    const id = this.addClipPlane(normal, point);

    // Restore enabled/visible state
    if (!planeState.enabled) {
      this.setPlaneEnabled(id, false);
    }
    if (!planeState.visible) {
      this.setPlaneVisible(id, false);
    }
  });
}
```

### 4. LocalStorage Persistence (Optional)

```javascript
// ViewStateManager class (optional utility)

class ViewStateManager {
  constructor(storageKey = 'modelviewer-states') {
    this.storageKey = storageKey;
  }

  save(name, state) {
    const states = this.getAll();
    const id = `view-${Date.now()}`;

    states[id] = {
      id,
      name,
      timestamp: Date.now(),
      ...state
    };

    localStorage.setItem(this.storageKey, JSON.stringify(states));
    return id;
  }

  load(id) {
    const states = this.getAll();
    return states[id] || null;
  }

  getAll() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }

  delete(id) {
    const states = this.getAll();
    delete states[id];
    localStorage.setItem(this.storageKey, JSON.stringify(states));
  }

  export(id) {
    const state = this.load(id);
    return JSON.stringify(state, null, 2);
  }

  import(jsonString) {
    const state = JSON.parse(jsonString);
    return this.save(state.name || 'Imported View', state);
  }
}
```

### 5. API Methods in ModelViewer

```javascript
// Save current state
saveViewState(name) {
  const state = this.getState();
  const id = this.viewStateManager.save(name, state);
  this.emit('view-state-saved', { id, name });
  return id;
}

// Load saved state
loadViewState(id) {
  const state = this.viewStateManager.load(id);
  if (state) {
    this.setState(state);
    this.emit('view-state-loaded', { id });
  }
}

// Get all saved states
getSavedViewStates() {
  return this.viewStateManager.getAll();
}

// Delete saved state
deleteViewState(id) {
  this.viewStateManager.delete(id);
  this.emit('view-state-deleted', { id });
}

// Export state as JSON
exportViewState(id) {
  return this.viewStateManager.export(id);
}

// Import state from JSON
importViewState(json) {
  const id = this.viewStateManager.import(json);
  this.emit('view-state-imported', { id });
  return id;
}
```

## Events Emitted

| Event | Data | When |
|-------|------|------|
| `view-state-saved` | `{ id, name }` | State saved |
| `view-state-loaded` | `{ id }` | State restored |
| `view-state-deleted` | `{ id }` | State deleted |
| `view-state-imported` | `{ id }` | State imported |

## State Serialization Notes

### Camera
- Position and target as plain objects `{ x, y, z }`
- THREE.Vector3 objects need `.toArray()` or manual extraction

### Section Planes
- Store `normal` and `constant` (plane equation)
- Reconstruct point from `point = -constant * normal`
- Remember: stored normal may be negated from visual normal

### Element IDs
- Store as array of strings
- May be IFC express IDs or UUIDs

## Key Gotchas

1. **Model Loading Order**: State restore assumes models are already loaded. May need to wait for model load before applying visibility/selection.

2. **Element ID Stability**: Element IDs should be stable across sessions. IFC express IDs are stable; UUIDs are not.

3. **Section Plane Reconstruction**: The plane constant + normal is sufficient to recreate the plane position.

4. **THREE.js Objects**: Must convert Vector3/Matrix4 to plain objects for JSON serialization.

5. **Partial State**: Handle cases where some state properties are missing (backwards compatibility).

## Integration Example

```javascript
// Save current view
document.getElementById('save-view').addEventListener('click', () => {
  const name = prompt('View name:');
  if (name) {
    viewer.saveViewState(name);
  }
});

// Load view from dropdown
document.getElementById('view-select').addEventListener('change', (e) => {
  const id = e.target.value;
  if (id) {
    viewer.loadViewState(id);
  }
});

// Populate view dropdown
function updateViewList() {
  const states = viewer.getSavedViewStates();
  const select = document.getElementById('view-select');
  select.innerHTML = '<option value="">Select view...</option>';

  Object.values(states).forEach(state => {
    const option = document.createElement('option');
    option.value = state.id;
    option.textContent = state.name;
    select.appendChild(option);
  });
}
```

## File Export/Import

```javascript
// Export to file
function downloadViewState(id) {
  const json = viewer.exportViewState(id);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `view-${id}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// Import from file
function importViewStateFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const id = viewer.importViewState(e.target.result);
    updateViewList();
  };
  reader.readAsText(file);
}
```
