/* =========================================================
   IEPI LAN-C · Biblia Reina-Valera 1960
   La RVR1960 tiene derechos de autor (Sociedades Bíblicas Unidas),
   por eso la app no copia el texto: ofrece libros y capítulos, y cada
   capítulo se abre en la RVR1960 oficial de YouVersion (Bible.com),
   o en la app YouVersion si el teléfono la tiene instalada.
   ========================================================= */
(function () {
  'use strict';
  var D = window.Datos, U = window.App, $ = U.$, esc = U.esc, ic = U.ic;

  /* [código, nombre, capítulos] — códigos USFM que usa YouVersion */
  var AT = [
    ['GEN', 'Génesis', 50], ['EXO', 'Éxodo', 40], ['LEV', 'Levítico', 27], ['NUM', 'Números', 36], ['DEU', 'Deuteronomio', 34],
    ['JOS', 'Josué', 24], ['JDG', 'Jueces', 21], ['RUT', 'Rut', 4], ['1SA', '1 Samuel', 31], ['2SA', '2 Samuel', 24],
    ['1KI', '1 Reyes', 22], ['2KI', '2 Reyes', 25], ['1CH', '1 Crónicas', 29], ['2CH', '2 Crónicas', 36], ['EZR', 'Esdras', 10],
    ['NEH', 'Nehemías', 13], ['EST', 'Ester', 10], ['JOB', 'Job', 42], ['PSA', 'Salmos', 150], ['PRO', 'Proverbios', 31],
    ['ECC', 'Eclesiastés', 12], ['SNG', 'Cantares', 8], ['ISA', 'Isaías', 66], ['JER', 'Jeremías', 52], ['LAM', 'Lamentaciones', 5],
    ['EZK', 'Ezequiel', 48], ['DAN', 'Daniel', 12], ['HOS', 'Oseas', 14], ['JOL', 'Joel', 3], ['AMO', 'Amós', 9],
    ['OBA', 'Abdías', 1], ['JON', 'Jonás', 4], ['MIC', 'Miqueas', 7], ['NAM', 'Nahúm', 3], ['HAB', 'Habacuc', 3],
    ['ZEP', 'Sofonías', 3], ['HAG', 'Hageo', 2], ['ZEC', 'Zacarías', 14], ['MAL', 'Malaquías', 4]
  ];
  var NT = [
    ['MAT', 'Mateo', 28], ['MRK', 'Marcos', 16], ['LUK', 'Lucas', 24], ['JHN', 'Juan', 21], ['ACT', 'Hechos', 28],
    ['ROM', 'Romanos', 16], ['1CO', '1 Corintios', 16], ['2CO', '2 Corintios', 13], ['GAL', 'Gálatas', 6], ['EPH', 'Efesios', 6],
    ['PHP', 'Filipenses', 4], ['COL', 'Colosenses', 4], ['1TH', '1 Tesalonicenses', 5], ['2TH', '2 Tesalonicenses', 3], ['1TI', '1 Timoteo', 6],
    ['2TI', '2 Timoteo', 4], ['TIT', 'Tito', 3], ['PHM', 'Filemón', 1], ['HEB', 'Hebreos', 13], ['JAS', 'Santiago', 5],
    ['1PE', '1 Pedro', 5], ['2PE', '2 Pedro', 3], ['1JN', '1 Juan', 5], ['2JN', '2 Juan', 1], ['3JN', '3 Juan', 1],
    ['JUD', 'Judas', 1], ['REV', 'Apocalipsis', 22]
  ];
  var TODOS = AT.concat(NT), POR_COD = {};
  TODOS.forEach(function (l) { POR_COD[l[0]] = l; });
  var CLAVE = 'biblia-ultimo';

  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function enlace(cod, cap) { return 'https://www.bible.com/es/bible/149/' + cod + '.' + cap + '.RVR1960'; }
  function codigo(nombre) { var n = norm(nombre), l = TODOS.filter(function (x) { return norm(x[1]) === n; })[0]; return l ? l[0] : null; }
  function ultimo() { var u = D.leerJSON(CLAVE, null); return u && POR_COD[u.cod] && u.cap >= 1 && u.cap <= POR_COD[u.cod][2] ? u : null; }
  function recordar(cod, cap) { D.guardarJSON(CLAVE, { cod: cod, cap: +cap }); resumen(); }
  function nombreCap(u) { return POR_COD[u.cod][1] + ' ' + u.cap; }

  /* Tarjeta de acceso en Estudio */
  function resumen() {
    var u = ultimo();
    $('bibliaResumen').textContent = u ? 'Seguir leyendo: ' + nombreCap(u) : 'Elige un libro y un capítulo';
  }

  var vista = { testamento: 'nt', libro: null, filtro: '' };
  function abrir() {
    var cuerpo = U.abrirHoja('Biblia Reina-Valera 1960', '<div id="bibliaVista"></div>');
    vista.libro = null; vista.filtro = '';
    dibujar(cuerpo);
    U.contarVisita('/biblia', 'Biblia');
  }

  function dibujar(cuerpo) {
    var cont = cuerpo.querySelector('#bibliaVista'), u = ultimo(), html = '';
    if (vista.libro) {
      var l = POR_COD[vista.libro];
      html += '<button class="enlace biblia-volver" type="button" id="bibliaVolver">' + ic('izquierda') + 'Todos los libros</button>' +
        '<h3 class="biblia-libro">' + esc(l[1]) + '</h3><p class="muted">Elige un capítulo · ' + l[2] + (l[2] === 1 ? ' capítulo' : ' capítulos') + '</p>' +
        '<div class="biblia-caps">';
      for (var c = 1; c <= l[2]; c++) {
        var actual = u && u.cod === l[0] && u.cap === c;
        html += '<a class="biblia-cap' + (actual ? ' actual' : '') + '" href="' + enlace(l[0], c) + '" target="_blank" rel="noopener" data-cod="' + l[0] + '" data-cap="' + c + '"' + (actual ? ' aria-current="true"' : '') + '>' + c + '</a>';
      }
      html += '</div>';
    } else {
      if (u) html += '<a class="tarjeta biblia-seguir" href="' + enlace(u.cod, u.cap) + '" target="_blank" rel="noopener" data-cod="' + u.cod + '" data-cap="' + u.cap + '">' +
        '<span class="acceso-ic">' + ic('libro') + '</span><span class="acceso-txt"><span class="muted">Seguir leyendo</span><b>' + esc(nombreCap(u)) + '</b></span>' + ic('externo') + '</a>';
      html += '<input class="entrada" id="bibliaBuscar" type="search" placeholder="Buscar libro (ej. Juan, Salmos)" autocomplete="off" enterkeyhint="search" value="' + esc(vista.filtro) + '" aria-label="Buscar libro">';
      if (!vista.filtro) html += '<div class="segmentos biblia-seg" role="tablist" aria-label="Testamento">' +
        '<button type="button" role="tab" data-t="at" aria-selected="' + (vista.testamento === 'at') + '">Antiguo Testamento</button>' +
        '<button type="button" role="tab" data-t="nt" aria-selected="' + (vista.testamento === 'nt') + '">Nuevo Testamento</button></div>';
      var lista = vista.filtro ? TODOS.filter(function (x) { return norm(x[1]).indexOf(norm(vista.filtro)) !== -1; }) : (vista.testamento === 'at' ? AT : NT);
      html += lista.length ? '<div class="biblia-libros">' + lista.map(function (x) {
        return '<button type="button" class="biblia-lib" data-libro="' + x[0] + '"><b>' + esc(x[1]) + '</b><small>' + x[2] + ' cap.</small></button>';
      }).join('') + '</div>' : '<p class="muted" style="margin-top:16px">No se encontró ese libro.</p>';
    }
    html += '<p class="mini muted biblia-nota">Texto: Reina-Valera 1960 © Sociedades Bíblicas Unidas. Se abre en YouVersion (Bible.com).</p>';
    cont.innerHTML = html;

    cont.querySelectorAll('[data-cap]').forEach(function (a) { a.addEventListener('click', function () { recordar(a.dataset.cod, a.dataset.cap); }); });
    cont.querySelectorAll('[data-libro]').forEach(function (b) {
      b.onclick = function () { vista.libro = b.dataset.libro; dibujar(cuerpo); cuerpo.closest('.hoja-cuerpo') && (cuerpo.closest('.hoja-cuerpo').scrollTop = 0); var p = cont.querySelector('.biblia-cap'); if (p) p.focus({ preventScroll: true }); };
    });
    cont.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { vista.testamento = b.dataset.t; dibujar(cuerpo); cont.querySelector('[data-t="' + vista.testamento + '"]').focus(); }; });
    var volver = cont.querySelector('#bibliaVolver');
    if (volver) volver.onclick = function () { var antes = vista.libro; vista.libro = null; vista.testamento = AT.some(function (x) { return x[0] === antes; }) ? 'at' : 'nt'; dibujar(cuerpo); var b = cont.querySelector('[data-libro="' + antes + '"]'); if (b) b.focus(); };
    var buscar = cont.querySelector('#bibliaBuscar');
    if (buscar) buscar.oninput = function () {
      vista.filtro = buscar.value; var pos = buscar.selectionStart; dibujar(cuerpo);
      var n = cont.querySelector('#bibliaBuscar'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* algunos navegadores */ }
    };
  }

  $('abrirBiblia').addEventListener('click', abrir);
  resumen();
  window.Biblia = { enlace: enlace, codigo: codigo, recordar: recordar, libros: TODOS };
})();
