# 15. Modern Features & Advanced

> Source generators, primary constructors, collection expressions, pattern matching deep dive, ref structs, and a curated reference of common C# pitfalls.

> If you're maintaining older code, this file shows you what to look for when modernizing. If you're starting fresh, these are the patterns.

---

## Table of Contents

1. [Primary Constructors (C# 12+)](#1-primary-constructors-c-12)
2. [Collection Expressions (C# 12+)](#2-collection-expressions-c-12)
3. [Pattern Matching Deep Dive](#3-pattern-matching-deep-dive)
4. [Records — Beyond the Basics](#4-records--beyond-the-basics)
5. [Required Members and `init`](#5-required-members-and-init)
6. [Ref Structs and `Span<T>`](#6-ref-structs-and-spant)
7. [Source Generators](#7-source-generators)
8. [Nullable Reference Types](#8-nullable-reference-types)
9. [Interceptors (C# 12+, preview)](#9-interceptors-c-12-preview)
10. [`unsafe` and Pointers](#10-unsafe-and-pointers)
11. [Common Pitfalls Reference](#11-common-pitfalls-reference)

---

## 1. Primary Constructors (C# 12+)

Primary constructors moved from records to all classes and structs in C# 12.

```csharp
// Old style
public class UserService
{
    private readonly IUserRepository _repo;
    private readonly ILogger<UserService> _logger;
    
    public UserService(IUserRepository repo, ILogger<UserService> logger)
    {
        _repo = repo;
        _logger = logger;
    }
    
    public User Find(long id) => _repo.FindById(id);
}

// With primary constructor
public class UserService(IUserRepository repo, ILogger<UserService> logger)
{
    public User Find(long id) => repo.FindById(id);
}
```

The parameters are in scope for the entire class body — no need to assign to fields.

### Key differences from records
- **Not generated as `public` properties** — they're constructor parameters captured for use in the class body.
- **Not `readonly` automatically** — you can technically reassign them in methods (don't).
- **No auto-generated `equals` / `hashCode`** — that's records.
- **Can be combined with other constructors** via `this(...)`.

### When to use
- Dependency injection — the dominant use case in ASP.NET Core.
- Classes that have parameters mostly used in methods (don't need explicit fields).

### When to avoid
- If you need explicit field initialization logic.
- If the class has many constructors with different signatures.

### Inheritance
```csharp
public class Animal(string name)
{
    public string Name => name;
}

public class Dog(string name, string breed) : Animal(name)
{
    public string Breed => breed;
}
```

Pass parent constructor args directly.

### Pitfall: parameters are not properties
```csharp
public class User(string name)
{
    public string GetName() => name;   // works — captured
}

var u = new User("Alice");
// u.name  ← ERROR. There's no "name" property; name is a constructor parameter.
```

To expose, declare a property:
```csharp
public class User(string name)
{
    public string Name { get; } = name;
}
```

---

## 2. Collection Expressions (C# 12+)

A unified, terse syntax for creating collections.

```csharp
int[] arr = [1, 2, 3];
List<int> list = [1, 2, 3];
HashSet<int> set = [1, 2, 3];
ReadOnlySpan<int> span = [1, 2, 3];

// Empty
List<int> empty = [];

// Spread
int[] a = [1, 2, 3];
int[] b = [4, 5, 6];
int[] combined = [..a, ..b, 7];          // [1, 2, 3, 4, 5, 6, 7]

// With expressions
int[] doubled = [..a.Select(x => x * 2)];
```

The compiler picks the most efficient creation for the target type — `Array.Empty<T>()` for empty arrays, `List` constructor, span literal, etc.

### Type inference
```csharp
var arr = new[] { 1, 2, 3 };       // old style
int[] arr2 = [1, 2, 3];             // collection expression

// Cannot use 'var' alone with collection expressions:
// var x = [1, 2, 3];   ← ERROR (no target type)
```

You need a target type. `var x = (int[])[1, 2, 3]` works but is awkward.

### Constructing dictionaries
Collection expressions don't directly construct dictionaries (as of C# 13 — there are proposals). Use:
```csharp
Dictionary<string, int> d = new() { ["a"] = 1, ["b"] = 2 };
```

### When to use
- Anywhere you previously wrote `new List<int> { 1, 2, 3 }` or `new[] { 1, 2, 3 }`.
- `[..source]` for converting between collection types.
- Parameter values for methods accepting `IEnumerable<T>` / `ReadOnlySpan<T>`.

---

## 3. Pattern Matching Deep Dive

C#'s pattern matching has grown across many versions. Here's the modern toolkit.

### Type patterns
```csharp
if (obj is string s)
{
    Console.WriteLine(s.Length);
}

if (obj is not string s2) return;   // s2 in scope after return
```

### Constant patterns
```csharp
if (status is 200) { /* ok */ }
if (name is "admin") { /* danger */ }
if (x is null) { /* check for null */ }
```

### Relational patterns
```csharp
string Describe(int n) => n switch
{
    < 0 => "negative",
    0 => "zero",
    > 0 and < 10 => "single digit",
    >= 10 and < 100 => "two digit",
    _ => "large"
};
```

### Logical patterns (`and`, `or`, `not`)
```csharp
if (c is >= 'a' and <= 'z') { /* lowercase */ }
if (status is 200 or 201 or 204) { /* success */ }
if (obj is not null) { /* non-null */ }
```

### Property patterns
```csharp
if (user is { Age: >= 18, City: "Berlin" })
{
    // user.Age >= 18 and user.City == "Berlin"
}

string Describe(Order o) => o switch
{
    { Status: "Paid", Total: > 1000 } => "Large paid order",
    { Status: "Paid" } => "Paid order",
    { Status: "Pending" } => "Pending",
    _ => "Unknown"
};
```

### Nested property patterns
```csharp
if (user is { Address: { City: "Berlin", Country.Code: "DE" } })
{
    // user.Address.City == "Berlin" && user.Address.Country.Code == "DE"
}
```

### Positional patterns (records / tuples)
```csharp
record Point(int X, int Y);

string Describe(Point p) => p switch
{
    (0, 0) => "origin",
    (var x, 0) => $"on x-axis at {x}",
    (0, var y) => $"on y-axis at {y}",
    (var x, var y) when x == y => "on diagonal",
    _ => "somewhere else"
};
```

Positional patterns need a `Deconstruct` method. Records get one auto-generated; for other types you can write one:
```csharp
public class Point
{
    public int X { get; }
    public int Y { get; }
    
    public void Deconstruct(out int x, out int y) => (x, y) = (X, Y);
}
```

### List patterns (C# 11+)
```csharp
int[] arr = [1, 2, 3];

if (arr is [1, 2, 3]) { /* exact match */ }
if (arr is [1, ..]) { /* starts with 1 */ }
if (arr is [.., 3]) { /* ends with 3 */ }
if (arr is [1, .., 3]) { /* 1 then anything then 3 */ }
if (arr is [_, _, _]) { /* exactly 3 elements */ }

// Capture
if (arr is [var first, .., var last])
{
    Console.WriteLine($"{first} to {last}");
}

// Pattern combined with slice
if (arr is [1, .. var middle, 3])
{
    Console.WriteLine($"middle has {middle.Length} elements");
}
```

Works for arrays, lists, strings (since strings are character sequences), spans.

### Switch expressions with patterns
```csharp
decimal CalculateFee(Order order) => order switch
{
    { Items: [] } => throw new ArgumentException("Empty order"),
    { Total: < 50 } => 5m,
    { Total: < 200, Customer.Tier: "gold" } => 0m,
    { Total: < 200 } => 10m,
    { Items.Count: > 100 } => 50m,
    _ => 25m
};
```

### Discard pattern
```csharp
if (obj is (_, var y)) { /* match any tuple, capture only y */ }
```

Use `_` for "any value, don't care."

---

## 4. Records — Beyond the Basics

```csharp
public record User(long Id, string Name, string Email);
```

Auto-generates: properties, primary constructor, `Equals`/`GetHashCode`, `ToString`, `Deconstruct`, copy-and-modify via `with`.

### Record class vs record struct
```csharp
public record class Person(string Name);    // reference type (default)
public record Person(string Name);          // same thing — 'class' implied
public record struct Point(int X, int Y);   // value type
```

`record struct` is value-type, useful for small immutable values.

### `with` expressions
```csharp
var u = new User(1, "Alice", "alice@example.com");
var renamed = u with { Name = "Alicia" };
// renamed is a new User with Name changed, other fields copied
```

This is the "wither" pattern, built in. Cleaner than Java's manual copy methods.

### Inheritance
```csharp
public record Animal(string Name);
public record Dog(string Name, string Breed) : Animal(Name);

Animal a = new Dog("Rex", "Labrador");
a is Dog d;   // pattern matches
```

Records can inherit other records. The auto-generated `Equals` accounts for the runtime type, so `Animal` and `Dog` with the same `Name` are not equal.

### Custom logic
```csharp
public record User(long Id, string Name, string Email)
{
    // Additional members
    public string DisplayName => $"{Name} ({Email})";
    
    public bool IsValid() => !string.IsNullOrWhiteSpace(Email) && Email.Contains('@');
    
    // Custom property
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

var u = new User(1, "Alice", "alice@example.com")
{
    CreatedAt = DateTime.Parse("2024-01-01")
};
```

The non-positional properties use `init` so they're only settable during construction (object initializer or constructor).

### Validation in constructor
```csharp
public record User(long Id, string Name, string Email)
{
    public string Name { get; init; } = !string.IsNullOrWhiteSpace(Name)
        ? Name
        : throw new ArgumentException("Name required");
    
    public string Email { get; init; } = Email.Contains('@')
        ? Email.ToLowerInvariant()
        : throw new ArgumentException("Invalid email");
}
```

Or use a separate factory method for clarity:
```csharp
public record User
{
    public long Id { get; init; }
    public string Name { get; init; }
    public string Email { get; init; }
    
    private User() { }
    
    public static User Create(long id, string name, string email)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name required");
        if (!email.Contains('@')) throw new ArgumentException("Invalid email");
        
        return new User { Id = id, Name = name, Email = email.ToLowerInvariant() };
    }
}
```

### When to use records
- DTOs (data transfer objects).
- Value objects (Money, Point, Range).
- Sealed type hierarchies (discriminated unions in C#).
- Anything immutable.

### When NOT to use records
- Entities with mutable state.
- Classes with complex inheritance and behavior.
- When you specifically don't want value equality.

---

## 5. Required Members and `init`

### `init` accessor (C# 9+)
```csharp
public class Person
{
    public string Name { get; init; }
    public int Age { get; init; }
}

var p = new Person { Name = "Alice", Age = 30 };
p.Name = "Bob";    // ERROR — init can only be set during initialization
```

Object initializer can set `init` properties; setters cannot after construction.

### `required` modifier (C# 11+)
```csharp
public class Person
{
    public required string Name { get; init; }
    public int Age { get; init; }
}

var p = new Person { Name = "Alice" };       // OK
var p2 = new Person { Age = 30 };             // ERROR — Name not set
```

The compiler enforces that required members must be set. Pairs with `init` for "must-be-set-at-construction" semantics without writing a constructor.

### Combining with `SetsRequiredMembers` attribute
```csharp
using System.Diagnostics.CodeAnalysis;

public class Person
{
    public required string Name { get; init; }
    
    public Person() { }
    
    [SetsRequiredMembers]
    public Person(string name) => Name = name;
}

var p = new Person("Alice");   // OK — attribute tells compiler all required members are set
```

This lets callers use the constructor without setting required members explicitly.

### When to use
- Replacing constructor parameter lists for DTOs / config objects with many fields.
- Self-documenting initialization (`new User { Name = "Alice", Email = "..." }` reads clearer than `new User("Alice", "...")` with many positional args).

---

## 6. Ref Structs and `Span<T>`

`ref struct`s live only on the stack. They can't be boxed, captured in lambdas, or stored in fields of heap objects.

```csharp
public ref struct Counter
{
    private int _count;
    public void Increment() => _count++;
    public int Value => _count;
}
```

### `Span<T>` and `ReadOnlySpan<T>`
The flagship `ref struct`s. They represent a contiguous region of memory without allocating.

```csharp
ReadOnlySpan<char> span = "hello world".AsSpan();
ReadOnlySpan<char> first = span[..5];     // "hello" — no allocation!
ReadOnlySpan<char> last = span[6..];      // "world"

int[] numbers = [1, 2, 3, 4, 5];
Span<int> slice = numbers.AsSpan(1, 3);   // [2, 3, 4]
slice[0] = 99;                              // mutates numbers[1]!

// stackalloc
Span<int> stackBuf = stackalloc int[100];  // 400 bytes on stack — no GC pressure
```

### Why spans matter for performance
- **No allocation**: slicing a span doesn't copy data.
- **Stack-allocated**: short-lived; no GC involvement.
- **Type-safe view of memory**: replaces unsafe pointers in many scenarios.

### Common uses
- High-perf string parsing (parse numbers from a large text without splitting/allocating).
- Buffer manipulation in I/O / networking.
- Cryptography.

### Limitations
- Can't be stored in fields of regular classes (only other ref structs).
- Can't be used in `async` methods or iterators (yield).
- Can't be boxed or implement interfaces (until C# 13's `allows ref struct` generic constraint expansion).

### When to use
For performance-critical hot paths. Don't refactor everything to spans — most code doesn't benefit. Profile first.

### `Memory<T>` — heap-friendly cousin
```csharp
Memory<byte> mem = new byte[1024];
ReadOnlyMemory<byte> readonly_ = mem;
Span<byte> span = mem.Span;       // get a span view
```

`Memory<T>` can be stored in fields and used in async methods. Convert to `Span<T>` for tight loops.

---

## 7. Source Generators

Source generators run at compile time, producing additional code that becomes part of your assembly. Replace runtime reflection for many scenarios.

### What they're used for
- JSON serialization (System.Text.Json source generator).
- Logging (compile-time logger source generator).
- Regex (compile-time regex compilation in C# 11+).
- DI containers (e.g., `Microsoft.Extensions.DependencyInjection` source generator).
- Marker-attribute-based code (e.g., MediatR handlers).

### Example: source-generated regex (C# 11+)
```csharp
using System.Text.RegularExpressions;

public partial class Validator
{
    [GeneratedRegex(@"^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$")]
    private static partial Regex EmailRegex();
    
    public bool IsValidEmail(string input) => EmailRegex().IsMatch(input);
}
```

The compiler generates an optimized regex implementation at build time. No runtime parsing.

### Example: source-generated logger
```csharp
public partial class UserService
{
    private readonly ILogger<UserService> _logger;
    
    [LoggerMessage(Level = LogLevel.Information, Message = "User {UserId} signed in")]
    partial void LogSignIn(long userId);
    
    public void SignIn(long userId)
    {
        // ... auth logic
        LogSignIn(userId);
    }
}
```

The generator creates the method body. Zero allocations for the log message even when the log level is enabled.

### Example: System.Text.Json source generation
```csharp
[JsonSourceGenerationOptions(WriteIndented = true)]
[JsonSerializable(typeof(User))]
[JsonSerializable(typeof(List<User>))]
public partial class AppJsonContext : JsonSerializerContext;

// Use it:
string json = JsonSerializer.Serialize(user, AppJsonContext.Default.User);
```

Eliminates reflection at runtime; required for Native AOT. Significantly faster than reflection-based serialization.

### Writing your own
Source generators are full Roslyn projects. They:
- Implement `IIncrementalGenerator`.
- Receive a `SyntaxNode` stream from the compiler.
- Produce additional `SourceText` files.

Complex to write but powerful. Mostly relevant for library authors. Most application developers consume existing generators.

### Why source generators matter
- **No runtime reflection** — faster, AOT-friendly.
- **Type-safe** — errors at compile time, not runtime.
- **No DI for trivial use cases** — generators can wire things directly.

This is increasingly how .NET libraries optimize for AOT compilation.

---

## 8. Nullable Reference Types

Enabled in new projects (`<Nullable>enable</Nullable>` in csproj). The compiler tracks which references can be null.

```csharp
string nonNull = "hello";   // non-nullable
string? maybeNull = null;    // nullable
nonNull = null;              // WARNING — non-nullable can't be null
```

### Flow analysis
The compiler tracks state through code:
```csharp
public int Length(string? s)
{
    if (s == null) return 0;
    return s.Length;             // OK — compiler knows s is non-null here
}

public int LengthBad(string? s)
{
    return s.Length;              // WARNING — possible null dereference
}
```

### `!` null-forgiving operator
```csharp
string? maybe = GetMaybe();
string definite = maybe!;        // "trust me, it's not null"
```

Use when you know better than the compiler. Doesn't generate a null check — just suppresses the warning.

### Null-coalescing
```csharp
string name = userName ?? "anonymous";
string s = GetMaybe() ?? throw new InvalidOperationException();

// Null-coalescing assignment
list ??= new List<int>();
```

### Null-conditional
```csharp
int? len = user?.Name?.Length;       // null if user or Name is null
user?.Save();                          // no-op if user is null
list?.Add(x);
```

### Generic constraint: notnull
```csharp
public T GetOrDefault<T>(T? value) where T : notnull
{
    return value ?? throw new ArgumentNullException(nameof(value));
}
```

### `MemberNotNull` and `NotNullWhen` attributes
For helping the compiler:
```csharp
public class Lazy
{
    private string? _value;
    
    [MemberNotNull(nameof(_value))]
    public void Initialize() => _value = "initialized";
    
    public int Length()
    {
        Initialize();
        return _value.Length;     // OK — compiler knows it's non-null after Initialize
    }
}

public static bool TryParse(string? s, [NotNullWhen(true)] out int? result)
{
    if (int.TryParse(s, out int v))
    {
        result = v;
        return true;
    }
    result = null;
    return false;
}

// Now:
if (TryParse(input, out int? value))
{
    Console.WriteLine(value.Value);   // OK — compiler knows value is non-null
}
```

These attributes are essential for library authors to communicate nullability correctly.

### Migrating older code
Enable nullable per-file:
```csharp
#nullable enable
// ... code ...
#nullable restore
```

Or per-project; tackle warnings file-by-file. It's worth the effort — null bugs become compile errors.

### Limitations
- Annotations are advisory; they don't change runtime behavior.
- Old libraries may have inaccurate annotations.
- Tricky cases (deserialization, reflection-set fields) sometimes need `!` or `MemberNotNull`.

---

## 9. Interceptors (C# 12+, preview)

Compile-time interception of method calls. A method call can be redirected to another implementation at compile time.

```csharp
// Original call
string s = "hello".ToUpper();

// An interceptor (generated by some source generator) can redirect this
// at compile time to a different method, without runtime overhead.
```

Used by ASP.NET Core's source generators in .NET 8+ to optimize minimal API endpoints — generates highly tuned code per route.

Application developers rarely write interceptors directly; they benefit from libraries that use them.

Status: still preview in some scenarios; full standardization in progress.

---

## 10. `unsafe` and Pointers

C# allows raw pointer manipulation in `unsafe` blocks.

```csharp
unsafe
{
    int x = 42;
    int* p = &x;
    *p = 100;
    Console.WriteLine(x);   // 100
}
```

Requires:
- `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>` in csproj.
- Method / block marked `unsafe`.

### When unsafe makes sense
- Interop with native code (P/Invoke needs pointers sometimes).
- Extreme perf (rare in modern code, since `Span<T>` covers most cases).

### When it doesn't
- Anywhere `Span<T>` or `Memory<T>` works.
- Almost all application code.

Don't reach for `unsafe` unless you've measured a problem and know what you're doing.

### `fixed` statement
Pins a managed object in memory:
```csharp
byte[] data = new byte[1024];
unsafe
{
    fixed (byte* p = data)
    {
        // p is a stable pointer while in this block
        NativeMethod(p, data.Length);
    }
}
```

The GC doesn't move pinned memory. Releasing `fixed` allows it to move again.

---

## 11. Common Pitfalls Reference

### `==` for reference types
```csharp
string a = new string("hi".ToCharArray());
string b = new string("hi".ToCharArray());
a == b;        // true — string has overloaded ==
ReferenceEquals(a, b);   // false
```

`string` is special. For most reference types, `==` is reference equality unless overloaded. Use `.Equals()` for value semantics, or override `==`.

### Equality without `GetHashCode`
Override both together. If `a.Equals(b)` is true, `a.GetHashCode()` must equal `b.GetHashCode()`. Records handle this automatically.

### Modifying collection during iteration
```csharp
foreach (var x in list)
{
    if (cond(x)) list.Remove(x);   // throws InvalidOperationException
}
```

Fix:
```csharp
list.RemoveAll(x => cond(x));
```

Or iterate a copy: `list.ToList().ForEach(...)`.

### `IEnumerable<T>` multiple enumeration
```csharp
IEnumerable<User> users = GetUsersFromDb();
var count = users.Count();              // first enumeration
foreach (var u in users) { ... }         // second enumeration — re-runs the query!
```

Materialize once: `.ToList()` or `.ToArray()`.

### `async void`
```csharp
public async void DoStuff()    // BAD
{
    await SomethingAsync();
}
```

`async void` swallows exceptions, can't be awaited, makes testing hard. Use `async Task` unless it's an event handler.

### Forgetting `await`
```csharp
public async Task DoStuff()
{
    SaveAsync();         // returns Task — not awaited!
    Console.WriteLine("done");   // runs immediately
}
```

The save runs in the background. If it fails, the exception may be lost. Always `await` (or explicitly fire-and-forget with a discard `_ = SaveAsync()`).

### `ConfigureAwait(false)`
In libraries, prefer:
```csharp
await SomethingAsync().ConfigureAwait(false);
```

Avoids capturing the synchronization context. Less critical in .NET 8+ (ASP.NET Core has no sync context), but still relevant for cross-platform libraries.

In application code (esp. ASP.NET Core), you can typically skip it.

### `Task.Result` and `Task.Wait()`
```csharp
var data = SomethingAsync().Result;   // BAD — can deadlock!
SomethingAsync().Wait();               // BAD
```

In old ASP.NET / WinForms, these deadlock waiting for the sync context. In modern ASP.NET Core they don't deadlock but they block a thread.

Always `await`:
```csharp
var data = await SomethingAsync();
```

### Boxing
```csharp
int x = 42;
object o = x;          // box — heap allocation
int y = (int)o;        // unbox
```

Common sources of boxing:
- Storing primitives in `object` or `IEnumerable`.
- `string.Format("{0}", primitive)` if not overloaded.
- Generic constraints like `where T : class` forcing boxing of struct.

Spot with profiler. Use generics or specific overloads to avoid.

### `struct` mistakes
- **Don't make mutable structs.** Modifying through a property gets a copy, not the original.
  ```csharp
  list[0].SomeField = 5;   // modifies a copy if it's a struct in a List<>
  ```
- **Structs are copied on assignment.** Big structs hurt perf.
- **Default value is zeroed**, not "null-equivalent." `default(MyStruct)` has all fields zero/null/false.

When in doubt, use a class. Use structs for small, immutable value types.

### `string.Empty` vs `""`
Both work. `string.Empty` is slightly more idiomatic in some codebases. They're the same string at runtime (interned).

### `String.Concat` in loops
```csharp
string s = "";
for (int i = 0; i < 1000; i++) s += i.ToString();   // O(n²)
```

Use `StringBuilder`:
```csharp
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++) sb.Append(i);
string s = sb.ToString();
```

Or `string.Join` / `string.Concat` for one-shot:
```csharp
string s = string.Join(",", Enumerable.Range(0, 1000));
```

### `DateTime` traps
- `DateTime.Now` returns local time; `DateTime.UtcNow` is UTC.
- Comparing DateTimes from different kinds (`Local`, `Utc`, `Unspecified`) is a bug waiting to happen.
- For modern code, prefer `DateTimeOffset` (carries offset) or `DateOnly` / `TimeOnly` (since .NET 6).

```csharp
DateTimeOffset now = DateTimeOffset.UtcNow;
DateOnly today = DateOnly.FromDateTime(DateTime.Today);
```

For instants representing "a point in time," use `DateTimeOffset.UtcNow`.

### `IDisposable` not disposed
```csharp
var stream = File.OpenRead(path);
var data = ReadAllBytes(stream);   // forgot to close!
```

Always use `using`:
```csharp
using var stream = File.OpenRead(path);   // disposed at end of scope
```

Or:
```csharp
using (var stream = File.OpenRead(path))
{
    // ...
}
```

### Implementing `IDisposable` poorly
The full pattern with finalizer / `Dispose(bool)` is rarely needed in modern code. If you don't have unmanaged resources:
```csharp
public sealed class MyService : IDisposable
{
    private readonly HttpClient _client;
    
    public MyService() => _client = new HttpClient();
    
    public void Dispose() => _client.Dispose();
}
```

That's enough. Only implement finalizers if you directly wrap unmanaged handles.

### LINQ deferred execution surprises
```csharp
var query = users.Where(u => u.Age > 18);
users.Add(new User { Age = 25 });
query.Count();   // includes the new user (re-runs the query)
```

LINQ queries are lazy. Materialize with `.ToList()` for a stable snapshot.

### `?.` on value types
```csharp
int? len = users.FirstOrDefault()?.Name?.Length;
```

If users is empty, `FirstOrDefault()` returns null; `?.Name` is null; `?.Length` is null. Final result is `int?`.

### `default` for reference types
```csharp
T value = default;
```

For reference types, this is `null` — and with nullable reference types enabled, the compiler complains. Use `default!` if you really want this, or initialize properly.

### Forgetting `await using` for async dispose
```csharp
await using var conn = new SqlConnection(...);
await conn.OpenAsync();
// disposed asynchronously at scope end
```

For types implementing `IAsyncDisposable` (most modern DB / HTTP clients).

### `Task.Run` for everything
```csharp
await Task.Run(() => SomethingCpuBound());      // OK — offloads CPU work
await Task.Run(() => SomethingIoBound());        // BAD — wraps async in a thread for no reason
```

`Task.Run` is for moving CPU work to the thread pool. For I/O-bound async, just `await` directly.

### Wrapping sync code badly
```csharp
public async Task<int> ComputeAsync()
{
    return await Task.Run(() => HeavyComputation());   // moves to thread pool
}
```

If `HeavyComputation` is truly CPU-bound, this is OK. If it's wrapping an inherently synchronous API to "make it async" — you're not really gaining anything; you're just using a thread pool thread.

### Generic constraints surprise
```csharp
public T Get<T>() where T : new()
{
    return new T();
}
```

`new()` constraint requires a parameterless constructor. Doesn't enforce other constructors.

For value types, `default(T)` is often what you want (no allocation, no constructor call).

### `nameof` for refactoring safety
```csharp
throw new ArgumentNullException(nameof(user));       // renames safely
log.Information("User {Name} signed in", user.Name);
```

`nameof(x)` returns "x" as a string at compile time. Rename-safe.

### Configuration as string keys
```csharp
var port = config["server:port"];   // string typo waiting to happen
```

Use Options pattern with strongly-typed classes:
```csharp
builder.Services.Configure<ServerOptions>(builder.Configuration.GetSection("Server"));

public class ServerOptions
{
    public int Port { get; set; } = 8080;
    public string Host { get; set; } = "localhost";
}
```

### Misusing DI lifetimes
- **Singleton**: one instance for app lifetime. Be careful with state.
- **Scoped**: one per request in web apps. Common for services that use DbContext.
- **Transient**: new instance every time.

Common bug: injecting a scoped service into a singleton → the scoped service is captured once and never refreshed. Compiler warns in some cases but not all.

### EF Core change tracking
Saving fails to detect changes if the entity wasn't loaded through DbContext.

```csharp
var u = new User { Id = 1, Name = "New" };
db.Update(u);            // marks all properties as modified
await db.SaveChangesAsync();
```

Or:
```csharp
var u = await db.Users.FindAsync(1);
u.Name = "New";
await db.SaveChangesAsync();    // only Name updated
```

The first form risks overwriting fields you didn't intend to change.

### `Equals` and `==` inconsistency
For value types, `Equals` and `==` are usually consistent. For reference types, they often aren't unless explicitly overloaded.

When in doubt, use `Equals` for value semantics and `ReferenceEquals` for identity.

### `params` and arrays
```csharp
public void Log(params object[] args) { ... }

Log(1, 2, 3);              // wraps in object[]
Log(new object[] { 1, 2, 3 });   // OK
Log(new[] { 1, 2, 3 });    // CALLER PASSES int[], but expected is object[] — runtime cast error in some cases
```

Be aware of the boxing and array-type behavior.

### Async streams iteration
```csharp
await foreach (var item in SomeAsyncEnumerable())
{
    // ...
}
```

Don't forget `await`. Without it, you get the enumerable but don't iterate.

### Cancellation token propagation
```csharp
public async Task DoStuff(CancellationToken ct)
{
    await Task.Delay(1000);                  // doesn't observe cancellation!
    await OtherAsync();                       // doesn't pass ct!
}
```

Pass `ct` to everything that accepts it:
```csharp
public async Task DoStuff(CancellationToken ct)
{
    await Task.Delay(1000, ct);
    await OtherAsync(ct);
}
```

### Configuration order matters
In ASP.NET Core:
```csharp
app.UseRouting();
app.UseAuthentication();    // before authorization
app.UseAuthorization();      // before endpoints
app.MapControllers();
```

Wrong order silently breaks security. Read the docs for the middleware pipeline.

### `IOptionsSnapshot` vs `IOptions` vs `IOptionsMonitor`
- `IOptions<T>`: singleton, doesn't update on config change.
- `IOptionsSnapshot<T>`: per-scope, refreshes when config changes.
- `IOptionsMonitor<T>`: singleton, but provides `CurrentValue` that refreshes.

Most code wants `IOptions<T>`; use snapshots if you need per-request refresh.

### Native AOT pitfalls
Native AOT (file 14) disables:
- Most runtime reflection.
- Dynamic code generation.
- Some serialization (use source generators).

Test thoroughly before committing to AOT — some libraries don't support it.

### Misusing `partial`
```csharp
partial class Foo
{
    partial void OnInit();
}
```

Useful for source generators and large generated files. Not for organizing your own code into many small files — keep classes coherent.

### Forgetting `sealed`
By default, classes can be inherited. Mark `sealed` if you don't want that:
```csharp
public sealed class Money(decimal amount, string currency);
```

Helps the JIT optimize virtual calls.

### `private` is default for class members
Unlike Java (package-private is default), C# defaults to `private`. Be explicit when you want internal/public.

### Top-level statements + namespace
```csharp
// Program.cs
Console.WriteLine("Hello");

// Trying to add a namespace at the top
namespace MyApp;     // ERROR — top-level statements can't be in a namespace
```

Either use top-level statements OR a namespace declaration, not both at the file level. (Other classes in the project can be namespaced.)

### Pattern matching exhaustiveness
```csharp
sealed record Shape;
sealed record Circle(double R) : Shape;
sealed record Square(double S) : Shape;

string Describe(Shape s) => s switch
{
    Circle c => $"Circle {c.R}",
    Square sq => $"Square {sq.S}",
    // No default — compiler may warn
};
```

C# doesn't strictly enforce exhaustive switching the way some functional languages do. You may need an explicit `_` or throw on unmatched cases.

For closed hierarchies, use a `throw` for safety:
```csharp
_ => throw new ArgumentException($"Unknown shape: {s}")
```

If you add a `Triangle` later, every unhandled switch throws at runtime instead of silently doing something wrong.

---

That's modern C#. The language has evolved rapidly — records, primary constructors, collection expressions, pattern matching, source generators, Native AOT. In 2026, C# is one of the most pleasant statically-typed languages going, with first-class async, excellent tooling, and a mature ecosystem.

The arc of C# / .NET in 2026:
1. **Modern features.** Records, pattern matching, primary constructors, collection expressions. Use them.
2. **Nullable reference types on.** Catches null bugs at compile time.
3. **Async everywhere.** Most I/O is async by default.
4. **DI as default.** Constructor injection in ASP.NET Core.
5. **EF Core for data access.** Migrations, async, change tracking.
6. **Minimal APIs for simple services.** Controllers when complexity warrants.
7. **Native AOT for serverless.** Traditional JIT for long-running services.
8. **xUnit + FluentAssertions + Moq** for testing.
9. **Source generators** are the new metaprogramming — no runtime reflection.
10. **Unity for game dev** — separate world, but same language.

Next folder: **C++**, the systems-programming workhorse — game engines, performance-critical code, embedded systems.
