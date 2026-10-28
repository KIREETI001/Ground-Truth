# 07. Async & Concurrency

> `async`/`await`, `Task<T>`, `ValueTask`, `CancellationToken`, channels, `Parallel`, locks.

> C# pioneered the modern `async`/`await` pattern. Most other languages copied it. It's the heart of .NET I/O.

---

## Table of Contents

1. [The async/await Model](#1-the-asyncawait-model)
2. [`Task` and `Task<T>`](#2-task-and-taskt)
3. [`ValueTask` and `ValueTask<T>`](#3-valuetask-and-valuetaskt)
4. [CancellationToken](#4-cancellationtoken)
5. [Combining Tasks](#5-combining-tasks)
6. [`IAsyncEnumerable<T>`](#6-iasyncenumerablet)
7. [Channels — Producer/Consumer](#7-channels--producerconsumer)
8. [`Parallel` and PLINQ](#8-parallel-and-plinq)
9. [Locks and Synchronization](#9-locks-and-synchronization)
10. [Common Patterns](#10-common-patterns)
11. [Pitfalls](#11-pitfalls)

---

## 1. The async/await Model

`async`/`await` lets you write asynchronous code that looks synchronous.

```csharp
public async Task<string> FetchUserAsync(long id)
{
    using var client = new HttpClient();
    string json = await client.GetStringAsync($"https://api.example.com/users/{id}");
    return json;
}

var json = await FetchUserAsync(42);
```

### How it works
- `async` methods return `Task`, `Task<T>`, or `ValueTask<T>` (rarely `void`).
- `await` suspends the method until the awaited task completes, then resumes.
- The thread isn't blocked during the wait — it's free to do other work.
- When the task completes, the continuation is scheduled (often on a thread pool).

### The compiler rewrites async methods
`async` is syntactic sugar over a state machine the compiler generates. The actual flow:
1. Method starts executing synchronously.
2. Hits an `await` on an incomplete task.
3. Returns a `Task` to the caller.
4. When the awaited task completes, the rest of the method continues.

### Naming convention
Async methods end in `Async`:
```csharp
Task<User> GetUserAsync(long id);
Task SaveAsync(User u);
```

Helps callers spot async methods at a glance.

### Async all the way
Once you're async, stay async:
```csharp
public async Task<User> Outer()
{
    return await Inner();      // GOOD
}

public async Task<User> Outer2()
{
    return Inner().Result;     // BAD — blocks, deadlock risk in some contexts
}
```

Don't block on async code with `.Result` or `.Wait()`. Use `await` all the way up.

### `async void` (rarely)
```csharp
public async void Handler(object sender, EventArgs e) { ... }
```

Allowed for event handlers (UI button click, etc.). Otherwise avoid — exceptions can't be caught by callers, no way to await completion.

### Why async?
- **I/O scalability**: while waiting for a DB / HTTP / file, the thread serves other requests.
- **UI responsiveness**: doesn't block the UI thread.

A typical ASP.NET Core server with async I/O can handle 10,000+ concurrent requests on modest hardware.

---

## 2. `Task` and `Task<T>`

The return type of async methods.

- `Task` — async work that completes (no return value).
- `Task<T>` — async work that returns T.

```csharp
public async Task DoWorkAsync()
{
    await Task.Delay(1000);
    Console.WriteLine("done");
}

public async Task<int> ComputeAsync()
{
    await Task.Delay(1000);
    return 42;
}
```

### Creating tasks
```csharp
Task<int> t1 = Task.FromResult(42);                    // already completed
Task t2 = Task.CompletedTask;
Task t3 = Task.Delay(1000);                             // delayed completion
Task<int> t4 = Task.Run(() => ComputeIntensive());     // run on thread pool
```

### `Task.Run` for CPU-bound work
```csharp
public async Task<int> ProcessBigDataAsync(byte[] data)
{
    return await Task.Run(() => DoHeavyComputation(data));
}
```

Off-loads CPU-intensive work to the thread pool, freeing the calling thread (UI / request handler).

**Don't** wrap I/O calls in `Task.Run` — they're already async:
```csharp
// BAD
await Task.Run(() => client.GetStringAsync(url));

// GOOD
await client.GetStringAsync(url);
```

### Awaiting non-async returns
```csharp
public Task<int> ComputeAsync()
{
    if (cache.TryGetValue(key, out var v))
        return Task.FromResult(v);    // synchronous return
    return CalculateAsync();          // async work
}
```

You don't need `async` if you're just forwarding a Task. The caller still awaits the result.

### Task status
```csharp
task.IsCompleted;
task.IsCompletedSuccessfully;
task.IsFaulted;
task.IsCanceled;
task.Status;
task.Exception;    // AggregateException if faulted
```

### Exceptions
```csharp
try
{
    await FetchAsync();
}
catch (HttpRequestException ex)
{
    log.LogError(ex, "fetch failed");
}
```

Exceptions thrown inside an async method propagate via the returned Task. The `await` re-throws them.

If a task faults but is never awaited, the exception is silently lost (unless you observe `task.Exception`).

---

## 3. `ValueTask` and `ValueTask<T>`

`Task` is a class — allocates on the heap. For hot paths where async often returns synchronously (cached result), `ValueTask<T>` avoids allocations:

```csharp
public ValueTask<int> GetCountAsync()
{
    if (cache.TryGetValue("count", out int v))
        return new ValueTask<int>(v);    // no allocation
    return new ValueTask<int>(LoadFromDbAsync());
}
```

### Rules
- `ValueTask` can only be **awaited once**.
- Don't store it in fields, pass to multiple awaiters.
- Convert to `Task` with `.AsTask()` if needed.

For most code, stick with `Task<T>`. `ValueTask<T>` is for very hot paths where allocation matters.

### When to use
- High-frequency operations that often complete synchronously.
- Building reusable async APIs.

For typical app code: use `Task<T>`.

---

## 4. CancellationToken

Cooperative cancellation — methods accept a `CancellationToken` and check / abort periodically.

```csharp
public async Task<List<User>> FetchUsersAsync(CancellationToken ct)
{
    using var client = new HttpClient();
    return await client.GetFromJsonAsync<List<User>>(url, ct)
        ?? new List<User>();
}

// Caller
using var cts = new CancellationTokenSource();
cts.CancelAfter(TimeSpan.FromSeconds(5));    // cancel after 5s

try
{
    var users = await FetchUsersAsync(cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("cancelled");
}
```

### CancellationTokenSource
```csharp
var cts = new CancellationTokenSource();
var token = cts.Token;

// Cancel immediately
cts.Cancel();

// Cancel after delay
cts.CancelAfter(TimeSpan.FromSeconds(5));

// Construct with timeout
var cts2 = new CancellationTokenSource(TimeSpan.FromSeconds(5));
```

### Checking cancellation
```csharp
public async Task ProcessAsync(CancellationToken ct)
{
    foreach (var item in items)
    {
        ct.ThrowIfCancellationRequested();    // throws OperationCanceledException if cancelled
        await ProcessItemAsync(item, ct);
    }
}
```

### Linking tokens
```csharp
public async Task DoWorkAsync(CancellationToken externalToken)
{
    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(externalToken);
    linkedCts.CancelAfter(TimeSpan.FromSeconds(30));    // also our own timeout

    await SomeOperationAsync(linkedCts.Token);
}
```

If either the external or internal cancels, both linked tokens fire.

### ASP.NET Core integration
```csharp
app.MapGet("/data", async (CancellationToken ct) =>
{
    return await dataService.FetchAsync(ct);
});
```

If the HTTP client disconnects, the request's CancellationToken fires automatically. Propagate it to your async work.

### Always accept CancellationToken in async APIs
```csharp
public async Task<User?> FindUserAsync(long id, CancellationToken ct = default)
{
    return await _repo.FindAsync(id, ct);
}
```

Even if you don't use it now, accept it. Callers might want to cancel.

---

## 5. Combining Tasks

### `Task.WhenAll` — wait for all
```csharp
var tasks = ids.Select(id => FetchUserAsync(id));
User[] users = await Task.WhenAll(tasks);
```

All run concurrently; result is an array of results. If any throws, `WhenAll` aggregates exceptions and rethrows on await.

### `Task.WhenAny` — wait for first
```csharp
var task1 = FetchFromPrimaryAsync();
var task2 = FetchFromBackupAsync();

Task<User> completed = await Task.WhenAny(task1, task2);
User user = await completed;
```

The others keep running unless you cancel them.

### Pattern: timeout
```csharp
public async Task<T> WithTimeout<T>(Task<T> task, TimeSpan timeout)
{
    var delay = Task.Delay(timeout);
    var winner = await Task.WhenAny(task, delay);
    if (winner == delay) throw new TimeoutException();
    return await task;
}
```

Or use `CancellationTokenSource.CancelAfter`. In .NET 8+, `Task.WaitAsync(timeout)` exists:
```csharp
var result = await task.WaitAsync(TimeSpan.FromSeconds(5));
```

### Sequential vs parallel
```csharp
// Sequential — slow
var a = await FetchA();
var b = await FetchB();
var c = await FetchC();

// Parallel — fast
var taskA = FetchA();
var taskB = FetchB();
var taskC = FetchC();
var a = await taskA;
var b = await taskB;
var c = await taskC;

// Or:
var (a2, b2, c2) = await (FetchA(), FetchB(), FetchC()).Await();    // tuple await — needs extension
```

For independent calls, start all then await — saves time equal to sum of individual durations minus max.

### `ConfigureAwait(false)`
```csharp
await SomethingAsync().ConfigureAwait(false);
```

Tells the runtime not to capture the current `SynchronizationContext` (UI thread, ASP.NET pre-Core request context).

- **Library code**: use `ConfigureAwait(false)` to avoid forcing callers' threads.
- **App code (UI / ASP.NET Core)**: usually skip — ASP.NET Core has no context to capture.

In modern ASP.NET Core, `ConfigureAwait(false)` is no longer needed. For library authors and legacy / UI code, still relevant.

---

## 6. `IAsyncEnumerable<T>`

Async streams — yield values asynchronously, consume with `await foreach`.

```csharp
public async IAsyncEnumerable<int> NumbersAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    for (int i = 0; i < 10; i++)
    {
        await Task.Delay(100, ct);
        yield return i;
    }
}

// Consumer
await foreach (var n in NumbersAsync(ct))
{
    Console.WriteLine(n);
}
```

### Why
- Streaming results from a DB without loading all into memory.
- Server-sent events.
- Long-running data pipelines.

```csharp
public async IAsyncEnumerable<User> StreamUsersAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await using var stream = await GetDataStreamAsync(ct);
    await foreach (var record in stream.ReadRecordsAsync(ct))
    {
        yield return new User(record);
    }
}
```

### With LINQ
Install `System.Linq.Async`:
```csharp
var emails = await NumbersAsync()
    .Where(n => n % 2 == 0)
    .Select(n => $"{n}@x.com")
    .ToListAsync();
```

### `[EnumeratorCancellation]`
For the CancellationToken to be passed through from `WithCancellation()` calls:
```csharp
await foreach (var n in NumbersAsync().WithCancellation(ct))
{
    // ...
}
```

The `[EnumeratorCancellation]` attribute marks the parameter to receive that token.

---

## 7. Channels — Producer/Consumer

`System.Threading.Channels` is the modern .NET producer/consumer pattern.

### Unbounded
```csharp
var channel = Channel.CreateUnbounded<int>();

// Producer
_ = Task.Run(async () =>
{
    for (int i = 0; i < 100; i++)
    {
        await channel.Writer.WriteAsync(i);
    }
    channel.Writer.Complete();
});

// Consumer
await foreach (var item in channel.Reader.ReadAllAsync())
{
    Console.WriteLine(item);
}
```

### Bounded (with backpressure)
```csharp
var channel = Channel.CreateBounded<int>(
    new BoundedChannelOptions(100)
    {
        FullMode = BoundedChannelFullMode.Wait    // producer waits when full
    });
```

Other modes:
- `Wait` — producer awaits space.
- `DropNewest` — discard the newest item.
- `DropOldest` — discard the oldest item.
- `DropWrite` — drop the write being attempted.

### Multiple producers / consumers
```csharp
var channel = Channel.CreateUnbounded<int>(
    new UnboundedChannelOptions
    {
        SingleReader = false,
        SingleWriter = false
    });
```

Specifying single reader / writer when applicable allows internal optimizations.

### Why channels over BlockingCollection
- Async-friendly (no thread blocking).
- Better performance.
- Cleaner backpressure semantics.

For all new producer/consumer code: use channels.

---

## 8. `Parallel` and PLINQ

For CPU-bound parallelism.

### `Parallel.For` / `Parallel.ForEach`
```csharp
Parallel.For(0, 100, i =>
{
    DoWork(i);
});

Parallel.ForEach(items, item =>
{
    Process(item);
});

// With options
var options = new ParallelOptions
{
    MaxDegreeOfParallelism = 4,
    CancellationToken = ct
};

await Parallel.ForEachAsync(items, options, async (item, ct) =>
{
    await ProcessAsync(item, ct);
});
```

`Parallel.ForEachAsync` (.NET 6+) handles async work cleanly.

### PLINQ
```csharp
var results = items.AsParallel()
    .Where(i => i.IsActive)
    .Select(i => Compute(i))
    .ToList();
```

PLINQ is mostly a curiosity in 2026 — `Parallel.ForEachAsync` or task-based parallelism is usually clearer.

### When to use
- CPU-bound work over a collection.
- Independent operations (no shared mutable state).
- Enough work per item to outweigh parallelism overhead (~10μs+ per item).

### When NOT
- I/O-bound work — use async tasks.
- Few items — overhead dominates.
- Heavy synchronization needed — typically a sign to redesign.

---

## 9. Locks and Synchronization

For mutable shared state across threads.

### `lock`
```csharp
private readonly object _lock = new();
private int _count;

public void Increment()
{
    lock (_lock)
    {
        _count++;
    }
}

public int Get()
{
    lock (_lock)
    {
        return _count;
    }
}
```

`lock (obj)` is syntactic sugar for `Monitor.Enter/Exit` with a try/finally. Always lock on a private object, never on `this` or a string.

### `Lock` type (.NET 9+)
A new dedicated lock primitive, slightly faster than `lock (object)`:
```csharp
private readonly Lock _lock = new();

public void Increment()
{
    using (_lock.EnterScope())
    {
        _count++;
    }
}

// Or with lock statement:
lock (_lock)    // works since .NET 9
{
    _count++;
}
```

For new code targeting .NET 9+, prefer the `Lock` type.

### `Interlocked`
Atomic operations on primitives, lock-free:
```csharp
private int _count;

public int Increment() => Interlocked.Increment(ref _count);
public int Decrement() => Interlocked.Decrement(ref _count);
public int Add(int n) => Interlocked.Add(ref _count, n);
public int Exchange(int newVal) => Interlocked.Exchange(ref _count, newVal);
public int CompareExchange(int newVal, int expected) =>
    Interlocked.CompareExchange(ref _count, newVal, expected);
```

Much faster than `lock` for simple atomic operations.

### `SemaphoreSlim`
Async-friendly semaphore:
```csharp
private readonly SemaphoreSlim _semaphore = new(initialCount: 3, maxCount: 3);

public async Task<T> RateLimitedAsync<T>(Func<Task<T>> work)
{
    await _semaphore.WaitAsync();
    try
    {
        return await work();
    }
    finally
    {
        _semaphore.Release();
    }
}
```

Up to 3 concurrent operations.

### `Monitor.Wait` / `Pulse`
Old-school thread coordination. Rarely needed — `Channel<T>`, `TaskCompletionSource`, or `SemaphoreSlim` are usually better.

### `ReaderWriterLockSlim`
Multiple readers OR one writer:
```csharp
private readonly ReaderWriterLockSlim _rw = new();

public V Read(K key)
{
    _rw.EnterReadLock();
    try { return _data[key]; }
    finally { _rw.ExitReadLock(); }
}

public void Write(K key, V value)
{
    _rw.EnterWriteLock();
    try { _data[key] = value; }
    finally { _rw.ExitWriteLock(); }
}
```

For very read-heavy data. Most code uses `ConcurrentDictionary` instead.

### Locks across async — DON'T
```csharp
public async Task DoStuff()
{
    lock (_lock)
    {
        await SomethingAsync();    // ERROR — can't await inside lock
    }
}
```

`lock` is thread-affine. Use `SemaphoreSlim` for async coordination:
```csharp
public async Task DoStuff()
{
    await _semaphore.WaitAsync();
    try
    {
        await SomethingAsync();
    }
    finally
    {
        _semaphore.Release();
    }
}
```

---

## 10. Common Patterns

### Fire-and-forget
```csharp
_ = Task.Run(async () =>
{
    try
    {
        await BackgroundWorkAsync();
    }
    catch (Exception ex)
    {
        log.LogError(ex, "background work failed");
    }
});
```

Always wrap in try/catch — unhandled exceptions in tasks are silently lost.

For ASP.NET Core, use `IHostedService` or `BackgroundService` for proper background work.

### Retry with backoff
```csharp
public async Task<T> RetryAsync<T>(
    Func<Task<T>> work,
    int maxAttempts = 3,
    CancellationToken ct = default)
{
    Exception? last = null;
    for (int i = 0; i < maxAttempts; i++)
    {
        try
        {
            return await work();
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            last = ex;
            var delay = TimeSpan.FromMilliseconds(Math.Pow(2, i) * 100);
            await Task.Delay(delay, ct);
        }
    }
    throw new InvalidOperationException("Retry failed", last);
}
```

For production: use **Polly** (resilience library) — handles retries, circuit breaking, timeouts, jitter.

### Parallel fetches with limit
```csharp
public async Task<List<T>> ProcessAllAsync<T>(
    IEnumerable<int> ids,
    Func<int, Task<T>> fetch,
    int maxConcurrency = 10)
{
    using var semaphore = new SemaphoreSlim(maxConcurrency);

    var tasks = ids.Select(async id =>
    {
        await semaphore.WaitAsync();
        try
        {
            return await fetch(id);
        }
        finally
        {
            semaphore.Release();
        }
    });

    return (await Task.WhenAll(tasks)).ToList();
}
```

`Parallel.ForEachAsync` does this cleaner:
```csharp
var results = new ConcurrentBag<T>();
await Parallel.ForEachAsync(
    ids,
    new ParallelOptions { MaxDegreeOfParallelism = 10 },
    async (id, ct) =>
    {
        var result = await fetch(id);
        results.Add(result);
    });
```

### Race with timeout
```csharp
public async Task<T?> WithTimeoutAsync<T>(Task<T> task, TimeSpan timeout)
{
    return await task.WaitAsync(timeout);    // .NET 8+ — throws TimeoutException
}
```

### Cancellation propagation
```csharp
public async Task<List<User>> GetUsersWithOrdersAsync(
    long userId,
    CancellationToken ct = default)
{
    var user = await _users.FindAsync(userId, ct);
    var orders = await _orders.FindByUserAsync(userId, ct);
    return new List<User> { user };
}
```

Always pass the token through.

### TaskCompletionSource — manual task control
For wrapping callback-style APIs:
```csharp
public Task<T> WaitForCallbackAsync<T>(Action<Action<T>> registerCallback)
{
    var tcs = new TaskCompletionSource<T>();
    registerCallback(result => tcs.SetResult(result));
    return tcs.Task;
}
```

---

## 11. Pitfalls

### `async void`
Don't use except for event handlers. Exceptions from `async void` go to the synchronization context — usually crashing the app or being lost.

### Blocking on async (`Result`, `Wait`)
```csharp
var result = SomethingAsync().Result;       // BAD
SomethingAsync().Wait();                       // BAD
```

In WPF / WinForms / older ASP.NET, deadlocks. In ASP.NET Core, blocks a thread (wastes capacity).

Always `await`.

### Not propagating CancellationToken
```csharp
public async Task DoIt(CancellationToken ct)
{
    await Task.Delay(1000);          // doesn't respect cancellation!
    await client.GetAsync(url);     // doesn't respect either
}
```

Fix:
```csharp
await Task.Delay(1000, ct);
await client.GetAsync(url, ct);
```

### Forgetting to await
```csharp
public async Task DoStuff()
{
    SomethingAsync();    // WARNING — not awaited, runs concurrently and forgotten
}
```

Compiler warns. If intentional fire-and-forget, use `_ =`:
```csharp
_ = SomethingAsync();    // explicit "discarded"
```

### Exceptions in fire-and-forget
```csharp
_ = SomethingAsync();    // if this throws, exception is lost
```

Always wrap:
```csharp
_ = Task.Run(async () =>
{
    try { await SomethingAsync(); }
    catch (Exception ex) { log.LogError(ex, "..."); }
});
```

### `Task.Run` on async methods
```csharp
await Task.Run(() => SomethingAsync());        // unnecessary
await SomethingAsync();                          // simpler, same effect
```

`Task.Run` is for offloading CPU work to a thread pool, not for invoking already-async methods.

### Lambdas in `Task.Run` and captured variables
```csharp
for (int i = 0; i < 10; i++)
{
    Task.Run(() => Console.WriteLine(i));    // might all print 10
}
```

Capture locally:
```csharp
for (int i = 0; i < 10; i++)
{
    int captured = i;
    Task.Run(() => Console.WriteLine(captured));
}
```

(Modern C# might handle this correctly with foreach, but be safe with explicit capture.)

### Awaiting tasks multiple times
`Task<T>` can be awaited many times — returns the same result.
`ValueTask<T>` can only be awaited once.

If unsure, use `Task<T>` or `.AsTask()` on `ValueTask<T>`.

### `ConfigureAwait(false)` in ASP.NET Core
Doesn't matter in modern ASP.NET Core (no synchronization context). Library code should still use it. App code: skip.

### Mixing sync and async
```csharp
public string GetData()
{
    return GetDataAsync().Result;    // BAD
}
```

Make the API async or sync, not a mix. Don't bridge them via `Result`.

### Forgetting `await` on Task.Delay
```csharp
public async Task DelayThenWork()
{
    Task.Delay(1000);    // doesn't await — runs immediately
    DoWork();
}
```

`Task.Delay` returns a Task — you must await it.

### Long-running synchronous work in async
```csharp
public async Task<int> SlowAsync()
{
    return ComputePi(10_000_000);    // synchronous CPU work — blocks the thread
}
```

Wrap in `Task.Run`:
```csharp
public async Task<int> SlowAsync()
{
    return await Task.Run(() => ComputePi(10_000_000));
}
```

For UI / request handlers, this matters. For background workers, less critical.

### Async constructors
Can't make a constructor async. Workaround — async factory:
```csharp
public class Service
{
    private Service() { }

    public static async Task<Service> CreateAsync()
    {
        var s = new Service();
        await s.InitAsync();
        return s;
    }
}
```

### Synchronization context capture
In a UI context, `await` resumes on the UI thread. In ASP.NET Classic (.NET Framework), on the request context. In ASP.NET Core / console: thread pool.

`ConfigureAwait(false)` opts out — useful in libraries to prevent forcing callers' contexts.

### Async lambdas in foreach with cancellation
```csharp
await foreach (var item in source.WithCancellation(ct))
{
    // ct is honored
}
```

Without `WithCancellation`, the source might not respect ct.

### `Task.WhenAll` exception behavior
If multiple tasks fail, `Task.WhenAll` collects all exceptions but `await` only sees the first via `AggregateException`. To see all:
```csharp
Task all = Task.WhenAll(tasks);
try { await all; }
catch
{
    foreach (var ex in all.Exception!.InnerExceptions) { ... }
}
```

### Deadlocks from sync context
```csharp
public string Get()
{
    return GetAsync().Result;    // deadlock in UI / classic ASP.NET
}

public async Task<string> GetAsync()
{
    await Task.Delay(100);    // continuation needs UI thread, which is blocked on .Result
    return "hello";
}
```

Workaround: `await` all the way up. Or `.ConfigureAwait(false)` (in some library scenarios).

### Multiple awaits on the same `ValueTask<T>`
```csharp
ValueTask<int> vt = GetAsync();
var a = await vt;
var b = await vt;    // undefined behavior
```

`ValueTask<T>` can only be awaited once.

### Locks across `await`
```csharp
lock (_lock)
{
    await SomethingAsync();    // COMPILE ERROR
}
```

Use `SemaphoreSlim` (async-friendly) instead.

### Async in property getters
```csharp
public Task<int> Count => CountAsync();    // OK if it's just exposing a Task
public int Count => CountAsync().Result;     // BAD
```

Avoid async-y operations in getters. Methods make async clear at the call site.

---

That's async. The biggest paradigm shift from sync code. Key takeaways:
- `async`/`await` for I/O.
- `Task.Run` for CPU work, not I/O.
- Always accept and propagate `CancellationToken`.
- `Task.WhenAll` for parallel async.
- Channels for producer/consumer.
- Don't block on async with `.Result` / `.Wait()`.

Next: errors and exceptions — `08_errors_and_exceptions.md`.
