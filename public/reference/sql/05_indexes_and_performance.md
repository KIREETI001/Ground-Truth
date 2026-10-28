# 05. Indexes and Performance

The single biggest determinant of SQL performance is whether the database is using indexes effectively. A query that scans 10 million rows takes 30 seconds; the same query with the right index takes 5 milliseconds. That's a 6,000x speedup from one DDL statement.

This file covers indexes, query plans, and the common patterns that make queries fast or slow.

---

## Table of Contents

1. [What an Index Actually Is](#what-an-index-actually-is)
2. [Creating Indexes](#creating-indexes)
3. [B-Tree, the Default](#b-tree-the-default)
4. [When Indexes Help](#when-indexes-help)
5. [When Indexes Don't Help (or Hurt)](#when-indexes-dont-help-or-hurt)
6. [Composite Indexes](#composite-indexes)
7. [Covering Indexes](#covering-indexes)
8. [Other Index Types](#other-index-types)
9. [EXPLAIN: Reading Query Plans](#explain-reading-query-plans)
10. [Statistics and the Planner](#statistics-and-the-planner)
11. [Common Performance Problems](#common-performance-problems)
12. [General Advice](#general-advice)

---

## What an Index Actually Is

An index is a separate data structure that maps values to row locations.

Without an index, finding rows where `email = 'alice@example.com'` requires reading every row in the table — a **sequential scan** or "seq scan." 10 million rows means 10 million reads.

With an index on `email`, the database walks a tree structure to find the value, then jumps directly to the matching rows. A tree of depth 4 means 4 lookups, regardless of table size.

The trade-offs:

- **Speed reads.** Indexed lookups are dramatically faster.
- **Slow writes.** Every INSERT/UPDATE/DELETE must update every relevant index. More indexes = slower writes.
- **Take space.** Each index is its own data structure, often 10-50% the size of the table.

So: indexes aren't free. You add them where reads benefit more than writes suffer. For most application tables, that means indexing foreign keys, frequently-filtered columns, and the columns you sort by.

---

## Creating Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_placed_at ON orders(placed_at);
```

The name is a convention (`idx_<table>_<column>`); the database doesn't care.

### Primary keys are indexed automatically

Every primary key has an automatically-created unique index. You don't need to add one.

### Unique constraints are indexed automatically

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE     -- creates a unique index
);
```

The `UNIQUE` constraint is enforced via a unique index. You can also create unique indexes directly:

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### Drop an index

```sql
DROP INDEX idx_users_email;
```

In Postgres / SQL Server, indexes live in the schema's namespace. MySQL ties them to the table:

```sql
-- MySQL
DROP INDEX idx_users_email ON users;
```

### `CREATE INDEX CONCURRENTLY` (Postgres)

Building an index on a large table can lock the table for the duration of the build (minutes to hours). Postgres has `CREATE INDEX CONCURRENTLY` to build without blocking writes:

```sql
CREATE INDEX CONCURRENTLY idx_orders_placed_at ON orders(placed_at);
```

Slower overall but doesn't block production traffic. Use this in production.

MySQL/MariaDB have similar options via `ALGORITHM=INPLACE` and InnoDB online DDL.

### `IF NOT EXISTS`

```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

Useful in migration scripts that might run twice.

---

## B-Tree, the Default

The default index type in every relational database is a **B-tree** (balanced tree). It's optimized for:

- **Equality lookups**: `WHERE x = 5`
- **Range lookups**: `WHERE x > 5`, `WHERE x BETWEEN 5 AND 10`
- **Sorted retrieval**: `ORDER BY x` (in either direction)
- **Prefix matches** (for strings): `WHERE name LIKE 'Al%'` (but not `LIKE '%al%'`)

A B-tree maintains values in sorted order with logarithmic lookups. Modern B-tree variants (B+tree, used in most DBs) store all data at the leaves and have wider fan-out, so lookups for billion-row tables typically take 4-5 disk reads.

When you say "create an index," you almost always mean a B-tree index. Other types (hash, GIN, GiST, BRIN, full-text) have specific uses but B-tree is the workhorse.

---

## When Indexes Help

### Equality on a single column

```sql
CREATE INDEX idx_users_email ON users(email);

SELECT * FROM users WHERE email = 'alice@example.com';
```

The most common case. Indexed equality lookup is fast.

### Range queries

```sql
CREATE INDEX idx_orders_placed_at ON orders(placed_at);

SELECT * FROM orders WHERE placed_at >= '2024-01-01' AND placed_at < '2025-01-01';
```

B-trees navigate to the start of the range and read sequentially. Fast.

### Sorting

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

If indexed on `created_at`, the database walks the index in reverse order and reads the first 10. No sorting needed.

### Joins

```sql
SELECT * FROM users u JOIN orders o ON u.id = o.user_id;
```

For each row in one table, find matching rows in the other. Without an index on `orders.user_id`, this requires scanning all orders per user. With the index, it's a direct lookup.

This is why **foreign keys should almost always be indexed**. Postgres does NOT auto-create indexes on foreign keys (unlike some other DBs); you have to add them yourself.

### Prefix matching on strings

```sql
CREATE INDEX idx_users_name ON users(name);

SELECT * FROM users WHERE name LIKE 'Al%';     -- can use index
SELECT * FROM users WHERE name LIKE '%al%';    -- CANNOT use index (leading wildcard)
```

Leading wildcards defeat B-tree indexes. For full-text or substring search, use a different approach (covered below).

---

## When Indexes Don't Help (or Hurt)

### Function calls or expressions on the indexed column

```sql
CREATE INDEX idx_users_email ON users(email);

SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';   -- DOES NOT use the index
```

The index is on `email`, not on `LOWER(email)`. The database can't use it.

Fix: index the expression:

```sql
CREATE INDEX idx_users_email_lower ON users(LOWER(email));    -- Postgres, SQLite

SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';  -- now uses the index
```

This is called a **functional index** or **expression index**. Postgres, SQLite, and modern SQL Server / MySQL 8+ support them.

Or: store the lowercased value (e.g., always lowercase emails on insert) and index normally.

### Implicit type conversion

```sql
SELECT * FROM users WHERE id = '5';     -- string compared to int
```

Some databases handle this; some don't use the index. Use the right type in your queries.

### Leading wildcard in LIKE

```sql
SELECT * FROM users WHERE name LIKE '%alice%';      -- no index (leading wildcard)
```

For substring search, look into:
- **Trigram indexes** (Postgres `pg_trgm` extension).
- **Full-text search** indexes.
- A dedicated search engine (Elasticsearch).

### `OR` across columns

```sql
SELECT * FROM users WHERE email = '...' OR name = '...';
```

Even with indexes on both columns, the database may not use them efficiently. A `UNION` of two indexed queries can sometimes be faster:

```sql
SELECT * FROM users WHERE email = '...'
UNION
SELECT * FROM users WHERE name = '...';
```

### Low selectivity

If 90% of rows match the WHERE clause, the index doesn't help — it'd be faster to scan the table.

```sql
SELECT * FROM users WHERE is_active = TRUE;     -- if 95% are active, no help
```

The planner often correctly chooses a scan in this case. Boolean columns or low-cardinality enums are usually not worth indexing on their own.

### Write-heavy workloads with many indexes

Each index slows down every INSERT/UPDATE/DELETE. A table with 20 indexes writes 20x slower than one with no indexes (rough order of magnitude).

For high-write tables, audit indexes: drop those that aren't used.

### Unused indexes

Indexes you created but never query against still cost write performance.

```sql
-- Postgres: find unused indexes
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

Drop them.

---

## Composite Indexes

An index on multiple columns:

```sql
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

The order matters. This index can be used for:

- `WHERE user_id = 5`
- `WHERE user_id = 5 AND status = 'pending'`
- Sorting by `(user_id)` or `(user_id, status)`

It CANNOT be efficiently used for:

- `WHERE status = 'pending'` (missing leading column)

### Leftmost prefix rule

A composite index `(a, b, c)` can be used for queries that filter on:

- `a`
- `a, b`
- `a, b, c`

Not for:

- `b` alone
- `c` alone
- `b, c`

The database walks the tree in the index's order. You need to "constrain from the left."

### Designing composite indexes

For `WHERE a = ... AND b = ... AND c = ...`, an index on `(a, b, c)` works. But also:

- An index on `(b, a, c)` works equally well (the planner can match all three).
- An index on `(a)` alone works but isn't as selective.

For `WHERE a = ... AND b > ...`, index `(a, b)` — equality first, then range. `(b, a)` would be much worse because the range on `b` precludes using `a`.

**Rule of thumb**: equality columns first, then range/sort columns.

```sql
-- For: WHERE user_id = ? AND placed_at > ?
CREATE INDEX idx_orders_user_placed ON orders(user_id, placed_at);

-- For: WHERE user_id = ? ORDER BY placed_at
CREATE INDEX idx_orders_user_placed ON orders(user_id, placed_at);    -- same index works
```

### How many composite indexes do you need?

Don't index every combination. Look at your actual query patterns. Most apps have 3-5 frequently-run queries per table; one or two composite indexes usually cover them.

---

## Covering Indexes

An index that contains all the columns a query needs — no table lookup required.

```sql
CREATE INDEX idx_orders_user_total ON orders(user_id, total);

SELECT total FROM orders WHERE user_id = 5;
-- Database reads the index alone; never touches the table
```

This is an **index-only scan**. Very fast — no disk seeks into the table.

### Postgres: `INCLUDE`

For columns you want in the index but don't filter on:

```sql
CREATE INDEX idx_orders_user ON orders(user_id) INCLUDE (total, placed_at);

SELECT total, placed_at FROM orders WHERE user_id = 5;
-- Index-only scan; total and placed_at retrieved from the index
```

`INCLUDE` columns aren't part of the index's sort order (so they don't affect tree structure), but they're stored in the leaf nodes.

SQL Server has the same `INCLUDE` syntax. MySQL: included columns happen implicitly if you put them in the index key.

### When covering indexes pay off

For frequently-run, performance-critical queries. The trade-off is index size — including more columns makes the index bigger, slowing writes and using more memory.

---

## Other Index Types

### Hash indexes

Equality-only, no ordering. Postgres supports them; rarely useful since B-trees handle equality fine. Other DBs may not even expose them.

### GIN (Generalized Inverted Index, Postgres)

For composite values — arrays, JSONB, full-text search.

```sql
-- For querying inside JSONB
CREATE INDEX idx_users_attrs ON users USING GIN (attributes);

SELECT * FROM users WHERE attributes @> '{"role": "admin"}';

-- For full-text search
CREATE INDEX idx_posts_search ON posts USING GIN (to_tsvector('english', body));
```

GIN indexes are larger and slower to update than B-trees but enable fast lookups into structured data.

### GiST (Generalized Search Tree, Postgres)

For geometric and full-text data. Used by PostGIS for spatial queries.

### BRIN (Block Range Index, Postgres)

Tiny indexes for huge tables where data is naturally clustered (e.g., time-series data where `created_at` is monotonically increasing).

```sql
CREATE INDEX idx_events_created ON events USING BRIN (created_at);
```

BRIN stores the min/max of `created_at` for each block of rows. To find rows in a date range, it scans only blocks that could contain matches.

Fraction of a B-tree's size. Useful for OLAP-style tables.

### Full-text search

Postgres: `tsvector` / `tsquery` with GIN indexes.

```sql
ALTER TABLE posts ADD COLUMN search_vector tsvector;
UPDATE posts SET search_vector = to_tsvector('english', title || ' ' || body);
CREATE INDEX idx_posts_search ON posts USING GIN (search_vector);

SELECT * FROM posts WHERE search_vector @@ to_tsquery('english', 'database & performance');
```

MySQL: `FULLTEXT INDEX` with `MATCH ... AGAINST`.

SQL Server: full-text catalog feature.

For complex search needs, a dedicated search engine (Elasticsearch, OpenSearch, Typesense) is usually a better fit than the database's built-in.

### Vector indexes (modern Postgres)

For ML / similarity search.

```sql
CREATE EXTENSION vector;
ALTER TABLE documents ADD COLUMN embedding vector(768);
CREATE INDEX ON documents USING hnsw (embedding vector_l2_ops);

SELECT * FROM documents ORDER BY embedding <-> '[0.1, 0.2, ...]' LIMIT 10;
```

Via the `pgvector` extension. HNSW and IVFFlat are the common index types for approximate nearest neighbor.

---

## EXPLAIN: Reading Query Plans

`EXPLAIN` shows how the database will execute a query. `EXPLAIN ANALYZE` runs the query and shows actual timings.

```sql
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';
```

Output (Postgres):

```
Index Scan using idx_users_email on users
  (cost=0.29..8.31 rows=1 width=64)
  Index Cond: (email = 'alice@example.com'::text)
```

Reads bottom-up. The database is using the `idx_users_email` index. Good.

Now without an index:

```
Seq Scan on users
  (cost=0.00..123456.00 rows=1 width=64)
  Filter: (email = 'alice@example.com'::text)
```

`Seq Scan` = full table scan. Bad for selective queries on large tables.

### Key operations to recognize

- **Seq Scan** (Postgres) / **Table Scan** (SQL Server, MySQL): reads the whole table. Fine for small tables; usually bad for big ones.
- **Index Scan**: walks an index to find rows. Then fetches from the table (unless it's an index-only scan).
- **Index Only Scan**: reads only the index, doesn't touch the table.
- **Bitmap Index Scan + Bitmap Heap Scan**: builds a bitmap of matching row locations, then fetches them in physical order. Common when many rows match.
- **Nested Loop**: join by looping over one side, looking up matches in the other. Fast for small × indexed-large.
- **Hash Join**: build a hash table from one side, probe with the other. Good for large × large with no useful index.
- **Merge Join**: both sides sorted (or indexed), merged. Common for large pre-sorted data.

### EXPLAIN ANALYZE

Shows actual runtime, not just estimates:

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = '...';
```

Output:

```
Index Scan using idx_users_email on users
  (cost=0.29..8.31 rows=1 width=64)
  (actual time=0.012..0.013 rows=1 loops=1)
  Index Cond: (email = ...)
Planning Time: 0.061 ms
Execution Time: 0.024 ms
```

`actual time` is what really matters. `cost` is the planner's estimate.

If the planner estimates `rows=1` but actually returns `rows=10000`, statistics are out of date and the plan may be poor (see below).

### MySQL `EXPLAIN`

Similar concept, different format:

```sql
EXPLAIN SELECT * FROM users WHERE email = '...';
```

```
+----+-------------+-------+------+------------------+------------------+---------+-------+------+-------+
| id | select_type | table | type | possible_keys    | key              | key_len | ref   | rows | Extra |
+----+-------------+-------+------+------------------+------------------+---------+-------+------+-------+
|  1 | SIMPLE      | users | ref  | idx_users_email  | idx_users_email  | 1022    | const |    1 |       |
+----+-------------+-------+------+------------------+------------------+---------+-------+------+-------+
```

`type=ref` is using the index. `type=ALL` is a full scan. `rows` is the estimated number of rows examined. Look for `Using filesort`, `Using temporary` — often performance smells.

### SQL Server: Execution Plans

GUI in SSMS / Azure Data Studio shows the plan graphically. Or use `SET SHOWPLAN_ALL ON` for text output.

---

## Statistics and the Planner

The query planner makes decisions based on **statistics** — estimates of how many rows have each value, how many distinct values exist, etc.

When statistics are accurate, the planner picks good plans. When they're stale (e.g., after a big data load), the planner can pick disastrously bad plans.

### Updating statistics

```sql
-- Postgres
ANALYZE users;
ANALYZE;     -- all tables

-- MySQL
ANALYZE TABLE users;

-- SQL Server
UPDATE STATISTICS users;
EXEC sp_updatestats;     -- all tables
```

Postgres also runs `ANALYZE` automatically via autovacuum. Generally don't need to do it manually unless after huge data changes.

### When statistics matter

Symptoms of bad statistics:

- A query was fast yesterday and slow today.
- `EXPLAIN ANALYZE` shows estimated rows wildly different from actual.
- Plan changes after a data load.

The fix is often `ANALYZE`. Sometimes you need to increase the statistics target (Postgres: `ALTER TABLE ... ALTER COLUMN ... SET STATISTICS 1000`).

### Forcing index usage

You generally don't. The planner is usually right. But if you really need to:

- Postgres: no hints. You can disable certain plans (`SET enable_seqscan = OFF`) for a session as a debugging tool.
- MySQL: `USE INDEX`, `FORCE INDEX`, `IGNORE INDEX` hints.
- SQL Server: `WITH (INDEX = idx_name)` hint.
- Oracle: extensive hint syntax.

Hints are a last resort. They go stale and lock you into a plan that becomes wrong as data changes.

---

## Common Performance Problems

### Missing index on a foreign key

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id)
);
-- No index on user_id; every JOIN with users scans orders fully
```

Postgres doesn't auto-create indexes on foreign keys. Add them:

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### Sequential scan on a large table

If `EXPLAIN` shows `Seq Scan` on a multi-million-row table for a selective query, you're missing an index.

### Index on the wrong column

A query frequently filters on `status` and `placed_at`, but the index is on `(user_id, placed_at)`. The query can't use this index for `status` filtering.

Add the right index, or refactor the query.

### Sort spilling to disk

```
Sort  (cost=...)
  Sort Method: external merge  Disk: 23456kB
```

A `Sort` operation is using disk because it doesn't fit in memory (`work_mem` in Postgres). Either index to avoid the sort, or increase `work_mem`.

### Functions on indexed columns

```sql
SELECT * FROM orders WHERE EXTRACT(MONTH FROM placed_at) = 3;
-- Doesn't use index on placed_at
```

Rewrite as a range:

```sql
SELECT * FROM orders WHERE placed_at >= '2024-03-01' AND placed_at < '2024-04-01';
```

Or create a functional index. Range queries are usually more flexible.

### `OFFSET` for pagination

Covered in `02_querying.md`. Large offsets are slow. Use keyset pagination.

### N+1 in application code

```python
users = db.query("SELECT * FROM users")
for u in users:
    orders = db.query(f"SELECT * FROM orders WHERE user_id = {u.id}")
```

100 users → 101 queries. Replace with a JOIN or batched query.

### Counting with `COUNT(*)` over large tables

```sql
SELECT COUNT(*) FROM orders;     -- scans the whole table or index
```

In Postgres, this is exact but slow (no stored row count). MySQL's InnoDB approximates fast counts via `SHOW TABLE STATUS`. For approximate counts, use the planner's estimate:

```sql
-- Postgres
SELECT reltuples::BIGINT FROM pg_class WHERE relname = 'orders';
```

For "is the count more than X" without exact value:

```sql
SELECT EXISTS (SELECT 1 FROM orders OFFSET 10000);
```

Returns true if at least 10001 rows exist, without counting all.

### Too many indexes on a write-heavy table

Symptom: writes are slow. Audit indexes and drop those that aren't used.

### Lock contention

Long-running transactions block other writes. Covered in `06_transactions.md`.

---

## General Advice

### Index foreign keys

Almost always. Joins and lookups depend on this.

### Index columns you filter or sort on frequently

Look at your common query patterns. Index where they look.

### Don't over-index

Each index has a cost. For most tables, 3-5 indexes is plenty.

### Measure, don't guess

Run `EXPLAIN ANALYZE` on slow queries. Look at the actual plan and timings. Don't add indexes "because they might help" — verify first.

### Drop unused indexes

Periodically audit. Postgres's `pg_stat_user_indexes` view shows scan counts per index. SQL Server has DMVs for the same.

### Refresh statistics after big data changes

Autovacuum/autostats usually handle this. After a manual bulk load, run `ANALYZE` explicitly.

### Smaller tables = faster queries

Archive or partition huge historical tables. A table of 10 million current rows + 1 billion archived rows runs faster if the active table is just the 10 million.

### Watch for query plan changes

A query that was fast yesterday and slow today usually means stats changed or data changed. `EXPLAIN ANALYZE` shows what changed.

### `LIMIT` is not magic

```sql
SELECT * FROM huge_table WHERE x = 5 LIMIT 10;
```

Without an index on `x`, this still scans (potentially) the whole table to find 10 matches. `LIMIT` doesn't reduce work if matches are rare.

### Don't pre-optimize

Indexes for queries you don't run yet just add write overhead. Add indexes when you see the need (slow query, missing index in `EXPLAIN`).

### Set query timeouts

```sql
-- Postgres, per session
SET statement_timeout = '5s';
```

Or in connection strings. Prevents runaway queries from holding resources.

---

## Key principles

- **B-tree indexes are the default**; they handle equality, ranges, sorting.
- **Index foreign keys** — joins depend on it.
- **Composite indexes follow leftmost-prefix rule**; column order matters.
- **`EXPLAIN ANALYZE` shows you what's happening.** Use it on slow queries.
- **Functions on columns defeat indexes.** Use functional indexes or restructure the query.
- **Don't over-index.** Each index slows writes.
- **Stats keep planning honest.** Run `ANALYZE` after big data loads.
- **Measure before optimizing.** Don't add indexes speculatively.

Next: transactions — atomicity, isolation, and concurrency control.
