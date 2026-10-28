# 06. Streams & Lambdas

> Functional interfaces, lambdas, method references, streams, collectors. The modern functional toolkit.

> Introduced in Java 8 (2014) and steadily improved. Modern Java code uses these heavily.

---

## Table of Contents

1. [Functional Interfaces](#1-functional-interfaces)
2. [Lambdas](#2-lambdas)
3. [Method References](#3-method-references)
4. [Streams — Overview](#4-streams--overview)
5. [Common Stream Operations](#5-common-stream-operations)
6. [Collectors](#6-collectors)
7. [Primitive Streams](#7-primitive-streams)
8. [Optional](#8-optional)
9. [Parallel Streams](#9-parallel-streams)
10. [When NOT to Use Streams](#10-when-not-to-use-streams)
11. [Common Patterns](#11-common-patterns)

---

## 1. Functional Interfaces

A functional interface is an interface with exactly one abstract method (`@FunctionalInterface`).

Built-in ones in `java.util.function`:

| Interface | Method | Use |
|---|---|---|
| `Function<T, R>` | `R apply(T t)` | Transform T to R |
| `BiFunction<T, U, R>` | `R apply(T t, U u)` | Combine two values |
| `Predicate<T>` | `boolean test(T t)` | Filter / check |
| `BiPredicate<T, U>` | `boolean test(T t, U u)` | Two-arg check |
| `Consumer<T>` | `void accept(T t)` | Side effect with input |
| `BiConsumer<T, U>` | `void accept(T t, U u)` | Two-arg side effect |
| `Supplier<T>` | `T get()` | Produce a value |
| `UnaryOperator<T>` | `T apply(T t)` | Function<T, T> |
| `BinaryOperator<T>` | `T apply(T a, T b)` | BiFunction<T, T, T> |
| `Runnable` | `void run()` | No args, no return |
| `Callable<V>` | `V call() throws Exception` | Supplier that can throw |

Primitive specializations exist: `IntFunction<R>`, `ToIntFunction<T>`, `IntPredicate`, etc. — avoid boxing.

```java
Function<String, Integer> length = s -> s.length();
Predicate<Integer> isEven = n -> n % 2 == 0;
Consumer<String> println = System.out::println;
Supplier<List<String>> emptyList = ArrayList::new;
BiFunction<Integer, Integer, Integer> add = Integer::sum;

length.apply("hello");     // 5
isEven.test(4);             // true
println.accept("hi");       // prints "hi"
emptyList.get();             // new empty list
add.apply(2, 3);             // 5
```

### Composition
```java
Function<Integer, Integer> times2 = n -> n * 2;
Function<Integer, Integer> plus10 = n -> n + 10;

Function<Integer, Integer> combo = times2.andThen(plus10);   // (n * 2) + 10
combo.apply(5);    // 20

Function<Integer, Integer> combo2 = times2.compose(plus10);   // (n + 10) * 2
combo2.apply(5);   // 30

Predicate<String> short_ = s -> s.length() < 5;
Predicate<String> startsWithA = s -> s.startsWith("a");
Predicate<String> both = short_.and(startsWithA);
Predicate<String> either = short_.or(startsWithA);
Predicate<String> not = short_.negate();
```

---

## 2. Lambdas

A lambda is shorthand for an anonymous implementation of a functional interface.

```java
// Pre-lambda (anonymous class)
Runnable r = new Runnable() {
    @Override
    public void run() {
        System.out.println("hi");
    }
};

// Lambda
Runnable r = () -> System.out.println("hi");
```

### Syntax forms
```java
// No params
() -> doStuff()
() -> { stmt1(); stmt2(); }

// One param (parens optional)
x -> x * 2
(x) -> x * 2
(int x) -> x * 2

// Multiple params (parens required)
(x, y) -> x + y
(int x, int y) -> x + y

// Body — single expression OR block
x -> x.length()
x -> { return x.length(); }
```

### Capturing variables
Lambdas can capture local variables, but they must be **effectively final** (assigned once):
```java
int multiplier = 3;
Function<Integer, Integer> times = x -> x * multiplier;   // OK
multiplier = 4;                                              // ERROR — captured by lambda
```

Captured variables don't have to be declared `final`, but they must not be reassigned after the lambda is created.

This makes lambdas safer than closures in some languages — no surprises from mutated locals.

### Mutating captured collections
The variable can't be reassigned, but objects it references can be mutated:
```java
List<String> log = new ArrayList<>();
Runnable r = () -> log.add("event");   // mutates the list — OK
r.run();
log.size();    // 1
```

This is often a code smell. Stream collectors are cleaner.

### `this` in lambdas
Lambdas don't have their own `this` — they inherit the enclosing context's `this`. Anonymous classes have their own.

```java
public class Service {
    public void run() {
        Runnable r = () -> this.doStuff();   // `this` refers to Service
        Runnable r2 = new Runnable() {
            public void run() {
                this.toString();              // `this` refers to the anonymous Runnable
            }
        };
    }
}
```

---

## 3. Method References

Shorthand for lambdas that just call an existing method.

```java
list.forEach(s -> System.out.println(s));   // lambda
list.forEach(System.out::println);          // method reference

list.stream().map(s -> s.toUpperCase());     // lambda
list.stream().map(String::toUpperCase);      // method reference
```

### Four kinds

#### Static method reference
```java
Function<String, Integer> parse = Integer::parseInt;
parse.apply("42");    // 42
```

#### Bound instance method
```java
String prefix = "Hi, ";
Function<String, String> greet = prefix::concat;
greet.apply("Alice");   // "Hi, Alice"
```

#### Unbound instance method
```java
Function<String, Integer> length = String::length;
length.apply("hello");   // 5
```

The first argument becomes the receiver.

#### Constructor reference
```java
Supplier<ArrayList<String>> newList = ArrayList::new;
Function<Integer, ArrayList<String>> sized = ArrayList::new;   // ArrayList(int capacity)

List<User> users = names.stream()
    .map(User::new)        // String → User (via constructor)
    .toList();
```

### When to use
Method references are usually clearer than lambdas when the lambda is just a method call. They read as: "this operation."

```java
.map(s -> s.toUpperCase())     // a bit noisy
.map(String::toUpperCase)       // clean
```

When the lambda does any work beyond the call, prefer the explicit lambda.

---

## 4. Streams — Overview

A Stream is a pipeline for processing a sequence of elements. Three parts:
1. **Source**: collection, array, generator, etc.
2. **Intermediate operations**: filter, map, sorted, distinct, limit. Return another Stream.
3. **Terminal operation**: collect, forEach, count, reduce. Triggers execution.

```java
List<String> result = users.stream()
    .filter(u -> u.age() >= 18)
    .map(User::name)
    .sorted()
    .toList();
```

### Lazy evaluation
Intermediate operations are lazy — nothing runs until a terminal operation:
```java
Stream<String> s = list.stream()
    .filter(x -> {
        System.out.println("filtering");
        return true;
    });
// Nothing prints yet!

s.count();   // NOW it runs
```

### One-shot
A stream can't be reused:
```java
Stream<String> s = list.stream();
s.count();
s.count();   // IllegalStateException — already consumed
```

Each time, get a fresh stream.

### Common sources
```java
List<String> list = ...;
list.stream();
list.parallelStream();

Stream.of("a", "b", "c");
Stream.empty();
Arrays.stream(arr);
IntStream.range(0, 10);          // 0, 1, ..., 9
IntStream.rangeClosed(1, 10);     // 1, 2, ..., 10
Stream.iterate(1, n -> n * 2);    // 1, 2, 4, 8, ... — infinite
Stream.generate(Math::random);    // infinite
Files.lines(path);                 // lines of a file
Random().ints(100);                 // 100 random ints
```

### Common terminal operations
- `forEach(Consumer)`
- `collect(Collector)` / `.toList()` (Java 16+)
- `count()`
- `reduce(...)`
- `anyMatch(Predicate)`, `allMatch(Predicate)`, `noneMatch(Predicate)`
- `findFirst()`, `findAny()`
- `min(Comparator)`, `max(Comparator)`
- `sum()`, `average()` (primitive streams only)
- `toArray()`

---

## 5. Common Stream Operations

### filter
```java
List<User> adults = users.stream()
    .filter(u -> u.age() >= 18)
    .toList();
```

### map
```java
List<String> names = users.stream()
    .map(User::name)
    .toList();
```

### flatMap
For nested structures:
```java
List<String> allTags = posts.stream()
    .flatMap(post -> post.tags().stream())   // List<List<String>> → List<String>
    .distinct()
    .toList();
```

### sorted
```java
List<User> byAge = users.stream()
    .sorted(Comparator.comparing(User::age))
    .toList();

List<User> byAgeDesc = users.stream()
    .sorted(Comparator.comparing(User::age).reversed())
    .toList();

List<User> byNameThenAge = users.stream()
    .sorted(Comparator
        .comparing(User::name)
        .thenComparing(User::age))
    .toList();
```

### distinct
```java
List<Integer> unique = nums.stream().distinct().toList();
```

Uses `.equals()` and `.hashCode()`.

### limit / skip
```java
List<User> top10 = users.stream().limit(10).toList();
List<User> skipFirst5 = users.stream().skip(5).toList();
List<User> page2 = users.stream().skip(10).limit(10).toList();
```

### peek (for debugging)
```java
list.stream()
    .peek(x -> System.out.println("before filter: " + x))
    .filter(x -> x > 0)
    .peek(x -> System.out.println("after filter: " + x))
    .toList();
```

Intermediate operation that runs a side effect without changing the stream.

### takeWhile / dropWhile (Java 9+)
```java
Stream.of(1, 2, 3, 4, 5, 1, 2)
    .takeWhile(n -> n < 4)    // 1, 2, 3 — stops at first 4
    .toList();

Stream.of(1, 2, 3, 4, 5)
    .dropWhile(n -> n < 3)    // 3, 4, 5 — skips while predicate is true
    .toList();
```

Different from `filter`, which goes through the whole stream.

### count / sum / max / min
```java
long active = users.stream().filter(User::isActive).count();

int total = users.stream().mapToInt(User::age).sum();
OptionalDouble avg = users.stream().mapToInt(User::age).average();

Optional<User> oldest = users.stream().max(Comparator.comparing(User::age));
```

### anyMatch / allMatch / noneMatch
```java
boolean hasAdult = users.stream().anyMatch(u -> u.age() >= 18);
boolean allAdult = users.stream().allMatch(u -> u.age() >= 18);
boolean noMinors = users.stream().noneMatch(u -> u.age() < 18);
```

Short-circuit — stops at first match (or first failure for allMatch).

### findFirst / findAny
```java
Optional<User> first = users.stream()
    .filter(u -> u.name().equals("Alice"))
    .findFirst();

first.ifPresent(System.out::println);
User u = first.orElseThrow();
```

### reduce
```java
int sum = nums.stream().reduce(0, Integer::sum);
int max = nums.stream().reduce(Integer.MIN_VALUE, Integer::max);
String joined = strs.stream().reduce("", String::concat);

// Without identity — returns Optional
Optional<Integer> maybeSum = nums.stream().reduce(Integer::sum);
```

For most cases there's a more idiomatic alternative (`.sum()`, `.max()`, `Collectors.joining()`). Use `reduce` when none of those fit.

---

## 6. Collectors

`Collectors` (in `java.util.stream`) provides ready-made collectors.

### `toList()` and `toSet()`
```java
List<String> list = stream.collect(Collectors.toList());     // mutable
List<String> list2 = stream.toList();                         // Java 16+, immutable
Set<String> set = stream.collect(Collectors.toSet());
List<String> immut = stream.collect(Collectors.toUnmodifiableList());
```

`.toList()` (Java 16+) is the shortest. Returns an immutable list.

### `toMap`
```java
Map<Long, User> usersById = users.stream()
    .collect(Collectors.toMap(User::id, u -> u));

// With merge function for duplicate keys
Map<String, Integer> totalByCategory = items.stream()
    .collect(Collectors.toMap(
        Item::category,
        Item::price,
        Integer::sum));
```

If keys can collide and you don't provide a merge function, `toMap` throws `IllegalStateException`.

### `groupingBy`
```java
Map<String, List<User>> byCity = users.stream()
    .collect(Collectors.groupingBy(User::city));

// With downstream collector
Map<String, Long> countByCity = users.stream()
    .collect(Collectors.groupingBy(User::city, Collectors.counting()));

Map<String, Integer> sumByCity = users.stream()
    .collect(Collectors.groupingBy(User::city, Collectors.summingInt(User::age)));

Map<String, Set<String>> namesByCity = users.stream()
    .collect(Collectors.groupingBy(User::city,
        Collectors.mapping(User::name, Collectors.toSet())));
```

### `partitioningBy`
Like `groupingBy` but with a boolean predicate:
```java
Map<Boolean, List<User>> split = users.stream()
    .collect(Collectors.partitioningBy(u -> u.age() >= 18));
List<User> adults = split.get(true);
List<User> minors = split.get(false);
```

### `joining`
```java
String names = users.stream()
    .map(User::name)
    .collect(Collectors.joining(", "));            // "Alice, Bob, Carol"

String list = users.stream()
    .map(User::name)
    .collect(Collectors.joining(", ", "[", "]"));   // "[Alice, Bob, Carol]"
```

### `summarizingInt`, `summarizingDouble`, etc.
Returns mean, sum, count, min, max:
```java
IntSummaryStatistics stats = users.stream()
    .collect(Collectors.summarizingInt(User::age));
stats.getAverage();
stats.getMin();
stats.getMax();
stats.getCount();
stats.getSum();
```

### `reducing`
```java
Optional<Integer> total = nums.stream().collect(Collectors.reducing(Integer::sum));
int total2 = nums.stream().collect(Collectors.reducing(0, Integer::sum));
```

Less common; usually `reduce` directly or specialized terminals are clearer.

### `teeing` (Java 12+)
Apply two collectors, combine results:
```java
Result r = nums.stream().collect(Collectors.teeing(
    Collectors.summingInt(Integer::intValue),
    Collectors.counting(),
    (sum, count) -> new Result(sum, count)));
```

### Custom collectors
Possible, but rarely needed. Use the built-ins.

---

## 7. Primitive Streams

`IntStream`, `LongStream`, `DoubleStream` — avoid boxing overhead.

```java
IntStream.range(0, 10).forEach(System.out::println);
IntStream.rangeClosed(1, 100).sum();

int sum = users.stream()
    .mapToInt(User::age)         // Stream<User> → IntStream
    .sum();

double avg = nums.stream()
    .mapToInt(Integer::intValue)
    .average()
    .orElse(0);

// Boxed back to Stream<Integer>
Stream<Integer> boxed = IntStream.range(0, 10).boxed();
List<Integer> nums = IntStream.range(0, 10).boxed().toList();
```

Use primitive streams when:
- Computing numeric aggregates over a collection.
- Generating ranges.
- Heavy numeric processing.

Otherwise stick with `Stream<T>`.

---

## 8. Optional

`Optional<T>` represents "value or nothing." Replaces null returns in many APIs.

```java
public Optional<User> findUser(long id) {
    User u = db.find(id);
    return Optional.ofNullable(u);
}

Optional<User> u = findUser(1);

u.isPresent();
u.isEmpty();                  // Java 11+
u.ifPresent(System.out::println);
u.ifPresentOrElse(
    System.out::println,
    () -> System.out.println("not found"));

User user = u.orElse(defaultUser);
User user2 = u.orElseGet(() -> computeDefault());
User user3 = u.orElseThrow();                  // NoSuchElementException
User user4 = u.orElseThrow(() -> new MyException());

Optional<String> name = u.map(User::name);
Optional<User> sameOrParent = u.or(() -> findParent());
String name = u.map(User::name).orElse("anon");
```

### Creating
```java
Optional.empty();
Optional.of(value);            // value must NOT be null — throws otherwise
Optional.ofNullable(maybeNull); // safe for nulls
```

### Streaming
```java
List<Optional<User>> opts = ...;
List<User> present = opts.stream()
    .flatMap(Optional::stream)     // Java 9+ — unwraps non-empty
    .toList();
```

### `Optional.flatMap` for chains
```java
Optional<String> city = findUser(1)
    .flatMap(User::getAddress)
    .map(Address::city);
```

Avoids deep nesting of `if (u != null) { if (u.getAddress() != null) ... }`.

### When NOT to use Optional
- **Fields**: don't. Bad style; use `null` or sentinel for optional fields.
- **Method parameters**: don't. Take the value or overload.
- **Collections**: don't put `Optional<T>` in a list. Use an empty list instead.

### Where to use
- **Return types** of methods that might not find a value.
- **Stream chains** for terminal operations like `findFirst()`.

`Optional` is most useful at API boundaries to make "might be missing" explicit. Don't over-Optional everything.

---

## 9. Parallel Streams

```java
List<String> result = list.parallelStream()
    .filter(...)
    .map(...)
    .toList();
```

Uses the common ForkJoinPool. The stream is split, processed in parallel, then results merged.

### When parallel helps
- Large datasets (thousands+ elements).
- CPU-bound operations (`map` is heavy).
- The operation is **stateless** and **associative**.

### When parallel hurts
- Small datasets — overhead dominates.
- Operations involve I/O or blocking — uses the common pool, blocking other parallel streams.
- Side effects — undefined order, race conditions.
- The pool is shared with other parallel streams — they compete.

### Caveats
- Don't mutate shared state in a parallel stream.
- Don't use `forEachOrdered` if you want speed; it defeats parallelism.
- `collect` is parallel-safe; many `reduce` operations are too if associative.
- Benchmark before assuming parallel is faster.

In production: use parallel streams only when measured benefits justify. For most ETL work, virtual threads (file 08) + sequential streams scale better than parallel streams.

---

## 10. When NOT to Use Streams

### When loops are clearer
```java
// Stream
int total = list.stream().mapToInt(Item::price).sum();

// Loop
int total = 0;
for (Item i : list) total += i.price();
```

Both are fine. Use what reads better in context.

### When you need early exit with complex state
```java
// Hard to express cleanly with streams
for (Item i : list) {
    if (i.bad()) break;
    if (!i.qualifies()) continue;
    process(i);
    if (cap > 10) return;
}
```

Streams can do this with `takeWhile` + flags, but a loop is often clearer.

### Heavy debugging
Loops are easier to step through. Lots of stream chains hide the state at each step.

`peek` helps but doesn't fully solve it.

### When you need indices
Streams don't easily give you the index of each element. Use a loop or:
```java
IntStream.range(0, list.size())
    .forEach(i -> {
        String item = list.get(i);
        // use both i and item
    });
```

Awkward. Loop is better.

### When you need to mutate the source
Streams are read-only.

---

## 11. Common Patterns

### Filter + map + collect
```java
List<String> activeUserEmails = users.stream()
    .filter(User::isActive)
    .map(User::email)
    .toList();
```

### Group + count
```java
Map<String, Long> postsByAuthor = posts.stream()
    .collect(Collectors.groupingBy(Post::author, Collectors.counting()));
```

### Find max by property
```java
Optional<User> oldest = users.stream()
    .max(Comparator.comparing(User::age));
```

### Top N
```java
List<User> top5 = users.stream()
    .sorted(Comparator.comparing(User::score).reversed())
    .limit(5)
    .toList();
```

### Index by ID
```java
Map<Long, User> byId = users.stream()
    .collect(Collectors.toMap(User::id, u -> u));
```

### Flatten nested
```java
List<String> allTags = posts.stream()
    .flatMap(p -> p.tags().stream())
    .distinct()
    .sorted()
    .toList();
```

### Conditional transformation
```java
List<String> names = users.stream()
    .map(u -> u.isAdult() ? u.name() : "(minor)")
    .toList();
```

### Chained Optional
```java
String city = findUser(id)
    .flatMap(User::getAddress)
    .map(Address::city)
    .orElse("unknown");
```

### Reading file lines
```java
try (Stream<String> lines = Files.lines(path)) {
    long matches = lines
        .filter(l -> l.contains("error"))
        .count();
}
```

Important: `Files.lines` returns a Stream that needs closing — use try-with-resources.

### Generate then process
```java
long evens = IntStream.range(0, 100)
    .filter(n -> n % 2 == 0)
    .count();    // 50
```

### Composing predicates
```java
Predicate<User> adult = u -> u.age() >= 18;
Predicate<User> active = User::isActive;
Predicate<User> qualified = adult.and(active);

users.stream().filter(qualified).toList();
```

### Building a CSV from a stream
```java
String csv = users.stream()
    .map(u -> u.id() + "," + u.name() + "," + u.email())
    .collect(Collectors.joining("\n", "id,name,email\n", ""));
```

### Counting occurrences
```java
Map<String, Long> wordCounts = words.stream()
    .collect(Collectors.groupingBy(w -> w, Collectors.counting()));
```

---

Streams and lambdas changed how Java code is written. Modern Java leans into them heavily — most data-transformation code uses streams, with loops reserved for cases where streams don't fit cleanly.

Next: errors and exceptions — `07_errors_and_exceptions.md`.
