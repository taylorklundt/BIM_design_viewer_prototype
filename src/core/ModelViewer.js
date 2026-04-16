import { SceneManager } from './SceneManager.js';
import { IFCLoader } from './IFCLoader.js';
import { Navigation } from '../features/Navigation.js';
import { Selection } from '../features/Selection.js';
import { Visibility } from '../features/Visibility.js';
import { Sectioning } from '../features/Sectioning.js';
import { ObjectTree } from '../features/ObjectTree.js';
import { SearchSets } from '../features/SearchSets.js';
import { ViewsManager } from '../features/ViewsManager.js';
import { MarkupTool } from '../features/MarkupTool.js';
import { XRay } from '../features/XRay.js';
import { TreePanel } from '../ui/TreePanel.js';
import { ContextMenu } from '../ui/ContextMenu.js';
import '../styles/dark-theme.css';

export class ModelViewer {
  constructor(selector, options = {}) {
    this.options = {
      theme: 'dark',
      autoSave: false,
      autoSaveInterval: 30000,
      showGrid: true,
      showToolbar: true,
      showStatusBar: true,
      showLoadingOverlay: true,
      autoZoomOnLoad: true,
      autoZoomOnObjectLoadStart: false,
      ...options
    };

    // Get or create container
    this.container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!this.container) {
      throw new Error(`Container not found: ${selector}`);
    }

    // Add viewer class to container
    this.container.classList.add('model-viewer');

    // Create canvas container
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'mv-canvas-container';
    this.container.appendChild(this.canvasContainer);

    // Initialize components
    this.sceneManager = null;
    this.ifcLoader = null;
    this.navigation = null;
    this.selection = null;
    this.visibility = null;
    this.sectioning = null;
    this.objectTree = null;
    this.treePanel = null;
    this.searchSets = null;
    this.contextMenu = null;

    // Event listeners
    this.eventListeners = new Map();

    // UI elements
    this.toolbar = null;
    this.statusBar = null;
    this.loadingOverlay = null;

    // Initial view state (captured after model loads)
    this.initialCameraState = null;
    this.interactionMode = 'select';

    // Initialize
    this.init();
  }

  async init() {
    try {
      // Initialize scene manager
      this.sceneManager = new SceneManager(this.canvasContainer);

      // Initialize IFC loader
      this.ifcLoader = new IFCLoader(this.sceneManager);
      await this.setupLoaderEvents();

      // Initialize features
      this.navigation = new Navigation(this.sceneManager);
      this.selection = new Selection(this.sceneManager);
      this.visibility = new Visibility(this.sceneManager);
      this.sectioning = new Sectioning(this.sceneManager);
      this.xray = new XRay(this.sceneManager);

      // Initialize Object Tree
      this.objectTree = new ObjectTree(this.sceneManager, this.ifcLoader);
      this.treePanel = new TreePanel(this.container, this.objectTree);

      // Initialize Search Sets
      this.searchSets = new SearchSets(this.sceneManager, {
        ifcLoader: this.ifcLoader,
        selection: this.selection,
      });
      this.searchSets.enable();

      // Initialize Context Menu
      this.contextMenu = new ContextMenu(this.container);

      // Initialize Views & Markup
      this.views = new ViewsManager(this);
      this.markup = new MarkupTool(this.sceneManager);

      // Setup feature events
      this.setupSelectionEvents();
      this.setupNavigationEvents();
      this.setupTreeEvents();
      this.setupContextMenuEvents();

      this.sectioning.onToolChange((tool) => {
        const disableSelection = tool === 'section-cut' || tool === 'section-plane';
        this.selection.setHoverEnabled(!disableSelection);
        this.selection.setSelectionEnabled(!disableSelection);
      });

      // Create UI
      if (this.options.showToolbar) {
        this.createToolbar();
      }

      if (this.options.showStatusBar) {
        this.createStatusBar();
      }

      // Grid visibility
      this.sceneManager.showGrid(this.options.showGrid);
      this.setInteractionMode('select');

      // Emit ready event
      this.emit('ready');
    } catch (error) {
      console.error('ModelViewer initialization failed:', error);
      this.emit('error', { error });
    }
  }

  setupLoaderEvents() {
    this.ifcLoader.on('load-start', (data) => {
      if (this.options.showLoadingOverlay) {
        this.showLoading(`Loading ${data.name || 'model'}...`);
      }
      this.emit('load-start', data);
    });

    this.ifcLoader.on('load-complete', (data) => {
      this.hideLoading();
      if (this.options.autoZoomOnLoad) {
        this.navigation.zoomToFit();
      }

      // Capture initial camera state for Home button reset
      this.initialCameraState = this.navigation.getCamera();

      this.updateStatusBar();
      this.emit('load-complete', data);
    });

    this.ifcLoader.on('load-error', (data) => {
      this.hideLoading();
      this.emit('load-error', data);
    });

    this.ifcLoader.on('stream-capability', (data) => {
      if (data?.streamingSupported) {
        this.hideLoading();
      }
      this.emit('stream-capability', data);
    });

    this.ifcLoader.on('object-load-start', (data) => {
      // Once placeholder objects start streaming in, stop blocking the scene.
      this.hideLoading();
      if (this.options.autoZoomOnObjectLoadStart) {
        this.navigation.zoomToFit();
      }
      this.emit('object-load-start', data);
    });

    this.ifcLoader.on('object-load-progress', (data) => {
      this.hideLoading();
      this.emit('object-load-progress', data);
    });

    this.ifcLoader.on('object-load-complete', (data) => {
      this.emit('object-load-complete', data);
    });

    this.ifcLoader.on('object-load-error', (data) => {
      this.emit('object-load-error', data);
    });

    this.ifcLoader.on('model-stream-complete', (data) => {
      this.emit('model-stream-complete', data);
    });
  }

  setupSelectionEvents() {
    this.selection.on('selection-change', (data) => {
      this.emit('selection-change', data);
      this.updateStatusBar();
    });

    this.selection.on('element-click', (data) => {
      this.emit('element-click', data);
    });

    this.selection.on('element-double-click', (data) => {
      this.emit('element-double-click', data);
      // Zoom to double-clicked element
      if (data.mesh) {
        this.navigation.zoomToSelection([data.mesh]);
      }
    });

    this.selection.on('element-hover', (data) => {
      this.emit('element-hover', data);
    });
  }

  setupNavigationEvents() {
    this.navigation.on('camera-change', (data) => {
      this.emit('camera-change', data);
      if (this.markup) this.markup.renderIfActive();
    });

    this.navigation.on('mode-change', (data) => {
      this.emit('mode-change', data);
      this.updateToolbarState();
    });
  }

  setupTreeEvents() {
    // When tree node is selected, select elements in 3D view
    this.treePanel.on('node-select', ({ nodeId, elementIds, addToSelection }) => {
      if (!addToSelection) {
        this.selection.deselect();
      }
      if (elementIds.length > 0) {
        this.selection.selectByIds(elementIds);
      }
      this.emit('tree-node-select', { nodeId, elementIds });
    });

    // When tree node is double-clicked, zoom to elements
    this.treePanel.on('node-double-click', ({ nodeId, elementIds }) => {
      if (elementIds.length > 0) {
        const meshes = [];
        elementIds.forEach(id => {
          const mesh = this.visibility.getMeshByElementId(id);
          if (mesh) meshes.push(mesh);
        });
        if (meshes.length > 0) {
          this.navigation.zoomToSelection(meshes);
        }
      }
      this.emit('tree-node-double-click', { nodeId, elementIds });
    });

    // When visibility is toggled in tree, update element visibility
    this.treePanel.on('visibility-toggle', ({ nodeId, elementIds, visible }) => {
      console.log('[ModelViewer] Received visibility-toggle:', {
        nodeId,
        elementIds,
        visible,
        elementCount: elementIds.length
      });

      if (visible) {
        console.log('[ModelViewer] Calling visibility.show()');
        this.visibility.show(elementIds);
      } else {
        console.log('[ModelViewer] Calling visibility.hide()');
        this.visibility.hide(elementIds);
      }
      this.treePanel.updateVisibility();
      this.emit('tree-visibility-toggle', { nodeId, elementIds, visible });
    });

    // Sync selection from 3D view to tree
    this.selection.on('selection-change', ({ selected }) => {
      this.objectTree.selectNodesByElementIds(selected);
    });

    // When model loads, rebuild object tree (used by both legacy TreePanel and chrome UI)
    this.ifcLoader.on('load-complete', () => {
      this.objectTree.buildTree();
      if (this.treePanel.isOpen) {
        this.treePanel.refresh();
      }
    });

    this.ifcLoader.on('model-stream-complete', () => {
      this.objectTree.buildTree();
    });

    // When visibility changes externally, update tree
    this.visibility.on('visibility-change', () => {
      if (this.treePanel.isOpen) {
        this.treePanel.updateVisibility();
      }
    });
  }

  setupContextMenuEvents() {
    // Show context menu on right-click
    this.selection.on('context-menu', (data) => {
      this.contextMenu.show(data.screenX, data.screenY, data);
    });

    // Handle context menu actions
    this.contextMenu.on('addSectionPlane', (context) => {
      if (context && context.normal && context.point) {
        this.sectioning.addClipPlane(context.normal, context.point);
        this.emit('section-plane-create', { normal: context.normal, point: context.point });
      }
    });

    this.contextMenu.on('hideSelected', (context) => {
      if (context && context.elementId) {
        this.visibility.hide([context.elementId]);
        this.selection.deselect([context.elementId]);
      }
    });

    this.contextMenu.on('isolateXray', (context) => {
      if (context && context.elementId) {
        // Real isolate behavior available today.
        this.visibility.isolate([context.elementId]);
        // TODO: add dedicated x-ray mode overlay pass for isolate workflow.
        console.log('[ContextMenu] TODO: Isolate in X-Ray visual mode is not implemented yet');
      }
    });

    this.contextMenu.on('viewProperties', (context) => {
      // TODO: wire to Chrome properties panel once adapter exposure exists.
      console.log('[ContextMenu] TODO: View Properties action not implemented yet', {
        elementId: context?.elementId ?? null,
      });
    });

    this.contextMenu.on('selectSimilar', (context) => {
      // TODO: define similarity criteria (ifcType/material/name/etc) and select matching set.
      console.log('[ContextMenu] TODO: Select Similar action not implemented yet', {
        elementId: context?.elementId ?? null,
      });
    });

    this.contextMenu.on('zoomToSection', (context) => {
      if (context && context.mesh) {
        this.navigation.zoomToSelection([context.mesh]);
      } else {
        this.navigation.zoomToFit();
      }
    });

    this.contextMenu.on('linkExistingIssue', (context) => {
      // TODO: wire to issue linking workflow when issue module is integrated.
      console.log('[ContextMenu] TODO: Link to existing issue action not implemented yet', {
        elementId: context?.elementId ?? null,
      });
    });

    // Backward-compatible no-op aliases in case other callers still emit old names.
    this.contextMenu.on('createSectionPlane', (context) => {
      if (context && context.normal && context.point) {
        this.sectioning.addClipPlane(context.normal, context.point);
        this.emit('section-plane-create', { normal: context.normal, point: context.point });
      }
    });
    this.contextMenu.on('hide', (context) => {
      if (context && context.elementId) {
        this.visibility.hide([context.elementId]);
        this.selection.deselect([context.elementId]);
      }
    });
    this.contextMenu.on('isolate', (context) => {
      if (context && context.elementId) {
        this.visibility.isolate([context.elementId]);
      }
    });
    this.contextMenu.on('showAll', () => {
      this.visibility.showAll();
    });
    this.contextMenu.on('zoomToFit', (context) => {
      if (context && context.mesh) {
        this.navigation.zoomToSelection([context.mesh]);
      } else {
        this.navigation.zoomToFit();
      }
    });

    // Section plane events
    this.sectioning.on('plane-add', (data) => {
      this.emit('section-plane-add', data);
    });

    this.sectioning.on('plane-remove', (data) => {
      this.emit('section-plane-remove', data);
    });

    this.sectioning.on('plane-move', (data) => {
      this.emit('section-plane-move', data);
    });

    // Disable orbit controls while dragging section plane
    this.sectioning.on('drag-start', () => {
      this.navigation.setControlsEnabled(false);
    });

    this.sectioning.on('drag-end', () => {
      this.navigation.setControlsEnabled(true);
    });
  }

  // Model loading methods
  async loadModel(url, name) {
    return this.ifcLoader.loadModel(url, name);
  }

  async loadModelFromFile(file, name) {
    return this.ifcLoader.loadModelFromFile(file, name);
  }

  unloadModel(modelId) {
    return this.ifcLoader.unloadModel(modelId);
  }

  getLoadedModels() {
    return this.ifcLoader.getLoadedModels();
  }

  /**
   * Reset view to initial state - clears all user operations
   */
  resetView() {
    // Deselect all elements
    this.selection.deselect();

    // Show all hidden elements
    this.visibility.showAll();

    // Clear all section planes
    this.sectioning.clearClipPlanes();

    // Reset camera to initial state
    if (this.initialCameraState) {
      this.navigation.setCamera(
        this.initialCameraState.position,
        this.initialCameraState.target
      );
    } else {
      // Fallback: zoom to fit if no initial state captured
      this.navigation.zoomToFit();
    }

    // Reset navigation mode to orbit
    this.navigation.setMode('orbit');

    // Update toolbar state
    this.updateToolbarState();

    this.emit('view-reset');
  }

  setInteractionMode(mode) {
    this.interactionMode = mode;

    switch (mode) {
      case 'orbit':
        this.navigation.setMode('orbit');
        break;
      case 'fly':
        // Keep camera controls stable in chrome mode while still signaling fly cursor intent.
        this.navigation.setMode('orbit');
        break;
      case 'select':
      default:
        this.navigation.setMode('orbit');
        break;
    }

    this.container.classList.remove('mv-cursor-select', 'mv-cursor-orbit', 'mv-cursor-fly');
    this.container.classList.add(`mv-cursor-${mode}`);
    this.emit('interaction-mode-change', { mode });
  }

  // UI creation
  createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'mv-toolbar';
    this.toolbar.innerHTML = `
      <div class="mv-toolbar-group">
        <button class="mv-btn" data-action="resetView" title="Home - Reset View (R)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
      </div>
      <div class="mv-toolbar-group">
        <button class="mv-btn active" data-mode="orbit" title="Orbit (O)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </button>
        <button class="mv-btn" data-mode="pan" title="Pan (P)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
          </svg>
        </button>
        <button class="mv-btn" data-mode="firstPerson" title="First Person (F)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="5"/>
            <path d="M20 21a8 8 0 0 0-16 0"/>
          </svg>
        </button>
      </div>
      <div class="mv-toolbar-group">
        <button class="mv-btn" data-action="zoomFit" title="Zoom to Fit (Home)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </button>
        <button class="mv-btn" data-action="zoomSelection" title="Zoom to Selection">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
        </button>
      </div>
      <div class="mv-toolbar-group">
        <button class="mv-btn" data-action="showAll" title="Show All">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="mv-btn" data-action="hideSelected" title="Hide Selected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
        <button class="mv-btn" data-action="isolateSelected" title="Isolate Selected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <rect x="8" y="8" width="8" height="8" rx="1" ry="1"/>
          </svg>
        </button>
      </div>
      <div class="mv-toolbar-group">
        <button class="mv-btn" data-action="toggleGrid" title="Toggle Grid">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18"/>
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
          </svg>
        </button>
      </div>
      <div class="mv-toolbar-group">
        <button class="mv-btn" data-action="toggleTree" title="Object Tree (T)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v6M12 18v4M4.93 10.93l4.24 4.24M14.83 15.17l4.24 4.24M2 12h6M16 12h6M4.93 13.07l4.24-4.24M14.83 8.83l4.24-4.24"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </button>
      </div>
    `;

    this.container.appendChild(this.toolbar);
    this.setupToolbarEvents();
  }

  setupToolbarEvents() {
    // Mode buttons
    this.toolbar.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigation.setMode(btn.dataset.mode);
      });
    });

    // Action buttons
    this.toolbar.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleToolbarAction(btn.dataset.action);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 'o':
          this.navigation.setMode('orbit');
          break;
        case 'p':
          this.navigation.setMode('pan');
          break;
        case 'f':
          this.navigation.setMode('firstPerson');
          break;
        case 'home':
          this.navigation.zoomToFit();
          break;
        case 'r':
          this.handleToolbarAction('resetView');
          break;
        case 'h':
          this.handleToolbarAction('hideSelected');
          break;
        case 'i':
          this.handleToolbarAction('isolateSelected');
          break;
        case 't':
          this.handleToolbarAction('toggleTree');
          break;
        case 'escape':
          this.selection.deselect();
          break;
      }
    });
  }

  handleToolbarAction(action) {
    switch (action) {
      case 'resetView':
        this.resetView();
        break;
      case 'zoomFit':
        this.navigation.zoomToFit();
        break;
      case 'zoomSelection':
        const selectedMeshes = this.selection.getSelectedMeshes();
        if (selectedMeshes.length > 0) {
          this.navigation.zoomToSelection(selectedMeshes);
        }
        break;
      case 'showAll':
        this.visibility.showAll();
        break;
      case 'hideSelected':
        const selected = this.selection.getSelected();
        if (selected.length > 0) {
          this.visibility.hide(selected);
          this.selection.deselect();
        }
        break;
      case 'isolateSelected':
        const isolated = this.selection.getSelected();
        if (isolated.length > 0) {
          this.visibility.isolate(isolated);
        }
        break;
      case 'toggleGrid':
        const gridVisible = this.sceneManager.gridHelper?.visible ?? true;
        this.sceneManager.showGrid(!gridVisible);
        break;
      case 'toggleTree':
        this.treePanel.toggle();
        this.updateToolbarState();
        break;
    }
  }

  updateToolbarState() {
    if (!this.toolbar) return;

    const mode = this.navigation.getMode();
    this.toolbar.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update tree button state
    const treeBtn = this.toolbar.querySelector('[data-action="toggleTree"]');
    if (treeBtn) {
      treeBtn.classList.toggle('active', this.treePanel?.isOpen);
    }
  }

  createStatusBar() {
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'mv-status-bar';
    this.statusBar.innerHTML = `
      <div class="mv-status-item" data-info="models">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        <span>0 models</span>
      </div>
      <div class="mv-status-item" data-info="selected">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>0 selected</span>
      </div>
    `;

    this.container.appendChild(this.statusBar);
  }

  updateStatusBar() {
    if (!this.statusBar) return;

    const models = this.getLoadedModels();
    const selected = this.selection.getSelected();

    const modelsItem = this.statusBar.querySelector('[data-info="models"] span');
    const selectedItem = this.statusBar.querySelector('[data-info="selected"] span');

    if (modelsItem) {
      modelsItem.textContent = `${models.length} model${models.length !== 1 ? 's' : ''}`;
    }

    if (selectedItem) {
      selectedItem.textContent = `${selected.length} selected`;
    }
  }

  showLoading(message = 'Loading...') {
    if (!this.loadingOverlay) {
      this.loadingOverlay = document.createElement('div');
      this.loadingOverlay.className = 'mv-loading';
      this.loadingOverlay.innerHTML = `
        <div class="mv-loading-spinner"></div>
        <div class="mv-loading-text">${message}</div>
        <div class="mv-progress">
          <div class="mv-progress-bar" style="width: 0%"></div>
        </div>
      `;
      this.container.appendChild(this.loadingOverlay);
    } else {
      this.loadingOverlay.querySelector('.mv-loading-text').textContent = message;
      this.loadingOverlay.classList.remove('mv-hidden');
    }
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('mv-hidden');
    }
  }

  setLoadingProgress(percent) {
    if (this.loadingOverlay) {
      const progressBar = this.loadingOverlay.querySelector('.mv-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
    }
  }

  // State management
  getState() {
    return {
      version: '1.0',
      exportedAt: Date.now(),
      models: this.getLoadedModels(),
      camera: this.navigation.getCamera(),
      hiddenElements: this.visibility.getHiddenElements(),
      selectedElements: this.selection.getSelected(),
      navigationMode: this.navigation.getMode(),
      sectionPlanes: this.sectioning.getState()
    };
  }

  setState(state) {
    if (!state) return;

    // Restore camera
    if (state.camera) {
      this.navigation.setCamera(state.camera.position, state.camera.target);
    }

    // Restore visibility
    if (state.hiddenElements && state.hiddenElements.length > 0) {
      this.visibility.hide(state.hiddenElements);
    }

    // Restore selection
    if (state.selectedElements && state.selectedElements.length > 0) {
      this.selection.selectByIds(state.selectedElements);
    }

    // Restore navigation mode
    if (state.navigationMode) {
      this.navigation.setMode(state.navigationMode);
    }

    // Restore section planes
    if (state.sectionPlanes) {
      this.sectioning.setState(state.sectionPlanes);
    }
  }

  // Resize handler
  resize() {
    this.sceneManager.resize();
  }

  // Event handling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
    return this;
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  // Cleanup
  destroy() {
    // Remove UI elements
    if (this.toolbar) this.toolbar.remove();
    if (this.statusBar) this.statusBar.remove();
    if (this.loadingOverlay) this.loadingOverlay.remove();

    // Destroy features
    if (this.contextMenu) this.contextMenu.destroy();
    if (this.treePanel) this.treePanel.destroy();
    if (this.objectTree) this.objectTree.destroy();
    if (this.sectioning) this.sectioning.destroy();
    if (this.navigation) this.navigation.destroy();
    if (this.selection) this.selection.destroy();
    if (this.visibility) this.visibility.destroy();
    if (this.ifcLoader) this.ifcLoader.destroy();
    if (this.sceneManager) this.sceneManager.destroy();

    // Clear event listeners
    this.eventListeners.clear();

    // Remove canvas container
    if (this.canvasContainer) this.canvasContainer.remove();

    // Remove viewer class from container
    this.container.classList.remove('model-viewer');
  }
}
