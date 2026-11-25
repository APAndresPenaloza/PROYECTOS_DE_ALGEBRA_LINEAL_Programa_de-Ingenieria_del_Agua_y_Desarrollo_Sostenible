/* ============================================================================
   catalogo.js — Motor de ecuaciones: familias de transformaciones de la guía
   ----------------------------------------------------------------------------
   Cada familia sabe construir su matriz estándar a partir de sus parámetros,
   el camino de animación desde la identidad, su forma simbólica en LaTeX,
   el código equivalente del motor C++ y su lectura en ingeniería del agua.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});
  const AL = TL.AL;
  const RAD = Math.PI / 180;
  const ALFA = Math.atan2(1, 7) * 180 / Math.PI;      // tramo E2→E1: tan α = 1/7

  function sc(gr) {                     // sen y cos exactos en múltiplos de 90°
    const q = gr / 90;
    if (Number.isInteger(q)) {
      const k = ((q % 4) + 4) % 4;
      return [[0, 1, 0, -1][k], [1, 0, -1, 0][k]];
    }
    return [Math.sin(gr * RAD), Math.cos(gr * RAD)];
  }
  const f = (x, d = 2) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace('.', ',').replace('-', '−');
  const lerp = (a, b, t) => a + (b - a) * t;

  const P = {
    ang: (id = 'theta', def = 30) => ({ id, simbolo: '\\theta', etiqueta: 'Ángulo θ', unidad: '°', min: -180, max: 180, paso: 0.01, defecto: def }),
    num: (id, simbolo, etiqueta, def, min = -3, max = 3, paso = 0.01, unidad = '') => ({ id, simbolo, etiqueta, unidad, min, max, paso, defecto: def }),
    opc: (id, etiqueta, opciones, def) => ({ id, etiqueta, tipo: 'opcion', opciones, defecto: def }),
  };

  const familias = [
    /* =============================== R² =============================== */
    {
      id: 'esc2', n: 2, nombre: 'Escalamiento', ecuacion: '(1)', codigoC: 1,
      params: [P.num('sx', 's_x', 'Factor s_x', 1.5), P.num('sy', 's_y', 'Factor s_y', 0.5)],
      matriz: p => [[p.sx, 0], [0, p.sy]],
      c: p => [p.sx, p.sy, 0],
      camino: (p, t) => [[lerp(1, p.sx, t), 0], [0, lerp(1, p.sy, t)]],
      simbolica: '\\begin{bmatrix}s_x & 0\\\\ 0 & s_y\\end{bmatrix}',
      resumen: 'Escala los ejes x e y de forma independiente.',
      interpretar: p => {
        const r = Math.abs(p.sy / p.sx);
        let t = `Cambia la escala del eje x por ${f(p.sx)} y la del eje y por ${f(p.sy)}. `;
        if (Math.abs(r - 1) > 1e-9) t += `Si (x, y) es un punto de una sección transversal (distancia, cota), la escala vertical queda exagerada ${f(r)} veces respecto a la horizontal, como en un perfil o en un modelo físico distorsionado. `;
        t += 'Las áreas se multiplican por |s_x·s_y| y los ángulos cambian si s_x ≠ s_y.';
        return t;
      },
    },
    {
      id: 'rot2', n: 2, nombre: 'Rotación', ecuacion: '(2)', codigoC: 2,
      params: [P.ang('theta', -ALFA)],
      matriz: p => { const [s, c] = sc(p.theta); return [[c, -s], [s, c]]; },
      c: p => [p.theta, 0, 0],
      camino: (p, t) => { const [s, c] = sc(p.theta * t); return [[c, -s], [s, c]]; },
      simbolica: '\\begin{bmatrix}\\cos\\theta & -\\sin\\theta\\\\ \\sin\\theta & \\cos\\theta\\end{bmatrix}',
      resumen: 'Gira los puntos un ángulo θ (antihorario) alrededor del origen.',
      interpretar: p => {
        let t = `Gira el plano ${f(p.theta)}° alrededor del origen común. `;
        if (Math.abs(p.theta + ALFA) < 0.01) t += `Con θ = −α (α = arctan(1/7) = ${f(ALFA)}°, dirección del tramo E2→E1) las nuevas coordenadas son s (abscisa a lo largo del cauce) y n (distancia transversal al eje): las dos estaciones quedan con el mismo n porque están sobre el mismo tramo recto, y la diferencia de abscisas es la longitud del tramo. `;
        else t += 'Si el eje de un río forma un ángulo α con el eje x, la rotación de ángulo −α da las coordenadas longitudinal (s) y transversal (n) de cada punto. ';
        return t + 'Conserva distancias, ángulos y áreas (det = 1).';
      },
    },
    {
      id: 'hom2', n: 2, nombre: 'Homotecia', ecuacion: '(3)', codigoC: 3,
      params: [P.num('k', 'k', 'Factor k', 2, -3, 3)],
      matriz: p => [[p.k, 0], [0, p.k]],
      c: p => [p.k, 0, 0],
      camino: (p, t) => { const k = lerp(1, p.k, t); return [[k, 0], [0, k]]; },
      simbolica: '\\begin{bmatrix}k & 0\\\\ 0 & k\\end{bmatrix}',
      resumen: 'Dilata o contrae de manera uniforme (s_x = s_y = k).',
      interpretar: p => {
        let t = `Semejanza geométrica con razón k = ${f(p.k, 3)}: las longitudes se multiplican por |k| y las áreas por k² = ${f(p.k * p.k, 3)}. `;
        if (p.k > 0) t += `Leído como un plano (cm de papel por km de terreno), equivale a la escala 1:${Math.round(100000 / p.k).toLocaleString('es-CO')}. `;
        if (p.k < 0) t += 'Con k < 0 además gira la figura 180°. ';
        return t + 'Conserva ángulos y forma: es la relación entre un modelo a escala y su prototipo.';
      },
    },
    {
      id: 'ref2', n: 2, nombre: 'Reflexión', ecuacion: '', codigoC: 4,
      params: [P.opc('eje', 'Respecto a', [{ v: 'x', t: 'Eje x' }, { v: 'y', t: 'Eje y' }, { v: 'origen', t: 'Origen' }], 'y')],
      matriz: p => ({ x: [[1, 0], [0, -1]], y: [[-1, 0], [0, 1]], origen: [[-1, 0], [0, -1]] })[p.eje],
      c: p => [{ x: 0, y: 1, origen: 2 }[p.eje], 0, 0],
      camino: (p, t) => {
        if (p.eje === 'origen') { const [s, c] = sc(180 * t); return [[c, -s], [s, c]]; }
        const m = 1 - 2 * t;
        return p.eje === 'x' ? [[1, 0], [0, m]] : [[m, 0], [0, 1]];
      },
      simbolica: p => ({ x: '\\begin{bmatrix}1 & 0\\\\ 0 & -1\\end{bmatrix}', y: '\\begin{bmatrix}-1 & 0\\\\ 0 & 1\\end{bmatrix}', origen: '\\begin{bmatrix}-1 & 0\\\\ 0 & -1\\end{bmatrix}' })[p.eje],
      resumen: 'Imagen especular respecto a un eje coordenado o al origen.',
      interpretar: p => ({
        y: 'Refleja respecto al eje y: si el eje y es el eje de simetría vertical de un canal trapezoidal, se construye la sección completa a partir de una de sus mitades. Conserva distancias y áreas, pero invierte la orientación (det = −1).',
        x: 'Refleja respecto al eje x: cambia la convención norte ↔ sur, como al pasar de coordenadas cartográficas (norte hacia arriba) a coordenadas de imagen o ráster (filas hacia abajo). Conserva distancias y áreas, pero invierte la orientación (det = −1).',
        origen: 'Refleja respecto al origen: equivale a una rotación de 180° (det = +1), por eso no invierte la orientación. Las estaciones quedan en el cuadrante opuesto.',
      })[p.eje],
    },
    {
      id: 'ciz2', n: 2, nombre: 'Cizallamiento', ecuacion: '', codigoC: 5,
      params: [P.opc('dir', 'Dirección', [{ v: 'x', t: 'En x' }, { v: 'y', t: 'En y' }], 'x'), P.num('k', 'k', 'Factor k', 0.4, -2, 2)],
      matriz: p => (p.dir === 'x' ? [[1, p.k], [0, 1]] : [[1, 0], [p.k, 1]]),
      c: p => [p.k, p.dir === 'x' ? 0 : 1, 0],
      camino: (p, t) => (p.dir === 'x' ? [[1, p.k * t], [0, 1]] : [[1, 0], [p.k * t, 1]]),
      simbolica: p => (p.dir === 'x' ? '\\begin{bmatrix}1 & k\\\\ 0 & 1\\end{bmatrix}' : '\\begin{bmatrix}1 & 0\\\\ k & 1\\end{bmatrix}'),
      resumen: 'Desplaza los puntos a lo largo de un eje en proporción a la otra coordenada.',
      interpretar: p => {
        const [a, b] = p.dir === 'x' ? ['x', 'y'] : ['y', 'x'];
        return `Flujo cortante simple: la velocidad en la dirección ${a} crece linealmente con ${b} (distancia a la orilla o al fondo). Tras Δt cada partícula se desplaza k·${b} en la dirección ${a}, con k = (du/d${b})·Δt = ${f(p.k, 3)}; por ejemplo, du/d${b} = ${f(p.k / 4, 3)} h⁻¹ durante 4 h. Una línea de partículas perpendicular al flujo se inclina sin cambiar su altura. Conserva áreas (det = 1): el trazador se estira pero no se comprime.`;
      },
    },
    {
      id: 'lib2', n: 2, nombre: 'Matriz libre', ecuacion: '', codigoC: 0,
      params: [P.num('a', 'a', 'a', 1, -5, 5), P.num('b', 'b', 'b', 0.5, -5, 5), P.num('c', 'c', 'c', 0, -5, 5), P.num('d', 'd', 'd', 1, -5, 5)],
      matriz: p => [[p.a, p.b], [p.c, p.d]],
      c: () => null,
      camino: (p, t) => AL.mezcla(AL.identidad(2), [[p.a, p.b], [p.c, p.d]], t),
      simbolica: '\\begin{bmatrix}a & b\\\\ c & d\\end{bmatrix}',
      resumen: 'Cualquier matriz 2×2: las columnas son las imágenes de e₁ y e₂.',
      interpretar: () => 'Las columnas de la matriz son las imágenes de los vectores e₁ = (1, 0) y e₂ = (0, 1). El determinante mide cuánto cambia el área de cualquier figura y su signo indica si se invierte la orientación.',
    },

    /* =============================== R³ =============================== */
    {
      id: 'esc3', n: 3, nombre: 'Escalamiento', ecuacion: '(4)', codigoC: 11,
      params: [P.num('sx', 's_x', 'Factor s_x', 1, -3, 5), P.num('sy', 's_y', 'Factor s_y', 1, -3, 5), P.num('sz', 's_z', 'Factor s_z', 2, -3, 5)],
      matriz: p => [[p.sx, 0, 0], [0, p.sy, 0], [0, 0, p.sz]],
      c: p => [p.sx, p.sy, p.sz],
      camino: (p, t) => [[lerp(1, p.sx, t), 0, 0], [0, lerp(1, p.sy, t), 0], [0, 0, lerp(1, p.sz, t)]],
      simbolica: '\\begin{bmatrix}s_x & 0 & 0\\\\ 0 & s_y & 0\\\\ 0 & 0 & s_z\\end{bmatrix}',
      resumen: 'Escala por separado este, norte y cota.',
      interpretar: p => {
        const ex = p.sz / Math.sqrt(Math.abs(p.sx * p.sy) || 1);
        let t = '';
        if (Math.abs(p.sx - p.sy) < 1e-9 && ex > 1) t += `Exageración vertical ${f(ex)}:1, la habitual al visualizar el modelo digital de elevación de una cuenca: el relieve se aprecia mejor, pero las pendientes dibujadas se multiplican por ${f(ex)} y no deben medirse sobre la vista. `;
        else if (Math.abs(p.sx - p.sy) < 1e-9 && ex < 1) t += 'La escala vertical se reduce: el relieve se aplana. ';
        else t += 'Escalas distintas en planta: la planta se deforma (las circunferencias pasan a elipses). ';
        return t + `Los volúmenes se multiplican por |s_x·s_y·s_z| = ${f(Math.abs(p.sx * p.sy * p.sz), 3)}.`;
      },
    },
    {
      id: 'rot3', n: 3, nombre: 'Rotación', ecuacion: '', codigoC: 12,
      params: [P.opc('eje', 'Alrededor del eje', [{ v: 'x', t: 'x (este)' }, { v: 'y', t: 'y (norte)' }, { v: 'z', t: 'z (vertical)' }], 'z'), P.ang('theta', -ALFA)],
      matriz: p => TL.CATALOGO.rot3(p.eje, p.theta),
      c: p => [{ x: 0, y: 1, z: 2 }[p.eje], p.theta, 0],
      camino: (p, t) => TL.CATALOGO.rot3(p.eje, p.theta * t),
      simbolica: p => ({
        x: '\\begin{bmatrix}1 & 0 & 0\\\\ 0 & \\cos\\theta & -\\sin\\theta\\\\ 0 & \\sin\\theta & \\cos\\theta\\end{bmatrix}',
        y: '\\begin{bmatrix}\\cos\\theta & 0 & \\sin\\theta\\\\ 0 & 1 & 0\\\\ -\\sin\\theta & 0 & \\cos\\theta\\end{bmatrix}',
        z: '\\begin{bmatrix}\\cos\\theta & -\\sin\\theta & 0\\\\ \\sin\\theta & \\cos\\theta & 0\\\\ 0 & 0 & 1\\end{bmatrix}',
      })[p.eje],
      resumen: 'Gira alrededor de uno de los ejes principales.',
      interpretar: p => {
        if (p.eje === 'z') {
          let t = `Gira la planta de la cuenca ${f(p.theta)}° alrededor de la vertical; las cotas no cambian. `;
          if (Math.abs(p.theta + ALFA) < 0.01) t += 'Con θ = −α el eje x′ sigue el cauce principal (tramo E2→E1): los dos puntos quedan en el mismo plano vertical, que es el plano del perfil longitudinal del río. ';
          return t + 'Conserva distancias, ángulos y volúmenes (det = 1).';
        }
        return `Gira ${f(p.theta)}° alrededor del eje horizontal ${p.eje}: inclina un plano, como el talud de una presa o la pendiente de un terreno. El eje de giro es la única dirección que no cambia (autovalor 1). Conserva distancias y volúmenes.`;
      },
    },
    {
      id: 'hom3', n: 3, nombre: 'Homotecia', ecuacion: '(5)', codigoC: 13,
      params: [P.num('k', 'k', 'Factor k', 0.5, -3, 3)],
      matriz: p => [[p.k, 0, 0], [0, p.k, 0], [0, 0, p.k]],
      c: p => [p.k, 0, 0],
      camino: (p, t) => { const k = lerp(1, p.k, t); return [[k, 0, 0], [0, k, 0], [0, 0, k]]; },
      simbolica: '\\begin{bmatrix}k & 0 & 0\\\\ 0 & k & 0\\\\ 0 & 0 & k\\end{bmatrix}',
      resumen: 'Factor de escala uniforme en las tres direcciones.',
      interpretar: p => `Modelo a escala geométricamente semejante (vertedero, compuerta, embalse) con k = ${f(p.k, 3)}: las longitudes se multiplican por |k|, las áreas por k² = ${f(p.k ** 2, 4)} y los volúmenes por |k|³ = ${f(Math.abs(p.k) ** 3, 4)}. Por ejemplo, el volumen del embalse del modelo es el del prototipo multiplicado por |k|³.`,
    },
    {
      id: 'ref3', n: 3, nombre: 'Reflexión', ecuacion: '', codigoC: 14,
      params: [P.opc('plano', 'Respecto al plano', [{ v: 'xy', t: 'xy (horizontal)' }, { v: 'xz', t: 'xz' }, { v: 'yz', t: 'yz' }], 'xy')],
      matriz: p => ({ xy: [[1, 0, 0], [0, 1, 0], [0, 0, -1]], xz: [[1, 0, 0], [0, -1, 0], [0, 0, 1]], yz: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]] })[p.plano],
      c: p => [{ xy: 0, xz: 1, yz: 2 }[p.plano], 0, 0],
      camino: (p, t) => {
        const m = 1 - 2 * t;
        return { xy: [[1, 0, 0], [0, 1, 0], [0, 0, m]], xz: [[1, 0, 0], [0, m, 0], [0, 0, 1]], yz: [[m, 0, 0], [0, 1, 0], [0, 0, 1]] }[p.plano];
      },
      simbolica: p => ({ xy: '\\begin{bmatrix}1 & 0 & 0\\\\ 0 & 1 & 0\\\\ 0 & 0 & -1\\end{bmatrix}', xz: '\\begin{bmatrix}1 & 0 & 0\\\\ 0 & -1 & 0\\\\ 0 & 0 & 1\\end{bmatrix}', yz: '\\begin{bmatrix}-1 & 0 & 0\\\\ 0 & 1 & 0\\\\ 0 & 0 & 1\\end{bmatrix}' })[p.plano],
      resumen: 'Imagen especular respecto a un plano coordenado.',
      interpretar: p => ({
        xy: 'Tomando la superficie libre (o el plano de referencia) como z = 0, intercambia alturas sobre la superficie y profundidades bajo ella: es el cambio de la convención topográfica (z positiva hacia arriba) a la batimétrica (profundidad positiva hacia abajo). Visualmente, es el reflejo del relieve en un espejo de agua. Conserva distancias y volúmenes; invierte la orientación (det = −1).',
        xz: 'Expresa la simetría de un canal respecto a su plano longitudinal medio: cada punto de una margen tiene su gemelo en la otra. Invierte la orientación (det = −1).',
        yz: 'Invierte el sentido este ↔ oeste, como al cambiar el sentido del abscisado de un cauce (aguas arriba ↔ aguas abajo). Invierte la orientación (det = −1).',
      })[p.plano],
    },
    {
      id: 'ciz3', n: 3, nombre: 'Cizallamiento', ecuacion: '(6)', codigoC: 15,
      params: [P.opc('eje', 'Coordenada que se desplaza', [{ v: 'x', t: 'x (en función de y, z)' }, { v: 'y', t: 'y (en función de x, z)' }, { v: 'z', t: 'z (en función de x, y)' }], 'x'), P.num('k1', 'k_1', 'Factor k₁', 0.3, -2, 2), P.num('k2', 'k_2', 'Factor k₂', 0.5, -2, 2)],
      matriz: p => TL.CATALOGO.ciz3(p.eje, p.k1, p.k2),
      c: p => [{ x: 0, y: 1, z: 2 }[p.eje], p.k1, p.k2],
      camino: (p, t) => TL.CATALOGO.ciz3(p.eje, p.k1 * t, p.k2 * t),
      simbolica: p => ({
        x: '\\begin{bmatrix}1 & k_y & k_z\\\\ 0 & 1 & 0\\\\ 0 & 0 & 1\\end{bmatrix}',
        y: '\\begin{bmatrix}1 & 0 & 0\\\\ k_x & 1 & k_z\\\\ 0 & 0 & 1\\end{bmatrix}',
        z: '\\begin{bmatrix}1 & 0 & 0\\\\ 0 & 1 & 0\\\\ k_x & k_y & 1\\end{bmatrix}',
      })[p.eje],
      resumen: 'Una coordenada se desplaza en función de las otras dos.',
      interpretar: p => (p.eje === 'x'
        ? `Si la velocidad longitudinal u varía linealmente con la coordenada transversal y y con la profundidad z, en Δt cada partícula se desplaza x′ = x + k_y·y + k_z·z, con k_y = (∂u/∂y)·Δt = ${f(p.k1, 3)} y k_z = (∂u/∂z)·Δt = ${f(p.k2, 3)}. Conserva volúmenes (det = 1): el agua no se comprime.`
        : `La coordenada ${p.eje} se desplaza en proporción a las otras dos (k₁ = ${f(p.k1, 3)}, k₂ = ${f(p.k2, 3)}). Conserva volúmenes (det = 1) pero no distancias ni ángulos.`),
    },
    {
      id: 'lib3', n: 3, nombre: 'Matriz libre', ecuacion: '', codigoC: 0,
      params: ['a11', 'a12', 'a13', 'a21', 'a22', 'a23', 'a31', 'a32', 'a33'].map((id, i) => P.num(id, id.replace(/a(\d)(\d)/, 'a_{$1$2}'), id, [1, 0, 0.3, 0, 1, 0, 0, 0, 1.5][i], -5, 5)),
      matriz: p => [[p.a11, p.a12, p.a13], [p.a21, p.a22, p.a23], [p.a31, p.a32, p.a33]],
      c: () => null,
      camino: (p, t) => AL.mezcla(AL.identidad(3), [[p.a11, p.a12, p.a13], [p.a21, p.a22, p.a23], [p.a31, p.a32, p.a33]], t),
      simbolica: '\\begin{bmatrix}a_{11} & a_{12} & a_{13}\\\\ a_{21} & a_{22} & a_{23}\\\\ a_{31} & a_{32} & a_{33}\\end{bmatrix}',
      resumen: 'Cualquier matriz 3×3: las columnas son las imágenes de e₁, e₂ y e₃.',
      interpretar: () => 'Las columnas son las imágenes de e₁, e₂ y e₃. El cubo unitario se transforma en un paralelepípedo cuyo volumen es |det A|; si det A < 0 la orientación se invierte y si det A = 0 el espacio se aplasta sobre un plano o una recta.',
    },
  ];

  const porId = {};
  familias.forEach(F => (porId[F.id] = F));

  /** Valores por defecto de una familia. */
  function defectos(id) {
    const o = {};
    porId[id].params.forEach(p => (o[p.id] = p.defecto));
    return o;
  }

  /* ----------------------------- Las seis transformaciones del proyecto */
  const PRESETS = [
    { clave: 'T1', n: 2, familia: 'rot2', p: { theta: -ALFA }, titulo: 'Rotación −α: alinear con el tramo E2→E1',
      corto: 'Rotación', lectura: 'Coordenadas del cauce (s, n)' },
    { clave: 'T2', n: 2, familia: 'hom2', p: { k: 2 }, titulo: 'Homotecia k = 2: plano a escala 1:50 000',
      corto: 'Homotecia', lectura: 'Plano de localización' },
    { clave: 'T3', n: 2, familia: 'ciz2', p: { dir: 'x', k: 0.4 }, titulo: 'Cizallamiento k = 0,4: flujo cortante',
      corto: 'Cizallamiento', lectura: 'Deformación por cortante' },
    { clave: 'T4', n: 3, familia: 'rot3', p: { eje: 'z', theta: -ALFA }, titulo: 'Rotación alrededor de z: alinear la cuenca con el cauce',
      corto: 'Rotación z', lectura: 'Plano del perfil longitudinal' },
    { clave: 'T5', n: 3, familia: 'esc3', p: { sx: 1, sy: 1, sz: 2 }, titulo: 'Escalamiento (1, 1, 2): exageración vertical 2:1',
      corto: 'Exageración', lectura: 'Modelo digital de elevación' },
    { clave: 'T6', n: 3, familia: 'ref3', p: { plano: 'xy' }, titulo: 'Reflexión plano xy: de cotas a profundidades',
      corto: 'Reflexión', lectura: 'Espejo de agua (z = 0)' },
  ];

  /* ------------------------------------ Composiciones analizadas (C1–C6) */
  const COMPOSICIONES = [
    { clave: 'C1', n: 2, titulo: 'H·R — alinear y dibujar a escala', pasos: [{ familia: 'rot2', p: { theta: -ALFA } }, { familia: 'hom2', p: { k: 2 } }],
      lectura: 'La homotecia es k·I y conmuta con cualquier matriz: el orden no importa.' },
    { clave: 'C2', n: 2, titulo: 'C·R — cortante en coordenadas del cauce', pasos: [{ familia: 'rot2', p: { theta: -ALFA } }, { familia: 'ciz2', p: { dir: 'x', k: 0.4 } }],
      lectura: 'C·R ≠ R·C. Primero se pasa a coordenadas (s, n) y luego el cortante actúa a lo largo del cauce: s′ = s + 0,4·n. En el orden inverso el cortante actuaría hacia el este.' },
    { clave: 'C3', n: 2, titulo: 'R(α)·C·R(−α) — cortante a lo largo del cauce (cambio de base)', pasos: [{ familia: 'rot2', p: { theta: -ALFA } }, { familia: 'ciz2', p: { dir: 'x', k: 0.4 } }, { familia: 'rot2', p: { theta: ALFA } }],
      lectura: 'La conjugación devuelve el resultado a coordenadas este-norte: es un cizallamiento cuya dirección invariante es el eje del tramo (7, 1). E1 y E2 tienen el mismo n, se desplazan lo mismo y su distancia no cambia.' },
    { clave: 'C4', n: 3, titulo: 'S·Rz — perfil longitudinal exagerado', pasos: [{ familia: 'rot3', p: { eje: 'z', theta: -ALFA } }, { familia: 'esc3', p: { sx: 1, sy: 1, sz: 2 } }],
      lectura: 'Rz actúa solo en el plano xy y S solo en z: comparten subespacios invariantes y por eso conmutan.' },
    { clave: 'C5', n: 3, titulo: 'F·S·Rz — perfil exagerado en convención de profundidades', pasos: [{ familia: 'rot3', p: { eje: 'z', theta: -ALFA } }, { familia: 'esc3', p: { sx: 1, sy: 1, sz: 2 } }, { familia: 'ref3', p: { plano: 'xy' } }],
      lectura: 'det = (−1)(2)(1) = −2: el volumen se duplica y la orientación se invierte.' },
    { clave: 'C6', n: 3, titulo: 'S·Rx — inclinar y exagerar (no conmutan)', pasos: [{ familia: 'rot3', p: { eje: 'x', theta: 10 } }, { familia: 'esc3', p: { sx: 1, sy: 1, sz: 2 } }],
      lectura: 'Rx mezcla y con z, así que no conmuta con la exageración vertical: exagerar un terreno ya inclinado no equivale a inclinar el terreno exagerado.' },
  ];

  /** Producto de una lista de pasos (en orden de aplicación): A_último ··· A_primero. */
  function productoPasos(pasos, n, invertido = false) {
    let M = AL.identidad(n);
    const lista = invertido ? pasos.slice().reverse() : pasos;
    lista.forEach(s => { M = AL.producto(porId[s.familia].matriz(s.p), M); });
    return M;
  }

  TL.CATALOGO = {
    ALFA, familias, porId, defectos, PRESETS, COMPOSICIONES, productoPasos,
    rot3(eje, theta) {
      const [s, c] = sc(theta);
      if (eje === 'x') return [[1, 0, 0], [0, c, -s], [0, s, c]];
      if (eje === 'y') return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
      return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
    },
    ciz3(eje, k1, k2) {
      if (eje === 'x') return [[1, k1, k2], [0, 1, 0], [0, 0, 1]];
      if (eje === 'y') return [[1, 0, 0], [k1, 1, k2], [0, 0, 1]];
      return [[1, 0, 0], [0, 1, 0], [k1, k2, 1]];
    },
    simbolica(F, p) { return typeof F.simbolica === 'function' ? F.simbolica(p) : F.simbolica; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
