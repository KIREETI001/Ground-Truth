# 14 — .NET runtime and performance

What the CLR actually does under your code, and how to write C# that's fast and memory-efficient.

## Table of Contents
- [The CLR and JIT](#the-clr-and-jit)
- [Garbage collection](#garbage-collection)
- [Value types vs reference types — the real cost](#value-types-vs-reference-types--the-real-cost)
- [Boxing](#boxing)
- [Span<T> and Memory<T>](#spant-and-memoryt)
- [stackalloc](#stackalloc)
- [String performance](#string-performance)
- [Collections performance](#collections-performance)
- [Async overhead and ValueTask](#async-overhead-and-valuetask)
- [Native AOT](#native-aot)
- [Benchmarking with BenchmarkDotNet](#benchmarking-with-benchmarkdotnet)
- [Profiling tools](#profiling-tools)
- [Common performance pitfalls](#common-performance-pitfalls)

---

## The CLR and JIT

When you run a .NET app, this happens:
1. `csc` compiles your C# to **IL** (Intermediate Language) — a CPU-independent bytecode in your `.dll`.
2. At runtime, the **CLR** (Common Language Runtime) loads the IL.
3. The **JIT** (Just-In-Time compiler) compiles IL to native machine code **the first time each method runs**.
4. Subsequent calls run the cached native code.

**Tiered compilation (default in modern .NET):** The JIT compiles a fast-but-unoptimized version first (Tier 0), then re-compiles hot methods with full optimization (Tier 1). Result: faster startup AND fully-optimized steady state.

**Ready-to-Run (R2R):** You can pre-compile to native ahead of time with `<PublishReadyToRun>true</PublishReadyToRun>`. Improves startup latency but bigger binaries.

**Native AOT** (covered later): full ahead-of-time compilation. No JIT at runtime.

**Why this matters:** First call to a method is slow (JIT overhead). For benchmarks, warm up first. For startup-critical apps (CLI, serverless), use R2R or AOT.

---

## Garbage collection

The CLR has a **generational, mark-and-sweep, compacting** garbage collector.

**Three generations:**

| Generation | What lives here |
|------------|-----------------|
| **Gen 0** | Newly allocated objects |
| **Gen 1** | Survived one GC — short-lived but not just born |
| **Gen 2** | Survived multiple GCs — long-lived |
| **LOH** | Large Object Heap — objects > 85 KB |

**Key insight:** Gen 0 collection is fast (small region, most objects already dead). Gen 2 collection is expensive (scans the whole heap). Goal: keep things short-lived (so they die in Gen 0) or long-lived (so they sit in Gen 2 untouched).

**The "middle-aged" object is your enemy:** Objects that survive Gen 0 but die in Gen 1 cost the most — they cause Gen 1 collections.

**GC modes:**

```xml
<PropertyGroup>
  <ServerGarbageCollection>true</ServerGarbageCollection>  <!-- Use server GC -->
  <ConcurrentGarbageCollection>true</ConcurrentGarbageCollection>
</PropertyGroup>
```

- **Workstation GC** — default for desktop/console apps. Lower latency, smaller footprint.
- **Server GC** — default for ASP.NET Core. Multi-threaded, higher throughput.

**Manually triggering GC:** Almost always wrong. The GC knows better than you. Reserved for special cases (benchmarks, just-before-pause moments in games).

```csharp
GC.Collect();                     // force GC (don't do this)
GC.WaitForPendingFinalizers();
long memBefore = GC.GetTotalMemory(forceFullCollection: false);
```

**Finalizers:**

```csharp
public class ResourceHolder
{
    private IntPtr _handle;

    ~ResourceHolder()  // Finalizer
    {
        ReleaseHandle(_handle);
    }
}
```

Objects with finalizers cost the GC extra work (queued to finalizer thread, survive to Gen 2). **Use `IDisposable` and `using` instead.** Only finalize if you wrap unmanaged resources directly.

---

## Value types vs reference types — the real cost

**Reference types (`class`):**
- Allocated on the heap
- Variables hold a reference (pointer)
- Subject to GC

**Value types (`struct`):**
- Allocated inline (on stack as locals, or embedded in another type)
- Variables hold the value directly
- Copied on assignment and method calls
- Not GC'd individually

```csharp
class PointClass { public int X, Y; }
struct PointStruct { public int X, Y; }

var pc = new PointClass();   // heap allocation
var ps = new PointStruct();  // stack — no allocation

void Modify(PointClass p) => p.X = 10;    // modifies original
void Modify(PointStruct p) => p.X = 10;   // modifies a copy — original untouched

// Pass by ref to modify struct
void Modify(ref PointStruct p) => p.X = 10;
```

**When to use `struct`:**
- Small (≤ 16 bytes rule of thumb)
- Immutable preferred
- High-frequency allocation (think coordinates, colors, hash entries)
- You don't need polymorphism

**When to use `class`:**
- Default for most types
- Large or mutable
- Reference semantics actually wanted

**`record struct` and `readonly struct`** are common modern choices:

```csharp
public readonly struct Vector3(float x, float y, float z)
{
    public float X { get; } = x;
    public float Y { get; } = y;
    public float Z { get; } = z;
}
```

---

## Boxing

When a value type is treated as `object` or as an interface, it's **boxed** — copied onto the heap.

```csharp
int i = 42;
object o = i;        // boxing — allocates! int copied to heap
int back = (int)o;   // unboxing — copy back to stack

// Common hidden boxing
ArrayList list = new();  // OLD API: stores object
list.Add(42);            // BOXING

// Generic version — no boxing
List<int> list = new();
list.Add(42);            // No boxing — List<int> stores int directly

// Interface method call on struct
struct MyStruct : IComparable
{
    public int CompareTo(object? other) => 0;
}

MyStruct s = default;
IComparable ic = s;     // boxing
ic.CompareTo(null);     // boxes once

// String.Format / interpolation boxes value types
string msg = $"Value: {42}";   // boxes the int
```

**How to spot boxing:** ReSharper/Rider warnings, BenchmarkDotNet's `[MemoryDiagnoser]`, or use `dotnet-counters` to watch allocations.

**Generics avoid boxing.** Modern .NET APIs prefer generics for this reason.

---

## Span<T> and Memory<T>

`Span<T>` is a stack-only view into contiguous memory — arrays, strings, native memory, stack-allocated buffers. It enables zero-allocation slicing and parsing.

```csharp
// Array slice — no copy
int[] arr = { 1, 2, 3, 4, 5 };
Span<int> slice = arr.AsSpan(1, 3);  // {2, 3, 4} — same memory as arr
slice[0] = 99;
// arr is now {1, 99, 3, 4, 5}

// Substring without allocation
string s = "Hello, World!";
ReadOnlySpan<char> hello = s.AsSpan(0, 5);

// Parse without allocation
ReadOnlySpan<char> numStr = "12345".AsSpan();
int n = int.Parse(numStr);
```

**Why `Span<T>` is constrained (`ref struct`):**
- Can only live on the stack
- Cannot be a field of a class
- Cannot be captured by lambdas
- Cannot be used across `await`

These constraints let the runtime guarantee safety without allocations.

**`Memory<T>` is the heap-friendly version**, useable in async and in fields. Slightly less efficient.

```csharp
async Task ProcessAsync(Memory<byte> data)
{
    await Task.Delay(10);
    // can use data here — Span can't cross await
    var span = data.Span;
    ProcessSpan(span);
}
```

**Common use cases:**

```csharp
// Read file into pooled buffer, parse with span
byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
try
{
    int n = await stream.ReadAsync(buffer, 0, buffer.Length);
    ReadOnlySpan<byte> data = buffer.AsSpan(0, n);
    Process(data);
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);
}

// Split a string without allocations
ReadOnlySpan<char> csv = "a,b,c,d".AsSpan();
foreach (Range r in csv.Split(','))
{
    ReadOnlySpan<char> part = csv[r];
    // ...
}
```

---

## stackalloc

Allocate on the stack instead of the heap. Fast and zero-GC.

```csharp
void Process()
{
    // Allocates 256 bytes on the stack
    Span<byte> buffer = stackalloc byte[256];

    int n = Encoding.UTF8.GetBytes("Hello", buffer);
    // use buffer[0..n]
}
```

**Limits:**
- Only inside a method (lifetime = method scope)
- Stack is small (typically 1 MB), don't allocate huge buffers
- Guard with size check for safety:

```csharp
const int Threshold = 256;
Span<byte> buffer = size <= Threshold
    ? stackalloc byte[Threshold]
    : new byte[size];
```

---

## String performance

Strings are immutable. Every "modification" allocates a new string.

**`StringBuilder` for many appends:**

```csharp
// BAD: each += allocates a new string
string s = "";
for (int i = 0; i < 1000; i++)
    s += i.ToString();

// GOOD: O(n) instead of O(n²)
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++)
    sb.Append(i);
string s = sb.ToString();
```

**`string.Create` for known-length strings:**

```csharp
string s = string.Create(10, state, (span, st) =>
{
    // Fill span with chars — no intermediate allocations
});
```

**`String.Concat` is fine for small fixed combinations:**

```csharp
string s1 = a + b + c;            // string.Concat — one allocation
string s2 = $"{a}-{b}-{c}";       // interpolation — fast in modern .NET
string s3 = string.Format(...);   // slower than interpolation
```

**Interpolation in modern .NET (6+) is highly optimized** — uses interpolated string handlers, often allocation-free for logging.

**`StringComparison`:**

```csharp
// Faster, culture-independent
str.StartsWith("Hello", StringComparison.Ordinal);

// Slower (default), respects culture
str.StartsWith("Hello");  // == StringComparison.CurrentCulture
```

Use `Ordinal` for non-display string comparisons (file paths, identifiers, JSON keys).

---

## Collections performance

| Operation | List<T> | Dictionary<TKey,TValue> | HashSet<T> | LinkedList<T> | Array |
|-----------|---------|-------------------------|------------|---------------|-------|
| Index access | O(1) | — | — | O(n) | O(1) |
| Add | O(1) amortized | O(1) avg | O(1) avg | O(1) | — |
| Insert middle | O(n) | — | — | O(1) | — |
| Contains | O(n) | O(1) avg | O(1) avg | O(n) | O(n) |
| Lookup by key | — | O(1) avg | — | — | — |
| Remove | O(n) | O(1) avg | O(1) avg | O(1) | — |
| Memory | Lower | Higher | Higher | Higher | Lowest |

**Pre-size when possible:**

```csharp
var list = new List<int>(capacity: 1000);  // avoids re-allocations as it grows
var dict = new Dictionary<string, int>(capacity: 1000);
```

**Use the most specific collection:**
- Need uniqueness? `HashSet<T>` not `List<T>.Contains`
- Need lookup by key? `Dictionary<TKey,TValue>`
- Need fixed size, struct elements? Plain array

**`Dictionary<TKey,TValue>.TryGetValue` over `[]` + `ContainsKey`:**

```csharp
// 2 hash lookups
if (dict.ContainsKey(key))
    return dict[key];

// 1 hash lookup
if (dict.TryGetValue(key, out int val))
    return val;
```

**LINQ has allocation cost:**

```csharp
// Multiple allocations: predicate delegate, iterator state machine
int count = items.Where(x => x.Active).Count();

// Manual loop: zero alloc
int count = 0;
foreach (var x in items) if (x.Active) count++;
```

LINQ is fine for most code. Avoid it in tight inner loops, allocations-sensitive game/server hot paths.

---

## Async overhead and ValueTask

Every `async` method allocates state machine + a `Task`. For a fast hot path that often completes synchronously, this is wasted work.

**`ValueTask<T>` avoids allocation when the method completes synchronously:**

```csharp
public async ValueTask<int> GetCachedAsync(string key)
{
    if (_cache.TryGetValue(key, out int value))
        return value;   // synchronous return — no Task allocation

    return await FetchAsync(key);  // async fallback
}
```

**Rules for `ValueTask`:**
- Can only be awaited once
- Don't store in a field
- Don't pass to multiple consumers

If you need to await multiple times, convert: `Task<T> task = vt.AsTask()`.

**[Likely]** Use plain `Task<T>` by default. Switch to `ValueTask<T>` only after profiling shows allocation pressure in a sync-likely hot path.

---

## Native AOT

`dotnet publish -r linux-x64 --aot` (with `<PublishAot>true</PublishAot>`).

Compiles your app to a native binary — no .NET runtime needed, no JIT. Benefits:

- Tiny startup time (milliseconds)
- Smaller deploy size (no runtime)
- No JIT overhead
- Works in restricted environments (containers, serverless)

**Costs:**
- No reflection-based features (some libraries break)
- No dynamic code generation (Roslyn, IL.Emit, expression compilation)
- Larger compile times
- Some packages don't work yet

**Best for:** CLI tools, microservices, serverless functions, container workloads where startup matters.

**Avoid AOT for:** Apps using heavy reflection (some ORMs in non-AOT modes, dynamic code generation, plugin systems).

---

## Benchmarking with BenchmarkDotNet

The de-facto standard for measuring .NET code performance.

```bash
dotnet add package BenchmarkDotNet
```

```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

[MemoryDiagnoser]
public class StringConcatBenchmark
{
    private const int N = 1000;

    [Benchmark]
    public string PlusOperator()
    {
        string s = "";
        for (int i = 0; i < N; i++)
            s += i.ToString();
        return s;
    }

    [Benchmark]
    public string StringBuilder()
    {
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < N; i++)
            sb.Append(i);
        return sb.ToString();
    }
}

public class Program
{
    public static void Main() => BenchmarkRunner.Run<StringConcatBenchmark>();
}
```

Run in **Release** mode:

```bash
dotnet run -c Release
```

You get a report with mean time, allocated bytes, and GC pressure for each method.

**Don't use a stopwatch and a `for` loop.** JIT warmup, GC noise, system jitter, and tier promotion will lie to you. BenchmarkDotNet handles all of this.

---

## Profiling tools

| Tool | Use for |
|------|---------|
| **dotnet-counters** | Live counters (heap size, allocations, GC stats, threadpool) |
| **dotnet-trace** | CPU sampling, allocation tracking |
| **dotnet-dump / dotnet-gcdump** | Heap snapshots — find memory leaks |
| **dotnet-stack** | Print thread stacks of a running process |
| **PerfView** (Windows) | ETW-based deep profiling |
| **Visual Studio Profiler** | CPU/memory/GC profiling, integrated |
| **JetBrains dotTrace / dotMemory** | Commercial, very ergonomic |

**Quick example — count GC and watch live:**

```bash
dotnet tool install -g dotnet-counters
dotnet-counters monitor --process-id $(pgrep -f MyApp) System.Runtime
```

**Quick example — CPU profile a running app:**

```bash
dotnet tool install -g dotnet-trace
dotnet-trace collect --process-id $(pgrep -f MyApp) --providers Microsoft-DotNETCore-SampleProfiler
# Ctrl+C to stop, then open the .nettrace file in PerfView or Visual Studio
```

---

## Common performance pitfalls

| Pitfall | Fix |
|---------|-----|
| Boxing in hot loops | Use generic versions of APIs; avoid passing structs as `object`/interfaces |
| `+=` on string in loop | Use `StringBuilder` |
| LINQ in hot loops → predicate delegates, iterator allocations | Manual loops where it matters |
| `Dictionary<,>.ContainsKey` + `[]` | Use `TryGetValue` once |
| Creating a new array/list per call | Pool with `ArrayPool<T>` or pre-allocate |
| `Task` allocations from sync-completing async methods | `ValueTask<T>` for these |
| Heavy work on the threadpool thread | Move blocking work to dedicated threads; don't starve threadpool |
| Async over sync (`Task.Run(() => SyncMethod())`) just to escape the thread | Don't — wastes a thread, no benefit |
| Calling `Result` / `Wait()` on Task | Risks deadlock in ASP.NET/WPF; always `await` |
| Allocations every frame in game loop | Pool, cache, avoid LINQ, use `Span<T>` |
| Catching exceptions for control flow | Exceptions are slow; use return values for expected outcomes |
| Reflection in hot paths | Cache `MethodInfo`/`PropertyInfo`, or compile expressions; or use source generators |
| Frequent GC.Collect calls | Just don't — trust the GC |
| Tiny objects with finalizers | Use `IDisposable`/`using`; finalizers cost extra GC work |
| Mistaking "compiles" for "optimized" | Always benchmark in Release; Debug has no JIT optimizations |

---

→ Next: [15 — Modern features and advanced topics](15_modern_features_and_advanced.md)
