/* ============================================================================
   recorrido.js — Recorrido guiado (modo presentación para grabar el video)
   ----------------------------------------------------------------------------
   Muestra el visor a pantalla completa y recorre los datos de la guía, las seis
   transformaciones y dos composiciones, con subtítulos. Pensado para grabar la
   pantalla mientras se narra el video que pide la guía del proyecto.
   Cada paso dura lo que tarda su animación a la velocidad elegida en la línea
   de tiempo más un tiempo de lectura; si la velocidad cambia durante el
   recorrido, el paso en curso se reprograma.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = raiz.TL;
  const ES = TL.ESTADO, CAT = TL.CATALOGO;
  const $ = s => document.querySelector(s);
  const A = CAT.ALFA;

  const r2 = (fam, p, preset = null) => ({ modulo: 'r2', r2: { preset, familia: fam, p: Object.assign(CAT.defectos(fam), p), puntos: ES.copia(ES.U0) } });
  const r3 = (fam, p, preset = null) => ({ modulo: 'r3', r3: { preset, familia: fam, p: Object.assign(CAT.defectos(fam), p), puntos: ES.copia(ES.V0) } });
  const pre = k => { const p = ES.preset(k); return (p.n === 2 ? r2 : r3)(p.familia, p.p, k); };
  const comp = k => { const c = ES.compPreset(k); return { modulo: 'comp', comp: { n: c.n, preset: k, pasos: ES.copia(c.pasos) } }; };

  const PASOS = [
    { e: r2('rot2', { theta: 0 }), quieto: true, lee: 10, h: 'Dos estaciones hidrométricas en planta',
      p: 'U = {u₁ = (4, 5), u₂ = (−3, 4)}: posiciones en km respecto a un origen común. El río de la cuenca pasa por ambas estaciones; E2 está aguas arriba y E1 aguas abajo.' },
    { e: pre('T1'), lee: 8, h: 'T1. Rotación −α: coordenadas del cauce',
      p: 'El tramo E2→E1 tiene la dirección (7, 1), es decir α = arctan(1/7) = 8,13°. Al rotar −α ambas estaciones quedan con el mismo n = 4,384 km y la diferencia de abscisas, 7,071 km, es la longitud del tramo. La rotación conserva distancias y áreas: det = 1.' },
    { e: pre('T2'), lee: 7, h: 'T2. Homotecia k = 2: plano a escala 1:50 000',
      p: 'Cada kilómetro del terreno se dibuja como 2 cm. Las longitudes se duplican, las áreas se multiplican por k² = 4 (det = 4) y los ángulos no cambian: el plano es semejante al terreno.' },
    { e: pre('T3'), lee: 8, h: 'T3. Cizallamiento k = 0,4: flujo cortante',
      p: 'La velocidad crece con la distancia a la orilla: cada punto avanza k·y. La orilla (eje x) es la dirección propia y no se mueve; el área se conserva (det = 1), pero distancias y ángulos cambian.' },
    { e: comp('C2'), lee: 6, h: 'Composición: el orden importa',
      p: 'Primero se rota hacia las coordenadas del cauce y luego se aplica el cortante: C·R. En el orden inverso se obtiene otra matriz, porque el producto de matrices no es conmutativo.' },
    { e: r3('rot3', { eje: 'z', theta: 0 }), quieto: true, lee: 10, h: 'Los mismos puntos con su cota: el conjunto V',
      p: 'V = {v₁ = (4, 5, 3), v₂ = (−3, 4, 4)} agrega la cota en km. El bloque diagrama muestra la cuenca de alta montaña; el cauce pasa por v₂ (4 km) y v₁ (3 km).' },
    { e: pre('T4'), lee: 8, h: 'T4. Rotación alrededor de z: alinear la cuenca',
      p: 'La rotación alrededor de la vertical conserva la cota. Con θ = −α los dos puntos quedan en un mismo plano vertical: el plano del perfil longitudinal del río.' },
    { e: pre('T5'), lee: 8, h: 'T5. Exageración vertical 2:1',
      p: 'Las cotas se multiplican por 2 y el relieve se aprecia mejor, pero la pendiente dibujada pasa de 14,1 % a 28,3 %. El volumen del cubo unitario se duplica: det = 2.' },
    { e: pre('T6'), lee: 8, h: 'T6. Reflexión respecto al plano xy',
      p: 'Con la superficie libre en z = 0, la cota se convierte en profundidad: (x, y, z) → (x, y, −z). Conserva distancias y volúmenes, pero invierte la orientación: det = −1. Las curvas blancas son el relieve original.' },
    { e: comp('C5'), lee: 6, h: 'Composición en R³: perfil exagerado en profundidades',
      p: 'F·S·Rz encadena las tres transformaciones de R³. Comparten subespacios invariantes (el plano xy y el eje z) y por eso conmutan; det = (−1)(2)(1) = −2.' },
    { e: pre('T1'), lee: 9, h: 'Transformaciones lineales en la ingeniería del agua',
      p: 'Cambiar de sistema de coordenadas, dibujar a escala, exagerar el relieve o describir un flujo cortante son productos de una matriz por un vector. El simulador calcula cada caso con C++, JavaScript y Python, y el informe con QR permite reproducirlo.', sinAnimar: true },
  ];

  const R = {
    i: 0, activo: false, pausado: false, tm: null, inicio: 0, restante: 0, total: 0,

    /** Tramos que anima el paso: 1, o el número de factores de una composición. */
    tramos(P) { return P.e.modulo === 'comp' ? P.e.comp.pasos.length : 1; },

    /** Segundos del paso: su animación a la velocidad indicada más el tiempo de lectura. */
    duracion(P, vel = (TL.APP && TL.APP.E && TL.APP.E.vel) || 1) {
      const anim = P.sinAnimar || P.quieto ? 0 : R.tramos(P) * TL.Animador.DURACION_BASE / vel;
      return anim + P.lee;
    },
    duraciones(vel) { return PASOS.map(P => R.duracion(P, vel)); },

    iniciar() {
      R.activo = true; R.pausado = false; R.i = 0;
      R._guardado = ES.copia(TL.APP.E);
      document.body.classList.add('presentacion');
      const v = $('#visor');
      if (v.requestFullscreen && !document.fullscreenElement) v.requestFullscreen().catch(() => {});
      $('#subtitulo').hidden = false;
      setTimeout(() => { TL.APP.escena.redimensionar(); R.ir(0); }, 120);
    },

    ir(i) {
      clearTimeout(R.tm);
      if (i >= PASOS.length) return R.salir();
      R.i = Math.max(0, i);
      const P = PASOS[R.i];
      const E = TL.APP.E;
      Object.keys(P.e).forEach(k => (E[k] = ES.copia(P.e[k])));
      TL.APP.cambiarModulo(P.e.modulo, { animar: !P.sinAnimar });
      $('#sub-h').textContent = P.h;
      $('#sub-p').textContent = P.p;
      $('#sub-n').textContent = `${R.i + 1} / ${PASOS.length}`;
      R.total = R.duracion(P) * 1000;
      R.restante = R.total;
      R._programar();
    },

    /** La velocidad cambió durante el recorrido: recalcula lo que falta del paso en curso. */
    reprogramar() {
      if (!R.activo) return;
      const P = PASOS[R.i], an = TL.APP.anim;
      const transcurrido = R.total - R.restante + (R.pausado ? 0 : performance.now() - R.inicio);
      let falta = Math.max(0, R.total - transcurrido);
      if (!P.sinAnimar && !P.quieto && an.t < an.tramos) falta = ((an.tramos - an.t) * an.duracion + P.lee) * 1000;
      R.total = transcurrido + falta;
      R.restante = falta;
      if (!R.pausado) { clearTimeout(R.tm); R._programar(); }
    },

    _programar() {
      R.inicio = performance.now();
      const barra = $('#sub-barra');
      barra.style.transition = 'none';
      const hecho = R.total > 0 ? 1 - R.restante / R.total : 0;
      barra.style.width = (hecho * 100) + '%';
      requestAnimationFrame(() => { barra.style.transition = `width ${R.restante}ms linear`; barra.style.width = '100%'; });
      R.tm = setTimeout(() => R.ir(R.i + 1), R.restante);
    },

    pausa() {
      if (!R.activo) return;
      const b = $('#sub-pausa');
      if (!R.pausado) {
        R.pausado = true; clearTimeout(R.tm);
        R.restante -= performance.now() - R.inicio;
        const barra = $('#sub-barra');
        barra.style.width = getComputedStyle(barra).width; barra.style.transition = 'none';
        b.textContent = 'Continuar';
      } else { R.pausado = false; b.textContent = 'Pausa'; R._programar(); }
    },

    salir() {
      clearTimeout(R.tm);
      R.activo = false;
      document.body.classList.remove('presentacion');
      $('#subtitulo').hidden = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (R._guardado) { const vel = TL.APP.E.vel; TL.APP.E = R._guardado; TL.APP.E.vel = vel; R._guardado = null; }
      setTimeout(() => { TL.APP.escena.redimensionar(); TL.APP.cambiarModulo(TL.APP.E.modulo, { animar: false }); }, 120);
    },

    enlazar() {
      $('#sub-ant').onclick = () => R.ir(R.i - 1);
      $('#sub-sig').onclick = () => R.ir(R.i + 1);
      $('#sub-pausa').onclick = () => R.pausa();
      $('#sub-salir').onclick = () => R.salir();
      document.addEventListener('keydown', e => {
        if (!R.activo) return;
        if (e.key === 'Escape') R.salir();
        else if (e.key === 'ArrowRight') R.ir(R.i + 1);
        else if (e.key === 'ArrowLeft') R.ir(R.i - 1);
        else if (e.key === ' ') { e.preventDefault(); R.pausa(); }
      });
      document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && R.activo) setTimeout(() => TL.APP.escena.redimensionar(), 80); });
    },
  };

  R.PASOS = PASOS;
  TL.RECORRIDO = R;
})(typeof window !== 'undefined' ? window : globalThis);
