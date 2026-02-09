/**
 * SessionTree - In-memory session tree management
 *
 * Provides tree-structured conversation management with branching capabilities.
 */

import { SessionHeader, MessageEntry } from './models.js';

/**
 * SessionTree manages conversation trees with branching support
 */
export class SessionTree {
  /**
   * @param {string} cwd - Current working directory for session header
   */
  constructor(cwd = '/home/user/project') {
    /** @type {Map<string, SessionHeader|MessageEntry>} */
    this.entries = new Map();

    // Create root header
    const rootHeader = SessionHeader.create(cwd);
    this.entries.set(rootHeader.id, rootHeader);

    /** @type {string} */
    this.rootId = rootHeader.id;

    /** @type {string} */
    this.leafId = rootHeader.id;
  }

  /**
   * Append a message to the current leaf
   * @param {string} role - Message role (user/assistant/system)
   * @param {string} content - Message content
   * @returns {string} New message ID
   */
  appendMessage(role, content) {
    const message = MessageEntry.create(this.leafId, role, content);
    this.entries.set(message.id, message);
    this.leafId = message.id;
    return message.id;
  }

  /**
   * Branch to a different point in the tree
   * @param {string} entryId - Entry ID to branch from
   */
  branch(entryId) {
    if (!this.entries.has(entryId)) {
      throw new Error(`Entry ${entryId} not found in session tree`);
    }
    this.leafId = entryId;
  }

  /**
   * Get linear history from root to current leaf
   * @returns {Array<SessionHeader|MessageEntry>} History array
   */
  getHistory() {
    const history = [];
    let currentId = this.leafId;

    while (currentId) {
      const entry = this.entries.get(currentId);
      if (!entry) break;

      history.unshift(entry); // Add to front
      currentId = entry.parentId;
    }

    return history;
  }

  /**
   * Get the full tree as a Map
   * @returns {Map<string, SessionHeader|MessageEntry>} Tree entries
   */
  getTree() {
    return new Map(this.entries);
  }

  /**
   * Get current leaf ID
   * @returns {string}
   */
  getLeafId() {
    return this.leafId;
  }

  /**
   * Get root ID
   * @returns {string}
   */
  getRootId() {
    return this.rootId;
  }

  /**
   * Get entry by ID
   * @param {string} id
   * @returns {SessionHeader|MessageEntry|null}
   */
  getEntry(id) {
    return this.entries.get(id) || null;
  }

  /**
   * Check if entry exists
   * @param {string} id
   * @returns {boolean}
   */
  hasEntry(id) {
    return this.entries.has(id);
  }

  /**
   * Get all entries as array
   * @returns {Array<SessionHeader|MessageEntry>}
   */
  getAllEntries() {
    return Array.from(this.entries.values());
  }

  /**
   * Clear all entries (reset to empty tree)
   */
  clear() {
    this.entries.clear();
    const rootHeader = SessionHeader.create('/home/user/project');
    this.entries.set(rootHeader.id, rootHeader);
    this.rootId = rootHeader.id;
    this.leafId = rootHeader.id;
  }
}
