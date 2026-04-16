# Acceptance Criteria
# BIM Viewer Chrome Prototype

## Phase 1 Acceptance Criteria

### Layout
- The application fills the viewport and visually resembles the provided reference
- A top header is present and spans the width
- A left floating toolbar is present
- Right-side tool controls are split into grouped floating rails
- A central viewer canvas placeholder occupies the main area
- A top-right view cube shell is present
- A bottom-right minimap shell is present
- A bottom-center navigation control is present

### Header
- Includes back and forward controls
- Includes a project/model dropdown region
- Includes a search field centered in the header
- Includes utility actions on the right
- Includes a close/dismiss action

### Toolbars
- Left toolbar renders as a vertical floating control group
- Right toolbar renders as multiple grouped floating control groups
- Buttons have default and hover states
- Button layout is visually consistent

### Overlays
- View cube visually reads as a floating overlay
- Minimap visually reads as a floating thumbnail panel
- Navigation control visually reads as a primary floating control near the bottom center

### Architecture
- The UI is composed of modular components
- The viewer canvas placeholder is isolated from the chrome components
- Viewer-oriented actions are routed through a stubbed adapter or command interface rather than embedded directly into presentational components

### Documentation
- `README.md` exists and explains scope and setup
- `AGENTS.md` exists and explains development rules
- `docs/product/prd.md` exists
- `docs/design/ui-inventory.md` exists
- `docs/architecture/integration-contract.md` exists

### Quality
- No major monolithic UI file contains the entire application
- The app runs locally without requiring the external 3D viewer repo
- No real model/rendering logic is required for phase 1 completeness