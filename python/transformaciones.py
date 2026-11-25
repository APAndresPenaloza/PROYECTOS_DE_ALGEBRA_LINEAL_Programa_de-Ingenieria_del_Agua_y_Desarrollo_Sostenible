"""
transformaciones.py — Motor de ecuaciones en Python (NumPy)
===========================================================

Proyecto: Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua
Autores:  Andrés Mauricio Peñaloza Fernández y Eliana Carolina María Wong Lubo
Curso:    Álgebra Lineal Aplicada · Programa de Ingeniería del Agua · Universidad de Santa Marta (2026)

Este módulo es la referencia matemática del proyecto. Define:

* los conjuntos de la guía:  U ⊂ R² (estaciones en planta) y V ⊂ R³ (este, norte, cota);
* las matrices estándar de escalamiento, rotación, homotecia, reflexión y
  cizallamiento en R² y R³ (ecuaciones 1 a 6 de la guía);
* las seis transformaciones elegidas (T1–T6) y las composiciones analizadas (C1–C6);
* el cálculo de propiedades geométricas con interpretación (determinante,
  ortogonalidad, autovalores, inversa, número de condición).

Los mismos cálculos están programados en C++ (cpp/) y en JavaScript (js/ecuaciones/);
`validacion_cruzada.py` comprueba que los tres motores dan los mismos números.

Convención: cada punto es una FILA de la matriz P; la imagen es P @ A.T,
que equivale a aplicar A·p a cada punto p (vector columna).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

# ---------------------------------------------------------------------------
# 1. Datos de la guía (coordenadas en km)
# ---------------------------------------------------------------------------
#: U: posiciones en planta (este, norte) de dos estaciones hidrométricas.
U = np.array([[4.0, 5.0],      # u1 → estación E1 (aguas abajo)
              [-3.0, 4.0]])    # u2 → estación E2 (aguas arriba)
NOMBRES_U = ["u1", "u2"]

#: V: coordenadas (este, norte, cota) de dos puntos de una cuenca.
V = np.array([[4.0, 5.0, 3.0],     # v1 → E1 con su cota (3 km)
              [-3.0, 4.0, 4.0]])   # v2 → E2 con su cota (4 km)
NOMBRES_V = ["v1", "v2"]

#: Ángulo del tramo E2 → E1 respecto al eje x (este). u1 − u2 = (7, 1) ⇒ tan α = 1/7.
ALFA = math.degrees(math.atan2(1.0, 7.0))          # ≈ 8.130102354 °

# Parámetros elegidos para las seis transformaciones
K_HOMOTECIA = 2.0          # plano a escala 1:50 000 → 1 km = 2 cm
K_CORTE = 0.4              # cizallamiento: k = (du/dy)·Δt = 0.1 h⁻¹ × 4 h
S_VERTICAL = 2.0           # exageración vertical 2:1
THETA_INCLINACION = 10.0   # inclinación usada en la composición C6 (grados)

TOL = 1e-12


# ---------------------------------------------------------------------------
# 2. Matrices estándar en R²  (guía, sección 3)
# ---------------------------------------------------------------------------
def escalamiento2(sx: float, sy: float) -> np.ndarray:
    """Ecuación (1): escala independiente de los ejes x e y."""
    return np.array([[sx, 0.0], [0.0, sy]])


def rotacion2(theta_grados: float) -> np.ndarray:
    """Ecuación (2): rotación antihoraria de ángulo θ alrededor del origen."""
    t = math.radians(theta_grados)
    c, s = math.cos(t), math.sin(t)
    return np.array([[c, -s], [s, c]])


def homotecia2(k: float) -> np.ndarray:
    """Ecuación (3): dilatación o contracción uniforme (sx = sy = k)."""
    return np.array([[k, 0.0], [0.0, k]])


def reflexion2(eje: str) -> np.ndarray:
    """Reflexión respecto al eje 'x', al eje 'y' o al 'origen'."""
    tabla = {
        "x": [[1.0, 0.0], [0.0, -1.0]],
        "y": [[-1.0, 0.0], [0.0, 1.0]],
        "origen": [[-1.0, 0.0], [0.0, -1.0]],
    }
    return np.array(tabla[eje])


def cizallamiento2(k: float, direccion: str = "x") -> np.ndarray:
    """Cizallamiento (transvección) en la dirección 'x' o 'y' con factor k."""
    if direccion == "x":
        return np.array([[1.0, k], [0.0, 1.0]])
    return np.array([[1.0, 0.0], [k, 1.0]])


# ---------------------------------------------------------------------------
# 3. Matrices estándar en R³  (guía, sección 4)
# ---------------------------------------------------------------------------
def escalamiento3(sx: float, sy: float, sz: float) -> np.ndarray:
    """Ecuación (4)."""
    return np.diag([float(sx), float(sy), float(sz)])


def rotacion3(eje: str, theta_grados: float) -> np.ndarray:
    """Rotación antihoraria de ángulo θ alrededor del eje 'x', 'y' o 'z'."""
    t = math.radians(theta_grados)
    c, s = math.cos(t), math.sin(t)
    if eje == "x":
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=float)
    if eje == "y":
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=float)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=float)


def homotecia3(k: float) -> np.ndarray:
    """Ecuación (5)."""
    return k * np.eye(3)


def reflexion3(plano: str) -> np.ndarray:
    """Reflexión respecto al plano 'xy', 'xz' o 'yz'."""
    d = {"xy": [1, 1, -1], "xz": [1, -1, 1], "yz": [-1, 1, 1]}[plano]
    return np.diag(np.array(d, dtype=float))


def cizallamiento3_x(ky: float, kz: float) -> np.ndarray:
    """Ecuación (6): x' = x + ky·y + kz·z (y, z no cambian)."""
    return np.array([[1.0, ky, kz], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])


# ---------------------------------------------------------------------------
# 4. Operaciones
# ---------------------------------------------------------------------------
def aplicar(A: np.ndarray, P: np.ndarray) -> np.ndarray:
    """Imagen de cada punto (fila de P) bajo la transformación de matriz A."""
    return P @ A.T


def componer(*matrices: np.ndarray) -> np.ndarray:
    """componer(A3, A2, A1) = A3·A2·A1  (primero se aplica A1, al final A3)."""
    M = np.eye(matrices[0].shape[0])
    for A in matrices:
        M = M @ A
    return M


def distancia(p: np.ndarray, q: np.ndarray) -> float:
    return float(np.linalg.norm(np.asarray(p) - np.asarray(q)))


def area_triangulo_origen(p: np.ndarray, q: np.ndarray) -> float:
    """Área del triángulo O-p-q (en R² o R³)."""
    p, q = np.asarray(p, float), np.asarray(q, float)
    if p.size == 2:
        return 0.5 * abs(p[0] * q[1] - p[1] * q[0])
    return 0.5 * float(np.linalg.norm(np.cross(p, q)))


def angulo_entre(p: np.ndarray, q: np.ndarray) -> float:
    """Ángulo (grados) entre los vectores de posición p y q."""
    c = float(np.dot(p, q) / (np.linalg.norm(p) * np.linalg.norm(q)))
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


def pendiente(p: np.ndarray, q: np.ndarray) -> float:
    """Pendiente Δz / Δ(horizontal) entre dos puntos de R³."""
    dh = math.hypot(q[0] - p[0], q[1] - p[1])
    return (q[2] - p[2]) / dh


def autovalores_ordenados(A: np.ndarray) -> list[complex]:
    """Autovalores ordenados (real descendente, luego parte imaginaria descendente)."""
    w = np.linalg.eigvals(A)
    w = [complex(round(z.real, 15), round(z.imag, 15)) for z in w]
    return sorted(w, key=lambda z: (-z.real, -z.imag))


@dataclass
class Propiedades:
    n: int
    det: float
    traza: float
    rango: int
    ortogonal: bool
    conserva_distancias: bool
    conserva_angulos: bool
    conserva_medida: bool          # área (n=2) o volumen (n=3)
    orientacion: str               # 'conserva' | 'invierte' | 'degenera'
    factor_medida: float           # |det|
    autovalores: list[complex] = field(default_factory=list)
    inversa: np.ndarray | None = None
    condicion: float = float("nan")
    valores_singulares: list[float] = field(default_factory=list)

    def como_dict(self) -> dict:
        return {
            "n": self.n,
            "det": self.det,
            "traza": self.traza,
            "rango": self.rango,
            "ortogonal": self.ortogonal,
            "conserva_distancias": self.conserva_distancias,
            "conserva_angulos": self.conserva_angulos,
            "conserva_medida": self.conserva_medida,
            "orientacion": self.orientacion,
            "factor_medida": self.factor_medida,
            "autovalores": [[z.real, z.imag] for z in self.autovalores],
            "inversa": None if self.inversa is None else self.inversa.tolist(),
            "condicion": self.condicion,
            "valores_singulares": self.valores_singulares,
        }


def propiedades(A: np.ndarray) -> Propiedades:
    """Propiedades geométricas de la transformación T(x) = A·x."""
    A = np.asarray(A, float)
    n = A.shape[0]
    det = float(np.linalg.det(A))
    sv = np.linalg.svd(A, compute_uv=False)
    rango = int(np.sum(sv > 1e-10 * max(1.0, sv[0])))
    ortogonal = bool(np.allclose(A.T @ A, np.eye(n), atol=1e-10))
    # Conserva ángulos ⇔ A = c·Q (Q ortogonal) ⇔ todos los valores singulares iguales
    conformal = bool(sv[0] > 1e-12 and abs(sv[0] - sv[-1]) < 1e-10 * sv[0])
    if abs(det) < 1e-12:
        orient = "degenera"
    else:
        orient = "conserva" if det > 0 else "invierte"
    inv = None if abs(det) < 1e-12 else np.linalg.inv(A)
    cond = float(sv[0] / sv[-1]) if sv[-1] > 1e-15 else float("inf")
    return Propiedades(
        n=n,
        det=det,
        traza=float(np.trace(A)),
        rango=rango,
        ortogonal=ortogonal,
        conserva_distancias=ortogonal,
        conserva_angulos=conformal,
        conserva_medida=bool(abs(abs(det) - 1.0) < 1e-10),
        orientacion=orient,
        factor_medida=abs(det),
        autovalores=autovalores_ordenados(A),
        inversa=inv,
        condicion=cond,
        valores_singulares=[float(x) for x in sv],
    )


# ---------------------------------------------------------------------------
# 5. Las seis transformaciones del proyecto
# ---------------------------------------------------------------------------
@dataclass
class Transformacion:
    clave: str
    espacio: str            # 'R2' | 'R3'
    nombre: str
    tipo: str               # rotacion | homotecia | cizallamiento | escalamiento | reflexion
    parametros: dict
    matriz: np.ndarray
    simbolica: str          # matriz estándar en LaTeX (guía)
    interpretacion: str
    conserva: str
    modifica: str


def seis_transformaciones() -> list[Transformacion]:
    return [
        Transformacion(
            "T1", "R2", "Rotación de ejes para alinear el sistema con el tramo E2→E1",
            "rotacion", {"theta_grados": -ALFA, "alfa_grados": ALFA},
            rotacion2(-ALFA),
            r"\begin{bmatrix}\cos\theta & -\sin\theta\\ \sin\theta & \cos\theta\end{bmatrix},\ \theta=-\alpha",
            "Expresa las estaciones en coordenadas del cauce: s (abscisa a lo largo del tramo) "
            "y n (desplazamiento transversal). Ambas estaciones quedan con el mismo n, porque están "
            "sobre el mismo tramo recto, y la diferencia de abscisas es la longitud del tramo.",
            "Distancias, ángulos, áreas y orientación (matriz ortogonal, det = 1).",
            "Solo la dirección de los ejes de referencia.",
        ),
        Transformacion(
            "T2", "R2", "Homotecia: plano de localización a escala 1:50 000",
            "homotecia", {"k": K_HOMOTECIA},
            homotecia2(K_HOMOTECIA),
            r"\begin{bmatrix}k & 0\\ 0 & k\end{bmatrix}",
            "Dibuja las estaciones en un plano a escala 1:50 000: 1 km del terreno = 2 cm en el papel. "
            "Las longitudes se multiplican por k = 2 y las áreas por k² = 4.",
            "Ángulos, forma (semejanza) y orientación.",
            "Longitudes (×k) y áreas (×k²).",
        ),
        Transformacion(
            "T3", "R2", "Cizallamiento horizontal: deformación por flujo cortante",
            "cizallamiento", {"k": K_CORTE, "direccion": "x", "du_dy_h-1": 0.1, "dt_h": 4.0},
            cizallamiento2(K_CORTE, "x"),
            r"\begin{bmatrix}1 & k\\ 0 & 1\end{bmatrix}",
            "Si la velocidad u (dirección este) crece linealmente con la distancia y a la orilla, "
            "tras Δt cada partícula pasa de (x, y) a (x + k·y, y), con k = (du/dy)·Δt = 0,1 h⁻¹ × 4 h = 0,4. "
            "Un frente de trazador se inclina y se estira, pero su área se conserva (flujo incompresible).",
            "Áreas (det = 1), orientación y las distancias a la orilla (coordenada y).",
            "Distancias y ángulos: la figura se inclina en la dirección del flujo.",
        ),
        Transformacion(
            "T4", "R3", "Rotación alrededor del eje z: alinear la cuenca con el cauce principal",
            "rotacion", {"eje": "z", "theta_grados": -ALFA, "alfa_grados": ALFA},
            rotacion3("z", -ALFA),
            r"\begin{bmatrix}\cos\theta & -\sin\theta & 0\\ \sin\theta & \cos\theta & 0\\ 0 & 0 & 1\end{bmatrix},\ \theta=-\alpha",
            "Gira la planta de la cuenca para que el eje x′ siga el cauce principal. Los dos puntos quedan "
            "en un mismo plano vertical (igual n): es el plano del perfil longitudinal del río.",
            "Distancias, ángulos, volúmenes, orientación y la cota z.",
            "Solo la orientación de la planta respecto al norte.",
        ),
        Transformacion(
            "T5", "R3", "Escalamiento: exageración vertical 2:1 del modelo digital de elevación",
            "escalamiento", {"sx": 1.0, "sy": 1.0, "sz": S_VERTICAL},
            escalamiento3(1.0, 1.0, S_VERTICAL),
            r"\begin{bmatrix}s_x & 0 & 0\\ 0 & s_y & 0\\ 0 & 0 & s_z\end{bmatrix}",
            "Con sx = sy = 1 y sz = 2 las cotas se duplican y el relieve se aprecia mejor. "
            "Las pendientes dibujadas también se duplican: en una vista exagerada no deben medirse pendientes.",
            "Posiciones en planta (x, y) y orientación.",
            "Cotas (×2), pendientes (×2), ángulos y volúmenes (×det = 2).",
        ),
        Transformacion(
            "T6", "R3", "Reflexión respecto al plano xy: de cotas a profundidades",
            "reflexion", {"plano": "xy"},
            reflexion3("xy"),
            r"\begin{bmatrix}1 & 0 & 0\\ 0 & 1 & 0\\ 0 & 0 & -1\end{bmatrix}",
            "Tomando el plano de referencia (superficie libre) como z = 0, cambia la convención de alturas "
            "positivas hacia arriba por profundidades positivas hacia abajo, como en batimetría; "
            "visualmente es el reflejo del relieve en un espejo de agua.",
            "Distancias, ángulos, volúmenes y la posición en planta.",
            "El signo de z y la orientación del espacio (det = −1).",
        ),
    ]


# ---------------------------------------------------------------------------
# 6. Composiciones analizadas (objetivo específico 3)
# ---------------------------------------------------------------------------
@dataclass
class Composicion:
    clave: str
    espacio: str
    nombre: str
    pasos: list[str]                 # en orden de aplicación (primero → último)
    matrices: list[np.ndarray]       # en orden de aplicación
    lectura: str

    @property
    def producto(self) -> np.ndarray:
        M = np.eye(self.matrices[0].shape[0])
        for A in self.matrices:      # producto = A_último ··· A_primero
            M = A @ M
        return M

    @property
    def producto_invertido(self) -> np.ndarray:
        M = np.eye(self.matrices[0].shape[0])
        for A in reversed(self.matrices):
            M = A @ M
        return M

    @property
    def conmutan(self) -> bool:
        return bool(np.allclose(self.producto, self.producto_invertido, atol=1e-12))


def composiciones() -> list[Composicion]:
    R = rotacion2(-ALFA)
    H = homotecia2(K_HOMOTECIA)
    C = cizallamiento2(K_CORTE, "x")
    Rz = rotacion3("z", -ALFA)
    S = escalamiento3(1, 1, S_VERTICAL)
    F = reflexion3("xy")
    Rx = rotacion3("x", THETA_INCLINACION)
    return [
        Composicion("C1", "R2", "Alinear con el tramo y dibujar a escala (H·R)",
                    ["T1 · rotación −α", "T2 · homotecia k = 2"], [R, H],
                    "La homotecia es k·I y conmuta con cualquier matriz: el orden no importa."),
        Composicion("C2", "R2", "Rotar y luego aplicar el cortante (C·R) frente a cortar y luego rotar (R·C)",
                    ["T1 · rotación −α", "T3 · cizallamiento k = 0,4"], [R, C],
                    "C·R ≠ R·C: el producto de matrices no es conmutativo. El cortante aplicado en "
                    "coordenadas del cauce no equivale al cortante aplicado en coordenadas este-norte."),
        Composicion("C3", "R2", "Cortante a lo largo del cauce: cambio de base R(α)·C·R(−α)",
                    ["T1 · rotación −α", "T3 · cizallamiento k = 0,4", "rotación +α (deshacer T1)"],
                    [R, C, rotacion2(ALFA)],
                    "La conjugación R(α)·C·R(−α) es un cizallamiento cuya dirección invariante es el eje "
                    "del tramo (7, 1): el flujo se desplaza paralelo al cauce. Como E1 y E2 tienen el mismo n, "
                    "se desplazan lo mismo y su distancia no cambia."),
        Composicion("C4", "R3", "Perfil longitudinal exagerado (S·Rz)",
                    ["T4 · rotación z −α", "T5 · exageración vertical 2:1"], [Rz, S],
                    "Rz actúa solo en el plano xy y S solo en z: actúan en subespacios invariantes "
                    "complementarios y por eso conmutan."),
        Composicion("C5", "R3", "Perfil exagerado en convención de profundidades (F·S·Rz)",
                    ["T4 · rotación z −α", "T5 · exageración vertical 2:1", "T6 · reflexión plano xy"],
                    [Rz, S, F],
                    "det(F·S·Rz) = (−1)(2)(1) = −2: el volumen se duplica y la orientación se invierte."),
        Composicion("C6", "R3", "Inclinar y exagerar: el orden sí importa en R³ (S·Rx frente a Rx·S)",
                    ["rotación x 10° (inclinar)", "T5 · exageración vertical 2:1"], [Rx, S],
                    "Rx mezcla y con z; por eso no conmuta con la exageración vertical: exagerar un terreno "
                    "ya inclinado no es lo mismo que inclinar un terreno exagerado."),
    ]


# ---------------------------------------------------------------------------
# 7. Utilidades de presentación (coma decimal, como en los documentos)
# ---------------------------------------------------------------------------
def fmt(x: float, d: int = 4) -> str:
    """Número con coma decimal y sin '-0'."""
    if abs(x) < 0.5 * 10 ** (-d):
        x = 0.0
    return f"{x:.{d}f}".replace(".", ",").replace("-", "−")


def fmtc(x: float, d: int = 4) -> str:
    """Como fmt, pero sin ceros finales: 2 → '2', 0.40 → '0,4'."""
    t = fmt(x, d)
    return t.rstrip("0").rstrip(",") if "," in t else t


def fmt_vec(v, d: int = 4) -> str:
    return "(" + "; ".join(fmt(float(a), d) for a in v) + ")"


def fmt_complejo(z: complex, d: int = 4) -> str:
    if abs(z.imag) < 1e-12:
        return fmt(z.real, d)
    signo = "+" if z.imag >= 0 else "−"
    return f"{fmt(z.real, d)} {signo} {fmt(abs(z.imag), d)}i"


def imprimir_matriz(A: np.ndarray, d: int = 6, sangria: str = "    ") -> str:
    filas = []
    ancho = max(len(fmt(float(a), d)) for a in A.ravel())
    for i, fila in enumerate(A):
        izq, der = ("⎡", "⎤") if i == 0 else (("⎣", "⎦") if i == len(A) - 1 else ("⎢", "⎥"))
        filas.append(sangria + izq + "  ".join(fmt(float(a), d).rjust(ancho) for a in fila) + der)
    return "\n".join(filas)


def informe_texto(T: Transformacion, P: np.ndarray, nombres: list[str]) -> str:
    """Desarrollo completo en texto (lo usan los scripts T1…T6)."""
    A = T.matriz
    Pi = aplicar(A, P)
    pr = propiedades(A)
    lin = []
    lin.append("=" * 78)
    lin.append(f"{T.clave} · {T.nombre}")
    lin.append("=" * 78)
    lin.append(f"Espacio: {T.espacio}   ·   Tipo: {T.tipo}   ·   Parámetros: {T.parametros}")
    lin.append("\nMatriz estándar A:")
    lin.append(imprimir_matriz(A))
    lin.append("\nImágenes L(p) = A·p  (km):")
    for nom, p, q in zip(nombres, P, Pi):
        terminos = []
        for i in range(A.shape[0]):
            suma = " + ".join(f"({fmt(A[i, j], 4)})({fmt(p[j], 0)})" for j in range(A.shape[1]))
            terminos.append(f"      fila {i + 1}: {suma} = {fmt(q[i], 6)}")
        lin.append(f"  L({nom}) = A·{fmt_vec(p, 0)} = {fmt_vec(q, 6)}")
        lin.extend(terminos)
    lin.append("\nPropiedades:")
    lin.append(f"  det A = {fmt(pr.det, 6)}   ·   traza = {fmt(pr.traza, 6)}   ·   rango = {pr.rango}")
    lin.append(f"  ortogonal (AᵀA = I): {'sí' if pr.ortogonal else 'no'}"
               f"   ·   conserva distancias: {'sí' if pr.conserva_distancias else 'no'}"
               f"   ·   conserva ángulos: {'sí' if pr.conserva_angulos else 'no'}")
    medida = "área" if pr.n == 2 else "volumen"
    lin.append(f"  factor de {medida} |det A| = {fmt(pr.factor_medida, 6)}   ·   orientación: {pr.orientacion}")
    lin.append("  autovalores: " + ", ".join(fmt_complejo(z, 6) for z in pr.autovalores))
    if pr.inversa is not None:
        lin.append("  inversa A⁻¹:")
        lin.append(imprimir_matriz(pr.inversa, 6, "      "))
    lin.append(f"  número de condición κ(A) = {fmt(pr.condicion, 6)}")
    if len(P) >= 2:
        d0, d1 = distancia(P[0], P[1]), distancia(Pi[0], Pi[1])
        a0, a1 = area_triangulo_origen(P[0], P[1]), area_triangulo_origen(Pi[0], Pi[1])
        lin.append("\nMedidas antes → después:")
        lin.append(f"  distancia entre puntos: {fmt(d0, 6)} → {fmt(d1, 6)}  (razón {fmt(d1 / d0, 6)})")
        lin.append(f"  área del triángulo O-p1-p2: {fmt(a0, 6)} → {fmt(a1, 6)}  (razón {fmt(a1 / a0, 6)})")
        lin.append(f"  ángulo entre vectores de posición: {fmt(angulo_entre(P[0], P[1]), 4)}° → "
                   f"{fmt(angulo_entre(Pi[0], Pi[1]), 4)}°")
        if P.shape[1] == 3:
            lin.append(f"  pendiente p2→p1: {fmt(pendiente(P[1], P[0]), 6)} → {fmt(pendiente(Pi[1], Pi[0]), 6)}")
    lin.append("\nInterpretación en ingeniería del agua:")
    lin.append("  " + T.interpretacion)
    lin.append(f"  Conserva: {T.conserva}")
    lin.append(f"  Modifica: {T.modifica}")
    return "\n".join(lin)


if __name__ == "__main__":
    for T in seis_transformaciones():
        P, nombres = (U, NOMBRES_U) if T.espacio == "R2" else (V, NOMBRES_V)
        print(informe_texto(T, P, nombres))
        print()
