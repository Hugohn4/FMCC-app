/* Service worker de la web-app del Gloria Palace Amadores (v2).
   Estrategias:
   - Esqueleto (HTML, CSS, JS, manifiesto): RED PRIMERO. Si hay conexión se descarga siempre la
     versión más reciente (así los cambios llegan al móvil sin borrar nada); si no hay, se usa la copia.
   - Navegación: red primero; sin conexión, copia guardada u offline.html.
   - Imágenes: caché primero (se guardan según se visitan).
   - Audio (jazz.mp3) y peticiones con Range: siempre a la red. */
const VERSION = 'gpa-v2';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'offline.html',
  'iconos/icon-192.png', 'iconos/icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' obliga a saltarse la caché HTTP y guardar siempre la versión nueva
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function redPrimero(req) {
  return fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
    return r;
  }).catch(() => caches.match(req));
}

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

  if (url.origin === location.origin) { e.respondWith(redPrimero(req)); return; }
});
