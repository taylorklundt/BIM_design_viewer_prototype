import * as THREE from 'three';

export class Visibility {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.getScene();

    this.hiddenElements = new Set();
    this.elementOpacities = new Map();
    this.originalMaterials = new Map();

    this.eventListeners = new Map();
  }

  getMeshByElementId(elementId) {
    const target = String(elementId);
    let foundMesh = null;
    this.scene.traverse((object) => {
      if (object.isMesh) {
        const id = object.userData?.expressID || object.uuid;
        if (String(id) === target) {
          foundMesh = object;
        }
      }
    });
    return foundMesh;
  }

  getMeshesByElementIds(elementIds) {
    const stringIds = elementIds.map(String);
    const meshes = [];
    this.scene.traverse((object) => {
      if (object.isMesh) {
        const id = object.userData?.expressID || object.uuid;
        if (stringIds.includes(String(id))) {
          meshes.push({ id, mesh: object });
        }
      }
    });
    return meshes;
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

  hide(elementIds) {
    if (!Array.isArray(elementIds)) elementIds = [elementIds];

    console.log('[Visibility] hide() called with:', {
      elementIds,
      count: elementIds.length
    });

    const hidden = [];
    const meshes = this.getMeshesByElementIds(elementIds);

    console.log('[Visibility] Found meshes:', {
      requestedCount: elementIds.length,
      foundCount: meshes.length
    });

    meshes.forEach(({ id, mesh }) => {
      if (mesh && mesh.visible) {
        mesh.visible = false;
        this.hiddenElements.add(id);
        hidden.push(id);
      }
    });

    console.log('[Visibility] Actually hidden:', hidden.length);

    if (hidden.length > 0) {
      this.emit('visibility-change', {
        shown: [],
        hidden,
        allHidden: Array.from(this.hiddenElements)
      });
    }
  }

  toggleVisibility(elementIds) {
    if (!Array.isArray(elementIds)) elementIds = [elementIds];

    const shown = [];
    const hidden = [];
    const meshes = this.getMeshesByElementIds(elementIds);

    meshes.forEach(({ id, mesh }) => {
      if (mesh) {
        mesh.visible = !mesh.visible;
        if (mesh.visible) {
          this.hiddenElements.delete(id);
          shown.push(id);
        } else {
          this.hiddenElements.add(id);
          hidden.push(id);
        }
      }
    });

    if (shown.length > 0 || hidden.length > 0) {
      this.emit('visibility-change', {
        shown,
        hidden,
        allHidden: Array.from(this.hiddenElements)
      });
    }
  }

  isolate(elementIds) {
    if (!Array.isArray(elementIds)) elementIds = [elementIds];

    const shown = [];
    const hidden = [];

    this.scene.traverse((object) => {
      if (object.isMesh) {
        const id = object.userData?.expressID || object.uuid;
        if (elementIds.includes(id)) {
          if (!object.visible) {
            object.visible = true;
            this.hiddenElements.delete(id);
            shown.push(id);
          }
        } else {
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

  hideAll() {
    const hidden = [];

    this.scene.traverse((object) => {
      if (object.isMesh && object.visible) {
        object.visible = false;
        const id = object.userData?.expressID || object.uuid;
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

  showModel(modelId) {
    this.scene.traverse((object) => {
      if (object.userData?.modelId === modelId) {
        object.visible = true;
        object.traverse((child) => {
          if (child.isMesh) {
            child.visible = true;
            const id = child.userData?.expressID || child.uuid;
            this.hiddenElements.delete(id);
          }
        });
      }
    });

    this.emit('model-visibility-change', { modelId, visible: true });
  }

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

  toggleModel(modelId) {
    let currentlyVisible = false;

    this.scene.traverse((object) => {
      if (object.userData?.modelId === modelId) {
        currentlyVisible = object.visible;
      }
    });

    if (currentlyVisible) {
      this.hideModel(modelId);
    } else {
      this.showModel(modelId);
    }
  }

  getHiddenElements() {
    return Array.from(this.hiddenElements);
  }

  getVisibleElements() {
    const visible = [];
    this.scene.traverse((object) => {
      if (object.isMesh && object.visible) {
        const id = object.userData?.expressID || object.uuid;
        visible.push(id);
      }
    });
    return visible;
  }

  setOpacity(elementIds, opacity) {
    if (!Array.isArray(elementIds)) elementIds = [elementIds];

    const meshes = this.getMeshesByElementIds(elementIds);

    meshes.forEach(({ id, mesh }) => {
      if (mesh && mesh.material) {
        // Store original material if not already stored
        if (!this.originalMaterials.has(id)) {
          this.originalMaterials.set(id, mesh.material.clone());
        }

        // Clone material to avoid affecting other instances
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

  showByType(ifcType) {
    const shown = [];

    this.scene.traverse((object) => {
      if (object.isMesh) {
        const type = object.userData?.type || object.userData?.ifcType;
        if (type === ifcType && !object.visible) {
          object.visible = true;
          const id = object.userData?.expressID || object.uuid;
          this.hiddenElements.delete(id);
          shown.push(id);
        }
      }
    });

    if (shown.length > 0) {
      this.emit('visibility-change', {
        shown,
        hidden: [],
        byType: ifcType,
        allHidden: Array.from(this.hiddenElements)
      });
    }
  }

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
    this.resetOpacity();
    this.showAll();
    this.eventListeners.clear();
  }
}
