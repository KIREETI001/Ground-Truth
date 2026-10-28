# 14. JVM & Performance

> JVM architecture, garbage collection, profiling, JIT compilation, GraalVM native image.

> Useful background even if you never tune the JVM directly — understanding what it does explains a lot of Java's behavior.

---

## Table of Contents

1. [JVM Architecture](#1-jvm-architecture)
2. [Memory Areas](#2-memory-areas)
3. [Garbage Collection](#3-garbage-collection)
4. [JIT Compilation](#4-jit-compilation)
5. [Profiling Tools](#5-profiling-tools)
6. [Common Performance Issues](#6-common-performance-issues)
7. [GraalVM and Native Image](#7-graalvm-and-native-image)
8. [Tuning Tips](#8-tuning-tips)
9. [Benchmarking with JMH](#9-benchmarking-with-jmh)
10. [What to Care About in Practice](#10-what-to-care-about-in-practice)

---

## 1. JVM Architecture

The JVM ("Java Virtual Machine") is a runtime that executes bytecode. High-level flow:

```
.java source
    ↓ javac
.class bytecode (platform-independent)
    ↓ JVM at runtime
    ↓ ClassLoader → Verifier → Interpreter (initially)
    ↓ JIT compiler → optimized native code
Native CPU instructions
```

Key components:
- **ClassLoader** — loads `.class` files from JARs, directories, or modules.
- **Bytecode Verifier** — checks bytecode for safety.
- **Interpreter** — initially executes bytecode directly.
- **JIT (Just-in-Time) Compiler** — compiles "hot" methods to native code.
- **Garbage Collector** — manages memory automatically.
- **Memory areas** — heap, stack, metaspace, etc.

### HotSpot — the standard JVM
"HotSpot" is the OpenJDK / Oracle JVM. The dominant implementation in 2026.

Alternatives:
- **OpenJ9** (IBM) — lower memory footprint.
- **GraalVM** — adds native image, polyglot.
- **Zing / Prime** (Azul) — commercial, low-pause GC.

For most projects: HotSpot via Eclipse Temurin.

---

## 2. Memory Areas

### Heap
Where all objects live. Divided into:
- **Young generation**:
  - Eden — where new objects start.
  - Survivor spaces (S0, S1) — for objects that survived a GC.
- **Old generation** — for long-lived objects that survived several GCs.

When Eden fills → **minor GC**. Surviving objects move to Survivor; aged objects to Old.
When Old fills → **major GC** (more expensive).

### Stack (per thread)
Each thread has its own stack. Holds:
- Local variables (primitives, references).
- Method call frames.
- Return addresses.

Stack overflow → `StackOverflowError`. Deep recursion is the usual cause.

Default stack size: 512KB–1MB per thread (depending on platform).

### Metaspace
Class metadata — methods, fields, constants. Replaced "PermGen" in Java 8.

Grows dynamically. Most apps don't need to tune it.

### Code cache
JIT-compiled native code lives here.

### Direct memory
Off-heap memory used by NIO, native libraries. Managed via `ByteBuffer.allocateDirect`.

### Sizing the heap
```bash
java -Xms512m -Xmx2g -jar app.jar
```
- `-Xms` — initial heap.
- `-Xmx` — maximum heap.

Defaults are conservative (often 256MB-1GB depending on system memory). Production apps set explicitly.

Set Xms = Xmx for predictable behavior (no heap resizing during runtime).

### Container awareness
Modern JVMs respect container memory limits (cgroups). Don't set `-Xmx` higher than your container limit minus overhead (off-heap, metaspace, stacks).

Rule of thumb: `-Xmx` ≈ 75% of container memory.

In Kubernetes, declarative settings:
```yaml
resources:
  requests:
    memory: 1Gi
  limits:
    memory: 2Gi
```

Then `java -XX:MaxRAMPercentage=75 -jar app.jar` — JVM auto-sizes heap to 75% of cgroup limit.

---

## 3. Garbage Collection

The JVM tracks all objects; when they become unreachable, GC reclaims their memory.

### Generational GC
Most objects "die young" — created, used briefly, discarded. Generational GC separates young and old:
- Minor GC: fast, frequent, in the young generation.
- Major GC: slower, less frequent, in the old generation.

### GC algorithms in 2026

**G1 (Garbage First)** — default since Java 9.
- Divides heap into regions.
- Mostly concurrent — minimal stop-the-world.
- Predictable pause times.
- Good for most apps.

**ZGC** — production-ready since Java 15.
- Sub-millisecond pauses.
- Scales to TB-sized heaps.
- Best for low-latency apps.
- Enable: `-XX:+UseZGC`

**Shenandoah** — similar to ZGC.
- Concurrent compaction.
- Low pause times.
- Enable: `-XX:+UseShenandoahGC`

**Parallel GC** — older, throughput-focused.
- Higher throughput, longer pauses.
- Enable: `-XX:+UseParallelGC`

**Serial GC** — single-threaded.
- For small heaps, embedded environments.

### Choosing
- **Default (G1)** — fine for most apps.
- **ZGC** — when you need consistent low latency (financial, gaming, real-time).
- **Parallel** — for batch jobs / throughput-focused workloads.

### GC logging
```bash
java -Xlog:gc*:file=gc.log:time,uptime:filecount=10,filesize=10M -jar app.jar
```

Logs every GC event with timestamps. Analyze with **GCViewer** or **GCeasy.io**.

### GC tuning is rarely the answer
99% of perf issues are application code, not GC. Don't touch GC settings without measurement evidence.

When to look at GC:
- Long pauses correlate with throughput drops.
- Heap growing despite expectations (memory leak).
- OOM despite reasonable workload.

### `-XX:+HeapDumpOnOutOfMemoryError`
Always enable in production:
```bash
java -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/dumps -jar app.jar
```

When the JVM hits OOM, it dumps the heap to a file. Analyze with **Eclipse MAT** or **VisualVM** to find the leak.

---

## 4. JIT Compilation

When a method runs frequently, the JVM compiles it to native code for speed.

### Tiered compilation
1. Interpreter — runs bytecode directly. Slow but immediate.
2. C1 (client compiler) — quick compilation, modest optimization.
3. C2 (server compiler) — slow compilation, aggressive optimization.

Methods escalate through tiers as they're called more often.

### Hot methods
Methods called > some threshold (10,000 by default for C2). Hot methods get inlined, loop-unrolled, vectorized, etc.

### Warmup
A freshly-started JVM hasn't JIT-compiled anything. Cold performance is slow; performance improves as the JIT kicks in.

Implications:
- Benchmarks need warmup.
- Serverless cold starts are slow (no JIT warmup).
- GraalVM native image (next section) compiles ahead of time, skipping JIT.

### Inlining
The JIT inlines small methods directly into callers, eliminating the call overhead. This enables further optimizations.

Methods marked `@HotSpotIntrinsicCandidate` (or its modern equivalent) are inlined as intrinsics — direct CPU instructions.

### What this means for code
- Write idiomatic code — the JIT optimizes patterns it recognizes.
- Don't manually optimize (loop unrolling, etc.) — the JIT does it better.
- Hot paths get optimized; cold paths don't matter.
- Excessive object allocation in hot paths can hurt (more GC).

### Inspecting JIT decisions
```bash
java -XX:+PrintCompilation -jar app.jar
```

Shows what gets compiled and when. Mostly for debugging weird perf cliffs.

For deeper analysis: **JITWatch** tool.

---

## 5. Profiling Tools

### Built-in
**JFR (Java Flight Recorder)** + **JMC (Java Mission Control)** — production-grade profilers built into the JDK.

```bash
# Start with JFR enabled
java -XX:StartFlightRecording=duration=60s,filename=app.jfr -jar app.jar

# Or attach to a running process
jcmd <pid> JFR.start duration=60s filename=app.jfr
```

Open the `.jfr` file in JMC (separate download) for CPU, memory, lock, GC analysis.

**Low overhead** (typically <2%). Safe to run in production.

### `jcmd` — JVM commands
```bash
jcmd <pid> Thread.print              # thread dump
jcmd <pid> GC.heap_info               # heap info
jcmd <pid> VM.system_properties       # config
jcmd <pid> JFR.start ...               # profiling
jcmd <pid> GC.run                       # force GC (debugging only)
```

### `jps` — list Java processes
```bash
jps -l
# 12345 com.example.MyApplication
```

### `jstack` — thread dumps
```bash
jstack <pid>
```

Shows all threads and what they're doing. Critical for diagnosing hangs and deadlocks.

### `jstat` — JVM statistics
```bash
jstat -gc <pid> 1000      # GC stats every 1 second
```

### Async-profiler
Free, low-overhead CPU/memory profiler. Generates flame graphs.
```bash
./profiler.sh -d 30 -f flame.html <pid>
```

### VisualVM
Free GUI tool. CPU profiling, heap dump analysis, GC monitoring. Lower-quality than commercial alternatives but free.

### Commercial profilers
- **JProfiler** — full-featured, paid.
- **YourKit** — popular alternative.

### APM tools (production)
- **Datadog APM**, **New Relic**, **AppDynamics**, **Dynatrace** — production traces, performance metrics, slow query detection.
- **OpenTelemetry** — open standard for tracing/metrics; vendor-agnostic.

For day-to-day perf work, an APM is more valuable than a profiler.

---

## 6. Common Performance Issues

### Excessive object allocation
Allocating millions of short-lived objects in a hot path puts pressure on the young generation GC.

Symptoms: frequent minor GCs, high allocation rate (visible in JFR).

Fixes:
- Reuse objects where safe.
- Use primitives over boxed types in hot loops.
- Use `StringBuilder` instead of `+` for string concatenation in loops.

### Boxing / unboxing
```java
Long sum = 0L;          // Long, not long!
for (long i = 0; i < 1_000_000; i++) sum += i;   // each iteration creates a new Long
```

Use primitives. Fix:
```java
long sum = 0L;
for (long i = 0; i < 1_000_000; i++) sum += i;
```

### Logging overhead
```java
log.info("user " + user + " did " + action);   // string concat happens even if INFO disabled
```

Fix with parameterized logging:
```java
log.info("user {} did {}", user, action);   // only formats if INFO enabled
```

### N+1 database queries
Covered in `10_databases.md`. Easy to introduce, kills throughput.

### Synchronization contention
Many threads contending for the same lock → serialization, low throughput.

Fixes:
- Reduce lock scope.
- Use lock-free data structures (`ConcurrentHashMap`, atomics).
- Partition data so threads work on disjoint sets.

### Blocking I/O on critical threads
In a pre-virtual-threads world, blocking I/O on a small thread pool would starve. With virtual threads, this is largely solved.

### Reflection in hot paths
Reflection is slow. Cache `Method` / `Field` references; better yet, avoid reflection in performance-critical code.

### Regex compilation
```java
public boolean isValid(String input) {
    return input.matches("[a-z]+");      // compiles regex each call
}
```

Fix:
```java
private static final Pattern PATTERN = Pattern.compile("[a-z]+");

public boolean isValid(String input) {
    return PATTERN.matcher(input).matches();
}
```

### `String.split` with regex
```java
"a,b,c".split(",");    // ',' is a regex
```

For single-char delimiters, this is OK (HotSpot has a fast path). For complex patterns, compile once.

### Inefficient collection iteration
- Iterating `LinkedList` by index — O(n²).
- `contains` on `List` — O(n); use `Set` for membership tests.
- Forgetting `for (Map.Entry e : map.entrySet())` and using `keySet` + `get`.

### Memory leaks
- Static collections that grow forever.
- ThreadLocals not cleared.
- Listeners not unregistered.
- Caches without eviction.

Symptoms: heap grows over time, eventually OOM. Use heap dump + MAT to find the dominator tree.

### Class loading issues
- Loading many classes at startup → slow startup.
- Dynamic class generation (e.g., dynamic proxies) → metaspace pressure.

---

## 7. GraalVM and Native Image

GraalVM is a high-performance JDK with two key features:
1. **Graal compiler** — alternative JIT, sometimes faster than HotSpot's C2.
2. **Native Image** — AOT compilation to a native executable.

### Native Image
Compiles Java to a standalone binary that runs without a JVM.

Benefits:
- **Fast startup** (~tens of ms vs seconds for JVM).
- **Low memory** (~50MB vs hundreds of MB).
- **No JIT warmup**.

Trade-offs:
- **Long build time** (minutes vs seconds).
- **No runtime reflection** without config.
- **No dynamic class loading**.
- **Lower peak throughput** than warmed-up JVM in long-running processes.

### Building a native image
With Spring Boot 3+:
```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
</plugin>
```

```bash
mvn -Pnative native:compile
./target/my-app    # native binary
```

Requires GraalVM JDK (download via SDKMAN!):
```bash
sdk install java 21.0.5-graal
sdk use java 21.0.5-graal
```

### When native image makes sense
- **Serverless** (Lambda, Cloud Run) — fast cold start matters most.
- **CLI tools** — start instantly.
- **Containers in K8s with rapid scaling**.

### When traditional JVM is better
- Long-running services (peak throughput matters more than startup).
- Heavy reflection / dynamic code (Spring, Hibernate work but need config).
- Builds need to be fast (native image takes minutes).

### Spring AOT
Spring Boot 3 has ahead-of-time processing — generates code at build time to reduce reflection at runtime. Makes Spring native-image-friendly.

### Quarkus and Micronaut
These frameworks were designed for native image from the start. Faster builds, better support than retrofitted Spring.

### Reality in 2026
Spring Boot's native support is solid; many production services use it. Build times have improved (~30s-2min for typical apps). For new serverless services, native is often the default.

For traditional services that run for hours/days, classic JVM with virtual threads is still excellent.

---

## 8. Tuning Tips

### Defaults are good
Modern JVMs are well-tuned. Most apps don't need `-XX:` flags. Start with:
```bash
java -Xmx2g -jar app.jar
```

That's often all you need.

### Common useful flags

```bash
# Heap size
-Xmx2g -Xms2g

# Or auto-size from container
-XX:MaxRAMPercentage=75

# GC
-XX:+UseZGC               # for low latency
-XX:+UseG1GC               # default, but explicit

# Diagnostics
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/tmp/heap.hprof
-Xlog:gc*:file=gc.log:time:filecount=5,filesize=10M

# JFR continuous recording
-XX:StartFlightRecording=disk=true,maxage=1h,filename=jfr.jfr

# Skip class verification (only for trusted code, faster startup)
-Xverify:none

# Initial CPU usage hint
-XX:ActiveProcessorCount=4
```

### Heap dump on OOM
Always enable in production. The first sign of a problem is OOM; the heap dump is your only insight after.

### Container memory
Set `-XX:MaxRAMPercentage` instead of hard-coded `-Xmx`. Adapts when container limits change.

### Don't disable JIT for testing
Tests run with full JIT — that's the production behavior. Don't disable JIT to "see what your code looks like" — your code is what's compiled, not what runs.

### Pre-loading hot paths
The JIT needs warmup. For latency-critical code:
- Run warmup queries at startup.
- Or use native image (no warmup needed).

### Class data sharing (CDS)
Reduces startup time:
```bash
# Generate CDS archive
java -XX:ArchiveClassesAtExit=app-cds.jsa -jar app.jar

# Use it
java -XX:SharedArchiveFile=app-cds.jsa -jar app.jar
```

Saves 100-500ms on Spring Boot startup.

### App CDS / AOT (Java 21+)
Even better: **Project Leyden** and ongoing AOT work. Watch this space.

### Logging-level filter
Use SLF4J's parameterized logging:
```java
if (log.isDebugEnabled()) {
    log.debug("complex: " + computeExpensive());
}
```

Or just:
```java
log.debug("complex: {}", computeExpensive());   // still computes!
```

Move expensive computation behind the guard.

---

## 9. Benchmarking with JMH

Microbenchmarking is **hard**. Naive benchmarks lie due to JIT warmup, dead-code elimination, GC.

JMH (Java Microbenchmark Harness) handles this:

```xml
<dependency>
    <groupId>org.openjdk.jmh</groupId>
    <artifactId>jmh-core</artifactId>
    <version>1.37</version>
</dependency>
<dependency>
    <groupId>org.openjdk.jmh</groupId>
    <artifactId>jmh-generator-annprocess</artifactId>
    <version>1.37</version>
    <scope>provided</scope>
</dependency>
```

```java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@Fork(value = 1, warmups = 1)
@Warmup(iterations = 3)
@Measurement(iterations = 5)
public class StringBenchmark {
    
    private String input;
    
    @Setup
    public void setUp() {
        input = "hello world".repeat(100);
    }
    
    @Benchmark
    public int viaLength() {
        return input.length();
    }
    
    @Benchmark
    public boolean viaIsEmpty() {
        return input.isEmpty();
    }
    
    public static void main(String[] args) throws Exception {
        org.openjdk.jmh.Main.main(args);
    }
}
```

Run:
```bash
mvn package
java -jar target/benchmarks.jar
```

Output gives per-method timings with confidence intervals.

### Common JMH mistakes (which JMH helps avoid)
- **Dead code elimination** — JIT removes work whose result isn't used. Use `Blackhole`:
  ```java
  @Benchmark
  public void test(Blackhole bh) {
      bh.consume(compute());
  }
  ```
- **Constant folding** — JIT computes things at compile time. Use `@State` fields, not literals.
- **No warmup** — runs include cold start. JMH does warmup automatically.

### When to benchmark
- Comparing two implementations of the same operation.
- Validating a perf hypothesis.

When NOT:
- "Is this faster than that" without context. The answer is "it depends."
- Optimizing without a measured problem.

---

## 10. What to Care About in Practice

For most application developers, perf concerns reduce to:

### 1. Don't waste time prematurely optimizing
"Make it work, make it right, make it fast" — in that order. Profile before optimizing.

### 2. Focus on the right level
- **Algorithm**: O(n²) → O(n log n) usually beats any micro-optimization.
- **I/O**: a single batched query beats 1000 single queries.
- **Caching**: 10x speedup is common.
- **Concurrency**: virtual threads now make this almost free.

### 3. Measure with realistic data
- Use representative data sizes.
- Use realistic concurrency.
- Run in an environment close to production.

### 4. Watch the JVM at runtime
- Heap usage trend.
- GC pause duration and frequency.
- Thread count.
- Connection pool saturation.

### 5. Set up production observability
- APM (Datadog, New Relic, Honeycomb).
- Metrics (Micrometer + Prometheus + Grafana).
- Tracing (OpenTelemetry).
- Logging (with correlation IDs).

### 6. Don't worry about
- Object header sizes.
- Method call overhead (JIT inlines).
- `ArrayList` vs `LinkedList` (just use ArrayList).
- Whether `int` vs `Integer` matters (only in hot loops).
- "Is `for (var x : list)` faster than indexed `for`" (no).

These rarely matter compared to the things in section 4.

### 7. When you do hit a perf wall
1. Reproduce in a benchmark or staging environment.
2. Profile (JFR + JMC, or async-profiler).
3. Find the bottleneck.
4. Fix the actual problem.
5. Verify with the same benchmark.

Without steps 1–3, you're guessing.

---

That's the JVM. Modern Java is fast — millions of requests/second for a well-written service is normal. Most performance problems are application code (allocations, locks, I/O), not the JVM itself.

Next, the final file — `15_modern_features_and_advanced.md`.
