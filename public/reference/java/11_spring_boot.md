# 11. Spring Boot

> The dominant Java web framework. Dependency injection, REST controllers, security, configuration, the Spring ecosystem.

> Spring Boot 3.x targets Java 17+. Spring Boot 3.4+ (current in 2026) targets Java 21+ for many features.

---

## Table of Contents

1. [What Spring Boot Is](#1-what-spring-boot-is)
2. [Starting a Project](#2-starting-a-project)
3. [Dependency Injection](#3-dependency-injection)
4. [REST Controllers](#4-rest-controllers)
5. [Validation](#5-validation)
6. [Exception Handling](#6-exception-handling)
7. [Configuration](#7-configuration)
8. [Profiles](#8-profiles)
9. [Spring Data](#9-spring-data)
10. [Spring Security](#10-spring-security)
11. [Actuator and Observability](#11-actuator-and-observability)
12. [Testing](#12-testing)

---

## 1. What Spring Boot Is

Spring is a huge ecosystem for Java application development. **Spring Boot** is the convention-over-configuration layer that makes Spring easy:
- Auto-configures sensible defaults.
- Embedded server (no separate Tomcat install).
- Starter dependencies (one POM dep brings everything you need for an area).
- Production-ready features (metrics, health checks, externalized config) out of the box.

In 2026, Spring Boot is the default for new Java backend services. Alternatives like Quarkus, Micronaut, and Helidon exist but Spring Boot has the broadest adoption.

### What you get
- IoC container with DI.
- Web framework (Spring MVC, WebFlux).
- Data access (JPA, JDBC, MongoDB, Redis, Elasticsearch).
- Security framework.
- Cloud integrations.
- Observability.
- Test support.

---

## 2. Starting a Project

### Spring Initializr — [start.spring.io](https://start.spring.io)
The standard way. Pick:
- Project: Maven / Gradle.
- Language: Java.
- Spring Boot version: latest (currently 3.4.x in 2026).
- Java version: 21 (LTS).
- Dependencies: pick from a long list — Web, JPA, Postgres, Security, etc.

Generates a complete project.

### CLI
```bash
curl https://start.spring.io/starter.zip \
    -d type=maven-project \
    -d language=java \
    -d bootVersion=3.4.0 \
    -d groupId=com.example \
    -d artifactId=my-app \
    -d javaVersion=21 \
    -d dependencies=web,data-jpa,postgresql,validation \
    -o app.zip
unzip app.zip
```

### Project structure
```
my-app/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/myapp/
│   │   │       ├── MyAppApplication.java     # main class
│   │   │       ├── controller/
│   │   │       ├── service/
│   │   │       ├── repository/
│   │   │       ├── model/
│   │   │       └── config/
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── static/
│   │       └── templates/
│   └── test/
│       └── java/com/example/myapp/...
└── target/
```

### Main class
```java
package com.example.myapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyAppApplication.class, args);
    }
}
```

`@SpringBootApplication` combines:
- `@Configuration` — this class declares beans.
- `@EnableAutoConfiguration` — auto-config based on classpath.
- `@ComponentScan` — discover beans in this package and subpackages.

### Running
```bash
./mvnw spring-boot:run         # via Maven wrapper
./gradlew bootRun               # via Gradle wrapper
java -jar target/my-app-0.0.1-SNAPSHOT.jar
```

---

## 3. Dependency Injection

Spring's container creates and manages "beans" (objects), injecting dependencies.

### Stereotypes
- `@Service` — business logic / services.
- `@Repository` — data access (also enables JPA exception translation).
- `@Controller` / `@RestController` — web layer.
- `@Component` — generic component.
- `@Configuration` — declares `@Bean` methods.

All are functionally `@Component`; the distinct names document intent and enable framework-specific features.

### Constructor injection (preferred)
```java
@Service
public class UserService {
    private final UserRepository userRepo;
    private final EmailService email;
    
    public UserService(UserRepository userRepo, EmailService email) {
        this.userRepo = userRepo;
        this.email = email;
    }
    
    public void register(...) { ... }
}
```

Spring auto-injects dependencies via the constructor. Single constructor = no `@Autowired` needed.

### Why constructor injection
- **Immutable**: `final` fields, set once.
- **Testable**: easy to construct in unit tests without Spring.
- **Required deps**: missing constructor arg = compile error.
- **Encourages small classes**: too many constructor params signals too much responsibility.

### Field injection (avoid)
```java
@Service
public class UserService {
    @Autowired UserRepository userRepo;    // not final, harder to test
}
```

Considered bad practice but you'll see it in legacy code.

### Setter injection (rare)
```java
@Service
public class UserService {
    private UserRepository userRepo;
    
    @Autowired
    public void setUserRepo(UserRepository userRepo) {
        this.userRepo = userRepo;
    }
}
```

For optional dependencies. Uncommon.

### Bean creation via `@Bean` methods
For third-party classes you don't control:
```java
@Configuration
public class AppConfig {
    @Bean
    public RestClient restClient() {
        return RestClient.builder()
            .baseUrl("https://api.example.com")
            .build();
    }
    
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule());
    }
}
```

### Bean scopes
- **`singleton`** (default) — one instance per container.
- **`prototype`** — new instance every time injected.
- **`request`**, **`session`** — web scopes.
- **`application`** — one per ServletContext.

Most beans are singletons. Use prototype rarely.

```java
@Component
@Scope("prototype")
public class StatefulHelper { ... }
```

### Multiple beans of the same type
```java
@Service
@Qualifier("postgres")
public class PostgresUserRepo implements UserRepository { ... }

@Service
@Qualifier("mongo")
public class MongoUserRepo implements UserRepository { ... }

// Inject specific one
public class UserService {
    private final UserRepository repo;
    public UserService(@Qualifier("postgres") UserRepository repo) {
        this.repo = repo;
    }
}
```

Or use `@Primary` on one for the default.

### Conditional beans
```java
@Bean
@ConditionalOnProperty(name = "feature.x.enabled", havingValue = "true")
public XService xService() { ... }

@Bean
@ConditionalOnMissingBean
public DefaultService defaultService() { ... }
```

The basis of Spring Boot's auto-configuration.

### Lifecycle hooks
```java
@Component
public class CacheService {
    @PostConstruct
    public void init() { ... }     // after dependencies injected
    
    @PreDestroy
    public void shutdown() { ... }  // before container destruction
}
```

---

## 4. REST Controllers

### Basic controller
```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;
    
    public UserController(UserService service) {
        this.service = service;
    }
    
    @GetMapping
    public List<UserDTO> list() {
        return service.findAll();
    }
    
    @GetMapping("/{id}")
    public UserDTO get(@PathVariable Long id) {
        return service.findById(id);
    }
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDTO create(@RequestBody @Valid CreateUserRequest req) {
        return service.create(req);
    }
    
    @PutMapping("/{id}")
    public UserDTO update(@PathVariable Long id, @RequestBody @Valid UpdateUserRequest req) {
        return service.update(id, req);
    }
    
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
```

`@RestController` = `@Controller` + `@ResponseBody` — all returns are serialized to JSON automatically.

### Request parameters
```java
@GetMapping("/search")
public List<User> search(
    @RequestParam String name,                           // ?name=alice
    @RequestParam(required = false) Integer age,         // ?age=30 (optional)
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) { ... }

@GetMapping("/{id}")
public User get(@PathVariable Long id) { ... }

@GetMapping("/{id}/posts/{postId}")
public Post get(@PathVariable Long id, @PathVariable Long postId) { ... }

@PostMapping
public User create(@RequestBody @Valid CreateUserRequest req) { ... }

@GetMapping
public List<User> list(
    @RequestHeader("Authorization") String auth,
    @CookieValue("session") String session
) { ... }
```

### Pageable
```java
@GetMapping
public Page<User> list(Pageable pageable) {
    return userRepo.findAll(pageable);
}

// Request: GET /users?page=0&size=20&sort=name,asc
```

### `ResponseEntity` for full control
```java
@PostMapping
public ResponseEntity<UserDTO> create(@RequestBody @Valid CreateUserRequest req) {
    UserDTO user = service.create(req);
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .header("Location", "/api/users/" + user.id())
        .body(user);
}

// Or shortcuts:
return ResponseEntity.ok(data);
return ResponseEntity.notFound().build();
return ResponseEntity.badRequest().body(error);
```

### Content negotiation
```java
@GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
public User get(@PathVariable Long id) { ... }

@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
public User create(@RequestBody User u) { ... }
```

Spring picks the right `HttpMessageConverter` (Jackson by default for JSON).

### File upload
```java
@PostMapping("/upload")
public String upload(@RequestParam("file") MultipartFile file) throws IOException {
    String name = file.getOriginalFilename();
    long size = file.getSize();
    Files.write(Path.of("uploads", name), file.getBytes());
    return "uploaded";
}
```

### Streaming responses
```java
@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<String> stream() {
    return Flux.interval(Duration.ofSeconds(1))
        .map(i -> "tick " + i);
}
```

Server-Sent Events for streaming. For WebSocket, use Spring's WebSocket support.

### Spring MVC vs WebFlux
- **Spring MVC** — traditional servlet-based, blocking. Works great with virtual threads in Java 21+.
- **Spring WebFlux** — reactive, non-blocking, uses Project Reactor (`Mono`, `Flux`).

In 2026, with virtual threads available, **Spring MVC is preferred** for most apps. WebFlux is for cases where reactive composition is genuinely useful (streaming, complex event flows).

---

## 5. Validation

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

### Annotations on request bodies
```java
public record CreateUserRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @Min(0) @Max(150) Integer age,
    @Pattern(regexp = "[A-Z]{2}") String country
) {}

@PostMapping
public User create(@RequestBody @Valid CreateUserRequest req) { ... }
```

`@Valid` triggers validation; failures throw `MethodArgumentNotValidException` which Spring translates to a 400 response.

### Common constraints (Jakarta Bean Validation)
- `@NotNull`, `@NotEmpty`, `@NotBlank`.
- `@Size(min, max)` — strings, collections.
- `@Min`, `@Max`, `@DecimalMin`, `@DecimalMax`.
- `@Positive`, `@Negative`, `@PositiveOrZero`, `@NegativeOrZero`.
- `@Pattern(regexp=...)`.
- `@Email`.
- `@Past`, `@Future`, `@PastOrPresent`.
- `@AssertTrue`, `@AssertFalse`.

### Validation groups
```java
public record User(
    @NotNull(groups = Update.class) Long id,
    @NotBlank String name
) {
    public interface Update {}
    public interface Create {}
}

@PostMapping
public User create(@Validated(User.Create.class) @RequestBody User u) { ... }
```

### Custom constraint
```java
@Target({FIELD})
@Retention(RUNTIME)
@Constraint(validatedBy = NotProfaneValidator.class)
public @interface NotProfane {
    String message() default "contains profanity";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class NotProfaneValidator implements ConstraintValidator<NotProfane, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        return value == null || !profanityChecker.contains(value);
    }
}
```

### Validating method parameters
```java
@Service
@Validated     // enables method-level validation
public class UserService {
    public void create(@NotBlank String name, @Email String email) { ... }
}
```

Throws `ConstraintViolationException` on failure.

---

## 6. Exception Handling

### Per-controller `@ExceptionHandler`
```java
@RestController
public class UserController {
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException e) {
        return ResponseEntity.status(404).body(new ErrorResponse("not_found", e.getMessage()));
    }
}
```

### Global `@RestControllerAdvice`
For application-wide exception handling:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(UserNotFoundException e) {
        return ResponseEntity.status(404).body(new ErrorResponse("not_found", e.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getFieldErrors()
            .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ErrorResponse("validation", "bad input", errors));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> generic(Exception e) {
        log.error("unhandled exception", e);
        return ResponseEntity.status(500).body(new ErrorResponse("internal", "unexpected error"));
    }
}

public record ErrorResponse(String code, String message, Map<String, String> details) {
    public ErrorResponse(String code, String message) { this(code, message, Map.of()); }
}
```

### `ProblemDetail` (RFC 7807)
Spring Boot 3+ supports the standard error format:
```java
@ExceptionHandler(UserNotFoundException.class)
public ProblemDetail handle(UserNotFoundException e) {
    ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
    pd.setTitle("User not found");
    pd.setDetail(e.getMessage());
    pd.setProperty("userId", e.getUserId());
    return pd;
}
```

Output:
```json
{
    "type": "about:blank",
    "title": "User not found",
    "status": 404,
    "detail": "User 42 not found",
    "userId": 42
}
```

### Enable for built-in exceptions
```yaml
spring:
  mvc:
    problemdetails:
      enabled: true
```

Standard Spring exceptions now return ProblemDetail format automatically.

---

## 7. Configuration

### `application.yml`
```yaml
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  application:
    name: my-app
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: ${DB_PASSWORD:secret}     # env var with default
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    com.example.myapp: DEBUG
    org.springframework.web: INFO
    org.hibernate.SQL: DEBUG

myapp:
  feature:
    cache-enabled: true
  api:
    timeout: 5000
```

YAML or properties — both work. YAML is more common in 2026.

### Reading config
```java
@Value("${myapp.api.timeout}")
private int timeout;

@Value("${myapp.feature.cache-enabled:false}")     // default
private boolean cacheEnabled;
```

### Type-safe config with `@ConfigurationProperties`
```java
@ConfigurationProperties(prefix = "myapp")
public record MyAppProperties(
    Feature feature,
    Api api
) {
    public record Feature(boolean cacheEnabled) {}
    public record Api(int timeout) {}
}

@SpringBootApplication
@EnableConfigurationProperties(MyAppProperties.class)
public class MyAppApplication { ... }
```

Usage:
```java
@Service
public class MyService {
    private final MyAppProperties props;
    
    public MyService(MyAppProperties props) {
        this.props = props;
    }
    
    public void doStuff() {
        if (props.feature().cacheEnabled()) { ... }
    }
}
```

Strongly preferred over scattered `@Value` annotations.

### Environment variables
Spring maps env vars to properties:
- `MYAPP_API_TIMEOUT=5000` → `myapp.api.timeout`
- Convention: uppercase, underscores.

Use in deploys; never commit secrets to YAML.

### `@ConditionalOn*` annotations
Already covered. Critical for libraries — beans only created when relevant.

---

## 8. Profiles

Different config per environment:

```yaml
# application.yml — defaults
server:
  port: 8080

---
spring:
  config:
    activate:
      on-profile: dev
server:
  port: 8081
logging:
  level:
    root: DEBUG

---
spring:
  config:
    activate:
      on-profile: prod
server:
  port: 80
```

Or separate files:
- `application.yml` — defaults.
- `application-dev.yml` — dev overrides.
- `application-prod.yml` — prod overrides.
- `application-test.yml` — test overrides.

Activate:
```bash
java -jar app.jar --spring.profiles.active=prod
# or
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

Activate profile-specific beans:
```java
@Service
@Profile("prod")
public class RealEmailService implements EmailService { ... }

@Service
@Profile("!prod")
public class MockEmailService implements EmailService { ... }
```

---

## 9. Spring Data

Already covered in `10_databases.md` (Spring Data JPA section). Brief reminder:

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByCity(String city);
}
```

Spring generates the implementation. Inject and use.

### Beyond JPA
Spring Data has modules for:
- `spring-boot-starter-data-jpa` — JPA / Hibernate.
- `spring-boot-starter-data-mongodb` — MongoDB.
- `spring-boot-starter-data-redis` — Redis (also Lettuce/Jedis).
- `spring-boot-starter-data-elasticsearch` — Elasticsearch.
- `spring-boot-starter-data-cassandra`, `-couchbase`, etc.

Same repository-style abstraction across stores.

---

## 10. Spring Security

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

Adding this dep alone secures all endpoints with HTTP Basic auth + auto-generated password.

### Modern config (Spring Security 6+)
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                .anyRequest().authenticated()
            )
            .csrf(csrf -> csrf.disable())              // for stateless APIs
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
            .formLogin(Customizer.withDefaults());
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### JWT authentication
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com
          # or:
          jwk-set-uri: https://auth.example.com/.well-known/jwks.json
```

Spring auto-validates JWTs from these URIs. Inside controllers:
```java
@GetMapping("/me")
public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
    return Map.of(
        "subject", jwt.getSubject(),
        "claims", jwt.getClaims()
    );
}
```

### Method-level security
```java
@EnableMethodSecurity
public class SecurityConfig { ... }

@Service
public class UserService {
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(Long id) { ... }
    
    @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
    public User getUser(Long userId) { ... }
}
```

### Common patterns
- **JWT for stateless APIs** — most modern web/mobile clients.
- **Session-based auth** — traditional web apps with Thymeleaf/JSP.
- **OAuth2 / OIDC** — integrating with Google / GitHub / Okta / Keycloak.

Most apps in 2026 use a managed identity provider (Auth0, Keycloak, AWS Cognito, Clerk) and validate JWTs.

---

## 11. Actuator and Observability

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Adds production endpoints:
- `/actuator/health` — health check (DB, Redis, etc.).
- `/actuator/info` — build info.
- `/actuator/metrics` — JVM and app metrics.
- `/actuator/env` — config (sensitive — secure!).
- `/actuator/prometheus` — Prometheus-format metrics (with `micrometer-registry-prometheus`).
- `/actuator/loggers` — runtime log level changes.

### Configuration
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  endpoint:
    health:
      show-details: when-authorized
```

### Custom health indicator
```java
@Component
public class ExternalApiHealth implements HealthIndicator {
    @Override
    public Health health() {
        try {
            // ping external API
            return Health.up().withDetail("api", "reachable").build();
        } catch (Exception e) {
            return Health.down().withException(e).build();
        }
    }
}
```

Appears in `/actuator/health`.

### Metrics with Micrometer
Spring Boot uses Micrometer (a metrics facade). Built-in metrics:
- HTTP request latencies.
- JVM memory / GC.
- DB connection pool stats.
- Custom counters / timers.

```java
@Service
public class OrderService {
    private final Counter ordersCreated;
    private final Timer processingTime;
    
    public OrderService(MeterRegistry registry) {
        ordersCreated = registry.counter("orders.created");
        processingTime = registry.timer("orders.processing");
    }
    
    public Order create(...) {
        return processingTime.record(() -> {
            // ...
            ordersCreated.increment();
            return order;
        });
    }
}
```

### Tracing
Spring Boot 3 uses Micrometer Tracing (OpenTelemetry under the hood):
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
```

Trace IDs propagate automatically through HTTP calls. Spans exported to your tracing backend (Jaeger, Tempo, Honeycomb, Datadog).

---

## 12. Testing

### Unit tests — just JUnit + Mockito
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository repo;
    @Mock EmailService email;
    @InjectMocks UserService service;
    
    @Test
    void registers() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        
        User u = service.register(new RegisterRequest("Alice", "a@x.com"));
        
        assertThat(u.getName()).isEqualTo("Alice");
        verify(email).sendWelcome("a@x.com");
    }
}
```

No Spring context — fast, isolated.

### Integration tests — `@SpringBootTest`
Loads the full app context:
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserControllerIT {
    @Autowired TestRestTemplate rest;
    @Autowired UserRepository repo;
    
    @BeforeEach
    void setUp() { repo.deleteAll(); }
    
    @Test
    void createsUser() {
        var req = new CreateUserRequest("Alice", "a@x.com");
        var resp = rest.postForEntity("/api/users", req, UserDTO.class);
        
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(resp.getBody().name()).isEqualTo("Alice");
    }
}
```

### Slice tests — load only what's needed
- `@WebMvcTest(UserController.class)` — just the controller layer.
- `@DataJpaTest` — just the JPA layer.
- `@JsonTest` — Jackson serialization.

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean UserService service;
    
    @Test
    void getsUser() throws Exception {
        when(service.findById(1L)).thenReturn(new UserDTO(1L, "Alice", "a@x.com"));
        
        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice"));
    }
}
```

### `@DataJpaTest` with Testcontainers
```java
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepoTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");
    
    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Autowired UserRepository repo;
    
    @Test
    void saves() { ... }
}
```

Real Postgres in a Docker container. Each test method gets a transaction that's rolled back.

### Test profiles
```java
@SpringBootTest
@ActiveProfiles("test")
class MyTest { ... }
```

Loads `application-test.yml`. Use for test-specific overrides (e.g., different DB).

---

That's Spring Boot. Used in ~70% of new Java backend projects. Cover JPA (file 10), testing (file 12), and build tools (file 13) and you're equipped for most enterprise Java work.

Next: tests in more depth — `12_testing.md`.
