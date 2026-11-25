"""
validacion_cruzada.py — Los tres motores dan los mismos números
===============================================================
1. Genera la referencia con Python + NumPy        (datos/referencia.json)
2. Compila y ejecuta el motor C++ nativo           (datos/resultados_cpp.json)
3. Ejecuta el motor JavaScript y el C++/WebAssembly en Node (datos/resultados_js.json)
4. Compara matrices, imágenes de U y V, determinantes y autovalores, y escribe
   datos/validacion_cruzada.json con la mayor diferencia por caso.

Requisitos: Python 3.10+, NumPy, g++ (o cualquier compilador C++17) y Node 18+.
Uso:  python validacion_cruzada.py
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

import generar_referencia

RAIZ = Path(__file__).resolve().parent.parent


def ejecutar(cmd: list[str], cwd: Path) -> None:
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-2000:], r.stderr[-2000:])
        raise SystemExit(f"Falló: {' '.join(cmd)}")


def dif(a, b) -> float:
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


def main() -> None:
    generar_referencia.main()
    print()
    cxx = shutil.which("g++") or shutil.which("clang++")
    if not cxx:
        raise SystemExit("No se encontró un compilador C++ (g++ o clang++).")
    ejecutar([cxx, "-std=c++17", "-O2", "-o", "motor", "main.cpp"], RAIZ / "cpp")
    ejecutar(["./motor", str(RAIZ / "datos" / "resultados_cpp.json")], RAIZ / "cpp")
    if not shutil.which("node"):
        raise SystemExit("No se encontró Node.js para ejecutar el motor JavaScript.")
    ejecutar(["node", "pruebas/motores.test.js"], RAIZ)

    ref = json.loads((RAIZ / "datos" / "referencia.json").read_text(encoding="utf-8"))
    cpp = json.loads((RAIZ / "datos" / "resultados_cpp.json").read_text(encoding="utf-8"))
    js = json.loads((RAIZ / "datos" / "resultados_js.json").read_text(encoding="utf-8"))

    filas, peor = [], 0.0
    print(f"{'Caso':<5}{'Python–C++':>14}{'Python–JS':>14}{'C++–JS':>14}   magnitudes comparadas")
    for r, c, j in zip(ref["transformaciones"], cpp["transformaciones"], js["transformaciones"]):
        eig_r = [[z[0], z[1]] for z in r["propiedades"]["autovalores"]]
        d_pc = max(dif(r["matriz"], c["matriz"]), dif(r["imagenes"], c["imagenes"]),
                   abs(r["propiedades"]["det"] - c["det"]), dif(eig_r, c["autovalores"]))
        d_pj = max(dif(r["matriz"], j["matriz"]), dif(r["imagenes"], j["imagenes"]),
                   abs(r["propiedades"]["det"] - j["det"]), dif(eig_r, j["autovalores"]))
        d_cj = max(dif(c["matriz"], j["matriz"]), dif(c["imagenes"], j["imagenes"]), abs(c["det"] - j["det"]),
                   dif(c["autovalores"], j["autovalores"]))
        filas.append({"caso": r["clave"], "python_cpp": d_pc, "python_js": d_pj, "cpp_js": d_cj})
        peor = max(peor, d_pc, d_pj, d_cj)
        print(f"{r['clave']:<5}{d_pc:>14.2e}{d_pj:>14.2e}{d_cj:>14.2e}   A, L(U|V), det, λ")
    for r, c, j in zip(ref["composiciones"], cpp["composiciones"], js["composiciones"]):
        d_pc = max(dif(r["producto"], c["producto"]), dif(r["producto_invertido"], c["producto_invertido"]),
                   dif(r["imagenes"], c["imagenes"]), abs(r["det"] - c["det"]))
        d_pj = max(dif(r["producto"], j["producto"]), dif(r["producto_invertido"], j["producto_invertido"]),
                   dif(r["imagenes"], j["imagenes"]), abs(r["det"] - j["det"]))
        d_cj = max(dif(c["producto"], j["producto"]), dif(c["imagenes"], j["imagenes"]))
        assert r["conmutan"] == c["conmutan"] == j["conmutan"], f"{r['clave']}: conmutatividad distinta"
        filas.append({"caso": r["clave"], "python_cpp": d_pc, "python_js": d_pj, "cpp_js": d_cj})
        peor = max(peor, d_pc, d_pj, d_cj)
        print(f"{r['clave']:<5}{d_pc:>14.2e}{d_pj:>14.2e}{d_cj:>14.2e}   producto, orden inverso, L(U|V), det")

    tol = 1e-12
    salida = {
        "tolerancia": tol,
        "mayor_diferencia": peor,
        "aprobado": peor < tol,
        "motores": {"python": ref["motor"], "cpp": cpp["motor"], "javascript": js["motor"],
                    "wasm_vs_js_aleatorias": js.get("max_dif_aleatorias")},
        "casos": filas,
    }
    (RAIZ / "datos" / "validacion_cruzada.json").write_text(json.dumps(salida, ensure_ascii=False, indent=2),
                                                             encoding="utf-8")
    print(f"\nMayor diferencia entre motores: {peor:.2e}  →  {'APROBADO' if peor < tol else 'REVISAR'} "
          f"(tolerancia {tol:.0e})")
    sys.exit(0 if peor < tol else 1)


if __name__ == "__main__":
    main()
