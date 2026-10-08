require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const REQUERIDAS = ['ONEPAY_API_KEY', 'DATAWIFI_API_KEY', 'DATAWIFI_CUSTOMER_ID', 'DATAWIFI_ZONE_ID'];
const faltantes = REQUERIDAS.filter(v => !process.env[v]);
if (faltantes.length) {
  console.error('Faltan variables de entorno requeridas: ' + faltantes.join(', '));
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

// En cPanel/Passenger la app puede quedar montada bajo un subdirectorio
// (ej. "/zonawifi"); Passenger no recorta ese prefijo de la URL, así que
// montamos todas las rutas bajo él nosotros mismos. En local esto queda
// vacío y todo se sirve en "/", como antes.
const BASE_PATH = process.env.BASE_PATH || process.env.PASSENGER_BASE_URI || '';
const router = express.Router();

// Si visitan el prefijo exacto sin la barra final, redirige con ella:
// las rutas relativas del frontend (css/js/img) necesitan esa barra para
// resolver bien contra el subdirectorio.
if (BASE_PATH) {
  app.get(BASE_PATH, (req, res, next) => {
    // Express ignora la barra final al hacer match, así que este handler
    // también se dispara para ".../zonawifi/" — ahí dejamos pasar (next)
    // para que el router sirva el index normalmente.
    if (req.path === BASE_PATH) return res.redirect(301, BASE_PATH + '/');
    next();
  });
}

router.use(helmet());
router.use(express.json({ limit: '10kb' }));
router.use(express.static('public'));

router.get('/salud', (req, res) => res.send('ok'));
const crypto = require('crypto');

// Límite general para toda la API: 60 solicitudes por minuto por IP.
const limitadorApi = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false
});
router.use('/api', limitadorApi);

// Límite más estricto para crear cobros: evita abuso contra la pasarela de pago.
const limitadorComprar = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de compra. Espera unos minutos e intenta de nuevo.' }
});

// fetch con timeout: evita que una llamada externa colgada bloquee la solicitud indefinidamente.
async function fetchConTimeout(url, opciones = {}, msTimeout = 10000) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), msTimeout);
  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

const PLANES = {
  '1d':  { nombre: '1 día',   precio: 1200,  planDatawifi: '1dia' },
  '3d':  { nombre: '3 días',  precio: 3000,  planDatawifi: '3dias' },
  '6d':  { nombre: '6 días',  precio: 5000,  planDatawifi: '6dias' },
  '15d': { nombre: '15 días', precio: 15000, planDatawifi: '15dias' },
  '30d': { nombre: '30 días', precio: 25000, planDatawifi: '30dias' }
};
async function generarPin(planDatawifi, precio) {
  const respuesta = await fetchConTimeout('https://app.datawifi.co/easyfi/web/services/api_pines/pines.php', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.DATAWIFI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      costumer_id: Number(process.env.DATAWIFI_CUSTOMER_ID),
      type: 'general',
      navigation_plan: planDatawifi,
      zone: Number(process.env.DATAWIFI_ZONE_ID),
      price: precio
    })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok || !datos.pin) {
    throw new Error('DataWifi respondió: ' + JSON.stringify(datos));
  }
  return datos.pin;
}
const { obtenerPedido, crearPedido, actualizarPedido, incrementarIntentoPin, MAX_INTENTOS_PIN } = require('./db');
const enProceso = {};

// Una referencia siempre tiene la forma pin-<uuid v4>; rechaza cualquier otra cosa antes de tocar la BD.
const REF_VALIDA = /^pin-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/api/estado/:referencia', async (req, res) => {
  const ref = req.params.referencia;
  if (!REF_VALIDA.test(ref)) return res.status(400).json({ estado: 'no_existe' });

  const pedido = obtenerPedido(ref);
  if (!pedido) return res.status(404).json({ estado: 'no_existe' });

  if (!enProceso[ref]) {
    enProceso[ref] = true;
    try {
      const plan = PLANES[pedido.plan];

      // 1. Si está pendiente, preguntarle a Onepay
      if (pedido.estado === 'pendiente' && pedido.cobroId) {
        const r = await fetchConTimeout('https://api.onepay.la/v1/charges/' + pedido.cobroId, {
          headers: { 'Authorization': 'Bearer ' + process.env.ONEPAY_API_KEY }
        });
        const cobro = await r.json();
        if (cobro.status === 'approved' || cobro.status === 'paid') {
          pedido.estado = Number(cobro.amount) === plan.precio ? 'pagado' : 'monto_incorrecto';
        } else if (cobro.status === 'failed') {
          pedido.estado = 'rechazado';
        }
      }

      // 2. Si ya está pagado, generar el pin (con un tope de reintentos si falla)
      if (pedido.estado === 'pagado' || pedido.estado === 'error_pin') {
        try {
          pedido.pin = await generarPin(plan.planDatawifi, plan.precio);
          pedido.estado = 'entregado';
        } catch (e) {
          const intentos = incrementarIntentoPin(ref);
          pedido.intentosPin = intentos;
          pedido.estado = intentos >= MAX_INTENTOS_PIN ? 'fallo_pin_definitivo' : 'error_pin';
          console.error('Error generando pin (' + intentos + '/' + MAX_INTENTOS_PIN + '):', e.message);
        }
      }

      actualizarPedido(ref, pedido);
    } catch (e) {
      console.error('Error consultando el estado:', e.message);
    } finally {
      delete enProceso[ref];
    }
  }

  res.json({ estado: pedido.estado, pin: pedido.pin, qr: pedido.qr, llave: pedido.llave, vence: pedido.vence });
});
router.post('/api/comprar', limitadorComprar, async (req, res) => {
  const plan = PLANES[req.body.plan];
  if (!plan) return res.status(400).json({ error: 'Plan no válido' });

  const referencia = 'pin-' + crypto.randomUUID();

  try {
    const respuesta = await fetchConTimeout('https://api.onepay.la/v1/charges/bre-b', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.ONEPAY_API_KEY,
        'Content-Type': 'application/json',
        'x-idempotency': crypto.randomUUID()
      },
      body: JSON.stringify({
        amount: plan.precio,
        title: 'Pin de internet ' + plan.nombre,
        description: 'Pin de internet ' + plan.nombre,
        external_id: referencia,
        expires_in: 15
      })
    });
    const cobro = await respuesta.json();

    if (!respuesta.ok || !cobro.qr) {
      console.error('Onepay respondió:', respuesta.status, JSON.stringify(cobro));
      return res.status(502).json({ error: 'No se pudo generar el pago. Intenta de nuevo.' });
    }

    crearPedido(referencia, {
      plan: req.body.plan,
      estado: 'pendiente',
      pin: null,
      cobroId: cobro.id,
      qr: cobro.qr.image,
      llave: cobro.key ? cobro.key.alias : null,
      vence: cobro.expires_at
    });

    res.json({ referencia });
  } catch (e) {
    console.error('Error creando el cobro:', e.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.use(BASE_PATH || '/', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor listo en el puerto ' + PORT + ' (BASE_PATH="' + BASE_PATH + '")'));