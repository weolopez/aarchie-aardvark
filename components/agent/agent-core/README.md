# Agent Core

The Agent Core is the heart of Aardvark's AI coding assistant. It provides intelligent conversation management, tool orchestration, and LLM integration for coding assistance.

## Features

- **AI-Powered Conversations**: Natural language chat with context awareness
- **Tool Execution**: Safe execution of development tools with permission management
- **Web Worker Architecture**: Runs in isolated Web Worker for security and performance
- **Streaming Responses**: Real-time response streaming for better UX
- **Session Management**: Persistent conversation history and context
- **Multi-Model Support**: Compatible with various LLM providers

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Main Thread   │◄──►│  Message Bridge  │◄──►│   Agent Core    │
│                 │    │                  │    │  (Web Worker)   │
│ - UI Components │    │ - Message Queue  │    │                 │
│ - User Input    │    │ - Error Handling │    │ - LLM Client    │
│ - Tool Results  │    └──────────────────┘    │ - Tool Dispatch │
└─────────────────┘                            │ - Context Mgmt  │
                                               └─────────────────┘
                                                       │
                                               ┌─────────────────┐
                                               │ Tool Components │
                                               │ - Tool Executor │
                                               │ - Tool Registry │
                                               │ - File Store    │
                                               └─────────────────┘
```

## Quick Start

### Basic Usage

```javascript
import { AgentCore, AgentConfig } from '@aardvark/agent-core';

// Create configuration
const config = new AgentConfig({
  apiKey: 'your-openai-api-key',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 4096
});

// Initialize agent
const agent = new AgentCore();
await agent.init(config);

// Start chatting
const response = await agent.chat('Help me refactor this function', 'session-123');
console.log(response.content);
```

### Web Worker Usage

```javascript
// Main thread
const worker = new Worker('./agent-core-worker.js');

worker.postMessage({
  type: 'init',
  id: 'init-1',
  payload: {
    apiKey: 'your-api-key',
    model: 'gpt-4'
  }
});

worker.postMessage({
  type: 'chat',
  id: 'chat-1',
  payload: {
    message: 'Hello, can you help me with coding?',
    sessionId: 'session-123'
  }
});

// Handle responses
worker.onmessage = (event) => {
  const { type, id, payload } = event.data;
  if (type === 'response') {
    console.log(`Response to ${id}:`, payload);
  }
};
```

## Configuration

### AgentConfig Options

```javascript
const config = new AgentConfig({
  // Required
  apiKey: 'sk-...',                    // OpenAI API key

  // Optional
  apiBaseUrl: 'https://api.openai.com/v1',  // API base URL
  model: 'gpt-4',                       // Model to use
  maxTokens: 4096,                      // Max tokens per response
  temperature: 0.7,                     // Response creativity (0-2)
  defaultPermissions: ['fs', 'network', 'ui'], // Default tool permissions
  timeout: 30000,                       // Request timeout (ms)
  streaming: true,                      // Enable streaming responses
  debug: false                          // Enable debug logging
});
```

### Environment Variables

```bash
# Set these in your environment or .env file
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7
DEBUG=true
```

## Tool System

The Agent Core integrates with Aardvark's tool system for safe code execution:

### Built-in Tools

- **`execute_javascript`**: Run JavaScript code in sandbox
- **`read_file`**: Read file contents
- **`write_file`**: Write to files
- **`list_directory`**: List directory contents
- **`run_terminal_command`**: Execute terminal commands
- **`search_files`**: Search text in files
- **`http_request`**: Make HTTP requests
- **`show_notification`**: Display user notifications

### Custom Tools

```javascript
// Register custom tool
agent.toolDispatcher.registerTool({
  name: 'my_custom_tool',
  description: 'Does something special',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  permissions: ['fs']
});
```

## Message Protocol

### Main Thread → Worker

```javascript
// Initialize agent
{
  type: 'init',
  id: 'unique-request-id',
  payload: { /* AgentConfig */ }
}

// Send chat message
{
  type: 'chat',
  id: 'chat-123',
  payload: {
    message: 'User message',
    sessionId: 'session-uuid'
  }
}

// Execute tool directly
{
  type: 'execute_tool',
  id: 'tool-456',
  payload: {
    toolName: 'read_file',
    args: { path: '/src/main.js' }
  }
}

// Load repository
{
  type: 'load_repository',
  id: 'repo-789',
  payload: {
    owner: 'myorg',
    repo: 'myproject'
  }
}
```

### Worker → Main Thread

```javascript
// Response to request
{
  type: 'response',
  id: 'request-id',
  payload: {
    success: true,
    result: { /* response data */ }
  }
}

// Error response
{
  type: 'response',
  id: 'request-id',
  payload: {
    success: false,
    error: 'Error message'
  }
}

// Notifications
{
  type: 'notification',
  notificationType: 'status_update',
  data: { /* notification data */ }
}
```

## API Reference

### AgentCore

#### `init(config: AgentConfig): Promise<void>`
Initialize the agent with configuration.

#### `chat(message: string, sessionId: string): Promise<ChatResponse>`
Process a chat message and return AI response.

#### `executeTool(toolName: string, args: object): Promise<ToolResult>`
Execute a tool directly.

#### `loadRepository(owner: string, repo: string): Promise<void>`
Load repository context.

#### `getStatus(): object`
Get current agent status.

### ChatResponse

```typescript
interface ChatResponse {
  content: string;           // AI response text
  toolCalls?: ToolCall[];    // Tool calls to execute
  usage: TokenUsage;         // Token usage statistics
  error?: boolean;           // Error flag
}
```

### ToolResult

```typescript
interface ToolResult {
  success: boolean;          // Execution success
  output?: any;              // Tool output
  error?: string;            // Error message
  duration?: number;         // Execution time (ms)
}
```

## Error Handling

The Agent Core provides comprehensive error handling:

```javascript
try {
  const response = await agent.chat(message, sessionId);
  if (response.error) {
    console.error('AI Error:', response.content);
  } else {
    console.log('AI Response:', response.content);
  }
} catch (error) {
  console.error('System Error:', error.message);
}
```

## Development

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration
```

### Demo

```bash
# Start demo server
npm run demo
# Open http://localhost:8080/components/agent/agent-core/index.html
```

## Dependencies

- **@aardvark/tool-executor**: Safe tool execution
- **@aardvark/tool-registry**: Tool management
- **@aardvark/session-manager**: Conversation persistence
- **@aardvark/context-builder**: Context optimization
- **@aardvark/api-client**: HTTP communication
- **@aardvark/message-bridge**: Inter-thread communication

## License

MIT
