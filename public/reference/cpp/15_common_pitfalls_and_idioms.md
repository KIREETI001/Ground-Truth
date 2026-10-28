# 15. Common Pitfalls and Idioms

A curated reference of bugs every C++ developer hits at least once, and the idioms that prevent them. Skim this when something is breaking and you don't know why.

This isn't exhaustive — entire books cover C++ pitfalls. These are the ones that come up most often in real code, organized so you can find them.

---

## Table of Contents

1. [Undefined Behavior](#undefined-behavior)
2. [Object Lifetime Bugs](#object-lifetime-bugs)
3. [Initialization Pitfalls](#initialization-pitfalls)
4. [Copy/Move Pitfalls](#copymove-pitfalls)
5. [Pointer and Reference Pitfalls](#pointer-and-reference-pitfalls)
6. [Container Pitfalls](#container-pitfalls)
7. [Integer and Arithmetic Pitfalls](#integer-and-arithmetic-pitfalls)
8. [String Pitfalls](#string-pitfalls)
9. [Inheritance Pitfalls](#inheritance-pitfalls)
10. [Template Pitfalls](#template-pitfalls)
11. [Concurrency Pitfalls](#concurrency-pitfalls)
12. [Build and Linkage Pitfalls](#build-and-linkage-pitfalls)
13. [Modern C++ Idioms Reference](#modern-c-idioms-reference)

---

## Undefined Behavior

The category that makes C++ uniquely dangerous. "Undefined behavior" (UB) means the compiler is allowed to do anything — crash, silently corrupt data, time-travel optimizations that change unrelated code.

### Common sources of UB

- Reading uninitialized variables.
- Out-of-bounds array access.
- Use-after-free.
- Signed integer overflow.
- Null pointer dereference.
- Calling a virtual function on a partially-constructed/destructed object.
- Data races.
- Modifying a `const` object.
- Returning a reference to a local.
- Strict aliasing violations (reinterpret_cast then access).

### Why it's worse than "just a crash"

The compiler assumes UB doesn't happen. Code like this:

```cpp
int* p = nullptr;
if (p) *p = 5;     // never null-derefs
*p = 5;             // UB
```

The compiler may eliminate the `if` check because the unconditional `*p = 5` "proves" `p` is non-null — and so the bug becomes a null deref *and* removes your safety check. UB doesn't stay localized.

### The mitigation

- Compile with sanitizers in development (ASan + UBSan).
- Compile with all warnings (`-Wall -Wextra`).
- Initialize variables.
- Use bounds-checked accessors when you're unsure (`.at()` not `[]`).

### A common shock

```cpp
int main() {
    int x;       // uninitialized
    std::cout << x;
}
```

In debug builds, this often prints zero or some recognizable garbage. In release, it might print anything, crash, or — worst case — appear to work, then explode on a different machine.

Always initialize: `int x = 0;` or `int x{};`.

---

## Object Lifetime Bugs

### Returning a reference to a local

```cpp
const std::string& bad() {
    std::string local = "hello";
    return local;  // local destroyed at return; reference dangles
}

const auto& s = bad();
std::cout << s;  // UB
```

Fix: return by value.

```cpp
std::string good() {
    std::string local = "hello";
    return local;  // moved or NRVO'd
}
```

### Returning a reference to a temporary

```cpp
const std::string& temp_ref(int n) {
    return std::to_string(n);  // returns a reference to a temporary that's about to die
}
```

Compilers often warn. Doesn't catch the more subtle:

```cpp
std::string_view sv = std::string("hello").substr(0, 3);
// std::string is destroyed; sv dangles
```

`string_view` (and `span`) don't extend lifetime. Be careful what they point into.

### Dangling references in range-for

```cpp
for (auto x : returns_temporary().container()) {
    // returns_temporary() is destroyed before the loop starts? No.
    // The temporary lives for the full statement, including the loop. Safe.
}

for (auto x : returns_temporary().get_reference()) {
    // returns_temporary() destroyed at end of full expression.
    // get_reference() returns a reference into the now-destroyed object.
    // The range-for sees a dangling reference. UB.
}
```

C++23 added "lifetime extension" for some cases of range-for. Pre-C++23, write:

```cpp
auto temp = returns_temporary();
for (auto x : temp.get_reference()) { ... }
```

### Dangling captures in lambdas

```cpp
std::function<int()> make_counter() {
    int count = 0;
    return [&count]() { return ++count; };  // count destroyed; lambda holds reference
}

auto counter = make_counter();
counter();  // UB
```

Capture by value:

```cpp
return [count]() mutable { return ++count; };
```

### `shared_ptr` cycles

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::shared_ptr<Node> prev;
};

auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->prev = a;
// Cycle: a refs b, b refs a. Neither ever drops to 0 refcount. Memory leak.
```

Use `std::weak_ptr` to break cycles:

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> prev;
};
```

---

## Initialization Pitfalls

### Most vexing parse

```cpp
struct Foo {};

Foo f();    // declares a FUNCTION named f that returns Foo. Not what you want.
Foo f{};    // creates a default-constructed Foo. What you want.
Foo f;      // creates a default-constructed Foo. Also works.
```

The first form is C++'s most famous gotcha. Use `{}` initialization to avoid it.

```cpp
std::vector<int> v(10);     // vector of 10 default-constructed ints
std::vector<int> v{10};     // vector containing one element: 10
```

Brace initialization treats single-element braced lists specially in some contexts. Both forms are useful; know which is which.

### Uninitialized members

```cpp
struct Point {
    int x;  // not initialized in default constructor
    int y;
};

Point p;  // x and y have garbage values
```

Fix with default member initializers:

```cpp
struct Point {
    int x = 0;
    int y = 0;
};
```

Or always initialize via constructor.

### Static initialization order fiasco

Global / static variables defined in different translation units have unspecified initialization order between TUs. If one global depends on another in a different TU, you get UB.

```cpp
// foo.cpp
extern int bar;
int foo = bar + 1;  // UB if bar isn't initialized yet

// bar.cpp
int bar = 42;
```

Workarounds:
- Use the "construct on first use" idiom (function-local statics):

```cpp
int& get_bar() {
    static int bar = 42;  // initialized on first call, thread-safe since C++11
    return bar;
}
```

- Just don't depend on cross-TU global initialization.

### `auto` deduction surprises

```cpp
auto x = {1, 2, 3};  // std::initializer_list<int>, not std::vector<int>

const int n = 5;
auto m = n;          // m is int, not const int. auto strips top-level const.
auto& m2 = n;        // m2 is const int&.

std::vector<int> v = {1, 2, 3};
for (auto x : v) ...   // copies each element
for (auto& x : v) ...  // references each element
```

When in doubt, write the type out.

---

## Copy/Move Pitfalls

### Forgetting to mark move constructors `noexcept`

```cpp
struct Widget {
    std::vector<int> data;
    Widget(Widget&&) {  // not noexcept
        // ...
    }
};

std::vector<Widget> v;
v.push_back(Widget{});
v.push_back(Widget{});  // grows: COPIES (not moves) all elements, because move isn't noexcept
```

`std::vector` only moves on resize if the move constructor is `noexcept`. Otherwise it falls back to copying for strong exception safety. Mark moves `noexcept`:

```cpp
Widget(Widget&&) noexcept { ... }
```

### Self-assignment in move

```cpp
Widget& operator=(Widget&& other) noexcept {
    data = std::move(other.data);  // self-move? data assigned from itself?
    return *this;
}

Widget w;
w = std::move(w);  // self-move; behavior depends on member operators
```

Most standard library types handle self-move correctly (post-move state is valid). For your own types, either guarantee correct behavior or document "no self-move."

### `std::move` on a const

```cpp
const std::string s = "hello";
auto t = std::move(s);  // doesn't move; copies. Move requires non-const.
```

`std::move` casts to rvalue reference, but a `const T&&` can't move from. Compilers don't always warn.

### Moving out of a member of a function parameter

```cpp
void process(const Widget& w) {
    auto local = std::move(w.data);  // doesn't move; w is const
}
```

To enable move, take the parameter by value or by rvalue reference.

### Move-only types in collections

`std::unique_ptr` is move-only. Vectors of them work fine, but you can't copy them:

```cpp
std::vector<std::unique_ptr<Widget>> v;
v.push_back(std::make_unique<Widget>());

std::vector<std::unique_ptr<Widget>> v2 = v;  // error: can't copy
std::vector<std::unique_ptr<Widget>> v2 = std::move(v);  // OK
```

### Returning `std::move` of a local

```cpp
Widget make() {
    Widget w;
    return std::move(w);  // BAD: prevents NRVO
}

Widget make() {
    Widget w;
    return w;  // GOOD: NRVO elides the copy entirely (or moves if NRVO can't apply)
}
```

Returning a named local already gets RVO/NRVO treatment. Explicit `std::move` *disables* this optimization.

---

## Pointer and Reference Pitfalls

### Mixing `new`/`delete` with `new[]`/`delete[]`

```cpp
int* p = new int[100];
delete p;       // UB. Should be delete[].

int* q = new int;
delete[] q;     // UB. Should be delete.
```

Modern C++: don't use `new`/`delete` directly. Use `std::vector` for arrays, `std::unique_ptr` / `std::make_unique` for single objects.

### `unique_ptr` doesn't know array vs single

```cpp
std::unique_ptr<int> p(new int[100]);  // bug: deletes as single
std::unique_ptr<int[]> p(new int[100]);  // correct
```

Use `std::vector` instead unless you have a specific reason for array-typed unique_ptr.

### Null deref through method call

```cpp
Widget* w = get_widget();  // may return null
w->process();              // UB if null
```

Always check (or design so that it can't be null — return a reference or `std::optional`).

### Pointer to member function syntax

```cpp
class Widget {
    void process();
};

void (Widget::*fn)() = &Widget::process;
Widget w;
(w.*fn)();           // call member function via pointer

Widget* wp = &w;
(wp->*fn)();         // through pointer
```

Awkward but occasionally necessary.

### Iterator invalidation

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};
auto it = v.begin();
v.push_back(6);  // may reallocate; it is now invalid
*it;             // UB
```

Each container has its own invalidation rules. Look them up. For `std::vector`, any operation that grows can invalidate all iterators/references/pointers.

`std::list` is more forgiving (most operations don't invalidate). `std::deque` invalidates iterators on push_back/push_front but not references.

### Modifying a container during iteration

```cpp
for (auto it = v.begin(); it != v.end(); ++it) {
    if (*it < 0) v.erase(it);  // it is now invalid
}
```

Use the erase-return idiom:

```cpp
for (auto it = v.begin(); it != v.end();) {
    if (*it < 0) it = v.erase(it);  // erase returns the next valid iterator
    else ++it;
}
```

Or `std::erase_if` (C++20):

```cpp
std::erase_if(v, [](int x) { return x < 0; });
```

---

## Container Pitfalls

### `std::map::operator[]` creates entries

```cpp
std::map<std::string, int> m = {{"a", 1}, {"b", 2}};
if (m["c"] == 0) {  // creates "c" → 0 entry!
    // ...
}
```

`operator[]` default-constructs and returns a reference. Use `find` or `contains` (C++20) for lookups:

```cpp
if (auto it = m.find("c"); it != m.end()) { ... }
if (m.contains("c")) { ... }
```

### `vector<bool>` is special

`std::vector<bool>` is NOT a vector of bools. It's a bit-packed specialization. Most issues:

- `auto& b = v[0];` gives a proxy reference, not a `bool&`.
- Can't pass `&v[0]` to functions expecting `bool*`.
- Iteration semantics differ.

Use `std::vector<char>`, `std::vector<uint8_t>`, `std::deque<bool>`, or `std::bitset<N>` for fixed sizes.

### `unordered_map` with custom types

```cpp
struct Point { int x, y; };

std::unordered_map<Point, int> m;  // error: no hash function for Point
```

Provide a specialization:

```cpp
template<>
struct std::hash<Point> {
    size_t operator()(const Point& p) const noexcept {
        return std::hash<int>{}(p.x) ^ (std::hash<int>{}(p.y) << 1);
    }
};
```

And `operator==` for the type. Or use a `std::map` (only needs `<`).

### `at()` vs `[]`

```cpp
std::vector<int> v = {1, 2, 3};
v[10];      // UB (out of bounds)
v.at(10);   // throws std::out_of_range
```

`.at()` is slower but safe. In hot loops, you know indices are valid. In other code, `.at()` catches bugs.

### `front()` / `back()` on empty containers

```cpp
std::vector<int> v;
v.front();  // UB
v.back();   // UB
```

Always check `empty()` first.

---

## Integer and Arithmetic Pitfalls

### Signed overflow is UB

```cpp
int x = INT_MAX;
x = x + 1;  // UB
```

Unsigned overflow is well-defined (wraps modulo 2^N). Signed isn't.

Detect with `-fsanitize=undefined` or use `__builtin_add_overflow` / `<numeric>`'s saturating ops (C++26).

### Integer division truncates

```cpp
double x = 7 / 2;       // x = 3.0 (integer division)
double y = 7 / 2.0;     // y = 3.5
```

Use floating-point operands or explicit casts.

### Mixing signed and unsigned

```cpp
int i = -1;
unsigned int u = 1;
if (i < u) { ... }      // FALSE: i converted to unsigned, becomes huge
```

The compiler usually warns. Prefer signed integers for arithmetic; use unsigned for bit fields and modular arithmetic only. (Counter to STL's choice of `size_t`, but the Core Guidelines recommend signed.)

### Implicit narrowing

```cpp
int x = 5.7;            // x = 5, no warning by default
int y{5.7};             // error: narrowing in brace init
```

Brace initialization catches narrowing. Use it.

### Floating-point equality

```cpp
double x = 0.1 + 0.2;
if (x == 0.3) ...       // probably false
```

Compare with tolerance:

```cpp
if (std::abs(x - 0.3) < 1e-9) ...
```

For more rigorous comparisons, look up "ULP comparison" or use a library.

---

## String Pitfalls

### `const char*` lifetime

```cpp
const char* get_message() {
    std::string s = "hello";
    return s.c_str();  // s destroyed; pointer dangles
}
```

Return `std::string` by value, or take a `string_view`.

### `string_view` of a temporary

```cpp
std::string_view sv = get_string();  // returns std::string by value
// sv points into the temporary, which is destroyed at end of statement
std::cout << sv;  // UB
```

Either hold a `std::string` directly or ensure the source outlives the view.

### Concatenation perf

```cpp
std::string s;
for (int i = 0; i < 1000; ++i) {
    s = s + ", " + std::to_string(i);  // creates many temporaries
}
```

Use `+=` (often optimized) or `std::ostringstream` or `std::format` (C++20):

```cpp
std::string s;
s.reserve(estimated_size);
for (int i = 0; i < 1000; ++i) {
    s += ", ";
    s += std::to_string(i);
}
```

### `printf` formatting bugs

```cpp
int x = 5;
printf("%s", x);  // UB: %s expects char*, got int
```

C++20's `std::format` is type-safe:

```cpp
std::cout << std::format("{}", x);  // works for any printable type
```

Use `std::format` or `std::print` (C++23). `printf` and friends only when interfacing with C code.

### Character vs byte

`std::string` holds bytes. For Unicode, this is "fine" for UTF-8 strings as long as you don't try to index character-by-character. `s[3]` gets the 4th byte, not the 4th codepoint.

For real Unicode handling, use a library: ICU, `std::u8string` + UTF-8 utilities, or wait for C++26's improvements.

---

## Inheritance Pitfalls

### Slicing

```cpp
class Base { virtual void f() {} };
class Derived : public Base { void f() override {} };

void take(Base b) { b.f(); }  // takes by value

Derived d;
take(d);  // slices: only Base part copied, calls Base::f
```

Take base classes by reference or pointer:

```cpp
void take(const Base& b) { b.f(); }
void take(Base& b) { b.f(); }
void take(Base* b) { b->f(); }
```

### Virtual call in constructor/destructor

```cpp
class Base {
public:
    Base() { f(); }    // calls Base::f even if Derived overrides
    virtual void f() {}
};

class Derived : public Base {
public:
    void f() override { /* uses uninitialized members */ }
};

Derived d;  // calls Base::f, NOT Derived::f
```

During construction, the dynamic type is the class currently being constructed. Virtual dispatch resolves to that class.

Don't call virtual functions from constructors or destructors. If you need polymorphism at construction, redesign.

### Missing virtual destructor

```cpp
class Base { };  // no virtual destructor
class Derived : public Base {
    std::vector<int> data;
};

Base* p = new Derived;
delete p;  // UB: Derived's destructor doesn't run; data leaks
```

If a class is intended for polymorphic use, the destructor must be virtual:

```cpp
class Base {
public:
    virtual ~Base() = default;
};
```

If a class is NOT for polymorphic use (no virtual functions), don't make the destructor virtual.

### Diamond inheritance

```cpp
class A { };
class B : public A { };
class C : public A { };
class D : public B, public C { };
// D has TWO A subobjects
```

Use virtual inheritance (`class B : public virtual A`) to share. But honestly, redesign to avoid diamonds.

### Public inheritance is "is-a"

Don't use public inheritance unless `Derived` truly *is* a `Base` and satisfies LSP (Liskov Substitution). Use composition for "has-a" relationships.

---

## Template Pitfalls

### Templates must be in headers (mostly)

```cpp
// foo.h
template<typename T>
T add(T a, T b);

// foo.cpp
template<typename T>
T add(T a, T b) { return a + b; }

// main.cpp
#include "foo.h"
int x = add(1, 2);  // linker error: template not instantiated
```

Templates are instantiated where they're used. The compiler needs to see the definition at the point of use. Either:

- Put the definition in the header.
- Explicitly instantiate the template in the .cpp file for the types you'll use.

### Two-phase name lookup

```cpp
template<typename T>
struct Base { int x; };

template<typename T>
struct Derived : Base<T> {
    void f() { return x; }       // error: x not found
    void f() { return this->x; } // OK
    void f() { return Base<T>::x; } // OK
};
```

In templates, names that don't depend on the template parameter are looked up at definition time, not instantiation. `x` in the base class depends on `T`, so you need `this->x` or `Base<T>::x` to delay lookup to instantiation.

### `typename` for dependent type names

```cpp
template<typename T>
void f() {
    T::nested_type x;          // error: ambiguous (is nested_type a type or a value?)
    typename T::nested_type x; // OK: explicitly a type
}
```

Required pre-C++20 in most dependent contexts. C++20 made this optional in some places.

### Cryptic template errors

A template error in `std::vector<MyClass>` can produce a 50-screen error. Read from the top — the first error is usually the real one; the rest are cascading.

C++20 concepts give much better errors:

```cpp
template<std::integral T>
T add(T a, T b) { return a + b; }

add("hello", "world");  // error: "hello" doesn't satisfy std::integral
```

Way better than "no operator+ found in expansion of std::__cxxlib::basic_string..."

---

## Concurrency Pitfalls

### Data races

```cpp
int counter = 0;

void worker() {
    for (int i = 0; i < 1000; ++i) counter++;
}

std::thread t1(worker);
std::thread t2(worker);
t1.join();
t2.join();
std::cout << counter;  // probably not 2000; data race; UB
```

Use `std::atomic<int>` or a mutex.

### Mutex order leads to deadlock

```cpp
std::mutex m1, m2;

void f1() {
    std::lock_guard l1(m1);
    std::lock_guard l2(m2);  // can deadlock with f2
}

void f2() {
    std::lock_guard l1(m2);
    std::lock_guard l2(m1);  // can deadlock with f1
}
```

Lock multiple mutexes consistently or use `std::scoped_lock` (C++17), which uses deadlock-avoidance.

```cpp
void f1() {
    std::scoped_lock locks(m1, m2);  // locks both, deadlock-free
}
```

### Forgetting to join

```cpp
void f() {
    std::thread t(work);
    // forgot to join or detach
}  // t destructor calls std::terminate if not joined/detached
```

Either join, detach, or use `std::jthread` (C++20), which auto-joins.

### Returning a future doesn't run the task

```cpp
auto f = std::async(std::launch::async, work);
// task starts running
// vs
auto f = std::async(std::launch::deferred, work);
// task runs when f.get() is called
// vs
auto f = std::async(work);  // implementation chooses; usually deferred
```

Be explicit about the launch policy. `std::launch::async` to actually run on a separate thread.

### `async`'s deferred future blocks on destruction

```cpp
{
    auto f = std::async(std::launch::async, slow_task);
    // f goes out of scope here; destructor BLOCKS waiting for task to finish
}
```

This is surprising. The future returned by `std::async` waits for the task on destruction. For fire-and-forget, you need a different mechanism.

### Spurious wakeups in condition variables

```cpp
std::condition_variable cv;
std::mutex m;
bool ready = false;

void wait() {
    std::unique_lock lock(m);
    cv.wait(lock);  // BAD: can wake up spuriously
    process();      // may run when ready is still false
}

void signal() {
    {
        std::lock_guard lock(m);
        ready = true;
    }
    cv.notify_one();
}
```

Always wait with a predicate:

```cpp
cv.wait(lock, [&]{ return ready; });  // GOOD: handles spurious wakeup
```

---

## Build and Linkage Pitfalls

### Multiple definitions

```cpp
// header.h
int counter = 0;  // BAD: defines counter; every TU including this gets its own / linker error

// main.cpp
#include "header.h"

// other.cpp
#include "header.h"
// Linker: multiple definitions of counter
```

Either declare in header, define in one cpp:

```cpp
// header.h
extern int counter;

// header.cpp
int counter = 0;
```

Or use `inline` (C++17):

```cpp
// header.h
inline int counter = 0;  // OK: linker merges definitions
```

### ODR (One Definition Rule)

A given entity must have exactly one definition across the program. Templates and inline functions are exceptions (multiple identical definitions allowed).

Subtle ODR violations include:
- Same class defined differently in different TUs (e.g., different field order due to conditional compilation).
- Function with same name defined differently in different TUs.

ODR violations are UB and rarely caught — they cause crashes far from the bug. Be careful with macros, conditional compilation, and copy-pasted code.

### Forgetting `extern "C"` for C interop

```cpp
// header.h (in a C library)
int do_thing(int x);

// in C++ code
#include "header.h"
int x = do_thing(5);  // linker error: name-mangling mismatch
```

C++ name-mangles function names; C doesn't. Wrap C headers:

```cpp
extern "C" {
    #include "header.h"
}
```

Most well-designed C libraries do this internally with `#ifdef __cplusplus`.

### Static initialization order across TUs

Already covered above. The fix is "construct on first use":

```cpp
SomeType& get_instance() {
    static SomeType instance;
    return instance;
}
```

---

## Modern C++ Idioms Reference

### RAII

The most important C++ idiom. Resource Acquisition Is Initialization: tie resource lifetime to object lifetime.

```cpp
{
    std::lock_guard lock(mutex);   // mutex locked
    // do work
}  // mutex automatically unlocked

{
    std::ifstream file("data.txt");  // file opened
    // read
}  // file automatically closed

{
    auto ptr = std::make_unique<Widget>();  // heap allocation
}  // automatic deletion
```

Always prefer RAII over manual cleanup or `try`/`finally` patterns.

### Rule of zero

If your class manages no resources directly, you don't need to define destructors, copy/move constructors, or assignment operators. Default behavior is correct.

```cpp
class Good {
    std::string name;          // manages own memory
    std::vector<int> data;     // manages own memory
    std::unique_ptr<Foo> foo;  // manages own memory
    // No need to define ~Good, Good(const Good&), etc.
};
```

If you must manage a raw resource, follow the rule of five: define all of destructor, copy ctor, copy assign, move ctor, move assign. Or better: wrap the resource in a RAII type and go back to rule of zero.

### Prefer `std::make_unique` and `std::make_shared`

```cpp
// BAD: bare new
std::unique_ptr<Widget> p(new Widget);

// GOOD: make_unique
auto p = std::make_unique<Widget>();
```

`make_*` are exception-safe and avoid one allocation for `shared_ptr` (combined control block + object).

### `auto` for obvious types

```cpp
auto it = container.begin();   // type is verbose; auto wins
auto p = std::make_unique<Widget>();
auto lambda = [](int x) { return x * 2; };

// Explicit for clarity:
int count = 0;
std::string name = "hello";
```

### Range-based `for`

```cpp
for (const auto& item : container) { ... }   // read-only, no copy
for (auto& item : container) { ... }         // modifiable
for (auto item : container) { ... }          // copy each; usually OK for cheap types
```

### Structured bindings (C++17)

```cpp
std::map<std::string, int> m;
for (const auto& [key, value] : m) {
    std::cout << key << ": " << value << "\n";
}

auto [iter, inserted] = m.insert({"key", 42});
```

### `std::optional`, `std::variant`, `std::expected` for sum types

```cpp
std::optional<int> find(int key);
if (auto result = find(42); result.has_value()) {
    std::cout << *result;
}

std::expected<Value, Error> parse(const std::string& s);
```

Replaces sentinel values, output parameters, and many uses of exceptions.

### Const-correctness

```cpp
class Widget {
public:
    int size() const;          // doesn't modify *this
    void resize(int n);        // does modify
    
    int value() const { return value_; }
    
private:
    int value_;
};

void process(const Widget& w);  // doesn't modify w; can be called with const Widget
```

Mark everything `const` that doesn't need to mutate. It's free documentation and lets the compiler optimize.

### `noexcept` on moves

```cpp
class Widget {
public:
    Widget(Widget&&) noexcept = default;
    Widget& operator=(Widget&&) noexcept = default;
};
```

Required for `std::vector::resize` to move instead of copy. Free perf.

### Pass parameters by reference (or `string_view`/`span`)

```cpp
void process(const std::string& s);      // const ref: no copy, no mutation
void process(std::string_view sv);       // also works for const char* literals
void process(std::span<const int> data); // accepts vector, array, raw arrays
```

Pass small types (`int`, `double`, pointers) by value; big types by `const&` or view.

### Use `enum class` not `enum`

```cpp
enum class Color { Red, Green, Blue };  // scoped, type-safe
Color c = Color::Red;

enum OldColor { Red, Green, Blue };  // pollutes namespace, implicit int conversion
```

### `nullptr` not `NULL`

```cpp
int* p = nullptr;       // type-safe
int* p = NULL;          // legacy; NULL is a macro for 0
int* p = 0;             // legacy; works but ambiguous
```

### Use `<chrono>` for time

```cpp
using namespace std::chrono_literals;

auto duration = 5s;       // 5 seconds
auto ms = 100ms;          // 100 milliseconds
std::this_thread::sleep_for(2s);
```

Don't pass raw `int` seconds around.

### Use algorithms instead of loops

```cpp
// Manual loop
int count = 0;
for (auto x : v) if (x > 0) ++count;

// Algorithm
auto count = std::count_if(v.begin(), v.end(), [](int x) { return x > 0; });

// C++20 ranges
auto count = std::ranges::count_if(v, [](int x) { return x > 0; });
```

Clearer intent, often the same performance, sometimes faster (better vectorization).

### Use `[[nodiscard]]` for return values that shouldn't be ignored

```cpp
[[nodiscard]] bool initialize();

initialize();  // warning: return value ignored

if (initialize()) { ... }  // OK
```

Useful for "did the operation succeed?" returns and factory functions.

### `final` on classes not meant for inheritance

```cpp
class Widget final { ... };  // can't be inherited
```

Helps the compiler optimize and prevents accidental inheritance.

### Avoid raw `new` and `delete`

Use smart pointers and containers. The only time you write `new` in modern C++ is when implementing a custom allocator or container.

---

## Last word

This file is a starting reference. Real C++ expertise comes from writing and reviewing a lot of C++. The patterns repeat: someone forgets to make a destructor virtual, someone returns a reference to a local, someone has a data race they "didn't see how" was possible.

Sanitizers and tests catch most of these in development, which is why the previous file emphasized them so heavily. The language itself won't save you.

What modern C++ does give you:

- RAII makes resource management automatic.
- Smart pointers eliminate most ownership bugs.
- Move semantics make value types efficient.
- Concepts make templates approachable.
- Ranges make algorithms expressive.
- `std::format`, `std::expected`, `std::print`, `std::span` close ergonomic gaps.

The language has been steadily improving. C++ in 2026 is much more pleasant — and safer — than C++ in 2010. Use the modern features, lean on the tooling, and write tests.

---

That's the end of the C++ reference library. Next folder: SQL — focused, practical, dialect-aware coverage for analytics and application work.
