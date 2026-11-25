"""
figuras.py — Figuras de las transformaciones (Matplotlib)
=========================================================

Funciones de dibujo compartidas por los scripts T1…T6 y composicion.py.
Convención de color (paleta categórica validada para daltonismo, 3 tonos):
  azul    → conjunto original (U o V)
  naranja → conjunto transformado L(U) o L(V)
  aguamarina → elementos de referencia (cauce, ejes del cauce, superficie de agua)
Los textos van siempre en tinta neutra; el color solo identifica la serie.
"""
from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.patches import FancyArrowPatch, Polygon  # noqa: E402
from matplotlib.ticker import FuncFormatter  # noqa: E402

import transformaciones as tl  # noqa: E402

AZUL, NARANJA, AGUA = "#257de0", "#f47230", "#00b894"
TINTA, TINTA2, REJILLA = "#191919", "#666666", "#e6e6e6"
RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "img" / "python"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9.5,
    "axes.edgecolor": "#bdbdbd",
    "axes.labelcolor": TINTA2,
    "xtick.color": TINTA2,
    "ytick.color": TINTA2,
    "axes.titleweight": "bold",
    "axes.titlesize": 11,
    "figure.dpi": 110,
    "savefig.dpi": 200,
})

coma = FuncFormatter(lambda v, _: f"{v:g}".replace(".", ",").replace("-", "−"))


def _flecha(ax, p, color, lw=2.0, z=4):
    ax.add_patch(FancyArrowPatch((0, 0), tuple(p[:2]), arrowstyle="-|>", mutation_scale=13,
                                 color=color, lw=lw, zorder=z, shrinkA=0, shrinkB=0))


def _texto_matriz(A: np.ndarray, d: int = 4) -> str:
    filas = [[tl.fmt(float(a), d) for a in f] for f in A]
    ancho = max(len(s) for f in filas for s in f)
    lin = []
    for i, f in enumerate(filas):
        izq, der = ("⎡", "⎤") if i == 0 else (("⎣", "⎦") if i == len(filas) - 1 else ("⎢", "⎥"))
        lin.append(izq + " ".join(s.rjust(ancho) for s in f) + der)
    pre = "A = "
    return "\n".join((pre if i == len(lin) // 2 else " " * len(pre)) + l for i, l in enumerate(lin))


def _caja(ax, texto, x=0.015, y=0.985, va="top", ha="left", fs=8.6, mono=False):
    ax.text(x, y, texto, transform=ax.transAxes, va=va, ha=ha, fontsize=fs, color=TINTA,
            family="DejaVu Sans Mono" if mono else None, linespacing=1.35, zorder=10,
            bbox=dict(boxstyle="round,pad=0.45", fc="white", ec="#d0d0d0", lw=0.8, alpha=0.95))


def _pie(fig, A, lado):
    """Pie de figura: matriz A a la izquierda y medidas a la derecha (fuente monoespaciada)."""
    mat = _texto_matriz(A, 4).split("\n")
    n = max(len(mat), len(lado))
    mat += [" " * len(mat[0])] * (n - len(mat))
    lado = [""] * ((n - len(lado)) // 2) + lado + [""] * (n - len(lado) - (n - len(lado)) // 2)
    texto = "\n".join(f"{m}     {l}" for m, l in zip(mat, lado))
    fig.text(0.5, 0.025, texto, ha="center", va="bottom", fontsize=8.4, color=TINTA, family="DejaVu Sans Mono",
             linespacing=1.4, bbox=dict(boxstyle="round,pad=0.55", fc="#fafafa", ec="#d0d0d0", lw=0.8))


def _rejilla_transformada(ax, A, lim, paso=1.0):
    """Imagen de la cuadrícula entera: muestra cómo se deforma todo el plano."""
    rango = np.arange(-lim, lim + 1e-9, paso)
    t = np.linspace(-lim, lim, 2)
    for c in rango:
        for seg in (np.array([[c, c], t]), np.array([t, [c, c]])):
            q = A @ seg
            ax.plot(q[0], q[1], color=NARANJA, lw=0.5, alpha=0.18, zorder=1)


def figura_r2(T: tl.Transformacion, P: np.ndarray, nombres: list[str], extra=None,
              lim: float | None = None, archivo: str | None = None) -> Path:
    A = T.matriz
    Q = tl.aplicar(A, P)
    pr = tl.propiedades(A)
    todo = np.vstack([P, Q, [[0, 0]]])
    if lim is None:
        lim = float(np.ceil(np.abs(todo).max() + 1.5))
    fig, ax = plt.subplots(figsize=(6.6, 6.5))
    ax.set_aspect("equal")
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim * 0.35, lim)
    ax.grid(True, color=REJILLA, lw=0.7, zorder=0)
    ax.axhline(0, color="#9e9e9e", lw=0.9, zorder=1)
    ax.axvline(0, color="#9e9e9e", lw=0.9, zorder=1)
    _rejilla_transformada(ax, A, int(lim) + 4)

    # cuadrado unitario → paralelogramo (det = área)
    cuad = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float)
    ax.add_patch(Polygon(cuad, closed=True, fc="none", ec=AZUL, lw=1.0, ls="--", zorder=2))
    ax.add_patch(Polygon(tl.aplicar(A, cuad), closed=True, fc=NARANJA, alpha=0.22, ec=NARANJA, lw=1.0, zorder=2))
    # triángulos O-p1-p2
    ax.add_patch(Polygon(np.vstack([[0, 0], P]), closed=True, fc=AZUL, alpha=0.08, ec="none", zorder=2))
    ax.add_patch(Polygon(np.vstack([[0, 0], Q]), closed=True, fc=NARANJA, alpha=0.10, ec="none", zorder=2))

    for p, q in zip(P, Q):
        ax.annotate("", xy=q, xytext=p, zorder=3,
                    arrowprops=dict(arrowstyle="->", color="#9e9e9e", lw=0.9, ls=(0, (3, 3)),
                                    connectionstyle="arc3,rad=0.18"))
        _flecha(ax, p, AZUL)
        _flecha(ax, q, NARANJA)
    ax.scatter(P[:, 0], P[:, 1], s=46, c=AZUL, edgecolors="white", linewidths=1.6, zorder=6, label="Original U")
    ax.scatter(Q[:, 0], Q[:, 1], s=46, c=NARANJA, edgecolors="white", linewidths=1.6, zorder=6,
               label="Transformado L(U)")
    fondo = dict(boxstyle="round,pad=0.12", fc="white", ec="none", alpha=0.85)
    for nom, p, q in zip(nombres, P, Q):
        sub = nom[1:].translate(str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉"))
        for punto, texto, dy in ((p, f"{nom[0]}{sub} {tl.fmt_vec(p, 0)}", 9),
                                 (q, f"L({nom[0]}{sub}) {tl.fmt_vec(q, 3)}", -19)):
            izq = punto[0] < 0
            ax.annotate(texto, punto, xytext=(-8 if izq else 8, dy), textcoords="offset points",
                        ha="right" if izq else "left", fontsize=8.6, color=TINTA, zorder=7, bbox=fondo)
    if extra:
        extra(ax, P, Q)
    ax.xaxis.set_major_formatter(coma)
    ax.yaxis.set_major_formatter(coma)
    ax.set_xlabel("x · este (km)")
    ax.set_ylabel("y · norte (km)")
    ax.set_title(f"{T.clave} · {T.nombre}", loc="left", fontsize=10.5)
    d0, d1 = tl.distancia(P[0], P[1]), tl.distancia(Q[0], Q[1])
    a0, a1 = tl.area_triangulo_origen(P[0], P[1]), tl.area_triangulo_origen(Q[0], Q[1])
    lado = [f"det A = {tl.fmt(pr.det, 4)}",
            f"distancia E1–E2: {tl.fmt(d0, 3)} → {tl.fmt(d1, 3)} km",
            f"área del triángulo O-p₁-p₂: {tl.fmt(a0, 2)} → {tl.fmt(a1, 2)} km²"]
    ax.legend(loc="lower right", fontsize=8.5, frameon=True, framealpha=0.95, edgecolor="#d0d0d0")
    fig.tight_layout(rect=(0, 0.16, 1, 1))
    _pie(fig, A, lado)
    CARPETA.mkdir(parents=True, exist_ok=True)
    ruta = CARPETA / (archivo or f"{T.clave}.png")
    fig.savefig(ruta, facecolor="white")
    plt.close(fig)
    return ruta


def _perfil(ax, P, Q, titulo, agua=False):
    """Vista lateral a lo largo del tramo: s = proyección sobre la dirección (7, 1)/√50."""
    u = np.array([7.0, 1.0]) / np.sqrt(50.0)
    for pts, color, et in ((P, AZUL, "Original V"), (Q, NARANJA, "Transformado L(V)")):
        s = pts[:, :2] @ u
        ax.plot(s, pts[:, 2], color=color, lw=2.0, zorder=3)
        ax.scatter(s, pts[:, 2], s=44, c=color, edgecolors="white", linewidths=1.5, zorder=4, label=et)
        for k, (si, zi) in enumerate(zip(s, pts[:, 2])):
            ax.annotate(f"z = {tl.fmt(zi, 2)}", (si, zi), xytext=(6, 6 if zi >= 0 else -14),
                        textcoords="offset points", fontsize=8.2, color=TINTA)
    zs = np.concatenate([P[:, 2], Q[:, 2]])
    ax.set_ylim(min(zs.min(), 0 if agua else zs.min()) - 0.9, zs.max() + 0.9)
    if agua:
        ax.axhline(0, color=AGUA, lw=2.2, zorder=2)
        ax.text(0.98, 0.5, "superficie libre z = 0", transform=ax.get_yaxis_transform(), ha="right",
                va="bottom", fontsize=8, color=TINTA2)
    ax.grid(True, color=REJILLA, lw=0.7)
    ax.set_xlabel("s · distancia a lo largo del tramo (km)")
    ax.set_ylabel("z · cota (km)")
    ax.set_title(titulo, loc="left", fontsize=10)
    ax.xaxis.set_major_formatter(coma)
    ax.yaxis.set_major_formatter(coma)
    ax.legend(loc="best", fontsize=8, framealpha=0.95, edgecolor="#d0d0d0")


def _planta(ax, P, Q, titulo):
    ax.set_aspect("equal")
    for pts, color, et in ((P, AZUL, "Original V"), (Q, NARANJA, "Transformado L(V)")):
        for p in pts:
            _flecha(ax, p, color, lw=1.6)
        ax.scatter(pts[:, 0], pts[:, 1], s=44, c=color, edgecolors="white", linewidths=1.5, zorder=5, label=et)
    for pts, pre in ((P, ""), (Q, "L")):
        for k, p in enumerate(pts):
            ax.annotate(f"{pre}({'v' + '₁₂'[k]})" if pre else "v" + "₁₂"[k], p[:2],
                        xytext=(-8 if p[0] < 0 else 8, 6 if not pre else -14), textcoords="offset points",
                        ha="right" if p[0] < 0 else "left", fontsize=8.4, color=TINTA)
    ax.plot(Q[:, 0], Q[:, 1], color=AGUA, lw=1.4, ls="--", zorder=2)
    ax.text(Q[:, 0].mean(), Q[0, 1] + 0.35, "mismo n: plano del perfil", ha="center", fontsize=8, color=TINTA2)
    ax.axhline(0, color="#9e9e9e", lw=0.8)
    ax.axvline(0, color="#9e9e9e", lw=0.8)
    ax.set_xlim(-4.5, 6.5)
    ax.set_ylim(-1, 7)
    ax.grid(True, color=REJILLA, lw=0.7)
    ax.set_xlabel("x (km)")
    ax.set_ylabel("y (km)")
    ax.set_title(titulo, loc="left", fontsize=10)
    ax.xaxis.set_major_formatter(coma)
    ax.yaxis.set_major_formatter(coma)
    ax.legend(loc="lower right", fontsize=8, framealpha=0.95, edgecolor="#d0d0d0")


def figura_r3(T: tl.Transformacion, P: np.ndarray, nombres: list[str], vista: str = "perfil",
              archivo: str | None = None) -> Path:
    A = T.matriz
    Q = tl.aplicar(A, P)
    pr = tl.propiedades(A)
    fig = plt.figure(figsize=(10.6, 5.9))
    ax = fig.add_subplot(1, 2, 1, projection="3d")
    ax.set_proj_type("persp", focal_length=0.9)

    # cubo unitario → paralelepípedo (|det| = volumen)
    v = np.array([[x, y, z] for x in (0, 1) for y in (0, 1) for z in (0, 1)], float)
    aristas = [(0, 1), (0, 2), (0, 4), (1, 3), (1, 5), (2, 3), (2, 6), (3, 7), (4, 5), (4, 6), (5, 7), (6, 7)]
    w = tl.aplicar(A, v)
    for i, j in aristas:
        ax.plot(*zip(v[i], v[j]), color=AZUL, lw=0.8, ls="--", alpha=0.8)
        ax.plot(*zip(w[i], w[j]), color=NARANJA, lw=1.1, alpha=0.9)
    if T.tipo == "reflexion":
        xx, yy = np.meshgrid([-5, 6], [-1, 7])
        ax.plot_surface(xx, yy, np.zeros_like(xx, dtype=float), color=AGUA, alpha=0.16, linewidth=0)
    for pts, color, et in ((P, AZUL, "Original V"), (Q, NARANJA, "Transformado L(V)")):
        for p in pts:
            ax.quiver(0, 0, 0, *p, color=color, lw=1.8, arrow_length_ratio=0.08)
            ax.plot([p[0], p[0]], [p[1], p[1]], [0, p[2]], color=color, lw=0.8, ls=":", alpha=0.9)
        ax.scatter(pts[:, 0], pts[:, 1], pts[:, 2], s=40, c=color, edgecolors="white", linewidths=1.2,
                   depthshade=False, label=et)
    for nom, p, q in zip(nombres, P, Q):
        sub = nom[1:].translate(str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉"))
        ax.text(*p, f"  {nom[0]}{sub}", fontsize=8.5, color=TINTA)
        ax.text(*q, f"  L({nom[0]}{sub})", fontsize=8.5, color=TINTA)
    ax.set_xlabel("x · este (km)", labelpad=2)
    ax.set_ylabel("y · norte (km)", labelpad=2)
    ax.set_zlabel("z · cota (km)", labelpad=2)
    ax.view_init(elev=22, azim=-58)
    fig.suptitle(f"{T.clave} · {T.nombre}", x=0.02, ha="left", fontsize=11.5, fontweight="bold")
    ax.legend(loc="upper left", fontsize=8, framealpha=0.95, edgecolor="#d0d0d0")
    for eje in (ax.xaxis, ax.yaxis, ax.zaxis):
        eje.set_major_formatter(coma)
        eje.pane.set_facecolor((0.97, 0.97, 0.97, 1))

    ax2 = fig.add_subplot(1, 2, 2)
    if vista == "planta":
        _planta(ax2, P, Q, "Vista en planta (plano xy)")
    else:
        _perfil(ax2, P, Q, "Perfil a lo largo del tramo E2 → E1", agua=(T.tipo == "reflexion"))
    lado = [f"det A = {tl.fmt(pr.det, 4)}",
            f"distancia v₁–v₂: {tl.fmt(tl.distancia(P[0], P[1]), 3)} → {tl.fmt(tl.distancia(Q[0], Q[1]), 3)} km"]
    if T.tipo != "reflexion":
        lado.append(f"pendiente E2→E1: {tl.fmt(tl.pendiente(P[1], P[0]), 4)} → {tl.fmt(tl.pendiente(Q[1], Q[0]), 4)}")
    else:
        lado.append("orientación: se invierte (det < 0)")
    fig.tight_layout(rect=(0, 0.17, 1, 0.95))
    _pie(fig, A, lado)
    CARPETA.mkdir(parents=True, exist_ok=True)
    ruta = CARPETA / (archivo or f"{T.clave}.png")
    fig.savefig(ruta, facecolor="white")
    plt.close(fig)
    return ruta
