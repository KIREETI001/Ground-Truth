# 14. Testing & Code Quality

> Vitest, Jest, Playwright, ESLint, Prettier, TypeScript checking, pre-commit hooks, CI.

---

## Table of Contents

1. [Test Pyramid](#1-test-pyramid)
2. [Vitest](#2-vitest)
3. [Jest](#3-jest)
4. [Component Testing — Testing Library](#4-component-testing--testing-library)
5. [Playwright — End-to-End](#5-playwright--end-to-end)
6. [Mocking](#6-mocking)
7. [Coverage](#7-coverage)
8. [ESLint](#8-eslint)
9. [Prettier](#9-prettier)
10. [TypeScript Checking](#10-typescript-checking)
11. [Pre-commit Hooks](#11-pre-commit-hooks)
12. [CI Integration](#12-ci-integration)

---

## 1. Test Pyramid

Common breakdown:
- **Unit tests** (most) — pure functions, components in isolation. Fast (ms).
- **Integration tests** — multiple units together; sometimes touches a DB.
- **End-to-end tests** (fewest) — full app in a real browser. Slow (seconds each).

A typical good ratio: many unit tests, some integration, a handful of E2E for critical flows.

---

## 2. Vitest

The de facto JS test runner for new projects in 2026. Vite-powered; faster than Jest; better TS support; mostly Jest-compatible API.

```bash
npm install -D vitest
```

```typescript
// math.test.ts
import { describe, it, expect } from "vitest";
import { add, multiply } from "./math";

describe("math", () => {
    it("adds positive numbers", () => {
        expect(add(2, 3)).toBe(5);
    });

    it("multiplies", () => {
        expect(multiply(4, 5)).toBe(20);
    });

    it.skip("future feature", () => { ... });
    it.todo("to be implemented");

    it("matches snapshot", () => {
        expect({ x: 1, y: 2 }).toMatchSnapshot();
    });
});
```

Run:
```bash
npx vitest                # watch mode
npx vitest run             # single run
npx vitest --coverage      # with coverage
npx vitest --ui            # browser UI
```

### Matchers
```typescript
expect(value).toBe(expected);              // ===
expect(obj).toEqual({ x: 1 });             // deep equality
expect(obj).toStrictEqual({ x: 1 });        // also checks type/extra props
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(num).toBeGreaterThan(5);
expect(num).toBeCloseTo(0.3, 5);            // for floats
expect(arr).toContain("item");
expect(arr).toHaveLength(3);
expect(obj).toHaveProperty("name", "Alice");
expect(str).toMatch(/regex/);

// Async
await expect(promise).resolves.toBe(42);
await expect(promise).rejects.toThrow();

// Functions
expect(() => fn()).toThrow(/error/);
expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledTimes(2);
expect(spy).toHaveBeenCalledWith(arg1, arg2);

// Negation
expect(value).not.toBe(undefined);
```

### Setup and teardown
```typescript
import { beforeAll, beforeEach, afterEach, afterAll } from "vitest";

beforeAll(async () => { /* once before all tests */ });
beforeEach(async () => { /* before each */ });
afterEach(async () => { /* after each */ });
afterAll(async () => { /* once after all */ });
```

### Parameterize
```typescript
it.each([
    [1, 2, 3],
    [-1, 1, 0],
    [0, 0, 0],
])("add(%i, %i) = %i", (a, b, expected) => {
    expect(add(a, b)).toBe(expected);
});
```

### Configuration
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: false,                  // require explicit imports of describe/it/expect
        environment: "node",              // or "jsdom", "happy-dom" for component tests
        setupFiles: ["./test/setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            exclude: ["node_modules/", "dist/"],
        },
    },
});
```

---

## 3. Jest

The original. Still everywhere in older codebases.

```bash
npm install -D jest @types/jest ts-jest
```

API is 95% the same as Vitest (Vitest copied it). The pain points with Jest in 2026:
- Slower than Vitest.
- ESM support is still rough; needs config gymnastics for many setups.
- Configuration is heavier.

New project: use Vitest. Existing Jest project: stay until migrating is worth the time.

---

## 4. Component Testing — Testing Library

For React / Vue / Svelte components. Works with both Vitest and Jest.

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

```typescript
// vitest.config.ts — switch environment for component tests
test: { environment: "jsdom" },
```

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Counter } from "./Counter";

it("increments on click", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    expect(screen.getByText("Count: 0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /increment/i }));
    expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
```

### Philosophy
- **Test what the user sees**, not implementation details.
- Query by accessible role/label first, by text second, by test ID last.
- `screen.getByRole("button", { name: /save/i })` reads better than `container.querySelector(".btn-save")`.

### Common queries
```tsx
screen.getByRole("button", { name: "Save" });          // throws if not found
screen.queryByRole("button");                            // returns null if not found
await screen.findByText("Loaded!");                       // async — waits up to 1s

screen.getByLabelText("Email");
screen.getByPlaceholderText("Search");
screen.getByText("Hello");
screen.getByTestId("submit-btn");                          // fallback
```

### Vue / Svelte
- `@testing-library/vue` — same API for Vue.
- `@testing-library/svelte` — same for Svelte.

The patterns translate one-to-one.

---

## 5. Playwright — End-to-End

Drives a real browser. Tests user flows through your actual app.

```bash
npm init playwright@latest
```

```typescript
// e2e/login.spec.ts
import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("secret");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Welcome, Alice")).toBeVisible();
});

test("invalid login shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
});
```

### Features
- Cross-browser (Chromium, Firefox, WebKit).
- Auto-waiting — no manual `setTimeout` / `waitForSelector`.
- Tracing and recording — debugging is excellent.
- Network mocking.
- Mobile emulation.
- API testing (use `request` context).

Run:
```bash
npx playwright test                # all tests
npx playwright test login           # filter
npx playwright test --ui            # interactive UI mode
npx playwright test --headed        # see the browser
npx playwright codegen url          # record actions, generate code
```

### Alternatives
- **Cypress** — popular, easier first impression, but slower and Chromium-only historically. Multi-browser support has improved.
- **WebdriverIO** — Selenium-based, mature.
- **Puppeteer** — lower-level Chromium control; more for scripting than testing.

In 2026, Playwright is the default E2E choice for new projects.

---

## 6. Mocking

### `vi.fn()` / `vi.spyOn()`
```typescript
import { vi } from "vitest";

const mock = vi.fn();
mock("a", "b");
expect(mock).toHaveBeenCalledWith("a", "b");

mock.mockReturnValue(42);
mock();                              // returns 42

mock.mockResolvedValue({ id: 1 });    // for async
await mock();                          // resolves to { id: 1 }

mock.mockImplementation(x => x * 2);   // custom impl

const spy = vi.spyOn(obj, "method");   // wrap existing method
spy.mockReturnValue(...);
spy.mockRestore();                      // restore original
```

### Module mocking
```typescript
// vi.mock at module level — hoisted to top
vi.mock("./api", () => ({
    fetchUser: vi.fn(),
}));

import { fetchUser } from "./api";
import { vi } from "vitest";

beforeEach(() => {
    (fetchUser as any).mockResolvedValue({ id: 1, name: "Alice" });
});
```

### MSW (Mock Service Worker) — for mocking HTTP
The cleanest way to test code that uses `fetch`:
```bash
npm install -D msw
```

```typescript
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
    http.get("/api/users/:id", ({ params }) => {
        return HttpResponse.json({ id: params.id, name: "Alice" });
    }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("loads user", async () => {
    const user = await getUser(1);
    expect(user.name).toBe("Alice");
});
```

Works for unit and integration tests. The same handlers can also run in the browser for development (intercepting fetches in your app).

### What to mock
- **External services** (HTTP APIs, paid services).
- **Slow operations** (databases — sometimes; consider in-memory SQLite instead).
- **Time-dependent code** — use `vi.useFakeTimers()`.

### What NOT to mock
- Your own pure logic — test it directly.
- Things you can reasonably run in-process (in-memory DB, in-process Redis equivalents).

Over-mocking creates tests that pass even when the real code is broken.

---

## 7. Coverage

```bash
npx vitest run --coverage
```

```typescript
// vitest.config.ts
test: {
    coverage: {
        provider: "v8",                 // or "istanbul"
        reporter: ["text", "html", "lcov"],
        exclude: ["**/node_modules/**", "**/dist/**", "**/*.config.*"],
        thresholds: {
            lines: 80,
            functions: 80,
            branches: 70,
        },
    },
},
```

Coverage is a **floor**. 100% coverage with weak assertions is worse than 70% with strong ones. Aim for high coverage of business logic; don't chase coverage of boilerplate.

---

## 8. ESLint

Lints your code for likely bugs and style.

### Modern setup (flat config, ESLint 9+)
```bash
npm install -D eslint @eslint/js typescript-eslint
```

```javascript
// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "no-unused-vars": "warn",
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
);
```

Run:
```bash
npx eslint .
npx eslint . --fix
```

### Useful plugin sets
- **`eslint-plugin-react`**, **`eslint-plugin-react-hooks`** — React rules.
- **`eslint-plugin-jsx-a11y`** — accessibility.
- **`eslint-plugin-import`** — import order, no unresolved modules.
- **`eslint-plugin-unicorn`** — many opinionated, useful rules.
- **`eslint-plugin-n`** — Node-specific.
- **`eslint-plugin-vitest`** / **`eslint-plugin-jest`** — test-specific.

### Biome — the all-in-one alternative
**Biome** combines linter + formatter + organizer in a single Rust-based tool. Much faster than ESLint+Prettier; growing share.

```bash
npm install -D --save-exact @biomejs/biome
npx biome init
npx biome check --apply .
```

If you want speed and one tool, try Biome. Otherwise ESLint + Prettier is still standard.

---

## 9. Prettier

Opinionated code formatter. Don't argue about spacing — let Prettier handle it.

```bash
npm install -D prettier
```

```json
// .prettierrc.json
{
    "semi": true,
    "singleQuote": false,
    "tabWidth": 4,
    "trailingComma": "all",
    "printWidth": 100,
    "arrowParens": "always"
}
```

```bash
npx prettier --write .
npx prettier --check .       # CI verification
```

### Editor integration
VS Code: "Format on Save" with Prettier as default formatter.

### Prettier vs ESLint
- **Prettier** — purely formatting: indentation, quotes, line breaks.
- **ESLint** — code quality: unused vars, dead code, bad patterns.

They overlap on stylistic rules. Modern setup: let Prettier do all formatting, disable conflicting ESLint rules with `eslint-config-prettier`:
```bash
npm install -D eslint-config-prettier
```

```javascript
// eslint.config.js
import prettier from "eslint-config-prettier";

export default [
    ...,
    prettier,         // last — disables ESLint rules that conflict with Prettier
];
```

---

## 10. TypeScript Checking

A test in itself — `tsc --noEmit` catches a lot of bugs ESLint can't.

```bash
npx tsc --noEmit                 # type-check without emitting files
```

```json
// tsconfig.json — typical strict setup
{
    "compilerOptions": {
        "target": "es2022",
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "exactOptionalPropertyTypes": true,
        "noFallthroughCasesInSwitch": true,
        "verbatimModuleSyntax": true,
        "skipLibCheck": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "outDir": "dist",
        "rootDir": "src",
        "noEmit": true                   // when running tsc just for checks
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### Strict mode flags (worth enabling all)
- `strict: true` — turns on the strict family.
- `noUncheckedIndexedAccess` — `arr[i]` becomes `T | undefined`. Catches off-by-one bugs.
- `exactOptionalPropertyTypes` — `{ x?: number }` is `{ x?: number }`, not `{ x?: number | undefined }`.
- `noImplicitOverride` — require `override` keyword.

### Project references and incremental builds
For monorepos / large projects, `tsc --build` with project references is much faster than rebuilding everything.

### Type checking in tests
Tests run with a runtime that strips types (`tsx`, Vitest, Jest with `ts-jest` or `@swc/jest`). Add a separate `tsc --noEmit` step in CI to catch type errors.

---

## 11. Pre-commit Hooks

Run checks before each commit. Catches issues before they hit CI.

### Husky + lint-staged
```bash
npm install -D husky lint-staged
npx husky init
```

```json
// package.json
{
    "scripts": {
        "prepare": "husky"
    },
    "lint-staged": {
        "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
        "*.{json,md,yml}": ["prettier --write"]
    }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

Now every `git commit` lints and formats only the changed files.

### Alternative: simple-git-hooks
Lighter weight; similar setup. Some teams prefer it over Husky.

### Pre-push checks
For heavier checks (full tests, full type check), use a `pre-push` hook or skip and rely on CI.

---

## 12. CI Integration

Run lint, type check, tests on every PR. GitHub Actions example:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
    test:
        runs-on: ubuntu-latest
        strategy:
            matrix:
                node: ["20", "22"]
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
              with:
                  version: 9
            - uses: actions/setup-node@v4
              with:
                  node-version: ${{ matrix.node }}
                  cache: "pnpm"
            - run: pnpm install --frozen-lockfile
            - run: pnpm run lint
            - run: pnpm run typecheck
            - run: pnpm run test --coverage
            - uses: codecov/codecov-action@v4

    e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: "22"
            - run: npm ci
            - run: npx playwright install --with-deps
            - run: npm run build
            - run: npm run test:e2e
```

### CI tips
- **Fail fast** — lint and type check before slow tests.
- **Matrix-test** — multiple Node versions if you publish a library.
- **Cache dependencies** — both setup-node and pnpm-action-setup support caching.
- **Run E2E in parallel** — Playwright supports sharding (`--shard 1/4`).
- **Run only changed code** — Nx and Turborepo skip unchanged packages in monorepos.

### Common quality script in `package.json`
```json
{
    "scripts": {
        "lint": "eslint . --max-warnings 0",
        "format": "prettier --write .",
        "format:check": "prettier --check .",
        "typecheck": "tsc --noEmit",
        "test": "vitest",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage",
        "test:e2e": "playwright test",
        "ci": "npm-run-all -p lint typecheck format:check test:run"
    }
}
```

Now `npm run ci` runs everything in parallel; if any fails, CI fails.

---

Setting all this up is a one-time cost that pays back daily. Don't skip pre-commit hooks "just for now" — that's how lint debt accumulates.

Last file: performance, advanced patterns, and the long pitfalls list — `15_tooling_and_advanced.md`.
