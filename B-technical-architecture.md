# Technical Architecture

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

## Component Model

### Three Types of Components

**1. Core Components (Vanilla JS Classes)**
Foundation services:
- **EventBus**: Pub/sub messaging
- **MessageBridge**: Worker ↔ Main communication
- **ToolRegistry**: In-memory tool management
- **StorageProviders**: OPFS and IndexedDB wrappers

**2. UI Components (Lit HTML Web Components)**
Visual components with reactive rendering:
- `chat-ui`: Main interface
- `session-tree-ui`: Conversation navigation
- `tool-approval-ui`: Security prompts
- `preview-engine`: Dynamic component renderer

**3. Tool Components (Registry Objects)**
Executable functions stored in IndexedDB and hydrated at runtime:
- **Storage**: JSON objects in `tools` store (source code + metadata).
- **Runtime**: `new Function()` creation in the Worker.
- **Types**:
    - System Tools: Built-in capabilities (read, write).
    - User Tools: Custom logic created by the user (e.g., `fetch_weather`).

---

## UI Components with Lit HTML

UI components use **Lit HTML** for efficient, expressive rendering with Shadow DOM.

### Example: Chat UI

```javascript
// components/ui/chat-ui/src/chat-ui.js
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

export class ChatUi extends LitElement {
  // Static styles (Shadow DOM scoped)
  static styles = css`
    :host { display: flex; flex-direction: column; height: 100%; }
    /* Tailwind utilities used in render */
  `;

  static properties = {
    messages: { type: Array },
    inputText: { type: String },
    isLoading: { type: Boolean }
  };

  render() {
    return html`
      <div class="flex flex-col h-full bg-white">
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          ${this.messages.map(msg => this.renderMessage(msg))}
        </div>
        
        <!-- Input -->
        <div class="flex p-4 border-t border-gray-200">
          <textarea
            class="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
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

---

## Communication Flow

### Main Thread ↔ Web Worker

The architecture relies on a strict message-passing protocol.

```
┌─────────────────────────────────────────────────────────────┐
│  Main Thread (UI Layer)                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Chat UI    │  │ Preview Eng  │  │ Message Bridge   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                                                │            │
│                                         postMessage()       │
│                                                │            │
└────────────────────────────────────────────────┼────────────┘
                                                 │
┌────────────────────────────────────────────────┼────────────┐
│  Web Worker (Agent Layer)                      │            │
│  ┌─────────────────────────────────────────────┴────────┐   │
│  │                    Agent Core                        │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ Registry │  │ Session Mgr  │  │   LLM Client   │  │   │
│  │  └──────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Message Types**:
- `init`: Startup configuration.
- `chat`: User message input.
- `tool_request`: Agent requesting capability.
- `tool_result`: Output from executed tool.
- `tool_pending`: Agent requesting to save a new tool.
- `approve_tool`: User authorizing a new tool.
- `preview_component`: Agent sending UI code to render.
- `approve_preview`: User authorizing UI code execution.
- `step`: Streaming token/status update.

---

## Directory Structure

Reflecting the JavaScript module structure:

```
/
├── components/             # Reusable modules
│   ├── agent/              # Worker-side logic
│   │   ├── context-builder/
│   │   ├── session-manager/
│   │   └── tool-dispatcher/
│   ├── core/               # Foundation
│   │   ├── event-bus/
│   │   ├── message-bridge/
│   │   └── storage/
│   ├── tools/              # Tool implementations
│   │   ├── built-ins/
│   │   └── dynamic/
│   └── ui/                 # Lit Web Components
│       ├── chat-ui/
│       └── session-tree-ui/
├── src/                    # Application Entry
│   ├── main.js             # UI Entry point
│   └── worker.js           # Agent Entry point
├── www/                    # Static assets
│   ├── index.html
│   └── styles.css
└── package.json            # Project config (optional)
```

---

## Development Workflow

### 1. Start Development Server
Since there is no build step, simply serve the root directory.

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

### 2. Testing
Tests run directly in the browser using ES Modules.

```html
<!-- tests/index.html -->
<script type="module">
  import { EventBus } from '../components/core/event-bus/src/index.js';
  
  // Simple assertion
  const bus = new EventBus();
  console.assert(bus instanceof EventTarget, "EventBus should be EventTarget");
</script>
```

### 3. Deployment
Deploy the project root to any static hosting service (GitHub Pages, Vercel, Netlify).
- **Requirements**: HTTPS (for OPFS) and valid COOP/COEP headers.