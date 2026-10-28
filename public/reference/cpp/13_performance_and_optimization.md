# 13. Performance and Optimization

C++ exists because performance matters. If performance didn't matter, you'd be using a higher-level language with garbage collection, runtime checks, and a friendly debugger. You picked C++ — or were stuck with it — because you need control over memory layout, allocation, and the instructions the CPU actually runs.

But "C++ is fast" is misleading. Naive C++ can be slower than well-written Python (because Python's hot paths call into C). Fast C++ requires knowing how the hardware works: caches, branches, allocations, and what the compiler can and cannot optimize.

This file covers the mental model — what makes code fast or slow on modern hardware — and the practical tools to measure and improve performance.

---

## Table of Contents

1. [The Golden Rule: Measure First](#the-golden-rule-measure-first)
2. [Mental Model: What the CPU Actually Does](#mental-model-what-the-cpu-actually-does)
3. [Cache Locality](#cache-locality)
4. [Allocations Are Expensive](#allocations-are-expensive)
5. [Branch Prediction](#branch-prediction)
6. [Compiler Optimizations](#compiler-optimizations)
7. [Profiling Tools](#profiling-tools)
8. [Benchmarking with Google Benchmark](#benchmarking-with-google-benchmark)
9. [Common Optimization Patterns](#common-optimization-patterns)
10. [When to Stop Optimizing](#when-to-stop-optimizing)

---

## The Golden Rule: Measure First

Don't optimize what you haven't measured. Programmers — even experienced ones — are wrong about where the bottleneck is roughly 90% of the time. The function you "know" is slow is rarely the slow one.

The workflow is:

1. **Make it work** — write the obvious, clear code.
2. **Make it correct** — fix the bugs, handle the edge cases.
3. **Measure** — profile a realistic workload.
4. **Make it fast** — optimize only the hot spots the profiler identifies.

Donald Knuth's famous quote: *"Premature optimization is the root of all evil"* is often misquoted. The full version: *"We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%."*

The 3% matters in C++. The trick is knowing which 3%.

---

## Mental Model: What the CPU Actually Does

To write fast C++, you need a rough mental model of the hardware. The naive model — "CPU reads instructions one at a time and executes them" — has been wrong since the 1990s.

A modern CPU (intel, AMD, ARM) does this:

- **Multiple instructions per cycle**: Pipelined and superscalar — several instructions execute simultaneously.
- **Out-of-order execution**: The CPU reorders instructions to keep all execution units busy.
- **Speculative execution**: The CPU guesses which way a branch will go and runs instructions ahead.
- **Caching**: RAM is slow. CPUs have L1 (fastest, ~32 KB), L2 (~256 KB), L3 (~few MB) caches. L1 access is ~1 ns; main RAM is ~100 ns. That's a 100x difference.
- **SIMD**: Single Instruction, Multiple Data. One instruction can process 4, 8, 16 values at once.

The implication: **the bottleneck in most modern programs is memory access, not computation.** A multiply is 1 cycle. A cache miss is 100+ cycles. If your code makes the CPU wait for RAM, you've lost.

This changes how you think about "fast code":

- **Tight loops on contiguous data** (cache-friendly) beat clever algorithms on scattered data.
- **`std::vector` is almost always faster than `std::list`** even for "insert in the middle" use cases, because pointers chasing memory is brutal on caches.
- **Small data fits in L1**. If your hot working set is < 32 KB, you're golden.

---

## Cache Locality

Cache locality means: when you access memory, also access memory nearby (spatial locality), and re-use the same memory soon (temporal locality).

### Spatial locality example

```cpp
// FAST: contiguous memory, cache-friendly
std::vector<int> v(1'000'000);
long long sum = 0;
for (int x : v) sum += x;
// Iterates contiguous memory. Each cache line (typically 64 bytes)
// loaded once gives you 16 ints "for free."

// SLOW: pointer-chasing
std::list<int> l;
// ... fill it ...
long long sum2 = 0;
for (int x : l) sum2 += x;
// Each node is allocated separately. Following the next pointer
// is likely a cache miss every time. 10-50x slower than the vector.
```

This is why "use `std::vector` by default" is genuine advice, not a stylistic preference. Even when the textbook says "use a linked list because insertion is O(1)," the constant factor on a vector is so much smaller that the vector wins until N is large.

### Array of structures vs structure of arrays

```cpp
// AoS: Array of Structures — intuitive but not always cache-friendly
struct Particle {
    float x, y, z;        // position
    float vx, vy, vz;     // velocity
    float mass;
    int color;
    // ... many fields ...
};
std::vector<Particle> particles;

// If you only need to update positions from velocities, you load
// the WHOLE struct (including mass, color) into cache. Wasteful.

// SoA: Structure of Arrays — cache-friendly for hot loops
struct Particles {
    std::vector<float> x, y, z;
    std::vector<float> vx, vy, vz;
    std::vector<float> mass;
    std::vector<int> color;
};

// Updating positions touches only x, y, z, vx, vy, vz arrays.
// Cache lines are full of relevant data.
```

Game engines and physics simulations use SoA for hot data. Most application code uses AoS because it's clearer. Pick based on whether the data is in a hot loop.

### Row-major vs column-major

```cpp
// 2D array stored row-major (C++ default)
constexpr int N = 1000;
int arr[N][N];

// FAST: row-major access matches memory layout
for (int i = 0; i < N; ++i)
    for (int j = 0; j < N; ++j)
        arr[i][j] = i + j;

// SLOW: column-major access — each access jumps N ints
for (int j = 0; j < N; ++j)
    for (int i = 0; i < N; ++i)
        arr[i][j] = i + j;
```

The second loop can be 10x slower for large N due to cache misses. The compiler can sometimes detect this and reorder, but don't count on it — write the loop in the order matching memory layout.

---

## Allocations Are Expensive

`new`, `malloc`, and any heap allocation involve:

- Finding a free block of the right size (search/bookkeeping).
- Possibly a system call if the heap needs to grow.
- A cache miss on the freshly returned memory.
- Eventually, a `delete`/`free` with more bookkeeping.

A single allocation might cost 50-500 ns. In a tight loop, that adds up fast.

### Avoid allocations in hot paths

```cpp
// SLOW: allocates a new vector every iteration
for (int i = 0; i < 1'000'000; ++i) {
    std::vector<int> temp;
    for (int j = 0; j < 10; ++j) temp.push_back(j);
    process(temp);
}

// FAST: reuse the same vector
std::vector<int> temp;
temp.reserve(10);
for (int i = 0; i < 1'000'000; ++i) {
    temp.clear();  // doesn't deallocate; just sets size to 0
    for (int j = 0; j < 10; ++j) temp.push_back(j);
    process(temp);
}
```

`reserve` ahead of time eliminates the geometric resizing of `push_back`. `clear` keeps the allocated capacity.

### String concatenation

```cpp
// SLOW: each += may allocate
std::string result;
for (const auto& s : strings) {
    result += s;
}

// FASTER: reserve once
std::string result;
size_t total = 0;
for (const auto& s : strings) total += s.size();
result.reserve(total);
for (const auto& s : strings) result += s;
```

### Custom allocators and arenas

For high-performance code (game engines, trading systems), people use arena allocators or memory pools:

```cpp
// Arena: allocate a big chunk, hand out small pieces, free everything at once
class Arena {
    std::vector<char> buffer;
    size_t offset = 0;
public:
    Arena(size_t size) : buffer(size) {}
    
    void* allocate(size_t bytes, size_t align = alignof(std::max_align_t)) {
        // bump pointer, align, return
        offset = (offset + align - 1) & ~(align - 1);
        if (offset + bytes > buffer.size()) throw std::bad_alloc{};
        void* p = buffer.data() + offset;
        offset += bytes;
        return p;
    }
    
    void reset() { offset = 0; }  // free all at once
};
```

This is dramatically faster than `new`/`delete` for short-lived objects (per-frame allocations in a game, per-request allocations in a server). C++17 added `std::pmr` (polymorphic memory resources) to make custom allocators less painful — but they're still painful.

### Small Buffer Optimization (SBO)

`std::string` (in major implementations) has a small buffer inside the object itself for strings up to ~15-22 characters. No heap allocation for small strings. `std::function` and some other types do similar.

This is why short `std::string` is essentially free. Don't avoid it for trivial use cases.

---

## Branch Prediction

The CPU guesses the outcome of `if` statements before knowing the answer. If it guesses right, no cost. If it guesses wrong, ~10-20 cycles wasted flushing the pipeline.

For most code, this doesn't matter. For tight inner loops, it does.

### Predictable branches are free

```cpp
// Branch is almost always taken (or almost never)
// CPU predicts it correctly, no penalty
for (int i = 0; i < n; ++i) {
    if (i < n) { /* always true */ ... }
}
```

### Random branches hurt

```cpp
// Sum positive numbers
std::vector<int> v(1'000'000);
// fill with random values

// If values are random (50/50 positive/negative), branch predictor
// guesses wrong half the time
long long sum = 0;
for (int x : v) {
    if (x > 0) sum += x;
}

// FASTER: branchless. The compiler can also do this automatically
// for simple cases.
long long sum = 0;
for (int x : v) {
    sum += (x > 0) * x;  // multiply by 0 or 1, no branch
}
```

### Sorted data is faster

A famous Stack Overflow question: why is sorting an array first, then iterating, faster than iterating the unsorted array? Because branches become predictable.

```cpp
std::vector<int> v(1'000'000);  // random values

// 1. Sort first
std::sort(v.begin(), v.end());

// 2. Now this loop has predictable branches (all negatives first, then positives)
long long sum = 0;
for (int x : v) {
    if (x > 0) sum += x;
}
// Often faster overall than skipping the sort, for large enough N.
```

Don't actually do this without measuring — the point is that branches matter.

### `[[likely]]` and `[[unlikely]]` (C++20)

You can hint the compiler:

```cpp
if (rare_error_condition) [[unlikely]] {
    handle_error();
}
```

In practice, modern compilers and CPUs are good enough that these hints rarely move the needle. Profile-guided optimization (PGO) does better.

---

## Compiler Optimizations

Compilers are smart. Modern GCC, Clang, and MSVC perform aggressive optimizations: inlining, dead code elimination, loop unrolling, vectorization (SIMD), constant folding, common subexpression elimination, and many more.

### Optimization flags

```bash
g++ -O0 ...   # No optimization. Default. Easy to debug.
g++ -O1 ...   # Basic optimizations.
g++ -O2 ...   # Standard release build. Most optimizations.
g++ -O3 ...   # Aggressive: more inlining, vectorization. May increase binary size.
g++ -Os ...   # Optimize for size.
g++ -Ofast ...# -O3 + unsafe math optimizations (breaks IEEE 754 strictness).
```

**Important**: Never benchmark `-O0` builds and conclude anything about C++ performance. Always benchmark `-O2` or `-O3` builds.

A 10-100x speedup from `-O0` to `-O2` is normal. People who say "C++ is slow" sometimes never enabled optimizations.

### Link-Time Optimization (LTO)

```bash
g++ -O2 -flto ...
```

Lets the compiler optimize across translation units (cpp files). Can inline functions across files, eliminate dead code globally. Adds compile time but often gives a few percent speedup.

### Profile-Guided Optimization (PGO)

1. Compile with `-fprofile-generate`.
2. Run the program on a realistic workload — it records branch outcomes.
3. Recompile with `-fprofile-use`.

The compiler now knows which branches are hot/cold, which functions are called often, and lays out code accordingly. Often 5-15% speedup. Used in production by browsers, databases, compilers themselves.

### What the compiler can and cannot do

Compilers can:
- Inline small functions.
- Unroll fixed-iteration loops.
- Vectorize simple loops with SIMD.
- Constant-fold (`int x = 2 + 3` becomes `int x = 5` at compile time).
- Eliminate `if (false)` branches.
- Remove unused variables.

Compilers cannot:
- Change your data structures.
- Make `std::list` cache-friendly.
- Skip work you don't need to do.
- Optimize across virtual function calls (usually).
- Always vectorize complex loops.

**The biggest wins almost always come from algorithmic changes and data layout, not micro-optimizations.**

---

## Profiling Tools

You can't optimize what you can't measure. The standard tools:

### Linux: `perf`

```bash
# Compile with debug symbols even in release: -O2 -g
g++ -O2 -g main.cpp -o app

# Record a profile
perf record ./app

# View the report
perf report
```

`perf` samples the program counter many times per second and tells you which functions consume the most CPU. The first time you use it, you'll discover your "fast" function isn't the bottleneck — it's some innocuous helper called millions of times.

### macOS: Instruments

Bundled with Xcode. The "Time Profiler" template gives you a flame graph of where time is spent.

### Windows: Visual Studio Profiler

In VS, Debug → Performance Profiler. Multiple analysis modes (CPU usage, memory, etc.).

### Cross-platform: `gprof`, `callgrind`

`gprof` is older and easier to set up but less accurate. `callgrind` (part of Valgrind) is precise but slow (the program runs ~50x slower under it).

```bash
# gprof
g++ -O2 -pg main.cpp -o app
./app
gprof ./app gmon.out > report.txt

# callgrind
valgrind --tool=callgrind ./app
kcachegrind callgrind.out.<pid>
```

### Flame graphs

A visualization technique by Brendan Gregg. Stack-sampled profiling rendered as a flame graph makes hot paths instantly obvious. Use `perf` + the `FlameGraph` scripts.

### What to look for

- **Hot functions**: where the program spends the most time.
- **Cache misses**: `perf stat -e cache-misses ./app` shows total cache misses.
- **Branch mispredictions**: `perf stat -e branch-misses`.
- **Memory allocations**: tools like `heaptrack`, `tcmalloc`'s profiler, or jemalloc's profiler.

---

## Benchmarking with Google Benchmark

For micro-benchmarks (single function), use Google Benchmark. Don't roll your own with `std::chrono` and a `for` loop — the compiler will optimize away code that has no observable side effect.

### Install and use

```bash
# vcpkg
vcpkg install benchmark
```

```cpp
#include <benchmark/benchmark.h>
#include <vector>

static void BM_VectorPushBack(benchmark::State& state) {
    for (auto _ : state) {
        std::vector<int> v;
        for (int i = 0; i < state.range(0); ++i)
            v.push_back(i);
        benchmark::DoNotOptimize(v);  // prevent compiler from optimizing away
    }
}
BENCHMARK(BM_VectorPushBack)->Range(8, 8 << 10);

static void BM_VectorReserveThenPushBack(benchmark::State& state) {
    for (auto _ : state) {
        std::vector<int> v;
        v.reserve(state.range(0));
        for (int i = 0; i < state.range(0); ++i)
            v.push_back(i);
        benchmark::DoNotOptimize(v);
    }
}
BENCHMARK(BM_VectorReserveThenPushBack)->Range(8, 8 << 10);

BENCHMARK_MAIN();
```

Compile and run:

```bash
g++ -O2 -std=c++20 bench.cpp -lbenchmark -lpthread -o bench
./bench
```

Output shows nanoseconds per iteration. You can compare runs, see standard deviation, and check that you actually improved things.

### Key API

- `benchmark::DoNotOptimize(x)` — tells the compiler "x is observed, don't optimize it away."
- `benchmark::ClobberMemory()` — pretends all memory was written, forces flushes.
- `state.range(0)` — parametrized benchmarks.
- `->Threads(4)` — benchmark multi-threaded code.

### Online: quick-bench.com

For quick comparisons without setting up a project, paste code into [quick-bench.com](https://quick-bench.com). Runs Google Benchmark on a server, shows results instantly. Great for "is A or B faster?" arguments.

### `std::chrono` for ad-hoc timing

For coarse timing (not micro-benchmarks), `std::chrono::steady_clock` is fine:

```cpp
#include <chrono>

auto start = std::chrono::steady_clock::now();
do_work();
auto end = std::chrono::steady_clock::now();
auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
std::cout << "Took " << ms << " ms\n";
```

---

## Common Optimization Patterns

### Pass by const reference (avoid copies)

```cpp
// SLOW: copies the whole string
void process(std::string s);

// FAST: no copy
void process(const std::string& s);

// FAST and flexible: takes std::string, const char*, std::string_view
void process(std::string_view s);
```

For small types (`int`, pointers), pass by value. For anything bigger, by const ref or string_view.

### Move semantics

```cpp
std::vector<int> make_vector() {
    std::vector<int> v(1'000'000);
    // ...
    return v;  // moves (or NRVO'd to no copy at all)
}

auto v = make_vector();  // no copy
```

Compilers apply RVO/NRVO (Return Value Optimization) automatically in most cases. Don't write `return std::move(v)` — it often *prevents* NRVO.

### Reserve before pushing

```cpp
std::vector<int> v;
v.reserve(n);  // one allocation
for (int i = 0; i < n; ++i) v.push_back(i);
// vs no reserve: log(n) reallocations, each copying everything
```

### `emplace_back` over `push_back` for construction

```cpp
std::vector<std::pair<int, std::string>> v;

v.push_back({1, "hello"});      // constructs pair, then moves
v.emplace_back(1, "hello");     // constructs pair in place
```

Real-world difference is usually tiny (move is cheap), but emplace is the idiom for in-place construction.

### Prefer `std::array` and stack allocation when size is known

```cpp
// Heap allocation, lifetime overhead
auto* arr = new int[100];
// ... use arr ...
delete[] arr;

// Stack allocation, free, automatic cleanup
std::array<int, 100> arr;
```

If the size is known at compile time and the data is reasonably small (< few KB), stack-allocate it.

### Avoid `shared_ptr` if `unique_ptr` works

`shared_ptr` has overhead: atomic reference count, larger pointer (control block), thread-safe increments/decrements. `unique_ptr` is essentially free.

### Avoid virtual functions in hot loops

Virtual calls can't be inlined (usually) and require a vtable lookup. Fine in setup/control code; expensive in inner loops.

Strategies:
- Use templates for compile-time polymorphism (CRTP, concepts).
- `std::variant` for closed sets of types.
- Just don't use virtual where you don't need to.

### Compile-time computation with `constexpr`

```cpp
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

constexpr int x = factorial(10);  // computed at compile time, free at runtime
```

Move work from runtime to compile time when possible.

---

## When to Stop Optimizing

The signs you're done optimizing:

- **The profile shows time spread across many small functions** — no single hot spot dominates. Further optimization requires algorithmic or architectural changes.
- **You've hit the speed of light** — you're at memory bandwidth limit, or CPU limit, and the only way faster is a better algorithm or hardware.
- **Further changes hurt readability without measurable gain** — every 1% takes a day. Stop.
- **The remaining cost is unavoidable** — disk I/O, network, user interaction.

The opposite trap: optimizing infinitely on code nobody runs. If a function takes 1 ms but is called once per hour, who cares?

### Rough budget for "real-time" requirements

| Use case | Target |
|---|---|
| 60 FPS game | 16 ms per frame |
| 120 FPS game | 8 ms per frame |
| Server response (low-latency) | < 1 ms |
| HFT trading | < 10 μs |
| Interactive UI | < 100 ms perceived response |
| Batch processing | minutes/hours acceptable |

Know your target. "Faster" without a target is unbounded effort for unbounded reward.

---

## Key principles

- **Measure first, always.** Profile before optimizing. Your intuition about hotspots is wrong.
- **Memory access dominates.** Cache locality, allocation patterns, and data layout matter more than instruction count.
- **`std::vector` is fast.** Default to contiguous, cache-friendly containers.
- **Allocations are expensive.** Reserve, reuse, pool.
- **Modern compilers are smart.** Compile with `-O2`/`-O3`. LTO and PGO give free wins.
- **Algorithmic improvements beat micro-optimizations.** Better algorithm > clever code.
- **Branch prediction matters in tight loops.** Predictable branches are free; random ones cost cycles.
- **Stop when you hit diminishing returns.** Hit your target, then leave it alone.

Next: testing and tooling — sanitizers, static analysis, and the ecosystem of tools that catch bugs C++ otherwise lets through.
