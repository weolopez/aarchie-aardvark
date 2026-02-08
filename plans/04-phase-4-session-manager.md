# Phase 4.3: Session Manager - Rust/WASM Session Tree Implementation

## Overview
Implement a tree-structured session manager using Rust/WASM for branching conversations in the AI coding agent. This component enables persistent conversation trees with branching capabilities, directly equivalent to the TypeScript coding agent's session system.

## What This Phase Teaches
- **Tree-structured data in Rust**: HashMap-based node storage with `parent_id` linking
- **Branching conversations**: Jump to any point in history and continue from there
- **History traversal**: Walk `leaf → root` to reconstruct the current branch
- **D3.js visualization**: Interactive tree rendering to inspect and navigate branches
- **UUID generation in WASM**: Using `uuid` crate with `js` feature for browser-compatible randomness

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Session Tree (Rust/WASM)             │
│                                                   │
│  entries: HashMap<String, SessionEntry>            │
│  root_id: String                                  │
│  leaf_id: String  ◄── current position pointer    │
│                                                   │
│  append_message(role, content) → new_id           │
│  branch(entry_id) → moves leaf_id                 │
│  get_history() → leaf → root traversal            │
│  get_tree() → full HashMap for visualization      │
└─────────────────────────────────────────────────┘

Tree Structure (in-memory):

    [session header: root_id]
           │
    [user: "Build a React app"]
           │
    [assistant: "What kind?"]
         ╱        ╲
  [user: "Todo"]   [user: "3D game"]     ◄── branches
        │                 │
  [assistant: ...]   [assistant: ...]
```

## Component Structure

```
components/agent/session-manager/
├── Cargo.toml              # Rust dependencies: uuid, chrono, serde, wasm-bindgen
├── src/
│   ├── lib.rs              # WASM bindings: SessionTree struct
│   ├── models.rs           # SessionEntry, SessionHeader, MessageEntry
│   └── session.rs          # SessionManager: append, branch, get_history
├── pkg/                    # WASM build output (generated)
├── tests/
│   ├── unit/
│   │   ├── session-tree.spec.html
│   │   └── models.spec.html
│   └── integration/
│       └── session-operations.spec.html
├── README.md
├── package.json
└── build.js                # wasm-pack build script
www/components/agent/session-manager/
└── index.html              # D3.js tree visualization + chat interface
```

## Implementation Timeline: Week 9, Days 8-9 (2 days)

### Day 8: Rust/WASM Core Implementation
- Set up Cargo.toml with required dependencies (uuid, chrono, serde, wasm-bindgen)
- Implement `SessionEntry` enum (Header, Message)
- Create `SessionTree` struct with HashMap storage
- Implement core methods: `new()`, `append_message()`, `branch()`, `get_history()`, `get_tree()`
- Build WASM module with `wasm-pack build --target web`

### Day 9: JavaScript Integration and Testing
- Create JavaScript wrapper for WASM bindings
- Implement D3.js tree visualization for session exploration
- Build interactive UI demo with chat history and branching
- Create comprehensive test suite (unit + integration)
- Integrate with Agent Core via Web Worker messages

## API Design

### Rust (WASM)

```rust
// Core WASM API
pub struct SessionTree {
    entries: HashMap<String, SessionEntry>,
    root_id: String,
    leaf_id: String,
}

impl SessionTree {
    pub fn new(cwd: &str) -> SessionTree;
    pub fn append_message(&mut self, role: &str, content: &str) -> String;
    pub fn branch(&mut self, entry_id: &str);
    pub fn get_history(&self) -> Vec<SessionEntry>;
    pub fn get_tree(&self) -> JsValue; // For D3.js visualization
}
```

### Session Entry Types

```rust
enum SessionEntry {
    Header(SessionHeader),   // Root node with cwd, timestamp
    Message(MessageEntry),   // Content node with role, content, parent_id
}
```

### JavaScript Usage

```javascript
import init, { SessionTree } from './pkg/session_tree.js';

await init();
const tree = new SessionTree("/home/user/project");

// Build conversation
const m1 = tree.append_message("user", "Hello");
const m2 = tree.append_message("assistant", "Hi! How can I help?");

// Branch from m2 (alternative response)
tree.branch(m2);
const m3_alt = tree.append_message("user", "Different question");

// Get current branch history
const history = tree.get_history(); // root → m1 → m2 → m3_alt
```

## Coding Agent Goal Alignment

This project implements the **session management system** — directly equivalent to [`session-manager.ts`](../coding-agent/core/session-manager.ts), which is one of the largest and most complex files in the TypeScript coding agent (1400+ lines).

| Coding Agent Requirement | How This Project Addresses It |
|--------------------------|-------------------------------|
| Tree-structured sessions | `HashMap<String, SessionEntry>` with `parent_id` links matches JSONL tree format |
| Branching (`/tree` command) | `branch(entry_id)` moves the leaf pointer, equivalent to the TS `/tree` command |
| Linear history reconstruction | `get_history()` traverses leaf→root, matching `buildSessionContext()` |
| Session header with metadata | `SessionHeader { id, timestamp, cwd }` matches [`SessionHeader`](../coding-agent/core/session-manager.ts:29) |
| Message entries | `MessageEntry { id, parent_id, role, content }` matches [`SessionMessageEntry`](../coding-agent/core/session-manager.ts:49) |

### Mapping to TypeScript Agent

| TypeScript Session Manager | Rust Session Tree Equivalent |
|---------------------------|------------------------------|
| [`SessionHeader`](../coding-agent/core/session-manager.ts:29) | `SessionHeader` struct |
| [`SessionMessageEntry`](../coding-agent/core/session-manager.ts:49) | `MessageEntry` struct |
| JSONL file with `id`/`parentId` fields | `HashMap<String, SessionEntry>` |
| `buildSessionContext()` traversal | `get_history()` leaf→root walk |
| `/tree` command navigation | `branch(entry_id)` |
| `appendFileSync()` to JSONL | `append_message()` to HashMap |

## Integration Points
- **Agent Core**: Receive session operations via Web Worker messages
- **Global Store**: Persist session trees to IndexedDB
- **UI**: D3.js visualization for session exploration and branching
- **Tool Registry**: No direct integration (session management is separate)

## Success Criteria
- ✅ Tree-structured sessions with HashMap storage
- ✅ Branching conversations via `branch()` method
- ✅ History traversal from leaf to root
- ✅ D3.js interactive visualization
- ✅ WASM performance with UUID generation
- ✅ Full test coverage and UI demo
- ✅ Integration with Agent Core for persistent conversations

## Dependencies
- Phase 4.2 Agent Core ✅ (for Web Worker integration)
- wasm-pack for WASM builds
- D3.js for visualization
- uuid crate for browser-compatible randomness

## What's Still Needed (Future Phases)
- **Persistence** — Currently in-memory only; needs IndexedDB storage via Global Store pattern
- **Compaction support** — No `CompactionEntry` equivalent for summarizing old context
- **Branch summary** — No `BranchSummaryEntry` for capturing context when branching
- **Model/thinking level change entries** — Only `session` and `message` types; TS has `model_change`, `thinking_level_change`
- **Session listing and search** — No multi-session management; single session only
- **Fork to new session** — `parent_session` field exists but isn't fully implemented

**Status: Ready for Implementation** — Core tree structure with branching and history traversal designed. Needs coding and testing.
