/* =========================================================
   IEPI LAN-C · Chat de la iglesia (Firebase Firestore)
   - Solo para hermanos registrados en la app (mismo nombre y código).
   - General y Oración: abiertos. Jóvenes, Coro y Dorcas: con aprobación.
   - El administrador aprueba solicitudes, revisa reportes, borra mensajes
     y bloquea. Los administradores se agregan desde la consola de Firebase
     (colección "admins", documento = identificador del teléfono).
   ========================================================= */
/* Firebase se carga aparte (es pesado): la pantalla y el cuadro de escribir aparecen antes */
let initializeApp, getAuth, signInAnonymously, onAuthStateChanged,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, query, orderBy, limitToLast, where, onSnapshot, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove;
const cargaFirebase = import('./firebase-chat.js?v=1').then((F) => {
  ({ initializeApp, getAuth, signInAnonymously, onAuthStateChanged,
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
    collection, doc, query, orderBy, limitToLast, where, onSnapshot, addDoc, setDoc, getDoc, getDocs,
    updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove } = F);
});

const VERSION = 6;   // súbelo junto con chat/version.json en cada cambio

const CONFIG = {
  apiKey: 'AIzaSyBz1npgxLp4CLcJYHJSmFUUTJ3UrdO8bno',
  authDomain: 'iepi-lanc-chat.firebaseapp.com',
  projectId: 'iepi-lanc-chat',
  storageBucket: 'iepi-lanc-chat.firebasestorage.app',
  messagingSenderId: '169341097532',
  appId: '1:169341097532:web:47e2ea5ea7708b1d22d539'
};

const GRUPOS = [
  { id: 'general', nombre: 'General', abierto: true, fijado: ['Normas del chat', 'Escribimos con respeto y amor fraternal. Solo hermanos registrados con su nombre real. Los mensajes fuera de lugar se borran.'] },
  { id: 'oracion', nombre: 'Oración', abierto: true, fijado: ['Oremos unos por otros', 'Comparte tu motivo y los hermanos te acompañan en oración. Para algo privado, usa la sección Oración de la app.'] },
  { id: 'jovenes', nombre: 'Jóvenes', abierto: false, fijado: ['Grupo de jóvenes', 'Grupo cerrado: entran los jóvenes aprobados por el encargado.'] },
  { id: 'coro', nombre: 'Coro', abierto: false, fijado: ['Coro', 'Grupo cerrado: entran los integrantes del coro aprobados por el encargado.'] },
  { id: 'dorcas', nombre: 'Dorcas', abierto: false, fijado: ['Dorcas', 'Grupo cerrado: entran las hermanas de Dorcas aprobadas por la encargada.'] }
];
const REACC = [['orar', '🙏'], ['gracias', '🙌'], ['amor', '❤️'], ['bien', '👍'], ['fuego', '🔥']];
const COLORES = ['#17294B', '#8A6A24', '#2F7A52', '#7C3A8C', '#B4532A', '#2563A8'];
const WSP = 'https://wa.me/56956339029?text=' + encodeURIComponent('Hola, le escribo por el chat de la app IEPI LAN-C.');

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IC = {
  candado: '<svg class="ic candado" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  pin: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
  responder: '<svg class="ic" viewBox="0 0 24 24"><path d="m9 17-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  reportar: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 8 2a6 6 0 0 0 3.6-1.2A1 1 0 0 1 20 3.6V15a1 1 0 0 1-.4.8A6 6 0 0 1 16 17c-3 0-5-2-8-2a6 6 0 0 0-4 1.5"/></svg>',
  borrar: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  bloquear: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>',
  copiar: '<svg class="ic" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  chat: '<svg class="ic" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>'
};

function guardado(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
function iniciales(n) { return n.replace(/^Hn[oa]s?\.\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'; }
function color(n) { let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return COLORES[h % COLORES.length]; }
function hora(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function etiquetaDia(d) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const n = Math.round((hoy - x) / 864e5);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Ayer';
  return DIAS[x.getDay()][0].toUpperCase() + DIAS[x.getDay()].slice(1) + ' ' + x.getDate() + ' de ' + MESES[x.getMonth()];
}
function toast(t) { const p = document.createElement('p'); p.className = 'toast'; p.setAttribute('role', 'status'); p.textContent = t; document.body.appendChild(p); setTimeout(() => p.remove(), 2800); }

/* ---------- Pantallas de estado ---------- */
function mostrarEstado(html) {
  $('estado').innerHTML = html; $('estado').hidden = false;
  $('mensajes').hidden = true; $('fijado').hidden = true; $('form').hidden = true; $('respondiendo').hidden = true;
}
function estadoSimple(icono, titulo, texto, botones) {
  mostrarEstado('<div class="ic-grande">' + icono + '</div><h2>' + esc(titulo) + '</h2><p>' + texto + '</p>' + (botones || ''));
}

/* ---------- Registro de la app ---------- */
let registro = null;
try { registro = JSON.parse(guardado('registro') || 'null'); } catch (e) { registro = null; }
const nombre = registro && typeof registro.nombre === 'string' ? registro.nombre.trim().slice(0, 60) : '';
const codigo = registro && typeof registro.codigo === 'string' ? registro.codigo.slice(0, 12) : '';

/* ---------- Estado ---------- */
let db, auth, yo = null, soyAdmin = false;
let actual = guardado('chat-grupo') || 'general';
if (!GRUPOS.some((g) => g.id === actual)) actual = 'general';
const acceso = {};          // grupo → 'abierto' | 'aprobado' | 'pendiente' | 'no'
let quitarMensajes = null, mensajes = [], respondiendoA = null;
const quitarAdmin = [];

function grupo(id) { return GRUPOS.find((g) => g.id === id); }
function puedeLeer(id) { return soyAdmin || acceso[id] === 'abierto' || acceso[id] === 'aprobado'; }

/* ---------- Grupos (chips) ---------- */
function dibujarCanales() {
  $('canales').innerHTML = GRUPOS.map((g) => {
    const cerrado = !g.abierto && !puedeLeer(g.id);
    const nuevos = g.id !== actual && puedeLeer(g.id) && hayNuevos[g.id];
    return '<button type="button" class="canal" data-canal="' + g.id + '" aria-pressed="' + (g.id === actual) + '">' + (cerrado ? IC.candado : '') + esc(g.nombre) + (nuevos ? '<span class="n" aria-label="mensajes nuevos">•</span>' : '') + '</button>';
  }).join('');
  $('canales').querySelectorAll('[data-canal]').forEach((b) => { b.onclick = () => abrirGrupo(b.dataset.canal); });
  const sel = $('canales').querySelector('[aria-pressed="true"]');
  if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ---------- Mensajes nuevos por grupo ---------- */
const hayNuevos = {};
function visto(id, t) { guardado('chat-visto-' + id, String(t || Date.now())); }
async function revisarNuevos() {
  for (const g of GRUPOS) {
    if (!puedeLeer(g.id) || g.id === actual) continue;
    try {
      const s = await getDocs(query(collection(db, 'grupos', g.id, 'mensajes'), orderBy('creado'), limitToLast(1)));
      const m = s.docs[0] && s.docs[0].data();
      const t = m && m.creado && m.creado.toMillis ? m.creado.toMillis() : 0;
      hayNuevos[g.id] = t > +(guardado('chat-visto-' + g.id) || 0) && m.uid !== yo;
    } catch (e) { /* sin permiso o sin conexión */ }
  }
  dibujarCanales();
}

/* ---------- Copia local de los últimos mensajes (para abrir al instante) ---------- */
function guardarCopia(id) {
  try {
    const lista = mensajes.slice(-40).map((m) => ({ id: m.id, uid: m.uid, nombre: m.nombre, texto: m.texto, rol: m.rol, respuesta: m.respuesta, reacciones: m.reacciones, t: m.creado && m.creado.toMillis ? m.creado.toMillis() : Date.now() }));
    localStorage.setItem('chat-copia-' + id, JSON.stringify(lista));
  } catch (e) { /* sin espacio: no pasa nada */ }
}
function leerCopia(id) {
  try {
    return (JSON.parse(localStorage.getItem('chat-copia-' + id) || '[]') || []).map((m) => {
      const d = new Date(m.t); return Object.assign({}, m, { creado: { toDate: () => d, toMillis: () => m.t } });
    });
  } catch (e) { return []; }
}
function borrarCopias() { GRUPOS.forEach((g) => { try { localStorage.removeItem('chat-copia-' + g.id); } catch (e) { /* nada */ } }); }

/* Vista inmediata, antes de conectar: grupos, normas, últimos mensajes y el cuadro de escribir */
function vistaInicial() {
  GRUPOS.forEach((g) => { acceso[g.id] = g.abierto ? 'abierto' : (guardado('chat-acceso-' + g.id) || 'no'); });
  yo = guardado('chat-miembro') || null;
  soyAdmin = !!yo && guardado('chat-admin') === yo;
  if (!grupo(actual).abierto && !puedeLeer(actual)) actual = 'general';
  dibujarCanales();
  const g = grupo(actual);
  $('fijado').innerHTML = IC.pin + '<div><b>' + esc(g.fijado[0]) + '</b>' + esc(g.fijado[1]) + '</div>';
  $('estado').hidden = true; $('fijado').hidden = false; $('mensajes').hidden = false; $('form').hidden = false;
  mensajes = leerCopia(actual);
  if (mensajes.length) dibujarMensajes(); else $('mensajes').innerHTML = '<p class="dia">Conectando…</p>';
}

/* ---------- Abrir un grupo ---------- */
function abrirGrupo(id) {
  if (quitarMensajes) { quitarMensajes(); quitarMensajes = null; }
  actual = id; guardado('chat-grupo', id); hayNuevos[id] = false;
  cancelarRespuesta();
  dibujarCanales();
  const g = grupo(id);
  $('fijado').innerHTML = IC.pin + '<div><b>' + esc(g.fijado[0]) + '</b>' + esc(g.fijado[1]) + '</div>';
  if (!puedeLeer(id)) { pantallaCerrada(g); return; }
  $('estado').hidden = true; $('fijado').hidden = false; $('mensajes').hidden = false; $('form').hidden = false;
  const copia = leerCopia(id);
  if (copia.length) { mensajes = copia; delete $('mensajes').dataset.listo; dibujarMensajes(); }
  else $('mensajes').innerHTML = '<p class="dia">Cargando mensajes…</p>';
  const q = query(collection(db, 'grupos', id, 'mensajes'), orderBy('creado'), limitToLast(60));
  quitarMensajes = onSnapshot(q, (s) => {
    mensajes = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    dibujarMensajes();
    guardarCopia(id);
    visto(id);
  }, (e) => {
    console.warn(e);
    if (e.code === 'permission-denied') { acceso[id] = g.abierto ? 'abierto' : 'no'; comprobarBloqueo(); }
    else mostrarEstado('<h2>Sin conexión</h2><p>No pudimos cargar los mensajes. Revisa tu internet e inténtalo otra vez.</p><button class="btn" type="button" onclick="location.reload()">Reintentar</button>');
  });
}

function pantallaCerrada(g) {
  const est = acceso[g.id];
  if (est === 'pendiente') {
    estadoSimple(IC.candado, g.nombre + ': solicitud enviada', 'Tu solicitud para entrar está esperando la aprobación del encargado. Cuando te aprueben, podrás ver y escribir mensajes aquí.',
      '<button class="btn btn-sec" type="button" id="cancelarSol">Cancelar solicitud</button>');
    $('cancelarSol').onclick = async () => {
      try { await deleteDoc(doc(db, 'grupos', g.id, 'miembros', yo)); acceso[g.id] = 'no'; pantallaCerrada(g); dibujarCanales(); }
      catch (e) { toast('No se pudo cancelar. Inténtalo otra vez.'); }
    };
    return;
  }
  estadoSimple(IC.candado, 'Grupo ' + g.nombre, 'Este grupo es cerrado. Puedes pedir entrar y el encargado revisará tu solicitud.',
    '<button class="btn" type="button" id="pedirEntrar">Pedir entrar</button>');
  $('pedirEntrar').onclick = async (ev) => {
    ev.target.disabled = true;
    try {
      await setDoc(doc(db, 'grupos', g.id, 'miembros', yo), { nombre, estado: 'pendiente', creado: serverTimestamp() });
      acceso[g.id] = 'pendiente'; pantallaCerrada(g); toast('Solicitud enviada');
    } catch (e) { console.warn(e); ev.target.disabled = false; toast('No se pudo enviar la solicitud.'); }
  };
}

/* ---------- Dibujar mensajes ---------- */
function dibujarMensajes() {
  const caja = $('mensajes');
  const abajo = caja.scrollHeight - caja.scrollTop - caja.clientHeight < 80;
  let previo = null, dia = null, html = '';
  if (!mensajes.length) html = '<p class="dia">Aún no hay mensajes. ¡Escribe el primero!</p>';
  mensajes.forEach((m, i) => {
    const f = m.creado && m.creado.toDate ? m.creado.toDate() : new Date();
    const d = etiquetaDia(f);
    if (d !== dia) { html += '<span class="dia">' + esc(d) + '</span>'; dia = d; previo = null; }
    const mio = m.uid === yo, mismo = previo === m.uid; previo = m.uid;
    const reacc = REACC.map(([k, e]) => {
      const lista = m.reacciones && Array.isArray(m.reacciones[k]) ? m.reacciones[k] : [];
      return lista.length ? '<span class="reacc2' + (lista.includes(yo) ? ' mia' : '') + '">' + e + ' ' + lista.length + '</span>' : '';
    }).join('');
    html += '<div class="msg' + (mio ? ' mio' : '') + (mismo ? ' mismo' : '') + '" data-i="' + i + '">' +
      '<span class="av" style="background:' + color(m.nombre || '') + '" aria-hidden="true">' + esc(iniciales(m.nombre || '?')) + '</span>' +
      '<div class="burbuja"><span class="autor" style="color:' + color(m.nombre || '') + '">' + esc(m.nombre) + (m.rol ? '<span class="rol">' + esc(m.rol) + '</span>' : '') + '</span>' +
      (m.respuesta ? '<span class="resp"><b>' + esc(m.respuesta.nombre) + '</b>' + esc(m.respuesta.texto) + '</span>' : '') +
      esc(m.texto).replace(/\n/g, '<br>') +
      (reacc ? '<span class="reaccs">' + reacc + '</span>' : '') +
      '<span class="hora">' + hora(f) + '</span></div></div>';
  });
  caja.innerHTML = html;
  caja.querySelectorAll('.msg').forEach((el) => { el.onclick = () => menuMensaje(mensajes[+el.dataset.i]); });
  if (abajo || !caja.dataset.listo) { caja.scrollTop = caja.scrollHeight; caja.dataset.listo = '1'; }
}

/* ---------- Hoja inferior (menús) ---------- */
function abrirHoja(html) { $('hojaIn').innerHTML = html; $('hoja').hidden = false; const b = $('hojaIn').querySelector('button'); if (b) b.focus(); }
function cerrarHoja() { $('hoja').hidden = true; }
$('hoja').addEventListener('click', (e) => { if (e.target === $('hoja')) cerrarHoja(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('hoja').hidden) cerrarHoja(); });

function menuMensaje(m) {
  if (!m) return;
  if (!conectado) { toast('Conectando…'); return; }
  const mio = m.uid === yo;
  abrirHoja('<div class="reacciones">' + REACC.map(([k, e]) => '<button type="button" data-r="' + k + '" aria-label="Reaccionar ' + e + '">' + e + '</button>').join('') + '</div>' +
    '<p>' + esc(m.nombre) + ' · ' + hora(m.creado && m.creado.toDate ? m.creado.toDate() : new Date()) + '</p>' +
    '<button type="button" data-acc="responder">' + IC.responder + 'Responder</button>' +
    (!mio ? '<button type="button" data-acc="reportar">' + IC.reportar + 'Reportar al administrador</button>' : '') +
    (mio || soyAdmin ? '<button type="button" data-acc="borrar" class="peligro">' + IC.borrar + 'Borrar mensaje' + (mio ? '' : ' (administrador)') + '</button>' : '') +
    (soyAdmin && !mio ? '<button type="button" data-acc="bloquear" class="peligro">' + IC.bloquear + 'Bloquear a ' + esc(m.nombre) + '</button>' : '') +
    '<button type="button" data-acc="cerrar">Cancelar</button>');
  $('hojaIn').querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { cerrarHoja(); reaccionar(m, b.dataset.r); }; });
  $('hojaIn').querySelectorAll('[data-acc]').forEach((b) => {
    b.onclick = async () => {
      const a = b.dataset.acc; cerrarHoja();
      if (a === 'responder') responder(m);
      if (a === 'reportar') reportar(m);
      if (a === 'borrar') { try { await deleteDoc(doc(db, 'grupos', actual, 'mensajes', m.id)); toast('Mensaje borrado'); } catch (e) { toast('No se pudo borrar.'); } }
      if (a === 'bloquear') bloquear(m.uid, m.nombre);
    };
  });
}

async function reaccionar(m, k) {
  const lista = m.reacciones && Array.isArray(m.reacciones[k]) ? m.reacciones[k] : [];
  try { await updateDoc(doc(db, 'grupos', actual, 'mensajes', m.id), { ['reacciones.' + k]: lista.includes(yo) ? arrayRemove(yo) : arrayUnion(yo) }); }
  catch (e) { console.warn(e); toast('No se pudo reaccionar.'); }
}
async function reportar(m) {
  try {
    await addDoc(collection(db, 'reportes'), { por: yo, porNombre: nombre, grupo: actual, mensaje: m.id, autor: m.nombre || '', autorUid: m.uid || '', texto: String(m.texto || '').slice(0, 500), creado: serverTimestamp() });
    toast('Gracias. El administrador revisará el mensaje.');
  } catch (e) { toast('No se pudo reportar.'); }
}
async function bloquear(uid, quien) {
  try { await setDoc(doc(db, 'bloqueados', uid), { nombre: quien || '', por: yo, fecha: serverTimestamp() }); toast(quien + ' fue bloqueado del chat'); }
  catch (e) { toast('No se pudo bloquear.'); }
}

/* ---------- Responder y enviar ---------- */
function responder(m) {
  respondiendoA = { nombre: String(m.nombre || '').slice(0, 60), texto: String(m.texto || '').slice(0, 120) };
  $('respTxt').innerHTML = 'Respondiendo a <b>' + esc(respondiendoA.nombre) + '</b>: ' + esc(respondiendoA.texto);
  $('respondiendo').hidden = false; $('texto').focus();
}
function cancelarRespuesta() { respondiendoA = null; $('respondiendo').hidden = true; }
$('respCancelar').onclick = cancelarRespuesta;

const ta = $('texto');
let conectado = false;
function ajustar() { $('enviar').disabled = !ta.value.trim() || !conectado; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; }
ta.addEventListener('input', ajustar);
ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(hover: hover)').matches) { e.preventDefault(); $('form').requestSubmit(); } });
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = ta.value.trim().slice(0, 500); if (!t) return;
  if (!conectado) { toast('Conectando… inténtalo en un segundo'); return; }
  const datos = { uid: yo, nombre, texto: t, creado: serverTimestamp() };
  if (soyAdmin) datos.rol = 'Admin';
  if (respondiendoA) datos.respuesta = respondiendoA;
  ta.value = ''; ajustar(); cancelarRespuesta();
  $('mensajes').scrollTop = $('mensajes').scrollHeight;
  try { await addDoc(collection(db, 'grupos', actual, 'mensajes'), datos); }
  catch (err) { console.warn(err); ta.value = t; ajustar(); toast(err && err.code === 'permission-denied' ? 'No tienes permiso para escribir aquí.' : 'No se pudo enviar. Revisa tu conexión.'); }
});

/* ---------- Información ---------- */
$('btnInfo').onclick = () => {
  abrirHoja('<p class="hoja-tit">Chat de la iglesia</p>' +
    '<p>Escribes como <b>' + esc(nombre) + '</b>. General y Oración están abiertos a todos los hermanos registrados; Jóvenes, Coro y Dorcas son grupos cerrados con aprobación.</p>' +
    '<p>Si ves un mensaje fuera de lugar, tócalo y elige «Reportar».</p>' +
    '<p>Versión del chat: <b>' + VERSION + '</b></p>' +
    '<p>Identificador de este teléfono (solo para el administrador):</p>' +
    '<div class="ident"><span id="miId" style="flex:1">' + esc(yo || '—') + '</span></div>' +
    '<button type="button" data-acc="copiar">' + IC.copiar + 'Copiar identificador</button>' +
    '<button type="button" data-acc="cerrar">Cerrar</button>');
  $('hojaIn').querySelector('[data-acc="copiar"]').onclick = async () => {
    try { await navigator.clipboard.writeText(yo); toast('Identificador copiado'); } catch (e) { toast('Mantén presionado el identificador para copiarlo'); }
  };
  $('hojaIn').querySelector('[data-acc="cerrar"]').onclick = cerrarHoja;
};

/* ---------- Panel del administrador ---------- */
const pendientes = {}; let reportes = [];
function contarAdmin() {
  const n = Object.values(pendientes).reduce((a, l) => a + l.length, 0) + reportes.length;
  $('nAdmin').textContent = n; $('nAdmin').hidden = !n;
}
function iniciarAdmin() {
  $('btnAdmin').hidden = false;
  if (quitarAdmin.length) return;   // ya está escuchando
  GRUPOS.filter((g) => !g.abierto).forEach((g) => {
    quitarAdmin.push(onSnapshot(query(collection(db, 'grupos', g.id, 'miembros'), where('estado', '==', 'pendiente')), (s) => {
      pendientes[g.id] = s.docs.map((d) => ({ uid: d.id, ...d.data() })); contarAdmin(); if (!$('hoja').hidden && $('hojaIn').dataset.panel) panelAdmin();
    }, (e) => console.warn(e)));
  });
  quitarAdmin.push(onSnapshot(query(collection(db, 'reportes'), orderBy('creado')), (s) => {
    reportes = s.docs.map((d) => ({ id: d.id, ...d.data() })); contarAdmin(); if (!$('hoja').hidden && $('hojaIn').dataset.panel) panelAdmin();
  }, (e) => console.warn(e)));
}
function panelAdmin() {
  let html = '<p class="hoja-tit">Administrar el chat</p><div class="hoja-lista">';
  GRUPOS.filter((g) => !g.abierto).forEach((g) => {
    const l = pendientes[g.id] || [];
    html += '<h3>Solicitudes · ' + esc(g.nombre) + '</h3>' + (l.length ? l.map((p) =>
      '<div class="item"><div class="item-txt"><b>' + esc(p.nombre) + '</b><small>Quiere entrar a ' + esc(g.nombre) + '</small></div>' +
      '<button class="btn btn-peq" type="button" data-aprobar="' + g.id + '|' + esc(p.uid) + '">Aprobar</button>' +
      '<button class="btn btn-sec btn-peq" type="button" data-rechazar="' + g.id + '|' + esc(p.uid) + '">No</button></div>').join('') : '<p class="vacio">Sin solicitudes.</p>');
  });
  html += '<h3>Mensajes reportados</h3>' + (reportes.length ? reportes.map((r) =>
    '<div class="item"><div class="item-txt"><b>' + esc(r.autor) + ' · ' + esc((grupo(r.grupo) || {}).nombre || r.grupo) + '</b>' + esc(r.texto) + '<br><small>Reportado por ' + esc(r.porNombre) + '</small></div>' +
    '<button class="btn btn-peq" type="button" data-borrarrep="' + esc(r.id) + '" style="background:#B42318;color:#fff">Borrar</button>' +
    '<button class="btn btn-sec btn-peq" type="button" data-descartar="' + esc(r.id) + '">Dejar</button></div>').join('') : '<p class="vacio">No hay reportes.</p>');
  html += '</div><button type="button" data-acc="cerrar">Cerrar</button>';
  abrirHoja(html); $('hojaIn').dataset.panel = '1';
  const h = $('hojaIn');
  h.querySelector('[data-acc="cerrar"]').onclick = cerrarHoja;
  h.querySelectorAll('[data-aprobar]').forEach((b) => { b.onclick = async () => { const [g, uid] = b.dataset.aprobar.split('|'); b.disabled = true; try { await updateDoc(doc(db, 'grupos', g, 'miembros', uid), { estado: 'aprobado', aprobadoPor: nombre }); toast('Aprobado'); } catch (e) { b.disabled = false; toast('No se pudo aprobar.'); } }; });
  h.querySelectorAll('[data-rechazar]').forEach((b) => { b.onclick = async () => { const [g, uid] = b.dataset.rechazar.split('|'); b.disabled = true; try { await deleteDoc(doc(db, 'grupos', g, 'miembros', uid)); toast('Solicitud rechazada'); } catch (e) { b.disabled = false; toast('No se pudo rechazar.'); } }; });
  h.querySelectorAll('[data-borrarrep]').forEach((b) => { b.onclick = async () => {
    const r = reportes.find((x) => x.id === b.dataset.borrarrep); b.disabled = true;
    try { await deleteDoc(doc(db, 'grupos', r.grupo, 'mensajes', r.mensaje)); await deleteDoc(doc(db, 'reportes', r.id)); toast('Mensaje borrado'); } catch (e) { b.disabled = false; toast('No se pudo borrar.'); }
  }; });
  h.querySelectorAll('[data-descartar]').forEach((b) => { b.onclick = async () => { b.disabled = true; try { await deleteDoc(doc(db, 'reportes', b.dataset.descartar)); } catch (e) { b.disabled = false; } }; });
}
$('btnAdmin').onclick = panelAdmin;
$('hoja').addEventListener('click', () => { if ($('hoja').hidden) delete $('hojaIn').dataset.panel; });
const obsHoja = new MutationObserver(() => { if ($('hoja').hidden) delete $('hojaIn').dataset.panel; });
obsHoja.observe($('hoja'), { attributes: true, attributeFilter: ['hidden'] });

/* ---------- Bloqueo ---------- */
function pantallaBloqueo() {
  if (quitarMensajes) { quitarMensajes(); quitarMensajes = null; }
  borrarCopias(); conectado = false;
  $('canales').innerHTML = '';
  estadoSimple(IC.bloquear, 'Acceso al chat suspendido', 'Tu acceso al chat fue suspendido. Si crees que es un error, comunícate con el Hno. Rudy Fuentes.',
    '<a class="btn" href="' + WSP + '" target="_blank" rel="noopener">' + IC.chat + 'Escribir por WhatsApp</a>');
}
async function comprobarBloqueo() {
  try { const b = await getDoc(doc(db, 'bloqueados', yo)); if (b.exists()) { pantallaBloqueo(); return true; } } catch (e) { /* sigue */ }
  abrirGrupo(actual); return false;
}

/* ---------- Inicio ---------- */
let bloqueadoPorCodigo = false;
async function arrancar() {
  if (!nombre || !codigo) {
    estadoSimple(IC.chat, 'Regístrate primero', 'El chat es solo para los hermanos registrados en la app. Abre la app, completa tu registro con tu nombre y apellido reales, y vuelve aquí.',
      '<a class="btn" href="../">Ir a la app</a>');
    return;
  }
  /* La lista de códigos suspendidos se revisa en paralelo, sin hacer esperar al chat */
  fetch('../bloqueados.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : []).then((lista) => {
    const codigos = Array.isArray(lista) ? lista : (lista && Array.isArray(lista.codigos) ? lista.codigos : []);
    if (codigos.includes(codigo)) { bloqueadoPorCodigo = true; pantallaBloqueo(); }
  }).catch(() => { /* sin lista */ });

  vistaInicial();
  try { await cargaFirebase; }
  catch (e) { console.warn(e); estadoSimple(IC.chat, 'No pudimos conectar', 'Revisa tu conexión a internet e inténtalo otra vez.', '<button class="btn" type="button" onclick="location.reload()">Reintentar</button>'); return; }
  if (bloqueadoPorCodigo) return;
  const app = initializeApp(CONFIG);
  auth = getAuth(app);
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch (e) { db = initializeFirestore(app, {}); }

  /* Quien ya entró antes no espera la sesión: los mensajes y el envío funcionan de inmediato
     (Firebase guarda el envío y lo manda apenas la sesión queda confirmada). */
  if (yo) {
    conectado = true; ajustar();
    if (grupo(actual).abierto || puedeLeer(actual)) abrirGrupo(actual);
    if (soyAdmin) iniciarAdmin();
  }

  let iniciado = null;
  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      try { await signInAnonymously(auth); }
      catch (e) { console.warn(e); estadoSimple(IC.chat, 'No pudimos conectar', 'Revisa tu conexión a internet e inténtalo otra vez.', '<button class="btn" type="button" onclick="location.reload()">Reintentar</button>'); }
      return;
    }
    if (iniciado === u.uid) return;
    iniciado = u.uid;
    const cambio = yo !== u.uid;
    yo = u.uid;

    /* Ficha del hermano: la primera vez hay que esperarla (sin ella no puede leer);
       las siguientes se actualiza en segundo plano. */
    const ficha = setDoc(doc(db, 'miembros', yo), { nombre, codigo, actualizado: serverTimestamp() })
      .then(() => guardado('chat-miembro', yo));
    if (guardado('chat-miembro') !== yo) {
      try { await ficha; }
      catch (e) { console.warn(e); estadoSimple(IC.chat, 'No pudimos entrar al chat', 'Inténtalo otra vez en un momento. Si el problema sigue, avísale al Hno. Rudy Fuentes.', '<button class="btn" type="button" onclick="location.reload()">Reintentar</button>'); return; }
    } else ficha.catch((e) => console.warn(e));

    /* Lo ya sabido de la vez anterior se usa de inmediato */
    GRUPOS.forEach((g) => { acceso[g.id] = g.abierto ? 'abierto' : (guardado('chat-acceso-' + g.id) || 'no'); });
    soyAdmin = guardado('chat-admin') === yo;
    if (soyAdmin) iniciarAdmin();
    if (!soyAdmin && quitarAdmin.length) { quitarAdmin.forEach((f) => f()); quitarAdmin.length = 0; $('btnAdmin').hidden = true; }

    /* Los grupos abiertos se muestran altiro; uno cerrado espera la comprobación */
    const grupoActual = grupo(actual);
    conectado = true; ajustar();
    if (cambio || !quitarMensajes) { if (grupoActual.abierto || puedeLeer(actual)) abrirGrupo(actual); else dibujarCanales(); }

    /* Comprobaciones en paralelo */
    const leer = (ref) => getDoc(ref).catch(() => null);
    const cerrados = GRUPOS.filter((g) => !g.abierto);
    const [bloq, adm, ...sol] = await Promise.all([
      leer(doc(db, 'bloqueados', yo)),
      leer(doc(db, 'admins', yo)),
      ...cerrados.map((g) => leer(doc(db, 'grupos', g.id, 'miembros', yo)))
    ]);
    if (bloq && bloq.exists()) { pantallaBloqueo(); return; }
    const eraAdmin = soyAdmin;
    soyAdmin = !!(adm && adm.exists());
    guardado('chat-admin', soyAdmin ? yo : '');
    if (soyAdmin && !eraAdmin) iniciarAdmin();
    if (!soyAdmin && eraAdmin) { quitarAdmin.forEach((f) => f()); quitarAdmin.length = 0; $('btnAdmin').hidden = true; }
    cerrados.forEach((g, i) => {
      const s = sol[i];
      if (s) acceso[g.id] = s.exists() ? (s.data().estado === 'aprobado' ? 'aprobado' : 'pendiente') : 'no';
      guardado('chat-acceso-' + g.id, acceso[g.id]);
      /* Si me aprueban mientras tengo el chat abierto, se actualiza solo */
      onSnapshot(doc(db, 'grupos', g.id, 'miembros', yo), (x) => {
        const antes = acceso[g.id];
        acceso[g.id] = x.exists() ? (x.data().estado === 'aprobado' ? 'aprobado' : 'pendiente') : 'no';
        guardado('chat-acceso-' + g.id, acceso[g.id]);
        if (antes !== acceso[g.id]) { dibujarCanales(); if (actual === g.id) abrirGrupo(g.id); }
      }, () => {});
    });
    /* Si me bloquean mientras estoy en el chat */
    onSnapshot(doc(db, 'bloqueados', yo), (x) => { if (x.exists()) pantallaBloqueo(); }, () => {});
    /* Si el grupo actual cambió de estado con la comprobación, se vuelve a abrir */
    if (!quitarMensajes || (!grupoActual.abierto && !puedeLeer(actual))) abrirGrupo(actual); else dibujarCanales();
    revisarNuevos();
  });
}
/* Si el teléfono quedó con una versión vieja guardada, se actualiza sola una vez */
fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then(async (v) => {
  if (!v || !(v.v > VERSION)) return;
  try { if (sessionStorage.getItem('chat-actualizado') === String(v.v)) return; sessionStorage.setItem('chat-actualizado', String(v.v)); } catch (e) { return; }
  try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch (e) { /* sin caché */ }
  try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.update())); } catch (e) { /* sin service worker */ }
  location.reload();
}).catch(() => {});

arrancar();
