# 07. Modules & Declarations

> Module resolution in TS, `.d.ts` declaration files, ambient declarations, typing untyped JS, and authoring TS libraries.

> For the JS module model (ESM, CJS, dynamic imports, package.json), see `../javascript/07_modules.md`. This file is about TS-specific aspects.

---

## Table of Contents

1. [Module Resolution Modes](#1-module-resolution-modes)
2. [Importing Types](#2-importing-types)
3. [Declaration Files (`.d.ts`)](#3-declaration-files-dts)
4. [Ambient Declarations](#4-ambient-declarations)
5. [Module Augmentation](#5-module-augmentation)
6. [Typing JavaScript Modules](#6-typing-javascript-modules)
7. [Authoring a TS Library](#7-authoring-a-ts-library)
8. [`@types` Packages](#8-types-packages)
9. [Common Module Issues](#9-common-module-issues)

---

## 1. Module Resolution Modes

`moduleResolution` in tsconfig controls how TS finds imported modules.

### `nodenext` (or `node16`)
Mirrors Node's actual ESM/CJS resolution. Use for Node apps.

- Requires file extensions in imports: `import { x } from "./foo.js"`.
- Respects `package.json` `"type"`, `"exports"`, `"imports"`.
- Differentiates ESM and CJS resolution.

### `bundler`
For bundled apps (Vite, Next, Webpack, Rollup). The bundler does final resolution.

- Allows extensionless imports.
- Respects `"exports"` but doesn't enforce ESM file extensions.
- Most modern app projects use this.

### `node` (legacy / classic)
Pre-ESM Node behavior. Don't pick for new projects.

### `classic`
Pre-`node` TS-specific resolution. Don't pick.

### Choosing
- Node application → `nodenext`.
- App built with Vite/Webpack/Next → `bundler`.
- Library → `bundler` (or `nodenext` if you publish dual ESM/CJS and want strict checks).

### Path mapping (`paths`)
```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"],
            "@components/*": ["src/components/*"]
        }
    }
}
```

`paths` works for type-checking. At runtime you need:
- A bundler that handles them (almost all do).
- Or `tsc-alias` / `tsconfig-paths` to rewrite emitted output.
- Or use Node's `imports` field in package.json:
  ```json
  {
      "imports": {
          "#components/*": "./src/components/*.js"
      }
  }
  ```
  Then `import x from "#components/button"`.

The `#`-prefix `imports` work natively in Node — TS picks them up too.

---

## 2. Importing Types

```typescript
import { User } from "./types";          // value + type
import type { User } from "./types";      // type only — erased at compile time

import { type User, fetchUser } from "./api";    // mixed
```

### Why type-only imports
- Prevent circular dependency issues at module load.
- Some bundlers / `isolatedModules` builds can't elide types correctly.
- Documents intent: "I only need the shape, not the value."

With `verbatimModuleSyntax`, you **must** use `import type` for types — TS doesn't auto-elide them. This forces explicit reasoning about which imports are erased vs emitted. Recommended.

```typescript
// With verbatimModuleSyntax
import type { Config } from "./config";       // erased — no runtime cost
import { defaults } from "./config";           // emitted to JS
```

### Importing from libraries that have types co-located
```typescript
import { z } from "zod";
import type { ZodSchema } from "zod";    // type only
```

For libraries with all types in one place, you can import from the package directly. Some libraries publish separate type entries (`zod/types`); usually not needed.

### Re-exporting types
```typescript
// barrel.ts
export type { User } from "./user";
export { fetchUser } from "./api";
```

`export type` doesn't emit anything at runtime — just propagates the type binding.

---

## 3. Declaration Files (`.d.ts`)

A `.d.ts` file contains type declarations only — no runtime code.

```typescript
// types.d.ts
export type User = { id: number; name: string };
export interface Config { apiUrl: string }
export declare function fetchUser(id: number): Promise<User>;
```

Generated automatically when you build a library:
```bash
tsc --declaration --emitDeclarationOnly
```

Or with tsup:
```bash
tsup src/index.ts --dts
```

### Why declaration files matter
- Consumers of your library get types without your source.
- IDEs use them for autocomplete and inline docs.
- `node_modules/<pkg>/dist/index.d.ts` is what TS reads to type your usage.

### Generated vs hand-written
Most TS projects: auto-generate `.d.ts` from `.ts` source.

Hand-written `.d.ts` files are needed when:
- Typing a JS library that doesn't ship types.
- Declaring globals or ambient modules.
- Augmenting library types.

### Declaration maps
```json
{
    "compilerOptions": {
        "declarationMap": true
    }
}
```

Emits `.d.ts.map` files. IDEs can use them to "Go to Definition" → the original `.ts` source rather than the `.d.ts`. Useful for library authors.

---

## 4. Ambient Declarations

Declarations that apply globally without import.

### Global types
```typescript
// global.d.ts
declare global {
    interface Window {
        myCustomProp: string;
        gtag: (event: string, ...args: any[]) => void;
    }
    var __APP_VERSION__: string;
}

export {};       // makes this a module
```

Now `window.myCustomProp` and `__APP_VERSION__` are typed everywhere.

### Ambient modules
For declaring entire modules:
```typescript
// modules.d.ts
declare module "untyped-library" {
    export function magicFunction(input: string): number;
    export const VERSION: string;
}

declare module "*.svg" {
    const content: string;
    export default content;
}

declare module "*.css" {
    const classes: Record<string, string>;
    export default classes;
}
```

The `*.svg` / `*.css` declarations let you `import logo from "./logo.svg"` in code that imports static assets — bundler-dependent.

### `declare` keyword
`declare` means "this exists; trust me." Used:
```typescript
declare const VERSION: string;           // assumed to exist at runtime
declare function gtag(event: string): void;
declare class MyAPI { ... }
declare namespace App { ... }            // legacy
declare module "..." { ... }
declare global { ... }
```

`declare` produces no JS. It's a pure type-system construct.

---

## 5. Module Augmentation

Add to an existing module's types without forking it.

### Augmenting a third-party module
```typescript
// fastify-augment.d.ts
import "fastify";       // make sure fastify is loaded

declare module "fastify" {
    interface FastifyRequest {
        userId?: number;
        user?: User;
    }
}
```

Now `request.user` is typed in every Fastify handler.

### Augmenting global types (DOM)
```typescript
declare global {
    interface HTMLInputElement {
        myCustomMethod(): void;
    }
}
export {};
```

### Common augmentations
- Express / Fastify request — add `user`, `tenant`, `requestId`.
- React `JSX.IntrinsicElements` — add custom Web Components.
- `process.env` — type your environment variables.

```typescript
// env.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
        DATABASE_URL: string;
        JWT_SECRET: string;
        NODE_ENV: "development" | "production" | "test";
    }
}
export {};
```

Now `process.env.DATABASE_URL` is `string` (not `string | undefined`).

**Note**: this is a type-level lie if the env var is actually missing. Real validation should happen at startup (Zod schema).

### Augmenting interfaces vs replacing them
Interface merging means **adding** properties. You can't redefine or remove existing ones. For that, you'd need to fork.

---

## 6. Typing JavaScript Modules

Three options when you import an untyped JS library:

### 1. Use `@types/<lib>` if available
Most popular libraries have a community-maintained types package:
```bash
npm install -D @types/lodash @types/express
```

`@types/*` is the DefinitelyTyped ecosystem — thousands of typing packages.

### 2. Write your own `.d.ts`
```typescript
// types/some-untyped-lib/index.d.ts
declare module "some-untyped-lib" {
    export function doStuff(input: string): number;
    export default function (config: Config): Result;
}
```

Reference it via `typeRoots` or it'll be picked up automatically if it's in your `include` glob.

### 3. Just declare `any`
```typescript
declare module "some-untyped-lib";
```

Now you can import it without errors, but it's typed as `any`. Last resort.

### `// @ts-ignore` and `// @ts-expect-error`
Suppress an error on the next line:
```typescript
// @ts-expect-error — knownIssue: this is fine because XYZ
const x = badLib.something();
```

Use `@ts-expect-error` over `@ts-ignore` — if the underlying issue is fixed, `@ts-expect-error` itself becomes an error, alerting you to remove it.

### `as any` and `as unknown as T`
Type assertions, covered in `02_basic_types.md`. Use sparingly — every `as` is a place TS isn't checking for you.

---

## 7. Authoring a TS Library

A minimal publishable TS library:

```
my-lib/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── ...
└── dist/             # built output
```

### tsconfig.json
```json
{
    "compilerOptions": {
        "target": "es2022",
        "module": "esnext",
        "moduleResolution": "bundler",
        "strict": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": ["src/**/*"]
}
```

### Build with tsup (dual ESM + CJS + types)
```bash
npm install -D tsup
```

```json
{
    "scripts": {
        "build": "tsup src/index.ts --format esm,cjs --dts --clean",
        "typecheck": "tsc --noEmit"
    }
}
```

### package.json exports
```json
{
    "name": "my-lib",
    "version": "1.0.0",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "import": {
                "types": "./dist/index.d.ts",
                "default": "./dist/index.js"
            },
            "require": {
                "types": "./dist/index.d.cts",
                "default": "./dist/index.cjs"
            }
        }
    },
    "files": ["dist"]
}
```

Subpath exports:
```json
{
    "exports": {
        ".": { ... },
        "./utils": {
            "import": "./dist/utils.js",
            "types": "./dist/utils.d.ts"
        }
    }
}
```

### `verbatimModuleSyntax` + dual output
A tricky combo. `tsup` and other modern bundlers handle it. Make sure your `import type` declarations are consistent.

### Testing types in your library
Use **`tsd`** or **`expect-type`** to write type-only tests:
```bash
npm install -D vitest expect-type
```

```typescript
import { expectTypeOf } from "expect-type";
import { fetchUser } from "./api";

it("fetchUser returns Promise<User>", () => {
    expectTypeOf(fetchUser).returns.toMatchTypeOf<Promise<User>>();
    expectTypeOf<Parameters<typeof fetchUser>>().toMatchTypeOf<[number]>();
});
```

Catches inadvertent API drift.

### Publishing checklist
- `npm pack --dry-run` — preview what gets published.
- Test the package in another project via `npm link` or `npm install ../local-path`.
- Use **`publint`** to check your package.json for common mistakes.
- Use **`arethetypeswrong`** to verify your dual ESM/CJS types are correctly exported.
- Run `tsc --noEmit` in CI.
- Tag releases with Changesets or semantic-release.

---

## 8. `@types` Packages

The Definitely Typed (DT) ecosystem. Typings for libraries that don't ship their own.

```bash
npm install -D @types/node @types/lodash @types/express
```

### When to install
- The library doesn't ship types (`package.json` has no `"types"`).
- A community-maintained `@types/<name>` exists.

### Conflicts
Sometimes a library starts shipping types, and `@types/<lib>` becomes stale or wrong. Remove the `@types` package in that case — the bundled types win.

### When `@types` is wrong
- File a PR against [DefinitelyTyped on GitHub](https://github.com/DefinitelyTyped/DefinitelyTyped).
- Use **module augmentation** to fix locally:
  ```typescript
  declare module "some-lib" {
      export function thingTheTypesAreMissing(input: string): number;
  }
  ```

### `skipLibCheck`
Most projects enable `skipLibCheck: true`. Type-checking `node_modules` is slow and often produces errors from `@types` you can't fix. Keep it on.

---

## 9. Common Module Issues

### "Cannot find module 'X' or its corresponding type declarations"
- Did you install it?
- Is there a `@types/<lib>` package you need?
- Does the package have `"types"` or `"exports"` in its package.json?
- Is your `moduleResolution` set correctly?

### "An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled"
- TS doesn't want `.ts` extensions in imports by default.
- For `nodenext`, use `.js` (the post-compile extension).
- For `bundler` mode, use no extension.

### "Module 'X' has no exported member 'Y'"
- The export doesn't exist (typo? renamed?).
- It's a default export, not named.
- It's a type-only export, requiring `import type { Y }`.

### "Cannot use namespace 'X' as a type"
- You're treating a value as a type (or vice versa).
- For ambient namespaces (`React.FC`), this should work — check imports.

### Duplicate declarations across `.d.ts`
If two `.d.ts` files declare the same global, TS errors. Find and consolidate. Often happens with multiple `@types` packages.

### Circular type references
```typescript
type A = { b: B };
type B = { a: A };
```

TS handles this fine. Issues arise when value imports are circular at runtime — refactor to break the cycle.

### Type-only circular imports
```typescript
// a.ts
import type { B } from "./b";    // type only — no runtime cycle
export type A = { b: B };
```

`import type` doesn't create a runtime dependency. Use it to break circular imports.

### `paths` not working at runtime
Type-only feature. At runtime, the bundler / Node resolves modules. Add:
- A bundler that supports them.
- `tsc-alias` to rewrite emit.
- Or use Node's `imports` field in package.json.

### `node_modules` causing slow TS
- `skipLibCheck: true`.
- Use `tsconfig.json` `exclude` to skip large folders.
- Project references for monorepos.

### "Module X resolves to an untyped module"
Library has no types. Solutions in section 6.

### Wrong types loaded
Sometimes TS resolves the wrong typings (e.g., `@types/node` vs Node's own). Check `tsc --traceResolution` for diagnostic info.

### TS version mismatch (editor vs CLI)
- Editor uses bundled TS by default.
- Set `typescript.tsdk` to the workspace TS.
- Restart TS server if errors look stale.

---

That's the module side. Next, the patterns that come up across real TS codebases — `08_practical_patterns.md`.
