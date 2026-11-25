/* ============================================================================
   estado.js — Estado del simulador y enlaces reproducibles
   ----------------------------------------------------------------------------
   El escenario completo viaja en el fragmento de la URL, que el navegador no
   envía al servidor. Sintaxis:
     #sim=1&m=r2&t=T1                       transformación del proyecto
     #sim=1&m=r2&f=rot2&p=-8.130102&u=4,5;-3,4   laboratorio (familia y parámetros)
     #sim=1&m=r3&f=esc3&p=1,1,2&v=4,5,3;-3,4,4
     #sim=1&m=comp&n=2&c=rot2:-8.130102|ciz2:x,0.4      composición (en orden de aplicación)
     …&vel=0.5                              velocidad de la animación (0.25, 0.5, 1 o 2; se omite si es 1)
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});
  const CAT = TL.CATALOGO;

  const U0 = [[4, 5], [-3, 4]], V0 = [[4, 5, 3], [-3, 4, 4]];
  const VELOCIDADES = [0.25, 0.5, 1, 2];
  const copia = x => JSON.parse(JSON.stringify(x));
  const preset = k => CAT.PRESETS.find(p => p.clave === k);
  const compPreset = k => CAT.COMPOSICIONES.find(c => c.clave === k);

  function inicial() {
    const t1 = preset('T1'), t4 = preset('T4'), c2 = compPreset('C2');
    return {
      modulo: 'r2',
      vel: 1,
      r2: { preset: 'T1', familia: t1.familia, p: Object.assign(CAT.defectos(t1.familia), t1.p), puntos: copia(U0) },
      r3: { preset: 'T4', familia: t4.familia, p: Object.assign(CAT.defectos(t4.familia), t4.p), puntos: copia(V0) },
      comp: { n: 2, preset: 'C2', pasos: copia(c2.pasos) },
      capas: { terreno: true, rio: true, rejilla: true, unidad: true, vectores: true, trayectorias: true, propios: true, etiquetas: true, base: true, fantasma: true, reticula: true },
    };
  }

  const n6 = x => String(Math.round(x * 1e6) / 1e6);

  function parametrosATexto(familia, p) {
    return CAT.porId[familia].params.map(d => (d.tipo === 'opcion' ? p[d.id] : n6(p[d.id]))).join(',');
  }

  function textoAParametros(familia, txt) {
    const F = CAT.porId[familia];
    if (!F) return null;
    const partes = String(txt).split(',');
    if (partes.length !== F.params.length) return null;
    const p = {};
    for (let i = 0; i < F.params.length; i++) {
      const d = F.params[i];
      if (d.tipo === 'opcion') {
        if (!d.opciones.some(o => o.v === partes[i])) return null;
        p[d.id] = partes[i];
      } else {
        const v = parseFloat(partes[i]);
        if (!Number.isFinite(v) || Math.abs(v) > 1e6) return null;
        p[d.id] = v;
      }
    }
    return p;
  }

  const puntosATexto = P => P.map(q => q.map(n6).join(',')).join(';');
  function textoAPuntos(txt, n) {
    const P = String(txt).split(';').map(s => s.split(',').map(parseFloat));
    if (!P.length || P.length > 12 || P.some(q => q.length !== n || q.some(a => !Number.isFinite(a) || Math.abs(a) > 1e5))) return null;
    return P;
  }
  const iguales = (A, B) => A.length === B.length && A.every((q, i) => q.length === B[i].length && q.every((a, j) => Math.abs(a - B[i][j]) < 1e-9));

  /** Codifica el estado del módulo indicado (o el activo) en un fragmento de URL. */
  function codificar(E, modulo = E.modulo) {
    const out = ['sim=1', 'm=' + modulo];
    if (modulo === 'r2' || modulo === 'r3') {
      const s = E[modulo];
      if (s.preset && presetIntacto(s, modulo)) out.push('t=' + s.preset);
      else out.push('f=' + s.familia, 'p=' + encodeURIComponent(parametrosATexto(s.familia, s.p)));
      const base = modulo === 'r2' ? U0 : V0;
      if (!iguales(s.puntos, base)) out.push((modulo === 'r2' ? 'u=' : 'v=') + encodeURIComponent(puntosATexto(s.puntos)));
    } else if (modulo === 'comp') {
      const c = E.comp;
      const pr = c.preset && compPreset(c.preset);
      if (pr && JSON.stringify(pr.pasos) === JSON.stringify(c.pasos)) out.push('k=' + c.preset);
      else out.push('n=' + c.n, 'c=' + encodeURIComponent(c.pasos.map(s => s.familia + ':' + parametrosATexto(s.familia, s.p)).join('|')));
    }
    if (E.vel && E.vel !== 1 && VELOCIDADES.includes(E.vel)) out.push('vel=' + E.vel);
    return '#' + out.join('&');
  }

  function presetIntacto(s, modulo) {
    const pr = preset(s.preset);
    if (!pr || pr.familia !== s.familia || (modulo === 'r2') !== (pr.n === 2)) return false;
    return Object.keys(pr.p).every(k => (typeof pr.p[k] === 'number' ? Math.abs(pr.p[k] - s.p[k]) < 1e-9 : pr.p[k] === s.p[k]));
  }

  /** Lee un fragmento de URL. Devuelve { estado, cambios: [textos], errores: [textos] } o null. */
  function decodificar(hash, base) {
    if (!hash || hash.indexOf('sim=1') < 0) return null;
    const q = {};
    hash.replace(/^#/, '').split('&').forEach(par => {
      const i = par.indexOf('=');
      if (i > 0) q[par.slice(0, i)] = decodeURIComponent(par.slice(i + 1));
    });
    const E = copia(base), errores = [], cambios = [];
    const m = q.m;
    if (!['r2', 'r3', 'comp', 'rep'].includes(m)) { errores.push('módulo desconocido'); return { estado: E, errores, cambios }; }
    E.modulo = m === 'rep' ? 'r2' : m;
    if (m === 'r2' || m === 'r3') {
      const s = E[m];
      if (q.t) {
        const pr = preset(q.t);
        if (pr && (pr.n === 2) === (m === 'r2')) {
          s.preset = pr.clave; s.familia = pr.familia; s.p = Object.assign(CAT.defectos(pr.familia), pr.p);
          cambios.push(pr.clave + ' · ' + pr.titulo);
        } else errores.push('transformación ' + q.t);
      } else if (q.f) {
        const F = CAT.porId[q.f];
        const p = F && (F.n === 2) === (m === 'r2') ? textoAParametros(q.f, q.p || '') : null;
        if (p) { s.preset = null; s.familia = q.f; s.p = p; cambios.push(F.nombre); } else errores.push('parámetros de la transformación');
      }
      const pts = q[m === 'r2' ? 'u' : 'v'];
      if (pts) {
        const P = textoAPuntos(pts, m === 'r2' ? 2 : 3);
        if (P) { s.puntos = P; cambios.push(P.length + ' puntos'); } else errores.push('puntos');
      }
    } else if (m === 'comp') {
      if (q.k) {
        const c = compPreset(q.k);
        if (c) { E.comp = { n: c.n, preset: c.clave, pasos: copia(c.pasos) }; cambios.push(c.clave + ' · ' + c.titulo); } else errores.push('composición ' + q.k);
      } else if (q.c) {
        const n = q.n === '3' ? 3 : 2;
        const pasos = q.c.split('|').map(t => {
          const i = t.indexOf(':');
          const fam = t.slice(0, i), F = CAT.porId[fam];
          if (!F || F.n !== n) return null;
          const p = textoAParametros(fam, t.slice(i + 1));
          return p ? { familia: fam, p } : null;
        });
        if (pasos.length && pasos.length <= 8 && pasos.every(Boolean)) { E.comp = { n, preset: null, pasos }; cambios.push(pasos.length + ' pasos'); } else errores.push('pasos de la composición');
      }
    }
    if (q.vel !== undefined) {
      const v = parseFloat(q.vel);
      if (VELOCIDADES.includes(v)) { E.vel = v; if (v !== 1) cambios.push('velocidad ' + String(v).replace('.', ',') + '×'); }
      else errores.push('velocidad');
    }
    return { estado: E, errores, cambios };
  }

  TL.ESTADO = { inicial, codificar, decodificar, parametrosATexto, textoAParametros, U0, V0, VELOCIDADES, preset, compPreset, presetIntacto, copia };
})(typeof window !== 'undefined' ? window : globalThis);
