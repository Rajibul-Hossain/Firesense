const CACHE_NAME = 'apsk-fire-command-v1';

// Mapped exactly to your VS Code folder structure
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/Main/index.html',
  '/Main/styles.css',
  '/Main/script.js',
  '/Main/others.css',
  '/Main/others.js',
  '/Main/maps/assets/Alarm Sound Effect.mp3',
  '/Main/maps/assets/zone_1a.png',
  '/Main/maps/assets/zone_4b.png',
  '/Main/maps/assets/zone_5c.png'
];

// 1. Install & Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. Fetch from Network, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Try the network first for live Firebase data, fallback to cache if offline
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});