# 13. Build Tools

> Maven and Gradle — dependency management, build lifecycles, plugins, multi-module projects.

---

## Table of Contents

1. [Maven vs Gradle](#1-maven-vs-gradle)
2. [Maven Basics](#2-maven-basics)
3. [Maven Dependencies](#3-maven-dependencies)
4. [Maven Plugins](#4-maven-plugins)
5. [Multi-Module Maven Projects](#5-multi-module-maven-projects)
6. [Gradle Basics](#6-gradle-basics)
7. [Gradle Dependencies](#7-gradle-dependencies)
8. [Multi-Module Gradle Projects](#8-multi-module-gradle-projects)
9. [Dependency Management Best Practices](#9-dependency-management-best-practices)
10. [Common Tasks](#10-common-tasks)

---

## 1. Maven vs Gradle

| | Maven | Gradle |
|---|---|---|
| Config | XML (`pom.xml`) | Groovy or Kotlin DSL |
| Style | Declarative | Imperative / declarative |
| Speed | Slower | Faster (incremental + cache) |
| Learning curve | Easier to start | Steeper for advanced use |
| IDE support | Excellent | Excellent |
| Adoption | Slight majority in enterprise Java | Standard for Android, growing elsewhere |

In 2026:
- **Maven**: enterprise backends, libraries, anywhere "boring is good."
- **Gradle**: Android, large monorepos, when build speed matters.

Both work fine. Most teams pick based on existing codebase or comfort.

---

## 2. Maven Basics

### `pom.xml` — the project descriptor
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>
    
    <name>my-app</name>
    <description>An example application</description>
    
    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <junit.version>5.11.0</junit.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${junit.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

### Coordinates
A dependency is identified by **groupId**, **artifactId**, and **version**.
- `groupId`: reverse-domain (`com.example`, `org.apache.kafka`).
- `artifactId`: project name (`my-app`, `kafka-clients`).
- `version`: SemVer-ish. `-SNAPSHOT` for dev versions.

### Build lifecycle phases
Run with `mvn <phase>`:
- `validate` — validate POM.
- `compile` — compile main sources to `target/classes/`.
- `test` — run unit tests.
- `package` — package into JAR/WAR.
- `verify` — run integration tests.
- `install` — install to local Maven repo (`~/.m2/repository`).
- `deploy` — deploy to remote repo.

Each phase implies prior ones: `mvn package` runs validate, compile, test, package.

### Common commands
```bash
mvn clean                     # delete target/
mvn compile                    # compile sources
mvn test                        # run tests
mvn package                     # build the JAR
mvn install                     # install to ~/.m2
mvn clean install               # clean + install (often used)
mvn -DskipTests install         # skip tests
mvn dependency:tree              # show dependency graph
mvn versions:display-dependency-updates    # show outdated deps
mvn versions:display-plugin-updates         # show outdated plugins
```

### The Maven wrapper (`./mvnw`)
Like Gradle's wrapper. Use:
```bash
mvn -N wrapper:wrapper      # generates ./mvnw
./mvnw clean install
```

Lets contributors run builds without installing Maven globally; pins the Maven version. Recommended for all projects.

### Local repository
Maven caches downloaded JARs at `~/.m2/repository/`. Reuse across all projects. Clean it occasionally to free space.

### Settings
`~/.m2/settings.xml` for global config — proxies, private repos, credentials:
```xml
<settings>
    <servers>
        <server>
            <id>my-private-repo</id>
            <username>${env.MAVEN_USERNAME}</username>
            <password>${env.MAVEN_PASSWORD}</password>
        </server>
    </servers>
</settings>
```

---

## 3. Maven Dependencies

### Adding a dependency
```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.18.2</version>
</dependency>
```

Find on [Maven Central](https://search.maven.org/) or [mvnrepository.com](https://mvnrepository.com/).

### Scopes
- `compile` (default) — available everywhere.
- `provided` — at compile but expected from container at runtime (e.g., Servlet API).
- `runtime` — not at compile (e.g., JDBC drivers).
- `test` — only for tests.
- `system` — local JAR (avoid).

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.7.4</version>
    <scope>runtime</scope>
</dependency>
```

### Transitive dependencies
A depends on B; B depends on C. By adding A, you automatically get C.

```bash
mvn dependency:tree
```

Shows the full graph.

### Excluding transitive dependencies
```xml
<dependency>
    <groupId>org.example</groupId>
    <artifactId>some-lib</artifactId>
    <version>1.0</version>
    <exclusions>
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

Used to swap implementations (e.g., replace `commons-logging` with `jcl-over-slf4j`).

### Dependency management
For coordinating versions across modules:
```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.fasterxml.jackson</groupId>
            <artifactId>jackson-bom</artifactId>
            <version>2.18.2</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <!-- No version — inherited from BOM -->
    </dependency>
</dependencies>
```

`<dependencyManagement>` declares versions but doesn't add deps. Child POMs (or `<dependencies>` below) use them without specifying versions.

### Spring Boot's parent POM
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.0</version>
</parent>
```

Inherits managed versions for all Spring Boot's known deps. The simplest pattern.

Without parent, use the BOM:
```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.4.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Equivalent versions, but you keep your own parent (or none).

### Version ranges (avoid)
Maven supports `[1.0,2.0)` etc. **Don't use them.** Builds become non-reproducible. Always pin specific versions.

### Dependency conflicts
When two deps want different versions of the same library, Maven uses "nearest wins" (the version closest in the dependency tree). Can cause surprises.

Diagnose:
```bash
mvn dependency:tree -Dverbose
```

Force a version with `<dependencyManagement>`.

---

## 4. Maven Plugins

Plugins add behavior to the build.

### Maven Compiler Plugin
```xml
<build>
    <plugins>
        <plugin>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.13.0</version>
            <configuration>
                <release>21</release>
            </configuration>
        </plugin>
    </plugins>
</build>
```

`<release>21</release>` is the modern way (vs `<source>` and `<target>`).

### Surefire (unit tests) and Failsafe (integration tests)
```xml
<plugin>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.5.2</version>
</plugin>
<plugin>
    <artifactId>maven-failsafe-plugin</artifactId>
    <version>3.5.2</version>
    <executions>
        <execution>
            <goals>
                <goal>integration-test</goal>
                <goal>verify</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

By convention:
- Surefire runs `*Test.java` files.
- Failsafe runs `*IT.java` files.

### Spring Boot Maven Plugin
For Spring Boot apps:
```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
</plugin>
```

Adds goals:
- `mvn spring-boot:run` — run the app.
- `mvn package` — creates an executable "fat jar" with all deps.

### Shade Plugin (uber JAR for non-Spring)
```xml
<plugin>
    <artifactId>maven-shade-plugin</artifactId>
    <version>3.6.0</version>
    <executions>
        <execution>
            <phase>package</phase>
            <goals><goal>shade</goal></goals>
            <configuration>
                <transformers>
                    <transformer implementation="...ManifestResourceTransformer">
                        <mainClass>com.example.App</mainClass>
                    </transformer>
                </transformers>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Versions Plugin
```bash
mvn versions:display-dependency-updates
mvn versions:display-plugin-updates
mvn versions:use-latest-releases
```

Helps keep deps current. Be careful with auto-update.

### Enforcer Plugin
Lock down what your project allows:
```xml
<plugin>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireMavenVersion><version>3.9.0</version></requireMavenVersion>
                    <requireJavaVersion><version>21</version></requireJavaVersion>
                    <dependencyConvergence/>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

`dependencyConvergence` fails the build if transitive deps disagree on versions.

### JaCoCo (code coverage)
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
</plugin>
```

Coverage report at `target/site/jacoco/index.html`.

---

## 5. Multi-Module Maven Projects

For larger codebases split into modules.

### Parent POM
```xml
<!-- parent/pom.xml -->
<project>
    <groupId>com.example</groupId>
    <artifactId>my-project</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>
    
    <modules>
        <module>common</module>
        <module>api</module>
        <module>web</module>
    </modules>
    
    <properties>
        <maven.compiler.release>21</maven.compiler.release>
    </properties>
    
    <dependencyManagement>
        <dependencies>
            <!-- shared versions for child modules -->
        </dependencies>
    </dependencyManagement>
</project>
```

### Child module POM
```xml
<!-- common/pom.xml -->
<project>
    <parent>
        <groupId>com.example</groupId>
        <artifactId>my-project</artifactId>
        <version>1.0.0</version>
    </parent>
    
    <artifactId>common</artifactId>
    <packaging>jar</packaging>
</project>
```

Inherits properties, dependency versions, plugin config.

### Inter-module dependency
```xml
<!-- web/pom.xml -->
<dependencies>
    <dependency>
        <groupId>com.example</groupId>
        <artifactId>common</artifactId>
        <version>${project.version}</version>
    </dependency>
</dependencies>
```

### Building
```bash
mvn install         # builds all modules in dependency order
mvn install -pl web -am   # build only "web" and its dependencies
```

### When to split into modules
- Different deployment artifacts (web, batch job, CLI).
- Reusable libraries shared by multiple top-level projects.
- Different release cadences.

Don't split prematurely — single module is simpler. Split when there's a clear reason.

---

## 6. Gradle Basics

Gradle uses Groovy or Kotlin DSL. Kotlin DSL is preferred in 2026 — type-safe, better IDE support.

### `build.gradle.kts` (Kotlin DSL)
```kotlin
plugins {
    java
    application
    id("org.springframework.boot") version "3.4.0"
}

group = "com.example"
version = "1.0.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

application {
    mainClass = "com.example.AppKt"
}

tasks.test {
    useJUnitPlatform()
}
```

### `settings.gradle.kts`
```kotlin
rootProject.name = "my-app"
```

For multi-module:
```kotlin
include("common", "api", "web")
```

### Common commands
```bash
./gradlew clean              # delete build/
./gradlew compileJava         # compile sources
./gradlew test                 # run tests
./gradlew build                 # full build
./gradlew bootRun                # run a Spring Boot app
./gradlew dependencies            # show dependency graph
./gradlew tasks                    # list all tasks
./gradlew --refresh-dependencies  # force re-download
```

### Gradle wrapper (`./gradlew`)
Always commit and use. Pins Gradle version for the project.

Generated via:
```bash
gradle wrapper --gradle-version 8.10
```

### Configurations (dependency scopes)
- `implementation` — at compile and runtime (default).
- `api` — at compile + runtime + exposed to consumers (for libraries).
- `runtimeOnly` — at runtime only (JDBC driver, logging impl).
- `compileOnly` — at compile only (Lombok, annotations).
- `testImplementation` — for tests.
- `testRuntimeOnly` — runtime only for tests.

```kotlin
dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.2")
    runtimeOnly("org.postgresql:postgresql:42.7.4")
    compileOnly("org.projectlombok:lombok:1.18.34")
    annotationProcessor("org.projectlombok:lombok:1.18.34")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.0")
}
```

### `implementation` vs `api`
- `implementation` — your project uses the dep, but consumers don't see it. Faster builds, better encapsulation.
- `api` — the dep is part of your public API. Consumers automatically get it.

Default to `implementation` unless you genuinely export the type.

### Repositories
```kotlin
repositories {
    mavenCentral()              // standard public repo
    google()                     // for Android deps
    gradlePluginPortal()          // for plugins
    maven {                       // custom
        url = uri("https://my-repo.example.com/maven")
        credentials { ... }
    }
}
```

---

## 7. Gradle Dependencies

### Version catalogs (recommended)
`gradle/libs.versions.toml`:
```toml
[versions]
junit = "5.11.0"
jackson = "2.18.2"
spring-boot = "3.4.0"

[libraries]
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter", version.ref = "junit" }
jackson-databind = { module = "com.fasterxml.jackson.core:jackson-databind", version.ref = "jackson" }
postgresql = "org.postgresql:postgresql:42.7.4"

[bundles]
jackson = ["jackson-databind", "jackson-core"]

[plugins]
spring-boot = { id = "org.springframework.boot", version.ref = "spring-boot" }
```

`build.gradle.kts`:
```kotlin
plugins {
    alias(libs.plugins.spring.boot)
}

dependencies {
    implementation(libs.jackson.databind)
    runtimeOnly(libs.postgresql)
    testImplementation(libs.junit.jupiter)
}
```

Type-safe, IDE-aware, single source of truth for versions.

### BOMs
```kotlin
dependencies {
    implementation(platform("org.springframework.boot:spring-boot-dependencies:3.4.0"))
    implementation("org.springframework.boot:spring-boot-starter-web")    // version managed by BOM
}
```

### Exclude transitive dep
```kotlin
dependencies {
    implementation("org.example:lib:1.0") {
        exclude(group = "commons-logging", module = "commons-logging")
    }
}
```

### Resolution strategy
```kotlin
configurations.all {
    resolutionStrategy {
        force("com.fasterxml.jackson.core:jackson-databind:2.18.2")
        // Cache invalidation
        cacheChangingModulesFor(0, "seconds")
    }
}
```

---

## 8. Multi-Module Gradle Projects

`settings.gradle.kts`:
```kotlin
rootProject.name = "my-project"
include("common", "api", "web")
```

### Project layout
```
my-project/
├── settings.gradle.kts
├── build.gradle.kts             # root build (often shared config)
├── common/
│   └── build.gradle.kts
├── api/
│   └── build.gradle.kts
└── web/
    └── build.gradle.kts
```

### Shared config via convention plugins
```
buildSrc/
├── build.gradle.kts
└── src/main/kotlin/
    └── my-project.java-conventions.gradle.kts
```

```kotlin
// my-project.java-conventions.gradle.kts
plugins {
    java
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

tasks.test {
    useJUnitPlatform()
}
```

```kotlin
// common/build.gradle.kts
plugins {
    id("my-project.java-conventions")
}

dependencies {
    // ...
}
```

### Inter-module dependency
```kotlin
// web/build.gradle.kts
dependencies {
    implementation(project(":common"))
}
```

### Building
```bash
./gradlew build                    # builds all
./gradlew :web:build                # builds only web
./gradlew :web:test                  # tests only web
```

### Composite builds
For monorepos where some "modules" are actually independent projects:
```kotlin
// settings.gradle.kts
includeBuild("../shared-library")

// Reference
dependencies {
    implementation("com.example:shared-library")
}
```

Useful when developing a library alongside the main app.

---

## 9. Dependency Management Best Practices

### Pin versions
Always specify exact versions. No ranges. Reproducible builds matter.

### Use BOMs
Spring Boot BOM, Jackson BOM, etc. Manage versions in one place; deps consistent.

### Update regularly
- **Dependabot** (GitHub) — auto-PRs for updates.
- **Renovate** — more configurable alternative.
- Run a security scan in CI.

Outdated deps accumulate vulnerabilities and integration debt.

### Audit deps
```bash
# Maven
mvn org.owasp:dependency-check-maven:check

# Gradle
./gradlew dependencyCheckAnalyze
```

OWASP Dependency-Check scans for CVEs. Run in CI.

### Pin transitive deps you care about
Use `<dependencyManagement>` / `force()` for critical deps to avoid sneaky transitive changes.

### Minimize dependencies
Each dep:
- Increases attack surface.
- Adds compile time and JAR size.
- Adds maintenance burden.

Before adding a dep, ask: "Can the standard library do this in 20 lines?"

### Common mistakes
- **Adding many overlapping libraries** (Apache Commons + Guava + Vavr for the same problem).
- **Heavy deps for simple tasks** (Lombok for one class, full Apache HttpClient for one HTTP call).
- **Unused deps** — clean periodically with `mvn dependency:analyze` or `./gradlew dependencyInsight`.

### Internal artifact repos
For private code:
- Nexus or Artifactory for self-hosted.
- GitHub Packages, GitLab Packages for cloud.
- Maven Central (for OSS publishing).

---

## 10. Common Tasks

### Add a new dependency
```bash
# Search on Maven Central or mvnrepository.com for coordinates
# Add to pom.xml or build.gradle.kts
# Run mvn install / ./gradlew build to verify it resolves
```

### Update a dependency
1. Change the version in one place (`<properties>`, `libs.versions.toml`, BOM).
2. Rebuild.
3. Run tests.
4. Read release notes for breaking changes.

### Add a plugin
**Maven**:
```xml
<plugin>
    <groupId>...</groupId>
    <artifactId>...</artifactId>
    <version>...</version>
</plugin>
```

**Gradle**:
```kotlin
plugins {
    id("plugin-name") version "1.0"
}
```

### Build an executable JAR
**Maven** with Spring Boot:
```bash
mvn package
java -jar target/my-app-1.0.0.jar
```

**Gradle** with Spring Boot:
```bash
./gradlew bootJar
java -jar build/libs/my-app-1.0.0.jar
```

### Find dependency conflicts
```bash
mvn dependency:tree
./gradlew dependencies
./gradlew dependencyInsight --dependency commons-lang3
```

### Skip tests
```bash
mvn -DskipTests install
./gradlew build -x test
```

Use sparingly — only when you've verified separately.

### Increase memory
For builds requiring more heap:
```bash
export MAVEN_OPTS="-Xmx2g"
export GRADLE_OPTS="-Xmx2g"
```

Or in `~/.gradle/gradle.properties`:
```
org.gradle.jvmargs=-Xmx2g
```

### Faster Gradle builds
```properties
# gradle.properties
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.daemon=true
org.gradle.configuration-cache=true
```

Significant speedup for incremental builds.

### Releasing a library
- Pick a version (`1.2.3`, no `-SNAPSHOT`).
- Build artifacts.
- Sign with PGP.
- Upload to repo (Maven Central via Sonatype, GitHub Packages, internal Nexus).

Manual process; tools like **JReleaser** automate it.

### Native compilation (GraalVM)
Spring Boot 3+:
```bash
mvn -Pnative native:compile
./gradlew nativeCompile
```

Produces a native executable. Fast startup, low memory. Covered more in `14_jvm_and_performance.md`.

### Docker builds
Use `spring-boot:build-image` or `bootBuildImage`:
```bash
mvn spring-boot:build-image
./gradlew bootBuildImage
```

Produces an OCI image without writing a Dockerfile. Uses Cloud Native Buildpacks.

### CI/CD basics
GitHub Actions workflow:
```yaml
name: Build
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
          cache: maven    # or 'gradle'
      - run: ./mvnw verify
```

For Gradle: `cache: gradle`, run `./gradlew build`.

---

That's build tooling. Pick Maven or Gradle, keep your wrapper checked in, manage deps via BOMs / version catalogs, automate updates with Dependabot, audit security with OWASP.

Next: how the JVM actually runs your code — `14_jvm_and_performance.md`.
