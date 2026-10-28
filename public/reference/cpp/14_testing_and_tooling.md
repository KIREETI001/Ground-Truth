# 14. Testing and Tooling

C++ gives you no safety net. Buffer overflows, use-after-free, data races, integer overflow — none of these are caught at compile time, and most don't produce immediate, obvious failures at runtime either. A use-after-free might appear to work for years and then corrupt data once the memory allocator's behavior shifts.

The ecosystem of tools — testing frameworks, sanitizers, fuzzers, static analyzers — exists because the language itself won't tell you when you're wrong. This file covers the tools that make C++ practical to ship.

---

## Table of Contents

1. [Why Testing Matters More in C++](#why-testing-matters-more-in-c)
2. [Testing Frameworks: GoogleTest](#testing-frameworks-googletest)
3. [Testing Frameworks: Catch2](#testing-frameworks-catch2)
4. [Sanitizers: ASan, UBSan, TSan, MSan](#sanitizers-asan-ubsan-tsan-msan)
5. [Valgrind](#valgrind)
6. [Static Analysis](#static-analysis)
7. [Code Formatting: clang-format](#code-formatting-clang-format)
8. [Linting: clang-tidy](#linting-clang-tidy)
9. [Fuzzing](#fuzzing)
10. [CI for C++](#ci-for-c)

---

## Why Testing Matters More in C++

In Python or Java, a bug typically throws an exception and you see a stack trace. In C++:

- Out-of-bounds array access: undefined behavior. May silently corrupt memory and crash 10 minutes later.
- Use-after-free: undefined behavior. May appear to work because the memory hasn't been reused yet.
- Uninitialized variable: garbage value, deterministic but garbage.
- Data race: anything can happen, including time-traveling effects from compiler optimization.
- Integer overflow (signed): undefined behavior.
- Null pointer dereference: usually a crash, but not guaranteed.

The defensive answer is testing — combined with sanitizers and static analysis to surface bugs the tests don't trigger directly.

A reasonable goal for a C++ project:

1. Unit tests for logic.
2. Integration tests for real interactions.
3. Sanitizer builds in CI (ASan + UBSan minimum).
4. Static analysis on every PR.
5. Fuzzing for input-parsing code.

---

## Testing Frameworks: GoogleTest

GoogleTest (gtest) is the most widely used C++ testing framework. Heavyweight but feature-rich.

### Installation

Via package manager:

```bash
# vcpkg
vcpkg install gtest

# Conan
conan install gtest/1.14.0@
```

Or via CMake's `FetchContent`:

```cmake
include(FetchContent)
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.14.0
)
FetchContent_MakeAvailable(googletest)
```

### Basic test

```cpp
#include <gtest/gtest.h>

int add(int a, int b) { return a + b; }

TEST(AdditionTest, BasicCases) {
    EXPECT_EQ(add(2, 3), 5);
    EXPECT_EQ(add(-1, 1), 0);
    EXPECT_EQ(add(0, 0), 0);
}

TEST(AdditionTest, Overflow) {
    // Signed overflow is undefined behavior; this is a smoke test.
    EXPECT_EQ(add(INT_MAX, 0), INT_MAX);
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
```

`TEST(SuiteName, TestName)` defines a test. `EXPECT_*` and `ASSERT_*` are the assertion macros:

- `EXPECT_EQ(a, b)` — fail and continue if not equal.
- `ASSERT_EQ(a, b)` — fail and abort the current test if not equal.
- `EXPECT_TRUE(x)`, `EXPECT_FALSE(x)`.
- `EXPECT_LT`, `LE`, `GT`, `GE`, `NE`.
- `EXPECT_NEAR(a, b, tolerance)` — for floating point.
- `EXPECT_THROW(stmt, ExceptionType)`.
- `EXPECT_NO_THROW(stmt)`.

Use `ASSERT_*` when continuing makes no sense (e.g., a null pointer would crash subsequent lines). Use `EXPECT_*` otherwise so one test can report multiple failures.

### Fixtures

For shared setup:

```cpp
class DatabaseTest : public ::testing::Test {
protected:
    void SetUp() override {
        db.connect();
        db.execute("CREATE TABLE users (id INT, name TEXT)");
    }
    
    void TearDown() override {
        db.execute("DROP TABLE users");
        db.disconnect();
    }
    
    Database db;
};

TEST_F(DatabaseTest, InsertUser) {
    db.execute("INSERT INTO users VALUES (1, 'Alice')");
    EXPECT_EQ(db.count("users"), 1);
}

TEST_F(DatabaseTest, DeleteUser) {
    db.execute("INSERT INTO users VALUES (1, 'Alice')");
    db.execute("DELETE FROM users WHERE id = 1");
    EXPECT_EQ(db.count("users"), 0);
}
```

Each `TEST_F` gets a fresh fixture instance.

### Parameterized tests

```cpp
class IsEvenTest : public ::testing::TestWithParam<int> {};

TEST_P(IsEvenTest, ReturnsTrueForEvens) {
    int n = GetParam();
    EXPECT_TRUE(n % 2 == 0);
}

INSTANTIATE_TEST_SUITE_P(
    EvenNumbers,
    IsEvenTest,
    ::testing::Values(0, 2, 4, 6, 8, 100, -2)
);
```

The test runs once per parameter. Saves boilerplate when the same logic applies to many inputs.

### Death tests

Verify that code aborts/exits:

```cpp
TEST(SafetyTest, NullPointerDereference) {
    int* p = nullptr;
    EXPECT_DEATH({ *p = 5; }, "");
}
```

Useful for testing that assertions fire correctly.

### Matchers (gmock)

Comes bundled with gtest. More expressive assertions:

```cpp
#include <gmock/gmock.h>

using ::testing::ElementsAre;
using ::testing::Contains;
using ::testing::AllOf;
using ::testing::Gt;
using ::testing::Lt;

TEST(VectorTest, Contents) {
    std::vector<int> v = {1, 2, 3, 4, 5};
    
    EXPECT_THAT(v, ElementsAre(1, 2, 3, 4, 5));
    EXPECT_THAT(v, Contains(3));
    EXPECT_THAT(v, AllOf(Contains(3), Contains(5)));
    EXPECT_THAT(v.size(), AllOf(Gt(0u), Lt(100u)));
}
```

gmock also supports mocking — defining mock implementations of interfaces for tests. Useful but verbose; many projects skip it in favor of dependency injection by template parameter or `std::function`.

### Build with CMake

```cmake
enable_testing()

add_executable(my_tests
    test_main.cpp
    test_calculator.cpp
)
target_link_libraries(my_tests PRIVATE
    gtest_main
    my_library
)

include(GoogleTest)
gtest_discover_tests(my_tests)
```

Run with:

```bash
cd build
ctest --output-on-failure
```

---

## Testing Frameworks: Catch2

Catch2 is the lightweight alternative. Header-only (in v2; v3 is compiled), simpler syntax, BDD-style support.

### Installation

```cmake
FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.5.0
)
FetchContent_MakeAvailable(Catch2)
```

### Basic test

```cpp
#include <catch2/catch_test_macros.hpp>

int add(int a, int b) { return a + b; }

TEST_CASE("Addition works for basic cases", "[math]") {
    REQUIRE(add(2, 3) == 5);
    REQUIRE(add(-1, 1) == 0);
}

TEST_CASE("Addition handles edge cases", "[math][edge]") {
    SECTION("zero") {
        REQUIRE(add(0, 0) == 0);
    }
    SECTION("negatives") {
        REQUIRE(add(-2, -3) == -5);
    }
}
```

`TEST_CASE` is the test, `SECTION` are sub-tests that share setup. Tags in brackets enable filtering: `./tests "[math]"` runs only math tests.

- `REQUIRE` — like `ASSERT_*` in gtest.
- `CHECK` — like `EXPECT_*` in gtest.
- `REQUIRE_THROWS_AS(expr, ExceptionType)`.
- `REQUIRE_NOTHROW(expr)`.

### Why Catch2 over GoogleTest

- Smaller and simpler.
- No `main()` boilerplate (use `catch2_with_main`).
- Cleaner failure messages (`REQUIRE(x == 5)` shows `x` was actually 3).
- BDD syntax via `SCENARIO`/`GIVEN`/`WHEN`/`THEN` if you like that style.

### Why GoogleTest over Catch2

- Industry standard, especially at Google and downstream projects.
- gmock built in.
- More documentation and Stack Overflow answers.
- Parameterized tests are first-class.

For new projects, either is fine. Catch2 for smaller projects; gtest for serious infrastructure.

### Other frameworks

- **doctest** — header-only, fast compilation, similar to Catch2. Worth considering for compile-time-sensitive projects.
- **Boost.Test** — part of Boost. Older style. Use if you're already deep in Boost.

---

## Sanitizers: ASan, UBSan, TSan, MSan

The single most valuable tool for C++ developers. Sanitizers are runtime instrumentation that catches undefined behavior, memory errors, and concurrency bugs.

### AddressSanitizer (ASan)

Catches:
- Heap buffer overflow.
- Stack buffer overflow.
- Use after free.
- Use after return.
- Double free.
- Memory leaks.

Compile with `-fsanitize=address`:

```bash
g++ -fsanitize=address -g -O1 main.cpp -o app
./app
```

When a violation occurs, ASan prints a detailed report:

```
==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x60200000eff0 at pc 0x...
READ of size 4 at 0x60200000eff0 thread T0
    #0 0x... in main main.cpp:10
...
freed by thread T0 here:
    #0 0x... in free
    #1 0x... in main main.cpp:8
previously allocated by thread T0 here:
    #0 0x... in malloc
    #1 0x... in main main.cpp:6
```

The overhead is 2-3x slower runtime, 2-3x more memory. Acceptable for tests, not for production.

### UndefinedBehaviorSanitizer (UBSan)

Catches:
- Signed integer overflow.
- Floating-point overflow / division by zero.
- Misaligned pointer access.
- Null pointer dereference.
- Out-of-bounds shifts.
- And many others.

```bash
g++ -fsanitize=undefined -g -O1 main.cpp -o app
./app
```

ASan and UBSan combine: `-fsanitize=address,undefined`. Run this in CI on every commit.

### ThreadSanitizer (TSan)

Catches data races.

```bash
g++ -fsanitize=thread -g -O1 main.cpp -o app
./app
```

Cannot combine with ASan (uses different runtime). Run TSan separately. Overhead is ~5-15x.

If you have multi-threaded code, run it under TSan. Data races that "seem to work" will eventually fail at the worst time.

### MemorySanitizer (MSan)

Catches use of uninitialized memory. Clang-only, more setup required (needs an instrumented standard library).

```bash
clang++ -fsanitize=memory -g -O1 main.cpp -o app
```

Often skipped because ASan + UBSan + good warning flags catch most issues.

### Don't combine them carelessly

Each sanitizer has its own runtime. ASan + UBSan: yes. ASan + TSan: no. Run separate binaries for each.

### In CMake

```cmake
option(ENABLE_SANITIZERS "Enable ASan and UBSan" OFF)

if(ENABLE_SANITIZERS)
    add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
    add_link_options(-fsanitize=address,undefined)
endif()
```

Configure with `-DENABLE_SANITIZERS=ON` for sanitized builds.

### Suppressions

Sometimes you need to suppress known issues (e.g., in third-party code). Create a suppression file and set:

```bash
export LSAN_OPTIONS=suppressions=lsan.supp
export UBSAN_OPTIONS=suppressions=ubsan.supp
```

Use sparingly. Each suppression is a bug you're choosing to ignore.

---

## Valgrind

Valgrind is an instrumented binary translator. Its `memcheck` tool catches similar bugs to ASan but works on unmodified binaries.

```bash
valgrind --tool=memcheck --leak-check=full ./app
```

Output is detailed. Reports memory leaks, uninitialized reads, invalid frees.

### Valgrind vs ASan

| Aspect | ASan | Valgrind |
|---|---|---|
| Speed | 2-3x slower | 20-50x slower |
| Setup | Recompile with `-fsanitize=address` | None — runs on existing binary |
| False positives | Rare | More common |
| Platform support | Linux, macOS, Windows (limited) | Linux, macOS |
| Detection quality | Excellent for heap; misses some stack issues | Excellent for heap |

ASan is preferred when you can recompile. Valgrind is invaluable when you can't (debugging third-party binaries) or for catching things ASan misses.

### Other Valgrind tools

- **callgrind** — profiler (covered in the previous file).
- **helgrind** — data race detector.
- **massif** — heap profiler.

---

## Static Analysis

Tools that analyze code without running it. Catch some bugs at "compile time" (or close to it) that the compiler doesn't.

### clang-tidy

The flagship. Bundled with LLVM/Clang.

```bash
clang-tidy main.cpp -- -std=c++20
```

Or via CMake:

```cmake
set(CMAKE_CXX_CLANG_TIDY clang-tidy -checks=*,-fuchsia-*,-llvm-*)
```

`clang-tidy` runs on every file during compilation.

### Checks

clang-tidy has hundreds of checks, organized by category:

- `bugprone-*` — likely bugs.
- `clang-analyzer-*` — deep static analysis (memory issues, null derefs).
- `cppcoreguidelines-*` — C++ Core Guidelines.
- `modernize-*` — modernization suggestions (use `auto`, `nullptr`, range-for, etc.).
- `performance-*` — performance issues (unnecessary copies, etc.).
- `readability-*` — style suggestions.

Configure in `.clang-tidy`:

```yaml
Checks: >
    bugprone-*,
    clang-analyzer-*,
    cppcoreguidelines-*,
    modernize-*,
    performance-*,
    readability-*,
    -modernize-use-trailing-return-type

WarningsAsErrors: bugprone-*,clang-analyzer-*
```

### Example findings

clang-tidy will flag things like:

```cpp
// modernize-use-nullptr
int* p = 0;  // → int* p = nullptr;

// bugprone-use-after-move
std::string s = "hello";
auto t = std::move(s);
std::cout << s;  // ← warning: use after move

// performance-unnecessary-copy-initialization
const std::string s = some_func();  // OK if some_func returns by value
const std::string& s = some_string;  // better when not copying

// readability-magic-numbers
if (x > 42) ...  // ← suggests naming the constant
```

### cppcheck

Older static analyzer. Catches different things from clang-tidy. Run both for best coverage.

```bash
cppcheck --enable=all --std=c++20 src/
```

### PVS-Studio

Commercial. Often catches subtle bugs other tools miss. Free for open-source projects.

### include-what-you-use (IWYU)

Analyzes headers and suggests minimal `#include` sets. Reduces compile times and accidental dependencies.

```bash
include-what-you-use -std=c++20 main.cpp
```

### Static analysis isn't a substitute for tests

It catches a slice of bugs — common patterns of mistakes. Many bugs are logic errors that require running the code with input. Use static analysis *and* tests *and* sanitizers.

---

## Code Formatting: clang-format

Automatic code formatting. Settles style debates by removing the choice.

### Setup

Create `.clang-format` in the project root:

```yaml
BasedOnStyle: Google
IndentWidth: 4
ColumnLimit: 100
AllowShortFunctionsOnASingleLine: Empty
SpaceBeforeParens: ControlStatements
```

Or use a preset:

```yaml
BasedOnStyle: LLVM
# or Google, Mozilla, Chromium, Microsoft, WebKit
```

### Usage

```bash
clang-format -i src/*.cpp src/*.h    # format in place
```

Most editors integrate clang-format and reformat on save.

### CI check

```bash
clang-format --dry-run --Werror src/*.cpp
```

Exits non-zero if any file isn't formatted. Use in CI to prevent unformatted PRs.

### Convention

Pick a style, commit `.clang-format`, run on the whole codebase once, then enforce in CI. No more debates about brace placement.

---

## Linting: clang-tidy

Covered above. The "linter" role: enforcing patterns, modernization, simple bug detection. Different from sanitizers (runtime) and from compiler warnings (limited to what compilers natively detect).

### Compiler warnings

Always enable:

```bash
-Wall -Wextra -Wpedantic
```

For more strictness:

```bash
-Wshadow              # variable shadowing
-Wnon-virtual-dtor    # class with virtual functions but non-virtual destructor
-Wold-style-cast      # C-style casts
-Wcast-align          # casts that increase alignment requirements
-Wunused              # unused variables, functions, etc.
-Woverloaded-virtual  # hidden virtual functions
-Wconversion          # implicit conversions (can be noisy)
-Wsign-conversion     # signed/unsigned conversions
-Wnull-dereference
-Wdouble-promotion    # float to double
-Wformat=2            # printf format checking
```

MSVC equivalents: `/W4 /WX` (warnings as errors).

Treat warnings as errors in CI (`-Werror`). Warnings you don't act on are noise that hides real warnings.

---

## Fuzzing

Fuzzing automatically generates random inputs to find bugs. Particularly effective for parsers, deserializers, and any code that takes untrusted input.

### libFuzzer (Clang)

Built into Clang. Compile with `-fsanitize=fuzzer,address,undefined`.

Write a fuzz target:

```cpp
#include <cstdint>
#include <cstddef>

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
    parse_input(reinterpret_cast<const char*>(data), size);
    return 0;
}
```

Compile:

```bash
clang++ -fsanitize=fuzzer,address,undefined -g fuzz_parser.cpp parser.cpp -o fuzz_parser
```

Run:

```bash
./fuzz_parser
```

libFuzzer generates random inputs, runs your function, and reports any crash, hang, or sanitizer violation. It maintains a corpus of "interesting" inputs and mutates them to explore more code paths.

For real protection, run fuzzers for hours or days on dedicated hardware. **OSS-Fuzz** (Google) runs continuous fuzzing for free for open-source projects.

### AFL / AFL++

American Fuzzy Lop. The other major fuzzer. Works on compiled binaries without source instrumentation (though instrumentation makes it faster). Used to find thousands of bugs in open-source projects.

### When to fuzz

- Any code that parses untrusted data: file formats, network protocols, deserialization.
- Anywhere a crash means a security issue.
- After fixing a parser bug — fuzz the fix to find related issues.

Don't fuzz pure computation that takes typed inputs. Fuzz the boundary between bytes-in and structured-data.

---

## CI for C++

Continuous Integration for C++ is more involved than for higher-level languages because you need to test multiple compilers, OSes, and configurations.

### Recommended CI matrix

For a serious project, build and test on:

- Linux + GCC (latest stable).
- Linux + Clang (latest stable).
- macOS + Clang (Xcode default).
- Windows + MSVC (latest VS).
- Linux + GCC + sanitizers (ASan + UBSan).
- Linux + Clang + sanitizers (TSan separately).
- Multiple C++ standards: C++17, C++20, C++23 if you claim to support them.

### GitHub Actions example

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        compiler: [gcc, clang, msvc]
        exclude:
          - os: macos-latest
            compiler: gcc
          - os: macos-latest
            compiler: msvc
          - os: ubuntu-latest
            compiler: msvc
          - os: windows-latest
            compiler: gcc
          - os: windows-latest
            compiler: clang
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure CMake
        run: cmake -B build -DCMAKE_BUILD_TYPE=Release
      
      - name: Build
        run: cmake --build build --parallel
      
      - name: Test
        working-directory: build
        run: ctest --output-on-failure
  
  sanitizers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure with sanitizers
        run: cmake -B build -DCMAKE_BUILD_TYPE=Debug -DENABLE_SANITIZERS=ON
      - run: cmake --build build --parallel
      - working-directory: build
        run: ctest --output-on-failure
  
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install clang-tidy
        run: sudo apt-get install -y clang-tidy
      - name: Run clang-tidy
        run: clang-tidy src/*.cpp -- -std=c++20 -I include
```

### Caching

CMake builds can take a while; cache aggressively:

```yaml
- name: Cache build
  uses: actions/cache@v4
  with:
    path: build
    key: ${{ runner.os }}-${{ matrix.compiler }}-${{ hashFiles('**/*.cpp', '**/*.h', 'CMakeLists.txt') }}
```

For larger projects, **ccache** or **sccache** dramatically speed up incremental builds in CI.

### Coverage

```cmake
if(ENABLE_COVERAGE)
    add_compile_options(--coverage)
    add_link_options(--coverage)
endif()
```

Then run tests, generate coverage with `gcovr` or `lcov`, upload to Codecov or similar.

100% coverage is a vanity metric. Aim for "all critical paths are exercised by at least one test."

---

## Putting it all together

A reasonable C++ development workflow:

1. **Write code with warnings as errors** (`-Wall -Wextra -Wpedantic -Werror`).
2. **Auto-format on save** (clang-format).
3. **Lint as you go** (clang-tidy in your editor).
4. **Write unit tests** (gtest or Catch2).
5. **Run sanitizers locally** before committing (`ASan + UBSan`).
6. **Run TSan periodically** if multi-threaded.
7. **CI matrix** with multiple compilers, sanitizers, static analysis.
8. **Fuzz** any input parser.

This is more work than testing in Python or Java. The payoff is that you find bugs early, in the dev cycle, rather than in production at 3 AM.

### Skipping any of these is a tradeoff

Small projects don't need OSS-Fuzz. Internal tools might skip the CI matrix. But everyone benefits from sanitizers and warnings-as-errors. Those are the minimum bar for C++ in 2026.

---

## Key principles

- **The compiler won't catch your bugs.** Use sanitizers, tests, and static analysis to compensate.
- **ASan + UBSan should run in CI on every commit.** Cheap to set up, catches devastating bugs.
- **clang-tidy and clang-format remove debates and bugs simultaneously.** Configure once, automate.
- **Multi-compiler CI catches portability issues.** GCC, Clang, MSVC each have their quirks.
- **Tests live alongside code, not in a separate "QA" step.** TDD or write-tests-soon-after, not "write tests later."
- **Fuzzers are free bug finders for parser code.** Use OSS-Fuzz if you're open source.
- **Warnings as errors.** Treat every warning as a bug or a code-smell to fix.

Next: the final C++ file — a curated reference of common pitfalls and idioms, the stuff that catches everyone at least once.
