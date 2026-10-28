# 08. Dialect Differences

SQL standards exist. Almost no database follows them strictly. This file is a cheat sheet for the differences you'll actually hit when moving between Postgres, MySQL, SQLite, SQL Server, BigQuery, and Snowflake.

If you're writing code for one database, you mostly don't need to know all of this. If you're switching, migrating, or writing portable SQL — this is the survival guide.

---

## Table of Contents

1. [Auto-Incrementing IDs](#auto-incrementing-ids)
2. [Strings: Quoting and Concatenation](#strings-quoting-and-concatenation)
3. [Case Sensitivity](#case-sensitivity)
4. [Date and Time](#date-and-time)
5. [Pagination](#pagination)
6. [Upserts](#upserts)
7. [Returning Inserted/Updated Rows](#returning-insertedupdated-rows)
8. [LIMIT vs TOP vs FETCH](#limit-vs-top-vs-fetch)
9. [String Functions](#string-functions)
10. [Type Casting](#type-casting)
11. [Boolean Type](#boolean-type)
12. [NULL Handling Quirks](#null-handling-quirks)
13. [GROUP BY Strictness](#group-by-strictness)
14. [JSON Support](#json-support)
15. [Array Support](#array-support)
16. [Regular Expressions](#regular-expressions)
17. [Window Functions and CTEs Support](#window-functions-and-ctes-support)
18. [Identifier Quoting](#identifier-quoting)
19. [Comments](#comments)
20. [The Cloud Warehouses (BigQuery, Snowflake)](#the-cloud-warehouses-bigquery-snowflake)

---

## Auto-Incrementing IDs

### PostgreSQL

```sql
-- Modern (preferred)
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY

-- Older
id BIGSERIAL PRIMARY KEY    -- equivalent to BIGINT + sequence
```

### MySQL

```sql
id BIGINT AUTO_INCREMENT PRIMARY KEY
```

### SQLite

```sql
id INTEGER PRIMARY KEY   -- becomes the rowid; auto-increments
-- Or explicit:
id INTEGER PRIMARY KEY AUTOINCREMENT
```

Note: `AUTOINCREMENT` in SQLite has subtle differences (guarantees monotonically increasing). Plain `INTEGER PRIMARY KEY` is usually enough.

### SQL Server

```sql
id BIGINT IDENTITY(1, 1) PRIMARY KEY
-- Or
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY    -- SQL Server 2022+
```

`IDENTITY(seed, increment)` — start value and step.

### Oracle

```sql
id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY    -- 12c+
-- Older: use SEQUENCE + trigger
```

### BigQuery / Snowflake

BigQuery: no built-in auto-increment. Use `GENERATE_UUID()` for IDs.

Snowflake: `IDENTITY(1, 1)` or `AUTOINCREMENT`.

```sql
-- Snowflake
id NUMBER AUTOINCREMENT PRIMARY KEY
```

---

## Strings: Quoting and Concatenation

### Quoting

| Database | String literal | Identifier (column/table) |
|---|---|---|
| PostgreSQL | `'string'` | `"identifier"` |
| MySQL | `'string'` or `"string"` | `` `identifier` `` (backticks) |
| SQLite | `'string'` | `"identifier"` or `` `identifier` `` |
| SQL Server | `'string'` or `N'unicode'` | `[identifier]` or `"identifier"` |
| Oracle | `'string'` | `"identifier"` |

Use single quotes for strings everywhere. Always.

For identifiers, only quote when necessary (reserved word, spaces, mixed case). And avoid those situations.

### Concatenation

```sql
-- Standard (Postgres, Oracle, SQLite, DB2)
SELECT 'a' || 'b';     -- 'ab'

-- MySQL (|| is OR by default!)
SELECT CONCAT('a', 'b');   -- 'ab'
SELECT 'a' || 'b';          -- 1 (boolean OR of 'a' and 'b', coerced to numbers)

-- SQL Server (older)
SELECT 'a' + 'b';      -- 'ab'

-- Modern portable: CONCAT
SELECT CONCAT('a', 'b');   -- works in MySQL 5.0+, Postgres 9.1+, SQL Server 2012+
```

`CONCAT()` is the safest cross-DB choice. NULL handling differs (some DBs return NULL if any arg is NULL; MySQL/SQL Server skip NULLs in CONCAT).

For Postgres, `||` is the idiom. Switch to `CONCAT()` if writing portable code.

### Escaping quotes

```sql
-- Double up: works everywhere
SELECT 'it''s a test';

-- Postgres E-strings with backslash
SELECT E'it\'s a test';

-- MySQL also accepts backslash escapes by default
SELECT 'it\'s a test';   -- works in MySQL
```

Use parameterized queries in application code. Manual quoting is for ad-hoc SQL only.

---

## Case Sensitivity

### Identifiers (table/column names)

| Database | Default behavior |
|---|---|
| PostgreSQL | Folds unquoted identifiers to lowercase. `"FooBar"` ≠ `FooBar`. |
| MySQL | Depends on OS filesystem and `lower_case_table_names` setting. |
| SQLite | Case-insensitive. |
| SQL Server | Case-insensitive (configurable via collation). |
| Oracle | Folds unquoted to uppercase. |
| BigQuery | Table names case-sensitive; column names case-insensitive. |
| Snowflake | Folds unquoted to uppercase. |

Bottom line: stick to lowercase `snake_case` and you're safe everywhere. Don't quote identifiers.

### String comparisons

```sql
SELECT * FROM users WHERE email = 'Alice@Example.com';
```

- **PostgreSQL**: case-sensitive.
- **MySQL**: depends on column collation (default: case-insensitive).
- **SQLite**: case-sensitive by default; configurable per column.
- **SQL Server**: depends on collation (often case-insensitive default).
- **Oracle**: case-sensitive by default.

For email and similar, store lowercased and compare lowercased, or use a case-insensitive comparison:

```sql
-- Postgres
SELECT * FROM users WHERE LOWER(email) = LOWER('Alice@Example.com');

-- Or use ILIKE for pattern match
SELECT * FROM users WHERE email ILIKE 'alice@example.com';
```

---

## Date and Time

### Current time

```sql
NOW()                  -- Postgres, MySQL
CURRENT_TIMESTAMP      -- standard, works everywhere
GETDATE()              -- SQL Server
SYSUTCDATETIME()       -- SQL Server, UTC
SYSDATE                -- Oracle
CURRENT_DATE           -- standard
```

`CURRENT_TIMESTAMP` is the most portable.

### Time zones

- **Postgres**: `TIMESTAMP WITH TIME ZONE` (TIMESTAMPTZ) stores in UTC and converts on display. `TIMESTAMP` (without TZ) is naive.
- **MySQL**: `TIMESTAMP` is converted to UTC on storage; `DATETIME` is naive. Confusing.
- **SQLite**: no real timestamp type; uses TEXT or INTEGER.
- **SQL Server**: `DATETIMEOFFSET` stores with offset; `DATETIME2` is naive.
- **Oracle**: `TIMESTAMP WITH TIME ZONE`, `TIMESTAMP WITH LOCAL TIME ZONE`.
- **BigQuery**: `TIMESTAMP` is UTC; `DATETIME` is naive.

The recommendation everywhere: store in UTC. In Postgres, use TIMESTAMPTZ. In MySQL, use TIMESTAMP if you trust its TZ handling or DATETIME if you handle TZ in the app.

### Date arithmetic

```sql
-- Postgres
SELECT NOW() + INTERVAL '1 day';
SELECT NOW() - INTERVAL '1 week';
SELECT NOW() + INTERVAL '1 month 3 days';

-- MySQL
SELECT DATE_ADD(NOW(), INTERVAL 1 DAY);
SELECT DATE_SUB(NOW(), INTERVAL 1 WEEK);

-- SQL Server
SELECT DATEADD(DAY, 1, GETDATE());
SELECT DATEADD(WEEK, -1, GETDATE());

-- SQLite
SELECT DATE('now', '+1 day');
SELECT DATETIME('now', '-1 week');

-- Standard INTERVAL syntax in Postgres / Oracle:
SELECT TIMESTAMP '2024-01-01' + INTERVAL '30' DAY;
```

### Extracting parts

```sql
-- Postgres / standard / Oracle
SELECT EXTRACT(YEAR FROM NOW());
SELECT EXTRACT(MONTH FROM NOW());
SELECT EXTRACT(DOW FROM NOW());     -- day of week

-- MySQL
SELECT YEAR(NOW());
SELECT MONTH(NOW());
SELECT DAYOFWEEK(NOW());

-- SQL Server
SELECT YEAR(GETDATE());
SELECT MONTH(GETDATE());
SELECT DATEPART(WEEKDAY, GETDATE());

-- SQLite
SELECT strftime('%Y', 'now');
SELECT strftime('%m', 'now');
```

### Truncation

```sql
-- Postgres
SELECT DATE_TRUNC('month', NOW());     -- first of month, 00:00
SELECT DATE_TRUNC('day', NOW());
SELECT DATE_TRUNC('hour', NOW());

-- MySQL
SELECT DATE_FORMAT(NOW(), '%Y-%m-01');    -- truncate to month
SELECT DATE(NOW());                        -- truncate to day

-- SQL Server (2019+)
SELECT DATETRUNC(MONTH, GETDATE());

-- BigQuery / Snowflake
SELECT DATE_TRUNC(NOW(), MONTH);
```

### Formatting

```sql
-- Postgres
SELECT TO_CHAR(NOW(), 'YYYY-MM-DD');

-- MySQL
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d');

-- SQL Server
SELECT FORMAT(GETDATE(), 'yyyy-MM-dd');
SELECT CONVERT(VARCHAR, GETDATE(), 23);   -- older syntax, format code 23 = YYYY-MM-DD

-- SQLite
SELECT strftime('%Y-%m-%d', 'now');
```

### Differences in days

```sql
-- Postgres
SELECT EXTRACT(DAY FROM (date2 - date1));
-- or for full days:
SELECT date2 - date1;   -- returns interval

-- MySQL
SELECT DATEDIFF(date2, date1);

-- SQL Server
SELECT DATEDIFF(DAY, date1, date2);

-- BigQuery
SELECT DATE_DIFF(date2, date1, DAY);
```

---

## Pagination

```sql
-- Standard SQL (Postgres, Oracle 12c+, SQL Server 2012+)
SELECT * FROM users ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- Postgres / MySQL / SQLite shorthand
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;

-- SQL Server: TOP (no OFFSET)
SELECT TOP 10 * FROM users ORDER BY id;

-- SQL Server with offset: use OFFSET/FETCH (above)
```

`LIMIT/OFFSET` is the most common in practice. Use the standard `OFFSET/FETCH` for SQL Server.

---

## Upserts

### PostgreSQL / SQLite

```sql
INSERT INTO users (email, name) VALUES ('a@example.com', 'Alice')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;

-- Or ignore conflicts:
INSERT INTO users (email, name) VALUES ('a@example.com', 'Alice')
ON CONFLICT (email) DO NOTHING;
```

### MySQL

```sql
INSERT INTO users (email, name) VALUES ('a@example.com', 'Alice')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Or ignore:
INSERT IGNORE INTO users (email, name) VALUES ('a@example.com', 'Alice');
```

Note: `VALUES(col)` is deprecated in MySQL 8+; use the new `AS new` syntax:

```sql
INSERT INTO users (email, name) VALUES ('a@example.com', 'Alice') AS new
ON DUPLICATE KEY UPDATE name = new.name;
```

### SQL Server

```sql
MERGE INTO users AS target
USING (VALUES ('a@example.com', 'Alice')) AS source(email, name)
ON target.email = source.email
WHEN MATCHED THEN
    UPDATE SET name = source.name
WHEN NOT MATCHED THEN
    INSERT (email, name) VALUES (source.email, source.name);
```

Or just an `IF EXISTS ... ELSE` pattern in T-SQL.

### Oracle

```sql
MERGE INTO users target
USING (SELECT 'a@example.com' AS email, 'Alice' AS name FROM DUAL) source
ON (target.email = source.email)
WHEN MATCHED THEN UPDATE SET target.name = source.name
WHEN NOT MATCHED THEN INSERT (email, name) VALUES (source.email, source.name);
```

The Postgres / SQLite syntax is the most readable. MERGE is more powerful but verbose.

---

## Returning Inserted/Updated Rows

### Postgres / SQLite (3.35+) / MariaDB / Oracle / SQL Server

```sql
INSERT INTO users (name) VALUES ('Alice') RETURNING id, created_at;
UPDATE users SET age = 31 WHERE id = 1 RETURNING *;
DELETE FROM orders WHERE id = 5 RETURNING *;
```

SQL Server's syntax: `OUTPUT`:

```sql
INSERT INTO users (name) OUTPUT INSERTED.id, INSERTED.created_at VALUES ('Alice');
```

### MySQL

Doesn't have RETURNING. You get `LAST_INSERT_ID()` for the auto-generated ID, then a separate SELECT:

```sql
INSERT INTO users (name) VALUES ('Alice');
SELECT LAST_INSERT_ID();
```

This is a per-connection value, so it's reliable within a session. But you can't atomically return arbitrary columns from a write.

MariaDB has `RETURNING` since 10.5.

---

## LIMIT vs TOP vs FETCH

Recapping the syntax differences:

```sql
-- LIMIT (Postgres, MySQL, SQLite, others)
SELECT * FROM users LIMIT 10;
SELECT * FROM users LIMIT 10 OFFSET 20;

-- TOP (SQL Server)
SELECT TOP 10 * FROM users;
SELECT TOP 10 PERCENT * FROM users;

-- FETCH (standard / SQL Server / Oracle 12c+)
SELECT * FROM users ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- ROWNUM (older Oracle)
SELECT * FROM (SELECT * FROM users WHERE ROWNUM <= 10);

-- Old MySQL alternate
SELECT * FROM users LIMIT 20, 10;    -- offset 20, take 10 (note order)
```

Standard `FETCH NEXT n ROWS ONLY` is the most portable, but `LIMIT` is more common.

---

## String Functions

| Function | Postgres | MySQL | SQLite | SQL Server | Oracle |
|---|---|---|---|---|---|
| Length | `LENGTH(s)` (chars) | `CHAR_LENGTH(s)` (chars), `LENGTH(s)` (bytes) | `LENGTH(s)` | `LEN(s)` | `LENGTH(s)` |
| Uppercase | `UPPER(s)` | `UPPER(s)` | `UPPER(s)` | `UPPER(s)` | `UPPER(s)` |
| Lowercase | `LOWER(s)` | `LOWER(s)` | `LOWER(s)` | `LOWER(s)` | `LOWER(s)` |
| Substring | `SUBSTRING(s FROM a FOR b)` or `SUBSTR(s, a, b)` | `SUBSTRING(s, a, b)` | `SUBSTR(s, a, b)` | `SUBSTRING(s, a, b)` | `SUBSTR(s, a, b)` |
| Concat | `\|\|` or `CONCAT()` | `CONCAT()` | `\|\|` or `CONCAT` | `+` or `CONCAT()` | `\|\|` or `CONCAT` |
| Position | `POSITION(p IN s)` or `STRPOS(s, p)` | `LOCATE(p, s)` | `INSTR(s, p)` | `CHARINDEX(p, s)` | `INSTR(s, p)` |
| Trim | `TRIM(s)` | `TRIM(s)` | `TRIM(s)` | `LTRIM(RTRIM(s))` or `TRIM(s)` (2017+) | `TRIM(s)` |
| Replace | `REPLACE(s, a, b)` | `REPLACE(s, a, b)` | `REPLACE(s, a, b)` | `REPLACE(s, a, b)` | `REPLACE(s, a, b)` |
| Left N chars | `LEFT(s, n)` | `LEFT(s, n)` | `SUBSTR(s, 1, n)` | `LEFT(s, n)` | `SUBSTR(s, 1, n)` |
| Right N chars | `RIGHT(s, n)` | `RIGHT(s, n)` | `SUBSTR(s, -n)` | `RIGHT(s, n)` | `SUBSTR(s, -n)` |
| Split | `SPLIT_PART(s, delim, n)` | `SUBSTRING_INDEX(s, delim, n)` | (none) | `STRING_SPLIT(s, delim)` (2016+) | `REGEXP_SUBSTR` |
| Aggregate concat | `STRING_AGG(col, delim)` | `GROUP_CONCAT(col)` | `GROUP_CONCAT(col)` | `STRING_AGG(col, delim)` | `LISTAGG(col, delim)` |

`UPPER`, `LOWER`, `REPLACE`, `SUBSTR` are the most portable.

---

## Type Casting

### Standard CAST

```sql
SELECT CAST('123' AS INTEGER);    -- works everywhere
SELECT CAST(123 AS TEXT);
```

### Shorthand

```sql
-- Postgres
SELECT '123'::INTEGER;
SELECT 123::TEXT;

-- SQL Server (older)
SELECT CONVERT(INT, '123');
```

`::` is Postgres-only. `CAST()` is portable.

### Safe casting

When the cast might fail:

```sql
-- Postgres 16+: TRY_CAST equivalent via:
SELECT '123abc'::INTEGER;            -- ERROR
SELECT CASE WHEN '123abc' ~ '^\d+$' THEN '123abc'::INTEGER END;   -- NULL on fail (hack)

-- SQL Server
SELECT TRY_CAST('123abc' AS INT);    -- NULL on fail
SELECT TRY_CONVERT(INT, '123abc');

-- BigQuery
SELECT SAFE_CAST('123abc' AS INT64);    -- NULL on fail
```

Postgres added `pg_input_is_valid()` in 16 for testing input validity without erroring. Older Postgres has no clean equivalent — workarounds vary.

---

## Boolean Type

| Database | BOOLEAN type | TRUE/FALSE values |
|---|---|---|
| PostgreSQL | `BOOLEAN` | `TRUE`/`FALSE`/`NULL` |
| MySQL | `BOOLEAN`/`BOOL` (alias for `TINYINT(1)`) | `TRUE`/`FALSE` are aliases for `1`/`0` |
| SQLite | None (uses INTEGER 0/1) | Stored as integers |
| SQL Server | `BIT` (0, 1, NULL) | Use `1`/`0` |
| Oracle | None until 23ai; use `CHAR(1)` or `NUMBER(1)` historically | `'Y'/'N'` or `1/0` by convention |

```sql
-- Portable: store and compare as 1/0
SELECT * FROM users WHERE is_active = 1;

-- Postgres-native
SELECT * FROM users WHERE is_active;        -- works because is_active IS BOOLEAN
SELECT * FROM users WHERE is_active = TRUE;

-- MySQL works both ways
SELECT * FROM users WHERE is_active = 1;
SELECT * FROM users WHERE is_active = TRUE;     -- TRUE == 1
```

---

## NULL Handling Quirks

NULL behavior is mostly standardized but there are subtle differences:

### `NULL` ordering

```sql
SELECT * FROM users ORDER BY age;
```

- **Postgres**: NULLs last (ascending), first (descending).
- **MySQL**: NULLs first (ascending), last (descending).
- **SQLite / SQL Server**: NULLs first (ascending), last (descending).
- **Oracle**: NULLs last (ascending), first (descending).

Use `NULLS FIRST` / `NULLS LAST` (standard, works in Postgres / Oracle / SQLite / SQL Server 2022+):

```sql
SELECT * FROM users ORDER BY age NULLS LAST;
```

MySQL doesn't support `NULLS FIRST/LAST`. Workaround:

```sql
SELECT * FROM users ORDER BY (age IS NULL), age;    -- forces NULLs last in MySQL
```

### `UNIQUE` with NULLs

- **Postgres / MySQL / SQLite**: NULLs are considered distinct. Multiple NULLs allowed in a UNIQUE column.
- **SQL Server**: NULLs are distinct only by default. With ANSI_NULLS = OFF (legacy), NULLs are equal.

```sql
INSERT INTO users (email) VALUES (NULL), (NULL);
-- Works in Postgres, MySQL, SQLite
-- May fail in SQL Server depending on settings
```

Postgres 15+ allows `UNIQUE NULLS NOT DISTINCT` for SQL Server-like behavior.

### `COUNT(*)` vs `COUNT(col)` with NULLs

Standard everywhere: `COUNT(*)` counts all rows; `COUNT(col)` counts non-NULL values of col.

### Three-valued logic in WHERE

```sql
SELECT * FROM users WHERE country != 'USA';
-- Excludes USA users AND users with NULL country
```

To include NULLs:

```sql
SELECT * FROM users WHERE country != 'USA' OR country IS NULL;
```

Or use IS DISTINCT FROM (Postgres / SQL Server):

```sql
SELECT * FROM users WHERE country IS DISTINCT FROM 'USA';
-- NULLs ARE distinct from 'USA', so they're included
```

---

## GROUP BY Strictness

Standard SQL: every non-aggregated column in SELECT must appear in GROUP BY.

- **Postgres**: enforces this, but with a relaxation: PK columns confer functional dependency, so non-aggregated columns from a table grouped by its PK don't need explicit GROUP BY.
- **MySQL**: by default (5.7+), enforces with `ONLY_FULL_GROUP_BY`. Older MySQL allowed arbitrary columns and returned arbitrary values.
- **SQLite**: lenient.
- **SQL Server**: enforces strictly.
- **Oracle**: enforces strictly.

When porting code from old MySQL, watch for ambiguous GROUP BY queries — they'd be errors elsewhere.

---

## JSON Support

### PostgreSQL

Mature JSON support via `JSON` (text) and `JSONB` (binary).

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    attributes JSONB
);

-- Querying
SELECT attributes->>'name' AS name FROM users;     -- text value
SELECT attributes->'address'->>'city' AS city FROM users;
SELECT * FROM users WHERE attributes @> '{"role": "admin"}';   -- contains
SELECT * FROM users WHERE attributes->>'age' = '30';

-- Indexing
CREATE INDEX idx_attrs ON users USING GIN (attributes);
```

### MySQL

`JSON` type since 5.7. Functions instead of operators:

```sql
SELECT JSON_EXTRACT(attributes, '$.name') FROM users;
SELECT attributes->>'$.name' FROM users;   -- 5.7.13+ shortcut
SELECT * FROM users WHERE JSON_EXTRACT(attributes, '$.role') = 'admin';
```

### SQLite

JSON1 extension (default in modern builds):

```sql
SELECT json_extract(attributes, '$.name') FROM users;
SELECT attributes->>'$.name' FROM users;   -- 3.38+
```

### SQL Server

Functions, no native JSON type until SQL Server 2025 (JSON_TYPE):

```sql
SELECT JSON_VALUE(attributes, '$.name') FROM users;
SELECT JSON_QUERY(attributes, '$.address') FROM users;   -- returns JSON
SELECT * FROM users WHERE JSON_VALUE(attributes, '$.role') = 'admin';
```

### BigQuery / Snowflake

Native JSON types with rich query syntax. Generally Postgres-like.

```sql
-- BigQuery
SELECT JSON_VALUE(attributes, '$.name') FROM users;

-- Snowflake
SELECT attributes:name::STRING FROM users;
```

### Recommendation

If you need JSON in your database, **Postgres has the best support** by a clear margin. JSONB is well-indexed, well-documented, and well-supported by ORMs.

---

## Array Support

### PostgreSQL

First-class array types.

```sql
CREATE TABLE tags (
    id BIGINT PRIMARY KEY,
    keywords TEXT[]
);

INSERT INTO tags (keywords) VALUES (ARRAY['sql', 'database', 'postgres']);

SELECT * FROM tags WHERE 'sql' = ANY(keywords);
SELECT * FROM tags WHERE keywords @> ARRAY['sql'];     -- contains
SELECT UNNEST(keywords) FROM tags;                      -- one row per element
```

### Other databases

MySQL, SQL Server, SQLite, Oracle: no first-class arrays. Workarounds:

- **JSON column**: store as JSON array, query with JSON functions.
- **Separate table**: one row per array element (the "right" relational way).

For Postgres-portable code, prefer the separate-table approach.

---

## Regular Expressions

```sql
-- PostgreSQL
SELECT * FROM users WHERE email ~ '^[a-z]+@';            -- case-sensitive
SELECT * FROM users WHERE email ~* 'gmail\.com$';        -- case-insensitive
SELECT REGEXP_REPLACE(text, 'pattern', 'replacement');
SELECT REGEXP_MATCHES(text, 'pattern');

-- MySQL
SELECT * FROM users WHERE email REGEXP '^[a-z]+@';
SELECT REGEXP_REPLACE(text, 'pattern', 'replacement');     -- 8.0+

-- SQLite
-- Needs the REGEX extension; not always available

-- SQL Server (2025+)
SELECT * FROM users WHERE REGEXP_LIKE(email, '^[a-z]+@');

-- Oracle
SELECT * FROM users WHERE REGEXP_LIKE(email, '^[a-z]+@');
```

Regex syntax is mostly POSIX but with subtle differences. For portable code, lean on `LIKE` when possible.

---

## Window Functions and CTEs Support

| Feature | Postgres | MySQL | SQLite | SQL Server | Oracle | BigQuery | Snowflake |
|---|---|---|---|---|---|---|---|
| Basic window functions | ✓ | 8.0+ | 3.25+ | 2005+ | ✓ | ✓ | ✓ |
| Window frames | ✓ | 8.0+ | 3.28+ | ✓ | ✓ | ✓ | ✓ |
| CTEs | ✓ | 8.0+ | 3.8+ | 2005+ | ✓ | ✓ | ✓ |
| Recursive CTEs | ✓ | 8.0+ | 3.8+ | 2005+ | ✓ | ✓ | ✓ |
| LATERAL joins | ✓ | 8.0+ | 3.39+ | (as CROSS APPLY) | 12c+ | ✓ | ✓ |
| FILTER clause | ✓ | ✗ | 3.30+ | ✗ | ✓ | ✗ | ✗ |
| GROUPING SETS | ✓ | 8.0+ | ✗ | ✓ | ✓ | ✓ | ✓ |
| FULL OUTER JOIN | ✓ | ✗ | 3.39+ | ✓ | ✓ | ✓ | ✓ |

MySQL 8.0 closed many of the historical gaps. Older MySQL (5.x) is missing a lot of modern SQL — if you're stuck on it, expect to work around things.

---

## Identifier Quoting

```sql
-- Standard / Postgres / SQLite / Oracle
SELECT "column name" FROM "table name";

-- MySQL
SELECT `column name` FROM `table name`;

-- SQL Server
SELECT [column name] FROM [table name];
-- or
SELECT "column name" FROM "table name";   -- if QUOTED_IDENTIFIER is ON (default)
```

Best practice: use lowercase snake_case and never quote.

---

## Comments

```sql
-- Single-line comment (all databases)
# Single-line comment (MySQL only)

/* Multi-line
   comment */
```

Single-line `--` works everywhere. Multi-line `/* */` works everywhere. `#` is MySQL-only.

---

## The Cloud Warehouses (BigQuery, Snowflake)

These are OLAP databases — optimized for analytical workloads, not transactional. Different model, mostly different optimizations.

### Things that differ

- **Columnar storage** instead of row-oriented.
- **Pay-per-query (BigQuery) or pay-per-compute (Snowflake)** instead of fixed-size servers.
- **No traditional indexes**; relies on partitioning, clustering, and scan-based optimization.
- **Eventual consistency** for some metadata operations.
- **Updates and deletes are expensive** (often rewrite entire partitions).

### BigQuery quirks

- Table names use backticks: `` `project.dataset.table` ``.
- No traditional primary keys (PK constraint exists in 2024+ but isn't enforced).
- Standard SQL only since 2018; "Legacy SQL" still exists but avoid.
- `STRUCT` and `ARRAY` types for nested data.
- `UNNEST()` flattens arrays.

```sql
-- BigQuery: query with UNNEST
SELECT name, t
FROM users, UNNEST(tags) AS t
WHERE t = 'admin';
```

### Snowflake quirks

- VARIANT type for semi-structured data.
- `:` accessor for VARIANT fields: `data:user.name::STRING`.
- `QUALIFY` clause for filtering on window functions:

```sql
-- Snowflake
SELECT *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY placed_at DESC) AS rn
FROM orders
QUALIFY rn = 1;
```

- Time travel: `SELECT * FROM orders AT(TIMESTAMP => ...)` to query historical state.

### Both have

- Strong window function support.
- Rich date/time functions.
- Geospatial functions.
- Native JSON.
- ML built-ins (BQ ML, Snowflake Cortex).

### What stays the same

Core SQL is the same. SELECT/FROM/WHERE/GROUP BY/JOIN/window functions all work. If you know Postgres SQL, you're 90% of the way to writing BigQuery or Snowflake.

---

## When to care about portability

You probably don't need fully portable SQL. Most applications target one database for life.

You do care about portability when:

- Building an ORM or query library used across databases.
- Maintaining open-source software that should run anywhere.
- Migrating between databases.
- Writing examples for tutorials or documentation.

For application code targeting one DB, **use that DB's idioms**. `RETURNING` in Postgres, `LIMIT` over `FETCH NEXT`, JSONB over generic JSON. Portable SQL is a worse-on-purpose subset; don't write it unless you need to.

---

## Key principles

- **Default to lowercase snake_case identifiers** to avoid quoting issues.
- **Use single quotes for strings**, always.
- **`CONCAT()` is more portable than `||`.** Use `||` in Postgres for ergonomics.
- **`LIMIT` for pagination** in most DBs; `FETCH NEXT` for SQL Server / Oracle.
- **NULL ordering differs** — use `NULLS FIRST/LAST` when it matters (except in MySQL).
- **MySQL 8+ closed many gaps** in window functions, CTEs, OUTER JOIN, and ONLY_FULL_GROUP_BY.
- **Postgres has the strongest standard compliance** and JSON/array support.
- **Cloud warehouses (BigQuery, Snowflake) are dialect cousins** — core SQL is the same; their unique features are around partitioning, semi-structured data, and ML.
- **You don't always need portable SQL.** Optimize for the database you're actually using.

This concludes the SQL guide. Combined with the other six language folders, you have a reference covering the languages most likely to remain widely used through the rest of the decade.

Querying, structuring, joining, aggregating, and indexing data are skills that transfer across every tech stack — and across every change in fashion in the application layer. SQL is durable. Worth knowing well.
