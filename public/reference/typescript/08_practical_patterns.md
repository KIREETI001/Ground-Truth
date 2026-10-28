# 08. Practical Patterns

> Real-world TS patterns — branded types, builders, exhaustiveness, validation with inference, and common idioms in 2026 codebases.

---

## Table of Contents

1. [Branded Types](#1-branded-types)
2. [Builders and Fluent APIs](#2-builders-and-fluent-apis)
3. [Result Types and Error Handling](#3-result-types-and-error-handling)
4. [Validation with Inference (Zod)](#4-validation-with-inference-zod)
5. [Dependency Injection (Functional)](#5-dependency-injection-functional)
6. [Type-Safe Routing](#6-type-safe-routing)
7. [Type-Safe Event Buses](#7-type-safe-event-buses)
8. [Make Illegal States Unrepresentable](#8-make-illegal-states-unrepresentable)
9. [Narrow at the Edge](#9-narrow-at-the-edge)
10. [Common Idioms](#10-common-idioms)

---

## 1. Branded Types

TS is structural. Two types with the same shape are interchangeable:

```typescript
type UserId = number;
type PostId = number;

function getUser(id: UserId) { ... }
const postId: PostId = 42;
getUser(postId);     // OK — both are number
```

Branded types fake nominal typing:

```typescript
type UserId = number & { readonly __brand: "UserId" };
type PostId = number & { readonly __brand: "PostId" };

function getUser(id: UserId) { ... }

const userId = 42 as UserId;
const postId = 42 as PostId;

getUser(userId);     // OK
getUser(postId);     // ERROR — PostId is not UserId
getUser(42);         // ERROR — plain number is not UserId
```

The intersection with `{ __brand: "UserId" }` is a phantom — no runtime cost. At runtime it's a plain number.

### Creating branded values
You need a controlled construction point:
```typescript
function asUserId(n: number): UserId {
    if (!Number.isInteger(n) || n < 0) throw new Error("invalid user id");
    return n as UserId;
}

const id = asUserId(rawId);    // safe — validated
```

The `as` cast inside the constructor is the only place TS is bypassed. Everywhere else, the brand is enforced.

### Using `type-fest`
```typescript
import type { Tagged } from "type-fest";

type UserId = Tagged<number, "UserId">;
type Email = Tagged<string, "Email">;
type ValidatedPassword = Tagged<string, "ValidatedPassword">;
```

### When branding pays
- **Identifiers** that shouldn't be mixed up (UserId vs PostId).
- **Validated data** — `Email` (validated), `NonEmptyString`, `PositiveInt`.
- **Currency amounts** — `Cents` vs `Dollars`.
- **Coordinates** — `Latitude`, `Longitude`.

### When it's overkill
- Throwaway scripts.
- Small apps where the bug class isn't worth the ceremony.
- Code that interfaces with lots of untyped JS.

### Composability
```typescript
async function loadUserFromUrl(url: string) {
    const id = extractIdFromUrl(url);          // returns UserId
    const user = await db.user.findById(id);   // expects UserId
    return user;
}
```

The brand flows through. Refactoring stays type-safe.

---

## 2. Builders and Fluent APIs

A builder pattern with evolving generic state:

```typescript
class QueryBuilder<T, Selected = T> {
    private _from!: string;
    private _selected: (keyof T)[] = [];
    private _filters: ((item: T) => boolean)[] = [];

    from<K extends string>(table: K): QueryBuilder<T, T> {
        this._from = table;
        return this;
    }

    select<K extends keyof T>(keys: K[]): QueryBuilder<T, Pick<T, K>> {
        this._selected = keys;
        return this as unknown as QueryBuilder<T, Pick<T, K>>;
    }

    where(predicate: (item: T) => boolean): this {
        this._filters.push(predicate);
        return this;
    }

    async execute(): Promise<Selected[]> {
        // ...
        return [];
    }
}

const result = await new QueryBuilder<User>()
    .from("users")
    .select(["id", "name"])
    .where(u => u.age > 18)
    .execute();
// result: Pick<User, "id" | "name">[]
```

The return type of each step is precisely what's been selected. This is how libraries like Kysely and Drizzle stay type-safe through method chains.

### Phantom builder state
For step-by-step builders where order matters:

```typescript
type Empty = { _state: "empty" };
type WithHost = { _state: "withHost"; host: string };
type WithPort = WithHost & { port: number };
type Ready = WithPort & { _state: "ready" };

class ConnectionBuilder<State> {
    private state: any = {};

    setHost(host: string): ConnectionBuilder<WithHost> {
        this.state.host = host;
        return this as any;
    }

    setPort(this: ConnectionBuilder<WithHost>, port: number): ConnectionBuilder<WithPort> {
        this.state.port = port;
        return this as any;
    }

    build(this: ConnectionBuilder<WithPort>): Connection {
        return new Connection(this.state.host, this.state.port);
    }
}

const conn = new ConnectionBuilder()
    .setHost("localhost")
    .setPort(5432)
    .build();

// Errors at compile time:
new ConnectionBuilder().setPort(5432);     // ERROR — setHost not called
new ConnectionBuilder().setHost("...").build();    // ERROR — port missing
```

The `this:` parameter constraint enforces what state the method requires. Heavy but powerful for fluent APIs that must enforce ordering.

---

## 3. Result Types and Error Handling

Some TS codebases avoid exceptions for expected failure cases, using a `Result` type:

```typescript
type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
    return { ok: false, error };
}

async function fetchUser(id: number): Promise<Result<User, "not_found" | "network">> {
    try {
        const r = await fetch(`/users/${id}`);
        if (r.status === 404) return err("not_found");
        if (!r.ok) return err("network");
        return ok(await r.json() as User);
    } catch {
        return err("network");
    }
}

const r = await fetchUser(1);
if (r.ok) {
    console.log(r.value.name);
} else if (r.error === "not_found") {
    // ...
}
```

### Pros
- Forces callers to handle errors.
- Error types are explicit in the signature.
- No "what if this throws" surprises.

### Cons
- Verbose — every level passes results around.
- Less idiomatic JS — most libraries throw.
- Mapping over results requires utility methods or libraries.

### Libraries
- **`neverthrow`** — `Result` and `ResultAsync` with chainable methods.
- **`effect-ts`** (Effect) — full-fledged effect system; powerful but a paradigm shift.

### Pragmatic middle ground
Use `Result` for **expected failures** at boundaries (HTTP responses, parsing); throw for **unexpected** failures (programmer bugs). Most TS code does this implicitly.

---

## 4. Validation with Inference (Zod)

Define a schema once, get the type, the validator, and the JSON Schema.

```typescript
import { z } from "zod";

const UserSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    role: z.enum(["admin", "user", "guest"]),
    metadata: z.record(z.string()).optional(),
});

type User = z.infer<typeof UserSchema>;
// {
//     id: number;
//     name: string;
//     email: string;
//     role: "admin" | "user" | "guest";
//     metadata?: Record<string, string>;
// }

// Parse — throws on invalid
const user = UserSchema.parse(JSON.parse(input));

// Safe parse — returns result object
const result = UserSchema.safeParse(JSON.parse(input));
if (!result.success) {
    console.error(result.error.flatten());
} else {
    const user = result.data;
}
```

### Composition
```typescript
const CreateUser = UserSchema.omit({ id: true });
const UpdateUser = UserSchema.partial().omit({ id: true });
const UserResponse = UserSchema.extend({
    createdAt: z.date(),
    avatarUrl: z.string().url().optional(),
});
```

### Pattern: schema = source of truth
```typescript
// schema.ts
export const ProductSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number().nonnegative(),
});
export type Product = z.infer<typeof ProductSchema>;

// Used everywhere:
// - API validation: ProductSchema.parse(req.body)
// - DB row validation: ProductSchema.parse(row)
// - Frontend form: zodResolver(ProductSchema)
// - Tests: ProductSchema.parse(fixture)
```

One file defines the shape, all layers stay in sync.

### Transforming and refining
```typescript
const DateString = z.string().transform(s => new Date(s));
// .parse("2024-01-01") → Date object

const Password = z.string().min(8).refine(
    s => /[A-Z]/.test(s) && /\d/.test(s),
    "must contain uppercase and digit",
);
```

### Async refinements
```typescript
const Email = z.string().email().refine(
    async (email) => {
        const taken = await db.user.findByEmail(email);
        return !taken;
    },
    { message: "Email already in use" },
);

// Use parseAsync:
await UserSchema.parseAsync(input);
```

### Alternatives
- **Valibot** — smaller bundle (~90% less), similar API.
- **ArkType** — TS-like syntax for schemas.
- **TypeBox** — JSON Schema-first, fast.
- **Yup** — older.

In 2026, Zod is dominant for full apps; Valibot/ArkType for client-side / edge where bundle size matters.

---

## 5. Dependency Injection (Functional)

Class-based DI (NestJS-style) was covered in `06_classes_and_decorators.md`. The functional alternative is simpler:

```typescript
type Logger = { info: (msg: string) => void; error: (msg: string) => void };
type Database = { user: { findById: (id: number) => Promise<User | null> } };

type Deps = {
    logger: Logger;
    db: Database;
};

export function createUserService({ logger, db }: Deps) {
    return {
        async getUser(id: number) {
            logger.info(`fetching user ${id}`);
            const user = await db.user.findById(id);
            if (!user) logger.error(`user ${id} not found`);
            return user;
        },
    };
}

// Wiring at startup
const userService = createUserService({
    logger: pino(),
    db: prisma,
});

// Tests
const fakeLogger = { info: vi.fn(), error: vi.fn() };
const fakeDb = { user: { findById: vi.fn().mockResolvedValue(testUser) } };
const svc = createUserService({ logger: fakeLogger, db: fakeDb });
```

### Pros
- No framework / decorator runtime.
- Trivially testable.
- Explicit dependencies — read the function signature.
- `type Deps` gives clear documentation.

### Cons
- Manual wiring for large apps (but a single root file is usually fine).
- No automatic discovery.

### When to switch to a DI framework
- NestJS-scale app with hundreds of services.
- Team familiar with Java/.NET-style DI and wants the same patterns.
- Plugin architecture where services discover each other.

For most apps under, say, 50 services, functional DI is simpler.

---

## 6. Type-Safe Routing

Routes that can't be mistyped:

```typescript
type Route =
    | { name: "home" }
    | { name: "user-profile"; params: { userId: number } }
    | { name: "post"; params: { postId: number; tab?: "comments" | "edit" } };

function url(route: Route): string {
    switch (route.name) {
        case "home": return "/";
        case "user-profile": return `/users/${route.params.userId}`;
        case "post":
            const base = `/posts/${route.params.postId}`;
            return route.params.tab ? `${base}/${route.params.tab}` : base;
    }
}

url({ name: "user-profile", params: { userId: 1 } });
url({ name: "post", params: { postId: 42, tab: "comments" } });
url({ name: "post", params: { postId: 42 } });
url({ name: "unknown" });       // ERROR
url({ name: "user-profile" });   // ERROR — missing params
```

Libraries that do this at scale:
- **TanStack Router** — full type-safe routing for React.
- **Hono** — backend route handlers with typed paths and params.
- **tRPC** — RPC with full type safety end-to-end.

### Hono example
```typescript
import { Hono } from "hono";

const app = new Hono()
    .get("/users/:id", c => {
        const id = c.req.param("id");      // string (path params are always strings)
        return c.json({ id });
    });

export type AppType = typeof app;

// Client (Hono RPC)
import { hc } from "hono/client";
const client = hc<AppType>("/api");

const res = await client.users[":id"].$get({ param: { id: "1" } });
const data = await res.json();      // typed!
```

---

## 7. Type-Safe Event Buses

```typescript
type EventMap = {
    "user:created": { userId: number; timestamp: Date };
    "user:deleted": { userId: number; reason: string };
    "post:published": { postId: number; title: string };
};

class TypedEmitter<TMap extends Record<string, any>> {
    private handlers = new Map<keyof TMap, Set<(payload: any) => void>>();

    on<K extends keyof TMap>(event: K, handler: (payload: TMap[K]) => void): () => void {
        let set = this.handlers.get(event);
        if (!set) {
            set = new Set();
            this.handlers.set(event, set);
        }
        set.add(handler);
        return () => set!.delete(handler);     // unsubscribe
    }

    emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
        this.handlers.get(event)?.forEach(h => h(payload));
    }
}

const bus = new TypedEmitter<EventMap>();

bus.on("user:created", ({ userId, timestamp }) => {
    console.log(`User ${userId} created at ${timestamp.toISOString()}`);
});

bus.emit("user:created", { userId: 1, timestamp: new Date() });
bus.emit("user:created", { userId: 1 });           // ERROR — missing timestamp
bus.emit("unknown:event", {});                     // ERROR — unknown event
```

Foundation for typed pub/sub, state machine transitions, message bus libraries.

---

## 8. Make Illegal States Unrepresentable

```typescript
// BAD — many impossible combinations
type RequestState = {
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    data?: User[];
    error?: Error;
};
// What does isLoading: true, isSuccess: true mean? Nothing — but it compiles.

// GOOD — discriminated union, only valid combinations
type RequestState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: User[] }
    | { status: "error"; error: Error };
```

If you can express "I have data" without also expressing "loading", you'll eventually represent a state that doesn't make sense.

### Form state example
```typescript
// BAD
type FormState = {
    values: Record<string, string>;
    errors: Record<string, string>;
    isSubmitting: boolean;
    isSubmitted: boolean;
    submitError?: string;
};

// BETTER
type FormState<T> =
    | { phase: "editing"; values: T; errors: Partial<Record<keyof T, string>> }
    | { phase: "submitting"; values: T }
    | { phase: "submitted"; result: SubmitResult<T> }
    | { phase: "error"; values: T; error: string };
```

The phases capture what's true at each point. The UI's switch statement handles each.

### Refactor heuristic
Look at your type. Pick two boolean / optional fields. Are all 4 combinations meaningful? If not, refactor to a union with a discriminant.

---

## 9. Narrow at the Edge

External data is `unknown`. Validate at the boundary; trust the type internally.

```typescript
// Boundary — HTTP handler
async function handleCreateUser(req: Request, res: Response) {
    const body: unknown = req.body;
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
    }
    const user = await createUser(parsed.data);     // strongly typed inside
    res.json(user);
}

// Interior — fully typed
async function createUser(input: CreateUserInput): Promise<User> {
    const hashed = await hashPassword(input.password);
    return db.user.create({ data: { ...input, password: hashed } });
}
```

### Boundaries to validate
- HTTP request bodies, query params, headers.
- Database row reads (rarely needed with ORM-generated types, but useful for raw queries).
- File contents read from disk.
- IPC / WebSocket messages.
- Environment variables.
- Third-party API responses.

### Inside the boundary
Everything is typed. No `any`. No `as` casts.

This separation keeps the "uncertain" code in one place and lets the rest of the program assume safety.

---

## 10. Common Idioms

### `as const` for literal type extraction
```typescript
const ROLES = ["admin", "user", "guest"] as const;
type Role = typeof ROLES[number];      // "admin" | "user" | "guest"

ROLES.includes("admin");
function checkRole(r: string): r is Role {
    return (ROLES as readonly string[]).includes(r);
}
```

### `satisfies` for config objects
```typescript
type Config = Record<string, { host: string; port: number }>;

const config = {
    db: { host: "localhost", port: 5432 },
    redis: { host: "localhost", port: 6379 },
} satisfies Config;

config.db.host;     // string — TS knows it's "localhost"
config.db.port;     // number — TS knows it's 5432
config.unknown;      // ERROR — not a key
```

`satisfies` checks the constraint without widening the inferred type.

### Returning empty types correctly
```typescript
function makeEmptyArray<T>(): T[] {
    return [];
}

// At call site:
const xs: number[] = makeEmptyArray();          // T inferred from annotation
const ys = makeEmptyArray<number>();             // explicit
```

### Type guards for `Array.filter`
```typescript
const items: (string | null)[] = ["a", null, "b", null, "c"];

// Doesn't work — TS infers (string | null)[]
const strings = items.filter(x => x !== null);

// Works — type predicate
const strings = items.filter((x): x is string => x !== null);

// Or:
function isNotNull<T>(x: T | null): x is T {
    return x !== null;
}
const strings = items.filter(isNotNull);
```

### `keyof typeof` pattern for enums-from-objects
```typescript
const RoleNames = {
    ADMIN: "admin",
    USER: "user",
    GUEST: "guest",
} as const;
type Role = (typeof RoleNames)[keyof typeof RoleNames];
// "admin" | "user" | "guest"
```

### `Omit` for "everything except"
```typescript
type DBUser = { id: number; password: string; email: string; name: string };
type ApiUser = Omit<DBUser, "password">;        // never expose password
```

### `Partial` for updates
```typescript
async function updateUser(id: number, patch: Partial<DBUser>): Promise<DBUser> {
    return db.user.update({ where: { id }, data: patch });
}
```

### `Awaited` for async returns
```typescript
async function fetchUser() { return { id: 1, name: "A" }; }
type User = Awaited<ReturnType<typeof fetchUser>>;
```

### Exhaustiveness via `never`
```typescript
function assertNever(x: never): never {
    throw new Error(`Unhandled: ${JSON.stringify(x)}`);
}

switch (kind) {
    case "a": ...
    case "b": ...
    default: assertNever(kind);
}
```

### Const assertions for tuples
```typescript
const point = [1, 2] as const;       // readonly [1, 2]
const labels = ["x", "y", "z"] as const;
function getLabel(i: number) { return labels[i]; }
```

### Optional chaining as type narrowing
```typescript
const name = user?.profile?.name;   // string | undefined
if (name) { ... }
```

### `??` for safe defaults
```typescript
const port = config.port ?? 3000;   // 3000 if null/undefined, but 0 stays as 0
```

`??` is null-coalescing — not falsiness. `||` would replace 0 with 3000.

### Readonly arrays in function signatures
```typescript
// Don't mutate the caller's array
function sum(nums: readonly number[]): number {
    return nums.reduce((a, b) => a + b, 0);
}
```

Documents intent and prevents accidental mutation.

### Avoid `Boolean` constructor in filter
```typescript
const filtered = items.filter(Boolean);    // typed as (T | undefined)[] in older TS
// Use:
const filtered = items.filter((x): x is NonNullable<typeof x> => x != null);
```

TS 5+ improved this; check your version.

### Don't return `Promise.all` directly without typing
```typescript
const results = await Promise.all([fetchA(), fetchB(), fetchC()]);
// results: [A, B, C] — tuple, not array
```

When that's exactly what you want, great. When you want a homogeneous array, ensure all returns are the same type.

---

That's the practical layer. Real TS work shifts between these patterns based on the problem. Most files have a handful — the goal isn't to use them all, but to recognize when one fits.

Last file: tooling, performance, and the gnarly pitfall list — `09_tooling_and_advanced.md`.
