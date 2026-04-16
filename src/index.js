// 3D Model Viewer - Main Entry Point
// A reusable, batteries-included 3D IFC Model Viewer

export { ModelViewer } from './core/ModelViewer.js';
export { SceneManager } from './core/SceneManager.js';
export { IFCLoader } from './core/IFCLoader.js';
export { Navigation } from './features/Navigation.js';
export { Selection } from './features/Selection.js';
export { Visibility } from './features/Visibility.js';
export { ObjectTree } from './features/ObjectTree.js';
export { Sectioning } from './features/Sectioning.js';
export { TreePanel } from './ui/TreePanel.js';
export { ContextMenu } from './ui/ContextMenu.js';
export { LeftSidebar } from './ui/LeftSidebar.js';
export { SearchSetsPanel } from './ui/SearchSetsPanel.js';

// Services
export { SearchSetStorage } from './services/SearchSetStorage.js';
export { SearchQueryEngine } from './services/SearchQueryEngine.js';

// Feature stubs
export { ViewsAndMarkups } from './features/ViewsAndMarkups.js';
export { AllItems } from './features/AllItems.js';
export { Properties } from './features/Properties.js';
export { ObjectGroups } from './features/ObjectGroups.js';
export { Deviation } from './features/Deviation.js';
export { SearchSets } from './features/SearchSets.js';
export { UndoRedo } from './features/UndoRedo.js';
export { MeasureTool } from './features/MeasureTool.js';
export { MarkupTool } from './features/MarkupTool.js';
export { QuickCreate } from './features/QuickCreate.js';
export { RenderModes } from './features/RenderModes.js';
export { OrthographicCamera } from './features/OrthographicCamera.js';

// UI
export { WIPModal } from './ui/WIPModal.js';

// Default export for simple usage
import { ModelViewer } from './core/ModelViewer.js';
export default ModelViewer;
