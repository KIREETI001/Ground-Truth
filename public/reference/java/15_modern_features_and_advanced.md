# 15. Modern Features & Advanced

> Pattern matching, records deep dive, sealed types in depth, virtual threads, scoped values, and a curated reference of common pitfalls.

> If you're maintaining old code, this file shows you what to look for when modernizing. If you're starting fresh, these are the patterns.

---

## Table of Contents

1. [Pattern Matching](#1-pattern-matching)
2. [Records — Beyond the Basics](#2-records--beyond-the-basics)
3. [Sealed Types Deep Dive](#3-sealed-types-deep-dive)
4. [Virtual Threads (Project Loom)](#4-virtual-threads-project-loom)
5. [Structured Concurrency](#5-structured-concurrency)
6. [Scoped Values](#6-scoped-values)
7. [The `java.time` API](#7-the-javatime-api)
8. [Optional Patterns](#8-optional-patterns)
9. [Reflection and `MethodHandles`](#9-reflection-and-methodhandles)
10. [Modules (JPMS)](#10-modules-jpms)
11. [Common Pitfalls Reference](#11-common-pitfalls-reference)

---

## 1. Pattern Matching

A multi-feature evolution. Started with `instanceof` patterns, grew to switch patterns, will continue.

### Pattern matching for `instanceof` (Java 16+)
```java
// Pre-pattern matching:
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// With pattern matching:
if (obj instanceof String s) {
    System.out.println(s.length());
}
```

The `s` is in scope for the `true` branch.

### Negation
```java
if (!(obj instanceof String s)) return;
System.out.println(s.length());     // s is in scope here (after return)
```

### Pattern matching for switch (Java 21+)
```java
sealed interface Shape permits Circle, Square, Rectangle {}
record Circle(double radius) implements Shape {}
record Square(double side) implements Shape {}
record Rectangle(double width, double height) implements Shape {}

double area = switch (shape) {
    case Circle c    -> Math.PI * c.radius() * c.radius();
    case Square s    -> s.side() * s.side();
    case Rectangle r -> r.width() * r.height();
};
```

Exhaustive when all sealed permitted types are covered.

### Record patterns (Java 21+)
Destructure records:
```java
double area = switch (shape) {
    case Circle(double r)             -> Math.PI * r * r;
    case Square(double s)             -> s * s;
    case Rectangle(double w, double h) -> w * h;
};
```

Nested patterns:
```java
record Point(int x, int y) {}
record Line(Point start, Point end) {}

double length(Line line) {
    return switch (line) {
        case Line(Point(int x1, int y1), Point(int x2, int y2)) ->
            Math.hypot(x2 - x1, y2 - y1);
    };
}
```

### Guards in switch
```java
double area = switch (shape) {
    case Circle c when c.radius() > 0 -> Math.PI * c.radius() * c.radius();
    case Circle c                       -> 0;    // negative radius
    case Square s                       -> s.side() * s.side();
    default                              -> 0;
};
```

The `when` clause adds a condition to the pattern.

### Null handling in switch
```java
String describe(Object obj) {
    return switch (obj) {
        case null         -> "nothing";
        case String s     -> "string: " + s;
        case Integer i    -> "int: " + i;
        default           -> "something";
    };
}
```

Pre-21, `switch (null)` threw NPE. Now you can match null explicitly.

### Combining type and null
```java
case null, String s -> handleStringOrNull(s);    // not allowed; null and binding don't mix nicely
case null              -> "null";
case String s          -> "string: " + s;
```

### When pattern matching shines
- Dispatching on type — replaces visitor pattern.
- Working with sealed unions — exhaustive, no missed cases.
- Destructuring records for one-time access.

It's the closest Java gets to functional languages' algebraic data types + pattern matching.

---

## 2. Records — Beyond the Basics

```java
public record User(long id, String name, String email) {}
```

Auto-generates: canonical constructor, accessors, `equals`, `hashCode`, `toString`.

### Compact constructor — validation / normalization
```java
public record User(long id, String name, String email) {
    public User {       // compact constructor — runs before assignment
        Objects.requireNonNull(name);
        Objects.requireNonNull(email);
        if (id <= 0) throw new IllegalArgumentException("id must be positive");
        name = name.trim();
        email = email.toLowerCase();
    }
}
```

### Static factories
```java
public record Money(long cents, String currency) {
    public static Money zero(String currency) {
        return new Money(0, currency);
    }
    
    public static Money dollars(double amount) {
        return new Money(Math.round(amount * 100), "USD");
    }
}
```

### Methods on records
```java
public record Range(int start, int end) {
    public boolean contains(int value) {
        return value >= start && value < end;
    }
    
    public int length() {
        return end - start;
    }
    
    public Range shifted(int by) {
        return new Range(start + by, end + by);
    }
}
```

### Records implementing interfaces
```java
sealed interface Event permits UserCreated, OrderPlaced {}
record UserCreated(long userId, Instant at) implements Event {}
record OrderPlaced(long orderId, long userId, Instant at) implements Event {}
```

Records can implement multiple interfaces but can't extend other classes (they implicitly extend `Record`).

### Generic records
```java
public record Pair<A, B>(A first, B second) {}

Pair<String, Integer> p = new Pair<>("age", 30);
```

### Records as DTOs
```java
public record UserDTO(long id, String name, String email) {
    public static UserDTO from(User user) {
        return new UserDTO(user.getId(), user.getName(), user.getEmail());
    }
}
```

### Wither pattern
Records are immutable. To "modify," create a new one:
```java
public record User(long id, String name, String email) {
    public User withName(String newName) {
        return new User(id, newName, email);
    }
    
    public User withEmail(String newEmail) {
        return new User(id, name, newEmail);
    }
}

User updated = user.withName("Alicia");
```

A bit verbose for records with many fields. Workaround: use Lombok's `@With` on a regular class, or build helper methods, or accept the verbosity. Some IDEs auto-generate withers.

### Records vs classes
Use records when:
- Immutable.
- Value semantics (equality by content).
- No inheritance needed.
- Fits "data carrier" role.

Use classes when:
- Mutable state.
- Inheritance from a base class.
- Identity (vs value) matters.

### Limitations
- Can't extend other classes (only implicit `Record`).
- All fields are final.
- No "default" constructor — must have explicit canonical or use defaults.

### Records and serialization
Records work seamlessly with:
- Jackson (JSON).
- JPA (Java 14+ in Hibernate; Spring Data adapts).
- Java serialization (if needed; but don't use Java serialization).
- jOOQ.

---

## 3. Sealed Types Deep Dive

A sealed class/interface explicitly lists allowed subtypes:

```java
public sealed interface Result<T> permits Success, Failure {}

public record Success<T>(T value) implements Result<T> {}
public record Failure<T>(String error) implements Result<T> {}
```

### Permitted types must be in the same module / package by default
The `permits` clause:
```java
public sealed interface Animal permits Dog, Cat, Bird {}
```

Each permitted type must be declared as:
- `final` — can't be subclassed.
- `sealed` — restricts further with its own `permits`.
- `non-sealed` — opens up again (rare).

```java
public final class Dog implements Animal { ... }
public sealed class Cat implements Animal permits HouseCat, StreetCat { ... }
public non-sealed class Bird implements Animal { ... }    // anyone can subclass
```

### Exhaustive switch
```java
public <T> T handle(Result<T> result) {
    return switch (result) {
        case Success<T> s -> s.value();
        case Failure<T> f -> throw new RuntimeException(f.error());
    };
}
```

No `default` needed — compiler verifies all permitted types are covered.

If you add `Cancelled` to the `permits` list, this switch fails to compile until you handle it.

### Modeling state machines
```java
public sealed interface OrderState permits Pending, Paid, Shipped, Delivered, Cancelled {}

public record Pending(Instant createdAt) implements OrderState {}
public record Paid(Instant paidAt, String transactionId) implements OrderState {}
public record Shipped(Instant shippedAt, String trackingNumber) implements OrderState {}
public record Delivered(Instant deliveredAt) implements OrderState {}
public record Cancelled(Instant cancelledAt, String reason) implements OrderState {}
```

Each state has its own data (no "the field that's only set when shipped"). The discriminated union is enforced by the type system.

### When sealed types win
- Discrete sets of variants (states, events, commands).
- ASTs / interpreters.
- Result / Either types.
- Parser output.

### Combined with pattern matching
```java
String describe(OrderState state) {
    return switch (state) {
        case Pending p                  -> "Order created at " + p.createdAt();
        case Paid(var at, var txId)      -> "Paid at " + at + " (tx: " + txId + ")";
        case Shipped(var at, var trk)    -> "Shipped at " + at + " (tracking: " + trk + ")";
        case Delivered d                  -> "Delivered at " + d.deliveredAt();
        case Cancelled(var at, var reason) -> "Cancelled: " + reason;
    };
}
```

`var` in patterns infers the type. Records destructure naturally.

This is Java approaching the expressiveness of ML/Haskell/Rust for ADT-style modeling.

---

## 4. Virtual Threads (Project Loom)

Recap from `08_concurrency.md`: virtual threads are lightweight, JVM-managed threads. Millions can exist on a JVM.

### The model shift
Old advice: "thread-per-request doesn't scale; use reactive programming."

New reality: thread-per-request **does** scale, because threads are virtually free.

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1_000_000; i++) {
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(10));
            return null;
        });
    }
}
```

1 million concurrent blocked threads. Used to require Netty + reactive frameworks. Now it just works.

### When to use
- Web servers (Spring Boot 3.2+ enables them).
- Database-heavy services.
- Microservice orchestration.
- Anywhere with blocking I/O.

### When traditional threads are still right
- **CPU-bound work** — virtual threads still need carriers. Use a fixed pool sized to cores.
- **Native code calls that block** — these pin the carrier thread.
- **Heavy `synchronized`** — pins the carrier (until Java 24+).

### Pinning
A virtual thread is "pinned" when it can't be unmounted from its carrier:
- Inside `synchronized` blocks (pre-Java 24).
- During JNI calls.

Detect pinning:
```bash
java -Djdk.tracePinnedThreads=full -jar app.jar
```

Fix:
- Replace `synchronized` with `ReentrantLock`.
- Avoid long blocking operations under `synchronized`.

### Library compatibility
Most libraries work fine. Specific known issues:
- Older versions of Apache HttpClient, Tomcat had pinning issues — updated long ago.
- JNI-heavy code (some database drivers in edge cases).

In 2026, virtual thread support is mature.

### `Thread.ofVirtual()` factory
```java
Thread t = Thread.ofVirtual().name("worker").unstarted(task);
t.start();

ThreadFactory factory = Thread.ofVirtual().factory();
```

For controlled thread creation.

---

## 5. Structured Concurrency

Preview in Java 21+, may stabilize in 23/24/25. The model: child tasks must complete (success or failure) before the scope exits.

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> user = scope.fork(() -> fetchUser(id));
    Subtask<Order> order = scope.fork(() -> fetchOrder(id));
    
    scope.join();             // wait for all
    scope.throwIfFailed();    // throw if any failed
    
    return new Response(user.get(), order.get());
}
```

If either subtask throws, the other is canceled. The scope ensures cleanup.

### Variants
- **`ShutdownOnFailure`** — cancel siblings on failure.
- **`ShutdownOnSuccess<T>`** — cancel siblings when one succeeds (for redundant queries).

### Compared to CompletableFuture
```java
// CompletableFuture style
CompletableFuture<User> uf = CompletableFuture.supplyAsync(() -> fetchUser(id));
CompletableFuture<Order> of = CompletableFuture.supplyAsync(() -> fetchOrder(id));

UserOrderInfo result = uf.thenCombine(of, UserOrderInfo::new).join();
// What if one fails? The other keeps running.
```

Structured concurrency makes the failure model clear and resource cleanup automatic.

### When to use
- Fan-out parallel work that should all succeed.
- Cancellation should propagate to siblings.
- Resources (threads, connections) should be cleaned up deterministically.

Watch the Java release notes — this is evolving.

---

## 6. Scoped Values

Replacement for ThreadLocal. Safer with virtual threads and structured concurrency.

```java
public final class Auth {
    public static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();
}

// Bind
ScopedValue.where(Auth.CURRENT_USER, user).run(() -> {
    // Inside this lambda, CURRENT_USER is bound to user
    doWork();
});
// Outside, it's unbound — accessing throws
```

### Reading
```java
public void doWork() {
    User u = Auth.CURRENT_USER.get();     // throws if not bound
    if (Auth.CURRENT_USER.isBound()) { ... }
}
```

### Advantages over ThreadLocal
- **Immutable** — set at scope boundary, can't be modified.
- **Bounded lifetime** — automatic cleanup.
- **No leaks** — doesn't persist beyond scope.
- **Cheaper** — no per-thread map lookup.

### When ThreadLocal is still needed
- Mutable per-thread state (rare).
- Libraries that haven't migrated.
- When you actually need cross-scope persistence.

Most "current user" / "request context" patterns map naturally to ScopedValue.

Status: preview in Java 21, expected to stabilize.

---

## 7. The `java.time` API

The modern date/time API (Java 8+). Replaces the broken `java.util.Date`.

### Core types

| Type | Represents | Example use |
|---|---|---|
| `Instant` | Point in time (UTC) | Timestamp of an event |
| `LocalDate` | Date without time | Birthday |
| `LocalTime` | Time without date | Meeting time |
| `LocalDateTime` | Date and time, no zone | Meeting at a specific local time |
| `ZonedDateTime` | Date, time, and timezone | Event in Berlin |
| `OffsetDateTime` | Date, time, and offset (no zone rules) | API timestamps |
| `Duration` | Time span (seconds/nanos) | "10 minutes" |
| `Period` | Calendar span (years/months/days) | "3 months" |
| `ZoneId` | Timezone | Europe/Berlin |

### Common operations
```java
Instant now = Instant.now();
LocalDate today = LocalDate.now();
LocalDate tomorrow = today.plusDays(1);
LocalDate lastMonth = today.minusMonths(1);

LocalDateTime meeting = LocalDateTime.of(2024, 6, 15, 14, 30);
ZonedDateTime meetingBerlin = meeting.atZone(ZoneId.of("Europe/Berlin"));

Duration sleep = Duration.ofMinutes(8 * 60);
Duration runTime = Duration.between(start, end);

Period age = Period.between(birthday, today);
int years = age.getYears();
```

### Formatting and parsing
```java
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
String s = meeting.format(fmt);     // "2024-06-15 14:30"
LocalDateTime parsed = LocalDateTime.parse(s, fmt);

// ISO 8601
String iso = Instant.now().toString();   // "2024-06-15T12:34:56.789Z"
Instant fromIso = Instant.parse(iso);

DateTimeFormatter.ISO_LOCAL_DATE.format(today);
```

### What to use when
- **`Instant`** for timestamps (events, audit fields). Stored as UTC.
- **`LocalDate`** for calendar dates (birthdays, due dates).
- **`LocalDateTime`** for "wall clock" times that are timezone-independent.
- **`ZonedDateTime`** when you need timezone awareness (scheduling across regions).
- **`OffsetDateTime`** for fixed UTC offset (some APIs prefer this).

### Don't use
- `java.util.Date` — broken, mutable, deprecated for most uses.
- `java.util.Calendar` — same.
- `java.text.SimpleDateFormat` — not thread-safe.

### JPA / database
Hibernate maps `Instant` to `TIMESTAMP WITH TIME ZONE` (Postgres) or equivalent. Maps `LocalDate` to `DATE`. Works seamlessly.

For columns originally `TIMESTAMP WITHOUT TIME ZONE` (legacy):
```java
@Column(name = "created_at")
private LocalDateTime createdAt;     // ambiguous timezone — be careful
```

Prefer storing timestamps as UTC (`Instant` + `TIMESTAMPTZ`).

### Time zone pitfalls
- "Local time" is ambiguous if you don't know the zone.
- DST transitions skip or repeat hours.
- Server timezone might differ from user timezone.
- Always store in UTC; convert to local at the boundary (display).

### Jackson + java.time
```java
ObjectMapper mapper = new ObjectMapper()
    .registerModule(new JavaTimeModule())
    .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
```

Spring Boot does this automatically.

---

## 8. Optional Patterns

### Chaining
```java
String city = findUser(id)
    .flatMap(User::getAddress)
    .map(Address::getCity)
    .orElse("unknown");
```

### `ifPresentOrElse`
```java
findUser(id).ifPresentOrElse(
    user -> log.info("found {}", user),
    () -> log.warn("not found")
);
```

### `or` for fallback
```java
User u = findInCache(id)
    .or(() -> findInDb(id))
    .or(() -> Optional.of(defaultUser))
    .get();
```

### `Optional.stream` (Java 9+)
Convert Optional to a 0 or 1 element Stream — useful for flatMap:
```java
List<User> found = ids.stream()
    .map(this::findUser)         // Stream<Optional<User>>
    .flatMap(Optional::stream)    // Stream<User>
    .toList();
```

### Don't
- Don't return `null` from a method that should return `Optional`.
- Don't use `Optional` as a field — bad style, breaks serialization.
- Don't use `Optional` as a parameter — overload methods instead.
- Don't call `.get()` without `isPresent()` — use `orElseThrow` for explicitness.

### `orElseThrow`
```java
User u = findUser(id).orElseThrow();    // NoSuchElementException
User u = findUser(id).orElseThrow(() -> new UserNotFoundException(id));
```

Most idiomatic.

---

## 9. Reflection and `MethodHandles`

### Reflection
Inspect classes at runtime:
```java
Class<User> userClass = User.class;
String name = userClass.getName();
Method[] methods = userClass.getDeclaredMethods();
Field[] fields = userClass.getDeclaredFields();

// Read a field
Field f = userClass.getDeclaredField("name");
f.setAccessible(true);
String value = (String) f.get(user);

// Call a method
Method m = userClass.getDeclaredMethod("toString");
String s = (String) m.invoke(user);
```

### Use cases
- Frameworks (Spring, Hibernate).
- Serialization (Jackson, Gson).
- Testing (Mockito).
- Code generation.

### Don't use in application code
Reflection is:
- Slow (much slower than direct calls).
- Bypasses encapsulation.
- Breaks at runtime when the target changes.
- Not friendly to native image / GraalVM.

For application logic, find a direct way.

### `MethodHandles` (Java 7+)
A faster, type-safer alternative to reflection. Used by some libraries.
```java
MethodHandles.Lookup lookup = MethodHandles.lookup();
MethodHandle mh = lookup.findVirtual(String.class, "toUpperCase",
    MethodType.methodType(String.class));
String result = (String) mh.invoke("hello");
```

Rarely used directly; mostly relevant if you're writing a serialization library.

---

## 10. Modules (JPMS)

Java Platform Module System (Java 9+). A way to split the JDK and apps into modules with explicit dependencies.

### `module-info.java`
```java
module com.example.myapp {
    requires java.sql;
    requires spring.context;
    requires transitive com.example.shared;
    
    exports com.example.myapp.api;
    exports com.example.myapp.spi to com.example.plugin;
    
    opens com.example.myapp.model to com.fasterxml.jackson.databind;
}
```

- `requires X` — depends on module X.
- `requires transitive X` — re-exports X to consumers.
- `exports pkg` — makes `pkg` accessible to other modules.
- `exports pkg to M` — only to module M.
- `opens pkg` — reflection access.
- `provides / uses` — service loader pattern.

### Adoption
Many libraries are now modular (have `module-info`). Many aren't. Spring Boot apps typically don't use modules — too much friction.

### When modules help
- Building modular libraries / frameworks.
- Distributing components.
- Building custom JREs with `jlink`:
  ```bash
  jlink --modules java.base,com.example.myapp --output dist/runtime
  ```
- Strong encapsulation guarantees.

### When modules hurt
- Most app code — the classpath model is simpler.
- Mixed module / non-module dependencies cause headaches.
- Reflection-heavy frameworks need `opens` declarations.

In 2026, modules are uncommon in application code. Useful for JDK and certain libraries; few apps adopt them.

---

## 11. Common Pitfalls Reference

A curated list of bugs that bite even experienced Java devs. Cross-referenced to other files for depth.

### `==` for object equality
```java
String a = new String("hi");
String b = new String("hi");
a == b;        // false
a.equals(b);   // true
```

Use `.equals()` for value equality. `==` only for primitives or reference identity.

### `equals` without `hashCode`
Breaks hash-based collections. Always override together (or use records).

### Comparing `Integer` with `==`
```java
Integer a = 1000;
Integer b = 1000;
a == b;        // false! (autoboxed, distinct objects)
a.equals(b);    // true
```

Small integers (-128 to 127) are cached, larger aren't. Always use `.equals()` or unbox.

### Mutable default parameters
Not a thing in Java (unlike Python). Each call creates a fresh local. But:
```java
private final List<String> defaults = new ArrayList<>();
public void doIt(List<String> items) {
    if (items == null) items = defaults;
    items.add("X");    // BAD — mutates the shared default!
}
```

Defensive copy if you'll mutate.

### Returning mutable internal state
```java
public List<String> getItems() {
    return items;    // caller can modify your internal list
}
```

Return a copy or `Collections.unmodifiableList(items)`.

### `null` propagation
```java
user.getProfile().getAddress().getCity();    // NPE chain
```

Use Optional or explicit null checks.

### Catching too broadly
```java
try { ... } catch (Exception e) { /* ignore */ }
```

Catch specific exceptions; never swallow.

### Resource leaks
```java
InputStream in = new FileInputStream(file);
// ... process ...
in.close();      // never reached if process throws
```

Always try-with-resources.

### Forgetting `@Override`
```java
class Sub extends Base {
    public String tostring() { return "..."; }     // typo — creates new method
}
```

Always use `@Override`.

### Mutating in lambda captured collections
```java
List<String> log = new ArrayList<>();
list.forEach(x -> log.add(x));    // not thread-safe if list is parallel
```

For parallel streams, use thread-safe collections or proper collectors.

### `forEach` on a Stream after a chain
```java
stream().filter(...).map(...).forEach(...);
```

OK in itself. But:
```java
stream().filter(...).forEach(list::add);    // BAD — mutating outside the stream
```

Use `.collect()` or `.toList()`.

### Modifying collection during iteration
```java
for (String s : list) {
    if (...) list.remove(s);    // ConcurrentModificationException
}
```

Use `Iterator.remove()` or `removeIf`.

### Boxing/unboxing in hot loops
```java
Map<String, Integer> counts = ...;
for (...) counts.put(key, counts.get(key) + 1);    // boxes on each increment
```

Use `counts.merge(key, 1, Integer::sum)` — much faster.

### String concatenation in loops
```java
String s = "";
for (...) s += part;     // O(n²)
```

Use `StringBuilder` (or `Collectors.joining`).

### Comparing strings with `==`
```java
if (mode == "fast") { ... }    // often false even when literally true
```

Use `.equals()` or `.equalsIgnoreCase()`. Best: prefix the constant: `"fast".equals(mode)` — null-safe.

### Floating-point comparison
```java
0.1 + 0.2 == 0.3;    // false
```

For money: `BigDecimal`. For floats: `Math.abs(a - b) < epsilon`.

### `BigDecimal` from double
```java
new BigDecimal(0.1);    // 0.1000000000000000055511151231257827021181583404541015625
new BigDecimal("0.1");   // 0.1 exactly
```

Always construct from String.

### `Math.abs(Integer.MIN_VALUE)`
Returns `Integer.MIN_VALUE` (negative!). Use `Math.absExact` (Java 15+).

### Integer overflow
```java
int x = 2_000_000_000;
x + 200_000_000;    // wraps around to negative
Math.addExact(x, 200_000_000);    // throws
```

Use `Math.*Exact` when correctness matters.

### Division by zero
- Integer: `ArithmeticException`.
- Floating: `Infinity` or `NaN`.

```java
1.0 / 0;     // Infinity
0.0 / 0;     // NaN
```

`Double.isNaN(x)` to check.

### `null` keys in `HashMap` are allowed
But `ConcurrentHashMap` doesn't allow them. Inconsistency.

### `entrySet().forEach` boxing
```java
map.entrySet().forEach(e -> System.out.println(e.getKey() + ": " + e.getValue()));
```

Fine in most cases. For perf-critical code, `map.forEach((k, v) -> ...)` avoids the Entry allocation.

### Synchronized on `String` literal
```java
synchronized ("global") { ... }    // BAD — interned, shared globally
```

Use a private final lock object.

### Catching `InterruptedException` and ignoring
```java
catch (InterruptedException e) { /* ignore */ }
```

Restore the flag: `Thread.currentThread().interrupt();`

### Static fields and class loading
Static initializers run when the class is first loaded. Heavy work there delays startup. Be careful with:
```java
private static final BigData DATA = loadData();    // delays loading the class
```

Use lazy init if data is rarely needed.

### Inner classes capturing outer
```java
public class Outer {
    public class Inner { ... }
}
```

Inner instances hold a reference to Outer. Can cause memory issues. Use `static` nested classes when not needed.

### Anonymous classes capturing outer
Same issue. Modern lambdas don't have this (they're independent).

### Forgetting `@Transactional` on a Spring service method
```java
public void doStuff() {
    repo.save(x);
    repo.update(y);
}
```

No tx; each call is auto-committed. Add `@Transactional`.

### Self-invocation breaking `@Transactional`
```java
@Service class S {
    public void outer() { this.inner(); }
    @Transactional public void inner() { ... }    // bypassed!
}
```

Inject self or restructure.

### `e.printStackTrace()`
Use a logger instead. Stack traces in stderr aren't captured by your observability stack.

### Java logging confusion
Multiple logging libraries: JUL, Log4j 1, Log4j 2, Logback, Commons Logging. Spring Boot uses **SLF4J + Logback** by default. Other deps bring their own logging.

Bridge them: `jcl-over-slf4j`, `log4j-over-slf4j`, `jul-to-slf4j` libraries.

### Hardcoded paths
```java
Path p = Path.of("/Users/me/data");
```

Won't work on other machines. Use:
- Config files / environment variables.
- `System.getProperty("user.home")` for home.
- `Files.createTempFile` for temp.

### Time zone in production
- Server time zone differs from user / data assumptions.
- Run server in UTC: `-Duser.timezone=UTC`.
- Always store timestamps as UTC.

### File encoding
```java
Files.readString(path);    // default UTF-8 in Java 18+
new FileReader(file);       // platform default (may not be UTF-8!)
```

Use the `java.nio.file` API or explicit charset.

### Hashing passwords with MD5 / SHA-1
**Never.** Use bcrypt, argon2, or scrypt via Spring Security or libraries.

### Logging sensitive data
- Passwords, tokens, PII in logs.
- Set up redaction (e.g., Logback's `%mask`).
- Don't log full request bodies in prod.

### Caching everything
- Caches without eviction → memory leak.
- Stale cache → bugs.
- Distributed cache invalidation → famously hard.

Use Caffeine for in-memory caches with eviction:
```java
Cache<Long, User> cache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(Duration.ofMinutes(10))
    .build();
```

### Background threads and JVM shutdown
A non-daemon thread keeps the JVM alive. ExecutorService threads are non-daemon by default. Always shutdown executors on JVM exit:
```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    executor.shutdown();
    // ...
}));
```

### Hibernate `LazyInitializationException`
Accessing lazy fields outside a transaction. Fix by fetching eagerly when needed (JOIN FETCH), or by mapping to DTOs.

### Hibernate N+1
Loading entities, then accessing collections one by one. Detect with SQL logging. Fix with `JOIN FETCH` or `@EntityGraph`.

### `Open in View` masking issues
Spring Boot enables this by default. Disable in production:
```yaml
spring.jpa.open-in-view: false
```

### Misusing reactive
- WebFlux is for specific use cases (streaming, very high concurrency before virtual threads).
- With virtual threads, traditional Spring MVC handles most workloads cleanly.
- Don't pick reactive because it sounds modern.

### Premature microservices
- A modular monolith deploys easier, debugs easier, scales further than most teams expect.
- Microservices are a deployment / org choice, not an architecture target.
- Spring Boot can serve hundreds of millions of requests/day on a few machines.

---

That's Java. Fifteen files, the language as it actually exists in 2026:
- Records, sealed types, pattern matching for data modeling.
- Virtual threads for concurrency.
- Streams + lambdas for transformations.
- Spring Boot for everything else.

Key principles:
1. **Use modern features.** Records, sealed types, pattern matching, virtual threads — they exist for a reason.
2. **Prefer composition over inheritance.**
3. **Immutability when possible.** Records, `final`, immutable collections.
4. **Validate at boundaries.** Bean Validation + custom checks.
5. **Spring Boot for backend services.** Don't fight the ecosystem.
6. **Test pyramid.** Many unit tests, fewer integration tests, even fewer E2E.
7. **Boring tech.** Postgres, JPA, Spring Boot, plain Java. Maturity beats hype.
8. **Observability from day one.** Logs, metrics, traces.
9. **The JVM is fast.** Most perf problems are application code.
10. **Migrations are non-negotiable** in any project touching a database.

Next folder: C#, which shares much DNA with Java but has its own ecosystem and culture.
