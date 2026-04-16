import * as THREE from 'three';

function createPlaceholderMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    metalness: 0.0,
    roughness: 1.0,
  });
}

function matrixFromArray(values) {
  const matrix = new THREE.Matrix4();
  if (!Array.isArray(values) || values.length !== 16) {
    return matrix;
  }
  matrix.fromArray(values);
  return matrix;
}

function boxFromObbTransform(boundsInput) {
  const bounds = Array.isArray(boundsInput) ? Float32Array.from(boundsInput) : boundsInput;
  if (!(bounds instanceof Float32Array)) {
    return null;
  }

  // Streaming data from IfcGeometryTiler uses a 4x4 OBB transform matrix.
  if (bounds.length >= 16) {
    const transform = new THREE.Matrix4().fromArray(bounds);
    const corners = [
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(-1, -1, 1),
      new THREE.Vector3(-1, 1, -1),
      new THREE.Vector3(-1, 1, 1),
      new THREE.Vector3(1, -1, -1),
      new THREE.Vector3(1, -1, 1),
      new THREE.Vector3(1, 1, -1),
      new THREE.Vector3(1, 1, 1),
    ].map((point) => point.applyMatrix4(transform));

    const box = new THREE.Box3();
    box.setFromPoints(corners);
    return box.isEmpty() ? null : box;
  }

  // Fallback for axis-aligned min/max style payloads.
  if (bounds.length >= 6) {
    return new THREE.Box3(
      new THREE.Vector3(bounds[0], bounds[1], bounds[2]),
      new THREE.Vector3(bounds[3], bounds[4], bounds[5]),
    );
  }

  return null;
}

export class ObjectLoadingState {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.enabled = false;
    this.models = new Map();
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.clearAll();
  }

  beginModel(modelId) {
    if (!this.enabled) return;

    this.clearModel(modelId);

    const group = new THREE.Group();
    group.name = `mv-stream-placeholders-${modelId}`;
    this.sceneManager.add(group);

    this.models.set(modelId, {
      geometryBounds: new Map(),
      placeholders: new Map(),
      statusByObject: new Map(),
      group,
    });
  }

  registerGeometryChunk(modelId, streamedGeometries) {
    if (!this.enabled) return;
    const model = this.models.get(modelId);
    if (!model || !streamedGeometries) return;

    for (const [rawId, geometryData] of Object.entries(streamedGeometries)) {
      const geometryId = Number(rawId);
      if (!Number.isFinite(geometryId)) continue;
      const bounds = boxFromObbTransform(geometryData?.boundingBox);
      if (!bounds) continue;
      model.geometryBounds.set(geometryId, bounds);
    }
  }

  registerAssetChunk(modelId, streamedAssets) {
    if (!this.enabled) return { added: 0, total: 0, objectIds: [] };
    const model = this.models.get(modelId);
    if (!model || !Array.isArray(streamedAssets)) return { added: 0, total: 0, objectIds: [] };

    let added = 0;
    const objectIds = [];

    for (const asset of streamedAssets) {
      const objectId = Number(asset?.id);
      if (!Number.isFinite(objectId) || model.placeholders.has(objectId)) {
        continue;
      }

      const assetBounds = new THREE.Box3();
      let hasGeometry = false;

      for (const geometryRef of asset.geometries || []) {
        const geomBounds = model.geometryBounds.get(Number(geometryRef?.geometryID));
        if (!geomBounds) continue;
        const transformed = geomBounds.clone().applyMatrix4(
          matrixFromArray(geometryRef?.transformation),
        );
        assetBounds.union(transformed);
        hasGeometry = true;
      }

      if (!hasGeometry || assetBounds.isEmpty()) continue;

      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      assetBounds.getSize(size);
      assetBounds.getCenter(center);

      if (size.lengthSq() < 1e-9) continue;

      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const material = createPlaceholderMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      mesh.name = `mv-stream-placeholder-${modelId}-${objectId}`;
      mesh.userData = {
        modelId,
        objectId,
        loadingState: 'placeholder',
      };

      model.group.add(mesh);
      model.placeholders.set(objectId, mesh);
      model.statusByObject.set(objectId, 'placeholder');
      objectIds.push(objectId);
      added++;
    }

    return { added, total: model.placeholders.size, objectIds };
  }

  markModelReady(modelId) {
    const model = this.models.get(modelId);
    if (!model) return { ready: 0, total: 0 };

    let ready = 0;
    for (const [objectId, mesh] of model.placeholders) {
      model.statusByObject.set(objectId, 'ready');
      ready++;
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
    model.placeholders.clear();

    if (model.group.parent) {
      model.group.parent.remove(model.group);
    }

    return { ready, total: model.statusByObject.size };
  }

  clearModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) return;

    for (const mesh of model.placeholders.values()) {
      if (mesh.parent) mesh.parent.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }

    if (model.group.parent) {
      model.group.parent.remove(model.group);
    }

    this.models.delete(modelId);
  }

  clearAll() {
    for (const modelId of this.models.keys()) {
      this.clearModel(modelId);
    }
  }

  destroy() {
    this.clearAll();
    this.models.clear();
    this.enabled = false;
  }
}
