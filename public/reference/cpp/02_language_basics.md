# 02. Language Basics

> Syntax, primitives, control flow, variables, references, and modern features (`auto`, structured bindings, range-for).

> This file assumes general programming experience. If you've used C, much will look familiar. The differences are in references, modern features, and the type system.

---

## Table of Contents

1. [Source File Anatomy](#1-source-file-anatomy)
2. [Primitives](#2-primitives)
3. [Variables and Initialization](#3-variables-and-initialization)
4. [`auto` and Type Inference](#4-auto-and-type-inference)
5. [Operators](#5-operators)
6. [Strings](#6-strings)
7. [Control Flow](#7-control-flow)
8. [Loops](#8-loops)
9. [Arrays and Containers](#9-arrays-and-containers)
10. [Functions](#10-functions)
11. [References vs Pointers (Preview)](#11-references-vs-pointers-preview)
12. [Namespaces](#12-namespaces)
13. [Comments](#13-comments)

---

## 1. Source File Anatomy

A typical C++ source file:

```cpp
// includes
#include <iostream>
#include <string>
#include <vector>

// namespace
namespace my_app {

// type declarations
struct User {
    std::string name;
    int age;
};

// function declarations / definitions
int compute(int x, int y) {
    return x + y;
}

}  // namespace my_app

// entry point
int main() {
    my_app::User u{"Alice", 30};
    std::cout << u.name << "\n";
    return 0;
}
```

Key parts:
- `#include` directives — bring in headers (text inclusion).
- Namespaces — group related code.
- Declarations and definitions — types, functions, variables.
- `int main()` — entry point. Returns exit code (0 = success).

### `using` declarations
Avoid typing `std::` everywhere:
```cpp
using std::cout;
using std::string;

cout << "hi";
string s = "hello";
```

Avoid `using namespace std;` at file scope in headers — it pollutes consumers' namespaces. In `.cpp` files at function scope, it's fine.

---

## 2. Primitives

| Type | Typical size | Notes |
|---|---|---|
| `bool` | 1 byte | `true` / `false` |
| `char` | 1 byte | Signed or unsigned (impl-defined) |
| `signed char` / `unsigned char` | 1 byte | Use for small numbers, not characters |
| `short` | 2 bytes | At least 16 bits |
| `int` | 4 bytes (typically) | At least 16 bits per standard |
| `long` | 4 or 8 bytes | At least 32 bits |
| `long long` | 8 bytes | At least 64 bits |
| `float` | 4 bytes | IEEE 754 single |
| `double` | 8 bytes | IEEE 754 double |
| `long double` | 8, 12, 16 bytes | Platform-dependent |

Sizes are minimums. Use fixed-width types when you need guarantees:

```cpp
#include <cstdint>

std::int8_t  a;     // exactly 8 bits
std::int16_t b;     // exactly 16 bits
std::int32_t c;     // exactly 32 bits
std::int64_t d;     // exactly 64 bits

std::uint32_t u;    // unsigned 32-bit
std::size_t  s;     // size_t, for sizes/indices
std::ptrdiff_t p;   // signed difference between pointers
```

### Literals
```cpp
int dec = 42;
int hex = 0x2A;
int oct = 052;
int bin = 0b101010;     // C++14+

long       l  = 100L;
long long  ll = 100LL;
unsigned   u  = 100U;
unsigned long long ull = 100ULL;

float  f  = 3.14f;
double d  = 3.14;

char  c = 'A';
auto  s = "hello";        // const char*, NOT std::string
auto  s2 = std::string{"hello"};

// Digit separators (C++14+)
int million = 1'000'000;
double pi = 3.14159'26535;
```

### Boolean
```cpp
bool ok = true;
bool nope = false;

// 0 is false, anything else is true
bool b = 5;     // true
bool b2 = 0;    // false
```

Don't write `if (x == true)`. Just `if (x)`.

### Character types
```cpp
char c = 'A';            // basic character
wchar_t w = L'A';         // wide character
char16_t u = u'A';        // UTF-16
char32_t v = U'A';        // UTF-32
char8_t b = u8'A';        // UTF-8 (C++20)
```

In modern code, prefer `std::string` (UTF-8) for text. `wchar_t` is mostly for Win32 API interop.

### Auto-promotion rules
```cpp
int    a = 10, b = 3;
double d = a / b;      // 3, not 3.333 — integer division!
double e = a / (double)b;  // 3.333...
```

Integer / integer = integer (truncated). Cast at least one operand.

### Overflow
```cpp
int x = INT_MAX;
int y = x + 1;     // undefined behavior for signed overflow!

unsigned int u = UINT_MAX;
unsigned int v = u + 1;   // defined: wraps to 0
```

Signed overflow is undefined behavior in C++. Unsigned wraps modulo 2^N. Be careful.

---

## 3. Variables and Initialization

C++ has multiple initialization syntaxes:

```cpp
int a;          // default-initialized (uninitialized for built-ins!)
int b = 5;       // copy-init
int c(5);        // direct-init
int d{5};        // brace-init (C++11+) — preferred for safety
int e = {5};     // copy-list-init

std::vector<int> v1;                // empty
std::vector<int> v2{1, 2, 3};        // 3 elements: 1, 2, 3
std::vector<int> v3(3, 5);            // 3 elements, all 5

std::string s1 = "hello";
std::string s2{"hello"};
std::string s3(5, 'a');               // "aaaaa"
```

### Always initialize
```cpp
int x;          // value is GARBAGE — undefined behavior to read
int y = 0;      // safe
int z{};        // value-initialized to 0
```

Reading uninitialized variables is undefined behavior. Use `{}` for default-construct-to-zero:
```cpp
int x{};                    // 0
double d{};                  // 0.0
bool b{};                    // false
std::string s{};             // empty
std::vector<int> v{};        // empty
```

### `const`
Immutable variable:
```cpp
const int max_size = 100;
const std::string greeting = "hi";

max_size = 200;   // ERROR
```

Mark everything `const` that doesn't need to change. Helps the compiler optimize and prevents bugs.

### `constexpr`
Compile-time constant:
```cpp
constexpr int max_size = 100;
constexpr double pi = 3.14159;

constexpr int square(int x) { return x * x; }
constexpr int n = square(5);   // computed at compile time
```

`constexpr` implies `const` and tells the compiler "this can be evaluated at compile time." Use for actual compile-time constants.

### `static` (at file scope)
```cpp
static int file_local = 0;   // visible only in this file
```

At file/namespace scope, `static` gives internal linkage (no external symbol).

### Scope
```cpp
{
    int x = 5;
    // x in scope
}
// x out of scope here

for (int i = 0; i < 10; i++) {
    // i in scope here
}
// i out of scope here
```

Block-scoped, like most languages.

---

## 4. `auto` and Type Inference

`auto` lets the compiler deduce the type from the initializer:

```cpp
auto x = 5;                 // int
auto pi = 3.14;              // double
auto s = std::string{"hi"};   // std::string
auto p = std::make_unique<int>(42);   // std::unique_ptr<int>

std::vector<int> v{1, 2, 3};
auto it = v.begin();          // std::vector<int>::iterator — clean!
```

### When `auto` shines
- Long type names: `std::vector<std::map<std::string, int>>::const_iterator`.
- Lambdas (their types are unnameable):
  ```cpp
  auto add = [](int a, int b) { return a + b; };
  ```
- Generic code where the exact type doesn't matter.

### When to skip `auto`
- When the type is short and clarifying: `int count = 0;` reads better than `auto count = 0`.
- When you specifically need a different type than the initializer:
  ```cpp
  long x = 5;        // explicit long
  auto y = 5;        // int, not long
  ```

### `auto&` and `const auto&`
References work too:
```cpp
std::vector<std::string> names{"Alice", "Bob"};

for (auto name : names) { /* COPY of each string */ }
for (auto& name : names) { /* reference — no copy, can modify */ }
for (const auto& name : names) { /* const reference — no copy, can't modify */ }
```

`const auto&` is the default loop pattern when you only want to read each element.

### Structured bindings (C++17+)
Destructure tuples, pairs, structs:
```cpp
std::pair<int, std::string> p{1, "one"};
auto [num, name] = p;
std::cout << num << " " << name;

std::map<std::string, int> m{{"a", 1}, {"b", 2}};
for (const auto& [key, value] : m) {
    std::cout << key << ": " << value << "\n";
}

struct Point { int x; int y; };
Point p2{3, 4};
auto [px, py] = p2;
```

Much cleaner than `p.first`, `p.second`, `m[key]`, etc.

### `decltype`
Get the type of an expression without evaluating it:
```cpp
int x = 5;
decltype(x) y = 10;     // int

auto f = [](int a, int b) { return a + b; };
decltype(f) g = f;
```

Useful in templates. Rarely needed in application code.

---

## 5. Operators

### Arithmetic
```cpp
+ - * / %    // basic
++ --        // increment / decrement (pre and post)

int a = 5, b = 3;
a + b;       // 8
a / b;       // 1 (integer division)
a % b;       // 2

a++;         // post-increment (returns old value)
++a;         // pre-increment (returns new value)
```

For most uses, `++a` and `a++` produce the same observable behavior; `++a` is slightly preferred (especially for non-primitives).

### Comparison
```cpp
== != < > <= >=

// C++20 three-way comparison ("spaceship")
auto cmp = (a <=> b);
if (cmp < 0) { /* a < b */ }
if (cmp > 0) { /* a > b */ }
if (cmp == 0) { /* a == b */ }
```

`<=>` returns a value indicating ordering. Compare to `0`.

### Logical
```cpp
&& || !       // short-circuit AND, OR, NOT

if (x > 0 && x < 100) { ... }
if (a || b) { ... }
```

### Bitwise
```cpp
& | ^ ~ << >>

int flags = 0b1010;
flags & 0b1000;     // 0b1000
flags | 0b0001;     // 0b1011
flags ^ 0b1111;     // 0b0101
~flags;              // bitwise NOT
flags << 2;          // shift left
flags >> 1;          // shift right
```

### Assignment + compound
```cpp
= += -= *= /= %=
&= |= ^=
<<= >>=
```

### Ternary
```cpp
int abs_val = (x < 0) ? -x : x;
```

Don't nest ternaries — quickly unreadable.

### Comma
```cpp
int a = (foo(), bar(), 42);    // evaluates foo, bar, then a = 42
```

Rarely used outside `for` loops.

### `sizeof`
```cpp
sizeof(int);             // 4 on most platforms
sizeof(double);          // 8
sizeof(MyClass);         // size of an instance

int arr[10];
sizeof(arr);             // 40 (10 ints)
sizeof(arr) / sizeof(arr[0]);  // 10 (array length)
```

`sizeof` is compile-time, no parens needed for variables: `sizeof x;`.

### `nullptr`
The null pointer constant. Use instead of `NULL` or `0`:
```cpp
int* p = nullptr;
if (p == nullptr) { ... }
```

`nullptr` is type-safe — `int x = nullptr` won't compile, where `int x = NULL` might.

---

## 6. Strings

### `std::string`
The standard string type. UTF-8 by convention (though it's really a byte sequence).

```cpp
#include <string>

std::string s = "hello";
std::string s2{"world"};
std::string s3(5, 'a');         // "aaaaa"

s.length();     // 5
s.size();       // same as length()
s.empty();
s[0];           // 'h'
s.at(0);        // 'h' — bounds-checked
s.front();      // 'h'
s.back();       // 'o'

s += " world";
s.append("!");
s.push_back('?');

s.substr(1, 3);          // "ell" — start, length
s.find("ll");             // 2 (position)
s.find("xx");             // std::string::npos (not found)
s.replace(0, 5, "HELLO");
s.starts_with("HELLO");   // C++20
s.ends_with("d");          // C++20
s.contains("ll");          // C++23

// Conversion
std::stoi("42");           // string → int
std::stod("3.14");          // → double
std::to_string(42);          // int → "42"

// Iteration
for (char c : s) { ... }
for (auto& c : s) { c = toupper(c); }
```

### `std::string_view` (C++17+)
A non-owning view of a string. Use for parameters that don't need to modify or own.

```cpp
#include <string_view>

void print(std::string_view sv) {
    std::cout << sv << "\n";
}

print("literal");           // no allocation
std::string s = "hello";
print(s);                    // no copy
print(std::string_view{s.data() + 1, 3});  // "ell" — view into part
```

`string_view` is cheap to pass; it's just a pointer + length. Don't outlive the string it views.

### Concatenation
```cpp
std::string a = "hello";
std::string b = " world";
std::string c = a + b;          // creates new string

a += b;                          // append to a

// Multiple concatenations: use std::stringstream or fmt
#include <sstream>
std::ostringstream oss;
oss << "x = " << x << ", y = " << y;
std::string result = oss.str();
```

### `std::format` (C++20)
```cpp
#include <format>

std::string s = std::format("x = {}, y = {:.2f}", 42, 3.14159);
// "x = 42, y = 3.14"

std::format("hex: {:x}, padded: {:>5}", 255, "hi");
// "hex: ff, padded:    hi"
```

`{}` is a placeholder; format spec after `:` controls width, precision, base, etc. Like Python's f-strings.

### Raw string literals
```cpp
std::string regex = R"(\d{3}-\d{4})";
std::string path = R"(C:\Users\Name\file.txt)";
std::string multi = R"(
line 1
line 2
)";

// Custom delimiter if string contains )"
std::string s = R"DELIM(contains )" inside)DELIM";
```

No backslash escaping inside `R"(...)"`.

### `const char*` (C-strings)
Old-style null-terminated strings:
```cpp
const char* s = "hello";
const char arr[] = "hello";       // 6 chars (incl. null terminator)
```

Use `std::string` / `std::string_view` for almost everything. C-strings only when interfacing with C APIs.

### `std::string` performance
- **Small string optimization (SSO)**: many implementations store short strings (up to ~15-22 chars) inline, no heap allocation.
- **Copying** is a deep copy. Use `string_view` for parameters when no ownership transfer is needed.
- **Move semantics** make string moves cheap.

---

## 7. Control Flow

### `if` / `else`
```cpp
if (condition) {
    // ...
} else if (other) {
    // ...
} else {
    // ...
}
```

Always use braces, even for single statements:
```cpp
if (x > 0)
    doStuff();       // works but error-prone

if (x > 0) {
    doStuff();
}
```

### `if` with initializer (C++17+)
```cpp
if (auto it = map.find(key); it != map.end()) {
    use(it->second);
}

if (int rc = call(); rc != 0) {
    handle_error(rc);
}
```

The variable is in scope for the `if` and `else` branches. Limits scope nicely.

### `if constexpr` (C++17+)
Compile-time `if`:
```cpp
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        // only compiled for integral types
        std::cout << "int: " << value << "\n";
    } else {
        std::cout << "other: " << value << "\n";
    }
}
```

The not-taken branch isn't compiled. Useful in templates.

### `switch`
```cpp
switch (value) {
    case 1:
        do_one();
        break;
    case 2:
    case 3:
        do_two_or_three();
        break;
    default:
        do_other();
}
```

`break` is required or cases fall through (a source of bugs). Use `[[fallthrough]]` to mark intentional fallthrough:
```cpp
case 1:
    setup();
    [[fallthrough]];
case 2:
    handle();
    break;
```

### Limitations of switch
- Can only switch on integers, enums, and a few other constant types — not strings or objects.
- For string dispatch, use `if`/`else` chains or `std::unordered_map<std::string, std::function<...>>`.

C++ doesn't (yet) have a pattern-matching switch like Rust/Java. There's a proposal (`inspect`) for the future.

---

## 8. Loops

### Range-for (C++11+)
The default for traversing collections:
```cpp
std::vector<int> nums{1, 2, 3, 4, 5};

for (int n : nums) {
    std::cout << n << "\n";
}

for (auto& n : nums) {
    n *= 2;          // mutate
}

for (const auto& n : nums) {
    // read-only access (efficient for non-trivial types)
}
```

### Classic `for`
```cpp
for (int i = 0; i < 10; ++i) {
    std::cout << i << "\n";
}

// Iterating with index
for (std::size_t i = 0; i < v.size(); ++i) {
    std::cout << i << ": " << v[i] << "\n";
}
```

### `while`
```cpp
while (!queue.empty()) {
    auto item = queue.front();
    queue.pop();
    process(item);
}
```

### `do ... while`
```cpp
int input;
do {
    std::cin >> input;
} while (input < 0);
```

Runs at least once.

### `break` and `continue`
```cpp
for (int n : nums) {
    if (n < 0) continue;     // skip negatives
    if (n > 100) break;       // stop processing
    process(n);
}
```

### Labeled break / continue
C++ doesn't have these. Use a flag or extract into a function with early return:
```cpp
bool found = false;
for (int i = 0; i < n && !found; ++i) {
    for (int j = 0; j < n && !found; ++j) {
        if (matches(i, j)) {
            found = true;
        }
    }
}
```

Or:
```cpp
auto search = [&]() -> std::optional<std::pair<int, int>> {
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            if (matches(i, j)) return std::pair{i, j};
        }
    }
    return std::nullopt;
};
```

### Algorithm calls vs loops
For many tasks, `<algorithm>` is clearer:
```cpp
auto it = std::find(v.begin(), v.end(), target);
auto count = std::count_if(v.begin(), v.end(), [](int n) { return n > 0; });

// C++20 ranges
auto count2 = std::ranges::count_if(v, [](int n) { return n > 0; });
```

Covered in `07_stl_algorithms_and_ranges.md`.

---

## 9. Arrays and Containers

### C-style arrays
```cpp
int arr[5] = {1, 2, 3, 4, 5};
int arr2[5] = {};          // zero-initialized
int arr3[]  = {1, 2, 3};   // size deduced

arr[0];           // 1
sizeof(arr) / sizeof(arr[0]);   // 5

// Multi-dimensional
int grid[3][4] = {};
grid[1][2] = 5;
```

C-style arrays decay to pointers when passed to functions. Avoid for new code.

### `std::array<T, N>` (C++11+)
Fixed-size array, with the niceties of a container:
```cpp
#include <array>

std::array<int, 5> arr{1, 2, 3, 4, 5};
arr.size();         // 5
arr[0];             // 1
arr.at(0);          // bounds-checked

for (int n : arr) { ... }

// Knows its size; doesn't decay
void process(std::array<int, 5> a);
```

### `std::vector<T>`
Dynamic array. The default container.

```cpp
#include <vector>

std::vector<int> v;
v.push_back(1);
v.push_back(2);
v.push_back(3);

std::vector<int> v2{1, 2, 3};
std::vector<int> v3(10, 0);   // 10 elements, all 0

v.size();
v.empty();
v[0];                    // unchecked
v.at(0);                  // bounds-checked
v.front();
v.back();
v.pop_back();

v.clear();
v.reserve(100);           // pre-allocate capacity (no constructions)
v.resize(50);             // change size

for (int n : v) { ... }
```

Covered fully in `06_stl_containers.md`.

### Strings as character sequences
```cpp
std::string s = "hello";
s[0];        // 'h'
s.size();     // 5

for (char c : s) { ... }
```

---

## 10. Functions

```cpp
int add(int a, int b) {
    return a + b;
}

double divide(double a, double b = 1.0) {  // default argument
    return a / b;
}

// No return value
void greet(const std::string& name) {
    std::cout << "Hello, " << name << "\n";
}
```

### Calling
```cpp
int sum = add(2, 3);
double d = divide(10);          // b defaults to 1.0
double e = divide(10, 4);
greet("Alice");
```

### Function declaration vs definition
For multi-file projects:
```cpp
// header.hpp — declaration
int add(int a, int b);

// source.cpp — definition
int add(int a, int b) { return a + b; }
```

Declaration introduces the name and signature; definition provides the body. Multiple translation units can use a function declared in a header but defined once.

### Overloading
Same name, different parameters:
```cpp
int max(int a, int b) { return a > b ? a : b; }
double max(double a, double b) { return a > b ? a : b; }
int max(int a, int b, int c) { return max(max(a, b), c); }
```

The compiler picks based on argument types.

### Default arguments
```cpp
void connect(const std::string& host, int port = 8080, int timeout = 5000);

connect("example.com");
connect("example.com", 9090);
connect("example.com", 9090, 10000);
```

Only trailing parameters can have defaults.

### Pass by value vs reference
```cpp
void by_value(std::string s);             // copies — modify doesn't affect caller
void by_const_ref(const std::string& s);  // no copy, read-only
void by_ref(std::string& s);              // no copy, can modify caller's value
void by_rvalue_ref(std::string&& s);      // move semantics — covered later
```

Rules of thumb:
- Trivial types (`int`, `bool`, `double`, pointers): pass by value.
- "Big" types (strings, vectors, custom classes): pass by `const T&` for read-only.
- Pass by `T&` to mutate caller's value.
- Pass by value when you'll copy/move it anyway (sink parameters).

### Return values
```cpp
std::vector<int> get_data() {
    return {1, 2, 3, 4, 5};   // efficient — RVO / NRVO eliminates copy
}

auto data = get_data();        // typically no copy
```

C++ has Return Value Optimization (RVO) — returning a temporary or named local often doesn't copy.

### Trailing return type
```cpp
auto add(int a, int b) -> int {
    return a + b;
}
```

Useful when the return type depends on parameters (templates):
```cpp
template<typename T, typename U>
auto add(T a, U b) -> decltype(a + b) {
    return a + b;
}
```

### Lambdas
```cpp
auto greet = [](const std::string& name) {
    return "Hello, " + name;
};

auto sum = [](int a, int b) -> int { return a + b; };

// Capture
int multiplier = 3;
auto times = [multiplier](int x) { return x * multiplier; };
auto times_ref = [&multiplier](int x) { return x * multiplier; };  // by ref
```

Covered in `11_modern_cpp_features.md`.

### `[[nodiscard]]`
Warn if return value is ignored:
```cpp
[[nodiscard]] bool save_file();

save_file();   // warning — return value ignored
```

Use for functions where ignoring the result is a likely bug.

---

## 11. References vs Pointers (Preview)

### Reference (`T&`)
An alias for an existing object:
```cpp
int x = 5;
int& r = x;        // r refers to x
r = 10;             // x is now 10

int& r2;            // ERROR — references must be initialized
r = other_x;        // does NOT rebind r; assigns other_x's value to x
```

References:
- Must be initialized at declaration.
- Can't be rebound to refer to a different object.
- Can't be null (unlike pointers).

### Pointer (`T*`)
A variable holding a memory address:
```cpp
int x = 5;
int* p = &x;        // p points to x
*p = 10;             // x is now 10
p = nullptr;         // p points to nothing

int* p2 = nullptr;   // null pointer
if (p) { /* p is non-null */ }
```

### When to use which
- **References** for non-null parameters that won't be reassigned.
- **Pointers** when null is meaningful or you need to point to different objects.
- **Smart pointers** (`unique_ptr`, `shared_ptr`) for ownership.

Covered in detail in `03_pointers_and_memory.md`.

---

## 12. Namespaces

Avoid name collisions; group related code.

```cpp
namespace my_app {

class User { /* ... */ };
int compute(int x) { /* ... */ }

namespace util {
    void helper() { /* ... */ }
}

}  // namespace my_app

// Use
my_app::User u;
my_app::compute(5);
my_app::util::helper();
```

### `using` declarations
```cpp
using my_app::User;
using my_app::compute;

User u;                  // OK now
int n = compute(5);
```

### `namespace` aliases
```cpp
namespace fs = std::filesystem;
fs::path p = "/tmp/file.txt";
```

### Anonymous namespaces
For file-local declarations:
```cpp
namespace {
    int local_counter = 0;
    void file_helper() { /* only visible in this file */ }
}
```

Equivalent to `static` at file scope. Preferred in C++.

### Don't pollute global scope
```cpp
// In a header: BAD
using namespace std;       // pollutes everywhere this header is included

// In a .cpp file: OK (limited to that file)
using namespace std;
```

Better:
```cpp
using std::vector;
using std::string;
```

Or just type `std::` — it's not that bad.

---

## 13. Comments

```cpp
// Single-line comment

/* Multi-line
   comment */

/* Inline */ int x = 5;
```

### Doxygen-style comments
For API documentation:
```cpp
/**
 * Adds two integers.
 * 
 * @param a first operand
 * @param b second operand
 * @return sum of a and b
 * @throws std::overflow_error on overflow
 */
int add(int a, int b);
```

Or `///` lines:
```cpp
/// Adds two integers.
/// @param a first operand
int add(int a, int b);
```

Doxygen generates HTML / PDF docs from these. Less common than Javadoc but used in some C++ projects.

### When to comment
- **Why**, not what: `// Adjust for daylight saving` not `// add an hour`.
- Non-obvious choices: `// Use std::deque to avoid invalidating iterators on push_front`.
- Public API documentation.

Don't comment what the code obviously does.

---

That's the basic language surface. Next, the most important and trickiest topic: pointers, references, ownership, and memory — `03_pointers_and_memory.md`.
