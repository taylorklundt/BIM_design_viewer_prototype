/**
 * ObjectTree - Manages hierarchical tree structure of IFC models
 * Extracts spatial hierarchy and provides tree navigation/manipulation
 */

export class ObjectTree {
  constructor(sceneManager, ifcLoader) {
    this.sceneManager = sceneManager;
    this.ifcLoader = ifcLoader;
    this.scene = sceneManager.getScene();

    // Tree data structure
    this.treeData = [];
    this.nodeMap = new Map(); // nodeId -> node
    this.elementToNode = new Map(); // elementId -> nodeId

    // UI state
    this.expandedNodes = new Set();
    this.selectedNodes = new Set();
    this.visibilityState = new Map(); // nodeId -> 'visible' | 'hidden' | 'mixed'

    // Event listeners
    this.eventListeners = new Map();
  }

  /**
   * Build tree structure from loaded models
   */
  buildTree() {
    this.treeData = [];
    this.nodeMap.clear();
    this.elementToNode.clear();

    const models = this.ifcLoader.getLoadedModels();

    models.forEach(modelInfo => {
      const modelNode = this.createModelNode(modelInfo);
      this.treeData.push(modelNode);
    });

    // Initialize visibility states
    this.updateAllVisibilityStates();

    this.emit('tree-built', { tree: this.treeData });
    return this.treeData;
  }

  /**
   * Create a tree node for a model file
   */
  createModelNode(modelInfo) {
    const modelData = this.ifcLoader.getModel(modelInfo.id);
    const nodeId = `model-${modelInfo.id}`;

    const modelNode = {
      id: nodeId,
      type: 'model',
      name: modelInfo.name || 'Unnamed Model',
      modelId: modelInfo.id,
      children: [],
      elementIds: [],
      icon: 'file'
    };

    this.nodeMap.set(nodeId, modelNode);
    this.expandedNodes.add(nodeId); // Models start expanded

    // Extract elements from the model
    if (modelData && modelData.model) {
      this.extractElementsFromModel(modelData.model, modelNode);
    }

    return modelNode;
  }

  /**
   * Extract elements from a Three.js model object and build hierarchy
   */
  extractElementsFromModel(model, parentNode) {
    // Group elements by IFC type for a cleaner hierarchy
    const typeGroups = new Map();

    console.log('[ObjectTree] Extracting elements from model:', model);

    let meshCount = 0;
    model.traverse((object) => {
      if (object.isMesh && object.visible !== undefined) {
        meshCount++;
        const elementId = object.userData?.expressID || object.uuid;
        const ifcType = object.userData?.type || object.userData?.ifcType || 'Unknown';
        const name = object.userData?.name || object.name || `Element ${elementId}`;

        if (meshCount <= 3) {
          console.log('[ObjectTree] Sample mesh:', {
            elementId,
            ifcType,
            name,
            userData: object.userData,
            uuid: object.uuid
          });
        }

        if (!typeGroups.has(ifcType)) {
          typeGroups.set(ifcType, []);
        }

        typeGroups.get(ifcType).push({
          elementId,
          name,
          ifcType,
          mesh: object
        });
      }
    });

    console.log('[ObjectTree] Total meshes found:', meshCount);
    console.log('[ObjectTree] Type groups:', Array.from(typeGroups.keys()));

    // Create type group nodes
    typeGroups.forEach((elements, ifcType) => {
      const typeNodeId = `${parentNode.id}-${ifcType}`;
      const typeNode = {
        id: typeNodeId,
        type: 'type-group',
        name: this.formatIfcType(ifcType),
        ifcType: ifcType,
        children: [],
        elementIds: [],
        icon: this.getIconForType(ifcType),
        parentId: parentNode.id
      };

      this.nodeMap.set(typeNodeId, typeNode);

      // Add element nodes under the type group
      elements.forEach(elem => {
        const elementNodeId = `element-${elem.elementId}`;
        const elementNode = {
          id: elementNodeId,
          type: 'element',
          name: elem.name,
          ifcType: elem.ifcType,
          elementId: elem.elementId,
          children: [],
          elementIds: [elem.elementId],
          icon: this.getIconForType(elem.ifcType),
          parentId: typeNodeId
        };

        this.nodeMap.set(elementNodeId, elementNode);
        this.elementToNode.set(elem.elementId, elementNodeId);
        typeNode.children.push(elementNode);
        typeNode.elementIds.push(elem.elementId);
      });

      // Add count to type node name
      typeNode.name = `${typeNode.name} (${elements.length})`;
      parentNode.children.push(typeNode);
      parentNode.elementIds.push(...typeNode.elementIds);
    });
  }

  /**
   * Format IFC type name for display
   */
  formatIfcType(ifcType) {
    // Remove 'Ifc' prefix and add spaces before capitals
    let formatted = ifcType.replace(/^Ifc/, '');
    formatted = formatted.replace(/([A-Z])/g, ' $1').trim();
    return formatted;
  }

  /**
   * Get appropriate icon for IFC type
   */
  getIconForType(ifcType) {
    const iconMap = {
      'IfcWall': 'wall',
      'IfcWallStandardCase': 'wall',
      'IfcDoor': 'door',
      'IfcWindow': 'window',
      'IfcSlab': 'slab',
      'IfcRoof': 'roof',
      'IfcColumn': 'column',
      'IfcBeam': 'beam',
      'IfcStair': 'stair',
      'IfcRailing': 'railing',
      'IfcFurniture': 'furniture',
      'IfcBuildingStorey': 'floor',
      'IfcBuilding': 'building',
      'IfcSite': 'site',
      'IfcSpace': 'space',
      'IfcProject': 'project'
    };

    return iconMap[ifcType] || 'element';
  }

  /**
   * Get the full tree data
   */
  getTree(modelId) {
    if (modelId) {
      return this.treeData.find(node => node.modelId === modelId);
    }
    return this.treeData;
  }

  /**
   * Get a specific node by ID
   */
  getNode(nodeId) {
    return this.nodeMap.get(nodeId);
  }

  /**
   * Get node by element ID
   */
  getNodeByElementId(elementId) {
    const nodeId = this.elementToNode.get(elementId);
    return nodeId ? this.nodeMap.get(nodeId) : null;
  }

  /**
   * Get all element IDs under a node (recursively)
   */
  getElementIdsByNode(nodeId) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return [];
    return this.collectElementIds(node);
  }

  collectElementIds(node) {
    let ids = [...(node.elementIds || [])];
    if (node.children) {
      node.children.forEach(child => {
        ids = ids.concat(this.collectElementIds(child));
      });
    }
    return [...new Set(ids)];
  }

  // ============ Expand/Collapse ============

  expandNode(nodeId) {
    this.expandedNodes.add(nodeId);
    this.emit('tree-node-expand', { nodeId, node: this.getNode(nodeId) });
  }

  collapseNode(nodeId) {
    this.expandedNodes.delete(nodeId);
    this.emit('tree-node-collapse', { nodeId, node: this.getNode(nodeId) });
  }

  toggleNode(nodeId) {
    if (this.expandedNodes.has(nodeId)) {
      this.collapseNode(nodeId);
    } else {
      this.expandNode(nodeId);
    }
  }

  isExpanded(nodeId) {
    return this.expandedNodes.has(nodeId);
  }

  expandAll() {
    this.nodeMap.forEach((node, nodeId) => {
      if (node.children && node.children.length > 0) {
        this.expandedNodes.add(nodeId);
      }
    });
    this.emit('tree-expand-all');
  }

  collapseAll() {
    this.expandedNodes.clear();
    // Keep model nodes expanded
    this.treeData.forEach(modelNode => {
      this.expandedNodes.add(modelNode.id);
    });
    this.emit('tree-collapse-all');
  }

  // ============ Selection ============

  selectNode(nodeId, addToSelection = false) {
    if (!addToSelection) {
      this.selectedNodes.clear();
    }
    this.selectedNodes.add(nodeId);

    const node = this.getNode(nodeId);
    const elementIds = this.getElementIdsByNode(nodeId);

    this.emit('tree-node-select', {
      nodeId,
      node,
      elementIds,
      selected: Array.from(this.selectedNodes)
    });

    return elementIds;
  }

  deselectNode(nodeId) {
    this.selectedNodes.delete(nodeId);
    this.emit('tree-node-deselect', { nodeId });
  }

  clearSelection() {
    this.selectedNodes.clear();
    this.emit('tree-selection-clear');
  }

  isSelected(nodeId) {
    return this.selectedNodes.has(nodeId);
  }

  getSelectedNodes() {
    return Array.from(this.selectedNodes);
  }

  /**
   * Select nodes that contain the given element IDs (called when 3D selection changes)
   */
  selectNodesByElementIds(elementIds) {
    this.selectedNodes.clear();
    elementIds.forEach(elementId => {
      const nodeId = this.elementToNode.get(elementId);
      if (nodeId) {
        this.selectedNodes.add(nodeId);
      }
    });
    this.emit('tree-selection-sync', { selectedNodes: Array.from(this.selectedNodes) });
  }

  /**
   * Scroll tree to reveal element
   */
  scrollToElement(elementId) {
    const nodeId = this.elementToNode.get(elementId);
    if (!nodeId) return;

    // Expand all parent nodes
    let node = this.getNode(nodeId);
    while (node && node.parentId) {
      this.expandNode(node.parentId);
      node = this.getNode(node.parentId);
    }

    this.emit('tree-scroll-to', { nodeId, elementId });
  }

  // ============ Visibility ============

  /**
   * Update visibility state for a node based on its elements
   */
  updateVisibilityState(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return 'visible';

    const elementIds = this.getElementIdsByNode(nodeId);
    if (elementIds.length === 0) {
      this.visibilityState.set(nodeId, 'visible');
      return 'visible';
    }

    let visibleCount = 0;
    let hiddenCount = 0;

    elementIds.forEach(elementId => {
      const mesh = this.getMeshByElementId(elementId);
      if (mesh) {
        if (mesh.visible) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
      }
    });

    let state;
    if (hiddenCount === 0) {
      state = 'visible';
    } else if (visibleCount === 0) {
      state = 'hidden';
    } else {
      state = 'mixed';
    }

    this.visibilityState.set(nodeId, state);
    return state;
  }

  /**
   * Update visibility states for all nodes
   */
  updateAllVisibilityStates() {
    this.nodeMap.forEach((node, nodeId) => {
      this.updateVisibilityState(nodeId);
    });
  }

  /**
   * Get visibility state for a node
   */
  getVisibilityState(nodeId) {
    return this.visibilityState.get(nodeId) || 'visible';
  }

  /**
   * Toggle visibility for a node and all its elements
   */
  toggleVisibility(nodeId) {
    const currentState = this.getVisibilityState(nodeId);
    const elementIds = this.getElementIdsByNode(nodeId);

    // If visible or mixed, hide all. If hidden, show all.
    const shouldShow = currentState === 'hidden';

    this.emit('tree-visibility-toggle', {
      nodeId,
      elementIds,
      visible: shouldShow
    });

    // Update states after toggle
    this.updateNodeAndAncestorStates(nodeId);
  }

  /**
   * Update a node's state and propagate to ancestors
   */
  updateNodeAndAncestorStates(nodeId) {
    this.updateVisibilityState(nodeId);

    const node = this.getNode(nodeId);
    if (node && node.parentId) {
      this.updateNodeAndAncestorStates(node.parentId);
    }
  }

  /**
   * Helper to get mesh by element ID
   */
  getMeshByElementId(elementId) {
    let foundMesh = null;
    this.scene.traverse((object) => {
      if (object.isMesh) {
        const id = object.userData?.expressID || object.uuid;
        if (id === elementId) {
          foundMesh = object;
        }
      }
    });
    return foundMesh;
  }

  // ============ Search/Filter ============

  /**
   * Filter tree by search query
   */
  filterTree(query) {
    if (!query || query.trim() === '') {
      this.clearFilter();
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matchingNodeIds = new Set();

    // Find all matching nodes
    this.nodeMap.forEach((node, nodeId) => {
      if (node.name.toLowerCase().includes(lowerQuery)) {
        matchingNodeIds.add(nodeId);

        // Add all ancestors to ensure they're visible
        let currentNode = node;
        while (currentNode && currentNode.parentId) {
          matchingNodeIds.add(currentNode.parentId);
          this.expandNode(currentNode.parentId);
          currentNode = this.getNode(currentNode.parentId);
        }
      }
    });

    this.emit('tree-filter', { query, matchingNodeIds: Array.from(matchingNodeIds) });
    return matchingNodeIds;
  }

  clearFilter() {
    this.emit('tree-filter-clear');
  }

  // ============ Events ============

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

  // ============ Cleanup ============

  destroy() {
    this.treeData = [];
    this.nodeMap.clear();
    this.elementToNode.clear();
    this.expandedNodes.clear();
    this.selectedNodes.clear();
    this.visibilityState.clear();
    this.eventListeners.clear();
  }
}
