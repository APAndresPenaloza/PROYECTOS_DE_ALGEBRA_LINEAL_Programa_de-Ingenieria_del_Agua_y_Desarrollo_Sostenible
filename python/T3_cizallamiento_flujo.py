"""
T3 · Cizallamiento horizontal k = 0,4: deformación por flujo cortante  (R²)
==========================================================================
Si la velocidad u (dirección x) crece linealmente con la distancia y a la orilla,
u(y) = (du/dy)·y, en un intervalo Δt la partícula que está en (x, y) avanza u(y)·Δt:
    (x, y) → (x + k·y, y),   k = (du/dy)·Δt = 0,1 h⁻¹ × 4 h = 0,4.
Interpretamos U como dos flotadores liberados en las posiciones de las estaciones.

Uso:  python T3_cizallamiento_flujo.py
      python T3_cizallamiento_flujo.py --dudy 0.05 --dt 6
"""
import argparse

import numpy as np

import figuras
import transformaciones as tl


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--dudy", type=float, default=0.1, help="gradiente de velocidad du/dy (1/h)")
    ap.add_argument("--dt", type=float, default=4.0, help="intervalo de tiempo Δt (h)")
    a = ap.parse_args()
    k = a.dudy * a.dt
    T = tl.seis_transformaciones()[2]
    T.matriz = tl.cizallamiento2(k, "x")
    T.parametros = {"k": k, "du_dy_h-1": a.dudy, "dt_h": a.dt}
    print(tl.informe_texto(T, tl.U, tl.NOMBRES_U))
    Q = tl.aplicar(T.matriz, tl.U)
    for nom, p, q in zip(["E1", "E2"], tl.U, Q):
        print(f"  {nom}: u(y) = {tl.fmt(a.dudy * p[1], 2)} km/h → desplazamiento {tl.fmt(q[0] - p[0], 2)} km en {tl.fmt(a.dt, 1)} h")

    def extra(ax, P, Q):
        x0, esc = -7.4, 1.4
        for y in np.arange(1, 7.1, 1.0):
            ax.annotate("", xy=(x0 + esc * k * y, y), xytext=(x0, y),
                        arrowprops=dict(arrowstyle="-|>", color=figuras.AGUA, lw=1.4, mutation_scale=9))
        ax.plot([x0, x0 + esc * k * 7], [0, 7], color=figuras.AGUA, lw=1.0, ls="--")
        ax.text(x0, 7.35, "perfil de velocidad u(y) = (du/dy)·y", fontsize=8.2, color=figuras.TINTA)
        ax.text(x0, -0.62, "orilla (y = 0): no se mueve", fontsize=8.2, color=figuras.TINTA2)

    print("Figura:", figuras.figura_r2(T, tl.U, tl.NOMBRES_U, extra=extra, lim=8))


if __name__ == "__main__":
    main()
