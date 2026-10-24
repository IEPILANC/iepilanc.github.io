// Recordatorios automáticos al celular (OneSignal) para los cultos y actividades del día.
//   node herramientas/recordatorios.mjs            → muestra lo que se enviaría hoy (no envía nada)
//   node herramientas/recordatorios.mjs enviar     → programa los avisos de hoy en OneSignal
// La acción de GitHub lo ejecuta cada mañana. Necesita el secreto ONESIGNAL_REST_KEY.
// Cada aviso lleva una clave única: si la acción corre dos veces, OneSignal no lo repite.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const A = require('../js/agenda-datos.js');

export const APP_ID = 'b9ae65d6-0239-4602-80a7-c878f4059134';
export const ZONA = 'America/Santiago';
export const AJUSTES = {
  horasAntes: 2,          // con hora: el aviso sale 2 horas antes
  horaSinHora: '09:00',   // actividades sin hora: aviso a las 9:00 de ese día
  base: 'https://iepilanc.github.io/'
};

/* Diferencia horaria de Santiago (en minutos) para una fecha y hora local; considera el horario de verano. */
export function desfase(fecha, hora) {
  const [y, m, d] = fecha.split('-').map(Number), [h, mi] = hora.split(':').map(Number);
  const supuesto = Date.UTC(y, m - 1, d, h, mi);
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(supuesto)).map(p => [p.type, p.value]));
  const visto = Date.UTC(+partes.year, +partes.month - 1, +partes.day, +partes.hour, +partes.minute);
  return (visto - supuesto) / 60000;
}
/* Instante real (Date) de una fecha y hora en Santiago */
export function instante(fecha, hora) {
  const [y, m, d] = fecha.split('-').map(Number), [h, mi] = hora.split(':').map(Number);
  const aprox = Date.UTC(y, m - 1, d, h, mi);
  let t = aprox - desfase(fecha, hora) * 60000;
  return new Date(t);
}
/* Fecha de hoy en Santiago (AAAA-MM-DD) */
export function hoyEnSantiago(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}
function clave(texto) {
  const h = createHash('sha256').update(texto).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/* Arma la lista de avisos para el día "fecha". No envía nada. */
export function planDelDia(agenda, fecha, ahora = new Date(), ajustes = AJUSTES) {
  const lista = A.expandir(agenda, fecha, fecha)
    .filter(o => o.fecha === fecha && o.estado !== 'cancelada' && o.estado !== 'borrador');
  const avisos = [];
  for (const o of lista) {
    const empieza = o.hora ? instante(fecha, o.hora) : null;
    if (empieza && empieza <= ahora) continue;                       // ya comenzó: no se avisa
    let envio = o.hora ? new Date(empieza.getTime() - ajustes.horasAntes * 3600000) : instante(fecha, ajustes.horaSinHora);
    if (envio < ahora) envio = ahora;                                 // la acción corrió tarde: se envía de inmediato
    const lugar = o.lugar ? o.lugar.nombre : null;
    let titulo, mensaje;
    if (o.tipo === 'culto') {
      titulo = /^culto/i.test(o.titulo) ? `Hoy hay ${o.titulo.toLowerCase()} · ${o.hora} hrs` : `Hoy: ${o.titulo} · ${o.hora} hrs`;
      const partes = [];
      if (o.predicador) partes.push(`Predica: ${o.predicador}`);
      if (o.coordinador) partes.push(`Coordina: ${o.coordinador}`);
      if (o.a_cargo) partes.push(`A cargo: ${o.a_cargo}`);
      mensaje = (partes.length ? partes.join(' · ') + '. ' : '') + `Te esperamos${lugar ? ' en el ' + lugar.replace(/^Templo.*/, 'templo') : ''}. ¡Dios te bendiga!`;
    } else {
      titulo = `Hoy: ${o.titulo}${o.hora ? ' · ' + o.hora + ' hrs' : ''}`;
      const partes = [];
      if (lugar) partes.push(lugar);
      if (o.expositor) partes.push(`Expone: ${o.expositor}`);
      if (o.indicaciones) partes.push(o.indicaciones);
      mensaje = (partes.length ? partes.join(' · ').replace(/\.$/, '') + '. ' : '') + 'Toca para ver el detalle en la agenda.';
    }
    if (o.estado === 'reprogramada') titulo = 'Reprogramado · ' + titulo;
    avisos.push({
      id: o.id, envio, titulo, mensaje,
      url: `${ajustes.base}?evento=${encodeURIComponent(o.id)}`,
      clave: clave(`${APP_ID}|${o.id}|${fecha}|${o.hora || ''}`)
    });
  }
  return avisos;
}

export function cuerpoOneSignal(a) {
  return {
    app_id: APP_ID,
    target_channel: 'push',
    included_segments: ['Total Subscriptions'],
    headings: { en: a.titulo, es: a.titulo },
    contents: { en: a.mensaje, es: a.mensaje },
    web_url: a.url,
    send_after: a.envio.toISOString(),
    idempotency_key: a.clave,
    ttl: 6 * 3600
  };
}

async function main() {
  const enviar = process.argv[2] === 'enviar';
  const agenda = JSON.parse(readFileSync(new URL('../agenda.json', import.meta.url), 'utf8'));
  const ahora = new Date(), fecha = process.env.FECHA || hoyEnSantiago(ahora);
  const avisos = process.env.PRUEBA === 'true'
    ? [{ id: 'prueba', envio: ahora, titulo: 'IEPI LAN-C', mensaje: 'Prueba: los recordatorios automáticos están funcionando. ¡Dios te bendiga!', url: AJUSTES.base, clave: randomUUID() }]
    : planDelDia(agenda, fecha, ahora);
  const hora = d => new Intl.DateTimeFormat('es-CL', { timeZone: ZONA, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(d);
  console.log(`Recordatorios para ${fecha}: ${avisos.length}`);
  avisos.forEach(a => console.log(`  ${hora(a.envio)} → ${a.titulo} | ${a.mensaje}`));
  if (!enviar || !avisos.length) return;
  const llave = process.env.ONESIGNAL_REST_KEY;
  if (!llave) { console.log('::warning::Falta el secreto ONESIGNAL_REST_KEY; no se envió nada.'); return; }
  let fallas = 0;
  for (const a of avisos) {
    const r = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${llave}` },
      body: JSON.stringify(cuerpoOneSignal(a))
    });
    const texto = await r.text();
    if (!r.ok) { fallas++; console.log(`::error::No se pudo programar "${a.titulo}" (${r.status}): ${texto}`); }
    else console.log(`  programado: ${a.titulo}`);
  }
  if (fallas) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
