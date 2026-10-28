# 05. Templates and Generics

> Function templates, class templates, concepts (C++20), variadic templates, and a careful look at template syntax.

> Templates are how C++ does generics, but they're more than Java/C# generics. They're compile-time code generation — separate copies are produced for each instantiation.

---

## Table of Contents

1. [Why Templates](#1-why-templates)
2. [Function Templates](#2-function-templates)
3. [Class Templates](#3-class-templates)
4. [Concepts (C++20) — Constraining Templates](#4-concepts-c20--constraining-templates)
5. [Variadic Templates](#5-variadic-templates)
6. [Template Specialization](#6-template-specialization)
7. [Type Traits](#7-type-traits)
8. [`auto` and Type Deduction](#8-auto-and-type-deduction)
9. [Compile Errors and Sanity](#9-compile-errors-and-sanity)
10. [Practical Patterns](#10-practical-patterns)

---

## 1. Why Templates

Without templates, you'd write `int max(int, int)`, `double max(double, double)`, `string max(string, string)` — endlessly. Templates let you write one definition:

```cpp
template<typename T>
T max_of(T a, T b) {
    return (a > b) ? a : b;
}
```

The compiler generates a specific version for each type you actually use:
```cpp
int x = max_of(3, 5);          // generates max_of<int>
double d = max_of(1.5, 2.5);    // generates max_of<double>
```

### Templates vs Java generics
- **Java generics**: type erasure. One bytecode for all type parameters. Lose type info at runtime.
- **C++ templates**: code generation. Each instantiation is a separate compiled function. No runtime overhead — sometimes more code (binary bloat).

Trade-offs:
- C++ templates can use any operation valid for the type (`+`, `<`, etc.) — Java can't.
- C++ template errors are notoriously verbose (failed instantiations cascade).
- C++ templates are duck-typed at compile time.

---

## 2. Function Templates

```cpp
template<typename T>
T add(T a, T b) {
    return a + b;
}

int main() {
    auto x = add(3, 5);          // T = int
    auto y = add(1.5, 2.5);       // T = double
    auto s = add(std::string("hi"), std::string(" there"));   // T = std::string
}
```

`typename` and `class` are interchangeable here. `typename` is more modern.

### Explicit type
```cpp
auto x = add<double>(3, 5);    // forces T = double; 3 and 5 converted
```

Useful when arguments don't determine T uniquely, or you want a specific instantiation.

### Multiple type parameters
```cpp
template<typename T, typename U>
auto multiply(T a, U b) {
    return a * b;
}

multiply(3, 1.5);    // T=int, U=double; returns double
```

### Trailing return type
For complex inference:
```cpp
template<typename T, typename U>
auto add(T a, U b) -> decltype(a + b) {
    return a + b;
}
```

C++14+: `auto` alone usually works.

### Non-type template parameters
Constant values, not types:
```cpp
template<typename T, int N>
class Array {
    T data[N];
public:
    int size() const { return N; }
};

Array<int, 10> arr;     // 10-element array of int
```

Non-type params can be:
- Integral types (`int`, `size_t`).
- Pointers / references.
- Some other compile-time-known values (C++20: more types allowed, like floats, classes).

### Template parameter packs (variadic) — see section 5.

---

## 3. Class Templates

```cpp
template<typename T>
class Stack {
private:
    std::vector<T> data;
public:
    void push(const T& value) { data.push_back(value); }
    
    T pop() {
        T value = data.back();
        data.pop_back();
        return value;
    }
    
    bool empty() const { return data.empty(); }
    size_t size() const { return data.size(); }
};

Stack<int> ints;
Stack<std::string> strings;
ints.push(42);
strings.push("hello");
```

Every method becomes a template implicitly.

### Defining methods outside the class
```cpp
template<typename T>
class Stack {
public:
    void push(const T& value);
};

template<typename T>
void Stack<T>::push(const T& value) {
    data.push_back(value);
}
```

The `template<typename T>` repeats. Inside the body, refer to the class as `Stack<T>` (in the qualifier).

### Templates must be visible at use sites
Templates aren't compiled standalone — they're compiled when instantiated. This means:
- **Definitions go in headers** (`.h` / `.hpp`).
- Or you use explicit instantiation (advanced).

```cpp
// stack.hpp — both declaration and definition
template<typename T>
class Stack { ... };

// Don't try to put Stack<T>::push() in a .cpp file unless you explicitly instantiate.
```

This is why many C++ libraries are "header-only" — templates demand it.

### Class template argument deduction (CTAD, C++17)
```cpp
std::vector<int> v1 = {1, 2, 3};       // pre-C++17 style
std::vector v2 = {1, 2, 3};             // CTAD: deduces vector<int>
std::pair p{1, "hello"};                  // pair<int, const char*>
```

Reduces verbosity.

---

## 4. Concepts (C++20) — Constraining Templates

Before concepts, templates accepted any type — but compilation would fail deep inside if the operations didn't exist. Errors were cryptic.

Concepts let you constrain what types are allowed:

```cpp
#include <concepts>

template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template<Addable T>
T sum(T a, T b) {
    return a + b;
}

sum(3, 5);      // OK
sum("a"s, "b"s);   // OK if string + string is well-formed
// sum(MyType{}, MyType{});   // ERROR: clear message — MyType doesn't satisfy Addable
```

### Built-in concepts (`<concepts>`)
- `std::integral`, `std::floating_point`.
- `std::same_as<T, U>`.
- `std::convertible_to<From, To>`.
- `std::equality_comparable<T>`.
- `std::totally_ordered<T>`.
- `std::invocable<F, Args...>` — F can be called with Args.
- `std::default_initializable`, `std::copyable`, `std::movable`.

### Defining a concept
```cpp
template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template<Numeric T>
T abs_value(T x) {
    return x < 0 ? -x : x;
}
```

### `requires` expressions
Check operations are valid:
```cpp
template<typename T>
concept Container = requires(T c) {
    c.begin();
    c.end();
    c.size();
    typename T::value_type;     // T has a nested type 'value_type'
};
```

### Constraining in different syntaxes
```cpp
// Template constraint (concise)
template<std::integral T>
void f(T x) { ... }

// Trailing requires clause
template<typename T>
void f(T x) requires std::integral<T> { ... }

// Abbreviated function template (C++20)
void f(std::integral auto x) { ... }
```

All equivalent. The abbreviated form is briefest for simple cases.

### Why concepts matter
1. **Better error messages**: "T doesn't satisfy concept X" beats "no operator+ found at line 4127 in xtree.h".
2. **Documentation**: function signatures clearly express what types are accepted.
3. **Overloading**: you can have different versions for different concepts:

```cpp
template<std::integral T> void process(T x) { /* integer version */ }
template<std::floating_point T> void process(T x) { /* float version */ }
```

In 2026, with C++20 widely available, concepts should be your default for new template code.

---

## 5. Variadic Templates

Templates with an arbitrary number of parameters:

```cpp
template<typename... Args>
void print(Args... args) {
    // ...
}
```

`Args` is a "parameter pack" — zero or more types. `args` is a "function parameter pack" — zero or more values.

### Fold expressions (C++17)
The simplest way to use a pack:
```cpp
template<typename... Args>
auto sum(Args... args) {
    return (args + ...);    // unary right fold: ((arg1 + arg2) + arg3) + ...
}

sum(1, 2, 3, 4, 5);    // 15
sum(1.5, 2.5);          // 4.0
```

Other folds:
```cpp
(args + ...)              // unary right: a1 + (a2 + (a3 + ...))
(... + args)              // unary left:  ((... + a3) + a2) + a1
(args + ... + 0)          // binary right with init
(0 + ... + args)          // binary left with init
```

### Printing
```cpp
template<typename... Args>
void print(Args... args) {
    ((std::cout << args << " "), ...);    // fold over comma
    std::cout << "\n";
}

print(1, "hello", 3.14, 'X');
```

### Recursive variadic templates (pre-C++17 style, still seen)
```cpp
void print() {}    // base case

template<typename T, typename... Rest>
void print(T first, Rest... rest) {
    std::cout << first << " ";
    print(rest...);     // recurse with the rest
}
```

`Rest...` "unpacks" the pack. Each call peels off one argument.

### Forwarding
```cpp
template<typename... Args>
auto make_thing(Args&&... args) {
    return std::make_unique<Thing>(std::forward<Args>(args)...);
}
```

`std::forward<Args>(args)...` is the idiom — preserves value categories (lvalue/rvalue) of each argument.

### Use cases
- `std::tuple<T...>`, `std::variant<T...>` — type-safe heterogeneous collections.
- `std::make_unique`, `std::make_shared`, container `emplace*` — perfect forwarding to constructors.
- printf-replacement functions like `std::format`.

### `if constexpr` (C++17)
Compile-time branching, often used with templates:
```cpp
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        // integer-specific code
    } else if constexpr (std::is_floating_point_v<T>) {
        // float-specific code
    } else {
        // generic
    }
}
```

Only the matching branch is compiled. Unlike normal `if`, the discarded branches don't need to be valid for the type.

---

## 6. Template Specialization

Provide a specific implementation for a particular type.

### Full specialization
```cpp
template<typename T>
struct TypeName {
    static const char* get() { return "unknown"; }
};

template<>
struct TypeName<int> {
    static const char* get() { return "int"; }
};

template<>
struct TypeName<double> {
    static const char* get() { return "double"; }
};

TypeName<int>::get();        // "int"
TypeName<std::string>::get();  // "unknown"
```

### Partial specialization (classes only)
```cpp
template<typename T, typename U>
struct Pair { ... };

template<typename T>
struct Pair<T, T> {       // both types the same
    // specialized
};

template<typename T>
struct Pair<T*, T*> {     // both are pointers to same type
    // specialized
};
```

Functions don't support partial specialization — use overloading instead.

### When to specialize
- Type-specific optimizations.
- Edge cases the generic version doesn't handle.
- Implementing traits.

Specialization is powerful but easy to overuse. Prefer overloading or `if constexpr` when possible.

---

## 7. Type Traits

`<type_traits>` provides compile-time introspection.

### Checking types
```cpp
#include <type_traits>

std::is_integral<int>::value;        // true
std::is_floating_point_v<double>;     // true (C++17 _v shortcut)
std::is_pointer_v<int*>;              // true
std::is_const_v<const int>;            // true
std::is_array_v<int[10]>;              // true

std::is_same_v<int, int>;               // true
std::is_same_v<int, long>;               // false

std::is_base_of_v<Animal, Dog>;          // true (if Dog : Animal)
```

### Modifying types
```cpp
std::remove_const_t<const int>;          // int
std::remove_reference_t<int&>;            // int
std::remove_pointer_t<int*>;              // int
std::add_const_t<int>;                    // const int
std::decay_t<const int&>;                 // int (the "decay" you'd get from passing by value)
std::common_type_t<int, double>;          // double
```

### Using in templates
```cpp
template<typename T>
void f(T value) {
    static_assert(std::is_arithmetic_v<T>, "T must be a number");
    // ...
}
```

`static_assert` produces a compile error if the condition fails.

### In `if constexpr`
```cpp
template<typename T>
void describe(T x) {
    if constexpr (std::is_pointer_v<T>) {
        std::cout << "pointer to " << *x;
    } else {
        std::cout << "value " << x;
    }
}
```

Concepts have largely superseded raw type traits for constraining templates, but traits are still useful for queries and transformations.

---

## 8. `auto` and Type Deduction

`auto` deduces a type from an initializer.

```cpp
auto x = 42;             // int
auto y = 3.14;            // double
auto s = "hello";         // const char*
auto t = "hello"s;        // std::string (with std::literals)
auto v = std::vector<int>{1, 2, 3};   // vector<int>
```

### `auto` in loops
```cpp
for (auto x : vec) { ... }           // x is a copy
for (auto& x : vec) { ... }           // x is a reference (mutable)
for (const auto& x : vec) { ... }     // x is const ref (no copy, no mutation)
```

`const auto&` is a sensible default for read-only iteration over non-trivial types.

### `decltype`
Gets the declared type of an expression without evaluating it:
```cpp
int x = 5;
decltype(x) y = 10;          // y is int

decltype(x + 1.0) z = 0;     // z is double

template<typename T, typename U>
auto multiply(T a, U b) -> decltype(a * b) {
    return a * b;
}
```

`decltype(auto)` (C++14+) — `auto` deduction but preserves references and cv-qualifiers:
```cpp
const int x = 5;
auto a = x;              // a is int (not const)
decltype(auto) b = x;     // b is const int
```

### Type deduction rules
`auto` follows function template parameter deduction:
- `auto` strips references and top-level cv-qualifiers.
- `auto&` and `auto&&` preserve them.

```cpp
int& f();
auto x = f();      // int (not int&)
auto& y = f();      // int&
```

### Universal references / forwarding references
`auto&&` or `T&&` in template context can bind to anything:
```cpp
template<typename T>
void g(T&& param) { ... }

g(42);                // T = int, param is int&&
int x = 5;
g(x);                  // T = int&, param collapses to int& (lvalue ref)
```

Used with `std::forward` for perfect forwarding.

---

## 9. Compile Errors and Sanity

Template errors are notoriously bad. Tips for survival:

### Read the first error
The compiler cascades. Errors 5-50 are usually fallout from error 1. Fix the first one and recompile.

### Use concepts (C++20)
Constraints catch errors at the call site with clear messages instead of deep in instantiation.

### Use `static_assert` for friendly errors
```cpp
template<typename T>
class Container {
    static_assert(std::is_copy_constructible_v<T>,
                  "Container requires copy-constructible types");
    // ...
};
```

### Compiler flags
Modern compilers have flags to improve template diagnostics:
```bash
# GCC
g++ -fdiagnostics-show-template-tree -ftemplate-backtrace-limit=10

# Clang has the best template errors by default
clang++ -ftemplate-backtrace-limit=10
```

Clang is generally easier to debug template errors with than GCC. MSVC also has good messages now.

### Don't go template-crazy
Templates are a tool, not the default. Many functions don't need them. Prefer regular code, reach for templates when the use case demands it.

### Smaller template instantiations
Each unique instantiation produces code. If you have `template<int N>` and use it with 100 different `N`s, you get 100 copies of the code. For things that don't truly depend on the type, extract a non-template helper.

---

## 10. Practical Patterns

### Type-safe container of "any" type
```cpp
std::variant<int, double, std::string> v;
v = 42;
v = 3.14;
v = "hello"s;

// Visit (pattern-match on the active type)
std::visit([](auto&& arg) {
    std::cout << arg << "\n";
}, v);
```

### Optional value
```cpp
std::optional<User> find_user(int id) {
    if (auto it = users.find(id); it != users.end()) {
        return it->second;
    }
    return std::nullopt;
}

if (auto user = find_user(42)) {
    std::cout << user->name;
}
```

### Tuple
```cpp
std::tuple<int, std::string, double> t{42, "hello", 3.14};

auto [num, name, value] = t;     // structured binding (C++17)
```

### Generic algorithm
```cpp
template<typename Container, typename Predicate>
auto count_if_custom(const Container& c, Predicate pred) {
    int count = 0;
    for (const auto& elem : c) {
        if (pred(elem)) count++;
    }
    return count;
}

auto evens = count_if_custom(vec, [](int x) { return x % 2 == 0; });
```

In real code, use `std::count_if` — but the pattern shows template + functor.

### Factory with perfect forwarding
```cpp
template<typename T, typename... Args>
std::unique_ptr<T> make(Args&&... args) {
    return std::make_unique<T>(std::forward<Args>(args)...);
}

auto u = make<User>("Alice", 30);    // forwards "Alice" and 30 to User constructor
```

### Compile-time conditional code with `if constexpr`
```cpp
template<typename T>
std::string serialize(T value) {
    if constexpr (std::is_arithmetic_v<T>) {
        return std::to_string(value);
    } else if constexpr (std::is_same_v<T, std::string>) {
        return value;
    } else {
        return value.to_string();    // assume T has a to_string method
    }
}
```

### CRTP (Curiously Recurring Template Pattern)
A class inherits from a template instantiated with itself. Used for static polymorphism:
```cpp
template<typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !(static_cast<const Derived&>(*this) == other);
    }
};

class MyClass : public Comparable<MyClass> {
public:
    bool operator==(const MyClass& other) const { /* ... */ }
};
```

`MyClass` automatically gets `operator!=` defined in terms of `operator==`. No virtual call overhead. Modern alternatives: defaulted comparison operators (C++20).

### Tag dispatch (older pattern)
Use type tags to select overloads. Largely replaced by `if constexpr` and concepts, but you'll see it in old code.

### SFINAE — "Substitution Failure Is Not An Error"
The basis of pre-concepts constraints. If template substitution produces an invalid type, the compiler picks a different overload instead of failing.

```cpp
// Pre-concepts (C++17 style)
template<typename T, typename = std::enable_if_t<std::is_integral_v<T>>>
void f(T value) { /* integer version */ }
```

Concepts (C++20) replace this for new code. Recognize SFINAE in legacy code; don't write new SFINAE.

---

That's templates. Together with the STL (next file), they're the language's mechanism for generic programming. Concepts (C++20) make templates pleasant to write and use; they're the headline feature for generic code in modern C++.

Next: the data structures every C++ program uses — `06_stl_containers.md`.
