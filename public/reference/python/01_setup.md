# 01. Setup & Tooling

> Everything about getting Python installed, isolated, and ready to develop in.

---

## Table of Contents

1. [Installing Python](#1-installing-python)
2. [Version Managers](#2-version-managers)
3. [Virtual Environments — Why and How](#3-virtual-environments--why-and-how)
4. [Package Managers (pip, uv, poetry, pdm)](#4-package-managers-pip-uv-poetry-pdm)
5. [Editors and IDEs](#5-editors-and-ides)
6. [Running Python](#6-running-python)
7. [REPLs Worth Using](#7-repls-worth-using)
8. [Project Layout](#8-project-layout)
9. [Common Setup Problems](#9-common-setup-problems)

---

## 1. Installing Python

### macOS
- The system Python is outdated and shouldn't be used for development.
- Easiest: install via [Homebrew](https://brew.sh) — `brew install python@3.12`.
- Better long-term: use a version manager (see next section).
- Or download the official installer from [python.org](https://www.python.org/downloads/).

### Linux
- Most distros ship a Python — but it's often older than the latest.
- Ubuntu/Debian: `sudo apt install python3 python3-pip python3-venv`.
- Fedora: `sudo dnf install python3 python3-pip`.
- For the latest version, use `pyenv` or compile from source.

### Windows
- Download the installer from python.org.
- **Important**: check "Add Python to PATH" during install.
- Alternative: install via the Microsoft Store (simpler but more sandboxed).
- The `py` launcher is bundled — `py -3.12` runs Python 3.12, `py -3.11` runs 3.11.

### Verify the install
```bash
python --version          # or python3 --version on Linux/macOS
pip --version
```

If `python` runs Python 2 (rare in 2026 but possible on old systems), use `python3` everywhere instead.

---

## 2. Version Managers

You'll often need multiple Python versions (project A uses 3.10, project B uses 3.12). Version managers handle this.

### pyenv (macOS / Linux)
The traditional choice. Installs and switches between Python versions.

```bash
# Install pyenv (via homebrew on Mac, or pyenv-installer script on Linux)
brew install pyenv

# Install a specific Python
pyenv install 3.12.7
pyenv install 3.11.10

# Set globally (default for all shells)
pyenv global 3.12.7

# Set locally (just for current dir — creates .python-version)
pyenv local 3.11.10

# List available
pyenv versions
```

For Windows, the equivalent is `pyenv-win`.

### uv (newest, fastest)
[uv](https://docs.astral.sh/uv/) by Astral is a Rust-based all-in-one tool: version manager + venv + package manager. Very fast and increasingly the default for new projects.

```bash
# Install uv (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install a Python version
uv python install 3.12
uv python install 3.13

# List Python versions installed
uv python list

# Pin a project to a Python version
uv python pin 3.12
```

### conda / mamba
Heavily used in data science. Installs Python plus a curated set of scientific libraries (NumPy, SciPy, etc.) with compiled binaries.

```bash
# Miniconda (minimal installer) is the usual choice
# After installing:
conda create -n myproject python=3.12
conda activate myproject
conda install numpy pandas scikit-learn
```

`mamba` is a drop-in faster reimplementation; use it if you find conda slow.

### Which to use?
- **General Python development**: `pyenv` or `uv`.
- **Data science with pre-built binaries (especially on Windows)**: `conda`.
- **New project from scratch in 2026**: `uv` is the fastest path.

---

## 3. Virtual Environments — Why and How

### Why
Without a virtual environment, every Python project on your machine shares the same set of installed libraries. Two projects that need different versions of `requests` will conflict. The fix is to give each project its own isolated Python environment.

**Always use a virtual environment.** Even for small scripts. The few seconds it takes to set up will save hours of debugging conflicts later.

### Built-in: `venv`
Ships with Python; no install required.

```bash
# Create
python -m venv .venv

# Activate (macOS/Linux, bash/zsh)
source .venv/bin/activate

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate (Windows cmd)
.venv\Scripts\activate.bat

# Now `python` and `pip` refer to the venv's copies
which python      # .../.venv/bin/python

# Install packages — go into .venv, not system
pip install requests

# Deactivate when done
deactivate
```

### Conventions
- The folder is usually `.venv` or `venv` at the project root.
- Add it to `.gitignore` — virtual environments aren't portable.
- Recreate it on a fresh checkout from a `requirements.txt`, `pyproject.toml`, or lock file.

### `uv` makes this easier
```bash
# Create a venv and install at the same time
uv venv                           # creates .venv automatically
uv pip install requests            # installs into .venv
```

### `conda` environments
```bash
conda create -n myproject python=3.12
conda activate myproject
conda install numpy
```

### `pipx` for installing applications
For tools you want available globally (not as project dependencies): black, ruff, mypy, poetry, etc. `pipx` installs each in its own isolated venv but exposes the CLI on your PATH.

```bash
brew install pipx
pipx install ruff
pipx install black
ruff --version    # available everywhere
```

---

## 4. Package Managers (pip, uv, poetry, pdm)

### `pip` — the original
Comes with Python. Installs from PyPI.

```bash
pip install requests
pip install requests==2.31.0           # exact version
pip install 'requests>=2.30,<3'        # version range
pip install -e .                       # editable install (your own package)
pip install -r requirements.txt        # from a file
pip install --upgrade requests
pip uninstall requests
pip list                                # installed packages
pip show requests                       # details about one package
pip freeze > requirements.txt           # save current
```

#### requirements.txt
A simple list of packages and versions:
```
requests==2.31.0
pandas>=2.0
fastapi
```

`pip freeze > requirements.txt` captures the current environment exactly. Useful for reproducibility, but be aware: it includes transitive deps and platform-specific markers can leak in. Modern projects often use a separate lock file (see below).

### `uv` — recommended for new projects
`uv` replaces `pip` and most of `pip-tools` / `poetry`'s workflow with one fast tool.

```bash
# Initialize a project
uv init myproject
cd myproject
# Creates pyproject.toml, .python-version, README, src/myproject/

# Add a dependency (updates pyproject.toml + uv.lock + installs into .venv)
uv add requests
uv add 'pandas>=2.0'

# Dev dependencies
uv add --dev pytest mypy ruff

# Remove
uv remove requests

# Install everything (from pyproject.toml or uv.lock)
uv sync

# Run a command in the project's environment without manual activation
uv run python script.py
uv run pytest
```

### `poetry` — popular structured workflow
Slightly older than uv, still widely used.

```bash
poetry new myproject
cd myproject
poetry add requests
poetry add --dev pytest
poetry install
poetry run python script.py
poetry shell                  # activate venv
```

Uses `pyproject.toml` and `poetry.lock`.

### `pdm` — similar philosophy, PEP-compliant
```bash
pdm init
pdm add requests
pdm install
pdm run python script.py
```

### Which to use in 2026?
- **New project, want speed and minimal fuss**: `uv`.
- **Established team using `poetry`**: stick with it.
- **Just need to run a script**: `pip` + `venv` is fine.
- **Data science / sciences with binary deps**: `conda` or `mamba` if `pip` packages fail to build.

### Index servers (private PyPI)
For corporate environments, you'll often install from a private index. Configure once:
```bash
pip config set global.index-url https://my.company.com/pypi/simple
```
Or per-command: `pip install --index-url https://my.company.com/pypi/simple foo`.

### Trusted hosts and TLS
Behind corporate proxies you may need `--trusted-host`, custom CA bundles via `REQUESTS_CA_BUNDLE`, etc. This is more an ops issue than a Python issue.

---

## 5. Editors and IDEs

### VS Code
The most popular Python editor in 2026. Free, cross-platform, with first-class support via the official **Python** and **Pylance** extensions (Microsoft).

Useful extensions for Python:
- **Python** (Microsoft) — the base.
- **Pylance** — fast type checking and intellisense.
- **Ruff** — linting and formatting.
- **Jupyter** — notebook support.
- **Even Better TOML** — for `pyproject.toml` editing.
- **Python Test Explorer** — UI for pytest.

### PyCharm
Full-featured IDE from JetBrains. Two editions:
- **Community Edition** — free; covers most Python work.
- **Professional Edition** — paid; adds web framework support (Django, FastAPI), database tools, scientific tools.

Heavier than VS Code but very polished for large Python codebases.

### Cursor, Zed, Windsurf
Newer AI-first editors. All have decent Python support; VS Code remains the most mature.

### Jupyter / JupyterLab
Not an IDE — a *notebook* environment. Mixes code, results, and prose in cells. Dominant in data science, teaching, exploratory analysis. Install:

```bash
pip install jupyterlab     # or: uv add jupyterlab
jupyter lab                # opens in browser
```

### Vim / Neovim
With plugins like `nvim-lspconfig`, `pyright`, `null-ls`, `coc-nvim`, you can get full IDE features. Worth it if you live in the terminal.

### IDLE
Ships with Python. Use for the first hour you ever write Python; switch to something better quickly.

---

## 6. Running Python

```bash
# Run a script
python script.py

# Run a module (when packaged properly)
python -m mypackage.cli
python -m http.server 8000        # built-in web server for testing
python -m json.tool file.json     # pretty-print JSON
python -m venv .venv              # used venv earlier

# Run a one-liner
python -c "print(sum(range(100)))"

# Run script then drop into REPL with its state
python -i script.py

# Show paths Python searches for modules
python -c "import sys; print(sys.path)"

# Show where Python itself is
python -c "import sys; print(sys.executable)"

# Run with optimizations (strips assert and __debug__)
python -O script.py
python -OO script.py              # also strips docstrings
```

### Passing arguments
```python
# script.py
import sys
print(sys.argv)
```
```bash
python script.py one two three
# Output: ['script.py', 'one', 'two', 'three']
```

For real CLIs, use `argparse` (built-in) or `click` / `typer` (third-party). Covered in `07_stdlib.md`.

### Shebang line
On Linux/macOS, make a script directly executable:
```python
#!/usr/bin/env python3
print("hello")
```
```bash
chmod +x script.py
./script.py
```

---

## 7. REPLs Worth Using

The default REPL improved a lot in Python 3.13 (multi-line editing, syntax highlighting, paste mode). But these are even better:

### IPython
```bash
pip install ipython
ipython
```
Features: autocompletion, `?` to show help, `??` to show source, `%timeit` for benchmarking, magic commands.

```python
In [1]: import requests
In [2]: requests.get?           # docstring
In [3]: %timeit sum(range(1000))
In [4]: %who                    # variables in namespace
In [5]: %paste                  # paste multi-line code cleanly
```

### bpython
Lighter alternative with auto-suggestion, rewindable history.
```bash
pip install bpython
```

### ptpython
Modern REPL with multi-line editing and syntax highlighting.
```bash
pip install ptpython
```

### Notebook REPL
For exploratory work, run a Jupyter notebook — it's effectively a REPL with cell history and rich output.

---

## 8. Project Layout

There's no enforced layout, but a common, sensible one for a real Python project:

```
myproject/
├── pyproject.toml            # project metadata, dependencies, build config
├── README.md
├── .gitignore
├── .python-version           # pyenv/uv pin
├── uv.lock or poetry.lock    # locked dependency versions
├── src/
│   └── myproject/
│       ├── __init__.py
│       ├── main.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py
│       └── models.py
├── tests/
│   ├── __init__.py
│   ├── test_main.py
│   └── conftest.py
└── docs/
```

### Why `src/`?
Without it, `import myproject` may accidentally find your *source folder* even outside the installed environment, masking install bugs. With `src/`, you can only import after installing (via `pip install -e .`), which catches packaging issues early.

For small scripts and personal projects, you can flatten to:
```
myproject/
├── pyproject.toml
├── myproject/
│   ├── __init__.py
│   └── main.py
└── tests/
```

### `__init__.py`
Marks a directory as a package. Can be empty. May contain initialization code or re-exports:
```python
# myproject/__init__.py
from .main import run
__all__ = ["run"]
__version__ = "0.1.0"
```

### `pyproject.toml` minimal example
```toml
[project]
name = "myproject"
version = "0.1.0"
description = "Does something useful"
requires-python = ">=3.12"
dependencies = [
    "requests>=2.30",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest", "mypy", "ruff"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project.scripts]
myproject-cli = "myproject.cli:main"
```

More on packaging in `06_errors_and_modules.md`.

---

## 9. Common Setup Problems

### "command not found: python"
Either Python isn't installed, isn't on your PATH, or your distro uses `python3` not `python`. Try `python3`. On Windows, ensure "Add to PATH" was checked during install, or use `py`.

### "command not found: pip" (but Python works)
```bash
python -m ensurepip
```
Or reinstall Python — most distros ship `pip` with Python now.

### Activating venv but `pip install` goes to system
You probably forgot to activate, or have multiple shells open. Verify with:
```bash
which python    # should point inside .venv
which pip
```

### Permission errors with `pip install`
Don't fix with `sudo`. Use a venv. If you really want a user-wide install (no venv), `pip install --user package`.

### "SSL: CERTIFICATE_VERIFY_FAILED"
Common on corporate networks or out-of-date macOS Python. On macOS, run the `Install Certificates.command` script in your Python install folder.

### M1/M2/M3 Mac and old packages
Some old packages don't have ARM wheels. Workarounds: use a newer version, build from source, or run x86-Python via Rosetta.

### "package X requires Python >=3.11 but you're on 3.10"
Upgrade Python (use your version manager) or pin to an older version of the package.

### Multiple Python installs and confusion
Use a version manager. Always.

### "Cannot import myproject" after `pip install -e .`
Make sure the venv is activated and that the `[project]` table in `pyproject.toml` has the right `name`. Run `pip show myproject` to verify it's installed.

---

## Quick recommended setup (2026)

For a brand-new Python project today:

```bash
# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create a project
uv init myproject
cd myproject

# Pin Python version
uv python pin 3.12

# Add dependencies
uv add fastapi 'pydantic>=2'
uv add --dev pytest mypy ruff

# Run something
uv run python -c "import fastapi; print(fastapi.__version__)"
```

That's it — venv, lockfile, dependency management, all handled.
