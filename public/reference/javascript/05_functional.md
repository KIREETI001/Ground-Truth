# 05. Functional Patterns

> First-class functions, closures, higher-order functions, currying, immutability — the functional side of JS.

---

## Table of Contents

1. [Functions as Values](#1-functions-as-values)
2. [Closures (Recap)](#2-closures-recap)
3. [Higher-Order Functions](#3-higher-order-functions)
4. [Pure Functions](#4-pure-functions)
5. [Currying and Partial Application](#5-currying-and-partial-application)
6. [Function Composition](#6-function-composition)
7. [Memoization](#7-memoization)
8. [Throttle and Debounce](#8-throttle-and-debounce)
9. [Immutability in Practice](#9-immutability-in-practice)
10. [Pattern Library](#10-pattern-library)

---

## 1. Functions as Values

In JS, functions are objects.

```javascript
const greet = name => `Hi, ${name}`;

const fns = {
    greet,
    farewell: name => `Bye, ${name}`,
};

const list = [greet, x => x.toUpperCase()];

function dispatch(action) {
    const handler = actions[action.type];
    return handler?.(action.payload);
}
```

This is why callbacks, event handlers, and array methods like `map`/`filter` work the way they do.

---

## 2. Closures (Recap)

A closure is an inner function that captures variables from its enclosing scope.

```javascript
function makeAdder(n) {
    return x => x + n;
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);

add5(3);    // 8
add10(3);   // 13
```

Each call to `makeAdder` creates a separate closure with its own `n`. This is the foundation of factories, hooks, and module-style state.

### The classic loop gotcha (mostly fixed by `let`)
```javascript
// Pre-ES6, this was the famous bug:
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0);
}
// Prints: 3, 3, 3   (all closures share the same `i`)

// With `let`, each iteration has its own binding:
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0);
}
// Prints: 0, 1, 2
```

Use `let`/`const`. The bug only haunts old code now.

---

## 3. Higher-Order Functions

Functions that take or return functions. JavaScript leans heavily on them.

```javascript
// Take a function
function apply(fn, x) {
    return fn(x);
}

// Return a function
function adder(n) {
    return x => x + n;
}

// Array methods are all higher-order
[1, 2, 3].map(x => x * 2);
[1, 2, 3].filter(x => x > 1);
[1, 2, 3].reduce((a, b) => a + b, 0);

// Event handlers
button.addEventListener("click", (e) => { ... });

// Decorators / wrappers
function withLogging(fn) {
    return (...args) => {
        console.log("calling with", args);
        const result = fn(...args);
        console.log("got", result);
        return result;
    };
}
const tracedAdd = withLogging((a, b) => a + b);
tracedAdd(2, 3);    // logs and returns 5
```

---

## 4. Pure Functions

A pure function:
- Returns the same output for the same input.
- Has no side effects.

```javascript
// Pure
const double = x => x * 2;
const add = (a, b) => a + b;
const upper = s => s.toUpperCase();

// Impure (side effects)
let count = 0;
const increment = () => count++;             // mutates outside state

const getNow = () => Date.now();              // depends on hidden state

const log = msg => { console.log(msg); };    // side effect (IO)
```

Pure functions are easier to test (no setup), parallelize, memoize, and reason about. Aim to keep the core of your logic pure; push side effects to the edges.

---

## 5. Currying and Partial Application

**Currying** transforms `f(a, b, c)` into `f(a)(b)(c)`. Each call returns a function expecting the next argument.

```javascript
// Manual curry
const add = a => b => c => a + b + c;
add(1)(2)(3);          // 6

// Generic curry
const curry = (fn) => {
    return function curried(...args) {
        if (args.length >= fn.length) return fn(...args);
        return (...more) => curried(...args, ...more);
    };
};

const sum3 = curry((a, b, c) => a + b + c);
sum3(1, 2, 3);          // 6
sum3(1)(2)(3);          // 6
sum3(1, 2)(3);          // 6
```

**Partial application** binds *some* args, returns a function expecting the rest. JS's `bind` does this:
```javascript
const greet = (greeting, name) => `${greeting}, ${name}`;
const hello = greet.bind(null, "Hello");
hello("Alice");         // "Hello, Alice"
```

Or via arrow:
```javascript
const hello = name => greet("Hello", name);
```

### When to use
Functional libraries (Ramda, lodash/fp) lean heavily on currying. Vanilla JS rarely needs it. Don't curry just for style — it makes call sites harder to read.

---

## 6. Function Composition

Combining small functions into bigger ones.

```javascript
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

const trim = s => s.trim();
const lower = s => s.toLowerCase();
const exclaim = s => `${s}!`;

const shout = pipe(trim, lower, exclaim);
shout("  HELLO  ");      // "hello!"

// Equivalent
const shout2 = x => exclaim(lower(trim(x)));
```

Use composition when:
- Each step is small and named.
- The pipeline is genuinely reusable.

For one-off, don't make a fuss — just write the inline expression.

---

## 7. Memoization

Cache results of pure functions.

```javascript
function memoize(fn) {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (!cache.has(key)) {
            cache.set(key, fn(...args));
        }
        return cache.get(key);
    };
}

const slowFib = (n) => n < 2 ? n : slowFib(n - 1) + slowFib(n - 2);
const fastFib = memoize((n) => n < 2 ? n : fastFib(n - 1) + fastFib(n - 2));

fastFib(40);    // Fast — each value computed once
```

### Caveats
- Only memoize pure functions.
- `JSON.stringify` as a cache key isn't safe for circular structures.
- Memory grows unbounded — use a Map with manual eviction (LRU) for long-running processes.
- For single-arg primitive keys, a plain `Map` is faster than stringifying.

Libraries: lodash's `memoize`, React's `useMemo`/`useCallback` for component-scoped memoization.

---

## 8. Throttle and Debounce

For event handlers that fire too often (scroll, resize, input).

### Debounce — wait for quiet
Run only after the user stops triggering for N ms.
```javascript
function debounce(fn, ms) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
}

const onSearch = debounce((query) => {
    fetch(`/search?q=${query}`).then(...)
}, 300);

input.addEventListener("input", e => onSearch(e.target.value));
```

### Throttle — rate-limit
Run at most once per N ms.
```javascript
function throttle(fn, ms) {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= ms) {
            lastCall = now;
            fn(...args);
        }
    };
}

const onScroll = throttle(() => {
    updateScrollPosition();
}, 100);
```

Lodash and `lodash/throttle`, `lodash/debounce` are battle-tested implementations with leading/trailing options.

---

## 9. Immutability in Practice

### Spread / rest for shallow updates
```javascript
const next = { ...state, count: state.count + 1 };
const list = [...arr, newItem];
const removed = arr.filter(x => x !== item);
const updated = arr.map(x => x.id === id ? { ...x, name: "new" } : x);
```

### Object.freeze (shallow only)
```javascript
const config = Object.freeze({
    apiUrl: "https://api.example.com",
    timeout: 5000,
});
config.timeout = 10000;     // silently fails (strict mode: throws)
```

### Deep freeze utility
```javascript
function deepFreeze(obj) {
    for (const key of Object.getOwnPropertyNames(obj)) {
        const value = obj[key];
        if (value && typeof value === "object") deepFreeze(value);
    }
    return Object.freeze(obj);
}
```

### Immer — deep updates that look mutable
```javascript
import { produce } from "immer";

const next = produce(state, draft => {
    draft.users[0].name = "Alice";
    draft.tags.push("new");
});
```

Immer uses structural sharing — unchanged parts of `state` are reused in `next`. Used heavily in Redux Toolkit and React state libraries.

### Records and Tuples (proposal — coming someday)
A future ES proposal will add **deeply immutable** built-in record and tuple types. Until then, libraries fill the gap.

---

## 10. Pattern Library

### Optional chaining + nullish coalescing for defaults
```javascript
const city = user?.address?.city ?? "unknown";
```

### Pipeline operator (proposal)
Not standard yet, but you'll see it in proposals:
```javascript
// Future
result = value |> trim |> lower |> exclaim;

// Today
result = pipe(trim, lower, exclaim)(value);
```

### Tagged template literals
```javascript
function html(strings, ...values) {
    return strings.reduce((acc, str, i) =>
        acc + str + (i < values.length ? escape(values[i]) : ""), "");
}

const safe = html`<p>Hello, ${userName}</p>`;
```

Used by libraries like `styled-components`, GraphQL `gql` strings, `dedent`.

### Lazy / generator pipelines
```javascript
function* take(iter, n) {
    let i = 0;
    for (const x of iter) {
        if (i++ >= n) return;
        yield x;
    }
}

function* filter(iter, pred) {
    for (const x of iter) if (pred(x)) yield x;
}

function* map(iter, fn) {
    for (const x of iter) yield fn(x);
}

// Process a huge stream lazily
const first5 = [...take(map(filter(input, x => x > 0), x => x ** 2), 5)];
```

Iterator helpers (ES2025) make this much nicer:
```javascript
input.filter(x => x > 0).map(x => x ** 2).take(5).toArray()
```

### Sentinel functions / strategy pattern
```javascript
const handlers = {
    "open": handleOpen,
    "close": handleClose,
    "ping": handlePing,
};

function onMessage(msg) {
    return (handlers[msg.type] ?? handleUnknown)(msg);
}
```

Cleaner than long `if/else if`. JavaScript objects as dispatch tables are idiomatic.

### `Array.from` for collection constructors
```javascript
Array.from({ length: 5 }, (_, i) => i ** 2)         // [0, 1, 4, 9, 16]
Array.from(document.querySelectorAll("li"))         // NodeList → Array
Array.from(setOrMap)                                  // any iterable → array
```

### `Object.fromEntries` with `Object.entries`
For map/filter/transforms on objects:
```javascript
const upcased = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.toUpperCase(), v])
);
```

### Tap (for debugging chains)
```javascript
const tap = (label) => (x) => { console.log(label, x); return x; };

const result = data
    .filter(x => x.active)
    .map(tap("after filter"))
    .map(x => x.name)
    .map(tap("after map"))
    .sort();
```

---

That's the functional toolkit. JavaScript isn't a pure functional language, but its idioms heavily reward functional thinking. For deeper functional programming, libraries like Ramda, Effect, or fp-ts go further; in practice, native JS + the patterns above cover almost everything.

Next: the JavaScript thing everyone trips over — `06_async.md`.
