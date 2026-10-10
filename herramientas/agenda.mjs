// Herramienta de la Agenda congregacional IEPI LAN-C
//   node herramientas/agenda.mjs revisar   → valida agenda.json y avisa conflictos
//   node herramientas/agenda.mjs ics       → genera agenda.ics (calendario para suscribirse)
// Los conflictos son advertencias: no bloquean la publicación.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../js/agenda-datos.js');

const RAIZ = new URL('..', import.meta.url);
const agenda = JSON.parse(readFileSync(new URL('agenda.json', RAIZ), 'utf8'));
const enGitHub = !!process.env.GITHUB_ACTIONS;
const hoy = A.isoDia(new Date());
const desde = A.sumarDias(hoy, -14), hasta = A.sumarDias(hoy, 270);

function avisar(nivel, msg) { console.log(enGitHub ? `::${nivel} file=agenda.json::${msg}` : `${nivel === 'error' ? '✖' : '⚠'} ${msg}`); }
function fmt(o) { return `${o.titulo} (${o.fecha}${o.hora ? ' ' + o.hora : ''}${o.horaFin ? '–' + o.horaFin : ''})`; }

function revisar() {
  const v = A.validar(agenda);
  v.errores.forEach(m => avisar('error', m));
  v.avisos.forEach(m => avisar('warning', m));
  const c = A.conflictos(agenda, desde, hasta);
  c.forEach(x => {
    const que = x.tipo === 'lugar' ? `el mismo lugar (${x.detalle})` : `la misma persona (${x.detalle})`;
    const cuanto = x.nivel === 'seguro' ? 'se superponen' : 'empiezan a la misma hora (falta hora de término para confirmar)';
    avisar('warning', `Posible conflicto: ${fmt(x.a)} y ${fmt(x.b)} ${cuanto} y usan ${que}. Revisa si corresponde.`);
  });
  console.log(`Revisión: ${v.errores.length} errores, ${v.avisos.length} avisos, ${c.length} conflictos posibles.`);
  return v.errores.length === 0;
}

function generarIcs() {
  const lista = A.expandir(agenda, desde, hasta);
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const texto = A.ics(lista, A.indices(agenda).categorias, { ahora, base: 'https://iepilanc.github.io/', nombre: 'Agenda IEPI LAN-C' });
  const archivo = new URL('agenda.ics', RAIZ);
  const anterior = (() => { try { return readFileSync(archivo, 'utf8'); } catch { return ''; } })();
  const sinSello = t => t.replace(/^DTSTAMP:.*$/gm, '');
  if (sinSello(anterior) === sinSello(texto)) { console.log('agenda.ics ya estaba al día.'); return; }
  writeFileSync(archivo, texto);
  console.log(`agenda.ics actualizado: ${lista.length} eventos (${desde} a ${hasta}).`);
}

const orden = process.argv[2] || 'revisar';
if (orden === 'revisar') process.exit(revisar() ? 0 : 1);
else if (orden === 'ics') { if (!revisar()) process.exit(1); generarIcs(); }
else { console.log('Uso: node herramientas/agenda.mjs [revisar|ics]'); process.exit(2); }
