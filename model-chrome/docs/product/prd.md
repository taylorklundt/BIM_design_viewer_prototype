# Product Requirements Document
# BIM Viewer Chrome Prototype

## 1. Summary
This project will create a front-end prototype that replicates the base UI chrome of a BIM Viewer using a provided visual reference. The prototype will focus first on design/layout accuracy and component architecture, not on real 3D model rendering.

The resulting codebase should be modular, well-documented, and prepared for future integration with a separate repository that already contains interactive 3D viewer functionality.

## 2. Problem Statement
We need a clean and accurate UI shell for a BIM viewer that can:
- match the overall layout and feel of the target interface
- support iterative design and engineering refinement
- remain structurally independent from the 3D engine at first
- later integrate with an existing viewer implementation without major rewrites

Without a dedicated chrome-focused prototype, UI work becomes entangled with model rendering and viewer behavior too early, slowing iteration and reducing maintainability.

## 3. Product Goal
Create a prototype of the BIM viewer chrome that:
- visually resembles the provided reference
- decomposes the interface into reusable UI regions and components
- supports basic interaction scaffolding
- establishes a durable project structure and documentation set for ongoing AI-assisted development

## 4. Primary Users
### Internal users
- product designers
- frontend engineers
- prototyping engineers
- AI coding agents working within Cursor/Gemini CLI

## 5. Primary Use Case
A user opens the BIM viewer prototype and sees:
- a top application header
- a left-hand vertical tools rail
- one or more grouped right-hand tool rails
- a central viewer canvas area
- a view cube in the top right
- a minimap in the bottom right
- a navigation control at the bottom center

In the first phase, the user can visually inspect the interface and interact with basic UI states such as hover, active, or shell expansion behavior. The viewer area remains a placeholder.

## 6. Scope

### In Scope for Phase 1
- App shell/layout
- Header
- Left toolbar
- Right toolbar groups
- View cube shell
- Minimap shell
- Navigation control shell
- Placeholder viewer canvas
- Basic interaction states
- Documentation and architecture setup

### Out of Scope for Phase 1
- IFC/model rendering
- Camera movement
- Object selection
- Tool functionality such as measure, markup, clipping, sectioning, isolate, properties, etc.
- Real minimap synchronization
- Real orientation cube logic
- Persistence, auth, backend, APIs

## 7. Design Goals
- Strong visual fidelity to the reference
- Clear spatial hierarchy
- Floating overlays feel distinct from the viewer canvas
- Toolbars feel modular and docked
- Interface should look believable and stable even before full functionality exists

## 8. Technical Goals
- Clean component architecture
- Easy local development and iteration
- Documentation-first setup
- Future-ready integration boundary for viewer commands/events
- Minimal unnecessary dependencies

## 9. Assumptions
- A separate 3D viewer repo already exists
- That repo includes viewer logic and a `navigation.js` related to viewer controls
- This repo will initially not import or depend on that repo directly
- The current screenshot is the source-of-truth reference for phase 1 layout

## 10. Functional Requirements

### FR1 — Global Layout
The app must render a full-screen viewer shell with:
- top header
- left toolbar
- right-side grouped tool panels
- central canvas placeholder
- floating view cube
- floating minimap
- bottom-center navigation control

### FR2 — Header
The header must include:
- back control
- forward control
- model/project dropdown region
- centered search field
- right-side utility controls
- close/dismiss control

### FR3 — Left Toolbar
The left toolbar must appear as a floating vertical rail with stacked icon buttons.

### FR4 — Right Toolbar Groups
The right side must contain grouped vertical action rails rather than a single continuous stack.

### FR5 — View Cube
A floating cube-like orientation control shell must appear in the top right.

### FR6 — Minimap
A floating minimap panel must appear in the lower right with a thumbnail-like preview treatment.

### FR7 — Navigation Control
A circular navigation control must appear centered near the bottom edge and be architected so it can later support flyout/radial behavior.

### FR8 — Viewer Canvas Placeholder
The main content region must reserve space for future viewer embedding and visually read as a neutral stage/canvas.

### FR9 — Interaction States
Major controls must support visual hover and active states.

### FR10 — Integration Readiness
Viewer-facing actions must be designed so they can later be delegated to a viewer adapter rather than tightly coupling to UI components.

## 11. Non-Functional Requirements

### NFR1 — Modularity
The UI must be broken into clearly separated components.

### NFR2 — Maintainability
The project must be easy to extend and revise over time.

### NFR3 — Documentation
The project must include sufficient docs for future AI-assisted development.

### NFR4 — Fidelity
The prototype should be visually recognizable as the target UI at a glance.

### NFR5 — Isolation
The chrome must function independently of a real 3D engine in phase 1.

## 12. Success Metrics
Phase 1 will be considered successful if:
- all major UI regions are present
- the layout closely resembles the reference
- component boundaries are clean
- documentation is in place
- the app is ready for a future viewer integration review

## 13. Risks
- overbuilding fake logic too early
- tightly coupling chrome components to future viewer behavior
- under-documenting the architectural seams needed for integration
- spending too long on pixel polish before layout structure is correct

## 14. Future Phases
### Phase 2
Improve visual polish and interaction states

### Phase 3
Prototype navigation wheel expansion and richer UI behavior

### Phase 4
Compare against existing 3D viewer repo and produce integration plan

### Phase 5
Bind the chrome to the viewer implementation through an adapter layer