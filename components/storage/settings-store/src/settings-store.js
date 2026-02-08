/**
 * SettingsStore - System configuration and user preferences
 * 
 * Manages global settings using IndexedDB.
 * Supports namespaced sections (e.g., 'llm', 'ui', 'user').
 */

import { EventBus } from '../../../core/event-bus/src/index.js';
import { IndexedDBProvider } from '../../../core/indexeddb-provider/src/index.js';

/**
 * @typedef {Object} SettingChange
 * @property {string} key
 * @property {any} value
 * @property {any} oldValue
 */

export class SettingsStore {
  /**
   * @param {Object} options
   * @param {EventBus} [options.eventBus]
   * @param {IndexedDBProvider} [options.db]
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.db = options.db || new IndexedDBProvider('aardvark-settings', 1);
    this.initialized = false;
  }

  /**
   * Initialize the settings store
   */
  async initialize() {
    if (this.initialized) return;

    await this.db.initialize([
      {
        name: 'settings',
        keyPath: 'key'
      }
    ]);

    this.initialized = true;
    this.eventBus.publish('settings:ready', {});
  }

  /**
   * Get a specific setting
   * @param {string} key 
   * @param {any} [defaultValue] 
   * @returns {Promise<any>}
   */
  async get(key, defaultValue = undefined) {
    const record = await this.db.get('settings', key);
    return record ? record.value : defaultValue;
  }

  /**
   * Set a specific setting
   * @param {string} key 
   * @param {any} value 
   */
  async set(key, value) {
    const oldValue = await this.get(key);
    
    await this.db.put('settings', { key, value, modified: Date.now() });
    
    this.eventBus.publish('setting:changed', {
      key,
      value,
      oldValue
    });
  }

  /**
   * Delete a setting
   * @param {string} key 
   */
  async delete(key) {
    const oldValue = await this.get(key);
    if (oldValue === undefined) return;

    await this.db.delete('settings', key);
    
    this.eventBus.publish('setting:deleted', {
      key,
      oldValue
    });
  }

  /**
   * Get all settings as a single object
   * @returns {Promise<Object>}
   */
  async getAll() {
    const records = await this.db.getAll('settings');
    const settings = {};
    for (const record of records) {
      settings[record.key] = record.value;
    }
    return settings;
  }

  /**
   * Get a section of settings (keys starting with "section.")
   * @param {string} section 
   * @returns {Promise<Object>}
   */
  async getSection(section) {
    const prefix = `${section}.`;
    const records = await this.db.getAll('settings');
    
    const result = {};
    for (const record of records) {
      if (record.key.startsWith(prefix)) {
        const subKey = record.key.substring(prefix.length);
        result[subKey] = record.value;
      }
    }
    return result;
  }

  /**
   * Set multiple values for a section
   * @param {string} section 
   * @param {Object} values 
   */
  async setSection(section, values) {
    for (const [subKey, value] of Object.entries(values)) {
      await this.set(`${section}.${subKey}`, value);
    }
  }
}

export default SettingsStore;
