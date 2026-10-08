const PLANES = [
  { id: '1d',  duracion: '1 día',   precio: 1200 },
  { id: '3d',  duracion: '3 días',  precio: 3000 },
  { id: '6d',  duracion: '6 días',  precio: 5000 },
  { id: '15d', duracion: '15 días', precio: 15000 },
  { id: '30d', duracion: '30 días', precio: 25000 }
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

/* ---------- Toast de error ---------- */

const toast = document.getElementById('toast');
let toastProgramado = null;

function mostrarToast(texto) {
  clearTimeout(toastProgramado);
  toast.textContent = texto;
  toast.classList.add('visible');
  toastProgramado = setTimeout(() => toast.classList.remove('visible'), 3200);
}

/* ---------- Grilla de planes ---------- */

const gridPlanes = document.getElementById('gridPlanes');

function renderizarPlanes() {
  gridPlanes.innerHTML = PLANES.map((plan, i) => `
    <article class="tarjeta-plan" data-plan="${plan.id}" style="animation-delay:${i * 60}ms"
      role="button" tabindex="0" aria-label="Comprar plan de ${plan.duracion} por ${formateador.format(plan.precio)}">
      <img class="marca-agua" src="img/espiral-guajiranet.png" alt="">
      <div class="duracion-grande">${plan.duracion}</div>
      <div class="precio-grande">${formateador.format(plan.precio)}</div>
      <button class="boton-comprar-tarjeta" type="button" tabindex="-1">
        <span class="texto-boton">Comprar ahora</span>
      </button>
    </article>
  `).join('');

  // Toda la tarjeta es tocable (no solo el botón): un toque en cualquier
  // parte compra ese plan. El botón queda solo como indicación visual.
  gridPlanes.querySelectorAll('.tarjeta-plan').forEach((tarjeta) => {
    const plan = PLANES.find(p => p.id === tarjeta.dataset.plan);
    const boton = tarjeta.querySelector('.boton-comprar-tarjeta');
    tarjeta.addEventListener('click', () => comprar(plan, boton));
    tarjeta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        comprar(plan, boton);
      }
    });
  });
}

function todosLosBotones() {
  return [...gridPlanes.querySelectorAll('.boton-comprar-tarjeta')];
}

async function comprar(plan, boton) {
  const botones = todosLosBotones();
  if (botones.some(b => b.disabled)) return;

  botones.forEach(b => { b.disabled = true; });
  boton.querySelector('.texto-boton').innerHTML = '<span class="girador"></span>';
  try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}

  try {
    const r = await fetch('api/comprar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan.id })
    });
    const d = await r.json();
    if (d.error) {
      mostrarToast(d.error);
      botones.forEach(b => { b.disabled = false; });
      boton.querySelector('.texto-boton').textContent = 'Comprar ahora';
      return;
    }
    boton.querySelector('.texto-boton').textContent = '¡Listo!';
    setTimeout(() => {
      window.location.href = 'pin.html?ref=' + encodeURIComponent(d.referencia);
    }, 150);
  } catch (e) {
    mostrarToast('No se pudo conectar. Intenta de nuevo.');
    botones.forEach(b => { b.disabled = false; });
    boton.querySelector('.texto-boton').textContent = 'Comprar ahora';
  }
}

renderizarPlanes();
