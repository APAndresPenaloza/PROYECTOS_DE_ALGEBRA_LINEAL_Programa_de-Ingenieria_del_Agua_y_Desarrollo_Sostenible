"""
generar_referencia.py — Valores de referencia del proyecto (Python/NumPy)
=========================================================================

Calcula las seis transformaciones (T1–T6) y las seis composiciones (C1–C6) y
escribe:

* datos/referencia.json        → valores esperados (doble precisión)
* js/ecuaciones/referencia.js  → los mismos valores para la función validar()
                                 del simulador (funciona también sin servidor)

Uso:  python generar_referencia.py
"""
from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path

import numpy as np

import transformaciones as tl

RAIZ = Path(__file__).resolve().parent.parent


def medidas(P: np.ndarray, Q: np.ndarray) -> dict:
    out = {
        "distancia": [tl.distancia(P[0], P[1]), tl.distancia(Q[0], Q[1])],
        "area_triangulo": [tl.area_triangulo_origen(P[0], P[1]), tl.area_triangulo_origen(Q[0], Q[1])],
        "angulo_grados": [tl.angulo_entre(P[0], P[1]), tl.angulo_entre(Q[0], Q[1])],
    }
    if P.shape[1] == 3:
        out["pendiente_p2_p1"] = [tl.pendiente(P[1], P[0]), tl.pendiente(Q[1], Q[0])]
    return out


def construir() -> dict:
    ref = {
        "proyecto": "Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua",
        "motor": f"Python {'.'.join(map(str, __import__('sys').version_info[:3]))} + NumPy {np.__version__}",
        "fecha": date.today().isoformat(),
        "alfa_grados": tl.ALFA,
        "parametros": {
            "k_homotecia": tl.K_HOMOTECIA,
            "k_corte": tl.K_CORTE,
            "s_vertical": tl.S_VERTICAL,
            "theta_inclinacion": tl.THETA_INCLINACION,
        },
        "U": tl.U.tolist(),
        "V": tl.V.tolist(),
        "transformaciones": [],
        "composiciones": [],
    }
    for T in tl.seis_transformaciones():
        P = tl.U if T.espacio == "R2" else tl.V
        Q = tl.aplicar(T.matriz, P)
        ref["transformaciones"].append({
            "clave": T.clave,
            "espacio": T.espacio,
            "nombre": T.nombre,
            "tipo": T.tipo,
            "parametros": T.parametros,
            "matriz": T.matriz.tolist(),
            "imagenes": Q.tolist(),
            "propiedades": tl.propiedades(T.matriz).como_dict(),
            "medidas": medidas(P, Q),
        })
    for C in tl.composiciones():
        P = tl.U if C.espacio == "R2" else tl.V
        M, Mi = C.producto, C.producto_invertido
        ref["composiciones"].append({
            "clave": C.clave,
            "espacio": C.espacio,
            "nombre": C.nombre,
            "pasos": C.pasos,
            "producto": M.tolist(),
            "producto_invertido": Mi.tolist(),
            "conmutan": C.conmutan,
            "det": float(np.linalg.det(M)),
            "imagenes": tl.aplicar(M, P).tolist(),
            "imagenes_invertido": tl.aplicar(Mi, P).tolist(),
            "lectura": C.lectura,
        })
    return ref


def main() -> None:
    ref = construir()
    (RAIZ / "datos").mkdir(exist_ok=True)
    ruta_json = RAIZ / "datos" / "referencia.json"
    ruta_json.write_text(json.dumps(ref, ensure_ascii=False, indent=2), encoding="utf-8")

    # Versión compacta para el navegador (solo números necesarios para validar())
    web = {
        "alfa": ref["alfa_grados"],
        "T": {t["clave"]: {"M": t["matriz"], "img": t["imagenes"], "det": t["propiedades"]["det"]}
              for t in ref["transformaciones"]},
        "C": {c["clave"]: {"M": c["producto"], "Mi": c["producto_invertido"], "conmutan": c["conmutan"],
                           "det": c["det"]} for c in ref["composiciones"]},
    }
    js = ("/* Generado por python/generar_referencia.py — no editar a mano.\n"
          "   Valores de referencia (Python + NumPy) que usa validar() para comprobar\n"
          "   los motores JavaScript y C++/WebAssembly del simulador. */\n"
          "window.TL = window.TL || {};\n"
          f"TL.REFERENCIA = {json.dumps(web, ensure_ascii=False, separators=(',', ':'))};\n")
    (RAIZ / "js" / "ecuaciones").mkdir(parents=True, exist_ok=True)
    (RAIZ / "js" / "ecuaciones" / "referencia.js").write_text(js, encoding="utf-8")

    print(f"α = arctan(1/7) = {tl.fmt(tl.ALFA, 9)}°")
    for t in ref["transformaciones"]:
        imgs = "  ".join(tl.fmt_vec(q, 6) for q in t["imagenes"])
        print(f"{t['clave']}  det = {tl.fmt(t['propiedades']['det'], 6):>10}   {imgs}")
    for c in ref["composiciones"]:
        estado = "conmutan" if c["conmutan"] else "NO conmutan"
        imgs = "  ".join(tl.fmt_vec(q, 6) for q in c["imagenes"])
        print(f"{c['clave']}  det = {tl.fmt(c['det'], 6):>10}   {estado:12}  {imgs}")
    print(f"\nEscrito: {ruta_json.relative_to(RAIZ)} y js/ecuaciones/referencia.js")


if __name__ == "__main__":
    main()
