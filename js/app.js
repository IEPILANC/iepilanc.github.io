/* =========================================================
   IEPI LAN-C · Interfaz
   Dibuja cada sección a partir de los archivos de datos.
   La lógica (fechas, almacenamiento, reglas) vive en datos.js.
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos;

  /* ---------- Utilidades de interfaz ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  var ICONOS = {
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    descarga: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    libro: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    estrella: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    derecha: '<path d="m9 18 6-6-6-6"/>',
    nube: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m2 2 20 20"/>',
    musica: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    imagen: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    buscar: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    corazon: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    iglesia: '<path d="M12 2v4M10 4h4"/><path d="m6 10 6-4 6 4"/><path d="M6 10v11h12V10"/><path d="M10 21v-5h4v5"/>',
    familia: '<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M15 21v-1a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    luna: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor"/>',
    reunion: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    dorcas: '<path d="M12 22c4-3 8-6.5 8-11a8 8 0 0 0-16 0c0 4.5 4 8 8 11Z"/><path d="M12 7v8M8 11h8"/>',
    convencion: '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/><path d="M12 5V2"/>',
    jovenes: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    escuela: '<path d="m22 10-10-5-10 5 10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    marcador: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    compartir: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    izquierda: '<path d="m15 18-6-6 6-6"/>',
    alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    diapos: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>'
  };
  function ic(nombre, clase) { return '<svg class="ic ' + (clase || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[nombre] || '') + '</svg>'; }
  var CHIP_NUEVO = '<span class="chip chip-nuevo">Nuevo</span>';
  function enlaceMapa(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }

  function estadoError(contenedor, mensaje, reintentar) {
    contenedor.innerHTML = '<div class="aviso-error" role="alert">' + ic('nube') + '<p>' + esc(mensaje) + '</p>' +
      '<button class="btn btn-sec" type="button">Reintentar</button></div>';
    contenedor.querySelector('button').onclick = reintentar;
  }
  function estadoVacio(contenedor, icono, mensaje) {
    contenedor.innerHTML = '<div class="vacio">' + ic(icono) + '<p>' + esc(mensaje) + '</p></div>';
  }
  function marcarPestana(tab, hay) {
    var b = document.querySelector('[data-tab="' + tab + '"]');
    if (b) b.classList.toggle('con-nuevo', !!hay);
  }

  /* ---------- Aviso breve ---------- */
  var avisoEl = $('aviso'), avisoT = null;
  function avisar(msg) {
    avisoEl.innerHTML = ic('check') + '<span>' + esc(msg) + '</span>';
    avisoEl.classList.add('ver');
    clearTimeout(avisoT);
    avisoT = setTimeout(function () { avisoEl.classList.remove('ver'); }, 2200);
  }

  /* ---------- Apariencia: automática, clara u oscura ---------- */
  var temaBtn = $('temaBtn'), temaMenu = $('temaMenu'), metaColor = document.querySelector('meta[name="theme-color"]');
  var NOMBRE_TEMA = { auto: 'automática', light: 'clara', dark: 'oscura' };
  function aplicarTema(t) {
    var root = document.documentElement;
    if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
    var oscuro = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (metaColor) metaColor.content = oscuro ? '#0B1220' : '#17294B';
    $('temaIco').innerHTML = ICONOS[t === 'dark' ? 'luna' : t === 'light' ? 'sol' : 'auto'];
    temaBtn.setAttribute('aria-label', 'Apariencia: ' + NOMBRE_TEMA[t]);
    temaMenu.querySelectorAll('[data-tema]').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.tema === t); });
  }
  function temaActual() { var t = D.store.get('tema'); return t === 'light' || t === 'dark' ? t : 'auto'; }
  function cerrarMenuTema() { temaMenu.hidden = true; temaBtn.setAttribute('aria-expanded', 'false'); }
  temaBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var abrir = temaMenu.hidden;
    temaMenu.hidden = !abrir; temaBtn.setAttribute('aria-expanded', abrir);
    if (abrir) temaMenu.querySelector('[aria-checked="true"]').focus();
  });
  temaMenu.querySelectorAll('[data-tema]').forEach(function (b) {
    b.addEventListener('click', function () {
      D.store.set('tema', b.dataset.tema); aplicarTema(b.dataset.tema); cerrarMenuTema(); temaBtn.focus();
      avisar('Apariencia ' + NOMBRE_TEMA[b.dataset.tema]);
    });
  });
  document.addEventListener('click', function (e) { if (!temaMenu.hidden && !temaMenu.contains(e.target)) cerrarMenuTema(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !temaMenu.hidden) { cerrarMenuTema(); temaBtn.focus(); } });
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () { aplicarTema(temaActual()); }); }
  aplicarTema(temaActual());

  /* ---------- Encabezado compacto al desplazarse ---------- */
  var barra = document.querySelector('.barra'), compacta = false;
  window.addEventListener('scroll', function () {
    var c = window.scrollY > 24;
    if (c !== compacta) { compacta = c; barra.classList.toggle('compacta', c); }
  }, { passive: true });

  /* ---------- Fundido suave al cargar imágenes ---------- */
  var reduceMov = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('load', function (e) {
    var t = e.target; if (t.tagName === 'IMG' && t.classList.contains('carga')) t.classList.add('cargada');
  }, true);
  function img(src, alt, extra) {
    return '<img class="' + (reduceMov ? '' : 'carga') + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" decoding="async" ' + (extra || 'loading="lazy"') + '>';
  }

  /* ---------- Capas (hoja de detalle y visor) con botón "atrás" ---------- */
  var pila = [];
  function abrirCapa(el) {
    el.hidden = false;
    pila.push({ el: el, foco: document.activeElement });
    document.body.classList.add('bloqueo');
    try { history.pushState({ capa: pila.length }, ''); } catch (e) { /* sin historial */ }
    var f = el.querySelector('[data-cerrar]'); if (f) f.focus({ preventScroll: true });
  }
  function cerrarCapaSuperior() {
    var c = pila.pop(); if (!c) return;
    if (c.el.classList.contains('hoja') && !reduceMov) {
      var el = c.el; el.classList.add('sale');
      setTimeout(function () { el.classList.remove('sale'); if (pila.every(function (x) { return x.el !== el; })) el.hidden = true; }, 160);
    } else c.el.hidden = true;
    if (!pila.length) document.body.classList.remove('bloqueo');
    if (c.foco && c.foco.focus) c.foco.focus({ preventScroll: true });
  }
  function pedirCierre() { if (pila.length) history.back(); }
  window.addEventListener('popstate', function () { cerrarCapaSuperior(); });
  document.querySelectorAll('[data-cerrar]').forEach(function (b) { b.addEventListener('click', pedirCierre); });
  document.addEventListener('keydown', function (e) {
    if (!pila.length) return;
    if (e.key === 'Escape') { e.preventDefault(); pedirCierre(); }
    if (pila[pila.length - 1].el === visor) {
      if (e.key === 'ArrowLeft') mover(-1);
      if (e.key === 'ArrowRight') mover(1);
    }
  });

  var hoja = $('hoja');
  function abrirHoja(titulo, html, acciones) {
    $('hojaTitulo').textContent = titulo;
    $('hojaCuerpo').innerHTML = html;
    var a = $('hojaAcciones'); a.innerHTML = ''; if (acciones) a.appendChild(acciones);
    hoja.querySelector('.hoja-cuerpo').scrollTop = 0;
    abrirCapa(hoja);
    return $('hojaCuerpo');
  }

  var visor = $('visor'), visorLista = [], visorIdx = 0;
  function mostrarImagen() {
    var it = visorLista[visorIdx], im = $('visorImg');
    if (!visor.hidden && !reduceMov) { im.classList.add('cambiando'); im.onload = function () { im.classList.remove('cambiando'); }; }
    im.src = it.src; $('visorImg').alt = it.alt || it.titulo || '';
    $('visorTxt').textContent = it.titulo || '';
    $('visorCont').textContent = visorLista.length > 1 ? (visorIdx + 1) + ' / ' + visorLista.length : '';
    $('visorPrev').hidden = $('visorNext').hidden = visorLista.length < 2;
  }
  function abrirVisor(lista, i) { visorLista = lista; visorIdx = i || 0; mostrarImagen(); abrirCapa(visor); }
  function mover(paso) { if (visorLista.length < 2) return; visorIdx = (visorIdx + paso + visorLista.length) % visorLista.length; mostrarImagen(); }
  $('visorPrev').onclick = function () { mover(-1); };
  $('visorNext').onclick = function () { mover(1); };
  (function () {
    var x0 = null, zona = $('visorZona');
    zona.addEventListener('touchstart', function (e) { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    zona.addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
    });
  })();

  /* ---------- Navegación ---------- */
  var pestanas = document.querySelectorAll('[data-tab]'), paneles = document.querySelectorAll('[data-panel]');
  function mostrar(id, sinAnimar) {
    if (!document.getElementById(id)) id = 'inicio';
    paneles.forEach(function (p) {
      var activo = p.id === id;
      p.hidden = !activo;
      p.classList.toggle('entra', activo && !sinAnimar);
    });
    pestanas.forEach(function (t) {
      var activo = t.dataset.tab === id;
      t.setAttribute('aria-selected', activo);
      t.tabIndex = activo ? 0 : -1;
    });
    D.store.set('tab', id);
    window.scrollTo(0, 0);
  }
  pestanas.forEach(function (t) { t.addEventListener('click', function () { mostrar(t.dataset.tab); }); });
  var ALIAS = { anuncios: 'inicio', lectura: 'estudio' };
  var inicial = (location.hash || '').slice(1) || D.store.get('tab') || 'inicio';
  mostrar(ALIAS[inicial] || inicial, true);

  /* =========================================================
     INICIO
     ========================================================= */
  var ahora = new Date();
  $('hoyFecha').textContent = D.fechaLarga(ahora);
  $('saludo').textContent = D.saludo(ahora);

  function filaCulto(c, hoy) {
    var f = D.fecha(c.fecha), n = D.diasEntre(hoy, f);
    var cls = 'fila tarjeta' + (n === 0 ? ' hoy' : '') + (n < 0 ? ' pasada' : '');
    return '<li class="' + cls + '"><div class="fecha-bloque"><small>' + D.DIAS_CORTOS[f.getDay()] + '</small><b>' + f.getDate() + '</b></div>' +
      '<div class="fila-cuerpo"><div class="fila-top"><span class="muted">' + esc(c.hora ? c.hora + ' hrs' : '') + '</span>' + (n === 0 ? '<span class="chip chip-oro">Hoy</span>' : n < 0 ? '<span class="chip">Realizado</span>' : '') + '</div>' +
      '<div class="rol"><span>Coordina</span><span>' + esc(c.coordinador) + '</span></div>' +
      '<div class="rol"><span>Predica</span><b>' + esc(c.predicador) + '</b></div></div></li>';
  }
  function dibujarInicio(d, ag) {
    var A = window.AgendaDatos, hoy = D.inicioDia(ahora), hoyIso = D.iso(ahora);
    d.cultos_semana = ag.asignaciones_cultos || [];
    var proximas = A.expandir(ag, hoyIso, A.sumarDias(hoyIso, 120)).filter(function (o) { return o.tipo === 'actividad' && o.fechaFin >= hoyIso; });
    var claves = [];
    (d.destacados || []).forEach(function (a) { claves.push('d|' + a.titulo + '|' + a.fecha); });
    (d.cultos_semana || []).forEach(function (c) { claves.push('c|' + c.fecha + '|' + c.coordinador + '|' + c.predicador); });
    proximas.forEach(function (o) { claves.push('e|' + o.id + '|' + o.fecha + '|' + (o.hora || '') + '|' + o.estado); });
    if (d.diacono) claves.push('x|' + d.diacono);
    var esNuevo = D.marcadorNuevos('visto-anuncios', claves), hayNuevo = false;
    function nuevo(k) { var n = esNuevo(k); if (n) hayNuevo = true; return n; }

    /* Próximo culto */
    var px = null, hero = $('proximo');
    A.expandir(ag, hoyIso, A.sumarDias(hoyIso, 8)).some(function (o) {
      if (o.tipo !== 'culto' || o.estado === 'cancelada' || !o.hora) return false;
      var hm = o.hora.split(':'), ini = D.fecha(o.fecha); ini.setHours(+hm[0], +hm[1], 0, 0);
      if (ini.getTime() + 2 * 3600e3 <= ahora.getTime()) return false;
      px = { inicio: ini, hora: o.hora, enCurso: ahora >= ini, ocurrencia: o }; return true;
    });
    if (px) {
      var cs = px.ocurrencia.coordinador || px.ocurrencia.predicador ? px.ocurrencia : null;
      var dia = D.diaRelativo(px.inicio, ahora);
      hero.innerHTML = '<p class="kicker">' + ic('calendario', 'ic-sm') + (px.enCurso ? 'Culto en curso <span class="chip chip-vivo">Ahora</span>' : 'Próximo culto') + '</p>' +
        '<p class="hero-dia">' + esc(dia) + '</p>' +
        '<p class="hero-hora">' + esc(px.hora) + ' hrs</p>' + (dia === 'Hoy' || dia === 'Mañana' ? '<p class="hero-fecha">' + esc(D.fechaLarga(px.inicio)) + '</p>' : '') +
        (cs ? '<div class="hero-roles">' + (cs.coordinador ? '<div class="rol"><span>Coordina</span>' + esc(cs.coordinador) + '</div>' : '') + (cs.predicador ? '<div class="rol"><span>Predica</span><b>' + esc(cs.predicador) + '</b></div>' : '') + '</div>' : '') +
        '<div class="hero-acciones"><a class="btn btn-oro" target="_blank" rel="noopener" href="' + esc(enlaceMapa(d.mapa || d.direccion || 'Corral 8021 Lan-C')) + '">' + ic('pin', 'ic-sm') + 'Cómo llegar</a>' +
        '<button class="btn btn-sec" type="button" data-evento="' + esc(px.ocurrencia.id) + '">Ver detalle</button></div>';
      hero.querySelector('[data-evento]').onclick = function () { window.Agenda.abrirFicha(px.ocurrencia.id); };
    } else {
      hero.innerHTML = '<p class="kicker">Próximo culto</p><p class="hero-dia">Horario por confirmar</p>';
    }

    /* Destacados vigentes */
    var dest = D.destacadosVigentes(d.destacados, ahora), cont = $('destacados');
    $('destacadosBox').hidden = !dest.length;
    cont.innerHTML = dest.map(function (a, i) {
      var n = nuevo('d|' + a.titulo + '|' + a.fecha);
      var media = a.imagen
        ? '<button class="destacado-img" type="button" data-afiche="' + i + '" aria-label="Ver afiche: ' + esc(a.titulo) + '">' + img(a.imagen, '') + '</button>'
        : '<div class="destacado-ic">' + ic('calendario', 'ic-lg') + '</div>';
      return '<article class="destacado tarjeta">' + media + '<div class="destacado-cuerpo">' + (n ? '<div>' + CHIP_NUEVO + '</div>' : '') +
        '<h3>' + esc(a.titulo) + '</h3>' +
        '<div class="meta">' + (a.fecha ? '<span>' + ic('reloj', 'ic-sm') + esc(a.fecha) + '</span>' : '') + (a.lugar ? '<span>' + ic('pin', 'ic-sm') + esc(a.lugar) + '</span>' : '') + '</div>' +
        (a.texto ? '<p>' + esc(a.texto) + '</p>' : '') +
        (a.mapa ? '<a class="btn btn-sec" target="_blank" rel="noopener" href="' + esc(enlaceMapa(a.mapa)) + '">Cómo llegar</a>' : '') +
        '</div></article>';
    }).join('');
    cont.querySelectorAll('[data-afiche]').forEach(function (b) {
      b.onclick = function () { var a = dest[+b.dataset.afiche]; abrirVisor([{ src: a.imagen, titulo: a.titulo, alt: 'Afiche: ' + a.titulo }], 0); };
    });

    /* Cultos de la semana */
    var sem = (d.cultos_semana || []).slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    $('semanaBox').hidden = !sem.length;
    $('semana').innerHTML = sem.map(function (c) { nuevo('c|' + c.fecha + '|' + c.coordinador + '|' + c.predicador); return filaCulto(c, hoy); }).join('');

    /* Próximas actividades (desde la agenda) */
    var lista = proximas.slice(0, 4);
    proximas.forEach(function (o) { nuevo('e|' + o.id + '|' + o.fecha + '|' + (o.hora || '') + '|' + o.estado); });
    if (lista.length) {
      $('agenda').innerHTML = lista.map(function (o) { return window.Agenda.fila(o, { nuevo: esNuevo('e|' + o.id + '|' + o.fecha + '|' + (o.hora || '') + '|' + o.estado) }); }).join('');
      window.Agenda.enlazarFilas($('agenda'));
    } else {
      estadoVacio($('agenda'), 'calendario', 'No hay actividades próximas publicadas por ahora.');
    }
    var mesAct = A.expandir(ag, hoyIso, A.sumarDias(hoyIso, 30)).filter(function (o) { return o.estado !== 'cancelada'; }).length;
    $('agendaResumen').textContent = mesAct ? mesAct + ' cultos y actividades en los próximos 30 días' : 'Calendario de cultos y actividades';

    /* Horarios, ubicación y diácono */
    $('horarios').innerHTML = (ag.cultos_regulares || []).map(function (h) { return '<div class="horario"><small>' + esc(h.dia) + '</small><b>' + esc(h.hora) + '</b></div>'; }).join('');
    if (d.direccion) $('direccion').textContent = d.direccion;
    $('mapa').href = enlaceMapa(d.mapa || d.direccion || 'Corral 8021 Lan-C');
    if (d.diacono) { $('diaconoNom').textContent = d.diacono; $('diacono').hidden = false; nuevo('x|' + d.diacono); }
    marcarPestana('inicio', hayNuevo);
  }
  function cargarInicio() {
    Promise.all([D.cargar('anuncios.json'), window.Agenda.cargar()]).then(function (r) { dibujarInicio(r[0], r[1]); }).catch(function () {
      estadoError($('destacados'), 'No se pudieron cargar los anuncios. Revisa tu conexión a internet.', cargarInicio);
      $('agenda').innerHTML = '';
      $('proximo').innerHTML = '<p class="kicker">Próximo culto</p><p class="hero-dia">Sin conexión</p><p class="hero-hora">Vuelve a intentarlo en un momento.</p>';
    });
  }

  /* =========================================================
     ESTUDIO
     ========================================================= */
  function tarjetaEstudio(e, i, nuevo) {
    var portada = e.portada || (e.paginas || [])[0];
    var nPag = (e.paginas || []).length;
    return '<article class="estudio tarjeta">' +
      (portada ? '<button class="estudio-portada" type="button" data-ver="' + i + '" aria-label="Ver estudio: ' + esc(e.titulo) + '">' + img(portada, '') + (e.fecha ? '<span class="portada-fecha">' + ic('calendario') + esc(e.fecha) + '</span>' : '') + '</button>' : '') +
      '<div class="estudio-cuerpo"><div class="etiquetas"><span class="chip">Estudio</span>' + (nuevo ? CHIP_NUEVO : '') + '</div>' +
      '<h3>' + esc(e.titulo) + '</h3>' +
      '<div class="meta">' + (e.expositor ? '<span>' + ic('persona', 'ic-sm') + esc(e.expositor) + '</span>' : '') + (nPag ? '<span>' + ic('diapos', 'ic-sm') + nPag + ' diapositivas</span>' : '') + '</div>' +
      (e.descripcion ? '<p>' + esc(e.descripcion) + '</p>' : '') +
      '<div class="estudio-acciones">' + (nPag ? '<button class="btn" type="button" data-ver="' + i + '">Ver estudio</button>' : '') +
      (e.pdf ? '<a class="btn btn-sec" href="' + esc(e.pdf) + '" target="_blank" rel="noopener">' + ic('descarga', 'ic-sm') + 'PDF</a>' : '') + '</div></div></article>';
  }
  function verEstudio(e) {
    var lista = (e.paginas || []).map(function (src, k, arr) { return { src: src, titulo: e.titulo + ' · ' + (k + 1) + ' de ' + arr.length, alt: e.titulo + ', diapositiva ' + (k + 1) }; });
    var html = '<p class="kicker">Estudio bíblico</p><h3 class="hoja-titulo">' + esc(e.titulo) + '</h3>' +
      '<div class="meta" style="margin-top:8px">' + (e.fecha ? '<span>' + ic('calendario', 'ic-sm') + esc(e.fecha) + '</span>' : '') + (e.expositor ? '<span>' + ic('persona', 'ic-sm') + esc(e.expositor) + '</span>' : '') + '</div>' +
      '<p class="muted" style="margin-top:12px">Toca una diapositiva para verla en pantalla completa.</p>' +
      '<div class="diapos">' + lista.map(function (s, k) { return '<button type="button" data-d="' + k + '" aria-label="Ampliar diapositiva ' + (k + 1) + '">' + img(s.src, s.alt) + '<span class="diapo-num">' + (k + 1) + '/' + lista.length + '</span></button>'; }).join('') + '</div>' +
      (e.pdf ? '<a class="btn btn-sec btn-bloque" style="margin-top:20px" href="' + esc(e.pdf) + '" target="_blank" rel="noopener">' + ic('descarga', 'ic-sm') + 'Descargar PDF</a>' : '');
    var cuerpo = abrirHoja(e.titulo, html);
    cuerpo.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { abrirVisor(lista, +b.dataset.d); }; });
  }
  function dibujarSeries(series) {
    $('seriesBox').hidden = !series.length;
    $('series').innerHTML = series.map(function (s) {
      return '<article class="serie tarjeta"><span class="chip chip-oro">Serie · ' + (s.sesiones || []).length + ' sesiones</span>' +
        '<h3 style="margin-top:10px">' + esc(s.titulo) + '</h3>' + (s.descripcion ? '<p>' + esc(s.descripcion) + '</p>' : '') +
        '<div class="sesiones">' + (s.sesiones || []).map(function (x, k) {
          return '<details class="sesion"><summary><span class="sesion-num">' + (k + 1) + '</span><span class="sesion-tit">' + esc(x.titulo) + '<small>' + esc(x.cita || '') + '</small></span>' + ic('derecha', 'ic-sm') + '</summary>' +
            '<div class="sesion-cuerpo">' + (x.resumen ? '<p>' + esc(x.resumen) + '</p>' : '') + (x.preguntas && x.preguntas.length ? '<ol>' + x.preguntas.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' : '') + '</div></details>';
        }).join('') + '</div></article>';
    }).join('');
  }
  function dibujarPlan(p) {
    if (!p || !p.capitulos) { $('planBox').hidden = true; return; }
    $('planBox').hidden = false;
    $('planTitulo').textContent = p.titulo || 'Plan de lectura';
    var total = +p.capitulos;
    function render() {
      var leidos = D.plan.leidos(), n = 0, html = '';
      for (var i = 1; i <= total; i++) {
        var ok = !!leidos[i]; if (ok) n++;
        html += '<label class="dia' + (ok ? ' hecho' : '') + '"><input type="checkbox" data-dia="' + i + '"' + (ok ? ' checked' : '') + ' aria-label="Día ' + i + ': ' + esc(p.libro || '') + ' ' + i + '"><small>Día ' + i + '</small><b>' + (p.abreviatura || p.libro ? esc(p.abreviatura || p.libro.slice(0, 3)) + ' ' : '') + i + '</b></label>';
      }
      $('planDias').innerHTML = html;
      $('planBarra').style.width = (n / total * 100) + '%';
      $('planCuenta').textContent = n + ' de ' + total;
      $('planMensaje').textContent = n === total ? '¡Terminaste el plan! Gloria a Dios.' : '';
      $('planDias').querySelectorAll('input').forEach(function (c) {
        c.onchange = function () { D.plan.marcar(+c.dataset.dia, c.checked); render(); avisar((c.checked ? 'Día ' : 'Día ') + c.dataset.dia + (c.checked ? ' marcado como leído' : ' desmarcado')); var x = $('planDias').querySelector('[data-dia="' + c.dataset.dia + '"]'); if (x) x.focus(); };
      });
    }
    var btn = $('planReiniciar'), espera = null;
    btn.onclick = function () {
      if (!espera) {
        btn.textContent = 'Toca de nuevo para confirmar';
        espera = setTimeout(function () { btn.textContent = 'Reiniciar plan'; espera = null; }, 4000);
        return;
      }
      clearTimeout(espera); espera = null; btn.textContent = 'Reiniciar plan';
      D.plan.reiniciar(); render(); avisar('Plan de lectura reiniciado');
    };
    render();
  }
  function dibujarEstudio(d) {
    var es = d.estudios || [];
    var esNuevo = D.marcadorNuevos('visto-estudios', es.map(function (e) { return e.pdf || e.titulo; })), hay = false;
    function lista(cont, items, offset) {
      cont.innerHTML = items.map(function (e, k) { var n = esNuevo(e.pdf || e.titulo); if (n) hay = true; return tarjetaEstudio(e, k + offset, n); }).join('');
      cont.querySelectorAll('[data-ver]').forEach(function (b) { b.onclick = function () { verEstudio(es[+b.dataset.ver]); }; });
    }
    if (es.length) lista($('estudiosLista'), es.slice(0, 1), 0);
    else estadoVacio($('estudiosLista'), 'libro', 'Pronto se publicarán nuevos estudios.');
    $('anterioresEstudiosBox').hidden = es.length < 2;
    if (es.length > 1) lista($('estudiosAnteriores'), es.slice(1), 1);
    dibujarSeries(d.series || []);
    dibujarPlan(d.plan_lectura);
    marcarPestana('estudio', hay);
  }
  function cargarEstudio() {
    D.cargar('estudios.json').then(dibujarEstudio).catch(function () {
      estadoError($('estudiosLista'), 'No se pudieron cargar los estudios. Revisa tu conexión a internet.', cargarEstudio);
    });
  }

  /* =========================================================
     ORACIÓN
     ========================================================= */
  var numeroPeticiones = '56956339029';
  function iconoCategoria(n) {
    var k = D.normalizar(n);
    if (/salud|enferm|sanid/.test(k)) return 'corazon';
    if (/famil|nino|joven|generac/.test(k)) return 'familia';
    if (/iglesia|activid|congreg|mision/.test(k)) return 'iglesia';
    return 'corazon';
  }
  function dibujarOracion(d) {
    if (d.whatsapp) numeroPeticiones = d.whatsapp;
    var v = D.versiculoDelDia(d.versiculos, ahora);
    $('versiculo').innerHTML = '<p class="kicker">Versículo del día</p>' +
      (v ? '<blockquote>«' + esc(v.texto) + '»</blockquote><figcaption>' + esc(v.cita) + ' · RVR1960</figcaption>' : '<blockquote>«Orad sin cesar.»</blockquote><figcaption>1 Tesalonicenses 5:17 · RVR1960</figcaption>');
    var ms = d.motivos || [];
    var esNuevo = D.marcadorNuevos('visto-motivos', ms.map(function (m) { return m.texto; })), hay = false;
    if (!ms.length) { estadoVacio($('motivos'), 'corazon', 'Pronto se publicarán los motivos de oración de la semana.'); }
    else {
      $('motivos').innerHTML = D.agrupar(ms, 'categoria', 'Generales').map(function (g) {
        return '<div class="categoria"><h3><span class="cat-ic">' + ic(iconoCategoria(g.nombre)) + '</span>' + esc(g.nombre) + ' <span class="muted">· ' + g.items.length + '</span></h3><ul class="motivos tarjeta">' +
          g.items.map(function (m) { var n = esNuevo(m.texto); if (n) hay = true; return '<li class="motivo"><span>' + esc(m.texto) + '</span>' + (n ? CHIP_NUEVO : '') + '</li>'; }).join('') + '</ul></div>';
      }).join('');
    }
    marcarPestana('oracion', hay);
  }
  function cargarOracion() {
    D.cargar('oracion.json').then(dibujarOracion).catch(function () {
      estadoError($('motivos'), 'No se pudieron cargar los motivos de oración. Revisa tu conexión a internet.', cargarOracion);
      $('versiculo').innerHTML = '<p class="kicker">Versículo del día</p><blockquote>«Orad sin cesar.»</blockquote><figcaption>1 Tesalonicenses 5:17 · RVR1960</figcaption>';
    });
  }
  (function formulario() {
    var t = $('petTexto'), err = $('petError'), ok = $('petOk');
    t.addEventListener('input', function () { err.hidden = true; t.removeAttribute('aria-invalid'); ok.hidden = true; });
    $('formPeticion').addEventListener('submit', function (e) {
      e.preventDefault();
      var texto = t.value.trim();
      if (!texto) { err.hidden = false; t.setAttribute('aria-invalid', 'true'); t.focus(); return; }
      var url = D.enlacePeticion(numeroPeticiones, $('petNombre').value.trim(), texto, $('petConf').checked);
      var w = window.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (er) { /* sin acceso */ } } else { location.href = url; }
      ok.hidden = false;
    });
  })();

  /* =========================================================
     CANCIONERO
     ========================================================= */
  var himnos = [], filtro = 'todos';
  function dibujarHimnos() {
    var q = D.normalizar($('buscar').value);
    var favs = D.favoritos.lista();
    var res = himnos.filter(function (h) {
      if (filtro === 'favoritos' && favs.indexOf(h.numero) === -1) return false;
      if (!q) return true;
      return String(h.numero) === q || D.normalizar(h.numero + ' ' + h.titulo + ' ' + (h.autor || '')).indexOf(q) !== -1;
    });
    var cont = $('himnos');
    $('himnosInfo').textContent = res.length + (res.length === 1 ? ' himno' : ' himnos') + (filtro === 'favoritos' ? ' en favoritos' : '');
    if (!res.length) {
      cont.classList.remove('tarjeta');
      estadoVacio(cont, filtro === 'favoritos' && !q ? 'estrella' : 'buscar',
        filtro === 'favoritos' && !q ? 'Aún no tienes favoritos. Toca la estrella de un himno para guardarlo aquí.' : 'No encontramos himnos con esa búsqueda. Prueba con otra palabra o número.');
      return;
    }
    cont.classList.add('tarjeta');
    cont.innerHTML = res.map(function (h) {
      var fav = favs.indexOf(h.numero) !== -1;
      return '<li class="himno"><button class="himno-abrir" type="button" data-h="' + h.numero + '"><span class="himno-num">' + h.numero + '</span><span class="himno-tit"><b>' + esc(h.titulo) + '</b><small>' + esc(h.autor || '') + '</small></span></button>' +
        '<button class="icon-btn fav" type="button" data-fav="' + h.numero + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Quitar de favoritos: ' : 'Agregar a favoritos: ') + esc(h.titulo) + '">' + ic('estrella') + '</button></li>';
    }).join('');
    cont.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { verHimno(+b.dataset.h); }; });
    cont.querySelectorAll('[data-fav]').forEach(function (b) { b.onclick = function () { var es = D.favoritos.alternar(+b.dataset.fav); dibujarHimnos(); var x = $('himnos').querySelector('[data-fav="' + b.dataset.fav + '"]'); if (x) { x.focus(); if (es) x.classList.add('pulso'); } avisar(es ? 'Agregado a favoritos' : 'Quitado de favoritos'); }; });
  }
  function verHimno(num) {
    var h = himnos.filter(function (x) { return x.numero === num; })[0]; if (!h) return;
    var fav = document.createElement('button');
    fav.className = 'icon-btn fav'; fav.type = 'button';
    function pintarFav() { var es = D.favoritos.es(h.numero); fav.setAttribute('aria-pressed', es); fav.setAttribute('aria-label', es ? 'Quitar de favoritos' : 'Agregar a favoritos'); }
    fav.innerHTML = ic('estrella', 'ic-lg'); pintarFav();
    fav.onclick = function () { var es = D.favoritos.alternar(h.numero); pintarFav(); dibujarHimnos(); fav.classList.remove('pulso'); void fav.offsetWidth; if (es) fav.classList.add('pulso'); avisar(es ? 'Agregado a favoritos' : 'Quitado de favoritos'); };
    var tieneLetra = h.letra && h.letra.length;
    var html = '<p class="kicker">Himno ' + h.numero + '</p><h3 class="hoja-titulo">' + esc(h.titulo) + '</h3>' + (h.autor ? '<p class="muted" style="margin-top:4px">' + esc(h.autor) + '</p>' : '') +
      (tieneLetra ? '<div class="lectura-ctrl"><span class="muted">Tamaño de letra</span><button class="tam" type="button" data-tam="-1" aria-label="Letra más pequeña">A−</button><button class="tam" type="button" data-tam="1" aria-label="Letra más grande">A+</button></div>' +
        '<div class="letra" id="letra">' + h.letra.map(function (e) {
          var coro = e && !Array.isArray(e) && typeof e === 'object' && (e.tipo === 'coro' || e.coro);
          var lineas = Array.isArray(e) ? e : (e && e.lineas) ? e.lineas : [e];
          return '<p class="estrofa' + (coro ? ' coro' : '') + '">' + esc(lineas.join('\n')) + '</p>';
        }).join('') + '</div>' : '<div class="vacio" style="margin-top:20px">' + ic('musica') + '<p>La letra de este himno aún no está disponible.</p></div>') +
      (h.nota ? '<p class="muted" style="margin-top:24px">' + esc(h.nota) + '</p>' : '');
    var cuerpo = abrirHoja('Himno ' + h.numero, html, fav);
    if (tieneLetra) {
      var letra = cuerpo.querySelector('#letra');
      function aplicar() { letra.style.fontSize = D.tamanoLetra.rem() + 'rem'; cuerpo.querySelector('[data-tam="-1"]').disabled = D.tamanoLetra.min(); cuerpo.querySelector('[data-tam="1"]').disabled = D.tamanoLetra.max(); }
      cuerpo.querySelectorAll('[data-tam]').forEach(function (b) { b.onclick = function () { D.tamanoLetra.cambiar(+b.dataset.tam); aplicar(); }; });
      aplicar();
    }
  }
  $('buscar').addEventListener('input', dibujarHimnos);
  document.querySelectorAll('[data-filtro]').forEach(function (b) {
    b.addEventListener('click', function () {
      filtro = b.dataset.filtro;
      document.querySelectorAll('[data-filtro]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      dibujarHimnos();
    });
  });
  function cargarCancionero() {
    D.cargar('cancionero.json').then(function (d) {
      himnos = (d.himnos || []).slice().sort(function (a, b) { return a.numero - b.numero; });
      dibujarHimnos();
    }).catch(function () {
      $('himnos').classList.remove('tarjeta');
      estadoError($('himnos'), 'No se pudo cargar el cancionero. Revisa tu conexión a internet.', cargarCancionero);
    });
  }

  /* =========================================================
     FOTOS
     ========================================================= */
  function verAlbum(g, esNuevo) {
    var lista = g.items.map(function (f) { return { src: f.archivo, titulo: f.titulo, alt: f.titulo }; });
    var html = '<p class="kicker">Álbum</p><h3 class="hoja-titulo">' + esc(g.nombre) + '</h3><p class="muted" style="margin:4px 0 16px">' + g.items.length + ' fotos' + (g.fecha ? ' · ' + esc(g.fecha) : '') + '</p>' +
      '<div class="cuadricula">' + g.items.map(function (f, k) {
        return '<button type="button" data-f="' + k + '" aria-label="Ver foto: ' + esc(f.titulo) + '">' + img(f.archivo, '') + (esNuevo(f.archivo) ? CHIP_NUEVO : '') + '</button>';
      }).join('') + '</div>';
    var cuerpo = abrirHoja(g.nombre, html);
    cuerpo.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { abrirVisor(lista, +b.dataset.f); }; });
  }
  function dibujarFotos(d) {
    var fotos = d.fotos || [];
    var esNuevo = D.marcadorNuevos('visto-fotos', fotos.map(function (f) { return f.archivo; }));
    var meta = {}; (d.albumes || []).forEach(function (a) { meta[a.nombre] = a; });
    var grupos = D.agrupar(fotos, 'album', 'Fotos');
    var cont = $('albumes'), hay = false;
    if (!grupos.length) { estadoVacio(cont, 'imagen', 'Pronto habrá fotos de las actividades de la iglesia.'); return; }
    var nuevosPorGrupo = grupos.map(function (g) { return g.items.filter(function (f) { return esNuevo(f.archivo); }).length; });
    cont.innerHTML = grupos.map(function (g, i) {
      if (meta[g.nombre] && meta[g.nombre].fecha) g.fecha = meta[g.nombre].fecha;
      if (nuevosPorGrupo[i]) hay = true;
      var pv = g.items.slice(0, 3);
      return '<button class="album tarjeta" type="button" data-a="' + i + '"><div class="album-portada">' +
        pv.map(function (f, k) { return img(f.archivo, '', (k ? 'loading="lazy"' : 'loading="eager"') + (pv.length === 1 ? ' style="grid-column:span 2"' : '')); }).join('') +
        '<span class="album-cantidad">' + ic('imagen') + g.items.length + '</span></div><div class="album-cuerpo"><div><h3>' + esc(g.nombre) + '</h3><span class="muted">' + g.items.length + ' fotos' + (g.fecha ? ' · ' + esc(g.fecha) : '') + '</span></div>' +
        (nuevosPorGrupo[i] ? '<span class="chip chip-nuevo">' + nuevosPorGrupo[i] + (nuevosPorGrupo[i] === 1 ? ' nueva' : ' nuevas') + '</span>' : ic('derecha')) + '</div></button>';
    }).join('');
    cont.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { verAlbum(grupos[+b.dataset.a], esNuevo); }; });
    marcarPestana('fotos', hay);
  }
  function cargarFotos() {
    D.cargar('fotos.json').then(dibujarFotos).catch(function () {
      estadoError($('albumes'), 'No se pudieron cargar las fotos. Revisa tu conexión a internet.', cargarFotos);
    });
  }

  /* ---------- Utilidades compartidas con la agenda ---------- */
  window.App = { $: $, esc: esc, ic: ic, ICONOS: ICONOS, CHIP_NUEVO: CHIP_NUEVO, avisar: avisar, abrirCapa: abrirCapa, pedirCierre: pedirCierre,
    abrirVisor: abrirVisor, img: img, estadoVacio: estadoVacio, estadoError: estadoError, enlaceMapa: enlaceMapa, marcarPestana: marcarPestana };

  /* ---------- Inicio de la app ---------- */
  window.addEventListener('agenda-lista', function () { cargarInicio(); });
  cargarEstudio(); cargarOracion(); cargarCancionero(); cargarFotos();
})();
