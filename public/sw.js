const CACHE_NAME = 'show-tracker-v2';
const urlsToCache = [
  '/',
  '/assets/android-chrome-192x192.png',
  '/assets/android-chrome-512x512.png',
  '/assets/apple-touch-icon.png',
  '/assets/favicon-16x16.png',
  '/assets/favicon-32x32.png',
  '/assets/favicon.ico'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  // Force the new service worker to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache API requests to avoid stale data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // If offline and API request fails, return a helpful message
        return new Response(
          JSON.stringify({ 
            error: 'You are offline. Please check your connection and try again.',
            offline: true
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Don't cache Vercel Speed Insights scripts - let them load fresh
  if (url.pathname.startsWith('/_vercel/speed-insights/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Check if app is running as PWA (standalone mode)
  const isPWA = request.headers.get('user-agent')?.includes('standalone') || 
                request.referrer === '' || 
                request.mode === 'navigate' && request.headers.get('sec-fetch-dest') === 'document';

  // Only cache aggressively if running as PWA
  if (isPWA) {
    // Cache static assets for PWA
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // Return cached version or fetch from network
          return response || fetch(request);
        })
    );
  } else {
    // For web browser, always fetch fresh (network first)
    event.respondWith(
      fetch(request).catch(() => {
        // Only fall back to cache if network fails
        return caches.match(request);
      })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});
