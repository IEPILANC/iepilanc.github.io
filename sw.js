// Guarda la app para que abra sin internet y busca la versión nueva cuando hay conexión.
const CACHE = 'iepi-lanc-v20';
const ARCHIVOS = ['./', 'index.html', 'css/app.css?v=19', 'js/datos.js?v=19', 'js/app.js?v=19', 'js/agenda-datos.js?v=19', 'js/agenda.js?v=19', 'js/registro.js?v=19', 'js/avisos.js?v=19', 'js/radio.js?v=19', 'js/vivo.js?v=19', 'img/logo.jpg', 'manifest.json', 'icono-192.png', 'icono-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  // Solo se atienden archivos de la propia app; los servicios externos (contador, formulario, fuentes) van directo.
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // La descarga de la app (APK) no se guarda en el teléfono: va directo.
  if (new URL(req.url).pathname.indexOf('/descargas/') !== -1) return;
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return r;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
