const CACHE_NAME = 'ireentv-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.jpg',
  '/icon-512.jpg',
  '/favicon.jpg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Required by Chrome for PWA installation)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass the service worker completely for APIs, video proxies, or external media streams
  // This prevents any "403 Forbidden (from service worker)" errors and allows the browser's
  // native network engine to handle range headers, cookies, and redirects.
  if (
    url.searchParams.has('url') ||
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('/proxy') || 
    url.pathname.endsWith('.m3u8') || 
    url.pathname.endsWith('.ts') || 
    url.pathname.endsWith('.key') ||
    url.pathname.includes('.fmp4') ||
    url.pathname.includes('/index.fmp4')
  ) {
    return;
  }

  // Network falling back to cache for standard pages and static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, clone and update cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request);
      })
  );
});
