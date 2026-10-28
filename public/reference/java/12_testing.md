# 12. Testing

> JUnit 5, Mockito, AssertJ, Spring Boot testing, Testcontainers. How modern Java projects test.

---

## Table of Contents

1. [The Testing Stack](#1-the-testing-stack)
2. [JUnit 5 Basics](#2-junit-5-basics)
3. [AssertJ — Fluent Assertions](#3-assertj--fluent-assertions)
4. [Mockito — Mocking](#4-mockito--mocking)
5. [Parameterized Tests](#5-parameterized-tests)
6. [Lifecycle and Setup](#6-lifecycle-and-setup)
7. [Spring Boot Testing](#7-spring-boot-testing)
8. [Testcontainers](#8-testcontainers)
9. [Test Organization](#9-test-organization)
10. [Best Practices and Pitfalls](#10-best-practices-and-pitfalls)

---

## 1. The Testing Stack

Modern Java testing in 2026:
- **JUnit 5** (aka Jupiter) — the test framework.
- **AssertJ** — fluent assertions, much better than JUnit's built-in.
- **Mockito** — mocking. Mockito 5+ supports inline mocking of finals.
- **Testcontainers** — real services (DB, Kafka, Redis) in Docker for integration tests.
- **WireMock** — HTTP mock server.
- **Awaitility** — async / eventual assertions.

Spring Boot Starter bundles JUnit 5, AssertJ, Mockito, and Spring Test:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 2. JUnit 5 Basics

```java
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class CalculatorTest {
    @Test
    void adds() {
        Calculator c = new Calculator();
        assertThat(c.add(2, 3)).isEqualTo(5);
    }
    
    @Test
    void throwsOnDivideByZero() {
        Calculator c = new Calculator();
        assertThatThrownBy(() -> c.divide(10, 0))
            .isInstanceOf(ArithmeticException.class);
    }
}
```

### Annotations
- `@Test` — a test method.
- `@DisplayName("descriptive name")` — alternative to long method names.
- `@Disabled("why")` — skip a test.
- `@Tag("integration")` — group tests for selective running.
- `@RepeatedTest(5)` — run multiple times (for flaky tests, mostly).
- `@Timeout(5)` — fail if takes longer than 5 seconds.

### Methods don't need to be public
```java
class MyTest {
    @Test void doesAThing() { ... }   // package-private is fine
}
```

### Display names
```java
@Test
@DisplayName("computes correct area for unit circle")
void computeArea() { ... }
```

Useful in IDEs and reports.

### Nested tests
```java
class UserServiceTest {
    
    @Nested
    @DisplayName("when user exists")
    class WhenUserExists {
        @Test void returnsUser() { ... }
        @Test void updatesLastSeen() { ... }
    }
    
    @Nested
    @DisplayName("when user is missing")
    class WhenUserMissing {
        @Test void throwsNotFound() { ... }
    }
}
```

Groups related tests; clearer reports.

---

## 3. AssertJ — Fluent Assertions

```java
import static org.assertj.core.api.Assertions.*;

assertThat(value).isEqualTo(5);
assertThat(name).isEqualTo("Alice").startsWith("A").hasSize(5);
assertThat(list).hasSize(3).containsExactly("a", "b", "c");
assertThat(list).contains("b").doesNotContain("z");
assertThat(map).hasSize(2).containsKey("name").containsEntry("age", 30);
assertThat(value).isNull();
assertThat(value).isNotNull();
assertThat(condition).isTrue();
assertThat(price).isBetween(0.0, 100.0).isCloseTo(42.0, offset(0.1));

assertThat(user).usingRecursiveComparison().isEqualTo(expected);

assertThatThrownBy(() -> service.doIt(null))
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("null");

// Optional
assertThat(repo.findById(1L)).isPresent().contains(expectedUser);
assertThat(repo.findById(999L)).isEmpty();

// Sorting / order
assertThat(list).isSorted();
assertThat(list).isSortedAccordingTo(Comparator.naturalOrder());

// Streams / iterables
assertThat(users).extracting(User::name).containsExactly("Alice", "Bob");
assertThat(users).extracting(User::name, User::age)
    .containsExactly(tuple("Alice", 30), tuple("Bob", 25));

assertThat(users)
    .filteredOn(u -> u.age() >= 18)
    .hasSize(2)
    .allSatisfy(u -> assertThat(u.email()).contains("@"));
```

### Why AssertJ over JUnit's built-in
JUnit assertions (`assertEquals`, `assertTrue`):
- Verbose.
- Order of args confusing (`expected, actual`? `actual, expected`?).
- Limited fluent chaining.

AssertJ:
- Reads naturally.
- One starting point (`assertThat`) chained with type-aware methods.
- IDE autocomplete works great.

---

## 4. Mockito — Mocking

```java
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock UserRepository repo;
    @Mock EmailService email;
    @InjectMocks UserService service;
    
    @Test
    void registersUser() {
        when(repo.save(any(User.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        
        User u = service.register(new RegisterRequest("Alice", "a@x.com"));
        
        assertThat(u.getName()).isEqualTo("Alice");
        verify(email).sendWelcome("a@x.com");
        verify(repo).save(any());
    }
}
```

### Stubbing
```java
when(repo.findById(1L)).thenReturn(Optional.of(user));
when(repo.findById(2L)).thenReturn(Optional.empty());

// Throwing
when(repo.save(any())).thenThrow(new DataAccessException("oh no"));

// Returning different values on successive calls
when(counter.next()).thenReturn(1, 2, 3);

// Computed answer
when(repo.save(any())).thenAnswer(inv -> {
    User u = inv.getArgument(0);
    return u.withId(generateId());
});
```

### Argument matchers
```java
when(repo.findByCity(anyString())).thenReturn(List.of());
when(repo.findById(eq(1L))).thenReturn(...);
when(service.matches(argThat(s -> s.startsWith("A")))).thenReturn(true);

// You must use matchers for all args or none — can't mix raw and matcher:
when(repo.findBy("alice", anyInt()));      // ERROR
when(repo.findBy(eq("alice"), anyInt()));   // OK
```

### Verifying interactions
```java
verify(email).sendWelcome("a@x.com");                   // exactly once (default)
verify(email, times(3)).send(any());
verify(email, never()).send("bad@example.com");
verify(email, atLeastOnce()).log(any());
verify(email, atMost(5)).send(any());

verifyNoInteractions(email);
verifyNoMoreInteractions(email);

// Capture arguments
ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
verify(repo).save(captor.capture());
assertThat(captor.getValue().getName()).isEqualTo("Alice");
```

### Spy — partial mock
```java
List<String> list = new ArrayList<>();
List<String> spy = spy(list);

spy.add("real");                // calls real method
when(spy.size()).thenReturn(100);   // stubs the size
spy.size();                       // 100
spy.get(0);                       // "real"
```

Use sparingly. Spies are confusing — half real, half mock.

### `@MockBean` / `@SpyBean` (Spring Boot)
For replacing beans in a Spring context:
```java
@SpringBootTest
class UserControllerTest {
    @MockBean UserService userService;
    @Autowired MockMvc mockMvc;
    
    @Test
    void test() {
        when(userService.findById(1L)).thenReturn(testUser);
        // ...
    }
}
```

Replaces the real bean in the context with the mock.

### Limitations and gotchas
- **Don't mock value objects.** Records, simple POJOs — just construct them.
- **Don't mock what you don't own** unless wrapping it. Mocking external library types couples your tests to their internals.
- **Mocking statics**: Mockito 5+ supports it via `mockStatic`:
  ```java
  try (MockedStatic<Files> mocked = mockStatic(Files.class)) {
      mocked.when(() -> Files.readString(any())).thenReturn("content");
      // ...
  }
  ```
  Use sparingly.
- **Final classes** and methods: Mockito 5+ mocks them by default. Older versions needed inline mockmaker.
- **Argument order** in `when().thenReturn()` — must use mocks; calling real methods to stub doesn't make sense.

### Alternatives
- **MockK** — Kotlin-friendly mocking. (For Java code, Mockito.)
- **PowerMock** — used for mocking statics / privates before Mockito supported them. Legacy.

---

## 5. Parameterized Tests

```java
@ParameterizedTest
@ValueSource(ints = {1, 2, 3, 4, 5})
void allArePositive(int n) {
    assertThat(n).isPositive();
}

@ParameterizedTest
@ValueSource(strings = {"", "  ", "\t", "\n"})
void blankStrings(String s) {
    assertThat(s.isBlank()).isTrue();
}
```

### CSV source
```java
@ParameterizedTest
@CsvSource({
    "1, 2, 3",
    "5, 5, 10",
    "10, -2, 8"
})
void adds(int a, int b, int expected) {
    assertThat(calc.add(a, b)).isEqualTo(expected);
}
```

### CSV file
```java
@ParameterizedTest
@CsvFileSource(resources = "/test-data.csv", numLinesToSkip = 1)
void test(int input, String expected) { ... }
```

### Method source
```java
@ParameterizedTest
@MethodSource("primeProvider")
void primes(int p) {
    assertThat(isPrime(p)).isTrue();
}

static IntStream primeProvider() {
    return IntStream.of(2, 3, 5, 7, 11, 13);
}
```

For complex inputs:
```java
@ParameterizedTest
@MethodSource("userProvider")
void validatesUsers(User user, boolean expectedValid) {
    assertThat(validator.isValid(user)).isEqualTo(expectedValid);
}

static Stream<Arguments> userProvider() {
    return Stream.of(
        Arguments.of(new User("Alice", "a@x.com"), true),
        Arguments.of(new User("", "a@x.com"), false),
        Arguments.of(new User("Alice", "invalid"), false)
    );
}
```

### Enum source
```java
@ParameterizedTest
@EnumSource(Role.class)
void allRolesAreLegal(Role r) {
    assertThat(r.name()).isNotBlank();
}

@ParameterizedTest
@EnumSource(value = Role.class, names = {"ADMIN", "USER"})
void specificRoles(Role r) { ... }
```

---

## 6. Lifecycle and Setup

```java
class MyTest {
    @BeforeAll
    static void beforeAll() {
        // runs once before all tests
    }
    
    @BeforeEach
    void beforeEach() {
        // runs before each test
    }
    
    @Test
    void test1() { ... }
    
    @AfterEach
    void afterEach() {
        // runs after each test
    }
    
    @AfterAll
    static void afterAll() {
        // runs once after all tests
    }
}
```

### Test instance lifecycle
By default, JUnit 5 creates a new instance of the test class for each `@Test` method. This means instance fields are fresh per test. To share state:

```java
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MyTest {
    private final List<String> shared = new ArrayList<>();    // shared across tests
}
```

Then `@BeforeAll` / `@AfterAll` can be non-static.

### `@TempDir`
For tests needing temp directories:
```java
@Test
void readsFile(@TempDir Path tempDir) throws IOException {
    Path file = tempDir.resolve("test.txt");
    Files.writeString(file, "hello");
    
    assertThat(Files.readString(file)).isEqualTo("hello");
}
// tempDir auto-deleted after test
```

---

## 7. Spring Boot Testing

### `@SpringBootTest` — full context
Loads the full application context:
```java
@SpringBootTest
class UserServiceIT {
    @Autowired UserService service;
    @Autowired UserRepository repo;
    
    @Test
    void registers() { ... }
}
```

Slow but realistic. For integration tests.

### `@SpringBootTest` with random port
For HTTP integration tests:
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserControllerIT {
    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;
    
    @Test
    void createsUser() {
        var resp = rest.postForEntity("/api/users", new CreateUserRequest(...), UserDTO.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}
```

`TestRestTemplate` is a convenient HTTP client preconfigured with the test server.

### `@WebMvcTest` — controller slice
```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean UserService service;
    
    @Test
    void getsUser() throws Exception {
        when(service.findById(1L)).thenReturn(new UserDTO(1L, "Alice"));
        
        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice"))
            .andExpect(jsonPath("$.id").value(1));
    }
    
    @Test
    void create() throws Exception {
        String body = """
            {"name":"Alice","email":"a@x.com"}
            """;
        
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Alice"));
    }
}
```

Only loads the web layer — fast. Mocks services with `@MockBean`.

### `MockMvc` — testing controllers
```java
mockMvc.perform(get("/api/users").param("city", "Berlin").header("Authorization", "Bearer ..."))
    .andExpect(status().isOk())
    .andExpect(header().exists("X-Total-Count"))
    .andExpect(jsonPath("$").isArray())
    .andExpect(jsonPath("$.length()").value(3))
    .andExpect(jsonPath("$[0].name").value("Alice"))
    .andDo(print());     // print full request/response for debugging
```

### `@DataJpaTest` — JPA slice
```java
@DataJpaTest
class UserRepositoryTest {
    @Autowired UserRepository repo;
    @Autowired TestEntityManager em;
    
    @Test
    void findsByEmail() {
        em.persist(new User("Alice", "a@x.com"));
        em.flush();
        
        Optional<User> found = repo.findByEmail("a@x.com");
        
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Alice");
    }
}
```

Loads only JPA components. Uses an embedded DB by default (H2). Combine with Testcontainers for real DB.

Auto-rollback after each test — fresh state.

### `@JsonTest`
For testing Jackson configuration / DTOs:
```java
@JsonTest
class UserDTOTest {
    @Autowired JacksonTester<UserDTO> json;
    
    @Test
    void serializes() throws Exception {
        UserDTO u = new UserDTO(1L, "Alice", "a@x.com");
        
        assertThat(json.write(u))
            .extractingJsonPathStringValue("$.name").isEqualTo("Alice");
    }
}
```

### `@TestConfiguration`
For test-specific beans:
```java
@TestConfiguration
static class TestConfig {
    @Bean
    public Clock clock() {
        return Clock.fixed(Instant.parse("2024-01-01T00:00:00Z"), ZoneOffset.UTC);
    }
}

@SpringBootTest
@Import(TestConfig.class)
class MyTest { ... }
```

### Choosing the right slice
- **Pure unit test** (no Spring) — fastest. Inject mocks via constructor.
- **`@WebMvcTest`** — testing controllers with mocked services.
- **`@DataJpaTest`** — testing repositories.
- **`@SpringBootTest`** — full integration test.

Use slices when you can; full context loading is slow.

---

## 8. Testcontainers

Real services running in Docker for integration tests.

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

### With Spring Boot
```java
@SpringBootTest
@Testcontainers
class UserServiceIT {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
    
    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Autowired UserService service;
    
    @Test
    void registers() {
        // runs against real Postgres
    }
}
```

### Reusing containers
For speed, reuse containers across test classes:
```java
@Container
static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
    .withReuse(true);     // requires ~/.testcontainers.properties: testcontainers.reuse.enable=true
```

Or use Spring Boot 3.1+'s `@ServiceConnection`:
```java
@SpringBootTest
@Testcontainers
class UserServiceIT {
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
    
    // Spring auto-configures the DataSource — no @DynamicPropertySource needed
}
```

### Available containers
Testcontainers has modules for almost every service:
- Postgres, MySQL, Oracle, MS SQL.
- MongoDB, Redis, Elasticsearch.
- Kafka, RabbitMQ.
- Localstack (AWS emulator).
- Generic containers (any Docker image).

```java
@Container
static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
    .withExposedPorts(6379);

String redisUrl = "redis://" + redis.getHost() + ":" + redis.getMappedPort(6379);
```

### Performance
Containers take seconds to start. With `reuse=true`, they survive test runs.

For tests that need a fresh DB per test class, just use `@DirtiesContext` or truncate tables in `@BeforeEach`.

---

## 9. Test Organization

### Naming
- Test class: `<Subject>Test` or `<Subject>IT` (for integration).
- Test method: describe behavior, not implementation.
  - GOOD: `returnsEmptyListWhenNoUsers`, `throwsValidationExceptionForBadEmail`.
  - BAD: `test1`, `testFindAll`.

### Maven Failsafe vs Surefire
- **Surefire** runs `*Test.java` — unit tests, `mvn test`.
- **Failsafe** runs `*IT.java` — integration tests, `mvn verify`.

Naming convention separates fast unit tests from slow integration tests.

```xml
<plugin>
    <artifactId>maven-failsafe-plugin</artifactId>
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

### Tags
```java
@Test
@Tag("slow")
void slowTest() { ... }
```

Run only specific tags:
```bash
mvn test -Dgroups=fast
```

### Folder structure
```
src/
├── main/java/com/example/...
├── test/java/com/example/...           # mirrors main
└── test/resources/                       # test config files
```

### Build tool config
```xml
<!-- Skip slow tests in normal builds -->
<plugin>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <excludedGroups>slow</excludedGroups>
    </configuration>
</plugin>
```

---

## 10. Best Practices and Pitfalls

### Test names describe behavior
```java
// BAD
@Test void test1() { ... }
@Test void testFindUser() { ... }

// GOOD
@Test void findUser_returnsUser_whenIdExists() { ... }
@Test void findUser_throws_whenIdMissing() { ... }
```

Or use `@DisplayName`:
```java
@Test
@DisplayName("returns user when ID exists")
void findUser_returnsUser_whenIdExists() { ... }
```

### Arrange / Act / Assert
```java
@Test
void calculatesTotal() {
    // Arrange
    Cart cart = new Cart();
    cart.add(new Item("apple", 1.0));
    cart.add(new Item("bread", 2.0));
    
    // Act
    double total = cart.total();
    
    // Assert
    assertThat(total).isEqualTo(3.0);
}
```

Empty lines between sections clarify structure.

### One logical assertion per test
```java
// BAD — multiple unrelated assertions
@Test
void test() {
    assertThat(service.add(1, 1)).isEqualTo(2);
    assertThat(service.multiply(2, 3)).isEqualTo(6);
    assertThat(service.subtract(5, 2)).isEqualTo(3);
}

// GOOD — separate tests
@Test void adds() { ... }
@Test void multiplies() { ... }
@Test void subtracts() { ... }
```

Multiple `assertThat` chains for the same logical assertion (different aspects of the same outcome) are fine.

### Test data builders / fixtures
Avoid copy-pasted test data:
```java
public class UserFixtures {
    public static User alice() {
        return new User(1L, "Alice", "alice@example.com");
    }
    
    public static User user(String name) {
        return new User(1L, name, name.toLowerCase() + "@example.com");
    }
}

@Test
void test() {
    User u = UserFixtures.alice();
    // ...
}
```

For complex setups, builder pattern:
```java
public class UserBuilder {
    private String name = "Default";
    private String email = "default@example.com";
    private int age = 30;
    
    public UserBuilder name(String n) { this.name = n; return this; }
    public UserBuilder email(String e) { this.email = e; return this; }
    public UserBuilder age(int a) { this.age = a; return this; }
    public User build() { return new User(name, email, age); }
}

User u = new UserBuilder().name("Alice").age(25).build();
```

### Don't share state between tests
```java
// BAD
class MyTest {
    private final List<String> shared = new ArrayList<>();
    
    @Test void a() { shared.add("a"); }
    @Test void b() { assertThat(shared).contains("a"); }   // depends on a()
}
```

Tests should be independent. JUnit gives each test a fresh instance by default — don't fight this.

### Don't test private methods directly
Test through the public API. If a private method is too complex to test indirectly, extract it to its own class.

### Don't mock value objects / DTOs
```java
// BAD
User u = mock(User.class);
when(u.getName()).thenReturn("Alice");

// GOOD
User u = new User(1L, "Alice", "a@x.com");
```

Records are trivial to construct — just construct them.

### Verify what matters, not everything
```java
// BAD — over-verifying
verify(repo).save(any());
verify(repo).flush();
verify(email).send(any());
verifyNoMoreInteractions(repo, email);

// GOOD — verify the key behavior
verify(email).sendWelcome(u.getEmail());
```

Over-verifying creates brittle tests. The next refactor breaks them even when behavior is correct.

### Don't sleep in tests
```java
// BAD
service.scheduleAsync();
Thread.sleep(1000);     // hope it finishes!
assertThat(repo.count()).isEqualTo(1);
```

Use Awaitility for eventual conditions:
```java
import org.awaitility.Awaitility;

Awaitility.await()
    .atMost(5, TimeUnit.SECONDS)
    .untilAsserted(() -> assertThat(repo.count()).isEqualTo(1));
```

### Watch for flaky tests
- Timing-dependent tests.
- Tests that depend on external services without containers.
- Tests with shared state.
- Tests using `Random` without a seed.

When you spot one, fix it immediately. Flaky tests erode trust in the suite.

### `@DirtiesContext` is a code smell
```java
@DirtiesContext        // rebuilds context after this test
@Test
void test() { ... }
```

Forces a slow rebuild. Usually a sign of bad isolation — fix the underlying issue.

### Forgetting `@Transactional` in integration tests
JPA changes need a transaction; `@DataJpaTest` wraps each test in one (and rolls back). For other Spring tests, you might need to add it explicitly.

### Forgetting to start containers
```java
class MyTest {
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");
    // ...
}
```

Without `@Container` annotation + `@Testcontainers` on the class, the container isn't started by the framework. Or you can call `postgres.start()` manually.

### Don't mix unit and integration tests in the same class
Different speeds, different concerns, different deps. Split them.

### Slow test suites
- Use slices (`@WebMvcTest`, `@DataJpaTest`) instead of `@SpringBootTest`.
- Reuse Testcontainers.
- Parallelize tests (Maven Surefire `forkCount`).
- Profile the slow tests; often a small number consume most time.

### Code coverage
- **JaCoCo** is the standard tool.
- Coverage percentages are a poor proxy for test quality. 80% with assertions that just call methods isn't testing.
- Use coverage as a discovery tool ("what's not tested?") not a goal.

### Don't test framework code
Don't test that Spring autowires beans, that Jackson deserializes correctly, that JPA finds entities by ID. Those are tested by the frameworks themselves.

Test **your code**.

### Don't have a "test" profile that masks bugs
```yaml
# application-test.yml
spring:
  jpa:
    show-sql: false
    properties:
      hibernate:
        check_nullability: false    # BAD — hides production issues
```

Keep test config close to production.

### Integration test the boundary
Unit tests verify logic; integration tests verify wiring. Test:
- Controllers (request → response).
- Repositories (queries return what you expect).
- Service-to-service composition (one orchestration that exercises real interactions).

You don't need integration tests for every service method.

---

That's testing. The Java testing ecosystem is mature — JUnit 5 + AssertJ + Mockito + Testcontainers cover essentially every scenario.

Next: build tooling — `13_build_tools.md`.
