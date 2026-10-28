# 03. Pointers, References & Memory

> The heart of C++. Raw pointers, references, smart pointers, RAII, and ownership semantics. Get this right or write buggy code forever.

> Modern C++ minimizes raw pointer use. Smart pointers and references cover most needs. Raw pointers are mainly for non-owning observation.

---

## Table of Contents

1. [Memory Model — Stack and Heap](#1-memory-model--stack-and-heap)
2. [Raw Pointers](#2-raw-pointers)
3. [References](#3-references)
4. [`new` and `delete` (Don't Use)](#4-new-and-delete-dont-use)
5. [RAII](#5-raii)
6. [`std::unique_ptr`](#6-stdunique_ptr)
7. [`std::shared_ptr`](#7-stdshared_ptr)
8. [`std::weak_ptr`](#8-stdweak_ptr)
9. [Ownership Patterns](#9-ownership-patterns)
10. [Common Memory Bugs](#10-common-memory-bugs)

---

## 1. Memory Model — Stack and Heap

C++ programs use two main memory regions:

### Stack
- LIFO data structure for function calls.
- Local variables live here.
- Cleaned up automatically when function returns.
- Fast allocation/deallocation (just bump a pointer).
- Limited size (typically a few MB).

```cpp
void foo() {
    int x = 5;                    // stack
    std::vector<int> v{1, 2, 3};   // v itself on stack; v's data on heap
    // x and v destroyed automatically on return
}
```

### Heap (free store)
- Dynamically allocated memory.
- Must be explicitly freed (or use smart pointers / RAII).
- Slower allocation than stack.
- Large size (typically gigabytes available).

```cpp
int* p = new int{5};      // allocated on heap
// ... use *p ...
delete p;                   // must explicitly free!
```

In modern C++, you almost never write `new` / `delete` directly. Use smart pointers or containers (which manage heap memory internally).

### Other regions
- **Globals / statics**: live for program duration.
- **Code segment**: read-only, contains executable.
- **Thread-local**: per-thread storage (`thread_local`).

---

## 2. Raw Pointers

A pointer holds a memory address.

```cpp
int x = 5;
int* p = &x;        // p holds address of x

*p;                  // 5 (dereference)
*p = 10;             // x is now 10

p = nullptr;         // p points to nothing
```

### Operators
- `&x` — address-of x.
- `*p` — dereference (the value pointed to).
- `p->member` — equivalent to `(*p).member`.

### Pointer arithmetic
```cpp
int arr[5] = {1, 2, 3, 4, 5};
int* p = arr;        // points to arr[0]
*p;                   // 1
*(p + 1);             // 2
p++;                   // now points to arr[1]
*p;                    // 2
```

Adding `n` to a `T*` advances by `n * sizeof(T)` bytes. Useful but dangerous (no bounds check).

### `nullptr`
```cpp
int* p = nullptr;
if (p == nullptr) { ... }
if (!p) { ... }            // also OK

int* p2;                    // UNINITIALIZED — random address, dangerous!
```

Always initialize pointers (to `nullptr` if nothing better).

### Const correctness
```cpp
int x = 5;
const int* p1 = &x;          // pointer to const int (can't modify *p1)
int* const p2 = &x;          // const pointer to int (can't change p2, can modify *p2)
const int* const p3 = &x;    // const pointer to const int

// Read right-to-left:
// "const int*" = "pointer to const int"
// "int* const" = "const pointer to int"
```

Most useful:
- `const T*` for parameters where you read but don't modify.
- `T* const` is rare — variables don't usually need to be const-pointers.

### When to use raw pointers
- **Non-owning observation**: "I want to look at this object but don't own it."
- **Interfacing with C APIs**.
- **Optional non-owning references**: when null is meaningful.
- **Inside data structures** (linked lists, trees) where you've considered ownership.

**Not** for ownership in modern C++. Use smart pointers.

### `T*` vs `T&`
```cpp
void by_ptr(int* p);        // p can be null
void by_ref(int& r);         // r refers to a real object

int x = 5;
by_ptr(&x);                  // pass address
by_ref(x);                    // pass directly
```

Use references when null is meaningless. Pointers when it might be.

---

## 3. References

A reference is an alias for an existing object. After binding, it can't be rebound.

```cpp
int x = 5;
int& r = x;        // r is an alias for x
r = 10;             // x is now 10
int y = r;          // y is 10 (copy of x's current value)
r = y;              // assigns y's value to x (NOT rebinding!)
```

### Must be initialized
```cpp
int& r;            // ERROR
int& r = x;         // OK
```

### Can't be null
```cpp
int& r = *(int*)nullptr;   // ub — technically allowed to write but immediately undefined behavior to use
```

References are safer than pointers in this regard.

### `const T&` — the workhorse parameter type
```cpp
void print(const std::string& s) {
    std::cout << s;
}

print("hello");
std::string str = "world";
print(str);
```

`const T&` accepts both lvalues and rvalues without copying. Use for read-only "big" parameters.

### Lvalue vs rvalue references
- `T&` — lvalue reference: binds to "lvalues" (named objects).
- `T&&` — rvalue reference: binds to "rvalues" (temporaries).

```cpp
void f(int& r);       // takes lvalue
void f(int&& r);      // takes rvalue (temporary)

int x = 5;
f(x);                  // calls first overload
f(42);                 // calls second overload (42 is a temporary)
```

Rvalue references enable **move semantics** — transferring ownership of resources cheaply. Covered in `11_modern_cpp_features.md`.

### Don't return references to locals
```cpp
int& bad() {
    int x = 5;
    return x;        // DANGLING — x destroyed at function end
}
```

Returns a reference to a destroyed object. Undefined behavior.

```cpp
int& better(int& x) {
    return x;        // OK — x lives in caller's scope
}
```

### Don't capture references in async contexts
```cpp
std::vector<int> v{1, 2, 3};
std::thread t([&v]() { use(v); });   // OK only if v outlives t
```

References + lifetimes is one of the trickiest things in C++. Smart pointers help.

---

## 4. `new` and `delete` (Don't Use)

The C++ way of manual heap allocation:

```cpp
int* p = new int{5};       // allocate, initialize to 5
delete p;                    // free

int* arr = new int[10]{};   // allocate array
delete[] arr;                 // must use delete[] for arrays
```

### Why "don't use"
- **Easy to leak**: forgetting `delete`, exceptions skipping `delete`.
- **Easy to double-free**: deleting twice = corruption.
- **Easy to dangle**: using after delete.
- **Easy to mix up**: `delete` vs `delete[]`.

Use smart pointers or containers instead:

```cpp
auto p = std::make_unique<int>(5);     // RAII, freed automatically
std::vector<int> v(10);                  // heap-backed, freed when v destroyed
```

You should rarely write `new` in modern C++. The exceptions:
- Implementing your own container or smart pointer.
- Specific perf scenarios with custom allocators.
- Interfacing with legacy code.

For 99% of application code: smart pointers and containers.

### `new` is also slower
Heap allocation has overhead. Many small `new` calls in a hot loop is a perf antipattern.

---

## 5. RAII

**Resource Acquisition Is Initialization** — the most important pattern in C++.

The idea: tie resource ownership to an object's lifetime. The constructor acquires the resource; the destructor releases it.

```cpp
class FileHandle {
    std::FILE* file_;
public:
    FileHandle(const char* path) : file_(std::fopen(path, "r")) {
        if (!file_) throw std::runtime_error("Can't open file");
    }
    
    ~FileHandle() {
        if (file_) std::fclose(file_);
    }
    
    // Prevent copy (would double-close)
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
};

void process() {
    FileHandle f("data.txt");
    // ... use f ...
}   // f destroyed here, file closed automatically
```

### Why RAII matters
- **Automatic cleanup**: works even if exceptions thrown.
- **No leaks**: as long as the owning object is destroyed, the resource is freed.
- **Deterministic**: cleanup happens at scope exit, predictably.

Compare with Java: `try` / `finally` or try-with-resources. Same goal, less elegant syntax.

RAII applies to:
- Memory (smart pointers).
- File handles, sockets, locks, threads.
- Database connections.
- Any "something that needs cleanup."

The standard library uses RAII everywhere. Your own classes should too.

---

## 6. `std::unique_ptr`

A smart pointer that owns its object exclusively. When it's destroyed, the object is destroyed.

```cpp
#include <memory>

std::unique_ptr<int> p1 = std::make_unique<int>(42);
std::cout << *p1;       // 42
p1->some_method();       // arrow access

// p1 owns the int. When p1 goes out of scope, the int is freed.
```

### `make_unique` vs raw `new`
Use `std::make_unique` (C++14+). Doesn't require typing the type twice, exception-safe:
```cpp
auto p = std::make_unique<MyClass>(arg1, arg2);   // preferred

std::unique_ptr<MyClass> p2(new MyClass(arg1, arg2));   // older, works but verbose
```

### Move-only
`unique_ptr` is move-only (can't be copied):
```cpp
std::unique_ptr<int> p1 = std::make_unique<int>(42);
std::unique_ptr<int> p2 = p1;             // ERROR — can't copy
std::unique_ptr<int> p3 = std::move(p1);  // OK — transfers ownership; p1 now null
```

`std::move` is how you transfer ownership.

### Functions taking `unique_ptr`
```cpp
void take_ownership(std::unique_ptr<int> p) {
    // p owns the int now
}

auto p = std::make_unique<int>(42);
take_ownership(std::move(p));
// p is now null
```

To "borrow" without taking ownership, pass a reference or raw pointer:
```cpp
void inspect(const int& x);          // by reference
void inspect_ptr(const int* p);      // by pointer (may be null)

inspect(*p);
inspect_ptr(p.get());                // .get() returns raw pointer
```

### Returning `unique_ptr`
```cpp
std::unique_ptr<Widget> create_widget() {
    return std::make_unique<Widget>();   // transferred to caller
}

auto w = create_widget();
```

Common pattern for factory functions.

### `unique_ptr` with arrays
```cpp
std::unique_ptr<int[]> arr = std::make_unique<int[]>(10);
arr[0] = 1;
arr[5] = 5;

// But prefer std::vector for dynamic arrays.
```

### Custom deleters
```cpp
auto file_deleter = [](FILE* f) { if (f) std::fclose(f); };
std::unique_ptr<FILE, decltype(file_deleter)> f(std::fopen("data.txt", "r"), file_deleter);
```

Useful for wrapping C resources.

### `unique_ptr` semantics summary
- **Owns** one object exclusively.
- **Move-only**: transferred via `std::move`.
- **Zero overhead**: same size as a raw pointer; deletes in destructor.
- **Default smart pointer**: use `unique_ptr` unless you specifically need shared ownership.

---

## 7. `std::shared_ptr`

A reference-counted smart pointer. Multiple `shared_ptr`s can co-own an object; the object is destroyed when the last one is gone.

```cpp
auto p1 = std::make_shared<int>(42);    // count = 1
{
    auto p2 = p1;                        // count = 2
    auto p3 = p1;                        // count = 3
}                                         // p2, p3 destroyed; count = 1
// p1 still owns; will destroy int when p1 destroyed
```

### `make_shared` vs `new`
```cpp
auto p = std::make_shared<MyClass>(args);   // preferred — one allocation
std::shared_ptr<MyClass> p2(new MyClass());   // two allocations (object + control block)
```

`make_shared` allocates the object and control block together — faster, less memory.

Exception: if you need a custom deleter, use the constructor.

### When to use
- **Multiple owners genuinely**: cache that holds objects, multiple subscribers, etc.
- **Cyclic data structures** (with `weak_ptr` to break cycles).
- **Async contexts** where multiple callbacks reference the same object.

### Overhead
- **Atomic reference counting**: each copy/destroy is an atomic op. Adds overhead.
- **Larger than `unique_ptr`**: contains pointer + control block reference.

Don't use `shared_ptr` where `unique_ptr` would do. Single ownership is simpler and faster.

### Thread safety
- The reference count is thread-safe (atomic).
- The pointed-to object is **not** automatically thread-safe — concurrent reads/writes still need synchronization.

### Cycles
```cpp
struct Node {
    std::shared_ptr<Node> next;
};

auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->next = a;   // cycle! Reference count never reaches 0.
```

Both nodes leak. Break cycles with `weak_ptr`.

### `shared_ptr<T>` to `this`
If a class needs to share `shared_ptr`s to itself (e.g., for callbacks):
```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    std::shared_ptr<Widget> get_self() {
        return shared_from_this();   // creates shared_ptr that shares count with original
    }
};

auto w = std::make_shared<Widget>();
auto self = w->get_self();   // shares ownership with w
```

`shared_from_this()` only works if the object is already managed by a `shared_ptr`. Calling it on a stack-allocated object throws.

---

## 8. `std::weak_ptr`

A non-owning observer of a `shared_ptr`. Doesn't extend the object's lifetime but knows when the object is gone.

```cpp
auto sp = std::make_shared<int>(42);
std::weak_ptr<int> wp = sp;

if (auto locked = wp.lock()) {     // try to obtain shared_ptr
    std::cout << *locked;            // 42
} else {
    std::cout << "expired\n";
}

sp.reset();                          // shared_ptr gone, int destroyed
auto locked = wp.lock();             // returns null shared_ptr
```

### Use cases

**Breaking cycles**:
```cpp
struct Node {
    std::shared_ptr<Node> child;
    std::weak_ptr<Node> parent;     // doesn't extend parent's lifetime
};
```

**Caches**:
```cpp
std::unordered_map<std::string, std::weak_ptr<Resource>> cache;

std::shared_ptr<Resource> get(const std::string& key) {
    auto it = cache.find(key);
    if (it != cache.end()) {
        if (auto sp = it->second.lock()) return sp;
    }
    
    auto sp = load_resource(key);
    cache[key] = sp;
    return sp;
}
```

Cache doesn't keep resources alive; they live as long as someone else holds them.

**Observer patterns**:
```cpp
class Observer {
    std::weak_ptr<Subject> subject_;
public:
    void notify() {
        if (auto s = subject_.lock()) s->update();
        // If subject is gone, do nothing
    }
};
```

### `weak_ptr` doesn't dereference directly
You must call `.lock()` to get a `shared_ptr` first.

---

## 9. Ownership Patterns

### Single owner, transfer of ownership
```cpp
std::unique_ptr<Resource> resource;

void give_away() {
    auto temp = std::move(resource);
    other.take(std::move(temp));
}
```

### Single owner, multiple observers
```cpp
class Manager {
    std::unique_ptr<Resource> resource_;       // owner
public:
    Resource& get() { return *resource_; }     // observers get a reference
    Resource* try_get() { return resource_.get(); }  // or pointer if null possible
};
```

### Shared ownership
```cpp
auto resource = std::make_shared<Resource>();
list1.push_back(resource);
list2.push_back(resource);
// Both lists co-own. Resource destroyed when both clear it.
```

### Borrow (function parameter)
```cpp
void process(const Resource& r);        // doesn't take ownership
void process_or_skip(const Resource* r); // may be null
```

### Sink (function takes ownership)
```cpp
void take(std::unique_ptr<Resource> r);

take(std::move(resource));    // explicit move
```

### Producer (function gives ownership)
```cpp
std::unique_ptr<Resource> create();
```

### Decision tree: which to use
1. **Function parameter**:
   - Reads, doesn't take ownership → `const T&`.
   - Modifies caller's value, doesn't take ownership → `T&`.
   - May be null, no ownership → `const T*` / `T*`.
   - Takes ownership → `std::unique_ptr<T>`.
2. **Member variable**:
   - Single owner → `std::unique_ptr<T>` or `T` (value).
   - Shared owner → `std::shared_ptr<T>`.
   - Observer of shared → `std::weak_ptr<T>` or `T*`.
3. **Local variable**:
   - Stack-allocated value → `T` directly.
   - Heap-allocated owned → `std::unique_ptr<T>`.

### Don't store `shared_ptr` everywhere "for safety"
Reference counting has overhead. Use the simplest model that fits.

---

## 10. Common Memory Bugs

### Dangling pointer
```cpp
int* p;
{
    int x = 5;
    p = &x;
}    // x destroyed
*p;   // undefined behavior — x is gone
```

### Use-after-free
```cpp
int* p = new int{5};
delete p;
*p = 10;     // undefined behavior — memory freed
```

### Double free
```cpp
int* p = new int{5};
delete p;
delete p;    // undefined behavior — double free
```

### Memory leak
```cpp
void f() {
    int* p = new int{5};
    if (something) return;    // leak — p not deleted
    delete p;
}
```

Fix:
```cpp
void f() {
    auto p = std::make_unique<int>(5);
    if (something) return;    // p destroyed automatically
    // no explicit delete needed
}
```

### `delete` vs `delete[]`
```cpp
int* arr = new int[10];
delete arr;       // undefined behavior — wrong delete form
delete[] arr;     // correct
```

Smart pointers / `std::vector` avoid this entirely.

### Slicing
```cpp
class Base {
public:
    virtual ~Base() = default;
    virtual void print() { std::cout << "Base\n"; }
};

class Derived : public Base {
public:
    void print() override { std::cout << "Derived\n"; }
};

void f(Base b) { b.print(); }   // takes by VALUE!

Derived d;
f(d);    // "Base" — d is "sliced" to Base when copied
```

Fix: take by reference (`Base&` or `const Base&`) or smart pointer.

### Stack overflow
```cpp
void recursive(int n) {
    if (n == 0) return;
    recursive(n - 1);
}

recursive(1'000'000);    // stack overflow
```

Deep recursion exhausts the stack. Convert to iteration or use an explicit stack.

### Iterator invalidation
```cpp
std::vector<int> v{1, 2, 3, 4, 5};
auto it = v.begin();
v.push_back(10);     // may reallocate; it may now be invalid
*it;                  // undefined behavior
```

Operations that modify a container may invalidate iterators / references / pointers into it. Read the doc for each container.

### Reading uninitialized memory
```cpp
int x;
std::cout << x;   // undefined behavior — x has garbage value
```

Always initialize. Use `int x{};` for zero.

### Returning reference to temporary
```cpp
const std::string& bad() {
    return "hello";    // temporary string, destroyed when function returns
}

const std::string& s = bad();    // dangling reference
```

### Capturing by reference in lambda outliving the scope
```cpp
auto make_lambda() {
    int x = 5;
    return [&]() { return x; };   // x destroyed when function returns
}

auto f = make_lambda();
f();   // undefined behavior — x is gone
```

Capture by value or use `shared_ptr`.

### Detection tools

**AddressSanitizer (ASan)**:
```bash
g++ -fsanitize=address -g your_code.cpp
./a.out
```

Catches use-after-free, buffer overflows, leaks. Slow (~2x) but invaluable.

**UndefinedBehaviorSanitizer (UBSan)**:
```bash
g++ -fsanitize=undefined -g your_code.cpp
```

Catches signed overflow, null deref, misaligned access, etc.

**Valgrind** (slower but more thorough):
```bash
valgrind --tool=memcheck --leak-check=full ./a.out
```

Use these regularly during development. They catch bugs your tests miss.

---

That's memory and ownership — the most important topic in C++. Get this right and avoid 70% of C++ bugs.

Key principles:
1. **Stack-allocate by default.** Use heap (smart pointers) only when needed.
2. **RAII everywhere.** Resource lifetime tied to object lifetime.
3. **`unique_ptr` for single ownership; `shared_ptr` only when truly shared.**
4. **References for non-null params; raw pointers for "may be null, don't own."**
5. **No `new` / `delete` in application code.**
6. **Use sanitizers in development.**

Next, the classes that use all of this: `04_classes_and_oop.md`.
