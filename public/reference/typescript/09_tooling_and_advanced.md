# 09. Tooling & Advanced Topics

> Project references for monorepos, build tools (tsc, swc, tsup, esbuild, Bun), DX tips, performance, and the long list of TS pitfalls.

---

## Table of Contents

1. [Project References](#1-project-references)
2. [Build Tools — Comparison](#2-build-tools--comparison)
3. [DX Tips](#3-dx-tips)
4. [TypeScript Performance Tuning](#4-typescript-performance-tuning)
5. [Migration Strategies](#5-migration-strategies)
6. [Modern TS Stack (2026)](#6-modern-ts-stack-2026)
7. [Common TS Pitfalls](#7-common-ts-pitfalls)

---

## 1. Project References

For monorepos or multi-package codebases, `tsc --build` with project references is much faster than rebuilding everything.

### Root tsconfig
```json
{
    "files": [],
    "references": [
        { "path": "./packages/shared" },
        { "path": "./packages/ui" },
        { "path": "./packages/server" }
    ]
}
```

### Per-package tsconfig
```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "composite": true,
        "outDir": "dist",
        "rootDir": "src",
        "declaration": true,
        "declarationMap": true
    },
    "include": ["src/**/*"],
    "references": [
        { "path": "../shared" }       // depends on shared
    ]
}
```

`composite: true` is required for referenced projects. Enables incremental builds.

### Building
```bash
tsc --build
tsc --build --watch
tsc --build --clean
tsc --build --force          # rebuild from scratch
```

`tsc --build` figures out the dependency graph, builds in order, skips unchanged.

### When to use
- 5+ packages in a monorepo.
- Slow `tsc` runs.
- Want incremental compile across packages.

### When not to bother
- Single-package projects.
- You're using a bundler that handles incrementality (Vite, esbuild) — references add overhead with little benefit.

### Caveats
- `composite: true` requires `declaration: true`, `outDir`, and explicit `include`.
- TS picks up `.d.ts` from `outDir`, so dependent packages need to be built before consumers can type-check.
- `tsc --build` is single-threaded. Turborepo + per-package `tsc` can parallelize.

For most modern monorepos: use **Turborepo** (`turbo run typecheck`) over project references. Each package runs `tsc --noEmit` in parallel.

---

## 2. Build Tools — Comparison

You usually need:
- A way to **run TS during development** (hot reload).
- A way to **build for production** (minification, dual ESM/CJS, etc.).
- A way to **emit type declarations** (`.d.ts`).
- A way to **type-check** (separate from emit).

| Tool | Strengths | Weaknesses |
|---|---|---|
| **tsc** | Official, complete, accurate. Emits `.d.ts`. | Slow. Single-threaded. |
| **swc** | Rust-based, very fast. Type-strips. | No type checking. Doesn't emit `.d.ts` (use tsc for that). |
| **esbuild** | Go-based, extremely fast. Bundler + minifier. | No type checking. Some advanced TS features unsupported (decorators legacy + Stage 3 quirks). |
| **tsup** | Wrapper around esbuild for libraries. Outputs ESM + CJS + `.d.ts`. | Limited customization compared to raw esbuild. |
| **unbuild** | Like tsup. Used by Nuxt ecosystem. | Smaller community. |
| **Bun** | Native TS support, fast. Runtime + bundler. | Younger ecosystem, some edge cases. |
| **Vite** | Dev server + bundler. Uses esbuild for transform, Rollup for production bundle. | Designed for apps, not libraries. |
| **Webpack + ts-loader** | Mature, plugin-rich. | Slow. Mostly replaced by Vite. |
| **tsx** | Node + esbuild. Run `.ts` files directly. | Dev/script use only. |

### Recommended setups

**Node application**:
- Dev: `tsx watch src/index.ts`.
- Type check: `tsc --noEmit` (in CI).
- Build: `tsc` (for emit) or `tsup` (faster, ESM+CJS).

**Bundled app (Vite / Next)**:
- Dev: framework dev server.
- Type check: `tsc --noEmit` (in CI; the IDE handles editor errors).
- Build: framework build command.

**Library**:
- Dev: `vitest watch` for tests.
- Type check: `tsc --noEmit`.
- Build: `tsup src/index.ts --format esm,cjs --dts --clean`.

**Bun-only project**:
- Just use `bun`. It runs, bundles, and types itself.

### `swc` for fast compilation
For replacing `tsc` in dev / test pipelines:
```bash
npm install -D @swc/core @swc/cli
```

```json
// .swcrc
{
    "jsc": {
        "parser": { "syntax": "typescript", "tsx": true, "decorators": true },
        "target": "es2022"
    },
    "module": { "type": "es6" }
}
```

```bash
npx swc src -d dist --strip-leading-paths
```

For tests: `@swc/jest` or `@swc/vitest`. **Vitest uses esbuild by default** — swc isn't needed there.

### When to use multiple tools
The reality of large TS projects:
- **`tsc --noEmit`** for type checking.
- **`tsup`** / **`esbuild`** for emit (JS only).
- **`tsc --declaration --emitDeclarationOnly`** for `.d.ts`.

Why? `tsc` is the source of truth for types; everything else is faster for transpilation.

---

## 3. DX Tips

### `verbatimModuleSyntax` for explicit imports
Forces explicit `import type`. Painful at first, then routine. Prevents subtle bundler bugs.

### Faster compile
- `skipLibCheck: true` — almost always.
- `incremental: true` — caches build info.
- `tsBuildInfoFile: "./node_modules/.cache/tsc.tsbuildinfo"` — keeps the cache out of source tree.
- Project references for monorepos.

### Avoid `any`
Set `@typescript-eslint/no-explicit-any` to `error`. When you really need it, comment why:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- third-party untyped lib
const result: any = legacyApi.call();
```

### Editor: restart TS server when errors get stuck
Sometimes the language server gets confused (especially after big git operations). Cmd+Shift+P → "TypeScript: Restart TS Server" in VS Code.

### Use `@tsconfig/*` base configs
```bash
npm install -D @tsconfig/strictest @tsconfig/node22
```

```json
{
    "extends": [
        "@tsconfig/node22/tsconfig.json",
        "@tsconfig/strictest/tsconfig.json"
    ]
}
```

Saves arguing about flags.

### `// @ts-expect-error` over `// @ts-ignore`
`@ts-expect-error` errors if the underlying error is fixed — alerting you to remove it.

### `unknown` in catch blocks
Default with `useUnknownInCatchVariables` (enabled with `strict`):
```typescript
try {
    // ...
} catch (e) {
    if (e instanceof Error) {
        console.error(e.message);
    } else {
        console.error("unknown error", e);
    }
}
```

### Inline type annotations beat external type aliases for one-offs
```typescript
// Often clearer than introducing a type alias
function compute(input: { x: number; y: number }): number { ... }
```

### Use `satisfies` instead of casts
Whenever you want "check this matches X, but keep the precise type":
```typescript
const config = { a: 1, b: "hi" } satisfies Record<string, unknown>;
```

### Hover types in IDE
Hover over a variable, function, or expression to see its inferred type. Critical for understanding TS — the inferred type often differs from what you expect.

### TypeScript Playground
[typescriptlang.org/play](https://www.typescriptlang.org/play) — share TS snippets, test type-level code, link to specific TS versions. Invaluable for asking questions and reproducing issues.

### Useful packages
- **`type-fest`** — utility types.
- **`expect-type`** — type-level testing.
- **`ts-essentials`** — utility types (alternative to type-fest).
- **`tsx`** — running TS scripts.
- **`tsup`** — bundling libraries.
- **`zod`** — validation.
- **`type-coverage`** — measures how much of your code is `any`.

---

## 4. TypeScript Performance Tuning

For projects where `tsc` is slow (1+ minutes):

### Diagnose
```bash
tsc --extendedDiagnostics
```

Shows:
- Files checked.
- Memory used.
- Time per phase (parse, bind, check, emit).

```bash
tsc --generateTrace ./trace
```

Generates trace files; analyze with [`@typescript/analyze-trace`](https://github.com/microsoft/typescript-analyze-trace).

### Common causes of slowness
- **Deeply nested types** (complex conditional types, recursive helpers).
- **Large unions** (thousands of variants).
- **Heavy library types** (`@types/aws-sdk` was infamous; SDKv3 fixed this).
- **Missing `skipLibCheck`** (always set this).
- **Wide `include` patterns** picking up `node_modules`.

### Speed-up techniques
- **`skipLibCheck: true`** — skip `node_modules` types.
- **`incremental: true`** + persistent cache.
- **Project references** for monorepos.
- **Narrower `include` / wider `exclude`**.
- **Avoid `import * from` namespaces** in wide modules — slows resolution.
- **Use `interface` over `type`** for large shapes — faster checking.
- **Avoid deep mapped + conditional types** unless necessary.

### `Simplify<T>` for prettier output
```typescript
import type { Simplify } from "type-fest";
type X = Simplify<Pick<User, "id"> & { admin: true }>;
// hover shows: { id: number; admin: true }
// instead of:  Pick<User, "id"> & { admin: true }
```

### `type-coverage`
```bash
npx type-coverage --strict --detail
```

Measures `any` usage. Helpful for migration tracking.

---

## 5. Migration Strategies

### From JavaScript to TypeScript

**Step 1**: Add TS dependency:
```bash
npm install -D typescript
npx tsc --init
```

**Step 2**: Permissive tsconfig:
```json
{
    "compilerOptions": {
        "allowJs": true,
        "checkJs": false,
        "noEmit": true,
        "strict": false
    }
}
```

**Step 3**: Rename files one by one (`.js` → `.ts`). Type just what TS complains about — `any` is fine for now.

**Step 4**: Tighten over time. Enable `strict` flags one at a time:
1. `noImplicitAny`
2. `strictNullChecks` (the biggest payoff)
3. `strictFunctionTypes`, `strictBindCallApply`
4. `strictPropertyInitialization`
5. Full `strict: true`
6. `noUncheckedIndexedAccess`

**Step 5**: Add lint rule `@typescript-eslint/no-explicit-any` to prevent regression.

### `@ts-check` for gradual adoption
Add to JS files:
```javascript
// @ts-check
function add(a, b) { return a + b; }
add(1, "2");      // TS warns
```

Type-checks the file without renaming. Useful for "test the waters" before committing to TS.

### JSDoc types in JS
TS understands JSDoc:
```javascript
/**
 * @param {string} name
 * @param {number} age
 * @returns {string}
 */
function greet(name, age) { ... }
```

Lets you type JS without compile step. Used by Vue source, several large projects.

### From legacy decorators to Stage 3
Most likely scenario: you're maintaining code using `experimentalDecorators`. NestJS, TypeORM, etc. still default to legacy in 2026. Don't migrate unless the library does.

For new code: prefer Stage 3 unless using a framework that demands legacy.

---

## 6. Modern TS Stack (2026)

A pragmatic stack for new projects:

### Language & runtime
- **TypeScript 5.x** with `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`.
- **Node 22+** or **Bun**.
- **ESM** modules (`"type": "module"` in package.json).

### Validation
- **Zod** (full apps) or **Valibot** (size-sensitive).

### Editor
- **VS Code** or **Cursor** or **Zed**.
- **Volar** for Vue, official Svelte plugin for Svelte, built-in TS for everything else.

### Testing
- **Vitest** (runs, with `--ui` for browser dashboard).
- **Playwright** for E2E.
- **expect-type** for type-level tests.

### Linting / formatting
- **ESLint 9+** flat config with `typescript-eslint`.
- **Prettier**.
- Or **Biome** as the all-in-one (Rust-based, faster).

### Build
- **tsc** for type check.
- **tsup** for library emit (or **unbuild**).
- **Vite** / **Next** / **SvelteKit** / framework's own for apps.

### State management
- Local: `useState` / `ref` / runes.
- Global: **Zustand** / **Jotai** for React.
- Server: **TanStack Query**.

### Backend
- **Fastify** or **Hono**.
- **Prisma** or **Drizzle** for the DB layer.
- **tRPC** for typed client-server.
- **Auth.js** or **Clerk** / **WorkOS** for auth.

### Monorepo
- **pnpm** workspaces.
- **Turborepo** for task orchestration.
- **Changesets** for versioning.

### Observability
- **Sentry** for errors.
- **OpenTelemetry** for traces.
- **Pino** for logs.

### Other useful libraries
- `type-fest` — utility types.
- `nanoid` — IDs.
- `date-fns` or `temporal` polyfill — dates.
- `ofetch` or native `fetch` — HTTP.
- `mitt` — tiny event emitter.
- `radash` — modern lodash replacement.

---

## 7. Common TS Pitfalls

A long list of bugs that catch even experienced TS devs.

### `any` infects
```typescript
const x: any = "hi";
const y = x.toUpperCase().split(",");    // all `any`
```

Use `unknown` instead, then narrow.

### `unknown` requires narrowing
```typescript
const x: unknown = JSON.parse(s);
x.foo;        // ERROR
if (typeof x === "object" && x !== null && "foo" in x) x.foo;
```

### `noUncheckedIndexedAccess` and arrays
```typescript
const arr = [1, 2, 3];
const x = arr[0];           // number | undefined (with the flag)
const y = arr[100];          // also number | undefined
```

Force-handling via:
```typescript
const x = arr[0]!;            // assert non-null — only when guaranteed
const x = arr[0] ?? 0;         // safe default
if (arr[0] !== undefined) { ... }
```

### `as` casts hide bugs
```typescript
const u = data as User;   // no runtime check
u.name;                    // crashes at runtime if data.name is missing
```

Use Zod parse or type guard.

### Function type variance
```typescript
type Animal = { name: string };
type Dog = Animal & { bark: () => void };

const fn: (a: Animal) => void = (d: Dog) => d.bark();    // ERROR (with strictFunctionTypes)
```

A function expecting a more specific type can't safely accept a less specific one. The error is correct.

### `void` vs `undefined` for callbacks
```typescript
type Cb = () => void;
const c: Cb = () => 42;     // OK — return value is ignored

type CbU = () => undefined;
const c2: CbU = () => 42;    // ERROR
```

This is why `array.forEach(item => arr.push(item))` typechecks despite `push` returning a number.

### Discriminated unions need consistent discriminant
```typescript
type A = { type: "a"; x: number };
type B = { kind: "b"; y: number };          // different discriminant — won't narrow nicely
type AB = A | B;
```

Use the same key name across variants.

### `object` type isn't what you think
```typescript
type O = object;           // any non-primitive (includes arrays, functions)
type R = Record<string, unknown>;    // closer to "plain object"
type R2 = { [k: string]: unknown };
```

Use `Record<string, unknown>` for "any object."

### `Object.keys` returns `string[]` always
```typescript
const obj = { a: 1, b: 2 };
Object.keys(obj);     // string[] — not ("a" | "b")[]
```

Structural typing means the object might have more keys. Cast if you trust the shape:
```typescript
(Object.keys(obj) as (keyof typeof obj)[]).forEach(...);
```

### `JSON.parse` returns `any`
```typescript
const data = JSON.parse(s);    // any — by default
```

Use validators instead.

### Optional chaining narrowing pitfall
```typescript
function f(user?: User) {
    if (user?.name) {
        // user is User here? Almost — TS narrows to { name: string }
    }
}
```

Mostly works. Edge case: with `exactOptionalPropertyTypes`, missing vs `undefined` differ.

### Equality with literal unions
```typescript
type Status = "active" | "pending";
declare const s: Status;

if (s === "unknown") {        // ERROR — comparison with "unknown" looks like a typo
    // ...
}
```

Catches typos in comparison. Sometimes you need `if ((s as string) === "x")`.

### Inferred `never[]`
```typescript
const items = [];               // never[]
items.push("hi");                // ERROR
```

Annotate:
```typescript
const items: string[] = [];
```

### Empty object `{}`
```typescript
const x: {} = "hi";              // OK — {} means "anything but null/undefined"
```

Surprising. Use `Record<string, never>` for "empty object literal" if needed; usually `Record<string, unknown>` is what you mean.

### Index signatures and missing keys
Without `noUncheckedIndexedAccess`:
```typescript
const dict: Record<string, number> = {};
dict.foo;     // number (TS lies)
```

With the flag:
```typescript
dict.foo;     // number | undefined ← correct
```

Always enable this flag.

### `enum` vs union of strings
```typescript
enum Role { Admin = "admin", User = "user" }
type Role2 = "admin" | "user";
```

`enum` is a runtime construct (compiled to JS object). Has quirks: numeric enums are reverse-lookupable; string enums need casts. **Prefer union of strings** + `as const`:
```typescript
const ROLES = ["admin", "user"] as const;
type Role = typeof ROLES[number];
```

Lighter, less surprising, tree-shakes better.

### `namespace` is legacy
Pre-ES module solution. Don't use for new code. Modules (`export`) replaced it.

### `default export` interop
ESM `import x from "cjs-pkg"` may not match what `cjs-pkg` actually exports. With `esModuleInterop: true`, TS does the right thing for most CJS packages.

### Circular type references
```typescript
type A = { b: B };
type B = { a: A };
```

Fine. But circular **value** imports cause runtime issues — use `import type` to break circles.

### `Readonly<T>` is shallow
```typescript
type RO = Readonly<{ x: number[] }>;
const ro: RO = { x: [1, 2, 3] };
ro.x = [];           // ERROR
ro.x.push(4);         // OK — array is not deeply readonly
```

For deep readonly, use `type-fest`'s `ReadonlyDeep` or a custom mapped type.

### Type predicates lie
```typescript
function isString(x: unknown): x is string {
    return typeof x === "number";      // wrong but compiles
}
```

TS trusts your predicate. Test them carefully.

### `as const` doesn't deeply freeze
```typescript
const config = { a: { b: 1 } } as const;
// config.a is readonly { b: 1 }, but at runtime config.a.b can still be reassigned via Object.freeze=false
```

`as const` is a type-level construct only.

### Async function return types
```typescript
async function f() {
    return 42;
}
// return type: Promise<number>

async function g(): number {     // ERROR — must be Promise<number>
    return 42;
}
```

### `Promise<void>` swallows rejection types
```typescript
function f(): Promise<void> {
    return Promise.reject("oops");
}
```

The rejection type isn't in the signature. Use try/catch or `.catch`.

### `void` doesn't mean `undefined` in return position
A `Promise<void>` function can return any Promise — TS just won't expose the value.

### Generics that don't help
```typescript
function f<T>(x: T): T {
    return x;
}
// fine

function g<T extends number>(x: T): T {
    return x * 2 as T;   // hack — x*2 is `number`, not T
}
```

If T isn't doing useful work, drop it.

### TypeScript and JSON
There's no built-in type for "JSON-like data" except `unknown`. Define your own:
```typescript
type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };
```

### Iterating `Set` and `Map`
```typescript
for (const item of mySet) ...                 // OK
for (const [k, v] of myMap) ...                // OK
for (const k of myMap) ...                      // k is [K, V] — destructure!
```

### `Array.includes` argument type
```typescript
const ROLES = ["admin", "user"] as const;
type Role = typeof ROLES[number];

ROLES.includes("guest" as string);   // OK — wider arg accepted
ROLES.includes("guest");              // ERROR — "guest" not in ROLES
```

If you want to check arbitrary strings, cast:
```typescript
(ROLES as readonly string[]).includes(x);
```

### `instanceof` for cross-realm objects
In Node worker threads or browsers across frames, an object might be an Array but `arr instanceof Array` returns false. Use `Array.isArray`.

### `this` typing in callbacks
```typescript
function bad() {
    return this.x;    // implicit any — error with noImplicitThis
}

function good(this: { x: number }) {
    return this.x;
}
```

### Default exports + types
```typescript
// foo.ts
const x = { a: 1 };
export default x;
export type Foo = typeof x;
```

Some patterns interact awkwardly. `import x, { Foo } from "./foo"` works but combinations get confusing. Prefer named exports.

### `tsc --watch` getting stale
Sometimes the watcher misses changes. Restart it. Or use `tsc --build --watch` for project references.

### Linting and types disagreeing
- ESLint might allow code TS catches, or vice versa.
- TS focuses on types; ESLint on style / patterns.
- Both are useful. Don't conflict-resolve by suppressing one.

### `as unknown as T` red flag
Indicates the type system is being bypassed. Sometimes necessary (e.g., complex generic gymnastics). Usually a sign to step back and rethink.

### `@ts-nocheck` at the file top
Skips TS checking for the entire file. Convenient escape hatch; also dangerous. Annotate why it's there.

### Wrong TS version
- Project's TS version is in `node_modules`.
- Global TS install is different.
- VS Code uses bundled TS unless told otherwise.
- CI uses package.json's TS.

Pin TS version in package.json (`"typescript": "5.5.0"` not `"^5.5.0"` for libraries).

### Type errors only in CI
- Different TS version in CI.
- `node_modules` regenerated with different deps.
- Different `tsconfig` (sometimes `tsconfig.test.json` vs `tsconfig.build.json`).
- Run the exact CI command locally with the same lockfile.

### Cross-environment globals
```typescript
// Server code accidentally referencing browser globals
document.cookie     // ERROR if lib doesn't include "dom"
```

Set `lib` correctly per project. Server: `["es2022"]`. Browser: `["es2022", "dom"]`. Don't share configs across realms.

---

That's TypeScript — nine files covering the type system, tooling, and patterns. The takeaway:

1. **Use `strict` + extras** from day one.
2. **Validate at boundaries** (Zod) — types alone don't check runtime data.
3. **Discriminated unions** beat flat objects with optional fields.
4. **`satisfies`** beats annotation when you want to keep the precise type.
5. **`as` is a smell** — every cast bypasses the type checker.
6. **`type-fest`** before writing your own utility types.
7. **Project references / Turborepo** for monorepos.
8. **`tsc --noEmit`** for type check, separate from emit (which esbuild/tsup do faster).
9. **Sentry from day one.** Tests, lint, format in CI.

TypeScript pays dividends measured in months. The first week is annoying, the rest of the project is a relief.

Next folder: Java.
