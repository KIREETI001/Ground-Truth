# 02. Language Basics

> The core grammar of JavaScript — types, variables, operators, control flow, functions, scope.

> Modern JS only. I won't show you `var`, `function() { ... }.bind(this)`, or `for (var i = 0; i < arr.length; i++)` — they're history, except where you must read old code.

---

## Table of Contents

1. [Hello, World](#1-hello-world)
2. [Comments](#2-comments)
3. [Variables: let, const, var](#3-variables-let-const-var)
4. [Primitive Types](#4-primitive-types)
5. [Strings and Template Literals](#5-strings-and-template-literals)
6. [Numbers and BigInt](#6-numbers-and-bigint)
7. [Booleans, Truthy/Falsy, ==/===](#7-booleans-truthyfalsy--)
8. [null and undefined](#8-null-and-undefined)
9. [Operators](#9-operators)
10. [Destructuring & Spread](#10-destructuring--spread)
11. [Control Flow](#11-control-flow)
12. [Functions](#12-functions)
13. [Scope and Hoisting](#13-scope-and-hoisting)
14. [Strict Mode](#14-strict-mode)
15. [Common Style Conventions](#15-common-style-conventions)

---

## 1. Hello, World

```javascript
// hello.js
console.log("Hello, World!");
```

```bash
node hello.js
```

---

## 2. Comments

```javascript
// single-line comment

/* block
   comment */

/**
 * JSDoc — documentation comment.
 * @param {string} name - the name
 * @returns {string}
 */
function greet(name) { return `Hi, ${name}`; }
```

JSDoc is the convention even in plain JS — IDEs read it for autocomplete and type hints.

---

## 3. Variables: let, const, var

```javascript
const name = "Alice";         // immutable binding (preferred default)
let age = 30;                  // mutable
var legacy = "don't use";      // function-scoped, hoisted — avoid in new code

age = 31;                       // ok
name = "Bob";                   // TypeError: Assignment to constant variable
```

### Rules of thumb
- Default to **`const`**.
- Use **`let`** when you need to reassign.
- Never use **`var`** in new code. It has surprising function-scope and hoisting behavior.

### `const` is shallow
```javascript
const arr = [1, 2, 3];
arr.push(4);                    // OK — mutating, not reassigning
arr = [];                       // TypeError — reassignment

const obj = { x: 1 };
obj.x = 99;                     // OK
obj = {};                       // TypeError
```

For deep immutability use `Object.freeze` (shallow freeze) or libraries like Immer.

### Multiple declarations
```javascript
let a = 1, b = 2, c = 3;        // works but discouraged
const { x, y } = { x: 1, y: 2 };  // destructuring (covered below)
```

---

## 4. Primitive Types

JavaScript has **7 primitive types** plus **objects**:

| Type | Example | Notes |
|---|---|---|
| `number` | `42`, `3.14` | 64-bit float (always) |
| `bigint` | `42n` | Arbitrary precision integer |
| `string` | `"hi"`, `'hi'`, `` `hi` `` | Immutable |
| `boolean` | `true`, `false` | |
| `undefined` | `undefined` | A variable declared but not assigned |
| `null` | `null` | An intentional absence |
| `symbol` | `Symbol("x")` | Unique identifiers |
| `object` | `{}`, `[]`, `new Date()` | Everything else (arrays, functions, etc.) |

```javascript
typeof 42                 // "number"
typeof "hi"               // "string"
typeof true               // "boolean"
typeof undefined          // "undefined"
typeof null               // "object"  ← historical bug
typeof Symbol()           // "symbol"
typeof 42n                // "bigint"
typeof {}                 // "object"
typeof []                 // "object"
typeof function(){}       // "function"
```

Yes, `typeof null === "object"` is a known wart. Use `x === null` to check for null.

---

## 5. Strings and Template Literals

```javascript
const a = 'single quotes';
const b = "double quotes";
const c = `backticks (template literal)`;
```

### Template literals — preferred
```javascript
const name = "Alice";
const age = 30;

// Interpolation
const greeting = `Hi ${name}, you are ${age}.`;

// Multi-line
const msg = `Line 1
Line 2
Line 3`;

// Expressions allowed
const summary = `Total: ${items.length}, average: ${total / items.length}`;
```

Always prefer template literals for any string built from variables.

### Common string methods
```javascript
const s = "  Hello, World!  ";

s.length                     // 18
s.trim()                     // "Hello, World!"
s.trimStart()                // "Hello, World!  "
s.trimEnd()
s.toLowerCase()
s.toUpperCase()
s.replace("World", "JS")     // "  Hello, JS!  "
s.replaceAll("l", "L")
s.split(",")                  // ["  Hello", " World!  "]
"a-b-c".split("-")            // ["a", "b", "c"]
["a", "b", "c"].join("-")     // "a-b-c"
s.includes("ello")            // true
s.startsWith("  H")           // true
s.endsWith("!")               // false (trailing spaces)
s.indexOf("W")                // 9 (or -1 if not found)
s.slice(2, 7)                 // "Hello"
s.slice(-5)                    // "ld!  "
s.repeat(3)
s.padStart(10, "0")            // "0000  Hell" — pad up to length
s.padEnd(20, ".")
s.at(0)                        // " " — like indexing but supports negatives
s.codePointAt(0)               // 32 — Unicode value
```

### Strings are iterable
```javascript
for (const ch of "hello") {
    console.log(ch);
}
// h, e, l, l, o

[..."hello"]                   // ["h", "e", "l", "l", "o"]
```

Strings are immutable. `s.replace(...)` returns a new string.

---

## 6. Numbers and BigInt

```javascript
42                  // integer literal — still a number, still a 64-bit float
3.14
1e6                 // scientific: 1,000,000
0xff                // hex: 255
0b1010              // binary: 10
0o17                // octal: 15

1_000_000           // underscores allowed for readability

Number.MAX_SAFE_INTEGER         // 2^53 - 1
Number.isInteger(42)             // true
Number.isFinite(Infinity)        // false
Number.isNaN(NaN)                 // true
```

### The precision trap
```javascript
0.1 + 0.2                       // 0.30000000000000004
0.1 + 0.2 === 0.3                // false

// For comparison
Math.abs(a - b) < Number.EPSILON

// For currency: store as integer cents, or use a Decimal library
```

### BigInt
```javascript
const big = 9007199254740993n;       // suffix `n`
const huge = BigInt("9".repeat(50));

big + 1n                              // 9007199254740994n
big + 1                                // TypeError — can't mix BigInt and Number
Number(big)                            // careful — precision loss
```

Use BigInt only when you actually need integers beyond 2^53. Don't replace all numbers with it — slower and incompatible with most APIs.

### Math
```javascript
Math.PI; Math.E
Math.floor(3.7)              // 3
Math.ceil(3.2)               // 4
Math.round(3.5)              // 4
Math.trunc(-3.7)              // -3 (toward zero)
Math.abs(-5)                  // 5
Math.sqrt(16)                  // 4
Math.pow(2, 10)                // 1024 — same as 2 ** 10
Math.min(1, 2, 3); Math.max(1, 2, 3)
Math.min(...arr)              // spread for arrays
Math.random()                  // [0, 1)
Math.log(10); Math.log2(8); Math.log10(100)
Math.sin(0); Math.cos(0)
```

### Conversion
```javascript
Number("42")                  // 42
Number("3.14")                 // 3.14
Number("oops")                 // NaN
Number(true)                    // 1
Number(false)                   // 0
Number(null)                    // 0
Number(undefined)               // NaN
Number("")                      // 0       ← surprise
parseInt("42px", 10)            // 42
parseInt("ff", 16)              // 255
parseFloat("3.14abc")            // 3.14
String(42)                       // "42"
(42).toString()
(255).toString(16)               // "ff"
(3.14159).toFixed(2)              // "3.14" (string!)
```

`Number()` is strict; `parseInt`/`parseFloat` are lenient.

---

## 7. Booleans, Truthy/Falsy, ==/===

```javascript
true; false;
```

### Falsy values
```javascript
false
0, -0, 0n
""
null
undefined
NaN
```

**Everything else is truthy**, including `"false"`, `"0"`, `[]`, `{}`.

```javascript
if (str) { /* runs if str is a non-empty string */ }
if (arr.length) { /* runs if array has items */ }
const name = userInput || "Anonymous";   // fallback
```

### `==` vs `===` (use `===`)
```javascript
0 == "0"           // true   (type coercion)
0 == false         // true
null == undefined  // true
[] == false        // true   (yes, really)
[] == ![]          // true   (please move on)

0 === "0"          // false  (strict — no coercion)
null === undefined // false
```

**Always use `===` and `!==`**. The exception: `x == null` is a useful shortcut for "is `x` null or undefined" — but a lot of linters flag it; use `x === null || x === undefined` if your team prefers explicit.

### Nullish coalescing `??`
```javascript
const a = 0;
a || "default"            // "default" — 0 is falsy
a ?? "default"            // 0 — only null/undefined trigger default
```

Use `??` when you want to default *only* on `null` / `undefined`. Use `||` when any falsy should default.

### Optional chaining `?.`
```javascript
const user = getUser();
const city = user?.address?.city ?? "unknown";
const first = arr?.[0];
const result = fn?.(arg);   // call if fn is defined
```

Reads "if everything to the left is non-null/undefined, evaluate it; otherwise produce undefined."

### Logical operators
```javascript
true && false          // false — returns the first falsy or the last truthy
"hi" && "world"         // "world"
"" && "world"           // ""

true || false           // true — returns the first truthy or the last falsy
null || "fallback"       // "fallback"

!true                   // false
!""                     // true
!!value                 // explicit conversion to boolean
```

### Logical assignment (ES2021)
```javascript
a ||= b           // a = a || b
a &&= b           // a = a && b
a ??= b           // a = a ?? b
```

---

## 8. null and undefined

- **`undefined`** — JavaScript's default for "no value": uninitialized variables, missing function arguments, missing object properties.
- **`null`** — *your* choice to indicate "intentionally absent."

```javascript
let x;                   // x is undefined
const obj = {};
obj.missing              // undefined
function f(a) { return a; }
f()                       // undefined

let y = null;             // explicit empty

x === undefined           // true
y === null                // true
y == null                  // true (also matches undefined)
```

A common pattern: API functions return `null` to mean "not found," and `undefined` means "didn't try / not applicable."

### `void`
```javascript
void 0                    // undefined
```

Mostly a historical curiosity. You'll see `<a href="javascript:void(0)">` in old HTML.

---

## 9. Operators

### Arithmetic
```javascript
+ - * / % **          // standard
++ --                  // increment/decrement (post and pre)
```

`/` always returns float division. `%` is the remainder. `**` is exponent.

### String + Number
```javascript
"5" + 3                // "53"     — + with a string is concatenation
"5" - 3                // 2        — - coerces to number
"5" * 3                // 15
+"5"                   // 5         — unary plus converts to number
```

This is the kind of corner that drives people to TypeScript.

### Comparison
```javascript
== != === !==          // (use === !==)
< > <= >=
```

### Logical
```javascript
&& || !
?? ?.                   // nullish coalescing, optional chaining
```

### Bitwise
```javascript
& | ^ ~ << >> >>>      // standard bitwise
0b1010 & 0b1100         // 8 (0b1000)
```

`>>>` is unsigned right shift — JS-only.

### Comma operator (rarely useful)
```javascript
let x = (1, 2, 3);      // x is 3 — evaluates each, returns last
```

### typeof, instanceof, in, delete
```javascript
typeof x                // "string"
x instanceof Date        // true if x is a Date

"key" in obj             // true if obj has property "key" (including prototype)
obj.hasOwnProperty("key")
Object.hasOwn(obj, "key")  // preferred — own properties only

delete obj.key           // remove a property
```

### Spread `...` and rest `...`
Different uses of the same syntax:
```javascript
// Spread in calls / arrays / objects
Math.max(...[1, 2, 3])
const arr = [...a, ...b]
const obj = { ...defaults, ...overrides }

// Rest in function params or destructuring
function sum(...nums) { ... }
const [first, ...rest] = arr
const { name, ...others } = obj
```

---

## 10. Destructuring & Spread

You'll use these constantly.

### Array destructuring
```javascript
const [a, b, c] = [1, 2, 3];
const [, , third] = [1, 2, 3];        // skip elements
const [first, ...rest] = [1, 2, 3, 4]; // rest gets [2, 3, 4]
const [x = 10] = [];                    // default: x = 10
const [p, q] = [q, p];                   // swap (after declaring both)
```

### Object destructuring
```javascript
const { name, age } = { name: "Alice", age: 30, city: "NYC" };
const { name: n, age: a } = obj;        // rename
const { country = "USA" } = {};          // default
const { user: { name } } = response;     // nested
const { name, ...rest } = obj;           // rest

// In function parameters
function greet({ name, age = 18 }) { ... }
greet({ name: "Alice" });
```

### Spread
```javascript
// Array clone (shallow)
const copy = [...arr];

// Concat
const combined = [...a, ...b];

// Insert
const inserted = [...arr.slice(0, 2), "X", ...arr.slice(2)];

// Object merge (later overrides earlier)
const merged = { ...defaults, ...overrides };

// Function args
const args = [1, 2, 3];
fn(...args);
```

**Spread is shallow.** Nested objects/arrays are shared. Use `structuredClone(obj)` for deep clone (built-in, modern browsers + Node 17+).

---

## 11. Control Flow

### if / else if / else
```javascript
if (x > 10) {
    big();
} else if (x > 0) {
    small();
} else {
    zero_or_negative();
}
```

Braces are optional for single-statement blocks but **always include them** — it's a footgun otherwise.

### Ternary
```javascript
const status = age >= 18 ? "adult" : "minor";
```

### switch
```javascript
switch (day) {
    case "Mon":
    case "Tue":
    case "Wed":
        return "early week";
    case "Thu":
    case "Fri":
        return "late week";
    case "Sat":
    case "Sun":
        return "weekend";
    default:
        throw new Error("invalid day");
}
```

**Always `break`** or `return` in each case. Falling through to the next case is technically allowed but trips people up — annotate with a comment if intentional.

Better than nested `if/else` for branching on a single discriminator. For shape-matching, use objects:
```javascript
const handlers = {
    success: handleSuccess,
    error: handleError,
    pending: handlePending,
};
(handlers[status] ?? handleDefault)(data);
```

### for / for...of / for...in
```javascript
// Classic for — rarely needed
for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
}

// for...of — iterates VALUES of any iterable (preferred)
for (const item of arr) { ... }
for (const ch of "hello") { ... }
for (const [key, value] of Object.entries(obj)) { ... }
for (const [i, v] of arr.entries()) { ... }   // with index

// for...in — iterates KEYS of an object (rarely what you want)
for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
        console.log(key, obj[key]);
    }
}
```

Use `for...of` for arrays and iterables. Use `for...in` only for plain objects (and prefer `Object.entries`).

### while / do...while
```javascript
while (condition) { ... }

do {
    ...
} while (condition);
```

### break / continue
```javascript
for (const x of arr) {
    if (x === target) break;
    if (x < 0) continue;
    process(x);
}

// Labeled — for breaking nested loops
outer: for (const row of grid) {
    for (const cell of row) {
        if (cell === null) break outer;
    }
}
```

Labels are rare. Often a sign you should extract a function and `return`.

---

## 12. Functions

### Function declarations
```javascript
function add(a, b) {
    return a + b;
}
```

Hoisted — you can call `add` above its declaration in the same scope.

### Function expressions
```javascript
const add = function(a, b) {
    return a + b;
};
```

Not hoisted. The variable name (`add` here) is what matters.

### Arrow functions
```javascript
const add = (a, b) => a + b;          // implicit return
const square = x => x * x;             // single param, no parens needed
const noop = () => {};                  // no params, empty body

// Multi-line: needs braces and explicit return
const doStuff = (x) => {
    const y = x * 2;
    return y + 1;
};

// Returning an object literal — wrap in parens
const makePoint = (x, y) => ({ x, y });
```

Arrow functions:
- Don't have their own `this` (inherit from enclosing scope).
- Don't have `arguments`.
- Can't be used as constructors (`new ArrowFn()` throws).
- More concise — preferred for short callbacks.

### Default parameters
```javascript
function greet(name, greeting = "Hello") {
    return `${greeting}, ${name}!`;
}
greet("Alice");                  // "Hello, Alice!"
greet("Bob", "Hi");              // "Hi, Bob!"
```

### Rest parameters
```javascript
function sum(...nums) {
    return nums.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4);                 // 10
```

### Named arguments via destructuring
JavaScript doesn't have keyword arguments. Pattern:
```javascript
function makeRequest({ url, method = "GET", headers = {}, body } = {}) {
    ...
}
makeRequest({ url: "/api", method: "POST", body: data });
```

Standard for any function with more than 2-3 parameters.

### Returning multiple values
Wrap in an array or object:
```javascript
function minMax(arr) {
    return [Math.min(...arr), Math.max(...arr)];
}
const [min, max] = minMax([3, 1, 5, 2]);

// Or named
function divmod(a, b) {
    return { quotient: Math.floor(a / b), remainder: a % b };
}
const { quotient, remainder } = divmod(10, 3);
```

### IIFE (Immediately Invoked Function Expression)
```javascript
(function() {
    // private scope
    const secret = 42;
})();

(() => {
    // arrow IIFE
})();
```

Historically used to create scopes (pre-`let`/`const`). With block scoping, you rarely need them. They still appear in module bundles and legacy code.

### Generator functions
```javascript
function* counter() {
    let n = 0;
    while (true) yield n++;
}
const c = counter();
c.next().value;       // 0
c.next().value;       // 1

for (const x of counter()) {
    if (x > 3) break;
    console.log(x);
}
```

Used for lazy sequences and (historically) async patterns. Async/await mostly replaced their async use case.

---

## 13. Scope and Hoisting

### Block scope (let, const) vs function scope (var)
```javascript
{
    let a = 1;
    const b = 2;
    var c = 3;
}
console.log(a);       // ReferenceError
console.log(b);       // ReferenceError
console.log(c);       // 3 — var leaks out
```

### Hoisting
JavaScript hoists declarations to the top of their scope:
```javascript
console.log(x);        // undefined (declaration hoisted, value not assigned yet)
var x = 5;

console.log(y);        // ReferenceError ("temporal dead zone")
let y = 5;

console.log(fn());      // "hi" — function declarations are fully hoisted
function fn() { return "hi"; }
```

Practical takeaway: declare before use. Modern linting enforces this.

### Closures
```javascript
function makeCounter() {
    let count = 0;
    return () => ++count;
}

const counter = makeCounter();
counter();        // 1
counter();        // 2
counter();        // 3
```

Each call to `makeCounter` creates a new closure with its own `count`. Used heavily for state, event handlers, partial application.

### `this`
The most-asked JavaScript question. `this` is determined by **how a function is called**, not where it's defined.

```javascript
const obj = {
    name: "Alice",
    greet() {
        console.log(this.name);
    },
};

obj.greet();              // "Alice" — `this` is obj

const fn = obj.greet;
fn();                      // undefined — `this` is global (or undefined in strict mode)

obj.greet.call({ name: "Bob" });   // "Bob"
obj.greet.apply({ name: "Bob" });  // "Bob"
const bound = obj.greet.bind({ name: "Carol" });
bound();                            // "Carol"
```

Arrow functions don't have their own `this`:
```javascript
const obj = {
    name: "Alice",
    delayed() {
        setTimeout(() => console.log(this.name), 100);
        //         ^ arrow — uses obj's `this`
        setTimeout(function() { console.log(this.name); }, 100);
        //         ^ regular — `this` is whatever setTimeout passes
    },
};
```

Modern code mostly uses arrows precisely to avoid `this` confusion. More on `this` in `04_oop.md`.

---

## 14. Strict Mode

```javascript
"use strict";
// at the top of a file or function — opts into stricter rules
```

In strict mode:
- Assigning to undeclared variables throws (instead of silently creating a global).
- `this` in regular functions is `undefined` (not the global).
- Some footguns are errors instead of silent bugs.

ES modules (`<script type="module">` or `.mjs` / `"type": "module"`) are always strict. Same for class bodies. For most modern code, strict mode is implicit. If you're writing classic scripts, add `"use strict"` at the top.

---

## 15. Common Style Conventions

JavaScript has multiple style guides (Airbnb, Standard, Google), but most teams now defer to **Prettier** for formatting (no debates) and **ESLint** for catching issues.

Conventions worth knowing:
- **`camelCase`** for variables and functions: `userName`, `getUserById`.
- **`PascalCase`** for classes and constructors: `class UserService { ... }`.
- **`UPPER_SNAKE_CASE`** for module-level constants: `const MAX_RETRIES = 3`.
- **`_leading`** is sometimes used for "private" (informal).
- **`#leading`** is real private (class fields, covered in `04_oop.md`).
- **Semicolons** — Prettier inserts them; some style guides omit them (Standard.js). Pick one per project.
- **Single vs double quotes** — Prettier defaults to double; many teams prefer single. Pick one.
- **2-space or 4-space indent** — Prettier defaults to 2. Pick one.
- **No `var`. No `==`. No `with`. No `eval`.** These rules pay for themselves.

```javascript
// Prettier-friendly modern JS
const fetchUser = async (id) => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user ${id}`);
    }
    return response.json();
};
```

Run `prettier --write .` once on any new project; commit the config; don't debate spacing in PRs.

---

Next: working with collections — `03_data_structures.md`.
