# 13. Databases

> Prisma, Drizzle, Kysely, raw drivers, Redis, MongoDB — connecting Node to data.

> For SQL itself, see the `sql/` folder. This file is about JS interfaces to databases.

---

## Table of Contents

1. [Choosing a Data Layer](#1-choosing-a-data-layer)
2. [Prisma](#2-prisma)
3. [Drizzle](#3-drizzle)
4. [Kysely](#4-kysely)
5. [Raw Postgres (`pg` / `postgres`)](#5-raw-postgres-pg--postgres)
6. [SQLite (`better-sqlite3` / `bun:sqlite` / `node:sqlite`)](#6-sqlite-better-sqlite3--bunsqlite--nodesqlite)
7. [MySQL](#7-mysql)
8. [Redis](#8-redis)
9. [MongoDB](#9-mongodb)
10. [Migrations](#10-migrations)
11. [Connection Pooling, Transactions, Pitfalls](#11-connection-pooling-transactions-pitfalls)

---

## 1. Choosing a Data Layer

Spectrum from low-level to high-level:

```
Raw driver  ←——————————————————————————————→  Full ORM
pg, mysql2,    Kysely        Drizzle           Prisma
postgres       (query builder) (typed SQL-ish)   (full ORM)
```

| Tool | Pick when |
|---|---|
| **Prisma** | You want the most polished DX, schema-first migrations, broad DB support. Most-used ORM in Node. |
| **Drizzle** | You want SQL-like query API with full type safety, schema in TS. Fast-growing. |
| **Kysely** | You want a type-safe SQL builder without an ORM layer. Lighter than Prisma/Drizzle. |
| **Raw drivers** | Maximum control, complex queries the ORM hates, or scripts where ORM setup overhead isn't worth it. |
| **MongoDB** | Document model, flexible schema. |
| **Redis** | Cache, queues, sessions, rate limits. |

For new projects in 2026, **Prisma** and **Drizzle** are the two front-runners. Drizzle has more momentum among engineers who like staying close to SQL; Prisma is more mature.

---

## 2. Prisma

A schema-first ORM with a generated, type-safe client.

### Setup
```bash
npm install prisma -D
npm install @prisma/client
npx prisma init
```

### Schema
```prisma
// prisma/schema.prisma
datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

generator client {
    provider = "prisma-client-js"
}

model User {
    id        Int      @id @default(autoincrement())
    email     String   @unique
    name      String
    posts     Post[]
    createdAt DateTime @default(now())
}

model Post {
    id        Int      @id @default(autoincrement())
    title     String
    body      String
    authorId  Int
    author    User     @relation(fields: [authorId], references: [id])
    createdAt DateTime @default(now())

    @@index([authorId])
}
```

### Generate the client and migrate
```bash
npx prisma migrate dev --name init      # creates migration, applies, generates client
npx prisma generate                       # regenerate client without migration
```

### Use it
```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create
const user = await prisma.user.create({
    data: {
        email: "alice@x.com",
        name: "Alice",
        posts: {
            create: [{ title: "Hello", body: "World" }],
        },
    },
});

// Query
const users = await prisma.user.findMany({
    where: { email: { contains: "@example.com" } },
    include: { posts: true },        // eager-load relations
    orderBy: { createdAt: "desc" },
    take: 10,
    skip: 0,
});

const oneUser = await prisma.user.findUnique({ where: { id: 1 } });
const orThrow = await prisma.user.findUniqueOrThrow({ where: { id: 1 } });

// Update
await prisma.user.update({
    where: { id: 1 },
    data: { name: "Alicia" },
});

// Delete
await prisma.user.delete({ where: { id: 1 } });

// Aggregations
const stats = await prisma.user.aggregate({
    _count: true,
    _avg: { age: true },
});

// Group by
const byCountry = await prisma.user.groupBy({
    by: ["country"],
    _count: true,
    orderBy: { _count: { country: "desc" } },
});

// Raw query escape hatch
const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM users WHERE created_at > ${date}
`;
```

### Transactions
```typescript
await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, name } });
    await tx.audit.create({ data: { action: "create_user", userId: user.id } });
});

// Batch
await prisma.$transaction([
    prisma.user.update({ where: { id: 1 }, data: { balance: { decrement: 100 } } }),
    prisma.user.update({ where: { id: 2 }, data: { balance: { increment: 100 } } }),
]);
```

### Pros
- Schema is the single source of truth — generates client + migrations.
- Excellent TypeScript types — `findMany().posts[0].title` is fully typed.
- Migration workflow handles the hard parts.
- Studio (GUI for browsing data): `npx prisma studio`.

### Cons
- Heavier; client is a generated file (sometimes huge for large schemas).
- Less escape-hatch flexibility than Drizzle / raw SQL.
- Performance is fine but not the fastest in benchmarks.
- The "edge" client and serverless deployments have caught up but had rocky early days.

---

## 3. Drizzle

A TypeScript-first ORM that stays close to SQL.

### Setup
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### Schema in TypeScript
```typescript
// schema.ts
import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    authorId: integer("author_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    authorIdx: index("author_idx").on(table.authorId),
}));
```

### Use it
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, sql } from "drizzle-orm";
import { users, posts } from "./schema";

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// Query
const allUsers = await db.select().from(users);

const specific = await db.select()
    .from(users)
    .where(and(eq(users.email, "a@x.com"), eq(users.name, "Alice")))
    .limit(1);

// Joins
const usersWithPosts = await db.select({
    user: users,
    post: posts,
})
    .from(users)
    .leftJoin(posts, eq(users.id, posts.authorId))
    .orderBy(desc(posts.createdAt));

// Insert
const [inserted] = await db.insert(users).values({
    email: "bob@x.com",
    name: "Bob",
}).returning();

// Update
await db.update(users)
    .set({ name: "Alicia" })
    .where(eq(users.id, 1));

// Delete
await db.delete(users).where(eq(users.id, 1));

// Raw SQL escape hatch
const result = await db.execute(sql`SELECT COUNT(*) FROM users`);
```

### Relations API (Prisma-like)
```typescript
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
    posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
    author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

// Then:
const usersWithPosts = await db.query.users.findMany({
    with: { posts: true },
});
```

### Migrations with drizzle-kit
```bash
npx drizzle-kit generate     # generates SQL migrations from schema changes
npx drizzle-kit migrate       # applies them
npx drizzle-kit push          # push schema directly (dev only)
npx drizzle-kit studio        # GUI
```

### Pros
- Stays close to SQL — less translation magic.
- Zero-runtime overhead (it's a thin wrapper).
- Edge-friendly (smaller bundles, fewer assumptions).
- Type safety inferred from schema.

### Cons
- Younger than Prisma; less battle-tested at huge scale.
- Smaller plugin ecosystem.
- Joins still require thinking about SQL (could be a pro!).

---

## 4. Kysely

A typed **query builder** — not an ORM. Lower-level than Prisma/Drizzle; more like writing SQL with TypeScript autocomplete.

```bash
npm install kysely pg
```

```typescript
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

// Define types
interface Database {
    users: { id: number; email: string; name: string; created_at: Date };
    posts: { id: number; title: string; body: string; author_id: number };
}

const db = new Kysely<Database>({
    dialect: new PostgresDialect({
        pool: new Pool({ connectionString: process.env.DATABASE_URL }),
    }),
});

const users = await db
    .selectFrom("users")
    .select(["id", "name"])
    .where("email", "like", "%@example.com")
    .orderBy("created_at", "desc")
    .limit(10)
    .execute();

const usersWithPosts = await db
    .selectFrom("users")
    .innerJoin("posts", "posts.author_id", "users.id")
    .select(["users.name", "posts.title"])
    .execute();

await db
    .insertInto("users")
    .values({ email: "x@y.com", name: "X" })
    .returningAll()
    .executeTakeFirst();
```

Use when:
- You want SQL clarity without raw strings.
- You'd rather have full type safety than ORM ergonomics.
- You manage migrations separately (e.g., with `kysely-codegen` to auto-derive types from a live DB).

---

## 5. Raw Postgres (`pg` / `postgres`)

When you don't want any abstraction.

### `pg` (the classic)
```bash
npm install pg
npm install -D @types/pg
```

```typescript
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query("SELECT * FROM users WHERE id = $1", [42]);
result.rows;          // array of objects

const { rows: [user] } = await pool.query(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
    [name, email],
);
```

### `postgres` (alternative, often used with Drizzle)
```bash
npm install postgres
```

```typescript
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

const users = await sql`SELECT * FROM users WHERE created_at > ${date}`;
const inserted = await sql`INSERT INTO users (name, email) VALUES (${name}, ${email}) RETURNING *`;
```

Uses tagged template literals; parameters are automatically escaped. Cleaner API than `pg` for raw queries.

**Always use parameterized queries** — never concatenate user input into SQL strings.

---

## 6. SQLite (`better-sqlite3` / `bun:sqlite` / `node:sqlite`)

For embedded use cases: desktop apps, edge deployments, tests, small servers.

### `better-sqlite3` — Node, synchronous, fast
```bash
npm install better-sqlite3
```

```typescript
import Database from "better-sqlite3";

const db = new Database("app.db");
db.pragma("journal_mode = WAL");

// Create
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
    )
`);

// Prepared statements (cached, very fast)
const insertUser = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
const findUser = db.prepare("SELECT * FROM users WHERE id = ?");

insertUser.run("Alice", "a@x.com");
const user = findUser.get(1);                 // single row
const all = db.prepare("SELECT * FROM users").all();    // all rows

// Transactions
const insertMany = db.transaction((users) => {
    for (const u of users) insertUser.run(u.name, u.email);
});
insertMany([{ name: "Bob", email: "b@x.com" }, { name: "Carol", email: "c@x.com" }]);
```

Synchronous API works well because SQLite is in-process — no network latency to wait on.

### `bun:sqlite` — Bun's built-in
```typescript
import { Database } from "bun:sqlite";
const db = new Database("app.db");
// Same kind of API
```

### `node:sqlite` — built into Node 22+
```typescript
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("app.db");
```

Still experimental but landing. Replaces `better-sqlite3` for many use cases.

### When SQLite suffices
- Desktop apps.
- Server-side caches.
- Single-process or single-machine apps.
- Tests (much faster than spinning up Postgres).
- LiteFS / Turso for replicated SQLite at edge.

---

## 7. MySQL

### `mysql2` (the standard)
```bash
npm install mysql2
```

```typescript
import mysql from "mysql2/promise";

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "mydb",
});

const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [1]);
```

### MySQL with Prisma / Drizzle
Both support MySQL. Same model — change `provider = "mysql"` in schema.

PlanetScale, Vitess, and TiDB are MySQL-compatible distributed SQL options.

---

## 8. Redis

In-memory key-value store. Cache, queues, sessions, rate limits, leaderboards.

### `ioredis` — popular, full-featured
```bash
npm install ioredis
```

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

await redis.set("key", "value");
await redis.set("key", "value", "EX", 60);       // TTL 60 seconds
const value = await redis.get("key");

await redis.del("key");
await redis.expire("key", 3600);

// Lists
await redis.lpush("queue", "task1", "task2");
const task = await redis.rpop("queue");

// Hashes
await redis.hset("user:1", { name: "Alice", email: "a@x.com" });
const user = await redis.hgetall("user:1");

// Sets
await redis.sadd("tags", "python", "javascript");
await redis.sismember("tags", "python");

// Sorted sets (leaderboards)
await redis.zadd("scores", 100, "alice", 90, "bob");
const top = await redis.zrevrange("scores", 0, 9, "WITHSCORES");

// Increment counters
await redis.incr("page-views");

// Pub/sub
const sub = redis.duplicate();
sub.subscribe("channel");
sub.on("message", (chan, msg) => console.log(chan, msg));
await redis.publish("channel", "hello");

// Transactions / pipelining
const pipeline = redis.pipeline();
pipeline.set("a", "1");
pipeline.set("b", "2");
pipeline.incr("counter");
await pipeline.exec();
```

### `redis` (official Node.js client)
```bash
npm install redis
```

Similar API; v4+ uses Promises.

### Common patterns
- **Cache**: `redis.get(key)` → if null, fetch from DB, `redis.set(key, value, "EX", 300)`.
- **Distributed lock**: `redis.set(key, val, "NX", "EX", 10)`. For high stakes, use Redlock.
- **Rate limit**: `redis.incr(key)` → check count → set TTL on first hit.
- **Session store**: HTTP session ID → JSON.stringify session → set with TTL.
- **Job queue**: BullMQ wraps all this.

### Upstash, Redis Cloud, Cloudflare KV
For serverless / edge, Upstash provides Redis via HTTP — no persistent connection needed.

---

## 9. MongoDB

Document store. JSON-like records, flexible schema.

### Official driver
```bash
npm install mongodb
```

```typescript
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URL);
await client.connect();
const db = client.db("mydb");
const users = db.collection("users");

// Insert
await users.insertOne({ name: "Alice", age: 30, tags: ["js", "ml"] });
await users.insertMany([{ name: "Bob" }, { name: "Carol" }]);

// Query
await users.findOne({ name: "Alice" });
const cursor = users.find({ age: { $gte: 18 } });
const docs = await cursor.toArray();

// Update
await users.updateOne({ name: "Alice" }, { $set: { age: 31 } });
await users.updateMany({ active: false }, { $set: { archived: true } });

// Delete
await users.deleteOne({ name: "Alice" });

// Aggregation
const stats = await users.aggregate([
    { $match: { active: true } },
    { $group: { _id: "$country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
]).toArray();

// Index
await users.createIndex({ name: 1 });
await users.createIndex({ email: 1 }, { unique: true });

await client.close();
```

### Mongoose — ODM (Object Document Mapper)
```bash
npm install mongoose
```

```typescript
import mongoose, { Schema } from "mongoose";

await mongoose.connect(process.env.MONGO_URL);

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true },
    age: Number,
});

const User = mongoose.model("User", userSchema);

const user = await User.create({ name: "Alice", email: "a@x.com" });
const found = await User.findOne({ name: "Alice" });
```

Mongoose adds schema enforcement (Mongo itself is schemaless), hooks, virtuals, plugins. Comes with overhead — many teams use the raw driver + Zod schemas instead.

### When MongoDB makes sense
- Document structure varies a lot.
- You need flexible schema while iterating fast.
- You need built-in geo / full-text search.

When NOT:
- Relational data — you'll fight the model.
- Strong consistency / financial transactions — possible but harder than Postgres.
- You already know SQL.

In 2026, Postgres with JSONB covers most "schema flexibility" use cases without giving up SQL.

---

## 10. Migrations

### Prisma
```bash
npx prisma migrate dev --name add_post_table       # generate + apply
npx prisma migrate deploy                           # production apply
npx prisma migrate reset                            # destroy + reapply (dev)
```

Migrations are SQL files in `prisma/migrations/`. Commit them.

### Drizzle
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Knex / db-migrate (raw)
For projects without an ORM:
```bash
npm install knex pg
npx knex init
npx knex migrate:make add_users_table
npx knex migrate:latest
npx knex migrate:rollback
```

### Practical migration advice
- Always review autogenerated migrations before applying.
- Never edit a migration after it's been deployed.
- For destructive changes (drop column, rename table), do a multi-step migration with code that's compatible with both shapes during the transition.
- Test migrations on a copy of production data before applying.
- Big data migrations: separate "schema" and "data" phases; consider running the data step out of band.

---

## 11. Connection Pooling, Transactions, Pitfalls

### Connection pooling is mandatory for servers
Opening a new DB connection per request is expensive. Always use a pool — built into Prisma, postgres-js, pg.Pool, mysql2.Pool.

Typical config:
- Pool size: 5-20 per process.
- Total connections across all processes (Gunicorn workers × pool_size) must not exceed Postgres `max_connections` (default 100). Use **PgBouncer** for proxy pooling in front of Postgres.

### Serverless and connection pooling
Serverless functions create a fresh process per request, exhausting Postgres connections fast. Solutions:
- **PgBouncer** in front of Postgres.
- **Neon**, **Supabase pooler**, **AWS RDS Proxy** — managed connection poolers.
- **HTTP-based clients** (Prisma Data Proxy, Drizzle HTTP, Neon serverless driver).

### Transactions
```typescript
await prisma.$transaction(async (tx) => {
    await tx.account.update({ where: { id: 1 }, data: { balance: { decrement: 100 } } });
    await tx.account.update({ where: { id: 2 }, data: { balance: { increment: 100 } } });
});
```

Hold transactions briefly — they hold locks. Avoid network calls / API requests inside a transaction.

### N+1 query
Looping a list and fetching each child individually = N queries. Use `include` (Prisma), `with` (Drizzle), or a JOIN.

### Long-lived idle connections
Postgres can drop idle connections, especially through firewalls. Configure:
- Prisma: built-in retry.
- pg.Pool: `idleTimeoutMillis`, `connectionTimeoutMillis`.
- Use `pool.on("error", handler)` to log.

### Don't store secrets in code
```typescript
const dbUrl = process.env.DATABASE_URL;     // never literal
```

Validate with Zod at startup so the server fails fast on missing config.

### Schema-first vs code-first
- **Code-first** — define models in Prisma/Drizzle schema, generate DB.
- **Schema-first** — write SQL DDL, generate types (e.g., `kysely-codegen`).

For application teams: code-first. For DB-driven architectures (e.g., shared DB across services): schema-first.

### Backups and replicas
Operational concern, not a Node concern. Use a managed service (Supabase, Neon, RDS, Cloud SQL) unless you have a strong reason to self-host.

---

Most production JS apps in 2026 use Prisma or Drizzle with Postgres, Redis for caching/queues, and a managed database service. Get those three right and you've covered 90% of data needs.

Next: making sure all of this keeps working — `14_testing_and_quality.md`.
