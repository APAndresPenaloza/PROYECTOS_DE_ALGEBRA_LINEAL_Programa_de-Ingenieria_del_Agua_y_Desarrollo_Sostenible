/* ============================================================================
   animador.js — Motor gráfico: animación de la transformación
   ----------------------------------------------------------------------------
   Recorre el «camino» M(t) desde la identidad (t = 0) hasta la matriz final
   (t = 1). En una composición de k pasos, t va de 0 a k y cada tramo anima un
   factor sobre el producto acumulado. Respeta «reducir movimiento».
   La velocidad es un multiplicador elegido en la línea de tiempo: a 1× cada
   tramo dura DURACION_BASE segundos; a 0,5× dura el doble.
   ========================================================================== */
(function (raiz) {
  'use strict';
  const TL = (raiz.TL = raiz.TL || {});

  const suave = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  class Animador {
    constructor(alAplicar) {
      this.alAplicar = alAplicar;
      this.camino = () => [[1, 0], [0, 1]];
      this.tramos = 1;
      this.t = 1;
      this.velocidad = 1;          // multiplicador: 0,25×, 0,5×, 1× o 2×
      this.activo = false;
      this._paso = this._paso.bind(this);
    }

    /** Segundos que dura cada tramo a la velocidad actual. */
    get duracion() { return Animador.DURACION_BASE / this.velocidad; }

    reducido() { return raiz.matchMedia && raiz.matchMedia('(prefers-reduced-motion: reduce)').matches; }

    cargar(camino, tramos = 1) {
      this.camino = camino;
      this.tramos = tramos;
    }

    /** Matriz en el instante t, con suavizado dentro de cada tramo. */
    matriz(t) {
      t = Math.max(0, Math.min(this.tramos, t));
      const k = Math.min(Math.floor(t), this.tramos - 1);
      const f = t - k;
      return this.camino(k + suave(Math.min(1, Math.max(0, f))));
    }

    ir(t) {
      this.t = Math.max(0, Math.min(this.tramos, t));
      this.alAplicar(this.matriz(this.t), this.t);
    }

    reproducir(desde = 0, alTerminar) {
      this.alTerminar = alTerminar;
      if (this.reducido()) { this.ir(this.tramos); this.activo = false; if (alTerminar) alTerminar(); return; }
      this.t = desde;
      this.activo = true;
      this._ultimo = performance.now();
      requestAnimationFrame(this._paso);
    }

    pausar() { this.activo = false; }

    _paso(ahora) {
      if (!this.activo) return;
      const dt = Math.min(0.1, Math.max(0, (ahora - this._ultimo) / 1000));   // la marca del cuadro puede ser anterior a performance.now()
      this._ultimo = ahora;
      this.t = Math.min(this.tramos, this.t + dt / this.duracion);
      this.alAplicar(this.matriz(this.t), this.t);
      if (this.t >= this.tramos) {
        this.activo = false;
        if (this.alTerminar) this.alTerminar();
        return;
      }
      requestAnimationFrame(this._paso);
    }

    /** Trayectoria de un punto a lo largo de la animación (para dibujarla). */
    trayectoria(p, muestras = 48) {
      const out = [];
      const tot = muestras * this.tramos;
      for (let i = 0; i <= tot; i++) {
        const M = this.matriz((i / tot) * this.tramos);
        out.push(M.map(f => f.reduce((s, a, j) => s + a * (p[j] || 0), 0)));
      }
      return out;
    }
  }

  Animador.DURACION_BASE = 4;   // segundos por tramo a velocidad 1×

  TL.Animador = Animador;
})(typeof window !== 'undefined' ? window : globalThis);
