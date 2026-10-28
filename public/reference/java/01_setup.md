# 01. Setup

> Installing a JDK, choosing build tools, IDE setup, project structure, and writing your first program.

---

## Table of Contents

1. [Installing a JDK](#1-installing-a-jdk)
2. [Verifying the Install](#2-verifying-the-install)
3. [Choosing a Build Tool](#3-choosing-a-build-tool)
4. [IDE Setup](#4-ide-setup)
5. [Project Structure](#5-project-structure)
6. [Hello World](#6-hello-world)
7. [Running and Packaging](#7-running-and-packaging)
8. [Managing Multiple JDK Versions](#8-managing-multiple-jdk-versions)

---

## 1. Installing a JDK

The JDK (Java Development Kit) includes the compiler (`javac`), runtime (`java`), and standard library.

### Recommended: Eclipse Temurin (OpenJDK)
Free, open-source, well-tested. Maintained by the Eclipse Adoptium project.

**macOS** (with Homebrew):
```bash
brew install --cask temurin@21
```

**Windows**: download MSI from [adoptium.net](https://adoptium.net/).

**Linux** (Ubuntu/Debian):
```bash
sudo apt install openjdk-21-jdk
```

Or download from adoptium.net for any platform.

### Alternative: SDKMAN! (recommended for managing multiple versions)
```bash
curl -s "https://get.sdkman.io" | bash

sdk list java               # see available versions
sdk install java 21.0.5-tem  # install Temurin 21
sdk use java 21.0.5-tem      # switch versions for current shell
sdk default java 21.0.5-tem  # set as default
```

### Other JDK distributions
- **Oracle JDK** — official, requires commercial license for some uses.
- **Amazon Corretto** — Amazon's free build.
- **Azul Zulu** — another free OpenJDK build.
- **GraalVM** — includes native-image, polyglot runtime. For AOT compilation.

All are interchangeable for most code. Pick Temurin unless you have a specific reason.

---

## 2. Verifying the Install

```bash
java --version
# openjdk 21.0.5 2024-10-15 LTS

javac --version
# javac 21.0.5
```

`java` is the runtime; `javac` is the compiler. Both should be present.

### Setting `JAVA_HOME`
Some tools need `JAVA_HOME` pointing to the JDK install directory.

**macOS/Linux** (in `~/.zshrc` or `~/.bashrc`):
```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"   # macOS
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64  # Linux
export PATH="$JAVA_HOME/bin:$PATH"
```

**Windows**: set `JAVA_HOME` in System Environment Variables.

SDKMAN! handles this automatically.

---

## 3. Choosing a Build Tool

Almost every real Java project uses one. Three options:

### Maven
The dominant choice. XML-based, conventions-driven.
- Wide adoption, extensive plugin ecosystem.
- Verbose but very predictable.
- `pom.xml` is the project descriptor.

```bash
# Install via your package manager or download from maven.apache.org
brew install maven           # macOS
sdk install maven             # SDKMAN!

mvn --version
```

### Gradle
Modern alternative. Groovy or Kotlin DSL.
- Faster builds than Maven (incremental).
- More flexible / programmable.
- More complex when things go wrong.

```bash
brew install gradle           # macOS
sdk install gradle             # SDKMAN!

gradle --version
```

### `javac` directly (don't, for real projects)
For tiny scripts:
```bash
javac Hello.java
java Hello
```

But you'll quickly want dependency management. Skip to Maven/Gradle for anything substantial.

### Which to pick
- **Maven** if you're new and want the boring, well-documented choice.
- **Gradle** if you're on Android (the standard there) or want faster builds.
- **Maven** is overwhelmingly more common in enterprise Java backends.

For learning, **Maven** is the safer first stop. Most tutorials use it.

### Build tool details
Full coverage in `13_build_tools.md`.

---

## 4. IDE Setup

Java IDEs are unusually good. The IDE does more for you than in most languages.

### IntelliJ IDEA — recommended
The de facto standard. Two editions:
- **Community Edition** — free, sufficient for plain Java.
- **Ultimate** — paid; adds Spring support, database tools, framework integration, profiling. Worth it for enterprise work.

Download: [jetbrains.com/idea](https://www.jetbrains.com/idea/).

**Key features**:
- Excellent code completion + refactoring.
- Built-in debugger, profiler, version control, terminal.
- Maven/Gradle integration.
- Spring + Spring Boot dashboard (Ultimate).
- Inline error messages, quick fixes.

### Eclipse
Long-standing alternative. Free, open-source. Slower-feeling than IntelliJ; still common in some shops.

### VS Code with Java extensions
[Extension Pack for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack) adds Java support to VS Code:
- Language Support for Java by Red Hat.
- Debugger for Java.
- Test Runner for Java.
- Maven for Java.
- Spring Boot Tools.

Lighter than IntelliJ, less powerful, fine for scripting / small projects.

### NetBeans
Apache project, mature, declining adoption. Skip for new projects.

### My recommendation
- **IntelliJ Community** for learning and small projects.
- **IntelliJ Ultimate** if your company pays for it.
- **VS Code** if you're already there for other languages.

---

## 5. Project Structure

Maven's **Standard Directory Layout** is the convention. Most Gradle projects follow it too.

```
my-app/
├── pom.xml                          # Maven project file
├── src/
│   ├── main/
│   │   ├── java/                    # Production source
│   │   │   └── com/example/app/
│   │   │       └── App.java
│   │   └── resources/                # Config files, templates, static assets
│   │       └── application.yml
│   └── test/
│       ├── java/                     # Test source
│       │   └── com/example/app/
│       │       └── AppTest.java
│       └── resources/                # Test resources
└── target/                            # Build output (Maven)
    ├── classes/
    └── my-app-1.0.0.jar
```

For Gradle, replace `target/` with `build/` and `pom.xml` with `build.gradle` or `build.gradle.kts`.

### Package naming
Reverse-domain convention:
- `com.acmecorp.shoppingcart` — products from Acme Corp.
- `org.apache.kafka` — Apache Foundation.
- `io.github.username.project` — personal/GitHub projects.

Package directory structure mirrors the name:
```
src/main/java/com/example/app/users/UserService.java
```

defines:
```java
package com.example.app.users;
public class UserService { ... }
```

The filename **must** match the public class name (case-sensitive). `UserService.java` → `class UserService`.

---

## 6. Hello World

### With `javac` (no build tool)
Create `Hello.java`:
```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

```bash
javac Hello.java       # produces Hello.class
java Hello              # runs it
# Hello, World!
```

The class with `main(String[] args)` is the entry point. Note the file name matches the class name.

### Single-file execution (Java 11+)
```bash
java Hello.java         # compile and run in one step
```

### With Maven
Generate a new project:
```bash
mvn archetype:generate \
    -DgroupId=com.example \
    -DartifactId=my-app \
    -DarchetypeArtifactId=maven-archetype-quickstart \
    -DarchetypeVersion=1.4 \
    -DinteractiveMode=false

cd my-app
```

Edit `pom.xml` to use modern Java:
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.11.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

Edit `src/main/java/com/example/App.java`:
```java
package com.example;

public class App {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

Build and run:
```bash
mvn compile             # compile source
mvn exec:java -Dexec.mainClass="com.example.App"
mvn package              # produce JAR in target/
java -cp target/my-app-1.0-SNAPSHOT.jar com.example.App
```

### With Gradle
```bash
gradle init --type java-application --dsl kotlin --java-version 21
```

Answer prompts. You get a working project. Run:
```bash
./gradlew run
```

The `./gradlew` wrapper script downloads and uses the right Gradle version, so contributors don't need Gradle installed globally.

### With Spring Boot (via Spring Initializr)
Most real Java work starts here:
```bash
# Visit https://start.spring.io
# Or use the CLI:
curl https://start.spring.io/starter.zip \
    -d type=maven-project \
    -d language=java \
    -d bootVersion=3.4.0 \
    -d baseDir=my-app \
    -d groupId=com.example \
    -d artifactId=my-app \
    -d javaVersion=21 \
    -d dependencies=web,data-jpa \
    -o my-app.zip
unzip my-app.zip
cd my-app
./mvnw spring-boot:run
```

Spring Initializr generates a complete project with chosen dependencies. The default for any Spring Boot project.

---

## 7. Running and Packaging

### Running compiled code
```bash
java -cp <classpath> <main-class>
java -cp target/classes com.example.App
java -jar target/my-app.jar          # if jar has Main-Class in manifest
```

### Classpath
The classpath is the set of directories and JARs Java searches for classes:
```bash
java -cp "lib/*:target/classes" com.example.App   # POSIX
java -cp "lib/*;target/classes" com.example.App   # Windows (semicolon)
```

Maven/Gradle handle this for you.

### JARs
A JAR is a zip file with `.class` files and a manifest.
```bash
jar cvf app.jar -C target/classes .                              # create
jar cvfe app.jar com.example.App -C target/classes .             # with main class
jar tvf app.jar                                                    # list contents
unzip -l app.jar                                                    # same thing
```

### Executable JAR (with `java -jar`)
The manifest (`META-INF/MANIFEST.MF`) needs a `Main-Class` entry:
```
Manifest-Version: 1.0
Main-Class: com.example.App
```

Maven `maven-jar-plugin` or Spring Boot's `spring-boot-maven-plugin` does this. With Spring Boot:
```bash
mvn package
java -jar target/my-app-0.0.1-SNAPSHOT.jar
```

### Fat (uber) JAR
A JAR including all dependencies — runnable anywhere a JVM is installed.
- **Spring Boot**: built-in. `spring-boot-maven-plugin` produces a runnable JAR.
- **Maven Shade Plugin**: bundles dependencies into one JAR.
- **Gradle Shadow Plugin**: same for Gradle.

### Running tests
```bash
mvn test                  # Maven
gradle test                # Gradle
```

Both find tests in `src/test/java` automatically.

---

## 8. Managing Multiple JDK Versions

You'll occasionally need to switch JDKs — supporting an older codebase, trying a newer language feature, etc.

### SDKMAN!
The cleanest tool for the job.
```bash
sdk list java
sdk install java 21.0.5-tem
sdk install java 17.0.13-tem
sdk use java 17.0.13-tem        # current shell only
sdk default java 21.0.5-tem      # default
sdk current                       # what's active
```

### jenv
Alternative on macOS/Linux:
```bash
brew install jenv
jenv add /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
jenv versions
jenv global 21
jenv local 17     # per-directory via .java-version file
```

### IDE-managed
IntelliJ lets you set the JDK per project — File → Project Structure → Project SDK. CI runs use your CI's Java config.

### Why multiple versions matter
- Legacy projects pinned to Java 8/11/17.
- Library compatibility may lag.
- New language features need the right `--release` flag.
- Native-image (GraalVM) is a separate JDK distribution entirely.

For most personal work: install Temurin 21 (or 25). Add others as needed.

---

You're set up. Next, the language itself — `02_language_basics.md`.
