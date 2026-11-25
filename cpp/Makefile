# Motor C++ de transformaciones lineales — compilación nativa y WebAssembly
#   make          → programa nativo ./motor y datos/resultados_cpp.json
#   make pruebas  → pruebas unitarias
#   make wasm     → ../wasm/motor_transformaciones.wasm y ../js/wasm/motor-wasm-datos.js
#   make todo     → todo lo anterior

CXX      ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra
CLANG    ?= clang++
WASMFLAGS = --target=wasm32 -std=c++17 -O3 -nostdlib -ffreestanding -fno-exceptions -fno-rtti \
            -fno-builtin-memset -Wl,--no-entry -Wl,--strip-debug -Wl,-z,stack-size=65536

all: motor
	./motor ../datos/resultados_cpp.json

motor: main.cpp algebra_lineal.hpp mate.hpp
	$(CXX) $(CXXFLAGS) -o motor main.cpp

pruebas: pruebas.cpp algebra_lineal.hpp mate.hpp
	$(CXX) $(CXXFLAGS) -o pruebas_motor pruebas.cpp && ./pruebas_motor

wasm: wasm_api.cpp algebra_lineal.hpp mate.hpp
	$(CLANG) $(WASMFLAGS) -o ../wasm/motor_transformaciones.wasm wasm_api.cpp
	python3 empaquetar_wasm.py

todo: all pruebas wasm

clean:
	rm -f motor pruebas_motor

.PHONY: all pruebas wasm todo clean
