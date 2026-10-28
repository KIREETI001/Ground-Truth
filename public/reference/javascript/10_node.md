# 10. Node.js — Runtime APIs

> Filesystem, HTTP, paths, streams, processes, child processes, EventEmitter, and the rest of Node's standard library.

> Most APIs work in Bun unchanged. Deno has equivalents under a different namespace (`Deno.readFile` etc.) plus a polyfill layer for Node APIs.

---

## Table of Contents

1. [Built-in Modules](#1-built-in-modules)
2. [Filesystem (`node:fs`)](#2-filesystem-nodefs)
3. [Paths (`node:path`)](#3-paths-nodepath)
4. [Process (`node:process`)](#4-process-nodeprocess)
5. [OS (`node:os`)](#5-os-nodeos)
6. [HTTP / HTTPS](#6-http--https)
7. [Streams](#7-streams)
8. [Buffers and Encoding](#8-buffers-and-encoding)
9. [Child Processes](#9-child-processes)
10. [Worker Threads](#10-worker-threads)
11. [EventEmitter](#11-eventemitter)
12. [Crypto, Util, and Friends](#12-crypto-util-and-friends)

---

## 1. Built-in Modules

Always prefix Node built-ins with `node:` — clearer, future-proof, avoids name collisions with npm packages.

```javascript
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
```

Common modules:

| Module | What |
|---|---|
| `node:fs` | Filesystem (sync, callback, and promise versions) |
| `node:fs/promises` | Promise-based fs (preferred) |
| `node:path` | Path manipulation |
| `node:url` | URL parsing |
| `node:http`, `node:https` | HTTP server/client |
| `node:net` | TCP/UDP |
| `node:stream` | Stream primitives |
| `node:crypto` | Hashing, ciphers, random |
| `node:process` | Process info, signals, exit |
| `node:os` | OS info |
| `node:child_process` | Spawn subprocesses |
| `node:worker_threads` | Worker threads |
| `node:events` | EventEmitter |
| `node:buffer` | Binary buffers |
| `node:util` | Misc utilities |
| `node:assert` | Assertions (for tests) |
| `node:querystring` | URL query strings (older — prefer URLSearchParams) |
| `node:zlib` | Compression |
| `node:readline` | Line-by-line I/O |
| `node:dgram` | UDP datagram |
| `node:tls` | TLS sockets |
| `node:dns` | DNS lookups |

---

## 2. Filesystem (`node:fs`)

Three flavors:
- **`node:fs/promises`** — async, returns Promises. **Preferred for new code.**
- **`node:fs`** callbacks — older `(err, data) => ...` style.
- **`node:fs`** sync (`readFileSync`, `writeFileSync`, etc.) — blocking. Fine for CLI startup, never in a server's hot path.

### Reading
```javascript
import { readFile, readdir, stat } from "node:fs/promises";

const text = await readFile("file.txt", "utf8");
const buf = await readFile("image.png");                 // Buffer

const files = await readdir("./folder");                  // array of names
const files = await readdir("./folder", { withFileTypes: true });
for (const dirent of files) {
    if (dirent.isFile()) console.log(dirent.name);
}

const info = await stat("file.txt");
info.size; info.isFile(); info.isDirectory(); info.mtime;
```

### Writing
```javascript
import { writeFile, appendFile, mkdir, rm, rename, cp } from "node:fs/promises";

await writeFile("out.txt", "hello", "utf8");
await writeFile("out.bin", buffer);
await appendFile("log.txt", "more\n");

await mkdir("path/to/dir", { recursive: true });          // like mkdir -p
await rm("file.txt");
await rm("dir", { recursive: true, force: true });        // like rm -rf
await rename("old.txt", "new.txt");
await cp("src", "dst", { recursive: true });               // 16.7+
```

### Streaming (for large files)
```javascript
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

await pipeline(
    createReadStream("big-in.txt"),
    createWriteStream("big-out.txt"),
);

// Read line by line
import readline from "node:readline";

const rl = readline.createInterface({
    input: createReadStream("huge.log"),
    crlfDelay: Infinity,
});
for await (const line of rl) {
    process(line);
}
```

### File watching
```javascript
import { watch } from "node:fs/promises";

const watcher = watch("./src", { recursive: true });
for await (const event of watcher) {
    console.log(event.eventType, event.filename);
}
```

For production-grade watching (with debounce, cross-platform reliability): **`chokidar`**.

### Globbing
Node 22+ has native glob in `fs.glob`. Otherwise use **`fast-glob`** or **`globby`**:
```javascript
import fg from "fast-glob";
const files = await fg(["src/**/*.ts", "!**/*.test.ts"]);
```

### Temp directories
```javascript
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = await mkdtemp(path.join(tmpdir(), "myapp-"));
try {
    // use dir
} finally {
    await rm(dir, { recursive: true });
}
```

### Permissions
```javascript
import { chmod, chown } from "node:fs/promises";
await chmod("script.sh", 0o755);
```

---

## 3. Paths (`node:path`)

Cross-platform path manipulation.

```javascript
import path from "node:path";

path.join("a", "b", "c");                  // "a/b/c"  (or "a\\b\\c" on Windows)
path.join("/foo", "..", "bar");             // "/bar"
path.resolve("a/b", "c");                    // absolute: "/cwd/a/b/c"
path.relative("/a/b/c", "/a/d");             // "../../d"
path.normalize("a//b/../c");                  // "a/c"

path.dirname("/a/b/c.txt");                   // "/a/b"
path.basename("/a/b/c.txt");                  // "c.txt"
path.basename("/a/b/c.txt", ".txt");          // "c"
path.extname("/a/b/c.txt");                   // ".txt"

path.parse("/a/b/c.txt");
// { root: "/", dir: "/a/b", base: "c.txt", ext: ".txt", name: "c" }
path.format({ dir: "/a/b", name: "c", ext: ".txt" });
// "/a/b/c.txt"

path.sep;            // "/" on POSIX, "\\" on Windows
path.delimiter;       // ":" on POSIX, ";" on Windows (for PATH env)

// Force POSIX/Windows style explicitly
path.posix.join(...);
path.win32.join(...);
```

Always use `path.join` / `path.resolve` instead of string concatenation. Don't hardcode `"/"`.

### `import.meta.url` → file path (ESM)
```javascript
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Or (Node 20.11+)
const __dirname = import.meta.dirname;
const __filename = import.meta.filename;
```

---

## 4. Process (`node:process`)

```javascript
import process from "node:process";

process.argv             // ["/path/to/node", "/path/to/script.js", "arg1", "arg2"]
process.argv.slice(2)     // user args

process.env.NODE_ENV     // "production" etc.
process.env.HOME

process.cwd();           // current working directory
process.chdir("/new/dir");

process.pid              // process ID
process.platform         // "linux", "darwin", "win32"
process.arch              // "x64", "arm64"
process.version           // "v22.10.0"
process.versions          // { node, v8, openssl, ... }

process.uptime()         // seconds since process start
process.memoryUsage()    // { rss, heapTotal, heapUsed, external }

process.exit(0)          // exit with code (1 = error, 0 = success)
process.exitCode = 1     // set without immediately exiting

// stdin / stdout / stderr (streams)
process.stdout.write("hello\n");
process.stderr.write("error\n");

// Signals
process.on("SIGINT", () => {
    console.log("Ctrl+C — shutting down");
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await gracefulShutdown();
    process.exit(0);
});

// Errors
process.on("uncaughtException", (err) => {
    console.error("FATAL", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection", reason);
    process.exit(1);
});
```

### Reading stdin
```javascript
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
    process(input);
});

// Or line by line:
import readline from "node:readline";
const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
    handle(line);
}
```

### Command-line argument parsing
For anything beyond `process.argv.slice(2)`:
- **`node:util`** parseArgs (built-in, simple):
```javascript
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
    options: {
        verbose: { type: "boolean", short: "v" },
        output: { type: "string", short: "o" },
    },
    allowPositionals: true,
});
```
- **`commander`** — feature-rich, mature.
- **`yargs`** — alternative.
- For polished CLIs: **`cac`**, **`citty`**, or **`clipanion`**.

---

## 5. OS (`node:os`)

```javascript
import os from "node:os";

os.platform()       // "linux", "darwin", "win32"
os.arch()            // "x64", "arm64"
os.cpus()            // array of CPU info
os.cpus().length     // CPU count
os.totalmem()        // bytes
os.freemem()
os.uptime()          // seconds since system boot
os.hostname()
os.userInfo()         // { username, uid, gid, shell, homedir }
os.homedir()
os.tmpdir()
os.networkInterfaces()
os.EOL                // "\n" on POSIX, "\r\n" on Windows
```

---

## 6. HTTP / HTTPS

### Server
```javascript
import http from "node:http";

const server = http.createServer((req, res) => {
    if (req.url === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Hello\n");
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3000, () => console.log("running on 3000"));
```

For production, use a framework (Express, Fastify, Hono, Next.js) — covered in `12_backend.md`. Built-in `http` is for low-level needs or tiny services.

### Client — fetch (preferred since Node 18)
```javascript
const r = await fetch("https://api.example.com/users");
const data = await r.json();
```

Same `fetch` API as browsers. For more control (HTTP/2, advanced agents), use the lower-level `http`/`https` modules or **`undici`** (Node's underlying HTTP engine).

### `undici` — Node's HTTP engine, directly
```javascript
import { request, fetch, Agent } from "undici";

const { statusCode, body } = await request("https://example.com");
const data = await body.json();

// Custom pool
const dispatcher = new Agent({ connections: 100, pipelining: 1 });
await fetch(url, { dispatcher });
```

Faster than the built-in `http` for high-throughput clients.

---

## 7. Streams

Node's core abstraction for I/O. Most file, network, and process I/O is stream-based.

Four types:
- **Readable** — data flows out (file read, HTTP request body).
- **Writable** — data flows in (file write, HTTP response).
- **Duplex** — both (sockets).
- **Transform** — duplex that transforms (gzip, parsers).

### Reading
```javascript
import { createReadStream } from "node:fs";

const stream = createReadStream("big.txt", { encoding: "utf8" });

// for await
for await (const chunk of stream) {
    process(chunk);
}

// Events
stream.on("data", chunk => ...);
stream.on("end", () => ...);
stream.on("error", err => ...);
```

### Writing
```javascript
import { createWriteStream } from "node:fs";

const stream = createWriteStream("out.txt");
stream.write("hello\n");
stream.write("world\n");
stream.end();          // close

// Backpressure
if (!stream.write(chunk)) {
    await new Promise(r => stream.once("drain", r));
}
```

### `pipeline` — connect streams with error handling
```javascript
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";

await pipeline(
    createReadStream("input.txt"),
    createGzip(),
    createWriteStream("input.txt.gz"),
);
```

`pipeline` handles errors and cleanup correctly. Almost always prefer it over manual `.pipe()` chains.

### `Readable.from` — create a stream from anything
```javascript
import { Readable } from "node:stream";

const stream = Readable.from(["a", "b", "c"]);
const stream2 = Readable.from(asyncGenerator());
```

### Web Streams interop
Node also supports the WHATWG (browser) Streams API. `fetch` responses are Web ReadableStreams, not Node Readables:
```javascript
const r = await fetch(url);
for await (const chunk of r.body) {
    // Uint8Array chunks
}

// Convert between
import { Readable } from "node:stream";
const webStream = Readable.toWeb(nodeReadable);
const nodeStream = Readable.fromWeb(webStream);
```

---

## 8. Buffers and Encoding

Node has `Buffer` (a subclass of `Uint8Array`) for binary data.

```javascript
import { Buffer } from "node:buffer";

const buf = Buffer.from("Hello");                   // UTF-8 by default
const buf = Buffer.from("Hello", "utf8");
const buf = Buffer.from("48656c6c6f", "hex");        // hex string
const buf = Buffer.from("SGVsbG8=", "base64");       // base64
const buf = Buffer.from([72, 101, 108, 108, 111]);   // array of bytes
const buf = Buffer.alloc(1024);                       // zero-filled
const buf = Buffer.allocUnsafe(1024);                 // faster, contents undefined

buf.length;
buf.toString();                                       // "Hello"
buf.toString("hex");
buf.toString("base64");

// Compare
Buffer.compare(a, b);
buf.equals(other);

// Read/write numeric values
buf.writeUInt32BE(42, 0);
buf.readUInt32BE(0);

// Concatenate
Buffer.concat([buf1, buf2]);
```

Modern code prefers `Uint8Array` where possible — it works in browsers too. `Buffer` is a `Uint8Array` with extra methods; you can pass a Buffer anywhere a Uint8Array is expected.

### TextEncoder / TextDecoder (cross-runtime)
```javascript
const bytes = new TextEncoder().encode("hello");   // Uint8Array
const str = new TextDecoder("utf-8").decode(bytes);  // "hello"
```

Standard, works in browsers + Node + Deno + Bun.

---

## 9. Child Processes

### `spawn` — for long-running processes / streaming output
```javascript
import { spawn } from "node:child_process";

const ls = spawn("ls", ["-la"]);

ls.stdout.on("data", (data) => console.log(`stdout: ${data}`));
ls.stderr.on("data", (data) => console.error(`stderr: ${data}`));
ls.on("close", (code) => console.log(`exited with ${code}`));
```

### `exec` / `execFile` — for short commands, buffered output
```javascript
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const { stdout, stderr } = await execAsync("ls -la");
console.log(stdout);
```

**Warning**: `exec` runs through a shell. If any argument comes from user input, it's a shell-injection vulnerability. Use `execFile` (or `spawn`) with separate args:
```javascript
import { execFile } from "node:child_process";
const execFileAsync = promisify(execFile);

await execFileAsync("ls", ["-la", userPath]);   // user path is just an arg, not parsed
```

### `fork` — spawn another Node process with IPC
```javascript
import { fork } from "node:child_process";

const child = fork("./worker.js");
child.send({ task: "compute" });
child.on("message", (msg) => console.log("from child:", msg));
```

For Node-to-Node communication. For CPU-bound work, prefer worker threads.

---

## 10. Worker Threads

Threads inside the same process. Share memory via SharedArrayBuffer; otherwise message-passing.

```javascript
// main.js
import { Worker } from "node:worker_threads";

const worker = new Worker("./worker.js", { workerData: { input: 42 } });

worker.on("message", (result) => console.log(result));
worker.on("error", (err) => console.error(err));
worker.on("exit", (code) => console.log("exit", code));

worker.postMessage({ cmd: "run" });
```

```javascript
// worker.js
import { parentPort, workerData } from "node:worker_threads";

parentPort.on("message", (msg) => {
    const result = doHeavyWork(workerData.input);
    parentPort.postMessage(result);
});
```

### When to use
- **CPU-bound work** — image processing, parsing, encryption.
- Don't use for I/O — Node's async I/O is single-thread-efficient already.

Libraries: **`piscina`** (worker pool with API), **`comlink`** (RPC-style messaging).

---

## 11. EventEmitter

Pub/sub primitive used throughout Node's API.

```javascript
import { EventEmitter } from "node:events";

class MyService extends EventEmitter {
    doStuff() {
        this.emit("started");
        // ...
        this.emit("done", { result: 42 });
    }
}

const svc = new MyService();
svc.on("started", () => console.log("started"));
svc.on("done", (data) => console.log("done", data));

svc.once("done", handler);       // one-shot
svc.off("started", handler);
svc.removeAllListeners("started");

svc.setMaxListeners(20);          // default warning threshold is 10

// Async iteration over events
import { on } from "node:events";
for await (const [data] of on(svc, "done")) {
    handle(data);
}
```

### Modern alternatives
- **`AbortController`** for cancellation rather than custom `cancel` events.
- **Async iterators** for streams of events.
- **Observable libraries** (RxJS) for complex pipelines.

EventEmitter is still everywhere in Node — knowing the API is necessary.

---

## 12. Crypto, Util, and Friends

### `node:crypto`
```javascript
import { randomBytes, randomUUID, createHash, createHmac, scrypt, timingSafeEqual } from "node:crypto";

randomUUID();                              // UUID v4
randomBytes(16).toString("hex");           // 32-char hex string

const hash = createHash("sha256")
    .update("hello")
    .digest("hex");

const mac = createHmac("sha256", secret).update(data).digest("hex");

// Password hashing — use scrypt (or bcrypt/argon2 from npm)
import { promisify } from "node:util";
const scryptAsync = promisify(scrypt);
const hash = await scryptAsync(password, salt, 64);

// Constant-time compare (prevents timing attacks)
timingSafeEqual(a, b);

// Web Crypto API also available — cross-runtime
import { webcrypto } from "node:crypto";
await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode("hello"));
```

### `node:util`
```javascript
import { promisify, inspect, format, types, parseArgs } from "node:util";

const readFileAsync = promisify(fs.readFile);

inspect(obj, { depth: 5, colors: true });    // pretty-print
console.log(format("Hello %s, you are %d", name, age));

types.isPromise(x);
types.isDate(x);
```

### `node:assert`
For tests (often replaced by Vitest/Jest):
```javascript
import assert from "node:assert/strict";

assert(1 + 1 === 2);
assert.equal(a, b);
assert.deepEqual(obj1, obj2);
assert.throws(() => { throw new Error(); });
await assert.rejects(promise);
```

### `node:zlib` — compression
```javascript
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const buf = await gzipAsync(Buffer.from("hello"));
```

Or as streams via `createGzip` / `createGunzip`.

### `node:url`
```javascript
import { URL, fileURLToPath, pathToFileURL } from "node:url";

const url = new URL("/path", "https://example.com");
const localPath = fileURLToPath(new URL("./data.txt", import.meta.url));
```

### `node:test` — built-in test runner (since 18)
```javascript
import { test, describe } from "node:test";
import assert from "node:assert/strict";

test("addition", () => {
    assert.equal(1 + 1, 2);
});

describe("my suite", () => {
    test("one thing", () => { ... });
});
```

Run with `node --test`. Adoption is growing in 2026, but Vitest is still the typical choice.

---

That's the Node platform — enough to handle servers, CLIs, scripts, and file processing. For higher-level web work, see `12_backend.md`. For databases, see `13_databases.md`.

Next: how all this gets shown to users on the frontend — `11_web_frameworks.md`.
