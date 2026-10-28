# 06. STL Containers

> `vector`, `string`, `map`, `unordered_map`, `set`, `deque`, `array`, `span`, and which to use when.

> The Standard Template Library (STL) containers are well-designed, fast, and used everywhere. Learn these well.

---

## Table of Contents

1. [Container Overview](#1-container-overview)
2. [`std::vector` — the Default](#2-stdvector--the-default)
3. [`std::string` and `std::string_view`](#3-stdstring-and-stdstring_view)
4. [`std::array` — Fixed-Size](#4-stdarray--fixed-size)
5. [`std::span` (C++20)](#5-stdspan-c20)
6. [`std::deque`](#6-stddeque)
7. [`std::list` and `std::forward_list`](#7-stdlist-and-stdforward_list)
8. [`std::map` and `std::set` — Ordered](#8-stdmap-and-stdset--ordered)
9. [`std::unordered_map` and `std::unordered_set` — Hash-Based](#9-stdunordered_map-and-stdunordered_set--hash-based)
10. [`std::pair` and `std::tuple`](#10-stdpair-and-stdtuple)
11. [Choosing a Container](#11-choosing-a-container)

---

## 1. Container Overview

| Container | Order | Lookup | Insert | Memory |
|---|---|---|---|---|
| `vector` | Insertion | O(n) | O(1) end, O(n) middle | Contiguous |
| `array` | Insertion (fixed N) | O(n) | – | Contiguous, stack |
| `deque` | Insertion | O(n) | O(1) both ends | Chunked |
| `list` | Insertion | O(n) | O(1) anywhere (with iter) | Doubly linked |
| `map` / `set` | Sorted | O(log n) | O(log n) | Tree (red-black) |
| `unordered_map` / `unordered_set` | None | O(1) avg | O(1) avg | Hash table |

In practice: use `vector` for sequences, `unordered_map` for lookups, `string` for text. Reach for others when you have a specific reason.

---

## 2. `std::vector` — the Default

A dynamic array. Use this 95% of the time you need a sequence.

```cpp
#include <vector>

std::vector<int> v;
v.push_back(1);
v.push_back(2);
v.push_back(3);
v.emplace_back(4);    // construct in place (slightly more efficient for non-trivial types)

std::vector<int> v2 = {1, 2, 3, 4, 5};   // initializer list
std::vector<int> v3(10, 0);                // 10 zeros
std::vector<int> v4(10);                    // 10 default-constructed (0 for int)
```

### Access
```cpp
v[0];           // unchecked — undefined behavior if out of bounds
v.at(0);        // throws std::out_of_range
v.front();      // first element
v.back();       // last element
v.size();       // number of elements
v.empty();      // true if size == 0
```

### Iteration
```cpp
for (int x : v) std::cout << x << " ";              // range-for, copy
for (int& x : v) x *= 2;                              // mutate
for (const auto& x : v) std::cout << x << " ";        // generic, no copy

// With iterators
for (auto it = v.begin(); it != v.end(); ++it) { ... }

// With index
for (size_t i = 0; i < v.size(); ++i) v[i];

// C++20 enumerate-like (with views)
for (auto [i, x] : std::views::enumerate(v)) { ... }
```

### Modifying
```cpp
v.push_back(10);
v.pop_back();
v.insert(v.begin() + 2, 99);    // insert at position
v.erase(v.begin());              // remove first
v.clear();                        // remove all
v.resize(20);                      // grow / shrink
v.resize(20, -1);                  // grow, new elements = -1
v.reserve(1000);                   // pre-allocate; size unchanged
```

### Capacity vs size
- `size()` — number of elements.
- `capacity()` — allocated space (may be larger).
- `reserve(n)` — ensure capacity >= n. Avoid reallocations.

```cpp
std::vector<int> v;
v.reserve(1000);
for (int i = 0; i < 1000; ++i) v.push_back(i);    // no reallocation
```

When `push_back` exceeds capacity, the vector reallocates (typically doubling). Reallocations:
- Copy/move all elements.
- Invalidate all iterators, pointers, references to elements.

For predictable performance, `reserve` if you know the size.

### Removing elements (erase-remove idiom)
```cpp
// Remove all 0s
v.erase(std::remove(v.begin(), v.end(), 0), v.end());

// Remove all even
v.erase(std::remove_if(v.begin(), v.end(),
    [](int x) { return x % 2 == 0; }), v.end());

// C++20 simpler:
std::erase(v, 0);
std::erase_if(v, [](int x) { return x % 2 == 0; });
```

### Memory layout
Vector stores elements contiguously — same as a C array. This makes it:
- **Cache-friendly** — sequential access is fast.
- **Compatible with C APIs** — `&v[0]` is a valid `int*` for legacy functions.
- **Indexable in O(1)**.

```cpp
void legacy_c(int* arr, size_t n);
std::vector<int> v = {1, 2, 3};
legacy_c(v.data(), v.size());
```

### Vector of vectors
```cpp
std::vector<std::vector<int>> grid(rows, std::vector<int>(cols, 0));
grid[r][c] = value;
```

A 2D array. Each row is its own vector. For perf-critical 2D access, consider one flat vector with manual indexing.

### Common mistakes
- **Iterator invalidation after `push_back` / `insert`**:
  ```cpp
  auto it = v.begin();
  v.push_back(99);    // may reallocate
  *it;                 // dangling iterator!
  ```
- **Holding pointers to elements across mutations**:
  ```cpp
  int* p = &v[0];
  v.push_back(99);
  *p = 5;             // may be writing to freed memory
  ```
- **Default ctor for non-trivial types in `resize`**:
  Causes construction; expensive if `T` is heavy. Use `reserve` + `push_back` if you don't need defaults.

---

## 3. `std::string` and `std::string_view`

`std::string` is essentially `std::vector<char>` with text operations.

```cpp
#include <string>

std::string s = "hello";
s += " world";
s.append(", how are you?");
s.length();    // 18
s.size();       // same as length()
s.empty();
s[0];           // 'h'
s.at(0);
s.front();
s.back();
s.substr(7, 5);  // "world"
s.find("world"); // returns position (7), or std::string::npos
```

### Construction
```cpp
std::string s1;                       // empty
std::string s2 = "hello";              // from C string
std::string s3(5, 'a');                // "aaaaa"
std::string s4(s2);                     // copy
std::string s5(s2.begin(), s2.end());    // from iterators
```

### Concatenation
```cpp
std::string s = "hello";
s += " world";                          // append
s = s + " world";                       // operator+
std::string s2 = std::format("{} {}", s, "world");   // C++20 format
```

### Number conversion
```cpp
std::string s = std::to_string(42);     // "42"
int i = std::stoi("42");                  // 42
double d = std::stod("3.14");             // 3.14
```

`std::stoi` etc. throw on failure. For non-throwing, `std::from_chars`:
```cpp
int value;
auto result = std::from_chars(s.data(), s.data() + s.size(), value);
if (result.ec == std::errc{}) {
    // success
}
```

### `std::string_view` (C++17)
A non-owning view into a string. Doesn't copy.

```cpp
#include <string_view>

void print(std::string_view sv) {     // accept any string-like
    std::cout << sv;
}

std::string s = "hello";
print(s);           // no copy
print("literal");    // no copy
print(s.substr(0, 3));    // string_view from substr — wait, substr returns string

std::string_view first_three = std::string_view(s).substr(0, 3);
print(first_three);
```

`string_view` is to `string` what a span is to a vector — a view, no ownership.

### When to use `string_view`
- Function parameters (read-only).
- Avoiding copies when slicing.

### When NOT to use `string_view`
- Returning from a function (lifetime issues).
- Storing as a member (dangling-pointer risk).

```cpp
std::string_view get_first_three(const std::string& s) {
    return s.substr(0, 3);   // BAD — substr returns a temporary std::string, view dangles
}
```

```cpp
std::string_view get_first_three(std::string_view s) {
    return s.substr(0, 3);   // OK — substr on string_view returns string_view
}
```

`string_view`'s lifetime is tied to the underlying string. Be careful.

### C strings vs std::string
- C strings: `const char*`, null-terminated, manual memory.
- `std::string`: owns memory, knows its size, safe.

Use `std::string` always in C++ code. Convert to `const char*` with `.c_str()` when calling C APIs:
```cpp
std::string filename = "data.txt";
std::ifstream f(filename.c_str());   // .c_str() needed pre-C++11; modern overloads accept std::string directly
```

---

## 4. `std::array` — Fixed-Size

A fixed-size array with C++ goodness.

```cpp
#include <array>

std::array<int, 5> a = {1, 2, 3, 4, 5};
a[0];
a.at(0);
a.size();     // always 5, compile-time constant
a.fill(0);    // set all to 0

for (int x : a) std::cout << x;
```

### Why `std::array` over C arrays
- Knows its size (`.size()`).
- Doesn't decay to a pointer.
- Works with STL algorithms.
- Same performance as `int arr[5]`.

```cpp
// C array — bad
int arr[5] = {1, 2, 3, 4, 5};
sizeof(arr);     // 20 bytes (the array)
// Pass to function — decays to pointer, loses size:
void f(int* arr) { sizeof(arr) == sizeof(int*); }

// std::array — good
std::array<int, 5> arr = {1, 2, 3, 4, 5};
arr.size();      // 5
// Pass:
void f(const std::array<int, 5>& arr) { /* knows size */ }
```

### When to use
- Small, fixed-size collections.
- Stack-allocated (good cache behavior, no heap overhead).
- When `std::vector`'s heap allocation is overkill.

---

## 5. `std::span` (C++20)

A view of a contiguous sequence (array, vector, etc.). Like `string_view` but for any element type.

```cpp
#include <span>

void print(std::span<const int> s) {
    for (int x : s) std::cout << x << " ";
}

std::vector<int> v = {1, 2, 3};
std::array<int, 3> a = {4, 5, 6};
int c[] = {7, 8, 9};

print(v);    // pass vector
print(a);    // pass array
print(c);    // pass C array
```

A `span` knows the data pointer and size. Doesn't own.

### Subspans
```cpp
std::span<int> s = vec;
auto first_three = s.subspan(0, 3);
auto last_two = s.last(2);
```

### Fixed vs dynamic extent
```cpp
std::span<int> dyn;        // size known at runtime
std::span<int, 5> fixed;    // size known at compile time
```

Fixed extent gives the compiler more info to optimize.

### When to use
- Function parameters that should accept various contiguous containers.
- Avoiding template explosion (one function, multiple containers).

Pre-C++20, you'd write a template:
```cpp
template<typename Container>
void process(const Container& c) { ... }
```

Now:
```cpp
void process(std::span<const int> s) { ... }
```

Simpler, faster compile.

---

## 6. `std::deque`

A double-ended queue. Allows O(1) push/pop at both ends.

```cpp
#include <deque>

std::deque<int> d;
d.push_back(1);
d.push_back(2);
d.push_front(0);     // O(1), unlike vector
d[0];                  // 0
d.front();              // 0
d.back();                // 2
d.pop_front();
```

### When over vector
- You need efficient `push_front` / `pop_front`.

### When vector wins
- You don't need front insertion.
- You need contiguous memory (for C interop).
- You need maximum performance (vector's contiguity is cache-friendlier).

Deques are stored as chunks of contiguous memory, not one big block. Elements aren't all in one allocation. Slightly slower iteration due to chunk boundaries.

### `std::queue` and `std::stack`
Adapters over `std::deque` (default) with restricted interfaces:
```cpp
#include <queue>
#include <stack>

std::queue<int> q;
q.push(1); q.push(2); q.push(3);
q.front();    // 1
q.pop();       // removes 1

std::stack<int> s;
s.push(1); s.push(2); s.push(3);
s.top();       // 3
s.pop();        // removes 3
```

### `std::priority_queue`
A heap.
```cpp
std::priority_queue<int> pq;
pq.push(3); pq.push(1); pq.push(5);
pq.top();    // 5 (max-heap by default)
pq.pop();

// Min-heap
std::priority_queue<int, std::vector<int>, std::greater<int>> minpq;
```

---

## 7. `std::list` and `std::forward_list`

Doubly and singly linked lists.

```cpp
#include <list>

std::list<int> l = {1, 2, 3};
l.push_front(0);
l.push_back(4);
auto it = std::find(l.begin(), l.end(), 2);
l.insert(it, 99);   // insert before 2, O(1) with iterator
l.erase(it);         // O(1)
```

### When (almost never)
- You need O(1) splicing of sublists.
- Iterators must remain valid through insertions.
- You have a specific algorithmic reason.

### Why almost never
- **Cache-unfriendly**: each node is a separate allocation, traversal jumps around memory.
- **Memory overhead**: each node has prev/next pointers.
- **Slower than vector for almost everything** — even "insertions in the middle," because finding the position dominates.

In modern C++ practice: use `std::vector` even when you'd theoretically prefer a list. Measure before reaching for linked lists.

---

## 8. `std::map` and `std::set` — Ordered

Tree-based associative containers (typically red-black tree). Sorted, O(log n).

### `std::map<K, V>`
```cpp
#include <map>

std::map<std::string, int> ages;
ages["Alice"] = 30;
ages["Bob"] = 25;
ages.insert({"Charlie", 35});
ages.emplace("Dave", 40);

ages["Alice"];               // 30
ages.at("Bob");              // 25, throws if missing
ages.count("Eve");            // 0
ages.contains("Eve");         // false (C++20)
ages.find("Alice");           // iterator to entry, or end()

// Iteration is sorted by key:
for (const auto& [name, age] : ages) {
    std::cout << name << ": " << age << "\n";
}
```

### `[]` creates entries
```cpp
std::map<std::string, int> m;
int x = m["missing"];    // creates "missing" -> 0 and returns 0
m.size();                  // 1!
```

Use `.find` or `.contains` to check without modifying.

### `std::set<T>`
Like map but only keys.
```cpp
std::set<int> s = {3, 1, 4, 1, 5, 9, 2, 6};
// s contains {1, 2, 3, 4, 5, 6, 9} (unique, sorted)

s.insert(7);
s.erase(3);
s.contains(4);   // true (C++20)
```

### Custom comparison
```cpp
std::map<std::string, int, std::greater<>> rev;    // reverse sort
```

Or for custom types, define `operator<` or pass a comparator:
```cpp
struct ByLength {
    bool operator()(const std::string& a, const std::string& b) const {
        return a.length() < b.length();
    }
};

std::set<std::string, ByLength> bylen;
```

### Multimap and multiset
Allow duplicate keys. Rarely needed.

### When to use map/set
- You need sorted iteration.
- You need range queries (`lower_bound`, `upper_bound`).
- O(log n) is acceptable.

Otherwise, prefer `unordered_*` (next section).

---

## 9. `std::unordered_map` and `std::unordered_set` — Hash-Based

Hash tables. O(1) average lookup. No sorted order.

```cpp
#include <unordered_map>

std::unordered_map<std::string, int> ages;
ages["Alice"] = 30;
ages["Bob"] = 25;

ages.find("Alice");
ages.contains("Bob");    // C++20
ages.count("Eve");        // 0 or 1

// Iteration is unspecified order
for (const auto& [k, v] : ages) { ... }
```

Same interface as `map` for the most part.

### Custom hash
For your own types:
```cpp
struct Point { int x, y; };

namespace std {
    template<>
    struct hash<Point> {
        size_t operator()(const Point& p) const {
            return std::hash<int>()(p.x) ^ (std::hash<int>()(p.y) << 1);
        }
    };
}

// Define operator== too (for collision resolution)
bool operator==(const Point& a, const Point& b) {
    return a.x == b.x && a.y == b.y;
}

std::unordered_map<Point, std::string> labels;
```

### Performance
- Average O(1), worst case O(n) (all collide).
- Standard library implementations use chained buckets.
- Custom allocators / open-addressing implementations (like `absl::flat_hash_map`) are often faster.

For performance-critical code, consider third-party hash maps (Abseil, robin_hood).

### Reserving
```cpp
std::unordered_map<std::string, int> m;
m.reserve(1000);   // pre-allocate buckets
```

Avoids rehashing as the map grows.

### When map vs unordered_map
- Need sorted iteration / range queries → `map`.
- Just need fast lookups → `unordered_map`.

`unordered_map` is the default for new code. `map` for ordered-iteration cases.

---

## 10. `std::pair` and `std::tuple`

### Pair
Two values:
```cpp
#include <utility>

std::pair<int, std::string> p{42, "hello"};
p.first;     // 42
p.second;     // "hello"

auto [num, text] = p;    // structured binding (C++17)

// Make a pair
auto p2 = std::make_pair(1, "x");
```

`std::map` uses pairs internally — `*iter` of a map is a `pair<const K, V>`.

### Tuple
N values:
```cpp
#include <tuple>

std::tuple<int, std::string, double> t{42, "hello", 3.14};
std::get<0>(t);    // 42
std::get<std::string>(t);    // "hello" (if unique type)

auto [n, s, d] = t;    // structured binding
```

### Returning multiple values
```cpp
std::tuple<int, int, int> get_stats(const std::vector<int>& v) {
    int min = *std::min_element(v.begin(), v.end());
    int max = *std::max_element(v.begin(), v.end());
    int sum = std::accumulate(v.begin(), v.end(), 0);
    return {min, max, sum};
}

auto [mn, mx, sm] = get_stats(data);
```

Better than out-parameters. For named fields, prefer a struct:
```cpp
struct Stats { int min, max, sum; };

Stats get_stats(const std::vector<int>& v) {
    return {*std::min_element(...), *std::max_element(...), ...};
}

auto s = get_stats(data);
std::cout << s.min;
```

A struct is more readable than a tuple for non-trivial return values.

---

## 11. Choosing a Container

### "I need a sequence"
- **`std::vector<T>`** — default. Use this.
- `std::array<T, N>` — if size is fixed and small.
- `std::deque<T>` — if you need both-end insertion.
- `std::list<T>` — rarely.

### "I need a key-value lookup"
- **`std::unordered_map<K, V>`** — default for lookups.
- `std::map<K, V>` — if you need sorted iteration or range queries.
- Sometimes a `std::vector<std::pair<K, V>>` sorted by key is faster for small sets (better cache behavior).

### "I need a set"
- **`std::unordered_set<T>`** — default.
- `std::set<T>` — for sorted iteration / range queries.

### "I need a stack / queue"
- `std::stack<T>` / `std::queue<T>` — interface adapters.
- Or just use a `std::vector` with `push_back` / `pop_back`.

### "I need a heap / priority queue"
- `std::priority_queue<T>`.

### "I need a fixed-size buffer"
- `std::array<T, N>` if N is known at compile time.
- `std::vector<T>` with `reserve(N)` otherwise.

### "I need a view of someone else's data"
- `std::span<T>` (C++20).
- `std::string_view` for strings.

### Container choice heuristics
1. **Start with `vector`.** It's the right choice more often than you'd think.
2. **`vector` beats `list` even for "insertions in the middle"** due to cache effects.
3. **`unordered_map` beats `map` for raw lookups.** Use `map` when you need order.
4. **Small data**: even hash maps lose to `std::vector<std::pair<K, V>>` with linear scan for very small N (< ~30 elements).
5. **Measure if it matters.**

### Memory locality
Modern CPUs are bottlenecked by memory access. Contiguous containers (vector, array) win cache games. Pointer-chasing containers (list, map) lose.

```cpp
// Trick: storing data in a vector and using indices for "pointers"
struct Node { int value; int next_idx; };
std::vector<Node> nodes;
```

Sometimes a "manually linked list inside a vector" is dramatically faster than `std::list`.

### Containers I haven't covered
- `std::flat_map` / `std::flat_set` (C++23) — like `map`/`set` but stored as sorted vectors. Better cache behavior; expensive inserts/deletes.
- `std::mdspan` (C++23) — multi-dimensional view.

Look these up when you actually need them.

---

That's STL containers. Master `vector`, `string`, `unordered_map`, and `string_view`, and you're set for most C++ code. The others fill in when you have specific needs.

Next: how to **do** things with these containers — `07_stl_algorithms_and_ranges.md`.
