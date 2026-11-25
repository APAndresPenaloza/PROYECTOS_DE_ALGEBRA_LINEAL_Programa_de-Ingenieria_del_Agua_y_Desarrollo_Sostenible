/* ============================================================================
   interfaz.js — Controlador del simulador (módulos R², R³ y composición)
   ----------------------------------------------------------------------------
   Une el estado, el motor de ecuaciones (JS + C++/WASM) y el motor gráfico.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = raiz.TL;
  const AL = TL.AL, CAT = TL.CATALOGO, LX = TL.LATEX, AN = TL.ANALISIS, ES = TL.ESTADO;
  const $ = s => document.querySelector(s);
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const sub = s => String(s).replace(/\d/g, d => SUB[d]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const leerNum = v => parseFloat(String(v).trim().replace(/\s/g, '').replace(',', '.'));
  const t = (x, d = 4) => LX.txt(x, d);
  const ICONO = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
    pausa: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>',
  };

  function tex(cadena, display = true) {
    if (!raiz.katex) return '<code>' + esc(cadena) + '</code>';
    try { return katex.renderToString(cadena, { displayMode: display, throwOnError: false, output: raiz.TL_MATHML ? 'mathml' : 'htmlAndMathml', strict: false }); } catch (e) { return '<code>' + esc(cadena) + '</code>'; }
  }

  const APP = {
    E: null, escena: null, anim: null, motorWasm: false,

    /* ======================================================== inicio */
    iniciar(estado) {
      this.E = estado;
      this.escena = new TL.Escena($('#lienzo'));
      this.anim = new TL.Animador((M, tt) => this._aplicarT(M, tt));
      this.escena.alDibujar = () => this._overlays();
      this._crearCajetin();
      this._enlazarVisor();
      this._enlazarPestanas();
      this.cambiarModulo(this.E.modulo, { animar: true, inicial: true });
    },

    /* ============================================ velocidad de la animación */
    fijarVelocidad(v) {
      if (!ES.VELOCIDADES.includes(v)) return;
      this.E.vel = v;
      this._sincVelocidad();
      try { localStorage.setItem('tl-velocidad', String(v)); } catch (e) { /* almacenamiento no disponible */ }
      this._guardarURL();
      if (TL.RECORRIDO && TL.RECORRIDO.activo) TL.RECORRIDO.reprogramar();
    },

    _sincVelocidad() {
      if (!ES.VELOCIDADES.includes(this.E.vel)) this.E.vel = 1;
      this.anim.velocidad = this.E.vel;
      const sel = $('#t-vel');
      if (sel && sel.value !== String(this.E.vel)) sel.value = String(this.E.vel);
    },

    /* ====================================================== módulos */
    cambiarModulo(m, op = {}) {
      this._sincVelocidad();
      if (m === 'rep' && this.E.modulo !== 'rep' && TL.INFORME) TL.INFORME.ultimoModulo = this.E.modulo;
      this.E.modulo = m;
      document.querySelectorAll('.pestanas [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mod === m)));
      document.body.classList.toggle('tab-rep', m === 'rep');
      $('#banco').hidden = m === 'rep';
      $('#mod-rep').hidden = m !== 'rep';
      if (m === 'rep') { if (TL.INFORME) TL.INFORME.mostrar(); this._guardarURL(); return; }
      const n = this.n();
      this.escena.fijarCapas(this.E.capas);
      if (this.escena.n !== n || op.inicial) this.escena.modo(n, !!op.inicial);
      this.escena.fijarPuntos(this.puntos(), this.nombres());
      this.renderMando();
      this.recalcular({ animar: op.animar !== false, encuadrar: true });
    },

    n() { return this.E.modulo === 'r3' || (this.E.modulo === 'comp' && this.E.comp.n === 3) ? 3 : 2; },
    s() { return this.E[this.E.modulo]; },
    puntos() {
      if (this.E.modulo === 'comp') return this.E.comp.n === 3 ? this.E.r3.puntos : this.E.r2.puntos;
      return this.s().puntos;
    },
    nombres() {
      const l = this.n() === 2 ? 'u' : 'v';
      return this.puntos().map((_, k) => l + sub(k + 1));
    },

    /** Matriz final del escenario activo (JS). */
    matriz() {
      if (this.E.modulo === 'comp') return CAT.productoPasos(this.E.comp.pasos, this.E.comp.n);
      const s = this.s();
      return CAT.porId[s.familia].matriz(s.p);
    },

    /** Camino M(t) para el animador. */
    camino() {
      if (this.E.modulo === 'comp') {
        const pasos = this.E.comp.pasos, n = this.E.comp.n;
        return [tt => {
          const k = Math.min(Math.floor(tt), pasos.length - 1), f = tt - k;
          let P = AL.identidad(n);
          for (let i = 0; i < k; i++) P = AL.producto(CAT.porId[pasos[i].familia].matriz(pasos[i].p), P);
          return AL.producto(CAT.porId[pasos[k].familia].camino(pasos[k].p, f), P);
        }, pasos.length];
      }
      const s = this.s(), F = CAT.porId[s.familia];
      return [tt => F.camino(s.p, tt), 1];
    },

    /** Cálculo oficial de un caso: C++ (WebAssembly) si está disponible, si no JavaScript. */
    calcular(M, P) {
      const Qj = P.map(p => AL.aplicar(M, p));
      const prj = AL.propiedades(M);
      let Q = Qj, motor = 'JavaScript', dif = null;
      if (TL.WASM && TL.WASM.listo) {
        Q = TL.WASM.aplicar(M, P);
        const prc = TL.WASM.propiedades(M);
        dif = TL.WASM.comparar(M, P);
        motor = 'C++ (WebAssembly)';
        prj.det = prc.det;   // los valores mostrados provienen del núcleo C++
      }
      return { M, Q, pr: prj, motor, dif, medidas: AN.medidas(P, Q) };
    },

    /* =================================================== recálculo */
    recalcular(op = {}) {
      const M = this.matriz();
      const [camino, tramos] = this.camino();
      this.anim.pausar();
      this.anim.cargar(camino, tramos);
      const pr = AL.propiedades(M);
      this.escena.fijarPropios(pr.espaciosPropios);
      this.escena.fijarTrayectorias(this.puntos().map(p => this.anim.trayectoria(this.n() === 2 ? [p[0], p[1], 0] : p)));
      if (op.encuadrar) {
        const vistaPreferida = this._vistaPreferida();
        if (vistaPreferida && vistaPreferida !== this.escena.vistaActual) this.escena.vista(vistaPreferida, false);
        this.escena.encuadrar(M, !op.inicial);
        this._marcarVista();
      }
      this.renderCalculo();
      this._guardarURL();
      $('#t-rango').max = String(tramos);
      if (op.animar) this.animar();
      else this.anim.ir(tramos);
    },

    _vistaPreferida() {
      if (this.n() === 2) return 'planta';
      const s = this.E.modulo === 'r3' ? this.E.r3 : null;
      if (s && s.familia === 'ref3' && s.p.plano === 'xy') return 'lateral';
      if (s && s.preset === 'T5') return 'perfil';
      return 'perspectiva';
    },

    animar() {
      this.escena.mostrarPropios = false;
      this.escena.fijarCapas({});
      this._botonPlay(true);
      this.anim.reproducir(0, () => {
        this._botonPlay(false);
        this.escena.mostrarPropios = true;
        this.escena.fijarCapas({});
      });
    },

    _aplicarT(M, tt) {
      this.escena.fijarMatriz(M);
      this._cajetin(M, tt);
      const r = $('#t-rango');
      if (r && document.activeElement !== r) r.value = String(tt);
      const tr = this.anim.tramos;
      $('#t-val').textContent = tr > 1 ? `paso ${Math.min(tr, Math.floor(tt) + (tt < tr ? 1 : 0))} de ${tr} · t = ${t(tt, 2)}` : `t = ${t(tt, 2)}`;
      if (!this.anim.activo && tt >= tr - 1e-9 && !this.escena.mostrarPropios) { this.escena.mostrarPropios = true; this.escena.fijarCapas({}); }
      if (tt < tr - 1e-9 && this.escena.mostrarPropios && !this.anim.activo) { this.escena.mostrarPropios = false; this.escena.fijarCapas({}); }
    },

    _botonPlay(enCurso) {
      const b = $('#t-play');
      b.innerHTML = enCurso ? ICONO.pausa : ICONO.play;
      b.setAttribute('aria-label', enCurso ? 'Pausar la animación' : 'Animar la transformación desde la identidad');
    },

    _guardarURL() {
      const h = ES.codificar(this.E);
      if (location.hash !== h) history.replaceState(null, '', h);
    },

    /* ====================================================== cajetín */
    _crearCajetin() {
      const c = $('#cajetin');
      c.innerHTML = '<div class="c-tit"><b id="c-titulo"></b><span id="c-sub"></span></div>' +
        '<div class="c-cuerpo"><div class="c-mat"><span id="c-nombre">A(t) =</span><span class="mat-html" id="c-mat"></span></div>' +
        '<div class="c-datos"><span>det = <b id="c-det"></b></span><span id="c-ec"></span><span class="c-t" id="c-t"></span></div></div>';
    },

    _textoCajetin() {
      if (this.E.modulo === 'comp') {
        const c = this.E.comp, pr = c.preset && ES.compPreset(c.preset);
        return [pr ? pr.clave + ' · ' + pr.titulo.split(' — ')[0] : 'Composición de ' + c.pasos.length + ' pasos', pr ? pr.titulo.split(' — ')[1] || '' : 'producto de matrices', ''];
      }
      const s = this.s(), F = CAT.porId[s.familia];
      const pr = s.preset && ES.presetIntacto(s, this.E.modulo) ? ES.preset(s.preset) : null;
      const M = F.matriz(s.p);
      if (!pr && AL.iguales(M, AL.identidad(M.length), 1e-12)) return ['Identidad: datos de la guía', 'A = I, ningún punto se mueve', ''];
      return [pr ? pr.clave + ' · ' + pr.corto : F.nombre + ' (laboratorio)', pr ? pr.lectura : F.resumen, F.ecuacion ? 'Ecuación ' + F.ecuacion + ' de la guía' : ''];
    },

    _cajetin(M, tt) {
      const n = M.length;
      const cel = $('#c-mat');
      if (cel.dataset.n !== String(n)) {
        cel.dataset.n = String(n);
        cel.style.gridTemplateColumns = `repeat(${n}, auto)`;
        cel.innerHTML = Array.from({ length: n * n }, () => '<span></span>').join('');
      }
      const spans = cel.children;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) spans[i * n + j].textContent = LX.num(M[i][j], 3, false).replace('{,}', ',').replace('-', '−');
      $('#c-det').textContent = LX.num(AL.det(M), 3, false).replace('{,}', ',').replace('-', '−');
      const tr = this.anim.tramos;
      $('#c-t').textContent = tt >= tr - 1e-9 ? 'matriz final A' : 'animación: A(t), t = ' + t(tt, 2);
      $('#c-nombre').textContent = tt >= tr - 1e-9 ? 'A =' : 'A(t) =';
    },

    _overlays() {
      // Rosa de los vientos y escala gráfica (solo en la vista en planta)
      const planta = this.escena.camara === this.escena.orto && this.E.modulo !== 'rep';
      const rosa = $('#rosa'), escG = $('#escala-graf');
      rosa.hidden = !planta; escG.hidden = !planta;
      if (!planta) return;
      const M = this.escena.M;
      const vx = M[0][1], vy = M[1][1];
      const ang = Math.atan2(vx, vy) * 180 / Math.PI;
      const espejo = AL.det([[M[0][0], M[0][1]], [M[1][0], M[1][1]]]) < 0 ? -1 : 1;
      const mag = Math.hypot(vx, vy);
      rosa.firstElementChild.style.transform = `rotate(${ang}deg) scale(${espejo * Math.min(1.6, Math.max(0.35, mag))}, ${Math.min(1.6, Math.max(0.35, mag))})`;
      const ppk = this.escena.pixelesPorKm();
      if (ppk) {
        const opciones = [0.5, 1, 2, 5, 10];
        const km = opciones.find(k => k * ppk >= 60) || 10;
        escG.querySelector('.barra').style.width = Math.round(km * ppk) + 'px';
        escG.querySelector('.txt').textContent = `${t(km, 1)} km`;
      }
    },

    /* =================================================== visor */
    _enlazarVisor() {
      $('#t-play').addEventListener('click', () => {
        if (this.anim.activo) { this.anim.pausar(); this._botonPlay(false); }
        else if (this.anim.t >= this.anim.tramos - 1e-9) this.animar();
        else { this._botonPlay(true); this.anim.reproducir(this.anim.t, () => { this._botonPlay(false); this.escena.mostrarPropios = true; this.escena.fijarCapas({}); }); }
      });
      $('#t-rango').addEventListener('input', e => { this.anim.pausar(); this._botonPlay(false); this.anim.ir(parseFloat(e.target.value)); });
      const vel = $('#t-vel');
      vel.innerHTML = ES.VELOCIDADES.map(v => `<option value="${v}">${String(v).replace('.', ',')}× (${String(TL.Animador.DURACION_BASE / v).replace('.', ',')} s)</option>`).join('');
      vel.addEventListener('change', () => this.fijarVelocidad(parseFloat(vel.value)));
      $('#visor-herr').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.vista) { this.escena.vista(b.dataset.vista); this.escena.encuadrar(this.matriz()); this._marcarVista(); }
        if (b.dataset.accion === 'encuadrar') this.escena.encuadrar(this.matriz());
        if (b.dataset.accion === 'efectos') {
          this.escena.efectos = !this.escena.efectos;
          b.setAttribute('aria-pressed', String(this.escena.efectos));
        }
        if (b.dataset.accion === 'completa') {
          const v = $('#visor');
          if (document.fullscreenElement) document.exitFullscreen();
          else if (v.requestFullscreen) v.requestFullscreen();
        }
      });
    },

    _marcarVista() {
      document.querySelectorAll('#visor-herr [data-vista]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === this.escena.vistaActual)));
    },

    _herramientasVisor() {
      const vistas = this.n() === 2 ? [['planta', 'Planta'], ['oblicua', 'Oblicua']] : [['perspectiva', 'Perspectiva'], ['planta', 'Planta'], ['perfil', 'Perfil'], ['lateral', 'Lateral']];
      $('#visor-herr').innerHTML = vistas.map(([v, et]) => `<button data-vista="${v}">${et}</button>`).join('') +
        '<button data-accion="encuadrar" title="Ajustar la cámara al dominio original y al transformado">Encuadrar</button>' +
        `<button data-accion="efectos" aria-pressed="${this.escena.efectos}" title="Resplandor y suavizado">Efectos</button>` +
        '<button data-accion="completa" title="Pantalla completa">Pantalla completa</button>';
      this._marcarVista();
    },

    _enlazarPestanas() {
      document.querySelectorAll('.pestanas [role="tab"]').forEach(b => b.addEventListener('click', () => this.cambiarModulo(b.dataset.mod)));
    },

    /* ============================================== panel de mando */
    renderMando() {
      const m = this.E.modulo;
      this._herramientasVisor();
      const ley = this.n() === 2
        ? '<span style="--c:#5aa9ff">Original U</span><span style="--c:#ff8f52">Transformado L(U)</span><span class="ln" style="--c:#2fd6c0">Río</span><span class="ln" style="--c:#a898ff">Dirección propia</span>'
        : '<span style="--c:#5aa9ff">Original V</span><span style="--c:#ff8f52">Transformado L(V)</span><span class="ln" style="--c:#2fd6c0">Río</span><span class="ln" style="--c:#a898ff">Dirección propia</span>';
      $('#leyenda').innerHTML = ley;
      if (m === 'comp') return this._mandoComposicion();
      const s = this.s(), n = this.n();
      const presets = CAT.PRESETS.filter(p => p.n === n);
      const fams = CAT.familias.filter(F => F.n === n);
      const conj = n === 2 ? 'U' : 'V';
      const intacto = s.preset && ES.presetIntacto(s, m);
      let html = `<section><h2>Transformaciones del proyecto <small>sobre ${conj}</small></h2><div class="entregables">` +
        presets.map(p => `<button class="entregable" data-preset="${p.clave}" aria-pressed="${intacto && s.preset === p.clave}">` +
          `<span class="clave">${p.clave}</span><span class="tit">${esc(p.titulo)}</span><span class="lect">${esc(p.lectura)}</span></button>`).join('') +
        '</div></section>';
      html += `<section><h2>Laboratorio <small>cualquier familia de la guía</small></h2><div class="familias">` +
        fams.map(F => `<button class="familia" data-familia="${F.id}" aria-pressed="${s.familia === F.id}">${F.nombre}</button>`).join('') +
        `</div><div id="params"></div><p class="ayuda">${esc(CAT.porId[s.familia].resumen)}</p></section>`;
      html += `<section><h2>Puntos <small>${n === 2 ? 'este, norte' : 'este, norte, cota'} en km</small></h2>${this._tablaPuntos()}` +
        `<div class="fila-btn" style="margin-top:8px"><button class="btn" id="pt-mas">Añadir punto</button><button class="btn" id="pt-guia">Restaurar ${conj} de la guía</button></div></section>`;
      html += `<section><h2>Capas</h2>${this._capas()}</section>`;
      html += '<section><h2>Exportar</h2><div class="fila-btn"><button class="btn" id="ex-csv">CSV</button><button class="btn" id="ex-json">JSON</button><button class="btn" id="ex-enlace">Copiar enlace</button></div><p class="ayuda" id="ex-msg">El enlace abre el simulador con estos mismos valores.</p></section>';
      $('#mando').innerHTML = html;
      this._params();
      this._enlazarMando();
    },

    _params() {
      const s = this.s(), F = CAT.porId[s.familia], cont = $('#params');
      if (s.familia === 'lib2' || s.familia === 'lib3') {
        const n = F.n, ids = F.params.map(d => d.id);
        cont.innerHTML = `<div class="matriz-edit" style="grid-template-columns:repeat(${n},auto)">` +
          ids.map(id => `<input class="num" data-p="${id}" value="${t(s.p[id], 4).replace('−', '-')}" aria-label="${id}" inputmode="decimal">`).join('') +
          '</div><div class="atajos"><button class="btn" data-ident="1">Identidad</button></div>';
        return;
      }
      cont.innerHTML = F.params.map(d => {
        if (d.tipo === 'opcion') {
          return `<div class="param"><label>${d.etiqueta}</label><span></span><div class="opciones">` +
            d.opciones.map(o => `<button data-p="${d.id}" data-v="${o.v}" aria-pressed="${s.p[d.id] === o.v}">${o.t}</button>`).join('') + '</div></div>';
        }
        const v = s.p[d.id];
        return `<div class="param"><label for="pr-${d.id}">${d.etiqueta}${d.unidad ? ` <span class="unidad">(${d.unidad})</span>` : ''}</label>` +
          `<input class="num" id="pr-${d.id}" data-p="${d.id}" value="${t(v, 4).replace('−', '-')}" inputmode="decimal">` +
          `<input type="range" data-p="${d.id}" min="${d.min}" max="${d.max}" step="${d.paso}" value="${v}" aria-label="${d.etiqueta}"></div>`;
      }).join('') + this._atajos(s.familia);
    },

    _atajos(fam) {
      const A = CAT.ALFA;
      const b = (et, p) => `<button class="btn" data-atajo='${JSON.stringify(p)}'>${et}</button>`;
      if (fam === 'rot2' || fam === 'rot3') return `<div class="atajos">${b('θ = −α (tramo)', { theta: -A })}${b('θ = 0°', { theta: 0 })}${b('θ = 90°', { theta: 90 })}${b('θ = 180°', { theta: 180 })}</div>`;
      if (fam === 'hom2') return `<div class="atajos">${b('1:25 000', { k: 4 })}${b('1:50 000', { k: 2 })}${b('1:200 000', { k: 0.5 })}</div>`;
      if (fam === 'esc3') return `<div class="atajos">${b('Exageración 2:1', { sx: 1, sy: 1, sz: 2 })}${b('3:1', { sx: 1, sy: 1, sz: 3 })}${b('5:1', { sx: 1, sy: 1, sz: 5 })}</div>`;
      if (fam === 'hom3') return `<div class="atajos">${b('Maqueta k = 0,5', { k: 0.5 })}${b('k = 0,25', { k: 0.25 })}</div>`;
      if (fam === 'ciz2') return `<div class="atajos">${b('k = 0,4 (T3)', { k: 0.4 })}${b('k = −0,4', { k: -0.4 })}${b('k = 1', { k: 1 })}</div>`;
      return '';
    },

    _tablaPuntos() {
      const P = this.s().puntos, n = this.n(), l = n === 2 ? 'u' : 'v';
      const cab = n === 2 ? '<th></th><th>x</th><th>y</th><th></th>' : '<th></th><th>x</th><th>y</th><th>z</th><th></th>';
      return `<table class="puntos"><thead><tr>${cab}</tr></thead><tbody>` + P.map((p, k) =>
        `<tr><td class="nom">${l}${sub(k + 1)}</td>` + p.map((a, j) => `<td><input data-k="${k}" data-j="${j}" value="${t(a, 4).replace('−', '-')}" inputmode="decimal" aria-label="${l}${k + 1} coordenada ${'xyz'[j]}"></td>`).join('') +
        `<td>${P.length > 1 ? `<button data-quitar="${k}" aria-label="Quitar ${l}${k + 1}" title="Quitar">✕</button>` : ''}</td></tr>`).join('') + '</tbody></table>';
    },

    _capas() {
      const c = this.E.capas, tres = this.n() === 3;
      const l = [['terreno', tres ? 'Bloque de la cuenca' : 'Mapa de la cuenca'], ['rio', 'Río'], ['rejilla', 'Rejilla'], ['unidad', tres ? 'Cubo unitario' : 'Cuadrado unitario'],
        ['vectores', 'Vectores'], ['trayectorias', 'Trayectorias'], ['propios', 'Direcciones propias'], ['base', 'Columnas de A'], ['etiquetas', 'Etiquetas']];
      if (tres) l.push(['reticula', 'Retícula del espacio'], ['fantasma', 'Relieve original']);
      return '<div class="capas">' + l.map(([k, et]) => `<label><input type="checkbox" data-capa="${k}" ${c[k] ? 'checked' : ''}> ${et}</label>`).join('') + '</div>';
    },

    _enlazarMando() {
      const mando = $('#mando');
      mando.onclick = e => {
        const b = e.target.closest('button');
        if (!b) return;
        const s = this.s();
        if (b.dataset.preset) {
          const pr = ES.preset(b.dataset.preset);
          s.preset = pr.clave; s.familia = pr.familia; s.p = Object.assign(CAT.defectos(pr.familia), pr.p);
          this.renderMando(); this.recalcular({ animar: true, encuadrar: true });
        } else if (b.dataset.familia) {
          if (s.familia !== b.dataset.familia) { s.familia = b.dataset.familia; s.p = CAT.defectos(s.familia); s.preset = null; }
          this.renderMando(); this.recalcular({ animar: true, encuadrar: true });
        } else if (b.dataset.v) {
          s.p[b.dataset.p] = b.dataset.v; this._tocado(true);
        } else if (b.dataset.atajo) {
          Object.assign(s.p, JSON.parse(b.dataset.atajo)); this._params(); this._tocado(true);
        } else if (b.dataset.ident) {
          const F = CAT.porId[s.familia]; const I = AL.identidad(F.n);
          F.params.forEach((d, i) => (s.p[d.id] = I[Math.floor(i / F.n)][i % F.n])); this._params(); this._tocado(true);
        } else if (b.dataset.quitar) {
          s.puntos.splice(+b.dataset.quitar, 1); this._puntosCambiados(true);
        } else if (b.id === 'pt-mas') {
          if (s.puntos.length >= 12) return;
          const n = this.n(); s.puntos.push(n === 2 ? [1, 1] : [1, 1, 1]); this._puntosCambiados(true);
        } else if (b.id === 'pt-guia') {
          s.puntos = ES.copia(this.n() === 2 ? ES.U0 : ES.V0); this._puntosCambiados(true);
        } else if (b.id === 'ex-csv') this.exportar('csv');
        else if (b.id === 'ex-json') this.exportar('json');
        else if (b.id === 'ex-enlace') this.copiarEnlace($('#ex-msg'));
      };
      mando.oninput = e => {
        const el = e.target, s = this.s();
        if (el.dataset.p && !el.closest('.opciones')) {
          const v = leerNum(el.value);
          if (!Number.isFinite(v)) { el.classList.add('malo'); return; }
          el.classList.remove('malo');
          s.p[el.dataset.p] = v;
          if (el.type === 'range') { const num = mando.querySelector(`input.num[data-p="${el.dataset.p}"]`); if (num) num.value = t(v, 4).replace('−', '-'); }
          else { const r = mando.querySelector(`input[type=range][data-p="${el.dataset.p}"]`); if (r) r.value = String(v); }
          this._tocado(false);
        } else if (el.dataset.k !== undefined) {
          const v = leerNum(el.value);
          if (!Number.isFinite(v)) { el.classList.add('malo'); return; }
          el.classList.remove('malo');
          s.puntos[+el.dataset.k][+el.dataset.j] = v;
          this._puntosCambiados(false);
        } else if (el.dataset.capa) {
          this.E.capas[el.dataset.capa] = el.checked;
          this.escena.fijarCapas(this.E.capas);
        }
      };
      mando.onkeydown = e => { if (e.key === 'Enter' && e.target.matches('input')) e.target.blur(); };
    },

    /** Un parámetro cambió: se recalcula sin animar (la vista responde en vivo). */
    _tocado(rehacer) {
      const s = this.s();
      if (s.preset && !ES.presetIntacto(s, this.E.modulo)) {
        s.preset = null;
        this.renderMando();
      } else if (rehacer) this._params();
      if (!this._pendiente) {
        this._pendiente = true;
        requestAnimationFrame(() => { this._pendiente = false; this.recalcular({ animar: false }); });
      }
    },

    _puntosCambiados(rehacerTabla) {
      this.escena.fijarPuntos(this.puntos(), this.nombres());
      if (rehacerTabla) this.renderMando();
      this.recalcular({ animar: false });
    },

    /* ================================================ cálculo (abajo) */
    renderCalculo() {
      if (this.E.modulo === 'comp') return this._calculoComposicion();
      const s = this.s(), F = CAT.porId[s.familia], n = this.n();
      const M = this.matriz(), P = this.puntos(), nom = this.nombres();
      const R = this.calcular(M, P);
      const pr = R.pr;
      const pres = s.preset && ES.presetIntacto(s, this.E.modulo) ? ES.preset(s.preset) : null;
      const titulo = pres ? `${pres.clave} · ${pres.titulo}` : `${F.nombre} (laboratorio)`;
      const vecS = n === 2 ? '\\begin{bmatrix}x\\\\ y\\end{bmatrix}' : '\\begin{bmatrix}x\\\\ y\\\\ z\\end{bmatrix}';
      const parametros = F.params.filter(d => d.tipo !== 'opcion').map(d => `${d.simbolo} = ${LX.num(s.p[d.id], 4)}${d.unidad === '°' ? '^{\\circ}' : ''}`).join(',\\quad ');
      let eq = `<h2>${esc(titulo)}</h2><p class="bajada">${F.ecuacion ? 'Matriz estándar de la ecuación ' + F.ecuacion + ' de la guía. ' : ''}${esc(F.resumen)}</p>`;
      eq += `<div class="que-ves"><b>¿Qué estás viendo?</b>${esc(F.interpretar(s.p))} ${esc(this._pistaVisor(s.familia, n))}</div>`;
      eq += '<h3>Definición</h3><div class="eq">' + tex(`L${vecS} = ${CAT.simbolica(F, s.p)}${vecS}`) + '</div>';
      eq += '<h3>Con los parámetros elegidos</h3><div class="eq">' + tex((parametros ? parametros + '\\qquad ' : '') + `A = ${LX.matriz(M, 4)}`) + '</div>';
      eq += '<div class="eq">' + tex(LX.coordenadas(M, 4)) + '</div>';
      eq += `<h3>Aplicación a ${n === 2 ? 'U' : 'V'}</h3>` + P.map((p, k) => '<div class="eq">' + tex(LX.pasoAPaso(M, p, (n === 2 ? 'u' : 'v') + (k + 1), 4)) + '</div>').join('');
      $('#calc-ec').innerHTML = eq;

      const cm = AN.conservaModifica(pr);
      let pp = '<h2>Propiedades de la transformación</h2><p class="bajada">Cada valor viene con su lectura en ingeniería del agua.</p>';
      pp += '<div class="chips">' + cm.conserva.map(x => `<span class="chip si">Conserva ${x}</span>`).join('') + cm.modifica.map(x => `<span class="chip no">Modifica ${x}</span>`).join('') + '</div>';
      pp += '<dl class="prop">' + AN.filas(pr).map(f => `<dt>${tex(f.k, false)}</dt><dd><span class="val">${tex(f.v, false)}</span>${esc(f.t)}</dd>`).join('') + '</dl>';
      pp += this._tablaResultados(R, P, nom);
      $('#calc-prop').innerHTML = pp;
      this._textoCajetinAct();
      this._estadoMotor(R);
    },

    _pistaVisor(fam, n) {
      const base = n === 2
        ? 'En el visor, el mapa, la rejilla y el cuadrado unitario se transforman con la misma matriz; las flechas blancas son las columnas de A (imágenes de e₁ y e₂) y el área del cuadrado transformado es |det A|.'
        : 'En el visor, todo el bloque de la cuenca, la retícula y el cubo unitario se transforman con la misma matriz; las flechas blancas son las columnas de A y el volumen del paralelepípedo es |det A|.';
      return base;
    },

    _tablaResultados(R, P, nom) {
      const n = P[0].length, ej = n === 2 ? ['x', 'y'] : ['x', 'y', 'z'];
      let h = `<h3>Resultados <small style="font-weight:400;color:var(--tinta-3)">calculados con ${R.motor}${R.dif !== null ? `; JavaScript coincide (diferencia máxima ${R.dif === 0 ? '0' : R.dif.toExponential(1)})` : ''}</small></h3>`;
      h += '<div class="tabla-scroll"><table class="res"><thead><tr><th>Punto</th>' + ej.map(a => `<th>${a}</th>`).join('') + ej.map(a => `<th>${a}′</th>`).join('') + '</tr></thead><tbody>';
      P.forEach((p, k) => {
        h += `<tr><td><span class="marca-o"></span>${nom[k]} → <span class="marca-t"></span>L(${nom[k]})</td>` + p.map(a => `<td>${t(a, 4)}</td>`).join('') + R.Q[k].map(a => `<td><b>${t(a, 4)}</b></td>`).join('') + '</tr>';
      });
      h += '</tbody></table></div>';
      const m = R.medidas;
      if (m) {
        const fila = (et, par, d, u) => `<tr><td>${et}</td><td>${t(par[0], d)}${u}</td><td>${t(par[1], d)}${u}</td><td>${Math.abs(par[0]) > 1e-12 ? t(par[1] / par[0], 4) : '—'}</td></tr>`;
        h += '<h3>Medidas antes y después</h3><div class="tabla-scroll"><table class="res"><thead><tr><th>Medida</th><th>Antes</th><th>Después</th><th>Razón</th></tr></thead><tbody>';
        h += fila(`Distancia ${nom[0]}–${nom[1]}`, m.distancia, 4, ' km');
        h += fila(`Área del triángulo O-${nom[0]}-${nom[1]}`, m.area, 4, ' km²');
        h += fila(`Ángulo entre ${nom[0]} y ${nom[1]}`, m.angulo, 2, '°');
        if (m.pendiente) h += fila(`Pendiente ${nom[1]} → ${nom[0]}`, m.pendiente, 4, '');
        h += '</tbody></table></div>';
      }
      return h;
    },

    _textoCajetinAct() {
      const [a, b, c] = this._textoCajetin();
      $('#c-titulo').textContent = a; $('#c-sub').textContent = b; $('#c-ec').textContent = c;
    },

    _estadoMotor(R) {
      const el = $('#motor-estado');
      if (TL.WASM && TL.WASM.listo) {
        el.className = 'motor-estado ok';
        el.innerHTML = `<i></i>Núcleo C++ (WebAssembly) activo${R && R.dif !== null ? ', coincide con JavaScript' : ''}`;
      } else {
        el.className = 'motor-estado';
        el.innerHTML = `<i></i>${TL.WASM && TL.WASM.error ? 'Motor JavaScript (WebAssembly no disponible)' : 'Cargando el núcleo C++…'}`;
      }
    },

    /* ================================================== composición */
    _mandoComposicion() {
      const c = this.E.comp, n = c.n;
      const fams = CAT.familias.filter(F => F.n === n && !F.id.startsWith('lib'));
      let html = `<section><h2>Composiciones analizadas</h2><div class="entregables">` + CAT.COMPOSICIONES.map(k =>
        `<button class="entregable" data-comp="${k.clave}" aria-pressed="${c.preset === k.clave}"><span class="clave">${k.clave}</span><span class="tit">${esc(k.titulo.split(' — ')[0])}</span><span class="lect">${esc(k.titulo.split(' — ')[1] || '')} (R${k.n === 2 ? '²' : '³'})</span></button>`).join('') + '</div></section>';
      html += `<section><h2>Espacio</h2><div class="opciones"><button data-espacio="2" aria-pressed="${n === 2}">R² (conjunto U)</button><button data-espacio="3" aria-pressed="${n === 3}">R³ (conjunto V)</button></div></section>`;
      html += `<section><h2>Pasos <small>en orden de aplicación</small></h2><ol class="pasos">` + c.pasos.map((s, i) => {
        const F = CAT.porId[s.familia];
        return `<li class="paso" data-i="${i}"><div class="paso-cab"><span class="num"></span><select data-i="${i}" aria-label="Familia del paso ${i + 1}">` +
          fams.map(G => `<option value="${G.id}" ${G.id === s.familia ? 'selected' : ''}>${G.nombre}</option>`).join('') + '</select>' +
          `<button data-sube="${i}" aria-label="Subir paso ${i + 1}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-baja="${i}" aria-label="Bajar paso ${i + 1}" ${i === c.pasos.length - 1 ? 'disabled' : ''}>▼</button>` +
          `${c.pasos.length > 1 ? `<button data-quita="${i}" aria-label="Quitar paso ${i + 1}">✕</button>` : ''}</div>` +
          F.params.map(d => d.tipo === 'opcion'
            ? `<div class="param"><label>${d.etiqueta}</label><span></span><div class="opciones">${d.opciones.map(o => `<button data-pi="${i}" data-p="${d.id}" data-v="${o.v}" aria-pressed="${s.p[d.id] === o.v}">${o.t}</button>`).join('')}</div></div>`
            : `<div class="param"><label>${d.etiqueta}${d.unidad ? ` <span class="unidad">(${d.unidad})</span>` : ''}</label><input class="num" data-pi="${i}" data-p="${d.id}" value="${t(s.p[d.id], 4).replace('−', '-')}" inputmode="decimal"></div>`).join('') +
          '</li>';
      }).join('') + '</ol><div class="fila-btn" style="margin-top:10px"><button class="btn" id="cp-mas">Añadir paso</button><button class="btn" id="cp-inv">Invertir el orden</button><button class="btn prim" id="cp-anim">Animar paso a paso</button></div></section>';
      html += `<section><h2>Capas</h2>${this._capas()}</section>`;
      html += '<section><h2>Exportar</h2><div class="fila-btn"><button class="btn" id="ex-csv">CSV</button><button class="btn" id="ex-json">JSON</button><button class="btn" id="ex-enlace">Copiar enlace</button></div><p class="ayuda" id="ex-msg">El enlace abre el simulador con estos mismos pasos.</p></section>';
      $('#mando').innerHTML = html;
      this._enlazarComposicion();
    },

    _enlazarComposicion() {
      const mando = $('#mando'), c = this.E.comp;
      const rehacer = (animar = false, encuadrar = false) => { this.renderMando(); this.recalcular({ animar, encuadrar }); };
      const cambioEspacio = n => {
        c.n = n; c.preset = null;
        c.pasos = n === 2 ? ES.copia(ES.compPreset('C2').pasos) : ES.copia(ES.compPreset('C4').pasos);
        this.escena.modo(n); this.escena.fijarPuntos(this.puntos(), this.nombres());
        rehacer(true, true);
      };
      mando.onclick = e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.comp) {
          const k = ES.compPreset(b.dataset.comp);
          const cambia = k.n !== c.n;
          this.E.comp = { n: k.n, preset: k.clave, pasos: ES.copia(k.pasos) };
          if (cambia) { this.escena.modo(k.n); this.escena.fijarPuntos(this.puntos(), this.nombres()); }
          rehacer(true, true);
        } else if (b.dataset.espacio) {
          if (+b.dataset.espacio !== c.n) cambioEspacio(+b.dataset.espacio);
        } else if (b.dataset.v && b.dataset.pi) {
          c.pasos[+b.dataset.pi].p[b.dataset.p] = b.dataset.v; c.preset = null; rehacer();
        } else if (b.dataset.sube) {
          const i = +b.dataset.sube; [c.pasos[i - 1], c.pasos[i]] = [c.pasos[i], c.pasos[i - 1]]; c.preset = null; rehacer(true);
        } else if (b.dataset.baja) {
          const i = +b.dataset.baja; [c.pasos[i + 1], c.pasos[i]] = [c.pasos[i], c.pasos[i + 1]]; c.preset = null; rehacer(true);
        } else if (b.dataset.quita) {
          c.pasos.splice(+b.dataset.quita, 1); c.preset = null; rehacer(true);
        } else if (b.id === 'cp-mas') {
          if (c.pasos.length >= 8) return;
          const fam = c.n === 2 ? 'rot2' : 'rot3';
          c.pasos.push({ familia: fam, p: CAT.defectos(fam) }); c.preset = null; rehacer(true);
        } else if (b.id === 'cp-inv') {
          c.pasos.reverse(); c.preset = null; rehacer(true);
        } else if (b.id === 'cp-anim') this.animar();
        else if (b.id === 'ex-csv') this.exportar('csv');
        else if (b.id === 'ex-json') this.exportar('json');
        else if (b.id === 'ex-enlace') this.copiarEnlace($('#ex-msg'));
      };
      mando.onchange = e => {
        const el = e.target;
        if (el.tagName === 'SELECT' && el.dataset.i !== undefined) {
          c.pasos[+el.dataset.i] = { familia: el.value, p: CAT.defectos(el.value) }; c.preset = null; rehacer(true);
        }
      };
      mando.oninput = e => {
        const el = e.target;
        if (el.dataset.pi !== undefined && el.classList.contains('num')) {
          const v = leerNum(el.value);
          if (!Number.isFinite(v)) { el.classList.add('malo'); return; }
          el.classList.remove('malo');
          c.pasos[+el.dataset.pi].p[el.dataset.p] = v; c.preset = null;
          if (!this._pendiente) { this._pendiente = true; requestAnimationFrame(() => { this._pendiente = false; this.recalcular({ animar: false }); }); }
        } else if (el.dataset.capa) { this.E.capas[el.dataset.capa] = el.checked; this.escena.fijarCapas(this.E.capas); }
      };
    },

    _calculoComposicion() {
      const c = this.E.comp, n = c.n;
      const P = this.puntos(), nom = this.nombres();
      const mats = c.pasos.map(s => CAT.porId[s.familia].matriz(s.p));
      const M = CAT.productoPasos(c.pasos, n), Mi = CAT.productoPasos(c.pasos, n, true);
      const R = this.calcular(M, P);
      const conm = AL.iguales(M, Mi, 1e-12);
      const pres = c.preset && ES.compPreset(c.preset);
      const nombres = c.pasos.map((s, i) => `A_{${i + 1}}`);
      let eq = `<h2>${pres ? esc(pres.clave + ' · ' + pres.titulo) : 'Composición de ' + c.pasos.length + ' transformaciones'}</h2>`;
      eq += '<p class="bajada">Si primero se aplica A₁ y después A₂, la matriz de la composición es A₂·A₁: el producto se escribe de derecha a izquierda.</p>';
      eq += `<div class="que-ves"><b>¿Qué estás viendo?</b>${esc(pres ? pres.lectura : 'El visor anima cada paso sobre el resultado del anterior; la rejilla, el mapa y los puntos acumulan las transformaciones.')} La línea de tiempo recorre los pasos en orden.</div>`;
      eq += '<h3>Pasos</h3>' + c.pasos.map((s, i) => {
        const F = CAT.porId[s.familia];
        const par = F.params.filter(d => d.tipo !== 'opcion').map(d => `${d.simbolo} = ${LX.num(s.p[d.id], 4)}${d.unidad === '°' ? '^{\\circ}' : ''}`).join(',\\ ');
        return '<div class="eq">' + tex(`${nombres[i]} = \\text{${F.nombre.toLowerCase()}}${par ? '\\ (' + par + ')' : ''}: \\quad ${LX.matriz(mats[i], 4)}`) + '</div>';
      }).join('');
      eq += '<h3>Producto</h3><div class="eq">' + tex(`M = ${nombres.slice().reverse().join('\\,')} = ${mats.slice().reverse().map(A => LX.matriz(A, 3)).join('')} = ${LX.matriz(M, 4)}`) + '</div>';
      eq += '<div class="eq">' + tex(`\\det M = ${mats.slice().reverse().map(A => '(' + LX.num(AL.det(A), 4) + ')').join('\\cdot')} = ${LX.num(AL.det(M), 6)}`) + '</div>';
      eq += `<h3>Aplicación a ${n === 2 ? 'U' : 'V'}</h3>` + P.map((p, k) => '<div class="eq">' + tex(LX.pasoAPaso(M, p, (n === 2 ? 'u' : 'v') + (k + 1), 4)) + '</div>').join('');
      $('#calc-ec').innerHTML = eq;

      let pp = '<h2>¿Importa el orden?</h2>';
      pp += `<div class="estado-conm ${conm ? 'si' : 'no'}"><b>${conm ? 'Las transformaciones conmutan' : 'No conmutan: el orden cambia el resultado'}</b>` +
        (conm ? 'Aplicarlas en el orden inverso da la misma matriz.' : `‖M − M′‖ = ${t(Math.sqrt(M.flat().reduce((s, a, i) => s + (a - Mi.flat()[i]) ** 2, 0)), 4)}, donde M′ es el producto en orden inverso.`) + '</div>';
      pp += '<div class="eq">' + tex(`M' = ${nombres.join('\\,')} = ${LX.matriz(Mi, 4)}`) + '</div>';
      pp += '<h3>Imágenes en ambos órdenes</h3><div class="tabla-scroll"><table class="res"><thead><tr><th>Punto</th><th>M·p</th><th>M′·p</th></tr></thead><tbody>' +
        P.map((p, k) => `<tr><td>${nom[k]} (${p.map(a => t(a, 3)).join('; ')})</td><td><b>(${R.Q[k].map(a => t(a, 4)).join('; ')})</b></td><td>(${AL.aplicar(Mi, p).map(a => t(a, 4)).join('; ')})</td></tr>`).join('') + '</tbody></table></div>';
      const pr = R.pr, cm = AN.conservaModifica(pr);
      pp += '<h3>Propiedades de M</h3><div class="chips">' + cm.conserva.map(x => `<span class="chip si">Conserva ${x}</span>`).join('') + cm.modifica.map(x => `<span class="chip no">Modifica ${x}</span>`).join('') + '</div>';
      pp += '<dl class="prop">' + AN.filas(pr).slice(0, 4).map(f => `<dt>${tex(f.k, false)}</dt><dd><span class="val">${tex(f.v, false)}</span>${esc(f.t)}</dd>`).join('') + '</dl>';
      $('#calc-prop').innerHTML = pp;
      this._textoCajetinAct();
      this._estadoMotor(R);
    },

    /* ==================================================== exportar */
    resumenActual() {
      const M = this.matriz(), P = this.puntos(), R = this.calcular(M, P), pr = R.pr;
      const base = {
        proyecto: 'Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua',
        generado: new Date().toISOString(),
        enlace: this.enlace(),
        motor: R.motor,
        espacio: this.n() === 2 ? 'R2' : 'R3',
        matriz: M,
        puntos: P,
        imagenes: R.Q,
        propiedades: { det: pr.det, traza: pr.traza, rango: pr.rango, ortogonal: pr.ortogonal, conserva_angulos: pr.conservaAngulos, orientacion: pr.orientacion, condicion: Number.isFinite(pr.condicion) ? pr.condicion : null, autovalores: pr.autovalores, inversa: pr.inversa },
        medidas: R.medidas,
      };
      if (this.E.modulo === 'comp') base.composicion = this.E.comp;
      else base.transformacion = { preset: this.s().preset, familia: this.s().familia, parametros: this.s().p };
      return base;
    },

    exportar(tipo) {
      const r = this.resumenActual();
      const nombre = 'transformacion_' + (this.E.modulo === 'comp' ? 'composicion' : (this.s().preset || this.s().familia));
      let contenido, mime;
      if (tipo === 'json') { contenido = JSON.stringify(r, null, 2); mime = 'application/json'; }
      else {
        const c = x => (typeof x === 'number' ? String(Math.round(x * 1e9) / 1e9).replace('.', ',') : x);
        const l = [['Proyecto', r.proyecto], ['Enlace', r.enlace], ['Motor de cálculo', r.motor], [],
          ['Matriz A'], ...r.matriz.map(f => ['', ...f.map(c)]), ['det A', c(r.propiedades.det)], [],
          ['Punto', ...(r.espacio === 'R2' ? ['x', 'y', "x'", "y'"] : ['x', 'y', 'z', "x'", "y'", "z'"])],
          ...r.puntos.map((p, k) => [this.nombres()[k], ...p.map(c), ...r.imagenes[k].map(c)])];
        if (r.medidas) { l.push([], ['Medida', 'Antes', 'Después']); Object.entries(r.medidas).forEach(([k, v]) => l.push([k, c(v[0]), c(v[1])])); }
        contenido = '﻿' + l.map(f => f.join(';')).join('\r\n');
        mime = 'text/csv';
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([contenido], { type: mime + ';charset=utf-8' }));
      a.download = nombre + '.' + tipo;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },

    enlace(modulo) {
      const base = (TL.INFORME && TL.INFORME.base()) || (location.origin + location.pathname);
      return base + ES.codificar(this.E, modulo);
    },

    copiarEnlace(msg) {
      const url = this.enlace();
      const hecho = () => { if (msg) msg.textContent = 'Enlace copiado. Ábralo para reproducir exactamente esta simulación.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(hecho, () => prompt('Copie el enlace:', url));
      else prompt('Copie el enlace:', url);
    },

    /** Captura del visor para un escenario dado (lo usa el informe con QR). */
    capturar(estadoParcial, ancho = 1200, alto = 720) {
      const guardado = this.E;
      this.E = Object.assign(ES.copia(this.E), ES.copia(estadoParcial));
      const n = this.n();
      if (this.escena.n !== n) this.escena.modo(n, true);
      this.escena.fijarPuntos(this.puntos(), this.nombres());
      const M = this.matriz();
      const pr = AL.propiedades(M);
      this.escena.mostrarPropios = true;
      this.escena.fijarPropios(pr.espaciosPropios);
      this.escena.fijarTrayectorias(this.puntos().map(p => { const [cam, tr] = this.camino(); this.anim.cargar(cam, tr); return this.anim.trayectoria(n === 2 ? [p[0], p[1], 0] : p); }));
      this.escena.vista(this._vistaPreferida(), false);
      this.escena.fijarMatriz(M);
      this.escena.encuadrar(M, false);
      this.escena.fijarCapas({});
      const url = this.escena.captura(ancho, alto, true, 'image/jpeg');
      this.E = guardado;
      return url;
    },
  };

  TL.APP = APP;
})(window);
