# 12. Backend Frameworks

> Express, Fastify, Hono, NestJS, Next.js API routes — and the patterns around auth, middleware, validation, and deployment.

---

## Table of Contents

1. [Choosing a Backend Framework](#1-choosing-a-backend-framework)
2. [Express](#2-express)
3. [Fastify](#3-fastify)
4. [Hono](#4-hono)
5. [NestJS](#5-nestjs)
6. [Next.js API Routes / Route Handlers](#6-nextjs-api-routes--route-handlers)
7. [Validation (Zod / Valibot)](#7-validation-zod--valibot)
8. [Authentication](#8-authentication)
9. [Middleware Patterns](#9-middleware-patterns)
10. [Background Jobs](#10-background-jobs)
11. [Deployment](#11-deployment)

---

## 1. Choosing a Backend Framework

| Framework | Best for |
|---|---|
| **Express** | Mature, ubiquitous, large ecosystem. Default for "boring" Node servers. |
| **Fastify** | Faster than Express, schema-driven, modern. Production default for new servers. |
| **Hono** | Tiny, very fast, runs on any runtime (Node, Bun, Deno, Cloudflare Workers). |
| **NestJS** | Opinionated, decorator-driven, dependency injection. Java/.NET-style architecture in TS. |
| **Next.js API routes** | When your frontend is already Next.js — keep API close. |
| **tRPC** | When client and server are both TS and you want end-to-end type safety. Sits on top of Express/Fastify/Next. |
| **Elysia** (Bun-native) | If you've committed to Bun. Type-safe, very fast. |
| **AdonisJS, Sails** | Full-stack opinionated frameworks à la Rails. Smaller communities. |

For new projects in 2026: **Fastify** for traditional APIs, **Hono** for edge/serverless, **Next.js** when paired with a Next frontend, **NestJS** for large teams that want structure.

---

## 2. Express

The original Node web framework. Synchronous middleware model, callback-heavy historically.

```bash
npm install express
npm install -D @types/express
```

```javascript
import express from "express";

const app = express();
app.use(express.json());                  // parse JSON bodies

app.get("/", (req, res) => {
    res.send("Hello");
});

app.get("/users/:id", async (req, res) => {
    const user = await db.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ error: "not found" });
    res.json(user);
});

app.post("/users", async (req, res) => {
    const created = await db.user.create({ data: req.body });
    res.status(201).json(created);
});

app.listen(3000, () => console.log("running on 3000"));
```

### Middleware
```javascript
function logger(req, res, next) {
    console.log(`${req.method} ${req.path}`);
    next();          // pass to next middleware
}

app.use(logger);                           // global
app.use("/api", authMiddleware);            // path-scoped
app.get("/admin", requireAdmin, handler);   // route-scoped
```

### Error-handling middleware
```javascript
app.get("/foo", async (req, res, next) => {
    try {
        const result = await maybeFails();
        res.json(result);
    } catch (e) {
        next(e);            // pass error along
    }
});

// Error handlers have 4 args
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});
```

### Routers — organize routes
```javascript
import { Router } from "express";

const userRouter = Router();
userRouter.get("/", listUsers);
userRouter.get("/:id", getUser);
userRouter.post("/", createUser);

app.use("/users", userRouter);
```

### Strengths and weaknesses
- ✅ Vast middleware ecosystem.
- ✅ Familiar — every Node tutorial uses it.
- ❌ Slower than Fastify.
- ❌ Async error handling is awkward — every `async` handler needs try/catch or wrapper.
- ❌ Express 4 was the dominant version for years; Express 5 (which fixes async error handling) is recent.

Use Express when working with existing code or when the ecosystem matters most. Choose Fastify for new projects.

---

## 3. Fastify

Fast, schema-based, async-native.

```bash
npm install fastify
```

```javascript
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/", async () => ({ hello: "world" }));

app.get("/users/:id", async (request, reply) => {
    const { id } = request.params;
    const user = await db.user.findUnique({ where: { id: Number(id) } });
    if (!user) return reply.code(404).send({ error: "not found" });
    return user;
});

app.post("/users", {
    schema: {
        body: {
            type: "object",
            required: ["name"],
            properties: {
                name: { type: "string", minLength: 1 },
                email: { type: "string", format: "email" },
            },
        },
    },
}, async (request) => {
    return db.user.create({ data: request.body });
});

await app.listen({ port: 3000 });
```

### Why Fastify
- Async/await is first-class — `return value` is the response.
- Built-in schema validation via JSON Schema (no separate validator middleware).
- Faster than Express on benchmarks.
- Plugin system designed for encapsulation.

### Plugins
```javascript
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";

await app.register(cors, { origin: "https://app.example.com" });
await app.register(helmet);
await app.register(jwt, { secret: process.env.JWT_SECRET });
```

### TypeBox / Zod integration
Schema can be a Zod or TypeBox schema with `fastify-type-provider-zod`:
```typescript
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";

const app = Fastify().withTypeProvider<ZodTypeProvider>();

app.post("/users", {
    schema: {
        body: z.object({ name: z.string(), email: z.string().email() }),
    },
}, async (req) => {
    // req.body is typed!
    return db.user.create({ data: req.body });
});
```

---

## 4. Hono

A tiny, fast framework that runs on **any** JS runtime — Node, Bun, Deno, Cloudflare Workers, Vercel Edge, Lambda@Edge.

```bash
npm install hono
```

```typescript
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello"));
app.get("/users/:id", async (c) => {
    const id = c.req.param("id");
    const user = await getUser(Number(id));
    if (!user) return c.json({ error: "not found" }, 404);
    return c.json(user);
});

export default app;
```

### Why Hono
- One file, runs everywhere.
- Web-standard primitives (Request, Response, fetch) — no Node-specific deps.
- Built-in middleware: CORS, JWT, basic auth, cache, logger, ETag.
- Validation via Zod.
- Tiny: < 14KB.

### Running on different runtimes
```typescript
// Node
import { serve } from "@hono/node-server";
serve({ fetch: app.fetch, port: 3000 });

// Bun
export default { fetch: app.fetch, port: 3000 };

// Cloudflare Workers
export default app;
```

### When to pick
- Edge/serverless deployments.
- You're using Cloudflare Workers, Vercel Edge, etc.
- You want a small, fast, framework-agnostic API.

Less mature than Express/Fastify for "I need plugin X" use cases — but it's catching up fast.

---

## 5. NestJS

Opinionated, large-team-friendly framework. Decorator-driven, dependency injection, modules. Feels like Java Spring or .NET Core in TS.

```bash
npm i -g @nestjs/cli
nest new my-app
```

### Controller
```typescript
import { Controller, Get, Post, Body, Param } from "@nestjs/common";

@Controller("users")
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.usersService.findOne(+id);
    }

    @Post()
    create(@Body() data: CreateUserDto) {
        return this.usersService.create(data);
    }
}
```

### Service (injectable)
```typescript
import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    findAll() { return this.prisma.user.findMany(); }
    findOne(id: number) { return this.prisma.user.findUnique({ where: { id } }); }
}
```

### Module
```typescript
@Module({
    controllers: [UsersController],
    providers: [UsersService, PrismaService],
})
export class UsersModule {}
```

### Why Nest
- Strong opinions on architecture — easier onboarding for large teams.
- DI container — testable, mockable.
- First-class TypeScript.
- Built-in support for REST, GraphQL, WebSockets, microservices, queues.
- Class-validator integration for DTOs.

### When NOT to pick
- Small projects — too much ceremony.
- You prefer functional style over classes-with-decorators.
- You want flexibility — Nest pushes patterns you may not want.

Used heavily in enterprises and large teams. If you've used Spring or .NET, Nest will feel natural.

---

## 6. Next.js API Routes / Route Handlers

If you're on Next, you can put backend logic right next to your frontend.

### Route handlers (App Router)
```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";

export async function GET() {
    const users = await db.user.findMany();
    return NextResponse.json(users);
}

export async function POST(request: Request) {
    const body = await request.json();
    const user = await db.user.create({ data: body });
    return NextResponse.json(user, { status: 201 });
}
```

```typescript
// app/api/users/[id]/route.ts
export async function GET(request: Request, { params }) {
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id: Number(id) } });
    if (!user) return new Response("not found", { status: 404 });
    return NextResponse.json(user);
}
```

### When to use
- Your API is consumed only by your own Next.js frontend.
- You want one deploy, one repo.
- You want Server Actions for form submission.

### When not to
- API is consumed by multiple frontends (web + mobile + integrations).
- You need WebSockets / long-lived connections — Next isn't ideal.
- You need different scaling characteristics for frontend vs backend.

For multi-client APIs, a separate backend (Fastify, NestJS) is cleaner.

---

## 7. Validation (Zod / Valibot)

Untrusted input → validate at the boundary.

### Zod — the dominant choice in 2026
```bash
npm install zod
```

```typescript
import { z } from "zod";

const UserCreate = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).max(150).optional(),
    tags: z.array(z.string()).default([]),
});

type UserCreate = z.infer<typeof UserCreate>;     // get the TS type

// In a handler
const body = UserCreate.parse(request.body);       // throws on invalid
// Or:
const result = UserCreate.safeParse(request.body); // returns { success, data | error }
if (!result.success) return c.json({ errors: result.error.flatten() }, 400);
```

### Composition
```typescript
const UserUpdate = UserCreate.partial();           // all fields optional
const UserDB = UserCreate.extend({ id: z.number() });
const UserResponse = UserDB.omit({ ...sensitiveFields });
```

### Schemas as the single source of truth
The same Zod schema can:
- Validate API request bodies.
- Generate TypeScript types.
- Generate OpenAPI documentation (via `zod-to-openapi`).
- Validate form input on the client.
- Generate JSON Schema.

### Valibot — smaller alternative
```bash
npm install valibot
```

```typescript
import { object, string, email, parse } from "valibot";

const UserSchema = object({
    name: string(),
    email: string([email()]),
});

const data = parse(UserSchema, body);
```

Up to 90% smaller bundle than Zod. Similar feature set. Good for client-side and edge.

---

## 8. Authentication

### Session-based (cookie + server store)
Classic. Server keeps a session record (in Redis / DB); browser holds an HTTP-only cookie with the session ID. Simple and proven for traditional web apps.

Libraries:
- **express-session** — Express.
- **iron-session** — encrypted cookies, no server store needed.
- **@fastify/session** — Fastify.

### JWT (stateless tokens)
The token contains the user's identity, signed by the server. No server-side session store.
```typescript
import jwt from "jsonwebtoken";

const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
});

// On each request
const payload = jwt.verify(token, process.env.JWT_SECRET);
```

Pros: stateless, scales horizontally easily, works for mobile/SPA easily.
Cons: hard to revoke (token is valid until it expires). Use short expirations + refresh tokens.

### OAuth / OIDC ("Login with...")
Don't roll your own. Use:
- **Auth.js** (formerly NextAuth) — handles OAuth, JWT, sessions, multiple providers. Works with Next, SvelteKit, Express, others.
- **Lucia** — flexible session-based auth library.
- **Clerk**, **Auth0**, **WorkOS**, **Supabase Auth**, **Stytch**, **Kinde** — managed services with SDKs.

For most apps, a managed auth service saves weeks of work and eliminates a whole class of security bugs.

### Password hashing
- **`bcrypt`** — battle-tested. Slow on purpose.
- **`argon2`** — modern, recommended. Slightly faster setup than bcrypt.

```typescript
import bcrypt from "bcrypt";

const hash = await bcrypt.hash(password, 10);
const valid = await bcrypt.compare(submitted, hash);
```

Never store plaintext. Never use SHA-256 directly for passwords.

### API keys
For server-to-server APIs:
- Generate with `crypto.randomBytes(32).toString("base64url")`.
- Store **hashed** keys server-side (so a DB leak doesn't expose them).
- Compare in constant time (`crypto.timingSafeEqual`).

---

## 9. Middleware Patterns

### Logging
Use **`pino`** (fast, structured) or **`winston`** (older, flexible).
```typescript
import pino from "pino";
const logger = pino({ level: "info" });

logger.info({ user_id: 42 }, "user logged in");
```

Fastify has Pino built in. Express + Pino via `pino-http`.

### CORS
Set up allowed origins explicitly:
```typescript
import cors from "@fastify/cors";

await app.register(cors, {
    origin: ["https://app.example.com", "https://admin.example.com"],
    credentials: true,
});
```

For Express: `cors` package.

### Rate limiting
- **`@fastify/rate-limit`** — Fastify.
- **`express-rate-limit`** — Express.
- Or do it at the edge (Cloudflare, API Gateway, nginx).

### Security headers
- **`helmet`** (Express) / **`@fastify/helmet`** — sets sensible defaults: X-Frame-Options, Content-Security-Policy, etc.

### Request IDs / tracing
Generate a request ID at entry (`crypto.randomUUID`), pass through logs, include in responses (`X-Request-Id` header). Hook into OpenTelemetry for distributed tracing.

### Compression
- **`compression`** (Express) / **`@fastify/compress`** — gzip/brotli compression of responses. Better done at the edge (nginx, CDN) when possible.

### File uploads
- **`multer`** (Express) — multipart parsing.
- **`@fastify/multipart`** — Fastify.
- For large files, stream to object storage (S3, R2) directly with presigned URLs — don't proxy through your server.

---

## 10. Background Jobs

For work that doesn't fit in a request — emails, image processing, scheduled tasks.

### BullMQ — Redis-backed
```bash
npm install bullmq
```

```typescript
import { Queue, Worker } from "bullmq";

const queue = new Queue("emails", { connection: { host: "localhost" } });

// Producer
await queue.add("send-welcome", { userId: 42, email: "..." });

// Worker (separate process)
new Worker("emails", async (job) => {
    await sendEmail(job.data.email);
}, { connection: { host: "localhost" } });
```

Built-in retries, scheduling, rate limiting, priorities.

### Other options
- **Inngest** — managed; durable functions, easy retries.
- **Trigger.dev** — similar; Node-native; runs your code.
- **Temporal** — for complex workflows. Heavy but powerful.
- **node-cron** — simple in-process scheduling. Don't use for production work across multiple instances.
- **Agenda** — older MongoDB-backed.

For one server, BullMQ. For complex multi-step workflows: Temporal or Inngest.

### Cron in production
If you have multiple instances, in-process cron will run the job N times. Solutions:
- A single dedicated "worker" instance.
- A locking mechanism (Redis lock around the job).
- External scheduler (Kubernetes CronJob, AWS EventBridge, GitHub Actions).

---

## 11. Deployment

### Where to deploy
| Option | Good for |
|---|---|
| **Vercel** | Next.js apps. Best DX in 2026 for full-stack JS. |
| **Netlify** | Static sites + Functions. Similar to Vercel. |
| **Cloudflare Workers / Pages** | Edge runtime, very cheap, global. |
| **Fly.io** | Full Node apps; multi-region; SQLite/Postgres available. |
| **Railway** | "Heroku replacement," simple deploys, good defaults. |
| **Render** | Similar to Railway. |
| **AWS Lambda + API Gateway** | Serverless; cheap at low traffic; sketchy cold starts. |
| **ECS / Fargate** | Containers on AWS. More control, more ops. |
| **Kubernetes** | When you have an ops team. |
| **DigitalOcean / Hetzner / Linode** | Old-school VPS. Cheap, simple. |

### Containerizing
```dockerfile
# Multi-stage Dockerfile for Node
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment configuration
Use environment variables. Don't commit secrets. Load with:
- **`dotenv`** for local development.
- Platform secret managers (AWS Secrets Manager, GCP Secret Manager, Doppler, Infisical) for production.

Validate at startup:
```typescript
import { z } from "zod";

const Env = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    PORT: z.coerce.number().default(3000),
});

export const env = Env.parse(process.env);
```

Now `env.PORT` is a number, fully typed; the server refuses to start with missing/invalid config.

### Graceful shutdown
```typescript
const server = app.listen(...);

async function shutdown() {
    console.log("Shutting down...");
    server.close();
    await db.disconnect();
    process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

Without this, in-flight requests get cut off on deploys.

### Health checks
```typescript
app.get("/health", () => ({ ok: true }));
app.get("/ready", async () => {
    try {
        await db.$queryRaw`SELECT 1`;
        return { ok: true };
    } catch {
        throw new Error("not ready");
    }
});
```

`/health` for liveness (process is up), `/ready` for readiness (can serve traffic, DB is reachable).

### Observability
- **Logs**: pino + a log aggregator (Datadog, BetterStack, Loki).
- **Metrics**: Prometheus + Grafana, or your platform's offering.
- **Errors**: Sentry SDK — `Sentry.init({ dsn: ... })`.
- **Tracing**: OpenTelemetry — works with most observability backends.

Start with Sentry on day one. Add tracing when the system has multiple services.

---

Backend JS is mature. Pick Fastify or Hono for new APIs, Next.js if you're already in Next, NestJS for large teams. Don't roll your own auth, validation, or job queue — the standard tools are solid.

Next: where your data lives — `13_databases.md`.
