"""
composicion.py — Composición de transformaciones lineales (objetivo específico 3)
================================================================================
Analiza cualitativa y cuantitativamente las composiciones C1–C6 sobre U y V:
producto de matrices, determinante (producto de los determinantes), conmutatividad
y efecto sobre los puntos. Genera img/python/composicion.png.

    Convención: si primero se aplica A y después B, la matriz de la composición es B·A.

Uso:  python composicion.py
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.patches import Polygon  # noqa: E402

import figuras as fg  # noqa: E402
import transformaciones as tl  # noqa: E402


def main() -> None:
    for C in tl.composiciones():
        P, nombres = (tl.U, tl.NOMBRES_U) if C.espacio == "R2" else (tl.V, tl.NOMBRES_V)
        M, Mi = C.producto, C.producto_invertido
        print("=" * 78)
        print(f"{C.clave} · {C.nombre}")
        print("  Orden de aplicación: " + "  →  ".join(C.pasos))
        print("  Matriz de la composición:")
        print(tl.imprimir_matriz(M, 6, "      "))
        dets = [float(np.linalg.det(A)) for A in C.matrices]
        print(f"  det = {' · '.join(tl.fmt(d, 4) for d in reversed(dets))} = {tl.fmt(float(np.linalg.det(M)), 6)}")
        for nom, p, q in zip(nombres, P, tl.aplicar(M, P)):
            print(f"  {nom} {tl.fmt_vec(p, 0)} → {tl.fmt_vec(q, 6)}")
        if C.conmutan:
            print("  Orden inverso: misma matriz → las transformaciones CONMUTAN.")
        else:
            print("  Orden inverso (NO conmutan):")
            print(tl.imprimir_matriz(Mi, 6, "      "))
            for nom, q in zip(nombres, tl.aplicar(Mi, P)):
                print(f"  {nom} → {tl.fmt_vec(q, 6)}")
            print(f"  ‖B·A − A·B‖ = {tl.fmt(float(np.linalg.norm(M - Mi)), 6)}")
        print("  Lectura: " + C.lectura)

    # ----------------------------------------------------------------- figura
    comps = {c.clave: c for c in tl.composiciones()}
    fig, axs = plt.subplots(1, 2, figsize=(11.2, 4.7))
    cuad = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float)

    ax = axs[0]
    C2 = comps["C2"]
    for M, color, et in ((C2.producto, fg.NARANJA, "C·R (rotar y luego cortar)"),
                         (C2.producto_invertido, fg.AGUA, "R·C (cortar y luego rotar)")):
        Q = tl.aplicar(M, tl.U)
        ax.add_patch(Polygon(tl.aplicar(M, cuad * 2), closed=True, fc=color, alpha=0.18, ec=color, lw=1.0))
        ax.scatter(Q[:, 0], Q[:, 1], s=50, c=color, edgecolors="white", linewidths=1.5, zorder=5, label=et)
        for k, q in enumerate(Q):
            ax.annotate(tl.fmt_vec(q, 3), q, xytext=(-8 if q[0] < 0 else 8, -15 if color == fg.AGUA else 8),
                        textcoords="offset points", ha="right" if q[0] < 0 else "left", fontsize=8.2,
                        color=fg.TINTA, bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none", alpha=0.85))
    ax.scatter(tl.U[:, 0], tl.U[:, 1], s=46, c=fg.AZUL, edgecolors="white", linewidths=1.5, zorder=5, label="U original")
    ax.add_patch(Polygon(cuad * 2, closed=True, fc="none", ec=fg.AZUL, lw=1.0, ls="--"))
    ax.set_title("C2 · El orden importa: C·R ≠ R·C", loc="left", fontsize=10.5)

    ax = axs[1]
    C3 = comps["C3"]
    Q = tl.aplicar(C3.producto, tl.U)
    d = np.array([7.0, 1.0]) / np.sqrt(50)
    t = np.array([-8.0, 8.0])
    ax.plot(tl.U[1, 0] + t * d[0], tl.U[1, 1] + t * d[1], color=fg.AGUA, lw=2.2, alpha=0.8, label="Eje del tramo (autovector, λ = 1)")
    ax.plot(Q[1, 0] + t * d[0], Q[1, 1] + t * d[1], color=fg.AGUA, lw=1.0, ls="--", alpha=0.9)
    for p, q in zip(tl.U, Q):
        ax.annotate("", xy=q, xytext=p, arrowprops=dict(arrowstyle="-|>", color=fg.TINTA2, lw=1.1))
    ax.scatter(tl.U[:, 0], tl.U[:, 1], s=46, c=fg.AZUL, edgecolors="white", linewidths=1.5, zorder=5, label="U original")
    ax.scatter(Q[:, 0], Q[:, 1], s=50, c=fg.NARANJA, edgecolors="white", linewidths=1.5, zorder=5,
               label="R(α)·C·R(−α)·U")
    desp = Q[0] - tl.U[0]
    ax.text(0.5, 1.2, f"Ambas estaciones se desplazan {tl.fmt_vec(desp, 3)} km,\nparalelo al cauce: la distancia E1–E2 "
            f"no cambia ({tl.fmt(tl.distancia(*Q), 3)} km)", fontsize=8.4, color=fg.TINTA, ha="center",
            bbox=dict(boxstyle="round,pad=0.35", fc="white", ec="#d0d0d0"))
    ax.set_title("C3 · Cortante a lo largo del cauce (cambio de base)", loc="left", fontsize=10.5)

    for ax in axs:
        ax.set_aspect("equal")
        ax.set_xlim(-6, 9)
        ax.set_ylim(-0.5, 8)
        ax.grid(True, color=fg.REJILLA, lw=0.7)
        ax.axhline(0, color="#9e9e9e", lw=0.8)
        ax.axvline(0, color="#9e9e9e", lw=0.8)
        ax.xaxis.set_major_formatter(fg.coma)
        ax.yaxis.set_major_formatter(fg.coma)
        ax.set_xlabel("x · este (km)")
        ax.set_ylabel("y · norte (km)")
        ax.legend(loc="upper left", fontsize=8.2, framealpha=0.95, edgecolor="#d0d0d0")
    fig.tight_layout()
    ruta = fg.CARPETA / "composicion.png"
    fig.savefig(ruta, facecolor="white")
    print("\nFigura:", ruta)


if __name__ == "__main__":
    main()
