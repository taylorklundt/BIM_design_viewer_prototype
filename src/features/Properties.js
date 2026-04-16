/**
 * Properties - Stub feature for displaying element properties
 * TODO: Implement IFC property reading, property panel, and property editing
 */
export class Properties {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.eventListeners = new Map();
  }

  enable() {
    // TODO: Activate properties panel functionality
  }

  disable() {
    // TODO: Deactivate properties panel functionality
  }

  destroy() {
    this.eventListeners.clear();
  }

  // Event system
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
