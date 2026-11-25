/* ============================================================================
   motores.test.js — Pruebas de los motores JavaScript y C++/WebAssembly (Node ≥ 18)
   Uso:  node pruebas/motores.test.js
   Escribe datos/resultados_js.json y compara con datos/referencia.json (Python).
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
globalThis.window = globalThis;
for (const f of ['js/ecuaciones/algebra.js', 'js/ecuaciones/catalogo.js', 'js/ecuaciones/latex.js',
  'js/ecuaciones/analisis.js', 'js/ecuaciones/referencia.js', 'js/wasm/motor-wasm-datos.js', 'js/wasm/motor-wasm.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), { filename: f });
}
const { AL, CATALOGO, WASM, REFERENCIA } = globalThis.TL;
const ref = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos/referencia.json'), 'utf8'));
const U = ref.U, V = ref.V;

let total = 0, fallos = 0;
function ok(cond, msg) { total++; if (!cond) { fallos++; console.log('  ✗ ' + msg); } }
const difM = (A, B) => Math.max(...A.flat().map((a, i) => Math.abs(a - B.flat()[i])));

(async () => {
  await WASM.iniciar();
  ok(WASM.listo, 'WebAssembly cargado: ' + (WASM.error || ''));

  const salida = { motor: `JavaScript (Node ${process.version})`, transformaciones: [], composiciones: [] };
  let maxRef = 0, maxWasm = 0;

  CATALOGO.PRESETS.forEach((T, i) => {
    const F = CATALOGO.porId[T.familia];
    const M = F.matriz(T.p);
    const P = T.n === 2 ? U : V;
    const Q = P.map(p => AL.aplicar(M, p));
    const pr = AL.propiedades(M);
    const r = ref.transformaciones[i];
    const dRef = Math.max(difM(M, r.matriz), difM(Q, r.imagenes), Math.abs(pr.det - r.propiedades.det));
    maxRef = Math.max(maxRef, dRef);
    ok(dRef < 1e-13, `${T.clave}: JS frente a Python (${dRef.toExponential(2)})`);
    // autovalores frente a NumPy
    const eigRef = r.propiedades.autovalores;
    const dEig = Math.max(...pr.autovalores.map((z, k) => Math.hypot(z.re - eigRef[k][0], z.im - eigRef[k][1])));
    ok(dEig < 1e-12, `${T.clave}: autovalores JS frente a NumPy (${dEig.toExponential(2)})`);
    ok(pr.ortogonal === r.propiedades.ortogonal && pr.rango === r.propiedades.rango &&
       pr.conservaAngulos === r.propiedades.conserva_angulos, `${T.clave}: propiedades lógicas`);
    // C++ (WASM): matriz construida en C++ a partir del código y los parámetros
    const Mc = WASM.matrizEstandar(F.codigoC, F.c(T.p));
    const dW = Math.max(difM(Mc, M), WASM.comparar(M, P));
    maxWasm = Math.max(maxWasm, dW);
    ok(dW < 1e-13, `${T.clave}: C++/WASM frente a JS (${dW.toExponential(2)})`);
    salida.transformaciones.push({
      clave: T.clave, matriz: M, imagenes: Q, det: pr.det, traza: pr.traza, rango: pr.rango,
      ortogonal: pr.ortogonal, conserva_angulos: pr.conservaAngulos, orientacion: pr.orientacion,
      condicion: pr.condicion, autovalores: pr.autovalores.map(z => [z.re, z.im]), inversa: pr.inversa,
    });
  });

  CATALOGO.COMPOSICIONES.forEach((C, i) => {
    const M = CATALOGO.productoPasos(C.pasos, C.n), Mi = CATALOGO.productoPasos(C.pasos, C.n, true);
    const P = C.n === 2 ? U : V;
    const r = ref.composiciones[i];
    const conmutan = difM(M, Mi) < 1e-12;
    const d = Math.max(difM(M, r.producto), difM(Mi, r.producto_invertido));
    maxRef = Math.max(maxRef, d);
    ok(d < 1e-13 && conmutan === r.conmutan, `${C.clave}: composición JS frente a Python (${d.toExponential(2)})`);
    // producto calculado en C++ paso a paso
    let Mc = AL.identidad(C.n);
    C.pasos.forEach(s => { Mc = WASM.producto(CATALOGO.porId[s.familia].matriz(s.p), Mc); });
    const dW = difM(Mc, M);
    maxWasm = Math.max(maxWasm, dW);
    ok(dW < 1e-13, `${C.clave}: producto C++/WASM frente a JS (${dW.toExponential(2)})`);
    salida.composiciones.push({ clave: C.clave, producto: M, producto_invertido: Mi, conmutan, det: AL.det(M), imagenes: P.map(p => AL.aplicar(M, p)) });
  });

  // Coherencia con los valores embebidos para validar() en el navegador
  Object.entries(REFERENCIA.T).forEach(([k, r], i) => ok(difM(r.M, ref.transformaciones[i].matriz) === 0, `referencia.js ${k}`));

  // Pruebas de estrés: matrices aleatorias JS frente a C++
  let semilla = 2026;
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648) * 6 - 3;
  let maxAzar = 0;
  for (let k = 0; k < 4000; k++) {
    const n = k % 2 ? 3 : 2;
    const M = Array.from({ length: n }, () => Array.from({ length: n }, azar));
    const P = [[azar(), azar(), azar()].slice(0, n)];
    maxAzar = Math.max(maxAzar, WASM.comparar(M, P) / Math.max(1, Math.abs(AL.det(M))));
  }
  ok(maxAzar < 1e-9, `4000 matrices aleatorias: C++ frente a JS (${maxAzar.toExponential(2)})`);

  salida.max_dif_python = maxRef;
  salida.max_dif_wasm = maxWasm;
  salida.max_dif_aleatorias = maxAzar;
  fs.writeFileSync(path.join(RAIZ, 'datos/resultados_js.json'), JSON.stringify(salida, null, 2));
  console.log(`JS frente a Python: ${maxRef.toExponential(2)} · C++/WASM frente a JS: ${maxWasm.toExponential(2)} · aleatorias: ${maxAzar.toExponential(2)}`);
  console.log(`Pruebas: ${total - fallos} de ${total} correctas ${fallos ? '← REVISAR' : '✓'}`);
  process.exit(fallos ? 1 : 0);
})();
