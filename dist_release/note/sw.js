const CACHE_NAME = 'note-app-v9';
const ASSETS = [
    '/note/',
    '/note/index.html',
    '/note/config.js',
    '/note/firebase-init.js',
    '/note/manifest.json',
    '/note/style.css',
    '/note/note_appicon.png',
    '/note/diff_match_patch.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
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

// 攔截請求：快取優先 (Cache First) 對於靜態資源
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 排除 GAS API 呼叫與 Firebase 動態請求
    if (url.hostname === 'script.google.com' || url.hostname === 'firestore.googleapis.com') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // 如果在快取中，直接回傳
                return cachedResponse;
            }

            // 否則從網路抓取並放入快取
            return fetch(event.request).then((response) => {
                // 只快取成功的靜態資源
                if (response && response.status === 200 && (response.type === 'basic' || response.url.includes('gstatic.com'))) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            });
        })
    );
});
