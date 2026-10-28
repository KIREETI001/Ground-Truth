# 12 — Testing

xUnit, Moq, FluentAssertions, and integration testing for ASP.NET Core. The recommended modern stack.

## Table of Contents
- [Picking a framework: xUnit vs NUnit vs MSTest](#picking-a-framework-xunit-vs-nunit-vs-mstest)
- [xUnit basics](#xunit-basics)
- [FluentAssertions](#fluentassertions)
- [Parameterized tests](#parameterized-tests)
- [Test fixtures and setup/teardown](#test-fixtures-and-setupteardown)
- [Mocking with Moq](#mocking-with-moq)
- [Testing async code](#testing-async-code)
- [Testing exceptions](#testing-exceptions)
- [Integration testing ASP.NET Core](#integration-testing-aspnet-core)
- [Testing EF Core](#testing-ef-core)
- [Test organization](#test-organization)
- [Code coverage](#code-coverage)
- [Common pitfalls](#common-pitfalls)

---

## Picking a framework: xUnit vs NUnit vs MSTest

| Framework | When to pick |
|-----------|--------------|
| **xUnit** | **Default for new projects.** Used by .NET runtime, EF, ASP.NET teams. Clean conventions. |
| **NUnit** | Mature, lots of features, fluent assertions built in. Pick if your team already uses it. |
| **MSTest** | Microsoft's original. Adequate but less popular outside Visual Studio shops. |

**[Likely]** Pick xUnit. Reasonable defaults, fewer footguns, broadest ecosystem support.

**Add to a project:**

```bash
dotnet new xunit -n MyApp.Tests
cd MyApp.Tests
dotnet add reference ../MyApp/MyApp.csproj
dotnet add package FluentAssertions
dotnet add package Moq
```

**Run tests:**

```bash
dotnet test                              # all tests
dotnet test --filter "FullyQualifiedName~UserService"  # filter by name
dotnet test --collect:"XPlat Code Coverage"  # with coverage
dotnet test --logger "console;verbosity=detailed"
```

---

## xUnit basics

The unit of testing in xUnit is a method marked `[Fact]`. No class attribute required.

```csharp
using Xunit;

public class CalculatorTests
{
    [Fact]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        // Arrange
        var calc = new Calculator();

        // Act
        int result = calc.Add(2, 3);

        // Assert
        Assert.Equal(5, result);
    }
}
```

**xUnit naming convention: `Method_Scenario_ExpectedResult`.** The name tells you what the test does without reading the body.

**Common assertions:**

```csharp
Assert.Equal(expected, actual);
Assert.NotEqual(expected, actual);
Assert.True(condition);
Assert.False(condition);
Assert.Null(value);
Assert.NotNull(value);
Assert.Empty(collection);
Assert.Single(collection);
Assert.Contains(item, collection);
Assert.DoesNotContain(item, collection);
Assert.IsType<MyType>(value);     // exact type
Assert.IsAssignableFrom<IBase>(value);  // type or subtype
Assert.Throws<ArgumentException>(() => DoThing());
Assert.ThrowsAny<Exception>(() => DoThing());
await Assert.ThrowsAsync<HttpRequestException>(async () => await CallApi());
```

---

## FluentAssertions

xUnit's built-in assertions are fine but verbose. FluentAssertions reads like English and gives much better failure messages.

```csharp
using FluentAssertions;

[Fact]
public void Add_TwoNumbers_ReturnsSum()
{
    int result = new Calculator().Add(2, 3);
    result.Should().Be(5);
}
```

**Common patterns:**

```csharp
// Numbers
result.Should().Be(5);
result.Should().BeGreaterThan(0);
result.Should().BeInRange(1, 10);
result.Should().BeApproximately(3.14, precision: 0.01);

// Strings
name.Should().Be("Alice");
name.Should().StartWith("Al");
name.Should().NotBeNullOrEmpty();
name.Should().HaveLength(5);
name.Should().Match("Al*");          // wildcard
name.Should().MatchRegex(@"^Al\w+");

// Booleans / null
condition.Should().BeTrue();
value.Should().NotBeNull();

// Collections
users.Should().HaveCount(3);
users.Should().Contain(u => u.Name == "Alice");
users.Should().OnlyContain(u => u.Age > 0);
users.Should().BeInAscendingOrder(u => u.Name);
users.Should().BeEquivalentTo(expectedList);  // deep compare, order-insensitive

// Objects (deep equality)
actualUser.Should().BeEquivalentTo(expectedUser);
actualUser.Should().BeEquivalentTo(expectedUser, opts => opts.Excluding(u => u.Id));

// Exceptions (using `Action` or `Func<Task>`)
Action act = () => calc.Divide(1, 0);
act.Should().Throw<DivideByZeroException>()
   .WithMessage("*zero*");

Func<Task> asyncAct = async () => await DoThing();
await asyncAct.Should().ThrowAsync<InvalidOperationException>();

// Types
obj.Should().BeOfType<User>();
obj.Should().BeAssignableTo<IEntity>();
```

**Why use it:** When `Assert.Equal(5, result)` fails it says "Assert.Equal failed. Expected: 5. Actual: 4". When `result.Should().Be(5)` fails it says "Expected result to be 5, but found 4."

---

## Parameterized tests

Run the same test with multiple inputs.

**`[Theory]` + `[InlineData]`:**

```csharp
[Theory]
[InlineData(2, 3, 5)]
[InlineData(0, 0, 0)]
[InlineData(-1, 1, 0)]
[InlineData(int.MaxValue - 1, 1, int.MaxValue)]
public void Add_VariousInputs_ReturnsCorrectSum(int a, int b, int expected)
{
    new Calculator().Add(a, b).Should().Be(expected);
}
```

**`[MemberData]` for complex inputs:**

```csharp
public static IEnumerable<object[]> AddTestCases =>
    new List<object[]>
    {
        new object[] { 2, 3, 5 },
        new object[] { 0, 0, 0 },
        new object[] { -5, 5, 0 },
    };

[Theory]
[MemberData(nameof(AddTestCases))]
public void Add_FromMemberData(int a, int b, int expected)
{
    new Calculator().Add(a, b).Should().Be(expected);
}
```

**`[ClassData]` — cleanest for many cases:**

```csharp
public class AddTestData : TheoryData<int, int, int>
{
    public AddTestData()
    {
        Add(2, 3, 5);
        Add(0, 0, 0);
        Add(-1, 1, 0);
    }
}

[Theory]
[ClassData(typeof(AddTestData))]
public void Add(int a, int b, int expected) =>
    new Calculator().Add(a, b).Should().Be(expected);
```

---

## Test fixtures and setup/teardown

**No `[SetUp]` attribute in xUnit.** The constructor runs before each test; `Dispose` runs after.

```csharp
public class UserServiceTests : IDisposable
{
    private readonly UserService _service;
    private readonly TestDb _db;

    public UserServiceTests()
    {
        _db = new TestDb();
        _service = new UserService(_db);
    }

    [Fact]
    public void Test1() { /* ... */ }

    [Fact]
    public void Test2() { /* ... */ }

    public void Dispose() => _db.Dispose();
}
```

**Each test gets a fresh instance.** No shared state across tests — that's xUnit's design.

**Sharing setup across tests (expensive setup) — class fixture:**

```csharp
public class DatabaseFixture : IDisposable
{
    public AppDbContext Db { get; }

    public DatabaseFixture()
    {
        // Expensive setup once for the test class
        Db = CreateDbAndSeed();
    }

    public void Dispose() => Db.Dispose();
}

public class UserTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public UserTests(DatabaseFixture fixture) => _fixture = fixture;

    [Fact]
    public void Test() => _fixture.Db.Users.Should().NotBeEmpty();
}
```

**Sharing across multiple test classes — collection fixture:**

```csharp
[CollectionDefinition("Database collection")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture> { }

[Collection("Database collection")]
public class UserTests
{
    private readonly DatabaseFixture _fixture;
    public UserTests(DatabaseFixture fixture) => _fixture = fixture;
    // ...
}
```

---

## Mocking with Moq

Mocks replace real dependencies (DBs, HTTP, etc.) with controllable fakes.

```csharp
using Moq;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<User> CreateAsync(string name);
}

public class UserService
{
    private readonly IUserRepository _repo;
    public UserService(IUserRepository repo) => _repo = repo;

    public async Task<string?> GetNameAsync(int id)
    {
        User? user = await _repo.GetByIdAsync(id);
        return user?.Name;
    }
}

// Test
[Fact]
public async Task GetName_UserExists_ReturnsName()
{
    var mockRepo = new Mock<IUserRepository>();
    mockRepo.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync(new User { Id = 1, Name = "Alice" });

    var service = new UserService(mockRepo.Object);
    string? name = await service.GetNameAsync(1);

    name.Should().Be("Alice");
}

[Fact]
public async Task GetName_UserNotFound_ReturnsNull()
{
    var mockRepo = new Mock<IUserRepository>();
    mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync((User?)null);

    var service = new UserService(mockRepo.Object);
    (await service.GetNameAsync(99)).Should().BeNull();
}
```

**Argument matchers:**

```csharp
It.IsAny<int>()             // any int
It.Is<int>(x => x > 0)      // matches predicate
It.IsRegex("^Alice")        // regex match for strings
It.IsIn(1, 2, 3)            // one of these
```

**Verification:**

```csharp
// Did the code call the dependency exactly once?
mockRepo.Verify(r => r.GetByIdAsync(1), Times.Once);

// Or any of these
Times.Never
Times.Once
Times.Exactly(3)
Times.AtLeast(1)
Times.AtMost(5)
```

**Setting up exceptions:**

```csharp
mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
        .ThrowsAsync(new DbException("DB down"));
```

**Returning different values per call:**

```csharp
mockRepo.SetupSequence(r => r.GetByIdAsync(1))
        .ReturnsAsync(new User { Id = 1, Name = "Alice" })
        .ReturnsAsync(new User { Id = 1, Name = "Alice Updated" });
```

**Alternative: NSubstitute** — cleaner syntax, less type ceremony. Worth considering if Moq's `.Object` and lambdas feel heavy.

```csharp
var repo = Substitute.For<IUserRepository>();
repo.GetByIdAsync(1).Returns(new User { Id = 1, Name = "Alice" });

var service = new UserService(repo);
var name = await service.GetNameAsync(1);

await repo.Received(1).GetByIdAsync(1);
```

---

## Testing async code

Just make the test method `async Task` and `await` the call.

```csharp
[Fact]
public async Task LoadData_ReturnsData()
{
    var service = new DataService();
    var data = await service.LoadAsync();
    data.Should().NotBeEmpty();
}
```

**Do not use `async void`** — exceptions won't propagate, test runner won't see failures.

```csharp
// WRONG
[Fact]
public async void Test() { /* ... */ }   // async void = bad

// RIGHT
[Fact]
public async Task Test() { /* ... */ }
```

---

## Testing exceptions

**xUnit native:**

```csharp
[Fact]
public void Divide_ByZero_Throws()
{
    var calc = new Calculator();
    var ex = Assert.Throws<DivideByZeroException>(() => calc.Divide(1, 0));
    ex.Message.Should().Contain("zero");
}

[Fact]
public async Task Fetch_NetworkDown_ThrowsHttpException()
{
    var client = new ApiClient();
    await Assert.ThrowsAsync<HttpRequestException>(() => client.FetchAsync());
}
```

**FluentAssertions:**

```csharp
Action act = () => calc.Divide(1, 0);
act.Should().Throw<DivideByZeroException>()
   .WithMessage("*zero*");

Func<Task> asyncAct = () => client.FetchAsync();
await asyncAct.Should().ThrowAsync<HttpRequestException>();

// Assert NOT thrown
Action ok = () => calc.Divide(10, 2);
ok.Should().NotThrow();
```

---

## Integration testing ASP.NET Core

Real end-to-end testing of HTTP endpoints against an in-memory server.

```bash
dotnet add package Microsoft.AspNetCore.Mvc.Testing
```

```csharp
public class UsersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public UsersApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetUsers_ReturnsOk()
    {
        HttpResponseMessage response = await _client.GetAsync("/users");
        response.IsSuccessStatusCode.Should().BeTrue();

        var users = await response.Content.ReadFromJsonAsync<List<User>>();
        users.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateUser_ValidData_Returns201()
    {
        var newUser = new { Name = "Alice", Age = 30 };

        HttpResponseMessage response = await _client.PostAsJsonAsync("/users", newUser);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
    }
}
```

**Make `Program` accessible to tests** — add to the API project:

```csharp
// At the end of Program.cs
public partial class Program { }
```

**Overriding services in tests** (e.g., use in-memory DB):

```csharp
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove real DbContext
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            // Use in-memory
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase("TestDb"));
        });
    }
}
```

---

## Testing EF Core

Three options:

1. **In-memory provider** — fastest, but doesn't match real SQL behavior (no relational constraints).

```csharp
var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseInMemoryDatabase("TestDb")
    .Options;

using var db = new AppDbContext(options);
db.Users.Add(new User { Name = "Alice" });
await db.SaveChangesAsync();
```

2. **SQLite in-memory** — actual SQL, fast, behaves more like a real RDBMS.

```csharp
var connection = new SqliteConnection("Filename=:memory:");
connection.Open();

var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseSqlite(connection)
    .Options;

using var db = new AppDbContext(options);
await db.Database.EnsureCreatedAsync();
```

3. **Testcontainers** — real Postgres/SQL Server in Docker, best fidelity.

```bash
dotnet add package Testcontainers.PostgreSql
```

```csharp
public class DbFixture : IAsyncLifetime
{
    public PostgreSqlContainer Container { get; } =
        new PostgreSqlBuilder().WithImage("postgres:16").Build();

    public async Task InitializeAsync() => await Container.StartAsync();
    public async Task DisposeAsync() => await Container.DisposeAsync();
}
```

**[Likely]** Use SQLite in-memory for unit-style tests, Testcontainers for integration tests that need real DB behavior (concurrency, constraints, dialect-specific SQL).

---

## Test organization

**Conventions:**

```
src/
├── MyApp/
│   └── MyApp.csproj
└── MyApp.Tests/
    ├── MyApp.Tests.csproj
    ├── Unit/
    │   ├── Services/
    │   │   └── UserServiceTests.cs
    │   └── Validators/
    └── Integration/
        ├── ApiTests.cs
        └── Fixtures/
            └── WebFactory.cs
```

**Naming:**
- Test project: `MyApp.Tests`, `MyApp.IntegrationTests`
- Test class: `<ClassUnderTest>Tests` — e.g., `UserServiceTests`
- Test method: `Method_Scenario_ExpectedResult`

---

## Code coverage

```bash
dotnet test --collect:"XPlat Code Coverage"
# Output: MyApp.Tests/TestResults/{guid}/coverage.cobertura.xml
```

**Generate HTML report:**

```bash
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:**/coverage.cobertura.xml -targetdir:coverage-report
open coverage-report/index.html
```

**[Likely]** Don't chase 100%. Aim for high coverage on business logic (services, domain). Don't sweat coverage on DTOs, simple property mappers, or framework boilerplate.

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| `async void` test methods → exceptions silently swallowed | Use `async Task` |
| Sharing state across tests via static fields | Use constructor + Dispose; xUnit creates fresh instance per test |
| Mocking concrete classes (not interfaces) | Refactor to interface, or use libraries that mock virtuals (limited) |
| Tests that depend on order | Each test must be independent — random order should still pass |
| In-memory EF provider hides bugs (no FK enforcement) | Use SQLite or real DB for tests that touch constraints |
| Asserting on `DateTime.Now` — flaky | Inject `IClock` abstraction, control time in tests |
| Slow tests because every test rebuilds the DB | Use class/collection fixtures to share setup |
| Asserting on private state | Test through the public API; if you need to reach inside, your design probably has a problem |
| Testing implementation details — tests break on refactors | Assert on observable behavior, not how the method got there |
| Forgetting to `await` an async assertion → test passes spuriously | Always await; let analyzers warn on unawaited tasks |
| One mega-test that exercises five scenarios | One test per scenario — failure messages tell you exactly what broke |
| Verifying mocks for every call | Verify only what matters for the test's assertion |

---

→ Next: [13 — Game development with Unity](13_game_dev_unity.md)
