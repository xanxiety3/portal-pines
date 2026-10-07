const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'pedidos.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS pedidos (
    referencia  TEXT PRIMARY KEY,
    plan        TEXT NOT NULL,
    estado      TEXT NOT NULL,
    pin         TEXT,
    cobro_id    TEXT,
    qr          TEXT,
    llave       TEXT,
    vence       TEXT,
    intentos_pin INTEGER NOT NULL DEFAULT 0,
    creado_en   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migración ligera: agrega columnas nuevas a bases de datos creadas con un esquema anterior.
const columnas = db.prepare("PRAGMA table_info(pedidos)").all().map(c => c.name);
if (!columnas.includes('intentos_pin')) {
  db.exec('ALTER TABLE pedidos ADD COLUMN intentos_pin INTEGER NOT NULL DEFAULT 0');
}

const MAX_INTENTOS_PIN = 5;

function filaAPedido(fila) {
  if (!fila) return null;
  return {
    plan: fila.plan,
    estado: fila.estado,
    pin: fila.pin,
    cobroId: fila.cobro_id,
    qr: fila.qr,
    llave: fila.llave,
    vence: fila.vence,
    intentosPin: fila.intentos_pin
  };
}

function obtenerPedido(referencia) {
  const fila = db.prepare('SELECT * FROM pedidos WHERE referencia = ?').get(referencia);
  return filaAPedido(fila);
}

function crearPedido(referencia, pedido) {
  db.prepare(`
    INSERT INTO pedidos (referencia, plan, estado, pin, cobro_id, qr, llave, vence)
    VALUES (@referencia, @plan, @estado, @pin, @cobroId, @qr, @llave, @vence)
  `).run({
    referencia,
    plan: pedido.plan,
    estado: pedido.estado,
    pin: pedido.pin ?? null,
    cobroId: pedido.cobroId ?? null,
    qr: pedido.qr ?? null,
    llave: pedido.llave ?? null,
    vence: pedido.vence ?? null
  });
}

// Actualiza únicamente los campos pasados en `cambios`, sin pisar el resto del pedido.
function actualizarPedido(referencia, cambios) {
  const actual = db.prepare('SELECT * FROM pedidos WHERE referencia = ?').get(referencia);
  if (!actual) return;
  const nuevo = { ...actual, ...cambios };
  db.prepare(`
    UPDATE pedidos
    SET estado = @estado, pin = @pin, cobro_id = @cobro_id, qr = @qr, llave = @llave, vence = @vence, intentos_pin = @intentos_pin
    WHERE referencia = @referencia
  `).run({ ...nuevo, referencia });
}

// Incrementa el contador de intentos fallidos de generación de pin y devuelve el nuevo total.
function incrementarIntentoPin(referencia) {
  db.prepare('UPDATE pedidos SET intentos_pin = intentos_pin + 1 WHERE referencia = ?').run(referencia);
  return db.prepare('SELECT intentos_pin FROM pedidos WHERE referencia = ?').get(referencia).intentos_pin;
}

module.exports = { db, obtenerPedido, crearPedido, actualizarPedido, incrementarIntentoPin, MAX_INTENTOS_PIN };
