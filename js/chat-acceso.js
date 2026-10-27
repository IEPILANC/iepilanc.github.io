/* Acceso al chat en Inicio.
   - chat.json { "visible": true } lo muestra a todos.
   - "probadores": nombres de registro que lo ven mientras está en prueba.
   - También se activa en un teléfono abriendo la app con ?chat=prueba
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
    .then(function (c) {
      if (!c) return;
      if (c.visible) { mostrar(); return; }
      /* Probadores: se muestra a quienes están registrados con esos nombres */
      var nom = '';
      try { var r = JSON.parse(localStorage.getItem('registro') || 'null'); nom = r && r.nombre ? r.nombre : ''; } catch (e) { /* nada */ }
      var limpio = function (t) { return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); };
      nom = limpio(nom);
      if (nom && (c.probadores || []).some(function (p) { return nom.indexOf(limpio(p)) !== -1; })) mostrar();
    }).catch(function () {});
})();
