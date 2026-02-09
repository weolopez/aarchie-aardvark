/**
 * SessionManager - High-level session management with persistence
 *
 * Provides session tree management with IndexedDB persistence and Web Worker integration.
 */

import { SessionTree } from './session-tree.js';
import { SessionStore } from '../../../storage/session-store/src/index.js';
import { MessageBridgeMain } from '../../../core/message-bridge/src/index.js';

/**
 * SessionManager coordinates session trees with persistence
 */
export class SessionManager {
  /**
   * @param {Object} options
   * @param {SessionStore} [options.sessionStore] - Session store instance
   * @param {MessageBridgeMain} [options.messageBridge] - Message bridge for Web Worker comms
   */
  constructor(options = {}) {
    this.sessionStore = options.sessionStore || new SessionStore();
    this.messageBridge = options.messageBridge || null; // MessageBridgeMain instance (optional)

    /** @type {Map<string, SessionTree>} */
    this.activeTrees = new Map();

    // Set up message handlers
    this.setupMessageHandlers();
  }

  /**
   * Set up message handlers for Web Worker communication
   */
  setupMessageHandlers() {
    if (this.messageBridge) {
      this.messageBridge.on('session:create', this.handleCreateSession.bind(this));
      this.messageBridge.on('session:append', this.handleAppendMessage.bind(this));
      this.messageBridge.on('session:branch', this.handleBranch.bind(this));
      this.messageBridge.on('session:getHistory', this.handleGetHistory.bind(this));
      this.messageBridge.on('session:getTree', this.handleGetTree.bind(this));
    }
  }

  /**
   * Create a new session
   * @param {string} cwd - Current working directory
   * @returns {Promise<string>} Session ID
   */
  async createSession(cwd = '/home/user/project') {
    const tree = new SessionTree(cwd);
    const sessionId = tree.getRootId();

    this.activeTrees.set(sessionId, tree);

    // Persist to store
    await this.persistTree(sessionId);

    return sessionId;
  }

  /**
   * Load a session from storage
   * @param {string} sessionId
   * @returns {Promise<SessionTree>}
   */
  async loadSession(sessionId) {
    if (this.activeTrees.has(sessionId)) {
      return this.activeTrees.get(sessionId);
    }

    // Load from storage
    const entries = await this.sessionStore.getTree(sessionId);
    if (entries.length === 0) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Reconstruct tree
    const tree = new SessionTree();
    tree.entries.clear(); // Clear default root

    for (const entry of entries) {
      tree.entries.set(entry.id, entry);
      if (!entry.parentId) {
        tree.rootId = entry.id;
      }
    }

    // Find leaf (most recent entry)
    let leafId = tree.rootId;
    const processed = new Set();

    const findLeaf = (id) => {
      if (processed.has(id)) return;
      processed.add(id);

      const entry = tree.entries.get(id);
      if (!entry) return;

      leafId = id;

      // Find children and recurse
      for (const [childId, childEntry] of tree.entries) {
        if (childEntry.parentId === id) {
          findLeaf(childId);
        }
      }
    };

    findLeaf(tree.rootId);
    tree.leafId = leafId;

    this.activeTrees.set(sessionId, tree);
    return tree;
  }

  /**
   * Append message to session
   * @param {string} sessionId
   * @param {string} role
   * @param {string} content
   * @returns {Promise<string>} Message ID
   */
  async appendMessage(sessionId, role, content) {
    const tree = await this.loadSession(sessionId);
    const messageId = tree.appendMessage(role, content);

    await this.persistTree(sessionId);
    return messageId;
  }

  /**
   * Branch session to different point
   * @param {string} sessionId
   * @param {string} entryId
   * @returns {Promise<void>}
   */
  async branch(sessionId, entryId) {
    const tree = await this.loadSession(sessionId);
    tree.branch(entryId);

    // Note: Branching doesn't create new entries, so no persistence needed
  }

  /**
   * Get session history
   * @param {string} sessionId
   * @returns {Promise<Array>} History array
   */
  async getHistory(sessionId) {
    const tree = await this.loadSession(sessionId);
    return tree.getHistory();
  }

  /**
   * Get session tree
   * @param {string} sessionId
   * @returns {Promise<Map>} Tree entries
   */
  async getTree(sessionId) {
    const tree = await this.loadSession(sessionId);
    return tree.getTree();
  }

  /**
   * Persist tree to storage
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async persistTree(sessionId) {
    const tree = this.activeTrees.get(sessionId);
    if (!tree) return;

    const entries = tree.getAllEntries();
    await this.sessionStore.saveTree(sessionId, entries);
  }

  /**
   * Handle create session message
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async handleCreateSession(data) {
    try {
      const sessionId = await this.createSession(data.cwd);
      return { success: true, sessionId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle append message
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async handleAppendMessage(data) {
    try {
      const messageId = await this.appendMessage(data.sessionId, data.role, data.content);
      return { success: true, messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle branch message
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async handleBranch(data) {
    try {
      await this.branch(data.sessionId, data.entryId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle get history message
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async handleGetHistory(data) {
    try {
      const history = await this.getHistory(data.sessionId);
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle get tree message
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async handleGetTree(data) {
    try {
      const tree = await this.getTree(data.sessionId);
      return { success: true, tree: Array.from(tree.entries()) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
