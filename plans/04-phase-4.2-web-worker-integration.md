# Phase 4.2 Plan: Web Worker Integration

## 1. Component Integration
### Sequence Diagrams for Component Integrations

#### File Store: Repository File Access

```mermaid
sequenceDiagram
	participant UI as User Interface
	participant Main as Main Thread
	participant Worker as Web Worker
	participant FileStore as File Store

	UI->>Main: Request file content (repo, path)
	Main->>Worker: postMessage(load_file)
	Worker->>FileStore: fetch file content
	FileStore-->>Worker: file content
	Worker->>Main: postMessage(file_content)
	Main->>UI: Display file content
```

#### Global Store: Tool Registry Persistence

```mermaid
sequenceDiagram
	participant UI as User Interface
	participant Main as Main Thread
	participant Worker as Web Worker
	participant GlobalStore as Global Store

	UI->>Main: Add new tool
	Main->>Worker: postMessage(add_tool)
	Worker->>GlobalStore: save tool to registry
	GlobalStore-->>Worker: confirmation
	Worker->>Main: postMessage(tool_added)
	Main->>UI: Update tool list
```

#### Session Store: Conversation Tree Management

```mermaid
sequenceDiagram
	participant UI as User Interface
	participant Main as Main Thread
	participant Worker as Web Worker
	participant SessionStore as Session Store

	UI->>Main: Start new session branch
	Main->>Worker: postMessage(new_branch)
	Worker->>SessionStore: create branch
	SessionStore-->>Worker: branch created
	Worker->>Main: postMessage(branch_created)
	Main->>UI: Display new session branch
```

**Action Steps:**
- Implement File Store integration in worker.js for repository file access and context building.
- Connect Global Store for tool registry, session tree, and settings persistence.
- Integrate Session Store for conversation tree and session metadata management.

**Deliverables:**
- Updated worker.js with File Store, Global Store, and Session Store logic.
- Verified storage and retrieval operations for all stores.

## 2. Web Worker Implementation

**Action Steps:**
- Extend worker.js to handle file operations, session updates, and tool registry actions.
- Add message handlers for file access, session updates, and tool approval.
- Implement permission checks and robust error handling.

**Deliverables:**
- worker.js supporting all new actions and error scenarios.
- Message handler unit tests.

## 3. Message Protocol Extension

**Action Steps:**
- Define and document new protocol messages for file, session, and tool actions.
- Update protocol.js for validation and serialization/deserialization.

**Deliverables:**
- Updated protocol.js and documentation.
- Protocol tests for new message types.

## 4. Integration Testing

**Action Steps:**
- Write unit tests for worker message handlers.
- Test IndexedDB persistence for tool registry and session tree.

**Deliverables:**
- Passing unit tests for all handlers.
- Verified IndexedDB operations.

## 5. End-to-End Testing (E2E)
### Sequence Diagrams for E2E Test Use Cases

#### E2E: Chat Interaction

```mermaid
sequenceDiagram
	participant User as User
	participant UI as UI
	participant Main as Main Thread
	participant Worker as Web Worker
	participant Agent as Agent Core

	User->>UI: Enter chat message
	UI->>Main: Send chat message
	Main->>Worker: postMessage(chat)
	Worker->>Agent: process chat
	Agent-->>Worker: streaming response
	Worker->>Main: postMessage(step)
	Main->>UI: Display streaming response
```

#### E2E: Tool Approval Workflow

```mermaid
sequenceDiagram
	participant User as User
	participant UI as UI
	participant Main as Main Thread
	participant Worker as Web Worker
	participant Agent as Agent Core

	Agent->>Worker: tool_pending
	Worker->>Main: postMessage(tool_pending)
	Main->>UI: Show tool approval dialog
	User->>UI: Approve tool
	UI->>Main: Send approval
	Main->>Worker: postMessage(approve_tool)
	Worker->>Agent: execute tool
	Agent-->>Worker: tool result
	Worker->>Main: postMessage(step)
	Main->>UI: Display tool result
```

#### E2E: File Access Permissions

```mermaid
sequenceDiagram
	participant User as User
	participant UI as UI
	participant Main as Main Thread
	participant Worker as Web Worker
	participant FileStore as File Store

	User->>UI: Request file access
	UI->>Main: Send file access request
	Main->>Worker: postMessage(load_file)
	Worker->>FileStore: check permissions
	FileStore-->>Worker: permission granted/denied
	Worker->>Main: postMessage(permission_result)
	Main->>UI: Show file or error
```

**Action Steps:**
- Set up Puppeteer test harness for www/components/web_worker/index.html.
- Automate user flows: chat, tool approval, file access, session branching.
- Validate Web Worker message flow, streaming, and error handling.
- Test repository loading, file access permissions, and UI state sync.

**Deliverables:**
- puppeteer-e2e-tests.js (or similar) with full coverage.
- Test reports for all workflows.

## 6. Performance & Error Recovery

**Action Steps:**
- Benchmark streaming and token limits.
- Simulate worker crashes and test recovery/state sync.

**Deliverables:**
- Performance benchmarks.
- Recovery test cases and results.

## 7. Documentation

**Action Steps:**
- Update READMEs for File Store, Global Store, Session Store, and worker integration.
- Document message protocol extensions and E2E test setup.

**Deliverables:**
- Updated documentation in all relevant READMEs.
- E2E test setup guide.

---

## Full Featured Web UI Tests
### Sequence Diagrams for Full Featured Web UI Tests

#### UI Test: Repository Loading

```mermaid
sequenceDiagram
	participant User as User
	participant UI as UI
	participant Main as Main Thread
	participant Worker as Web Worker
	participant FileStore as File Store

	User->>UI: Select repository
	UI->>Main: Send repo load request
	Main->>Worker: postMessage(load_repo)
	Worker->>FileStore: load repository
	FileStore-->>Worker: repo files
	Worker->>Main: postMessage(repo_loaded)
	Main->>UI: Display repository files
```

#### UI Test: Session Branching

```mermaid
sequenceDiagram
	participant User as User
	participant UI as UI
	participant Main as Main Thread
	participant Worker as Web Worker
	participant SessionStore as Session Store

	User->>UI: Create session branch
	UI->>Main: Send branch request
	Main->>Worker: postMessage(new_branch)
	Worker->>SessionStore: create branch
	SessionStore-->>Worker: branch created
	Worker->>Main: postMessage(branch_created)
	Main->>UI: Display new branch
```

#### UI Test: Tool Registry Management

```mermaid
sequenceDiagram
	participant User as User
	participant UI as UI
	participant Main as Main Thread
	participant Worker as Web Worker
	participant GlobalStore as Global Store

	User->>UI: Add tool
	UI->>Main: Send add tool request
	Main->>Worker: postMessage(add_tool)
	Worker->>GlobalStore: save tool
	GlobalStore-->>Worker: tool saved
	Worker->>Main: postMessage(tool_added)
	Main->>UI: Update tool list
```

**Implementation Steps:**
- Extend www/components/web_worker/index.html with UI elements for:
	- Repository access and file loading (File Store)
	- Tool registry and session tree management (Global Store)
	- Conversation tree branching and metadata updates (Session Store)
- Add test scripts to simulate:
	- Repository loading and file access
	- Tool approval workflows
	- Session branching and metadata updates
- Use Puppeteer to automate:
	- UI interactions for all workflows
	- Assertions for UI updates, state sync, error handling, and persistence
	- Permission enforcement and recovery scenarios

**Deliverables:**
- Extended index.html with test UI and scripts.
- puppeteer-e2e-tests.js covering all integration points.
- Test results and coverage report.

---

This completion provides actionable steps, deliverables, and implementation details for each section, ensuring the plan is ready for execution and review. Let me know if you want code templates or test harness scaffolding next.
