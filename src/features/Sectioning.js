import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Sectioning - Manages clipping planes for sectioning the model
 */

export class Sectioning {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.getScene();
    this.renderer = sceneManager.getRenderer();
    this.camera = sceneManager.getCamera();
    this.domElement = sceneManager.getDomElement();
    this._mvContainer = this.domElement.closest('.model-viewer') || this.domElement.parentElement;

    this._setCursor = (value) => {
      if (value === 'none') {
        this._mvContainer.classList.add('mv-cursor-none');
      } else {
        this._mvContainer.classList.remove('mv-cursor-none');
      }
      this.domElement.style.cursor = value;
    };

    // Clipping planes storage
    this.clipPlanes = new Map(); // id -> { plane, normal, point, helper, enabled }
    this.planeIdCounter = 0;

    // Enable clipping on renderer
    this.renderer.localClippingEnabled = true;

    // Drag state
    this.isDragging = false;
    this.dragPlaneId = null;
    this.dragStartPoint = new THREE.Vector3();
    this.dragPlane = new THREE.Plane();
    this.activeSectionPlaneId = null;

    // Helpers group
    this.helpersGroup = new THREE.Group();
    this.helpersGroup.name = 'SectionPlaneHelpers';
    this.scene.add(this.helpersGroup);

    // Raycaster for plane interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Event listeners
    this.eventListeners = new Map();

    // Bind event handlers
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);

    // Cached scene bounds for plane sizing
    this.sceneBounds = null;

    // Active sectioning tool state
    this.activeTool = null; // 'section-plane' | 'section-box' | 'section-cut' | null
    this.sectionBoxPlaneIds = [];
    this.sectionBoxGroup = null;
    this.hoverHighlight = null;
    this.previewGroup = null;

    // Section-cut authoring state
    this.cutState = null;       // { anchorPoint, surfaceNormal, tangent, bitangent, angle }
    this.cutGizmoGroup = null;
    this.cutPreviewClip = null; // live THREE.Plane applied to renderer during authoring
    this.cutDragging = false;
    this.cutHoverMarker = null;
    this.planeHoverMarker = null;
    this._hoveringCutEditIcon = false;
    this._cutClickPending = null; // section-cut only: { hit, normal, screenX, screenY, wasAnchored }
    this._cutClickThreshold = 5; // pixels of movement before treating as camera drag
    this._cutSurfaceHighlight = null;   // overlay mesh for hovered surface
    this._cutHighlightCacheKey = null;  // "meshUuid:instanceId:faceIndex" to skip redundant rebuilds
    this._cutHoverMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff33,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      clippingPlanes: [],
    });
    this._planeHoverMaterial = new THREE.MeshBasicMaterial({
      color: 0x56ff77,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      clippingPlanes: [],
    });

    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this._onToolChange = null;

    this._arrowSpriteTexture = null;
    this._loadArrowSpriteTexture();

    // Persistent cut contour visuals (outline + icon), visible in and out of sectioning mode
    this._cutContours = new Map(); // planeId → { group, planeNormal, anchorPoint, surfaceNormal, angle, tangent, bitangent }
    this._cutContoursGroup = new THREE.Group();
    this._cutContoursGroup.name = 'CutContours';
    this.scene.add(this._cutContoursGroup);

    // Section-plane default-state overlays (ring-with-arrows icon per set plane)
    this._planeOverlays = new Map(); // planeId → { el, worldPos }
    this._hoveringPlaneEditIcon = false;

    // Live contour outline + fill for the active edit-state section plane
    // Rendered in a separate THREE.Scene to bypass global clipping planes
    this._activePlaneContour = null;
    this._activePlaneContourPlaneId = null;

    // Mode-scoped action history for undo/redo/reset
    this._actionHistory = [];  // stack of { undo(), redo() }
    this._redoStack = [];
    this._skipRecord = false;
    this._dragCumulativeDistance = 0;

    // ── Tilt gizmo (2-axis section plane tilt control) ──────────────
    // Tunable constants — adjust these to change gizmo feel
    this.TILT_MAX_ANGLE = Math.PI / 4;     // 45° max tilt per axis
    this.TILT_SENSITIVITY = 1.0;           // drag-to-angle multiplier
    this.GIZMO_SCALE_FACTOR = 0.08;        // camera-distance → scale multiplier
    this.GIZMO_SCALE_MIN = 0.3;            // minimum gizmo scale
    this.GIZMO_SCALE_MAX = 5.0;            // maximum gizmo scale

    this._tiltGizmoTemplate = null;        // loaded GLTF scene (cloned per use)
    this._tiltGizmo = null;                // active THREE.Group in the scene
    this._tiltRingX = null;                // Ring_X mesh ref (forward/back tilt)
    this._tiltRingY = null;                // Ring_Y mesh ref (left/right tilt)
    this._tiltDragging = false;
    this._tiltAxis = null;                 // 'x' | 'y' while dragging
    this._tiltDragStartAngle = 0;          // angle at drag start on the ring plane
    this._tiltBeforeQuat = null;           // quaternion snapshot for undo
    this._tiltCumulativeX = 0;             // accumulated tilt around local X
    this._tiltCumulativeY = 0;             // accumulated tilt around local Y
    this._tiltBaseQuat = null;             // quaternion at drag start (before this drag)
    this._tiltHoveredRing = null;          // currently hovered ring mesh
    this._loadTiltGizmo();

    // Screen-space scissors icon overlay for section-cut hover
    this.scissorsOverlay = document.createElement('div');
    this.scissorsOverlay.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_8214_4571)"><path d="M6 12.5C3.51472 12.5 1.5 14.5147 1.5 17C1.5 19.4853 3.51472 21.5 6 21.5C8.48528 21.5 10.5 19.4853 10.5 17C10.5 16.8982 10.4949 16.7974 10.4883 16.6973L13.3564 15.041L18.3877 17.9463C20.0617 18.9128 22.2024 18.3389 23.1689 16.665L23.4189 16.2314L22.9863 15.9814L17.3574 12.7314L22.9854 9.48242L23.4189 9.23242L23.1689 8.79883C22.2024 7.12493 20.0617 6.5512 18.3877 7.51758L13.3564 10.4219L10.4385 8.73633C10.4779 8.49665 10.5 8.25085 10.5 8C10.5 5.51472 8.48528 3.5 6 3.5C3.51472 3.5 1.5 5.51472 1.5 8C1.5 10.4853 3.51472 12.5 6 12.5ZM6 12.5C6.91392 12.5 7.76377 12.7731 8.47363 13.2412L9.35645 12.7314L8.0752 11.9922C7.45408 12.3157 6.74877 12.5 6 12.5ZM6 15.5C5.17157 15.5 4.5 16.1716 4.5 17C4.5 17.8284 5.17157 18.5 6 18.5C6.82843 18.5 7.5 17.8284 7.5 17C7.5 16.1716 6.82843 15.5 6 15.5ZM6 6.5C5.17157 6.5 4.5 7.17157 4.5 8C4.5 8.82843 5.17157 9.5 6 9.5C6.82843 9.5 7.5 8.82843 7.5 8C7.5 7.17157 6.82843 6.5 6 6.5Z" fill="#006C16" stroke="#00FF33"/></g><defs><clipPath id="clip0_8214_4571"><rect width="24" height="24" fill="white"/></clipPath></defs></svg>`;
    Object.assign(this.scissorsOverlay.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: '999',
      display: 'none',
    });
    const overlayParent = this.domElement.parentElement || this.domElement;
    overlayParent.appendChild(this.scissorsOverlay);

    this.init();
  }

  setActiveTool(tool) {
    const prevTool = this.activeTool;
    this.activeTool = tool;
    // Outside sectioning mode, keep cuts but hide all interactive helpers.
    this.helpersGroup.visible = Boolean(tool);
    if (tool !== 'section-plane' && tool !== 'section-cut') {
      this.clearCutHoverMarker();
      this.clearPlaneHoverMarker();
      this._removeCutSurfaceHighlight();
      this.clearHoverHighlight();
      this._setCursor('');
    }
    if (tool !== 'section-plane') {
      if (this.activeSectionPlaneId) {
        this._setSectionPlaneDefault(this.activeSectionPlaneId);
      }
      this.activeSectionPlaneId = null;
      this._refreshSectionPlaneActiveVisuals();
      this._clearActivePlaneContour();
    }
    for (const [, data] of this._planeOverlays) {
      if (data.el) data.el.style.display = 'flex';
    }

    // Cancel in-progress surface-cut authoring when switching away.
    const prevWasSurfaceCutTool = prevTool === 'section-cut' || prevTool === 'section-plane';
    const nextIsSurfaceCutTool = tool === 'section-cut' || tool === 'section-plane';
    if (prevWasSurfaceCutTool && !nextIsSurfaceCutTool) {
      this.cancelCutAuthoring();
      document.removeEventListener('keydown', this.boundOnKeyDown);
    }

    // Attach keyboard listener for section-cut/section-plane authoring.
    if (nextIsSurfaceCutTool && !prevWasSurfaceCutTool) {
      document.addEventListener('keydown', this.boundOnKeyDown);
    }

    if (this._onToolChange) this._onToolChange(tool);

    this.emit('tool-change', { tool });
  }

  onToolChange(callback) {
    this._onToolChange = callback;
  }

  /**
   * Calculate the bounding box of all meshes in the scene
   */
  getSceneBounds() {
    const box = new THREE.Box3();

    this.scene.traverse((object) => {
      if (object.isMesh && object.visible && !object.userData.isPlaneHelper) {
        const objectBox = new THREE.Box3().setFromObject(object);
        box.union(objectBox);
      }
    });

    if (box.isEmpty()) {
      // Default bounds if no meshes found
      box.set(
        new THREE.Vector3(-10, -10, -10),
        new THREE.Vector3(10, 10, 10)
      );
    }

    return box;
  }

  /**
   * Get plane size based on scene bounds and plane normal
   * Size is based on dimensions perpendicular to the normal
   */
  getPlaneSizeFromBounds(normal) {
    const bounds = this.getSceneBounds();
    const size = new THREE.Vector3();
    bounds.getSize(size);

    // Get absolute normal components to determine which dimensions matter
    const absNormal = new THREE.Vector3(
      Math.abs(normal.x),
      Math.abs(normal.y),
      Math.abs(normal.z)
    );

    // Calculate the size perpendicular to the normal
    // Weight each dimension by how perpendicular it is to the normal
    let planeWidth, planeHeight;

    if (absNormal.z > absNormal.x && absNormal.z > absNormal.y) {
      // Normal mostly in Z direction - plane spans X and Y
      planeWidth = size.x;
      planeHeight = size.y;
    } else if (absNormal.y > absNormal.x && absNormal.y > absNormal.z) {
      // Normal mostly in Y direction - plane spans X and Z
      planeWidth = size.x;
      planeHeight = size.z;
    } else {
      // Normal mostly in X direction - plane spans Y and Z
      planeWidth = size.y;
      planeHeight = size.z;
    }

    // Use the larger of the two perpendicular dimensions + 10% padding
    const planeSize = Math.max(planeWidth, planeHeight) * 1.1;

    return planeSize;
  }

  init() {
    this.domElement.addEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.addEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.addEventListener('mouseup', this.boundOnMouseUp);

    // Frame loop to keep HTML overlay icons in sync with camera
    this._overlayAnimId = null;
    const tick = () => {
      this._overlayAnimId = requestAnimationFrame(tick);
      if (this._cutContours.size > 0) {
        this._updateCutEditOverlayPositions();
      }
      if (this._planeOverlays.size > 0) {
        this._updatePlaneOverlayPositions();
      }
      // Keep LineMaterial resolution in sync with viewport
      this._cutContoursGroup.traverse(obj => {
        if (obj.material?.isLineMaterial) {
          obj.material.resolution.set(this.domElement.clientWidth, this.domElement.clientHeight);
        }
      });
      if (this._activePlaneContour) {
        this._activePlaneContour.traverse(obj => {
          if (obj.material?.isLineMaterial) {
            obj.material.resolution.set(this.domElement.clientWidth, this.domElement.clientHeight);
          }
        });
      }
      if (this.planeHoverMarker?.userData._arrowSprite) {
        this._updateArrowSpriteRotation();
      }
      if (this._activePlaneContour || (this.activeSectionPlaneId && this.planeHoverMarker) || this._tiltGizmoScene) {
        this._renderActivePlaneContour();
      }
      // Tilt gizmo: keep scale consistent on screen regardless of camera distance
      if (this._tiltGizmo && this.activeSectionPlaneId) {
        const pd = this.clipPlanes.get(this.activeSectionPlaneId);
        if (pd) {
          const d = this.camera.position.distanceTo(pd.point);
          const s = THREE.MathUtils.clamp(
            d * this.GIZMO_SCALE_FACTOR, this.GIZMO_SCALE_MIN, this.GIZMO_SCALE_MAX
          );
          this._tiltGizmo.scale.setScalar(s);
        }
        // Keep world matrices current for raycasting (gizmo is in a separate scene)
        if (this._tiltGizmoScene) this._tiltGizmoScene.updateMatrixWorld(true);
      }
    };
    tick();
  }

  // ── Mode-scoped action history ────────────────────────────────────

  _pushAction(action) {
    if (this._skipRecord) return;
    this._actionHistory.push(action);
    this._redoStack = [];
  }

  undo() {
    // If there's an in-progress cut authoring (anchor placed, preview showing),
    // cancel it first before touching the committed action history.
    if (this.cutState) {
      this.cancelCutAuthoring();
      this.syncRendererClipPlanes();
      return;
    }
    if (this._actionHistory.length === 0) return;
    const action = this._actionHistory.pop();
    this._skipRecord = true;
    try { action.undo(); } finally { this._skipRecord = false; }
    this._redoStack.push(action);
    this.syncRendererClipPlanes();
  }

  redo() {
    if (this._redoStack.length === 0) return;
    const action = this._redoStack.pop();
    this._skipRecord = true;
    try { action.redo(); } finally { this._skipRecord = false; }
    this._actionHistory.push(action);
  }

  resetMode() {
    if (this.cutState) this.cancelCutAuthoring();
    this.clearCutHoverMarker();
    this.clearPlaneHoverMarker();
    this._removeCutSurfaceHighlight();
    this._skipRecord = true;
    try {
      while (this._actionHistory.length > 0) {
        const action = this._actionHistory.pop();
        action.undo();
      }
    } finally { this._skipRecord = false; }
    this._redoStack = [];
    this.syncRendererClipPlanes();
  }

  clearHistory() {
    this._actionHistory = [];
    this._redoStack = [];
  }

  _restoreClipPlane(id, normal, point, opts = {}) {
    const plane = new THREE.Plane();
    const clipNormal = normal.clone().normalize().negate();
    plane.setFromNormalAndCoplanarPoint(clipNormal, point.clone());
    const planeSize = this.getPlaneSizeFromBounds(normal);
    const helper = this.createPlaneHelper(plane, normal, point, planeSize);
    helper.userData.planeId = id;
    if (opts.hideHelper) helper.visible = false;
    this.helpersGroup.add(helper);
    this.clipPlanes.set(id, {
      id, plane,
      normal: normal.clone().normalize(),
      point: point.clone(),
      helper, enabled: true, visible: true,
    });
    this.updateRendererClipPlanes();
    this.emit('plane-add', { id, plane, normal, point });
  }

  // ── End action history ────────────────────────────────────────────

  /**
   * Add a clipping plane from a normal and point
   * @param {THREE.Vector3} normal - Plane normal direction
   * @param {THREE.Vector3} point - Point on the plane
   * @returns {string} Plane ID
   */
  addClipPlane(normal, point, opts = {}) {
    const id = `plane-${++this.planeIdCounter}`;

    const plane = new THREE.Plane();
    const clipNormal = normal.clone().normalize().negate();
    plane.setFromNormalAndCoplanarPoint(clipNormal, point.clone());

    // Calculate plane size based on model bounds and plane orientation
    const planeSize = this.getPlaneSizeFromBounds(normal);

    // Create visual helper (hidden for section-cut commits)
    const helper = this.createPlaneHelper(plane, normal, point, planeSize);
    helper.userData.planeId = id;
    if (opts.hideHelper) helper.visible = false;
    this.helpersGroup.add(helper);

    // Store plane data
    this.clipPlanes.set(id, {
      id,
      plane,
      normal: normal.clone().normalize(),
      point: point.clone(),
      helper,
      enabled: true,
      visible: true
    });

    // Update renderer clipping planes
    this.updateRendererClipPlanes();

    this.emit('plane-add', { id, plane, normal, point });

    const savedNormal = normal.clone();
    const savedPoint = point.clone();
    const savedOpts = { ...opts };
    const savedCutAuthoring = opts.cutAuthoring ? { ...opts.cutAuthoring } : null;
    this._pushAction({
      type: 'add-plane',
      undo: () => { this.removeClipPlane(id); },
      redo: () => {
        this._restoreClipPlane(id, savedNormal, savedPoint, savedOpts);
        if (savedCutAuthoring) this._buildCutContour(id, savedCutAuthoring);
      },
    });

    return id;
  }

  _setActiveSectionPlane(planeId) {
    this.activeSectionPlaneId = planeId || null;
    this._refreshSectionPlaneActiveVisuals();
  }

  _refreshSectionPlaneActiveVisuals() {
    // No visible helper children to update — visuals are handled by overlays
  }

  _resolveInwardSectionPlaneNormal(point, normal) {
    const resolved = normal.clone().normalize();
    const bounds = this.getSceneBounds();
    const center = bounds.getCenter(new THREE.Vector3());
    const towardCenter = center.sub(point);
    if (towardCenter.lengthSq() > 1e-8) {
      towardCenter.normalize();
      if (resolved.dot(towardCenter) < 0) {
        resolved.negate();
      }
    }
    return resolved;
  }

  _getSectionPlanePlacementPoint(point, inwardNormal) {
    const bounds = this.getSceneBounds();
    const size = bounds.getSize(new THREE.Vector3());
    const sceneDiag = Math.max(size.x, size.y, size.z);
    const epsilon = Math.max(sceneDiag * 0.0005, 0.0005);
    return point.clone().addScaledVector(inwardNormal, epsilon);
  }

  _resolvePlaneIdFromHelperObject(object3D) {
    let node = object3D;
    while (node) {
      if (node.userData?.planeId) return node.userData.planeId;
      node = node.parent;
    }
    return null;
  }

  _beginPlaneDrag(planeId, startPoint) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return false;

    this.isDragging = true;
    this.dragPlaneId = planeId;
    this.dragStartPoint.copy(startPoint);
    this._dragCumulativeDistance = 0;

    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    this.dragPlane.setFromNormalAndCoplanarPoint(cameraDir, this.dragStartPoint);
    this.emit('drag-start', { planeId });
    return true;
  }

  /**
   * Create visual helper for clipping plane
   */
  createPlaneHelper(plane, normal, point, size = 5) {
    const group = new THREE.Group();
    group.position.copy(point);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    group.quaternion.copy(quaternion);
    return group;
  }

  /**
   * Remove a clipping plane
   */
  removeClipPlane(planeId) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return false;

    // Remove helper from scene
    if (planeData.helper) {
      this.helpersGroup.remove(planeData.helper);
      this.disposeHelper(planeData.helper);
    }

    // Remove associated cut contour visuals
    this._removeCutContour(planeId);

    // Remove associated plane overlay
    this._removePlaneOverlay(planeId);

    // Remove from map
    this.clipPlanes.delete(planeId);
    if (this.activeSectionPlaneId === planeId) {
      this.activeSectionPlaneId = null;
    }

    // Update renderer
    this.updateRendererClipPlanes();

    this.emit('plane-remove', { id: planeId });

    return true;
  }

  /**
   * Clear all clipping planes
   */
  clearClipPlanes() {
    const ids = Array.from(this.clipPlanes.keys());
    ids.forEach(id => this.removeClipPlane(id));
    this.activeSectionPlaneId = null;
    this.sectionBoxPlaneIds = [];
    this.emit('planes-clear');
  }

  activateSectionBox() {
    this.clearSectionBox();

    const bounds = this.getSceneBounds();
    const min = bounds.min.clone();
    const max = bounds.max.clone();
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    const epsilon = 0.001;
    const halfExtents = size.clone().multiplyScalar(0.5).addScalar(epsilon);

    const planesData = [
      { normal: new THREE.Vector3(1, 0, 0), point: new THREE.Vector3(center.x + halfExtents.x, center.y, center.z) },
      { normal: new THREE.Vector3(-1, 0, 0), point: new THREE.Vector3(center.x - halfExtents.x, center.y, center.z) },
      { normal: new THREE.Vector3(0, 1, 0), point: new THREE.Vector3(center.x, center.y + halfExtents.y, center.z) },
      { normal: new THREE.Vector3(0, -1, 0), point: new THREE.Vector3(center.x, center.y - halfExtents.y, center.z) },
      { normal: new THREE.Vector3(0, 0, 1), point: new THREE.Vector3(center.x, center.y, center.z + halfExtents.z) },
      { normal: new THREE.Vector3(0, 0, -1), point: new THREE.Vector3(center.x, center.y, center.z - halfExtents.z) },
    ];

    // Suppress individual plane actions — we record the whole box as one action
    const prevSkip = this._skipRecord;
    this._skipRecord = true;
    const planeIds = [];
    planesData.forEach(({ normal, point }) => {
      const id = this.addClipPlane(normal, point);
      planeIds.push(id);
    });
    this._skipRecord = prevSkip;
    this.sectionBoxPlaneIds = planeIds;

    const boxGeometry = new THREE.BoxGeometry(
      Math.max(max.x - min.x, 0.01),
      Math.max(max.y - min.y, 0.01),
      Math.max(max.z - min.z, 0.01)
    );
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const material = new THREE.LineBasicMaterial({ color: 0x00a8ff, transparent: true, opacity: 0.8 });
    const wireframe = new THREE.LineSegments(edges, material);
    wireframe.position.copy(center);
    wireframe.userData.isPlaneHelper = true;

    this.sectionBoxGroup = new THREE.Group();
    this.sectionBoxGroup.name = 'SectionBoxHelper';
    this.sectionBoxGroup.add(wireframe);
    this.helpersGroup.add(this.sectionBoxGroup);

    const savedPlanesData = planesData.map(p => ({ normal: p.normal.clone(), point: p.point.clone() }));
    this._pushAction({
      type: 'section-box',
      undo: () => { this.clearSectionBox(); },
      redo: () => { this.activateSectionBox(); },
    });

    this.emit('section-box-activate', { planeIds });
    return planeIds;
  }

  clearSectionBox() {
    const ids = [...this.sectionBoxPlaneIds];
    ids.forEach(id => this.removeClipPlane(id));
    this.sectionBoxPlaneIds = [];

    if (this.sectionBoxGroup) {
      this.helpersGroup.remove(this.sectionBoxGroup);
      this.disposeHelper(this.sectionBoxGroup);
      this.sectionBoxGroup = null;
    }
  }

  setHoverHighlight(mesh, faceIndex) {
    this.clearHoverHighlight();
    if (!mesh || !mesh.geometry || !Number.isInteger(faceIndex)) return;

    const geometry = mesh.geometry;
    if (!geometry.index || !geometry.attributes?.position) return;
    const indexAttr = geometry.index;
    const positionAttr = geometry.attributes.position;
    const i0 = indexAttr.getX(faceIndex * 3 + 0);
    const i1 = indexAttr.getX(faceIndex * 3 + 1);
    const i2 = indexAttr.getX(faceIndex * 3 + 2);
    if (i0 == null || i1 == null || i2 == null) return;

    const v0 = new THREE.Vector3(positionAttr.getX(i0), positionAttr.getY(i0), positionAttr.getZ(i0));
    const v1 = new THREE.Vector3(positionAttr.getX(i1), positionAttr.getY(i1), positionAttr.getZ(i1));
    const v2 = new THREE.Vector3(positionAttr.getX(i2), positionAttr.getY(i2), positionAttr.getZ(i2));

    const highlightGeometry = new THREE.BufferGeometry().setFromPoints([v0, v1, v2]);
    highlightGeometry.setIndex([0, 1, 2]);
    highlightGeometry.computeVertexNormals();

    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00a8ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.userData.isPlaneHelper = true;
    highlightMesh.matrixAutoUpdate = false;
    highlightMesh.matrix.copy(mesh.matrixWorld);

    this.hoverHighlight = highlightMesh;
    this.helpersGroup.add(highlightMesh);
  }

  clearHoverHighlight() {
    if (!this.hoverHighlight) return;
    this.helpersGroup.remove(this.hoverHighlight);
    this.disposeHelper(this.hoverHighlight);
    this.hoverHighlight = null;
  }

  // ── Section-Cut Authoring ──────────────────────────────────────────

  _filterClippedHits(hits) {
    const planes = this.renderer.clippingPlanes;
    if (!planes || planes.length === 0) return hits;
    return hits.filter(hit => {
      for (const plane of planes) {
        if (plane.distanceToPoint(hit.point) < 0) return false;
      }
      return true;
    });
  }

  getWorldNormalFromHit(hit) {
    const pos = hit.object.geometry?.attributes?.position;
    if (!pos || !hit.face) return null;

    // Build the full world matrix, including per-instance transform if applicable
    const fullMatrix = new THREE.Matrix4();
    if (hit.object.isInstancedMesh && hit.instanceId != null) {
      const instanceMat = new THREE.Matrix4();
      hit.object.getMatrixAt(hit.instanceId, instanceMat);
      fullMatrix.multiplyMatrices(hit.object.matrixWorld, instanceMat);
    } else {
      fullMatrix.copy(hit.object.matrixWorld);
    }

    const { a, b, c } = hit.face;
    const vA = new THREE.Vector3().fromBufferAttribute(pos, a).applyMatrix4(fullMatrix);
    const vB = new THREE.Vector3().fromBufferAttribute(pos, b).applyMatrix4(fullMatrix);
    const vC = new THREE.Vector3().fromBufferAttribute(pos, c).applyMatrix4(fullMatrix);

    const normal = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(vB, vA),
        new THREE.Vector3().subVectors(vC, vA),
      )
      .normalize();

    if (!Number.isFinite(normal.x) || !Number.isFinite(normal.y) || !Number.isFinite(normal.z)) return null;

    // Ensure normal faces the camera (outward toward viewer)
    const viewDir = this.raycaster.ray.direction;
    if (normal.dot(viewDir) > 0) normal.negate();

    return normal;
  }

  _applyCutSurfaceHighlight(hit, material = this._cutHoverMaterial) {
    const mesh = hit.object;
    const instanceId = hit.instanceId ?? -1;
    const faceIndex = hit.faceIndex;
    const cacheKey = `${mesh.uuid}:${instanceId}:${faceIndex}`;
    if (this._cutHighlightCacheKey === cacheKey) return;

    this._removeCutSurfaceHighlight();
    if (!mesh || !mesh.geometry) return;

    const geometry = mesh.geometry;
    const index = geometry.index;
    const posAttr = geometry.attributes.position;
    if (!posAttr || !hit.face) return;

    // Full world transform (matrixWorld * instanceMatrix) — same as getWorldNormalFromHit
    const fullMatrix = new THREE.Matrix4();
    if (mesh.isInstancedMesh && instanceId >= 0) {
      const instMat = new THREE.Matrix4();
      mesh.getMatrixAt(instanceId, instMat);
      fullMatrix.multiplyMatrices(mesh.matrixWorld, instMat);
    } else {
      fullMatrix.copy(mesh.matrixWorld);
    }

    // Compute hit-face normal and plane in WORLD space
    const hVA = new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.a).applyMatrix4(fullMatrix);
    const hVB = new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.b).applyMatrix4(fullMatrix);
    const hVC = new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.c).applyMatrix4(fullMatrix);
    const hitNormal = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(hVB, hVA),
        new THREE.Vector3().subVectors(hVC, hVA),
      ).normalize();
    const viewDir = this.raycaster.ray.direction;
    if (hitNormal.dot(viewDir) > 0) hitNormal.negate();
    const planeD = hitNormal.dot(hVA);

    const faceCount = index ? index.count / 3 : posAttr.count / 3;
    const normalThresh = 0.95;
    const distThresh = 0.05;

    // Snap world-space positions to a grid so duplicated vertices at the same
    // spatial location produce the same hash. IFC geometry frequently duplicates
    // vertices per-face for hard normals, so index-based adjacency misses edges.
    const SNAP = 1e4;
    const posHash = (v) => `${Math.round(v.x * SNAP)},${Math.round(v.y * SNAP)},${Math.round(v.z * SNAP)}`;
    const spatialEdgeKey = (h1, h2) => h1 < h2 ? `${h1}|${h2}` : `${h2}|${h1}`;

    const candidateFaces = new Set();
    const faceVerts = [];    // [faceIdx] → {wA, wB, wC, hA, hB, hC}
    const edgeToFaces = {};  // "posHash|posHash" → [faceIdx, …]
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const tempN = new THREE.Vector3();

    for (let i = 0; i < faceCount; i++) {
      let a, b, c;
      if (index) {
        a = index.getX(i * 3);
        b = index.getX(i * 3 + 1);
        c = index.getX(i * 3 + 2);
      } else {
        a = i * 3; b = i * 3 + 1; c = i * 3 + 2;
      }

      vA.fromBufferAttribute(posAttr, a).applyMatrix4(fullMatrix);
      vB.fromBufferAttribute(posAttr, b).applyMatrix4(fullMatrix);
      vC.fromBufferAttribute(posAttr, c).applyMatrix4(fullMatrix);

      tempN.crossVectors(
        vB.clone().sub(vA),
        vC.clone().sub(vA)
      ).normalize();

      if (tempN.dot(hitNormal) < normalThresh) continue;
      if (tempN.dot(viewDir) > 0) continue;

      if (
        Math.abs(hitNormal.dot(vA) - planeD) > distThresh ||
        Math.abs(hitNormal.dot(vB) - planeD) > distThresh ||
        Math.abs(hitNormal.dot(vC) - planeD) > distThresh
      ) continue;

      const hA = posHash(vA), hB = posHash(vB), hC = posHash(vC);
      candidateFaces.add(i);
      faceVerts[i] = { wA: vA.clone(), wB: vB.clone(), wC: vC.clone(), hA, hB, hC };

      for (const ek of [spatialEdgeKey(hA, hB), spatialEdgeKey(hB, hC), spatialEdgeKey(hA, hC)]) {
        if (!edgeToFaces[ek]) edgeToFaces[ek] = [];
        edgeToFaces[ek].push(i);
      }
    }

    if (!candidateFaces.has(faceIndex)) return;

    // Flood-fill from the hit face through spatially-shared edges to find
    // only the connected surface, not disconnected coplanar patches.
    const visited = new Set();
    const queue = [faceIndex];
    visited.add(faceIndex);
    while (queue.length > 0) {
      const fi = queue.pop();
      const fv = faceVerts[fi];
      if (!fv) continue;
      for (const ek of [spatialEdgeKey(fv.hA, fv.hB), spatialEdgeKey(fv.hB, fv.hC), spatialEdgeKey(fv.hA, fv.hC)]) {
        const neighbors = edgeToFaces[ek];
        if (!neighbors) continue;
        for (const ni of neighbors) {
          if (!visited.has(ni) && candidateFaces.has(ni)) {
            visited.add(ni);
            queue.push(ni);
          }
        }
      }
    }

    // Build overlay geometry from connected faces (already in world space)
    const positions = [];
    for (const fi of visited) {
      const fv = faceVerts[fi];
      if (!fv) continue;
      positions.push(
        fv.wA.x, fv.wA.y, fv.wA.z,
        fv.wB.x, fv.wB.y, fv.wB.z,
        fv.wC.x, fv.wC.y, fv.wC.z,
      );
    }

    if (positions.length === 0) return;

    const hlGeo = new THREE.BufferGeometry();
    hlGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const hlMesh = new THREE.Mesh(hlGeo, material);
    hlMesh.userData.isPlaneHelper = true;
    hlMesh.renderOrder = 999;

    this._cutSurfaceHighlight = hlMesh;
    this._cutHighlightCacheKey = cacheKey;
    this.helpersGroup.add(hlMesh);
  }

  _removeCutSurfaceHighlight() {
    if (!this._cutSurfaceHighlight) return;
    this.helpersGroup.remove(this._cutSurfaceHighlight);
    this._cutSurfaceHighlight.geometry.dispose();
    this._cutSurfaceHighlight = null;
    this._cutHighlightCacheKey = null;
  }

  setCutHoverMarker(point, normal) {
    this.clearCutHoverMarker();

    const camDist = this.camera.position.distanceTo(point);
    const radius = camDist * 0.02;

    // Compute surface-aligned tangent/bitangent so the crosshair arms
    // follow the face edges rather than being arbitrarily rotated.
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    if (Math.abs(normal.dot(up)) > 0.99) {
      tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
    } else {
      tangent.crossVectors(normal, up).normalize();
    }
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const group = new THREE.Group();
    group.userData.isPlaneHelper = true;

    const strokeWidth = radius * 0.15;
    const outlineExtra = strokeWidth * 0.6;
    const armLen = radius;

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x006c16,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      clippingPlanes: [],
    });
    const strokeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff33,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      clippingPlanes: [],
    });

    const origin = point.clone().addScaledVector(normal, radius * 0.15);

    // Shared orientation bases
    const arm1Z = normal.clone();
    const arm1X = tangent.clone();
    const arm1Y = new THREE.Vector3().crossVectors(arm1Z, arm1X).normalize();
    const arm1Quat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(arm1X, arm1Y, arm1Z)
    );
    const arm2X = bitangent.clone();
    const arm2Y = new THREE.Vector3().crossVectors(arm1Z, arm2X).normalize();
    const arm2Quat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(arm2X, arm2Y, arm1Z)
    );

    const makeRoundedDashGeo = (len, width) => {
      const hw = len / 2, hh = width / 2;
      const r = Math.min(hh, hw);
      const shape = new THREE.Shape();
      shape.moveTo(-hw + r, -hh);
      shape.lineTo(hw - r, -hh);
      shape.absarc(hw - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(-hw + r, hh);
      shape.absarc(-hw + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
      return new THREE.ShapeGeometry(shape, 12);
    };

    const dashLen = armLen * 0.28;
    const gapLen = armLen * 0.14;
    const totalArm = armLen;

    const addDashedArm = (dirVec, quat) => {
      let offset = dashLen / 2;
      while (offset + dashLen / 2 <= totalArm + 0.001) {
        for (const sign of [1, -1]) {
          const dashOrigin = origin.clone().addScaledVector(dirVec, sign * offset);

          // Stroke dash (behind)
          const sGeo = makeRoundedDashGeo(dashLen + outlineExtra, strokeWidth + outlineExtra);
          const sMesh = new THREE.Mesh(sGeo, strokeMat);
          sMesh.userData.isPlaneHelper = true;
          sMesh.renderOrder = 999;
          sMesh.position.copy(dashOrigin);
          sMesh.quaternion.copy(quat);
          group.add(sMesh);

          // Fill dash (on top)
          const fGeo = makeRoundedDashGeo(dashLen, strokeWidth);
          const fMesh = new THREE.Mesh(fGeo, fillMat);
          fMesh.userData.isPlaneHelper = true;
          fMesh.renderOrder = 1000;
          fMesh.position.copy(dashOrigin);
          fMesh.quaternion.copy(quat);
          group.add(fMesh);
        }
        offset += dashLen + gapLen;
      }
    };

    addDashedArm(tangent, arm1Quat);
    addDashedArm(bitangent, arm2Quat);

    this.cutHoverMarker = group;
    this.helpersGroup.add(group);

    // Position scissors overlay in screen space above the 3D point
    this._showScissorsOverlay(point);
  }

  _loadArrowSpriteTexture() {
    const svgStr = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="m" maskUnits="userSpaceOnUse" x="5.34277" y="1" width="13" height="22" fill="black">
<rect fill="white" x="5.34277" y="1" width="13" height="22"/>
<path d="M16.9493 6.95016C17.3398 7.34067 17.3397 7.97375 16.9492 8.36423C16.5587 8.75473 15.9256 8.75473 15.5351 8.36423L13.8536 6.68266C13.5386 6.36767 13 6.59076 13 7.03621L13 17.2773C13 17.7227 13.5386 17.9458 13.8536 17.6308L15.5348 15.9495C15.9255 15.5589 16.559 15.5592 16.9495 15.95C17.3398 16.3405 17.3398 16.9737 16.9494 17.3641L12.707 21.6064C12.3165 21.9969 11.6834 21.997 11.2929 21.6065L7.04976 17.3641C6.65927 16.9737 6.65927 16.3405 7.04959 15.9499C7.44008 15.5592 8.07357 15.5589 8.46419 15.9495L10.1464 17.6318C10.4614 17.9468 11 17.7237 11 17.2782L11 7.03523C11 6.58978 10.4614 6.3667 10.1464 6.68168L8.46387 8.36426C8.07338 8.75474 7.44029 8.75474 7.0498 8.36426C6.65932 7.97378 6.65932 7.34068 7.0498 6.9502L11.2928 2.70717C11.6834 2.31662 12.3166 2.31665 12.7071 2.70723L16.9493 6.95016Z"/>
</mask>
<path d="M16.9493 6.95016C17.3398 7.34067 17.3397 7.97375 16.9492 8.36423C16.5587 8.75473 15.9256 8.75473 15.5351 8.36423L13.8536 6.68266C13.5386 6.36767 13 6.59076 13 7.03621L13 17.2773C13 17.7227 13.5386 17.9458 13.8536 17.6308L15.5348 15.9495C15.9255 15.5589 16.559 15.5592 16.9495 15.95C17.3398 16.3405 17.3398 16.9737 16.9494 17.3641L12.707 21.6064C12.3165 21.9969 11.6834 21.997 11.2929 21.6065L7.04976 17.3641C6.65927 16.9737 6.65927 16.3405 7.04959 15.9499C7.44008 15.5592 8.07357 15.5589 8.46419 15.9495L10.1464 17.6318C10.4614 17.9468 11 17.7237 11 17.2782L11 7.03523C11 6.58978 10.4614 6.3667 10.1464 6.68168L8.46387 8.36426C8.07338 8.75474 7.44029 8.75474 7.0498 8.36426C6.65932 7.97378 6.65932 7.34068 7.0498 6.9502L11.2928 2.70717C11.6834 2.31662 12.3166 2.31665 12.7071 2.70723L16.9493 6.95016Z" fill="#194D1E"/>
<path d="M11.2928 2.70717L10.5857 2.00006L11.2928 2.70717ZM7.0498 6.9502L6.3427 6.24309L7.0498 6.9502ZM8.46387 8.36426L7.75676 7.65715L8.46387 8.36426ZM10.1464 17.6318L10.8536 16.9247L10.1464 17.6318ZM7.04976 17.3641L6.34271 18.0713L7.04976 17.3641ZM12.707 21.6064L11.9999 20.8993L12.707 21.6064ZM11.2929 21.6065L10.5858 22.3137L11.2929 21.6065ZM16.9495 15.95L17.6568 15.2431L16.9495 15.95ZM16.9494 17.3641L17.6565 18.0712L16.9494 17.3641ZM13.8536 17.6308L14.5607 18.3379L13.8536 17.6308ZM16.9492 8.36423L16.2421 7.65712L16.9492 8.36423ZM16.9493 6.95016L16.2421 7.65721L16.9493 6.95016ZM15.5351 8.36423L16.2422 7.65712L14.5607 5.97555L13.8536 6.68266L13.1464 7.38976L14.828 9.07133L15.5351 8.36423ZM13 7.03621H12L12 17.2773H13H14L14 7.03621H13ZM13.8536 17.6308L14.5607 18.3379L16.2419 16.6566L15.5348 15.9495L14.8277 15.2424L13.1464 16.9237L13.8536 17.6308ZM16.9494 17.3641L16.2423 16.657L11.9999 20.8993L12.707 21.6064L13.4142 22.3135L17.6565 18.0712L16.9494 17.3641ZM11.2929 21.6065L11.9999 20.8993L7.7568 16.6569L7.04976 17.3641L6.34271 18.0713L10.5858 22.3137L11.2929 21.6065ZM8.46419 15.9495L7.75708 16.6566L9.43934 18.3389L10.1464 17.6318L10.8536 16.9247L9.17129 15.2424L8.46419 15.9495ZM11 17.2782H12L12 7.03523H11H10L10 17.2782H11ZM10.1464 6.68168L9.43934 5.97457L7.75676 7.65715L8.46387 8.36426L9.17097 9.07136L10.8536 7.38879L10.1464 6.68168ZM7.0498 6.9502L7.75691 7.6573L11.9999 3.41427L11.2928 2.70717L10.5857 2.00006L6.3427 6.24309L7.0498 6.9502ZM12.7071 2.70723L11.9999 3.41427L16.2421 7.65721L16.9493 6.95016L17.6565 6.24312L13.4143 2.00018L12.7071 2.70723ZM11.2928 2.70717L11.9999 3.41427L11.9999 3.41427L12.7071 2.70723L13.4143 2.00018C12.6332 1.21902 11.3668 1.21896 10.5857 2.00006L11.2928 2.70717ZM7.0498 8.36426L7.75691 7.65715V7.6573L7.0498 6.9502L6.3427 6.24309C5.56169 7.0241 5.56169 8.29036 6.3427 9.07136L7.0498 8.36426ZM8.46387 8.36426L7.75676 7.65715L7.75691 7.65715L7.0498 8.36426L6.3427 9.07136C7.1237 9.85237 8.38997 9.85237 9.17097 9.07136L8.46387 8.36426ZM11 7.03523H12C12 5.69887 10.3843 5.02962 9.43934 5.97457L10.1464 6.68168L10.8536 7.38879C10.5386 7.70377 10 7.48068 10 7.03523H11ZM10.1464 17.6318L9.43934 18.3389C10.3843 19.2839 12 18.6146 12 17.2782H11H10C10 16.8328 10.5386 16.6097 10.8536 16.9247L10.1464 17.6318ZM7.04959 15.9499L7.75694 16.6568L7.75708 16.6566L8.46419 15.9495L9.17129 15.2424C8.38987 14.461 7.12303 14.4617 6.34224 15.2431L7.04959 15.9499ZM7.04976 17.3641L7.7568 16.6569L7.75694 16.6568L7.04959 15.9499L6.34224 15.2431C5.56178 16.0241 5.56156 17.2902 6.34271 18.0713L7.04976 17.3641ZM12.707 21.6064L11.9999 20.8993V20.8993L11.2929 21.6065L10.5858 22.3137C11.3669 23.0946 12.6332 23.0945 13.4142 22.3135L12.707 21.6064ZM16.9495 15.95L16.2421 16.6568L16.2423 16.657L16.9494 17.3641L17.6565 18.0712C18.4376 17.2901 18.4372 16.024 17.6568 15.2431L16.9495 15.95ZM15.5348 15.9495L16.2419 16.6566L16.2421 16.6568L16.9495 15.95L17.6568 15.2431C16.8761 14.4618 15.6092 14.461 14.8277 15.2424L15.5348 15.9495ZM13 17.2773H12C12 18.6136 13.6157 19.2829 14.5607 18.3379L13.8536 17.6308L13.1464 16.9237C13.4614 16.6087 14 16.8318 14 17.2773H13ZM13.8536 6.68266L14.5607 5.97555C13.6157 5.0306 12 5.69985 12 7.03621H13H14C14 7.48166 13.4614 7.70474 13.1464 7.38976L13.8536 6.68266ZM16.9492 8.36423L16.2421 7.65712H16.2422L15.5351 8.36423L14.828 9.07133C15.609 9.85236 16.8753 9.85236 17.6564 9.07133L16.9492 8.36423ZM16.9492 8.36423L17.6564 9.07133C18.4373 8.29036 18.4374 7.02416 17.6565 6.24312L16.9493 6.95016L16.2421 7.65721L16.2421 7.65712L16.9492 8.36423Z" fill="#56FF77" mask="url(#m)"/>
</svg>`;
    const sz = 256;
    const canvas = document.createElement('canvas');
    canvas.width = sz;
    canvas.height = sz;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, sz, sz);
      const tex = new THREE.CanvasTexture(canvas);
      tex.premultiplyAlpha = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      this._arrowSpriteTexture = tex;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  }

  _loadTiltGizmo() {
    const loader = new GLTFLoader();
    loader.load('/assets/gizmo/scene.gltf', (gltf) => {
      this._tiltGizmoTemplate = gltf.scene;
    });
  }

  // ── Tilt gizmo: attach / detach / sync ─────────────────────────────

  _attachTiltGizmo(planeId) {
    this._detachTiltGizmo();
    if (!this._tiltGizmoTemplate) return;

    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    const inner = this._tiltGizmoTemplate.clone();

    // Strip to 2 rings only — hide arrows, cubes, and the Z-roll ring
    inner.traverse(node => {
      if (node.name === 'Arrows_3' || node.name === 'Cubes_7') {
        node.visible = false;
      }
      if (node.name === 'Ring_Z_10') {
        node.visible = false;
      }
    });

    // Recolor kept rings to green and exempt from clipping
    const greenEmissive = new THREE.Color(0x56ff77);
    const ringXMeshes = [];
    const ringYMeshes = [];

    inner.traverse(node => {
      if (!node.isMesh) return;

      if (node.material) {
        node.material = node.material.clone();
        node.material.clippingPlanes = [];
        node.material.emissive = greenEmissive.clone();
        node.material.emissiveIntensity = 1.0;
      }

      let p = node.parent;
      while (p) {
        if (p.name === 'Ring_X_8') { ringXMeshes.push(node); break; }
        if (p.name === 'Ring_Y_9') { ringYMeshes.push(node); break; }
        p = p.parent;
      }
    });

    inner.traverse(node => {
      if (node.isMesh) node.userData.isTiltGizmo = true;
    });

    ringXMeshes.forEach(m => { m.userData._tiltAxis = 'x'; });
    ringYMeshes.forEach(m => { m.userData._tiltAxis = 'y'; });

    this._tiltRingXMeshes = ringXMeshes;
    this._tiltRingYMeshes = ringYMeshes;

    // Wrap in a Group so position/quaternion/scale changes take effect.
    // The GLTF clone's root node has matrixAutoUpdate=false (baked matrices),
    // so setting quaternion directly on it is silently ignored by Three.js.
    const gizmo = new THREE.Group();
    gizmo.add(inner);

    // Position — offset along normal so gizmo sits outside the cut surface
    const bounds = this.getSceneBounds();
    const bSize = new THREE.Vector3();
    bounds.getSize(bSize);
    const gizmoOffset = Math.max(bSize.x, bSize.y, bSize.z) * 0.03;
    gizmo.position.copy(planeData.point)
      .addScaledVector(planeData.normal, gizmoOffset);

    // Orient — the gizmo's two visible rings (Ring_X in YZ, Ring_Y in XZ) intersect
    // along the Z axis, forming the visual "cross". Map Z to the outward normal so
    // the cross-point faces away from the cut.
    const targetDir = planeData.normal.clone().normalize();
    gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetDir);

    // Initial camera-distance-based scale
    const dist = this.camera.position.distanceTo(planeData.point);
    const scale = THREE.MathUtils.clamp(
      dist * this.GIZMO_SCALE_FACTOR, this.GIZMO_SCALE_MIN, this.GIZMO_SCALE_MAX
    );
    gizmo.scale.setScalar(scale);

    // Render in a dedicated scene so we can bypass all clipping planes
    this._tiltGizmoScene = new THREE.Scene();
    this._tiltGizmoScene.add(gizmo);
    this._tiltGizmo = gizmo;

    this._tiltCumulativeX = 0;
    this._tiltCumulativeY = 0;
  }

  _detachTiltGizmo() {
    if (!this._tiltGizmo) return;

    if (this._tiltGizmoScene) {
      this._tiltGizmoScene.remove(this._tiltGizmo);
      this._tiltGizmoScene = null;
    }
    this._tiltGizmo.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    this._tiltGizmo = null;
    this._tiltRingXMeshes = null;
    this._tiltRingYMeshes = null;
    this._tiltDragging = false;
    this._tiltAxis = null;
    this._tiltHoveredRing = null;
  }

  _unhighlightTiltRing() {
    if (this._tiltHoveredRing && this._tiltHoveredRing.material) {
      this._tiltHoveredRing.material.emissiveIntensity =
        this._tiltHoveredRing.material._origEmissiveIntensity ?? 1.0;
    }
    this._tiltHoveredRing = null;
  }

  _syncTiltToClipPlane(planeId) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData || !planeData.helper) return;

    // Derive new normal from helper's rotated local Z
    const newNormal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(planeData.helper.quaternion);
    planeData.normal.copy(newNormal);

    // Rebuild THREE.Plane (negated normal for Three.js clipping convention)
    planeData.plane.setFromNormalAndCoplanarPoint(
      newNormal.clone().negate(), planeData.point
    );

    this.updateRendererClipPlanes();
    this._buildActivePlaneContour();
  }

  setPlaneHoverMarker(point, normal) {
    this.clearPlaneHoverMarker();

    const camDist = this.camera.position.distanceTo(point);
    const radius = camDist * 0.02;
    const strokeW = radius * 0.08;
    const outerR = radius;
    const innerR = outerR * 0.5;

    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    if (Math.abs(normal.dot(up)) > 0.99) {
      tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
    } else {
      tangent.crossVectors(normal, up).normalize();
    }
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const group = new THREE.Group();
    group.userData.isPlaneHelper = true;

    const matOpts = { transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false, clippingPlanes: [] };

    const greenMat = new THREE.MeshBasicMaterial({ ...matOpts, color: 0x56ff77, opacity: 1.0 });
    const greenFillMat = new THREE.MeshBasicMaterial({ ...matOpts, color: 0x56ff77, opacity: 0.3 });
    const darkMat = new THREE.MeshBasicMaterial({ ...matOpts, color: 0x194d1e, opacity: 0.6 });

    const ringStroke = new THREE.Mesh(new THREE.RingGeometry(outerR - strokeW, outerR, 48), greenMat);
    ringStroke.userData.isPlaneHelper = true;
    ringStroke.renderOrder = 1001;
    group.add(ringStroke);

    const ringFill = new THREE.Mesh(new THREE.RingGeometry(innerR, outerR - strokeW, 48), greenFillMat);
    ringFill.userData.isPlaneHelper = true;
    ringFill.renderOrder = 1000;
    group.add(ringFill);

    const center = new THREE.Mesh(new THREE.CircleGeometry(innerR, 32), darkMat);
    center.userData.isPlaneHelper = true;
    center.renderOrder = 1002;
    group.add(center);

    const basisQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(tangent, bitangent, normal),
    );
    group.quaternion.copy(basisQuat);
    group.position.copy(point).addScaledVector(normal, radius * 0.05);

    if (this._arrowSpriteTexture) {
      const spriteMat = new THREE.SpriteMaterial({
        map: this._arrowSpriteTexture,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        sizeAttenuation: true,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.userData.isPlaneHelper = true;
      sprite.renderOrder = 1010;
      const spriteSize = outerR * 1.65;
      sprite.scale.set(spriteSize, spriteSize, 1);
      sprite.position.set(0, 0, outerR * 1.2);
      group.add(sprite);
      group.userData._arrowSprite = sprite;
      group.userData._planeNormal = normal.clone();
    }

    this.planeHoverMarker = group;
    this.helpersGroup.add(group);
    this._updateArrowSpriteRotation();
    this._setCursor('none');
  }

  _updateArrowSpriteRotation() {
    if (!this.planeHoverMarker) return;
    const sprite = this.planeHoverMarker.userData._arrowSprite;
    const n = this.planeHoverMarker.userData._planeNormal;
    if (!sprite || !n) return;

    const worldPos = new THREE.Vector3();
    sprite.getWorldPosition(worldPos);
    const p1 = worldPos.clone().project(this.camera);
    const p2 = worldPos.clone().add(n).project(this.camera);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.0001) {
      sprite.material.rotation = -Math.atan2(dx, dy);
    }
  }

  clearCutHoverMarker() {
    if (!this.cutHoverMarker) return;
    this.helpersGroup.remove(this.cutHoverMarker);
    this.disposeHelper(this.cutHoverMarker);
    this.cutHoverMarker = null;
    this._hideScissorsOverlay();
  }

  clearPlaneHoverMarker() {
    if (!this.planeHoverMarker) return;
    this.helpersGroup.remove(this.planeHoverMarker);
    this.disposeHelper(this.planeHoverMarker);
    this.planeHoverMarker = null;
  }

  _showScissorsOverlay(worldPoint) {
    if (!this.scissorsOverlay) return;
    const projected = worldPoint.clone().project(this.camera);
    const rect = this.domElement.getBoundingClientRect();
    const x = ((projected.x + 1) / 2) * rect.width;
    const y = ((-projected.y + 1) / 2) * rect.height;
    this.scissorsOverlay.style.left = `${x - 12}px`;
    this.scissorsOverlay.style.top = `${y - 36}px`;
    this.scissorsOverlay.style.display = 'block';
  }

  _hideScissorsOverlay() {
    if (this.scissorsOverlay) this.scissorsOverlay.style.display = 'none';
  }

  placeCutAnchor(point, normal) {
    this.clearCutHoverMarker();
    this.clearPlaneHoverMarker();
    this.clearHoverHighlight();
    this._removeCutSurfaceHighlight();

    const tangent = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(up)) > 0.99) {
      tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
    } else {
      tangent.crossVectors(normal, up).normalize();
    }
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    this.cutState = {
      anchorPoint: point.clone(),
      surfaceNormal: normal.clone().normalize(),
      tangent: tangent.clone(),
      bitangent: bitangent.clone(),
      angle: 0,
    };

    this.buildCutGizmo();
    this.updateCutPreview();
  }

  buildCutGizmo() {
    if (this.cutGizmoGroup) {
      this.helpersGroup.remove(this.cutGizmoGroup);
      this.disposeHelper(this.cutGizmoGroup);
    }

    const s = this.cutState;
    const group = new THREE.Group();
    group.userData.isPlaneHelper = true;

    const bounds = this.getSceneBounds();
    const bSize = new THREE.Vector3();
    bounds.getSize(bSize);
    const sceneDiag = Math.max(bSize.x, bSize.y, bSize.z);
    const ringRadius = sceneDiag * 0.04;
    const surfaceOffset = ringRadius * 0.06;

    // Uniform stroke width (≈4px at normal zoom distance)
    const strokeW = ringRadius * 0.06;

    // Anchor dot — small sphere at the click point
    const dotGeo = new THREE.SphereGeometry(strokeW * 1.2, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff33, depthTest: false, clippingPlanes: [] });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.userData.isPlaneHelper = true;
    dot.renderOrder = 1003;
    dot.position.copy(s.anchorPoint).addScaledVector(s.surfaceNormal, surfaceOffset);
    group.add(dot);

    // Stroked ring — uniform stroke width
    const ringInner = ringRadius - strokeW;
    const ringGeo = new THREE.RingGeometry(ringInner, ringRadius, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff33,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      clippingPlanes: [],
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.userData.isPlaneHelper = true;
    ringMesh.userData.isCutRing = true;
    ringMesh.renderOrder = 1000;
    ringMesh.position.copy(s.anchorPoint).addScaledVector(s.surfaceNormal, surfaceOffset);
    const ringQuat = new THREE.Quaternion();
    ringQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), s.surfaceNormal);
    ringMesh.quaternion.copy(ringQuat);
    group.add(ringMesh);

    // Direction line — same stroke width as ring
    const dirVec = new THREE.Vector3()
      .addScaledVector(s.tangent, Math.cos(s.angle))
      .addScaledVector(s.bitangent, Math.sin(s.angle))
      .normalize();
    const lineLen = sceneDiag * 0.5;
    const lineOrigin = s.anchorPoint.clone().addScaledVector(s.surfaceNormal, surfaceOffset);
    const lineGeo = new THREE.PlaneGeometry(lineLen * 2, strokeW);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x00ff33,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      clippingPlanes: [],
    });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.userData.isPlaneHelper = true;
    line.userData.isCutLine = true;
    line.renderOrder = 1001;
    line.position.copy(lineOrigin);
    const lineZ = s.surfaceNormal.clone();
    const lineX = dirVec.clone();
    const lineY = new THREE.Vector3().crossVectors(lineZ, lineX).normalize();
    line.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(lineX, lineY, lineZ)
    );
    group.add(line);

    // Semicircle fill inside the ring on the arrow side.
    // CircleGeometry(r, segs, 0, PI) draws a half-disc in XY:
    //   flat edge along X-axis, arc bulges toward +Y.
    // Orient so X → dirVec (flat edge = direction line), Y → clipDir (bulge toward arrow), Z → surfaceNormal.
    const planeNormal = new THREE.Vector3().crossVectors(dirVec, s.surfaceNormal).normalize();
    const clipDir = planeNormal.clone().negate();
    const semiFillGeo = new THREE.CircleGeometry(ringInner, 32, 0, Math.PI);
    const semiFillMat = new THREE.MeshBasicMaterial({
      color: 0x006c16,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false,
      clippingPlanes: [],
    });
    const semiFill = new THREE.Mesh(semiFillGeo, semiFillMat);
    semiFill.userData.isPlaneHelper = true;
    semiFill.userData.isCutSemiFill = true;
    semiFill.renderOrder = 999;
    semiFill.position.copy(s.anchorPoint).addScaledVector(s.surfaceNormal, surfaceOffset);
    const semiX = dirVec.clone().normalize();
    const semiY = clipDir.clone().normalize();
    const semiZ = s.surfaceNormal.clone().normalize();
    semiFill.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(semiX, semiY, semiZ)
    );
    group.add(semiFill);

    // Direction indicator: triangle arrow
    const arrowSize = ringRadius * 0.8;
    const indicator = this._buildCutDirectionIndicator(
      clipDir, s.anchorPoint, arrowSize, s.surfaceNormal, strokeW
    );
    group.add(indicator);

    this.cutGizmoGroup = group;
    this.helpersGroup.add(group);
  }

  _buildCutDirectionIndicator(direction, origin, size, faceNormal, strokeW) {
    const group = new THREE.Group();
    group.userData.isPlaneHelper = true;
    group.userData.isCutArrow = true;

    const triH = size * 0.7;
    const triHW = size * 0.5;
    const tipR = size * 0.12;

    // Triangle with rounded tip, drawn in XY with +Y = forward
    const triShape = new THREE.Shape();
    // Start at tip (rounded)
    triShape.moveTo(0, triH - tipR);
    triShape.absarc(0, triH - tipR, tipR, 0, Math.PI, false);
    // Left base
    triShape.lineTo(-triHW, -triH * 0.15);
    // Base
    triShape.lineTo(triHW, -triH * 0.15);
    // Back to right of tip
    triShape.lineTo(tipR, triH - tipR);

    // Triangle stroke (larger)
    const triStrokeShape = new THREE.Shape();
    const so = strokeW * 0.7;
    triStrokeShape.moveTo(0, triH - tipR + so);
    triStrokeShape.absarc(0, triH - tipR, tipR + so, 0, Math.PI, false);
    triStrokeShape.lineTo(-triHW - so, -triH * 0.15 - so);
    triStrokeShape.lineTo(triHW + so, -triH * 0.15 - so);
    triStrokeShape.lineTo(tipR + so, triH - tipR);

    const triStrokeGeo = new THREE.ShapeGeometry(triStrokeShape, 12);
    const triStrokeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff33,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      clippingPlanes: [],
    });
    const triStrokeMesh = new THREE.Mesh(triStrokeGeo, triStrokeMat);
    triStrokeMesh.userData.isPlaneHelper = true;
    triStrokeMesh.renderOrder = 1002;
    group.add(triStrokeMesh);

    const triFillGeo = new THREE.ShapeGeometry(triShape, 12);
    const triFillMat = new THREE.MeshBasicMaterial({
      color: 0x006c16,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      clippingPlanes: [],
    });
    const triFillMesh = new THREE.Mesh(triFillGeo, triFillMat);
    triFillMesh.userData.isPlaneHelper = true;
    triFillMesh.renderOrder = 1003;
    group.add(triFillMesh);

    // Orient: shapes drawn in XY with +Y = forward direction.
    // Align +Y → direction, keep flat against faceNormal.
    const targetY = direction.clone().normalize();
    const targetZ = faceNormal.clone().normalize();
    const targetX = new THREE.Vector3().crossVectors(targetY, targetZ).normalize();
    targetZ.crossVectors(targetX, targetY).normalize();

    group.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(targetX, targetY, targetZ)
    );
    group.position.copy(origin);

    return group;
  }

  updateCutGizmo() {
    if (!this.cutState || !this.cutGizmoGroup) return;
    const s = this.cutState;

    const bounds = this.getSceneBounds();
    const bSize = new THREE.Vector3();
    bounds.getSize(bSize);
    const sceneDiag = Math.max(bSize.x, bSize.y, bSize.z);
    const ringRadius = sceneDiag * 0.04;
    const surfaceOffset = ringRadius * 0.06;
    const lineLen = sceneDiag * 0.5;

    const dirVec = new THREE.Vector3()
      .addScaledVector(s.tangent, Math.cos(s.angle))
      .addScaledVector(s.bitangent, Math.sin(s.angle))
      .normalize();

    const planeNormal = new THREE.Vector3().crossVectors(dirVec, s.surfaceNormal).normalize();
    const lineOrigin = s.anchorPoint.clone().addScaledVector(s.surfaceNormal, surfaceOffset);

    const clipDir = planeNormal.clone().negate();

    this.cutGizmoGroup.traverse(obj => {
      if (obj.userData.isCutLine) {
        obj.position.copy(lineOrigin);
        const lineZ = s.surfaceNormal.clone();
        const lineX = dirVec.clone();
        const lineY = new THREE.Vector3().crossVectors(lineZ, lineX).normalize();
        obj.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(lineX, lineY, lineZ)
        );
      }
      if (obj.userData.isCutSemiFill) {
        const semiX = dirVec.clone().normalize();
        const semiY = clipDir.clone().normalize();
        const semiZ = s.surfaceNormal.clone().normalize();
        obj.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(semiX, semiY, semiZ)
        );
      }
    });

    // Replace direction indicator
    const oldArrow = [];
    this.cutGizmoGroup.traverse(obj => {
      if (obj.userData.isCutArrow) oldArrow.push(obj);
    });
    oldArrow.forEach(a => {
      this.cutGizmoGroup.remove(a);
      this.disposeHelper(a);
    });
    const strokeW = ringRadius * 0.06;
    const arrowSize = ringRadius * 0.8;
    const indicator = this._buildCutDirectionIndicator(
      clipDir, s.anchorPoint, arrowSize, s.surfaceNormal, strokeW
    );
    this.cutGizmoGroup.add(indicator);
  }

  updateCutPreview() {
    if (!this.cutState) {
      this.removeCutPreviewClip();
      return;
    }
    const s = this.cutState;
    const dirVec = new THREE.Vector3()
      .addScaledVector(s.tangent, Math.cos(s.angle))
      .addScaledVector(s.bitangent, Math.sin(s.angle))
      .normalize();

    const planeNormal = new THREE.Vector3().crossVectors(dirVec, s.surfaceNormal).normalize();
    const clipNormal = planeNormal.clone().negate();
    const clipPlane = new THREE.Plane();
    clipPlane.setFromNormalAndCoplanarPoint(clipNormal, s.anchorPoint);

    this.cutPreviewClip = clipPlane;
    this.syncRendererClipPlanes();
  }

  removeCutPreviewClip() {
    if (!this.cutPreviewClip) return;
    this.cutPreviewClip = null;
    this.syncRendererClipPlanes();
  }

  syncRendererClipPlanes() {
    const activePlanes = [];
    this.clipPlanes.forEach(pd => {
      if (pd.enabled) activePlanes.push(pd.plane);
    });
    if (this.cutPreviewClip) {
      activePlanes.push(this.cutPreviewClip);
    }
    this.renderer.clippingPlanes = activePlanes;
  }

  commitCutAuthoring() {
    if (!this.cutState) return;
    const s = this.cutState;
    const dirVec = new THREE.Vector3()
      .addScaledVector(s.tangent, Math.cos(s.angle))
      .addScaledVector(s.bitangent, Math.sin(s.angle))
      .normalize();
    const planeNormal = new THREE.Vector3().crossVectors(dirVec, s.surfaceNormal).normalize();

    // Save authoring state for re-editing
    const cutAuthoring = {
      anchorPoint: s.anchorPoint.clone(),
      surfaceNormal: s.surfaceNormal.clone(),
      tangent: s.tangent.clone(),
      bitangent: s.bitangent.clone(),
      angle: s.angle,
      planeNormal: planeNormal.clone(),
    };

    this.removeCutPreviewClip();
    this.clearCutGizmo();
    this.cutState = null;

    const planeId = this.addClipPlane(planeNormal, s.anchorPoint, { hideHelper: true, cutAuthoring });

    // Build contour outline + edit icon for this cut
    this._buildCutContour(planeId, cutAuthoring);
  }

  cancelCutAuthoring() {
    this.removeCutPreviewClip();
    this.clearCutGizmo();
    this.clearCutHoverMarker();
    this.clearPlaneHoverMarker();
    this._removeCutSurfaceHighlight();
    this.cutState = null;
    this.cutDragging = false;
  }

  // ── Cut Contour Outline + Edit Icon ─────────────────────────────────

  _buildCutContour(planeId, cutAuthoring) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    const clipPlane = planeData.plane;
    const edges = this._computePlaneIntersection(clipPlane);
    if (edges.length === 0) return;

    const group = new THREE.Group();
    group.name = `CutContour-${planeId}`;
    group.userData.cutContourPlaneId = planeId;

    const positions = [];
    const centroid = new THREE.Vector3();
    let pointCount = 0;
    for (const [p1, p2] of edges) {
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      centroid.add(p1).add(p2);
      pointCount += 2;
    }
    if (pointCount > 0) centroid.divideScalar(pointCount);

    // Thick green contour using LineSegments2 (GPU-width lines)
    const lsGeo = new LineSegmentsGeometry();
    lsGeo.setPositions(positions);
    const lsMat = new LineMaterial({
      color: 0x00ff33,
      linewidth: 3,
      depthTest: false,
      clippingPlanes: [],
      worldUnits: false,
    });
    lsMat.resolution.set(window.innerWidth, window.innerHeight);
    const lineSegs = new LineSegments2(lsGeo, lsMat);
    lineSegs.userData.isCutContour = true;
    lineSegs.renderOrder = 998;
    group.add(lineSegs);

    this._cutContoursGroup.add(group);

    // HTML overlay icon at the centroid (unclippable)
    const overlay = this._createCutEditOverlay(planeId, centroid);

    this._cutContours.set(planeId, {
      group,
      overlay,
      centroid: centroid.clone(),
      ...cutAuthoring,
    });
  }

  _computePlaneIntersection(clipPlane) {
    const meshes = [];
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.visible && !obj.userData.isPlaneHelper &&
          !obj.userData.isCutEditIcon && !obj.userData.isCutContour && !obj.userData.isTiltGizmo &&
          obj.parent?.name !== 'CutContours' &&
          obj.parent?.name !== 'SectionPlaneHelpers') {
        meshes.push(obj);
      }
    });

    const edges = [];
    const planeNormal = clipPlane.normal;
    const planeConstant = clipPlane.constant;

    for (const mesh of meshes) {
      const geo = mesh.geometry;
      const posAttr = geo.attributes.position;
      if (!posAttr) continue;
      const index = geo.index;
      const faceCount = index ? index.count / 3 : posAttr.count / 3;

      // For InstancedMesh, process each instance
      const instanceCount = mesh.isInstancedMesh ? mesh.count : 1;

      for (let inst = 0; inst < instanceCount; inst++) {
        let fullMatrix;
        if (mesh.isInstancedMesh) {
          const instMat = new THREE.Matrix4();
          mesh.getMatrixAt(inst, instMat);
          fullMatrix = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, instMat);
        } else {
          fullMatrix = mesh.matrixWorld;
        }

        const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();

        for (let i = 0; i < faceCount; i++) {
          let a, b, c;
          if (index) {
            a = index.getX(i * 3);
            b = index.getX(i * 3 + 1);
            c = index.getX(i * 3 + 2);
          } else {
            a = i * 3; b = i * 3 + 1; c = i * 3 + 2;
          }

          vA.fromBufferAttribute(posAttr, a).applyMatrix4(fullMatrix);
          vB.fromBufferAttribute(posAttr, b).applyMatrix4(fullMatrix);
          vC.fromBufferAttribute(posAttr, c).applyMatrix4(fullMatrix);

          // Signed distances from the plane
          const dA = planeNormal.dot(vA) + planeConstant;
          const dB = planeNormal.dot(vB) + planeConstant;
          const dC = planeNormal.dot(vC) + planeConstant;

          const intersectionPoints = [];

          // Check each edge for a sign change (plane crossing)
          if (dA * dB < 0) {
            const t = dA / (dA - dB);
            intersectionPoints.push(new THREE.Vector3().lerpVectors(vA, vB, t));
          }
          if (dB * dC < 0) {
            const t = dB / (dB - dC);
            intersectionPoints.push(new THREE.Vector3().lerpVectors(vB, vC, t));
          }
          if (dA * dC < 0) {
            const t = dA / (dA - dC);
            intersectionPoints.push(new THREE.Vector3().lerpVectors(vA, vC, t));
          }

          if (intersectionPoints.length === 2) {
            edges.push([intersectionPoints[0], intersectionPoints[1]]);
          }
        }
      }
    }

    return edges;
  }

  _createCutEditOverlay(planeId, worldPos) {
    const el = document.createElement('div');
    el.innerHTML = `<svg width="24" height="44" viewBox="0 0 24 44" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_8307_6281)"><g opacity="0.7"><mask id="mask0_8307_6281_c${planeId}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="-1" y="22" width="25" height="31"><path d="M0 22H23.5V40.5L-1 53L0 22Z" fill="#E0E0E0"/></mask><g mask="url(#mask0_8307_6281_c${planeId})"><mask id="path-2-outside-1_8307_6281_c${planeId}" maskUnits="userSpaceOnUse" x="3.82031" y="0" width="17" height="44" fill="black"><rect fill="white" x="3.82031" y="0" width="17" height="44"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z"/></mask><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" fill="#00851A"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" stroke="#56FF77" stroke-width="2" mask="url(#path-2-outside-1_8307_6281_c${planeId})"/></g></g><path d="M12 17.5C15.124 17.5 17.928 18.051 19.933 18.923C20.936 19.359 21.716 19.866 22.238 20.402C22.758 20.937 23 21.476 23 22C23 22.524 22.758 23.063 22.238 23.598C21.716 24.135 20.936 24.641 19.933 25.077C17.928 25.949 15.124 26.5 12 26.5C8.876 26.5 6.072 25.949 4.067 25.077C3.064 24.641 2.284 24.135 1.762 23.598C1.242 23.063 1 22.524 1 22C1 21.476 1.242 20.937 1.762 20.402C2.284 19.866 3.064 19.359 4.067 18.923C6.072 18.051 8.876 17.5 12 17.5Z" fill="#00851A" fill-opacity="0.3" stroke="#56FF77"/><ellipse cx="12" cy="22" rx="5.5" ry="2" fill="#56FF77"/><mask id="mask1_8307_6281_c${planeId}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="-2" y="-2" width="26" height="24"><path d="M-2 -1.5L23.5 -1L23 22H-0.5L-2 -1.5Z" fill="#E0E0E0"/></mask><g mask="url(#mask1_8307_6281_c${planeId})"><mask id="path-7-outside-2_8307_6281_c${planeId}" maskUnits="userSpaceOnUse" x="3.82031" y="0" width="17" height="44" fill="black"><rect fill="white" x="3.82031" y="0" width="17" height="44"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z"/></mask><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" fill="#194D1E"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" stroke="#56FF77" stroke-width="2" mask="url(#path-7-outside-2_8307_6281_c${planeId})"/></g></g></g><defs><clipPath id="clip0_8307_6281"><rect width="24" height="44" fill="white"/></clipPath></defs></svg>`;
    const iconSize = 44;
    const padding = 4;
    const circleSize = iconSize + padding * 2;
    Object.assign(el.style, {
      position: 'absolute',
      pointerEvents: 'auto',
      cursor: 'pointer',
      zIndex: '1000',
      filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
      transform: 'translate(-50%, -50%)',
      display: 'none',
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      borderRadius: '50%',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'rgba(255, 255, 255, 0.3)',
      transition: 'background 0.15s ease',
    });
    el.style.setProperty('display', 'none');
    el.dataset.cutContourPlaneId = planeId;

    el.addEventListener('mouseenter', () => {
      this._hoveringCutEditIcon = true;
      this.clearCutHoverMarker();
      this._removeCutSurfaceHighlight();
      this.clearHoverHighlight();
      this._setCursor('');
      el.style.background = 'rgba(0, 198, 40, 0.7)';
    });
    el.addEventListener('mouseleave', () => {
      this._hoveringCutEditIcon = false;
      el.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.editCutFromContour(planeId);
    });

    const overlayParent = this.domElement.parentElement || this.domElement;
    overlayParent.appendChild(el);

    return { el, worldPos: worldPos.clone() };
  }

  _updateCutEditOverlayPositions() {
    const rect = this.domElement.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const tempV = new THREE.Vector3();
    const tempN = new THREE.Vector3();

    for (const [planeId, data] of this._cutContours) {
      if (!data.overlay) continue;
      tempV.copy(data.overlay.worldPos);
      tempV.project(this.camera);
      const x = (tempV.x * halfW) + halfW;
      const y = -(tempV.y * halfH) + halfH;
      const behind = tempV.z > 1;
      data.overlay.el.style.display = behind ? 'none' : 'flex';
      data.overlay.el.style.left = `${x}px`;
      data.overlay.el.style.top = `${y}px`;

      const planeData = this.clipPlanes.get(planeId);
      if (planeData) {
        tempN.copy(data.overlay.worldPos).add(planeData.normal);
        tempN.project(this.camera);
        const nx = (tempN.x * halfW) + halfW;
        const ny = -(tempN.y * halfH) + halfH;
        const angle = Math.atan2(nx - x, -(ny - y)) * (180 / Math.PI);
        data.overlay.el.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      }
    }
  }

  _removeCutContour(planeId) {
    const data = this._cutContours.get(planeId);
    if (!data) return;
    this._cutContoursGroup.remove(data.group);
    data.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    if (data.overlay?.el?.parentElement) {
      data.overlay.el.parentElement.removeChild(data.overlay.el);
    }
    this._cutContours.delete(planeId);
  }

  _clearAllCutContours() {
    for (const [planeId] of this._cutContours) {
      this._removeCutContour(planeId);
    }
  }

  editCutFromContour(planeId) {
    const contourData = this._cutContours.get(planeId);
    if (!contourData) return;

    // Suppress the undo recording for the plane removal during re-edit
    this._skipRecord = true;

    // Remove the current clip plane (we'll re-create it on commit)
    this.removeClipPlane(planeId);

    this._skipRecord = false;

    // Set up the authoring state from saved data
    this.cutState = {
      anchorPoint: contourData.anchorPoint.clone(),
      surfaceNormal: contourData.surfaceNormal.clone(),
      tangent: contourData.tangent.clone(),
      bitangent: contourData.bitangent.clone(),
      angle: contourData.angle,
    };

    // Ensure section-cut tool is active and helpers visible
    if (this.activeTool !== 'section-cut') {
      this.setActiveTool('section-cut');
    }

    // Build the gizmo and live preview
    this.buildCutGizmo();
    this.updateCutPreview();

    // Signal chrome layer to enter sectioning mode / section-cut
    this.emit('request-edit-cut', { planeId });
  }

  clearCutGizmo() {
    if (!this.cutGizmoGroup) return;
    this.helpersGroup.remove(this.cutGizmoGroup);
    this.disposeHelper(this.cutGizmoGroup);
    this.cutGizmoGroup = null;
  }

  // ── Section-Plane Edit / Default State ────────────────────────────

  _createPlaneEditOverlay(planeId, worldPos) {
    const el = document.createElement('div');
    el.innerHTML = `<svg width="24" height="44" viewBox="0 0 24 44" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_8307_6281)"><g opacity="0.7"><mask id="mask0_8307_6281_p${planeId}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="-1" y="22" width="25" height="31"><path d="M0 22H23.5V40.5L-1 53L0 22Z" fill="#E0E0E0"/></mask><g mask="url(#mask0_8307_6281_p${planeId})"><mask id="path-2-outside-1_8307_6281_p${planeId}" maskUnits="userSpaceOnUse" x="3.82031" y="0" width="17" height="44" fill="black"><rect fill="white" x="3.82031" y="0" width="17" height="44"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z"/></mask><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" fill="#00851A"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" stroke="#56FF77" stroke-width="2" mask="url(#path-2-outside-1_8307_6281_p${planeId})"/></g></g><path d="M12 17.5C15.124 17.5 17.928 18.051 19.933 18.923C20.936 19.359 21.716 19.866 22.238 20.402C22.758 20.937 23 21.476 23 22C23 22.524 22.758 23.063 22.238 23.598C21.716 24.135 20.936 24.641 19.933 25.077C17.928 25.949 15.124 26.5 12 26.5C8.876 26.5 6.072 25.949 4.067 25.077C3.064 24.641 2.284 24.135 1.762 23.598C1.242 23.063 1 22.524 1 22C1 21.476 1.242 20.937 1.762 20.402C2.284 19.866 3.064 19.359 4.067 18.923C6.072 18.051 8.876 17.5 12 17.5Z" fill="#00851A" fill-opacity="0.3" stroke="#56FF77"/><ellipse cx="12" cy="22" rx="5.5" ry="2" fill="#56FF77"/><mask id="mask1_8307_6281_p${planeId}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="-2" y="-2" width="26" height="24"><path d="M-2 -1.5L23.5 -1L23 22H-0.5L-2 -1.5Z" fill="#E0E0E0"/></mask><g mask="url(#mask1_8307_6281_p${planeId})"><mask id="path-7-outside-2_8307_6281_p${planeId}" maskUnits="userSpaceOnUse" x="3.82031" y="0" width="17" height="44" fill="black"><rect fill="white" x="3.82031" y="0" width="17" height="44"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z"/></mask><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" fill="#194D1E"/><path d="M5.232 33C4.462 31.667 5.424 30 6.964 30H8.66C9.765 30 10.66 29.105 10.66 28V16C10.66 14.895 9.765 14 8.66 14H6.964C5.424 14 4.462 12.333 5.232 11L10.428 2C11.198 0.667 13.122 0.667 13.892 2L19.088 11C19.858 12.333 18.896 14 17.356 14H15.66C14.556 14 13.66 14.895 13.66 16V28C13.66 29.105 14.556 30 15.66 30H17.356C18.896 30 19.858 31.667 19.088 33L13.892 42C13.122 43.333 11.198 43.333 10.428 42L5.232 33Z" stroke="#56FF77" stroke-width="2" mask="url(#path-7-outside-2_8307_6281_p${planeId})"/></g></g></g><defs><clipPath id="clip0_8307_6281"><rect width="24" height="44" fill="white"/></clipPath></defs></svg>`;
    const iconSize = 44;
    const padding = 4;
    const circleSize = iconSize + padding * 2;
    Object.assign(el.style, {
      position: 'absolute',
      pointerEvents: 'auto',
      cursor: 'pointer',
      zIndex: '1000',
      filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
      transform: 'translate(-50%, -50%)',
      display: 'none',
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      borderRadius: '50%',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'rgba(255, 255, 255, 0.3)',
      transition: 'background 0.15s ease',
    });
    el.dataset.sectionPlaneId = planeId;

    el.addEventListener('mouseenter', () => {
      this._hoveringPlaneEditIcon = true;
      this.clearCutHoverMarker();
      this.clearPlaneHoverMarker();
      this._removeCutSurfaceHighlight();
      this.clearHoverHighlight();
      this._setCursor('');
      el.style.background = 'rgba(0, 198, 40, 0.7)';
    });
    el.addEventListener('mouseleave', () => {
      this._hoveringPlaneEditIcon = false;
      el.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.editPlaneFromOverlay(planeId);
    });

    const overlayParent = this.domElement.parentElement || this.domElement;
    overlayParent.appendChild(el);

    return { el, worldPos: worldPos.clone() };
  }

  _setSectionPlaneDefault(planeId) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    this._detachTiltGizmo();

    if (this.activeSectionPlaneId === planeId) {
      this.activeSectionPlaneId = null;
      this._clearActivePlaneContour();
    }

    if (planeData.helper) {
      planeData.helper.visible = false;
    }

    this._removePlaneOverlay(planeId);

    // Place icon at the centroid of the cross-section so it sits on the cut face
    const iconPos = this._computeCrossSectionCentroid(planeData.plane) || planeData.point;
    const overlay = this._createPlaneEditOverlay(planeId, iconPos);
    this._planeOverlays.set(planeId, overlay);

    this._refreshSectionPlaneActiveVisuals();
  }

  _editSectionPlane(planeId) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    if (this.activeSectionPlaneId && this.activeSectionPlaneId !== planeId) {
      this._setSectionPlaneDefault(this.activeSectionPlaneId);
    }

    this._removePlaneOverlay(planeId);

    if (planeData.helper) {
      planeData.helper.visible = true;
    }

    this.activeSectionPlaneId = planeId;
    this._refreshSectionPlaneActiveVisuals();
    this._buildActivePlaneContour();
    this._attachTiltGizmo(planeId);
  }

  editPlaneFromOverlay(planeId) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    if (this.activeTool !== 'section-plane') {
      this.setActiveTool('section-plane');
    }

    this._editSectionPlane(planeId);
    this.emit('request-edit-plane', { planeId });
  }

  _removePlaneOverlay(planeId) {
    const data = this._planeOverlays.get(planeId);
    if (!data) return;
    if (data.el?.parentElement) {
      data.el.parentElement.removeChild(data.el);
    }
    this._planeOverlays.delete(planeId);
    this._hoveringPlaneEditIcon = false;
  }

  _clearAllPlaneOverlays() {
    for (const [planeId] of this._planeOverlays) {
      this._removePlaneOverlay(planeId);
    }
  }

  _computeCrossSectionCentroid(clipPlane) {
    const edges = this._computePlaneIntersection(clipPlane);
    if (edges.length === 0) return null;
    const centroid = new THREE.Vector3();
    let count = 0;
    for (const [p1, p2] of edges) {
      centroid.add(p1).add(p2);
      count += 2;
    }
    if (count > 0) centroid.divideScalar(count);
    return centroid;
  }

  _updatePlaneOverlayPositions() {
    const rect = this.domElement.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const tempV = new THREE.Vector3();

    // Collect model meshes once for occlusion raycasts
    const modelMeshes = [];
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.visible && !obj.userData.isPlaneHelper &&
          !obj.userData.isCutEditIcon && !obj.userData.isCutContour && !obj.userData.isTiltGizmo &&
          obj.parent?.name !== 'CutContours' &&
          obj.parent?.name !== 'SectionPlaneHelpers') {
        modelMeshes.push(obj);
      }
    });

    const camPos = this.camera.position;
    const occlusionRay = new THREE.Raycaster();

    for (const [planeId, data] of this._planeOverlays) {
      if (!data.el) continue;
      tempV.copy(data.worldPos);
      tempV.project(this.camera);
      const x = (tempV.x * halfW) + halfW;
      const y = -(tempV.y * halfH) + halfH;
      const behind = tempV.z > 1;

      let occluded = false;
      if (!behind) {
        const dir = data.worldPos.clone().sub(camPos);
        const dist = dir.length();
        dir.normalize();
        occlusionRay.set(camPos, dir);
        occlusionRay.far = dist - 0.01;
        const rawHits = occlusionRay.intersectObjects(modelMeshes, false);
        const visibleHits = this._filterClippedHits(rawHits);
        if (visibleHits.length > 0) {
          occluded = true;
        }
      }

      data.el.style.display = (behind || occluded) ? 'none' : 'flex';
      data.el.style.left = `${x}px`;
      data.el.style.top = `${y}px`;

      const planeData = this.clipPlanes.get(planeId);
      if (planeData) {
        const nEnd = data.worldPos.clone().add(planeData.normal);
        const nProj = nEnd.project(this.camera);
        const nx = (nProj.x * halfW) + halfW;
        const ny = -(nProj.y * halfH) + halfH;
        const angle = Math.atan2(nx - x, -(ny - y)) * (180 / Math.PI);
        data.el.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      }
    }
  }

  _buildActivePlaneContour() {
    this._clearActivePlaneContour();
    if (!this.activeSectionPlaneId) return;
    const planeData = this.clipPlanes.get(this.activeSectionPlaneId);
    if (!planeData) return;

    let allEdges = this._computePlaneIntersection(planeData.plane);
    if (allEdges.length === 0) return;

    // Clip edges against all OTHER active section planes so the contour
    // hugs the visible cut shape without relying on renderer clipping.
    const otherPlanes = [];
    for (const [id, pd] of this.clipPlanes) {
      if (id !== this.activeSectionPlaneId && pd.plane) otherPlanes.push(pd.plane);
    }
    if (otherPlanes.length > 0) {
      allEdges = this._clipEdgesAgainstPlanes(allEdges, otherPlanes);
      if (allEdges.length === 0) return;
    }

    // Scene-relative offset so the contour/fill sit safely on the visible side
    const bounds = this.getSceneBounds();
    const bSize = new THREE.Vector3();
    bounds.getSize(bSize);
    const diag = Math.max(bSize.x, bSize.y, bSize.z);
    const offsetDir = planeData.plane.normal.clone();
    const offsetDist = diag * 0.005;

    // Build a plane-local 2D coordinate system for boundary extraction
    const normal = planeData.plane.normal;
    let tangent = new THREE.Vector3();
    if (Math.abs(normal.x) < 0.9) {
      tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
    } else {
      tangent.crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
    }
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    // Collect all intersection points and compute their convex hull for the outer boundary
    const hullEdges = this._computeConvexHullEdges(allEdges, tangent, bitangent, normal, planeData.plane);

    const contourScene = new THREE.Scene();
    contourScene.name = 'ActivePlaneContourScene';

    // ── Contour stroke (convex hull boundary only) ──
    if (hullEdges.length > 0) {
      const positions = [];
      for (const [p1, p2] of hullEdges) {
        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
      for (let i = 0; i < positions.length; i += 3) {
        positions[i]     += offsetDir.x * offsetDist;
        positions[i + 1] += offsetDir.y * offsetDist;
        positions[i + 2] += offsetDir.z * offsetDist;
      }

      const lsGeo = new LineSegmentsGeometry();
      lsGeo.setPositions(positions);
      const lsMat = new LineMaterial({
        color: 0x00ff33,
        linewidth: 4,
        depthTest: false,
        worldUnits: false,
      });
      lsMat.resolution.set(this.domElement.clientWidth, this.domElement.clientHeight);
      const lineSegs = new LineSegments2(lsGeo, lsMat);
      lineSegs.renderOrder = 998;
      contourScene.add(lineSegs);
    }

    // ── Cross-section fill (uses ALL edges for complete coverage) ──
    const fillMesh = this._buildCrossSectionFill(allEdges, planeData.plane, offsetDir, offsetDist * 0.5);
    if (fillMesh) {
      contourScene.add(fillMesh);
    }

    this._activePlaneContour = contourScene;
    this._activePlaneContourPlaneId = this.activeSectionPlaneId;
  }

  _computeConvexHullEdges(edges, tangent, bitangent, normal, clipPlane) {
    // Collect every intersection point, project to 2D, compute convex hull,
    // then lift hull vertices back to 3D on the clip plane.
    const pts2D = [];
    const seen = new Set();
    const EPS = 1e-5;
    const snap = v => `${Math.round(v.x / EPS)}_${Math.round(v.y / EPS)}`;

    for (const [p1, p2] of edges) {
      for (const p of [p1, p2]) {
        const u = p.dot(tangent);
        const v = p.dot(bitangent);
        const pt = { x: u, y: v };
        const k = snap(pt);
        if (!seen.has(k)) {
          seen.add(k);
          pts2D.push(pt);
        }
      }
    }

    if (pts2D.length < 3) return [];

    // Andrew's monotone chain convex hull (O(n log n))
    pts2D.sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (O, A, B) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);

    const lower = [];
    for (const p of pts2D) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
        lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts2D.length - 1; i >= 0; i--) {
      const p = pts2D[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
        upper.pop();
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    const hull2D = lower.concat(upper);

    if (hull2D.length < 3) return [];

    // Lift 2D hull points back to 3D on the clip plane
    const originOnPlane = normal.clone().multiplyScalar(-clipPlane.constant);
    const hull3D = hull2D.map(pt => {
      return originOnPlane.clone()
        .addScaledVector(tangent, pt.x)
        .addScaledVector(bitangent, pt.y);
    });

    const hullEdges = [];
    for (let i = 0; i < hull3D.length; i++) {
      hullEdges.push([hull3D[i], hull3D[(i + 1) % hull3D.length]]);
    }
    return hullEdges;
  }

  _buildCrossSectionFill(edges, clipPlane, offsetDir, offsetDist) {
    const loops = this._chainEdgesIntoLoops(edges);
    if (loops.length === 0) return null;

    const normal = clipPlane.normal;
    let tangent = new THREE.Vector3();
    if (Math.abs(normal.x) < 0.9) {
      tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
    } else {
      tangent.crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
    }
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const allVerts3D = [];
    const allFaces = [];
    let vertexOffset = 0;

    for (const loop of loops) {
      if (loop.length < 3) continue;

      const contour2D = loop.map(p => new THREE.Vector2(p.dot(tangent), p.dot(bitangent)));

      let faces;
      try {
        faces = THREE.ShapeUtils.triangulateShape(contour2D, []);
      } catch {
        continue;
      }
      if (faces.length === 0) continue;

      for (const pt of loop) {
        allVerts3D.push(pt.clone().addScaledVector(offsetDir, offsetDist));
      }
      for (const [a, b, c] of faces) {
        allFaces.push(a + vertexOffset, b + vertexOffset, c + vertexOffset);
      }
      vertexOffset += loop.length;
    }

    if (allFaces.length === 0) return null;

    const posArr = new Float32Array(allVerts3D.length * 3);
    for (let i = 0; i < allVerts3D.length; i++) {
      posArr[i * 3]     = allVerts3D[i].x;
      posArr[i * 3 + 1] = allVerts3D[i].y;
      posArr[i * 3 + 2] = allVerts3D[i].z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setIndex(allFaces);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff33,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 997;
    return mesh;
  }

  _chainEdgesIntoLoops(edges) {
    const EPS = 1e-6;
    const key = v => `${(v.x / EPS | 0)}_${(v.y / EPS | 0)}_${(v.z / EPS | 0)}`;

    const remaining = edges.map(([a, b]) => [a.clone(), b.clone()]);
    const loops = [];

    while (remaining.length > 0) {
      const loop = [];
      const [first] = remaining.splice(0, 1);
      loop.push(first[0], first[1]);

      let changed = true;
      while (changed) {
        changed = false;
        const tailKey = key(loop[loop.length - 1]);
        for (let i = 0; i < remaining.length; i++) {
          const kA = key(remaining[i][0]);
          const kB = key(remaining[i][1]);
          if (kA === tailKey) {
            loop.push(remaining[i][1]);
            remaining.splice(i, 1);
            changed = true;
            break;
          } else if (kB === tailKey) {
            loop.push(remaining[i][0]);
            remaining.splice(i, 1);
            changed = true;
            break;
          }
        }
      }

      if (loop.length >= 3 && key(loop[0]) === key(loop[loop.length - 1])) {
        loop.pop();
      }
      if (loop.length >= 3) {
        loops.push(loop);
      }
    }

    return loops;
  }

  _renderActivePlaneContour() {
    if (!this._activePlaneContour && !this.planeHoverMarker && !this._tiltGizmoScene) return;
    if (!this.activeSectionPlaneId) return;

    const savedClipPlanes = this.renderer.clippingPlanes;
    const savedAutoClear = this.renderer.autoClear;

    this.renderer.autoClear = false;

    // Contour geometry is pre-clipped against other planes in _buildActivePlaneContour,
    // so render with no clipping to ensure the full stroke is always visible.
    if (this._activePlaneContour) {
      this.renderer.clippingPlanes = [];
      this.renderer.render(this._activePlaneContour, this.camera);
    }

    // Render hover marker unclipped so it's always fully visible
    if (this.planeHoverMarker) {
      if (!this._hoverMarkerScene) {
        this._hoverMarkerScene = new THREE.Scene();
      }
      this.renderer.clippingPlanes = [];
      const parent = this.planeHoverMarker.parent;
      this._hoverMarkerScene.add(this.planeHoverMarker);
      this.renderer.render(this._hoverMarkerScene, this.camera);
      if (parent) parent.add(this.planeHoverMarker);
    }

    // Render tilt gizmo fully unclipped so it's never cut off
    if (this._tiltGizmoScene && this._tiltGizmo) {
      this.renderer.clippingPlanes = [];
      this.renderer.render(this._tiltGizmoScene, this.camera);
    }

    this.renderer.autoClear = savedAutoClear;
    this.renderer.clippingPlanes = savedClipPlanes;
  }

  _clipEdgesAgainstPlanes(edges, planes) {
    let result = edges;
    for (const plane of planes) {
      const next = [];
      for (const [p1, p2] of result) {
        const d1 = plane.distanceToPoint(p1);
        const d2 = plane.distanceToPoint(p2);
        if (d1 >= 0 && d2 >= 0) {
          next.push([p1, p2]);
        } else if (d1 >= 0 && d2 < 0) {
          const t = d1 / (d1 - d2);
          const mid = p1.clone().lerp(p2, t);
          next.push([p1, mid]);
        } else if (d1 < 0 && d2 >= 0) {
          const t = d1 / (d1 - d2);
          const mid = p1.clone().lerp(p2, t);
          next.push([mid, p2]);
        }
      }
      result = next;
    }
    return result;
  }

  _clearActivePlaneContour() {
    if (!this._activePlaneContour) return;
    this._activePlaneContour.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this._activePlaneContour = null;
    this._activePlaneContourPlaneId = null;
  }

  // ── End Section-Plane Edit / Default State ────────────────────────

  onKeyDown(event) {
    if (this.activeTool === 'section-cut' && event.key === 'Enter') {
      if (this.cutState) {
        this.commitCutAuthoring();
        event.preventDefault();
      }
    } else if (this.activeTool === 'section-cut' && event.key === 'Escape') {
      this.cancelCutAuthoring();
      event.preventDefault();
    } else if (this.activeTool === 'section-plane' && event.key === 'Enter') {
      if (this.activeSectionPlaneId) {
        this._setSectionPlaneDefault(this.activeSectionPlaneId);
        event.preventDefault();
      }
    } else if (this.activeTool === 'section-plane' && (event.key === 'f' || event.key === 'F')) {
      if (this.activeSectionPlaneId) {
        this.flipPlane(this.activeSectionPlaneId);
        event.preventDefault();
      }
    }
  }

  // ── End Section-Cut Authoring ────────────────────────────────────

  clearAll() {
    this._detachTiltGizmo();
    this.cancelCutAuthoring();
    this.clearSectionBox();
    this.clearClipPlanes();
    this.clearHoverHighlight();
    this._removeCutSurfaceHighlight();
    this.clearCutHoverMarker();
    this.clearPlaneHoverMarker();
    this._clearAllPlaneOverlays();
    this._clearActivePlaneContour();
    this.syncRendererClipPlanes();
  }

  /**
   * Get all clipping planes
   */
  getClipPlanes() {
    return Array.from(this.clipPlanes.values()).map(({ id, plane, normal, point, enabled, visible }) => ({
      id,
      plane,
      normal: normal.clone(),
      point: point.clone(),
      enabled,
      visible
    }));
  }

  /**
   * Move a plane along its normal
   */
  movePlane(planeId, distance) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    planeData.plane.constant += distance;
    planeData.point.addScaledVector(planeData.normal, distance);

    if (planeData.helper) {
      planeData.helper.position.copy(planeData.point);
    }

    this.updateRendererClipPlanes();

    if (this.isDragging && this._dragCumulativeDistance != null) {
      this._dragCumulativeDistance += distance;
    }

    this.emit('plane-move', { id: planeId, distance, point: planeData.point.clone() });
  }

  /**
   * Flip the clipping direction
   */
  flipPlane(planeId) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    planeData.plane.negate();
    planeData.normal.negate();

    if (planeData.helper) {
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), planeData.normal);
      planeData.helper.quaternion.copy(quaternion);
    }

    this.updateRendererClipPlanes();

    this._pushAction({
      type: 'flip-plane',
      undo: () => { this.flipPlane(planeId); },
      redo: () => { this.flipPlane(planeId); },
    });

    this.emit('plane-flip', { id: planeId });
    this._refreshSectionPlaneActiveVisuals();
  }

  /**
   * Enable/disable a plane
   */
  setPlaneEnabled(planeId, enabled) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    planeData.enabled = enabled;
    this.updateRendererClipPlanes();

    this.emit('plane-toggle', { id: planeId, enabled });
  }

  /**
   * Show/hide plane helper
   */
  setPlaneVisible(planeId, visible) {
    const planeData = this.clipPlanes.get(planeId);
    if (!planeData) return;

    planeData.visible = visible;
    if (planeData.helper) {
      planeData.helper.visible = visible;
    }
  }

  /**
   * Update renderer's clipping planes array
   */
  updateRendererClipPlanes() {
    const activePlanes = [];

    this.clipPlanes.forEach(planeData => {
      if (planeData.enabled) {
        activePlanes.push(planeData.plane);
      }
    });

    if (this.cutPreviewClip) {
      activePlanes.push(this.cutPreviewClip);
    }

    this.renderer.clippingPlanes = activePlanes;
  }

  /**
   * Handle mouse down for plane dragging
   */
  onMouseDown(event) {
    if (event.button !== 0) return;
    if (!this.activeTool) return;

    if (this.activeTool === 'section-plane') {
      this.updateMouse(event);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // ── Tilt gizmo: intercept drag before any other section-plane logic ──
      if (this._tiltGizmo && this.activeSectionPlaneId) {
        const ringMeshes = [
          ...(this._tiltRingXMeshes || []),
          ...(this._tiltRingYMeshes || []),
        ];
        const gizmoHits = this.raycaster.intersectObjects(ringMeshes, false);
        if (gizmoHits.length > 0) {
          const hitMesh = gizmoHits[0].object;
          const axis = hitMesh.userData._tiltAxis; // 'x' or 'y'
          if (axis) {
            this._tiltDragging = true;
            this._tiltAxis = axis;

            const planeData = this.clipPlanes.get(this.activeSectionPlaneId);
            this._tiltBaseQuat = planeData.helper.quaternion.clone();
            this._tiltBeforeQuat = planeData.helper.quaternion.clone();

            // Compute the rotation axis in world space for angle tracking
            const localAxis = axis === 'x'
              ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            const worldAxis = localAxis.applyQuaternion(planeData.helper.quaternion).normalize();

            // Build a plane perpendicular to the rotation axis, through the gizmo center
            const gizmoCenter = planeData.point.clone();
            const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldAxis, gizmoCenter);

            const startPt = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(dragPlane, startPt);
            const startDir = startPt.sub(gizmoCenter).normalize();

            this._tiltDragPlane = dragPlane;
            this._tiltDragCenter = gizmoCenter;
            this._tiltDragStartDir = startDir;
            this._tiltWorldAxis = worldAxis;

            this.emit('drag-start', {});
            this._setCursor('default');
            event.stopPropagation();
            event.preventDefault();
            return;
          }
        }
      }

      // Raycast visible model geometry
      const modelMeshes = [];
      this.scene.traverse(obj => {
        if (obj.isMesh && obj.visible && !obj.userData.isPlaneHelper && !obj.userData.isCutContour && !obj.userData.isTiltGizmo) {
          modelMeshes.push(obj);
        }
      });
      const rawHits = this.raycaster.intersectObjects(modelMeshes, false);
      const visibleHits = this._filterClippedHits(rawHits);
      if (visibleHits.length === 0) return;

      const hit = visibleHits[0];
      const hitNormal = this.getWorldNormalFromHit(hit);
      if (!hitNormal) return;

      const bounds = this.getSceneBounds();
      const bSize = new THREE.Vector3();
      bounds.getSize(bSize);
      const threshold = Math.max(bSize.x, bSize.y, bSize.z) * 0.02;

      // If there's an active edit-state plane and click is near it → drag
      if (this.activeSectionPlaneId) {
        const activePd = this.clipPlanes.get(this.activeSectionPlaneId);
        if (activePd) {
          const mathPlane = new THREE.Plane();
          mathPlane.setFromNormalAndCoplanarPoint(activePd.normal, activePd.point);
          const distToPlane = Math.abs(mathPlane.distanceToPoint(hit.point));

          if (distToPlane < threshold) {
            const planeHit = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(mathPlane, planeHit);
            if (planeHit && this._beginPlaneDrag(this.activeSectionPlaneId, planeHit.clone())) {
              this.setPlaneHoverMarker(planeHit, activePd.normal);
              this._setCursor('none');
              event.stopPropagation();
              event.preventDefault();
            }
            return;
          }
          // Click is on model but NOT near the active plane → set it to default, continue
          this._setSectionPlaneDefault(this.activeSectionPlaneId);
        }
      }

      // Check if click is near ANY existing default-state plane — re-edit it
      for (const [existingId, pd] of this.clipPlanes) {
        const mathPlane = new THREE.Plane();
        mathPlane.setFromNormalAndCoplanarPoint(pd.normal, pd.point);
        if (Math.abs(mathPlane.distanceToPoint(hit.point)) < threshold) {
          this._editSectionPlane(existingId);
          event.stopPropagation();
          event.preventDefault();
          return;
        }
      }

      // Click is on model and not near any existing plane → create new plane
      const inwardNormal = this._resolveInwardSectionPlaneNormal(hit.point, hitNormal);
      const outwardNormal = inwardNormal.clone().negate();
      const placementPoint = this._getSectionPlanePlacementPoint(hit.point, inwardNormal);
      const planeId = this.addClipPlane(outwardNormal, placementPoint);
      this._setActiveSectionPlane(planeId);
      this._buildActivePlaneContour();
      this._beginPlaneDrag(planeId, hit.point.clone());
      this.setPlaneHoverMarker(hit.point, hitNormal);
      this._setCursor('none');
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    // ── Section-Cut: defer placement until mouseUp to allow camera drag ──
    if (this.activeTool === 'section-cut') {
      this.updateMouse(event);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const modelMeshes = [];
      this.scene.traverse(obj => {
        if (obj.isMesh && obj.visible && !obj.userData.isPlaneHelper && !obj.userData.isCutContour && !obj.userData.isTiltGizmo) {
          modelMeshes.push(obj);
        }
      });
      const rawHits = this.raycaster.intersectObjects(modelMeshes, false);
      const modelHits = this._filterClippedHits(rawHits);

      if (this.cutState) {
        const bounds = this.getSceneBounds();
        const _bSize = new THREE.Vector3();
        bounds.getSize(_bSize);
        const gizmoRadius = Math.max(_bSize.x, _bSize.y, _bSize.z) * 0.04 * 1.5;

        const facePlane = new THREE.Plane();
        facePlane.setFromNormalAndCoplanarPoint(this.cutState.surfaceNormal, this.cutState.anchorPoint);
        const projected = new THREE.Vector3();
        const hitFacePlane = this.raycaster.ray.intersectPlane(facePlane, projected);

        const nearGizmo = hitFacePlane &&
          projected.distanceTo(this.cutState.anchorPoint) < gizmoRadius;

        if (nearGizmo) {
          // Gizmo drag — immediate (no deferral needed, rotation is drag-based)
          this.cutDragging = true;
          this.emit('drag-start', {});
          event.stopPropagation();
          event.preventDefault();
          return;
        }

        if (modelHits.length > 0) {
          const normal = this.getWorldNormalFromHit(modelHits[0]);
          if (normal) {
            this._cutClickPending = {
              hit: modelHits[0], normal, wasAnchored: true,
              screenX: event.clientX, screenY: event.clientY,
            };
            return;
          }
        }
      } else if (modelHits.length > 0) {
        const normal = this.getWorldNormalFromHit(modelHits[0]);
        if (normal) {
          this._cutClickPending = {
            hit: modelHits[0], normal, wasAnchored: false,
            screenX: event.clientX, screenY: event.clientY,
          };
          return;
        }
      }
      return;
    }

    // ── Default: existing plane-helper drag logic ──
    const helpers = [];
    this.helpersGroup.traverse(obj => {
      if (obj.isMesh && obj.userData.isPlaneHelper) {
        helpers.push(obj);
      }
    });

    const intersects = this.raycaster.intersectObjects(helpers, false);

    if (intersects.length > 0) {
      const helper = intersects[0].object;
      const planeId = this._resolvePlaneIdFromHelperObject(helper);

      if (planeId) {
        this._setActiveSectionPlane(planeId);
        this._beginPlaneDrag(planeId, intersects[0].point.clone());

        event.stopPropagation();
        event.preventDefault();
      }
    }
  }

  /**
   * Handle mouse move for plane dragging
   */
  onMouseMove(event) {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Cancel pending section-cut click if mouse moved too far (user is navigating)
    if (this._cutClickPending) {
      const dx = event.clientX - this._cutClickPending.screenX;
      const dy = event.clientY - this._cutClickPending.screenY;
      if (Math.sqrt(dx * dx + dy * dy) > this._cutClickThreshold) {
        this._cutClickPending = null;
      }
    }

    // ── Tilt gizmo drag ──
    if (this._tiltDragging && this.activeSectionPlaneId) {
      const pt = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this._tiltDragPlane, pt)) {
        const dir = pt.sub(this._tiltDragCenter).normalize();
        // Signed angle between drag start direction and current direction
        const cross = new THREE.Vector3().crossVectors(this._tiltDragStartDir, dir);
        const sign = Math.sign(cross.dot(this._tiltWorldAxis));
        let angle = Math.acos(THREE.MathUtils.clamp(this._tiltDragStartDir.dot(dir), -1, 1));
        angle *= sign * this.TILT_SENSITIVITY;

        // Clamp cumulative tilt — TILT_MAX_ANGLE per axis
        if (this._tiltAxis === 'x') {
          angle = THREE.MathUtils.clamp(
            this._tiltCumulativeX + angle, -this.TILT_MAX_ANGLE, this.TILT_MAX_ANGLE
          ) - this._tiltCumulativeX;
        } else {
          angle = THREE.MathUtils.clamp(
            this._tiltCumulativeY + angle, -this.TILT_MAX_ANGLE, this.TILT_MAX_ANGLE
          ) - this._tiltCumulativeY;
        }

        if (Math.abs(angle) > 0.0001) {
          // Build rotation in local space of the helper
          const localAxis = this._tiltAxis === 'x'
            ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
          const dq = new THREE.Quaternion().setFromAxisAngle(localAxis, angle);

          const planeData = this.clipPlanes.get(this.activeSectionPlaneId);
          // Apply: new = base * dq (local rotation)
          planeData.helper.quaternion.copy(this._tiltBaseQuat).multiply(dq);

          // Update accumulated angles
          if (this._tiltAxis === 'x') this._tiltCumulativeX += angle;
          else this._tiltCumulativeY += angle;

          // Rebuild base quat for next frame's delta
          this._tiltBaseQuat.copy(planeData.helper.quaternion);

          // Reset drag start so delta is frame-relative
          const newPt = new THREE.Vector3();
          this.raycaster.ray.intersectPlane(this._tiltDragPlane, newPt);
          if (newPt) this._tiltDragStartDir = newPt.sub(this._tiltDragCenter).normalize();

          // Sync the gizmo wrapper — map Z to the new outward normal
          const newN = new THREE.Vector3(0, 0, 1).applyQuaternion(planeData.helper.quaternion).normalize();
          this._tiltGizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), newN);

          // Live-update the clipping plane and contour
          this._syncTiltToClipPlane(this.activeSectionPlaneId);
        }
      }
      this._setCursor('default');
      return;
    }

    // ── Tilt gizmo hover detection ──
    if (this._tiltGizmo && this.activeSectionPlaneId && !this.isDragging && !this.cutDragging) {
      const ringMeshes = [
        ...(this._tiltRingXMeshes || []),
        ...(this._tiltRingYMeshes || []),
      ];
      const gizmoHits = this.raycaster.intersectObjects(ringMeshes, false);
      if (gizmoHits.length > 0) {
        const hitMesh = gizmoHits[0].object;
        if (this._tiltHoveredRing !== hitMesh) {
          this._unhighlightTiltRing();
          this._tiltHoveredRing = hitMesh;
          if (hitMesh.material) {
            hitMesh.material._origEmissiveIntensity = hitMesh.material.emissiveIntensity;
            hitMesh.material.emissiveIntensity = 2.0;
          }
        }
        this.clearPlaneHoverMarker();
        this._setCursor('default');
        return;
      } else if (this._tiltHoveredRing) {
        this._unhighlightTiltRing();
      }
    }

    // ── Section-Cut/Section-Plane rotation drag ──
    if (this.cutDragging && this.cutState) {
      const facePlane = new THREE.Plane();
      facePlane.setFromNormalAndCoplanarPoint(this.cutState.surfaceNormal, this.cutState.anchorPoint);
      const projected = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(facePlane, projected)) {
        const toMouse = projected.clone().sub(this.cutState.anchorPoint);
        if (toMouse.lengthSq() > 0.000001) {
          toMouse.normalize();
          this.cutState.angle = Math.atan2(
            toMouse.dot(this.cutState.bitangent),
            toMouse.dot(this.cutState.tangent),
          );
          this.updateCutGizmo();
          this.updateCutPreview();
        }
      }
      this._setCursor('grabbing');
      return;
    }

    // ── Existing plane-helper drag ──
    if (this.isDragging) {
      const planeData = this.clipPlanes.get(this.dragPlaneId);
      if (!planeData) return;

      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const delta = intersection.clone().sub(this.dragStartPoint);
        const distance = delta.dot(planeData.normal);

        if (Math.abs(distance) > 0.001) {
          this.movePlane(this.dragPlaneId, distance);
          this.dragStartPoint.copy(intersection);
        }
      }
      if (this.planeHoverMarker && planeData) {
        const markerPlane = new THREE.Plane();
        markerPlane.setFromNormalAndCoplanarPoint(planeData.normal, planeData.point);
        const markerPos = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(markerPlane, markerPos)) {
          this.planeHoverMarker.position.copy(markerPos);
        }
      }
      this._buildActivePlaneContour();
      this._setCursor('none');
      return;
    }

    // ── Hover logic (no drag active) ──
    const helpers = [];
    this.helpersGroup.traverse(obj => {
      if (obj.isMesh && obj.userData.isPlaneHelper) {
        helpers.push(obj);
      }
    });
    const intersects = this.raycaster.intersectObjects(helpers, false);

    if (this.activeTool === 'section-cut' || this.activeTool === 'section-plane') {
      const isSectionPlane = this.activeTool === 'section-plane';

      // Hovering over a committed edit icon — hide placement cursor
      if (this._hoveringCutEditIcon || this._hoveringPlaneEditIcon) {
        this.clearCutHoverMarker();
        this.clearPlaneHoverMarker();
        this._removeCutSurfaceHighlight();
        this.clearHoverHighlight();
        this._setCursor('');
        return;
      }

      // Edit-state plane: show drag cursor only near the active plane's cut area
      if (isSectionPlane && this.activeSectionPlaneId) {
        const activePd = this.clipPlanes.get(this.activeSectionPlaneId);
        if (activePd) {
          const editMeshes = [];
          this.scene.traverse(obj => {
            if (obj.isMesh && obj.visible && !obj.userData.isPlaneHelper && !obj.userData.isCutContour && !obj.userData.isTiltGizmo) {
              editMeshes.push(obj);
            }
          });
          const editRawHits = this.raycaster.intersectObjects(editMeshes, false);
          const editHits = this._filterClippedHits(editRawHits);

          if (editHits.length > 0) {
            const editBounds = this.getSceneBounds();
            const _ebs = new THREE.Vector3();
            editBounds.getSize(_ebs);
            const editThreshold = Math.max(_ebs.x, _ebs.y, _ebs.z) * 0.02;

            const mathPlane = new THREE.Plane();
            mathPlane.setFromNormalAndCoplanarPoint(activePd.normal, activePd.point);
            const distToPlane = Math.abs(mathPlane.distanceToPoint(editHits[0].point));

            if (distToPlane < editThreshold) {
              // Near the active plane's cut — show drag cursor locked to plane angle
              const planeHit = new THREE.Vector3();
              if (this.raycaster.ray.intersectPlane(mathPlane, planeHit)) {
                this.clearCutHoverMarker();
                this._removeCutSurfaceHighlight();
                this.clearHoverHighlight();
                this.setPlaneHoverMarker(planeHit, activePd.normal);
                this._setCursor('none');
                return;
              }
            } else {
              // Over model but NOT near active plane — show normal create-plane cursor + highlight
              const surfNormal = this.getWorldNormalFromHit(editHits[0]);
              if (surfNormal) {
                this.clearCutHoverMarker();
                this.clearHoverHighlight();
                this._applyCutSurfaceHighlight(editHits[0], this._planeHoverMaterial);
                this.setPlaneHoverMarker(editHits[0].point, surfNormal);
                this._setCursor('none');
                return;
              }
            }
          }

          // Mouse is over empty space — standard cursor
          this.clearPlaneHoverMarker();
          this.clearCutHoverMarker();
          this._removeCutSurfaceHighlight();
          this.clearHoverHighlight();
          this._setCursor('');
          return;
        }
      }

      // If anchored, check whether mouse is near the gizmo first
      if (this.cutState) {
        const bounds = this.getSceneBounds();
        const _bSize = new THREE.Vector3();
        bounds.getSize(_bSize);
        const gizmoRadius = Math.max(_bSize.x, _bSize.y, _bSize.z) * 0.04 * 1.5;

        const facePlane = new THREE.Plane();
        facePlane.setFromNormalAndCoplanarPoint(this.cutState.surfaceNormal, this.cutState.anchorPoint);
        const projected = new THREE.Vector3();
        const hitFacePlane = this.raycaster.ray.intersectPlane(facePlane, projected);

        if (hitFacePlane && projected.distanceTo(this.cutState.anchorPoint) < gizmoRadius) {
          this.clearCutHoverMarker();
          this.clearPlaneHoverMarker();
          this._removeCutSurfaceHighlight();
          this.clearHoverHighlight();
          this._setCursor('grab');
          return;
        }
      }

      // Show crosshair + scissors on model surfaces (skip clipped geometry)
      const modelMeshes = [];
      this.scene.traverse(obj => {
        if (obj.isMesh && obj.visible && !obj.userData.isPlaneHelper && !obj.userData.isCutContour && !obj.userData.isTiltGizmo) {
          modelMeshes.push(obj);
        }
      });
      const rawHits = this.raycaster.intersectObjects(modelMeshes, false);
      const modelHits = this._filterClippedHits(rawHits);
      if (modelHits.length > 0) {
        const normal = this.getWorldNormalFromHit(modelHits[0]);
        if (normal) {
          this.clearHoverHighlight();
          this._applyCutSurfaceHighlight(
            modelHits[0],
            isSectionPlane ? this._planeHoverMaterial : this._cutHoverMaterial,
          );
          if (isSectionPlane) {
            this.clearCutHoverMarker();
            this.setPlaneHoverMarker(modelHits[0].point, normal);
          } else {
            this.clearPlaneHoverMarker();
            this.setCutHoverMarker(modelHits[0].point, normal);
          }
          this._setCursor('none');
          return;
        }
      }
      // Not over a model surface
      this.clearCutHoverMarker();
      this.clearPlaneHoverMarker();
      this._removeCutSurfaceHighlight();
      if (this.cutState) {
        this.clearHoverHighlight();
        this._setCursor('grab');
      } else {
        this.clearHoverHighlight();
        this._setCursor('');
      }
      return;
    }

    // Default hover for other tools
    this.clearHoverHighlight();
    this._setCursor(intersects.length > 0 ? 'grab' : '');
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event) {
    // Execute deferred section-cut click if mouse didn't move (wasn't a camera drag)
    if (this._cutClickPending) {
      const pending = this._cutClickPending;
      this._cutClickPending = null;
      if (pending.wasAnchored) {
        this.commitCutAuthoring();
        this.placeCutAnchor(pending.hit.point, pending.normal);
      } else {
        this.placeCutAnchor(pending.hit.point, pending.normal);
      }
      return;
    }
    // ── Tilt gizmo drag end ──
    if (this._tiltDragging) {
      this._tiltDragging = false;
      this._tiltAxis = null;
      this._setCursor('default');

      // Push undo action for the tilt
      if (this._tiltBeforeQuat && this.activeSectionPlaneId) {
        const planeId = this.activeSectionPlaneId;
        const beforeQ = this._tiltBeforeQuat.clone();
        const planeData = this.clipPlanes.get(planeId);
        const afterQ = planeData ? planeData.helper.quaternion.clone() : null;

        if (afterQ && !beforeQ.equals(afterQ)) {
          this._pushAction({
            type: 'tilt-plane',
            undo: () => {
              const pd = this.clipPlanes.get(planeId);
              if (!pd) return;
              pd.helper.quaternion.copy(beforeQ);
              if (this._tiltGizmo) {
                const n = new THREE.Vector3(0, 0, 1).applyQuaternion(beforeQ).normalize();
                this._tiltGizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
              }
              this._syncTiltToClipPlane(planeId);
            },
            redo: () => {
              const pd = this.clipPlanes.get(planeId);
              if (!pd) return;
              pd.helper.quaternion.copy(afterQ);
              if (this._tiltGizmo) {
                const n = new THREE.Vector3(0, 0, 1).applyQuaternion(afterQ).normalize();
                this._tiltGizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
              }
              this._syncTiltToClipPlane(planeId);
            },
          });
        }
      }
      this._tiltBeforeQuat = null;
      this.emit('drag-end');
      return;
    }
    if (this.cutDragging) {
      this.cutDragging = false;
      this._setCursor('grab');
      this.emit('drag-end');
      return;
    }
    if (this.isDragging) {
      const draggedPlaneId = this.dragPlaneId;
      const totalDist = this._dragCumulativeDistance || 0;
      if (Math.abs(totalDist) > 0.0001) {
        this._pushAction({
          type: 'move-plane',
          undo: () => { this.movePlane(draggedPlaneId, -totalDist); },
          redo: () => { this.movePlane(draggedPlaneId, totalDist); },
        });
      }
      this.isDragging = false;
      this.dragPlaneId = null;
      this._dragCumulativeDistance = 0;
      this.clearPlaneHoverMarker();
      this._setCursor('');
      this.emit('drag-end');
      if (draggedPlaneId && this.activeSectionPlaneId === draggedPlaneId) {
        this._attachTiltGizmo(draggedPlaneId);
      }
    }
  }

  updateMouse(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Dispose helper geometry and materials
   */
  disposeHelper(helper) {
    helper.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  /**
   * Get state for persistence
   */
  getState() {
    const planes = [];

    this.clipPlanes.forEach(planeData => {
      planes.push({
        id: planeData.id,
        normal: {
          x: planeData.normal.x,
          y: planeData.normal.y,
          z: planeData.normal.z
        },
        constant: planeData.plane.constant,
        enabled: planeData.enabled,
        visible: planeData.visible
      });
    });

    return { clipPlanes: planes };
  }

  /**
   * Restore state from persistence
   */
  setState(state) {
    if (!state || !state.clipPlanes) return;

    // Clear existing planes
    this.clearClipPlanes();

    // Recreate planes from state
    state.clipPlanes.forEach(planeState => {
      const normal = new THREE.Vector3(
        planeState.normal.x,
        planeState.normal.y,
        planeState.normal.z
      );

      // Calculate point from normal and constant
      const point = normal.clone().multiplyScalar(-planeState.constant);

      const id = this.addClipPlane(normal, point);

      // Restore enabled/visible state
      if (!planeState.enabled) {
        this.setPlaneEnabled(id, false);
      }
      if (!planeState.visible) {
        this.setPlaneVisible(id, false);
      }
    });
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
    this.domElement.removeEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.removeEventListener('mouseup', this.boundOnMouseUp);
    document.removeEventListener('keydown', this.boundOnKeyDown);

    if (this._overlayAnimId != null) {
      cancelAnimationFrame(this._overlayAnimId);
    }

    this.clearAll();
    this._clearAllCutContours();
    this._clearAllPlaneOverlays();

    if (this.scissorsOverlay && this.scissorsOverlay.parentElement) {
      this.scissorsOverlay.parentElement.removeChild(this.scissorsOverlay);
    }

    this.scene.remove(this.helpersGroup);
    this.scene.remove(this._cutContoursGroup);

    this.renderer.clippingPlanes = [];

    this.eventListeners.clear();
  }
}
