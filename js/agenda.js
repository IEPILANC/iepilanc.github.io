/* =========================================================
   IEPI LAN-C · Agenda congregacional (interfaz)
   Vistas: mes, semana, agenda cronológica y guardadas.
   Ficha de actividad con calendario del teléfono y compartir.
   La lógica de fechas y conflictos vive en agenda-datos.js.
   ========================================================= */
(function () {
  'use strict';
  var A = window.AgendaDatos, D = window.Datos, U = window.App;
  var $ = U.$, esc = U.esc, ic = U.ic;
  var BASE = location.origin + location.pathname.replace(/index\.html$/, '');
  var URL_ICS = 'https://iepilanc.github.io/agenda.ics';

  var datos = null, promesa = null, cargadoEn = 0;
  var cats = {}, estado = { vista: 'lista', filtro: null, mes: null, semana: null, dia: null, anteriores: false };

  /* ---------- Carga y actualización ---------- */
  function cargar(forzar) {
    if (promesa && !forzar) return promesa;
    promesa = D.cargar('agenda.json').then(function (d) {
      datos = d; cargadoEn = Date.now(); cats = A.indices(d).categorias;
      return d;
    });
    promesa.catch(function () { promesa = null; });
    return promesa;
  }
  /* Al volver a la app después de un rato, se piden los datos de nuevo para no mostrar información vieja. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || Date.now() - cargadoEn < 10 * 60e3) return;
    cargar(true).then(function () {
      window.dispatchEvent(new Event('agenda-lista'));
      if (!$('agendaHoja').hidden) render();
    }).catch(function () { /* se mantiene lo último cargado */ });
  });

  /* ---------- Guardadas (agenda personal en este teléfono) ---------- */
  var CLAVE_G = 'agenda-guardadas';
  var guardadas = {
    lista: function () { return D.leerJSON(CLAVE_G, []); },
    es: function (id) { return guardadas.lista().indexOf(id) !== -1; },
    alternar: function (id) { var l = guardadas.lista(), i = l.indexOf(id); if (i === -1) l.push(id); else l.splice(i, 1); D.guardarJSON(CLAVE_G, l); return i === -1; }
  };

  /* ---------- Formato ---------- */
  var MES = D.MESES, DIA = D.DIAS, DIA_C = D.DIAS_CORTOS;
  function hoyIso() { return D.iso(new Date()); }
  function fechaTexto(iso) {
    var h = hoyIso();
    if (iso === h) return 'Hoy';
    if (iso === A.sumarDias(h, 1)) return 'Mañana';
    if (iso === A.sumarDias(h, -1)) return 'Ayer';
    return D.fechaLarga(D.fecha(iso));
  }
  function horario(o) {
    if (!o.hora) return o.fecha !== o.fechaFin ? 'Todo el día' : 'Hora por confirmar';
    return o.hora + (o.horaFin ? '–' + o.horaFin : '') + ' hrs';
  }
  function rangoFechas(o) {
    if (o.fecha === o.fechaFin) return D.fechaLarga(D.fecha(o.fecha));
    var a = D.fecha(o.fecha), b = D.fecha(o.fechaFin);
    return DIA[a.getDay()] + ' ' + a.getDate() + (a.getMonth() !== b.getMonth() ? ' de ' + MES[a.getMonth()] : '') + ' al ' + DIA[b.getDay()].toLowerCase() + ' ' + b.getDate() + ' de ' + MES[b.getMonth()];
  }
  function cat(o) { return cats[o.categoria] || { id: o.categoria, nombre: 'Actividad', corto: 'Actividad', icono: 'calendario' }; }
  function chipCat(o) { var c = cat(o); return '<span class="cat-chip" data-cat="' + esc(c.id) + '">' + ic(c.icono, 'ic-sm') + esc(c.corto || c.nombre) + '</span>'; }
  function chipsEstado(o) {
    if (o.estado === 'cancelada') return '<span class="chip chip-error">Cancelada</span>';
    if (o.estado === 'reprogramada') return '<span class="chip chip-oro">Reprogramada</span>';
    if (o.nota_cambio) return '<span class="chip">Actualizada</span>';
    return '';
  }

  /* ---------- Fila de actividad (se usa también en Inicio) ---------- */
  function fila(o, opc) {
    opc = opc || {};
    var f = D.fecha(o.fecha), c = cat(o), h = hoyIso();
    var cls = 'evento tarjeta ev-' + o.estado + (o.fecha <= h && o.fechaFin >= h ? ' ev-hoy' : '') + (o.fechaFin < h ? ' ev-pasado' : '');
    return '<li><button class="' + cls + '" type="button" data-evento="' + esc(o.id) + '" data-cat="' + esc(c.id) + '">' +
      (opc.sinFecha ? '<span class="ev-hora">' + esc(o.hora || '—') + '</span>' : '<span class="fecha-bloque"><small>' + DIA_C[f.getDay()] + '</small><b>' + f.getDate() + '</b></span>') +
      '<span class="ev-cuerpo"><span class="ev-titulo">' + esc(o.titulo) + '</span>' +
      '<span class="ev-meta">' + metaHora(o, opc) +
      (o.lugar ? '<span>' + ic('pin', 'ic-sm') + esc(o.lugar.nombre) + '</span>' : '') + '</span>' +
      '<span class="ev-chips">' + chipCat(o) + chipsEstado(o) + (opc.nuevo ? U.CHIP_NUEVO : '') + (guardadas.es(o.id) ? '<span class="chip">' + ic('marcador', 'ic-sm') + 'Guardada</span>' : '') + '</span></span>' +
      ic('derecha', 'ev-flecha') + '</button></li>';
  }
  function metaHora(o, opc) {
    var t;
    if (opc.sinFecha) t = !o.hora ? horario(o) : o.horaFin ? 'Hasta las ' + o.horaFin + ' hrs' : '';
    else t = (o.fecha !== o.fechaFin ? rangoFechas(o) + ' · ' : '') + horario(o);
    return t ? '<span>' + ic('reloj', 'ic-sm') + esc(t) + '</span>' : '';
  }
  function enlazarFilas(cont) {
    cont.querySelectorAll('[data-evento]').forEach(function (b) { b.onclick = function () { abrirFicha(b.dataset.evento); }; });
  }

  /* ---------- Hoja de la agenda ---------- */
  function filtrar(lista) { return estado.filtro ? lista.filter(function (o) { return o.categoria === estado.filtro; }) : lista; }
  function dibujarFiltros() {
    var html = '<button type="button" class="cat-filtro" data-f="" aria-pressed="' + !estado.filtro + '">Todas</button>' +
      (datos.categorias || []).map(function (c) {
        return '<button type="button" class="cat-filtro" data-cat="' + esc(c.id) + '" data-f="' + esc(c.id) + '" aria-pressed="' + (estado.filtro === c.id) + '">' + ic(c.icono, 'ic-sm') + esc(c.corto || c.nombre) + '</button>';
      }).join('');
    var cont = $('agFiltros'); cont.innerHTML = html;
    cont.querySelectorAll('[data-f]').forEach(function (b) {
      b.onclick = function () { estado.filtro = b.dataset.f || null; render(); };
    });
    $('agFiltros').hidden = estado.vista === 'mia';
  }
  function vacio(msg, icono) { return '<div class="vacio">' + ic(icono || 'calendario') + '<p>' + esc(msg) + '</p></div>'; }
  function grupoDias(lista, vacioMsg) {
    if (!lista.length) return vacio(vacioMsg);
    var html = '', actual = null;
    lista.forEach(function (o) {
      if (o.fecha !== actual) { if (actual) html += '</ul>'; actual = o.fecha; html += '<h3 class="dia-tit">' + esc(fechaTexto(o.fecha)) + '</h3><ul class="eventos">'; }
      html += fila(o, { sinFecha: true });
    });
    return html + '</ul>';
  }

  function vistaLista() {
    var h = hoyIso();
    var prox = filtrar(A.expandir(datos, h, A.sumarDias(h, 180))).filter(function (o) { return o.fechaFin >= h; });
    var html = grupoDias(prox, estado.filtro ? 'No hay actividades próximas en esta categoría.' : 'No hay actividades próximas publicadas.');
    html += '<button class="btn btn-sec btn-bloque" type="button" id="agAnt" style="margin-top:20px" aria-expanded="' + estado.anteriores + '">' + (estado.anteriores ? 'Ocultar actividades anteriores' : 'Ver actividades anteriores') + '</button>';
    if (estado.anteriores) {
      var prev = filtrar(A.expandir(datos, A.sumarDias(h, -60), A.sumarDias(h, -1))).filter(function (o) { return o.fechaFin < h; }).reverse();
      html += '<div class="anteriores-lista">' + grupoDias(prev, 'No hay actividades anteriores en los últimos 60 días.') + '</div>';
    }
    return html;
  }

  function vistaMes() {
    var m = estado.mes, primero = new Date(m.y, m.m, 1), ultimo = new Date(m.y, m.m + 1, 0);
    var desde = D.iso(primero), hasta = D.iso(ultimo);
    var mapa = A.porDia(filtrar(A.expandir(datos, desde, hasta)));
    var h = hoyIso(), sel = estado.dia && estado.dia >= desde && estado.dia <= hasta ? estado.dia : (h >= desde && h <= hasta ? h : desde);
    estado.dia = sel;
    var html = '<div class="cal-cab"><button class="icon-btn" type="button" data-nav="-1" aria-label="Mes anterior">' + ic('izquierda', 'ic-lg') + '</button>' +
      '<h3 aria-live="polite">' + esc(MES[m.m].charAt(0).toUpperCase() + MES[m.m].slice(1)) + ' ' + m.y + '</h3>' +
      '<button class="icon-btn" type="button" data-nav="1" aria-label="Mes siguiente">' + ic('derecha', 'ic-lg') + '</button></div>' +
      '<div class="cal tarjeta" role="grid" aria-label="Calendario del mes"><div class="cal-sem" role="row">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (x, i) { return '<span role="columnheader" aria-label="' + ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i] + '">' + x + '</span>'; }).join('') + '</div><div class="cal-dias" role="row">';
    var off = (primero.getDay() + 6) % 7;
    for (var i = 0; i < off; i++) html += '<span class="cal-vacio" aria-hidden="true"></span>';
    for (var d = 1; d <= ultimo.getDate(); d++) {
      var iso = D.iso(new Date(m.y, m.m, d)), evs = (mapa[iso] || []).filter(function (o) { return o.estado !== 'cancelada'; });
      var puntos = evs.slice(0, 3).map(function (o) { return '<i data-cat="' + esc(o.categoria) + '"></i>'; }).join('');
      html += '<button type="button" role="gridcell" class="cal-dia' + (iso === h ? ' es-hoy' : '') + (iso === sel ? ' sel' : '') + (evs.length ? ' con' : '') + '" data-dia="' + iso + '" aria-pressed="' + (iso === sel) + '" aria-label="' + esc(D.fechaLarga(D.fecha(iso)) + (evs.length ? ', ' + evs.length + (evs.length === 1 ? ' actividad' : ' actividades') : ', sin actividades')) + '">' +
        '<span>' + d + '</span><span class="puntos">' + puntos + (evs.length > 3 ? '<em>+</em>' : '') + '</span></button>';
    }
    html += '</div></div>';
    var delDia = (mapa[sel] || []);
    html += '<h3 class="dia-tit">' + esc(fechaTexto(sel)) + '</h3>' + (delDia.length ? '<ul class="eventos">' + delDia.map(function (o) { return fila(o, { sinFecha: true }); }).join('') + '</ul>' : vacio('Sin actividades este día.'));
    html += '<p class="leyenda">' + (datos.categorias || []).map(function (c) { return '<span><i data-cat="' + esc(c.id) + '"></i>' + esc(c.corto || c.nombre) + '</span>'; }).join('') + '</p>';
    return html;
  }

  function lunes(iso) { var d = D.fecha(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return D.iso(d); }
  function vistaSemana() {
    var ini = estado.semana, fin = A.sumarDias(ini, 6), h = hoyIso();
    var mapa = A.porDia(filtrar(A.expandir(datos, ini, fin)));
    var a = D.fecha(ini), b = D.fecha(fin);
    var tit = a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + MES[a.getMonth()].slice(0, 3) : '') + ' – ' + b.getDate() + ' ' + MES[b.getMonth()].slice(0, 3) + ' ' + b.getFullYear();
    var html = '<div class="cal-cab"><button class="icon-btn" type="button" data-nav="-7" aria-label="Semana anterior">' + ic('izquierda', 'ic-lg') + '</button>' +
      '<h3 aria-live="polite">' + esc(tit) + '</h3><button class="icon-btn" type="button" data-nav="7" aria-label="Semana siguiente">' + ic('derecha', 'ic-lg') + '</button></div>';
    if (h < ini || h > fin) html += '<button class="btn btn-sec btn-bloque" type="button" id="agHoySem" style="margin-bottom:16px">Ir a esta semana</button>';
    html += '<div class="semana">';
    for (var i = 0; i < 7; i++) {
      var iso = A.sumarDias(ini, i), f = D.fecha(iso), evs = mapa[iso] || [];
      html += '<section class="sem-dia' + (iso === h ? ' es-hoy' : '') + '"><h3><span class="sem-num">' + f.getDate() + '</span><span>' + DIA[f.getDay()] + (iso === h ? ' <span class="chip chip-oro">Hoy</span>' : '') + '</span></h3>' +
        (evs.length ? '<ul class="eventos">' + evs.map(function (o) { return fila(o, { sinFecha: true }); }).join('') + '</ul>' : '<p class="muted sem-vacio">Sin actividades</p>') + '</section>';
    }
    return html + '</div>';
  }

  function vistaMia() {
    var ids = guardadas.lista(), h = hoyIso();
    if (!ids.length) return vacio('Aún no guardas actividades. Abre una actividad y toca «Guardar en mi agenda» para tenerla aquí.', 'marcador');
    var todas = A.expandir(datos, A.sumarDias(h, -120), A.sumarDias(h, 365));
    var mias = todas.filter(function (o) { return ids.indexOf(o.id) !== -1; });
    var faltan = ids.length - mias.length;
    var prox = mias.filter(function (o) { return o.fechaFin >= h; }), prev = mias.filter(function (o) { return o.fechaFin < h; }).reverse();
    var html = '<p class="nota-personal">' + ic('marcador', 'ic-sm') + '<span>Tu agenda personal se guarda solo en este teléfono. Las actividades oficiales siguen en la vista «Agenda».</span></p>' +
      grupoDias(prox, 'No tienes actividades guardadas próximas.');
    if (prev.length) html += '<h3 class="bloque-sub">Ya realizadas</h3>' + grupoDias(prev, '');
    if (faltan > 0) html += '<p class="muted" style="margin-top:16px">' + faltan + (faltan === 1 ? ' actividad guardada ya no está' : ' actividades guardadas ya no están') + ' en la agenda publicada.</p>';
    return html;
  }

  function render() {
    if (!datos) return;
    document.querySelectorAll('[data-vista]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.vista === estado.vista); });
    dibujarFiltros();
    var cuerpo = $('agCuerpo');
    cuerpo.innerHTML = estado.vista === 'mes' ? vistaMes() : estado.vista === 'semana' ? vistaSemana() : estado.vista === 'mia' ? vistaMia() : vistaLista();
    enlazarFilas(cuerpo);
    cuerpo.querySelectorAll('[data-nav]').forEach(function (b) {
      b.onclick = function () {
        var n = +b.dataset.nav;
        if (estado.vista === 'mes') { var d = new Date(estado.mes.y, estado.mes.m + n, 1); estado.mes = { y: d.getFullYear(), m: d.getMonth() }; estado.dia = null; }
        else estado.semana = A.sumarDias(estado.semana, n);
        render();
        var x = $('agCuerpo').querySelector('[data-nav="' + b.dataset.nav + '"]'); if (x) x.focus();
      };
    });
    cuerpo.querySelectorAll('[data-dia]').forEach(function (b) {
      b.onclick = function () { estado.dia = b.dataset.dia; render(); var x = $('agCuerpo').querySelector('[data-dia="' + estado.dia + '"]'); if (x) x.focus(); };
    });
    var ant = $('agAnt'); if (ant) ant.onclick = function () { estado.anteriores = !estado.anteriores; render(); $('agAnt').focus(); };
    var hs = $('agHoySem'); if (hs) hs.onclick = function () { estado.semana = lunes(hoyIso()); render(); };
  }
  document.querySelectorAll('[data-vista]').forEach(function (b) {
    b.addEventListener('click', function () { estado.vista = b.dataset.vista; D.store.set('agenda-vista', estado.vista); render(); $('agendaHoja').querySelector('.hoja-cuerpo').scrollTop = 0; });
  });

  function abrirAgenda(vista) {
    var h = hoyIso(), d = D.fecha(h);
    estado.vista = vista || D.store.get('agenda-vista') || 'lista';
    if (!estado.mes) estado.mes = { y: d.getFullYear(), m: d.getMonth() };
    if (!estado.semana) estado.semana = lunes(h);
    var cuerpo = $('agCuerpo');
    cuerpo.innerHTML = '<div class="skel" style="height:80px"></div><div class="skel" style="height:80px;margin-top:10px"></div>';
    U.abrirCapa($('agendaHoja'));
    cargar().then(render).catch(function () {
      U.estadoError(cuerpo, 'No se pudo cargar la agenda. Revisa tu conexión a internet.', function () { cargar(true).then(render); });
    });
  }

  /* ---------- Ficha de actividad ---------- */
  function filaDato(icono, etiqueta, valor, extra) {
    if (!valor) return '';
    return '<div class="dato">' + ic(icono) + '<div><span class="muted">' + esc(etiqueta) + '</span><b>' + esc(valor) + '</b>' + (extra || '') + '</div></div>';
  }
  function descargarIcs(o, minutos) {
    var texto = A.ics([o], cats, { ahora: new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), base: BASE, alarmaMin: minutos || 0 });
    var blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = o.id + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    U.avisar('Archivo de calendario descargado');
  }
  function compartir(titulo, texto, url) {
    if (navigator.share) {
      navigator.share({ title: titulo, text: texto, url: url }).catch(function () { /* cancelado por la persona */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { U.avisar('Enlace copiado'); }, function () { U.avisar('Copia este enlace: ' + url); });
    } else U.avisar('Copia este enlace: ' + url);
  }
  function abrirFicha(id) {
    var cuerpo = $('fichaCuerpo');
    cuerpo.innerHTML = '<div class="skel" style="height:28px;width:60%"></div><div class="skel" style="height:160px;margin-top:16px"></div>';
    $('fichaTitulo').textContent = 'Actividad';
    if ($('ficha').hidden) U.abrirCapa($('ficha'));
    cargar().then(function () {
      var h = hoyIso(), o = A.buscar(datos, id, A.sumarDias(h, -400), A.sumarDias(h, 400));
      if (!o) { cuerpo.innerHTML = vacio('Esta actividad ya no está en la agenda publicada. Puede que se haya retirado o cambiado.', 'alerta'); $('fichaCompartir').hidden = true; return; }
      $('fichaCompartir').hidden = false;
      var c = cat(o), url = BASE + '?evento=' + encodeURIComponent(o.id), esG = guardadas.es(o.id);
      $('fichaTitulo').textContent = c.nombre;
      var aviso = '';
      if (o.estado === 'cancelada') aviso = '<div class="aviso-estado cancelada" role="note">' + ic('alerta') + '<div><b>Actividad cancelada</b>' + (o.nota_cambio ? '<p>' + esc(o.nota_cambio) + '</p>' : '') + '</div></div>';
      else if (o.estado === 'reprogramada') {
        var fo = o.fecha_original ? A.partir(o.fecha_original) : null;
        aviso = '<div class="aviso-estado reprogramada" role="note">' + ic('calendario') + '<div><b>Actividad reprogramada</b>' + (fo && fo.fecha ? '<p>Fecha anterior: ' + esc(D.fechaLarga(D.fecha(fo.fecha)) + (fo.hora ? ', ' + fo.hora + ' hrs' : '')) + '</p>' : '') + (o.nota_cambio ? '<p>' + esc(o.nota_cambio) + '</p>' : '') + '</div></div>';
      } else if (o.nota_cambio) aviso = '<div class="aviso-estado" role="note">' + ic('alerta') + '<div><b>Actualización</b><p>' + esc(o.nota_cambio) + '</p></div></div>';
      var lugarExtra = o.lugar && (o.lugar.direccion || o.lugar.mapa) ? (o.lugar.direccion ? '<span class="muted">' + esc(o.lugar.direccion) + '</span>' : '') + (o.lugar.mapa ? '<a class="enlace" target="_blank" rel="noopener" href="' + esc(U.enlaceMapa(o.lugar.mapa)) + '">Cómo llegar</a>' : '') : '';
      var resp = (o.responsables || []).map(function (x) { return typeof x === 'object' ? x.nombre + (x.rol ? ' (' + x.rol + ')' : '') : x; }).join(', ');
      cuerpo.innerHTML =
        '<div class="ficha-cab" data-cat="' + esc(c.id) + '"><div class="etiquetas">' + chipCat(o) + chipsEstado(o) + '</div>' +
        '<h3 class="hoja-titulo' + (o.estado === 'cancelada' ? ' tachado' : '') + '">' + esc(o.titulo) + '</h3></div>' + aviso +
        (o.imagen ? '<button class="ficha-afiche" type="button" id="fichaAfiche" aria-label="Ampliar afiche">' + U.img(o.imagen, 'Afiche: ' + o.titulo) + '</button>' : '') +
        '<div class="datos tarjeta">' +
        filaDato('calendario', 'Fecha', rangoFechas(o)) +
        filaDato('reloj', 'Horario', horario(o)) +
        filaDato('pin', 'Lugar', o.lugar && o.lugar.nombre, lugarExtra) +
        filaDato('persona', 'Coordina', o.coordinador) +
        filaDato('iglesia', 'Predica', o.predicador) +
        filaDato('libro', 'Expositor', o.expositor) +
        filaDato('reunion', 'Responsables', resp) +
        '</div>' +
        (o.descripcion ? '<p class="ficha-desc">' + esc(o.descripcion) + '</p>' : '') +
        (o.indicaciones ? '<div class="indicaciones"><b>Indicaciones</b><p>' + esc(o.indicaciones) + '</p></div>' : '') +
        '<div class="ficha-acciones">' +
        '<button class="btn btn-bloque' + (esG ? ' btn-sec' : '') + '" type="button" id="fichaGuardar" aria-pressed="' + esG + '">' + ic('marcador', 'ic-sm') + (esG ? 'Guardada en mi agenda' : 'Guardar en mi agenda') + '</button>' +
        (o.estado !== 'cancelada' && o.fechaFin >= h ? '<div class="cal-personal tarjeta"><b>Agregar a mi calendario</b><p class="muted">Tu teléfono te avisará antes de la actividad.</p>' +
          '<label class="campo-linea" for="fichaRec"><span>Recordatorio</span><select class="entrada" id="fichaRec"><option value="0">Sin recordatorio</option><option value="30">30 minutos antes</option><option value="120">2 horas antes</option><option value="1440">1 día antes</option></select></label>' +
          '<div class="dos-btn"><a class="btn btn-sec" id="fichaGoogle" target="_blank" rel="noopener" href="' + esc(A.enlaceGoogle(o, cats, BASE)) + '">Google Calendar</a>' +
          '<button class="btn btn-sec" type="button" id="fichaIcs">iPhone / otro (.ics)</button></div>' +
          '<p class="muted mini">En Google Calendar el recordatorio lo eliges al guardar el evento.</p></div>' : '') +
        '<button class="btn btn-sec btn-bloque" type="button" id="fichaCompartir2">' + ic('compartir', 'ic-sm') + 'Compartir</button>' +
        '</div>';
      var rec = $('fichaRec');
      if (rec) { rec.value = D.store.get('agenda-recordatorio') || '1440'; rec.onchange = function () { D.store.set('agenda-recordatorio', rec.value); }; }
      var afi = $('fichaAfiche'); if (afi) afi.onclick = function () { U.abrirVisor([{ src: o.imagen, titulo: o.titulo, alt: 'Afiche: ' + o.titulo }], 0); };
      $('fichaGuardar').onclick = function () {
        var es = guardadas.alternar(o.id), b = $('fichaGuardar');
        b.setAttribute('aria-pressed', es); b.classList.toggle('btn-sec', es);
        b.innerHTML = ic('marcador', 'ic-sm') + (es ? 'Guardada en mi agenda' : 'Guardar en mi agenda');
        U.avisar(es ? 'Guardada en tu agenda' : 'Quitada de tu agenda');
        if (!$('agendaHoja').hidden) render();
      };
      var bi = $('fichaIcs'); if (bi) bi.onclick = function () { descargarIcs(o, +(rec ? rec.value : 0)); };
      var texto = o.titulo + ' · ' + rangoFechas(o) + (o.hora ? ', ' + horario(o) : '');
      $('fichaCompartir').onclick = $('fichaCompartir2').onclick = function () { compartir(o.titulo, texto, url); };
    }).catch(function () {
      U.estadoError(cuerpo, 'No se pudo cargar la actividad. Revisa tu conexión a internet.', function () { cargar(true).then(function () { abrirFicha(id); }); });
    });
  }

  /* ---------- Suscribirse al calendario completo ---------- */
  function abrirSuscripcion() {
    $('fichaTitulo').textContent = 'Suscribirse';
    $('fichaCompartir').hidden = true;
    var webcal = URL_ICS.replace(/^https:/, 'webcal:');
    $('fichaCuerpo').innerHTML = '<p class="kicker">Calendario congregacional</p><h3 class="hoja-titulo">Recibe la agenda en tu calendario</h3>' +
      '<p class="lead" style="margin-top:8px">Suscríbete una vez y los cultos y actividades aparecerán en el calendario de tu teléfono. Cuando la iglesia publique cambios, tu calendario se actualizará solo, normalmente en unas horas.</p>' +
      '<div class="ficha-acciones">' +
      '<a class="btn btn-bloque" href="' + esc(webcal) + '">iPhone o iPad</a>' +
      '<a class="btn btn-sec btn-bloque" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(webcal) + '">Google Calendar (desde un computador)</a>' +
      '<button class="btn btn-sec btn-bloque" type="button" id="copiarIcs">Copiar enlace del calendario</button></div>' +
      '<p class="muted" style="margin-top:16px">En Android, la forma más simple es abrir el enlace de Google Calendar una vez desde un computador con tu misma cuenta de Google; luego aparece también en el teléfono.</p>';
    $('copiarIcs').onclick = function () { compartir('Agenda IEPI LAN-C', 'Calendario de la iglesia', URL_ICS); };
    if ($('ficha').hidden) U.abrirCapa($('ficha'));
  }
  $('agSuscribir').addEventListener('click', abrirSuscripcion);
  $('abrirAgenda').addEventListener('click', function () { abrirAgenda(); });

  /* ---------- Enlaces directos: ?evento=ID o ?vista=agenda ---------- */
  var q = new URLSearchParams(location.search);
  window.Agenda = { cargar: cargar, fila: fila, enlazarFilas: enlazarFilas, abrirAgenda: abrirAgenda, abrirFicha: abrirFicha, guardadas: guardadas };
  window.dispatchEvent(new Event('agenda-lista'));
  if (q.get('evento')) abrirFicha(q.get('evento'));
  else if (q.get('vista') === 'agenda') abrirAgenda();
})();
