# 01. Setup

> Compilers, build systems, package managers, IDEs, project structure, and your first program.

---

## Table of Contents

1. [Choosing a Compiler](#1-choosing-a-compiler)
2. [Installing a Compiler](#2-installing-a-compiler)
3. [Build Systems](#3-build-systems)
4. [CMake — the De Facto Standard](#4-cmake--the-de-facto-standard)
5. [Package Managers](#5-package-managers)
6. [IDE Setup](#6-ide-setup)
7. [Project Structure](#7-project-structure)
8. [Hello World](#8-hello-world)
9. [Compiler Flags You Should Care About](#9-compiler-flags-you-should-care-about)

---

## 1. Choosing a Compiler

The three main C++ compilers:

| Compiler | Platform | Notes |
|---|---|---|
| **GCC** (g++) | Linux primary, macOS, Windows via MinGW | Reference compiler; full C++20, most of C++23 |
| **Clang** (clang++) | macOS primary, also Linux, Windows | LLVM-based; great error messages; full C++20 |
| **MSVC** (cl.exe) | Windows | Visual Studio's compiler; full C++20, much of C++23 |

All three implement the same language. Differences:
- **Performance**: roughly comparable for typical code.
- **Error messages**: Clang is often clearest.
- **C++23 support**: GCC and Clang ahead of MSVC in some areas.
- **Standard library**: GCC uses libstdc++, Clang can use libstdc++ or libc++, MSVC uses MSVC STL.

For most projects, build with multiple compilers in CI to catch portability issues.

---

## 2. Installing a Compiler

### macOS — Clang via Xcode
```bash
xcode-select --install
clang++ --version
```

That installs the Apple Clang. For latest LLVM Clang:
```bash
brew install llvm
```

### Linux — GCC
```bash
sudo apt install build-essential        # Ubuntu/Debian
sudo dnf install gcc-c++ make            # Fedora
sudo pacman -S base-devel                 # Arch

g++ --version
```

For newer GCC versions on older Ubuntu, use the toolchain PPA:
```bash
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt install g++-13
```

### Linux — Clang
```bash
sudo apt install clang clang-tidy clang-format
clang++ --version
```

### Windows — MSVC via Visual Studio
Download **Visual Studio 2022 Community** (free) from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/). Install the **"Desktop development with C++"** workload.

Alternative: **MSYS2** for a Linux-like GCC environment on Windows:
```
pacman -S mingw-w64-ucrt-x86_64-gcc
```

Or **WSL2** for a real Linux toolchain.

### Verify
```bash
g++ -std=c++23 --version
clang++ -std=c++23 --version
```

If you see C++20 / C++23 support, you're set.

---

## 3. Build Systems

Building a single `.cpp` file by hand:
```bash
g++ -std=c++23 -Wall -Wextra -O2 main.cpp -o main
./main
```

For real projects, you need a build system. Options:

| Tool | Notes |
|---|---|
| **CMake** | De facto standard. Generates build files for Make, Ninja, Visual Studio, Xcode. |
| **Make** | Direct, simple, Linux-traditional. Verbose for large projects. |
| **Ninja** | Faster than Make. Used as backend for CMake. |
| **Meson** | Modern alternative to CMake. Cleaner syntax but smaller adoption. |
| **Bazel** | Google's build system. For huge codebases. |
| **Premake** | Lua-based. Used in some game projects. |
| **build2** | Newer, integrates package management. |

For new projects: **CMake**. Almost every C++ library expects it.

---

## 4. CMake — the De Facto Standard

### Minimal `CMakeLists.txt`
```cmake
cmake_minimum_required(VERSION 3.20)
project(my_app LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(my_app main.cpp)
```

### Building
```bash
cmake -S . -B build              # configure (generates build files)
cmake --build build              # compile
./build/my_app                    # run

# Or with Ninja for faster builds:
cmake -S . -B build -G Ninja
cmake --build build
```

### Multi-config (Debug/Release)
Most generators (Make, Ninja) are single-config — you pick at configure time:
```bash
cmake -S . -B build-debug -DCMAKE_BUILD_TYPE=Debug
cmake -S . -B build-release -DCMAKE_BUILD_TYPE=Release
```

Visual Studio generators are multi-config — switch in IDE.

### Multiple source files
```cmake
add_executable(my_app
    main.cpp
    foo.cpp
    bar.cpp
)
```

Or glob (avoid in serious projects — better to list explicitly):
```cmake
file(GLOB SOURCES CONFIGURE_DEPENDS src/*.cpp)
add_executable(my_app ${SOURCES})
```

### Libraries
```cmake
add_library(my_lib STATIC
    src/foo.cpp
    src/bar.cpp
)
target_include_directories(my_lib PUBLIC include)

add_executable(my_app main.cpp)
target_link_libraries(my_app PRIVATE my_lib)
```

- `STATIC` — static library (.a / .lib).
- `SHARED` — shared library (.so / .dll).
- `INTERFACE` — header-only library (no compilation, just provides include paths/flags).

### Modern target-based CMake
The current style (CMake 3.x+) uses targets and properties, not global variables:

```cmake
add_executable(my_app main.cpp)

target_compile_features(my_app PRIVATE cxx_std_20)
target_include_directories(my_app PRIVATE include)
target_link_libraries(my_app PRIVATE fmt::fmt)
target_compile_options(my_app PRIVATE -Wall -Wextra)
```

Visibility:
- `PRIVATE` — only this target.
- `PUBLIC` — this target and consumers.
- `INTERFACE` — only consumers.

### Finding libraries
```cmake
find_package(fmt REQUIRED)
target_link_libraries(my_app PRIVATE fmt::fmt)

find_package(Boost REQUIRED COMPONENTS system filesystem)
target_link_libraries(my_app PRIVATE Boost::system Boost::filesystem)
```

### Subdirectories
```cmake
# Top-level CMakeLists.txt
add_subdirectory(libs/core)
add_subdirectory(libs/utils)
add_subdirectory(apps/main)
```

Each subdir has its own `CMakeLists.txt`.

### Installing
```cmake
install(TARGETS my_app DESTINATION bin)
install(DIRECTORY include/ DESTINATION include)
```

```bash
cmake --install build --prefix /usr/local
```

### CMake Presets
Modern way to manage configurations (`CMakePresets.json`):
```json
{
  "version": 6,
  "configurePresets": [
    {
      "name": "debug",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/debug",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug" }
    },
    {
      "name": "release",
      "inherits": "debug",
      "binaryDir": "${sourceDir}/build/release",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" }
    }
  ]
}
```

```bash
cmake --preset debug
cmake --build build/debug
```

Cleaner than passing flags every time.

---

## 5. Package Managers

C++ has no native package manager. Three popular options:

### vcpkg (Microsoft)
```bash
git clone https://github.com/microsoft/vcpkg
cd vcpkg
./bootstrap-vcpkg.sh        # or .bat on Windows

./vcpkg install fmt nlohmann-json boost-system
```

CMake integration:
```bash
cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
```

Manifest mode (per-project deps):
```json
// vcpkg.json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": ["fmt", "nlohmann-json"]
}
```

vcpkg works well, integrates cleanly with CMake. Large package selection.

### Conan
```bash
pip install conan
```

`conanfile.txt` or `conanfile.py`:
```
[requires]
fmt/10.2.1
nlohmann_json/3.11.3

[generators]
CMakeDeps
CMakeToolchain
```

```bash
conan install . --build=missing
cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake
```

More flexible than vcpkg for complex versioning needs.

### Header-only / submodules
For small projects, include header-only libraries directly:
- Copy headers into your repo.
- Use Git submodules.
- Use CMake's `FetchContent`:
  ```cmake
  include(FetchContent)
  FetchContent_Declare(
      fmt
      GIT_REPOSITORY https://github.com/fmtlib/fmt.git
      GIT_TAG 10.2.1
  )
  FetchContent_MakeAvailable(fmt)
  ```

### My recommendation
- **New project on Windows / cross-platform**: vcpkg manifest mode.
- **Need fine-grained version control**: Conan.
- **Single header-only dep**: vendor it or `FetchContent`.

---

## 6. IDE Setup

### Visual Studio (Windows)
Full IDE with Microsoft's compiler, debugger, profiler. The premier C++ environment on Windows. Free Community Edition.

### CLion (cross-platform)
JetBrains' C++ IDE. Excellent code intelligence, CMake integration, profiler. Paid (free for non-commercial in some cases).

### VS Code
Free, cross-platform. Install:
- **C/C++ Extension Pack** by Microsoft.
- **CMake Tools** by Microsoft.

Configure with `.vscode/c_cpp_properties.json` and `.vscode/launch.json`. clangd for better intellisense:
```
clangd extension (LLVM)
```

### Vim/Neovim/Emacs
With **clangd** as the language server, you get autocompletion, jump-to-def, diagnostics. Configure via your editor's LSP client.

### Visual Studio (in 2026)
Best on Windows. Comprehensive debugger, native CMake support, profiler, static analysis.

### CLion
Best cross-platform with no caveats. Strong refactoring.

### VS Code
Lightest. Fast. Slightly less polished for C++ than C#/Python/TS but good with clangd.

For **macOS / Linux**: CLion or VS Code with clangd.
For **Windows**: Visual Studio or CLion.

---

## 7. Project Structure

A common layout:
```
my_project/
├── CMakeLists.txt
├── CMakePresets.json
├── README.md
├── vcpkg.json (or conanfile.txt)
├── include/
│   └── my_project/
│       └── foo.hpp           # public headers
├── src/
│   ├── foo.cpp                # implementation
│   ├── bar.cpp
│   └── main.cpp
├── tests/
│   ├── CMakeLists.txt
│   └── test_foo.cpp
├── examples/
│   └── basic.cpp
└── build/                      # ignored — build output
```

The `include/my_project/` nesting is so includes look like:
```cpp
#include <my_project/foo.hpp>
```

Avoids name collisions with other projects.

### Header / source split
Traditional C++ separates declarations (headers `.hpp`) from definitions (sources `.cpp`):
```cpp
// foo.hpp
#pragma once
namespace my_project {
class Foo {
public:
    Foo();
    int compute(int x) const;
private:
    int state_;
};
}

// foo.cpp
#include <my_project/foo.hpp>
namespace my_project {
Foo::Foo() : state_(0) {}
int Foo::compute(int x) const { return state_ + x; }
}
```

### Templates and inline functions
Templates and `inline` / `constexpr` functions must be visible at every point of use — put them in headers. Implementation can go in headers or in `.tpp` / `.ipp` files included from the header.

### Modules (C++20)
Modules are the future replacement for headers. Support is still maturing:
```cpp
// foo.cppm (module interface)
export module my_project.foo;

export namespace my_project {
class Foo {
    // ...
};
}

// main.cpp
import my_project.foo;
```

Build system integration is still rough in 2026. Most projects still use headers. Watch this space.

### `#include` style
```cpp
#include <iostream>             // standard library — angle brackets
#include <my_project/foo.hpp>   // your library — angle brackets if in include path
#include "local_header.hpp"      // local files in same directory
```

By convention:
- Angle brackets: search system / configured include paths.
- Quotes: search relative path first, then fallback.

### `#pragma once`
Header guard. Equivalent to:
```cpp
#ifndef MY_PROJECT_FOO_HPP
#define MY_PROJECT_FOO_HPP
// ...
#endif
```

All major compilers support `#pragma once`. Use it.

---

## 8. Hello World

### Single-file
`main.cpp`:
```cpp
#include <iostream>
#include <string>

int main() {
    std::string name = "World";
    std::cout << "Hello, " << name << "!\n";
    return 0;
}
```

Build and run:
```bash
g++ -std=c++23 main.cpp -o hello
./hello
```

### With CMake
`CMakeLists.txt`:
```cmake
cmake_minimum_required(VERSION 3.20)
project(hello LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(hello main.cpp)
target_compile_options(hello PRIVATE -Wall -Wextra -Wpedantic)
```

Build:
```bash
cmake -S . -B build
cmake --build build
./build/hello
```

### With std::format (C++20) and std::print (C++23)
```cpp
#include <print>     // C++23
#include <format>    // C++20

int main() {
    int x = 42;
    std::print("The answer is {}\n", x);    // C++23
    
    // Pre-C++23:
    auto msg = std::format("The answer is {}\n", x);
    std::cout << msg;
}
```

`std::format` is like Python's f-strings / `format`. `std::print` is the formatted print. Much cleaner than `<<` chains.

If your stdlib doesn't have these yet, use the [fmt](https://github.com/fmtlib/fmt) library (which `std::format` is based on).

---

## 9. Compiler Flags You Should Care About

### Warnings
```bash
-Wall -Wextra -Wpedantic
```

Always. Treats common issues as warnings. Run with `-Werror` to make them errors.

GCC/Clang useful extras:
```bash
-Wshadow              # warn on variable shadowing
-Wconversion           # warn on implicit conversions
-Wsign-conversion       # signed/unsigned conversions
-Wcast-align            # cast that changes required alignment
-Wnon-virtual-dtor      # class with virtual functions but non-virtual destructor
```

MSVC equivalents:
```bash
/W4 /WX
```

### Optimization
```bash
-O0     # no optimization (debug builds)
-O1     # basic
-O2     # standard production (recommended for release)
-O3     # aggressive — may bloat binary or break edge cases
-Os     # optimize for size
-Og     # optimize for debugging
```

For release builds, `-O2` is usually right. `-O3` can sometimes hurt due to code bloat.

### Debug info
```bash
-g           # full debug info
-g3          # extra debug info (macros, etc.)
```

Combine with optimization: `-O2 -g`. The debugger may show odd state (variables optimized out), but the code runs at production speed.

### Standard
```bash
-std=c++20
-std=c++23
```

Use the latest your compilers support.

### Sanitizers (development!)
```bash
-fsanitize=address          # detects buffer overflows, use-after-free
-fsanitize=undefined         # detects undefined behavior
-fsanitize=thread             # detects data races (alternative to address)
-fsanitize=leak                # detects memory leaks
```

Compile and link with these in debug builds. They slow runtime ~2x but catch bugs that escape testing.

In CMake:
```cmake
target_compile_options(my_app PRIVATE -fsanitize=address,undefined)
target_link_options(my_app PRIVATE -fsanitize=address,undefined)
```

### Linker
```bash
-lpthread          # link pthreads (for std::thread on Linux)
-lstdc++fs          # filesystem (older GCC; not needed in GCC 9+)
-L /path/to/libs    # additional library search path
-l name              # link libname.so/libname.a
```

CMake handles most of this via `target_link_libraries`.

### Position-independent code
```bash
-fPIC                # required for shared libraries
```

CMake adds this automatically for shared targets.

### Visibility
```bash
-fvisibility=hidden            # default hidden symbols
-fvisibility-inlines-hidden    # hide inline functions
```

For shared libraries, hide symbols by default; export only what's intended. Reduces ABI surface and binary size.

### Link-time optimization (LTO)
```bash
-flto              # enable LTO
```

Allows the linker to optimize across translation units. Slower link, faster runtime.

CMake:
```cmake
include(CheckIPOSupported)
check_ipo_supported(RESULT lto_supported)
if(lto_supported)
    set_property(TARGET my_app PROPERTY INTERPROCEDURAL_OPTIMIZATION TRUE)
endif()
```

### Common bundles
Debug:
```bash
-std=c++23 -O0 -g -Wall -Wextra -Wpedantic -fsanitize=address,undefined
```

Release:
```bash
-std=c++23 -O2 -DNDEBUG -Wall -Wextra
```

`-DNDEBUG` disables `assert()` macros. Standard for release.

---

You're set up. Next, the language itself: `02_language_basics.md`.
