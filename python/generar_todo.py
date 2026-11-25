"""
generar_todo.py — Ejecuta todo el desarrollo del proyecto en Python
===================================================================
1. Valores de referencia (datos/referencia.json, js/ecuaciones/referencia.js)
2. Las seis transformaciones T1–T6 (desarrollo en consola + figuras en img/python/)
3. Composiciones C1–C6 (objetivo específico 3)
4. Validación cruzada Python – C++ – JavaScript (si hay compilador C++ y Node.js)

Uso:  python generar_todo.py            (todo)
      python generar_todo.py --sin-validar
"""
import argparse
import runpy
import shutil
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SCRIPTS = ["generar_referencia.py", "T1_rotacion_cauce.py", "T2_homotecia_plano.py", "T3_cizallamiento_flujo.py",
           "T4_rotacion_cuenca.py", "T5_exageracion_vertical.py", "T6_reflexion_superficie.py", "composicion.py"]


def main() -> None:
    ap = argparse.ArgumentParser(description="Ejecuta todos los scripts del proyecto")
    ap.add_argument("--sin-validar", action="store_true", help="omite la validación cruzada con C++ y JS")
    a = ap.parse_args()
    sys.path.insert(0, str(AQUI))
    for s in SCRIPTS:
        print(f"\n######## {s} ########")
        sys.argv = [s]
        runpy.run_path(str(AQUI / s), run_name="__main__")
    if not a.sin_validar and (shutil.which("g++") or shutil.which("clang++")) and shutil.which("node"):
        print("\n######## validacion_cruzada.py ########")
        sys.argv = ["validacion_cruzada.py"]
        try:
            runpy.run_path(str(AQUI / "validacion_cruzada.py"), run_name="__main__")
        except SystemExit as e:
            if e.code:
                raise
    print("\nListo. Figuras en img/python/ y datos en datos/.")


if __name__ == "__main__":
    main()
