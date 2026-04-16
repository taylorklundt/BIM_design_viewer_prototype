import { WIPModal } from './WIPModal.js';

/**
 * LeftSidebar - Vertical toolbar on the left side of the viewer
 * Contains icon-only buttons for feature panels with tooltip labels.
 */
export class LeftSidebar {
  constructor(container, viewer) {
    this.container = container;
    this.viewer = viewer;

    this.sidebar = null;
    this.activePanel = null;
    this.eventListeners = new Map();
    this.wipModal = new WIPModal(container);

    this.stubPanels = new Set(['viewsMarkups', 'allItems', 'properties', 'objectGroups', 'deviation']);
    this.stubLabels = {
      viewsMarkups: 'Views & Markups',
      allItems: 'All Items',
      properties: 'Properties',
      objectGroups: 'Object Groups',
      deviation: 'Deviation',
    };

    this.buttons = [
      { id: 'viewsMarkups', label: 'Views & Markups', icon: LeftSidebar.viewsIcon() },
      { id: 'allItems', label: 'All Items', icon: LeftSidebar.allItemsIcon() },
      { id: 'objectTree', label: 'Object Tree', icon: LeftSidebar.objectTreeIcon() },
      { id: 'properties', label: 'Properties', icon: LeftSidebar.propertiesIcon() },
      { id: 'objectGroups', label: 'Object Groups', icon: LeftSidebar.objectGroupsIcon() },
      { id: 'deviation', label: 'Deviation', icon: LeftSidebar.deviationIcon() },
      { id: 'searchSets', label: 'Search Sets', icon: LeftSidebar.searchSetsIcon() },
    ];

    this.init();
  }

  init() {
    this.createSidebar();
    this.setupEvents();
    this.syncTreePanelState();
  }

  createSidebar() {
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'mv-left-sidebar';

    const buttonsHtml = this.buttons
      .map(
        (btn) => `
      <button class="mv-sidebar-btn" data-panel="${btn.id}" title="${btn.label}">
        ${btn.icon}
      </button>`
      )
      .join('');

    this.sidebar.innerHTML = buttonsHtml;

    // Find the .model-viewer wrapper inside the container (the viewer creates it)
    const modelViewer =
      this.container.querySelector('.model-viewer') || this.container;
    modelViewer.appendChild(this.sidebar);

    // Add class so CSS can shift the tree panel right
    modelViewer.classList.add('mv-has-left-sidebar');
  }

  setupEvents() {
    // Button click handlers
    this.sidebar.querySelectorAll('.mv-sidebar-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.handleButtonClick(btn.dataset.panel);
      });
    });

    // Sync with TreePanel open/close events (handles top toolbar & keyboard toggle)
    if (this.viewer.treePanel) {
      this.viewer.treePanel.on('close', () => {
        if (this.activePanel === 'objectTree') {
          this.activePanel = null;
          this.updateButtonStates();
        }
      });
      this.viewer.treePanel.on('open', () => {
        // If another button was active, deactivate it
        this.activePanel = 'objectTree';
        this.updateButtonStates();
      });
    }
  }

  /** If the tree panel was already open before the sidebar was created, reflect that. */
  syncTreePanelState() {
    if (this.viewer.treePanel && this.viewer.treePanel.isOpen) {
      this.activePanel = 'objectTree';
      this.updateButtonStates();
    }
  }

  /** Keep sidebar button state in sync when SearchSetsPanel is closed externally. */
  syncSearchSetsPanelState() {
    if (!this.viewer.searchSetsPanel) return;
    this.viewer.searchSetsPanel.on('close', () => {
      if (this.activePanel === 'searchSets') {
        this.activePanel = null;
        this.updateButtonStates();
      }
    });
    this.viewer.searchSetsPanel.on('open', () => {
      this.activePanel = 'searchSets';
      this.updateButtonStates();
    });
  }

  handleButtonClick(panelId) {
    // Always dismiss WIP modal before handling a new click
    this.wipModal.close();

    if (this.activePanel === panelId) {
      // Toggle off the current panel
      this.closePanel(panelId);
      this.activePanel = null;
    } else {
      // Close current panel if any
      if (this.activePanel) {
        this.closePanel(this.activePanel);
      }
      // Open new panel
      this.openPanel(panelId);
      this.activePanel = panelId;
    }

    this.updateButtonStates();
    this.emit('panel-toggle', {
      panelId,
      active: this.activePanel === panelId,
    });
  }

  openPanel(panelId) {
    if (this.stubPanels.has(panelId)) {
      this.wipModal.show(this.stubLabels[panelId]);
      this.emit('sidebar-action', { action: panelId, type: 'open' });
      return;
    }
    if (panelId === 'objectTree' && this.viewer.treePanel) {
      if (!this.viewer.treePanel.isOpen) {
        this.viewer.treePanel.open();
      }
    } else if (panelId === 'searchSets' && this.viewer.searchSetsPanel) {
      if (!this.viewer.searchSetsPanel.isOpen) {
        this.viewer.searchSetsPanel.open();
      }
    }
    this.emit('sidebar-action', { action: panelId, type: 'open' });
  }

  closePanel(panelId) {
    if (this.stubPanels.has(panelId)) {
      this.wipModal.close();
      this.emit('sidebar-action', { action: panelId, type: 'close' });
      return;
    }
    if (panelId === 'objectTree' && this.viewer.treePanel) {
      if (this.viewer.treePanel.isOpen) {
        this.viewer.treePanel.close();
      }
    } else if (panelId === 'searchSets' && this.viewer.searchSetsPanel) {
      if (this.viewer.searchSetsPanel.isOpen) {
        this.viewer.searchSetsPanel.close();
      }
    }
    this.emit('sidebar-action', { action: panelId, type: 'close' });
  }

  updateButtonStates() {
    this.sidebar.querySelectorAll('.mv-sidebar-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.panel === this.activePanel);
    });
  }

  // ── Event system ────────────────────────────────────────────────

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
      this.eventListeners.get(event).forEach((cb) => cb(data));
    }
  }

  destroy() {
    if (this.wipModal) {
      this.wipModal.destroy();
    }
    if (this.sidebar) {
      const parent = this.sidebar.parentElement;
      if (parent) {
        parent.classList.remove('mv-has-left-sidebar');
      }
      this.sidebar.remove();
    }
    this.eventListeners.clear();
  }

  // ── SVG Icons ───────────────────────────────────────────────────

  /** Eye with markup lines */
  static viewsIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`;
  }

  /** Grid of items */
  static allItemsIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8" cy="8" r="2"/>
      <circle cx="16" cy="8" r="2"/>
      <circle cx="8" cy="16" r="2"/>
      <circle cx="16" cy="16" r="2"/>
      <line x1="12" y1="8" x2="14" y2="8"/>
      <line x1="12" y1="16" x2="14" y2="16"/>
    </svg>`;
  }

  /** Hierarchical tree with nodes and connecting lines */
  static objectTreeIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="6" height="4" rx="1"/>
      <rect x="13" y="10" width="6" height="4" rx="1"/>
      <rect x="13" y="18" width="6" height="4" rx="1"/>
      <path d="M6 7v5h7M6 12v8h7"/>
    </svg>`;
  }

  /** 3D cube with info indicator */
  static propertiesIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>`;
  }

  /** Overlapping grouped shapes */
  static objectGroupsIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="8" height="8" rx="1"/>
      <rect x="14" y="6" width="8" height="8" rx="1"/>
      <rect x="8" y="12" width="8" height="8" rx="1"/>
    </svg>`;
  }

  /** Diagonal ruler with deviation arrows */
  static deviationIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 2l20 20"/>
      <path d="M18 2h4v4"/>
      <path d="M2 18v4h4"/>
      <path d="M15 9l-6 6"/>
    </svg>`;
  }

  /** Magnifying glass with filter lines – saved search sets */
  static searchSetsIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="10" cy="10" r="7"/>
      <line x1="21" y1="21" x2="15" y2="15"/>
      <line x1="7" y1="8" x2="13" y2="8"/>
      <line x1="7" y1="11" x2="11" y2="11"/>
    </svg>`;
  }
}
