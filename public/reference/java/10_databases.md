# 10. Databases

> JDBC, JPA/Hibernate, jOOQ, connection pooling (HikariCP), transactions, and the patterns of Java data access.

> For SQL itself, see the `sql/` folder. This file covers Java-side access.

---

## Table of Contents

1. [Choosing a Data Access Layer](#1-choosing-a-data-access-layer)
2. [JDBC — the Foundation](#2-jdbc--the-foundation)
3. [Connection Pooling (HikariCP)](#3-connection-pooling-hikaricp)
4. [JPA / Hibernate](#4-jpa--hibernate)
5. [Spring Data JPA](#5-spring-data-jpa)
6. [jOOQ — Type-Safe SQL](#6-jooq--type-safe-sql)
7. [Transactions](#7-transactions)
8. [Migrations (Flyway / Liquibase)](#8-migrations-flyway--liquibase)
9. [Common Patterns](#9-common-patterns)
10. [Pitfalls](#10-pitfalls)

---

## 1. Choosing a Data Access Layer

| Tool | Pick when |
|---|---|
| **JDBC** (raw) | Scripts, one-off tools, full control needed. |
| **JdbcTemplate** (Spring) | Simple queries, you want SQL but not raw JDBC pain. |
| **JPA / Hibernate** | Standard ORM. Object-relational mapping; auto-generated queries. |
| **Spring Data JPA** | JPA + convenient repository abstraction. Most common in Spring Boot. |
| **jOOQ** | Type-safe SQL with code generation. SQL-first ORM-like. |
| **MyBatis** | SQL-mapper, XML or annotations. Niche but mature. |

In 2026:
- **Spring Boot + Spring Data JPA + Hibernate** for most apps.
- **jOOQ** for SQL-heavy reporting, analytics, or complex queries.
- **JdbcTemplate** for simple use cases.

---

## 2. JDBC — the Foundation

The Java Database Connectivity API. Every higher-level tool builds on this.

```java
String url = "jdbc:postgresql://localhost:5432/mydb";
String user = "postgres";
String password = "secret";

try (Connection conn = DriverManager.getConnection(url, user, password);
     PreparedStatement ps = conn.prepareStatement("SELECT id, name FROM users WHERE id = ?")) {
    ps.setLong(1, 42);
    try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) {
            long id = rs.getLong("id");
            String name = rs.getString("name");
            System.out.println(id + ": " + name);
        }
    }
}
```

### Drivers
You need a JDBC driver for your DB:
```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.7.4</version>
</dependency>
```

Common drivers:
- `org.postgresql:postgresql` — PostgreSQL.
- `mysql:mysql-connector-j` — MySQL.
- `com.h2database:h2` — H2 (in-memory; for tests).
- `org.xerial:sqlite-jdbc` — SQLite.
- `com.microsoft.sqlserver:mssql-jdbc` — MS SQL Server.

### `PreparedStatement` (always)
Never concatenate user input into SQL:
```java
String sql = "SELECT * FROM users WHERE email = '" + email + "'";   // SQL INJECTION
```

Use `PreparedStatement`:
```java
var ps = conn.prepareStatement("SELECT * FROM users WHERE email = ?");
ps.setString(1, email);
```

The driver handles escaping and uses the DB's parameterized query mechanism.

### Inserting and updating
```java
try (var ps = conn.prepareStatement(
        "INSERT INTO users (name, email) VALUES (?, ?)",
        Statement.RETURN_GENERATED_KEYS)) {
    ps.setString(1, "Alice");
    ps.setString(2, "a@x.com");
    int rows = ps.executeUpdate();
    
    try (var keys = ps.getGeneratedKeys()) {
        if (keys.next()) {
            long id = keys.getLong(1);
        }
    }
}
```

### Batch inserts
```java
try (var ps = conn.prepareStatement("INSERT INTO logs (msg) VALUES (?)")) {
    for (String msg : messages) {
        ps.setString(1, msg);
        ps.addBatch();
    }
    ps.executeBatch();
}
```

Far faster than per-row inserts.

### ResultSet
```java
try (var rs = ps.executeQuery()) {
    while (rs.next()) {
        long id = rs.getLong("id");
        String name = rs.getString("name");
        Integer age = rs.getObject("age", Integer.class);   // nullable
        Instant created = rs.getObject("created_at", Instant.class);
    }
}
```

Use `getObject(col, Class)` for type-safe nullable values. `getInt` returns 0 for SQL NULL — easy to confuse with a real 0.

### When raw JDBC is right
- Performance-critical paths where ORM overhead matters.
- Scripts and migrations.
- Reporting queries.
- Tests where you want to be explicit about SQL.

### `JdbcTemplate` (Spring)
Spring's wrapper around JDBC — handles resource management, exception translation, parameter binding:
```java
@Autowired JdbcTemplate jdbc;

List<User> users = jdbc.query(
    "SELECT id, name FROM users WHERE age > ?",
    (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name")),
    18
);

int count = jdbc.update(
    "UPDATE users SET active = ? WHERE id = ?",
    true, 42
);
```

More concise than raw JDBC. Works without an ORM.

Also see `NamedParameterJdbcTemplate` for `:name` parameters:
```java
jdbc.query(
    "SELECT * FROM users WHERE city = :city AND age > :age",
    Map.of("city", "Berlin", "age", 18),
    rowMapper
);
```

---

## 3. Connection Pooling (HikariCP)

Opening a DB connection per query is too slow. Use a pool.

### Why pool
- Each connection: 1-3MB memory + DB-side resources.
- Connection setup is slow (~10-100ms).
- Pools keep N connections alive, hand them out to threads.

### HikariCP — the default
Fastest and most popular pool. Default in Spring Boot.

```xml
<dependency>
    <groupId>com.zaxxer</groupId>
    <artifactId>HikariCP</artifactId>
    <version>6.0.0</version>
</dependency>
```

```java
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost/mydb");
config.setUsername("postgres");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setConnectionTimeout(30_000);  // ms
config.setIdleTimeout(600_000);
config.setMaxLifetime(1_800_000);

DataSource dataSource = new HikariDataSource(config);

try (Connection conn = dataSource.getConnection()) {
    // use conn
}
```

### Spring Boot configuration
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

Spring Boot auto-configures HikariCP from these properties.

### Sizing the pool
A common starting point: `connections = (cores * 2) + spindles`. Postgres practitioners often recommend smaller pools (10-20) than people instinctively use; the bottleneck is rarely the pool.

Larger pools can cause more contention than smaller ones. Measure.

For serverless / many-instance deployments, use **PgBouncer** in front of Postgres to multiplex many app-side pools onto fewer real connections.

---

## 4. JPA / Hibernate

JPA (Jakarta Persistence API) is the Java standard for ORM. **Hibernate** is the dominant implementation.

### Entity
```java
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    private String name;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    
    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL)
    private List<Post> posts = new ArrayList<>();
    
    // getters, setters, no-arg constructor
}
```

JPA requires:
- A no-argument constructor (can be `protected`).
- Mutable fields (or setters/property access).
- Either field or property-based access (mostly field these days).

### `persistence.xml` or Spring Boot config
Spring Boot autoconfigures JPA. For non-Spring use, a `persistence.xml` file is required — refer to Hibernate docs.

### Using `EntityManager` (raw JPA)
```java
@PersistenceContext
private EntityManager em;

@Transactional
public User findById(Long id) {
    return em.find(User.class, id);
}

@Transactional
public void save(User user) {
    em.persist(user);
}

@Transactional
public List<User> findActive() {
    return em.createQuery("SELECT u FROM User u WHERE u.active = true", User.class)
        .getResultList();
}
```

### JPQL — Java Persistence Query Language
Like SQL but on entities:
```java
TypedQuery<User> query = em.createQuery(
    "SELECT u FROM User u WHERE u.email = :email", User.class
);
query.setParameter("email", "a@x.com");
User u = query.getSingleResult();
```

JPQL references entity class names and field names, not table/column names.

### Native queries
```java
em.createNativeQuery(
    "SELECT * FROM users WHERE email = ?1", User.class
).setParameter(1, email).getSingleResult();
```

### Relationships
```java
// One-to-many
@OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
private List<Post> posts;

// Many-to-one
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "user_id")
private User user;

// Many-to-many
@ManyToMany
@JoinTable(
    name = "user_roles",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "role_id"))
private Set<Role> roles;

// One-to-one
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "profile_id")
private Profile profile;
```

### Fetch types
- **EAGER**: load relationship along with the entity.
- **LAZY**: load when accessed.

`@OneToMany` and `@ManyToMany` default to LAZY. `@ManyToOne` and `@OneToOne` default to EAGER — usually you want LAZY.

**Pitfall**: accessing a lazy field outside a transaction throws `LazyInitializationException`. Either:
- Fetch eagerly when needed (`JOIN FETCH`).
- Stay within a transaction.
- Use DTO projections.

### N+1 problem
```java
List<User> users = em.createQuery("SELECT u FROM User u", User.class).getResultList();
for (User u : users) {
    u.getPosts();   // each access triggers a separate query
}
```

Total: 1 query for users + N queries for posts. Disastrous for performance.

Fix with `JOIN FETCH`:
```java
em.createQuery("SELECT u FROM User u LEFT JOIN FETCH u.posts", User.class);
```

Or with entity graphs:
```java
@NamedEntityGraph(
    name = "User.withPosts",
    attributeNodes = @NamedAttributeNode("posts")
)
@Entity
public class User { ... }

// Use it:
em.createQuery("SELECT u FROM User u", User.class)
    .setHint("jakarta.persistence.fetchgraph",
             em.getEntityGraph("User.withPosts"))
    .getResultList();
```

### Persistence lifecycle
- **Transient** — `new User()`. Not managed.
- **Managed** — after `em.persist()` or load from DB. Changes are tracked.
- **Detached** — after transaction ends. Changes no longer tracked.
- **Removed** — after `em.remove()`. Deleted on flush.

### Dirty checking
JPA tracks changes to managed entities. On transaction commit, dirty entities are updated:
```java
@Transactional
public void rename(Long id, String newName) {
    User u = em.find(User.class, id);
    u.setName(newName);
    // no need to call em.merge or em.update — dirty checking handles it
}
```

### When ORMs hurt
- Complex queries with many joins, aggregations, window functions.
- Bulk updates/deletes.
- Reporting / analytics.

For these, drop to SQL via jOOQ or JdbcTemplate.

---

## 5. Spring Data JPA

The dominant way to use JPA in 2026. Add a repository interface; Spring generates the implementation.

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByAgeGreaterThan(int age);
    List<User> findByCityAndAgeBetween(String city, int min, int max);
    long countByActive(boolean active);
    
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmailQuery(@Param("email") String email);
    
    @Query(value = "SELECT * FROM users WHERE active = true", nativeQuery = true)
    List<User> findActiveNative();
    
    @Modifying
    @Query("UPDATE User u SET u.active = false WHERE u.lastLogin < :date")
    int deactivateInactive(@Param("date") Instant date);
}
```

### Method name conventions
Spring parses method names:
- `findByX` — query.
- `findByXAndY`, `findByXOrY` — combinations.
- `findByXContaining`, `findByXStartingWith` — string operations.
- `findByXBetween`, `findByXGreaterThan`, `findByXIn` — comparisons.
- `OrderByXDesc` — ordering.
- `Top10ByXOrderByY` — limit.
- `countByX` / `existsByX` / `deleteByX`.

Quick for simple queries. For complex ones, use `@Query`.

### Using a repository
```java
@Autowired UserRepository users;

User u = users.save(new User(...));
Optional<User> found = users.findById(1L);
List<User> all = users.findAll();
List<User> filtered = users.findByCity("Berlin");
users.deleteById(1L);

// Pagination
Page<User> page = users.findAll(PageRequest.of(0, 20, Sort.by("name")));
List<User> content = page.getContent();
long total = page.getTotalElements();
```

### Custom logic in a repository
```java
public interface UserRepositoryCustom {
    List<User> complexQuery(SomeFilter filter);
}

public class UserRepositoryImpl implements UserRepositoryCustom {
    @PersistenceContext
    private EntityManager em;
    
    @Override
    public List<User> complexQuery(SomeFilter filter) {
        // custom JPQL or Criteria API
    }
}

public interface UserRepository extends JpaRepository<User, Long>, UserRepositoryCustom {}
```

### Projections — return DTOs not entities
Avoid loading entire entities when you only need a subset:
```java
public interface UserSummary {
    Long getId();
    String getName();
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    List<UserSummary> findAllProjectedBy();
}
```

Or use a record:
```java
public record UserDTO(Long id, String name) {}

@Query("SELECT new com.example.UserDTO(u.id, u.name) FROM User u")
List<UserDTO> findAllAsDTO();
```

---

## 6. jOOQ — Type-Safe SQL

jOOQ is SQL-first: generate code from your database schema, then write type-safe queries.

```java
// Generated from schema:
import static com.example.generated.Tables.USERS;

DSLContext dsl = DSL.using(connection, SQLDialect.POSTGRES);

List<Record2<Long, String>> result = dsl
    .select(USERS.ID, USERS.NAME)
    .from(USERS)
    .where(USERS.AGE.gt(18))
    .orderBy(USERS.NAME)
    .fetch();

// Inserts
dsl.insertInto(USERS)
    .set(USERS.NAME, "Alice")
    .set(USERS.EMAIL, "a@x.com")
    .returning(USERS.ID)
    .fetchOne();

// Updates
dsl.update(USERS)
    .set(USERS.ACTIVE, false)
    .where(USERS.LAST_LOGIN.lt(cutoff))
    .execute();

// Joins
dsl.select(USERS.NAME, POSTS.TITLE)
    .from(USERS)
    .join(POSTS).on(POSTS.USER_ID.eq(USERS.ID))
    .where(USERS.ID.eq(1L))
    .fetch();
```

### Why jOOQ
- **Type-safe SQL**: column names, types, joins all checked at compile time.
- **SQL fluency**: write SQL-like code, not entity-based abstractions.
- **No N+1**: you choose exactly what to fetch.
- **Great for complex queries**: window functions, CTEs, complex aggregations.

### When jOOQ wins
- Reporting / analytics.
- Read-heavy services with complex queries.
- Teams that prefer SQL over ORM abstractions.
- When you want full control without raw JDBC pain.

### When JPA wins
- CRUD-heavy applications.
- Domain-driven design with rich entity behavior.
- Teams new to SQL — JPA can hide complexity (for better or worse).

Many teams use **both**: JPA for CRUD, jOOQ for reporting.

### Code generation
jOOQ generates classes from your DB schema. Set up via Maven/Gradle plugin pointing at your dev DB or a Flyway/Liquibase migration directory.

---

## 7. Transactions

### Spring's `@Transactional`
The standard way to declare transactions in Spring:
```java
@Service
public class TransferService {
    @Transactional
    public void transfer(Long from, Long to, BigDecimal amount) {
        var src = accounts.findById(from).orElseThrow();
        var dst = accounts.findById(to).orElseThrow();
        src.debit(amount);
        dst.credit(amount);
        // transaction commits when method returns
        // rolls back on RuntimeException (default)
    }
}
```

### Propagation
```java
@Transactional(propagation = Propagation.REQUIRED)       // default — join or create
@Transactional(propagation = Propagation.REQUIRES_NEW)   // always a new tx
@Transactional(propagation = Propagation.SUPPORTS)        // join if present
@Transactional(propagation = Propagation.MANDATORY)        // require existing
@Transactional(propagation = Propagation.NEVER)             // must not have one
```

### Isolation
```java
@Transactional(isolation = Isolation.READ_COMMITTED)        // default in PG
@Transactional(isolation = Isolation.REPEATABLE_READ)
@Transactional(isolation = Isolation.SERIALIZABLE)
```

### Rollback rules
By default, Spring rolls back on `RuntimeException` and `Error` but **commits on checked exceptions**. Override:
```java
@Transactional(rollbackFor = Exception.class)
public void doStuff() throws SomeCheckedException { ... }
```

### Programmatic transactions
For finer control:
```java
@Autowired TransactionTemplate tx;

User u = tx.execute(status -> {
    return userRepo.save(new User(...));
});
```

### Critical: `@Transactional` only works through Spring proxies
```java
@Service
public class Service {
    @Transactional
    public void outer() { inner(); }
    
    @Transactional
    public void inner() { ... }   // not in a new tx — same tx as outer
}
```

Direct method calls don't go through the proxy. `inner()` called from `outer()` skips the @Transactional behavior of `inner`. To get a new transaction, inject a self-reference or use a different bean.

### Long transactions are bad
- Hold locks longer.
- Reduce DB throughput.
- Block other operations.

Keep transactions short. Don't do API calls or other slow work inside.

### Avoid network calls in transactions
```java
@Transactional
public void doStuff() {
    db.save(x);
    externalApi.notify();   // BAD — holds transaction during slow API call
}
```

Move the external call out:
```java
public void doStuff() {
    saveTransactionally(x);
    externalApi.notify();    // outside any DB transaction
}

@Transactional
public void saveTransactionally(X x) { db.save(x); }
```

### Read-only transactions
```java
@Transactional(readOnly = true)
public User findById(Long id) { ... }
```

Hint to the JPA/DB to skip dirty checking. Slightly faster.

---

## 8. Migrations (Flyway / Liquibase)

Don't manage schema by hand. Use a migration tool.

### Flyway
SQL-based migrations.

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

```
src/main/resources/db/migration/
├── V1__create_users.sql
├── V2__add_email_index.sql
└── V3__add_posts_table.sql
```

```sql
-- V1__create_users.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Spring Boot auto-runs migrations on startup.

### Liquibase
Like Flyway but supports XML / YAML / JSON in addition to SQL. More feature-rich, more complex.

### Migration discipline
- **One-way**: migrations applied in order, never edited after running.
- **Compatible**: each migration should leave the DB in a state both old and new app code can handle (for zero-downtime deploys).
- **Tested**: run against a copy of prod before deploying.

For backwards-compat:
1. Add new column (nullable). Deploy.
2. Backfill data + update code to use new column.
3. Make new column NOT NULL. Drop old column.

Each step is a separate migration + deploy.

### Don't auto-generate schema from entities (`spring.jpa.hibernate.ddl-auto=update`)
That's fine for prototypes. **Never in production.** Use migrations.

---

## 9. Common Patterns

### Pagination
```java
@GetMapping("/users")
public Page<User> list(Pageable pageable) {
    return userRepo.findAll(pageable);
}

// GET /users?page=0&size=20&sort=name,asc
```

### Bulk insert
```java
@Transactional
public void importUsers(List<User> users) {
    for (int i = 0; i < users.size(); i++) {
        em.persist(users.get(i));
        if (i % 50 == 0) {
            em.flush();
            em.clear();    // detach to free memory
        }
    }
}
```

For very large imports, raw JDBC `executeBatch` is faster.

### Optimistic locking
```java
@Entity
public class Account {
    @Id Long id;
    
    @Version
    private Long version;    // auto-incremented on update
    
    BigDecimal balance;
}
```

If two transactions both load and update the same account, the second commit fails with `OptimisticLockException` (because the version no longer matches). Caller can retry.

### Pessimistic locking
```java
Account a = em.find(Account.class, id, LockModeType.PESSIMISTIC_WRITE);
// SQL: SELECT ... FOR UPDATE
```

Hold a DB lock. Use sparingly — can cause contention / deadlocks.

### Soft delete
```java
@Entity
@SQLDelete(sql = "UPDATE users SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
public class User {
    @Id Long id;
    Boolean deleted = false;
}
```

`em.remove()` becomes an UPDATE; queries auto-filter out deleted rows.

### Audit fields
With Spring Data JPA Auditing:
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditedEntity {
    @CreatedDate Instant createdAt;
    @LastModifiedDate Instant updatedAt;
    @CreatedBy String createdBy;
    @LastModifiedBy String updatedBy;
}

@EnableJpaAuditing
@Configuration
class JpaConfig {
    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.of(currentUserId());
    }
}
```

### DTO mapping with MapStruct
For converting between entities and DTOs:
```java
@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDTO toDto(User user);
    User toEntity(UserDTO dto);
    List<UserDTO> toDtoList(List<User> users);
}
```

Generates the implementation at compile time.

### Testcontainers for integration tests
```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@Testcontainers
@SpringBootTest
class UserRepoTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");
    
    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Test
    void test() { ... }
}
```

Real database in tests; trash-and-rebuild for each test run.

---

## 10. Pitfalls

### Lazy loading outside a transaction
```java
User u = userRepo.findById(1L).get();   // transaction ends here
u.getPosts().size();    // LazyInitializationException
```

Either fetch eagerly when needed, or stay within the transaction, or convert to DTO before transaction ends.

### Returning entities from controllers
```java
@GetMapping("/users/{id}")
public User get(@PathVariable Long id) {
    return userRepo.findById(id).get();
}
```

Problems:
- Serializing lazy-loaded fields triggers more queries (or fails).
- Exposes internal model to clients.
- Hard to evolve (DB changes ripple to API).

Use DTOs.

### `@Transactional` on private methods
Doesn't work. Spring's AOP only proxies public methods of beans.

### `@Transactional` self-invocation
```java
class S {
    @Transactional public void outer() { this.inner(); }
    @Transactional public void inner() { ... }   // NOT in a new tx
}
```

The `this.inner()` call bypasses the proxy. Inject the bean as a self-reference if needed.

### N+1 queries
Endless source of perf problems. Use `JOIN FETCH`, entity graphs, or DTO projections.

### `equals`/`hashCode` on entities
JPA entities are mutable, often have null IDs before persistence, and are tricky to compare. Lombok's `@Data` on entities is dangerous — generates `equals`/`hashCode` that misbehave with lazy loading.

Generally: don't override `equals`/`hashCode` on entities unless you know what you're doing. Or use only the ID once you have one.

### `findAll()` on big tables
```java
List<User> all = userRepo.findAll();    // 10M rows? OOM.
```

Always paginate. Or stream:
```java
try (Stream<User> stream = userRepo.findAllByXxx(...)) {
    stream.forEach(...);
}
```

### Hibernate's "first level cache" surprises
Within a transaction, querying the same entity twice returns the same instance:
```java
User a = em.find(User.class, 1L);
User b = em.find(User.class, 1L);
a == b;    // true
```

Cleared on `em.clear()` or transaction end. Sometimes you want fresh data: `em.refresh(entity)`.

### Forgetting `@Transactional`
```java
public void doStuff() {       // no transaction!
    repo.save(x);
    repo.update(y);
}
```

Each call gets its own implicit transaction. If `repo.update(y)` fails, `repo.save(x)` already committed.

### Open Session in View
Spring Boot enables this by default — the JPA session stays open until the response is written. Causes lazy loads to "just work" in controllers but encourages bad patterns and N+1 queries.

Disable:
```yaml
spring:
  jpa:
    open-in-view: false
```

Forces you to handle lazy loading properly. Better long-term.

### Caching pitfalls
Hibernate's second-level cache can speed things up but is easy to misuse. Don't enable it as a first step — it adds complexity and can mask issues.

### Connection leaks
Forgetting to close a connection in raw JDBC leaks pool capacity. Always try-with-resources. ORMs handle this.

### Big transactions
- Hold locks.
- Hurt concurrency.
- Fail catastrophically.

Keep transactions small and focused.

### `EAGER` everywhere
"Just make it eager to avoid lazy issues" → loads way more data than needed. Pay for it in performance.

### Native queries returning entities
```java
@Query(value = "SELECT * FROM users WHERE ...", nativeQuery = true)
List<User> findX();
```

Works but bypasses some JPA features. For complex SQL, consider jOOQ or DTO projections.

### Ignoring DB migrations
"I'll just update the entity and let Hibernate make the column" → divergent schemas between environments, undocumented changes, restore failures.

Always use Flyway / Liquibase. Always.

### Comparing dates / times
Use `java.time` types (`Instant`, `LocalDate`, `LocalDateTime`, `OffsetDateTime`, `ZonedDateTime`), not `java.util.Date`. JPA supports them natively.

Most JDBC drivers map `Instant` to `TIMESTAMP WITH TIME ZONE` (Postgres) — what you want for events. Use `LocalDate` for dates without time.

---

That's the data access layer. In 2026, Spring Data JPA covers most cases; jOOQ handles complex queries; testcontainers makes tests real. Migrations are non-negotiable.

Next: the framework that ties everything together — `11_spring_boot.md`.
