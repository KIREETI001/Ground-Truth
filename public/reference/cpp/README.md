# C++ — Reference Library

A reference for **modern C++** (C++20 and C++23) — the language, the standard library, build tools, and the domains where C++ still wins: game engines, systems programming, performance-critical infrastructure, and embedded systems.

> **Warning**: C++ is a large, sharp-edged language. There are many ways to do the same thing; some lead to memory corruption and undefined behavior. This guide focuses on the **modern subset** — RAII, smart pointers, value semantics, ranges — that lets you write reasonably safe code. Avoid pre-2011 idioms unless maintaining legacy code.

---

## How to navigate this folder

| # | File | What's in it |
|---|---|---|
| — | `README.md` | This file. Mental model, when to use C++, ecosystem. |
| 01 | `01_setup.md` | Compilers (GCC, Clang, MSVC), build systems (CMake), package managers (vcpkg, Conan), IDEs. |
| 02 | `02_language_basics.md` | Syntax, primitives, control flow, references, modern features (auto, structured bindings). |
| 03 | `03_pointers_and_memory.md` | Raw pointers, references, smart pointers (unique_ptr, shared_ptr), RAII, ownership. |
| 04 | `04_classes_and_oop.md` | Classes, constructors/destructors, inheritance, virtual, polymorphism, rule of 0/3/5. |
| 05 | `05_templates_and_generics.md` | Function/class templates, concepts (C++20), variadic templates, SFINAE basics. |
| 06 | `06_stl_containers.md` | vector, string, map, unordered_map, set, deque, array, span. |
| 07 | `07_stl_algorithms_and_ranges.md` | <algorithm>, lambdas, iterators, ranges (C++20). |
| 08 | `08_errors_and_exceptions.md` | Exceptions, error codes, std::expected (C++23), assertions. |
| 09 | `09_concurrency.md` | std::thread, async, mutex, atomic, memory model, jthread, coroutines basics. |
| 10 | `10_io_and_filesystem.md` | iostreams, filesystem, file I/O, networking (overview). |
| 11 | `11_modern_cpp_features.md` | Move semantics, perfect forwarding, lambdas, constexpr, modules. |
| 12 | `12_game_engines_and_graphics.md` | Game engine architecture, Unreal, OpenGL/Vulkan basics, ECS pattern. |
| 13 | `13_performance_and_optimization.md` | Cache locality, branch prediction, profiling, benchmarking. |
| 14 | `14_testing_and_tooling.md` | GoogleTest, Catch2, sanitizers (ASan, UBSan), static analysis. |
| 15 | `15_common_pitfalls_and_idioms.md` | UB, common bugs, idioms reference, dangerous patterns to avoid. |

---

## What C++ is in 2026

C++ is a **statically typed, multi-paradigm language** with:
- Direct memory access and zero-cost abstractions.
- A massive standard library (containers, algorithms, threads, file I/O, etc.).
- Templates / generics that compile to specialized code per type.
- Manual memory management (with modern smart pointer support).
- A reputation for being complex, dangerous, and fast.

It's the language of:
- **Game engines**: Unreal, custom AAA engines, parts of Unity (native).
- **Browsers**: Chromium (Chrome, Edge, Brave), Firefox (Gecko), WebKit (Safari).
- **Databases**: PostgreSQL, MySQL, ClickHouse, RocksDB.
- **Operating systems**: Windows (most), parts of Linux/macOS.
- **High-frequency trading**, scientific computing, robotics, autonomous vehicles.
- **Embedded systems** (alongside C).

The big themes in modern C++ (post-2011):
- **C++11**: lambdas, smart pointers, move semantics, auto, range-for.
- **C++14/17**: structured bindings, `if constexpr`, filesystem, optional/variant.
- **C++20**: concepts, ranges, coroutines, modules, std::format, three-way comparison.
- **C++23**: `std::expected`, deducing this, multidimensional subscript, `std::print`.

A 2025 C++ codebase looks very different from a 2005 one. New code should target **C++20 or C++23**.

---

## Where C++ sits vs alternatives

| Need | C++ vs alternative |
|---|---|
| Game engine (AAA) | C++ dominates. Unreal Engine is C++ + Blueprint. |
| Game scripting | C# (Unity) or Lua / GDScript / Blueprint preferred. |
| Operating systems / kernels | C++ (modern OS components), C (kernel core), Rust (growing rapidly). |
| Browser engines | C++. Hard to displace. |
| Databases / storage engines | C++ for performance-critical paths. |
| Embedded | C still dominates; C++ for higher-level abstractions; Rust gaining. |
| Backend services | Generally not — Go, Rust, Java, C# faster to develop. C++ only if every microsecond counts (HFT, ad bidding). |
| ML training | Python frontend, C++ backends (PyTorch, TensorFlow). |
| Scientific computing | Python + C++ libraries. |
| Application development | Almost never anymore — Qt apps and a few specialties. |
| New systems projects | Rust is the modern alternative; gaining ground. |

---

## Why use C++

- **Performance.** Zero-cost abstractions, direct memory access, predictable behavior. Hand-tunable down to the assembly.
- **Existing ecosystem.** Decades of mature libraries (Boost, OpenCV, Qt, Eigen, OpenGL, Vulkan, SDL, etc.).
- **Industry standard for specific domains.** Game engines, systems software, browsers.
- **Mature tooling.** Excellent compilers, debuggers, profilers, sanitizers, static analysis.
- **Cross-platform.** Same code runs on Windows, Linux, macOS, consoles, embedded.
- **Inline assembly** when needed.
- **Hardware access.** Direct memory layout control, SIMD intrinsics, cache-line awareness.

## Why not use C++

- **Complexity.** The language has accumulated decades of features; mastering it takes years.
- **Memory safety.** Buffer overflows, use-after-free, double-free, dangling pointers — all easy mistakes that can be exploited.
- **Compilation speed.** Slow, especially with heavy template use.
- **Build system pain.** CMake is the de facto standard but isn't fun.
- **Dependency management** is harder than most modern languages. Better with vcpkg/Conan, but still rough.
- **ABI fragility.** Updating compiler / standard library versions can break binary compatibility.
- **Undefined behavior everywhere.** A typo can corrupt memory in ways the compiler doesn't catch.

Modern alternatives:
- **Rust** — memory safety + performance, growing replacement for many C++ niches.
- **Go** — easier syntax, GC, fine for most server work.
- **Zig** — newer, simpler systems language. Still maturing.

---

## C++ standard versions

C++ standards (named by year):
- **C++98 / C++03** — original ISO standard. Avoid.
- **C++11** — the modern era began. Lambdas, smart pointers, move semantics, auto.
- **C++14** — incremental polish.
- **C++17** — structured bindings, optional, filesystem, parallel STL.
- **C++20** — major: concepts, ranges, modules, coroutines, std::format, three-way comparison.
- **C++23** — recent: std::expected, deducing this, std::print.
- **C++26** — upcoming, target adoption ~2027.

Set the standard in your build:
- CMake: `set(CMAKE_CXX_STANDARD 23)` or use `-std=c++23` directly.

**For new projects**: target C++20 at minimum, C++23 if your compilers support it. Most code shown in this guide is C++20.

### Compiler support
- **GCC 13+**: most of C++23, all of C++20.
- **Clang 17+**: similar.
- **MSVC** (Visual Studio 2022 17.10+): full C++20, large parts of C++23.

Embedded / older platforms may force C++17 or older.

---

## Reading order

1. **New to C++?** `01_setup.md` → `02_language_basics.md` → `03_pointers_and_memory.md` → `04_classes_and_oop.md`. Build a small CLI tool. Then `06_stl_containers.md`.
2. **Game development?** Add `12_game_engines_and_graphics.md` → `09_concurrency.md` → `13_performance_and_optimization.md`.
3. **Library / framework author?** `05_templates_and_generics.md` and `11_modern_cpp_features.md` are essential.
4. **Performance-critical code?** `13_performance_and_optimization.md`, `06_stl_containers.md`, `07_stl_algorithms_and_ranges.md`.
5. **Coming from C?** Start at `02_language_basics.md`. Pay close attention to RAII, smart pointers, and the STL (files 3, 6, 7).
6. **Coming from Java/C#?** The OOP looks familiar but ownership/memory rules are different. File `03_pointers_and_memory.md` is critical.
7. **Coming from Rust?** Most concepts transfer. C++'s safety story is weaker; pay attention to lifetimes informally.

---

## The "modern C++" way

A handful of principles that distinguish modern from legacy C++:

- **RAII for everything.** Resources tied to object lifetime. Constructors acquire, destructors release.
- **Smart pointers over raw pointers** for ownership: `std::unique_ptr<T>` for single ownership, `std::shared_ptr<T>` for shared.
- **Raw pointers are non-owning observers.** They're fine for "look but don't keep."
- **References for non-null parameters.** Pointers when null is meaningful.
- **`const` everywhere.** Mark parameters, methods, locals `const` when they don't mutate.
- **Pass by value or const reference.** `void f(std::string s)` for sink/copy semantics; `void f(const std::string& s)` to look without copying.
- **Value semantics.** Objects own their data; copy = deep copy. Move when you want to transfer ownership cheaply.
- **No `new` / `delete` in application code.** Use `std::make_unique` / `std::make_shared` instead.
- **`std::` namespace** is everywhere. Get used to typing it (or `using namespace std::ranges` for ranges in scope).
- **Templates instead of inheritance** for static polymorphism. Concepts (C++20) constrain templates cleanly.
- **Auto for types** when the type is obvious from initialization.
- **Range-for loops** instead of indexed loops where possible.
- **Algorithm calls** over hand-written loops where they're clearer.

---

## What you won't find here

- **C-style C++** (raw pointers, `malloc`, `printf`). Mentioned for context only.
- **Heavy template metaprogramming** (SFINAE tricks, expression templates). Briefly covered; not the focus.
- **Specific game engine internals** (Unreal API, etc.) — overview only.
- **OS-specific APIs** (Win32, POSIX). Focus is on standard C++ + portable libraries.
- **Older versions** (C++98, C++03) except as historical context.

---

## TL;DR: when C++ fits

Pick C++ in 2026 when:
- You're working on a game engine, browser, OS, database, or other established C++ project.
- You need the absolute best performance and can afford the complexity.
- You need direct memory / hardware access.
- The team is already C++-fluent.
- Cross-platform native code for graphics, audio, embedded.

Pick something else when:
- It's a new project where you have choice. Consider **Rust** for systems work, **Go** for backends, **C#** for games (Unity).
- You don't need the perf C++ offers — most code doesn't.
- Speed of development matters more than runtime performance.
- Your team isn't already C++-fluent — the learning curve is steep.

Now: `01_setup.md`.
