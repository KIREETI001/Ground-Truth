# 03. Unions & Narrowing

> Union types, narrowing, discriminated unions, exhaustiveness checks. The pattern that makes TS code feel like it's writing itself.

---

## Table of Contents

1. [Union Types](#1-union-types)
2. [Intersection Types](#2-intersection-types)
3. [Narrowing](#3-narrowing)
4. [Type Predicates](#4-type-predicates)
5. [Discriminated Unions](#5-discriminated-unions)
6. [Exhaustiveness Checks](#6-exhaustiveness-checks)
7. [Common Patterns](#7-common-patterns)

---

## 1. Union Types

A value that can be one of several types.

```typescript
type ID = number | string;

function lookup(id: ID) {
    if (typeof id === "number") {
        // id: number here
    } else {
        // id: string here
    }
}

let value: string | null = null;
value = "hello";
value = null;
value = 42;            // ERROR
```

Unions are common for:
- "Maybe missing": `T | undefined`, `T | null`.
- "Multiple input forms": `string | number`, `User | UserId`.
- "Tagged variants": discriminated unions (next section).

### Union of literals
```typescript
type Direction = "north" | "south" | "east" | "west";
type Bit = 0 | 1;
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
```

Very common. Often easier than enums.

### Distributing over unions
Generic types distribute over unions:
```typescript
type Maybe<T> = T | null;
type X = Maybe<string | number>;
// X is (string | null) | (number | null) — same as string | number | null
```

This becomes powerful with conditional types (file 05).

---

## 2. Intersection Types

`A & B` is "everything in A plus everything in B."

```typescript
type Named = { name: string };
type Aged = { age: number };
type Person = Named & Aged;
// equivalent to: { name: string; age: number }

const p: Person = { name: "Alice", age: 30 };
```

Useful for:
- Combining shapes.
- Adding required properties to an existing type.
- Extending interfaces inline.

### Intersection of unions
Distributes:
```typescript
type A = { x: number } | { y: number };
type B = { z: number };
type C = A & B;
// = ({ x: number } & { z: number }) | ({ y: number } & { z: number })
```

### When intersection is impossible
```typescript
type Impossible = string & number;     // type: never
```

If two types have no overlap, the intersection is `never`. TS will allow this assignment but no value can ever inhabit it.

---

## 3. Narrowing

Narrowing is how TS figures out a more specific type inside a control-flow block.

### `typeof`
```typescript
function process(x: string | number) {
    if (typeof x === "string") {
        x.toUpperCase();              // x: string
    } else {
        x.toFixed(2);                  // x: number
    }
}
```

`typeof` values: `"string"`, `"number"`, `"bigint"`, `"boolean"`, `"symbol"`, `"undefined"`, `"object"`, `"function"`.

### `instanceof`
```typescript
function format(d: Date | string) {
    if (d instanceof Date) {
        return d.toISOString();        // d: Date
    }
    return d;                          // d: string
}
```

Works for classes / classes-like constructors (Date, Error, etc.).

### Equality narrowing
```typescript
function f(x: string | null) {
    if (x === null) {
        return;                       // x: null
    }
    x.toUpperCase();                   // x: string
}

function g(x: "a" | "b" | "c") {
    if (x === "a") {
        // x: "a"
    } else {
        // x: "b" | "c"
    }
}
```

### Truthiness narrowing
```typescript
function getLength(s: string | null) {
    if (s) {
        return s.length;               // s: string
    }
    return 0;
}
```

Watch out:
```typescript
function f(n: number | undefined) {
    if (n) {                           // 0 is falsy!
        // n: number (without 0)
    }
}
// Better:
if (n !== undefined) { ... }
```

### `in` operator
```typescript
type Cat = { meow(): void };
type Dog = { bark(): void };

function speak(pet: Cat | Dog) {
    if ("meow" in pet) {
        pet.meow();                    // pet: Cat
    } else {
        pet.bark();                     // pet: Dog
    }
}
```

Useful for unions of structurally similar shapes.

### `Array.isArray` and other built-ins
```typescript
function f(x: string | string[]) {
    if (Array.isArray(x)) {
        x.join(",");                   // x: string[]
    } else {
        x.toUpperCase();                // x: string
    }
}
```

### Assignment narrowing
```typescript
let x: string | number = "hi";
x.toUpperCase();      // x: string

x = 42;
x.toFixed();           // x: number
```

TS tracks the latest assignment.

### Discriminated narrowing (covered in section 5)
The most powerful and idiomatic.

---

## 4. Type Predicates

Custom type guards via `x is T`:

```typescript
function isString(value: unknown): value is string {
    return typeof value === "string";
}

function isUser(x: unknown): x is User {
    return (
        typeof x === "object" &&
        x !== null &&
        "id" in x && typeof (x as any).id === "number" &&
        "name" in x && typeof (x as any).name === "string"
    );
}

const data: unknown = JSON.parse(input);
if (isUser(data)) {
    console.log(data.name);            // data: User
}
```

The return type `x is T` tells TS that a truthy return value means `x` has type `T`.

**Caution**: TS trusts the return value matches the predicate. If your check is wrong, TS won't catch it — the runtime will. For external input, use Zod / Valibot; they're battle-tested validators that also produce predicates.

### Zod / Valibot give you guards for free
```typescript
import { z } from "zod";

const UserSchema = z.object({ id: z.number(), name: z.string() });
type User = z.infer<typeof UserSchema>;

const data: unknown = JSON.parse(input);
const result = UserSchema.safeParse(data);
if (result.success) {
    result.data.name;                  // typed as User
}
```

This is the right pattern for untrusted input.

### `asserts` functions
A close cousin of type predicates:
```typescript
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new Error("Not a string");
    }
}

function f(x: unknown) {
    assertIsString(x);
    x.toUpperCase();                   // x: string from here on
}
```

The assertion narrows the type for the rest of the function. Similar to Java's `assert` but with type narrowing.

```typescript
function assert(condition: unknown, msg?: string): asserts condition {
    if (!condition) throw new Error(msg);
}

function f(user: User | null) {
    assert(user !== null);
    user.name;                         // user: User
}
```

`node:assert/strict` has this signature built in — assertions narrow types automatically.

---

## 5. Discriminated Unions

The most powerful TS pattern. Every variant has a literal "tag" property that uniquely identifies it.

```typescript
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "square"; side: number }
    | { kind: "rectangle"; width: number; height: number };

function area(s: Shape): number {
    switch (s.kind) {
        case "circle":
            return Math.PI * s.radius ** 2;          // s: { kind: "circle"; radius: number }
        case "square":
            return s.side ** 2;
        case "rectangle":
            return s.width * s.height;
    }
}
```

The `kind` (often `type`, `_tag`, `discriminator`) is the discriminant. TS narrows perfectly based on it.

### Why it's better than alternatives
Compare:
```typescript
// Without discriminant — TS can't narrow
type Shape = {
    radius?: number;
    side?: number;
    width?: number;
    height?: number;
};

function area(s: Shape) {
    if (s.radius !== undefined) {
        // s.radius is number, but what's the shape?
    }
}
```

Awkward, error-prone. With a discriminant, the structure is clear and the checks are mechanical.

### State machines
```typescript
type RequestState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: User[] }
    | { status: "error"; error: Error };

function render(state: RequestState) {
    switch (state.status) {
        case "idle": return "Press button";
        case "loading": return "Loading...";
        case "success": return `Got ${state.data.length} users`;
        case "error": return `Error: ${state.error.message}`;
    }
}
```

Impossible states are eliminated. You can't have `status: "success"` without `data`.

### Result types
```typescript
type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

function divide(a: number, b: number): Result<number> {
    if (b === 0) return { ok: false, error: new Error("zero") };
    return { ok: true, value: a / b };
}

const r = divide(10, 2);
if (r.ok) {
    r.value;       // number
} else {
    r.error;       // Error
}
```

A more explicit alternative to throwing. Some teams love it (forces handling); others find it noisy.

### Tagged events
```typescript
type Event =
    | { type: "USER_LOGGED_IN"; userId: number }
    | { type: "USER_LOGGED_OUT" }
    | { type: "ITEM_ADDED"; itemId: number; quantity: number };

function reduce(state: State, event: Event): State {
    switch (event.type) {
        case "USER_LOGGED_IN": ...
        case "USER_LOGGED_OUT": ...
        case "ITEM_ADDED": ...
    }
}
```

Foundation of Redux-style state management.

### Naming the discriminant
Common conventions:
- `kind` — terse.
- `type` — most common.
- `_tag` — borrowed from Effect / functional languages.
- `discriminator`, `variant` — explicit.

Pick one per project.

---

## 6. Exhaustiveness Checks

Force every variant to be handled. If you add a new one, TS errors.

```typescript
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "square"; side: number };

function area(s: Shape): number {
    switch (s.kind) {
        case "circle": return Math.PI * s.radius ** 2;
        case "square": return s.side ** 2;
        default:
            const _exhaustive: never = s;
            throw new Error(`unhandled: ${(s as any).kind}`);
    }
}

// Later, add:
// | { kind: "triangle"; base: number; height: number }
// → The `_exhaustive: never = s` line errors because `s` is now `{ kind: "triangle"; ... }`.
```

The `: never` assignment only compiles if `s` has been narrowed to `never` — which happens only if all variants are handled.

### Helper function for exhaustiveness
```typescript
function assertNever(x: never): never {
    throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function area(s: Shape): number {
    switch (s.kind) {
        case "circle": return Math.PI * s.radius ** 2;
        case "square": return s.side ** 2;
        default: return assertNever(s);
    }
}
```

Cleaner. Reusable.

### Without switch — using `Record`-style dispatch
```typescript
const areas: Record<Shape["kind"], (s: any) => number> = {
    circle: (s) => Math.PI * s.radius ** 2,
    square: (s) => s.side ** 2,
};

function area(s: Shape) {
    return areas[s.kind](s);
}
```

Slightly less type-safe (the `any` opens up risk), but a TS-aware refactor produces a clean version with generics.

---

## 7. Common Patterns

### Optional-as-discriminant — light pattern
```typescript
type User =
    | { name: string; email: string }
    | { name: string; phone: string };

// Hard to narrow without checking specific keys
```

Better:
```typescript
type User =
    | { name: string; contact: "email"; email: string }
    | { name: string; contact: "phone"; phone: string };
```

Or simply:
```typescript
type User = { name: string; email?: string; phone?: string };
```

Whichever fits the domain.

### `RequireAtLeastOne`
A common pattern: an object where at least one of several properties is required. Surprisingly hard to express well; use a util:
```typescript
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];
```

(See file 05 for the mechanics. Most teams use a library like `type-fest` which provides this.)

### Branding to differentiate unions of structurally identical types
```typescript
type UserId = number & { __brand: "UserId" };
type PostId = number & { __brand: "PostId" };

function getUser(id: UserId) { ... }
const uid = 42 as UserId;
getUser(uid);            // OK
getUser(42);              // ERROR — must be branded
```

Covered in `08_practical_patterns.md`.

### "Distributive conditional types"
Will see in file 05. Briefly:
```typescript
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>;
// = string[] | number[]
```

This pattern of distributing over unions powers many utility types.

### Pattern: "no impossible states"
A discriminated union beats a flat object with optional fields:
```typescript
// BAD — many impossible combinations
type RequestState = {
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    data?: User[];
    error?: Error;
};
// What if isLoading: true and data: [...]? Doesn't make sense.

// GOOD — only valid combinations
type RequestState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: User[] }
    | { status: "error"; error: Error };
```

Make illegal states unrepresentable. This is the deepest payoff of using TS well.

### Pattern: "narrow at the edge"
Receive `unknown` from the outside world; validate; convert to a typed value:
```typescript
function loadConfig(raw: unknown): Config {
    return ConfigSchema.parse(raw);     // throws on invalid
}

const config = loadConfig(JSON.parse(content));
// rest of the program works with `Config`, not `unknown`
```

Validate once at the boundary; trust the type internally.

### Pattern: "exhaustive UI rendering"
```typescript
type Status = "idle" | "loading" | "success" | "error";

const messages: Record<Status, string> = {
    idle: "Press to start",
    loading: "Loading...",
    success: "Done!",
    error: "Oops",
};
```

Adding a new `Status` variant errors here until you add the message — no forgetting.

---

Narrowing is where TS pays for itself daily. Discriminated unions + exhaustiveness checks alone eliminate a whole class of "I forgot a case" bugs. Next, generics — `04_generics.md`.
