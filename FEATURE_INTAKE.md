# Adding a New Feature

When someone asks to add a new feature, **gather requirements first** using this simple questionnaire. Ask these questions conversationally — the answers will guide the implementation.

---

## Feature Request Questionnaire

### 1. What does this feature do?

> *Describe it in one sentence, like you're explaining it to a colleague.*
>
> Example: "Let users measure the distance between two points in the model."

---

### 2. Where does it live in the UI?

Pick one:

- [ ] **Left toolbar** — Opens a panel (like Object Tree or Search Sets)
- [ ] **Right toolbar** — A tool you activate (like Section or Measure)
- [ ] **Header** — Top bar area (like Search or Settings)
- [ ] **Floating widget** — Always visible overlay (like View Cube or Minimap)
- [ ] **No UI** — It's an internal capability, no button needed
- [ ] **Not sure** — Describe where you imagine it

---

### 3. What happens when the user clicks it?

Pick one:

- [ ] **Opens a panel** — A sidebar panel slides out with content
- [ ] **Activates a tool** — User enters a "mode" (like drawing or measuring)
- [ ] **Toggles something** — Turns a setting on/off (like X-Ray or Wireframe)
- [ ] **One-time action** — Does something immediately (like Reset View or Zoom to Fit)
- [ ] **Shows a menu** — Dropdown with options

---

### 4. What information does it need?

Check all that apply:

- [ ] **Selected element(s)** — Works on whatever the user has selected
- [ ] **Click location** — User clicks somewhere in the 3D view
- [ ] **User input** — User types something (name, value, search term)
- [ ] **Nothing** — Works without any input

---

### 5. What does the user see as a result?

Check all that apply:

- [ ] **Something changes in the 3D view** — Objects move, appear, disappear, change color
- [ ] **Information is displayed** — Properties, measurements, labels, lists
- [ ] **A panel shows/hides** — Sidebar content appears or disappears
- [ ] **Nothing visible** — It's a background operation

---

### 6. Can the user undo it?

- [ ] **Yes** — User should be able to reverse this action
- [ ] **No** — It's a view change, not a data change
- [ ] **Reset clears it** — The "Reset View" button should clear this

---

### 7. Does it need an icon?

- [ ] **Yes** — Describe what the icon should look like, or provide a reference
- [ ] **No** — It's not a toolbar button

---

### 8. Any keyboard shortcut?

- [ ] **Yes** — Suggest a key (e.g., "M for Measure", "P for Properties")
- [ ] **No** — No shortcut needed

---

### 9. How should we test it?

> *Describe 3-5 things we should verify work correctly.*
>
> Example for Measure:
> - User can measure between two points
> - Measurement label shows the correct distance
> - User can cancel mid-measurement
> - Reset View clears all measurements
> - Works when elements are hidden

---

### 10. Anything else?

> *Any special requirements, edge cases, or references (Figma links, screenshots, similar features in other apps)?*

---

## What Happens Next

Once the questionnaire is complete, Claude will:

1. **Determine the feature type** — Engine capability, UI component, or both
2. **Create the correct file structure** — Following the plugin pattern
3. **Write tests first** — Based on the test scenarios you described
4. **Implement the feature** — Isolated, following project architecture
5. **Wire it up** — Connect UI to engine through the proper adapter layer

You don't need to know the technical details — just answer the questions above, and the implementation will follow the established patterns automatically.

---

## Quick Examples

### Example: "Add a Properties Panel"

| Question | Answer |
|----------|--------|
| What does it do? | Shows the IFC properties of the selected element |
| Where in UI? | Left toolbar |
| What happens on click? | Opens a panel |
| What info does it need? | Selected element(s) |
| What does user see? | Information is displayed (property list) |
| Can user undo? | No, it's just viewing |
| Icon? | Yes, an "i" info icon |
| Shortcut? | Yes, "I" for Info |
| Test scenarios? | Panel opens, shows properties for selected element, shows "nothing selected" when empty, handles elements with many properties |

### Example: "Add X-Ray Mode"

| Question | Answer |
|----------|--------|
| What does it do? | Makes all elements semi-transparent so you can see through them |
| Where in UI? | Right toolbar |
| What happens on click? | Toggles something on/off |
| What info does it need? | Nothing |
| What does user see? | Something changes in 3D view (transparency) |
| Can user undo? | Reset clears it |
| Icon? | Yes, like a ghost or see-through box |
| Shortcut? | Yes, "X" for X-Ray |
| Test scenarios? | Toggle on makes elements transparent, toggle off restores, works with hidden elements, works with isolated elements |

---

## For Claude: Technical Mapping

*(This section is for Claude's reference when implementing — users can ignore this.)*

Based on the questionnaire answers, map to the correct implementation:

| Answer | Technical Decision |
|--------|-------------------|
| "Left toolbar + Opens a panel" | Chrome UI feature in `src/chrome/features/[name]/` with Panel component |
| "Right toolbar + Activates a tool" | Engine feature in `src/features/` + Chrome button that calls adapter |
| "No UI" | Engine feature only, exposed via `viewer.[feature]` API |
| "Selected element(s)" | Feature needs `viewer.selection.getSelected()` integration |
| "Click location" | Feature needs raycasting / click handler on canvas |
| "Something changes in 3D view" | Engine feature modifies scene objects |
| "Information is displayed" | Chrome panel that reads from adapter |
| "Reset clears it" | Feature must implement cleanup in `viewer.resetView()` |
| "Keyboard shortcut" | Add to keyboard handler in `src/features/Keyboard.js` |

Test file location:
- Engine feature → `evals/tests/[feature-name].spec.js`
- Chrome feature → `evals/tests/chrome-[feature-name].spec.js`

Always follow:
1. Plugin pattern with `enable()`, `disable()`, `destroy()`
2. No imports into `src/core/ModelViewer.js`
3. Chrome uses ViewerAdapter only (no direct engine imports)
4. Tests written before or alongside implementation
