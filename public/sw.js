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

  // Intercept the /api/proxy request and handle it directly in the client Service Worker!
  // This allows the user's local internet (e.g. Bangladesh IP) to fetch Bangladeshi local streams,
  // avoiding "wrong_country" blocking on Cloudflare / Cloud Run, while completely bypassing Mixed Content blocks.
  if (url.pathname.includes('/api/proxy') && url.searchParams.has('url')) {
    const targetUrl = url.searchParams.get('url');
    const referer = url.searchParams.get('referer');
    const userAgent = url.searchParams.get('userAgent');
    const cookie = url.searchParams.get('cookie');
    
    event.respondWith(
      handleClientProxy(targetUrl, referer, userAgent, cookie, event.request)
    );
    return;
  }

  // Bypass the service worker completely for other APIs or external media streams
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

// Client-side local HTTP-to-HTTPS/CORS bypass proxy running in Service Worker.
// It fetches video data using the user's local internet connection (resolving the "wrong_country" block)
// and proxies it under the same HTTPS host to prevent "Mixed Content" blocks.
async function handleClientProxy(targetUrl, referer, userAgent, cookie, originalRequest) {
  try {
    const incomingRange = originalRequest.headers.get('range');
    let currentUrl = targetUrl;
    let response;
    let redirectCount = 0;
    const maxRedirects = 5;

    while (redirectCount < maxRedirects) {
      let safeOrigin = 'http://www.fawanews.sc';
      if (referer) {
        try {
          safeOrigin = new URL(referer).origin;
        } catch (e) {
          try {
            safeOrigin = new URL('http://' + referer).origin;
          } catch (err) {}
        }
      }

      // Prepare request headers
      const requestHeaders = new Headers();
      requestHeaders.set('Accept', '*/*');

      // Forward Range header if present
      if (incomingRange) {
        requestHeaders.set('Range', incomingRange);
      }

      // Fetch the insecure HTTP stream directly using local network (runs from client device)
      response = await fetch(currentUrl, {
        headers: requestHeaders,
        redirect: 'manual'
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (!location) {
          break;
        }
        currentUrl = new URL(location, currentUrl).href;
        redirectCount++;
      } else {
        break;
      }
    }

    // Fallback to the server-side proxy if the client fetch fails
    if (!response || !response.ok) {
      console.warn('Client proxy fetch failed or returned error. Falling back to backend server...');
      return fetch(originalRequest);
    }

    const contentType = response.headers.get('content-type') || '';
    const lowerUrl = targetUrl.toLowerCase();

    // If it's an HLS playlist (.m3u8), we rewrite relative URLs inside to route through this client proxy
    if (
      lowerUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('application/vnd.apple.mpegurl')
    ) {
      const playlistText = await response.text();
      const lines = playlistText.split('\n');
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed === '') return line;

        const proxyUrl = (rawUrl) => {
          try {
            const parentUrlObj = new URL(targetUrl);
            const resolvedUrlObj = new URL(rawUrl, targetUrl);

            // Copy parent query parameters (like tokens) to the segments if they are not already present
            const parentParams = parentUrlObj.searchParams;
            const resolvedParams = resolvedUrlObj.searchParams;
            for (const [key, value] of parentParams.entries()) {
              if (!resolvedParams.has(key)) {
                resolvedParams.set(key, value);
              }
            }

            let resolvedUrl = resolvedUrlObj.href;

            // Preserve double-slashes if the parent URL path includes double slashes (e.g. :8097//Somoy-TV)
            if (targetUrl.includes('://') && targetUrl.split('://')[1].includes('//')) {
              const protocol = targetUrl.split('://')[0];
              const restOfParent = targetUrl.split('://')[1];
              const hostPart = restOfParent.split('/')[0];
              const singleSlashPrefix = `${protocol}://${hostPart}/`;
              const doubleSlashPrefix = `${protocol}://${hostPart}//`;
              if (resolvedUrl.startsWith(singleSlashPrefix) && !resolvedUrl.startsWith(doubleSlashPrefix)) {
                resolvedUrl = doubleSlashPrefix + resolvedUrl.substring(singleSlashPrefix.length);
              }
            }

            let proxyQuery = `url=${encodeURIComponent(resolvedUrl)}`;
            if (referer) proxyQuery += `&referer=${encodeURIComponent(referer)}`;
            if (userAgent) proxyQuery += `&userAgent=${encodeURIComponent(userAgent)}`;
            if (cookie) proxyQuery += `&cookie=${encodeURIComponent(cookie)}`;
            
            const proxyOrigin = new URL(originalRequest.url).origin;
            return `${proxyOrigin}/api/proxy?${proxyQuery}`;
          } catch (e) {
            return rawUrl;
          }
        };

        if (trimmed.startsWith('#')) {
          return line.replace(/(URI=["'])([^"']*)(["'])/g, (match, prefix, urlVal, suffix) => {
            if (urlVal.startsWith('/api/proxy') || urlVal.startsWith('http')) {
              return match;
            }
            return `${prefix}${proxyUrl(urlVal)}${suffix}`;
          });
        }

        if (trimmed.startsWith('/api/proxy') || trimmed.startsWith('http')) {
          return line;
        }
        return proxyUrl(trimmed);
      });

      return new Response(rewrittenLines.join('\n'), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Content-Type': 'application/vnd.apple.mpegurl'
        }
      });
    }

    // For fMP4 or TS chunks, pass back the response directly with proper CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': contentType || 'video/mp2t'
    };

    const contentRange = response.headers.get('Content-Range');
    if (contentRange) corsHeaders['Content-Range'] = contentRange;
    const acceptRanges = response.headers.get('Accept-Ranges');
    if (acceptRanges) corsHeaders['Accept-Ranges'] = acceptRanges;
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) corsHeaders['Content-Length'] = contentLength;

    return new Response(response.body, {
      status: response.status,
      headers: corsHeaders
    });

  } catch (error) {
    console.warn('Local client-side proxy fetch encountered error, falling back to server:', error);
    return fetch(originalRequest);
  }
}
