/* ============================================================================
   validar.js — Validación interna del simulador
   ----------------------------------------------------------------------------
   Al abrir la página, repite las seis transformaciones (T1–T6) y las seis
   composiciones (C1–C6) con el motor JavaScript y con el núcleo C++ compilado a
   WebAssembly, y compara contra los valores de referencia calculados en Python
   con NumPy (js/ecuaciones/referencia.js, generado por python/generar_referencia.py).
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = raiz.TL;

  function validar() {
    const R = TL.REFERENCIA, AL = TL.AL, CAT = TL.CATALOGO, W = TL.WASM;
    const U = TL.ESTADO.U0, V = TL.ESTADO.V0;
    const dM = (A, B) => Math.max(...A.flat().map((a, i) => Math.abs(a - B.flat()[i])));
    const out = [];
    const motores = [{ nombre: 'JavaScript', mat: (F, p) => F.matriz(p), apl: (M, P) => P.map(p => AL.aplicar(M, p)), prod: (A, B) => AL.producto(A, B), det: M => AL.det(M) }];
    if (W && W.listo) motores.push({ nombre: 'C++ (WebAssembly)', mat: (F, p) => W.matrizEstandar(F.codigoC, F.c(p)), apl: (M, P) => W.aplicar(M, P), prod: (A, B) => W.producto(A, B), det: M => W.propiedades(M).det });
    motores.forEach(mo => {
      CAT.PRESETS.forEach(T => {
        const F = CAT.porId[T.familia], r = R.T[T.clave];
        const M = mo.mat(F, T.p), Q = mo.apl(M, T.n === 2 ? U : V);
        const d = Math.max(dM(M, r.M), dM(Q, r.img), Math.abs(mo.det(M) - r.det));
        out.push({ motor: mo.nombre, caso: T.clave, dif: d, ok: d < 1e-12 });
      });
      CAT.COMPOSICIONES.forEach(C => {
        const r = R.C[C.clave];
        const mats = C.pasos.map(s => mo.mat(CAT.porId[s.familia], s.p));
        let M = AL.identidad(C.n), Mi = AL.identidad(C.n);
        mats.forEach(A => (M = mo.prod(A, M)));
        mats.slice().reverse().forEach(A => (Mi = mo.prod(A, Mi)));
        const conm = dM(M, Mi) < 1e-12;
        const d = Math.max(dM(M, r.M), dM(Mi, r.Mi), Math.abs(mo.det(M) - r.det));
        out.push({ motor: mo.nombre, caso: C.clave, dif: d, ok: d < 1e-12 && conm === r.conmutan });
      });
    });
    const correctas = out.filter(x => x.ok).length;
    return { total: out.length, correctas, maxDif: Math.max(...out.map(x => x.dif)), motores: motores.map(m => m.nombre), detalle: out };
  }

  function mostrar(res) {
    const b = document.getElementById('banner');
    const ok = res.correctas === res.total;
    const dif = res.maxDif === 0 ? '0' : res.maxDif.toExponential(1).replace('.', ',').replace('e-', '·10⁻').replace(/⁻(\d+)/, (m, d) => '⁻' + d.replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]));
    b.className = 'banner ' + (ok ? 'ok' : 'falla');
    b.innerHTML = ok
      ? `<span>Validación interna: ${res.correctas} de ${res.total} comprobaciones correctas. ${res.motores.join(' y ')} reproducen los valores de referencia de Python (diferencia máxima ${dif}).</span><button class="btn" id="banner-x" aria-label="Ocultar aviso">Ocultar</button>`
      : `<span>Validación interna: ${res.total - res.correctas} comprobaciones fallaron. Revise la consola del navegador.</span>`;
    const x = document.getElementById('banner-x');
    if (x) x.onclick = () => (b.className = 'banner');
    const pie = document.getElementById('val-txt');
    if (pie) pie.textContent = `${res.correctas}/${res.total} correctas`;
    if (!ok) console.table(res.detalle.filter(d => !d.ok));
    TL.VALIDACION = res;
  }

  TL.validar = validar;
  TL.mostrarValidacion = mostrar;
})(window);
