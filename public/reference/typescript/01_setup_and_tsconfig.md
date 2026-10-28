# 01. Setup & tsconfig.json

> Installing TypeScript, choosing how to run it, and the most important file in any TS project: `tsconfig.json`.

---

## Table of Contents

1. [Installing TypeScript](#1-installing-typescript)
2. [Running TS Code](#2-running-ts-code)
3. [tsconfig.json — Anatomy](#3-tsconfigjson--anatomy)
4. [Strict Mode Flags](#4-strict-mode-flags)
5. [Module System](#5-module-system)
6. [Project Structure](#6-project-structure)
7. [Editor Setup](#7-editor-setup)
8. [Common Setups](#8-common-setups)

---

## 1. Installing TypeScript

```bash
# Per-project (recommended)
npm install -D typescript

# Initialize tsconfig.json
npx tsc --init
```

Avoid global TS installs — different projects need different versions, and CI should use the project's version.

Check version:
```bash
npx tsc --version
```

In 2026, TS 5.x is current. Most language features stabilize once they hit a release.

---

## 2. Running TS Code

TypeScript needs a compile step. Several ways:

### `tsc` — official compiler
```bash
npx tsc                  # compile per tsconfig
npx tsc --noEmit          # type-check only
npx tsc --watch            # watch mode
npx tsc -p ./tsconfig.json
```

Slow for large projects. Use for the type-check step.

### `tsx` — run `.ts` files directly via Node
```bash
npm install -D tsx
npx tsx src/index.ts
npx tsx watch src/index.ts
```

Uses esbuild under the hood — fast. **No type checking** at runtime. Common pattern: `tsx` for running, `tsc --noEmit` for type-checking.

### Node native (22+)
Node 22+ can strip types with `--experimental-strip-types`:
```bash
node --experimental-strip-types src/index.ts
```

By 2026 this is broader; check your Node version.

### Bun — runs TS natively
```bash
bun run src/index.ts
```

Bun reads `.ts` directly, including TSX. Same caveat: no type checking, just stripping.

### Deno — TS-first
```bash
deno run src/index.ts
```

Deno does both type check and run.

### `ts-node` — older runner
Was the standard before `tsx`. Slower; ESM support was rough for years. Largely replaced by `tsx`.

### Bundlers compile TS automatically
Vite, Next.js, SvelteKit, esbuild, swc — they all handle TS. You usually don't run `tsc` for emit; the bundler does it. `tsc --noEmit` runs in CI as a check.

### Recommended dev loop
- **Dev**: `tsx watch` or framework dev server.
- **CI**: `tsc --noEmit` for type check + tests.
- **Build**: framework's build command (`next build`, `vite build`, etc.) or `tsup` for libraries.

---

## 3. tsconfig.json — Anatomy

A typical strict config:

```json
{
    "compilerOptions": {
        "target": "es2022",
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "lib": ["es2022", "dom", "dom.iterable"],
        "jsx": "preserve",

        "strict": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "exactOptionalPropertyTypes": true,
        "noFallthroughCasesInSwitch": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,

        "esModuleInterop": true,
        "verbatimModuleSyntax": true,
        "isolatedModules": true,
        "resolveJsonModule": true,
        "allowSyntheticDefaultImports": true,
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true,

        "outDir": "dist",
        "rootDir": "src",
        "sourceMap": true,
        "declaration": true,
        "declarationMap": true,
        "removeComments": false,

        "paths": {
            "@/*": ["src/*"]
        },
        "baseUrl": "."
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

Each option grouped:

### `target` — what JS to emit
- `"es2022"` is a safe modern baseline (Node 18+, all 2024+ browsers).
- For libraries with broad browser support: `"es2020"`.
- For browser-only modern apps: `"esnext"` (rolling target).

This controls **emitted syntax**. `target: "es2017"` will downlevel `??` and `?.` to ES2017-compatible JS.

### `module` — how imports/exports compile
- `"nodenext"` — Node's native ESM/CJS detection via `package.json` `"type"`. Use this for new Node projects.
- `"esnext"` — pure ESM. Common for bundled apps.
- `"commonjs"` — old Node default. Use only for CJS libraries.

### `moduleResolution` — how the compiler finds modules
- `"nodenext"` — pair with `module: "nodenext"`. Requires file extensions in imports.
- `"bundler"` — for bundled apps; allows extensionless imports.
- `"node"` (classic) — legacy.

For Node: `module: "nodenext"` + `moduleResolution: "nodenext"`.
For bundled apps (Vite, Next, etc.): `module: "esnext"` + `moduleResolution: "bundler"`.

### `lib` — built-in types available
- `["es2022", "dom"]` — browser-target.
- `["es2022"]` — Node-only (no DOM types).
- `["esnext", "dom", "dom.iterable", "webworker"]` — for service workers.

If `target` is set, `lib` defaults accordingly. Override only when you need to.

### `jsx` — how to handle JSX
- `"preserve"` — keep JSX in output; let a bundler / loader handle it.
- `"react"` — compile to `React.createElement`.
- `"react-jsx"` — modern JSX runtime (used by most React projects in 2026).
- `"react-jsxdev"` — dev variant.

### `outDir`, `rootDir`
Output folder and source root. Compiled files mirror `rootDir` structure under `outDir`.

### `sourceMap`, `declaration`, `declarationMap`
- `sourceMap: true` — generate `.js.map` files for debugging.
- `declaration: true` — emit `.d.ts` type declarations (for libraries).
- `declarationMap: true` — source maps for declarations.

### `paths` and `baseUrl` — module aliases
```json
{
    "baseUrl": ".",
    "paths": {
        "@/*": ["src/*"],
        "@app/*": ["src/app/*"],
        "@lib/*": ["src/lib/*"]
    }
}
```

Now:
```typescript
import { foo } from "@/lib/foo";   // → src/lib/foo
```

**Important**: TS path aliases work for type-checking only. At runtime, you need:
- A bundler that handles them (Vite, Webpack, Next).
- Or `tsx`/`tsc-alias` to rewrite them.
- Or use Node's `imports` field in package.json instead (`"#lib/*": "./src/lib/*.js"`).

### `include`, `exclude`, `files`
- `include` — glob patterns to compile.
- `exclude` — patterns to skip (default: `node_modules`).
- `files` — explicit list (rarely used).

### `extends` — inherit from another config
```json
{
    "extends": "@tsconfig/node22/tsconfig.json"
}
```

Use a base config from **`@tsconfig`** scope (`@tsconfig/node22`, `@tsconfig/next`, `@tsconfig/strictest`, etc.). Saves boilerplate.

---

## 4. Strict Mode Flags

`strict: true` enables a family of flags. Worth understanding each:

| Flag | What it does |
|---|---|
| `noImplicitAny` | Disallow implicit `any` — must annotate or infer. |
| `strictNullChecks` | `null` and `undefined` are not assignable to other types unless explicit. **The most important flag.** |
| `strictFunctionTypes` | Function parameter types are checked contravariantly. |
| `strictBindCallApply` | `bind`/`call`/`apply` are type-checked. |
| `strictPropertyInitialization` | Class fields must be initialized in constructor or marked `?` / `!`. |
| `noImplicitThis` | `this` must have an explicit type in standalone functions. |
| `alwaysStrict` | Emit `"use strict"`. |
| `useUnknownInCatchVariables` | `catch (e)` types `e` as `unknown` not `any`. |

### Beyond strict — flags worth enabling

| Flag | What it does | Recommend |
|---|---|---|
| `noUncheckedIndexedAccess` | `arr[i]` returns `T \| undefined`. | Yes |
| `exactOptionalPropertyTypes` | `{ x?: number }` is **not** `{ x?: number \| undefined }`. | Yes for new code |
| `noImplicitOverride` | Subclass overrides must use `override`. | Yes |
| `noPropertyAccessFromIndexSignature` | Forces `obj["key"]` for index-signature access. | Sometimes — annoying with env vars |
| `noFallthroughCasesInSwitch` | Catches missing `break` in switch. | Yes |
| `noUnusedLocals`, `noUnusedParameters` | Unused vars are errors. | Maybe — ESLint can handle better |
| `allowUnreachableCode: false` | Unreachable code is an error. | Yes |

### `verbatimModuleSyntax` (5.0+)
Treats `import` and `export` exactly as written — no auto-elision of type-only imports. Requires `import type` for type-only imports:
```typescript
import type { User } from "./types";        // erased at compile time
import { fetchUser } from "./api";          // emitted

import { type User, fetchUser } from "./api";   // also fine
```

Stricter and clearer. Recommended for new projects.

### `isolatedModules`
Each file must be compilable independently — important for bundlers (esbuild, swc) that don't see the whole project. Enable for any modern setup.

### `skipLibCheck`
Don't type-check declaration files in `node_modules`. Almost always `true` — speeds up compile, libraries with broken types still work.

### `esModuleInterop`
Allows `import express from "express"` for CJS modules. Standard now.

### `forceConsistentCasingInFileNames`
Prevents bugs from case-insensitive filesystems (Mac/Windows) writing `Foo.ts` and importing as `./foo`. Linux breaks. Always enable.

---

## 5. Module System

Three common scenarios:

### Scenario A: Node application
```json
{
    "compilerOptions": {
        "target": "es2022",
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "verbatimModuleSyntax": true,
        "strict": true,
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": ["src/**/*"]
}
```

```json
// package.json
{
    "type": "module"
}
```

Imports require file extensions, using `.js` (even though source is `.ts`):
```typescript
import { foo } from "./bar.js";   // bar.ts on disk
```

### Scenario B: Bundled app (Vite, Next, etc.)
```json
{
    "compilerOptions": {
        "target": "es2022",
        "module": "esnext",
        "moduleResolution": "bundler",
        "noEmit": true,
        "strict": true,
        "jsx": "preserve",
        "isolatedModules": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "lib": ["es2022", "dom", "dom.iterable"]
    },
    "include": ["src/**/*"]
}
```

Imports without extensions:
```typescript
import { foo } from "./bar";
import Component from "./Component";
```

`tsc` is used for type checking only; the bundler emits JS.

### Scenario C: Publishing a library
```json
{
    "compilerOptions": {
        "target": "es2022",
        "module": "esnext",
        "moduleResolution": "bundler",
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "strict": true,
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": ["src/**/*"]
}
```

Often paired with **tsup** or **unbuild** to emit ESM + CJS + `.d.ts`. `tsc` runs separately for types or via tsup's `--dts` flag.

---

## 6. Project Structure

```
my-project/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── utils/
│   └── ...
├── tests/
└── dist/             # generated
```

### Multiple tsconfigs
Common to have:
- `tsconfig.json` — main app config.
- `tsconfig.test.json` — extends main, includes tests.
- `tsconfig.build.json` — extends main, excludes tests.

```json
// tsconfig.build.json
{
    "extends": "./tsconfig.json",
    "exclude": ["**/*.test.ts", "src/test-utils"]
}
```

### Monorepo with project references
For monorepos, `tsc --build` with project references is fast:
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

Each package has its own tsconfig. `tsc --build` figures out order and only rebuilds what changed.

---

## 7. Editor Setup

### VS Code
Built-in support. Two settings worth knowing:

```json
// .vscode/settings.json
{
    "typescript.tsdk": "node_modules/typescript/lib",
    "typescript.enablePromptUseWorkspaceTsdk": true,
    "typescript.preferences.importModuleSpecifier": "non-relative",
    "typescript.updateImportsOnFileMove.enabled": "always",
    "typescript.preferences.useAliasesForRenames": false
}
```

`typescript.tsdk` ensures the editor uses your project's TS version, not VS Code's bundled one. Important when the project uses a different version.

### WebStorm / JetBrains
Works out of the box. Use the project's TS version via Settings → TypeScript.

### Type errors in editor vs CLI
If they differ:
- Editor and CLI use different TS versions.
- Editor cache stale — restart TS server (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server").
- Different tsconfigs (one for editor, one for build).

---

## 8. Common Setups

### Node app (Express/Fastify/Hono backend)
```bash
mkdir my-api && cd my-api
npm init -y
npm pkg set type=module
npm install -D typescript tsx @types/node
npm install fastify
npx tsc --init --rootDir src --outDir dist --module nodenext --moduleResolution nodenext --target es2022 --strict
```

```json
// package.json scripts
{
    "scripts": {
        "dev": "tsx watch src/index.ts",
        "build": "tsc",
        "start": "node dist/index.js",
        "typecheck": "tsc --noEmit"
    }
}
```

### Vite + React
```bash
npm create vite@latest my-app -- --template react-ts
```

Pre-configured. Edit `tsconfig.json` to add strictness as needed.

### Next.js
```bash
npx create-next-app@latest --typescript
```

Configures everything. The generated `tsconfig.json` is opinionated for Next.

### Library (publishable npm package)
```bash
npm init -y
npm install -D typescript tsup vitest
npx tsc --init --declaration --rootDir src --outDir dist --target es2022 --module esnext --moduleResolution bundler --strict
```

```json
{
    "scripts": {
        "build": "tsup src/index.ts --format esm,cjs --dts --clean",
        "test": "vitest",
        "typecheck": "tsc --noEmit"
    }
}
```

### Quick script
```bash
npx tsx my-script.ts arg1 arg2
```

No config needed — `tsx` infers reasonable defaults.

### `@tsconfig` base configs
Use a published base config to skip the bikeshedding:
```bash
npm install -D @tsconfig/node22 @tsconfig/strictest
```

```json
{
    "extends": ["@tsconfig/node22/tsconfig.json", "@tsconfig/strictest/tsconfig.json"],
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "src"
    }
}
```

`@tsconfig/strictest` enables every reasonable strictness flag. Highly recommended for new projects.

---

That's the setup layer. Next, the type system itself — `02_basic_types.md`.
