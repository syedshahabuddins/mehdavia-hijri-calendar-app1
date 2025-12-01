// Service Worker for PWA: cache static assets and enable offline fallback
const CACHE_NAME = 'hijri-calendar-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: caching app shell');
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('Cache.addAll error (some resources may be unavailable offline):', err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response if available
      if (response) return response;

      // Otherwise, fetch from network
      return fetch(event.request).then(response => {
        // Don't cache non-200 responses
        if (!response || response.status !== 200) return response;

        // Cache successful responses for offline use
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Return a simple offline fallback if available
        return caches.match('/index.html').catch(() => {
          return new Response('Offline - please check your connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      });
    })
  );
});
