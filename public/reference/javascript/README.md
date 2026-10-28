# JavaScript — Reference Library

A multi-file deep reference for JavaScript — the language, the runtimes (browser, Node, Deno, Bun), the modern web platform, the Node ecosystem, and where TypeScript fits.

> For TypeScript-specific topics (the type system, generics, advanced types, tsconfig, build tools), see the `typescript/` folder. This folder is the JavaScript foundation those topics sit on.

---

## How to navigate this folder

| # | File | What's in it |
|---|---|---|
| — | `README.md` | This file. Mental model, runtimes, versions, when to use JS. |
| 01 | `01_setup.md` | Installing Node/Bun/Deno, package managers (npm, pnpm, yarn, bun), version managers, editors. |
| 02 | `02_language_basics.md` | Syntax, primitive types, operators, control flow, functions, scoping. |
| 03 | `03_data_structures.md` | Arrays, objects, Maps, Sets, strings, iteration, common patterns. |
| 04 | `04_oop.md` | Classes, prototypes, `this`, inheritance, private fields. |
| 05 | `05_functional.md` | First-class functions, closures, higher-order functions, currying, immutability. |
| 06 | `06_async.md` | Callbacks → Promises → async/await, event loop, microtasks, AbortController. |
| 07 | `07_modules.md` | ES Modules, CommonJS, dynamic imports, npm, package.json, monorepos. |
| 08 | `08_errors.md` | `Error` types, try/catch, async errors, custom errors, error handling patterns. |
| 09 | `09_browser_apis.md` | DOM, fetch, storage, workers, observers, modern Web APIs. |
| 10 | `10_node.md` | Node-specific APIs — fs, path, http, streams, child_process, EventEmitter. |
| 11 | `11_web_frameworks.md` | React, Next.js, Vue, Svelte, Astro on the frontend. |
| 12 | `12_backend.md` | Express, Fastify, Hono, Next.js API routes, NestJS for server work. |
| 13 | `13_databases.md` | Prisma, Drizzle, raw drivers, Redis, MongoDB clients. |
| 14 | `14_testing_and_quality.md` | Vitest, Jest, Playwright, ESLint, Prettier. |
| 15 | `15_tooling_and_advanced.md` | Build tools, bundlers, performance, deployment, pitfalls. |

---

## What JavaScript is (mental model)

JavaScript is a **high-level**, **interpreted (JIT-compiled)**, **dynamically-typed**, **garbage-collected**, **single-threaded** language with **first-class functions** and a **prototype-based** object model.

Key facts that shape everything else:

- **It was designed in 10 days in 1995** to add interactivity to web pages. The legacy of that haste shows up in coercion rules, `this` behavior, and some standard-library oddities. The language has been evolving annually since 2015 (ES6/ES2015) to paper over those rough edges.
- **The browser is its native runtime.** Every browser ships a JS engine (V8 in Chrome, SpiderMonkey in Firefox, JavaScriptCore in Safari). For server-side work, Node, Bun, and Deno embed these engines.
- **It's the only language the web understands.** You can compile to it (TypeScript → JS, Rust/Go → WASM, etc.), but the runtime that browsers expose is JS.
- **It's the most-used programming language in the world by most surveys** (Stack Overflow, GitHub, JetBrains). Whether that's a feature or a tax depends on your taste.

### What JavaScript is great at

- **Anything in a browser** — UI, interactivity, animation, real-time apps.
- **Full-stack web** — Node lets you share code between client and server.
- **Tooling and CLIs** — fast to write, easy to distribute via npm.
- **Glue code** — wiring services, APIs, automation.
- **Real-time servers** — Node's async model handles thousands of connections cheaply.

### What JavaScript isn't great at

- **CPU-bound numeric code** — much slower than C/Rust/even Java. Push to native (WASM, native modules) when it matters.
- **Truly large engineering projects without help** — dynamic typing scales poorly. That's why TypeScript exists.
- **Operations needing precise arithmetic** — `0.1 + 0.2 !== 0.3`. Use `BigInt` for integers, dedicated libraries for decimals.
- **Anything that needs predictable memory layout** — JS doesn't expose memory directly. Use WASM if that matters.

---

## Runtimes in 2026

Server-side JS is no longer just Node. Four runtimes worth knowing:

| Runtime | What it is | Pick when |
|---|---|---|
| **Node.js** | The original, V8-based. CommonJS heritage, ES modules added later. | Default for production servers. Largest ecosystem. |
| **Bun** | New runtime built on JavaScriptCore. Includes a bundler, package manager, test runner. | Speed, all-in-one DX. Production use has matured by 2026. |
| **Deno** | Secure-by-default runtime by Node's creator. TypeScript out of the box, web-standard APIs. | New projects without npm legacy. Cleaner standard library. |
| **Cloudflare Workers / Vercel Edge / Deno Deploy** | "Edge" runtimes — V8 isolates, no Node APIs. | Latency-sensitive APIs, large geographic reach. |

For most production work in 2026: **Node** if you want the safest, largest ecosystem; **Bun** if you want speed and a unified DX; **Deno** if you want security and standards alignment. Edge runtimes for specific workloads (auth, redirects, light APIs).

---

## Versions and the ECMAScript Standard

The language spec is **ECMAScript**. New versions release roughly yearly (`ES2024`, `ES2025`, etc.). Browsers and runtimes implement features at their own pace; you'll see "Stage 3" / "Stage 4" proposals in dev tools.

What this means in practice:
- **In modern environments (Node 20+, all 2024+ browsers)**, you can use most of ES2024 directly.
- For older targets, **transpile with `tsc` / `swc` / `esbuild` / `babel`**. Bundlers handle this automatically.
- Check **compatibility tables** (caniuse.com, MDN) for any feature you're not sure about.

### Notable features by year (selective)
| Year | Highlights |
|---|---|
| ES6/2015 | `let`/`const`, arrow functions, classes, modules, Promises, destructuring, spread/rest, template literals |
| ES2017 | `async`/`await`, `Object.entries`, `Object.values`, string padding |
| ES2019 | `Array.flat`/`flatMap`, optional `catch` binding, `Object.fromEntries` |
| ES2020 | Optional chaining `?.`, nullish coalescing `??`, `BigInt`, dynamic `import()`, `globalThis` |
| ES2021 | `String.replaceAll`, logical assignment (`??=`, `&&=`, `||=`), numeric separators |
| ES2022 | Class fields (`#private`), top-level `await`, `at()`, `Object.hasOwn` |
| ES2023 | `Array.findLast`, `toSorted`/`toReversed`/`toSpliced` (non-mutating array methods) |
| ES2024 | `Promise.withResolvers`, `Object.groupBy`, `Array.fromAsync` |
| ES2025 | Iterator helpers (`.map`, `.filter`, `.take` on iterators), more |

---

## Where JS sits in a modern stack

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                 │
│  ├─ HTML (structure)                                     │
│  ├─ CSS (presentation)                                   │
│  └─ JavaScript / TypeScript (behavior)                   │
│     └─ React / Vue / Svelte / Astro / vanilla            │
└──────────────────────────────────────────────────────────┘
                          ↑ HTTP / WebSocket
┌──────────────────────────────────────────────────────────┐
│  Server (Node / Bun / Deno)                              │
│  ├─ Web framework (Express / Fastify / Hono / Next.js)   │
│  ├─ ORM (Prisma / Drizzle / Kysely)                      │
│  └─ Background jobs (BullMQ / Inngest / Trigger.dev)     │
└──────────────────────────────────────────────────────────┘
                          ↓
                 PostgreSQL / Redis / S3 / etc.
```

JavaScript is unique in spanning client and server cleanly — same language, often shared code (validation schemas, types, utilities).

---

## TypeScript: when to switch

You probably should, for any project larger than a script. TypeScript is JavaScript + types, with the same runtime semantics. Benefits:
- Auto-complete that actually knows your data shapes.
- Refactor with confidence (rename across files, detect callers).
- Catch typos and shape mismatches at edit-time.
- API contracts that survive a year of changes.

In 2026, **most production JS code is actually TypeScript**. Many libraries ship with type declarations bundled. Frameworks like Next, Astro, NestJS, and Nuxt assume TS by default.

Read this folder for the language, then read `typescript/` for the type system. Most of `02_language_basics.md` through `08_errors.md` here applies identically to TS — same runtime, same APIs, just with type annotations layered on.

---

## How to use this reference

- **Brand new to JS?** Read `01_setup.md` → `02_language_basics.md` → `03_data_structures.md` → `06_async.md` in order. Async is the part beginners struggle with most.
- **Coming from Python or another language?** Skim `02-05`, then dig into `06_async.md` (it's different) and `04_oop.md` (prototypes are different).
- **Building a frontend?** `09_browser_apis.md` + `11_web_frameworks.md`.
- **Building a backend?** `10_node.md` + `12_backend.md` + `13_databases.md`.
- **Trying to make legacy code make sense?** `04_oop.md` for `this`/prototypes, `15_tooling_and_advanced.md` for the pitfalls section.

This reference targets **JavaScript as it actually exists in 2026** — modern syntax, ES modules, async/await, modern bundlers, modern runtimes. I won't show you `var`, callback hell, or pre-ES6 patterns unless you'll encounter them in legacy code.
