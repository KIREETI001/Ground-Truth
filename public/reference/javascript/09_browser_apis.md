# 09. Browser APIs

> The modern web platform — DOM, fetch, storage, workers, observers, streams, and the APIs everyone uses daily.

> This file covers vanilla browser JS. For framework-specific usage (React, Vue, etc.), see `11_web_frameworks.md`.

---

## Table of Contents

1. [The DOM](#1-the-dom)
2. [Events](#2-events)
3. [Forms](#3-forms)
4. [fetch — HTTP from the Browser](#4-fetch--http-from-the-browser)
5. [Storage](#5-storage)
6. [URL and URLSearchParams](#6-url-and-urlsearchparams)
7. [Workers](#7-workers)
8. [Observers](#8-observers)
9. [Animation and Timing](#9-animation-and-timing)
10. [Other Useful APIs](#10-other-useful-apis)

---

## 1. The DOM

The Document Object Model — the tree of nodes that represents an HTML page in JavaScript.

### Selecting elements
```javascript
document.getElementById("myId")                  // single by ID
document.querySelector("#myId")                   // single by CSS selector
document.querySelector(".my-class")               // first match
document.querySelector("ul > li:first-child")
document.querySelectorAll(".item")                // NodeList (all matches)

// NodeList vs HTMLCollection
const list = document.querySelectorAll("li");     // NodeList — array-like, but NOT live
const live = document.getElementsByClassName("x"); // HTMLCollection — LIVE, updates as DOM changes

[...list].forEach(el => ...)                       // spread to array if needed
list.forEach(el => ...)                             // NodeList has forEach
```

In modern code, prefer `querySelector` / `querySelectorAll` — CSS selectors are versatile.

### Reading and writing
```javascript
const el = document.querySelector("#title");
el.textContent                                    // text content (preferred, safe)
el.innerHTML                                       // HTML — dangerous with user input
el.innerText                                       // similar to textContent but layout-aware

el.textContent = "New title";
el.innerHTML = "<b>bold</b>";                      // parses HTML — only with trusted content

// Attributes
el.getAttribute("href");
el.setAttribute("href", "/new");
el.removeAttribute("href");
el.id; el.className;
el.dataset.userId                                 // <div data-user-id="123"> → "123"

// Classes
el.classList.add("active", "highlighted");
el.classList.remove("active");
el.classList.toggle("dark");
el.classList.contains("active");
el.classList.replace("old", "new");

// Styles (inline only — prefer CSS classes)
el.style.color = "red";
el.style.backgroundColor = "blue";
el.style.cssText = "color: red; padding: 10px;";

getComputedStyle(el).fontSize                     // computed style
```

### `textContent` vs `innerHTML`
- `textContent` — safe. Sets text, escapes HTML entities. **Use this by default.**
- `innerHTML` — parses HTML. Dangerous with user input (XSS). Use only with trusted/escaped content.

### Creating elements
```javascript
const div = document.createElement("div");
div.textContent = "Hello";
div.className = "card";
div.id = "main-card";

const parent = document.querySelector("#container");
parent.appendChild(div);
parent.append(div, anotherDiv, "Some text");        // modern — multiple, mixed

// Insert at specific position
parent.insertBefore(newNode, referenceNode);
parent.prepend(div);

// Remove
div.remove();
parent.removeChild(div);

// Replace
oldDiv.replaceWith(newDiv);

// Clone
const copy = div.cloneNode(true);                    // true = deep clone
```

### Template literals + insertAdjacentHTML (often cleaner than createElement chains)
```javascript
container.insertAdjacentHTML("beforeend", `
    <article class="post">
        <h2>${escapeHtml(post.title)}</h2>
        <p>${escapeHtml(post.body)}</p>
    </article>
`);
```

**Always escape user-provided values** when concatenating HTML. Most frameworks do this automatically (React, Vue).

### Traversal
```javascript
el.parentElement; el.parentNode;
el.children;                       // HTMLCollection of element children
el.childNodes;                      // includes text/comment nodes
el.firstElementChild; el.lastElementChild;
el.nextElementSibling; el.previousElementSibling;
el.closest(".card");                // walks up to nearest matching ancestor
```

### Size and position
```javascript
el.offsetWidth; el.offsetHeight;            // including borders
el.clientWidth; el.clientHeight;            // inside padding (no scrollbar)
el.scrollWidth; el.scrollHeight;            // including overflow

const rect = el.getBoundingClientRect();
rect.top; rect.left; rect.width; rect.height;
rect.x; rect.y;

window.scrollX; window.scrollY;
window.innerWidth; window.innerHeight;
```

`getBoundingClientRect` is the gold standard for measuring on-screen position.

---

## 2. Events

```javascript
button.addEventListener("click", (e) => {
    console.log(e.target);          // the element clicked
});

button.removeEventListener("click", handler);     // must be the same function reference
```

### Common event types
- Mouse: `click`, `dblclick`, `mousedown`, `mouseup`, `mouseenter`, `mouseleave`, `mousemove`, `contextmenu`.
- Keyboard: `keydown`, `keyup`, (`keypress` is deprecated).
- Form: `input`, `change`, `submit`, `focus`, `blur`.
- Window: `load`, `resize`, `scroll`, `popstate`, `hashchange`, `beforeunload`.
- Touch: `touchstart`, `touchend`, `touchmove`.
- Pointer (preferred for mouse+touch): `pointerdown`, `pointerup`, `pointermove`.
- Media: `play`, `pause`, `ended`, `timeupdate`.

### Event object
```javascript
button.addEventListener("click", (e) => {
    e.target                        // element actually clicked
    e.currentTarget                  // element handler is attached to
    e.preventDefault()               // cancel default action (form submit, link nav)
    e.stopPropagation()              // don't bubble further up
    e.stopImmediatePropagation()      // prevent other handlers on same element
});
```

### Event listener options
```javascript
button.addEventListener("click", handler, {
    once: true,           // auto-removes after first fire
    passive: true,        // doesn't call preventDefault — improves scroll perf
    capture: true,        // run during capture phase (top-down) instead of bubble (bottom-up)
    signal: controller.signal,   // remove on abort
});

// Modern cleanup pattern
const controller = new AbortController();
button.addEventListener("click", handler, { signal: controller.signal });
// later:
controller.abort();    // removes the listener
```

### Event delegation
Attach one listener to a parent instead of many to children:
```javascript
document.querySelector("#list").addEventListener("click", (e) => {
    const item = e.target.closest("li");
    if (item) handleItemClick(item);
});
```

Especially useful for dynamic content where children are added/removed.

### Custom events
```javascript
const event = new CustomEvent("user-joined", {
    detail: { userId: 42, name: "Alice" },
    bubbles: true,
});
element.dispatchEvent(event);

element.addEventListener("user-joined", (e) => {
    console.log(e.detail.userId);
});
```

Used heavily by Web Components and design system libraries.

### Keyboard events
```javascript
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") cancel();
    if (e.key === "ArrowDown") moveDown();

    // Modifier keys
    if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
            e.preventDefault();
            saveDoc();
        }
    }
});
```

Use `e.key` for character/named keys. `e.code` for physical keys (`"KeyA"`, useful for games).

---

## 3. Forms

### Reading values
```javascript
const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);

    // Get individual fields
    data.get("email");
    data.get("password");

    // To object
    const values = Object.fromEntries(data);

    // To JSON for API
    const json = JSON.stringify(values);

    // For file uploads, FormData is sent as multipart/form-data automatically
    fetch("/api/submit", {
        method: "POST",
        body: data,
    });
});
```

### Validation
HTML5 attributes:
```html
<input type="email" required>
<input type="number" min="0" max="100">
<input pattern="\d{3}-\d{4}">
```

JavaScript:
```javascript
form.checkValidity();           // boolean
form.reportValidity();           // boolean + shows native UI
input.setCustomValidity("Must be unique");
input.validity.valueMissing
input.validity.typeMismatch
input.validity.patternMismatch
input.validity.tooLong
```

For complex validation, use Zod/Yup/Valibot client-side and re-validate server-side.

### File uploads
```javascript
<input type="file" id="file" accept="image/*">
const file = document.getElementById("file").files[0];

// Read locally
const text = await file.text();
const buf = await file.arrayBuffer();

// Read as data URL (e.g., for image preview)
const reader = new FileReader();
reader.onload = () => imgEl.src = reader.result;
reader.readAsDataURL(file);

// Upload
const fd = new FormData();
fd.append("upload", file);
await fetch("/upload", { method: "POST", body: fd });
```

---

## 4. fetch — HTTP from the Browser

Replaces the old `XMLHttpRequest`. Standard everywhere now (also in Node 18+, Bun, Deno).

```javascript
// GET
const r = await fetch("/api/users");
if (!r.ok) throw new Error(`HTTP ${r.status}`);
const users = await r.json();

// POST JSON
const r = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Alice" }),
});
```

### Response methods
```javascript
const r = await fetch(url);
r.ok                       // true if 2xx
r.status                    // 200, 404, etc.
r.statusText                 // "OK"
r.headers                     // Headers object
r.headers.get("Content-Type")

await r.json();              // parse JSON
await r.text();              // text body
await r.blob();              // Blob (binary)
await r.arrayBuffer();        // ArrayBuffer
await r.formData();           // FormData
r.body;                       // ReadableStream — for streaming
```

You can only read the body **once**. Clone if needed: `r.clone().json()` then `r.text()`.

### `fetch` does NOT throw on HTTP errors
A 404 or 500 is a *successful* fetch in terms of the Promise — the request completed. You have to check `r.ok` yourself:
```javascript
const r = await fetch(url);
if (!r.ok) throw new Error(`HTTP ${r.status}`);
```

It only throws on network errors (no DNS, no connection, CORS rejection, AbortError).

### Headers
```javascript
const h = new Headers();
h.set("Authorization", "Bearer xyz");
h.append("X-Custom", "1");
h.get("X-Custom");
[...h.entries()]
```

### Authentication
```javascript
fetch(url, {
    headers: { "Authorization": `Bearer ${token}` },
    credentials: "include",    // send cookies even cross-origin (subject to CORS)
});
```

### CORS in one paragraph
Browsers block cross-origin requests by default. The server must include CORS headers (`Access-Control-Allow-Origin`, etc.) to allow them. For simple GETs the browser sends the request and reads the response only if CORS allows. For "non-simple" requests (POST with JSON, custom headers), the browser sends a **preflight** OPTIONS request first. CORS is enforced by the browser, not the server — `curl` or backend code is unaffected.

### Streaming
```javascript
const r = await fetch(largeUrl);
const reader = r.body.getReader();

while (true) {
    const { value, done } = await reader.read();    // value is Uint8Array
    if (done) break;
    processChunk(value);
}

// Or for await
for await (const chunk of r.body) {
    processChunk(chunk);
}
```

Used for downloading huge files, server-sent events alternatives, ChatGPT-style streaming responses.

### Aborting
```javascript
const controller = new AbortController();
fetch(url, { signal: controller.signal });
// later:
controller.abort();
```

Or built-in timeout: `fetch(url, { signal: AbortSignal.timeout(5000) })`.

---

## 5. Storage

### `localStorage` / `sessionStorage`
String-keyed, string-valued storage. Synchronous API.

```javascript
localStorage.setItem("name", "Alice");
localStorage.getItem("name");          // "Alice"
localStorage.removeItem("name");
localStorage.clear();
localStorage.length;
localStorage.key(0);                    // first key

// Store objects (manually serialize)
localStorage.setItem("user", JSON.stringify({ id: 1, name: "Alice" }));
const user = JSON.parse(localStorage.getItem("user") || "null");
```

- **`localStorage`** — persists across sessions, ~5MB limit per origin.
- **`sessionStorage`** — cleared when tab closes, same API.
- **Synchronous** — fine for small data, blocks main thread for large.
- **String-only** — JSON.stringify anything else.
- **Cross-origin isolated** — each origin has its own.

### Cookies
```javascript
document.cookie = "name=value; max-age=3600; path=/; secure; samesite=strict";

// Reading is awkward — one big string of all cookies
document.cookie     // "name1=val1; name2=val2"
```

For real cookie handling, use libraries (`js-cookie`) or do it server-side. HTTP-only cookies (the secure choice for auth tokens) aren't visible to JS — they're set by the server's `Set-Cookie` header.

### IndexedDB
Async, larger (hundreds of MB), structured (with indexes). The native API is verbose:
```javascript
const req = indexedDB.open("mydb", 1);
req.onupgradeneeded = (e) => {
    const db = e.target.result;
    db.createObjectStore("users", { keyPath: "id" });
};
req.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction("users", "readwrite");
    tx.objectStore("users").put({ id: 1, name: "Alice" });
};
```

Use a wrapper library: **`idb-keyval`** (simple), **`idb`** (typed wrapper), **`Dexie`** (full ORM-like).

### Cache API (for Service Workers / offline)
```javascript
const cache = await caches.open("my-cache-v1");
await cache.add("/style.css");
await cache.addAll(["/", "/app.js", "/style.css"]);
const response = await cache.match("/style.css");
await cache.delete("/style.css");
```

Used in PWAs for offline support.

### When to use what
| Need | Use |
|---|---|
| Small user preferences | `localStorage` |
| Session-only state | `sessionStorage` |
| Auth tokens (browser) | HTTP-only cookies (server-set) |
| Large structured data, offline cache | IndexedDB |
| Cached HTTP responses | Cache API + Service Worker |

---

## 6. URL and URLSearchParams

```javascript
const url = new URL("https://example.com/path?q=1&q=2#section");
url.protocol      // "https:"
url.hostname       // "example.com"
url.port            // ""
url.pathname        // "/path"
url.search          // "?q=1&q=2"
url.hash            // "#section"
url.origin          // "https://example.com"

// Build
const url = new URL("/api/users", "https://example.com");
url.searchParams.set("q", "search term");
url.searchParams.append("tag", "javascript");
url.searchParams.append("tag", "node");
url.toString();
// "https://example.com/api/users?q=search+term&tag=javascript&tag=node"

// Parse query
const params = new URLSearchParams(location.search);
params.get("q");
params.getAll("tag");
params.has("page");
[...params.entries()];

// Encode for use elsewhere
encodeURIComponent("a/b?c");      // "a%2Fb%3Fc"
decodeURIComponent("a%2Fb%3Fc");
```

Always use `URL` and `URLSearchParams` instead of string concatenation — handles encoding for free.

---

## 7. Workers

JavaScript is single-threaded, but workers run code in parallel threads.

### Web Worker
```javascript
// main.js
const worker = new Worker("worker.js", { type: "module" });

worker.postMessage({ cmd: "compute", input: [1, 2, 3] });

worker.addEventListener("message", (e) => {
    console.log("got", e.data);
});

worker.terminate();    // kill it
```

```javascript
// worker.js
self.addEventListener("message", (e) => {
    const result = heavyComputation(e.data.input);
    self.postMessage({ result });
});
```

Workers don't share memory with the main thread (well, see SharedArrayBuffer). They communicate via messages.

### Use cases
- Heavy computation that would block UI (data processing, encoding, parsing big JSON).
- Worker libraries: `comlink` (RPC-style worker calls), `workerize-loader` (bundler integration).

### Service Worker
A special worker that intercepts network requests — for PWAs, offline caching, push notifications.
```javascript
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
}
```

### SharedWorker
One worker shared across multiple tabs of the same origin. Useful for, e.g., a shared WebSocket connection.

### Node Worker Threads
Node has its own `node:worker_threads` API (covered in `10_node.md`). The model is similar: separate threads, message-passing.

---

## 8. Observers

The browser exposes observers for DOM mutations, intersection, resizing, performance.

### IntersectionObserver — element visibility
For lazy loading images, infinite scroll, sticky headers.
```javascript
const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);     // one-shot
        }
    }
}, {
    rootMargin: "100px",      // trigger before entering
    threshold: 0.1,            // when 10% visible
});

document.querySelectorAll("img.lazy").forEach(el => observer.observe(el));
```

### MutationObserver — DOM changes
```javascript
const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
        console.log(m.type, m.target);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
});

observer.disconnect();
```

Used by libraries reacting to externally-injected DOM (browser extensions, third-party widgets).

### ResizeObserver — element size changes
```javascript
const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
        console.log(entry.target, entry.contentRect.width, entry.contentRect.height);
    }
});
observer.observe(element);
```

Better than `window.addEventListener("resize", ...)` for tracking individual elements.

### PerformanceObserver — timing entries
```javascript
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        console.log(entry.name, entry.duration);
    }
}).observe({ entryTypes: ["measure", "navigation", "resource"] });
```

For instrumentation and Core Web Vitals.

---

## 9. Animation and Timing

### `requestAnimationFrame`
For smooth animations:
```javascript
function animate(timestamp) {
    el.style.transform = `translateX(${timestamp / 10}px)`;
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

const id = requestAnimationFrame(animate);
cancelAnimationFrame(id);
```

Runs before each browser paint (~60-120fps). Much better than `setInterval` for animation — pauses when tab is hidden, syncs with frame rate.

### Web Animations API
```javascript
el.animate(
    [
        { transform: "translateX(0)" },
        { transform: "translateX(200px)" },
    ],
    { duration: 1000, easing: "ease-in-out", iterations: 2 }
);
```

Returns an `Animation` object you can pause/play/cancel/reverse.

### CSS animations and transitions
Usually better than JS for simple stuff. Cheaper, declarative.

### Idle callbacks
For non-urgent work, schedule during idle time:
```javascript
requestIdleCallback((deadline) => {
    while (deadline.timeRemaining() > 0 && tasks.length) {
        runOne(tasks.shift());
    }
});
```

---

## 10. Other Useful APIs

### Clipboard
```javascript
await navigator.clipboard.writeText("Hello");
const text = await navigator.clipboard.readText();
```

User gesture required for writes; reads require user permission.

### Geolocation
```javascript
navigator.geolocation.getCurrentPosition(
    (pos) => console.log(pos.coords.latitude, pos.coords.longitude),
    (err) => console.error(err),
);

const watchId = navigator.geolocation.watchPosition(callback);
navigator.geolocation.clearWatch(watchId);
```

User permission required.

### Notifications
```javascript
const perm = await Notification.requestPermission();
if (perm === "granted") {
    new Notification("Hi", { body: "You have a message", icon: "/icon.png" });
}
```

### History (SPA routing)
```javascript
history.pushState({ page: 1 }, "", "/new-url");
history.replaceState({ page: 1 }, "", "/new-url");
history.back(); history.forward();

window.addEventListener("popstate", (e) => {
    console.log("navigated to", location.pathname);
});

// Modern alternative — Navigation API (Chrome-only as of 2026)
navigation.navigate("/new-page");
navigation.addEventListener("navigate", (e) => ...);
```

### WebSocket
```javascript
const ws = new WebSocket("wss://example.com/socket");
ws.addEventListener("open", () => ws.send("hello"));
ws.addEventListener("message", (e) => console.log(e.data));
ws.addEventListener("close", () => console.log("closed"));
ws.addEventListener("error", console.error);
ws.send(JSON.stringify({ type: "ping" }));
ws.close();
```

### Server-Sent Events (one-way)
```javascript
const source = new EventSource("/events");
source.addEventListener("message", (e) => console.log(e.data));
source.addEventListener("custom-event", (e) => ...);
source.close();
```

Simpler than WebSocket for server-to-client streaming (e.g., notifications, AI streaming).

### Broadcast Channel — cross-tab messaging
```javascript
const ch = new BroadcastChannel("auth");
ch.postMessage({ type: "logout" });
ch.addEventListener("message", (e) => {
    if (e.data.type === "logout") refreshAuthState();
});
```

### `structuredClone`
```javascript
const copy = structuredClone(obj);
```

Deep-clones almost anything (dates, Maps, Sets, typed arrays) — except functions and class instances. Replaces `JSON.parse(JSON.stringify(obj))`.

### Crypto
```javascript
crypto.randomUUID()                              // "550e8400-e29b-41d4-..."
crypto.getRandomValues(new Uint8Array(16))      // secure random bytes

// Web Crypto for hashing
const buf = new TextEncoder().encode("hello");
const hash = await crypto.subtle.digest("SHA-256", buf);
const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
```

### Intl — locale-aware formatting
```javascript
new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(1234.5);
// "$1,234.50"

new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date());
// "2 June 2026"

new Intl.RelativeTimeFormat("en").format(-1, "day");   // "1 day ago"

new Intl.Collator("en").compare("Apple", "banana");    // language-aware sort
new Intl.ListFormat("en").format(["a", "b", "c"]);     // "a, b, and c"
new Intl.PluralRules("en").select(2);                   // "other" (for "2 items")
```

Use `Intl` instead of manual locale handling. Built into every modern browser.

### Drag and Drop
```javascript
el.draggable = true;
el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", "payload");
});

dropZone.addEventListener("dragover", (e) => e.preventDefault());
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
});
```

### File System Access API (Chromium)
```javascript
const [handle] = await window.showOpenFilePicker();
const file = await handle.getFile();
const writable = await handle.createWritable();
await writable.write("new content");
await writable.close();
```

Lets you open and save real local files. Limited browser support (Chromium); falls back to `<input type="file">` and download links elsewhere.

### Page Visibility API
```javascript
document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseExpensive();
    else resumeExpensive();
});
```

Pause animations / polling when the tab is in the background.

---

The web platform is enormous. MDN (developer.mozilla.org) is the canonical reference for everything here — when in doubt, search "MDN <API name>".

Next: the server-side equivalent — `10_node.md`.
