"""
T2 · Homotecia k = 2: plano de localización a escala 1:50 000  (R²)
===================================================================
En un plano a escala 1:50 000, 1 km del terreno (100 000 cm) se dibuja como
100 000 / 50 000 = 2 cm. Leer las coordenadas de U en "cm de papel" equivale a la
homotecia L(x) = k·x con k = 2 (cm/km): longitudes ×k, áreas ×k², ángulos iguales.

Uso:  python T2_homotecia_plano.py              (escala 1:50 000)
      python T2_homotecia_plano.py --escala 25000
"""
import argparse

import figuras
import transformaciones as tl


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--escala", type=float, default=50000, help="denominador de la escala del plano")
    a = ap.parse_args()
    k = 100000.0 / a.escala
    T = tl.seis_transformaciones()[1]
    T.matriz = tl.homotecia2(k)
    T.parametros = {"k": k, "escala": f"1:{a.escala:,.0f}".replace(",", " ")}
    T.nombre = f"Homotecia k = {tl.fmtc(k, 3)}: plano a escala 1:{a.escala:,.0f}".replace(",", " ")
    print(tl.informe_texto(T, tl.U, tl.NOMBRES_U))
    Q = tl.aplicar(T.matriz, tl.U)
    d0, d1 = tl.distancia(*tl.U), tl.distancia(*Q)
    print(f"\nEn el plano: E1 en {tl.fmt_vec(Q[0], 2)} cm · E2 en {tl.fmt_vec(Q[1], 2)} cm")
    print(f"Distancia real {tl.fmt(d0, 3)} km → {tl.fmt(d1, 3)} cm en el papel (se recupera con 1/k = {tl.fmt(1 / k, 3)} km/cm)")

    def extra(ax, P, Q):
        ax.text(0.985, 0.30, f"1 km del terreno = {tl.fmtc(k, 3)} cm en el plano", transform=ax.transAxes,
                ha="right", fontsize=8.4, color=figuras.TINTA)

    print("Figura:", figuras.figura_r2(T, tl.U, tl.NOMBRES_U, extra=extra, lim=12))


if __name__ == "__main__":
    main()
