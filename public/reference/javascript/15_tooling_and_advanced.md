# 15. Tooling & Advanced Topics

> Build tools, bundlers, performance, security, deployment, WASM, Web Workers in depth, and the long list of pitfalls.

---

## Table of Contents

1. [Build Tools and Bundlers](#1-build-tools-and-bundlers)
2. [Vite — the New Default](#2-vite--the-new-default)
3. [Other Bundlers](#3-other-bundlers)
4. [Profiling and Performance](#4-profiling-and-performance)
5. [WebAssembly](#5-webassembly)
6. [Security](#6-security)
7. [Deployment Recipes](#7-deployment-recipes)
8. [Best Practices](#8-best-practices)
9. [Common Pitfalls Reference](#9-common-pitfalls-reference)

---

## 1. Build Tools and Bundlers

What they do:
- **Resolve** imports (figure out which file is which).
- **Transform** code (TS → JS, JSX → JS, modern → old syntax, CSS imports → JS modules).
- **Bundle** files into fewer/optimized files for production.
- **Code-split** dynamic imports into separate chunks.
- **Minify** for smaller output.
- **Tree-shake** dead code.

You usually pick a framework's default and don't think much about it: Next.js uses Turbopack/webpack; Vite uses Rollup under the hood; SvelteKit uses Vite; Astro uses Vite. The bundler-aware part of the workflow is rarely larger than `npm run build`.

---

## 2. Vite — the New Default

Created by Evan You (Vue), now used by SvelteKit, Astro, Solid, Qwik, and many React setups.

### Speed
- Dev mode serves files unbundled — uses native ESM in the browser. Updates are instant.
- Production uses Rollup to bundle.

### Setup
```bash
npm create vite@latest my-app
```

Choose template (React, Vue, Svelte, Solid, vanilla TS, etc.).

```javascript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            "/api": "http://localhost:8000",
        },
    },
    build: {
        target: "es2022",
        sourcemap: true,
    },
});
```

```bash
npm run dev          # dev server
npm run build         # production build
npm run preview       # serve the build locally
```

### Path aliases
```javascript
// vite.config.ts
import path from "node:path";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
```

(Also add to `tsconfig.json` `paths` for type-checking.)

### Plugin ecosystem
Vite has plugins for almost everything: PWA, image optimization, SSR, MDX, GraphQL, Sentry, you name it. Search `vite-plugin-*` on npm.

---

## 3. Other Bundlers

### webpack
The classic. Used by Next.js (partially), Create React App (deprecated), older codebases. Slower, much more configuration.

You'll only touch raw webpack if you maintain a webpack-based project. New projects: skip.

### Turbopack
Vercel's Rust-based webpack successor, used by Next.js. Faster dev startup; replacing webpack inside Next progressively.

### esbuild
Extremely fast (Go-based) bundler. Used internally by Vite, tsup, and many tools. Lacks some advanced bundling features compared to Rollup/webpack — but for libraries and small apps, it's excellent.

```bash
npx esbuild src/index.ts --bundle --outfile=dist/index.js --platform=node --target=es2022
```

### Rollup
Library-focused bundler. Excellent tree-shaking. Used by Vite for production builds. The right choice if you're publishing an npm package.

### Parcel
Zero-config bundler. Great DX for small projects. Less mainstream than Vite in 2026.

### tsup (and unbuild)
Wrappers around esbuild for building TS libraries. Outputs ESM + CJS + types in one command:
```bash
npx tsup src/index.ts --format esm,cjs --dts
```

### Recommendations
- **App**: Vite (or framework default).
- **Library**: tsup (esbuild-based) or unbuild.
- **Node-only script**: esbuild.
- **Large existing webpack project**: keep webpack until migration is worth it.

---

## 4. Profiling and Performance

### Browser DevTools — Performance tab
- Record a session, look at the flame graph.
- Identify long tasks (>50ms) that block the main thread.
- Check rendering / scripting / painting time.

### Lighthouse / PageSpeed Insights
Run in Chrome DevTools or as CLI. Surfaces Core Web Vitals, accessibility, SEO, best practices.

Core Web Vitals to know:
- **LCP** (Largest Contentful Paint) — main content loaded; aim < 2.5s.
- **INP** (Interaction to Next Paint) — input responsiveness; aim < 200ms. (Replaces FID in 2024.)
- **CLS** (Cumulative Layout Shift) — visual stability; aim < 0.1.

### Bundle analyzer
See what's in your production bundle.
```bash
npm install -D rollup-plugin-visualizer    # for Vite/Rollup
# or
npm install -D webpack-bundle-analyzer
```

Common findings:
- Lodash imported as a whole (`import _ from "lodash"`) — use `lodash-es` and named imports.
- Moment.js (huge) — replace with `date-fns`, `dayjs`, or `temporal` polyfill.
- Multiple versions of the same lib (check `npm ls`).
- Polyfills you don't need for your target audience.

### Node profiling
- `node --inspect script.js` — Chrome DevTools attaches; profile CPU + memory.
- **`clinic`** (`npm i -g clinic`) — `clinic doctor`, `clinic flame`, `clinic bubbleprof` — Node-specific profilers.
- **`0x`** — flame graphs of Node code.
- **OpenTelemetry / Datadog APM / New Relic** — production tracing.

### Common JS performance fixes
- **Don't block the main thread** — chunk heavy work, use Web Workers, use `requestIdleCallback`.
- **Lazy-load** — code-split routes, components, heavy libs.
- **Memoize** — `useMemo`, `useCallback`, lodash `memoize` — but only where it measurably helps.
- **Virtualize long lists** — `@tanstack/virtual` instead of rendering 10k DOM nodes.
- **Defer non-critical scripts** — `<script async defer>`.
- **Avoid layout thrashing** — read all DOM properties first, then write all (don't interleave).
- **Use `transform` and `opacity`** for animations — GPU-accelerated, doesn't trigger layout.
- **Cache** — HTTP caching, service worker caching, in-memory caching.

---

## 5. WebAssembly

WASM lets you run code from C/C++/Rust/Go/AssemblyScript in the browser (or Node) at near-native speed.

### When to consider WASM
- Heavy numeric computation (image processing, audio/video codecs, scientific).
- Bringing existing C/C++/Rust libraries to JS.
- Cryptography, compression, parsing.

### Calling WASM from JS
```javascript
const response = await fetch("module.wasm");
const buffer = await response.arrayBuffer();
const { instance } = await WebAssembly.instantiate(buffer);
const result = instance.exports.add(2, 3);
```

Most users go through tooling:
- **Rust**: `wasm-pack` → generates JS wrapper.
- **AssemblyScript**: TS-like syntax compiled to WASM.
- **Emscripten**: C/C++ → WASM.

### Real-world WASM in 2026
- Figma's editor.
- Photoshop on the web (via Emscripten).
- Squoosh (image compression).
- Many CLI tools shipping WASM cores (`@rollup/wasm-node`, etc.).
- AI inference in the browser (ONNX, TF.js partly).

For a typical app: probably not needed. But it's there when JS isn't fast enough.

---

## 6. Security

### XSS — Cross-Site Scripting
User-controlled data ending up in the DOM as code:
```javascript
el.innerHTML = userInput;     // BAD if userInput contains scripts
```

Fixes:
- Prefer `textContent` over `innerHTML`.
- Use a framework — React/Vue/Svelte escape by default.
- For HTML-allowing fields (rich text), sanitize with **`DOMPurify`**:
```javascript
import DOMPurify from "dompurify";
el.innerHTML = DOMPurify.sanitize(userInput);
```

### CSRF — Cross-Site Request Forgery
Another site triggers a request to yours using the user's cookies. Defenses:
- **SameSite=Strict** or **SameSite=Lax** on cookies (default in modern browsers).
- **CSRF tokens** for stateful endpoints.
- For pure JSON APIs with bearer tokens: not vulnerable to traditional CSRF.

### CSP — Content Security Policy
Set HTTP headers to restrict what your page can load:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; img-src 'self' data:;
```

Blocks inline scripts, untrusted CDNs, etc. Critical for limiting XSS damage.

### SQL injection
Always use parameterized queries (see `13_databases.md`). Never concatenate user input.

### Authentication mistakes
- **Don't roll your own.** Use Auth.js, Clerk, Auth0, Supabase Auth.
- Use HTTP-only cookies for tokens in browsers (JS can't read them — XSS-resistant).
- Hash passwords with bcrypt/argon2.
- Rate-limit login endpoints.
- Use HTTPS only.
- Validate redirects (don't trust `?redirect=` blindly).

### Secrets in code
- `process.env` for runtime config.
- Never `git add` `.env` files.
- Use secret managers in production.
- Rotate keys periodically.
- Treat keys leaked in logs as compromised.

### Dependencies
- `npm audit` periodically; better: Dependabot/Renovate auto-PRs.
- Watch for typosquatted packages.
- Pin lockfiles, review major bumps.
- For sensitive code, use **`npm install --ignore-scripts`** to avoid postinstall RCE — there have been real attacks via malicious postinstall.

### Browser-side secrets
**There are no browser-side secrets.** Anything in your client JS is public. Don't include API keys for paid services in client code unless they're scoped to the current user.

### TLS
Always serve over HTTPS in production. Use **HSTS** (`Strict-Transport-Security`) header. Modern hosts (Vercel, Cloudflare, Netlify) give free TLS via Let's Encrypt.

### Cookies
- `Secure` — only over HTTPS.
- `HttpOnly` — not readable by JS.
- `SameSite=Lax` (default) or `Strict` — CSRF protection.
- Don't store auth tokens in `localStorage` — XSS-readable.

---

## 7. Deployment Recipes

### Frontend (SPA or static site)
- **Build**: `npm run build` → `dist/` or `build/`.
- **Host**: any static host (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, GitHub Pages).
- **Routing**: configure SPA fallback (all routes → `index.html`).

### Full-stack Next.js
- **Vercel** — zero config.
- **Self-hosted Node** — `next build` then `next start` behind a reverse proxy.
- **Docker** — multi-stage build, `next start` on `0.0.0.0:3000`.
- **Cloudflare / Vercel Edge** — works with `runtime: 'edge'` opt-in for specific routes.

### Containerized Node API
Already covered in `12_backend.md`. Key bits:
- Multi-stage Docker.
- Non-root user.
- Health check endpoint.
- Graceful shutdown handler.

### Serverless
- **Vercel Functions** — Node + Edge variants.
- **AWS Lambda** — use `@vercel/node` or Lambda's Node runtime; bundle with esbuild for fast cold starts.
- **Cloudflare Workers** — V8 isolates; very cheap; runtime constraints (no Node APIs).
- **Deno Deploy** — Deno-native.

Lambda specifically:
```typescript
import { handle } from "hono/aws-lambda";
import { Hono } from "hono";

const app = new Hono();
app.get("/", (c) => c.text("hi from lambda"));

export const handler = handle(app);
```

### Static + dynamic (the hybrid)
Most modern apps:
- Static / cached at the edge for landing pages, blog posts.
- Dynamic per-request for personalized pages, dashboards.
- Streamed from server for "loading skeleton" UIs.

Frameworks (Next.js, Astro, Remix) handle this via configuration; you don't pick separately.

### Monitoring
- **Sentry** — errors. Add on day one.
- **OpenTelemetry** — traces.
- **Datadog / Grafana / NewRelic** — full observability.
- **LogRocket / FullStory** — session replay (for debugging UX).
- **Plausible / PostHog / Mixpanel** — analytics.

### Edge runtime limitations
When running on Cloudflare Workers / Vercel Edge / Deno Deploy:
- No `fs` / file system.
- No Node-specific APIs (`Buffer`, `process` partial, `node:*` mostly absent).
- Smaller bundle size limits.
- Code must be platform-agnostic (use web standards: `fetch`, Web Streams, Web Crypto).

Frameworks like Hono are built for this; Next.js routes need `runtime: "edge"` opt-in.

---

## 8. Best Practices

A grab-bag that pays off:

- **Use TypeScript.** Always, in 2026. The cost is initial setup; the payoff is months of saved debugging.
- **Strict TS.** All the strict-mode flags.
- **Use ESM.** No new CommonJS.
- **Pin Node version** in `.nvmrc` and `package.json` `engines`. Commit your lockfile.
- **Use `node:` prefix** for built-ins.
- **Prefer `const` over `let` over `var`.** Don't write `var`.
- **Prefer `===` over `==`.**
- **Avoid `any`.** When unavoidable, mark it with a comment explaining why.
- **Avoid `as` casts.** Type assertions hide bugs.
- **Validate at boundaries.** External input (HTTP, DB rows, files, env vars) → Zod/Valibot.
- **Wrap external IO in try/catch.** Don't swallow — log and re-throw or return a typed result.
- **Default to async/await.** Use raw Promises only when chains are clearer.
- **`Promise.all` independent work.** Don't await in sequence what could run in parallel.
- **Use `AbortController` for cancellation.** Especially in long-lived UIs.
- **Modular code.** Functions should fit on a screen.
- **Pure functions in the core; side effects at the edges.**
- **Embrace immutability.** Spread, structuredClone, Immer.
- **Use the standard library / web platform.** Don't ship lodash for something Array methods solve.
- **Don't reach for a state library on day one.** `useState` + Context is enough until it isn't.
- **Pick boring tech.** Most apps don't need GraphQL, microservices, Kubernetes, or AI orchestration libraries. Postgres + Node + a framework is fine.
- **Write the simplest thing that works.** Then refactor when the requirements actually demand it.
- **Measure before optimizing.** The bottleneck is never where you think.
- **Build incrementally.** Ship small. Get feedback. Iterate.
- **Add Sentry on day one.**
- **Hook up CI on day one.**
- **Set up Prettier + ESLint + Husky on day one.** The setup cost is once; the savings compound.
- **Document the why, not the what.** Code shows what; comments explain reasoning.
- **Don't fight the framework.** Idiomatic Next-style code in Next; idiomatic Vue code in Nuxt. Mixing patterns adds confusion without payoff.

---

## 9. Common Pitfalls Reference

A curated list of bugs that bite even experienced JS devs.

### `this` issues
```javascript
class C {
    constructor() { this.x = 1; }
    log() { console.log(this.x); }
}
const c = new C();
setTimeout(c.log, 100);            // undefined — `this` is lost
setTimeout(() => c.log(), 100);     // OK — arrow keeps caller's `this`
setTimeout(c.log.bind(c), 100);     // OK — explicitly bound
```

### Mutable default parameters
Not as severe as Python (each call gets a fresh binding), but watch out for:
```javascript
function add(x, list = []) {           // fresh array each call — OK
    list.push(x);
    return list;
}
```

vs.
```javascript
const defaultList = [];
function add(x, list = defaultList) {  // BAD — sharing the same array
    list.push(x);
    return list;
}
```

### Closure over loop var (only with `var`)
```javascript
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0);   // prints 3, 3, 3
}
// Use `let` → 0, 1, 2
```

### `==` coercion
Almost never use `==`. Special exceptions: `x == null` (matches null and undefined).

### `typeof null === "object"`
A historical bug. Use `x === null` to check for null.

### `NaN !== NaN`
```javascript
NaN === NaN              // false
Number.isNaN(x);          // check this way
```

### Array `sort` is lexicographic by default
```javascript
[10, 1, 2].sort()                  // [1, 10, 2]
[10, 1, 2].sort((a, b) => a - b)    // [1, 2, 10]
```

### `forEach` doesn't await
```javascript
[1, 2, 3].forEach(async (x) => { await op(x); });
// returns immediately — doesn't wait
```

### `JSON.stringify` skips undefined and functions
```javascript
JSON.stringify({ a: undefined, b: () => {}, c: 1 })   // '{"c":1}'
```

### Floating-point precision
```javascript
0.1 + 0.2 === 0.3    // false
```

For money: store cents as integers. For comparison: `Math.abs(a - b) < Number.EPSILON`.

### Mutating then comparing arrays
```javascript
const a = [1, 2, 3];
const b = a;
a.push(4);
b.length      // 4 — same reference
```

### Spread is shallow
```javascript
const original = { a: { b: 1 } };
const copy = { ...original };
copy.a.b = 99;
original.a.b   // 99 — shared inner object
```

Use `structuredClone(obj)` for deep clone (functions / classes won't survive).

### `Object.keys(obj)` skips non-string keys
Symbol keys aren't included. Use `Reflect.ownKeys` for everything.

### Empty arrays and objects are truthy
```javascript
if ([]) { ... }     // runs
if ({}) { ... }     // runs
```

Check `arr.length === 0` or `Object.keys(obj).length === 0`.

### `Number("")` is 0
```javascript
Number("")        // 0
Number(" ")       // 0
Number("3.14")    // 3.14
Number("3.14abc") // NaN
parseFloat("3.14abc")   // 3.14
```

### `setTimeout` with non-integer
The minimum delay is 4ms in browsers (after 4 nested timeouts). `setTimeout(fn, 0)` is not really 0.

### `setInterval` with slow callbacks
If the callback takes longer than the interval, callbacks queue up. Use `setTimeout` recursively for safer scheduling.

### `Date` is mutable and tricky
- Always store UTC timestamps. Convert to local at display time.
- For date math, use **Temporal** API (landing) or **date-fns** / **dayjs** / **Luxon**.
- `new Date("2024-01-01")` parses as UTC midnight; `new Date("2024-01-01T00:00")` as local. Watch for off-by-one-day bugs.

### `for...in` on arrays
Iterates **keys** (as strings) plus inherited properties. Almost never what you want for arrays. Use `for...of`.

### `Array(n)` creates a sparse array
```javascript
Array(3).map(x => 0)        // [empty × 3] — map skips empty slots!
new Array(3).fill(0)         // [0, 0, 0]
Array.from({ length: 3 }, () => 0)   // [0, 0, 0]
```

### `delete` on arrays leaves holes
```javascript
const a = [1, 2, 3];
delete a[1];
a;                  // [1, <empty>, 3]
a.length;           // still 3
```

Use `splice(1, 1)` or `filter` instead.

### Reassigning `let` in a closure
```javascript
function counter() {
    let n = 0;
    return {
        inc: () => n++,
        get: () => n,
    };
}
```
This works because closures capture references, not values. Fine — just be aware.

### Async function in array methods
```javascript
const results = arr.map(async x => fetch(x));   // array of Promises
const data = await Promise.all(results);          // resolve them
```

### Iterating Maps requires destructuring
```javascript
for (const [k, v] of myMap) { ... }      // OK
for (const k of myMap) { ... }            // k is [key, value]!
```

### Spread of strings / iterables
```javascript
[..."hi"]              // ["h", "i"]
{ ..."hi" }             // { 0: "h", 1: "i" } — index keys
```

### `await` inside loops sequentializes
```javascript
for (const id of ids) {
    await fetch(id);    // one at a time
}

// Parallel:
await Promise.all(ids.map(id => fetch(id)));
```

### `JSON.parse` failure throws SyntaxError
```javascript
try { return JSON.parse(s); } catch { return null; }
```

### Top-level await delays module loading
```javascript
// foo.js
await heavyInit();        // every importer of foo waits
export const x = 1;
```

Be intentional about where you put top-level awaits.

### `import` is hoisted; mocks must come before
```javascript
vi.mock("./api", ...);
import { f } from "./consumer";    // ESM hoists this above vi.mock at runtime
```

Vitest handles this; in Jest the order matters more.

### CORS preflight surprises
A POST with `Content-Type: application/json` triggers a preflight OPTIONS request. The server must answer that too. If you're using a CORS middleware, it usually handles this.

### `fetch` doesn't throw on HTTP errors
```javascript
const r = await fetch(url);
if (!r.ok) throw new Error(`HTTP ${r.status}`);
```

### `fetch` without timeout hangs forever
```javascript
fetch(url, { signal: AbortSignal.timeout(5000) });
```

### Memory leaks via event listeners
```javascript
// In React useEffect
useEffect(() => {
    const handler = () => ...;
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);  // cleanup!
}, []);
```

Always remove listeners in cleanup.

### Memory leaks via closures
```javascript
function trap(huge) {
    return () => huge.length;     // entire `huge` retained while the returned fn lives
}
```

If the returned function lives long, the closed-over data lives too.

### React: stale closures
```javascript
useEffect(() => {
    const id = setInterval(() => {
        console.log(count);    // captures `count` at mount time, never updates
    }, 1000);
    return () => clearInterval(id);
}, []);                          // empty deps — count is stale forever
```

Fix: add `count` to deps, or use a ref, or use the functional update form of setState.

### React: mutating state
```javascript
state.items.push(x);          // BAD — React doesn't see a change
setState(s => ({ ...s, items: [...s.items, x] }));    // GOOD
```

### React: missing keys in lists
```jsx
{items.map(item => <div>{item.name}</div>)}             // warning
{items.map(item => <div key={item.id}>{item.name}</div>)}  // OK
```

`key` should be stable and unique.

### React: setting state in render
```jsx
function Foo() {
    setX(1);          // infinite loop — render triggers state, state triggers render
    return <div />;
}
```

Use `useEffect` or event handlers to update state.

### Node: forgetting `await`
```javascript
async function f() { ... }
f();      // fires and forgets — errors silently swallowed
```

In strict TS configs with `@typescript-eslint/no-floating-promises`, this is caught.

### Node: missing process error handlers
```javascript
process.on("uncaughtException", err => { ... });
process.on("unhandledRejection", reason => { ... });
```

Without these, an unhandled error can crash the process — or worse, leave it in a half-broken state.

### Node: synchronous fs in a server's hot path
```javascript
fs.readFileSync(path);    // blocks the event loop
```

Use `fs/promises` in async code.

### Node: not setting timeouts on external calls
External HTTP / DB calls without timeouts can hang the entire request. Always set timeouts.

### CommonJS / ESM interop weirdness
- `require("esm-only")` → throws.
- `import { x } from "cjs-pkg"` → sometimes named exports don't work.
- Solutions: dynamic `import()`, or convert your code to ESM.

### Bundler ignoring tree-shaking
- Module is CommonJS → can't shake.
- Side effects not declared (`"sideEffects": false` in package.json).
- `import * as X` keeps everything.

### Locale-sensitive sort
```javascript
["é", "f", "e"].sort();    // not what humans expect
["é", "f", "e"].sort((a, b) => new Intl.Collator().compare(a, b));
// or
[...].sort((a, b) => a.localeCompare(b));
```

### `Date.now() / 1000` for timestamps loses precision
For unix timestamps in seconds: `Math.floor(Date.now() / 1000)`.

### String index out of range
```javascript
"abc"[10]    // undefined, no error
```

Check bounds.

### Catch syntax in older code
```javascript
try { ... } catch(e) {}      // older — requires error binding
try { ... } catch {}          // ES2019+
```

### `for...of` on objects throws
```javascript
for (const x of {a: 1}) ...   // TypeError — objects aren't iterable
for (const [k, v] of Object.entries({a: 1})) ...   // OK
```

### Wrong `keyof` in TS
```typescript
type T = keyof Record<string, number>;   // "string | number" — not what you might expect
```

### `Object.fromEntries` mistypes in TS
The result is typed as `{ [k: string]: V }`. Use cast or `satisfies` for stricter typing.

### TypeScript: `any` propagates silently
Once you have `any`, downstream operations are unchecked. Use `unknown` instead and narrow.

### TypeScript: `as` casts are unsafe
`x as T` doesn't verify; it tells the compiler to trust you. Use type guards / Zod for real validation.

### Production logs leaking PII
- Sentry / Datadog / log aggregators can capture sensitive fields by default.
- Use redaction (pino redaction, Sentry beforeSend) for emails, tokens, request headers.

### CI passing locally but failing in CI
- Different Node version.
- Different OS (Linux vs Mac).
- Missing env vars in CI.
- Case-insensitive filesystems (Mac/Windows) vs case-sensitive (Linux): `import "./Foo"` vs file `foo.tsx`.

### Lockfile drift
- Someone updated dependencies but didn't commit the lockfile.
- Run `npm install` after a pull always.
- CI should use `npm ci` (or `pnpm install --frozen-lockfile`).

### Forgetting `--frozen-lockfile` / `npm ci` in CI
Lets CI silently update packages outside the lockfile. Always use the strict install command.

### Forgetting to invalidate caches
- Service Worker cache.
- CDN cache.
- HTTP cache headers (browsers cache aggressively).

Use cache-busting filenames (`app.abc123.js`) for static assets — handled by bundlers.

### Cold starts in serverless
- Bundle size matters → bigger bundle → slower cold start.
- Heavy imports at module top → bundled into cold start.
- Lazy-load heavy deps inside handlers when possible.

### Connection pool exhaustion in serverless
Already covered in `13_databases.md`. Use a pooler (PgBouncer, Neon).

### Process restarts losing in-memory state
- Caches.
- WebSocket connections.
- Pending background tasks.

Don't rely on in-memory state for anything that matters. Use Redis or external services.

### Time zones in dates
- Server in UTC, client in local. Convert at display only.
- Don't store local times in DB without timezone info.
- Daylight saving time skips/repeats hours. Always test around DST transitions.

---

That's JavaScript. Fifteen files, the language as it actually exists in 2026 — modern, async-native, type-aware, multi-runtime.

Key principles distilled:
1. Use TypeScript.
2. Use ESM.
3. Use async/await.
4. Use a framework (Next.js, Astro, SvelteKit, Hono).
5. Use Vite (or framework default).
6. Validate inputs at boundaries (Zod).
7. Tests + types + lint together.
8. Sentry from day one.
9. Don't fight the platform — use Web APIs where possible.
10. Boring tech wins.

Next folder: TypeScript itself — leaner, focused on what TS adds on top of JS.
