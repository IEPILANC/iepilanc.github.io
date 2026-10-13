/* =========================================================
   IEPI LAN-C · Culto en vivo por Facebook
   - Las transmisiones son en un grupo privado: Facebook no permite
     mostrarlas dentro de otra página, así que el botón abre el grupo
     en la app de Facebook (o en el navegador).
   - Durante el horario de cada culto (desde 15 min antes hasta 2 horas
     después del inicio) la tarjeta sube al comienzo de Inicio con
     "Ahora: culto en vivo". La app no puede saber si de verdad se está
     transmitiendo: se guía solo por el horario de la agenda.
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos, U = window.App, $ = U.$, esc = U.esc;
  var cfg = null, agenda = null, tarjeta = null;
  var CAMARA = '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>';

  function cultoAhora(ahora) {
    if (!agenda || !window.AgendaDatos) return null;
    var A = window.AgendaDatos, hoy = D.iso(ahora), antes = (cfg.minutos_antes || 15) * 60000, dura = (cfg.duracion_min || 120) * 60000;
    return A.expandir(agenda, hoy, hoy).filter(function (o) {
      if (o.tipo !== 'culto' || o.estado === 'cancelada' || !o.hora) return false;
      var hm = o.hora.split(':'), ini = D.fecha(o.fecha); ini.setHours(+hm[0], +hm[1], 0, 0);
      return ahora >= ini.getTime() - antes && ahora < ini.getTime() + dura;
    })[0] || null;
  }

  function dibujar() {
    if (!cfg) return;
    var ahora = new Date(), c = cultoAhora(ahora);
    if (!tarjeta) {
      tarjeta = document.createElement('a');
      tarjeta.id = 'vivoCard';
      tarjeta.href = cfg.url; tarjeta.target = '_blank'; tarjeta.rel = 'noopener';
      tarjeta.addEventListener('click', function () { U.contarVisita('/vivo', 'Culto en vivo'); });
    }
    tarjeta.className = 'tarjeta vivo-tarjeta' + (c ? ' en-vivo' : '');
    tarjeta.setAttribute('aria-label', (c ? 'Ahora: culto en vivo. ' : '') + 'Ver transmisión en ' + cfg.plataforma + ': ' + cfg.nombre);
    tarjeta.innerHTML = '<span class="acceso-ic vivo-ic"><svg class="ic ic-lg" viewBox="0 0 24 24" aria-hidden="true">' + CAMARA + '</svg></span>' +
      '<span class="acceso-txt">' + (c ? '<span class="vivo-chip"><span class="radio-vivo"></span>Ahora: ' + esc((c.titulo || 'Culto').toLowerCase()) + ' en vivo</span>' : '') +
      '<b>Culto en vivo por ' + esc(cfg.plataforma) + '</b><span class="muted">' + esc(cfg.nombre) + ' · grupo privado</span></span>' +
      '<span class="btn ' + (c ? 'btn-oro' : 'btn-sec') + ' vivo-btn">Ver</span>';
    var destino = $(c ? 'vivoArriba' : 'vivoAbajo');
    if (tarjeta.parentNode !== destino) destino.appendChild(tarjeta);
  }

  Promise.all([D.cargar('transmision.json'), D.cargar('agenda.json').catch(function () { return null; })]).then(function (r) {
    if (!r[0] || !/^https:\/\//.test(r[0].url || '')) return;
    cfg = r[0]; agenda = r[1];
    dibujar();
    setInterval(dibujar, 60000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') dibujar(); });
  }).catch(function () { /* sin transmisión configurada: no se muestra nada */ });

  window.Vivo = { dibujar: dibujar };
})();
