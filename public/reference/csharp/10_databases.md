# 10 — Databases

How to talk to relational databases from C#: the three main approaches, when to use each, and the patterns that matter in production.

## Table of Contents
- [Three approaches: ADO.NET, Dapper, EF Core](#three-approaches-adonet-dapper-ef-core)
- [Connection strings](#connection-strings)
- [ADO.NET: the foundation](#adonet-the-foundation)
- [Dapper: lightweight ORM](#dapper-lightweight-orm)
- [EF Core: full ORM](#ef-core-full-orm)
- [Migrations](#migrations)
- [Querying with LINQ](#querying-with-linq)
- [Transactions](#transactions)
- [Connection pooling](#connection-pooling)
- [Common pitfalls](#common-pitfalls)

---

## Three approaches: ADO.NET, Dapper, EF Core

| Tool | What it is | When to use |
|------|------------|-------------|
| **ADO.NET** | Raw, lowest-level: open connection, run SQL, read results manually | When you need full control or are writing a library others build on |
| **Dapper** | Micro-ORM: write SQL, get objects back. Zero magic. | When you want SQL transparency + minimal mapping boilerplate |
| **EF Core** | Full ORM: define classes, query with LINQ, EF builds SQL | Most line-of-business apps; complex domain models; teams that value productivity over SQL control |

**[Likely]** For a new app where the team is split: start with EF Core. Drop down to Dapper for hot paths or complex queries. Use raw ADO.NET only if you're writing infrastructure.

---

## Connection strings

A connection string tells the driver where the DB is and how to authenticate.

```csharp
// PostgreSQL (using Npgsql)
"Host=localhost;Port=5432;Database=myapp;Username=postgres;Password=secret"

// SQL Server
"Server=localhost;Database=myapp;Trusted_Connection=True;TrustServerCertificate=True"
"Server=localhost;Database=myapp;User Id=sa;Password=secret;TrustServerCertificate=True"

// SQLite
"Data Source=app.db"

// MySQL
"Server=localhost;Database=myapp;User=root;Password=secret"
```

**Store them in `appsettings.json`, not code:**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=myapp;Username=postgres;Password=secret"
  }
}
```

**Access in ASP.NET Core:**

```csharp
string connString = builder.Configuration.GetConnectionString("DefaultConnection")!;
```

**Real secrets** (passwords, prod connection strings) go in user-secrets, environment variables, Azure Key Vault, or AWS Secrets Manager — never in `appsettings.json` committed to git.

```bash
# Local dev secrets
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;..."
```

---

## ADO.NET: the foundation

Even if you use EF Core, knowing ADO.NET helps you debug it. This is what's underneath.

```csharp
using Npgsql;  // dotnet add package Npgsql

string connString = "Host=localhost;Database=test;Username=user;Password=pass";

await using NpgsqlConnection conn = new(connString);
await conn.OpenAsync();

// Query
await using NpgsqlCommand cmd = new("SELECT id, name, age FROM users WHERE age > @minAge", conn);
cmd.Parameters.AddWithValue("minAge", 18);  // PARAMETERIZE — never string-concat user input!

await using NpgsqlDataReader reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    int id = reader.GetInt32(0);
    string name = reader.GetString(1);
    int age = reader.GetInt32(2);
    Console.WriteLine($"{id}: {name} ({age})");
}

// Execute (insert/update/delete)
await using NpgsqlCommand insertCmd = new(
    "INSERT INTO users (name, age) VALUES (@name, @age)", conn);
insertCmd.Parameters.AddWithValue("name", "Alice");
insertCmd.Parameters.AddWithValue("age", 30);
int rowsAffected = await insertCmd.ExecuteNonQueryAsync();

// Single scalar
await using NpgsqlCommand countCmd = new("SELECT COUNT(*) FROM users", conn);
long count = (long)(await countCmd.ExecuteScalarAsync())!;
```

**SQL injection — the #1 database security mistake:**

```csharp
// NEVER DO THIS
string userInput = Console.ReadLine()!;  // imagine: "'; DROP TABLE users; --"
NpgsqlCommand bad = new($"SELECT * FROM users WHERE name = '{userInput}'", conn);
// BOOM. Your users table is gone.

// ALWAYS parameterize
NpgsqlCommand good = new("SELECT * FROM users WHERE name = @name", conn);
good.Parameters.AddWithValue("name", userInput);  // driver escapes it safely
```

---

## Dapper: lightweight ORM

Dapper turns SQL results into objects. You write the SQL; Dapper handles the mapping.

```bash
dotnet add package Dapper
dotnet add package Npgsql
```

```csharp
using Dapper;
using Npgsql;

record User(int Id, string Name, int Age);

await using NpgsqlConnection conn = new(connString);
await conn.OpenAsync();

// Query → IEnumerable<User>
IEnumerable<User> adults = await conn.QueryAsync<User>(
    "SELECT id, name, age FROM users WHERE age >= @minAge",
    new { minAge = 18 });

foreach (User u in adults)
    Console.WriteLine($"{u.Name} ({u.Age})");

// Single row
User? alice = await conn.QuerySingleOrDefaultAsync<User>(
    "SELECT * FROM users WHERE name = @name",
    new { name = "Alice" });

// Single value
int count = await conn.ExecuteScalarAsync<int>(
    "SELECT COUNT(*) FROM users");

// Execute (insert/update/delete)
int rows = await conn.ExecuteAsync(
    "INSERT INTO users (name, age) VALUES (@Name, @Age)",
    new { Name = "Bob", Age = 25 });

// Bulk insert (Dapper iterates)
List<User> newUsers = new()
{
    new(0, "Carol", 28),
    new(0, "Dave", 35),
};
await conn.ExecuteAsync(
    "INSERT INTO users (name, age) VALUES (@Name, @Age)",
    newUsers);
```

**Multi-mapping (joins):**

```csharp
record Order(int Id, string Item, User User);

string sql = @"
    SELECT o.id, o.item, u.id, u.name, u.age
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = @id";

Order? order = (await conn.QueryAsync<Order, User, Order>(
    sql,
    (o, u) => o with { User = u },
    new { id = 1 },
    splitOn: "id"  // tells Dapper where the User columns start
)).SingleOrDefault();
```

**Why Dapper:** You see the exact SQL that runs. No mystery joins, no N+1, no eager-load surprises. The cost is you have to write the SQL.

---

## EF Core: full ORM

EF Core is Microsoft's official ORM. You define entity classes, configure a `DbContext`, and query with LINQ. EF generates SQL.

```bash
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Design
# Choose a provider:
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL   # Postgres
dotnet add package Microsoft.EntityFrameworkCore.SqlServer  # SQL Server
dotnet add package Microsoft.EntityFrameworkCore.Sqlite     # SQLite
```

**Define entities:**

```csharp
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Age { get; set; }

    public List<Order> Orders { get; set; } = new();  // navigation
}

public class Order
{
    public int Id { get; set; }
    public string Item { get; set; } = "";
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; }

    public int UserId { get; set; }   // FK
    public User User { get; set; } = null!;  // navigation
}
```

**DbContext:**

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Name);

        modelBuilder.Entity<Order>()
            .Property(o => o.Price)
            .HasColumnType("decimal(10,2)");
    }
}
```

**Register in DI (ASP.NET Core):**

```csharp
// Program.cs
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

**Inject and use:**

```csharp
public class UsersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<User>> GetAll()
        => await db.Users.ToListAsync();

    [HttpGet("{id}")]
    public async Task<User?> GetById(int id)
        => await db.Users.FindAsync(id);

    [HttpPost]
    public async Task<User> Create(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }
}
```

---

## Migrations

EF tracks schema changes via migration files. You change your C# entities, generate a migration, apply it.

```bash
# Add a migration after changing entities
dotnet ef migrations add InitialCreate

# Apply pending migrations to the database
dotnet ef database update

# Roll back to a previous migration
dotnet ef database update PreviousMigrationName

# Remove the last (unapplied) migration
dotnet ef migrations remove

# See applied migrations
dotnet ef migrations list

# Generate SQL script (don't apply)
dotnet ef migrations script
```

A migration is a generated C# file with `Up()` and `Down()` methods:

```csharp
public partial class AddEmailToUsers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Email",
            table: "Users",
            type: "text",
            nullable: false,
            defaultValue: "");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Email", table: "Users");
    }
}
```

**In production:** apply migrations as part of deployment, NOT at app startup (race conditions in multi-instance deployments).

```bash
dotnet ef migrations script --idempotent -o migrate.sql
# Then run migrate.sql against prod DB in a separate step
```

---

## Querying with LINQ

EF translates LINQ to SQL. Power and pitfalls both come from this.

**Basic queries:**

```csharp
// Simple filter
List<User> adults = await db.Users
    .Where(u => u.Age >= 18)
    .ToListAsync();

// Order + limit
List<User> oldest10 = await db.Users
    .OrderByDescending(u => u.Age)
    .Take(10)
    .ToListAsync();

// Projection (select specific columns)
List<string> names = await db.Users
    .Where(u => u.Age >= 18)
    .Select(u => u.Name)
    .ToListAsync();

// Anonymous type projection
var summaries = await db.Users
    .Select(u => new { u.Id, u.Name })
    .ToListAsync();

// Single result
User? alice = await db.Users
    .FirstOrDefaultAsync(u => u.Name == "Alice");

// Count, sum, avg
int count = await db.Users.CountAsync(u => u.Age >= 18);
int total = await db.Orders.SumAsync(o => (int)o.Price);
```

**Joins via navigation properties (Include):**

```csharp
// Load user with their orders (LEFT JOIN behavior)
User? user = await db.Users
    .Include(u => u.Orders)
    .FirstOrDefaultAsync(u => u.Id == 1);

// Multiple includes
var orders = await db.Orders
    .Include(o => o.User)
    .Where(o => o.Price > 100)
    .ToListAsync();
```

**Avoiding N+1:**

```csharp
// BAD: triggers a query per user (N+1)
List<User> users = await db.Users.ToListAsync();
foreach (var u in users)
{
    int orderCount = u.Orders.Count;  // each access loads from DB if lazy loading is on
}

// GOOD: one query loads everything
List<User> users = await db.Users
    .Include(u => u.Orders)
    .ToListAsync();
```

**Async vs sync:** Always prefer `ToListAsync`, `FirstOrDefaultAsync`, `CountAsync`, etc. in web apps. Sync versions block the thread.

**Tracking vs no-tracking:**

```csharp
// Tracked (default) — EF watches for changes
User user = await db.Users.FirstAsync(u => u.Id == 1);
user.Name = "New Name";
await db.SaveChangesAsync();  // EF detects change, UPDATE runs

// No-tracking — faster for read-only queries
List<User> users = await db.Users
    .AsNoTracking()
    .ToListAsync();
```

For pure read scenarios (API responses), `AsNoTracking` is meaningfully faster — EF doesn't snapshot the entity for change detection.

**Raw SQL when LINQ falls short:**

```csharp
// Raw query mapped to entity
List<User> users = await db.Users
    .FromSqlRaw("SELECT * FROM users WHERE age > {0}", 18)
    .ToListAsync();

// Interpolated (safer — auto-parameterizes)
List<User> users = await db.Users
    .FromSqlInterpolated($"SELECT * FROM users WHERE age > {minAge}")
    .ToListAsync();

// Raw command (no result mapping)
int rows = await db.Database.ExecuteSqlInterpolatedAsync(
    $"UPDATE users SET status = 'active' WHERE id = {userId}");
```

---

## Transactions

**Implicit single-call transaction:** `SaveChangesAsync` wraps all pending changes in a transaction.

**Explicit transaction across multiple operations:**

```csharp
using var transaction = await db.Database.BeginTransactionAsync();
try
{
    db.Users.Add(newUser);
    await db.SaveChangesAsync();

    db.Orders.Add(new Order { UserId = newUser.Id, Item = "Widget", Price = 9.99m });
    await db.SaveChangesAsync();

    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

**Dapper with explicit transaction:**

```csharp
await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();
await using var tx = await conn.BeginTransactionAsync();

try
{
    await conn.ExecuteAsync(
        "INSERT INTO users (name) VALUES (@name)", new { name = "Alice" }, tx);
    await conn.ExecuteAsync(
        "INSERT INTO audit (msg) VALUES (@msg)", new { msg = "User added" }, tx);
    await tx.CommitAsync();
}
catch
{
    await tx.RollbackAsync();
    throw;
}
```

---

## Connection pooling

Database connections are expensive to open. ADO.NET (and everything built on it: Dapper, EF) pools them automatically.

**Default behavior:**
- First call opens a real connection
- When you call `Dispose` (the `using` block ends), connection returns to the pool
- Next call grabs from the pool — fast

**You don't need to tune pooling for most apps.** Just always wrap connections in `using` (or `await using`).

**Connection string options that affect pooling:**

```
Max Pool Size=100;Min Pool Size=10;Connection Lifetime=300
```

**In serverless or high-concurrency:** Connection pools per process can overwhelm DBs if you have many instances. PgBouncer (Postgres) and similar tools sit in front of DBs to multiplex.

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| String-concatenating user input into SQL → SQL injection | Always parameterize (`@param`, `{0}`, anonymous objects in Dapper) |
| Forgetting `await` → "context disposed" exceptions | Use `await` on every async call, return `Task` from async methods |
| N+1 queries with lazy loading | Use `.Include(...)` to eager-load, or write a single LINQ projection |
| `AsNoTracking` forgotten on read-heavy queries | Add `AsNoTracking()` for queries you never write back |
| Migrations applied at startup → race in multi-instance deploys | Apply migrations in a separate deployment step |
| Storing connection string in `appsettings.json` (committed) | Use user-secrets, env vars, or Key Vault |
| Long-lived `DbContext` instances | `DbContext` is meant to be short-lived (per-request in web apps); register as scoped |
| Using `SaveChanges` (sync) in async code | Use `SaveChangesAsync` |
| `.Result` or `.Wait()` on Task — deadlocks | Always `await` |
| Catching every exception silently | Let DB exceptions bubble; log them; don't swallow `DbUpdateException` |
| Bulk inserting with EF row-by-row → slow | Use `db.BulkInsertAsync` (EFCore.BulkExtensions) or raw SQL |
| Not adding indexes for filtered/joined columns | Profile slow queries, add indexes (covered in SQL guide chapter 05) |
| `DateTime.Now` vs `DateTime.UtcNow` | Always store UTC; convert to local only at the UI edge |
| Mixing decimal/double for money | Use `decimal` for currency; `double` loses precision |

---

→ Next: [11 — ASP.NET Core](11_aspnet_core.md)
