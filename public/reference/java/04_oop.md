# 04. Object-Oriented Programming

> Classes, interfaces, inheritance, polymorphism, records, sealed types, enums. The core of how Java structures code.

---

## Table of Contents

1. [Classes](#1-classes)
2. [Fields, Methods, Constructors](#2-fields-methods-constructors)
3. [Access Modifiers and Encapsulation](#3-access-modifiers-and-encapsulation)
4. [Inheritance](#4-inheritance)
5. [Polymorphism and `@Override`](#5-polymorphism-and-override)
6. [Abstract Classes](#6-abstract-classes)
7. [Interfaces](#7-interfaces)
8. [Records](#8-records)
9. [Sealed Types](#9-sealed-types)
10. [Enums](#10-enums)
11. [Nested Classes](#11-nested-classes)
12. [`equals`, `hashCode`, `toString`](#12-equals-hashcode-tostring)

---

## 1. Classes

A class is a blueprint for objects.

```java
public class User {
    private String name;
    private int age;

    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() { return name; }
    public int getAge() { return age; }

    public void setAge(int age) { this.age = age; }
}

User u = new User("Alice", 30);
u.getName();         // "Alice"
u.setAge(31);
```

### Class layout (typical convention)
1. Static fields
2. Instance fields
3. Constructors
4. Methods
5. Inner classes / interfaces

```java
public class Service {
    private static final int MAX_RETRIES = 3;        // 1. static fields
    
    private final Repository repo;                     // 2. instance fields
    private final Logger logger;
    
    public Service(Repository repo, Logger logger) {   // 3. constructors
        this.repo = repo;
        this.logger = logger;
    }
    
    public User findUser(long id) { ... }              // 4. methods
    
    // 5. nested types if any
}
```

### `final` classes
Can't be subclassed:
```java
public final class Money { ... }
```

Use for immutable value types or when you want to prevent extension. `String` is `final`.

---

## 2. Fields, Methods, Constructors

### Fields
```java
public class Counter {
    private int count;              // default 0
    private String name = "default"; // explicit initializer
    private final long created;     // must be set in constructor

    public Counter(long created) {
        this.created = created;
    }
}
```

`final` instance fields:
- Must be set exactly once: in declaration, constructor, or instance initializer.
- Once set, can't be reassigned (the reference can't change, but the object it points to may still be mutable).

### Constructors
```java
public class Point {
    private final double x;
    private final double y;

    public Point() {                    // no-arg constructor
        this(0, 0);
    }

    public Point(double x, double y) {
        this.x = x;
        this.y = y;
    }
}
```

- `this(...)` calls another constructor (must be first statement).
- `super(...)` calls the parent constructor (must be first statement).
- If you don't declare a constructor, Java provides a no-arg default.
- If you declare any constructor, the default is gone.

### Methods
```java
public int add(int a, int b) {
    return a + b;
}

public static double pi() {
    return Math.PI;
}
```

- Instance methods have access to `this`.
- Static methods don't.

### `this`
References the current instance. Used to:
- Disambiguate parameter and field with the same name.
- Pass the current object as an argument.
- Chain constructors.

```java
public class Builder {
    private String name;
    
    public Builder setName(String name) {
        this.name = name;
        return this;             // for chaining
    }
}
```

### `static`
Belongs to the class, not instances.
```java
public class MathHelpers {
    public static final double PI = 3.14159;
    
    public static int square(int x) {
        return x * x;
    }
}

MathHelpers.square(5);
double pi = MathHelpers.PI;
```

Static methods can't access instance fields. They're called on the class, not on objects.

### Method overloading
Same name, different parameters:
```java
public int max(int a, int b) { ... }
public double max(double a, double b) { ... }
public int max(int a, int b, int c) { ... }
```

The compiler picks based on argument types.

---

## 3. Access Modifiers and Encapsulation

| Modifier | Class | Package | Subclass | World |
|---|---|---|---|---|
| `public` | ✓ | ✓ | ✓ | ✓ |
| `protected` | ✓ | ✓ | ✓ | ✗ |
| (none) — package-private | ✓ | ✓ | ✗ | ✗ |
| `private` | ✓ | ✗ | ✗ | ✗ |

```java
public class Account {
    private double balance;           // hidden — only Account methods access it
    protected long accountId;          // visible to subclasses + same package
    public String displayName;         // anyone can read/write — usually bad style
}
```

### Encapsulation conventions
- **Fields are usually `private`.** Expose via methods if needed.
- **Getters** return values: `getName()`, `getAge()`.
- **Setters** modify: `setName(String)`. Skip if the field should be immutable.
- **Booleans** use `is`/`has` prefixes: `isActive()`, `hasChildren()`.
- **Records** generate accessors automatically (`name()` not `getName()`) — but follow the convention they set.

### `final` fields → no setters
```java
public class User {
    private final long id;
    private final String email;
    private String displayName;  // mutable
    
    public User(long id, String email, String displayName) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
    }
    
    public long getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String name) { this.displayName = name; }
}
```

ID and email can't change after construction. Display name can.

---

## 4. Inheritance

```java
public class Animal {
    protected String name;
    
    public Animal(String name) {
        this.name = name;
    }
    
    public String describe() {
        return "An animal called " + name;
    }
}

public class Dog extends Animal {
    private String breed;
    
    public Dog(String name, String breed) {
        super(name);             // call parent constructor
        this.breed = breed;
    }
    
    @Override
    public String describe() {
        return "A " + breed + " named " + name;
    }
    
    public void bark() {
        System.out.println("Woof!");
    }
}

Animal a = new Dog("Rex", "Labrador");
a.describe();    // "A Labrador named Rex" (Dog's version)
```

### Single inheritance
Java allows only one parent class. Multiple interfaces are fine.

### `super`
- `super(args)` — call parent constructor (first line).
- `super.method()` — call parent's version of an overridden method.

### When to use inheritance
- True "is-a" relationships (`Dog is-a Animal`).
- Code reuse where override makes sense.

### When NOT to use inheritance
- "Has-a" relationships → composition.
- Code reuse for unrelated things → static utility methods.
- "Pluggable behavior" → strategy pattern with interfaces.

Modern guidance: **prefer composition over inheritance.** Inheritance creates tight coupling and brittle hierarchies. Most modern OO code uses interfaces and composition heavily, inheritance lightly.

### `final` on methods
Prevents override:
```java
public class Base {
    public final void importantOperation() { ... }    // can't be overridden
}
```

---

## 5. Polymorphism and `@Override`

```java
public class Shape {
    public double area() { return 0; }
}

public class Circle extends Shape {
    private final double radius;
    public Circle(double r) { this.radius = r; }
    
    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}

public class Square extends Shape {
    private final double side;
    public Square(double s) { this.side = s; }
    
    @Override
    public double area() {
        return side * side;
    }
}

List<Shape> shapes = List.of(new Circle(1), new Square(2));
for (Shape s : shapes) {
    System.out.println(s.area());    // dispatches to Circle or Square's area
}
```

The actual runtime type determines which method runs (**dynamic dispatch**). This is the heart of polymorphism.

### `@Override`
Always use `@Override` when overriding a method. The compiler verifies:
- The method exists in the parent.
- The signature matches.

Without `@Override`, typos silently create new methods:
```java
@Override
public String tostring() {     // ERROR — no method to override (typo!)
    return name;
}
```

### `instanceof` and pattern matching (Java 16+)
```java
Object obj = ...;

if (obj instanceof String) {
    String s = (String) obj;        // old style
    System.out.println(s.length());
}

if (obj instanceof String s) {       // pattern matching — declares s in scope
    System.out.println(s.length());
}
```

Same with pattern matching for switch (file 02).

---

## 6. Abstract Classes

A class that can't be instantiated. Defines a partial implementation.

```java
public abstract class Animal {
    protected String name;
    
    public Animal(String name) {
        this.name = name;
    }
    
    public abstract String sound();    // must be implemented by subclass
    
    public String describe() {
        return name + " says " + sound();
    }
}

public class Cow extends Animal {
    public Cow(String name) { super(name); }
    
    @Override
    public String sound() { return "moo"; }
}

new Animal("X");      // ERROR — can't instantiate abstract
new Cow("Bessie").describe();    // "Bessie says moo"
```

### Abstract vs interface
- **Abstract class**: when you want shared implementation + required overrides.
- **Interface**: when you only want to declare a contract.

Modern Java interfaces have default methods, which blurs the line. Use interfaces by default; reach for abstract classes when you have shared state.

---

## 7. Interfaces

A contract — methods that implementing classes must provide.

```java
public interface Greeter {
    String greet(String name);
}

public class EnglishGreeter implements Greeter {
    @Override
    public String greet(String name) {
        return "Hello, " + name;
    }
}

Greeter g = new EnglishGreeter();
g.greet("Alice");    // "Hello, Alice"
```

### Multiple interfaces
```java
public class Bot implements Greeter, Loggable, Configurable { ... }
```

### Default methods (Java 8+)
Implementations directly in the interface:
```java
public interface Greeter {
    String greet(String name);
    
    default String greetCasually(String name) {
        return greet(name).toLowerCase();
    }
}
```

Used heavily in the JDK (`List`, `Stream`, etc.). Lets interfaces evolve without breaking implementations.

### Static methods on interfaces
```java
public interface Greeter {
    String greet(String name);
    
    static Greeter english() { return name -> "Hello, " + name; }
    static Greeter spanish() { return name -> "Hola, " + name; }
}

Greeter g = Greeter.english();
```

Factory methods, helpers — no instance needed.

### Private methods (Java 9+)
For helper methods inside the interface:
```java
public interface Greeter {
    String greet(String name);
    
    default String formal(String name) { return prefix() + name; }
    default String casual(String name) { return prefix().toLowerCase() + name; }
    
    private String prefix() { return "Hello, "; }
}
```

### Functional interfaces — `@FunctionalInterface`
Interface with exactly one abstract method:
```java
@FunctionalInterface
public interface Greeter {
    String greet(String name);
}

Greeter g = name -> "Hi, " + name;   // lambda
```

The `@FunctionalInterface` annotation is optional but documents intent and prevents accidental addition of new abstract methods.

Built-in functional interfaces (in `java.util.function`):
- `Function<T, R>` — `R apply(T t)`
- `Predicate<T>` — `boolean test(T t)`
- `Consumer<T>` — `void accept(T t)`
- `Supplier<T>` — `T get()`
- `BiFunction<T, U, R>` — `R apply(T t, U u)`
- `BinaryOperator<T>` — `T apply(T a, T b)`
- `UnaryOperator<T>` — `T apply(T t)`

Lots more — covered in `06_streams_and_lambdas.md`.

### When to use interfaces
- Defining a contract for callers.
- "Plug-in" architecture (different implementations).
- Lambdas / functional interfaces.
- Anywhere you'd want flexibility for future implementations.

### Interface vs class — modern guidance
In 2026 Java, interfaces are the primary abstraction:
- Services are often interfaces with multiple implementations.
- DTOs / value objects are records (which can implement interfaces).
- Abstract classes are used sparingly.

---

## 8. Records

Records (Java 14+) are immutable value classes with auto-generated boilerplate.

```java
public record User(long id, String name, String email) {}

User u = new User(1, "Alice", "a@x.com");
u.id();         // 1
u.name();       // "Alice"
u.email();      // "a@x.com"

User other = new User(1, "Alice", "a@x.com");
u.equals(other);     // true — equals based on all components
u.hashCode();         // consistent with equals
u.toString();         // "User[id=1, name=Alice, email=a@x.com]"
```

Records give you for free:
- All fields as `private final`.
- A canonical constructor.
- Accessor methods (`id()`, `name()`, not `getId()`).
- `equals`, `hashCode`, `toString` based on all components.

### Custom validation in canonical constructor
```java
public record User(long id, String name, String email) {
    public User {     // compact constructor — runs before assignment
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name required");
        }
        if (!email.contains("@")) {
            throw new IllegalArgumentException("invalid email");
        }
    }
}
```

### Additional methods
```java
public record Money(long cents, String currency) {
    public Money add(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException();
        return new Money(cents + other.cents, currency);
    }
    
    public double dollars() {
        return cents / 100.0;
    }
}
```

### Custom accessors
Records have implicit accessors. You can override them (rarely needed):
```java
public record Range(int start, int end) {
    public int end() {
        return Math.max(end, start);    // weird but legal
    }
}
```

### Static factory methods
```java
public record Point(double x, double y) {
    public static Point origin() { return new Point(0, 0); }
    public static Point of(double x, double y) { return new Point(x, y); }
}
```

### Records implementing interfaces
```java
public sealed interface Shape permits Circle, Square {}
public record Circle(double radius) implements Shape {}
public record Square(double side) implements Shape {}
```

### When to use records
- DTOs (data transfer objects) between layers.
- Value objects (Money, Point, Range).
- Tuples — multiple values without inventing a class.
- Sealed type variants (with sealed interfaces).

### When not to
- Mutable state — records are immutable by design.
- Heavy business logic — fine to put on records, but if they grow, consider a regular class.
- When you need inheritance from a base class — records can't extend anything (they always extend `Record`).

Records replaced the verbose old style:
```java
// Pre-records (hundreds of lines for a 3-field class)
public class User {
    private final long id;
    private final String name;
    private final String email;
    public User(long id, ...) { ... }
    public long getId() { ... }
    @Override public boolean equals(Object o) { ... }
    @Override public int hashCode() { ... }
    @Override public String toString() { ... }
}
```

vs.

```java
public record User(long id, String name, String email) {}
```

---

## 9. Sealed Types

Sealed classes/interfaces (Java 17+) restrict who can extend them.

```java
public sealed interface Shape permits Circle, Square, Rectangle {}

public record Circle(double radius) implements Shape {}
public record Square(double side) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
```

Only the listed types can implement `Shape`. The compiler knows this and enables exhaustive pattern matching.

### Pattern matching with sealed types
```java
public static double area(Shape shape) {
    return switch (shape) {
        case Circle c -> Math.PI * c.radius() * c.radius();
        case Square s -> s.side() * s.side();
        case Rectangle r -> r.width() * r.height();
        // No default needed — switch is exhaustive
    };
}
```

If you add `Triangle` to the `permits` list, this switch won't compile until you handle it. The compiler enforces exhaustiveness.

### `sealed`, `non-sealed`, `final`
A permitted subclass must declare one of:
- `final` — can't be further extended.
- `sealed` — also restricts its subclasses with its own `permits`.
- `non-sealed` — explicitly opens up again (rare).

### When to use
- Modeling **closed sets of variants**: state machines, ASTs, result types.
- When you want a discriminated union — like TS's union types or Rust's enums.

Sealed types + records = Java's "algebraic data types." Modern Java code uses them extensively.

---

## 10. Enums

A fixed set of named constants.

```java
public enum Day {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
}

Day d = Day.MONDAY;
d.name();           // "MONDAY"
d.ordinal();        // 0
Day.values();        // [MONDAY, TUESDAY, ...]
Day.valueOf("FRIDAY");   // Day.FRIDAY
```

### Enum with fields and methods
```java
public enum Planet {
    MERCURY(3.303e+23, 2.4397e6),
    VENUS(4.869e+24, 6.0518e6),
    EARTH(5.976e+24, 6.37814e6);
    
    private final double mass;
    private final double radius;
    
    Planet(double mass, double radius) {     // implicitly private
        this.mass = mass;
        this.radius = radius;
    }
    
    public double surfaceGravity() {
        return 6.67300E-11 * mass / (radius * radius);
    }
}

Planet.EARTH.surfaceGravity();
```

### Enums with abstract methods (rare)
Each constant overrides the method:
```java
public enum Operation {
    PLUS {
        @Override public int apply(int a, int b) { return a + b; }
    },
    MINUS {
        @Override public int apply(int a, int b) { return a - b; }
    };
    
    public abstract int apply(int a, int b);
}

Operation.PLUS.apply(2, 3);    // 5
```

Often simpler to use `Function` / lambdas instead these days.

### Switch on enum
```java
String adjective = switch (day) {
    case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "weekday";
    case SATURDAY, SUNDAY -> "weekend";
};
```

The compiler verifies exhaustiveness.

### `EnumSet`, `EnumMap`
Fast specialized collections for enum types. See `03_data_structures.md`.

### When to use enums
- Days, months, suit of cards.
- Status / state ("ACTIVE", "PENDING", "CANCELED").
- A fixed set of behaviors.

For values not known at compile time (database lookups, user roles fetched at runtime), use strings or domain classes.

---

## 11. Nested Classes

A class inside another class.

### Static nested class
```java
public class Outer {
    private int outerField;
    
    public static class Inner {
        // No access to Outer's instance fields
        // But can be instantiated without an Outer
        public void doStuff() { ... }
    }
}

Outer.Inner inner = new Outer.Inner();
```

Use for tightly-coupled helpers, builder classes, internal data structures.

### Inner class (non-static nested)
```java
public class Outer {
    private int outerField;
    
    public class Inner {
        public int getOuterField() {
            return outerField;     // can access Outer's fields
        }
    }
}

Outer outer = new Outer();
Outer.Inner inner = outer.new Inner();    // needs an Outer instance
```

Inner classes hold a hidden reference to the enclosing instance — uses more memory and can prevent GC. Use `static` nested when possible.

### Local class
A class declared inside a method. Rare.

### Anonymous class
Inline class definition:
```java
Runnable r = new Runnable() {
    @Override
    public void run() {
        System.out.println("running");
    }
};
```

Largely replaced by lambdas:
```java
Runnable r = () -> System.out.println("running");
```

Anonymous classes are still useful when you need to override multiple methods, or when the type isn't a functional interface.

---

## 12. `equals`, `hashCode`, `toString`

### `equals` and `hashCode`
Two methods every object inherits from `Object`. The default uses reference equality:
```java
new User("Alice", 30).equals(new User("Alice", 30));     // false! Reference comparison.
```

Override for value equality:
```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof User other)) return false;
    return id == other.id && Objects.equals(name, other.name);
}

@Override
public int hashCode() {
    return Objects.hash(id, name);
}
```

### Rules
- If `a.equals(b)` is true, `a.hashCode() == b.hashCode()` **must** be true.
- Implement them together. Records do this for you — strongly prefer records when you need value semantics.

### `Objects` utility class
```java
Objects.equals(a, b);        // null-safe
Objects.hash(x, y, z);        // combined hash
Objects.requireNonNull(x);    // throw NPE if x is null
Objects.toString(x, "default");   // String representation, null-safe
```

### `toString`
For debugging / logging. Default is `ClassName@hex` — useless.
```java
@Override
public String toString() {
    return "User{id=" + id + ", name='" + name + "'}";
}
```

Records auto-generate `toString` showing all components.

Lombok's `@ToString` and IDE auto-generation also work, but records are the modern way.

### When to override
- Whenever you put objects in collections.
- Whenever you compare them with `.equals`.
- For logs and debugging (`toString`).

For domain objects, prefer **records** — all three are generated, correctly, every time.

---

That's OOP. Most modern Java code uses:
- **Records** for data.
- **Sealed interfaces** with records for variants.
- **Regular classes** for services.
- **Interfaces** for contracts.
- **Inheritance** sparingly.

Next: generics — `05_generics.md`.
