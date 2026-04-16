export interface SearchSet {
  id: string;
  name: string;
  createdAt: string;
}

export type InteractionMode = 'select' | 'orbit' | 'fly';

export type ViewOrientation =
  | 'top'
  | 'bottom'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'isometric';

export interface ObjectStreamingState {
  streamingSupported: boolean;
  parserProgress: number;
  totalObjects: number;
  streamComplete: boolean;
  hasError: boolean;
}

export interface GlobalSearchObjectEntry {
  id: string;
  name: string;
  ifcType: string;
  expressID: string;
}

export type ActionHistoryCategory =
  | 'sectioning'
  | 'hidden'
  | 'isolate'
  | 'markups'
  | 'measurements';

export interface ActionHistorySummary {
  sectioningCount: number;
  hiddenObjectsCount: number;
  isolateCount: number;
  markupsCount: number;
  measurementsCount: number;
}

// ── Object Properties ────────────────────────────────────────────────────────

export interface ObjectProperty {
  name: string;
  value: string;
}

export interface PropertyGroup {
  name: string;
  properties: ObjectProperty[];
}

// ── Views + Markup data types ────────────────────────────────────────────────

export interface MarkupData {
  id: string;
  type: 'text' | 'line' | 'shape' | 'freehand' | 'callout' | 'highlighter' | 'cloud';
  color: string;
  strokeWidth: number;
  opacity: number;
  points?: { x: number; y: number }[];
  rect?: { x: number; y: number; w: number; h: number };
  text?: string;
  fontSize?: number;
  position?: { x: number; y: number };
}

export interface ViewData {
  id: string;
  name: string;
  folderId: string | null;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  isOrthographic: boolean;
  markups: MarkupData[];
  createdAt: number;
  isProjectView: boolean;
}

export interface ViewFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
}

export interface ViewerAdapter {
  zoomIn(): void;
  zoomOut(): void;
  fitToView(): void;
  resetView(): void;
  setViewOrientation(view: ViewOrientation): void;
  setInteractionMode?(mode: InteractionMode): void;
  setCursorIcon?(iconUrl: string | null): void;

  toggleModelBrowser?(): void;
  togglePropertiesPanel?(): void;
  toggleMeasureTool?(): void;
  toggleSectionTool?(): void;
  setActiveSectioningTool?(
    tool: 'section-plane' | 'section-box' | 'section-cut' | null,
  ): void;
  clearSectioningPlanes?(): void;
  isSectioningActive?(): boolean;
  setSectioningActive?(active: boolean): void;
  subscribeSectioningState?(
    listener: (active: boolean) => void,
  ): () => void;
  subscribeRequestEditCut?(
    listener: () => void,
  ): () => void;
  subscribeRequestEditPlane?(
    listener: () => void,
  ): () => void;
  toggleIsolationMode?(): void;
  toggleSearchSetsPanel?(): void;
  getSearchSets?(): SearchSet[];
  executeSearchSet?(id: string): void;
  deleteSearchSet?(id: string): void;
  getObjectStreamingState?(): ObjectStreamingState;
  subscribeObjectStreamingState?(
    listener: (state: ObjectStreamingState) => void,
  ): () => void;
  getObjectList?(): GlobalSearchObjectEntry[];
  subscribeObjectList?(
    listener: (entries: GlobalSearchObjectEntry[]) => void,
  ): () => void;
  selectAndFocusObject?(expressID: string): void;
  setSelectedObjects?(objectIDs: string[]): void;
  hideObjects?(expressIDs: string[]): void;
  subscribeSelectedObjects?(
    listener: (expressIDs: string[]) => void,
  ): () => void;

  getObjectProperties?(expressID: string): PropertyGroup[];

  toggleOrthographic?(): void;
  isOrthographic?(): boolean;

  toggleXRay?(): void;
  isXRayActive?(): boolean;

  setHoverEffect?(mode: 'gradient' | 'edgeTrace'): void;
  getHoverEffect?(): 'gradient' | 'edgeTrace';

  undo?(): void;
  redo?(): void;

  getActionHistory?(): ActionHistorySummary;
  subscribeActionHistory?(
    listener: (summary: ActionHistorySummary) => void,
  ): () => void;
  clearActionCategory?(category: ActionHistoryCategory): void;
  clearAllActions?(): void;
  commitActiveCut?(): void;

  // ── Views ────────────────────────────────────────────────────────────────
  createView?(name?: string): ViewData;
  selectView?(id: string): void;
  deselectView?(): void;
  deleteView?(id: string): void;
  renameView?(id: string, name: string): void;
  getViews?(): ViewData[];
  getSelectedViewId?(): string | null;
  subscribeViews?(
    listener: (views: ViewData[], selectedId: string | null) => void,
  ): () => void;
  createFolder?(name: string, parentId?: string | null): ViewFolder;
  deleteFolder?(id: string): void;
  renameFolder?(id: string, name: string): void;
  getFolders?(): ViewFolder[];

  // ── Markup mode ──────────────────────────────────────────────────────────
  enterMarkupMode?(viewId?: string): string;
  exitMarkupMode?(save: boolean): void;
  isMarkupModeActive?(): boolean;
  setMarkupTool?(tool: string | null): void;
  setMarkupColor?(color: string): void;
  getMarkupColor?(): string;
}