# SQL — Reference Library

A reference for **modern SQL** (SQL:2016+ features) across the major dialects: **PostgreSQL**, **MySQL/MariaDB**, **SQLite**, and **SQL Server** (with notes on Oracle, BigQuery, Snowflake where they diverge significantly).

SQL is older than most things in your kitchen and remains the most widely-used data language in the world. It's not going anywhere. Investment here pays off across analytics, application development, and data engineering.

---

## How to navigate this folder

| # | File | What's in it |
|---|---|---|
| — | `README.md` | This file. Dialect landscape, mental model, what SQL really is. |
| 01 | `01_basics.md` | Tables, data types, `CREATE`, `INSERT`, `UPDATE`, `DELETE`, primary keys. |
| 02 | `02_querying.md` | `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`, expressions, `CASE`, `NULL` handling. |
| 03 | `03_joins.md` | `INNER`, `LEFT`, `RIGHT`, `FULL`, `CROSS`, `SELF` joins. Multi-table queries. |
| 04 | `04_aggregation.md` | `GROUP BY`, `HAVING`, aggregate functions, `DISTINCT`. |
| 05 | `05_indexes_and_performance.md` | Indexes, `EXPLAIN`, query plans, performance basics, common slowdowns. |
| 06 | `06_transactions.md` | `BEGIN`, `COMMIT`, `ROLLBACK`, isolation levels, locking, deadlocks. |
| 07 | `07_advanced_queries.md` | Window functions, CTEs, recursive queries, subqueries, `UNION`. |
| 08 | `08_dialect_differences.md` | What changes between Postgres, MySQL, SQLite, SQL Server, BigQuery, Snowflake. |

---

## What SQL is in 2026

SQL is a **declarative query language** for relational data. You describe *what* you want; the database figures out *how* to get it. Originally designed at IBM in the 1970s, standardized as ANSI SQL since 1986. Every major database speaks some variant.

The big themes:

- **Relational model still wins for most application data.** Even with NoSQL, document, and graph databases everywhere, the bulk of business data lives in tables.
- **Postgres has become the default.** Its open-source license, feature completeness, JSON support, and extensibility (extensions like pgvector, PostGIS) have made it the modern go-to.
- **Cloud warehouses are dominant for analytics.** Snowflake, BigQuery, Redshift, Databricks — all SQL-based.
- **SQLite is everywhere.** Phones, browsers, embedded systems, developer tools. It's not just a "small" database; it's the most-deployed database in the world.
- **SQL keeps growing.** SQL:2023 added more JSON, more graph traversal, property-graph queries. The standard isn't frozen.

---

## Why SQL still matters

- **Portable knowledge.** Learn SQL once, work everywhere data lives. Knowing SQL is a permanent skill.
- **Declarative.** You don't write loops. The query optimizer does work that would take months to replicate manually.
- **Transactions.** ACID guarantees that distributed systems struggle to match.
- **The ecosystem.** Every analytics tool, every BI platform, every ORM — they all speak SQL underneath.
- **Performance.** A well-tuned relational DB handles billions of rows efficiently. Don't believe "SQL doesn't scale" — Facebook, Uber, and most large tech companies run massive SQL deployments.

## Where SQL isn't the right tool

- **Hierarchical data with deep nesting and no joins.** Document DBs (MongoDB) can be simpler for these.
- **Graph traversal of many hops.** Graph DBs (Neo4j) handle "friends of friends of friends" more elegantly. (Though SQL is catching up — see SQL/PGQ.)
- **High-throughput append-only event streams.** Kafka, time-series DBs (TimescaleDB if you want SQL, InfluxDB otherwise).
- **Full-text search at scale.** Elasticsearch / OpenSearch. Postgres has decent FTS but search engines win at scale.
- **Caching.** Redis, Memcached.
- **Truly schema-less data.** Doc DBs. Though Postgres's JSONB + indexes handles a lot.

---

## The dialect landscape

Different databases implement SQL differently. The **standard** ANSI SQL is a common subset but no database is 100% standard-compliant, and many extend it heavily.

### PostgreSQL
- Open source, BSD-style license.
- Most feature-complete open-source DB.
- Best support for advanced SQL (window functions, CTEs, JSON, arrays, custom types).
- Extensions: PostGIS (spatial), pgvector (vector search), TimescaleDB (time series).
- The default for new applications in 2026.

### MySQL / MariaDB
- Open source (MySQL: Oracle, GPL; MariaDB: community fork).
- Dominant in web applications historically (LAMP stack).
- Faster on some workloads, simpler operationally.
- Less feature-rich than Postgres in advanced SQL.
- MariaDB is the community-driven fork; functionally similar.

### SQLite
- Embedded library, not a server.
- Single file. No setup.
- Ships in iOS, Android, Chrome, Firefox, macOS, etc.
- Surprisingly capable: handles GBs of data, full SQL support.
- Use when: local app data, dev/test DBs, single-user tools.
- Not for: high-concurrency writes from multiple processes.

### SQL Server (Microsoft)
- Commercial. Free editions: Developer, Express.
- Best for Windows / .NET environments.
- T-SQL dialect — many proprietary extensions.
- Strong tooling (SSMS, Azure Data Studio).
- Common in enterprise / Microsoft shops.

### Cloud warehouses

**BigQuery** (Google) — serverless analytics. Pay per query. Different operational model than transactional DBs. Strong on petabyte-scale analytics.

**Snowflake** — separate compute and storage, multi-cloud. Industry leader for cloud data warehousing.

**Redshift** (Amazon) — older AWS warehouse. Postgres-compatible-ish.

**Databricks / Spark SQL** — SQL on top of Spark. Used for big data and ML workloads.

These are **OLAP** (analytical) — optimized for big aggregations, joins on huge tables. Not for high-frequency transactional workloads.

### Oracle
- Commercial. Old, expensive, used in finance / enterprise.
- PL/SQL is the procedural extension.
- Some unique syntax (`(+)` for outer joins, `DUAL` table).
- Avoid for new projects unless you have a reason.

---

## OLTP vs OLAP

**OLTP** (Online Transaction Processing): many small reads/writes, low latency. Application databases. Postgres, MySQL, SQL Server, SQLite.

**OLAP** (Online Analytical Processing): few large queries, scanning lots of data, complex aggregations. BigQuery, Snowflake, Redshift, ClickHouse, DuckDB.

Different optimization targets:

| Aspect | OLTP | OLAP |
|---|---|---|
| Row layout | Row-based (rows in one block) | Columnar (each column in one block) |
| Workload | Many small queries | Few big queries |
| Schema | Highly normalized | Often denormalized / star schemas |
| Indexes | Many (every lookup pattern) | Few; rely on scans + partitioning |
| Updates | Frequent | Rare or batch |

Lots of organizations use both: Postgres/MySQL for the app, replicate to a warehouse for analytics.

### DuckDB
A newer player worth mentioning. Like SQLite for analytics — embedded OLAP. Reads CSV/Parquet/Arrow files directly with SQL. Excellent for ad-hoc analysis and small-to-medium analytics workloads. Use it for what-would-have-been Pandas/Python data manipulation when SQL is cleaner.

---

## Reading order

1. **New to SQL?** `01_basics.md` → `02_querying.md` → `03_joins.md` → `04_aggregation.md`. Get comfortable querying. Then learn `05_indexes_and_performance.md`.
2. **Application developer?** Add `06_transactions.md` after the basics. Know what isolation level your ORM uses.
3. **Analytics work?** After basics and joins, jump to `07_advanced_queries.md` (window functions, CTEs).
4. **Cross-database work?** `08_dialect_differences.md` is your reference.
5. **Coming from another language?** SQL is genuinely different. Don't try to write SQL like you write Python — `WHERE` is not a `for` loop with `if`. Embrace the set-based mindset.

---

## The mental model: sets, not loops

The biggest hurdle for procedural programmers learning SQL is that **SQL operates on sets, not rows-at-a-time**.

A query like:

```sql
SELECT name, age FROM users WHERE age >= 18;
```

doesn't mean "loop through users, check each one's age, and yield the name and age if >= 18." It means "from the set of all users, give me the subset where age >= 18, projected to just name and age columns." The database picks how to execute this — sometimes it scans, sometimes it uses an index, sometimes it parallelizes.

When you think procedurally about SQL, you write slow queries. When you think in sets, you write queries the optimizer can run efficiently.

This file teaches you to think in sets.

---

## What this guide assumes

- You understand basic programming (variables, conditionals, loops in some language).
- You have a working SQL database to practice against. PostgreSQL is recommended; SQLite is the easiest to install.
- Most examples use **PostgreSQL** syntax. Where dialects diverge, I note alternatives.

### Quick install

PostgreSQL on macOS: `brew install postgresql` then `brew services start postgresql`.

PostgreSQL on Linux: `sudo apt install postgresql` or use Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres`.

SQLite: ships with most operating systems. `sqlite3 mydb.db` starts a shell.

Online sandbox: `db-fiddle.com` (PG, MySQL, SQLite, SQL Server) lets you run queries without installing anything.

---

## What you won't find here

- **NoSQL** (MongoDB, Cassandra, DynamoDB). Different model, separate guide territory.
- **ORM-specific syntax** (SQLAlchemy, Hibernate, Prisma, Entity Framework). Those are in the application-language guides.
- **Database administration** (replication, backup, tuning the planner). Brief touches in `05_indexes_and_performance.md` and `06_transactions.md`; not the focus.
- **Procedural SQL** (PL/pgSQL, T-SQL stored procedures). Briefly mentioned; not central.
- **Spatial / vector / time-series extensions** in depth. Mentioned where relevant.

---

## TL;DR: when SQL fits

SQL fits when:

- You have data that fits in tables (rows and columns).
- You need to query, filter, aggregate, or join that data.
- You want ACID guarantees.
- Multiple users or processes read/write the same data.
- You want a portable skill that will outlive language choices.

The answer is **almost always** SQL for the data layer of any application that isn't already committed to something else. The rest of the data ecosystem orbits around it.

Now: `01_basics.md`.
