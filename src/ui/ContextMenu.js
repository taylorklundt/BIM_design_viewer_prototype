/**
 * ContextMenu - Right-click context menu component
 */

export class ContextMenu {
  constructor(container) {
    this.container = container;
    this.menu = null;
    this.isVisible = false;
    this.currentContext = null; // Stores intersection data

    this.eventListeners = new Map();

    this.boundOnClickOutside = this.onClickOutside.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);

    this.init();
  }

  init() {
    this.createMenu();
  }

  createMenu() {
    this.menu = document.createElement('div');
    this.menu.className = 'mv-context-menu mv-hidden';
    this.menu.innerHTML = `
      <div class="mv-context-menu-header" data-role="title">
        [Object Name]
      </div>
      <div class="mv-context-menu-divider"></div>
      <div class="mv-context-menu-item" data-action="hideSelected">
        <span>Hide</span>
        <span class="mv-context-menu-chevron">›</span>
      </div>
      <div class="mv-context-menu-item" data-action="selectSimilar">
        <span>Select Similar</span>
      </div>
      <div class="mv-context-menu-item" data-action="isolateXray">
        <span>Isolate</span>
        <span class="mv-context-menu-chevron">›</span>
      </div>
      <div class="mv-context-menu-item" data-action="viewProperties">
        <span>View Properties</span>
      </div>
      <div class="mv-context-menu-item" data-action="zoomToSection">
        <span>Zoom to section</span>
      </div>
      <div class="mv-context-menu-item" data-action="addSectionPlane">
        <span>Add section plane</span>
      </div>
      <div class="mv-context-menu-item" data-action="linkExistingIssue">
        <span>Link to existing issue</span>
      </div>
    `;

    this.container.appendChild(this.menu);
    this.setupEvents();
  }

  setupEvents() {
    // Menu item clicks
    this.menu.querySelectorAll('.mv-context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = item.dataset.action;
        this.handleAction(action);
        this.hide();
      });
    });
  }

  handleAction(action) {
    this.emit(action, this.currentContext);
  }

  /**
   * Show context menu at position
   * @param {number} x - Screen X coordinate
   * @param {number} y - Screen Y coordinate
   * @param {Object} context - Intersection data (elementId, point, face, mesh)
   */
  show(x, y, context) {
    this.currentContext = context;
    this.menu.classList.remove('mv-hidden');
    this.isVisible = true;

    // Position menu
    const rect = this.container.getBoundingClientRect();
    const menuRect = this.menu.getBoundingClientRect();

    // Adjust position to keep menu within container
    let menuX = x - rect.left;
    let menuY = y - rect.top;

    // Check right boundary
    if (menuX + menuRect.width > rect.width) {
      menuX = rect.width - menuRect.width - 10;
    }

    // Check bottom boundary
    if (menuY + menuRect.height > rect.height) {
      menuY = rect.height - menuRect.height - 10;
    }

    this.menu.style.left = `${menuX}px`;
    this.menu.style.top = `${menuY}px`;

    // Update menu items based on context
    this.updateMenuItems(context);

    // Add global listeners
    setTimeout(() => {
      document.addEventListener('click', this.boundOnClickOutside);
      document.addEventListener('keydown', this.boundOnKeyDown);
    }, 0);
  }

  hide() {
    this.menu.classList.add('mv-hidden');
    this.isVisible = false;
    this.currentContext = null;

    // Remove global listeners
    document.removeEventListener('click', this.boundOnClickOutside);
    document.removeEventListener('keydown', this.boundOnKeyDown);
  }

  updateMenuItems(context) {
    // Enable/disable items based on context
    const title = this.menu.querySelector('[data-role="title"]');
    const sectionPlaneItem = this.menu.querySelector('[data-action="addSectionPlane"]');
    const hideItem = this.menu.querySelector('[data-action="hideSelected"]');
    const similarItem = this.menu.querySelector('[data-action="selectSimilar"]');
    const isolateItem = this.menu.querySelector('[data-action="isolateXray"]');
    const propsItem = this.menu.querySelector('[data-action="viewProperties"]');

    if (title) {
      const objectLabel =
        context?.mesh?.userData?.name
        || context?.mesh?.name
        || context?.elementId
        || 'Object Name';
      title.textContent = `[${objectLabel}]`;
    }

    // Section plane requires a face to be clicked
    if (sectionPlaneItem) {
      const hasFace = context && context.face;
      sectionPlaneItem.classList.toggle('disabled', !hasFace);
    }

    // Remaining actions require an element
    const hasElement = context && context.elementId;
    [hideItem, similarItem, isolateItem, propsItem].forEach(item => {
      if (item) {
        item.classList.toggle('disabled', !hasElement);
      }
    });
  }

  onClickOutside(e) {
    if (!this.menu.contains(e.target)) {
      this.hide();
    }
  }

  onKeyDown(e) {
    if (e.key === 'Escape') {
      this.hide();
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
    document.removeEventListener('click', this.boundOnClickOutside);
    document.removeEventListener('keydown', this.boundOnKeyDown);
    if (this.menu) {
      this.menu.remove();
    }
    this.eventListeners.clear();
  }
}
