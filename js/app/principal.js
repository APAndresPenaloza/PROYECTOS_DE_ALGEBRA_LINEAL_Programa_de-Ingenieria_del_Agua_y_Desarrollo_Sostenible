/* ============================================================================
   principal.js — Arranque del simulador
   1. Lee el escenario del enlace (#sim=1&…) si lo hay.
   2. Inicia la interfaz y el motor gráfico.
   3. Valida con JavaScript; carga el núcleo C++ (WebAssembly) y vuelve a validar.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = raiz.TL;
  const $ = s => document.querySelector(s);

  /** Velocidad elegida en una visita anterior (comodidad de cada navegador; el enlace manda). */
  function velocidadGuardada() {
    try {
      const v = parseFloat(localStorage.getItem('tl-velocidad'));
      return TL.ESTADO.VELOCIDADES.includes(v) ? v : 1;
    } catch (e) { return 1; }
  }

  function avisoEnlace(dec) {
    const a = $('#aviso');
    if (!dec) { a.hidden = true; return; }
    const partes = [];
    if (dec.cambios.length) partes.push('Se cargó la simulación del enlace: ' + dec.cambios.join(', ') + '.');
    if (dec.errores.length) partes.push('No se pudieron leer: ' + dec.errores.join(', ') + '.');
    a.innerHTML = `<span>${partes.join(' ')}</span><button class="btn" id="aviso-base">Volver a los casos base</button>`;
    a.hidden = false;
    $('#aviso-base').onclick = () => {
      history.replaceState(null, '', location.pathname);
      const vel = TL.APP.E.vel;
      TL.APP.E = TL.ESTADO.inicial();
      TL.APP.E.vel = vel;
      a.hidden = true;
      TL.APP.cambiarModulo(TL.APP.E.modulo, { animar: true });
    };
  }

  function arrancar() {
    if (!raiz.THREE || !THREE.WebGLRenderer) {
      $('#banner').className = 'banner falla';
      $('#banner').textContent = 'No se pudo cargar la biblioteca three.js. Abra el simulador desde su dirección pública o descargue el repositorio completo.';
      return;
    }
    let E = TL.ESTADO.inicial();
    E.vel = velocidadGuardada();
    const dec = TL.ESTADO.decodificar(location.hash, E);
    if (dec) E = dec.estado;
    try {
      TL.APP.iniciar(E);
    } catch (err) {
      $('#banner').className = 'banner falla';
      $('#banner').textContent = 'El navegador no pudo iniciar la vista 3D (WebGL). Detalle: ' + err.message;
      console.error(err);
      return;
    }
    avisoEnlace(dec && (dec.cambios.length || dec.errores.length) ? dec : null);
    TL.mostrarValidacion(TL.validar());
    TL.WASM.iniciar().then(() => {
      TL.mostrarValidacion(TL.validar());
      if (TL.APP.E.modulo !== 'rep') TL.APP.renderCalculo();
    });
    TL.RECORRIDO.enlazar();
    $('#btn-recorrido').onclick = () => TL.RECORRIDO.iniciar();
    raiz.addEventListener('hashchange', () => {
      const base = TL.ESTADO.inicial();
      base.vel = TL.APP.E.vel;
      const d = TL.ESTADO.decodificar(location.hash, base);
      if (d && TL.ESTADO.codificar(TL.APP.E) !== location.hash) {
        TL.APP.E = d.estado;
        avisoEnlace(d);
        TL.APP.cambiarModulo(TL.APP.E.modulo, { animar: true });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})(window);
