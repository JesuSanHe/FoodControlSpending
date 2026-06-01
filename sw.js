const CACHE_NAME = 'kitchensync-v4';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
  'https://cdn.tailwindcss.com?plugins=forms'
];

// Instalar Service Worker y cachear assets estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y servir desde caché
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Evitar interceptar peticiones de la API de Google Sheets / Apps Script o peticiones que no sean GET
  if (url.pathname.includes('/macros/') || url.origin.includes('script.google') || e.request.method !== 'GET') {
    e.respondWith(
      fetch(e.request).catch(() => {
        // En caso de fallo de red en la API, retornamos error controlado
        return new Response(JSON.stringify({ error: 'Conexión perdida' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Para assets estáticos (incluyendo CDN de Tailwind y fuentes externas): Cache First, fallback a red
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
