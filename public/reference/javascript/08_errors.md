# 08. Errors & Error Handling

> `Error` types, try/catch, async errors, custom error classes, error chains, and practical patterns.

---

## Table of Contents

1. [What an Error Is](#1-what-an-error-is)
2. [Built-in Error Types](#2-built-in-error-types)
3. [try / catch / finally](#3-try--catch--finally)
4. [throw](#4-throw)
5. [Custom Errors](#5-custom-errors)
6. [Async Error Handling](#6-async-error-handling)
7. [Error.cause and Chaining](#7-errorcause-and-chaining)
8. [Returning vs Throwing](#8-returning-vs-throwing)
9. [Top-Level Error Handlers](#9-top-level-error-handlers)
10. [Logging Errors](#10-logging-errors)
11. [Common Patterns](#11-common-patterns)

---

## 1. What an Error Is

In JS, anything can be thrown — strings, numbers, objects. But the convention is to throw an `Error` (or a subclass), which has:

```javascript
class Error {
    name = "Error";
    message;
    stack;          // string with call stack
    cause;          // optional — chained cause (ES2022)
}
```

Always throw `Error` instances. Throwing strings (`throw "bad"`) loses the stack trace and is a hassle for catchers.

```javascript
throw new Error("Something went wrong");
throw new Error("Operation failed", { cause: originalError });
```

---

## 2. Built-in Error Types

The most useful ones:

| Type | When |
|---|---|
| `Error` | Generic error |
| `TypeError` | Wrong type (`undefined is not a function`, `obj.x.y` where `obj.x` is undefined) |
| `ReferenceError` | Referencing an undeclared variable |
| `SyntaxError` | Invalid JS — usually caught at parse, not runtime (except `JSON.parse`, `eval`) |
| `RangeError` | Number out of range (`new Array(-1)`, recursion too deep) |
| `URIError` | `decodeURI` / `encodeURI` errors |
| `AggregateError` | Wraps multiple errors (`Promise.any` failures) |
| `DOMException` | Browser/Web API errors (`AbortError`, `NotFoundError`, etc.) |

```javascript
try {
    JSON.parse("{bad json}");
} catch (e) {
    if (e instanceof SyntaxError) {
        console.log("invalid JSON");
    }
}
```

### Type narrowing in TypeScript
```typescript
catch (e) {
    // `e` is `unknown` in TS 4.4+
    if (e instanceof Error) {
        console.log(e.message);
    } else {
        console.log("unknown thing thrown:", e);
    }
}
```

---

## 3. try / catch / finally

```javascript
try {
    doRiskyThing();
} catch (err) {
    handleError(err);
} finally {
    cleanup();
}
```

- `try` block contains the code that might throw.
- `catch` block runs if it threw. `err` parameter is the caught value.
- `finally` block always runs — on success, on error, or even on `return` inside `try`/`catch`.

### Catch without binding (ES2019)
If you don't care about the error value:
```javascript
try { ... } catch { ... }
```

### Don't catch everything blindly
```javascript
// BAD — silently swallows everything including programmer errors
try { doStuff(); } catch { /* ignore */ }
```

Catch:
- **Specific** errors you can recover from (`fetch` failure: retry; file missing: use default; JSON parse fail: return null).
- **At top boundaries** — the request handler, the worker task — to log and respond gracefully.

Don't catch in deep utility functions just because the linter complains.

### Re-throw what you can't handle
```javascript
try {
    return readConfig(path);
} catch (e) {
    if (e.code === "ENOENT") return defaultConfig;
    throw e;            // unknown problem — bubble up
}
```

### `finally` semantics
- Runs even if `try` or `catch` returns.
- A `return` inside `finally` **overrides** any earlier return — usually a footgun:
  ```javascript
  function f() {
      try { return 1; }
      finally { return 2; }
  }
  f();    // 2 (don't do this)
  ```

Use `finally` for cleanup (close files, release resources), not return values.

---

## 4. throw

Anywhere in code:
```javascript
function divide(a, b) {
    if (b === 0) throw new Error("Cannot divide by zero");
    return a / b;
}
```

### What to throw
- For application errors: a custom error class with relevant fields (see below).
- For programmer errors (clearly a bug): `TypeError` / `Error`.
- Don't throw strings, numbers, or plain objects.

### `Error` constructor signature
```javascript
new Error(message, { cause: originalError });   // cause: ES2022+
```

---

## 5. Custom Errors

Define your own types so callers can `instanceof`-check them.

```javascript
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = "ValidationError";
        this.field = field;
    }
}

class NotFoundError extends Error {
    constructor(resource, id) {
        super(`${resource} with id ${id} not found`);
        this.name = "NotFoundError";
        this.resource = resource;
        this.id = id;
    }
}

throw new ValidationError("Email is invalid", "email");

try {
    findUser(123);
} catch (e) {
    if (e instanceof NotFoundError) {
        return null;
    }
    throw e;
}
```

### Always set `.name`
Many JS engines preserve the constructor name automatically, but explicit is safer — and `name` is what gets serialized in logs.

### Hierarchy for libraries
```javascript
class AppError extends Error { ... }
class APIError extends AppError { ... }
class NetworkError extends APIError { ... }
class AuthError extends APIError { ... }
class ValidationError extends AppError { ... }
```

Users can catch broadly (`AppError`) or specifically (`AuthError`).

### Discriminated union via `code`
Alternative pattern — single error class with a `code`:
```javascript
class AppError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = "AppError";
        this.code = code;       // "NOT_FOUND", "VALIDATION", etc.
        this.details = details;
    }
}

throw new AppError("VALIDATION", "Email is invalid", { field: "email" });
```

Either works. Multiple classes are more "OO"; single class with `code` is simpler to serialize.

---

## 6. Async Error Handling

### With `async` / `await`
```javascript
async function getUser(id) {
    try {
        const r = await fetch(`/users/${id}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.error("fetch failed", e);
        throw e;
    }
}
```

A rejected Promise inside an `async` function throws at the `await`. Standard `try/catch` works.

### Without await — `.catch`
```javascript
fetch(url)
    .then(r => r.json())
    .then(data => process(data))
    .catch(err => console.error(err));
```

### Errors in event handlers
```javascript
// Don't lose async errors in handlers
button.addEventListener("click", async () => {
    try {
        await doStuff();
    } catch (e) {
        console.error(e);
        showError(e.message);
    }
});
```

If you don't catch, an "Unhandled promise rejection" warning appears (and may crash Node).

### Errors inside `setTimeout` / callbacks
```javascript
setTimeout(() => {
    throw new Error("oops");      // unhandled — your try/catch around the setTimeout won't catch this
}, 100);
```

The callback runs in a new stack. Wrap with try/catch inside the callback:
```javascript
setTimeout(() => {
    try { doStuff(); }
    catch (e) { console.error(e); }
}, 100);
```

### `Promise.all` aggregates
```javascript
try {
    await Promise.all([a(), b(), c()]);
} catch (err) {
    // err is the first one to reject; others may still be running
}
```

For all-or-some:
```javascript
const results = await Promise.allSettled([a(), b(), c()]);
const errors = results.filter(r => r.status === "rejected").map(r => r.reason);
```

---

## 7. Error.cause and Chaining

ES2022 added `cause` for chaining errors.

```javascript
try {
    await loadConfig();
} catch (e) {
    throw new Error("Failed to start app", { cause: e });
}
```

The stack trace will show both errors:
```
Error: Failed to start app
    at ...
    [cause]: Error: ENOENT: no such file or directory
        at ...
```

Inspect:
```javascript
catch (e) {
    let cur = e;
    while (cur) {
        console.error(cur.message);
        cur = cur.cause;
    }
}
```

### Why bother
Chained errors preserve diagnostic info without exposing internals at every layer. A web handler can throw `new AppError("Login failed", { cause: e })` — the user sees a clean message; the logs see the full chain.

---

## 8. Returning vs Throwing

JS has no built-in `Result<T, E>` type. Two common styles:

### Style 1: Throw
```javascript
async function getUser(id) {
    const r = await fetch(`/users/${id}`);
    if (r.status === 404) throw new NotFoundError("user", id);
    if (!r.ok) throw new APIError(`HTTP ${r.status}`);
    return r.json();
}
```

Idiomatic. Errors propagate up naturally.

### Style 2: Return a tagged result
```javascript
async function getUser(id) {
    const r = await fetch(`/users/${id}`);
    if (r.status === 404) return { ok: false, error: "not_found" };
    if (!r.ok) return { ok: false, error: "api_failure" };
    return { ok: true, data: await r.json() };
}

const result = await getUser(1);
if (!result.ok) handle(result.error);
else use(result.data);
```

Forces callers to handle errors. Less ergonomic for nested chains. Used in Go-influenced codebases and increasingly seen in TS with libraries like `neverthrow` / `Effect`.

### Hybrid: throw for unexpected, return for expected
```javascript
async function findUser(id) {
    const r = await fetch(`/users/${id}`);
    if (r.status === 404) return null;             // expected — not found
    if (!r.ok) throw new Error(`HTTP ${r.status}`); // unexpected — server issue
    return r.json();
}
```

A common pattern: `null` for "expected absence," throw for "unexpected failure."

---

## 9. Top-Level Error Handlers

Catch what slips past application-level handling.

### Browser
```javascript
window.addEventListener("error", (e) => {
    console.error("Uncaught error", e.error);
    reportToSentry(e.error);
});

window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise rejection", e.reason);
    reportToSentry(e.reason);
});
```

### Node
```javascript
process.on("uncaughtException", (err) => {
    console.error("FATAL", err);
    // Best practice: log, then exit (the process is in an undefined state)
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection", reason);
    process.exit(1);
});
```

In production, hook these to Sentry / Rollbar / Datadog. **Crash on unrecoverable errors** — restart via your process manager (Docker, systemd, PM2). Don't try to limp on with an unknown state.

---

## 10. Logging Errors

### What to log
- The error itself (stack, name, message, custom fields).
- Context — request ID, user ID, current operation, relevant params (no secrets!).
- Timestamp (your logger usually adds this).
- Severity.

```javascript
logger.error({
    err,
    req_id: req.id,
    user_id: req.user?.id,
    operation: "process_payment",
    amount,
}, "payment processing failed");
```

### Don't log secrets
Filter or redact: API keys, tokens, passwords, PII. A logger like `pino` supports redaction:
```javascript
const logger = pino({
    redact: ["password", "*.token", "headers.authorization"],
});
```

### Don't log the same error in multiple places
Causes duplicate alerts. Catch and log at one level — usually the top of the request handler.

### Stack traces
Errors automatically capture stack at construction time. Don't `new Error(msg)` deep in the call chain if you'll re-throw later — the trace stays from the original throw point. Use `Error.cause` to chain explicit context.

---

## 11. Common Patterns

### Defensive parsing
```javascript
function safeJSON(s, fallback = null) {
    try { return JSON.parse(s); }
    catch { return fallback; }
}
```

### Default value on error
```javascript
const config = await loadConfig().catch(() => DEFAULT_CONFIG);
```

### Retry with exponential backoff
```javascript
async function retry(fn, options = {}) {
    const { attempts = 3, baseMs = 100, maxMs = 5000 } = options;
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            const delay = Math.min(baseMs * 2 ** i, maxMs);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

const data = await retry(() => fetchSomething(), { attempts: 5 });
```

Real retries should:
- Respect server `Retry-After` headers.
- Only retry idempotent operations.
- Cap total attempts and total time.
- Add jitter to avoid thundering herd.

Use `p-retry` or similar libraries in real code.

### Timeout wrapper
```javascript
function withTimeout(promise, ms, message = "timeout") {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(message)), ms)
        ),
    ]);
}

await withTimeout(slow(), 5000);
```

Or with AbortController:
```javascript
const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
```

### Circuit breaker
For downstream services that go bad — stop calling them temporarily.
Libraries: `opossum`, `cockatiel`.

### Idempotency
For non-idempotent operations (POST a payment), provide an idempotency key so retries don't double-charge.

### Graceful shutdown
```javascript
const server = app.listen(3000);

async function shutdown() {
    console.log("shutting down");
    server.close();
    await db.disconnect();
    process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

Without this, in-flight requests get cut off.

---

Error handling in JS is part discipline, part library choices. The language is permissive enough that you can ignore errors entirely — and you'll regret it on every production incident. Build the muscle memory: try/catch at boundaries, custom errors with context, logging that captures the chain.

Next: the browser-side stuff — `09_browser_apis.md`.
