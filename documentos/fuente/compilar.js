/* ============================================================================
   compilar.js — Compilador de documentos del proyecto (Node.js)
   ----------------------------------------------------------------------------
   Un mismo contenido (bloques en informe.js, manual.js y escrito.js) se publica:
     · en Word (.docx) con normas APA 7 y ecuaciones nativas de Word (docx-js);
     · en HTML para GitHub Pages, con las ecuaciones ya compuestas por KaTeX.
   Los PDF se obtienen después: los documentos APA desde el .docx (LibreOffice) y
   el manual desde el HTML (Chrome).
   Uso:  node compilar.js [informe|manual|escrito ...]
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const docx = require('docx');
const dmath = require('docx/math');
const katex = require(path.join(RAIZ, 'lib/katex/katex.min.js'));
const { SITIO, REPO } = require('./datos.js');

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType,
  BorderStyle, ImageRun, Header, PageNumber, PageBreak, ExternalHyperlink, VerticalAlign, TableLayoutType, LineRuleType,
} = docx;
const MathDocx = dmath.Math || docx.Math;

/* ------------------------------------------------------------ marcado en línea
   *cursiva*  **negrita**  $matemática$  [texto](url)  `código` */
function tokenizar(s) {
  const out = [];
  const re = /(\$[^$]+\$)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)]+\))|(`[^`]+`)/g;
  let i = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > i) out.push({ t: 'txt', v: s.slice(i, m.index) });
    const x = m[0];
    if (m[1]) out.push({ t: 'mat', v: x.slice(1, -1) });
    else if (m[2]) out.push({ t: 'neg', v: x.slice(2, -2) });
    else if (m[3]) out.push({ t: 'cur', v: x.slice(1, -1) });
    else if (m[4]) { const k = x.indexOf(']('); out.push({ t: 'enl', v: x.slice(1, k), url: x.slice(k + 2, -1) }); }
    else out.push({ t: 'cod', v: x.slice(1, -1) });
    i = m.index + x.length;
  }
  if (i < s.length) out.push({ t: 'txt', v: s.slice(i) });
  return out;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// VISTA_PREVIA=1: MathML nativo y fuentes de Google (para la vista previa alojada fuera de GitHub Pages)
const VISTA = !!process.env.VISTA_PREVIA;
const SALIDA = process.env.SALIDA_HTML || RAIZ;
function texHTML(t, display) {
  return katex.renderToString(t, { displayMode: display, throwOnError: false, output: VISTA ? 'mathml' : 'htmlAndMathml', strict: false });
}
function enLineaHTML(s) {
  return tokenizar(s).map(k => {
    if (k.t === 'txt') return esc(k.v);
    if (k.t === 'mat') return texHTML(k.v, false);
    if (k.t === 'neg') return '<strong>' + enLineaHTML(k.v) + '</strong>';
    if (k.t === 'cur') return '<em>' + enLineaHTML(k.v) + '</em>';
    if (k.t === 'cod') return '<code>' + esc(k.v) + '</code>';
    return `<a href="${esc(k.url)}">${esc(k.v)}</a>`;
  }).join('');
}

// La notación de los documentos usa \det, |x| y coma decimal; Word (y LibreOffice) necesitan formas explícitas.
function texParaWord(t) {
  return t.replace(/\\det\b/g, '\\mathrm{det}').replace(/\|([^|]+)\|/g, '\\left|$1\\right|');
}
function mathDocx(t) {
  try { return new MathDocx({ children: dmath.latexToMath(texParaWord(t)) }); }
  catch (e) { console.warn('  ! LaTeX no convertido:', t.slice(0, 80), '→', e.message.slice(0, 80)); return new TextRun({ text: t, italics: true }); }
}
function enLineaDocx(s, base = {}) {
  const out = [];
  tokenizar(s).forEach(k => {
    if (k.t === 'txt') out.push(new TextRun(Object.assign({ text: k.v }, base)));
    else if (k.t === 'mat') out.push(mathDocx(k.v));
    else if (k.t === 'neg') out.push(...enLineaDocx(k.v, Object.assign({}, base, { bold: true })));
    else if (k.t === 'cur') out.push(...enLineaDocx(k.v, Object.assign({}, base, { italics: !base.italics })));
    else if (k.t === 'cod') out.push(new TextRun(Object.assign({ text: k.v, font: 'Consolas', size: 20 }, base)));
    else out.push(new ExternalHyperlink({ link: k.url, children: [new TextRun(Object.assign({ text: k.v, style: 'Hyperlink' }, base))] }));
  });
  return out;
}

/* ------------------------------------------------------------------ DOCX (APA 7) */
const TNR = 'Times New Roman';
const SANGRIA = 720;              // 0,5 in
const ANCHO_TEXTO = 9360;         // 6,5 in en DXA (carta con márgenes de 1 in)
const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const linea = { style: BorderStyle.SINGLE, size: 8, color: '000000' };

function parrafo(texto, op = {}) {
  return new Paragraph(Object.assign({
    indent: op.sinSangria ? undefined : { firstLine: SANGRIA },
    children: enLineaDocx(texto, op.run || {}),
  }, op.par || {}));
}

function celda(texto, ancho, op = {}) {
  const hijos = (Array.isArray(texto) ? texto : [texto]).map(t => new Paragraph({
    alignment: op.alinear === 'r' ? AlignmentType.RIGHT : op.alinear === 'c' ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { line: 276, lineRule: LineRuleType.AUTO, before: 40, after: 40 },
    children: enLineaDocx(String(t), op.run || {}),
  }));
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    borders: { top: op.arriba ? linea : sinBorde, bottom: op.abajo ? linea : sinBorde, left: sinBorde, right: sinBorde },
    verticalAlign: VerticalAlign.CENTER,
    margins: { left: 80, right: 80 },
    children: hijos,
  });
}

function tablaDocx(b) {
  const nc = b.cab.length;
  const anchos = (b.anchos || Array(nc).fill(1)).map(x => x);
  const suma = anchos.reduce((a, c) => a + c, 0);
  const cols = anchos.map(a => Math.floor((a / suma) * ANCHO_TEXTO));
  cols[cols.length - 1] += ANCHO_TEXTO - cols.reduce((a, c) => a + c, 0);
  const al = b.alinear || Array(nc).fill('l');
  const filas = [new TableRow({ tableHeader: true, children: b.cab.map((c, j) => celda(c, cols[j], { arriba: true, abajo: true, alinear: al[j] === 'r' ? 'r' : al[j], run: { bold: true } })) })];
  b.filas.forEach((f, i) => filas.push(new TableRow({ cantSplit: true, children: f.map((c, j) => celda(c, cols[j], { abajo: i === b.filas.length - 1, alinear: al[j] })) })));
  const out = [
    new Paragraph({ keepNext: true, children: [new TextRun({ text: `Tabla ${b.n}`, bold: true })] }),
    new Paragraph({ keepNext: true, children: enLineaDocx(b.titulo, { italics: true }) }),
    new Table({ width: { size: ANCHO_TEXTO, type: WidthType.DXA }, columnWidths: cols, layout: TableLayoutType.FIXED, rows: filas }),
  ];
  if (b.nota) out.push(new Paragraph({ children: [new TextRun({ text: 'Nota. ', italics: true }), ...enLineaDocx(b.nota)] }));
  else out.push(new Paragraph({ children: [] }));
  return out;
}

function figuraDocx(b) {
  const ruta = path.join(RAIZ, b.src);
  const datos = fs.readFileSync(ruta);
  const dim = tamanoImagen(datos);
  const anchoMax = (b.ancho || 1) * 600;
  const w = Math.min(anchoMax, dim.w), h = Math.round(dim.h * (w / dim.w));
  const out = [
    new Paragraph({ keepNext: true, children: [new TextRun({ text: `Figura ${b.n}`, bold: true })] }),
    new Paragraph({ keepNext: true, children: enLineaDocx(b.titulo, { italics: true }) }),
    new Paragraph({ keepNext: true, alignment: AlignmentType.CENTER, spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 120, after: 120 }, children: [new ImageRun({ type: ruta.endsWith('.png') ? 'png' : 'jpg', data: datos, transformation: { width: w, height: h }, altText: { title: `Figura ${b.n}`, description: b.titulo, name: `figura${b.n}` } })] }),
  ];
  if (b.nota) out.push(new Paragraph({ children: [new TextRun({ text: 'Nota. ', italics: true }), ...enLineaDocx(b.nota)] }));
  return out;
}

function tamanoImagen(buf) {
  if (buf[0] === 0x89) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  let i = 2;
  while (i < buf.length) {
    const marca = buf[i + 1], largo = buf.readUInt16BE(i + 2);
    if (marca >= 0xc0 && marca <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + largo;
  }
  return { w: 800, h: 600 };
}

function ecuacionDocx(b) {
  const m = mathDocx(b.tex);
  if (!b.n) return [new Paragraph({ alignment: AlignmentType.CENTER, children: [m] })];
  const c1 = Math.round(ANCHO_TEXTO * 0.12), c2 = ANCHO_TEXTO - 2 * c1;
  const vacia = w => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde }, children: [new Paragraph({ children: [] })] });
  return [new Table({
    width: { size: ANCHO_TEXTO, type: WidthType.DXA }, columnWidths: [c1, c2, c1], layout: TableLayoutType.FIXED,
    borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde },
    rows: [new TableRow({ cantSplit: true, children: [
      vacia(c1),
      new TableCell({ width: { size: c2, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [m] })] }),
      new TableCell({ width: { size: c1, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(`(${b.n})`)] })] }),
    ] })],
  })];
}

function docxDe(doc) {
  const hijos = [];
  let numLista = 0;
  // Los saltos de página se aplican como «salto de página anterior» en el párrafo
  // siguiente: un párrafo que solo contiene un salto deja una línea vacía al inicio
  // de la página nueva y, si lo que sigue ocupa una página justa, una hoja en blanco.
  let romper = false;
  const conSalto = o => { if (romper) { o.pageBreakBefore = true; romper = false; } return o; };
  const ABSORBEN = new Set(['titulo', 'h1', 'h2', 'h3', 'resumen', 'refs', 'apendice', 'salto']);
  doc.bloques.forEach(b => {
    if (romper && !ABSORBEN.has(b.t)) { hijos.push(new Paragraph({ children: [new PageBreak()] })); romper = false; }
    switch (b.t) {
      case 'portada':
        for (let k = 0; k < 3; k++) hijos.push(new Paragraph({ children: [] }));
        hijos.push(new Paragraph({ alignment: AlignmentType.CENTER, children: enLineaDocx(b.titulo, { bold: true }) }));
        hijos.push(new Paragraph({ children: [] }));
        // Profesores: «Profesores de <curso>: <nombres>»; los nombres no se parten entre líneas
        // (espacios duros), así un renglón largo se corta después de los dos puntos.
        const profesores = [].concat(b.profesor || []).map(x => typeof x === 'string' ? x : `Profesores de ${x.curso}: ${x.nombres.replace(/ /g, '\u00a0')}`);
        [[].concat(b.autor || []).join(' y '), b.afiliacion, b.curso, ...profesores, b.fecha].filter(Boolean).forEach(l => hijos.push(new Paragraph({ alignment: AlignmentType.CENTER, children: enLineaDocx(l) })));
        romper = true;
        break;
      case 'resumen':
        hijos.push(new Paragraph(conSalto({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Resumen', bold: true })] })));
        b.texto.forEach(t => hijos.push(parrafo(t, { sinSangria: true })));
        hijos.push(new Paragraph({ indent: { firstLine: SANGRIA }, children: [new TextRun({ text: 'Palabras clave: ', italics: true }), ...enLineaDocx(b.palabras)] }));
        romper = true;
        break;
      case 'titulo':
        hijos.push(new Paragraph(conSalto({ alignment: AlignmentType.CENTER, children: enLineaDocx(b.texto, { bold: true }) })));
        break;
      case 'h1':
        hijos.push(new Paragraph(conSalto({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, keepNext: true, children: enLineaDocx(b.texto, { bold: true }) })));
        break;
      case 'h2':
        hijos.push(new Paragraph(conSalto({ heading: HeadingLevel.HEADING_2, keepNext: true, children: enLineaDocx(b.texto, { bold: true }) })));
        break;
      case 'h3':
        hijos.push(new Paragraph(conSalto({ heading: HeadingLevel.HEADING_3, keepNext: true, children: enLineaDocx(b.texto, { bold: true, italics: true }) })));
        break;
      case 'p':
        hijos.push(parrafo(b.texto, { sinSangria: b.sinSangria }));
        break;
      case 'eq':
        hijos.push(...ecuacionDocx(b));
        break;
      case 'lista':
        numLista++;
        b.items.forEach((it, i) => hijos.push(new Paragraph({
          numbering: b.orden ? { reference: 'numerada', level: 0, instance: numLista } : { reference: 'vinetas', level: 0 },
          children: enLineaDocx(it),
        })));
        break;
      case 'tabla':
        hijos.push(...tablaDocx(b));
        break;
      case 'figura':
        hijos.push(...figuraDocx(b));
        break;
      case 'codigo':
        b.texto.split('\n').forEach(l => hijos.push(new Paragraph({ spacing: { line: 240, lineRule: LineRuleType.AUTO }, children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18 })] })));
        hijos.push(new Paragraph({ children: [] }));
        break;
      case 'salto':
        romper = true;
        break;
      case 'refs':
        romper = true;
        hijos.push(new Paragraph(conSalto({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, keepNext: true, children: [new TextRun({ text: b.titulo || 'Referencias', bold: true })] })));
        b.items.forEach(r => hijos.push(new Paragraph({ indent: { left: SANGRIA, hanging: SANGRIA }, children: enLineaDocx(r) })));
        break;
      case 'apendice':
        romper = true;
        hijos.push(new Paragraph(conSalto({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, keepNext: true, children: [new TextRun({ text: `Apéndice ${b.letra}`, bold: true })] })));
        hijos.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: enLineaDocx(b.titulo, { bold: true }) }));
        break;
      case 'solo-html':
        break;
      default:
        throw new Error('Bloque desconocido: ' + b.t);
    }
  });

  const encabezado = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] });
  return new Document({
    creator: doc.autor, title: doc.titulo, description: doc.descripcion, language: 'es-CO',
    styles: {
      default: {
        document: { run: { font: TNR, size: 24, language: { value: 'es-CO' } }, paragraph: { spacing: { line: 480, lineRule: LineRuleType.AUTO, before: 0, after: 0 } } },
        heading1: { run: { font: TNR, size: 24, bold: true, color: '000000' }, paragraph: { alignment: AlignmentType.CENTER, spacing: { line: 480, before: 0, after: 0 }, keepNext: true } },
        heading2: { run: { font: TNR, size: 24, bold: true, color: '000000' }, paragraph: { spacing: { line: 480, before: 0, after: 0 }, keepNext: true } },
        heading3: { run: { font: TNR, size: 24, bold: true, italics: true, color: '000000' }, paragraph: { spacing: { line: 480, before: 0, after: 0 }, keepNext: true } },
      },
      characterStyles: [{ id: 'Hyperlink', name: 'Hyperlink', basedOn: 'DefaultParagraphFont', run: { color: '1F4E79', underline: {} } }],
    },
    numbering: {
      config: [
        { reference: 'vinetas', levels: [{ level: 0, format: docx.LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: 'numerada', levels: [{ level: 0, format: docx.LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440, header: 708 } } },
      headers: { default: encabezado },
      children: hijos,
    }],
  });
}

/* ------------------------------------------------------------------------ HTML */
function htmlDe(doc) {
  let cuerpo = '', indice = [];
  let idH = 0;
  const slug = t => 's' + (++idH);
  const nombresHTML = t => t.split(/ (y|e) /).map((x, i) => i % 2 ? ` ${x} ` : enLineaHTML(x).replace(/ /g, '&nbsp;')).join('');
  doc.bloques.forEach(b => {
    switch (b.t) {
      case 'portada':
        cuerpo += `<header class="doc-portada"><p class="doc-tipo">${esc(doc.tipo)}</p><h1>${enLineaHTML(b.titulo)}</h1>` +
          `<dl class="doc-meta">${b.autor ? `<dt>${[].concat(b.autor).length > 1 ? 'Autores' : 'Autor'}</dt><dd>${[].concat(b.autor).map(enLineaHTML).join('<br>')}</dd>` : ''}${b.afiliacion ? `<dt>Programa</dt><dd>${enLineaHTML(b.afiliacion)}</dd>` : ''}` +
          `${b.curso ? `<dt>Curso</dt><dd>${enLineaHTML(b.curso)}</dd>` : ''}${b.profesor ? `<dt>${[].concat(b.profesor).length > 1 ? 'Profesores' : 'Profesor'}</dt><dd>${[].concat(b.profesor).map(x => typeof x === 'string' ? enLineaHTML(x) : `${enLineaHTML(x.curso)}: ${nombresHTML(x.nombres)}`).join('<br>')}</dd>` : ''}${b.fecha ? `<dt>Fecha</dt><dd>${enLineaHTML(b.fecha)}</dd>` : ''}</dl>` +
          `<div class="doc-descargas">${(VISTA ? [] : doc.descargas || []).map(d => `<a class="btn-doc" href="${esc(d.href)}" download>${esc(d.texto)}</a>`).join('')}</div>` +
          (doc.qr ? `<figure class="doc-qr"><img src="${esc(doc.qr.src)}" alt="Código QR: ${esc(doc.qr.alt)}" width="112" height="112"><figcaption>${esc(doc.qr.texto)}</figcaption></figure>` : '') + '</header>';
        break;
      case 'resumen':
        cuerpo += `<section class="doc-resumen"><h2 id="resumen">Resumen</h2>${b.texto.map(t => `<p>${enLineaHTML(t)}</p>`).join('')}<p class="clave"><em>Palabras clave:</em> ${enLineaHTML(b.palabras)}</p></section>`;
        indice.push({ n: 2, id: 'resumen', t: 'Resumen' });
        break;
      case 'titulo':
        break;
      case 'h1': case 'h2': case 'h3': {
        const id = slug(b.texto), nivel = { h1: 2, h2: 3, h3: 4 }[b.t];
        cuerpo += `<h${nivel} id="${id}">${enLineaHTML(b.texto)}</h${nivel}>`;
        if (nivel <= 3) indice.push({ n: nivel, id, t: b.texto.replace(/\$[^$]*\$/g, m => m.slice(1, -1)).replace(/\*/g, '') });
        break;
      }
      case 'p':
        cuerpo += `<p${b.sinSangria ? ' class="sin"' : ''}>${enLineaHTML(b.texto)}</p>`;
        break;
      case 'eq':
        cuerpo += `<div class="doc-eq">${texHTML(b.tex, true)}${b.n ? `<span class="num">(${b.n})</span>` : ''}</div>`;
        break;
      case 'lista':
        cuerpo += `<${b.orden ? 'ol' : 'ul'}>${b.items.map(i => `<li>${enLineaHTML(i)}</li>`).join('')}</${b.orden ? 'ol' : 'ul'}>`;
        break;
      case 'tabla': {
        const al = b.alinear || [];
        cuerpo += `<figure class="doc-tabla" id="tabla-${b.n}"><p class="cap"><strong>Tabla ${b.n}</strong><em>${enLineaHTML(b.titulo)}</em></p><div class="tab-scroll"><table><thead><tr>` +
          b.cab.map((c, j) => `<th class="${al[j] || 'l'}">${enLineaHTML(c)}</th>`).join('') + '</tr></thead><tbody>' +
          b.filas.map(f => '<tr>' + f.map((c, j) => `<td class="${al[j] || 'l'}">${enLineaHTML(String(c))}</td>`).join('') + '</tr>').join('') +
          `</tbody></table></div>${b.nota ? `<p class="nota"><em>Nota.</em> ${enLineaHTML(b.nota)}</p>` : ''}</figure>`;
        break;
      }
      case 'figura':
        cuerpo += `<figure class="doc-figura" id="figura-${b.n}"><p class="cap"><strong>Figura ${b.n}</strong><em>${enLineaHTML(b.titulo)}</em></p>` +
          `<img src="${esc(b.src)}" alt="${esc(b.alt || b.titulo)}" loading="lazy">${b.nota ? `<p class="nota"><em>Nota.</em> ${enLineaHTML(b.nota)}</p>` : ''}</figure>`;
        break;
      case 'codigo':
        cuerpo += `<pre class="doc-codigo"><code>${esc(b.texto)}</code></pre>`;
        break;
      case 'salto':
        break;
      case 'refs':
        cuerpo += `<section class="doc-refs"><h2 id="referencias">${esc(b.titulo || 'Referencias')}</h2>${b.items.map(r => `<p>${enLineaHTML(r)}</p>`).join('')}</section>`;
        indice.push({ n: 2, id: 'referencias', t: b.titulo || 'Referencias' });
        break;
      case 'apendice': {
        const id = 'apendice-' + b.letra.toLowerCase();
        cuerpo += `<h2 id="${id}" class="apendice">Apéndice ${esc(b.letra)}. ${enLineaHTML(b.titulo)}</h2>`;
        indice.push({ n: 2, id, t: `Apéndice ${b.letra}` });
        break;
      }
      case 'solo-html':
        cuerpo += b.html;
        break;
      default:
        throw new Error('Bloque desconocido: ' + b.t);
    }
  });
  const nav = [['./', 'Simulador'], ['informe.html', 'Informe'], ['manual.html', 'Manual'], ['escrito.html', 'Escrito']]
    .map(([h, t]) => `<a href="${h}"${h === doc.archivo ? ' aria-current="page"' : ''}>${t}</a>`).join('') +
    `<a href="${REPO}" target="_blank" rel="noopener">Código en GitHub</a>`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.tituloCorto)}</title>
<meta name="description" content="${esc(doc.descripcion)}">
<meta name="author" content="${esc(doc.autor)}">
<meta name="theme-color" content="#13232f">
<link rel="icon" href="img/icono.svg" type="image/svg+xml">
${VISTA ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;1,400&family=Barlow+Condensed:wght@500;600&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap">' : '<link rel="stylesheet" href="lib/fuentes/fuentes.css">\n<link rel="stylesheet" href="lib/katex/katex.min.css">'}
<link rel="stylesheet" href="css/documentos.css">
</head>
<body>
<a class="saltar" href="#doc">Ir al contenido</a>
<header class="cabecera">
  <a class="marca" href="./"><img src="img/icono.svg" alt="" width="40" height="40"><span><b>Transformaciones lineales en R<sup>2</sup> y R<sup>3</sup></b><small>Ingeniería del agua, Universidad de Santa Marta</small></span></a>
  <nav class="sitio" aria-label="Documentos del proyecto">${nav}</nav>
</header>
<div class="doc-marco">
  <nav class="indice" aria-label="Contenido del documento"><p>Contenido</p><ol>${indice.map(i => `<li class="n${i.n}"><a href="#${i.id}">${esc(i.t)}</a></li>`).join('')}</ol></nav>
  <article class="documento" id="doc">
${cuerpo}
  </article>
</div>
<footer class="doc-pie"><p>${esc(doc.pie)}</p><p><a href="./">Abrir el simulador</a>. Código fuente: <a href="${REPO}">${esc(REPO.replace('https://', ''))}</a>.</p></footer>
</body>
</html>
`;
}

/* --------------------------------------------------------------------- main */
async function compilar(nombre) {
  const doc = require(`./${nombre}.js`);
  const html = htmlDe(doc);
  fs.writeFileSync(path.join(SALIDA, doc.archivo), html);
  if (doc.docx && !VISTA) {
    const buf = await Packer.toBuffer(docxDe(doc));
    fs.writeFileSync(path.join(RAIZ, 'documentos', doc.docx), buf);
  }
  console.log(`${nombre}: ${doc.archivo}${doc.docx ? ' y documentos/' + doc.docx : ''}`);
}

(async () => {
  const lista = process.argv.slice(2).length ? process.argv.slice(2) : ['informe', 'manual', 'escrito'];
  for (const n of lista) await compilar(n);
})().catch(e => { console.error(e); process.exit(1); });
