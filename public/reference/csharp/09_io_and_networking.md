# 09 — I/O and Networking

How to read/write files, work with streams, and make HTTP calls in modern C#.

## Table of Contents
- [Files: the modern API](#files-the-modern-api)
- [Async file I/O](#async-file-io)
- [Paths](#paths)
- [Streams](#streams)
- [Reading and writing JSON](#reading-and-writing-json)
- [HttpClient: making HTTP requests](#httpclient-making-http-requests)
- [HttpClient lifecycle and IHttpClientFactory](#httpclient-lifecycle-and-ihttpclientfactory)
- [Cancellation and timeouts](#cancellation-and-timeouts)
- [TCP and UDP sockets](#tcp-and-udp-sockets)
- [WebSockets](#websockets)
- [Common pitfalls](#common-pitfalls)

---

## Files: the modern API

The `System.IO.File` class has static methods that cover 90% of what you need. The `Path` class handles cross-platform paths.

```csharp
using System.IO;

// Read entire file as string (sync — fine for small files in console apps)
string content = File.ReadAllText("data.txt");

// Read all lines into array
string[] lines = File.ReadAllLines("data.txt");

// Read as bytes
byte[] bytes = File.ReadAllBytes("image.png");

// Write (overwrites)
File.WriteAllText("output.txt", "Hello, world!");
File.WriteAllLines("output.txt", new[] { "Line 1", "Line 2" });

// Append
File.AppendAllText("log.txt", "New log entry\n");

// Check existence
if (File.Exists("data.txt")) { /* ... */ }

// Delete
File.Delete("data.txt");

// Copy and move
File.Copy("source.txt", "dest.txt", overwrite: true);
File.Move("old.txt", "new.txt");
```

**Directories use `System.IO.Directory`:**

```csharp
Directory.CreateDirectory("logs/2026");  // creates intermediate dirs too
Directory.Exists("logs");

// Enumerate files
foreach (string file in Directory.EnumerateFiles("logs", "*.txt"))
{
    Console.WriteLine(file);
}

// Recursive
foreach (string file in Directory.EnumerateFiles("logs", "*.txt", SearchOption.AllDirectories))
{
    Console.WriteLine(file);
}

// Delete (use carefully)
Directory.Delete("temp", recursive: true);
```

**`EnumerateFiles` vs `GetFiles`:** Enumerate streams results lazily — better for large directories. `GetFiles` returns an array (loads everything).

---

## Async file I/O

For anything beyond trivial scripts, use the async versions. They free the thread while the disk does its work.

```csharp
// Async read
string content = await File.ReadAllTextAsync("data.txt");
string[] lines = await File.ReadAllLinesAsync("data.txt");
byte[] bytes = await File.ReadAllBytesAsync("image.png");

// Async write
await File.WriteAllTextAsync("output.txt", "Hello");
await File.WriteAllLinesAsync("output.txt", new[] { "Line 1", "Line 2" });
await File.AppendAllTextAsync("log.txt", "Entry\n");
```

**When to go async:** In web servers, GUI apps, and anywhere you'd block a request thread. In a one-shot CLI tool reading a config file, sync is fine.

---

## Paths

`Path` is your friend. It handles `/` vs `\`, normalization, extensions, and more.

```csharp
using System.IO;

string full = Path.Combine("logs", "2026", "app.log");
// "logs/2026/app.log" on Linux, "logs\\2026\\app.log" on Windows

string dir = Path.GetDirectoryName(full);      // "logs/2026"
string file = Path.GetFileName(full);          // "app.log"
string name = Path.GetFileNameWithoutExtension(full);  // "app"
string ext = Path.GetExtension(full);          // ".log"

// Build an output path next to the input
string outPath = Path.ChangeExtension("data.csv", ".json");  // "data.json"

// Absolute / canonical
string abs = Path.GetFullPath("./data.txt");

// Temp file
string tmp = Path.GetTempFileName();           // creates empty temp file
string tmpDir = Path.GetTempPath();            // /tmp on Linux, %TEMP% on Windows

// Cross-platform application directories
string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
```

**Never use string concatenation for paths.** `"logs" + "/" + filename` breaks on Windows, breaks if `logs` already has a trailing slash, and breaks if `filename` has special chars.

---

## Streams

Streams are the underlying abstraction. `File.ReadAllText` etc. are convenience wrappers. You use streams directly when:
- File is too large to fit in memory
- You want to read/write progressively
- You're processing network or in-memory data with the same code

```csharp
// Read line by line — efficient for huge files
using StreamReader reader = new("huge.log");
string? line;
while ((line = await reader.ReadLineAsync()) is not null)
{
    ProcessLine(line);
}

// Write progressively
using StreamWriter writer = new("output.txt");
for (int i = 0; i < 1_000_000; i++)
{
    await writer.WriteLineAsync($"Line {i}");
}
// `using` ensures Dispose flushes and closes
```

**Reading bytes:**

```csharp
using FileStream stream = File.OpenRead("data.bin");
byte[] buffer = new byte[4096];
int bytesRead;
while ((bytesRead = await stream.ReadAsync(buffer)) > 0)
{
    ProcessBytes(buffer.AsSpan(0, bytesRead));
}
```

**Writing bytes:**

```csharp
using FileStream stream = File.Create("output.bin");
await stream.WriteAsync(someByteArray);
```

**Stream copying (e.g., download to file):**

```csharp
using HttpClient client = new();
using Stream remote = await client.GetStreamAsync("https://example.com/file.zip");
using FileStream local = File.Create("file.zip");
await remote.CopyToAsync(local);
```

**MemoryStream** lets you treat a `byte[]` as a stream — useful for testing or in-memory processing:

```csharp
using MemoryStream ms = new();
await writer.WriteAsync(ms);  // some method that writes to a stream
byte[] result = ms.ToArray();
```

---

## Reading and writing JSON

`System.Text.Json` is built in (since .NET Core 3+). Use it instead of Newtonsoft.Json for new code — it's faster and has no extra dependency.

```csharp
using System.Text.Json;

// Define types
record Person(string Name, int Age);

// Serialize
Person alice = new("Alice", 30);
string json = JsonSerializer.Serialize(alice);
// {"Name":"Alice","Age":30}

// Pretty-print
string pretty = JsonSerializer.Serialize(alice, new JsonSerializerOptions { WriteIndented = true });

// Deserialize
Person back = JsonSerializer.Deserialize<Person>(json)!;
```

**Common options:**

```csharp
JsonSerializerOptions options = new()
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,  // PascalCase → camelCase
    WriteIndented = true,
    PropertyNameCaseInsensitive = true,                  // for deserialization
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
};

string json = JsonSerializer.Serialize(person, options);
```

**Reading from a file:**

```csharp
using FileStream stream = File.OpenRead("config.json");
Config config = await JsonSerializer.DeserializeAsync<Config>(stream)!;
```

**Writing to a file:**

```csharp
using FileStream stream = File.Create("output.json");
await JsonSerializer.SerializeAsync(stream, data, options);
```

**`JsonDocument` for ad-hoc reading without a class:**

```csharp
using JsonDocument doc = JsonDocument.Parse(json);
JsonElement root = doc.RootElement;
string name = root.GetProperty("name").GetString()!;
int age = root.GetProperty("age").GetInt32();
```

**Newtonsoft.Json (`Json.NET`):** Still widely used. More flexible (e.g., JSON.NET handles `dynamic`, has more attributes). Use it if you need its features or your team already uses it; otherwise prefer `System.Text.Json`.

---

## HttpClient: making HTTP requests

```csharp
using System.Net.Http;
using System.Net.Http.Json;

HttpClient client = new();

// Simple GET as string
string html = await client.GetStringAsync("https://example.com");

// GET as JSON deserialized to a type
Person person = await client.GetFromJsonAsync<Person>("https://api.example.com/people/1")!;

// POST with JSON body
Person newPerson = new("Bob", 25);
HttpResponseMessage response = await client.PostAsJsonAsync(
    "https://api.example.com/people",
    newPerson);
response.EnsureSuccessStatusCode();  // throws if not 2xx
Person created = await response.Content.ReadFromJsonAsync<Person>()!;
```

**Manual request building (more control):**

```csharp
HttpRequestMessage request = new(HttpMethod.Get, "https://api.example.com/data");
request.Headers.Add("X-API-Key", "secret123");
request.Headers.Add("Accept", "application/json");

HttpResponseMessage response = await client.SendAsync(request);

if (response.IsSuccessStatusCode)
{
    string body = await response.Content.ReadAsStringAsync();
    Console.WriteLine(body);
}
else
{
    Console.WriteLine($"Error: {(int)response.StatusCode} {response.ReasonPhrase}");
}
```

**Status code:**

```csharp
response.StatusCode             // System.Net.HttpStatusCode enum
(int)response.StatusCode        // numeric: 200, 404, 500
response.IsSuccessStatusCode    // true if 2xx
response.EnsureSuccessStatusCode();  // throws HttpRequestException if not 2xx
```

**Common HTTP methods:**

```csharp
await client.GetAsync(url);
await client.PostAsync(url, content);
await client.PutAsync(url, content);
await client.DeleteAsync(url);
await client.PatchAsync(url, content);
```

**Content types:**

```csharp
// JSON
HttpContent jsonContent = JsonContent.Create(myObject);

// Form URL-encoded
HttpContent formContent = new FormUrlEncodedContent(new[]
{
    new KeyValuePair<string, string>("username", "alice"),
    new KeyValuePair<string, string>("password", "secret"),
});

// Plain string
HttpContent stringContent = new StringContent("raw text", System.Text.Encoding.UTF8, "text/plain");

// Multipart form (file upload)
MultipartFormDataContent multipart = new();
multipart.Add(new StreamContent(File.OpenRead("photo.jpg")), "file", "photo.jpg");
multipart.Add(new StringContent("Alice"), "name");
```

---

## HttpClient lifecycle and IHttpClientFactory

**Common bug:** `using HttpClient client = new()` in a tight loop. Each `new HttpClient` allocates a socket; rapid creation/disposal exhausts available sockets ("socket exhaustion"). And just keeping a static `HttpClient` forever has its own problem: it doesn't pick up DNS changes.

**The fix in ASP.NET Core and modern apps:** `IHttpClientFactory`.

```csharp
// In Program.cs
builder.Services.AddHttpClient("github", c =>
{
    c.BaseAddress = new Uri("https://api.github.com/");
    c.DefaultRequestHeaders.Add("User-Agent", "MyApp");
});

// Or named/typed clients
builder.Services.AddHttpClient<GitHubService>(c =>
{
    c.BaseAddress = new Uri("https://api.github.com/");
});

// Inject and use
public class GitHubService
{
    private readonly HttpClient _client;
    public GitHubService(HttpClient client) => _client = client;

    public async Task<Repo> GetRepoAsync(string owner, string name)
        => await _client.GetFromJsonAsync<Repo>($"repos/{owner}/{name}")!;
}
```

**In a console app or simple project:** Use a static `HttpClient` and live with it. Or use `IHttpClientFactory` via `Microsoft.Extensions.Http`.

```csharp
// Acceptable in small apps
static readonly HttpClient _http = new();
```

---

## Cancellation and timeouts

**Set a timeout:**

```csharp
HttpClient client = new() { Timeout = TimeSpan.FromSeconds(10) };
```

**Per-request cancellation with `CancellationToken`:**

```csharp
using CancellationTokenSource cts = new(TimeSpan.FromSeconds(5));
try
{
    var response = await client.GetAsync(url, cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Request timed out or was cancelled");
}
```

**Combining tokens (e.g., user cancel + timeout):**

```csharp
using CancellationTokenSource timeoutCts = new(TimeSpan.FromSeconds(5));
using CancellationTokenSource linkedCts =
    CancellationTokenSource.CreateLinkedTokenSource(userCancelToken, timeoutCts.Token);

await client.GetAsync(url, linkedCts.Token);
```

---

## TCP and UDP sockets

Rarely needed in app code (HTTP, gRPC, and message queues cover most use cases), but here's the shape:

**TCP server:**

```csharp
using System.Net;
using System.Net.Sockets;

TcpListener listener = new(IPAddress.Any, 5000);
listener.Start();
Console.WriteLine("Listening on 5000...");

while (true)
{
    TcpClient client = await listener.AcceptTcpClientAsync();
    _ = HandleClientAsync(client);  // fire-and-forget per connection
}

static async Task HandleClientAsync(TcpClient client)
{
    using (client)
    using (NetworkStream stream = client.GetStream())
    {
        byte[] buffer = new byte[1024];
        int n = await stream.ReadAsync(buffer);
        string msg = System.Text.Encoding.UTF8.GetString(buffer, 0, n);
        Console.WriteLine($"Received: {msg}");

        byte[] reply = System.Text.Encoding.UTF8.GetBytes($"Echo: {msg}");
        await stream.WriteAsync(reply);
    }
}
```

**TCP client:**

```csharp
using TcpClient client = new();
await client.ConnectAsync("localhost", 5000);
using NetworkStream stream = client.GetStream();

byte[] data = System.Text.Encoding.UTF8.GetBytes("hello");
await stream.WriteAsync(data);

byte[] buffer = new byte[1024];
int n = await stream.ReadAsync(buffer);
Console.WriteLine(System.Text.Encoding.UTF8.GetString(buffer, 0, n));
```

**UDP:**

```csharp
using UdpClient udp = new(5000);
UdpReceiveResult result = await udp.ReceiveAsync();
string msg = System.Text.Encoding.UTF8.GetString(result.Buffer);

byte[] reply = System.Text.Encoding.UTF8.GetBytes("ack");
await udp.SendAsync(reply, result.RemoteEndPoint);
```

---

## WebSockets

Two angles: WebSocket **client** (`ClientWebSocket`) and WebSocket **server** (handled by ASP.NET Core — see chapter 11).

**Client:**

```csharp
using ClientWebSocket ws = new();
await ws.ConnectAsync(new Uri("wss://echo.websocket.org"), CancellationToken.None);

// Send
byte[] msg = System.Text.Encoding.UTF8.GetBytes("hello");
await ws.SendAsync(msg, WebSocketMessageType.Text, endOfMessage: true, CancellationToken.None);

// Receive
byte[] buffer = new byte[1024];
WebSocketReceiveResult result = await ws.ReceiveAsync(buffer, CancellationToken.None);
string reply = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
Console.WriteLine($"Server said: {reply}");

await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Bye", CancellationToken.None);
```

For most app needs, use **SignalR** (a higher-level abstraction on top of WebSockets — see chapter 11).

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Creating new `HttpClient` per request → socket exhaustion | Reuse one `HttpClient`, or use `IHttpClientFactory` |
| Forgetting `using` on streams → file handles leak | Always wrap in `using` |
| Hardcoding `/` or `\` in paths | Use `Path.Combine` |
| Reading huge file with `File.ReadAllText` | Use `StreamReader` + `ReadLineAsync` |
| Not setting timeouts on `HttpClient` | Set `Timeout` or pass `CancellationToken` |
| Using `result.Result` or `.Wait()` on async I/O | Use `await` — `.Result` can deadlock in UI/ASP.NET contexts |
| Catching `HttpRequestException` only — missing `TaskCanceledException` for timeouts | Catch both, or use `try { ... } catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)` |
| Not disposing `HttpResponseMessage` | `using var response = await client.GetAsync(...)` |
| Comparing `response.StatusCode == 200` | Use enum: `response.StatusCode == HttpStatusCode.OK`, or `IsSuccessStatusCode` |
| Logging request bodies that contain secrets | Filter sensitive headers (`Authorization`) before logging |

---

→ Next: [10 — Databases](10_databases.md)
