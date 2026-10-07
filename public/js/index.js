const PLANES = [
  { id: '1d',  duracion: '1 día',   precio: 1200,  color: 'var(--amarillo)',    icono: 'rayo' },
  { id: '3d',  duracion: '3 días',  precio: 3000,  color: 'var(--verde-lima)',  icono: 'wifi' },
  { id: '6d',  duracion: '6 días',  precio: 5000,  color: 'var(--celeste)',     icono: 'wifi' },
  { id: '15d', duracion: '15 días', precio: 15000, color: 'var(--azul)',        icono: 'calendario' },
  { id: '30d', duracion: '30 días', precio: 25000, color: 'var(--rojo)',        icono: 'estrella' }
];

const ICONOS = {
  rayo: '<path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/>',
  wifi: '<path d="M5 12.5a11 11 0 0 1 14 0" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M8.5 16a6 6 0 0 1 7 0" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>',
  calendario: '<rect x="4" y="5.5" width="16" height="15" rx="2.5" stroke="currentColor" stroke-width="2.1" fill="none"/><path d="M4 10h16M8 3.5v4M16 3.5v4" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
  estrella: '<path d="M12 3.5l2.6 5.5 6 .7-4.4 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.4-4.1 6-.7z" fill="currentColor"/>'
};

const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const contenedorPlanes = document.getElementById('planes');
const barraCta = document.getElementById('barraCta');
const resumenEtiqueta = document.getElementById('resumenEtiqueta');
const resumenMonto = document.getElementById('resumenMonto');
const botonComprar = document.getElementById('botonComprar');
const botonComprarTexto = document.getElementById('botonComprarTexto');

let planSeleccionado = null;

function renderizarPlanes() {
  contenedorPlanes.innerHTML = PLANES.map((plan, i) => `
    <button type="button" class="plan" data-plan="${plan.id}" role="radio" aria-checked="false"
      style="animation-delay:${i * 60}ms">
      <span class="marca-color" style="background:${plan.color}">
        <svg viewBox="0 0 24 24">${ICONOS[plan.icono]}</svg>
      </span>
      <span class="info">
        <span class="duracion">${plan.duracion}</span>
        <span class="velocidad">20 Mbps · acceso completo</span>
      </span>
      <span class="precio">${formateador.format(plan.precio)}</span>
      <span class="marca-seleccion">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>
      </span>
    </button>
  `).join('');

  contenedorPlanes.querySelectorAll('.plan').forEach(boton => {
    boton.addEventListener('click', () => seleccionarPlan(boton.dataset.plan));
  });
}

function seleccionarPlan(id) {
  planSeleccionado = PLANES.find(p => p.id === id);
  contenedorPlanes.querySelectorAll('.plan').forEach(b => {
    const activo = b.dataset.plan === id;
    b.classList.toggle('seleccionado', activo);
    b.setAttribute('aria-checked', String(activo));
  });

  resumenEtiqueta.textContent = planSeleccionado.duracion;
  resumenMonto.textContent = formateador.format(planSeleccionado.precio);
  botonComprar.disabled = false;
  barraCta.classList.add('visible');

  try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
}

async function comprar() {
  if (!planSeleccionado || botonComprar.disabled) return;
  botonComprar.disabled = true;
  botonComprarTexto.innerHTML = '<span class="girador"></span>';

  try {
    const r = await fetch('/api/comprar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planSeleccionado.id })
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
    resumenEtiqueta.textContent = planSeleccionado ? planSeleccionado.duracion : 'Selecciona un plan';
  }, 2800);
}

botonComprar.addEventListener('click', comprar);
renderizarPlanes();
