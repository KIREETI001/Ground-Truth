# 08. Errors & Exceptions

> Exceptions in C# — try/catch, custom types, exception filters, best practices.

> C# follows the "unchecked exceptions" model — no Java-style mandatory `throws` declarations. Cleaner syntax, fewer guarantees.

---

## Table of Contents

1. [Exception Hierarchy](#1-exception-hierarchy)
2. [try / catch / finally](#2-try--catch--finally)
3. [Exception Filters (`when`)](#3-exception-filters-when)
4. [`using` and IDisposable](#4-using-and-idisposable)
5. [Throwing Exceptions](#5-throwing-exceptions)
6. [Custom Exceptions](#6-custom-exceptions)
7. [Best Practices](#7-best-practices)
8. [Common Patterns](#8-common-patterns)
9. [Common Pitfalls](#9-common-pitfalls)

---

## 1. Exception Hierarchy

All exceptions derive from `System.Exception`:

```
Exception
├── SystemException
│   ├── NullReferenceException
│   ├── InvalidOperationException
│   ├── ArgumentException
│   │   ├── ArgumentNullException
│   │   └── ArgumentOutOfRangeException
│   ├── IndexOutOfRangeException
│   ├── FormatException
│   ├── OverflowException
│   ├── DivideByZeroException
│   ├── NotSupportedException
│   ├── NotImplementedException
│   ├── IOException
│   │   ├── FileNotFoundException
│   │   └── DirectoryNotFoundException
│   ├── HttpRequestException
│   ├── TaskCanceledException / OperationCanceledException
│   └── ...
└── ApplicationException (legacy; don't derive from)
```

### All exceptions are unchecked
Unlike Java, C# doesn't have checked exceptions — the compiler doesn't force you to catch or declare anything. You catch what you care about; the rest propagates.

This trades off:
- (+) Less ceremony.
- (+) Composes cleanly with lambdas, async, LINQ.
- (-) No compile-time guarantee that callers handle expected failures.

Documentation (XML docs `<exception>` tags) is how you communicate "this can throw."

---

## 2. try / catch / finally

```csharp
try
{
    Risky();
}
catch (FileNotFoundException ex)
{
    Console.WriteLine($"File missing: {ex.FileName}");
}
catch (IOException ex)
{
    Console.WriteLine($"IO error: {ex.Message}");
}
catch (Exception ex)
{
    Console.WriteLine($"Generic: {ex.Message}");
    throw;       // re-throw, preserving stack trace
}
finally
{
    Cleanup();   // always runs
}
```

Catch clauses are checked in order — put specific exceptions before general ones.

### Re-throwing
```csharp
try { ... }
catch (Exception ex)
{
    // throw;        // GOOD — preserves stack trace
    // throw ex;     // BAD — resets stack trace to here
}
```

To wrap:
```csharp
catch (Exception ex)
{
    throw new MyException("wrapped", ex);    // include the cause
}
```

The inner exception (`ex.InnerException`) preserves the chain.

### `finally`
- Always runs (unless the process exits unexpectedly).
- Used for cleanup (closing resources, releasing locks).
- For most cleanup, use `using` (next section) — cleaner.

```csharp
Connection? conn = null;
try
{
    conn = Open();
    Use(conn);
}
finally
{
    conn?.Close();
}
```

### Don't return from `finally`
```csharp
public int Example()
{
    try { return 1; }
    finally { return 2; }    // returns 2 — confusing
}
```

Don't.

---

## 3. Exception Filters (`when`)

C# 6+ has a unique feature — conditional catch:

```csharp
try
{
    SendRequest();
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    Console.WriteLine("not found");
}
catch (HttpRequestException ex) when (ex.StatusCode >= HttpStatusCode.InternalServerError)
{
    log.LogError(ex, "server error");
    throw;
}
```

The `when` clause evaluates without unwinding the stack — performance benefit and cleaner than nested `if` inside catch.

### Logging without catching
A common idiom: log everything but only catch some:
```csharp
try
{
    DoWork();
}
catch (Exception ex) when (LogAndContinue(ex))
{
    // never reached — LogAndContinue returns false
}

static bool LogAndContinue(Exception ex)
{
    log.LogError(ex, "operation failed");
    return false;    // don't catch
}
```

The exception propagates as if not caught at all, but we get a log point.

### Cancellation
```csharp
catch (OperationCanceledException) when (ct.IsCancellationRequested)
{
    // expected cancellation
}
catch (OperationCanceledException ex)
{
    // unexpected — maybe timeout
    log.LogWarning(ex, "unexpected cancellation");
}
```

---

## 4. `using` and IDisposable

For deterministic resource cleanup.

### `using` statement
```csharp
using (var conn = OpenConnection())
{
    conn.Execute(sql);
}    // conn.Dispose() called automatically
```

Equivalent to:
```csharp
var conn = OpenConnection();
try { conn.Execute(sql); }
finally { conn.Dispose(); }
```

### `using` declaration (C# 8+)
```csharp
public async Task<List<User>> GetUsers()
{
    using var conn = OpenConnection();   // disposed at end of scope
    return await conn.QueryAsync<User>(sql);
}
```

Cleaner than nested using blocks. Scope ends with the enclosing block.

### Multiple resources
```csharp
using var conn = OpenConnection();
using var cmd = conn.CreateCommand();
using var reader = cmd.ExecuteReader();
```

Disposed in reverse order at scope exit.

### `IDisposable` and `IAsyncDisposable`
Implement these on types that own resources:
```csharp
public class FileManager : IDisposable
{
    private FileStream? _stream;

    public void Open(string path)
    {
        _stream = File.OpenRead(path);
    }

    public void Dispose()
    {
        _stream?.Dispose();
    }
}

// Async disposal (C# 8+)
public class AsyncResource : IAsyncDisposable
{
    public async ValueTask DisposeAsync()
    {
        await CleanupAsync();
    }
}

await using var r = new AsyncResource();
```

`await using` for async dispose.

### Standard Dispose pattern (for unmanaged resources)
```csharp
public class FileManager : IDisposable
{
    private FileStream? _stream;
    private bool _disposed;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing)
        {
            _stream?.Dispose();
        }
        _disposed = true;
    }

    ~FileManager() => Dispose(false);    // finalizer
}
```

Most C# code doesn't need finalizers — only when wrapping unmanaged resources (rare). The simple `IDisposable` with managed resources is fine.

---

## 5. Throwing Exceptions

```csharp
public void Deposit(decimal amount)
{
    if (amount < 0)
        throw new ArgumentOutOfRangeException(nameof(amount), "must be non-negative");
    if (_frozen)
        throw new InvalidOperationException("account is frozen");

    _balance += amount;
}
```

### Argument validation helpers (.NET 6+)
```csharp
ArgumentNullException.ThrowIfNull(input);
ArgumentException.ThrowIfNullOrEmpty(name);                       // .NET 7+
ArgumentException.ThrowIfNullOrWhiteSpace(name);                   // .NET 8+
ArgumentOutOfRangeException.ThrowIfNegative(amount);
ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);
ArgumentOutOfRangeException.ThrowIfGreaterThan(amount, 1000);
```

Concise; produce consistent error messages.

### `nameof`
```csharp
public void Process(string input)
{
    if (input == null) throw new ArgumentNullException(nameof(input));
}
```

`nameof(input)` produces `"input"` — safer than hardcoded strings (refactoring renames track).

### Throwing in expressions (C# 7+)
```csharp
public string Name => _name ?? throw new InvalidOperationException("Name not set");

string s = condition ? "yes" : throw new ArgumentException("expected condition");
```

`throw` is an expression in some positions.

---

## 6. Custom Exceptions

```csharp
public class UserNotFoundException : Exception
{
    public long UserId { get; }

    public UserNotFoundException(long userId)
        : base($"User not found: {userId}")
    {
        UserId = userId;
    }

    public UserNotFoundException(long userId, Exception inner)
        : base($"User not found: {userId}", inner)
    {
        UserId = userId;
    }
}
```

### Convention
- Name ends in `Exception`.
- Derive from `Exception` (not `ApplicationException` — legacy).
- Add domain-specific properties when useful.
- Always provide a constructor that accepts an inner exception.

### Hierarchies
```csharp
public class AppException : Exception { ... }
public class NotFoundException : AppException { ... }
public class UserNotFoundException : NotFoundException { ... }
```

Callers can catch broadly (`AppException`) or specifically.

### Don't make every error a custom exception
Standard exceptions (`InvalidOperationException`, `ArgumentException`) work fine for most cases. Custom exceptions are for things you want callers to catch specifically.

---

## 7. Best Practices

### Catch what you can handle
```csharp
// BAD
try { Risky(); } catch (Exception) { /* ignore */ }

// GOOD
try { Risky(); } catch (SpecificException) { /* handle */ }
```

Catching `Exception` is acceptable at request handler boundaries (translate to error response) — not at deep call sites.

### Don't swallow exceptions
```csharp
try { Risky(); } catch { }    // worst pattern in C#
```

At minimum, log. Usually rethrow or handle.

### Include context in messages
```csharp
throw new InvalidOperationException(
    $"Failed to process order {orderId} for user {userId}: invalid state {order.State}");
```

Stack traces alone don't tell the whole story.

### Don't catch and rethrow as `throw ex`
```csharp
catch (Exception ex)
{
    Log(ex);
    throw ex;    // BAD — resets the stack trace
}

catch (Exception ex)
{
    Log(ex);
    throw;       // GOOD — preserves
}
```

### Use exception filters for conditional catch
```csharp
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
```

Cleaner than `if` inside catch.

### Don't use exceptions for control flow
```csharp
// BAD
try { return dict[key]; }
catch (KeyNotFoundException) { return default; }

// GOOD
return dict.GetValueOrDefault(key);
```

Exceptions are slow (~10-100μs to throw). For normal control flow, use return values or `Try*` methods.

### The `Try*` pattern
For operations that might fail predictably (parsing, lookup), use the `Try*` pattern:
```csharp
public bool TryParse(string s, out int result) { ... }

if (TryParse(input, out int n))
{
    Use(n);
}
else
{
    HandleInvalidInput();
}
```

Avoids exceptions for expected failures. Used throughout BCL: `int.TryParse`, `Dictionary.TryGetValue`, etc.

### Async exceptions
Exceptions in async methods propagate via the returned Task:
```csharp
public async Task<User> GetUserAsync(long id)
{
    if (id <= 0) throw new ArgumentException("invalid id");
    return await _repo.FindAsync(id);
}

try
{
    var u = await GetUserAsync(-1);
}
catch (ArgumentException ex)
{
    // caught normally
}
```

`async void` methods are the exception — their exceptions go to the synchronization context. Avoid `async void` except for event handlers.

### Document with XML comments
```csharp
/// <summary>
/// Withdraws the specified amount from the account.
/// </summary>
/// <exception cref="InvalidOperationException">If the account is frozen.</exception>
/// <exception cref="InsufficientFundsException">If balance is insufficient.</exception>
public void Withdraw(decimal amount) { ... }
```

XML docs surface in IntelliSense — callers see what can throw.

### Don't expose internal exception types in public API
A public method shouldn't throw `SqlException` from your DB layer — catch and wrap in a domain exception.

### `Exception.Data`
A built-in dictionary for adding context:
```csharp
catch (Exception ex)
{
    ex.Data["UserId"] = userId;
    ex.Data["Operation"] = "deposit";
    throw;
}
```

Logged by most logging frameworks. Useful when wrapping isn't feasible.

---

## 8. Common Patterns

### Translate at boundaries
```csharp
// In your repository
public async Task<User> GetAsync(long id)
{
    try
    {
        return await _db.Users.FindAsync(id) ?? throw new UserNotFoundException(id);
    }
    catch (DbException ex)
    {
        throw new DataAccessException("Failed to load user", ex);
    }
}

// In ASP.NET Core middleware
catch (UserNotFoundException ex)
{
    return Results.NotFound(new { error = ex.Message });
}
```

### Centralized exception handling in ASP.NET Core
```csharp
app.UseExceptionHandler(builder =>
{
    builder.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        var (status, message) = exception switch
        {
            UserNotFoundException => (404, exception.Message),
            ArgumentException => (400, exception.Message),
            _ => (500, "Internal server error")
        };

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new { error = message });
    });
});
```

Or use middleware:
```csharp
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "unhandled exception");
            ctx.Response.StatusCode = 500;
            await ctx.Response.WriteAsJsonAsync(new { error = "Internal error" });
        }
    }
}

app.UseMiddleware<ExceptionMiddleware>();
```

### Retry with exception filter
```csharp
public async Task<T> RetryTransientAsync<T>(Func<Task<T>> work, int maxAttempts = 3)
{
    Exception? last = null;
    for (int i = 0; i < maxAttempts; i++)
    {
        try
        {
            return await work();
        }
        catch (HttpRequestException ex) when (IsTransient(ex))
        {
            last = ex;
            await Task.Delay(TimeSpan.FromMilliseconds(Math.Pow(2, i) * 100));
        }
    }
    throw new InvalidOperationException("Retry failed", last);
}

static bool IsTransient(HttpRequestException ex)
{
    return ex.StatusCode is HttpStatusCode.RequestTimeout
        or HttpStatusCode.TooManyRequests
        or HttpStatusCode.InternalServerError
        or HttpStatusCode.BadGateway
        or HttpStatusCode.ServiceUnavailable
        or HttpStatusCode.GatewayTimeout;
}
```

For production: use **Polly** (resilience library). Handles retries, jitter, circuit breakers.

### Cleanup with using
```csharp
public async Task<string> ReadFileAsync(string path)
{
    using var stream = File.OpenRead(path);
    using var reader = new StreamReader(stream);
    return await reader.ReadToEndAsync();
}
```

Both `stream` and `reader` disposed in reverse order.

### Result type pattern
Instead of throwing, return a Result:
```csharp
public abstract record Result<T>
{
    public sealed record Success(T Value) : Result<T>;
    public sealed record Failure(string Error) : Result<T>;
}

public Result<User> FindUser(long id)
{
    var u = _repo.Find(id);
    return u is null
        ? new Result<User>.Failure($"User {id} not found")
        : new Result<User>.Success(u);
}

// Caller
var result = FindUser(1);
var msg = result switch
{
    Result<User>.Success s => $"Found {s.Value.Name}",
    Result<User>.Failure f => $"Error: {f.Error}",
    _ => "unreachable"
};
```

Some teams prefer this functional style. Most C# code uses exceptions. Use whatever fits your codebase.

---

## 9. Common Pitfalls

### Catching too broadly
```csharp
try { ... } catch (Exception ex) { ... }
```

Hides bugs. Catch specific types. `Exception` is for last-resort boundaries.

### Swallowing exceptions
```csharp
catch (Exception) { }    // worst possible
```

Always at least log.

### `throw ex` instead of `throw`
```csharp
catch (Exception ex)
{
    throw ex;    // BAD — resets stack
}
```

Just `throw;` rethrows with original stack.

### Losing the cause
```csharp
catch (SqlException ex)
{
    throw new MyException("DB failure");    // ex lost
}

catch (SqlException ex)
{
    throw new MyException("DB failure", ex);    // GOOD — chained
}
```

### Returning from `finally`
```csharp
public int Bad()
{
    try { return 1; }
    finally { return 2; }    // returns 2 — surprises
}
```

### Throwing in `finally`
```csharp
try
{
    return Compute();
}
finally
{
    Cleanup();    // if this throws, the return value is lost
}
```

The exception from `finally` replaces whatever was happening. Use try-with-resources / `using` instead.

### Not disposing
```csharp
var stream = File.OpenRead(path);
var contents = stream.ReadToEnd();    // BAD — stream never disposed
```

Always `using`.

### Catching `NullReferenceException`
NRE means a bug. Don't catch — fix the underlying issue.

### Catching `OutOfMemoryException`
Rarely useful. If you're out of memory, catching probably won't help.

### Custom exceptions without `Exception` suffix
```csharp
public class UserNotFound : Exception { ... }       // bad style
public class UserNotFoundException : Exception { ... }    // GOOD
```

### Stack trace lost across async boundaries
Pre-.NET Core (in older .NET Framework), async stack traces were a mess. Modern .NET preserves them well. If you see weird truncated stacks, you might be re-throwing with `throw ex` somewhere.

### `OperationCanceledException` vs `TaskCanceledException`
`TaskCanceledException` derives from `OperationCanceledException`. Catch the base:
```csharp
catch (OperationCanceledException)    // catches both
```

### Re-throwing inside async with `throw ex`
Especially bad — loses async stack trace. Always `throw;`.

### Exceptions for early exit
```csharp
try
{
    foreach (var item in items)
    {
        if (item.IsBad) throw new Exception("found bad");
    }
}
catch (Exception)
{
    // handle
}
```

Use a regular condition + `break` or `return`. Exceptions are for exceptional flow.

### `try-catch` without `catch` (try-finally only)
```csharp
try
{
    work();
}
finally
{
    cleanup();
}
```

Fine, but `using` is usually cleaner.

### Ignoring `CancellationToken`
```csharp
public async Task<T> SomeWork()
{
    await Task.Delay(10000);    // BAD — no token, can't cancel
}

public async Task<T> SomeWork(CancellationToken ct)
{
    await Task.Delay(10000, ct);    // GOOD
}
```

### Forgetting to wrap async lambdas
```csharp
list.ForEach(async x => await ProcessAsync(x));    // BAD — async void
```

`List.ForEach` doesn't await. Use:
```csharp
foreach (var x in list)
{
    await ProcessAsync(x);
}

// Or parallel:
await Task.WhenAll(list.Select(x => ProcessAsync(x)));
```

### `Console.WriteLine` exception handlers in production
```csharp
catch (Exception ex)
{
    Console.WriteLine(ex);    // BAD — no observability
}
```

Use a structured logger:
```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "operation failed");
}
```

### Catching `TaskCanceledException` as if it's an error
```csharp
catch (TaskCanceledException ex)
{
    _logger.LogError(ex, "task failed");    // probably wrong — cancellation is expected
}
```

Distinguish:
```csharp
catch (OperationCanceledException) when (ct.IsCancellationRequested)
{
    _logger.LogInformation("operation cancelled");
}
catch (TaskCanceledException ex)
{
    _logger.LogError(ex, "unexpected cancellation");    // not from our token
}
```

---

That's exceptions. Stick to:
- Catch specific exceptions you can handle.
- Use exception filters (`when`) for conditional catching.
- `using` for cleanup, not manual try/finally.
- Don't swallow.
- Don't use exceptions for normal control flow — use `Try*` pattern.
- Log at the top boundary (request handlers).
- Custom exceptions for domain semantics.

Next: I/O — `09_io_and_networking.md`.
