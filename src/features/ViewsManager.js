/**
 * ViewsManager — view/folder CRUD, camera navigation, markup storage.
 *
 * Each "view" stores a camera snapshot and an array of markup annotations.
 * Selecting a view restores the camera and makes its markups visible.
 */

export class ViewsManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.views = [];
    this.folders = [];
    this.selectedViewId = null;
    this._viewCounter = 0;
    this._folderCounter = 0;
    this._cameraTransitionRaf = null;
    this._isCameraTransitioning = false;
    this._cameraTransitionUntil = 0;
    this.eventListeners = new Map();
  }

  _cancelCameraTransition() {
    if (this._cameraTransitionRaf != null) {
      cancelAnimationFrame(this._cameraTransitionRaf);
      this._cameraTransitionRaf = null;
    }
    this._isCameraTransitioning = false;
    this._cameraTransitionUntil = 0;
  }

  _animateCameraTo(nav, toPosition, toTarget, durationMs = 550, onComplete) {
    const from = nav.getCamera();
    const fromPos = { x: from.position.x, y: from.position.y, z: from.position.z };
    const fromTarget = { x: from.target.x, y: from.target.y, z: from.target.z };
    const start = performance.now();

    const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

    this._cancelCameraTransition();
    this._isCameraTransitioning = true;
    this._cameraTransitionUntil = start + durationMs + 120;

    const tick = (now) => {
      const raw = Math.min(1, (now - start) / durationMs);
      const t = easeInOutSine(raw);

      nav.setCamera(
        {
          x: fromPos.x + (toPosition.x - fromPos.x) * t,
          y: fromPos.y + (toPosition.y - fromPos.y) * t,
          z: fromPos.z + (toPosition.z - fromPos.z) * t,
        },
        {
          x: fromTarget.x + (toTarget.x - fromTarget.x) * t,
          y: fromTarget.y + (toTarget.y - fromTarget.y) * t,
          z: fromTarget.z + (toTarget.z - fromTarget.z) * t,
        },
      );

      if (raw < 1) {
        this._cameraTransitionRaf = requestAnimationFrame(tick);
      } else {
        this._cameraTransitionRaf = null;
        if (typeof onComplete === 'function') {
          onComplete();
        }
        this._isCameraTransitioning = false;
        this._cameraTransitionUntil = performance.now() + 120;
      }
    };

    this._cameraTransitionRaf = requestAnimationFrame(tick);
  }

  isCameraTransitioning() {
    return this._isCameraTransitioning || performance.now() < this._cameraTransitionUntil;
  }

  // ── View CRUD ──────────────────────────────────────────────────────────────

  createView(name) {
    const nav = this.viewer.navigation;
    const cam = nav ? nav.getCamera() : { position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
    const isOrtho = nav ? nav.getIsOrthographic() : false;

    this._viewCounter++;
    const view = {
      id: `view-${Date.now()}-${this._viewCounter}`,
      name: name || `View ${this._viewCounter}`,
      folderId: null,
      cameraPosition: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      cameraTarget: { x: cam.target.x, y: cam.target.y, z: cam.target.z },
      isOrthographic: isOrtho,
      markups: [],
      createdAt: Date.now(),
      isProjectView: false,
    };

    this.views.push(view);
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
    return view;
  }

  selectView(id) {
    const view = this.views.find((v) => v.id === id);
    if (!view) return null;

    this.selectedViewId = id;

    const nav = this.viewer.navigation;
    if (nav) {
      const needsProjectionSwitch =
        typeof nav.getIsOrthographic === 'function'
          && typeof nav.setOrthographic === 'function'
          && nav.getIsOrthographic() !== view.isOrthographic;

      this._animateCameraTo(nav, view.cameraPosition, view.cameraTarget, 550, () => {
        if (needsProjectionSwitch) {
          this._isCameraTransitioning = true;
          this._cameraTransitionUntil = performance.now() + 180;
          nav.setOrthographic(view.isOrthographic);
          // Re-apply exact final camera after projection swap.
          nav.setCamera(view.cameraPosition, view.cameraTarget);
          this._isCameraTransitioning = false;
        }
      });
    }

    this.emit('view-selected', { view });
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
    return view;
  }

  deselectView() {
    this.selectedViewId = null;
    this.emit('views-changed', { views: this.views, selectedId: null });
  }

  deleteView(id) {
    this.views = this.views.filter((v) => v.id !== id);
    if (this.selectedViewId === id) this.selectedViewId = null;
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
  }

  renameView(id, name) {
    const view = this.views.find((v) => v.id === id);
    if (view) {
      view.name = name;
      this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
    }
  }

  getViews() {
    return this.views.map((v) => ({ ...v, markups: [...v.markups] }));
  }

  getSelectedViewId() {
    return this.selectedViewId;
  }

  getSelectedView() {
    return this.views.find((v) => v.id === this.selectedViewId) || null;
  }

  getView(id) {
    return this.views.find((v) => v.id === id) || null;
  }

  // ── Markup storage (lives on the view) ─────────────────────────────────────

  addMarkupToView(viewId, markup) {
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;
    view.markups.push(markup);
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
  }

  removeMarkupFromView(viewId, markupId) {
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;
    view.markups = view.markups.filter((m) => m.id !== markupId);
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
  }

  updateMarkupInView(viewId, markupId, data) {
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;
    const idx = view.markups.findIndex((m) => m.id === markupId);
    if (idx >= 0) {
      view.markups[idx] = { ...view.markups[idx], ...data };
      this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
    }
  }

  setViewMarkups(viewId, markups) {
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;
    view.markups = markups;
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
  }

  getMarkups(viewId) {
    const view = this.views.find((v) => v.id === viewId);
    return view ? view.markups : [];
  }

  clearMarkups(viewId) {
    const view = this.views.find((v) => v.id === viewId);
    if (view) {
      view.markups = [];
      this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
    }
  }

  // ── Folder CRUD ────────────────────────────────────────────────────────────

  createFolder(name, parentFolderId) {
    this._folderCounter++;
    const folder = {
      id: `folder-${Date.now()}-${this._folderCounter}`,
      name: name || `Folder ${this._folderCounter}`,
      parentFolderId: parentFolderId || null,
    };
    this.folders.push(folder);
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
    return folder;
  }

  deleteFolder(id) {
    this.views.forEach((v) => {
      if (v.folderId === id) v.folderId = null;
    });
    const childFolderIds = this.folders.filter((f) => f.parentFolderId === id).map((f) => f.id);
    childFolderIds.forEach((cid) => this.deleteFolder(cid));
    this.folders = this.folders.filter((f) => f.id !== id);
    this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
  }

  renameFolder(id, name) {
    const folder = this.folders.find((f) => f.id === id);
    if (folder) {
      folder.name = name;
      this.emit('views-changed', { views: this.views, selectedId: this.selectedViewId });
    }
  }

  getFolders() {
    return this.folders.map((f) => ({ ...f }));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  enable() {}
  disable() {}

  destroy() {
    this._cancelCameraTransition();
    this.views = [];
    this.folders = [];
    this.selectedViewId = null;
    this.eventListeners.clear();
  }

  // ── Event emitter ──────────────────────────────────────────────────────────

  on(event, callback) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.delete(callback);
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.forEach((cb) => cb(data));
  }
}
