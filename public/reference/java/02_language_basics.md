# 02. Language Basics

> Java syntax, primitives, variables, control flow, and modern features (`var`, switch expressions, text blocks).

> This file assumes general programming experience. If you've used C, C++, C#, or JavaScript, much of the syntax will look familiar.

---

## Table of Contents

1. [Source File Anatomy](#1-source-file-anatomy)
2. [Primitives](#2-primitives)
3. [Variables and `var`](#3-variables-and-var)
4. [Operators](#4-operators)
5. [Strings](#5-strings)
6. [Control Flow](#6-control-flow)
7. [Switch — Statements vs Expressions](#7-switch--statements-vs-expressions)
8. [Loops](#8-loops)
9. [Arrays](#9-arrays)
10. [Methods](#10-methods)
11. [Comments and Javadoc](#11-comments-and-javadoc)

---

## 1. Source File Anatomy

```java
package com.example.app;        // package declaration (must be first)

import java.util.List;            // imports
import static java.lang.Math.PI;  // static import

public class Greeter {            // one public class per file
    public String greet(String name) {
        return "Hello, " + name;
    }
}
```

Rules:
- File name **must** match the public class name: `Greeter.java`.
- One public class per file. Other (package-private) classes are allowed.
- Package declaration is optional but ubiquitous. No package = "default package," not recommended.
- Imports come before any type declaration.

### Static imports
```java
import static java.lang.Math.*;
import static java.util.Collections.emptyList;

double area = PI * radius * radius;   // no Math. prefix
List<String> empty = emptyList();
```

Use sparingly — can hurt readability when overused.

---

## 2. Primitives

Java has 8 primitive types — these are NOT objects. They map directly to values, not references.

| Type | Size | Range | Default | Notes |
|---|---|---|---|---|
| `boolean` | 1 bit (logical) | `true` / `false` | `false` | Not 0/1; can't cast to/from int |
| `byte` | 8 bits | -128 to 127 | `0` | |
| `short` | 16 bits | -32,768 to 32,767 | `0` | Rarely used |
| `int` | 32 bits | ±2.1 billion | `0` | The default integer type |
| `long` | 64 bits | ±9.2 quintillion | `0L` | Suffix literals with `L`: `100L` |
| `float` | 32 bits | ~7 decimal digits | `0.0f` | Suffix literals with `f`: `3.14f` |
| `double` | 64 bits | ~15 decimal digits | `0.0` | The default float type |
| `char` | 16 bits | UTF-16 code unit | `'\u0000'` | Single quotes: `'A'`. Surrogate pairs for non-BMP characters. |

```java
int x = 42;
long bigNum = 9_999_999_999L;
double pi = 3.14159;
float f = 3.14f;
boolean ok = true;
char c = 'A';
byte b = 100;
```

### Underscores in numeric literals
```java
int oneMillion = 1_000_000;
long phoneNum = 555_123_4567L;
int binary = 0b1010_0101;
int hex = 0xDEAD_BEEF;
int octal = 0_755;
```

Improves readability. No effect on the value.

### Wrapper types (auto-boxing)
Each primitive has a corresponding object wrapper:

| Primitive | Wrapper |
|---|---|
| `boolean` | `Boolean` |
| `byte` | `Byte` |
| `short` | `Short` |
| `int` | `Integer` |
| `long` | `Long` |
| `float` | `Float` |
| `double` | `Double` |
| `char` | `Character` |

```java
Integer x = 42;           // auto-boxing primitive → wrapper
int y = x;                 // auto-unboxing
Integer a = null;          // nullable!
int b = a;                  // NullPointerException at runtime
```

**Use primitives** in fields, parameters, local vars by default. Use wrappers when:
- Storing in collections (`List<Integer>`, not `List<int>`).
- Need to represent "absent" with `null`.
- Working with generics.

Wrapper types support `null`; primitives don't. This is a common source of NPEs.

### Type promotion
```java
int a = 10, b = 3;
double result = a / b;     // 3.0, not 3.333... — integer division first!
double result2 = (double) a / b;   // 3.333...
double result3 = a / (double) b;
```

Integer / integer = integer (truncated). Promote at least one operand to float/double.

### Overflow
```java
int x = Integer.MAX_VALUE;   // 2_147_483_647
int y = x + 1;                // -2_147_483_648 (wraps around silently)

long z = (long) x + 1;       // safe: promote first
Math.addExact(x, 1);         // throws ArithmeticException on overflow
```

`Math.addExact`, `Math.multiplyExact`, etc. throw on overflow. Use them when correctness matters.

### `BigInteger` and `BigDecimal`
For exact arbitrary-precision arithmetic:
```java
import java.math.BigInteger;
import java.math.BigDecimal;

BigInteger huge = new BigInteger("12345678901234567890");
BigInteger sum = huge.add(BigInteger.ONE);

BigDecimal price = new BigDecimal("19.99");   // string constructor — exact!
BigDecimal tax = price.multiply(new BigDecimal("0.07"));
```

**Money: never use `double`.** Use `BigDecimal` with the string constructor.

---

## 3. Variables and `var`

```java
int count = 0;
String name = "Alice";
List<String> items = new ArrayList<>();
```

### `var` — local-variable type inference (Java 10+)
```java
var count = 0;                              // int
var name = "Alice";                          // String
var items = new ArrayList<String>();          // ArrayList<String>
var map = new HashMap<String, Integer>();    // HashMap<String, Integer>
```

`var` works for **local variables only** — not fields, parameters, or return types.

**Limitations**:
- Must initialize at declaration.
- Can't be `null` (no inferred type).
- Loses information for collections that benefit from interface types:
  ```java
  List<String> items = new ArrayList<>();   // declared as List
  var items = new ArrayList<String>();       // declared as ArrayList
  ```
  Sometimes you want the interface type. `var` always gives you the concrete type.

**When to use `var`**:
- The type is obvious from the right-hand side.
- The type name is long and noisy.
- Within short blocks where readability isn't hurt.

**When to skip**:
- Public/private fields — never (not allowed).
- When the explicit type adds documentation.
- For literals where the inferred type might surprise (`var x = 1` → int, but maybe you wanted long).

### Constants — `final`
```java
final int MAX_SIZE = 100;
final String GREETING = "Hello";
```

`final` means the variable can't be reassigned. For instance fields, this also means must be set in constructor.

For class-level constants:
```java
public static final int MAX_USERS = 1000;
public static final String API_VERSION = "v1";
```

Convention: `static final` constants are `UPPER_SNAKE_CASE`.

### Scope
Variables are block-scoped:
```java
if (condition) {
    int x = 10;
}
// x is not visible here

for (int i = 0; i < 10; i++) { ... }
// i is not visible here
```

No "hoisting" — declaration order matters.

---

## 4. Operators

Mostly C-like.

### Arithmetic
```java
int a = 10, b = 3;
a + b   // 13
a - b   // 7
a * b   // 30
a / b   // 3   (integer division — truncates)
a % b   // 1   (modulo)
a++     // increment (a becomes 11)
++a     // pre-increment
a--; --a;

10.0 / 3   // 3.333... (one float operand → float result)
```

### Comparison
```java
a == b     // equality (for objects, reference identity!)
a != b
a < b
a > b
a <= b
a >= b
```

**Critical**: for objects, `==` checks **reference equality**, not value:
```java
String a = new String("hi");
String b = new String("hi");
a == b           // false — different objects
a.equals(b)      // true — same content
```

Use `.equals()` for value comparison. Always.

### Logical
```java
a && b      // short-circuit AND
a || b      // short-circuit OR
!a           // NOT

// Bitwise (also work on booleans, but no short-circuit)
a & b
a | b
a ^ b       // XOR
~a           // bitwise NOT
a << 2       // left shift
a >> 2       // arithmetic right shift (sign-preserving)
a >>> 2      // logical right shift (fills with 0)
```

### Assignment + compound
```java
a += 5;
a -= 5;
a *= 2;
a /= 2;
a %= 2;
a <<= 1;
a >>= 1;
a &= mask;
a |= flag;
a ^= flip;
```

### Ternary
```java
String result = (age >= 18) ? "adult" : "minor";
```

### String concatenation with `+`
```java
String hello = "Hello, " + name + "!";
int answer = 42;
String s = "Answer: " + answer;       // int auto-converted to String
```

Behind the scenes, `+` on Strings uses `StringBuilder`. For loops, prefer explicit `StringBuilder` (covered in section 5).

---

## 5. Strings

`String` is a class (not a primitive). String literals are `"double quotes"`.

```java
String s = "hello";
int len = s.length();              // 5
char c = s.charAt(0);              // 'h'
boolean has = s.contains("ell");   // true
String upper = s.toUpperCase();    // "HELLO"
String sub = s.substring(1, 4);    // "ell" (start inclusive, end exclusive)
String[] parts = "a,b,c".split(","); // ["a", "b", "c"]
String joined = String.join("-", "a", "b", "c");   // "a-b-c"
boolean empty = s.isEmpty();        // false
boolean blank = "  ".isBlank();      // true (whitespace only)
String trimmed = "  x  ".strip();    // "x"
boolean starts = s.startsWith("he"); // true
int idx = s.indexOf("l");           // 2
String replaced = s.replace('l', 'L');
String formatted = String.format("x=%d, y=%s", 1, "two");
```

### Strings are immutable
Every operation creates a new String. Reassigning a reference doesn't modify the original.

```java
String s = "hello";
s = s + " world";    // s now points to a new String; original "hello" is unchanged
```

### `StringBuilder` for building strings in loops
```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.append(i).append(",");
}
String result = sb.toString();
```

`+=` on String in a loop is O(n²). `StringBuilder` is O(n).

### Text blocks (Java 15+)
Multi-line strings without escapes:
```java
String json = """
        {
            "name": "Alice",
            "age": 30
        }
        """;

String html = """
        <html>
            <body>%s</body>
        </html>
        """.formatted(body);
```

Indentation is auto-stripped based on the closing `"""` line. Backslash at end of line continues without newline:
```java
String s = """
        First part \
        continued on the same line
        """;
```

### String formatting
```java
String.format("Name: %s, Age: %d, Pi: %.2f", "Alice", 30, 3.14159);
// "Name: Alice, Age: 30, Pi: 3.14"

// Format specifiers:
// %s - string
// %d - integer
// %f - float (%.2f for 2 decimals)
// %e - scientific
// %x - hex
// %b - boolean
// %n - platform-specific newline
// %% - literal %

// Newer (Java 15+):
"Hello %s, you are %d".formatted(name, age);
```

For interpolation, Java doesn't have direct `${var}` syntax in plain strings. Use `String.format`, text blocks with `.formatted`, or `+` concatenation. (String templates were a preview in Java 21 but withdrawn.)

### Comparing strings
```java
"hello".equals(other)              // value equality
"hello".equalsIgnoreCase(other)
"hello".compareTo(other)            // sort order: <0, 0, >0
"hello".equals(s)                   // safer than s.equals("hello") — handles s == null:
"hello".equals(null);              // false, no NPE
s.equals("hello");                  // NPE if s is null
```

The "Yoda style" — `"literal".equals(maybeNull)` — avoids NullPointerException.

### `String.intern` and pool
String literals are pooled — `"hi" == "hi"` is `true` because both refer to the same pooled object. But:
```java
String a = "hi";
String b = new String("hi");
a == b;           // false — `new` creates a new object
a.equals(b);      // true
```

Don't rely on `==` for strings. Always `.equals()`.

---

## 6. Control Flow

### `if` / `else`
```java
if (condition) {
    // ...
} else if (other) {
    // ...
} else {
    // ...
}
```

Braces are optional for single-statement blocks but **always use them** — prevents bugs and keeps style consistent.

### Ternary
```java
String name = (user != null) ? user.getName() : "anonymous";
```

Nested ternaries become unreadable — switch to `if` chains or methods.

---

## 7. Switch — Statements vs Expressions

Traditional switch (statement form):
```java
String day = "MONDAY";
switch (day) {
    case "MONDAY":
    case "TUESDAY":
        System.out.println("Early week");
        break;
    case "FRIDAY":
        System.out.println("Almost weekend");
        break;
    default:
        System.out.println("Other");
}
```

Issues:
- `break` is required or cases fall through (a frequent bug source).
- Verbose; can't be used as an expression.

### Switch expressions (Java 14+)
Modern form — concise, no fall-through:
```java
String type = switch (day) {
    case "MONDAY", "TUESDAY" -> "Early week";
    case "FRIDAY" -> "Almost weekend";
    case "SATURDAY", "SUNDAY" -> "Weekend";
    default -> "Other";
};
```

- `->` instead of `:` — no fall-through.
- Can group cases with commas.
- The whole switch is an expression (returns a value).
- Must be exhaustive for sealed types / enums (compile error otherwise).

For multi-statement bodies:
```java
int code = switch (day) {
    case "MONDAY" -> {
        log("first day");
        yield 1;          // `yield` returns a value from a block
    }
    case "FRIDAY" -> 5;
    default -> 0;
};
```

### Pattern matching in switch (Java 21+)
```java
sealed interface Shape permits Circle, Square, Rectangle {}
record Circle(double radius) implements Shape {}
record Square(double side) implements Shape {}
record Rectangle(double width, double height) implements Shape {}

double area = switch (shape) {
    case Circle c -> Math.PI * c.radius() * c.radius();
    case Square s -> s.side() * s.side();
    case Rectangle r -> r.width() * r.height();
};
```

- Matches by type and destructures.
- No `default` needed because the union is exhaustive.
- Adds a new case at compile time if you add a new permitted type without handling it.

Covered more in `15_modern_features_and_advanced.md`.

### When to use switch
- Multiple discrete values → switch expression (clear and concise).
- Range checks (`x > 10`) → if/else.
- Type-based dispatch on a sealed hierarchy → pattern-matching switch.

---

## 8. Loops

### `while`
```java
int i = 0;
while (i < 10) {
    System.out.println(i);
    i++;
}
```

### `do ... while`
```java
int i = 0;
do {
    System.out.println(i);
    i++;
} while (i < 10);
```

Runs at least once. Rare in practice.

### Classic `for`
```java
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}
```

### Enhanced `for` (for-each)
```java
List<String> names = List.of("Alice", "Bob", "Carol");
for (String name : names) {
    System.out.println(name);
}

int[] nums = {1, 2, 3};
for (int n : nums) {
    System.out.println(n);
}
```

Works for arrays and anything implementing `Iterable<T>`. Use this when you don't need the index.

### `break` and `continue`
```java
for (int i = 0; i < 100; i++) {
    if (i == 50) break;       // exit loop
    if (i % 2 == 0) continue;  // next iteration
    System.out.println(i);
}
```

### Labeled break / continue
For breaking out of nested loops:
```java
outer:
for (int i = 0; i < 10; i++) {
    for (int j = 0; j < 10; j++) {
        if (matrix[i][j] == target) {
            System.out.println("Found");
            break outer;
        }
    }
}
```

Rare — usually a sign to extract a method that returns early.

### Streams as a loop alternative
For many cases, Streams (file 06) are more idiomatic:
```java
list.stream()
    .filter(s -> s.length() > 3)
    .map(String::toUpperCase)
    .forEach(System.out::println);
```

Use whatever reads more clearly. Both are common.

---

## 9. Arrays

Fixed-size, primitive-typed:
```java
int[] nums = new int[5];        // {0, 0, 0, 0, 0}
int[] vals = {1, 2, 3, 4, 5};   // initializer
String[] names = new String[]{"Alice", "Bob"};

nums.length;                     // 5 — note: field, not method
nums[0] = 42;
int first = nums[0];
```

### Multi-dimensional
```java
int[][] matrix = new int[3][4];      // 3 rows, 4 cols
matrix[1][2] = 7;

int[][] grid = {
    {1, 2, 3},
    {4, 5, 6},
};

int[][] jagged = new int[3][];        // rows can be different sizes
jagged[0] = new int[]{1, 2};
jagged[1] = new int[]{1, 2, 3, 4};
```

### Arrays vs `List`
- `int[]` — fixed size, primitive.
- `List<Integer>` — dynamic, boxed.
- `Arrays.asList(1, 2, 3)` — fixed-size List view of varargs.
- `new ArrayList<>(Arrays.asList(...))` — mutable List with the same items.

In most modern code, use `List`. Arrays are useful for primitives (memory efficiency) and varargs.

### `Arrays` utility class
```java
import java.util.Arrays;

int[] arr = {3, 1, 4, 1, 5, 9, 2, 6};
Arrays.sort(arr);                    // mutates: {1, 1, 2, 3, 4, 5, 6, 9}
int idx = Arrays.binarySearch(arr, 4);
int[] copy = Arrays.copyOf(arr, 5);  // first 5 elements
String s = Arrays.toString(arr);     // "[1, 1, 2, 3, 4, 5, 6, 9]"
List<Integer> list = Arrays.asList(1, 2, 3);
boolean equal = Arrays.equals(arr, other);
```

For multi-dimensional arrays, use `Arrays.deepToString` and `Arrays.deepEquals`.

---

## 10. Methods

```java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public static int multiply(int a, int b) {
        return a * b;
    }

    // No return value
    public void print(int n) {
        System.out.println(n);
    }
}
```

- **Access modifier**: `public`, `private`, `protected`, or default (package-private).
- **`static`**: belongs to the class, not instances.
- **Return type**: type of value returned, or `void` for no return.
- **Parameters**: typed.

### Calling
```java
Calculator calc = new Calculator();
int sum = calc.add(2, 3);
int product = Calculator.multiply(4, 5);   // static — call on class
```

### Method overloading
Multiple methods with the same name, different parameters:
```java
public int max(int a, int b) { return a > b ? a : b; }
public double max(double a, double b) { return a > b ? a : b; }
public int max(int a, int b, int c) { return max(max(a, b), c); }
```

The compiler picks the right one based on argument types.

### Varargs
```java
public int sum(int... nums) {
    int total = 0;
    for (int n : nums) total += n;
    return total;
}

sum();           // 0
sum(1);           // 1
sum(1, 2, 3);     // 6
sum(new int[]{1, 2, 3});   // 6 — array can be passed
```

`int...` is sugar for `int[]`. Must be the last parameter.

### Parameter passing
Java is **pass-by-value** — always.
```java
void modify(int x) { x = 100; }
int n = 5;
modify(n);    // n is still 5
```

For objects, the **reference** is passed by value — you can mutate the object but not change which object the caller's variable points to:
```java
void addItem(List<String> list) {
    list.add("new");          // mutates the caller's list
}

void replace(List<String> list) {
    list = new ArrayList<>();   // does NOT affect the caller
}
```

### `return`
```java
public int divide(int a, int b) {
    if (b == 0) return 0;   // early return
    return a / b;
}
```

Multiple returns are fine. Most modern style allows them.

---

## 11. Comments and Javadoc

### Comments
```java
// Single-line

/* Multi-line
   comment */

/* Inline */ int x = 5;
```

### Javadoc
For documentation, especially for public APIs:
```java
/**
 * Adds two integers.
 *
 * @param a the first number
 * @param b the second number
 * @return the sum of {@code a} and {@code b}
 * @throws ArithmeticException if the sum overflows
 */
public int add(int a, int b) {
    return Math.addExact(a, b);
}
```

Tags:
- `@param name description`
- `@return description`
- `@throws ExceptionType when`
- `@see RelatedThing`
- `@since 1.0`
- `@deprecated reason`
- `@author name`
- `{@link ClassName#method}` — links inside text.
- `{@code text}` — inline code.

IDEs read Javadoc and show it on hover. Generated documentation:
```bash
javadoc -d docs com/example/**/*.java
mvn javadoc:javadoc
```

### What deserves Javadoc
- Public APIs of libraries.
- Public methods of services / interfaces with non-obvious behavior.
- Anything where the next reader will ask "why?"

Skip Javadoc for trivial getters/setters. The names already say it.

---

That's the language surface. Next, the data structures everyone uses — `03_data_structures.md`.
