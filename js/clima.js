/* =========================================================
   IEPI LAN-C · Clima
   - Clima actual en Hualpén junto al saludo de Inicio.
   - Pronóstico para la hora del próximo culto, dentro de su tarjeta.
   - Datos de Open-Meteo (gratuito, sin cuenta). Se guarda 30 minutos
     en el teléfono; si no hay conexión, simplemente no se muestra.
   ========================================================= */
(function () {
  'use strict';
  var LAT = -36.7917, LON = -73.0944, LUGAR = 'Hualpén';
  var CLAVE = 'clima-cache', VIGENCIA = 30 * 60 * 1000;
  var URL_API = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
    '&current=temperature_2m,weather_code,is_day' +
    '&hourly=temperature_2m,weather_code,precipitation_probability' +
    '&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FSantiago&forecast_days=8';

  var P = {
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    luna: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    parcial: '<path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.95 12.65a4 4 0 0 0-5.93-4.61"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    nube: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    niebla: '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/><path d="M16 17H7M17 21H9"/>',
    llovizna: '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/><path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>',
    lluvia: '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/><path d="M16 14v6M8 14v6M12 16v6"/>',
    nieve: '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/><path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>',
    tormenta: '<path d="M6 16.33A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.97"/><path d="m13 12-3 5h4l-3 5"/>'
  };
  /* Códigos meteorológicos (WMO) → texto e ícono */
  function describir(c, dia) {
    if (c === 0) return { t: 'Despejado', i: dia === 0 ? 'luna' : 'sol' };
    if (c === 1 || c === 2) return { t: c === 1 ? 'Poco nublado' : 'Algo nublado', i: dia === 0 ? 'luna' : 'parcial' };
    if (c === 3) return { t: 'Nublado', i: 'nube' };
    if (c === 45 || c === 48) return { t: 'Neblina', i: 'niebla' };
    if (c >= 51 && c <= 57) return { t: 'Llovizna', i: 'llovizna' };
    if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return { t: c === 61 || c === 80 ? 'Lluvia débil' : c === 65 || c === 82 ? 'Lluvia fuerte' : 'Lluvia', i: 'lluvia' };
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { t: 'Nieve', i: 'nieve' };
    if (c >= 95) return { t: 'Tormenta', i: 'tormenta' };
    return { t: 'Nublado', i: 'nube' };
  }
  function icono(n) { return '<svg class="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.nube) + '</svg>'; }
  function grados(x) { return Math.round(x) + '°'; }

  var datos = null;

  function leerCache() {
    try { var c = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (c && Date.now() - c.t < VIGENCIA) return c.d; } catch (e) { /* sin almacenamiento */ }
    return null;
  }
  function guardarCache(d) { try { localStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* opcional */ } }

  function pintarActual() {
    var el = document.getElementById('clima');
    if (!el || !datos || !datos.current) return;
    var c = datos.current, d = describir(c.weather_code, c.is_day);
    var max = datos.daily && datos.daily.temperature_2m_max ? datos.daily.temperature_2m_max[0] : null;
    var min = datos.daily && datos.daily.temperature_2m_min ? datos.daily.temperature_2m_min[0] : null;
    el.innerHTML = icono(d.i) + '<b>' + grados(c.temperature_2m) + '</b><span class="clima-txt">' + d.t + '</span>';
    el.title = LUGAR + ': ' + d.t + ', ' + grados(c.temperature_2m) + (max != null ? ' · Máx. ' + grados(max) + ' / Mín. ' + grados(min) : '');
    el.setAttribute('aria-label', 'Clima en ' + LUGAR + ': ' + grados(c.temperature_2m) + ', ' + d.t.toLowerCase());
    el.hidden = false;
    el.onclick = function () { if (window.App && window.App.avisar) window.App.avisar(el.title); };
  }

  /* Pronóstico para la hora del próximo culto (si está dentro de los próximos 7 días) */
  function hero() {
    var h = document.getElementById('proximo');
    if (!h || !datos || !datos.hourly || !h.dataset.inicio) return;
    var viejo = h.querySelector('.hero-clima'); if (viejo) viejo.remove();
    var hora = h.dataset.inicio.slice(0, 13) + ':00';
    var i = datos.hourly.time.indexOf(hora);
    var lugar = h.querySelector('.hero-datos');
    if (i < 0 || !lugar) return;
    var hh = +hora.slice(11, 13);
    var d = describir(datos.hourly.weather_code[i], hh >= 7 && hh < 20 ? 1 : 0);
    var prob = datos.hourly.precipitation_probability ? datos.hourly.precipitation_probability[i] : null;
    var span = document.createElement('span');
    span.className = 'hero-clima';
    span.innerHTML = icono(d.i) + grados(datos.hourly.temperature_2m[i]) + ' · ' + d.t + (prob != null && prob >= 30 ? (/lluvia|llovizna|tormenta/i.test(d.t) ? ' · ' + prob + '%' : ' · ' + prob + '% de lluvia') : '');
    span.setAttribute('aria-label', 'Pronóstico para el culto: ' + span.textContent);
    lugar.appendChild(span);
  }

  function aplicar(d) { datos = d; pintarActual(); hero(); }

  var c = leerCache();
  if (c) aplicar(c);
  else if (window.fetch) {
    fetch(URL_API).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { guardarCache(d); aplicar(d); })
      .catch(function () { /* sin conexión: no se muestra el clima */ });
  }

  window.Clima = { hero: hero, describir: describir };
})();
