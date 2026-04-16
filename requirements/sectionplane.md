# Section Plane Tool - Implementation Requirements

## Overview

Implement a section plane (clipping plane) feature for a Three.js-based 3D model viewer. The tool allows users to create cross-section views of 3D models by right-clicking on any face and creating a clipping plane parallel to that face.

## User Interaction Flow

1. User right-clicks on a model element face
2. A context menu appears with "Create Section Plane" option
3. Clicking creates a clipping plane parallel to the clicked face
4. The plane clips geometry "behind" the face (away from camera), revealing the interior
5. User can drag the plane along its normal to move the section
6. Multiple section planes can be active simultaneously

## Technical Requirements

### 1. Context Menu Component (`src/ui/ContextMenu.js`)

Create a right-click context menu with the following features:
- Show at cursor position on right-click
- Menu items: "Create Section Plane", "Isolate", "Hide", "Show All", "Zoom to Fit"
- Close on click outside or Escape key
- Disable items based on context (e.g., "Create Section Plane" requires a face)
- Dark theme styling

```javascript
class ContextMenu {
  constructor(container)
  show(x, y, context)  // context contains intersection data
  hide()
  on(event, callback)  // event emitter for menu actions
}
```

### 2. Selection Module Updates (`src/features/Selection.js`)

Add right-click handling to capture face intersection data:

```javascript
onContextMenu(event) {
  // Raycast to find clicked mesh
  // For InstancedMesh: get instance matrix and combine with world matrix
  // Compute world normal from face vertices (not face.normal directly)
  // Emit 'context-menu' event with: elementId, mesh, point, face, normal, screenX, screenY
}
```

**Critical: World Normal Calculation for InstancedMesh**

IFC.js uses InstancedMesh. The face normal must be computed correctly:

```javascript
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

// Transform vertices to world space
vA.applyMatrix4(worldMatrix);
vB.applyMatrix4(worldMatrix);
vC.applyMatrix4(worldMatrix);

// Compute normal from cross product
const edge1 = new THREE.Vector3().subVectors(vB, vA);
const edge2 = new THREE.Vector3().subVectors(vC, vA);
const worldNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
```

### 3. Sectioning Feature Module (`src/features/Sectioning.js`)

Core clipping plane management:

```javascript
class Sectioning {
  constructor(sceneManager)

  // Plane management
  addClipPlane(normal, point) → planeId
  removeClipPlane(planeId)
  clearClipPlanes()
  getClipPlanes() → array

  // Plane manipulation
  movePlane(planeId, distance)
  flipPlane(planeId)
  setPlaneEnabled(planeId, enabled)
  setPlaneVisible(planeId, visible)

  // State persistence
  getState() → serialized planes
  setState(state)

  // Events
  on('plane-add' | 'plane-remove' | 'plane-move' | 'drag-start' | 'drag-end')
}
```

**Key Implementation Details:**

#### Clipping Plane Creation

```javascript
// IMPORTANT: Negate the normal for correct clipping direction
// Three.js clips geometry on the POSITIVE side of the plane normal
// We want to clip what's "behind" the face, so negate the normal
const clipNormal = normal.clone().normalize().negate();
const plane = new THREE.Plane();
plane.setFromNormalAndCoplanarPoint(clipNormal, point);

// Enable clipping on renderer
renderer.localClippingEnabled = true;
renderer.clippingPlanes = [plane];
```

#### Plane Size Based on Model Bounds

Size the visual helper based on the model dimensions perpendicular to the plane normal:

```javascript
getPlaneSizeFromBounds(normal) {
  const bounds = this.getSceneBounds();
  const size = bounds.getSize(new THREE.Vector3());
  const absNormal = new THREE.Vector3(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z));

  let planeWidth, planeHeight;
  if (absNormal.z > absNormal.x && absNormal.z > absNormal.y) {
    planeWidth = size.x; planeHeight = size.y;  // Z-facing
  } else if (absNormal.y > absNormal.x) {
    planeWidth = size.x; planeHeight = size.z;  // Y-facing
  } else {
    planeWidth = size.y; planeHeight = size.z;  // X-facing
  }

  return Math.max(planeWidth, planeHeight) * 1.1;  // 10% padding
}
```

#### Visual Plane Helper

Create a visual representation with:
- Semi-transparent plane surface (PlaneGeometry + MeshBasicMaterial)
- Border outline (EdgesGeometry + LineSegments)
- Arrow showing clip direction (ArrowHelper)

```javascript
createPlaneHelper(plane, normal, point, size) {
  const group = new THREE.Group();

  // Transparent surface
  const planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      color: 0x00a8ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  planeMesh.userData.isPlaneHelper = true;
  group.add(planeMesh);

  // Border
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(planeMesh.geometry),
    new THREE.LineBasicMaterial({ color: 0x00a8ff })
  );
  group.add(edges);

  // Direction arrow
  const arrow = new THREE.ArrowHelper(normal.clone().negate(), new THREE.Vector3(), size * 0.3, 0xff4444);
  group.add(arrow);

  // Position and orient
  group.position.copy(point);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  group.quaternion.copy(quaternion);

  return group;
}
```

#### Drag Interaction

Allow dragging the plane along its normal:

```javascript
onMouseDown(event) {
  // Raycast against plane helpers
  // If hit, start dragging
  // Emit 'drag-start' to disable orbit controls
}

onMouseMove(event) {
  if (dragging) {
    // Project mouse movement onto plane normal
    // Calculate distance moved along normal
    // Call movePlane(planeId, distance)
  }
}

onMouseUp(event) {
  // Stop dragging
  // Emit 'drag-end' to re-enable orbit controls
}
```

#### Moving the Plane

```javascript
movePlane(planeId, distance) {
  // Since plane.normal is NEGATED relative to stored normal:
  planeData.plane.constant += distance;  // Note: += not -=

  // Update stored point (uses original normal)
  planeData.point.addScaledVector(planeData.normal, distance);

  // Update helper position
  planeData.helper.position.copy(planeData.point);
}
```

### 4. ModelViewer Integration

Wire up the components:

```javascript
// Initialize
this.sectioning = new Sectioning(this.sceneManager);
this.contextMenu = new ContextMenu(this.container);

// Connect context menu to selection
this.selection.on('context-menu', (data) => {
  this.contextMenu.show(data.screenX, data.screenY, data);
});

// Handle "Create Section Plane" action
this.contextMenu.on('createSectionPlane', (context) => {
  if (context?.normal && context?.point) {
    this.sectioning.addClipPlane(context.normal, context.point);
  }
});

// Disable orbit controls while dragging section plane
this.sectioning.on('drag-start', () => {
  this.navigation.setControlsEnabled(false);
});

this.sectioning.on('drag-end', () => {
  this.navigation.setControlsEnabled(true);
});
```

### 5. Navigation Module Update

Add method to enable/disable orbit controls:

```javascript
setControlsEnabled(enabled) {
  if (this.controls) {
    this.controls.enabled = enabled;
  }
}
```

### 6. CSS Styling

```css
.mv-context-menu {
  position: absolute;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.mv-context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  color: #cccccc;
}

.mv-context-menu-item:hover {
  background: #2d2d2d;
}

.mv-context-menu-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.mv-context-menu-item svg {
  width: 16px;
  height: 16px;
}

.mv-context-menu-divider {
  height: 1px;
  background: #3c3c3c;
  margin: 4px 0;
}

.mv-hidden {
  display: none;
}
```

## State Persistence

Save section planes with view states:

```javascript
// getState()
{
  clipPlanes: [
    {
      id: 'plane-001',
      normal: { x, y, z },
      constant: -5.2,
      enabled: true,
      visible: true
    }
  ]
}

// setState() - recreate planes from saved state
```

## Key Gotchas

1. **InstancedMesh Normal Calculation**: IFC.js uses InstancedMesh. Must combine mesh.matrixWorld with instance matrix to get correct world-space normal.

2. **Clipping Direction**: Three.js clips on the POSITIVE side of plane normal. Negate the face normal to clip "behind" the face.

3. **Plane Movement**: Since plane normal is negated, use `plane.constant += distance` (not `-=`).

4. **Orbit Control Conflict**: Disable orbit controls during plane dragging to prevent simultaneous rotation.

5. **Plane Sizing**: Size based on perpendicular dimensions, not maximum model dimension.

## Files to Create/Modify

- `src/features/Sectioning.js` (NEW)
- `src/ui/ContextMenu.js` (NEW)
- `src/features/Selection.js` (MODIFY - add right-click handler)
- `src/features/Navigation.js` (MODIFY - add setControlsEnabled)
- `src/core/ModelViewer.js` (MODIFY - integrate components)
- `src/styles/dark-theme.css` (MODIFY - add context menu styles)
- `src/index.js` (MODIFY - export new modules)
