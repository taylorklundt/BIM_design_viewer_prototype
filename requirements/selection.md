# Selection Feature - Implementation Requirements

## Overview

Implement element selection for a Three.js-based 3D model viewer. Users can click to select model elements, with visual feedback through material highlighting.

## User Interaction Flow

1. User clicks on a model element → element is selected and highlighted
2. User Ctrl/Cmd+clicks → adds/removes element from selection (multi-select)
3. User clicks empty space → deselects all
4. User hovers over element → element shows hover highlight
5. User double-clicks element → emits double-click event (for zoom-to-fit)
6. User right-clicks element → emits context-menu event with intersection data

## Technical Requirements

### 1. Selection Class (`src/features/Selection.js`)

```javascript
class Selection {
  constructor(sceneManager)

  // Core selection
  select(elementIds, meshes)
  deselect(elementIds?)  // undefined = deselect all
  toggleSelect(elementId, mesh)
  getSelected() → elementId[]
  getSelectedMeshes() → mesh[]

  // Programmatic selection
  selectByIds(elementIds)
  pickAtPoint(x, y) → { elementId, mesh, point, face }

  // Hover
  setHoverEnabled(enabled)

  // Customization
  setHighlightColor(color)

  // Events
  on('selection-change' | 'element-click' | 'element-double-click' | 'element-hover' | 'context-menu')
}
```

### 2. Raycasting

Use Three.js Raycaster to detect clicked elements:

```javascript
raycast(event) {
  // Convert mouse position to normalized device coordinates
  const rect = this.domElement.getBoundingClientRect();
  this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  this.raycaster.setFromCamera(this.mouse, this.camera);

  // Get all visible meshes
  const meshes = [];
  this.scene.traverse((object) => {
    if (object.isMesh && object.visible) {
      meshes.push(object);
    }
  });

  return this.raycaster.intersectObjects(meshes, false);
}
```

### 3. Element ID Extraction

Elements may have IFC express IDs or use Three.js UUIDs:

```javascript
getElementId(mesh) {
  return mesh.userData?.expressID || mesh.uuid;
}
```

### 4. Material Highlighting

Store original materials and apply highlight materials:

```javascript
// Highlight material for selected elements
this.highlightMaterial = new THREE.MeshStandardMaterial({
  color: 0x00a8ff,
  emissive: 0x00a8ff,
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.9
});

// Hover material (lighter)
this.hoverMaterial = new THREE.MeshStandardMaterial({
  color: 0x66ccff,
  emissive: 0x66ccff,
  emissiveIntensity: 0.2,
  transparent: true,
  opacity: 0.8
});

applyHighlight(mesh) {
  // Store original material
  if (!this.originalMaterials.has(mesh.uuid)) {
    this.originalMaterials.set(mesh.uuid, mesh.material);
  }
  mesh.material = this.highlightMaterial.clone();
}

removeHighlight(mesh) {
  const original = this.originalMaterials.get(mesh.uuid);
  if (original) {
    mesh.material = original;
    this.originalMaterials.delete(mesh.uuid);
  }
}
```

### 5. Multi-Select Logic

```javascript
onClick(event) {
  const intersects = this.raycast(event);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const elementId = this.getElementId(mesh);

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      this.toggleSelect(elementId, mesh);
    } else {
      // Replace selection
      this.deselect();
      this.select([elementId], [mesh]);
    }
  } else {
    // Clicked empty space
    if (!event.ctrlKey && !event.metaKey) {
      this.deselect();
    }
  }
}
```

### 6. Hover Interaction

```javascript
onMouseMove(event) {
  if (!this.hoverEnabled) return;

  const intersects = this.raycast(event);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;

    if (this.hoveredElement !== mesh) {
      // Remove previous hover
      if (this.hoveredElement) {
        this.removeHover(this.hoveredElement);
      }

      // Apply hover (only if not selected)
      const elementId = this.getElementId(mesh);
      if (!this.selectedElements.has(elementId)) {
        this.applyHover(mesh);
      }

      this.hoveredElement = mesh;
      this.emit('element-hover', { elementId, mesh });
    }
  } else {
    if (this.hoveredElement) {
      this.removeHover(this.hoveredElement);
      this.hoveredElement = null;
      this.emit('element-hover', { elementId: null, mesh: null });
    }
  }
}
```

### 7. Context Menu Support (Right-Click)

Capture intersection data including world-space normal for section planes:

```javascript
onContextMenu(event) {
  event.preventDefault();
  const intersects = this.raycast(event);

  if (intersects.length > 0) {
    const intersection = intersects[0];
    const mesh = intersection.object;

    // CRITICAL: Handle InstancedMesh correctly
    mesh.updateMatrixWorld(true);

    const geometry = mesh.geometry;
    const positionAttribute = geometry.getAttribute('position');
    const face = intersection.face;

    // Get face vertices
    const vA = new THREE.Vector3().fromBufferAttribute(positionAttribute, face.a);
    const vB = new THREE.Vector3().fromBufferAttribute(positionAttribute, face.b);
    const vC = new THREE.Vector3().fromBufferAttribute(positionAttribute, face.c);

    // Build world matrix - include instance transform for InstancedMesh
    let worldMatrix = mesh.matrixWorld.clone();
    if (mesh.isInstancedMesh && intersection.instanceId !== undefined) {
      const instanceMatrix = new THREE.Matrix4();
      mesh.getMatrixAt(intersection.instanceId, instanceMatrix);
      worldMatrix = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, instanceMatrix);
    }

    // Transform to world space
    vA.applyMatrix4(worldMatrix);
    vB.applyMatrix4(worldMatrix);
    vC.applyMatrix4(worldMatrix);

    // Compute normal from cross product
    const edge1 = new THREE.Vector3().subVectors(vB, vA);
    const edge2 = new THREE.Vector3().subVectors(vC, vA);
    const worldNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    this.emit('context-menu', {
      elementId,
      mesh,
      point: intersection.point.clone(),
      face: intersection.face,
      normal: worldNormal,
      screenX: event.clientX,
      screenY: event.clientY
    });
  }
}
```

## Events Emitted

| Event | Data | When |
|-------|------|------|
| `selection-change` | `{ selected, added, removed }` | Selection changes |
| `element-click` | `{ elementId, mesh, point, face }` | Element clicked |
| `element-double-click` | `{ elementId, mesh, point, face }` | Element double-clicked |
| `element-hover` | `{ elementId, mesh, point }` | Hover changes |
| `context-menu` | `{ elementId, mesh, point, face, normal, screenX, screenY }` | Right-click |

## Key Gotchas

1. **InstancedMesh**: IFC.js uses InstancedMesh. Must combine `mesh.matrixWorld` with instance matrix for correct world-space calculations.

2. **Material Cloning**: Clone materials when applying highlights to avoid affecting other meshes sharing the same material.

3. **Hover vs Selected**: Don't apply hover highlight to already-selected elements. When removing hover from a selected element, restore highlight material not original.

4. **Original Material Storage**: Use `mesh.uuid` as key, not `elementId`, since the same mesh object is being modified.

## Integration with ModelViewer

```javascript
// In ModelViewer.js
this.selection = new Selection(this.sceneManager);

this.selection.on('selection-change', (data) => {
  this.emit('selection-change', data);
  this.updateStatusBar();
});

this.selection.on('element-double-click', (data) => {
  // Zoom to clicked element
  this.navigation.zoomToSelection([data.mesh]);
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    this.selection.deselect();
  }
});
```

## Data Structures

```javascript
// Selected elements
this.selectedElements = new Map(); // elementId -> mesh

// Original materials (for restoration)
this.originalMaterials = new Map(); // mesh.uuid -> material

// Current hover state
this.hoveredElement = null; // mesh or null
```

## Cleanup

```javascript
destroy() {
  // Remove event listeners
  this.domElement.removeEventListener('click', this.boundOnClick);
  this.domElement.removeEventListener('dblclick', this.boundOnDoubleClick);
  this.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
  this.domElement.removeEventListener('contextmenu', this.boundOnContextMenu);

  // Restore all original materials
  this.originalMaterials.forEach((material, uuid) => {
    const mesh = this.scene.getObjectByProperty('uuid', uuid);
    if (mesh) mesh.material = material;
  });

  this.originalMaterials.clear();
  this.selectedElements.clear();
}
```
