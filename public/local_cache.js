/**
 * CacheManager provides instant cache-first loading with automatic background refresh.
 * 
 */
class CacheManager {
  /**
   * @param {number} [defaultTTL=1800000] - Default TTL in ms (30 minutes)
   */
  constructor(defaultTTL = 1000 * 60 * 30) {
    /** @private */
    this.defaultTTL = defaultTTL;
    /** @private */
    this.db = null;
    /** @private */
    this.dbName = 'appCache';
    /** @private */
    this.version = 1;
  }

  /**
   * Initialize IndexedDB connection (called automatically)
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  async initDB() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => { 
        this.db = req.result; 
        resolve(this.db); 
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * MAGIC METHOD: Load data with instant cache-first + background refresh
   * 1. Returns cached data IMMEDIATELY (never blocks UI)
   * 2. If stale/missing, fetches fresh data in BACKGROUND  
   * 3. Silently updates cache + UI when done
   * 
   * @param {string} resourceKey - Unique key ('tags', 'users', 'stats')
   * @param {Function} fetchFn - Function that returns Promise<JSON>
   * @param {number} [ttlMs] - Override default TTL
   * @returns {Promise<any|null>} Cached data (or null if none)
   */
  async load(resourceKey, fetchFn, ttlMs = null) {
    const ttl = ttlMs || this.defaultTTL;
    let cached = await this.getWithRaw(resourceKey);
    
    // IMMEDIATE RETURN - never block!
    if (cached && Date.now() - cached.timestamp <= ttl) {
      return cached.value;
    }
    
    // BACKGROUND refresh (non-blocking)
    this.refresh(resourceKey, fetchFn, ttl).catch(console.error);
    return cached?.value || null;
  }

  /**
   * Force refresh: fetch fresh data + update cache
   * @param {string} resourceKey 
   * @param {Function} fetchFn 
   * @param {number} [ttlMs] 
   * @returns {Promise<any>}
   */
  async refresh(resourceKey, fetchFn, ttlMs = null) {
    const ttl = ttlMs || this.defaultTTL;
    try {
      const data = await fetchFn();
      await this.set(resourceKey, data, ttl);
      return data;
    } catch (err) {
      console.error(`Refresh failed for ${resourceKey}:`, err);
      throw err;
    }
  }

  /**
   * Manual set with TTL
   * @param {string} resourceKey 
   * @param {any} value - Any JSON-serializable value
   * @param {number} [ttlMs] 
   */
  async set(resourceKey, value, ttlMs = null) {
    const ttl = ttlMs || this.defaultTTL;
    await this.initDB();
    
    const record = { 
      id: resourceKey, 
      value, 
      timestamp: Date.now(), 
      ttl 
    };
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      const req = store.put(record);
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get with automatic TTL validation + stale eviction
   * @param {string} resourceKey 
   * @returns {Promise<any|null>}
   */
  async get(resourceKey) {
    const data = await this.getWithRaw(resourceKey);
    if (!data) return null;
    
    if (Date.now() - data.timestamp > data.ttl) {
      await this.delete(resourceKey); // Auto-evict stale
      return null;
    }
    return data.value;
  }

  /**
   * Raw get (no TTL check) - for internal use
   * @private
   */
  async getWithRaw(resourceKey) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const req = store.get(resourceKey);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Check if key exists and is fresh */
  async has(resourceKey) {
    return !!(await this.get(resourceKey));
  }

  /** Delete specific key */
  async delete(resourceKey) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      store.delete(resourceKey);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Clear ALL cached data */
  async clear() {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      store.clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
}

// SINGLE GLOBAL INSTANCE - import anywhere
const APP_CACHE = new CacheManager();

/*
USAGE EXAMPLES:

// ===== 1. COUCHDB TAGS (your original use case) =====
async function loadTagsPage(dbUrl) {
  const tags = await cache.load('tags', () => fetchAllTags(dbUrl));
  renderTags(tags || []); // INSTANT - never blocks!
}

// ===== 2. USERS LIST =====
async function loadUsersPage() {
  const users = await cache.load('users', () => fetch('/api/users'));
  renderUsers(users || []);
}

// ===== 3. STATS DASHBOARD =====
async function loadStats() {
  const stats = await cache.load('stats', () => fetchStats(dbUrl), 5 * 60 * 1000); // 5min TTL
  renderStats(stats);
}

// ===== 4. REFRESH BUTTONS =====
$('#refresh-tags').click(async () => {
  await cache.refresh('tags', () => fetchAllTags(dbUrl));
});

// ===== 5. MANUAL CONTROL =====
const tags = await cache.get('tags');     // TTL-aware get
await cache.set('config', configData);    // Manual set
await cache.delete('tags');               // Invalidate
await cache.clear();                      // Nuke everything

// PERFECT FOR: tags, users, categories, search results, stats, config
*/
