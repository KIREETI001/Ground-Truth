# 02. Basic Types

> Primitives, arrays, tuples, objects, functions, type aliases, interfaces — the foundation of every TS program.

---

## Table of Contents

1. [How TypeScript Types Work](#1-how-typescript-types-work)
2. [Primitives](#2-primitives)
3. [Arrays and Tuples](#3-arrays-and-tuples)
4. [Objects](#4-objects)
5. [Type Aliases vs Interfaces](#5-type-aliases-vs-interfaces)
6. [Functions](#6-functions)
7. [Optional, Default, Rest Parameters](#7-optional-default-rest-parameters)
8. [Literal Types](#8-literal-types)
9. [`any`, `unknown`, `never`, `void`](#9-any-unknown-never-void)
10. [Type Assertions vs Type Guards](#10-type-assertions-vs-type-guards)
11. [Type Inference](#11-type-inference)

---

## 1. How TypeScript Types Work

TypeScript types are **structural** — what matters is the shape, not the name.

```typescript
type Point = { x: number; y: number };

function distance(p: Point) { ... }

distance({ x: 1, y: 2 });                      // OK
distance({ x: 1, y: 2, z: 3 });                // OK (extra property allowed)
distance({ x: 1, y: 2, name: "origin" });      // also OK
```

Compare to nominal systems (Java, C#) where types are matched by name. Structural typing is more flexible but means a value with the right shape can be passed even if you didn't intend to allow it. Patterns like "branded types" (covered in `08_practical_patterns.md`) re-introduce nominal-ish behavior when needed.

### Types vs values
```typescript
type Foo = { x: number };       // type — exists at compile time only
const Foo = { x: 1 };            // value — exists at runtime

// You can have both with the same name:
type User = { id: number };
const User = { create: () => { ... } };
```

A name can refer to both a type and a value simultaneously.

### Types are erased
```typescript
const x: number = 5;
// Compiles to:
const x = 5;
```

You cannot:
- `typeof T` where `T` is a type (only on values).
- Use a type as a value: `if (x instanceof Foo)` where `Foo` is a type alias.
- Reflect on types at runtime.

Anything checking shapes at runtime needs JS code (typically `typeof`, `instanceof`, or a validation library like Zod).

---

## 2. Primitives

```typescript
const n: number = 42;
const s: string = "hi";
const b: boolean = true;
const big: bigint = 100n;
const sym: symbol = Symbol("x");

let u: undefined = undefined;
let nl: null = null;
```

`number` covers ints and floats — same as JS. There's no `int`, `float`, etc.

### `null` and `undefined`
With `strictNullChecks` (always on with `strict: true`):
```typescript
let s: string = "hi";
s = null;        // ERROR

let s2: string | null = "hi";
s2 = null;       // OK

let s3: string | undefined;
s3 = "hi";        // OK
s3 = undefined;   // OK
```

Default: variables can't be null or undefined. Be explicit.

### Boolean coercion
Don't use truthiness checks for nullable strings — TS narrows them but lints often flag the pattern:
```typescript
function greet(name: string | null) {
    if (name) {         // narrows to string
        return name.toUpperCase();
    }
    return "anon";
}
```

For optional numbers, this misfires:
```typescript
function f(count: number | undefined) {
    if (count) {                 // 0 is falsy!
        // narrows to number, but 0 was excluded
    }
    if (count !== undefined) {    // safer
        // narrows to number, 0 included
    }
}
```

---

## 3. Arrays and Tuples

### Arrays
```typescript
const nums: number[] = [1, 2, 3];
const nums2: Array<number> = [1, 2, 3];      // equivalent

const mixed: (number | string)[] = [1, "two", 3];
const readOnly: readonly number[] = [1, 2, 3];
readOnly.push(4);     // ERROR — readonly
```

### Tuples — fixed-length, typed-by-position
```typescript
const pair: [number, string] = [1, "one"];
const xy: [number, number] = [3.14, 2.71];

const [n, s] = pair;       // n: number, s: string

// Named tuple elements (for readability)
type Pair = [first: number, second: string];

// Optional elements
type WithOptional = [number, string?];
const a: WithOptional = [1];
const b: WithOptional = [1, "two"];

// Rest in tuple
type Variadic = [string, ...number[]];
const v: Variadic = ["count", 1, 2, 3];

// Readonly tuple
const t: readonly [number, string] = [1, "one"];
```

Tuples are useful for:
- `useState`-style return values: `[T, (v: T) => void]`.
- Function args you spread: `args: [number, string]` then `fn(...args)`.
- Encoding fixed shapes (RGB color, lat/long).

Most data goes in objects, not tuples. Tuples are positional and easy to misuse — `[1, 2]` says nothing about which is which.

### Array literal inference
```typescript
const arr = [1, 2, 3];                  // inferred: number[]
const tup = [1, "one"] as const;         // inferred: readonly [1, "one"]
```

`as const` freezes the type to its literal shape — useful for keeping tuple-ness or literal values.

---

## 4. Objects

```typescript
type User = {
    id: number;
    name: string;
    email?: string;        // optional property
    readonly createdAt: Date;
};

const u: User = {
    id: 1,
    name: "Alice",
    createdAt: new Date(),
};

u.name = "Alicia";              // OK
u.createdAt = new Date();        // ERROR — readonly
```

### Index signatures
For maps where keys aren't known statically:
```typescript
type StringMap = { [key: string]: string };
type NumberByName = Record<string, number>;     // built-in equivalent

const env: StringMap = {
    HOME: "/home/me",
    PATH: "/usr/bin",
};

env.HOME;        // string
env.UNKNOWN;     // string (TS thinks any key is present)

// With noUncheckedIndexedAccess:
env.UNKNOWN;     // string | undefined ← much safer
```

`noUncheckedIndexedAccess` makes index signatures return `T | undefined`, forcing you to check.

### Combining known and unknown keys
```typescript
type Config = {
    apiUrl: string;
    timeout: number;
    [key: string]: string | number;     // additional dynamic keys
};
```

### Nested objects
```typescript
type Person = {
    name: string;
    address: {
        street: string;
        city: string;
        country?: string;
    };
};
```

Extract often:
```typescript
type Address = {
    street: string;
    city: string;
    country?: string;
};

type Person = {
    name: string;
    address: Address;
};
```

### `Record<K, V>`
A common shorthand for objects with known keys:
```typescript
type Status = "active" | "pending" | "closed";
type StatusColors = Record<Status, string>;

const colors: StatusColors = {
    active: "green",
    pending: "yellow",
    closed: "red",
    // closes: "red",    // ERROR — extra key not allowed
};
```

If you omit a key, TS errors. Useful for "make sure every variant is handled."

---

## 5. Type Aliases vs Interfaces

Two ways to name types. They overlap a lot.

```typescript
type User = {
    id: number;
    name: string;
};

interface User {
    id: number;
    name: string;
}
```

Both work for object shapes. Differences:

### Type aliases work for anything
```typescript
type Status = "active" | "pending";        // union — interfaces can't
type Pair = [number, string];               // tuple
type Op = (x: number) => number;            // function alias
type ReadonlyUser = Readonly<User>;          // utility result
```

Interfaces only describe object/class shapes (and function call signatures).

### Interfaces are merged across declarations
```typescript
interface Window {
    myCustomProp: string;
}
interface Window {
    anotherProp: number;
}
// Both end up on the global Window type
```

Useful for augmenting library types. Type aliases can't be merged.

### Interfaces have nominal-ish error messages
Errors involving interfaces often display nicer. Type aliases can show the expanded form.

### Performance
For large unions/objects, interfaces are slightly faster for the compiler to type-check. Rarely matters in practice.

### Practical advice
- Use **interfaces** for public object shapes (libraries, exports).
- Use **type aliases** for unions, intersections, function signatures, mapped/conditional types.
- Pick one as a default for the project and stick with it. Most teams use `type` everywhere except where merging is needed.

### Extending
```typescript
// Interface extends
interface User {
    id: number;
    name: string;
}
interface Admin extends User {
    permissions: string[];
}

// Type intersection
type User2 = { id: number; name: string };
type Admin2 = User2 & { permissions: string[] };
```

Both work; intersection is slightly more flexible (works with any type, not just object shapes).

### Implementing in classes
```typescript
interface Greeter {
    greet(): string;
}

class English implements Greeter {
    greet() { return "hello"; }
}
```

Same with `type` (since the type aliases an object shape).

---

## 6. Functions

```typescript
function add(a: number, b: number): number {
    return a + b;
}

const add2 = (a: number, b: number): number => a + b;

// As a type
type BinaryOp = (a: number, b: number) => number;
const op: BinaryOp = (a, b) => a + b;
```

### Function type literals
```typescript
type Callback = (err: Error | null, result?: string) => void;
type Predicate<T> = (value: T) => boolean;
```

### Method shorthand in object types
```typescript
type Logger = {
    log(msg: string): void;             // method
    log: (msg: string) => void;          // function property (subtle TS difference, usually irrelevant)
};
```

### Async functions
```typescript
async function fetchUser(id: number): Promise<User> {
    const r = await fetch(`/users/${id}`);
    return r.json();
}
```

The return type is `Promise<T>`, not `T`. TS often infers this:
```typescript
async function fetchUser(id: number) {
    const r = await fetch(`/users/${id}`);
    return r.json() as Promise<User>;   // or use a typed fetch wrapper
}
// fetchUser returns Promise<User>
```

### Overloads
```typescript
function parse(input: string): number;
function parse(input: number): string;
function parse(input: string | number): string | number {
    if (typeof input === "string") return parseFloat(input);
    return input.toString();
}

const a = parse("3.14");      // number
const b = parse(42);           // string
```

The implementation must be compatible with all overloads. Overloads are a last resort — usually generics or union types are clearer.

---

## 7. Optional, Default, Rest Parameters

### Optional
```typescript
function greet(name: string, greeting?: string) {
    return `${greeting ?? "Hello"}, ${name}`;
}

greet("Alice");
greet("Alice", "Hi");
```

`greeting` is `string | undefined`.

### Defaults
```typescript
function greet(name: string, greeting = "Hello") {
    return `${greeting}, ${name}`;
}
```

`greeting` is `string` (not `string | undefined`).

### Rest parameters
```typescript
function sum(...nums: number[]): number {
    return nums.reduce((a, b) => a + b, 0);
}

sum(1, 2, 3, 4);
```

Rest is typed as an array.

### Destructured parameters with defaults
```typescript
function makeUser({
    name,
    age = 18,
    admin = false,
}: {
    name: string;
    age?: number;
    admin?: boolean;
}) {
    ...
}
```

Often extracted:
```typescript
type MakeUserInput = {
    name: string;
    age?: number;
    admin?: boolean;
};

function makeUser({ name, age = 18, admin = false }: MakeUserInput) { ... }
```

---

## 8. Literal Types

A type can be a specific value, not just a category.

```typescript
type Direction = "north" | "south" | "east" | "west";
type Bit = 0 | 1;
type HttpStatus = 200 | 201 | 204 | 400 | 401 | 404 | 500;

function move(d: Direction) {
    if (d === "north") ...           // narrowed precisely
}
```

### `as const` — preserve literal types
```typescript
const x = "hello";                    // type: "hello"
const y: string = "hello";             // type: string
const arr = [1, 2, 3];                  // type: number[]
const tup = [1, 2, 3] as const;          // type: readonly [1, 2, 3]

const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
} as const;
// type: {
//   readonly apiUrl: "https://api.example.com";
//   readonly timeout: 5000;
// }
```

`as const` is critical for getting unions out of arrays:
```typescript
const STATUSES = ["active", "pending", "closed"] as const;
type Status = typeof STATUSES[number];   // "active" | "pending" | "closed"
```

### Template literal types
```typescript
type Path = `/api/${"users" | "posts"}/${number}`;
type CSSUnit = `${number}${"px" | "em" | "rem"}`;
type EventName<T extends string> = `on${Capitalize<T>}`;
```

Powerful for typing strings with structure. Covered more in `05_advanced_types.md`.

---

## 9. `any`, `unknown`, `never`, `void`

### `any` — opt out of type checking
```typescript
const x: any = "hi";
x.foo.bar.baz();              // OK at compile time; crashes at runtime
```

**Avoid `any`.** It infects everything it touches. Use `unknown` instead.

Legitimate uses (rare):
- Wrapping a fundamentally untyped JS library.
- Migrating JS code gradually.

### `unknown` — top type, the safe `any`
```typescript
const x: unknown = JSON.parse(input);
x.foo;                       // ERROR — must narrow first

if (typeof x === "object" && x !== null && "foo" in x) {
    x.foo;                   // OK after narrowing
}
```

`unknown` accepts anything but doesn't let you do anything until you narrow. The right type for "I don't know what this is."

### `never` — the empty set
```typescript
function fail(msg: string): never {
    throw new Error(msg);
}

function loop(): never {
    while (true) {}
}
```

A function returning `never` doesn't return. Useful in exhaustiveness checks:
```typescript
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };

function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle": return Math.PI * shape.r ** 2;
        case "square": return shape.s ** 2;
        default:
            const _exhaustive: never = shape;
            throw new Error("unhandled");
    }
}
```

If you add a new variant to `Shape`, the `_exhaustive: never = shape` line errors — forcing you to update the switch.

### `void` — function returns nothing meaningful
```typescript
function log(msg: string): void {
    console.log(msg);
}
```

Different from `undefined` in subtle ways: a `void` return type allows the function to return *any* value (it just won't be used by the caller).

```typescript
type Cb = () => void;
const cb: Cb = () => 42;       // OK — return value ignored
```

This is why `array.forEach((x) => arr.push(x))` typechecks despite `push` returning a number.

---

## 10. Type Assertions vs Type Guards

### Type assertion — "trust me"
```typescript
const el = document.querySelector("#myInput") as HTMLInputElement;
el.value = "hi";

// Or
const el = <HTMLInputElement>document.querySelector("#myInput");   // older syntax; conflicts with JSX
```

**No runtime check.** If the element isn't actually an `HTMLInputElement`, you get a runtime error.

Use sparingly. Common legitimate uses:
- Telling TS what a DOM query returned.
- Casting `unknown` after you've validated it.
- Working with third-party libraries with broken types.

```typescript
const data = JSON.parse(json) as User;     // unsafe — JSON could be anything
```

Better: validate with Zod, which gives both runtime check and proper type:
```typescript
const data = UserSchema.parse(JSON.parse(json));   // User, properly verified
```

### `as unknown as T` — double assertion (last resort)
For incompatible casts:
```typescript
const x = (someValue as unknown) as DesiredType;
```

The presence of this in your code is a signal something's wrong. Audit before merging.

### Type guards — narrow with runtime checks
```typescript
function isString(x: unknown): x is string {
    return typeof x === "string";
}

function process(input: unknown) {
    if (isString(input)) {
        input.toUpperCase();     // narrowed to string
    }
}
```

The return type `x is string` is a **type predicate** — tells TS "if this returns true, narrow `x` to `string`."

Built-in narrowing:
- `typeof x === "string" | "number" | "boolean" | "function" | "object" | "undefined" | "bigint" | "symbol"`
- `x instanceof Class`
- `x === null`, `x === undefined`
- `"prop" in obj`
- Discriminated unions (`obj.kind === "circle"`)

Custom type guards extend this. Cover narrowing in detail in `03_unions_and_narrowing.md`.

### `satisfies` operator (TS 4.9+)
A cleaner alternative to type assertions for "check this matches a type, but keep the precise inferred type":
```typescript
const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    retries: 3,
} satisfies Record<string, string | number>;

config.apiUrl.toUpperCase();    // OK — TS knows apiUrl is string, not string | number
config.retries.toFixed();        // OK — TS knows retries is number
```

Without `satisfies`, you'd either:
- Annotate with `: Record<string, string | number>` and lose the precise type.
- Use `as Record<...>` and bypass checking.

`satisfies` does both — checks the constraint and preserves the literal types. Highly recommended.

---

## 11. Type Inference

TS infers types when possible. You don't need to annotate everything.

```typescript
const x = 42;                 // number
const s = "hi";                // string
const arr = [1, 2, 3];          // number[]
const obj = { x: 1, y: 2 };     // { x: number; y: number }

function double(n: number) {
    return n * 2;               // return type inferred: number
}
```

### Where to annotate
- **Function parameters** — always annotate. TS can't infer them in isolation.
- **Function return types** — optional, but recommended for public APIs (catches accidental signature changes).
- **Object literals** — usually inferred. Annotate when the inferred type is too narrow/wide.
- **Empty arrays / objects** — TS infers `never[]` / `{}`. Annotate:
  ```typescript
  const items: string[] = [];        // not const items = [] (which is never[])
  ```

### Contextual typing
Types flow through context:
```typescript
button.addEventListener("click", (e) => {
    // e is inferred as MouseEvent
});

const op: BinaryOp = (a, b) => a + b;   // a, b inferred as number
```

This is why callbacks often don't need parameter annotations.

### Inference vs `satisfies`
```typescript
// Wide annotation — useful for constraint, loses specifics
const config: Record<string, unknown> = { apiUrl: "..." };
config.apiUrl;     // unknown

// Inference only — keeps specifics, no constraint
const config = { apiUrl: "..." };

// Best of both — constraint check + preserved type
const config = { apiUrl: "..." } satisfies Record<string, unknown>;
config.apiUrl;     // string
```

### Type vs value position
```typescript
const x = 5;
type T = typeof x;        // T is number — typeof in type position gets the type
console.log(typeof x);    // "number" — typeof in value position is JS runtime
```

`typeof someVar` in a type-position is invaluable:
```typescript
const config = { apiUrl: "...", timeout: 5000 };
type Config = typeof config;

// Or for arrays:
const STATUSES = ["active", "pending"] as const;
type Status = typeof STATUSES[number];    // "active" | "pending"
```

---

That's the foundation. You can build most TS programs with what's in this file. Next, unions and narrowing — `03_unions_and_narrowing.md`.
