const CACHE_NAME = 'note-app-v19';
const ASSETS = [
    '/note',
    '/note/',
    '/note/index.html',
    '/note/config.js',
    '/note/firebase-init.js',
    '/note/manifest.json',
    '/note/style.css',
    '/note/note_appicon.png',
    '/note/icon-192.png',
    '/note/icon-512.png',
    '/note/diff_match_patch.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,0,0',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// 隱形助手：安裝階段即強行填滿口袋 (Aggressively prefill cache)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(ASSETS.map(url => cache.add(url)));
        })
    );
    self.skipWaiting();
});

// 立即接管 (Immediate Takeover)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 核心邏輯：離線 Web 優先 (Stale-While-Revalidate for ALL)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 排除 API 直連 (需要即時性的資料)
    if (url.hostname === 'script.google.com' || url.hostname === 'firestore.googleapis.com' || url.hostname === 'identitytoolkit.googleapis.com') {
        return;
    }

    // 只處理 GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 不論有沒有快取，都發起網路請求進行「背景更新」
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const resClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
                }
                return networkResponse;
            }).catch(() => {
                // 背景更新失敗 (離線) 保持沉默
                return null;
            });

            // 如果是導航請求且沒有快取，且背景更新也失敗，回退到主頁面快取
            if (event.request.mode === 'navigate' && !cachedResponse) {
                return fetchPromise.then(response => {
                    return response || caches.match('/note') || caches.match('/note/index.html');
                }).catch(() => caches.match('/note') || caches.match('/note/index.html'));
            }

            // 隱形助手核心：優先吐出硬碟內容，網路請求僅在背景默默進行
            return cachedResponse || fetchPromise || fetch(event.request);
        }).catch(() => {
            // 最後防線：如果 caches.match 報錯
            return fetch(event.request);
        })
    );
});
