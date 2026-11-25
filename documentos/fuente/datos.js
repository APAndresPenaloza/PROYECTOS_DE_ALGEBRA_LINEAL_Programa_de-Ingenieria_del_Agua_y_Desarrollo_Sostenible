/* Datos y formato numérico compartidos por los documentos.
   Los números se leen de datos/referencia.json (Python) y datos/validacion_cruzada.json,
   de modo que el texto y el simulador usan exactamente los mismos valores. */
'use strict';
const path = require('path');
const fs = require('fs');
const RAIZ = path.resolve(__dirname, '..', '..');
const leer = f => JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8'));
const ref = leer('datos/referencia.json');
const val = leer('datos/validacion_cruzada.json');
const js = leer('datos/resultados_js.json');

const SITIO = 'https://apandrespenaloza.github.io/PROYECTOS_DE_ALGEBRA_LINEAL_Programa_de-Ingenieria_del_Agua_y_Desarrollo_Sostenible/';
const REPO = 'https://github.com/APAndresPenaloza/PROYECTOS_DE_ALGEBRA_LINEAL_Programa_de-Ingenieria_del_Agua_y_Desarrollo_Sostenible';

// Integrantes del grupo y profesores (portadas, pies y metadatos de los documentos)
const AUTORES = ['Andrés Mauricio Peñaloza Fernández', 'Eliana Carolina María Wong Lubo'];
const AUTORES_TEXTO = AUTORES.join(' y ');
const CURSO = 'Álgebra Lineal Aplicada';
const PROFESORES = {
  principal: 'PhD Ellery G. Chacuto López',   // autor de la guía del proyecto
  otros: [
    { curso: CURSO, nombres: 'Luis Mario Duarte' },
    { curso: 'Introducción a las Ciencias del Agua y a la Tecnología', nombres: 'Ing. Jaris González e Ing. David De León' },
  ],
};

/** Número en texto: coma decimal y signo menos tipográfico. */
function f(x, d = 4) {
  if (Math.abs(x) < 0.5 * 10 ** -d) x = 0;
  return x.toFixed(d).replace('.', ',').replace('-', '−');
}
/** Número en texto sin ceros sobrantes. */
function fc(x, d = 4) {
  let s = f(x, d);
  if (s.includes(',')) s = s.replace(/0+$/, '').replace(/,$/, '');
  return s;
}
/** Número en LaTeX: 4{,}6669 */
function fx(x, d = 4) {
  if (Math.abs(x) < 0.5 * 10 ** -d) x = 0;
  let s = x.toFixed(d);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', '{,}');
}
const vt = (p, d = 4) => '(' + p.map(a => fc(a, d)).join('; ') + ')';
const vx = (p, d = 4) => '\\left(' + p.map(a => fx(a, d)).join(';\\ ') + '\\right)';
const mx = (A, d = 4) => '\\begin{bmatrix}' + A.map(r => r.map(a => fx(a, d)).join(' & ')).join('\\\\ ') + '\\end{bmatrix}';
const colx = (p, d = 4) => '\\begin{bmatrix}' + p.map(a => fx(a, d)).join('\\\\ ') + '\\end{bmatrix}';
const exp10 = x => {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(x)), m = x / 10 ** e;
  return `${fc(m, 1)}·10${String(e).replace('-', '⁻').replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`;
};

// Velocidad de la animación y recorrido guiado: se leen del propio simulador
// para que el guion del video y el manual usen los mismos tiempos.
const vm = require('vm');
for (const m of ['js/ecuaciones/algebra.js', 'js/ecuaciones/catalogo.js', 'js/app/estado.js', 'js/grafico/animador.js', 'js/app/recorrido.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(RAIZ, m), 'utf8'), { filename: m });
}
const { RECORRIDO, Animador, ESTADO } = globalThis.TL;
const DURACION_BASE = Animador.DURACION_BASE, VELOCIDADES = ESTADO.VELOCIDADES;
/** Pasos del recorrido con su intervalo [desde, hasta] en segundos a la velocidad indicada. */
function guion(vel = 1) {
  let t0 = 0;
  return RECORRIDO.PASOS.map(P => { const d = RECORRIDO.duracion(P, vel); const r = { h: P.h, desde: t0, hasta: t0 + d }; t0 += d; return r; });
}
const mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
const duracionTexto = s => {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return (m ? `${m} minuto${m > 1 ? 's' : ''}` : '') + (m && r ? ' y ' : '') + (r ? `${r} segundo${r > 1 ? 's' : ''}` : '');
};
const velTexto = v => String(v).replace('.', ',') + '×';

const T = {}, C = {};
ref.transformaciones.forEach(t => (T[t.clave] = t));
ref.composiciones.forEach(c => (C[c.clave] = c));

module.exports = { ref, val, js, T, C, f, fc, fx, vt, vx, mx, colx, exp10, SITIO, REPO, ALFA: ref.alfa_grados, AUTORES, AUTORES_TEXTO, PROFESORES, CURSO,
  DURACION_BASE, VELOCIDADES, guion, mmss, duracionTexto, velTexto };
