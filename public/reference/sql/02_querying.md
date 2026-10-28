# 02. Querying

`SELECT` is the heart of SQL — how you ask for data. Everything else in SQL exists to support querying. This file covers the core query: pulling rows out of tables, filtering them, sorting them, limiting them, and transforming the results.

---

## Table of Contents

1. [The Basic SELECT](#the-basic-select)
2. [Choosing Columns](#choosing-columns)
3. [WHERE: Filtering Rows](#where-filtering-rows)
4. [Comparison Operators](#comparison-operators)
5. [Logical Operators](#logical-operators)
6. [Pattern Matching: LIKE and Regex](#pattern-matching-like-and-regex)
7. [IN, BETWEEN, ANY, ALL](#in-between-any-all)
8. [NULL Handling](#null-handling)
9. [ORDER BY: Sorting](#order-by-sorting)
10. [LIMIT and OFFSET: Pagination](#limit-and-offset-pagination)
11. [DISTINCT](#distinct)
12. [CASE Expressions](#case-expressions)
13. [String Functions](#string-functions)
14. [Date and Time Functions](#date-and-time-functions)
15. [Math Functions](#math-functions)
16. [Type Conversion](#type-conversion)

---

## The Basic SELECT

```sql
SELECT * FROM users;
```

Reads every column from every row in `users`. `*` means "all columns."

```sql
SELECT name, email FROM users;
```

Reads just the `name` and `email` columns.

### Always avoid `SELECT *` in application code

`SELECT *` is fine in the shell when exploring. In production code, list the columns you actually need:

- **Schema stability** — adding a column to the table won't break code that didn't expect it.
- **Performance** — fewer bytes transferred.
- **Readability** — the query documents what fields the code uses.

```sql
-- ad-hoc exploration: fine
SELECT * FROM users WHERE id = 5;

-- application code: bad
SELECT * FROM users WHERE email = 'alice@example.com';

-- application code: good
SELECT id, name, email, created_at FROM users WHERE email = 'alice@example.com';
```

### Column aliases

Rename a column in the output with `AS`:

```sql
SELECT name AS user_name, email AS user_email FROM users;
```

`AS` is optional but recommended for clarity:

```sql
SELECT name user_name FROM users;  -- works, less readable
```

Aliases are visible only in the result set, not within the query itself (except in `ORDER BY` — see later).

### Expressions in SELECT

You can compute values:

```sql
SELECT
    name,
    age,
    age * 365 AS approximate_days_alive,
    UPPER(name) AS shouty_name
FROM users;
```

Each row gets the computed column.

You can even SELECT without a table (Postgres, MySQL, others):

```sql
SELECT 1 + 1;             -- returns 2
SELECT NOW();             -- current timestamp
SELECT UPPER('hello');    -- returns 'HELLO'
```

Oracle requires the dummy `DUAL` table: `SELECT 1 + 1 FROM DUAL;`. Workaround for portability when needed.

---

## Choosing Columns

```sql
SELECT
    id,
    name,
    email,
    age
FROM users;
```

Standard formatting: one column per line for queries with more than a few columns. Easier to read, easier to diff in version control.

### Table-qualified column names

When joining tables (next file), it's common to prefix columns with the table name:

```sql
SELECT users.name, users.email FROM users;
```

Required when two tables have a column with the same name. Optional otherwise but improves clarity.

### Table aliases

Tables themselves can have aliases:

```sql
SELECT u.name, u.email FROM users AS u;
SELECT u.name, u.email FROM users u;    -- AS is optional
```

Useful for shorter syntax and for self-joins (joining a table to itself).

---

## WHERE: Filtering Rows

`WHERE` filters which rows the query operates on:

```sql
SELECT name, email FROM users WHERE age >= 18;
SELECT * FROM users WHERE email = 'alice@example.com';
SELECT * FROM orders WHERE total > 100;
SELECT * FROM posts WHERE published = TRUE;
```

The expression after `WHERE` is evaluated for each row. Rows where it's TRUE are returned; rows where it's FALSE or NULL are excluded.

### Single quotes for strings

```sql
SELECT * FROM users WHERE name = 'Alice';     -- correct
SELECT * FROM users WHERE name = "Alice";     -- ERROR in most DBs (double quotes are for identifiers)
```

Postgres, SQL Server, SQLite: single quotes for string literals; double quotes for column/table names that need quoting.

MySQL: more lenient, accepts both, but stick to single quotes for portability.

### Escaping quotes in strings

Double up the quote:

```sql
SELECT * FROM books WHERE title = 'It''s a Mystery';
```

Or use `E''` escape strings (Postgres) for backslash escaping:

```sql
SELECT * FROM books WHERE title = E'It\'s a Mystery';
```

In application code, **use parameterized queries** to avoid quoting issues and SQL injection.

---

## Comparison Operators

| Operator | Meaning |
|---|---|
| `=` | Equal to |
| `<>` or `!=` | Not equal to |
| `<` `<=` | Less than, less than or equal |
| `>` `>=` | Greater than, greater than or equal |
| `IS NULL` | Is NULL |
| `IS NOT NULL` | Is not NULL |
| `BETWEEN a AND b` | Between two values (inclusive) |
| `IN (a, b, c)` | In a list of values |
| `LIKE pattern` | Pattern match |

```sql
SELECT * FROM users WHERE age = 30;
SELECT * FROM users WHERE age != 30;
SELECT * FROM users WHERE age < 30;
SELECT * FROM products WHERE price BETWEEN 10 AND 50;
SELECT * FROM users WHERE name IN ('Alice', 'Bob', 'Carol');
```

`<>` and `!=` are synonyms; both work in all major databases. The standard is `<>`.

---

## Logical Operators

```sql
SELECT * FROM users WHERE age >= 18 AND country = 'USA';
SELECT * FROM users WHERE age >= 18 OR is_verified = TRUE;
SELECT * FROM users WHERE NOT is_banned;
```

### Precedence: `NOT` > `AND` > `OR`

```sql
SELECT * FROM users WHERE country = 'USA' OR country = 'UK' AND age >= 18;
-- means
SELECT * FROM users WHERE country = 'USA' OR (country = 'UK' AND age >= 18);
```

Use parentheses to make intent clear:

```sql
SELECT * FROM users WHERE (country = 'USA' OR country = 'UK') AND age >= 18;
```

When in doubt, parenthesize. Saves arguments.

### Three-valued logic

SQL's booleans have three values: TRUE, FALSE, NULL. This makes logical operations subtler than in other languages.

```sql
TRUE AND NULL  → NULL
FALSE AND NULL → FALSE
TRUE OR NULL   → TRUE
FALSE OR NULL  → NULL
NOT NULL       → NULL
```

If a `WHERE` clause produces NULL for a row, that row is excluded (same as if it were FALSE).

This is why `WHERE x != 5` doesn't return rows where `x` is NULL — `NULL != 5` is NULL, not TRUE.

More on this below in NULL handling.

---

## Pattern Matching: LIKE and Regex

### `LIKE`

Pattern matching with wildcards:

- `%` — matches any sequence of characters (including empty).
- `_` — matches exactly one character.

```sql
SELECT * FROM users WHERE name LIKE 'A%';        -- starts with A
SELECT * FROM users WHERE name LIKE '%son';      -- ends with 'son'
SELECT * FROM users WHERE name LIKE '%bert%';    -- contains 'bert'
SELECT * FROM users WHERE name LIKE 'A____';     -- 5 chars starting with A
```

Case-sensitivity:
- **Postgres**: `LIKE` is case-sensitive. Use `ILIKE` for case-insensitive.
- **MySQL**: case-sensitivity depends on collation (default is usually case-insensitive).
- **SQLite**: case-insensitive for ASCII by default, configurable.
- **SQL Server**: case-sensitivity depends on collation.

```sql
SELECT * FROM users WHERE name ILIKE 'a%';       -- Postgres, case-insensitive
```

### Escaping wildcards

To literally match `%` or `_`, escape them:

```sql
SELECT * FROM products WHERE name LIKE '50\%%';  -- "50%" followed by anything (Postgres)
```

Or use `ESCAPE`:

```sql
SELECT * FROM products WHERE name LIKE '50!%%' ESCAPE '!';
```

### Regular expressions

For more complex patterns:

**Postgres** uses `~` (case-sensitive), `~*` (case-insensitive), `!~` (negation):

```sql
SELECT * FROM users WHERE email ~ '^[A-Za-z]+@example\.com$';
SELECT * FROM users WHERE name ~* '^al';                       -- case-insensitive
```

**MySQL** uses `REGEXP` or `RLIKE`:

```sql
SELECT * FROM users WHERE email REGEXP '^[A-Za-z]+@example\\.com$';
```

**SQLite** has no built-in regex but supports it via a function if compiled with the extension.

**SQL Server** uses `LIKE` with limited patterns or external functions; full regex requires SQL Server 2025 or workarounds.

Don't rely on regex for portable queries. Use `LIKE` when possible.

---

## IN, BETWEEN, ANY, ALL

### `IN`

Matches against a list:

```sql
SELECT * FROM users WHERE country IN ('USA', 'UK', 'Canada');
SELECT * FROM orders WHERE status IN ('pending', 'processing', 'shipped');
```

Equivalent to `country = 'USA' OR country = 'UK' OR country = 'Canada'`, just cleaner.

### `NOT IN`

```sql
SELECT * FROM users WHERE country NOT IN ('USA', 'UK');
```

**Watch out**: `NOT IN` with NULL produces surprising results.

```sql
SELECT * FROM users WHERE id NOT IN (1, 2, NULL);
-- Returns NO rows. Because:
--   id NOT IN (1, 2, NULL)
--   = NOT (id = 1 OR id = 2 OR id = NULL)
--   = NOT (FALSE OR FALSE OR NULL)
--   = NOT NULL
--   = NULL
```

If your list might contain NULLs, filter them first or use a different approach.

### `IN` with subquery

```sql
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE total > 100);
```

`IN` can take a subquery returning a list. More on subqueries in `07_advanced_queries.md`.

### `BETWEEN`

Inclusive range:

```sql
SELECT * FROM products WHERE price BETWEEN 10 AND 50;
-- Equivalent to: price >= 10 AND price <= 50
```

Works for dates:

```sql
SELECT * FROM orders WHERE placed_at BETWEEN '2024-01-01' AND '2024-12-31';
```

`BETWEEN` is inclusive on both ends. Be careful with timestamps and dates — see date handling below.

### `ANY` and `ALL` (less common)

```sql
SELECT * FROM products WHERE price > ANY (SELECT price FROM cheap_products);
-- Greater than at least one of them

SELECT * FROM products WHERE price > ALL (SELECT price FROM cheap_products);
-- Greater than all of them
```

Rarely used in practice. Most queries use `IN` and join-based equivalents instead.

---

## NULL Handling

NULL is "unknown" or "missing." It's not 0, not empty string, not false. NULL handling trips people up constantly.

### NULL comparisons

```sql
NULL = NULL    → NULL  (not TRUE!)
NULL = 5       → NULL
NULL != NULL   → NULL
5 + NULL       → NULL
'hello' || NULL → NULL (Postgres) or 'hello' (MySQL with default settings) — varies
```

Almost any operation with NULL gives NULL.

### Testing for NULL

Use `IS NULL` and `IS NOT NULL`:

```sql
SELECT * FROM users WHERE age IS NULL;
SELECT * FROM users WHERE age IS NOT NULL;
SELECT * FROM users WHERE phone IS NULL OR phone = '';   -- treats empty string and NULL the same
```

`= NULL` does NOT work. It returns NULL, which filters everything out.

### `IS DISTINCT FROM`

NULL-safe inequality:

```sql
SELECT * FROM users WHERE old_email IS DISTINCT FROM new_email;
-- Treats NULL as a "value" — NULL IS DISTINCT FROM 'x' is TRUE
-- And NULL IS DISTINCT FROM NULL is FALSE
```

Postgres supports `IS DISTINCT FROM` and `IS NOT DISTINCT FROM`. Useful for comparing values that may be NULL.

### `COALESCE`

Returns the first non-NULL value:

```sql
SELECT COALESCE(nickname, name, 'Anonymous') FROM users;
-- If nickname is NULL, use name. If name is also NULL, use 'Anonymous'.
```

The most useful NULL-handling function. Takes any number of arguments.

### `NULLIF`

Returns NULL if two values are equal, otherwise returns the first:

```sql
SELECT NULLIF(rating, 0) FROM reviews;
-- Treat 0 ratings as NULL (e.g., for averaging that should skip them)
```

Less common but occasionally elegant.

### `IFNULL` / `ISNULL` / `NVL`

Vendor-specific shortcuts for `COALESCE` with two arguments:

```sql
-- MySQL
SELECT IFNULL(nickname, name) FROM users;

-- SQL Server
SELECT ISNULL(nickname, name) FROM users;

-- Oracle
SELECT NVL(nickname, name) FROM users;

-- Standard / Postgres / portable
SELECT COALESCE(nickname, name) FROM users;
```

Prefer `COALESCE` for portability.

### Default values in queries

```sql
SELECT
    name,
    COALESCE(email, 'no-email') AS email,
    COALESCE(phone, 'no-phone') AS phone
FROM users;
```

Cleaner output when fields might be NULL.

---

## ORDER BY: Sorting

```sql
SELECT * FROM users ORDER BY name;             -- ascending (default)
SELECT * FROM users ORDER BY age DESC;         -- descending
SELECT * FROM users ORDER BY age DESC, name;   -- age desc, then name asc within ties
```

### Sorting by computed expressions

```sql
SELECT name, age FROM users ORDER BY age * 2;   -- nonsense but legal
SELECT name, LENGTH(name) FROM users ORDER BY LENGTH(name) DESC;
```

### Sort by column alias

```sql
SELECT name, LENGTH(name) AS name_length FROM users ORDER BY name_length DESC;
```

Postgres, MySQL, SQLite allow this. Aliases are usable in `ORDER BY` even though they aren't in `WHERE`.

### Sort by position

```sql
SELECT name, age FROM users ORDER BY 2;       -- sort by 2nd column (age)
```

Works but is fragile — adding/reordering columns breaks the query silently. Avoid in production code.

### `NULLS FIRST` / `NULLS LAST`

```sql
SELECT * FROM users ORDER BY age DESC NULLS LAST;
SELECT * FROM users ORDER BY age ASC NULLS FIRST;
```

Postgres syntax. Useful when you want NULLs grouped together at a specific end.

Default ordering of NULLs:
- Postgres: NULLs come **last** when ascending, **first** when descending.
- MySQL: NULLs come **first** when ascending, **last** when descending. (Reverse of Postgres.)
- SQLite: NULLs come **first** ascending, **last** descending.
- SQL Server: NULLs come **first** ascending, **last** descending.

If the placement of NULLs matters, specify it explicitly.

### Sort is stable but not deterministic

For ties (rows with equal sort keys), the order is undefined. Two runs of the same query can return tied rows in different orders. If you need determinism, add tie-breakers:

```sql
SELECT * FROM users ORDER BY age DESC, id;    -- age first, then id breaks ties
```

This matters for pagination — see next section.

---

## LIMIT and OFFSET: Pagination

### LIMIT

Restrict the number of rows returned:

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

Top 10 newest users.

### OFFSET

Skip rows:

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 20;
```

Rows 21-30 (skip the first 20, take 10).

### Pagination pattern

```sql
-- Page 1
SELECT * FROM users ORDER BY id LIMIT 25;

-- Page 2
SELECT * FROM users ORDER BY id LIMIT 25 OFFSET 25;

-- Page N (1-indexed, page size 25)
SELECT * FROM users ORDER BY id LIMIT 25 OFFSET (N - 1) * 25;
```

### The OFFSET pagination problem

`OFFSET 100000 LIMIT 10` requires the database to scan and discard the first 100,000 rows. This gets slow as offsets grow.

For high-volume pagination, use **keyset pagination** (also called "cursor pagination"):

```sql
-- First page
SELECT * FROM users ORDER BY id LIMIT 25;

-- Next page (after the last id was 100)
SELECT * FROM users WHERE id > 100 ORDER BY id LIMIT 25;

-- Next page (after the last id was 125)
SELECT * FROM users WHERE id > 125 ORDER BY id LIMIT 25;
```

Each page does an indexed seek instead of scanning + discarding. Much faster at scale. Trade-off: can't jump to "page 47" directly.

### SQL Server syntax

SQL Server uses `OFFSET ... FETCH`:

```sql
SELECT * FROM users
ORDER BY id
OFFSET 20 ROWS
FETCH NEXT 10 ROWS ONLY;
```

`LIMIT` doesn't exist in SQL Server. The above is the ANSI-standard syntax (also supported by Postgres for portability).

### Top-N per group

`LIMIT 10` returns 10 rows total, not 10 per group. For that you need window functions — see `07_advanced_queries.md`.

---

## DISTINCT

Removes duplicate rows from the result:

```sql
SELECT DISTINCT country FROM users;
-- Each country listed once, even if many users share it
```

Multi-column DISTINCT — the combination must be distinct:

```sql
SELECT DISTINCT country, city FROM users;
-- Distinct (country, city) pairs
```

### `DISTINCT` is not free

To find duplicates, the database needs to compare rows — either by sorting or hashing. On large result sets this can be expensive. Don't sprinkle `DISTINCT` everywhere; ask why duplicates exist (often a sign of a join or grouping issue) and fix the root cause.

### `DISTINCT ON` (Postgres)

```sql
SELECT DISTINCT ON (user_id) user_id, order_id, total
FROM orders
ORDER BY user_id, placed_at DESC;
```

"For each user_id, return the row with the most recent placed_at." Postgres-only. Cleaner than the equivalent window function for simple cases.

---

## CASE Expressions

Conditional logic inside a query:

```sql
SELECT
    name,
    age,
    CASE
        WHEN age < 13 THEN 'child'
        WHEN age < 20 THEN 'teen'
        WHEN age < 65 THEN 'adult'
        ELSE 'senior'
    END AS age_group
FROM users;
```

CASE evaluates each `WHEN` in order; the first matching branch's value is used. `ELSE` is optional but recommended (without it, no match returns NULL).

### Simple CASE form

When comparing a single expression to multiple values:

```sql
SELECT
    name,
    CASE country
        WHEN 'USA' THEN 'United States'
        WHEN 'UK'  THEN 'United Kingdom'
        WHEN 'DE'  THEN 'Germany'
        ELSE country
    END AS country_full
FROM users;
```

Equivalent to:

```sql
CASE
    WHEN country = 'USA' THEN 'United States'
    WHEN country = 'UK'  THEN 'United Kingdom'
    ...
END
```

### CASE in WHERE, ORDER BY, GROUP BY

```sql
-- WHERE
SELECT * FROM users
WHERE CASE WHEN status = 'premium' THEN created_at < NOW() - INTERVAL '1 year'
           ELSE created_at < NOW() - INTERVAL '6 months'
      END;

-- ORDER BY: custom sort order
SELECT * FROM tasks
ORDER BY CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high'   THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low'    THEN 4
END;
```

Useful for ordering by enum-like fields where alphabetical order isn't what you want.

### CASE for conditional counts (preview of GROUP BY)

```sql
SELECT
    COUNT(CASE WHEN status = 'active'   THEN 1 END) AS active_count,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive_count,
    COUNT(CASE WHEN status = 'banned'   THEN 1 END) AS banned_count
FROM users;
```

Or with `FILTER` (Postgres/SQL standard):

```sql
SELECT
    COUNT(*) FILTER (WHERE status = 'active')   AS active_count,
    COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_count,
    COUNT(*) FILTER (WHERE status = 'banned')   AS banned_count
FROM users;
```

Both work; `FILTER` is cleaner. More in `04_aggregation.md`.

---

## String Functions

The most common ones. Names vary slightly across databases.

### Length

```sql
LENGTH('hello')           -- 5  (Postgres, MySQL, SQLite)
CHAR_LENGTH('hello')      -- 5  (standard)
LEN('hello')              -- 5  (SQL Server)
```

`LENGTH` returns bytes in some databases (MySQL) and characters in others (Postgres counts UTF-8 codepoints with `LENGTH`; byte count is `OCTET_LENGTH`).

### Case conversion

```sql
UPPER('hello')           -- 'HELLO'
LOWER('Hello')           -- 'hello'
INITCAP('hello world')   -- 'Hello World'  (Postgres)
```

### Concatenation

```sql
-- Standard SQL (Postgres, SQLite, Oracle)
SELECT first_name || ' ' || last_name FROM users;

-- MySQL: || is OR by default; use CONCAT
SELECT CONCAT(first_name, ' ', last_name) FROM users;

-- SQL Server: + for strings (or CONCAT)
SELECT first_name + ' ' + last_name FROM users;
SELECT CONCAT(first_name, ' ', last_name) FROM users;
```

`CONCAT()` works in most databases and is portable. Handles NULLs differently per database (some return NULL if any arg is NULL; CONCAT in MySQL/SQL Server skips NULLs).

### Substring

```sql
SUBSTRING('hello world', 1, 5)    -- 'hello' (1-indexed; some dialects)
SUBSTR('hello world', 1, 5)       -- 'hello' (SQLite, Oracle)
LEFT('hello world', 5)            -- 'hello'
RIGHT('hello world', 5)           -- 'world'
```

SQL is mostly 1-indexed for strings, not 0-indexed.

### Trim

```sql
TRIM('  hello  ')           -- 'hello' (both sides)
LTRIM('  hello')            -- 'hello' (left)
RTRIM('hello  ')            -- 'hello' (right)
TRIM('x' FROM 'xxhelloxx')  -- 'hello' (custom char)
```

### Replace

```sql
REPLACE('hello world', 'world', 'SQL')   -- 'hello SQL'
```

### Position / find

```sql
POSITION('w' IN 'hello world')   -- 7  (Postgres, standard)
INSTR('hello world', 'w')        -- 7  (MySQL, SQLite, Oracle)
CHARINDEX('w', 'hello world')    -- 7  (SQL Server)
```

Returns 0 if not found in most dialects.

### Split

```sql
-- Postgres
SPLIT_PART('a,b,c,d', ',', 2)    -- 'b'

-- MySQL
SUBSTRING_INDEX('a,b,c,d', ',', 2)   -- 'a,b'  (first 2 fields)

-- SQL Server (2016+)
STRING_SPLIT('a,b,c,d', ',')         -- returns a table
```

Vendor-specific. Look up the documentation for your DB.

### Format / templating

Postgres has `FORMAT`:

```sql
SELECT FORMAT('Hello, %s! You have %s messages.', name, msg_count) FROM users;
```

Otherwise use concatenation. SQL Server has `FORMAT()` too but with .NET format strings (different syntax).

---

## Date and Time Functions

### Current time

```sql
NOW()                    -- current timestamp (Postgres, MySQL)
CURRENT_TIMESTAMP        -- standard, works everywhere
CURRENT_DATE             -- today's date
CURRENT_TIME             -- current time of day
```

In Postgres, `NOW()` returns the time at the start of the transaction. Use `clock_timestamp()` for the wall clock at the moment of the call.

In SQL Server: `GETDATE()` or `SYSUTCDATETIME()`.

### Date arithmetic

```sql
-- Postgres
SELECT NOW() + INTERVAL '1 day';
SELECT NOW() - INTERVAL '1 week';
SELECT DATE '2024-01-01' + INTERVAL '30 days';

-- MySQL
SELECT DATE_ADD(NOW(), INTERVAL 1 DAY);
SELECT DATE_SUB(NOW(), INTERVAL 1 WEEK);

-- SQL Server
SELECT DATEADD(DAY, 1, GETDATE());
SELECT DATEADD(WEEK, -1, GETDATE());
```

### Extracting parts

```sql
-- Postgres / standard
SELECT EXTRACT(YEAR FROM NOW());
SELECT EXTRACT(MONTH FROM NOW());
SELECT EXTRACT(DOW FROM NOW());        -- day of week (0=Sun)

-- MySQL
SELECT YEAR(NOW());
SELECT MONTH(NOW());
SELECT DAYOFWEEK(NOW());

-- SQL Server
SELECT YEAR(GETDATE());
SELECT DATEPART(WEEKDAY, GETDATE());
```

### Truncating to a unit

```sql
-- Postgres
SELECT DATE_TRUNC('month', NOW());   -- first of this month, 00:00
SELECT DATE_TRUNC('day', NOW());     -- today at midnight
SELECT DATE_TRUNC('hour', NOW());    -- top of the current hour

-- Useful for grouping by time period (next file)
```

### Formatting

```sql
-- Postgres
SELECT TO_CHAR(NOW(), 'YYYY-MM-DD');     -- '2024-03-15'
SELECT TO_CHAR(NOW(), 'Day, Month DD');  -- 'Friday, March 15'

-- MySQL
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d');

-- SQL Server
SELECT FORMAT(GETDATE(), 'yyyy-MM-dd');
```

### Differences

```sql
-- Postgres: subtract timestamps to get interval
SELECT NOW() - created_at AS age FROM users;

-- Or compute in a specific unit
SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_old FROM users;

-- MySQL
SELECT DATEDIFF(NOW(), created_at) AS days_old FROM users;
SELECT TIMESTAMPDIFF(HOUR, created_at, NOW()) AS hours_old FROM users;

-- SQL Server
SELECT DATEDIFF(DAY, created_at, GETDATE()) FROM users;
```

### Time zones (Postgres)

```sql
-- Convert a timestamp to a different time zone
SELECT NOW() AT TIME ZONE 'America/New_York';
SELECT created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/London' FROM users;
```

This is why `TIMESTAMPTZ` matters — Postgres stores it in UTC internally and converts on display. Naive `TIMESTAMP` doesn't know its zone, so conversions are meaningless.

### The date range pitfall

```sql
-- Bug: this misses orders placed on 2024-12-31 after midnight
SELECT * FROM orders
WHERE placed_at BETWEEN '2024-01-01' AND '2024-12-31';
```

`'2024-12-31'` is parsed as `2024-12-31 00:00:00`. Orders later in that day are missed.

Use exclusive end:

```sql
SELECT * FROM orders
WHERE placed_at >= '2024-01-01' AND placed_at < '2025-01-01';
```

Or be explicit:

```sql
SELECT * FROM orders
WHERE placed_at BETWEEN '2024-01-01 00:00:00' AND '2024-12-31 23:59:59.999999';
```

The `>= start AND < next_start` pattern is the safest. It handles midnight, sub-second precision, and time zones consistently.

---

## Math Functions

```sql
ABS(-5)            -- 5
CEIL(4.2)          -- 5  (round up)
FLOOR(4.8)         -- 4  (round down)
ROUND(4.5)         -- 5 (or 4 if banker's rounding in some dialects)
ROUND(3.14159, 2)  -- 3.14
MOD(10, 3)         -- 1   (modulo; also 10 % 3 in many dialects)
POWER(2, 10)       -- 1024
SQRT(16)           -- 4
EXP(1)             -- 2.71828...
LN(2.71828)        -- 1.0
LOG(10, 100)       -- 2  (log base 10 of 100; argument order varies)
```

### Division

Integer division can surprise:

```sql
-- Postgres: integer division truncates
SELECT 7 / 2;      -- 3
SELECT 7.0 / 2;    -- 3.5
SELECT 7 / 2.0;    -- 3.5

-- MySQL: division always returns a decimal
SELECT 7 / 2;      -- 3.5
SELECT 7 DIV 2;    -- 3 (explicit integer division)
```

To avoid bugs, cast or use decimal literals when you want decimal arithmetic:

```sql
SELECT CAST(a AS NUMERIC) / b FROM table;
```

### `GREATEST` / `LEAST`

```sql
SELECT GREATEST(5, 3, 8, 2);    -- 8
SELECT LEAST(5, 3, 8, 2);       -- 2
```

Works on multiple arguments. SQL Server uses scalar `MAX`/`MIN` over sets, not these — workaround with `CASE` or subqueries.

### Random

```sql
-- Postgres
SELECT RANDOM();          -- 0..1 float

-- MySQL
SELECT RAND();

-- SQLite
SELECT abs(random() % 100);   -- random integer 0..99 approximately

-- Random row
SELECT * FROM users ORDER BY RANDOM() LIMIT 1;   -- slow on large tables
```

For large tables, "random row" via `ORDER BY RANDOM()` is expensive — it sorts the whole table. Better:

```sql
-- Postgres
SELECT * FROM users
WHERE id IN (SELECT id FROM users ORDER BY RANDOM() LIMIT 10);

-- Or use tablesample for approximate sampling
SELECT * FROM users TABLESAMPLE BERNOULLI(1);   -- ~1% of rows
```

---

## Type Conversion

### `CAST`

Standard:

```sql
SELECT CAST(age AS TEXT) FROM users;
SELECT CAST('42' AS INTEGER);
SELECT CAST(created_at AS DATE) FROM users;
```

### Postgres shortcut: `::`

```sql
SELECT age::TEXT FROM users;
SELECT '42'::INTEGER;
SELECT created_at::DATE FROM users;
```

Common in Postgres code. Not portable.

### Convert numbers and strings

```sql
SELECT CAST('123' AS INTEGER);    -- 123
SELECT CAST(123 AS TEXT);          -- '123'
SELECT CAST(3.14 AS INTEGER);     -- 3 (truncates) or 3 depending on dialect
```

If the string isn't a valid number, the cast fails (throws an error). To handle gracefully:

```sql
-- Postgres has TRY_CAST in 16+; older versions use CASE / regex
-- SQL Server has TRY_CAST and TRY_CONVERT
SELECT TRY_CAST('not a number' AS INTEGER);   -- returns NULL instead of erroring
```

### Convert to/from JSON

```sql
-- Postgres
SELECT '{"name": "Alice"}'::JSONB;
SELECT '{"name": "Alice"}'::JSONB ->> 'name';   -- 'Alice'
```

### Implicit conversion

Some operations convert automatically:

```sql
SELECT 1 + '2';     -- 3 in MySQL (string→int); error in Postgres
```

Postgres is stricter about types; MySQL is permissive. Stricter is safer. Be explicit with casts when crossing types.

---

## Putting it together

A realistic example query:

```sql
SELECT
    id,
    name,
    email,
    age,
    COALESCE(country, 'Unknown') AS country,
    CASE
        WHEN age < 18 THEN 'minor'
        WHEN age < 65 THEN 'adult'
        ELSE 'senior'
    END AS age_group,
    EXTRACT(YEAR FROM created_at) AS signup_year
FROM users
WHERE
    email IS NOT NULL
    AND (country = 'USA' OR country = 'Canada')
    AND created_at >= '2023-01-01'
    AND created_at <  '2025-01-01'
ORDER BY created_at DESC
LIMIT 100;
```

This query:
- Selects specific columns (not `SELECT *`).
- Computes a derived `age_group` with CASE.
- Coalesces NULL country to 'Unknown'.
- Filters with WHERE: non-null email, restricted country, date range.
- Orders by recency.
- Limits to 100 rows.

That's a fairly typical query for an application or analytics dashboard.

---

## Key principles

- **Avoid `SELECT *` in code.** List columns explicitly.
- **`WHERE` filters rows.** Combine with `AND`, `OR`, `NOT`, and parenthesize when in doubt.
- **NULL is unknown.** Use `IS NULL`, never `= NULL`. NULL propagates through almost all operations.
- **`COALESCE` is your friend** for handling NULLs in display and computation.
- **`ORDER BY` doesn't tie-break deterministically.** Add a unique column to the sort if order matters across runs.
- **`OFFSET` slows down with large offsets.** Use keyset pagination for high-volume cases.
- **`CASE` adds conditional logic.** Useful in `SELECT`, `WHERE`, `ORDER BY`, and aggregates.
- **Date ranges should be `>= start AND < end`,** not `BETWEEN`, to handle midnight cleanly.

Next: joins — combining rows from multiple tables.
