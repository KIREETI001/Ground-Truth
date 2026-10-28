# 03. Data Structures

> Arrays, objects, Maps, Sets, strings, and the iteration toolkit JS gives you to work with them.

---

## Table of Contents

1. [Choosing the Right Structure](#1-choosing-the-right-structure)
2. [Arrays](#2-arrays)
3. [Objects](#3-objects)
4. [Maps and WeakMaps](#4-maps-and-weakmaps)
5. [Sets and WeakSets](#5-sets-and-weaksets)
6. [Iteration Protocol](#6-iteration-protocol)
7. [Common Patterns](#7-common-patterns)
8. [Immutability Tips](#8-immutability-tips)
9. [Performance Notes](#9-performance-notes)

---

## 1. Choosing the Right Structure

| Need | Use |
|---|---|
| Ordered list, may have duplicates | `Array` |
| String-keyed record | Plain object `{}` |
| Map with any-type keys / preserves insertion order / frequent insert-delete | `Map` |
| Unique values, fast membership | `Set` |
| Keys that should not prevent garbage collection | `WeakMap` / `WeakSet` |
| Typed numeric data (bytes, large arrays) | `Uint8Array`, `Float32Array`, etc. |

Defaults: arrays and objects for almost everything. Reach for `Map` / `Set` when you need their specific properties.

---

## 2. Arrays

```javascript
const empty = [];
const nums = [1, 2, 3, 4, 5];
const mixed = [1, "two", true, null, { x: 1 }];     // any types
const matrix = [[1, 2], [3, 4]];

Array.of(1, 2, 3)                  // [1, 2, 3]
Array.from("hello")                 // ["h","e","l","l","o"]
Array.from({ length: 5 }, (_, i) => i * 2)   // [0, 2, 4, 6, 8]
new Array(5)                         // [empty × 5] — sparse, beware
new Array(5).fill(0)                  // [0, 0, 0, 0, 0]
```

### Access
```javascript
const a = [10, 20, 30];
a[0]                  // 10
a[-1]                 // undefined — JS doesn't support negative indexing with []
a.at(-1)              // 30        — but .at() does (ES2022)
a.length              // 3
a[100]                 // undefined (no error — arrays are sparse)
```

### Mutating methods (modify the array)
```javascript
a.push(40)            // append; returns new length
a.pop()                // remove and return last
a.unshift(0)            // prepend; returns new length
a.shift()              // remove and return first
a.splice(1, 2)         // remove 2 starting at index 1; returns removed
a.splice(1, 0, "x")    // insert at index 1
a.sort()                // in place — default sort is lexicographic!
a.sort((x, y) => x - y) // numeric ascending
a.reverse()             // in place
a.fill(0)
a.copyWithin(0, 2)
```

### Non-mutating methods (return new array — preferred for clarity)
```javascript
const b = a.slice(1, 3)                    // shallow copy of part
const c = [...a]                            // shallow copy of all
const d = a.concat([99, 100])               // append
const e = a.flat()                           // flatten one level
[1, [2, [3, [4]]]].flat(Infinity)            // fully flatten

// New non-mutating versions (ES2023)
a.toSorted((x, y) => x - y)                  // sorted copy
a.toReversed()
a.toSpliced(1, 2)
a.with(0, 99)                                 // replace index 0 with 99 (copy)
```

### Iteration
```javascript
// forEach — side effects only, no break
a.forEach((value, index) => { ... });

// map — transform each
const doubled = a.map(x => x * 2);

// filter — keep matching
const evens = a.filter(x => x % 2 === 0);

// reduce — collapse to a value
const sum = a.reduce((acc, x) => acc + x, 0);
const max = a.reduce((acc, x) => (x > acc ? x : acc));

// find, findIndex, findLast, findLastIndex
const user = users.find(u => u.id === 42);
const idx = users.findIndex(u => u.active);

// some, every
const anyAdult = users.some(u => u.age >= 18);
const allAdult = users.every(u => u.age >= 18);

// includes
[1, 2, 3].includes(2)             // true (uses ===, handles NaN)

// indexOf, lastIndexOf
[1, 2, 3].indexOf(2)              // 1
[1, 2, 3, 2].lastIndexOf(2)       // 3

// flatMap — map then flatten one level
[[1, 2], [3, 4]].flatMap(x => x)  // [1, 2, 3, 4]
sentences.flatMap(s => s.split(" "))    // tokenize
```

### `for...of` for early-exit
`map`/`filter`/`forEach` always iterate the full array. For early exit, use `for...of` + `break`:
```javascript
for (const item of items) {
    if (predicate(item)) {
        target = item;
        break;
    }
}
// Or just: items.find(predicate)
```

### Chaining
```javascript
const result = users
    .filter(u => u.active)
    .map(u => ({ name: u.name, score: u.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
```

Idiomatic JS. Reads top-to-bottom; each step takes a new array.

### Sparse arrays
```javascript
const a = [];
a[5] = "x";
a.length            // 6
a                   // [empty × 5, "x"]
a[2]                // undefined
```

JS arrays are technically objects with numeric-string keys. Avoid creating sparse arrays — they confuse iteration and some methods skip empty slots.

### Typed arrays
For binary / numeric data:
```javascript
const u8 = new Uint8Array([255, 128, 0]);
const f32 = new Float32Array(1024);            // 1024 floats, all 0
const buf = new ArrayBuffer(16);                // 16 raw bytes
const view = new DataView(buf);
view.setInt32(0, 42, /* littleEndian */ true);
view.getInt32(0, true);                         // 42
```

Used for graphics, audio, networking, file I/O. Much faster than regular arrays for numeric loops.

---

## 3. Objects

Plain objects are dictionaries with string (or symbol) keys.

```javascript
const person = {
    name: "Alice",
    age: 30,
    "email-address": "a@x.com",         // string key
    [Symbol("id")]: 42,                  // symbol key
};

person.name                              // "Alice"
person["email-address"]                  // bracket notation for special keys
person.unknown                           // undefined
person.name = "Bob";                     // assign
delete person.age;                        // remove
"name" in person                         // true
Object.hasOwn(person, "name")            // true (own property — not from prototype)
```

### Object literal shortcuts
```javascript
const name = "Alice";
const age = 30;

const person = { name, age };                  // shorthand: { name: name, age: age }
const obj = {
    sayHi() { return `Hi, ${this.name}`; },     // method shorthand
    [`computed-${name}`]: "value",               // computed key
};
```

### Iterating
```javascript
Object.keys(obj)           // ["name", "age"]
Object.values(obj)         // ["Alice", 30]
Object.entries(obj)         // [["name", "Alice"], ["age", 30]]

for (const [key, value] of Object.entries(obj)) {
    console.log(key, value);
}

// Build from entries
Object.fromEntries([["a", 1], ["b", 2]])    // { a: 1, b: 2 }
```

### Copying and merging
```javascript
// Shallow copy
const copy = { ...obj };
const copy2 = Object.assign({}, obj);

// Merge (later overrides earlier)
const merged = { ...defaults, ...overrides };

// Deep clone (modern)
const deep = structuredClone(obj);
```

`structuredClone` (built into modern browsers + Node 17+) handles dates, Maps, Sets, typed arrays, but not functions or classes.

### Property descriptors
```javascript
Object.defineProperty(obj, "x", {
    value: 42,
    writable: false,      // can't reassign
    enumerable: false,    // hidden from Object.keys
    configurable: false,  // can't delete or reconfigure
});

Object.getOwnPropertyDescriptor(obj, "x");
Object.freeze(obj);                          // shallow immutable
Object.isFrozen(obj);
```

For most code you'll never use these directly. Libraries do for things like getters and reactive frameworks.

### Object.* utilities
```javascript
Object.keys(obj); Object.values(obj); Object.entries(obj);
Object.fromEntries(pairs);
Object.assign(target, ...sources);     // shallow merge — prefer spread
Object.freeze(obj); Object.isFrozen(obj);
Object.create(proto, props);            // create with specific prototype
Object.getPrototypeOf(obj);
Object.setPrototypeOf(obj, proto);      // slow — avoid
Object.hasOwn(obj, "key");              // preferred over hasOwnProperty
Object.groupBy(items, x => x.category)  // ES2024 — group array by key fn
```

### Object vs Map (which?)
Use **plain objects** when:
- Keys are static and known at code time.
- Used like a struct/record.
- JSON serializable.

Use **`Map`** when:
- Keys are non-strings (objects, functions, anything).
- Frequent insertion/deletion of dynamic keys.
- You need to iterate in insertion order (objects do this too, but Maps make it explicit).
- You need `.size`.

---

## 4. Maps and WeakMaps

### `Map`
```javascript
const m = new Map();
m.set("name", "Alice");
m.set(42, "the answer");
m.set({ id: 1 }, "object as key");

m.get("name")            // "Alice"
m.has("name")            // true
m.delete("name")
m.size                    // 2
m.clear()

// Initialize with entries
const m2 = new Map([
    ["a", 1],
    ["b", 2],
]);

// Iteration (insertion order)
for (const [key, value] of m) { ... }
for (const key of m.keys()) { ... }
for (const value of m.values()) { ... }
m.forEach((value, key) => { ... });

// Convert
[...m]                                // [["a", 1], ["b", 2]]
Object.fromEntries(m)                  // { a: 1, b: 2 }   (string keys only)
new Map(Object.entries(obj))           // from plain object
```

### `WeakMap`
Like Map, but keys must be objects, and entries don't prevent garbage collection.
```javascript
const wm = new WeakMap();
let user = { id: 1 };
wm.set(user, { lastSeen: Date.now() });
user = null;          // entry can now be collected
```

Useful for associating metadata with objects without leaking memory. Can't iterate it (that's the point — entries can vanish).

---

## 5. Sets and WeakSets

### `Set`
```javascript
const s = new Set();
s.add(1); s.add(2); s.add(2);     // duplicates ignored
s.size                              // 2
s.has(1)                            // true
s.delete(1)
s.clear()

// Initialize
const s2 = new Set([1, 1, 2, 3]);   // {1, 2, 3}

// Deduplicate an array (one-liner)
const unique = [...new Set(arr)];

// Iteration (insertion order)
for (const x of s) { ... }
```

### Set operations (ES2025)
```javascript
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

a.union(b)               // {1, 2, 3, 4}
a.intersection(b)         // {2, 3}
a.difference(b)           // {1}
a.symmetricDifference(b)   // {1, 4}
a.isSubsetOf(b)
a.isSupersetOf(b)
a.isDisjointFrom(b)
```

If these aren't available yet in your runtime, polyfill or do it manually:
```javascript
const intersection = new Set([...a].filter(x => b.has(x)));
const union = new Set([...a, ...b]);
const difference = new Set([...a].filter(x => !b.has(x)));
```

### `WeakSet`
Same idea as `WeakMap`. Objects only, doesn't prevent GC. Useful for "have I seen this object?" tracking.

---

## 6. Iteration Protocol

Anything implementing `[Symbol.iterator]()` is iterable — usable in `for...of`, spread, destructuring.

Built-in iterables: arrays, strings, Maps, Sets, NodeLists, typed arrays, generators.

### Make your own iterable
```javascript
class Counter {
    constructor(max) {
        this.max = max;
    }
    *[Symbol.iterator]() {
        for (let i = 0; i < this.max; i++) yield i;
    }
}

for (const x of new Counter(3)) {
    console.log(x);     // 0, 1, 2
}
[...new Counter(3)]     // [0, 1, 2]
```

### Generator functions
```javascript
function* range(start, end, step = 1) {
    for (let i = start; i < end; i += step) yield i;
}

[...range(0, 10, 2)]    // [0, 2, 4, 6, 8]
```

Generators are powerful for lazy sequences:
```javascript
function* fibonacci() {
    let [a, b] = [0, 1];
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}

const fib = fibonacci();
const first10 = [];
for (let i = 0; i < 10; i++) first10.push(fib.next().value);
```

### Iterator helpers (ES2025)
```javascript
range(0, 1_000_000)
    .filter(x => x % 7 === 0)
    .map(x => x * x)
    .take(10)
    .toArray()
```

If your runtime doesn't have these yet, libraries like `iter-tools` provide them.

---

## 7. Common Patterns

### Frequencies / counting
```javascript
const counts = {};
for (const item of items) {
    counts[item] = (counts[item] ?? 0) + 1;
}

// Or with Map
const counts = new Map();
for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
}
```

### Group by key
```javascript
// ES2024
const grouped = Object.groupBy(items, x => x.category);
// { fruit: [...], vegetable: [...] }

// Pre-ES2024
const grouped = items.reduce((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
}, {});
```

### Top-N by score
```javascript
const top10 = [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
```

### Deduplicate by key
```javascript
const seen = new Set();
const unique = items.filter(x => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
});

// Or via Map
const unique = [...new Map(items.map(x => [x.id, x])).values()];
```

### Flatten nested arrays
```javascript
arr.flat()              // one level
arr.flat(Infinity)       // all levels
```

### Chunk an array
```javascript
function chunks(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}
```

### Zip two arrays
```javascript
function zip(a, b) {
    const len = Math.min(a.length, b.length);
    return Array.from({ length: len }, (_, i) => [a[i], b[i]]);
}
```

### Range
```javascript
const r = Array.from({ length: 10 }, (_, i) => i);  // [0..9]
const r = [...Array(10).keys()];                     // alternative
```

### Sum / product / average
```javascript
const sum = nums.reduce((a, b) => a + b, 0);
const product = nums.reduce((a, b) => a * b, 1);
const avg = sum / nums.length;
```

### Min/max by key
```javascript
const oldest = users.reduce((max, u) => u.age > max.age ? u : max);
```

### Sort by multiple keys
```javascript
items.sort((a, b) =>
    a.category.localeCompare(b.category) ||
    b.priority - a.priority
);
```

### Convert object to array of key/value pairs
```javascript
Object.entries(obj)
Object.entries(obj).map(([k, v]) => ({ key: k, value: v }))
```

### Invert an object
```javascript
const inverted = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [v, k])
);
```

---

## 8. Immutability Tips

JS doesn't enforce immutability, but functional patterns and libraries (Redux, Immer) often want it.

### Updating without mutation
```javascript
// Array
const updated = [...arr.slice(0, i), newValue, ...arr.slice(i + 1)];   // replace index i
const removed = arr.filter((_, idx) => idx !== i);                       // remove index i
const inserted = [...arr.slice(0, i), value, ...arr.slice(i)];           // insert at i

// Or with the new ES2023 array methods (non-mutating versions)
arr.with(i, newValue)
arr.toSpliced(i, 1)
arr.toSorted((a, b) => a - b)

// Object
const updated = { ...obj, key: newValue };
const { unwanted, ...rest } = obj;       // remove a key
```

### Deep updates with Immer
```bash
npm install immer
```

```javascript
import { produce } from "immer";

const newState = produce(state, draft => {
    draft.users[0].name = "Alice";       // looks mutable, but produces a new state
    draft.posts.push(newPost);
});
```

Immer handles structural sharing — only changed paths are new objects.

---

## 9. Performance Notes

Rough complexities:

| Operation | Array | Object | Map | Set |
|---|---|---|---|---|
| Key/index access | O(1) | O(1) | O(1) | n/a |
| Membership | O(n) (indexOf/includes) | O(1) (in / hasOwn) | O(1) (has) | O(1) (has) |
| Insert end | O(1) (push) | O(1) | O(1) | O(1) |
| Insert front | O(n) (unshift) | O(1) | O(1) | O(1) |
| Delete | O(n) (splice) | O(1) (delete) | O(1) | O(1) |
| Iterate all | O(n) | O(n) | O(n) | O(n) |

### Tips
- For lots of lookups by value, use a `Set` (or `Map` for values).
- Avoid `array.unshift` on big arrays in hot loops.
- `delete` on object properties is fine but discouraged because it deoptimizes the underlying shape — consider `obj[key] = undefined` if it's hot.
- Long lookup chains on objects are slower than direct access. V8 optimizes for stable shapes — don't add/remove properties in hot paths.
- Iterators / generators have overhead; for tight numeric loops, prefer for-loops.

### Profile, don't guess
Same advice as Python: measure with browser devtools or Node's `--inspect`. Premature micro-optimizations hide bigger algorithmic wins.

---

Next: classes, prototypes, and the `this` rabbit hole — `04_oop.md`.
