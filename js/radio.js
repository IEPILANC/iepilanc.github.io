/* =========================================================
   IEPI LAN-C · Radio
   - Las emisoras se configuran en radio.json:
       · tipo "stream": una radio por internet (ej. BBN Radio).
       · tipo "lista": la radio propia de la iglesia, armada con grabaciones
         guardadas en la app (radio/lista.json). Suena "como radio": según la
         hora, todos escuchan el mismo canto en el mismo momento, las 24 horas,
         sin servidor ni computador encendido.
   - Tarjeta en Inicio (con selector si hay más de una emisora) y mini
     reproductor fijo sobre la barra de abajo.
   - Al pausar se corta; al volver a tocar Play retoma "en vivo".
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos, U = window.App, $ = U.$, esc = U.esc;
  var PLAY = '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" fill="currentColor" stroke="none"/>';
  var PAUSA = '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>';
  var CARGA = '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>';
  var CLAVE = 'radio-emisora';

  var emisoras = [], actual = null, audio = null, estado = 'detenida'; /* detenida | cargando | sonando | pausada | error */
  var pistaActual = null;
  var box = $('radioBox'), mini = $('radioMini');

  /* ---------- Radio propia: posición según la hora ---------- */
  function posicion(lista, ahora) {
    var pistas = lista.pistas, total = 0;
    pistas.forEach(function (p) { total += p.duracion; });
    var inicio = Date.parse(lista.inicio || '2026-01-01T00:00:00Z');
    var t = (((ahora - inicio) / 1000) % total + total) % total;
    for (var i = 0; i < pistas.length; i++) {
      if (t < pistas[i].duracion) return { i: i, seg: t };
      t -= pistas[i].duracion;
    }
    return { i: 0, seg: 0 };
  }

  function textoEstado() {
    if (estado === 'cargando') return 'Conectando…';
    if (estado === 'error') return 'Sin conexión con la radio';
    if (estado !== 'sonando') return 'En pausa';
    return actual && actual.tipo === 'lista' && pistaActual ? 'En vivo · ' + pistaActual.titulo : 'En vivo';
  }

  function pintar() {
    var sonando = estado === 'sonando', cargando = estado === 'cargando';
    var icono = sonando ? PAUSA : cargando ? CARGA : PLAY;
    var etiqueta = (sonando || cargando ? 'Pausar ' : 'Escuchar ') + (actual ? actual.nombre : 'la radio');
    [['radioIco', 'radioPlay'], ['radioMiniIco', 'radioMiniPlay']].forEach(function (p) {
      $(p[0]).innerHTML = icono; $(p[0]).classList.toggle('girando', cargando);
      $(p[1]).setAttribute('aria-label', etiqueta); $(p[1]).classList.toggle('activo', sonando);
    });
    if (actual) {
      $('radioNombre').textContent = actual.nombre + (actual.descripcion ? ' · ' + actual.descripcion : '');
      $('radioMiniNombre').textContent = actual.nombre;
    }
    $('radioEstado').textContent = textoEstado();
    mini.classList.toggle('sonando', sonando);
    var visible = estado !== 'detenida';
    mini.hidden = !visible;
    document.body.classList.toggle('con-radio', visible);
    var cont = $('radioEmisoras');
    if (cont) cont.querySelectorAll('[data-emisora]').forEach(function (b) { b.setAttribute('aria-pressed', actual && b.dataset.emisora === actual.id); });
    if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = sonando ? 'playing' : 'paused'; } catch (e) { /* opcional */ } }
  }

  function crearAudio() {
    if (audio) return;
    audio = new Audio();
    audio.preload = 'none';
    audio.addEventListener('playing', function () { estado = 'sonando'; pintar(); metadatos(); });
    audio.addEventListener('waiting', function () { if (estado === 'sonando') { estado = 'cargando'; pintar(); } });
    audio.addEventListener('ended', function () { if (actual && actual.tipo === 'lista' && estado !== 'detenida') sonarLista(); });
    audio.addEventListener('error', function () {
      if (estado === 'detenida' || estado === 'pausada' || !audio.getAttribute('src')) return;
      estado = 'error'; pintar(); U.avisar('No se pudo conectar a la radio');
    });
  }

  function iniciarAudio(src, desde) {
    audio.src = src;
    if (desde > 1) {
      var saltar = function () { audio.removeEventListener('loadedmetadata', saltar); try { audio.currentTime = desde; } catch (e) { /* algunos navegadores */ } };
      audio.addEventListener('loadedmetadata', saltar);
    }
    var p = audio.play();
    if (p && p.catch) p.catch(function (e) {
      if (e && e.name === 'AbortError') return;
      estado = 'error'; pintar(); U.avisar('No se pudo conectar a la radio');
    });
  }

  function sonarLista() {
    var pos = posicion(actual.datos, Date.now());
    pistaActual = actual.datos.pistas[pos.i];
    estado = 'cargando'; pintar();
    iniciarAudio(pistaActual.archivo, pos.seg);
  }

  function reproducir() {
    if (!actual) return;
    crearAudio();
    if (actual.tipo === 'lista') sonarLista();
    else { pistaActual = null; estado = 'cargando'; pintar(); iniciarAudio(actual.stream, 0); }
    U.contarVisita('/radio/' + actual.id, actual.nombre);
  }
  function cortar() { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } }
  function pausar() { cortar(); estado = 'pausada'; pintar(); }
  function detener() { cortar(); estado = 'detenida'; pintar(); }
  function alternar() { if (estado === 'sonando' || estado === 'cargando') pausar(); else reproducir(); }

  function elegir(id, sonar) {
    var e = emisoras.filter(function (x) { return x.id === id; })[0]; if (!e) return;
    var seguia = estado === 'sonando' || estado === 'cargando';
    cortar(); actual = e; D.store.set(CLAVE, e.id);
    if (sonar || seguia) reproducir(); else { estado = estado === 'detenida' ? 'detenida' : 'pausada'; pintar(); }
  }

  function metadatos() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata || !actual) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: pistaActual ? pistaActual.titulo : actual.nombre,
        artist: pistaActual ? actual.nombre : 'En vivo · App IEPI LAN-C', album: 'Radio',
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

  function dibujarSelector() {
    var viejo = $('radioEmisoras'); if (viejo) viejo.remove();
    if (emisoras.length < 2) return;
    var cont = document.createElement('div');
    cont.className = 'radio-emisoras'; cont.id = 'radioEmisoras'; cont.setAttribute('role', 'group'); cont.setAttribute('aria-label', 'Elegir emisora');
    cont.innerHTML = emisoras.map(function (e) { return '<button type="button" class="filtro" data-emisora="' + esc(e.id) + '" aria-pressed="false">' + esc(e.corto || e.nombre) + '</button>'; }).join('');
    box.parentNode.insertBefore(cont, box.nextSibling);
    cont.querySelectorAll('[data-emisora]').forEach(function (b) { b.onclick = function () { elegir(b.dataset.emisora, true); }; });
  }

  D.cargar('radio.json').then(function (d) {
    var lista = d && d.emisoras ? d.emisoras : d && d.stream ? [{ id: 'radio', nombre: d.nombre, descripcion: d.descripcion, tipo: 'stream', stream: d.stream }] : [];
    return Promise.all(lista.map(function (e) {
      if (e.tipo === 'lista') {
        return D.cargar(e.lista).then(function (l) {
          var pistas = (l.pistas || []).filter(function (p) { return p.archivo && p.duracion > 0; });
          if (!pistas.length) return null;
          l.pistas = pistas; e.datos = l; return e;
        }).catch(function () { return null; });
      }
      return Promise.resolve(e.stream && /^https:\/\//.test(e.stream) ? e : null);
    }));
  }).then(function (lista) {
    emisoras = (lista || []).filter(Boolean);
    if (!emisoras.length) return;
    var guardada = D.store.get(CLAVE);
    actual = emisoras.filter(function (e) { return e.id === guardada; })[0] || emisoras[0];
    box.hidden = false;
    dibujarSelector();
    pintar();
  }).catch(function () { /* sin radio configurada: no se muestra nada */ });

  window.Radio = { reproducir: reproducir, pausar: pausar, detener: detener, elegir: elegir, posicion: posicion, estado: function () { return estado; }, emisora: function () { return actual && actual.id; }, pista: function () { return pistaActual; } };
})();
