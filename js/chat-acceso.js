/* Acceso al chat en Inicio.
   - chat.json { "visible": true } lo muestra a todos.
   - Mientras está en prueba, se activa en un teléfono abriendo la app con ?chat=prueba
     (y se desactiva con ?chat=no). */
(function () {
  'use strict';
  var el = document.getElementById('chatAcceso'); if (!el) return;
  var CLAVE = 'chat-prueba', prueba = false;
  try {
    var q = new URLSearchParams(location.search).get('chat');
    if (q && /^prueba/i.test(q)) localStorage.setItem(CLAVE, '1');
    if (q && /^no\b/i.test(q)) localStorage.removeItem(CLAVE);
    prueba = localStorage.getItem(CLAVE) === '1';
  } catch (e) { /* sin almacenamiento */ }
  function mostrar() { el.hidden = false; }
  if (prueba) mostrar();
  fetch('chat.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (c) { if (c && c.visible) mostrar(); }).catch(function () {});
})();
