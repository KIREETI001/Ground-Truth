# 03. Data Structures

> `List<T>`, `Dictionary<K,V>`, `HashSet<T>`, `Queue<T>`, `Stack<T>`, immutable collections, concurrent collections.

---

## Table of Contents

1. [Collections Overview](#1-collections-overview)
2. [`List<T>`](#2-listt)
3. [`Dictionary<K, V>`](#3-dictionaryk-v)
4. [`HashSet<T>`](#4-hashsett)
5. [`Queue<T>` and `Stack<T>`](#5-queuet-and-stackt)
6. [`SortedDictionary<K, V>` and `SortedSet<T>`](#6-sorteddictionaryk-v-and-sortedsett)
7. [`PriorityQueue<T, TPriority>`](#7-priorityqueuet-tpriority)
8. [`LinkedList<T>`](#8-linkedlistt)
9. [Immutable Collections](#9-immutable-collections)
10. [Concurrent Collections](#10-concurrent-collections)
11. [Choosing the Right Collection](#11-choosing-the-right-collection)
12. [Common Patterns](#12-common-patterns)
13. [Pitfalls](#13-pitfalls)

---

## 1. Collections Overview

`System.Collections.Generic` has everything you need for typical work:

| Type | Use |
|---|---|
| `List<T>` | Ordered, indexed, dynamic array |
| `Dictionary<K, V>` | Hash map |
| `HashSet<T>` | Unique set, hash-based |
| `Queue<T>` | FIFO |
| `Stack<T>` | LIFO |
| `LinkedList<T>` | Doubly linked list (rarely needed) |
| `SortedDictionary<K, V>` | Map sorted by key |
| `SortedSet<T>` | Set sorted by value |
| `PriorityQueue<T, P>` | Min-heap |

For concurrent access: `System.Collections.Concurrent`. For immutability: `System.Collections.Immutable`. For frozen (read-only optimized): `System.Collections.Frozen`.

### Generic typing
```csharp
var list = new List<string>();
var dict = new Dictionary<string, int>();
var set = new HashSet<long>();
```

Always specify the type. `ArrayList` etc. (non-generic) exist for legacy reasons — don't use them.

---

## 2. `List<T>`

A dynamic array. Most-used collection in C#.

```csharp
var names = new List<string>();
names.Add("Alice");
names.Add("Bob");
names.Insert(0, "First");           // O(n)
names[0];                              // indexer
names[1] = "Alicia";                    // set
names.Count;                            // 3 — note: Count, not Length
names.RemoveAt(0);                      // remove by index
names.Remove("Alicia");                  // remove first matching value
names.Contains("Bob");
names.IndexOf("Bob");
names.Clear();

// Bulk
names.AddRange(new[] { "X", "Y", "Z" });
names.RemoveAll(n => n.StartsWith("X"));

// Collection expression (C# 12+)
List<int> nums = [1, 2, 3, 4, 5];
List<int> moreNums = [.. nums, 6, 7, 8];

// Reverse, sort
names.Reverse();
names.Sort();
names.Sort((a, b) => a.Length - b.Length);
names.Sort(Comparer<string>.Create((a, b) => string.Compare(a, b, StringComparison.OrdinalIgnoreCase)));
```

### Performance
- Add at end: O(1) amortized.
- Insert/remove at index: O(n) — shifts items.
- Random access: O(1).
- Contains: O(n).

### Capacity vs Count
`List<T>` keeps an internal array. When full, it doubles. To avoid resizing:
```csharp
var list = new List<int>(capacity: 1000);
```

`Count` is the number of items. `Capacity` is the underlying array size.

### Initialization
```csharp
var list = new List<int> { 1, 2, 3 };               // collection initializer
var list2 = [1, 2, 3];                                // C# 12+ collection expression
var list3 = Enumerable.Range(1, 10).ToList();
var list4 = Enumerable.Repeat(0, 100).ToList();
```

### Converting
```csharp
int[] arr = list.ToArray();
List<int> back = arr.ToList();
ReadOnlyCollection<int> ro = list.AsReadOnly();
```

---

## 3. `Dictionary<K, V>`

Hash map. O(1) average for add / get / remove.

```csharp
var ages = new Dictionary<string, int>();
ages["Alice"] = 30;
ages["Bob"] = 25;
ages.Add("Carol", 40);                  // throws if "Carol" exists
ages.TryAdd("Carol", 40);               // returns false if exists, no throw

ages["Alice"];                           // 30 — throws KeyNotFoundException if missing
ages.TryGetValue("Carol", out int age); // safe lookup
ages.GetValueOrDefault("Dave", 0);      // 0 if missing
ages.ContainsKey("Alice");
ages.Remove("Bob");

ages.Count;
ages.Keys;                               // ICollection<string>
ages.Values;                              // ICollection<int>
```

### Iterating
```csharp
foreach (var (name, age) in ages)        // tuple deconstruction
{
    Console.WriteLine($"{name}: {age}");
}

foreach (var kvp in ages)                // KeyValuePair<K, V>
{
    Console.WriteLine($"{kvp.Key}: {kvp.Value}");
}

foreach (var key in ages.Keys) { ... }
foreach (var val in ages.Values) { ... }
```

### Initialization
```csharp
var ages = new Dictionary<string, int>
{
    { "Alice", 30 },
    { "Bob", 25 }
};

// Indexer initializer (newer style)
var ages2 = new Dictionary<string, int>
{
    ["Alice"] = 30,
    ["Bob"] = 25
};

// Collection expression (C# 12+ for compatible types)
Dictionary<string, int> ages3 = new() { ["Alice"] = 30 };

// From sequence
var dict = users.ToDictionary(u => u.Id, u => u);
var dict2 = users.ToDictionary(u => u.Id);    // value defaults to u itself
```

### Computing values
```csharp
// "If absent, compute and store" — pre-.NET 6
if (!cache.TryGetValue(key, out var value))
{
    value = Compute(key);
    cache[key] = value;
}

// CollectionsMarshal.GetValueRefOrAddDefault (.NET 6+, advanced)
ref int slot = ref CollectionsMarshal.GetValueRefOrAddDefault(dict, key, out bool exists);
if (!exists) slot = Compute(key);

// Or just use indexer:
if (!cache.ContainsKey(key))
    cache[key] = Compute(key);
var v = cache[key];
```

### Counting frequencies
```csharp
var counts = new Dictionary<string, int>();
foreach (var word in words)
{
    counts.TryGetValue(word, out int c);
    counts[word] = c + 1;
}

// LINQ alternative
var counts2 = words.GroupBy(w => w).ToDictionary(g => g.Key, g => g.Count());
```

### `Dictionary` vs `IDictionary`
Prefer concrete `Dictionary<K, V>` over `IDictionary<K, V>` in most code. `Dictionary` has indexer optimizations not on the interface.

---

## 4. `HashSet<T>`

Unique elements, no order, O(1) operations.

```csharp
var tags = new HashSet<string>();
tags.Add("csharp");
tags.Add("dotnet");
tags.Add("csharp");          // already present — no effect, returns false
tags.Contains("csharp");      // true
tags.Remove("dotnet");
tags.Count;

// Initialization
var nums = new HashSet<int> { 1, 2, 3 };
HashSet<int> set = [1, 2, 3];                 // C# 12+

// Set operations
setA.UnionWith(setB);            // setA |= setB
setA.IntersectWith(setB);         // setA &= setB
setA.ExceptWith(setB);            // setA -= setB
setA.SymmetricExceptWith(setB);    // setA ^= setB
setA.IsSubsetOf(setB);
setA.IsSupersetOf(setB);
setA.Overlaps(setB);
```

### Use case
Membership tests. Faster than `List.Contains` for many lookups.

```csharp
var bannedWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "spam", "scam" };
if (bannedWords.Contains(input)) { ... }
```

Pass a custom `IEqualityComparer` for case-insensitive or other custom equality.

---

## 5. `Queue<T>` and `Stack<T>`

### Queue (FIFO)
```csharp
var q = new Queue<string>();
q.Enqueue("a");
q.Enqueue("b");
q.Dequeue();         // "a"
q.Peek();             // "b" (without removing)
q.TryDequeue(out var item);
q.Count;
```

### Stack (LIFO)
```csharp
var s = new Stack<int>();
s.Push(1);
s.Push(2);
s.Push(3);
s.Pop();              // 3
s.Peek();              // 2
s.TryPop(out var top);
```

For double-ended queues, .NET doesn't have a great native option — use `LinkedList<T>` or roll your own with `List`.

---

## 6. `SortedDictionary<K, V>` and `SortedSet<T>`

Maintained in sorted order. O(log n) operations.

```csharp
var sorted = new SortedDictionary<string, int>();
sorted["c"] = 1;
sorted["a"] = 2;
sorted["b"] = 3;
// iteration order: a, b, c

var sortedSet = new SortedSet<int> { 3, 1, 4, 1, 5 };
sortedSet.Min;
sortedSet.Max;
sortedSet.GetViewBetween(2, 4);     // {3, 4}
```

### `SortedList<K, V>`
Like SortedDictionary but uses two arrays. Slower writes, faster index-based access. Rarely the right choice; use SortedDictionary by default.

---

## 7. `PriorityQueue<T, TPriority>`

.NET 6+. Min-heap.

```csharp
var pq = new PriorityQueue<string, int>();
pq.Enqueue("low", 10);
pq.Enqueue("high", 1);
pq.Enqueue("mid", 5);

pq.Dequeue();    // "high" (lowest priority value)
pq.Peek();       // "mid"

// Max-heap: invert priorities or use custom Comparer
var maxPQ = new PriorityQueue<string, int>(Comparer<int>.Create((a, b) => b - a));
```

For Dijkstra-style algorithms, top-K problems, event simulation.

---

## 8. `LinkedList<T>`

Doubly linked list. Rarely needed.

```csharp
var ll = new LinkedList<int>();
ll.AddLast(1);
ll.AddFirst(0);
ll.AddAfter(ll.First, 99);
ll.First.Value;
ll.Last.Value;
```

Use only when you genuinely need O(1) insert/remove given a node reference. For most cases, `List<T>` wins (cache locality).

---

## 9. Immutable Collections

`System.Collections.Immutable` — collections that return new instances on modification.

```csharp
using System.Collections.Immutable;

var list = ImmutableList<int>.Empty;
var list2 = list.Add(1);             // list is still empty; list2 is [1]
var list3 = list2.Add(2);             // list2 is still [1]; list3 is [1, 2]

ImmutableArray<int> arr = [1, 2, 3];   // collection expression supported
ImmutableHashSet<string> set = ImmutableHashSet.Create("a", "b");
ImmutableDictionary<string, int> dict = ImmutableDictionary<string, int>.Empty
    .Add("a", 1)
    .Add("b", 2);
```

### Builders for efficient bulk construction
```csharp
var builder = ImmutableList.CreateBuilder<int>();
for (int i = 0; i < 1000; i++)
    builder.Add(i);
ImmutableList<int> immutable = builder.ToImmutable();
```

### When to use
- Sharing data across threads safely.
- Functional-style code where state changes are explicit.
- API surface — return immutable to prevent caller modifications.

### `FrozenSet<T>` and `FrozenDictionary<K, V>` (.NET 8+)
Even faster than immutable for read-only scenarios. Optimized for lookup; building is slower.
```csharp
FrozenDictionary<string, int> lookup = source.ToFrozenDictionary();
lookup["x"];     // very fast
```

Use when you build once and read many times — e.g., a configuration lookup table.

### `ReadOnlyCollection<T>` / `IReadOnlyList<T>`
A read-only view over a mutable collection. The view can't be modified, but the underlying collection still can.
```csharp
var list = new List<int> { 1, 2, 3 };
IReadOnlyList<int> ro = list.AsReadOnly();
list.Add(4);    // ro now sees [1, 2, 3, 4]
```

For true immutability, use `ImmutableList<T>`.

---

## 10. Concurrent Collections

`System.Collections.Concurrent` — thread-safe collections.

### `ConcurrentDictionary<K, V>`
Most useful. Thread-safe dictionary.
```csharp
var dict = new ConcurrentDictionary<string, int>();
dict.TryAdd("a", 1);
dict.AddOrUpdate("a", 1, (k, v) => v + 1);    // increment atomically
dict.GetOrAdd("a", k => Compute(k));
dict["a"] = 5;
dict.TryGetValue("a", out int val);
dict.TryRemove("a", out int removed);
```

`AddOrUpdate` and `GetOrAdd` are atomic — better than check-then-act:
```csharp
// BAD — race condition
if (!dict.ContainsKey(key))
    dict[key] = value;

// GOOD
dict.TryAdd(key, value);
```

### `ConcurrentQueue<T>`, `ConcurrentStack<T>`, `ConcurrentBag<T>`
- `ConcurrentQueue` — lock-free FIFO.
- `ConcurrentStack` — lock-free LIFO.
- `ConcurrentBag` — unordered, optimized for same-thread add+remove.

### `BlockingCollection<T>`
For producer-consumer patterns:
```csharp
var queue = new BlockingCollection<int>(boundedCapacity: 100);

// Producer
Task.Run(() => {
    foreach (var item in Source())
        queue.Add(item);    // blocks if full
    queue.CompleteAdding();
});

// Consumer
foreach (var item in queue.GetConsumingEnumerable())   // blocks until items / complete
{
    Process(item);
}
```

### `Channel<T>` (modern preferred for producer-consumer)
.NET's modern pub/sub mechanism, designed for async:
```csharp
var channel = Channel.CreateBounded<int>(100);

// Producer
_ = Task.Run(async () => {
    foreach (var item in Source())
        await channel.Writer.WriteAsync(item);
    channel.Writer.Complete();
});

// Consumer
await foreach (var item in channel.Reader.ReadAllAsync())
{
    Process(item);
}
```

Covered in `07_async_and_concurrency.md`. Prefer `Channel<T>` over `BlockingCollection` for new code.

---

## 11. Choosing the Right Collection

### Sequence
- General use → `List<T>`.
- Fixed size → `T[]` (array).
- Need value semantics → `ImmutableList<T>` or `ImmutableArray<T>`.

### Unique elements
- General → `HashSet<T>`.
- Sorted → `SortedSet<T>`.
- Thread-safe → No direct equivalent; use `ConcurrentDictionary<T, byte>` or external lock.

### Key → value
- General → `Dictionary<K, V>`.
- Sorted by key → `SortedDictionary<K, V>`.
- Thread-safe → `ConcurrentDictionary<K, V>`.
- Read-only optimized → `FrozenDictionary<K, V>` (.NET 8+).

### FIFO / LIFO
- FIFO → `Queue<T>` or `Channel<T>` for async.
- LIFO → `Stack<T>`.

### Priority
- `PriorityQueue<T, TPriority>`.

### Performance summary

| Operation | List | HashSet | Dict | SortedDict | Queue/Stack |
|---|---|---|---|---|---|
| Add | O(1) amort. | O(1) | O(1) | O(log n) | O(1) |
| Get/Contains | O(1) / O(n) | O(1) | O(1) | O(log n) | O(1) ends |
| Remove | O(n) | O(1) | O(1) | O(log n) | O(1) ends |
| Iterate | O(n) | O(n) | O(n) | O(n) | O(n) |

---

## 12. Common Patterns

### Group by
```csharp
var byCity = users.GroupBy(u => u.City)
    .ToDictionary(g => g.Key, g => g.ToList());
```

### Count by
```csharp
var countByCity = users.GroupBy(u => u.City)
    .ToDictionary(g => g.Key, g => g.Count());
```

### Sum / aggregate
```csharp
int total = users.Sum(u => u.Age);
double avg = users.Average(u => u.Age);
int max = users.Max(u => u.Age);
```

### Find one
```csharp
User? alice = users.FirstOrDefault(u => u.Name == "Alice");
User alice2 = users.First(u => u.Name == "Alice");    // throws if none

// Single — must be exactly one
User u = users.Single(u => u.Id == 1);
User? u2 = users.SingleOrDefault(u => u.Id == 1);
```

### Frequency count
```csharp
var freq = words
    .GroupBy(w => w)
    .ToDictionary(g => g.Key, g => g.Count());

// Or:
var freq2 = words.CountBy(w => w);    // .NET 9+
```

### Index by key
```csharp
var byId = users.ToDictionary(u => u.Id);
var byId2 = users.ToDictionary(u => u.Id, u => u.Name);
```

### Top K
```csharp
var top5 = users.OrderByDescending(u => u.Score).Take(5).ToList();
```

### Partition (split into two)
```csharp
var (adults, minors) = users.Aggregate(
    (Adults: new List<User>(), Minors: new List<User>()),
    (acc, u) => {
        if (u.Age >= 18) acc.Adults.Add(u);
        else acc.Minors.Add(u);
        return acc;
    });

// Simpler — though iterates twice
var adults = users.Where(u => u.Age >= 18).ToList();
var minors = users.Where(u => u.Age < 18).ToList();
```

### Chunk into batches
```csharp
foreach (var batch in items.Chunk(100))   // .NET 6+
{
    ProcessBatch(batch);
}
```

### Distinct
```csharp
var unique = list.Distinct().ToList();
var distinctByName = users.DistinctBy(u => u.Name).ToList();    // .NET 6+
```

### Convert array ↔ list
```csharp
List<int> list = arr.ToList();
int[] arr2 = list.ToArray();
```

---

## 13. Pitfalls

### Modifying during iteration
```csharp
foreach (var name in list)
{
    if (name.StartsWith("X")) list.Remove(name);  // InvalidOperationException
}
```

Fix:
```csharp
list.RemoveAll(n => n.StartsWith("X"));    // safe bulk removal

// Or iterate backwards
for (int i = list.Count - 1; i >= 0; i--)
{
    if (list[i].StartsWith("X")) list.RemoveAt(i);
}
```

### `Dictionary` lookup with `[]` throws if missing
```csharp
int age = ages["Alice"];    // KeyNotFoundException if "Alice" not present
```

Use `TryGetValue` or `GetValueOrDefault`:
```csharp
if (ages.TryGetValue("Alice", out int age)) { ... }
int age = ages.GetValueOrDefault("Alice", 0);
```

### Hash-based collections need proper `GetHashCode`/`Equals`
Records do this for you. For classes, override both. Mismatched implementations → bugs that are very hard to find.

### Mutable keys
```csharp
var key = new MutableThing { Value = "a" };
dict[key] = "stored";
key.Value = "b";              // hash changed
dict[key];                     // KeyNotFoundException — can't find it
```

Don't mutate things used as keys. Use records or immutable types.

### `Dictionary` with `null` keys
- `Dictionary<K, V>` does **not** allow `null` keys when `K` is a reference type — throws `ArgumentNullException`.
- `ConcurrentDictionary` same.
- Values can be null.

### Default values for missing keys
`int age = dict.GetValueOrDefault("missing")` returns 0 — same as `default(int)`. For a non-default fallback, supply it: `dict.GetValueOrDefault("missing", 18)`.

### `Count` vs `Length`
- Arrays: `arr.Length`.
- Lists, Dictionaries, Sets: `.Count`.
- `IEnumerable<T>.Count()` — extension method that iterates! O(n) for arbitrary IEnumerable. For collections that have a `Count` property, the extension method uses it (avoids enumeration).

### LINQ on a List rebuilds enumerables
```csharp
var filtered = list.Where(x => x > 0);    // IEnumerable, deferred
filtered.Count();                            // iterates list
filtered.ToList();                            // iterates list again!
```

If you'll enumerate multiple times, materialize:
```csharp
var filtered = list.Where(x => x > 0).ToList();
```

### `IEnumerable<T>` can be lazy
```csharp
IEnumerable<int> Numbers()
{
    Console.WriteLine("start");
    yield return 1;
    Console.WriteLine("after 1");
    yield return 2;
}

var seq = Numbers();      // nothing printed yet
seq.First();              // "start", returns 1 (after 1 not printed)
seq.ToList();              // iterates fresh — "start", "after 1"
```

Useful but surprising. Materialize when results matter.

### Allocation pressure with frequent collection creation
```csharp
public List<int> GetActiveIds() => users.Where(u => u.Active).Select(u => u.Id).ToList();
```

If called millions of times in a hot loop, each call allocates. Consider:
- Returning `IEnumerable<T>` and let the caller decide.
- Caching.
- Using `Span<T>` / pooled arrays for very-hot paths.

### Comparing collections
```csharp
list1 == list2;                  // reference equality — usually false
list1.SequenceEqual(list2);       // value equality
```

### `null` collections vs empty
Many APIs return `null` instead of empty. Defensive:
```csharp
foreach (var x in maybeNull ?? Enumerable.Empty<int>())
{
    ...
}
```

Better: APIs should return empty collections, not `null`. Set up nullable annotations to enforce this.

### `Dictionary` enumeration order
Officially unspecified but in practice insertion order. Don't rely on it; use `SortedDictionary` if you need ordering.

### `ICollection<T>` vs `IList<T>` vs `IEnumerable<T>`
- `IEnumerable<T>` — can iterate.
- `ICollection<T>` — adds `Count`, `Add`, `Remove`.
- `IList<T>` — adds indexer.
- `IReadOnlyList<T>` — read-only with indexer.
- `IReadOnlyCollection<T>` — read-only with `Count`.

For API surfaces, return the most restrictive interface that meets needs. `IReadOnlyList<T>` is a common return type.

### Removing during enumeration safely
For `List<T>`:
```csharp
list.RemoveAll(predicate);
```

For `Dictionary<K, V>`:
```csharp
var toRemove = dict.Where(kvp => predicate(kvp)).Select(kvp => kvp.Key).ToList();
foreach (var key in toRemove) dict.Remove(key);
```

For HashSet:
```csharp
set.RemoveWhere(predicate);
```

### `ConcurrentBag` is rarely the right choice
Optimized for same-thread add and remove. For different threads, `ConcurrentQueue` or `Channel<T>` is usually better.

### Re-evaluating `IEnumerable<T>` with side effects
```csharp
IEnumerable<int> SideEffects() { Log("called"); yield return 1; }
var seq = SideEffects();
seq.ToList();    // logs "called"
seq.ToList();    // logs "called" AGAIN
```

Each enumeration re-runs the source. Cache or materialize.

### `List` capacity doesn't shrink
Removing items doesn't shrink the underlying array. To compact:
```csharp
list.TrimExcess();
```

Rarely needed.

### Default capacity for collections
- `List<T>()` — initial capacity 4 (grows on add).
- `Dictionary<K, V>()` — initial capacity 0 (allocated on first add).

For known sizes, pass capacity to constructor — avoids resizing:
```csharp
var list = new List<int>(capacity: 1000);
var dict = new Dictionary<string, int>(capacity: 1000);
```

---

That's the data structure surface. Most C# code uses `List<T>`, `Dictionary<K, V>`, `HashSet<T>`, and LINQ extension methods. The advanced collections matter when you have specific performance or correctness needs.

Next: types and OOP — `04_oop.md`.
