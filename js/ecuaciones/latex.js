/* ============================================================================
   latex.js — Motor de ecuaciones: generador de LaTeX (se dibuja con KaTeX)
   ----------------------------------------------------------------------------
   Produce la matriz simbólica y numérica, el producto paso a paso A·p para cada
   punto, las propiedades y las fórmulas por coordenadas. Usa coma decimal.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});

  /** Número en LaTeX con coma decimal: 0{,}9899. Quita ceros sobrantes si limpio = true. */
  function num(x, d = 4, limpio = true) {
    if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
    if (Math.abs(x) < 0.5 * 10 ** -d) x = 0;
    let s = x.toFixed(d);
    if (limpio && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.replace('.', '{,}');
  }

  /** Texto plano con coma decimal y signo menos tipográfico. */
  function txt(x, d = 4, limpio = true) {
    return num(x, d, limpio).replace('{,}', ',').replace('-', '−').replace('\\infty', '∞');
  }

  const par = (x, d) => (x < 0 ? `(${num(x, d)})` : num(x, d));

  function matriz(A, d = 4) {
    return '\\begin{bmatrix}' + A.map(f => f.map(a => num(a, d)).join(' & ')).join('\\\\ ') + '\\end{bmatrix}';
  }

  function vector(p, d = 4) {
    return '\\begin{bmatrix}' + p.map(a => num(a, d)).join('\\\\ ') + '\\end{bmatrix}';
  }

  function tupla(p, d = 4) {
    return '\\left(' + p.map(a => num(a, d)).join(';\\ ') + '\\right)';
  }

  /** L(\vec{u}_1) = A·u = [filas con productos] = resultado */
  function pasoAPaso(A, p, nombre, d = 4) {
    const filas = A.map(f => f.map((a, j) => `${num(a, d)}\\cdot ${par(p[j], d)}`).join(' + ').replace(/\+ -/g, '- '));
    const res = A.map(f => f.reduce((s, a, j) => s + a * p[j], 0));
    return `L(\\vec{${nombre[0]}}_{${nombre.slice(1)}}) = ${matriz(A, d)}${vector(p, d)} = ` +
      '\\begin{bmatrix}' + filas.join('\\\\ ') + '\\end{bmatrix} = ' + vector(res, d);
  }

  /** Fórmulas por coordenadas: x′ = a·x + b·y (+ c·z) */
  function coordenadas(A, d = 4) {
    const v = A.length === 2 ? ['x', 'y'] : ['x', 'y', 'z'];
    const lineas = A.map((f, i) => {
      let s = '';
      f.forEach((a, j) => {
        if (Math.abs(a) < 0.5 * 10 ** -d) return;
        const abs = Math.abs(a), coef = Math.abs(abs - 1) < 1e-12 ? '' : num(abs, d);
        s += (s ? (a < 0 ? ' - ' : ' + ') : a < 0 ? '-' : '') + coef + v[j];
      });
      return `${v[i]}' &= ${s || '0'}`;
    });
    return '\\begin{aligned}' + lineas.join('\\\\ ') + '\\end{aligned}';
  }

  function complejo(z, d = 4) {
    if (Math.abs(z.im) < 1e-12) return num(z.re, d);
    return `${num(z.re, d)} ${z.im < 0 ? '-' : '+'} ${num(Math.abs(z.im), d)}\\,i`;
  }

  TL.LATEX = { num, txt, matriz, vector, tupla, pasoAPaso, coordenadas, complejo };
})(typeof window !== 'undefined' ? window : globalThis);
