/**
 * AllItems - Stub feature for listing all model items
 * TODO: Implement item listing, filtering, and search
 */
export class AllItems {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.eventListeners = new Map();
  }

  enable() {
    // TODO: Activate all items listing functionality
  }

  disable() {
    // TODO: Deactivate all items listing functionality
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
