# 07. STL Algorithms and Ranges

> `<algorithm>`, lambdas, iterators, and C++20 ranges. Stop writing manual loops; the STL has the algorithm you need.

---

## Table of Contents

1. [The Algorithm Header](#1-the-algorithm-header)
2. [Lambdas](#2-lambdas)
3. [Iterators](#3-iterators)
4. [Core Algorithms](#4-core-algorithms)
5. [Searching and Counting](#5-searching-and-counting)
6. [Modifying Algorithms](#6-modifying-algorithms)
7. [Sorting](#7-sorting)
8. [Numeric Algorithms](#8-numeric-algorithms)
9. [C++20 Ranges](#9-c20-ranges)
10. [Common Patterns](#10-common-patterns)

---

## 1. The Algorithm Header

`<algorithm>` and `<numeric>` provide ~100 algorithms. Most take iterator ranges (begin, end) and optionally a predicate or transformation.

```cpp
#include <algorithm>
#include <vector>
#include <iostream>

std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5};

// Sort
std::sort(v.begin(), v.end());

// Find
auto it = std::find(v.begin(), v.end(), 5);
if (it != v.end()) std::cout << "found at index " << (it - v.begin());

// Count
auto n = std::count(v.begin(), v.end(), 5);

// Sum (in <numeric>)
auto sum = std::accumulate(v.begin(), v.end(), 0);
```

The pattern: `algorithm(first, last, ...)`.

C++20 ranges (section 9) provide a cleaner syntax: `std::ranges::sort(v)`.

---

## 2. Lambdas

Anonymous functions. Used heavily with STL algorithms.

```cpp
auto add = [](int a, int b) { return a + b; };
add(2, 3);   // 5
```

### Syntax
```cpp
[captures](parameters) -> return_type { body }
```

- `[captures]` — variables from the enclosing scope to capture.
- `(parameters)` — like a regular function.
- `-> return_type` — optional; usually inferred.

### Captures
```cpp
int x = 10;

[]              // capture nothing
[=]             // capture all by value (don't use; obscure)
[&]             // capture all by reference (also avoid)
[x]             // capture x by value
[&x]            // capture x by reference
[x, &y]         // x by value, y by reference
[this]          // capture this pointer (in methods)
[*this]         // capture *this by value (C++17)
```

```cpp
int x = 10;
auto add_x = [x](int n) { return n + x; };
add_x(5);    // 15

x = 100;
add_x(5);    // still 15 — captured by value at lambda creation
```

### Mutable
```cpp
auto counter = [count = 0]() mutable { return ++count; };
counter();    // 1
counter();    // 2
counter();    // 3
```

`mutable` lets the lambda modify by-value captures. Otherwise the body's view is `const`.

### Capture initializers (C++14)
```cpp
auto lambda = [value = compute()]() { return value; };
```

Capture a computed value. Useful for moving:
```cpp
auto lambda = [ptr = std::move(unique_ptr_value)]() { ... };
```

### Generic lambdas (C++14)
`auto` in parameters:
```cpp
auto print = [](const auto& x) { std::cout << x; };
print(42);
print("hello");
print(std::vector<int>{1, 2, 3});   // assuming printable
```

C++20 lets you use template syntax explicitly:
```cpp
auto f = []<typename T>(const std::vector<T>& v) { ... };
```

### Storing lambdas
Use `auto` for the type. Or `std::function` if you need a uniform type (with overhead):
```cpp
std::function<int(int)> f = [](int x) { return x * 2; };
```

`std::function` allows storing any callable but has indirection. For algorithm callbacks, just use `auto` or pass the lambda directly.

### Lambdas vs function objects
Pre-lambda, you'd define a struct with `operator()`. Lambdas are syntactic sugar for that — the compiler generates a struct under the hood.

---

## 3. Iterators

Iterators generalize pointers. They define a position in a container and support operations like `++`, `*`, `==`.

```cpp
std::vector<int> v = {1, 2, 3};
auto it = v.begin();    // points to 1
*it;                     // 1
++it;                     // points to 2
*it;                     // 2
it == v.end();             // false
```

### Categories
- **Input iterator** — read once, single-pass.
- **Output iterator** — write only.
- **Forward iterator** — read/write, multi-pass.
- **Bidirectional iterator** — also `--`.
- **Random access iterator** — also `+ n`, `- n`, `[]`, comparisons (`<`, `>`).
- **Contiguous iterator** (C++17) — random access + memory contiguity guarantee.

`std::vector::iterator` is random access. `std::list::iterator` is bidirectional. `std::forward_list::iterator` is forward.

In practice, this matters for:
- What operations are valid.
- What algorithms accept the container.

### Common operations
```cpp
auto it = v.begin();        // first
auto end = v.end();          // one past the last
auto rit = v.rbegin();        // reverse begin (points to last)
auto rend = v.rend();          // one before first
auto cit = v.cbegin();          // const_iterator (read-only)

// Advance
++it; --it;                  // bidirectional
it += 3; it -= 2;             // random access
auto next_it = std::next(it, 3);   // generic advance
auto prev_it = std::prev(it);

// Distance
auto d = std::distance(v.begin(), it);
```

### `begin` / `end` for arrays
```cpp
int arr[5] = {1, 2, 3, 4, 5};
auto it = std::begin(arr);   // first element
auto e = std::end(arr);       // one past last
```

Free functions; work for arrays, `std::array`, `std::vector`, etc.

### Inserter iterators
For algorithms that write to a container:
```cpp
std::vector<int> src = {1, 2, 3};
std::vector<int> dst;

std::copy(src.begin(), src.end(), std::back_inserter(dst));
// dst is now {1, 2, 3}
```

`back_inserter` calls `push_back` on the container. Without it, `copy` would write to dst.begin(), which is out of range.

Also: `std::front_inserter`, `std::inserter(container, position)`.

### Don't confuse iterators with indices
- Iterators are objects, not numbers.
- `v.end()` is NOT a valid element — it's "one past the end."
- Dereferencing `v.end()` is undefined behavior.

### Iterator invalidation
Modifying a container often invalidates iterators:
- `vector::push_back` — may reallocate, invalidating all.
- `vector::erase` — invalidates from the erase point onward.
- `map::erase` — invalidates only erased iterators.

Always check the docs for the container's invalidation rules.

---

## 4. Core Algorithms

### `for_each`
```cpp
std::for_each(v.begin(), v.end(), [](int& x) { x *= 2; });
```

Equivalent to a range-for loop. Range-for is usually clearer; `for_each` is useful when you have an iterator pair (not a container).

### `transform`
Apply a function to each element, store results.
```cpp
std::vector<int> in = {1, 2, 3};
std::vector<int> out(in.size());

std::transform(in.begin(), in.end(), out.begin(),
    [](int x) { return x * x; });
// out: {1, 4, 9}
```

Or transform two ranges into one:
```cpp
std::vector<int> a = {1, 2, 3};
std::vector<int> b = {10, 20, 30};
std::vector<int> sum(a.size());

std::transform(a.begin(), a.end(), b.begin(), sum.begin(),
    [](int x, int y) { return x + y; });
// sum: {11, 22, 33}
```

### `copy`
```cpp
std::vector<int> src = {1, 2, 3};
std::vector<int> dst(src.size());
std::copy(src.begin(), src.end(), dst.begin());

// To a different size, use back_inserter
std::vector<int> dst2;
std::copy(src.begin(), src.end(), std::back_inserter(dst2));
```

### `fill` / `fill_n` / `generate`
```cpp
std::vector<int> v(10);
std::fill(v.begin(), v.end(), 42);    // all 42s

std::fill_n(v.begin(), 5, 0);          // first 5 are 0

std::generate(v.begin(), v.end(), []() {
    static int counter = 0;
    return ++counter;
});
```

---

## 5. Searching and Counting

### `find` / `find_if`
```cpp
auto it = std::find(v.begin(), v.end(), 5);
if (it != v.end()) { /* found */ }

// With predicate
auto it2 = std::find_if(v.begin(), v.end(),
    [](int x) { return x > 10; });
```

### `count` / `count_if`
```cpp
auto n = std::count(v.begin(), v.end(), 5);    // exact value
auto m = std::count_if(v.begin(), v.end(),
    [](int x) { return x % 2 == 0; });
```

### `all_of` / `any_of` / `none_of`
```cpp
bool all_positive = std::all_of(v.begin(), v.end(),
    [](int x) { return x > 0; });

bool has_negative = std::any_of(v.begin(), v.end(),
    [](int x) { return x < 0; });

bool no_zeros = std::none_of(v.begin(), v.end(),
    [](int x) { return x == 0; });
```

### `min_element` / `max_element`
```cpp
auto min_it = std::min_element(v.begin(), v.end());
int smallest = *min_it;

auto max_it = std::max_element(v.begin(), v.end(),
    [](int a, int b) { return std::abs(a) < std::abs(b); });
// max by absolute value
```

`std::minmax_element` returns both at once.

### `binary_search` (on sorted ranges)
```cpp
std::sort(v.begin(), v.end());
bool exists = std::binary_search(v.begin(), v.end(), 42);

// Find position with lower_bound / upper_bound
auto it = std::lower_bound(v.begin(), v.end(), 5);    // first element >= 5
auto it2 = std::upper_bound(v.begin(), v.end(), 5);    // first element > 5
```

`lower_bound` and `upper_bound` are O(log n) on random-access iterators. Useful for range queries on sorted data.

---

## 6. Modifying Algorithms

### `reverse`
```cpp
std::reverse(v.begin(), v.end());
```

### `rotate`
```cpp
std::rotate(v.begin(), v.begin() + 2, v.end());
// First 2 elements move to the end
```

### `remove` / `remove_if` (and the erase-remove idiom)
**Counterintuitive**: `remove` doesn't actually remove. It moves "kept" elements to the front and returns an iterator to the new logical end.

```cpp
std::vector<int> v = {1, 2, 3, 2, 4, 2, 5};
auto new_end = std::remove(v.begin(), v.end(), 2);
v.erase(new_end, v.end());    // actually remove
// v is now {1, 3, 4, 5}

// One-liner:
v.erase(std::remove(v.begin(), v.end(), 2), v.end());

// C++20 simpler:
std::erase(v, 2);
std::erase_if(v, [](int x) { return x > 10; });
```

### `unique`
Removes consecutive duplicates. Sort first to remove all duplicates:
```cpp
std::sort(v.begin(), v.end());
v.erase(std::unique(v.begin(), v.end()), v.end());
```

### `replace` / `replace_if`
```cpp
std::replace(v.begin(), v.end(), 0, -1);    // all 0s become -1
std::replace_if(v.begin(), v.end(),
    [](int x) { return x < 0; }, 0);
```

### `shuffle`
```cpp
#include <random>

std::random_device rd;
std::mt19937 gen(rd());
std::shuffle(v.begin(), v.end(), gen);
```

Don't use the old `std::random_shuffle` — removed in C++17.

### `swap`
```cpp
std::swap(a, b);          // swap two values
std::swap(v1, v2);          // swap two containers (O(1) for vectors)
```

---

## 7. Sorting

### `sort`
O(n log n). Average case quicksort, worst-case heapsort (introsort).
```cpp
std::sort(v.begin(), v.end());                    // ascending
std::sort(v.begin(), v.end(), std::greater<>());   // descending

// Custom
std::sort(v.begin(), v.end(),
    [](const User& a, const User& b) {
        return a.age < b.age;
    });
```

### `stable_sort`
Preserves relative order of equal elements. Slightly slower (O(n log² n) typically).
```cpp
std::stable_sort(users.begin(), users.end(),
    [](const User& a, const User& b) { return a.age < b.age; });
```

### `partial_sort`
Sort only the first N elements:
```cpp
std::partial_sort(v.begin(), v.begin() + 10, v.end());
// First 10 elements are sorted; rest is unspecified
```

### `nth_element`
Partition so that the nth element is in its sorted position, with smaller before and larger after.
```cpp
std::nth_element(v.begin(), v.begin() + v.size()/2, v.end());
// Median is now at v[v.size()/2]
```

O(n) on average. Faster than sorting when you only need the kth element.

### `is_sorted`
```cpp
bool sorted = std::is_sorted(v.begin(), v.end());
```

---

## 8. Numeric Algorithms

`<numeric>` header.

### `accumulate`
Sum / fold:
```cpp
#include <numeric>

int sum = std::accumulate(v.begin(), v.end(), 0);     // 0 + v[0] + v[1] + ...
int product = std::accumulate(v.begin(), v.end(), 1, std::multiplies<>());

std::string concat = std::accumulate(strings.begin(), strings.end(),
    std::string(""),
    [](const std::string& a, const std::string& b) { return a + b + " "; });
```

**Important**: the initial value's type determines the accumulator type:
```cpp
std::vector<double> v = {1.5, 2.5, 3.5};
auto sum = std::accumulate(v.begin(), v.end(), 0);    // 0 is int → result is int (7, not 7.5)
auto sum2 = std::accumulate(v.begin(), v.end(), 0.0); // 0.0 is double → result is 7.5
```

### `reduce` (C++17)
Like `accumulate` but the order isn't specified (allowing parallelism):
```cpp
auto sum = std::reduce(v.begin(), v.end());
auto sum2 = std::reduce(std::execution::par, v.begin(), v.end());   // parallel
```

For non-associative operations (where order matters), use `accumulate`.

### `inner_product`
```cpp
int dot = std::inner_product(a.begin(), a.end(), b.begin(), 0);
// dot product: 0 + a[0]*b[0] + a[1]*b[1] + ...
```

### `partial_sum`
```cpp
std::vector<int> sums(v.size());
std::partial_sum(v.begin(), v.end(), sums.begin());
// sums[i] = v[0] + v[1] + ... + v[i]
```

### `iota`
Fill with sequential values:
```cpp
std::vector<int> v(10);
std::iota(v.begin(), v.end(), 0);
// v: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
```

---

## 9. C++20 Ranges

The biggest STL change in a decade. Algorithms that work directly on ranges (no `begin`/`end` boilerplate), with composable views.

```cpp
#include <ranges>
#include <algorithm>

std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6, 5};

// Old:
std::sort(v.begin(), v.end());

// New:
std::ranges::sort(v);
```

Every algorithm has a `ranges::` version. Simpler.

### Views — lazy, composable transformations
```cpp
namespace rv = std::ranges::views;

// Old: copy-then-filter
std::vector<int> doubled_evens;
for (int x : v) {
    if (x % 2 == 0) doubled_evens.push_back(x * 2);
}

// New: pipe views
auto pipeline = v
    | rv::filter([](int x) { return x % 2 == 0; })
    | rv::transform([](int x) { return x * 2; });

for (int x : pipeline) {
    std::cout << x << " ";
}

// Or materialize
std::vector<int> result(pipeline.begin(), pipeline.end());
// C++23: std::ranges::to<std::vector>()
auto result2 = pipeline | std::ranges::to<std::vector>();
```

Views are lazy — no computation happens until iteration. Pipelines compose like function chains in functional languages.

### Common views
```cpp
rv::iota(0)                       // infinite 0, 1, 2, ...
rv::iota(0, 10)                    // 0..10
rv::filter(pred)
rv::transform(fn)
rv::take(n)                         // first n
rv::take_while(pred)
rv::drop(n)                          // skip first n
rv::drop_while(pred)
rv::reverse
rv::keys                              // for ranges of pairs
rv::values
rv::elements<I>                       // for ranges of tuples
rv::join                                // flatten one level
rv::zip(r1, r2)                        // C++23
rv::enumerate                            // C++23: (index, value) pairs
rv::chunk(n)                              // C++23
rv::stride(n)                              // C++23
```

### Examples
```cpp
// First 5 squares
auto squares = rv::iota(1)
    | rv::transform([](int x) { return x * x; })
    | rv::take(5);
// 1, 4, 9, 16, 25

// Sum of squares of evens up to 100
auto sum = std::ranges::fold_left(
    rv::iota(1, 101)
        | rv::filter([](int x) { return x % 2 == 0; })
        | rv::transform([](int x) { return x * x; }),
    0, std::plus{}
);

// Names of adults
auto names = users
    | rv::filter([](const User& u) { return u.age() >= 18; })
    | rv::transform([](const User& u) { return u.name(); });
```

### Lazy vs materialized
Views don't compute until iterated. To materialize:
```cpp
auto vec = pipeline | std::ranges::to<std::vector>();    // C++23
```

Or pre-C++23:
```cpp
std::vector<int> vec;
for (int x : pipeline) vec.push_back(x);
```

### Why this matters
- **Composability**: pipeline reads top-to-bottom.
- **Performance**: no intermediate containers (vs the imperative version).
- **Expressiveness**: very close to functional languages.

The cost: slightly slower compile times, error messages still verbose (concepts help).

---

## 10. Common Patterns

### Sum a vector
```cpp
auto sum = std::accumulate(v.begin(), v.end(), 0);
// C++20:
auto sum2 = std::ranges::fold_left(v, 0, std::plus{});
```

### Average
```cpp
double avg = v.empty() ? 0 : double(std::accumulate(v.begin(), v.end(), 0)) / v.size();
```

### Max element
```cpp
auto max_it = std::max_element(v.begin(), v.end());
int m = (max_it != v.end()) ? *max_it : INT_MIN;
```

### Sort by field
```cpp
std::ranges::sort(users, {}, &User::age);    // C++20 projection
// equivalent to:
std::sort(users.begin(), users.end(),
    [](const User& a, const User& b) { return a.age < b.age; });
```

### Top N
```cpp
std::partial_sort(v.begin(), v.begin() + 10, v.end(), std::greater<>());
// v[0..10) are the top 10
```

### Dedupe (preserving order — like Python's seen-set)
```cpp
std::set<int> seen;
v.erase(std::remove_if(v.begin(), v.end(),
    [&seen](int x) { return !seen.insert(x).second; }),
    v.end());
```

### Dedupe (ignoring order)
```cpp
std::sort(v.begin(), v.end());
v.erase(std::unique(v.begin(), v.end()), v.end());
```

### Filter into new container
```cpp
std::vector<int> evens;
std::copy_if(v.begin(), v.end(), std::back_inserter(evens),
    [](int x) { return x % 2 == 0; });

// C++20:
auto evens2 = v
    | rv::filter([](int x) { return x % 2 == 0; })
    | std::ranges::to<std::vector>();
```

### Group by
The STL doesn't have a direct group_by. With `unordered_map`:
```cpp
std::unordered_map<std::string, std::vector<User>> by_city;
for (const auto& u : users) {
    by_city[u.city].push_back(u);
}
```

C++23 has `rv::chunk_by` for consecutive grouping.

### Zip two ranges
Pre-C++23:
```cpp
for (size_t i = 0; i < std::min(a.size(), b.size()); ++i) {
    process(a[i], b[i]);
}
```

C++23:
```cpp
for (auto [x, y] : rv::zip(a, b)) {
    process(x, y);
}
```

### Enumerate
Pre-C++23:
```cpp
for (size_t i = 0; i < v.size(); ++i) {
    process(i, v[i]);
}
```

C++23:
```cpp
for (auto [i, x] : rv::enumerate(v)) {
    process(i, x);
}
```

### Pipe to a function
```cpp
auto result = process(v
    | rv::filter(pred)
    | std::ranges::to<std::vector>());
```

### Parallel algorithms (C++17)
```cpp
#include <execution>

std::sort(std::execution::par, v.begin(), v.end());
std::transform(std::execution::par_unseq, in.begin(), in.end(), out.begin(), fn);
```

Execution policies:
- `seq` — sequential (default).
- `par` — parallel.
- `par_unseq` — parallel and vectorized (lambda must be vectorizable).
- `unseq` — vectorized only.

Implementation support varies. MSVC has good support; GCC/Clang need `-ltbb` (Intel TBB).

### Don't reinvent
Almost any "operate on a sequence" task has an STL algorithm. Look there before writing a loop. The STL versions are:
- More likely correct (off-by-ones eliminated).
- Often faster.
- Self-documenting (the algorithm name says what's happening).

---

That's the STL algorithms and ranges. With C++20 ranges, idiomatic modern C++ looks much like functional pipelines in Rust or Scala — composable, declarative, and fast.

Next: error handling — `08_errors_and_exceptions.md`.
