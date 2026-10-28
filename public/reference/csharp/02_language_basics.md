# 02. Language Basics

> C# syntax, types, variables, control flow, modern features.

> Modern C# (12 / 13) reads concisely. Top-level statements, records, pattern matching, file-scoped namespaces, and global usings remove most ceremony.

---

## Table of Contents

1. [Source File Anatomy](#1-source-file-anatomy)
2. [Primitive Types](#2-primitive-types)
3. [Variables and `var`](#3-variables-and-var)
4. [Operators](#4-operators)
5. [Strings](#5-strings)
6. [Control Flow](#6-control-flow)
7. [Switch — Statements and Expressions](#7-switch--statements-and-expressions)
8. [Loops](#8-loops)
9. [Arrays](#9-arrays)
10. [Methods](#10-methods)
11. [Comments and XML Documentation](#11-comments-and-xml-documentation)

---

## 1. Source File Anatomy

```csharp
// File-scoped namespace (C# 10+)
namespace MyApp.Users;

using System;                       // using directive
using System.Collections.Generic;
using static System.Math;            // static using
using DateTimeOffset = System.DateTimeOffset;   // alias

public class Greeter
{
    public string Greet(string name) => $"Hello, {name}!";
}
```

### File-scoped vs block-scoped namespace
```csharp
// Old style (block-scoped)
namespace MyApp.Users
{
    public class Greeter { ... }
}

// Modern (file-scoped)
namespace MyApp.Users;

public class Greeter { ... }
```

File-scoped saves indentation. Strongly preferred for new code.

### Global usings (C# 10+)
Put common imports in a file (or set them in `.csproj`):
```csharp
// GlobalUsings.cs
global using System;
global using System.Collections.Generic;
global using System.Linq;
global using System.Threading.Tasks;
```

Now every file in the project has these. With `<ImplicitUsings>enable</ImplicitUsings>`, the SDK adds a default set automatically.

### Top-level statements (C# 9+)
```csharp
// Program.cs — no class/Main needed
Console.WriteLine("Hello!");

var x = ReadNumber();
Console.WriteLine($"You entered: {x}");

static int ReadNumber()
{
    return int.Parse(Console.ReadLine() ?? "0");
}
```

Only one file in a project can have top-level statements (typically `Program.cs`). Functions can be declared at the top level too.

---

## 2. Primitive Types

### Numeric types

| Type | Size | Range | Notes |
|---|---|---|---|
| `byte` | 8 bits | 0 to 255 | Unsigned |
| `sbyte` | 8 bits | -128 to 127 | Signed |
| `short` | 16 bits | -32K to 32K | Signed |
| `ushort` | 16 bits | 0 to 65K | Unsigned |
| `int` | 32 bits | ±2.1 billion | The default integer |
| `uint` | 32 bits | 0 to 4.2 billion | Unsigned |
| `long` | 64 bits | ±9.2 quintillion | Suffix: `100L` |
| `ulong` | 64 bits | 0 to 18 quintillion | Suffix: `100UL` |
| `float` | 32 bits | ~7 decimal digits | Suffix: `3.14f` |
| `double` | 64 bits | ~15 decimal digits | The default float |
| `decimal` | 128 bits | 28-29 decimal digits | Suffix: `19.99m`. Exact, for money. |
| `char` | 16 bits | UTF-16 code unit | Single quotes: `'A'` |
| `bool` | 1 byte | `true` / `false` | Not 0/1 |

```csharp
int count = 42;
long bigNum = 9_999_999_999L;
double pi = 3.14159;
float f = 3.14f;
decimal price = 19.99m;
char c = 'A';
bool ok = true;
```

### `decimal` for money
Java has `BigDecimal`; C# has `decimal` built in.
```csharp
decimal price = 9.99m;
decimal tax = price * 0.07m;     // exact arithmetic
```

Use `decimal` for currency, financial calculations, anywhere fractional precision matters.

### Underscores in literals
```csharp
int oneMillion = 1_000_000;
long phoneNum = 555_123_4567L;
int binary = 0b1010_0101;
int hex = 0xDEAD_BEEF;
```

### Numeric type promotion
```csharp
int a = 10, b = 3;
double r = a / b;           // 3.0 — integer division first!
double r2 = (double)a / b;   // 3.333...
```

### Overflow
```csharp
int x = int.MaxValue;
int y = x + 1;              // wraps (silent overflow)
checked
{
    int z = x + 1;          // OverflowException
}
```

Use `checked` blocks (or `-Compile.CheckOverflow` in project) for safety.

### `BigInteger`
```csharp
using System.Numerics;
BigInteger huge = BigInteger.Parse("12345678901234567890");
```

For arbitrary-precision integers.

---

## 3. Variables and `var`

```csharp
int count = 0;
string name = "Alice";
List<int> nums = new List<int>();
```

### `var` — type inference
```csharp
var count = 0;                              // int
var name = "Alice";                          // string
var nums = new List<int>();                  // List<int>
var dict = new Dictionary<string, int>();   // Dictionary<string, int>
```

`var` works only for locals (not fields, parameters, return types). Type must be inferrable.

**When to use `var`**:
- Type is obvious from RHS.
- Long type names: `var list = new Dictionary<string, List<User>>();`.
- Modern .NET conventions favor `var` over `string` / `int` in most places.

**When to skip**:
- When the explicit type adds clarity.
- For literals where inference might surprise.

### Constants — `const` and `readonly`
```csharp
public const int MaxItems = 100;             // compile-time constant
public static readonly DateTime Epoch = new(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
```

- `const` — compile-time, primitives + string only, baked into callers.
- `readonly` — runtime-initialized, can be set in constructor.

### `init` setters (C# 9+)
Properties that can only be set during initialization:
```csharp
public class User
{
    public required string Name { get; init; }
    public string Email { get; init; } = "";
}

var u = new User { Name = "Alice", Email = "a@x.com" };
u.Name = "Bob";    // ERROR — init only
```

### `required` (C# 11+)
```csharp
public class User
{
    public required string Name { get; init; }
}

var u = new User();    // ERROR — Name required
```

### Scope
```csharp
if (condition)
{
    int x = 10;
}
// x not visible here
```

---

## 4. Operators

Standard C-family operators:
```csharp
a + b, a - b, a * b, a / b, a % b
a++; ++a;
a == b, a != b, a < b, a > b, a <= b, a >= b
a && b, a || b, !a
a & b, a | b, a ^ b, ~a, a << 2, a >> 2
a += 1, a -= 1, ...
a is int     // type test
a as string   // safe cast (null if fails)
```

### Null-coalescing
```csharp
string name = maybeName ?? "default";              // null → "default"
name ??= "default";                                  // assign if null

string? city = user?.Address?.City;                  // null-conditional chain
int count = list?.Count ?? 0;                         // optional chain + default
```

### Range and index operators (C# 8+)
```csharp
var arr = new[] { 1, 2, 3, 4, 5 };
arr[^1];          // 5 (last)
arr[^2];          // 4 (second to last)
arr[1..3];        // [2, 3] (range)
arr[..3];          // [1, 2, 3] (first 3)
arr[3..];          // [4, 5]
arr[..];           // copy
```

### Pattern matching operators
```csharp
if (obj is string s) { Console.WriteLine(s.Length); }
if (obj is not null) { ... }
if (obj is int i and > 0) { ... }
if (color is Color.Red or Color.Blue) { ... }
```

---

## 5. Strings

`string` is immutable, UTF-16.

```csharp
string s = "hello";
int len = s.Length;
char c = s[0];                     // 'h'
bool has = s.Contains("ell");
string upper = s.ToUpper();
string sub = s.Substring(1, 3);     // "ell" (start, length)
string[] parts = "a,b,c".Split(',');
string joined = string.Join("-", "a", "b", "c");
bool empty = string.IsNullOrEmpty(s);
bool blank = string.IsNullOrWhiteSpace(s);
string trimmed = "  x  ".Trim();
```

### String interpolation
```csharp
string name = "Alice";
int age = 30;
string s = $"Name: {name}, Age: {age}";
string s2 = $"Pi: {Math.PI:F2}";       // formatted: "Pi: 3.14"
string s3 = $"Date: {DateTime.Now:yyyy-MM-dd}";
```

Inside `{}`, you can put any expression:
```csharp
$"Total: ${items.Sum(i => i.Price):C}"
```

### Verbatim and raw strings
```csharp
string path = @"C:\Users\Alice\file.txt";    // verbatim — \ is literal
string multiline = @"
    Line 1
    Line 2
";

// Raw strings (C# 11+) — for JSON, regex, etc.
string json = """
    {
        "name": "Alice",
        "age": 30
    }
    """;

// Interpolated raw strings
string html = $"""
    <h1>Hello, {name}</h1>
    """;
```

The number of `"` quotes determines the delimiter:
- `"""...."""` — three quotes (closing pair on its own line for multiline).
- Use `""""..."""` (four) if your content contains three consecutive `"`.

### StringBuilder for concatenation in loops
```csharp
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++)
{
    sb.Append(i).Append(',');
}
string result = sb.ToString();
```

Plain `+=` in a loop is O(n²).

### Comparing strings
```csharp
"hello" == "hello";                  // true — string == is overloaded for value equality
"hello".Equals("hello");
"hello".Equals(other, StringComparison.OrdinalIgnoreCase);
string.Compare("a", "b");             // sort order
```

Unlike Java, C# overloads `==` for strings to do value comparison. Convenient.

For case-insensitive: use `StringComparison.OrdinalIgnoreCase`. Don't lowercase strings to compare (slower, allocates).

### Formatting
```csharp
int n = 1234;
string s = n.ToString("N0");          // "1,234"
string p = (0.85).ToString("P");      // "85.00 %"
string c = (9.99).ToString("C");      // "$9.99" (culture-dependent)
string h = 255.ToString("X");          // "FF" (hex)

DateTime now = DateTime.Now;
string d = now.ToString("yyyy-MM-dd");
string t = now.ToString("HH:mm:ss");
```

`String.Format` is also available (older style):
```csharp
string s = string.Format("Hello, {0}! You are {1}.", name, age);
```

---

## 6. Control Flow

### `if` / `else`
```csharp
if (condition)
{
    // ...
}
else if (other)
{
    // ...
}
else
{
    // ...
}
```

Braces are optional for single statements but always use them.

### Ternary
```csharp
string status = isActive ? "active" : "inactive";
```

### Null-conditional with method calls
```csharp
user?.GetName();          // if user is null, expression is null (and method not called)
user?.UpdateName("Alice");  // same; void method just isn't called
```

---

## 7. Switch — Statements and Expressions

### Traditional switch statement
```csharp
switch (day)
{
    case "Monday":
    case "Tuesday":
        Console.WriteLine("Early week");
        break;
    case "Friday":
        Console.WriteLine("Almost weekend");
        break;
    default:
        Console.WriteLine("Other");
        break;
}
```

`break` is required. No fall-through (unlike C/Java).

### Switch expression (C# 8+)
```csharp
string desc = day switch
{
    "Monday" or "Tuesday" => "Early week",
    "Friday" => "Almost weekend",
    "Saturday" or "Sunday" => "Weekend",
    _ => "Other"            // _ is the discard / catch-all
};
```

- `=>` instead of `:`.
- Each arm returns a value.
- `_` is the default case.
- More concise; usually preferred for value-returning logic.

### Pattern matching in switch
```csharp
string describe = shape switch
{
    Circle c => $"Circle r={c.Radius}",
    Rectangle r => $"Rectangle {r.Width}x{r.Height}",
    _ => "Unknown"
};

// With property patterns
string status = order switch
{
    { Total: 0 } => "empty",
    { Total: > 0 and < 100 } => "small",
    { Total: >= 100 and < 1000 } => "medium",
    _ => "large"
};

// With tuple patterns
string quadrant = (x, y) switch
{
    (> 0, > 0) => "Q1",
    (< 0, > 0) => "Q2",
    (< 0, < 0) => "Q3",
    (> 0, < 0) => "Q4",
    (0, _) or (_, 0) => "axis",
    _ => "origin"
};
```

Pattern matching in C# is extensive — covered more in `05_generics_and_advanced_types.md` and `15_modern_features_and_advanced.md`.

### Exhaustiveness
For non-exhaustive switches, the compiler warns but doesn't error. With `enum`s or sealed hierarchies, you can encourage exhaustiveness with discards.

---

## 8. Loops

### `while` / `do-while`
```csharp
while (condition)
{
    // ...
}

do
{
    // ...
} while (condition);
```

### `for`
```csharp
for (int i = 0; i < 10; i++)
{
    // ...
}
```

### `foreach`
```csharp
foreach (var name in names)
{
    Console.WriteLine(name);
}

foreach (var (key, value) in dict)   // tuple deconstruction
{
    Console.WriteLine($"{key}: {value}");
}
```

The default loop for collections — read clearer than indexed `for`.

### `break` and `continue`
```csharp
for (int i = 0; i < 100; i++)
{
    if (i == 50) break;
    if (i % 2 == 0) continue;
    Console.WriteLine(i);
}
```

### Labels
C# doesn't have labeled break (unlike Java). Extract a method that returns early instead.

---

## 9. Arrays

```csharp
int[] nums = new int[5];                  // {0, 0, 0, 0, 0}
int[] vals = { 1, 2, 3, 4, 5 };
int[] vals2 = new[] { 1, 2, 3, 4, 5 };    // type inferred
string[] names = ["Alice", "Bob"];        // C# 12+ collection expressions

nums.Length;     // 5
nums[0] = 42;
```

### Multi-dimensional
```csharp
int[,] grid = new int[3, 4];      // rectangular — 3 rows × 4 cols
grid[1, 2] = 7;

int[][] jagged = new int[3][];     // jagged — rows can be different sizes
jagged[0] = new[] { 1, 2 };
jagged[1] = new[] { 1, 2, 3, 4 };
```

Jagged arrays are more common in C# — easier to work with and often faster.

### Collection expressions (C# 12+)
```csharp
int[] arr = [1, 2, 3];
List<int> list = [1, 2, 3];
Span<int> span = [1, 2, 3];
HashSet<int> set = [1, 2, 3];

// Spread
int[] more = [.. arr, 4, 5, 6];
```

A unified syntax for creating collections. Cleaner than `new[]` or `new List<int> { ... }`.

### `Array` methods
```csharp
int[] arr = { 3, 1, 4, 1, 5 };
Array.Sort(arr);                          // mutates: { 1, 1, 3, 4, 5 }
int idx = Array.BinarySearch(arr, 4);
int[] copy = arr.Take(3).ToArray();
string s = string.Join(",", arr);
Array.Reverse(arr);
Array.Fill(arr, 0);
bool eq = arr.SequenceEqual(other);
```

### Arrays vs `List<T>`
- **Array** — fixed size, fast indexed access.
- **`List<T>`** — dynamic, slightly more overhead.
- **`Span<T>`** — view over memory, no allocation, advanced. See `14_runtime_and_performance.md`.

For most code, prefer `List<T>` for mutable; arrays for fixed-size.

---

## 10. Methods

```csharp
public class Calculator
{
    public int Add(int a, int b)
    {
        return a + b;
    }

    public int Multiply(int a, int b) => a * b;   // expression-bodied member

    public static double Pi() => Math.PI;

    public void Print(int n)                       // no return
    {
        Console.WriteLine(n);
    }
}
```

### Expression-bodied members
For single-expression methods:
```csharp
public int Add(int a, int b) => a + b;
public string Greet(string name) => $"Hello, {name}";
public bool IsAdult => Age >= 18;     // property
```

### Method parameters

**Default parameters**:
```csharp
public void Greet(string name = "world", string prefix = "Hello")
{
    Console.WriteLine($"{prefix}, {name}");
}

Greet();                        // "Hello, world"
Greet("Alice");                  // "Hello, Alice"
Greet(prefix: "Hi");              // "Hi, world"  — named argument
```

**Named arguments**:
```csharp
Greet(name: "Alice", prefix: "Hi");
```

Helpful for clarity at call sites with many params.

**`params` for varargs**:
```csharp
public int Sum(params int[] nums)
{
    return nums.Sum();
}

Sum();              // 0
Sum(1);              // 1
Sum(1, 2, 3);        // 6
Sum([1, 2, 3]);       // 6
```

`params` must be the last parameter.

**`out` parameters**:
```csharp
public bool TryParse(string s, out int result)
{
    return int.TryParse(s, out result);
}

if (TryParse("42", out int n))      // declare inline
{
    Console.WriteLine(n);
}
```

The `Try*` pattern is idiomatic — used for parsing, dictionary lookups, etc.

**`ref` parameters**:
```csharp
public void Increment(ref int x)
{
    x++;
}

int n = 5;
Increment(ref n);    // n is 6
```

`ref` is rare; usually a sign to redesign.

**`in` parameters**:
```csharp
public void Process(in LargeStruct s)
{
    // s is passed by reference but read-only
}
```

For passing large structs without copy.

### Method overloading
```csharp
public int Max(int a, int b) => a > b ? a : b;
public double Max(double a, double b) => a > b ? a : b;
public int Max(int a, int b, int c) => Max(Max(a, b), c);
```

### Local functions
```csharp
public int Factorial(int n)
{
    return Compute(n);

    static int Compute(int x)
    {
        return x <= 1 ? 1 : x * Compute(x - 1);
    }
}
```

Functions inside functions. `static` local functions can't capture outer variables — clearer, fewer surprises.

### Extension methods
Add methods to existing types without modifying them:
```csharp
public static class StringExtensions
{
    public static bool IsBlank(this string s)
    {
        return string.IsNullOrWhiteSpace(s);
    }

    public static string Reverse(this string s)
    {
        return new string(s.Reverse().ToArray());
    }
}

"hello".IsBlank();    // false
"  ".IsBlank();        // true
"hello".Reverse();     // "olleh"
```

The `this` keyword on the first parameter makes it an extension. LINQ is built entirely on extension methods on `IEnumerable<T>`.

### Pass-by-value vs reference
C# is pass-by-value:
- Primitives: copied.
- Classes (reference types): the **reference** is copied. Same object, two references.
- Structs (value types): the whole struct is copied.

```csharp
void Modify(int x) { x = 100; }
int n = 5;
Modify(n);          // n still 5

void AddItem(List<string> list) { list.Add("new"); }
var items = new List<string>();
AddItem(items);     // items now has "new"
```

For classes, you can mutate the object, but can't change which object the caller's variable points to (without `ref`).

---

## 11. Comments and XML Documentation

```csharp
// Single-line comment

/* Multi-line
   comment */

/// <summary>
/// Adds two integers.
/// </summary>
/// <param name="a">The first number.</param>
/// <param name="b">The second number.</param>
/// <returns>The sum of <paramref name="a"/> and <paramref name="b"/>.</returns>
/// <exception cref="OverflowException">If the sum overflows.</exception>
public int Add(int a, int b) => checked(a + b);
```

XML doc comments are picked up by:
- IDE tooltips (great IDE support — hover and you see the docs).
- Documentation generators (DocFX, Sandcastle).
- IntelliSense.

Common tags:
- `<summary>`, `<remarks>`.
- `<param name="x">`, `<returns>`, `<exception cref="X">`.
- `<see cref="Type"/>`, `<seealso>`.
- `<example>`, `<code>`.
- `<paramref name="x"/>`, `<typeparamref name="T"/>`.

Enable doc generation in `.csproj`:
```xml
<PropertyGroup>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
</PropertyGroup>
```

Produces an XML file alongside your DLL — shipped with NuGet packages so consumers get IntelliSense.

### What to document
- Public APIs of libraries.
- Non-obvious behavior in services.
- Anything where the call site might be wrong without context.

Skip docs on trivial properties. The name should already say it.

---

That's the surface. Next: data structures, where C# offers a strong standard library — `03_data_structures.md`.
