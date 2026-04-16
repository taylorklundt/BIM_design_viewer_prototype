import type {
  ViewerAdapter,
  ViewOrientation,
  ObjectStreamingState,
  InteractionMode,
  GlobalSearchObjectEntry,
  ActionHistorySummary,
  ActionHistoryCategory,
  ViewData,
  ViewFolder,
  PropertyGroup,
} from './types';
import * as THREE from 'three';

/**
 * Shape of the ModelViewer instance we consume.
 * Defined locally so Chrome code never imports engine types directly.
 */
interface ModelViewerInstance {
  container?: HTMLElement;
  navigation: {
    zoom(delta: number): void;
    zoomToFit(): void;
    zoomToSelection(meshes: unknown[]): void;
    setMode(mode: 'orbit' | 'pan' | 'firstPerson' | 'fly'): void;
    setCamera(
      position: { x: number; y: number; z: number },
      target: { x: number; y: number; z: number },
    ): void;
    setOrthographic(enabled: boolean): void;
    getIsOrthographic(): boolean;
    setControlsEnabled?(enabled: boolean): void;
  };
  selection: {
    getSelected(): string[];
    getSelectedMeshes(): unknown[];
    selectByIds(ids: string[]): void;
    deselect(): void;
    setHoverEnabled?(enabled: boolean): void;
  };
  visibility: {
    showAll(): void;
    isolate(ids: string[]): void;
    hide(ids: string[]): void;
    getMeshByElementId(id: string): unknown | null;
    getHiddenElements(): string[];
    on(event: string, callback: (data: unknown) => void): void;
  };
  objectTree: {
    nodeMap: Map<string, {
      id: string;
      type: string;
      name: string;
      ifcType?: string;
      elementId?: string;
      children?: unknown[];
    }>;
    elementToNode: Map<string, string>;
    treeData: unknown[];
  } | null;
  sectioning: {
    addClipPlane(normal: THREE.Vector3, point: THREE.Vector3): void;
    clearClipPlanes(): void;
    setActiveTool(tool: 'section-plane' | 'section-box' | 'section-cut' | null): void;
    activateSectionBox(): void;
    clearSectionBox(): void;
    clearAll(): void;
    undo(): void;
    redo(): void;
    resetMode(): void;
    clearHistory(): void;
    on(event: string, callback: (data: unknown) => void): void;
    getClipPlanes(): Array<{ id: string }>;
  };
  treePanel: {
    toggle(): void;
  };
  searchSets: {
    getAll(): Array<{ id: string; name: string; createdAt: string }>;
    executeAndSelect(id: string): void;
    delete(id: string): void;
  };
  views: {
    createView(name?: string): ViewData;
    selectView(id: string): ViewData | null;
    deselectView(): void;
    deleteView(id: string): void;
    renameView(id: string, name: string): void;
    getViews(): ViewData[];
    getSelectedViewId(): string | null;
    getSelectedView(): ViewData | null;
    getView(id: string): ViewData | null;
    getMarkups(viewId: string): unknown[];
    setViewMarkups(viewId: string, markups: unknown[]): void;
    clearMarkups(viewId: string): void;
    createFolder(name: string, parentFolderId?: string | null): ViewFolder;
    deleteFolder(id: string): void;
    renameFolder(id: string, name: string): void;
    getFolders(): ViewFolder[];
    isCameraTransitioning?(): boolean;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
  };
  markup: {
    enable(): void;
    disable(): void;
    isActive: boolean;
    loadMarkups(markups: unknown[]): void;
    getMarkups(): unknown[];
    showReadOnly(markups: unknown[], fadeIn?: boolean): void;
    hideOverlay(): void;
    setTool(tool: string | null): void;
    setColor(color: string): void;
    color: string;
    undo(): void;
    redo(): void;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
  };
  xray: {
    enable(): void;
    disable(): void;
    toggle(): void;
    isEnabled: boolean;
  };
  resetView(): void;
  setInteractionMode(mode: InteractionMode): void;
  on(event: string, callback: (data: unknown) => void): ModelViewerInstance;
  off(event: string, callback: (data: unknown) => void): ModelViewerInstance;
}

const ORIENTATIONS: Record<
  ViewOrientation,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  top: { position: [0, 30, 0], target: [0, 0, 0] },
  bottom: { position: [0, -30, 0], target: [0, 0, 0] },
  front: { position: [0, 0, 30], target: [0, 0, 0] },
  back: { position: [0, 0, -30], target: [0, 0, 0] },
  left: { position: [-30, 0, 0], target: [0, 0, 0] },
  right: { position: [30, 0, 0], target: [0, 0, 0] },
  isometric: { position: [20, 20, 20], target: [0, 0, 0] },
};

export function createModelViewerAdapter(
  viewer: ModelViewerInstance,
): ViewerAdapter {
  const collectObjectList = (): GlobalSearchObjectEntry[] => {
    if (!viewer.objectTree) return [];
    const entries: GlobalSearchObjectEntry[] = [];
    for (const [, node] of viewer.objectTree.nodeMap) {
      const objectId = node.elementId ?? node.id;
      if (!objectId) continue;
      entries.push({
        id: node.id ?? objectId,
        name: node.name,
        ifcType: node.ifcType ?? '',
        expressID: objectId,
      });
    }
    return entries;
  };

  const streamingState: ObjectStreamingState = {
    streamingSupported: false,
    parserProgress: 0,
    totalObjects: 0,
    streamComplete: false,
    hasError: false,
  };
  const streamingListeners = new Set<(state: ObjectStreamingState) => void>();
  let sectioningActive = false;
  let activeSectionTool: 'section-plane' | 'section-box' | 'section-cut' | null = null;
  const sectioningStateListeners = new Set<(active: boolean) => void>();

  const emitSectioningState = () => {
    for (const listener of sectioningStateListeners) {
      listener(sectioningActive);
    }
  };

  const emitStreamingState = () => {
    const snapshot = { ...streamingState };
    for (const listener of streamingListeners) {
      listener(snapshot);
    }
  };

  const onStreamCapability = (data: unknown) => {
    const payload = data as { streamingSupported?: boolean };
    streamingState.streamingSupported = Boolean(payload?.streamingSupported);
    streamingState.streamComplete = false;
    streamingState.hasError = false;
    emitStreamingState();
  };

  const onObjectLoadProgress = (data: unknown) => {
    const payload = data as { parserProgress?: number; totalObjects?: number };
    if (typeof payload?.parserProgress === 'number') {
      streamingState.parserProgress = payload.parserProgress;
    }
    if (typeof payload?.totalObjects === 'number') {
      streamingState.totalObjects = payload.totalObjects;
    }
    emitStreamingState();
  };

  const onModelStreamComplete = () => {
    streamingState.parserProgress = 1;
    streamingState.streamComplete = true;
    emitStreamingState();
  };

  const onObjectLoadError = () => {
    streamingState.hasError = true;
    streamingState.streamComplete = true;
    emitStreamingState();
  };

  viewer.on('stream-capability', onStreamCapability);
  viewer.on('object-load-progress', onObjectLoadProgress);
  viewer.on('model-stream-complete', onModelStreamComplete);
  viewer.on('object-load-error', onObjectLoadError);
  // When a cut-edit icon is clicked (in or out of sectioning mode),
  // activate sectioning with section-cut tool.
  const requestEditCutListeners = new Set<() => void>();
  viewer.sectioning.on('request-edit-cut', () => {
    if (!sectioningActive) {
      sectioningActive = true;
      emitSectioningState();
    }
    activeSectionTool = 'section-cut';
    viewer.selection.setHoverEnabled?.(false);
    for (const listener of requestEditCutListeners) {
      listener();
    }
  });

  const requestEditPlaneListeners = new Set<() => void>();
  viewer.sectioning.on('request-edit-plane', () => {
    if (!sectioningActive) {
      sectioningActive = true;
      emitSectioningState();
    }
    activeSectionTool = 'section-plane';
    viewer.selection.setHoverEnabled?.(false);
    for (const listener of requestEditPlaneListeners) {
      listener();
    }
  });

  // ── Action History Tracking ───────────────────────────────────────
  const actionHistoryListeners = new Set<(s: ActionHistorySummary) => void>();
  let isolateCount = 0;

  // ── Markup mode state ───────────────────────────────────────────────
  let markupModeActive = false;
  let markupEditingViewId: string | null = null;
  let markupColor = '#FF0000';
  let readOnlyRevealToken = 0;
  const viewsListeners = new Set<(views: ViewData[], selectedId: string | null) => void>();

  const revealReadOnlyMarkupsAfterTransition = (viewId: string, markups: unknown[]) => {
    const token = ++readOnlyRevealToken;
    const tryReveal = () => {
      if (token !== readOnlyRevealToken) return;
      if (viewer.views.getSelectedViewId() !== viewId) return;
      if (viewer.views.isCameraTransitioning?.()) {
        requestAnimationFrame(tryReveal);
        return;
      }
      viewer.markup.showReadOnly(markups, true);
    };
    requestAnimationFrame(tryReveal);
  };

  const emitViews = () => {
    const views = viewer.views.getViews() as ViewData[];
    const sel = viewer.views.getSelectedViewId();
    for (const listener of viewsListeners) listener(views, sel);
  };

  viewer.views.on('views-changed', () => {
    emitViews();
    emitActionHistory();
  });

  viewer.markup.on('markups-changed', () => {
    emitActionHistory();
  });

  // If user manually navigates camera while a view is selected (and not in edit mode),
  // automatically deselect the view and hide associated markups.
  viewer.on('camera-change', () => {
    if (markupModeActive) return;
    if (viewer.views.isCameraTransitioning?.()) return;
    if (!viewer.views.getSelectedViewId()) return;

    readOnlyRevealToken++;
    viewer.views.deselectView();
    viewer.markup.hideOverlay();
    emitViews();
  });

  const buildActionSummary = (): ActionHistorySummary => {
    const selectedView = viewer.views.getSelectedView() as ViewData | null;
    return {
      sectioningCount: viewer.sectioning.getClipPlanes().length,
      hiddenObjectsCount: viewer.visibility.getHiddenElements().length,
      isolateCount,
      markupsCount: selectedView ? selectedView.markups.length : 0,
      measurementsCount: 0,
    };
  };

  const emitActionHistory = () => {
    const summary = buildActionSummary();
    for (const listener of actionHistoryListeners) {
      listener(summary);
    }
  };

  // React to sectioning changes
  viewer.sectioning.on('plane-add', () => emitActionHistory());
  viewer.sectioning.on('plane-remove', () => emitActionHistory());
  viewer.sectioning.on('planes-clear', () => emitActionHistory());
  viewer.sectioning.on('section-box-activate', () => emitActionHistory());

  // React to visibility changes
  viewer.visibility.on('visibility-change', () => emitActionHistory());

  const setViewerCursor = (iconUrl: string | null) => {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) return;

    if (!iconUrl) {
      root.classList.remove('mv-force-selected-cursor');
      body.style.removeProperty('--mv-selected-cursor');
      return;
    }

    body.style.setProperty('--mv-selected-cursor', `url("${iconUrl}") 10 10`);
    root.classList.add('mv-force-selected-cursor');
  };

  return {
    zoomIn() {
      viewer.navigation.zoom(1);
    },
    zoomOut() {
      viewer.navigation.zoom(-1);
    },
    fitToView() {
      viewer.navigation.zoomToFit();
    },
    resetView() {
      if (sectioningActive) {
        viewer.sectioning.resetMode();
        return;
      }
      viewer.resetView();
    },
    setViewOrientation(view: ViewOrientation) {
      const preset = ORIENTATIONS[view];
      viewer.navigation.setCamera(
        { x: preset.position[0], y: preset.position[1], z: preset.position[2] },
        { x: preset.target[0], y: preset.target[1], z: preset.target[2] },
      );
    },
    setInteractionMode(mode: InteractionMode) {
      viewer.setInteractionMode(mode);
      if (mode === 'fly') {
        viewer.navigation.setMode('fly');
      }
    },
    setCursorIcon(iconUrl: string | null) {
      setViewerCursor(iconUrl);
    },
    toggleModelBrowser() {
      viewer.treePanel.toggle();
    },
    toggleSectionTool() {
      sectioningActive = !sectioningActive;
      if (!sectioningActive) {
        activeSectionTool = null;
        viewer.sectioning.setActiveTool(null);
        viewer.selection.setHoverEnabled?.(true);
      }
      emitSectioningState();
    },
    setActiveSectioningTool(tool: 'section-plane' | 'section-box' | 'section-cut' | null) {
      activeSectionTool = tool;
      viewer.sectioning.setActiveTool(tool);

      // Disable Selection hover while surface-cut authoring gizmo is active to prevent
      // whole-object highlighting that competes with the surface disc marker.
      const disableHover = tool === 'section-cut' || tool === 'section-plane';
      viewer.selection.setHoverEnabled?.(!disableHover);

      if (!tool) return;

      if (tool === 'section-box') {
        viewer.sectioning.clearAll();
        viewer.sectioning.activateSectionBox();
      } else {
        viewer.sectioning.clearSectionBox();
      }
    },
    clearSectioningPlanes() {
      viewer.sectioning.clearAll();
    },
    isSectioningActive() {
      return sectioningActive;
    },
    setSectioningActive(active: boolean) {
      sectioningActive = active;
      if (active) {
        viewer.sectioning.clearHistory();
      }
      if (!sectioningActive) {
        activeSectionTool = null;
        viewer.sectioning.setActiveTool(null);
        viewer.selection.setHoverEnabled?.(true);
        viewer.sectioning.clearHistory();
      }
      emitSectioningState();
    },
    subscribeSectioningState(listener: (active: boolean) => void) {
      sectioningStateListeners.add(listener);
      listener(sectioningActive);
      return () => {
        sectioningStateListeners.delete(listener);
      };
    },
    subscribeRequestEditCut(listener: () => void) {
      requestEditCutListeners.add(listener);
      return () => {
        requestEditCutListeners.delete(listener);
      };
    },
    subscribeRequestEditPlane(listener: () => void) {
      requestEditPlaneListeners.add(listener);
      return () => {
        requestEditPlaneListeners.delete(listener);
      };
    },
    toggleIsolationMode() {
      const selected = viewer.selection.getSelected();
      if (selected.length > 0) {
        isolateCount = selected.length;
        viewer.visibility.isolate(selected);
      } else {
        isolateCount = 0;
        viewer.visibility.showAll();
      }
      emitActionHistory();
    },
    toggleSearchSetsPanel() {
      window.dispatchEvent(new CustomEvent('mv:toggle-search-sets'));
    },
    getSearchSets() {
      return viewer.searchSets.getAll();
    },
    executeSearchSet(id: string) {
      viewer.searchSets.executeAndSelect(id);
    },
    deleteSearchSet(id: string) {
      viewer.searchSets.delete(id);
    },
    getObjectStreamingState() {
      return { ...streamingState };
    },
    subscribeObjectStreamingState(listener: (state: ObjectStreamingState) => void) {
      streamingListeners.add(listener);
      listener({ ...streamingState });
      return () => {
        streamingListeners.delete(listener);
      };
    },
    togglePropertiesPanel() {
      console.log('[modelViewerAdapter] togglePropertiesPanel — not yet implemented');
    },
    toggleMeasureTool() {
      console.log('[modelViewerAdapter] toggleMeasureTool — not yet implemented');
    },
    getObjectList(): GlobalSearchObjectEntry[] {
      return collectObjectList();
    },
    subscribeObjectList(listener: (entries: GlobalSearchObjectEntry[]) => void) {
      const emit = () => listener(collectObjectList());
      const onProgress = () => emit();
      const onComplete = () => emit();
      viewer.on('object-load-progress', onProgress);
      viewer.on('model-stream-complete', onComplete);
      viewer.on('load-complete', onComplete);
      emit();
      return () => {
        viewer.off('object-load-progress', onProgress);
        viewer.off('model-stream-complete', onComplete);
        viewer.off('load-complete', onComplete);
      };
    },
    selectAndFocusObject(expressID: string) {
      viewer.selection.deselect();
      viewer.selection.selectByIds([expressID]);
      const mesh = viewer.visibility.getMeshByElementId(expressID);
      if (mesh) {
        viewer.navigation.zoomToSelection([mesh]);
      }
    },
    setSelectedObjects(objectIDs: string[]) {
      viewer.selection.deselect();
      if (objectIDs.length > 0) {
        viewer.selection.selectByIds(objectIDs);
      }
    },
    hideObjects(expressIDs: string[]) {
      if (expressIDs.length === 0) return;
      viewer.visibility.hide(expressIDs);
      viewer.selection.deselect(expressIDs);
      emitActionHistory();
    },
    subscribeSelectedObjects(listener: (expressIDs: string[]) => void) {
      const onSelectionChange = (data: unknown) => {
        const payload = data as { selected?: string[] };
        listener(Array.isArray(payload?.selected) ? payload.selected : []);
      };
      viewer.on('selection-change', onSelectionChange);
      listener(viewer.selection.getSelected());
      return () => {
        viewer.off('selection-change', onSelectionChange);
      };
    },
    getObjectProperties(expressID: string): PropertyGroup[] {
      const groups: PropertyGroup[] = [];

      // --- Resolve ObjectTree node via elementToNode map first, then direct key ---
      let node: { name: string; ifcType?: string; elementId?: string } | undefined;
      if (viewer.objectTree) {
        const nodeId = viewer.objectTree.elementToNode.get(expressID)
                    ?? viewer.objectTree.elementToNode.get(String(expressID));
        if (nodeId) {
          node = viewer.objectTree.nodeMap.get(nodeId);
        }
        if (!node) {
          node = viewer.objectTree.nodeMap.get(`element-${expressID}`);
        }
      }

      // --- Get the mesh for additional userData ---
      const mesh = viewer.visibility.getMeshByElementId(expressID) as
        | { userData?: Record<string, unknown>; name?: string; uuid?: string }
        | null;

      // --- Build Identity group from best available source ---
      const identityName = node?.name
        || (mesh?.userData?.name as string)
        || mesh?.name
        || '';
      const identityType = node?.ifcType
        || (mesh?.userData?.type as string)
        || (mesh?.userData?.ifcType as string)
        || '';

      if (identityName || identityType || expressID) {
        const idProps = [
          { name: 'Name', value: identityName || '(unnamed)' },
          { name: 'IFC Type', value: identityType || 'Unknown' },
          { name: 'Express ID', value: expressID },
        ];
        if (mesh?.uuid) {
          idProps.push({ name: 'UUID', value: mesh.uuid });
        }
        groups.push({ name: 'Identity', properties: idProps });
      }

      // --- Extract additional property groups from mesh userData ---
      if (mesh?.userData) {
        const ud = mesh.userData;
        const skip = new Set(['expressID', 'type', 'ifcType', 'name']);
        const misc: { name: string; value: string }[] = [];

        for (const [key, val] of Object.entries(ud)) {
          if (skip.has(key)) continue;
          if (val == null) continue;

          if (typeof val === 'object' && !Array.isArray(val)) {
            const nested = val as Record<string, unknown>;
            const props = Object.entries(nested)
              .filter(([, v]) => v != null)
              .map(([k, v]) => ({ name: k, value: String(v) }));
            if (props.length > 0) {
              groups.push({ name: key, properties: props });
            }
          } else {
            misc.push({ name: key, value: String(val) });
          }
        }

        if (misc.length > 0) {
          groups.push({ name: 'General', properties: misc });
        }
      }

      return groups;
    },
    toggleOrthographic() {
      const next = !viewer.navigation.getIsOrthographic();
      viewer.navigation.setOrthographic(next);
    },
    isOrthographic() {
      return viewer.navigation.getIsOrthographic();
    },
    toggleXRay() {
      viewer.xray.toggle();
    },
    isXRayActive() {
      return viewer.xray.isEnabled;
    },
    setHoverEffect(mode: 'gradient' | 'edgeTrace') {
      viewer.selection.setHoverEffectMode(mode);
    },
    getHoverEffect() {
      return viewer.selection.getHoverEffectMode() as 'gradient' | 'edgeTrace';
    },
    undo() {
      if (markupModeActive) {
        viewer.markup.undo();
        return;
      }
      if (sectioningActive) {
        viewer.sectioning.undo();
        return;
      }
    },
    redo() {
      if (markupModeActive) {
        viewer.markup.redo();
        return;
      }
      if (sectioningActive) {
        viewer.sectioning.redo();
        return;
      }
    },
    getActionHistory() {
      return buildActionSummary();
    },
    subscribeActionHistory(listener: (summary: ActionHistorySummary) => void) {
      actionHistoryListeners.add(listener);
      listener(buildActionSummary());
      return () => {
        actionHistoryListeners.delete(listener);
      };
    },
    clearActionCategory(category: ActionHistoryCategory) {
      switch (category) {
        case 'sectioning':
          viewer.sectioning.clearAll();
          break;
        case 'hidden':
          viewer.visibility.showAll();
          break;
        case 'isolate':
          isolateCount = 0;
          viewer.visibility.showAll();
          break;
        case 'markups': {
          const sv = viewer.views.getSelectedView();
          if (sv) {
            viewer.views.clearMarkups(sv.id);
            if (viewer.markup.isActive) {
              viewer.markup.loadMarkups([]);
            } else {
              viewer.markup.hideOverlay();
            }
          }
          break;
        }
        case 'measurements':
          break;
      }
      emitActionHistory();
    },
    clearAllActions() {
      viewer.sectioning.clearAll();
      isolateCount = 0;
      viewer.visibility.showAll();
      emitActionHistory();
    },
    commitActiveCut() {
      if (viewer.sectioning.cutState) {
        viewer.sectioning.commitCutAuthoring();
      }
    },

    // ── Views ─────────────────────────────────────────────────────────
    createView(name?: string) {
      return viewer.views.createView(name) as ViewData;
    },
    selectView(id: string) {
      // Switching views while editing should end markup mode first.
      if (markupModeActive) {
        if (markupEditingViewId) {
          const currentMarkups = JSON.parse(JSON.stringify(viewer.markup.getMarkups()));
          viewer.views.setViewMarkups(markupEditingViewId, currentMarkups);
        }
        viewer.markup.disable();
        viewer.navigation.setControlsEnabled?.(true);
        markupModeActive = false;
        markupEditingViewId = null;
      }

      readOnlyRevealToken++;
      const view = viewer.views.selectView(id);
      if (view && (view as ViewData).markups.length > 0) {
        viewer.markup.hideOverlay();
        revealReadOnlyMarkupsAfterTransition(id, (view as ViewData).markups);
      } else {
        viewer.markup.hideOverlay();
      }
    },
    deselectView() {
      readOnlyRevealToken++;
      viewer.views.deselectView();
      viewer.markup.hideOverlay();
    },
    deleteView(id: string) {
      if (markupEditingViewId === id) {
        viewer.markup.disable();
        viewer.navigation.setControlsEnabled?.(true);
        markupModeActive = false;
        markupEditingViewId = null;
      }
      viewer.views.deleteView(id);
      viewer.markup.hideOverlay();
    },
    renameView(id: string, name: string) {
      viewer.views.renameView(id, name);
    },
    getViews() {
      return viewer.views.getViews() as ViewData[];
    },
    getSelectedViewId() {
      return viewer.views.getSelectedViewId();
    },
    subscribeViews(listener: (views: ViewData[], selectedId: string | null) => void) {
      viewsListeners.add(listener);
      listener(viewer.views.getViews() as ViewData[], viewer.views.getSelectedViewId());
      return () => { viewsListeners.delete(listener); };
    },
    createFolder(name: string, parentId?: string | null) {
      return viewer.views.createFolder(name, parentId) as ViewFolder;
    },
    deleteFolder(id: string) {
      viewer.views.deleteFolder(id);
    },
    renameFolder(id: string, name: string) {
      viewer.views.renameFolder(id, name);
    },
    getFolders() {
      return viewer.views.getFolders() as ViewFolder[];
    },

    // ── Markup mode ───────────────────────────────────────────────────
    enterMarkupMode(viewId?: string) {
      // Auto-save current view's markups before switching
      if (markupModeActive && markupEditingViewId) {
        const currentMarkups = JSON.parse(JSON.stringify(viewer.markup.getMarkups()));
        viewer.views.setViewMarkups(markupEditingViewId, currentMarkups);
      }

      let view: ViewData;
      if (viewId) {
        const existing = viewer.views.getView(viewId) as ViewData | null;
        if (existing) {
          viewer.views.selectView(viewId);
          view = existing;
        } else {
          view = viewer.views.createView() as ViewData;
          viewer.views.selectView(view.id);
        }
      } else {
        view = viewer.views.createView() as ViewData;
        viewer.views.selectView(view.id);
      }
      markupModeActive = true;
      markupEditingViewId = view.id;
      viewer.markup.loadMarkups(view.markups);
      viewer.markup.enable();
      viewer.navigation.setControlsEnabled?.(false);
      emitViews();
      return view.id;
    },
    exitMarkupMode(save: boolean) {
      if (markupModeActive && markupEditingViewId) {
        if (save) {
          const markups = JSON.parse(JSON.stringify(viewer.markup.getMarkups()));
          viewer.views.setViewMarkups(markupEditingViewId, markups);
        }
        viewer.markup.disable();
        viewer.navigation.setControlsEnabled?.(true);
        const view = viewer.views.getView(markupEditingViewId) as ViewData | null;
        if (view && view.markups.length > 0) {
          viewer.markup.showReadOnly(view.markups);
        } else {
          viewer.markup.hideOverlay();
        }
      } else {
        viewer.markup.disable();
        viewer.navigation.setControlsEnabled?.(true);
      }
      markupModeActive = false;
      markupEditingViewId = null;
      emitViews();
      emitActionHistory();
    },
    isMarkupModeActive() {
      return markupModeActive;
    },
    setMarkupTool(tool: string | null) {
      viewer.markup.setTool(tool);
    },
    setMarkupColor(color: string) {
      markupColor = color;
      viewer.markup.setColor(color);
    },
    getMarkupColor() {
      return markupColor;
    },
  };
}
