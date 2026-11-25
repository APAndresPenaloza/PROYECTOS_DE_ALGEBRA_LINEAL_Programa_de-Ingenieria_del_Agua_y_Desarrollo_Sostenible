// ============================================================================
// mate.hpp — Funciones matemáticas propias del motor C++ (sin biblioteca estándar)
// ----------------------------------------------------------------------------
// Proyecto: Transformaciones lineales en R² y R³ aplicadas a la ingeniería del agua
// Autores:  Andrés Mauricio Peñaloza Fernández y Eliana Carolina María Wong Lubo · Universidad de Santa Marta · 2026
//
// El núcleo se compila tanto en nativo (g++) como a WebAssembly (clang --target=wasm32)
// sin libc. Por eso seno y coseno se implementan aquí:
//   1) reducción del argumento al intervalo [-π/4, π/4] con el método de Cody-Waite;
//   2) polinomios minimax de fdlibm (Sun Microsystems, 1993) para sen y cos en ese intervalo.
// La raíz cuadrada usa la instrucción del procesador (__builtin_sqrt → sqrtsd / f64.sqrt).
// Error medido frente a <cmath>: < 2·10⁻¹⁶ en el rango de ángulos del simulador (ver pruebas.cpp).
// ============================================================================
#ifndef TL_MATE_HPP
#define TL_MATE_HPP

namespace tl {
namespace mate {

constexpr double PI = 3.14159265358979323846264338327950288;
constexpr double GRADO = PI / 180.0;

inline double absd(double x) { return x < 0.0 ? -x : x; }
inline double raiz(double x) { return __builtin_sqrt(x); }
inline double maxd(double a, double b) { return a > b ? a : b; }
inline double mind(double a, double b) { return a < b ? a : b; }

// Redondeo al entero más cercano (sin libc).
inline double redondear(double x) {
    long long n = static_cast<long long>(x >= 0.0 ? x + 0.5 : x - 0.5);
    return static_cast<double>(n);
}

// Núcleo de fdlibm para sen(x), |x| ≤ π/4.
inline double nucleo_sen(double x) {
    const double S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03,
                 S3 = -1.98412698298579493134e-04, S4 = 2.75573137070700676789e-06,
                 S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
    double z = x * x, v = z * x;
    double r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
    return x + v * (S1 + z * r);
}

// Núcleo de fdlibm para cos(x), |x| ≤ π/4.
inline double nucleo_cos(double x) {
    const double C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03,
                 C3 = 2.48015872894767294178e-05, C4 = -2.75573143513906633035e-07,
                 C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
    double z = x * x, w = z * z;
    double r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
    double hz = 0.5 * z;
    w = 1.0 - hz;
    return w + (((1.0 - w) - hz) + z * r);
}

// Calcula sen(x) y cos(x) a la vez.
inline void seno_coseno(double x, double& s, double& c) {
    const double DOS_SOBRE_PI = 6.36619772367581382433e-01;
    const double PIO2_1 = 1.57079632673412561417e+00;   // primeros 33 bits de π/2
    const double PIO2_1T = 6.07710050650619224932e-11;  // π/2 − PIO2_1
    double n = redondear(x * DOS_SOBRE_PI);
    double r = (x - n * PIO2_1) - n * PIO2_1T;
    double sr = nucleo_sen(r), cr = nucleo_cos(r);
    long long q = static_cast<long long>(n) & 3;
    switch (q) {
        case 0: s = sr;  c = cr;  break;
        case 1: s = cr;  c = -sr; break;
        case 2: s = -sr; c = -cr; break;
        default: s = -cr; c = sr; break;
    }
}

inline double seno(double x) { double s, c; seno_coseno(x, s, c); return s; }
inline double coseno(double x) { double s, c; seno_coseno(x, s, c); return c; }

// Seno y coseno de un ángulo en grados. Los múltiplos exactos de 90° dan 0 y ±1 exactos.
inline void seno_coseno_grados(double grados, double& s, double& c) {
    double q = grados / 90.0;
    if (q == redondear(q)) {
        long long k = static_cast<long long>(redondear(q)) & 3;
        const double S[4] = {0.0, 1.0, 0.0, -1.0}, C[4] = {1.0, 0.0, -1.0, 0.0};
        s = S[k]; c = C[k];
        return;
    }
    seno_coseno(grados * GRADO, s, c);
}

}  // namespace mate
}  // namespace tl

#endif
