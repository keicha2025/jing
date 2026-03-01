// ============================================
// NightWhisper — Storage Module
// IndexedDB 管理 (錄音 + 事件 + 睡眠記錄)
// ============================================

const DB_NAME = 'nightwhisper-db';
const DB_VERSION = 1;

const STORES = {
    SESSIONS: 'sessions',
    RECORDINGS: 'recordings',
    EVENTS: 'events',
    ANALYSIS: 'analysis',
};

class NightWhisperStorage {
    constructor() {
        this.db = null;
    }

    /**
     * 初始化 IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // 睡眠記錄
                if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
                    const sessions = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
                    sessions.createIndex('startTime', 'startTime', { unique: false });
                }

                // 錄音分段
                if (!db.objectStoreNames.contains(STORES.RECORDINGS)) {
                    const recordings = db.createObjectStore(STORES.RECORDINGS, { keyPath: 'id' });
                    recordings.createIndex('sessionId', 'sessionId', { unique: false });
                    recordings.createIndex('segmentIndex', 'segmentIndex', { unique: false });
                }

                // 偵測事件
                if (!db.objectStoreNames.contains(STORES.EVENTS)) {
                    const events = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
                    events.createIndex('sessionId', 'sessionId', { unique: false });
                    events.createIndex('type', 'type', { unique: false });
                    events.createIndex('time', 'time', { unique: false });
                }

                // 分析數據 (每秒一筆)
                if (!db.objectStoreNames.contains(STORES.ANALYSIS)) {
                    const analysis = db.createObjectStore(STORES.ANALYSIS, { keyPath: 'id' });
                    analysis.createIndex('sessionId', 'sessionId', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
        });
    }

    // ── Session CRUD ──

    async createSession(session) {
        return this._put(STORES.SESSIONS, {
            id: session.id || this._generateId(),
            startTime: Date.now(),
            endTime: null,
            delayMinutes: session.delayMinutes || 0,
            podcastFilter: session.podcastFilter ?? true,
            status: 'recording', // recording | completed
            ...session,
        });
    }

    async endSession(sessionId) {
        const session = await this._get(STORES.SESSIONS, sessionId);
        if (session) {
            session.endTime = Date.now();
            session.status = 'completed';
            return this._put(STORES.SESSIONS, session);
        }
    }

    async getSession(sessionId) {
        return this._get(STORES.SESSIONS, sessionId);
    }

    async getAllSessions() {
        return this._getAll(STORES.SESSIONS);
    }

    async getLatestSession() {
        const all = await this._getAll(STORES.SESSIONS);
        if (all.length === 0) return null;
        return all.sort((a, b) => b.startTime - a.startTime)[0];
    }

    // ── Recording Segments ──

    async saveRecording(recording) {
        return this._put(STORES.RECORDINGS, {
            id: this._generateId(),
            timestamp: Date.now(),
            ...recording,
        });
    }

    async getRecordingsBySession(sessionId) {
        return this._getAllByIndex(STORES.RECORDINGS, 'sessionId', sessionId);
    }

    // ── Events ──

    async saveEvent(event) {
        return this._put(STORES.EVENTS, {
            id: this._generateId(),
            timestamp: Date.now(),
            ...event,
        });
    }

    async getEventsBySession(sessionId) {
        const events = await this._getAllByIndex(STORES.EVENTS, 'sessionId', sessionId);
        return events.sort((a, b) => a.time - b.time);
    }

    // ── Analysis Data ──

    async saveAnalysisData(data) {
        return this._put(STORES.ANALYSIS, {
            id: this._generateId(),
            ...data,
        });
    }

    async saveAnalysisBatch(dataArray) {
        const tx = this.db.transaction(STORES.ANALYSIS, 'readwrite');
        const store = tx.objectStore(STORES.ANALYSIS);
        for (const data of dataArray) {
            store.put({ id: this._generateId(), ...data });
        }
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getAnalysisBySession(sessionId) {
        const data = await this._getAllByIndex(STORES.ANALYSIS, 'sessionId', sessionId);
        return data.sort((a, b) => a.time - b.time);
    }

    // ── Cleanup ──

    /**
     * 清除特定 Session 的事件與分析數據 (用於重新分析)
     */
    async clearSessionData(sessionId) {
        const events = await this.getEventsBySession(sessionId);
        const analysis = await this.getAnalysisBySession(sessionId);

        const tx = this.db.transaction([STORES.EVENTS, STORES.ANALYSIS], 'readwrite');
        for (const e of events) tx.objectStore(STORES.EVENTS).delete(e.id);
        for (const a of analysis) tx.objectStore(STORES.ANALYSIS).delete(a.id);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * 僅清除特定 Session 的事件 (保留分析數據，用於快速重新分析)
     */
    async clearSessionEvents(sessionId) {
        const events = await this.getEventsBySession(sessionId);

        const tx = this.db.transaction(STORES.EVENTS, 'readwrite');
        for (const e of events) tx.objectStore(STORES.EVENTS).delete(e.id);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async deleteSession(sessionId) {
        // 刪除 session 及其所有錄音、事件、分析資料
        const recordings = await this.getRecordingsBySession(sessionId);
        const events = await this.getEventsBySession(sessionId);
        const analysis = await this.getAnalysisBySession(sessionId);

        const tx = this.db.transaction(
            [STORES.SESSIONS, STORES.RECORDINGS, STORES.EVENTS, STORES.ANALYSIS],
            'readwrite'
        );

        tx.objectStore(STORES.SESSIONS).delete(sessionId);
        for (const r of recordings) tx.objectStore(STORES.RECORDINGS).delete(r.id);
        for (const e of events) tx.objectStore(STORES.EVENTS).delete(e.id);
        for (const a of analysis) tx.objectStore(STORES.ANALYSIS).delete(a.id);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // ── Private helpers ──

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    _put(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    _get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    _getAllByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
}

// Export singleton
window.NightWhisperStorage = NightWhisperStorage;
