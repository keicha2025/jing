const CACHE_NAME = 'note-app-v2';
const ASSETS = [
    './',
    './index.html',
    './config.js',
    './manifest.json',
    './note_appicon.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/diff_match_patch/20121119/diff_match_patch.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js'
];

// 安裝 Service Worker 並快取資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// 清理舊快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// 攔截請求：網路優先 (Network First)
// 對於靜態資源，如果網路失敗則從快取讀取
self.addEventListener('fetch', (event) => {
    // 排除 GAS API 呼叫，不快取動態資料請求
    if (event.request.url.includes('script.google.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 如果成功，順便更新快取
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // 網路失敗時，從快取讀取
                return caches.match(event.request);
            })
    );
});
