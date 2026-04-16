# Model Views / Viewpoints — Mobile Requirements

## 1. Executive Summary

This document details the Mobile implementation of the Model Views feature for the Model Manager mobile app. The mobile experience enables field teams to access, create, and manage saved viewpoints while on-site, with full offline support for areas with limited connectivity.

**Primary Use Cases (Priority Order):**
1. **On-site reference** — Walking a jobsite, pulling up saved views to compare against real construction
2. **Field capture** — Creating new views while on-site to document conditions
3. **Quick review** — Checking views created on desktop while away from computer
4. **Stakeholder presentation** — Showing views to clients/trades during meetings

---

## 2. Scope & Feature Parity

**Goal:** Full feature parity with desktop implementation.

| Desktop Feature | Mobile Support | Notes |
|----------------|----------------|-------|
| View/Load saved views | Yes | Core functionality |
| Create new views | Yes | Same workflow as web |
| Multilevel folders | Yes | Touch-optimized interactions |
| Bulk actions | Yes | Mobile-friendly multi-select |
| Share views | Yes | Native share sheet + clipboard |
| Save with markups | Open Question | Depends on mobile markup support |
| Permissions | Yes | Same behavior as desktop |
| Public/Private views | Yes | Full toggle support |
| Navisworks import | Phase 2 | Desktop imports; mobile consumes |

---

## 3. The "Saved State" Definition (Mobile)

A Model View on mobile captures and restores the same state as desktop:

### A. Spatial Metadata (The "Camera")
- **Coordinates:** Precise XYZ camera position
- **Orientation:** Focal length, pitch, yaw, and roll
- **Section Planes:** Active state, position, and orientation of all sectioning tools

### B. Geometry Visibility (The "Selection")
- **Granularity:** Visibility saved at Object/Category level (Static ID-based)
- **Logic:** Records "Show/Hide" state for parent nodes (models) and child elements
- **New File Default:** New models added after view creation are Hidden by default
- **New Element Default:** New IDs within existing models are Visible but flagged for triage

---

## 4. Navigation & Entry Points

### Multiple Access Points
Users can access Model Views through:

| Entry Point | Location | Purpose |
|-------------|----------|---------|
| Bottom tab bar icon | Always visible | One-tap access to views list |
| Hamburger menu item | App menu | Standard navigation pattern |
| Floating action button | 3D viewer | Contextual quick-capture |

### Quick Views
- Displayed on **project landing page** (same as desktop)
- List view by default (thumbnails optional)
- Tap to load directly into 3D viewer

### Viewpoints Panel
- Accessible from **toolbar within Model Viewer**
- Shows full folder hierarchy
- Supports all view management operations

---

## 5. Offline Support

### Download Triggers
Users can download views for offline use from:
1. **Project landing page** — When clicking on a project view
2. **View panel in Model Viewer** — When opening a specific view

### Download Scope
- Individual views only (no bulk folder download in V1)
- Downloads include: camera state, visibility filters, section planes, markup data (if applicable)

### Storage
- **Open Question:** Storage limit to be determined
- Consider warning users about storage usage for large views

### Sync Behavior
- **Auto-sync** when connectivity restored
- **Note:** Needs validation against current Procore mobile app sync capabilities

### Conflict Resolution
- **Latest update wins** — If the same view is edited on desktop while user edited offline, the most recent save takes precedence
- User should be notified when their offline changes were superseded

---

## 6. Screen Orientation & Layout

### Orientation Support
- **Both portrait and landscape** with responsive layout
- Layout adapts automatically to orientation changes

### Portrait Mode
- Optimized for one-handed use
- Compact view list
- Full-screen 3D viewer with overlay controls

### Landscape Mode
- Better for 3D model viewing
- Side panel option for view list
- More screen real estate for section plane manipulation

---

## 7. Touch Interactions

**Status:** Open for UX design exploration

### Recommended Patterns (to be validated)

| Desktop Action | Mobile Pattern (Suggested) |
|---------------|---------------------------|
| Right-click context menu | Long-press OR "..." overflow button |
| Drag-and-drop to folder | Long-press to drag OR "Move to..." action |
| Shift/Ctrl multi-select | Checkbox mode OR tap-to-toggle selection |
| Hover states | N/A — use tap for all interactions |

---

## 8. Creating Views on Mobile

### Workflow
Same workflow as web application:

1. **Fast Capture:** "+" button for instant bookmark (auto-generated name)
2. **Formal Capture:** Split-UI with floating form panel
   - Form fields: Name, Status, Location
   - 3D viewer remains interactive while form is open
   - User can fine-tune camera/sections before final save

### Required Metadata
- **Name** (text input)
- **Status** (dropdown selection)
- **Location** (dropdown or text)
- **Timestamp** (auto-generated)

### Voice Input
- **Phase 2:** Voice-to-text for naming and notes (hands-free for field use)

---

## 9. Markups on Mobile

**Status:** Open Question

Depends on whether markup creation is supported in the mobile Model Viewer.

### Scenarios

**If markup creation IS supported on mobile:**
- Full markup tools adapted for touch (finger drawing, text, callouts)
- Measurements may need simplified UI
- Markups saved with views (same as desktop)

**If markup creation is NOT supported on mobile:**
- View-only for markups (can see desktop-created markups)
- Cannot create new markups on mobile
- Clear indication that markup tools are desktop-only

---

## 10. Permissions

### Behavior
Mobile follows the **same permission model as desktop:**

| Permission Level | Capabilities |
|-----------------|--------------|
| View Only | Load views, cannot modify or delete |
| Edit | Create, modify, delete own views |
| Admin | Full control, can manage others' permissions, elevate to Quick Views |

### Permission Management
- Users can perform all permission actions available to their role
- No desktop-only restrictions for admin actions
- Permission changes take effect immediately

---

## 11. Share Functionality

### Share Options
Both methods available:

1. **Copy to clipboard** — Generates URL, copies with one tap
2. **Native share sheet** — iOS/Android share dialog for Messages, Slack, Email, etc.

### Shared Link Behavior
- Opens in recipient's Model Manager mobile app (if installed)
- Falls back to mobile web viewer
- Restores full view state: camera, visibility, section planes

---

## 12. Navisworks Import

### Phase 1 (Current Scope)
- **Import happens on desktop only**
- Mobile users see already-imported Navisworks viewpoints
- Imported views display "Navisworks" source chip (same as desktop)

### Phase 2 (Future)
- Consider mobile import dialog if NWD/NWF files can be loaded on mobile

---

## 13. Performance Considerations

### View List Loading
- **Lazy loading** for large view lists
- Load views in batches as user scrolls
- Show loading indicators for pending items

### Thumbnails
- Lower resolution on mobile to reduce bandwidth
- Progressive loading (placeholder → thumbnail)

### 3D Rendering
- Consider simplified geometry for complex saved states
- Provide loading progress indicator
- Allow cancellation of slow-loading views

---

## 14. Notifications

**Status:** Open Question

Potential notification types to consider:

| Notification Type | Priority | Notes |
|------------------|----------|-------|
| View shared with you | Medium | Drives collaboration |
| "Sync Required" for downloaded views | High | Keeps offline views current |
| Comments on views you created | Low | Depends on commenting feature |

---

## 15. Procore Integration

**Status:** Open Question

### Deep Links from RFIs/Observations
Options to evaluate:
- **A)** Open directly in Model Manager mobile app
- **B)** Open in mobile browser (web viewer)
- **C)** OS decides based on installed apps

Requires alignment with Procore mobile team on preferred integration pattern.

---

## 16. Open Questions Summary

| Question | Context | Owner |
|----------|---------|-------|
| Touch interaction patterns | Drag-drop, multi-select, context menus | UX Design |
| Storage limit for offline views | How much device storage can we use? | Product + Engineering |
| Auto-sync validation | What sync patterns does Procore mobile support today? | Engineering |
| Markup support on mobile | Is markup creation in mobile viewer roadmap? | Product |
| Notification strategy | Which notifications are valuable? Push vs. in-app? | Product |
| Procore deep link behavior | App vs. browser vs. OS choice | Product + Procore Mobile |

---

## 17. Acceptance Criteria

### Core Functionality
- [ ] User can view list of saved views in portrait and landscape
- [ ] User can load a saved view and see correct camera position, visibility, sections
- [ ] User can create a new view following web workflow
- [ ] User can organize views into folders
- [ ] User can share view via native share sheet and clipboard

### Offline Support
- [ ] User can download individual views for offline access
- [ ] Downloaded views load correctly without network
- [ ] Views auto-sync when connectivity returns
- [ ] Conflict resolution works (latest wins)

### Permissions
- [ ] View-only users cannot modify or delete views
- [ ] Admin users can elevate views to Quick Views
- [ ] Permission changes reflect immediately

### Quick Views
- [ ] Quick Views appear on project landing page
- [ ] Tapping Quick View loads directly into viewer
- [ ] List view displays by default

---

## 18. Dependencies

| Dependency | Status | Impact |
|------------|--------|--------|
| Mobile Model Viewer 3D engine | Required | Core rendering for views |
| Offline storage infrastructure | Required | Download and sync functionality |
| Procore mobile app sync patterns | Validation needed | Auto-sync implementation |
| Mobile markup tools | TBD | Determines markup scope |

---

## 19. Release Phases

### Phase 1 (MVP)
- View/load existing views
- Create new views (web workflow)
- Folder organization
- Offline download (individual views)
- Share functionality
- Permissions (same as desktop)
- Quick Views on landing page

### Phase 2
- Voice input for view creation
- Navisworks import on mobile (if feasible)
- Markup creation (pending mobile markup support)
- Enhanced notifications
- Bulk operations optimization

---

*Document Version: 1.0*
*Last Updated: 2026-03-18*
*Based on: Model_Views_Viewpoints_Requirements.md (Desktop)*
