# 05. Generics & Advanced Types

> Generic classes / methods, constraints, nullable reference types, tuples, ref structs.

---

## Table of Contents

1. [Generic Classes](#1-generic-classes)
2. [Generic Methods](#2-generic-methods)
3. [Constraints](#3-constraints)
4. [Variance](#4-variance)
5. [Reified Generics](#5-reified-generics)
6. [Nullable Reference Types](#6-nullable-reference-types)
7. [Tuples](#7-tuples)
8. [Deconstruction](#8-deconstruction)
9. [`ref struct` and `Span<T>`](#9-ref-struct-and-spant)
10. [Pattern Matching Deep Dive](#10-pattern-matching-deep-dive)
11. [Pitfalls](#11-pitfalls)

---

## 1. Generic Classes

```csharp
public class Box<T>
{
    public T Value { get; set; }

    public Box(T value) { Value = value; }
}

Box<string> stringBox = new("hello");
string s = stringBox.Value;       // no cast

Box<int> intBox = new(42);
int n = intBox.Value;
```

`T` is the type parameter — a placeholder for the actual type.

### Multiple type parameters
```csharp
public class Pair<TFirst, TSecond>
{
    public TFirst First { get; }
    public TSecond Second { get; }

    public Pair(TFirst first, TSecond second)
    {
        First = first;
        Second = second;
    }
}

var pair = new Pair<string, int>("age", 30);
```

### Naming convention
- `T`, `TFirst`, `TResult`, `TKey`, `TValue` — by convention, start with `T`.
- Single `T` for one parameter.
- Descriptive names for multiple: `TKey`, `TValue` (not just `T`, `U`).

### Generic type inference for constructors
```csharp
var pair = new Pair<string, int>("age", 30);    // explicit
```

C# doesn't infer constructor type arguments (unlike methods). C# 9+ allows target-typed `new`:
```csharp
Pair<string, int> pair = new("age", 30);
```

---

## 2. Generic Methods

```csharp
public static class Util
{
    public static T? FirstOrNull<T>(List<T> list) where T : class
    {
        return list.Count > 0 ? list[0] : null;
    }

    public static Dictionary<V, K> Invert<K, V>(Dictionary<K, V> dict)
        where K : notnull
        where V : notnull
    {
        return dict.ToDictionary(kvp => kvp.Value, kvp => kvp.Key);
    }
}

string? first = Util.FirstOrNull(new List<string> { "a", "b" });
Dictionary<int, string> inverted = Util.Invert(new Dictionary<string, int> { ["a"] = 1 });
```

Type parameters before the method signature; constraints after.

### Type inference
C# infers type arguments from method arguments — usually you don't need to specify:
```csharp
string? first = Util.FirstOrNull(list);    // T inferred as string

// Explicit if needed:
string? first2 = Util.FirstOrNull<string>(list);
```

---

## 3. Constraints

Restrict what types are valid for a type parameter.

### `where T : class`
T must be a reference type:
```csharp
public class Cache<T> where T : class
{
    private T? _value;
    public T? Value => _value;
}
```

### `where T : struct`
T must be a value type (not nullable):
```csharp
public T Process<T>(T value) where T : struct { ... }
```

### `where T : notnull`
T must be non-nullable (reference or value type without `?`):
```csharp
public class Map<TKey, TValue> where TKey : notnull
{
    public TValue this[TKey key] { ... }
}
```

`Dictionary<TKey, TValue>` uses this.

### `where T : new()`
T must have a parameterless constructor:
```csharp
public T Create<T>() where T : new()
{
    return new T();
}
```

### `where T : SomeClass`
T must be SomeClass or a subclass:
```csharp
public T Process<T>(T value) where T : Animal
{
    Console.WriteLine(value.Name);    // can use Animal members
    return value;
}
```

### `where T : ISomeInterface`
T must implement an interface:
```csharp
public T Min<T>(IEnumerable<T> source) where T : IComparable<T>
{
    return source.Aggregate((a, b) => a.CompareTo(b) < 0 ? a : b);
}
```

### Multiple constraints
```csharp
public class Service<T>
    where T : class, IDisposable, new()
{ ... }
```

Class type first, then interfaces, then `new()`.

### `where T : unmanaged`
T must be a pure value type (no reference fields). Allows direct memory access:
```csharp
public unsafe void Process<T>(T* ptr) where T : unmanaged { ... }
```

Rare; for interop and low-level code.

### `where T : SomeOtherTypeParam`
```csharp
public class Tree<TNode, TValue>
    where TNode : Node<TValue>
{ ... }
```

---

## 4. Variance

Variance is about how generic types relate when their type parameters are related.

### Covariance (`out`)
A `Producer<Cat>` can be used as a `Producer<Animal>`:
```csharp
public interface IProducer<out T>
{
    T Produce();
}

IProducer<Cat> cats = ...;
IProducer<Animal> animals = cats;    // OK — Cat is-a Animal, so producing Cat is producing Animal
```

`out T` means T appears only in output positions (return values).

`IEnumerable<T>` is `IEnumerable<out T>`:
```csharp
IEnumerable<string> strs = new List<string>();
IEnumerable<object> objs = strs;    // OK
```

### Contravariance (`in`)
A `Consumer<Animal>` can be used as a `Consumer<Cat>`:
```csharp
public interface IConsumer<in T>
{
    void Consume(T item);
}

IConsumer<Animal> animals = ...;
IConsumer<Cat> cats = animals;       // OK — anything that consumes Animal can consume Cat
```

`in T` means T appears only in input positions (parameters).

`IComparer<T>` is `IComparer<in T>`:
```csharp
IComparer<object> objComp = ...;
IComparer<string> strComp = objComp;    // OK
```

### Invariance (default)
Without `in`/`out`, generic types are invariant:
```csharp
List<Cat> cats = new();
List<Animal> animals = cats;     // ERROR — List<T> is invariant
```

Why? Because `List<T>` both reads (return T) and writes (set T). Allowing the cast would let you add a Dog to a list of Cats.

### Generic classes don't have variance
Only interfaces and delegates support variance modifiers. Generic classes are always invariant.

---

## 5. Reified Generics

Unlike Java's type erasure, **C# generics are reified** — type information is preserved at runtime:
```csharp
typeof(List<int>) == typeof(List<string>);    // false — different runtime types
typeof(List<int>) == typeof(List<int>);        // true

var t = typeof(List<int>);
t.IsGenericType;                                  // true
t.GenericTypeArguments[0];                        // typeof(int)

// You can check:
if (obj is List<int> list) { ... }                 // works!

// Create generic instances at runtime:
var listType = typeof(List<>).MakeGenericType(typeof(int));
var instance = Activator.CreateInstance(listType);
```

This is a significant advantage over Java. It enables better serialization, dependency injection, and reflection-based libraries.

---

## 6. Nullable Reference Types

Enabled by default in `.NET 6+` templates (`<Nullable>enable</Nullable>` in `.csproj`).

### Reference types are non-nullable by default
```csharp
string s = null;        // WARNING — string is not nullable
string? s2 = null;      // OK — string? is nullable
```

The `?` suffix marks a reference type as nullable.

### Null state analysis
The compiler tracks null state:
```csharp
string? name = GetName();
Console.WriteLine(name.Length);       // WARNING — might be null

if (name != null)
{
    Console.WriteLine(name.Length);    // OK — name is non-null here
}

Console.WriteLine(name!.Length);       // ! suppresses the warning — you swear it's not null
```

### `!` — the null-forgiving operator
```csharp
string? s = GetMaybeNull();
int len = s!.Length;    // "trust me, it's not null"
```

Use sparingly. Each `!` is a place where the compiler couldn't verify; it's a runtime NPE risk.

### Patterns
```csharp
public string Process(string? input)
{
    ArgumentNullException.ThrowIfNull(input);
    // After this, input is non-null
    return input.ToUpper();
}

public string Process2(string? input)
{
    if (input is null) throw new ArgumentNullException(nameof(input));
    return input.ToUpper();    // OK
}

public string Process3(string? input)
{
    if (string.IsNullOrEmpty(input)) return "";
    return input.ToUpper();    // OK — compiler knows IsNullOrEmpty acts on null
}
```

### Nullable attributes
For methods like `IsNullOrEmpty` whose null-check semantics the compiler can't infer:
```csharp
public static bool IsEmpty([NotNullWhen(false)] string? value)
{
    return string.IsNullOrEmpty(value);
}

if (!IsEmpty(s))
{
    s.Length;    // OK — compiler knows s is non-null
}
```

Other attributes:
- `[NotNull]` — out parameter / return is never null.
- `[MaybeNull]` — out parameter / return might be null.
- `[NotNullWhen(true|false)]` — return true ⇒ param is non-null.
- `[NotNullIfNotNull(nameof(input))]` — if input non-null, output non-null.

### Enabling nullable
Project-wide in `.csproj`:
```xml
<Nullable>enable</Nullable>
```

Or per file:
```csharp
#nullable enable
```

In 2026, all new projects should have it enabled.

### Migration path
For old code: enable warnings gradually.
```xml
<Nullable>warnings</Nullable>     <!-- warns but doesn't error -->
```

### What it doesn't do
- It's static analysis only. At runtime, references are still references; you can have NPEs.
- Type system isn't enforced for boxing / reflection / dynamic.

But: caught most NPEs at compile time. Strongly enable it for new code.

---

## 7. Tuples

Multiple return values, ad-hoc grouping.

```csharp
(int x, int y) point = (1, 2);
Console.WriteLine(point.x);     // 1

// Method returning tuple
public (string Name, int Age) GetUser() => ("Alice", 30);

var user = GetUser();
Console.WriteLine($"{user.Name} is {user.Age}");
```

### Tuple deconstruction
```csharp
var (name, age) = GetUser();
Console.WriteLine($"{name} is {age}");

// Discard
var (_, age2) = GetUser();   // ignore name
```

### Named vs unnamed
```csharp
(int, int) p1 = (1, 2);                   // unnamed — use .Item1, .Item2
(int x, int y) p2 = (1, 2);                // named — use .x, .y
```

### Tuple equality
```csharp
(1, "a") == (1, "a")    // true
```

Records are usually better for anything that lives beyond a single method call. Tuples are best for transient, local use.

### Tuple as Dictionary key
```csharp
var dict = new Dictionary<(int, string), int>();
dict[(1, "a")] = 100;
```

Convenient for composite keys.

### `KeyValuePair<K, V>`
The old form, still used by `Dictionary<K, V>`:
```csharp
foreach (KeyValuePair<string, int> kvp in dict)
{
    Console.WriteLine($"{kvp.Key}: {kvp.Value}");
}

// Modern preferred — deconstruct
foreach (var (key, value) in dict)
{
    Console.WriteLine($"{key}: {value}");
}
```

`Dictionary<K, V>` deconstructs into tuple-style.

### `ValueTuple<...>`
The underlying type. `(int, string)` is sugar for `ValueTuple<int, string>`. It's a struct (value type) — copies cheap, no allocation.

### `System.Tuple<...>` (old reference type)
Pre-C# 7. Don't use — replaced by `ValueTuple`.

---

## 8. Deconstruction

Extract multiple values from a type.

### Tuples (built-in)
```csharp
var (name, age) = GetUser();
```

### Records (built-in)
```csharp
public record Point(int X, int Y);
var (x, y) = new Point(1, 2);
```

### Custom `Deconstruct`
```csharp
public class User
{
    public string Name { get; }
    public int Age { get; }

    public User(string name, int age) { Name = name; Age = age; }

    public void Deconstruct(out string name, out int age)
    {
        name = Name;
        age = Age;
    }
}

var u = new User("Alice", 30);
var (name, age) = u;
```

Any type with a `Deconstruct` method (public or extension) supports deconstruction.

### Deconstruct in patterns
```csharp
string desc = point switch
{
    (0, 0) => "origin",
    (var x, var y) when x == y => "diagonal",
    (var x, var y) => $"({x}, {y})"
};
```

---

## 9. `ref struct` and `Span<T>`

### `ref struct`
A struct that can only live on the stack. Cannot be boxed, captured in lambdas, or stored in heap objects.

```csharp
public ref struct StackOnly
{
    public int Value;
}
```

Used for high-performance scenarios — `Span<T>`, `ReadOnlySpan<T>` are ref structs.

### `Span<T>`
A view over a contiguous region of memory — array, stackalloc, or unmanaged memory. No allocation.

```csharp
int[] arr = { 1, 2, 3, 4, 5 };
Span<int> span = arr;
Span<int> middle = span.Slice(1, 3);    // {2, 3, 4} — same memory
middle[0] = 99;
// arr is now { 1, 99, 3, 4, 5 }

// Stack-allocated span
Span<int> stack = stackalloc int[10];

// From string
ReadOnlySpan<char> chars = "hello".AsSpan();
ReadOnlySpan<char> sub = chars.Slice(1, 3);    // "ell" — no string allocation
```

### Why Span matters
Zero-allocation slicing of strings / arrays. Critical for high-performance parsing:
```csharp
ReadOnlySpan<char> input = "key=value";
int eq = input.IndexOf('=');
ReadOnlySpan<char> key = input.Slice(0, eq);
ReadOnlySpan<char> value = input.Slice(eq + 1);
```

No string allocations. Each `Slice` is a struct that points into the original.

### Span limitations (because it's ref struct)
```csharp
public Span<int> Bad()
{
    var arr = new int[10];
    return arr;     // OK — array is heap
}

public Span<int> AlsoBad()
{
    Span<int> stack = stackalloc int[10];
    return stack;    // ERROR — can't return stack span
}

public void Caller()
{
    Span<int> s = ...;
    Task.Run(() => Use(s));    // ERROR — Span can't be captured
}
```

`Span<T>` is for very performance-critical code. Most code doesn't need it.

### `Memory<T>`
Like `Span<T>` but heap-allocatable. Can be stored in fields, captured by async methods.
```csharp
public async Task ProcessAsync(Memory<byte> data) { ... }
```

`Memory<T>.Span` gets a Span; can be used asynchronously without ref-struct limits.

### `stackalloc`
Allocate on the stack instead of heap:
```csharp
Span<int> nums = stackalloc int[100];    // 400 bytes on stack
```

Fast — no GC pressure. But limited to small sizes (default stack ~1 MB total).

---

## 10. Pattern Matching Deep Dive

C# has the most extensive pattern matching of any mainstream language.

### Type patterns
```csharp
if (obj is string s) { /* use s */ }
if (obj is not null) { /* obj is something */ }
```

### Constant patterns
```csharp
if (x is 0) { ... }
if (s is "hello") { ... }
if (color is Color.Red) { ... }
```

### Relational patterns (C# 9+)
```csharp
if (age is >= 18 and < 65) { ... }
if (price is > 100) { ... }
```

### Logical patterns
```csharp
if (x is > 0 and < 100) { ... }
if (x is null or 0) { ... }
if (x is not (> 0)) { ... }
```

### Property patterns
```csharp
if (user is { Age: >= 18 }) { /* adult */ }
if (point is { X: 0, Y: 0 }) { /* origin */ }
if (order is { Items.Count: > 0 }) { /* has items */ }

// Deconstruction in pattern
if (point is (var x, var y) && x == y) { /* diagonal */ }
```

### List patterns (C# 11+)
```csharp
int[] arr = { 1, 2, 3 };
if (arr is [1, 2, 3]) { ... }
if (arr is [_, _, _]) { /* exactly 3 elements */ }
if (arr is [1, ..]) { /* starts with 1 */ }
if (arr is [.., 3]) { /* ends with 3 */ }
if (arr is [1, .., 3]) { /* starts 1, ends 3 */ }
if (arr is [var first, .. var middle, var last]) { /* destructure */ }
```

### Switch expressions
```csharp
string describe = shape switch
{
    Circle { Radius: > 0 } c => $"Circle r={c.Radius}",
    Circle => "Zero or negative circle",
    Rectangle { Width: var w, Height: var h } => $"{w}x{h}",
    [var single] => "Single item",
    null => "Nothing",
    _ => "Unknown"
};
```

### Patterns with `when` clauses
```csharp
var category = x switch
{
    int n when n < 0 => "negative",
    int n when n == 0 => "zero",
    int n when n > 0 => "positive",
    _ => "not int"
};
```

When the predicate is too complex for inline patterns.

### `is` with combined patterns
```csharp
if (response is { StatusCode: >= 200 and < 300, Body: not null })
{
    // success with body
}
```

This level of pattern matching is rare in other mainstream OO languages. Modern C# code uses it heavily for cleaner conditional logic.

---

## 11. Pitfalls

### Variance only on interfaces / delegates
```csharp
public class Container<T> { ... }
Container<string> strs = new();
Container<object> objs = strs;    // ERROR — classes invariant
```

For variance, use interfaces.

### Generic class inheritance constraints don't transfer
```csharp
public class Base<T> where T : class { ... }
public class Derived<T> : Base<T> { ... }    // ERROR — must restate constraint
public class Derived2<T> : Base<T> where T : class { ... }   // OK
```

### Reference type comparison in generic methods
```csharp
public T Find<T>(List<T> list, T target)
{
    foreach (var item in list)
    {
        if (item == target) return item;   // reference equality for classes!
    }
    return default!;
}
```

Use `EqualityComparer<T>.Default`:
```csharp
if (EqualityComparer<T>.Default.Equals(item, target)) ...
```

### `default(T)`
```csharp
T value = default;            // null for classes, 0 / false for primitives, default struct
T? value2 = default;           // explicit nullable
```

For nullable generics:
```csharp
public T? FirstOrDefault<T>(List<T> list)
{
    return list.Count > 0 ? list[0] : default;
}
```

### Nullable struct vs nullable reference
`T?` means different things based on T:
- Reference type: nullable reference (compiler annotation only).
- Value type: `Nullable<T>` struct (`int?` is `Nullable<int>`).

```csharp
int? n = null;          // Nullable<int> — has Value, HasValue
string? s = null;         // string? — just a nullable annotation; runtime is still string

n.HasValue;              // method
n.Value;                  // throws if !HasValue
n ?? 0;                   // fallback
```

### Tuple element naming in interfaces
```csharp
public (int x, int y) GetPoint() => (1, 2);
public (int a, int b) GetPoint() => (1, 2);     // same as above; names are just hints
```

Names of tuple elements aren't part of the type identity at runtime. The compiler enforces names at call sites within compilation units.

### `where T : new()` requires public parameterless constructor
Internal or private constructors don't count.

### Generic method overloading
```csharp
public T Get<T>(string key);
public T Get<T>();

Get<int>("k");    // OK
Get<int>();        // ambiguous if both match — usually picks param-less
```

Be careful with overloads + generics.

### `is null` vs `== null`
```csharp
if (obj == null) ...        // calls operator overload if defined
if (obj is null) ...        // pure null check, never overloaded
```

`is null` is preferred — bulletproof, can't be hijacked.

### `null` and pattern matching
```csharp
object? x = null;
if (x is string s) { ... }    // false — null doesn't match
if (x is null) { ... }         // true
if (x is not null) { ... }      // false
```

### `default` in switch
```csharp
T value = ...;
var result = value switch
{
    default => "default value",    // ERROR — `default` isn't a pattern
    _ => "other"
};
```

Use `null` (for nullable) or explicit values.

### Reflection on generics
```csharp
var list = new List<int>();
list.GetType().IsGenericType;          // true
list.GetType().GetGenericArguments();   // [typeof(int)]
list.GetType().GetGenericTypeDefinition();   // typeof(List<>)
```

C# preserves all this info. Java doesn't (type erasure).

### Constraints don't help inference
```csharp
public T Create<T>() where T : new() { return new T(); }

var x = Create();        // ERROR — can't infer T
var y = Create<int>();   // OK
```

Inference is from argument types, not constraints.

---

That's the type system. Modern C# leans heavily on:
- **Nullable reference types** for null safety.
- **Generics with constraints** for type-safe abstractions.
- **Pattern matching** for clean conditional logic.
- **Records + sealed hierarchies** for ADTs (next file).
- **Span<T>** for zero-allocation perf code.

Next: LINQ and lambdas — `06_linq_and_lambdas.md`.
