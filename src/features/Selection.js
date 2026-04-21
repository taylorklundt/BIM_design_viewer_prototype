import * as THREE from 'three';

export class Selection {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.camera = sceneManager.getCamera();
    this.domElement = sceneManager.getDomElement();
    this.scene = sceneManager.getScene();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.selectedElements = new Map();
    this.hoveredElement = null;
    this.hoverEnabled = true;
    this.selectionEnabled = true;

    this.highlightColor = new THREE.Color(0x2066df);


    this.originalMaterials = new Map();
    this._hoverMesh = null;
    this._hoverMat = null;

    this.eventListeners = new Map();

    this.boundOnClick = this.onClick.bind(this);
    this.boundOnDoubleClick = this.onDoubleClick.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnContextMenu = this.onContextMenu.bind(this);

    // Store last intersection for context menu
    this.lastIntersection = null;
    this.rightMouseDown = null;
    this.rightMouseMoved = false;

    this.init();
  }

  init() {
    this.domElement.addEventListener('click', this.boundOnClick);
    this.domElement.addEventListener('dblclick', this.boundOnDoubleClick);
    this.domElement.addEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.addEventListener('mouseup', this.boundOnMouseUp);
    this.domElement.addEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.addEventListener('contextmenu', this.boundOnContextMenu);

    // Create highlight materials
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: this.highlightColor,
      emissive: this.highlightColor,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });

    this.hoverLightnessBoost = 0.105;
  }

  setHoverEffectMode(mode) {
    // Legacy no-op compatibility after removing animated hover effects.
    void mode;
  }

  getHoverEffectMode() {
    return 'gradient';
  }

  getMousePosition(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  raycast(event) {
    this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = [];
    this.scene.traverse((object) => {
      if (object.isMesh && object.visible) {
        meshes.push(object);
      }
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);

    const planes = this.sceneManager.getRenderer().clippingPlanes;
    if (!planes || planes.length === 0) return intersects;
    return intersects.filter(hit => {
      for (const plane of planes) {
        if (plane.distanceToPoint(hit.point) < 0) return false;
      }
      return true;
    });
  }

  onClick(event) {
    if (!this.selectionEnabled) return;

    const intersects = this.raycast(event);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const elementId = this.getElementId(mesh);

      // Handle multi-select with Ctrl/Cmd key
      if (event.ctrlKey || event.metaKey) {
        this.toggleSelect(elementId, mesh);
      } else {
        this.deselect();
        this.select([elementId], [mesh]);
      }

      this.emit('element-click', {
        elementId,
        mesh,
        point: intersects[0].point,
        face: intersects[0].face
      });
    } else {
      // Clicked on empty space - deselect all
      if (!event.ctrlKey && !event.metaKey) {
        this.deselect();
      }
    }
  }

  onDoubleClick(event) {
    const intersects = this.raycast(event);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const elementId = this.getElementId(mesh);

      this.emit('element-double-click', {
        elementId,
        mesh,
        point: intersects[0].point,
        face: intersects[0].face
      });
    }
  }

  openContextMenuAtEvent(event) {
    const intersects = this.raycast(event);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const mesh = intersection.object;
      const elementId = this.getElementId(mesh);

      // Ensure mesh world matrix is up to date
      mesh.updateMatrixWorld(true);

      // Compute world normal from face vertices
      const geometry = mesh.geometry;
      const positionAttribute = geometry.getAttribute('position');
      const face = intersection.face;

      // Get face vertices in local space
      const vA = new THREE.Vector3().fromBufferAttribute(positionAttribute, face.a);
      const vB = new THREE.Vector3().fromBufferAttribute(positionAttribute, face.b);
      const vC = new THREE.Vector3().fromBufferAttribute(positionAttribute, face.c);

      // Build the world matrix - for InstancedMesh, include the instance transform
      let worldMatrix = mesh.matrixWorld.clone();

      if (mesh.isInstancedMesh && intersection.instanceId !== undefined) {
        // Get the instance's local matrix
        const instanceMatrix = new THREE.Matrix4();
        mesh.getMatrixAt(intersection.instanceId, instanceMatrix);

        // Combine: worldMatrix = mesh.matrixWorld * instanceMatrix
        worldMatrix = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, instanceMatrix);
      }

      // Transform vertices to world space
      vA.applyMatrix4(worldMatrix);
      vB.applyMatrix4(worldMatrix);
      vC.applyMatrix4(worldMatrix);

      // Compute normal from cross product of edges
      const edge1 = new THREE.Vector3().subVectors(vB, vA);
      const edge2 = new THREE.Vector3().subVectors(vC, vA);
      const worldNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      console.log('[Selection] Context menu intersection:', {
        isInstancedMesh: mesh.isInstancedMesh,
        instanceId: intersection.instanceId,
        faceNormal: { x: face.normal.x, y: face.normal.y, z: face.normal.z },
        computedWorldNormal: { x: worldNormal.x, y: worldNormal.y, z: worldNormal.z },
        point: { x: intersection.point.x, y: intersection.point.y, z: intersection.point.z }
      });

      this.lastIntersection = {
        elementId,
        mesh,
        point: intersection.point.clone(),
        face: intersection.face,
        normal: worldNormal,
        screenX: event.clientX,
        screenY: event.clientY
      };

      this.emit('context-menu', this.lastIntersection);
    } else {
      // Right-clicked on empty space
      this.lastIntersection = null;
      this.emit('context-menu', {
        elementId: null,
        mesh: null,
        point: null,
        face: null,
        normal: null,
        screenX: event.clientX,
        screenY: event.clientY
      });
    }
  }

  onMouseDown(event) {
    if (event.button !== 2) return;
    this.rightMouseDown = { x: event.clientX, y: event.clientY };
    this.rightMouseMoved = false;
  }

  onMouseUp(event) {
    if (event.button !== 2) return;
    const wasRightClick = !!this.rightMouseDown && !this.rightMouseMoved;
    this.rightMouseDown = null;
    this.rightMouseMoved = false;
    if (wasRightClick) {
      this.openContextMenuAtEvent(event);
    }
  }

  onContextMenu(event) {
    // Always suppress browser-native context menu. We open our custom menu
    // on right-click mouseup only (not while holding/right-dragging).
    event.preventDefault();
  }

  getLastIntersection() {
    return this.lastIntersection;
  }

  onMouseMove(event) {
    if (this.rightMouseDown) {
      const dx = event.clientX - this.rightMouseDown.x;
      const dy = event.clientY - this.rightMouseDown.y;
      if ((dx * dx + dy * dy) > 16) {
        this.rightMouseMoved = true;
      }
    }

    if (!this.hoverEnabled) return;

    const intersects = this.raycast(event);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const elementId = this.getElementId(mesh);

      if (this.hoveredElement !== mesh) {
        // Remove hover from previous element
        if (this.hoveredElement) {
          this.removeHover(this.hoveredElement);
        }

        // Apply hover to new element (if not selected)
        if (!this.selectedElements.has(elementId)) {
          this.applyHover(mesh);
        }

        this.hoveredElement = mesh;

        this.emit('element-hover', {
          elementId,
          mesh,
          point: intersects[0].point
        });
      }
    } else {
      // No intersection - remove hover
      if (this.hoveredElement) {
        this.removeHover(this.hoveredElement);
        this.hoveredElement = null;

        this.emit('element-hover', { elementId: null, mesh: null });
      }
    }
  }

  getElementId(mesh) {
    // Try to get IFC express ID or use UUID
    return mesh.userData?.expressID || mesh.uuid;
  }

  select(elementIds, meshes) {
    if (!elementIds || !meshes) return;

    const newlySelected = [];

    for (let i = 0; i < elementIds.length; i++) {
      const elementId = elementIds[i];
      const mesh = meshes[i];

      if (mesh && !this.selectedElements.has(elementId)) {
        this.applyHighlight(mesh);
        this.selectedElements.set(elementId, mesh);
        newlySelected.push(elementId);
      }
    }

    if (newlySelected.length > 0) {
      this.emit('selection-change', {
        selected: Array.from(this.selectedElements.keys()),
        added: newlySelected,
        removed: []
      });
    }
  }

  selectByIds(elementIds) {
    const meshes = [];

    this.scene.traverse((object) => {
      if (object.isMesh) {
        const id = this.getElementId(object);
        if (elementIds.includes(id)) {
          meshes.push(object);
        }
      }
    });

    if (meshes.length > 0) {
      const ids = meshes.map(m => this.getElementId(m));
      this.select(ids, meshes);
    }
  }

  deselect(elementIds) {
    const removed = [];

    if (elementIds) {
      // Deselect specific elements
      elementIds.forEach(id => {
        const mesh = this.selectedElements.get(id);
        if (mesh) {
          this.removeHighlight(mesh);
          this.selectedElements.delete(id);
          removed.push(id);
        }
      });
    } else {
      // Deselect all
      this.selectedElements.forEach((mesh, id) => {
        this.removeHighlight(mesh);
        removed.push(id);
      });
      this.selectedElements.clear();
    }

    if (removed.length > 0) {
      this.emit('selection-change', {
        selected: Array.from(this.selectedElements.keys()),
        added: [],
        removed
      });
    }
  }

  getSelected() {
    return Array.from(this.selectedElements.keys());
  }

  getSelectedMeshes() {
    return Array.from(this.selectedElements.values());
  }

  toggleSelect(elementId, mesh) {
    if (this.selectedElements.has(elementId)) {
      this.deselect([elementId]);
    } else if (mesh) {
      this.select([elementId], [mesh]);
    }
  }

  setHighlightColor(color) {
    this.highlightColor = new THREE.Color(color);
    this.highlightMaterial.color.copy(this.highlightColor);
    this.highlightMaterial.emissive.copy(this.highlightColor);
  }

  setHoverEnabled(enabled) {
    this.hoverEnabled = enabled;
    if (!enabled && this.hoveredElement) {
      this.removeHover(this.hoveredElement);
      this.hoveredElement = null;
    }
  }

  setSelectionEnabled(enabled) {
    this.selectionEnabled = enabled;
  }

  pickAtPoint(x, y) {
    this.mouse.x = x;
    this.mouse.y = y;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = [];
    this.scene.traverse((object) => {
      if (object.isMesh && object.visible) {
        meshes.push(object);
      }
    });

    let intersects = this.raycaster.intersectObjects(meshes, false);
    const planes = this.sceneManager.getRenderer().clippingPlanes;
    if (planes && planes.length > 0) {
      intersects = intersects.filter(hit => {
        for (const plane of planes) {
          if (plane.distanceToPoint(hit.point) < 0) return false;
        }
        return true;
      });
    }

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      return {
        elementId: this.getElementId(mesh),
        mesh,
        point: intersects[0].point,
        face: intersects[0].face
      };
    }

    return null;
  }

  applyHighlight(mesh) {
    if (!mesh || !mesh.material) return;

    // Store original material if not already stored
    if (!this.originalMaterials.has(mesh.uuid)) {
      this.originalMaterials.set(mesh.uuid, mesh.material);
    }

    // Apply highlight
    mesh.material = this.highlightMaterial.clone();
  }

  removeHighlight(mesh) {
    if (!mesh) return;

    // Restore original material
    const originalMaterial = this.originalMaterials.get(mesh.uuid);
    if (originalMaterial) {
      mesh.material = originalMaterial;
      this.originalMaterials.delete(mesh.uuid);
    }
  }

  applyHover(mesh) {
    if (!mesh || !mesh.material) return;

    if (!this.originalMaterials.has(mesh.uuid)) {
      this.originalMaterials.set(mesh.uuid, mesh.material);
    }

    const origColor = mesh.material.color || new THREE.Color(0xcccccc);
    const hsl = {};
    origColor.getHSL(hsl);

    const lightenedColor = new THREE.Color().setHSL(
      hsl.h,
      hsl.s,
      Math.min(hsl.l + this.hoverLightnessBoost, 0.95)
    );

    const hoverMat = new THREE.MeshStandardMaterial({
      color: lightenedColor,
      emissive: lightenedColor,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
    });

    mesh.material = hoverMat;
    this._hoverMesh = mesh;
    this._hoverMat = hoverMat;
  }

  removeHover(mesh) {
    if (!mesh) return;

    this._hoverMesh = null;
    this._hoverMat = null;

    const elementId = this.getElementId(mesh);
    if (!this.selectedElements.has(elementId)) {
      const originalMaterial = this.originalMaterials.get(mesh.uuid);
      if (originalMaterial) {
        mesh.material = originalMaterial;
        this.originalMaterials.delete(mesh.uuid);
      }
    } else {
      mesh.material = this.highlightMaterial.clone();
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
    this.domElement.removeEventListener('click', this.boundOnClick);
    this.domElement.removeEventListener('dblclick', this.boundOnDoubleClick);
    this.domElement.removeEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.removeEventListener('mouseup', this.boundOnMouseUp);
    this.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.removeEventListener('contextmenu', this.boundOnContextMenu);

    // Restore all original materials
    this.originalMaterials.forEach((material, uuid) => {
      const mesh = this.scene.getObjectByProperty('uuid', uuid);
      if (mesh) {
        mesh.material = material;
      }
    });

    this.originalMaterials.clear();
    this.selectedElements.clear();
    this.eventListeners.clear();
  }
}
