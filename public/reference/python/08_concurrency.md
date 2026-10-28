# 08. Concurrency

> The GIL, threading, multiprocessing, asyncio, and `concurrent.futures` — Python's tools for doing more than one thing at a time.

---

## Table of Contents

1. [Choosing the Right Approach](#1-choosing-the-right-approach)
2. [The GIL](#2-the-gil)
3. [`threading`](#3-threading)
4. [`multiprocessing`](#4-multiprocessing)
5. [`concurrent.futures` — the friendly wrapper](#5-concurrentfutures--the-friendly-wrapper)
6. [`asyncio` Basics](#6-asyncio-basics)
7. [Async Patterns](#7-async-patterns)
8. [Async Libraries](#8-async-libraries)
9. [Combining the Models](#9-combining-the-models)
10. [Common Pitfalls](#10-common-pitfalls)

---

## 1. Choosing the Right Approach

| Workload | Use | Why |
|---|---|---|
| CPU-bound (heavy math) | `multiprocessing` or NumPy/native libs | The GIL prevents threads from running Python code in parallel. |
| I/O-bound, many slow things | `asyncio` | One thread, thousands of concurrent operations. Best scalability. |
| I/O-bound, want simple code | `concurrent.futures.ThreadPoolExecutor` | Threads release the GIL during I/O. Easy to convert sync code. |
| Mixed: some CPU, some I/O | Process pool + async or threads inside processes | Carefully. |
| Single-machine batch jobs | `multiprocessing.Pool` | Easy parallel `map` across cores. |
| Distributed across machines | Celery, Ray, Dask, Spark | Beyond standard library. |

**Rule of thumb:** If your code spends most of its time waiting (network, disk, database), go async or threads. If it spends most of its time computing in pure Python, use multiprocessing or push the hot loop into NumPy/C.

---

## 2. The GIL

The **Global Interpreter Lock** prevents multiple threads from executing Python bytecode at the same time within one CPython process.

Consequences:
- **Threads don't speed up CPU-bound pure-Python code.** Running two compute-heavy threads is no faster than one.
- **Threads DO speed up I/O-bound code.** While one thread is waiting on a socket / file / database, another can run.
- **C extensions can release the GIL** during long native operations. That's why NumPy and PyTorch can use multiple cores even via threading.
- **`multiprocessing`** sidesteps the GIL by using separate processes (each with its own interpreter and GIL).

### Free-threaded Python (3.13+)
Python 3.13 introduced an experimental no-GIL build. Real parallelism with threads is on the horizon, but as of 2026 most production code still runs the standard GIL build for compatibility. Track the progress — this is a multi-release effort.

---

## 3. `threading`

```python
import threading
import time

def worker(name, delay):
    for i in range(3):
        print(f"{name}: {i}")
        time.sleep(delay)

# Create and start
t1 = threading.Thread(target=worker, args=("A", 0.1))
t2 = threading.Thread(target=worker, args=("B", 0.15))
t1.start(); t2.start()
t1.join(); t2.join()       # wait for completion
print("done")
```

### Daemon threads
Daemon threads die when the main program exits.
```python
t = threading.Thread(target=fn, daemon=True)
t.start()
```

Useful for background services where you don't care about graceful shutdown.

### Sharing state — `Lock`
Without synchronization, two threads updating shared state will race.
```python
counter = 0
lock = threading.Lock()

def increment():
    global counter
    with lock:                  # acquires lock; releases on exit
        counter += 1
```

Alternatives:
- `RLock` — reentrant lock (same thread can acquire multiple times).
- `Semaphore(n)` — allow up to n threads.
- `Event` — boolean flag that threads can wait on.
- `Condition` — wait-for-condition primitive.
- `Barrier(n)` — synchronize n threads at a point.

### `Queue` — the recommended primitive for thread communication
Don't share lists/dicts between threads with locks if you can help it. Use a `queue.Queue`:

```python
from queue import Queue
import threading

q = Queue()

def producer():
    for i in range(10):
        q.put(i)
    q.put(None)         # sentinel — signal end

def consumer():
    while True:
        item = q.get()
        if item is None: break
        print(item)
        q.task_done()

threading.Thread(target=producer).start()
threading.Thread(target=consumer).start()
```

`Queue` handles all the locking internally. Available variants: `Queue` (FIFO), `LifoQueue`, `PriorityQueue`.

### Thread-local data
```python
data = threading.local()
data.value = 5         # only visible to this thread
```

---

## 4. `multiprocessing`

Spawns separate OS processes. Each has its own GIL — real CPU parallelism.

```python
from multiprocessing import Process

def worker(name):
    print(f"hello from {name}")

if __name__ == "__main__":         # required on Windows!
    p1 = Process(target=worker, args=("A",))
    p2 = Process(target=worker, args=("B",))
    p1.start(); p2.start()
    p1.join(); p2.join()
```

The `if __name__ == "__main__":` guard is required on Windows and macOS (default spawn method) — without it, the new processes try to re-run your top-level code, causing infinite recursion.

### `Pool` — easy parallel map
```python
from multiprocessing import Pool

def square(n):
    return n * n

if __name__ == "__main__":
    with Pool(processes=4) as pool:
        results = pool.map(square, range(20))
        print(results)
```

```python
# Map with multiple args via starmap
def add(a, b):
    return a + b

with Pool(4) as pool:
    results = pool.starmap(add, [(1, 2), (3, 4), (5, 6)])
```

### Sharing data between processes
Processes don't share memory by default. Inter-process communication options:
- **`Queue`** (from `multiprocessing`) — like `queue.Queue` but cross-process.
- **`Pipe`** — bidirectional channel between two processes.
- **`Manager`** — share lists, dicts (slower; uses a server process).
- **`Value` / `Array`** — shared memory for primitive types.
- **`SharedMemory`** (3.8+) — share raw bytes between processes.

```python
from multiprocessing import Process, Queue

def producer(q):
    for i in range(5):
        q.put(i)

def consumer(q):
    while True:
        x = q.get()
        if x is None: break
        print(x)

q = Queue()
Process(target=producer, args=(q,)).start()
# ...
```

### What's pickle-able is sendable
Function args and return values across processes must be picklable. Lambdas, closures, and locally-defined classes typically fail. Use top-level functions and standard types.

### Start methods
- **`spawn`** — default on macOS/Windows. Fresh interpreter each time. Slowest startup but safest.
- **`fork`** — default on Linux. Fast, inherits parent state. Can deadlock with threads/locks.
- **`forkserver`** — middle ground.

Set explicitly:
```python
import multiprocessing as mp
mp.set_start_method("spawn", force=True)
```

---

## 5. `concurrent.futures` — the friendly wrapper

Higher-level abstraction over both threads and processes. Often the right starting point.

### ThreadPoolExecutor — for I/O work
```python
from concurrent.futures import ThreadPoolExecutor

def fetch(url):
    import requests
    return requests.get(url).status_code

urls = ["https://example.com"] * 20

with ThreadPoolExecutor(max_workers=8) as ex:
    results = list(ex.map(fetch, urls))
    print(results)
```

### ProcessPoolExecutor — for CPU work
```python
from concurrent.futures import ProcessPoolExecutor

def heavy(n):
    return sum(i*i for i in range(n))

if __name__ == "__main__":
    with ProcessPoolExecutor(max_workers=4) as ex:
        results = list(ex.map(heavy, [10_000_000] * 8))
```

### `submit` + `as_completed`
For more control when you want to process results as they complete:
```python
from concurrent.futures import ThreadPoolExecutor, as_completed

with ThreadPoolExecutor(max_workers=8) as ex:
    futures = {ex.submit(fetch, url): url for url in urls}
    for future in as_completed(futures):
        url = futures[future]
        try:
            print(url, future.result())
        except Exception as e:
            print(url, "failed:", e)
```

### Timeouts
```python
future.result(timeout=5)        # raises concurrent.futures.TimeoutError
```

---

## 6. `asyncio` Basics

Single-threaded event loop. Awaiting on I/O lets other tasks run while this one is blocked. Scales to thousands of concurrent connections.

```python
import asyncio

async def say(msg, delay):
    await asyncio.sleep(delay)
    print(msg)

async def main():
    await asyncio.gather(
        say("hello", 1),
        say("world", 0.5),
    )

asyncio.run(main())
```

### Vocabulary
- **Coroutine** — defined with `async def`. Calling it returns a coroutine *object*, which doesn't run until awaited or scheduled.
- **`await`** — suspends the current coroutine until the awaited thing finishes.
- **Event loop** — the scheduler. `asyncio.run(main())` creates and runs one.
- **Task** — a scheduled coroutine. Created via `asyncio.create_task(coro)`.

### Sequential vs concurrent
```python
async def slow(name):
    await asyncio.sleep(1)
    return name

# Sequential — takes 3 seconds total
async def main():
    a = await slow("A")
    b = await slow("B")
    c = await slow("C")
    return [a, b, c]

# Concurrent — takes 1 second total
async def main():
    return await asyncio.gather(slow("A"), slow("B"), slow("C"))
```

`await` alone doesn't run things concurrently. You need `gather`, `create_task`, or `TaskGroup`.

### `asyncio.gather`
Run multiple coroutines concurrently and collect results.
```python
results = await asyncio.gather(fn1(), fn2(), fn3())
```

By default, if one coroutine raises, others are cancelled and the exception propagates. Use `return_exceptions=True` to keep all results and return exceptions in place of values:
```python
results = await asyncio.gather(fn1(), fn2(), return_exceptions=True)
```

### `asyncio.TaskGroup` (3.11+) — the modern way
```python
async with asyncio.TaskGroup() as tg:
    t1 = tg.create_task(fn1())
    t2 = tg.create_task(fn2())
# Both completed; exceptions handled cleanly via except*

result1 = t1.result()
result2 = t2.result()
```

### Cancellation
```python
task = asyncio.create_task(fn())
task.cancel()
try:
    await task
except asyncio.CancelledError:
    pass
```

Use this for timeouts, early exit, etc.

### `asyncio.wait_for`
```python
try:
    result = await asyncio.wait_for(slow_op(), timeout=5.0)
except asyncio.TimeoutError:
    ...
```

### Mixing sync and async
Don't block the event loop with a sync CPU call — it freezes *all* tasks. Run blocking work in a thread/process:
```python
result = await asyncio.to_thread(blocking_function, arg)

# Or use the executor directly
loop = asyncio.get_running_loop()
result = await loop.run_in_executor(None, blocking_function, arg)
```

---

## 7. Async Patterns

### Concurrent HTTP requests
```python
import asyncio
import httpx

async def fetch(client, url):
    r = await client.get(url)
    return r.status_code

async def main():
    urls = ["https://example.com"] * 100
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*(fetch(client, u) for u in urls))
    return results

asyncio.run(main())
```

### Bounded concurrency with a semaphore
```python
sem = asyncio.Semaphore(10)        # max 10 in flight

async def limited_fetch(client, url):
    async with sem:
        return await client.get(url)
```

### Producer/consumer
```python
async def producer(q):
    for i in range(10):
        await q.put(i)
    await q.put(None)

async def consumer(q):
    while True:
        item = await q.get()
        if item is None: break
        await process(item)
        q.task_done()

async def main():
    q = asyncio.Queue()
    await asyncio.gather(producer(q), consumer(q))
```

### Async iteration
```python
async def stream():
    for i in range(5):
        await asyncio.sleep(0.5)
        yield i

async def main():
    async for x in stream():
        print(x)
```

### Async context managers
```python
async with httpx.AsyncClient() as client:
    ...

async with aiofiles.open("data.txt") as f:
    contents = await f.read()
```

---

## 8. Async Libraries

The async ecosystem is rich. Notable libraries:

| Use | Library |
|---|---|
| HTTP client | `httpx` (sync+async), `aiohttp` |
| HTTP server | FastAPI, Starlette, aiohttp |
| Database (Postgres) | `asyncpg`, SQLAlchemy 2.0 async |
| Database (any SQL via DBAPI) | `aiosqlite`, `aiomysql`, `asyncpg` |
| File I/O | `aiofiles` |
| Subprocess | `asyncio.create_subprocess_exec`, `asyncio.create_subprocess_shell` |
| Redis | `redis-py` (3.0+ has async), `aioredis` (deprecated) |
| Kafka / queues | `aiokafka`, `faststream` |
| Web sockets | `websockets`, FastAPI built-in |
| GraphQL | `strawberry`, `ariadne` |
| AMQP | `aio-pika` |

### "Async all the way down"
If any part of your stack is sync (blocking), the whole pipeline degrades. A single sync DB driver in an otherwise async app blocks the event loop on every query. Either pick async drivers or run sync code in a thread.

---

## 9. Combining the Models

Common combinations:

### Process pool + async
For CPU-heavy work inside an async app: offload to a process pool.
```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

pool = ProcessPoolExecutor()

async def main():
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(pool, heavy_computation, data)
```

### Thread pool + async
For blocking I/O libraries you can't switch:
```python
result = await asyncio.to_thread(blocking_db_call, args)
```

### Multiple processes, each running asyncio
Servers like Uvicorn use this: N worker processes (one per CPU core), each running an async event loop. Best of both worlds for I/O servers.

---

## 10. Common Pitfalls

### Mutating shared state from threads without locks
Race conditions. Use `Lock`, `Queue`, or stick to per-thread state.

### Blocking the event loop
Calling a sync I/O function inside async code. The whole loop pauses until it returns. Use async equivalents or `asyncio.to_thread`.

### Forgetting to await
```python
async def fn(): return 1
result = fn()                # result is a coroutine, NOT 1
result = await fn()          # 1
```
Type checkers and tools like Ruff catch most of these.

### Creating tasks without keeping references
```python
asyncio.create_task(fn())    # may be garbage-collected mid-flight
```
Hold a reference (or use TaskGroup).

### Running asyncio code from sync, repeatedly
```python
asyncio.run(main())          # OK once per invocation
asyncio.run(main())          # in a loop is fine
asyncio.run(other())         # but spinning up loops repeatedly is slow
```
Better: have one top-level async function and call other async functions from it.

### `time.sleep` inside async
Blocks the loop. Use `await asyncio.sleep(n)` instead.

### Mixing event loops
`asyncio.run` creates a new event loop. Don't call it inside an already-running event loop (use `await main()` instead).

### Process pool startup cost
Each process pays a startup cost. For tasks that take microseconds, the pool overhead dominates. Multiprocessing is most effective for chunks of work that take seconds.

### Pickling failures with multiprocessing
`Can't pickle <local function>` etc. — top-level functions only across processes.

### Daemon thread cleanup
Daemon threads don't get the chance to run `finally` blocks on shutdown. Don't rely on cleanup happening.

### Deadlocks with fork on Linux + threads
Don't mix `multiprocessing` `fork` with threading. Forking a multi-threaded program is hazardous because only the calling thread gets copied — locks held by other threads are now held forever in the child. Use `spawn` if you mix.

---

That's the concurrency landscape. For most servers in 2026, the answer is `asyncio` + an async stack. For data crunching, multiprocessing or just hand off to NumPy/PyTorch. Threads are still useful glue.

Next: actually doing the I/O — `09_io_and_apis.md`.
