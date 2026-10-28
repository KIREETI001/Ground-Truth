# 08. Errors and Exceptions

> Exceptions, error codes, `std::expected` (C++23), assertions, `noexcept`. How C++ deals with things going wrong.

> Unlike Java/C#, C++ doesn't have a single official "right way" to handle errors. Different communities make different choices. This file covers what's available and when to use each.

---

## Table of Contents

1. [The Options](#1-the-options)
2. [Exceptions](#2-exceptions)
3. [Throwing and Catching](#3-throwing-and-catching)
4. [Standard Exception Types](#4-standard-exception-types)
5. [`noexcept`](#5-noexcept)
6. [Error Codes](#6-error-codes)
7. [`std::optional`, `std::expected`](#7-stdoptional-stdexpected)
8. [Assertions](#8-assertions)
9. [`std::terminate` and `std::abort`](#9-stdterminate-and-stdabort)
10. [Choosing a Strategy](#10-choosing-a-strategy)

---

## 1. The Options

C++ error handling techniques:
1. **Exceptions** — `throw` / `try` / `catch`. Like Java's runtime exceptions.
2. **Error codes** — return a code, check it. C-style, still very common.
3. **`std::optional<T>`** — for "no value" cases without an error.
4. **`std::expected<T, E>`** — value or error. C++23. Replaces a lot of exception use.
5. **Assertions** — `assert`. For "this should never happen" bugs.
6. **`std::terminate`** — give up entirely.

Real C++ codebases mix these. Modern style increasingly favors `std::expected` for recoverable errors and reserves exceptions for truly exceptional conditions.

---

## 2. Exceptions

C++ exceptions work like other languages:

```cpp
#include <stdexcept>

double divide(double a, double b) {
    if (b == 0) throw std::invalid_argument("division by zero");
    return a / b;
}

try {
    double r = divide(10, 0);
} catch (const std::invalid_argument& e) {
    std::cerr << "error: " << e.what() << "\n";
}
```

### What's different from Java/C#
- **No `throws` clause**. Functions can throw anything unless marked `noexcept`.
- **No checked exceptions**. All exceptions are like Java's `RuntimeException`.
- **Slower than alternatives**. Stack unwinding has overhead.
- **Disabled in some codebases**. Many C++ shops (game dev, embedded) build with `-fno-exceptions`.
- **Allocate**. Throwing typically requires heap allocation (for the exception object).

### When to use exceptions
- Truly exceptional conditions — out of memory, lost connection, programmer errors.
- Constructors (no way to return an error code from a constructor).
- Operator overloads (same reason).
- Code paths that shouldn't run in normal operation.

### When NOT to use exceptions
- Performance-critical code (game loops, real-time systems).
- Common control flow (file not found is often common, not exceptional).
- Cross-platform / cross-ABI boundaries — exceptions don't propagate cleanly across DLL boundaries on Windows, etc.
- Codebases compiled with `-fno-exceptions`.

---

## 3. Throwing and Catching

### Throwing
```cpp
throw std::runtime_error("something went wrong");
throw std::invalid_argument("bad input");
throw MyCustomException("specific error");
```

You can throw any type, but standard practice: derive from `std::exception` (or one of its subclasses).

### Custom exception
```cpp
class UserNotFoundException : public std::runtime_error {
public:
    UserNotFoundException(int id)
        : std::runtime_error("user not found: " + std::to_string(id)),
          user_id(id) {}
    
    int id() const { return user_id; }
    
private:
    int user_id;
};

throw UserNotFoundException(42);
```

### Catching
```cpp
try {
    do_stuff();
} catch (const std::invalid_argument& e) {
    std::cerr << "bad arg: " << e.what() << "\n";
} catch (const std::runtime_error& e) {
    std::cerr << "runtime: " << e.what() << "\n";
} catch (const std::exception& e) {
    std::cerr << "exception: " << e.what() << "\n";
} catch (...) {
    std::cerr << "unknown exception\n";
}
```

Catch by `const &` — avoids slicing (catching a derived type as base copies and loses derived parts) and unnecessary copies.

### Catch order
Specific types first; otherwise the base type catches everything before the derived handler runs:
```cpp
// BAD: runtime_error catches everything
try { ... }
catch (const std::exception& e) { ... }
catch (const std::runtime_error& e) { ... }   // unreachable!
```

### Rethrowing
```cpp
try {
    do_stuff();
} catch (...) {
    cleanup();
    throw;     // rethrow current exception
}
```

`throw;` (no argument) rethrows. `throw e;` (with the caught variable) makes a copy — typically wrong.

### Wrapping
```cpp
try {
    do_stuff();
} catch (const std::runtime_error& e) {
    throw std::nested_exception();    // wrap
    // Or just:
    throw MyError("failed: " + std::string(e.what()));
}
```

C++ has `std::nested_exception` for proper wrapping with stack preservation, but it's rarely used compared to manual wrapping.

### Stack unwinding
When an exception propagates, destructors of all stack objects in scope are called. This is **why RAII matters** — resource cleanup happens automatically.

```cpp
void f() {
    std::unique_ptr<Resource> r = std::make_unique<Resource>();
    might_throw();    // if this throws, ~unique_ptr runs, freeing r
    use(*r);
}
```

No need for try/finally or `using` blocks — destructors do the work.

### Exceptions in destructors
**Don't throw from destructors.** If a destructor is called during stack unwinding (from another exception) and it throws, `std::terminate` runs.

```cpp
~MyClass() {
    cleanup();   // if this throws, problem
}

// Best practice:
~MyClass() {
    try { cleanup(); }
    catch (...) { log_error(); }    // swallow or log
}
```

Mark destructors `noexcept` (the default since C++11) and ensure they don't throw.

### Exception safety guarantees
1. **No-throw**: never throws (e.g., destructors, move operations should be).
2. **Strong guarantee**: if it throws, state is unchanged (transaction-like).
3. **Basic guarantee**: invariants preserved, but state may differ.
4. **No guarantee**: anything could happen.

Aim for strong or basic; document which.

---

## 4. Standard Exception Types

`<stdexcept>` provides a hierarchy:

```
std::exception
├── std::logic_error
│   ├── std::invalid_argument
│   ├── std::domain_error
│   ├── std::length_error
│   └── std::out_of_range
├── std::runtime_error
│   ├── std::range_error
│   ├── std::overflow_error
│   ├── std::underflow_error
│   └── std::system_error
├── std::bad_alloc
├── std::bad_cast
├── std::bad_typeid
└── std::bad_optional_access, ...
```

### When to throw what
- **`std::invalid_argument`** — input doesn't meet preconditions.
- **`std::out_of_range`** — index/key out of range.
- **`std::length_error`** — operation exceeds container max.
- **`std::runtime_error`** — generic runtime issue.
- **`std::system_error`** — OS-level errors (with errno).
- **`std::bad_alloc`** — `new` failed (out of memory).

For domain-specific errors, derive from `std::runtime_error`.

### `.what()`
The standard method returning a `const char*` message:
```cpp
catch (const std::exception& e) {
    std::cerr << e.what() << "\n";
}
```

---

## 5. `noexcept`

Declares a function won't throw.

```cpp
void f() noexcept {    // doesn't throw
    // ...
}

void g() noexcept(true);    // same
void h() noexcept(false);    // may throw (default)
```

### Effect
- The compiler may generate more efficient code (no unwinding setup).
- Some STL operations (move, swap) require `noexcept` for optimal behavior.
- If a `noexcept` function does throw, `std::terminate` is called immediately.

### When to mark `noexcept`
- **Move constructors and move assignment**: enables STL optimization (e.g., `vector::resize` moves instead of copies).
- **Destructors**: always (the default already).
- **`swap`**: critical for the swap trick.
- **Simple getters / queries**.

```cpp
class MyClass {
public:
    MyClass(MyClass&& other) noexcept   // important!
        : data(std::move(other.data)) {}
    
    MyClass& operator=(MyClass&& other) noexcept;
    
    void swap(MyClass& other) noexcept;
};
```

### Conditional noexcept
```cpp
template<typename T>
void f(T t) noexcept(std::is_nothrow_move_constructible_v<T>) {
    // ...
}
```

`noexcept` if T can be moved without throwing.

### Checking
```cpp
static_assert(noexcept(f()));    // compile-time check
```

---

## 6. Error Codes

C-style. Return an error code; check it.

```cpp
enum class Error { ok, file_not_found, permission_denied };

Error read_file(const std::string& path, std::string& contents);

std::string contents;
Error err = read_file("data.txt", contents);
if (err != Error::ok) {
    handle_error(err);
}
```

Or return an `errno`-style int.

### `std::error_code` (C++11)
Standard error code support:
```cpp
#include <system_error>

std::error_code ec;
auto size = std::filesystem::file_size("missing.txt", ec);
if (ec) {
    std::cerr << "error: " << ec.message() << "\n";
}
```

Many STL functions have `error_code` overloads alongside throwing ones.

### Why error codes
- No exception overhead.
- Easy to integrate with C APIs.
- Code paths are explicit.

### Why not
- Easy to ignore (just don't check).
- Verbose — every call checks.
- Hard to propagate (must thread through every layer).

For new code, `std::expected` is usually a better choice than raw error codes.

---

## 7. `std::optional`, `std::expected`

### `std::optional<T>` (C++17)
For functions that might not return a value:

```cpp
#include <optional>

std::optional<User> find_user(int id) {
    if (auto it = db.find(id); it != db.end()) {
        return it->second;
    }
    return std::nullopt;
}

auto user = find_user(42);
if (user) {
    std::cout << user->name;
}

// Or with the optional methods:
user.value();      // throws std::bad_optional_access if empty
user.value_or(default_user);    // default if empty
```

Use when:
- Function may legitimately not return a value.
- No error info needed beyond "nothing here."

Don't use for errors that have meaningful info.

### `std::expected<T, E>` (C++23)
A value OR an error:

```cpp
#include <expected>

std::expected<User, std::string> find_user(int id) {
    if (id < 0) return std::unexpected("invalid id");
    if (auto it = db.find(id); it != db.end()) return it->second;
    return std::unexpected("user not found");
}

auto result = find_user(42);
if (result) {
    std::cout << result->name;
} else {
    std::cerr << result.error();
}
```

### Composing
```cpp
auto get_email_domain(int id) -> std::expected<std::string, std::string> {
    return find_user(id)
        .and_then([](const User& u) -> std::expected<std::string, std::string> {
            return u.email;
        })
        .and_then([](const std::string& email) -> std::expected<std::string, std::string> {
            auto at = email.find('@');
            if (at == std::string::npos) return std::unexpected("no @ in email");
            return email.substr(at + 1);
        });
}
```

Like Rust's `Result<T, E>`. Lets you chain operations without nested try/catch.

### When to use `std::expected`
- Recoverable errors.
- Errors that need detail (not just "nothing").
- Code that doesn't want exception overhead.
- Cross-ABI boundaries.

In 2026 with C++23 support widespread, `std::expected` is becoming the preferred error-handling style for many.

### Pre-C++23 alternatives
- `tl::expected` — a popular header-only library before C++23.
- `boost::outcome`.
- Roll your own with `std::variant<T, ErrorType>`.

---

## 8. Assertions

For bugs (programmer errors), not runtime errors.

### `assert`
From `<cassert>`:
```cpp
#include <cassert>

void process(const std::vector<int>& v, size_t index) {
    assert(index < v.size() && "index must be in range");
    // ...
}
```

`assert(cond)` is a macro:
- In debug builds: if `cond` is false, prints message and calls `std::abort()`.
- In release builds (`NDEBUG` defined): expanded to nothing.

### When to assert
- Invariants you believe to be true.
- Preconditions of internal functions.
- Catch bugs during development.

### When NOT to assert
- User input (use exceptions or error codes).
- Conditions that can fail at runtime in correct programs (file not found).
- Production-time error handling.

Asserts in release are a no-op — don't rely on them for correctness.

### `static_assert`
Compile-time:
```cpp
static_assert(sizeof(int) == 4, "this code assumes 32-bit int");
static_assert(std::is_integral_v<T>, "T must be integral");
```

If condition is false, compile error.

### Contract-based programming
C++26 may add formal contracts (preconditions, postconditions, assertions). Watch this space.

---

## 9. `std::terminate` and `std::abort`

`std::terminate()` is called when:
- An exception escapes `main`.
- A noexcept function throws.
- An exception escapes during stack unwinding (already-throwing).
- Various other "this should never happen" scenarios.

Default behavior: calls `std::abort()`, which terminates the program (no destructor cleanup).

You can install a handler:
```cpp
std::set_terminate([]() {
    std::cerr << "fatal error\n";
    std::abort();
});
```

In practice: don't rely on this. It's a last-resort signal that your error handling has failed.

### `std::abort`
Immediate termination, no cleanup. Used by `assert`, `terminate`.

---

## 10. Choosing a Strategy

### Modern C++ (broadly)
- **Use exceptions** for truly exceptional conditions: programmer errors (caught early), unrecoverable failures (OOM), constructor failures.
- **Use `std::expected`** (or `std::optional`) for expected errors that are part of normal control flow.
- **Use `assert`** for invariants and "should never happen" bugs.
- **Use `noexcept`** on moves, destructors, swap.

### Game dev, embedded, real-time
- Exceptions usually disabled.
- Error codes or `std::expected`.
- `assert` for debugging.
- Minimize allocations (avoid `std::string`-returning errors).

### Server / business apps
- Exceptions are fine.
- Combine with `std::expected` for recoverable cases.
- Don't catch and swallow — let unrecoverable errors propagate to a top-level handler.

### Library design
- Provide both throwing and non-throwing overloads where reasonable (`std::vector::at` vs `operator[]`).
- Use `noexcept` correctly.
- Document exception safety guarantees.
- Don't throw from destructors.

### Common pitfalls

**Catching and ignoring:**
```cpp
try { ... } catch (...) {}   // BAD
```
Either handle, log, or rethrow.

**Catching by value:**
```cpp
catch (std::exception e) { ... }   // slices derived parts
```
Always `catch (const std::exception& e)`.

**Throwing primitives:**
```cpp
throw 42;        // BAD — what does this mean?
throw "error";    // BAD — const char*, doesn't fit catch (const std::exception&)
```
Throw exception types.

**Exceptions across DLL boundaries:**
Behavior depends on toolchain. On Windows MSVC, exceptions can cross DLLs if both sides are compiled with matching ABI. Across compilers / ABIs: unreliable.

For library APIs intended for wide use, prefer error codes or `std::expected`.

**Misusing `noexcept`:**
Marking a function `noexcept` when it actually throws → `std::terminate` at runtime. Verify with reasoning or `static_assert(noexcept(...))`.

**Exception specifications (deprecated)**:
```cpp
void f() throw(MyError);   // C++98 — REMOVED in C++17. Don't use.
```

Only `noexcept` exists now.

**Catching everything globally**:
```cpp
int main() {
    try {
        run();
    } catch (...) {
        return 1;
    }
}
```

For top-level "catch and log" handlers, yes. But scope this carefully — better to let unknown exceptions terminate the program with a debugger-friendly stack trace than silently exit 1.

---

That's error handling. Use the right tool for the kind of error. Most projects use a mix — `std::expected` for expected failures, exceptions for unexpected ones, asserts for bugs.

Next: doing multiple things at once — `09_concurrency.md`.
