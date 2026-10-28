# 07. Errors & Exceptions

> Checked vs unchecked, try/catch, try-with-resources, custom exceptions, and how Java's exception model differs from most other languages.

---

## Table of Contents

1. [Exception Hierarchy](#1-exception-hierarchy)
2. [Checked vs Unchecked](#2-checked-vs-unchecked)
3. [try / catch / finally](#3-try--catch--finally)
4. [try-with-resources](#4-try-with-resources)
5. [Throwing Exceptions](#5-throwing-exceptions)
6. [Custom Exceptions](#6-custom-exceptions)
7. [Multi-catch and Rethrow](#7-multi-catch-and-rethrow)
8. [Best Practices](#8-best-practices)
9. [Common Patterns](#9-common-patterns)
10. [Common Pitfalls](#10-common-pitfalls)

---

## 1. Exception Hierarchy

Java's exception classes:

```
Throwable
├── Error                    (JVM errors — don't catch)
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── ...
└── Exception                (application exceptions)
    ├── (most exceptions)    — CHECKED (compiler requires handling)
    │   ├── IOException
    │   ├── SQLException
    │   ├── ParseException
    │   └── ...
    └── RuntimeException     — UNCHECKED (compiler doesn't require handling)
        ├── NullPointerException
        ├── IllegalArgumentException
        ├── IllegalStateException
        ├── IndexOutOfBoundsException
        ├── ClassCastException
        ├── ArithmeticException
        └── ...
```

- **`Error`**: the JVM has a problem (OOM, stack overflow, internal failure). Don't catch; the program should die.
- **`Exception`**: application-level problems.
- **`RuntimeException`**: subclass of Exception. **Unchecked** — compiler doesn't force you to handle.
- **Other `Exception` subclasses**: **Checked** — must be caught or declared.

---

## 2. Checked vs Unchecked

This is Java's most polarizing feature.

### Checked exceptions
The compiler enforces: either catch them or declare `throws`:
```java
public void readFile(String path) throws IOException {     // declared
    Files.readString(Path.of(path));
}

// Caller:
try {
    readFile("data.txt");
} catch (IOException e) {
    log.error("read failed", e);
}
```

### Unchecked exceptions
No compiler enforcement:
```java
public int divide(int a, int b) {
    return a / b;       // can throw ArithmeticException; no `throws` needed
}
```

### The debate
**Pro checked**: forces callers to acknowledge failure modes. Documents what can go wrong.

**Con checked**:
- Verbosity — every layer either catches or declares.
- Don't compose well with lambdas / streams (functional interfaces don't allow checked exceptions).
- Often callers don't know what to do — they catch and rethrow as runtime, or wrap.

Modern Java practice (and modern languages — Kotlin, Scala) trends toward **unchecked exceptions**. Spring, Hibernate, most modern libraries wrap their failures in `RuntimeException` subclasses.

### When to throw checked
- The caller can reasonably recover (retry, fallback).
- File I/O, network, parsing — caller might want to handle failures specifically.

### When to throw unchecked
- Programmer errors (illegal argument, illegal state).
- Failures the caller can't reasonably recover from.
- Anywhere lambdas / streams might call your code.

### Best practice in 2026
Prefer unchecked for most application code. Use checked only when callers genuinely need to handle the failure differently.

---

## 3. try / catch / finally

```java
try {
    riskyOperation();
} catch (IOException e) {
    log.error("IO failed", e);
} catch (SQLException e) {
    log.error("DB failed", e);
} finally {
    cleanup();   // always runs
}
```

### Multi-catch
```java
try {
    riskyOperation();
} catch (IOException | SQLException e) {
    log.error("operation failed", e);
}
```

The same handler for multiple exception types. `e` has the common supertype.

### `finally`
Runs even if `try` or `catch` returns, breaks, or throws. Used for resource cleanup.

```java
Connection conn = null;
try {
    conn = openConnection();
    conn.execute(...);
} catch (SQLException e) {
    log.error("query failed", e);
} finally {
    if (conn != null) conn.close();
}
```

Most of these patterns are now replaced by try-with-resources.

### `finally` and return
```java
public int example() {
    try {
        return 1;
    } finally {
        return 2;    // returns 2 — finally overrides!
    }
}
```

**Don't return from `finally`.** Subtle bugs. Reserve `finally` for cleanup.

### Catching `Exception` / `Throwable`
```java
try { ... }
catch (Exception e) { ... }       // catches everything except Error
catch (Throwable t) { ... }        // catches everything — almost never right
```

Catching `Exception` is broad — fine at request handler boundaries to convert to error responses. Bad at deep call sites.

Catching `Throwable` is almost never right — you'd be catching `OutOfMemoryError`, etc.

---

## 4. try-with-resources

Auto-closes resources (anything implementing `AutoCloseable`).

```java
try (BufferedReader reader = Files.newBufferedReader(path)) {
    String line = reader.readLine();
    // ...
}    // reader.close() called automatically
```

### Multiple resources
```java
try (
    Connection conn = openConnection();
    PreparedStatement ps = conn.prepareStatement(sql);
    ResultSet rs = ps.executeQuery()
) {
    while (rs.next()) { ... }
}
```

Resources are closed in **reverse order** of declaration.

### With catch and finally
```java
try (var reader = ...) {
    // use it
} catch (IOException e) {
    // handle
} finally {
    // additional cleanup
}
```

### Effectively final resources (Java 9+)
```java
var resource = makeResource();
try (resource) {
    use(resource);
}
```

You can use a variable declared outside the try as long as it's effectively final.

### When `AutoCloseable` isn't implemented
Some legacy types aren't `AutoCloseable`. Use manual cleanup in `finally`.

---

## 5. Throwing Exceptions

```java
public void deposit(double amount) {
    if (amount < 0) {
        throw new IllegalArgumentException("amount must be non-negative, got " + amount);
    }
    if (frozen) {
        throw new IllegalStateException("account is frozen");
    }
    balance += amount;
}
```

### Wrapping
When catching one exception type and throwing another, **always include the cause**:
```java
try {
    riskyOperation();
} catch (SQLException e) {
    throw new DataAccessException("failed to fetch user", e);   // cause preserved
}
```

Without the cause, you lose the stack trace of the original error — debugging nightmare.

### `Throwable.initCause` (legacy)
```java
RuntimeException ex = new RuntimeException("wrapper");
ex.initCause(original);    // for exceptions that don't have a cause constructor
throw ex;
```

Modern exceptions accept the cause in the constructor; use that.

### `addSuppressed`
For exceptions in `finally`/close that you don't want to lose:
```java
try {
    risky();
} catch (Exception e) {
    try {
        cleanup();
    } catch (Exception ce) {
        e.addSuppressed(ce);
    }
    throw e;
}
```

try-with-resources does this automatically.

---

## 6. Custom Exceptions

```java
public class UserNotFoundException extends RuntimeException {
    private final long userId;
    
    public UserNotFoundException(long userId) {
        super("User not found: " + userId);
        this.userId = userId;
    }
    
    public UserNotFoundException(long userId, Throwable cause) {
        super("User not found: " + userId, cause);
        this.userId = userId;
    }
    
    public long getUserId() { return userId; }
}
```

### Naming
- End with `Exception`: `UserNotFoundException`, `InvalidStateException`.
- Be specific: `OrderProcessingException`, not `BusinessException`.

### Inheritance for hierarchies
```java
public class AppException extends RuntimeException { ... }
public class NotFoundException extends AppException { ... }
public class UserNotFoundException extends NotFoundException { ... }
public class OrderNotFoundException extends NotFoundException { ... }
```

Callers can catch broadly (`AppException`) or specifically (`UserNotFoundException`).

### Include context
```java
public class ApiException extends RuntimeException {
    private final int statusCode;
    private final String endpoint;
    
    public ApiException(String message, int statusCode, String endpoint) {
        super(message);
        this.statusCode = statusCode;
        this.endpoint = endpoint;
    }
    
    // getters
}
```

Loggers and error trackers will surface this info.

### Don't make every error a custom exception
A typical app needs maybe 5-15 custom exception types. Reuse standard ones (`IllegalArgumentException`, `IllegalStateException`) where they fit.

---

## 7. Multi-catch and Rethrow

### Multi-catch (Java 7+)
```java
try { ... }
catch (IOException | SQLException e) {
    log.error("operation failed", e);
}
```

`e` is the common supertype. Use when the handling is identical.

### Precise rethrow (Java 7+)
```java
public void doIt() throws IOException, SQLException {
    try {
        ...
    } catch (Exception e) {
        log.error("failed", e);
        throw e;       // compiler knows this can only be IOException or SQLException
    }
}
```

In Java 7+, the compiler tracks which checked exceptions can actually be thrown despite the broad `catch (Exception e)`.

### Catch and rethrow as unchecked
Common pattern:
```java
try {
    Files.readString(path);
} catch (IOException e) {
    throw new UncheckedIOException(e);
}
```

`UncheckedIOException` is a `RuntimeException` wrapper for `IOException`. Lets you avoid declaring `throws IOException` everywhere.

### Sneaky throw (don't)
```java
@SuppressWarnings("unchecked")
public static <T extends Throwable> void sneakyThrow(Throwable e) throws T {
    throw (T) e;
}
```

Hacks around checked exceptions. Don't do this in production — surprising and discouraged. Use proper wrapping instead.

### Lombok's `@SneakyThrows`
Lombok provides `@SneakyThrows` for this:
```java
@SneakyThrows(IOException.class)
public String read() {
    return Files.readString(path);    // checked exception silently rethrown
}
```

Used in some codebases, especially for tests. Controversial.

---

## 8. Best Practices

### Catch only what you can handle
```java
// BAD
try { doStuff(); }
catch (Exception e) { /* ignore */ }    // swallowing exceptions is the worst sin

// Better
try { doStuff(); }
catch (SpecificException e) {
    return defaultValue;
}
```

### Always include context
```java
throw new RuntimeException("failed for user " + userId + " op=" + op, cause);
```

Stack trace alone often isn't enough; what was the input?

### Log AND rethrow, or log and handle. Not both.
```java
// BAD — error logged at every level
try { doStuff(); }
catch (Exception e) {
    log.error("fail", e);
    throw e;
}
// Then upstream:
catch (Exception e) {
    log.error("fail", e);  // duplicate log!
}
```

Log at the top boundary (request handler, scheduled task) or right where you can do something about it.

### Don't catch `NullPointerException`
NPE indicates a programmer bug. Fix the underlying issue (null check, Optional, validation).

### Don't return null on error
```java
// BAD
public User findUser(long id) {
    try { return db.find(id); }
    catch (SQLException e) { return null; }    // caller has no idea what happened
}

// Better — Optional or throw
public Optional<User> findUser(long id) {
    return Optional.ofNullable(db.find(id));
}

public User getUser(long id) {
    User u = db.find(id);
    if (u == null) throw new UserNotFoundException(id);
    return u;
}
```

### Don't use exceptions for control flow
```java
// BAD — using exception to exit loop
try {
    while (true) consumer.poll();
} catch (NoMessagesException e) { /* done */ }

// GOOD — explicit termination
while (consumer.hasMessages()) consumer.poll();
```

Exceptions are slower than normal returns. They're for *exceptional* situations.

### Custom exceptions for domain meaning
```java
throw new InsufficientFundsException(accountId, amount);
```

Better than `throw new RuntimeException("not enough money")` — callers can catch specifically.

### `assert` for invariants (Java assertions)
```java
assert x > 0 : "x must be positive";
```

Only runs with `-ea` flag enabled. Don't use for argument validation or runtime checks — use proper exceptions. `assert` is for "this should never happen" sanity checks during development.

---

## 9. Common Patterns

### Retry with backoff
```java
public static <T> T retry(Supplier<T> action, int maxAttempts) {
    Exception last = null;
    for (int i = 0; i < maxAttempts; i++) {
        try {
            return action.get();
        } catch (Exception e) {
            last = e;
            try {
                Thread.sleep((long) (Math.pow(2, i) * 100));
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("interrupted", ie);
            }
        }
    }
    throw new RuntimeException("retry failed after " + maxAttempts + " attempts", last);
}

User u = retry(() -> fetchUser(id), 3);
```

For production: use a library (Resilience4j, Spring Retry) that handles jitter, max delay, circuit breaking, etc.

### Default on error
```java
String config = readConfig().orElse("default");

// Or with checked exception
String config;
try {
    config = Files.readString(path);
} catch (IOException e) {
    config = "default";
}
```

### Translate exceptions at boundaries
```java
// In a REST controller
@ExceptionHandler(UserNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException e) {
    return ResponseEntity.status(404).body(new ErrorResponse(e.getMessage()));
}
```

Spring's controller advice or middleware in other frameworks centralizes the mapping.

### Cleanup with try-with-resources
```java
public List<String> readLines(Path path) throws IOException {
    try (var stream = Files.lines(path)) {
        return stream.collect(Collectors.toList());
    }
    // stream auto-closed
}
```

### Wrapping checked exceptions for streams
```java
list.stream()
    .map(path -> {
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    })
    .toList();
```

Or extract a helper:
```java
public static String readUnchecked(Path p) {
    try { return Files.readString(p); }
    catch (IOException e) { throw new UncheckedIOException(e); }
}

list.stream().map(this::readUnchecked).toList();
```

### Resource cleanup with exception
```java
public static <T> T withResource(Resource r, Function<Resource, T> body) {
    try (r) {
        return body.apply(r);
    } catch (Exception e) {
        log.error("resource operation failed", e);
        throw new RuntimeException(e);
    }
}
```

### Exception-friendly Optional
```java
public Optional<String> readMaybe(Path path) {
    try {
        return Optional.of(Files.readString(path));
    } catch (NoSuchFileException e) {
        return Optional.empty();
    } catch (IOException e) {
        throw new UncheckedIOException(e);
    }
}
```

---

## 10. Common Pitfalls

### Swallowing exceptions
```java
try { doIt(); } catch (Exception e) {}     // never do this
```

Silent failure is the worst. At least log; usually re-throw or handle.

### Catching too broadly
```java
try { ... } catch (Exception e) { ... }
```

Catching `Exception` masks bugs. Catch specific types you can handle; let the rest propagate.

### Losing the cause
```java
throw new RuntimeException("failed");     // BAD — original cause lost
throw new RuntimeException("failed", e);   // GOOD
```

### `finally` returning
```java
public int x() {
    try { return 1; }
    finally { return 2; }       // returns 2
}
```

Surprises. Don't return from finally.

### Throwing in finally
```java
try {
    return value;
} finally {
    cleanup();      // if this throws, the value return is replaced by the exception
}
```

Cleanup errors hide the real errors. Use try-with-resources, or in finally:
```java
finally {
    try { cleanup(); } catch (Exception e) { log.warn("cleanup failed", e); }
}
```

### Catching `InterruptedException` and ignoring
```java
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    // BAD — interrupt flag lost
}

// Correct: re-interrupt
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    // optionally: throw to abort the operation
}
```

`InterruptedException` is special — it signals that another thread asked you to stop. Always re-set the interrupt flag.

### `NullPointerException` everywhere
Modern Java has tools to avoid NPEs:
- `Objects.requireNonNull(x)` at entry points.
- `Optional` for return types.
- `@NonNull` / `@Nullable` annotations (Checker Framework, JSpecify, Lombok, NullAway).

### Generic type with throws
```java
public <X extends Throwable> void doIt() throws X { ... }    // rare; usually unnecessary
```

Lambdas can't throw checked exceptions — be wary of designing APIs that throw checked exceptions if they'll be used in functional contexts.

### `printStackTrace()` in production
```java
catch (Exception e) {
    e.printStackTrace();    // BAD — goes to stderr, not your logger
}
```

Always use your logger:
```java
catch (Exception e) {
    log.error("operation failed", e);
}
```

### Ignoring `Closeable` resources
```java
InputStream in = openStream();
// use it
// in.close() never called → resource leak
```

Always use try-with-resources or `finally` cleanup.

### `Exception` in API signatures
```java
public void doIt() throws Exception { ... }   // BAD — what exceptions specifically?
```

Be specific in `throws`. If you genuinely don't know, you probably should wrap to a runtime exception.

### Logging then rethrowing
```java
catch (Exception e) {
    log.error("error", e);
    throw e;                    // every level logs the same error
}
```

Decide: handle (log + recover) OR rethrow (let caller deal with it). Not both.

### Custom exceptions that lose information
```java
catch (SQLException e) {
    throw new RuntimeException();    // BAD — message, stack trace gone
}
```

Pass the cause and add context:
```java
throw new RuntimeException("failed to load user " + id, e);
```

### Returning from `try` with side effects in `finally`
```java
try {
    return compute();
} finally {
    cache.put(key, ???);     // what value to put?
}
```

Either compute outside the try and put before returning, or rethink the flow.

---

That's the exception model. The shape of robust Java code: clear boundaries between recoverable / unrecoverable, custom exceptions for domain meaning, try-with-resources for cleanup, logging at the top of the request.

Next: concurrency, where exceptions get even more interesting — `08_concurrency.md`.
