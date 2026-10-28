# 09. I/O and APIs

> File I/O, HTTP clients, websockets, raw sockets — how Python talks to the outside world.

---

## Table of Contents

1. [File I/O](#1-file-io)
2. [Binary I/O](#2-binary-io)
3. [Streaming Large Files](#3-streaming-large-files)
4. [Text Encoding Tips](#4-text-encoding-tips)
5. [HTTP with `requests`](#5-http-with-requests)
6. [HTTP with `httpx`](#6-http-with-httpx)
7. [Async HTTP](#7-async-http)
8. [REST API Patterns](#8-rest-api-patterns)
9. [WebSockets](#9-websockets)
10. [Raw Sockets](#10-raw-sockets)
11. [Email and Other Protocols](#11-email-and-other-protocols)

---

## 1. File I/O

The basics:
```python
# Read
with open("file.txt", encoding="utf-8") as f:
    text = f.read()

# Read line by line — memory-efficient
with open("file.txt", encoding="utf-8") as f:
    for line in f:
        print(line.rstrip())

# Write
with open("file.txt", "w", encoding="utf-8") as f:
    f.write("hello\n")

# Append
with open("file.txt", "a", encoding="utf-8") as f:
    f.write("more\n")

# Read all lines into a list
with open("file.txt") as f:
    lines = f.readlines()        # includes \n on each line
```

### Modes
| Mode | Meaning |
|---|---|
| `"r"` | Read text (default) |
| `"w"` | Write text — truncates the file first |
| `"a"` | Append text |
| `"x"` | Create new — fails if exists |
| `"r+"` | Read + write |
| `"rb"`, `"wb"`, etc. | Binary versions |
| `"rt"` | Read text (explicit) |

Always pass `encoding="utf-8"` for text. The default depends on the OS and can bite you (Windows historically defaulted to cp1252).

### Always use `with`
The `with` block guarantees the file is closed even if an exception is raised. Don't write `f = open(...)` without a corresponding `close` — it leaks resources and may leave data unflushed.

### `pathlib` shortcuts
`pathlib.Path` has convenience methods that handle the open/close for you:
```python
from pathlib import Path

text = Path("file.txt").read_text(encoding="utf-8")
Path("out.txt").write_text("hello", encoding="utf-8")
data = Path("file.bin").read_bytes()
Path("out.bin").write_bytes(b"...")
```

Good for small files. For large ones, use the `open()` form and stream.

### Reading and writing in one pass
```python
with open("in.txt") as fin, open("out.txt", "w") as fout:
    for line in fin:
        fout.write(line.upper())
```

---

## 2. Binary I/O

```python
with open("image.png", "rb") as f:
    header = f.read(8)             # first 8 bytes
    body = f.read()

with open("out.bin", "wb") as f:
    f.write(b"\x89PNG\r\n\x1a\n")
    f.write(body)
```

`f.read(n)` reads up to `n` bytes. `f.read()` reads to EOF.

### Seeking
```python
with open("file.bin", "rb") as f:
    f.seek(100)                    # absolute position
    f.seek(50, 1)                   # relative (1 = current)
    f.seek(-10, 2)                  # relative to end (2 = end)
    pos = f.tell()
```

### Memory-mapped files
For random access to large files:
```python
import mmap

with open("big.bin", "r+b") as f:
    with mmap.mmap(f.fileno(), 0) as mm:
        first = mm[0:10]
        idx = mm.find(b"target")
        mm[100:104] = b"XXXX"        # write through
```

### `io.BytesIO` / `io.StringIO` — in-memory file-like objects
Great for testing or feeding APIs that want file objects.
```python
import io

buf = io.BytesIO()
buf.write(b"hello")
buf.seek(0)
buf.read()                 # b"hello"

s = io.StringIO("line 1\nline 2\n")
for line in s:
    print(line.rstrip())
```

---

## 3. Streaming Large Files

For files larger than memory, never `read()` the whole thing.

### Line by line — for text
```python
with open("huge.log") as f:
    for line in f:
        process(line)
```

### Chunk by chunk — for binary
```python
def chunks(path, size=8192):
    with open(path, "rb") as f:
        while chunk := f.read(size):     # walrus operator (3.8+)
            yield chunk

for chunk in chunks("video.mp4"):
    process(chunk)
```

### Hashing a file
```python
import hashlib

h = hashlib.sha256()
with open("big.bin", "rb") as f:
    for chunk in iter(lambda: f.read(65536), b""):
        h.update(chunk)
print(h.hexdigest())
```

---

## 4. Text Encoding Tips

- **Always specify encoding** when opening text files. `encoding="utf-8"` is right almost everywhere.
- Files written on Windows may have a BOM. Use `encoding="utf-8-sig"` to read those.
- Unknown encoding? Try `chardet` or `charset-normalizer` (third-party).
- Mixed-encoding files? Read as bytes; decode each line independently.

### Decoding bytes you don't trust
```python
data: bytes = ...

# Strict (default) — raises on invalid byte sequence
data.decode("utf-8")

# Replace bad bytes with U+FFFD (▒)
data.decode("utf-8", errors="replace")

# Ignore bad bytes silently
data.decode("utf-8", errors="ignore")

# Use surrogate escapes (round-trip safe)
data.decode("utf-8", errors="surrogateescape")
```

### Common pitfall: mixing str and bytes
```python
b"hello" + "world"        # TypeError
b"hello" + "world".encode()
b"hello".decode() + "world"
```

If you're reading binary and want text, decode. If you're writing text and need bytes, encode.

---

## 5. HTTP with `requests`

The classic Python HTTP library. Synchronous, simple, ubiquitous.

```bash
pip install requests
```

```python
import requests

# GET
r = requests.get("https://api.example.com/users/42")
r.status_code                          # 200
r.text                                  # response body as string
r.json()                                # parsed JSON
r.content                               # bytes
r.headers                                # CaseInsensitiveDict

# With query params
r = requests.get("https://api.example.com/search", params={"q": "python"})

# With headers
r = requests.get(url, headers={"Authorization": "Bearer TOKEN"})

# POST JSON
r = requests.post("https://api.example.com/users", json={"name": "Alice"})

# POST form
r = requests.post(url, data={"key": "value"})

# POST file
with open("photo.png", "rb") as f:
    r = requests.post(url, files={"upload": f})

# Other methods
requests.put(url, json=data)
requests.patch(url, json=data)
requests.delete(url)
```

### Sessions — connection pooling, persistent state
For multiple requests to the same host, use a Session:
```python
with requests.Session() as s:
    s.headers.update({"Authorization": "Bearer TOKEN"})
    r1 = s.get("https://api.example.com/a")
    r2 = s.get("https://api.example.com/b")
```

Cookies are also persisted across requests in the session.

### Timeouts
**Always set a timeout.** Without one, a hung server will hang your program forever.
```python
r = requests.get(url, timeout=10)
r = requests.get(url, timeout=(3, 30))    # (connect, read) timeouts
```

### Error handling
```python
try:
    r = requests.get(url, timeout=10)
    r.raise_for_status()              # raises HTTPError for 4xx/5xx
    data = r.json()
except requests.Timeout:
    ...
except requests.HTTPError as e:
    print(e.response.status_code, e.response.text)
except requests.RequestException as e:
    # base class — catches Timeout, ConnectionError, etc.
    ...
```

### Streaming responses (big files)
```python
with requests.get(url, stream=True) as r:
    with open("download.bin", "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
```

### Authentication
```python
# Basic
requests.get(url, auth=("user", "pass"))

# Bearer token (most APIs)
requests.get(url, headers={"Authorization": "Bearer TOKEN"})

# Custom — write a class with __call__ that mutates the request
```

### Retries
`requests` doesn't retry automatically. Use `urllib3.util.retry.Retry` with an adapter, or just use `tenacity`:
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential())
def fetch(url):
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()
```

### Disabling TLS verification (debugging only!)
```python
requests.get(url, verify=False)        # don't ship this
```

For self-signed certs, prefer `verify="/path/to/ca-bundle.crt"`.

---

## 6. HTTP with `httpx`

Modern alternative. Supports both sync and async, HTTP/2, type hints. API is intentionally close to `requests`.

```bash
pip install httpx
```

```python
import httpx

# Sync — works like requests
r = httpx.get("https://api.example.com")
r.json()

# With a client (connection pooling, persistent settings)
with httpx.Client(base_url="https://api.example.com", timeout=10) as c:
    r1 = c.get("/users")
    r2 = c.post("/users", json={"name": "Bob"})
```

### Async
```python
import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as c:
        r = await c.get("https://api.example.com")
        print(r.json())

        # Many requests in parallel
        urls = ["https://a", "https://b", "https://c"]
        responses = await asyncio.gather(*(c.get(u) for u in urls))
        for resp in responses:
            print(resp.status_code)

asyncio.run(main())
```

### HTTP/2 support
```python
client = httpx.Client(http2=True)
```

### When to pick which
| | `requests` | `httpx` |
|---|---|---|
| API surface | Mature, vast docs | Clean, modern |
| Async | No | Yes |
| HTTP/2 | No | Yes |
| Type hints | Minimal | Full |
| Use this for | Simple scripts, existing code | New code, especially async |

---

## 7. Async HTTP

Already shown above with `httpx`. For maximum throughput when you have many independent requests:

```python
import asyncio
import httpx

async def fetch_all(urls):
    async with httpx.AsyncClient(timeout=10) as client:
        return await asyncio.gather(
            *(client.get(url) for url in urls),
            return_exceptions=True,
        )

results = asyncio.run(fetch_all(["https://example.com"] * 100))
```

### Bounded concurrency
Don't open 10,000 connections at once — server and OS will both complain. Use a semaphore:
```python
sem = asyncio.Semaphore(20)

async def get(client, url):
    async with sem:
        return await client.get(url)
```

### `aiohttp` — the older async-only library
Still widely used, especially for HTTP servers. For clients, `httpx` is usually simpler.

---

## 8. REST API Patterns

### Common pattern: typed wrapper
```python
from typing import Self
import httpx

class APIClient:
    def __init__(self, base_url: str, token: str):
        self._client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args):
        self._client.close()

    def get_user(self, user_id: int) -> dict:
        r = self._client.get(f"/users/{user_id}")
        r.raise_for_status()
        return r.json()

    def create_user(self, name: str, email: str) -> dict:
        r = self._client.post("/users", json={"name": name, "email": email})
        r.raise_for_status()
        return r.json()


with APIClient("https://api.example.com", token) as api:
    user = api.get_user(42)
    print(user)
```

### Pagination
Three common shapes:
```python
# 1. Cursor / next-link pagination
url = "/items"
items = []
while url:
    r = client.get(url)
    data = r.json()
    items.extend(data["items"])
    url = data.get("next")

# 2. Page/offset
page = 1
while True:
    r = client.get("/items", params={"page": page})
    page_items = r.json()["items"]
    if not page_items:
        break
    items.extend(page_items)
    page += 1

# 3. Generator interface
def paginate(client, path, params=None):
    params = params or {}
    page = 1
    while True:
        r = client.get(path, params={**params, "page": page})
        items = r.json()["items"]
        if not items: return
        yield from items
        page += 1

for item in paginate(client, "/items"):
    process(item)
```

### Rate limiting
Most APIs limit you to N requests per second/minute. Strategies:
- Check `Retry-After` header on 429 responses; sleep that long.
- Use a token-bucket library like `aiolimiter` (async) or `ratelimit`.
- Use exponential backoff with `tenacity`.

### Webhooks (receiving HTTP)
You don't *send* webhooks — you receive them. Build a tiny endpoint (FastAPI, Flask) that accepts the POSTs from another service. Verify signatures (HMAC) per the provider's spec.

---

## 9. WebSockets

For bidirectional, real-time communication.

### Server: `websockets` library
```bash
pip install websockets
```

```python
import asyncio
import websockets

async def handler(ws):
    async for message in ws:
        await ws.send(f"echo: {message}")

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8765):
        await asyncio.Future()        # run forever

asyncio.run(main())
```

### Client
```python
import asyncio
import websockets

async def main():
    async with websockets.connect("ws://localhost:8765") as ws:
        await ws.send("hello")
        response = await ws.recv()
        print(response)

asyncio.run(main())
```

### FastAPI WebSockets
If you're using FastAPI, it has built-in support:
```python
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    while True:
        data = await ws.receive_text()
        await ws.send_text(f"echo: {data}")
```

Covered more in `11_web.md`.

---

## 10. Raw Sockets

When you need a protocol that isn't HTTP — custom server, MQTT, IRC, low-level networking.

```python
import socket

# TCP server
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0", 9000))
s.listen()
print("listening on 9000")

while True:
    conn, addr = s.accept()
    print(f"connected by {addr}")
    with conn:
        while True:
            data = conn.recv(1024)
            if not data: break
            conn.sendall(data.upper())
```

```python
# TCP client
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect(("localhost", 9000))
    s.sendall(b"hello")
    data = s.recv(1024)
print("received", data)
```

### UDP
```python
# UDP server
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("0.0.0.0", 9001))
data, addr = s.recvfrom(1024)
s.sendto(b"reply", addr)

# UDP client
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.sendto(b"hi", ("localhost", 9001))
data, _ = s.recvfrom(1024)
```

### TLS — wrap a socket
```python
import socket, ssl
ctx = ssl.create_default_context()
with socket.create_connection(("example.com", 443)) as sock:
    with ctx.wrap_socket(sock, server_hostname="example.com") as ssock:
        ssock.sendall(b"GET / HTTP/1.0\r\nHost: example.com\r\n\r\n")
        data = ssock.recv(65536)
        print(data.decode())
```

### asyncio sockets
For non-blocking servers, prefer `asyncio.start_server` / `asyncio.open_connection`:
```python
async def handle(reader, writer):
    data = await reader.read(1024)
    writer.write(data.upper())
    await writer.drain()
    writer.close()

async def main():
    server = await asyncio.start_server(handle, "0.0.0.0", 9000)
    async with server:
        await server.serve_forever()
```

For most network apps, a high-level library (FastAPI, websockets, aiohttp) is better than raw sockets. Use sockets only when no library fits.

---

## 11. Email and Other Protocols

The stdlib has clients for many protocols. They're stable but rarely the best choice in 2026.

| Need | Stdlib | Better third-party |
|---|---|---|
| Send SMTP email | `smtplib` | `aiosmtplib`, transactional email APIs (SendGrid, Postmark) |
| Parse email | `email` | `mail-parser` |
| FTP | `ftplib` | `pyfilesystem2` |
| IMAP | `imaplib` | `IMAPClient` |
| HTTP server | `http.server` (dev only) | FastAPI, Flask, Django |
| DNS | `socket.gethostbyname` | `dnspython` |
| MQTT | (none) | `paho-mqtt` |
| gRPC | (none) | `grpcio` |

### Quick SMTP example
```python
import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg["From"] = "me@example.com"
msg["To"] = "you@example.com"
msg["Subject"] = "Hi"
msg.set_content("Hello there.")

with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
    s.login(user, password)
    s.send_message(msg)
```

For production email, use an API-based service (Postmark, SendGrid, AWS SES) — better deliverability and easier auth.

---

That's input and output. Next, the most common destination: databases — `10_databases.md`.
