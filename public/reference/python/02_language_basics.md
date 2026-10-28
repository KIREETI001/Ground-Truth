# 02. Language Basics

> The core grammar of Python — what every line of Python code is built from.

---

## Table of Contents

1. [Hello, World](#1-hello-world)
2. [Comments & Docstrings](#2-comments--docstrings)
3. [Variables & Assignment](#3-variables--assignment)
4. [Indentation & Blocks](#4-indentation--blocks)
5. [Primitive Types](#5-primitive-types)
6. [Strings (the Essentials)](#6-strings-the-essentials)
7. [Numbers and Arithmetic](#7-numbers-and-arithmetic)
8. [Booleans, Truthy & Falsy](#8-booleans-truthy--falsy)
9. [None](#9-none)
10. [Operators](#10-operators)
11. [Type Conversion](#11-type-conversion)
12. [Control Flow: if / elif / else](#12-control-flow-if--elif--else)
13. [Pattern Matching: match / case](#13-pattern-matching-match--case)
14. [Loops: for and while](#14-loops-for-and-while)
15. [Functions](#15-functions)
16. [Scope: LEGB Rule](#16-scope-legb-rule)
17. [The Walrus Operator](#17-the-walrus-operator)
18. [Reading Input](#18-reading-input)
19. [Common Style Conventions](#19-common-style-conventions)

---

## 1. Hello, World

```python
print("Hello, World!")
```

Save that as `hello.py`, run `python hello.py`, and you're done. No `main` function required, no class wrapper, no semicolons.

Python doesn't make you write boilerplate to get going.

---

## 2. Comments & Docstrings

### Comments
```python
# This is a single-line comment.

x = 5  # Inline comment after code.

# There's no syntax for multi-line comments —
# you just use multiple single-line comments,
# or a triple-quoted string used as documentation.
```

### Docstrings
Triple-quoted strings at the top of a module, function, or class become *documentation*. They're accessible at runtime via `obj.__doc__` and used by tools like `help()`.

```python
"""Top of the file: module docstring describing what's in here."""

def add(a, b):
    """Return the sum of a and b.

    This is a multi-line docstring. The first line is a short summary;
    additional paragraphs go below.
    """
    return a + b

help(add)              # prints the docstring nicely
print(add.__doc__)
```

Two common docstring conventions:
- **Google style** — readable, with `Args:`, `Returns:`, `Raises:` sections.
- **NumPy style** — heavier with reStructuredText.
- **Sphinx style** — `:param:`, `:returns:` markers.

Pick one and stick with it. Tools like Sphinx, MkDocs, and `pdoc` use them to generate HTML documentation.

---

## 3. Variables & Assignment

Python has **no variable declarations**. You create a variable by assigning to it.

```python
name = "Alice"
age = 30
height = 1.75
is_active = True
```

The variable's type is whatever value it currently holds. You can rebind it:

```python
x = 5            # x is an int
x = "hello"      # x is now a str — perfectly legal
```

### Multiple assignment
```python
a, b, c = 1, 2, 3        # unpacking
x = y = z = 0            # chained — all bound to the same 0
```

### Swap without a temp
```python
a, b = b, a
```

### Unpacking with `*`
```python
first, *middle, last = [1, 2, 3, 4, 5]
# first = 1
# middle = [2, 3, 4]    (always a list)
# last = 5
```

### Naming conventions
- `lower_snake_case` for variables and functions.
- `PascalCase` for classes.
- `UPPER_SNAKE_CASE` for module-level constants.
- `_leading_underscore` for "internal" (a convention, not enforced).
- `__double_leading` triggers name mangling inside classes (rare; covered in `04_oop.md`).
- `__double_underscore__` (dunder) is reserved for the language ("magic methods").

### Names you can't use
Python reserved keywords (a partial list):
`False`, `None`, `True`, `and`, `as`, `assert`, `async`, `await`, `break`, `class`, `continue`, `def`, `del`, `elif`, `else`, `except`, `finally`, `for`, `from`, `global`, `if`, `import`, `in`, `is`, `lambda`, `nonlocal`, `not`, `or`, `pass`, `raise`, `return`, `try`, `while`, `with`, `yield`, `match`, `case` (soft keywords).

A trailing underscore is the convention for working around them:
```python
class_ = "MyClass"
```

---

## 4. Indentation & Blocks

Most languages use `{}` or `begin/end` to mark blocks. Python uses **indentation**. The rule:

- A consistent number of spaces (PEP 8 says four) starts a new block.
- Code at the same indentation level is part of the same block.
- A line ending in `:` introduces a new block.

```python
if age >= 18:
    print("adult")
    print("can vote")          # still inside the if
print("end of program")        # outside the if
```

**Don't mix tabs and spaces.** Pick one (spaces, per PEP 8) and stick with it. Most editors handle this automatically with a setting like "convert tabs to spaces".

You'll get used to indentation quickly. It forces clean formatting, which is half the reason Python code reads so well.

---

## 5. Primitive Types

Python has a small set of built-in types:

| Type | Example | Description |
|---|---|---|
| `int` | `42` | Arbitrary-precision integer. |
| `float` | `3.14` | 64-bit double-precision float. |
| `complex` | `2+3j` | Complex numbers (rarely used outside math). |
| `bool` | `True`, `False` | Booleans (technically a subclass of `int`). |
| `str` | `"hello"` | Immutable Unicode string. |
| `bytes` | `b"hello"` | Immutable byte sequence. |
| `bytearray` | `bytearray(b"hi")` | Mutable byte sequence. |
| `NoneType` | `None` | Single instance representing "no value". |
| `list` | `[1, 2, 3]` | Mutable ordered sequence. |
| `tuple` | `(1, 2, 3)` | Immutable ordered sequence. |
| `dict` | `{"k": "v"}` | Mutable mapping. |
| `set` | `{1, 2, 3}` | Mutable unordered unique collection. |
| `frozenset` | `frozenset([1,2])` | Immutable set. |

Use `type(x)` to see what something is:
```python
type(42)              # <class 'int'>
type("hello")         # <class 'str'>
type([1, 2, 3])       # <class 'list'>
isinstance(42, int)   # True — preferred for type checks
```

`isinstance` is preferred over `type(x) == int` because it works with subclasses (e.g., `bool` is a subclass of `int`).

---

## 6. Strings (the Essentials)

Strings are deep enough to deserve a section in `03_data_structures.md`, but here are the basics.

```python
single = 'hello'
double = "hello"
multi = """multi
line
string"""

# Concatenation
"hello" + " " + "world"     # "hello world"

# Repetition
"-" * 20                     # "--------------------"

# Membership
"ell" in "hello"             # True

# Length
len("hello")                 # 5

# Indexing & slicing
s = "Hello"
s[0]                         # "H"
s[-1]                        # "o" (negative indexes from the end)
s[1:4]                       # "ell"
s[::2]                       # "Hlo" (every 2nd char)
s[::-1]                      # "olleH" (reversed)
```

Strings are **immutable**: `s[0] = "X"` is a TypeError.

### f-strings (the recommended way to format)
```python
name = "Alice"
age = 30
greeting = f"Hi {name}, you are {age}."        # "Hi Alice, you are 30."

# Format specifiers
f"{3.14159:.2f}"                                # "3.14"
f"{1000000:,}"                                  # "1,000,000"
f"{42:>10}"                                     # "        42" (right-aligned, width 10)
f"{age:#04x}"                                   # "0x1e"

# Self-documenting (Python 3.8+)
f"{name=}"                                       # "name='Alice'"

# Expressions inside braces
f"{name.upper()} is {2 * age}"
```

### Older formatting (you'll still see it)
```python
"Hi %s, age %d" % (name, age)                   # printf-style; legacy
"Hi {}, age {}".format(name, age)               # .format() method
"Hi {n}, age {a}".format(n=name, a=age)
```

Use f-strings for new code.

### Common methods
```python
s = "  Hello, World!  "
s.strip()                    # "Hello, World!" (strips whitespace)
s.lower()                    # "  hello, world!  "
s.upper()
s.title()
s.replace("World", "Python")
s.split(",")                 # ["  Hello", " World!  "]
",".join(["a", "b", "c"])    # "a,b,c"
s.startswith("  H")          # True
s.endswith("!")              # False (trailing spaces)
s.find("World")              # index (or -1 if not found)
s.count("l")                 # 3
s.zfill(10)                  # "0000Hello," (pads with zeros)
s.isdigit()                  # False
"42".isdigit()               # True
```

More in `03_data_structures.md`.

---

## 7. Numbers and Arithmetic

```python
# Integers: arbitrary precision
big = 2 ** 200             # works fine
type(big)                  # int

# Underscores for readability (3.6+)
million = 1_000_000

# Floats: 64-bit IEEE 754 double
pi = 3.14159
small = 1e-10
inf = float("inf")
nan = float("nan")

# Operations
1 + 2                       # 3
10 - 3                      # 7
4 * 5                       # 20
10 / 3                      # 3.333... (float division — always float)
10 // 3                     # 3 (integer / floor division)
10 % 3                      # 1 (modulo)
-7 // 2                     # -4 (rounds toward -inf, not zero!)
2 ** 10                     # 1024 (exponent)

abs(-5)                     # 5
round(3.7)                  # 4
round(3.14159, 2)           # 3.14
divmod(17, 5)               # (3, 2)
pow(2, 10)                  # 1024 (same as 2 ** 10)
pow(2, 10, 1000)            # 24 — efficient modular exponentiation
```

### Float precision
Floats have the standard rounding issues:
```python
0.1 + 0.2 == 0.3            # False!
0.1 + 0.2                   # 0.30000000000000004

# Use math.isclose for comparison
import math
math.isclose(0.1 + 0.2, 0.3)   # True
```

For money or anything where exactness matters, use `decimal.Decimal` or `fractions.Fraction`:
```python
from decimal import Decimal
Decimal("0.1") + Decimal("0.2")     # Decimal('0.3')
```

### Numeric literals
```python
255                  # decimal
0xff                 # hex (255)
0o377                # octal (255)
0b11111111           # binary (255)
1.5e3                # 1500.0 (scientific)
```

---

## 8. Booleans, Truthy & Falsy

`True` and `False` are the only Boolean values. They're capitalized.

```python
is_active = True
is_admin = False
```

Booleans are actually a subclass of `int`:
```python
True + True              # 2
False == 0               # True
isinstance(True, int)    # True
```

### Truthy and falsy values

The following are **falsy**:
- `False`
- `None`
- `0`, `0.0`, `0j`
- Empty containers: `""`, `[]`, `()`, `{}`, `set()`
- Objects whose `__bool__` returns `False` or `__len__` returns `0`

**Everything else** is truthy.

This lets you write idiomatic checks:
```python
# Instead of:
if len(my_list) > 0:
    ...

# Pythonic:
if my_list:
    ...

# Or:
name = user_input or "Anonymous"     # fallback if user_input is empty/None
```

### Boolean operators
```python
True and False           # False
True or False            # True
not True                 # False

# Short-circuit: evaluation stops as soon as the result is known
def expensive():
    print("called")
    return True

False and expensive()     # never prints — short-circuits
True or expensive()        # never prints

# Return value is the actual operand (not necessarily True/False)
"hello" and "world"        # "world" (both truthy, returns last)
"" or "default"            # "default" (left is falsy, returns right)
None or 0 or "found"        # "found"
```

### Comparison operators chain
```python
0 < x < 100              # equivalent to (0 < x) and (x < 100)
a == b == c              # all three equal
```

---

## 9. None

`None` is Python's null. It's a singleton — there's only one `None`.

```python
result = None
if result is None:
    print("no result")

# DON'T use == for None:
if result == None:    # works but discouraged
if result is None:    # preferred — faster, idiomatic, can't be overridden
```

`None` is the default return value of functions that don't return anything explicitly:
```python
def shout(msg):
    print(msg.upper())

x = shout("hi")    # x is None
```

---

## 10. Operators

### Arithmetic
`+`, `-`, `*`, `/`, `//`, `%`, `**`, unary `-` and `+`.

### Comparison
`==`, `!=`, `<`, `>`, `<=`, `>=`. Returns booleans.

### Identity
`is`, `is not`. Checks "same object in memory", not "equal value":
```python
a = [1, 2, 3]
b = [1, 2, 3]
a == b           # True (same value)
a is b           # False (different objects)
```

Use `is` for `None`, `True`, `False`, and singletons. Use `==` for everything else.

### Membership
`in`, `not in`.
```python
3 in [1, 2, 3]               # True
"ell" in "hello"              # True
"name" in {"name": "Alice"}   # True (checks dict keys)
```

### Logical
`and`, `or`, `not` (covered above).

### Bitwise
`&` (AND), `|` (OR), `^` (XOR), `~` (NOT), `<<` (left shift), `>>` (right shift).
```python
0b1010 & 0b1100     # 0b1000 (8)
0b1010 | 0b0101     # 0b1111 (15)
1 << 4              # 16
```

### Assignment
`=`, `+=`, `-=`, `*=`, `/=`, `//=`, `%=`, `**=`, `&=`, `|=`, `^=`, `<<=`, `>>=`.
```python
x = 5
x += 3              # x is now 8
```

### Operator precedence
Python follows the math conventions you'd expect (multiplication before addition, parentheses override). When in doubt, **add parentheses**. Don't try to memorize a precedence table; readers shouldn't have to either.

---

## 11. Type Conversion

```python
int("42")                # 42
int("ff", 16)            # 255 (with base)
int(3.7)                 # 3 (truncates toward zero)
float("3.14")            # 3.14
float("inf")             # inf
str(42)                  # "42"
bool(0)                  # False
bool("anything")          # True
list("abc")              # ['a', 'b', 'c']
tuple([1, 2, 3])         # (1, 2, 3)
set([1, 1, 2, 3])        # {1, 2, 3}
dict([("a", 1), ("b", 2)])  # {"a": 1, "b": 2}
```

Conversion can fail:
```python
int("not a number")      # raises ValueError
```

Wrap in try/except if input is untrusted, or use libraries like `pydantic` for structured validation.

---

## 12. Control Flow: if / elif / else

```python
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"
```

### Ternary expression
```python
status = "adult" if age >= 18 else "minor"

# Don't nest these — they get unreadable.
# Use a multi-branch if statement instead.
```

### Conditional inside list comprehension
Covered in detail in `03_data_structures.md`:
```python
evens = [x for x in nums if x % 2 == 0]
labels = ["even" if x % 2 == 0 else "odd" for x in nums]
```

### `pass` — explicit do-nothing
Python doesn't allow empty blocks. Use `pass`:
```python
if user.is_admin:
    pass        # TODO: handle admin specially later
else:
    do_normal_thing()
```

---

## 13. Pattern Matching: match / case

Added in Python 3.10. Much more powerful than `switch` in other languages.

```python
def describe(value):
    match value:
        case 0:
            return "zero"
        case int(n) if n > 0:           # type pattern + guard
            return f"positive int: {n}"
        case int():
            return "negative int"
        case str() as s if s.startswith("hello"):
            return f"greeting: {s}"
        case [x, y]:                     # sequence of length 2
            return f"pair: ({x}, {y})"
        case [first, *rest]:
            return f"list starting with {first}, then {rest}"
        case {"name": name, "age": age}:  # mapping with these keys
            return f"{name}, {age}"
        case Point(x=0, y=0):            # class pattern
            return "origin"
        case _:                          # wildcard (default)
            return "unknown"
```

Patterns supported:
- **Literal**: `case 42:`, `case "hello":`, `case None:`.
- **Variable capture**: `case x:` (matches anything, binds to `x`).
- **Wildcard**: `case _:`.
- **Sequence**: `case [a, b, c]`, `case [a, *rest]`, `case (a, b)`.
- **Mapping**: `case {"key": value}`.
- **Class**: `case ClassName(attr=value)`.
- **Guards**: `case x if x > 0:`.
- **OR patterns**: `case 1 | 2 | 3:`.
- **AS patterns**: `case (Point(x=1) | Point(x=2)) as p:`.

Use it whenever you have a complex branching decision based on structure or type — much cleaner than nested `if isinstance(...)` chains.

---

## 14. Loops: for and while

### for
Python's `for` always iterates over something. There's no `for i = 0; i < 10; i++` syntax — use `range()` instead.

```python
for i in range(10):           # 0, 1, 2, ..., 9
    print(i)

for i in range(2, 10, 2):     # start, stop, step → 2, 4, 6, 8
    print(i)

for item in ["apple", "banana", "cherry"]:
    print(item)

for ch in "hello":
    print(ch)

for key, value in my_dict.items():
    print(key, value)

# enumerate gives you the index too
for i, item in enumerate(my_list):
    print(i, item)

# zip iterates two (or more) iterables in parallel
for name, age in zip(names, ages):
    print(name, age)
```

### while
```python
count = 0
while count < 10:
    print(count)
    count += 1

while True:
    user_input = input("> ")
    if user_input == "quit":
        break
```

### break and continue
```python
for x in range(20):
    if x < 5:
        continue        # skip the rest of this iteration
    if x > 15:
        break           # exit the loop entirely
    print(x)
```

### `else` on loops (a quirky feature)
The `else` clause on a loop runs **if the loop completes without breaking**.
```python
for n in [1, 3, 5, 7]:
    if n == 4:
        print("found 4")
        break
else:
    print("4 not found")    # this runs
```

Useful for search loops, but readers often miss it. Often clearer to refactor into a function with `return`.

### Looping idioms
```python
# Reverse iteration
for x in reversed(my_list):
    ...

# Sorted iteration
for x in sorted(my_list):
    ...

# Sort by key
for person in sorted(people, key=lambda p: p.age):
    ...

# Iterate dict values / keys
for v in my_dict.values():
    ...

# Loop with index AND value
for i, item in enumerate(my_list, start=1):
    ...
```

---

## 15. Functions

```python
def greet(name):
    """Return a greeting for `name`."""
    return f"Hello, {name}!"

print(greet("Alice"))
```

### Default arguments
```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Alice")                       # "Hello, Alice!"
greet("Bob", "Hi")                   # "Hi, Bob!"
greet("Carol", greeting="Hey")        # keyword argument
```

> ⚠️ **Never use a mutable default**:
> ```python
> def bad(items=[]):       # WRONG
>     items.append(1)
>     return items
> ```
> The list is shared across all calls — bug magnet. Use `None`:
> ```python
> def good(items=None):
>     if items is None:
>         items = []
>     items.append(1)
>     return items
> ```

### Positional, keyword, and required
```python
def f(a, b, c=10, *, d, e=5):
    # a, b are positional or keyword
    # c has a default
    # everything after * must be a keyword argument
    # d is required (keyword-only, no default)
    # e is keyword-only with default
    ...

f(1, 2, d=3)              # OK
f(1, 2, 3, d=4)           # c=3, d=4
f(1, 2, d=4, c=3)         # OK, all by keyword
f(1, 2, 3, 4)             # TypeError — d wasn't passed as keyword
```

### `*args` and `**kwargs`
```python
def f(*args, **kwargs):
    print(args)            # tuple of positional args
    print(kwargs)          # dict of keyword args

f(1, 2, 3, name="Alice", age=30)
# args = (1, 2, 3)
# kwargs = {"name": "Alice", "age": 30}

# Forwarding
def wrapper(*args, **kwargs):
    return inner_fn(*args, **kwargs)
```

### Positional-only parameters (3.8+)
Parameters before `/` cannot be passed by name. Used to lock in API:
```python
def f(a, b, /, c, d):
    ...

f(1, 2, 3, 4)         # OK
f(1, 2, c=3, d=4)     # OK
f(a=1, b=2, c=3, d=4) # TypeError — a, b are positional-only
```

### Returning multiple values
```python
def min_max(values):
    return min(values), max(values)

mn, mx = min_max([1, 5, 3])

# (it's actually returning a tuple)
result = min_max([1, 5, 3])
print(result)         # (1, 5)
```

### Type hints (more in `04_oop.md`)
Hints describe expected types but aren't enforced at runtime — they're for tools (mypy, IDEs) and humans.
```python
def add(a: int, b: int) -> int:
    return a + b

def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"
```

### Lambdas — anonymous one-liners
```python
square = lambda x: x ** 2
square(5)        # 25

# Most useful inline:
nums.sort(key=lambda n: -n)     # sort descending
people.sort(key=lambda p: (p.last_name, p.first_name))
```

Lambdas can only contain a single expression — no statements, no `return` keyword. For anything more complex, use `def`. (More on functional patterns in `05_functional.md`.)

---

## 16. Scope: LEGB Rule

Python looks up names in this order:

1. **L** — Local: the current function.
2. **E** — Enclosing: any enclosing function (closures).
3. **G** — Global: the current module / file.
4. **B** — Built-in: `print`, `len`, `int`, etc.

```python
x = 10              # global

def outer():
    x = 20          # enclosing (relative to inner)

    def inner():
        x = 30      # local
        print(x)    # 30

    inner()
    print(x)        # 20

outer()
print(x)            # 10
```

### `global` and `nonlocal`
By default, assigning to a name inside a function creates a **local** name. To modify an outer one, declare it:

```python
counter = 0

def increment():
    global counter
    counter += 1     # without `global`, this would create a local `counter`

def make_counter():
    n = 0
    def inc():
        nonlocal n   # modify the enclosing function's n
        n += 1
        return n
    return inc
```

Best practice: minimize `global`. Functions that mutate global state are hard to test and reason about. Prefer passing values in and returning them out.

---

## 17. The Walrus Operator

`:=` (Python 3.8+) lets you assign as part of an expression:

```python
# Avoid computing the value twice
while (chunk := file.read(8192)):
    process(chunk)

# Filter and capture
if (n := len(data)) > 100:
    print(f"too big: {n}")

# Comprehension
results = [y for x in data if (y := compute(x)) is not None]
```

Don't overuse — it can hurt readability. Use when it actually saves an extra line.

---

## 18. Reading Input

### From the user (terminal)
```python
name = input("What's your name? ")     # always returns str
age = int(input("Age: "))              # convert manually
```

### From command-line arguments
```python
import sys
print(sys.argv)         # list, sys.argv[0] is the script name

# For real CLIs, use argparse (covered in 07_stdlib.md):
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--name", required=True)
args = parser.parse_args()
print(args.name)
```

### From environment variables
```python
import os
api_key = os.environ.get("OPENAI_API_KEY")
if api_key is None:
    raise RuntimeError("Set OPENAI_API_KEY")

# Or os.environ["OPENAI_API_KEY"] — raises KeyError if missing
```

---

## 19. Common Style Conventions

The official style guide is **[PEP 8](https://peps.python.org/pep-0008/)**. The highlights:

- **Indentation**: 4 spaces. No tabs.
- **Line length**: 79 chars (PEP 8) or 88 (Black's default) or 100–120 (many teams). Pick one.
- **Imports**: each on its own line, at the top of the file, grouped:
  ```python
  import os                          # stdlib
  import sys

  import requests                    # third-party
  import pandas as pd

  from myproject.utils import helper  # local
  ```
- **Whitespace around operators**: `a = 1`, not `a=1`. Except keyword arguments: `f(x=1, y=2)`.
- **No trailing whitespace.** Most editors strip it for you.
- **Two blank lines** between top-level definitions; one between methods.
- **Docstrings** for public modules, functions, classes, methods.

You don't need to memorize PEP 8 — just use a formatter (covered in `14_testing_and_quality.md`):
- **Black** — opinionated, deterministic, widely used.
- **Ruff format** — Rust-based, fast, Black-compatible.

And a linter:
- **Ruff** — replaces flake8, isort, pylint for most cases.

That's it for the language basics. Most of Python's expressive power comes from its data structures and the functions that operate on them — covered next in `03_data_structures.md`.
