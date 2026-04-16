import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Navigation {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.camera = sceneManager.getCamera();
    this.domElement = sceneManager.getDomElement();

    this.controls = null;
    this.mode = 'orbit';
    this.firstPersonEnabled = false;
    this.walkSpeed = 5;
    this.flySpeed = 12;
    this.isFlyForwardActive = false;

    // First person controls state
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
    this.direction = new THREE.Vector3();
    this.prevTime = performance.now();

    this._perspCamera = this.camera;
    this._orthoCamera = null;
    this._isOrthographic = false;

    this.eventListeners = new Map();
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundFlyMouseDown = this.onFlyMouseDown.bind(this);
    this.boundFlyMouseUp = this.onFlyMouseUp.bind(this);
    this.boundFlyMouseLeave = this.onFlyMouseLeave.bind(this);

    this.init();
  }

  init() {
    this.setupOrbitControls();
  }

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

    // Start animation loop for controls update
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;
    this.prevTime = time;

    if (this.firstPersonEnabled) {
      this.updateFirstPerson(delta);
      return;
    }

    if (this.mode === 'fly' && this.isFlyForwardActive) {
      this.updateFly(delta);
    }

    if (this.controls) {
      this.controls.update();
    }
  }

  setMode(mode) {
    if (mode === this.mode) return;

    this.mode = mode;

    switch (mode) {
      case 'orbit':
        this.disableFirstPerson();
        this.disableFly();
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        break;
      case 'pan':
        this.disableFirstPerson();
        this.disableFly();
        this.controls.enableRotate = false;
        this.controls.enablePan = true;
        this.controls.screenSpacePanning = true;
        break;
      case 'fly':
        this.disableFirstPerson();
        this.enableFly();
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        break;
      case 'firstPerson':
        this.disableFly();
        this.enableFirstPerson();
        break;
      default:
        this.disableFly();
        this.disableFirstPerson();
        break;
    }

    this.emit('mode-change', { mode });
  }

  getMode() {
    return this.mode;
  }

  orbit(deltaX, deltaY) {
    if (this.controls && this.mode === 'orbit') {
      this.controls.rotateLeft(deltaX * 0.01);
      this.controls.rotateUp(deltaY * 0.01);
    }
  }

  pan(deltaX, deltaY) {
    if (this.controls) {
      this.controls.pan(deltaX, deltaY);
    }
  }

  zoom(delta) {
    if (this.controls) {
      if (delta > 0) {
        this.controls.dollyIn(Math.pow(0.95, delta));
      } else {
        this.controls.dollyOut(Math.pow(0.95, -delta));
      }
      this.controls.update();
    }
  }

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

    if (boundingBox.isEmpty()) {
      return;
    }

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5; // Add some padding

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

  zoomToSelection(elements) {
    if (!elements || elements.length === 0) return;

    const boundingBox = new THREE.Box3();
    elements.forEach(mesh => {
      if (mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        const meshBox = mesh.geometry.boundingBox.clone();
        meshBox.applyMatrix4(mesh.matrixWorld);
        boundingBox.union(meshBox);
      }
    });

    this.zoomToFit(boundingBox);
  }

  setTarget(point) {
    if (this.controls) {
      this.controls.target.copy(point);
      this.controls.update();
    }
  }

  getCamera() {
    return {
      position: this.camera.position.clone(),
      target: this.controls ? this.controls.target.clone() : new THREE.Vector3()
    };
  }

  setCamera(position, target) {
    this.camera.position.copy(position);
    const targetVec = target
      ? new THREE.Vector3(target.x, target.y, target.z)
      : new THREE.Vector3();

    if (this.controls && target) {
      this.controls.target.copy(targetVec);
      this.controls.update();
    } else {
      this.camera.lookAt(targetVec);
    }

    this.emit('camera-change', { position, target });
  }

  setOrthographic(enabled) {
    if (enabled === this._isOrthographic) return;
    this._isOrthographic = enabled;

    const currentPos = this.camera.position.clone();
    const target = this.controls ? this.controls.target.clone() : new THREE.Vector3();

    if (enabled) {
      const distance = currentPos.distanceTo(target);
      const domElement = this.sceneManager.getDomElement();
      const aspect = domElement.clientWidth / domElement.clientHeight;
      const fov = this._perspCamera.fov * (Math.PI / 180);
      // Compute frustum height at the orbit target distance
      const frustumHeight = Math.tan(fov / 2) * distance * 2;
      const frustumWidth = frustumHeight * aspect;

      this._orthoCamera = new THREE.OrthographicCamera(
        -frustumWidth / 2,
        frustumWidth / 2,
        frustumHeight / 2,
        -frustumHeight / 2,
        0.01,
        2000,
      );
      this._orthoCamera.position.copy(currentPos);
      this._orthoCamera.lookAt(target);

      this.camera = this._orthoCamera;
      this.controls.object = this._orthoCamera;
      this.controls.update();
      this.sceneManager.setCamera(this._orthoCamera);
    } else {
      this._perspCamera.position.copy(this.camera.position);
      this.camera = this._perspCamera;
      this.controls.object = this._perspCamera;
      this.controls.update();
      this.sceneManager.setCamera(this._perspCamera);
    }

    this.emit('camera-change', {
      position: this.camera.position.clone(),
      target,
    });
  }

  getIsOrthographic() {
    return this._isOrthographic;
  }

  /**
   * Enable or disable orbit controls (used when dragging section planes, etc.)
   */
  setControlsEnabled(enabled) {
    if (this.controls) {
      this.controls.enabled = enabled;
    }
  }

  enableFirstPerson() {
    if (this.firstPersonEnabled) return;

    this.firstPersonEnabled = true;

    if (this.controls) {
      this.controls.enabled = false;
    }

    // Lock pointer
    this.domElement.requestPointerLock();

    // Add event listeners
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('mousemove', this.boundMouseMove);

    this.prevTime = performance.now();
  }

  disableFirstPerson() {
    if (!this.firstPersonEnabled) return;

    this.firstPersonEnabled = false;

    if (this.controls) {
      this.controls.enabled = true;
    }

    // Unlock pointer
    document.exitPointerLock();

    // Remove event listeners
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('mousemove', this.boundMouseMove);

    // Reset keys
    Object.keys(this.keys).forEach(key => this.keys[key] = false);
  }

  enableFly() {
    if (!this.domElement) return;
    this.domElement.addEventListener('mousedown', this.boundFlyMouseDown);
    this.domElement.addEventListener('mouseup', this.boundFlyMouseUp);
    this.domElement.addEventListener('mouseleave', this.boundFlyMouseLeave);
    window.addEventListener('mouseup', this.boundFlyMouseUp);
    window.addEventListener('blur', this.boundFlyMouseLeave);
    this.isFlyForwardActive = false;
  }

  disableFly() {
    if (!this.domElement) return;
    this.domElement.removeEventListener('mousedown', this.boundFlyMouseDown);
    this.domElement.removeEventListener('mouseup', this.boundFlyMouseUp);
    this.domElement.removeEventListener('mouseleave', this.boundFlyMouseLeave);
    window.removeEventListener('mouseup', this.boundFlyMouseUp);
    window.removeEventListener('blur', this.boundFlyMouseLeave);
    this.isFlyForwardActive = false;
  }

  onFlyMouseDown(event) {
    if (this.mode !== 'fly' || event.button !== 0) return;
    event.preventDefault();
    this.isFlyForwardActive = true;
  }

  onFlyMouseUp(event) {
    if (event.button !== 0) return;
    this.isFlyForwardActive = false;
  }

  onFlyMouseLeave() {
    this.isFlyForwardActive = false;
  }

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

  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.up = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.down = false;
        break;
    }
  }

  onMouseMove(event) {
    if (!this.firstPersonEnabled) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.euler.setFromQuaternion(this.camera.quaternion);

    this.euler.y -= movementX * 0.002;
    this.euler.x -= movementY * 0.002;

    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);

    this.emit('camera-change', {
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone()
    });
  }

  updateFirstPerson(delta) {
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= this.velocity.y * 10.0 * delta;

    this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
    this.direction.x = Number(this.keys.right) - Number(this.keys.left);
    this.direction.y = Number(this.keys.up) - Number(this.keys.down);
    this.direction.normalize();

    const speed = this.walkSpeed * 10;

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

  updateFly(delta) {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.normalize();

    const distance = this.flySpeed * delta;
    this.camera.position.addScaledVector(forward, distance);

    if (this.controls) {
      this.controls.target.addScaledVector(forward, distance);
    }

    this.emit('camera-change', {
      position: this.camera.position.clone(),
      target: this.controls ? this.controls.target.clone() : undefined
    });
  }

  setWalkSpeed(speed) {
    this.walkSpeed = speed;
  }

  // Event handling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  destroy() {
    this.disableFirstPerson();
    this.disableFly();

    if (this.controls) {
      this.controls.dispose();
    }

    this.eventListeners.clear();
  }
}
