# 04. Object-Oriented Programming

> Classes, structs, interfaces, inheritance, records, properties. The core of how C# organizes code.

---

## Table of Contents

1. [Classes](#1-classes)
2. [Fields, Properties, Constructors](#2-fields-properties-constructors)
3. [Access Modifiers](#3-access-modifiers)
4. [Structs](#4-structs)
5. [Records](#5-records)
6. [Inheritance](#6-inheritance)
7. [Polymorphism and `override`](#7-polymorphism-and-override)
8. [Abstract Classes](#8-abstract-classes)
9. [Interfaces](#9-interfaces)
10. [Enums](#10-enums)
11. [Nested Types](#11-nested-types)
12. [`Equals`, `GetHashCode`, `ToString`](#12-equals-gethashcode-tostring)

---

## 1. Classes

A reference type — instances are allocated on the heap, accessed via references.

```csharp
public class User
{
    public long Id { get; }
    public string Name { get; set; }
    public string Email { get; }

    public User(long id, string name, string email)
    {
        Id = id;
        Name = name;
        Email = email;
    }

    public string Display() => $"{Name} <{Email}>";
}

var u = new User(1, "Alice", "a@x.com");
Console.WriteLine(u.Display());
```

### Class layout convention
1. Constants and static fields.
2. Instance fields (private, often `_name` prefix).
3. Properties.
4. Constructors.
5. Methods.
6. Nested types.

```csharp
public class Service
{
    private const int MaxRetries = 3;
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);

    private readonly IRepository _repo;
    private readonly ILogger<Service> _logger;
    private int _callCount;

    public int CallCount => _callCount;

    public Service(IRepository repo, ILogger<Service> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<User?> FindUserAsync(long id) { ... }
}
```

### `sealed` classes
Can't be inherited:
```csharp
public sealed class Money { ... }
```

For value-like classes where inheritance doesn't make sense.

### `partial` classes
Split a class across multiple files:
```csharp
// User.cs
public partial class User { public string Name { get; set; } }

// User.Validation.cs
public partial class User { public bool IsValid() => !string.IsNullOrEmpty(Name); }
```

Used heavily with source generators (compiler generates one part, you provide another).

### `static` classes
Can't be instantiated; only contain static members:
```csharp
public static class StringHelpers
{
    public static bool IsBlank(this string? s) => string.IsNullOrWhiteSpace(s);
}
```

Used for utility methods and extension methods.

---

## 2. Fields, Properties, Constructors

### Fields
```csharp
public class Counter
{
    private int _count = 0;             // private field, conventional underscore prefix
    public readonly long Created;        // readonly — set once in ctor
    public const double Pi = 3.14159;   // compile-time constant
}
```

### Properties — the C# default
Properties are the public face of data:

```csharp
public class User
{
    public string Name { get; set; }           // auto-property
    public int Age { get; init; }              // init-only (C# 9+)
    public string Email { get; }                 // get-only — set in ctor or initializer
    public required string Username { get; init; }   // must be set on construction (C# 11+)

    public string DisplayName
    {
        get => Name ?? "anonymous";
        set => Name = value.Trim();
    }

    private string? _bio;
    public string Bio
    {
        get => _bio ?? "";
        set
        {
            ArgumentNullException.ThrowIfNull(value);
            _bio = value;
        }
    }

    // Expression-bodied read-only
    public bool IsAdult => Age >= 18;
}
```

Properties look like fields at the call site, but they're methods (`get_X`, `set_X`). You can:
- Add validation logic.
- Compute on the fly.
- Change implementation without breaking callers (no API break).

### Field vs property
Always use properties for public data. Use fields only:
- Internally inside a class.
- For `readonly` or `const` values that have no logic.

### Auto-properties with initializers
```csharp
public string Name { get; set; } = "anonymous";
public List<string> Tags { get; } = new();    // initialized once; collection mutable
```

### Required vs init
- `required` — must be initialized via object initializer.
- `init` — can only be set during initialization (init or constructor).
- Both together — must be set, can only be set once.

```csharp
public class User
{
    public required string Name { get; init; }
    public required string Email { get; init; }
    public int Age { get; init; }
}

var u = new User { Name = "Alice", Email = "a@x.com", Age = 30 };
// Compile error if Name or Email omitted.
```

### Constructors
```csharp
public class Point
{
    public double X { get; }
    public double Y { get; }

    public Point()                              // default
    {
        X = 0;
        Y = 0;
    }

    public Point(double x, double y)
    {
        X = x;
        Y = y;
    }

    public Point(double both) : this(both, both) { }    // chained constructor
}
```

If you don't declare any constructor, C# generates a parameterless default. Once you declare any, the default is gone (unless you keep it explicitly).

### Primary constructors (C# 12+)
Class-level parameter declarations:
```csharp
public class UserService(IRepository repo, ILogger<UserService> logger)
{
    public async Task<User?> FindAsync(long id)
    {
        logger.LogInformation("Finding {Id}", id);
        return await repo.FindAsync(id);
    }
}
```

The parameters (`repo`, `logger`) are in scope for the entire class body. No need to explicitly create fields — the compiler captures them.

Equivalent to:
```csharp
public class UserService
{
    private readonly IRepository _repo;
    private readonly ILogger<UserService> _logger;

    public UserService(IRepository repo, ILogger<UserService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<User?> FindAsync(long id)
    {
        _logger.LogInformation("Finding {Id}", id);
        return await _repo.FindAsync(id);
    }
}
```

Much less boilerplate. Modern C# style.

### `this` and `base`
- `this(...)` — call another constructor on the same class.
- `base(...)` — call the parent's constructor.

```csharp
public class Admin : User
{
    public Admin(long id, string name, string email)
        : base(id, name, email)
    {
        // ...
    }
}
```

---

## 3. Access Modifiers

| Modifier | Class itself | Same assembly | Subclass (any assembly) | World |
|---|---|---|---|---|
| `public` | ✓ | ✓ | ✓ | ✓ |
| `internal` | ✓ | ✓ | ✗ | ✗ |
| `protected` | ✓ | ✗ | ✓ | ✗ |
| `protected internal` | ✓ | ✓ | ✓ | ✗ |
| `private protected` | ✓ | subclass + same assembly | | ✗ |
| `private` (default) | ✓ | ✗ | ✗ | ✗ |

```csharp
public class Account
{
    private decimal _balance;             // hidden
    protected long _accountId;             // subclasses
    internal string _internalNote;          // same project
    public string DisplayName { get; set; } // anyone
}
```

### Idioms
- Fields: `private` (or `protected` if subclasses need access).
- Properties: `public`/`protected` based on need.
- Most internal helper classes: `internal`.
- Public API: `public`.

For libraries, default to `internal` and explicitly mark `public` only what's intended for external use.

---

## 4. Structs

Value types — allocated inline (stack or as part of another object), copied on assignment.

```csharp
public struct Point
{
    public double X { get; init; }
    public double Y { get; init; }

    public Point(double x, double y)
    {
        X = x;
        Y = y;
    }

    public double Distance(Point other) =>
        Math.Sqrt(Math.Pow(other.X - X, 2) + Math.Pow(other.Y - Y, 2));
}
```

### `readonly struct`
Immutable struct — compiler ensures no member modifies `this`:
```csharp
public readonly struct Point
{
    public double X { get; }
    public double Y { get; }
    public Point(double x, double y) { X = x; Y = y; }
}
```

### `record struct`
Records can be structs (value-type records):
```csharp
public readonly record struct Point(double X, double Y);
```

Get value equality + struct semantics.

### When to use struct vs class
**Use struct** when:
- Small (typically < 16 bytes).
- Value semantics (equality by contents, not identity).
- Immutable.
- Short-lived or stored in arrays/collections of primitives.
- Avoiding heap allocations matters.

**Use class** when:
- Larger.
- Identity matters (two instances with same data are still "different").
- Mutable state.
- Polymorphism / inheritance needed.
- Default — class is the right call when uncertain.

### Struct pitfalls

**Copying**: passing a struct to a method copies it. Mutations don't propagate:
```csharp
void Modify(Point p) { p.X = 100; }
var pt = new Point(1, 1);
Modify(pt);    // pt.X is still 1
```

For mutation, use `ref`:
```csharp
void Modify(ref Point p) { p.X = 100; }
Modify(ref pt);    // pt.X is now 100
```

**Default constructor**: structs always have a parameterless default that zero-initializes everything. Can't disable.

**Boxing**: storing a struct in a variable of type `object` or interface boxes it (allocates on heap, copies). Avoid in hot paths.

### Built-in value types
Most "primitives" are structs:
- `int`, `long`, `double`, `bool` — all structs (`Int32`, `Int64`, ...).
- `DateTime`, `TimeSpan`, `Guid`, `decimal`.
- Tuples.

---

## 5. Records

Records are concise immutable value classes (or value structs). Auto-generated boilerplate.

```csharp
public record User(long Id, string Name, string Email);

var u = new User(1, "Alice", "a@x.com");
u.Id;        // 1
u.Name;      // "Alice"

var other = new User(1, "Alice", "a@x.com");
u == other;   // true — value equality
u.ToString();  // "User { Id = 1, Name = Alice, Email = a@x.com }"
```

What you get:
- Public init-only auto-properties for each parameter.
- A canonical constructor.
- `Equals` / `GetHashCode` based on all properties.
- `ToString` that prints all members.
- `Deconstruct` for tuple deconstruction.
- `with` expression for non-destructive mutation.

### `with` expression
```csharp
var u2 = u with { Name = "Alicia" };    // copy + override
// u is unchanged; u2 has new Name
```

### Records with bodies
```csharp
public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");
        return new Money(Amount + other.Amount, Currency);
    }

    public static Money Zero(string currency) => new(0m, currency);
}
```

### Validation in records
```csharp
public record User(long Id, string Name, string Email)
{
    public string Email { get; init; } = ValidateEmail(Email);

    private static string ValidateEmail(string email)
    {
        if (!email.Contains('@')) throw new ArgumentException("Invalid email");
        return email.ToLowerInvariant();
    }
}
```

Or use init setters:
```csharp
public record User(long Id, string Name, string Email)
{
    private readonly string _email = "";
    public string Email
    {
        get => _email;
        init
        {
            if (!value.Contains('@')) throw new ArgumentException();
            _email = value.ToLowerInvariant();
        }
    }
}
```

### Record inheritance
```csharp
public record Animal(string Name);
public record Dog(string Name, string Breed) : Animal(Name);

Animal a = new Dog("Rex", "Lab");
a.Name;    // "Rex"
```

Inheritance works, but most records are "leaf" types in a sealed hierarchy (see file 15).

### When to use records
- DTOs (data transfer objects).
- Value objects.
- Immutable data.
- Domain events / commands.
- Tuples with named fields.

### When not
- Mutable state — records are designed immutable.
- Heavy logic with identity matters — regular class.

Records are everywhere in modern C#. Use them aggressively for data carriers.

---

## 6. Inheritance

```csharp
public class Animal
{
    public string Name { get; }

    public Animal(string name)
    {
        Name = name;
    }

    public virtual string Describe() => $"An animal called {Name}";
}

public class Dog : Animal
{
    public string Breed { get; }

    public Dog(string name, string breed) : base(name)
    {
        Breed = breed;
    }

    public override string Describe() => $"A {Breed} named {Name}";

    public void Bark() => Console.WriteLine("Woof!");
}

Animal a = new Dog("Rex", "Lab");
a.Describe();    // "A Lab named Rex" — runtime dispatch
```

### Single inheritance
C# allows one base class per type. Multiple interfaces are fine.

### `virtual`, `override`, `sealed`, `new`
- `virtual` — method can be overridden by subclasses.
- `override` — overrides a virtual / abstract method.
- `sealed override` — overrides but can't be overridden further.
- `new` — hides the parent's method (not polymorphic; use `override` for polymorphism).

```csharp
public class A
{
    public virtual void M() => Console.WriteLine("A");
}

public class B : A
{
    public override void M() => Console.WriteLine("B");        // polymorphic
}

public class C : A
{
    public new void M() => Console.WriteLine("C");              // hides, not polymorphic
}

A obj = new B();
obj.M();    // "B"

A obj2 = new C();
obj2.M();   // "A" — method hiding, not override
```

`new` is rarely the right choice — use `override` for actual polymorphism. Compiler warns if you override without `override`/`new`.

### When to use inheritance
- True "is-a" relationships.
- Sharing implementation with required overrides.

### When NOT to use inheritance
- "Has-a" — use composition.
- Code reuse with no semantic relationship — use static methods.
- Many shallow hierarchies — usually a sign to use interfaces + DI.

Modern guidance: **prefer composition over inheritance**, except for narrow cases like UI controls, base service classes with template methods.

---

## 7. Polymorphism and `override`

```csharp
public abstract class Shape
{
    public abstract double Area();
}

public class Circle : Shape
{
    public double Radius { get; }
    public Circle(double r) { Radius = r; }
    public override double Area() => Math.PI * Radius * Radius;
}

public class Square : Shape
{
    public double Side { get; }
    public Square(double s) { Side = s; }
    public override double Area() => Side * Side;
}

Shape[] shapes = [new Circle(1), new Square(2)];
foreach (var s in shapes)
{
    Console.WriteLine(s.Area());     // dispatches to Circle or Square
}
```

### `is` and pattern matching
```csharp
foreach (var s in shapes)
{
    if (s is Circle c)
    {
        Console.WriteLine($"Circle with radius {c.Radius}");
    }
    else if (s is Square sq)
    {
        Console.WriteLine($"Square with side {sq.Side}");
    }
}

// Modern switch expression
foreach (var s in shapes)
{
    var desc = s switch
    {
        Circle c => $"Circle r={c.Radius}",
        Square sq => $"Square s={sq.Side}",
        _ => "unknown"
    };
    Console.WriteLine(desc);
}
```

For exhaustive switches with sealed hierarchies, see file 15.

---

## 8. Abstract Classes

Can't be instantiated. Define a contract + partial implementation.

```csharp
public abstract class Repository<T>
{
    protected abstract string TableName { get; }

    public abstract Task<T?> FindAsync(long id);

    public string DescribeTable() => $"Table: {TableName}";    // shared implementation
}

public class UserRepository : Repository<User>
{
    protected override string TableName => "users";

    public override async Task<User?> FindAsync(long id) { ... }
}
```

### Abstract vs interface
- **Abstract class**: when there's shared state or default implementation.
- **Interface**: when you only define a contract.

Modern C# interfaces have default methods, so the distinction is blurrier. Prefer interfaces unless you need shared state.

---

## 9. Interfaces

A contract that types implement.

```csharp
public interface IGreeter
{
    string Greet(string name);
}

public class EnglishGreeter : IGreeter
{
    public string Greet(string name) => $"Hello, {name}";
}

IGreeter g = new EnglishGreeter();
g.Greet("Alice");
```

### Naming convention
Prefix with `I`: `IRepository`, `IUserService`, `IDisposable`. Old convention but universal in C#.

### Multiple interfaces
```csharp
public class Bot : IGreeter, ILoggable, IConfigurable { ... }
```

### Default interface methods (C# 8+)
Implementations directly in the interface:
```csharp
public interface IGreeter
{
    string Greet(string name);

    string GreetCasually(string name) => Greet(name).ToLower();    // default impl
}
```

Lets interfaces evolve without breaking implementers. Used carefully (most teams treat interfaces as pure contracts).

### Static abstract members (C# 11+)
```csharp
public interface INumber<T> where T : INumber<T>
{
    static abstract T Zero { get; }
    static abstract T operator +(T a, T b);
}

public struct MyInt : INumber<MyInt>
{
    public int Value;
    public static MyInt Zero => new() { Value = 0 };
    public static MyInt operator +(MyInt a, MyInt b) => new() { Value = a.Value + b.Value };
}
```

Foundation for generic math (the `INumber<T>` interface in BCL).

### Generic interfaces
```csharp
public interface IRepository<T>
{
    Task<T?> FindAsync(long id);
    Task SaveAsync(T entity);
}

public class UserRepository : IRepository<User> { ... }
```

### Explicit interface implementation
When two interfaces have the same method:
```csharp
public class Multi : IA, IB
{
    void IA.M() { Console.WriteLine("from IA"); }
    void IB.M() { Console.WriteLine("from IB"); }
    public void M() { Console.WriteLine("default"); }   // for direct calls
}

var x = new Multi();
x.M();              // "default"
((IA)x).M();         // "from IA"
((IB)x).M();         // "from IB"
```

Used to hide implementation details — caller must cast to the interface.

### When to use interfaces
- Defining contracts for DI.
- Multiple implementations.
- Polymorphism without inheritance.
- Mocking in tests.

### Marker interfaces — discouraged
Don't use interfaces with no members just to "tag" types. Use attributes or pattern matching instead.

---

## 10. Enums

A fixed set of named constants.

```csharp
public enum Day
{
    Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
}

Day d = Day.Monday;
int n = (int)d;          // 0 — enums are backed by int by default
Day d2 = (Day)0;          // back from int

// Iteration
foreach (Day day in Enum.GetValues<Day>())    // .NET 5+
{
    Console.WriteLine(day);
}

// Parsing
Day d3 = Enum.Parse<Day>("Friday");
bool ok = Enum.TryParse<Day>("Friday", out Day d4);
```

### Custom values
```csharp
public enum HttpStatus
{
    OK = 200,
    Created = 201,
    NotFound = 404,
    InternalServerError = 500
}

int code = (int)HttpStatus.OK;    // 200
```

### Different underlying type
```csharp
public enum BigEnum : long
{
    Huge = 9_999_999_999L
}
```

### Flags
For bit fields:
```csharp
[Flags]
public enum Permission
{
    None = 0,
    Read = 1,
    Write = 2,
    Delete = 4,
    All = Read | Write | Delete
}

Permission p = Permission.Read | Permission.Write;
if ((p & Permission.Read) != 0) { /* can read */ }
if (p.HasFlag(Permission.Read)) { /* same */ }
```

The `[Flags]` attribute affects `ToString()` (returns "Read, Write" instead of a number).

### Enum vs constants
For closed sets of values used across the codebase, enums win:
- Type-safe.
- IntelliSense lists all options.
- Exhaustiveness in switch.

For values fetched at runtime (roles from a DB, statuses configurable), use strings or domain classes.

---

## 11. Nested Types

A type inside another type.

```csharp
public class HttpServer
{
    public class Configuration
    {
        public int Port { get; init; } = 8080;
        public string Host { get; init; } = "localhost";
    }

    public Configuration Config { get; }

    public HttpServer(Configuration config)
    {
        Config = config;
    }
}

var server = new HttpServer(new HttpServer.Configuration { Port = 9090 });
```

Used for:
- Tightly-coupled helper types.
- Builder classes.
- Internal data structures only relevant to the containing class.

For most types, top-level declaration is clearer.

---

## 12. `Equals`, `GetHashCode`, `ToString`

Every type inherits these from `object`. Default `Equals` uses reference equality for classes, structural for structs (slow, reflection-based).

### Override for classes
```csharp
public class User
{
    public long Id { get; }
    public string Name { get; }

    public User(long id, string name) { Id = id; Name = name; }

    public override bool Equals(object? obj)
    {
        return obj is User other && Id == other.Id && Name == other.Name;
    }

    public override int GetHashCode() => HashCode.Combine(Id, Name);

    public override string ToString() => $"User({Id}, {Name})";

    // Recommended: also implement IEquatable<User> for value equality
    public bool Equals(User? other) =>
        other is not null && Id == other.Id && Name == other.Name;
}
```

### Rules
- If `a.Equals(b)` is true, `a.GetHashCode() == b.GetHashCode()` **must** be true.
- Implement them together — never just one.

### Records do this automatically
```csharp
public record User(long Id, string Name);
```

Equality, hash code, ToString all generated. Strongly prefer records for value types.

### `IEquatable<T>`
```csharp
public class User : IEquatable<User>
{
    public bool Equals(User? other) { ... }
}
```

Generic, avoids boxing for value types. Records implement this automatically.

### `IComparable<T>` for ordering
```csharp
public class User : IComparable<User>
{
    public string Name { get; }

    public int CompareTo(User? other) =>
        string.Compare(Name, other?.Name, StringComparison.OrdinalIgnoreCase);
}
```

Enables sorting:
```csharp
list.Sort();    // uses IComparable<T>
```

### `ToString` for debugging
Always override for domain objects. Default `ToString()` returns the type name — useless.

For records, you get a sensible default automatically.

### `==` overloading
```csharp
public class Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    // ...

    public static bool operator ==(Money a, Money b) => a.Equals(b);
    public static bool operator !=(Money a, Money b) => !a.Equals(b);
}
```

For records and structs, `==` is auto-generated.

---

That's the OOP surface. Modern C# code uses:
- **Records** for data.
- **Classes** with primary constructors for services.
- **Interfaces** for contracts.
- **Sealed hierarchies** for closed type unions.
- **Inheritance** sparingly.

Next: generics and the type system depth — `05_generics_and_advanced_types.md`.
