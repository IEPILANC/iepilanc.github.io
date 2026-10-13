/* =========================================================
   IEPI LAN-C · Radio en vivo
   - La emisora se configura en radio.json (nombre y enlace de transmisión).
   - Tarjeta en Inicio + mini reproductor fijo sobre la barra de abajo,
     para seguir escuchando mientras se navega por la app.
   - Controles en la pantalla bloqueada (Media Session) donde el teléfono lo permite.
   - Al pausar se corta la transmisión; al volver a tocar Play retoma "en vivo".
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos, U = window.App, $ = U.$;
  var PLAY = '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" fill="currentColor" stroke="none"/>';
  var PAUSA = '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>';
  var CARGA = '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>';

  var cfg = null, audio = null, estado = 'detenida'; /* detenida | cargando | sonando | error */
  var box = $('radioBox'), mini = $('radioMini');

  function pintar() {
    var sonando = estado === 'sonando', cargando = estado === 'cargando';
    var icono = sonando ? PAUSA : cargando ? CARGA : PLAY;
    var etiqueta = sonando || cargando ? 'Pausar la radio' : 'Escuchar la radio';
    [['radioIco', 'radioPlay'], ['radioMiniIco', 'radioMiniPlay']].forEach(function (p) {
      $(p[0]).innerHTML = icono; $(p[0]).classList.toggle('girando', cargando);
      $(p[1]).setAttribute('aria-label', etiqueta); $(p[1]).classList.toggle('activo', sonando);
    });
    $('radioEstado').textContent = sonando ? 'En vivo' : cargando ? 'Conectando…' : estado === 'error' ? 'Sin conexión con la radio' : 'En pausa';
    mini.classList.toggle('sonando', sonando);
    var visible = estado !== 'detenida';
    mini.hidden = !visible;
    document.body.classList.toggle('con-radio', visible);
    if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = sonando ? 'playing' : 'paused'; } catch (e) { /* opcional */ } }
  }

  function reproducir() {
    if (!cfg) return;
    if (!audio) {
      audio = new Audio();
      audio.preload = 'none';
      audio.addEventListener('playing', function () { estado = 'sonando'; pintar(); });
      audio.addEventListener('waiting', function () { if (estado === 'sonando') { estado = 'cargando'; pintar(); } });
      audio.addEventListener('error', function () {
        if (estado === 'detenida' || !audio.getAttribute('src')) return;
        estado = 'error'; pintar(); U.avisar('No se pudo conectar a la radio');
      });
    }
    estado = 'cargando'; pintar();
    audio.src = cfg.stream;
    var p = audio.play();
    if (p && p.catch) p.catch(function (e) {
      if (e && e.name === 'AbortError') return;
      estado = 'error'; pintar(); U.avisar('No se pudo conectar a la radio');
    });
    metadatos();
    U.contarVisita('/radio', 'Radio');
  }
  function pausar() {
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    estado = 'pausada'; pintar();
  }
  function detener() {
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    estado = 'detenida'; pintar();
  }
  function alternar() { if (estado === 'sonando' || estado === 'cargando') pausar(); else reproducir(); }

  function metadatos() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cfg.nombre, artist: 'En vivo · App IEPI LAN-C', album: 'Radio',
        artwork: [{ src: 'icono-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icono-512.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', reproducir);
      navigator.mediaSession.setActionHandler('pause', pausar);
      try { navigator.mediaSession.setActionHandler('stop', detener); } catch (e) { /* no todos lo tienen */ }
    } catch (e) { /* opcional */ }
  }

  $('radioPlay').addEventListener('click', alternar);
  $('radioMiniPlay').addEventListener('click', alternar);
  $('radioCerrar').addEventListener('click', detener);

  D.cargar('radio.json').then(function (d) {
    if (!d || !d.stream || !/^https:\/\//.test(d.stream)) return;
    cfg = d;
    $('radioNombre').textContent = d.nombre + (d.descripcion ? ' · ' + d.descripcion : '');
    $('radioMiniNombre').textContent = d.nombre;
    box.hidden = false;
    pintar();
  }).catch(function () { /* sin radio configurada: no se muestra nada */ });

  window.Radio = { reproducir: reproducir, pausar: pausar, detener: detener, estado: function () { return estado; } };
})();
