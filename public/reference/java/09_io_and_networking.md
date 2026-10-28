# 09. I/O and Networking

> Filesystem operations, the modern HTTP client, sockets, and JSON serialization.

---

## Table of Contents

1. [Reading and Writing Files](#1-reading-and-writing-files)
2. [Paths and Filesystem Operations](#2-paths-and-filesystem-operations)
3. [Streams (I/O streams, not java.util.stream)](#3-streams-io-streams-not-javautilstream)
4. [Reading Text](#4-reading-text)
5. [Reading Binary](#5-reading-binary)
6. [Java HTTP Client (Java 11+)](#6-java-http-client-java-11)
7. [Sockets](#7-sockets)
8. [JSON Serialization (Jackson)](#8-json-serialization-jackson)
9. [Java Serialization (Avoid)](#9-java-serialization-avoid)
10. [Common Patterns](#10-common-patterns)

---

## 1. Reading and Writing Files

Modern Java uses `java.nio.file` for file operations. The older `java.io.File` API is legacy.

### Reading a whole file
```java
import java.nio.file.Files;
import java.nio.file.Path;

String content = Files.readString(Path.of("data.txt"));
byte[] bytes = Files.readAllBytes(Path.of("image.png"));
List<String> lines = Files.readAllLines(Path.of("data.txt"));
```

`Files.readString` (Java 11+) is the simplest for text files.

### Writing
```java
Files.writeString(Path.of("out.txt"), "Hello");
Files.write(Path.of("out.bin"), bytes);
Files.write(Path.of("lines.txt"), List.of("line 1", "line 2"));

// Append
Files.writeString(Path.of("log.txt"), "more\n", StandardOpenOption.APPEND);
```

### Streaming large files
```java
try (Stream<String> lines = Files.lines(Path.of("huge.log"))) {
    long matches = lines
        .filter(l -> l.contains("ERROR"))
        .count();
}
```

`Files.lines` returns a Stream that needs closing — use try-with-resources.

### Character encoding
All these default to UTF-8 (Java 18+). Override if needed:
```java
String s = Files.readString(path, StandardCharsets.ISO_8859_1);
```

---

## 2. Paths and Filesystem Operations

```java
Path p = Path.of("/home/user/data.txt");
Path rel = Path.of("data", "file.txt");
Path resolved = Path.of("/home").resolve("user").resolve("data.txt");

p.getFileName();       // data.txt
p.getParent();          // /home/user
p.getRoot();             // /
p.toAbsolutePath();
p.normalize();           // resolves ./ and ../
p.relativize(other);

p.toString();
p.toFile();              // legacy File object if needed
```

### Existence checks
```java
Files.exists(path);
Files.notExists(path);
Files.isRegularFile(path);
Files.isDirectory(path);
Files.isReadable(path);
Files.isWritable(path);
```

### Metadata
```java
long size = Files.size(path);
FileTime modified = Files.getLastModifiedTime(path);
Set<PosixFilePermission> perms = Files.getPosixFilePermissions(path);
```

### Operations
```java
Files.createDirectory(path);
Files.createDirectories(path);             // like mkdir -p
Files.createFile(path);
Files.delete(path);
Files.deleteIfExists(path);
Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);
Files.move(src, dst);

// Recursive delete (no built-in)
try (Stream<Path> walk = Files.walk(root)) {
    walk.sorted(Comparator.reverseOrder())
        .forEach(p -> {
            try { Files.delete(p); } catch (IOException e) { ... }
        });
}
```

### Directory listing
```java
try (Stream<Path> list = Files.list(dir)) {
    list.forEach(System.out::println);
}

try (Stream<Path> walk = Files.walk(dir)) {
    walk.filter(p -> p.toString().endsWith(".txt"))
        .forEach(System.out::println);
}
```

Both return a Stream — close it.

### File watching
```java
WatchService watcher = FileSystems.getDefault().newWatchService();
path.register(watcher,
    StandardWatchEventKinds.ENTRY_CREATE,
    StandardWatchEventKinds.ENTRY_MODIFY,
    StandardWatchEventKinds.ENTRY_DELETE);

while (true) {
    WatchKey key = watcher.take();    // blocks
    for (WatchEvent<?> event : key.pollEvents()) {
        System.out.println(event.kind() + " " + event.context());
    }
    key.reset();
}
```

For production-grade file watching with debouncing, cross-platform reliability: third-party libraries (e.g., methvin/directory-watcher).

### Temp files and dirs
```java
Path temp = Files.createTempFile("prefix", ".tmp");
Path tempDir = Files.createTempDirectory("myapp-");
Path systemTemp = Path.of(System.getProperty("java.io.tmpdir"));
```

Delete when done; some systems clean periodically, others don't.

---

## 3. Streams (I/O streams, not java.util.stream)

Older I/O API. Still useful for binary data and when interfacing with libraries.

### Hierarchy
```
InputStream  / OutputStream      — byte streams
Reader        / Writer            — character streams
```

Byte streams for binary; character streams for text (handle encoding).

### Common implementations
```java
// Byte
InputStream in = new FileInputStream(file);
InputStream in2 = Files.newInputStream(path);
ByteArrayInputStream b = new ByteArrayInputStream(bytes);
BufferedInputStream buf = new BufferedInputStream(in);

OutputStream out = new FileOutputStream(file);
ByteArrayOutputStream baos = new ByteArrayOutputStream();

// Character
Reader r = new FileReader(file);
Reader r2 = Files.newBufferedReader(path);
BufferedReader br = new BufferedReader(new FileReader(file));

Writer w = new FileWriter(file);
PrintWriter pw = new PrintWriter(new FileWriter(file));
```

### Buffered for performance
Always wrap raw file streams in `Buffered*`:
```java
try (var r = new BufferedReader(new FileReader("big.txt"))) {
    String line;
    while ((line = r.readLine()) != null) {
        process(line);
    }
}
```

Without buffering, each `read()` is a system call. With, you read large chunks.

### `Files.newBufferedReader` / `newBufferedWriter`
Preferred modern way — built-in buffering, UTF-8 default, returns properly buffered:
```java
try (var r = Files.newBufferedReader(path)) {
    String line;
    while ((line = r.readLine()) != null) {
        process(line);
    }
}
```

### Copying between streams
```java
InputStream in = ...;
OutputStream out = ...;
in.transferTo(out);     // Java 9+
```

Replaces hand-written loops.

### Closing
Always use try-with-resources for streams.

---

## 4. Reading Text

```java
// Whole file
String s = Files.readString(path);

// Line by line
try (var r = Files.newBufferedReader(path)) {
    String line;
    while ((line = r.readLine()) != null) {
        ...
    }
}

// Stream of lines (lazy)
try (Stream<String> lines = Files.lines(path)) {
    lines.filter(...).map(...).forEach(...);
}

// All lines (eager)
List<String> all = Files.readAllLines(path);
```

For huge files, use the streaming forms — don't load everything into memory.

### Standard input
```java
try (var r = new BufferedReader(new InputStreamReader(System.in))) {
    String line;
    while ((line = r.readLine()) != null) {
        process(line);
    }
}
```

For interactive prompts: `Scanner`:
```java
Scanner sc = new Scanner(System.in);
System.out.print("Name: ");
String name = sc.nextLine();
int age = sc.nextInt();
```

---

## 5. Reading Binary

```java
byte[] data = Files.readAllBytes(path);

try (var in = new BufferedInputStream(new FileInputStream(file))) {
    byte[] buf = new byte[8192];
    int n;
    while ((n = in.read(buf)) != -1) {
        process(buf, n);
    }
}
```

### `DataInputStream` / `DataOutputStream`
For reading/writing primitives in a fixed format:
```java
try (var out = new DataOutputStream(Files.newOutputStream(path))) {
    out.writeInt(42);
    out.writeLong(123L);
    out.writeUTF("hello");
}

try (var in = new DataInputStream(Files.newInputStream(path))) {
    int i = in.readInt();
    long l = in.readLong();
    String s = in.readUTF();
}
```

For real binary formats, use a serialization library (Protobuf, MessagePack, etc.) instead of rolling your own.

### `ByteBuffer` (NIO)
Lower-level — directly accessing memory regions:
```java
ByteBuffer buf = ByteBuffer.allocate(1024);
buf.putInt(42);
buf.putLong(123L);
buf.flip();
int i = buf.getInt();
long l = buf.getLong();
```

Used heavily by NIO networking and high-performance I/O. Most application code doesn't need this directly.

---

## 6. Java HTTP Client (Java 11+)

The modern HTTP client. Replaces `HttpURLConnection` (don't use that).

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;

HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .followRedirects(HttpClient.Redirect.NORMAL)
    .build();

HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Accept", "application/json")
    .GET()
    .build();

HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());

resp.statusCode();    // 200
resp.body();           // String body
resp.headers().firstValue("content-type");
```

### POST with JSON
```java
String json = "{\"name\":\"Alice\"}";

HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();

HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
```

### Async
```java
CompletableFuture<HttpResponse<String>> future = client.sendAsync(
    req, HttpResponse.BodyHandlers.ofString()
);

future.thenApply(HttpResponse::body)
    .thenAccept(System.out::println);
```

With virtual threads (Java 21+), often easier to just call `send` synchronously and let virtual threads handle concurrency.

### Body handlers
- `BodyHandlers.ofString()` — text response.
- `BodyHandlers.ofByteArray()` — binary.
- `BodyHandlers.ofFile(path)` — direct to file.
- `BodyHandlers.ofInputStream()` — stream.
- `BodyHandlers.discarding()` — ignore body.

### Body publishers
- `BodyPublishers.noBody()` — for GET/DELETE.
- `BodyPublishers.ofString(s)` — string body.
- `BodyPublishers.ofByteArray(bytes)`.
- `BodyPublishers.ofFile(path)` — upload from file.
- `BodyPublishers.ofInputStream(supplier)` — stream upload.

### Headers and methods
```java
HttpRequest.newBuilder()
    .uri(uri)
    .header("Authorization", "Bearer " + token)
    .header("X-Custom", "value")
    .timeout(Duration.ofSeconds(5))
    .PUT(HttpRequest.BodyPublishers.ofString(body))
    .DELETE()
    .method("PATCH", BodyPublishers.ofString(body))
    .build();
```

### HTTP/2
The client uses HTTP/2 by default when the server supports it. To force:
```java
HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_2)
    .build();
```

### Authentication
```java
HttpClient client = HttpClient.newBuilder()
    .authenticator(new Authenticator() {
        @Override
        protected PasswordAuthentication getPasswordAuthentication() {
            return new PasswordAuthentication("user", "pass".toCharArray());
        }
    })
    .build();
```

For Bearer tokens, just set the header.

### Cookies
```java
HttpClient client = HttpClient.newBuilder()
    .cookieHandler(new CookieManager())
    .build();
```

### When to use other libraries
- **OkHttp** — popular for Android, slightly nicer API.
- **Apache HttpClient** — feature-rich, mature.
- **Spring's RestClient** (Spring Boot 3.2+) — if you're in Spring.
- **Spring's WebClient** — reactive (less needed with virtual threads).

For pure Java, the built-in `HttpClient` is fine for most needs in 2026.

---

## 7. Sockets

For raw TCP/UDP. Most apps don't need this — HTTP, gRPC, or message queues do the heavy lifting.

### TCP client
```java
try (Socket socket = new Socket("example.com", 80)) {
    var out = new PrintWriter(socket.getOutputStream(), true);
    var in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
    
    out.println("GET / HTTP/1.0");
    out.println("Host: example.com");
    out.println();
    
    String line;
    while ((line = in.readLine()) != null) {
        System.out.println(line);
    }
}
```

### TCP server
```java
try (ServerSocket server = new ServerSocket(8080)) {
    while (true) {
        Socket client = server.accept();
        Thread.startVirtualThread(() -> handle(client));
    }
}

void handle(Socket client) {
    try (client; var in = new BufferedReader(new InputStreamReader(client.getInputStream()));
         var out = new PrintWriter(client.getOutputStream(), true)) {
        // ...
    } catch (IOException e) {
        log.warn("client error", e);
    }
}
```

With virtual threads, thread-per-client is fine.

### UDP
```java
try (DatagramSocket socket = new DatagramSocket()) {
    byte[] data = "hello".getBytes();
    DatagramPacket packet = new DatagramPacket(
        data, data.length,
        InetAddress.getByName("example.com"), 12345);
    socket.send(packet);
}
```

UDP is connectionless — no handshake, no ordering, no delivery guarantee. Use for telemetry, multimedia, DNS-style protocols.

### NIO sockets (advanced)
For very high concurrency (or pre-virtual-threads era), NIO selectors:
```java
Selector selector = Selector.open();
ServerSocketChannel server = ServerSocketChannel.open();
server.bind(new InetSocketAddress(8080));
server.configureBlocking(false);
server.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    selector.select();
    for (var key : selector.selectedKeys()) { ... }
}
```

Used by Netty, the JDK's HTTP server, etc. Rarely needed in application code now that virtual threads exist.

---

## 8. JSON Serialization (Jackson)

The de facto JSON library. Spring Boot includes it by default.

```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.18.2</version>
</dependency>
```

### Basic usage
```java
import com.fasterxml.jackson.databind.ObjectMapper;

ObjectMapper mapper = new ObjectMapper();

// Object to JSON
record User(long id, String name, String email) {}
User user = new User(1, "Alice", "a@x.com");
String json = mapper.writeValueAsString(user);
// {"id":1,"name":"Alice","email":"a@x.com"}

// JSON to object
User parsed = mapper.readValue(json, User.class);
```

Jackson works with records out of the box (Java 14+).

### Pretty printing
```java
String pretty = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(user);
```

### Reading and writing files
```java
mapper.writeValue(new File("user.json"), user);
User u = mapper.readValue(new File("user.json"), User.class);
```

### Lists and maps
```java
List<User> users = mapper.readValue(json, new TypeReference<List<User>>() {});
Map<String, User> map = mapper.readValue(json, new TypeReference<>() {});
```

`TypeReference` works around type erasure for generic types.

### Common modules
```xml
<!-- For Java 8 date/time types -->
<dependency>
    <groupId>com.fasterxml.jackson.datatype</groupId>
    <artifactId>jackson-datatype-jsr310</artifactId>
</dependency>
```

```java
ObjectMapper mapper = new ObjectMapper()
    .registerModule(new JavaTimeModule())
    .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
```

### Customizing serialization
```java
public class User {
    @JsonProperty("user_id")    // JSON field name
    private long id;
    
    @JsonProperty("display_name")
    private String name;
    
    @JsonIgnore
    private String password;     // not serialized
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthday;
}
```

### `ObjectMapper` is thread-safe
Reuse a single instance per application. Configure once.
```java
@Configuration
public class JacksonConfig {
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    }
}
```

### Streaming Jackson
For huge JSON, use the streaming API:
```java
try (JsonParser parser = mapper.getFactory().createParser(file)) {
    while (parser.nextToken() != null) {
        // token-by-token processing
    }
}
```

Or `mapper.readValues` for streams of objects:
```java
try (var iter = mapper.readerFor(User.class).readValues(file)) {
    while (iter.hasNext()) {
        User u = iter.next();
        // process
    }
}
```

### Alternatives
- **Gson** — Google's JSON library. Simpler API, no annotations needed for basic use. Slower than Jackson.
- **Moshi** — from Square. Designed for Kotlin but works for Java.
- **JSON-B** (Jakarta) — standard API, less common.

For most Java projects: Jackson.

---

## 9. Java Serialization (Avoid)

Java has a built-in serialization mechanism (`Serializable`, `ObjectOutputStream`). **Don't use it.**

### Why avoid
- **Security**: a classic source of remote code execution vulnerabilities.
- **Versioning**: tied to exact class shapes; refactoring breaks old data.
- **Bloated**: binary format includes class metadata.
- **Non-portable**: Java-only.

### What to use instead
- **JSON** (Jackson) — for human-readable data and interop.
- **Protobuf** — for compact binary, cross-language.
- **MessagePack** — compact JSON-like binary.
- **Avro** — for big-data ecosystems.
- **CBOR** — newer binary JSON-like format.

If you absolutely must use Java serialization (legacy interop), set a serialFilter:
```java
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter("com.example.*;!*");
ObjectInputStream ois = new ObjectInputStream(in);
ois.setObjectInputFilter(filter);
```

For new code: don't use it.

---

## 10. Common Patterns

### Read config from file
```java
public Config loadConfig(Path path) throws IOException {
    String json = Files.readString(path);
    return mapper.readValue(json, Config.class);
}
```

### Process CSV
```java
try (var lines = Files.lines(path)) {
    List<User> users = lines
        .skip(1)    // header
        .map(line -> line.split(","))
        .map(parts -> new User(
            Long.parseLong(parts[0]),
            parts[1],
            parts[2]))
        .toList();
}
```

For real CSV (with quoted values, escapes), use **Apache Commons CSV** or **OpenCSV**.

### Download a file
```java
HttpRequest req = HttpRequest.newBuilder(URI.create(url)).build();
HttpResponse<Path> resp = client.send(req,
    HttpResponse.BodyHandlers.ofFile(Path.of("download.zip")));
```

### Upload a file
```java
HttpRequest req = HttpRequest.newBuilder(uri)
    .POST(HttpRequest.BodyPublishers.ofFile(Path.of("upload.zip")))
    .header("Content-Type", "application/zip")
    .build();
```

### Multipart upload (manual)
The HTTP client doesn't have built-in multipart. Construct manually or use OkHttp:
```java
// Build multipart body string with boundary
String boundary = "----" + UUID.randomUUID();
String body = "--" + boundary + "\r\n" +
    "Content-Disposition: form-data; name=\"file\"; filename=\"data.txt\"\r\n" +
    "\r\n" +
    "content here\r\n" +
    "--" + boundary + "--";

HttpRequest req = HttpRequest.newBuilder(uri)
    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();
```

Annoying. Use OkHttp or Apache HttpClient for multipart-heavy code.

### Retry HTTP request
```java
HttpResponse<String> resp = null;
Exception last = null;
for (int i = 0; i < 3; i++) {
    try {
        resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() < 500) break;
    } catch (Exception e) {
        last = e;
    }
    Thread.sleep((long) (Math.pow(2, i) * 100));
}
if (resp == null) throw new RuntimeException("retry failed", last);
```

For production: Resilience4j.

### Iterate over filesystem
```java
try (Stream<Path> walk = Files.walk(root)) {
    walk.filter(Files::isRegularFile)
        .filter(p -> p.toString().endsWith(".java"))
        .forEach(this::process);
}
```

### Watch a file for changes
Polling via mtime:
```java
FileTime last = Files.getLastModifiedTime(path);
while (true) {
    Thread.sleep(1000);
    FileTime current = Files.getLastModifiedTime(path);
    if (current.compareTo(last) > 0) {
        reload();
        last = current;
    }
}
```

Or use WatchService (section 2) for event-driven watching.

### Lock a file
```java
try (var channel = FileChannel.open(path, StandardOpenOption.WRITE);
     var lock = channel.tryLock()) {
    if (lock != null) {
        // got exclusive lock
    }
}
```

File locks are advisory on some OSes; check your platform.

### Get the user's home directory
```java
Path home = Path.of(System.getProperty("user.home"));
```

### Get the working directory
```java
Path cwd = Path.of("").toAbsolutePath();
// Or:
Path cwd2 = Path.of(System.getProperty("user.dir"));
```

### Resolve a classpath resource
For files inside the JAR / classpath:
```java
try (var in = getClass().getResourceAsStream("/config.properties")) {
    // in is null if not found
    Properties props = new Properties();
    props.load(in);
}
```

In Spring: `ClassPathResource("config.properties")`.

### Get environment variables
```java
String dbUrl = System.getenv("DATABASE_URL");
String port = System.getenv().getOrDefault("PORT", "8080");
```

System properties (set via `-Dkey=value`):
```java
String prop = System.getProperty("my.config");
```

In Spring, use `@Value("${database.url}")` and configuration files.

---

That covers I/O. Java's I/O has both legacy (`File`, `FileInputStream`) and modern (`Path`, `Files`, `HttpClient`) APIs. Stick to the modern ones — they're cleaner, safer, and more capable.

Next: where the data lives — `10_databases.md`.
