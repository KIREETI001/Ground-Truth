# 11 — ASP.NET Core

The web framework. Covers Minimal APIs (the modern default), MVC, dependency injection, middleware, auth, and Blazor.

## Table of Contents
- [Picking your style: Minimal API vs MVC vs Blazor](#picking-your-style-minimal-api-vs-mvc-vs-blazor)
- [Minimal API: the modern default](#minimal-api-the-modern-default)
- [MVC controllers](#mvc-controllers)
- [Dependency injection](#dependency-injection)
- [Middleware](#middleware)
- [Configuration and environments](#configuration-and-environments)
- [Logging](#logging)
- [Authentication and authorization](#authentication-and-authorization)
- [Model binding and validation](#model-binding-and-validation)
- [OpenAPI/Swagger](#openapiswagger)
- [Blazor](#blazor)
- [SignalR for real-time](#signalr-for-real-time)
- [Common pitfalls](#common-pitfalls)

---

## Picking your style: Minimal API vs MVC vs Blazor

| Style | What it is | Best for |
|-------|------------|----------|
| **Minimal API** | Functional, route → handler in a few lines | New REST APIs, microservices, simple endpoints |
| **MVC controllers** | Class-based, attributes, model binding | Larger APIs, complex routing, teams familiar with the pattern |
| **Razor Pages** | Page-based MVC for server-rendered web apps | Server-rendered HTML pages (forms, dashboards) |
| **Blazor Server** | C# in the browser via SignalR; UI rendered server-side | Interactive UIs without writing JS, tight server connection |
| **Blazor WebAssembly** | C# compiled to WASM, runs in browser | SPAs without JS frameworks |

**[Likely]** For new APIs in 2026, start with Minimal APIs. Switch to controllers only if you outgrow them.

---

## Minimal API: the modern default

The whole app fits in `Program.cs`. No controllers, no attributes required.

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello, world!");

app.MapGet("/users/{id:int}", (int id) => new { Id = id, Name = "Alice" });

app.MapPost("/users", (User user) =>
{
    // create user
    return Results.Created($"/users/{user.Id}", user);
});

app.Run();

record User(int Id, string Name);
```

**Route grouping:**

```csharp
var users = app.MapGroup("/users");

users.MapGet("/", () => GetAllUsers());
users.MapGet("/{id:int}", (int id) => GetUser(id));
users.MapPost("/", (User u) => CreateUser(u));
users.MapPut("/{id:int}", (int id, User u) => UpdateUser(id, u));
users.MapDelete("/{id:int}", (int id) => DeleteUser(id));
```

**Returning results:**

```csharp
app.MapGet("/users/{id:int}", async (int id, AppDbContext db) =>
{
    User? user = await db.Users.FindAsync(id);
    return user is null ? Results.NotFound() : Results.Ok(user);
});

// Strongly-typed results (better for OpenAPI):
app.MapGet("/users/{id:int}", async Task<Results<Ok<User>, NotFound>> (int id, AppDbContext db) =>
{
    User? user = await db.Users.FindAsync(id);
    return user is null
        ? TypedResults.NotFound()
        : TypedResults.Ok(user);
});
```

**Common result helpers:**

```csharp
Results.Ok(value)              // 200 with body
Results.Created(url, value)    // 201 with Location header
Results.NoContent()            // 204
Results.BadRequest(error)      // 400
Results.NotFound()             // 404
Results.Unauthorized()         // 401
Results.Forbid()               // 403
Results.Problem(...)           // RFC 7807 problem details
Results.File(bytes, ...)       // file download
Results.Redirect(url)          // 302
```

**Parameter binding:** From route, query, header, body, services — automatically by convention.

```csharp
// /search?q=hello&limit=10
app.MapGet("/search", (string q, int limit = 20) => DoSearch(q, limit));

// /reports/{year}/{month}
app.MapGet("/reports/{year:int}/{month:int}", (int year, int month) => GetReport(year, month));

// JSON body
app.MapPost("/users", (User u) => CreateUser(u));

// Header binding
app.MapGet("/me", ([FromHeader(Name = "X-User-Id")] int userId) => GetUser(userId));

// Service injection
app.MapGet("/users", async (AppDbContext db) => await db.Users.ToListAsync());
```

---

## MVC controllers

When the app grows, controllers organize related routes. Same model binding, more structure.

**Register MVC:**

```csharp
// Program.cs
builder.Services.AddControllers();
// ...
app.MapControllers();
```

**A controller:**

```csharp
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]  // /api/users
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IEnumerable<User>> GetAll()
        => await _db.Users.ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<User>> GetById(int id)
    {
        User? user = await _db.Users.FindAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<User>> Create([FromBody] User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] User user)
    {
        if (id != user.Id) return BadRequest();
        _db.Entry(user).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        User? user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
```

**Common attributes:**

| Attribute | Purpose |
|-----------|---------|
| `[ApiController]` | Enables auto model validation, error responses |
| `[Route("...")]` | Sets route template; `[controller]` substitutes class name minus "Controller" |
| `[HttpGet]`, `[HttpPost]`, etc. | HTTP method binding |
| `[FromBody]`, `[FromQuery]`, `[FromRoute]`, `[FromHeader]` | Explicit source binding |
| `[Authorize]` | Requires authenticated user |
| `[AllowAnonymous]` | Bypasses auth requirement |
| `[Produces("application/json")]` | Response content type |

---

## Dependency injection

ASP.NET Core has DI built in. Three lifetimes:

| Lifetime | Created | When to use |
|----------|---------|-------------|
| **Transient** | Every time it's requested | Lightweight, stateless services |
| **Scoped** | Once per HTTP request | DbContexts, request-scoped state |
| **Singleton** | Once per app | Shared, thread-safe state (caches, config) |

**Registration:**

```csharp
// Program.cs
builder.Services.AddTransient<IEmailSender, EmailSender>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<IClock, SystemClock>();

// DbContext is scoped automatically
builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connString));
```

**Constructor injection:**

```csharp
public class UserService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;

    public UserService(AppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    public async Task RegisterAsync(string emailAddress)
    {
        // ...
        await _email.SendAsync(emailAddress, "Welcome!");
    }
}
```

**Primary constructors (C# 12+):**

```csharp
public class UserService(AppDbContext db, IEmailSender email)
{
    public async Task RegisterAsync(string emailAddress)
    {
        // db and email are accessible directly
        await email.SendAsync(emailAddress, "Welcome!");
    }
}
```

**Injection into Minimal APIs:** Just add parameters — anything not a route/query/body is treated as a service.

```csharp
app.MapPost("/register", async (string email, UserService users) =>
{
    await users.RegisterAsync(email);
    return Results.Ok();
});
```

**Common pitfall: scope captures.** Don't inject a scoped service (`DbContext`) into a singleton. The singleton outlives the request scope; the DbContext becomes invalid. ASP.NET will throw at startup if it detects this.

---

## Middleware

Middleware is a pipeline of functions, each receiving an `HttpContext` and either handling it or calling `next()`.

```csharp
var app = builder.Build();

// Order matters! Each middleware runs in registration order.
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

**Inline middleware:**

```csharp
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next();
    sw.Stop();
    Console.WriteLine($"{context.Request.Method} {context.Request.Path} took {sw.ElapsedMilliseconds}ms");
});
```

**Class-based middleware:**

```csharp
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        _logger.LogInformation("Incoming: {Method} {Path}", context.Request.Method, context.Request.Path);
        await _next(context);
        _logger.LogInformation("Outgoing: {StatusCode}", context.Response.StatusCode);
    }
}

// In Program.cs
app.UseMiddleware<RequestLoggingMiddleware>();
```

**Built-in middleware you'll commonly use:**

- `UseHttpsRedirection()` — redirect HTTP to HTTPS
- `UseStaticFiles()` — serve `wwwroot/`
- `UseRouting()` / endpoint routing (auto with `MapControllers`)
- `UseAuthentication()` / `UseAuthorization()`
- `UseCors(...)` — Cross-Origin Resource Sharing
- `UseExceptionHandler(...)` — global error page
- `UseRateLimiter()` — rate limiting (built in since .NET 7)

---

## Configuration and environments

Configuration is layered: `appsettings.json` → `appsettings.{Environment}.json` → environment variables → command-line args. Later sources override earlier.

**appsettings.json:**

```json
{
  "Logging": {
    "LogLevel": { "Default": "Information" }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;..."
  },
  "MyApp": {
    "MaxItems": 100,
    "FeatureX": true
  }
}
```

**Read in code:**

```csharp
// In Program.cs
string connStr = builder.Configuration.GetConnectionString("DefaultConnection")!;
int maxItems = builder.Configuration.GetValue<int>("MyApp:MaxItems");
```

**Strongly-typed options pattern:**

```csharp
public class MyAppOptions
{
    public int MaxItems { get; set; }
    public bool FeatureX { get; set; }
}

builder.Services.Configure<MyAppOptions>(builder.Configuration.GetSection("MyApp"));

// Inject IOptions<T>
public class MyService(IOptions<MyAppOptions> options)
{
    private readonly MyAppOptions _opts = options.Value;
    public void DoThing() => Console.WriteLine(_opts.MaxItems);
}
```

**Environment:**

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

// Set via env var: ASPNETCORE_ENVIRONMENT=Production
```

**Secrets:**

```bash
# Dev — never committed
dotnet user-secrets init
dotnet user-secrets set "MyApp:ApiKey" "secret123"

# Prod — env vars or vaults
export MyApp__ApiKey="secret123"   # `__` for nesting
```

---

## Logging

`ILogger<T>` is injected. Logs are structured (message template + parameters).

```csharp
public class UsersController(ILogger<UsersController> logger) : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        logger.LogInformation("Fetching user {UserId}", id);

        try
        {
            // ...
            return Ok();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch user {UserId}", id);
            return StatusCode(500);
        }
    }
}
```

**Log levels (low → high):** Trace, Debug, Information, Warning, Error, Critical.

**Configure levels in `appsettings.json`:**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "MyApp.Services.UserService": "Debug"
    }
  }
}
```

**Structured logging shines with sinks like Serilog:**

```bash
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Sinks.File
```

```csharp
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/app-.log", rollingInterval: RollingInterval.Day));
```

---

## Authentication and authorization

**Authentication** = who is the user (JWT, cookie, OAuth).
**Authorization** = what are they allowed to do (roles, policies).

**JWT auth (typical for APIs):**

```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        };
    });

builder.Services.AddAuthorization();

// In the pipeline
app.UseAuthentication();
app.UseAuthorization();
```

**Protecting endpoints:**

```csharp
// Minimal API
app.MapGet("/me", (ClaimsPrincipal user) => new { Name = user.Identity!.Name })
   .RequireAuthorization();

// Controller
[Authorize]
[ApiController]
public class SecretsController : ControllerBase { /* ... */ }

[AllowAnonymous]
[HttpGet("public")]
public IActionResult Public() => Ok("anyone can see this");
```

**Authorization policies:**

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    options.AddPolicy("OverEighteen", p => p.RequireClaim("age", "18", "19", "20"));  // example
});

app.MapGet("/admin", () => "Hello admin")
   .RequireAuthorization("AdminOnly");
```

**ASP.NET Core Identity** is the full user-management stack (registration, password hashing, email confirmation, MFA). Use it for traditional web apps. For pure APIs, JWT or a hosted identity provider (Auth0, Azure AD, Okta) is usually cleaner.

---

## Model binding and validation

With `[ApiController]`, validation runs automatically. Validation failures → 400 with details.

```csharp
public class CreateUserDto
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = "";

    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Range(0, 150)]
    public int Age { get; set; }
}

[HttpPost]
public IActionResult Create([FromBody] CreateUserDto dto)
{
    // If validation fails, [ApiController] returns 400 automatically
    // ModelState is already checked
    return Ok();
}
```

**FluentValidation alternative** (more flexible):

```bash
dotnet add package FluentValidation.AspNetCore
```

```csharp
public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().Length(2, 100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Age).InclusiveBetween(0, 150);
    }
}

builder.Services.AddValidatorsFromAssemblyContaining<CreateUserDtoValidator>();
```

---

## OpenAPI/Swagger

Auto-generated API documentation. Built into the default web API template.

```bash
dotnet add package Microsoft.AspNetCore.OpenApi
dotnet add package Swashbuckle.AspNetCore  # for Swagger UI
```

```csharp
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();  // browse at /swagger
}
```

**Document endpoints (Minimal API):**

```csharp
app.MapGet("/users/{id}", (int id) => GetUser(id))
   .WithName("GetUser")
   .WithSummary("Get a user by ID")
   .Produces<User>(200)
   .Produces(404);
```

---

## Blazor

Blazor lets you build interactive web UIs in C# instead of JavaScript.

**Two flavors:**
- **Blazor Server** — UI logic on server; updates via SignalR. Fast initial load, tight DB access, requires constant connection.
- **Blazor WebAssembly (WASM)** — C# compiled to WASM, runs in browser. Bigger initial download, runs offline-capable, full SPA.

**Razor component (`Counter.razor`):**

```razor
@page "/counter"

<h1>Counter</h1>
<p>Current count: @currentCount</p>
<button class="btn btn-primary" @onclick="IncrementCount">Click me</button>

@code {
    private int currentCount = 0;

    private void IncrementCount()
    {
        currentCount++;
    }
}
```

**Component with parameter and service injection:**

```razor
@page "/users/{Id:int}"
@inject IUserService UserService

<h1>@user?.Name</h1>

@code {
    [Parameter] public int Id { get; set; }
    private User? user;

    protected override async Task OnInitializedAsync()
    {
        user = await UserService.GetByIdAsync(Id);
    }
}
```

**[Likely]** Blazor's market share has grown but it's still niche. For a typical SPA, React/Vue+JS is more common. Pick Blazor if your team is C#-heavy and JS is friction.

---

## SignalR for real-time

WebSocket + fallback library for real-time server-to-client push.

```bash
dotnet add package Microsoft.AspNetCore.SignalR
```

**Hub (server):**

```csharp
public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}

// Register in Program.cs
builder.Services.AddSignalR();
app.MapHub<ChatHub>("/chathub");
```

**JavaScript client:**

```javascript
const conn = new signalR.HubConnectionBuilder()
  .withUrl("/chathub")
  .build();

conn.on("ReceiveMessage", (user, msg) => console.log(`${user}: ${msg}`));
await conn.start();
await conn.invoke("SendMessage", "Alice", "Hello");
```

Use for chat, live dashboards, collaborative tools, notifications.

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Injecting scoped service (DbContext) into singleton | Use `IServiceScopeFactory` to create scopes manually |
| Long-running work in request handlers | Move to background services (`IHostedService`) |
| Forgetting `app.UseAuthentication()` BEFORE `UseAuthorization()` | Order matters — auth before authz |
| `[Authorize]` not enforced because no auth scheme registered | Register `AddAuthentication(...)` |
| Returning HTTP 200 for errors | Use proper status codes (400, 404, 500) |
| Logging sensitive data (passwords, JWTs) | Filter sensitive fields before logging |
| Synchronous calls in async handlers (`.Result`, `.Wait()`) | Use `await` everywhere |
| Missing CORS for browser clients | `builder.Services.AddCors(...)` + `app.UseCors(...)` |
| `IOptions<T>` updated at runtime? It's not. | Use `IOptionsMonitor<T>` for reload-aware options |
| Using `HttpClient` directly (not factory) → socket exhaustion | Use `IHttpClientFactory` (chapter 09) |
| Catching all exceptions globally to "log them" | Let exception handler middleware + structured logs handle it |
| Forgetting to dispose `HubConnection` on client | Wrap in `await using` or call `DisposeAsync()` |

---

→ Next: [12 — Testing](12_testing.md)
