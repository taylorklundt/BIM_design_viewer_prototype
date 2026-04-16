import * as OBC from '@thatopen/components';
import * as WEBIFC from 'web-ifc';
import * as THREE from 'three';
import { ObjectLoadingState } from '../features/ObjectLoadingState.js';

export class IFCLoader {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.components = null;
    this.fragmentsManager = null;
    this.ifcLoader = null;
    this.ifcGeometryTiler = null;
    this.objectLoadingState = new ObjectLoadingState(sceneManager);
    this.loadedModels = new Map();
    this.modelIdCounter = 0;
    this.eventListeners = new Map();

    // Store the init promise so loadModel can await it
    this._initPromise = this.init();
  }

  async init() {
    // Initialize Open BIM Components
    this.components = new OBC.Components();

    // Get the world (scene, camera, renderer)
    const worlds = this.components.get(OBC.Worlds);
    const world = worlds.create();

    // Use our existing scene, camera, and renderer
    world.scene = new OBC.SimpleScene(this.components);
    world.scene.three = this.sceneManager.getScene();

    // Set up fragments manager
    this.fragmentsManager = this.components.get(OBC.FragmentsManager);

    // Set up IFC loader
    this.ifcLoader = this.components.get(OBC.IfcLoader);
    this.ifcGeometryTiler = this.components.get(OBC.IfcGeometryTiler);

    // Configure web-ifc with autoSetWasm disabled to prevent CDN override
    // We set wasm path to local '/' and must pass autoSetWasm: false
    // otherwise setup() will call autoSetWasm() which overwrites our local
    // path with the unpkg.com CDN URL, causing loading failures
    await this.ifcLoader.setup({
      wasm: {
        path: '/',
        absolute: true
      },
      autoSetWasm: false
    });

    // Mirror WASM settings for geometry streaming.
    this.ifcGeometryTiler.settings.wasm.path = '/';
    this.ifcGeometryTiler.settings.wasm.absolute = true;
    this.ifcGeometryTiler.settings.autoSetWasm = false;
    // Force smaller stream chunks so users see progressive object batches.
    this.ifcGeometryTiler.settings.minGeometrySize = 1;
    this.ifcGeometryTiler.settings.minAssetsSize = 1;

    // Configure coordinate transformation
    if (this.ifcLoader.settings.webIfc) {
      this.ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
      this.ifcLoader.settings.webIfc.OPTIMIZE_PROFILES = true;
    }

    this.objectLoadingState.enable();
  }

  async loadModel(url, name) {
    // Ensure init() has completed before loading
    await this._initPromise;

    const modelId = `model-${++this.modelIdCounter}`;

    try {
      this.emit('load-start', { modelId, url, name });

      // Fetch the IFC file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch IFC file: ${response.statusText}`);
      }

      const data = await response.arrayBuffer();
      const buffer = new Uint8Array(data);

      return this.loadModelFromBuffer(buffer, {
        modelId,
        name: name || url.split('/').pop(),
        url,
      });
    } catch (error) {
      this.objectLoadingState.clearModel(modelId);
      this.emit('load-error', { modelId, error: error.message });
      throw error;
    }
  }

  async loadModelFromFile(file, name) {
    // Ensure init() has completed before loading
    await this._initPromise;

    const modelId = `model-${++this.modelIdCounter}`;

    try {
      this.emit('load-start', { modelId, fileName: file.name, name });

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      return this.loadModelFromBuffer(data, {
        modelId,
        name: name || file.name,
        fileName: file.name,
      });
    } catch (error) {
      this.objectLoadingState.clearModel(modelId);
      this.emit('load-error', { modelId, error: error.message });
      throw error;
    }
  }

  async loadModelFromBuffer(buffer, meta) {
    const { modelId, name, url, fileName } = meta;

    try {
      this.emit('stream-capability', { modelId, streamingSupported: true });

      // Load real IFC fragments, then reveal actual geometry progressively.
      const model = await this.ifcLoader.load(buffer);
      this.sceneManager.add(model);

      this.loadedModels.set(modelId, {
        id: modelId,
        name,
        url,
        fileName,
        model,
        visible: true
      });

      const ready = await this.progressivelyRevealModel(modelId, model, 5000);
      this.emit('object-load-complete', {
        modelId,
        loadedObjects: ready.revealed,
        totalObjects: ready.total,
      });
      this.emit('model-stream-complete', {
        modelId,
        streamingSupported: true,
        totalObjects: ready.total,
      });

      this.emit('load-complete', { modelId, model, name });
      return modelId;
    } catch (error) {
      this.objectLoadingState.clearModel(modelId);
      this.emit('object-load-error', { modelId, error: error.message });
      throw error;
    }
  }

  async progressivelyRevealModel(modelId, model, durationMs = 5000) {
    this.alignModelToGroundWithFoundation(model);

    const meshes = [];
    model.traverse((node) => {
      if (node?.isMesh) {
        meshes.push(node);
      }
    });

    const total = meshes.length;
    if (total === 0) {
      this.emit('object-load-progress', {
        modelId,
        parserProgress: 1,
        totalObjects: 0,
        loadedObjects: 0,
      });
      return { total: 0, revealed: 0 };
    }

    for (const mesh of meshes) {
      this.prepareMeshForReveal(mesh);
    }

    this.emit('object-load-start', {
      modelId,
      addedObjects: total,
      totalObjects: total,
      parserProgress: 0,
    });

    const tickMs = 33;
    const ticks = Math.max(1, Math.floor(durationMs / tickMs));
    const batchSize = Math.max(1, Math.ceil(total / ticks));
    let revealed = 0;

    while (revealed < total) {
      const next = Math.min(total, revealed + batchSize);
      for (let i = revealed; i < next; i++) {
        this.finalizeMeshAfterReveal(meshes[i], i);
      }
      revealed = next;

      this.emit('object-load-progress', {
        modelId,
        parserProgress: revealed / total,
        totalObjects: total,
        loadedObjects: revealed,
      });

      if (revealed < total) {
        await new Promise((resolve) => setTimeout(resolve, tickMs));
      }
    }

    return { total, revealed };
  }

  alignModelToGroundWithFoundation(model) {
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) return;

    const height = Math.max(0, bounds.max.y - bounds.min.y);
    const foundationDepth = Math.max(height * 0.1, 0.25);
    const targetMinY = -foundationDepth;
    const deltaY = targetMinY - bounds.min.y;

    model.position.y += deltaY;
    model.updateMatrixWorld(true);
  }

  prepareMeshForReveal(mesh) {
    if (!mesh) return;

    const prepareMaterial = (material) => {
      const cloned = material.clone();
      cloned.userData = {
        ...(cloned.userData || {}),
        __mvRevealOriginal: {
          transparent: material.transparent,
          opacity: material.opacity,
          depthWrite: material.depthWrite,
          polygonOffset: material.polygonOffset,
          polygonOffsetFactor: material.polygonOffsetFactor,
          polygonOffsetUnits: material.polygonOffsetUnits,
          alphaTest: material.alphaTest,
        },
      };

      cloned.transparent = true;
      cloned.opacity = 0.25;
      // Keep depth writes on for stable ghost rendering and less shimmer.
      cloned.depthWrite = true;
      // Nudge ghost pass slightly to reduce coplanar z-fighting noise.
      cloned.polygonOffset = true;
      cloned.polygonOffsetFactor = 1;
      cloned.polygonOffsetUnits = 1;
      cloned.alphaTest = 0.01;
      cloned.needsUpdate = true;
      return cloned;
    };

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(prepareMaterial);
      return;
    }

    if (mesh.material) {
      mesh.material = prepareMaterial(mesh.material);
    }
  }

  finalizeMeshAfterReveal(mesh, revealIndex = 0) {
    if (!mesh) return;

    const finalizeMaterial = (material) => {
      const original = material?.userData?.__mvRevealOriginal;
      if (original) {
        material.transparent = original.transparent;
        material.opacity = original.opacity;
        material.depthWrite = original.depthWrite;
        material.polygonOffset = original.polygonOffset;
        material.polygonOffsetFactor = original.polygonOffsetFactor;
        material.polygonOffsetUnits = original.polygonOffsetUnits;
        material.alphaTest = original.alphaTest;
      } else {
        material.opacity = 1;
        material.transparent = false;
        material.depthWrite = true;
        material.polygonOffset = false;
        material.alphaTest = 0;
      }
      // Stabilize final shading for IFC surfaces that often overlap/coplanar.
      material.side = THREE.FrontSide;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = (revealIndex % 7) * 0.35;
      material.needsUpdate = true;
    };

    // Deterministic render ordering reduces tie flicker on coplanar surfaces.
    mesh.renderOrder = 1000 + (revealIndex % 4000);

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(finalizeMaterial);
      return;
    }

    if (mesh.material) {
      finalizeMaterial(mesh.material);
    }
  }

  async streamObjectPlaceholders(modelId, buffer) {
    if (!this.ifcGeometryTiler) {
      this.emit('model-stream-complete', { modelId, streamingSupported: false });
      return;
    }

    this.objectLoadingState.beginModel(modelId);
    this.emit('stream-capability', { modelId, streamingSupported: true });
    const streamStartTime = Date.now();
    const minimumStreamingMs = 5000;

    let parserProgress = 0;

    const onGeometryStreamed = async ({ data }) => {
      this.objectLoadingState.registerGeometryChunk(modelId, data);
    };

    const onAssetStreamed = async (assets) => {
      const { added, total, objectIds } = this.objectLoadingState.registerAssetChunk(modelId, assets);
      if (added > 0) {
        this.emit('object-load-start', {
          modelId,
          objectIds,
          addedObjects: added,
          totalObjects: total,
          parserProgress,
        });
      }
      this.emit('object-load-progress', {
        modelId,
        totalObjects: total,
        parserProgress,
      });

      // Slightly pace streamed asset batches so incremental loading is visible.
      await new Promise((resolve) => setTimeout(resolve, 12));
    };

    const onProgress = async (progress) => {
      parserProgress = progress;
      this.emit('object-load-progress', {
        modelId,
        parserProgress: progress,
      });
    };

    this.ifcGeometryTiler.onGeometryStreamed.add(onGeometryStreamed);
    this.ifcGeometryTiler.onAssetStreamed.add(onAssetStreamed);
    this.ifcGeometryTiler.onProgress.add(onProgress);

    try {
      await this.ifcGeometryTiler.streamFromBuffer(buffer);
      const elapsed = Date.now() - streamStartTime;
      if (elapsed < minimumStreamingMs) {
        await new Promise((resolve) => setTimeout(resolve, minimumStreamingMs - elapsed));
      }
    } finally {
      this.ifcGeometryTiler.onGeometryStreamed.remove(onGeometryStreamed);
      this.ifcGeometryTiler.onAssetStreamed.remove(onAssetStreamed);
      this.ifcGeometryTiler.onProgress.remove(onProgress);
    }
  }

  unloadModel(modelId) {
    const modelData = this.loadedModels.get(modelId);
    if (!modelData) {
      console.warn(`Model ${modelId} not found`);
      return false;
    }

    // Remove from scene
    this.sceneManager.remove(modelData.model);
    this.objectLoadingState.clearModel(modelId);

    // Dispose fragments
    if (this.fragmentsManager) {
      this.fragmentsManager.dispose();
    }

    // Remove from map
    this.loadedModels.delete(modelId);

    this.emit('model-unload', { modelId });

    return true;
  }

  getLoadedModels() {
    return Array.from(this.loadedModels.values()).map(({ id, name, url, fileName, visible }) => ({
      id,
      name,
      url,
      fileName,
      visible
    }));
  }

  getModel(modelId) {
    return this.loadedModels.get(modelId);
  }

  showModel(modelId) {
    const modelData = this.loadedModels.get(modelId);
    if (modelData && modelData.model) {
      modelData.model.visible = true;
      modelData.visible = true;
    }
  }

  hideModel(modelId) {
    const modelData = this.loadedModels.get(modelId);
    if (modelData && modelData.model) {
      modelData.model.visible = false;
      modelData.visible = false;
    }
  }

  toggleModel(modelId) {
    const modelData = this.loadedModels.get(modelId);
    if (modelData && modelData.model) {
      modelData.model.visible = !modelData.model.visible;
      modelData.visible = modelData.model.visible;
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

  // Get all fragments for interaction
  getFragments() {
    return this.fragmentsManager;
  }

  // Get IFC properties for an element
  async getProperties(modelId, expressID) {
    const modelData = this.loadedModels.get(modelId);
    if (!modelData) return null;

    try {
      const propsManager = this.components.get(OBC.IfcPropertiesManager);
      const properties = await propsManager.getProperties(modelData.model, expressID);
      return properties;
    } catch (error) {
      console.error('Error getting properties:', error);
      return null;
    }
  }

  destroy() {
    // Unload all models
    for (const modelId of this.loadedModels.keys()) {
      this.unloadModel(modelId);
    }

    // Dispose components
    if (this.components) {
      this.components.dispose();
    }

    this.objectLoadingState.destroy();
    this.eventListeners.clear();
  }
}
