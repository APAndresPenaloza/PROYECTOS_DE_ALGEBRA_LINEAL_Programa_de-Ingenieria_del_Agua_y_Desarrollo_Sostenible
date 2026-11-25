/* ============================================================================
   algebra.js — Motor de ecuaciones (JavaScript): núcleo de álgebra lineal 2×2 y 3×3
   ----------------------------------------------------------------------------
   Proyecto: Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua
   Autor:    Andrés Mauricio Peñaloza Fernández · Universidad de Santa Marta · 2026

   Es la misma lógica del motor C++ (cpp/algebra_lineal.hpp), escrita en JS puro
   para que el simulador funcione aunque el navegador no tenga WebAssembly.
   Matrices como arreglos de filas: A[i][j].
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});

  const identidad = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const copia = A => A.map(f => f.slice());
  const producto = (A, B) => A.map(f => B[0].map((_, j) => f.reduce((s, a, k) => s + a * B[k][j], 0)));
  const aplicar = (A, p) => A.map(f => f.reduce((s, a, k) => s + a * p[k], 0));
  const transpuesta = A => A[0].map((_, j) => A.map(f => f[j]));
  const traza = A => A.reduce((s, f, i) => s + f[i], 0);
  const norma = v => Math.sqrt(v.reduce((s, a) => s + a * a, 0));
  const resta = (p, q) => p.map((a, i) => a - q[i]);
  const escalar = (k, A) => A.map(f => f.map(a => k * a));
  const suma = (A, B) => A.map((f, i) => f.map((a, j) => a + B[i][j]));
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const punto = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

  function det(A) {
    if (A.length === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
         - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
         + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  }

  /** Inversa por la adjunta. Devuelve null si |det| < tol. */
  function inversa(A, tol = 1e-12) {
    const d = det(A);
    if (Math.abs(d) < tol) return null;
    if (A.length === 2) return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
    const a = A;
    return [
      [(a[1][1] * a[2][2] - a[1][2] * a[2][1]) / d, (a[0][2] * a[2][1] - a[0][1] * a[2][2]) / d, (a[0][1] * a[1][2] - a[0][2] * a[1][1]) / d],
      [(a[1][2] * a[2][0] - a[1][0] * a[2][2]) / d, (a[0][0] * a[2][2] - a[0][2] * a[2][0]) / d, (a[0][2] * a[1][0] - a[0][0] * a[1][2]) / d],
      [(a[1][0] * a[2][1] - a[1][1] * a[2][0]) / d, (a[0][1] * a[2][0] - a[0][0] * a[2][1]) / d, (a[0][0] * a[1][1] - a[0][1] * a[1][0]) / d],
    ];
  }

  function difIdentidad(M) {
    let s = 0;
    M.forEach((f, i) => f.forEach((a, j) => { const e = a - (i === j ? 1 : 0); s += e * e; }));
    return Math.sqrt(s);
  }

  /* ---------------------------------------------------------- autovalores */
  function raicesCuadratica(p, q) {          // λ² + pλ + q = 0
    const h = -0.5 * p, disc = h * h - q;
    if (disc >= 0) {
      const r = Math.sqrt(disc);
      let l1 = h + (h >= 0 ? r : -r);
      let l2 = l1 !== 0 ? q / l1 : h - (h >= 0 ? r : -r);
      if (l1 < l2) [l1, l2] = [l2, l1];
      return [{ re: l1, im: 0 }, { re: l2, im: 0 }];
    }
    const r = Math.sqrt(-disc);
    return [{ re: h, im: r }, { re: h, im: -r }];
  }

  function raizRealCubica(b, c, d) {         // λ³ + bλ² + cλ + d
    const f = x => ((x + b) * x + c) * x + d;
    const R = 1 + Math.max(Math.abs(b), Math.abs(c), Math.abs(d));
    let lo = -R, hi = R;
    for (let k = 0; k < 200 && hi - lo > 1e-15 * R; k++) {
      const m = 0.5 * (lo + hi);
      if ((f(lo) < 0) === (f(m) < 0)) lo = m; else hi = m;
    }
    let x = 0.5 * (lo + hi);
    for (let k = 0; k < 4; k++) {
      const df = (3 * x + 2 * b) * x + c;
      if (df === 0) break;
      const nx = x - f(x) / df;
      if (!Number.isFinite(nx)) break;
      x = nx;
    }
    return x;
  }

  const casiCero = (x, esc) => Math.abs(x) <= 1e-14 * Math.max(1, esc);

  function ordenar(l) {
    return l.sort((a, b) => (Math.abs(a.re - b.re) > 1e-15 ? b.re - a.re : b.im - a.im));
  }

  /** Autovalores {re, im} ordenados como en el motor C++ y en Python. */
  function autovalores(A) {
    if (A.length === 2) return ordenar(raicesCuadratica(-traza(A), det(A)));
    const esc = Math.max(...A.flat().map(Math.abs));
    for (let e = 0; e < 3; e++) {
      let i = (e + 1) % 3, j = (e + 2) % 3;
      if (i > j) [i, j] = [j, i];
      if (casiCero(A[e][i], esc) && casiCero(A[e][j], esc) && casiCero(A[i][e], esc) && casiCero(A[j][e], esc)) {
        const tr = A[i][i] + A[j][j], dt = A[i][i] * A[j][j] - A[i][j] * A[j][i];
        return ordenar([{ re: A[e][e], im: 0 }, ...raicesCuadratica(-tr, dt)]);
      }
    }
    const sup = casiCero(A[1][0], esc) && casiCero(A[2][0], esc) && casiCero(A[2][1], esc);
    const inf = casiCero(A[0][1], esc) && casiCero(A[0][2], esc) && casiCero(A[1][2], esc);
    if (sup || inf) return ordenar([0, 1, 2].map(k => ({ re: A[k][k], im: 0 })));
    const c2 = traza(A);
    const c1 = A[0][0] * A[1][1] - A[0][1] * A[1][0] + A[0][0] * A[2][2] - A[0][2] * A[2][0] + A[1][1] * A[2][2] - A[1][2] * A[2][1];
    const c0 = det(A);
    const r = raizRealCubica(-c2, c1, -c0);
    const p = r - c2, q = c1 + r * p;
    return ordenar([{ re: r, im: 0 }, ...raicesCuadratica(p, q)]);
  }

  /** Base del subespacio propio de un autovalor real λ (vectores unitarios). */
  function autovectores(A, lambda) {
    const n = A.length;
    const B = A.map((f, i) => f.map((a, j) => a - (i === j ? lambda : 0)));
    const esc = Math.max(1, ...A.flat().map(Math.abs));
    const tol = 1e-9 * esc;
    const unit = v => { const m = norma(v); return v.map(a => a / m); };
    if (n === 2) {
      const filas = B.filter(f => norma(f) > tol);
      if (!filas.length) return [[1, 0], [0, 1]];
      const f = filas.sort((a, b) => norma(b) - norma(a))[0];
      return [unit([-f[1], f[0]])];
    }
    const filas = B.filter(f => norma(f) > tol);
    if (!filas.length) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    let mejor = null, mejorN = 0;
    for (let i = 0; i < filas.length; i++)
      for (let j = i + 1; j < filas.length; j++) {
        const c = cruz(filas[i], filas[j]), m = norma(c);
        if (m > mejorN) { mejorN = m; mejor = c; }
      }
    const f0 = unit(filas.sort((a, b) => norma(b) - norma(a))[0]);
    if (mejor && mejorN > tol * norma(f0) * esc) return [unit(mejor)];     // rango 2 → recta
    // rango 1 → plano ortogonal a la fila no nula
    const aux = Math.abs(f0[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cruz(f0, aux));
    const w = unit(cruz(f0, u));
    return [u, w];
  }

  /* ---------------------------------------------------- valores singulares */
  function valoresSingulares(A) {
    const n = A.length;
    const S = producto(transpuesta(A), A);
    for (let barrido = 0; barrido < 60; barrido++) {
      let fuera = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) fuera += S[p][q] * S[p][q];
      if (fuera < 1e-30) break;
      for (let p = 0; p < n; p++)
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(S[p][q]) < 1e-300) continue;
          const theta = (S[q][q] - S[p][p]) / (2 * S[p][q]);
          const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < n; k++) {
            const skp = S[k][p], skq = S[k][q];
            S[k][p] = c * skp - s * skq; S[k][q] = s * skp + c * skq;
          }
          for (let k = 0; k < n; k++) {
            const spk = S[p][k], sqk = S[q][k];
            S[p][k] = c * spk - s * sqk; S[q][k] = s * spk + c * sqk;
          }
        }
    }
    const sv = S.map((f, k) => Math.sqrt(Math.max(0, f[k]))).sort((a, b) => b - a);
    let prod = 1;
    for (let k = 0; k < n - 1; k++) prod *= sv[k];
    if (prod > 1e-300) sv[n - 1] = Math.abs(det(A)) / prod;
    return sv;
  }

  /** Propiedades geométricas de T(x) = A·x (mismos criterios que C++ y Python). */
  function propiedades(A) {
    const n = A.length;
    const d = det(A);
    const sv = valoresSingulares(A);
    const smax = sv[0], smin = sv[n - 1];
    const lambdas = autovalores(A);
    const reales = [];
    lambdas.forEach(l => {
      if (l.im === 0 && !reales.some(r => Math.abs(r - l.re) < 1e-9)) reales.push(l.re);
    });
    return {
      n,
      det: d,
      traza: traza(A),
      rango: sv.filter(s => s > 1e-10 * Math.max(1, smax)).length,
      ortogonal: difIdentidad(producto(transpuesta(A), A)) < 1e-10,
      conservaAngulos: smax > 1e-12 && Math.abs(smax - smin) < 1e-10 * smax,
      conservaMedida: Math.abs(Math.abs(d) - 1) < 1e-10,
      orientacion: Math.abs(d) < 1e-12 ? 0 : d > 0 ? 1 : -1,
      factorMedida: Math.abs(d),
      condicion: smin > 1e-15 ? smax / smin : Infinity,
      valoresSingulares: sv,
      autovalores: lambdas,
      espaciosPropios: reales.map(l => ({ lambda: l, base: autovectores(A, l) })),
      inversa: inversa(A),
    };
  }

  /* ------------------------------------------------- medidas geométricas */
  const distancia = (p, q) => norma(resta(p, q));
  function areaTrianguloOrigen(p, q) {
    if (p.length === 2) return 0.5 * Math.abs(p[0] * q[1] - p[1] * q[0]);
    return 0.5 * norma(cruz(p, q));
  }
  function anguloEntre(p, q) {
    const c = punto(p, q) / (norma(p) * norma(q));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }
  const pendiente = (p, q) => (q[2] - p[2]) / Math.hypot(q[0] - p[0], q[1] - p[1]);

  function iguales(A, B, tol = 1e-12) {
    return A.every((f, i) => f.every((a, j) => Math.abs(a - B[i][j]) <= tol * Math.max(1, Math.abs(a))));
  }

  /** Interpolación lineal de matrices (para el modo «matriz libre»). */
  const mezcla = (A, B, t) => A.map((f, i) => f.map((a, j) => a + (B[i][j] - a) * t));

  /** Incrusta una matriz 2×2 en 3×3 (el plano z = 0 queda fijo). */
  const a3 = A => (A.length === 3 ? A : [[A[0][0], A[0][1], 0], [A[1][0], A[1][1], 0], [0, 0, 1]]);

  TL.AL = {
    identidad, copia, producto, aplicar, transpuesta, traza, det, inversa, autovalores, autovectores,
    valoresSingulares, propiedades, distancia, areaTrianguloOrigen, anguloEntre, pendiente, norma,
    resta, escalar, suma, cruz, punto, iguales, mezcla, a3,
  };
})(typeof window !== 'undefined' ? window : globalThis);
