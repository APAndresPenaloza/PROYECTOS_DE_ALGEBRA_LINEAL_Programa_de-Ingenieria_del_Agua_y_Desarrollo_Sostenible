/* ============================================================================
   motor-wasm.js — Puente con el motor C++ compilado a WebAssembly
   ----------------------------------------------------------------------------
   Carga cpp/wasm_api.cpp (compilado en wasm/motor_transformaciones.wasm y
   empaquetado en base64 en motor-wasm-datos.js) y ofrece la misma interfaz que el
   motor JavaScript. El simulador calcula los resultados oficiales con C++ y
   comprueba, en cada cambio, que ambos motores coinciden.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});
  const B = { A: 0, B: 9, R: 18, PTS: 32, PROP: 64, IMG: 512 };

  const W = {
    listo: false,
    error: null,
    version: null,
    bytes: 0,
    ex: null,
    buf: null,

    async iniciar() {
      try {
        if (!raiz.WebAssembly) throw new Error('El navegador no admite WebAssembly');
        if (!TL.WASM_B64) throw new Error('No se encontró el módulo WebAssembly');
        const bin = Uint8Array.from(atob(TL.WASM_B64), c => c.charCodeAt(0));
        const { instance } = await WebAssembly.instantiate(bin, {});
        W.ex = instance.exports;
        W.bytes = bin.length;
        W.version = W.ex.tl_version();
        W.listo = true;
      } catch (e) {
        W.error = e.message || String(e);
        W.listo = false;
      }
      return W.listo;
    },

    vista() {   // la memoria puede crecer: se recrea la vista en cada uso
      return new Float64Array(W.ex.memory.buffer, W.ex.tl_bufer(), 1024);
    },

    escribirMatriz(base, M) {
      const v = W.vista(), n = M.length;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) v[base + i * n + j] = M[i][j];
    },
    leerMatriz(base, n) {
      const v = W.vista();
      return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => v[base + i * n + j]));
    },

    /** Matriz estándar calculada en C++ (código de familia y parámetros p1, p2, p3). */
    matrizEstandar(codigo, p) {
      const n = W.ex.tl_matriz(codigo, p[0] || 0, p[1] || 0, p[2] || 0);
      return n ? W.leerMatriz(B.A, n) : null;
    },

    aplicar(M, puntos) {
      const n = M.length, v0 = W.vista();
      W.escribirMatriz(B.A, M);
      puntos.forEach((p, k) => p.forEach((a, i) => (v0[B.PTS + k * n + i] = a)));
      W.ex.tl_aplicar(n, puntos.length);
      const v = W.vista();
      return puntos.map((_, k) => Array.from({ length: n }, (_, i) => v[B.IMG + k * n + i]));
    },

    producto(A, C) {
      const n = A.length;
      W.escribirMatriz(B.A, A);
      W.escribirMatriz(B.B, C);
      W.ex.tl_producto(n);
      return W.leerMatriz(B.R, n);
    },

    propiedades(M) {
      const n = M.length;
      W.escribirMatriz(B.A, M);
      W.ex.tl_propiedades(n);
      const o = W.vista().slice(B.PROP, B.PROP + 28);
      const inv = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => o[19 + i * n + j]));
      return {
        n,
        det: o[0], traza: o[1], rango: o[2], ortogonal: !!o[3], conservaAngulos: !!o[4],
        conservaMedida: !!o[5], orientacion: o[6], factorMedida: o[7], condicion: o[8] > 1e299 ? Infinity : o[8],
        autovalores: Array.from({ length: n }, (_, k) => ({ re: o[10 + k], im: o[13 + k] })),
        valoresSingulares: Array.from({ length: n }, (_, k) => o[16 + k]),
        inversa: o[9] ? inv : null,
      };
    },

    seno: x => W.ex.tl_seno(x),
    coseno: x => W.ex.tl_coseno(x),

    /**
     * Compara C++ (WASM) con JavaScript para una matriz y unos puntos.
     * Devuelve la mayor diferencia absoluta encontrada.
     */
    comparar(M, puntos) {
      if (!W.listo) return null;
      const AL = TL.AL;
      const qj = puntos.map(p => AL.aplicar(M, p)), qc = W.aplicar(M, puntos);
      const pj = AL.propiedades(M), pc = W.propiedades(M);
      let d = 0;
      qj.forEach((q, k) => q.forEach((a, i) => (d = Math.max(d, Math.abs(a - qc[k][i])))));
      d = Math.max(d, Math.abs(pj.det - pc.det));
      pj.autovalores.forEach((z, k) => (d = Math.max(d, Math.abs(z.re - pc.autovalores[k].re), Math.abs(z.im - pc.autovalores[k].im))));
      return d;
    },
  };

  TL.WASM = W;
})(typeof window !== 'undefined' ? window : globalThis);
