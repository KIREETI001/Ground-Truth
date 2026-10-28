# 03. Data Structures

> Python's built-in collections — lists, tuples, dicts, sets — and the `collections` module that extends them.

---

## Table of Contents

1. [Picking the Right Data Structure](#1-picking-the-right-data-structure)
2. [Lists](#2-lists)
3. [Tuples](#3-tuples)
4. [Dictionaries](#4-dictionaries)
5. [Sets and Frozensets](#5-sets-and-frozensets)
6. [Strings as Sequences](#6-strings-as-sequences)
7. [Comprehensions](#7-comprehensions)
8. [The collections Module](#8-the-collections-module)
9. [Bytes and Bytearray](#9-bytes-and-bytearray)
10. [Common Patterns](#10-common-patterns)
11. [Performance Cheat Sheet](#11-performance-cheat-sheet)

---

## 1. Picking the Right Data Structure

A quick decision tree:

| Need | Use |
|---|---|
| Ordered, mutable, may have duplicates | `list` |
| Ordered, immutable, fixed-size record | `tuple` |
| Key-value lookup | `dict` |
| Unique values, fast membership test | `set` |
| Immutable set (e.g., dict key) | `frozenset` |
| Fast appends/pops at both ends | `collections.deque` |
| Counting occurrences | `collections.Counter` |
| Default values for missing keys | `collections.defaultdict` |
| Named record without writing a class | `collections.namedtuple` or `dataclass` |

Default to `list` and `dict` until you have a reason to use something else. Reach for `set` early if you'll be doing membership tests.

---

## 2. Lists

### Creation
```python
empty = []
nums = [1, 2, 3, 4, 5]
mixed = [1, "two", 3.0, True, None]    # Python's totally fine with this
from_other = list("hello")              # ['h', 'e', 'l', 'l', 'o']
from_range = list(range(10))
list_of_lists = [[1, 2], [3, 4], [5, 6]]
```

### Indexing
```python
nums = [10, 20, 30, 40, 50]
nums[0]              # 10
nums[-1]             # 50 (last)
nums[-2]             # 40 (second to last)
nums[10]             # IndexError
```

### Slicing
The most useful Python feature you'll use every day.
```python
nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

nums[2:5]            # [2, 3, 4]              indexes 2,3,4
nums[:3]             # [0, 1, 2]              from start
nums[7:]             # [7, 8, 9]              to end
nums[:]              # full copy of the list
nums[::2]            # [0, 2, 4, 6, 8]        every 2nd
nums[1::2]           # [1, 3, 5, 7, 9]
nums[::-1]           # [9, 8, ..., 0]         reversed
nums[-3:]            # [7, 8, 9]              last three
nums[:-3]            # [0, 1, 2, 3, 4, 5, 6]  all but last three
```

Slicing **never raises IndexError** — out-of-bounds slices are quietly clamped:
```python
nums[100:200]        # [] (empty list)
```

You can also assign to a slice:
```python
nums = [1, 2, 3, 4, 5]
nums[1:3] = ['a', 'b', 'c']     # [1, 'a', 'b', 'c', 4, 5]
nums[::2] = [0, 0, 0]           # but assigning to extended slice must match length
```

### Mutation methods
```python
nums = [1, 2, 3]
nums.append(4)              # [1, 2, 3, 4]
nums.extend([5, 6])         # [1, 2, 3, 4, 5, 6]
nums.insert(0, 0)           # [0, 1, 2, 3, 4, 5, 6] — insert at index
nums.remove(3)              # remove first occurrence of value 3
nums.pop()                  # remove and return last (6)
nums.pop(0)                 # remove and return at index 0
nums.clear()                # []
nums.reverse()              # in place
nums.sort()                 # in place
nums.sort(key=str.lower)    # custom key
nums.sort(reverse=True)
```

### Non-mutating equivalents
Many of the above mutate the list and return `None`. Sometimes you want a new list:
```python
new = sorted(nums)            # returns new sorted list
new = list(reversed(nums))    # returns new reversed list
copy = nums.copy()             # shallow copy
copy = nums[:]                 # same — slice copy
copy = list(nums)              # same
```

### Aggregations
```python
sum(nums)
min(nums)
max(nums)
len(nums)
3 in nums                # membership
nums.count(3)            # how many times 3 appears
nums.index(3)            # first index of 3 (ValueError if not present)
```

### Common gotcha: shallow vs deep copy
```python
matrix = [[0] * 3] * 3
matrix[0][0] = 1
print(matrix)     # [[1, 0, 0], [1, 0, 0], [1, 0, 0]] — surprise!
```
The outer list contains three references to the *same* inner list. Fix:
```python
matrix = [[0] * 3 for _ in range(3)]
matrix[0][0] = 1
print(matrix)     # [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
```

For nested data, `copy.deepcopy(x)` (from the `copy` module) copies everything recursively.

### Concatenation
```python
a = [1, 2, 3]
b = [4, 5, 6]
a + b                # [1, 2, 3, 4, 5, 6] (new list)
a * 3                # [1, 2, 3, 1, 2, 3, 1, 2, 3]
```

### Lists vs arrays
Python's `list` is a heterogeneous, dynamic array — not the contiguous block of memory you'd get in C. For numeric computation use **NumPy arrays** (covered in `12_data_and_ml.md`); for fixed-type compact storage use the built-in `array` module:
```python
from array import array
a = array('i', [1, 2, 3])        # 'i' = signed int
```
But honestly, just use NumPy if you need speed.

---

## 3. Tuples

A tuple is an **immutable ordered sequence**. Once created, you can't change it.

```python
point = (3, 4)
empty = ()
single = (1,)              # comma needed — `(1)` is just the int 1
also_a_tuple = 1, 2, 3      # parentheses are optional

# Indexing & slicing — same as lists
point[0]; point[-1]; point[0:1]

# But no append, sort, etc.
point.append(5)             # AttributeError
```

### Why use tuples?
- **Records**: a tuple often represents a fixed-structure record (e.g., `(name, age)`). For larger records use a dataclass.
- **Multiple return values** are tuples:
  ```python
  def divmod_(a, b):
      return a // b, a % b      # returns a tuple
  q, r = divmod_(10, 3)
  ```
- **Dict keys** must be hashable; tuples of hashable values qualify, lists don't.
- **Slightly faster and smaller** than lists.
- **Safety**: immutability prevents accidental modification.

### Unpacking
```python
point = (3, 4)
x, y = point

# With *
first, *rest = (1, 2, 3, 4)         # first=1, rest=[2,3,4]
*init, last = (1, 2, 3, 4)          # init=[1,2,3], last=4
first, *middle, last = (1, 2, 3, 4, 5)

# Nested
(a, b), c = (1, 2), 3
```

### Named tuples
For when you want named fields without a full class:
```python
from collections import namedtuple
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
p.x; p.y
p[0]; p[1]              # also indexable
p._asdict()             # {'x': 3, 'y': 4}
p._replace(x=10)        # new Point(10, 4)
```

For type-annotated, IDE-friendly named tuples:
```python
from typing import NamedTuple

class Point(NamedTuple):
    x: int
    y: int
    label: str = "unknown"   # default value

p = Point(3, 4)
```

Most modern code uses `@dataclass` instead — see `04_oop.md`.

---

## 4. Dictionaries

The workhorse data structure. A mapping from hashable keys to arbitrary values.

```python
person = {
    "name": "Alice",
    "age": 30,
    "city": "NYC",
}

person["name"]            # "Alice"
person["email"] = "a@x.com"   # add
person["age"] = 31            # update
del person["city"]            # remove
```

### Safe access
```python
person["nope"]                 # KeyError
person.get("nope")             # None
person.get("nope", "default")  # "default"
"name" in person               # True
```

### Iteration
```python
for key in person:                          # iterates keys
    print(key, person[key])

for key, value in person.items():           # both at once (preferred)
    print(key, value)

for value in person.values():
    print(value)
```

### Useful methods
```python
person.keys()
person.values()
person.items()
person.update({"age": 31, "country": "US"})   # merge another dict
person.pop("age")                              # remove and return
person.pop("nope", None)                       # safe pop with default
person.popitem()                                # remove and return last (LIFO)
person.clear()
len(person)
person.setdefault("language", "English")       # set if not present, return value

# Dict comprehension
squared = {x: x ** 2 for x in range(5)}
inverted = {v: k for k, v in person.items()}

# Merging (Python 3.9+)
merged = dict1 | dict2                          # new dict
dict1 |= dict2                                  # in-place

# Old-style merging
merged = {**dict1, **dict2}                     # same effect

# Construction from pairs
d = dict([("a", 1), ("b", 2)])
d = dict(a=1, b=2)                              # keyword form
d = dict.fromkeys(["a", "b", "c"], 0)           # {"a": 0, "b": 0, "c": 0}
```

### Ordering
**Dicts preserve insertion order since Python 3.7.** Don't rely on it for serialization compatibility with older interpreters or other languages — but in modern Python, iteration order is deterministic.

```python
d = {}
d["a"] = 1
d["b"] = 2
d["c"] = 3
list(d.keys())     # ['a', 'b', 'c']
```

### Keys must be hashable
```python
{1: "a", "hi": "b", (1, 2): "c"}        # OK
{[1, 2]: "x"}                            # TypeError — list is mutable, unhashable
```

You can use any immutable type, plus your own class if you define `__hash__` (covered in `04_oop.md`).

### Nested dicts
```python
users = {
    "alice": {"age": 30, "email": "a@x.com"},
    "bob":   {"age": 25, "email": "b@x.com"},
}
users["alice"]["age"]
users.setdefault("carol", {})["age"] = 35
```

For deeply nested data, consider `pydantic` models or `dataclass`es (`04_oop.md`).

### Default values
```python
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
```

Cleaner with `defaultdict`:
```python
from collections import defaultdict
counts = defaultdict(int)
for word in words:
    counts[word] += 1
```

Or `Counter` — even cleaner — covered below.

---

## 5. Sets and Frozensets

A `set` is an **unordered collection of unique hashable items**. Membership tests are O(1) on average.

```python
empty = set()                  # NOT {} — that's an empty dict
unique = {1, 2, 3}
from_list = set([1, 1, 2, 3, 3])      # {1, 2, 3} — dedup pattern

# Membership
3 in unique                    # True

# Mutation
unique.add(4)
unique.update([5, 6])           # union in place
unique.remove(3)                # KeyError if missing
unique.discard(99)              # silent if missing
unique.pop()                    # remove arbitrary element
unique.clear()
```

### Set algebra
```python
a = {1, 2, 3}
b = {3, 4, 5}

a | b              # union: {1, 2, 3, 4, 5}
a & b              # intersection: {3}
a - b              # difference: {1, 2}
a ^ b              # symmetric difference: {1, 2, 4, 5}

a.union(b); a.intersection(b); a.difference(b); a.symmetric_difference(b)
a.update(b)        # |=  (in-place union)
a.intersection_update(b)
a.difference_update(b)

a <= b             # subset
a < b              # proper subset
a >= b             # superset
a.isdisjoint(b)
```

### Set comprehension
```python
unique_lengths = {len(w) for w in words}
```

### When to use a set
- **Deduplication**: `list(set(items))`.
- **Membership testing**: O(1) instead of O(n) for lists.
- **Set algebra**: tag intersections, audience overlap, diff between two collections.
- **Tracking visited items** in graph algorithms.

### Frozensets — immutable sets
```python
fs = frozenset([1, 2, 3])
# Same operations as set, but no .add() / .remove()
# Can be a dict key or member of another set
```

---

## 6. Strings as Sequences

Strings behave a lot like immutable tuples of single characters. Many sequence operations work:

```python
s = "Hello"
len(s)             # 5
s[0]               # "H"
s[-1]              # "o"
s[1:3]             # "el"
s[::-1]            # "olleH"
"l" in s            # True
list(s)             # ['H', 'e', 'l', 'l', 'o']

for ch in s:
    print(ch)
```

### Methods recap (most-used)
| Category | Methods |
|---|---|
| Case | `lower`, `upper`, `title`, `capitalize`, `swapcase`, `casefold` |
| Trim | `strip`, `lstrip`, `rstrip` |
| Test | `startswith`, `endswith`, `isdigit`, `isalpha`, `isalnum`, `isspace`, `isupper`, `islower` |
| Find | `find`, `rfind`, `index`, `rindex`, `count` |
| Replace | `replace`, `translate` (with `str.maketrans`) |
| Split/Join | `split`, `rsplit`, `splitlines`, `partition`, `rpartition`, `join` |
| Padding | `ljust`, `rjust`, `center`, `zfill` |
| Format | `format`, `format_map`, `%` (legacy), f-strings (best) |
| Encoding | `encode` (str→bytes) |

### Common operations
```python
"  hello  ".strip()              # "hello"
"name,age,email".split(",")      # ["name", "age", "email"]
",".join(["a", "b", "c"])        # "a,b,c"
"hello".replace("l", "L")        # "heLLo"
"Hello World".count("o")         # 2
"hello".find("ell")              # 1
"hello".find("xyz")              # -1 (not found)
"hello".index("ell")             # 1
"hello".index("xyz")             # ValueError

# Splitting on whitespace (any combination of spaces, tabs, newlines)
"  a   b  c  ".split()           # ["a", "b", "c"]
```

### Encoding & decoding
```python
"hello".encode("utf-8")           # b'hello' (bytes)
b"hello".decode("utf-8")          # "hello"
"café".encode("utf-8")            # b'caf\xc3\xa9'
"café".encode("ascii")            # UnicodeEncodeError
"café".encode("ascii", errors="ignore")     # b'caf'
"café".encode("ascii", errors="replace")    # b'caf?'
```

### Multiline strings & dedent
```python
text = """
    line 1
    line 2
"""
# textwrap.dedent removes common leading whitespace
import textwrap
clean = textwrap.dedent("""\
    line 1
    line 2
""")
```

---

## 7. Comprehensions

A comprehension is a single expression that builds a list, set, dict, or generator from an iterable.

### List comprehension
```python
squares = [x ** 2 for x in range(10)]
# [0, 1, 4, 9, ..., 81]

evens = [x for x in range(20) if x % 2 == 0]
# [0, 2, 4, ..., 18]

# Mapping & filtering
upper_words = [w.upper() for w in words if len(w) > 3]

# Nested loops
pairs = [(x, y) for x in range(3) for y in range(3) if x != y]

# Flatten a list of lists
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [n for row in matrix for n in row]

# Conditional expression (different from filter!)
labels = ["even" if x % 2 == 0 else "odd" for x in nums]
```

### Set comprehension
```python
unique_words = {w.lower() for w in text.split()}
```

### Dict comprehension
```python
squares = {x: x ** 2 for x in range(5)}
swapped = {v: k for k, v in d.items()}
filtered = {k: v for k, v in d.items() if v is not None}
```

### Generator expression — lazy
Use `()` instead of `[]`. Doesn't build a list; produces values on demand.
```python
gen = (x ** 2 for x in range(1_000_000))   # nothing computed yet
total = sum(x ** 2 for x in range(1_000_000))  # parens optional when sole arg

next(gen)        # 0
next(gen)        # 1
```

Memory-efficient for large datasets. Covered more in `05_functional.md`.

### When NOT to use a comprehension
- If you can't read it in one breath, break it into a loop.
- If it has more than one filter or two `for`s, consider a regular loop or `filter`/`map`.
- If you need side effects (like `print`), use a loop. Comprehensions are for building collections.

---

## 8. The collections Module

Built-in `collections` extends the basic types.

### `Counter` — count occurrences
```python
from collections import Counter

c = Counter("mississippi")
# Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})

c = Counter(["apple", "banana", "apple", "cherry"])
c["apple"]                  # 2
c["nonexistent"]            # 0 (not KeyError)

c.most_common(2)            # [('apple', 2), ('banana', 1)]
c.total()                    # sum of all counts (3.10+)
c.update(["apple", "kiwi"])
c.subtract(["apple"])

# Set-like math on counters
Counter("hello") + Counter("world")
Counter("hello") - Counter("ll")
```

### `defaultdict` — auto-create missing values
```python
from collections import defaultdict

groups = defaultdict(list)
for name, dept in employees:
    groups[dept].append(name)
# groups["engineering"] auto-creates a new []

counts = defaultdict(int)
for word in words:
    counts[word] += 1        # int() = 0 used as default

graph = defaultdict(set)     # adjacency list
graph["A"].add("B")
```

### `deque` — double-ended queue
Fast O(1) appends and pops at *both* ends. Use for queues, BFS, sliding windows.
```python
from collections import deque

q = deque([1, 2, 3])
q.append(4)               # [1, 2, 3, 4]
q.appendleft(0)            # [0, 1, 2, 3, 4]
q.pop()                    # 4 — removes from right
q.popleft()                # 0 — removes from left
q.rotate(1)                # [3, 1, 2]   right rotation
q.rotate(-1)               # [1, 2, 3]   left

# Sliding window with maxlen
window = deque(maxlen=3)
for x in stream:
    window.append(x)       # automatically drops oldest beyond maxlen
```

### `namedtuple` — covered above

### `OrderedDict` — historically important
Before Python 3.7 made dicts ordered, this was the way. Today, you'll only use it if you need methods like `move_to_end` or strict-order equality:
```python
from collections import OrderedDict
od = OrderedDict([("a", 1), ("b", 2)])
od.move_to_end("a")       # OrderedDict([("b", 2), ("a", 1)])
```

### `ChainMap` — multiple dicts as one
```python
from collections import ChainMap

defaults = {"theme": "dark", "lang": "en"}
user = {"theme": "light"}
config = ChainMap(user, defaults)

config["theme"]          # "light" — first found wins
config["lang"]           # "en"
```

Great for layered config (defaults → env → CLI).

### `UserDict`, `UserList`, `UserString`
Base classes for subclassing dict / list / str. Easier than subclassing the built-ins directly.

---

## 9. Bytes and Bytearray

`bytes` is the immutable byte sequence type. `bytearray` is mutable.

```python
b = b"hello"                # bytes literal
b[0]                        # 104 (an int, not a char!)
b.decode("utf-8")           # "hello"
"hello".encode("utf-8")     # b"hello"

# bytearray is mutable
ba = bytearray(b"hello")
ba[0] = ord("H")
print(ba)                   # bytearray(b'Hello')

# Building bytes
b"a" + b"b"                  # b"ab"
b"-" * 10                    # b"----------"

# Hex roundtrip
b = bytes.fromhex("48656c6c6f")     # b"Hello"
b.hex()                              # "48656c6c6f"

# From iterable of ints
bytes([65, 66, 67])                  # b"ABC"

# Reading binary
with open("data.bin", "rb") as f:
    data = f.read()                  # bytes
```

Use `bytes` whenever you're dealing with non-text data: images, network protocols, file I/O for binary formats.

---

## 10. Common Patterns

### Iterate with index
```python
for i, item in enumerate(items, start=1):
    print(f"{i}: {item}")
```

### Iterate two lists together
```python
for name, age in zip(names, ages):
    ...

# Three lists
for a, b, c in zip(xs, ys, zs):
    ...

# Strict — raise if lengths differ (3.10+)
for a, b in zip(xs, ys, strict=True):
    ...

# Pad shorter with fillvalue
from itertools import zip_longest
for a, b in zip_longest(xs, ys, fillvalue=None):
    ...
```

### Iterate dict in sorted order
```python
for k in sorted(d):
    print(k, d[k])

# Sort by value
for k, v in sorted(d.items(), key=lambda kv: kv[1]):
    print(k, v)

# Top-N by value
top5 = sorted(d.items(), key=lambda kv: kv[1], reverse=True)[:5]
```

### Group by key
```python
from collections import defaultdict
groups = defaultdict(list)
for item in items:
    groups[item.category].append(item)
```

Or with `itertools.groupby` (but it requires sorted input — gotcha):
```python
from itertools import groupby
sorted_items = sorted(items, key=lambda i: i.category)
for category, group in groupby(sorted_items, key=lambda i: i.category):
    print(category, list(group))
```

### Deduplicate while preserving order
```python
seen = set()
unique = []
for item in items:
    if item not in seen:
        seen.add(item)
        unique.append(item)

# Or, since Python 3.7 dicts preserve order:
unique = list(dict.fromkeys(items))
```

### Flatten one level
```python
flat = [x for sub in nested for x in sub]
# or
from itertools import chain
flat = list(chain.from_iterable(nested))
```

### Merge dicts with conflict resolution
```python
# Last wins (default merging)
merged = dict1 | dict2

# Sum values for shared keys
from collections import Counter
totals = Counter(dict1) + Counter(dict2)

# Custom merge logic
result = {**dict1}
for k, v in dict2.items():
    result[k] = result.get(k, 0) + v
```

### Split a sequence into chunks
```python
def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]

list(chunks([1, 2, 3, 4, 5, 6, 7], 3))
# [[1, 2, 3], [4, 5, 6], [7]]

# 3.12+ has itertools.batched
from itertools import batched
list(batched([1, 2, 3, 4, 5, 6, 7], 3))
# [(1, 2, 3), (4, 5, 6), (7,)]
```

### Rotate a list
```python
n = 2
rotated = lst[n:] + lst[:n]
```

### Check if all elements are unique
```python
len(items) == len(set(items))    # but iterates twice
# Or, short-circuiting:
def all_unique(items):
    seen = set()
    for x in items:
        if x in seen:
            return False
        seen.add(x)
    return True
```

### Most common element
```python
from collections import Counter
Counter(items).most_common(1)[0][0]
```

### Find min/max with a tiebreaker
```python
oldest = max(people, key=lambda p: p.age)
# By multiple keys (Python's sort is stable):
oldest = max(people, key=lambda p: (p.age, p.name))
```

---

## 11. Performance Cheat Sheet

Rough complexities for common operations (CPython, average case):

| Operation | list | tuple | dict | set | deque |
|---|---|---|---|---|---|
| `x in s` | O(n) | O(n) | O(1) | O(1) | O(n) |
| `s[i]` (index) | O(1) | O(1) | O(1)* | — | O(n)** |
| Append / add | O(1)*** | — | O(1) | O(1) | O(1) |
| Pop end | O(1) | — | — | — | O(1) |
| Pop front | O(n) | — | — | — | O(1) |
| Insert at i | O(n) | — | — | — | — |
| Remove value | O(n) | — | O(1) | O(1) | O(n) |
| `len(s)` | O(1) | O(1) | O(1) | O(1) | O(1) |
| Iterate | O(n) | O(n) | O(n) | O(n) | O(n) |

\* By key, not by position. \** deque doesn't support random access. \*** Amortized — occasional reallocation.

### Practical guidelines

- **Membership tests on lots of items**: use a `set`, not a `list`.
- **Queue / sliding window**: use `deque`, not `list.pop(0)`.
- **Repeatedly building a string in a loop**: use `"".join(list)`, not `+=`.
- **Looking up by key**: use `dict`, not "find in list of tuples".
- **Sorting once then doing many lookups in order**: `bisect` module.
- **Large numerical arrays**: use NumPy.

### Profile, don't guess
For real performance work, time it:
```python
import timeit
timeit.timeit("3 in [1,2,3,4,5]", number=1_000_000)
timeit.timeit("3 in {1,2,3,4,5}", number=1_000_000)
```

Or `%timeit` in IPython / Jupyter.

---

Next up: building larger structures via classes — `04_oop.md`.
