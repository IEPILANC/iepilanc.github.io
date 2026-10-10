/* =========================================================
   IEPI LAN-C · Lógica de la Agenda congregacional
   Sin acceso al DOM: se usa en la app y en la herramienta
   herramientas/agenda.mjs (validación, conflictos y .ics).
   ========================================================= */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.AgendaDatos = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  var ESTADOS = ['publicada', 'cancelada', 'reprogramada', 'borrador'];
  var CAMPOS_PERSONA = ['coordinador', 'predicador', 'expositor'];

  function norm(t) { return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
  function dos(n) { return String(n).padStart(2, '0'); }
  function isoDia(d) { return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }
  function aFecha(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sumarDias(iso, n) { var d = aFecha(iso); d.setDate(d.getDate() + n); return isoDia(d); }
  function aMin(hora) { if (!hora) return null; var p = String(hora).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }

  /* "2026-10-21T19:00" → { fecha: "2026-10-21", hora: "19:00" }; "2026-10-21" → hora null */
  function partir(valor) {
    if (!valor) return { fecha: null, hora: null };
    var s = String(valor).trim(), m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?$/);
    return m ? { fecha: m[1], hora: m[2] || null } : { fecha: null, hora: null, invalido: s };
  }

  function indices(agenda) {
    var cat = {}, lug = {};
    (agenda.categorias || []).forEach(function (c) { cat[c.id] = c; });
    (agenda.lugares || []).forEach(function (l) { lug[l.id] = l; });
    return { categorias: cat, lugares: lug };
  }
  function resolverLugar(valor, lugares) {
    if (!valor) return null;
    if (typeof valor === 'object') return valor;
    return lugares[valor] || { id: null, nombre: String(valor) };
  }
  function listaPersonas(o) {
    var r = [];
    CAMPOS_PERSONA.forEach(function (k) { if (o[k]) r.push(String(o[k])); });
    (o.responsables || []).forEach(function (x) { if (x) r.push(String(typeof x === 'object' ? x.nombre : x)); });
    return r;
  }

  /* ---------- Ocurrencias en un rango [desde, hasta] (fechas ISO) ---------- */
  function expandir(agenda, desde, hasta, opciones) {
    opciones = opciones || {};
    var ix = indices(agenda), res = [];

    /* Cultos regulares semanales */
    var asignaciones = agenda.asignaciones_cultos || [], excepciones = agenda.excepciones_cultos || [];
    function asignacion(f, r) { return asignaciones.filter(function (a) { return a.fecha === f && (!a.hora || a.hora === r.hora); })[0] || {}; }
    function excepcion(f, r) { return excepciones.filter(function (e) { return e.fecha === f && (e.culto ? e.culto === r.id : (!e.hora || e.hora === r.hora)); })[0] || null; }
    for (var f = desde; f <= hasta; f = sumarDias(f, 1)) {
      var dow = aFecha(f).getDay();
      (agenda.cultos_regulares || []).forEach(function (r) {
        if (DIAS.indexOf(norm(r.dia)) !== dow) return;
        if (r.desde && f < r.desde) return;
        if (r.hasta && f > r.hasta) return;
        var ex = excepcion(f, r), a = asignacion(f, r);
        var o = {
          id: r.id + '-' + f, tipo: 'culto', regular: r.id,
          titulo: (ex && ex.titulo) || r.titulo, categoria: r.categoria || 'cultos',
          fecha: f, hora: (ex && ex.hora_nueva) || r.hora, fechaFin: f, horaFin: r.hora_fin || null,
          lugar: resolverLugar((ex && ex.lugar) || r.lugar, ix.lugares),
          coordinador: a.coordinador || null, predicador: a.predicador || null, responsables: a.responsables || [],
          descripcion: (ex && ex.descripcion) || null, indicaciones: (ex && ex.indicaciones) || null,
          estado: ex ? (ex.estado || 'cancelada') : 'publicada', nota_cambio: ex ? (ex.motivo || null) : null,
          fecha_original: ex && ex.hora_nueva ? f + 'T' + r.hora : null
        };
        res.push(o);
      });
    }

    /* Actividades puntuales */
    (agenda.actividades || []).forEach(function (a) {
      if (a.estado === 'borrador' && !opciones.borradores) return;
      var i = partir(a.inicio), fn = partir(a.fin || a.inicio);
      if (!i.fecha) return;
      var ff = fn.fecha || i.fecha;
      if (ff < desde || i.fecha > hasta) return;
      res.push({
        id: a.id, tipo: 'actividad', titulo: a.titulo, categoria: a.categoria || 'especiales',
        fecha: i.fecha, hora: i.hora, fechaFin: ff, horaFin: a.fin ? fn.hora : null,
        lugar: resolverLugar(a.lugar, ix.lugares),
        coordinador: a.coordinador || null, predicador: a.predicador || null, expositor: a.expositor || null,
        responsables: a.responsables || [], descripcion: a.descripcion || null, indicaciones: a.indicaciones || null,
        imagen: a.imagen || null, estado: a.estado || 'publicada', nota_cambio: a.nota_cambio || null,
        fecha_original: a.fecha_original || null, actualizado: a.actualizado || null
      });
    });

    res.sort(function (x, y) {
      if (x.fecha !== y.fecha) return x.fecha < y.fecha ? -1 : 1;
      var hx = x.hora || '00:00', hy = y.hora || '00:00';
      if (!x.hora && y.hora) return -1; if (x.hora && !y.hora) return 1;
      return hx < hy ? -1 : hx > hy ? 1 : 0;
    });
    return res;
  }

  function diasQueCubre(o) { var r = []; for (var f = o.fecha; f <= o.fechaFin; f = sumarDias(f, 1)) r.push(f); return r; }
  function porDia(ocurrencias) {
    var m = {};
    ocurrencias.forEach(function (o) { diasQueCubre(o).forEach(function (f) { (m[f] = m[f] || []).push(o); }); });
    return m;
  }

  /* ---------- Conflictos ----------
     Solo se compara lo que los datos permiten: si falta la hora de término,
     se avisa únicamente cuando ambas actividades empiezan a la misma hora. */
  function intervalo(o) {
    var ini = aMin(o.hora), fin = aMin(o.horaFin);
    return { ini: ini, fin: fin };
  }
  function seCruzan(a, b) {
    if (a.estado === 'cancelada' || b.estado === 'cancelada') return null;
    if (a.fecha !== b.fecha) return null;
    if (!a.hora || !b.hora) return null;
    var x = intervalo(a), y = intervalo(b);
    if (x.fin != null && y.fin != null) return (x.ini < y.fin && y.ini < x.fin) ? 'seguro' : null;
    if (x.ini === y.ini) return 'posible';
    if (x.fin != null && y.ini >= x.ini && y.ini < x.fin) return 'seguro';
    if (y.fin != null && x.ini >= y.ini && x.ini < y.fin) return 'seguro';
    return null;
  }
  function conflictos(agenda, desde, hasta) {
    var lista = expandir(agenda, desde, hasta, { borradores: true }), out = [];
    for (var i = 0; i < lista.length; i++) for (var j = i + 1; j < lista.length; j++) {
      var a = lista[i], b = lista[j];
      if (b.fecha !== a.fecha) continue;
      var t = seCruzan(a, b); if (!t) continue;
      var la = a.lugar && (a.lugar.id || norm(a.lugar.nombre)), lb = b.lugar && (b.lugar.id || norm(b.lugar.nombre));
      if (la && lb && la === lb) out.push({ tipo: 'lugar', nivel: t, a: a, b: b, detalle: a.lugar.nombre });
      var pa = listaPersonas(a).map(norm), pb = listaPersonas(b).map(norm);
      pa.forEach(function (p) { if (p && pb.indexOf(p) !== -1) out.push({ tipo: 'persona', nivel: t, a: a, b: b, detalle: listaPersonas(a)[pa.indexOf(p)] }); });
    }
    return out;
  }

  /* ---------- Validación de datos ---------- */
  function validar(agenda) {
    var errores = [], avisos = [], ix = indices(agenda), ids = {};
    function e(m) { errores.push(m); } function w(m) { avisos.push(m); }
    (agenda.cultos_regulares || []).forEach(function (r) {
      if (DIAS.indexOf(norm(r.dia)) === -1) e('Culto "' + r.id + '": día no reconocido "' + r.dia + '".');
      if (!/^\d{2}:\d{2}$/.test(r.hora || '')) e('Culto "' + r.id + '": hora inválida "' + r.hora + '" (usa HH:MM).');
      if (r.lugar && !ix.lugares[r.lugar]) w('Culto "' + r.id + '": el lugar "' + r.lugar + '" no está en la lista de lugares.');
    });
    (agenda.asignaciones_cultos || []).forEach(function (a) {
      if (!partir(a.fecha).fecha) e('Asignación con fecha inválida: "' + a.fecha + '".');
    });
    (agenda.actividades || []).forEach(function (a, k) {
      var et = 'Actividad ' + (a.id ? '"' + a.id + '"' : '#' + (k + 1));
      if (!a.id) e(et + ': falta el identificador "id".');
      else if (ids[a.id]) e(et + ': el identificador está repetido.');
      ids[a.id] = true;
      if (!a.titulo) e(et + ': falta el título.');
      var i = partir(a.inicio), f = a.fin ? partir(a.fin) : null;
      if (!i.fecha) e(et + ': fecha de inicio inválida "' + a.inicio + '" (usa AAAA-MM-DD o AAAA-MM-DDTHH:MM).');
      if (f && !f.fecha) e(et + ': fecha de término inválida "' + a.fin + '".');
      if (i.fecha && f && f.fecha && (f.fecha + (f.hora || '')) < (i.fecha + (i.hora || ''))) e(et + ': termina antes de empezar.');
      if (a.categoria && !ix.categorias[a.categoria]) e(et + ': categoría desconocida "' + a.categoria + '".');
      if (a.estado && ESTADOS.indexOf(a.estado) === -1) e(et + ': estado desconocido "' + a.estado + '".');
      if (a.lugar && typeof a.lugar === 'string' && !ix.lugares[a.lugar]) w(et + ': el lugar "' + a.lugar + '" no está en la lista; se mostrará tal cual.');
      if (a.estado === 'reprogramada' && !a.fecha_original) w(et + ': está reprogramada pero no indica "fecha_original".');
    });
    return { errores: errores, avisos: avisos };
  }

  /* ---------- Calendario .ics ---------- */
  var VTZ = ['BEGIN:VTIMEZONE', 'TZID:America/Santiago',
    'BEGIN:STANDARD', 'DTSTART:19700405T000000', 'RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU', 'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0400', 'TZNAME:-04', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700906T000000', 'RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=1SU', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:DAYLIGHT',
    'END:VTIMEZONE'];
  function escIcs(t) { return String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function plegar(linea) { var out = [], s = linea; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); }
  function compacto(fecha, hora) { return fecha.replace(/-/g, '') + (hora ? 'T' + hora.replace(':', '') + '00' : ''); }
  function descripcion(o, categorias) {
    var p = [];
    var c = categorias[o.categoria]; if (c) p.push('Categoría: ' + c.nombre);
    if (o.coordinador) p.push('Coordina: ' + o.coordinador);
    if (o.predicador) p.push('Predica: ' + o.predicador);
    if (o.expositor) p.push('Expositor: ' + o.expositor);
    if (o.responsables && o.responsables.length) p.push('Responsables: ' + o.responsables.map(function (x) { return typeof x === 'object' ? x.nombre : x; }).join(', '));
    if (o.descripcion) p.push(o.descripcion);
    if (o.indicaciones) p.push('Indicaciones: ' + o.indicaciones);
    if (o.nota_cambio) p.push('Aviso: ' + o.nota_cambio);
    if (!o.hora) p.push('Hora por confirmar.');
    return p.join('\n');
  }
  function eventoIcs(o, categorias, opc) {
    opc = opc || {};
    var l = ['BEGIN:VEVENT', 'UID:' + o.id + '@iepilanc.github.io', 'DTSTAMP:' + (opc.ahora || '20260101T000000Z')];
    if (o.hora) {
      l.push('DTSTART;TZID=America/Santiago:' + compacto(o.fecha, o.hora));
      if (o.horaFin) l.push('DTEND;TZID=America/Santiago:' + compacto(o.fechaFin, o.horaFin));
    } else {
      l.push('DTSTART;VALUE=DATE:' + compacto(o.fecha));
      l.push('DTEND;VALUE=DATE:' + compacto(sumarDias(o.fechaFin, 1)));
    }
    l.push('SUMMARY:' + escIcs((o.estado === 'cancelada' ? 'CANCELADA: ' : '') + o.titulo));
    var d = descripcion(o, categorias); if (d) l.push('DESCRIPTION:' + escIcs(d));
    if (o.lugar) l.push('LOCATION:' + escIcs(o.lugar.nombre + (o.lugar.direccion ? ', ' + o.lugar.direccion : '')));
    var c = categorias[o.categoria]; if (c) l.push('CATEGORIES:' + escIcs(c.nombre));
    l.push('STATUS:' + (o.estado === 'cancelada' ? 'CANCELLED' : 'CONFIRMED'));
    if (opc.url) l.push('URL:' + opc.url);
    if (opc.alarmaMin && o.estado !== 'cancelada') {
      l.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escIcs(o.titulo), 'TRIGGER:-PT' + opc.alarmaMin + 'M', 'END:VALARM');
    }
    l.push('END:VEVENT');
    return l;
  }
  function ics(ocurrencias, categorias, opc) {
    opc = opc || {};
    var l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IEPI LAN-C//Agenda congregacional//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + escIcs(opc.nombre || 'Agenda IEPI LAN-C'), 'X-WR-TIMEZONE:America/Santiago', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H'].concat(VTZ);
    ocurrencias.forEach(function (o) { l = l.concat(eventoIcs(o, categorias, { ahora: opc.ahora, url: opc.base ? opc.base + '?evento=' + encodeURIComponent(o.id) : null, alarmaMin: opc.alarmaMin })); });
    l.push('END:VCALENDAR');
    return l.map(plegar).join('\r\n') + '\r\n';
  }

  /* Enlace para agregar a Google Calendar */
  function enlaceGoogle(o, categorias, base) {
    var fechas = o.hora
      ? compacto(o.fecha, o.hora) + '/' + compacto(o.fechaFin, o.horaFin || o.hora)
      : compacto(o.fecha) + '/' + compacto(sumarDias(o.fechaFin, 1));
    var q = { action: 'TEMPLATE', text: o.titulo, dates: fechas, ctz: 'America/Santiago', details: descripcion(o, categorias) + (base ? '\n\n' + base + '?evento=' + encodeURIComponent(o.id) : '') };
    if (o.lugar) q.location = o.lugar.nombre + (o.lugar.direccion ? ', ' + o.lugar.direccion : '');
    return 'https://calendar.google.com/calendar/render?' + Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  }

  function buscar(agenda, id, desde, hasta) {
    var m = String(id).match(/^(.*)-(\d{4}-\d{2}-\d{2})$/);
    var lista = m && (agenda.cultos_regulares || []).some(function (r) { return r.id === m[1]; })
      ? expandir(agenda, m[2], m[2]) : expandir(agenda, desde, hasta);
    return lista.filter(function (o) { return o.id === id; })[0] || null;
  }

  return {
    DIAS: DIAS, partir: partir, isoDia: isoDia, aFecha: aFecha, sumarDias: sumarDias, indices: indices,
    expandir: expandir, porDia: porDia, diasQueCubre: diasQueCubre, conflictos: conflictos, validar: validar,
    ics: ics, enlaceGoogle: enlaceGoogle, buscar: buscar, listaPersonas: listaPersonas
  };
});
