/**
 * TreePanel - UI component for rendering the Object Tree
 */

export class TreePanel {
  constructor(container, objectTree, options = {}) {
    this.container = container;
    this.objectTree = objectTree;
    this.options = {
      position: 'left',
      width: 280,
      ...options
    };

    this.panel = null;
    this.searchInput = null;
    this.treeContainer = null;
    this.isOpen = false;
    this.filteredNodes = null; // null = no filter

    this.eventListeners = new Map();

    this.init();
    this.setupObjectTreeEvents();
  }

  init() {
    this.createPanel();
  }

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'mv-panel mv-tree-panel mv-hidden';
    this.panel.innerHTML = `
      <div class="mv-panel-header">
        <span>Object Tree</span>
        <div class="mv-panel-header-actions">
          <button class="mv-tree-expand-all" title="Expand All">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <button class="mv-tree-collapse-all" title="Collapse All">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M5 12h14"/>
            </svg>
          </button>
          <button class="mv-panel-close" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="mv-panel-content">
        <div class="mv-tree-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Filter by Keyword" />
          <button class="mv-tree-search-clear mv-hidden" title="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="mv-tree-container"></div>
      </div>
    `;

    this.container.appendChild(this.panel);

    // Get references
    this.searchInput = this.panel.querySelector('.mv-tree-search input');
    this.searchClearBtn = this.panel.querySelector('.mv-tree-search-clear');
    this.treeContainer = this.panel.querySelector('.mv-tree-container');

    this.setupEvents();
  }

  setupEvents() {
    // Close button
    this.panel.querySelector('.mv-panel-close').addEventListener('click', () => {
      this.close();
    });

    // Expand/Collapse all
    this.panel.querySelector('.mv-tree-expand-all').addEventListener('click', () => {
      this.objectTree.expandAll();
      this.render();
    });

    this.panel.querySelector('.mv-tree-collapse-all').addEventListener('click', () => {
      this.objectTree.collapseAll();
      this.render();
    });

    // Search input
    let searchTimeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value;

      this.searchClearBtn.classList.toggle('mv-hidden', !query);

      searchTimeout = setTimeout(() => {
        if (query) {
          this.filteredNodes = this.objectTree.filterTree(query);
        } else {
          this.filteredNodes = null;
          this.objectTree.clearFilter();
        }
        this.render();
      }, 300);
    });

    // Search clear button
    this.searchClearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchClearBtn.classList.add('mv-hidden');
      this.filteredNodes = null;
      this.objectTree.clearFilter();
      this.render();
    });

    // Tree container click delegation
    this.treeContainer.addEventListener('click', (e) => {
      const row = e.target.closest('.mv-tree-node-row');
      if (!row) return;

      const nodeId = row.dataset.nodeId;

      // Check what was clicked
      if (e.target.closest('.mv-tree-toggle')) {
        // Toggle expand/collapse
        this.objectTree.toggleNode(nodeId);
        this.render();
      } else if (e.target.closest('.mv-tree-visibility')) {
        // Toggle visibility
        const currentState = this.objectTree.getVisibilityState(nodeId);
        const elementIds = this.objectTree.getElementIdsByNode(nodeId);
        // If currently visible or mixed, we want to hide. If hidden, we want to show.
        const shouldShow = currentState === 'hidden';

        console.log('[TreePanel] Visibility toggle clicked:', {
          nodeId,
          currentState,
          elementIds,
          shouldShow,
          elementCount: elementIds.length
        });

        this.emit('visibility-toggle', {
          nodeId,
          elementIds,
          visible: shouldShow
        });
      } else {
        // Select node
        const addToSelection = e.ctrlKey || e.metaKey;
        const elementIds = this.objectTree.selectNode(nodeId, addToSelection);
        this.emit('node-select', { nodeId, elementIds, addToSelection });
        this.render();
      }
    });

    // Double-click to zoom
    this.treeContainer.addEventListener('dblclick', (e) => {
      const row = e.target.closest('.mv-tree-node-row');
      if (!row) return;

      const nodeId = row.dataset.nodeId;
      const elementIds = this.objectTree.getElementIdsByNode(nodeId);
      this.emit('node-double-click', { nodeId, elementIds });
    });
  }

  setupObjectTreeEvents() {
    // Sync selection from 3D view
    this.objectTree.on('tree-selection-sync', () => {
      this.render();
    });

    this.objectTree.on('tree-scroll-to', ({ nodeId }) => {
      this.render();
      // Scroll to the node
      setTimeout(() => {
        const nodeRow = this.treeContainer.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeRow) {
          nodeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    });
  }

  /**
   * Render the tree
   */
  render() {
    const treeData = this.objectTree.getTree();
    this.treeContainer.innerHTML = this.renderNodes(treeData);
  }

  /**
   * Render tree nodes recursively
   */
  renderNodes(nodes, depth = 0) {
    if (!nodes || nodes.length === 0) return '';

    return nodes.map(node => this.renderNode(node, depth)).join('');
  }

  /**
   * Render a single tree node
   */
  renderNode(node, depth = 0) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = this.objectTree.isExpanded(node.id);
    const isSelected = this.objectTree.isSelected(node.id);
    const visibilityState = this.objectTree.getVisibilityState(node.id);

    // Check if filtered out
    if (this.filteredNodes && !this.filteredNodes.has(node.id)) {
      return '';
    }

    const collapsedClass = !isExpanded && hasChildren ? 'collapsed' : '';
    const selectedClass = isSelected ? 'selected' : '';
    const hiddenClass = visibilityState === 'hidden' ? 'hidden-element' : '';
    const leafClass = !hasChildren ? 'mv-tree-leaf' : '';

    // Inline styles drive checkbox appearance on every render — avoids CSS cascade issues
    const checkboxStyle = isSelected
      ? 'background:#2563eb;border-color:#2563eb'
      : '';
    const checkIconStyle = isSelected ? '' : 'display:none';

    const html = `
      <div class="mv-tree-node ${collapsedClass}" data-depth="${depth}">
        <div class="mv-tree-node-row ${selectedClass} ${hiddenClass} ${leafClass}" data-node-id="${node.id}">
          <span class="mv-tree-checkbox" style="${checkboxStyle}">
            <svg class="mv-tree-checkbox-icon" style="${checkIconStyle}" viewBox="0 0 12 10" fill="none" stroke="white" stroke-width="2.5" width="10" height="10">
              <path d="M1 5l3.5 3.5L11 1"/>
            </svg>
          </span>
          <span class="mv-tree-toggle">
            ${hasChildren ? this.getToggleIcon() : '<span style="width:16px;display:inline-block"></span>'}
          </span>
          <span class="mv-tree-icon">
            ${this.getNodeIcon(node)}
          </span>
          <span class="mv-tree-label" title="${node.name}">${this.highlightSearchMatch(node.name)}</span>
          <button class="mv-tree-visibility" title="Toggle visibility">
            ${this.getVisibilityIcon(visibilityState)}
          </button>
        </div>
        ${hasChildren ? `
          <div class="mv-tree-children">
            ${this.renderNodes(node.children, depth + 1)}
          </div>
        ` : ''}
      </div>
    `;

    return html;
  }

  /**
   * Get toggle (expand/collapse) icon
   */
  getToggleIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
        <path d="M9 6l6 6-6 6"/>
      </svg>
    `;
  }

  /**
   * Get icon for node type
   */
  getNodeIcon(node) {
    const icons = {
      'model': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6M12 18v-6M9 15h6"/>
      </svg>`,
      'file': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>`,
      'wall': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
      </svg>`,
      'door': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M4 4h16v16H4z"/>
        <path d="M10 4v16"/>
        <circle cx="8" cy="12" r="1"/>
      </svg>`,
      'window': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <rect x="3" y="5" width="18" height="14" rx="2"/>
        <path d="M3 12h18M12 5v14"/>
      </svg>`,
      'slab': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M4 6h16v4H4z"/>
      </svg>`,
      'column': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <rect x="8" y="2" width="8" height="20"/>
      </svg>`,
      'beam': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <rect x="2" y="10" width="20" height="4"/>
      </svg>`,
      'stair': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M4 20h4v-4h4v-4h4v-4h4"/>
      </svg>`,
      'floor': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <rect x="3" y="8" width="18" height="8"/>
        <path d="M7 8v8M12 8v8M17 8v8"/>
      </svg>`,
      'building': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <rect x="4" y="2" width="16" height="20"/>
        <path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/>
      </svg>`,
      'element': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>`
    };

    return icons[node.icon] || icons['element'];
  }

  /**
   * Get visibility icon based on state
   */
  getVisibilityIcon(state) {
    if (state === 'hidden') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`;
    } else if (state === 'mixed') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 5v2M12 17v2"/>
      </svg>`;
    } else {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
    }
  }

  /**
   * Highlight search match in text
   */
  highlightSearchMatch(text) {
    if (!this.searchInput || !this.searchInput.value) return text;

    const query = this.searchInput.value;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Open the panel
   */
  open() {
    this.panel.classList.remove('mv-hidden');
    this.isOpen = true;
    this.objectTree.buildTree();
    this.render();
    this.emit('open');
  }

  /**
   * Close the panel
   */
  close() {
    this.panel.classList.add('mv-hidden');
    this.isOpen = false;
    this.emit('close');
  }

  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Refresh the tree (rebuild and render)
   */
  refresh() {
    this.objectTree.buildTree();
    this.render();
  }

  /**
   * Update visibility states and re-render
   */
  updateVisibility() {
    this.objectTree.updateAllVisibilityStates();
    this.render();
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
    if (this.panel) {
      this.panel.remove();
    }
    this.eventListeners.clear();
  }
}
