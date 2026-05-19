import { openDB } from 'idb';

const DB_NAME = 'VertexFlow_Cache';
const STORE_NAME = 'documents';
const ASSET_STORE = 'user_assets';
const OFFLINE_OPS_STORE = 'offline_ops';
const DB_VERSION = 3;

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
        if (!db.objectStoreNames.contains(OFFLINE_OPS_STORE)) {
          db.createObjectStore(OFFLINE_OPS_STORE, { keyPath: 'opId' });
        }
      },
    });
  },

  /**
   * Stores or updates a document in the cache.
   * @param {string} id - Document ID
   * @param {string|object} content - Lexical state or HTML content
   * @param {string} userId - ID of the currently logged-in user
   * @param {boolean} pendingSave - Whether there are unsaved local edits
   * @param {string} updatedAt - Server document last-updated timestamp
   */
  async saveDocument(id, content, userId, pendingSave = false, updatedAt = null) {
    if (!id || !userId) return;
    try {
      const instance = await this.init();
      const existing = await instance.get(STORE_NAME, `${userId}_${id}`);
      const data = {
        id: `${userId}_${id}`, // Isolate cache record by user
        content,
        pendingSave,
        cachedAt: new Date().toISOString(),
        updatedAt: updatedAt || existing?.updatedAt || null
      };
      await instance.put(STORE_NAME, data);
      return true;
    } catch (error) {
      console.error(`🚨 DB: Failed to save document ${id}`, error);
      return false;
    }
  },

  /**
   * Retrieves the full document record from the cache.
   */
  async getDocumentRecord(id, userId) {
    if (!id || !userId) return null;
    try {
      const instance = await this.init();
      return await instance.get(STORE_NAME, `${userId}_${id}`);
    } catch (error) {
      console.error(`🚨 DB: Failed to fetch document record ${id}`, error);
      return null;
    }
  },

  /**
   * Retrieves a document from the cache.
   * @param {string} id - Document ID
   * @param {string} userId - ID of the currently logged-in user
   */
  async getDocument(id, userId) {
    if (!id || !userId) return null;
    try {
      const instance = await this.init();
      const doc = await instance.get(STORE_NAME, `${userId}_${id}`);
      return doc ? doc.content : null;
    } catch (error) {
      console.error(`🚨 DB: Failed to fetch document ${id}`, error);
      return null;
    }
  },

  /**
   * Clears a specific document from the cache.
   */
  async deleteDocument(id, userId) {
    if (!id || !userId) return;
    try {
      const instance = await this.init();
      await instance.delete(STORE_NAME, `${userId}_${id}`);
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
   * 📴 OFFLINE TRANSACTION LOG QUEUE (SRE Reliability Engine)
   */
  async queueOfflineOp(op) {
    if (!op || !op.opId) return false;
    try {
      const instance = await this.init();
      await instance.put(OFFLINE_OPS_STORE, op);
      return true;
    } catch (error) {
      console.error('🚨 DB: Failed to queue offline operation', error);
      return false;
    }
  },

  async getOfflineOps() {
    try {
      const instance = await this.init();
      return await instance.getAll(OFFLINE_OPS_STORE);
    } catch (error) {
      console.error('🚨 DB: Failed to retrieve offline operations queue', error);
      return [];
    }
  },

  async removeOfflineOp(opId) {
    if (!opId) return false;
    try {
      const instance = await this.init();
      await instance.delete(OFFLINE_OPS_STORE, opId);
      return true;
    } catch (error) {
      console.error(`🚨 DB: Failed to purge operation ${opId} from queue`, error);
      return false;
    }
  },

  /**
   * 🧹 TOTAL CLEANUP (Logout/Privacy)
   */
  async clearAll() {
    try {
      const instance = await this.init();
      const tx = instance.transaction([STORE_NAME, ASSET_STORE, OFFLINE_OPS_STORE], 'readwrite');
      await Promise.all([
        tx.objectStore(STORE_NAME).clear(),
        tx.objectStore(ASSET_STORE).clear(),
        tx.objectStore(OFFLINE_OPS_STORE).clear(),
        tx.done
      ]);
      return true;
    } catch (error) {
      console.error('🚨 DB: Critical failure during cleanup', error);
      return false;
    }
  }
};
