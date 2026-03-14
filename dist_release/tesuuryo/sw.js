const CACHE_NAME = 'tesuuryo-pwa-v4';
const ASSETS = [
    './index.html',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(ASSETS.map(url => cache.add(url)));
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
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const resClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, resClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => null);

            if (event.request.mode === 'navigate' && !cachedResponse) {
                return fetchPromise.then(response => {
                    return response || caches.match('./index.html') || caches.match('./');
                }).catch(() => caches.match('./index.html'));
            }

            return cachedResponse || fetchPromise || fetch(event.request);
        }).catch(() => {
            return fetch(event.request);
        })
    );
});
