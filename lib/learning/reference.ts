export type ReferenceNote = { language: string; slug: string; title: string; url: string; keywords: string };
export const referenceLanguages = [{"id": "javascript", "label": "JavaScript"}, {"id": "typescript", "label": "TypeScript"}, {"id": "sql", "label": "SQL"}, {"id": "python", "label": "Python"}, {"id": "java", "label": "Java"}, {"id": "cpp", "label": "C++"}, {"id": "csharp", "label": "C#"}];
export const referenceNotes: ReferenceNote[] = [
  {
    "language": "javascript",
    "slug": "README",
    "title": "JavaScript — Reference Library",
    "url": "/reference/javascript/README.md",
    "keywords": "How to navigate this folder What JavaScript is (mental model) What JavaScript is great at What JavaScript isn't great at Runtimes in 2026 Versions and the ECMAScript Standard Notable features by year (selective) Where JS sits in a modern stack TypeScript: when to switch How to use this reference"
  },
  {
    "language": "javascript",
    "slug": "01_setup",
    "title": "Setup & Tooling",
    "url": "/reference/javascript/01_setup.md",
    "keywords": "Table of Contents 1. Choosing a Runtime 2. Installing Node.js macOS Linux Windows Verify LTS vs Current 3. Installing Bun 4. Installing Deno 5. Version Managers nvm (Linux / macOS) fnm — fast nvm alternative (Rust) Volta — multi-tool version manager asdf — generic multi-language version manager Recommendation 6. Package Managers npm pnpm — fast, disk-efficient yarn — older alternative bun Recommendation Lockfiles 7. package.json — the Project Manifest Key fields Version ranges Useful scripts 8. Editors and IDEs VS Code WebStorm / IntelliJ Zed, Cursor, Windsurf vim/neovim 9. REPL and Running Scripts Node REPL Bun and Deno REPL Running a script One-liner tsx — run TypeScript directly with Node 10. Project Layout `.gitignore` essentials Monorepo (multiple packages) 11. Common Setup Problems \"command not found: node\" \"EACCES: permission denied\" on `npm install -g` \"Cannot find module 'X'\" Lockfile conflicts in git \"Cannot use import statement outside a module\" Windows + Node: long paths / strange chars Two versions of the same package installed Deprecation warnings on every command Slow `npm install` on CI Quick recommended setup (2026)"
  },
  {
    "language": "javascript",
    "slug": "02_language_basics",
    "title": "Language Basics",
    "url": "/reference/javascript/02_language_basics.md",
    "keywords": "Table of Contents 1. Hello, World 2. Comments 3. Variables: let, const, var Rules of thumb `const` is shallow Multiple declarations 4. Primitive Types 5. Strings and Template Literals Template literals — preferred Common string methods Strings are iterable 6. Numbers and BigInt The precision trap BigInt Math Conversion 7. Booleans, Truthy/Falsy, ==/=== Falsy values `==` vs `===` (use `===`) Nullish coalescing `??` Optional chaining `?.` Logical operators Logical assignment (ES2021) 8. null and undefined `void` 9. Operators Arithmetic String + Number Comparison Logical Bitwise Comma operator (rarely useful) typeof, instanceof, in, delete Spread `...` and rest `...` 10. Destructuring & Spread Array destructuring Object destructuring Spread 11. Control Flow if / else if / else Ternary switch for / for...of / for...in while / do...while break / continue 12. Functions Function declarations Function expressions Arrow functions Default parameters Rest parameters Named arguments via destructuring Returning multiple values IIFE (Immediately Invoked Function Expression) Generator functions 13. Scope and Hoisting Block scope (let, const) vs function scope (var) Hoisting Closures `this` 14. Strict Mode 15. Common Style Conventions"
  },
  {
    "language": "javascript",
    "slug": "03_data_structures",
    "title": "Data Structures",
    "url": "/reference/javascript/03_data_structures.md",
    "keywords": "Table of Contents 1. Choosing the Right Structure 2. Arrays Access Mutating methods (modify the array) Non-mutating methods (return new array — preferred for clarity) Iteration `for...of` for early-exit Chaining Sparse arrays Typed arrays 3. Objects Object literal shortcuts Iterating Copying and merging Property descriptors Object.* utilities Object vs Map (which?) 4. Maps and WeakMaps `Map` `WeakMap` 5. Sets and WeakSets `Set` Set operations (ES2025) `WeakSet` 6. Iteration Protocol Make your own iterable Generator functions Iterator helpers (ES2025) 7. Common Patterns Frequencies / counting Group by key Top-N by score Deduplicate by key Flatten nested arrays Chunk an array Zip two arrays Range Sum / product / average Min/max by key Sort by multiple keys Convert object to array of key/value pairs Invert an object 8. Immutability Tips Updating without mutation Deep updates with Immer 9. Performance Notes Tips Profile, don't guess"
  },
  {
    "language": "javascript",
    "slug": "04_oop",
    "title": "Object-Oriented JavaScript",
    "url": "/reference/javascript/04_oop.md",
    "keywords": "Table of Contents 1. Mental Model When to use classes When NOT to use classes 2. Classes Key rules Class fields (ES2022) Method types 3. Instance vs Static 4. Inheritance Multiple inheritance — JavaScript doesn't have it 5. The `this` Problem Fix 1: Arrow function preserves `this` Fix 2: `bind` Fix 3: Wrapper arrow Practical advice `call`, `apply`, `bind` 6. Private Fields Private methods Older convention (still common) 7. Getters and Setters 8. Prototypes (Underneath It All) Object.create Checking the chain 9. Composition over Inheritance Component-style alternative 10. Choosing the Right Pattern Don't fight the language"
  },
  {
    "language": "javascript",
    "slug": "05_functional",
    "title": "Functional Patterns",
    "url": "/reference/javascript/05_functional.md",
    "keywords": "Table of Contents 1. Functions as Values 2. Closures (Recap) The classic loop gotcha (mostly fixed by `let`) 3. Higher-Order Functions 4. Pure Functions 5. Currying and Partial Application When to use 6. Function Composition 7. Memoization Caveats 8. Throttle and Debounce Debounce — wait for quiet Throttle — rate-limit 9. Immutability in Practice Spread / rest for shallow updates Object.freeze (shallow only) Deep freeze utility Immer — deep updates that look mutable Records and Tuples (proposal — coming someday) 10. Pattern Library Optional chaining + nullish coalescing for defaults Pipeline operator (proposal) Tagged template literals Lazy / generator pipelines Sentinel functions / strategy pattern `Array.from` for collection constructors `Object.fromEntries` with `Object.entries` Tap (for debugging chains)"
  },
  {
    "language": "javascript",
    "slug": "06_async",
    "title": "Asynchronous JavaScript",
    "url": "/reference/javascript/06_async.md",
    "keywords": "Table of Contents 1. The Event Loop (Brief) 2. Callbacks The pain 3. Promises Consuming promises Creating promises `Promise.withResolvers` (ES2024) Wrapping callback APIs as Promises Chaining Errors propagate down 4. Async/Await Key facts `async` arrow functions Async methods Top-level await (ES2022) When NOT to await 5. Running in Parallel `Promise.all` — fail if any fails `Promise.allSettled` — wait for all, succeed or fail `Promise.race` — first to settle (fulfill or reject) `Promise.any` — first to fulfill (ignores failures until all fail) Bounded concurrency (for many parallel tasks) 6. Error Handling try/catch with await Catching at the call site Unhandled rejections Custom error types 7. AbortController and Timeouts Built-in timeout (modern) Combining signals Pattern: wrap any operation with a timeout 8. setTimeout, setInterval, microtasks `setTimeout` `setInterval` — repeat `queueMicrotask` — schedule before the next render/timer Order `setImmediate` (Node only) `process.nextTick` (Node only) 9. Async Iteration `for await...of` Async iterables in fetch streams `Symbol.asyncIterator` 10. Common Pitfalls Forgetting `await` `forEach` doesn't await Awaiting in a `.map` is parallel Mixed Promise and callback APIs Catch placement `finally` doesn't see the return/throw Long-running promises that never resolve Promises that resolve immediately can mask race conditions Cancellation isn't free `unhandledrejection` in browsers / `unhandledRejection` in Node"
  },
  {
    "language": "javascript",
    "slug": "07_modules",
    "title": "Modules & Packages",
    "url": "/reference/javascript/07_modules.md",
    "keywords": "Table of Contents 1. Why Modules 2. ES Modules Named exports Default export Re-export (barrel files) `export` rules File extensions 3. CommonJS (Legacy but Common) Differences from ESM How Node picks the format `__dirname` / `__filename` in ESM 4. ESM vs CommonJS Interop Importing CJS from ESM Importing ESM from CJS The \"ERR_REQUIRE_ESM\" error Dual-published packages 2026 reality 5. Dynamic Imports Use cases 6. Path Specifiers Built-in modules Path aliases (TypeScript / bundlers) 7. npm and the Registry Installing Versions Lockfile Scoped packages npx / package execution Local linking (when developing a package) Security 8. package.json `exports` Why exports map matters Older fields (still supported) 9. Authoring a Package `package.json` Building dual ESM/CJS Publishing Semantic versioning What goes in the package 10. Monorepos Workspaces (built into npm / pnpm / yarn / bun) Tooling on top When to monorepo When NOT to 11. Common Module Problems \"Cannot use import statement outside a module\" \"ERR_REQUIRE_ESM\" \"Cannot find module 'X'\" \"ERR_UNSUPPORTED_DIR_IMPORT\" Mixed default and named imports TypeScript imports use `.js` but the file is `.ts` Two copies of the same package installed Tree-shaking ignored Sourcemaps not loading Hoisting and `node_modules` shape"
  },
  {
    "language": "javascript",
    "slug": "08_errors",
    "title": "Errors & Error Handling",
    "url": "/reference/javascript/08_errors.md",
    "keywords": "Table of Contents 1. What an Error Is 2. Built-in Error Types Type narrowing in TypeScript 3. try / catch / finally Catch without binding (ES2019) Don't catch everything blindly Re-throw what you can't handle `finally` semantics 4. throw What to throw `Error` constructor signature 5. Custom Errors Always set `.name` Hierarchy for libraries Discriminated union via `code` 6. Async Error Handling With `async` / `await` Without await — `.catch` Errors in event handlers Errors inside `setTimeout` / callbacks `Promise.all` aggregates 7. Error.cause and Chaining Why bother 8. Returning vs Throwing Style 1: Throw Style 2: Return a tagged result Hybrid: throw for unexpected, return for expected 9. Top-Level Error Handlers Browser Node 10. Logging Errors What to log Don't log secrets Don't log the same error in multiple places Stack traces 11. Common Patterns Defensive parsing Default value on error Retry with exponential backoff Timeout wrapper Circuit breaker Idempotency Graceful shutdown"
  },
  {
    "language": "javascript",
    "slug": "09_browser_apis",
    "title": "Browser APIs",
    "url": "/reference/javascript/09_browser_apis.md",
    "keywords": "Table of Contents 1. The DOM Selecting elements Reading and writing `textContent` vs `innerHTML` Creating elements Template literals + insertAdjacentHTML (often cleaner than createElement chains) Traversal Size and position 2. Events Common event types Event object Event listener options Event delegation Custom events Keyboard events 3. Forms Reading values Validation File uploads 4. fetch — HTTP from the Browser Response methods `fetch` does NOT throw on HTTP errors Headers Authentication CORS in one paragraph Streaming Aborting 5. Storage `localStorage` / `sessionStorage` Cookies IndexedDB Cache API (for Service Workers / offline) When to use what 6. URL and URLSearchParams 7. Workers Web Worker Use cases Service Worker SharedWorker Node Worker Threads 8. Observers IntersectionObserver — element visibility MutationObserver — DOM changes ResizeObserver — element size changes PerformanceObserver — timing entries 9. Animation and Timing `requestAnimationFrame` Web Animations API CSS animations and transitions Idle callbacks 10. Other Useful APIs Clipboard Geolocation Notifications History (SPA routing) WebSocket Server-Sent Events (one-way) Broadcast Channel — cross-tab messaging `structuredClone` Crypto Intl — locale-aware formatting Drag and Drop File System Access API (Chromium) Page Visibility API"
  },
  {
    "language": "javascript",
    "slug": "10_node",
    "title": "Node.js — Runtime APIs",
    "url": "/reference/javascript/10_node.md",
    "keywords": "Table of Contents 1. Built-in Modules 2. Filesystem (`node:fs`) Reading Writing Streaming (for large files) File watching Globbing Temp directories Permissions 3. Paths (`node:path`) `import.meta.url` → file path (ESM) 4. Process (`node:process`) Reading stdin Command-line argument parsing 5. OS (`node:os`) 6. HTTP / HTTPS Server Client — fetch (preferred since Node 18) `undici` — Node's HTTP engine, directly 7. Streams Reading Writing `pipeline` — connect streams with error handling `Readable.from` — create a stream from anything Web Streams interop 8. Buffers and Encoding TextEncoder / TextDecoder (cross-runtime) 9. Child Processes `spawn` — for long-running processes / streaming output `exec` / `execFile` — for short commands, buffered output `fork` — spawn another Node process with IPC 10. Worker Threads When to use 11. EventEmitter Modern alternatives 12. Crypto, Util, and Friends `node:crypto` `node:util` `node:assert` `node:zlib` — compression `node:url` `node:test` — built-in test runner (since 18)"
  },
  {
    "language": "javascript",
    "slug": "11_web_frameworks",
    "title": "Frontend Frameworks",
    "url": "/reference/javascript/11_web_frameworks.md",
    "keywords": "Table of Contents 1. Choosing a Framework 2. React Mental model Components JSX State: `useState` Effects: `useEffect` Other hooks worth knowing Custom hooks Context — sharing state without prop drilling Server Components (React 19+, Next.js 13+) Lifecycle and concurrent rendering 3. Next.js What Next gives you Starting a project App router structure A page A layout API routes Server Actions Data fetching strategies Image and font optimization Deployment 4. Vue Component (Single-File Component) Reactivity: `ref` and `reactive` Composables (Vue's hooks) Template directives Nuxt — the Next.js for Vue 5. Svelte / SvelteKit Component Reactivity (Svelte 5) Why Svelte SvelteKit Adoption note 6. Astro Mental model A page Islands of interactivity When Astro wins When it doesn't 7. State Management Local state — built-in Global state libraries (when local + context isn't enough) Zustand example URL state 8. Data Fetching TanStack Query (React Query) SWR — alternative, lighter Native to the framework tRPC — typesafe RPC end-to-end 9. Forms React Hook Form (React) Other options Validation libraries 10. Styling Tailwind CSS — dominant in 2026 CSS Modules CSS-in-JS Component libraries 11. Routing 12. What I'd Pick in 2026"
  },
  {
    "language": "javascript",
    "slug": "12_backend",
    "title": "Backend Frameworks",
    "url": "/reference/javascript/12_backend.md",
    "keywords": "Table of Contents 1. Choosing a Backend Framework 2. Express Middleware Error-handling middleware Routers — organize routes Strengths and weaknesses 3. Fastify Why Fastify Plugins TypeBox / Zod integration 4. Hono Why Hono Running on different runtimes When to pick 5. NestJS Controller Service (injectable) Module Why Nest When NOT to pick 6. Next.js API Routes / Route Handlers Route handlers (App Router) When to use When not to 7. Validation (Zod / Valibot) Zod — the dominant choice in 2026 Composition Schemas as the single source of truth Valibot — smaller alternative 8. Authentication Session-based (cookie + server store) JWT (stateless tokens) OAuth / OIDC (\"Login with...\") Password hashing API keys 9. Middleware Patterns Logging CORS Rate limiting Security headers Request IDs / tracing Compression File uploads 10. Background Jobs BullMQ — Redis-backed Other options Cron in production 11. Deployment Where to deploy Containerizing Environment configuration Graceful shutdown Health checks Observability"
  },
  {
    "language": "javascript",
    "slug": "13_databases",
    "title": "Databases",
    "url": "/reference/javascript/13_databases.md",
    "keywords": "Table of Contents 1. Choosing a Data Layer 2. Prisma Setup Schema Generate the client and migrate Use it Transactions Pros Cons 3. Drizzle Setup Schema in TypeScript Use it Relations API (Prisma-like) Migrations with drizzle-kit Pros Cons 4. Kysely 5. Raw Postgres (`pg` / `postgres`) `pg` (the classic) `postgres` (alternative, often used with Drizzle) 6. SQLite (`better-sqlite3` / `bun:sqlite` / `node:sqlite`) `better-sqlite3` — Node, synchronous, fast `bun:sqlite` — Bun's built-in `node:sqlite` — built into Node 22+ When SQLite suffices 7. MySQL `mysql2` (the standard) MySQL with Prisma / Drizzle 8. Redis `ioredis` — popular, full-featured `redis` (official Node.js client) Common patterns Upstash, Redis Cloud, Cloudflare KV 9. MongoDB Official driver Mongoose — ODM (Object Document Mapper) When MongoDB makes sense 10. Migrations Prisma Drizzle Knex / db-migrate (raw) Practical migration advice 11. Connection Pooling, Transactions, Pitfalls Connection pooling is mandatory for servers Serverless and connection pooling Transactions N+1 query Long-lived idle connections Don't store secrets in code Schema-first vs code-first Backups and replicas"
  },
  {
    "language": "javascript",
    "slug": "14_testing_and_quality",
    "title": "Testing & Code Quality",
    "url": "/reference/javascript/14_testing_and_quality.md",
    "keywords": "Table of Contents 1. Test Pyramid 2. Vitest Matchers Setup and teardown Parameterize Configuration 3. Jest 4. Component Testing — Testing Library Philosophy Common queries Vue / Svelte 5. Playwright — End-to-End Features Alternatives 6. Mocking `vi.fn()` / `vi.spyOn()` Module mocking MSW (Mock Service Worker) — for mocking HTTP What to mock What NOT to mock 7. Coverage 8. ESLint Modern setup (flat config, ESLint 9+) Useful plugin sets Biome — the all-in-one alternative 9. Prettier Editor integration Prettier vs ESLint 10. TypeScript Checking Strict mode flags (worth enabling all) Project references and incremental builds Type checking in tests 11. Pre-commit Hooks Husky + lint-staged Alternative: simple-git-hooks Pre-push checks 12. CI Integration CI tips Common quality script in `package.json`"
  },
  {
    "language": "javascript",
    "slug": "15_tooling_and_advanced",
    "title": "Tooling & Advanced Topics",
    "url": "/reference/javascript/15_tooling_and_advanced.md",
    "keywords": "Table of Contents 1. Build Tools and Bundlers 2. Vite — the New Default Speed Setup Path aliases Plugin ecosystem 3. Other Bundlers webpack Turbopack esbuild Rollup Parcel tsup (and unbuild) Recommendations 4. Profiling and Performance Browser DevTools — Performance tab Lighthouse / PageSpeed Insights Bundle analyzer Node profiling Common JS performance fixes 5. WebAssembly When to consider WASM Calling WASM from JS Real-world WASM in 2026 6. Security XSS — Cross-Site Scripting CSRF — Cross-Site Request Forgery CSP — Content Security Policy SQL injection Authentication mistakes Secrets in code Dependencies Browser-side secrets TLS Cookies 7. Deployment Recipes Frontend (SPA or static site) Full-stack Next.js Containerized Node API Serverless Static + dynamic (the hybrid) Monitoring Edge runtime limitations 8. Best Practices 9. Common Pitfalls Reference `this` issues Mutable default parameters Closure over loop var (only with `var`) `==` coercion `typeof null === \"object\"` `NaN !== NaN` Array `sort` is lexicographic by default `forEach` doesn't await `JSON.stringify` skips undefined and functions Floating-point precision Mutating then comparing arrays Spread is shallow `Object.keys(obj)` skips non-string keys Empty arrays and objects are truthy `Number(\"\")` is 0 `setTimeout` with non-integer `setInterval` with slow callbacks `Date` is mutable and tricky `for...in` on arrays `Array(n)` creates a sparse array `delete` on arrays leaves holes Reassigning `let` in a closure Async function in array methods Iterating Maps requires destructuring Spread of strings / iterables `await` inside loops sequentializes `JSON.parse` failure throws SyntaxError Top-level await delays module loading `import` is hoisted; mocks must come before CORS preflight surprises `fetch` doesn't throw on HTTP errors `fetch` without timeout hangs forever Memory leaks via event listeners Memory leaks via closures React: stale closures React: mutating state React: missing keys in lists React: setting state in render Node: forgetting `await` Node: missing process error handlers Node: synchronous fs in a server's hot path Node: not setting timeouts on external calls CommonJS / ESM interop weirdness Bundler ignoring tree-shaking Locale-sensitive sort `Date.now() / 1000` for timestamps loses precision String index out of range Catch syntax in older code `for...of` on objects throws Wrong `keyof` in TS `Object.fromEntries` mistypes in TS TypeScript: `any` propagates silently TypeScript: `as` casts "
  },
  {
    "language": "typescript",
    "slug": "README",
    "title": "TypeScript — Reference Library",
    "url": "/reference/typescript/README.md",
    "keywords": "How to navigate this folder What TypeScript is Why use TypeScript in 2026 How \"strict\" is strict Reading order Things the type system is great at Things the type system can't do Version"
  },
  {
    "language": "typescript",
    "slug": "01_setup_and_tsconfig",
    "title": "Setup & tsconfig.json",
    "url": "/reference/typescript/01_setup_and_tsconfig.md",
    "keywords": "Table of Contents 1. Installing TypeScript 2. Running TS Code `tsc` — official compiler `tsx` — run `.ts` files directly via Node Node native (22+) Bun — runs TS natively Deno — TS-first `ts-node` — older runner Bundlers compile TS automatically Recommended dev loop 3. tsconfig.json — Anatomy `target` — what JS to emit `module` — how imports/exports compile `moduleResolution` — how the compiler finds modules `lib` — built-in types available `jsx` — how to handle JSX `outDir`, `rootDir` `sourceMap`, `declaration`, `declarationMap` `paths` and `baseUrl` — module aliases `include`, `exclude`, `files` `extends` — inherit from another config 4. Strict Mode Flags Beyond strict — flags worth enabling `verbatimModuleSyntax` (5.0+) `isolatedModules` `skipLibCheck` `esModuleInterop` `forceConsistentCasingInFileNames` 5. Module System Scenario A: Node application Scenario B: Bundled app (Vite, Next, etc.) Scenario C: Publishing a library 6. Project Structure Multiple tsconfigs Monorepo with project references 7. Editor Setup VS Code WebStorm / JetBrains Type errors in editor vs CLI 8. Common Setups Node app (Express/Fastify/Hono backend) Vite + React Next.js Library (publishable npm package) Quick script `@tsconfig` base configs"
  },
  {
    "language": "typescript",
    "slug": "02_basic_types",
    "title": "Basic Types",
    "url": "/reference/typescript/02_basic_types.md",
    "keywords": "Table of Contents 1. How TypeScript Types Work Types vs values Types are erased 2. Primitives `null` and `undefined` Boolean coercion 3. Arrays and Tuples Arrays Tuples — fixed-length, typed-by-position Array literal inference 4. Objects Index signatures Combining known and unknown keys Nested objects `Record<K, V>` 5. Type Aliases vs Interfaces Type aliases work for anything Interfaces are merged across declarations Interfaces have nominal-ish error messages Performance Practical advice Extending Implementing in classes 6. Functions Function type literals Method shorthand in object types Async functions Overloads 7. Optional, Default, Rest Parameters Optional Defaults Rest parameters Destructured parameters with defaults 8. Literal Types `as const` — preserve literal types Template literal types 9. `any`, `unknown`, `never`, `void` `any` — opt out of type checking `unknown` — top type, the safe `any` `never` — the empty set `void` — function returns nothing meaningful 10. Type Assertions vs Type Guards Type assertion — \"trust me\" `as unknown as T` — double assertion (last resort) Type guards — narrow with runtime checks `satisfies` operator (TS 4.9+) 11. Type Inference Where to annotate Contextual typing Inference vs `satisfies` Type vs value position"
  },
  {
    "language": "typescript",
    "slug": "03_unions_and_narrowing",
    "title": "Unions & Narrowing",
    "url": "/reference/typescript/03_unions_and_narrowing.md",
    "keywords": "Table of Contents 1. Union Types Union of literals Distributing over unions 2. Intersection Types Intersection of unions When intersection is impossible 3. Narrowing `typeof` `instanceof` Equality narrowing Truthiness narrowing `in` operator `Array.isArray` and other built-ins Assignment narrowing Discriminated narrowing (covered in section 5) 4. Type Predicates Zod / Valibot give you guards for free `asserts` functions 5. Discriminated Unions Why it's better than alternatives State machines Result types Tagged events Naming the discriminant 6. Exhaustiveness Checks Helper function for exhaustiveness Without switch — using `Record`-style dispatch 7. Common Patterns Optional-as-discriminant — light pattern `RequireAtLeastOne` Branding to differentiate unions of structurally identical types \"Distributive conditional types\" Pattern: \"no impossible states\" Pattern: \"narrow at the edge\" Pattern: \"exhaustive UI rendering\""
  },
  {
    "language": "typescript",
    "slug": "04_generics",
    "title": "Generics",
    "url": "/reference/typescript/04_generics.md",
    "keywords": "Table of Contents 1. Why Generics 2. Generic Functions Basics Multiple type parameters Arrow functions Generic methods When inference fails Generic constraints in function signatures 3. Generic Type Aliases and Interfaces Nested generics Conditional inference (preview of file 05) 4. Generic Classes Inferring from usage Multiple type parameters Inheritance with generics 5. Constraints Constraining to keys Constraining to value types Multiple constraints with intersection Self-referencing constraints 6. Default Type Parameters Common: arrays defaulting to `unknown` React props with defaults 7. Inference From arguments From return position (rare) Inference with constraints `const` type parameters (TS 5.0+) `NoInfer` (TS 5.4+) 8. Common Generic Patterns `Identity` — for type assertion via inference Generic factory Wrapper / decorator preserving signature Async version Generic Result helpers Map / Reduce with proper types Container types Generic events / handlers Builder pattern with generic state 9. When Not to Use Generics Common over-generic mistake When it does help"
  },
  {
    "language": "typescript",
    "slug": "05_advanced_types",
    "title": "Advanced Types",
    "url": "/reference/typescript/05_advanced_types.md",
    "keywords": "Table of Contents 1. Built-in Utility Types `Partial<T>` — all properties optional `Required<T>` — all properties required `Readonly<T>` `Pick<T, K>` — select keys `Omit<T, K>` — exclude keys `Record<K, V>` — object with known keys `Exclude<U, V>` — remove from union `Extract<U, V>` — keep matching from union `NonNullable<T>` `Parameters<F>` — tuple of function parameter types `ReturnType<F>` `Awaited<T>` — unwrap `Promise<T>` (TS 4.5+) `ConstructorParameters<T>` and `InstanceType<T>` `ThisParameterType`, `OmitThisParameter` Use them all the time 2. Mapped Types Modifiers Key remapping (TS 4.1+) Filtering keys Picking by value type `DeepPartial` `DeepReadonly` 3. Conditional Types Distribution over unions Disabling distribution Built-in distribution patterns Combining with mapped types 4. `infer` `ReturnType` implementation Multiple `infer` `infer extends` constraints (TS 4.7+) Common `infer` recipes 5. Template Literal Types Built-in string manipulation Splitting strings Replacing Use cases 6. `keyof`, `typeof`, indexed access `keyof T` `typeof` in type position Indexed access (`T[K]`) Index signatures and `keyof` 7. Recursion in Types `DeepPartial` (recursive) Flatten arrays Path types `JSONValue` — recursive shape 8. Practical Recipes \"All optional except these\" \"Either A or B, not both\" \"Function with one required arg, rest optional\" \"Tuple to union\" \"Union to tuple\" — *don't do this* Strongly-typed `Object.entries` / `Object.keys` Strongly-typed `JSON.parse` Discriminated union helpers Mutating a readonly array's type back to mutable 9. `type-fest` and Friends `Simplify<T>` — flatten the type for prettier hover info `LiteralUnion<T, BaseType>` — \"literal plus other strings\" `Tagged<T, Tag>` — branded types Other libraries"
  },
  {
    "language": "typescript",
    "slug": "06_classes_and_decorators",
    "title": "Classes & Decorators",
    "url": "/reference/typescript/06_classes_and_decorators.md",
    "keywords": "Table of Contents 1. Access Modifiers Compile-time only Recommendations 2. Parameter Properties 3. Abstract Classes 4. `implements` and `extends` `implements` checks shape but doesn't inherit `extends` for inheritance Combining When to choose 5. `readonly` and `override` `readonly` `override` (with `noImplicitOverride`) 6. Type-Only Class Members 7. Constructor Signatures Mixin pattern 8. Decorators (Stage 3 / TS 5.0+) Stage 3 decorators (current) Available targets Decorator factories — passing arguments Legacy \"experimental decorators\" Whether to use decorators in your own code 9. When to Use Classes in TS Use classes when Skip classes when TS-specific reasons NOT to over-use classes Idiomatic TS service Inheritance: lean composition"
  },
  {
    "language": "typescript",
    "slug": "07_modules_and_declarations",
    "title": "Modules & Declarations",
    "url": "/reference/typescript/07_modules_and_declarations.md",
    "keywords": "Table of Contents 1. Module Resolution Modes `nodenext` (or `node16`) `bundler` `node` (legacy / classic) `classic` Choosing Path mapping (`paths`) 2. Importing Types Why type-only imports Importing from libraries that have types co-located Re-exporting types 3. Declaration Files (`.d.ts`) Why declaration files matter Generated vs hand-written Declaration maps 4. Ambient Declarations Global types Ambient modules `declare` keyword 5. Module Augmentation Augmenting a third-party module Augmenting global types (DOM) Common augmentations Augmenting interfaces vs replacing them 6. Typing JavaScript Modules 1. Use `@types/<lib>` if available 2. Write your own `.d.ts` 3. Just declare `any` `// @ts-ignore` and `// @ts-expect-error` `as any` and `as unknown as T` 7. Authoring a TS Library tsconfig.json Build with tsup (dual ESM + CJS + types) package.json exports `verbatimModuleSyntax` + dual output Testing types in your library Publishing checklist 8. `@types` Packages When to install Conflicts When `@types` is wrong `skipLibCheck` 9. Common Module Issues \"Cannot find module 'X' or its corresponding type declarations\" \"An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled\" \"Module 'X' has no exported member 'Y'\" \"Cannot use namespace 'X' as a type\" Duplicate declarations across `.d.ts` Circular type references Type-only circular imports `paths` not working at runtime `node_modules` causing slow TS \"Module X resolves to an untyped module\" Wrong types loaded TS version mismatch (editor vs CLI)"
  },
  {
    "language": "typescript",
    "slug": "08_practical_patterns",
    "title": "Practical Patterns",
    "url": "/reference/typescript/08_practical_patterns.md",
    "keywords": "Table of Contents 1. Branded Types Creating branded values Using `type-fest` When branding pays When it's overkill Composability 2. Builders and Fluent APIs Phantom builder state 3. Result Types and Error Handling Pros Cons Libraries Pragmatic middle ground 4. Validation with Inference (Zod) Composition Pattern: schema = source of truth Transforming and refining Async refinements Alternatives 5. Dependency Injection (Functional) Pros Cons When to switch to a DI framework 6. Type-Safe Routing Hono example 7. Type-Safe Event Buses 8. Make Illegal States Unrepresentable Form state example Refactor heuristic 9. Narrow at the Edge Boundaries to validate Inside the boundary 10. Common Idioms `as const` for literal type extraction `satisfies` for config objects Returning empty types correctly Type guards for `Array.filter` `keyof typeof` pattern for enums-from-objects `Omit` for \"everything except\" `Partial` for updates `Awaited` for async returns Exhaustiveness via `never` Const assertions for tuples Optional chaining as type narrowing `??` for safe defaults Readonly arrays in function signatures Avoid `Boolean` constructor in filter Don't return `Promise.all` directly without typing"
  },
  {
    "language": "typescript",
    "slug": "09_tooling_and_advanced",
    "title": "Tooling & Advanced Topics",
    "url": "/reference/typescript/09_tooling_and_advanced.md",
    "keywords": "Table of Contents 1. Project References Root tsconfig Per-package tsconfig Building When to use When not to bother Caveats 2. Build Tools — Comparison Recommended setups `swc` for fast compilation When to use multiple tools 3. DX Tips `verbatimModuleSyntax` for explicit imports Faster compile Avoid `any` Editor: restart TS server when errors get stuck Use `@tsconfig/*` base configs `// @ts-expect-error` over `// @ts-ignore` `unknown` in catch blocks Inline type annotations beat external type aliases for one-offs Use `satisfies` instead of casts Hover types in IDE TypeScript Playground Useful packages 4. TypeScript Performance Tuning Diagnose Common causes of slowness Speed-up techniques `Simplify<T>` for prettier output `type-coverage` 5. Migration Strategies From JavaScript to TypeScript `@ts-check` for gradual adoption JSDoc types in JS From legacy decorators to Stage 3 6. Modern TS Stack (2026) Language & runtime Validation Editor Testing Linting / formatting Build State management Backend Monorepo Observability Other useful libraries 7. Common TS Pitfalls `any` infects `unknown` requires narrowing `noUncheckedIndexedAccess` and arrays `as` casts hide bugs Function type variance `void` vs `undefined` for callbacks Discriminated unions need consistent discriminant `object` type isn't what you think `Object.keys` returns `string[]` always `JSON.parse` returns `any` Optional chaining narrowing pitfall Equality with literal unions Inferred `never[]` Empty object `{}` Index signatures and missing keys `enum` vs union of strings `namespace` is legacy `default export` interop Circular type references `Readonly<T>` is shallow Type predicates lie `as const` doesn't deeply freeze Async function return types `Promise<void>` swallows rejection types `void` doesn't mean `undefined` in return position Generics that don't help TypeScript and JSON Iterating `Set` and `Map` `Array.includes` argument type `instanceof` for cross-realm objects `this` typing in callbacks Default exports + types `tsc --watch` getting stale Linting and types disagreeing `as unknown as T` red flag `@ts-nocheck` at the file top Wrong TS version Type errors only in CI Cross-environment globals"
  },
  {
    "language": "sql",
    "slug": "README",
    "title": "SQL — Reference Library",
    "url": "/reference/sql/README.md",
    "keywords": "How to navigate this folder What SQL is in 2026 Why SQL still matters Where SQL isn't the right tool The dialect landscape PostgreSQL MySQL / MariaDB SQLite SQL Server (Microsoft) Cloud warehouses Oracle OLTP vs OLAP DuckDB Reading order The mental model: sets, not loops What this guide assumes Quick install What you won't find here TL;DR: when SQL fits"
  },
  {
    "language": "sql",
    "slug": "01_basics",
    "title": "SQL Basics",
    "url": "/reference/sql/01_basics.md",
    "keywords": "Table of Contents Tables: the Core Idea Rows vs records vs tuples Tables vs relations Why this model wins Data Types Integers Floating point and decimal Strings Boolean Date and time JSON Binary Arrays (Postgres) UUID `NULL` Creating Tables Modern Postgres syntax (preferred) MySQL version SQLite version SQL Server version Naming conventions Primary Keys Surrogate vs natural keys Composite primary keys UUID primary keys Constraints `NOT NULL` `UNIQUE` `CHECK` `DEFAULT` `FOREIGN KEY` Foreign key actions Named constraints Multi-table example Inserting Data Basic insert Multi-row insert Insert and return Insert from a SELECT Upsert (insert or update) Ignoring conflicts Default values Updating Data Multiple columns Computed updates Update with returning Update from another table Avoid the no-WHERE disaster Deleting Data Returning deleted rows (Postgres) Delete with subquery Delete vs truncate Soft delete Altering Tables Add a column Drop a column Rename Change a type Add a constraint Migrations Dropping Tables Schemas, Databases, Connecting Database vs schema Connecting Quick CLI commands you'll want Key principles"
  },
  {
    "language": "sql",
    "slug": "02_querying",
    "title": "Querying",
    "url": "/reference/sql/02_querying.md",
    "keywords": "Table of Contents The Basic SELECT Always avoid `SELECT *` in application code Column aliases Expressions in SELECT Choosing Columns Table-qualified column names Table aliases WHERE: Filtering Rows Single quotes for strings Escaping quotes in strings Comparison Operators Logical Operators Precedence: `NOT` > `AND` > `OR` Three-valued logic Pattern Matching: LIKE and Regex `LIKE` Escaping wildcards Regular expressions IN, BETWEEN, ANY, ALL `IN` `NOT IN` `IN` with subquery `BETWEEN` `ANY` and `ALL` (less common) NULL Handling NULL comparisons Testing for NULL `IS DISTINCT FROM` `COALESCE` `NULLIF` `IFNULL` / `ISNULL` / `NVL` Default values in queries ORDER BY: Sorting Sorting by computed expressions Sort by column alias Sort by position `NULLS FIRST` / `NULLS LAST` Sort is stable but not deterministic LIMIT and OFFSET: Pagination LIMIT OFFSET Pagination pattern The OFFSET pagination problem SQL Server syntax Top-N per group DISTINCT `DISTINCT` is not free `DISTINCT ON` (Postgres) CASE Expressions Simple CASE form CASE in WHERE, ORDER BY, GROUP BY CASE for conditional counts (preview of GROUP BY) String Functions Length Case conversion Concatenation Substring Trim Replace Position / find Split Format / templating Date and Time Functions Current time Date arithmetic Extracting parts Truncating to a unit Formatting Differences Time zones (Postgres) The date range pitfall Math Functions Division `GREATEST` / `LEAST` Random Type Conversion `CAST` Postgres shortcut: `::` Convert numbers and strings Convert to/from JSON Implicit conversion Putting it together Key principles"
  },
  {
    "language": "sql",
    "slug": "03_joins",
    "title": "Joins",
    "url": "/reference/sql/03_joins.md",
    "keywords": "Table of Contents The Mental Model Why this matters The Setup: Two Related Tables INNER JOIN With table aliases Inner join produces row duplication LEFT JOIN (LEFT OUTER JOIN) Why use LEFT JOIN `OUTER` is optional Finding rows without matches RIGHT JOIN Most people never use RIGHT JOIN FULL OUTER JOIN Use case MySQL has no FULL OUTER JOIN CROSS JOIN When it's useful The accidental cross join SELF JOIN Example: hierarchical data When self-join falls short Multi-Table Joins Mix join types Join condition vs WHERE in outer joins USING and Natural Joins USING NATURAL JOIN — avoid Join Conditions Beyond Equality Inequality joins Range joins (e.g., for binning) Self-join with inequality Common Join Mistakes Forgetting the join condition The N+1 query problem (application-side) Joining on the wrong columns Duplicating rows via fan-out Filtering an outer join with WHERE (covered above) Misuse of `COUNT(*)` with LEFT JOIN Anti-Joins and Semi-Joins Anti-join: \"rows in A with no match in B\" Semi-join: \"rows in A that have a match in B\" `EXISTS` vs `IN` Putting it together Key principles"
  },
  {
    "language": "sql",
    "slug": "04_aggregation",
    "title": "Aggregation",
    "url": "/reference/sql/04_aggregation.md",
    "keywords": "Table of Contents The Mental Model Aggregate Functions Basic examples `COUNT(*)` vs `COUNT(col)` GROUP BY Reading the result Multiple aggregates per group Rule: every non-aggregated SELECT column must appear in GROUP BY Postgres exception: functional dependencies HAVING: Filtering Groups Use WHERE for row filters, HAVING for group filters HAVING without GROUP BY Aggregation Without GROUP BY Mixing aggregates and bare columns without GROUP BY DISTINCT in Aggregates Common use: customer counts Performance note FILTER and Conditional Aggregates `FILTER` (standard SQL, Postgres, SQLite 3.30+) `CASE` workaround (any database) Comparison of styles Multi-Column Grouping Grouping by computed values `GROUP BY` by alias or position GROUP BY with JOIN The fan-out problem Group by joined columns GROUPING SETS, ROLLUP, CUBE GROUPING SETS ROLLUP CUBE Identifying subtotal rows Support NULL Handling in Aggregates `AVG` excludes NULLs `SUM` of all NULLs is NULL `COUNT(DISTINCT)` skips NULLs Common Mistakes `WHERE` with aggregates Forgetting columns in GROUP BY Counting NULL-containing columns SUM of nothing is NULL Fan-out duplicating sums `AVG` over an empty set Counting rows in a LEFT JOIN Putting it together Key principles"
  },
  {
    "language": "sql",
    "slug": "05_indexes_and_performance",
    "title": "Indexes and Performance",
    "url": "/reference/sql/05_indexes_and_performance.md",
    "keywords": "Table of Contents What an Index Actually Is Creating Indexes Primary keys are indexed automatically Unique constraints are indexed automatically Drop an index `CREATE INDEX CONCURRENTLY` (Postgres) `IF NOT EXISTS` B-Tree, the Default When Indexes Help Equality on a single column Range queries Sorting Joins Prefix matching on strings When Indexes Don't Help (or Hurt) Function calls or expressions on the indexed column Implicit type conversion Leading wildcard in LIKE `OR` across columns Low selectivity Write-heavy workloads with many indexes Unused indexes Composite Indexes Leftmost prefix rule Designing composite indexes How many composite indexes do you need? Covering Indexes Postgres: `INCLUDE` When covering indexes pay off Other Index Types Hash indexes GIN (Generalized Inverted Index, Postgres) GiST (Generalized Search Tree, Postgres) BRIN (Block Range Index, Postgres) Full-text search Vector indexes (modern Postgres) EXPLAIN: Reading Query Plans Key operations to recognize EXPLAIN ANALYZE MySQL `EXPLAIN` SQL Server: Execution Plans Statistics and the Planner Updating statistics When statistics matter Forcing index usage Common Performance Problems Missing index on a foreign key Sequential scan on a large table Index on the wrong column Sort spilling to disk Functions on indexed columns `OFFSET` for pagination N+1 in application code Counting with `COUNT(*)` over large tables Too many indexes on a write-heavy table Lock contention General Advice Index foreign keys Index columns you filter or sort on frequently Don't over-index Measure, don't guess Drop unused indexes Refresh statistics after big data changes Smaller tables = faster queries Watch for query plan changes `LIMIT` is not magic Don't pre-optimize Set query timeouts Key principles"
  },
  {
    "language": "sql",
    "slug": "06_transactions",
    "title": "Transactions",
    "url": "/reference/sql/06_transactions.md",
    "keywords": "Table of Contents Why Transactions ACID BEGIN, COMMIT, ROLLBACK Basic transaction Syntax variants Autocommit Behavior on errors Commit means it's persisted (mostly) Savepoints Isolation Levels Read Phenomena Dirty read Non-repeatable read Phantom read Standards vs reality Read Committed (Default) Lost updates Repeatable Read MySQL InnoDB's quirk Postgres snapshot isolation Serializable Practical use Choosing an Isolation Level Locking Lock types Implicit locking Multi-Version Concurrency Control (MVCC) Explicit Locks `SELECT ... FOR UPDATE` `SELECT ... FOR SHARE` (Postgres / MySQL) `FOR UPDATE SKIP LOCKED` `LOCK TABLE` (table-level locks) Advisory locks (Postgres) Deadlocks Preventing deadlocks Common deadlock patterns Long-Running Transactions Why they're bad What \"long\" means Tracking down long transactions Avoiding accidentally long transactions Putting it together Key principles"
  },
  {
    "language": "sql",
    "slug": "07_advanced_queries",
    "title": "Advanced Queries",
    "url": "/reference/sql/07_advanced_queries.md",
    "keywords": "Table of Contents Subqueries In the WHERE clause In the FROM clause (derived tables) In the SELECT clause (scalar subqueries) Correlated vs uncorrelated `EXISTS` and `NOT EXISTS` Common Table Expressions (CTEs) Multiple CTEs CTEs vs subqueries Performance Writable CTEs (Postgres) Window Functions: The Concept Window functions vs GROUP BY ROW_NUMBER, RANK, DENSE_RANK Partitioning for \"top N per group\" Picking the latest row per group LAG, LEAD: Comparing Rows Per-user previous order LAG with offset and default Use cases FIRST_VALUE, LAST_VALUE, NTH_VALUE Window Aggregates: Running Totals Moving averages Custom Frames `ROWS` vs `RANGE` Frame syntax `LAST_VALUE` needs explicit frame Recursive CTEs Syntax Example: Employee hierarchy Generating sequences Date series Cycle detection Performance UNION, INTERSECT, EXCEPT UNION UNION ALL INTERSECT EXCEPT (or MINUS in Oracle) Rules Use cases LATERAL Joins LEFT JOIN LATERAL Use cases Pivoting Data CASE-based pivot (portable) SQL Server PIVOT Postgres crosstab Unpivot Putting it together Key principles"
  },
  {
    "language": "sql",
    "slug": "08_dialect_differences",
    "title": "Dialect Differences",
    "url": "/reference/sql/08_dialect_differences.md",
    "keywords": "Table of Contents Auto-Incrementing IDs PostgreSQL MySQL SQLite SQL Server Oracle BigQuery / Snowflake Strings: Quoting and Concatenation Quoting Concatenation Escaping quotes Case Sensitivity Identifiers (table/column names) String comparisons Date and Time Current time Time zones Date arithmetic Extracting parts Truncation Formatting Differences in days Pagination Upserts PostgreSQL / SQLite MySQL SQL Server Oracle Returning Inserted/Updated Rows Postgres / SQLite (3.35+) / MariaDB / Oracle / SQL Server MySQL LIMIT vs TOP vs FETCH String Functions Type Casting Standard CAST Shorthand Safe casting Boolean Type NULL Handling Quirks `NULL` ordering `UNIQUE` with NULLs `COUNT(*)` vs `COUNT(col)` with NULLs Three-valued logic in WHERE GROUP BY Strictness JSON Support PostgreSQL MySQL SQLite SQL Server BigQuery / Snowflake Recommendation Array Support PostgreSQL Other databases Regular Expressions Window Functions and CTEs Support Identifier Quoting Comments The Cloud Warehouses (BigQuery, Snowflake) Things that differ BigQuery quirks Snowflake quirks Both have What stays the same When to care about portability Key principles"
  },
  {
    "language": "python",
    "slug": "README",
    "title": "Python — Reference Library",
    "url": "/reference/python/README.md",
    "keywords": "How to navigate this folder What Python is (mental model) The single most important idea What Python is great at What Python isn't great at The Zen of Python Versions: which Python should you use? How Python runs Implementations of Python Where Python sits in the broader stack A note on the broader ecosystem How to use this reference"
  },
  {
    "language": "python",
    "slug": "01_setup",
    "title": "Setup & Tooling",
    "url": "/reference/python/01_setup.md",
    "keywords": "Table of Contents 1. Installing Python macOS Linux Windows Verify the install 2. Version Managers pyenv (macOS / Linux) uv (newest, fastest) conda / mamba Which to use? 3. Virtual Environments — Why and How Why Built-in: `venv` Conventions `uv` makes this easier `conda` environments `pipx` for installing applications 4. Package Managers (pip, uv, poetry, pdm) `pip` — the original `uv` — recommended for new projects `poetry` — popular structured workflow `pdm` — similar philosophy, PEP-compliant Which to use in 2026? Index servers (private PyPI) Trusted hosts and TLS 5. Editors and IDEs VS Code PyCharm Cursor, Zed, Windsurf Jupyter / JupyterLab Vim / Neovim IDLE 6. Running Python Passing arguments Shebang line 7. REPLs Worth Using IPython bpython ptpython Notebook REPL 8. Project Layout Why `src/`? `__init__.py` `pyproject.toml` minimal example 9. Common Setup Problems \"command not found: python\" \"command not found: pip\" (but Python works) Activating venv but `pip install` goes to system Permission errors with `pip install` \"SSL: CERTIFICATE_VERIFY_FAILED\" M1/M2/M3 Mac and old packages \"package X requires Python >=3.11 but you're on 3.10\" Multiple Python installs and confusion \"Cannot import myproject\" after `pip install -e .` Quick recommended setup (2026)"
  },
  {
    "language": "python",
    "slug": "02_language_basics",
    "title": "Language Basics",
    "url": "/reference/python/02_language_basics.md",
    "keywords": "Table of Contents 1. Hello, World 2. Comments & Docstrings Comments Docstrings 3. Variables & Assignment Multiple assignment Swap without a temp Unpacking with `*` Naming conventions Names you can't use 4. Indentation & Blocks 5. Primitive Types 6. Strings (the Essentials) f-strings (the recommended way to format) Older formatting (you'll still see it) Common methods 7. Numbers and Arithmetic Float precision Numeric literals 8. Booleans, Truthy & Falsy Truthy and falsy values Boolean operators Comparison operators chain 9. None 10. Operators Arithmetic Comparison Identity Membership Logical Bitwise Assignment Operator precedence 11. Type Conversion 12. Control Flow: if / elif / else Ternary expression Conditional inside list comprehension `pass` — explicit do-nothing 13. Pattern Matching: match / case 14. Loops: for and while for while break and continue `else` on loops (a quirky feature) Looping idioms 15. Functions Default arguments Positional, keyword, and required `*args` and `**kwargs` Positional-only parameters (3.8+) Returning multiple values Type hints (more in `04_oop.md`) Lambdas — anonymous one-liners 16. Scope: LEGB Rule `global` and `nonlocal` 17. The Walrus Operator 18. Reading Input From the user (terminal) From command-line arguments From environment variables 19. Common Style Conventions"
  },
  {
    "language": "python",
    "slug": "03_data_structures",
    "title": "Data Structures",
    "url": "/reference/python/03_data_structures.md",
    "keywords": "Table of Contents 1. Picking the Right Data Structure 2. Lists Creation Indexing Slicing Mutation methods Non-mutating equivalents Aggregations Common gotcha: shallow vs deep copy Concatenation Lists vs arrays 3. Tuples Why use tuples? Unpacking Named tuples 4. Dictionaries Safe access Iteration Useful methods Ordering Keys must be hashable Nested dicts Default values 5. Sets and Frozensets Set algebra Set comprehension When to use a set Frozensets — immutable sets 6. Strings as Sequences Methods recap (most-used) Common operations Encoding & decoding Multiline strings & dedent 7. Comprehensions List comprehension Set comprehension Dict comprehension Generator expression — lazy When NOT to use a comprehension 8. The collections Module `Counter` — count occurrences `defaultdict` — auto-create missing values `deque` — double-ended queue `namedtuple` — covered above `OrderedDict` — historically important `ChainMap` — multiple dicts as one `UserDict`, `UserList`, `UserString` 9. Bytes and Bytearray 10. Common Patterns Iterate with index Iterate two lists together Iterate dict in sorted order Group by key Deduplicate while preserving order Flatten one level Merge dicts with conflict resolution Split a sequence into chunks Rotate a list Check if all elements are unique Most common element Find min/max with a tiebreaker 11. Performance Cheat Sheet Practical guidelines Profile, don't guess"
  },
  {
    "language": "python",
    "slug": "04_oop",
    "title": "Object-Oriented Python & Type System",
    "url": "/reference/python/04_oop.md",
    "keywords": "Table of Contents 1. Mental Model 2. Defining a Class Naming The `__init__` method 3. The `self` Parameter 4. Instance vs Class Attributes 5. Static and Class Methods Regular method — takes `self` Class method — takes `cls` Static method — takes nothing special 6. Inheritance `super()` Multiple inheritance Composition over inheritance 7. Method Resolution Order (MRO) 8. Dunder (\"Magic\") Methods Core ones Common dunders by category `functools.total_ordering` Callable objects 9. Properties (`@property`) `@cached_property` 10. Encapsulation: `_` and `__` 11. Abstract Base Classes (ABCs) 12. Dataclasses Common options Why `field(default_factory=...)`? Methods on dataclasses `__post_init__` Inheritance Conversion When to use what for data containers 13. Type Hints Built-in collection types (3.9+) `Optional` and `Union` Callable types Common typing constructs Any and unknown Forward references Type checking Should you type-hint everything? NewType 14. Generics Pre-3.12 syntax Python 3.12+ syntax (PEP 695) Bounded TypeVars Constraints (only these specific types) Covariance, contravariance, invariance 15. Protocols (Structural Typing) Runtime-checkable When to use which 16. Enums `StrEnum` and `IntEnum` `auto()` for auto-assigned values Flag enums 17. Choosing the Right Abstraction"
  },
  {
    "language": "python",
    "slug": "05_functional",
    "title": "Functional Patterns",
    "url": "/reference/python/05_functional.md",
    "keywords": "Table of Contents 1. Functions as Values 2. Closures `nonlocal` vs `global` Late binding gotcha 3. Lambdas Idiomatic uses When NOT to use lambdas 4. map, filter, reduce 5. Decorators Preserving metadata: `functools.wraps` Timing decorator Retry decorator Class-based decorators Decorating classes Built-in decorators worth knowing Stacking 6. Generators Why generators? Reading a huge file Generator pipelines `yield from` Generators are iterators Send / throw / close 7. Generator Expressions Comparison 8. itertools Building blocks Slicing Chaining Combinatorics Grouping Accumulate Take while / drop while Filter false Pairwise (3.10+) Batched (3.12+) Zipping unequal-length iterables 9. functools `cache` and `lru_cache` — memoization `reduce` `partial` — bind some args ahead of time `singledispatch` — function overloading by type `wraps` `total_ordering` 10. Context Managers Why use them Built-in / stdlib examples Custom context manager — class form Custom context manager — function form (preferred for simple cases) Useful `contextlib` helpers Async context managers (`async with`) 11. Iterators in Depth Iteration protocol Iterable but not iterator Useful iterator-aware built-ins"
  },
  {
    "language": "python",
    "slug": "06_errors_and_modules",
    "title": "Errors, Modules & Packaging",
    "url": "/reference/python/06_errors_and_modules.md",
    "keywords": "Table of Contents 1. Error Handling Philosophy 2. try / except / else / finally Rules of thumb Catching multiple exception types Re-raising preserves the traceback `except*` for ExceptionGroups (3.11+) 3. Built-in Exception Hierarchy Reading this 4. Raising Exceptions Raise vs return-an-error-code `assert` 5. Custom Exceptions 6. Exception Chaining Explicit chaining: `raise X from Y` Implicit chaining Suppressing chaining 7. Modules Where Python looks Re-running a module's code 8. Packages `__init__.py` Implicit namespace packages Relative imports 9. Imports in Depth Avoid star imports Circular imports Lazy imports Import order convention (PEP 8) Where does `import x` fail? 10. `__main__` and the `if __name__ == \"__main__\"` Pattern Module as command line Entry points 11. Packaging with `pyproject.toml` Minimal example Build backends Project layout that works Install locally for development Version management Including non-code files 12. Distributing on PyPI Test on TestPyPI first Upload to PyPI Versioning Yanking and deletion `MANIFEST.in` and friends Wheel vs sdist Pure Python vs native code"
  },
  {
    "language": "python",
    "slug": "07_stdlib",
    "title": "Standard Library Tour",
    "url": "/reference/python/07_stdlib.md",
    "keywords": "Table of Contents 1. Filesystem: `pathlib`, `os`, `shutil`, `glob` `pathlib` — the modern way `os` — when you need lower-level control `os.path` — the older path API (`pathlib` covers most of it) `shutil` — high-level file ops `glob` — pattern matching (largely replaced by `pathlib.glob`) `tempfile` — temporary files and directories 2. Date and Time: `datetime`, `zoneinfo`, `time` `time` module (lower-level) Format codes (most common) 3. JSON, CSV, TOML, INI `json` — JSON `csv` — CSV `tomllib` — TOML reading (3.11+) `configparser` — INI files 4. Regular Expressions: `re` Regex cheat sheet (the bits you'll use most) 5. Logging: `logging` Levels Per-module loggers File and rotating handlers Structured logging (JSON) `logging.config` 6. Command-line Parsing: `argparse` Subcommands (like `git add`, `git commit`) Alternatives 7. Running Subprocesses: `subprocess` `shell=True` is a footgun Long-running with `Popen` 8. HTTP Basics: `urllib`, `http.server` `http.server` — built-in HTTP server (development only!) 9. Hashing, Hex, Random: `hashlib`, `secrets`, `random`, `uuid` `hashlib` — cryptographic hashes `secrets` — cryptographic random `random` — NOT for security `uuid` 10. Math: `math`, `statistics`, `decimal`, `fractions` `math` `statistics` `decimal` — exact decimal arithmetic `fractions` — exact rationals 11. Compression & Archives: `gzip`, `zipfile`, `tarfile` `gzip` `zipfile` `tarfile` 12. Pickling & Serialization: `pickle`, `copy` `pickle` — Python's native binary serializer `copy` — shallow and deep copies 13. Other Useful Ones Examples worth seeing once"
  },
  {
    "language": "python",
    "slug": "08_concurrency",
    "title": "Concurrency",
    "url": "/reference/python/08_concurrency.md",
    "keywords": "Table of Contents 1. Choosing the Right Approach 2. The GIL Free-threaded Python (3.13+) 3. `threading` Daemon threads Sharing state — `Lock` `Queue` — the recommended primitive for thread communication Thread-local data 4. `multiprocessing` `Pool` — easy parallel map Sharing data between processes What's pickle-able is sendable Start methods 5. `concurrent.futures` — the friendly wrapper ThreadPoolExecutor — for I/O work ProcessPoolExecutor — for CPU work `submit` + `as_completed` Timeouts 6. `asyncio` Basics Vocabulary Sequential vs concurrent `asyncio.gather` `asyncio.TaskGroup` (3.11+) — the modern way Cancellation `asyncio.wait_for` Mixing sync and async 7. Async Patterns Concurrent HTTP requests Bounded concurrency with a semaphore Producer/consumer Async iteration Async context managers 8. Async Libraries \"Async all the way down\" 9. Combining the Models Process pool + async Thread pool + async Multiple processes, each running asyncio 10. Common Pitfalls Mutating shared state from threads without locks Blocking the event loop Forgetting to await Creating tasks without keeping references Running asyncio code from sync, repeatedly `time.sleep` inside async Mixing event loops Process pool startup cost Pickling failures with multiprocessing Daemon thread cleanup Deadlocks with fork on Linux + threads"
  },
  {
    "language": "python",
    "slug": "09_io_and_apis",
    "title": "I/O and APIs",
    "url": "/reference/python/09_io_and_apis.md",
    "keywords": "Table of Contents 1. File I/O Modes Always use `with` `pathlib` shortcuts Reading and writing in one pass 2. Binary I/O Seeking Memory-mapped files `io.BytesIO` / `io.StringIO` — in-memory file-like objects 3. Streaming Large Files Line by line — for text Chunk by chunk — for binary Hashing a file 4. Text Encoding Tips Decoding bytes you don't trust Common pitfall: mixing str and bytes 5. HTTP with `requests` Sessions — connection pooling, persistent state Timeouts Error handling Streaming responses (big files) Authentication Retries Disabling TLS verification (debugging only!) 6. HTTP with `httpx` Async HTTP/2 support When to pick which 7. Async HTTP Bounded concurrency `aiohttp` — the older async-only library 8. REST API Patterns Common pattern: typed wrapper Pagination Rate limiting Webhooks (receiving HTTP) 9. WebSockets Server: `websockets` library Client FastAPI WebSockets 10. Raw Sockets UDP TLS — wrap a socket asyncio sockets 11. Email and Other Protocols Quick SMTP example"
  },
  {
    "language": "python",
    "slug": "10_databases",
    "title": "Databases",
    "url": "/reference/python/10_databases.md",
    "keywords": "Table of Contents 1. Choosing a Database Layer 2. SQLite (Built-in) Parameterized queries Row factory for dicts Context manager When SQLite is enough 3. PostgreSQL `psycopg` (version 3) — current Dict rows `psycopg2` — older, still common Connection pooling `asyncpg` — fast async driver 4. MySQL / MariaDB 5. SQLAlchemy Core Why Core over raw drivers Why Core over the full ORM 6. SQLAlchemy ORM Modern style (SQLAlchemy 2.0+) Eager loading to avoid N+1 Updates and deletes When the ORM hurts you 7. Migrations with Alembic Autogenerate from model changes Manual revision Practical advice 8. Async Database Access Raw asyncpg (faster, lower-level) 9. Pydantic + SQLAlchemy: SQLModel 10. Redis Async Redis Common patterns 11. MongoDB Async When to use MongoDB 12. Connection Pooling, Transactions, Pitfalls Connection pooling is mandatory for servers Transactions N+1 queries Long-lived connections and Postgres Don't store secrets in code Schema-first vs code-first Backups, replicas, failover"
  },
  {
    "language": "python",
    "slug": "11_web",
    "title": "Web Development",
    "url": "/reference/python/11_web.md",
    "keywords": "Table of Contents 1. Choosing a Framework 2. Pydantic — The Data Layer Key features Common patterns 3. FastAPI Hello world Path and query parameters Request bodies Response models Async endpoints Dependency injection Routers (organizing larger apps) Error handling Middleware CORS File uploads WebSockets Background tasks Lifespan events (startup/shutdown) Server 4. Flask Blueprints — organize routes Templates (Jinja2) Flask extensions When Flask still wins 5. Django Models (`blog/models.py`) Admin (`blog/admin.py`) Views and URLs Django REST Framework When Django wins 6. Authentication JWT tokens (most common for APIs) OAuth2 / OIDC Session-based auth (server-stored sessions) API keys Storing passwords 7. Middleware and Cross-Cutting Concerns 8. Background Jobs When background jobs aren't enough 9. Testing Web Apps FastAPI Flask Django 10. Deployment Servers Containers Reverse proxy Platforms Static files & frontends Observability"
  },
  {
    "language": "python",
    "slug": "12_data_and_ml",
    "title": "Data Science & Machine Learning",
    "url": "/reference/python/12_data_and_ml.md",
    "keywords": "Table of Contents 1. The Stack 2. NumPy Properties Indexing and slicing Vectorized math (the whole point) Broadcasting Matrix operations Useful tricks When you outgrow NumPy 3. pandas Read and write Inspect Selecting Adding / transforming columns Missing data Aggregation Reshaping Merging / joining Sort Apply / transform Time series Performance Common pitfalls 4. Polars Why Polars Why still consider pandas 5. Visualization matplotlib — the baseline Subplots Object-oriented vs pyplot style seaborn — statistical viz on matplotlib plotly — interactive Streamlit / Gradio — quick web UIs 6. Jupyter Cell types Magic commands Best practices Alternatives 7. scikit-learn The standard pattern Train/test split Common algorithms Example: classification end-to-end 8. Pipelines and Preprocessing Why pipelines `ColumnTransformer` for mixed types Common preprocessors 9. Model Evaluation Classification metrics Regression metrics Cross-validation Time-series split Common evaluation mistakes 10. Hyperparameter Tuning Grid search Random search (often better than grid) Bayesian optimization (smarter) 11. Gradient Boosting XGBoost LightGBM CatBoost When to use which 12. MLOps Basics Saving and loading models Reproducibility Experiment tracking Feature stores Model serving Model monitoring"
  },
  {
    "language": "python",
    "slug": "13_deep_learning_and_llms",
    "title": "Deep Learning & LLMs",
    "url": "/reference/python/13_deep_learning_and_llms.md",
    "keywords": "Table of Contents 1. The Deep Learning Stack 2. PyTorch — Core Concepts Devices Autograd — automatic differentiation Common tensor operations NumPy vs PyTorch — what's different? 3. Building Neural Networks in PyTorch `nn.Module` — the base class Sequential — for simple stacks Common layers Functional vs module form Loss functions Optimizers Learning rate schedulers 4. Training Loops The canonical PyTorch loop What each piece does Mixed precision (faster on modern GPUs) Gradient clipping (for unstable training) Saving and loading `torch.compile` (PyTorch 2.0+) — JIT for big speedups 5. Datasets and DataLoaders `num_workers` and worker spawn Built-in datasets 6. PyTorch Lightning Hugging Face Accelerate — alternative 7. TensorFlow / Keras Keras Sequential Keras 3 (multi-backend) When to choose TF / Keras 8. Hugging Face Transformers Inference: `pipeline` (easiest) Manual: load model + tokenizer Fine-tuning with `Trainer` PEFT and LoRA for cheap fine-tuning `datasets` library 9. Tokenizers and Embeddings Tokenizers Embeddings — text → vector Choosing an embedding model 10. LLM API Clients OpenAI Anthropic Tool / function calling Structured outputs `instructor` — Pydantic-based for any provider Open-source local models via Ollama 11. Retrieval-Augmented Generation (RAG) Basic flow Minimal RAG from scratch What makes RAG hard in practice Production-quality libraries 12. Vector Databases Chroma (easiest local start) pgvector Pinecone Choosing 13. Agent Frameworks LangChain / LangGraph LlamaIndex agents Smolagents (Hugging Face), CrewAI, AutoGen DSPy — \"programming, not prompting\" Custom agents 14. Deployment and Serving Inference servers for open-source LLMs General PyTorch model serving Model formats Quantization (smaller, faster models) Cost considerations Observability"
  },
  {
    "language": "python",
    "slug": "14_testing_and_quality",
    "title": "Testing & Code Quality",
    "url": "/reference/python/14_testing_and_quality.md",
    "keywords": "Table of Contents 1. Why Testing Matters in Python 2. pytest Basics Simplest test Assertions Testing exceptions Floating-point approximations Project layout Markers 3. Fixtures Fixtures with cleanup (yield-style) Scoped fixtures Shared fixtures: `conftest.py` Built-in fixtures 4. Parametrize Multiple parametrize stacks combine Custom IDs Parametrize fixtures 5. Mocking `unittest.mock` — stdlib `patch` — replace something during the test Important: patch where it's looked up `patch` as context manager `patch.object` Side effects `responses` / `respx` for HTTP mocking `pytest-mock` Mock everything? No. 6. Async Tests 7. Property-Based Testing: Hypothesis Built-in strategies Composing strategies When property tests shine 8. Coverage Configuring Targets 9. Type Checking mypy pyright (used by VS Code's Pylance) Picking strictness Common typing patterns (recap from `04_oop.md`) 10. Linting and Formatting Ruff — replaces flake8, isort, pylint, black, more Black (the previous standard for formatting) isort Pylint bandit — security linting 11. Pre-commit Hooks 12. CI Integration Practical CI tips Test split between unit / integration / e2e"
  },
  {
    "language": "python",
    "slug": "15_advanced",
    "title": "Advanced — Performance, Integration, Pitfalls",
    "url": "/reference/python/15_advanced.md",
    "keywords": "Table of Contents 1. Profiling `timeit` — micro-benchmarks `cProfile` — function-level profiling Line-level profiling Memory profiling tracemalloc — stdlib memory tracing Tracing async / asyncio bottlenecks 2. Optimization Strategies Order of operations (do not skip) Common quick wins NumPy / pandas-shaped problems Caching `__slots__` for memory-tight classes 3. Numba When Numba shines When it doesn't help `@njit(parallel=True)` + `prange` GPU with `@cuda.jit` 4. Cython When to choose Numba vs Cython 5. PyPy and Alternative Interpreters PyPy Free-threaded CPython (3.13+) GraalPy, Pyston, etc. 6. Integration: Calling C/C++/Rust `ctypes` — call C directly, stdlib `cffi` — friendlier than ctypes pybind11 — C++ bindings PyO3 — Rust bindings When to drop to native 7. Subprocess and Cloud SDKs `subprocess` (covered in `07_stdlib.md`) Cloud Python SDKs S3 file-like access with `fsspec` / `s3fs` 8. Security Never trust input SQL injection — always parameterize Shell injection XML / YAML deserialization Path traversal Secrets in code CSRF, XSS, CORS Password storage Dependencies TLS verification Rate-limit at the edge 9. Deployment Recipes Docker base images Layers of optimization Lambda / serverless Cron-style jobs Healthchecks and metrics Zero-downtime deploys 10. Best Practices 11. Common Pitfalls Reference Mutable default arguments Late-binding closures `is` vs `==` Modifying a list while iterating Floating-point equality Off-by-one with `range` `int / int` → `float` (Python 3) Catching too much `dict.keys()` is a view, not a list Iterating dict while modifying Re-raising loses traceback `requests` without timeout Forgetting `await` Logging in libraries Importing too eagerly Circular imports `multiprocessing` on macOS/Windows without the `__main__` guard `time.sleep` in async code Pandas SettingWithCopyWarning Pickle / YAML on untrusted input Forgetting to close file/DB connections Using `pip install` outside a venv Long startup time Heisenbugs in tests from shared state Forgetting `newline=\"\"` when opening for CSV writing `pip freeze > requirements.txt` capturing system packages Race conditions in async code Threads writing the same file Process pool can't pickle local functions Floating-point in money Time zones Off-by-one in pagination Forgetting `index=False` in `to_csv` Random without seed in tests / experiments `__init__.py` not exporting / re-exporting"
  },
  {
    "language": "java",
    "slug": "README",
    "title": "Java — Reference Library",
    "url": "/reference/java/README.md",
    "keywords": "How to navigate this folder What Java is in 2026 Where Java sits vs alternatives Why use Java Why not use Java Versions: which Java to use Vendor / JDK choice Reading order The \"Java way\" of doing things What you won't find here TL;DR: when Java fits"
  },
  {
    "language": "java",
    "slug": "01_setup",
    "title": "Setup",
    "url": "/reference/java/01_setup.md",
    "keywords": "Table of Contents 1. Installing a JDK Recommended: Eclipse Temurin (OpenJDK) Alternative: SDKMAN! (recommended for managing multiple versions) Other JDK distributions 2. Verifying the Install Setting `JAVA_HOME` 3. Choosing a Build Tool Maven Gradle `javac` directly (don't, for real projects) Which to pick Build tool details 4. IDE Setup IntelliJ IDEA — recommended Eclipse VS Code with Java extensions NetBeans My recommendation 5. Project Structure Package naming 6. Hello World With `javac` (no build tool) Single-file execution (Java 11+) With Maven With Gradle With Spring Boot (via Spring Initializr) 7. Running and Packaging Running compiled code Classpath JARs Executable JAR (with `java -jar`) Fat (uber) JAR Running tests 8. Managing Multiple JDK Versions SDKMAN! jenv IDE-managed Why multiple versions matter"
  },
  {
    "language": "java",
    "slug": "02_language_basics",
    "title": "Language Basics",
    "url": "/reference/java/02_language_basics.md",
    "keywords": "Table of Contents 1. Source File Anatomy Static imports 2. Primitives Underscores in numeric literals Wrapper types (auto-boxing) Type promotion Overflow `BigInteger` and `BigDecimal` 3. Variables and `var` `var` — local-variable type inference (Java 10+) Constants — `final` Scope 4. Operators Arithmetic Comparison Logical Assignment + compound Ternary String concatenation with `+` 5. Strings Strings are immutable `StringBuilder` for building strings in loops Text blocks (Java 15+) String formatting Comparing strings `String.intern` and pool 6. Control Flow `if` / `else` Ternary 7. Switch — Statements vs Expressions Switch expressions (Java 14+) Pattern matching in switch (Java 21+) When to use switch 8. Loops `while` `do ... while` Classic `for` Enhanced `for` (for-each) `break` and `continue` Labeled break / continue Streams as a loop alternative 9. Arrays Multi-dimensional Arrays vs `List` `Arrays` utility class 10. Methods Calling Method overloading Varargs Parameter passing `return` 11. Comments and Javadoc Comments Javadoc What deserves Javadoc"
  },
  {
    "language": "java",
    "slug": "03_data_structures",
    "title": "Data Structures",
    "url": "/reference/java/03_data_structures.md",
    "keywords": "Table of Contents 1. The Collections Framework Generic typing Interface vs concrete type 2. List `ArrayList` — the default `LinkedList` — almost never the right choice `List.of()` — immutable list (Java 9+) Conversion Sorting 3. Set `HashSet` — the default `LinkedHashSet` — insertion order `TreeSet` — sorted order `Set.of()` — immutable Set operations `EnumSet` — specialized, fast 4. Map `HashMap` — the default Useful methods (Java 8+) `LinkedHashMap` — insertion order `TreeMap` — sorted by key `Map.of()` and `Map.entry()` — immutable maps `EnumMap` — specialized for enum keys `ConcurrentHashMap` — thread-safe 5. Queue and Deque `Queue` — FIFO `Deque` — double-ended queue (also stack) `PriorityQueue` — min-heap Concurrent queues 6. Iterating Collections Enhanced for `forEach` with lambda Iterator (manual) `ListIterator` — for `List` only, bidirectional Streams (file 06) 7. Immutable Collections `List.of`, `Set.of`, `Map.of` (Java 9+) `Collections.unmodifiableList(list)` etc. Stream to immutable Why prefer immutable 8. Choosing the Right Collection When you want sequence (order, can duplicate) When you want uniqueness When you want key → value When you want FIFO When you want LIFO (stack) When you want priority Performance summary 9. Common Operations and Patterns Convert array to list Group by Count by Sum / aggregate Find one Frequency count Index by key Top K Partition 10. Common Pitfalls Modifying during iteration `Arrays.asList` returns fixed-size list Auto-boxing performance `HashMap` and bad `hashCode` Mutable keys in HashMap `null` in collections `==` vs `.equals()` for elements Copying via constructor `subList` is a view TreeMap with mutable keys Memory of `ArrayList`"
  },
  {
    "language": "java",
    "slug": "04_oop",
    "title": "Object-Oriented Programming",
    "url": "/reference/java/04_oop.md",
    "keywords": "Table of Contents 1. Classes Class layout (typical convention) `final` classes 2. Fields, Methods, Constructors Fields Constructors Methods `this` `static` Method overloading 3. Access Modifiers and Encapsulation Encapsulation conventions `final` fields → no setters 4. Inheritance Single inheritance `super` When to use inheritance When NOT to use inheritance `final` on methods 5. Polymorphism and `@Override` `@Override` `instanceof` and pattern matching (Java 16+) 6. Abstract Classes Abstract vs interface 7. Interfaces Multiple interfaces Default methods (Java 8+) Static methods on interfaces Private methods (Java 9+) Functional interfaces — `@FunctionalInterface` When to use interfaces Interface vs class — modern guidance 8. Records Custom validation in canonical constructor Additional methods Custom accessors Static factory methods Records implementing interfaces When to use records When not to 9. Sealed Types Pattern matching with sealed types `sealed`, `non-sealed`, `final` When to use 10. Enums Enum with fields and methods Enums with abstract methods (rare) Switch on enum `EnumSet`, `EnumMap` When to use enums 11. Nested Classes Static nested class Inner class (non-static nested) Local class Anonymous class 12. `equals`, `hashCode`, `toString` `equals` and `hashCode` Rules `Objects` utility class `toString` When to override"
  },
  {
    "language": "java",
    "slug": "05_generics",
    "title": "Generics",
    "url": "/reference/java/05_generics.md",
    "keywords": "Table of Contents 1. Why Generics 2. Generic Classes Multiple type parameters Diamond operator Naming convention 3. Generic Methods Explicit type arguments (rarely needed) Generic constructors 4. Bounded Type Parameters Upper bound: `extends` Multiple bounds Bounded class types Self-bounded types 5. Wildcards Unbounded: `?` Upper bound: `? extends T` Lower bound: `? super T` When to use wildcards over type parameters 6. PECS Java's own Stream.collect Practical heuristic 7. Type Erasure Can't use `instanceof` with type arguments Can't create generic arrays directly Can't throw or catch generic types directly Method signatures collide if they erase to the same thing Reflection limits `Class<T>` token Reified generics (Java doesn't have them) 8. Common Patterns Generic factory Generic with multiple params Generic builder Generic Result type Generic functional interfaces Generic methods on existing types Returning generics 9. Pitfalls Raw types (legacy, avoid) `Object` vs `?` Generic-class invariance Heap pollution `@SuppressWarnings(\"unchecked\")` — use sparingly Confusion: `extends` in generics vs class inheritance `super` interfaces aren't a thing Comparable<T> recursion Bounded wildcards can't be set Generic types in throws Comparing generic objects Casts and type erasure Java vs Kotlin/Scala"
  },
  {
    "language": "java",
    "slug": "06_streams_and_lambdas",
    "title": "Streams & Lambdas",
    "url": "/reference/java/06_streams_and_lambdas.md",
    "keywords": "Table of Contents 1. Functional Interfaces Composition 2. Lambdas Syntax forms Capturing variables Mutating captured collections `this` in lambdas 3. Method References Four kinds When to use 4. Streams — Overview Lazy evaluation One-shot Common sources Common terminal operations 5. Common Stream Operations filter map flatMap sorted distinct limit / skip peek (for debugging) takeWhile / dropWhile (Java 9+) count / sum / max / min anyMatch / allMatch / noneMatch findFirst / findAny reduce 6. Collectors `toList()` and `toSet()` `toMap` `groupingBy` `partitioningBy` `joining` `summarizingInt`, `summarizingDouble`, etc. `reducing` `teeing` (Java 12+) Custom collectors 7. Primitive Streams 8. Optional Creating Streaming `Optional.flatMap` for chains When NOT to use Optional Where to use 9. Parallel Streams When parallel helps When parallel hurts Caveats 10. When NOT to Use Streams When loops are clearer When you need early exit with complex state Heavy debugging When you need indices When you need to mutate the source 11. Common Patterns Filter + map + collect Group + count Find max by property Top N Index by ID Flatten nested Conditional transformation Chained Optional Reading file lines Generate then process Composing predicates Building a CSV from a stream Counting occurrences"
  },
  {
    "language": "java",
    "slug": "07_errors_and_exceptions",
    "title": "Errors & Exceptions",
    "url": "/reference/java/07_errors_and_exceptions.md",
    "keywords": "Table of Contents 1. Exception Hierarchy 2. Checked vs Unchecked Checked exceptions Unchecked exceptions The debate When to throw checked When to throw unchecked Best practice in 2026 3. try / catch / finally Multi-catch `finally` `finally` and return Catching `Exception` / `Throwable` 4. try-with-resources Multiple resources With catch and finally Effectively final resources (Java 9+) When `AutoCloseable` isn't implemented 5. Throwing Exceptions Wrapping `Throwable.initCause` (legacy) `addSuppressed` 6. Custom Exceptions Naming Inheritance for hierarchies Include context Don't make every error a custom exception 7. Multi-catch and Rethrow Multi-catch (Java 7+) Precise rethrow (Java 7+) Catch and rethrow as unchecked Sneaky throw (don't) Lombok's `@SneakyThrows` 8. Best Practices Catch only what you can handle Always include context Log AND rethrow, or log and handle. Not both. Don't catch `NullPointerException` Don't return null on error Don't use exceptions for control flow Custom exceptions for domain meaning `assert` for invariants (Java assertions) 9. Common Patterns Retry with backoff Default on error Translate exceptions at boundaries Cleanup with try-with-resources Wrapping checked exceptions for streams Resource cleanup with exception Exception-friendly Optional 10. Common Pitfalls Swallowing exceptions Catching too broadly Losing the cause `finally` returning Throwing in finally Catching `InterruptedException` and ignoring `NullPointerException` everywhere Generic type with throws `printStackTrace()` in production Ignoring `Closeable` resources `Exception` in API signatures Logging then rethrowing Custom exceptions that lose information Returning from `try` with side effects in `finally`"
  },
  {
    "language": "java",
    "slug": "08_concurrency",
    "title": "Concurrency",
    "url": "/reference/java/08_concurrency.md",
    "keywords": "Table of Contents 1. Threads — the Basics Naming threads Daemon threads Interrupting Don't use raw Threads in production 2. ExecutorService Submitting tasks Common executor types `invokeAll` and `invokeAny` `ScheduledExecutorService` Shutdown hooks 3. Virtual Threads (Java 21+) Why this matters Practical use Spring Boot 3.2+ supports virtual threads When NOT to use virtual threads Carrier threads What changes for you 4. Structured Concurrency (Preview) 5. CompletableFuture Common operations Custom executor When CompletableFuture vs virtual threads 6. Synchronization `synchronized` keyword Synchronized block `wait` / `notify` / `notifyAll` `volatile` `synchronized` in 2026 7. Locks ReentrantLock `tryLock` ReadWriteLock StampedLock Conditions Semaphore CountDownLatch CyclicBarrier 8. Atomics When to use `LongAdder` / `LongAccumulator` 9. Concurrent Collections `ConcurrentHashMap` `CopyOnWriteArrayList` `CopyOnWriteArraySet` `ConcurrentSkipListMap` / `ConcurrentSkipListSet` `Collections.synchronizedList(list)` etc. 10. BlockingQueue Implementations Producer-consumer skeleton 11. Common Patterns and Pitfalls Race condition Deadlock Forgetting `finally` for unlock `ConcurrentModificationException` (not concurrency!) Visibility issues Thread leaks Catching `InterruptedException` and continuing ThreadLocal pitfalls Synchronizing on wrong object Don't synchronize on `String` literals Lambda doesn't auto-`synchronized` Reading `volatile` doesn't make compound ops atomic `synchronized` on virtual threads (Java 21-23) Don't use `Vector`, `Hashtable`, `Stack` `Future.get()` without timeout Don't share `Random` across threads Don't block on the same executor that's running you"
  },
  {
    "language": "java",
    "slug": "09_io_and_networking",
    "title": "I/O and Networking",
    "url": "/reference/java/09_io_and_networking.md",
    "keywords": "Table of Contents 1. Reading and Writing Files Reading a whole file Writing Streaming large files Character encoding 2. Paths and Filesystem Operations Existence checks Metadata Operations Directory listing File watching Temp files and dirs 3. Streams (I/O streams, not java.util.stream) Hierarchy Common implementations Buffered for performance `Files.newBufferedReader` / `newBufferedWriter` Copying between streams Closing 4. Reading Text Standard input 5. Reading Binary `DataInputStream` / `DataOutputStream` `ByteBuffer` (NIO) 6. Java HTTP Client (Java 11+) POST with JSON Async Body handlers Body publishers Headers and methods HTTP/2 Authentication Cookies When to use other libraries 7. Sockets TCP client TCP server UDP NIO sockets (advanced) 8. JSON Serialization (Jackson) Basic usage Pretty printing Reading and writing files Lists and maps Common modules Customizing serialization `ObjectMapper` is thread-safe Streaming Jackson Alternatives 9. Java Serialization (Avoid) Why avoid What to use instead 10. Common Patterns Read config from file Process CSV Download a file Upload a file Multipart upload (manual) Retry HTTP request Iterate over filesystem Watch a file for changes Lock a file Get the user's home directory Get the working directory Resolve a classpath resource Get environment variables"
  },
  {
    "language": "java",
    "slug": "10_databases",
    "title": "Databases",
    "url": "/reference/java/10_databases.md",
    "keywords": "Table of Contents 1. Choosing a Data Access Layer 2. JDBC — the Foundation Drivers `PreparedStatement` (always) Inserting and updating Batch inserts ResultSet When raw JDBC is right `JdbcTemplate` (Spring) 3. Connection Pooling (HikariCP) Why pool HikariCP — the default Spring Boot configuration Sizing the pool 4. JPA / Hibernate Entity `persistence.xml` or Spring Boot config Using `EntityManager` (raw JPA) JPQL — Java Persistence Query Language Native queries Relationships Fetch types N+1 problem Persistence lifecycle Dirty checking When ORMs hurt 5. Spring Data JPA Method name conventions Using a repository Custom logic in a repository Projections — return DTOs not entities 6. jOOQ — Type-Safe SQL Why jOOQ When jOOQ wins When JPA wins Code generation 7. Transactions Spring's `@Transactional` Propagation Isolation Rollback rules Programmatic transactions Critical: `@Transactional` only works through Spring proxies Long transactions are bad Avoid network calls in transactions Read-only transactions 8. Migrations (Flyway / Liquibase) Flyway Liquibase Migration discipline Don't auto-generate schema from entities (`spring.jpa.hibernate.ddl-auto=update`) 9. Common Patterns Pagination Bulk insert Optimistic locking Pessimistic locking Soft delete Audit fields DTO mapping with MapStruct Testcontainers for integration tests 10. Pitfalls Lazy loading outside a transaction Returning entities from controllers `@Transactional` on private methods `@Transactional` self-invocation N+1 queries `equals`/`hashCode` on entities `findAll()` on big tables Hibernate's \"first level cache\" surprises Forgetting `@Transactional` Open Session in View Caching pitfalls Connection leaks Big transactions `EAGER` everywhere Native queries returning entities Ignoring DB migrations Comparing dates / times"
  },
  {
    "language": "java",
    "slug": "11_spring_boot",
    "title": "Spring Boot",
    "url": "/reference/java/11_spring_boot.md",
    "keywords": "Table of Contents 1. What Spring Boot Is What you get 2. Starting a Project Spring Initializr — [start.spring.io](https://start.spring.io) CLI Project structure Main class Running 3. Dependency Injection Stereotypes Constructor injection (preferred) Why constructor injection Field injection (avoid) Setter injection (rare) Bean creation via `@Bean` methods Bean scopes Multiple beans of the same type Conditional beans Lifecycle hooks 4. REST Controllers Basic controller Request parameters Pageable `ResponseEntity` for full control Content negotiation File upload Streaming responses Spring MVC vs WebFlux 5. Validation Annotations on request bodies Common constraints (Jakarta Bean Validation) Validation groups Custom constraint Validating method parameters 6. Exception Handling Per-controller `@ExceptionHandler` Global `@RestControllerAdvice` `ProblemDetail` (RFC 7807) Enable for built-in exceptions 7. Configuration `application.yml` Reading config Type-safe config with `@ConfigurationProperties` Environment variables `@ConditionalOn*` annotations 8. Profiles 9. Spring Data Beyond JPA 10. Spring Security Modern config (Spring Security 6+) JWT authentication Method-level security Common patterns 11. Actuator and Observability Configuration Custom health indicator Metrics with Micrometer Tracing 12. Testing Unit tests — just JUnit + Mockito Integration tests — `@SpringBootTest` Slice tests — load only what's needed `@DataJpaTest` with Testcontainers Test profiles"
  },
  {
    "language": "java",
    "slug": "12_testing",
    "title": "Testing",
    "url": "/reference/java/12_testing.md",
    "keywords": "Table of Contents 1. The Testing Stack 2. JUnit 5 Basics Annotations Methods don't need to be public Display names Nested tests 3. AssertJ — Fluent Assertions Why AssertJ over JUnit's built-in 4. Mockito — Mocking Stubbing Argument matchers Verifying interactions Spy — partial mock `@MockBean` / `@SpyBean` (Spring Boot) Limitations and gotchas Alternatives 5. Parameterized Tests CSV source CSV file Method source Enum source 6. Lifecycle and Setup Test instance lifecycle `@TempDir` 7. Spring Boot Testing `@SpringBootTest` — full context `@SpringBootTest` with random port `@WebMvcTest` — controller slice `MockMvc` — testing controllers `@DataJpaTest` — JPA slice `@JsonTest` `@TestConfiguration` Choosing the right slice 8. Testcontainers With Spring Boot Reusing containers Available containers Performance 9. Test Organization Naming Maven Failsafe vs Surefire Tags Folder structure Build tool config 10. Best Practices and Pitfalls Test names describe behavior Arrange / Act / Assert One logical assertion per test Test data builders / fixtures Don't share state between tests Don't test private methods directly Don't mock value objects / DTOs Verify what matters, not everything Don't sleep in tests Watch for flaky tests `@DirtiesContext` is a code smell Forgetting `@Transactional` in integration tests Forgetting to start containers Don't mix unit and integration tests in the same class Slow test suites Code coverage Don't test framework code Don't have a \"test\" profile that masks bugs Integration test the boundary"
  },
  {
    "language": "java",
    "slug": "13_build_tools",
    "title": "Build Tools",
    "url": "/reference/java/13_build_tools.md",
    "keywords": "Table of Contents 1. Maven vs Gradle 2. Maven Basics `pom.xml` — the project descriptor Coordinates Build lifecycle phases Common commands The Maven wrapper (`./mvnw`) Local repository Settings 3. Maven Dependencies Adding a dependency Scopes Transitive dependencies Excluding transitive dependencies Dependency management Spring Boot's parent POM Version ranges (avoid) Dependency conflicts 4. Maven Plugins Maven Compiler Plugin Surefire (unit tests) and Failsafe (integration tests) Spring Boot Maven Plugin Shade Plugin (uber JAR for non-Spring) Versions Plugin Enforcer Plugin JaCoCo (code coverage) 5. Multi-Module Maven Projects Parent POM Child module POM Inter-module dependency Building When to split into modules 6. Gradle Basics `build.gradle.kts` (Kotlin DSL) `settings.gradle.kts` Common commands Gradle wrapper (`./gradlew`) Configurations (dependency scopes) `implementation` vs `api` Repositories 7. Gradle Dependencies Version catalogs (recommended) BOMs Exclude transitive dep Resolution strategy 8. Multi-Module Gradle Projects Project layout Shared config via convention plugins Inter-module dependency Building Composite builds 9. Dependency Management Best Practices Pin versions Use BOMs Update regularly Audit deps Pin transitive deps you care about Minimize dependencies Common mistakes Internal artifact repos 10. Common Tasks Add a new dependency Update a dependency Add a plugin Build an executable JAR Find dependency conflicts Skip tests Increase memory Faster Gradle builds Releasing a library Native compilation (GraalVM) Docker builds CI/CD basics"
  },
  {
    "language": "java",
    "slug": "14_jvm_and_performance",
    "title": "JVM & Performance",
    "url": "/reference/java/14_jvm_and_performance.md",
    "keywords": "Table of Contents 1. JVM Architecture HotSpot — the standard JVM 2. Memory Areas Heap Stack (per thread) Metaspace Code cache Direct memory Sizing the heap Container awareness 3. Garbage Collection Generational GC GC algorithms in 2026 Choosing GC logging GC tuning is rarely the answer `-XX:+HeapDumpOnOutOfMemoryError` 4. JIT Compilation Tiered compilation Hot methods Warmup Inlining What this means for code Inspecting JIT decisions 5. Profiling Tools Built-in `jcmd` — JVM commands `jps` — list Java processes `jstack` — thread dumps `jstat` — JVM statistics Async-profiler VisualVM Commercial profilers APM tools (production) 6. Common Performance Issues Excessive object allocation Boxing / unboxing Logging overhead N+1 database queries Synchronization contention Blocking I/O on critical threads Reflection in hot paths Regex compilation `String.split` with regex Inefficient collection iteration Memory leaks Class loading issues 7. GraalVM and Native Image Native Image Building a native image When native image makes sense When traditional JVM is better Spring AOT Quarkus and Micronaut Reality in 2026 8. Tuning Tips Defaults are good Common useful flags Heap dump on OOM Container memory Don't disable JIT for testing Pre-loading hot paths Class data sharing (CDS) App CDS / AOT (Java 21+) Logging-level filter 9. Benchmarking with JMH Common JMH mistakes (which JMH helps avoid) When to benchmark 10. What to Care About in Practice 1. Don't waste time prematurely optimizing 2. Focus on the right level 3. Measure with realistic data 4. Watch the JVM at runtime 5. Set up production observability 6. Don't worry about 7. When you do hit a perf wall"
  },
  {
    "language": "java",
    "slug": "15_modern_features_and_advanced",
    "title": "Modern Features & Advanced",
    "url": "/reference/java/15_modern_features_and_advanced.md",
    "keywords": "Table of Contents 1. Pattern Matching Pattern matching for `instanceof` (Java 16+) Negation Pattern matching for switch (Java 21+) Record patterns (Java 21+) Guards in switch Null handling in switch Combining type and null When pattern matching shines 2. Records — Beyond the Basics Compact constructor — validation / normalization Static factories Methods on records Records implementing interfaces Generic records Records as DTOs Wither pattern Records vs classes Limitations Records and serialization 3. Sealed Types Deep Dive Permitted types must be in the same module / package by default Exhaustive switch Modeling state machines When sealed types win Combined with pattern matching 4. Virtual Threads (Project Loom) The model shift When to use When traditional threads are still right Pinning Library compatibility `Thread.ofVirtual()` factory 5. Structured Concurrency Variants Compared to CompletableFuture When to use 6. Scoped Values Reading Advantages over ThreadLocal When ThreadLocal is still needed 7. The `java.time` API Core types Common operations Formatting and parsing What to use when Don't use JPA / database Time zone pitfalls Jackson + java.time 8. Optional Patterns Chaining `ifPresentOrElse` `or` for fallback `Optional.stream` (Java 9+) Don't `orElseThrow` 9. Reflection and `MethodHandles` Reflection Use cases Don't use in application code `MethodHandles` (Java 7+) 10. Modules (JPMS) `module-info.java` Adoption When modules help When modules hurt 11. Common Pitfalls Reference `==` for object equality `equals` without `hashCode` Comparing `Integer` with `==` Mutable default parameters Returning mutable internal state `null` propagation Catching too broadly Resource leaks Forgetting `@Override` Mutating in lambda captured collections `forEach` on a Stream after a chain Modifying collection during iteration Boxing/unboxing in hot loops String concatenation in loops Comparing strings with `==` Floating-point comparison `BigDecimal` from double `Math.abs(Integer.MIN_VALUE)` Integer overflow Division by zero `null` keys in `HashMap` are allowed `entrySet().forEach` boxing Synchronized on `String` literal Catching `InterruptedException` and ignoring Static fields and class loading Inner classes capturing outer Anonymous classes capturing outer Forgetting `@Transactional` on a Spring service method Self-invocation breaking `@Transactional` `e.printStackTrace()` Java logging confusion Hardcoded paths Time zone in production File encoding Hashing passwords wi"
  },
  {
    "language": "cpp",
    "slug": "README",
    "title": "C++ — Reference Library",
    "url": "/reference/cpp/README.md",
    "keywords": "How to navigate this folder What C++ is in 2026 Where C++ sits vs alternatives Why use C++ Why not use C++ C++ standard versions Compiler support Reading order The \"modern C++\" way What you won't find here TL;DR: when C++ fits"
  },
  {
    "language": "cpp",
    "slug": "01_setup",
    "title": "Setup",
    "url": "/reference/cpp/01_setup.md",
    "keywords": "Table of Contents 1. Choosing a Compiler 2. Installing a Compiler macOS — Clang via Xcode Linux — GCC Linux — Clang Windows — MSVC via Visual Studio Verify 3. Build Systems 4. CMake — the De Facto Standard Minimal `CMakeLists.txt` Building Multi-config (Debug/Release) Multiple source files Libraries Modern target-based CMake Finding libraries Subdirectories Installing CMake Presets 5. Package Managers vcpkg (Microsoft) Conan Header-only / submodules My recommendation 6. IDE Setup Visual Studio (Windows) CLion (cross-platform) VS Code Vim/Neovim/Emacs Visual Studio (in 2026) CLion VS Code 7. Project Structure Header / source split Templates and inline functions Modules (C++20) `#include` style `#pragma once` 8. Hello World Single-file With CMake With std::format (C++20) and std::print (C++23) 9. Compiler Flags You Should Care About Warnings Optimization Debug info Standard Sanitizers (development!) Linker Position-independent code Visibility Link-time optimization (LTO) Common bundles"
  },
  {
    "language": "cpp",
    "slug": "02_language_basics",
    "title": "Language Basics",
    "url": "/reference/cpp/02_language_basics.md",
    "keywords": "Table of Contents 1. Source File Anatomy `using` declarations 2. Primitives Literals Boolean Character types Auto-promotion rules Overflow 3. Variables and Initialization Always initialize `const` `constexpr` `static` (at file scope) Scope 4. `auto` and Type Inference When `auto` shines When to skip `auto` `auto&` and `const auto&` Structured bindings (C++17+) `decltype` 5. Operators Arithmetic Comparison Logical Bitwise Assignment + compound Ternary Comma `sizeof` `nullptr` 6. Strings `std::string` `std::string_view` (C++17+) Concatenation `std::format` (C++20) Raw string literals `const char*` (C-strings) `std::string` performance 7. Control Flow `if` / `else` `if` with initializer (C++17+) `if constexpr` (C++17+) `switch` Limitations of switch 8. Loops Range-for (C++11+) Classic `for` `while` `do ... while` `break` and `continue` Labeled break / continue Algorithm calls vs loops 9. Arrays and Containers C-style arrays `std::array<T, N>` (C++11+) `std::vector<T>` Strings as character sequences 10. Functions Calling Function declaration vs definition Overloading Default arguments Pass by value vs reference Return values Trailing return type Lambdas `[[nodiscard]]` 11. References vs Pointers (Preview) Reference (`T&`) Pointer (`T*`) When to use which 12. Namespaces `using` declarations `namespace` aliases Anonymous namespaces Don't pollute global scope 13. Comments Doxygen-style comments When to comment"
  },
  {
    "language": "cpp",
    "slug": "03_pointers_and_memory",
    "title": "Pointers, References & Memory",
    "url": "/reference/cpp/03_pointers_and_memory.md",
    "keywords": "Table of Contents 1. Memory Model — Stack and Heap Stack Heap (free store) Other regions 2. Raw Pointers Operators Pointer arithmetic `nullptr` Const correctness When to use raw pointers `T*` vs `T&` 3. References Must be initialized Can't be null `const T&` — the workhorse parameter type Lvalue vs rvalue references Don't return references to locals Don't capture references in async contexts 4. `new` and `delete` (Don't Use) Why \"don't use\" `new` is also slower 5. RAII Why RAII matters 6. `std::unique_ptr` `make_unique` vs raw `new` Move-only Functions taking `unique_ptr` Returning `unique_ptr` `unique_ptr` with arrays Custom deleters `unique_ptr` semantics summary 7. `std::shared_ptr` `make_shared` vs `new` When to use Overhead Thread safety Cycles `shared_ptr<T>` to `this` 8. `std::weak_ptr` Use cases `weak_ptr` doesn't dereference directly 9. Ownership Patterns Single owner, transfer of ownership Single owner, multiple observers Shared ownership Borrow (function parameter) Sink (function takes ownership) Producer (function gives ownership) Decision tree: which to use Don't store `shared_ptr` everywhere \"for safety\" 10. Common Memory Bugs Dangling pointer Use-after-free Double free Memory leak `delete` vs `delete[]` Slicing Stack overflow Iterator invalidation Reading uninitialized memory Returning reference to temporary Capturing by reference in lambda outliving the scope Detection tools"
  },
  {
    "language": "cpp",
    "slug": "04_classes_and_oop",
    "title": "Classes & OOP",
    "url": "/reference/cpp/04_classes_and_oop.md",
    "keywords": "Table of Contents 1. Class Basics Conventions Access modifiers Member initializer list `const` methods In-class member initialization (C++11+) Default member initialization + constructor 2. Constructors Default constructor Parameterized constructors `explicit` Delegating constructors `= default` and `= delete` Initializer list constructor Most vexing parse 3. Destructors Implicit destructor Virtual destructor When NOT to provide a destructor 4. Copy and Move Copy Move (C++11+) `std::move` When move helps `noexcept` on move 5. Rule of 0 / Rule of 3 / Rule of 5 Rule of 0 Rule of 3 (old style) Rule of 5 (C++11+) In practice 6. Inheritance `public`, `protected`, `private` inheritance Single inheritance Constructor chaining `final` (C++11+) When to use inheritance When NOT to 7. Virtual Functions and Polymorphism `virtual` for dynamic dispatch Always use `override` Virtual destructor `vtable` Calling base implementation Pure virtual: abstract method 8. Pure Virtual and Abstract Classes \"Interface\" pattern Interface with default implementations Abstract base with shared implementation 9. Composition vs Inheritance When inheritance fits When composition fits Strategy via composition 10. `struct` vs `class` 11. Common Patterns Pimpl (Pointer to Implementation) Factory Singleton (rare — usually a smell) CRTP (Curiously Recurring Template Pattern) Observer RAII wrapper for C resource Builder"
  },
  {
    "language": "cpp",
    "slug": "05_templates_and_generics",
    "title": "Templates and Generics",
    "url": "/reference/cpp/05_templates_and_generics.md",
    "keywords": "Table of Contents 1. Why Templates Templates vs Java generics 2. Function Templates Explicit type Multiple type parameters Trailing return type Non-type template parameters Template parameter packs (variadic) — see section 5. 3. Class Templates Defining methods outside the class Templates must be visible at use sites Class template argument deduction (CTAD, C++17) 4. Concepts (C++20) — Constraining Templates Built-in concepts (`<concepts>`) Defining a concept `requires` expressions Constraining in different syntaxes Why concepts matter 5. Variadic Templates Fold expressions (C++17) Printing Recursive variadic templates (pre-C++17 style, still seen) Forwarding Use cases `if constexpr` (C++17) 6. Template Specialization Full specialization Partial specialization (classes only) When to specialize 7. Type Traits Checking types Modifying types Using in templates In `if constexpr` 8. `auto` and Type Deduction `auto` in loops `decltype` Type deduction rules Universal references / forwarding references 9. Compile Errors and Sanity Read the first error Use concepts (C++20) Use `static_assert` for friendly errors Compiler flags Don't go template-crazy Smaller template instantiations 10. Practical Patterns Type-safe container of \"any\" type Optional value Tuple Generic algorithm Factory with perfect forwarding Compile-time conditional code with `if constexpr` CRTP (Curiously Recurring Template Pattern) Tag dispatch (older pattern) SFINAE — \"Substitution Failure Is Not An Error\""
  },
  {
    "language": "cpp",
    "slug": "06_stl_containers",
    "title": "STL Containers",
    "url": "/reference/cpp/06_stl_containers.md",
    "keywords": "Table of Contents 1. Container Overview 2. `std::vector` — the Default Access Iteration Modifying Capacity vs size Removing elements (erase-remove idiom) Memory layout Vector of vectors Common mistakes 3. `std::string` and `std::string_view` Construction Concatenation Number conversion `std::string_view` (C++17) When to use `string_view` When NOT to use `string_view` C strings vs std::string 4. `std::array` — Fixed-Size Why `std::array` over C arrays When to use 5. `std::span` (C++20) Subspans Fixed vs dynamic extent When to use 6. `std::deque` When over vector When vector wins `std::queue` and `std::stack` `std::priority_queue` 7. `std::list` and `std::forward_list` When (almost never) Why almost never 8. `std::map` and `std::set` — Ordered `std::map<K, V>` `[]` creates entries `std::set<T>` Custom comparison Multimap and multiset When to use map/set 9. `std::unordered_map` and `std::unordered_set` — Hash-Based Custom hash Performance Reserving When map vs unordered_map 10. `std::pair` and `std::tuple` Pair Tuple Returning multiple values 11. Choosing a Container \"I need a sequence\" \"I need a key-value lookup\" \"I need a set\" \"I need a stack / queue\" \"I need a heap / priority queue\" \"I need a fixed-size buffer\" \"I need a view of someone else's data\" Container choice heuristics Memory locality Containers I haven't covered"
  },
  {
    "language": "cpp",
    "slug": "07_stl_algorithms_and_ranges",
    "title": "STL Algorithms and Ranges",
    "url": "/reference/cpp/07_stl_algorithms_and_ranges.md",
    "keywords": "Table of Contents 1. The Algorithm Header 2. Lambdas Syntax Captures Mutable Capture initializers (C++14) Generic lambdas (C++14) Storing lambdas Lambdas vs function objects 3. Iterators Categories Common operations `begin` / `end` for arrays Inserter iterators Don't confuse iterators with indices Iterator invalidation 4. Core Algorithms `for_each` `transform` `copy` `fill` / `fill_n` / `generate` 5. Searching and Counting `find` / `find_if` `count` / `count_if` `all_of` / `any_of` / `none_of` `min_element` / `max_element` `binary_search` (on sorted ranges) 6. Modifying Algorithms `reverse` `rotate` `remove` / `remove_if` (and the erase-remove idiom) `unique` `replace` / `replace_if` `shuffle` `swap` 7. Sorting `sort` `stable_sort` `partial_sort` `nth_element` `is_sorted` 8. Numeric Algorithms `accumulate` `reduce` (C++17) `inner_product` `partial_sum` `iota` 9. C++20 Ranges Views — lazy, composable transformations Common views Examples Lazy vs materialized Why this matters 10. Common Patterns Sum a vector Average Max element Sort by field Top N Dedupe (preserving order — like Python's seen-set) Dedupe (ignoring order) Filter into new container Group by Zip two ranges Enumerate Pipe to a function Parallel algorithms (C++17) Don't reinvent"
  },
  {
    "language": "cpp",
    "slug": "08_errors_and_exceptions",
    "title": "Errors and Exceptions",
    "url": "/reference/cpp/08_errors_and_exceptions.md",
    "keywords": "Table of Contents 1. The Options 2. Exceptions What's different from Java/C# When to use exceptions When NOT to use exceptions 3. Throwing and Catching Throwing Custom exception Catching Catch order Rethrowing Wrapping Stack unwinding Exceptions in destructors Exception safety guarantees 4. Standard Exception Types When to throw what `.what()` 5. `noexcept` Effect When to mark `noexcept` Conditional noexcept Checking 6. Error Codes `std::error_code` (C++11) Why error codes Why not 7. `std::optional`, `std::expected` `std::optional<T>` (C++17) `std::expected<T, E>` (C++23) Composing When to use `std::expected` Pre-C++23 alternatives 8. Assertions `assert` When to assert When NOT to assert `static_assert` Contract-based programming 9. `std::terminate` and `std::abort` `std::abort` 10. Choosing a Strategy Modern C++ (broadly) Game dev, embedded, real-time Server / business apps Library design Common pitfalls"
  },
  {
    "language": "cpp",
    "slug": "09_concurrency",
    "title": "Concurrency",
    "url": "/reference/cpp/09_concurrency.md",
    "keywords": "Table of Contents 1. Threading Basics Joining and detaching Thread with a lambda Thread IDs Hardware concurrency 2. `std::jthread` (C++20) `std::stop_token` — cooperative cancellation Why `jthread` over `thread` 3. `std::async` and Futures Launch policies `std::future` methods Exceptions through futures `std::promise` and `std::packaged_task` Limitations of `std::async` 4. Mutexes `std::lock_guard` `std::unique_lock` `std::scoped_lock` (C++17) Mutex types `std::shared_mutex` example Why RAII locks Don't lock around slow operations 5. Condition Variables `wait` semantics `notify_one` vs `notify_all` Hold the mutex when notifying? `std::counting_semaphore` (C++20) `std::latch` and `std::barrier` (C++20) 6. Atomics and Memory Order Atomic operations CAS — Compare-And-Swap Memory order Memory orders Standard advice `std::atomic` for non-trivial types 7. The Memory Model Key rules Synchronization tools `volatile` is NOT for concurrency Reasoning about correctness 8. Thread Pools Simple thread pool sketch Libraries Standard `std::execution` (proposed) 9. Coroutines (C++20) State of coroutines in C++ Use cases Async with coroutines Reality check 10. Pitfalls Data races Deadlocks Forgetting to join Lambda captures with thread `std::async` blocking destructor Mutex-protected std::cout `volatile` for threads `static` initialization Modifying shared collections False sharing Thread-local storage Pinning threads to cores"
  },
  {
    "language": "cpp",
    "slug": "10_io_and_filesystem",
    "title": "I/O and Filesystem",
    "url": "/reference/cpp/10_io_and_filesystem.md",
    "keywords": "Table of Contents 1. Console I/O Stream operators Manipulators Synchronization with C stdio Reading input Checking failure Mixed `>>` and `getline` 2. File I/O Reading a whole file (C++23) `std::fstream` for both Open modes Closing Error checking C++23 alternatives 3. String Streams `std::stringstream` for both directions. 4. Formatted Output with `std::format` (C++20) Format specifiers Examples `std::print` (C++23) Format custom types 5. The Filesystem Library (C++17) Paths Existence and types Metadata Operations Iterating directories Error handling Note on file_time_type 6. Reading and Writing Binary Reading whole file as bytes Byte order `std::byte` (C++17) 7. The \"Why are streams like this\" Aside 8. Networking — the Landscape Options Simple HTTP with cpp-httplib Boost.Asio Networking TS / C++26 9. JSON in C++ nlohmann/json simdjson RapidJSON, yyjson, etc. 10. Common Patterns Read whole file into string Write string to file Line-by-line processing Split a string by delimiter Iterate over directory Recursive find files Get file size Get last modified time Atomic file write Make a temp file"
  },
  {
    "language": "cpp",
    "slug": "11_modern_cpp_features",
    "title": "Modern C++ Features",
    "url": "/reference/cpp/11_modern_cpp_features.md",
    "keywords": "Table of Contents 1. What \"Modern C++\" Means 2. Move Semantics — Recap and Depth The problem Move solves this Rvalue references (`T&&`) Move constructor / move assignment After move When does move happen Rule of 0/3/5 3. Perfect Forwarding Forwarding references (`T&&` in template context) `std::forward` When you need forwarding When you don't 4. `constexpr` and Compile-Time Computation `constexpr` rules `consteval` (C++20) `constinit` (C++20) `if constexpr` `constexpr` containers (C++20+) Use cases 5. Structured Bindings (C++17) With structs With references Why use them 6. `if` / `switch` with Initializer (C++17) C++23 extends this to `if constexpr` and ranges-based `for`. 7. Lambdas — Advanced Generic lambdas (C++14) Template lambdas (C++20) Lambda capture initializer (C++14) Lambda as `constexpr` (C++17) `consteval` lambda (C++20) Recursive lambdas Default constructible (C++20) 8. Modules (C++20) Defining a module Using a module Why modules Adoption (2026) Header units 9. Designated Initializers (C++20) 10. Spaceship Operator (C++20) Result types Custom Why 11. Smaller Touches That Add Up `auto` return types Template type deduction for class templates (C++17) `[[nodiscard]]` `[[deprecated]]` `[[likely]]` / `[[unlikely]]` (C++20) `std::filesystem::path` literals Variable templates (C++14) Type aliases over typedef `enum class` over plain `enum` `nullptr` over `NULL` `override` and `final` `using enum` (C++20) `std::span`, `std::string_view` — already covered in 06. Range-based for with init (C++20) Class template argument deduction guides"
  },
  {
    "language": "cpp",
    "slug": "12_game_engines_and_graphics",
    "title": "Game Engines and Graphics",
    "url": "/reference/cpp/12_game_engines_and_graphics.md",
    "keywords": "Table of Contents 1. Why C++ Owns Game Dev 2. The Major Engines Unreal Engine 5 Unity Godot Custom engines Frameworks (not full engines) 3. Unreal Engine Architecture Hello world Unreal class Unreal's macro system Strings: `FString`, `FName`, `FText` Containers: `TArray`, `TMap`, `TSet` Smart pointers: `TSharedPtr`, `TWeakPtr`, `TObjectPtr` Modules and the build system Learning Unreal 4. Game Loop Fundamentals Variable vs fixed timestep Frame rate Profiling 5. Entity-Component-System (ECS) Traditional OO ECS Benefits ECS libraries EnTT example When ECS, when not 6. Graphics APIs Overview The major APIs Modern vs old APIs Cross-platform abstractions Shading languages 7. OpenGL Basics Setup (with GLFW for windowing + GLAD for loading) Shaders Vertex buffer Drawing Resources for OpenGL 8. Vulkan Basics High-level concepts Why Vulkan Why not Vulkan (for learning) Resources 9. Memory and Performance for Games Pool allocators Arena / linear allocators Object pooling Cache-friendly data layout Avoid virtual calls in hot paths Don't allocate in hot loops SIMD Multi-threading 10. Practical Starting Points Learning path For C++ game dev specifically Recommended books Communities Reality check C++ in non-AAA contexts"
  },
  {
    "language": "cpp",
    "slug": "13_performance_and_optimization",
    "title": "Performance and Optimization",
    "url": "/reference/cpp/13_performance_and_optimization.md",
    "keywords": "Table of Contents The Golden Rule: Measure First Mental Model: What the CPU Actually Does Cache Locality Spatial locality example Array of structures vs structure of arrays Row-major vs column-major Allocations Are Expensive Avoid allocations in hot paths String concatenation Custom allocators and arenas Small Buffer Optimization (SBO) Branch Prediction Predictable branches are free Random branches hurt Sorted data is faster `[[likely]]` and `[[unlikely]]` (C++20) Compiler Optimizations Optimization flags Link-Time Optimization (LTO) Profile-Guided Optimization (PGO) What the compiler can and cannot do Profiling Tools Linux: `perf` macOS: Instruments Windows: Visual Studio Profiler Cross-platform: `gprof`, `callgrind` Flame graphs What to look for Benchmarking with Google Benchmark Install and use Key API Online: quick-bench.com `std::chrono` for ad-hoc timing Common Optimization Patterns Pass by const reference (avoid copies) Move semantics Reserve before pushing `emplace_back` over `push_back` for construction Prefer `std::array` and stack allocation when size is known Avoid `shared_ptr` if `unique_ptr` works Avoid virtual functions in hot loops Compile-time computation with `constexpr` When to Stop Optimizing Rough budget for \"real-time\" requirements Key principles"
  },
  {
    "language": "cpp",
    "slug": "14_testing_and_tooling",
    "title": "Testing and Tooling",
    "url": "/reference/cpp/14_testing_and_tooling.md",
    "keywords": "Table of Contents Why Testing Matters More in C++ Testing Frameworks: GoogleTest Installation Basic test Fixtures Parameterized tests Death tests Matchers (gmock) Build with CMake Testing Frameworks: Catch2 Installation Basic test Why Catch2 over GoogleTest Why GoogleTest over Catch2 Other frameworks Sanitizers: ASan, UBSan, TSan, MSan AddressSanitizer (ASan) UndefinedBehaviorSanitizer (UBSan) ThreadSanitizer (TSan) MemorySanitizer (MSan) Don't combine them carelessly In CMake Suppressions Valgrind Valgrind vs ASan Other Valgrind tools Static Analysis clang-tidy Checks Example findings cppcheck PVS-Studio include-what-you-use (IWYU) Static analysis isn't a substitute for tests Code Formatting: clang-format Setup Usage CI check Convention Linting: clang-tidy Compiler warnings Fuzzing libFuzzer (Clang) AFL / AFL++ When to fuzz CI for C++ Recommended CI matrix GitHub Actions example Caching Coverage Putting it all together Skipping any of these is a tradeoff Key principles"
  },
  {
    "language": "cpp",
    "slug": "15_common_pitfalls_and_idioms",
    "title": "Common Pitfalls and Idioms",
    "url": "/reference/cpp/15_common_pitfalls_and_idioms.md",
    "keywords": "Table of Contents Undefined Behavior Common sources of UB Why it's worse than \"just a crash\" The mitigation A common shock Object Lifetime Bugs Returning a reference to a local Returning a reference to a temporary Dangling references in range-for Dangling captures in lambdas `shared_ptr` cycles Initialization Pitfalls Most vexing parse Uninitialized members Static initialization order fiasco `auto` deduction surprises Copy/Move Pitfalls Forgetting to mark move constructors `noexcept` Self-assignment in move `std::move` on a const Moving out of a member of a function parameter Move-only types in collections Returning `std::move` of a local Pointer and Reference Pitfalls Mixing `new`/`delete` with `new[]`/`delete[]` `unique_ptr` doesn't know array vs single Null deref through method call Pointer to member function syntax Iterator invalidation Modifying a container during iteration Container Pitfalls `std::map::operator[]` creates entries `vector<bool>` is special `unordered_map` with custom types `at()` vs `[]` `front()` / `back()` on empty containers Integer and Arithmetic Pitfalls Signed overflow is UB Integer division truncates Mixing signed and unsigned Implicit narrowing Floating-point equality String Pitfalls `const char*` lifetime `string_view` of a temporary Concatenation perf `printf` formatting bugs Character vs byte Inheritance Pitfalls Slicing Virtual call in constructor/destructor Missing virtual destructor Diamond inheritance Public inheritance is \"is-a\" Template Pitfalls Templates must be in headers (mostly) Two-phase name lookup `typename` for dependent type names Cryptic template errors Concurrency Pitfalls Data races Mutex order leads to deadlock Forgetting to join Returning a future doesn't run the task `async`'s deferred future blocks on destruction Spurious wakeups in condition variables Build and Linkage Pitfalls Multiple definitions ODR (One Definition Rule) Forgetting `extern \"C\"` for C interop Static initialization order across TUs Modern C++ Idioms Reference RAII Rule of zero Prefer `std::make_unique` and `std::make_shared` `auto` for obvious types Range-based `for` Structured bindings (C++17) `std::optional`, `std::variant`, `std::expected` for sum types Const-correctness `noexcept` on moves Pass parameters by reference (or `string_view`/`span`) Use `enum class` not `enum` `nullptr` not `NULL` Use `<chrono>` for time Use algorithms instead of loops Use `[[nodiscard]]` for return values that shouldn't be ignored `final` on classes n"
  },
  {
    "language": "csharp",
    "slug": "README",
    "title": "C# — Reference Library",
    "url": "/reference/csharp/README.md",
    "keywords": "How to navigate this folder What C# is Where C# sits in 2026 Versions LTS vs STS Why use C# Why not use C# C# vs Java in 2026 Reading order The \"C# way\" of doing things What you won't find here TL;DR: when C# fits"
  },
  {
    "language": "csharp",
    "slug": "01_setup",
    "title": "Setup",
    "url": "/reference/csharp/01_setup.md",
    "keywords": "Table of Contents 1. Installing .NET Recommended: official installer Which version to install 2. Verifying the Install SDK vs runtime 3. The `dotnet` CLI Creating projects Building and running Packages Solutions and projects Tools (CLI tools installed via NuGet) Project info Watch (auto-rebuild) 4. IDE Setup Visual Studio (Windows / macOS) JetBrains Rider — recommended cross-platform VS Code with C# Dev Kit My recommendation 5. Project Structure Single project layout Solution with multiple projects `.csproj` anatomy `appsettings.json` `Directory.Build.props` (shared settings) `global.json` (SDK version pinning) 6. Hello World Console app With more structure Web API Class library 7. NuGet Packages Adding packages Finding packages Common packages Restoring packages Lock files Package sources 8. Managing Multiple .NET Versions Multiple SDKs installed Target framework `dotnet-install` script Uninstalling old versions"
  },
  {
    "language": "csharp",
    "slug": "02_language_basics",
    "title": "Language Basics",
    "url": "/reference/csharp/02_language_basics.md",
    "keywords": "Table of Contents 1. Source File Anatomy File-scoped vs block-scoped namespace Global usings (C# 10+) Top-level statements (C# 9+) 2. Primitive Types Numeric types `decimal` for money Underscores in literals Numeric type promotion Overflow `BigInteger` 3. Variables and `var` `var` — type inference Constants — `const` and `readonly` `init` setters (C# 9+) `required` (C# 11+) Scope 4. Operators Null-coalescing Range and index operators (C# 8+) Pattern matching operators 5. Strings String interpolation Verbatim and raw strings StringBuilder for concatenation in loops Comparing strings Formatting 6. Control Flow `if` / `else` Ternary Null-conditional with method calls 7. Switch — Statements and Expressions Traditional switch statement Switch expression (C# 8+) Pattern matching in switch Exhaustiveness 8. Loops `while` / `do-while` `for` `foreach` `break` and `continue` Labels 9. Arrays Multi-dimensional Collection expressions (C# 12+) `Array` methods Arrays vs `List<T>` 10. Methods Expression-bodied members Method parameters Method overloading Local functions Extension methods Pass-by-value vs reference 11. Comments and XML Documentation What to document"
  },
  {
    "language": "csharp",
    "slug": "03_data_structures",
    "title": "Data Structures",
    "url": "/reference/csharp/03_data_structures.md",
    "keywords": "Table of Contents 1. Collections Overview Generic typing 2. `List<T>` Performance Capacity vs Count Initialization Converting 3. `Dictionary<K, V>` Iterating Initialization Computing values Counting frequencies `Dictionary` vs `IDictionary` 4. `HashSet<T>` Use case 5. `Queue<T>` and `Stack<T>` Queue (FIFO) Stack (LIFO) 6. `SortedDictionary<K, V>` and `SortedSet<T>` `SortedList<K, V>` 7. `PriorityQueue<T, TPriority>` 8. `LinkedList<T>` 9. Immutable Collections Builders for efficient bulk construction When to use `FrozenSet<T>` and `FrozenDictionary<K, V>` (.NET 8+) `ReadOnlyCollection<T>` / `IReadOnlyList<T>` 10. Concurrent Collections `ConcurrentDictionary<K, V>` `ConcurrentQueue<T>`, `ConcurrentStack<T>`, `ConcurrentBag<T>` `BlockingCollection<T>` `Channel<T>` (modern preferred for producer-consumer) 11. Choosing the Right Collection Sequence Unique elements Key → value FIFO / LIFO Priority Performance summary 12. Common Patterns Group by Count by Sum / aggregate Find one Frequency count Index by key Top K Partition (split into two) Chunk into batches Distinct Convert array ↔ list 13. Pitfalls Modifying during iteration `Dictionary` lookup with `[]` throws if missing Hash-based collections need proper `GetHashCode`/`Equals` Mutable keys `Dictionary` with `null` keys Default values for missing keys `Count` vs `Length` LINQ on a List rebuilds enumerables `IEnumerable<T>` can be lazy Allocation pressure with frequent collection creation Comparing collections `null` collections vs empty `Dictionary` enumeration order `ICollection<T>` vs `IList<T>` vs `IEnumerable<T>` Removing during enumeration safely `ConcurrentBag` is rarely the right choice Re-evaluating `IEnumerable<T>` with side effects `List` capacity doesn't shrink Default capacity for collections"
  },
  {
    "language": "csharp",
    "slug": "04_oop",
    "title": "Object-Oriented Programming",
    "url": "/reference/csharp/04_oop.md",
    "keywords": "Table of Contents 1. Classes Class layout convention `sealed` classes `partial` classes `static` classes 2. Fields, Properties, Constructors Fields Properties — the C# default Field vs property Auto-properties with initializers Required vs init Constructors Primary constructors (C# 12+) `this` and `base` 3. Access Modifiers Idioms 4. Structs `readonly struct` `record struct` When to use struct vs class Struct pitfalls Built-in value types 5. Records `with` expression Records with bodies Validation in records Record inheritance When to use records When not 6. Inheritance Single inheritance `virtual`, `override`, `sealed`, `new` When to use inheritance When NOT to use inheritance 7. Polymorphism and `override` `is` and pattern matching 8. Abstract Classes Abstract vs interface 9. Interfaces Naming convention Multiple interfaces Default interface methods (C# 8+) Static abstract members (C# 11+) Generic interfaces Explicit interface implementation When to use interfaces Marker interfaces — discouraged 10. Enums Custom values Different underlying type Flags Enum vs constants 11. Nested Types 12. `Equals`, `GetHashCode`, `ToString` Override for classes Rules Records do this automatically `IEquatable<T>` `IComparable<T>` for ordering `ToString` for debugging `==` overloading"
  },
  {
    "language": "csharp",
    "slug": "05_generics_and_advanced_types",
    "title": "Generics & Advanced Types",
    "url": "/reference/csharp/05_generics_and_advanced_types.md",
    "keywords": "Table of Contents 1. Generic Classes Multiple type parameters Naming convention Generic type inference for constructors 2. Generic Methods Type inference 3. Constraints `where T : class` `where T : struct` `where T : notnull` `where T : new()` `where T : SomeClass` `where T : ISomeInterface` Multiple constraints `where T : unmanaged` `where T : SomeOtherTypeParam` 4. Variance Covariance (`out`) Contravariance (`in`) Invariance (default) Generic classes don't have variance 5. Reified Generics 6. Nullable Reference Types Reference types are non-nullable by default Null state analysis `!` — the null-forgiving operator Patterns Nullable attributes Enabling nullable Migration path What it doesn't do 7. Tuples Tuple deconstruction Named vs unnamed Tuple equality Tuple as Dictionary key `KeyValuePair<K, V>` `ValueTuple<...>` `System.Tuple<...>` (old reference type) 8. Deconstruction Tuples (built-in) Records (built-in) Custom `Deconstruct` Deconstruct in patterns 9. `ref struct` and `Span<T>` `ref struct` `Span<T>` Why Span matters Span limitations (because it's ref struct) `Memory<T>` `stackalloc` 10. Pattern Matching Deep Dive Type patterns Constant patterns Relational patterns (C# 9+) Logical patterns Property patterns List patterns (C# 11+) Switch expressions Patterns with `when` clauses `is` with combined patterns 11. Pitfalls Variance only on interfaces / delegates Generic class inheritance constraints don't transfer Reference type comparison in generic methods `default(T)` Nullable struct vs nullable reference Tuple element naming in interfaces `where T : new()` requires public parameterless constructor Generic method overloading `is null` vs `== null` `null` and pattern matching `default` in switch Reflection on generics Constraints don't help inference"
  },
  {
    "language": "csharp",
    "slug": "06_linq_and_lambdas",
    "title": "LINQ & Lambdas",
    "url": "/reference/csharp/06_linq_and_lambdas.md",
    "keywords": "Table of Contents 1. Lambdas Syntax forms Static lambdas Capturing variables Lambdas vs methods 2. Delegates Multicast delegates Events 3. `Func`, `Action`, `Predicate` 4. LINQ — Two Syntaxes Method syntax (preferred today) Query syntax Mixing 5. Common LINQ Operators Filter Map / Transform Flatten (flatMap) Sort Distinct Take / Skip Concat / Union / Intersect / Except Reverse Index Zip 6. Aggregation Count Sum / Min / Max / Average Any / All Contains First / Last / Single Aggregate 7. Grouping and Joining GroupBy CountBy (.NET 9+) AggregateBy (.NET 9+) Join GroupJoin (left outer join basis) Left outer join 8. Materialization `Lookup<K, T>` 9. Deferred Execution Side effects in LINQ Streaming vs buffered operators 10. LINQ to SQL / Entities Restrictions `AsEnumerable` to switch to in-memory 11. Common Patterns Project to DTO Conditional logic in Select Group counts Top N Find one or default Chunk into pages Composition with method chains Building queries dynamically Partitioning Mapping to Dictionary Concatenating with separator 12. Pitfalls Multiple enumeration `Count()` on `IEnumerable<T>` `Where().FirstOrDefault()` vs `FirstOrDefault(predicate)` `Select` then `Where` order Boxing in LINQ aggregates Forgetting `.ToList()` for materialization `Single` throws on > 1 match `OrderBy` doesn't sort in place `GroupBy` with EF Core `Aggregate` with reference types LINQ in tight loops Async LINQ? `IEnumerable<T>` vs `IQueryable<T>` Lambdas allocating `OrderBy` is stable `Where` doesn't short-circuit `Count`"
  },
  {
    "language": "csharp",
    "slug": "07_async_and_concurrency",
    "title": "Async & Concurrency",
    "url": "/reference/csharp/07_async_and_concurrency.md",
    "keywords": "Table of Contents 1. The async/await Model How it works The compiler rewrites async methods Naming convention Async all the way `async void` (rarely) Why async? 2. `Task` and `Task<T>` Creating tasks `Task.Run` for CPU-bound work Awaiting non-async returns Task status Exceptions 3. `ValueTask` and `ValueTask<T>` Rules When to use 4. CancellationToken CancellationTokenSource Checking cancellation Linking tokens ASP.NET Core integration Always accept CancellationToken in async APIs 5. Combining Tasks `Task.WhenAll` — wait for all `Task.WhenAny` — wait for first Pattern: timeout Sequential vs parallel `ConfigureAwait(false)` 6. `IAsyncEnumerable<T>` Why With LINQ `[EnumeratorCancellation]` 7. Channels — Producer/Consumer Unbounded Bounded (with backpressure) Multiple producers / consumers Why channels over BlockingCollection 8. `Parallel` and PLINQ `Parallel.For` / `Parallel.ForEach` PLINQ When to use When NOT 9. Locks and Synchronization `lock` `Lock` type (.NET 9+) `Interlocked` `SemaphoreSlim` `Monitor.Wait` / `Pulse` `ReaderWriterLockSlim` Locks across async — DON'T 10. Common Patterns Fire-and-forget Retry with backoff Parallel fetches with limit Race with timeout Cancellation propagation TaskCompletionSource — manual task control 11. Pitfalls `async void` Blocking on async (`Result`, `Wait`) Not propagating CancellationToken Forgetting to await Exceptions in fire-and-forget `Task.Run` on async methods Lambdas in `Task.Run` and captured variables Awaiting tasks multiple times `ConfigureAwait(false)` in ASP.NET Core Mixing sync and async Forgetting `await` on Task.Delay Long-running synchronous work in async Async constructors Synchronization context capture Async lambdas in foreach with cancellation `Task.WhenAll` exception behavior Deadlocks from sync context Multiple awaits on the same `ValueTask<T>` Locks across `await` Async in property getters"
  },
  {
    "language": "csharp",
    "slug": "08_errors_and_exceptions",
    "title": "Errors & Exceptions",
    "url": "/reference/csharp/08_errors_and_exceptions.md",
    "keywords": "Table of Contents 1. Exception Hierarchy All exceptions are unchecked 2. try / catch / finally Re-throwing `finally` Don't return from `finally` 3. Exception Filters (`when`) Logging without catching Cancellation 4. `using` and IDisposable `using` statement `using` declaration (C# 8+) Multiple resources `IDisposable` and `IAsyncDisposable` Standard Dispose pattern (for unmanaged resources) 5. Throwing Exceptions Argument validation helpers (.NET 6+) `nameof` Throwing in expressions (C# 7+) 6. Custom Exceptions Convention Hierarchies Don't make every error a custom exception 7. Best Practices Catch what you can handle Don't swallow exceptions Include context in messages Don't catch and rethrow as `throw ex` Use exception filters for conditional catch Don't use exceptions for control flow The `Try*` pattern Async exceptions Document with XML comments Don't expose internal exception types in public API `Exception.Data` 8. Common Patterns Translate at boundaries Centralized exception handling in ASP.NET Core Retry with exception filter Cleanup with using Result type pattern 9. Common Pitfalls Catching too broadly Swallowing exceptions `throw ex` instead of `throw` Losing the cause Returning from `finally` Throwing in `finally` Not disposing Catching `NullReferenceException` Catching `OutOfMemoryException` Custom exceptions without `Exception` suffix Stack trace lost across async boundaries `OperationCanceledException` vs `TaskCanceledException` Re-throwing inside async with `throw ex` Exceptions for early exit `try-catch` without `catch` (try-finally only) Ignoring `CancellationToken` Forgetting to wrap async lambdas `Console.WriteLine` exception handlers in production Catching `TaskCanceledException` as if it's an error"
  },
  {
    "language": "csharp",
    "slug": "09_io_and_networking",
    "title": "09 — I/O and Networking",
    "url": "/reference/csharp/09_io_and_networking.md",
    "keywords": "Table of Contents Files: the modern API Async file I/O Paths Streams Reading and writing JSON HttpClient: making HTTP requests HttpClient lifecycle and IHttpClientFactory Cancellation and timeouts TCP and UDP sockets WebSockets Common pitfalls"
  },
  {
    "language": "csharp",
    "slug": "10_databases",
    "title": "10 — Databases",
    "url": "/reference/csharp/10_databases.md",
    "keywords": "Table of Contents Three approaches: ADO.NET, Dapper, EF Core Connection strings ADO.NET: the foundation Dapper: lightweight ORM EF Core: full ORM Migrations Querying with LINQ Transactions Connection pooling Common pitfalls"
  },
  {
    "language": "csharp",
    "slug": "11_aspnet_core",
    "title": "11 — ASP.NET Core",
    "url": "/reference/csharp/11_aspnet_core.md",
    "keywords": "Table of Contents Picking your style: Minimal API vs MVC vs Blazor Minimal API: the modern default MVC controllers Dependency injection Middleware Configuration and environments Logging Authentication and authorization Model binding and validation OpenAPI/Swagger Blazor SignalR for real-time Common pitfalls"
  },
  {
    "language": "csharp",
    "slug": "12_testing",
    "title": "12 — Testing",
    "url": "/reference/csharp/12_testing.md",
    "keywords": "Table of Contents Picking a framework: xUnit vs NUnit vs MSTest xUnit basics FluentAssertions Parameterized tests Test fixtures and setup/teardown Mocking with Moq Testing async code Testing exceptions Integration testing ASP.NET Core Testing EF Core Test organization Code coverage Common pitfalls"
  },
  {
    "language": "csharp",
    "slug": "13_game_dev_unity",
    "title": "13 — Game development with Unity",
    "url": "/reference/csharp/13_game_dev_unity.md",
    "keywords": "Table of Contents Why Unity for C# Engine mental model MonoBehaviour: the script lifecycle GameObjects and components Transforms Input Time, FixedUpdate, and Update Physics Coroutines Prefabs and instantiation ScriptableObjects Events and decoupling Performance basics Build and platforms Alternatives: Godot, MonoGame, Stride Common pitfalls"
  },
  {
    "language": "csharp",
    "slug": "14_dotnet_runtime_and_performance",
    "title": "14 — .NET runtime and performance",
    "url": "/reference/csharp/14_dotnet_runtime_and_performance.md",
    "keywords": "Table of Contents The CLR and JIT Garbage collection Value types vs reference types — the real cost Boxing Span<T> and Memory<T> stackalloc String performance Collections performance Async overhead and ValueTask Native AOT Benchmarking with BenchmarkDotNet Profiling tools Common performance pitfalls"
  },
  {
    "language": "csharp",
    "slug": "15_modern_features_and_advanced",
    "title": "Modern Features & Advanced",
    "url": "/reference/csharp/15_modern_features_and_advanced.md",
    "keywords": "Table of Contents 1. Primary Constructors (C# 12+) Key differences from records When to use When to avoid Inheritance Pitfall: parameters are not properties 2. Collection Expressions (C# 12+) Type inference Constructing dictionaries When to use 3. Pattern Matching Deep Dive Type patterns Constant patterns Relational patterns Logical patterns (`and`, `or`, `not`) Property patterns Nested property patterns Positional patterns (records / tuples) List patterns (C# 11+) Switch expressions with patterns Discard pattern 4. Records — Beyond the Basics Record class vs record struct `with` expressions Inheritance Custom logic Validation in constructor When to use records When NOT to use records 5. Required Members and `init` `init` accessor (C# 9+) `required` modifier (C# 11+) Combining with `SetsRequiredMembers` attribute When to use 6. Ref Structs and `Span<T>` `Span<T>` and `ReadOnlySpan<T>` Why spans matter for performance Common uses Limitations When to use `Memory<T>` — heap-friendly cousin 7. Source Generators What they're used for Example: source-generated regex (C# 11+) Example: source-generated logger Example: System.Text.Json source generation Writing your own Why source generators matter 8. Nullable Reference Types Flow analysis `!` null-forgiving operator Null-coalescing Null-conditional Generic constraint: notnull `MemberNotNull` and `NotNullWhen` attributes Migrating older code Limitations 9. Interceptors (C# 12+, preview) 10. `unsafe` and Pointers When unsafe makes sense When it doesn't `fixed` statement 11. Common Pitfalls Reference `==` for reference types Equality without `GetHashCode` Modifying collection during iteration `IEnumerable<T>` multiple enumeration `async void` Forgetting `await` `ConfigureAwait(false)` `Task.Result` and `Task.Wait()` Boxing `struct` mistakes `string.Empty` vs `\"\"` `String.Concat` in loops `DateTime` traps `IDisposable` not disposed Implementing `IDisposable` poorly LINQ deferred execution surprises `?.` on value types `default` for reference types Forgetting `await using` for async dispose `Task.Run` for everything Wrapping sync code badly Generic constraints surprise `nameof` for refactoring safety Configuration as string keys Misusing DI lifetimes EF Core change tracking `Equals` and `==` inconsistency `params` and arrays Async streams iteration Cancellation token propagation Configuration order matters `IOptionsSnapshot` vs `IOptions` vs `IOptionsMonitor` Native AOT pitfalls Misusing `partial` Forgetting `sealed` `"
  },
  {
    "language": "overview",
    "slug": "README",
    "title": "Programming Languages Reference Library",
    "url": "/reference/overview/README.md",
    "keywords": "Structure How each language folder is organized Style Suggested reading paths Coverage"
  }
];
