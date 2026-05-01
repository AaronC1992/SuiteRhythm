// SuiteRhythm Service Worker
const CACHE_NAME = 'SuiteRhythm-v26'; // Bumped: network-first app shell + legacy audio bypass

// Note: Sound files are served via /r2-audio/* proxy (Cloudflare R2) and NOT cached here
// because they are:
// 1. Too large (~100MB total) for browser cache
// 2. Cross-origin resources with CORS complexity
// 3. Better served fresh from CDN/backend
// Audio files are streamed on-demand with Howler.js html5 mode

const urlsToCache = [
  '/',
  '/manifest.json',
  '/saved-sounds.json',
  '/stories.json',
  '/icon.svg',
  '/favicon.svg'
];

function shouldBypassCache(request, url) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  return url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/r2-audio/') ||
    url.pathname.startsWith('/Saved%20sounds/') ||
    url.pathname.startsWith('/Saved sounds/');
}

function isStaticAsset(url) {
  return /\.(?:js|css|json|svg|png|jpg|jpeg|webp|gif|ico|woff2?)$/i.test(url.pathname);
}

// Install event - cache core files
self.addEventListener('install', (event) => {
  // Immediately take over on next load so updates don't sit in "waiting"
  // and serve stale code across hard reloads.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.info('SW: Opened cache');
        // Cache files individually so a single 404 does not abort the whole install
        return Promise.all(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.warn(`SW: Failed to cache ${url}:`, err.message))
          )
        );
      })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (shouldBypassCache(event.request, url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle legacy icon paths from older manifests to avoid 404 noise
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('/icon-192.png') || url.pathname.endsWith('/icon-512.png') ||
     url.pathname.endsWith('icon-192.png') || url.pathname.endsWith('icon-512.png'))
  ) {
    // Return a tiny valid transparent PNG to satisfy the request
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8W8z8AAAAASUVORK5CYII=';
    event.respondWith(fetch(tinyPng));
    return;
  }

  // Use network-first for app shell files (HTML, JS, CSS) and navigation requests
  // so deploys do not keep serving stale chunks while online.
  const isAppShell = url.origin === self.location.origin && 
    (event.request.mode === 'navigate' ||
     url.pathname.endsWith('.html') || url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') || url.pathname === '/' || url.pathname.endsWith('/'));
  
  if (isAppShell) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          return fetch(event.request).then((networkResponse) => {
            // Update cache with fresh content
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache only known static assets from our own origin. API, auth, and media
        // proxy requests are bypassed above so fresh state is never replayed.
        if (url.origin === self.location.origin && isStaticAsset(url)) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      }).catch(() => {
        // Network failed and nothing in cache — return a basic offline response
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // Drop any cache that isn't the current version.
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        )
      ),
      // Take control of uncontrolled clients right away so the new SW
      // serves the next fetch (including the page the user is on).
      self.clients.claim(),
    ])
  );
});

// Allow the page to force an activation ("reload now") if desired.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
