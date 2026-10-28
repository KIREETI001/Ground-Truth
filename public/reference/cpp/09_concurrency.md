# 09. Concurrency

> `std::thread`, `std::async`, mutexes, atomics, the memory model, `std::jthread` (C++20), coroutines basics.

> C++'s concurrency story is powerful and dangerous. Data races are undefined behavior. Get the model right.

---

## Table of Contents

1. [Threading Basics](#1-threading-basics)
2. [`std::jthread` (C++20)](#2-stdjthread-c20)
3. [`std::async` and Futures](#3-stdasync-and-futures)
4. [Mutexes](#4-mutexes)
5. [Condition Variables](#5-condition-variables)
6. [Atomics and Memory Order](#6-atomics-and-memory-order)
7. [The Memory Model](#7-the-memory-model)
8. [Thread Pools](#8-thread-pools)
9. [Coroutines (C++20)](#9-coroutines-c20)
10. [Pitfalls](#10-pitfalls)

---

## 1. Threading Basics

```cpp
#include <thread>
#include <iostream>

void task(int id) {
    std::cout << "Hello from thread " << id << "\n";
}

int main() {
    std::thread t1(task, 1);
    std::thread t2(task, 2);
    
    t1.join();    // wait for t1
    t2.join();
}
```

`std::thread` constructor takes a callable + arguments. The thread starts running immediately.

### Joining and detaching
```cpp
std::thread t(work);
t.join();        // waits for completion
t.detach();      // runs independently; can't be joined
```

Each thread must be joined or detached before destruction. Otherwise: `std::terminate`.

### Thread with a lambda
```cpp
int x = 0;
std::thread t([&x]() { x = 42; });
t.join();
std::cout << x;    // 42
```

Capture by reference is fine if the lambda outlives the captured variable's scope. Common bug: spawn a thread that references local state, return from the function, thread accesses freed memory.

### Thread IDs
```cpp
std::this_thread::get_id();
t.get_id();

std::this_thread::sleep_for(std::chrono::seconds(1));
std::this_thread::yield();    // hint to scheduler
```

### Hardware concurrency
```cpp
unsigned n = std::thread::hardware_concurrency();
// number of logical CPU cores (or 0 if unknown)
```

Use this to size thread pools.

---

## 2. `std::jthread` (C++20)

A "joining thread" — auto-joins on destruction, supports cooperative cancellation.

```cpp
#include <thread>

void work(std::stop_token st) {
    while (!st.stop_requested()) {
        // do work
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}

void use_jthread() {
    std::jthread t(work);
    // ... do other things ...
}    // ~jthread() requests stop and joins automatically
```

### `std::stop_token` — cooperative cancellation
Worker checks `stop_requested()` periodically. The thread doesn't have to comply, but well-behaved workers do.

### Why `jthread` over `thread`
- No need to explicitly join.
- Built-in cancellation.
- Safer.

Prefer `jthread` in new code. `std::thread` is the legacy interface.

---

## 3. `std::async` and Futures

For "run this and give me the result later":

```cpp
#include <future>

std::future<int> result = std::async([]() {
    std::this_thread::sleep_for(std::chrono::seconds(1));
    return 42;
});

// Do other work...

int value = result.get();    // blocks until ready
```

### Launch policies
```cpp
std::async(std::launch::async, fn);          // always new thread
std::async(std::launch::deferred, fn);       // lazy — runs on .get()
std::async(std::launch::async | std::launch::deferred, fn);  // default; implementation chooses
```

Default behavior is implementation-defined — often deferred. To guarantee a new thread, use `std::launch::async`.

### `std::future` methods
```cpp
future.get();                          // wait + retrieve
future.wait();                          // wait without retrieving
future.wait_for(std::chrono::milliseconds(100));    // wait with timeout
future.valid();                          // has it been retrieved?
```

`.get()` is one-shot — calling twice is undefined behavior. Use `std::shared_future` for multiple gets.

### Exceptions through futures
```cpp
auto f = std::async([]() {
    throw std::runtime_error("oh no");
    return 42;
});

try {
    int x = f.get();
} catch (const std::runtime_error& e) {
    std::cerr << e.what();    // propagated from the async task
}
```

### `std::promise` and `std::packaged_task`
Lower-level building blocks:

```cpp
std::promise<int> p;
auto f = p.get_future();

std::thread t([&p]() {
    p.set_value(42);     // or p.set_exception(...)
});

int x = f.get();    // 42
t.join();
```

`std::packaged_task` wraps a callable so its return value goes into a future:
```cpp
std::packaged_task<int()> task([]() { return 42; });
auto f = task.get_future();
std::thread t(std::move(task));
t.join();
int x = f.get();
```

In practice, `std::async` covers most cases; promises/packaged_task for custom thread pools.

### Limitations of `std::async`
- No way to know if a deferred task will block.
- The implementation may "exhaust" threads at scale.
- Returned futures block on destruction (counterintuitively).

For real concurrency, use a thread pool library or write your own.

---

## 4. Mutexes

For protecting shared data.

```cpp
#include <mutex>

std::mutex m;
int counter = 0;

void increment() {
    std::lock_guard<std::mutex> lock(m);
    counter++;
}    // lock released when guard destructs
```

### `std::lock_guard`
RAII lock. Locks on construction, unlocks on destruction. Most common.

### `std::unique_lock`
More flexible:
```cpp
std::unique_lock<std::mutex> lock(m);
// can unlock and re-lock
lock.unlock();
// ... do something without the lock ...
lock.lock();
```

Used with condition variables (next section).

### `std::scoped_lock` (C++17)
Like `lock_guard` but supports locking multiple mutexes deadlock-free:
```cpp
std::mutex m1, m2;
std::scoped_lock lock(m1, m2);    // locks both atomically
```

### Mutex types
- `std::mutex` — basic.
- `std::recursive_mutex` — same thread can lock multiple times (carries unlock count). Often a code smell.
- `std::shared_mutex` (C++17) — multiple readers OR one writer.
- `std::timed_mutex` — `try_lock_for` / `try_lock_until`.

### `std::shared_mutex` example
```cpp
std::shared_mutex rw;
std::unordered_map<int, std::string> cache;

std::string read(int id) {
    std::shared_lock lock(rw);    // shared (read) lock
    return cache[id];
}

void write(int id, std::string val) {
    std::unique_lock lock(rw);    // exclusive (write) lock
    cache[id] = val;
}
```

Multiple `shared_lock`s can be active simultaneously; `unique_lock` waits for all to release.

### Why RAII locks
The destructor guarantees unlock even on exception:
```cpp
{
    std::lock_guard lock(m);
    might_throw();    // m is unlocked even if this throws
}
```

Without RAII, you'd need try/catch around every locked section.

### Don't lock around slow operations
```cpp
std::lock_guard lock(m);
shared_data.update();
slow_io();    // BAD — holding lock during I/O blocks other threads
```

Acquire data, release lock, then do the slow work.

---

## 5. Condition Variables

For threads to wait on a condition.

```cpp
#include <condition_variable>

std::mutex m;
std::condition_variable cv;
std::queue<Job> jobs;
bool stop = false;

// Producer
void add_job(Job j) {
    {
        std::lock_guard lock(m);
        jobs.push(j);
    }
    cv.notify_one();
}

// Consumer
void worker() {
    while (true) {
        std::unique_lock lock(m);
        cv.wait(lock, []() { return !jobs.empty() || stop; });
        
        if (stop && jobs.empty()) return;
        
        Job j = jobs.front();
        jobs.pop();
        lock.unlock();
        
        process(j);
    }
}
```

### `wait` semantics
`cv.wait(lock, predicate)`:
1. Calls predicate.
2. If true: returns immediately.
3. If false: atomically unlocks the mutex and blocks.
4. When notified: locks the mutex, calls predicate again. Repeat if false.

Always pass a predicate. Without one, you might wake up spuriously.

### `notify_one` vs `notify_all`
- `notify_one()` — wake one waiting thread.
- `notify_all()` — wake all.

Use `notify_one` if any of multiple waiters can handle the change. `notify_all` if the change might allow multiple to proceed.

### Hold the mutex when notifying?
Optional. Notifying with the mutex held is slightly more deterministic; notifying without it can reduce contention. Doesn't matter much in practice.

### `std::counting_semaphore` (C++20)
For limiting concurrent access:
```cpp
#include <semaphore>

std::counting_semaphore<5> sem(5);    // max 5 permits

void rate_limited_op() {
    sem.acquire();    // blocks if 5 are already running
    try {
        do_thing();
        sem.release();
    } catch (...) {
        sem.release();
        throw;
    }
}
```

### `std::latch` and `std::barrier` (C++20)
Synchronization primitives for collective wait.

```cpp
std::latch start(1);    // gate

std::vector<std::jthread> threads;
for (int i = 0; i < 10; ++i) {
    threads.emplace_back([&start, i]() {
        start.wait();    // wait until start is released
        // do work
    });
}

start.count_down();    // releases all threads
```

`std::barrier` for repeated phases.

---

## 6. Atomics and Memory Order

Atomic operations: indivisible, no data race.

```cpp
#include <atomic>

std::atomic<int> counter{0};

void increment() {
    counter++;     // atomic ++
}

int read() {
    return counter.load();
}
```

### Atomic operations
```cpp
counter.store(10);
counter.load();
counter.exchange(99);       // set and return old value
counter.fetch_add(5);        // += 5, return old
counter.compare_exchange_weak(expected, desired);
counter.compare_exchange_strong(expected, desired);
```

### CAS — Compare-And-Swap
The foundation of lock-free programming.
```cpp
int expected = counter.load();
int desired = expected + 1;
while (!counter.compare_exchange_weak(expected, desired)) {
    desired = expected + 1;    // expected was updated to actual value
}
```

`weak` may spuriously fail (faster on some architectures). `strong` doesn't.

### Memory order
The hardest part of C++ concurrency. Controls visibility / reordering.
```cpp
counter.store(1, std::memory_order_relaxed);
counter.store(1, std::memory_order_release);
counter.store(1, std::memory_order_seq_cst);    // default
```

Default (`seq_cst`) is the safest and easiest to reason about. Lower orders allow more reordering for performance but are tricky.

### Memory orders
- `memory_order_relaxed` — no ordering guarantees. Use only for counters where order doesn't matter.
- `memory_order_acquire` / `memory_order_release` — pairwise synchronization (release-acquire).
- `memory_order_acq_rel` — both.
- `memory_order_seq_cst` — sequential consistency (default).

### Standard advice
**Use `memory_order_seq_cst` (the default) unless you've measured and have a clear reason otherwise.** Relaxed memory orders are the territory of true experts; the gains are small and the bugs are subtle and hard to reproduce.

### `std::atomic` for non-trivial types
```cpp
std::atomic<float> f{0.0};         // OK — float is trivially copyable
std::atomic<std::string> s;        // requires special support; mostly avoid
```

For complex types, use a mutex.

---

## 7. The Memory Model

C++11 introduced a formal memory model defining what happens with multi-threaded code.

### Key rules
1. **Two unsynchronized accesses to the same memory location, where at least one is a write, is a data race.**
2. **Data races are undefined behavior** — program may crash, give wrong results, or appear to work and crash later.

### Synchronization tools
- Mutexes (lock for write, lock for read).
- Atomics.
- Memory fences (rare).

### `volatile` is NOT for concurrency
`volatile` prevents compiler optimization for that variable. Used for memory-mapped I/O. **Not** for inter-thread communication.

```cpp
volatile bool flag;     // doesn't help for threading
std::atomic<bool> flag2;   // correct
```

### Reasoning about correctness
When you have shared state:
1. Identify what's shared.
2. Decide: mutex, atomic, or no sharing.
3. Reach a sequential ordering of operations.

This is hard. Tools help:
- **ThreadSanitizer** (`-fsanitize=thread`) — detects races at runtime.
- **Helgrind** (Valgrind).
- Code review by people experienced in concurrency.

If you can't reason about correctness, you have a bug.

---

## 8. Thread Pools

The STL doesn't include a thread pool. You can build one with `std::thread` and a job queue, or use a library.

### Simple thread pool sketch
```cpp
class ThreadPool {
public:
    ThreadPool(size_t n) {
        for (size_t i = 0; i < n; ++i) {
            workers.emplace_back([this]() { worker(); });
        }
    }
    
    ~ThreadPool() {
        {
            std::lock_guard lock(m);
            stop = true;
        }
        cv.notify_all();
        for (auto& w : workers) w.join();
    }
    
    template<typename F>
    auto submit(F&& f) -> std::future<decltype(f())> {
        using R = decltype(f());
        auto task = std::make_shared<std::packaged_task<R()>>(std::forward<F>(f));
        auto fut = task->get_future();
        
        {
            std::lock_guard lock(m);
            jobs.emplace([task]() { (*task)(); });
        }
        cv.notify_one();
        return fut;
    }
    
private:
    void worker() {
        while (true) {
            std::unique_lock lock(m);
            cv.wait(lock, [this]() { return stop || !jobs.empty(); });
            if (stop && jobs.empty()) return;
            
            auto job = std::move(jobs.front());
            jobs.pop();
            lock.unlock();
            
            job();
        }
    }
    
    std::vector<std::thread> workers;
    std::queue<std::function<void()>> jobs;
    std::mutex m;
    std::condition_variable cv;
    bool stop = false;
};
```

### Libraries
- **Intel TBB** (Threading Building Blocks) — full parallel ecosystem (parallel_for, pipelines, etc.).
- **Boost.Asio** — async I/O + thread pool.
- **`std::execution::par`** algorithms — backed by TBB on GCC/Clang, custom on MSVC.

For game / engine work, custom job systems are common.

### Standard `std::execution` (proposed)
A standard execution model is in C++26. Watch the space; for now, library implementations vary.

---

## 9. Coroutines (C++20)

Functions that can suspend and resume.

```cpp
#include <coroutine>

generator<int> count_to(int n) {
    for (int i = 0; i < n; ++i) {
        co_yield i;
    }
}

for (int x : count_to(10)) {
    std::cout << x << " ";
}
```

`co_yield`, `co_await`, `co_return` are the new keywords.

### State of coroutines in C++
Coroutines are a language feature, but the standard library currently lacks high-level types — no `std::generator`, `std::task`, etc. until C++23.

C++23 added `std::generator`. Other coroutine types still come from libraries (cppcoro, libunifex, asio).

### Use cases
- Lazy sequences (generators).
- Asynchronous operations without callbacks.
- State machines.

### Async with coroutines
```cpp
task<int> fetch_data() {
    auto a = co_await http_get("/a");
    auto b = co_await http_get("/b");
    co_return parse(a) + parse(b);
}
```

The `co_await` looks synchronous but is actually asynchronous — the function suspends, returns control, and resumes when the awaited result is ready.

### Reality check
Coroutines are powerful but require understanding the low-level mechanics (promise types, awaiters) to write your own coroutine library. Most app code uses library-provided types.

The ecosystem in 2026 is still settling. For now, use coroutines via libraries (asio coroutines, cppcoro), and watch C++26 for more standard support.

---

## 10. Pitfalls

### Data races
```cpp
int x = 0;
std::thread t1([&x]() { x = 1; });
std::thread t2([&x]() { x = 2; });
t1.join(); t2.join();
// What is x? Undefined behavior.
```

Use `std::atomic<int>` or a mutex.

### Deadlocks
```cpp
std::mutex m1, m2;

// Thread A
std::lock_guard l1(m1);
std::lock_guard l2(m2);

// Thread B
std::lock_guard l1(m2);
std::lock_guard l2(m1);   // deadlock!
```

Fix:
- Always lock in the same order.
- Use `std::scoped_lock` (atomically locks multiple).
- Use `std::try_lock` with backoff.

### Forgetting to join
```cpp
{
    std::thread t(work);
    // ... function returns ...
}    // ~thread() called without join/detach → std::terminate
```

Use `std::jthread` (auto-joins) or ensure explicit join/detach.

### Lambda captures with thread
```cpp
void f() {
    std::vector<int> data = compute();
    std::thread t([&]() { use(data); });
    // function returns, data is destroyed
    t.detach();    // thread accesses freed memory
}
```

Capture by value, or join before exit.

### `std::async` blocking destructor
```cpp
auto f = std::async(std::launch::async, slow_work);
// f's destructor blocks until the task completes!
```

Counterintuitive. Save the future or use std::async sparingly.

### Mutex-protected std::cout
`std::cout` is not thread-safe across statements:
```cpp
std::cout << "thread " << id << " says " << msg;    // can interleave
```

Use a mutex or aggregate the output (`std::stringstream`, then atomic write).

### `volatile` for threads
`volatile` is for memory-mapped I/O. Not for concurrency. Use `std::atomic`.

### `static` initialization
Local static variable initialization is thread-safe (C++11+):
```cpp
auto& instance() {
    static MyClass inst;   // initialized once, thread-safely
    return inst;
}
```

Module-level static initialization order across translation units is **not** guaranteed thread-safe.

### Modifying shared collections
```cpp
std::vector<int> shared;
std::thread t1([&]() { shared.push_back(1); });
std::thread t2([&]() { shared.push_back(2); });
```

`std::vector` is not thread-safe. Use a mutex, or use concurrent containers from TBB or other libraries.

### False sharing
When two threads modify different variables that happen to be in the same cache line, the cache line ping-pongs between cores. Performance crater.

Fix with alignment:
```cpp
struct alignas(64) PaddedCounter {    // 64-byte cache line
    std::atomic<int> count;
};

PaddedCounter counters[NUM_THREADS];
```

C++17 provides `std::hardware_destructive_interference_size`:
```cpp
alignas(std::hardware_destructive_interference_size)
```

### Thread-local storage
```cpp
thread_local int per_thread_counter = 0;
```

Each thread has its own copy. Initialized per-thread on first access (or thread start, depending on storage class).

Useful for thread-local caches, random number generators.

### Pinning threads to cores
Not standard C++. Use platform APIs:
- Linux: `pthread_setaffinity_np`.
- Windows: `SetThreadAffinityMask`.

Rarely necessary outside HPC or real-time systems.

---

That's the C++ concurrency landscape. It's complex — the language gives you raw materials, not finished kitchens. Modern C++ helps (`std::jthread`, scoped_lock, atomics with sane defaults), but data races remain the easiest way to write subtly broken programs.

Next: I/O — `10_io_and_filesystem.md`.
