/* Service worker de la web-app del Gloria Palace Amadores.
   Estrategias:
   - Esqueleto de la app (HTML, CSS, JS, manifiesto, iconos): se guarda al instalar.
   - Navegación: red primero; si no hay conexión, se sirve la copia guardada u offline.html.
   - Imágenes: caché primero (se guardan según se visitan; no se precargan los 27 MB).
   - Audio (jazz.mp3) y peticiones con Range: siempre a la red (no se cachean). */
const VERSION = 'gpa-v1';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'offline.html',
  'iconos/icon-192.png', 'iconos/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('.mp3')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copia)); return r;
    }).catch(() => caches.match('index.html').then(r => r || caches.match('offline.html'))));
    return;
  }

  if (url.origin === location.origin && /\.(jpe?g|png|webp|svg)$/i.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return r;
    })));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && url.origin === location.origin) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
    return r;
  }).catch(() => hit)));
});
