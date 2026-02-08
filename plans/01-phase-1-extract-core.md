# Phase 1 Plan: Extract Core Components

## Overview

Phase 1 focuses on extracting the foundational components that all other components depend on. These are the "infrastructure" components that provide core services.

**Goal**: Create 5 core components that can be independently developed, tested, and integrated.

**Duration**: 2-3 weeks
**Dependencies**: None (these are the base layer)
**Deliverables**: 5 working components with browser-based tests and documentation

---

## Components to Build

### 1. Event Bus (`components/core/event-bus/`)
**Priority**: P0 (Critical - everything depends on this)
**Effort**: 2 days

**Purpose**: Pub/sub messaging system for inter-component communication

**Why First**: All other components communicate through the event bus. Without it, components can't talk to each other.

**Interface (Conceptual)**:
- `subscribe(event, handler)`: Returns unsubscribe function
- `publish(event, data)`: Synchronous dispatch
- `once(event, handler)`: One-time subscription
- `clear()`: Remove all listeners

**Implementation Details**:
- Pure JavaScript (ES Modules), no external dependencies
- Synchronous publish (handlers execute immediately)
- Support for wildcard patterns (optional)
- Error isolation (one handler failing doesn't break others)

**Key Events to Support**:
- `system:ready`
- `system:error`
- `tool:call`
- `tool:result`
- `tool:pending`    // New: Request to save tool
- `tool:approve`    // New: User approved tool
- `ui:preview`      // New: Component to render
- `ui:approve`      // New: User approved render
- `session:update`

**Testing Requirements**:
- [ ] Subscribe and receive events
- [ ] Unsubscribe stops receiving events
- [ ] Multiple subscribers receive same event
- [ ] Publish without subscribers doesn't error
- [ ] Handler errors don't break other handlers
- [ ] Memory leak prevention

**Files to Create**:
```
components/core/event-bus/
├── src/
│   ├── index.js              # Main export
│   ├── event-bus.js          # Core implementation
│   └── constants.js          # Event name constants
├── tests/
│   ├── unit/
│   │   └── event-bus.spec.js
│   └── integration/
│       └── cross-tab.spec.js
├── README.md
└── package.json              # For metadata only
```

### Registry & UI Support Updates
- **Update Event Bus Constants**:
  - Added `tool:pending`, `tool:approve`, `ui:preview`, `ui:approve`.
  - **Status**: Completed (Verified with `event-bus-migration.spec.html`)

---

### 2. OPFS Provider (`components/core/opfs-provider/`)
**Priority**: P0 (Critical - file storage)
**Effort**: 3 days

**Purpose**: Wrapper around Origin Private File System API

**Why Early**: All file operations go through OPFS. Tools need this to read/write files.

**Interface (Conceptual)**:
- `readFile(path)`: Returns text content
- `writeFile(path, content)`: Writes text content
- `deleteFile(path)`: Removes file
- `exists(path)`: Returns boolean
- `readDir(path)`: Returns directory entries
- `createDir(path)`: Creates directory (recursive)

**Implementation Details**:
- Handle nested directory creation automatically
- Convert between FileSystem handles and content
- Error handling for permission denied, not found, etc.
- Path normalization

**Testing Requirements**:
- [ ] Read existing file
- [ ] Write new file
- [ ] Write creates parent directories
- [ ] Delete file
- [ ] Check existence
- [ ] Read directory contents
- [ ] Walk directory tree

**Browser Compatibility**:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

**Files to Create**:
```
components/core/opfs-provider/
├── src/
│   ├── index.js
│   ├── opfs-provider.js
│   └── utils/
│       └── path.js           # Path normalization
├── tests/
│   ├── unit/
│   │   └── opfs-provider.spec.js
│   └── integration/
│       └── large-files.spec.js
├── README.md
└── package.json
```

---

### 3. IndexedDB Provider (`components/core/indexeddb-provider/`)
**Priority**: P0 (Critical - structured data storage)
**Effort**: 3 days

**Purpose**: Structured data storage for sessions, settings, and the **Global Tool Registry**.

**Why Early**: Session tree and settings need persistent storage.

**Interface (Conceptual)**:
- `get(store, key)`: Retrieve item
- `set(store, key, value)`: Save item
- `delete(store, key)`: Remove item
- `getAll(store)`: Retrieve all items
- `transaction(stores, mode)`: Run transactional logic

**Schema Design**:
```javascript
{
  version: 1,
  stores: {
    // Global Tool Registry
    tools: {
      keyPath: 'id',
      indexes: [
        { name: 'name', keyPath: 'name', unique: true },
        { name: 'type', keyPath: 'type' }
      ]
    },
    sessions: {
      keyPath: 'sessionId',
      indexes: [
        { name: 'created', keyPath: 'created' },
        { name: 'modified', keyPath: 'modified' }
      ]
    },
    pending_tools: {
      keyPath: 'toolId',
      indexes: [
        { name: 'status', keyPath: 'status' },
        { name: 'created', keyPath: 'created' }
      ]
    },
    history: {
      keyPath: 'id',
      indexes: [
        { name: 'sessionId', keyPath: 'sessionId' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    settings: {
      keyPath: 'key'
    }
  }
}
```

**Implementation Details**:
- Promise-based wrapper around IndexedDB API
- Automatic schema migration support
- Transaction handling
- Connection pooling

**Testing Requirements**:
- [ ] Basic CRUD operations
- [ ] Batch operations
- [ ] Index querying
- [ ] Schema migration
- [ ] Error handling

**Files to Create**:
```
components/core/indexeddb-provider/
├── src/
│   ├── index.js
│   ├── indexeddb-provider.js
│   ├── schema.js             # Database schema definition
│   └── migrations/
│       └── v1.js             # Initial schema
├── tests/
│   ├── unit/
│   │   └── indexeddb-provider.spec.js
│   └── integration/
│       └── migrations.spec.js
├── README.md
└── package.json
```

### Registry & UI Support Updates
- **Verify IndexedDB Schema**:
  - Ensure `tools` and `pending_tools` stores are correctly defined.
  - **Status**: Completed (Verified `AardvarkSchema` in code)

---

### 4. Message Bridge (`components/core/message-bridge/`)
**Priority**: P1 (High - enables worker communication)
**Effort**: 2 days

**Purpose**: A simple communication layer that forwards messages between the Web Worker and the Main Thread, integrating with the Event Bus.

**Why Important**: The agent runs in a Web Worker and the UI in the Main Thread.

**Interface (Conceptual)**:
- `postToWorker(message)`: Main thread -> Worker
- `postToMain(message)`: Worker -> Main thread
- `terminate()`: Kill worker

**Implementation Details**:
- The main-thread bridge listens for messages from the worker and `publish()`es them to the main-thread `EventBus`.
- The worker-side bridge does the reverse.
- Pure message forwarder.
- Automatic reconnection on worker crash.

**Testing Requirements**:
- [ ] Send message from main to worker
- [ ] Send message from worker to main
- [ ] Error propagation
- [ ] Worker termination

**Files to Create**:
```
components/core/message-bridge/
├── src/
│   ├── index.js
│   ├── message-bridge-main.js    # Main thread side
│   └── message-bridge-worker.js  # Worker side
├── tests/
│   ├── unit/
│   │   ├── message-bridge-main.spec.js
│   │   └── message-bridge-worker.spec.js
│   └── integration/
│       └── worker-communication.spec.js
├── README.md
└── package.json
```

### Registry & UI Support Updates
- **Verify Message Bridge Whitelist**:
  - Ensured `tool_pending`, `approve_tool`, `preview_component`, `approve_preview` are correctly forwarded.
  - **Status**: Completed (Verified with `tool-approval-flow.spec.html`)

---

### 5. API Client (`components/core/api-client/`)
**Priority**: P1 (High - enables LLM communication)
**Effort**: 4 days

**Purpose**: LLM API communication with multiple provider support

**Interface (Conceptual)**:
- `initialize(config)`: Setup provider
- `sendRequest(request)`: Single completion
- `streamRequest(request, onChunk)`: Streaming completion
- `abort()`: Cancel request
- `getTokenCount(text)`: Estimate usage

**Provider Implementations**:
1. **Gemini** (Primary)
2. **OpenAI** (Secondary)

**Implementation Details**:
- Provider abstraction layer
- Retry logic with exponential backoff
- Streaming parser
- Token counting

**Testing Requirements**:
- [ ] Send request (mock provider)
- [ ] Receive response
- [ ] Streaming chunks
- [ ] Retry on failure
- [ ] Abort in-progress request

**Files to Create**:
```
components/core/api-client/
├── src/
│   ├── index.js
│   ├── api-client.js
│   ├── providers/
│   │   ├── base.js
│   │   ├── gemini.js
│   │   └── openai.js
│   └── utils/
│       ├── retry.js
│       └── tokens.js
├── tests/
│   ├── unit/
│   │   ├── api-client.spec.js
│   │   └── providers/
│   │       └── gemini.spec.js
│   └── integration/
│       └── streaming.spec.js
├── README.md
└── package.json
```

---

## Implementation Order

### Week 1: Foundation

**Day 1-2: Event Bus**
- Create project structure
- Implement core event bus (Pure JS)
- Write unit tests
- **Milestone**: Event bus working

**Day 3-5: OPFS Provider**
- Implement file/directory operations
- Write comprehensive tests
- **Milestone**: Can read/write files and directories

### Week 2: Storage & Communication

**Day 6-8: IndexedDB Provider**
- Design schema (including `tools` registry)
- Implement CRUD & Transactions
- **Milestone**: Can store and retrieve structured data

**Day 9-11: Message Bridge**
- Implement bridge logic
- **Milestone**: Main thread and worker can communicate

### Week 3: API & Integration

**Day 12-15: API Client**
- Implement Gemini provider
- Add streaming support
- **Milestone**: Can make API calls to LLM

**Day 16-17: Integration**
- Create integration tests combining all components
- **Milestone**: All components work together

**Day 18-21: Buffer**
- Bug fixes
- **Final Milestone**: Phase 1 Complete

---

## Testing Strategy

### Unit Tests (per component)
- **Framework**: Browser-native testing (via `run-tests.js` harness)
- **Environment**: Real browser (Chrome/Edge)
- **Approach**: Import modules directly, assertions using standard `console.assert` or simple assert library.

### Integration Tests
- Test component interactions
- Use real browser APIs (OPFS, IndexedDB)

---

## Migration Strategy

### Step 1: Create Components in Isolation
Build each component in `components/core/{name}/` using ES Modules.

### Step 2: Create Adapters
Build adapters to bridge old code with new components if necessary.

### Step 3: Gradual Migration
Replace one module at a time.

### Step 4: Remove Old Code
Once all code uses new components, remove old implementations.

---

## Definition of Done

Phase 1 is complete when:
- [x] All 5 core components implemented
- [x] All tests passing
- [x] Documentation complete for each component
- [x] Browser compatibility verified
- [x] Registry & UI Support verified

---

## Appendix: Component Template

Create a script to scaffold new components:

```bash
#!/bin/bash
# scripts/create-component.sh

COMPONENT_NAME=$1
COMPONENT_CATEGORY=$2

mkdir -p components/$COMPONENT_CATEGORY/$COMPONENT_NAME/{src,tests/{unit,integration}}

# Create package.json (Minimal)
cat > components/$COMPONENT_CATEGORY/$COMPONENT_NAME/package.json << EOF
{
  "name": "@agent/$COMPONENT_NAME",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.js"
}
EOF

# Create src/index.js
cat > components/$COMPONENT_CATEGORY/$COMPONENT_NAME/src/index.js << EOF
export * from './$COMPONENT_NAME.js';
EOF

# Create README.md
echo "# $COMPONENT_NAME" > components/$COMPONENT_CATEGORY/$COMPONENT_NAME/README.md
```

Usage:
```bash
./scripts/create-component.sh event-bus core
./scripts/create-component.sh read-tool tools
```