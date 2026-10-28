# 07. Standard Library Tour

> A guided tour of the Python standard library — the most useful modules for everyday work. Python ships with "batteries included," and this is where they live.

---

## Table of Contents

1. [Filesystem: `pathlib`, `os`, `shutil`, `glob`](#1-filesystem-pathlib-os-shutil-glob)
2. [Date and Time: `datetime`, `zoneinfo`, `time`](#2-date-and-time-datetime-zoneinfo-time)
3. [JSON, CSV, TOML, INI](#3-json-csv-toml-ini)
4. [Regular Expressions: `re`](#4-regular-expressions-re)
5. [Logging: `logging`](#5-logging-logging)
6. [Command-line Parsing: `argparse`](#6-command-line-parsing-argparse)
7. [Running Subprocesses: `subprocess`](#7-running-subprocesses-subprocess)
8. [HTTP Basics: `urllib`, `http.server`](#8-http-basics-urllib-httpserver)
9. [Hashing, Hex, Random: `hashlib`, `secrets`, `random`, `uuid`](#9-hashing-hex-random-hashlib-secrets-random-uuid)
10. [Math: `math`, `statistics`, `decimal`, `fractions`](#10-math-math-statistics-decimal-fractions)
11. [Compression & Archives: `gzip`, `zipfile`, `tarfile`](#11-compression--archives-gzip-zipfile-tarfile)
12. [Pickling & Serialization: `pickle`, `copy`](#12-pickling--serialization-pickle-copy)
13. [Other Useful Ones](#13-other-useful-ones)

---

## 1. Filesystem: `pathlib`, `os`, `shutil`, `glob`

### `pathlib` — the modern way
Use `pathlib.Path` for all path manipulation. It's cross-platform and reads naturally.

```python
from pathlib import Path

p = Path("/home/me/data/file.txt")
p.name              # "file.txt"
p.stem              # "file"
p.suffix            # ".txt"
p.parent            # Path("/home/me/data")
p.parents[1]        # Path("/home/me")
p.parts             # ('/', 'home', 'me', 'data', 'file.txt')

# Joining — note the / operator
config = Path.home() / ".config" / "myapp" / "settings.toml"

# Querying
p.exists()
p.is_file()
p.is_dir()
p.is_symlink()
p.stat().st_size

# Reading / writing
text = p.read_text(encoding="utf-8")
p.write_text("hello", encoding="utf-8")
data = p.read_bytes()
p.write_bytes(b"...")

# Iterating
for entry in Path("data").iterdir():
    print(entry)

# Globbing
for txt in Path("data").glob("*.txt"):
    print(txt)
for py in Path("src").rglob("*.py"):     # recursive
    print(py)

# Creating / deleting
Path("output").mkdir(parents=True, exist_ok=True)
Path("file.txt").touch()
Path("file.txt").unlink(missing_ok=True)
Path("dir").rmdir()        # only if empty

# Moving / renaming
src.rename(dst)
src.replace(dst)            # cross-platform, overwrites

# Absolute / resolved
p.absolute()
p.resolve()                  # follows symlinks, makes canonical
```

### `os` — when you need lower-level control
```python
import os

os.getcwd()
os.chdir("/some/dir")
os.environ["HOME"]
os.environ.get("FOO", "default")
os.cpu_count()
os.getpid()
os.listdir(".")
os.makedirs("a/b/c", exist_ok=True)
os.remove("file.txt")
os.rmdir("emptydir")
os.walk(".")                # generator yielding (dirpath, dirnames, filenames)
```

### `os.path` — the older path API (`pathlib` covers most of it)
```python
import os.path as osp
osp.join("a", "b", "c")
osp.exists("foo")
osp.expanduser("~/file")    # → "/home/me/file"
osp.basename("/a/b/c")      # "c"
osp.dirname("/a/b/c")       # "/a/b"
```

### `shutil` — high-level file ops
```python
import shutil

shutil.copy("a.txt", "b.txt")              # copy file
shutil.copy2("a.txt", "b.txt")             # also copy metadata (mtime)
shutil.copytree("src", "dst")               # copy whole tree
shutil.rmtree("dir")                        # recursive delete
shutil.move("a", "b")
shutil.which("python")                      # find executable on PATH
shutil.disk_usage("/")                       # (total, used, free)
shutil.make_archive("backup", "zip", "src/")
shutil.unpack_archive("backup.zip", "out/")
```

### `glob` — pattern matching (largely replaced by `pathlib.glob`)
```python
import glob
glob.glob("*.py")
glob.glob("**/*.py", recursive=True)
```

### `tempfile` — temporary files and directories
```python
import tempfile

with tempfile.NamedTemporaryFile(delete=True, suffix=".log") as f:
    f.write(b"hello")
    name = f.name

with tempfile.TemporaryDirectory() as td:
    p = Path(td) / "work.txt"
    p.write_text("temp")
# Directory and contents auto-deleted
```

---

## 2. Date and Time: `datetime`, `zoneinfo`, `time`

```python
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo

# Now
datetime.now()                              # naive (no tz)
datetime.now(timezone.utc)                  # aware
datetime.now(ZoneInfo("America/New_York"))

# Parsing and formatting
datetime.strptime("2026-06-02 14:30", "%Y-%m-%d %H:%M")
now = datetime.now()
now.strftime("%Y-%m-%d %H:%M:%S")

# ISO 8601 (3.11+: better parsing)
datetime.fromisoformat("2026-06-02T14:30:00+00:00")
now.isoformat()

# Components
now.year; now.month; now.day; now.hour; now.minute; now.second
now.weekday()        # Monday=0
now.isoweekday()     # Monday=1

# Arithmetic
tomorrow = now + timedelta(days=1)
five_min_ago = now - timedelta(minutes=5)
delta = datetime(2026, 1, 1) - datetime(2025, 1, 1)
delta.days            # 365
delta.total_seconds()

# Timezone conversion
ny = datetime.now(ZoneInfo("America/New_York"))
tokyo = ny.astimezone(ZoneInfo("Asia/Tokyo"))

# Unix timestamps
ts = now.timestamp()                        # float seconds since epoch
datetime.fromtimestamp(ts)
datetime.fromtimestamp(ts, tz=ZoneInfo("UTC"))
```

**Naive vs aware:** datetimes without a tzinfo are "naive." Mixing naive and aware raises `TypeError`. Best practice: store in UTC, convert to local only for display.

### `time` module (lower-level)
```python
import time
time.time()                  # float seconds since epoch
time.perf_counter()           # for measuring elapsed time (monotonic)
time.sleep(1.5)
time.monotonic()
```

### Format codes (most common)
| Code | Meaning |
|---|---|
| `%Y` | 4-digit year |
| `%m` | Month (01-12) |
| `%d` | Day of month (01-31) |
| `%H` | Hour 24h (00-23) |
| `%I` | Hour 12h |
| `%M` | Minute |
| `%S` | Second |
| `%p` | AM/PM |
| `%B` | Full month name |
| `%b` | Short month name |
| `%A` | Full weekday name |
| `%Z` | Timezone name |

---

## 3. JSON, CSV, TOML, INI

### `json` — JSON
```python
import json

data = {"name": "Alice", "age": 30}
s = json.dumps(data)
s = json.dumps(data, indent=2, sort_keys=True)
parsed = json.loads(s)

with open("data.json") as f:
    parsed = json.load(f)
with open("data.json", "w") as f:
    json.dump(data, f, indent=2)

# Custom serializer for non-JSON types
from datetime import datetime
def default(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError

json.dumps({"t": datetime.now()}, default=default)
```

### `csv` — CSV
```python
import csv

# Reading rows as lists
with open("data.csv") as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        print(row)

# Reading rows as dicts
with open("data.csv") as f:
    for row in csv.DictReader(f):
        print(row["name"], row["age"])

# Writing
rows = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
with open("out.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "age"])
    writer.writeheader()
    writer.writerows(rows)

# Different dialects
csv.reader(f, delimiter=";", quotechar="'")
```

**Always pass `newline=""`** when opening files for `csv`. Otherwise you may get extra blank lines on Windows.

For real data work, use `pandas.read_csv` / `pl.read_csv` (covered in `12_data_and_ml.md`).

### `tomllib` — TOML reading (3.11+)
```python
import tomllib

with open("pyproject.toml", "rb") as f:    # must open in binary mode
    config = tomllib.load(f)
```

For writing TOML, use third-party `tomli-w` or `tomlkit`.

### `configparser` — INI files
```python
import configparser

cp = configparser.ConfigParser()
cp.read("config.ini")
db_host = cp["database"]["host"]
```

---

## 4. Regular Expressions: `re`

```python
import re

# Match (anchored at start)
m = re.match(r"\d+", "123 abc")
m.group()           # "123"

# Search (anywhere)
m = re.search(r"\d+", "abc 123 def")
m.group()           # "123"
m.start(); m.end(); m.span()

# Find all
re.findall(r"\d+", "1 2 30 400")            # ['1', '2', '30', '400']
re.finditer(r"\d+", "1 2 30 400")            # iterator of match objects

# Substitute
re.sub(r"\s+", " ", "a  b   c")              # "a b c"
re.sub(r"(\w+)@(\w+)", r"\2/\1", "alice@x")  # "x/alice"

# Split
re.split(r"[,\s]+", "a, b,c d")               # ['a', 'b', 'c', 'd']

# Groups
m = re.match(r"(\w+)\s+(\d+)", "Alice 30")
m.group(1)          # "Alice"
m.group(2)          # "30"
m.groups()          # ('Alice', '30')

# Named groups
m = re.match(r"(?P<name>\w+)\s+(?P<age>\d+)", "Alice 30")
m.group("name")
m.groupdict()       # {'name': 'Alice', 'age': '30'}

# Compiled pattern (when used repeatedly)
pat = re.compile(r"\d+")
pat.findall("1 2 3")

# Flags
re.search(r"hello", "HELLO", re.IGNORECASE)
re.findall(r"^line", text, re.MULTILINE)
re.search(r".+", text, re.DOTALL)         # . also matches newline
re.search(r"""
    \w+       # word
    \s+       # whitespace
    \d+       # number
""", text, re.VERBOSE)
```

### Regex cheat sheet (the bits you'll use most)
| Pattern | Matches |
|---|---|
| `.` | Any char (except newline, unless `re.DOTALL`) |
| `\d` | Digit |
| `\D` | Non-digit |
| `\w` | Word char (letter, digit, underscore) |
| `\W` | Non-word |
| `\s` | Whitespace |
| `\S` | Non-whitespace |
| `^` / `$` | Start / end (of string or line with MULTILINE) |
| `\b` | Word boundary |
| `*` | Zero or more |
| `+` | One or more |
| `?` | Zero or one |
| `{n,m}` | Between n and m |
| `*?`, `+?` | Non-greedy |
| `[abc]` | One of a, b, c |
| `[^abc]` | Anything but |
| `(a\|b)` | a or b |
| `(?:x)` | Non-capturing group |
| `(?P<n>x)` | Named group |
| `(?=x)` | Lookahead |
| `(?!x)` | Negative lookahead |

**Use raw strings (`r"..."`)** for regex patterns. Otherwise `\n`, `\b`, etc. are interpreted as escape sequences.

---

## 5. Logging: `logging`

Don't use `print()` for diagnostics in real code. Use `logging`.

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

logger.debug("for developers")
logger.info("normal operation")
logger.warning("something unusual")
logger.error("operation failed")
logger.exception("with traceback")     # use inside an except block
logger.critical("immediate attention")
```

### Levels
`DEBUG < INFO < WARNING < ERROR < CRITICAL`. Setting level=`INFO` shows INFO and higher.

### Per-module loggers
Use `logging.getLogger(__name__)` in each module. This gives you a tree of loggers you can configure per area:
```python
logging.getLogger("myproject.api").setLevel(logging.DEBUG)
logging.getLogger("myproject.db").setLevel(logging.WARNING)
```

### File and rotating handlers
```python
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler

handler = RotatingFileHandler("app.log", maxBytes=10_000_000, backupCount=5)
handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
logger.addHandler(handler)
```

### Structured logging (JSON)
The stdlib `logging` is text-only. For JSON logs (better for log aggregators), use `structlog`, `python-json-logger`, or set up a custom formatter.

### `logging.config`
For complex setups, configure via dict or YAML file:
```python
import logging.config
logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {...},
    "handlers": {...},
    "loggers": {...},
    "root": {...},
})
```

---

## 6. Command-line Parsing: `argparse`

```python
import argparse

parser = argparse.ArgumentParser(description="Process some integers.")
parser.add_argument("filename", help="input file")               # positional
parser.add_argument("-o", "--output", default="out.txt")          # optional
parser.add_argument("-v", "--verbose", action="store_true")       # boolean flag
parser.add_argument("-n", "--num", type=int, default=10)
parser.add_argument("--mode", choices=["fast", "thorough"], default="fast")
parser.add_argument("files", nargs="+")                            # one or more
parser.add_argument("--tags", nargs="*", default=[])               # zero or more

args = parser.parse_args()
print(args.filename, args.output, args.verbose)
```

### Subcommands (like `git add`, `git commit`)
```python
parser = argparse.ArgumentParser()
subs = parser.add_subparsers(dest="command", required=True)

p_init = subs.add_parser("init")
p_init.add_argument("--name")

p_run = subs.add_parser("run")
p_run.add_argument("script")

args = parser.parse_args()
if args.command == "init":
    init(args.name)
elif args.command == "run":
    run(args.script)
```

### Alternatives
- **`click`** — third-party, decorator-based, very ergonomic.
- **`typer`** — built on click; uses type hints. Great for modern CLIs.
- **`fire`** — Google's library; auto-generates CLI from any function.

For new projects, `typer` is often nicer than `argparse`. But `argparse` ships with Python and handles 99% of cases.

---

## 7. Running Subprocesses: `subprocess`

```python
import subprocess

# Run, wait, get return code
result = subprocess.run(["ls", "-la"], capture_output=True, text=True)
result.returncode
result.stdout
result.stderr

# Raise if it fails
subprocess.run(["false"], check=True)        # raises CalledProcessError

# Pipe input
subprocess.run(["grep", "foo"], input="bar\nfoo\nbaz\n", text=True, capture_output=True)

# Don't capture — just stream to terminal
subprocess.run(["ls", "-la"])

# Timeout
subprocess.run(["sleep", "10"], timeout=5)   # raises TimeoutExpired

# Run with shell (use sparingly!)
subprocess.run("echo $HOME", shell=True)
```

### `shell=True` is a footgun
With `shell=True`, the command is parsed by a shell. If any part comes from user input, you have a shell injection vulnerability. Always prefer `shell=False` (the default) with the list form.

### Long-running with `Popen`
```python
proc = subprocess.Popen(["python", "-i"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
proc.stdin.write("print(1+1)\n")
proc.stdin.flush()
# ...
proc.terminate(); proc.wait()
```

For async subprocess, see `asyncio.create_subprocess_exec` (covered in `08_concurrency.md`).

---

## 8. HTTP Basics: `urllib`, `http.server`

For real HTTP work, use `requests` or `httpx` (covered in `09_io_and_apis.md`). But the stdlib has basic facilities:

```python
from urllib.request import urlopen, Request
from urllib.parse import urlencode, urlparse, parse_qs, quote

# Simple GET
with urlopen("https://example.com") as response:
    body = response.read().decode()
    headers = response.headers

# POST
req = Request(
    "https://api.example.com/post",
    data=json.dumps({"key": "value"}).encode(),
    headers={"Content-Type": "application/json"},
)
with urlopen(req) as response:
    print(json.loads(response.read()))

# URL building
qs = urlencode({"q": "python", "page": 1})
url = f"https://example.com/search?{qs}"

# Parsing
p = urlparse("https://example.com/path?q=1&q=2")
p.scheme; p.netloc; p.path; p.query
parse_qs(p.query)         # {"q": ["1", "2"]}
```

### `http.server` — built-in HTTP server (development only!)
```bash
python -m http.server 8000           # serves current dir
python -m http.server 8000 --bind 127.0.0.1
```

Useful for quick local file sharing or testing static content. Not for production.

---

## 9. Hashing, Hex, Random: `hashlib`, `secrets`, `random`, `uuid`

### `hashlib` — cryptographic hashes
```python
import hashlib

h = hashlib.sha256(b"hello")
h.hexdigest()                # "2cf24dba5fb..."

# Hash a file incrementally
h = hashlib.sha256()
with open("big.bin", "rb") as f:
    for chunk in iter(lambda: f.read(8192), b""):
        h.update(chunk)
print(h.hexdigest())
```

Algorithms: `sha256`, `sha512`, `blake2b`, `sha3_256`, `md5` (don't use for security).

### `secrets` — cryptographic random
Use this for tokens, passwords, anything security-sensitive.
```python
import secrets
secrets.token_hex(16)              # "a1b2c3..."  (32 hex chars)
secrets.token_urlsafe(32)
secrets.choice(["a", "b", "c"])
secrets.randbelow(1000)
```

### `random` — NOT for security
Pseudo-random, good for simulations, games, sampling.
```python
import random
random.seed(42)
random.random()                    # float in [0.0, 1.0)
random.randint(1, 10)              # inclusive both ends
random.uniform(0, 1)
random.choice([1, 2, 3])
random.choices(["a", "b"], weights=[0.9, 0.1], k=5)
random.sample(range(100), 10)      # without replacement
random.shuffle(my_list)            # in place
random.gauss(mu=0, sigma=1)
```

### `uuid`
```python
import uuid
uuid.uuid4()                       # random UUID — most common
str(uuid.uuid4())                  # 'a1b2c3d4-...'
uuid.uuid1()                        # MAC-based; leaks identity, avoid
uuid.uuid5(uuid.NAMESPACE_URL, "https://example.com/x")   # deterministic
```

---

## 10. Math: `math`, `statistics`, `decimal`, `fractions`

### `math`
```python
import math
math.pi; math.e; math.tau; math.inf; math.nan
math.sqrt(2); math.pow(2, 10); math.exp(1); math.log(10); math.log2(8); math.log10(100)
math.sin(math.pi); math.cos(0); math.atan2(y, x)
math.floor(3.7); math.ceil(3.2); math.trunc(3.7); math.round   # actually `round` is builtin
math.gcd(12, 18); math.lcm(4, 6); math.factorial(5)
math.isclose(0.1 + 0.2, 0.3)
math.isnan(x); math.isinf(x); math.isfinite(x)
math.hypot(3, 4)             # 5.0
math.comb(5, 2)              # combinations
math.perm(5, 2)              # permutations
```

### `statistics`
```python
import statistics as stats
stats.mean([1, 2, 3, 4])
stats.median([1, 2, 3, 4, 5])
stats.mode([1, 1, 2, 3])
stats.stdev([1, 2, 3, 4])    # sample stdev
stats.pstdev([1, 2, 3, 4])    # population stdev
stats.variance([1, 2, 3, 4])
stats.quantiles([1,2,3,4,5,6,7,8,9,10], n=4)   # quartiles
stats.correlation([1,2,3], [2,4,6])             # 3.10+
stats.linear_regression(xs, ys)                  # 3.10+
```

For real stats, use NumPy/SciPy/pandas.

### `decimal` — exact decimal arithmetic
```python
from decimal import Decimal, getcontext
Decimal("0.1") + Decimal("0.2")     # Decimal('0.3')  — no float error
getcontext().prec = 30                # 30 sig figs
```

Use for money or anything where rounding errors are unacceptable.

### `fractions` — exact rationals
```python
from fractions import Fraction
Fraction(1, 3) + Fraction(1, 6)     # Fraction(1, 2)
Fraction("3.14")                     # Fraction(157, 50)
```

---

## 11. Compression & Archives: `gzip`, `zipfile`, `tarfile`

### `gzip`
```python
import gzip
with gzip.open("data.txt.gz", "wt") as f:
    f.write("hello")
with gzip.open("data.txt.gz", "rt") as f:
    text = f.read()
```

### `zipfile`
```python
import zipfile

with zipfile.ZipFile("archive.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.write("file1.txt")
    z.writestr("greeting.txt", "Hello")

with zipfile.ZipFile("archive.zip") as z:
    z.namelist()
    z.extractall("output_dir")
    with z.open("greeting.txt") as f:
        print(f.read().decode())
```

### `tarfile`
```python
import tarfile

with tarfile.open("archive.tar.gz", "w:gz") as t:
    t.add("dir/")

with tarfile.open("archive.tar.gz", "r:gz") as t:
    t.extractall("output_dir")
```

---

## 12. Pickling & Serialization: `pickle`, `copy`

### `pickle` — Python's native binary serializer
```python
import pickle

data = {"name": "Alice", "age": 30, "scores": [98, 87, 91]}

# Save
with open("data.pkl", "wb") as f:
    pickle.dump(data, f)

# Load
with open("data.pkl", "rb") as f:
    restored = pickle.load(f)

# Or to/from bytes
blob = pickle.dumps(data)
data = pickle.loads(blob)
```

> ⚠️ **Never `pickle.load` data from untrusted sources.** Pickle can execute arbitrary code during deserialization.

Pickle is fine for:
- Caching Python objects to disk.
- IPC between trusted Python processes (e.g., `multiprocessing`).

For interop with other languages or untrusted input, use JSON or a schema-based format like Protobuf / Avro / MessagePack.

### `copy` — shallow and deep copies
```python
import copy

a = {"x": [1, 2, 3]}
b = copy.copy(a)            # shallow — b["x"] is the same list as a["x"]
c = copy.deepcopy(a)        # deep — fully independent

b["x"].append(4)
print(a["x"])               # [1, 2, 3, 4] — uh oh
print(c["x"])               # [1, 2, 3]   — safe
```

---

## 13. Other Useful Ones

| Module | What for |
|---|---|
| `enum` | Enums (covered in `04_oop.md`) |
| `dataclasses` | Dataclasses (covered in `04_oop.md`) |
| `functools` | Higher-order functions (covered in `05_functional.md`) |
| `itertools` | Iterator combinators (covered in `05_functional.md`) |
| `collections` | Specialized containers (covered in `03_data_structures.md`) |
| `pprint` | Pretty-print Python data: `pprint.pp(big_dict)` |
| `pathlib` | Filesystem paths (covered above) |
| `io` | `StringIO`, `BytesIO` — in-memory file-like objects |
| `textwrap` | Wrap and dedent text |
| `string` | `string.Template`, `string.ascii_letters`, etc. |
| `unicodedata` | Unicode normalization (`normalize("NFC", s)`) |
| `base64` | Base64 encoding: `b64encode`, `b64decode` |
| `struct` | Pack/unpack binary data: `struct.pack(">i", 42)` |
| `array` | Compact homogeneous numeric arrays (use NumPy instead) |
| `bisect` | Binary search and sorted-list maintenance |
| `heapq` | Heap-based priority queue: `heappush`, `heappop`, `nlargest`, `nsmallest` |
| `weakref` | Weak references — don't keep an object alive |
| `inspect` | Reflect on objects, get source, signatures |
| `types` | `SimpleNamespace`, `MappingProxyType` |
| `typing` | Type hints (covered in `04_oop.md`) |
| `contextlib` | Context manager utilities (covered in `05_functional.md`) |
| `traceback` | Format and inspect tracebacks |
| `warnings` | Issue and filter non-fatal warnings |
| `getpass` | `getpass.getpass("Password: ")` — hidden input |
| `shelve` | Persistent dict (pickle-based key-value store) |
| `sqlite3` | Built-in SQLite (covered in `10_databases.md`) |
| `socket` | Low-level networking (covered in `09_io_and_apis.md`) |
| `ssl` | TLS support for sockets and urllib |
| `email` | Email parsing and composition (RFC 5322) |
| `mimetypes` | Guess MIME type from filename |
| `ipaddress` | `IPv4Address`, `IPv6Network`, validate and manipulate |
| `dis` | Disassemble Python bytecode |
| `gc` | Manual control of garbage collector |

### Examples worth seeing once

```python
# pprint
from pprint import pp
pp({"a": [1, 2, 3], "b": {"x": 1, "y": 2}}, indent=2, width=40)

# bisect
import bisect
sorted_list = [1, 3, 5, 7]
bisect.insort(sorted_list, 4)         # keeps it sorted
bisect.bisect_left(sorted_list, 5)    # index where 5 would go

# heapq — priority queue
import heapq
h = []
heapq.heappush(h, (1, "low priority"))
heapq.heappush(h, (5, "high priority"))
heapq.heappop(h)                       # (1, "low priority")
heapq.nlargest(3, [4, 1, 7, 3, 8])    # [8, 7, 4]

# weakref
import weakref
class Node: pass
node = Node()
r = weakref.ref(node)
r()                                     # returns node
del node
r()                                     # returns None now

# inspect
import inspect
inspect.signature(my_function)
inspect.getsource(my_function)
inspect.getmembers(my_module)
```

---

The stdlib is enormous; this covers the modules you'll hit most weeks. For everything else, the [official Python docs](https://docs.python.org/3/library/) are searchable and excellent.

Next: doing things at the same time — `08_concurrency.md`.
