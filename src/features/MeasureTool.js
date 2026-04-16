/**
 * MeasureTool - Stub feature for distance/area measurement
 * TODO: Implement point-to-point, area, and angle measurements
 */
export class MeasureTool {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.eventListeners = new Map();
    this.isActive = false;
  }

  enable() {
    this.isActive = true;
    // TODO: Activate measurement mode, add click listeners
  }

  disable() {
    this.isActive = false;
    // TODO: Deactivate measurement mode, remove listeners
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
