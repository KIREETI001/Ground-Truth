# 06. LINQ & Lambdas

> LINQ (Language INtegrated Query), lambdas, delegates, method references. The functional toolkit.

> LINQ is the killer feature C# pioneered in 2007 — Java's streams (2014) followed. Modern C# uses LINQ extensively for data transformations.

---

## Table of Contents

1. [Lambdas](#1-lambdas)
2. [Delegates](#2-delegates)
3. [`Func`, `Action`, `Predicate`](#3-func-action-predicate)
4. [LINQ — Two Syntaxes](#4-linq--two-syntaxes)
5. [Common LINQ Operators](#5-common-linq-operators)
6. [Aggregation](#6-aggregation)
7. [Grouping and Joining](#7-grouping-and-joining)
8. [Materialization](#8-materialization)
9. [Deferred Execution](#9-deferred-execution)
10. [LINQ to SQL / Entities](#10-linq-to-sql--entities)
11. [Common Patterns](#11-common-patterns)
12. [Pitfalls](#12-pitfalls)

---

## 1. Lambdas

A lambda is a concise anonymous function:

```csharp
Func<int, int> times2 = x => x * 2;
times2(5);    // 10

Func<int, int, int> add = (a, b) => a + b;
add(2, 3);    // 5

// Block body
Func<int, string> describe = x =>
{
    if (x < 0) return "negative";
    if (x == 0) return "zero";
    return "positive";
};
```

### Syntax forms
```csharp
// No params
() => DoStuff()
() => { stmt1(); stmt2(); }

// One param (parens optional)
x => x * 2
(x) => x * 2
(int x) => x * 2

// Multiple params (parens required)
(x, y) => x + y
(int x, int y) => x + y

// Body — expression or block
x => x.Length
x => { return x.Length; }
```

### Static lambdas
A static lambda can't capture variables — performance benefit, prevents accidental closures:
```csharp
Func<int, int> times2 = static x => x * 2;
```

### Capturing variables
Lambdas can reference variables from the enclosing scope:
```csharp
int multiplier = 3;
Func<int, int> times = x => x * multiplier;
times(5);    // 15

multiplier = 4;
times(5);    // 20 — captured by reference
```

Captures are by reference, not by value. Watch for mutation:
```csharp
var funcs = new List<Func<int>>();
for (int i = 0; i < 3; i++)
{
    funcs.Add(() => i);    // all capture the same i
}

foreach (var f in funcs) Console.WriteLine(f());    // 3, 3, 3 (or maybe correct depending on C# version)
```

In modern C# (with `foreach` and inside `for` blocks), this is generally safer than older C# versions. Still, capture local copies if unsure:
```csharp
for (int i = 0; i < 3; i++)
{
    int captured = i;
    funcs.Add(() => captured);
}
```

### Lambdas vs methods
```csharp
list.Where(x => x > 0);                  // lambda
list.Where(IsPositive);                   // method group conversion

static bool IsPositive(int x) => x > 0;
```

Method groups are often clearer when the operation has a meaningful name.

---

## 2. Delegates

A delegate is a type that represents a method signature. It's how C# implements first-class functions.

```csharp
public delegate int Operation(int a, int b);

Operation add = (a, b) => a + b;
Operation mul = (a, b) => a * b;

int result = add(2, 3);   // 5
```

### Multicast delegates
A delegate can hold multiple methods:
```csharp
Action<string> log = Console.WriteLine;
log += s => File.AppendAllText("log.txt", s);
log("hello");    // prints AND writes to file
```

Used for events.

### Events
Built on delegates:
```csharp
public class Button
{
    public event EventHandler? Clicked;

    public void Press()
    {
        Clicked?.Invoke(this, EventArgs.Empty);
    }
}

var btn = new Button();
btn.Clicked += (sender, args) => Console.WriteLine("clicked");
btn.Press();
```

Used heavily in UI frameworks (WPF, Windows Forms, MAUI). For non-UI code, prefer immediate callbacks or async patterns.

---

## 3. `Func`, `Action`, `Predicate`

Built-in generic delegates:

| Type | Signature | Use |
|---|---|---|
| `Action` | `void Method()` | No args, no return |
| `Action<T>` | `void Method(T)` | One arg, no return |
| `Action<T1, T2>` | `void Method(T1, T2)` | Two args, no return |
| ... | up to 16 args | |
| `Func<TResult>` | `TResult Method()` | No args, returns TResult |
| `Func<T, TResult>` | `TResult Method(T)` | One arg, returns TResult |
| `Func<T1, T2, TResult>` | `TResult Method(T1, T2)` | Two args, returns TResult |
| ... | up to 16 args | |
| `Predicate<T>` | `bool Method(T)` | Returns bool (legacy; use `Func<T, bool>` now) |

```csharp
Func<int, int> times2 = x => x * 2;
Func<int, int, int> add = (a, b) => a + b;
Action<string> log = Console.WriteLine;
Predicate<int> isPositive = x => x > 0;
```

Almost no one defines custom delegates anymore — these built-ins cover everything.

---

## 4. LINQ — Two Syntaxes

LINQ has two equivalent syntaxes — query (SQL-like) and method (fluent).

### Method syntax (preferred today)
```csharp
var result = users
    .Where(u => u.Age >= 18)
    .OrderBy(u => u.Name)
    .Select(u => u.Email)
    .ToList();
```

### Query syntax
```csharp
var result = (from u in users
              where u.Age >= 18
              orderby u.Name
              select u.Email).ToList();
```

Method syntax is more flexible (supports all operators), reads naturally, dominates in 2026 C# code. Query syntax shines for complex joins / group-by.

### Mixing
You can mix:
```csharp
var result = (from u in users
              where u.Age >= 18
              select u.Email)
              .Distinct()
              .ToList();
```

---

## 5. Common LINQ Operators

All on `IEnumerable<T>`.

### Filter
```csharp
var adults = users.Where(u => u.Age >= 18);
```

### Map / Transform
```csharp
var names = users.Select(u => u.Name);
var pairs = users.Select((u, i) => new { Index = i, User = u });    // with index
```

### Flatten (flatMap)
```csharp
var allTags = posts.SelectMany(p => p.Tags);
var allTagsDistinct = posts.SelectMany(p => p.Tags).Distinct();
```

### Sort
```csharp
var byName = users.OrderBy(u => u.Name);
var byAgeDesc = users.OrderByDescending(u => u.Age);

// Multi-key
var byCityThenName = users
    .OrderBy(u => u.City)
    .ThenBy(u => u.Name)
    .ThenByDescending(u => u.Age);
```

`ThenBy` must follow `OrderBy` (it operates on the previously-sorted sequence).

### Distinct
```csharp
var unique = nums.Distinct();
var distinctByName = users.DistinctBy(u => u.Name);    // .NET 6+
```

### Take / Skip
```csharp
var first10 = users.Take(10);
var afterFirst10 = users.Skip(10);
var page2 = users.Skip(20).Take(20);

// Conditional
var untilOver18 = users.TakeWhile(u => u.Age < 18);
var fromOver18 = users.SkipWhile(u => u.Age < 18);
```

### Concat / Union / Intersect / Except
```csharp
var combined = a.Concat(b);          // a followed by b (with duplicates)
var union = a.Union(b);              // a ∪ b (no duplicates)
var intersect = a.Intersect(b);     // a ∩ b
var difference = a.Except(b);        // a - b

var unionBy = a.UnionBy(b, x => x.Id);    // .NET 6+ — by key
```

### Reverse
```csharp
var reversed = list.Reverse();
```

For LINQ — works on any sequence. `List<T>.Reverse()` mutates in place; LINQ's is a new sequence.

### Index
```csharp
var withIndex = users.Index();    // .NET 9+ — returns (int Index, T Item) tuples

foreach (var (i, user) in users.Index())
{
    Console.WriteLine($"{i}: {user.Name}");
}

// Pre-.NET 9
var withIndex2 = users.Select((u, i) => (i, u));
```

### Zip
```csharp
var pairs = names.Zip(ages, (name, age) => new { Name = name, Age = age });

// 3-tuple zip (.NET 6+)
var triples = names.Zip(ages, cities, (n, a, c) => (n, a, c));
```

Stops at the shorter sequence.

---

## 6. Aggregation

### Count
```csharp
int count = users.Count();
int adults = users.Count(u => u.Age >= 18);
```

`Count()` enumerates the whole sequence unless the source has a `Count` property (List, ICollection). For very large IEnumerables, prefer `Any()` for existence checks.

### Sum / Min / Max / Average
```csharp
int totalAge = users.Sum(u => u.Age);
int oldest = users.Max(u => u.Age);
int youngest = users.Min(u => u.Age);
double avg = users.Average(u => u.Age);
```

For non-numeric types:
```csharp
User oldest = users.MaxBy(u => u.Age);    // .NET 6+
User youngest = users.MinBy(u => u.Age);
```

### Any / All
```csharp
bool hasAdult = users.Any(u => u.Age >= 18);
bool hasAny = users.Any();
bool allAdult = users.All(u => u.Age >= 18);
```

Short-circuit — stops at first match (or first non-match for `All`).

### Contains
```csharp
bool has = list.Contains("alice");
```

### First / Last / Single
```csharp
User first = users.First();                          // throws if empty
User firstOrDefault = users.FirstOrDefault();         // null/default if empty

User firstAdult = users.First(u => u.Age >= 18);
User? firstAdultOrNull = users.FirstOrDefault(u => u.Age >= 18);

User single = users.Single(u => u.Id == 1);          // throws if 0 or >1 matches
User? singleOrDefault = users.SingleOrDefault(u => u.Id == 1);   // throws if >1, null if 0

User last = users.Last();
User? lastOrDefault = users.LastOrDefault(u => u.Age < 18);
```

Use `SingleOrDefault` when you expect exactly one or zero (e.g., DB lookup by unique ID).

### Aggregate
```csharp
int sum = nums.Aggregate((a, b) => a + b);
int sum2 = nums.Aggregate(0, (acc, x) => acc + x);          // with seed
string joined = strs.Aggregate("", (acc, s) => acc + ", " + s);
```

For most cases, prefer specific operators (`Sum`, `Concat`, etc.). `Aggregate` is the general fold.

---

## 7. Grouping and Joining

### GroupBy
```csharp
var byCity = users.GroupBy(u => u.City);

foreach (var group in byCity)
{
    Console.WriteLine($"City: {group.Key}");
    foreach (var user in group)
    {
        Console.WriteLine($"  {user.Name}");
    }
}

// As Dictionary
var dict = users
    .GroupBy(u => u.City)
    .ToDictionary(g => g.Key, g => g.ToList());

// Count by key
var countByCity = users
    .GroupBy(u => u.City)
    .ToDictionary(g => g.Key, g => g.Count());

// With element selector
var emailsByCity = users
    .GroupBy(u => u.City, u => u.Email);
```

### CountBy (.NET 9+)
```csharp
var countByCity = users.CountBy(u => u.City);
```

Returns `IEnumerable<KeyValuePair<TKey, int>>`. More concise than `GroupBy + Count`.

### AggregateBy (.NET 9+)
```csharp
var totalByCity = users.AggregateBy(
    keySelector: u => u.City,
    seed: 0,
    func: (acc, u) => acc + u.Age);
```

### Join
SQL-style inner join:
```csharp
var query = users.Join(
    orders,
    u => u.Id,                            // user key
    o => o.UserId,                         // order key
    (u, o) => new { u.Name, o.Total });    // result selector

// In query syntax (often clearer for joins)
var q = from u in users
        join o in orders on u.Id equals o.UserId
        select new { u.Name, o.Total };
```

### GroupJoin (left outer join basis)
```csharp
var query = users.GroupJoin(
    orders,
    u => u.Id,
    o => o.UserId,
    (u, orderGroup) => new { User = u, Orders = orderGroup });
```

### Left outer join
```csharp
var leftOuter = from u in users
                join o in orders on u.Id equals o.UserId into orderGroup
                from o in orderGroup.DefaultIfEmpty()
                select new { u.Name, OrderTotal = o?.Total ?? 0 };
```

---

## 8. Materialization

LINQ operators return `IEnumerable<T>` — lazy. To force evaluation:

```csharp
var list = query.ToList();
var arr = query.ToArray();
var dict = query.ToDictionary(x => x.Id);
var set = query.ToHashSet();
var lookup = query.ToLookup(x => x.Category);    // multi-value map
var frozen = query.ToFrozenDictionary(x => x.Id);    // .NET 8+
```

`ToList` is the most common — convert to a concrete list to:
- Avoid re-enumeration.
- Cache the result.
- Get methods only on `List` (random access, etc.).

### `Lookup<K, T>`
Like `Dictionary<K, List<T>>` but immutable, optimized.
```csharp
var byCategory = items.ToLookup(i => i.Category);
foreach (var item in byCategory["books"])
{
    // ...
}
byCategory["missing"];    // empty group, no exception
```

---

## 9. Deferred Execution

```csharp
var query = users.Where(u => u.Age >= 18);    // nothing happens yet

foreach (var u in query)                       // executes now
{
    Console.WriteLine(u.Name);
}

foreach (var u in query)                       // executes AGAIN
{
    Console.WriteLine(u.Name);
}
```

Each enumeration re-runs the pipeline. Beware of:
- Expensive sources (DB queries that re-execute).
- Side effects in `Select` or `Where`.
- Mutated source (subsequent enumerations see changes).

To avoid: `ToList()` or `ToArray()` to materialize once.

### Side effects in LINQ
```csharp
var query = users.Select(u =>
{
    Console.WriteLine($"Processing {u.Name}");    // side effect
    return u.Email;
});

query.Count();    // logs every user
query.Count();    // logs every user AGAIN
```

Avoid side effects in LINQ. Use a regular foreach if you need them.

### Streaming vs buffered operators
- **Streaming** (returns one element at a time): `Where`, `Select`, `Take`, `Skip`, `Concat`.
- **Buffered** (must read entire input): `OrderBy`, `GroupBy`, `Reverse`, `ToList`.

Buffered operators kill the pipeline's laziness from that point.

---

## 10. LINQ to SQL / Entities

When LINQ runs against a database via Entity Framework Core, queries are translated to SQL:

```csharp
var query = db.Users
    .Where(u => u.Age >= 18)
    .OrderBy(u => u.Name)
    .Select(u => new { u.Id, u.Name });

var results = await query.ToListAsync();
```

Translated to:
```sql
SELECT u.Id, u.Name
FROM Users u
WHERE u.Age >= 18
ORDER BY u.Name
```

### Restrictions
Not all LINQ works in DB queries — only operations the EF Core provider can translate to SQL. Things that work in-memory:
```csharp
db.Users.Where(u => u.Name.Length > 5);    // might or might not translate
db.Users.Where(u => SomeMethod(u));         // doesn't translate — your method isn't SQL
```

When it can't translate, EF Core may:
- Fetch all rows and filter client-side (silent perf disaster).
- Throw (newer EF Core defaults).

Always check generated SQL during development.

### `AsEnumerable` to switch to in-memory
```csharp
var result = db.Users
    .Where(u => u.Age >= 18)        // SQL
    .AsEnumerable()                  // switch to in-memory
    .Where(u => SomeComplexCheck(u)) // C# only
    .ToList();
```

Useful when you need both DB and in-memory operations.

Covered fully in `10_databases_and_ef_core.md`.

---

## 11. Common Patterns

### Project to DTO
```csharp
var dtos = users
    .Select(u => new UserDTO { Id = u.Id, Name = u.Name })
    .ToList();
```

### Conditional logic in Select
```csharp
var labels = users
    .Select(u => u.IsAdult ? u.Name : "(minor)")
    .ToList();
```

### Group counts
```csharp
var stats = users
    .GroupBy(u => u.City)
    .Select(g => new { City = g.Key, Count = g.Count() })
    .OrderByDescending(s => s.Count)
    .ToList();
```

### Top N
```csharp
var top5 = users
    .OrderByDescending(u => u.Score)
    .Take(5)
    .ToList();
```

For very large N + small K, use a priority queue instead — LINQ sorts the entire sequence.

### Find one or default
```csharp
User? alice = users.FirstOrDefault(u => u.Name == "Alice");
if (alice is not null)
{
    // ...
}
```

### Chunk into pages
```csharp
foreach (var batch in users.Chunk(100))    // .NET 6+
{
    await ProcessBatchAsync(batch);
}
```

### Composition with method chains
```csharp
var result = users
    .Where(u => u.Active)
    .Where(u => u.Age >= 18)
    .OrderBy(u => u.Name)
    .Take(10)
    .Select(u => u.Email)
    .ToList();
```

LINQ chains read top-to-bottom; each operator is a discrete step.

### Building queries dynamically
```csharp
IEnumerable<User> query = users;
if (filterByAge) query = query.Where(u => u.Age >= 18);
if (filterByCity) query = query.Where(u => u.City == "Berlin");
if (sortByName) query = query.OrderBy(u => u.Name);

var results = query.ToList();
```

### Partitioning
```csharp
var (adults, minors) = (
    users.Where(u => u.Age >= 18).ToList(),
    users.Where(u => u.Age < 18).ToList()
);
```

Two passes. For one-pass, use a manual loop or aggregate.

### Mapping to Dictionary
```csharp
var byId = users.ToDictionary(u => u.Id);
var byIdAndName = users.ToDictionary(u => u.Id, u => u.Name);
```

Throws if keys collide.

### Concatenating with separator
```csharp
string joined = string.Join(", ", users.Select(u => u.Name));
```

`String.Join` accepts `IEnumerable<T>`.

---

## 12. Pitfalls

### Multiple enumeration
```csharp
var query = users.Where(u => ExpensiveCheck(u));
if (query.Any()) { ... }         // enumerates
foreach (var u in query) { ... } // enumerates again
```

Materialize once:
```csharp
var list = users.Where(u => ExpensiveCheck(u)).ToList();
```

### `Count()` on `IEnumerable<T>`
```csharp
if (collection.Count() > 0) { ... }   // enumerates entirely!
```

Use:
```csharp
if (collection.Any()) { ... }          // short-circuits
if (collection is ICollection<T> c && c.Count > 0) { ... }   // O(1) for collections
```

For collections that already expose `Count`, `Count()` extension uses it. For pure IEnumerables, it iterates.

### `Where().FirstOrDefault()` vs `FirstOrDefault(predicate)`
```csharp
users.Where(u => u.Name == "Alice").FirstOrDefault();
users.FirstOrDefault(u => u.Name == "Alice");
```

Equivalent, but the second is more idiomatic.

### `Select` then `Where` order
```csharp
users.Select(u => u.Email).Where(e => e.Contains("@"));   // creates emails, then filters
users.Where(u => u.Email.Contains("@")).Select(u => u.Email);    // filters, then projects
```

For LINQ to Objects, no big diff. For LINQ to SQL/EF, second is usually better (filter pushed to DB).

### Boxing in LINQ aggregates
```csharp
var list = new List<int> { 1, 2, 3 };
int sum = list.Aggregate((a, b) => a + b);   // works, but boxes if T is a value type in some cases
int sum2 = list.Sum();                         // optimized for int
```

Built-in `Sum`, `Average`, `Min`, `Max` for numeric types are optimized; prefer them.

### Forgetting `.ToList()` for materialization
```csharp
var query = db.Users.Where(u => u.Active);    // not executed yet
var count = query.Count();                      // runs SQL: SELECT COUNT(*)
foreach (var u in query) { ... }                // runs SQL AGAIN: SELECT *
```

For DB queries especially, materialize once.

### `Single` throws on > 1 match
```csharp
db.Users.Single(u => u.City == "Berlin");    // throws if 0 or >1
```

Use `First` if you just want one. Use `Single` only when you guarantee uniqueness.

### `OrderBy` doesn't sort in place
```csharp
list.OrderBy(x => x);            // new sequence; list unchanged
list = list.OrderBy(x => x).ToList();    // need to materialize
```

For in-place: `list.Sort()`.

### `GroupBy` with EF Core
GroupBy in EF Core has restrictions on what projections are allowed. Read the EF Core docs; some queries surprise.

### `Aggregate` with reference types
```csharp
var sum = users.Aggregate(new List<string>(), (acc, u) => { acc.Add(u.Name); return acc; });
```

Mutating the accumulator works but is bad form. Use `Select + ToList` instead.

### LINQ in tight loops
LINQ creates iterators and delegate instances. In very hot paths, a regular `for` or `foreach` can be measurably faster. Profile before optimizing.

### Async LINQ?
Standard LINQ is synchronous. For async sources (DB queries, streams), use:
- `System.Linq.Async` package — provides `IAsyncEnumerable<T>` operators.
- EF Core has `ToListAsync`, `FirstOrDefaultAsync`, etc. on `IQueryable<T>`.

```csharp
await db.Users.Where(u => u.Active).ToListAsync();
```

### `IEnumerable<T>` vs `IQueryable<T>`
- `IEnumerable<T>` — in-memory LINQ (LINQ to Objects).
- `IQueryable<T>` — expression-tree LINQ (LINQ to SQL/Entities).

Calling `.AsEnumerable()` on an IQueryable switches to in-memory — useful to use methods the provider doesn't support, but it pulls all data first.

### Lambdas allocating
Lambdas that capture variables allocate. Static lambdas don't:
```csharp
list.Where(x => x > 0);           // doesn't capture — usually fine
int threshold = 10;
list.Where(x => x > threshold);   // captures threshold
```

For hot loops, prefer captureless lambdas or move the lambda outside.

### `OrderBy` is stable
LINQ's `OrderBy` is stable — items with equal keys retain original order. `List<T>.Sort()` isn't stable.

### `Where` doesn't short-circuit `Count`
```csharp
list.Where(predicate).Count();    // iterates everything

if (list.Where(predicate).Any()) { ... }    // stops at first match
```

For "is there any?", use `Any`.

---

That's LINQ. The most-used part of C#'s daily API surface. Idioms to internalize:
- Method syntax for most things.
- `Where → Select → ToList` is the workhorse.
- `FirstOrDefault` + null check for single lookups.
- `GroupBy` + `ToDictionary` for indexes.
- Materialize once when you'll enumerate multiple times.

Next: async — C#'s biggest unique feature — `07_async_and_concurrency.md`.
