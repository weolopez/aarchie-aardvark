# Phase 2 Completion Plan: Storage & Consistency

**Status:** IN PROGRESS
**Goal:** Finalize storage layer alignment with `ARCHITECTURE.md`, focusing on Registry-based consistency and System Settings.

## Context
The codebase has evolved to match `ARCHITECTURE.md` ahead of the original Phase 2 plan. `ToolStore` is already Registry-based (IndexedDB) rather than File-based. The remaining work involves ensuring data consistency (linking Tools by ID) and implementing the missing `SettingsStore`.

## Objectives

### 1. Data Consistency (Tool IDs)
Ensure all storage components reference tools by their stable UUID (`toolId`) in addition to their human-readable name (`toolName`).

*   **HistoryStore:**
    *   Update `ExecutionRecord` schema to include `toolId`.
    *   Update `recordStart` and `recordExecution` to require `toolId`.
    *   Update `recordComplete` to persist it.
*   **SessionStore:**
    *   Update `ToolCall` and `ToolResult` schemas in `NodeData` to explicitly include `toolId`.

### 2. Implement Settings Store (`components/storage/settings-store/`)
**Priority:** P1
**Dependencies:** IndexedDB Provider, Event Bus

**Purpose:** Manage global system configuration and user preferences.

**Interface:**
```javascript
interface SettingsStore {
  // CRUD
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  getAll(): Promise<Object>; // Returns full settings object
  
  // Namespaced Access
  getSection(section: string): Promise<Object>;
  setSection(section: string, values: Object): Promise<void>;
  
  // Events
  // 'setting:changed', 'settings:loaded'
}
```

**Schema (IndexedDB 'settings' store):**
*   Key-Value pair storage or single document approach. Given the architecture, a Key-Value approach in a specific store is flexible.

### 3. Verification
Create a comprehensive integration test ensuring the "Golden Thread" of ID persistence:
*   Tool Created (Registry) -> `toolId` generated.
*   Tool Executed -> `HistoryStore` records `toolId`.
*   Session Updated -> `SessionStore` records `toolId` in `toolCalls`.

## Task List

- [ ] **Plan Management**
    - [x] Archive deprecated Phase 2 plan.
    - [x] Create this completion plan.

- [ ] **Settings Store**
    - [ ] Implement `src/settings-store.js`.
    - [ ] Implement `src/index.js`.
    - [ ] Create unit tests.

- [ ] **Refactoring (ID Consistency)**
    - [ ] Update `HistoryStore` (`src/history-store.js`) to support `toolId`.
    - [ ] Update `SessionStore` (`src/session-store.js`) types/docs to enforce `toolId`.

- [ ] **Integration Testing**
    - [ ] Create `tests/integration/storage-consistency.spec.html`.
    - [ ] Verify `ToolStore` -> `HistoryStore` -> `SessionStore` flow.

## Timeline
*   **Day 1:** Settings Store implementation & Refactoring.
*   **Day 2:** Integration Testing & Final Review.
