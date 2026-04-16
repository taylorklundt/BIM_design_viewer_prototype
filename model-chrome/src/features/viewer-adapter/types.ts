export type ViewOrientation =
  | 'top'
  | 'bottom'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'isometric';

export interface ViewerAdapter {
  zoomIn(): void;
  zoomOut(): void;
  fitToView(): void;
  resetView(): void;
  setViewOrientation(view: ViewOrientation): void;

  toggleModelBrowser?(): void;
  togglePropertiesPanel?(): void;
  toggleMeasureTool?(): void;
  toggleSectionTool?(): void;
  toggleIsolationMode?(): void;

  undo?(): void;
  redo?(): void;
}