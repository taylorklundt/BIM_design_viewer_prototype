# 3D IFC Model Viewer - Complete Project Context Package

Welcome! This directory contains comprehensive documentation for the **3D IFC Model Viewer** project - a professional-grade BIM (Building Information Modeling) viewer built with Three.js and IFC.js.

## 📦 What's Included

This package contains **9 markdown specification files + 1 HTML mockup** totaling ~80KB of detailed technical documentation to help you understand and rebuild this application in any environment.

### Quick Start (5 minutes)

1. **Start here:** Read [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) for a complete overview
2. **Then:** Skim [`FILES_OVERVIEW.md`](FILES_OVERVIEW.md) to understand what each file contains
3. **Next:** Choose a feature from the list below to deep dive

### Core Documentation Files

```
📄 PROJECT_CONTEXT.md           ← START HERE (Complete overview)
📄 FILES_OVERVIEW.md             ← Navigation guide for all files
📄 proud-discovering-quill.md    ← Master implementation plan
│
├─ Feature Specifications:
│  ├─ navigation.md              ← Camera controls (orbit, pan, first-person)
│  ├─ selection.md              ← Object picking & visual highlighting
│  ├─ objecttree.md             ← Hierarchical model structure UI
│  └─ visibility.md             ← Show/hide/opacity controls
│
├─ Advanced Features:
│  ├─ viewstates.md             ← Save/restore view configurations
│  └─ sectionplane.md           ← Cross-section clipping planes
│
└─ Visual References:
   ├─ onboarding-mockup.html    ← UI design pattern examples
   └─ homereset.md              ← (Additional reference)
```

---

## 🎯 Project Overview

**3D IFC Model Viewer** is a reusable JavaScript component for viewing and analyzing 3D BIM (Building Information Models) files.

### Key Features
- ✅ Multi-model support (load multiple IFC files simultaneously)
- ✅ Rich navigation (Orbit, Pan, First-Person modes)
- ✅ Object selection and highlighting
- ✅ Hierarchical model tree navigation
- ✅ Show/hide/isolate elements with opacity control
- ✅ Distance and area measurement tools
- ✅ Cross-section views with clipping planes
- ✅ Saved view states for presentations
- ✅ 2D markups and 3D annotations
- ✅ Dark theme UI with professional styling
- ✅ Export/import state as JSON
- ✅ Auto-save to browser storage

### Technical Stack
- **Framework**: Three.js (3D graphics)
- **Format Support**: IFC.js (IFC file parsing)
- **Distribution**: Single JavaScript bundle
- **Storage**: IndexedDB + JSON export/import
- **UI**: Dark theme with responsive panels

---

## 🚀 Getting Started

### For Understanding the Architecture

**Read in this order (30 minutes total):**
1. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) - Overall architecture (10 min)
2. [`proud-discovering-quill.md`](proud-discovering-quill.md) - Feature breakdown (20 min)

### For Implementing Features

**Choose your feature and read the corresponding file:**
| Feature | Read | Time |
|---------|------|------|
| Camera controls | [`navigation.md`](navigation.md) | 15 min |
| Element selection | [`selection.md`](selection.md) | 15 min |
| Model hierarchy | [`objecttree.md`](objecttree.md) | 20 min |
| Visibility controls | [`visibility.md`](visibility.md) | 15 min |
| Cross-sections | [`sectionplane.md`](sectionplane.md) | 20 min |
| Save/restore states | [`viewstates.md`](viewstates.md) | 15 min |

### For UI/UX Reference

Check [`onboarding-mockup.html`](onboarding-mockup.html) for visual design patterns and modern UI styling examples.

---

## 📚 What Each File Contains

### 1. **PROJECT_CONTEXT.md** (Master Overview)
- Complete project architecture
- All 12 features described
- API reference
- Data flow diagrams
- Design patterns used
- Integration examples
- **Best for:** Getting a complete understanding

### 2. **FILES_OVERVIEW.md** (Navigation Guide)
- Summary of all 9 specification files
- File dependencies and relationships
- Implementation checklist
- Quick reference table
- **Best for:** Finding the right file for your question

### 3. **proud-discovering-quill.md** (Master Plan)
- Complete feature breakdown with function signatures
- 10 implementation phases
- Project structure
- Public API examples
- **Best for:** Seeing the complete feature set

### 4. **navigation.md** (Camera Controls)
- Orbit, Pan, First-Person modes
- Zoom-to-fit algorithms
- Mouse and keyboard interaction
- State persistence
- **Best for:** Implementing camera system

### 5. **selection.md** (Object Picking)
- Raycasting implementation
- Material highlighting
- Multi-select with Ctrl+click
- **CRITICAL**: InstancedMesh handling for IFC.js
- Context menu support
- **Best for:** Implementing 3D selection

### 6. **objecttree.md** (Model Hierarchy)
- Tree building algorithm
- Expand/collapse logic
- Visibility state calculation
- Search/filter implementation
- Tree panel UI rendering
- **Best for:** Implementing model structure navigation

### 7. **visibility.md** (Show/Hide/Isolate)
- Hide/show/toggle logic
- Isolate implementation
- Opacity/X-ray effects
- Material cloning (important!)
- Visibility by IFC type
- **Best for:** Implementing visibility controls

### 8. **viewstates.md** (Save/Restore)
- State structure and serialization
- getState/setState for all features
- localStorage persistence
- JSON export/import
- **Best for:** Implementing view state management

### 9. **sectionplane.md** (Cross-sections)
- Right-click context menu
- **CRITICAL**: World normal calculation for InstancedMesh
- **CRITICAL**: Clipping direction (negated normal)
- Plane visualization and dragging
- Section box creation
- **Best for:** Implementing clipping planes

### 10. **onboarding-mockup.html** (UI Reference)
- 6-screen onboarding flow
- Modern gradient design
- Form and toggle components
- Progress indicators
- Responsive layout
- **Best for:** UI/UX design patterns

---

## 🔑 Critical Implementation Concepts

### InstancedMesh Handling
**Files:** selection.md, sectionplane.md

IFC.js uses InstancedMesh for geometry. When calculating world-space data:
```javascript
// MUST combine mesh.matrixWorld with instance matrix
const instanceMatrix = new THREE.Matrix4();
mesh.getMatrixAt(instanceId, instanceMatrix);
const worldMatrix = new THREE.Matrix4()
  .multiplyMatrices(mesh.matrixWorld, instanceMatrix);
```

### Clipping Plane Direction
**File:** sectionplane.md

Three.js clips on the POSITIVE side of plane normal. To clip "behind" a face:
```javascript
// MUST negate the normal
const clipNormal = normal.clone().negate();
```

### Material Cloning
**Files:** selection.md, visibility.md

Always clone before modifying to avoid affecting shared materials:
```javascript
// WRONG: modifies shared material
mesh.material.opacity = 0.5;

// RIGHT: clone first
mesh.material = mesh.material.clone();
mesh.material.opacity = 0.5;
```

---

## 📊 Architecture Patterns

### Event-Driven Communication
```
Feature Modules emit domain events
    ↓
UI Components listen and respond
    ↓
ModelViewer aggregates and re-emits
    ↓
Application handles events
```

### State Management
```
Each Feature maintains isolated state
    ↓
Features expose getState() / setState()
    ↓
ModelViewer.getState() aggregates all
    ↓
Can save to localStorage or export JSON
```

### Component Layers
```
UI Layer (Toolbar, Panels, ContextMenu)
    ↓
Feature Layer (Navigation, Selection, Visibility, etc.)
    ↓
Core Layer (SceneManager, IFCLoader)
    ↓
Three.js / IFC.js
```

---

## 🛠️ Implementation Phases

From `proud-discovering-quill.md`:

| Phase | Task | Files |
|-------|------|-------|
| 1 | Three.js setup | navigation.md |
| 2 | Navigation & Selection | navigation.md, selection.md |
| 3 | Object Tree & Properties | objecttree.md |
| 4 | Visibility Controls | visibility.md |
| 5 | Measurement Tools | proud-discovering-quill.md Phase 5 |
| 6 | Sectioning | sectionplane.md |
| 7 | Model Views | viewstates.md |
| 8 | Markups & Annotations | proud-discovering-quill.md Phase 8 |
| 9 | Persistence | viewstates.md |
| 10 | Polish & Bundle | proud-discovering-quill.md Phase 10 |

---

## 💡 Quick Reference: How to Find What You Need

**I want to know...**

- "What features does this app have?" → `PROJECT_CONTEXT.md` Features section
- "How does navigation work?" → `navigation.md`
- "How do I pick objects?" → `selection.md`
- "What's the model hierarchy?" → `objecttree.md`
- "How to hide/show elements?" → `visibility.md`
- "How to save a view?" → `viewstates.md`
- "How to create cross-sections?" → `sectionplane.md`
- "What should the UI look like?" → `onboarding-mockup.html`
- "What files should I read?" → `FILES_OVERVIEW.md`
- "Complete overview?" → `PROJECT_CONTEXT.md`
- "Implementation order?" → `proud-discovering-quill.md` Implementation Phases

---

## 🔗 Key Concepts Across Files

### Material Modification
✅ Highlighted in: `selection.md`, `visibility.md`
- Always clone before modifying
- Use mesh.uuid as key (not elementId)
- Store originals for restoration

### Element IDs
✅ Highlighted in: `selection.md`, `viewstates.md`, `objecttree.md`
- IFC express IDs are stable (preferred)
- UUID-based IDs are unique but not persistent
- Use express IDs for view state persistence

### World Space Calculations
✅ Highlighted in: `selection.md`, `sectionplane.md`
- Must handle InstancedMesh correctly
- Combine mesh.matrixWorld with instance matrix
- Affects normal calculations, position transforms

### Event Architecture
✅ Highlighted in: Every feature file
- Features emit specific events
- UI listens and updates
- ModelViewer aggregates

---

## 📖 Reading Paths by Role

### For Architects / Technical Leads
1. PROJECT_CONTEXT.md (full overview)
2. proud-discovering-quill.md (feature roadmap)
3. FILES_OVERVIEW.md (team organization)

### For Frontend Developers
1. PROJECT_CONTEXT.md (10 min)
2. proud-discovering-quill.md (feature specs)
3. Feature files as needed
4. onboarding-mockup.html (UI patterns)

### For Full-Stack Developers
1. PROJECT_CONTEXT.md (architecture)
2. All feature files in order (navigation → selection → visibility)
3. viewstates.md (persistence)
4. proud-discovering-quill.md (build process)

### For UI/UX Designers
1. onboarding-mockup.html (visual reference)
2. PROJECT_CONTEXT.md (Dark Theme section)
3. UI Components sections in feature files

---

## 🎓 Learning Path (2-3 hours)

**Hour 1: Understanding**
- [ ] Read PROJECT_CONTEXT.md (20 min)
- [ ] Read FILES_OVERVIEW.md (15 min)
- [ ] Skim proud-discovering-quill.md (20 min)

**Hour 2: Features**
- [ ] Deep read navigation.md (15 min)
- [ ] Deep read selection.md (15 min)
- [ ] Deep read visibility.md (10 min)

**Hour 3: Advanced & Integration**
- [ ] Read sectionplane.md (20 min)
- [ ] Read viewstates.md (15 min)
- [ ] Review onboarding-mockup.html (5 min)

**Result:** Complete understanding of architecture and ready to implement

---

## 📋 Implementation Checklist

Use this with `proud-discovering-quill.md` implementation phases:

### Phase 1-2: Foundation
- [ ] Three.js scene, camera, renderer setup
- [ ] Orbit controls implementation
- [ ] First-person mode implementation
- [ ] Raycasting for selection
- [ ] Material highlighting system

### Phase 3-4: Navigation & Structure
- [ ] Object tree building algorithm
- [ ] Tree UI rendering and interaction
- [ ] Visibility tracking system
- [ ] Show/hide/isolate logic
- [ ] Tree panel integration

### Phase 5-7: Advanced Features
- [ ] Measurement tool implementation
- [ ] Clipping plane system
- [ ] Section plane UI and dragging
- [ ] View state save/restore
- [ ] Properties panel

### Phase 8-10: Polish
- [ ] Markup and annotation system
- [ ] Context menu
- [ ] Keyboard shortcuts
- [ ] Error handling
- [ ] Performance optimization
- [ ] Bundle and demo

---

## ❓ FAQ

**Q: Which file should I start with?**
A: Start with `PROJECT_CONTEXT.md` for a 15-minute overview, then `FILES_OVERVIEW.md` to find specific features.

**Q: I only care about one feature, which file do I read?**
A: Find your feature in the file listing above and read that `.md` file. Each is self-contained.

**Q: Are there code examples?**
A: Yes! Every feature file has 10-20 complete code examples. `PROJECT_CONTEXT.md` has API examples.

**Q: What's the most critical gotcha?**
A: **InstancedMesh handling** (selection.md, sectionplane.md). IFC.js uses InstancedMesh, so you must combine mesh.matrixWorld with instance matrix for world-space calculations.

**Q: Can I implement this without Three.js experience?**
A: You'll need basic Three.js knowledge. The files assume familiarity with:
- Scene, Camera, Renderer
- Mesh, Geometry, Material
- Vector3, Matrix4, Quaternion

**Q: How long will implementation take?**
A: 2-4 weeks for experienced developers, 1-2 months for learning as you go.

**Q: Can I use a different 3D library?**
A: Potentially, but Three.js is deeply integrated. You'd need to adapt significant portions.

---

## 🔗 External Resources

- **Three.js Docs**: https://threejs.org/docs/
- **IFC.js**: https://github.com/IFCjs/web-ifc
- **buildingSMART IFC Spec**: https://buildingsmart.org/standards/bim-standards/ifc/
- **Sample IFC Files**: https://github.com/IFCjs/test-ifc-files

---

## 📝 Document Information

- **Project**: 3D IFC Model Viewer
- **Total Files**: 9 markdown specifications + 1 HTML mockup + 3 index files
- **Total Content**: ~100KB of documentation
- **Code Examples**: 100+ complete snippets
- **Status**: Ready for implementation
- **Last Updated**: January 16, 2026
- **Version**: 1.0

---

## 🎯 Next Steps

1. **Understand**: Read `PROJECT_CONTEXT.md` (15 minutes)
2. **Plan**: Skim `proud-discovering-quill.md` implementation phases (15 minutes)
3. **Choose**: Pick your first feature to implement
4. **Deep Dive**: Read the corresponding `.md` file
5. **Implement**: Follow the code examples in that file
6. **Reference**: Come back to `PROJECT_CONTEXT.md` for integration questions

---

**Happy Building! 🏗️**

If you have questions about any feature, find it in the [Files Overview](FILES_OVERVIEW.md) and read the corresponding specification file.

