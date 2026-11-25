/* Escrito argumentativo pedido por la guía: importancia de las transformaciones lineales
   en el ejercicio profesional del ingeniero del agua (normas APA 7). */
'use strict';
const D = require('./datos.js');
const r = String.raw;
const p = (texto, op = {}) => Object.assign({ t: 'p', texto }, op);
const h1 = texto => ({ t: 'h1', texto });

const TITULO = 'La importancia de las transformaciones lineales en el ejercicio del ingeniero del agua';

module.exports = {
  archivo: 'escrito.html',
  docx: 'Escrito_Importancia_Transformaciones_Lineales.docx',
  tipo: 'Escrito argumentativo (normas APA 7)',
  titulo: TITULO,
  tituloCorto: 'Escrito: la importancia de las transformaciones lineales en el ejercicio del ingeniero del agua',
  autor: D.AUTORES_TEXTO,
  descripcion: 'Escrito argumentativo sobre la importancia de las transformaciones lineales en la profesión del ingeniero del agua (proyecto de Álgebra Lineal, Universidad de Santa Marta).',
  pie: `Escrito del proyecto «Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua». ${D.AUTORES_TEXTO}, 2026.`,
  descargas: [
    { href: 'documentos/Escrito_Importancia_Transformaciones_Lineales.pdf', texto: 'Descargar PDF' },
    { href: 'documentos/Escrito_Importancia_Transformaciones_Lineales.docx', texto: 'Descargar Word' },
  ],
  qr: { src: 'img/qr/qr_escrito.png', alt: 'dirección de este escrito', texto: 'Escanee para abrir este escrito' },
  bloques: [
    { t: 'portada', titulo: TITULO, autor: D.AUTORES, afiliacion: 'Programa de Ingeniería del Agua, Universidad de Santa Marta', curso: 'Álgebra Lineal', profesor: D.PROFESORES, fecha: '25 de noviembre de 2026' },
    { t: 'titulo', texto: TITULO },
    p('Cuando se piensa en el ingeniero del agua se imaginan caudales, presas, redes de tuberías y plantas de tratamiento, no matrices. Sin embargo, antes de calcular un caudal hay que saber dónde está cada cosa: en qué punto se mide el nivel de un río, por dónde pasa el cauce, qué cota tiene la corona de una presa, qué área drena hacia una estación. Toda esa información es espacial, y la herramienta matemática que permite moverla, medirla y representarla sin perder su significado es la transformación lineal. Este escrito sostiene que las transformaciones lineales no son un tema auxiliar del álgebra, sino una competencia profesional del ingeniero del agua, porque están presentes en cada plano que dibuja, en cada modelo que construye y en cada decisión que toma a partir de información espacial.'),

    h1('La información del ingeniero del agua es vectorial'),
    p('Las coordenadas de una estación hidrométrica, los vértices de una sección transversal o los nodos de un modelo numérico son vectores de R² o R³ (Chacuto López, 2026). Los sistemas de información geográfica y los programas de modelación aplican transformaciones a esos vectores de forma masiva y continua: al cambiar de escala un plano, al girarlo para alinearlo con un cauce o al exagerar el relieve para mostrarlo (Burrough et al., 2015). El ingeniero que no reconoce esas operaciones como transformaciones lineales las usa a ciegas; el que las reconoce sabe qué preguntar: qué conserva esta transformación y qué modifica.'),
    p(r`Esa pregunta tiene una respuesta algebraica precisa. Toda transformación lineal se escribe como $T(\vec{x}) = A\vec{x}$, y las columnas de la matriz $A$ son las imágenes de los vectores de la base (Lay et al., 2016). El determinante dice cuánto cambian las áreas o los volúmenes y si se invierte la orientación; la ortogonalidad dice si se conservan las distancias; los autovectores señalan lo que no cambia (Strang, 2016). Con tres números se sabe si un plano, una sección o una cuenca transformados todavía pueden medirse.`),

    h1('Cambiar de sistema de referencia sin perder la medida'),
    p('Los ríos no corren de oeste a este. Para describir un cauce, los modelos unidimensionales usan un abscisado a lo largo de su eje y secciones transversales perpendiculares al flujo (Brunner, 2016). Pasar de coordenadas este-norte a coordenadas del cauce es una rotación. En el proyecto, dos estaciones ubicadas en (4, 5) y (−3, 4) km definen un tramo con dirección (7, 1); al rotar los ejes un ángulo α = arctan(1/7) ≈ 8,13°, ambas estaciones quedan a la misma distancia transversal del eje y su diferencia de abscisas, 7,07 km, es la longitud real del tramo. Como la rotación es ortogonal, ninguna distancia cambia: el ingeniero puede trabajar en el sistema que más le conviene sin falsear las medidas. Saberlo no es un detalle teórico; es la condición para confiar en una longitud, una pendiente o un tiempo de viaje calculados en un sistema distinto del original.'),

    h1('Escalas y modelos: k, k² y k³'),
    p('Buena parte de la ingeniería hidráulica se ha construido con modelos físicos a escala, y su fundamento es una homotecia: el modelo es geométricamente semejante al prototipo, de modo que las longitudes se multiplican por k, las áreas por k² y los volúmenes por k³ (Chanson, 2004; Hughes, 1993). Lo mismo ocurre con cada plano: un mapa a escala 1:50 000 es una homotecia de razón 2 cm/km. Confundir esos factores tiene consecuencias graves. Si el volumen de un embalse se transfiere de un modelo a escala 1:100 al prototipo con k² en lugar de k³, el resultado queda subestimado cien veces. El álgebra lineal convierte esa regla, que suele memorizarse, en una consecuencia directa del determinante: det(kI) = k² en el plano y k³ en el espacio. Además, los modelos distorsionados, con escalas horizontal y vertical distintas, son escalamientos no uniformes, y el ingeniero debe saber que en ellos los ángulos y las pendientes no se conservan.'),

    h1('El relieve, la pendiente y la honestidad de una figura'),
    p('Los modelos digitales de elevación se presentan casi siempre con exageración vertical, porque a escala natural el relieve de una cuenca parece plano (Burrough et al., 2015). Esa exageración es un escalamiento con $s_z > 1$ y es útil para comunicar, pero altera lo que el ojo interpreta. Con una exageración 2:1, un tramo con pendiente de 14,1 % se ve como si tuviera 28,3 %. Si alguien estimara la velocidad del flujo con la pendiente leída en la figura, la ecuación de Manning, en la que la velocidad es proporcional a la raíz cuadrada de la pendiente (Chow, 1959), le daría un valor 41 % mayor que el real. El ingeniero que entiende la matriz detrás de la figura sabe que no debe medir sobre ella, y sabe también presentar sus resultados sin engañar a quien los lee, sea un colega, un comité de una cuenca o una comunidad.'),

    h1('El flujo y la mezcla también son transformaciones'),
    p('Las transformaciones lineales no solo describen planos; también describen el movimiento del agua. En un flujo cortante simple, la velocidad crece linealmente con la distancia al fondo o a la orilla, y en un intervalo de tiempo cada partícula se desplaza en proporción a esa distancia: es un cizallamiento. Su determinante vale uno, de modo que el área de una mancha de trazador se conserva aunque la mancha se estire y se incline. Ese estiramiento, combinado con la difusión, es el mecanismo de la dispersión en ríos y estuarios (Fischer et al., 1979). Entenderlo así ayuda a interpretar por qué un vertimiento se alarga aguas abajo, por qué la dilución no depende solo del caudal y por qué los modelos de calidad del agua necesitan coeficientes de dispersión.'),

    h1('Componer es decidir un orden'),
    p('En la práctica, las transformaciones se encadenan: se rota un levantamiento para alinearlo con el cauce, se exagera la escala vertical del perfil y se cambia la convención de cotas a profundidades para una batimetría. La composición de transformaciones es el producto de sus matrices, y el producto de matrices no es conmutativo (Lay et al., 2016). En el proyecto, aplicar un cortante después de rotar hacia las coordenadas del cauce no es lo mismo que aplicarlo antes: en un caso el flujo avanza a lo largo del río y en el otro hacia el este. Saber cuándo el orden importa, y por qué en otros casos no importa, por ejemplo cuando dos transformaciones actúan sobre subespacios independientes, evita errores silenciosos en los flujos de trabajo de los sistemas de información geográfica y en la programación de modelos.'),

    h1('Una competencia para la gestión sostenible del agua'),
    p('La meta 6.5 del Objetivo de Desarrollo Sostenible 6 pide implementar la gestión integrada de los recursos hídricos a todos los niveles (Naciones Unidas, 2015), y esa gestión se apoya en mapas, modelos y balances construidos con información espacial (UNESCO, 2024). Un ingeniero que domina las transformaciones lineales produce información en la que otros pueden confiar: longitudes medidas en el sistema correcto, áreas y volúmenes escalados con el factor correcto, figuras que comunican sin distorsionar. También es capaz de construir sus propias herramientas: el simulador de este proyecto aplica las transformaciones en la tarjeta gráfica con la misma matriz que se escribe en el cuaderno y verifica sus resultados con tres implementaciones independientes.'),

    h1('Conclusión'),
    p('Las transformaciones lineales están en el centro del trabajo del ingeniero del agua, aunque rara vez se nombren. Permiten cambiar de sistema de referencia sin perder la medida, construir modelos y planos a escala, comunicar el relieve con honestidad, describir la deformación del agua en movimiento y encadenar operaciones en el orden correcto. Dominar su representación matricial y sus propiedades, como el determinante, la ortogonalidad y los autovalores, convierte una herramienta que el software usa en silencio en un criterio profesional: saber, antes de calcular, qué conserva y qué modifica cada operación sobre la información del agua.'),

    {
      t: 'refs',
      items: [
        'Brunner, G. W. (2016). *HEC-RAS river analysis system: Hydraulic reference manual* (Versión 5.0, CPD-69). U.S. Army Corps of Engineers, Hydrologic Engineering Center.',
        'Burrough, P. A., McDonnell, R. A., y Lloyd, C. D. (2015). *Principles of geographical information systems* (3.ª ed.). Oxford University Press.',
        'Chacuto López, E. G. (2026). *Proyectos de álgebra lineal: Programa de Ingeniería del Agua* [Guía de proyecto no publicada]. Universidad de Santa Marta.',
        'Chanson, H. (2004). *The hydraulics of open channel flow: An introduction* (2.ª ed.). Elsevier Butterworth-Heinemann.',
        'Chow, V. T. (1959). *Open-channel hydraulics*. McGraw-Hill.',
        'Fischer, H. B., List, E. J., Koh, R. C. Y., Imberger, J., y Brooks, N. H. (1979). *Mixing in inland and coastal waters*. Academic Press.',
        'Hughes, S. A. (1993). *Physical models and laboratory techniques in coastal engineering*. World Scientific.',
        'Lay, D. C., Lay, S. R., y McDonald, J. J. (2016). *Linear algebra and its applications* (5.ª ed.). Pearson.',
        'Naciones Unidas. (2015). *Transformar nuestro mundo: la Agenda 2030 para el Desarrollo Sostenible* (A/RES/70/1).',
        'Strang, G. (2016). *Introduction to linear algebra* (5.ª ed.). Wellesley-Cambridge Press.',
        'UNESCO. (2024). *Informe Mundial de las Naciones Unidas sobre el Desarrollo de los Recursos Hídricos 2024: agua para la prosperidad y la paz*. UNESCO.',
      ],
    },
  ],
};
