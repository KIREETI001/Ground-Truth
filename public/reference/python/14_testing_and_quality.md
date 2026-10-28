# 14. Testing & Code Quality

> pytest, fixtures, mocking, property-based testing with Hypothesis, type checking, linting, formatting, pre-commit hooks.

---

## Table of Contents

1. [Why Testing Matters in Python](#1-why-testing-matters-in-python)
2. [pytest Basics](#2-pytest-basics)
3. [Fixtures](#3-fixtures)
4. [Parametrize](#4-parametrize)
5. [Mocking](#5-mocking)
6. [Async Tests](#6-async-tests)
7. [Property-Based Testing: Hypothesis](#7-property-based-testing-hypothesis)
8. [Coverage](#8-coverage)
9. [Type Checking](#9-type-checking)
10. [Linting and Formatting](#10-linting-and-formatting)
11. [Pre-commit Hooks](#11-pre-commit-hooks)
12. [CI Integration](#12-ci-integration)

---

## 1. Why Testing Matters in Python

Python is dynamically typed. Bugs that other languages catch at compile time only surface in Python when the line actually runs. Tests are the safety net.

Two practical consequences:
- **Aim for high coverage** of business logic — not for the metric's sake, but because uncovered lines are lines a refactor can silently break.
- **Combine tests with a type checker** — types catch one class of bugs, tests catch another. Neither replaces the other.

---

## 2. pytest Basics

The de facto Python test framework. Less ceremony than `unittest`.

```bash
pip install pytest
```

### Simplest test
```python
# test_math.py
def add(a, b):
    return a + b

def test_add_positive():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, -1) == -2
```

Run:
```bash
pytest
pytest test_math.py
pytest test_math.py::test_add_positive
pytest -v                    # verbose — show each test name
pytest -k "positive"         # only tests whose name matches
pytest -x                     # stop on first failure
pytest --lf                    # only re-run failures from last session
pytest -q                      # quiet
```

### Assertions
pytest uses plain `assert`. It rewrites them under the hood to show useful diffs on failure.
```python
assert result == expected
assert "alice" in user["name"].lower()
assert isinstance(result, list)
assert len(items) == 3
assert items == [1, 2, 3]      # full structural compare, with diff on failure
```

### Testing exceptions
```python
import pytest

def divide(a, b):
    if b == 0:
        raise ValueError("can't divide by zero")
    return a / b

def test_divide_by_zero():
    with pytest.raises(ValueError) as exc_info:
        divide(10, 0)
    assert "zero" in str(exc_info.value)

def test_divide_by_zero_match():
    with pytest.raises(ValueError, match=r"zero"):
        divide(10, 0)
```

### Floating-point approximations
```python
def test_pi():
    import math
    assert math.pi == pytest.approx(3.14159, rel=1e-4)
    # also: pytest.approx for lists, dicts
    assert [0.1 + 0.2, 1.5] == pytest.approx([0.3, 1.5])
```

### Project layout
```
myproject/
├── pyproject.toml
├── src/
│   └── myproject/
│       ├── __init__.py
│       └── core.py
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_core.py
    └── test_api.py
```

Configure pytest in `pyproject.toml`:
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-ra --strict-markers"
markers = [
    "slow: deselect with '-m \"not slow\"'",
    "integration: requires external services",
]
```

### Markers
```python
import pytest

@pytest.mark.slow
def test_long_running():
    ...

@pytest.mark.skip(reason="not ready")
def test_future_feature():
    ...

@pytest.mark.skipif(sys.platform == "win32", reason="Linux only")
def test_unix_paths():
    ...

@pytest.mark.xfail(reason="known bug, fix scheduled")
def test_currently_broken():
    ...
```

Run only slow tests: `pytest -m slow`. Skip them: `pytest -m "not slow"`.

---

## 3. Fixtures

Reusable setup. The thing that makes pytest pleasant.

```python
import pytest

@pytest.fixture
def sample_user():
    return {"name": "Alice", "age": 30, "email": "a@x.com"}

def test_user_name(sample_user):
    assert sample_user["name"] == "Alice"

def test_user_age(sample_user):
    assert sample_user["age"] == 30
```

Fixtures are requested by parameter name. pytest finds and injects them.

### Fixtures with cleanup (yield-style)
```python
@pytest.fixture
def db_session():
    session = create_session()
    yield session                # everything before yield = setup
    session.close()              # everything after = teardown

def test_query(db_session):
    rows = db_session.execute("SELECT 1").fetchall()
    assert len(rows) == 1
```

### Scoped fixtures
By default a fixture runs once per test (`scope="function"`). For expensive setup:
```python
@pytest.fixture(scope="session")           # once per test session
def docker_postgres():
    container = start_postgres_container()
    yield container.connection_string
    container.stop()

@pytest.fixture(scope="module")             # once per module
def loaded_model():
    return load_huge_ml_model()

@pytest.fixture(scope="class")
@pytest.fixture(scope="function")           # default
```

### Shared fixtures: `conftest.py`
Place fixtures in `conftest.py` at any level of the test tree. They're automatically discovered by tests below them.

```python
# tests/conftest.py
import pytest

@pytest.fixture
def app_client():
    from main import app
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
```

Then in any test under `tests/`, request `app_client` as a parameter — no import needed.

### Built-in fixtures
- `tmp_path` — `pathlib.Path` for a unique temp directory.
- `tmp_path_factory` — for session-scoped temp dirs.
- `capsys` — capture stdout/stderr.
- `caplog` — capture logging.
- `monkeypatch` — patch attributes, env vars, etc., undone after the test.

```python
def test_writes_file(tmp_path):
    p = tmp_path / "out.txt"
    write_file(str(p))
    assert p.read_text() == "expected"

def test_prints_hello(capsys):
    print("hello")
    captured = capsys.readouterr()
    assert "hello" in captured.out

def test_env(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-key")
    assert os.environ["API_KEY"] == "test-key"
    # restored after test

def test_logs(caplog):
    import logging
    logger = logging.getLogger("my_app")
    logger.error("failed")
    assert "failed" in caplog.text
```

---

## 4. Parametrize

Run the same test with multiple inputs.

```python
@pytest.mark.parametrize("a, b, expected", [
    (1, 2, 3),
    (-1, 1, 0),
    (0, 0, 0),
    (1_000_000, 1, 1_000_001),
])
def test_add(a, b, expected):
    assert add(a, b) == expected
```

Each row generates a separate test case. Failures show which row failed.

### Multiple parametrize stacks combine
```python
@pytest.mark.parametrize("x", [1, 2, 3])
@pytest.mark.parametrize("y", [10, 20])
def test_combo(x, y):
    # runs 6 times total
    ...
```

### Custom IDs
```python
@pytest.mark.parametrize("value, expected", [
    pytest.param("", True, id="empty"),
    pytest.param("hello", False, id="non-empty"),
    pytest.param("  ", True, id="whitespace-only"),
])
def test_is_blank(value, expected):
    assert is_blank(value) == expected
```

### Parametrize fixtures
```python
@pytest.fixture(params=["sqlite", "postgres"])
def db(request):
    yield create_db(request.param)
```

---

## 5. Mocking

For when your code calls something you don't want to actually run in tests — APIs, databases, the filesystem.

### `unittest.mock` — stdlib
```python
from unittest.mock import Mock, MagicMock, patch

# Mock object
m = Mock()
m.foo.return_value = 42
m.foo()                     # 42
m.foo.assert_called_once()
m.foo.assert_called_with(1, 2)

# Mock that supports magic methods (len, iter, etc.)
mm = MagicMock()
len(mm)
list(mm)
```

### `patch` — replace something during the test
```python
# my_module.py
import requests
def fetch_user(uid):
    r = requests.get(f"https://api.example.com/users/{uid}")
    r.raise_for_status()
    return r.json()
```

```python
# test_my_module.py
from unittest.mock import patch
import my_module

@patch("my_module.requests.get")        # patch where it's USED, not where it's defined
def test_fetch_user(mock_get):
    mock_get.return_value.json.return_value = {"id": 1, "name": "Alice"}
    mock_get.return_value.raise_for_status.return_value = None

    user = my_module.fetch_user(1)
    assert user["name"] == "Alice"
    mock_get.assert_called_once_with("https://api.example.com/users/1")
```

### Important: patch where it's looked up
```python
# WRONG
@patch("requests.get")              # patches the wrong reference

# RIGHT
@patch("my_module.requests.get")    # patches the name in the module that uses it
```

### `patch` as context manager
```python
def test_fetch():
    with patch("my_module.requests.get") as mock_get:
        mock_get.return_value.json.return_value = {"ok": True}
        assert my_module.fetch_user(1) == {"ok": True}
```

### `patch.object`
```python
with patch.object(my_module.User, "save") as mock_save:
    user = User("Alice")
    user.save()
    mock_save.assert_called_once()
```

### Side effects
```python
mock = Mock()
mock.side_effect = ValueError("nope")
mock()                              # raises ValueError

mock.side_effect = [1, 2, 3]         # returns 1, 2, 3 on successive calls

mock.side_effect = lambda x: x * 2   # arbitrary function
```

### `responses` / `respx` for HTTP mocking
For HTTP-heavy code, dedicated libs are nicer:

```bash
pip install responses        # for requests
pip install respx             # for httpx (sync + async)
```

```python
import responses

@responses.activate
def test_fetch():
    responses.add(
        responses.GET, "https://api.example.com/users/1",
        json={"id": 1, "name": "Alice"}, status=200,
    )
    assert fetch_user(1)["name"] == "Alice"
```

### `pytest-mock`
A thin wrapper that exposes `mocker` as a fixture:
```python
def test_fetch(mocker):
    mock_get = mocker.patch("my_module.requests.get")
    mock_get.return_value.json.return_value = {"ok": True}
    ...
```

Avoids needing `@patch` decorators stacking.

### Mock everything? No.
Mocking is necessary, but over-mocked tests:
- Still pass when the real code is broken.
- Become brittle to refactors.
- Test the mock's behavior, not your code's.

Prefer real implementations when feasible (e.g., SQLite in-memory for DB tests). Mock only at integration boundaries (HTTP APIs, paid services, slow operations).

---

## 6. Async Tests

```bash
pip install pytest-asyncio
```

```python
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

```python
async def fetch():
    await asyncio.sleep(0.1)
    return 42

async def test_fetch():
    result = await fetch()
    assert result == 42
```

Without `asyncio_mode = "auto"`, mark each async test:
```python
@pytest.mark.asyncio
async def test_fetch(): ...
```

Async fixtures work the same way:
```python
@pytest.fixture
async def async_client():
    async with httpx.AsyncClient() as c:
        yield c

async def test_get(async_client):
    r = await async_client.get("https://example.com")
    assert r.status_code == 200
```

---

## 7. Property-Based Testing: Hypothesis

Instead of writing specific examples, you describe properties your function should satisfy. Hypothesis generates lots of inputs trying to break them.

```bash
pip install hypothesis
```

```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    assert add(a, b) == add(b, a)

@given(st.lists(st.integers()))
def test_sort_is_idempotent(xs):
    sorted_once = sorted(xs)
    assert sorted(sorted_once) == sorted_once

@given(st.text())
def test_roundtrip_json(s):
    import json
    assert json.loads(json.dumps(s)) == s
```

When Hypothesis finds a failing input, it **shrinks** it to the simplest example that fails — invaluable for debugging.

### Built-in strategies
```python
st.integers(min_value=0, max_value=100)
st.floats(allow_nan=False, allow_infinity=False)
st.text(min_size=1, max_size=20)
st.characters(whitelist_categories=["L", "N"])     # letters and numbers
st.booleans()
st.lists(st.integers(), min_size=1, max_size=10)
st.dictionaries(keys=st.text(), values=st.integers())
st.tuples(st.integers(), st.text())
st.one_of(st.integers(), st.text())
st.sampled_from(["red", "green", "blue"])
st.dates(); st.datetimes(); st.timedeltas()
st.from_regex(r"\d{3}-\d{4}")
```

### Composing strategies
```python
@st.composite
def positive_pairs(draw):
    a = draw(st.integers(min_value=0))
    b = draw(st.integers(min_value=a))     # b >= a
    return a, b

@given(positive_pairs())
def test_something(pair):
    a, b = pair
    assert a <= b
```

### When property tests shine
- Parser/serializer roundtrips (`parse(serialize(x)) == x`).
- Math identities (commutativity, associativity).
- Invariants (after operation X, property Y still holds).
- Anything stateful — Hypothesis has a state-machine testing API too.

Use them alongside, not instead of, example-based tests.

---

## 8. Coverage

Measure what your tests actually execute.

```bash
pip install pytest-cov
pytest --cov=src/myproject --cov-report=term-missing --cov-report=html
```

The `term-missing` report shows uncovered line numbers. `html` produces a browseable `htmlcov/` directory.

### Configuring
```toml
[tool.coverage.run]
source = ["src/myproject"]
omit = ["*/migrations/*", "*/tests/*"]
branch = true

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.:",
]
```

### Targets
- Aim for high coverage in pure-logic modules (parsers, validators, business rules).
- Don't agonize over 100% — boilerplate, glue code, and `__repr__`s often aren't worth specific tests.
- **Branch coverage** (`branch = true`) catches uncovered logic in `if/else` that line coverage misses.

Coverage is a *floor*, not a ceiling. 100% coverage with weak assertions is worse than 70% with strong ones.

---

## 9. Type Checking

Static type checking is the second leg of Python correctness (tests are the first).

### mypy
```bash
pip install mypy
mypy src/
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true                  # turn on all checks
warn_unused_ignores = true
disallow_untyped_defs = true   # require all functions to have hints

[[tool.mypy.overrides]]
module = "some_untyped_library.*"
ignore_missing_imports = true
```

### pyright (used by VS Code's Pylance)
```bash
pip install pyright
pyright src/
```

Often faster and more permissive than mypy on real-world code. The VS Code Python extension uses pyright internally — you're getting type checking as you type without a separate command.

### Picking strictness
For a new project: start strict, lower as needed.
For a legacy project: start loose, ratchet upward as you fix code.

Useful in-between: enable `strict` on individual files via `# mypy: strict` comment, or in selective `[[overrides]]` blocks.

### Common typing patterns (recap from `04_oop.md`)
```python
from typing import Optional, Iterable, Mapping, Callable, Any

def process(items: Iterable[int]) -> list[int]:
    return [x * 2 for x in items]

def find(uid: int) -> Optional[User]:        # or `User | None` (3.10+)
    ...

def apply(fn: Callable[[int], int], x: int) -> int:
    return fn(x)
```

Don't fight the type checker. When you get a false-positive that's truly impossible to fix:
```python
foo: int = some_call()   # type: ignore[assignment]
```

But minimize these.

---

## 10. Linting and Formatting

### Ruff — replaces flake8, isort, pylint, black, more
The Rust-based all-in-one. By 2026 it's the default for new Python projects.

```bash
pip install ruff
ruff check .              # lint
ruff format .              # format
ruff check --fix .         # auto-fix what's safe
```

```toml
# pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
    "E", "W",       # pycodestyle
    "F",            # pyflakes
    "I",            # isort
    "B",            # bugbear (common bugs)
    "UP",           # pyupgrade (modernize syntax)
    "SIM",          # simplify
    "RUF",          # ruff-specific
]
ignore = ["E501"]   # line too long (handled by formatter)

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]    # allow assert in tests
```

Run order:
```bash
ruff format .
ruff check --fix .
```

### Black (the previous standard for formatting)
Still very popular. Opinionated, fast, deterministic.
```bash
pip install black
black .
```

Ruff's formatter is compatible with Black's output — you can switch in either direction.

### isort
Sorted imports. Now covered by ruff's `I` rules.

### Pylint
Heavier, slower, often noisier than Ruff. Has rules Ruff doesn't (yet). Worth a single run on a codebase to spot issues other tools miss.

```bash
pip install pylint
pylint src/
```

### bandit — security linting
```bash
pip install bandit
bandit -r src/
```

Catches things like hardcoded passwords, shell injection patterns, weak crypto. Ruff has some `S` rules from bandit; standalone bandit is more thorough.

---

## 11. Pre-commit Hooks

Run checks before each commit. Catches issues before they hit CI.

```bash
pip install pre-commit
```

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.7.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-merge-conflict

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies: [pydantic, types-requests]
```

```bash
pre-commit install            # one-time setup, installs git hook
pre-commit run --all-files     # run against entire repo
```

Now every `git commit` triggers the checks. Failed checks abort the commit.

---

## 12. CI Integration

Run tests, lints, and type checks on every PR. GitHub Actions example:

```yaml
# .github/workflows/test.yml
name: tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12", "3.13"]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - name: Set up Python
        run: uv python install ${{ matrix.python-version }}
      - name: Install
        run: uv sync --all-extras --dev
      - name: Lint
        run: uv run ruff check .
      - name: Type check
        run: uv run mypy src/
      - name: Test
        run: uv run pytest --cov=src --cov-report=xml
      - uses: codecov/codecov-action@v4
        with:
          files: coverage.xml
```

### Practical CI tips
- **Fail fast** — lint and type-check before running slow tests.
- **Matrix-test** — at least the lowest and highest Python versions you support.
- **Cache deps** — `uv` and `pip` both work with GitHub Actions caching to cut CI time.
- **Don't ship without coverage** — even if you don't enforce a percentage, watch the trend.
- **Run mypy in CI on the strictest config you can afford** — code that "works" but fails strict typing usually has latent bugs.

### Test split between unit / integration / e2e
- **Unit** — pure logic, no I/O, fast. Run on every save.
- **Integration** — touches a DB/queue/file system. Run in CI on every PR.
- **End-to-end** — drives the system as a user would. Slower; run on merges to main or nightly.

Mark them with pytest markers and run subsets appropriately.

---

That's the toolbox for making your Python code stay correct as it grows. Last file: performance, integration, deployment, and the pile of pitfalls — `15_advanced.md`.
