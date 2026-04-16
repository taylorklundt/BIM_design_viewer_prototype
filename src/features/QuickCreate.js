/**
 * QuickCreate - Stub feature for quick element creation
 * TODO: Implement quick placement of common BIM elements
 */
export class QuickCreate {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.eventListeners = new Map();
    this.isActive = false;
  }

  enable() {
    this.isActive = true;
    // TODO: Activate quick create mode
  }

  disable() {
    this.isActive = false;
    // TODO: Deactivate quick create mode
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
      this.eventListeners.get(event).forEach(cb => cb(data));
    }
  }
}
