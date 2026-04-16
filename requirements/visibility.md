# Visibility Feature - Implementation Requirements

## Overview

Implement element visibility controls for a Three.js-based 3D model viewer. Users can show, hide, and isolate model elements individually or in groups.

## User Interaction Flow

1. User selects elements and clicks "Hide" → selected elements become invisible
2. User clicks "Show All" → all hidden elements become visible
3. User selects elements and clicks "Isolate" → only selected elements visible, all others hidden
4. User can show/hide by IFC type (e.g., hide all walls)
5. User can adjust element opacity for X-ray effects

## Technical Requirements

### 1. Visibility Class (`src/features/Visibility.js`)

```javascript
class Visibility {
  constructor(sceneManager)

  // Core visibility
  show(elementIds)
  hide(elementIds)
  toggleVisibility(elementIds)
  showAll()
  hideAll()

  // Isolation
  isolate(elementIds)  // Show only these, hide everything else

  // By type
  showByType(ifcType)
  hideByType(ifcType)

  // By model
  showModel(modelId)
  hideModel(modelId)
  toggleModel(modelId)

  // Opacity
  setOpacity(elementIds, opacity)
  resetOpacity()

  // Queries
  getHiddenElements() → elementId[]
  getVisibleElements() → elementId[]

  // Events
  on('visibility-change' | 'opacity-change' | 'model-visibility-change')
}
```

### 2. Mesh Lookup

Find meshes by element ID:

```javascript
getMeshByElementId(elementId) {
  let foundMesh = null;
  this.scene.traverse((object) => {
    if (object.isMesh) {
      const id = object.userData?.expressID || object.uuid;
      if (id === elementId) {
        foundMesh = object;
      }
    }
  });
  return foundMesh;
}

getMeshesByElementIds(elementIds) {
  const meshes = [];
  this.scene.traverse((object) => {
    if (object.isMesh) {
      const id = object.userData?.expressID || object.uuid;
      if (elementIds.includes(id)) {
        meshes.push({ id, mesh: object });
      }
    }
  });
  return meshes;
}
```

### 3. Show/Hide Implementation

Use Three.js `visible` property:

```javascript
hide(elementIds) {
  if (!Array.isArray(elementIds)) elementIds = [elementIds];

  const hidden = [];
  const meshes = this.getMeshesByElementIds(elementIds);

  meshes.forEach(({ id, mesh }) => {
    if (mesh && mesh.visible) {
      mesh.visible = false;
      this.hiddenElements.add(id);
      hidden.push(id);
    }
  });

  if (hidden.length > 0) {
    this.emit('visibility-change', {
      shown: [],
      hidden,
      allHidden: Array.from(this.hiddenElements)
    });
  }
}

show(elementIds) {
  if (!Array.isArray(elementIds)) elementIds = [elementIds];

  const shown = [];
  const meshes = this.getMeshesByElementIds(elementIds);

  meshes.forEach(({ id, mesh }) => {
    if (mesh && !mesh.visible) {
      mesh.visible = true;
      this.hiddenElements.delete(id);
      shown.push(id);
    }
  });

  if (shown.length > 0) {
    this.emit('visibility-change', {
      shown,
      hidden: [],
      allHidden: Array.from(this.hiddenElements)
    });
  }
}
```

### 4. Isolate Implementation

```javascript
isolate(elementIds) {
  if (!Array.isArray(elementIds)) elementIds = [elementIds];

  const shown = [];
  const hidden = [];

  this.scene.traverse((object) => {
    if (object.isMesh) {
      const id = object.userData?.expressID || object.uuid;

      if (elementIds.includes(id)) {
        // Show isolated elements
        if (!object.visible) {
          object.visible = true;
          this.hiddenElements.delete(id);
          shown.push(id);
        }
      } else {
        // Hide everything else
        if (object.visible) {
          object.visible = false;
          this.hiddenElements.add(id);
          hidden.push(id);
        }
      }
    }
  });

  this.emit('visibility-change', {
    shown,
    hidden,
    isolated: elementIds,
    allHidden: Array.from(this.hiddenElements)
  });
}
```

### 5. Show All

```javascript
showAll() {
  const shown = [];

  this.scene.traverse((object) => {
    if (object.isMesh && !object.visible) {
      object.visible = true;
      const id = object.userData?.expressID || object.uuid;
      shown.push(id);
    }
  });

  this.hiddenElements.clear();

  if (shown.length > 0) {
    this.emit('visibility-change', {
      shown,
      hidden: [],
      allHidden: []
    });
  }
}
```

### 6. Visibility by IFC Type

```javascript
hideByType(ifcType) {
  const hidden = [];

  this.scene.traverse((object) => {
    if (object.isMesh) {
      const type = object.userData?.type || object.userData?.ifcType;
      if (type === ifcType && object.visible) {
        object.visible = false;
        const id = object.userData?.expressID || object.uuid;
        this.hiddenElements.add(id);
        hidden.push(id);
      }
    }
  });

  if (hidden.length > 0) {
    this.emit('visibility-change', {
      shown: [],
      hidden,
      byType: ifcType,
      allHidden: Array.from(this.hiddenElements)
    });
  }
}
```

### 7. Opacity Control

```javascript
setOpacity(elementIds, opacity) {
  if (!Array.isArray(elementIds)) elementIds = [elementIds];

  const meshes = this.getMeshesByElementIds(elementIds);

  meshes.forEach(({ id, mesh }) => {
    if (mesh && mesh.material) {
      // Store original material
      if (!this.originalMaterials.has(id)) {
        this.originalMaterials.set(id, mesh.material.clone());
      }

      // Clone material to avoid affecting shared materials
      if (mesh.material === this.originalMaterials.get(id)) {
        mesh.material = mesh.material.clone();
      }

      mesh.material.transparent = true;
      mesh.material.opacity = opacity;
      mesh.material.needsUpdate = true;

      this.elementOpacities.set(id, opacity);
    }
  });

  this.emit('opacity-change', { elementIds, opacity });
}

resetOpacity() {
  this.originalMaterials.forEach((originalMaterial, id) => {
    const mesh = this.getMeshByElementId(id);
    if (mesh) {
      mesh.material = originalMaterial;
      mesh.material.needsUpdate = true;
    }
  });

  this.originalMaterials.clear();
  this.elementOpacities.clear();

  this.emit('opacity-change', { reset: true });
}
```

### 8. Model-Level Visibility

```javascript
hideModel(modelId) {
  this.scene.traverse((object) => {
    if (object.userData?.modelId === modelId) {
      object.visible = false;
      object.traverse((child) => {
        if (child.isMesh) {
          child.visible = false;
          const id = child.userData?.expressID || child.uuid;
          this.hiddenElements.add(id);
        }
      });
    }
  });

  this.emit('model-visibility-change', { modelId, visible: false });
}
```

## Events Emitted

| Event | Data | When |
|-------|------|------|
| `visibility-change` | `{ shown, hidden, allHidden, isolated?, byType? }` | Elements shown/hidden |
| `opacity-change` | `{ elementIds, opacity } or { reset: true }` | Opacity changed |
| `model-visibility-change` | `{ modelId, visible }` | Model shown/hidden |

## Data Structures

```javascript
// Track hidden elements
this.hiddenElements = new Set(); // elementId

// Track opacity changes (for reset)
this.elementOpacities = new Map(); // elementId -> opacity
this.originalMaterials = new Map(); // elementId -> material
```

## Integration with ModelViewer

```javascript
// In ModelViewer.js
this.visibility = new Visibility(this.sceneManager);

// Toolbar actions
handleToolbarAction(action) {
  switch (action) {
    case 'showAll':
      this.visibility.showAll();
      break;
    case 'hideSelected':
      const selected = this.selection.getSelected();
      if (selected.length > 0) {
        this.visibility.hide(selected);
        this.selection.deselect();
      }
      break;
    case 'isolateSelected':
      const isolated = this.selection.getSelected();
      if (isolated.length > 0) {
        this.visibility.isolate(isolated);
      }
      break;
  }
}

// Keyboard shortcuts
// H - Hide selected
// I - Isolate selected
```

## State Persistence

```javascript
// Save state
getHiddenElements() {
  return Array.from(this.hiddenElements);
}

// Restore state
restoreHiddenElements(elementIds) {
  this.hide(elementIds);
}
```

## Key Gotchas

1. **Array Input**: Always normalize input to array for consistent handling.

2. **Material Cloning**: Clone materials before modifying opacity to avoid affecting shared materials.

3. **Hidden Elements Tracking**: Keep `hiddenElements` Set in sync with actual mesh visibility.

4. **Deselect After Hide**: When hiding selected elements, deselect them so user sees visual feedback.

## Cleanup

```javascript
destroy() {
  this.resetOpacity();
  this.showAll();
  this.eventListeners.clear();
}
```
