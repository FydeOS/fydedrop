const CACHE_NAME = 'FydeDrop-v1.1.0';
const urlsToCache = [
    '/',
    '/styles.css',
    '/scripts/network.js',
    '/scripts/ui.js',
    '/sounds/drop.mp3',
    '/images/drop.fydeos.com.png',
    '/images/favicon.png',
];

self.addEventListener('install', function(event) {
    // Perform install steps
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            // Cache hit - return response
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
});

self.addEventListener('activate', function(event) {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

console.log(`%c  ${CACHE_NAME}  `, 'color:#fafafa; background:#870611');
