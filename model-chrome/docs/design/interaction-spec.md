# Interaction Spec
# BIM Viewer Chrome Prototype

## Purpose
This document defines the intended interaction behavior for the UI chrome in the prototype phase. Only lightweight interaction scaffolding is required at first.

## Phase 1 Interaction Rules

### Global
- All primary icon buttons should support hover states
- Interactive controls should support focus-visible treatment where relevant
- Pressed/active states may be represented visually but do not require real business logic yet

### Header
- Back and forward buttons: clickable shell behavior only
- Model/project selector: may open a placeholder menu later
- Search field: may accept input visually without requiring real search behavior
- Utility icons: clickable placeholder actions
- Close button: clickable placeholder action

### Left Toolbar
- Each icon button supports:
  - default state
  - hover state
  - active/selected state scaffold if needed

### Right Toolbar Groups
- Same behavior as left toolbar
- Groups remain visually independent
- Buttons may route to placeholder handlers or a stub command layer

### View Cube
Phase 1:
- visual shell only
- optional hover response

Future:
- click faces to orient viewer
- drag/orbit interactions if supported by viewer layer

### Minimap
Phase 1:
- static thumbnail shell only
- optional hover treatment

Future:
- indicate current viewport
- click/drag to reposition camera

### Navigation Wheel
Phase 1:
- base circular trigger visible
- may support hover expansion or placeholder flyout shell

Future:
- radial/flyout navigation actions
- camera movement controls
- orientation and recenter actions

## Adapter-Oriented Behavior
Any control likely to affect the future viewer should be architected to call stub actions via a viewer command layer.

Example categories:
- zoom controls
- fit/reset view
- orientation changes
- measure tool
- section tool
- visibility/layer/model tree toggles

## State Guidance
Use minimal UI state in phase 1:
- hovered item
- selected item where visually useful
- open/closed shell state for future menus or wheel expansion

Avoid creating heavy global state until real interaction demands it.