const CACHE_NAME = 'note-app-v3';
const ASSETS = [
    '/note/',
    '/note/index.html',
    '/note/config.js',
    '/note/manifest.json',
    '/note/note_appicon.png',
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
            // 逐一加入，避免單一失敗導致全部 install 失敗
            return Promise.allSettled(ASSETS.map(url => cache.add(url)));
        })
    );
    self.skipWaiting();
});

// 清理舊快取 (包含 v2 的所有舊版本)
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

// 攔截請求：網路優先 (Network First)
self.addEventListener('fetch', (event) => {
    // 排除 GAS API 呼叫與 Firebase 動態請求
    const url = event.request.url;
    if (url.includes('script.google.com') || url.includes('firestore.googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 只快取成功的靜態資源 (非 opaque)
                if (response && response.status === 200 && response.type === 'basic') {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 網路失敗時，從快取讀取
                return caches.match(event.request);
            })
    );
});
