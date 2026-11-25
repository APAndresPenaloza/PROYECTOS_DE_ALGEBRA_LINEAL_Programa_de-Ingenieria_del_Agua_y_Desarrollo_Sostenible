// ============================================================================
// main.cpp — Programa nativo del motor C++
// ----------------------------------------------------------------------------
// Desarrolla las seis transformaciones del proyecto (T1–T6) sobre los conjuntos
// U y V de la guía y las seis composiciones (C1–C6), imprime el desarrollo y
// escribe datos/resultados_cpp.json para la validación cruzada con Python y JS.
//
// Compilar:  make            (o: g++ -std=c++17 -O2 -o motor main.cpp)
// Ejecutar:  ./motor [ruta_json]
//
// Autor: Andrés Mauricio Peñaloza Fernández · Universidad de Santa Marta · 2026
// ============================================================================
#include <cmath>
#include <cstdio>
#include <string>
#include <vector>

#include "algebra_lineal.hpp"

using tl::Mat;

namespace {

struct Caso {
    std::string clave, espacio, nombre;
    Mat M;
};

struct Comp {
    std::string clave, espacio, nombre;
    std::vector<Mat> pasos;   // en orden de aplicación
};

Mat estandar(int tipo, double p1, double p2 = 0, double p3 = 0) {
    Mat M;
    tl::matriz_estandar(tipo, p1, p2, p3, M);
    return M;
}

Mat producto_pasos(const std::vector<Mat>& pasos, bool invertido) {
    Mat P = tl::identidad(pasos[0].n);
    if (!invertido)
        for (const Mat& A : pasos) P = tl::producto(A, P);
    else
        for (auto it = pasos.rbegin(); it != pasos.rend(); ++it) P = tl::producto(*it, P);
    return P;
}

std::string num(double x, int d = 6) {      // coma decimal, como en los documentos
    if (std::fabs(x) < 0.5 * std::pow(10.0, -d)) x = 0.0;
    char b[64];
    std::snprintf(b, sizeof b, "%.*f", d, x);
    std::string s(b);
    for (char& c : s) if (c == '.') c = ',';
    return s;
}

std::string vec(const double* v, int n, int d = 6) {
    std::string s = "(";
    for (int i = 0; i < n; ++i) s += (i ? "; " : "") + num(v[i], d);
    return s + ")";
}

void imprimir_matriz(const Mat& A, const char* sangria = "    ") {
    for (int i = 0; i < A.n; ++i) {
        std::printf("%s[", sangria);
        for (int j = 0; j < A.n; ++j) std::printf("%12s", num(A(i, j)).c_str());
        std::printf(" ]\n");
    }
}

void json_matriz(FILE* f, const Mat& A) {
    std::fprintf(f, "[");
    for (int i = 0; i < A.n; ++i) {
        std::fprintf(f, "%s[", i ? "," : "");
        for (int j = 0; j < A.n; ++j) std::fprintf(f, "%s%.17g", j ? "," : "", A(i, j));
        std::fprintf(f, "]");
    }
    std::fprintf(f, "]");
}

void json_puntos(FILE* f, const Mat& A, const std::vector<std::vector<double>>& P) {
    std::fprintf(f, "[");
    for (size_t k = 0; k < P.size(); ++k) {
        double q[3];
        tl::aplicar(A, P[k].data(), q);
        std::fprintf(f, "%s[", k ? "," : "");
        for (int i = 0; i < A.n; ++i) std::fprintf(f, "%s%.17g", i ? "," : "", q[i]);
        std::fprintf(f, "]");
    }
    std::fprintf(f, "]");
}

}  // namespace

int main(int argc, char** argv) {
    const std::string ruta = argc > 1 ? argv[1] : "../datos/resultados_cpp.json";
    const double ALFA = std::atan2(1.0, 7.0) * (180.0 / M_PI);   // tramo E2→E1: tan α = 1/7

    const std::vector<std::vector<double>> U = {{4, 5}, {-3, 4}};
    const std::vector<std::vector<double>> V = {{4, 5, 3}, {-3, 4, 4}};

    const std::vector<Caso> casos = {
        {"T1", "R2", "Rotación de ejes −α (alinear con el tramo E2→E1)", estandar(tl::ROTACION2, -ALFA)},
        {"T2", "R2", "Homotecia k = 2 (plano a escala 1:50 000)", estandar(tl::HOMOTECIA2, 2.0)},
        {"T3", "R2", "Cizallamiento en x, k = 0,4 (flujo cortante)", estandar(tl::CIZALLAMIENTO2, 0.4, 0)},
        {"T4", "R3", "Rotación alrededor de z, θ = −α (alinear la cuenca)", estandar(tl::ROTACION3, 2, -ALFA)},
        {"T5", "R3", "Escalamiento (1, 1, 2): exageración vertical 2:1", estandar(tl::ESCALAMIENTO3, 1, 1, 2)},
        {"T6", "R3", "Reflexión respecto al plano xy (cotas → profundidades)", estandar(tl::REFLEXION3, 0)},
    };

    const Mat R = estandar(tl::ROTACION2, -ALFA), H = estandar(tl::HOMOTECIA2, 2.0),
              C = estandar(tl::CIZALLAMIENTO2, 0.4, 0), Ra = estandar(tl::ROTACION2, ALFA);
    const Mat Rz = estandar(tl::ROTACION3, 2, -ALFA), S = estandar(tl::ESCALAMIENTO3, 1, 1, 2),
              F = estandar(tl::REFLEXION3, 0), Rx = estandar(tl::ROTACION3, 0, 10.0);
    const std::vector<Comp> comps = {
        {"C1", "R2", "H·R: alinear y dibujar a escala", {R, H}},
        {"C2", "R2", "C·R frente a R·C", {R, C}},
        {"C3", "R2", "R(α)·C·R(−α): cortante a lo largo del cauce", {R, C, Ra}},
        {"C4", "R3", "S·Rz: perfil longitudinal exagerado", {Rz, S}},
        {"C5", "R3", "F·S·Rz: perfil exagerado en profundidades", {Rz, S, F}},
        {"C6", "R3", "S·Rx frente a Rx·S", {Rx, S}},
    };

    std::printf("Motor C++ · Transformaciones lineales en R² y R³ (ingeniería del agua)\n");
    std::printf("α = arctan(1/7) = %s°\n\n", num(ALFA, 9).c_str());

    for (const Caso& c : casos) {
        const auto& P = c.espacio == "R2" ? U : V;
        tl::Propiedades pr = tl::propiedades(c.M);
        std::printf("%s · %s\n", c.clave.c_str(), c.nombre.c_str());
        imprimir_matriz(c.M);
        for (size_t k = 0; k < P.size(); ++k) {
            double q[3];
            tl::aplicar(c.M, P[k].data(), q);
            std::printf("    L(%c%zu) = %s\n", c.espacio == "R2" ? 'u' : 'v', k + 1, vec(q, c.M.n).c_str());
        }
        std::printf("    det = %s · rango = %d · ortogonal: %s · orientación: %s\n",
                    num(pr.det).c_str(), pr.rango, pr.ortogonal ? "sí" : "no",
                    pr.orientacion > 0 ? "conserva" : (pr.orientacion < 0 ? "invierte" : "degenera"));
        std::printf("    autovalores:");
        for (int k = 0; k < c.M.n; ++k) {
            if (pr.im[k] == 0.0) std::printf(" %s", num(pr.re[k]).c_str());
            else std::printf(" %s%s%si", num(pr.re[k]).c_str(), pr.im[k] > 0 ? " + " : " − ",
                             num(std::fabs(pr.im[k])).c_str());
            std::printf(k + 1 < c.M.n ? "," : "\n");
        }
        std::printf("\n");
    }

    for (const Comp& c : comps) {
        Mat M = producto_pasos(c.pasos, false), Mi = producto_pasos(c.pasos, true);
        double dif = 0;
        for (int k = 0; k < M.n * M.n; ++k) dif = std::fmax(dif, std::fabs(M.a[k] - Mi.a[k]));
        std::printf("%s · %s → det = %s · %s\n", c.clave.c_str(), c.nombre.c_str(),
                    num(tl::determinante(M)).c_str(), dif < 1e-12 ? "conmutan" : "NO conmutan");
    }

    FILE* f = std::fopen(ruta.c_str(), "w");
    if (!f) { std::fprintf(stderr, "No se pudo escribir %s\n", ruta.c_str()); return 1; }
    std::fprintf(f, "{\n  \"motor\": \"C++17 (g++ %d.%d)\",\n  \"alfa_grados\": %.17g,\n  \"transformaciones\": [\n",
                 __GNUC__, __GNUC_MINOR__, ALFA);
    for (size_t t = 0; t < casos.size(); ++t) {
        const Caso& c = casos[t];
        const auto& P = c.espacio == "R2" ? U : V;
        tl::Propiedades pr = tl::propiedades(c.M);
        std::fprintf(f, "    {\"clave\": \"%s\", \"matriz\": ", c.clave.c_str());
        json_matriz(f, c.M);
        std::fprintf(f, ", \"imagenes\": ");
        json_puntos(f, c.M, P);
        std::fprintf(f, ", \"det\": %.17g, \"traza\": %.17g, \"rango\": %d, \"ortogonal\": %s, "
                        "\"conserva_angulos\": %s, \"orientacion\": %d, \"condicion\": %.17g, \"autovalores\": [",
                     pr.det, pr.traza, pr.rango, pr.ortogonal ? "true" : "false",
                     pr.conserva_angulos ? "true" : "false", pr.orientacion, pr.condicion);
        for (int k = 0; k < c.M.n; ++k) std::fprintf(f, "%s[%.17g,%.17g]", k ? "," : "", pr.re[k], pr.im[k]);
        std::fprintf(f, "], \"inversa\": ");
        json_matriz(f, pr.inv);
        std::fprintf(f, "}%s\n", t + 1 < casos.size() ? "," : "");
    }
    std::fprintf(f, "  ],\n  \"composiciones\": [\n");
    for (size_t t = 0; t < comps.size(); ++t) {
        const Comp& c = comps[t];
        const auto& P = c.espacio == "R2" ? U : V;
        Mat M = producto_pasos(c.pasos, false), Mi = producto_pasos(c.pasos, true);
        double dif = 0;
        for (int k = 0; k < M.n * M.n; ++k) dif = std::fmax(dif, std::fabs(M.a[k] - Mi.a[k]));
        std::fprintf(f, "    {\"clave\": \"%s\", \"producto\": ", c.clave.c_str());
        json_matriz(f, M);
        std::fprintf(f, ", \"producto_invertido\": ");
        json_matriz(f, Mi);
        std::fprintf(f, ", \"conmutan\": %s, \"det\": %.17g, \"imagenes\": ", dif < 1e-12 ? "true" : "false",
                     tl::determinante(M));
        json_puntos(f, M, P);
        std::fprintf(f, "}%s\n", t + 1 < comps.size() ? "," : "");
    }
    std::fprintf(f, "  ]\n}\n");
    std::fclose(f);
    std::printf("\nResultados escritos en %s\n", ruta.c_str());
    return 0;
}
