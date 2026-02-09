# Phase 4.4 Plan: Context Builder - Tool & Conversation Context Optimization

## Overview
Phase 4.4 implements the Context Builder component, focusing on intelligent context optimization for the tool-driven agent runtime. Moving away from file-centric analysis, this component analyzes available tools, optimizes conversation history, and builds efficient prompts for LLM interactions within token limits.

**Goal**: Enable the agent to intelligently select relevant tools and maintain optimized conversation context for effective tool orchestration.

## Component Structure
```
components/agent/context-builder/
├── src/
│   ├── index.js              # Main exports
│   ├── context-builder.js    # Core context optimization engine
│   ├── tool-analyzer.js      # Tool relevance and capability analysis
│   ├── conversation-optimizer.js # Session history compression
│   ├── prompt-builder.js     # Token-aware prompt construction
│   └── context-manager.js    # Context window management
├── tests/
│   ├── unit/
│   │   ├── context-builder.spec.html
│   │   ├── tool-analyzer.spec.html
│   │   ├── conversation-optimizer.spec.html
│   │   ├── prompt-builder.spec.html
│   │   └── context-manager.spec.html
│   └── integration/
│       ├── context-optimization.spec.html
│       └── agent-integration.spec.html
├── README.md
├── package.json
└── www/components/agent/context-builder/index.html  # Interactive demo
```

## Implementation Timeline: Week 9, Days 10-11 (2 days)

### Day 10: Core Context Analysis and Tool Integration
- Create `context-builder.js` - Main orchestration class
- Implement `tool-analyzer.js` - Query Tool Registry for capabilities and relevance scoring
- Build `conversation-optimizer.js` - Compress session trees and branch history
- Create `prompt-builder.js` - Construct optimized prompts with tool context
- Integrate with Tool Registry and Session Manager

### Day 11: Context Management and Testing
- Implement `context-manager.js` - Token-aware context window management
- Create comprehensive test suite (unit + integration)
- Build interactive UI demo with context visualization
- Document API and integration points
- Validate with Agent Core integration

## API Design
```javascript
// Core Context Builder API
class ContextBuilder {
  constructor(toolRegistry, sessionManager) {
    // Initialize with dependencies
  }
  
  async buildContext(sessionId, userQuery) {
    // Analyze tools, optimize conversation, build prompt
    return {
      relevantTools: [...],
      optimizedHistory: [...],
      prompt: "Optimized prompt with tool context...",
      tokenUsage: { current: 1234, limit: 8000 }
    };
  }
  
  async getToolCapabilities() {
    // Return available tool capabilities for analysis
  }
  
  async optimizeConversation(sessionTree) {
    // Compress conversation history for context
  }
}

// Tool Analyzer API
class ToolAnalyzer {
  async scoreToolRelevance(tool, query) {
    // Score tool relevance for given query
  }
  
  async getToolCapabilities() {
    // Extract tool permissions and functions
  }
}

// Conversation Optimizer API
class ConversationOptimizer {
  async compressHistory(sessionTree, maxTokens) {
    // Compress conversation history for context
  }
  
  async extractKeyMessages(sessionTree) {
    // Extract important messages for context
  }
}
```

## Integration Points
- **Tool Registry**: Query available tools and their capabilities for relevance analysis
- **Session Manager**: Access conversation trees for history optimization
- **Agent Core**: Provide optimized context for LLM prompt construction
- **Tool Executor**: Include execution results in context building (future integration)
- **Message Bridge**: Web Worker communication for context requests

## Success Criteria
- ✅ Tool relevance scoring accurately identifies applicable tools for queries
- ✅ Conversation optimization reduces token usage while preserving context
- ✅ Prompt building creates effective prompts leveraging available tools
- ✅ Context window management stays within LLM token limits
- ✅ Full test coverage with unit and integration tests
- ✅ Interactive demo showing context optimization in action
- ✅ Seamless integration with Agent Core and Tool Registry

## Dependencies
- Phase 4.2 Agent Core ✅ (for LLM integration and Web Worker communication)
- Phase 4.3 Session Manager ✅ (for conversation tree access)
- Phase 3 Tool Registry ✅ (for tool capability analysis)
- Phase 2 Storage Layer (File Store, Global Store) - for persistence if needed

## Key Technical Considerations
- **Token Management**: Implement token counting and limits for different LLM models
- **Relevance Algorithms**: Develop scoring system for tool-query matching
- **Compression Strategies**: Smart conversation summarization without losing context
- **Performance**: Efficient context building for real-time agent responses
- **Extensibility**: Design for future tool types and context sources

This plan positions the Context Builder as the intelligent bridge between the tool ecosystem and LLM capabilities, enabling the agent to make optimal tool selections and maintain coherent conversations within resource constraints. The focus on tool-driven context aligns with the architecture's emphasis on the JavaScript tool as the primary execution mechanism.
