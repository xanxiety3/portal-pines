// Migración única: importa pedidos.json a pedidos.db (SQLite). Ejecutar una sola vez con:
//   node migrar-pedidos.js
const fs = require('fs');
const path = require('path');
const { db } = require('./db');

const ARCHIVO = path.join(__dirname, 'pedidos.json');

if (!fs.existsSync(ARCHIVO)) {
  console.log('No existe pedidos.json, nada que migrar.');
  process.exit(0);
}

const pedidos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
const referencias = Object.keys(pedidos);

const insertar = db.prepare(`
  INSERT OR IGNORE INTO pedidos (referencia, plan, estado, pin, cobro_id, qr, llave, vence)
  VALUES (@referencia, @plan, @estado, @pin, @cobroId, @qr, @llave, @vence)
`);

const migrarTodo = db.transaction((refs) => {
  for (const referencia of refs) {
    const p = pedidos[referencia];
    insertar.run({
      referencia,
      plan: p.plan,
      estado: p.estado,
      pin: p.pin ?? null,
      cobroId: p.cobroId ?? null,
      qr: p.qr ?? null,
      llave: p.llave ?? null,
      vence: p.vence ?? null
    });
  }
});

migrarTodo(referencias);

console.log(`Migrados ${referencias.length} pedidos a pedidos.db.`);
console.log('Verifica que todo esté bien y luego puedes borrar pedidos.json manualmente.');
