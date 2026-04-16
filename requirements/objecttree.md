# Object Tree Feature - Implementation Requirements

## Overview

Implement a hierarchical tree view for browsing IFC model elements in a Three.js-based 3D model viewer. The tree displays model structure grouped by element type, with expand/collapse, selection sync, visibility toggle, and search capabilities.

## User Interaction Flow

1. User clicks tree toggle button → panel opens/closes
2. User expands/collapses nodes → reveals/hides children
3. User clicks node → selects element(s) in 3D view
4. User Ctrl+clicks → adds to selection
5. User double-clicks → zooms to element
6. User clicks visibility icon → toggles element visibility
7. User types in search → filters tree to matching nodes
8. Selection in 3D view → highlights corresponding tree nodes

## Technical Requirements

### 1. ObjectTree Class (`src/features/ObjectTree.js`)

Data and logic layer:

```javascript
class ObjectTree {
  constructor(sceneManager, ifcLoader)

  // Tree building
  buildTree() → treeData
  getTree(modelId?) → node[]
  getNode(nodeId) → node
  getNodeByElementId(elementId) → node

  // Element queries
  getElementIdsByNode(nodeId) → elementId[]

  // Expand/Collapse
  expandNode(nodeId)
  collapseNode(nodeId)
  toggleNode(nodeId)
  isExpanded(nodeId) → boolean
  expandAll()
  collapseAll()

  // Selection
  selectNode(nodeId, addToSelection?) → elementId[]
  deselectNode(nodeId)
  clearSelection()
  isSelected(nodeId) → boolean
  getSelectedNodes() → nodeId[]
  selectNodesByElementIds(elementIds)  // Sync from 3D selection
  scrollToElement(elementId)

  // Visibility
  getVisibilityState(nodeId) → 'visible' | 'hidden' | 'mixed'
  toggleVisibility(nodeId)
  updateAllVisibilityStates()

  // Search
  filterTree(query) → matchingNodeIds
  clearFilter()

  // Events
  on('tree-built' | 'tree-node-select' | 'tree-visibility-toggle' | 'tree-filter' | ...)
}
```

### 2. TreePanel Class (`src/ui/TreePanel.js`)

UI rendering layer:

```javascript
class TreePanel {
  constructor(container, objectTree, options?)

  // Panel control
  open()
  close()
  toggle()
  refresh()

  // Rendering
  render()
  updateVisibility()

  // Events
  on('open' | 'close' | 'node-select' | 'visibility-toggle' | 'node-double-click')
}
```

### 3. Tree Data Structure

```javascript
// Node structure
{
  id: 'model-abc123',           // Unique node ID
  type: 'model' | 'type-group' | 'element',
  name: 'Model Name',           // Display name
  modelId: 'abc123',            // For model nodes
  ifcType: 'IfcWall',           // For type groups and elements
  elementId: 'elem-456',        // For element nodes
  children: [],                 // Child nodes
  elementIds: [],               // All element IDs under this node
  icon: 'wall',                 // Icon type
  parentId: 'parent-node-id'    // Parent reference
}
```

### 4. Building Tree from IFC Model

```javascript
buildTree() {
  this.treeData = [];
  this.nodeMap.clear();
  this.elementToNode.clear();

  const models = this.ifcLoader.getLoadedModels();

  models.forEach(modelInfo => {
    const modelNode = this.createModelNode(modelInfo);
    this.treeData.push(modelNode);
  });

  this.updateAllVisibilityStates();
  this.emit('tree-built', { tree: this.treeData });
  return this.treeData;
}

extractElementsFromModel(model, parentNode) {
  // Group by IFC type
  const typeGroups = new Map();

  model.traverse((object) => {
    if (object.isMesh) {
      const elementId = object.userData?.expressID || object.uuid;
      const ifcType = object.userData?.type || 'Unknown';
      const name = object.userData?.name || object.name || `Element ${elementId}`;

      if (!typeGroups.has(ifcType)) {
        typeGroups.set(ifcType, []);
      }
      typeGroups.get(ifcType).push({ elementId, name, ifcType });
    }
  });

  // Create type group nodes
  typeGroups.forEach((elements, ifcType) => {
    const typeNode = {
      id: `${parentNode.id}-${ifcType}`,
      type: 'type-group',
      name: `${this.formatIfcType(ifcType)} (${elements.length})`,
      ifcType,
      children: [],
      elementIds: [],
      parentId: parentNode.id
    };

    elements.forEach(elem => {
      const elementNode = {
        id: `element-${elem.elementId}`,
        type: 'element',
        name: elem.name,
        elementId: elem.elementId,
        elementIds: [elem.elementId],
        parentId: typeNode.id
      };

      this.nodeMap.set(elementNode.id, elementNode);
      this.elementToNode.set(elem.elementId, elementNode.id);
      typeNode.children.push(elementNode);
      typeNode.elementIds.push(elem.elementId);
    });

    this.nodeMap.set(typeNode.id, typeNode);
    parentNode.children.push(typeNode);
    parentNode.elementIds.push(...typeNode.elementIds);
  });
}
```

### 5. Collecting Element IDs Recursively

```javascript
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
  return [...new Set(ids)]; // Deduplicate
}
```

### 6. Visibility State Calculation

```javascript
getVisibilityState(nodeId) {
  return this.visibilityState.get(nodeId) || 'visible';
}

updateVisibilityState(nodeId) {
  const node = this.getNode(nodeId);
  if (!node) return 'visible';

  const elementIds = this.getElementIdsByNode(nodeId);
  if (elementIds.length === 0) return 'visible';

  let visibleCount = 0;
  let hiddenCount = 0;

  elementIds.forEach(elementId => {
    const mesh = this.getMeshByElementId(elementId);
    if (mesh) {
      if (mesh.visible) visibleCount++;
      else hiddenCount++;
    }
  });

  let state;
  if (hiddenCount === 0) state = 'visible';
  else if (visibleCount === 0) state = 'hidden';
  else state = 'mixed';

  this.visibilityState.set(nodeId, state);
  return state;
}
```

### 7. Tree Panel HTML Structure

```html
<div class="mv-panel mv-tree-panel mv-hidden">
  <div class="mv-panel-header">
    <span>Object Tree</span>
    <div class="mv-panel-header-actions">
      <button class="mv-tree-expand-all" title="Expand All">+</button>
      <button class="mv-tree-collapse-all" title="Collapse All">-</button>
      <button class="mv-panel-close" title="Close">×</button>
    </div>
  </div>
  <div class="mv-panel-content">
    <div class="mv-tree-search">
      <input type="text" placeholder="Search elements..." />
      <button class="mv-tree-search-clear mv-hidden">×</button>
    </div>
    <div class="mv-tree-container"></div>
  </div>
</div>
```

### 8. Rendering Tree Nodes

```javascript
renderNode(node, depth = 0) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = this.objectTree.isExpanded(node.id);
  const isSelected = this.objectTree.isSelected(node.id);
  const visibilityState = this.objectTree.getVisibilityState(node.id);

  // Skip if filtered out
  if (this.filteredNodes && !this.filteredNodes.has(node.id)) {
    return '';
  }

  return `
    <div class="mv-tree-node ${!isExpanded && hasChildren ? 'collapsed' : ''}">
      <div class="mv-tree-node-row ${isSelected ? 'selected' : ''}" data-node-id="${node.id}">
        <span class="mv-tree-toggle">
          ${hasChildren ? this.getToggleIcon() : '<span style="width:16px"></span>'}
        </span>
        <span class="mv-tree-icon">${this.getNodeIcon(node)}</span>
        <span class="mv-tree-label">${node.name}</span>
        <button class="mv-tree-visibility">${this.getVisibilityIcon(visibilityState)}</button>
      </div>
      ${hasChildren ? `
        <div class="mv-tree-children">
          ${this.renderNodes(node.children, depth + 1)}
        </div>
      ` : ''}
    </div>
  `;
}
```

### 9. Click Event Delegation

```javascript
this.treeContainer.addEventListener('click', (e) => {
  const row = e.target.closest('.mv-tree-node-row');
  if (!row) return;

  const nodeId = row.dataset.nodeId;

  if (e.target.closest('.mv-tree-toggle')) {
    // Expand/collapse
    this.objectTree.toggleNode(nodeId);
    this.render();
  } else if (e.target.closest('.mv-tree-visibility')) {
    // Toggle visibility
    const currentState = this.objectTree.getVisibilityState(nodeId);
    const elementIds = this.objectTree.getElementIdsByNode(nodeId);
    const shouldShow = currentState === 'hidden';

    this.emit('visibility-toggle', { nodeId, elementIds, visible: shouldShow });
  } else {
    // Select node
    const addToSelection = e.ctrlKey || e.metaKey;
    const elementIds = this.objectTree.selectNode(nodeId, addToSelection);
    this.emit('node-select', { nodeId, elementIds, addToSelection });
    this.render();
  }
});
```

### 10. Search/Filter

```javascript
filterTree(query) {
  if (!query || query.trim() === '') {
    this.clearFilter();
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matchingNodeIds = new Set();

  this.nodeMap.forEach((node, nodeId) => {
    if (node.name.toLowerCase().includes(lowerQuery)) {
      matchingNodeIds.add(nodeId);

      // Add all ancestors
      let currentNode = node;
      while (currentNode && currentNode.parentId) {
        matchingNodeIds.add(currentNode.parentId);
        this.expandNode(currentNode.parentId);
        currentNode = this.getNode(currentNode.parentId);
      }
    }
  });

  this.emit('tree-filter', { query, matchingNodeIds });
  return matchingNodeIds;
}
```

## Events Emitted

### ObjectTree Events
| Event | Data | When |
|-------|------|------|
| `tree-built` | `{ tree }` | Tree rebuilt |
| `tree-node-select` | `{ nodeId, node, elementIds, selected }` | Node selected |
| `tree-visibility-toggle` | `{ nodeId, elementIds, visible }` | Visibility toggled |
| `tree-filter` | `{ query, matchingNodeIds }` | Search performed |
| `tree-scroll-to` | `{ nodeId, elementId }` | Scroll to element |

### TreePanel Events
| Event | Data | When |
|-------|------|------|
| `open` | - | Panel opened |
| `close` | - | Panel closed |
| `node-select` | `{ nodeId, elementIds }` | Node clicked |
| `visibility-toggle` | `{ nodeId, elementIds, visible }` | Visibility icon clicked |
| `node-double-click` | `{ nodeId, elementIds }` | Node double-clicked |

## Integration with ModelViewer

```javascript
// Initialize
this.objectTree = new ObjectTree(this.sceneManager, this.ifcLoader);
this.treePanel = new TreePanel(this.container, this.objectTree);

// Sync selection from 3D to tree
this.selection.on('selection-change', (data) => {
  this.objectTree.selectNodesByElementIds(data.selected);
  this.treePanel.render();
});

// Sync selection from tree to 3D
this.treePanel.on('node-select', ({ elementIds, addToSelection }) => {
  if (!addToSelection) this.selection.deselect();
  this.selection.selectByIds(elementIds);
});

// Handle visibility toggle
this.treePanel.on('visibility-toggle', ({ elementIds, visible }) => {
  if (visible) {
    this.visibility.show(elementIds);
  } else {
    this.visibility.hide(elementIds);
  }
  this.treePanel.updateVisibility();
});

// Handle double-click zoom
this.treePanel.on('node-double-click', ({ elementIds }) => {
  const meshes = this.getMeshesByIds(elementIds);
  this.navigation.zoomToSelection(meshes);
});

// Toolbar button
handleToolbarAction('toggleTree') {
  this.treePanel.toggle();
}
```

## CSS Structure

```css
.mv-tree-panel {
  position: absolute;
  left: 0;
  top: 50px;
  width: 280px;
  height: calc(100% - 80px);
  background: #1e1e1e;
  border-right: 1px solid #3c3c3c;
}

.mv-tree-node.collapsed > .mv-tree-children {
  display: none;
}

.mv-tree-node.collapsed .mv-tree-toggle svg {
  transform: rotate(0deg);
}

.mv-tree-node-row {
  display: flex;
  align-items: center;
  padding: 4px;
  cursor: pointer;
}

.mv-tree-node-row.selected {
  background: rgba(0, 168, 255, 0.2);
}

.mv-tree-node-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.mv-tree-toggle svg {
  transform: rotate(90deg);
  transition: transform 0.2s;
}
```

## Key Gotchas

1. **Visibility State**: Must recalculate for parent nodes when child visibility changes (could be "mixed").

2. **Element ID Deduplication**: When collecting element IDs from tree, use Set to avoid duplicates.

3. **Filter + Ancestors**: When filtering, include all ancestor nodes so matches are visible.

4. **Selection Sync**: Bidirectional sync between 3D selection and tree selection.

5. **Build on Open**: Rebuild tree when panel opens to catch new models.

## Cleanup

```javascript
// ObjectTree
destroy() {
  this.treeData = [];
  this.nodeMap.clear();
  this.elementToNode.clear();
  this.expandedNodes.clear();
  this.selectedNodes.clear();
  this.visibilityState.clear();
  this.eventListeners.clear();
}

// TreePanel
destroy() {
  if (this.panel) this.panel.remove();
  this.eventListeners.clear();
}
```
