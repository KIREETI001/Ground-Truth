# 06. Errors, Modules & Packaging

> Exception handling, custom exceptions, modules, packages, imports, and how to ship code as a package.

---

## Table of Contents

1. [Error Handling Philosophy](#1-error-handling-philosophy)
2. [try / except / else / finally](#2-try--except--else--finally)
3. [Built-in Exception Hierarchy](#3-built-in-exception-hierarchy)
4. [Raising Exceptions](#4-raising-exceptions)
5. [Custom Exceptions](#5-custom-exceptions)
6. [Exception Chaining](#6-exception-chaining)
7. [Modules](#7-modules)
8. [Packages](#8-packages)
9. [Imports in Depth](#9-imports-in-depth)
10. [`__main__` and the `if __name__ == "__main__"` Pattern](#10-__main__-and-the-if-__name__--__main__-pattern)
11. [Packaging with `pyproject.toml`](#11-packaging-with-pyprojecttoml)
12. [Distributing on PyPI](#12-distributing-on-pypi)

---

## 1. Error Handling Philosophy

Python embraces **EAFP** — "Easier to Ask Forgiveness than Permission." Try the operation; catch failures.

```python
# EAFP — Pythonic
try:
    value = d["key"]
except KeyError:
    value = default

# LBYL — "Look Before You Leap" (often less idiomatic)
if "key" in d:
    value = d["key"]
else:
    value = default
```

EAFP is preferred when:
- The failure case is uncommon.
- There's a race condition between "check" and "use" (e.g., files).
- Catching is just as clear.

LBYL is fine when the check is genuinely cheaper and the data is in-memory.

---

## 2. try / except / else / finally

```python
try:
    result = risky_operation()
except SpecificError as e:
    handle(e)
except (AnotherError, ThirdError) as e:
    handle(e)
except Exception as e:
    # catch-all for the rest
    log(e)
    raise        # re-raise after logging
else:
    # runs only if no exception was raised in try
    use(result)
finally:
    # always runs, even if exception, return, break, continue
    cleanup()
```

### Rules of thumb
- **Catch the narrowest exception you can.** `except Exception` is usually too broad; `except:` (bare) catches `KeyboardInterrupt` and `SystemExit` too — almost never what you want.
- **Don't swallow exceptions silently.** At minimum, log them.
- **Re-raise after logging** if you can't actually recover:
  ```python
  try: ...
  except SomeError:
      logger.exception("context")
      raise
  ```
- **Use `else`** for code that should run only on success — keeps the `try` block focused on what might fail.
- **Use `finally`** for cleanup that must run regardless of outcome (closing files, releasing locks). Or use a context manager.

### Catching multiple exception types
```python
try:
    ...
except (ValueError, TypeError) as e:
    ...
```

### Re-raising preserves the traceback
```python
try:
    do_stuff()
except SomeError:
    do_cleanup()
    raise          # re-raises the same exception with original traceback
```

### `except*` for ExceptionGroups (3.11+)
For handling multiple concurrent exceptions (asyncio, taskgroups):
```python
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(a()); tg.create_task(b())
except* ValueError as eg:
    for e in eg.exceptions: ...
except* RuntimeError as eg:
    for e in eg.exceptions: ...
```

---

## 3. Built-in Exception Hierarchy

All exceptions inherit from `BaseException`. Most user-relevant ones from `Exception`.

```
BaseException
├── SystemExit
├── KeyboardInterrupt
├── GeneratorExit
└── Exception
    ├── ArithmeticError
    │   ├── ZeroDivisionError
    │   ├── FloatingPointError
    │   └── OverflowError
    ├── AssertionError
    ├── AttributeError
    ├── BufferError
    ├── EOFError
    ├── ImportError
    │   └── ModuleNotFoundError
    ├── LookupError
    │   ├── IndexError
    │   └── KeyError
    ├── MemoryError
    ├── NameError
    │   └── UnboundLocalError
    ├── OSError                  (also: IOError, EnvironmentError aliases)
    │   ├── FileNotFoundError
    │   ├── FileExistsError
    │   ├── PermissionError
    │   ├── IsADirectoryError
    │   ├── NotADirectoryError
    │   ├── BrokenPipeError
    │   ├── ConnectionError
    │   │   ├── ConnectionRefusedError
    │   │   ├── ConnectionResetError
    │   │   ├── ConnectionAbortedError
    │   │   └── BrokenPipeError
    │   ├── InterruptedError
    │   └── TimeoutError
    ├── ReferenceError
    ├── RuntimeError
    │   ├── NotImplementedError
    │   └── RecursionError
    ├── StopIteration
    ├── StopAsyncIteration
    ├── SyntaxError
    │   └── IndentationError
    ├── SystemError
    ├── TypeError
    ├── ValueError
    │   └── UnicodeError
    └── Warning (and subclasses)
```

### Reading this
- `Exception` is the practical root. Catching it catches almost all user-level errors but lets `KeyboardInterrupt` and `SystemExit` propagate.
- `OSError` covers all file/network/system issues.
- `ValueError` = "right type, wrong value." `TypeError` = "wrong type altogether."

---

## 4. Raising Exceptions

```python
raise ValueError("age must be non-negative")
raise ValueError(f"got {age}")
raise SomeError                  # equivalent to raise SomeError()

# Raise with context
raise ValueError("bad input") from original_exception
```

### Raise vs return-an-error-code
Python doesn't use error codes. If your function can't do its job, **raise**. Callers either handle it or let it propagate.

### `assert`
For internal invariants in development. **Not for runtime checks of user input** — `assert`s are stripped by `python -O`.
```python
def divide(a, b):
    assert b != 0, "internal bug: b should be checked earlier"
    return a / b
```

Use `if x: raise ValueError(...)` for user-facing validation.

---

## 5. Custom Exceptions

Define your own to give callers something specific to catch.

```python
class AppError(Exception):
    """Base class for all errors raised by this app."""

class ValidationError(AppError):
    """A user input failed validation."""

class NotFoundError(AppError):
    """A requested resource was not found."""
    def __init__(self, resource_id):
        super().__init__(f"resource {resource_id} not found")
        self.resource_id = resource_id


try:
    fetch(uid)
except NotFoundError as e:
    print(f"missing: {e.resource_id}")
except AppError:
    # catches anything app-specific
    ...
```

Hierarchy lets users opt in to different levels of specificity. Always start with a single base class for your library.

---

## 6. Exception Chaining

When one exception causes another, chain them.

### Explicit chaining: `raise X from Y`
```python
try:
    api_call()
except ConnectionError as e:
    raise APIError("network failed") from e
```

This sets `__cause__` and shows both in the traceback:
```
ConnectionError: ...
The above exception was the direct cause of the following exception:
APIError: network failed
```

### Implicit chaining
If an exception is raised inside an `except` block without `from`, Python automatically links them via `__context__`:
```
... ConnectionError ...
During handling of the above exception, another exception occurred:
... APIError ...
```

### Suppressing chaining
```python
raise APIError("clean message") from None
```

Useful when the inner exception is internal noise.

---

## 7. Modules

A **module** is a single `.py` file. Importing it runs its top-level code once and exposes the names it defines.

```python
# math_utils.py
PI = 3.14159

def area(radius):
    return PI * radius ** 2

if __name__ == "__main__":
    print(area(5))
```

```python
# main.py
import math_utils
print(math_utils.PI)
print(math_utils.area(5))

# Or import specific names
from math_utils import area, PI
print(area(5))

# Aliased
import math_utils as mu
print(mu.area(5))

from math_utils import area as compute_area
```

### Where Python looks
The import system searches paths in `sys.path`, which typically includes:
1. The directory of the running script.
2. `PYTHONPATH` environment variable directories.
3. Site-packages (installed libraries).

You can inspect it:
```python
import sys
print(sys.path)
```

### Re-running a module's code
By default, `import` only executes a module's body once per process. If you change the file and want it re-loaded:
```python
import importlib
importlib.reload(my_module)
```

Useful in REPLs / Jupyter; almost never in production code.

---

## 8. Packages

A **package** is a folder containing an `__init__.py`. Sub-packages nest the same way.

```
myproject/
├── __init__.py
├── core.py
├── utils.py
└── api/
    ├── __init__.py
    ├── routes.py
    └── auth.py
```

```python
import myproject.core
from myproject.api import routes
from myproject.api.auth import login
```

### `__init__.py`
Can be empty. Or do package-level setup. Or re-export names so users don't need deep paths:

```python
# myproject/__init__.py
from .core import main_function, MainClass
from .api.auth import login

__all__ = ["main_function", "MainClass", "login"]
__version__ = "1.0.0"
```

Now `from myproject import main_function` works directly.

### Implicit namespace packages
Since Python 3.3, a folder *without* `__init__.py` can also be a package (a "namespace package"). They allow multiple distributions to contribute to the same package namespace. For most projects, prefer **regular** packages with `__init__.py` — the behavior is more predictable.

### Relative imports
Inside a package, you can import siblings/parents:
```python
# inside myproject/api/routes.py
from .auth import login              # sibling — same dir
from ..core import main_function     # parent — myproject/core.py
from ...other_package import thing   # grandparent
```

Only works inside packages, not in top-level scripts. If `relative import error` happens, you're probably running a file directly when it should be run as a module (`python -m myproject.api.routes`).

---

## 9. Imports in Depth

### Avoid star imports
```python
from os import *      # bad — pollutes namespace, hides where names come from
import os; os.path... # better
```

`__all__` in a module controls what `from m import *` exports — but you should still avoid `*` imports in real code.

### Circular imports
Module A imports B, B imports A. Python tries to handle this, but it usually breaks.

Fixes (in order of preference):
1. **Refactor** — move the shared code into a third module.
2. **Move the import inside a function** so it runs after both modules finish loading:
   ```python
   def fn():
       from .other import thing
       thing()
   ```
3. **Use type-checking only imports**:
   ```python
   from typing import TYPE_CHECKING
   if TYPE_CHECKING:
       from .other import Thing
   def fn(x: "Thing"): ...
   ```

### Lazy imports
Loading some libraries (e.g., TensorFlow, PyTorch) is slow. Import inside a function if it's only used sometimes:
```python
def make_chart():
    import matplotlib.pyplot as plt   # only when needed
    ...
```

### Import order convention (PEP 8)
```python
# 1. Standard library
import os
import sys

# 2. Third-party
import numpy as np
import requests

# 3. Local / first-party
from myproject.core import helper
from .utils import another_helper
```

Use a tool like `ruff` or `isort` to enforce this automatically.

### Where does `import x` fail?
- `ModuleNotFoundError: No module named 'x'` — not installed in current env. Check `pip list`, check venv activation.
- `ImportError: cannot import name 'Y' from 'x'` — module exists but doesn't have `Y`. Wrong version? Wrong path? Circular import?
- Importing succeeds but `x` is wrong module — name collision with a local file. `print(x.__file__)` to see where Python is finding it.

---

## 10. `__main__` and the `if __name__ == "__main__"` Pattern

When you run a script, Python sets `__name__ == "__main__"` for that file. When it's imported, `__name__` is the module name.

```python
# my_script.py
def main():
    print("running")

if __name__ == "__main__":
    main()
```

- `python my_script.py` → runs `main()`.
- `import my_script` → defines `main` but doesn't call it.

This is how you make a file importable as a library *and* runnable as a script.

### Module as command line
For a package:
```
myproject/
├── __init__.py
└── __main__.py
```

```python
# myproject/__main__.py
from .cli import main
if __name__ == "__main__":
    main()
```

Then `python -m myproject` runs it.

### Entry points
The better way for distributed packages — define a console script in `pyproject.toml`:
```toml
[project.scripts]
myproject = "myproject.cli:main"
```

After `pip install`, users get a `myproject` command on PATH.

---

## 11. Packaging with `pyproject.toml`

The modern Python packaging config. Replaces `setup.py` for most projects.

### Minimal example
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mypackage"
version = "0.1.0"
description = "A short description"
readme = "README.md"
license = { file = "LICENSE" }
authors = [{ name = "Your Name", email = "you@example.com" }]
requires-python = ">=3.10"
dependencies = [
    "requests>=2.28",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest", "mypy", "ruff"]
docs = ["sphinx", "myst-parser"]

[project.scripts]
my-tool = "mypackage.cli:main"

[project.urls]
Homepage = "https://github.com/you/mypackage"
Issues = "https://github.com/you/mypackage/issues"
```

### Build backends
The `[build-system]` table selects the backend. Popular options:
- **`hatchling`** — modern, fast, simple. Recommended default.
- **`setuptools`** — the historical choice; still widely used.
- **`flit`** — minimal, for pure-Python projects.
- **`poetry-core`** — if using poetry.
- **`uv_build`** — when using uv end-to-end.

### Project layout that works
```
mypackage/
├── pyproject.toml
├── README.md
├── LICENSE
├── src/
│   └── mypackage/
│       ├── __init__.py
│       └── core.py
└── tests/
    └── test_core.py
```

Build the distribution:
```bash
pip install build
python -m build
# Creates dist/mypackage-0.1.0-py3-none-any.whl and .tar.gz
```

### Install locally for development
```bash
pip install -e .                       # editable mode — changes reflect immediately
pip install -e ".[dev]"                # with dev extras
```

### Version management
- Hard-code version in `pyproject.toml`.
- Or use `[tool.hatch.version]` (and similar in other backends) to read from `mypackage/__init__.py`.
- Or use `setuptools-scm` to derive version from Git tags.

### Including non-code files
If your package needs templates, data files, etc.:
```toml
[tool.hatch.build]
include = ["src/mypackage/templates/*.html", "src/mypackage/data/*.json"]
```

Backend-specific; check your build backend's docs.

---

## 12. Distributing on PyPI

### Test on TestPyPI first
```bash
pip install twine
twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ mypackage
```

### Upload to PyPI
```bash
twine upload dist/*
```

Or with `uv`:
```bash
uv publish
```

You'll need a PyPI account and an API token configured.

### Versioning
Follow **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`.
- `MAJOR` — breaking change.
- `MINOR` — new feature, backward compatible.
- `PATCH` — bug fix only.

You can also use "calver" (`2026.1.0`) if your project is more time-based.

### Yanking and deletion
- You can "yank" a release (mark as not-recommended) on PyPI.
- You can't really delete a release — once uploaded, that version number is reserved forever. Plan accordingly.

### `MANIFEST.in` and friends
Older setuptools concept; not usually needed with modern `pyproject.toml`-based builds.

### Wheel vs sdist
- **Wheel** (`.whl`) — pre-built binary distribution. Installs faster.
- **sdist** (`.tar.gz`) — source distribution. Required for packages with C extensions on platforms without pre-built wheels.

`python -m build` creates both.

### Pure Python vs native code
For pure Python, your wheel is one file: `package-1.0-py3-none-any.whl` — works on every platform.

For packages with C/C++/Rust extensions, you need per-platform wheels (e.g., `package-1.0-cp312-cp312-manylinux_x86_64.whl`). Tools like `cibuildwheel` automate this. Covered in `15_advanced.md`.

---

Next: the standard library tour — `07_stdlib.md`.
