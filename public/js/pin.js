const ref = new URLSearchParams(location.search).get('ref');
const tarjeta = document.getElementById('tarjeta');
const pasos = document.querySelectorAll('#pasos .paso');

let intervaloCuentaRegresiva = null;
let sondeoProgramado = null;

function marcarPaso(n) {
  pasos.forEach((p, i) => {
    const num = i + 1;
    p.classList.toggle('hecho', num < n);
    p.classList.toggle('activo', num === n);
  });
}

function detenerCuentaRegresiva() {
  if (intervaloCuentaRegresiva) {
    clearInterval(intervaloCuentaRegresiva);
    intervaloCuentaRegresiva = null;
  }
}

function iniciarCuentaRegresiva(vence, elemento) {
  detenerCuentaRegresiva();
  const actualizar = () => {
    const msRestante = new Date(vence).getTime() - Date.now();
    if (msRestante <= 0) {
      elemento.textContent = 'Código expirado';
      detenerCuentaRegresiva();
      return;
    }
    const totalSeg = Math.floor(msRestante / 1000);
    const min = String(Math.floor(totalSeg / 60)).padStart(2, '0');
    const seg = String(totalSeg % 60).padStart(2, '0');
    elemento.innerHTML = 'Expira en <strong>' + min + ':' + seg + '</strong>';
  };
  actualizar();
  intervaloCuentaRegresiva = setInterval(actualizar, 1000);
}

function iconoReloj() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
}

function iconoAlerta() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4.5"/><circle cx="12" cy="16.3" r="0.4" fill="currentColor"/><path d="M10.6 3.9 2.4 18.2A1.7 1.7 0 0 0 3.9 20.8h16.2a1.7 1.7 0 0 0 1.5-2.6L13.4 3.9a1.7 1.7 0 0 0-2.8 0z"/></svg>';
}

function iconoEquis() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
}

function renderCargando(texto) {
  detenerCuentaRegresiva();
  tarjeta.innerHTML = `
    <div class="estado-cargando">
      <span class="girador oscuro"></span>
      <p class="mensaje">${texto}</p>
    </div>
  `;
}

function iconoCopiar() {
  return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
}

function renderPendientePago(d) {
  tarjeta.innerHTML = `
    <p class="mensaje">Escanea el QR con la app de tu banco para pagar.</p>
    <div class="zona-qr">
      <div class="marco-qr">
        <img src="${d.qr}" alt="Código QR de pago">
      </div>
      ${d.llave ? `
        <div class="bloque-llave">
          <span class="etiqueta-llave">O paga a la llave Bre-B</span>
          <button class="llave-pago" id="botonLlave" type="button">
            <span class="texto-llave">${d.llave}</span>
            ${iconoCopiar()}
          </button>
        </div>
      ` : ''}
      ${d.vence ? `<span class="cuenta-regresiva" id="cuentaRegresiva"></span>` : ''}
    </div>
    <p class="mensaje" style="font-size:12.5px;margin-top:6px;">Esta página se actualiza sola, no es necesario recargar.</p>
  `;
  if (d.vence) iniciarCuentaRegresiva(d.vence, document.getElementById('cuentaRegresiva'));

  const botonLlave = document.getElementById('botonLlave');
  if (botonLlave) {
    botonLlave.addEventListener('click', () => {
      navigator.clipboard.writeText(d.llave).catch(() => {});
      botonLlave.classList.add('copiado');
      botonLlave.querySelector('.texto-llave').textContent = '¡Copiada!';
      try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
      setTimeout(() => {
        botonLlave.classList.remove('copiado');
        botonLlave.querySelector('.texto-llave').textContent = d.llave;
      }, 1800);
    });
  }
}

function renderExito(pin) {
  detenerCuentaRegresiva();
  const digitosHtml = String(pin).split('').map((c, i) =>
    `<span style="animation-delay:${i * 55}ms">${c}</span>`
  ).join('');

  tarjeta.innerHTML = `
    <svg class="circulo-exito" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28"/>
      <path d="M20 33l8 8 16-17"/>
    </svg>
    <p class="pin-titulo">¡Pago aprobado! Este es tu pin</p>
    <div class="pin-digitos">${digitosHtml}</div>
    <button class="boton-copiar" id="botonCopiar" type="button">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
      <span>Copiar pin</span>
    </button>
  `;

  const boton = document.getElementById('botonCopiar');
  boton.addEventListener('click', () => {
    navigator.clipboard.writeText(String(pin)).catch(() => {});
    boton.classList.add('copiado');
    boton.querySelector('span').textContent = '¡Copiado!';
    try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
    setTimeout(() => {
      boton.classList.remove('copiado');
      boton.querySelector('span').textContent = 'Copiar pin';
    }, 1800);
  });
}

function renderError({ tono = 'error', titulo, mensaje, mostrarRef = false }) {
  detenerCuentaRegresiva();
  tarjeta.innerHTML = `
    <div class="icono-estado ${tono}">${tono === 'aviso' ? iconoAlerta() : iconoEquis()}</div>
    <p class="pin-titulo" style="margin-bottom:6px;">${titulo}</p>
    <p class="mensaje">${mensaje}</p>
    ${mostrarRef ? `<div class="referencia-copiable">${ref}</div>` : ''}
    <a class="enlace-volver" href="./">Volver a comprar</a>
  `;
}

async function consultar() {
  if (!ref) {
    marcarPaso(0);
    renderError({ titulo: 'Falta información', mensaje: 'No encontramos la referencia de tu compra.' });
    return;
  }

  try {
    const r = await fetch('api/estado/' + encodeURIComponent(ref));
    const d = await r.json();

    switch (d.estado) {
      case 'entregado':
        marcarPaso(3);
        renderExito(d.pin);
        return;

      case 'rechazado':
        marcarPaso(1);
        renderError({
          tono: 'error',
          titulo: 'Pago no aprobado',
          mensaje: 'El pago no fue aprobado. Puedes volver a intentarlo.'
        });
        return;

      case 'monto_incorrecto':
        marcarPaso(2);
        renderError({
          tono: 'aviso',
          titulo: 'Monto incorrecto',
          mensaje: 'Recibimos tu pago pero el monto no coincide. Escríbenos con esta referencia:',
          mostrarRef: true
        });
        return;

      case 'fallo_pin_definitivo':
        marcarPaso(2);
        renderError({
          tono: 'aviso',
          titulo: 'No pudimos generar tu pin',
          mensaje: 'Recibimos tu pago pero hubo un problema entregando el pin. Escríbenos con esta referencia:',
          mostrarRef: true
        });
        return;

      case 'no_existe':
        marcarPaso(0);
        renderError({ titulo: 'Compra no encontrada', mensaje: 'No encontramos esta compra.' });
        return;

      case 'error_pin':
        marcarPaso(2);
        renderCargando('Tu pago fue aprobado, estamos generando tu pin...');
        break;

      default:
        if (d.qr) {
          marcarPaso(1);
          renderPendientePago(d);
        } else {
          marcarPaso(2);
          renderCargando('Esperando la confirmación de tu pago...');
        }
    }
  } catch (e) {
    // Error de red: se reintenta en el siguiente ciclo sin romper la pantalla actual.
  }

  sondeoProgramado = setTimeout(consultar, 3000);
}

consultar();
