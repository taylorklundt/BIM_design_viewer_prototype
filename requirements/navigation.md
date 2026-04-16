# Navigation Feature - Implementation Requirements

## Overview

Implement camera navigation controls for a Three.js-based 3D model viewer. Support orbit, pan, and first-person navigation modes.

## User Interaction Flow

1. **Orbit Mode** (default): Click and drag to rotate around model, scroll to zoom
2. **Pan Mode**: Click and drag to pan camera
3. **First-Person Mode**: WASD movement, mouse look, pointer lock
4. **Zoom to Fit**: Frame entire model or selected elements
5. Press Escape in first-person mode to return to orbit

## Technical Requirements

### 1. Navigation Class (`src/features/Navigation.js`)

```javascript
class Navigation {
  constructor(sceneManager)

  // Mode control
  setMode(mode)  // 'orbit' | 'pan' | 'firstPerson'
  getMode() → string

  // Camera manipulation
  orbit(deltaX, deltaY)
  pan(deltaX, deltaY)
  zoom(delta)
  zoomToFit(boundingBox?)
  zoomToSelection(meshes)
  setTarget(point)

  // Camera state
  getCamera() → { position, target }
  setCamera(position, target)
  setControlsEnabled(enabled)

  // First-person settings
  setWalkSpeed(speed)

  // Events
  on('camera-change' | 'mode-change')
}
```

### 2. Orbit Controls Setup

Use Three.js OrbitControls:

```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

setupOrbitControls() {
  this.controls = new OrbitControls(this.camera, this.domElement);
  this.controls.enableDamping = true;
  this.controls.dampingFactor = 0.05;
  this.controls.screenSpacePanning = true;
  this.controls.minDistance = 1;
  this.controls.maxDistance = 500;
  this.controls.maxPolarAngle = Math.PI;

  this.controls.addEventListener('change', () => {
    this.emit('camera-change', {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    });
  });

  // Animation loop for damping
  this.animate();
}

animate() {
  requestAnimationFrame(() => this.animate());

  if (this.firstPersonEnabled) {
    this.updateFirstPerson();
  } else if (this.controls) {
    this.controls.update();
  }
}
```

### 3. Mode Switching

```javascript
setMode(mode) {
  if (mode === this.mode) return;

  this.mode = mode;

  switch (mode) {
    case 'orbit':
      this.disableFirstPerson();
      this.controls.enableRotate = true;
      this.controls.enablePan = true;
      break;
    case 'pan':
      this.disableFirstPerson();
      this.controls.enableRotate = false;
      this.controls.enablePan = true;
      this.controls.screenSpacePanning = true;
      break;
    case 'firstPerson':
      this.enableFirstPerson();
      break;
  }

  this.emit('mode-change', { mode });
}
```

### 4. Zoom to Fit

Calculate camera position to frame bounding box:

```javascript
zoomToFit(boundingBox) {
  if (!boundingBox) {
    // Get bounding box of entire scene
    boundingBox = new THREE.Box3();
    this.sceneManager.getScene().traverse((object) => {
      if (object.isMesh) {
        boundingBox.expandByObject(object);
      }
    });
  }

  if (boundingBox.isEmpty()) return;

  const center = new THREE.Vector3();
  boundingBox.getCenter(center);

  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = this.camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.5; // Padding

  const direction = new THREE.Vector3(1, 0.5, 1).normalize();
  this.camera.position.copy(center).add(direction.multiplyScalar(cameraZ));

  if (this.controls) {
    this.controls.target.copy(center);
    this.controls.update();
  }

  this.emit('camera-change', {
    position: this.camera.position.clone(),
    target: center
  });
}
```

### 5. Zoom to Selection

```javascript
zoomToSelection(meshes) {
  if (!meshes || meshes.length === 0) return;

  const boundingBox = new THREE.Box3();
  meshes.forEach(mesh => {
    if (mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      const meshBox = mesh.geometry.boundingBox.clone();
      meshBox.applyMatrix4(mesh.matrixWorld);
      boundingBox.union(meshBox);
    }
  });

  this.zoomToFit(boundingBox);
}
```

### 6. First-Person Controls

```javascript
// State
this.keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false
};
this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
this.velocity = new THREE.Vector3();

enableFirstPerson() {
  if (this.firstPersonEnabled) return;
  this.firstPersonEnabled = true;

  // Disable orbit controls
  this.controls.enabled = false;

  // Request pointer lock
  this.domElement.requestPointerLock();

  // Add event listeners
  document.addEventListener('keydown', this.boundKeyDown);
  document.addEventListener('keyup', this.boundKeyUp);
  document.addEventListener('mousemove', this.boundMouseMove);
}

disableFirstPerson() {
  if (!this.firstPersonEnabled) return;
  this.firstPersonEnabled = false;

  // Re-enable orbit controls
  this.controls.enabled = true;

  // Exit pointer lock
  document.exitPointerLock();

  // Remove event listeners
  document.removeEventListener('keydown', this.boundKeyDown);
  document.removeEventListener('keyup', this.boundKeyUp);
  document.removeEventListener('mousemove', this.boundMouseMove);

  // Reset keys
  Object.keys(this.keys).forEach(key => this.keys[key] = false);
}
```

### 7. First-Person Key Handling

```javascript
onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      this.keys.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      this.keys.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      this.keys.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      this.keys.right = true;
      break;
    case 'Space':
      this.keys.up = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      this.keys.down = true;
      break;
    case 'Escape':
      this.setMode('orbit');
      break;
  }
}
```

### 8. First-Person Mouse Look

```javascript
onMouseMove(event) {
  if (!this.firstPersonEnabled) return;

  const movementX = event.movementX || 0;
  const movementY = event.movementY || 0;

  this.euler.setFromQuaternion(this.camera.quaternion);

  this.euler.y -= movementX * 0.002;
  this.euler.x -= movementY * 0.002;

  // Clamp vertical look
  this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

  this.camera.quaternion.setFromEuler(this.euler);
}
```

### 9. First-Person Movement Update

```javascript
updateFirstPerson() {
  const time = performance.now();
  const delta = (time - this.prevTime) / 1000;
  this.prevTime = time;

  // Apply friction
  this.velocity.x -= this.velocity.x * 10.0 * delta;
  this.velocity.z -= this.velocity.z * 10.0 * delta;
  this.velocity.y -= this.velocity.y * 10.0 * delta;

  // Calculate direction
  this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
  this.direction.x = Number(this.keys.right) - Number(this.keys.left);
  this.direction.y = Number(this.keys.up) - Number(this.keys.down);
  this.direction.normalize();

  const speed = this.walkSpeed * 10;

  // Apply acceleration
  if (this.keys.forward || this.keys.backward) {
    this.velocity.z -= this.direction.z * speed * delta;
  }
  if (this.keys.left || this.keys.right) {
    this.velocity.x -= this.direction.x * speed * delta;
  }
  if (this.keys.up || this.keys.down) {
    this.velocity.y -= this.direction.y * speed * delta;
  }

  // Move camera
  const cameraDirection = new THREE.Vector3();
  this.camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();

  const rightVector = new THREE.Vector3();
  rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

  this.camera.position.addScaledVector(cameraDirection, -this.velocity.z * delta);
  this.camera.position.addScaledVector(rightVector, -this.velocity.x * delta);
  this.camera.position.y -= this.velocity.y * delta;
}
```

### 10. Controls Enable/Disable

For section plane dragging and other interactions:

```javascript
setControlsEnabled(enabled) {
  if (this.controls) {
    this.controls.enabled = enabled;
  }
}
```

## Events Emitted

| Event | Data | When |
|-------|------|------|
| `camera-change` | `{ position, target }` | Camera moves |
| `mode-change` | `{ mode }` | Navigation mode changes |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| O | Orbit mode |
| P | Pan mode |
| F | First-person mode |
| Home | Zoom to fit |
| Escape | Exit first-person, deselect |
| WASD | Move (first-person) |
| Space | Move up (first-person) |
| Shift | Move down (first-person) |

## Integration with ModelViewer

```javascript
// In ModelViewer.js
this.navigation = new Navigation(this.sceneManager);

// Toolbar mode buttons
this.toolbar.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    this.navigation.setMode(btn.dataset.mode);
  });
});

// Update toolbar state
this.navigation.on('mode-change', ({ mode }) => {
  this.toolbar.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  switch (e.key.toLowerCase()) {
    case 'o': this.navigation.setMode('orbit'); break;
    case 'p': this.navigation.setMode('pan'); break;
    case 'f': this.navigation.setMode('firstPerson'); break;
    case 'home': this.navigation.zoomToFit(); break;
  }
});
```

## State Persistence

```javascript
// Save camera state
getCamera() {
  return {
    position: this.camera.position.clone(),
    target: this.controls ? this.controls.target.clone() : new THREE.Vector3()
  };
}

// Restore camera state
setCamera(position, target) {
  this.camera.position.copy(position);
  if (this.controls && target) {
    this.controls.target.copy(target);
    this.controls.update();
  }
  this.camera.lookAt(target || new THREE.Vector3());
}
```

## Cleanup

```javascript
destroy() {
  this.disableFirstPerson();

  if (this.controls) {
    this.controls.dispose();
  }

  this.eventListeners.clear();
}
```
