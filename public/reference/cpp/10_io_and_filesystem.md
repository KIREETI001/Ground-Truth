# 10. I/O and Filesystem

> Streams (`std::cout`, `<fstream>`), `<filesystem>`, file I/O, and a networking overview.

> C++ doesn't have a built-in networking library yet (it's in progress for C++26+). Use third-party for that.

---

## Table of Contents

1. [Console I/O](#1-console-io)
2. [File I/O](#2-file-io)
3. [String Streams](#3-string-streams)
4. [Formatted Output with `std::format` (C++20)](#4-formatted-output-with-stdformat-c20)
5. [The Filesystem Library (C++17)](#5-the-filesystem-library-c17)
6. [Reading and Writing Binary](#6-reading-and-writing-binary)
7. [The "Why are streams like this" Aside](#7-the-why-are-streams-like-this-aside)
8. [Networking — the Landscape](#8-networking--the-landscape)
9. [JSON in C++](#9-json-in-c)
10. [Common Patterns](#10-common-patterns)

---

## 1. Console I/O

```cpp
#include <iostream>

std::cout << "Hello, world!\n";
std::cerr << "An error\n";        // unbuffered
std::clog << "A log message\n";    // buffered

int x;
std::cin >> x;
std::string s;
std::cin >> s;     // whitespace-delimited
std::getline(std::cin, s);    // whole line
```

### Stream operators
- `operator<<` for output.
- `operator>>` for input.
- Chained: `std::cout << "x = " << x << "\n";`.

### Manipulators
```cpp
#include <iomanip>

std::cout << std::fixed << std::setprecision(2) << 3.14159;   // 3.14
std::cout << std::hex << 255;                                    // ff
std::cout << std::setw(10) << "hi";                                // right-padded to 10
std::cout << std::left << std::setw(10) << "hi";                    // left-padded
std::cout << std::boolalpha << true;                                  // "true" not 1
std::cout << "\n";    // or std::endl, but that flushes too — usually slower
```

`std::endl` flushes the buffer; `'\n'` doesn't. Use `'\n'` unless you need to flush.

### Synchronization with C stdio
By default, `std::cout` is synchronized with C's `printf` — adds overhead. For pure C++ I/O:
```cpp
std::ios_base::sync_with_stdio(false);
std::cin.tie(nullptr);    // don't flush cout before cin
```

Common in competitive programming for speed.

### Reading input
```cpp
int n;
std::cin >> n;

std::string word;
std::cin >> word;     // up to whitespace

std::string line;
std::getline(std::cin, line);

// Multiple
int a, b;
std::cin >> a >> b;
```

### Checking failure
```cpp
if (std::cin >> n) {
    // successfully read
} else {
    // failed
    std::cin.clear();    // clear error
    std::cin.ignore(...);    // skip bad input
}
```

### Mixed `>>` and `getline`
```cpp
int n;
std::cin >> n;             // reads number, leaves \n in buffer
std::string line;
std::getline(std::cin, line);    // reads empty line!
std::cin.ignore();     // skip the leftover \n first
```

A common gotcha — `>>` doesn't consume trailing whitespace; `getline` reads until `\n`.

---

## 2. File I/O

```cpp
#include <fstream>

// Writing
std::ofstream out("output.txt");
if (!out) {
    std::cerr << "Can't open\n";
    return 1;
}
out << "Hello, file!\n";
out << 42 << " " << 3.14 << "\n";
out.close();    // or destructor closes

// Reading
std::ifstream in("input.txt");
std::string line;
while (std::getline(in, line)) {
    std::cout << line << "\n";
}

// Reading word by word
std::string word;
while (in >> word) { ... }

// Reading whole file
std::ifstream f("file.txt");
std::string contents((std::istreambuf_iterator<char>(f)),
                       std::istreambuf_iterator<char>());
```

### Reading a whole file (C++23)
```cpp
// Not in C++23 std lib yet — workarounds:
std::ifstream f("file.txt", std::ios::binary);
std::stringstream ss;
ss << f.rdbuf();
std::string contents = ss.str();
```

### `std::fstream` for both
```cpp
std::fstream f("file.txt", std::ios::in | std::ios::out | std::ios::app);
```

### Open modes
```cpp
std::ios::in       // read
std::ios::out       // write
std::ios::app        // append
std::ios::ate         // start at end
std::ios::trunc        // truncate (default for ofstream)
std::ios::binary       // binary (no text mode conversions)
```

Combine with `|`:
```cpp
std::ofstream out("log.txt", std::ios::app);    // append mode
```

### Closing
RAII — the destructor closes. Or call `.close()` manually:
```cpp
{
    std::ofstream out("file.txt");
    out << "data";
}    // closed here
```

### Error checking
```cpp
std::ifstream f("missing.txt");
if (!f) {
    std::cerr << "Failed to open\n";
}

if (f.fail()) { ... }
if (f.eof()) { ... }
if (f.bad()) { ... }
```

### C++23 alternatives
`<print>` adds `std::print` / `std::println`:
```cpp
#include <print>
std::print("Hello, {}!\n", name);
std::println("x = {}", x);    // adds newline
```

---

## 3. String Streams

In-memory streams. For formatting and parsing.

```cpp
#include <sstream>

// Build a string with formatting
std::ostringstream oss;
oss << "x = " << 42 << ", pi = " << 3.14;
std::string s = oss.str();

// Parse a string
std::istringstream iss("42 3.14 hello");
int n;
double d;
std::string w;
iss >> n >> d >> w;

// Split by whitespace
std::istringstream tokens("one two three four");
std::vector<std::string> result;
std::string token;
while (tokens >> token) result.push_back(token);
```

### `std::stringstream` for both directions.

In modern code, `std::format` (C++20) often replaces output stringstreams. For parsing, stringstream still works.

---

## 4. Formatted Output with `std::format` (C++20)

```cpp
#include <format>

std::string s = std::format("Hello, {}!", name);
std::string r = std::format("x = {}, y = {}", x, y);
std::string p = std::format("{:.2f}", 3.14159);    // "3.14"
std::string w = std::format("{:>10}", "right");     // right-aligned width 10
std::string h = std::format("{:#x}", 255);            // "0xff"
```

Like Python's `str.format` or C's `printf`, but type-safe.

### Format specifiers
```
{:[fill][align][sign][#][0][width][.precision][type]}
```

Common types:
- `d` — integer.
- `b` — binary.
- `o` — octal.
- `x` / `X` — hex.
- `f` — fixed-point.
- `e` / `E` — scientific.
- `g` — general.
- `s` — string.
- `c` — character.

Align: `<` left, `>` right, `^` center.

### Examples
```cpp
std::format("{:08.3f}", 3.14);       // "0003.140"
std::format("{:,}", 1000000);         // "1,000,000" (C++23+)
std::format("{:+}", 5);                // "+5"
std::format("{:#b}", 10);               // "0b1010"
```

### `std::print` (C++23)
```cpp
#include <print>
std::print("x = {}, y = {}\n", x, y);
std::println("x = {}", x);    // auto-newline
```

Modern C++ output. Eventually obsoletes stream operators for most uses.

### Format custom types
```cpp
struct Point { int x, y; };

template<>
struct std::formatter<Point> {
    constexpr auto parse(format_parse_context& ctx) { return ctx.begin(); }
    
    auto format(const Point& p, format_context& ctx) const {
        return std::format_to(ctx.out(), "({}, {})", p.x, p.y);
    }
};

Point p{1, 2};
std::print("{}\n", p);    // "(1, 2)"
```

---

## 5. The Filesystem Library (C++17)

```cpp
#include <filesystem>
namespace fs = std::filesystem;
```

### Paths
```cpp
fs::path p = "/home/user/file.txt";
fs::path p2 = "C:\\Users\\me\\file.txt";    // Windows
fs::path p3 = fs::path("home") / "user" / "file.txt";    // operator/

p.filename();         // "file.txt"
p.stem();             // "file"
p.extension();         // ".txt"
p.parent_path();        // "/home/user"
p.root_path();           // "/" (or "C:\\")
p.is_absolute();
p.string();              // platform-specific string
```

### Existence and types
```cpp
fs::exists(p);
fs::is_regular_file(p);
fs::is_directory(p);
fs::is_symlink(p);
fs::is_empty(p);    // for directories
```

### Metadata
```cpp
auto size = fs::file_size(p);
auto modified = fs::last_write_time(p);
auto perms = fs::status(p).permissions();
```

### Operations
```cpp
fs::create_directory(p);
fs::create_directories(p);         // recursive (mkdir -p)
fs::remove(p);                       // delete
fs::remove_all(p);                    // recursive
fs::copy(src, dst);
fs::copy(src, dst, fs::copy_options::recursive | fs::copy_options::overwrite_existing);
fs::rename(src, dst);
fs::current_path();                    // working dir
fs::current_path("/some/path");         // change working dir
fs::temp_directory_path();
fs::canonical(p);                       // resolve symlinks, get absolute
fs::absolute(p);
```

### Iterating directories
```cpp
for (const auto& entry : fs::directory_iterator("/some/dir")) {
    std::cout << entry.path() << "\n";
}

for (const auto& entry : fs::recursive_directory_iterator("/some/dir")) {
    if (entry.is_regular_file()) {
        std::cout << entry.path() << " " << entry.file_size() << "\n";
    }
}
```

### Error handling
Most functions throw `std::filesystem::filesystem_error` on failure. Or use `error_code` overloads:
```cpp
std::error_code ec;
fs::create_directory("/some/path", ec);
if (ec) {
    std::cerr << ec.message() << "\n";
}
```

### Note on file_time_type
`fs::last_write_time` returns `fs::file_time_type`, not `std::chrono::system_clock::time_point`. Conversion is awkward pre-C++20. C++20 added `std::chrono::clock_cast` to help.

---

## 6. Reading and Writing Binary

```cpp
std::ofstream out("data.bin", std::ios::binary);
int values[] = {1, 2, 3, 4, 5};
out.write(reinterpret_cast<const char*>(values), sizeof(values));

std::ifstream in("data.bin", std::ios::binary);
int read_values[5];
in.read(reinterpret_cast<char*>(read_values), sizeof(read_values));
```

**Use `std::ios::binary`** on Windows to disable text mode conversions (`\n` ↔ `\r\n`).

### Reading whole file as bytes
```cpp
std::ifstream f("file.bin", std::ios::binary | std::ios::ate);
auto size = f.tellg();
f.seekg(0);

std::vector<char> buffer(size);
f.read(buffer.data(), size);
```

### Byte order
C++ doesn't dictate endianness. For network protocols / cross-platform binary formats:
```cpp
#include <bit>     // C++20

uint32_t value = 0x12345678;
if constexpr (std::endian::native == std::endian::little) {
    // swap bytes if writing big-endian format
}
```

For serious binary formats, use a library (Protocol Buffers, FlatBuffers, MessagePack).

### `std::byte` (C++17)
Type-safe bytes:
```cpp
#include <cstddef>

std::byte b{0xFF};
b = b | std::byte{0x0F};    // works
// Won't compile: implicit conversions like (int)b — must cast explicitly
```

Better than `char` or `unsigned char` for byte-oriented data.

---

## 7. The "Why are streams like this" Aside

C++ streams (iostreams) are widely criticized:
- **Slow** compared to alternatives.
- **Verbose** (`std::cout << ... <<` everywhere).
- **Stateful** (manipulators like `std::hex` stick around).
- **Error handling is awkward** (must check stream state).
- **Locale-dependent** behavior.

C++20's `std::format` and C++23's `std::print` are the modern alternative — type-safe like streams, fast like `printf`, ergonomic like Python.

In new code:
- For formatting: `std::format`.
- For console output: `std::print` / `std::println`.
- For files: streams are still fine, or use C APIs if performance matters.
- For binary: streams in binary mode, or libraries.

In legacy / library code, you'll see streams everywhere. Both styles coexist.

---

## 8. Networking — the Landscape

C++ has no networking in the standard library yet.

### Options
- **Boost.Asio / standalone Asio** — the de facto choice for cross-platform networking. Async, coroutine-friendly.
- **Boost.Beast** — HTTP/WebSocket on top of Asio.
- **cpp-httplib** — single-header HTTP client/server.
- **libcurl** — C library, ubiquitous.
- **gRPC** — for RPC.
- **drogon**, **crow**, **oat++** — C++ web frameworks (modern, async).

### Simple HTTP with cpp-httplib
```cpp
#include "httplib.h"

// Client
httplib::Client cli("https://api.example.com");
auto res = cli.Get("/users/42");
if (res && res->status == 200) {
    std::cout << res->body;
}

// Server
httplib::Server svr;
svr.Get("/hello", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("Hello, world!", "text/plain");
});
svr.listen("0.0.0.0", 8080);
```

Header-only, simple. Good for tools and small services.

### Boost.Asio
The serious choice. Async I/O, supports coroutines, used in production.

```cpp
#include <boost/asio.hpp>
namespace asio = boost::asio;

asio::io_context io;
asio::ip::tcp::resolver resolver(io);
auto endpoints = resolver.resolve("example.com", "80");
asio::ip::tcp::socket socket(io);
asio::connect(socket, endpoints);

std::string request = "GET / HTTP/1.0\r\nHost: example.com\r\n\r\n";
asio::write(socket, asio::buffer(request));

std::string response;
asio::read(socket, asio::dynamic_buffer(response), asio::transfer_all());
```

Steeper learning curve. Best resource: the Asio docs and Christopher Kohlhoff's tutorials.

### Networking TS / C++26
A networking proposal based on Asio has been in flight for years. C++26 may finally include it.

---

## 9. JSON in C++

No standard JSON support. Common libraries:

### nlohmann/json
The most popular. Header-only.
```cpp
#include <nlohmann/json.hpp>
using json = nlohmann::json;

// Build
json j = {
    {"name", "Alice"},
    {"age", 30},
    {"hobbies", {"reading", "hiking"}}
};

std::string s = j.dump(4);    // pretty-print with 4-space indent

// Parse
json parsed = json::parse(R"({"name":"Bob","age":25})");
std::string name = parsed["name"];
int age = parsed["age"];

// To/from structs (with macros)
struct User {
    std::string name;
    int age;
};
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(User, name, age);

User u{"Alice", 30};
json j = u;          // serialize
User u2 = j;          // deserialize
```

Convenient. Not the fastest.

### simdjson
Extremely fast JSON parsing (using SIMD instructions).
```cpp
#include <simdjson.h>

simdjson::ondemand::parser parser;
auto json = simdjson::padded_string::load("file.json");
auto doc = parser.iterate(json);
std::string_view name = doc["name"];
int age = doc["age"];
```

For high-throughput parsing.

### RapidJSON, yyjson, etc.
Other options. Pick based on speed vs API preference.

---

## 10. Common Patterns

### Read whole file into string
```cpp
std::string read_file(const std::string& path) {
    std::ifstream f(path);
    if (!f) throw std::runtime_error("can't open " + path);
    return {std::istreambuf_iterator<char>(f), std::istreambuf_iterator<char>()};
}
```

### Write string to file
```cpp
void write_file(const std::string& path, const std::string& content) {
    std::ofstream f(path);
    if (!f) throw std::runtime_error("can't open " + path);
    f << content;
}
```

### Line-by-line processing
```cpp
std::ifstream f("input.txt");
std::string line;
while (std::getline(f, line)) {
    process(line);
}
```

### Split a string by delimiter
No standard split. Common idiom:
```cpp
std::vector<std::string> split(const std::string& s, char delim) {
    std::vector<std::string> tokens;
    std::stringstream ss(s);
    std::string token;
    while (std::getline(ss, token, delim)) {
        tokens.push_back(token);
    }
    return tokens;
}

// C++20 with ranges:
auto parts = s | std::views::split(',') | ...;
```

### Iterate over directory
```cpp
for (const auto& entry : fs::directory_iterator(dir)) {
    if (entry.is_regular_file() && entry.path().extension() == ".txt") {
        process(entry.path());
    }
}
```

### Recursive find files
```cpp
std::vector<fs::path> find_files(const fs::path& root, const std::string& ext) {
    std::vector<fs::path> result;
    for (const auto& entry : fs::recursive_directory_iterator(root)) {
        if (entry.is_regular_file() && entry.path().extension() == ext) {
            result.push_back(entry.path());
        }
    }
    return result;
}
```

### Get file size
```cpp
auto size = fs::file_size(path);
```

### Get last modified time
```cpp
auto t = fs::last_write_time(path);
// Convert to system_clock (C++20):
auto sys = std::chrono::clock_cast<std::chrono::system_clock>(t);
```

### Atomic file write
Write to temp file, then rename:
```cpp
fs::path temp = path;
temp += ".tmp";
{
    std::ofstream f(temp);
    f << content;
}    // flush + close
fs::rename(temp, path);    // atomic on most filesystems
```

### Make a temp file
```cpp
fs::path tmp = fs::temp_directory_path() / "myapp-XXXXXX";
// XXXXXX template — but C++ doesn't have a portable mkstemp equivalent.
// Use:
fs::path tmp = fs::temp_directory_path() / std::to_string(std::random_device{}());
```

For real temp files, use platform APIs (`mkstemp` on POSIX) or libraries.

---

That covers I/O. The C++ stdlib leans heavily on iostreams (which feel old) plus the modern `<format>` / `<print>` (C++20/23) and `<filesystem>` (C++17). Networking is library territory.

Next: the heart of modern C++ — `11_modern_cpp_features.md`.
