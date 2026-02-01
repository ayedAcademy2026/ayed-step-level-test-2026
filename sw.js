
const CACHE_NAME = 'step-level-2026-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './quiz.html',
  './results.html',
  './support.html',
  './bridge.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/quiz.js',
  './assets/js/results.js',
  './assets/js/support.js',
  './assets/js/bridge.js',
  './assets/data/question-bank.json',
  './assets/img/logo.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, {ignoreSearch:true});
    if (cached) return cached;

    try{
      const fresh = await fetch(req);
      // cache same-origin assets only
      const url = new URL(req.url);
      if (url.origin === self.location.origin) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    }catch(e){
      // offline fallback to cached index if navigation
      if (req.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
