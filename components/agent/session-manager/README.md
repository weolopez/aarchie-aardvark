# Session Manager

The Session Manager provides tree-structured conversation management with branching capabilities for the AI coding agent. It enables persistent conversation trees where users can branch off from any point in the conversation history.

## Features

- **Tree-Structured Sessions**: Hierarchical conversation storage with parent-child relationships
- **Branching Conversations**: Jump to any point in history and continue from there
- **Persistent Storage**: IndexedDB-based persistence via Session Store
- **Web Worker Integration**: Runs in isolated Web Worker for security and performance
- **History Reconstruction**: Efficient traversal from leaf to root for context building
- **Real-time Synchronization**: Message bridge integration for UI updates

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Main Thread   │◄──►│  Message Bridge  │◄──►│ Session Manager   │
│                 │    │                  │    │  (Web Worker)    │
│ - UI Components │    │ - Message Queue  │    │                  │
│ - Chat Interface│    │ - Error Handling │    │ - Session Tree   │
│ - Tree Visual.  │    └──────────────────┘    │ - Persistence    │
└─────────────────┘                            │ - Branching      │
                                               └──────────────────┘
                                                       │
                                               ┌──────────────────┐
                                               │  Session Store    │
                                               │ - IndexedDB       │
                                               │ - Tree Operations │
                                               │ - Search          │
                                               └──────────────────┘
```

## Quick Start

### Basic Usage

```javascript
import { SessionManager } from '@aardvark/session-manager';

// Create session manager
const sessionManager = new SessionManager();

// Create a new session
const sessionId = await sessionManager.createSession('/home/user/project');

// Add messages
const userMsgId = await sessionManager.appendMessage(sessionId, 'user', 'Hello!');
const assistantMsgId = await sessionManager.appendMessage(sessionId, 'assistant', 'Hi there!');

// Branch from the first user message
await sessionManager.branch(sessionId, userMsgId);
const branchMsgId = await sessionManager.appendMessage(sessionId, 'user', 'Different question');

// Get current branch history
const history = await sessionManager.getHistory(sessionId);
console.log(history); // [header, user: "Hello!", assistant: "Hi there!", user: "Different question"]
```

### Web Worker Usage

```javascript
// In main thread
const worker = new Worker('session-manager-worker.js');

// Create session
worker.postMessage({
  type: 'session:create',
  data: { cwd: '/home/user/project' }
});

// Listen for response
worker.onmessage = (event) => {
  if (event.data.type === 'session:created') {
    console.log('Session created:', event.data.sessionId);
  }
};
```

## API Reference

### SessionManager

#### Constructor
```javascript
new SessionManager(options?: {
  sessionStore?: SessionStore,
  messageBridge?: MessageBridge
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `createSession(cwd?)` | Create new session tree |
| `loadSession(sessionId)` | Load session from storage |
| `appendMessage(sessionId, role, content)` | Add message to current leaf |
| `branch(sessionId, entryId)` | Move leaf pointer to different entry |
| `getHistory(sessionId)` | Get linear history from root to leaf |
| `getTree(sessionId)` | Get full tree structure |

### SessionTree

#### Constructor
```javascript
new SessionTree(cwd?: string)
```

#### Methods

| Method | Description |
|--------|-------------|
| `appendMessage(role, content)` | Add message, returns new ID |
| `branch(entryId)` | Move leaf to specified entry |
| `getHistory()` | Get history array from root to leaf |
| `getTree()` | Get full tree as Map |
| `getLeafId()` | Get current leaf ID |
| `getRootId()` | Get root ID |

### Data Types

#### SessionHeader
```javascript
{
  id: string,
  timestamp: number,
  cwd: string
}
```

#### MessageEntry
```javascript
{
  id: string,
  parentId: string,
  role: string,
  content: string
}
```

## Message Protocol

The Session Manager communicates via the Message Bridge with these message types:

### Inbound Messages
- `session:create` - Create new session
- `session:append` - Add message to session
- `session:branch` - Branch to different point
- `session:getHistory` - Request history
- `session:getTree` - Request full tree

### Outbound Messages
- `session:created` - Session creation result
- `session:appended` - Message append result
- `session:branched` - Branch operation result
- `session:history` - History data
- `session:tree` - Tree data

## Integration with Agent Core

The Session Manager integrates with the Agent Core for conversation persistence:

```javascript
import { AgentCore } from '@aardvark/agent-core';
import { SessionManager } from '@aardvark/session-manager';

// Create both components
const agent = new AgentCore();
const sessions = new SessionManager();

// Agent can use session manager for persistence
await agent.init(config, { sessionManager: sessions });
```

## Testing

Run the test suite:

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
```

## Dependencies

- **@aardvark/session-store**: IndexedDB persistence layer
- **@aardvark/message-bridge**: Web Worker communication
- **@aardvark/indexeddb-provider**: Database operations
- **@aardvark/event-bus**: Event handling

## Browser Support

- Modern browsers with ES2020 support
- Web Workers for isolated execution
- IndexedDB for persistence
- crypto.randomUUID() for ID generation
