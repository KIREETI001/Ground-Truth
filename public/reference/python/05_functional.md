# 05. Functional Patterns

> First-class functions, closures, decorators, generators, `itertools`, `functools`, context managers — Python's functional toolbox.

---

## Table of Contents

1. [Functions as Values](#1-functions-as-values)
2. [Closures](#2-closures)
3. [Lambdas](#3-lambdas)
4. [map, filter, reduce](#4-map-filter-reduce)
5. [Decorators](#5-decorators)
6. [Generators](#6-generators)
7. [Generator Expressions](#7-generator-expressions)
8. [itertools](#8-itertools)
9. [functools](#9-functools)
10. [Context Managers](#10-context-managers)
11. [Iterators in Depth](#11-iterators-in-depth)

---

## 1. Functions as Values

In Python, functions are objects. You can assign them, pass them, return them, store them in collections.

```python
def greet(name):
    return f"Hi, {name}"

f = greet                  # f and greet now refer to the same function
f("Alice")                  # "Hi, Alice"

operations = [greet, str.upper, str.lower]
for op in operations:
    print(op("Alice"))

def make_logger(prefix):
    def log(msg):
        print(f"[{prefix}] {msg}")
    return log

info = make_logger("INFO")
info("starting")            # [INFO] starting
```

This first-class-function property enables decorators, callbacks, higher-order functions, and most functional patterns.

---

## 2. Closures

A closure is an inner function that captures variables from its enclosing scope.

```python
def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

c = make_counter()
c()      # 1
c()      # 2
c()      # 3
```

Each call to `make_counter()` creates a new closure with its own `count`. Closures are how you build state without using classes.

### `nonlocal` vs `global`
- `nonlocal x` — modify a variable in the enclosing function.
- `global x` — modify a module-level variable.

Without these, assignment creates a new local variable.

### Late binding gotcha
A common bug:
```python
funcs = [lambda: i for i in range(3)]
[f() for f in funcs]        # [2, 2, 2] — all see the final i!
```

The closure captures `i` by reference, not value. By the time the lambdas are called, `i` is 2.

Fix by binding with a default argument:
```python
funcs = [lambda i=i: i for i in range(3)]
[f() for f in funcs]        # [0, 1, 2]
```

Or use a factory function:
```python
def make(i):
    return lambda: i
funcs = [make(i) for i in range(3)]
```

---

## 3. Lambdas

`lambda` creates an anonymous one-expression function.

```python
add = lambda a, b: a + b
add(2, 3)                   # 5

# Equivalent to:
def add(a, b):
    return a + b
```

Lambdas are limited: **one expression only**. No statements, no `return` keyword, no type annotations (cleanly).

### Idiomatic uses
```python
# Sorting
people.sort(key=lambda p: p.age)
nums.sort(key=lambda n: abs(n))

# Filtering
even = list(filter(lambda x: x % 2 == 0, nums))

# Mapping
doubled = list(map(lambda x: x * 2, nums))

# In a default callback
items.sort(key=lambda x: x.lower())     # case-insensitive sort
```

### When NOT to use lambdas
- If it's more than 30 characters, use `def`.
- If you'd name the lambda anyway, just use `def`.
- For simple `lambda x: x.attr`, prefer `operator.attrgetter("attr")`.
- For simple `lambda x: x[0]`, prefer `operator.itemgetter(0)`.

```python
from operator import attrgetter, itemgetter

people.sort(key=attrgetter("age"))
pairs.sort(key=itemgetter(1))
```

---

## 4. map, filter, reduce

The three classic functional tools. In Python, list comprehensions and generator expressions are usually clearer.

```python
nums = [1, 2, 3, 4, 5]

# map: apply function to each
list(map(lambda x: x * 2, nums))         # [2, 4, 6, 8, 10]
[x * 2 for x in nums]                     # same, more readable

# filter: keep items where function is truthy
list(filter(lambda x: x > 2, nums))      # [3, 4, 5]
[x for x in nums if x > 2]                # same, more readable

# reduce: collapse to a single value
from functools import reduce
reduce(lambda a, b: a + b, nums)          # 15
reduce(lambda a, b: a + b, nums, 100)     # 115 (with initial value)
sum(nums)                                  # for sums, just use sum()
```

`map` and `filter` return iterators in Python 3 — wrap in `list()` to materialize.

When you actually need them: passing built-in functions as callables (`map(int, strings)`), or when working with non-Pythonic APIs.

---

## 5. Decorators

A decorator is a function that wraps another function to modify its behavior.

```python
def shout(fn):
    def wrapper(*args, **kwargs):
        result = fn(*args, **kwargs)
        return result.upper() if isinstance(result, str) else result
    return wrapper

@shout
def greet(name):
    return f"hi, {name}"

greet("alice")           # "HI, ALICE"
```

`@shout` is sugar for `greet = shout(greet)`.

### Preserving metadata: `functools.wraps`
Without it, `greet.__name__` becomes `"wrapper"`. With it, you get the original.
```python
from functools import wraps

def shout(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        result = fn(*args, **kwargs)
        return result.upper() if isinstance(result, str) else result
    return wrapper
```

Always use `@wraps`. It preserves `__name__`, `__doc__`, `__wrapped__`, etc.

### Timing decorator
```python
import time
from functools import wraps

def timed(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper

@timed
def slow():
    time.sleep(1)
```

### Retry decorator
```python
def retry(times=3, delay=1):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == times - 1:
                        raise
                    print(f"retry {attempt + 1}: {e}")
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(times=3, delay=0.5)
def flaky_request():
    ...
```

Notice the three nested levels: outer factory takes parameters → returns the actual decorator → which returns the wrapper.

### Class-based decorators
```python
class Counter:
    def __init__(self, fn):
        self.fn = fn
        self.calls = 0

    def __call__(self, *args, **kwargs):
        self.calls += 1
        return self.fn(*args, **kwargs)

@Counter
def say_hi():
    return "hi"

say_hi(); say_hi(); say_hi()
say_hi.calls           # 3
```

### Decorating classes
You can decorate classes too. `@dataclass` is the most famous example.

### Built-in decorators worth knowing
- `@staticmethod`, `@classmethod`, `@property`, `@cached_property` (covered in `04_oop.md`).
- `@functools.cache`, `@functools.lru_cache(maxsize=128)` — memoization.
- `@functools.wraps` — for writing decorators.
- `@functools.singledispatch` — type-based function dispatch.
- `@dataclass`, `@dataclass(frozen=True, slots=True)`.

### Stacking
```python
@decorator_a
@decorator_b
def f(): ...
# Equivalent to: f = decorator_a(decorator_b(f))
# Applied bottom-up.
```

---

## 6. Generators

A function with `yield` becomes a generator — it produces values lazily.

```python
def count_up_to(n):
    i = 0
    while i < n:
        yield i
        i += 1

g = count_up_to(5)
type(g)              # <class 'generator'>

for x in g:
    print(x)         # 0, 1, 2, 3, 4

# Or explicitly:
g = count_up_to(3)
next(g)              # 0
next(g)              # 1
next(g)              # 2
next(g)              # StopIteration
```

Each `next(g)` runs the function up to the next `yield`, returns the value, then pauses. State is preserved between calls.

### Why generators?
- **Memory efficiency** — they produce values on demand.
- **Composable pipelines** — chain generators without materializing intermediates.
- **Infinite sequences** — possible because they're lazy.

```python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

from itertools import islice
list(islice(fibonacci(), 10))     # first 10 Fibonacci numbers
```

### Reading a huge file
```python
def read_lines(path):
    with open(path) as f:
        for line in f:
            yield line.rstrip()

for line in read_lines("big.log"):
    process(line)        # never holds the whole file in memory
```

### Generator pipelines
```python
def parse(lines):
    for line in lines:
        yield parse_one(line)

def filter_errors(records):
    for r in records:
        if r["level"] == "ERROR":
            yield r

def to_dicts(records):
    for r in records:
        yield {"time": r["t"], "msg": r["m"]}

result = to_dicts(filter_errors(parse(read_lines("app.log"))))
for r in result:
    save(r)
```

Each `for` consumes one item, threading through the pipeline. Memory stays constant regardless of file size.

### `yield from`
Delegate to another iterable.
```python
def chain(*iters):
    for it in iters:
        yield from it

list(chain([1, 2], [3, 4], (5, 6)))     # [1, 2, 3, 4, 5, 6]
```

### Generators are iterators
Anything you can `for`-loop over is iterable. A generator is one kind of iterator. (Lists, tuples, sets, dicts, strings, files are iterable too.)

### Send / throw / close
Generators support two-way communication, but it's rarely used in modern code. Async/await replaces most use cases.

---

## 7. Generator Expressions

Like list comprehensions but lazy.

```python
# List comprehension (eager — builds a list)
squares = [x ** 2 for x in range(1_000_000)]    # uses lots of memory

# Generator expression (lazy)
squares = (x ** 2 for x in range(1_000_000))    # no memory until iterated

# Sum a million squares without ever holding them all
total = sum(x ** 2 for x in range(1_000_000))   # parens optional when sole arg

# Any / all with short-circuit
any(x > 100 for x in nums)
all(isinstance(x, int) for x in nums)
```

When a function accepts an iterable, generator expressions are usually preferred over list comps for large data.

### Comparison

| Need | Use |
|---|---|
| Materialized list | `[x for x in it]` |
| One-time iteration / large data | `(x for x in it)` |
| Set or dict | `{x for x in it}` / `{k: v for ...}` |

---

## 8. itertools

Battery of useful iterator combinators.

```python
import itertools as it
```

### Building blocks
```python
it.count(start=0, step=1)         # 0, 1, 2, 3, ... infinite
it.cycle([1, 2, 3])               # 1, 2, 3, 1, 2, 3, ... infinite
it.repeat("x", 3)                  # "x", "x", "x"
it.repeat(0)                       # 0, 0, 0, ... infinite

# Always wrap infinite iterators with islice or zip to bound them
list(it.islice(it.count(10), 5))   # [10, 11, 12, 13, 14]
```

### Slicing
```python
list(it.islice([1,2,3,4,5,6,7], 2, 5))    # [3, 4, 5]
list(it.islice(it.count(), 5))             # [0, 1, 2, 3, 4]
```

### Chaining
```python
list(it.chain([1, 2], [3, 4]))             # [1, 2, 3, 4]
list(it.chain.from_iterable([[1,2], [3,4]]))  # [1, 2, 3, 4]
```

### Combinatorics
```python
list(it.permutations([1, 2, 3]))           # all orderings
list(it.permutations([1, 2, 3], 2))        # length-2 orderings
list(it.combinations([1, 2, 3, 4], 2))     # all pairs (order doesn't matter)
list(it.combinations_with_replacement([1, 2, 3], 2))
list(it.product([1, 2], ['a', 'b']))       # Cartesian product
list(it.product(range(3), repeat=2))       # tuples (i, j) for i in 0..2, j in 0..2
```

### Grouping
```python
data = [("a", 1), ("a", 2), ("b", 3), ("b", 4), ("a", 5)]
# groupby requires sorted input by key for grouping to be "global"
data.sort(key=lambda x: x[0])
for key, group in it.groupby(data, key=lambda x: x[0]):
    print(key, list(group))
# a [('a', 1), ('a', 2), ('a', 5)]
# b [('b', 3), ('b', 4)]
```

### Accumulate
```python
list(it.accumulate([1, 2, 3, 4]))                  # [1, 3, 6, 10] running sum
list(it.accumulate([1, 2, 3, 4], lambda a, b: a * b))  # [1, 2, 6, 24]
list(it.accumulate([3, 1, 4, 1, 5, 9, 2], max))         # running max
```

### Take while / drop while
```python
list(it.takewhile(lambda x: x < 5, [1, 2, 3, 4, 5, 6]))   # [1, 2, 3, 4]
list(it.dropwhile(lambda x: x < 5, [1, 2, 3, 4, 5, 6]))   # [5, 6]
```

### Filter false
```python
list(it.filterfalse(lambda x: x % 2, range(10)))   # evens
```

### Pairwise (3.10+)
```python
list(it.pairwise([1, 2, 3, 4]))                    # [(1,2), (2,3), (3,4)]
```

### Batched (3.12+)
```python
list(it.batched("ABCDEFG", 3))                     # [('A','B','C'), ('D','E','F'), ('G',)]
```

### Zipping unequal-length iterables
```python
list(it.zip_longest([1, 2, 3], ["a", "b"], fillvalue="?"))
# [(1, 'a'), (2, 'b'), (3, '?')]
```

---

## 9. functools

Higher-order helpers and decorators.

### `cache` and `lru_cache` — memoization
```python
from functools import cache, lru_cache

@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(100)                # fast — each value computed once

@lru_cache(maxsize=128)   # bounded cache
def expensive(x): ...

expensive.cache_info()
expensive.cache_clear()
```

### `reduce`
```python
from functools import reduce
reduce(lambda a, b: a + b, [1, 2, 3, 4])      # 10 (or just use sum())
reduce(lambda a, b: a * b, [1, 2, 3, 4], 1)   # 24
```

### `partial` — bind some args ahead of time
```python
from functools import partial

def power(base, exp):
    return base ** exp

square = partial(power, exp=2)
cube = partial(power, exp=3)

square(5)     # 25
cube(3)       # 27

# Useful with callbacks
sorted(items, key=partial(custom_compare, options=opts))
```

### `singledispatch` — function overloading by type
```python
from functools import singledispatch

@singledispatch
def render(arg):
    raise NotImplementedError

@render.register
def _(arg: int):
    return f"int: {arg}"

@render.register
def _(arg: str):
    return f"str: {arg!r}"

@render.register(list)
def _(arg):
    return f"list of {len(arg)}"

render(5)           # "int: 5"
render("hi")        # "str: 'hi'"
render([1, 2, 3])   # "list of 3"
```

### `wraps`
Covered in [decorators](#5-decorators).

### `total_ordering`
Covered in `04_oop.md` (Dunders).

---

## 10. Context Managers

Run setup before a block and teardown after, even if exceptions occur. The `with` statement.

```python
with open("file.txt") as f:
    data = f.read()
# f is closed automatically
```

### Why use them
- Resource cleanup (files, network connections, locks).
- Ensuring pairs of operations always happen (begin/commit, lock/unlock).
- Encapsulating state changes (e.g., temporary cwd change).

### Built-in / stdlib examples
```python
with open(path) as f: ...                         # files
with threading.Lock(): ...                         # acquire/release
with sqlite3.connect("db") as conn: ...            # transactions
with tempfile.TemporaryDirectory() as td: ...      # cleanup temp dir
```

### Custom context manager — class form
Define `__enter__` and `__exit__`:
```python
class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self          # what `as` binds to (optional)

    def __exit__(self, exc_type, exc_val, tb):
        elapsed = time.perf_counter() - self.start
        print(f"elapsed: {elapsed:.3f}s")
        # return True to suppress the exception (rarely)

with Timer() as t:
    big_computation()
```

`__exit__` receives the exception info if one was raised. Return `True` to swallow it; return `None`/`False` to let it propagate.

### Custom context manager — function form (preferred for simple cases)
```python
from contextlib import contextmanager

@contextmanager
def timer():
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"elapsed: {time.perf_counter() - start:.3f}s")

with timer():
    big_computation()
```

The code before `yield` is `__enter__`; after is `__exit__`. The `try/finally` ensures cleanup runs on exceptions.

### Useful `contextlib` helpers
```python
from contextlib import (
    contextmanager, asynccontextmanager,
    suppress, redirect_stdout, redirect_stderr,
    closing, nullcontext, ExitStack
)

# Suppress specific exceptions
with suppress(FileNotFoundError):
    os.remove("maybe.txt")

# Redirect prints into a string
import io
buf = io.StringIO()
with redirect_stdout(buf):
    print("captured")
buf.getvalue()                # "captured\n"

# nullcontext — a no-op context manager
# Useful for conditionally using a context manager
ctx = open(path) if path else nullcontext()
with ctx as f: ...

# ExitStack — dynamically combine context managers
with ExitStack() as stack:
    files = [stack.enter_context(open(p)) for p in paths]
    # All files closed when block ends
```

### Async context managers (`async with`)
Used in `asyncio` code:
```python
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        data = await response.text()
```

Implement with `__aenter__` / `__aexit__` or `@asynccontextmanager`.

---

## 11. Iterators in Depth

An **iterable** is anything you can `for`-loop over. An **iterator** is the object that does the iterating.

```python
my_list = [1, 2, 3]            # iterable
it = iter(my_list)              # iterator
next(it); next(it); next(it)    # 1, 2, 3
next(it)                         # StopIteration
```

### Iteration protocol
- `iter(obj)` returns an iterator.
- `next(iterator)` returns the next value or raises `StopIteration`.

You implement both with `__iter__` and `__next__`:
```python
class Countdown:
    def __init__(self, n):
        self.n = n

    def __iter__(self):
        return self

    def __next__(self):
        if self.n <= 0:
            raise StopIteration
        self.n -= 1
        return self.n + 1

for x in Countdown(3):
    print(x)            # 3, 2, 1
```

In practice, prefer generators — they're shorter:
```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1
```

### Iterable but not iterator
Lists, tuples, dicts, sets, strings — you can iterate them multiple times because each `iter()` call returns a fresh iterator.

```python
nums = [1, 2, 3]
for n in nums: print(n)
for n in nums: print(n)        # works again

g = (x for x in nums)
for n in g: print(n)
for n in g: print(n)            # nothing — iterator is exhausted
```

This is why generators / generator expressions can only be iterated once.

### Useful iterator-aware built-ins
- `enumerate(iterable, start=0)`
- `zip(*iterables, strict=False)`
- `sorted(iterable, key=None, reverse=False)` — returns a list
- `reversed(seq)` — for sequences
- `sum(iterable, start=0)`
- `min(iterable, key=None)`, `max(iterable, key=None)`
- `any(iterable)`, `all(iterable)`
- `len(seq)` — works on sized iterables
- `list(iterable)`, `tuple(iterable)`, `set(iterable)`, `dict(iterable_of_pairs)`

---

That's the functional toolbox. Together with classes (`04_oop.md`) and data structures (`03_data_structures.md`), this is most of Python's expressive power. Next: how to structure code across files in `06_errors_and_modules.md`.
