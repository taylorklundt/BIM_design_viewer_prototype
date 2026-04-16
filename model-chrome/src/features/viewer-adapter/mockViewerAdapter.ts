import type { ViewerAdapter, ViewOrientation } from './types';

function log(action: string, payload?: unknown) {
  console.log(`[viewer-adapter] ${action}`, payload ?? '');
}

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
  toggleModelBrowser() {
    log('toggleModelBrowser');
  },
  togglePropertiesPanel() {
    log('togglePropertiesPanel');
  },
  toggleMeasureTool() {
    log('toggleMeasureTool');
  },
  toggleSectionTool() {
    log('toggleSectionTool');
  },
  toggleIsolationMode() {
    log('toggleIsolationMode');
  },
  undo() {
    log('undo');
  },
  redo() {
    log('redo');
  },
};