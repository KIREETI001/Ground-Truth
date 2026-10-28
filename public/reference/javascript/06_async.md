# 06. Asynchronous JavaScript

> Callbacks → Promises → async/await, the event loop, AbortController. The most important file in this folder.

---

## Table of Contents

1. [The Event Loop (Brief)](#1-the-event-loop-brief)
2. [Callbacks](#2-callbacks)
3. [Promises](#3-promises)
4. [Async/Await](#4-asyncawait)
5. [Running in Parallel](#5-running-in-parallel)
6. [Error Handling](#6-error-handling)
7. [AbortController and Timeouts](#7-abortcontroller-and-timeouts)
8. [setTimeout, setInterval, microtasks](#8-settimeout-setinterval-microtasks)
9. [Async Iteration](#9-async-iteration)
10. [Common Pitfalls](#10-common-pitfalls)

---

## 1. The Event Loop (Brief)

JavaScript is **single-threaded**. There's one call stack executing your code. When async work happens (HTTP request, timer, file I/O), the runtime hands it off to the OS or a worker, and your code keeps running. When the result is ready, a callback gets queued for the event loop to pick up.

Simplified order each tick:
1. Run synchronous code until the call stack is empty.
2. Run all queued **microtasks** (Promise callbacks, `queueMicrotask`).
3. Run one **macrotask** (`setTimeout`, I/O, UI events).
4. Render (browser).
5. Repeat.

Practical takeaway: **never block the main thread for long**. Long-running pure JS work freezes the UI in the browser and blocks all other requests in Node. Use Web Workers (browser) or Worker Threads (Node) for CPU-heavy work.

---

## 2. Callbacks

The original async pattern. A function passes its eventual result to another function.

```javascript
fs.readFile("file.txt", "utf8", (err, contents) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(contents);
});
```

Convention (Node-style): callback's first argument is the error (null on success), second is the result.

### The pain
```javascript
fetchUser(id, (err, user) => {
    if (err) return handleError(err);
    fetchPosts(user.id, (err, posts) => {
        if (err) return handleError(err);
        renderPosts(posts, (err) => {
            if (err) return handleError(err);
            ...
        });
    });
});
```

"Callback hell." This is why Promises exist.

---

## 3. Promises

A **Promise** is an object representing a value that will be available *eventually*. It has three states:
- **Pending** — not yet resolved.
- **Fulfilled** — completed with a value.
- **Rejected** — failed with a reason (usually an Error).

### Consuming promises
```javascript
fetch("https://api.example.com/user/1")
    .then(response => response.json())
    .then(user => console.log(user))
    .catch(err => console.error(err))
    .finally(() => console.log("done"));
```

Each `.then` returns a new promise. The chain reads top-to-bottom.

### Creating promises
Most code consumes promises returned by APIs. You'll occasionally create one:
```javascript
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

await wait(1000);

const racePromise = new Promise((resolve, reject) => {
    setTimeout(() => resolve("done"), 100);
    setTimeout(() => reject(new Error("oops")), 200);
});
```

### `Promise.withResolvers` (ES2024)
```javascript
const { promise, resolve, reject } = Promise.withResolvers();

setTimeout(() => resolve("hi"), 100);

await promise;          // "hi"
```

Cleaner than the constructor when you need to resolve/reject from outside.

### Wrapping callback APIs as Promises
```javascript
const fs = require("node:fs");

function readFilePromise(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, "utf8", (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

// Node provides node:fs/promises — the wrapping is done for you
import { readFile } from "node:fs/promises";
const contents = await readFile("file.txt", "utf8");
```

### Chaining
```javascript
fetchUser(id)
    .then(user => fetchPosts(user.id))         // returns a Promise, chain continues
    .then(posts => render(posts))
    .catch(err => console.error(err));
```

If a `.then` callback returns a Promise, the next `.then` waits for it.

### Errors propagate down
```javascript
fetchUser(id)
    .then(user => {
        throw new Error("bad");                 // error
    })
    .then(x => console.log(x))                   // skipped
    .catch(err => console.error(err));           // caught here
```

One `.catch` at the end handles errors from all preceding steps.

---

## 4. Async/Await

Syntactic sugar on top of Promises. Lets you write async code that looks synchronous.

```javascript
async function getUserPosts(id) {
    try {
        const user = await fetchUser(id);
        const posts = await fetchPosts(user.id);
        return posts;
    } catch (err) {
        console.error(err);
        throw err;          // re-throw if you can't handle
    }
}

const posts = await getUserPosts(42);   // works at top level in modules
```

### Key facts
- An `async function` always returns a Promise.
- `await` pauses the function until the awaited Promise resolves.
- `await` only works inside `async` functions (or at module top-level since ES2022).
- Other async code can run while a function is awaiting.

### `async` arrow functions
```javascript
const fetchUser = async (id) => {
    const r = await fetch(`/users/${id}`);
    return r.json();
};
```

### Async methods
```javascript
class API {
    async getUser(id) {
        const r = await fetch(`/users/${id}`);
        return r.json();
    }
}
```

### Top-level await (ES2022)
In ES modules:
```javascript
// init.mjs
const config = await loadConfig();
const db = await connect(config.dbUrl);
export { db };
```

In CommonJS (`require`), you need to wrap in an IIFE:
```javascript
(async () => {
    const data = await getData();
    ...
})();
```

### When NOT to await
```javascript
// Sequential (slow) — each fetch waits for the previous
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();

// Parallel (fast) — start all at once
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
```

Use `Promise.all` whenever async operations are independent.

---

## 5. Running in Parallel

### `Promise.all` — fail if any fails
```javascript
const [users, posts, comments] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
    fetchComments(),
]);
```

If any rejects, the whole thing rejects with that reason (others may still run, but you can't easily get their results).

### `Promise.allSettled` — wait for all, succeed or fail
```javascript
const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()]);

for (const r of results) {
    if (r.status === "fulfilled") {
        console.log("ok", r.value);
    } else {
        console.log("failed", r.reason);
    }
}
```

Better when you want partial results.

### `Promise.race` — first to settle (fulfill or reject)
```javascript
const winner = await Promise.race([
    fetchFromMirror1(),
    fetchFromMirror2(),
    fetchFromMirror3(),
]);
```

Useful for "fastest of N" and for timeouts:
```javascript
const result = await Promise.race([
    fetchSlow(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
]);
```

### `Promise.any` — first to fulfill (ignores failures until all fail)
```javascript
const fastest = await Promise.any([
    fetchPrimary(),
    fetchBackup1(),
    fetchBackup2(),
]);
```

Rejects with `AggregateError` if all fail.

### Bounded concurrency (for many parallel tasks)
```javascript
// Crude: process in chunks
async function batched(items, n, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += n) {
        const chunk = items.slice(i, i + n);
        results.push(...await Promise.all(chunk.map(fn)));
    }
    return results;
}

// Better: a pool that keeps N in flight
async function pool(items, n, fn) {
    const results = [];
    const executing = new Set();
    for (const item of items) {
        const p = Promise.resolve().then(() => fn(item));
        results.push(p);
        executing.add(p);
        p.finally(() => executing.delete(p));
        if (executing.size >= n) await Promise.race(executing);
    }
    return Promise.all(results);
}

await pool(urls, 10, fetch);
```

Libraries: `p-limit`, `p-map` from sindresorhus.

---

## 6. Error Handling

### try/catch with await
```javascript
async function safeOp() {
    try {
        const result = await riskyOp();
        return result;
    } catch (err) {
        if (err instanceof NotFoundError) return null;
        throw err;          // unknown error — let it propagate
    }
}
```

### Catching at the call site
```javascript
const result = await fetchUser(id).catch(err => null);
// `result` is the user or null
```

### Unhandled rejections
A Promise that rejects without a `.catch` triggers:
- Browser: `unhandledrejection` event; warning in console.
- Node: `unhandledRejection` event; may crash the process by default in newer Node.

Always handle rejections, even if just to log them.

```javascript
process.on("unhandledRejection", (reason, promise) => {
    console.error("UNHANDLED REJECTION", reason);
});
```

### Custom error types
```javascript
class APIError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "APIError";
        this.status = status;
    }
}

throw new APIError("Not found", 404);
```

Always set `name` for `instanceof` to be most useful.

---

## 7. AbortController and Timeouts

`AbortController` is how you cancel async work — fetches, streams, timeouts.

```javascript
const controller = new AbortController();
const signal = controller.signal;

// Pass signal to anything that supports cancellation
fetch("https://slow.example.com", { signal })
    .then(r => r.json())
    .then(data => console.log(data))
    .catch(err => {
        if (err.name === "AbortError") console.log("cancelled");
        else throw err;
    });

// Cancel
setTimeout(() => controller.abort(), 3000);
```

### Built-in timeout (modern)
```javascript
const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
```

### Combining signals
```javascript
const combined = AbortSignal.any([
    AbortSignal.timeout(10000),
    userController.signal,
]);
await fetch(url, { signal: combined });
```

### Pattern: wrap any operation with a timeout
```javascript
function withTimeout(promise, ms) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            controller.signal.addEventListener("abort", () =>
                reject(new Error("timeout"))
            );
        }),
    ]).finally(() => clearTimeout(timeout));
}
```

For new code, use the native `AbortSignal.timeout`.

---

## 8. setTimeout, setInterval, microtasks

### `setTimeout`
```javascript
setTimeout(() => console.log("later"), 1000);
```

### `setInterval` — repeat
```javascript
const id = setInterval(() => console.log("tick"), 1000);
clearInterval(id);
```

Beware: if the callback takes longer than the interval, callbacks queue up and run back-to-back. Often safer to `setTimeout` recursively:
```javascript
async function loop() {
    while (true) {
        await doWork();
        await new Promise(r => setTimeout(r, 1000));
    }
}
```

### `queueMicrotask` — schedule before the next render/timer
```javascript
queueMicrotask(() => console.log("after current sync code"));
```

Microtasks (Promise then, `queueMicrotask`) run **before** macrotasks (`setTimeout`) — even with `setTimeout(fn, 0)`.

### Order
```javascript
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");

// Output: 1, 4, 3, 2
```

### `setImmediate` (Node only)
Similar to `setTimeout(fn, 0)` but slightly different scheduling.
```javascript
setImmediate(() => console.log("next tick"));
```

### `process.nextTick` (Node only)
Microtask-like but processed before other I/O. Use rarely — it can starve the event loop if abused.

---

## 9. Async Iteration

For streams of async values.

### `for await...of`
```javascript
async function* tick() {
    while (true) {
        await new Promise(r => setTimeout(r, 1000));
        yield Date.now();
    }
}

for await (const t of tick()) {
    console.log(t);
    if (t > someLimit) break;
}
```

Used heavily in Node streams:
```javascript
import { createReadStream } from "node:fs";
import readline from "node:readline";

const stream = createReadStream("big.log");
const rl = readline.createInterface({ input: stream });
for await (const line of rl) {
    processLine(line);
}
```

### Async iterables in fetch streams
```javascript
const response = await fetch(url);
for await (const chunk of response.body) {
    console.log(chunk);     // Uint8Array
}
```

### `Symbol.asyncIterator`
You can define your own:
```javascript
class Channel {
    constructor() {
        this.queue = [];
        this.resolvers = [];
    }

    push(item) {
        if (this.resolvers.length) {
            this.resolvers.shift()(item);
        } else {
            this.queue.push(item);
        }
    }

    async *[Symbol.asyncIterator]() {
        while (true) {
            if (this.queue.length) yield this.queue.shift();
            else yield await new Promise(r => this.resolvers.push(r));
        }
    }
}
```

---

## 10. Common Pitfalls

### Forgetting `await`
```javascript
async function getUser() { ... }

const user = getUser();         // user is a PROMISE, not the result
console.log(user);               // Promise { <pending> }

const user = await getUser();    // now user is the value
```

TypeScript and lint rules catch this; in plain JS, you have to be vigilant.

### `forEach` doesn't await
```javascript
[1, 2, 3].forEach(async (x) => {
    await doStuff(x);
});
// forEach doesn't wait — these run in parallel and the function returns immediately

// For sequential:
for (const x of [1, 2, 3]) await doStuff(x);

// For parallel with awaiting:
await Promise.all([1, 2, 3].map(async x => doStuff(x)));
```

### Awaiting in a `.map` is parallel
```javascript
const results = await Promise.all(items.map(async (x) => {
    return await fetchOne(x);
}));
```

This fires all fetches in parallel. If you want sequential, use a `for` loop.

### Mixed Promise and callback APIs
Older Node APIs use callbacks. Newer ones use promises (`node:fs/promises`, `node:dns/promises`). Use the promise versions. For old callback APIs, wrap once or use `util.promisify(fn)`.

### Catch placement
```javascript
// .catch on a wrapper doesn't catch errors inside async callbacks NOT awaited
async function f() {
    setTimeout(() => {
        throw new Error("oops");      // unhandled — no async ctx
    }, 100);
}
try { await f(); } catch { /* won't catch */ }
```

### `finally` doesn't see the return/throw
```javascript
async function f() {
    try { return 1; }
    finally { return 2; }     // 2 wins (DON'T do this)
}
await f();   // 2
```

Finally is for cleanup, not returning values.

### Long-running promises that never resolve
If a Promise never resolves or rejects, the awaiting code hangs forever. Always include timeouts on external calls.

### Promises that resolve immediately can mask race conditions
Microtask order matters. Tests that pass locally due to timing can fail in different environments.

### Cancellation isn't free
Always check `signal.aborted` in long loops:
```javascript
async function work(signal) {
    for (const item of bigList) {
        if (signal.aborted) throw new DOMException("aborted", "AbortError");
        await processOne(item);
    }
}
```

### `unhandledrejection` in browsers / `unhandledRejection` in Node
Both fire when a rejected Promise has no `.catch`. Hook them up to your error reporting in production.

---

Async is JavaScript's hardest area. Once you internalize the event loop and `await`, it becomes second nature — but until then, it's worth slowing down and tracing through example code.

Next: how to organize all of this across files — `07_modules.md`.
