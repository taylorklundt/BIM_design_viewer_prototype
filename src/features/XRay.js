import * as THREE from 'three';

export class XRay {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.getScene();
    this.originalMaterials = new Map();
    this.originalRenderOrders = new Map();
    this._isEnabled = false;
    this.eventListeners = new Map();
  }

  get isEnabled() {
    return this._isEnabled;
  }

  _ghostify(mat) {
    const ghost = mat.clone();
    ghost.transparent = true;
    ghost.opacity = 0.25;
    ghost.depthWrite = false;
    ghost.side = THREE.DoubleSide;
    ghost.needsUpdate = true;
    return ghost;
  }

  enable() {
    if (this._isEnabled) return;
    this._isEnabled = true;

    this.scene.traverse((object) => {
      if (!object.isMesh || !object.visible) return;
      if (!object.material) return;

      const uuid = object.uuid;
      this.originalMaterials.set(uuid, object.material);
      this.originalRenderOrders.set(uuid, object.renderOrder);

      if (Array.isArray(object.material)) {
        object.material = object.material.map((m) => this._ghostify(m));
      } else {
        object.material = this._ghostify(object.material);
      }
      object.renderOrder = 1;
    });

    this.emit('xray-change', { enabled: true });
  }

  disable() {
    if (!this._isEnabled) return;
    this._isEnabled = false;

    this.originalMaterials.forEach((originalMat, uuid) => {
      const mesh = this._findMeshByUUID(uuid);
      if (mesh) {
        mesh.material = originalMat;
        mesh.material.needsUpdate = true;
        mesh.renderOrder = this.originalRenderOrders.get(uuid) ?? 0;
      }
    });

    this.originalMaterials.clear();
    this.originalRenderOrders.clear();
    this.emit('xray-change', { enabled: false });
  }

  toggle() {
    if (this._isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  _findMeshByUUID(uuid) {
    let found = null;
    this.scene.traverse((object) => {
      if (object.isMesh && object.uuid === uuid) {
        found = object;
      }
    });
    return found;
  }

  destroy() {
    this.disable();
    this.eventListeners.clear();
  }

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
      this.eventListeners.get(event).forEach((cb) => cb(data));
    }
  }
}
