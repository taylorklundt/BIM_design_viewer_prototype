# Home/Reset Feature - Implementation Requirements

## Overview

Implement a Home button that resets the 3D model viewer to its initial state after model loading. Clears all user operations and restores the original view.

## User Interaction Flow

1. User loads a model → initial camera position is captured
2. User modifies view (rotates, hides elements, creates section planes)
3. User clicks Home button → everything resets to initial state
4. Alternative: User presses 'R' key → same reset behavior

## Technical Requirements

### 1. Capture Initial State

After model loads, capture the camera position:

```javascript
// In ModelViewer.js constructor
this.initialCameraState = null;

// In setupLoaderEvents
this.ifcLoader.on('load-complete', (data) => {
  this.hideLoading();
  this.navigation.zoomToFit();

  // Capture initial camera state for Home button reset
  this.initialCameraState = this.navigation.getCamera();

  this.updateStatusBar();
  this.emit('load-complete', data);
});
```

### 2. Reset View Method

```javascript
/**
 * Reset view to initial state - clears all user operations
 */
resetView() {
  // 1. Deselect all elements
  this.selection.deselect();

  // 2. Show all hidden elements
  this.visibility.showAll();

  // 3. Clear all section planes
  this.sectioning.clearClipPlanes();

  // 4. Reset camera to initial state
  if (this.initialCameraState) {
    this.navigation.setCamera(
      this.initialCameraState.position,
      this.initialCameraState.target
    );
  } else {
    // Fallback: zoom to fit if no initial state captured
    this.navigation.zoomToFit();
  }

  // 5. Reset navigation mode to orbit
  this.navigation.setMode('orbit');

  // 6. Update toolbar state
  this.updateToolbarState();

  // 7. Emit event
  this.emit('view-reset');
}
```

### 3. Home Button in Toolbar

Add as first button in toolbar:

```javascript
createToolbar() {
  this.toolbar.innerHTML = `
    <div class="mv-toolbar-group">
      <button class="mv-btn" data-action="resetView" title="Home - Reset View (R)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </button>
    </div>
    <!-- ... other toolbar groups ... -->
  `;
}
```

### 4. Handle Toolbar Action

```javascript
handleToolbarAction(action) {
  switch (action) {
    case 'resetView':
      this.resetView();
      break;
    // ... other actions
  }
}
```

### 5. Keyboard Shortcut

```javascript
// In setupToolbarEvents
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  switch (e.key.toLowerCase()) {
    // ... other shortcuts
    case 'r':
      this.handleToolbarAction('resetView');
      break;
  }
});
```

## What Gets Reset

| Component | Reset Action |
|-----------|--------------|
| Camera | Restore to initial position/target |
| Selection | Deselect all |
| Visibility | Show all hidden elements |
| Section Planes | Remove all |
| Navigation Mode | Set to 'orbit' |
| Tree Panel | Optionally close |

## What Does NOT Get Reset

| Component | Behavior |
|-----------|----------|
| Loaded Models | Stay loaded |
| Tree State | Expand/collapse preserved (optional) |
| Saved View States | Not deleted |

## Events Emitted

| Event | Data | When |
|-------|------|------|
| `view-reset` | - | Home button clicked |

## Icon Design

Home icon (house shape):
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>
```

## Button Placement

- **Position**: First button in toolbar (leftmost)
- **Grouping**: Own group, separated from navigation modes
- **Tooltip**: "Home - Reset View (R)"

## Key Gotchas

1. **Timing of Capture**: Must capture initial state AFTER `zoomToFit()` completes, not before.

2. **Fallback Behavior**: If `initialCameraState` is null (no model loaded), fallback to `zoomToFit()`.

3. **Sectioning Clear**: `clearClipPlanes()` must exist and properly dispose helpers.

4. **Mode Reset**: Reset to 'orbit' mode, not 'pan' or 'firstPerson'.

5. **UI Update**: Call `updateToolbarState()` to sync toolbar button states.

## Integration

```javascript
// In ModelViewer.js

// Property
this.initialCameraState = null;

// Capture on load
this.ifcLoader.on('load-complete', () => {
  this.navigation.zoomToFit();
  this.initialCameraState = this.navigation.getCamera();
});

// Reset method
resetView() { /* ... */ }

// Toolbar action
case 'resetView': this.resetView(); break;

// Keyboard shortcut
case 'r': this.handleToolbarAction('resetView'); break;
```

## Testing Checklist

- [ ] Home button appears as first toolbar button
- [ ] Clicking Home deselects all elements
- [ ] Clicking Home shows all hidden elements
- [ ] Clicking Home removes all section planes
- [ ] Clicking Home restores initial camera position
- [ ] Pressing 'R' key triggers reset
- [ ] Reset works correctly after model reload
- [ ] Reset works when no model is loaded (fallback)
