"""
T1 · Rotación de ejes −α: alinear el sistema de coordenadas con el tramo E2 → E1  (R²)
=====================================================================================
Conjunto U = {u1 = (4, 5), u2 = (−3, 4)}: posiciones en planta (km) de dos estaciones
hidrométricas respecto a un origen común. El tramo recto entre ellas tiene la dirección
u1 − u2 = (7, 1), es decir, forma un ángulo α = arctan(1/7) ≈ 8,13° con el eje x (este).

La rotación de ángulo −α da las coordenadas del cauce: s (abscisa a lo largo del tramo)
y n (desplazamiento transversal).    [ s ]   [  cos α   sen α ] [ x ]
                                     [ n ] = [ −sen α   cos α ] [ y ]

Uso:  python T1_rotacion_cauce.py            (α del tramo)
      python T1_rotacion_cauce.py --alfa 30  (otro ángulo, en grados)
"""
import argparse

import numpy as np

import figuras
import transformaciones as tl


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--alfa", type=float, default=tl.ALFA, help="ángulo del eje del cauce (grados)")
    a = ap.parse_args()
    T = tl.seis_transformaciones()[0]
    T.matriz = tl.rotacion2(-a.alfa)
    T.parametros = {"theta_grados": -a.alfa, "alfa_grados": a.alfa}
    print(tl.informe_texto(T, tl.U, tl.NOMBRES_U))

    Q = tl.aplicar(T.matriz, tl.U)
    print("\nCoordenadas del cauce:")
    for nom, q in zip(["E1", "E2"], Q):
        print(f"  {nom}: s = {tl.fmt(q[0], 4)} km (abscisa) · n = {tl.fmt(q[1], 4)} km (transversal)")
    print(f"  Δs = {tl.fmt(Q[0, 0] - Q[1, 0], 4)} km · Δn = {tl.fmt(Q[0, 1] - Q[1, 1], 6)} km")

    def extra(ax, P, Q):
        d = (P[0] - P[1]) / np.linalg.norm(P[0] - P[1])
        t = np.array([-6.0, 6.0])
        ax.plot(P[1, 0] + t * d[0], P[1, 1] + t * d[1], color=figuras.AGUA, lw=2.4, alpha=0.75, zorder=1.5,
                label="Eje del tramo E2→E1")
        ax.plot([-20, 20], [Q[0, 1], Q[0, 1]], color=figuras.AGUA, lw=1.2, ls="--", zorder=1.5)
        ax.text(-7.8, Q[0, 1] + 0.18, f"n = {tl.fmt(Q[0, 1], 3)} km", ha="left", fontsize=8.4,
                color=figuras.TINTA)
        ax.annotate("", xy=(Q[0, 0], Q[0, 1] - 1.1), xytext=(Q[1, 0], Q[1, 1] - 1.1),
                    arrowprops=dict(arrowstyle="<->", color=figuras.TINTA2, lw=0.9))
        ax.text(Q[:, 0].mean(), Q[0, 1] - 1.62, f"Δs = {tl.fmt(Q[0, 0] - Q[1, 0], 3)} km = longitud del tramo",
                ha="center", fontsize=8.4, color=figuras.TINTA,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85))

    print("Figura:", figuras.figura_r2(T, tl.U, tl.NOMBRES_U, extra=extra, lim=8))


if __name__ == "__main__":
    main()
