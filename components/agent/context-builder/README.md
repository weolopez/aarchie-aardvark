# Context Builder

The Context Builder component provides intelligent context optimization for tool-driven AI agent conversations. It analyzes available tools, optimizes conversation history, and builds efficient prompts within LLM token limits.

## Features

- **Tool Relevance Analysis**: Scores and ranks tools based on query relevance
- **Conversation Optimization**: Compresses chat history while preserving important context
- **Prompt Construction**: Builds optimized prompts that leverage available tools
- **Context Window Management**: Maintains conversation coherence within token limits
- **Real-time Optimization**: Dynamically adjusts context as conversations evolve

## Architecture

```
ContextBuilder
├── ToolAnalyzer          # Tool relevance scoring
├── ConversationOptimizer # History compression
├── PromptBuilder         # Token-aware prompt construction
└── ContextManager        # Context window management
```

## Usage

```javascript
import { ContextBuilder } from '/components/agent/context-builder/src/index.js';

// Initialize with dependencies
const contextBuilder = new ContextBuilder(toolRegistry, sessionManager);

// Build context for a user query
const context = await contextBuilder.buildContext(sessionId, userQuery);

console.log('Optimized prompt:', context.prompt);
console.log('Relevant tools:', context.relevantTools);
console.log('Token usage:', context.contextStats);
```

## API Reference

### ContextBuilder

#### `buildContext(sessionId, userQuery, maxTokens?)`
Builds complete optimized context for LLM interaction.

**Parameters:**
- `sessionId` (string): Session identifier
- `userQuery` (string): Current user query
- `maxTokens` (number, optional): Maximum token limit (default: 8000)

**Returns:** Context object with prompt, tools, and statistics

#### `getToolCapabilities()`
Returns all available tool capabilities for analysis.

#### `optimizeConversation(sessionId, maxTokens?)`
Optimizes conversation history for a session.

#### `getCurrentContext(sessionId)`
Gets current context window for a session.

#### `clearContext(sessionId)`
Clears context window for a session.

## Integration

The Context Builder integrates with:
- **Tool Registry**: For tool capability analysis
- **Session Manager**: For conversation tree access
- **Agent Core**: For LLM prompt optimization
- **Message Bridge**: For Web Worker communication

## Demo

View the interactive demo at:
`www/components/agent/context-builder/index.html`

The demo showcases:
- Tool relevance scoring
- Conversation optimization
- Prompt building with token management
- Context window visualization

## Testing

Run tests at:
`components/agent/context-builder/tests/`

Test suites include:
- Unit tests for all core classes
- Integration tests with mock dependencies
- Context optimization validation
