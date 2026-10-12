/* =========================================================
   IEPI LAN-C · Registro de bienvenida y control de acceso
   - Registro obligatorio una sola vez por teléfono. Los datos se
     envían al Formulario de Google de la iglesia.
   - Cada teléfono tiene un código único (ej. K7Q2-9F) que viaja con
     el registro. Si su código está en bloqueados.json, la app muestra
     "Acceso suspendido". La lista guarda solo códigos, nunca nombres.
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos, U = window.App, $ = U.$;

  var FORMULARIO = 'https://docs.google.com/forms/d/e/1FAIpQLSfbKV8egkG02jgS7sC31yTcrOHrZ2kzl6-IHd862vSaz25MMA/formResponse';
  var CAMPOS = { nombre: 'entry.167432482', telefono: 'entry.2095177014', dispositivo: 'entry.653953787' };
  var CLAVE = 'registro', CLAVE_BLOQ = 'acceso-suspendido';
  var LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; /* sin 0/O, 1/I/L para leerlo sin confusión */

  function registrado() { return D.leerJSON(CLAVE, null); }
  function guardar(r) { D.guardarJSON(CLAVE, r); }

  function nuevoCodigo() {
    var n = new Uint8Array(6), s = '';
    (window.crypto || window.msCrypto).getRandomValues(n);
    for (var i = 0; i < 6; i++) s += LETRAS[n[i] % LETRAS.length];
    return s.slice(0, 4) + '-' + s.slice(4);
  }
  function dispositivo() {
    var ua = navigator.userAgent || '';
    var so = /android/i.test(ua) ? 'Android' : /iphone|ipod/i.test(ua) ? 'iPhone' : /ipad|macintosh/i.test(ua) && 'ontouchend' in document ? 'iPad' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : 'Otro';
    var app = (document.referrer || '').indexOf('android-app://') === 0 ? 'app (APK)'
      : (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'app instalada' : 'navegador';
    return so + ' · ' + app;
  }
  function soloDigitos(t) { return String(t || '').replace(/\D/g, ''); }

  function enviar(nombre, telefono, codigo, nota) {
    var datos = new URLSearchParams();
    datos.append(CAMPOS.nombre, nombre);
    datos.append(CAMPOS.telefono, telefono);
    datos.append(CAMPOS.dispositivo, dispositivo() + ' · Código ' + codigo + (nota ? ' · ' + nota : ''));
    /* Google no permite leer la respuesta desde otra página ("no-cors"):
       se sabe que el envío salió, pero la confirmación final es verla en el formulario. */
    return fetch(FORMULARIO, { method: 'POST', mode: 'no-cors', body: datos });
  }

  /* ---------- Formulario de registro ---------- */
  var capa = $('registro'), form = $('formRegistro'), btn = $('regBtn');
  var nom = $('regNombre'), tel = $('regTel'), acepto = $('regAcepto');
  var errNom = $('regNombreErr'), errTel = $('regTelErr'), errAc = $('regAceptoErr'), errEnv = $('regEnvioErr');
  var modo = 'nuevo'; /* nuevo | actualizar | corregir */

  function textoBoton() { return modo === 'nuevo' ? 'Entrar a la app' : 'Enviar datos actualizados'; }
  function mostrar(m) {
    modo = m || 'nuevo';
    var r = registrado();
    if (r && modo !== 'nuevo') { nom.value = r.nombre || ''; tel.value = r.telefono || ''; }
    btn.textContent = textoBoton();
    $('regTitulo').textContent = modo === 'nuevo' ? 'Iglesia Evangélica Pentecostés Internacional LAN-C' : 'Mis datos de registro';
    $('regCancelar').hidden = modo === 'nuevo';
    $('regCodigo').hidden = !(r && r.codigo && modo !== 'nuevo');
    if (r && r.codigo) $('regCodigo').innerHTML = 'Código de registro de este teléfono: <b>' + U.esc(r.codigo) + '</b>';
    capa.hidden = false;
    document.body.classList.add('bloqueo');
    setTimeout(function () { nom.focus(); }, 50);
  }
  function ocultar() {
    capa.hidden = true;
    if (modo === 'corregir') { mostrarSuspendido(); return; }
    if ($('suspendido').hidden) document.body.classList.remove('bloqueo');
  }

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
    var previo = registrado() || {};
    var codigo = previo.codigo || nuevoCodigo(); /* el código se conserva al corregir: así no se evita un bloqueo */
    var nota = modo === 'corregir' ? 'datos corregidos tras suspensión' : modo === 'actualizar' ? 'datos actualizados' : '';
    btn.disabled = true; btn.textContent = 'Enviando…'; errEnv.hidden = true;
    enviar(n, t, codigo, nota).then(function () {
      guardar({ nombre: n, telefono: t, codigo: codigo, fecha: new Date().toISOString() });
      var m = modo;
      ocultar();
      if (m === 'corregir') $('susEnviado').hidden = false;
      else U.avisar(m === 'actualizar' ? 'Datos actualizados' : '¡Bienvenido, ' + n.split(' ')[0] + '!');
    }).catch(function () {
      errEnv.textContent = 'No se pudo enviar el registro. Revisa tu conexión a internet y vuelve a intentarlo.';
      errEnv.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = textoBoton(); });
  });

  $('regCancelar').addEventListener('click', ocultar);
  $('misDatos').addEventListener('click', function () { mostrar('actualizar'); });

  /* ---------- Acceso suspendido ---------- */
  function mostrarSuspendido() {
    var r = registrado();
    $('susCodigo').textContent = r && r.codigo ? 'Código de registro: ' + r.codigo : '';
    capa.hidden = true;
    $('suspendido').hidden = false;
    document.body.classList.add('bloqueo');
    $('susCorregir').focus();
  }
  function quitarSuspension() {
    $('suspendido').hidden = true; $('susEnviado').hidden = true;
    if (capa.hidden) document.body.classList.remove('bloqueo');
  }
  $('susCorregir').addEventListener('click', function () { $('suspendido').hidden = true; mostrar('corregir'); });

  function revisarAcceso() {
    var r = registrado(); if (!r || !r.codigo) return;
    /* Sin conexión se respeta el último estado conocido. */
    if (D.store.get(CLAVE_BLOQ) === r.codigo) mostrarSuspendido();
    D.cargar('bloqueados.json').then(function (d) {
      var lista = (d.codigos || []).map(function (c) { return String(c).toUpperCase().trim(); });
      if (lista.indexOf(r.codigo) !== -1) { D.store.set(CLAVE_BLOQ, r.codigo); mostrarSuspendido(); }
      else { D.store.set(CLAVE_BLOQ, ''); if (!$('suspendido').hidden) quitarSuspension(); }
    }).catch(function () { /* sin conexión: se mantiene lo último conocido */ });
  }

  /* ---------- Inicio ---------- */
  var r = registrado();
  if (!r) mostrar('nuevo');
  else if (!r.codigo) {
    /* Registrados antes de que existiera el código: se les asigna uno y se envía en silencio. */
    var codigo = nuevoCodigo();
    enviar(r.nombre || '', r.telefono || '', codigo, 'código asignado a registro anterior').then(function () {
      r.codigo = codigo; guardar(r); revisarAcceso();
    }).catch(function () { /* se reintenta la próxima vez que se abra la app */ });
  } else revisarAcceso();

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') revisarAcceso(); });
  window.Registro = { registrado: registrado, mostrar: mostrar, revisarAcceso: revisarAcceso };
})();
