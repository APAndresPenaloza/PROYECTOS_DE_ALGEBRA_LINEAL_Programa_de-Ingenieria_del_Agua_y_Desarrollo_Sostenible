// ============================================================================
// pruebas.cpp — Pruebas unitarias del motor C++
// Compilar y ejecutar:  make pruebas
// ============================================================================
#include <cmath>
#include <cstdio>
#include <random>

#include "algebra_lineal.hpp"

static int fallos = 0, total = 0;

static void comprobar(bool ok, const char* que, double valor = 0.0) {
    ++total;
    if (!ok) { ++fallos; std::printf("  ✗ %s (%.3e)\n", que, valor); }
}

int main() {
    // 1. Seno y coseno propios frente a <cmath>
    double err = 0.0;
    for (double g = -720.0; g <= 720.0; g += 0.37) {
        double s, c;
        tl::mate::seno_coseno(g * M_PI / 180.0, s, c);
        err = std::fmax(err, std::fmax(std::fabs(s - std::sin(g * M_PI / 180.0)),
                                       std::fabs(c - std::cos(g * M_PI / 180.0))));
    }
    std::mt19937_64 gen(2026);
    std::uniform_real_distribution<double> ang(-12.0, 12.0), coef(-3.0, 3.0);
    for (int k = 0; k < 200000; ++k) {
        double x = ang(gen), s, c;
        tl::mate::seno_coseno(x, s, c);
        err = std::fmax(err, std::fmax(std::fabs(s - std::sin(x)), std::fabs(c - std::cos(x))));
    }
    std::printf("Seno/coseno propios: error máximo frente a <cmath> = %.3e\n", err);
    comprobar(err < 4e-16, "seno/coseno", err);

    // 2. Matrices estándar: propiedades conocidas
    tl::Mat M;
    for (double th = -180; th <= 180; th += 7.5) {
        tl::matriz_estandar(tl::ROTACION2, th, 0, 0, M);
        tl::Propiedades p = tl::propiedades(M);
        comprobar(p.ortogonal && std::fabs(p.det - 1) < 1e-14, "rotación 2D ortogonal con det 1", p.det);
        for (int e = 0; e < 3; ++e) {
            tl::matriz_estandar(tl::ROTACION3, e, th, 0, M);
            p = tl::propiedades(M);
            comprobar(p.ortogonal && std::fabs(p.det - 1) < 1e-14, "rotación 3D ortogonal con det 1", p.det);
            comprobar(std::fabs(p.re[0] - 1) < 1e-14 || std::fabs(th) < 1e-12 || std::fabs(std::fabs(th) - 180) < 1e-12,
                      "rotación 3D: autovalor 1 (eje de giro)", p.re[0]);
        }
    }
    for (int pl = 0; pl < 3; ++pl) {
        tl::matriz_estandar(tl::REFLEXION3, pl, 0, 0, M);
        tl::Propiedades p = tl::propiedades(M);
        comprobar(p.orientacion == -1 && p.ortogonal, "reflexión 3D invierte orientación");
    }
    tl::matriz_estandar(tl::HOMOTECIA3, 0.5, 0, 0, M);
    comprobar(std::fabs(tl::determinante(M) - 0.125) < 1e-15, "homotecia 3D: det = k³");
    tl::matriz_estandar(tl::CIZALLAMIENTO3, 0, 0.3, -0.7, M);
    comprobar(std::fabs(M(0, 1) - 0.3) < 1e-15 && std::fabs(M(0, 2) + 0.7) < 1e-15 &&
              std::fabs(tl::determinante(M) - 1) < 1e-15, "cizallamiento 3D (ecuación 6)");

    // 3. Matrices aleatorias: inversa, det(AB) = det(A)det(B), autovalores y valores singulares
    double e_inv = 0, e_det = 0, e_eig = 0, e_sv = 0;
    for (int k = 0; k < 20000; ++k) {
        int n = (k % 2) ? 3 : 2;
        tl::Mat A, B; A.n = B.n = n;
        for (int i = 0; i < n * n; ++i) { A.a[i] = coef(gen); B.a[i] = coef(gen); }
        tl::Mat Ai;
        if (tl::inversa(A, Ai) && std::fabs(tl::determinante(A)) > 0.05) {
            tl::Mat I = tl::producto(A, Ai);
            e_inv = std::fmax(e_inv, tl::norma_frobenius_dif_identidad(I));
        }
        e_det = std::fmax(e_det, std::fabs(tl::determinante(tl::producto(A, B)) -
                                           tl::determinante(A) * tl::determinante(B)));
        double re[3], im[3];
        tl::autovalores(A, re, im);
        double suma = 0, prod_re = 1, prod_im = 0;
        for (int i = 0; i < n; ++i) {
            suma += re[i];
            double r2 = prod_re * re[i] - prod_im * im[i], i2 = prod_re * im[i] + prod_im * re[i];
            prod_re = r2; prod_im = i2;
        }
        e_eig = std::fmax(e_eig, std::fmax(std::fabs(suma - tl::traza(A)), std::fabs(prod_re - tl::determinante(A))));
        double sv[3];
        tl::valores_singulares(A, sv);
        double ps = 1, esc = 1;
        for (int i = 0; i < n; ++i) { ps *= sv[i]; esc *= std::fmax(1.0, sv[0]); }
        e_sv = std::fmax(e_sv, std::fabs(ps - std::fabs(tl::determinante(A))) / esc);
        // σ₁ comparado con la norma 2 obtenida por iteración de potencia sobre AᵀA
        tl::Mat S = tl::producto(tl::transpuesta(A), A);
        double v[3] = {1, 0.7, 0.3}, lam = 0;
        for (int it = 0; it < 500; ++it) {
            double w[3]; tl::aplicar(S, v, w);
            double nw = 0; for (int i = 0; i < n; ++i) nw += w[i] * w[i];
            nw = std::sqrt(nw); lam = nw;
            for (int i = 0; i < n; ++i) v[i] = w[i] / nw;
        }
        e_sv = std::fmax(e_sv, std::fabs(std::sqrt(lam) - sv[0]) / std::fmax(1.0, sv[0]) * 1e-4);
    }
    std::printf("Aleatorias (20 000): ‖A·A⁻¹ − I‖ = %.2e · det(AB) = %.2e · Σλ/Πλ = %.2e · Πσ = %.2e\n",
                e_inv, e_det, e_eig, e_sv);
    comprobar(e_inv < 1e-11, "inversa", e_inv);
    comprobar(e_det < 1e-11, "det(AB) = det(A)·det(B)", e_det);
    comprobar(e_eig < 1e-9, "autovalores: suma = traza y producto = det", e_eig);
    comprobar(e_sv < 1e-10, "valores singulares: producto = |det|", e_sv);

    std::printf("\nPruebas: %d de %d correctas%s\n", total - fallos, total, fallos ? "  ← REVISAR" : "  ✓");
    return fallos ? 1 : 0;
}
