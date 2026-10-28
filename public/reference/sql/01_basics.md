# 01. SQL Basics

The starting point: tables, data types, and the four statements that create and modify them — `CREATE TABLE`, `INSERT`, `UPDATE`, `DELETE`. This is the structural layer before we get to querying.

---

## Table of Contents

1. [Tables: the Core Idea](#tables-the-core-idea)
2. [Data Types](#data-types)
3. [Creating Tables](#creating-tables)
4. [Primary Keys](#primary-keys)
5. [Constraints](#constraints)
6. [Inserting Data](#inserting-data)
7. [Updating Data](#updating-data)
8. [Deleting Data](#deleting-data)
9. [Altering Tables](#altering-tables)
10. [Dropping Tables](#dropping-tables)
11. [Schemas, Databases, Connecting](#schemas-databases-connecting)

---

## Tables: the Core Idea

A table is a collection of rows. Each row has the same columns. Each column has a name and a type.

```
users
+----+--------+---------------------+--------+
| id | name   | email               | age    |
+----+--------+---------------------+--------+
| 1  | Alice  | alice@example.com   | 30     |
| 2  | Bob    | bob@example.com     | 25     |
| 3  | Carol  | carol@example.com   | 42     |
+----+--------+---------------------+--------+
```

That's it. Everything else in SQL — joins, aggregates, indexes — is built on top of this idea.

### Rows vs records vs tuples

Same thing. "Rows" is the common term. The relational model calls them tuples.

### Tables vs relations

In academic usage, a "relation" is roughly what we call a table. In practice, "table" is universal.

### Why this model wins

- **Schema** — every row has the same shape, which makes queries predictable.
- **Joins** — relationships between tables let you avoid duplication.
- **Constraints** — the database enforces rules (uniqueness, foreign keys, types).
- **Transactions** — atomic changes across rows and tables.

---

## Data Types

Every column has a type. The types vary slightly by database, but the major categories are universal.

### Integers

```sql
INTEGER      -- 32-bit signed (range ~ ±2 billion)
BIGINT       -- 64-bit signed (huge)
SMALLINT     -- 16-bit signed
```

Postgres has `SERIAL`, `BIGSERIAL` — auto-incrementing integers. Modern Postgres uses `GENERATED AS IDENTITY` (SQL standard).

MySQL: `INT`, `BIGINT`, with `AUTO_INCREMENT` for auto-incrementing.

SQLite: dynamic typing — `INTEGER` accepts anything that fits. `INTEGER PRIMARY KEY` is the rowid (auto-incrementing).

### Floating point and decimal

```sql
REAL         -- single precision float
DOUBLE PRECISION   -- double precision float (often just DOUBLE)
NUMERIC(p, s)      -- exact decimal: p total digits, s after the decimal point
DECIMAL(p, s)      -- same as NUMERIC
```

`NUMERIC(10, 2)` is what you use for money: 10 total digits, 2 after the decimal. Exact arithmetic, no rounding errors.

Never use float for money. Use `NUMERIC`.

### Strings

```sql
VARCHAR(n)       -- variable-length, max n characters
CHAR(n)          -- fixed-length, padded with spaces (rarely used)
TEXT             -- variable-length, unbounded
```

In Postgres, `TEXT`, `VARCHAR`, and `VARCHAR(n)` have essentially the same performance. Use `TEXT` unless you need the length constraint.

In MySQL, there are differences (`TEXT` is stored differently than `VARCHAR`), and `VARCHAR(255)` is a historical default for many fields.

### Boolean

```sql
BOOLEAN          -- TRUE / FALSE / NULL
```

MySQL lacks a true BOOLEAN — it's `TINYINT(1)` under the hood. SQLite uses 0/1 with no actual bool type. Postgres and SQL Server have proper BOOLEAN.

### Date and time

```sql
DATE             -- 2024-03-15
TIME             -- 14:30:00
TIMESTAMP        -- 2024-03-15 14:30:00 (no timezone)
TIMESTAMP WITH TIME ZONE  -- often abbreviated TIMESTAMPTZ
INTERVAL         -- duration (Postgres)
```

**Always use `TIMESTAMPTZ` for time-of-event data** in Postgres. The non-TZ version stores naive timestamps which lead to bugs across time zones.

MySQL: `DATETIME` is naive; `TIMESTAMP` stores in UTC and converts on read. Subtle and bug-prone.

### JSON

```sql
JSON             -- raw JSON text
JSONB            -- binary JSON (Postgres) — indexed, faster
```

Postgres has both. `JSONB` is what you want — efficient, indexable. MySQL has `JSON` (binary). SQL Server has `NVARCHAR` with JSON functions but no dedicated type.

### Binary

```sql
BYTEA            -- Postgres: byte array
BLOB             -- MySQL/SQLite: binary large object
VARBINARY(n)     -- SQL Server
```

For storing files, hashes, raw bytes.

### Arrays (Postgres)

```sql
INTEGER[]        -- array of integers
TEXT[]           -- array of strings
INTEGER[][]      -- multi-dimensional
```

Postgres has first-class array types. MySQL/SQLite don't.

### UUID

```sql
UUID             -- universally unique identifier (Postgres, SQL Server)
```

A 128-bit ID like `550e8400-e29b-41d4-a716-446655440000`. Used as primary keys when you don't want to leak row counts or need distributed ID generation.

### `NULL`

`NULL` is "unknown" or "missing" — not zero, not empty string. It's its own thing.

`NULL` quirks:
- `NULL = NULL` is **`NULL`** (not true).
- Test with `IS NULL`, `IS NOT NULL`.
- Most operations involving NULL return NULL.
- Aggregate functions usually skip NULL (`COUNT(*)` counts rows; `COUNT(col)` skips NULLs in col).

More on NULL handling in `02_querying.md`.

---

## Creating Tables

```sql
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    age         INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

What's happening:

- `id` — auto-incrementing primary key (Postgres `SERIAL`; equivalent to `INTEGER GENERATED ALWAYS AS IDENTITY`).
- `email` — required (NOT NULL), unique across the table.
- `name` — required.
- `age` — optional (NULL allowed).
- `created_at` — defaults to the time of insert if not specified.

### Modern Postgres syntax (preferred)

```sql
CREATE TABLE users (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    age         INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`GENERATED ALWAYS AS IDENTITY` is the SQL standard equivalent of `SERIAL`. Use it in new code; `SERIAL` works but is older syntax.

### MySQL version

```sql
CREATE TABLE users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    age         INT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`AUTO_INCREMENT` is MySQL's idiom. The `ENGINE=InnoDB` and `CHARSET=utf8mb4` are recommended defaults (InnoDB supports transactions and foreign keys; utf8mb4 supports the full Unicode range including emoji).

### SQLite version

```sql
CREATE TABLE users (
    id          INTEGER PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    age         INTEGER,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

SQLite uses `INTEGER PRIMARY KEY` for auto-increment (it becomes an alias for the rowid). SQLite has no real datetime type — uses TEXT (ISO 8601) or REAL (Julian day) or INTEGER (Unix epoch).

### SQL Server version

```sql
CREATE TABLE users (
    id          BIGINT IDENTITY(1, 1) PRIMARY KEY,
    email       NVARCHAR(255) NOT NULL UNIQUE,
    name        NVARCHAR(255) NOT NULL,
    age         INT,
    created_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

`IDENTITY(1, 1)` — start at 1, increment by 1. `NVARCHAR` is Unicode string. `DATETIME2` is the recommended timestamp type.

### Naming conventions

- **`snake_case`** for table and column names. Postgres folds unquoted names to lowercase; mixed-case requires quoting (`"UserId"`) which is awful.
- **Plural for tables** (`users`, `orders`) or **singular** (`user`, `order`) — pick one and stick with it. I prefer plural; either is defensible.
- **`_id` suffix for foreign keys** — `user_id`, `order_id`.
- **`_at` for timestamps** — `created_at`, `updated_at`.
- **`is_*` or `has_*` for booleans** — `is_active`, `has_subscription`.
- **Avoid reserved words** — `order`, `user`, `group`, `select`. Often legal but require quoting or look weird.

These aren't enforced but make code consistent across teams.

---

## Primary Keys

A primary key uniquely identifies each row.

```sql
CREATE TABLE users (
    id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ...
);
```

Rules:
- Every table should have one.
- Cannot be NULL.
- Must be unique.
- Indexed automatically (this matters — see `05_indexes_and_performance.md`).

### Surrogate vs natural keys

**Surrogate key**: an auto-generated ID with no business meaning (`id`, `user_id`).

**Natural key**: a value with business meaning (email, SSN, ISBN).

Use surrogate keys for primary keys. They're stable, never need to change, and don't expose business semantics. Use natural keys as **unique constraints** when you want to enforce uniqueness on a business-meaningful field:

```sql
CREATE TABLE users (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email  TEXT NOT NULL UNIQUE  -- natural unique constraint
);
```

This separates "is this row the same row?" (PK comparison) from "is this the same email?" (business uniqueness).

### Composite primary keys

A primary key can span multiple columns:

```sql
CREATE TABLE order_items (
    order_id   BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity   INT NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
```

A pair `(order_id, product_id)` is unique. Useful for join tables.

### UUID primary keys

```sql
CREATE TABLE users (
    id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ...
);
```

Pros: distributed ID generation (no DB coordination), don't leak row counts, harder to enumerate.

Cons: larger than integers (16 bytes vs 8), random UUIDs make indexes less efficient (no temporal locality on insert).

For modern systems with distributed workloads, UUIDs are common. UUIDv7 (timestamp-prefixed) addresses the index locality issue and is the recommended UUID variant in 2026 — Postgres 18 added `uuidv7()` built-in.

---

## Constraints

Constraints are rules the database enforces. Violations cause inserts/updates to fail.

### `NOT NULL`

```sql
name TEXT NOT NULL
```

The column must have a value. Insert without it fails (unless there's a default).

### `UNIQUE`

```sql
email TEXT UNIQUE
```

No two rows can have the same value for this column. NULLs typically don't count (multiple NULLs allowed) — except in SQL Server's default behavior.

Multi-column:

```sql
UNIQUE (first_name, last_name, dob)
```

The combination must be unique; individual columns can repeat.

### `CHECK`

A custom validation expression:

```sql
CREATE TABLE products (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name   TEXT NOT NULL,
    price  NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock  INT NOT NULL CHECK (stock >= 0)
);
```

Inserts/updates that violate the expression fail. Useful for sanity checks — non-negative prices, valid email formats (basic regex), etc.

### `DEFAULT`

If a value isn't provided on insert, use this:

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
status     TEXT NOT NULL DEFAULT 'pending',
is_active  BOOLEAN NOT NULL DEFAULT TRUE
```

### `FOREIGN KEY`

References a row in another table:

```sql
CREATE TABLE orders (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    total   NUMERIC(10, 2) NOT NULL,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`user_id` must match some `users.id` value. Deleting that user without first deleting the order will fail (by default).

### Foreign key actions

What to do when the referenced row is deleted or updated:

```sql
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT  -- default
user_id BIGINT REFERENCES users(id) ON DELETE SET NULL
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE SET DEFAULT
```

- `CASCADE` — delete the dependent row too.
- `RESTRICT` / `NO ACTION` — refuse the deletion.
- `SET NULL` — null out the foreign key (column must be nullable).
- `SET DEFAULT` — set to the default value.

Use `CASCADE` carefully. Easy to delete more than you intended.

### Named constraints

You can name constraints to make error messages clearer:

```sql
CREATE TABLE products (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    price NUMERIC(10, 2) NOT NULL,
    CONSTRAINT positive_price CHECK (price >= 0)
);
```

Errors show "violates constraint positive_price" instead of "violates anonymous constraint".

### Multi-table example

```sql
CREATE TABLE users (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name  TEXT NOT NULL
);

CREATE TABLE posts (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title     TEXT NOT NULL,
    body      TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id   BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Delete a user, their posts and comments go too. Delete a post, its comments go too. These cascade rules express the data ownership tree.

---

## Inserting Data

### Basic insert

```sql
INSERT INTO users (email, name, age) VALUES ('alice@example.com', 'Alice', 30);
```

Specify columns, then values in the same order.

### Multi-row insert

```sql
INSERT INTO users (email, name, age) VALUES
    ('alice@example.com', 'Alice', 30),
    ('bob@example.com',   'Bob',   25),
    ('carol@example.com', 'Carol', 42);
```

Faster than three separate `INSERT`s — one statement, one round-trip.

### Insert and return

Postgres / modern SQL Server have `RETURNING`:

```sql
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
RETURNING id, created_at;
```

Returns the inserted row's id (auto-generated) and timestamp. Saves a follow-up `SELECT`.

### Insert from a SELECT

```sql
INSERT INTO archived_users (id, email, name)
SELECT id, email, name FROM users WHERE created_at < '2020-01-01';
```

Useful for migrating data, populating summary tables, etc.

### Upsert (insert or update)

When you want "insert if it doesn't exist, otherwise update":

Postgres / SQLite:

```sql
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
```

`EXCLUDED` refers to the row that would have been inserted.

MySQL:

```sql
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

SQL Server uses `MERGE`, which is more verbose. Many teams use a two-statement pattern instead.

### Ignoring conflicts

```sql
-- Postgres / SQLite
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email) DO NOTHING;

-- MySQL
INSERT IGNORE INTO users (email, name) VALUES ('alice@example.com', 'Alice');
```

Useful for "try to insert, but it's OK if it already exists."

### Default values

Use `DEFAULT` keyword or omit the column:

```sql
-- Both insert a row with default created_at:
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice');
INSERT INTO users (email, name, created_at) VALUES ('alice@example.com', 'Alice', DEFAULT);
```

---

## Updating Data

```sql
UPDATE users SET age = 31 WHERE id = 1;
```

The `WHERE` clause filters which rows to update. **Omitting it updates every row** — a common, terrifying mistake.

### Multiple columns

```sql
UPDATE users SET
    name = 'Alicia',
    age  = 31,
    updated_at = NOW()
WHERE id = 1;
```

### Computed updates

```sql
UPDATE products SET price = price * 1.1 WHERE category = 'electronics';
UPDATE users SET age = age + 1 WHERE id = 1;
```

### Update with returning

```sql
UPDATE users SET age = 31 WHERE id = 1 RETURNING *;
```

Returns the updated row. Postgres feature; MySQL doesn't have this directly (use `SELECT` after).

### Update from another table

```sql
-- Postgres
UPDATE orders
SET total = orders.total - users.discount
FROM users
WHERE orders.user_id = users.id;
```

Pulls values from `users` into the update. MySQL/SQL Server have different syntax for this.

### Avoid the no-WHERE disaster

```sql
UPDATE users SET name = 'Bob';  -- updates EVERY user's name to 'Bob'
```

Always include WHERE. Most teams run UPDATEs inside a transaction so a mistake can be rolled back:

```sql
BEGIN;
UPDATE users SET name = 'Bob' WHERE id = 5;
-- check the result first
COMMIT;
-- or ROLLBACK if it was wrong
```

More on transactions in `06_transactions.md`.

---

## Deleting Data

```sql
DELETE FROM users WHERE id = 1;
```

Same dynamic as UPDATE: a missing WHERE deletes everything.

### Returning deleted rows (Postgres)

```sql
DELETE FROM users WHERE id = 1 RETURNING *;
```

### Delete with subquery

```sql
DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE is_banned);
```

### Delete vs truncate

```sql
DELETE FROM users;     -- removes all rows, logs each (slow on large tables)
TRUNCATE TABLE users;  -- empties the table (fast; some dialects)
```

`TRUNCATE` is faster but has implications:
- Not transactional in some databases (MySQL with non-InnoDB engines).
- Resets auto-increment counters.
- Cannot have a WHERE clause.

Use `DELETE` for general deletes; `TRUNCATE` when emptying a table fully and you understand the implications.

### Soft delete

Many applications don't actually delete rows. Instead they mark them:

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete" a user
UPDATE users SET deleted_at = NOW() WHERE id = 1;

-- Active users
SELECT * FROM users WHERE deleted_at IS NULL;
```

Pros: history retained, can undelete, audit trail.

Cons: every query needs the `WHERE deleted_at IS NULL` filter (easy to forget), data accumulates.

A pragmatic mix: soft-delete for important user-facing entities, hard-delete for logs and ephemeral data.

---

## Altering Tables

After a table exists, you can change it.

### Add a column

```sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;
```

Adding a NOT NULL column without a default fails if rows exist (no value for existing rows). Provide a default or update afterward.

### Drop a column

```sql
ALTER TABLE users DROP COLUMN bio;
```

Permanently destroys data. Be careful.

### Rename

```sql
ALTER TABLE users RENAME TO accounts;
ALTER TABLE users RENAME COLUMN name TO full_name;
```

### Change a type

```sql
ALTER TABLE users ALTER COLUMN age TYPE BIGINT;  -- Postgres syntax
```

Other databases vary. SQLite has limited `ALTER COLUMN` — you typically rebuild the table.

### Add a constraint

```sql
ALTER TABLE users ADD CONSTRAINT positive_age CHECK (age >= 0);
ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
```

### Migrations

In real applications, schema changes happen through **migration tools**: Flyway, Liquibase, Alembic (Python), ActiveRecord migrations (Rails), Knex (Node), Prisma. Each tracks which migrations have been applied and applies new ones in order. Use these instead of running ad-hoc `ALTER TABLE` in production.

---

## Dropping Tables

```sql
DROP TABLE users;
DROP TABLE IF EXISTS users;        -- doesn't error if missing
DROP TABLE users CASCADE;          -- also drops dependent objects (other tables' foreign keys, views)
```

Irreversible. The data is gone.

---

## Schemas, Databases, Connecting

### Database vs schema

A database can contain multiple **schemas** (namespaces for tables). Postgres ships with the `public` schema by default.

```sql
CREATE SCHEMA analytics;

CREATE TABLE analytics.daily_signups (
    day       DATE PRIMARY KEY,
    count     INTEGER NOT NULL
);

SELECT * FROM analytics.daily_signups;
```

Use schemas to group related tables in larger systems (e.g., `public`, `analytics`, `auth`).

MySQL doesn't distinguish schemas from databases — `CREATE SCHEMA` and `CREATE DATABASE` are synonyms.

SQL Server uses schemas heavily (`dbo` is the default).

### Connecting

Connection string format varies by client. Common examples:

```
# Postgres
postgresql://user:password@host:5432/dbname

# MySQL
mysql://user:password@host:3306/dbname

# SQLite
sqlite:///path/to/file.db
```

In a shell:
- `psql postgresql://...` for Postgres.
- `mysql -u user -p dbname` for MySQL.
- `sqlite3 file.db` for SQLite.

### Quick CLI commands you'll want

**psql** (Postgres):
- `\dt` — list tables.
- `\d users` — describe a table.
- `\l` — list databases.
- `\?` — help.
- `\q` — quit.

**MySQL**:
- `SHOW TABLES;`
- `DESCRIBE users;` or `SHOW CREATE TABLE users;`
- `SHOW DATABASES;`
- `exit;`

**SQLite**:
- `.tables`
- `.schema users`
- `.databases`
- `.quit`

---

## Key principles

- **Every table needs a primary key.** Almost always an auto-incrementing integer or UUID.
- **Constraints are free safety.** `NOT NULL`, `UNIQUE`, `CHECK`, `FOREIGN KEY` — the database enforces them so your application doesn't have to.
- **`NULL` is not zero or empty string.** Test with `IS NULL`. Most operations on NULL produce NULL.
- **Always `WHERE` your UPDATEs and DELETEs.** Or wrap in a transaction so you can roll back.
- **Use migrations in production.** Don't run schema changes by hand on prod databases.
- **Soft delete what you might need back.** Hard delete the rest.
- **Use timestamps with time zones** (TIMESTAMPTZ in Postgres) for events.
- **Use NUMERIC for money.** Never float.

Next: querying — how to actually get data out.
