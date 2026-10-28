# 15. Advanced — Performance, Integration, Pitfalls

> Profiling, optimization, native-code integration (Cython, Numba, ctypes, pybind11, PyO3), security, deployment, and the common gotchas that bite production code.

---

## Table of Contents

1. [Profiling](#1-profiling)
2. [Optimization Strategies](#2-optimization-strategies)
3. [Numba](#3-numba)
4. [Cython](#4-cython)
5. [PyPy and Alternative Interpreters](#5-pypy-and-alternative-interpreters)
6. [Integration: Calling C/C++/Rust](#6-integration-calling-cc-rust)
7. [Subprocess and Cloud SDKs](#7-subprocess-and-cloud-sdks)
8. [Security](#8-security)
9. [Deployment Recipes](#9-deployment-recipes)
10. [Best Practices](#10-best-practices)
11. [Common Pitfalls Reference](#11-common-pitfalls-reference)

---

## 1. Profiling

> "Premature optimization is the root of all evil." — Donald Knuth. Profile first; the bottleneck is almost never where you think.

### `timeit` — micro-benchmarks
```python
import timeit

# Compare two approaches
timeit.timeit("3 in [1, 2, 3, 4, 5]", number=1_000_000)
timeit.timeit("3 in {1, 2, 3, 4, 5}", number=1_000_000)

# With setup
timeit.timeit(
    "sorted(data)",
    setup="import random; data = [random.random() for _ in range(1000)]",
    number=10_000,
)
```

In Jupyter/IPython: `%timeit expr` and `%%timeit` for cells.

### `cProfile` — function-level profiling
```bash
python -m cProfile -o profile.out my_script.py
python -m cProfile -s cumulative my_script.py | head -30
```

```python
import cProfile, pstats

with cProfile.Profile() as pr:
    main()

stats = pstats.Stats(pr).sort_stats("cumulative")
stats.print_stats(30)
```

Visualize:
```bash
pip install snakeviz
snakeviz profile.out
```

Or use **`py-spy`** — sampling profiler, can attach to a running process without instrumenting code:
```bash
pip install py-spy
py-spy record -o profile.svg -- python my_script.py
py-spy top --pid 12345              # attach to running process
```

### Line-level profiling
```bash
pip install line_profiler
```

```python
# Decorate functions to profile
@profile
def slow_function():
    ...
```

```bash
kernprof -l -v my_script.py
```

### Memory profiling
```bash
pip install memory_profiler
mprof run my_script.py
mprof plot
```

For more detail: `pip install memray` — modern, comprehensive memory profiler.

```bash
memray run my_script.py
memray flamegraph memray-*.bin
```

### tracemalloc — stdlib memory tracing
```python
import tracemalloc

tracemalloc.start()
# ... your code ...
snapshot = tracemalloc.take_snapshot()
for stat in snapshot.statistics("lineno")[:10]:
    print(stat)
```

### Tracing async / asyncio bottlenecks
- `asyncio.run(main(), debug=True)` — slow-callback warnings.
- `aiomonitor` — attach a console to a running asyncio process.
- `py-spy` works on async code too.

---

## 2. Optimization Strategies

### Order of operations (do not skip)
1. **Profile.** Find the actual hot spot.
2. **Algorithm.** A `set` lookup instead of list `in` can be a 1000x win.
3. **Vectorize.** Replace Python loops with NumPy / pandas / Polars.
4. **Cache.** `functools.lru_cache`, persistent caches, memoization.
5. **Concurrency.** Threads for I/O, processes / native libs for CPU.
6. **Compile.** Numba, Cython, PyO3.
7. **Rewrite.** Hot path in C/C++/Rust, called from Python.

Most apps stop at step 3 or 4. Steps 5-7 are only for tight numeric loops.

### Common quick wins
- Replace `for` + `append` with a list comprehension.
- Replace list-membership tests (`x in [...]`) with set membership.
- Hoist constants out of loops.
- Use `''.join(parts)` instead of `s += part` in a loop.
- Use `dict.get(key, default)` instead of `if key in d: d[key] else: default`.
- Avoid global lookups in hot loops — bind to a local variable: `local_func = some.module.func`.
- Use generators instead of building intermediate lists.
- `bytes` and `bytearray` are faster than `str` for byte operations.

### NumPy / pandas-shaped problems
The fastest Python is no Python. Vectorize:
```python
# Slow
result = []
for x in data:
    result.append(x ** 2 + 3 * x + 1)

# Fast — pushes the loop into C
import numpy as np
arr = np.asarray(data)
result = arr ** 2 + 3 * arr + 1
```

### Caching
```python
from functools import cache, lru_cache

@cache                          # unbounded, since 3.9
def expensive(x): ...

@lru_cache(maxsize=1024)         # bounded
def expensive(x): ...
```

Caching requires hashable arguments. For complex inputs, key by something stable.

### `__slots__` for memory-tight classes
```python
class Point:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x, self.y = x, y
```

Avoids the per-instance `__dict__`, saving memory when you have millions of instances. `@dataclass(slots=True)` does the same.

---

## 3. Numba

JIT compiler for a subset of Python — especially numeric loops.

```bash
pip install numba
```

```python
from numba import njit
import numpy as np

@njit
def sum_of_squares(arr):
    total = 0.0
    for x in arr:
        total += x * x
    return total

arr = np.random.rand(1_000_000)
sum_of_squares(arr)        # first call compiles; subsequent calls are fast
```

The function above is ~100x faster than the pure-Python version, often matching NumPy.

### When Numba shines
- Tight numeric Python loops on NumPy arrays.
- Code that's awkward to vectorize but trivial in scalar form.
- Custom mathematical operations not in NumPy.

### When it doesn't help
- Already vectorized NumPy code — Numba can't beat BLAS.
- Code with lots of Python objects (dicts, classes, strings).
- One-off scripts where compile time exceeds runtime.

### `@njit(parallel=True)` + `prange`
```python
from numba import njit, prange

@njit(parallel=True)
def parallel_sum(arr):
    total = 0.0
    for i in prange(arr.shape[0]):
        total += arr[i]
    return total
```

### GPU with `@cuda.jit`
Numba can target CUDA, but for serious GPU work most people use PyTorch / JAX / CuPy.

---

## 4. Cython

Write Python-ish code, compile to C extensions. The pre-Numba approach; still used for "I want serious speed and don't mind a build step."

```bash
pip install cython
```

```python
# fastsum.pyx
def sum_to_n(int n):
    cdef int i
    cdef long total = 0
    for i in range(n):
        total += i
    return total
```

```python
# setup.py (or pyproject.toml with cython build backend)
from setuptools import setup
from Cython.Build import cythonize
setup(ext_modules=cythonize("fastsum.pyx"))
```

```bash
python setup.py build_ext --inplace
```

```python
import fastsum
fastsum.sum_to_n(1_000_000)
```

Cython buys you:
- Annotated types compile to C-level operations.
- Direct access to C libraries.
- No GIL with `nogil` blocks for native code.

Most numerical libraries (NumPy, scikit-learn, pandas internals) use Cython under the hood.

### When to choose Numba vs Cython
- **Numba** — no build step, JIT, great for prototyping.
- **Cython** — distributable wheels with no Python-source-level dep on Numba, fine-grained control.

For application code in 2026, try Numba first.

---

## 5. PyPy and Alternative Interpreters

### PyPy
JIT-compiled, drop-in CPython replacement. 4-10x faster on pure Python.

```bash
# install via pyenv or your package manager
pyenv install pypy3.10
pyenv shell pypy3.10
pypy3 --version
```

Works well for:
- Pure-Python web servers and data crunchers.
- Code that's slow in CPython for no clear reason.

Doesn't work well for:
- Code heavy in C-extension calls (NumPy works but loses some PyPy advantage).
- Code dependent on CPython-specific behavior or C extensions without `cffi` / `cppyy` bindings.

### Free-threaded CPython (3.13+)
Builds of Python 3.13+ that disable the GIL. Real thread parallelism — but still experimental and many C extensions don't support it yet. Track progress before committing.

### GraalPy, Pyston, etc.
Other implementations exist. For production, stick with CPython unless you have a specific reason.

---

## 6. Integration: Calling C/C++/Rust

When Python isn't fast enough for a specific function and you want to drop to native code.

### `ctypes` — call C directly, stdlib
For calling existing `.so` / `.dll` libraries.
```python
import ctypes

libm = ctypes.CDLL("libm.so.6")
libm.sin.argtypes = [ctypes.c_double]
libm.sin.restype = ctypes.c_double
libm.sin(1.0)                # 0.8414...
```

Works, but you write C types in Python and it's tedious.

### `cffi` — friendlier than ctypes
```bash
pip install cffi
```

```python
from cffi import FFI
ffi = FFI()
ffi.cdef("double sin(double);")
lib = ffi.dlopen(None)        # default search
lib.sin(1.0)
```

Two modes: ABI (like ctypes) and API (compile + link via setup.py). API mode is faster and safer.

### pybind11 — C++ bindings
The de facto choice for writing C++ extensions for Python.
```cpp
// example.cpp
#include <pybind11/pybind11.h>

int add(int a, int b) { return a + b; }

PYBIND11_MODULE(example, m) {
    m.def("add", &add, "A function that adds two numbers");
}
```

Build with CMake / setup.py / scikit-build. The resulting module imports normally:
```python
import example
example.add(1, 2)
```

Used by PyTorch and many scientific libraries.

### PyO3 — Rust bindings
The hot new path. Used by Pydantic v2 (which is part-Rust), Polars, Ruff, uv, several others.

```rust
// src/lib.rs
use pyo3::prelude::*;

#[pyfunction]
fn add(a: i64, b: i64) -> i64 { a + b }

#[pymodule]
fn my_rust_lib(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(add, m)?)?;
    Ok(())
}
```

```toml
# Cargo.toml
[lib]
name = "my_rust_lib"
crate-type = ["cdylib"]

[dependencies]
pyo3 = { version = "0.22", features = ["extension-module"] }
```

Build and install with **maturin**:
```bash
pip install maturin
maturin develop      # builds & installs in venv
```

```python
import my_rust_lib
my_rust_lib.add(2, 3)
```

PyO3 + maturin is the cleanest path in 2026 for native extensions. Memory safety, package wheels for all platforms via `cibuildwheel` / `maturin`.

### When to drop to native
- Profiling shows a real Python-bound bottleneck.
- The hot path is small (one or two functions).
- You're shipping a library, not just an internal tool.

For most apps: don't. Vectorize, cache, scale horizontally instead.

---

## 7. Subprocess and Cloud SDKs

### `subprocess` (covered in `07_stdlib.md`)
```python
import subprocess
result = subprocess.run(["aws", "s3", "ls"], capture_output=True, text=True, check=True)
```

### Cloud Python SDKs
- **AWS**: `boto3`
- **GCP**: `google-cloud-storage`, `google-cloud-bigquery`, etc.
- **Azure**: `azure-storage-blob`, `azure-identity`, etc.

```python
import boto3
s3 = boto3.client("s3")
s3.upload_file("local.txt", "my-bucket", "remote.txt")
s3.download_file("my-bucket", "remote.txt", "local.txt")
```

Common patterns:
- Credentials via env vars (`AWS_ACCESS_KEY_ID`), IAM role on EC2/EKS, or `~/.aws/credentials`.
- Retries built into the SDK; configure via `Config`.
- Pagination helpers for list operations.
- Async variants: `aioboto3`, `aiogoogle`.

### S3 file-like access with `fsspec` / `s3fs`
```python
import pandas as pd
df = pd.read_csv("s3://my-bucket/data.csv")        # works via fsspec / s3fs
```

Same trick for `gs://`, `abfs://`, `hdfs://`. Cleaner than downloading then opening.

---

## 8. Security

### Never trust input
- Validate with Pydantic, marshmallow, or hand-rolled checks.
- Treat anything from HTTP, file uploads, env vars, DB rows, queues as untrusted.

### SQL injection — always parameterize
```python
# BAD
cur.execute(f"SELECT * FROM users WHERE id = {uid}")

# GOOD
cur.execute("SELECT * FROM users WHERE id = %s", (uid,))
```

ORMs do this for you — unless you use raw SQL or `text()` clauses with string concatenation.

### Shell injection
```python
# BAD
subprocess.run(f"ls {user_path}", shell=True)

# GOOD
subprocess.run(["ls", user_path])      # no shell, args passed individually
```

### XML / YAML deserialization
- `xml.etree.ElementTree.fromstring` is safer than older `xml.dom.minidom`. But XML can still bomb: use `defusedxml` for untrusted input.
- `yaml.safe_load(data)` — **never `yaml.load`** on untrusted input (it can construct arbitrary objects, including code execution).
- `pickle.load` — never on untrusted input.
- `json.loads` is safe.

### Path traversal
User-provided filenames must not escape your sandbox:
```python
from pathlib import Path
base = Path("/data/uploads").resolve()
target = (base / user_filename).resolve()
if not target.is_relative_to(base):    # 3.9+
    raise ValueError("nice try")
```

### Secrets in code
Use env vars and tools like `pydantic-settings`:
```python
from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    api_key: str
    db_url: str
    model_config = {"env_file": ".env"}

settings = Settings()
```

Never commit `.env` to git. Use a secrets manager (AWS Secrets Manager, Doppler, 1Password, Vault) in production.

### CSRF, XSS, CORS
Framework-dependent. Django has CSRF built-in; FastAPI doesn't ship with it but it's rarely needed for JSON APIs with proper auth. For browser-facing apps, configure CORS strictly.

### Password storage
- Use Argon2 (best) or bcrypt via `passlib`.
- Never store plaintext.
- Never use general-purpose hash functions (SHA-256) directly.

### Dependencies
- `pip-audit` or `safety` scans your installed packages for known CVEs.
- Use `Dependabot` / `Renovate` to keep dependencies updated.
- Pin versions for reproducible builds (`uv.lock`, `poetry.lock`, `pip-compile`).

### TLS verification
```python
requests.get(url, verify=True)         # default
requests.get(url, verify=False)         # NEVER in production
```

If you must, set `verify="/path/to/ca-bundle.pem"` to your custom CA.

### Rate-limit at the edge
Don't rely on application-level rate limiting alone. Use API Gateway, Cloudflare, nginx limits to absorb floods before they reach your Python.

---

## 9. Deployment Recipes

### Docker base images
```dockerfile
# Multi-stage, slim final image
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "myapp.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Layers of optimization
- Use `python:X.Y-slim` instead of full image.
- `distroless` for security-sensitive deployments.
- Pin Python version exactly.
- Don't `apt install build-essential` in the final stage.

### Lambda / serverless
```bash
pip install mangum
```

```python
# myapp/lambda_handler.py
from mangum import Mangum
from .main import app
handler = Mangum(app)
```

Mangum adapts FastAPI / Starlette to AWS Lambda's event/context interface. Or use frameworks like **`chalice`** or **`zappa`** for full Lambda-native apps.

### Cron-style jobs
- **In-process**: `APScheduler`.
- **Kubernetes**: `CronJob` resource.
- **AWS**: EventBridge → Lambda or ECS Scheduled Tasks.
- **Workflow engines**: Airflow, Prefect, Dagster, Temporal — for anything with dependencies, retries, state.

### Healthchecks and metrics
For long-running services:
- HTTP `/health` endpoint that checks DB / cache connectivity.
- Prometheus metrics: `prometheus-client` library, expose `/metrics`.
- Structured logging shipped to a log aggregator.
- OpenTelemetry traces for distributed systems.

### Zero-downtime deploys
- Blue/green or rolling deploys at the orchestrator level (k8s, ECS).
- DB migrations: forward-compatible. Old version must work with new schema, and vice versa, during the rollout window.
- Graceful shutdown: handle `SIGTERM`, finish in-flight requests, close DB pools.

---

## 10. Best Practices

A grab-bag of habits that pay off:

- **Pin your Python version** (`.python-version` or `requires-python`) and your dependencies (lock file).
- **Use a `src/` layout** for installable packages.
- **One concern per module.** Modules over 500 lines often want splitting.
- **Constants live at module top** in UPPER_SNAKE_CASE.
- **Default parameters are evaluated once.** Never use mutable defaults.
- **Always use context managers** for files, locks, DB sessions.
- **Prefer `pathlib` over `os.path`** for new code.
- **Catch specific exceptions** — never bare `except:`.
- **Log at the right level**: DEBUG for development noise, INFO for normal events, WARNING for unusual but handled, ERROR for failed operations, CRITICAL for system-wide trouble.
- **Avoid `print` in production code.** Use `logging` or structured logging.
- **Don't optimize without profiling.**
- **Embrace type hints** — they pay back over time.
- **Test pure logic and edge cases.** Don't aim for 100% — aim for "would this catch a regression that matters."
- **Document the why, not the what.** The code shows what; comments explain reasoning.
- **Read PEP 8 once.** Then use Ruff / Black so you never think about it again.
- **`if __name__ == "__main__":`** the entry point of every runnable script.
- **Don't reinvent the standard library.** Need to handle paths, dates, CSV, configparse? It's already there.
- **Don't reinvent the ecosystem either.** Need a queue? Use Redis. Need a scheduler? Use Celery. Need migrations? Use Alembic.

---

## 11. Common Pitfalls Reference

A curated list of bugs that bite even experienced Python developers.

### Mutable default arguments
```python
def f(items=[]):     # WRONG — shared list
    items.append(1)
    return items
```
Fix: `items=None` and check inside.

### Late-binding closures
```python
fns = [lambda: i for i in range(3)]
[f() for f in fns]     # [2, 2, 2] — surprise
```
Fix: bind via default arg: `lambda i=i: i`.

### `is` vs `==`
```python
x = 257; y = 257
x is y               # False on CPython (only small ints are cached)
x == y               # True
```
Use `is` only for `None`, `True`, `False`.

### Modifying a list while iterating
```python
for x in items:
    if predicate(x):
        items.remove(x)     # skips elements
```
Fix: iterate a copy, or use a comprehension.

### Floating-point equality
```python
0.1 + 0.2 == 0.3        # False
math.isclose(0.1 + 0.2, 0.3)    # True
```

### Off-by-one with `range`
```python
range(5)            # 0..4, NOT 0..5
```

### `int / int` → `float` (Python 3)
```python
5 / 2               # 2.5
5 // 2              # 2 (integer division)
```

### Catching too much
```python
except:             # catches KeyboardInterrupt and SystemExit too
except Exception:   # narrower, still very broad
except (ValueError, TypeError):   # specific
```

### `dict.keys()` is a view, not a list
```python
keys = d.keys()
del d["a"]
list(keys)          # reflects the current state — surprise
```

### Iterating dict while modifying
```python
for k in d:
    if k.startswith("_"):
        del d[k]    # RuntimeError: dictionary changed size during iteration
```
Fix: iterate `list(d)` to snapshot keys.

### Re-raising loses traceback
```python
try: ...
except E as e:
    raise          # GOOD — preserves traceback
    raise E(...)   # also fine; chain via `from e` if it's a different error
```

### `requests` without timeout
```python
requests.get(url)              # can hang forever
requests.get(url, timeout=10)  # required for production
```

### Forgetting `await`
```python
async def fn(): return 1
r = fn()                # coroutine object, NOT 1
r = await fn()          # 1
```

### Logging in libraries
Don't `logging.basicConfig` in a library — it permanently configures the root logger of consumers. Use `logger = logging.getLogger(__name__)` and let consumers configure.

### Importing too eagerly
Module-level code runs on import. Avoid expensive setup at import time; lazy-load inside functions.

### Circular imports
Refactor (extract a common module), defer the import inside a function, or use `from typing import TYPE_CHECKING`.

### `multiprocessing` on macOS/Windows without the `__main__` guard
Infinite recursion at startup. Always guard:
```python
if __name__ == "__main__":
    main()
```

### `time.sleep` in async code
Blocks the event loop. Use `await asyncio.sleep(...)`.

### Pandas SettingWithCopyWarning
```python
df[df.x > 5]["y"] = 1   # WRONG — chained assignment
df.loc[df.x > 5, "y"] = 1   # RIGHT
```

### Pickle / YAML on untrusted input
Arbitrary code execution. Use JSON. Use `yaml.safe_load`.

### Forgetting to close file/DB connections
Use `with`. Always.

### Using `pip install` outside a venv
Pollutes system Python, may break OS tools, requires sudo. Always venv.

### Long startup time
Slow import = slow CLI tool, slow Lambda cold-start. Lazy-import heavy libs.

### Heisenbugs in tests from shared state
Fixtures leaking between tests. Default to function-scoped fixtures. Reset global state.

### Forgetting `newline=""` when opening for CSV writing
Extra blank lines on Windows.

### `pip freeze > requirements.txt` capturing system packages
Better: use a lockfile (`uv.lock`, `poetry.lock`, or `pip-tools` with `requirements.in`).

### Race conditions in async code
`gather()` doesn't serialize updates to shared state. Use locks (`asyncio.Lock`) or message-passing queues.

### Threads writing the same file
Same as above for threading. Use a queue + one writer thread.

### Process pool can't pickle local functions
Use top-level functions for `map` / `apply` / `submit`.

### Floating-point in money
Use `Decimal`. Or store cents as integers.

### Time zones
Naive datetimes are landmines. Store UTC; convert at the edges.

### Off-by-one in pagination
`page * page_size` is the wrong offset for 1-indexed pages. Use `(page - 1) * page_size`.

### Forgetting `index=False` in `to_csv`
Adds an unnamed first column. Annoying for downstream consumers.

### Random without seed in tests / experiments
Use `np.random.default_rng(seed)` / `torch.manual_seed(seed)` / `random.seed(seed)`.

### `__init__.py` not exporting / re-exporting
You might `import myproject.utils.helper` but the user expected `from myproject import helper`. Decide explicitly via `__init__.py`.

---

That's it for Python. Sixteen files, hopefully enough depth to be your daily reference and to get an honest beginner from zero to competent.

If you find an error, gap, or change in the 2026 ecosystem, that's the kind of thing to update. The Python ecosystem moves fast at the edges (LLMs, async, packaging) and slowly in the core. This reference is biased toward the modern, type-aware, `uv`-based style — adjust to your team's conventions.

Now: do the other six languages.
