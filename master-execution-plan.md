# Master Execution Plan: Aardvark Browser Coding Agent

## Executive Summary

This plan provides a complete roadmap from the current Phase 1 foundation to a fully functional browser-based coding agent as defined in ARCHITECTURE.md. The system uses a composable component architecture with JavaScript Web Worker agent logic, registry-based tool system, and web-native storage (OPFS + IndexedDB).

**Current Status:** Phase 1 Complete (5 core infrastructure components)
**Total Phases:** 6 phases
**Estimated Timeline:** 8-10 weeks
**Team Size:** 1-2 developers

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Core Infrastructure ✓ COMPLETE                       │
│  Event Bus, OPFS Provider, IndexedDB Provider,                 │
│  Message Bridge, API Client                                    │
│  Duration: 3 weeks | Status: DONE                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Storage Layer (Weeks 4-5)                            │
│  File Store (OPFS repos), Global Store (IndexedDB tools/sessions) │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Tool System (Weeks 6-7)                              │
│  Tool Registry (in-memory), Tool Executor, Built-in Tools      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: Agent Core (Weeks 8-9)                               │
│  JavaScript Web Worker, LLM integration, Session Management    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: UI Components (Weeks 10-11)                          │
│  Lit HTML Web Components: Chat, Session Tree, Tool Approval    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 6: Integration & Delivery (Week 12)                     │
│  System integration, testing, optimization, deployment         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Runtime
- **JavaScript Web Worker**
- **Native ES Modules**
- No Transpilers (TypeScript optional, currently pure JS)
- No Bundlers (Rollup/Webpack)

### UI Layer
- **Lit HTML** (Web Components via CDN)
- **Tailwind CSS** (via CDN for utility classes)
- **Vanilla JavaScript** (ES2020+)
- Shadow DOM for style encapsulation
- Standard Web Platform APIs
- **No React** / Frameworks
- Composable via custom elements

### Storage Strategy
- **OPFS (Project Space)**: Strictly for repository source code and assets.
- **IndexedDB (User Space)**: Global Tool Registry, Session trees, and System metadata.

### Build System
- **None required** for development (Native ES Modules)
- Optional minification for production
- No complex build pipelines

---

## Architecture Principles

### 1. Agent in Web Worker
All agent logic runs in a dedicated Web Worker to keep the UI responsive:
- LLM API communication
- Session management
- Tool execution (Sandboxed)
- Context compaction

**Why**: Performance, non-blocking UI, security isolation.

### 2. Registry-Based Tool System
Tools are first-class objects stored in IndexedDB, not static files:
- Loaded into memory map at startup
- Zero-latency lookup
- Global availability across projects

**Why**: Speed, portability, and "install once, use everywhere" capability.

### 3. JavaScript for Everything
Unified language for UI, Logic, and Tools:
- UI: Web Components (Lit)
- Logic: Agent Core (Worker)
- Tools: Async Functions

**Why**: Consistency, ease of contribution, no context switching.

### 4. Minimal Dependencies
Allowed:
- Lit (UI rendering)
- Tailwind (Styling)
- IDB-Keyval (IndexedDB wrapper)
- Marked (Markdown rendering)

Not allowed:
- Heavy frameworks (React, Angular)
- Complex build tools

---

## Phase 1: Core Infrastructure ✓ COMPLETE

**Status:** DONE  
**Duration:** 3 weeks  
**Components:** 5/5 complete

### Completed Components

| Component | Status | Tests | Demo | Docs |
|-----------|--------|-------|------|------|
| Event Bus | ✅ Complete | ✅ 14 tests | ✅ Interactive | ✅ README |
| OPFS Provider | ✅ Complete | ✅ 10 tests | ✅ File browser | ✅ README |
| IndexedDB Provider | ✅ Complete | ✅ 9 tests | ✅ Data browser | ✅ README |
| Message Bridge | ✅ Complete | ✅ 8 tests | ✅ Worker demo | ✅ README |
| API Client | ✅ Complete | ✅ 12 tests | ✅ Chat demo | ✅ README |

### Integration Tests
- ✅ 12 cross-component integration tests
- ✅ 5 performance benchmarks
- ✅ Browser compatibility verification

### Deliverables
- [x] All 5 core components implemented
- [x] Unit tests for each component (>90% coverage)
- [x] Integration tests passing
- [x] Interactive demos for each component
- [x] Documentation complete

## Phase 1: Core Infrastructure ✓ COMPLETE

**Status:** DONE  
**Duration:** 3 weeks  
**Components:** 5/5 complete

### Completed Components

| Component | Status | Tests | Demo | Docs |
|-----------|--------|-------|------|------|
| Event Bus | ✅ Complete | ✅ 14 tests | ✅ Interactive | ✅ README |
| OPFS Provider | ✅ Complete | ✅ 10 tests | ✅ File browser | ✅ README |
| IndexedDB Provider | ✅ Complete | ✅ 9 tests | ✅ Data browser | ✅ README |
| Message Bridge | ✅ Complete | ✅ 8 tests | ✅ Worker demo | ✅ README |
| API Client | ✅ Complete | ✅ 12 tests | ✅ Chat demo | ✅ README |

### Integration Tests
- ✅ 12 cross-component integration tests
- ✅ 5 performance benchmarks
- ✅ Browser compatibility verification

### Deliverables
- [x] All 5 core components implemented
- [x] Unit tests for each component (>90% coverage)
- [x] Integration tests passing
- [x] Interactive demos for each component
- [x] Documentation complete

---

## Phase 2: Storage Layer

**Status:** NOT STARTED  
**Duration:** 2 weeks (Weeks 4-5)  
**Dependencies:** Phase 1  
**Goal:** Build high-level storage abstractions for repos, tools, and sessions

### 2.1 File Store

**Purpose:** Repository file management on top of OPFS

**Interface:**
```javascript
interface FileStore {
  // Repository management
  createRepo(name: string): Promise<void>;
  deleteRepo(name: string): Promise<void>;
  listRepos(): Promise<string[]>;
  
  // File operations within repo
  read(repo: string, path: string): Promise<string>;
  write(repo: string, path: string, content: string): Promise<void>;
  delete(repo: string, path: string): Promise<void>;
  exists(repo: string, path: string): Promise<boolean>;
  
  // Directory operations
  list(repo: string, path: string): Promise<DirEntry[]>;
  walk(repo: string, path: string): Promise<string[]>;
  
  // GitHub integration
  loadFromGitHub(owner: string, repo: string): Promise<void>;
}
```

**Features:**
- Multi-repository support
- GitHub repository loading
- File tree caching
- Change notifications via Event Bus

**Files to Create:**
```
components/storage/file-store/
├── src/
│   ├── index.js
│   ├── file-store.js
│   └── github-loader.js
├── tests/
│   ├── unit/
│   │   └── file-store.spec.html
│   └── integration/
│       └── github-loading.spec.html
├── demo/
│   └── index.html
└── README.md
```

**Week 4, Days 1-5:**
- Day 1-2: Core file operations
- Day 3: GitHub loader integration
- Day 4: Multi-repo support
- Day 5: Tests and documentation

### 2.2 Global Store

**Purpose:** IndexedDB storage for tools and sessions

**Interface:**
```javascript
interface GlobalStore {
  // Tool Registry
  saveTool(tool: Tool): Promise<void>;
  getTool(id: string): Promise<Tool>;
  listTools(): Promise<Tool[]>;
  deleteTool(id: string): Promise<void>;
  
  // Pending Tools (for approval)
  savePendingTool(tool: PendingTool): Promise<string>;
  getPendingTool(id: string): Promise<PendingTool>;
  listPendingTools(): Promise<PendingTool[]>;
  approvePendingTool(id: string): Promise<void>;
  rejectPendingTool(id: string): Promise<void>;
  
  // Sessions
  saveSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session>;
  listSessions(): Promise<SessionSummary[]>;
  deleteSession(sessionId: string): Promise<void>;
}

interface Tool {
  id: string;
  name: string;
  version: number;
  func: string; // JavaScript function as string
  schema: object; // JSON Schema for parameters
  type: 'system' | 'user';
  permissions: string[];
  created: string;
}

interface PendingTool extends Tool {
  status: 'pending' | 'approved' | 'rejected';
}
```

**Features:**
- Tool registry persistence
- Session tree storage
- Pending tool approval queue
- IndexedDB transactions

**Week 4, Days 6-10:**
- Day 6: Tool CRUD operations
- Day 7: Session storage
- Day 8: Pending tool management
- Day 9: Transaction handling
- Day 10: Tests and documentation

### 2.3 Settings Store

**Purpose:** User preferences and configuration

**Interface:**
```javascript
interface SettingsStore {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  getAll(): Promise<object>;
}
```

**Week 5, Days 1-2:**
- Basic key-value storage
- Default settings
- Type validation

### Phase 2 Deliverables

- [ ] File Store with GitHub integration
- [ ] Global Store for tools and sessions
- [ ] Settings Store
- [ ] All components tested
- [ ] Interactive demos
- [ ] Documentation

---

## Phase 3: Tool System

**Status:** NOT STARTED  
**Duration:** 2 weeks (Weeks 6-7)  
**Dependencies:** Phase 2  
**Goal:** Implement registry-based tool system

### 3.1 Tool Registry

**Purpose:** In-memory tool management loaded from IndexedDB

**Interface:**
```javascript
interface ToolRegistry {
  // Registry management
  load(): Promise<void>; // Load all tools from IndexedDB
  register(tool: Tool): void; // Add to memory map
  unregister(name: string): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  has(name: string): boolean;
  
  // Persistence
  save(tool: Tool): Promise<void>; // Save to IndexedDB
  delete(name: string): Promise<void>;
}
```

**Features:**
- In-memory Map for fast lookups
- Hydration from IndexedDB on startup
- Tool validation
- Event notifications

**Files to Create:**
```
components/agent/tool-registry/
├── src/
│   ├── index.js
│   ├── tool-registry.js
│   └── tool-validator.js
├── tests/
│   ├── unit/
│   │   └── tool-registry.spec.html
│   └── integration/
│       └── registry-loading.spec.html
├── demo/
│   └── index.html
└── README.md
```

**Week 6, Days 1-3:**
- Day 1: Registry structure and memory map
- Day 2: IndexedDB hydration
- Day 3: Tool validation and events

### 3.2 Tool Executor

**Purpose:** Execute tools in sandboxed environment

**Interface:**
```javascript
interface ToolExecutor {
  execute(toolName: string, args: object, context: ExecutionContext): Promise<ToolResult>;
}

interface ExecutionContext {
  fileStore: FileStore;
  postMessage: Function; // For UI events
  permissions: string[];
}

interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
}
```

**Features:**
- Function creation via `new Function()`
- Sandboxed execution scope
- Permission checking
- Error handling and timeouts

**Week 6, Days 4-7:**
- Day 4: Function creation and execution
- Day 5: Sandboxing and permissions
- Day 6: Error handling
- Day 7: Integration with registry

### 3.3 Built-in Tools

**Tools to Implement:**

#### read-tool
```javascript
// Read file contents
async function read({ path, startLine, endLine }) {
  return await fileStore.read(currentRepo, path);
}
```

#### write-tool
```javascript
// Write file contents
async function write({ path, content }) {
  await fileStore.write(currentRepo, path, content);
}
```

#### edit-tool
```javascript
// Surgical find-and-replace
async function edit({ path, oldString, newString }) {
  const content = await fileStore.read(currentRepo, path);
  const newContent = content.replace(oldString, newString);
  await fileStore.write(currentRepo, path, newContent);
}
```

#### ls-tool
```javascript
// List directory contents
async function ls({ path }) {
  return await fileStore.list(currentRepo, path);
}
```

#### grep-tool
```javascript
// Search file contents
async function grep({ pattern, path, caseSensitive = false }) {
  // Implementation using fileStore.walk and string matching
}
```

#### find-tool
```javascript
// Find files by pattern
async function find({ pattern, path }) {
  const files = await fileStore.walk(currentRepo, path || '.');
  return files.filter(file => file.includes(pattern));
}
```

#### js-tool
```javascript
// Execute JavaScript code
async function js({ code }) {
  // Execute in sandbox with limited globals
}
```

**Week 6, Days 8-10 & Week 7, Days 1-3:**
- Days 8-10: Core file tools (read, write, edit)
- Week 7, Day 1: Search tools (grep, find)
- Week 7, Day 2: Directory tools (ls)
- Week 7, Day 3: JavaScript tool

### 3.4 Dynamic Tool Creation

**Purpose:** Allow LLM to create new tools

**Interface:**
```javascript
interface DynamicToolCreator {
  createFromLLM(spec: ToolSpec): Promise<PendingTool>;
  validateSpec(spec: ToolSpec): ValidationResult;
}

interface ToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
  func: string; // JavaScript function body
  permissions: string[];
}
```

**Features:**
- JSON schema validation
- Function syntax checking
- Permission assignment
- Pending approval workflow

**Week 7, Days 4-5:**
- Day 4: Tool spec parsing and validation
- Day 5: Pending tool creation

### Phase 3 Deliverables

- [ ] Tool Registry with IndexedDB persistence
- [ ] Tool Executor with sandboxing
- [ ] 7 built-in tools implemented
- [ ] Dynamic tool creation system
- [ ] All tools tested
- [ ] Security review

---

## Phase 4: Agent Core

**Status:** NOT STARTED  
**Duration:** 2 weeks (Weeks 8-9)  
**Dependencies:** Phase 3  
**Goal:** JavaScript Web Worker agent with LLM integration

### 4.1 Agent Core Structure

**Purpose:** Main agent logic in Web Worker

**Interface:**
```javascript
class AgentCore {
  constructor(apiClient, toolRegistry, toolExecutor) {
    this.apiClient = apiClient;
    this.toolRegistry = toolRegistry;
    this.toolExecutor = toolExecutor;
    this.sessionManager = new SessionManager();
    this.contextBuilder = new ContextBuilder();
  }
  
  async init() {
    await this.toolRegistry.load();
    // Hydrate registry
  }
  
  async chat(message) {
    // Main LLM loop
  }
  
  async executeTool(name, args) {
    // Tool dispatch
  }
}
```

**Features:**
- Message passing with main thread
- LLM API integration
- Tool orchestration
- Session management

**Files to Create:**
```
components/agent/agent-core/
├── src/
│   ├── index.js
│   ├── agent-core.js
│   ├── llm-client.js
│   └── tool-dispatcher.js
├── tests/
│   ├── unit/
│   │   └── agent-core.spec.html
│   └── integration/
│       └── chat-loop.spec.html
├── demo/
│   └── index.html
└── README.md
```

**Week 8, Days 1-4:**
- Day 1: Agent core structure
- Day 2: Message passing protocol
- Day 3: LLM client integration
- Day 4: Tool dispatcher

### 4.2 Session Manager

**Purpose:** Handle conversation trees and branching

**Interface:**
```javascript
class SessionManager {
  constructor(globalStore) {
    this.globalStore = globalStore;
    this.sessions = new Map();
  }
  
  async loadSession(sessionId) {
    // Load from IndexedDB
  }
  
  async saveSession(sessionId) {
    // Save to IndexedDB
  }
  
  createNode(parentId, role, content, toolCalls) {
    // Create new conversation node
  }
  
  branch(fromNodeId) {
    // Create branch
  }
  
  getHistory(nodeId) {
    // Reconstruct conversation history
  }
}
```

**Features:**
- Tree-based conversation storage
- Branching support
- History reconstruction
- Persistence to IndexedDB

**Week 8, Days 5-7:**
- Day 5: Session tree structure
- Day 6: Node operations
- Day 7: Branching and history

### 4.3 Context Builder

**Purpose:** Build context for LLM requests

**Interface:**
```javascript
class ContextBuilder {
  constructor(fileStore) {
    this.fileStore = fileStore;
  }
  
  async buildContext(message, sessionHistory, repo) {
    // Combine session history with file context
  }
  
  shouldCompact(tokenCount) {
    // Check if context needs compaction
  }
  
  compact(history) {
    // Summarize old messages
  }
}
```

**Features:**
- Token counting and management
- File content inclusion
- Automatic summarization
- Context window optimization

**Week 8, Days 8-10:**
- Day 8: Context building
- Day 9: Token management
- Day 10: Compaction logic

### 4.4 Web Worker Integration

**Purpose:** Worker entry point and message handling

**Files:**
```
src/agent/
├── worker.js          # Worker entry point
├── agent.js           # Agent instantiation
└── protocol.js        # Message protocol
```

**Message Protocol:**
```javascript
// Main → Worker
{ type: 'init', apiKey: string, model: string }
{ type: 'chat', message: string, sessionId: string }
{ type: 'approve_tool', toolId: string }
{ type: 'load_repo', owner: string, repo: string }

// Worker → Main
{ type: 'ready', toolCount: number }
{ type: 'step', content: string }
{ type: 'tool_pending', tool: object }
{ type: 'preview_component', tagName: string, code: string }
{ type: 'error', message: string }
```

**Week 9, Days 1-5:**
- Day 1: Worker bootstrap
- Day 2: Message handlers
- Day 3: Protocol implementation
- Day 4: Error handling
- Day 5: Integration testing

### Phase 4 Deliverables

- [ ] Agent Core JavaScript implementation
- [ ] Session Manager with branching
- [ ] Context Builder with compaction
- [ ] Web Worker integration
- [ ] Message protocol
- [ ] All components tested
- [ ] Integration with tool system

---

## Phase 5: UI Components

**Status:** NOT STARTED  
**Duration:** 2 weeks (Weeks 10-11)  
**Dependencies:** Phase 4  
**Goal:** User interface components

## Phase 5: UI Components

**Status:** NOT STARTED  
**Duration:** 2 weeks (Weeks 10-11)  
**Dependencies:** Phase 4  
**Goal:** Lit HTML Web Components for user interface

### 5.1 Chat UI

**Purpose:** Main chat interface using Lit HTML

**Features:**
- Message display (user/assistant)
- Tool call visualization
- Streaming responses
- Input with history
- Command palette (/clear, /export, etc.)

**Implementation:**
```javascript
// components/ui/chat-ui/src/chat-ui.js
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

export class ChatUi extends LitElement {
  static styles = css`
    :host { display: flex; flex-direction: column; height: 100%; }
    /* Tailwind utilities */
  `;

  static properties = {
    messages: { type: Array },
    inputText: { type: String },
    isLoading: { type: Boolean }
  };

  render() {
    return html`
      <div class="flex flex-col h-full">
        <div class="flex-1 overflow-y-auto p-4">
          ${this.messages.map(msg => this.renderMessage(msg))}
        </div>
        <div class="flex p-4 border-t">
          <textarea
            class="flex-1 p-3 border rounded-lg"
            .value="${this.inputText}"
            @input="${this.handleInput}"
          ></textarea>
        </div>
      </div>
    `;
  }
}
customElements.define('chat-ui', ChatUi);
```

**Files to Create:**
```
components/ui/chat-ui/
├── src/
│   ├── index.js
│   ├── chat-ui.js
│   └── message-renderer.js
├── tests/
│   ├── unit/
│   │   └── chat-ui.spec.html
│   └── integration/
│       └── chat-flow.spec.html
├── demo/
│   └── index.html
└── README.md
```

**Week 10, Days 1-5:**
- Day 1: Lit HTML setup and component structure
- Day 2: Message rendering
- Day 3: Input handling
- Day 4: Tool call display
- Day 5: Commands and features

### 5.2 Session Tree UI

**Purpose:** Visual session branching with Lit HTML

**Features:**
- Tree visualization
- Branch creation
- Node selection
- History view

**Week 10, Days 6-10:**
- Day 6: Tree layout component
- Day 7: Branching UI
- Day 8: Navigation
- Day 9: Persistence integration
- Day 10: Polish and styling

### 5.3 Tool Approval UI

**Purpose:** Review and approve dynamic tools

**Features:**
- Tool definition display
- JSON schema visualization
- Approve/Reject buttons
- Pending queue management

**Week 11, Days 1-3:**
- Day 1: Approval component
- Day 2: Tool display and validation
- Day 3: Queue management

### 5.4 Preview Engine

**Purpose:** Dynamically render UI components from agent

**Features:**
- Web Component registration
- Shadow DOM isolation
- Style encapsulation
- Event handling

**Implementation:**
```javascript
class PreviewEngine {
  async renderComponent(tagName, script, styles) {
    // Create script element
    const scriptEl = document.createElement('script');
    scriptEl.textContent = script;
    document.head.appendChild(scriptEl);
    
    // Create style element
    if (styles) {
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }
    
    // Component is now available for use
    return tagName;
  }
}
```

**Week 11, Days 4-7:**
- Day 4: Component registration system
- Day 5: Shadow DOM isolation
- Day 6: Style handling
- Day 7: Security and sandboxing

### 5.5 GitHub Loader UI

**Purpose:** Repository loading interface

**Features:**
- Owner/repo input
- Progress indicator
- File tree preview
- Error display

**Week 11, Days 8-10:**
- Day 8: Loader component
- Day 9: Progress and feedback
- Day 10: Integration

### Phase 5 Deliverables

- [ ] Chat UI (Lit HTML)
- [ ] Session Tree UI
- [ ] Tool Approval UI
- [ ] Preview Engine
- [ ] GitHub Loader UI
- [ ] All components tested
- [ ] Responsive design with Tailwind
- Day 3: Queue management

### 5.4 GitHub Loader UI

**Purpose:** Repository loading interface

**Features:**
- Owner/repo input
- Progress indicator
- File tree preview
- Error display

**Week 11, Days 4-5:**

### 5.5 Export UI

**Purpose:** Session export interface

**Features:**
- Format selection (JSONL/Markdown)
- Preview
- Download trigger

**Week 11, Days 6-7:**

### 5.6 Settings UI

**Purpose:** Configuration interface

**Features:**
- API key input
- Model selection
- Compaction settings
- Theme toggle

**Week 11, Days 8-10:**

### Phase 5 Deliverables

- [ ] Chat UI
- [ ] Session Tree UI
- [ ] Tool Approval UI
- [ ] GitHub Loader UI
- [ ] Export UI
- [ ] Settings UI
- [ ] All components tested
- [ ] Responsive design

---

## Phase 6: Integration & Delivery

**Status:** NOT STARTED  
**Duration:** 1 week (Week 12)  
**Dependencies:** Phase 5  
**Goal:** System integration and deployment

### 6.1 Main Application

**Files:**
```
www/
├── index.html          # Main entry
├── index.js            # App initialization
├── styles.css          # Global styles
└── app/
    ├── app.js          # Main app controller
    ├── router.js       # Simple routing
    └── state.js        # Global state management
```

**Week 12, Days 1-2:**
- App bootstrap
- Component wiring
- State management

### 6.2 End-to-End Testing

**Test Scenarios:**
1. Complete chat flow
2. Tool execution
3. Session branching
4. GitHub loading
5. Tool creation and approval
6. Session export
7. Error recovery

**Week 12, Days 3-4:**

### 6.3 Performance Optimization

**Tasks:**
- Bundle size analysis
- Lazy loading
- Caching strategies
- Worker optimization

**Week 12, Day 5:**

### 6.4 Documentation

**Documents:**
- User guide
- API reference
- Tool creation guide
- Deployment guide

**Week 12, Day 6:**

### 6.5 Deployment

**Setup:**
- GitHub Pages configuration
- Build scripts
- Release process

**Week 12, Days 7-10:**

### Phase 6 Deliverables

- [ ] Working application
- [ ] E2E tests passing
- [ ] Performance optimized
- [ ] Documentation complete
- [ ] Deployed to GitHub Pages
- [ ] Release v1.0.0

---

## Success Criteria

### Overall Project Success

The project is successful when:

1. **Functionality:**
   - ✅ Users can load GitHub repositories
   - ✅ Users can chat with AI about code
   - ✅ AI can read, write, and edit files
   - ✅ AI can create custom tools (with approval)
   - ✅ Sessions support branching
   - ✅ Sessions can be exported

2. **Quality:**
   - ✅ All phases complete
   - ✅ >90% test coverage
   - ✅ No critical bugs
   - ✅ Performance acceptable (<2s response time)

3. **Documentation:**
   - ✅ User guide complete
   - ✅ API documentation
   - ✅ Architecture documentation
   - ✅ Tool creation guide

4. **Deployment:**
   - ✅ Live on GitHub Pages
   - ✅ Works in Chrome, Firefox, Safari
   - ✅ Mobile responsive

---

## Risk Management

### High Risks

| Risk | Mitigation | Owner |
|------|-----------|-------|
| WASM complexity | Prototype early, test often | Dev 1 |
| LLM API costs | Use free tier, mock in tests | Dev 1 |
| Browser compatibility | Test in all browsers | Dev 2 |
| Performance issues | Profile early, optimize | Dev 1 |

### Medium Risks

| Risk | Mitigation | Owner |
|------|-----------|-------|
| Scope creep | Strict phase adherence | PM |
| Storage quota | Monitor usage, compress | Dev 1 |
| Security concerns | Code review, sandboxing | Dev 2 |

---

## Resource Requirements

### Development

- **Developers:** 1-2
- **Duration:** 12 weeks
- **Skills:**
  - JavaScript (ES2020+)
  - Web Components (Lit HTML)
  - Web Workers
  - IndexedDB, OPFS APIs
  - Web Platform APIs

### Tools

- Code editor (VS Code)
- Browser DevTools
- Rust toolchain
- Python (for local server)
- Git

### Services

- GitHub (repo, pages)
- Gemini API (free tier)

---

## Timeline Summary

| Phase | Duration | Start | End | Deliverables |
|-------|----------|-------|-----|--------------|
| 1: Core | 3 weeks | Week 1 | Week 3 | 5 core components ✓ |
| 2: Storage | 2 weeks | Week 4 | Week 5 | File Store, Global Store |
| 3: Tools | 2 weeks | Week 6 | Week 7 | Tool Registry, Executor, Built-ins |
| 4: Agent | 2 weeks | Week 8 | Week 9 | JS Web Worker, Session Mgmt |
| 5: UI | 2 weeks | Week 10 | Week 11 | Lit HTML Components |
| 6: Delivery | 1 week | Week 12 | Week 12 | Integration & deploy |
| **Total** | **12 weeks** | | | |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** if scope needs reduction
3. **Begin Phase 2** when ready
4. **Weekly check-ins** to track progress
5. **Adjust timeline** based on actual velocity

---

## Appendix A: Component Dependencies

```
Core (Phase 1) ← Storage (Phase 2) ← Tools (Phase 3) ← WASM (Phase 4) ← UI (Phase 5)
     ↑                ↑                  ↑                ↑              ↑
     └──────────────────────────────────────────────────────────────────┘
                              Main App (Phase 6)
```

## Appendix B: Technology Decisions

| Decision | Rationale |
|----------|-----------|
| JavaScript Web Worker | Performance, non-blocking UI, security isolation |
| Registry-Based Tools | Speed, portability, "install once, use everywhere" |
| Lit HTML | Efficient rendering, small footprint, Web Components |
| Tailwind CDN | No build, rapid styling |
| OPFS | Fast, private file storage |
| IndexedDB | Structured data, queries |
| ES Modules | Native, no bundlers |

## Appendix C: File Structure (Final)

```
aardvark/
├── components/             # Reusable modules
│   ├── core/               # Phase 1 (COMPLETE)
│   │   ├── event-bus/
│   │   ├── message-bridge/
│   │   ├── api-client/
│   │   ├── indexeddb-provider/
│   │   └── opfs-provider/
│   ├── storage/            # Phase 2
│   │   ├── file-store/
│   │   └── global-store/
│   ├── agent/              # Phases 3-4
│   │   ├── tool-registry/
│   │   ├── tool-executor/
│   │   ├── agent-core/
│   │   ├── session-manager/
│   │   └── context-builder/
│   └── ui/                 # Phase 5
│       ├── chat-ui/
│       ├── session-tree-ui/
│       ├── tool-approval-ui/
│       └── preview-engine/
│
├── src/                    # Application Entry
│   ├── main.js             # UI Entry point
│   └── agent/
│       ├── worker.js       # Agent Worker
│       └── protocol.js     # Message protocol
│
├── www/                    # Static assets
│   ├── index.html
│   ├── index.js
│   ├── app/
│   └── tests/
│
├── plans/                  # Documentation
│   ├── master-execution-plan.md
│   └── ...
│
└── tests/                  # Test suites
    ├── integration/
    └── e2e/
```

---

**Document Status:** Updated  
**Last Updated:** 2026-02-08  
**Author:** Development Team  
**Reviewers:** TBD
