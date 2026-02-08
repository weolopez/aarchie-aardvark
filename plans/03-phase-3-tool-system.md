# Phase 3 Plan: Tool System Implementation

## Overview

Phase 3 implements the registry-based tool system as defined in `ARCHITECTURE.md`. This includes the in-memory Tool Registry, Tool Executor with sandboxing, built-in tools, and dynamic tool creation capabilities.

**Goal**: Create a complete tool execution system that supports both built-in and user-created tools with proper security isolation.

**Duration**: 2 weeks (Weeks 6-7)
**Dependencies**: Phase 2 (File Store, Global Store)
**Deliverables**: Tool Registry, Tool Executor, 7 built-in tools, dynamic tool creation

---

## Components to Build

### 1. Tool Registry (`components/agent/tool-registry/`)
**Priority**: P0 (Critical - foundation for all tool operations)
**Effort**: 3 days

**Purpose**: In-memory tool management system loaded from IndexedDB Global Store

**Why First**: All tool operations depend on the registry. It provides the "brain's library" of available tools.

**Interface (Conceptual)**:
```javascript
interface ToolRegistry {
  // Lifecycle
  load(): Promise<void>;           // Hydrate from IndexedDB
  save(): Promise<void>;           // Persist to IndexedDB
  
  // Registry Management
  register(tool: Tool): void;      // Add to memory map
  unregister(name: string): void;  // Remove from memory map
  get(name: string): Tool | undefined;
  list(): Tool[];                  // All registered tools
  has(name: string): boolean;
  
  // Events
  on(event: string, handler: Function): () => void; // Unsubscribe function
}
```

**Tool Schema** (matches ARCHITECTURE.md):
```javascript
interface Tool {
  id: string;           // UUID primary key
  name: string;         // Unique handle (e.g., "read_file")
  version: number;      // Increment on updates
  func: string;         // JavaScript function as string
  schema: object;       // JSON Schema for parameters
  type: 'system' | 'user';
  permissions: string[]; // ['network', 'fs', 'ui']
  created: string;      // ISO timestamp
}
```

**Implementation Details**:
- In-memory `Map<string, Tool>` for O(1) lookups
- Hydration from IndexedDB on startup
- Tool validation on registration
- Event emission for registry changes
- Persistence of registry state

**Key Events**:
- `registry:loaded` - Registry hydrated from storage
- `tool:registered` - New tool added
- `tool:unregistered` - Tool removed
- `registry:persisted` - Changes saved to IndexedDB

**Testing Requirements**:
- [ ] Load from empty IndexedDB
- [ ] Load with existing tools
- [ ] Register new tool
- [ ] Unregister tool
- [ ] Get tool by name
- [ ] List all tools
- [ ] Persistence to IndexedDB
- [ ] Event emission
- [ ] Memory map consistency

**Files to Create**:
```
components/agent/tool-registry/
├── src/
│   ├── index.js              # Main export
│   ├── tool-registry.js      # Core implementation
│   ├── tool-validator.js     # Schema validation
│   └── constants.js          # Event names
├── tests/
│   ├── unit/
│   │   ├── tool-registry.spec.js
│   │   └── tool-validator.spec.js
│   └── integration/
│       ├── registry-persistence.spec.html
│       └── registry-events.spec.html
├── README.md
└── package.json
```

---

### 2. Tool Executor (`components/agent/tool-executor/`)
**Priority**: P0 (Critical - tool execution)
**Effort**: 4 days

**Purpose**: Sandboxed execution environment for tool functions

**Why Next**: Tools need to be executed safely with proper permissions and error handling.

**Interface (Conceptual)**:
```javascript
interface ToolExecutor {
  execute(name: string, args: object, context: ExecutionContext): Promise<ToolResult>;
}

interface ExecutionContext {
  fileStore: FileStore;           // For file operations
  postMessage: Function;          // For UI events (preview components)
  permissions: string[];          // Granted permissions
  repo: string;                   // Current repository
}

interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  duration?: number;
}
```

**Implementation Details**:
- Function creation via `new Function()` from tool.func string
- Sandboxed execution scope with limited globals
- Permission checking before execution
- Timeout protection (default 30 seconds)
- Error isolation and formatting
- Execution timing and metrics

**Sandbox Scope** (available globals in tool functions):
```javascript
const sandboxGlobals = {
  // File operations
  readFile: context.fileStore.read.bind(context.fileStore, context.repo),
  writeFile: context.fileStore.write.bind(context.fileStore, context.repo),
  listDir: context.fileStore.list.bind(context.fileStore, context.repo),
  
  // Network (if permitted)
  fetch: permissionGranted('network') ? globalThis.fetch : undefined,
  
  // UI (if permitted)
  postMessage: permissionGranted('ui') ? context.postMessage : undefined,
  
  // Utilities
  console: { log, warn, error },
  JSON: globalThis.JSON,
  Date: globalThis.Date,
  Math: globalThis.Math,
  // ... limited set
};
```

**Security Measures**:
- No access to `window`, `document`, `globalThis` except allowed APIs
- Permission-based API exposure
- Execution timeout
- Error sanitization (no stack traces to user)

**Testing Requirements**:
- [ ] Execute simple tool function
- [ ] Execute with arguments
- [ ] Handle tool errors gracefully
- [ ] Respect permissions (block unauthorized APIs)
- [ ] Timeout long-running tools
- [ ] File operations work in sandbox
- [ ] Network operations (when permitted)
- [ ] UI events (when permitted)

**Files to Create**:
```
components/agent/tool-executor/
├── src/
│   ├── index.js
│   ├── tool-executor.js
│   ├── sandbox.js              # Sandbox creation
│   ├── permissions.js          # Permission checking
│   └── utils.js                # Helper functions
├── tests/
│   ├── unit/
│   │   ├── tool-executor.spec.js
│   │   └── sandbox.spec.js
│   └── integration/
│       ├── tool-execution.spec.html
│       └── permission-enforcement.spec.html
├── README.md
└── package.json
```

---

### 3. Built-in Tools (`components/tools/built-ins/`)
**Priority**: P1 (High - core functionality)
**Effort**: 5 days

**Purpose**: Essential tools for file operations, search, and JavaScript execution

**Why Important**: These provide the basic capabilities users expect from a coding agent.

**Tools to Implement**:

#### 3.1 File Tools

**read-tool** (`read(path, options?)`):
- Read file contents with optional line range
- Parameters: `{ path: string, startLine?: number, endLine?: number }`
- Permissions: `['fs']`
- Returns: `{ content: string, lines: number }`

**write-tool** (`write(path, content, options?)`):
- Write or overwrite file
- Parameters: `{ path: string, content: string, createDirs?: boolean }`
- Permissions: `['fs']`
- Returns: `{ success: boolean, bytesWritten: number }`

**edit-tool** (`edit(path, oldString, newString)`):
- Surgical find-and-replace
- Parameters: `{ path: string, oldString: string, newString: string }`
- Permissions: `['fs']`
- Returns: `{ success: boolean, matches: number }`

#### 3.2 Directory Tools

**ls-tool** (`ls(path, options?)`):
- List directory contents
- Parameters: `{ path: string, detailed?: boolean, recursive?: boolean }`
- Permissions: `['fs']`
- Returns: `Array<{ name: string, type: 'file'|'dir', size?: number, modified?: Date }>`

#### 3.3 Search Tools

**grep-tool** (`grep(pattern, path, options?)`):
- Search file contents with regex
- Parameters: `{ pattern: string, path: string, caseSensitive?: boolean, wholeWord?: boolean }`
- Permissions: `['fs']`
- Returns: `Array<{ file: string, line: number, content: string, matches: string[] }>`

**find-tool** (`find(pattern, path, options?)`):
- Find files by name pattern
- Parameters: `{ pattern: string, path: string, type?: 'file'|'dir' }`
- Permissions: `['fs']`
- Returns: `Array<{ path: string, type: 'file'|'dir', size?: number }>`

#### 3.4 JavaScript Tool

**js-tool** (`js(code, options?)`):
- Execute JavaScript code in sandbox
- Parameters: `{ code: string, timeout?: number }`
- Permissions: `['js']` (allows access to additional globals)
- Returns: `{ result: any, executionTime: number }`

**Implementation Details**:
- Each tool is a simple async function
- Consistent parameter validation using JSON Schema
- Proper error handling and user-friendly messages
- Integration with Tool Registry for registration

**Testing Requirements** (per tool):
- [ ] Valid execution with correct parameters
- [ ] Error handling for invalid parameters
- [ ] Error handling for file system errors
- [ ] Permission enforcement
- [ ] Output format validation

**Files to Create**:
```
components/tools/built-ins/
├── src/
│   ├── index.js              # Registers all built-in tools
│   ├── file-tools/
│   │   ├── read.js
│   │   ├── write.js
│   │   └── edit.js
│   ├── dir-tools/
│   │   └── ls.js
│   ├── search-tools/
│   │   ├── grep.js
│   │   └── find.js
│   └── js-tool/
│       └── js.js
├── tests/
│   ├── unit/
│   │   ├── file-tools.spec.js
│   │   ├── dir-tools.spec.js
│   │   ├── search-tools.spec.js
│   │   └── js-tool.spec.js
│   └── integration/
│       └── built-in-tools.spec.html
├── README.md
└── package.json
```

---

### 4. Dynamic Tool Creation (`components/agent/dynamic-tool-creator/`)
**Priority**: P1 (High - user extensibility)
**Effort**: 3 days

**Purpose**: Allow LLM to create new tools that persist globally

**Why Important**: Enables the agent to extend its own capabilities with user approval.

**Interface (Conceptual)**:
```javascript
interface DynamicToolCreator {
  createFromSpec(spec: ToolSpec): Promise<PendingTool>;
  validateSpec(spec: ToolSpec): ValidationResult;
}

interface ToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
  func: string;        // JavaScript function body
  permissions: string[];
}

interface PendingTool extends ToolSpec {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created: string;
  requestedBy: 'llm' | 'user';
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

**Implementation Details**:
- JSON Schema validation for parameters
- JavaScript syntax checking for func
- Permission validation (only allow known permissions)
- Name uniqueness checking
- Integration with Global Store for pending tools

**Validation Rules**:
- Name: alphanumeric + hyphens, 3-50 chars, unique
- Description: 10-500 chars
- Parameters: Valid JSON Schema
- Func: Valid JavaScript function body, no dangerous constructs
- Permissions: Subset of `['network', 'fs', 'ui']`

**Workflow**:
1. LLM generates ToolSpec
2. DynamicToolCreator validates and creates PendingTool
3. PendingTool saved to Global Store
4. Event emitted: `tool:pending`
5. UI shows approval dialog
6. User approves -> Tool registered and persisted
7. User rejects -> PendingTool marked rejected

**Testing Requirements**:
- [ ] Validate correct tool spec
- [ ] Reject invalid name
- [ ] Reject invalid JavaScript
- [ ] Reject unknown permissions
- [ ] Create pending tool
- [ ] Persist to Global Store
- [ ] Event emission

**Files to Create**:
```
components/agent/dynamic-tool-creator/
├── src/
│   ├── index.js
│   ├── dynamic-tool-creator.js
│   ├── tool-spec-validator.js
│   └── js-syntax-checker.js
├── tests/
│   ├── unit/
│   │   ├── tool-spec-validator.spec.js
│   │   └── js-syntax-checker.spec.js
│   └── integration/
│       └── dynamic-creation.spec.html
├── README.md
└── package.json
```

---

## Integration Points

### With Phase 2 Components

**File Store**: Used by Tool Executor for file operations in sandbox
**Global Store**: Used by Tool Registry for persistence and by Dynamic Tool Creator for pending tools
**Settings Store**: Could store tool execution timeouts, default permissions

### Event Bus Integration

**Events Published**:
- `tool:pending` - New tool awaiting approval
- `tool:registered` - Tool added to registry
- `tool:unregistered` - Tool removed from registry
- `tool:executed` - Tool execution completed

**Events Consumed**:
- `tool:approve` - User approved pending tool
- `tool:reject` - User rejected pending tool

### Web Worker Communication

**Messages Sent to Main Thread**:
- `tool_pending` - Request user approval for new tool
- `tool_result` - Execution result (for UI display)

**Messages Received from Main Thread**:
- `approve_tool` - User approved tool creation
- `reject_tool` - User rejected tool creation

---

## Security Considerations

### Tool Sandboxing
- Limited global scope in execution
- Permission-based API access
- Execution timeouts
- Error isolation

### Dynamic Tool Validation
- Syntax checking before registration
- Permission restrictions
- User approval required
- No automatic execution

### Audit Trail
- All tool executions logged
- Tool creation tracked
- Permission usage monitored

---

## Testing Strategy

### Unit Tests
- Individual component functionality
- Error conditions
- Edge cases

### Integration Tests
- Tool Registry ↔ Global Store
- Tool Executor ↔ File Store
- Dynamic creation workflow
- End-to-end tool execution

### Browser Compatibility
- Test in Chrome, Firefox, Safari
- Verify OPFS and IndexedDB support
- Check Web Worker functionality

---

## Timeline & Milestones

### Week 6: Core Infrastructure
**Days 1-3**: Tool Registry implementation and testing
**Days 4-7**: Tool Executor with sandboxing

### Week 7: Tools & Features
**Days 1-3**: Built-in tools implementation
**Days 4-5**: Dynamic tool creation
**Days 6-7**: Integration testing and documentation

### Key Milestones
- **End of Week 6**: Registry and Executor working
- **End of Week 7**: All built-in tools functional, dynamic creation working
- **Phase Complete**: Full tool system integrated with Phase 2 storage

---

## Success Criteria

### Functionality
- [ ] Tool Registry loads from IndexedDB on startup
- [ ] All 7 built-in tools execute correctly
- [ ] Tool Executor properly sandboxes execution
- [ ] Dynamic tool creation works with user approval
- [ ] Tools persist across sessions

### Security
- [ ] Sandbox prevents unauthorized access
- [ ] Permissions enforced correctly
- [ ] User approval required for new tools
- [ ] No execution of unapproved tools

### Performance
- [ ] Tool lookup is fast (< 1ms)
- [ ] Tool execution has reasonable timeouts
- [ ] Memory usage stays bounded

### Quality
- [ ] All components have unit tests (>90% coverage)
- [ ] Integration tests pass
- [ ] Documentation complete
- [ ] Browser compatibility verified

---

## Dependencies & Prerequisites

### Code Dependencies
- Phase 2: File Store, Global Store
- Core: Event Bus, Message Bridge

### External Dependencies
- None (pure JavaScript)

### Browser Requirements
- ES2020+ support
- Web Workers
- IndexedDB
- OPFS (Origin Private File System)

---

## Risk Mitigation

### Technical Risks
- **Sandbox Escape**: Comprehensive testing of sandbox boundaries
- **Performance Issues**: Profile tool execution, implement timeouts
- **Browser Compatibility**: Test in all target browsers early

### Timeline Risks
- **Complex Sandboxing**: Allocate extra time for security testing
- **Tool Validation**: Ensure validation logic is robust

### Mitigation Actions
- Early prototyping of sandboxing approach
- Pair programming for security-critical code
- Regular integration testing with Phase 2 components

---

**Document Status:** Draft  
**Last Updated:** 2026-02-08  
**Author:** Development Team  
**Reviewers:** TBD
