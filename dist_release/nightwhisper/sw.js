// ============================================
// NightWhisper — Service Worker
// 離線快取策略 (Cache First)
// ============================================

const CACHE_NAME = 'nightwhisper-v2.16.8';
const ASSETS = [
    '/nightwhisper/',
    '/nightwhisper/index.html',
    '/nightwhisper/css/design-tokens.css?v=2.16.8',
    '/nightwhisper/css/style.css?v=2.16.8',
    '/nightwhisper/js/storage.js?v=2.16.8',
    '/nightwhisper/js/recorder.js?v=2.16.8',
    '/nightwhisper/js/analyzer.js?v=2.16.8',
    '/nightwhisper/js/waveform.js?v=2.16.8',
    '/nightwhisper/js/ui.js?v=2.16.8',
    '/nightwhisper/js/app.js?v=2.16.8',
    '/nightwhisper/manifest.json',
    '/nightwhisper/icons/icon-192.png',
    '/nightwhisper/icons/icon-512.png',
];

// 安裝：預快取所有靜態資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching assets...');
            return cache.addAll(ASSETS);
        }).catch(err => console.error('[SW] Pre-cache failed:', err))
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

// 攔截請求：Network First (主要針對 HTML)，Static Assets 則用 Cache First
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

    if (isHtml) {
        // HTML 或導航請求走 Network First，確保 index.html 永遠抓到最新
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // 其他靜態資源 (帶版本號的 JS/CSS) 走 Cache First
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    // 只快取 200 回應
                    if (response && response.status === 200) {
                        const resClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
                    }
                    return response;
                });
            })
        );
    }
});

// 監聽來自頁面的 skipWaiting 指令
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
