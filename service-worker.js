const CACHE_NAME = 'adc-studio-pwa-v3-7';
const APP_SHELL = [
  './app.js', './index.html', './README.txt', './manifest.webmanifest', './styles.css',
  './assets/inter4_mark.png', './assets/inter4_mark_copper.png', './assets/demo_4.jpg',
  './assets/inter4_logo_original.jpeg', './assets/demo_1.jpg', './assets/demo_2.jpg',
  './assets/adc_mark_transparent.png', './assets/demo_3.jpg', './assets/demo_6.jpg',
  './assets/inter4_mark_transparent.png', './assets/adc_logo_original.jpeg',
  './assets/demo_overview.png', './assets/demo_5.jpg', './assets/adc_mark_copper.png',
  './assets/adc_mark_recolored.png', './icons/apple-touch-icon.png',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCoreRequest(request) {
  const url = new URL(request.url);
  return request.mode === 'navigate' ||
    /\/(?:index\.html|app\.js|styles\.css|manifest\.webmanifest)$/.test(url.pathname);
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (isCoreRequest(event.request)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch (err) {
        return (await caches.match(event.request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const fresh = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, fresh.clone());
      return fresh;
    } catch (err) {
      return caches.match('./index.html');
    }
  })());
});
