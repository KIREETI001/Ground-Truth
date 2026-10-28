# 01. Setup

> Installing .NET, choosing an IDE, project structure, and the `dotnet` CLI.

---

## Table of Contents

1. [Installing .NET](#1-installing-net)
2. [Verifying the Install](#2-verifying-the-install)
3. [The `dotnet` CLI](#3-the-dotnet-cli)
4. [IDE Setup](#4-ide-setup)
5. [Project Structure](#5-project-structure)
6. [Hello World](#6-hello-world)
7. [NuGet Packages](#7-nuget-packages)
8. [Managing Multiple .NET Versions](#8-managing-multiple-net-versions)

---

## 1. Installing .NET

The .NET SDK includes the compiler, runtime, and the `dotnet` CLI.

### Recommended: official installer
**Windows / macOS / Linux** — download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download).

Choose the **.NET SDK** (not just runtime).

**macOS** (Homebrew):
```bash
brew install --cask dotnet-sdk
```

**Windows** (winget):
```bash
winget install Microsoft.DotNet.SDK.10
```

**Linux** (Ubuntu/Debian):
```bash
sudo apt install -y dotnet-sdk-10.0
```

### Which version to install
- **.NET 10 SDK** (current LTS in 2026) — the default for new projects.
- **.NET 8 SDK** — still supported through Nov 2026; install if maintaining existing apps.

The SDK is forward-compatible: installing .NET 10 SDK lets you build for older runtimes too.

---

## 2. Verifying the Install

```bash
dotnet --version
# 10.0.100

dotnet --list-sdks
# Lists all installed SDKs

dotnet --list-runtimes
# Lists installed runtimes (App, ASP.NET, Desktop)
```

If `dotnet` isn't found, the installer likely didn't update your PATH — restart your terminal or add manually.

### SDK vs runtime
- **SDK** — development tools (`dotnet build`, `dotnet new`, etc.).
- **Runtime** — needed to *run* compiled apps. The SDK includes runtimes.

For production deployment, you can install just the runtime. For development, install the SDK.

---

## 3. The `dotnet` CLI

The Swiss Army knife of .NET development.

### Creating projects
```bash
dotnet new console -n MyApp           # console app
dotnet new web -n MyApi                # ASP.NET Core minimal web app
dotnet new webapi -n MyApi             # ASP.NET Core Web API
dotnet new mvc -n MyMvcApp              # ASP.NET Core MVC
dotnet new blazor -n MyBlazor           # Blazor
dotnet new mauiapp -n MyMaui             # MAUI cross-platform
dotnet new classlib -n MyLib             # class library
dotnet new xunit -n MyTests              # xUnit test project
dotnet new sln -n MySolution             # solution file
dotnet new gitignore                      # .gitignore for .NET
```

List all templates:
```bash
dotnet new --list
```

### Building and running
```bash
dotnet build                              # compile
dotnet run                                  # build + run
dotnet run --project ./MyApp               # run a specific project
dotnet test                                  # run tests
dotnet publish -c Release                    # publish for deployment
dotnet publish -c Release -r linux-x64 --self-contained    # standalone binary
```

### Packages
```bash
dotnet add package Newtonsoft.Json          # add NuGet package
dotnet add package Serilog --version 4.0.0
dotnet remove package SomePackage
dotnet list package                          # show installed packages
dotnet restore                                # restore packages (also done by build)
```

### Solutions and projects
```bash
dotnet new sln                                # create a solution
dotnet sln add ./MyApp/MyApp.csproj           # add project to solution
dotnet sln remove ./MyApp/MyApp.csproj
dotnet sln list                               # list projects in solution

# Project references (one project depending on another)
dotnet add ./MyApp/MyApp.csproj reference ./MyLib/MyLib.csproj
```

### Tools (CLI tools installed via NuGet)
```bash
dotnet tool install --global dotnet-ef        # EF Core CLI
dotnet tool install --global dotnet-format
dotnet tool list --global
dotnet tool update --global dotnet-ef
```

### Project info
```bash
dotnet --info                                  # full .NET info
dotnet --list-sdks
dotnet --list-runtimes
```

### Watch (auto-rebuild)
```bash
dotnet watch run                                # rebuild + restart on file change
dotnet watch test                                # auto-rerun tests
```

Equivalent to nodemon for Node — invaluable for development.

---

## 4. IDE Setup

### Visual Studio (Windows / macOS)
The traditional flagship. Free Community Edition is fully featured for individual / small team / open-source / academic use.

**Strengths**:
- Industry-leading debugger.
- Comprehensive refactoring.
- Profiling, diagnostics, Live Share.
- Strong ASP.NET Core / Azure integration.

**Editions**:
- Community — free for individuals, small teams, OSS.
- Professional — paid.
- Enterprise — high-end paid.

Mac version was discontinued in 2024 — Mac users should use Rider or VS Code.

### JetBrains Rider — recommended cross-platform
Paid, but excellent. Works on Windows, macOS, Linux.

**Strengths**:
- Polished IDE experience.
- Best refactoring tooling.
- Cross-platform.
- Excellent Unity integration.
- Unified across JetBrains' ecosystem.

For Mac users / Linux users / paid customers: Rider is usually the best choice in 2026.

### VS Code with C# Dev Kit
Free, lightweight, cross-platform.

Install:
- [C# extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp) (basic syntax/IntelliSense).
- [C# Dev Kit](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csdevkit) (solution explorer, test runner, refactoring).

C# Dev Kit is **free for individual / OSS use** but requires a Visual Studio subscription for organizations >$1M revenue.

VS Code is fine for small projects, scripts, and learning. For serious work, Rider or Visual Studio do more.

### My recommendation
- **Free + cross-platform**: VS Code + C# Dev Kit.
- **Best DX**: Rider.
- **Windows-only, Microsoft-shop**: Visual Studio (Community is free).
- **Unity development**: Rider or Visual Studio.

---

## 5. Project Structure

A typical .NET project has:
- **`.csproj`** — project file (XML, MSBuild format).
- **`.sln`** — solution file (groups multiple projects).
- **`Program.cs`** — entry point.
- **`bin/`** — compiled output.
- **`obj/`** — intermediate build files.

### Single project layout
```
MyApp/
├── MyApp.csproj
├── Program.cs
├── appsettings.json              # for ASP.NET Core
├── appsettings.Development.json
└── bin/
    └── Debug/
        └── net10.0/
            └── MyApp.dll
```

### Solution with multiple projects
```
MyProject/
├── MyProject.sln
├── src/
│   ├── MyApp/
│   │   ├── MyApp.csproj
│   │   └── Program.cs
│   ├── MyApp.Core/
│   │   ├── MyApp.Core.csproj
│   │   └── Models.cs
│   └── MyApp.Infrastructure/
│       ├── MyApp.Infrastructure.csproj
│       └── DbContext.cs
└── tests/
    └── MyApp.Tests/
        ├── MyApp.Tests.csproj
        └── UnitTests.cs
```

### `.csproj` anatomy
```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <OutputType>Exe</OutputType>
        <TargetFramework>net10.0</TargetFramework>
        <Nullable>enable</Nullable>
        <ImplicitUsings>enable</ImplicitUsings>
        <LangVersion>latest</LangVersion>
        <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Serilog" Version="4.0.0" />
        <PackageReference Include="Microsoft.Extensions.Hosting" Version="10.0.0" />
    </ItemGroup>

    <ItemGroup>
        <ProjectReference Include="..\MyApp.Core\MyApp.Core.csproj" />
    </ItemGroup>
</Project>
```

Key properties:
- **`Sdk`** — `Microsoft.NET.Sdk` for libraries / console apps; `Microsoft.NET.Sdk.Web` for ASP.NET Core.
- **`TargetFramework`** — `net10.0`, `net8.0`, etc.
- **`Nullable`** — enable nullable reference types (recommended).
- **`ImplicitUsings`** — auto-import common namespaces.
- **`LangVersion`** — C# language version.

### `appsettings.json`
Configuration for ASP.NET Core apps:
```json
{
    "Logging": {
        "LogLevel": {
            "Default": "Information"
        }
    },
    "ConnectionStrings": {
        "Default": "Host=localhost;Database=mydb;Username=postgres;Password=secret"
    }
}
```

Environment-specific overrides: `appsettings.Development.json`, `appsettings.Production.json`. Loaded based on `ASPNETCORE_ENVIRONMENT`.

### `Directory.Build.props` (shared settings)
For multi-project repos, put common properties in a `Directory.Build.props` at the root:
```xml
<Project>
    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <Nullable>enable</Nullable>
        <ImplicitUsings>enable</ImplicitUsings>
        <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    </PropertyGroup>
</Project>
```

Each `.csproj` inherits automatically.

### `global.json` (SDK version pinning)
```json
{
    "sdk": {
        "version": "10.0.100",
        "rollForward": "latestFeature"
    }
}
```

Pins the SDK version for the directory. Commit this so contributors use the same SDK.

---

## 6. Hello World

### Console app
```bash
dotnet new console -n HelloWorld
cd HelloWorld
```

Generated `Program.cs`:
```csharp
Console.WriteLine("Hello, World!");
```

Just one line. C# now supports **top-level statements** — no `class` / `Main` boilerplate needed.

Run:
```bash
dotnet run
# Hello, World!
```

### With more structure
For a larger console app:
```csharp
// Program.cs
using HelloWorld;

var greeter = new Greeter();
greeter.SayHi("Alice");

// Greeter.cs
namespace HelloWorld;

public class Greeter
{
    public void SayHi(string name)
    {
        Console.WriteLine($"Hello, {name}!");
    }
}
```

### Web API
```bash
dotnet new web -n MyApi
cd MyApi
```

```csharp
// Program.cs (Minimal API)
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello, World!");
app.MapGet("/users/{id}", (int id) => new { id, name = "Alice" });

app.Run();
```

Run:
```bash
dotnet run
# Listening on http://localhost:5000
```

### Class library
```bash
dotnet new classlib -n MyLib
```

Generates `Class1.cs`. Build with `dotnet build` to produce a DLL.

---

## 7. NuGet Packages

NuGet is the .NET package registry. Like Maven Central or npm.

### Adding packages
```bash
dotnet add package Newtonsoft.Json                # latest
dotnet add package Serilog --version 4.0.0        # specific version
dotnet add package SomeLib --version 2.* # version range
```

Updates the `.csproj`:
```xml
<ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
</ItemGroup>
```

### Finding packages
- [nuget.org](https://www.nuget.org/) — official registry.
- In Visual Studio / Rider: built-in NuGet package manager.
- Or just search; popular packages have great docs.

### Common packages

| Need | Package |
|---|---|
| JSON | `System.Text.Json` (built-in) or `Newtonsoft.Json` |
| HTTP client | `System.Net.Http` (built-in) |
| Logging | `Serilog`, `Microsoft.Extensions.Logging` |
| Validation | `FluentValidation` |
| Mapping objects | `AutoMapper`, `Mapster` |
| Database (ORM) | `Microsoft.EntityFrameworkCore`, `Dapper` |
| Testing | `xUnit`, `NUnit`, `FluentAssertions`, `Moq` |
| Date/time | `NodaTime` for more powerful date handling |
| HTTP server | `Microsoft.AspNetCore.App` (in `Microsoft.NET.Sdk.Web`) |

### Restoring packages
```bash
dotnet restore                # download all packages from .csproj
```

Done automatically by `dotnet build`.

### Lock files
.NET supports lock files for reproducible builds:
```xml
<PropertyGroup>
    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
</PropertyGroup>
```

Generates `packages.lock.json`. Commit it.

### Package sources
By default, `https://api.nuget.org/v3/index.json`. Custom sources via `nuget.config`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
    <packageSources>
        <add key="nuget" value="https://api.nuget.org/v3/index.json" />
        <add key="my-private" value="https://my-feed.example.com/v3/index.json" />
    </packageSources>
</configuration>
```

For private / corporate feeds.

---

## 8. Managing Multiple .NET Versions

### Multiple SDKs installed
Just install them — they coexist. The SDK selected for a project is determined by:
1. `global.json` in the project root or above.
2. The latest installed SDK if no `global.json`.

### Target framework
Different from SDK — this is what runtime your code targets:
```xml
<TargetFramework>net10.0</TargetFramework>
<TargetFrameworks>net8.0;net10.0</TargetFrameworks>     <!-- multi-target -->
```

### `dotnet-install` script
For installing SDK versions in CI / scripts:
```bash
# Linux/macOS
curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0

# Windows PowerShell
& ([scriptblock]::Create((Invoke-WebRequest -UseBasicParsing 'https://dot.net/v1/dotnet-install.ps1'))) -Channel 10.0
```

### Uninstalling old versions
On Windows: Programs & Features. On macOS/Linux: removed via package manager or `dotnet-uninstall` tool.

---

You're set up. Next: the language itself — `02_language_basics.md`.
