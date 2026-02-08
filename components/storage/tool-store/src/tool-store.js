/**
 * Tool Store - Registry-based Tool Management
 * 
 * Manages the "Brain's Library" of executable tools.
 * - Source of Truth: IndexedDB 'tools' store
 * - Runtime: In-memory Registry Map
 * - Workflow: Pending -> Approved -> Registered
 */

import { EventBus } from '../../../core/event-bus/src/index.js';
import { IndexedDBProvider, AardvarkSchema } from '../../../core/indexeddb-provider/src/index.js';

/**
 * @typedef {Object} Tool
 * @property {string} id - Unique UUID
 * @property {string} name - Unique handle (e.g., 'fetch_weather')
 * @property {string} version - Semantic version
 * @property {string} func - Executable JavaScript code as string
 * @property {Object} schema - JSON Schema for parameters
 * @property {'system'|'user'} type - Tool type
 * @property {string[]} permissions - Required permissions
 * @property {number} created - Timestamp
 */

/**
 * @typedef {Object} PendingTool
 * @property {string} id - Unique UUID
 * @property {Tool} tool - The tool definition
 * @property {string} requestedBy - 'llm' or 'user'
 * @property {string} status - 'pending' | 'approved' | 'rejected'
 * @property {number} created - Timestamp
 */

export class ToolStore {
  /**
   * @param {Object} options
   * @param {EventBus} [options.eventBus]
   * @param {IndexedDBProvider} [options.db]
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.db = options.db || new IndexedDBProvider('aardvark-db', 1);
    
    // In-memory registry (The "Brain's Library")
    this.registry = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the tool store
   * Hydrates the in-memory registry from IndexedDB
   */
  async initialize() {
    if (this.initialized) return;

    // Initialize DB with schema (idempotent)
    // Note: Schema is managed by IndexedDBProvider, but we verify stores here
    await this.db.initialize(AardvarkSchema); 

    // Hydrate registry from DB
    await this.refreshRegistry();
    
    this.initialized = true;
    this.eventBus.publish('tool:loaded', { count: this.registry.size });
  }

  /**
   * Load all tools from DB into memory
   */
  async refreshRegistry() {
    try {
      const tools = await this.db.getAll('tools');
      this.registry.clear();
      for (const tool of tools) {
        this.registry.set(tool.name, tool);
      }
    } catch (error) {
      console.error('Failed to hydrate tool registry:', error);
      // Don't crash, just start empty
    }
  }

  /**
   * Get a tool definition from memory
   * @param {string} name 
   * @returns {Tool|undefined}
   */
  getTool(name) {
    return this.registry.get(name);
  }

  /**
   * Get all registered tools
   * @returns {Tool[]}
   */
  listTools() {
    return Array.from(this.registry.values());
  }

  /**
   * Register a new tool (Direct save, bypassing approval)
   * Used for system tools or trusted imports.
   * @param {Tool} tool 
   */
  async registerTool(tool) {
    if (!tool.id) tool.id = crypto.randomUUID();
    if (!tool.created) tool.created = Date.now();
    
    // Validate basics
    if (!tool.name || !tool.func || !tool.schema) {
      throw new Error('Invalid tool definition: missing name, func, or schema');
    }

    // Save to DB
    await this.db.put('tools', tool);
    
    // Update Memory
    this.registry.set(tool.name, tool);
    
    this.eventBus.publish('tool:registered', { name: tool.name });
  }

  /**
   * Add a tool to the pending queue
   * @param {Tool} tool 
   * @param {string} requestedBy - 'llm' or 'user'
   * @returns {Promise<string>} pendingToolId
   */
  async addPendingTool(tool, requestedBy = 'llm') {
    const toolId = crypto.randomUUID();
    const pending = {
      toolId,
      tool,
      requestedBy,
      status: 'pending',
      created: Date.now()
    };

    await this.db.put('pending_tools', pending);
    
    this.eventBus.publish('tool:pending', { 
      toolId, 
      name: tool.name, 
      description: tool.schema.description 
    });
    
    return toolId;
  }

  /**
   * List pending tools
   * @returns {Promise<PendingTool[]>}
   */
  async listPendingTools() {
    const all = await this.db.getAll('pending_tools');
    return all.filter(t => t.status === 'pending');
  }

  /**
   * Approve a pending tool
   * Moves it from pending -> active registry
   * @param {string} id - Pending Tool ID
   */
  async approveTool(id) {
    const pending = await this.db.get('pending_tools', id);
    if (!pending) throw new Error(`Pending tool not found: ${id}`);
    
    // Update status
    pending.status = 'approved';
    await this.db.put('pending_tools', pending);
    
    // Register the tool
    await this.registerTool(pending.tool);
    
    this.eventBus.publish('tool:approved', { 
      id, 
      name: pending.tool.name 
    });
  }

  /**
   * Reject a pending tool
   * @param {string} id 
   * @param {string} reason 
   */
  async rejectTool(id, reason) {
    const pending = await this.db.get('pending_tools', id);
    if (!pending) throw new Error(`Pending tool not found: ${id}`);
    
    pending.status = 'rejected';
    pending.reason = reason;
    await this.db.put('pending_tools', pending);
    
    this.eventBus.publish('tool:rejected', { id, reason });
  }
}

export default ToolStore;