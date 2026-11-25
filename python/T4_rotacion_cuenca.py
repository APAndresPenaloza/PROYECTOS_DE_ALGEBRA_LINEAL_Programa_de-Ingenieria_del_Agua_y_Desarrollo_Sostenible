"""
T4 · Rotación alrededor del eje z (θ = −α): alinear la cuenca con el cauce principal  (R³)
========================================================================================
Conjunto V = {v1 = (4, 5, 3), v2 = (−3, 4, 4)}: coordenadas este, norte y cota (km).
La rotación alrededor de la vertical gira la planta y conserva la cota. Con θ = −α los dos
puntos quedan con el mismo y′ = n: ambos están en el plano vertical del perfil longitudinal.

Uso:  python T4_rotacion_cuenca.py
      python T4_rotacion_cuenca.py --theta -30
"""
import argparse

import figuras
import transformaciones as tl


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--theta", type=float, default=-tl.ALFA, help="ángulo de giro alrededor de z (grados)")
    a = ap.parse_args()
    T = tl.seis_transformaciones()[3]
    T.matriz = tl.rotacion3("z", a.theta)
    T.parametros = {"eje": "z", "theta_grados": a.theta}
    print(tl.informe_texto(T, tl.V, tl.NOMBRES_V))
    Q = tl.aplicar(T.matriz, tl.V)
    print(f"\nPerfil longitudinal: s(E2) = {tl.fmt(Q[1, 0], 4)} km, z = {tl.fmt(Q[1, 2], 1)} km  →  "
          f"s(E1) = {tl.fmt(Q[0, 0], 4)} km, z = {tl.fmt(Q[0, 2], 1)} km")
    print(f"Pendiente media del tramo: {tl.fmt(100 * tl.pendiente(Q[1], Q[0]), 2)} %")
    print("Figura:", figuras.figura_r3(T, tl.V, tl.NOMBRES_V, vista="planta"))


if __name__ == "__main__":
    main()
