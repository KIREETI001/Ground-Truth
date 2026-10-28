# 10. Databases

> SQLite, Postgres, MySQL drivers, SQLAlchemy (Core + ORM), migrations, async, and NoSQL clients.

> For SQL itself, see the dedicated `sql/` folder. This file is about Python's interfaces *to* databases.

---

## Table of Contents

1. [Choosing a Database Layer](#1-choosing-a-database-layer)
2. [SQLite (Built-in)](#2-sqlite-built-in)
3. [PostgreSQL](#3-postgresql)
4. [MySQL / MariaDB](#4-mysql--mariadb)
5. [SQLAlchemy Core](#5-sqlalchemy-core)
6. [SQLAlchemy ORM](#6-sqlalchemy-orm)
7. [Migrations with Alembic](#7-migrations-with-alembic)
8. [Async Database Access](#8-async-database-access)
9. [Pydantic + SQLAlchemy: SQLModel](#9-pydantic--sqlalchemy-sqlmodel)
10. [Redis](#10-redis)
11. [MongoDB](#11-mongodb)
12. [Connection Pooling, Transactions, Pitfalls](#12-connection-pooling-transactions-pitfalls)

---

## 1. Choosing a Database Layer

A spectrum:

```
raw driver  ←————————————————————————————→  ORM
sqlite3,    SQLAlchemy Core   Pydantic-     SQLAlchemy
psycopg                       backed        ORM, Django
                                            ORM, Tortoise
```

- **Raw drivers** — full control, you write SQL strings. Good for scripts and very performance-sensitive code.
- **SQLAlchemy Core** — query builder + connection management; you still think in tables but in Python expressions. Best of both worlds for many apps.
- **ORMs** — model classes; relationships; lazy loading; auto-generated queries. Productive but easy to write inefficient queries unknowingly.

Most production Python apps use SQLAlchemy (Core or ORM), Django ORM, or a thin wrapper over psycopg.

---

## 2. SQLite (Built-in)

`sqlite3` is in the standard library. No server. The whole database is one file.

```python
import sqlite3

conn = sqlite3.connect("app.db")
cur = conn.cursor()

cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
conn.commit()

# Insert
cur.execute(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    ("Alice", "alice@example.com"),
)
conn.commit()

# Query
cur.execute("SELECT id, name, email FROM users WHERE email = ?", ("alice@example.com",))
row = cur.fetchone()      # tuple
print(row)
# Or fetchall, fetchmany(n)

# Iterating
for row in cur.execute("SELECT * FROM users"):
    print(row)

conn.close()
```

### Parameterized queries
**Always use placeholders, never string concatenation.** SQL injection is a real bug, even for "local-only" tools.
```python
# BAD
cur.execute(f"SELECT * FROM users WHERE name = '{name}'")    # NEVER

# GOOD
cur.execute("SELECT * FROM users WHERE name = ?", (name,))
```

### Row factory for dicts
```python
conn = sqlite3.connect("app.db")
conn.row_factory = sqlite3.Row     # rows behave like dicts
cur = conn.cursor()
cur.execute("SELECT name, email FROM users")
for row in cur:
    print(row["name"], row["email"])
```

### Context manager
```python
with sqlite3.connect("app.db") as conn:
    conn.execute("INSERT INTO users (name) VALUES (?)", ("Bob",))
# On exit: commit if no exception, else rollback. Connection NOT closed.
```

### When SQLite is enough
- Single-process desktop apps.
- Tools and CLIs.
- Test databases.
- Read-heavy workloads with few writers (it serializes writes).
- Up to ~100GB of data with proper indexing.

Don't use it for multi-server web apps with concurrent writes. Switch to Postgres.

---

## 3. PostgreSQL

The most common SQL database in 2026 Python production. Two driver options:

### `psycopg` (version 3) — current
```bash
pip install "psycopg[binary]"
```

```python
import psycopg

with psycopg.connect("postgresql://user:pass@localhost:5432/mydb") as conn:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id",
            ("Alice", "a@example.com"),
        )
        new_id = cur.fetchone()[0]

        cur.execute("SELECT * FROM users WHERE id = %s", (new_id,))
        row = cur.fetchone()
    # commit on context exit
```

### Dict rows
```python
import psycopg
from psycopg.rows import dict_row

with psycopg.connect(dsn, row_factory=dict_row) as conn:
    rows = conn.execute("SELECT * FROM users").fetchall()
    # list of dicts
```

### `psycopg2` — older, still common
Replace `psycopg` imports with `psycopg2`. APIs are very similar.

### Connection pooling
For web apps, use a pool:
```python
from psycopg_pool import ConnectionPool

pool = ConnectionPool(dsn, min_size=2, max_size=10)
with pool.connection() as conn:
    rows = conn.execute("SELECT 1").fetchall()
```

### `asyncpg` — fast async driver
For asyncio apps:
```python
import asyncpg
import asyncio

async def main():
    conn = await asyncpg.connect("postgresql://...")
    rows = await conn.fetch("SELECT * FROM users")
    for row in rows:
        print(row["name"])
    await conn.close()

asyncio.run(main())
```

`asyncpg` is notably faster than `psycopg` async for raw throughput.

---

## 4. MySQL / MariaDB

Several drivers — all similar.

```bash
pip install mysql-connector-python      # official MySQL driver
# or:
pip install PyMySQL                       # pure Python
# or:
pip install asyncmy                       # async
```

```python
import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="mydb",
)
cur = conn.cursor()
cur.execute("SELECT * FROM users WHERE id = %s", (1,))
print(cur.fetchone())
cur.close()
conn.close()
```

API is very similar to Postgres / SQLite. The differences are mostly in connection params and SQL dialect.

---

## 5. SQLAlchemy Core

For when you want a query builder but not full ORM magic.

```bash
pip install sqlalchemy
```

```python
from sqlalchemy import (
    create_engine, MetaData, Table, Column,
    Integer, String, DateTime, ForeignKey, select, insert, update, delete, func,
)

engine = create_engine("postgresql+psycopg://user:pass@host/db", echo=True)
# echo=True logs SQL to stderr — turn off in production

metadata = MetaData()

users = Table(
    "users", metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(50), nullable=False),
    Column("email", String(120), unique=True),
)

# Create tables
metadata.create_all(engine)

# Insert
with engine.begin() as conn:        # transaction
    conn.execute(
        insert(users),
        [{"name": "Alice", "email": "a@x.com"},
         {"name": "Bob",   "email": "b@x.com"}],
    )

# Query
with engine.connect() as conn:
    stmt = select(users).where(users.c.name == "Alice")
    for row in conn.execute(stmt):
        print(row.id, row.name, row.email)

# Aggregations
stmt = select(func.count()).select_from(users)
with engine.connect() as conn:
    count = conn.scalar(stmt)
```

### Why Core over raw drivers
- Cross-database SQL.
- Parameterized queries are automatic.
- Schema modeling that ties into migrations.
- Joins, subqueries, window functions all available.

### Why Core over the full ORM
- More transparent — you know what queries run.
- Faster for bulk operations.
- Simpler mental model when relationships aren't central.

---

## 6. SQLAlchemy ORM

```python
from sqlalchemy import create_engine, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session, relationship
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    posts: Mapped[list["Post"]] = relationship(back_populates="author")


class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    body: Mapped[str]
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    author: Mapped[User] = relationship(back_populates="posts")


engine = create_engine("sqlite:///app.db", echo=True)
Base.metadata.create_all(engine)

# Inserts
with Session(engine) as session:
    alice = User(name="Alice", email="a@x.com")
    alice.posts.append(Post(title="Hello", body="world"))
    session.add(alice)
    session.commit()

# Query
with Session(engine) as session:
    user = session.execute(
        select(User).where(User.name == "Alice")
    ).scalar_one()

    for post in user.posts:    # triggers a query if not already loaded
        print(post.title)
```

### Modern style (SQLAlchemy 2.0+)
The example above uses 2.0 style: `select()` instead of `session.query()`, `Mapped[]` type annotations, `mapped_column()`.

### Eager loading to avoid N+1
```python
from sqlalchemy.orm import selectinload, joinedload

stmt = select(User).options(selectinload(User.posts))
users = session.scalars(stmt).all()
for u in users:
    print(u.name, [p.title for p in u.posts])    # no extra queries
```

`selectinload` issues one extra query to load all related posts; `joinedload` does a single JOIN.

### Updates and deletes
```python
user = session.get(User, 1)
user.name = "Alicia"
session.commit()

# Or bulk
session.execute(update(User).where(User.id == 1).values(name="Alicia"))
session.execute(delete(User).where(User.id == 1))
session.commit()
```

### When the ORM hurts you
- Bulk inserts/updates — ORM is slow per-row. Use Core or `bulk_insert_mappings`.
- Complex reporting queries — write SQL, run it via Core.
- Schema migrations — never use ORM models alone; use Alembic.

---

## 7. Migrations with Alembic

Schema management for SQLAlchemy.

```bash
pip install alembic
alembic init migrations
# Edit alembic.ini and env.py to point to your DB and metadata
```

### Autogenerate from model changes
```bash
alembic revision --autogenerate -m "add posts table"
alembic upgrade head      # apply migrations
alembic downgrade -1       # roll back one
```

### Manual revision
```bash
alembic revision -m "add index to users.email"
```

Edit the generated file:
```python
def upgrade():
    op.create_index("ix_users_email", "users", ["email"])

def downgrade():
    op.drop_index("ix_users_email", "users")
```

### Practical advice
- Always review autogenerated migrations before applying. Alembic isn't always right.
- Never edit a migration after it's been applied to any environment.
- Big data migrations: split into "schema" and "data" migration steps; consider running the data step out of band.
- Test migrations on a copy of production data before deploying.

---

## 8. Async Database Access

For asyncio apps. SQLAlchemy 2.0+ supports both sync and async first-class.

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select

engine = create_async_engine("postgresql+asyncpg://user:pass@host/db")

async def get_user(user_id: int):
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

# In a FastAPI endpoint:
async def handler():
    user = await get_user(42)
    return user
```

Driver names for SQLAlchemy:
- Postgres async: `postgresql+asyncpg://...`
- MySQL async: `mysql+aiomysql://...` or `mysql+asyncmy://...`
- SQLite async: `sqlite+aiosqlite://...`

### Raw asyncpg (faster, lower-level)
```python
import asyncpg
import asyncio

async def main():
    pool = await asyncpg.create_pool("postgresql://...")
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM users WHERE created_at > $1", since)
    await pool.close()

asyncio.run(main())
```

`asyncpg` uses `$1`, `$2`, etc. for placeholders (Postgres native).

---

## 9. Pydantic + SQLAlchemy: SQLModel

[SQLModel](https://sqlmodel.tiangolo.com/) (by the FastAPI author) combines Pydantic models and SQLAlchemy. Convenient when you want one class to serve as both API model and DB row.

```python
from sqlmodel import SQLModel, Field, create_engine, Session, select

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True)

engine = create_engine("sqlite:///app.db")
SQLModel.metadata.create_all(engine)

with Session(engine) as session:
    session.add(User(name="Alice", email="a@x.com"))
    session.commit()

    user = session.exec(select(User).where(User.name == "Alice")).first()
    print(user.email)
```

Same model can be returned directly from a FastAPI endpoint and Pydantic handles serialization.

Trade-off: less explicit separation between API and DB. For small apps, very convenient. For large apps, you may prefer separate Pydantic and SQLAlchemy classes.

---

## 10. Redis

Key-value store. Used for caching, rate limiting, queues, leaderboards, pub/sub.

```bash
pip install redis
```

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Strings
r.set("counter", 0)
r.incr("counter")               # 1
r.get("counter")                 # "1"
r.set("session:abc", json.dumps({"user_id": 42}), ex=3600)   # TTL in seconds

# Lists
r.rpush("queue", "task1", "task2")
r.lpop("queue")

# Hashes
r.hset("user:42", mapping={"name": "Alice", "email": "a@x.com"})
r.hgetall("user:42")

# Sets
r.sadd("tags", "python", "web", "tutorial")
r.sismember("tags", "python")

# Sorted sets (leaderboards)
r.zadd("scores", {"alice": 100, "bob": 90})
r.zrevrange("scores", 0, 9, withscores=True)

# Pub/sub
pub = redis.Redis()
sub = redis.Redis().pubsub()
sub.subscribe("chan")
pub.publish("chan", "hi")
for msg in sub.listen():
    print(msg)
```

### Async Redis
```python
import redis.asyncio as redis

async def main():
    r = redis.Redis()
    await r.set("k", "v")
    val = await r.get("k")
    await r.aclose()
```

### Common patterns
- **Cache**: `r.get(key)` → if `None`, fetch from DB, `r.set(key, value, ex=300)`.
- **Rate limit**: `r.incr(key)` then `r.expire(key, window)` on first hit.
- **Distributed lock**: `r.set(key, val, nx=True, ex=10)` (use Redlock for high-stakes correctness).
- **Idempotency keys**: store request fingerprints with TTL.

---

## 11. MongoDB

Document store. JSON-like records, flexible schema.

```bash
pip install pymongo
```

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["mydb"]
users = db["users"]

# Insert
users.insert_one({"name": "Alice", "age": 30, "tags": ["py", "ml"]})
users.insert_many([{"name": "Bob"}, {"name": "Carol"}])

# Query
users.find_one({"name": "Alice"})
for u in users.find({"age": {"$gte": 18}}):
    print(u)

# Update
users.update_one({"name": "Alice"}, {"$set": {"age": 31}})

# Delete
users.delete_one({"name": "Alice"})

# Aggregation pipeline
pipeline = [
    {"$match": {"active": True}},
    {"$group": {"_id": "$role", "count": {"$sum": 1}}},
]
for doc in users.aggregate(pipeline):
    print(doc)

# Index
users.create_index("name")
users.create_index([("age", 1), ("name", 1)])
```

### Async
```bash
pip install motor
```

```python
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
db = client.mydb

async def get_users():
    cursor = db.users.find({"active": True})
    async for doc in cursor:
        print(doc)
```

### When to use MongoDB
- Schema genuinely varies per document.
- You need geospatial queries or full-text out of the box.
- You're rapidly iterating on shape and don't want migrations.

When NOT to:
- You have relational data with clear entities and references. (Use Postgres + JSON columns if you need flexibility.)
- You need strong consistency or transactional integrity across records.

In 2026, Postgres with `JSONB` covers most "I want flexibility" use cases without giving up SQL.

---

## 12. Connection Pooling, Transactions, Pitfalls

### Connection pooling is mandatory for servers
Opening a new DB connection per request is expensive. Use a pool — built into SQLAlchemy, psycopg_pool, asyncpg, etc.

Typical config:
- Pool size: 5-20 per process.
- Account for total connections across all processes (Gunicorn workers × pool_size).
- Don't exceed Postgres `max_connections` (default 100).

### Transactions
- Default: each statement auto-commits in some drivers (with autocommit on) or transactions stay open until commit (default in psycopg and SQLAlchemy).
- Use the `with engine.begin():` pattern in SQLAlchemy for explicit transactions.
- Hold transactions as briefly as possible — they hold locks.

### N+1 queries
The classic ORM trap. Iterating a parent list and accessing children inside the loop causes one query per row. Solve with eager loading (see SQLAlchemy ORM section).

### Long-lived connections and Postgres
Postgres can be picky about idle connections. Set `pool_recycle` (SQLAlchemy) to recycle connections every hour or so, especially if there's a firewall / load balancer that drops idle TCP.

### Don't store secrets in code
Use environment variables or a secrets manager:
```python
import os
dsn = os.environ["DATABASE_URL"]
```

### Schema-first vs code-first
- **Code-first**: define models in Python (SQLAlchemy / Django ORM), generate the schema.
- **Schema-first**: own the SQL DDL, generate code (or write thin wrappers).

For large teams or DB-driven architectures, schema-first is often safer. For application teams, code-first is more productive. Pick one and stick with it.

### Backups, replicas, failover
These are operational concerns, not Python concerns. Use a managed service (RDS, Cloud SQL, Supabase, Neon) unless you have specific reasons to self-host.

---

Next: shipping all of this as a web service — `11_web.md`.
