# 03. Data Structures

> Arrays, `List`, `Set`, `Map`, `Queue`, and the rest of the Collections Framework — what to use when.

---

## Table of Contents

1. [The Collections Framework](#1-the-collections-framework)
2. [List](#2-list)
3. [Set](#3-set)
4. [Map](#4-map)
5. [Queue and Deque](#5-queue-and-deque)
6. [Iterating Collections](#6-iterating-collections)
7. [Immutable Collections](#7-immutable-collections)
8. [Choosing the Right Collection](#8-choosing-the-right-collection)
9. [Common Operations and Patterns](#9-common-operations-and-patterns)
10. [Common Pitfalls](#10-common-pitfalls)

---

## 1. The Collections Framework

Java's `java.util` package has a rich hierarchy:

```
Iterable
└── Collection
    ├── List           (ordered, indexed, allows duplicates)
    │   ├── ArrayList
    │   └── LinkedList (rarely the right choice)
    ├── Set            (no duplicates)
    │   ├── HashSet
    │   ├── LinkedHashSet (insertion order)
    │   └── TreeSet   (sorted)
    └── Queue          (FIFO / priority)
        ├── ArrayDeque (also Deque — double-ended)
        ├── LinkedList (also implements Queue)
        └── PriorityQueue

Map (NOT a Collection — separate hierarchy)
├── HashMap
├── LinkedHashMap     (insertion order)
└── TreeMap            (sorted by keys)
```

You'll spend 90% of your time with `ArrayList`, `HashMap`, `HashSet`, and `ArrayDeque`. The rest are specialized.

### Generic typing
All collections are generic:
```java
List<String> names = new ArrayList<>();
Map<String, Integer> ages = new HashMap<>();
Set<Long> ids = new HashSet<>();
```

The `<>` on the right is the **diamond operator** — type inferred from the left.

### Interface vs concrete type
Idiomatic style: declare with the interface type, instantiate with a concrete type.
```java
List<String> names = new ArrayList<>();     // declared as List
Map<String, Integer> ages = new HashMap<>();
```

Lets you swap the implementation later without changing the variable type.

---

## 2. List

Ordered, indexed, allows duplicates.

### `ArrayList` — the default
Backed by an array. Fast random access, fast append, slow random insert/remove (especially at the front).

```java
List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
names.add(0, "First");                 // insert at position
names.get(0);                           // "First"
names.set(1, "Alicia");                 // replace
names.size();                           // 3
names.remove(0);                        // remove by index
names.remove("Alicia");                  // remove by value
names.contains("Bob");                   // true
names.indexOf("Bob");                    // 0
names.isEmpty();
names.clear();                           // remove all

// Bulk
names.addAll(List.of("X", "Y", "Z"));
names.removeAll(other);
names.retainAll(other);                  // intersection

// Slicing — sublist (view, not copy!)
List<String> sub = names.subList(1, 3);  // index 1 to 2 inclusive
// Mutations to sub affect names. Wrap in new ArrayList<>(sub) to copy.
```

### `LinkedList` — almost never the right choice
Doubly linked list. Better at front/back insert, worse at everything else. Use `ArrayDeque` for queue-like behavior, `ArrayList` otherwise.

### `List.of()` — immutable list (Java 9+)
```java
List<String> immutable = List.of("Alice", "Bob", "Carol");
immutable.add("X");      // UnsupportedOperationException
```

Use for fixed lists. Throws on mutation attempts. Up to 10 elements with positional `of`; for more, use `List.of(arr)` or `Arrays.asList`.

### Conversion
```java
String[] arr = names.toArray(new String[0]);
String[] arr2 = names.toArray(String[]::new);    // newer
List<String> back = Arrays.asList(arr);           // fixed-size list view
List<String> mutable = new ArrayList<>(Arrays.asList(arr));
```

### Sorting
```java
List<Integer> nums = new ArrayList<>(List.of(3, 1, 4, 1, 5));
Collections.sort(nums);                  // in place
nums.sort(Comparator.naturalOrder());
nums.sort(Comparator.reverseOrder());

List<User> users = ...;
users.sort(Comparator.comparing(User::getName));
users.sort(Comparator.comparing(User::getAge).reversed());
users.sort(Comparator.comparing(User::getName)
    .thenComparing(User::getAge));
```

---

## 3. Set

No duplicates. Most have no defined order.

### `HashSet` — the default
O(1) add/contains/remove. No order.
```java
Set<String> tags = new HashSet<>();
tags.add("java");
tags.add("backend");
tags.add("java");        // duplicate — has no effect
tags.contains("java");    // true
tags.remove("backend");
tags.size();
```

### `LinkedHashSet` — insertion order
Same as `HashSet` plus preserves insertion order.
```java
Set<String> ordered = new LinkedHashSet<>();
ordered.add("c");
ordered.add("a");
ordered.add("b");
// iteration order: c, a, b
```

### `TreeSet` — sorted order
O(log n) operations. Iterates in natural order (or custom Comparator).
```java
Set<Integer> sorted = new TreeSet<>();
sorted.add(3);
sorted.add(1);
sorted.add(2);
// iteration order: 1, 2, 3

TreeSet<Integer> ts = new TreeSet<>();
ts.add(5); ts.add(1); ts.add(10);
ts.first();         // 1
ts.last();          // 10
ts.lower(5);        // 1 (strictly less than)
ts.higher(5);       // 10 (strictly greater than)
ts.floor(5);        // 5 (less or equal)
ts.ceiling(5);      // 5 (greater or equal)
ts.headSet(5);      // {1}
ts.tailSet(5);      // {5, 10}
ts.subSet(1, 10);   // [1, 10)
```

### `Set.of()` — immutable
```java
Set<String> tags = Set.of("java", "backend", "spring");
```

### Set operations
```java
Set<String> union = new HashSet<>(setA);
union.addAll(setB);

Set<String> intersection = new HashSet<>(setA);
intersection.retainAll(setB);

Set<String> difference = new HashSet<>(setA);
difference.removeAll(setB);
```

### `EnumSet` — specialized, fast
For enums:
```java
enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

Set<Day> weekend = EnumSet.of(Day.SAT, Day.SUN);
Set<Day> weekdays = EnumSet.range(Day.MON, Day.FRI);
Set<Day> all = EnumSet.allOf(Day.class);
Set<Day> none = EnumSet.noneOf(Day.class);
```

Backed by a bit mask. Much faster than `HashSet<Day>`.

---

## 4. Map

Key → value. Keys unique; values can duplicate.

### `HashMap` — the default
O(1) get/put/remove. No order.
```java
Map<String, Integer> ages = new HashMap<>();
ages.put("Alice", 30);
ages.put("Bob", 25);
ages.get("Alice");                   // 30
ages.get("Carol");                   // null — not present
ages.getOrDefault("Carol", 0);       // 0
ages.containsKey("Alice");           // true
ages.containsValue(30);               // true (O(n) — slow)
ages.size();
ages.remove("Bob");
ages.isEmpty();

// Iterate
for (Map.Entry<String, Integer> entry : ages.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}
for (String key : ages.keySet()) { ... }
for (Integer val : ages.values()) { ... }

ages.forEach((k, v) -> System.out.println(k + ": " + v));
```

### Useful methods (Java 8+)
```java
// Compute if absent — common for caches / counters
Map<String, List<Item>> byCategory = new HashMap<>();
byCategory.computeIfAbsent("books", k -> new ArrayList<>()).add(item);

// Merge — combine values
Map<String, Integer> counts = new HashMap<>();
for (String word : words) {
    counts.merge(word, 1, Integer::sum);    // increment or insert 1
}

// PutIfAbsent
ages.putIfAbsent("Carol", 40);

// Compute / computeIfPresent
ages.compute("Alice", (k, v) -> v == null ? 1 : v + 1);
ages.computeIfPresent("Alice", (k, v) -> v + 1);

// Replace
ages.replace("Alice", 31);
ages.replace("Alice", 30, 31);   // CAS-like: only replace if current == 30
```

### `LinkedHashMap` — insertion order
```java
Map<String, Integer> ordered = new LinkedHashMap<>();
```

Useful when iteration order matters. Can also configure for access-order (LRU cache pattern).

### `TreeMap` — sorted by key
O(log n) operations. Natural key ordering (or Comparator).
```java
TreeMap<String, Integer> sorted = new TreeMap<>();
sorted.put("c", 1);
sorted.put("a", 2);
sorted.put("b", 3);
// keys iterate: a, b, c

sorted.firstKey(); sorted.lastKey();
sorted.floorKey("b"); sorted.ceilingKey("b");
sorted.headMap("c"); sorted.tailMap("b");
```

### `Map.of()` and `Map.entry()` — immutable maps
```java
Map<String, Integer> ages = Map.of(
    "Alice", 30,
    "Bob", 25,
    "Carol", 40
);

// More than 10 entries:
Map<String, Integer> big = Map.ofEntries(
    Map.entry("Alice", 30),
    Map.entry("Bob", 25),
    // ...
);
```

### `EnumMap` — specialized for enum keys
```java
enum Day { MON, TUE, WED }
Map<Day, String> schedule = new EnumMap<>(Day.class);
schedule.put(Day.MON, "Meeting");
```

Faster than `HashMap<Day, ...>`.

### `ConcurrentHashMap` — thread-safe
For multi-threaded code. Covered in `08_concurrency.md`.

---

## 5. Queue and Deque

### `Queue` — FIFO
```java
Queue<String> q = new ArrayDeque<>();
q.offer("a");              // add
q.offer("b");
q.poll();                   // remove + return head ("a"). Returns null if empty.
q.peek();                   // look without removing
q.isEmpty();
q.size();
```

Use `offer`/`poll`/`peek` — they return null on failure. The alternatives (`add`/`remove`/`element`) throw exceptions, which is rarely what you want.

### `Deque` — double-ended queue (also stack)
```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.push(3);
stack.pop();         // 3
stack.peek();        // 2

Deque<Integer> deque = new ArrayDeque<>();
deque.offerFirst(1);
deque.offerLast(2);
deque.pollFirst();
deque.pollLast();
deque.peekFirst();
deque.peekLast();
```

`ArrayDeque` is faster than `Stack` (legacy class) or `LinkedList` for both queue and stack use cases.

### `PriorityQueue` — min-heap
```java
PriorityQueue<Integer> pq = new PriorityQueue<>();
pq.offer(5);
pq.offer(1);
pq.offer(3);
pq.poll();    // 1 — smallest first

// Custom comparator — e.g., max-heap
PriorityQueue<Integer> maxPQ = new PriorityQueue<>(Comparator.reverseOrder());

// Priority by task urgency
PriorityQueue<Task> tasks = new PriorityQueue<>(
    Comparator.comparingInt(Task::priority)
);
```

Useful for top-K problems, Dijkstra's algorithm, event simulation.

### Concurrent queues
- `BlockingQueue` — for producer/consumer (`ArrayBlockingQueue`, `LinkedBlockingQueue`).
- `ConcurrentLinkedQueue` — non-blocking concurrent FIFO.

Covered in `08_concurrency.md`.

---

## 6. Iterating Collections

### Enhanced for
```java
for (String name : names) {
    System.out.println(name);
}

for (Map.Entry<String, Integer> e : map.entrySet()) {
    System.out.println(e.getKey() + ": " + e.getValue());
}
```

### `forEach` with lambda
```java
names.forEach(System.out::println);
map.forEach((k, v) -> System.out.println(k + ": " + v));
```

### Iterator (manual)
```java
Iterator<String> it = names.iterator();
while (it.hasNext()) {
    String name = it.next();
    if (name.startsWith("X")) {
        it.remove();     // safe modification during iteration
    }
}
```

### `ListIterator` — for `List` only, bidirectional
```java
ListIterator<String> it = names.listIterator();
while (it.hasNext()) {
    String name = it.next();
    if (name.equals("foo")) {
        it.set("bar");          // replace current element
    }
    if (name.equals("baz")) {
        it.add("qux");          // insert after current
    }
}
```

### Streams (file 06)
```java
names.stream()
    .filter(n -> n.length() > 3)
    .map(String::toUpperCase)
    .forEach(System.out::println);
```

The functional alternative. Covered fully in `06_streams_and_lambdas.md`.

---

## 7. Immutable Collections

Immutable collections prevent accidental modification and are safe to share across threads.

### `List.of`, `Set.of`, `Map.of` (Java 9+)
```java
List<String> names = List.of("Alice", "Bob");
Set<Integer> ids = Set.of(1, 2, 3);
Map<String, Integer> ages = Map.of("Alice", 30, "Bob", 25);
```

Throws on mutation. Throws on null elements. Throws on duplicate keys (Map.of).

### `Collections.unmodifiableList(list)` etc.
Wraps a mutable collection in an unmodifiable view:
```java
List<String> base = new ArrayList<>();
base.add("a");
List<String> view = Collections.unmodifiableList(base);
view.add("b");        // UnsupportedOperationException
base.add("b");         // ok — but view now sees "b" too! It's a view, not a copy.
```

For a true defensive copy:
```java
List<String> safe = List.copyOf(base);
```

### Stream to immutable
```java
List<String> filtered = stream.toList();              // Java 16+ — immutable
List<String> filtered2 = stream.collect(Collectors.toUnmodifiableList());
```

### Why prefer immutable
- Safer to share between threads.
- Easier to reason about.
- No defensive copying needed.

For methods returning collections from a class, prefer returning immutable views over the internal mutable state.

---

## 8. Choosing the Right Collection

### When you want sequence (order, can duplicate)
- General use → `ArrayList`.
- Fast front/back insertion → `ArrayDeque`.
- Never (in 2026) → `LinkedList`, `Vector`.

### When you want uniqueness
- General → `HashSet`.
- Want insertion order preserved → `LinkedHashSet`.
- Want sorted → `TreeSet`.
- Enum keys → `EnumSet`.

### When you want key → value
- General → `HashMap`.
- Want insertion order → `LinkedHashMap`.
- Want sorted by key → `TreeMap`.
- Enum keys → `EnumMap`.
- Concurrent access → `ConcurrentHashMap`.

### When you want FIFO
- `ArrayDeque` (as Queue). Avoid `LinkedList` here too.

### When you want LIFO (stack)
- `ArrayDeque` (as Deque). Don't use the legacy `Stack` class.

### When you want priority
- `PriorityQueue` (min-heap).

### Performance summary
| Operation | ArrayList | HashSet | HashMap | TreeMap | ArrayDeque |
|---|---|---|---|---|---|
| add | O(1) amortized | O(1) | O(1) | O(log n) | O(1) |
| get / contains | O(1) / O(n) | O(1) | O(1) | O(log n) | O(n) / O(1) ends |
| remove | O(n) | O(1) | O(1) | O(log n) | O(1) ends |
| iterate | O(n) | O(n) | O(n) | O(n) | O(n) |

---

## 9. Common Operations and Patterns

### Convert array to list
```java
int[] arr = {1, 2, 3};
List<Integer> list = Arrays.stream(arr).boxed().toList();

String[] strArr = {"a", "b"};
List<String> strList = List.of(strArr);   // fixed-size
List<String> mutable = new ArrayList<>(Arrays.asList(strArr));
```

### Group by
```java
Map<String, List<User>> byCity = users.stream()
    .collect(Collectors.groupingBy(User::city));
```

### Count by
```java
Map<String, Long> countByCity = users.stream()
    .collect(Collectors.groupingBy(User::city, Collectors.counting()));
```

### Sum / aggregate
```java
int total = users.stream().mapToInt(User::age).sum();
double avg = users.stream().mapToInt(User::age).average().orElse(0);
```

### Find one
```java
Optional<User> alice = users.stream()
    .filter(u -> u.name().equals("Alice"))
    .findFirst();
alice.ifPresent(System.out::println);
User u = alice.orElseThrow();
```

### Frequency count
```java
Map<String, Integer> counts = new HashMap<>();
for (String word : words) {
    counts.merge(word, 1, Integer::sum);
}
```

### Index by key
```java
Map<Long, User> usersById = users.stream()
    .collect(Collectors.toMap(User::id, u -> u));
```

If keys can collide, provide a merge function:
```java
Map<String, Integer> sumByCity = users.stream()
    .collect(Collectors.toMap(User::city, User::age, Integer::sum));
```

### Top K
```java
List<User> top5 = users.stream()
    .sorted(Comparator.comparing(User::score).reversed())
    .limit(5)
    .toList();
```

For very large N, use a `PriorityQueue` of size K instead.

### Partition
```java
Map<Boolean, List<User>> partitioned = users.stream()
    .collect(Collectors.partitioningBy(u -> u.age() >= 18));
List<User> adults = partitioned.get(true);
List<User> minors = partitioned.get(false);
```

---

## 10. Common Pitfalls

### Modifying during iteration
```java
for (String s : list) {
    if (s.isEmpty()) list.remove(s);    // ConcurrentModificationException
}
```

Fix:
```java
list.removeIf(String::isEmpty);          // built-in safe removal

// Or use Iterator:
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if (it.next().isEmpty()) it.remove();
}
```

### `Arrays.asList` returns fixed-size list
```java
List<String> list = Arrays.asList("a", "b");
list.add("c");      // UnsupportedOperationException
list.set(0, "x");    // OK — set works, just not add/remove
```

For mutable:
```java
List<String> mutable = new ArrayList<>(Arrays.asList("a", "b"));
```

### Auto-boxing performance
```java
Map<Integer, Integer> map = new HashMap<>();
for (int i = 0; i < 1_000_000; i++) {
    map.put(i, i);     // each int boxed to Integer
}
```

For very performance-critical code with primitives, use:
- `int[]` directly.
- Eclipse Collections or fastutil libraries (`IntList`, `Int2IntMap`, etc.).

### `HashMap` and bad `hashCode`
If a key's `hashCode` returns the same value for many objects, `HashMap` degrades to a tree (Java 8+) — slower but not pathological. Pre-Java 8, it became a linked list — O(n) operations. Always implement `equals`/`hashCode` correctly (or use records).

### Mutable keys in HashMap
```java
List<String> key = new ArrayList<>();
key.add("a");
map.put(key, "value");
key.add("b");        // key changed — hashCode now different
map.get(key);        // null! Key is no longer findable.
```

Don't mutate things used as map keys. Use immutable keys.

### `null` in collections
- `HashMap` allows one `null` key and any number of `null` values.
- `Hashtable` (legacy) doesn't allow `null`.
- `ConcurrentHashMap` doesn't allow `null` keys or values.
- `List.of`, `Set.of`, `Map.of` don't allow `null`.

Avoid `null` in collections; use Optional or sentinel values.

### `==` vs `.equals()` for elements
`HashSet`, `HashMap` use `.equals()` and `.hashCode()`. Make sure your objects implement both correctly — records do this automatically.

### Copying via constructor
```java
List<String> copy = new ArrayList<>(original);   // shallow copy
```

Shallow: elements are shared. If elements are mutable, mutations are visible through both lists.

For deep copies, you have to do it manually or use serialization.

### `subList` is a view
```java
List<String> sub = list.subList(1, 4);
sub.set(0, "x");        // also modifies list!
list.add("y");          // makes sub unstable — operations may now throw
```

If you want a separate list:
```java
List<String> copy = new ArrayList<>(list.subList(1, 4));
```

### TreeMap with mutable keys
Same issue as HashMap. If you mutate a key, the tree breaks.

### Memory of `ArrayList`
`ArrayList` doesn't shrink when you remove items. To compact:
```java
list.trimToSize();
```

Rarely needed; GC handles most cases.

---

That's the data structure layer. Next, the type system for organizing code — `04_oop.md`.
