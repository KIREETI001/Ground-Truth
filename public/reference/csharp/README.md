# C# — Reference Library

A reference for **modern C#** (12 / 13) on **.NET 8 LTS / .NET 9** — the language, runtime, standard library, and major frameworks (ASP.NET Core, Entity Framework Core, Unity for game development).

C# in 2026 is one of the most pleasant statically-typed languages going. Modern features rival or exceed Kotlin / Swift / TypeScript. The runtime (.NET) is open-source, cross-platform, fast, and has a mature ecosystem.

---

## How to navigate this folder

| # | File | What's in it |
|---|---|---|
| — | `README.md` | This file. Mental model, ecosystem, when to use. |
| 01 | `01_setup.md` | Installing .NET SDK, IDE setup, project structure, dotnet CLI. |
| 02 | `02_language_basics.md` | Syntax, types, control flow, modern features (records, pattern matching, top-level statements). |
| 03 | `03_data_structures.md` | Arrays, List, Dictionary, HashSet, immutable collections. |
| 04 | `04_oop.md` | Classes, structs, interfaces, inheritance, records, properties. |
| 05 | `05_generics_and_advanced_types.md` | Generics, constraints, nullable reference types, tuples. |
| 06 | `06_linq_and_lambdas.md` | LINQ, lambda expressions, delegates, functional patterns. |
| 07 | `07_async_and_concurrency.md` | async/await, Tasks, channels, parallel programming. |
| 08 | `08_errors_and_exceptions.md` | Exceptions, custom exceptions, error handling patterns. |
| 09 | `09_io_and_networking.md` | Files, streams, HttpClient, JSON (System.Text.Json). |
| 10 | `10_databases.md` | EF Core, Dapper, migrations, transactions. |
| 11 | `11_aspnet_core.md` | ASP.NET Core — minimal APIs, MVC, middleware, DI. |
| 12 | `12_testing.md` | xUnit, NUnit, Moq, FluentAssertions, integration testing. |
| 13 | `13_game_dev_unity.md` | Unity engine basics — GameObjects, MonoBehaviours, performance. |
| 14 | `14_dotnet_runtime_and_performance.md` | CLR, GC, profiling, Native AOT, spans and stackalloc. |
| 15 | `15_modern_features_and_advanced.md` | Source generators, ref structs, records, pattern matching, common pitfalls. |

---

## What C# is

C# is Microsoft's flagship programming language. Born in 2000 as a Java competitor, it has steadily evolved into one of the most feature-rich mainstream languages.

In 2026, C# runs on **.NET** (formerly ".NET Core" before unification). Cross-platform: Windows, Linux, macOS. Open-source under the .NET Foundation.

What makes C# relevant today:
- **ASP.NET Core dominates Microsoft-shop backends.** Banks, government, enterprise apps.
- **Unity** — the dominant cross-platform game engine, scripted in C#.
- **Cross-platform desktop** — MAUI (Microsoft alternative to Flutter / React Native).
- **High-performance computing** — System.Numerics, SIMD, spans, Native AOT.
- **Best-in-class IDE** — Visual Studio, JetBrains Rider, modern VS Code.
- **Predictable evolution** — annual releases tied to .NET; LTS every two years.

### Where C# sits in 2026

| Need | C# vs alternative |
|---|---|
| Enterprise backend | C# + ASP.NET Core — strong in Microsoft shops. Java + Spring elsewhere. |
| Microservices | ASP.NET Core, Minimal APIs. Comparable to Java, faster than Node for CPU. |
| Game development | C# + Unity / Godot. Dominant. |
| Desktop apps | MAUI, WPF (Windows), Avalonia (cross-platform). |
| Mobile | MAUI, Xamarin. Mostly Microsoft ecosystem; iOS/Android natives still win for AAA. |
| Cloud / Azure | First-class Azure SDK; tight Microsoft integration. |
| ML / data science | ML.NET works; Python is the leader. |
| CLI tools | dotnet CLI, dotnet templates, Native AOT for fast startup. |
| Frontend | Blazor — runs C# in browser via WebAssembly. Niche but legitimate. |

---

## Versions

C# and .NET are released annually:
- **.NET 8 (LTS, Nov 2023)** — supported until Nov 2026. The current LTS in most production systems.
- **.NET 9 (Nov 2024)** — current "STS" release, supported through May 2026.
- **.NET 10 (LTS, Nov 2025)** — newest LTS; supported through Nov 2028.

In 2026, .NET 8 is still widely deployed. .NET 10 is the recommended target for new projects.

C# versions track .NET:
- **C# 12** with .NET 8.
- **C# 13** with .NET 9.
- **C# 14** with .NET 10.

This guide assumes **C# 12+ / .NET 8+**. Where features are newer, I'll note it.

### LTS vs STS
- **LTS (Long-Term Support)**: 3 years. Even-numbered (.NET 8, 10).
- **STS (Standard-Term Support)**: 18 months. Odd-numbered (.NET 9, 11).

For production, pick LTS. For libraries, target the latest LTS or both.

---

## Why use C#

- **Excellent language design.** Records, pattern matching, nullable references, async/await, generics, LINQ, source generators.
- **Performance.** JIT + AOT compilation. Spans for zero-copy. Native AOT for fast startup.
- **Cross-platform.** Linux is a first-class target now.
- **Ecosystem.** NuGet packages, Entity Framework, ASP.NET Core, Azure SDK.
- **Tooling.** Visual Studio + Rider are top-tier. VS Code with C# Dev Kit works well.
- **Hiring pool.** Large, especially in financial services, manufacturing, gaming.

## Why not use C#

- **Microsoft-leaning ecosystem.** Many libraries target Windows or Azure first.
- **Less common in startups / hyperscalers.** Python / Go / Node dominate there.
- **Heavier than Go for microservices.** (Native AOT closes the gap.)
- **Smaller open-source community** than Java or Python.

---

## C# vs Java in 2026

These languages are often compared. They share DNA (curly braces, static types, GC, OO), and both have evolved aggressively.

C# tends to lead on language features:
- Properties with `get`/`set` (Java still uses methods).
- LINQ — Java's streams catch most of it but C#'s syntax is tighter.
- async/await — C# pioneered the modern syntax; Java has it now via virtual threads but different model.
- Pattern matching — both have it; C# has more variations.
- `record` types — both have them.
- `var` — both have it.
- Source generators — C#-only; powerful compile-time code gen.
- Top-level statements — C# only.
- Nullable reference types — C# has compile-time null safety; Java relies on third-party annotations.

Java tends to lead on:
- Ecosystem breadth (more libraries, especially open-source).
- Big-data tooling (Spark, Flink, Kafka all JVM-native).
- Virtual threads now make Java's blocking-IO model very competitive.

Both languages run on excellent VMs (HotSpot vs CLR). Both are fast.

If you're already in one camp, stay. The grass isn't that much greener.

---

## Reading order

1. **New to C#?** `01_setup.md` → `02_language_basics.md` → `03_data_structures.md` → `04_oop.md`. Build a CLI. Then `06_linq_and_lambdas.md`.
2. **Web backend work?** Continue with `11_aspnet_core.md` → `10_databases_and_ef_core.md` → `07_async_and_concurrency.md` → `12_testing.md`.
3. **Game development?** `13_unity_game_dev.md` after the basics. Unity assumes baseline C#.
4. **Coming from Java?** Skim 02–04 fast (familiar). Focus on `06_linq_and_lambdas.md`, `07_async_and_concurrency.md` (different model from Java), nullable reference types in `05_generics_and_advanced_types.md`.
5. **Performance-sensitive code?** `14_runtime_and_performance.md` and the advanced sections of `15_modern_features_and_advanced.md`.

---

## The "C# way" of doing things

- **PascalCase** for types and public members. **camelCase** for parameters and locals. `_camelCase` for private fields (convention).
- **Properties over fields.** Public data is exposed via properties (`public int Count { get; }`).
- **Async by default** for I/O. Methods ending in `Async` returning `Task` / `Task<T>`.
- **Nullable annotations on.** `string?` for nullable; `string` for non-null.
- **LINQ everywhere.** Most data transformation uses LINQ syntax.
- **Dependency injection** is built into ASP.NET Core and most modern .NET frameworks.
- **`record` types** for immutable data.
- **Top-level statements** in Program.cs for entry points.
- **File-scoped namespaces** for less indentation.
- **`var`** is common for locals; explicit types for fields and parameters.

---

## What you won't find here

- **.NET Framework** (the old Windows-only .NET, pre-2016). Legacy; new code targets modern .NET.
- **WPF, WinForms** beyond brief mentions — desktop niche on Windows.
- **F#, Visual Basic** — separate languages on the same runtime.
- **Mono** — superseded by unified .NET.

---

## TL;DR: when C# fits

Pick C# in 2026 when:
- Microsoft / Azure ecosystem.
- Game development (Unity).
- Enterprise backend in a .NET shop.
- Team already C#-fluent.
- Need a great language with great tooling.

Pick something else when:
- Heavy Linux server work in a non-.NET shop.
- ML / data science → Python.
- Hyperscale microservices → Go.
- iOS / Android native → Swift / Kotlin.

Now: `01_setup.md`.
