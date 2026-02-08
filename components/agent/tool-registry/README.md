# Tool Registry

The Tool Registry is the in-memory "brain's library" of available tools for the Aardvark coding agent. It loads executable JavaScript functions from IndexedDB on startup and provides fast lookups for tool execution.

## Features

- In-memory Map for O(1) tool lookups
- Hydration from IndexedDB Global Store
- Tool validation on registration
- Event-driven architecture
- Persistence of registry state

## Usage

```javascript
import { ToolRegistry } from './src/index.js';

const registry = new ToolRegistry();

// Load from storage
await registry.load();

// Register a tool
registry.register({
  id: 'uuid-123',
  name: 'hello_world',
  version: 1,
  func: 'async () => { return "Hello, World!"; }',
  schema: { type: 'object', properties: {} },
  type: 'system',
  permissions: [],
  created: new Date().toISOString()
});

// Get a tool
const tool = registry.get('hello_world');

// Listen for events
const unsubscribe = registry.on('tool:registered', (tool) => {
  console.log('Tool registered:', tool.name);
});

// Persist changes
await registry.save();
```

## API

### ToolRegistry

- `load()`: Promise<void> - Hydrate from IndexedDB
- `save()`: Promise<void> - Persist to IndexedDB
- `register(tool: Tool)`: void - Add to memory map
- `unregister(name: string)`: void - Remove from memory map
- `get(name: string)`: Tool | undefined
- `list()`: Tool[] - All registered tools
- `has(name: string)`: boolean
- `on(event: string, handler: Function)`: () => void - Subscribe to events (returns unsubscribe function)

## Events

- `registry:loaded` - Registry hydrated from storage
- `tool:registered` - New tool added
- `tool:unregistered` - Tool removed
- `registry:persisted` - Changes saved to IndexedDB

## Tool Schema

```javascript
interface Tool {
  id: string;           // UUID primary key
  name: string;         // Unique handle
  version: number;      // Increment on updates
  func: string;         // JavaScript function as string
  schema: object;       // JSON Schema for parameters
  type: 'system' | 'user';
  permissions: string[]; // ['network', 'fs', 'ui']
  created: string;      // ISO timestamp
}
```
