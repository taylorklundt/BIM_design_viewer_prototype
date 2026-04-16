/**
 * OrthographicCamera - Stub feature for perspective/orthographic camera toggle
 * TODO: Implement orthographic camera mode with smooth transitions
 */
export class OrthographicCamera {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.eventListeners = new Map();
    this.isOrthographic = false;
  }

  enable() {
    // TODO: Set up camera toggle
  }

  disable() {
    // TODO: Reset to perspective camera
  }

  toggle() {
    // TODO: Switch between perspective and orthographic
    this.isOrthographic = !this.isOrthographic;
  }

  getIsOrthographic() {
    return this.isOrthographic;
  }

  destroy() {
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
