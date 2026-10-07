const PLANES = [
  { id: '1d',  duracion: '1 día',   precio: 1200,  cinta: 'Prueba rápida' },
  { id: '3d',  duracion: '3 días',  precio: 3000,  cinta: 'Para el fin de semana' },
  { id: '6d',  duracion: '6 días',  precio: 5000,  cinta: 'Semana completa' },
  { id: '15d', duracion: '15 días', precio: 15000, cinta: 'Quincena' },
  { id: '30d', duracion: '30 días', precio: 25000, cinta: 'El más conveniente' }
];

const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/* ---------- Splash de apertura ---------- */

(function iniciarSplash() {
  const splash = document.getElementById('splash');
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const espera = reducido ? 150 : 1200;

  setTimeout(() => {
    splash.classList.add('abriendo');
    setTimeout(() => { splash.classList.add('saliendo'); }, reducido ? 0 : 280);
    setTimeout(() => { splash.style.display = 'none'; }, reducido ? 0 : 980);
  }, espera);
})();

/* ---------- Carrusel de planes ---------- */

const carrusel = document.getElementById('carrusel');
const puntosCont = document.getElementById('puntos');
const barraCta = document.getElementById('barraCta');
const resumenEtiqueta = document.getElementById('resumenEtiqueta');
const resumenMonto = document.getElementById('resumenMonto');
const botonComprar = document.getElementById('botonComprar');
const botonComprarTexto = document.getElementById('botonComprarTexto');

let indiceActivo = 0;

function renderizarCarrusel() {
  carrusel.innerHTML = PLANES.map((plan) => `
    <article class="tarjeta-plan" data-plan="${plan.id}">
      <img class="marca-agua" src="/img/espiral-guajiranet.png" alt="">
      <span class="cinta">${plan.cinta}</span>
      <div class="duracion-grande">${plan.duracion}</div>
      <div class="precio-grande">${formateador.format(plan.precio)}</div>
      <div class="detalle">20 Mbps · acceso completo</div>
    </article>
  `).join('');

  puntosCont.innerHTML = PLANES.map(() => '<span class="punto-plan"></span>').join('');

  carrusel.querySelectorAll('.tarjeta-plan').forEach((tarjeta, i) => {
    tarjeta.addEventListener('click', () => {
      irATarjeta(i);
      seleccionarIndice(i);
    });
  });
}

function irATarjeta(i) {
  const tarjetas = carrusel.querySelectorAll('.tarjeta-plan');
  if (!tarjetas[i]) return;
  tarjetas[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

// Aplica el estado visual (tarjeta activa, puntos, barra inferior) para el índice dado.
// Se usa tanto al hacer clic directo (escritorio) como al detectar la tarjeta centrada
// por scroll (carrusel táctil en móvil).
function seleccionarIndice(i) {
  const tarjetas = [...carrusel.querySelectorAll('.tarjeta-plan')];
  if (!tarjetas[i]) return;

  tarjetas.forEach((t, idx) => t.classList.toggle('activa', idx === i));
  puntosCont.querySelectorAll('.punto-plan').forEach((p, idx) => p.classList.toggle('activo', idx === i));

  const cambio = i !== indiceActivo || resumenMonto.textContent === '—';
  indiceActivo = i;
  const plan = PLANES[i];
  resumenEtiqueta.textContent = plan.duracion;
  resumenMonto.textContent = formateador.format(plan.precio);
  botonComprar.disabled = false;
  barraCta.classList.add('visible');

  if (cambio) {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }
}

// Detecta qué tarjeta está centrada dentro del carrusel deslizable (móvil).
// En escritorio el carrusel no se desplaza (todas las tarjetas son visibles),
// así que esto no se dispara ahí: la selección la maneja el clic directo.
function actualizarActiva() {
  // En escritorio el carrusel no se desplaza (todas las tarjetas caben o envuelven
  // en varias filas): no hay nada que "detectar", así que no se toca la selección.
  if (carrusel.scrollWidth <= carrusel.clientWidth + 1) return;

  const tarjetas = [...carrusel.querySelectorAll('.tarjeta-plan')];
  if (!tarjetas.length) return;

  const centroContenedor = carrusel.getBoundingClientRect().left + carrusel.clientWidth / 2;
  let mejorIndice = 0;
  let mejorDistancia = Infinity;

  tarjetas.forEach((tarjeta, i) => {
    const rect = tarjeta.getBoundingClientRect();
    const centroTarjeta = rect.left + rect.width / 2;
    const distancia = Math.abs(centroTarjeta - centroContenedor);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejorIndice = i;
    }
  });

  seleccionarIndice(mejorIndice);
}

let cuadroProgramado = null;
carrusel.addEventListener('scroll', () => {
  if (cuadroProgramado) cancelAnimationFrame(cuadroProgramado);
  cuadroProgramado = requestAnimationFrame(actualizarActiva);
});

async function comprar() {
  const plan = PLANES[indiceActivo];
  if (!plan || botonComprar.disabled) return;
  botonComprar.disabled = true;
  botonComprarTexto.innerHTML = '<span class="girador"></span>';

  try {
    const r = await fetch('/api/comprar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan.id })
    });
    const d = await r.json();
    if (d.error) {
      mostrarError(d.error);
      botonComprar.disabled = false;
      botonComprarTexto.textContent = 'Comprar ahora';
      return;
    }
    botonComprarTexto.textContent = '¡Listo!';
    setTimeout(() => {
      window.location.href = '/pin.html?ref=' + encodeURIComponent(d.referencia);
    }, 200);
  } catch (e) {
    mostrarError('No se pudo conectar. Intenta de nuevo.');
    botonComprar.disabled = false;
    botonComprarTexto.textContent = 'Comprar ahora';
  }
}

function mostrarError(texto) {
  resumenEtiqueta.textContent = texto;
  resumenEtiqueta.style.color = 'var(--rojo)';
  setTimeout(() => {
    resumenEtiqueta.style.color = '';
    resumenEtiqueta.textContent = PLANES[indiceActivo].duracion;
  }, 2800);
}

botonComprar.addEventListener('click', comprar);
renderizarCarrusel();
seleccionarIndice(0);
window.addEventListener('resize', () => requestAnimationFrame(actualizarActiva));
