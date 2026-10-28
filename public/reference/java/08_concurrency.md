# 08. Concurrency

> Threads, ExecutorService, CompletableFuture, virtual threads (Java 21+), synchronization, atomics, and concurrent collections.

> The Java concurrency story shifted dramatically with virtual threads (Project Loom, Java 21). Most server code in 2026 uses them.

---

## Table of Contents

1. [Threads — the Basics](#1-threads--the-basics)
2. [ExecutorService](#2-executorservice)
3. [Virtual Threads (Java 21+)](#3-virtual-threads-java-21)
4. [Structured Concurrency (Preview)](#4-structured-concurrency-preview)
5. [CompletableFuture](#5-completablefuture)
6. [Synchronization](#6-synchronization)
7. [Locks](#7-locks)
8. [Atomics](#8-atomics)
9. [Concurrent Collections](#9-concurrent-collections)
10. [BlockingQueue](#10-blockingqueue)
11. [Common Patterns and Pitfalls](#11-common-patterns-and-pitfalls)

---

## 1. Threads — the Basics

```java
Thread t = new Thread(() -> {
    System.out.println("running on " + Thread.currentThread().getName());
});
t.start();
t.join();    // wait for it to finish
```

Anatomy:
- `start()` — schedule the thread; eventually `run()` executes on a new OS thread.
- `join()` — block the current thread until the target finishes.
- `Thread.currentThread()` — the running thread.
- `Thread.sleep(ms)` — pause. Throws `InterruptedException`.

### Naming threads
```java
Thread t = new Thread(runnable, "worker-1");
t.start();
```

Naming threads helps debugging. Set `Thread.UncaughtExceptionHandler` for unhandled exceptions:
```java
t.setUncaughtExceptionHandler((thread, ex) -> log.error("thread failed", ex));
```

### Daemon threads
```java
t.setDaemon(true);    // JVM exits when only daemons remain
```

Used for background tasks (cleanup, GC support). Set before `start()`.

### Interrupting
```java
t.interrupt();        // signals the thread to stop
```

The target thread receives this if blocked in `sleep`/`wait`/etc. (throws `InterruptedException`), or via `Thread.currentThread().isInterrupted()` check.

```java
while (!Thread.currentThread().isInterrupted()) {
    try {
        doWork();
        Thread.sleep(100);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();   // restore the flag
        break;
    }
}
```

### Don't use raw Threads in production
Direct `new Thread(...)` is fine for small scripts. For real apps, use ExecutorService or virtual threads — they manage thread pools, lifecycle, exception handling.

---

## 2. ExecutorService

A pool of threads that runs tasks.

```java
ExecutorService executor = Executors.newFixedThreadPool(4);

Future<Integer> result = executor.submit(() -> {
    Thread.sleep(1000);
    return 42;
});

int value = result.get();   // blocks until done

executor.shutdown();         // no new tasks; finish pending
executor.shutdownNow();      // interrupt running tasks
executor.awaitTermination(10, TimeUnit.SECONDS);
```

### Submitting tasks
- `submit(Runnable)` → `Future<?>` (no result).
- `submit(Callable<T>)` → `Future<T>` (has result, can throw).
- `execute(Runnable)` → fire-and-forget.

### Common executor types
```java
Executors.newFixedThreadPool(n);              // fixed pool
Executors.newCachedThreadPool();               // grows/shrinks; idle threads die after 60s
Executors.newSingleThreadExecutor();           // one thread, queue
Executors.newScheduledThreadPool(n);            // for delayed/periodic tasks
Executors.newVirtualThreadPerTaskExecutor();   // Java 21+ — virtual threads
```

### `invokeAll` and `invokeAny`
```java
List<Callable<Integer>> tasks = List.of(
    () -> compute(1),
    () -> compute(2),
    () -> compute(3)
);

// Wait for all
List<Future<Integer>> results = executor.invokeAll(tasks);

// Wait for first successful
Integer first = executor.invokeAny(tasks);
```

### `ScheduledExecutorService`
```java
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

scheduler.schedule(task, 5, TimeUnit.SECONDS);
scheduler.scheduleAtFixedRate(task, 0, 1, TimeUnit.MINUTES);
scheduler.scheduleWithFixedDelay(task, 0, 1, TimeUnit.MINUTES);
```

`AtFixedRate` runs every N units regardless of how long the task takes; `WithFixedDelay` waits N units between successive completions.

### Shutdown hooks
Always shutdown executors:
```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    executor.shutdown();
    try {
        if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
            executor.shutdownNow();
        }
    } catch (InterruptedException e) {
        executor.shutdownNow();
    }
}));
```

In Java 19+, ExecutorService implements `AutoCloseable`:
```java
try (var executor = Executors.newFixedThreadPool(4)) {
    executor.submit(task);
}    // close() waits for tasks, then shuts down
```

---

## 3. Virtual Threads (Java 21+)

The biggest change in Java concurrency in a decade. Virtual threads are **lightweight** — millions can exist on a single JVM.

```java
Thread.startVirtualThread(() -> {
    System.out.println("hi from virtual thread");
});

// Or via ExecutorService
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 10_000; i++) {
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));
            return null;
        });
    }
}
```

### Why this matters
Traditional Java thread = OS thread. ~1MB stack each. Practical limit: thousands per JVM.

Virtual thread = JVM-managed, multiplexed onto carrier (OS) threads. Tiny memory footprint. Practical limit: millions per JVM.

This enables a thread-per-request model that previously required reactive frameworks (WebFlux, RxJava) to handle scale.

### Practical use
Replace your fixed thread pool with virtual threads when:
- You have many blocking I/O calls (DB, HTTP, files).
- Each task spends most time waiting.

```java
// Old style — limited to pool size
ExecutorService old = Executors.newFixedThreadPool(200);

// New style — scales to whatever your code can handle
ExecutorService virtual = Executors.newVirtualThreadPerTaskExecutor();
```

### Spring Boot 3.2+ supports virtual threads
```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true
```

Every request gets a virtual thread. No code changes needed for typical CRUD apps.

### When NOT to use virtual threads
- **CPU-bound work** — virtual threads still need carrier threads. Pinned to CPUs. Use a regular pool sized to your cores.
- **Long-lived synchronized blocks** — virtual threads "pin" to their carrier during `synchronized`. Java 23+ improves this; prefer `ReentrantLock`.
- **ThreadLocal heavy use** — virtual threads use scoped values better.

### Carrier threads
Virtual threads ride on a small pool of "carrier" OS threads (default: number of CPU cores). When a virtual thread blocks on I/O, the carrier thread is freed to run other virtual threads.

### What changes for you
Most application code: nothing. Use virtual threads, write blocking code, scale beautifully.

Library authors / framework maintainers: review `synchronized` usage; prefer `ReentrantLock` in hot paths.

---

## 4. Structured Concurrency (Preview)

In Java 21 as preview, evolving toward standard in later versions. Treats concurrent tasks like a structured block — if one fails, others are canceled.

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> user = scope.fork(() -> fetchUser(id));
    Subtask<Order> order = scope.fork(() -> fetchOrder(id));
    
    scope.join();             // wait for all
    scope.throwIfFailed();    // throw if any failed
    
    return new Response(user.get(), order.get());
}
```

If either subtask throws, the other is canceled. The scope ensures everything is cleaned up.

Variants:
- `ShutdownOnFailure` — cancel siblings if any fail.
- `ShutdownOnSuccess<T>` — cancel siblings when one succeeds.

This is the future of concurrent code in Java — replaces a lot of `CompletableFuture` boilerplate. Check the latest preview/stable status in your Java version.

---

## 5. CompletableFuture

For composing async operations. Used heavily before virtual threads; still useful for callback-style flows.

```java
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> {
    return fetchUser(id);
});

CompletableFuture<List<Post>> postsFuture = CompletableFuture.supplyAsync(() -> {
    return fetchPosts(id);
});

CompletableFuture<UserProfile> profile = userFuture.thenCombine(
    postsFuture,
    (user, posts) -> new UserProfile(user, posts)
);

UserProfile result = profile.get();    // blocks
```

### Common operations
```java
CompletableFuture<String> f = CompletableFuture.supplyAsync(() -> "hello");

f.thenApply(s -> s.toUpperCase());          // transform
f.thenAccept(System.out::println);          // side effect
f.thenRun(() -> System.out.println("done")); // ignore result

f.thenCompose(s -> fetchOther(s));          // chain async operation
f.thenCombine(other, (a, b) -> a + b);       // wait for both

CompletableFuture.allOf(f1, f2, f3).join(); // wait for all
CompletableFuture.anyOf(f1, f2, f3).join(); // first to complete

f.exceptionally(ex -> "default");           // handle errors
f.handle((value, ex) -> ex == null ? value : "default");
f.whenComplete((value, ex) -> log(value, ex));
```

### Custom executor
```java
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
CompletableFuture.supplyAsync(() -> work(), executor);
```

By default, async ops run on the ForkJoinPool common pool. For blocking I/O, supply your own executor.

### When CompletableFuture vs virtual threads
In 2026:
- For simple "run task, get result," prefer virtual threads + blocking code.
- For complex async pipelines (parallel fetches with cross-dependencies), CompletableFuture is still useful.
- Or use structured concurrency for the cleanest expression.

---

## 6. Synchronization

The original Java concurrency primitive. Use sparingly in modern code.

### `synchronized` keyword
```java
public class Counter {
    private int count = 0;
    
    public synchronized void increment() {
        count++;
    }
    
    public synchronized int get() {
        return count;
    }
}
```

`synchronized` on a method = synchronized on `this`. Two threads can't be in any synchronized method of the same object at once.

### Synchronized block
```java
public void doStuff() {
    synchronized (this) {
        // critical section
    }
}

// On a different lock object
private final Object lock = new Object();

public void doStuff() {
    synchronized (lock) {
        // critical section
    }
}
```

### `wait` / `notify` / `notifyAll`
Old-school thread coordination. Awkward and easy to misuse. Modern code uses `Lock` + `Condition`, or higher-level constructs (BlockingQueue, Semaphore).

```java
synchronized (lock) {
    while (!condition) lock.wait();
    // do work
}

synchronized (lock) {
    condition = true;
    lock.notifyAll();
}
```

If you find yourself writing wait/notify in modern code, look for a higher-level primitive.

### `volatile`
Variables marked `volatile` guarantee:
- Reads/writes are atomic (for primitives up to 64 bits).
- Changes are visible to other threads (memory barrier).

```java
private volatile boolean running = true;

public void stop() {
    running = false;
}

public void run() {
    while (running) {
        doWork();
    }
}
```

`volatile` doesn't make compound operations atomic (`x++` still has a read-then-write race). For that, use atomics (next section).

### `synchronized` in 2026
- Fine for short, infrequent critical sections.
- Avoid in hot paths with virtual threads — causes pinning (until Java 24+).
- Prefer `ReentrantLock` for new code that's performance-sensitive.

---

## 7. Locks

`java.util.concurrent.locks` — more flexible than `synchronized`.

### ReentrantLock
```java
private final ReentrantLock lock = new ReentrantLock();

public void doStuff() {
    lock.lock();
    try {
        // critical section
    } finally {
        lock.unlock();   // always in finally!
    }
}
```

### `tryLock`
```java
if (lock.tryLock()) {
    try { ... } finally { lock.unlock(); }
} else {
    // didn't get the lock; do something else
}

// With timeout
if (lock.tryLock(1, TimeUnit.SECONDS)) {
    try { ... } finally { lock.unlock(); }
}
```

### ReadWriteLock
Multiple readers OR one writer.
```java
private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();

public V get(K key) {
    rw.readLock().lock();
    try {
        return map.get(key);
    } finally {
        rw.readLock().unlock();
    }
}

public void put(K key, V value) {
    rw.writeLock().lock();
    try {
        map.put(key, value);
    } finally {
        rw.writeLock().unlock();
    }
}
```

Useful when reads vastly outnumber writes. But `ConcurrentHashMap` is usually better — no lock management.

### StampedLock
Optimistic locking variant of ReadWriteLock. Niche.

### Conditions
```java
Lock lock = new ReentrantLock();
Condition notFull = lock.newCondition();
Condition notEmpty = lock.newCondition();

public void put(Item x) throws InterruptedException {
    lock.lock();
    try {
        while (full) notFull.await();
        // add x
        notEmpty.signal();
    } finally {
        lock.unlock();
    }
}
```

For coordinating wait/signal patterns. Most use cases are better served by `BlockingQueue` or `Semaphore`.

### Semaphore
```java
Semaphore permits = new Semaphore(3);   // 3 concurrent operations allowed

public void rateLimit() throws InterruptedException {
    permits.acquire();
    try {
        // up to 3 of these run concurrently
    } finally {
        permits.release();
    }
}
```

Useful for rate limiting, resource pools.

### CountDownLatch
```java
CountDownLatch ready = new CountDownLatch(3);

// 3 worker threads
new Thread(() -> { setup(); ready.countDown(); }).start();
new Thread(() -> { setup(); ready.countDown(); }).start();
new Thread(() -> { setup(); ready.countDown(); }).start();

ready.await();   // blocks until count reaches 0
// all workers are ready, proceed
```

One-shot: can't reset.

### CyclicBarrier
Like CountDownLatch but reusable; threads "meet" at the barrier.
```java
CyclicBarrier barrier = new CyclicBarrier(3, () -> System.out.println("phase done"));

// 3 threads:
barrier.await();   // each thread waits here
// when all 3 arrive, the optional action runs, then all proceed
```

Used in parallel algorithms with phases.

---

## 8. Atomics

`java.util.concurrent.atomic` — lock-free atomic operations.

```java
AtomicInteger counter = new AtomicInteger(0);

counter.incrementAndGet();        // ++ atomically
counter.getAndIncrement();
counter.addAndGet(5);
counter.set(10);
int v = counter.get();
counter.compareAndSet(10, 20);    // CAS: set to 20 if currently 10

AtomicLong al = new AtomicLong(0L);
AtomicReference<User> userRef = new AtomicReference<>(initial);

userRef.compareAndSet(oldUser, newUser);
userRef.updateAndGet(u -> u.withAge(u.age() + 1));   // Java 8+
```

### When to use
- Counters, flags, references that multiple threads update.
- Lock-free data structures.

### `LongAdder` / `LongAccumulator`
For high-contention counters, faster than `AtomicLong`:
```java
LongAdder adder = new LongAdder();

// Many threads:
adder.increment();
adder.add(5);

long total = adder.sum();   // approximate during concurrent updates; exact when quiescent
```

LongAdder maintains a sum spread across cells; reduces contention.

---

## 9. Concurrent Collections

### `ConcurrentHashMap`
Thread-safe, high-performance map.
```java
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.put("a", 1);
map.get("a");

// Atomic compound operations
map.computeIfAbsent("counter", k -> 0);
map.merge("a", 1, Integer::sum);          // increment safely
map.compute("a", (k, v) -> v == null ? 1 : v + 1);
map.putIfAbsent("b", 2);

// Bulk operations
map.forEach((k, v) -> ...);
map.search(parallelismThreshold, (k, v) -> ...);
map.reduce(parallelismThreshold, (k, v) -> ..., (a, b) -> ...);
```

`compute`/`merge` are atomic — better than `if (!map.containsKey(k)) map.put(k, v)` which has a race condition.

### `CopyOnWriteArrayList`
Thread-safe list optimized for many reads, few writes. Each write copies the entire array.
```java
List<Listener> listeners = new CopyOnWriteArrayList<>();
listeners.add(listener);

for (Listener l : listeners) l.onEvent(e);   // safe — iteration over a snapshot
```

Use for event listener lists, rarely-updated caches.

### `CopyOnWriteArraySet`
Same idea for sets.

### `ConcurrentSkipListMap` / `ConcurrentSkipListSet`
Concurrent sorted map/set. O(log n) operations.

### `Collections.synchronizedList(list)` etc.
Wraps a regular collection with synchronized methods. Use `ConcurrentHashMap` etc. instead — they're better in nearly every way.

---

## 10. BlockingQueue

For producer-consumer patterns.

```java
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(100);   // bounded

// Producer
queue.put(task);             // blocks if full
queue.offer(task);            // non-blocking; returns false if full
queue.offer(task, 1, TimeUnit.SECONDS);   // wait up to 1s

// Consumer
Task task = queue.take();     // blocks if empty
Task task2 = queue.poll();     // returns null if empty
Task task3 = queue.poll(1, TimeUnit.SECONDS);
```

### Implementations
- `LinkedBlockingQueue` — bounded or unbounded (default).
- `ArrayBlockingQueue` — bounded, fixed-size array.
- `PriorityBlockingQueue` — priority order.
- `DelayQueue` — items become available after a delay.
- `SynchronousQueue` — zero capacity; producer waits for consumer.

### Producer-consumer skeleton
```java
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(100);

// Producers
for (int i = 0; i < 3; i++) {
    executor.submit(() -> {
        while (!Thread.currentThread().isInterrupted()) {
            queue.put(produce());
        }
        return null;
    });
}

// Consumers
for (int i = 0; i < 5; i++) {
    executor.submit(() -> {
        while (!Thread.currentThread().isInterrupted()) {
            Task t = queue.take();
            process(t);
        }
        return null;
    });
}
```

For real workloads, BullMQ-style external queues (Redis, RabbitMQ, Kafka) usually beat in-memory queues.

---

## 11. Common Patterns and Pitfalls

### Race condition
```java
private int count = 0;
public void increment() { count++; }   // not atomic — read, add, write
```

Fix: `synchronized`, `AtomicInteger`, or `LongAdder`.

### Deadlock
Two threads each hold a lock the other wants:
```java
// Thread 1
synchronized (lockA) {
    synchronized (lockB) { ... }
}

// Thread 2
synchronized (lockB) {
    synchronized (lockA) { ... }
}
```

Prevention:
- Always acquire locks in the same order.
- Use `tryLock` with timeout.
- Avoid nested locks when possible.

### Forgetting `finally` for unlock
```java
lock.lock();
doStuff();
lock.unlock();    // never reached if doStuff throws!
```

Always:
```java
lock.lock();
try { doStuff(); }
finally { lock.unlock(); }
```

### `ConcurrentModificationException` (not concurrency!)
Iterating a non-concurrent collection while mutating it:
```java
List<String> list = new ArrayList<>(...);
for (String s : list) {
    if (cond(s)) list.remove(s);   // CME
}
```

This is single-threaded! Use `Iterator.remove()` or `removeIf`. For actual concurrent access, use `ConcurrentHashMap` etc.

### Visibility issues
```java
boolean running = true;
new Thread(() -> { while (running) work(); }).start();
running = false;    // other thread may never see this!
```

Fix: `volatile` or atomic, or synchronized accessor.

### Thread leaks
```java
ExecutorService executor = Executors.newCachedThreadPool();
executor.submit(task);
// forgot executor.shutdown() — threads live forever
```

Always shutdown executors. In Java 19+, use try-with-resources.

### Catching `InterruptedException` and continuing
```java
try { Thread.sleep(1000); }
catch (InterruptedException e) { /* ignore */ }    // BAD
```

Restore the flag or exit:
```java
catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    return;
}
```

### ThreadLocal pitfalls
```java
private static final ThreadLocal<User> current = new ThreadLocal<>();
```

ThreadLocals leak memory if not cleaned up in pooled threads. Always:
```java
try {
    current.set(user);
    doStuff();
} finally {
    current.remove();
}
```

Java 21+ has **`ScopedValue`** as a safer replacement (preview):
```java
private static final ScopedValue<User> CURRENT = ScopedValue.newInstance();

ScopedValue.where(CURRENT, user).run(() -> {
    // CURRENT is bound here
});
// CURRENT is unbound here
```

### Synchronizing on wrong object
```java
private final Integer count = 0;     // BAD — boxed Integer can be shared
synchronized (count) { ... }

// Better
private final Object lock = new Object();
synchronized (lock) { ... }
```

Lock on `private final Object` to avoid accidental external locking.

### Don't synchronize on `String` literals
```java
synchronized ("lock") { ... }    // BAD — interned, shared globally
```

### Lambda doesn't auto-`synchronized`
```java
public void doIt() {
    list.forEach(x -> mutate(x));    // each callback is unsynchronized
}
```

If you need synchronization in the callback, do it explicitly.

### Reading `volatile` doesn't make compound ops atomic
```java
private volatile int count;
count = count + 1;    // NOT atomic — race between read and write
```

Use atomic for compound ops.

### `synchronized` on virtual threads (Java 21-23)
Holding a `synchronized` lock pins the virtual thread to its carrier. Avoid in hot paths. Java 24+ removes this limitation. In the meantime, prefer `ReentrantLock`.

### Don't use `Vector`, `Hashtable`, `Stack`
Legacy synchronized collections. Use modern equivalents (`ArrayList`, `HashMap`, `ArrayDeque`).

### `Future.get()` without timeout
```java
result.get();    // blocks forever if the task hangs
result.get(5, TimeUnit.SECONDS);   // safer
```

### Don't share `Random` across threads
```java
Random r = new Random();      // contended across threads
ThreadLocalRandom.current().nextInt();    // per-thread, fast
```

Or use `SplittableRandom` for parallel streams.

### Don't block on the same executor that's running you
If a task on a thread pool submits another task and blocks waiting for it, with a full pool you can deadlock. Use separate pools or async chains.

---

That's the concurrency surface. Java's story in 2026: write simple blocking code on virtual threads, and let the JVM handle scaling. Reach for fancier patterns only when you genuinely need them.

Next: I/O and networking — `09_io_and_networking.md`.
