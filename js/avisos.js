/* =========================================================
   IEPI LAN-C · Avisos al celular (notificaciones con OneSignal)
   - La persona los activa con un botón (nunca se piden solos).
   - Cada teléfono queda asociado a su código de registro.
   - Si OneSignal no carga (sin internet, navegador sin soporte),
     la app sigue igual y la tarjeta no aparece.
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos, U = window.App, $ = U.$;
  var APP_ID = 'b9ae65d6-0239-4602-80a7-c878f4059134';
  var box = $('avisosBox'), estado = $('avisosEstado'), estadoBr = $('avisosEstadoBr');
  var OS = null;

  function ocultadaTarjeta() { return D.store.get('avisos-ocultar') === '1'; }
  function permisoNativo() { try { return OS.Notifications.permissionNative || 'default'; } catch (e) { return 'default'; } }
  function activos() { try { return !!(OS.Notifications.permission && OS.User.PushSubscription.optedIn); } catch (e) { return false; } }

  function actualizar() {
    var soporta = false;
    try { soporta = !!OS && OS.Notifications.isPushSupported(); } catch (e) { soporta = false; }
    if (!soporta) { box.hidden = true; estado.hidden = estadoBr.hidden = true; return; }
    var on = activos(), bloq = permisoNativo() === 'denied';
    box.hidden = on || bloq || ocultadaTarjeta();
    estado.hidden = estadoBr.hidden = false;
    estado.textContent = on ? 'Avisos activados · Desactivar' : bloq ? 'Avisos bloqueados en este teléfono' : 'Activar avisos en este teléfono';
  }

  function activar() {
    if (!OS) return;
    var btn = $('avisosSi'); btn.disabled = true;
    Promise.resolve(OS.Notifications.requestPermission()).then(function () {
      if (OS.Notifications.permission) {
        return Promise.resolve(OS.User.PushSubscription.optIn()).then(function () {
          vincular(); U.avisar('Avisos activados');
        });
      }
      if (permisoNativo() === 'denied') U.avisar('Los avisos quedaron bloqueados');
    }).catch(function () { U.avisar('No se pudieron activar los avisos'); })
      .then(function () { btn.disabled = false; actualizar(); });
  }

  function vincular() {
    /* Asocia el teléfono a su código de registro (sin nombres) */
    var r = window.Registro && window.Registro.registrado();
    if (OS && r && r.codigo) { try { OS.login(r.codigo); } catch (e) { /* no es esencial */ } }
  }

  $('avisosSi').addEventListener('click', activar);
  $('avisosNo').addEventListener('click', function () { D.store.set('avisos-ocultar', '1'); box.hidden = true; U.avisar('Puedes activarlos al final de Inicio'); });
  estado.addEventListener('click', function () {
    if (!OS) return;
    if (activos()) { D.store.set('avisos-ocultar', '1'); Promise.resolve(OS.User.PushSubscription.optOut()).then(function () { U.avisar('Avisos desactivados'); actualizar(); }); }
    else if (permisoNativo() === 'denied') U.avisar('Permítelos en los ajustes del teléfono: Notificaciones');
    else activar();
  });

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function (OneSignal) {
    return OneSignal.init({
      appId: APP_ID,
      serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/push/onesignal/' },
      notifyButton: { enable: false },
      welcomeNotification: { title: 'IEPI LAN-C', message: '¡Listo! Recibirás los avisos de la iglesia.' }
    }).then(function () {
      OS = OneSignal;
      OneSignal.Notifications.addEventListener('permissionChange', actualizar);
      OneSignal.User.PushSubscription.addEventListener('change', actualizar);
      if (activos()) vincular();
      actualizar();
    }).catch(function () { /* sin OneSignal la app funciona igual */ });
  });

  window.Avisos = { actualizar: actualizar };
})();
