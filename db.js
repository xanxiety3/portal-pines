const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, 'pedidos.json');
const MAX_INTENTOS_PIN = 5;

function leerTodo() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  } catch (e) {
    return {};
  }
}

// Escritura atómica: se escribe en un archivo temporal y se renombra encima
// del definitivo, para no dejar el archivo a medio escribir si el proceso
// se interrumpe justo en ese instante.
function guardarTodo(pedidos) {
  const temporal = ARCHIVO + '.tmp';
  fs.writeFileSync(temporal, JSON.stringify(pedidos, null, 2));
  fs.renameSync(temporal, ARCHIVO);
}

function obtenerPedido(referencia) {
  const pedidos = leerTodo();
  const pedido = pedidos[referencia];
  if (!pedido) return null;
  return { intentosPin: 0, ...pedido };
}

function crearPedido(referencia, pedido) {
  const pedidos = leerTodo();
  pedidos[referencia] = {
    plan: pedido.plan,
    estado: pedido.estado,
    pin: pedido.pin ?? null,
    cobroId: pedido.cobroId ?? null,
    qr: pedido.qr ?? null,
    llave: pedido.llave ?? null,
    vence: pedido.vence ?? null,
    intentosPin: 0
  };
  guardarTodo(pedidos);
}

// Actualiza únicamente los campos pasados en `cambios`, sin pisar el resto del pedido.
function actualizarPedido(referencia, cambios) {
  const pedidos = leerTodo();
  const actual = pedidos[referencia];
  if (!actual) return;
  pedidos[referencia] = { ...actual, ...cambios };
  guardarTodo(pedidos);
}

// Incrementa el contador de intentos fallidos de generación de pin y devuelve el nuevo total.
function incrementarIntentoPin(referencia) {
  const pedidos = leerTodo();
  const actual = pedidos[referencia];
  if (!actual) return 0;
  actual.intentosPin = (actual.intentosPin ?? 0) + 1;
  guardarTodo(pedidos);
  return actual.intentosPin;
}

module.exports = { obtenerPedido, crearPedido, actualizarPedido, incrementarIntentoPin, MAX_INTENTOS_PIN };
