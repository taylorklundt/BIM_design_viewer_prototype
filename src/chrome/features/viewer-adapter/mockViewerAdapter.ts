import type { ViewerAdapter, ViewOrientation, PropertyGroup } from './types';

function log(action: string, payload?: unknown) {
  console.log(`[viewer-adapter] ${action}`, payload ?? '');
}

let sectioningActive = false;
const sectioningListeners = new Set<(active: boolean) => void>();

let orthographicActive = false;
const emitSectioning = () => {
  sectioningListeners.forEach((listener) => listener(sectioningActive));
};

export const mockViewerAdapter: ViewerAdapter = {
  zoomIn() {
    log('zoomIn');
  },
  zoomOut() {
    log('zoomOut');
  },
  fitToView() {
    log('fitToView');
  },
  resetView() {
    log('resetView');
  },
  setViewOrientation(view: ViewOrientation) {
    log('setViewOrientation', view);
  },
  setCursorIcon(iconUrl: string | null) {
    log('setCursorIcon', iconUrl);
  },
  toggleModelBrowser() {
    log('toggleModelBrowser');
  },
  toggleSearchSetsPanel() {
    log('toggleSearchSetsPanel');
  },
  getSearchSets() {
    log('getSearchSets');
    return [];
  },
  executeSearchSet(id: string) {
    log('executeSearchSet', id);
  },
  deleteSearchSet(id: string) {
    log('deleteSearchSet', id);
  },
  togglePropertiesPanel() {
    log('togglePropertiesPanel');
  },
  toggleMeasureTool() {
    log('toggleMeasureTool');
  },
  toggleSectionTool() {
    sectioningActive = !sectioningActive;
    log('toggleSectionTool', sectioningActive);
    emitSectioning();
  },
  setActiveSectioningTool(tool) {
    log('setActiveSectioningTool', tool);
  },
  clearSectioningPlanes() {
    log('clearSectioningPlanes');
  },
  isSectioningActive() {
    return sectioningActive;
  },
  setSectioningActive(active: boolean) {
    sectioningActive = active;
    log('setSectioningActive', active);
    emitSectioning();
  },
  subscribeSectioningState(listener) {
    sectioningListeners.add(listener);
    listener(sectioningActive);
    return () => {
      sectioningListeners.delete(listener);
      log('unsubscribeSectioningState');
    };
  },
  subscribeRequestEditCut(_listener) {
    log('subscribeRequestEditCut');
    return () => {
      log('unsubscribeRequestEditCut');
    };
  },
  subscribeRequestEditPlane(_listener) {
    log('subscribeRequestEditPlane');
    return () => {
      log('unsubscribeRequestEditPlane');
    };
  },
  toggleIsolationMode() {
    log('toggleIsolationMode');
  },
  getObjectList() {
    log('getObjectList');
    return [];
  },
  subscribeObjectList(listener) {
    listener([]);
    return () => {
      log('unsubscribeObjectList');
    };
  },
  selectAndFocusObject(expressID: string) {
    log('selectAndFocusObject', expressID);
  },
  setSelectedObjects(objectIDs: string[]) {
    log('setSelectedObjects', objectIDs);
  },
  hideObjects(expressIDs: string[]) {
    log('hideObjects', expressIDs);
  },
  subscribeSelectedObjects(listener) {
    listener([]);
    return () => {
      log('unsubscribeSelectedObjects');
    };
  },
  getObjectProperties(_expressID: string): PropertyGroup[] {
    log('getObjectProperties', _expressID);
    return [
      {
        name: 'Identity',
        properties: [
          { name: 'Name', value: 'Mock Wall' },
          { name: 'IFC Type', value: 'IfcWall' },
          { name: 'Express ID', value: _expressID },
        ],
      },
      {
        name: 'Dimensions',
        properties: [
          { name: 'Length', value: '3000 mm' },
          { name: 'Height', value: '2700 mm' },
          { name: 'Width', value: '200 mm' },
        ],
      },
      {
        name: 'Materials',
        properties: [
          { name: 'Material', value: 'Concrete' },
          { name: 'Finish', value: 'Painted' },
        ],
      },
    ];
  },
  toggleOrthographic() {
    orthographicActive = !orthographicActive;
    log('toggleOrthographic', orthographicActive);
  },
  isOrthographic() {
    return orthographicActive;
  },
  toggleXRay() {
    log('toggleXRay');
  },
  isXRayActive() {
    return false;
  },
  setHoverEffect(mode: 'gradient' | 'edgeTrace') {
    log('setHoverEffect', mode);
  },
  getHoverEffect() {
    return 'gradient' as const;
  },
  undo() {
    log('undo');
  },
  redo() {
    log('redo');
  },
  getActionHistory() {
    return {
      sectioningCount: 0,
      hiddenObjectsCount: 0,
      isolateCount: 0,
      markupsCount: 0,
      measurementsCount: 0,
    };
  },
  subscribeActionHistory(listener) {
    listener({
      sectioningCount: 0,
      hiddenObjectsCount: 0,
      isolateCount: 0,
      markupsCount: 0,
      measurementsCount: 0,
    });
    return () => {
      log('unsubscribeActionHistory');
    };
  },
  clearActionCategory(category) {
    log('clearActionCategory', category);
  },
  clearAllActions() {
    log('clearAllActions');
  },
  commitActiveCut() {
    log('commitActiveCut');
  },

  // ── Views ─────────────────────────────────────────────────────────
  createView(name?: string) {
    log('createView', name);
    return { id: 'mock-view-1', name: name || 'View 1', folderId: null, cameraPosition: { x: 0, y: 0, z: 0 }, cameraTarget: { x: 0, y: 0, z: 0 }, isOrthographic: false, markups: [], createdAt: Date.now(), isProjectView: false };
  },
  selectView(id: string) {
    log('selectView', id);
  },
  deselectView() {
    log('deselectView');
  },
  deleteView(id: string) {
    log('deleteView', id);
  },
  renameView(id: string, name: string) {
    log('renameView', { id, name });
  },
  getViews() {
    log('getViews');
    return [];
  },
  getSelectedViewId() {
    return null;
  },
  subscribeViews(listener) {
    listener([], null);
    return () => { log('unsubscribeViews'); };
  },
  createFolder(name: string, _parentId?: string | null) {
    log('createFolder', name);
    return { id: 'mock-folder-1', name, parentFolderId: null };
  },
  deleteFolder(id: string) {
    log('deleteFolder', id);
  },
  renameFolder(id: string, name: string) {
    log('renameFolder', { id, name });
  },
  getFolders() {
    return [];
  },

  // ── Markup mode ───────────────────────────────────────────────────
  enterMarkupMode(_viewId?: string) {
    log('enterMarkupMode');
    return 'mock-view-1';
  },
  exitMarkupMode(save: boolean) {
    log('exitMarkupMode', save);
  },
  isMarkupModeActive() {
    return false;
  },
  setMarkupTool(tool: string | null) {
    log('setMarkupTool', tool);
  },
  setMarkupColor(color: string) {
    log('setMarkupColor', color);
  },
  getMarkupColor() {
    return '#FF0000';
  },
};