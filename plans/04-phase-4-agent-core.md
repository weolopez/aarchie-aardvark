# Phase 4 Plan: Agent Core Implementation

## Overview

Phase 4 implements the Agent Core as defined in `ARCHITECTURE.md`. This includes the JavaScript Web Worker agent, LLM integration, Session Manager with conversation trees, Context Builder for prompt optimization, and Web Worker communication infrastructure.

**Goal**: Create a fully functional AI coding agent that can maintain conversations, execute tools safely, and provide intelligent assistance with proper context management and session persistence.

**Duration**: 2 weeks (Weeks 8-9)
**Dependencies**: Phase 3 (Tool Registry), Phase 2 (File Store, Global Store), Phase 1 (API Client, Message Bridge, Event Bus)
**Deliverables**: Agent Core, Session Manager, Context Builder, Web Worker Integration, Tool Executor

**Status**: NOT STARTED
**Priority**: P0 (Critical - enables the actual AI agent functionality)

---

## Components to Build

### 1. Tool Executor (`components/agent/tool-executor/`)
**Priority**: P0 (Critical - enables safe tool execution)
**Effort**: 4 days

**Purpose**: Sandboxed execution environment for tool functions with permission enforcement

**Why First**: Agent cannot function without the ability to safely execute tools. This was planned for Phase 3 but deferred.

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

**Tool Function Format**:
```javascript
// Tools are stored as JavaScript function strings
const toolFunction = `
async ({ param1, param2 }, context) => {
  // Tool implementation
  // Has access to context.fileStore, context.postMessage, etc.
  return result;
}
`;
```

**Implementation Details**:
- Function creation via `new Function()` from tool.func string
- Sandboxed execution scope with limited globals
- Permission checking before execution
- Timeout protection (default 30 seconds)
- Error isolation and formatting
- Execution timing and metrics

**Sandbox Scope** (available in tool functions):
```javascript
const sandboxGlobals = {
  // File operations (if 'fs' permission)
  readFile: context.fileStore.read.bind(context.fileStore, context.repo),
  writeFile: context.fileStore.write.bind(context.fileStore, context.repo),
  listDir: context.fileStore.list.bind(context.fileStore, context.repo),

  // Network (if 'network' permission)
  fetch: permissionGranted('network') ? globalThis.fetch : undefined,

  // UI (if 'ui' permission)
  postMessage: permissionGranted('ui') ? context.postMessage : undefined,

  // Utilities (always available)
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
- Execution timeout with AbortController
- Error sanitization (no stack traces to user)
- Memory usage limits

**Testing Requirements**:
- [ ] Execute simple tool function
- [ ] Execute with arguments and context
- [ ] Handle tool errors gracefully
- [ ] Respect permissions (block unauthorized APIs)
- [ ] Timeout long-running tools
- [ ] File operations work in sandbox
- [ ] Network operations (when permitted)
- [ ] UI events (when permitted)
- [ ] Memory and security isolation

**Files to Create**:
```
components/agent/tool-executor/
├── src/
│   ├── index.js              # Main export
│   ├── tool-executor.js      # Core execution engine
│   ├── sandbox.js            # Sandbox creation and management
│   ├── permissions.js        # Permission checking utilities
│   └── utils.js              # Helper functions
├── tests/
│   ├── unit/
│   │   ├── tool-executor.spec.js
│   │   ├── sandbox.spec.js
│   │   └── permissions.spec.js
│   └── integration/
│       ├── tool-execution.spec.html
│       └── permission-enforcement.spec.html
├── README.md
└── package.json
```

**Week 8, Days 1-4:**
- Day 1: Tool Executor core structure and function execution
- Day 2: Sandbox implementation with permission system
- Day 3: Error handling and timeout protection
- Day 4: Integration with Tool Registry and testing

### 2. Agent Core (`components/agent/agent-core/`)
**Priority**: P0 (Critical - main agent logic)
**Effort**: 5 days

**Purpose**: Main agent logic running in Web Worker with LLM integration

**Why Next**: Core agent functionality depends on tool execution being available.

**Interface (Conceptual)**:
```javascript
interface AgentCore {
  init(config: AgentConfig): Promise<void>;
  chat(message: string, sessionId: string): Promise<ChatResponse>;
  executeTool(name: string, args: object): Promise<ToolResult>;
  approveTool(toolId: string): Promise<void>;
  loadRepository(owner: string, repo: string): Promise<void>;
}

interface AgentConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
}
```

**LLM Integration**:
```javascript
// Message format for LLM API
const messages = [
  {
    role: 'system',
    content: `You are Aardvark, an AI coding assistant. You have access to tools for file operations, code execution, and UI generation.`
  },
  {
    role: 'user',
    content: userMessage
  },
  {
    role: 'assistant',
    content: assistantMessage,
    tool_calls: toolCalls
  },
  {
    role: 'tool',
    tool_call_id: callId,
    content: toolResult
  }
];
```

**Agent Loop**:
```javascript
async function chatLoop(message, sessionId) {
  // 1. Load session context
  const history = await sessionManager.getHistory(sessionId);

  // 2. Build context with file information
  const context = await contextBuilder.buildContext(message, history, currentRepo);

  // 3. Send to LLM with tool definitions
  const response = await apiClient.chat({
    messages: context.messages,
    tools: toolRegistry.list().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema
      }
    }))
  });

  // 4. Handle tool calls
  if (response.tool_calls) {
    for (const toolCall of response.tool_calls) {
      const result = await toolExecutor.execute(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments),
        executionContext
      );

      // Add tool result to conversation
      history.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }

    // Continue conversation with tool results
    return await chatLoop(message, sessionId);
  }

  // 5. Save to session
  await sessionManager.saveMessage(sessionId, {
    role: 'assistant',
    content: response.content,
    usage: response.usage
  });

  return response;
}
```

**Features:**
- Message passing with main thread via Message Bridge
- LLM API integration with streaming support
- Tool orchestration and execution
- Session management integration
- Context building and compaction
- Error handling and recovery

**Files to Create**:
```
components/agent/agent-core/
├── src/
│   ├── index.js              # Main export
│   ├── agent-core.js         # Core agent logic
│   ├── llm-client.js         # LLM API integration
│   ├── tool-dispatcher.js    # Tool execution coordination
│   ├── message-handler.js    # Web Worker message handling
│   └── config.js             # Agent configuration
├── tests/
│   ├── unit/
│   │   ├── agent-core.spec.js
│   │   ├── llm-client.spec.js
│   │   └── tool-dispatcher.spec.js
│   └── integration/
│       ├── agent-chat-loop.spec.html
│       └── tool-execution-flow.spec.html
├── README.md
└── package.json
```

**Week 8, Days 5-7 & Week 9, Days 1-3:**
- Days 5-7: Agent core structure, LLM integration, tool dispatching
- Week 9, Day 1: Message handling and Web Worker protocol
- Week 9, Day 2: Error handling and recovery
- Week 9, Day 3: Integration testing with all components

### 3. Session Manager (`components/agent/session-manager/`)
**Priority**: P1 (High - conversation persistence)
**Effort**: 3 days

**Purpose**: Handle conversation trees and branching with IndexedDB persistence

**Why Next**: Sessions are fundamental to maintaining conversation context.

**Interface (Conceptual)**:
```javascript
interface SessionManager {
  createSession(name: string): Promise<string>;
  loadSession(sessionId: string): Promise<Session>;
  saveSession(sessionId: string, session: Session): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(): Promise<SessionSummary[]>;

  // Conversation tree operations
  createNode(sessionId: string, parentId: string, content: MessageNode): Promise<string>;
  branch(sessionId: string, fromNodeId: string): Promise<string>;
  getHistory(sessionId: string, nodeId?: string): Promise<MessageNode[]>;
  getBranches(sessionId: string): Promise<BranchInfo[]>;
}

interface MessageNode {
  id: string;
  parentId?: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: string;
  usage?: TokenUsage;
}

interface Session {
  id: string;
  name: string;
  created: string;
  updated: string;
  currentBranch: string;
  branches: { [branchId: string]: MessageNode[] };
}
```

**Tree Structure**:
```
Session
├── Branch A (current)
│   ├── Node 1 (user message)
│   ├── Node 2 (assistant response + tool calls)
│   ├── Node 3 (tool results)
│   └── Node 4 (assistant follow-up)
└── Branch B (alternative)
    ├── Node 1 (user message)
    └── Node 5 (different assistant response)
```

**Features:**
- Tree-based conversation storage
- Branching support for exploring alternatives
- History reconstruction for LLM context
- Persistence to Global Store (IndexedDB)
- Session metadata and statistics

**Files to Create**:
```
components/agent/session-manager/
├── src/
│   ├── index.js              # Main export
│   ├── session-manager.js    # Core session management
│   ├── tree-manager.js       # Conversation tree operations
│   ├── branch-manager.js     # Branch creation and management
│   └── persistence.js        # IndexedDB integration
├── tests/
│   ├── unit/
│   │   ├── session-manager.spec.js
│   │   ├── tree-manager.spec.js
│   │   └── branch-manager.spec.js
│   └── integration/
│       ├── session-persistence.spec.html
│       └── conversation-tree.spec.html
├── README.md
└── package.json
```

**Week 9, Days 4-6:**
- Day 4: Session CRUD operations and persistence
- Day 5: Conversation tree structure and navigation
- Day 6: Branching functionality and history reconstruction

### 4. Context Builder (`components/agent/context-builder/`)
**Priority**: P1 (High - prompt optimization)
**Effort**: 3 days

**Purpose**: Build optimized context for LLM requests with file content and conversation history

**Why Next**: Efficient context management is crucial for LLM performance and cost.

**Interface (Conceptual)**:
```javascript
interface ContextBuilder {
  buildContext(message: string, history: MessageNode[], repo: string): Promise<LLMContext>;
  shouldCompact(tokenCount: number): boolean;
  compact(history: MessageNode[]): Promise<MessageNode[]>;
  addFileContext(context: LLMContext, filePath: string, relevance: number): Promise<LLMContext>;
  estimateTokens(content: string): number;
}

interface LLMContext {
  messages: LLMMessage[];
  tokenCount: number;
  fileContext: FileContext[];
  systemPrompt: string;
}

interface FileContext {
  path: string;
  content: string;
  relevance: number; // 0-1 score
  tokenCount: number;
}
```

**Context Building Process**:
```javascript
async function buildContext(message, history, repo) {
  // 1. Start with system prompt
  const context = {
    messages: [{
      role: 'system',
      content: await buildSystemPrompt()
    }],
    tokenCount: 0,
    fileContext: []
  };

  // 2. Add recent conversation history
  const recentHistory = history.slice(-10); // Last 10 messages
  for (const node of recentHistory) {
    context.messages.push(nodeToLLMMessage(node));
    context.tokenCount += estimateTokens(node.content);
  }

  // 3. Add current user message
  context.messages.push({
    role: 'user',
    content: message
  });
  context.tokenCount += estimateTokens(message);

  // 4. Add relevant file context
  const relevantFiles = await findRelevantFiles(message, repo);
  for (const file of relevantFiles) {
    if (context.tokenCount + file.tokenCount < MAX_TOKENS) {
      await addFileContext(context, file.path, file.relevance);
    }
  }

  // 5. Compact if needed
  if (shouldCompact(context.tokenCount)) {
    context.messages = await compact(context.messages);
  }

  return context;
}
```

**Features:**
- Token counting and management (approximate)
- File content inclusion based on relevance
- Automatic conversation compaction
- System prompt optimization
- Context window management

**Relevance Scoring**:
```javascript
function calculateRelevance(message, filePath, fileContent) {
  // Simple relevance scoring based on:
  // - File path matches keywords in message
  // - Content contains keywords from message
  // - File is recently modified
  // - File is in current working directory
}
```

**Files to Create**:
```
components/agent/context-builder/
├── src/
│   ├── index.js              # Main export
│   ├── context-builder.js    # Main context building logic
│   ├── token-manager.js      # Token counting and limits
│   ├── file-relevance.js     # File relevance scoring
│   ├── compaction.js         # History compaction
│   └── system-prompt.js      # System prompt generation
├── tests/
│   ├── unit/
│   │   ├── context-builder.spec.js
│   │   ├── token-manager.spec.js
│   │   └── file-relevance.spec.js
│   └── integration/
│       ├── context-building.spec.html
│       └── compaction.spec.html
├── README.md
└── package.json
```

**Week 9, Days 7-9:**
- Day 7: Context building with conversation history
- Day 8: File relevance and content inclusion
- Day 9: Token management and compaction logic

### 5. Web Worker Integration
**Priority**: P1 (High - communication infrastructure)
**Effort**: 2 days

**Purpose**: Web Worker entry point and message protocol implementation

**Why Last**: Depends on all other components being available.

**Message Protocol**:
```javascript
// Main Thread → Worker
interface WorkerMessage {
  type: string;
  id: string; // For request/response correlation
  payload: any;
}

// Worker → Main Thread
interface MainMessage {
  type: string;
  id: string;
  payload: any;
  error?: string;
}

// Message Types
const MESSAGE_TYPES = {
  // Initialization
  INIT: 'init',
  READY: 'ready',

  // Chat
  CHAT: 'chat',
  CHAT_RESPONSE: 'chat_response',
  CHAT_STREAM: 'chat_stream',

  // Tools
  EXECUTE_TOOL: 'execute_tool',
  TOOL_RESULT: 'tool_result',
  APPROVE_TOOL: 'approve_tool',
  TOOL_APPROVED: 'tool_approved',

  // Sessions
  LOAD_SESSION: 'load_session',
  SAVE_SESSION: 'save_session',
  CREATE_SESSION: 'create_session',
  SESSION_LOADED: 'session_loaded',

  // Repository
  LOAD_REPO: 'load_repo',
  REPO_LOADED: 'repo_loaded',

  // UI Events
  PREVIEW_COMPONENT: 'preview_component',
  SHOW_NOTIFICATION: 'show_notification',

  // Errors
  ERROR: 'error'
};
```

**Worker Entry Point**:
```javascript
// src/agent/worker.js
import { AgentCore } from './agent-core/index.js';
import { MessageHandler } from './message-handler.js';

let agentCore = null;

self.onmessage = async (event) => {
  const { type, id, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        agentCore = new AgentCore(payload.config);
        await agentCore.init();
        self.postMessage({ type: 'ready', id, payload: { toolCount: agentCore.toolCount } });
        break;

      case 'chat':
        const response = await agentCore.chat(payload.message, payload.sessionId);
        self.postMessage({ type: 'chat_response', id, payload: response });
        break;

      // ... other message handlers
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, payload: { message: error.message } });
  }
};
```

**Files to Create**:
```
src/agent/
├── worker.js                # Web Worker entry point
├── agent.js                 # Main thread agent instantiation
├── protocol.js              # Message protocol constants
└── message-handler.js       # Message handling utilities

tests/integration/
├── worker-communication.spec.html
└── end-to-end-agent.spec.html
```

**Week 9, Days 10-11:**
- Day 10: Web Worker setup and message protocol
- Day 11: Integration testing and error handling

---

## UI Demo Creation Process

**Following Existing Standards**: All demos are created in `/www/components/` directory following the established pattern.

**For Each Component:**
1. **After tests pass**: Create `www/components/agent/{component-name}/index.html`
2. **Follow existing patterns**: Use same structure as `www/components/agent/tool-registry/index.html`
3. **Interactive functionality**: Demonstrate real component usage with user interaction
4. **Consistent styling**: Use Tailwind CSS and existing design patterns

**Demo Locations:**
- Tool Executor: `www/components/agent/tool-executor/index.html`
- Agent Core: `www/components/agent/agent-core/index.html`
- Session Manager: `www/components/agent/session-manager/index.html`
- Context Builder: `www/components/agent/context-builder/index.html`

---

## Integration Points

### Phase 1 Component Integrations

**API Client Integration:**
- Agent Core uses API Client for LLM communication
- Streaming response handling with Message Bridge
- Token usage tracking and limits
- Error handling for API failures
- Model selection and configuration

**Message Bridge Integration:**
- Web Worker ↔ Main thread communication
- Message protocol implementation
- Event forwarding between threads
- Tool approval workflow messaging
- UI component preview messaging

**Event Bus Integration:**
- System-wide event notifications
- Tool execution events
- Session state changes
- Repository loading events
- Error and status broadcasting

### Phase 2 Component Integrations

**File Store Integration:**
- Repository file access for context building
- File content inclusion in LLM prompts
- GitHub repository loading via API Client
- File operation permissions in tool execution
- Context compaction based on file relevance

**Global Store Integration:**
- Tool Registry persistence (load/save tools)
- Session tree storage and retrieval
- Pending tool approval queue
- User settings and preferences
- IndexedDB transaction management

**Session Store Integration:**
- Conversation tree persistence
- Branch management and history
- Session metadata storage
- Cross-session context sharing

### Phase 3 Component Integrations

**Tool Registry Integration:**
- In-memory tool management for Agent Core
- Tool validation and registration
- Event-driven tool updates
- Registry hydration on startup
- Tool lookup and execution dispatch

**Tool Executor Integration:**
- Sandboxed tool execution environment
- Permission enforcement per tool
- Execution timeout handling
- Error isolation and reporting
- Context passing (file access, UI events)

### Phase 5 Component Dependencies (Future)

**UI Component Integration Points:**
- Chat UI for message display and input
- Tool Approval UI for pending tool workflows
- Session Tree UI for conversation branching
- File Browser UI for repository navigation
- Export UI for conversation export

---

## Testing Strategy

### Unit Testing
- **Tool Executor**: Sandbox isolation, permission enforcement, error handling
- **Agent Core**: LLM integration, tool dispatching, message handling
- **Session Manager**: Tree operations, persistence, branching
- **Context Builder**: Token counting, relevance scoring, compaction

### Integration Testing
- **Cross-Component**: Agent Core ↔ Tool Registry ↔ Tool Executor
- **Web Worker**: Message passing, protocol compliance
- **Storage**: Session persistence, tool registry hydration
- **End-to-End**: Complete chat loop with tool execution

### Performance Testing
- **Context Building**: Token counting accuracy and speed
- **Tool Execution**: Timeout enforcement, memory limits
- **Session Operations**: Tree traversal and persistence speed
- **LLM Integration**: Response streaming and error recovery

### Security Testing
- **Sandbox Isolation**: Tool execution cannot access unauthorized APIs
- **Permission Enforcement**: Tools respect granted permissions
- **Input Validation**: LLM responses and tool arguments are validated
- **Error Handling**: No sensitive information leaked in errors

---

## Success Criteria

### Functionality
- [ ] Tool Executor properly sandboxes execution with permissions
- [ ] Agent Core maintains conversation context and executes tools
- [ ] Session Manager handles conversation trees and branching
- [ ] Context Builder optimizes prompts with relevant file content
- [ ] Web Worker integration enables responsive UI
- [ ] LLM integration supports tool calling and streaming
- [ ] Tool approval workflow functions end-to-end

### Security
- [ ] Sandbox prevents unauthorized access to browser APIs
- [ ] Tool permissions are enforced correctly
- [ ] User approval required for new tools and UI components
- [ ] No execution of unapproved tools or components
- [ ] Error messages don't leak sensitive information

### Performance
- [ ] Tool execution has reasonable timeouts (< 30s default)
- [ ] Context building completes within 2 seconds
- [ ] Session operations are fast (< 100ms)
- [ ] Memory usage stays bounded during long conversations
- [ ] LLM API calls are efficient (appropriate token usage)

### Quality
- [ ] All components have unit tests (>90% coverage)
- [ ] Integration tests pass end-to-end scenarios
- [ ] Documentation complete with examples
- [ ] Browser compatibility verified (Chrome, Firefox, Safari)
- [ ] Error handling graceful and informative

---

## Timeline and Milestones

### Week 8: Foundation (Days 1-7)
**Focus**: Tool execution and core agent logic
- **Day 1-4**: Tool Executor implementation and testing
- **Day 5-7**: Agent Core structure and LLM integration
**Milestone**: Agent can execute tools safely in sandbox

### Week 9: Advanced Features (Days 8-11)
**Focus**: Session management, context optimization, and integration
- **Day 8-9**: Session Manager and Context Builder
- **Day 10-11**: Web Worker integration and end-to-end testing
**Milestone**: Complete agent with conversation persistence

### Week 9 Deliverables
- [ ] Tool Executor with sandboxing (4 days)
- [ ] Agent Core with LLM integration (3 days)
- [ ] Session Manager with trees (3 days)
- [ ] Context Builder with optimization (3 days)
- [ ] Web Worker integration (2 days)
- [ ] Full integration testing (2 days)

---

## Risk Mitigation

### Technical Risks
- **Sandbox Escape**: Comprehensive testing of sandbox boundaries, security review
- **LLM API Issues**: Robust error handling, fallback strategies, rate limiting
- **Performance Problems**: Profile execution paths, implement caching, monitor memory usage
- **Web Worker Complexity**: Thorough testing of message passing, clear protocol documentation

### Timeline Risks
- **Complex Integration**: Build incrementally with integration tests at each step
- **LLM API Learning**: Allocate time for understanding tool calling format and streaming
- **Context Management**: Start with simple context, add optimization iteratively

### Mitigation Actions
- Daily integration testing between components
- Early prototyping of Web Worker communication
- Security review of Tool Executor sandbox
- Performance profiling throughout development
- Pair programming for complex LLM integration

---

## Dependencies & Prerequisites

### Code Dependencies
- **Phase 3**: Tool Registry ✅ (Complete)
- **Phase 2**: File Store, Global Store ✅ (Available)
- **Phase 1**: API Client, Message Bridge, Event Bus ✅ (Complete)

### External Dependencies
- **LLM API**: OpenAI/Anthropic API access for testing
- **Web Workers**: Modern browser support required
- **IndexedDB**: For session persistence
- **ES2020+**: Native modules, dynamic imports

### Development Prerequisites
- **API Keys**: Valid LLM API credentials for testing
- **Test Repository**: Sample GitHub repo for context testing
- **Browser DevTools**: For Web Worker debugging
- **Performance Tools**: Memory and CPU profiling

---

**Document Status:** Draft  
**Last Updated:** 2026-02-08  
**Author:** Development Team  
**Reviewers:** TBD</content>
<parameter name="filePath">/Users/weo/Development/aardvark/plans/04-phase-4-agent-core.md
