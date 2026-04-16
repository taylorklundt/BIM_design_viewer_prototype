# UI Inventory
# BIM Viewer Chrome Prototype

## Reference-Based UI Regions

### 1. Top Header
Purpose:
Primary global navigation and top-level actions

Contains:
- Back button
- Forward button
- Project/model selector
- Search field
- Utility/action icons
- Close button

Visual Characteristics:
- Full-width horizontal bar
- Light neutral background
- Compact height
- Soft border or separation from viewer canvas
- Search visually centered

---

### 2. Left Toolbar
Purpose:
Primary viewer tools or quick access actions

Contains:
- Vertical stack of icon buttons
- Floating rail container

Visual Characteristics:
- Positioned left
- Separated from viewport edge by margin
- Rounded vertical container
- White or light surface
- Subtle shadow
- Evenly spaced controls

---

### 3. Right Toolbar Group A
Purpose:
Primary viewer mode actions

Possible future actions:
- model
- layers
- explode
- isolate
- visibility modes

Visual Characteristics:
- Floating vertical group
- Upper right placement
- Rounded light surface

---

### 4. Right Toolbar Group B
Purpose:
Secondary actions / editing or navigation support

Possible future actions:
- measure
- section
- add
- edit tools

Visual Characteristics:
- Floating vertical group
- Positioned below Group A
- Separated by visible vertical gap

---

### 5. Right Toolbar Group C
Purpose:
History or reset actions

Possible future actions:
- undo
- redo
- reset/recenter

Visual Characteristics:
- Floating vertical group
- Lower right placement
- Small stack

---

### 6. View Cube
Purpose:
Orientation control and spatial context

Contains:
- cube shell or pseudo-3D control
- labeled faces or directional hints

Visual Characteristics:
- Floating top-right overlay
- High contrast against canvas
- Small card-like or frameless overlay feel
- Clearly distinct from right toolbar groups

---

### 7. Viewer Canvas Placeholder
Purpose:
Reserved area for future 3D viewer mount

Contains:
- neutral background only in phase 1
- optional placeholder label if needed

Visual Characteristics:
- Large uninterrupted central area
- Neutral gray stage
- Serves as visual backdrop for overlays

---

### 8. Minimap
Purpose:
Contextual overview of current model/sheet area

Contains:
- panel shell
- thumbnail image placeholder
- directional marker

Visual Characteristics:
- Floating lower-right overlay
- Card-like surface
- Border and shadow
- Small but readable

---

### 9. Bottom Navigation Control
Purpose:
Primary navigation trigger and eventual flyout/radial control

Contains:
- circular trigger button
- future expansion shell

Visual Characteristics:
- Centered horizontally near bottom
- Prominent circular button
- Strong visual identity relative to other controls

## Layering Notes
Recommended z-order:
1. viewer canvas
2. header and main chrome
3. floating toolbars
4. view cube and minimap
5. bottom navigation control

## Component Mapping
- `Header`
- `LeftToolbar`
- `RightToolbarGroup`
- `RightToolbar`
- `ViewCube`
- `MiniMap`
- `NavigationWheel`
- `ViewerCanvas`
- `ChromeLayout`