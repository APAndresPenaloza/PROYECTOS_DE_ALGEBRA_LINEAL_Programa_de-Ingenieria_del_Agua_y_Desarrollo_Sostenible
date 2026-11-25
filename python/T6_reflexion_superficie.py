"""
T6 · Reflexión respecto al plano xy: de cotas a profundidades  (R³)
==================================================================
Tomando la superficie libre (o el plano de referencia) como z = 0, la reflexión
(x, y, z) → (x, y, −z) intercambia alturas y profundidades: es el paso de la convención
topográfica (z positiva hacia arriba) a la batimétrica (profundidad positiva hacia abajo).
det = −1: conserva distancias y volúmenes pero invierte la orientación del espacio.

Uso:  python T6_reflexion_superficie.py
      python T6_reflexion_superficie.py --plano xz
"""
import argparse

import figuras
import transformaciones as tl


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--plano", choices=["xy", "xz", "yz"], default="xy", help="plano de reflexión")
    a = ap.parse_args()
    T = tl.seis_transformaciones()[5]
    T.matriz = tl.reflexion3(a.plano)
    T.parametros = {"plano": a.plano}
    print(tl.informe_texto(T, tl.V, tl.NOMBRES_V))
    Q = tl.aplicar(T.matriz, tl.V)
    for nom, p, q in zip(["E1", "E2"], tl.V, Q):
        print(f"  {nom}: cota {tl.fmt(p[2], 1)} km sobre z = 0  →  z′ = {tl.fmt(q[2], 1)} km "
              f"(profundidad de su imagen especular)")
    print("Figura:", figuras.figura_r3(T, tl.V, tl.NOMBRES_V, vista="perfil"))


if __name__ == "__main__":
    main()
