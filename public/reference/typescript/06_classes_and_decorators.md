# 06. Classes & Decorators

> What TypeScript adds to JavaScript classes — access modifiers, abstract classes, parameter properties — and the decorator system.

> For the JS class fundamentals (`this`, prototypes, private fields), see `../javascript/04_oop.md`.

---

## Table of Contents

1. [Access Modifiers](#1-access-modifiers)
2. [Parameter Properties](#2-parameter-properties)
3. [Abstract Classes](#3-abstract-classes)
4. [`implements` and `extends`](#4-implements-and-extends)
5. [`readonly` and `override`](#5-readonly-and-override)
6. [Type-Only Class Members](#6-type-only-class-members)
7. [Constructor Signatures](#7-constructor-signatures)
8. [Decorators (Stage 3 / TS 5.0+)](#8-decorators-stage-3--ts-50)
9. [When to Use Classes in TS](#9-when-to-use-classes-in-ts)

---

## 1. Access Modifiers

TS adds `public`, `protected`, `private` keywords:

```typescript
class User {
    public id: number;             // accessible everywhere (default)
    protected role: string;        // this class + subclasses
    private secret: string;        // this class only

    constructor(id: number, role: string, secret: string) {
        this.id = id;
        this.role = role;
        this.secret = secret;
    }
}

const u = new User(1, "admin", "xyz");
u.id;          // OK
u.role;        // ERROR — protected
u.secret;      // ERROR — private
```

### Compile-time only
TS `private` and `protected` are **erased at compile time**. There's nothing stopping JS code (or `as any`) from accessing them at runtime:
```typescript
(u as any).secret;     // "xyz" — works at runtime
```

For runtime privacy, use **JS private fields** (`#name`):
```typescript
class User {
    #secret: string;
    constructor(secret: string) { this.#secret = secret; }
}
```

Mixing both styles is fine. Reach for `#` when you need real privacy.

### Recommendations
- Default to **`private`** for implementation details.
- Use **`protected`** sparingly — it leaks into inheritance hierarchies.
- Prefer **`#`** over `private` for new code that wants real privacy.
- Many modern TS codebases avoid `protected` entirely; composition over inheritance.

---

## 2. Parameter Properties

A shorthand for declaring + initializing fields from constructor params:

```typescript
class Point {
    constructor(public x: number, public y: number) {}
}

const p = new Point(1, 2);
p.x; p.y;
```

Equivalent to:
```typescript
class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}
```

Works with any modifier: `private`, `protected`, `readonly`.

```typescript
class Service {
    constructor(
        private readonly db: Database,
        private readonly logger: Logger,
        public readonly config: Config,
    ) {}
}
```

This is the standard pattern for dependency injection in Nest, Angular, and similar frameworks.

---

## 3. Abstract Classes

```typescript
abstract class Animal {
    constructor(public name: string) {}

    abstract sound(): string;       // subclasses must implement

    describe(): string {
        return `${this.name} says ${this.sound()}`;
    }
}

class Dog extends Animal {
    sound() { return "woof"; }
}

class Cat extends Animal {
    sound() { return "meow"; }
}

new Animal("x");       // ERROR — cannot instantiate abstract
new Dog("Rex").describe();    // "Rex says woof"
```

Use when:
- You have a base class with shared logic and required-but-customizable parts.
- You want to enforce "subclass must implement this."

For "no shared logic, just shape," prefer interfaces:
```typescript
interface Animal {
    name: string;
    sound(): string;
}

class Dog implements Animal {
    constructor(public name: string) {}
    sound() { return "woof"; }
}
```

Interfaces are more idiomatic in modern TS. Abstract classes are useful when shared implementation actually exists.

---

## 4. `implements` and `extends`

```typescript
interface Greeter {
    greet(): string;
}

interface Loggable {
    log(): void;
}

class English implements Greeter, Loggable {
    greet() { return "hello"; }
    log() { console.log("English instance"); }
}
```

A class can `implements` multiple interfaces. It can only `extends` one base class.

### `implements` checks shape but doesn't inherit
```typescript
interface User { name: string; greet(): string; }

class Bot implements User {
    name = "bot";
    greet() { return "beep"; }
}
// No inherited code — class must provide everything
```

### `extends` for inheritance
```typescript
class Animal {
    constructor(public name: string) {}
}

class Dog extends Animal {
    bark() { return "woof"; }
}
```

### Combining
```typescript
class Service extends BaseService implements Loggable, Cacheable {
    ...
}
```

### When to choose
- Want to share code? `extends`.
- Want to declare a contract that multiple classes satisfy? `implements`.

---

## 5. `readonly` and `override`

### `readonly`
```typescript
class Config {
    readonly apiUrl: string;
    constructor(apiUrl: string) { this.apiUrl = apiUrl; }
}

const c = new Config("https://x");
c.apiUrl = "y";     // ERROR
```

`readonly` is enforced at compile time only — JS-level mutation still works. For real immutability, freeze the instance.

### `override` (with `noImplicitOverride`)
```typescript
class Base {
    greet() { return "hi"; }
}

class Sub extends Base {
    override greet() { return "hello"; }    // explicit
}
```

With `noImplicitOverride` in tsconfig, you must use `override` when overriding parent methods. If you typo the parent method name, you get an error. Highly recommended.

---

## 6. Type-Only Class Members

You can declare class fields without initializing:

```typescript
class User {
    id!: number;      // ! tells TS "I'll initialize this eventually"
    name!: string;

    init(data: any) {
        this.id = data.id;
        this.name = data.name;
    }
}
```

The `!` is the **definite assignment assertion** — promise to TS that this field will be assigned. Useful for frameworks that initialize via reflection (ORM, DI).

Without `!`, TS errors on `strictPropertyInitialization`.

Be careful: if `init` is never called, you get `undefined` at runtime with no warning. Use sparingly.

---

## 7. Constructor Signatures

For typing constructors as values:

```typescript
type Constructor<T = {}> = new (...args: any[]) => T;

function makeInstance<T>(Cls: Constructor<T>): T {
    return new Cls();
}

const u = makeInstance(User);
```

### Mixin pattern
```typescript
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        timestamp = Date.now();
    };
}

class User { name: string = ""; }
class TimestampedUser extends Timestamped(User) {}

const u = new TimestampedUser();
u.name;            // ""
u.timestamp;       // Date.now()
```

Mixins are powerful — also fragile. Use sparingly; composition usually reads better.

---

## 8. Decorators (Stage 3 / TS 5.0+)

A long-running saga. TS used to have "experimental decorators" (Stage 1). The standards committee evolved them; TS 5.0 added Stage 3 / "ES Decorators" (the version aligning with the TC39 proposal).

### Stage 3 decorators (current)
```typescript
function log<This, Args extends any[], Return>(
    target: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
    const methodName = String(context.name);
    return function (this: This, ...args: Args): Return {
        console.log(`calling ${methodName} with`, args);
        const result = target.call(this, ...args);
        console.log(`${methodName} returned`, result);
        return result;
    };
}

class API {
    @log
    fetchUser(id: number) {
        return { id, name: "Alice" };
    }
}

new API().fetchUser(1);
// logs: calling fetchUser with [1]
// logs: fetchUser returned { id: 1, name: "Alice" }
```

Decorators can target:
- Classes
- Methods
- Accessors (get/set)
- Fields
- Auto-accessors (`accessor` keyword)

### Available targets
```typescript
function classDecorator(value: Function, context: ClassDecoratorContext) { ... }
function methodDecorator(value: Function, context: ClassMethodDecoratorContext) { ... }
function getterDecorator(value: Function, context: ClassGetterDecoratorContext) { ... }
function setterDecorator(value: Function, context: ClassSetterDecoratorContext) { ... }
function fieldDecorator(value: undefined, context: ClassFieldDecoratorContext) { ... }
function accessorDecorator(value: ClassAccessorDecoratorTarget, context: ClassAccessorDecoratorContext) { ... }
```

### Decorator factories — passing arguments
```typescript
function memoize(maxSize = 100) {
    return function <This, Args extends any[], Return>(
        target: (this: This, ...args: Args) => Return,
        context: ClassMethodDecoratorContext,
    ) {
        const cache = new Map<string, Return>();
        return function (this: This, ...args: Args): Return {
            const key = JSON.stringify(args);
            if (!cache.has(key)) {
                cache.set(key, target.call(this, ...args));
            }
            return cache.get(key)!;
        };
    };
}

class API {
    @memoize(50)
    expensive(x: number): number {
        return x ** 100;
    }
}
```

### Legacy "experimental decorators"
Pre-Stage-3 syntax. Used by NestJS, Angular, TypeORM, Inversify, etc. as of 2026.

```json
// tsconfig.json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

Legacy decorator signatures:
```typescript
function Inject(token: string) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        Reflect.defineMetadata(`inject:${propertyKey}`, token, target);
    };
}

@Controller("/users")
class UsersController {
    constructor(@Inject("UserService") private userService: UserService) {}

    @Get("/")
    list() { ... }
}
```

**Important**: legacy and Stage 3 are different shapes. Existing libraries mostly use legacy; new code can choose either. NestJS 11 (2025) supports both.

### Whether to use decorators in your own code
For new application code: probably not. Most decorators are framework features (NestJS, TypeORM, MobX). For your own utilities, plain functions and higher-order functions (`withLogging`, `withRetry`) are easier to understand.

When decorators do shine:
- Marker decorators that frameworks read via metadata (`@Controller`, `@Inject`).
- DI patterns that benefit from per-class attachment.
- ORM definitions (`@Entity`, `@Column`).

---

## 9. When to Use Classes in TS

Same principles as JS, with extra nudges:

### Use classes when
- A real "thing" with state + operations (`User`, `HttpClient`, `EventEmitter`).
- Framework requires them (NestJS controllers/services, MobX stores, Angular components).
- You need instanceof checks (`error instanceof AppError`).
- You're building a public API that consumers will subclass / extend.

### Skip classes when
- A bag of data — use an interface and plain objects.
- A function that has state — use a closure.
- A "module-scoped" service — export functions.
- A reducer / pure transformation — write a function.

### TS-specific reasons NOT to over-use classes
- **Tree-shaking** — classes are harder to tree-shake than tree-of-functions.
- **`this` issues** — passing class methods as callbacks loses `this`.
- **Bundling** — class members aren't easily eliminated by terser.

### Idiomatic TS service
```typescript
// As class
class UserService {
    constructor(private db: Database) {}
    async findOne(id: number) { return this.db.user.findUnique({ where: { id } }); }
    async create(data: NewUser) { return this.db.user.create({ data }); }
}

// As object of functions
function makeUserService(db: Database) {
    return {
        async findOne(id: number) { return db.user.findUnique({ where: { id } }); },
        async create(data: NewUser) { return db.user.create({ data }); },
    };
}

// Type
type UserService = ReturnType<typeof makeUserService>;
```

The functional version:
- No `this` to worry about.
- Easier to spread / destructure.
- Trivially testable (just pass mocks).

Use whichever fits the framework you're in. Both are idiomatic; the team preference matters more than the absolute choice.

### Inheritance: lean composition
```typescript
// Avoid:
class TimestampedUser extends LoggableUser extends BaseUser { ... }

// Prefer:
class User {
    constructor(
        private logger: Logger,
        private clock: Clock,
    ) {}
}
```

Inheritance in TS is fine — but deep hierarchies cause more pain than they solve.

---

That's the TS-specific class machinery. Next: how TS sees modules and ambient declarations — `07_modules_and_declarations.md`.
