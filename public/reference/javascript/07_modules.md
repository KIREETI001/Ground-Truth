# 07. Modules & Packages

> ES Modules, CommonJS, dynamic imports, npm packages, package.json, and monorepos.

---

## Table of Contents

1. [Why Modules](#1-why-modules)
2. [ES Modules](#2-es-modules)
3. [CommonJS (Legacy but Common)](#3-commonjs-legacy-but-common)
4. [ESM vs CommonJS Interop](#4-esm-vs-commonjs-interop)
5. [Dynamic Imports](#5-dynamic-imports)
6. [Path Specifiers](#6-path-specifiers)
7. [npm and the Registry](#7-npm-and-the-registry)
8. [package.json `exports`](#8-packagejson-exports)
9. [Authoring a Package](#9-authoring-a-package)
10. [Monorepos](#10-monorepos)
11. [Common Module Problems](#11-common-module-problems)

---

## 1. Why Modules

Until ES2015, JavaScript had no native module system. You loaded scripts via `<script>` tags, everything went into the global scope, and tools (CommonJS, AMD, RequireJS) papered over the gap. ES Modules are now the standard everywhere — browsers, Node, Bun, Deno.

What modules give you:
- Real **isolation** — variables in one file don't leak to others.
- **Explicit imports/exports** — clear dependencies.
- **Static analysis** — bundlers can tree-shake, tools can lint.
- **Top-level `await`** in modules (since ES2022).

---

## 2. ES Modules

### Named exports
```javascript
// math.js
export const PI = 3.14159;
export function square(x) { return x * x; }
export class Vector { ... }
```

```javascript
// main.js
import { PI, square, Vector } from "./math.js";
import { square as sq } from "./math.js";       // rename
import * as math from "./math.js";              // namespace
math.PI; math.square(5);
```

### Default export
```javascript
// logger.js
export default function log(msg) { ... }

// or
function log(msg) { ... }
export default log;
```

```javascript
import log from "./logger.js";          // no braces for default
import myLog from "./logger.js";         // can name it anything
import log, { LogLevel } from "./logger.js";    // default + named
```

### Re-export (barrel files)
```javascript
// index.js
export { foo } from "./foo.js";
export { bar } from "./bar.js";
export * from "./utils.js";
export { default as Logger } from "./logger.js";
```

Useful for public APIs of packages. **Don't overuse** — large barrel files prevent tree-shaking and slow down bundling.

### `export` rules
- All exports must be at the **top level** (not inside `if`, functions, etc.).
- Module evaluation is **lazy** — the code runs the first time it's imported.
- Modules are evaluated **once** per process — subsequent imports return the same instance.
- Exports are **live bindings**, not copies — the importer sees current values.

```javascript
// counter.js
export let count = 0;
export function increment() { count++; }
```

```javascript
// main.js
import { count, increment } from "./counter.js";
console.log(count);     // 0
increment();
console.log(count);     // 1 — yes, this updates
count++;                 // TypeError — imported bindings are read-only
```

### File extensions
**Always include the extension in import paths**: `"./math.js"`, not `"./math"`. ES modules require it. Some bundlers and Node configurations allow extensionless imports — they're not standard, and TypeScript users in `module: "nodenext"` must use them.

Funny consequence: importing TypeScript files uses `.js` extensions, even though the file on disk is `.ts`. The compiler / runtime resolves it.

---

## 3. CommonJS (Legacy but Common)

The Node-original module system. Still everywhere — millions of packages use it.

```javascript
// utils.js (CommonJS)
function add(a, b) { return a + b; }
function sub(a, b) { return a - b; }
module.exports = { add, sub };

// Or single default
module.exports = function() { ... };
```

```javascript
// main.js
const { add, sub } = require("./utils.js");
const utils = require("./utils.js");
const single = require("./single-export.js");
```

### Differences from ESM
- `require` is **synchronous** and works at any point in the code.
- `module.exports` / `exports.foo` instead of `export`.
- File extensions are optional (`require("./utils")` works).
- No top-level `await`.
- Each module gets a fresh `module`, `exports`, `__filename`, `__dirname`.

### How Node picks the format
- `.cjs` → always CommonJS.
- `.mjs` → always ES module.
- `.js` → depends on `"type"` in the nearest `package.json`:
  - `"type": "module"` → ESM.
  - `"type": "commonjs"` (or absent) → CommonJS.

### `__dirname` / `__filename` in ESM
CommonJS provides these as magic variables. In ESM you compute them:
```javascript
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Or (Node 20.11+):
const __dirname = import.meta.dirname;
const __filename = import.meta.filename;
```

---

## 4. ESM vs CommonJS Interop

The pain. Some libraries are CJS-only, some ESM-only, your code may want either.

### Importing CJS from ESM
Generally just works:
```javascript
import express from "express";        // express is CJS
import { existsSync } from "node:fs";  // node:fs is CJS
```

Sometimes named imports don't work because CJS modules don't expose them statically:
```javascript
import { something } from "old-cjs-pkg";   // ERROR: not a named export
import oldPkg from "old-cjs-pkg";
const { something } = oldPkg;
```

### Importing ESM from CJS
You can't use `require` for ESM. Use dynamic `import`:
```javascript
// In a CJS file
(async () => {
    const { foo } = await import("modern-esm-pkg");
})();
```

Or convert your file to ESM (rename to `.mjs` or set `"type": "module"`).

### The "ERR_REQUIRE_ESM" error
Means: a CJS file tried to `require()` an ESM package. Fixes:
- Convert your file to ESM.
- Use dynamic `import()`.
- Find a CJS-compatible version of the package (some publish dual builds).

### Dual-published packages
Many libraries ship both formats:
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 2026 reality
Most active packages are ESM-first or dual. CommonJS-only is increasingly a sign of an abandoned package. New projects: go ESM.

---

## 5. Dynamic Imports

`import()` is a function-like syntax that returns a Promise.

```javascript
const { foo } = await import("./module.js");
const lib = await import("./lib.js");
lib.default;
lib.namedExport;
```

### Use cases
- **Lazy loading** in browsers — load code only when needed.
- **Conditional imports** based on runtime info.
- **Importing ESM from CJS**.
- **Server-side optional dependencies** — only load if available.

```javascript
// Lazy-load a heavy library
if (userClickedChartButton) {
    const { Chart } = await import("./chart.js");
    new Chart(...).render();
}

// Conditional
const driver = process.env.DB === "pg"
    ? await import("./pg.js")
    : await import("./sqlite.js");

// Try-optional
try {
    const { sharp } = await import("sharp");
    return sharp(buf).resize(800).toBuffer();
} catch {
    return buf;     // sharp not installed, fallback
}
```

Bundlers respect dynamic `import()` and code-split — the imported chunk becomes a separate JS file loaded on demand.

---

## 6. Path Specifiers

Imports take a **specifier**:

| Specifier | Meaning |
|---|---|
| `"./foo.js"`, `"../bar.js"` | Relative path |
| `"/abs/foo.js"` | Absolute path (rare) |
| `"foo"` | Package from `node_modules` |
| `"foo/sub"` | Subpath of a package |
| `"node:fs"`, `"node:path"` | Built-in Node module |
| `"https://..."` (Deno/Bun) | Remote import |

### Built-in modules
Node provides core modules under the `node:` prefix (mandatory in ESM):
```javascript
import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
```

In CJS you sometimes see them without the prefix (`require("fs")`) but the prefix is the future-proof form.

### Path aliases (TypeScript / bundlers)
You can configure `@/...` or similar to point at `src/`:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

```javascript
import { foo } from "@/utils/foo";    // resolves to src/utils/foo
```

In Node alone (no bundler), use `imports` in package.json:
```json
{
  "imports": {
    "#utils/*": "./src/utils/*.js"
  }
}
```

```javascript
import { foo } from "#utils/foo";
```

---

## 7. npm and the Registry

The npm registry hosts ~3 million packages. Use it well.

### Installing
```bash
npm install <pkg>                    # adds to dependencies
npm install -D <pkg>                  # devDependencies
npm install <pkg>@1.2.3              # specific version
npm install <pkg>@latest
npm install <pkg>@^2.0.0              # version range
npm install <pkg> <pkg2>             # multiple at once

npm uninstall <pkg>
npm update                            # update within ranges
npm outdated                          # show packages with available updates
```

### Versions
- `1.2.3` — exact.
- `^1.2.3` — minor + patch updates OK. Default for `npm install`.
- `~1.2.3` — patch updates only.
- `>=1.2.3 <2.0.0` — manual range.
- `latest`, `*` — any version. Don't.

### Lockfile
Whatever your package manager produces (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`) — **commit it**. Otherwise different machines / CI / production get different versions and weird bugs.

### Scoped packages
```bash
npm install @types/node              # scoped under @types
npm install @your-org/internal-lib   # private to your org
```

Scopes can be private. Public scoped packages are free; private require a paid npm plan or use a private registry.

### npx / package execution
```bash
npx eslint .                          # run eslint without installing globally
npx create-vite my-app                # bootstrap a new project
```

`npx` resolves a package, downloads it if needed (cached), runs it. Equivalents: `pnpm exec`, `bun x`.

### Local linking (when developing a package)
```bash
cd ../my-lib && npm link             # publish to local npm
cd ../my-app && npm link my-lib       # use the local version
```

Better alternative for monorepos: use workspaces (see below).

### Security
- `npm audit` shows known vulnerabilities.
- `npm audit fix` updates within version ranges to fix.
- Use tools like Dependabot/Renovate for automated PRs.
- Be careful with new packages — typosquatting and supply-chain attacks happen.

---

## 8. package.json `exports`

The modern way to control what a package exposes.

```json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils.js",
      "types": "./dist/utils.d.ts"
    },
    "./package.json": "./package.json"
  }
}
```

Consumers can do:
```javascript
import x from "my-lib";              // → ./dist/index.js
import y from "my-lib/utils";        // → ./dist/utils.js
import z from "my-lib/private";      // ERROR — not in exports
```

### Why exports map matters
- **Encapsulation** — only listed paths are importable. Consumers can't reach into your `src/` or `internal/`.
- **Conditional resolution** — `"import"` vs `"require"` vs `"browser"` vs `"node"`.
- **Type files** — `"types"` for TypeScript consumers.

### Older fields (still supported)
- `"main"` — entry point for CJS.
- `"module"` — entry for ESM (bundler convention, not in Node).
- `"types"` / `"typings"` — TypeScript declarations.
- `"browser"` — bundler-specific browser entry.

Modern packages use `exports` and skip most of these.

---

## 9. Authoring a Package

A minimal publishable package:

```
my-pkg/
├── package.json
├── README.md
├── LICENSE
├── src/
│   └── index.ts
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── index.cjs
└── tsconfig.json
```

### `package.json`
```json
{
  "name": "my-pkg",
  "version": "0.1.0",
  "description": "A small example",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "engines": { "node": ">=18" },
  "keywords": ["example"],
  "license": "MIT",
  "repository": "github:you/my-pkg",
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "test": "vitest",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

### Building dual ESM/CJS
Use **tsup** (recommended), **unbuild**, or **rollup** with plugins. Building both formats lets your package work with any consumer.

```bash
npm install -D tsup
npx tsup src/index.ts --format esm,cjs --dts --clean
```

### Publishing
```bash
npm login
npm publish                          # publishes the current version
npm publish --access public           # required for scoped packages
npm publish --tag beta                # under a non-latest tag
```

### Semantic versioning
- **MAJOR** — breaking changes.
- **MINOR** — new features, backward-compatible.
- **PATCH** — bug fixes.

Use **Changesets** (or **semantic-release**) for managed version bumps in real projects.

### What goes in the package
- **`files`** field controls what's included. Defaults include the right things; explicit is safer.
- **`.npmignore`** is a fallback (most teams use `files` instead).
- Don't ship source if you ship built output — but consider shipping `dist` + sourcemaps + types.

---

## 10. Monorepos

A single git repo containing multiple packages or apps. Common in 2026 — easier to share code, refactor cross-package.

### Workspaces (built into npm / pnpm / yarn / bun)
```json
// root package.json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
```

Or with pnpm:
```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

Layout:
```
my-monorepo/
├── package.json
├── pnpm-workspace.yaml
├── packages/
│   ├── shared/         (utility lib)
│   ├── ui/             (React components)
│   └── api-client/     (auto-generated)
└── apps/
    ├── web/             (Next.js)
    └── server/          (Node API)
```

`apps/web/package.json`:
```json
{
  "dependencies": {
    "@my/shared": "workspace:*",
    "@my/ui": "workspace:*"
  }
}
```

`pnpm install` at the root links everything correctly. Changes in `packages/shared` are immediately visible in `apps/web`.

### Tooling on top
- **Turborepo** — task orchestration with caching. `turbo run build test lint` figures out dependency order and skips unchanged work.
- **Nx** — heavier-weight; great for big repos with many apps.
- **Changesets** — for versioning and publishing multiple packages with clear changelogs.

### When to monorepo
- Multiple apps sharing code (frontend, mobile, server).
- Many internal libraries you ship together.
- A team needing atomic cross-package changes.

### When NOT to
- Two unrelated projects — keep them separate.
- One small app — single-repo is simpler.

---

## 11. Common Module Problems

### "Cannot use import statement outside a module"
Your file is being treated as CommonJS. Fix:
- Add `"type": "module"` to package.json, OR
- Rename file to `.mjs`, OR
- Use `require` instead of `import`.

### "ERR_REQUIRE_ESM"
Trying to `require()` an ESM-only package. Fix:
- Switch your code to ESM.
- Use dynamic `import()` inside the CJS file.

### "Cannot find module 'X'"
- Did you install it? Did the install succeed?
- Are you in the right directory?
- For TypeScript: missing `@types/X` package?
- Bundler resolves differently than Node?

### "ERR_UNSUPPORTED_DIR_IMPORT"
ESM doesn't auto-resolve directories. `import foo from "./folder"` fails. Use:
```javascript
import foo from "./folder/index.js";
```
Or set `"exports": { ".": "./folder/index.js" }` in that folder's package.json.

### Mixed default and named imports
```javascript
import x, { y } from "pkg";        // default x + named y
```

Works for ESM, but on CJS interop, named bindings sometimes don't work. Fall back to:
```javascript
import pkg from "pkg";
const { y } = pkg;
```

### TypeScript imports use `.js` but the file is `.ts`
TypeScript's module resolution mode `nodenext` requires file extensions in imports. The convention: write `.js` in import paths even though source is `.ts` — the compiler emits `.js` files, and the same paths work at runtime.

```typescript
import { foo } from "./utils.js";   // utils.ts on disk
```

### Two copies of the same package installed
A common source of weird bugs (especially with React: "invalid hook call"). Causes:
- Two packages requesting incompatible versions.
- A symlinked package + an installed package.

Fix: `npm ls <pkg>` to find duplicates; use `overrides` in package.json to force one version.

### Tree-shaking ignored
Tree-shaking is a bundler feature. For it to work:
- Package must be ESM (or have ESM build).
- `"sideEffects": false` in package.json (or list specific files).
- Imports should be `import { foo } from "pkg"`, not `import pkg from "pkg"`.

### Sourcemaps not loading
- Did the build emit them?
- Are they referenced from the bundle (`//# sourceMappingURL=...`)?
- Are they served alongside the JS in production?

### Hoisting and `node_modules` shape
- npm/yarn hoist common dependencies. Mostly fine.
- pnpm doesn't hoist — strict, faster, sometimes exposes "missing peer dependency" issues.
- Yarn Plug'n'Play eliminates `node_modules` entirely. Powerful but niche.

---

Modules look intimidating because they overlap with packaging, runtime config, and tooling. In daily work, the rules are: use ESM, set `"type": "module"`, commit lockfiles, prefer named exports for public APIs. The rest you'll only need when debugging.

Next: handling things going wrong — `08_errors.md`.
