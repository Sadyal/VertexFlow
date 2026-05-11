import { openDB } from 'idb';

const DB_NAME = 'VertexFlow_Cache';
const STORE_NAME = 'documents';
const ASSET_STORE = 'user_assets';
const DB_VERSION = 2;

/**
 * 🗄️ INDEXEDDB UTILITY
 * Handles persistent storage of large document content for instant rendering and offline support.
 */
export const db = {
  /**
   * Initializes the database and creates stores if they don't exist.
   */
  async init() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(ASSET_STORE)) {
          db.createObjectStore(ASSET_STORE); // Simple key-value store
        }
      },
    });
  },

  /**
   * Stores or updates a document in the cache.
   * @param {string} id - Document ID
   * @param {string|object} content - Lexical state or HTML content
   */
  async saveDocument(id, content) {
    if (!id) return;
    try {
      const instance = await this.init();
      const data = {
        id,
        content,
        cachedAt: new Date().toISOString()
      };
      await instance.put(STORE_NAME, data);
      return true;
    } catch (error) {
      console.error(`🚨 DB: Failed to save document ${id}`, error);
      return false;
    }
  },

  /**
   * Retrieves a document from the cache.
   * @param {string} id - Document ID
   */
  async getDocument(id) {
    if (!id) return null;
    try {
      const instance = await this.init();
      const doc = await instance.get(STORE_NAME, id);
      return doc ? doc.content : null;
    } catch (error) {
      console.error(`🚨 DB: Failed to fetch document ${id}`, error);
      return null;
    }
  },

  /**
   * Clears a specific document from the cache.
   */
  async deleteDocument(id) {
    try {
      const instance = await this.init();
      await instance.delete(STORE_NAME, id);
    } catch (error) {
      console.error(`🚨 DB: Failed to delete document ${id}`, error);
    }
  },

  /**
   * 🖼️ ASSET MANAGEMENT (Avatar, etc.)
   */
  async saveUserAsset(key, value) {
    try {
      const instance = await this.init();
      await instance.put(ASSET_STORE, value, key);
      return true;
    } catch (error) {
      console.error(`🚨 DB: Failed to save asset ${key}`, error);
      return false;
    }
  },

  async getUserAsset(key) {
    try {
      const instance = await this.init();
      return await instance.get(ASSET_STORE, key);
    } catch (error) {
      console.error(`🚨 DB: Failed to fetch asset ${key}`, error);
      return null;
    }
  },

  /**
   * 🧹 TOTAL CLEANUP (Logout/Privacy)
   */
  async clearAll() {
    try {
      const instance = await this.init();
      const tx = instance.transaction([STORE_NAME, ASSET_STORE], 'readwrite');
      await Promise.all([
        tx.objectStore(STORE_NAME).clear(),
        tx.objectStore(ASSET_STORE).clear(),
        tx.done
      ]);
      return true;
    } catch (error) {
      console.error('🚨 DB: Critical failure during cleanup', error);
      return false;
    }
  }
};
