# Python — Reference Library

A multi-file, beginner-friendly, deep reference for Python — covering the language, the standard library, the ecosystem, AI/ML, web development, data engineering, integration, and best practices.

---

## How to navigate this folder

Each file is a focused deep dive on one area. You can read them in order (recommended for newcomers) or jump straight to what you need.

| # | File | What's in it |
|---|---|---|
| — | `README.md` | This file. Mental model, philosophy, versions, when to use Python. |
| 01 | `01_setup.md` | Installing Python, version managers, virtual environments, package managers, IDEs. |
| 02 | `02_language_basics.md` | Syntax, comments, variables, types, operators, strings, numbers, control flow, functions. |
| 03 | `03_data_structures.md` | Lists, tuples, dicts, sets, frozensets, comprehensions, the `collections` module. |
| 04 | `04_oop.md` | Classes, dunder methods, inheritance, dataclasses, properties, ABCs, Protocols, type hints, generics. |
| 05 | `05_functional.md` | First-class functions, closures, decorators, lambdas, generators, `itertools`, `functools`, context managers. |
| 06 | `06_errors_and_modules.md` | Exceptions, custom exceptions, modules, packages, imports, packaging with `pyproject.toml`. |
| 07 | `07_stdlib.md` | Comprehensive standard-library tour — `pathlib`, `json`, `csv`, `datetime`, `re`, `logging`, etc. |
| 08 | `08_concurrency.md` | The GIL, `threading`, `multiprocessing`, `asyncio`, `concurrent.futures`. |
| 09 | `09_io_and_apis.md` | File I/O, HTTP clients (`requests`, `httpx`), websockets, sockets. |
| 10 | `10_databases.md` | SQLite, Postgres/MySQL drivers, SQLAlchemy, ORMs, migrations, NoSQL clients. |
| 11 | `11_web.md` | FastAPI deep dive, Flask, Django overview, Pydantic, auth, middleware, deployment. |
| 12 | `12_data_and_ml.md` | NumPy, pandas, Polars, visualization, scikit-learn, gradient boosting, model evaluation. |
| 13 | `13_deep_learning_and_llms.md` | PyTorch, TensorFlow, Hugging Face, LLM API clients, RAG, vector DBs, agent frameworks. |
| 14 | `14_testing_and_quality.md` | pytest, fixtures, mocking, hypothesis, mypy, ruff, black, pre-commit. |
| 15 | `15_advanced.md` | Performance, profiling, Cython/Numba, C-extensions, integration, security, deployment, pitfalls. |

---

## What Python is (mental model)

Python is a **high-level**, **interpreted**, **dynamically-typed**, **garbage-collected** programming language. Each word matters:

- **High-level** — You don't manage memory or hardware directly. Pointers, allocation, registers are hidden.
- **Interpreted** — The Python interpreter reads your `.py` file and executes it. Internally it compiles to bytecode, but you never see that step.
- **Dynamically-typed** — You don't declare variable types. The type is determined at runtime, and a variable can be rebound to a value of a different type. This is convenient but moves errors from compile-time to run-time.
- **Garbage-collected** — Unreferenced objects are reclaimed automatically.

### The single most important idea

> Python optimizes for the reader, not the writer.

That's why indentation defines blocks, why obscure syntax is rare, why the standard library is huge, and why "Pythonic" code reads almost like English. When in doubt, choose clarity.

### What Python is great at

- **AI/ML and data science.** The de facto language for machine learning research and production. PyTorch, TensorFlow, scikit-learn, NumPy, pandas are all Python (with C/C++ under the hood).
- **Glue code.** Connecting systems written in other languages via HTTP, subprocess, or native bindings.
- **Scripting and automation.** From small shell-replacement scripts to large data pipelines.
- **Web backends.** Less dominant than Node/Java, but FastAPI and Django are first-class.
- **Scientific computing.** Astronomy, biology, physics, finance — all heavy Python users.
- **Education.** Most CS programs and online courses use Python first.

### What Python isn't great at

- **CPU-bound performance.** Pure Python is roughly 10–100x slower than C++/Rust/Java for tight numeric loops. The workaround is to delegate the hot path to a C library (which is exactly what NumPy and PyTorch do).
- **Mobile and game clients.** Almost no one ships iOS/Android apps in Python.
- **Browser-side code.** That's JavaScript / TypeScript territory.
- **Hard real-time or embedded systems.** GC pauses and runtime overhead disqualify it.
- **Concurrency for CPU work.** The Global Interpreter Lock (GIL) means threads don't give you parallel CPU. Use `multiprocessing`, native libraries, or `asyncio` for I/O.

### The Zen of Python

Type `import this` in any Python REPL and you'll see this poem. The key principles:

- *Beautiful is better than ugly.*
- *Explicit is better than implicit.*
- *Simple is better than complex.*
- *Readability counts.*
- *Errors should never pass silently.*
- *There should be one — and preferably only one — obvious way to do it.*

---

## Versions: which Python should you use?

Python's release model: **one new minor version per year**, with **5 years of full + security support** each.

| Version | Released | End of life | Notes |
|---|---|---|---|
| 3.10 | Oct 2021 | Oct 2026 | Pattern matching (`match`/`case`), parenthesized context managers. |
| 3.11 | Oct 2022 | Oct 2027 | Big speedup (~25%), better tracebacks, `tomllib`, `Self` type. |
| 3.12 | Oct 2023 | Oct 2028 | Faster, type parameter syntax, per-interpreter GIL groundwork. |
| 3.13 | Oct 2024 | Oct 2029 | Experimental free-threaded build (no-GIL), JIT preview, improved REPL. |
| 3.14 | Oct 2025 | Oct 2030 | Template strings, deferred evaluation of annotations. |

**Recommendation for new projects in 2026: Python 3.12 or 3.13.** Both are stable and widely supported by libraries. Python 3.13's no-GIL mode is exciting but still gated behind a flag — production ML/data work mostly stays with GIL builds.

**Python 2 is dead.** Don't start anything new with it; migrate any legacy code you still have.

---

## How Python runs

```
your_code.py
     │
     ▼
[Python interpreter, e.g. CPython]
     │  parses + compiles to bytecode (.pyc cached in __pycache__/)
     ▼
[Python virtual machine executes bytecode]
     │  may call into C extensions (NumPy, etc.) which run native code
     ▼
[Result]
```

### Implementations of Python

- **CPython** — the reference, written in C. What 99% of people use.
- **PyPy** — JIT-compiled, often 4–10x faster on pure-Python code. Drop-in for most workloads, but C-extension compatibility lags.
- **MicroPython / CircuitPython** — for microcontrollers.
- **Jython** (JVM) and **IronPython** (.NET) — mostly historical now.
- **GraalPy** — Python on GraalVM, decent compatibility, JIT speed.

Unless you have a specific reason, use CPython.

---

## Where Python sits in the broader stack

A typical modern data/AI stack:

```
[ Browser / Mobile ]
       │
       ▼ HTTP
[ Python web service (FastAPI/Django) ]
       │
       ├──► [ PostgreSQL ]                          ← SQL guide
       ├──► [ Redis / cache ]
       ├──► [ Vector DB (Pinecone/Chroma/pgvector) ]
       ├──► [ Object store (S3/GCS) ]
       └──► [ LLM API (OpenAI/Anthropic) ]
                                                    or
       [ Python ML training (PyTorch) ]
            │
            ▼
       [ Model artifact (.pt, .onnx) ]
            │
            ▼
       [ Inference service (Triton/TorchServe/vLLM/custom) ]
```

Python rarely runs alone — it usually orchestrates other systems.

---

## A note on the broader ecosystem

Python's strength is its **package ecosystem on PyPI**: ~500k+ packages, with `pip` (or modern `uv`) installing them in seconds. The downside is fragmentation — for the same task you often have 3–5 viable libraries. Throughout this reference I'll flag the *current de facto choices* in 2026, but ecosystem trends move; verify with a quick search before committing to something for a long-lived project.

---

## How to use this reference

- **Just starting?** Read `01_setup.md` → `02_language_basics.md` → `03_data_structures.md` → `04_oop.md` in order.
- **Need to do data work?** Skip to `12_data_and_ml.md`.
- **Building a web service?** `11_web.md` plus `10_databases.md`.
- **Working with LLMs?** `13_deep_learning_and_llms.md`.
- **Debugging weird stuff?** `15_advanced.md` has the pitfalls section.

Files cross-reference each other where it helps. Code samples are runnable on a clean Python 3.12+ install unless noted otherwise.
