const CACHE_NAME = 'coam-saas-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Important: Clone the request. A request is a stream and
        // can only be consumed once.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Important: Clone the response. A response is a stream
          // and can be consumed once.
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Return cached version for offline access
          return caches.match('/');
        });
      })
  );
});

// Background sync for offline job updates
self.addEventListener('sync', event => {
  if (event.tag === 'job-sync') {
    event.waitUntil(syncJobs());
  }
});

async function syncJobs() {
  try {
    const cache = await caches.open('offline-jobs');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const data = await response.json();
        
        // Sync with server
        await fetch('/api/jobs/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        // Remove from cache after successful sync
        await cache.delete(request);
      } catch (error) {
        console.log('Failed to sync job:', error);
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/manifest-icon-192.png',
    badge: '/manifest-icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore', title: 'View Job',
        icon: '/manifest-icon-192.png'
      },
      {
        action: 'close', title: 'Close notification',
        icon: '/manifest-icon-192.png'
      }
    ]
  };
  event.waitUntil(
    self.registration.showNotification('COAM SaaS', options)
  );
});