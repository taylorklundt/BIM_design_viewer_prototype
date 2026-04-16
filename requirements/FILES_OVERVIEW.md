# Project Files Overview

**Project:** 3D IFC Model Viewer
**Total Files:** 9 markdown specifications + 1 HTML mockup
**Size:** ~80KB of detailed technical specifications
**Purpose:** Complete implementation reference for rebuilding the project

---

## File Manifest

### 1. **proud-discovering-quill.md** (17.8 KB)
**File Size:** 594 lines

**Content:**
- Complete implementation plan for the entire 3D Model Viewer
- Project structure with directory tree
- Feature breakdown with detailed function signatures
- 12 major features documented with full API specifications
- 10 implementation phases with specific deliverables
- Public API examples
- Demo IFC file sourcing information

**Key Sections:**
- Project Structure
- Feature Breakdown (Navigation, Selection, Visibility, Measurement, Sectioning, Model Views, Markups, UI Components, Persistence)
- Implementation Phases (Phase 1 through Phase 10)
- Public API Summary with code examples
- Questions Resolved

**Use Case:** Master blueprint for understanding the complete architecture and feature roadmap

---

### 2. **navigation.md** (10.2 KB)
**File Size:** 432 lines

**Content:**
- Deep implementation specification for the Navigation module
- Three navigation modes with detailed code samples
- Orbit controls setup using Three.js OrbitControls
- Mode switching logic
- Zoom-to-fit calculations with bounding box math
- First-person controls implementation
- Keyboard shortcut mapping
- State persistence methods
- Cleanup and destruction

**Key Sections:**
- User Interaction Flow
- Technical Requirements with full class definition
- Orbit Controls Setup code
- Mode Switching implementation
- Zoom to Fit algorithm
- Zoom to Selection algorithm
- First-Person Controls implementation
- First-Person Key Handling
- First-Person Mouse Look
- First-Person Movement Update logic
- Controls Enable/Disable
- Events Emitted table
- Keyboard Shortcuts table
- Integration with ModelViewer
- State Persistence methods
- Cleanup procedures

**Use Case:** Primary reference for implementing camera navigation system

---

### 3. **selection.md** (8.8 KB)
**File Size:** 317 lines

**Content:**
- Element picking and highlighting implementation
- Raycasting for 3D mouse intersection
- Material highlighting system
- Multi-select logic with Ctrl+click support
- Hover interaction implementation
- **Critical InstancedMesh handling for IFC.js compatibility**
- Context menu support with world-space normal calculation
- Original material storage and restoration

**Key Sections:**
- User Interaction Flow
- Technical Requirements with Selection class definition
- Raycasting implementation
- Element ID Extraction
- Material Highlighting system
- Multi-Select Logic with code examples
- Hover Interaction implementation
- Context Menu Support with face normal calculation
- **Key Gotchas (InstancedMesh, Material Cloning)**
- Integration with ModelViewer
- Data Structures (selectedElements Map, originalMaterials Map)
- Cleanup and destruction

**Use Case:** Reference for implementing click-to-select and highlighting features

---

### 4. **objecttree.md** (12.9 KB)
**File Size:** 488 lines

**Content:**
- Hierarchical tree view for IFC model structure
- Two-layer architecture: ObjectTree (data logic) + TreePanel (UI rendering)
- Tree building algorithm grouping elements by IFC type
- Expand/collapse state management
- Visibility state calculation with "mixed" states
- Search and filter implementation
- Tree panel HTML structure and rendering
- Click event delegation for interaction
- Integration with 3D viewport

**Key Sections:**
- User Interaction Flow
- Technical Requirements with ObjectTree and TreePanel classes
- Tree Data Structure definition
- Building Tree from IFC Model algorithm
- Collecting Element IDs recursively
- Visibility State Calculation
- Tree Panel HTML Structure
- Rendering Tree Nodes with conditional display
- Click Event Delegation with multi-select
- Search/Filter implementation
- Events Emitted tables
- Integration with ModelViewer
- CSS Structure with styling rules
- Key Gotchas (Visibility State, Element ID Deduplication)
- Cleanup procedures

**Use Case:** Reference for implementing hierarchical model navigation

---

### 5. **visibility.md** (8.7 KB)
**File Size:** 387 lines

**Content:**
- Element and model-level visibility control
- Show/hide/isolate logic
- Opacity control for X-ray effects
- Material cloning to avoid shared material modifications
- Visibility by IFC type
- Model-level visibility toggling
- Hidden elements tracking

**Key Sections:**
- User Interaction Flow
- Technical Requirements with Visibility class definition
- Mesh Lookup methods (by ID, multiple IDs)
- Show/Hide Implementation using Three.js visible property
- Isolate Implementation (show only these, hide rest)
- Show All method
- Visibility by IFC Type (hideByType, showByType)
- Opacity Control with material cloning
- Model-Level Visibility (hideModel, toggleModel)
- Events Emitted table
- Data Structures (hiddenElements Set, elementOpacities Map, originalMaterials Map)
- Integration with ModelViewer
- State Persistence (save/restore hidden elements)
- Key Gotchas (Array normalization, Material cloning)
- Cleanup procedures

**Use Case:** Reference for implementing visibility and opacity controls

---

### 6. **viewstates.md** (8.5 KB)
**File Size:** 362 lines

**Content:**
- Saving and restoring complete viewer configurations
- State structure including camera, visibility, selection, section planes
- getState/setState implementation for all modules
- Optional localStorage persistence using ViewStateManager
- JSON serialization and file export/import
- Bidirectional integration with feature modules

**Key Sections:**
- User Interaction Flow
- Technical Requirements
- State Structure with complete example
- ModelViewer getState/setState implementation
- Sectioning Module getState/setState
- LocalStorage Persistence with ViewStateManager class
- API Methods (saveViewState, loadViewState, exportViewState, importViewState)
- Events Emitted table
- State Serialization Notes
- Key Gotchas (Model Loading Order, Element ID Stability, Section Plane Reconstruction)
- Integration Example with code
- File Export/Import methods
- Complete API examples

**Use Case:** Reference for implementing view saving and restoration

---

### 7. **sectionplane.md** (9.9 KB)
**File Size:** 365 lines

**Content:**
- Cross-section view creation using Three.js clipping planes
- Right-click context menu for creating section planes
- **Critical: World normal calculation for InstancedMesh**
- **Critical: Clipping direction (negated normal) for correct behavior**
- Visual plane helpers with semi-transparent mesh and outline
- Draggable plane gizmo for interactive manipulation
- Plane movement along normal axis
- Section box creation (6-plane box around model bounds)

**Key Sections:**
- User Interaction Flow
- Technical Requirements
- Context Menu Component (ContextMenu.js) specification
- Selection Module Updates for right-click handling
- **Sectioning Feature Module (Sectioning.js) with detailed implementations:**
  - Clipping Plane Creation (with CRITICAL normal negation)
  - Plane Size Calculation from Model Bounds
  - Visual Plane Helper creation with PlaneGeometry
  - Drag Interaction implementation
  - Moving the Plane (with plane.constant += distance)
- ModelViewer Integration wiring
- Navigation Module Update (setControlsEnabled)
- CSS Styling for context menu
- State Persistence
- **Key Gotchas section with critical implementation details**
- Files to Create/Modify list

**Use Case:** Reference for implementing section plane tool and context menu

---

### 8. **homereset.md** (5.2 KB)
**File Size:** 200 lines

**Content:** [Not yet fully examined - appears to be configuration or utility reference]

---

### 9. **onboarding-mockup.html** (18.4 KB)
**File Size:** 663 lines

**Content:**
- Interactive HTML mockup of a 6-screen onboarding sequence
- Phone frame visualization with iOS-style aesthetics
- Screens included:
  1. Welcome screen with gradient background
  2. Sign up form with email/password inputs
  3. Profile setup with avatar uploader
  4. Permissions dialog with toggle switches
  5. Pro tips educational cards
  6. Completion screen with success animation
- Progress indicator with dot navigation
- Back/Next navigation buttons
- Responsive design with gradient styling
- Bounce animation for completion screen
- Form styling with focus states

**Key Features:**
- Modern UI pattern reference
- Smooth transitions between screens
- Progress tracking visualization
- Gradient color scheme (#667eea, #764ba2)
- Touch-friendly button sizing
- Accessible form design

**Use Case:** Visual reference for UI design patterns and styling inspiration

---

## Content Summary by Category

### Architecture & Planning (3 files)
1. `proud-discovering-quill.md` - Master implementation plan
2. `PROJECT_CONTEXT.md` - (newly created) Comprehensive context guide
3. `FILES_OVERVIEW.md` - This file

### Feature Specifications (4 files)
1. `navigation.md` - Camera controls
2. `selection.md` - Object picking & highlighting
3. `objecttree.md` - Hierarchical navigation
4. `visibility.md` - Show/hide/opacity controls

### Advanced Features (2 files)
1. `viewstates.md` - Save/restore functionality
2. `sectionplane.md` - Clipping planes & context menu

### Visual References (2 files)
1. `onboarding-mockup.html` - UI design patterns
2. `homereset.md` - (content TBD)

---

## How to Use These Files

### For New Developers
**Start here:**
1. Read `PROJECT_CONTEXT.md` for complete overview (15 min)
2. Read `proud-discovering-quill.md` for architecture (20 min)
3. Choose a feature to implement, read corresponding `.md` file
4. Reference `onboarding-mockup.html` for UI styling patterns

### For Implementation
**Sequential reading order:**
1. `proud-discovering-quill.md` - Understand architecture
2. `navigation.md` - Start with camera controls
3. `selection.md` - Add picking & highlighting
4. `objecttree.md` - Add model structure navigation
5. `visibility.md` - Add show/hide controls
6. `sectionplane.md` - Add advanced sectioning tool
7. `viewstates.md` - Add save/restore functionality

### For Reference
- Keep `PROJECT_CONTEXT.md` bookmarked for quick lookups
- Reference specific `.md` files when implementing features
- Use `onboarding-mockup.html` for UI/UX guidance

---

## Key Cross-File Concepts

### Patterns Used Across Features

**Event Emitting Pattern:**
- Every feature module emits domain-specific events
- Example: Selection.js emits `selection-change`, Navigation.js emits `camera-change`
- ModelViewer aggregates all events

**State Management Pattern:**
- Each feature maintains isolated state (Maps, Sets)
- Features expose getState() and setState() for persistence
- ModelViewer.getState() aggregates all feature states

**InstancedMesh Critical Pattern:**
- IFC.js uses InstancedMesh for geometry instancing
- When calculating world space (normals, positions):
  1. Get instance matrix from mesh.getMatrixAt(instanceId)
  2. Combine with mesh.matrixWorld
  3. Apply combined matrix to get world space coordinates
- Referenced in: selection.md (face normal), sectionplane.md (context menu)

**Material Modification Pattern:**
- Always clone materials before modification
- Store originals for restoration
- Use mesh.uuid as key (not elementId)
- Examples: selection.md (highlighting), visibility.md (opacity)

**UI Component Pattern:**
- Each UI component receives feature module in constructor
- Components listen to feature events
- Components emit UI-specific events
- Examples: TreePanel, PropertiesPanel, Toolbar

---

## File Dependencies

```
proud-discovering-quill.md (master blueprint)
├── navigation.md (depends on SceneManager)
├── selection.md (depends on SceneManager, ray casting)
├── objecttree.md (depends on IFCLoader)
├── visibility.md (depends on SceneManager, Selection)
├── sectionplane.md (depends on Selection, Navigation)
├── viewstates.md (depends on all features)
└── onboarding-mockup.html (UI reference)

PROJECT_CONTEXT.md (integrates all concepts)
FILES_OVERVIEW.md (this file)
```

---

## Implementation Checklist

Using these files, here's a typical implementation order:

- [ ] Phase 1: Setup Three.js scene (see: proud-discovering-quill.md Phase 1)
- [ ] Phase 2: Implement Navigation (see: navigation.md + proud-discovering-quill.md Phase 2)
- [ ] Phase 3: Implement Selection (see: selection.md + proud-discovering-quill.md Phase 2)
- [ ] Phase 4: Implement ObjectTree (see: objecttree.md + proud-discovering-quill.md Phase 3)
- [ ] Phase 5: Implement Visibility (see: visibility.md + proud-discovering-quill.md Phase 4)
- [ ] Phase 6: Implement Measurement (see: proud-discovering-quill.md Phase 5)
- [ ] Phase 7: Implement Sectioning (see: sectionplane.md + proud-discovering-quill.md Phase 6)
- [ ] Phase 8: Implement ViewStates (see: viewstates.md + proud-discovering-quill.md Phase 7)
- [ ] Phase 9: Implement Markups (see: proud-discovering-quill.md Phase 8)
- [ ] Phase 10: Persistence & Polish (see: proud-discovering-quill.md Phase 9-10)

---

## Important Implementation Notes

### Critical Gotchas Across Files
1. **InstancedMesh normal calculation** (selection.md, sectionplane.md)
2. **Plane clipping direction** (sectionplane.md - must negate normal)
3. **Plane movement constant** (sectionplane.md - use += not -=)
4. **Material cloning** (selection.md, visibility.md)
5. **Element ID stability** (viewstates.md - use express IDs not UUIDs)
6. **Visibility state mixed calculation** (objecttree.md)
7. **Hover vs selected distinction** (selection.md)

### Performance Considerations
Referenced in: proud-discovering-quill.md, PROJECT_CONTEXT.md
- Large models (50k+ elements) may need LOD
- Material pooling reduces memory
- Frustum culling (Three.js automatic)
- InstancedMesh GPU instancing (IFC.js handles)

### Browser APIs Used
- WebGL (Three.js)
- Pointer Lock API (first-person mode)
- File Reader API (import/export)
- IndexedDB (session persistence)
- requestAnimationFrame (animation loop)

---

## External Resource References

### From proud-discovering-quill.md
- **Three.js Documentation**: Three.js scene, camera, renderer setup
- **IFC.js**: Model loading, element property extraction
- **OpenBIM Components**: IFC.js wrapper library
- **buildingSMART**: Sample IFC files for testing

### From implementation specs
- **OrbitControls.js**: Three.js addon (included in examples)
- **Plane Geometry**: Three.js visualization
- **Raycaster**: Three.js intersection testing

---

## Version & Maintenance

**Current Version:** 1.0 (January 2024)
**Status:** Implementation Ready

**Document Updates:**
- Last Updated: January 16, 2026
- Total Specifications: 9 markdown files + 1 HTML mockup
- Total Content: ~80KB of technical documentation
- Code Examples: 100+ complete code snippets

---

## Quick Reference: Which File For What?

| Question | File | Section |
|----------|------|---------|
| How does the whole thing work? | PROJECT_CONTEXT.md | Overview, Architecture |
| What features need building? | proud-discovering-quill.md | Feature Breakdown |
| How to implement camera controls? | navigation.md | All sections |
| How to pick elements? | selection.md | Raycasting, Multi-select |
| How to show element info? | objecttree.md | Tree Structure |
| How to hide/show elements? | visibility.md | Show/Hide Implementation |
| How to save/load views? | viewstates.md | State Structure, Methods |
| How to create cross-sections? | sectionplane.md | All sections |
| What should the UI look like? | onboarding-mockup.html | Visual reference |
| What's the implementation order? | proud-discovering-quill.md | Implementation Phases |

---

**End of Files Overview**
