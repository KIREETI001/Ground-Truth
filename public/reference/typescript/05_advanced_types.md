# 05. Advanced Types

> Mapped types, conditional types, template literal types, `infer`, and the built-in utility types.

> If you find yourself reading this file repeatedly, that's normal. These tools take practice.

---

## Table of Contents

1. [Built-in Utility Types](#1-built-in-utility-types)
2. [Mapped Types](#2-mapped-types)
3. [Conditional Types](#3-conditional-types)
4. [`infer`](#4-infer)
5. [Template Literal Types](#5-template-literal-types)
6. [`keyof`, `typeof`, indexed access](#6-keyof-typeof-indexed-access)
7. [Recursion in Types](#7-recursion-in-types)
8. [Practical Recipes](#8-practical-recipes)
9. [`type-fest` and Friends](#9-type-fest-and-friends)

---

## 1. Built-in Utility Types

The standard library ships with helpers worth memorizing.

### `Partial<T>` — all properties optional
```typescript
type User = { id: number; name: string; email: string };
type UserUpdate = Partial<User>;
// { id?: number; name?: string; email?: string }
```

### `Required<T>` — all properties required
```typescript
type Config = { host?: string; port?: number };
type FullConfig = Required<Config>;
// { host: string; port: number }
```

### `Readonly<T>`
```typescript
type ImmutableUser = Readonly<User>;
const u: ImmutableUser = { id: 1, name: "A", email: "a@x" };
u.name = "B";    // ERROR
```

### `Pick<T, K>` — select keys
```typescript
type UserPreview = Pick<User, "id" | "name">;
// { id: number; name: string }
```

### `Omit<T, K>` — exclude keys
```typescript
type UserWithoutEmail = Omit<User, "email">;
// { id: number; name: string }
```

### `Record<K, V>` — object with known keys
```typescript
type Statuses = Record<"active" | "pending", string>;
// { active: string; pending: string }
```

### `Exclude<U, V>` — remove from union
```typescript
type T = Exclude<"a" | "b" | "c", "a">;     // "b" | "c"
type Numeric = Exclude<string | number | boolean, string | boolean>;   // number
```

### `Extract<U, V>` — keep matching from union
```typescript
type T = Extract<"a" | "b" | 1 | 2, string>;   // "a" | "b"
```

### `NonNullable<T>`
```typescript
type T = NonNullable<string | null | undefined>;    // string
```

### `Parameters<F>` — tuple of function parameter types
```typescript
function f(a: number, b: string) {}
type FArgs = Parameters<typeof f>;    // [number, string]
```

### `ReturnType<F>`
```typescript
type FReturn = ReturnType<typeof f>;    // void
```

### `Awaited<T>` — unwrap `Promise<T>` (TS 4.5+)
```typescript
type T = Awaited<Promise<string>>;        // string
type U = Awaited<Promise<Promise<number>>>;  // number — recursive
```

### `ConstructorParameters<T>` and `InstanceType<T>`
```typescript
class Greeter {
    constructor(public name: string, public greeting: string) {}
}

type Args = ConstructorParameters<typeof Greeter>;    // [string, string]
type Instance = InstanceType<typeof Greeter>;          // Greeter
```

### `ThisParameterType`, `OmitThisParameter`
For functions with explicit `this` parameter. Niche.

### Use them all the time
These cover 80% of "I need to transform a type" situations. Most of the rest comes from mapped + conditional types below.

---

## 2. Mapped Types

Iterate over keys and transform each.

```typescript
type Optional<T> = {
    [K in keyof T]?: T[K];
};
// Equivalent to Partial<T>

type ReadOnly<T> = {
    readonly [K in keyof T]: T[K];
};
// Equivalent to Readonly<T>

type Nullable<T> = {
    [K in keyof T]: T[K] | null;
};

type Stringify<T> = {
    [K in keyof T]: string;
};
```

### Modifiers
```typescript
type RemoveOptional<T> = {
    [K in keyof T]-?: T[K];          // remove `?`
};

type RemoveReadonly<T> = {
    -readonly [K in keyof T]: T[K];   // remove `readonly`
};
```

### Key remapping (TS 4.1+)
```typescript
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<{ name: string; age: number }>;
// {
//   getName: () => string;
//   getAge: () => number;
// }
```

The `as` clause lets you transform keys. Combined with template literal types (next section), this is how libraries auto-generate types from schemas.

### Filtering keys
```typescript
type StringKeys<T> = {
    [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type Filtered = StringKeys<{ name: string; age: number; email: string }>;
// { name: string; email: string }
```

`as never` removes the key — used as a filtering mechanism.

### Picking by value type
```typescript
type PickByValue<T, V> = {
    [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type Funcs = PickByValue<{ a: () => void; b: number; c: () => string }, Function>;
// { a: () => void; c: () => string }
```

### `DeepPartial`
Recursive partial — useful for "any subset of a config":
```typescript
type DeepPartial<T> = T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

type Config = {
    server: { host: string; port: number };
    db: { url: string; timeout: number };
};

const partial: DeepPartial<Config> = {
    server: { host: "localhost" },     // missing port is OK
};
```

(`type-fest`'s `PartialDeep` is more battle-tested for edge cases.)

### `DeepReadonly`
```typescript
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

---

## 3. Conditional Types

`T extends U ? X : Y` — if-else for types.

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<"hi">;        // true
type B = IsString<42>;           // false

type NonEmptyString<T> = T extends "" ? never : T;
type X = NonEmptyString<"hi">;   // "hi"
type Y = NonEmptyString<"">;     // never
```

### Distribution over unions
```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type A = NonNullable<string | null | undefined>;
// string | never | never
// = string
```

When the input is a union and used as a "naked type parameter," conditional types **distribute** — applied to each member separately.

### Disabling distribution
Wrap the type in a tuple `[T]`:
```typescript
type IsUnion<T, U = T> = [T] extends [U]
    ? (U extends any ? ([T] extends [U] ? false : true) : false)
    : true;
// (one of many tricky implementations)

type IsExactlyString<T> = [T] extends [string] ? true : false;
type A = IsExactlyString<string | number>;     // false (not distributed)
```

The `[T] extends [U]` form treats T as a unit, not member-by-member.

### Built-in distribution patterns
```typescript
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>;
// = string[] | number[]
```

Most utility types in TS work via this trick.

### Combining with mapped types
```typescript
type Mutable<T> = {
    [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
```

Picks only function-typed properties.

---

## 4. `infer`

Extract a type from another type.

```typescript
type Unpack<T> = T extends Promise<infer U> ? U : T;
type X = Unpack<Promise<string>>;    // string
type Y = Unpack<number>;              // number

type ArrayElement<T> = T extends (infer U)[] ? U : never;
type Z = ArrayElement<string[]>;      // string
type ZZ = ArrayElement<[1, 2, 3]>;     // 1 | 2 | 3
```

### `ReturnType` implementation
```typescript
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

### Multiple `infer`
```typescript
type FirstAndLast<T> =
    T extends [infer F, ...any[], infer L] ? [F, L] : never;

type X = FirstAndLast<[1, 2, 3, 4, 5]>;   // [1, 5]
```

### `infer extends` constraints (TS 4.7+)
```typescript
type FirstNumber<T> = T extends [infer F extends number, ...any[]] ? F : never;
type X = FirstNumber<[1, 2, 3]>;     // 1
type Y = FirstNumber<["a", 1]>;      // never
```

### Common `infer` recipes
```typescript
// Unwrap Promise
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// Get first array element
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;

// Get rest of array
type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;

// Get function parameters
type Args<T> = T extends (...args: infer A) => any ? A : never;

// Get last parameter
type LastArg<T> = T extends (...args: [...any[], infer L]) => any ? L : never;
```

---

## 5. Template Literal Types

Type-level string manipulation.

```typescript
type Hello = `Hello, ${string}`;
const a: Hello = "Hello, Alice";       // OK
const b: Hello = "Hi, Alice";          // ERROR

type Greeting = `${"Hello" | "Hi"}, ${string}`;
const c: Greeting = "Hello, Bob";       // OK
const d: Greeting = "Hi, Carol";        // OK

type Path = `/api/v${number}/${string}`;
const p: Path = "/api/v1/users";       // OK
```

### Built-in string manipulation
```typescript
type A = Uppercase<"hello">;      // "HELLO"
type B = Lowercase<"HELLO">;      // "hello"
type C = Capitalize<"hello">;     // "Hello"
type D = Uncapitalize<"Hello">;    // "hello"
```

### Splitting strings
```typescript
type Split<S extends string, D extends string> =
    S extends `${infer Head}${D}${infer Tail}`
        ? [Head, ...Split<Tail, D>]
        : [S];

type Parts = Split<"a.b.c.d", ".">;    // ["a", "b", "c", "d"]
```

### Replacing
```typescript
type Replace<S extends string, From extends string, To extends string> =
    S extends `${infer Head}${From}${infer Tail}`
        ? `${Head}${To}${Replace<Tail, From, To>}`
        : S;
```

### Use cases
```typescript
// Typed event names
type Event = `user:${"login" | "logout" | "signup"}` | `post:${"create" | "delete"}`;

// Typed route paths
type Route = `/api/users/${number}` | `/api/posts/${number}`;

// Typed CSS units
type CSSValue = `${number}${"px" | "em" | "rem" | "%"}`;

// Auto-derived getter names
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

These patterns let you make APIs that catch typos at compile time.

---

## 6. `keyof`, `typeof`, indexed access

### `keyof T`
```typescript
type User = { id: number; name: string; email: string };
type UserKeys = keyof User;            // "id" | "name" | "email"

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}
```

For `Record<string, T>`, `keyof` is `string`. For `Record<number, T>`, `keyof` is `number`.

### `typeof` in type position
```typescript
const user = { id: 1, name: "Alice" };
type UserType = typeof user;        // { id: number; name: string }

const STATUSES = ["active", "pending"] as const;
type Status = typeof STATUSES[number];   // "active" | "pending"

function makeUser() { return { id: 1, name: "Alice" }; }
type User = ReturnType<typeof makeUser>;
```

`typeof` in type-position is the bridge from value world to type world. Used constantly.

### Indexed access (`T[K]`)
```typescript
type User = { id: number; name: string; address: { city: string } };

type Id = User["id"];                  // number
type City = User["address"]["city"];   // string
type AllValues = User[keyof User];     // number | string | { city: string }

// Element types
type Users = User[];
type FirstUser = Users[0];              // User
type AnyUser = Users[number];           // User
```

`T[number]` gets the element type of an array. `T[keyof T]` gets the union of all property types.

### Index signatures and `keyof`
```typescript
type Dict = { [k: string]: number };
type K = keyof Dict;                    // string | number (numeric indices are valid for strings too)
```

A wart of how JS objects work — both string and number keys exist.

---

## 7. Recursion in Types

Conditional types support recursion (with a depth limit ~50).

### `DeepPartial` (recursive)
```typescript
type DeepPartial<T> = T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
```

### Flatten arrays
```typescript
type Flatten<T> = T extends (infer U)[]
    ? U extends any[]
        ? Flatten<U>
        : U
    : T;

type X = Flatten<number[][][][]>;       // number
```

### Path types
```typescript
type Paths<T, Prefix extends string = ""> = T extends object
    ? {
        [K in keyof T & string]:
            | `${Prefix}${K}`
            | Paths<T[K], `${Prefix}${K}.`>;
      }[keyof T & string]
    : never;

type User = {
    id: number;
    address: { city: string; zip: string };
};

type P = Paths<User>;
// "id" | "address" | "address.city" | "address.zip"
```

Powerful — but watch out:
- Compiler can hit instantiation limits.
- Error messages become incomprehensible.
- Slow for large types.

When you need this in production code, libraries like `ts-toolbelt` and `type-fest` have battle-tested versions.

### `JSONValue` — recursive shape
```typescript
type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [k: string]: JSONValue };
```

---

## 8. Practical Recipes

### "All optional except these"
```typescript
type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

type User = { id: number; name?: string; email?: string };
type UserWithName = RequireKeys<User, "name">;
// { id: number; name: string; email?: string }
```

### "Either A or B, not both"
```typescript
type XOR<A, B> =
    | (A & { [K in Exclude<keyof B, keyof A>]?: never })
    | (B & { [K in Exclude<keyof A, keyof B>]?: never });

type Either =
    | { email: string }
    | { phone: string };

// vs. true XOR — not both allowed
const a: Either = { email: "x" };
const b: Either = { phone: "x" };
const c: Either = { email: "x", phone: "x" };   // allowed with vanilla union; not with XOR
```

This kind of type-level logic gets unwieldy fast. Prefer discriminated unions when possible.

### "Function with one required arg, rest optional"
```typescript
type Func<T> = (required: T, ...optional: any[]) => any;
```

### "Tuple to union"
```typescript
type T = ["a", "b", "c"];
type Union = T[number];      // "a" | "b" | "c"
```

### "Union to tuple" — *don't do this*
The well-known hack uses contravariance + intersection. Slow, fragile, often unsound. Refactor to keep tuples as tuples.

### Strongly-typed `Object.entries` / `Object.keys`
TS's `Object.keys` returns `string[]`, not `(keyof T)[]`, because of structural typing:
```typescript
const obj = { a: 1, b: 2 };
Object.keys(obj);                         // string[] — TS conservatism

// Cast if you trust the input shape
(Object.keys(obj) as (keyof typeof obj)[]).forEach(k => obj[k]);
```

The conservative typing is technically right — TS doesn't know an object doesn't have *more* properties than its type says. But often you want the precise type. Define a helper:
```typescript
function typedKeys<T extends object>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}
```

### Strongly-typed `JSON.parse`
There isn't one — JSON is just `unknown`. Validate with Zod and you get a typed result.

### Discriminated union helpers
```typescript
type Discriminate<T, K extends string, V> = T extends { [P in K]: V } ? T : never;

type Shape =
    | { kind: "circle"; r: number }
    | { kind: "square"; s: number };

type Circle = Discriminate<Shape, "kind", "circle">;
// { kind: "circle"; r: number }
```

### Mutating a readonly array's type back to mutable
```typescript
type Mutable<T> = {
    -readonly [K in keyof T]: Mutable<T[K]>;
};

const FROZEN = [1, 2, 3] as const;     // readonly [1, 2, 3]
type T = Mutable<typeof FROZEN>;        // [1, 2, 3]
```

---

## 9. `type-fest` and Friends

You don't have to invent all of this. **`type-fest`** by sindresorhus has hundreds of carefully-crafted utility types.

```bash
npm install type-fest
```

```typescript
import {
    PartialDeep,
    ReadonlyDeep,
    Merge,
    OmitDeep,
    PickDeep,
    RequireAtLeastOne,
    RequireExactlyOne,
    RequireAllOrNone,
    Simplify,
    LiteralUnion,
    Tagged,           // for branded types
    Promisable,
    Constructor,
    PackageJson,      // typed package.json
    TsConfigJson,     // typed tsconfig
    Jsonify,
    Stringified,
    UnionToIntersection,
} from "type-fest";
```

A few standouts:

### `Simplify<T>` — flatten the type for prettier hover info
```typescript
type X = Pick<User, "id"> & { admin: true };
// Hover shows: Pick<User, "id"> & { admin: true }

type Y = Simplify<X>;
// Hover shows: { id: number; admin: true }
```

Useful for utility types that produce gnarly displays.

### `LiteralUnion<T, BaseType>` — "literal plus other strings"
```typescript
type Color = LiteralUnion<"red" | "green" | "blue", string>;

const c: Color = "red";       // OK — autocompletes red/green/blue
const c2: Color = "purple";    // OK — also any string
```

The autocomplete suggests the literals but still allows arbitrary strings. Great for APIs with "common values."

### `Tagged<T, Tag>` — branded types
```typescript
type UserId = Tagged<number, "UserId">;
type PostId = Tagged<number, "PostId">;
```

(Covered in detail in file 08.)

### Other libraries
- **`ts-toolbelt`** — bigger, more advanced. Some types are heavyweight; can slow compile.
- **`utility-types`** — older, simpler.
- **`hotscript`** — type-level lambda calculus. Cool, niche.

For everyday use: `type-fest` covers 95% of needs. Reach for it before writing your own complex types.

---

The type system is large. Most production code uses a small slice: the built-in utility types, discriminated unions, generic functions, `keyof`/`typeof`/indexed access. The rest (deep recursion, fancy template literal tricks, conditional type contortions) is for library authors and advanced infrastructure.

If you find yourself fighting the type system for hours, consider:
1. Could a runtime check + Zod schema do this better?
2. Could the API be redesigned to avoid the gnarly type?
3. Is `unknown` plus narrowing sufficient?

Often the answer is yes. Types should serve code, not the other way around.

Next file: TS-specific class features and decorators — `06_classes_and_decorators.md`.
