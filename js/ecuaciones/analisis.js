/* ============================================================================
   analisis.js — Motor de ecuaciones: lectura geométrica e hidráulica
   ----------------------------------------------------------------------------
   Traduce las propiedades de la matriz (determinante, ortogonalidad, autovalores,
   inversa, condición) en frases que conectan el álgebra con la ingeniería del agua,
   y calcula las medidas antes/después (distancia, área, ángulo, pendiente).
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});
  const AL = TL.AL, LX = TL.LATEX;

  function medidas(P, Q) {
    if (P.length < 2) return null;
    const m = {
      distancia: [AL.distancia(P[0], P[1]), AL.distancia(Q[0], Q[1])],
      area: [AL.areaTrianguloOrigen(P[0], P[1]), AL.areaTrianguloOrigen(Q[0], Q[1])],
      angulo: [AL.anguloEntre(P[0], P[1]), AL.anguloEntre(Q[0], Q[1])],
    };
    if (P[0].length === 3) m.pendiente = [AL.pendiente(P[1], P[0]), AL.pendiente(Q[1], Q[0])];
    return m;
  }

  const ejes2 = ['x', 'y'], ejes3 = ['x', 'y', 'z'];
  function nombreDireccion(v) {
    const n = v.length, ejes = n === 2 ? ejes2 : ejes3;
    const i = v.findIndex(a => Math.abs(Math.abs(a) - 1) < 1e-9);
    if (i >= 0 && v.every((a, j) => j === i || Math.abs(a) < 1e-9)) return `el eje ${ejes[i]}`;
    return 'la dirección ' + LX.tupla(v.map(a => (Math.abs(a) < 1e-12 ? 0 : a)), 3);
  }

  /**
   * Filas del panel de propiedades. Cada fila: { k: etiqueta (LaTeX), v: valor (LaTeX), t: lectura }.
   */
  function filas(pr) {
    const n = pr.n, medida = n === 2 ? 'área' : 'volumen', medidas_ = n === 2 ? 'áreas' : 'volúmenes';
    const out = [];

    let lectDet;
    if (pr.orientacion === 0) lectDet = `det A = 0: el ${n === 2 ? 'plano se aplasta sobre una recta' : 'espacio se aplasta sobre un plano o una recta'}; se pierde información y la transformación no se puede deshacer.`;
    else if (pr.conservaMedida) lectDet = `|det A| = 1: conserva ${medidas_}. ${pr.orientacion < 0 ? 'El signo negativo indica que la orientación se invierte (la margen izquierda pasa a ser la derecha).' : 'La orientación se conserva.'}`;
    else lectDet = `Las ${medidas_} se multiplican por |det A| = ${LX.txt(pr.factorMedida, 4)}: un ${medida} de 1 km${n === 2 ? '²' : '³'} pasa a ${LX.txt(pr.factorMedida, 4)}. ${pr.orientacion < 0 ? 'Además se invierte la orientación.' : 'La orientación se conserva.'}`;
    out.push({ k: '\\det A', v: LX.num(pr.det, 6), t: lectDet });

    out.push({
      k: 'A^{\\mathsf T}A = I',
      v: pr.ortogonal ? '\\text{sí}' : '\\text{no}',
      t: pr.ortogonal
        ? 'Matriz ortogonal: conserva distancias y ángulos. Las longitudes de tramos medidas en el sistema nuevo son las reales.'
        : (pr.conservaAngulos
          ? 'No conserva distancias, pero sí ángulos (todas las direcciones se estiran igual): es una semejanza.'
          : 'No conserva distancias ni ángulos: las longitudes medidas sobre la figura transformada no son las reales.'),
    });

    const sv = pr.valoresSingulares;
    out.push({
      k: '\\sigma_{\\max},\\ \\sigma_{\\min}',
      v: `${LX.num(sv[0], 4)},\\ ${LX.num(sv[sv.length - 1], 4)}`,
      t: `Estiramiento máximo y mínimo de una longitud. Número de condición κ(A) = ${Number.isFinite(pr.condicion) ? LX.txt(pr.condicion, 4) : '∞'}: ${pr.condicion < 1.0001 ? 'los errores de medición en las coordenadas no se amplifican.' : (Number.isFinite(pr.condicion) ? `un error relativo en las coordenadas puede amplificarse hasta ${LX.txt(pr.condicion, 2)} veces.` : 'la transformación no se puede invertir.')}`,
    });

    const lam = pr.autovalores.map(z => LX.complejo(z, 4)).join(',\\ ');
    const complejos = pr.autovalores.filter(z => Math.abs(z.im) > 1e-12);
    let lectEig = '';
    if (complejos.length) {
      const z = complejos[0];
      const ang = Math.atan2(Math.abs(z.im), z.re) * 180 / Math.PI;
      lectEig = `Autovalores complejos de módulo ${LX.txt(Math.hypot(z.re, z.im), 4)}: ${n === 2 ? 'ninguna dirección del plano' : 'ninguna dirección fuera del eje de giro'} se conserva; corresponden a un giro de ${LX.txt(ang, 2)}°. `;
    }
    pr.espaciosPropios.forEach(e => {
      const dim = e.base.length;
      let que;
      if (dim === n) que = `todas las direcciones son propias (λ = ${LX.txt(e.lambda, 4)})`;
      else if (dim === 2) que = 'el plano generado por ' + e.base.map(nombreDireccion).join(' y ');
      else que = nombreDireccion(e.base[0]);
      let efecto;
      if (Math.abs(e.lambda - 1) < 1e-9) efecto = 'no cambia (puntos fijos)';
      else if (Math.abs(e.lambda + 1) < 1e-9) efecto = 'se invierte';
      else if (Math.abs(e.lambda) < 1e-9) efecto = 'se anula';
      else efecto = `se multiplica por ${LX.txt(e.lambda, 4)}`;
      lectEig += `λ = ${LX.txt(e.lambda, 4)}: ${que} ${efecto}. `;
    });
    out.push({ k: '\\lambda', v: lam, t: lectEig.trim() });

    out.push({
      k: 'A^{-1}',
      v: pr.inversa ? LX.matriz(pr.inversa, 4) : '\\nexists',
      t: pr.inversa
        ? 'La inversa deshace la transformación: permite volver al sistema este-norte original (por ejemplo, de coordenadas del cauce a coordenadas del plano).'
        : 'No existe: distintos puntos caen en la misma imagen y no se pueden recuperar las coordenadas originales.',
    });
    return out;
  }

  /** Lista breve de lo que conserva y lo que modifica (para el resumen y el informe). */
  function conservaModifica(pr) {
    const c = [], m = [];
    (pr.ortogonal ? c : m).push('distancias');
    (pr.conservaAngulos ? c : m).push('ángulos');
    (pr.conservaMedida ? c : m).push(pr.n === 2 ? 'áreas' : 'volúmenes');
    (pr.orientacion > 0 ? c : m).push('orientación');
    return { conserva: c, modifica: m };
  }

  TL.ANALISIS = { medidas, filas, conservaModifica, nombreDireccion };
})(typeof window !== 'undefined' ? window : globalThis);
