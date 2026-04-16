# 3D IFC Model Viewer - User Flow Diagrams

## 1. Main Application Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER LAUNCHES APP                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Initialize Viewer     │
                    │ - Create Three.js scene│
                    │ - Load UI components   │
                    │ - Setup event listeners│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Main Viewer Ready    │
                    │  (Empty viewport)      │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ Load Model   │  │ Load Session │  │ Show Help    │
        │   (IFC file) │  │ (From storage)│  │              │
        └──────┬───────┘  └──────┬───────┘  └──────────────┘
               │                 │
               └────────┬────────┘
                        │
             ┌──────────▼──────────┐
             │  Model Loaded &     │
             │  Ready to Interact  │
             └──────────┬──────────┘
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
   ┌────────┐       ┌────────┐       ┌────────┐
   │Navigate│       │Interact│       │Analyze │
   │ Model  │       │Elements │       │Model   │
   └────────┘       └────────┘       └────────┘
```

---

## 2. Navigation Flow

```
                    ┌─────────────────┐
                    │ NAVIGATION MODE │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ ORBIT MODE  │    │ PAN MODE    │    │FIRST-PERSON │
   │(Default)    │    │(Lateral)    │    │MODE(WASD)   │
   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
          │                  │                  │
    ┌─────┴──────┐     ┌─────┴──────┐     ┌─────┴──────┐
    │             │     │             │     │             │
    ▼ Mouse drag  ▼     ▼ Mouse drag  ▼     ▼ W/A/S/D    ▼ Mouse move
┌────────────┐┌───────┐┌────────────┐┌───────┐┌──────────┐┌──────────┐
│Rotate view ││ Zoom  ││Move camera ││ Zoom  ││Movement ││Look around│
│around point││in/out ││side to side││in/out ││forward  ││(Euler)   │
└────────┬───┘└───┬───┘└────────┬───┘└───┬───┘└────┬─────┘└────┬─────┘
         │        │            │        │         │           │
         └────────┼────────────┴────────┴─────────┴───────────┘
                  │
         ┌────────▼────────┐
         │ Update Camera   │
         │  Position &     │
         │  Orientation    │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │ Emit Camera     │
         │ Change Event    │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │ UI Updates      │
         │ (View synced)   │
         └─────────────────┘
```

---

## 3. Selection & Interaction Flow

```
                    ┌──────────────────┐
                    │ USER INTERACTION │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │LEFT-CLICK   │    │RIGHT-CLICK  │    │HOVER        │
   │ON ELEMENT   │    │ON ELEMENT   │    │OVER ELEMENT │
   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
          │                  │                  │
          ▼                  ▼                  ▼
     ┌─────────┐      ┌──────────────┐    ┌──────────┐
     │ Raycast │      │ Raycast &    │    │ Raycast  │
     │ to find │      │ Extract face │    │ to find  │
     │ element │      │ normal       │    │ element  │
     └────┬────┘      └──────┬───────┘    └────┬─────┘
          │                  │                 │
     ┌────▼────┐      ┌──────▼───────┐    ┌────▼─────┐
     │Is Ctrl  │      │ Show Context │    │Apply     │
     │pressed? │      │ Menu w/ face │    │Hover     │
     └────┬────┘      │ options      │    │Material  │
          │           └──────┬───────┘    └────┬─────┘
    ┌─────┴─────┐             │                │
    │YES  │  NO │             │                │
    ▼     │    ▼             ▼                ▼
┌──────┐  │ ┌────────┐  ┌─────────┐   ┌────────────┐
│Toggle│  │ │ Clear  │  │ Menu    │   │Emit hover  │
│Select│  │ │ Old &  │  │ Actions:│   │event       │
│      │  │ │ Select │  │- Create │   └─────┬──────┘
└──┬───┘  │ │ New    │  │  Section│         │
   │      │ └───┬────┘  │- Isolate│    ┌────▼──────────┐
   │      │     │       │- Hide   │    │Update UI      │
   │      │     │       │- Zoom to│    │- Highlight   │
   └──────┼─────┼───────┼─────────┘    │- Show in tree │
          │     │       │              └───────────────┘
          └─────┴───────┴─────┬────────────────────┐
                              │                    │
                    ┌─────────▼──────────┐        │
                    │ Emit Selection     │        │
                    │ Change Event       │        │
                    └─────────┬──────────┘        │
                              │                   │
                    ┌─────────▼──────────┐        │
                    │ Update Properties  │◄───────┘
                    │ Panel with Element │
                    │ Info               │
                    └────────────────────┘
```

---

## 4. Visibility Control Flow

```
              ┌──────────────────────┐
              │ VISIBILITY ACTION    │
              └──────────┬───────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
     ▼                   ▼                   ▼
  ┌──────────┐    ┌──────────────┐    ┌──────────────┐
  │ SHOW     │    │ HIDE         │    │ ISOLATE      │
  │Selected  │    │ Selected     │    │ Selected     │
  │Elements  │    │ Elements     │    │ (hide rest)  │
  └────┬─────┘    └────┬─────────┘    └────┬─────────┘
       │               │                    │
       ▼               ▼                    ▼
  ┌──────────┐    ┌──────────────┐    ┌──────────────┐
  │Find      │    │Find          │    │Find All      │
  │meshes by │    │meshes by     │    │meshes        │
  │element ID│    │element ID    │    │              │
  └────┬─────┘    └────┬─────────┘    └────┬─────────┘
       │               │                    │
       ▼               ▼                    ▼
  ┌──────────┐    ┌──────────────┐    ┌──────────────┐
  │Set mesh. │    │Set mesh.     │    │If elem in    │
  │visible = │    │visible =     │    │selection:    │
  │true      │    │false         │    │visible=true  │
  │Track:    │    │Track:        │    │Else:         │
  │Remove    │    │Add in        │    │visible=false │
  │from      │    │hiddenSet     │    │              │
  │hidden    │    │              │    │Track both    │
  │set       │    │              │    │              │
  └────┬─────┘    └────┬─────────┘    └────┬─────────┘
       │               │                    │
       │               │                    │
       └───────────────┼────────────────────┘
                       │
            ┌──────────▼───────────┐
            │ Emit Visibility      │
            │ Change Event         │
            └──────────┬───────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
  ┌────────┐     ┌────────────┐  ┌──────────┐
  │Update  │     │Update      │  │Update    │
  │Tree    │     │Properties  │  │Status    │
  │Visibility    │Panel       │  │Bar       │
  │Icons   │     │            │  │          │
  └────────┘     └────────────┘  └──────────┘
```

---

## 5. Measurement Flow

```
              ┌──────────────────────┐
              │ START MEASUREMENT    │
              │ (User clicks tool)   │
              └──────────┬───────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   ┌──────────────┐            ┌──────────────────┐
   │DISTANCE TOOL │            │ AREA TOOL        │
   └──────┬───────┘            └──────┬───────────┘
          │                           │
          ▼                           ▼
     ┌─────────────────┐      ┌────────────────────┐
     │Click point 1    │      │Click points to     │
     │on model         │      │form polygon        │
     └─────┬───────────┘      └──────┬─────────────┘
           │                         │
     ┌─────▼───────────┐      ┌──────▼─────────────┐
     │Store point 1    │      │Store each point    │
     │in world space   │      │in world space      │
     └─────┬───────────┘      └──────┬─────────────┘
           │                         │
     ┌─────▼───────────┐      ┌──────▼─────────────┐
     │Click point 2    │      │Click until         │
     │on model         │      │polygon complete    │
     └─────┬───────────┘      └──────┬─────────────┘
           │                         │
     ┌─────▼───────────────────────┐ │
     │ Calculate distance between  │ │
     │ point 1 & 2 (3D)            │ │
     └─────┬─────────────────────┬─┘ │
           │                     │   │
           │          ┌──────────▼───┘
           │          │
           ▼          ▼
      ┌─────────┐ ┌─────────────────┐
      │Snap to  │ │Calculate area   │
      │geometry?│ │of polygon       │
      └────┬────┘ └────┬────────────┘
           │           │
           │           ▼
           │      ┌─────────────────┐
           │      │Convert to unit  │
           │      │(mm/cm/m/ft/in)  │
           │      └────┬────────────┘
           │           │
           └──────┬────┘
                  │
        ┌─────────▼──────────┐
        │ Create 3D label    │
        │ in scene           │
        │ (Display distance) │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │ Store measurement  │
        │ object & ID        │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │ Show delete option │
        │ for measurement    │
        └────────────────────┘
```

---

## 6. Section Plane (Clipping) Flow

```
                    ┌───────────────────┐
                    │ RIGHT-CLICK       │
                    │ ON ELEMENT FACE   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Raycast & get     │
                    │ - Element ID      │
                    │ - Intersection    │
                    │ - Face normal     │
                    │ - Face vertices   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────────────┐
                    │ Calculate world normal    │
                    │ for InstancedMesh:        │
                    │ (Handle instance matrix)  │
                    └─────────┬─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Show Context Menu  │
                    │ with options       │
                    └─────────┬──────────┘
                              │
                ┌─────────────┴──────────────┐
                │                           │
                ▼                           ▼
        ┌──────────────────┐       ┌────────────────────┐
        │Create Section    │       │ Other Actions      │
        │Plane (selected)  │       │ (Isolate, Hide...)  │
        └────────┬─────────┘       └────────────────────┘
                 │
        ┌────────▼────────┐
        │ IMPORTANT:      │
        │ Negate normal   │
        │ for correct     │
        │ clipping dir    │
        └────────┬────────┘
                 │
        ┌────────▼─────────────┐
        │ Create THREE.Plane   │
        │ (negated normal,     │
        │  intersection point) │
        └────────┬─────────────┘
                 │
        ┌────────▼──────────────┐
        │ Add to renderer       │
        │ clippingPlanes array  │
        └────────┬──────────────┘
                 │
        ┌────────▼────────────────┐
        │ Create visual helper:   │
        │ - Semi-transparent mesh │
        │ - Border outline        │
        │ - Direction arrow       │
        └────────┬────────────────┘
                 │
        ┌────────▼──────────────┐
        │ Enable plane dragging │
        │ (mouse interaction)   │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │ Disable orbit control │
        │ during drag           │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────┐
        │ Move plane along  │
        │ its normal axis   │
        │ (plane.constant)  │
        └────────┬──────────┘
                 │
        ┌────────▼────────────────┐
        │ Emit plane-move event   │
        │ Geometry clips in real- │
        │ time                    │
        └────────────────────────┘
```

---

## 7. Save/Restore View State Flow

```
                    ┌─────────────────────┐
                    │ USER CLICKS         │
                    │ SAVE VIEW           │
                    └────────┬────────────┘
                             │
                    ┌────────▼──────────┐
                    │ Prompt for        │
                    │ view name         │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │ Collect ALL state from:       │
                    │ - Camera (pos, target)        │
                    │ - Selection (element IDs)     │
                    │ - Hidden elements (Set)       │
                    │ - Section planes (data)       │
                    │ - Navigation mode             │
                    │ - Opacity states              │
                    │ - Loaded models (list)        │
                    └────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────┐
                    │ Create state object:      │
                    │ {                         │
                    │   id, name, timestamp,    │
                    │   camera, hiddenElements, │
                    │   ... all properties      │
                    │ }                         │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼──────────────┐
                    │ Store in:             │
                    │ - IndexedDB (auto)    │
                    │ - Memory (current)    │
                    └────────┬──────────────┘
                             │
                    ┌────────▼────────────┐
                    │ Show "View Saved"   │
                    │ confirmation        │
                    └─────────────────────┘

                         --- LATER ---

                    ┌─────────────────────┐
                    │ USER SELECTS        │
                    │ SAVED VIEW          │
                    │ FROM LIST           │
                    └────────┬────────────┘
                             │
                    ┌────────▼──────────────┐
                    │ Retrieve state from  │
                    │ storage/memory       │
                    └────────┬──────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │Restore camera│  │Restore       │  │Restore       │
    │position &    │  │visibility    │  │selection &   │
    │target        │  │(show/hide)   │  │navigation    │
    │              │  │              │  │mode          │
    └────────┬─────┘  └────────┬─────┘  └────────┬─────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Restore section     │
                    │ planes (if any)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ UI updates reflect  │
                    │ restored state      │
                    │ (tree, props panel) │
                    └─────────────────────┘
```

---

## 8. Model Loading & Object Tree Flow

```
                    ┌──────────────────┐
                    │ USER LOADS IFC    │
                    │ FILE              │
                    └────────┬─────────┘
                             │
                    ┌────────▼──────────────────┐
                    │ IFC.js parses file &      │
                    │ creates Three.js objects  │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼────────────────────┐
                    │ Extract from loaded model:  │
                    │ - All mesh objects          │
                    │ - Element IDs (expressID)   │
                    │ - IFC types (IfcWall, etc.) │
                    │ - Element names             │
                    │ - Hierarchy info            │
                    └────────┬────────────────────┘
                             │
                    ┌────────▼───────────────────┐
                    │ Group elements by IFC type │
                    │ Create type groups         │
                    │ (IfcWall, IfcDoor, etc.)   │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │ Build tree structure:        │
                    │ Model                        │
                    │ ├── IfcSite                  │
                    │ │   └── IfcBuilding          │
                    │ │       ├── IfcBuildingStorey│
                    │ │       │   ├── IfcWall      │
                    │ │       │   ├── IfcDoor      │
                    │ │       │   └── ...          │
                    │ │       └── ...              │
                    │ └── ...                      │
                    └────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────┐
                    │ Create NodeMap for        │
                    │ fast lookups by nodeId    │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼──────────────────┐
                    │ Render tree panel UI      │
                    │ with collapse/expand      │
                    │ state & visibility icons  │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼──────────────────┐
                    │ User can now:             │
                    │ - Expand/collapse nodes   │
                    │ - Click to select         │
                    │ - Toggle visibility       │
                    │ - Search/filter           │
                    │ - See properties          │
                    └──────────────────────────┘
```

---

## 9. Element Properties Panel Flow

```
                    ┌────────────────────┐
                    │ ELEMENT SELECTED   │
                    │ (In 3D viewport)   │
                    └────────┬───────────┘
                             │
                    ┌────────▼─────────────────┐
                    │ Selection module emits   │
                    │ selection-change event   │
                    │ with elementIds          │
                    └────────┬─────────────────┘
                             │
                    ┌────────▼──────────────────┐
                    │ Properties panel listens │
                    │ and queries IFC.js for:  │
                    │ - Element name           │
                    │ - IFC type (IfcWall, etc)│
                    │ - GlobalId               │
                    │ - Property sets          │
                    │ - Quantities             │
                    │ - Custom properties      │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │ Format properties into  │
                    │ sections:               │
                    │ - Header (name, type)   │
                    │ - Property Sets         │
                    │ - Quantities            │
                    │ - Metadata (GlobalId)   │
                    └────────┬────────────────┘
                             │
                    ┌────────▼──────────────┐
                    │ Render in Properties  │
                    │ Panel (accordions for │
                    │ each section)         │
                    └────────┬──────────────┘
                             │
                    ┌────────▼──────────────┐
                    │ User can:             │
                    │ - View element info   │
                    │ - Expand/collapse     │
                    │  property sets        │
                    │ - Copy values         │
                    │ - Click "Highlight    │
                    │  in model" to zoom    │
                    └──────────────────────┘
```

---

## 10. Global Application State Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           ModelViewer State                                  │
│                                                                              │
│  ┌─────────────────────┬──────────────────┬──────────────────┬────────────┐  │
│  │  Navigation State   │ Selection State  │ Visibility State │ View State │  │
│  │                    │                  │                  │            │  │
│  │ - camera.pos       │ - selectedIds    │ - hiddenSet      │ - views[]  │  │
│  │ - camera.target    │ - selectedMeshes │ - opacityMap     │ - current  │  │
│  │ - mode             │ - hoverElement   │ - visibilityMap  │ - name     │  │
│  └────────┬───────────┴────────┬─────────┴────────┬─────────┴────────┬───┘  │
│           │                    │                  │                  │       │
│           │                    │                  │                  │       │
│  ┌────────▼────────┐  ┌────────▼─────────┐  ┌────▼─────────┐  ┌────▼──────┐ │
│  │Tree State       │  │Measurement State │  │Section State │  │Markup     │  │
│  │                │  │                  │  │              │  │State      │  │
│  │- expandedNodes  │  │- measurements[]  │  │- planes[]    │  │- markups[]│  │
│  │- selectedNodes  │  │- unit            │  │- helpers     │  │- annots[] │  │
│  │- filteredNodes  │  │- snapEnabled     │  │- enabled     │  │           │  │
│  └─────────────────┘  └──────────────────┘  └──────────────┘  └───────────┘  │
│                                                                              │
│                           All states accessible via:                        │
│                         viewer.getState() → {all state}                     │
│                         viewer.setState(state) ← {restore}                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Complete Feature Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                                 │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ Toolbar │ │Tree Panel│ │Properties│ │Views Panel│ │ContextMenu       │  │
│  │         │ │          │ │Panel     │ │           │ │(RightClick)      │  │
│  └────┬────┘ └────┬─────┘ └─────┬────┘ └─────┬─────┘ └──────┬───────────┘  │
└───────┼───────────┼─────────────┼────────────┼──────────────┼──────────────┘
        │           │             │            │              │
        └───────────┴─────────────┴────────────┴──────────────┘
                    │
        ┌───────────▼─────────────────────┐
        │      FEATURE MODULES LAYER      │
        │                                 │
        │  ┌──────────────────────────┐   │
        │  │ Navigation (Orbit/Pan)   │   │
        │  │ Selection (Picking)      │   │
        │  │ Visibility (Show/Hide)   │   │
        │  │ ObjectTree (Hierarchy)   │   │
        │  │ Measurement (Distance)   │   │
        │  │ Sectioning (Clipping)    │   │
        │  │ ViewStates (Save/Load)   │   │
        │  │ Markups (2D/3D)          │   │
        │  └──────────────────────────┘   │
        │                                 │
        └──────────────┬──────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      CORE LAYER             │
        │                             │
        │  ┌─────────────────────┐    │
        │  │ ModelViewer (Main)  │    │
        │  │ SceneManager        │    │
        │  │ IFCLoader           │    │
        │  └─────────────────────┘    │
        │                             │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────────┐
        │   THREE.JS + IFC.JS              │
        │                                 │
        │  - Three.js (3D Rendering)      │
        │  - IFC.js (BIM Model Parsing)   │
        │  - OrbitControls (Camera)       │
        │                                 │
        └─────────────────────────────────┘
```

---

## Summary

This diagram shows:

1. **Main Flow** - App initialization and ready state
2. **Navigation** - 3 camera modes with zoom controls
3. **Selection** - Click/right-click/hover interactions
4. **Visibility** - Show/hide/isolate operations
5. **Measurement** - Distance and area tools
6. **Section Planes** - Clipping plane creation and manipulation
7. **View States** - Save and restore complete configurations
8. **Model Loading** - IFC parsing and tree building
9. **Properties** - Element information display
10. **State Management** - All state organized by feature
11. **Architecture** - Complete layer integration

Each flow shows decision points, state transitions, and event emissions for full feature understanding.
