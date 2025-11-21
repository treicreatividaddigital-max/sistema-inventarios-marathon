const CACHE_NAME = 'smart-inventory-v2';
const RUNTIME_CACHE = 'smart-inventory-runtime-v2';

// Core assets to cache on install
// Note: Vite bundles (/src/main.tsx in dev, hashed JS/CSS in prod) are cached at runtime
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx', // Vite entry point (development mode)
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

// Asset patterns that should be cached at runtime
// Includes Vite ES modules (.tsx, .ts) for development mode offline support
const CACHEABLE_ASSETS = [
  /\.js$/,
  /\.jsx$/,
  /\.ts$/,
  /\.tsx$/,
  /\.css$/,
  /\.woff2?$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.svg$/,
  /\.webp$/,
];

// Install event - cache static assets and discover/precache app shell bundles
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache core static assets first
        console.log('[Service Worker] Precaching static assets');
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            const request = new Request(url, { cache: 'reload' });
            await cache.add(request);
            console.log('[Service Worker] Cached:', url);
          } catch (error) {
            console.warn('[Service Worker] Failed to cache:', url, error.message);
          }
        });
        
        await Promise.all(cachePromises);
        
        // Discover and precache app shell bundles from index.html
        console.log('[Service Worker] Discovering app shell bundles...');
        const indexResponse = await fetch('/', { cache: 'reload' });
        const indexHtml = await indexResponse.text();
        
        // Extract all script src and link href from HTML
        const scriptMatches = [...indexHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/g)];
        const linkMatches = [...indexHtml.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/g)];
        
        const bundleUrls = [
          ...scriptMatches.map(match => match[1]),
          ...linkMatches.map(match => match[1])
        ].filter(url => url && !url.startsWith('http'));  // Only cache same-origin resources
        
        if (bundleUrls.length > 0) {
          console.log('[Service Worker] Found bundles to precache:', bundleUrls);
          
          const bundlePromises = bundleUrls.map(async (url) => {
            try {
              const fullUrl = url.startsWith('/') ? url : `/${url}`;
              const response = await fetch(fullUrl);
              if (response.ok) {
                await cache.put(fullUrl, response);
                console.log('[Service Worker] Precached bundle:', fullUrl);
              }
            } catch (error) {
              console.warn('[Service Worker] Failed to precache bundle:', url, error.message);
            }
          });
          
          await Promise.all(bundlePromises);
          console.log('[Service Worker] All bundles precached successfully');
        } else {
          console.warn('[Service Worker] No bundles found in HTML');
        }
        
        console.log('[Service Worker] Installation complete - app shell is cached');
      } catch (error) {
        console.error('[Service Worker] Installation failed:', error);
        throw error;
      }
    })()
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first with runtime caching for offline support
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Determine if this is a cacheable asset
  const isCacheableAsset = CACHEABLE_ASSETS.some(pattern => pattern.test(url.pathname));
  
  // Strategy: Network first for API calls, Cache first for assets, Network first with fallback for pages
  if (url.pathname.startsWith('/api/')) {
    // API calls: Network only (don't cache dynamic data)
    event.respondWith(fetch(event.request));
  } else if (isCacheableAsset) {
    // Assets (JS, CSS, fonts, images): Cache first with network fallback
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
  } else {
    // Pages and other resources: Network first with cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful page responses
          if (response.status === 200 && event.request.mode === 'navigate') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If not in cache and offline, return offline page for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            });
          });
        })
    );
  }
});

// Message event - for manual cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});