// Pruebas automáticas de la lógica de la agenda: node --test pruebas/agenda.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../js/agenda-datos.js');
const real = require('../agenda.json');

const base = () => ({
  categorias: [{ id: 'cultos', nombre: 'Cultos generales' }, { id: 'reuniones', nombre: 'Reuniones' }, { id: 'coro', nombre: 'Coro' }],
  lugares: [{ id: 'templo', nombre: 'Templo' }, { id: 'salon', nombre: 'Salón' }],
  cultos_regulares: [{ id: 'culto-jueves', titulo: 'Culto', categoria: 'cultos', dia: 'Jueves', hora: '19:30', lugar: 'templo' }],
  asignaciones_cultos: [], excepciones_cultos: [], actividades: []
});

test('los datos reales de la agenda son válidos', () => {
  const v = A.validar(real);
  assert.deepEqual(v.errores, []);
});

test('crear y publicar: la actividad aparece en el rango', () => {
  const ag = base();
  ag.actividades.push({ id: 'x', titulo: 'Reunión', categoria: 'reuniones', inicio: '2026-11-04T19:00', fin: '2026-11-04T21:00', lugar: 'salon', estado: 'publicada' });
  const l = A.expandir(ag, '2026-11-01', '2026-11-30');
  assert.ok(l.some(o => o.id === 'x' && o.hora === '19:00' && o.horaFin === '21:00'));
  assert.ok(A.porDia(l)['2026-11-04'].some(o => o.id === 'x'));
});

test('los borradores no se muestran', () => {
  const ag = base();
  ag.actividades.push({ id: 'b', titulo: 'Borrador', categoria: 'reuniones', inicio: '2026-11-04', estado: 'borrador' });
  assert.equal(A.expandir(ag, '2026-11-01', '2026-11-30').filter(o => o.id === 'b').length, 0);
});

test('editar el horario se refleja', () => {
  const ag = base();
  ag.actividades.push({ id: 'x', titulo: 'Ensayo', categoria: 'coro', inicio: '2026-11-05T18:00', estado: 'publicada' });
  ag.actividades[0].inicio = '2026-11-05T17:00';
  assert.equal(A.buscar(ag, 'x', '2026-01-01', '2026-12-31').hora, '17:00');
});

test('cancelar un culto regular con una excepción', () => {
  const ag = base();
  ag.excepciones_cultos.push({ culto: 'culto-jueves', fecha: '2026-11-05', estado: 'cancelada', motivo: 'Por la convención' });
  const o = A.buscar(ag, 'culto-jueves-2026-11-05');
  assert.equal(o.estado, 'cancelada');
  assert.equal(o.nota_cambio, 'Por la convención');
});

test('conflicto de lugar cuando se superponen en el mismo espacio', () => {
  const ag = base();
  ag.actividades.push({ id: 'r', titulo: 'Reunión', categoria: 'reuniones', inicio: '2026-11-05T19:00', fin: '2026-11-05T20:30', lugar: 'templo', estado: 'publicada' });
  ag.cultos_regulares[0].hora_fin = '21:30';
  const c = A.conflictos(ag, '2026-11-01', '2026-11-30');
  assert.ok(c.some(x => x.tipo === 'lugar' && x.nivel === 'seguro'));
});

test('sin conflicto si no hay información de lugar compartido', () => {
  const ag = base();
  ag.actividades.push({ id: 'r', titulo: 'Reunión', categoria: 'reuniones', inicio: '2026-11-05T19:30', estado: 'publicada' });
  const c = A.conflictos(ag, '2026-11-01', '2026-11-30');
  assert.equal(c.filter(x => x.tipo === 'lugar').length, 0);
});

test('conflicto de persona con asignaciones incompatibles', () => {
  const ag = base();
  ag.asignaciones_cultos.push({ fecha: '2026-11-05', hora: '19:30', coordinador: 'Rosa Vega', predicador: 'Alfonso Reyes' });
  ag.actividades.push({ id: 'e', titulo: 'Ensayo', categoria: 'coro', inicio: '2026-11-05T19:30', lugar: 'salon', coordinador: 'Rosa Vega', estado: 'publicada' });
  const c = A.conflictos(ag, '2026-11-01', '2026-11-30');
  assert.ok(c.some(x => x.tipo === 'persona' && x.detalle === 'Rosa Vega'));
});

test('una actividad cancelada no genera conflictos', () => {
  const ag = base();
  ag.actividades.push({ id: 'r', titulo: 'Reunión', categoria: 'reuniones', inicio: '2026-11-05T19:30', lugar: 'templo', estado: 'cancelada' });
  assert.equal(A.conflictos(ag, '2026-11-01', '2026-11-30').length, 0);
});

test('la validación detecta errores', () => {
  const ag = base();
  ag.actividades.push({ id: 'a', titulo: 'A', categoria: 'inexistente', inicio: '2026-13-40', estado: 'publicada' }, { id: 'a', categoria: 'coro', inicio: '2026-11-05T20:00', fin: '2026-11-05T19:00' });
  const v = A.validar(ag);
  assert.ok(v.errores.length >= 4);
});

test('el calendario .ics es correcto', () => {
  const ag = base();
  ag.actividades.push({ id: 'x', titulo: 'Reunión; especial', categoria: 'reuniones', inicio: '2026-11-04T19:00', estado: 'cancelada' });
  const t = A.ics(A.expandir(ag, '2026-11-01', '2026-11-07'), A.indices(ag).categorias, { ahora: '20261010T000000Z', alarmaMin: 60 });
  assert.match(t, /BEGIN:VCALENDAR\r\n/);
  assert.match(t, /DTSTART;TZID=America\/Santiago:20261104T190000/);
  assert.ok(t.includes('SUMMARY:CANCELADA: Reunión' + String.fromCharCode(92) + '; especial'));
  assert.match(t, /STATUS:CANCELLED/);
  assert.ok(t.split('\r\n').every(l => l.length <= 75));
});
