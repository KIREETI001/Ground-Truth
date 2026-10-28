# 11. Modern C++ Features

> Move semantics, perfect forwarding, `constexpr`, modules, structured bindings — the language as it exists in C++20/23.

> If you're learning modern C++ for the first time, these are the features that make the language feel different from "C with classes."

---

## Table of Contents

1. [What "Modern C++" Means](#1-what-modern-c-means)
2. [Move Semantics — Recap and Depth](#2-move-semantics--recap-and-depth)
3. [Perfect Forwarding](#3-perfect-forwarding)
4. [`constexpr` and Compile-Time Computation](#4-constexpr-and-compile-time-computation)
5. [Structured Bindings (C++17)](#5-structured-bindings-c17)
6. [`if` / `switch` with Initializer (C++17)](#6-if--switch-with-initializer-c17)
7. [Lambdas — Advanced](#7-lambdas--advanced)
8. [Modules (C++20)](#8-modules-c20)
9. [Designated Initializers (C++20)](#9-designated-initializers-c20)
10. [Spaceship Operator (C++20)](#10-spaceship-operator-c20)
11. [Smaller Touches That Add Up](#11-smaller-touches-that-add-up)

---

## 1. What "Modern C++" Means

A loose term meaning "C++11 and later." The major versions:
- **C++11** (2011) — the renaissance. Move semantics, lambdas, `auto`, smart pointers, threads.
- **C++14** (2014) — refinements (generic lambdas, `auto` for return types).
- **C++17** (2017) — `<filesystem>`, `<optional>`, `<variant>`, structured bindings, `if constexpr`.
- **C++20** (2020) — modules, concepts, ranges, coroutines, `std::format`.
- **C++23** (2023) — `std::expected`, `std::print`, more ranges, multidimensional subscript.
- **C++26** (planned) — networking?, reflection, contracts.

In 2026, C++20 is the practical baseline for new code; C++23 features should be used where supported (GCC 13+, Clang 16+, MSVC 19.36+).

---

## 2. Move Semantics — Recap and Depth

### The problem
Pre-C++11, copying was the only way to "transfer" values. For a large `std::vector`, returning it from a function meant copying every element.

### Move solves this
Move "steals" the resources of a temporary instead of copying:
```cpp
std::vector<int> make_big() {
    std::vector<int> v(1'000'000, 42);
    return v;    // moved (or elided), not copied
}

std::vector<int> result = make_big();   // ~no cost
```

### Rvalue references (`T&&`)
Bind to temporaries:
```cpp
void process(std::string&& s) {     // accepts only rvalues
    // s is named, but its type tells us it came from a temporary
}

process(std::string("hello"));   // OK — temporary
std::string s = "hi";
process(s);                       // ERROR — s is an lvalue
process(std::move(s));             // OK — cast to rvalue
```

`std::move` doesn't actually move anything. It's a cast to `T&&` that signals "you can steal from me."

### Move constructor / move assignment
```cpp
class MyClass {
    std::vector<int> data;
public:
    // Move constructor
    MyClass(MyClass&& other) noexcept
        : data(std::move(other.data)) {}
    
    // Move assignment
    MyClass& operator=(MyClass&& other) noexcept {
        if (this != &other) {
            data = std::move(other.data);
        }
        return *this;
    }
};
```

**`noexcept` matters** — STL containers (like `vector::resize`) only use moves if they're `noexcept`, otherwise they copy.

### After move
The moved-from object must be in a "valid but unspecified" state. For STL types: usually empty. You can still:
- Destroy it.
- Assign to it.

You should not (in general):
- Read its value (unspecified).

### When does move happen
- Returning a local by value (NRVO often elides this, but move otherwise).
- `std::move(x)`.
- Construction from a temporary.
- Pass by value when caller passed an rvalue.

### Rule of 0/3/5
- **Rule of 0**: if your class needs no custom destructor / copy / move, define none. Members manage themselves.
- **Rule of 3**: if you need any of destructor, copy ctor, copy assignment — you need all three (C++98).
- **Rule of 5**: also move ctor and move assignment (C++11+).

In modern C++, prefer Rule of 0: use STL containers, smart pointers, RAII — let the compiler write the special members.

---

## 3. Perfect Forwarding

You're writing a factory or wrapper function. You want to pass arguments through to another function preserving their value categories (lvalue vs rvalue).

```cpp
template<typename T, typename... Args>
std::unique_ptr<T> make(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}
```

### Forwarding references (`T&&` in template context)
When `T` is a template parameter being deduced, `T&&` is a **forwarding reference**, not an rvalue reference. It can bind to both lvalues and rvalues:
- If you pass an lvalue: `T = int&`, parameter type collapses to `int&`.
- If you pass an rvalue: `T = int`, parameter type is `int&&`.

This is "reference collapsing."

### `std::forward`
Casts to the appropriate type based on what was deduced:
```cpp
template<typename T>
void wrapper(T&& arg) {
    inner(std::forward<T>(arg));    // preserves lvalueness/rvalueness
}
```

Without `std::forward`, the variable `arg` is an lvalue inside `wrapper` — even if it came in as an rvalue. Forwarding restores its original category.

### When you need forwarding
- Factory functions (`make_unique`, `emplace_back`).
- Wrappers / decorators.
- Generic libraries.

### When you don't
For "normal" code, `T&&` is overkill. Use `const T&` for read access, `T` for ownership transfer.

---

## 4. `constexpr` and Compile-Time Computation

`constexpr` means "can be evaluated at compile time" (and might be).

```cpp
constexpr int square(int x) {
    return x * x;
}

constexpr int n = square(5);     // computed at compile time
int x = 5;
int y = square(x);                // runtime computation OK
```

### `constexpr` rules
- Function body must be valid `constexpr` (no I/O, no undefined behavior).
- All inputs must be `constexpr`-evaluable at compile time.
- Can be called at runtime too — it's "potentially compile-time."

### `consteval` (C++20)
"Must be evaluated at compile time":
```cpp
consteval int square(int x) {
    return x * x;
}

consteval int n = square(5);    // OK
int x = 5;
// int y = square(x);    // ERROR — x is not a constant
```

For functions that should never run at runtime (DSLs, metaprogramming).

### `constinit` (C++20)
Forces compile-time initialization for static / thread_local variables — no startup overhead:
```cpp
constinit int g = compute_at_compile_time();
```

The variable can still be modified at runtime; the *initialization* is what's compile-time.

### `if constexpr`
Compile-time conditional:
```cpp
template<typename T>
void process(T value) {
    if constexpr (std::is_pointer_v<T>) {
        // only this branch is compiled for pointer T
    } else {
        // only this branch is compiled for non-pointer T
    }
}
```

Branches not taken aren't compiled, so they can contain code invalid for the other type.

### `constexpr` containers (C++20+)
Many STL containers and algorithms became `constexpr` in C++20:
```cpp
constexpr int sum() {
    std::vector<int> v = {1, 2, 3, 4, 5};   // C++20 allows constexpr vector
    return std::accumulate(v.begin(), v.end(), 0);
}

constexpr int total = sum();   // computed at compile time
```

### Use cases
- Compile-time lookup tables.
- Configuration data baked into the binary.
- Template metaprogramming made readable.
- DSLs.

`constexpr` is a way to push computation from runtime to compile time, often at the cost of build time.

---

## 5. Structured Bindings (C++17)

Destructure tuples, pairs, structs:

```cpp
std::pair<int, std::string> p{42, "hello"};
auto [num, text] = p;    // num = 42, text = "hello"

std::tuple<int, double, std::string> t{1, 2.5, "x"};
auto [a, b, c] = t;

std::map<std::string, int> m = {{"a", 1}, {"b", 2}};
for (const auto& [key, value] : m) {
    std::cout << key << ": " << value << "\n";
}
```

### With structs
```cpp
struct Point { int x, y; };
Point p{1, 2};
auto [x, y] = p;
```

Just identifies fields in declaration order.

### With references
```cpp
auto& [k, v] = pair;     // bind by reference (modify pair through k, v)
const auto& [k, v] = pair;    // const reference
```

### Why use them
- Avoid temp variables (`pair.first` / `pair.second`).
- Idiomatic map iteration.
- Cleaner return-multiple-values pattern.

---

## 6. `if` / `switch` with Initializer (C++17)

Declare a variable in the condition:
```cpp
if (auto it = map.find(key); it != map.end()) {
    use(it->second);
}    // it goes out of scope here

if (auto result = compute(); result.is_valid()) {
    // ...
}

switch (auto x = next_value(); x) {
    case 1: ...;
    case 2: ...;
}
```

Scopes the temporary to the `if` block. Cleaner than declaring outside and checking.

### C++23 extends this to `if constexpr` and ranges-based `for`.

---

## 7. Lambdas — Advanced

### Generic lambdas (C++14)
```cpp
auto print = [](const auto& x) { std::cout << x; };
```

### Template lambdas (C++20)
```cpp
auto f = []<typename T>(const std::vector<T>& v) {
    if constexpr (std::is_integral_v<T>) { ... }
};
```

### Lambda capture initializer (C++14)
Compute the capture value:
```cpp
auto lambda = [counter = 0]() mutable { return ++counter; };
auto lambda2 = [ptr = std::move(some_unique_ptr)]() { ... };
```

### Lambda as `constexpr` (C++17)
```cpp
constexpr auto add = [](int a, int b) { return a + b; };
constexpr int x = add(3, 5);
```

### `consteval` lambda (C++20)
```cpp
auto pure = []() consteval { return 42; };
```

### Recursive lambdas
C++ lambdas can't directly recurse (the lambda doesn't have a name to call itself). Workarounds:
```cpp
// Pre-C++23: pass itself
auto fact = [](auto self, int n) -> int {
    return n <= 1 ? 1 : n * self(self, n - 1);
};
fact(fact, 5);   // 120

// C++23: explicit object parameter (deducing this)
auto fact = [](this auto self, int n) -> int {
    return n <= 1 ? 1 : n * self(n - 1);
};
fact(5);   // 120
```

### Default constructible (C++20)
```cpp
auto l1 = [](int x) { return x * 2; };
decltype(l1) l2;     // OK in C++20 if lambda has no captures
```

Useful for using lambdas as predicates in `std::set`, etc.

---

## 8. Modules (C++20)

A modern replacement for headers. Faster compile times, cleaner boundaries.

### Defining a module
```cpp
// math.cppm — a "module interface unit"
export module math;

export int add(int a, int b) { return a + b; }
export int subtract(int a, int b) { return a - b; }

int internal() { return 42; }   // not exported
```

### Using a module
```cpp
// main.cpp
import math;

int main() {
    return add(3, 4);    // imported symbol
}
```

### Why modules
- Faster builds: a module is compiled once into a binary representation, not re-parsed for each `#include`.
- No header-file fragility (include guards, ordering, macros leaking).
- Explicit exports — cleaner public API.

### Adoption (2026)
- Standard library modules (`import std;`, `import std.compat;`) are arriving in Clang 18+, MSVC, GCC 14+.
- Build systems (CMake, etc.) are catching up.
- Many projects haven't migrated — header-based code still dominates.

For new greenfield projects with modern tools, modules are worth considering. For existing codebases, migration is gradual.

### Header units
A transitional feature: `import <vector>;` treats a header as a module. Compromise between modules and `#include`.

---

## 9. Designated Initializers (C++20)

Name fields when initializing structs (like C99):

```cpp
struct Point { int x; int y; int z; };

Point p{.x = 1, .y = 2, .z = 3};
Point p2{.y = 5};    // x and z are zero-initialized
```

Restrictions:
- Fields must be initialized in declaration order.
- Can't mix designated and non-designated.
- C++20 is stricter than C99 here.

Useful for clarity:
```cpp
window.create({
    .width = 800,
    .height = 600,
    .title = "Hello",
    .fullscreen = false,
});
```

---

## 10. Spaceship Operator (C++20)

`<=>` — three-way comparison.

```cpp
#include <compare>

struct Point {
    int x, y;
    auto operator<=>(const Point& other) const = default;
};

Point a{1, 2};
Point b{1, 3};
a < b;    // true
a == b;    // false
```

`= default` generates `<`, `<=`, `>`, `>=`, `==`, `!=` based on member-wise comparison.

### Result types
`<=>` returns a comparison category:
- `std::strong_ordering` — total order (default for primitive types).
- `std::weak_ordering` — equality doesn't imply substitutability (e.g., case-insensitive strings).
- `std::partial_ordering` — partial (floats with NaN).

### Custom
```cpp
struct CaseInsensitiveString {
    std::string value;
    
    std::weak_ordering operator<=>(const CaseInsensitiveString& other) const {
        return strcasecmp(value.c_str(), other.value.c_str()) <=> 0;
    }
    
    bool operator==(const CaseInsensitiveString& other) const = default;
};
```

### Why
- One operator instead of six.
- Consistent behavior.
- Easier to maintain.

For value types, `auto operator<=>(...) const = default;` is the modern default.

---

## 11. Smaller Touches That Add Up

### `auto` return types
```cpp
auto add(int a, int b) {
    return a + b;     // return type deduced as int
}

template<typename T>
auto make() {
    return T{};
}
```

### Template type deduction for class templates (C++17)
```cpp
std::vector v{1, 2, 3};     // vector<int>, no need for <int>
std::pair p{1, "hi"};         // pair<int, const char*>
```

### `[[nodiscard]]`
Warn if a return value is ignored:
```cpp
[[nodiscard]] bool is_valid() const;

is_valid();    // warning: result discarded
```

Useful for functions where ignoring the result is almost always a bug.

### `[[deprecated]]`
```cpp
[[deprecated("Use new_function instead")]]
void old_function();
```

### `[[likely]]` / `[[unlikely]]` (C++20)
```cpp
if (rare_condition) [[unlikely]] {
    // hint to the compiler
}
```

Influences branch prediction / code layout. Minor effect; use only for measured perf wins.

### `std::filesystem::path` literals
```cpp
using namespace std::string_literals;
auto p = std::filesystem::path("data") / "file.txt"s;
```

### Variable templates (C++14)
```cpp
template<typename T>
constexpr T pi = T(3.14159265358979);

double d = pi<double>;
float f = pi<float>;
```

Most STL traits have `_v` versions: `std::is_integral_v<T>` instead of `std::is_integral<T>::value`.

### Type aliases over typedef
```cpp
// Old:
typedef std::vector<int> IntVec;

// Modern:
using IntVec = std::vector<int>;

// Templated:
template<typename T>
using Vec = std::vector<T>;
```

`using` is cleaner and supports templates.

### `enum class` over plain `enum`
```cpp
enum Color { Red, Green, Blue };       // OLD: pollutes namespace, implicit int conversion
enum class Color { Red, Green, Blue };   // MODERN: scoped, type-safe

Color c = Color::Red;
int n = c;                  // ERROR
int n = static_cast<int>(c); // explicit
```

### `nullptr` over `NULL`
```cpp
int* p = nullptr;     // type-safe
int* p2 = NULL;        // legacy; NULL is just (void*)0 or 0
```

### `override` and `final`
```cpp
class Derived : public Base {
public:
    void method() override;    // compile error if Base::method doesn't exist
};

class FinalClass final { ... };    // can't be inherited from

class Base {
public:
    virtual void method() final;    // can't be overridden
};
```

Catches mistakes; helps optimization.

### `using enum` (C++20)
Bring enum values into scope:
```cpp
enum class Color { Red, Green, Blue };

void f() {
    using enum Color;
    Color c = Red;     // no Color:: needed
}
```

### `std::span`, `std::string_view` — already covered in 06.
Use these for parameters when ownership isn't needed.

### Range-based for with init (C++20)
```cpp
for (auto v = compute(); auto x : v) {
    // v stays alive for the whole loop
}
```

### Class template argument deduction guides
```cpp
template<typename T>
struct Container {
    Container(std::initializer_list<T> l) { ... }
};

Container{1, 2, 3};    // deduces Container<int>
```

For more control, define explicit deduction guides.

---

That's the bulk of modern C++ features. The cumulative effect of these is huge — writing C++ in 2026 looks substantially different from writing it in 2010.

Quick "modern C++" checklist:
- Use `auto` for variable types.
- Use range-for over indexed loops.
- Use lambdas + STL algorithms over manual loops.
- Use smart pointers, never `new`/`delete`.
- Use `std::optional`, `std::expected` for fallible operations.
- Use `std::string`, `std::string_view`.
- Use `std::vector`, `std::unordered_map`.
- Use `enum class` over plain enum.
- Use `nullptr`, `override`, `final`, `noexcept`.
- Use `constexpr` where applicable.
- Use C++20 concepts to constrain templates.
- Use C++23 `std::print` / `std::expected` if available.

Next file: where C++ shines hardest — `12_game_engines_and_graphics.md`.
