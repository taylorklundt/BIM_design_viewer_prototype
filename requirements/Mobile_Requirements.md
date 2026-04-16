# Mobile — Q2 2026 Requirements

## Overview

**Type:** Newly developed functionality

Native mobile app features for Model Manager. This quarter focuses on improving model rendering/loading performance and investigating offline model access.

## Scope Summary


| #   | Sub-Feature   | Priority (Cell Color) | Q2 Status |
| --- | ------------- | --------------------- | --------- |
| 1   | Performance   | Unassigned            | In Scope  |
| 2   | Offline Model | Unassigned            | In Scope  |


---

## Sub-Feature Requirements

### 1. Performance

**Summary:** Improve model loading and rendering performance on the native mobile app to ensure a smooth and responsive user experience.

**Key Requirements:**

- Reduce model load time for typical project sizes
- Optimize 3D rendering for mobile hardware (GPU memory management, level-of-detail)
- Progressive loading: display partial model while remaining data loads in background
- Smooth pan, zoom, and orbit interactions at consistent frame rates
- Benchmark performance targets for key device tiers (e.g., iPhone 14+, iPad Pro, recent Android flagships)
- Memory management to prevent crashes on large models

**Acceptance Criteria:**

- Model load time is measurably reduced compared to current baseline (define target %)
- Orbit/pan/zoom interactions maintain a minimum frame rate on target devices
- App does not crash when opening large models within the supported size range
- Performance improvements are validated on both iOS and Android

---

### 2. Offline Model

**Summary:** Enable users to download models to their device for offline access, allowing viewing and navigation without an internet connection.

**Key Requirements:**

- Users can select a model or project to download for offline use
- Downloaded models support basic navigation: pan, zoom, orbit, level switching
- Offline data is stored securely on the device
- Sync mechanism: when connectivity is restored, any changes or annotations made offline are synced
- Download progress indicator and estimated storage size shown before download
- Ability to manage offline models: view downloaded models, delete to free space
- Permission-gated: only users with Standard or Admin roles can download for offline use (None role cannot)

**Acceptance Criteria:**

- User can download a model and then open it without internet connectivity
- Basic 3D navigation works in offline mode (pan, zoom, orbit)
- Reconnecting to the internet triggers a sync of any offline changes
- User can view and manage their downloaded models from a dedicated section in the app

