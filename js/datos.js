/* =========================================================
   IEPI LAN-C · Lógica de datos (sin acceso al DOM)
   Carga de archivos, fechas, almacenamiento local y reglas.
   ========================================================= */
(function (global) {
  'use strict';

  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DURACION_CULTO_MS = 2 * 60 * 60 * 1000;

  /* ---------- Almacenamiento local (tolerante a fallos) ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  };
  function leerJSON(k, def) { try { var v = JSON.parse(store.get(k)); return v == null ? def : v; } catch (e) { return def; } }
  function guardarJSON(k, v) { store.set(k, JSON.stringify(v)); }

  /* ---------- Carga de archivos de datos ---------- */
  function cargar(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---------- Texto ---------- */
  function normalizar(t) {
    return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  /* ---------- Fechas ---------- */
  function fecha(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function inicioDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function dosDig(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + dosDig(d.getMonth() + 1) + '-' + dosDig(d.getDate()); }
  function diasEntre(a, b) { return Math.round((inicioDia(b) - inicioDia(a)) / 864e5); }
  function fechaLarga(d) { return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function diaRelativo(d, ahora) {
    var n = diasEntre(ahora, d);
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Mañana';
    return fechaLarga(d);
  }
  function saludo(d) {
    var h = d.getHours();
    if (h >= 5 && h < 12) return 'Buenos días';
    if (h >= 12 && h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }
  function indiceDia(nombre) {
    var n = normalizar(nombre);
    for (var i = 0; i < 7; i++) if (normalizar(DIAS[i]) === n) return i;
    return -1;
  }

  /* Próximo culto según los horarios fijos; un culto se considera "en curso"
     hasta dos horas después de su inicio. */
  function proximoCulto(horarios, ahora) {
    var mejor = null;
    for (var i = 0; i <= 7; i++) {
      var dia = inicioDia(ahora); dia.setDate(dia.getDate() + i);
      (horarios || []).forEach(function (h) {
        if (indiceDia(h.dia) !== dia.getDay()) return;
        var hm = String(h.hora).split(':');
        var inicio = new Date(dia); inicio.setHours(+hm[0] || 0, +hm[1] || 0, 0, 0);
        if (inicio.getTime() + DURACION_CULTO_MS <= ahora.getTime()) return;
        if (!mejor || inicio < mejor.inicio) mejor = { inicio: inicio, hora: h.hora, enCurso: ahora >= inicio };
      });
      if (mejor) break;
    }
    return mejor;
  }

  /* Separa una lista con campo "fecha" (AAAA-MM-DD) en próximas y anteriores. */
  function separarPorFecha(lista, ahora) {
    var hoy = inicioDia(ahora), prox = [], prev = [];
    (lista || []).slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; })
      .forEach(function (x) { (fecha(x.fecha) < hoy ? prev : prox).push(x); });
    prev.reverse();
    return { proximas: prox, anteriores: prev };
  }

  /* Un destacado con "hasta" deja de mostrarse al día siguiente de esa fecha. */
  function destacadosVigentes(lista, ahora) {
    var hoy = inicioDia(ahora);
    return (lista || []).filter(function (d) { return !d.hasta || fecha(d.hasta) >= hoy; });
  }

  function versiculoDelDia(versiculos, d) {
    if (!versiculos || !versiculos.length) return null;
    var inicioAno = new Date(d.getFullYear(), 0, 0);
    var n = Math.floor((inicioDia(d) - inicioAno) / 864e5);
    return versiculos[n % versiculos.length];
  }

  function agrupar(lista, campo, porDefecto) {
    var grupos = [], idx = {};
    (lista || []).forEach(function (x) {
      var k = x[campo] || porDefecto;
      if (!(k in idx)) { idx[k] = grupos.length; grupos.push({ nombre: k, items: [] }); }
      grupos[idx[k]].items.push(x);
    });
    return grupos;
  }

  /* "Nuevo": recuerda en este teléfono qué elementos ya se vieron.
     La primera vez no marca nada (todo sería nuevo). */
  function marcadorNuevos(clave, claves) {
    var previas = leerJSON(clave, null);
    guardarJSON(clave, claves);
    if (!previas) return function () { return false; };
    var vistas = {};
    previas.forEach(function (k) { vistas[k] = true; });
    return function (k) { return !vistas[k]; };
  }

  /* Favoritos del cancionero y tamaño de letra */
  var CLAVE_FAV = 'himnos-favoritos', CLAVE_TAM = 'himnos-tamano';
  var favoritos = {
    lista: function () { return leerJSON(CLAVE_FAV, []); },
    es: function (n) { return favoritos.lista().indexOf(n) !== -1; },
    alternar: function (n) {
      var l = favoritos.lista(), i = l.indexOf(n);
      if (i === -1) l.push(n); else l.splice(i, 1);
      guardarJSON(CLAVE_FAV, l);
      return i === -1;
    }
  };
  var TAMANOS = [1, 1.125, 1.25, 1.4, 1.6];
  var tamanoLetra = {
    nivel: function () { var n = +store.get(CLAVE_TAM); return n >= 0 && n < TAMANOS.length ? n : 1; },
    rem: function () { return TAMANOS[tamanoLetra.nivel()]; },
    cambiar: function (paso) {
      var n = Math.max(0, Math.min(TAMANOS.length - 1, tamanoLetra.nivel() + paso));
      store.set(CLAVE_TAM, String(n));
      return n;
    },
    min: function () { return tamanoLetra.nivel() === 0; },
    max: function () { return tamanoLetra.nivel() === TAMANOS.length - 1; }
  };

  /* Plan de lectura (se conserva la clave usada antes para no perder avances) */
  var CLAVE_PLAN = 'marcos';
  var plan = {
    leidos: function () { return leerJSON(CLAVE_PLAN, {}); },
    marcar: function (dia, valor) { var l = plan.leidos(); l[dia] = !!valor; guardarJSON(CLAVE_PLAN, l); },
    reiniciar: function () { guardarJSON(CLAVE_PLAN, {}); }
  };

  /* Petición de oración por WhatsApp */
  function enlacePeticion(numero, nombre, texto, confidencial) {
    var msg = 'Petición de oración (app IEPI LAN-C)';
    if (nombre) msg += '\nDe: ' + nombre;
    if (confidencial) msg += '\nConfidencial: por favor no compartir con la congregación.';
    msg += '\n\n' + texto;
    return 'https://wa.me/' + String(numero || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);
  }

  global.Datos = {
    DIAS: DIAS, DIAS_CORTOS: DIAS_CORTOS, MESES: MESES,
    store: store, leerJSON: leerJSON, guardarJSON: guardarJSON,
    cargar: cargar, normalizar: normalizar,
    fecha: fecha, iso: iso, inicioDia: inicioDia, diasEntre: diasEntre, fechaLarga: fechaLarga, diaRelativo: diaRelativo,
    saludo: saludo, proximoCulto: proximoCulto, separarPorFecha: separarPorFecha, destacadosVigentes: destacadosVigentes,
    versiculoDelDia: versiculoDelDia, agrupar: agrupar, marcadorNuevos: marcadorNuevos,
    favoritos: favoritos, tamanoLetra: tamanoLetra, plan: plan, enlacePeticion: enlacePeticion
  };
})(window);
