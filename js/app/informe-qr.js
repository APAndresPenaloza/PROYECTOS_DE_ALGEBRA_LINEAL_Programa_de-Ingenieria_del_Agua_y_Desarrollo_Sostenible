/* ============================================================================
   informe-qr.js — Pestaña «Informe con QR»
   ----------------------------------------------------------------------------
   Arma un informe imprimible con los resultados de las transformaciones y
   composiciones elegidas (matrices, desarrollo paso a paso, propiedades, medidas
   y capturas del visor) y le agrega un código QR. Por defecto el QR reabre el
   simulador con exactamente los mismos valores (enlace reproducible).
   QR: biblioteca qrcode-generator de Kazuhiko Arase (licencia MIT).
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = raiz.TL;
  const AL = TL.AL, CAT = TL.CATALOGO, LX = TL.LATEX, AN = TL.ANALISIS, ES = TL.ESTADO;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const t = (x, d = 4) => LX.txt(x, d);
  const SITIO = 'https://apandrespenaloza.github.io/PROYECTOS_DE_ALGEBRA_LINEAL_Programa_de-Ingenieria_del_Agua_y_Desarrollo_Sostenible/';
  const REPO = 'https://github.com/APAndresPenaloza/PROYECTOS_DE_ALGEBRA_LINEAL_Programa_de-Ingenieria_del_Agua_y_Desarrollo_Sostenible';

  const CSS_HOJA = `
  .hoja{font-family:'Source Serif 4',Georgia,'Times New Roman',serif;color:#14212b;background:#fff;max-width:820px;margin:0 auto;padding:46px 54px;border:1px solid #cbd8df;border-radius:4px;box-shadow:0 10px 30px -18px rgba(13,33,50,.6);line-height:1.5;font-size:15px}
  .hoja h1,.hoja h2,.hoja h3{font-family:'Barlow Condensed','Barlow',system-ui,sans-serif;font-weight:600;line-height:1.15}
  .hoja h1{font-size:1.75rem;margin:0 0 6px}.hoja h2{font-size:1.25rem;margin:26px 0 6px;border-bottom:1px solid #cbd8df;padding-bottom:3px}
  .hoja h3{font-size:1.02rem;margin:14px 0 4px;color:#475a67}
  .h-cab{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start;border-bottom:2px solid #14212b;padding-bottom:14px}
  .h-sup{font-family:'Barlow',system-ui,sans-serif;font-size:.82rem;color:#475a67;margin:0 0 4px}
  .h-meta{font-family:'Barlow',system-ui,sans-serif;font-size:.9rem;color:#2b3d49;border-collapse:collapse}
  .h-meta td{padding:1px 10px 1px 0;vertical-align:top;text-align:left;border:0}.h-meta td:first-child{color:#73858f}
  .h-qr{text-align:center;font-family:'Barlow',system-ui,sans-serif;font-size:.72rem;color:#475a67;max-width:150px}
  .h-qr svg,.h-qr img{width:132px;height:132px;display:block;margin:0 auto 4px}
  .h-qr a{color:#475a67;word-break:break-all}
  .hoja table{border-collapse:collapse;width:100%;font-family:'Barlow',system-ui,sans-serif;font-size:.9rem;margin:6px 0;font-variant-numeric:tabular-nums}
  .hoja th{font-weight:600;text-align:right;border-bottom:1.5px solid #14212b;padding:4px 6px}
  .hoja td{text-align:right;border-bottom:1px solid #e1e9ee;padding:3px 6px}
  .hoja th:first-child,.hoja td:first-child{text-align:left}
  .hoja .txt{text-align:left}
  .h-cap{font-family:'Barlow',system-ui,sans-serif;font-size:.85rem;margin:12px 0 2px}.h-cap b{display:block}.h-cap i{display:block}
  .h-eq{overflow-x:auto;margin:4px 0}
  .h-int{background:#eef7f5;border-left:3px solid #00a888;padding:8px 12px;margin:8px 0}
  .h-fig img{width:100%;border-radius:3px;border:1px solid #cbd8df;display:block}
  .h-fig figcaption{font-family:'Barlow',system-ui,sans-serif;font-size:.84rem;color:#475a67;margin-top:4px}
  .h-fig{margin:10px 0 4px;break-inside:avoid}
  .h-obs p{margin:0 0 8px}
  .h-pie{margin-top:28px;padding-top:8px;border-top:1px solid #cbd8df;font-family:'Barlow',system-ui,sans-serif;font-size:.78rem;color:#73858f}
  .h-sec{break-inside:auto}
  @media print{.hoja{border:0;box-shadow:none;max-width:none;padding:0}.h-sec h2{break-after:avoid}}`;

  const INF = {
    ultimoModulo: 'r2',

    base() {
      const campo = document.getElementById('rep-base');
      if (campo && campo.value.trim()) return campo.value.trim().replace(/index\.html$/, '');
      return INF.baseAuto();
    },
    baseAuto() {
      // En GitHub Pages (el sitio original o una copia) se usa la dirección actual;
      // en cualquier otro caso (archivo local, servidor de pruebas, vista previa) la pública.
      const l = raiz.location;
      if (l.protocol === 'https:' && /\.github\.io$/.test(l.hostname)) return l.origin + l.pathname.replace(/index\.html$/, '');
      return SITIO;
    },

    iniciar() {
      const cont = $('#mod-rep');
      const hoy = new Date();
      const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      const chkT = CAT.PRESETS.map(p => `<label><input type="checkbox" data-incl="${p.clave}" checked> ${p.clave} · ${esc(p.corto)}</label>`).join('');
      const chkC = CAT.COMPOSICIONES.map(c => `<label><input type="checkbox" data-incl="${c.clave}" ${['C2', 'C4'].includes(c.clave) ? 'checked' : ''}> ${c.clave} · ${esc(c.titulo.split(' — ')[0])}</label>`).join('');
      cont.innerHTML = `
      <div class="rep-form">
        <section><h2>Datos del informe</h2>
          <p class="ayuda" style="margin:0 0 10px">Arma un informe con los resultados de las transformaciones que elija y le agrega un código QR. Por defecto el QR abre el simulador con exactamente los mismos valores, para que cualquiera pueda reproducir y revisar la simulación.</p>
          <label class="campo">Título<input id="rep-tit" value="Informe de simulación: transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua"></label>
          <label class="campo">Autor o autores<input id="rep-aut" placeholder="Nombres y apellidos de los integrantes"></label>
          <label class="campo">Institución, curso o grupo<input id="rep-ins" value="Álgebra Lineal, Programa de Ingeniería del Agua, Universidad de Santa Marta"></label>
          <label class="campo">Fecha<input type="date" id="rep-fecha" value="${fecha}"></label>
          <label class="campo">Observaciones y conclusiones<textarea id="rep-obs" placeholder="¿Qué transformación analizó? ¿Qué conserva y qué modifica? ¿Para qué decisión de ingeniería del agua sirve?"></textarea></label>
        </section>
        <section><h2>Contenido</h2>
          <h3 class="ayuda" style="margin:0 0 4px">Transformaciones del proyecto</h3><div class="chk dos">${chkT}</div>
          <h3 class="ayuda" style="margin:8px 0 4px">Composiciones</h3><div class="chk">${chkC}</div>
          <h3 class="ayuda" style="margin:8px 0 4px">Incluir</h3>
          <div class="chk">
            <label><input type="checkbox" id="rep-o-act" checked> El escenario actual del simulador</label>
            <label><input type="checkbox" id="rep-o-eq" checked> Matrices y desarrollo paso a paso</label>
            <label><input type="checkbox" id="rep-o-prop" checked> Propiedades y medidas antes y después</label>
            <label><input type="checkbox" id="rep-o-fig" checked> Capturas del visor 3D</label>
          </div>
        </section>
        <section><h2>Código QR</h2>
          <div class="chk">
            <label><input type="radio" name="rep-qr" value="sim" checked> Esta simulación, con los valores actuales</label>
            <label><input type="radio" name="rep-qr" value="inicio"> La página principal del simulador</label>
            <label><input type="radio" name="rep-qr" value="informe"> El informe del proyecto</label>
            <label><input type="radio" name="rep-qr" value="manual"> El manual de usuario</label>
            <label><input type="radio" name="rep-qr" value="escrito"> El escrito sobre la importancia de las transformaciones</label>
            <label><input type="radio" name="rep-qr" value="otra"> Otra dirección</label>
            <input type="url" id="rep-otra" class="campo" placeholder="https://…" aria-label="Otra dirección para el QR" style="padding:5px 8px;border:1px solid var(--linea);border-radius:5px">
          </div>
          <div class="qr-prev"><div class="qr" id="rep-qr"></div><div style="flex:1;min-width:0"><div class="enlace" id="rep-enlace"></div>
            <div class="fila-btn" style="margin-top:6px"><button class="btn" id="rep-copiar">Copiar enlace</button><button class="btn" id="rep-png">Descargar QR (PNG)</button></div></div></div>
          <label class="campo" style="margin-top:10px">Dirección pública del simulador<input type="url" id="rep-base" value="${esc(INF.baseAuto())}"></label>
          <p class="ayuda">Con esta dirección se construyen los enlaces del QR. Cámbiela solo si publicó su propia copia del simulador.</p>
        </section>
        <section><h2>Generar</h2>
          <div class="fila-btn"><button class="btn prim" id="rep-imprimir">Imprimir o guardar PDF</button><button class="btn" id="rep-html">Descargar informe (HTML)</button><button class="btn" id="rep-act">Actualizar vista previa</button></div>
          <p class="ayuda">Para obtener un PDF, elija «Guardar como PDF» como destino en el diálogo de impresión. <span id="rep-msg"></span></p>
        </section>
      </div>
      <div class="hoja-marco"><style>${CSS_HOJA}</style><div id="rep-hoja"></div></div>`;
      cont.addEventListener('input', e => { if (e.target.matches('#rep-tit,#rep-aut,#rep-ins,#rep-fecha,#rep-obs')) INF._encabezadoDiferido(); if (e.target.matches('#rep-otra,#rep-base')) INF.qr(); });
      cont.addEventListener('change', e => { if (e.target.name === 'rep-qr') INF.qr(); if (e.target.matches('[data-incl],#rep-o-act,#rep-o-eq,#rep-o-prop,#rep-o-fig')) INF.generar(); });
      $('#rep-copiar').onclick = () => {
        const u = INF.urlQR();
        const ok = () => ($('#rep-msg').textContent = 'Enlace copiado.');
        if (navigator.clipboard) navigator.clipboard.writeText(u).then(ok, () => prompt('Copie el enlace:', u)); else prompt('Copie el enlace:', u);
      };
      $('#rep-png').onclick = () => INF.descargarPNG();
      $('#rep-imprimir').onclick = () => { if (!INF.listo) INF.generar(); setTimeout(() => raiz.print(), 60); };
      $('#rep-html').onclick = () => INF.descargarHTML();
      $('#rep-act').onclick = () => INF.generar();
    },

    mostrar() {
      const m = TL.APP.E.modulo;
      if (!$('#rep-hoja')) INF.iniciar();
      INF.qr();
      INF.generar();
      return m;
    },

    urlQR() {
      const v = (document.querySelector('input[name="rep-qr"]:checked') || {}).value || 'sim';
      const b = INF.base().replace(/\/?$/, '/');
      if (v === 'sim') return b + ES.codificar(TL.APP.E, INF.ultimoModulo);
      if (v === 'inicio') return b;
      if (v === 'informe') return b + 'informe.html';
      if (v === 'manual') return b + 'manual.html';
      if (v === 'escrito') return b + 'escrito.html';
      return ($('#rep-otra').value || b).trim();
    },

    matrizQR(texto) {
      if (!raiz.qrcode) return null;
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      const q = qrcode(0, 'M');
      q.addData(texto);
      q.make();
      return q;
    },

    svgQR(texto) {
      const q = INF.matrizQR(texto);
      if (!q) return '<span>QR no disponible</span>';
      const n = q.getModuleCount(), m = 4, N = n + 2 * m;
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m},${r + m}h1v1h-1z`;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="Código QR"><rect width="${N}" height="${N}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    },

    qr() {
      const u = INF.urlQR();
      $('#rep-qr').innerHTML = INF.svgQR(u);
      $('#rep-enlace').textContent = u;
      const caja = document.querySelector('#rep-hoja .h-qr');
      if (caja) caja.innerHTML = INF.svgQR(u) + `<a href="${esc(u)}">${esc(u.length > 70 ? u.slice(0, 67) + '…' : u)}</a>`;
    },

    descargarPNG() {
      const q = INF.matrizQR(INF.urlQR());
      if (!q) return;
      const n = q.getModuleCount(), m = 4, px = 12, N = (n + 2 * m) * px;
      const c = document.createElement('canvas');
      c.width = c.height = N;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, N, N); g.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * px, (r + m) * px, px, px);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'qr_simulacion.png';
      document.body.appendChild(a); a.click(); a.remove();
    },

    _encabezadoDiferido() {
      clearTimeout(INF._tm);
      INF._tm = setTimeout(() => INF.generar(true), 350);
    },

    /* ---------------------------------------------------------- informe */
    casos() {
      const incl = k => { const el = document.querySelector(`[data-incl="${k}"]`); return el && el.checked; };
      const l = [];
      const E = TL.APP.E;
      if ($('#rep-o-act').checked) {
        const m = INF.ultimoModulo, s = E[m];
        const esPreset = (m === 'r2' || m === 'r3') && s.preset && ES.presetIntacto(s, m) && incl(s.preset);
        const esComp = m === 'comp' && E.comp.preset && incl(E.comp.preset);
        if (!esPreset && !esComp) l.push({ tipo: m === 'comp' ? 'comp' : 'lab', modulo: m, estado: ES.copia(m === 'comp' ? E.comp : s), actual: true });
      }
      CAT.PRESETS.forEach(p => { if (incl(p.clave)) l.push({ tipo: 'T', clave: p.clave }); });
      CAT.COMPOSICIONES.forEach(c => { if (incl(c.clave)) l.push({ tipo: 'C', clave: c.clave }); });
      return l;
    },

    generar(soloTexto = false) {
      INF.listo = true;
      const conFig = $('#rep-o-fig').checked && !soloTexto;
      if (soloTexto && INF._figs) { INF._pintar(INF._figs); return; }
      const figs = {};
      if (conFig) {
        $('#rep-msg').textContent = 'Generando capturas…';
        const E = TL.APP.E;
        INF.casos().forEach((c, i) => {
          try {
            figs[i] = TL.APP.capturar(INF._estadoDe(c, E));
          } catch (e) { figs[i] = null; }
        });
        $('#rep-msg').textContent = '';
      }
      INF._figs = conFig ? figs : null;
      INF._pintar(INF._figs);
    },

    _estadoDe(c, E) {
      const U = E.r2.puntos, V = E.r3.puntos;
      if (c.tipo === 'T') {
        const p = ES.preset(c.clave), m = p.n === 2 ? 'r2' : 'r3';
        return { modulo: m, [m]: { preset: p.clave, familia: p.familia, p: Object.assign(CAT.defectos(p.familia), p.p), puntos: p.n === 2 ? ES.copia(ES.U0) : ES.copia(ES.V0) } };
      }
      if (c.tipo === 'C') { const k = ES.compPreset(c.clave); return { modulo: 'comp', comp: { n: k.n, preset: k.clave, pasos: ES.copia(k.pasos) }, r2: Object.assign({}, E.r2, { puntos: ES.copia(ES.U0) }), r3: Object.assign({}, E.r3, { puntos: ES.copia(ES.V0) }) }; }
      if (c.tipo === 'comp') return { modulo: 'comp', comp: c.estado, r2: E.r2, r3: E.r3 };
      return { modulo: c.modulo, [c.modulo]: c.estado };
    },

    _pintar(figs) {
      $('#rep-hoja').innerHTML = INF.html('app', figs);
      INF.qr();
    },

    /** HTML del informe. salida = 'app' (KaTeX) o 'archivo' (MathML nativo, sin dependencias). */
    html(salida, figs) {
      const tx = (s, d = true) => {
        if (!raiz.katex) return esc(s);
        try { return katex.renderToString(s, { displayMode: d, throwOnError: false, output: salida === 'app' && !raiz.TL_MATHML ? 'htmlAndMathml' : 'mathml', strict: false }); } catch (e) { return esc(s); }
      };
      const conEq = $('#rep-o-eq').checked, conProp = $('#rep-o-prop').checked;
      const tit = $('#rep-tit').value.trim() || 'Informe de simulación';
      const aut = $('#rep-aut').value.trim(), ins = $('#rep-ins').value.trim(), fec = $('#rep-fecha').value, obs = $('#rep-obs').value.trim();
      const u = INF.urlQR();
      const fechaTxt = fec ? new Date(fec + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      let h = `<article class="hoja"><div class="h-cab"><div><p class="h-sup">Informe de simulación del proyecto de Álgebra Lineal</p><h1>${esc(tit)}</h1><table class="h-meta">` +
        (aut ? `<tr><td>Autor(es)</td><td>${esc(aut)}</td></tr>` : '') + (ins ? `<tr><td>Curso</td><td>${esc(ins)}</td></tr>` : '') +
        (fechaTxt ? `<tr><td>Fecha</td><td>${esc(fechaTxt)}</td></tr>` : '') +
        `<tr><td>Simulador</td><td>Transformaciones lineales en R² y R³, versión 1.0</td></tr>` +
        `<tr><td>Validación</td><td>${TL.VALIDACION ? `${TL.VALIDACION.correctas} de ${TL.VALIDACION.total} comprobaciones internas correctas` : 'pendiente'}</td></tr></table></div>` +
        `<div class="h-qr"></div></div>`;

      const casos = INF.casos();
      let sec = 0, fig = 0, tab = 0;
      // resumen
      const filasRes = casos.map(c => {
        const d = INF._datos(c);
        const cm = AN.conservaModifica(d.R.pr);
        return `<tr><td>${esc(d.titulo)}</td><td>${t(d.R.pr.det, 4)}</td><td class="txt">${cm.conserva.join(', ') || '—'}</td><td class="txt">${cm.modifica.join(', ') || '—'}</td></tr>`;
      }).join('');
      if (casos.length) {
        sec++; tab++;
        h += `<section class="h-sec"><h2>${sec}. Resumen</h2><p>El informe recoge ${casos.length} ${casos.length === 1 ? 'caso' : 'casos'} calculados en el navegador con el núcleo ${TL.WASM && TL.WASM.listo ? 'C++ compilado a WebAssembly, verificado contra el motor JavaScript' : 'JavaScript'}. La Tabla ${tab} resume qué conserva y qué modifica cada transformación.</p>` +
          `<p class="h-cap"><b>Tabla ${tab}</b><i>Determinante y propiedades geométricas de cada caso</i></p><table><thead><tr><th>Caso</th><th>det</th><th class="txt">Conserva</th><th class="txt">Modifica</th></tr></thead><tbody>${filasRes}</tbody></table></section>`;
      }
      casos.forEach((c, i) => {
        const d = INF._datos(c);
        sec++;
        h += `<section class="h-sec"><h2>${sec}. ${esc(d.titulo)}</h2>`;
        if (d.lectura) h += `<div class="h-int">${esc(d.lectura)}</div>`;
        if (conEq) {
          h += '<h3>Matriz y desarrollo</h3>';
          if (d.pasosTex) h += `<div class="h-eq">${tx(d.pasosTex)}</div>`;
          h += `<div class="h-eq">${tx('A = ' + LX.matriz(d.M, 4))}</div>`;
          d.P.forEach((p, k) => { h += `<div class="h-eq">${tx(LX.pasoAPaso(d.M, p, (d.n === 2 ? 'u' : 'v') + (k + 1), 4))}</div>`; });
        }
        if (conProp) {
          tab++;
          h += `<p class="h-cap"><b>Tabla ${tab}</b><i>Imágenes de los puntos y medidas antes y después</i></p><table><thead><tr><th>Punto</th><th>Original</th><th>Imagen</th></tr></thead><tbody>` +
            d.P.map((p, k) => `<tr><td>${d.nom[k]}</td><td>(${p.map(a => t(a, 3)).join('; ')})</td><td>(${d.R.Q[k].map(a => t(a, 4)).join('; ')})</td></tr>`).join('');
          const m = d.R.medidas;
          if (m) {
            h += `<tr><td>Distancia ${d.nom[0]}–${d.nom[1]}</td><td>${t(m.distancia[0], 4)} km</td><td>${t(m.distancia[1], 4)} km</td></tr>`;
            h += `<tr><td>Área O-${d.nom[0]}-${d.nom[1]}</td><td>${t(m.area[0], 4)} km²</td><td>${t(m.area[1], 4)} km²</td></tr>`;
            if (m.pendiente) h += `<tr><td>Pendiente ${d.nom[1]} → ${d.nom[0]}</td><td>${t(m.pendiente[0], 4)}</td><td>${t(m.pendiente[1], 4)}</td></tr>`;
          }
          h += '</tbody></table>';
          tab++;
          h += `<p class="h-cap"><b>Tabla ${tab}</b><i>Propiedades de la matriz con su lectura hidráulica</i></p><table><tbody>` +
            AN.filas(d.R.pr).map(f => `<tr><td style="width:22%">${tx(f.k, false)}</td><td style="text-align:left">${tx(f.v, false)}<br><span style="color:#475a67">${esc(f.t)}</span></td></tr>`).join('') + '</tbody></table>';
        }
        if (figs && figs[i]) {
          fig++;
          h += `<figure class="h-fig"><img src="${figs[i]}" alt="Captura del simulador: ${esc(d.titulo)}"><figcaption><b>Figura ${fig}.</b> Vista del simulador al final de la animación. Azul: conjunto original; naranja: imagen; flechas blancas: columnas de A.</figcaption></figure>`;
        }
        h += '</section>';
      });
      if (obs) { sec++; h += `<section class="h-sec"><h2>${sec}. Observaciones y conclusiones</h2><div class="h-obs">${obs.split(/\n\s*\n/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('')}</div></section>`; }
      h += `<p class="h-pie">Generado con el simulador 3D de transformaciones lineales en R² y R³ (HTML, CSS, JavaScript, C++/WebAssembly y three.js). El código QR contiene solo la dirección y los valores numéricos de la simulación. Proyecto: ${esc(REPO)}</p></article>`;
      return h;
    },

    _datos(c) {
      const E = TL.APP.E;
      let M, P, n, titulo, lectura, pasosTex = '';
      if (c.tipo === 'T' || c.tipo === 'lab') {
        let fam, p;
        if (c.tipo === 'T') { const pr = ES.preset(c.clave); fam = pr.familia; p = Object.assign(CAT.defectos(fam), pr.p); n = pr.n; titulo = `${pr.clave} · ${pr.titulo}`; P = n === 2 ? ES.U0 : ES.V0; }
        else { fam = c.estado.familia; p = c.estado.p; n = CAT.porId[fam].n; titulo = `Escenario actual: ${CAT.porId[fam].nombre} (laboratorio)`; P = c.estado.puntos; }
        const F = CAT.porId[fam];
        M = F.matriz(p);
        lectura = F.interpretar(p);
      } else {
        const comp = c.tipo === 'C' ? (() => { const k = ES.compPreset(c.clave); return { n: k.n, pasos: k.pasos, k }; })() : c.estado;
        n = comp.n;
        M = CAT.productoPasos(comp.pasos, n);
        P = n === 2 ? (c.tipo === 'C' ? ES.U0 : E.r2.puntos) : (c.tipo === 'C' ? ES.V0 : E.r3.puntos);
        titulo = c.tipo === 'C' ? `${comp.k.clave} · ${comp.k.titulo}` : 'Escenario actual: composición';
        lectura = c.tipo === 'C' ? comp.k.lectura : '';
        const mats = comp.pasos.map(s => CAT.porId[s.familia].matriz(s.p));
        pasosTex = 'M = ' + mats.map((_, i) => `A_{${mats.length - i}}`).join('\\,') + ' = ' + mats.slice().reverse().map(A => LX.matriz(A, 3)).join('');
        const Mi = CAT.productoPasos(comp.pasos, n, true);
        lectura += AL.iguales(M, Mi, 1e-12) ? ' En orden inverso se obtiene la misma matriz: conmutan.' : ' En orden inverso la matriz cambia: no conmutan.';
      }
      const R = TL.APP.calcular(M, P);
      const l = n === 2 ? 'u' : 'v';
      return { M, P, n, R, titulo, lectura, pasosTex, nom: P.map((_, k) => l + '₁₂₃₄₅₆₇₈₉'[k] ) };
    },

    descargarHTML() {
      if (!INF.listo) INF.generar();
      const doc = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
        `<title>${esc($('#rep-tit').value)}</title><style>${CSS_HOJA}\nbody{margin:0;background:#d9e1e6;padding:24px}@media print{body{background:#fff;padding:0}}</style></head><body>` +
        INF.html('archivo', INF._figs) + '</body></html>';
      const tmp = document.createElement('div');
      tmp.innerHTML = doc;
      const a = document.createElement('a');
      const conQR = doc.replace('<div class="h-qr"></div>', `<div class="h-qr">${INF.svgQR(INF.urlQR())}<a href="${esc(INF.urlQR())}">${esc(INF.urlQR())}</a></div>`);
      a.href = URL.createObjectURL(new Blob([conQR], { type: 'text/html;charset=utf-8' }));
      a.download = 'informe_simulacion_transformaciones.html';
      document.body.appendChild(a); a.click(); a.remove();
      $('#rep-msg').textContent = 'Informe descargado.';
    },
  };

  TL.INFORME = INF;
})(window);
