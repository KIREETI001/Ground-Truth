# TypeScript — Reference Library

A focused reference for the **type system that TypeScript adds on top of JavaScript**. Read alongside the `javascript/` folder — most of the runtime behavior, async model, browser/Node APIs, and language idioms are identical. This folder is about what TS adds: static types, generics, declaration files, tsconfig, and the tooling ecosystem.

---

## How to navigate this folder

| # | File | What's in it |
|---|---|---|
| — | `README.md` | This file. Mental model, when to use TS, how it relates to JS. |
| 01 | `01_setup_and_tsconfig.md` | Installing TS, choosing a runtime, dissecting `tsconfig.json`. |
| 02 | `02_basic_types.md` | Primitive types, arrays, objects, type aliases, interfaces. |
| 03 | `03_unions_and_narrowing.md` | Union types, type guards, narrowing, discriminated unions. |
| 04 | `04_generics.md` | Generic functions, classes, constraints, defaults. |
| 05 | `05_advanced_types.md` | Mapped types, conditional types, template literal types, utility types. |
| 06 | `06_classes_and_decorators.md` | TS class features beyond JS, decorators (Stage 3). |
| 07 | `07_modules_and_declarations.md` | Module resolution, ambient declarations, `.d.ts` files, library typings. |
| 08 | `08_practical_patterns.md` | Real-world patterns — branding, builders, exhaustiveness checks, common idioms. |
| 09 | `09_tooling_and_advanced.md` | Project references, build tools (tsc, swc, tsup, esbuild), DX tips, common pitfalls. |

---

## What TypeScript is

TypeScript is **JavaScript + static types**. The `tsc` compiler erases types and outputs JavaScript. The runtime is JS — there is no "TS engine."

What this means in practice:
- Every valid JS program is valid TS (you can rename `.js` to `.ts` and gradually add types).
- All JS APIs, idioms, and gotchas apply unchanged.
- Types only exist at compile time. Don't expect them at runtime.
- For runtime validation, use Zod / Valibot — types alone can't check user input.

---

## Why use TypeScript in 2026

By 2026 the question is more "why *not*" than "why."

Concrete wins:
- **Autocomplete** that knows the shape of your data — including library APIs.
- **Refactoring** with confidence — rename a function, the compiler shows every caller.
- **API contracts** that survive teams and years.
- **Fewer "undefined is not a function"** bugs.
- **Documentation by code** — type signatures express intent better than JSDoc.
- **Type-driven design** — once your types are right, the implementation often writes itself.

Costs:
- **Setup overhead** — tsconfig, build step (or `tsx` / `bun`).
- **Initial type acrobatics** — generics, conditional types take time to learn.
- **`any` escape hatch** — easy to undermine the whole project if you're not careful.
- **Build time** — `tsc` is slow on large codebases (`swc`, `esbuild`, Bun help).

For anything beyond a small script: **use TypeScript**. The JS ecosystem assumes it — most libraries ship types, frameworks are TS-first, AI tools work better with typed code.

---

## How "strict" is strict

TypeScript can run from "JS with a few hints" to "everything strongly typed including impossible-to-reach branches." Common stances:

- **`strict: false`** — adds types where convenient, lets you ship JS that happens to compile. Avoid for new code.
- **`strict: true`** — recommended baseline. Catches the most common bugs.
- **`strict: true` + extras** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`) — what serious projects use.

New project: go fully strict on day one. Adding strictness later is a slog.

---

## Reading order

1. **Brand new to TS?** `01_setup_and_tsconfig.md` → `02_basic_types.md` → `03_unions_and_narrowing.md`. That's enough to be productive.
2. **Building libraries / writing reusable utilities?** Add `04_generics.md` and `05_advanced_types.md`.
3. **Migrating from JS?** `07_modules_and_declarations.md` for handling untyped JS modules.
4. **Got it working but want to write idiomatic TS?** `08_practical_patterns.md`.
5. **Maintaining a large codebase / library?** `09_tooling_and_advanced.md`.

This folder doesn't repeat the JS basics — variables, loops, async, classes are all in `../javascript/`. If a concept feels missing, it's there.

---

## Things the type system is great at

- Catching shape mismatches at compile time.
- Discriminating between variants of a union.
- Inferring return types and intermediate values.
- Constraining APIs so users can't pass garbage.
- Documenting libraries — types are the docs that don't lie.

## Things the type system can't do

- **Validate runtime input.** Use Zod.
- **Detect logic errors** within correctly-typed code.
- **Replace tests.** Types prove shapes; tests prove behavior.
- **Catch all bugs.** TS catches a class of bugs — not all. Reviews and tests still matter.
- **Make slow code fast.** Types disappear at runtime; performance is JS performance.

---

## Version

TypeScript moves fast. This reference targets **TypeScript 5.x** (current in 2026). New features in recent versions:
- `satisfies` operator (4.9)
- `const` type parameters (5.0)
- `using` declarations for explicit resource management (5.2)
- Tighter inference for generic constraints
- Performance improvements (esp. for large projects)

Most patterns here are stable across 5.x. When something is recent, I'll note the version.

Now: `01_setup_and_tsconfig.md`.
