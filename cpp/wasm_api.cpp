// ============================================================================
// wasm_api.cpp — Interfaz del motor C++ para WebAssembly
// ----------------------------------------------------------------------------
// Se compila sin biblioteca estándar:
//   clang++ --target=wasm32 -O3 -nostdlib -ffreestanding -fno-exceptions -fno-rtti \
//           -Wl,--no-entry -o ../wasm/motor_transformaciones.wasm wasm_api.cpp
//
// Intercambio de datos: el navegador escribe y lee números en un búfer compartido
// de 1024 doubles (tl_bufer). Distribución del búfer:
//   [  0.. 8]  matriz A (por filas)          [  9..17]  matriz B
//   [ 18..26]  resultado matricial           [ 32..]    puntos de entrada (n coordenadas c/u)
//   [512..]    imágenes de los puntos        [ 64..]    propiedades (ver tl_propiedades)
// Autor: Andrés Mauricio Peñaloza Fernández · Universidad de Santa Marta · 2026
// ============================================================================
#include "algebra_lineal.hpp"

#define EXPORTAR(nombre) extern "C" __attribute__((export_name(#nombre)))

// El compilador puede emitir llamadas a memset/memcpy al inicializar estructuras.
extern "C" void* memset(void* d, int c, unsigned long n) {
    unsigned char* p = static_cast<unsigned char*>(d);
    while (n--) *p++ = static_cast<unsigned char>(c);
    return d;
}
extern "C" void* memcpy(void* d, const void* s, unsigned long n) {
    unsigned char* p = static_cast<unsigned char*>(d);
    const unsigned char* q = static_cast<const unsigned char*>(s);
    while (n--) *p++ = *q++;
    return d;
}

static double BUF[1024];

static tl::Mat leer(int base, int n) { return tl::desde(n, BUF + base); }
static void escribir(int base, const tl::Mat& M) {
    for (int k = 0; k < M.n * M.n; ++k) BUF[base + k] = M.a[k];
}

EXPORTAR(tl_version) int tl_version() { return 100; }          // 1.0.0
EXPORTAR(tl_bufer) double* tl_bufer() { return BUF; }

// Escribe en BUF[0..] la matriz estándar del tipo pedido. Devuelve n (2 o 3) o 0 si el tipo no existe.
EXPORTAR(tl_matriz) int tl_matriz(int tipo, double p1, double p2, double p3) {
    tl::Mat M;
    if (!tl::matriz_estandar(tipo, p1, p2, p3, M)) return 0;
    escribir(0, M);
    return M.n;
}

// BUF[18..] = A·B
EXPORTAR(tl_producto) void tl_producto(int n) { escribir(18, tl::producto(leer(0, n), leer(9, n))); }

// BUF[512 + k·n ..] = A·p_k para los npts puntos guardados desde BUF[32].
EXPORTAR(tl_aplicar) void tl_aplicar(int n, int npts) {
    tl::Mat A = leer(0, n);
    if (npts > 160) npts = 160;
    for (int k = 0; k < npts; ++k) tl::aplicar(A, BUF + 32 + k * n, BUF + 512 + k * n);
}

EXPORTAR(tl_determinante) double tl_determinante(int n) { return tl::determinante(leer(0, n)); }

// Inversa de A en BUF[18..]. Devuelve 1 si existe.
EXPORTAR(tl_inversa) int tl_inversa(int n) {
    tl::Mat R;
    bool ok = tl::inversa(leer(0, n), R);
    if (ok) escribir(18, R);
    return ok ? 1 : 0;
}

// Propiedades de A en BUF[64..]:
//  64 det · 65 traza · 66 rango · 67 ortogonal · 68 conserva ángulos · 69 conserva medida
//  70 orientación · 71 factor de medida · 72 condición · 73 invertible
//  74..76 Re(λ) · 77..79 Im(λ) · 80..82 valores singulares · 83..91 inversa
EXPORTAR(tl_propiedades) void tl_propiedades(int n) {
    tl::Propiedades P = tl::propiedades(leer(0, n));
    double* o = BUF + 64;
    o[0] = P.det; o[1] = P.traza; o[2] = P.rango; o[3] = P.ortogonal; o[4] = P.conserva_angulos;
    o[5] = P.conserva_medida; o[6] = P.orientacion; o[7] = P.factor_medida; o[8] = P.condicion;
    o[9] = P.invertible;
    for (int k = 0; k < 3; ++k) { o[10 + k] = P.re[k]; o[13 + k] = P.im[k]; o[16 + k] = P.sv[k]; }
    for (int k = 0; k < 9; ++k) o[19 + k] = k < n * n ? P.inv.a[k] : 0.0;
}

EXPORTAR(tl_seno) double tl_seno(double x) { return tl::mate::seno(x); }
EXPORTAR(tl_coseno) double tl_coseno(double x) { return tl::mate::coseno(x); }
