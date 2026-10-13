// Pruebas de los recordatorios automáticos: node --test pruebas/recordatorios.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as R from '../herramientas/recordatorios.mjs';
const require = createRequire(import.meta.url);
const real = require('../agenda.json');

const base = () => ({
  categorias: [{ id: 'cultos', nombre: 'Cultos' }, { id: 'reuniones', nombre: 'Reuniones' }],
  lugares: [{ id: 'templo', nombre: 'Templo IEPI LAN-C' }],
  cultos_regulares: [{ id: 'culto-jueves', titulo: 'Culto', categoria: 'cultos', dia: 'Jueves', hora: '19:30', lugar: 'templo' }],
  asignaciones_cultos: [{ fecha: '2026-10-15', coordinador: 'Hna. A', predicador: 'Hno. B' }],
  excepciones_cultos: [], actividades: []
});
const temprano = new Date('2026-10-15T09:00:00Z');

test('hora de Santiago con y sin horario de verano', () => {
  assert.equal(R.instante('2026-10-15', '19:30').toISOString(), '2026-10-15T22:30:00.000Z');
  assert.equal(R.instante('2026-07-16', '19:30').toISOString(), '2026-07-16T23:30:00.000Z');
});
test('culto: aviso 2 horas antes con predicador y coordinador', () => {
  const [a] = R.planDelDia(base(), '2026-10-15', temprano);
  assert.equal(a.envio.toISOString(), '2026-10-15T20:30:00.000Z');
  assert.match(a.titulo, /culto · 19:30/);
  assert.match(a.mensaje, /Predica: Hno\. B · Dirige: Hna\. A/);
  assert.match(a.url, /\?evento=/);
});
test('culto cancelado no se avisa', () => {
  const ag = base(); ag.excepciones_cultos = [{ fecha: '2026-10-15', regular: 'culto-jueves', estado: 'cancelada', motivo: 'x' }];
  assert.equal(R.planDelDia(ag, '2026-10-15', temprano).length, 0);
});
test('si ya comenzó no se avisa; si la acción corrió tarde, sale de inmediato', () => {
  assert.equal(R.planDelDia(base(), '2026-10-15', new Date('2026-10-15T23:00:00Z')).length, 0);
  const ahora = new Date('2026-10-15T21:00:00Z');
  assert.equal(R.planDelDia(base(), '2026-10-15', ahora)[0].envio.getTime(), ahora.getTime());
});
test('la clave es la misma si se ejecuta dos veces (no hay avisos repetidos)', () => {
  const a = R.planDelDia(base(), '2026-10-15', temprano)[0], b = R.planDelDia(base(), '2026-10-15', new Date('2026-10-15T12:00:00Z'))[0];
  assert.equal(a.clave, b.clave);
  assert.match(a.clave, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('actividad sin hora: aviso a las 9:00; borradores no se avisan', () => {
  const ag = base();
  ag.actividades = [{ id: 'x', titulo: 'Ensayo', categoria: 'reuniones', inicio: '2026-10-16' }, { id: 'y', titulo: 'Borrador', categoria: 'reuniones', inicio: '2026-10-16', estado: 'borrador' }];
  const p = R.planDelDia(ag, '2026-10-16', temprano);
  assert.equal(p.length, 1);
  assert.equal(p[0].envio.toISOString(), '2026-10-16T12:00:00.000Z');
});
test('la agenda real genera avisos válidos para OneSignal', () => {
  const p = R.planDelDia(real, '2026-10-18', new Date('2026-10-18T09:00:00Z'));
  assert.ok(p.length >= 1);
  const c = R.cuerpoOneSignal(p[0]);
  assert.equal(c.app_id, R.APP_ID);
  assert.ok(c.contents.en && c.headings.en && c.idempotency_key && c.send_after);
});
