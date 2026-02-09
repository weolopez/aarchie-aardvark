/**
 * Session Manager Models
 *
 * Defines the data structures for session tree management.
 */

/**
 * Session Header - Root node with session metadata
 */
export class SessionHeader {
  /**
   * @param {string} id - Unique session identifier
   * @param {number} timestamp - Creation timestamp
   * @param {string} cwd - Current working directory
   */
  constructor(id, timestamp, cwd) {
    this.id = id;
    this.timestamp = timestamp;
    this.cwd = cwd;
  }

  /**
   * Create a new session header
   * @param {string} cwd - Current working directory
   * @returns {SessionHeader}
   */
  static create(cwd) {
    return new SessionHeader(
      crypto.randomUUID(),
      Date.now(),
      cwd
    );
  }
}

/**
 * Message Entry - Content node with role and message
 */
export class MessageEntry {
  /**
   * @param {string} id - Unique message identifier
   * @param {string} parentId - Parent node ID
   * @param {string} role - Message role (user/assistant/system)
   * @param {string} content - Message content
   */
  constructor(id, parentId, role, content) {
    this.id = id;
    this.parentId = parentId;
    this.role = role;
    this.content = content;
  }

  /**
   * Create a new message entry
   * @param {string} parentId - Parent node ID
   * @param {string} role - Message role
   * @param {string} content - Message content
   * @returns {MessageEntry}
   */
  static create(parentId, role, content) {
    return new MessageEntry(
      crypto.randomUUID(),
      parentId,
      role,
      content
    );
  }
}

/**
 * Session Entry union type
 * @typedef {SessionHeader | MessageEntry} SessionEntry
 */

/**
 * Session Entry type guard
 * @param {any} entry
 * @returns {entry is SessionHeader}
 */
export function isSessionHeader(entry) {
  return entry instanceof SessionHeader;
}

/**
 * Session Entry type guard
 * @param {any} entry
 * @returns {entry is MessageEntry}
 */
export function isMessageEntry(entry) {
  return entry instanceof MessageEntry;
}
