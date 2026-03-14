const DB_NAME = 'NightWhisperDB';
const DB_VERSION = 2;
const STORE_CHUNKS = 'audio_chunks';
const STORE_EVENTS = 'ai_events';

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
                const store = db.createObjectStore(STORE_CHUNKS, { keyPath: 'id', autoIncrement: true });
                store.createIndex('sessionId', 'sessionId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_EVENTS)) {
                const store = db.createObjectStore(STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
                store.createIndex('sessionId', 'sessionId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

export const saveAudioChunk = async (chunk) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CHUNKS], 'readwrite');
        const store = transaction.objectStore(STORE_CHUNKS);
        const request = store.add(chunk);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveAIEvent = async (eventData) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_EVENTS], 'readwrite');
        const store = transaction.objectStore(STORE_EVENTS);
        const request = store.add(eventData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getSessionChunks = async (sessionId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CHUNKS], 'readonly');
        const store = transaction.objectStore(STORE_CHUNKS);
        const index = store.index('sessionId');
        const request = index.getAll(IDBKeyRange.only(sessionId));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getSessionEvents = async (sessionId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_EVENTS], 'readonly');
        const store = transaction.objectStore(STORE_EVENTS);
        const index = store.index('sessionId');
        const request = index.getAll(IDBKeyRange.only(sessionId));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getAllSessions = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CHUNKS], 'readonly');
        const store = transaction.objectStore(STORE_CHUNKS);
        const request = store.getAll();

        request.onsuccess = () => {
            const chunks = request.result;
            const sessionsMap = {};
            chunks.forEach(chunk => {
                if (!sessionsMap[chunk.sessionId]) {
                    sessionsMap[chunk.sessionId] = {
                        sessionId: chunk.sessionId,
                        timestamp: chunk.timestamp,
                        chunksCount: 0,
                        totalSize: 0
                    };
                }
                sessionsMap[chunk.sessionId].chunksCount++;
                if (chunk.blob) sessionsMap[chunk.sessionId].totalSize += chunk.blob.size;
            });
            resolve(Object.values(sessionsMap).sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSession = async (sessionId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CHUNKS, STORE_EVENTS], 'readwrite');

        // Delete chunks
        const chunkStore = transaction.objectStore(STORE_CHUNKS);
        const chunkIndex = chunkStore.index('sessionId');
        const chunkReq = chunkIndex.getAllKeys(IDBKeyRange.only(sessionId));
        chunkReq.onsuccess = () => {
            chunkReq.result.forEach(key => chunkStore.delete(key));
        };

        // Delete events
        const eventStore = transaction.objectStore(STORE_EVENTS);
        const eventIndex = eventStore.index('sessionId');
        const eventReq = eventIndex.getAllKeys(IDBKeyRange.only(sessionId));
        eventReq.onsuccess = () => {
            eventReq.result.forEach(key => eventStore.delete(key));
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
