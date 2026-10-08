(function () {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;

  if (reducido) {
    link.href = 'img/espiral-guajiranet.png';
    return;
  }

  const TAMANIO = 32;
  const CUADROS = 24;
  const img = new Image();
  img.onload = () => {
    const cuadros = [];
    for (let i = 0; i < CUADROS; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = TAMANIO; 
      canvas.height = TAMANIO;
      const ctx = canvas.getContext('2d');
      ctx.translate(TAMANIO / 2, TAMANIO / 2);
      ctx.rotate((i / CUADROS) * Math.PI * 2);
      const escala = TAMANIO * 0.92;
      ctx.drawImage(img, -escala / 2, -escala / 2, escala, escala);
      cuadros.push(canvas.toDataURL('image/png'));
    }
    let i = 0;
    setInterval(() => {
      link.href = cuadros[i];
      i = (i + 1) % CUADROS;
    }, 70);
  };
  img.src = 'img/espiral-guajiranet.png';
})();
