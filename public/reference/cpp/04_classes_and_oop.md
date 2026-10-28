# 04. Classes & OOP

> Classes, constructors, destructors, inheritance, virtual functions, polymorphism, and the rules of 0/3/5.

---

## Table of Contents

1. [Class Basics](#1-class-basics)
2. [Constructors](#2-constructors)
3. [Destructors](#3-destructors)
4. [Copy and Move](#4-copy-and-move)
5. [Rule of 0 / Rule of 3 / Rule of 5](#5-rule-of-0--rule-of-3--rule-of-5)
6. [Inheritance](#6-inheritance)
7. [Virtual Functions and Polymorphism](#7-virtual-functions-and-polymorphism)
8. [Pure Virtual and Abstract Classes](#8-pure-virtual-and-abstract-classes)
9. [Composition vs Inheritance](#9-composition-vs-inheritance)
10. [`struct` vs `class`](#10-struct-vs-class)
11. [Common Patterns](#11-common-patterns)

---

## 1. Class Basics

```cpp
class User {
public:
    User(std::string name, int age)
        : name_(std::move(name)), age_(age) {}
    
    const std::string& name() const { return name_; }
    int age() const { return age_; }
    
    void birthday() { age_++; }

private:
    std::string name_;
    int age_;
};

User u{"Alice", 30};
u.name();        // "Alice"
u.birthday();
u.age();         // 31
```

### Conventions
- **PascalCase** for class names.
- **camelCase** or **snake_case** for methods/variables (consistent within a project).
- **Trailing underscore** (`name_`) for member variables — distinguishes from locals/parameters.
- **`private` by default** — encapsulation. Expose what's needed via methods.

### Access modifiers
- `public` — visible to anyone.
- `protected` — visible to derived classes and itself.
- `private` — visible only within the class.

```cpp
class Account {
public:
    void deposit(double amount) { balance_ += amount; }
    double balance() const { return balance_; }

protected:
    void debit(double amount) { balance_ -= amount; }

private:
    double balance_ = 0.0;
};
```

### Member initializer list
The thing after the `:` in a constructor:
```cpp
User(std::string name, int age)
    : name_(std::move(name)), age_(age) {
    // constructor body
}
```

Members initialized in the order **declared in the class**, not the order in the initializer list. (Compilers warn about mismatches.)

For complex initialization, prefer the initializer list over assignment in the body — fewer constructions, works with `const` and reference members.

### `const` methods
```cpp
int age() const { return age_; }   // doesn't modify this
void birthday() { age_++; }         // modifies this
```

`const` methods can be called on `const` objects:
```cpp
const User u{"Alice", 30};
u.age();          // OK
u.birthday();     // ERROR — not const
```

Mark every method `const` that doesn't modify state. Lets callers use `const` references.

### In-class member initialization (C++11+)
```cpp
class User {
    std::string name_ = "anonymous";
    int age_ = 0;
    bool active_ = true;
};
```

Defaults used if not set in constructor's initializer list. Cleaner than repeating defaults across multiple constructors.

### Default member initialization + constructor
```cpp
class User {
public:
    User(std::string name) : name_(std::move(name)) {}
    // age_ defaults to 0, active_ defaults to true
private:
    std::string name_;
    int age_ = 0;
    bool active_ = true;
};
```

---

## 2. Constructors

### Default constructor
```cpp
class Empty {
public:
    Empty() {}     // default constructor
};

Empty e;          // OK
```

If you don't write any constructor, the compiler generates a default one. If you write any constructor (with arguments), the compiler-generated default is gone unless you ask for it:
```cpp
class C {
public:
    C(int x) : x_(x) {}
    C() = default;        // bring back the default
private:
    int x_;
};
```

### Parameterized constructors
```cpp
class Rectangle {
public:
    Rectangle(double w, double h) : width_(w), height_(h) {}
    Rectangle(double side) : width_(side), height_(side) {}    // square

private:
    double width_;
    double height_;
};

Rectangle r1{3, 4};      // 3x4
Rectangle r2{5};          // 5x5 square
```

### `explicit`
By default, single-argument constructors enable implicit conversion:
```cpp
class MyInt {
public:
    MyInt(int x) : value_(x) {}
private:
    int value_;
};

void f(MyInt m);
f(42);     // OK — 42 implicitly converted to MyInt
```

Often this is surprising. Mark constructors `explicit` to prevent implicit conversion:
```cpp
class MyInt {
public:
    explicit MyInt(int x) : value_(x) {}
};

f(42);              // ERROR
f(MyInt{42});       // OK — explicit
```

**Almost always use `explicit` for single-argument constructors.**

### Delegating constructors
```cpp
class User {
public:
    User() : User("anonymous", 0) {}       // delegates to other constructor
    User(std::string name) : User(std::move(name), 0) {}
    User(std::string name, int age) : name_(std::move(name)), age_(age) {}
private:
    std::string name_;
    int age_;
};
```

DRY — avoid repeating init logic.

### `= default` and `= delete`
```cpp
class User {
public:
    User() = default;                         // ask for the compiler's default
    User(const User&) = delete;               // disable copy
    User& operator=(const User&) = delete;     // disable copy assignment
};
```

Use `= delete` to prevent specific operations. Common for non-copyable types.

### Initializer list constructor
```cpp
class Container {
public:
    Container(std::initializer_list<int> list) {
        for (int x : list) data_.push_back(x);
    }
private:
    std::vector<int> data_;
};

Container c{1, 2, 3, 4, 5};
```

`std::initializer_list<T>` lets you accept brace-enclosed lists.

### Most vexing parse
```cpp
Rectangle r();   // declares a FUNCTION returning Rectangle — not what you want!
Rectangle r;     // creates a default-constructed Rectangle — correct
Rectangle r{};   // also creates a default-constructed Rectangle — preferred
```

Brace initialization avoids the most vexing parse:
```cpp
Rectangle r{};
Rectangle r2{3, 4};
```

---

## 3. Destructors

```cpp
class FileHandle {
public:
    FileHandle(const char* path) : file_(std::fopen(path, "r")) {}
    
    ~FileHandle() {
        if (file_) std::fclose(file_);
    }
private:
    std::FILE* file_;
};

void f() {
    FileHandle fh{"data.txt"};
    // ... use fh ...
}   // ~FileHandle() called — file closed automatically
```

Destructors:
- Called when object goes out of scope (stack), or when `delete` is called (heap), or when the owning smart pointer is destroyed.
- Run in **reverse order of construction**.
- Should not throw exceptions (more on this in `08_errors_and_exceptions.md`).

### Implicit destructor
The compiler generates one if you don't. It calls destructors of all members. Often that's all you need:
```cpp
class User {
    std::string name_;     // string's destructor frees the data
    std::vector<int> data_; // vector's destructor frees its memory
    // implicit ~User() handles both
};
```

No explicit destructor needed. This is the **Rule of 0** in action — let RAII members manage themselves.

### Virtual destructor
If a class is meant to be used as a base for polymorphic use, the destructor **must** be virtual:
```cpp
class Base {
public:
    virtual ~Base() = default;     // virtual destructor
};

class Derived : public Base {
    ~Derived() { /* cleanup */ }
};

Base* p = new Derived;
delete p;    // calls ~Derived() because ~Base() is virtual
              // WITHOUT virtual: only ~Base() runs — Derived not cleaned up!
```

If you have any virtual functions, make the destructor virtual. Always.

### When NOT to provide a destructor
If your class doesn't manage resources, skip the explicit destructor. The compiler-generated one is fine:
```cpp
class Point {
    int x_;
    int y_;
    // no destructor needed — primitives don't need cleanup
};
```

---

## 4. Copy and Move

By default, the compiler generates 5 special functions:
1. Default constructor — `T()`
2. Copy constructor — `T(const T&)`
3. Copy assignment — `T& operator=(const T&)`
4. Move constructor — `T(T&&)` (C++11+)
5. Move assignment — `T& operator=(T&&)` (C++11+)

Most of the time, the compiler's defaults are correct.

### Copy
```cpp
class User {
public:
    User(const User& other) : name_(other.name_), age_(other.age_) {}     // copy ctor
    User& operator=(const User& other) {                                    // copy assign
        if (this != &other) {
            name_ = other.name_;
            age_ = other.age_;
        }
        return *this;
    }
private:
    std::string name_;
    int age_;
};

User u1{"Alice", 30};
User u2 = u1;       // copy construction
User u3;
u3 = u1;            // copy assignment
```

For most classes, the compiler-generated versions are fine — they member-copy.

### Move (C++11+)
"Move" is transferring ownership of resources cheaply.

```cpp
class Buffer {
public:
    Buffer(std::size_t n) : data_(new int[n]), size_(n) {}
    ~Buffer() { delete[] data_; }
    
    Buffer(Buffer&& other) noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;       // leave other in valid but empty state
        other.size_ = 0;
    }
    
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            other.data_ = nullptr;
            other.size_ = 0;
        }
        return *this;
    }

private:
    int* data_;
    std::size_t size_;
};

Buffer b1{1000};
Buffer b2 = std::move(b1);   // move construction — fast, no allocation
```

For built-in types: `std::vector`, `std::string`, smart pointers — move is built in and cheap.

### `std::move`
A cast that converts an lvalue to an rvalue reference, enabling move:
```cpp
std::vector<int> a{1, 2, 3};
std::vector<int> b = std::move(a);    // a's data moved to b; a is now empty (but valid)
```

`std::move` doesn't actually move — it just enables move semantics. The actual move happens in the move constructor / move assignment.

After moving, the source object is in a "valid but unspecified" state. You can assign to it or destroy it; don't read its contents.

### When move helps
- Returning containers from functions (sometimes — RVO often elides the move entirely).
- Storing into containers: `vec.push_back(std::move(item))`.
- Transferring ownership.

### `noexcept` on move
```cpp
Buffer(Buffer&& other) noexcept { ... }
```

`noexcept` on move operations is important — `std::vector` and other containers can optimize when they know moves won't throw. Without `noexcept`, some operations fall back to copying.

---

## 5. Rule of 0 / Rule of 3 / Rule of 5

### Rule of 0
**If your class doesn't manage resources, define none of the special functions.** Let the compiler generate them.

```cpp
class User {
    std::string name_;
    int age_;
    std::vector<std::string> tags_;
    // No constructor, destructor, copy/move declared.
    // Compiler-generated versions work correctly because all members are RAII.
};
```

This is the modern C++ default. Most classes should follow Rule of 0.

### Rule of 3 (old style)
If you define any of: destructor, copy constructor, copy assignment — define **all three**. Reason: if you need a non-default destructor (resource management), the default copy probably does the wrong thing (shallow copy of an owning pointer = double-free).

```cpp
class BadBuffer {
public:
    BadBuffer(int n) : data_(new int[n]) {}
    ~BadBuffer() { delete[] data_; }
    // Default copy: shallow! Two BadBuffers point to the same memory → double-free on destruction.
private:
    int* data_;
};

BadBuffer a{10};
BadBuffer b = a;     // shallow copy
// At end of scope: ~BadBuffer for both, deletes data_ twice — undefined behavior!
```

Fix: define copy operations (deep copy) or disable them (`= delete`).

### Rule of 5 (C++11+)
With move semantics, the count expands to 5: destructor, copy ctor, copy assign, move ctor, move assign. If you define one resource-managing one, consider all five.

### In practice
Use Rule of 0. Let `std::vector`, `std::unique_ptr`, etc. manage resources for you. The class itself needs no special functions.

The exception: when you're **writing** a wrapper for a non-RAII resource (a C API, OS handle), you need Rule of 5.

---

## 6. Inheritance

```cpp
class Animal {
public:
    Animal(std::string name) : name_(std::move(name)) {}
    
    void eat() { std::cout << name_ << " eats\n"; }

protected:
    std::string name_;
};

class Dog : public Animal {
public:
    Dog(std::string name, std::string breed)
        : Animal(std::move(name)), breed_(std::move(breed)) {}
    
    void bark() { std::cout << name_ << " (" << breed_ << ") barks\n"; }

private:
    std::string breed_;
};

Dog d{"Rex", "Labrador"};
d.eat();     // inherited from Animal
d.bark();
```

### `public`, `protected`, `private` inheritance
```cpp
class B : public A { };       // public — A's public stays public, A's protected stays protected
class B : protected A { };     // A's public becomes protected
class B : private A { };       // A's public/protected become private
```

**Almost always use `public`.** Private/protected inheritance is technically "implemented in terms of" — better expressed as composition.

### Single inheritance
C++ allows multiple inheritance, but it's complex and error-prone. Use:
- Single inheritance for "is-a" relationships.
- Multiple inheritance only for interface-style classes (pure virtual / no state).

### Constructor chaining
```cpp
class Derived : public Base {
public:
    Derived(int x, int y) : Base(x), y_(y) {}    // call Base constructor explicitly
private:
    int y_;
};
```

If you don't call a Base constructor, the default is used. If Base has no default and you don't call one explicitly, compile error.

### `final` (C++11+)
Prevent further inheritance:
```cpp
class Leaf final : public Base { };
// class Foo : public Leaf { };   // ERROR

class Base {
    virtual void f() final;     // can't be overridden
};
```

### When to use inheritance
- True "is-a" relationships.
- Polymorphism — base pointer / reference to derived.
- Code reuse where overriding makes sense.

### When NOT to
- "Has-a" → composition (a member).
- Code reuse without override → free functions or composition.
- Implementing an interface → pure virtual base (no shared state).

Modern guidance: **prefer composition over inheritance**. Inheritance creates tight coupling and brittle hierarchies. Use interfaces (pure virtual) and composition for most needs.

---

## 7. Virtual Functions and Polymorphism

Static dispatch (default):
```cpp
class Animal {
public:
    void speak() { std::cout << "generic animal sound\n"; }
};

class Dog : public Animal {
public:
    void speak() { std::cout << "woof\n"; }
};

Dog d;
Animal* a = &d;
a->speak();        // "generic animal sound" — called via Animal* statically
d.speak();          // "woof"
```

Without `virtual`, the call goes to whatever the static type's method is — confusing for OO programmers.

### `virtual` for dynamic dispatch
```cpp
class Animal {
public:
    virtual ~Animal() = default;
    virtual void speak() { std::cout << "generic\n"; }
};

class Dog : public Animal {
public:
    void speak() override { std::cout << "woof\n"; }
};

Animal* a = new Dog;
a->speak();        // "woof" — virtual dispatch
delete a;
```

`virtual` enables runtime polymorphism — the actual method called depends on the runtime type.

### Always use `override`
```cpp
class Dog : public Animal {
public:
    void speak() override { ... }      // compiler verifies it overrides something
};
```

Without `override`, typos silently create new methods that don't override. Always use `override`.

### Virtual destructor
**If a class is used polymorphically (via base pointer), it must have a virtual destructor.**

```cpp
class Base {
public:
    virtual ~Base() = default;
};
```

Without virtual destructor, `delete base_ptr` calls only `Base`'s destructor, leaking the derived part.

### `vtable`
Behind the scenes, virtual functions use a "vtable" (virtual function table) — a per-class array of function pointers. Each object holds a pointer to its class's vtable. Virtual calls go through this indirection.

Slight overhead compared to direct calls. The JIT-style inlining of C# / Java isn't there; you pay a small cost.

### Calling base implementation
```cpp
class Derived : public Base {
public:
    void f() override {
        Base::f();        // call base's version
        // additional work
    }
};
```

### Pure virtual: abstract method
```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;     // pure virtual — no implementation
};

Shape s;       // ERROR — can't instantiate abstract class

class Circle : public Shape {
public:
    Circle(double r) : radius_(r) {}
    double area() const override { return 3.14159 * radius_ * radius_; }
private:
    double radius_;
};
```

A class with at least one pure virtual function is abstract — can't be instantiated.

---

## 8. Pure Virtual and Abstract Classes

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual void draw() const = 0;
};
```

Abstract classes serve as interfaces.

### "Interface" pattern
```cpp
class IObserver {
public:
    virtual ~IObserver() = default;
    virtual void onEvent(const Event& e) = 0;
};

class LogObserver : public IObserver {
public:
    void onEvent(const Event& e) override {
        log(e);
    }
};

void subscribe(std::unique_ptr<IObserver> obs);
subscribe(std::make_unique<LogObserver>());
```

Convention: prefix interfaces with `I` (`IObserver`). Not enforced; common in Microsoft and some other shops.

### Interface with default implementations
A pure virtual class can have non-pure virtual methods with implementations:
```cpp
class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(LogLevel level, const std::string& msg) = 0;
    
    // Default implementations
    virtual void info(const std::string& msg) { log(LogLevel::Info, msg); }
    virtual void warn(const std::string& msg) { log(LogLevel::Warn, msg); }
    virtual void error(const std::string& msg) { log(LogLevel::Error, msg); }
};
```

Derived classes only need to implement `log`.

### Abstract base with shared implementation
For abstract classes with some shared state:
```cpp
class Animal {
public:
    Animal(std::string name) : name_(std::move(name)) {}
    virtual ~Animal() = default;
    
    virtual void speak() const = 0;    // pure virtual
    
    const std::string& name() const { return name_; }   // shared
    
protected:
    std::string name_;
};
```

---

## 9. Composition vs Inheritance

Inheritance:
```cpp
class Car : public Engine, public Wheel { };   // is-a-Engine? No. Bad.
```

Composition:
```cpp
class Car {
    Engine engine_;
    std::array<Wheel, 4> wheels_;
};
```

**Composition is almost always cleaner.** Inheritance is for true "is-a" with polymorphism.

### When inheritance fits
- Common interface (abstract base class).
- Substitution: anywhere a `Base` is expected, a `Derived` works (Liskov substitution).

### When composition fits
- Has-a relationships.
- Mixing behaviors.
- Flexibility / loose coupling.

### Strategy via composition
```cpp
class Logger {
    std::unique_ptr<IFormatter> formatter_;
    std::unique_ptr<ISink> sink_;
public:
    Logger(std::unique_ptr<IFormatter> f, std::unique_ptr<ISink> s)
        : formatter_(std::move(f)), sink_(std::move(s)) {}
    
    void log(const std::string& msg) {
        sink_->write(formatter_->format(msg));
    }
};
```

Different behaviors composed in at construction.

---

## 10. `struct` vs `class`

Two keywords, almost identical:
- `class`: default access is `private`.
- `struct`: default access is `public`.

That's the only language-level difference. By convention:
- Use `struct` for **plain data** (POD — Plain Old Data).
- Use `class` for **types with behavior** / invariants / encapsulation.

```cpp
struct Point {
    double x;
    double y;
};

class Account {
public:
    Account(double initial);
    void deposit(double amount);
private:
    double balance_;
};
```

Both can have methods, inheritance, etc. Convention is purely about reader expectations.

---

## 11. Common Patterns

### Pimpl (Pointer to Implementation)
Hide implementation details from the header:
```cpp
// widget.hpp
class Widget {
public:
    Widget();
    ~Widget();
    void doStuff();
    
private:
    class Impl;
    std::unique_ptr<Impl> pimpl_;
};

// widget.cpp
class Widget::Impl {
public:
    void doStuff() { /* real implementation */ }
private:
    // implementation details, members, etc.
};

Widget::Widget() : pimpl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;
void Widget::doStuff() { pimpl_->doStuff(); }
```

Benefits:
- Header is small and stable — recompile less when implementation changes.
- Hide private members from clients.

Cost: one pointer indirection per call, one heap allocation per object.

### Factory
```cpp
class Widget {
public:
    static std::unique_ptr<Widget> create(const Config& cfg) {
        // validation, setup
        return std::unique_ptr<Widget>{new Widget{cfg}};
    }
    
private:
    Widget(const Config& cfg);    // private — clients use factory
};
```

### Singleton (rare — usually a smell)
```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;
        return inst;
    }
    
    void log(const std::string& msg);

private:
    Logger() = default;
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
};

Logger::instance().log("hello");
```

Singletons are global mutable state. Usually better to pass dependencies explicitly. Use sparingly.

### CRTP (Curiously Recurring Template Pattern)
Static polymorphism via templates:
```cpp
template<typename Derived>
class Base {
public:
    void interface() {
        static_cast<Derived*>(this)->implementation();
    }
};

class Concrete : public Base<Concrete> {
public:
    void implementation() { /* ... */ }
};

Concrete c;
c.interface();   // calls Concrete::implementation, no vtable
```

Used in some libraries (Eigen, etc.). Modern alternative: use concepts (C++20) for static polymorphism more cleanly.

### Observer
```cpp
class Subject {
    std::vector<std::weak_ptr<IObserver>> observers_;
public:
    void subscribe(std::weak_ptr<IObserver> obs) {
        observers_.push_back(obs);
    }
    
    void notify(const Event& e) {
        for (auto& weak_obs : observers_) {
            if (auto obs = weak_obs.lock()) {
                obs->onEvent(e);
            }
        }
    }
};
```

`weak_ptr` so subject doesn't extend observer lifetime.

### RAII wrapper for C resource
```cpp
class FdHandle {
public:
    explicit FdHandle(int fd) : fd_(fd) {}
    ~FdHandle() { if (fd_ >= 0) ::close(fd_); }
    
    FdHandle(const FdHandle&) = delete;
    FdHandle& operator=(const FdHandle&) = delete;
    
    FdHandle(FdHandle&& other) noexcept : fd_(other.fd_) { other.fd_ = -1; }
    FdHandle& operator=(FdHandle&& other) noexcept {
        if (this != &other) {
            if (fd_ >= 0) ::close(fd_);
            fd_ = other.fd_;
            other.fd_ = -1;
        }
        return *this;
    }
    
    int get() const { return fd_; }

private:
    int fd_;
};
```

A move-only wrapper around a POSIX file descriptor. Auto-closes when destroyed.

### Builder
```cpp
class Window {
public:
    class Builder {
        std::string title_ = "Window";
        int width_ = 800;
        int height_ = 600;
    public:
        Builder& title(std::string t) { title_ = std::move(t); return *this; }
        Builder& size(int w, int h) { width_ = w; height_ = h; return *this; }
        Window build() { return Window{title_, width_, height_}; }
    };
private:
    Window(std::string title, int width, int height);
};

auto w = Window::Builder{}
    .title("My App")
    .size(1024, 768)
    .build();
```

Less common in C++ than Java; designated initializers (C++20) often suffice:
```cpp
struct Config { int width = 800; int height = 600; std::string title = "App"; };
Config c{.width = 1024, .height = 768};
```

---

That's OOP. Modern C++ leans toward:
1. **Rule of 0** — RAII members handle their own lifecycle.
2. **Composition over inheritance** — has-a, not is-a.
3. **Abstract interfaces** for polymorphism (pure virtual + virtual destructor).
4. **`override` always** — catch typos.
5. **`final` to lock down classes** when extension isn't intended.
6. **`explicit` constructors** to avoid surprising conversions.

Next: templates — the generic toolkit — `05_templates_and_generics.md`.
