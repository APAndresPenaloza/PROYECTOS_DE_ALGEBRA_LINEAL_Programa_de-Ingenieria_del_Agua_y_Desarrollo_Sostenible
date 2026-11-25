"""
T5 · Escalamiento (1, 1, 2): exageración vertical 2:1 del modelo digital de elevación  (R³)
==========================================================================================
Con sx = sy = 1 y sz > 1 las cotas se multiplican por sz y el relieve se aprecia mejor.
Las pendientes dibujadas también se multiplican por sz: no deben medirse en la vista exagerada.

Uso:  python T5_exageracion_vertical.py
      python T5_exageracion_vertical.py --sz 3
"""
import argparse

import figuras
import transformaciones as tl


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--sz", type=float, default=tl.S_VERTICAL, help="factor de exageración vertical")
    a = ap.parse_args()
    T = tl.seis_transformaciones()[4]
    T.matriz = tl.escalamiento3(1, 1, a.sz)
    T.parametros = {"sx": 1, "sy": 1, "sz": a.sz}
    print(tl.informe_texto(T, tl.V, tl.NOMBRES_V))
    Q = tl.aplicar(T.matriz, tl.V)
    s0, s1 = tl.pendiente(tl.V[1], tl.V[0]), tl.pendiente(Q[1], Q[0])
    print(f"\nPendiente real {tl.fmt(100 * s0, 2)} % → dibujada {tl.fmt(100 * s1, 2)} % (×{tl.fmt(s1 / s0, 2)})")
    print("Figura:", figuras.figura_r3(T, tl.V, tl.NOMBRES_V, vista="perfil"))


if __name__ == "__main__":
    main()
