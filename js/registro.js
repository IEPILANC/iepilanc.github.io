/* =========================================================
   IEPI LAN-C · Registro de bienvenida
   Obligatorio una sola vez por teléfono. Los datos se envían al
   Formulario de Google de la iglesia; en este teléfono solo queda
   la marca de que ya se registró (y el nombre, para "Mis datos").
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos, U = window.App, $ = U.$;

  var FORMULARIO = 'https://docs.google.com/forms/d/e/1FAIpQLSfbKV8egkG02jgS7sC31yTcrOHrZ2kzl6-IHd862vSaz25MMA/formResponse';
  var CAMPOS = { nombre: 'entry.167432482', telefono: 'entry.2095177014', dispositivo: 'entry.653953787' };
  var CLAVE = 'registro';

  function registrado() { return D.leerJSON(CLAVE, null); }

  function dispositivo() {
    var ua = navigator.userAgent || '';
    var so = /android/i.test(ua) ? 'Android' : /iphone|ipod/i.test(ua) ? 'iPhone' : /ipad|macintosh/i.test(ua) && 'ontouchend' in document ? 'iPad' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : 'Otro';
    var app = (document.referrer || '').indexOf('android-app://') === 0 ? 'app (APK)'
      : (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'app instalada' : 'navegador';
    return so + ' · ' + app;
  }
  function soloDigitos(t) { return String(t || '').replace(/\D/g, ''); }

  function enviar(nombre, telefono) {
    var datos = new URLSearchParams();
    datos.append(CAMPOS.nombre, nombre);
    datos.append(CAMPOS.telefono, telefono);
    datos.append(CAMPOS.dispositivo, dispositivo());
    /* Google no permite leer la respuesta desde otra página ("no-cors"):
       se sabe que el envío salió, pero la confirmación final es verla en el formulario. */
    return fetch(FORMULARIO, { method: 'POST', mode: 'no-cors', body: datos });
  }

  var capa = $('registro'), form = $('formRegistro'), btn = $('regBtn');
  var nom = $('regNombre'), tel = $('regTel'), acepto = $('regAcepto');
  var errNom = $('regNombreErr'), errTel = $('regTelErr'), errAc = $('regAceptoErr'), errEnv = $('regEnvioErr');
  var modoActualizar = false;

  function mostrar(actualizar) {
    modoActualizar = !!actualizar;
    var r = registrado();
    if (r && actualizar) { nom.value = r.nombre || ''; tel.value = r.telefono || ''; }
    btn.textContent = actualizar ? 'Enviar datos actualizados' : 'Entrar a la app';
    $('regTitulo').textContent = actualizar ? 'Mis datos de registro' : 'Iglesia Evangélica Pentecostés Internacional LAN-C';
    $('regCancelar').hidden = !actualizar;
    capa.hidden = false;
    document.body.classList.add('bloqueo');
    setTimeout(function () { nom.focus(); }, 50);
  }
  function ocultar() { capa.hidden = true; document.body.classList.remove('bloqueo'); }

  [nom, tel].forEach(function (x) { x.addEventListener('input', function () { x.removeAttribute('aria-invalid'); (x === nom ? errNom : errTel).hidden = true; errEnv.hidden = true; }); });
  acepto.addEventListener('change', function () { errAc.hidden = true; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = nom.value.trim().replace(/\s+/g, ' '), t = tel.value.trim(), d = soloDigitos(t), ok = true;
    if (n.length < 3 || !/[a-záéíóúñü]/i.test(n)) { errNom.hidden = false; nom.setAttribute('aria-invalid', 'true'); ok = false; }
    if (t && (d.length < 8 || d.length > 12)) { errTel.hidden = false; tel.setAttribute('aria-invalid', 'true'); ok = false; }
    if (!acepto.checked) { errAc.hidden = false; ok = false; }
    if (!ok) { var primero = form.querySelector('[aria-invalid="true"]') || acepto; primero.focus(); return; }
    if (navigator.onLine === false) { errEnv.textContent = 'No hay conexión a internet. Conéctate y vuelve a intentarlo.'; errEnv.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Enviando…'; errEnv.hidden = true;
    enviar(n, t).then(function () {
      D.guardarJSON(CLAVE, { nombre: n, telefono: t, fecha: new Date().toISOString() });
      ocultar();
      U.avisar(modoActualizar ? 'Datos actualizados' : '¡Bienvenido, ' + n.split(' ')[0] + '!');
    }).catch(function () {
      errEnv.textContent = 'No se pudo enviar el registro. Revisa tu conexión a internet y vuelve a intentarlo.';
      errEnv.hidden = false;
    }).then(function () {
      btn.disabled = false; btn.textContent = modoActualizar ? 'Enviar datos actualizados' : 'Entrar a la app';
    });
  });

  $('regCancelar').addEventListener('click', ocultar);
  $('misDatos').addEventListener('click', function () { mostrar(true); });

  if (!registrado()) mostrar(false);
  window.Registro = { registrado: registrado, mostrar: mostrar };
})();
