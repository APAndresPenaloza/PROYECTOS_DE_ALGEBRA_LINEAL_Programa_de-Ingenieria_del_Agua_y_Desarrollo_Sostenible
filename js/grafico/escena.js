/* ============================================================================
   escena.js — Motor gráfico: escena 3D del simulador (three.js r128)
   ----------------------------------------------------------------------------
   · Modo R² (planta): mapa topográfico sombreado de la cuenca, río, estaciones,
     rejilla del plano y cuadrado unitario.  · Modo R³: bloque diagrama de la
     cuenca, retícula del espacio, cubo unitario, puntos con su cota.
   · La matriz de la transformación se aplica en la GPU (shaders) a todo el
     mundo y en la CPU a los puntos, vectores y etiquetas.
   · Posprocesado: resplandor (UnrealBloom) y antialiasing (MSAA o FXAA).
   Coordenadas del mundo = coordenadas matemáticas en km: x este, y norte, z cota.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});
  const T3 = raiz.THREE;

  const COL = {
    original: 0x5aa9ff, transformado: 0xff8f52, agua: 0x2fd6c0, propio: 0xa898ff,
    base: 0xe8eef2, rejillaT: 0xf0a37a, rejillaO: 0x7f9fb3, eje: 0x9db3c2, tray: 0xd9e4ea,
  };
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const sub = s => String(s).replace(/\d/g, d => SUB[d]);
  const num = (x, d = 3) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace(/\.?0+$/, '').replace('.', ',').replace('-', '−');

  function texturaBrillo() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    return new T3.CanvasTexture(c);
  }

  class Flecha {
    constructor(color, radio = 0.035, cabeza = 0.32, opacidad = 1) {
      const mat = new T3.MeshBasicMaterial({ color, transparent: true, opacity: opacidad, depthTest: false });
      this.grupo = new T3.Group();
      this.tallo = new T3.Mesh(new T3.CylinderGeometry(1, 1, 1, 12), mat);
      this.punta = new T3.Mesh(new T3.ConeGeometry(1, 1, 18), mat);
      this.grupo.add(this.tallo, this.punta);
      this.radio = radio; this.cabeza = cabeza; this.mat = mat;
      this.grupo.renderOrder = 12;
      [this.tallo, this.punta].forEach(m => (m.renderOrder = 12));
    }
    fijar(a, b, escala = 1) {
      const d = new T3.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const L = d.length();
      if (L < 1e-6) { this.grupo.visible = false; return; }
      this.grupo.visible = true;
      const h = Math.min(this.cabeza * escala, L * 0.45), r = this.radio * escala;
      const u = d.clone().normalize();
      const q = new T3.Quaternion().setFromUnitVectors(new T3.Vector3(0, 1, 0), u);
      this.tallo.quaternion.copy(q); this.punta.quaternion.copy(q);
      this.tallo.scale.set(r, L - h, r);
      this.tallo.position.set(a[0] + u.x * (L - h) / 2, a[1] + u.y * (L - h) / 2, a[2] + u.z * (L - h) / 2);
      this.punta.scale.set(r * 3.1, h, r * 3.1);
      this.punta.position.set(a[0] + u.x * (L - h / 2), a[1] + u.y * (L - h / 2), a[2] + u.z * (L - h / 2));
    }
  }

  class Escena {
    constructor(contenedor) {
      this.cont = contenedor;
      this.n = 2;
      this.M = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      this.puntos = [];
      this.nombres = [];
      this.capas = { terreno: true, rio: true, rejilla: true, unidad: true, vectores: true, trayectorias: true, propios: true, etiquetas: true, base: true, fantasma: true, reticula: true };
      this.efectos = true;
      this.reloj = new T3.Clock();
      this.tiempo = 0;
      this.mostrarPropios = false;
      this._crearRender();
      this._crearMundo();
      this.modo(2, true);
      this._bucle = this._bucle.bind(this);
      this._visible = true;
      if ('IntersectionObserver' in raiz) {
        new IntersectionObserver(e => { this._visible = e[0].isIntersecting; }).observe(contenedor);
      }
      requestAnimationFrame(this._bucle);
    }

    /* ---------------------------------------------------------- render */
    _crearRender() {
      const r = (this.renderer = new T3.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }));
      r.setPixelRatio(Math.min(raiz.devicePixelRatio || 1, 2));
      r.setClearColor(0x0d2132, 1);
      this.cont.appendChild(r.domElement);
      r.domElement.setAttribute('aria-label', 'Vista 3D de la transformación');
      r.domElement.setAttribute('role', 'img');
      this.css = new T3.CSS2DRenderer();
      this.css.domElement.className = 'capa-etq';
      this.cont.appendChild(this.css.domElement);

      this.escena = new T3.Scene();
      const fondo = new T3.Mesh(new T3.PlaneGeometry(2, 2), new T3.ShaderMaterial({
        vertexShader: TL.SHADERS.fondoV, fragmentShader: TL.SHADERS.fondoF, depthWrite: false, depthTest: false,
      }));
      fondo.frustumCulled = false;
      fondo.renderOrder = -10;
      this.escena.add(fondo);

      this.persp = new T3.PerspectiveCamera(38, 1, 0.05, 600);
      this.orto = new T3.OrthographicCamera(-10, 10, 10, -10, -100, 200);
      this.camara = this.orto;

      this.webgl2 = r.capabilities.isWebGL2;
      this._crearComposer();
      this.redimensionar();
      if ('ResizeObserver' in raiz) new ResizeObserver(() => this.redimensionar()).observe(this.cont);
      else raiz.addEventListener('resize', () => this.redimensionar());
    }

    _crearComposer() {
      const r = this.renderer;
      const tam = r.getDrawingBufferSize(new T3.Vector2());
      let rt;
      if (this.webgl2 && T3.WebGLMultisampleRenderTarget) {
        rt = new T3.WebGLMultisampleRenderTarget(tam.x, tam.y, { format: T3.RGBAFormat });
        rt.samples = 4;
      }
      this.composer = new T3.EffectComposer(r, rt);
      this.pasoRender = new T3.RenderPass(this.escena, this.camara);
      this.composer.addPass(this.pasoRender);
      this.bloom = new T3.UnrealBloomPass(new T3.Vector2(tam.x, tam.y), 0.5, 0.42, 0.86);
      this.composer.addPass(this.bloom);
      if (!rt) {
        this.fxaa = new T3.ShaderPass(T3.FXAAShader);
        this.composer.addPass(this.fxaa);
      }
    }

    redimensionar() {
      const w = this.cont.clientWidth || 800, h = this.cont.clientHeight || 500;
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.css.setSize(w, h);
      this.composer.setSize(w, h);
      if (this.composer.setPixelRatio) this.composer.setPixelRatio(this.renderer.getPixelRatio());
      if (this.fxaa) {
        const pr = this.renderer.getPixelRatio();
        this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
      }
      this.aspecto = w / h;
      this.persp.aspect = this.aspecto;
      this.persp.updateProjectionMatrix();
      this._ajustarOrto();
    }

    _ajustarOrto() {
      const H = this.mediaAltura || 8.2;
      this.orto.left = -H * this.aspecto; this.orto.right = H * this.aspecto;
      this.orto.top = H; this.orto.bottom = -H;
      this.orto.updateProjectionMatrix();
    }

    /* ----------------------------------------------------------- mundo */
    _uniformes(extra = {}) {
      return Object.assign({
        uM: { value: new T3.Matrix3() }, uN: { value: new T3.Matrix3() },
        uPlano: { value: 0 }, uElev: { value: 0 },
      }, extra);
    }

    _crearMundo() {
      const S = TL.SHADERS, E = this.escena;
      this.grupoUnif = [];   // todos los uniformes que reciben la matriz
      const reg = u => (this.grupoUnif.push(u), u);

      // --- terreno (superficie + faldones + base) y su fantasma
      const sup = TL.TERRENO.superficie();
      const gSup = new T3.BufferGeometry();
      gSup.setAttribute('position', new T3.BufferAttribute(sup.pos, 3));
      gSup.setAttribute('aFaldon', new T3.BufferAttribute(new Float32Array(sup.pos.length / 3), 1));
      gSup.setIndex(new T3.BufferAttribute(sup.idx, 1));
      gSup.computeVertexNormals();
      const fal = TL.TERRENO.faldones(sup);
      const gFal = new T3.BufferGeometry();
      gFal.setAttribute('position', new T3.BufferAttribute(fal.pos, 3));
      gFal.setAttribute('normal', new T3.BufferAttribute(fal.nrm, 3));
      gFal.setAttribute('aFaldon', new T3.BufferAttribute(new Float32Array(fal.pos.length / 3).fill(1), 1));
      gFal.setIndex(new T3.BufferAttribute(fal.idx, 1));
      const gBase = new T3.BufferGeometry();
      gBase.setAttribute('position', new T3.BufferAttribute(fal.base.pos, 3));
      gBase.setAttribute('normal', new T3.BufferAttribute(fal.base.nrm, 3));
      gBase.setAttribute('aFaldon', new T3.BufferAttribute(new Float32Array(4).fill(1), 1));
      gBase.setIndex(new T3.BufferAttribute(fal.base.idx, 1));

      const luz = new T3.Vector3(-0.55, 0.62, 0.9).normalize();
      const uT = reg(this._uniformes({
        uLuz: { value: luz }, uContornos: { value: 1 }, uOpacidad: { value: 1 }, uFantasma: { value: 0 },
      }));
      const matT = new T3.ShaderMaterial({
        uniforms: uT, vertexShader: S.terrenoV, fragmentShader: S.terrenoF, side: T3.DoubleSide,
        extensions: { derivatives: true },
      });
      this.terreno = new T3.Mesh(gSup, matT);
      this.faldon = new T3.Mesh(gFal, matT);
      this.base = new T3.Mesh(gBase, matT);
      this.uTerreno = uT;
      const uF = this._uniformes({
        uLuz: { value: luz }, uContornos: { value: 1 }, uOpacidad: { value: 0.75 }, uFantasma: { value: 1 },
      });
      this.uFantasma = uF;
      this.fantasma = new T3.Mesh(gSup, new T3.ShaderMaterial({
        uniforms: uF, vertexShader: S.terrenoV, fragmentShader: S.terrenoF, side: T3.DoubleSide,
        transparent: true, depthWrite: false, extensions: { derivatives: true },
      }));
      this.fantasma.renderOrder = 4;
      E.add(this.terreno, this.faldon, this.base, this.fantasma);

      // --- río
      const r = TL.TERRENO.rio();
      const gR = new T3.BufferGeometry();
      gR.setAttribute('position', new T3.BufferAttribute(r.pos, 3));
      gR.setAttribute('uv', new T3.BufferAttribute(r.uv, 2));
      gR.setIndex(new T3.BufferAttribute(r.idx, 1));
      this.uRio = reg(this._uniformes({ uTiempo: { value: 0 } }));
      this.uRio.uElev.value = 0.004;
      this.rio = new T3.Mesh(gR, new T3.ShaderMaterial({
        uniforms: this.uRio, vertexShader: S.rioV, fragmentShader: S.rioF, transparent: true, depthWrite: false,
        side: T3.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }));
      this.rio.renderOrder = 1;
      E.add(this.rio);

      // --- rejilla del plano (transformada y original)
      const lin = [];
      const R = 14;
      for (let k = -R; k <= R; k++) { lin.push(k, -R, 0, k, R, 0, -R, k, 0, R, k, 0); }
      const gRej = new T3.BufferGeometry();
      gRej.setAttribute('position', new T3.Float32BufferAttribute(lin, 3));
      const linea = (unif, color, op, aplicar, orden) => {
        const u = this._uniformes({ uColor: { value: new T3.Color(color) }, uOpacidad: { value: op }, uAplicar: { value: aplicar } });
        if (aplicar) reg(u);
        const m = new T3.ShaderMaterial({ uniforms: u, vertexShader: S.lineaV, fragmentShader: S.colorF, transparent: true, depthWrite: false });
        const o = new T3.LineSegments(unif, m);
        o.renderOrder = orden;
        o.frustumCulled = false;
        return o;
      };
      this.rejillaO = linea(gRej, COL.rejillaO, 0.22, 0, 2);
      this.rejillaT = linea(gRej, COL.rejillaT, 0.42, 1, 3);
      E.add(this.rejillaO, this.rejillaT);

      // --- retícula de puntos del espacio (R³)
      const ret = [];
      for (let x = -8; x <= 10; x += 2) for (let y = -2; y <= 10; y += 2) for (let z = 0; z <= 6; z += 2) ret.push(x, y, z);
      const gRet = new T3.BufferGeometry();
      gRet.setAttribute('position', new T3.Float32BufferAttribute(ret, 3));
      this.uRet = reg(this._uniformes({ uColor: { value: new T3.Color(0xbfe3ff) }, uTam: { value: 0.16 } }));
      this.reticula = new T3.Points(gRet, new T3.ShaderMaterial({
        uniforms: this.uRet, vertexShader: S.reticulaV, fragmentShader: S.reticulaF, transparent: true, depthWrite: false,
      }));
      this.reticula.renderOrder = 3;
      this.reticula.frustumCulled = false;
      E.add(this.reticula);

      // --- cuadrado unitario (R²) y cubo unitario (R³)
      const cara = (geo, color, op, orden) => {
        const u = reg(this._uniformes({ uColor: { value: new T3.Color(color) }, uOpacidad: { value: op } }));
        const m = new T3.Mesh(geo, new T3.ShaderMaterial({
          uniforms: u, vertexShader: S.caraV, fragmentShader: S.colorF, transparent: true, depthWrite: false,
          depthTest: false, side: T3.DoubleSide,
        }));
        m.renderOrder = orden;
        m.frustumCulled = false;
        return m;
      };
      const gCuad = new T3.BufferGeometry();
      gCuad.setAttribute('position', new T3.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
      gCuad.setIndex([0, 1, 2, 0, 2, 3]);
      this.cuadrado = cara(gCuad, COL.transformado, 0.28, 9);
      const gCuadL = new T3.BufferGeometry();
      gCuadL.setAttribute('position', new T3.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], 3));
      this.cuadradoL = linea(gCuadL, COL.transformado, 0.95, 1, 10);
      this.cuadradoL.material.depthTest = false;
      const gCubo = new T3.BoxGeometry(1, 1, 1);
      gCubo.translate(0.5, 0.5, 0.5);
      this.cubo = cara(gCubo, COL.transformado, 0.16, 9);
      const gCuboL = new T3.EdgesGeometry(gCubo);
      this.cuboL = linea(gCuboL, COL.transformado, 0.95, 1, 10);
      this.cuboL.material.depthTest = false;
      E.add(this.cuadrado, this.cuadradoL, this.cubo, this.cuboL);
      this.etqUnidad = this._etiqueta('', '#ff8f52', 'medida bajo');
      E.add(this.etqUnidad.obj);

      // --- ejes coordenados fijos
      const gEjes = new T3.BufferGeometry();
      gEjes.setAttribute('position', new T3.Float32BufferAttribute([-13, 0, 0, 13, 0, 0, 0, -13, 0, 0, 13, 0, 0, 0, 0, 0, 0, 9], 3));
      this.ejes = new T3.LineSegments(gEjes, new T3.LineBasicMaterial({ color: COL.eje, transparent: true, opacity: 0.55, depthTest: false }));
      this.ejes.renderOrder = 5;
      E.add(this.ejes);
      this.etqEjes = [
        this._etiqueta('x · este', null, 'eje', [12.4, -0.5, 0]),
        this._etiqueta('y · norte', null, 'eje', [0.9, 12.4, 0]),
        this._etiqueta('z · cota', null, 'eje', [0.6, 0, 8.8]),
      ];
      this.etqEjes.forEach(e => E.add(e.obj));

      // --- imágenes de la base canónica (columnas de A)
      this.flechasBase = [0, 1, 2].map(() => new Flecha(COL.base, 0.022, 0.24, 0.9));
      this.flechasBase.forEach(f => E.add(f.grupo));
      this.etqBase = [0, 1, 2].map(i => this._etiqueta(`Ae${sub(i + 1)}`, '#e8eef2', 'medida base'));
      this.etqBase.forEach(e => E.add(e.obj));

      // --- direcciones propias de A (rectas invariantes)
      this.grupoPropios = new T3.Group();
      this.grupoPropios.renderOrder = 8;
      E.add(this.grupoPropios);

      // --- puntos, vectores, trayectorias (se crean al fijar los puntos)
      this.grupoPuntos = new T3.Group();
      E.add(this.grupoPuntos);
      this.texBrillo = texturaBrillo();
    }

    _etiqueta(texto, color, clase = '', pos) {
      const div = document.createElement('div');
      div.className = 'etq ' + clase;
      if (color) div.style.setProperty('--c', color);
      div.innerHTML = texto;
      const obj = new T3.CSS2DObject(div);
      if (pos) obj.position.set(pos[0], pos[1], pos[2]);
      return { div, obj };
    }

    /* ----------------------------------------------------- modo y vistas */
    modo(n, inicial = false) {
      this.n = n;
      const plano = n === 2 ? 1 : 0;
      this.grupoUnif.concat([this.uFantasma]).forEach(u => (u.uPlano.value = plano));
      this.uRio.uElev.value = 0.004;
      this.rejillaO.material.uniforms.uElev.value = 0.006;
      this.rejillaT.material.uniforms.uElev.value = 0.008;
      this.cuadrado.material.uniforms.uElev.value = 0.012;
      this.cuadradoL.material.uniforms.uElev.value = 0.013;
      this.etqEjes[2].obj.visible = n === 3;
      this.ejes.geometry.setDrawRange(0, n === 3 ? 6 : 4);
      this._aplicarCapas();
      this.vista(n === 2 ? 'planta' : 'perspectiva', !inicial);
    }

    vista(nombre, suave = true) {
      this.vistaActual = nombre;
      const cx = 0.6, cy = 4.2;
      let cam, pos, obj, arriba = [0, 0, 1];
      if (nombre === 'planta') {
        cam = this.orto; pos = [cx, cy, 80]; obj = [cx, cy, 0]; arriba = [0, 1, 0];
        this.mediaAltura = this.n === 2 ? 8.4 : 9.5;
        this._ajustarOrto();
        this.orto.zoom = 1;
      } else if (nombre === 'oblicua') {
        cam = this.persp; pos = [cx + 5, cy - 17, 15]; obj = [cx, cy, 0];
      } else if (nombre === 'lateral') {
        cam = this.persp; pos = [cx + 3, cy - 30, 3.2]; obj = [cx, cy, 0];
      } else if (nombre === 'perfil') {
        const n = [-1 / Math.sqrt(50), 7 / Math.sqrt(50)];
        cam = this.persp; obj = [cx, cy, 3.4]; pos = [cx - n[0] * 30, cy - n[1] * 30, 4.6];
      } else {
        cam = this.persp; pos = [cx - 14, cy - 20, 15.5]; obj = [cx, cy, 2.6];
      }
      const cambiaCam = cam !== this.camara;
      this.camara = cam;
      this.pasoRender.camera = cam;
      cam.up.set(arriba[0], arriba[1], arriba[2]);
      if (this.controles) this.controles.dispose();
      const c = (this.controles = new T3.OrbitControls(cam, this.renderer.domElement));
      c.enableDamping = true;
      c.dampingFactor = 0.09;
      c.screenSpacePanning = true;
      c.enableRotate = nombre !== 'planta';
      c.minDistance = 3; c.maxDistance = 120;
      c.minZoom = 0.3; c.maxZoom = 6;
      c.target.set(obj[0], obj[1], obj[2]);
      if (suave && !cambiaCam && !this._reducido()) {
        this._tween = { t: 0, p0: cam.position.clone(), p1: new T3.Vector3(...pos) };
      } else {
        cam.position.set(pos[0], pos[1], pos[2]);
        this._tween = null;
      }
      cam.lookAt(obj[0], obj[1], obj[2]);
      c.update();
    }

    /** Ajusta la cámara para que quepan el dominio original y el transformado por M. */
    encuadrar(M, suave = true) {
      const A = M.length === 3 ? M : [[M[0][0], M[0][1], 0], [M[1][0], M[1][1], 0], [0, 0, 1]];
      const D = TL.TERRENO.DOM, tres = this.n === 3;
      const zs = tres ? [0, 6.2] : [0];
      const pts = [];
      for (const x of [D.xmin, D.xmax]) for (const y of [D.ymin, D.ymax]) for (const z of zs) {
        pts.push([x, y, z]);
        pts.push([A[0][0] * x + A[0][1] * y + A[0][2] * z, A[1][0] * x + A[1][1] * y + A[1][2] * z, A[2][0] * x + A[2][1] * y + A[2][2] * z]);
      }
      const mn = [0, 1, 2].map(i => Math.min(...pts.map(p => p[i]))), mx = [0, 1, 2].map(i => Math.max(...pts.map(p => p[i])));
      const c = mn.map((a, i) => (a + mx[i]) / 2);
      const c3 = new T3.Vector3(c[0], c[1], tres ? c[2] : 0);
      if (this.camara === this.orto) {
        const hh = (mx[1] - mn[1]) / 2, hw = (mx[0] - mn[0]) / 2;
        this.mediaAltura = Math.max(hh, hw / this.aspecto) * 1.12 + 0.4;
        this._ajustarOrto();
        this.orto.zoom = 1;
        this.orto.updateProjectionMatrix();
        this.orto.position.set(c3.x, c3.y, 80);
        this.controles.target.set(c3.x, c3.y, 0);
        this._tween = null;
      } else {
        const radio = 0.5 * Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
        const dir = this.camara.position.clone().sub(this.controles.target).normalize();
        const dist = (radio / Math.sin((this.persp.fov * Math.PI) / 360)) * 0.92;
        const destino = c3.clone().add(dir.multiplyScalar(dist));
        this.controles.target.copy(c3);
        if (suave && !this._reducido()) this._tween = { t: 0, p0: this.camara.position.clone(), p1: destino };
        else { this.camara.position.copy(destino); this._tween = null; }
      }
      this.controles.update();
    }

    _reducido() { return raiz.matchMedia && raiz.matchMedia('(prefers-reduced-motion: reduce)').matches; }

    /* -------------------------------------------------------- capas */
    fijarCapas(c) { Object.assign(this.capas, c); this._aplicarCapas(); }

    _aplicarCapas() {
      const c = this.capas, tres = this.n === 3;
      this.terreno.visible = c.terreno;
      this.faldon.visible = c.terreno && tres;
      this.base.visible = c.terreno && tres;
      this.fantasma.visible = c.terreno && c.fantasma && tres;
      this.rio.visible = c.terreno && c.rio;
      this.rejillaO.visible = this.rejillaT.visible = c.rejilla;
      this.reticula.visible = c.reticula && tres;
      this.cuadrado.visible = this.cuadradoL.visible = c.unidad && !tres;
      this.cubo.visible = this.cuboL.visible = c.unidad && tres;
      this.etqUnidad.obj.visible = c.unidad && c.etiquetas;
      this.flechasBase.forEach((f, i) => (f.grupo.visible = c.base && (tres || i < 2)));
      this.etqBase.forEach((e, i) => (e.obj.visible = c.base && c.etiquetas && (tres || i < 2)));
      this.grupoPropios.visible = c.propios && this.mostrarPropios;
      if (this.objPuntos) {
        this.objPuntos.forEach(o => {
          o.vecO.grupo.visible = o.vecT.grupo.visible = c.vectores;
          o.etqO.obj.visible = o.etqT.obj.visible = c.etiquetas;
          if (o.tallo) o.tallo.visible = tres;
          if (o.tray) o.tray.visible = c.trayectorias;
        });
      }
      this.etqEjes.forEach((e, i) => (e.obj.visible = c.etiquetas && (i < 2 || tres)));
      if (this.M) this.fijarMatriz(this.M);
    }

    /** Quita los hijos de un grupo y libera sus geometrías y materiales en la GPU. */
    _vaciar(grupo) {
      grupo.traverse(o => {
        if (o === grupo) return;
        if (o.geometry && o.geometry !== this._esfera) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      grupo.clear();
    }

    /* -------------------------------------------------------- puntos */
    fijarPuntos(P, nombres) {
      this._vaciar(this.grupoPuntos);
      this.puntos = P.map(p => [p[0], p[1], p.length > 2 ? p[2] : 0]);
      this.nombres = nombres;
      const esf = this._esfera || (this._esfera = new T3.SphereGeometry(1, 24, 16));
      this.objPuntos = this.puntos.map((p, k) => {
        const mk = (color, op) => {
          const m = new T3.Mesh(esf, new T3.MeshBasicMaterial({ color, transparent: true, opacity: op, depthTest: false }));
          m.renderOrder = 14;
          const s = new T3.Sprite(new T3.SpriteMaterial({ map: this.texBrillo, color, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, blending: T3.AdditiveBlending }));
          s.renderOrder = 13;
          this.grupoPuntos.add(m, s);
          return { m, s };
        };
        const o = mk(COL.original, 0.95), t = mk(COL.transformado, 1);
        const vecO = new Flecha(COL.original, 0.03, 0.28, 0.75), vecT = new Flecha(COL.transformado, 0.035, 0.3, 0.95);
        this.grupoPuntos.add(vecO.grupo, vecT.grupo);
        const nom = nombres[k];
        const etqO = this._etiqueta('', '#5aa9ff'), etqT = this._etiqueta('', '#ff8f52');
        this.grupoPuntos.add(etqO.obj, etqT.obj);
        let tallo = null;
        const gT = new T3.BufferGeometry();
        gT.setAttribute('position', new T3.Float32BufferAttribute([p[0], p[1], 0, p[0], p[1], p[2]], 3));
        tallo = new T3.LineSegments(gT, new T3.LineDashedMaterial({ color: COL.original, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.8, depthTest: false }));
        tallo.computeLineDistances();
        tallo.renderOrder = 11;
        this.grupoPuntos.add(tallo);
        const gTr = new T3.BufferGeometry();
        gTr.setAttribute('position', new T3.BufferAttribute(new Float32Array(3 * 1200), 3));
        gTr.setAttribute('lineDistance', new T3.BufferAttribute(new Float32Array(1200), 1));
        gTr.setDrawRange(0, 0);
        const tray = new T3.Line(gTr, new T3.LineDashedMaterial({ color: COL.tray, dashSize: 0.16, gapSize: 0.12, transparent: true, opacity: 0.7, depthTest: false }));
        tray.renderOrder = 11;
        tray.frustumCulled = false;
        this.grupoPuntos.add(tray);
        return { o, t, vecO, vecT, etqO, etqT, nom, tallo, tray };
      });
      this._aplicarCapas();
    }

    /** Trayectorias de los puntos durante la animación (polilíneas, una por punto). */
    fijarTrayectorias(listas) {
      if (!this.objPuntos) return;
      this.objPuntos.forEach((o, k) => {
        const l = (listas[k] || []).slice(0, 1200);
        const atr = o.tray.geometry.getAttribute('position');   // se reutiliza: no se crean búferes nuevos
        const dist = o.tray.geometry.getAttribute('lineDistance');
        let acum = 0;
        l.forEach((q, i) => {
          const z = (q[2] || 0) + (this.n === 2 ? 0.02 : 0);
          if (i > 0) acum += Math.hypot(q[0] - atr.getX(i - 1), q[1] - atr.getY(i - 1), z - atr.getZ(i - 1));
          atr.setXYZ(i, q[0], q[1], z);
          dist.setX(i, acum);
        });
        atr.needsUpdate = true;
        dist.needsUpdate = true;
        o.tray.geometry.setDrawRange(0, l.length);
      });
    }

    /** Rectas invariantes de A (autovectores reales). */
    fijarPropios(espacios) {
      this._vaciar(this.grupoPropios);
      (espacios || []).forEach(e => {
        if (e.base.length >= this.n) return;   // todas las direcciones: no se dibuja
        e.base.forEach(v => {
          const w = [v[0], v[1], v.length > 2 ? v[2] : 0];
          const g = new T3.BufferGeometry();
          const L = 13;
          const z = this.n === 2 ? 0.015 : 0;
          g.setAttribute('position', new T3.Float32BufferAttribute([-L * w[0], -L * w[1], -L * w[2] + z, L * w[0], L * w[1], L * w[2] + z], 3));
          const l = new T3.Line(g, new T3.LineDashedMaterial({ color: COL.propio, dashSize: 0.35, gapSize: 0.22, transparent: true, opacity: 0.95, depthTest: false }));
          l.computeLineDistances();
          l.renderOrder = 8;
          this.grupoPropios.add(l);
        });
      });
    }

    /* ------------------------------------------------------- matriz */
    /** Aplica la matriz (2×2 o 3×3) a todo el mundo. */
    fijarMatriz(M) {
      const A = M.length === 3 ? M : [[M[0][0], M[0][1], 0], [M[1][0], M[1][1], 0], [0, 0, 1]];
      this.M = A;
      const m3 = new T3.Matrix3().set(A[0][0], A[0][1], A[0][2], A[1][0], A[1][1], A[1][2], A[2][0], A[2][1], A[2][2]);
      let n3;
      const det = m3.determinant();
      if (Math.abs(det) > 1e-9) n3 = m3.clone().invert().transpose();
      else n3 = new T3.Matrix3().set(A[1][1] * A[2][2] - A[1][2] * A[2][1] || 1e-6, 0, 0, 0, 1e-6, 0, 0, 0, 1e-6);
      this.grupoUnif.forEach(u => { u.uM.value.copy(m3); u.uN.value.copy(n3); });
      const ap = p => [A[0][0] * p[0] + A[0][1] * p[1] + A[0][2] * p[2], A[1][0] * p[0] + A[1][1] * p[1] + A[1][2] * p[2], A[2][0] * p[0] + A[2][1] * p[1] + A[2][2] * p[2]];
      const z2 = this.n === 2 ? 0.03 : 0;
      const esc = this.n === 2 ? 1 : 1.15;

      // imágenes de la base
      const tres = this.n === 3;
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((e, i) => {
        const q = ap(e);
        this.flechasBase[i].fijar([0, 0, z2], [q[0], q[1], q[2] + z2], esc * 0.85);
        this.etqBase[i].obj.position.set(q[0] * 1.08, q[1] * 1.08, q[2] * 1.08 + z2);
      });
      if (!tres) this.flechasBase[2].grupo.visible = false;

      // etiqueta del cuadrado / cubo unitario
      const c = tres ? ap([0.5, 0.5, 0.5]) : ap([0.5, 0.5, 0]);
      this.etqUnidad.obj.position.set(c[0], c[1], c[2] + z2);
      this.etqUnidad.div.innerHTML = (tres ? 'volumen' : 'área') + ' = |det| = ' + num(Math.abs(det), 3);

      // puntos y vectores
      if (this.objPuntos) {
        this.objPuntos.forEach((o, k) => {
          const p = this.puntos[k];
          const p0 = tres ? p : [p[0], p[1], 0];
          const q = ap(p0);
          const r = tres ? 0.14 : 0.13;
          o.o.m.position.set(p0[0], p0[1], p0[2] + z2); o.o.m.scale.setScalar(r);
          o.t.m.position.set(q[0], q[1], q[2] + z2); o.t.m.scale.setScalar(r * 1.08);
          o.o.s.position.copy(o.o.m.position); o.o.s.scale.setScalar(r * 7);
          o.t.s.position.copy(o.t.m.position); o.t.s.scale.setScalar(r * 8);
          o.vecO.fijar([0, 0, z2], [p0[0], p0[1], p0[2] + z2], esc);
          o.vecT.fijar([0, 0, z2], [q[0], q[1], q[2] + z2], esc);
          const fmt = v => '(' + v.slice(0, this.n).map(a => num(a, 3)).join('; ') + ')';
          o.etqO.div.innerHTML = `${o.nom} <small>${fmt(p0)}</small>`;
          o.etqT.div.innerHTML = `L(${o.nom}) <small>${fmt(q)}</small>`;
          o.etqO.obj.position.set(p0[0], p0[1], p0[2] + z2);
          o.etqT.obj.position.set(q[0], q[1], q[2] + z2);
          if (!this.capas.vectores) { o.vecO.grupo.visible = o.vecT.grupo.visible = false; }
        });
      }
    }

    /** Píxeles de pantalla por km en la vista en planta (para la escala gráfica). */
    pixelesPorKm() {
      if (this.camara !== this.orto) return null;
      const h = this.cont.clientHeight || 1;
      return (h * this.orto.zoom) / (this.orto.top - this.orto.bottom);
    }

    /* ------------------------------------------------------ captura */
    captura(ancho = 1280, alto = 760, conEtiquetas = true, tipo = 'image/png') {
      const w0 = this.cont.clientWidth, h0 = this.cont.clientHeight;
      const pr = this.renderer.getPixelRatio();
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(ancho, alto, false);
      this.composer.setSize(ancho, alto);
      if (this.composer.setPixelRatio) this.composer.setPixelRatio(1);
      const asp = this.aspecto;
      this.aspecto = ancho / alto;
      this.persp.aspect = this.aspecto; this.persp.updateProjectionMatrix(); this._ajustarOrto();
      this._render();
      const lienzo = document.createElement('canvas');
      lienzo.width = ancho; lienzo.height = alto;
      const g = lienzo.getContext('2d');
      g.drawImage(this.renderer.domElement, 0, 0, ancho, alto);
      if (conEtiquetas) this._dibujarEtiquetas(g, ancho, alto);
      const url = tipo === 'image/jpeg' ? lienzo.toDataURL('image/jpeg', 0.86) : lienzo.toDataURL('image/png');
      this.renderer.setPixelRatio(pr);
      this.aspecto = asp;
      this.renderer.setSize(w0, h0, false);
      this.redimensionar();
      return url;
    }

    _dibujarEtiquetas(g, W, H) {
      const v = new T3.Vector3();
      g.font = '600 15px Barlow, system-ui, sans-serif';
      g.textBaseline = 'middle';
      const dibujar = (obj, texto, color) => {
        if (!obj.visible) return;
        obj.getWorldPosition(v);
        v.project(this.camara);
        if (v.z > 1) return;
        const x = (v.x * 0.5 + 0.5) * W + 12, y = (-v.y * 0.5 + 0.5) * H;
        const t = texto.replace(/<[^>]+>/g, '');
        const w = g.measureText(t).width;
        g.fillStyle = 'rgba(10,26,38,.78)';
        g.fillRect(x - 4, y - 11, w + 10, 22);
        g.fillStyle = color; g.fillRect(x - 4, y - 11, 3, 22);
        g.fillStyle = '#f3f7fa';
        g.fillText(t, x + 3, y + 1);
      };
      (this.objPuntos || []).forEach(o => {
        if (this.capas.etiquetas) {
          dibujar(o.etqO.obj, o.etqO.div.innerHTML, '#5aa9ff');
          dibujar(o.etqT.obj, o.etqT.div.innerHTML, '#ff8f52');
        }
      });
    }

    /* ---------------------------------------------------------- bucle */
    _render() {
      if (this.efectos) this.composer.render();
      else this.renderer.render(this.escena, this.camara);
      this.css.render(this.escena, this.camara);
    }

    _bucle() {
      requestAnimationFrame(this._bucle);
      if (!this._visible || document.hidden) return;
      const dt = Math.min(this.reloj.getDelta(), 0.1);
      if (!this._reducido()) this.tiempo += dt;
      this.uRio.uTiempo.value = this.tiempo;
      if (this._tween) {
        const tw = this._tween;
        tw.t = Math.min(1, tw.t + dt / 0.75);
        const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2;
        this.camara.position.lerpVectors(tw.p0, tw.p1, e);
        if (tw.t >= 1) this._tween = null;
      }
      this.controles.update();
      this._render();
      if (this.alDibujar) this.alDibujar();
    }
  }

  TL.Escena = Escena;
  TL.COLORES_ESCENA = COL;
})(typeof window !== 'undefined' ? window : globalThis);
