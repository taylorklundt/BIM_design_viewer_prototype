# 3D IFC Model Viewer - Database Schema

This document defines the database schema for the 3D IFC Model Viewer, including:
- IndexedDB schema for local browser storage
- Optional backend database schema
- Data relationships and structure

---

## Architecture Decision

The 3D IFC Model Viewer uses a **hybrid storage approach**:

1. **Client-side (IndexedDB)** - Primary storage for user sessions
   - Auto-save on regular intervals
   - Fast access without server calls
   - Offline capability

2. **Optional Backend (PostgreSQL/MongoDB)** - For multi-device sync
   - User accounts and authentication
   - Cloud backup
   - Collaboration features

This document covers both approaches.

---

# PART 1: CLIENT-SIDE STORAGE (IndexedDB)

## IndexedDB Database Structure

```
Database Name: "modelviewer-db"
Version: 1

Object Stores:
├── sessions (primary)
├── viewstates (secondary)
├── measurements (secondary)
├── markups (secondary)
└── annotations (secondary)
```

---

## Object Store 1: SESSIONS

**Purpose:** Store complete viewer sessions with all state

### Schema

```javascript
{
  // Primary key
  id: "session-2024-01-16-1",           // Unique session ID

  // Metadata
  timestamp: 1705424400000,              // Creation timestamp (ms)
  lastModified: 1705425000000,           // Last update timestamp
  name: "Design Review Session",         // User-given name
  description: "Main floor review",      // Optional description

  // Models loaded in session
  models: [
    {
      id: "model-abc123",
      url: "/models/building.ifc",
      name: "Main Building",
      size: 2500000,                     // File size in bytes
      uploadedAt: 1705424200000,         // When model was added
      visible: true
    },
    // ... more models
  ],

  // Camera state
  camera: {
    position: { x: 10.5, y: 15.2, z: 20.1 },
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    near: 0.1,
    far: 1000
  },

  // Navigation mode
  navigationMode: "orbit",               // 'orbit', 'pan', 'firstPerson'

  // Selection state
  selection: {
    elementIds: ["elem-001", "elem-002"],
    count: 2,
    lastSelectedId: "elem-002"
  },

  // Visibility state
  visibility: {
    hiddenElements: ["elem-005", "elem-010"],
    isolatedElements: ["elem-001"],
    elementOpacities: {
      "elem-003": 0.5,
      "elem-004": 0.3
    }
  },

  // Section planes state
  sectionPlanes: [
    {
      id: "plane-001",
      normal: { x: 0, y: 0, z: 1 },
      point: { x: 0, y: 0, z: 5.2 },
      constant: -5.2,
      enabled: true,
      visible: true,
      createdAt: 1705424500000
    }
  ],

  // Measurements
  measurements: {
    count: 3,
    ids: ["meas-001", "meas-002", "meas-003"],
    unit: "m"
  },

  // User preferences in session
  preferences: {
    theme: "dark",
    hoverEnabled: true,
    snapToGeometry: true,
    autoSave: true
  }
}
```

### Indexes

```javascript
// Index by timestamp for sorting
keyPath: "id"
indexes: [
  { name: "timestamp", keyPath: "timestamp", unique: false },
  { name: "lastModified", keyPath: "lastModified", unique: false },
  { name: "name", keyPath: "name", unique: false }
]
```

### Operations

```javascript
// Save session
db.sessions.add(sessionObject)

// Get all sessions
db.sessions.getAll()

// Get sessions after timestamp
db.sessions.index("timestamp").getAll(
  IDBKeyRange.lowerBound(cutoffTime)
)

// Update session
db.sessions.put(updatedSessionObject)

// Delete old session
db.sessions.delete("session-2024-01-16-1")

// Clear all sessions
db.sessions.clear()
```

---

## Object Store 2: VIEWSTATES

**Purpose:** Store named saved views for quick access

### Schema

```javascript
{
  // Primary key
  id: "view-2024-01-16-morning",        // Unique view ID
  sessionId: "session-2024-01-16-1",    // Parent session (FK)

  // Metadata
  name: "North Elevation",
  description: "Looking at north wall",
  timestamp: 1705424500000,
  thumbnail: "data:image/png;base64,...", // Base64 encoded screenshot

  // Camera state snapshot
  camera: {
    position: { x: 25, y: 5, z: 0 },
    target: { x: 0, y: 0, z: 0 }
  },

  // Visibility snapshot
  hiddenElements: ["elem-005"],
  selectedElements: ["elem-001"],

  // Section planes snapshot
  clipPlanes: [
    {
      id: "plane-001",
      normal: { x: 0, y: 0, z: 1 },
      point: { x: 0, y: 0, z: 5 }
    }
  ],

  // Measurements in view
  measurements: ["meas-001", "meas-002"],

  // Markups in view
  markups: ["markup-001", "markup-002"],

  // View-specific settings
  navigationMode: "orbit",

  // Sort order for UI display
  order: 1,
  isPinned: true                         // Pin to top of list
}
```

### Indexes

```javascript
keyPath: "id"
indexes: [
  { name: "sessionId", keyPath: "sessionId", unique: false },
  { name: "timestamp", keyPath: "timestamp", unique: false },
  { name: "order", keyPath: "order", unique: false }
]
```

---

## Object Store 3: MEASUREMENTS

**Purpose:** Store individual measurement objects

### Schema

```javascript
{
  // Primary key
  id: "meas-001",
  sessionId: "session-2024-01-16-1",     // Parent session (FK)

  // Measurement metadata
  type: "distance",                      // 'distance', 'area', 'angle'
  timestamp: 1705424600000,

  // Measurement data
  points: [
    { x: 10, y: 5, z: 0, worldSpace: true },
    { x: 15, y: 8, z: 0, worldSpace: true }
  ],

  // Result
  value: 5.83,                           // Calculated distance/area
  unit: "m",                             // Unit of measurement

  // Display
  label: "5.83 m",
  color: "#ff0000",

  // View association
  viewId: "view-2024-01-16-morning",    // Optional: associated view

  // Metadata
  description: "Wall length measurement",
  snapToGeometry: true,
  precision: 2
}
```

### Indexes

```javascript
keyPath: "id"
indexes: [
  { name: "sessionId", keyPath: "sessionId", unique: false },
  { name: "type", keyPath: "type", unique: false },
  { name: "timestamp", keyPath: "timestamp", unique: false }
]
```

---

## Object Store 4: MARKUPS

**Purpose:** Store 2D overlay markups

### Schema

```javascript
{
  // Primary key
  id: "markup-001",
  sessionId: "session-2024-01-16-1",    // Parent session (FK)

  // Markup metadata
  type: "arrow",                         // 'arrow', 'rectangle', 'circle', 'text', 'freehand', 'cloud'
  timestamp: 1705424650000,

  // Position (screen coordinates)
  points: [
    { x: 100, y: 150 },
    { x: 300, y: 250 }
  ],

  // Styling
  color: "#ff0000",
  strokeWidth: 2,
  fillColor: "rgba(255,0,0,0.1)",
  opacity: 1,

  // For text markups
  text: "Check connection here",
  fontSize: 14,
  fontFamily: "Arial",

  // View association
  viewId: "view-2024-01-16-morning",    // Associated view
  screenResolution: { width: 1920, height: 1080 },

  // Metadata
  description: "Quality control note",
  isVisible: true,
  order: 1                               // Z-order for rendering
}
```

### Indexes

```javascript
keyPath: "id"
indexes: [
  { name: "sessionId", keyPath: "sessionId", unique: false },
  { name: "viewId", keyPath: "viewId", unique: false },
  { name: "type", keyPath: "type", unique: false }
]
```

---

## Object Store 5: ANNOTATIONS

**Purpose:** Store 3D annotation pins

### Schema

```javascript
{
  // Primary key
  id: "annot-001",
  sessionId: "session-2024-01-16-1",    // Parent session (FK)

  // 3D position
  position: {
    x: 12.5,
    y: 8.3,
    z: 3.1,
    worldSpace: true
  },

  // Annotation content
  text: "Structural issue - reinforcement needed",
  author: "John Smith",                 // Optional
  timestamp: 1705424700000,

  // Link to element (optional)
  linkedElementId: "elem-005",
  linkedElementType: "IfcBeam",

  // Visual properties
  color: "#ff0000",
  iconType: "warning",                  // 'warning', 'info', 'error', 'note'

  // Associated view
  viewId: "view-2024-01-16-morning",

  // Metadata
  resolved: false,
  resolvedAt: null,
  priority: "high",                     // 'low', 'medium', 'high'
  tags: ["structural", "urgent"],

  // Associated markup
  relatedMarkupId: "markup-001"
}
```

### Indexes

```javascript
keyPath: "id"
indexes: [
  { name: "sessionId", keyPath: "sessionId", unique: false },
  { name: "linkedElementId", keyPath: "linkedElementId", unique: false },
  { name: "viewId", keyPath: "viewId", unique: false },
  { name: "timestamp", keyPath: "timestamp", unique: false },
  { name: "resolved", keyPath: "resolved", unique: false }
]
```

---

## IndexedDB Operations Examples

### Save Current Session

```javascript
async function saveCurrentSession(viewer, name) {
  const session = {
    id: `session-${Date.now()}`,
    timestamp: Date.now(),
    lastModified: Date.now(),
    name,

    models: viewer.getLoadedModels(),
    camera: viewer.navigation.getCamera(),
    navigationMode: viewer.navigation.getMode(),
    selection: {
      elementIds: viewer.selection.getSelected(),
      count: viewer.selection.getSelected().length
    },
    visibility: {
      hiddenElements: viewer.visibility.getHiddenElements(),
      elementOpacities: viewer.visibility.getOpacities()
    },
    sectionPlanes: viewer.sectioning.getClipPlanes(),
    measurements: viewer.measurement.getMeasurements(),
    preferences: viewer.preferences
  };

  const db = await openDatabase();
  await db.sessions.add(session);
  return session.id;
}
```

### Auto-Save Every 30 Seconds

```javascript
function setupAutoSave(viewer) {
  setInterval(async () => {
    const db = await openDatabase();
    const sessions = await db.sessions.getAll();

    if (sessions.length > 0) {
      const current = sessions[sessions.length - 1];
      current.lastModified = Date.now();
      current.camera = viewer.navigation.getCamera();
      current.selection = {
        elementIds: viewer.selection.getSelected()
      };

      await db.sessions.put(current);
      console.log("Auto-saved session");
    }
  }, 30000);
}
```

### Restore Session

```javascript
async function restoreSession(viewer, sessionId) {
  const db = await openDatabase();
  const session = await db.sessions.get(sessionId);

  if (!session) throw new Error("Session not found");

  // Restore models
  for (const model of session.models) {
    await viewer.loadModel(model.url, model.name);
  }

  // Restore camera
  viewer.navigation.setCamera(
    session.camera.position,
    session.camera.target
  );

  // Restore visibility
  viewer.visibility.hide(session.visibility.hiddenElements);

  // Restore selection
  viewer.selection.selectByIds(session.selection.elementIds);

  // Restore section planes
  for (const plane of session.sectionPlanes) {
    viewer.sectioning.addClipPlane(
      plane.normal,
      plane.point
    );
  }
}
```

### Query Sessions After Date

```javascript
async function getRecentSessions(hours = 24) {
  const db = await openDatabase();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);

  const sessions = await db.sessions
    .index("timestamp")
    .getAll(IDBKeyRange.lowerBound(cutoff));

  return sessions;
}
```

---

# PART 2: BACKEND DATABASE SCHEMA (Optional)

For multi-device sync, collaboration, and cloud backup.

## Database Technology: PostgreSQL

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  preferences JSONB DEFAULT '{}',
  UNIQUE(email)
);

-- Workspace/Project
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE
);

-- IFC Models (uploaded by user)
CREATE TABLE ifc_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE,
  version INT DEFAULT 1
);

-- Saved Sessions (synced to cloud)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- State data (JSONB for flexibility)
  state JSONB NOT NULL,

  -- Contains camera, selection, visibility, etc.
  metadata JSONB DEFAULT '{}',

  is_public BOOLEAN DEFAULT FALSE,
  thumbnail_url VARCHAR(500),

  -- Versioning
  version INT DEFAULT 1,
  parent_session_id UUID REFERENCES sessions(id)
);

-- Saved Views within sessions
CREATE TABLE saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- View state
  camera_position JSONB NOT NULL,
  camera_target JSONB NOT NULL,
  hidden_elements TEXT[],
  selected_elements TEXT[],
  clip_planes JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  thumbnail_url VARCHAR(500),
  "order" INT DEFAULT 0
);

-- Measurements
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  measurement_type VARCHAR(50),  -- 'distance', 'area', 'angle'
  points JSONB NOT NULL,
  value FLOAT8,
  unit VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- 2D Markups
CREATE TABLE markups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  view_id UUID REFERENCES saved_views(id),

  markup_type VARCHAR(50),  -- 'arrow', 'rectangle', 'text', etc.
  points JSONB NOT NULL,
  color VARCHAR(20),
  stroke_width INT,
  text_content TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- 3D Annotations
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  position JSONB NOT NULL,  -- { x, y, z }
  text TEXT NOT NULL,
  author_id UUID REFERENCES users(id),

  linked_element_id VARCHAR(255),
  priority VARCHAR(50),     -- 'low', 'medium', 'high'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  tags TEXT[]
);

-- Collaboration: Sharing sessions with other users
CREATE TABLE session_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES users(id),

  permission VARCHAR(50),  -- 'view', 'edit', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(session_id, shared_with_user_id)
);

-- Activity log for collaboration
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  session_id UUID REFERENCES sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),

  action VARCHAR(100),     -- 'created_session', 'updated_view', etc.
  details JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_saved_views_session ON saved_views(session_id);
CREATE INDEX idx_markups_session ON markups(session_id);
CREATE INDEX idx_annotations_session ON annotations(session_id);
CREATE INDEX idx_activity_workspace ON activity_log(workspace_id);
```

---

## Backend API Endpoints (Express.js Example)

### Sessions

```javascript
// Save session to cloud
POST /api/sessions
Body: { workspace_id, name, state }
Response: { id, created_at }

// Get all sessions for workspace
GET /api/workspaces/:workspaceId/sessions

// Update session
PUT /api/sessions/:sessionId
Body: { name, state, description }

// Delete session
DELETE /api/sessions/:sessionId

// Share session with user
POST /api/sessions/:sessionId/share
Body: { shared_with_user_id, permission }

// Get shared sessions
GET /api/sessions/shared/with-me
```

### Views

```javascript
// Save view in session
POST /api/sessions/:sessionId/views
Body: { name, camera_position, camera_target, ... }

// Get views in session
GET /api/sessions/:sessionId/views

// Update view
PUT /api/views/:viewId

// Delete view
DELETE /api/views/:viewId
```

### Annotations

```javascript
// Create annotation
POST /api/sessions/:sessionId/annotations
Body: { position, text, priority, tags }

// Get annotations
GET /api/sessions/:sessionId/annotations

// Mark annotation resolved
PUT /api/annotations/:annotationId
Body: { resolved: true }

// Get unresolved annotations
GET /api/sessions/:sessionId/annotations?resolved=false
```

---

# PART 3: DATA RELATIONSHIPS

## Entity Relationship Diagram (ERD)

```
┌─────────────┐
│   USERS     │
│             │
│ id (PK)     │
│ email       │
│ username    │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────▼──────────────┐
│  WORKSPACES         │
│                     │
│ id (PK)            │
│ user_id (FK)       │
│ name               │
│ created_at         │
└──────┬──────────────┘
       │ 1
       │
       ├───────────────────────────┐
       │                           │
       │ N                         │ N
       ▼                           ▼
┌──────────────────┐      ┌────────────────────┐
│  IFC_MODELS      │      │    SESSIONS        │
│                  │      │                    │
│ id (PK)          │      │ id (PK)            │
│ workspace_id(FK) │      │ workspace_id (FK)  │
│ name             │      │ user_id (FK)       │
│ file_url         │      │ state (JSONB)      │
│ uploaded_at      │      │ created_at         │
└──────────────────┘      │ last_modified      │
                          └──────┬─────────────┘
                                 │ 1
                                 │
                        ┌────────┴───────────┐
                        │                    │
                        │ N                  │ N
                        ▼                    ▼
                ┌───────────────────┐ ┌──────────────┐
                │  SAVED_VIEWS      │ │ ANNOTATIONS  │
                │                   │ │              │
                │ id (PK)           │ │ id (PK)      │
                │ session_id (FK)   │ │ session(FK)  │
                │ name              │ │ position     │
                │ camera_pos/target │ │ text         │
                │ created_at        │ │ priority     │
                └───────────────────┘ └──────────────┘

                        SESSIONS also has:
                        N → Measurements
                        N → Markups
                        N → Sharing relationships
```

---

## Data Flow: Frontend to Backend

```
User Creates/Modifies Viewer State
              │
              ▼
IndexedDB saves immediately (offline support)
              │
              ▼
Every 30 seconds or on "Save to Cloud" click
              │
              ▼
POST to /api/sessions or /api/sessions/:id
              │
              ▼
Backend validates and stores in PostgreSQL
              │
              ▼
Returns sync status to client
              │
              ▼
If shared session: notify collaborators
              │
              ▼
Activity logged for audit trail
```

---

## Scalability Considerations

### Partitioning Strategy
```sql
-- Partition sessions by date for better performance
CREATE TABLE sessions_2024_01 PARTITION OF sessions
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE sessions_2024_02 PARTITION OF sessions
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### Caching Strategy
```javascript
// Redis cache for frequently accessed data
CACHE_KEY: "session:{sessionId}" (1 hour TTL)
CACHE_KEY: "views:{sessionId}:list" (30 min TTL)
CACHE_KEY: "user:{userId}:sessions" (30 min TTL)
```

### Archiving Strategy
```sql
-- Move old sessions to archive table after 1 year
INSERT INTO sessions_archive
SELECT * FROM sessions
WHERE created_at < NOW() - INTERVAL '1 year'
  AND user_id NOT IN (
    SELECT DISTINCT user_id FROM subscriptions
    WHERE status = 'active'
  );
```

---

## Summary

This schema supports:

✅ **Local-first approach** with IndexedDB for instant save
✅ **Cloud sync** with optional PostgreSQL backend
✅ **Collaboration** with sharing and permissions
✅ **Audit trail** with activity logging
✅ **Full versioning** of sessions and views
✅ **Scalability** with partitioning and caching
✅ **Flexibility** with JSONB for complex state
✅ **Performance** with strategic indexes
✅ **GDPR compliance** with user data management
✅ **Offline-first** architecture with eventual sync

