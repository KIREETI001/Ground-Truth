# 04. Object-Oriented JavaScript

> Classes, the prototype model under them, the `this` problem, inheritance, and modern private fields.

---

## Table of Contents

1. [Mental Model](#1-mental-model)
2. [Classes](#2-classes)
3. [Instance vs Static](#3-instance-vs-static)
4. [Inheritance](#4-inheritance)
5. [The `this` Problem](#5-the-this-problem)
6. [Private Fields](#6-private-fields)
7. [Getters and Setters](#7-getters-and-setters)
8. [Prototypes (Underneath It All)](#8-prototypes-underneath-it-all)
9. [Composition over Inheritance](#9-composition-over-inheritance)
10. [Choosing the Right Pattern](#10-choosing-the-right-pattern)

---

## 1. Mental Model

JavaScript has **prototypal** inheritance. Every object has an internal `[[Prototype]]` link to another object; property lookups walk up that chain.

The `class` keyword (ES6+) is syntactic sugar over that mechanism. You can write idiomatic JS in 2026 without ever touching the underlying prototype machinery — but understanding what's going on prevents confusion when you do.

### When to use classes
- A real "type" with multiple instances and shared methods.
- Encapsulating state with operations.
- You're using a framework that expects them (some React lifecycle code, NestJS, decorators).

### When NOT to use classes
- A "module with state" — use a closure or an object literal.
- A "data bag" — use a plain object or a TypeScript interface.
- A function that has options — just pass arguments.

JavaScript is multi-paradigm. Don't force classes when functions work.

---

## 2. Classes

```javascript
class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    greet() {
        return `Hi, I'm ${this.name}`;
    }

    haveBirthday() {
        this.age++;
        return this;     // allows chaining
    }

    toString() {
        return `Person(${this.name}, ${this.age})`;
    }
}

const alice = new Person("Alice", 30);
alice.greet();              // "Hi, I'm Alice"
alice.haveBirthday();        // Person(Alice, 31)
String(alice)                // "Person(Alice, 31)"
```

### Key rules
- `class` bodies are automatically in strict mode.
- Methods are defined on the prototype (shared across instances).
- `new ClassName(...)` calls the constructor.
- `class Foo extends Bar` for inheritance.
- Order matters during construction: must call `super(...)` before using `this` in subclasses.

### Class fields (ES2022)
```javascript
class Counter {
    count = 0;                    // instance field
    static instances = 0;          // class field (shared)

    constructor() {
        Counter.instances++;
    }

    increment() {
        this.count++;
        return this;
    }
}
```

Cleaner than initializing in the constructor.

### Method types
```javascript
class Example {
    constructor() {
        this.data = [];
    }

    method() { ... }                  // regular method
    static utility() { ... }           // static — call via Example.utility()
    *gen() { yield 1; yield 2; }       // generator method
    async fetch() { return await fetch("/"); }    // async method
    get name() { return this._name; }              // getter
    set name(v) { this._name = v; }                 // setter
    [computedKey]() { ... }                          // computed method name
}
```

---

## 3. Instance vs Static

```javascript
class MathHelper {
    static PI = 3.14159;

    static area(radius) {
        return MathHelper.PI * radius ** 2;
    }
}

MathHelper.area(5);            // call without an instance
MathHelper.PI;                  // 3.14159
```

Static members live on the class itself, not on instances. Instances don't inherit them.

Common uses:
- Constants.
- Alternative constructors / factory methods.
- Helpers that don't need instance state.

```javascript
class User {
    constructor(name) { this.name = name; }

    static fromJSON(json) {
        const data = JSON.parse(json);
        return new User(data.name);
    }
}

User.fromJSON('{"name": "Alice"}');
```

---

## 4. Inheritance

```javascript
class Animal {
    constructor(name) {
        this.name = name;
    }

    speak() {
        return `${this.name} makes a sound`;
    }
}

class Dog extends Animal {
    constructor(name, breed) {
        super(name);            // call parent constructor — required before `this`
        this.breed = breed;
    }

    speak() {
        return `${this.name} barks`;
    }

    speakBoth() {
        return `${super.speak()} (and barks)`;
    }
}

const rex = new Dog("Rex", "Labrador");
rex.speak();                    // "Rex barks"
rex instanceof Dog              // true
rex instanceof Animal           // true
```

### Multiple inheritance — JavaScript doesn't have it
You can simulate via mixin functions:
```javascript
const Loggable = (Base) => class extends Base {
    log(msg) { console.log(`[${this.constructor.name}] ${msg}`); }
};
const Cacheable = (Base) => class extends Base {
    _cache = new Map();
    cached(key, fn) {
        if (!this._cache.has(key)) this._cache.set(key, fn());
        return this._cache.get(key);
    }
};

class Service extends Loggable(Cacheable(Object)) {
    // gets log() and cached()
}
```

Powerful but easy to abuse. Composition is usually clearer.

---

## 5. The `this` Problem

`this` in a method is determined by **how the method is called**, not where it's defined.

```javascript
const obj = {
    name: "Alice",
    greet() {
        console.log(this.name);
    }
};

obj.greet();                  // "Alice"      — this = obj
const fn = obj.greet;
fn();                          // undefined     — this = undefined (strict) or window (non-strict)

[obj].forEach(o => o.greet());  // "Alice"
setTimeout(obj.greet, 100);     // undefined — passed as a bare function
setTimeout(() => obj.greet(), 100);   // "Alice" — wrapped in arrow
```

### Fix 1: Arrow function preserves `this`
Arrow functions capture `this` from the enclosing scope.
```javascript
class Button {
    constructor(name) { this.name = name; }
    onClick = () => {
        console.log(this.name);          // arrow — uses Button's this
    };
}

const b = new Button("OK");
document.body.addEventListener("click", b.onClick);    // works!
```

### Fix 2: `bind`
```javascript
class Button {
    constructor(name) { this.name = name; }
    onClick() { console.log(this.name); }
}

const b = new Button("OK");
const bound = b.onClick.bind(b);
document.body.addEventListener("click", bound);
```

### Fix 3: Wrapper arrow
```javascript
document.body.addEventListener("click", () => b.onClick());
```

### Practical advice
Most modern JS uses arrow functions for callbacks, eliminating most `this` confusion. Reach for `bind` rarely. The remaining `this` headaches are usually in older code or library APIs that pass functions around.

### `call`, `apply`, `bind`
```javascript
function greet(greeting) { return `${greeting}, ${this.name}`; }

greet.call({ name: "Alice" }, "Hi");           // "Hi, Alice" — args separately
greet.apply({ name: "Alice" }, ["Hi"]);         // "Hi, Alice" — args as array
const bound = greet.bind({ name: "Alice" });    // returns new function
bound("Hi");                                     // "Hi, Alice"
```

Mostly historical curiosities now. Modern code uses arrows, spread, and explicit binding via assignment in class fields.

---

## 6. Private Fields

ES2022 added real private fields with `#`:

```javascript
class Counter {
    #count = 0;                     // private field — only accessible inside the class

    increment() {
        this.#count++;
        return this;
    }

    get value() {
        return this.#count;
    }
}

const c = new Counter();
c.increment();
c.value;             // 1
c.#count;            // SyntaxError — truly private
```

### Private methods
```javascript
class Foo {
    publicAPI() {
        this.#internal();
    }

    #internal() {
        // not visible outside
    }
}
```

### Older convention (still common)
`_underscorePrefix` for "internal — don't touch" was the convention before `#`. Still seen in older code. Both work; `#` is enforced.

---

## 7. Getters and Setters

```javascript
class Temperature {
    constructor(celsius) {
        this._celsius = celsius;
    }

    get celsius() { return this._celsius; }
    set celsius(v) { this._celsius = v; }

    get fahrenheit() { return this._celsius * 9 / 5 + 32; }
    set fahrenheit(v) { this._celsius = (v - 32) * 5 / 9; }
}

const t = new Temperature(20);
t.celsius              // 20 — looks like a property, calls getter
t.fahrenheit            // 68
t.fahrenheit = 100      // calls setter
t.celsius               // 37.7...
```

Use sparingly. They're invisible — a property access can trigger arbitrary code. Frameworks like Vue use this heavily for reactivity; in application code, methods are often clearer.

---

## 8. Prototypes (Underneath It All)

Skip this section unless you're debugging weird inheritance or working with old code. Here's the gist:

```javascript
function Person(name) {       // pre-ES6 "class"
    this.name = name;
}

Person.prototype.greet = function() {
    return `Hi, ${this.name}`;
};

const alice = new Person("Alice");
alice.greet();                       // "Hi, Alice"
Object.getPrototypeOf(alice) === Person.prototype;  // true
```

Every object has a prototype. Methods are typically on the prototype, not on each instance — saving memory. The `class` keyword translates to roughly the above under the hood.

### Object.create
```javascript
const proto = { greet() { return `Hi, ${this.name}`; } };
const alice = Object.create(proto);
alice.name = "Alice";
alice.greet();
```

`Object.create(proto)` creates an object with `proto` as its prototype. Used historically for prototypal inheritance without classes.

### Checking the chain
```javascript
Object.getPrototypeOf(obj)
Object.setPrototypeOf(obj, proto)         // slow — avoid in hot paths
obj.__proto__                              // legacy alias for the prototype
"toString" in obj                          // walks the chain
Object.hasOwn(obj, "toString")             // false — toString is inherited
```

In 2026, you rarely need to think about prototypes. Classes cover 99% of cases.

---

## 9. Composition over Inheritance

Like in any OO language: when in doubt, compose.

```javascript
// Inheritance
class JsonLogger extends FileLogger {
    log(data) { super.log(JSON.stringify(data)); }
}

// Composition
class JsonLogger {
    constructor(fileLogger) { this._fileLogger = fileLogger; }
    log(data) { this._fileLogger.log(JSON.stringify(data)); }
}

const logger = new JsonLogger(new FileLogger("app.log"));
```

The composition version:
- Decouples JsonLogger from a specific Logger class.
- Allows swapping at runtime.
- Avoids deep hierarchies.

### Component-style alternative
For state-heavy code, a closure is often simpler than a class:
```javascript
function createCounter(initial = 0) {
    let count = initial;
    return {
        increment: () => ++count,
        decrement: () => --count,
        get value() { return count; },
    };
}

const c = createCounter();
c.increment();
c.value;       // 1
```

Pros: real privacy (no `#` needed — closures hide vars). Simple `this`-free API.
Cons: each instance carries its own function copies (less memory-efficient at huge scale).

For most apps the difference is academic. Pick the style that reads well.

---

## 10. Choosing the Right Pattern

| Need | Use |
|---|---|
| A bag of data, no behavior | Plain object literal |
| A bag of data with type info | TypeScript interface / type |
| A reusable "thing" with methods | `class` |
| A stateful module | Closure or single-instance object |
| Many instances sharing methods | `class` (shared prototype methods) |
| Tagged union / variant | Discriminated union in TS, or factory functions in JS |
| Plugin / mixin system | Higher-order function mixins or composition |
| Just a function | A function |

### Don't fight the language
JavaScript leans functional. Forcing Java patterns (`AbstractFactoryBuilder`, deeply nested inheritance) usually fights the language and the ecosystem.

Idiomatic JS in 2026 prefers:
- Small functions.
- Plain objects as data.
- Classes when they earn their place.
- Type information from TypeScript, not from runtime checks.

Next file: the functional style JS leans into — `05_functional.md`.
