# 05. Generics

> Generic classes, methods, bounded type parameters, wildcards, and the realities of type erasure.

---

## Table of Contents

1. [Why Generics](#1-why-generics)
2. [Generic Classes](#2-generic-classes)
3. [Generic Methods](#3-generic-methods)
4. [Bounded Type Parameters](#4-bounded-type-parameters)
5. [Wildcards](#5-wildcards)
6. [PECS](#6-pecs)
7. [Type Erasure](#7-type-erasure)
8. [Common Patterns](#8-common-patterns)
9. [Pitfalls](#9-pitfalls)

---

## 1. Why Generics

Before generics (pre-Java 5):
```java
List names = new ArrayList();
names.add("Alice");
names.add(42);                    // compiles fine — bag of Object
String first = (String) names.get(0);   // manual cast everywhere
String second = (String) names.get(1);   // ClassCastException at runtime
```

With generics:
```java
List<String> names = new ArrayList<>();
names.add("Alice");
names.add(42);                     // compile error
String first = names.get(0);        // no cast needed
```

Generics give:
- **Type safety** at compile time.
- **No casts** in client code.
- **API clarity** — `List<User>` says exactly what's inside.

---

## 2. Generic Classes

```java
public class Box<T> {
    private T value;
    
    public Box(T value) { this.value = value; }
    public T getValue() { return value; }
    public void setValue(T value) { this.value = value; }
}

Box<String> stringBox = new Box<>("hello");
String s = stringBox.getValue();    // no cast

Box<Integer> intBox = new Box<>(42);
Integer n = intBox.getValue();
```

`T` is a **type parameter** — a placeholder for an actual type.

### Multiple type parameters
```java
public class Pair<A, B> {
    private final A first;
    private final B second;
    
    public Pair(A first, B second) {
        this.first = first;
        this.second = second;
    }
    
    public A first() { return first; }
    public B second() { return second; }
}

Pair<String, Integer> pair = new Pair<>("age", 30);
```

### Diamond operator
```java
List<String> names = new ArrayList<>();    // <> on right inferred
Map<String, List<Integer>> grouped = new HashMap<>();
```

Pre-Java 7 required `new ArrayList<String>()`. The diamond cleaned that up.

### Naming convention
- `T` — Type (general).
- `E` — Element (collections).
- `K`, `V` — Key, Value (maps).
- `R` — Result / Return.
- `T1`, `T2`, ... — multiple types.

These aren't enforced; you can use any name. But `T`, `E`, `K`, `V`, `R` are idiomatic.

---

## 3. Generic Methods

```java
public class Utils {
    public static <T> T firstOrNull(List<T> list) {
        return list.isEmpty() ? null : list.get(0);
    }
    
    public static <K, V> Map<V, K> invert(Map<K, V> map) {
        Map<V, K> inverted = new HashMap<>();
        for (Map.Entry<K, V> e : map.entrySet()) {
            inverted.put(e.getValue(), e.getKey());
        }
        return inverted;
    }
}

String first = Utils.firstOrNull(List.of("a", "b", "c"));
Map<Integer, String> inverted = Utils.invert(Map.of("a", 1, "b", 2));
```

The `<T>` before the return type declares the type parameter for the method. Type is inferred from arguments.

### Explicit type arguments (rarely needed)
```java
String s = Utils.<String>firstOrNull(List.of("a"));
```

Almost never needed in practice — TS-style inference works for most calls.

### Generic constructors
```java
public class MyClass {
    public <T> MyClass(T value) { ... }
}

MyClass mc = new <String>MyClass("hi");      // explicit
MyClass mc2 = new MyClass("hi");              // inferred
```

Rare.

---

## 4. Bounded Type Parameters

Restrict what types are valid.

### Upper bound: `extends`
```java
public static <T extends Number> double sum(List<T> nums) {
    double total = 0;
    for (T n : nums) total += n.doubleValue();
    return total;
}

sum(List.of(1, 2, 3));            // List<Integer>
sum(List.of(1.5, 2.5));            // List<Double>
sum(List.of("a", "b"));            // ERROR — String is not a Number
```

`<T extends Number>` means "T is some type that's Number or a subclass."

### Multiple bounds
```java
public static <T extends Comparable<T> & Serializable> T max(List<T> list) { ... }
```

`T extends A & B` — T must be both A and B. Class first, then interfaces.

### Bounded class types
```java
public class SortedList<T extends Comparable<T>> {
    private final List<T> items = new ArrayList<>();
    
    public void add(T item) {
        items.add(item);
        items.sort(null);    // natural order — T is Comparable
    }
}

SortedList<Integer> nums = new SortedList<>();   // OK
SortedList<User> users = new SortedList<>();      // ERROR if User isn't Comparable
```

### Self-bounded types
```java
public class Builder<B extends Builder<B>> {
    public B setName(String name) { ... return (B) this; }
}

public class UserBuilder extends Builder<UserBuilder> { ... }
```

Pattern for fluent APIs where `setX().setY()` returns the right subclass type. Awkward and somewhat rare.

---

## 5. Wildcards

Wildcards (`?`) are like type parameters in places where you can't declare one. They're used in **types**, not in declarations.

### Unbounded: `?`
```java
public static void printAll(List<?> list) {
    for (Object o : list) {
        System.out.println(o);
    }
}

printAll(List.of(1, 2, 3));
printAll(List.of("a", "b"));
printAll(List.of(new User(...)));
```

`List<?>` means "list of some unknown type." You can read from it as `Object` but can't add anything (except `null`).

### Upper bound: `? extends T`
```java
public static double sum(List<? extends Number> nums) {
    double total = 0;
    for (Number n : nums) total += n.doubleValue();
    return total;
}

sum(List.of(1, 2, 3));            // List<Integer>
sum(List.of(1.5));                 // List<Double>
sum(List.<Number>of(1, 2.0));      // List<Number>
```

You can read from `List<? extends Number>` as `Number`. You can't add anything (compiler doesn't know which specific `Number` subtype the list holds).

### Lower bound: `? super T`
```java
public static void addNumbers(List<? super Integer> list) {
    list.add(1);
    list.add(2);
    list.add(3);
}

List<Number> nums = new ArrayList<>();
addNumbers(nums);                       // OK — Integer is-a Number
List<Object> objects = new ArrayList<>();
addNumbers(objects);                     // OK
```

You can add `Integer` (or subtype). You can read but only as `Object` (the compiler doesn't know how deep the super-type chain goes).

### When to use wildcards over type parameters
Wildcards are for **method parameters**, when you want flexibility but no other use of the type:
```java
public void copy(List<? extends T> src, List<? super T> dst) { ... }
```

Type parameters are for when the type is **used in multiple places** or **returned**:
```java
public <T> T firstOrNull(List<T> list) { return list.get(0); }
```

A signature using two wildcards can't relate them — `<T>` lets you.

---

## 6. PECS

The mnemonic: **Producer Extends, Consumer Super.**

- If a parameter **produces** values (you read from it): `? extends T`.
- If a parameter **consumes** values (you write to it): `? super T`.

Classic example — `Collections.copy`:
```java
public static <T> void copy(List<? super T> dest, List<? extends T> src) {
    for (int i = 0; i < src.size(); i++) {
        dest.set(i, src.get(i));
    }
}
```

`src` produces `T`s (read from). `dest` consumes `T`s (written to).

### Java's own Stream.collect
```java
<R, A> R collect(Collector<? super T, A, R> collector);
```

The Collector consumes T (and produces R), so `? super T`.

### Practical heuristic
- If you're a library author designing public APIs, sprinkle wildcards generously for flexibility.
- If you're application code calling APIs, you rarely need to write wildcards yourself.

The intuition: wildcards make your method **accept more** input types. They're a flexibility tool.

---

## 7. Type Erasure

Java generics are implemented via **type erasure**. At runtime, generic types are erased to their bounds (or `Object` if unbounded).

```java
List<String> a = new ArrayList<>();
List<Integer> b = new ArrayList<>();
a.getClass() == b.getClass();        // true — both ArrayList at runtime
```

Implications:

### Can't use `instanceof` with type arguments
```java
if (obj instanceof List<String>)   // ERROR
if (obj instanceof List<?>)         // OK
```

### Can't create generic arrays directly
```java
T[] arr = new T[10];                  // ERROR
List<String>[] lists = new List<String>[10];   // ERROR
```

Workarounds:
```java
@SuppressWarnings("unchecked")
T[] arr = (T[]) new Object[10];

List<String>[] lists = (List<String>[]) new List<?>[10];
```

Or use `ArrayList<T>` instead.

### Can't throw or catch generic types directly
```java
class MyException<T> extends Exception { ... }   // ERROR
catch (MyException<String> e) { ... }              // ERROR
```

### Method signatures collide if they erase to the same thing
```java
public void doIt(List<String> s) { ... }
public void doIt(List<Integer> i) { ... }      // ERROR — both erase to doIt(List)
```

### Reflection limits
You generally can't ask "what is the type parameter of this list at runtime?" There are tricks (`TypeToken`, `ParameterizedType`) but they require the type to be statically known somewhere — usually via subclassing.

```java
// Library trick — anonymous subclass captures the type at compile time
TypeReference<List<User>> typeRef = new TypeReference<>() {};
```

Used by Jackson (`ObjectMapper.readValue(json, new TypeReference<List<User>>() {})`).

### `Class<T>` token
For when you genuinely need the runtime type:
```java
public <T> T fromJson(String json, Class<T> clazz) { ... }

User u = fromJson(json, User.class);
```

This is how many serialization libraries work around erasure.

### Reified generics (Java doesn't have them)
Kotlin and C# have "reified" generics where the type is available at runtime. Java doesn't. Live with erasure.

---

## 8. Common Patterns

### Generic factory
```java
public static <T> List<T> emptyList() {
    return new ArrayList<>();
}

List<String> empty = emptyList();
```

### Generic with multiple params
```java
public static <K, V> Map.Entry<K, V> entry(K key, V value) {
    return new AbstractMap.SimpleEntry<>(key, value);
}
```

### Generic builder
```java
public class Builder<T> {
    private final Map<String, Object> values = new HashMap<>();
    
    public Builder<T> set(String key, Object value) {
        values.put(key, value);
        return this;
    }
    
    public T build(Function<Map<String, Object>, T> constructor) {
        return constructor.apply(values);
    }
}
```

### Generic Result type
```java
public sealed interface Result<T, E> permits Ok, Err {
    record Ok<T, E>(T value) implements Result<T, E> {}
    record Err<T, E>(E error) implements Result<T, E> {}
}

Result<User, String> result = fetchUser(1);
switch (result) {
    case Result.Ok<User, String> ok -> useUser(ok.value());
    case Result.Err<User, String> err -> log(err.error());
}
```

### Generic functional interfaces
```java
@FunctionalInterface
public interface Mapper<T, R> {
    R apply(T input);
}

Mapper<String, Integer> length = s -> s.length();
```

You usually use the built-in `Function<T, R>` instead.

### Generic methods on existing types
```java
public class Validator {
    public static <T> Validator<T> of(T value) { ... }
    public <U> Validator<U> map(Function<T, U> f) { ... }
    public Validator<T> require(Predicate<T> check, String msg) { ... }
}
```

Fluent generic APIs are common in Java libraries.

### Returning generics
```java
public <T> Optional<T> findFirst(List<T> list, Predicate<? super T> pred) {
    return list.stream().filter(pred).findFirst();
}

Optional<User> alice = findFirst(users, u -> u.name().equals("Alice"));
```

The compiler infers `T` from the list and constrains the predicate.

---

## 9. Pitfalls

### Raw types (legacy, avoid)
```java
List list = new ArrayList();        // raw — no type parameter
list.add("a");
list.add(1);
```

The compiler warns "unchecked." Raw types are remnants of pre-generics Java. Treat compiler warnings about them as errors.

### `Object` vs `?`
```java
public void f(List<Object> list) { ... }   // very restrictive — only List<Object> matches
public void g(List<?> list) { ... }         // any List
```

`List<Object>` accepts only `List<Object>`. `List<?>` accepts any parameterization.

### Generic-class invariance
```java
List<Number> nums = new ArrayList<Integer>();   // ERROR
```

`List<Integer>` is **not** a `List<Number>` even though `Integer` is a `Number`. Use wildcards:
```java
List<? extends Number> nums = new ArrayList<Integer>();   // OK
```

### Heap pollution
The combination of generics and `Object` arrays can cause runtime errors:
```java
List<String>[] lists = new List[10];        // unchecked warning
lists[0] = List.of("a");
Object[] objects = lists;                    // covariant arrays — dangerous
objects[1] = List.of(1);                      // no runtime check!
String s = lists[1].get(0);                  // ClassCastException
```

Avoid generic arrays. Use `List<List<String>>` instead.

### `@SuppressWarnings("unchecked")` — use sparingly
When you genuinely know a cast is safe but the compiler can't prove it:
```java
@SuppressWarnings("unchecked")
List<String> list = (List<String>) obj;
```

Annotate at the smallest scope possible. Comment why.

### Confusion: `extends` in generics vs class inheritance
```java
class Dog extends Animal { ... }            // class inheritance
List<? extends Number> list                  // upper bound — different concept
```

Both use the word `extends` but mean different things. The wildcard form means "is or extends."

### `super` interfaces aren't a thing
```java
List<? super Integer> list;     // OK
```

This works for interfaces too — "Integer or a supertype of Integer."

### Comparable<T> recursion
```java
public class Sorted<T extends Comparable<T>> { ... }
```

`T extends Comparable<T>` means "T can be compared to other T." This recursion is common; don't be alarmed.

### Bounded wildcards can't be set
```java
List<? extends Number> nums = new ArrayList<Integer>();
nums.add(1);              // ERROR — can't add, even Integer
nums.add(null);            // only null is allowed
Number n = nums.get(0);    // OK — reading works
```

PECS again: extends is for producers (read-only).

### Generic types in throws
```java
public <T extends Exception> void doIt() throws T { ... }
```

Works, but rare. Usually you have a specific exception type.

### Comparing generic objects
```java
public static <T> boolean equals(T a, T b) {
    return a.equals(b);        // NPE if a is null!
}
```

Use `Objects.equals`:
```java
return Objects.equals(a, b);
```

### Casts and type erasure
```java
public <T> T cast(Object o) {
    return (T) o;             // unchecked warning — no real check at runtime
}

String s = cast(42);           // compiles!
// String s2 = cast(42);        // ClassCastException at runtime
```

The cast in `(T) o` is erased to `(Object) o` — no actual type check. The check happens only when you use the result.

### Java vs Kotlin/Scala
- Java erases types; Kotlin's are usually erased too (JVM constraint). Kotlin has `reified` for inlined generics.
- Scala has implicit `TypeTag` for runtime type info.

If reified generics matter, you'll feel it. Most application code doesn't need them — workarounds (`Class<T>` parameters, `TypeReference`) suffice.

---

That's generics. Used everywhere in collections, streams, frameworks, and APIs. The basics (declaring `<T>`, using bounds) cover 90% of code; wildcards become more important for library authors.

Next: the functional side of Java — `06_streams_and_lambdas.md`.
