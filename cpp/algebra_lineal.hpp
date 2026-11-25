// ============================================================================
// algebra_lineal.hpp — Núcleo de álgebra lineal del motor C++ (2×2 y 3×3)
// ----------------------------------------------------------------------------
// Proyecto: Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua
// Autor:    Andrés Mauricio Peñaloza Fernández · Universidad de Santa Marta · 2026
//
// Sin dependencias (ni libc ni STL) para poder compilarse a WebAssembly.
// Matrices en orden por filas: a[i*n + j] = elemento (i, j), con n = 2 o 3.
//
// Contenido:
//   · matrices estándar de la guía: escalamiento, rotación, homotecia, reflexión, cizallamiento
//   · producto, aplicación a puntos, transpuesta, traza, determinante, inversa (adjunta)
//   · autovalores (reales o complejos) por estructura de bloques o polinomio característico
//   · valores singulares (Jacobi sobre AᵀA) → rango, número de condición, conformidad
//   · propiedades geométricas con su lectura hidráulica (códigos para la interfaz)
// ============================================================================
#ifndef TL_ALGEBRA_LINEAL_HPP
#define TL_ALGEBRA_LINEAL_HPP

#include "mate.hpp"

namespace tl {

struct Mat {
    int n = 3;
    double a[9] = {0, 0, 0, 0, 0, 0, 0, 0, 0};
    double operator()(int i, int j) const { return a[i * n + j]; }
    double& operator()(int i, int j) { return a[i * n + j]; }
};

// ---------------------------------------------------------------- utilidades
inline Mat identidad(int n) {
    Mat m; m.n = n;
    for (int i = 0; i < n; ++i) m(i, i) = 1.0;
    return m;
}

inline Mat desde(int n, const double* v) {
    Mat m; m.n = n;
    for (int k = 0; k < n * n; ++k) m.a[k] = v[k];
    return m;
}

inline Mat producto(const Mat& A, const Mat& B) {   // A·B
    Mat C; C.n = A.n;
    for (int i = 0; i < A.n; ++i)
        for (int j = 0; j < A.n; ++j) {
            double s = 0.0;
            for (int k = 0; k < A.n; ++k) s += A(i, k) * B(k, j);
            C(i, j) = s;
        }
    return C;
}

inline void aplicar(const Mat& A, const double* p, double* q) {   // q = A·p
    for (int i = 0; i < A.n; ++i) {
        double s = 0.0;
        for (int j = 0; j < A.n; ++j) s += A(i, j) * p[j];
        q[i] = s;
    }
}

inline Mat transpuesta(const Mat& A) {
    Mat T; T.n = A.n;
    for (int i = 0; i < A.n; ++i)
        for (int j = 0; j < A.n; ++j) T(i, j) = A(j, i);
    return T;
}

inline double traza(const Mat& A) {
    double s = 0.0;
    for (int i = 0; i < A.n; ++i) s += A(i, i);
    return s;
}

inline double determinante(const Mat& A) {
    if (A.n == 2) return A(0, 0) * A(1, 1) - A(0, 1) * A(1, 0);
    return A(0, 0) * (A(1, 1) * A(2, 2) - A(1, 2) * A(2, 1))
         - A(0, 1) * (A(1, 0) * A(2, 2) - A(1, 2) * A(2, 0))
         + A(0, 2) * (A(1, 0) * A(2, 1) - A(1, 1) * A(2, 0));
}

// Inversa por la matriz adjunta: A⁻¹ = adj(A) / det(A).
inline bool inversa(const Mat& A, Mat& R, double tol = 1e-12) {
    double d = determinante(A);
    R.n = A.n;
    if (mate::absd(d) < tol) return false;
    if (A.n == 2) {
        R(0, 0) = A(1, 1) / d;  R(0, 1) = -A(0, 1) / d;
        R(1, 0) = -A(1, 0) / d; R(1, 1) = A(0, 0) / d;
        return true;
    }
    R(0, 0) = (A(1, 1) * A(2, 2) - A(1, 2) * A(2, 1)) / d;
    R(0, 1) = (A(0, 2) * A(2, 1) - A(0, 1) * A(2, 2)) / d;
    R(0, 2) = (A(0, 1) * A(1, 2) - A(0, 2) * A(1, 1)) / d;
    R(1, 0) = (A(1, 2) * A(2, 0) - A(1, 0) * A(2, 2)) / d;
    R(1, 1) = (A(0, 0) * A(2, 2) - A(0, 2) * A(2, 0)) / d;
    R(1, 2) = (A(0, 2) * A(1, 0) - A(0, 0) * A(1, 2)) / d;
    R(2, 0) = (A(1, 0) * A(2, 1) - A(1, 1) * A(2, 0)) / d;
    R(2, 1) = (A(0, 1) * A(2, 0) - A(0, 0) * A(2, 1)) / d;
    R(2, 2) = (A(0, 0) * A(1, 1) - A(0, 1) * A(1, 0)) / d;
    return true;
}

inline double norma_frobenius_dif_identidad(const Mat& M) {   // ‖M − I‖_F
    double s = 0.0;
    for (int i = 0; i < M.n; ++i)
        for (int j = 0; j < M.n; ++j) {
            double e = M(i, j) - (i == j ? 1.0 : 0.0);
            s += e * e;
        }
    return mate::raiz(s);
}

// ---------------------------------------------------- matrices estándar (guía)
enum Tipo : int {
    ESCALAMIENTO2 = 1, ROTACION2 = 2, HOMOTECIA2 = 3, REFLEXION2 = 4, CIZALLAMIENTO2 = 5,
    ESCALAMIENTO3 = 11, ROTACION3 = 12, HOMOTECIA3 = 13, REFLEXION3 = 14, CIZALLAMIENTO3 = 15
};

// p1, p2, p3 según el tipo:
//   ESCALAMIENTO2 (sx, sy)          ROTACION2 (θ°)          HOMOTECIA2 (k)
//   REFLEXION2 (eje: 0=x, 1=y, 2=origen)                     CIZALLAMIENTO2 (k, dir: 0=x, 1=y)
//   ESCALAMIENTO3 (sx, sy, sz)      ROTACION3 (eje: 0=x, 1=y, 2=z, θ°)   HOMOTECIA3 (k)
//   REFLEXION3 (plano: 0=xy, 1=xz, 2=yz)
//   CIZALLAMIENTO3 (eje afectado: 0=x, 1=y, 2=z, k1, k2) — p. ej. eje x: x' = x + k1·y + k2·z
inline bool matriz_estandar(int tipo, double p1, double p2, double p3, Mat& M) {
    switch (tipo) {
        case ESCALAMIENTO2: M = identidad(2); M(0, 0) = p1; M(1, 1) = p2; return true;
        case ROTACION2: {
            double s, c; mate::seno_coseno_grados(p1, s, c);
            M = identidad(2); M(0, 0) = c; M(0, 1) = -s; M(1, 0) = s; M(1, 1) = c; return true;
        }
        case HOMOTECIA2: M = identidad(2); M(0, 0) = p1; M(1, 1) = p1; return true;
        case REFLEXION2: {
            M = identidad(2);
            int e = static_cast<int>(p1);
            if (e == 0) M(1, 1) = -1.0;
            else if (e == 1) M(0, 0) = -1.0;
            else { M(0, 0) = -1.0; M(1, 1) = -1.0; }
            return true;
        }
        case CIZALLAMIENTO2:
            M = identidad(2);
            if (static_cast<int>(p2) == 0) M(0, 1) = p1; else M(1, 0) = p1;
            return true;
        case ESCALAMIENTO3: M = identidad(3); M(0, 0) = p1; M(1, 1) = p2; M(2, 2) = p3; return true;
        case ROTACION3: {
            double s, c; mate::seno_coseno_grados(p2, s, c);
            M = identidad(3);
            int e = static_cast<int>(p1);
            if (e == 0)      { M(1, 1) = c; M(1, 2) = -s; M(2, 1) = s; M(2, 2) = c; }
            else if (e == 1) { M(0, 0) = c; M(0, 2) = s;  M(2, 0) = -s; M(2, 2) = c; }
            else             { M(0, 0) = c; M(0, 1) = -s; M(1, 0) = s;  M(1, 1) = c; }
            return true;
        }
        case HOMOTECIA3: M = identidad(3); M(0, 0) = p1; M(1, 1) = p1; M(2, 2) = p1; return true;
        case REFLEXION3: {
            M = identidad(3);
            int pl = static_cast<int>(p1);
            if (pl == 0) M(2, 2) = -1.0; else if (pl == 1) M(1, 1) = -1.0; else M(0, 0) = -1.0;
            return true;
        }
        case CIZALLAMIENTO3: {
            M = identidad(3);
            int e = static_cast<int>(p1);
            int o1 = (e + 1) % 3, o2 = (e + 2) % 3;
            // Orden natural de las "otras" coordenadas (x: y,z · y: x,z · z: x,y)
            if (o1 > o2) { int t = o1; o1 = o2; o2 = t; }
            M(e, o1) = p2; M(e, o2) = p3;
            return true;
        }
        default: return false;
    }
}

// --------------------------------------------------------------- autovalores
// Raíces de λ² + pλ + q = 0 (reales o complejas conjugadas).
inline void raices_cuadratica(double p, double q, double* re, double* im) {
    double h = -0.5 * p;
    double disc = h * h - q;
    if (disc >= 0.0) {
        double r = mate::raiz(disc);
        // Fórmula estable: evita la cancelación cuando |h| ≫ r
        double l1 = h + (h >= 0.0 ? r : -r);
        double l2 = (l1 != 0.0) ? q / l1 : h - (h >= 0.0 ? r : -r);
        if (l1 < l2) { double t = l1; l1 = l2; l2 = t; }
        re[0] = l1; im[0] = 0.0; re[1] = l2; im[1] = 0.0;
    } else {
        double r = mate::raiz(-disc);
        re[0] = h; im[0] = r; re[1] = h; im[1] = -r;
    }
}

// Raíz real de λ³ + bλ² + cλ + d por bisección + Newton (siempre existe una).
inline double raiz_real_cubica(double b, double c, double d) {
    auto f = [&](double x) { return ((x + b) * x + c) * x + d; };
    double R = 1.0 + mate::maxd(mate::absd(b), mate::maxd(mate::absd(c), mate::absd(d)));
    double lo = -R, hi = R;
    for (int k = 0; k < 200 && hi - lo > 1e-15 * R; ++k) {
        double m = 0.5 * (lo + hi);
        if ((f(lo) < 0.0) == (f(m) < 0.0)) lo = m; else hi = m;
    }
    double x = 0.5 * (lo + hi);
    for (int k = 0; k < 4; ++k) {                       // pulido de Newton
        double df = (3.0 * x + 2.0 * b) * x + c;
        if (df == 0.0) break;
        double nx = x - f(x) / df;
        if (!(nx == nx)) break;
        x = nx;
    }
    return x;
}

inline bool es_casi_cero(double x, double esc) { return mate::absd(x) <= 1e-14 * (esc > 1.0 ? esc : 1.0); }

// Ordena por parte real descendente y, a igualdad, por parte imaginaria descendente.
inline void ordenar_autovalores(int n, double* re, double* im) {
    for (int i = 0; i < n; ++i)
        for (int j = i + 1; j < n; ++j) {
            bool cambiar = (re[j] > re[i] + 1e-15) ||
                           (mate::absd(re[j] - re[i]) <= 1e-15 && im[j] > im[i]);
            if (cambiar) {
                double t = re[i]; re[i] = re[j]; re[j] = t;
                t = im[i]; im[i] = im[j]; im[j] = t;
            }
        }
}

// Autovalores de A (2×2 o 3×3). Devuelve cuántos son reales.
// Estrategia: 1) eje desacoplado (bloque diagonal) → valor exacto + bloque 2×2;
//             2) matriz triangular → la diagonal; 3) polinomio característico.
inline int autovalores(const Mat& A, double* re, double* im) {
    if (A.n == 2) {
        raices_cuadratica(-traza(A), determinante(A), re, im);
    } else {
        double esc = 0.0;
        for (int k = 0; k < 9; ++k) esc = mate::maxd(esc, mate::absd(A.a[k]));
        bool hecho = false;
        for (int e = 0; e < 3 && !hecho; ++e) {
            int i = (e + 1) % 3, j = (e + 2) % 3;
            if (i > j) { int t = i; i = j; j = t; }
            if (es_casi_cero(A(e, i), esc) && es_casi_cero(A(e, j), esc) &&
                es_casi_cero(A(i, e), esc) && es_casi_cero(A(j, e), esc)) {
                re[0] = A(e, e); im[0] = 0.0;
                double tr = A(i, i) + A(j, j), dt = A(i, i) * A(j, j) - A(i, j) * A(j, i);
                raices_cuadratica(-tr, dt, re + 1, im + 1);
                hecho = true;
            }
        }
        if (!hecho) {
            bool sup = es_casi_cero(A(1, 0), esc) && es_casi_cero(A(2, 0), esc) && es_casi_cero(A(2, 1), esc);
            bool inf = es_casi_cero(A(0, 1), esc) && es_casi_cero(A(0, 2), esc) && es_casi_cero(A(1, 2), esc);
            if (sup || inf) {
                for (int k = 0; k < 3; ++k) { re[k] = A(k, k); im[k] = 0.0; }
                hecho = true;
            }
        }
        if (!hecho) {
            // λ³ − c2·λ² + c1·λ − c0 = 0
            double c2 = traza(A);
            double c1 = A(0, 0) * A(1, 1) - A(0, 1) * A(1, 0) + A(0, 0) * A(2, 2) - A(0, 2) * A(2, 0) +
                        A(1, 1) * A(2, 2) - A(1, 2) * A(2, 1);
            double c0 = determinante(A);
            double r = raiz_real_cubica(-c2, c1, -c0);
            double p = r - c2, q = c1 + r * p;      // (λ − r)(λ² + pλ + q)
            re[0] = r; im[0] = 0.0;
            raices_cuadratica(p, q, re + 1, im + 1);
        }
    }
    ordenar_autovalores(A.n, re, im);
    int reales = 0;
    for (int k = 0; k < A.n; ++k) if (im[k] == 0.0) ++reales;
    return reales;
}

// ------------------------------------------------------- valores singulares
// σᵢ = √λᵢ(AᵀA); para la matriz simétrica AᵀA se usa el método de Jacobi.
inline void valores_singulares(const Mat& A, double* sv) {
    Mat S = producto(transpuesta(A), A);
    int n = A.n;
    for (int barrido = 0; barrido < 60; ++barrido) {
        double fuera = 0.0;
        for (int p = 0; p < n; ++p)
            for (int q = p + 1; q < n; ++q) fuera += S(p, q) * S(p, q);
        if (fuera < 1e-30) break;
        for (int p = 0; p < n; ++p)
            for (int q = p + 1; q < n; ++q) {
                if (mate::absd(S(p, q)) < 1e-300) continue;
                double theta = (S(q, q) - S(p, p)) / (2.0 * S(p, q));
                double t = (theta >= 0.0 ? 1.0 : -1.0) / (mate::absd(theta) + mate::raiz(theta * theta + 1.0));
                double c = 1.0 / mate::raiz(t * t + 1.0), s = t * c;
                for (int k = 0; k < n; ++k) {           // S ← Jᵀ S J
                    double skp = S(k, p), skq = S(k, q);
                    S(k, p) = c * skp - s * skq; S(k, q) = s * skp + c * skq;
                }
                for (int k = 0; k < n; ++k) {
                    double spk = S(p, k), sqk = S(q, k);
                    S(p, k) = c * spk - s * sqk; S(q, k) = s * spk + c * sqk;
                }
            }
    }
    for (int k = 0; k < n; ++k) sv[k] = mate::raiz(mate::maxd(0.0, S(k, k)));
    for (int i = 0; i < n; ++i)                        // orden descendente
        for (int j = i + 1; j < n; ++j)
            if (sv[j] > sv[i]) { double t = sv[i]; sv[i] = sv[j]; sv[j] = t; }
    // El menor valor singular se recalcula con |det A| = σ₁···σₙ: AᵀA eleva al cuadrado
    // el número de condición y √λ_min pierde precisión cuando A es casi singular.
    double prod = 1.0;
    for (int k = 0; k < n - 1; ++k) prod *= sv[k];
    if (prod > 1e-300) sv[n - 1] = mate::absd(determinante(A)) / prod;
}

// --------------------------------------------------------------- propiedades
struct Propiedades {
    int n = 3;
    double det = 0, traza = 0, factor_medida = 0, condicion = 0;
    int rango = 0;
    bool ortogonal = false, conserva_angulos = false, conserva_medida = false, invertible = false;
    int orientacion = 0;              // +1 conserva · −1 invierte · 0 degenera
    double re[3] = {0, 0, 0}, im[3] = {0, 0, 0};
    double sv[3] = {0, 0, 0};
    Mat inv;
};

inline Propiedades propiedades(const Mat& A) {
    Propiedades P;
    P.n = A.n;
    P.det = determinante(A);
    P.traza = traza(A);
    P.factor_medida = mate::absd(P.det);
    valores_singulares(A, P.sv);
    double smax = P.sv[0], smin = P.sv[A.n - 1];
    P.rango = 0;
    for (int k = 0; k < A.n; ++k) if (P.sv[k] > 1e-10 * mate::maxd(1.0, smax)) ++P.rango;
    P.ortogonal = norma_frobenius_dif_identidad(producto(transpuesta(A), A)) < 1e-10;
    P.conserva_angulos = smax > 1e-12 && mate::absd(smax - smin) < 1e-10 * smax;
    P.conserva_medida = mate::absd(P.factor_medida - 1.0) < 1e-10;
    P.orientacion = mate::absd(P.det) < 1e-12 ? 0 : (P.det > 0 ? 1 : -1);
    P.condicion = smin > 1e-15 ? smax / smin : 1e300;
    autovalores(A, P.re, P.im);
    P.invertible = inversa(A, P.inv);
    return P;
}

}  // namespace tl

#endif
