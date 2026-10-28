# 04. Generics

> Generic functions, classes, constraints, defaults, inference. The mechanism for writing reusable, type-safe code.

---

## Table of Contents

1. [Why Generics](#1-why-generics)
2. [Generic Functions](#2-generic-functions)
3. [Generic Type Aliases and Interfaces](#3-generic-type-aliases-and-interfaces)
4. [Generic Classes](#4-generic-classes)
5. [Constraints](#5-constraints)
6. [Default Type Parameters](#6-default-type-parameters)
7. [Inference](#7-inference)
8. [Common Generic Patterns](#8-common-generic-patterns)
9. [When Not to Use Generics](#9-when-not-to-use-generics)

---

## 1. Why Generics

Without generics:
```typescript
function firstString(arr: string[]): string | undefined { return arr[0]; }
function firstNumber(arr: number[]): number | undefined { return arr[0]; }
// ... infinite copies for every type
```

Or with `any`:
```typescript
function first(arr: any[]): any { return arr[0]; }
const x = first([1, 2, 3]);    // x: any — type info lost
```

With generics:
```typescript
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

const a = first([1, 2, 3]);            // a: number | undefined
const b = first(["a", "b"]);            // b: string | undefined
const c = first<User>([alice, bob]);    // c: User | undefined
```

`T` is a **type parameter** — a placeholder that gets bound to a concrete type when the function is called. TS infers it from arguments when possible.

---

## 2. Generic Functions

### Basics
```typescript
function identity<T>(x: T): T {
    return x;
}

identity(42);          // T inferred as number
identity("hi");        // T inferred as string
identity<boolean>(true);  // explicit
```

### Multiple type parameters
```typescript
function pair<A, B>(a: A, b: B): [A, B] {
    return [a, b];
}

const p = pair("hi", 42);    // [string, number]
```

### Arrow functions
```typescript
const identity = <T>(x: T): T => x;

// In .tsx files (JSX), <T> looks like a tag — use trailing comma or `extends`:
const identity = <T,>(x: T): T => x;
const identity = <T extends unknown>(x: T): T => x;
```

### Generic methods
```typescript
class Repository {
    findOne<T>(id: number): T | null {
        // ...
    }
}

const user = repo.findOne<User>(42);     // explicit type
```

### When inference fails
```typescript
function makeArray<T>(): T[] {
    return [];
}

const arr = makeArray();      // T: unknown
const arr2 = makeArray<number>();    // T: number
```

When TS can't infer, pass the type explicitly or refactor to take an argument.

### Generic constraints in function signatures
```typescript
function logLength<T extends { length: number }>(x: T): T {
    console.log(x.length);
    return x;
}

logLength("hello");       // OK
logLength([1, 2, 3]);     // OK
logLength({ length: 10 });  // OK
logLength(42);             // ERROR — number has no `length`
```

---

## 3. Generic Type Aliases and Interfaces

```typescript
type Box<T> = { value: T };
const numBox: Box<number> = { value: 42 };
const strBox: Box<string> = { value: "hi" };

type Pair<A, B> = { first: A; second: B };

type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

interface Container<T> {
    items: T[];
    add(item: T): void;
}
```

### Nested generics
```typescript
type AsyncResult<T> = Promise<Result<T>>;
type ListResponse<T> = { items: T[]; total: number; page: number };
type APIResponse<T> = Promise<ListResponse<T>>;

async function getUsers(): APIResponse<User> { ... }
```

### Conditional inference (preview of file 05)
```typescript
type Unpacked<T> = T extends Promise<infer U> ? U : T;
type X = Unpacked<Promise<string>>;    // string
type Y = Unpacked<number>;              // number
```

`infer` extracts a type from another type. Powerful — covered later.

---

## 4. Generic Classes

```typescript
class Stack<T> {
    private items: T[] = [];

    push(item: T): void { this.items.push(item); }
    pop(): T | undefined { return this.items.pop(); }
    peek(): T | undefined { return this.items[this.items.length - 1]; }

    get size(): number { return this.items.length; }
}

const s = new Stack<number>();
s.push(1);
s.push(2);
const x = s.pop();          // x: number | undefined

const strings = new Stack<string>();
strings.push("hi");
```

### Inferring from usage
```typescript
const s = new Stack();          // Stack<unknown>
s.push("hello");
// Now narrow / annotate at construction
const s2 = new Stack<string>();
s2.push("hi");                   // OK
s2.push(42);                      // ERROR
```

TS doesn't infer from the first `push` retroactively — always specify the type parameter on construction (or pass an initial item that makes inference work).

### Multiple type parameters
```typescript
class Cache<K, V> {
    private map = new Map<K, V>();

    set(key: K, value: V): void { this.map.set(key, value); }
    get(key: K): V | undefined { return this.map.get(key); }
}

const c = new Cache<string, User>();
```

### Inheritance with generics
```typescript
class Animal<T extends string> {
    constructor(public name: string, public sound: T) {}
}

class Dog extends Animal<"woof"> {
    constructor(name: string) {
        super(name, "woof");
    }
}
```

---

## 5. Constraints

Restrict what types are valid.

```typescript
function longest<T extends { length: number }>(a: T, b: T): T {
    return a.length >= b.length ? a : b;
}

longest("hi", "hello");           // OK
longest([1, 2], [1, 2, 3]);        // OK
longest(42, 99);                   // ERROR
```

### Constraining to keys
```typescript
function get<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user = { id: 1, name: "Alice", age: 30 };
get(user, "name");    // string
get(user, "age");      // number
get(user, "unknown");  // ERROR — not a key of user
```

`keyof T` is the union of T's keys (as a literal type union). `T[K]` is the type of `T`'s property at key `K`.

### Constraining to value types
```typescript
function pluck<T, K extends keyof T>(arr: T[], key: K): T[K][] {
    return arr.map(x => x[key]);
}

const names = pluck(users, "name");       // string[]
```

### Multiple constraints with intersection
```typescript
function f<T extends { id: number } & { name: string }>(x: T) { ... }
// or
function f<T extends { id: number; name: string }>(x: T) { ... }
```

### Self-referencing constraints
```typescript
function clone<T extends Cloneable<T>>(x: T): T {
    return x.clone();
}

interface Cloneable<T> {
    clone(): T;
}
```

---

## 6. Default Type Parameters

```typescript
type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

const r1: Result<string> = ...;          // E defaults to Error
const r2: Result<string, MyError> = ...;
```

### Common: arrays defaulting to `unknown`
```typescript
function makeArray<T = unknown>(): T[] {
    return [];
}

const arr = makeArray();      // unknown[]
const arr2 = makeArray<number>();   // number[]
```

### React props with defaults
```typescript
interface ButtonProps<T = "button"> {
    as?: T;
    children: React.ReactNode;
}

function Button<T extends keyof JSX.IntrinsicElements = "button">(props: ButtonProps<T>) {
    ...
}
```

---

## 7. Inference

Generics shine when TS infers them. Inference happens from arguments.

### From arguments
```typescript
function map<T, U>(arr: T[], fn: (x: T) => U): U[] {
    return arr.map(fn);
}

const ns = map([1, 2, 3], n => n.toString());
// T inferred as number, U inferred as string
// ns: string[]
```

### From return position (rare)
TS can sometimes infer from where the return value is used:
```typescript
function makeBox<T>(): { value: T } {
    return { value: undefined as any };
}

const box: { value: number } = makeBox();    // T inferred as number from context
```

Don't rely on this — usually annotate.

### Inference with constraints
```typescript
function getByKey<T, K extends keyof T>(obj: T, key: K) {
    return obj[key];
}

const v = getByKey({ a: 1, b: "hi" }, "a");    // v: number
```

TS infers both T and K from arguments.

### `const` type parameters (TS 5.0+)
```typescript
function makeReadOnly<const T>(x: T): T {
    return x;
}

const x = makeReadOnly({ name: "Alice", age: 30 });
// Without `const`: x: { name: string; age: number }
// With `const`: x: { readonly name: "Alice"; readonly age: 30 }
```

`const` keyword on a type parameter tells TS to infer with literal precision (like `as const` at the call site).

### `NoInfer` (TS 5.4+)
Sometimes you want a parameter NOT to participate in inference:
```typescript
function setItem<T>(key: string, value: NoInfer<T>) {
    // T must come from somewhere else
}
```

Niche, but useful when one of multiple parameters should drive inference and others shouldn't.

---

## 8. Common Generic Patterns

### `Identity` — for type assertion via inference
```typescript
const userConfig = {
    name: "alice",
    age: 30,
} satisfies UserConfig;
```

This is `satisfies` (from file 02), but it serves a similar purpose to a generic identity function for type checking without losing precision.

### Generic factory
```typescript
function createResource<T extends { id: number }>(item: T): T {
    return { ...item };
}
```

### Wrapper / decorator preserving signature
```typescript
function withLogging<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
    return (...args) => {
        console.log("called with", args);
        const result = fn(...args);
        console.log("returned", result);
        return result;
    };
}

const add = (a: number, b: number) => a + b;
const tracedAdd = withLogging(add);
tracedAdd(1, 2);     // same signature as add
```

This preserves the original signature exactly — types of args, return value, everything.

### Async version
```typescript
function withRetry<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    attempts = 3,
): (...args: TArgs) => Promise<TReturn> {
    return async (...args) => {
        let lastErr;
        for (let i = 0; i < attempts; i++) {
            try { return await fn(...args); }
            catch (e) { lastErr = e; }
        }
        throw lastErr;
    };
}
```

### Generic Result helpers
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

function tryRun<T>(fn: () => T): Result<T, Error> {
    try {
        return ok(fn());
    } catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
    }
}
```

### Map / Reduce with proper types
```typescript
function groupBy<T, K extends string | number>(
    items: T[],
    keyFn: (item: T) => K,
): Record<K, T[]> {
    return items.reduce((acc, item) => {
        const k = keyFn(item);
        (acc[k] ??= []).push(item);
        return acc;
    }, {} as Record<K, T[]>);
}

const byAge = groupBy(users, u => u.age);    // Record<number, User[]>
```

### Container types
```typescript
class Maybe<T> {
    constructor(private value: T | null) {}

    static of<T>(value: T): Maybe<T> { return new Maybe(value); }
    static none<T>(): Maybe<T> { return new Maybe<T>(null); }

    map<U>(fn: (value: T) => U): Maybe<U> {
        return this.value === null ? Maybe.none() : Maybe.of(fn(this.value));
    }

    getOrElse(fallback: T): T {
        return this.value ?? fallback;
    }
}
```

### Generic events / handlers
```typescript
type EventMap = {
    "user:created": { userId: number };
    "user:deleted": { userId: number; reason: string };
    "post:published": { postId: number; title: string };
};

class TypedEmitter<TMap extends Record<string, unknown>> {
    private handlers = new Map<keyof TMap, Array<(payload: any) => void>>();

    on<K extends keyof TMap>(event: K, handler: (payload: TMap[K]) => void): void {
        let list = this.handlers.get(event);
        if (!list) {
            list = [];
            this.handlers.set(event, list);
        }
        list.push(handler);
    }

    emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
        this.handlers.get(event)?.forEach(h => h(payload));
    }
}

const emitter = new TypedEmitter<EventMap>();
emitter.on("user:created", (p) => p.userId);    // p: { userId: number }
emitter.emit("user:created", { userId: 1 });
emitter.emit("user:deleted", { userId: 1 });    // ERROR — missing reason
```

This is the foundation of many TS libraries — fully-typed event systems, RPC, route handlers.

### Builder pattern with generic state
```typescript
class QueryBuilder<T, Selected = T> {
    select<K extends keyof T>(keys: K[]): QueryBuilder<T, Pick<T, K>> {
        return this as any;
    }

    where(predicate: (item: T) => boolean): this {
        return this;
    }

    execute(): Promise<Selected[]> {
        return Promise.resolve([]);
    }
}

const q = new QueryBuilder<User>()
    .select(["id", "name"])
    .where(u => u.id > 0);

const results = await q.execute();    // { id: number; name: string }[]
```

The return type evolves as you chain.

---

## 9. When Not to Use Generics

Generics make code reusable; they also make it harder to read. Don't use them when:

- **A union or concrete type would do.** `function f(x: string | number)` is clearer than `function f<T extends string | number>(x: T)`.
- **The type parameter only appears once.** If `T` isn't used in two places, you probably don't need it.
- **The function isn't actually reusable.** Don't preemptively generalize.
- **You're using `any` underneath.** `function f<T>(x: any): any` is just `any` with extra syntax.

### Common over-generic mistake
```typescript
// Doesn't help
function double<T extends number>(x: T): T {
    return x * 2;
}

// Same as
function double(x: number): number {
    return x * 2;
}
```

`T extends number` means `T` could be `42` (literal type). The function ignores that anyway, so no benefit.

### When it does help
```typescript
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

const x = first([alice]);    // x: User | undefined — preserved type info
```

Here `T` connects input and output. That's what makes generics earn their place.

---

Generics are the gateway to the rest of TS's type machinery. Next, `05_advanced_types.md` — utility types, mapped types, conditional types, the full toolbox.
