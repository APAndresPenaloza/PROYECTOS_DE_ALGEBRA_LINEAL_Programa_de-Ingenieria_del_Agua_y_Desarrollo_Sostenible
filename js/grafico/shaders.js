/* ============================================================================
   shaders.js — Motor gráfico: programas GLSL
   ----------------------------------------------------------------------------
   La transformación lineal se aplica en la GPU: cada vértice se multiplica por la
   matriz uM (3×3; en R² la 2×2 se incrusta dejando z fijo). Las normales usan
   uN = (uM⁻¹)ᵀ, de modo que el sombreado sigue siendo correcto tras escalar,
   cizallar o reflejar. La cota original del vértice se conserva para el color
   hipsométrico y las curvas de nivel: el terreno transformado sigue mostrando
   los mismos datos.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});

  const comun = /* glsl */`
    uniform mat3 uM;
    uniform mat3 uN;
    uniform float uPlano;      // 1: vista en planta (el relieve se aplana a z = 0)
    uniform float uElev;       // elevación extra para capas superpuestas en planta
  `;

  const terrenoV = /* glsl */`
    ${comun}
    attribute float aFaldon;
    varying float vCota;
    varying float vFaldon;
    varying vec3 vNormal;
    varying vec3 vMundo;
    void main() {
      vec3 p = position;
      vCota = p.z;
      vFaldon = aFaldon;
      p.z *= (1.0 - uPlano);
      vec3 q = uM * p;
      vMundo = q;
      vNormal = normalize(uN * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
    }`;

  const terrenoF = /* glsl */`
    uniform vec3 uLuz;
    uniform float uContornos;
    uniform float uOpacidad;
    uniform float uFantasma;   // 1: solo curvas de nivel (terreno original)
    varying float vCota;
    varying float vFaldon;
    varying vec3 vNormal;
    varying vec3 vMundo;

    vec3 hipsometria(float h) {
      vec3 c0 = vec3(0.15, 0.33, 0.25);   // tierras bajas
      vec3 c1 = vec3(0.23, 0.44, 0.26);   // bosque
      vec3 c2 = vec3(0.44, 0.54, 0.29);   // bosque alto
      vec3 c3 = vec3(0.63, 0.59, 0.36);   // páramo
      vec3 c4 = vec3(0.53, 0.43, 0.32);   // roca
      vec3 c5 = vec3(0.47, 0.45, 0.44);   // roca alta
      vec3 c6 = vec3(0.80, 0.84, 0.87);   // nieve
      vec3 c = mix(c0, c1, smoothstep(2.6, 3.1, h));
      c = mix(c, c2, smoothstep(3.1, 3.7, h));
      c = mix(c, c3, smoothstep(3.7, 4.3, h));
      c = mix(c, c4, smoothstep(4.3, 4.9, h));
      c = mix(c, c5, smoothstep(4.9, 5.4, h));
      c = mix(c, c6, smoothstep(5.5, 5.85, h));
      return c;
    }

    float linea(float valor, float intervalo, float grosor) {
      float f = valor / intervalo;
      float d = abs(fract(f + 0.5) - 0.5);
      float w = fwidth(f) * grosor;
      return 1.0 - smoothstep(0.5 * w, 1.5 * w, d);
    }

    void main() {
      float fina = linea(vCota, 0.25, 1.0);
      float maestra = linea(vCota, 1.0, 1.6);
      if (uFantasma > 0.5) {
        float a = max(fina * 0.45, maestra * 0.9);
        if (a < 0.02 || vFaldon > 0.5) discard;
        gl_FragColor = vec4(0.86, 0.93, 0.98, a * uOpacidad);
        return;
      }
      vec3 n = normalize(vNormal);
      if (!gl_FrontFacing) n = -n;
      vec3 col;
      if (vFaldon > 0.5) {
        float b = fract(vCota * 0.9 + 0.08 * sin(vMundo.x * 1.7 + vMundo.y * 1.3));
        col = mix(vec3(0.29, 0.23, 0.18), vec3(0.35, 0.28, 0.21), smoothstep(0.42, 0.58, b));
        col *= 0.75 + 0.25 * smoothstep(0.0, 2.5, abs(vCota));
      } else {
        col = hipsometria(vCota);
      }
      float dif = max(dot(n, normalize(uLuz)), 0.0);
      col *= 0.5 + 0.12 * clamp(n.z, -1.0, 1.0) + 0.58 * dif;
      if (uContornos > 0.5 && vFaldon < 0.5) {
        col = mix(col, vec3(0.27, 0.19, 0.12), 0.28 * fina + 0.5 * maestra);
      }
      gl_FragColor = vec4(col, uOpacidad);
    }`;

  const rioV = /* glsl */`
    ${comun}
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 p = position;
      p.z = mix(p.z, uElev, uPlano);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(uM * p, 1.0);
    }`;

  const rioF = /* glsl */`
    uniform float uTiempo;
    varying vec2 vUv;
    void main() {
      float borde = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
      float flujo = 0.5 + 0.5 * sin(vUv.y * 10.0 - uTiempo * 2.4 + sin(vUv.x * 6.2832) * 0.7);
      vec3 col = mix(vec3(0.06, 0.42, 0.70), vec3(0.62, 0.95, 1.0), 0.45 * flujo * borde);
      gl_FragColor = vec4(col * (0.75 + 0.55 * borde), 0.95);
    }`;

  // Rejilla y líneas transformables (color y opacidad uniformes)
  const lineaV = /* glsl */`
    ${comun}
    uniform float uAplicar;    // 0: la línea no se transforma (rejilla original)
    void main() {
      vec3 p = position;
      p.z = mix(p.z, uElev, uPlano);
      vec3 q = mix(p, uM * p, uAplicar);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
    }`;
  const colorF = /* glsl */`
    uniform vec3 uColor;
    uniform float uOpacidad;
    void main() { gl_FragColor = vec4(uColor, uOpacidad); }`;

  // Retícula de puntos del espacio (R³)
  const reticulaV = /* glsl */`
    ${comun}
    uniform float uTam;
    varying float vAlfa;
    void main() {
      vec4 mv = modelViewMatrix * vec4(uM * position, 1.0);
      gl_PointSize = uTam * (300.0 / -mv.z);
      vAlfa = clamp(1.4 - (-mv.z) / 60.0, 0.25, 1.0);
      gl_Position = projectionMatrix * mv;
    }`;
  const reticulaF = /* glsl */`
    uniform vec3 uColor;
    varying float vAlfa;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float r = length(c);
      if (r > 0.5) discard;
      float a = smoothstep(0.5, 0.15, r);
      gl_FragColor = vec4(uColor, a * 0.75 * vAlfa);
    }`;

  // Caras del cuadrado / cubo unitario
  const caraV = /* glsl */`
    ${comun}
    void main() {
      vec3 p = position;
      p.z = mix(p.z, uElev, uPlano);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(uM * p, 1.0);
    }`;

  // Fondo del visor (degradado con un halo suave)
  const fondoV = /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
  const fondoF = /* glsl */`
    varying vec2 vUv;
    void main() {
      vec3 arriba = vec3(0.043, 0.118, 0.180);
      vec3 abajo = vec3(0.090, 0.215, 0.290);
      vec3 c = mix(abajo, arriba, smoothstep(0.0, 1.0, vUv.y));
      float halo = smoothstep(0.85, 0.0, distance(vUv, vec2(0.55, 0.42)));
      c += vec3(0.05, 0.09, 0.11) * halo;
      gl_FragColor = vec4(c, 1.0);
    }`;

  TL.SHADERS = { terrenoV, terrenoF, rioV, rioF, lineaV, colorF, reticulaV, reticulaF, caraV, fondoV, fondoF };
})(typeof window !== 'undefined' ? window : globalThis);
