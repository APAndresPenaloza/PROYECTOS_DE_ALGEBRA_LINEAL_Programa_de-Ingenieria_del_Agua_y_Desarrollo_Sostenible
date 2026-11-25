/* Genera los códigos QR estáticos del sitio (img/qr/*.png) con qrcode-generator (MIT).
   Uso: node documentos/fuente/generar_qr.js   (requiere Python 3 con Pillow para escribir los PNG) */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const qrcode = require(path.join(RAIZ, 'lib/qrcode.js'));
const { SITIO, REPO } = require('./datos.js');
const destinos = {
  qr_simulador: SITIO,
  qr_informe: SITIO + 'informe.html',
  qr_manual: SITIO + 'manual.html',
  qr_escrito: SITIO + 'escrito.html',
  qr_repositorio: REPO,
};
const salida = {};
for (const [nombre, url] of Object.entries(destinos)) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'M');
  q.addData(url);
  q.make();
  const n = q.getModuleCount();
  salida[nombre] = { url, n, m: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (q.isDark(r, c) ? 1 : 0)).join('')) };
}
const py = `
import json, sys
from PIL import Image, ImageDraw
datos = json.loads(sys.stdin.read())
for nombre, d in datos.items():
    n, px, borde = d["n"], 12, 4
    N = (n + 2 * borde) * px
    im = Image.new("1", (N, N), 1)
    dr = ImageDraw.Draw(im)
    for r, fila in enumerate(d["m"]):
        for c, v in enumerate(fila):
            if v == "1":
                dr.rectangle([(c + borde) * px, (r + borde) * px, (c + borde + 1) * px - 1, (r + borde + 1) * px - 1], fill=0)
    im.save(sys.argv[1] + "/" + nombre + ".png", optimize=True)
    print(nombre, n, "módulos ->", d["url"])
`;
const out = execFileSync('python3', ['-c', py, path.join(RAIZ, 'img/qr')], { input: JSON.stringify(salida) });
process.stdout.write(out);
