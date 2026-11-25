/* ============================================================================
   terreno.js — Motor gráfico: modelo digital de elevación de la cuenca
   ----------------------------------------------------------------------------
   Genera un relieve de alta montaña (km) cuyo cauce principal pasa EXACTAMENTE
   por las estaciones de la guía: E2 = (−3, 4) con cota 4 km (aguas arriba) y
   E1 = (4, 5) con cota 3 km (aguas abajo). El valle sigue la dirección del tramo
   (7, 1) y el río serpentea con ceros en ambas estaciones.
   Se trabaja en coordenadas del cauce: s (a lo largo de (7, 1)/√50) y n (normal).
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});

  const R50 = Math.sqrt(50);
  const C = 7 / R50, S = 1 / R50;                 // dirección del tramo E2→E1
  const S2 = -17 / R50, S1 = 33 / R50;            // abscisas de E2 y E1
  const N0 = 31 / R50;                            // distancia del eje del tramo al origen
  const L = R50;                                  // longitud del tramo (km)
  const DOM = { xmin: -8.5, xmax: 9.5, ymin: -2.5, ymax: 10.5 };

  const aCauce = (x, y) => [x * C + y * S, -x * S + y * C];
  const aPlano = (s, n) => [s * C - n * S, s * S + n * C];
  const nCauce = s => N0 + 0.34 * Math.sin(2 * Math.PI * (s - S2) / L);
  // Perfil del cauce: pasa por 4 km en E2 y 3 km en E1 y se suaviza fuera del tramo
  const SC = (S1 + S2) / 2, WF = 4.2, TF = Math.tanh((S1 - S2) / (2 * WF));
  const zFondo = s => 3.5 - 0.5 * Math.tanh((s - SC) / WF) / TF;
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Ruido de valor determinista (fBm) para la rugosidad del relieve
  function hash(i, j) {
    let h = (i * 374761393 + j * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function ruido(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  function fbm(x, y) {
    let s = 0, amp = 0.5, f = 1;
    for (let k = 0; k < 5; k++) { s += amp * ruido(x * f + 17.3 * k, y * f - 9.1 * k); f *= 2.03; amp *= 0.5; }
    return s;
  }
  // Crestas (ruido "ridged") para dar aristas a las montañas
  function crestas(x, y) {
    let s = 0, amp = 0.5, f = 1;
    for (let k = 0; k < 4; k++) { s += amp * (1 - Math.abs(ruido(x * f + 5.7, y * f + 2.9))); f *= 2.1; amp *= 0.5; }
    return s;
  }

  /** Cota del terreno (km) en (x, y). */
  function altura(x, y) {
    const [s, n] = aCauce(x, y);
    const d = n - nCauce(s), ad = Math.abs(d);
    let h = zFondo(s);
    // laderas del valle (en V suave) y ascenso regional
    h += (d > 0 ? 1.15 : 0.85) * (1 - Math.exp(-(d * d) / 3.6));
    h += d > 0 ? 0.09 * Math.max(0, d - 2) : -0.2 * Math.max(0, -d - 3.0);
    // macizo nevado al norte del valle
    h += 0.95 * suave(2.8, 7.5, d) * (0.55 + 0.45 * Math.cos((s - 1.5) * 0.6));
    // rugosidad: se anula en el cauce para que E1 y E2 queden en su cota exacta
    const w = suave(0.25, 2.2, ad);
    h += w * (0.38 * fbm(x * 0.42, y * 0.42) + 0.5 * (crestas(x * 0.28, y * 0.28) - 0.5) * suave(1.5, 6, ad));
    // quebradas afluentes (pequeñas incisiones perpendiculares al valle)
    h -= 0.35 * w * Math.exp(-Math.pow(Math.sin(s * 0.9 + 0.4) * 2.2, 2)) * suave(0.8, 3, ad) * (1 - suave(3, 6.5, ad));
    return Math.max(h, 0.35);
  }

  /** Malla de la superficie: posiciones (x, y, z=cota) en km, normales y cota. */
  function superficie(nx = 240, ny = 176) {
    const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
    let k = 0;
    for (let j = 0; j <= ny; j++) {
      const y = DOM.ymin + (DOM.ymax - DOM.ymin) * j / ny;
      for (let i = 0; i <= nx; i++) {
        const x = DOM.xmin + (DOM.xmax - DOM.xmin) * i / nx;
        pos[k++] = x; pos[k++] = y; pos[k++] = altura(x, y);
      }
    }
    const idx = new Uint32Array(nx * ny * 6);
    k = 0;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = d; idx[k++] = a; idx[k++] = d; idx[k++] = c;
      }
    return { pos, idx, nx, ny };
  }

  /** Faldones (paredes del bloque diagrama) desde el borde del terreno hasta z = 0, y la base. */
  function faldones(sup) {
    const { pos, nx, ny } = sup;
    const borde = [];
    const P = (i, j) => { const q = (j * (nx + 1) + i) * 3; return [pos[q], pos[q + 1], pos[q + 2]]; };
    for (let i = 0; i < nx; i++) borde.push(P(i, 0));
    for (let j = 0; j < ny; j++) borde.push(P(nx, j));
    for (let i = nx; i > 0; i--) borde.push(P(i, ny));
    for (let j = ny; j > 0; j--) borde.push(P(0, j));
    borde.push(borde[0]);
    const v = [], nrm = [], ind = [];
    for (let k = 0; k < borde.length - 1; k++) {
      const [x0, y0, z0] = borde[k], [x1, y1, z1] = borde[k + 1];
      const ex = x1 - x0, ey = y1 - y0, m = Math.hypot(ex, ey) || 1;
      const nxo = ey / m, nyo = -ex / m;   // normal hacia afuera (el borde se recorre en sentido antihorario)
      const b = v.length / 3;
      v.push(x0, y0, z0, x1, y1, z1, x1, y1, 0, x0, y0, 0);
      for (let q = 0; q < 4; q++) nrm.push(nxo, nyo, 0);
      ind.push(b, b + 3, b + 2, b, b + 2, b + 1);
    }
    const base = {
      pos: new Float32Array([DOM.xmin, DOM.ymin, 0, DOM.xmax, DOM.ymin, 0, DOM.xmax, DOM.ymax, 0, DOM.xmin, DOM.ymax, 0]),
      nrm: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]),
      idx: new Uint32Array([0, 2, 1, 0, 3, 2]),
    };
    return { pos: new Float32Array(v), nrm: new Float32Array(nrm), idx: new Uint32Array(ind), base };
  }

  /** Cinta del río: sigue n = nCauce(s) dentro del dominio. uv = (través, abscisa). */
  function rio(ancho = 0.2, paso = 0.04) {
    const v = [], uv = [], ind = [];
    let sMin = Infinity, sMax = -Infinity;
    [[DOM.xmin, DOM.ymin], [DOM.xmax, DOM.ymin], [DOM.xmin, DOM.ymax], [DOM.xmax, DOM.ymax]].forEach(([x, y]) => {
      const s = aCauce(x, y)[0]; sMin = Math.min(sMin, s); sMax = Math.max(sMax, s);
    });
    const dentro = (x, y) => x >= DOM.xmin + 0.05 && x <= DOM.xmax - 0.05 && y >= DOM.ymin + 0.05 && y <= DOM.ymax - 0.05;
    let fila = 0;
    for (let s = sMin; s <= sMax; s += paso) {
      const n = nCauce(s), dn = (nCauce(s + 1e-3) - nCauce(s - 1e-3)) / 2e-3;
      const [x, y] = aPlano(s, n);
      if (!dentro(x, y)) continue;
      // normal a la curva en el plano (s, n) → al plano (x, y)
      const tl = Math.hypot(1, dn);
      const [ox, oy] = aPlano(-dn / tl, 1 / tl).map((a, i) => a - aPlano(0, 0)[i]);
      const anchoLocal = ancho * (0.75 + 0.5 * (s - sMin) / (sMax - sMin));   // crece aguas abajo
      for (const lado of [-1, 1]) {
        const px = x + lado * ox * anchoLocal / 2, py = y + lado * oy * anchoLocal / 2;
        v.push(px, py, zFondo(s) + 0.012);
        uv.push(lado < 0 ? 0 : 1, s);
      }
      if (fila > 0) { const b = (fila - 1) * 2; ind.push(b, b + 1, b + 3, b, b + 3, b + 2); }
      fila++;
    }
    return { pos: new Float32Array(v), uv: new Float32Array(uv), idx: new Uint32Array(ind) };
  }

  TL.TERRENO = { DOM, altura, superficie, faldones, rio, aCauce, aPlano, nCauce, zFondo, S1, S2, N0, L };
})(typeof window !== 'undefined' ? window : globalThis);
