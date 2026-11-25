/* Manual de usuario del simulador (versión web y PDF). */
'use strict';
const { SITIO, REPO, DURACION_BASE, VELOCIDADES, guion, duracionTexto, velTexto } = require('./datos.js');
const r = String.raw;
const p = (texto, op = {}) => Object.assign({ t: 'p', texto }, op);
const ps = texto => ({ t: 'p', texto, sinSangria: true });
const h1 = texto => ({ t: 'h1', texto });
const h2 = texto => ({ t: 'h2', texto });
const lista = (items, orden = false) => ({ t: 'lista', items, orden });
const nota = html => ({ t: 'solo-html', html: `<div class="callout">${html}</div>` });

const TITULO = 'Manual de usuario del simulador 3D de transformaciones lineales en R² y R³';

module.exports = {
  archivo: 'manual.html',
  docx: null,
  tipo: 'Manual de usuario',
  titulo: TITULO,
  tituloCorto: 'Manual de usuario: simulador 3D de transformaciones lineales en R² y R³',
  autor: 'Andrés Mauricio Peñaloza Fernández',
  descripcion: 'Manual de usuario del simulador 3D de transformaciones lineales en R² y R³ para la ingeniería del agua: módulos, visor, panel de cálculo, composición, informe con QR, recorrido guiado, scripts de Python y núcleo C++.',
  pie: 'Manual de usuario del simulador «Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua», versión 1.0. Andrés Mauricio Peñaloza Fernández, 2026.',
  descargas: [{ href: 'documentos/Manual_de_usuario_Simulador_Transformaciones.pdf', texto: 'Descargar PDF' }],
  qr: { src: 'img/qr/qr_manual.png', alt: 'dirección de este manual', texto: 'Escanee para abrir este manual' },
  bloques: [
    { t: 'portada', titulo: TITULO, autor: 'Andrés Mauricio Peñaloza Fernández', afiliacion: 'Programa de Ingeniería del Agua, Universidad de Santa Marta', curso: 'Álgebra Lineal', fecha: 'Versión 1.0, noviembre de 2026' },

    h1('Para qué sirve el simulador'),
    ps('El simulador desarrolla el proyecto de Álgebra Lineal del Programa de Ingeniería del Agua: aplica transformaciones lineales a dos estaciones hidrométricas en planta (conjunto U, en R²) y a dos puntos de una cuenca con su cota (conjunto V, en R³), muestra la matriz de cada transformación con su desarrollo paso a paso y explica, con lenguaje de ingeniería del agua, qué conserva y qué modifica cada una. Incluye las seis transformaciones del proyecto (T1 a T6), un laboratorio con todas las familias de la guía, un módulo de composición y un generador de informes con código QR.'),
    nota('<p><b>Resumen rápido.</b> Elija una transformación en el panel izquierdo, observe la animación en el visor y lea abajo la matriz, el producto paso a paso y las propiedades. Para entregar resultados, use la pestaña «Informe con QR».</p>'),

    h1('Cómo abrirlo'),
    h2('En línea'),
    ps(`Abra la dirección ${SITIO} en un navegador actualizado (Chrome, Edge, Firefox o Safari) o escanee el código QR de la portada. No necesita instalar nada ni crear una cuenta. El simulador funciona en computadores, tabletas y teléfonos; en pantallas pequeñas el visor aparece arriba y los controles debajo.`),
    h2('Sin conexión'),
    lista([
      `Descargue el repositorio desde ${REPO} con **Code → Download ZIP**.`,
      'Descomprima el archivo y abra `index.html` con el navegador.',
      'Todo funciona igual: las bibliotecas, las fuentes y el núcleo C++ (incrustado en `js/wasm/motor-wasm-datos.js`) están incluidos. Los códigos QR siempre apuntan a la dirección pública del sitio.',
    ], true),
    h2('Requisitos'),
    ps('El visor usa WebGL. Si aparece en blanco, active la aceleración por hardware del navegador (en Chrome: Configuración → Sistema → Usar aceleración de gráficos). En equipos lentos, desactive el botón «Efectos» del visor.'),

    h1('La pantalla principal'),
    { t: 'figura', n: 1, titulo: 'Pantalla principal del simulador', src: 'img/capturas/simulador_r2.png' },
    ps('La pantalla tiene seis zonas (Figura 1):'),
    lista([
      '**Cabecera:** enlaces al simulador, al informe del proyecto, a este manual, al escrito y al código en GitHub.',
      '**Pestañas:** «Estaciones en planta» (R²), «Puntos de la cuenca» (R³), «Composición» e «Informe con QR». A la derecha, el botón «Recorrido guiado».',
      '**Aviso de validación:** al abrir la página, el simulador repite las seis transformaciones y las seis composiciones con sus dos motores de cálculo y las compara con los valores de referencia de Python. Si todo coincide, el aviso es verde.',
      '**Panel de mando** (izquierda): transformaciones del proyecto, laboratorio, puntos, capas y exportación.',
      '**Visor** (derecha): la vista 3D con el cajetín de la matriz, las herramientas de vista y la línea de tiempo.',
      '**Panel de cálculo** (abajo): ecuaciones, propiedades y resultados.',
    ]),

    h1('Módulo «Estaciones en planta» (R²)'),
    h2('Transformaciones del proyecto'),
    ps('Las tarjetas T1, T2 y T3 cargan las transformaciones desarrolladas en el informe y las animan desde la identidad:'),
    {
      t: 'tabla', n: 1, titulo: 'Transformaciones del proyecto en R²',
      cab: ['Tarjeta', 'Transformación', 'Qué observar'], anchos: [0.8, 2.6, 4],
      filas: [
        ['T1', 'Rotación −α, con α = arctan(1/7) ≈ 8,13°', 'Las dos estaciones quedan con el mismo n (4,3841 km) y la diferencia de abscisas es la longitud del tramo (7,0711 km).'],
        ['T2', 'Homotecia k = 2 (plano a escala 1:50 000)', 'Distancias ×2, áreas ×4 y ángulos iguales.'],
        ['T3', 'Cizallamiento en x, k = 0,4 (flujo cortante)', 'El área se conserva, la figura se inclina y la orilla (eje x) no se mueve.'],
      ],
    },
    h2('Laboratorio'),
    ps('Los botones de familia (Escalamiento, Rotación, Homotecia, Reflexión, Cizallamiento y Matriz libre) cambian la transformación. Cada parámetro tiene un campo numérico y un deslizador: al moverlos, la vista y los cálculos se actualizan al instante. Los campos aceptan coma o punto decimal. Los atajos fijan valores útiles, por ejemplo «θ = −α (tramo)» o «1:25 000». En «Matriz libre» se escriben directamente las entradas de la matriz.'),
    h2('Puntos'),
    ps('La tabla de puntos muestra U (o V en R³). Puede cambiar cualquier coordenada, añadir hasta doce puntos con «Añadir punto», quitar puntos con ✕ y volver a los datos de la guía con «Restaurar U de la guía».'),
    h2('Capas'),
    {
      t: 'tabla', n: 2, titulo: 'Capas del visor',
      cab: ['Capa', 'Qué muestra'], anchos: [1.8, 5],
      filas: [
        ['Mapa o bloque de la cuenca', 'El relieve con colores hipsométricos y curvas de nivel cada 250 m (más gruesas cada 1 km). Se transforma con la misma matriz.'],
        ['Río', 'El cauce principal, que pasa por las dos estaciones.'],
        ['Rejilla', 'La rejilla original (azul grisácea) y su imagen (naranja): muestra cómo se deforma todo el plano.'],
        ['Cuadrado o cubo unitario', 'Su imagen tiene área o volumen igual a |det A|.'],
        ['Vectores', 'Los vectores de posición de los puntos originales (azul) y de sus imágenes (naranja).'],
        ['Trayectorias', 'El camino que recorre cada punto durante la animación.'],
        ['Direcciones propias', 'Las rectas que la transformación no gira (autovectores reales), en violeta, al final de la animación.'],
        ['Columnas de A', 'Las imágenes de e₁, e₂ y e₃ (flechas blancas).'],
        ['Etiquetas', 'Los nombres y las coordenadas de los puntos.'],
        ['Retícula del espacio (R³)', 'Puntos de una retícula 3D que se transforman con la matriz.'],
        ['Relieve original (R³)', 'Las curvas de nivel del relieve sin transformar, en blanco.'],
      ],
    },
    h2('Exportar'),
    ps('«CSV» descarga la matriz, los puntos, sus imágenes y las medidas en un archivo que abre Excel (separador punto y coma, coma decimal). «JSON» descarga los mismos datos para otros programas. «Copiar enlace» copia una dirección que abre el simulador con exactamente los mismos valores.'),

    h1('El visor 3D'),
    h2('Cajetín de la matriz'),
    ps('En la esquina superior izquierda, un cajetín, como el rótulo de un plano, muestra la transformación, la matriz que se está aplicando y su determinante. Durante la animación la matriz se escribe A(t) y sus números cambian en vivo; al terminar, muestra la matriz final A.'),
    h2('Línea de tiempo'),
    ps('El botón ▶ anima la transformación desde la identidad (t = 0) hasta la matriz final (t = 1); durante la animación se convierte en pausa. El deslizador permite detenerse en cualquier instante. En una composición, t va de 0 al número de pasos y cada tramo anima un factor.'),
    ps(`El selector «Velocidad», a la derecha de la línea de tiempo, controla cuánto dura cada animación. Entre paréntesis indica lo que tarda cada paso: ${VELOCIDADES.map(v => `${velTexto(v)} (${String(DURACION_BASE / v).replace('.', ',')} s)`).join(', ').replace(/, ([^,]*)$/, ' y $1')}. El simulador abre a 1×; para explicar una transformación en clase conviene 0,5× o 0,25×. El cambio se aplica de inmediato, incluso a mitad de una animación, viaja en el enlace reproducible y el navegador lo recuerda para la próxima visita. Si el sistema tiene activada la opción «reducir movimiento», las transformaciones se muestran sin animación.`),
    h2('Vistas y herramientas'),
    {
      t: 'tabla', n: 3, titulo: 'Botones del visor',
      cab: ['Botón', 'Función'], anchos: [1.6, 5],
      filas: [
        ['Planta', 'Vista desde arriba, con el norte hacia arriba, la rosa de los vientos y la escala gráfica. La rosa gira y se refleja con la transformación.'],
        ['Oblicua (R²)', 'El mapa visto en perspectiva.'],
        ['Perspectiva (R³)', 'Vista general del bloque de la cuenca.'],
        ['Perfil (R³)', 'Vista perpendicular al tramo E2→E1: muestra el perfil longitudinal (recomendada para T5).'],
        ['Lateral (R³)', 'Vista casi horizontal: muestra la reflexión respecto al plano xy (recomendada para T6).'],
        ['Encuadrar', 'Ajusta la cámara para que quepan el dominio original y el transformado.'],
        ['Efectos', 'Activa o desactiva el resplandor y el suavizado; desactívelo si el equipo es lento.'],
        ['Pantalla completa', 'Muestra solo el visor.'],
      ],
    },
    h2('Mover la cámara'),
    {
      t: 'tabla', n: 4, titulo: 'Controles de la cámara',
      cab: ['Acción', 'Ratón', 'Pantalla táctil'], anchos: [1.6, 2.6, 2.6],
      filas: [
        ['Girar (vistas 3D)', 'Arrastrar con el botón izquierdo', 'Arrastrar con un dedo'],
        ['Desplazar', 'Arrastrar con el botón derecho', 'Arrastrar con dos dedos'],
        ['Acercar o alejar', 'Rueda', 'Pellizcar'],
      ],
    },
    h2('Colores'),
    ps('Azul: conjunto original. Naranja: imagen. Aguamarina: el río. Violeta: direcciones propias. Blanco: columnas de la matriz. Los colores siguen una paleta verificada para personas con daltonismo, y cada elemento tiene además su etiqueta.'),

    h1('El panel de cálculo'),
    { t: 'figura', n: 2, titulo: 'Panel de cálculo con la transformación T1', src: 'img/capturas/panel_calculo.png' },
    ps('A la izquierda (Figura 2), sobre papel cuadriculado, el panel de ecuaciones muestra:'),
    lista([
      '**¿Qué estás viendo?:** la interpretación de la transformación en ingeniería del agua con los parámetros actuales.',
      '**Definición:** la matriz estándar simbólica de la guía.',
      '**Con los parámetros elegidos:** la matriz numérica y las fórmulas por coordenadas.',
      '**Aplicación a U o V:** el producto A·p paso a paso para cada punto.',
    ]),
    ps('A la derecha, el panel de propiedades indica qué conserva y qué modifica la transformación y explica el determinante, la ortogonalidad, los valores singulares (estiramiento máximo y mínimo y número de condición), los autovalores y la inversa. La tabla de resultados se calcula con el núcleo C++ compilado a WebAssembly y se comprueba con el motor JavaScript; debajo aparecen las medidas antes y después: distancia, área, ángulo y, en R³, pendiente.'),

    h1('Módulo «Puntos de la cuenca» (R³)'),
    ps('Funciona igual que el módulo de R², con el conjunto V y el relieve presentado como un bloque diagrama. Las tarjetas son T4 (rotación alrededor de z), T5 (exageración vertical 2:1) y T6 (reflexión respecto al plano xy). La vista cambia sola a la más adecuada: perspectiva para T4, perfil para T5 y lateral para T6.'),
    { t: 'figura', n: 3, titulo: 'Transformación T6 vista desde la vista lateral', src: 'img/capturas/visor_T6.png', ancho: 0.85, nota: 'El bloque reflejado queda bajo el plano z = 0 y las curvas blancas muestran el relieve original.' },

    h1('Módulo «Composición»'),
    { t: 'figura', n: 4, titulo: 'Módulo «Composición» con C2', src: 'img/capturas/composicion.png' },
    lista([
      'Elija una de las composiciones analizadas (C1 a C6) o arme la suya.',
      'En «Espacio», elija R² (conjunto U) o R³ (conjunto V).',
      'En «Pasos», cambie la familia y los parámetros de cada paso; súbalo (▲), bájelo (▼) o quítelo (✕). «Añadir paso» agrega uno nuevo (hasta ocho).',
      '«Invertir el orden» aplica los pasos al revés: compare los resultados.',
      '«Animar paso a paso» recorre la composición; la línea de tiempo muestra en qué paso va.',
    ], true),
    ps('El panel «¿Importa el orden?» compara la matriz M de la composición con la matriz M′ del orden inverso, dice si conmutan y muestra las imágenes de los puntos en ambos órdenes (Figura 4).'),

    h1('Informe con QR'),
    { t: 'figura', n: 5, titulo: 'Pestaña «Informe con QR»', src: 'img/capturas/informe_qr.png' },
    lista([
      'Escriba el título, los autores, el curso, la fecha y sus observaciones.',
      'Marque las transformaciones (T1 a T6) y las composiciones que quiere incluir, y si desea el escenario actual, el desarrollo paso a paso, las propiedades y las capturas del visor.',
      'Elija qué abre el código QR: la simulación con los valores actuales (recomendado), la página principal, el informe, el manual, el escrito u otra dirección.',
      'Pulse «Imprimir o guardar PDF» y elija «Guardar como PDF» en el diálogo de impresión, o «Descargar informe (HTML)» para obtener un archivo que se abre en cualquier navegador.',
    ], true),
    ps('Privacidad: todo se calcula y se genera en el navegador. El código QR contiene solo la dirección y los valores numéricos de la simulación, no el nombre de los autores ni las observaciones.'),

    h1('Recorrido guiado y video del proyecto'),
    { t: 'figura', n: 6, titulo: 'Recorrido guiado a pantalla completa', src: 'img/capturas/recorrido.png' },
    ps(`La guía del proyecto pide un video que muestre cómo se desarrollaron las transformaciones. El botón «Recorrido guiado» presenta a pantalla completa, con subtítulos, once pasos: los datos de la guía, T1 a T6 y dos composiciones (Figura 6). A velocidad 1× dura ${duracionTexto(guion(1).slice(-1)[0].hasta)}; cada paso dura lo que tarda su animación más un tiempo de lectura, de modo que el recorrido se alarga a 0,5× (${duracionTexto(guion(0.5).slice(-1)[0].hasta)}) y se acorta a 2×. La velocidad puede cambiarse durante el recorrido.`),
    {
      t: 'tabla', n: 5, titulo: 'Teclas del recorrido guiado',
      cab: ['Tecla', 'Acción'], anchos: [1.4, 5],
      filas: [['→', 'Paso siguiente'], ['←', 'Paso anterior'], ['Barra espaciadora', 'Pausa o continuar'], ['Esc', 'Salir del recorrido']],
    },
    ps('Para grabar el video: inicie una grabación de pantalla (en Windows, Win + Alt + R con la Barra de juegos; en macOS, Mayús + Cmd + 5; en cualquier sistema, OBS Studio), pulse «Recorrido guiado» y narre cada paso. El repositorio incluye `documentos/video_recorrido.mp4`, una grabación del recorrido sin narración que puede usar como base.'),

    h1('Enlaces reproducibles'),
    ps('El escenario completo se guarda en el fragmento de la dirección (lo que va después de #), que el navegador no envía al servidor. Un enlace es la dirección del sitio (véase «Cómo abrirlo») seguida de un fragmento como estos:'),
    { t: 'codigo', texto: '#sim=1&m=r2&t=T1                          T1 sobre el conjunto U\n#sim=1&m=r3&f=esc3&p=1,1,3                escalamiento (1, 1, 3) sobre V\n#sim=1&m=comp&k=C2                        composición C2\n#sim=1&m=r2&f=rot2&p=30&u=4,5;-3,4;0,6    rotación de 30° con un tercer punto (0, 6)\n#sim=1&m=comp&k=C5&vel=0.5                composición C5 a velocidad 0,5×' },
    ps('`m` es el módulo (r2, r3 o comp); `t`, una transformación del proyecto; `f` y `p`, una familia del laboratorio y sus parámetros; `u` o `v`, los puntos; `k`, una composición analizada; `vel`, la velocidad de la animación (0.25, 0.5 o 2; se omite cuando es 1×). Al abrir un enlace, el simulador valida cada campo, carga el escenario y muestra un aviso con el botón «Volver a los casos base».'),

    h1('Scripts de Python'),
    ps('La guía pide los archivos .py de cada transformación. Están en la carpeta `python/` y requieren Python 3.10 o posterior con NumPy y Matplotlib:'),
    { t: 'codigo', texto: 'pip install -r python/requirements.txt\ncd python\npython T1_rotacion_cauce.py            # T1; también: --alfa 30\npython T2_homotecia_plano.py           # T2; también: --escala 25000\npython T3_cizallamiento_flujo.py       # T3; también: --dudy 0.05 --dt 6\npython T4_rotacion_cuenca.py           # T4; también: --theta -30\npython T5_exageracion_vertical.py      # T5; también: --sz 3\npython T6_reflexion_superficie.py      # T6; también: --plano xz\npython composicion.py                  # composiciones C1–C6\npython generar_todo.py                 # todo lo anterior y la validación cruzada\npython validacion_cruzada.py           # compara Python, C++ y JavaScript' },
    ps('Cada script imprime el desarrollo completo (matriz, productos paso a paso, propiedades, medidas e interpretación) y guarda su figura en `img/python/`. `validacion_cruzada.py` necesita además un compilador de C++ y Node.js.'),

    h1('Núcleo C++'),
    ps('El núcleo de cálculo está en `cpp/` y no depende de ninguna biblioteca, ni siquiera de la estándar, para poder compilarse a WebAssembly:'),
    { t: 'codigo', texto: 'cd cpp\nmake            # programa nativo ./motor y datos/resultados_cpp.json\nmake pruebas    # 353 pruebas unitarias\nmake wasm       # wasm/motor_transformaciones.wasm (requiere clang con destino wasm32)' },
    ps('Las pruebas del motor JavaScript y del módulo WebAssembly se ejecutan con `node pruebas/motores.test.js`.'),

    h1('Solución de problemas'),
    {
      t: 'tabla', n: 6, titulo: 'Problemas frecuentes',
      cab: ['Problema', 'Causa probable', 'Solución'], anchos: [2, 2.2, 3],
      filas: [
        ['El visor aparece en blanco', 'WebGL desactivado', 'Active la aceleración por hardware o pruebe otro navegador.'],
        ['La animación va lenta', 'Equipo sin tarjeta gráfica dedicada', 'Desactive «Efectos» y la capa «Retícula del espacio».'],
        ['El aviso dice «Motor JavaScript (WebAssembly no disponible)»', 'Navegador muy antiguo o política de seguridad', 'Los resultados siguen siendo correctos con el motor JavaScript; actualice el navegador para usar el núcleo C++.'],
        ['El QR abre otra dirección', 'Copia publicada con otro nombre', 'Corrija la «Dirección pública del simulador» en la pestaña «Informe con QR».'],
        ['Un campo se pone rojo', 'Valor no numérico', 'Escriba un número; se aceptan coma y punto decimal.'],
        ['Las ecuaciones se ven sin formato al abrir sin conexión', 'El navegador bloquea las fuentes locales', 'Abra el sitio en línea o sirva la carpeta con `python -m http.server`.'],
      ],
    },

    h1('Publicar una copia propia'),
    lista([
      'Haga un *fork* del repositorio en GitHub.',
      'En **Settings → Pages**, elija **Deploy from a branch**, rama `main` y carpeta `/ (root)`.',
      'El sitio quedará en `https://<usuario>.github.io/<repositorio>/`; los códigos QR que genere el simulador usarán esa dirección automáticamente.',
    ], true),
  ],
};
