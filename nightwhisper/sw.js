// ============================================
// NightWhisper — Service Worker
// 離線快取策略 (Cache First)
// ============================================

const CACHE_NAME = 'nightwhisper-v2';
const ASSETS = [
    './',
    './index.html',
    './css/design-tokens.css',
    './css/style.css',
    './js/app.js',
    './js/recorder.js',
    './js/analyzer.js',
    './js/storage.js',
    './js/waveform.js',
    './js/ui.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// 安裝：預快取所有靜態資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// 啟用：清除舊版快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 攔截請求：Cache First + Network Fallback
self.addEventListener('fetch', (event) => {
    // 跳過非 GET 請求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // 只快取同源的成功回應
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            }).catch(() => {
                // 離線 fallback — 回傳主頁面
                return caches.match('./index.html');
            });
        })
    );
});
