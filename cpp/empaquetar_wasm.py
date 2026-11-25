"""Empaqueta el módulo WebAssembly en base64 dentro de un .js.

Así el simulador carga el motor C++ incluso al abrir index.html sin servidor
(file://), donde el navegador no permite descargar el .wasm con fetch().
"""
import base64
import hashlib
from pathlib import Path

aqui = Path(__file__).resolve().parent
wasm = aqui.parent / "wasm" / "motor_transformaciones.wasm"
salida = aqui.parent / "js" / "wasm" / "motor-wasm-datos.js"
datos = wasm.read_bytes()
salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text(
    "/* Generado por cpp/empaquetar_wasm.py a partir de wasm/motor_transformaciones.wasm\n"
    f"   (motor C++ compilado a WebAssembly · {len(datos)} bytes · sha256 {hashlib.sha256(datos).hexdigest()[:16]}). */\n"
    "window.TL = window.TL || {};\n"
    f"TL.WASM_B64 = \"{base64.b64encode(datos).decode()}\";\n",
    encoding="utf-8",
)
print(f"{wasm.name}: {len(datos)} bytes → {salida.relative_to(aqui.parent)}")
