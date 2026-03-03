const CACHE_NAME = 'jing-lab-v12';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './jing-lab-appicon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // 僅處理 GET 請求，避免攔截 POST 或其他動態操作
    if (event.request.method !== 'GET') return;

    // 排除 Firestore 與 擴充功能等非標準請求
    const url = event.request.url;
    if (url.includes('firestore.googleapis.com') || url.startsWith('chrome-extension')) {
        return;
    }

    // 不攔截子應用路徑，避免不同子專案互相吃到錯誤快取資源
    const pathname = new URL(url).pathname;
    const excludedPrefixes = [
        '/preview/',
        '/pdf-tool/',
        '/v-player-preview/',
        '/travel-planner/',
        '/finance/',
        '/caselog/',
    ];
    if (excludedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 如果回傳正常，則克隆一份存入快取
                if (response && response.status === 200 && response.type === 'basic') {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 網路斷線時嘗試從快取讀取
                return caches.match(event.request);
            })
    );
});
