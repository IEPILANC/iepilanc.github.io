// Guarda la app para que abra sin internet y busca la versión nueva cuando hay conexión.
const CACHE = 'iepi-lanc-v30';
const ARCHIVOS = ['./', 'index.html', 'css/app.css?v=24', 'js/datos.js?v=24', 'js/app.js?v=24', 'js/agenda-datos.js?v=24', 'js/agenda.js?v=24', 'js/registro.js?v=24', 'js/avisos.js?v=24', 'js/radio.js?v=24', 'js/vivo.js?v=24', 'js/clima.js?v=24', 'js/chat-acceso.js?v=27', 'img/logo.jpg', 'manifest.json', 'icono-192.png', 'icono-512.png'];
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
  const url = new URL(req.url);
  // Archivos con número de versión (?v=…): nunca cambian, se usan desde el teléfono sin esperar internet.
  if (url.searchParams.has('v')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => {
      if (n.ok) { const copia = n.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return n;
    })));
    return;
  }
  // La pantalla del chat se abre desde lo guardado y se actualiza por detrás (la versión nueva se ve la vez siguiente).
  if (req.mode === 'navigate' && /\/chat\/(index\.html)?$/.test(url.pathname)) {
    const nueva = fetch(req).then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return r; });
    e.respondWith(caches.match(req).then(g => g || nueva));
    e.waitUntil(nueva.catch(() => {}));
    return;
  }
  // Lo demás (páginas y datos): se busca la versión nueva, pero si internet tarda más de 3 segundos
  // se muestra lo guardado y se actualiza por detrás.
  const red = fetch(req).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return r;
  });
  e.respondWith(new Promise(resolver => {
    let listo = false;
    const usarGuardado = () => caches.match(req).then(g => {
      if (g && !listo) { listo = true; resolver(g); }
      return g;
    });
    const reloj = setTimeout(usarGuardado, 3000);
    red.then(r => { clearTimeout(reloj); if (!listo) { listo = true; resolver(r); } })
      .catch(() => { clearTimeout(reloj); usarGuardado().then(g => {
        if (!listo) { listo = true; resolver(g || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())); }
      }); });
  }));
});
