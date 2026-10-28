# 04. Object-Oriented Python & Type System

> Classes, inheritance, dataclasses, properties, ABCs, Protocols, and the type-hint system.

---

## Table of Contents

1. [Mental Model](#1-mental-model)
2. [Defining a Class](#2-defining-a-class)
3. [The `self` Parameter](#3-the-self-parameter)
4. [Instance vs Class Attributes](#4-instance-vs-class-attributes)
5. [Static and Class Methods](#5-static-and-class-methods)
6. [Inheritance](#6-inheritance)
7. [Method Resolution Order (MRO)](#7-method-resolution-order-mro)
8. [Dunder ("Magic") Methods](#8-dunder-magic-methods)
9. [Properties (`@property`)](#9-properties-property)
10. [Encapsulation: `_` and `__`](#10-encapsulation-_-and-__)
11. [Abstract Base Classes (ABCs)](#11-abstract-base-classes-abcs)
12. [Dataclasses](#12-dataclasses)
13. [Type Hints](#13-type-hints)
14. [Generics](#14-generics)
15. [Protocols (Structural Typing)](#15-protocols-structural-typing)
16. [Enums](#16-enums)
17. [Choosing the Right Abstraction](#17-choosing-the-right-abstraction)

---

## 1. Mental Model

Python is object-oriented "all the way down" — everything is an object: numbers, functions, modules, classes themselves. But Python doesn't force you to use OOP. Plenty of perfectly good Python is just functions and dicts.

When to reach for a class:
- You need to bundle data with the operations on it (state + behavior).
- The same group of fields appears in many places.
- You want a clear vocabulary (`User.deactivate()` is more discoverable than `deactivate_user(user_dict)`).
- You're modeling a domain with rich relationships.

When *not* to:
- A simple function will do.
- You have data without behavior — use a `dataclass` or `NamedTuple` instead.
- You're shoehorning Java patterns into Python (don't write `AbstractSingletonFactoryBuilder` here).

---

## 2. Defining a Class

```python
class Person:
    """Represents a person."""

    def __init__(self, name: str, age: int) -> None:
        """Initialize a Person."""
        self.name = name
        self.age = age

    def greet(self) -> str:
        return f"Hi, I'm {self.name}"

    def __repr__(self) -> str:
        return f"Person(name={self.name!r}, age={self.age})"


# Create and use
alice = Person("Alice", 30)
print(alice.greet())            # Hi, I'm Alice
print(alice)                     # Person(name='Alice', age=30)
print(alice.name, alice.age)     # Alice 30
alice.age = 31                   # attribute is mutable by default
```

### Naming
- Class names: `PascalCase`.
- Methods and attributes: `lower_snake_case`.
- "Private" attributes: prefix with `_` (convention only).
- "Name-mangled" attributes: prefix with `__` (covered below).
- Dunder methods (`__init__`, `__str__`, etc.) are Python-defined "magic methods" — don't invent your own.

### The `__init__` method
Runs automatically when you write `Person(...)`. It's not the constructor in the OO sense — Python creates the empty object via `__new__`, then calls `__init__` to set it up. You rarely override `__new__`.

If you don't define `__init__`, the class gets an implicit empty one.

```python
class Empty:
    pass

e = Empty()       # works fine
e.x = 5           # can still add attributes dynamically
```

---

## 3. The `self` Parameter

Every method has `self` as the first parameter. `self` is the instance the method was called on.

```python
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1

c = Counter()
c.increment()       # Python translates to Counter.increment(c)
c.increment()
print(c.count)       # 2
```

`self` is not a keyword — you could name it anything, but **don't**. Python style says `self`. Always.

The unique-per-instance part is `self.x = ...`. Without `self.`, you'd be creating a local variable inside the method that vanishes when the method returns.

---

## 4. Instance vs Class Attributes

```python
class Dog:
    species = "Canis familiaris"        # class attribute — shared
    legs = 4                              # class attribute — shared

    def __init__(self, name):
        self.name = name                   # instance attribute — unique per Dog

rex = Dog("Rex")
spot = Dog("Spot")

rex.name                  # "Rex"
spot.name                 # "Spot"
rex.species               # "Canis familiaris"
spot.species              # "Canis familiaris"  (same object!)
Dog.species               # also "Canis familiaris"

# Modifying through instance creates a new instance attribute:
rex.species = "Wolf"      # only rex changes
spot.species              # still "Canis familiaris"
```

**Gotcha**: mutable class attributes are shared.
```python
class Dog:
    tricks = []            # shared list!

    def add_trick(self, trick):
        self.tricks.append(trick)

a = Dog(); b = Dog()
a.add_trick("sit")
print(b.tricks)            # ['sit'] — surprise!

# Fix: initialize mutable state in __init__
class Dog:
    def __init__(self):
        self.tricks = []     # one list per instance
```

---

## 5. Static and Class Methods

### Regular method — takes `self`
```python
class MyClass:
    def regular(self):
        ...
```

### Class method — takes `cls`
Operates on the class, not an instance. Useful for alternative constructors and class-level state.
```python
from datetime import date

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    @classmethod
    def from_birth_year(cls, name, year):
        return cls(name, date.today().year - year)

p = Person.from_birth_year("Alice", 1995)
```

`cls` is the class itself. Using `cls` instead of the literal `Person` makes the method work correctly when inherited.

### Static method — takes nothing special
Just a function namespaced inside the class. Doesn't get `self` or `cls`.
```python
class MathUtils:
    @staticmethod
    def add(a, b):
        return a + b

MathUtils.add(2, 3)        # 5
```

Most uses of `@staticmethod` could be module-level functions. Use it when the function is logically tied to the class but doesn't need any of its state.

---

## 6. Inheritance

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self) -> str:
        return "generic sound"


class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)         # call parent init
        self.breed = breed

    def speak(self) -> str:
        return f"{self.name} says Woof!"


rex = Dog("Rex", "Labrador")
print(rex.speak())          # Rex says Woof!
print(rex.name)              # Rex (inherited from Animal)
isinstance(rex, Dog)         # True
isinstance(rex, Animal)      # True
issubclass(Dog, Animal)      # True
```

### `super()`
Calls a method on the parent class. Mostly used in `__init__` and overridden methods.
```python
def speak(self):
    return super().speak() + " (barked)"
```

### Multiple inheritance
Python supports it (unlike Java/C#):
```python
class Mixin:
    def log(self, msg):
        print(f"[log] {msg}")

class Service(Mixin, BaseService):
    pass
```

Powerful but easy to abuse. The most common legitimate use: **mixins** — small classes that add focused behavior to others. If you find yourself with diamond hierarchies, simplify first.

### Composition over inheritance
A common piece of advice: when you're tempted to inherit just to reuse code, consider holding a reference to the other object instead.

```python
# Inheritance approach
class JsonLogger(FileLogger): ...

# Composition approach
class JsonLogger:
    def __init__(self, file_logger):
        self._logger = file_logger
    def log(self, data):
        self._logger.log(json.dumps(data))
```

Composition is more flexible — you can swap implementations at runtime.

---

## 7. Method Resolution Order (MRO)

With multiple inheritance, which parent's method wins? Python uses **C3 linearization**.

```python
class A:
    def greet(self): return "A"

class B(A):
    def greet(self): return "B"

class C(A):
    def greet(self): return "C"

class D(B, C):
    pass

D().greet()         # "B"
D.__mro__           # (D, B, C, A, object)
```

Read left-to-right. For most code, you don't need to think about this. When you do — usually because of multiple inheritance — `Class.__mro__` shows the order.

---

## 8. Dunder ("Magic") Methods

Methods named `__like_this__` are hooks Python calls automatically. They let your class integrate with built-in syntax.

### Core ones
```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        """Developer-facing string. Should look like valid Python."""
        return f"Vector({self.x}, {self.y})"

    def __str__(self):
        """User-facing string. Falls back to __repr__ if not defined."""
        return f"({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __hash__(self):
        return hash((self.x, self.y))

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, scalar):
        return Vector(self.x * scalar, self.y * scalar)

    def __lt__(self, other):
        return (self.x ** 2 + self.y ** 2) < (other.x ** 2 + other.y ** 2)

    def __len__(self):
        return 2

    def __iter__(self):
        yield self.x
        yield self.y

    def __getitem__(self, i):
        return (self.x, self.y)[i]

    def __bool__(self):
        return self.x != 0 or self.y != 0


a = Vector(1, 2)
b = Vector(3, 4)
print(a + b)             # Vector(4, 6)
print(a == Vector(1, 2)) # True
print(len(a))            # 2
print(list(a))           # [1, 2]
print(a[0])              # 1
print(bool(Vector(0,0))) # False
```

### Common dunders by category

| Category | Methods |
|---|---|
| Construction / destruction | `__init__`, `__new__`, `__del__` |
| Representation | `__repr__`, `__str__`, `__format__`, `__bytes__` |
| Comparison | `__eq__`, `__ne__`, `__lt__`, `__le__`, `__gt__`, `__ge__` |
| Hashing | `__hash__` |
| Arithmetic | `__add__`, `__sub__`, `__mul__`, `__truediv__`, `__floordiv__`, `__mod__`, `__pow__`, `__neg__`, `__abs__` |
| Reflected arithmetic | `__radd__`, `__rsub__`, ... (called when left operand doesn't support the op) |
| In-place | `__iadd__`, `__isub__`, ... (for `+=`, `-=`, ...) |
| Sequence/container | `__len__`, `__getitem__`, `__setitem__`, `__delitem__`, `__contains__`, `__iter__`, `__reversed__` |
| Callable | `__call__` |
| Context manager | `__enter__`, `__exit__` |
| Attribute access | `__getattr__`, `__setattr__`, `__delattr__`, `__getattribute__` |
| Descriptors | `__get__`, `__set__`, `__delete__` |
| Truthiness | `__bool__` |
| Class hook | `__init_subclass__`, `__set_name__` |

### `functools.total_ordering`
Define `__eq__` and one ordering method (`__lt__`); the decorator fills in the rest.
```python
from functools import total_ordering

@total_ordering
class Temperature:
    def __init__(self, kelvin):
        self.kelvin = kelvin
    def __eq__(self, other):
        return self.kelvin == other.kelvin
    def __lt__(self, other):
        return self.kelvin < other.kelvin
```

### Callable objects
```python
class Multiplier:
    def __init__(self, factor):
        self.factor = factor
    def __call__(self, x):
        return x * self.factor

times3 = Multiplier(3)
times3(10)             # 30
```

Useful for stateful "function-like" things — preprocessors, accumulators, decorators.

---

## 9. Properties (`@property`)

Lets you expose method-like access as if it were an attribute. Use to compute on the fly or validate on write.

```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("radius cannot be negative")
        self._radius = value

    @property
    def area(self):
        return 3.14159 * self._radius ** 2


c = Circle(5)
c.radius              # 5 — calls getter
c.radius = 10         # calls setter (with validation)
c.area                # computed property — no parentheses!
c.area = 100          # AttributeError — no setter defined
```

The point: start with a plain attribute; turn it into a property later if you need validation or computation — without changing how callers use it.

### `@cached_property`
Compute once on first access, then cache.
```python
from functools import cached_property

class Doc:
    def __init__(self, text):
        self.text = text

    @cached_property
    def word_count(self):
        print("computing")
        return len(self.text.split())

d = Doc("hello world")
d.word_count    # prints "computing", returns 2
d.word_count    # returns 2 — no recomputation
```

---

## 10. Encapsulation: `_` and `__`

Python has **no true private members**. The conventions:

- `name` — public.
- `_name` — "internal". Treat as private; tools and humans will respect it.
- `__name` — name-mangled. Becomes `_ClassName__name`. Used to prevent accidental collision in subclasses, NOT for "real privacy".
- `__name__` — dunder (reserved for Python).

```python
class Account:
    def __init__(self):
        self.owner = "Alice"          # public
        self._balance = 0               # internal — by convention
        self.__pin = "1234"             # name-mangled

a = Account()
a.owner              # OK
a._balance           # works, but you've been warned
a.__pin              # AttributeError!
a._Account__pin      # "1234" — that's the mangled name
```

This is enforced socially, not by the language. The Python community's view: "we're all consenting adults here." If you want it private, name it with an underscore and let calling code respect that.

---

## 11. Abstract Base Classes (ABCs)

Force subclasses to implement specific methods. Acts as a contract.

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        ...

    @abstractmethod
    def perimeter(self) -> float:
        ...

    def describe(self):
        return f"{type(self).__name__} with area {self.area()}"


class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return 3.14159 * self.radius ** 2

    def perimeter(self):
        return 2 * 3.14159 * self.radius


Shape()        # TypeError — can't instantiate abstract class
c = Circle(5)  # OK
```

The standard library defines many ABCs in `collections.abc`: `Iterable`, `Iterator`, `Container`, `Sized`, `Hashable`, `Mapping`, `MutableMapping`, `Sequence`, `Set`, etc.

```python
from collections.abc import Mapping

isinstance({"a": 1}, Mapping)        # True
```

ABCs are useful when:
- You want runtime checks (`isinstance`).
- You want to force a contract on subclasses.

For pure typing without inheritance, prefer `Protocol` (see [section 15](#15-protocols-structural-typing)).

---

## 12. Dataclasses

Boilerplate-free way to write "data holder" classes. Added in Python 3.7.

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

p = Point(3, 4)
print(p)             # Point(x=3, y=4)
p == Point(3, 4)     # True
p.x                  # 3
```

The decorator auto-generates `__init__`, `__repr__`, and `__eq__` based on the type annotations.

### Common options
```python
from dataclasses import dataclass, field
from typing import List

@dataclass(frozen=True, order=True)
class Item:
    name: str
    price: float
    tags: List[str] = field(default_factory=list)     # mutable default
    quantity: int = 1                                   # simple default
    _secret: str = field(default="", repr=False, compare=False)
```

Options:
- `frozen=True` — instances are immutable (and hashable).
- `order=True` — generates `<`, `<=`, `>`, `>=` based on fields in order.
- `kw_only=True` (3.10+) — make all fields keyword-only.
- `slots=True` (3.10+) — use `__slots__` for memory efficiency.

### Why `field(default_factory=...)`?
Same gotcha as mutable function defaults — `tags: list = []` would share the list across instances. `default_factory=list` calls `list()` per instance.

### Methods on dataclasses
You can still add methods normally:
```python
@dataclass
class Person:
    name: str
    age: int

    def greet(self):
        return f"Hi, I'm {self.name}"

    @property
    def is_adult(self):
        return self.age >= 18
```

### `__post_init__`
Runs after `__init__`. Useful for validation or derived fields:
```python
@dataclass
class Range:
    low: int
    high: int

    def __post_init__(self):
        if self.low > self.high:
            raise ValueError("low > high")
```

### Inheritance
Works, but you have to be careful with defaults — fields without defaults can't follow fields with defaults.

### Conversion
```python
from dataclasses import asdict, astuple

asdict(p)          # {'x': 3, 'y': 4}
astuple(p)         # (3, 4)
```

### When to use what for data containers

| | When to use |
|---|---|
| `dict` | Quick scripting; unstructured / dynamic data |
| `tuple` / `namedtuple` | Tiny immutable records |
| `@dataclass` | Most cases — typed, structured, with methods |
| `pydantic.BaseModel` | When you need validation (parsing API responses, config) |
| Full `class` | When you need complex behavior or invariants |

`pydantic` is the third-party library for runtime-validated data classes — covered in `11_web.md`.

---

## 13. Type Hints

Hints describe types but **don't enforce them at runtime**. They power IDE completion, static checkers (mypy, pyright), refactoring tools, and documentation.

```python
def add(a: int, b: int) -> int:
    return a + b

def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"
```

### Built-in collection types (3.9+)
You can use lowercase built-ins directly:
```python
def first(items: list[int]) -> int | None:
    return items[0] if items else None

def lookup(d: dict[str, int], key: str) -> int:
    return d[key]
```

Before Python 3.9 you needed `from typing import List, Dict, Optional` — these still work, but the new lowercase forms are simpler.

### `Optional` and `Union`
```python
from typing import Optional, Union

def find(id: int) -> Optional[User]: ...       # User or None
def find(id: int) -> User | None: ...           # same, 3.10+

def format(x: Union[int, str]) -> str: ...     # int or str
def format(x: int | str) -> str: ...            # same, 3.10+
```

### Callable types
```python
from typing import Callable

def apply(fn: Callable[[int, int], int], a: int, b: int) -> int:
    return fn(a, b)
```

`Callable[[arg_types], return_type]`.

### Common typing constructs
```python
from typing import Any, Iterable, Iterator, Mapping, Sequence, Tuple, TypedDict, Literal, Final, ClassVar

# Iterable — anything you can for-loop
def total(nums: Iterable[int]) -> int:
    return sum(nums)

# Sequence — supports len(), indexing
def first(seq: Sequence[int]) -> int:
    return seq[0]

# Mapping — read-only dict-like
def get_age(people: Mapping[str, int], name: str) -> int:
    return people[name]

# Tuple — fixed size or homogeneous
fixed: Tuple[str, int, float] = ("Alice", 30, 5.5)
varied: tuple[int, ...] = (1, 2, 3, 4)

# Literal — exact values
def set_align(align: Literal["left", "center", "right"]) -> None: ...

# Final — can't be reassigned
MAX_USERS: Final = 100

# ClassVar — class attribute, not instance
class C:
    count: ClassVar[int] = 0
    name: str

# TypedDict — typed dict shape
class UserDict(TypedDict):
    name: str
    age: int
    email: str
```

### Any and unknown
- `Any` — opt out of type checking. Use sparingly.
- `object` — accept anything, but you can only do `object` operations.

### Forward references
For self-referencing types or types not yet defined:
```python
class Node:
    def __init__(self, val: int, next: "Node | None" = None):
        self.val = val
        self.next = next

# Or, with __future__ import or PEP 695
from __future__ import annotations

class Node:
    def __init__(self, val: int, next: Node | None = None):
        ...
```

`from __future__ import annotations` makes all annotations lazy strings — fixes most forward-reference problems.

### Type checking
Hints alone don't do anything. Run a checker:
```bash
pip install mypy
mypy src/
```

```bash
pip install pyright
pyright src/
```

VS Code's Pylance extension uses pyright internally.

### Should you type-hint everything?
- **Yes** for library code and public APIs.
- **Yes** for large applications and team code.
- **Yes** for code that touches untrusted input.
- **Optional** for one-off scripts.

The benefit is mostly tooling support — autocomplete, refactoring safety, catching bugs at edit time.

### NewType
Distinguish types that share a representation:
```python
from typing import NewType
UserId = NewType("UserId", int)

def get_user(uid: UserId) -> User: ...

uid: UserId = UserId(42)
get_user(42)          # type error — int is not UserId
get_user(uid)         # OK
```

Useful for primitive-obsession problems.

---

## 14. Generics

Define a class or function parameterized by a type.

### Pre-3.12 syntax
```python
from typing import TypeVar, Generic

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
    def pop(self) -> T:
        return self._items.pop()

s: Stack[int] = Stack()
s.push(1)
s.push("hello")     # type error
```

### Python 3.12+ syntax (PEP 695)
Cleaner:
```python
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
    def pop(self) -> T:
        return self._items.pop()

def first[T](items: list[T]) -> T:
    return items[0]
```

### Bounded TypeVars
Restrict T to subtypes of something:
```python
# Pre-3.12
T = TypeVar("T", bound="Comparable")

# 3.12+
def max_of[T: Comparable](items: list[T]) -> T:
    return max(items)
```

### Constraints (only these specific types)
```python
T = TypeVar("T", int, float)

def double(x: T) -> T: return x * 2
```

### Covariance, contravariance, invariance
Concepts you'll meet if you do lots of generic library work. In short:
- **Invariant** (default): `list[Dog]` is not a `list[Animal]`.
- **Covariant**: `Iterable[Dog]` is an `Iterable[Animal]`.
- **Contravariant**: `Callable[[Animal], None]` is a `Callable[[Dog], None]`.

You usually don't need to worry about these for application code.

---

## 15. Protocols (Structural Typing)

A `Protocol` defines a type by what methods/attributes it has, not by inheritance. This is "duck typing" with type checking — like TypeScript's interfaces.

```python
from typing import Protocol

class SupportsArea(Protocol):
    def area(self) -> float: ...

def report(s: SupportsArea) -> None:
    print(f"area = {s.area()}")


class Circle:
    def __init__(self, r): self.r = r
    def area(self) -> float: return 3.14 * self.r ** 2


class Square:
    def __init__(self, side): self.side = side
    def area(self) -> float: return self.side ** 2


report(Circle(5))    # OK — Circle structurally matches SupportsArea
report(Square(4))    # OK — Square also matches
```

Neither `Circle` nor `Square` inherits from `SupportsArea`, but type checkers accept them because they have the right method.

### Runtime-checkable
```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class HasName(Protocol):
    name: str

isinstance(some_obj, HasName)    # True if it has .name
```

### When to use which

| | Use |
|---|---|
| Need shared implementation | Inheritance (class) |
| Need runtime contract for subclasses | Abstract Base Class |
| Need pure type-checker contract, no inheritance | Protocol |
| Need to attach types to existing third-party classes | Protocol |

`Protocol` is generally the right modern choice for "this argument must support these operations".

---

## 16. Enums

A named set of constants.

```python
from enum import Enum, auto

class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3

c = Color.RED
c.name          # "RED"
c.value         # 1
Color(1)        # <Color.RED: 1>
Color["RED"]    # <Color.RED: 1>

for color in Color:
    print(color)
```

### `StrEnum` and `IntEnum`
Subclasses for when the value should also act as a string or int.
```python
from enum import StrEnum, IntEnum

class Status(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    CLOSED = "closed"

Status.PENDING == "pending"     # True

class Priority(IntEnum):
    LOW = 1
    MEDIUM = 5
    HIGH = 10
```

### `auto()` for auto-assigned values
```python
class Direction(Enum):
    NORTH = auto()
    SOUTH = auto()
    EAST = auto()
    WEST = auto()
```

### Flag enums
For bitwise combinations:
```python
from enum import Flag, auto

class Permission(Flag):
    READ = auto()
    WRITE = auto()
    EXECUTE = auto()

perm = Permission.READ | Permission.WRITE
Permission.READ in perm     # True
```

Enums are great for:
- A small fixed set of valid choices.
- Replacing magic strings/numbers throughout your code.
- Improving type-checker assistance (and `match`/`case` patterns).

---

## 17. Choosing the Right Abstraction

A rough decision flow for "what should this be?":

```
Need to hold data?
├─ Is it tiny and used briefly?  →  tuple
├─ Is it structured and reused?  →  dataclass (or NamedTuple)
└─ Does it need validation?      →  pydantic BaseModel

Need behavior?
├─ Pure functions?               →  module-level functions
├─ State + methods?              →  class
└─ Family of types?              →  ABC or Protocol

Need a fixed set of options?     →  Enum (or Literal for type hints)

Need shared behavior with variants?
├─ Common implementation?        →  inheritance (carefully)
├─ Compose if "has-a"            →  composition
└─ Just a contract?              →  Protocol
```

Lean toward the simpler tool. Most Python code doesn't need deep class hierarchies — a few dataclasses, a handful of functions, and a Protocol or two will go very far.

---

Next up: the functional side — decorators, generators, lambdas, context managers — in `05_functional.md`.
