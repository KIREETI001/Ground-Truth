# Java — Reference Library

A reference for **modern Java** (Java 21 LTS and 25 LTS) — the language itself, the JVM, the standard library, build tools, and the Spring ecosystem. The dominant choice in enterprise backends, Android development, and big-data tooling for two decades and still going.

---

## How to navigate this folder

| # | File | What's in it |
|---|---|---|
| — | `README.md` | This file. Mental model, when to use Java, ecosystem orientation. |
| 01 | `01_setup.md` | Installing JDKs (Temurin, GraalVM), build tools, IDE setup, project structure. |
| 02 | `02_language_basics.md` | Syntax, primitives, control flow, variables, modern features (var, switch expressions, text blocks). |
| 03 | `03_data_structures.md` | Arrays, Lists, Sets, Maps, Queues, the Collections framework, immutable collections. |
| 04 | `04_oop.md` | Classes, interfaces, inheritance, polymorphism, records, sealed types, enums. |
| 05 | `05_generics.md` | Generic classes/methods, bounded types, wildcards, type erasure. |
| 06 | `06_streams_and_lambdas.md` | Functional interfaces, lambdas, streams, collectors, method references. |
| 07 | `07_errors_and_exceptions.md` | Checked vs unchecked, try-catch-finally, try-with-resources, custom exceptions. |
| 08 | `08_concurrency.md` | Threads, ExecutorService, CompletableFuture, virtual threads, structured concurrency. |
| 09 | `09_io_and_networking.md` | Files, NIO, HTTP client, sockets, serialization. |
| 10 | `10_databases.md` | JDBC, JPA/Hibernate, jOOQ, connection pooling, transactions. |
| 11 | `11_spring_boot.md` | Spring Boot — dependency injection, REST APIs, security, data access. |
| 12 | `12_testing.md` | JUnit 5, Mockito, AssertJ, integration testing with Testcontainers. |
| 13 | `13_build_tools.md` | Maven, Gradle, dependency management, multi-module projects. |
| 14 | `14_jvm_and_performance.md` | JVM internals, garbage collection, profiling, JIT, GraalVM native image. |
| 15 | `15_modern_features_and_advanced.md` | Pattern matching, records, sealed types, virtual threads, Project Loom, common pitfalls. |

---

## What Java is in 2026

Java is **statically typed, object-oriented, runs on the JVM**, with strong tooling, excellent performance, and a vast ecosystem. Despite predictions of decline over the past 20 years, it remains a top-3 language for production systems.

What makes Java relevant today:
- **Spring Boot dominates enterprise backends** — banks, retailers, telecom, government.
- **Android** — though Kotlin is preferred for new code, Java still runs underneath.
- **Big data** — Hadoop, Spark, Kafka, Flink, Elasticsearch are JVM-based.
- **Long-term stability** — 25-year-old code still compiles and runs.
- **Performance** — modern JVM JIT rivals C++ for many workloads. With GraalVM native image, startup is competitive with Go.
- **Predictable evolution** — six-month release cycle, LTS every two years (17 → 21 → 25).
- **Modern features** — records, sealed types, pattern matching, virtual threads, text blocks. The 2020s Java is much less verbose than 2015 Java.

### Where Java sits vs alternatives

| Need | Java vs alternative |
|---|---|
| Enterprise backend | Java + Spring — still default. Kotlin + Spring is gaining. C# + .NET in Microsoft shops. |
| Microservices | Quarkus / Micronaut / Spring Boot. Comparable to Go, faster than Node for CPU work. |
| Big data | Spark (Scala/Java), Flink, Kafka clients. Python competes via PySpark. |
| Android | Kotlin preferred. Java still works. |
| Greenfield startups | Often Go / Node / Python instead — faster to prototype. |
| Mobile (iOS) | Not Java. |
| Frontend | Definitely not Java (legacy GWT/JSF aside). |

---

## Why use Java

- **Mature tooling.** IntelliJ IDEA is one of the best IDEs anywhere. Maven/Gradle, debuggers, profilers, observability — all polished.
- **Type safety + ecosystem.** Static types help large teams. Libraries for nearly everything, often multiple options.
- **Predictable performance.** JVM warmup, then steady-state performance is hard to beat outside C/C++/Rust.
- **Long-term maintenance.** Code from 2010 still runs. Java 21 LTS is supported until 2028+.
- **Hiring pool.** Massive — almost any city has Java developers.

## Why not use Java

- **Verbose syntax** historically. Modern Java (records, var, lambdas) is much better, but still wordier than Kotlin/Python.
- **JVM startup time.** 1–3 seconds to start a Spring Boot app. GraalVM native image fixes this but adds build complexity.
- **Memory hungry** by default. JVM needs heap; small services use more RAM than equivalent Go.
- **Configuration overhead.** Maven/Gradle XML/Groovy/Kotlin DSL, application.yml, profile management — a learning curve.
- **Slow innovation pace** relative to JS / Python — but more stable.

---

## Versions: which Java to use

Java releases follow:
- **Major release** every 6 months (24 → 25 → 26 → ...).
- **LTS release** every 2 years (17 → 21 → 25).

Use **LTS versions** for production. Non-LTS are fine for personal projects but not supported long-term.

In 2026, the current LTS is **Java 25** (released September 2025). **Java 21** (2023) is still widely supported and used. Older code may target **Java 17** (2021) or even **Java 11** (2018) — both still common in enterprise.

This guide targets **Java 21+**. Where features are version-specific, I'll note them.

### Vendor / JDK choice
- **Eclipse Temurin** (formerly AdoptOpenJDK) — default for most. Free, OpenJDK-based.
- **Oracle JDK** — official, requires license for commercial use of certain features.
- **Amazon Corretto** — AWS-supported.
- **Azul Zulu** — alternative, also free OpenJDK.
- **GraalVM** — adds native image, polyglot. Use for serverless / fast-start needs.

For most: install Temurin.

---

## Reading order

1. **New to Java?** `01_setup.md` → `02_language_basics.md` → `03_data_structures.md` → `04_oop.md`. Build a CLI tool. Then `06_streams_and_lambdas.md`.
2. **Backend work?** Add `11_spring_boot.md` → `10_databases.md` → `12_testing.md` → `13_build_tools.md`.
3. **Concurrent / high-performance code?** `08_concurrency.md` and `14_jvm_and_performance.md`.
4. **Library / framework author?** `05_generics.md`, `07_errors_and_exceptions.md`, then `15_modern_features_and_advanced.md`.
5. **Coming from C# / Kotlin / Scala?** Skim 01–04 fast, focus on `06_streams_and_lambdas.md` and `11_spring_boot.md`.

---

## The "Java way" of doing things

A handful of conventions that matter:

- **PascalCase classes, camelCase methods/fields, UPPER_SNAKE constants.**
- **One public class per file.** File name matches the class name.
- **Packages reflect directory structure.** `com.example.app.users.UserService` lives at `src/main/java/com/example/app/users/UserService.java`.
- **Reverse-domain package names.** `com.acme.foo`, not `foo`.
- **Maven Standard Directory Layout** — `src/main/java`, `src/test/java`, `src/main/resources`.
- **Strong types everywhere.** Even `var` (Java 10+) for local inference is still statically typed.
- **Dependency injection** is the default in serious applications — Spring, CDI, or DIY.
- **Annotations drive a lot of behavior** — `@Service`, `@RestController`, `@Test`, `@Inject`. Get comfortable with them.
- **Immutability when possible.** Records and `final` make this easier.
- **Stream + Optional + lambda** for transformations — replacing the old loop-and-mutate style.

---

## What you won't find here

- **Swing / JavaFX desktop GUIs** — niche in 2026. Web frontends consume Java backends instead.
- **Applets, JSP** — dead.
- **Old Java EE (now Jakarta EE)** beyond what overlaps with Spring — covered briefly, but Spring is the dominant choice.
- **Scala / Kotlin / Clojure / Groovy** — separate languages, not Java. Some interop notes only.

---

## TL;DR: when Java fits

Pick Java in 2026 when:
- Building backend services for an enterprise / mid-to-large team.
- Long-term maintenance is a major requirement.
- Performance + ecosystem maturity matter more than rapid prototyping speed.
- The team is already Java-fluent.

Pick something else when:
- Greenfield startup, small team, prototype phase → Go / Node / Python.
- Mobile-first → Kotlin (Android) or Swift (iOS).
- ML / data science workflows → Python.
- Frontend → JS/TS.

Now: `01_setup.md`.
